import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { corsHeaders, handleOptions } from '@/lib/cors';
import crypto from 'crypto';

export async function OPTIONS(req) {
  return handleOptions(req);
}

export async function POST(req) {
  const headers = corsHeaders(req);
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Email and password are required' }), {
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

    const normalizedEmail = email.trim().toLowerCase();
    const passHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const existing = await db.execute({
      sql: 'SELECT id, is_verified FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    let userId;

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];

      // Verified account already exists -> block as a real conflict.
      if (existingUser.is_verified === 1 || existingUser.is_verified === true) {
        return new Response(JSON.stringify({ ok: false, error: 'Email already registered' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Unverified user (possibly from a previous partial signup) -> let them
      // re-claim the account. Refresh the password hash and verification token,
      // then make sure the allowance row exists.
      userId = existingUser.id;
      await db.execute({
        sql: `
          UPDATE users
          SET password_hash = ?, verification_token = ?, is_verified = 0
          WHERE id = ?
        `,
        args: [passHash, verificationToken, userId],
      });
    } else {
      userId = crypto.randomUUID();
      await db.execute({
        sql: `
          INSERT INTO users (id, email, password_hash, is_verified, verification_token)
          VALUES (?, ?, ?, 0, ?)
        `,
        args: [userId, normalizedEmail, passHash, verificationToken],
      });
    }

    // Self-heal: ensure an allowance row exists for this user even if signup
    // previously crashed half-way through.
    const allowanceCheck = await db.execute({
      sql: 'SELECT id FROM allowances WHERE user_id = ?',
      args: [userId],
    });

    if (allowanceCheck.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO allowances (id, user_id, daily_used, monthly_used) VALUES (?, ?, 0, 0)',
        args: [crypto.randomUUID(), userId],
      });
    }

    await sendVerificationEmail(normalizedEmail, verificationToken);

    return new Response(JSON.stringify({ ok: true, message: 'Signup successful! Verification email sent.' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Signup Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
