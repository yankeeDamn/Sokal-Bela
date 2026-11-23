'use strict';
// Signed-in customer area. GET ?section=orders|passes   POST ?action=pass-action
const c = require('../neon-core');
const a = require('../auth-core');
const bill = require('../billing');
const pay = require('../payments-core');

async function orders(db, user) {
  const r = await db.query(
    "SELECT o.id,o.order_no,o.status,o.payment_method,o.payment_status,o.total::text AS total,o.delivery_slot,o.created_at," +
    "COALESCE((SELECT json_agg(json_build_object('name',i.name_snapshot,'qty',i.qty,'line_total',i.line_total::text) ORDER BY i.id) " +
    "FROM order_items i WHERE i.order_id=o.id),'[]'::json) AS items " +
    "FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 50", [user.id]);
  return r.rows.map(({ id, ...rest }) => rest);
}

async function passes(db, user) {
  const r = await db.query(
    "SELECT s.id::text AS id,s.sub_code,s.slot,s.frequency,s.status,s.start_date::text AS start_date,s.paused_until::text AS paused_until," +
    "s.paid_until::text AS paid_until,s.created_at," +
    "COALESCE((SELECT json_agg(json_build_object('name',p.name_en,'pack',p.pack_size,'kind',p.kind,'qty',si.qty,'price',p.price::text,'active',p.active) ORDER BY si.id) " +
    "FROM subscription_items si JOIN products p ON p.id=si.product_id WHERE si.subscription_id=s.id),'[]'::json) AS items " +
    "FROM subscriptions s WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 20", [user.id]);
  const today = bill.istToday();
  return r.rows.map(({ id, ...s }) => {
    const priced = s.items.length && s.items.every(i => i.active && Number(i.price) > 0);
    const perDelivery = priced ? s.items.reduce((t, i) => t + bill.cents(i.price) * i.qty, 0) / 100 : null;
    const win = bill.nextWindow(s, today);
    const deliveries = bill.countDeliveries(s.frequency, s.start_date, win.from, win.to);
    return { ...s, perDelivery, nextPayment: perDelivery && s.status === 'active' ? { amount: (perDelivery * deliveries).toFixed(2), deliveries, from: win.from, to: win.to } : null };
  });
}

async function passAction(req, res, user) {
  const code = c.required(req.body.subscriptionCode, 32, 'Pass code').toUpperCase();
  const action = String(req.body.action || '');
  const db = c.db();
  const s = (await db.query("SELECT id::text AS id,status,start_date::text AS start_date FROM subscriptions WHERE sub_code=$1 AND user_id=$2", [code, user.id])).rows[0];
  if (!s) throw c.bad('Morning Pass not found.', 'NOT_FOUND', 404);
  if (s.status === 'cancelled') throw c.bad('This pass is already cancelled.', 'CONFLICT', 409);
  if (action === 'cancel') {
    await db.query("UPDATE subscriptions SET status='cancelled' WHERE id=$1", [s.id]);
  } else if (action === 'pause') {
    const until = String(req.body.pausedUntil || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || new Date(until + 'T00:00:00Z').toISOString().slice(0, 10) !== until) throw c.bad('Choose a valid date to pause until.');
    const today = bill.istToday();
    if (until < today || until > bill.addDays(today, 90)) throw c.bad('You can pause for up to 90 days from today.');
    if (s.status !== 'active') throw c.bad('Only an active pass can be paused.', 'CONFLICT', 409);
    await db.query("UPDATE subscriptions SET status='paused',paused_until=GREATEST($2::date,start_date) WHERE id=$1", [s.id, until]);
  } else if (action === 'resume') {
    if (s.status !== 'paused') throw c.bad('This pass is not paused.', 'CONFLICT', 409);
    await db.query("UPDATE subscriptions SET status='active',paused_until=NULL WHERE id=$1", [s.id]);
  } else throw c.bad('Unknown action.');
  return c.respond(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  try {
    const user = await a.requireUser(req, res); if (!user) return;
    const db = c.db();
    if (req.method === 'GET') {
      if (!c.allow(req, res, 'GET')) return;
      const section = String(req.query?.section || '');
      if (section === 'orders') return c.respond(res, 200, { ok: true, orders: await orders(db, user) });
      if (section === 'passes') return c.respond(res, 200, { ok: true, passes: await passes(db, user), online: await pay.onlineEnabled(db) });
      throw c.bad('Unknown section.', 'NOT_FOUND', 404);
    }
    if (!c.allow(req, res, 'POST')) return;
    if (!req.body || typeof req.body !== 'object') throw c.bad('Invalid JSON body.');
    if (req.query?.action === 'pass-action') return await passAction(req, res, user);
    throw c.bad('Unknown action.', 'NOT_FOUND', 404);
  } catch (e) { return c.fail(res, e); }
};
