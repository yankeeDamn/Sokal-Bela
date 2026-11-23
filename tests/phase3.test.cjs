'use strict';
// Real-PostgreSQL tests for accounts, Cashfree payments, Morning Pass and admin.
// Cashfree's network API is replaced by an in-memory fake; nothing leaves the machine.
process.env.NODE_ENV = 'test';
process.env.CASHFREE_APP_ID = 'test_app';
process.env.CASHFREE_SECRET_KEY = 'test_secret_key_value';
process.env.CASHFREE_ENV = 'sandbox';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const auth = require('../lib/v2-handlers/auth');
const account = require('../lib/v2-handlers/account');
const admin = require('../lib/v2-handlers/manage');
const orders = require('../lib/v2-handlers/orders');
const subs = require('../lib/v2-handlers/subscriptions');
const payments = require('../lib/v2-handlers/payments');
const webhook = require('../api/cashfree-webhook');
const cashfree = require('../lib/cashfree');
const bill = require('../lib/billing');

const conn = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
let ipn = 100;
async function call(fn, method, { body = {}, query = {}, cookie = '', ip } = {}) {
  const addr = ip || '10.9.0.' + (ipn++ % 250 + 1);
  const req = { method, body, query, headers: { host: 'localhost:8787', 'x-real-ip': addr, 'user-agent': 'test', cookie }, socket: { remoteAddress: addr } };
  const out = { headers: {} };
  const res = { status(c) { out.status = c; return this; }, json(p) { out.payload = p; return this; }, setHeader(k, v) { out.headers[k] = v; } };
  await fn(req, res);
  const sc = out.headers['Set-Cookie'];
  if (sc) out.cookie = sc.split(';')[0];
  return out;
}
// ---- fake Cashfree ----
const fake = { orders: new Map(), failCreate: false };
cashfree.http.fetch = async (url, opts) => {
  const path = new URL(url).pathname.replace('/pg', '');
  if (opts.method === 'POST' && path === '/orders') {
    if (fake.failCreate) return { ok: false, status: 500, json: async () => ({}) };
    const b = JSON.parse(opts.body);
    assert.equal(opts.headers['x-client-secret'], 'test_secret_key_value');
    fake.orders.set(b.order_id, { amount: b.order_amount, status: 'ACTIVE' });
    return { ok: true, status: 200, json: async () => ({ cf_order_id: 'cf_' + b.order_id, payment_session_id: 'sess_' + b.order_id, order_status: 'ACTIVE' }) };
  }
  const m = path.match(/^\/orders\/([^/]+)(\/payments)?$/);
  const o = fake.orders.get(decodeURIComponent(m[1]));
  if (!o) return { ok: false, status: 404, json: async () => ({}) };
  if (m[2]) return { ok: true, status: 200, json: async () => o.status === 'PAID' ? [{ payment_status: 'SUCCESS', cf_payment_id: 7001 }] : [] };
  return { ok: true, status: 200, json: async () => ({ order_status: o.status, order_amount: o.amount, cf_order_id: 'cf_x' }) };
};

const PH = () => '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
async function product(kind, name, price, stock, active = true) {
  const r = await conn.query("INSERT INTO products(name_en,name_bn,kind,category,unit,pack_size,price,stock,active) VALUES($1,$1,$2,'T','piece',$3,$4,$5,$6) RETURNING id::text",
    [name + crypto.randomBytes(3).toString('hex'), kind, 'x', price, stock, active]);
  return r.rows[0].id;
}
async function signup(name = 'Asha') {
  const phone = PH();
  const r = await call(auth.bind ? auth : auth, 'POST', { query: { action: 'signup' }, body: { name, phone, password: 'correct horse 9', website: '' } });
  assert.equal(r.status, 201, JSON.stringify(r.payload));
  return { phone, cookie: r.cookie, user: r.payload.user };
}
const addr = { customerName: 'Asha', address: 'Main road Rampurhat', pincode: '731224', deliverySlot: 'Evening', website: '' };

