import jwt from 'jsonwebtoken';
import { validateSession, getSessionIdFromRequest } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.TURSO_DB_AUTH_TOKEN ||
  'voicetranslate-dev-jwt-secret-change-me';

const JWT_TTL_SECONDS = 60 * 60; // 1 hour

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

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + JWT_TTL_SECONDS;

  const token = jwt.sign(
    {
      sub: session.user.id,
      email: session.user.email,
      sid: session.id,
      iat: issuedAt,
      exp: expiresAt,
    },
    JWT_SECRET
  );

  return new Response(
    JSON.stringify({
      ok: true,
      token,
      expiresAt: expiresAt * 1000,
    }),
    {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    }
  );
}
