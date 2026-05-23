import db from '@/lib/db';
import { createSession, cookieOptions, hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const errorHtml = (msg) => `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Google Login Failed | VoiceTranslate</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding-top: 100px; }
          .card { max-width: 450px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; }
          h1 { color: #f43f5e; margin-bottom: 20px; }
          p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Google Authentication Failed</h1>
          <p>${msg}</p>
        </div>
      </body>
    </html>
  `;

  if (error) {
    return new Response(errorHtml(`Google returned authentication error: ${error}`), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code) {
    return new Response(errorHtml('Authorization code is missing from callback.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://y-tvoctrans.vercel.app';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('[Google Token Exchange Error]:', errData);
      return new Response(errorHtml('Failed to exchange authorization code for tokens.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    // 2. Fetch user profile from Google
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoRes.ok) {
      return new Response(errorHtml('Failed to retrieve user profile from Google.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const userInfo = await userinfoRes.json();
    const email = userInfo.email;

    if (!email) {
      return new Response(errorHtml('Google did not return an email address.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check if user already exists
    let userResult = await db.execute({
      sql: 'SELECT id, is_verified FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    let userId;

    if (userResult.rows.length === 0) {
      // User doesn't exist - create them
      userId = crypto.randomUUID();
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passHash = await hashPassword(randomPassword);

      await db.execute({
        sql: `
          INSERT INTO users (id, email, password_hash, is_verified)
          VALUES (?, ?, ?, 1)
        `,
        args: [userId, normalizedEmail, passHash],
      });

      // Initialize allowance
      const allowanceId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO allowances (id, user_id, daily_used, monthly_used) VALUES (?, ?, 0, 0)',
        args: [allowanceId, userId],
      });
    } else {
      userId = userResult.rows[0].id;
      
      // If user exists but is not verified, verify them since Google authenticated them
      if (userResult.rows[0].is_verified === 0) {
        await db.execute({
          sql: 'UPDATE users SET is_verified = 1 WHERE id = ?',
          args: [userId],
        });
      }
    }

    // 4. Create active session
    const session = await createSession(userId);

    // 5. Serialize session cookie
    const cookieHeaderValue = cookieOptions.serialize(session.id);

    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Login Successful | VoiceTranslate</title>
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
            <span class="badge">Google Authenticated</span>
            <h1>Successfully Signed In!</h1>
            <p>You have signed in as <strong>${normalizedEmail}</strong>.</p>
            <p class="hint">You can now safely close this tab, reopen your browser extension popup, and begin translating.</p>
          </div>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
          'Set-Cookie': cookieHeaderValue,
        },
      }
    );
  } catch (error) {
    console.error('[Google Callback Error]:', error);
    return new Response(errorHtml('An unexpected error occurred during Google Sign-in.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