test.before(async () => {
  await conn.query("UPDATE settings SET value='1'::jsonb WHERE key='min_order'");
  await conn.query("UPDATE settings SET value='500'::jsonb WHERE key='free_delivery_min'");
  await conn.query("INSERT INTO settings(key,value) VALUES('online_payments_enabled','true'::jsonb) ON CONFLICT(key) DO UPDATE SET value='true'::jsonb");
});
test.after(async () => { await conn.end(); });

test('billing helpers count deliveries correctly', () => {
  assert.equal(bill.countDeliveries('daily', '2026-12-01', '2026-12-01', '2026-12-30'), 30);
  assert.equal(bill.countDeliveries('mon_sat', '2026-12-01', '2026-12-01', '2026-12-30'), 26); // 4 Sundays: 6,13,20,27
  assert.equal(bill.countDeliveries('weekly', '2026-12-01', '2026-12-01', '2026-12-30'), 5);   // Tuesdays
  assert.deepEqual(bill.nextWindow({ start_date: '2026-12-01', paid_until: '2026-12-31' }, '2026-12-10'), { from: '2027-01-01', to: '2027-01-30' });
});

test('signup, session cookie, me, logout and sign-in log', async () => {
  const u = await signup();
  assert.match(u.cookie, /^sb_sid=/);
  const dup = await call(auth, 'POST', { query: { action: 'signup' }, body: { name: 'X', phone: u.phone, password: 'another pass 1', website: '' } });
  assert.equal(dup.status, 409);
  const weak = await call(auth, 'POST', { query: { action: 'signup' }, body: { name: 'X', phone: PH(), password: 'short', website: '' } });
  assert.equal(weak.status, 400);
  const me = await call(auth, 'GET', { query: { action: 'me' }, cookie: u.cookie });
  assert.equal(me.payload.user.phone, u.phone);
  assert.equal(JSON.stringify(me.payload).includes('password'), false);
  const anon = await call(auth, 'GET', { query: { action: 'me' } });
  assert.equal(anon.payload.user, null);
  await call(auth, 'POST', { query: { action: 'logout' }, cookie: u.cookie });
  const after = await call(auth, 'GET', { query: { action: 'me' }, cookie: u.cookie });
  assert.equal(after.payload.user, null);
  const logs = await conn.query("SELECT event FROM auth_logs WHERE phone=$1 ORDER BY id", [u.phone]);
  assert.deepEqual(logs.rows.map(r => r.event), ['signup', 'logout']);
  const stored = await conn.query('SELECT password_hash FROM users WHERE phone=$1', [u.phone]);
  assert.match(stored.rows[0].password_hash, /^scrypt\$/);
  const raw = await conn.query('SELECT COUNT(*)::int AS n FROM user_sessions WHERE token_hash=$1', [u.cookie.slice(7)]);
  assert.equal(raw.rows[0].n, 0, 'raw token must never be stored');
});

test('wrong passwords are logged and lock the phone after repeated failures', async () => {
  const u = await signup();
  for (let i = 0; i < 6; i++) {
    const r = await call(auth, 'POST', { query: { action: 'login' }, body: { phone: u.phone, password: 'nope-nope-' + i, website: '' } });
    assert.equal(r.status, 401);
  }
  const locked = await call(auth, 'POST', { query: { action: 'login' }, body: { phone: u.phone, password: 'correct horse 9', website: '' } });
  assert.equal(locked.status, 429);
  const ev = await conn.query("SELECT event,count(*)::int n FROM auth_logs WHERE phone=$1 GROUP BY event", [u.phone]);
  const m = Object.fromEntries(ev.rows.map(r => [r.event, r.n]));
  assert.equal(m.login_failed, 6); assert.equal(m.login_blocked, 1);
  const unknown = await call(auth, 'POST', { query: { action: 'login' }, body: { phone: PH(), password: 'whatever-pass', website: '' } });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.payload.error, 'Incorrect phone number or password.');
});

