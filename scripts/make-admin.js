'use strict';
// Promote an existing customer account to administrator (or demote with --remove).
//   DATABASE_URL=... node scripts/make-admin.js 9876543210
// The person must first create the account on the website (Sign up).
const { Pool } = require('pg');
const phone = process.argv[2], remove = process.argv.includes('--remove');
if (!/^[6-9][0-9]{9}$/.test(phone || '')) { console.error('Usage: node scripts/make-admin.js <10-digit phone> [--remove]'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL first (do not commit it).'); process.exit(1); }
const local = ['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: local ? false : { rejectUnauthorized: true } });
pool.query('UPDATE users SET role=$2 WHERE phone=$1 RETURNING name,role', [phone, remove ? 'customer' : 'admin'])
  .then(r => {
    if (!r.rowCount) { console.error('No account with that phone. Sign up on the website first.'); process.exitCode = 1; }
    else console.log(r.rows[0].name + ' is now ' + r.rows[0].role + '. They must sign in again.');
  })
  .catch(e => { console.error('Failed:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
