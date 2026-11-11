'use strict';
// Node-only database connection. NEVER import this file in a browser.
const { Pool } = require('pg');
let pool;
function db() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('Database is not configured. Add DATABASE_URL to this Vercel Preview environment.');
    error.status = 503; throw error;
  }
  if (!pool) pool = new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:5000});
  return pool;
}
async function settingsFrom(client) {
  const {rows} = await client.query("SELECT key,value FROM settings WHERE key = ANY($1::text[])",[["shop_phone","min_order","free_delivery_min","free_delivery_radius_km","delivery_pincodes","shop_hours","delivery_fee_below_threshold"]]);
  return Object.fromEntries(rows.map(row=>[row.key,row.value]));
}
module.exports = {db,settingsFrom};
