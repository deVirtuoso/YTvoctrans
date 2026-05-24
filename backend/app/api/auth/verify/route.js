import db from '@/lib/db';

const SUCCESS_HTML = (email, alreadyVerified) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Email Verified | VoiceTranslate</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding-top: 100px; }
      .card { max-width: 450px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
      h1 { color: #10b981; margin-bottom: 20px; }
      p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
      .badge { display: inline-block; padding: 6px 12px; background-color: #064e3b; color: #34d399; font-weight: bold; border-radius: 20px; font-size: 14px; margin-bottom: 20px; }
      .hint { font-size: 14px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">${alreadyVerified ? 'Already Verified' : 'Success'}</span>
      <h1>Email Verified!</h1>
      <p>Your email <strong>${email}</strong> ${alreadyVerified ? 'was already verified.' : 'has been successfully verified.'} You are ready to log in and start using VoiceTranslate!</p>
      <p class="hint">You may now close this tab, reopen the extension popup, and sign in to get started.</p>
    </div>
  </body>
</html>
`;

const FAILURE_HTML = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Verification Failed | VoiceTranslate</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding-top: 100px; }
      .card { max-width: 450px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; }
      h1 { color: #f43f5e; margin-bottom: 20px; }
      p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Verification Failed</h1>
      <p>The verification link is invalid or has expired. If you signed up some time ago, try signing up again from the extension — your account will be re-issued a fresh confirmation email.</p>
    </div>
  </body>
</html>
`;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new Response('Verification token is missing.', { status: 400 });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, email, is_verified FROM users WHERE verification_token = ?',
      args: [token],
    });

    if (result.rows.length === 0) {
      return new Response(FAILURE_HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    const user = result.rows[0];
    const wasAlreadyVerified = user.is_verified === 1 || user.is_verified === true;

    // Idempotent: mark verified if not already, but DO NOT clear the token.
    // Email clients (notably Outlook / Microsoft Safe Links, Gmail, Apple Mail)
    // pre-fetch links to scan them for malware before the user clicks. If we
    // null out the token on the first GET, the user's real click sees no row
    // and the endpoint reports "invalid or expired" — exactly what we want to
    // avoid. Tokens are overwritten by the next signup attempt, so leaving the
    // value in place after success has no security impact.
    if (!wasAlreadyVerified) {
      await db.execute({
        sql: 'UPDATE users SET is_verified = 1 WHERE id = ?',
        args: [user.id],
      });
    }

    return new Response(SUCCESS_HTML(user.email, wasAlreadyVerified), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[Verify Error]:', error);
    return new Response('An internal server error occurred.', { status: 500 });
  }
}
