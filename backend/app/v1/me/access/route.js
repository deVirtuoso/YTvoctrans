import db from '@/lib/db';
import { validateSession, getSessionIdFromRequest } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function GET(req) {
  const headers = corsHeaders(req);
  const sessionId = getSessionIdFromRequest(req);

  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const session = await validateSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: 'Session invalid or expired' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check subscription status
    const subResult = await db.execute({
      sql: 'SELECT status FROM subscriptions WHERE user_id = ?',
      args: [session.user.id],
    });

    let entitlementActive = false;
    let status = 'none';
    let plan = 'free';

    if (subResult.rows.length > 0) {
      const sub = subResult.rows[0];
      status = sub.status || 'none';
      if (status === 'active') {
        entitlementActive = true;
        plan = 'pro';
      }
    }

    return new Response(
      JSON.stringify({
        access: {
          entitlementActive,
          status,
          plan,
        },
      }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Access Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
