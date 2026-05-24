import { validateSession, cookieOptions } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = body?.token;
  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ ok: false, error: 'token is required' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Token here is the same opaque session id the cookie carries — we accept
  // either as a one-time hand-off mechanism from popup to background, or as
  // a no-op re-arm to refresh the cookie on extension reload.
  const session = await validateSession(token);
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: 'Session invalid or expired' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const cookieHeaderValue = cookieOptions.serialize(session.id);

  return new Response(
    JSON.stringify({
      ok: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    }),
    {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeaderValue,
      },
    }
  );
}
