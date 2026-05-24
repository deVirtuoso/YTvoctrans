// One-off helper: create a verified test user directly in Turso so the
// browser test can sign in without going through the email loop.
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const EMAIL = process.argv[2] || 'autotest@example.com';
const PASSWORD = process.argv[3] || 'TestPassword123';

const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

(async () => {
  const passHash = await bcrypt.hash(PASSWORD, 10);
  const userId = crypto.randomUUID();
  const allowanceId = crypto.randomUUID();

  // Wipe any existing row so we start clean.
  await client.execute({ sql: 'DELETE FROM users WHERE email = ?', args: [EMAIL] });

  await client.execute({
    sql: 'INSERT INTO users (id, email, password_hash, is_verified) VALUES (?, ?, ?, 1)',
    args: [userId, EMAIL, passHash],
  });
  await client.execute({
    sql: 'INSERT INTO allowances (id, user_id, daily_used, monthly_used) VALUES (?, ?, 0, 0)',
    args: [allowanceId, userId],
  });

  console.log('Created verified user:', { email: EMAIL, password: PASSWORD, userId });
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
