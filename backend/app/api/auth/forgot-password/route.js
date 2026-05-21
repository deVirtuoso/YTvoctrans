import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { corsHeaders, handleOptions } from '@/lib/cors';
import crypto from 'crypto';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Email is required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    if (result.rows.length === 0) {
      // Return ok: true to prevent email enumeration attacks (security best practice)
      return new Response(
        JSON.stringify({ ok: true, message: 'If that email exists, a password reset link has been sent.' }),
        {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db.execute({
      sql: 'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?',
      args: [resetToken, resetTokenExpires, user.id],
    });

    await sendPasswordResetEmail(normalizedEmail, resetToken);

    return new Response(
      JSON.stringify({ ok: true, message: 'If that email exists, a password reset link has been sent.' }),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
