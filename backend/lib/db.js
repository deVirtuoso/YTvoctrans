import { createClient } from '@libsql/client';

const dbUrl = process.env.TURSO_DB_URL || 'file:./prisma/dev.db';
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

// Helper to initialize tables if they don't exist
export async function initDb() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        reset_token TEXT,
        reset_token_expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        status TEXT NOT NULL,
        current_period_end TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS allowances (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        daily_used INTEGER DEFAULT 0,
        monthly_used INTEGER DEFAULT 0,
        last_used_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        src_lang TEXT NOT NULL,
        tgt_lang TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        error TEXT,
        cues_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await client.execute('ALTER TABLE jobs ADD COLUMN cues_json TEXT');
    } catch (e) {
      // ignore if column already exists
    }


    await client.execute(`
      CREATE TABLE IF NOT EXISTS audio_segments (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        audio_data BLOB NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS translation_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        t0 REAL NOT NULL,
        t1 REAL NOT NULL,
        text TEXT NOT NULL,
        subs_json TEXT NOT NULL
      );
    `);
    
    console.log('[DB] Database tables initialized successfully.');
  } catch (error) {
    console.error('[DB] Failed to initialize database tables:', error);
  }
}

export default client;
