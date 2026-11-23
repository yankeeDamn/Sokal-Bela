'use strict';
// /api/v2/payments?action=config (GET) | verify&ref= (GET) | order (POST) | subscription (POST)
const c = require('../neon-core');
const a = require('../auth-core');
const bill = require('../billing');
const pay = require('../payments-core');
const cashfree = require('../cashfree');

async function config(req, res) {
  return c.respond(res, 200, { ok: true, online: await pay.onlineEnabled(c.db()), mode: cashfree.mode() });
}

async function verify(req, res) {
  const ref = c.clean(req.query?.ref, 45);
  if (!/^[A-Za-z0-9_-]{8,45}$/.test(ref)) throw c.bad('Invalid payment reference.');
  await c.enforceLimit(req, 'pay-verify', 40, 15);
  const db = c.db();
  const result = await pay.settleByRef(db, ref);
  if (!result) throw c.bad('Payment not found.', 'NOT_FOUND', 404);
  const info = await db.query(
    'SELECT o.order_no,s.sub_code FROM payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN subscriptions s ON s.id=p.subscription_id WHERE p.payment_ref=$1', [ref]);
  return c.respond(res, 200, { ok: true, status: result.status, orderNo: info.rows[0]?.order_no || null, subscriptionCode: info.rows[0]?.sub_code || null });
}

async function payOrder(req, res) {
  c.validateHoneypot(req.body);
  const orderNo = c.required(req.body.orderNo, 32, 'Order number').toUpperCase();
  if (!/^SB-[0-9]{8}-[A-F0-9]{8}$/.test(orderNo)) throw c.bad('Invalid order number.');
  await c.enforceLimit(req, 'pay-order', 10, 15);
  const db = c.db(), user = await a.currentUser(req);
  const o = (await db.query(
    "SELECT id::text AS id,user_id::text AS user_id,phone,customer_name,total::text AS total,status,payment_status FROM orders WHERE order_no=$1", [orderNo])).rows[0];
  const owner = o && user && o.user_id === user.id;
  if (!o || !(owner || o.phone === c.phone(req.body.phone)))
    throw c.bad('Order not found. Check the phone and order number.', 'ORDER_NOT_FOUND', 404);
  if (!(await pay.onlineEnabled(db))) throw c.bad('Online payment is not available right now.', 'PAYMENTS_DISABLED', 503);
  if (o.status === 'cancelled') throw c.bad('This order was cancelled.', 'ORDER_CANCELLED', 409);
  if (o.payment_status === 'paid') throw c.bad('This order is already paid.', 'ALREADY_PAID', 409);
  // If an earlier attempt actually succeeded, settle it instead of charging twice.
  const earlier = await db.query("SELECT payment_ref FROM payments WHERE order_id=$1 AND status='created' ORDER BY id DESC LIMIT 3", [o.id]);
  for (const e of earlier.rows) {
    const s = await pay.settleByRef(db, e.payment_ref).catch(() => null);
    if (s?.status === 'paid') return c.respond(res, 200, { ok: true, alreadyPaid: true, orderNo });
  }
  await db.query("UPDATE orders SET payment_method='online',payment_status='pending' WHERE id=$1", [o.id]);
  const session = await pay.startPayment(db, req, {
    orderId: o.id, userId: o.user_id, amount: o.total, customer: { id: o.user_id || o.phone, phone: o.phone, name: o.customer_name }, refPrefix: orderNo
  });
  return c.respond(res, 200, { ok: true, ...session });
}

async function paySubscription(req, res) {
  const user = await a.requireUser(req, res); if (!user) return;
  const code = c.required(req.body.subscriptionCode, 32, 'Pass code').toUpperCase();
  await c.enforceLimit(req, 'pay-sub', 10, 15);
  const db = c.db();
  const s = (await db.query(
    "SELECT id::text AS id,user_id::text AS user_id,sub_code,status,frequency,start_date::text AS start_date,paid_until::text AS paid_until " +
    "FROM subscriptions WHERE sub_code=$1", [code])).rows[0];
  if (!s || s.user_id !== user.id) throw c.bad('Morning Pass not found.', 'NOT_FOUND', 404);
  if (s.status !== 'active') throw c.bad('You can pay once the shop has confirmed your pass.', 'NOT_ACTIVE', 409);
  if (!(await pay.onlineEnabled(db))) throw c.bad('Online payment is not available right now.', 'PAYMENTS_DISABLED', 503);
  const win = bill.nextWindow(s, bill.istToday());
  const deliveries = bill.countDeliveries(s.frequency, s.start_date, win.from, win.to);
  if (!deliveries) throw c.bad('No deliveries fall in the next billing window.', 'NOTHING_TO_PAY', 409);
  const amountCents = (await pay.perDelivery(db, s.id)) * deliveries;
  if (amountCents < 100) throw c.bad('Amount is too small to charge online.', 'NOTHING_TO_PAY', 409);
  const session = await pay.startPayment(db, req, {
    subscriptionId: s.id, userId: user.id, amount: (amountCents / 100).toFixed(2), coversUntil: win.to,
    customer: { id: user.id, phone: user.phone, name: user.name }, refPrefix: s.sub_code
  });
  return c.respond(res, 200, { ok: true, ...session, amount: (amountCents / 100).toFixed(2), deliveries, from: win.from, to: win.to });
}

module.exports = async (req, res) => {
  try {
    const action = String(req.query?.action || '');
    if (action === 'config') { if (!c.allow(req, res, 'GET')) return; return await config(req, res); }
    if (action === 'verify') { if (!c.allow(req, res, 'GET')) return; return await verify(req, res); }
    if (action === 'order' || action === 'subscription') {
      if (!c.allow(req, res, 'POST')) return;
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw c.bad('Invalid JSON body.');
      return action === 'order' ? await payOrder(req, res) : await paySubscription(req, res);
    }
    throw c.bad('Unknown action.', 'NOT_FOUND', 404);
  } catch (e) { return c.fail(res, e); }
};
