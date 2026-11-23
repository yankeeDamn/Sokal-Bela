'use strict';
// Cashfree server-to-server notification. Needs the RAW body to verify the
// signature, so body parsing is disabled for this one function.
const cashfree = require('../lib/cashfree');
const pay = require('../lib/payments-core');
const c = require('../lib/neon-core');

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > 64 * 1024) { reject(new Error('too large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let raw;
  try { raw = typeof req.body === 'string' ? req.body : await rawBody(req); }
  catch { return res.status(413).json({ ok: false }); }
  if (!cashfree.verifyWebhook(raw, req.headers['x-webhook-signature'], req.headers['x-webhook-timestamp']))
    return res.status(401).json({ ok: false });
  try {
    const event = JSON.parse(raw);
    // Only the reference is taken from the body; status is re-read from Cashfree.
    const ref = event?.data?.order?.order_id;
    if (typeof ref === 'string' && /^[A-Za-z0-9_-]{8,45}$/.test(ref)) await pay.settleByRef(c.db(), ref);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Cashfree webhook error:', e.code || e.name);
    return res.status(500).json({ ok: false }); // Cashfree retries on non-2xx
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
