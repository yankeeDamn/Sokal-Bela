'use strict';
// Owner tool: set a new password for a customer who forgot theirs, and sign them out everywhere.
//   DATABASE_URL=... NEW_PASSWORD='something-long' node scripts/reset-password.js 9876543210
const { Pool } = require('pg');
const auth = require('../lib/auth-core');
const phone = process.argv[2], pw = process.env.NEW_PASSWORD || '';
if (!/^[6-9][0-9]{9}$/.test(phone || '') || pw.length < 8) { console.error('Usage: NEW_PASSWORD=<8+ chars> DATABASE_URL=... node scripts/reset-password.js <10-digit phone>'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL first.'); process.exit(1); }
const local = ['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: true } });
(async () => {
  const hash = await auth.hashPassword(pw);
  const r = await pool.query('UPDATE users SET password_hash=$2 WHERE phone=$1 RETURNING id,name', [phone, hash]);
  if (!r.rowCount) { console.error('No account with that phone.'); process.exitCode = 1; return; }
  await pool.query('DELETE FROM user_sessions WHERE user_id=$1', [r.rows[0].id]);
  await pool.query("INSERT INTO auth_logs(user_id,phone,event,detail) VALUES($1,$2,'password_changed','reset by owner script')", [r.rows[0].id, phone]);
  console.log('Password reset for ' + r.rows[0].name + '. Tell them the new password privately and ask them to change it.');
})().catch(e => { console.error('Failed:', e.message); process.exitCode = 1; }).finally(() => pool.end());
