import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function GET(req) {
  const headers = corsHeaders(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://y-tvoctrans.vercel.app';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId) {
    console.error('[Google OAuth] GOOGLE_CLIENT_ID environment variable is missing.');
    return new Response(JSON.stringify({ ok: false, error: 'Google OAuth is not configured on the server.' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Construct the Google authorization URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;

  return Response.redirect(googleAuthUrl);
}
