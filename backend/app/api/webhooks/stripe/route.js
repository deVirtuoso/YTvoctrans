import Stripe from 'stripe';
import db from '@/lib/db';
import { headers } from 'next/headers';
import crypto from 'crypto';

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
        const userIdFromRef = session.client_reference_id || null;

        if (!subscriptionId) {
          console.warn('[Stripe Webhook] checkout.session.completed without subscription id, skipping.');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEndUnix =
          subscription.current_period_end ||
          subscription.items?.data?.[0]?.current_period_end;
        const currentPeriodEnd = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null;
        const status = subscription.status;

        // First try linking by stripe_customer_id (covers the /api/checkout path
        // where we pre-created the customer row).
        const byCustomer = await db.execute({
          sql: 'SELECT id, user_id FROM subscriptions WHERE stripe_customer_id = ?',
          args: [customerId],
        });

        if (byCustomer.rows.length > 0) {
          await db.execute({
            sql: `
              UPDATE subscriptions
              SET stripe_subscription_id = ?, status = ?, current_period_end = ?
              WHERE stripe_customer_id = ?
            `,
            args: [subscriptionId, status, currentPeriodEnd, customerId],
          });
        } else if (userIdFromRef) {
          // Payment Link path: no row yet. Upsert against user_id and store
          // the new stripe_customer_id so future subscription.* events match.
          const byUser = await db.execute({
            sql: 'SELECT id FROM subscriptions WHERE user_id = ?',
            args: [userIdFromRef],
          });

          if (byUser.rows.length > 0) {
            await db.execute({
              sql: `
                UPDATE subscriptions
                SET stripe_customer_id = ?, stripe_subscription_id = ?, status = ?, current_period_end = ?
                WHERE user_id = ?
              `,
              args: [customerId, subscriptionId, status, currentPeriodEnd, userIdFromRef],
            });
          } else {
            await db.execute({
              sql: `
                INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
                VALUES (?, ?, ?, ?, ?, ?)
              `,
              args: [
                crypto.randomUUID(),
                userIdFromRef,
                customerId,
                subscriptionId,
                status,
                currentPeriodEnd,
              ],
            });
          }
        } else {
          console.warn(`[Stripe Webhook] checkout.session.completed for customer ${customerId} with no matching user (no client_reference_id, no existing row).`);
        }

        console.log(`[Stripe Webhook] checkout.session.completed for customer ${customerId}. Status: ${status}`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const periodEndUnix =
          subscription.current_period_end ||
          subscription.items?.data?.[0]?.current_period_end;
        const currentPeriodEnd = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null;

        await db.execute({
          sql: `
            UPDATE subscriptions
            SET stripe_subscription_id = ?, status = ?, current_period_end = ?
            WHERE stripe_customer_id = ?
          `,
          args: [subscriptionId, status, currentPeriodEnd, customerId],
        });

        console.log(`[Stripe Webhook] Subscription ${event.type.split('.').pop()} for customer ${customerId}. Status: ${status}`);
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
