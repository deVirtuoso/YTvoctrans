import bcrypt from 'bcryptjs';
import db from './db';
import crypto from 'crypto';

// db.js wraps the libsql client so every query awaits initialization on the
// first call. No fire-and-forget initDb() needed here.

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export async function createSession(userId) {
  const sessionId = crypto.randomUUID();
  // Session is valid for 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    args: [sessionId, userId, expiresAt],
  });

  return { id: sessionId, expiresAt };
}

export async function validateSession(sessionId) {
  if (!sessionId) return null;

  try {
    const result = await db.execute({
      sql: `
        SELECT s.id as sessionId, s.expires_at, u.id as userId, u.email, u.is_verified
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `,
      args: [sessionId],
    });

    if (result.rows.length === 0) return null;

    const session = result.rows[0];
    const isExpired = new Date(session.expires_at).getTime() < Date.now();

    if (isExpired) {
      // Delete expired session
      await db.execute({
        sql: 'DELETE FROM sessions WHERE id = ?',
        args: [sessionId],
      });
      return null;
    }

    return {
      id: session.sessionId,
      user: {
        id: session.userId,
        email: session.email,
        isVerified: Boolean(session.is_verified),
      },
    };
  } catch (error) {
    console.error('[Auth Error] Failed to validate session:', error);
    return null;
  }
}

export async function deleteSession(sessionId) {
  if (!sessionId) return;
  try {
    await db.execute({
      sql: 'DELETE FROM sessions WHERE id = ?',
      args: [sessionId],
    });
  } catch (error) {
    console.error('[Auth Error] Failed to delete session:', error);
  }
}

// Helper to get session ID from request headers
export function getSessionIdFromRequest(req) {
  // Try cookie first
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  if (cookies.session) return cookies.session;

  // Try Authorization header
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

export const cookieOptions = {
  name: 'session',
  serialize: (value) => {
    return `session=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${30 * 24 * 60 * 60}`;
  },
  serializeExpired: () => {
    return 'session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};
