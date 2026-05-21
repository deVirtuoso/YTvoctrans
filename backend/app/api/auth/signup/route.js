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

    // Check if user already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Email already registered' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Hash password and create user
    const userId = crypto.randomUUID();
    const passHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await db.execute({
      sql: `
        INSERT INTO users (id, email, password_hash, is_verified, verification_token)
        VALUES (?, ?, ?, 0, ?)
      `,
      args: [userId, normalizedEmail, passHash, verificationToken],
    });

    // Initialize allowance record
    const allowanceId = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT INTO allowances (id, user_id, daily_used, monthly_used) VALUES (?, ?, 0, 0)',
      args: [allowanceId, userId],
    });

    // Send verification email
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
