import db from '@/lib/db';
import { comparePassword, createSession, cookieOptions } from '@/lib/auth';
import { corsHeaders, handleOptions } from '@/lib/cors';

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

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch user
    const result = await db.execute({
      sql: 'SELECT id, password_hash, is_verified FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email or password' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email or password' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Verify email confirmation
    if (user.is_verified === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Please verify your email before logging in. Check your inbox for the confirmation link.',
        }),
        {
          status: 401,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create session
    const session = await createSession(user.id);

    // Set cookie
    const cookieHeaderValue = cookieOptions.serialize(session.id);
    
    return new Response(JSON.stringify({ ok: true, user: { email: normalizedEmail } }), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeaderValue,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
}
