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

  return new Response(
    JSON.stringify({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.email.split('@')[0],
      },
    }),
    {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    }
  );
}
