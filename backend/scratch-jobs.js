require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

(async () => {
  const res = await client.execute('SELECT id, video_id, src_lang, tgt_lang, status, progress, error, created_at FROM jobs ORDER BY created_at DESC LIMIT 5');
  console.log('Recent jobs:');
  for (const r of res.rows) {
    console.log(JSON.stringify(r, null, 2));
    console.log('---');
  }
})();
