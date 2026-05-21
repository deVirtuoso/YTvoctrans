import { deleteSession, getSessionIdFromRequest, cookieOptions } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);
  const sessionId = getSessionIdFromRequest(req);
  
  if (sessionId) {
    await deleteSession(sessionId);
  }

  const expiredCookie = cookieOptions.serializeExpired();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Set-Cookie': expiredCookie,
    },
  });
}
