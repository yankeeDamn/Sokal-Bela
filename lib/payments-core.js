'use strict';
// Shared by the customer payment endpoint and the Cashfree webhook.
// Payment state is NEVER trusted from the browser or the webhook body:
// we always re-read the order from Cashfree's API before marking anything paid.
const crypto = require('node:crypto');
const c = require('./neon-core');
const cashfree = require('./cashfree');
const bill = require('./billing');

function siteOrigin(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/+$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
  const local = host.startsWith('localhost') || host.startsWith('127.');
  return (local ? 'http://' : 'https://') + host;
}
async function onlineEnabled(db) {
  const r = await db.query("SELECT value FROM settings WHERE key='online_payments_enabled'");
  return r.rows[0]?.value === true && cashfree.configured();
}
const newRef = prefix => String(prefix).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30) + '-' + crypto.randomBytes(4).toString('hex');

// Re-check Cashfree for a payment_ref and apply the result exactly once.
async function settleByRef(db, ref) {
  const found = await db.query('SELECT id::text AS id,status,amount::text AS amount FROM payments WHERE payment_ref=$1', [ref]);
  const p = found.rows[0];
  if (!p) return null;
  if (p.status === 'paid') return { ...p, status: 'paid' };
  const cf = await cashfree.getOrder(ref);
  let next = 'created';
  if (cf.status === 'PAID') {
    if (Math.abs(cf.amount - Number(p.amount)) < 0.005) next = 'paid';
    else console.error('Cashfree amount mismatch for', ref);
  } else if (['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED'].includes(cf.status)) next = 'expired';
  if (next === 'created') return { ...p, status: p.status };
  const cfPayment = next === 'paid' ? await cashfree.getSuccessfulPayment(ref) : null;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const row = (await client.query(
      'SELECT id,status,order_id,subscription_id,covers_until::text AS covers_until FROM payments WHERE payment_ref=$1 FOR UPDATE', [ref])).rows[0];
    if (row.status === 'paid') { await client.query('COMMIT'); return { ...p, status: 'paid' }; }
    if (next === 'paid') {
      await client.query("UPDATE payments SET status='paid',paid_at=NOW(),cf_order_id=COALESCE($2,cf_order_id),cf_payment_id=$3 WHERE id=$1",
        [row.id, cf.cfOrderId || null, cfPayment?.cfPaymentId || null]);
      if (row.order_id)
        await client.query("UPDATE orders SET payment_status='paid',status=CASE WHEN status='new' THEN 'confirmed' ELSE status END WHERE id=$1", [row.order_id]);
      if (row.subscription_id)
        await client.query("UPDATE subscriptions SET paid_until=GREATEST(COALESCE(paid_until,'1970-01-01'::date),$2::date) WHERE id=$1",
          [row.subscription_id, row.covers_until]);
    } else {
      await client.query("UPDATE payments SET status='expired' WHERE id=$1 AND status='created'", [row.id]);
      if (row.order_id)
        await client.query("UPDATE orders SET payment_status='failed' WHERE id=$1 AND payment_status='pending' " +
          "AND NOT EXISTS (SELECT 1 FROM payments WHERE order_id=$1 AND status IN ('created','paid'))", [row.order_id]);
    }
    await client.query('COMMIT');
    return { ...p, status: next };
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}

// Start (or resume) a Cashfree payment for an order or a subscription window.
async function startPayment(db, req, { orderId = null, subscriptionId = null, userId = null, amount, coversUntil = null, customer, refPrefix }) {
  const ref = newRef(refPrefix);
  await db.query(
    'INSERT INTO payments(payment_ref,order_id,subscription_id,user_id,amount,covers_until) VALUES($1,$2,$3,$4,$5,$6)',
    [ref, orderId, subscriptionId, userId, Number(amount).toFixed(2), coversUntil]);
  const origin = siteOrigin(req);
  try {
    const cf = await cashfree.createOrder({
      orderId: ref, amount, customer,
      returnUrl: origin + '/?pay=' + ref,
      notifyUrl: origin.startsWith('https://') ? origin + '/api/cashfree-webhook' : undefined
    });
    await db.query('UPDATE payments SET cf_order_id=$2 WHERE payment_ref=$1', [ref, cf.cfOrderId || null]);
    return { paymentRef: ref, sessionId: cf.sessionId, mode: cashfree.mode() };
  } catch (e) {
    await db.query("UPDATE payments SET status='failed' WHERE payment_ref=$1", [ref]).catch(() => {});
    throw e;
  }
}

// Amount for one delivery of a subscription from CURRENT product prices.
async function perDelivery(db, subscriptionId) {
  const r = await db.query(
    "SELECT p.active,p.price::text AS price,si.qty FROM subscription_items si JOIN products p ON p.id=si.product_id WHERE si.subscription_id=$1", [subscriptionId]);
  if (!r.rowCount || r.rows.some(x => !x.active || Number(x.price) <= 0))
    throw c.bad('Some items in this pass are not priced yet. The shop will contact you.', 'PRICE_UNAVAILABLE', 409);
  return r.rows.reduce((s, x) => s + bill.cents(x.price) * x.qty, 0);
}
module.exports = { siteOrigin, onlineEnabled, settleByRef, startPayment, perDelivery };
