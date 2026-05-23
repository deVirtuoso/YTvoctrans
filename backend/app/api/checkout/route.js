import Stripe from 'stripe';
import db from '@/lib/db';
import { validateSession, getSessionIdFromRequest } from '@/lib/auth';
import crypto from 'crypto';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const priceId = process.env.STRIPE_PRICE_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://y-tvoctrans.vercel.app';

export async function GET(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) {
    // If not authenticated, redirect to login page with callbackUrl to resume checkout
    return Response.redirect(`${appUrl}/auth/login?error=unauthorized&callbackUrl=/api/checkout`);
  }

  const session = await validateSession(sessionId);
  if (!session) {
    return Response.redirect(`${appUrl}/auth/login?error=session_expired&callbackUrl=/api/checkout`);
  }

  if (!stripe) {
    console.error('[Stripe Error] STRIPE_SECRET_KEY environment variable is missing.');
    return new Response('Stripe is not configured on this server.', { status: 500 });
  }

  if (!priceId) {
    console.error('[Stripe Error] STRIPE_PRICE_ID environment variable is missing.');
    return new Response('Stripe pricing plan is not configured on this server.', { status: 500 });
  }

  try {
    const userRes = await db.execute({
      sql: 'SELECT email FROM users WHERE id = ?',
      args: [session.user.id],
    });

    if (userRes.rows.length === 0) {
      return new Response('User account not found', { status: 404 });
    }

    const userEmail = userRes.rows[0].email;

    // Check if user has an existing checkout customer session
    const subRes = await db.execute({
      sql: 'SELECT id, stripe_customer_id FROM subscriptions WHERE user_id = ?',
      args: [session.user.id],
    });

    let customerId;

    if (subRes.rows.length > 0 && subRes.rows[0].stripe_customer_id) {
      customerId = subRes.rows[0].stripe_customer_id;
    } else {
      // Create new customer on Stripe
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;

      // Insert subscription skeleton
      const subId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO subscriptions (id, user_id, stripe_customer_id, status) VALUES (?, ?, ?, "none")',
        args: [subId, session.user.id, customerId],
      });
    }

    // Generate Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel`,
      metadata: {
        userId: session.user.id,
      },
    });

    return Response.redirect(checkoutSession.url);
  } catch (error) {
    console.error('[Stripe Checkout Session Error]:', error);
    return new Response(`Stripe Checkout Session Error: ${error.message}`, { status: 500 });
  }
}