test('correct login works and records last_login', async () => {
  const u = await signup();
  const r = await call(auth, 'POST', { query: { action: 'login' }, body: { phone: u.phone, password: 'correct horse 9', website: '' } });
  assert.equal(r.status, 200); assert.ok(r.cookie);
  const row = await conn.query('SELECT last_login_at FROM users WHERE phone=$1', [u.phone]);
  assert.ok(row.rows[0].last_login_at);
});

test('COD order is linked to the signed-in user and shows in My Orders', async () => {
  const u = await signup(); const pid = await product('vegetable', 'CodVeg', 120, 10);
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, items: [{ productId: pid, qty: 2 }] } });
  assert.equal(r.status, 201, JSON.stringify(r.payload));
  assert.equal(r.payload.paymentMethod, 'cod'); assert.equal(r.payload.payment, undefined);
  const mine = await call(account, 'GET', { query: { section: 'orders' }, cookie: u.cookie });
  assert.equal(mine.payload.orders.length, 1); assert.equal(mine.payload.orders[0].order_no, r.payload.orderNo);
  const noauth = await call(account, 'GET', { query: { section: 'orders' } });
  assert.equal(noauth.status, 401);
});

test('online order: Cashfree session, server verifies, never trusts the browser', async () => {
  const u = await signup(); const pid = await product('vegetable', 'OnlVeg', 300, 5);
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  assert.equal(r.status, 201, JSON.stringify(r.payload));
  assert.equal(r.payload.payment.sessionId.startsWith('sess_'), true);
  const ref = r.payload.payment.paymentRef;
  assert.equal(fake.orders.get(ref).amount, 300);
  // Not paid yet: verify must not mark it paid.
  let v = await call(payments, 'GET', { query: { action: 'verify', ref } });
  assert.equal(v.payload.status, 'created');
  let o = await conn.query('SELECT payment_status,status FROM orders WHERE order_no=$1', [r.payload.orderNo]);
  assert.equal(o.rows[0].payment_status, 'pending');
  // Customer pays at Cashfree; return-page verify settles it.
  fake.orders.get(ref).status = 'PAID';
  v = await call(payments, 'GET', { query: { action: 'verify', ref } });
  assert.equal(v.payload.status, 'paid'); assert.equal(v.payload.orderNo, r.payload.orderNo);
  o = await conn.query('SELECT payment_status,status FROM orders WHERE order_no=$1', [r.payload.orderNo]);
  assert.deepEqual(o.rows[0], { payment_status: 'paid', status: 'confirmed' });
  const p = await conn.query('SELECT status,cf_payment_id FROM payments WHERE payment_ref=$1', [ref]);
  assert.deepEqual(p.rows[0], { status: 'paid', cf_payment_id: '7001' });
  // Idempotent
  v = await call(payments, 'GET', { query: { action: 'verify', ref } });
  assert.equal(v.payload.status, 'paid');
  const again = await call(payments, 'POST', { query: { action: 'order' }, body: { orderNo: r.payload.orderNo, phone: u.phone, website: '' } });
  assert.equal(again.status, 409);
});

test('amount mismatch from the gateway is not accepted as paid', async () => {
  const u = await signup(); const pid = await product('vegetable', 'MismatchVeg', 200, 5);
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  const ref = r.payload.payment.paymentRef;
  fake.orders.get(ref).status = 'PAID'; fake.orders.get(ref).amount = 1;
  const v = await call(payments, 'GET', { query: { action: 'verify', ref } });
  assert.equal(v.payload.status, 'created');
});

test('expired payment marks order failed and Pay-now retry creates a fresh session', async () => {
  const u = await signup(); const pid = await product('vegetable', 'ExpVeg', 150, 5);
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  const ref = r.payload.payment.paymentRef;
  fake.orders.get(ref).status = 'EXPIRED';
  const v = await call(payments, 'GET', { query: { action: 'verify', ref } });
  assert.equal(v.payload.status, 'expired');
  let o = await conn.query('SELECT payment_status FROM orders WHERE order_no=$1', [r.payload.orderNo]);
  assert.equal(o.rows[0].payment_status, 'failed');
  const retry = await call(payments, 'POST', { query: { action: 'order' }, body: { orderNo: r.payload.orderNo, phone: u.phone, website: '' } });
  assert.equal(retry.status, 200); assert.notEqual(retry.payload.paymentRef, ref);
  const wrong = await call(payments, 'POST', { query: { action: 'order' }, body: { orderNo: r.payload.orderNo, phone: PH(), website: '' } });
  assert.equal(wrong.status, 404);
});

