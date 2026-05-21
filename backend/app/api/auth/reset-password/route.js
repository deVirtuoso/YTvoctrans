import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Token and new password are required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ ok: false, error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Find user with this token
    const result = await db.execute({
      sql: 'SELECT id, reset_token_expires_at FROM users WHERE reset_token = ?',
      args: [token],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired reset token' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const user = result.rows[0];
    const isExpired = new Date(user.reset_token_expires_at).getTime() < Date.now();

    if (isExpired) {
      return new Response(JSON.stringify({ ok: false, error: 'Reset token has expired' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Hash and update password
    const newHash = await hashPassword(password);

    await db.execute({
      sql: `
        UPDATE users 
        SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL 
        WHERE id = ?
      `,
      args: [newHash, user.id],
    });

    return new Response(JSON.stringify({ ok: true, message: 'Password has been reset successfully.' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
