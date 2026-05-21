import Stripe from 'stripe';
import db from '@/lib/db';
import { headers } from 'next/headers';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  if (!stripe) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('[Stripe Webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET config.');
    return new Response('Webhook verification parameters missing', { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        // Retrieve full subscription detail to find period ends
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const status = subscription.status === 'active' ? 'active' : 'inactive';

        // Update database with customer subscription parameters
        await db.execute({
          sql: `
            UPDATE subscriptions 
            SET stripe_subscription_id = ?, status = ?, current_period_end = ? 
            WHERE stripe_customer_id = ?
          `,
          args: [subscriptionId, status, currentPeriodEnd, customerId],
        });
        
        console.log(`[Stripe Webhook] Subscription success set to active for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const status = subscription.status === 'active' ? 'active' : subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        await db.execute({
          sql: `
            UPDATE subscriptions 
            SET stripe_subscription_id = ?, status = ?, current_period_end = ? 
            WHERE stripe_customer_id = ?
          `,
          args: [subscriptionId, status, currentPeriodEnd, customerId],
        });

        console.log(`[Stripe Webhook] Subscription updated for customer ${customerId}. Status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await db.execute({
          sql: `
            UPDATE subscriptions 
            SET status = 'expired', current_period_end = NULL 
            WHERE stripe_customer_id = ?
          `,
          args: [customerId],
        });

        console.log(`[Stripe Webhook] Subscription cancelled/expired for customer ${customerId}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Stripe Webhook Process Error]:', error);
    return new Response('Webhook process failed', { status: 500 });
  }
}