test('gateway outage still saves the order and reports a retryable error', async () => {
  const u = await signup(); const pid = await product('vegetable', 'DownVeg', 90, 5);
  fake.failCreate = true;
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  fake.failCreate = false;
  assert.equal(r.status, 201); assert.ok(r.payload.paymentError); assert.equal(r.payload.payment, undefined);
});

test('online payment refused when switched off', async () => {
  await conn.query("UPDATE settings SET value='false'::jsonb WHERE key='online_payments_enabled'");
  const pid = await product('vegetable', 'OffVeg', 90, 5);
  const r = await call(orders, 'POST', { body: { ...addr, phone: PH(), paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  assert.equal(r.status, 409);
  await conn.query("UPDATE settings SET value='true'::jsonb WHERE key='online_payments_enabled'");
});

test('webhook rejects bad signatures and settles good ones via Cashfree API', async () => {
  const u = await signup(); const pid = await product('vegetable', 'HookVeg', 250, 5);
  const r = await call(orders, 'POST', { cookie: u.cookie, body: { ...addr, phone: u.phone, paymentMethod: 'online', items: [{ productId: pid, qty: 1 }] } });
  const ref = r.payload.payment.paymentRef;
  fake.orders.get(ref).status = 'PAID';
  const raw = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: ref } } });
  const ts = String(Date.now());
  const sign = (b, t) => crypto.createHmac('sha256', 'test_secret_key_value').update(t + b).digest('base64');
  const hook = (body, sig) => new Promise(resolve => {
    const out = {}; const req = { method: 'POST', body, headers: { 'x-webhook-signature': sig, 'x-webhook-timestamp': ts } };
    const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(p) { out.payload = p; resolve(out); return this; } };
    webhook(req, res);
  });
  assert.equal((await hook(raw, 'bogus')).status, 401);
  assert.equal((await conn.query("SELECT status FROM payments WHERE payment_ref=$1", [ref])).rows[0].status, 'created');
  assert.equal((await hook(raw, sign(raw, ts))).status, 200);
  assert.equal((await conn.query("SELECT status FROM payments WHERE payment_ref=$1", [ref])).rows[0].status, 'paid');
});

test('Morning Pass: requires sign-in, accepts a valid start date, milk + newspaper', async () => {
  const milk = await product('dairy', 'Milk', 30, 100), paper = await product('newspaper', 'Paper', 6, 9999);
  const u = await signup();
  const start = bill.addDays(bill.istToday(), 1);
  const body = { customerName: 'Asha', phone: u.phone, address: 'Main road Rampurhat', pincode: '731224', slot: '06:00-08:00', frequency: 'daily', startDate: start, items: [{ productId: milk, qty: 1 }, { productId: paper, qty: 1 }], website: '' };
  const guest = await call(subs, 'POST', { body });
  assert.equal(guest.status, 401);
  const ok = await call(subs, 'POST', { cookie: u.cookie, body });
  assert.equal(ok.status, 201, JSON.stringify(ok.payload));
  const past = await call(subs, 'POST', { cookie: u.cookie, body: { ...body, startDate: '2020-01-01' } });
  assert.equal(past.status, 400);
  const bad = await call(subs, 'POST', { cookie: u.cookie, body: { ...body, startDate: 'tomorrow' } });
  assert.equal(bad.status, 400);
  const mine = await call(account, 'GET', { query: { section: 'passes' }, cookie: u.cookie });
  assert.equal(mine.payload.passes.length, 1);
  assert.equal(mine.payload.passes[0].items.length, 2); assert.equal(mine.payload.passes[0].perDelivery, 36);
  assert.equal(mine.payload.passes[0].nextPayment, null, 'cannot pay before the shop confirms');
});

test('admin: gating, approve pass, pay 30 days online, deliveries, orders, stock restore', async () => {
  const milk = await product('dairy', 'MilkAdm', 30, 100);
  const cust = await signup('Customer');
  const boss = await signup('Boss');
  assert.equal((await call(admin, 'GET', { cookie: cust.cookie })).status, 403);
  assert.equal((await call(admin, 'GET', {})).status, 401);
  await conn.query("UPDATE users SET role='admin' WHERE phone=$1", [boss.phone]);
  const A = { cookie: boss.cookie };
  const ov = await call(admin, 'GET', { ...A, query: { action: 'overview' } });
  assert.equal(ov.status, 200, JSON.stringify(ov.payload)); assert.equal(ov.payload.series.length, 14);

  // customer requests a pass starting today
  const start = bill.istToday();
  const rq = await call(subs, 'POST', { cookie: cust.cookie, body: { customerName: 'Customer', phone: cust.phone, address: 'Main road Rampurhat', pincode: '731224', slot: '07:00-09:00', frequency: 'daily', startDate: start, items: [{ productId: milk, qty: 2 }], website: '' } });
  assert.equal(rq.status, 201);
  const code = rq.payload.subscriptionCode;
  const payEarly = await call(payments, 'POST', { cookie: cust.cookie, query: { action: 'subscription' }, body: { subscriptionCode: code } });
  assert.equal(payEarly.status, 409);
  const list = await call(admin, 'GET', { ...A, query: { action: 'subscriptions', status: 'pending' } });
  const sub = list.payload.subscriptions.find(s => s.sub_code === code); assert.ok(sub);
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'subscription-status' }, body: { id: sub.id, status: 'active' } })).status, 200);

  // pay 30 days: 30 deliveries x 2 x Rs30 = 1800
  const ps = await call(payments, 'POST', { cookie: cust.cookie, query: { action: 'subscription' }, body: { subscriptionCode: code } });
  assert.equal(ps.status, 200, JSON.stringify(ps.payload)); assert.equal(ps.payload.amount, '1800.00'); assert.equal(ps.payload.deliveries, 30);
  fake.orders.get(ps.payload.paymentRef).status = 'PAID';
  assert.equal((await call(payments, 'GET', { query: { action: 'verify', ref: ps.payload.paymentRef } })).payload.status, 'paid');
  const paid = await conn.query('SELECT paid_until::text FROM subscriptions WHERE sub_code=$1', [code]);
  assert.equal(paid.rows[0].paid_until, bill.addDays(start, 29));
  // other customer cannot pay my pass
  const other = await signup('Other');
  assert.equal((await call(payments, 'POST', { cookie: other.cookie, query: { action: 'subscription' }, body: { subscriptionCode: code } })).status, 404);

  // today's delivery sheet
  const due = await call(admin, 'GET', { ...A, query: { action: 'deliveries' } });
  const row = due.payload.deliveries.find(d => d.sub_code === code);
  assert.ok(row); assert.equal(row.per_delivery, '60.00'); assert.equal(row.paid, true);
  await call(admin, 'POST', { ...A, query: { action: 'deliver' }, body: { id: row.id } });
  const again = await call(admin, 'GET', { ...A, query: { action: 'deliveries' } });
  assert.equal(again.payload.deliveries.find(d => d.sub_code === code).delivered, true);

  // customer pauses and resumes
  const pause = await call(account, 'POST', { cookie: cust.cookie, query: { action: 'pass-action' }, body: { subscriptionCode: code, action: 'pause', pausedUntil: bill.addDays(start, 3) } });
  assert.equal(pause.status, 200);
  assert.equal((await call(account, 'POST', { cookie: cust.cookie, query: { action: 'pass-action' }, body: { subscriptionCode: code, action: 'resume' } })).status, 200);
  assert.equal((await call(account, 'POST', { cookie: other.cookie, query: { action: 'pass-action' }, body: { subscriptionCode: code, action: 'cancel' } })).status, 404);

  // order lifecycle and stock restore on cancel
  const veg = await product('vegetable', 'AdmVeg', 100, 10);
  const o = await call(orders, 'POST', { cookie: cust.cookie, body: { ...addr, phone: cust.phone, items: [{ productId: veg, qty: 4 }] } });
  assert.equal((await conn.query('SELECT stock FROM products WHERE id=$1', [veg])).rows[0].stock, 6);
  const ol = await call(admin, 'GET', { ...A, query: { action: 'orders', q: o.payload.orderNo } });
  assert.equal(ol.payload.orders.length, 1);
  const oid = ol.payload.orders[0].id;
  await call(admin, 'POST', { ...A, query: { action: 'order-status' }, body: { id: oid, status: 'cancelled' } });
  assert.equal((await conn.query('SELECT stock FROM products WHERE id=$1', [veg])).rows[0].stock, 10);
  await call(admin, 'POST', { ...A, query: { action: 'order-status' }, body: { id: oid, status: 'cancelled' } });
  assert.equal((await conn.query('SELECT stock FROM products WHERE id=$1', [veg])).rows[0].stock, 10, 'no double restock');
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'order-status' }, body: { id: oid, status: 'new' } })).status, 409);

  // COD delivered => paid
  const o2 = await call(orders, 'POST', { cookie: cust.cookie, body: { ...addr, phone: cust.phone, items: [{ productId: veg, qty: 1 }] } });
  const o2id = (await call(admin, 'GET', { ...A, query: { action: 'orders', q: o2.payload.orderNo } })).payload.orders[0].id;
  await call(admin, 'POST', { ...A, query: { action: 'order-status' }, body: { id: o2id, status: 'delivered' } });
  assert.equal((await conn.query('SELECT payment_status FROM orders WHERE id=$1', [o2id])).rows[0].payment_status, 'paid');

  // products, users, logs, payments
  const pr = await call(admin, 'GET', { ...A, query: { action: 'products', kind: 'newspaper' } });
  assert.ok(pr.payload.products.length >= 5);
  const inactive = pr.payload.products.find(p => !p.active && Number(p.price) === 0);
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'product-save' }, body: { id: inactive.id, price: 0, stock: 10, active: true } })).status, 400);
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'product-save' }, body: { id: inactive.id, price: 7, stock: 10, active: true } })).status, 200);
  const created = await call(admin, 'POST', { ...A, query: { action: 'product-create' }, body: { kind: 'dairy', name_en: 'Ghee ' + crypto.randomBytes(2).toString('hex'), name_bn: 'ঘি', unit: 'pack', pack_size: '500 g', price: 450, stock: 12, active: true } });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'user-status' }, body: { id: boss.user.id, status: 'blocked' } })).status, 409);
  assert.equal((await call(admin, 'POST', { ...A, query: { action: 'user-status' }, body: { id: other.user.id, status: 'blocked' } })).status, 200);
  assert.equal((await call(auth, 'GET', { query: { action: 'me' }, cookie: other.cookie })).payload.user, null, 'blocked users lose their session');
  const blocked = await call(auth, 'POST', { query: { action: 'login' }, body: { phone: other.phone, password: 'correct horse 9', website: '' } });
  assert.equal(blocked.status, 403);
  const logs = await call(admin, 'GET', { ...A, query: { action: 'logs', event: 'admin_action' } });
  assert.ok(logs.payload.logs.length > 3);
  assert.equal(JSON.stringify(logs.payload).includes('password'), false);
  assert.ok((await call(admin, 'GET', { ...A, query: { action: 'payments' } })).payload.payments.length >= 1);
  assert.equal((await call(admin, 'GET', { ...A, query: { action: 'users' } })).status, 200);
  assert.equal((await call(admin, 'GET', { ...A, query: { action: 'nope' } })).status, 404);
  assert.equal((await call(admin, 'GET', { ...A, query: { action: 'constructor' } })).status, 404);
});
