'use strict';
// Administrator API. Every action requires a signed-in user with role='admin'.
// GET  /api/v2/admin?action=overview|orders|order|subscriptions|deliveries|products|users|logs|payments
// POST /api/v2/admin?action=order-status|order-payment|subscription-status|deliver|product-save|product-create|user-status
const c = require('../neon-core');
const a = require('../auth-core');
const bill = require('../billing');

const ORDER_STATUS = ['new', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
const SUB_STATUS = ['pending', 'active', 'paused', 'cancelled'];
const id = v => { if (!/^[1-9][0-9]{0,15}$/.test(String(v))) throw c.bad('Invalid id.'); return String(v); };
const paging = q => ({ limit: Math.min(100, Math.max(1, parseInt(q.limit, 10) || 50)), offset: Math.max(0, parseInt(q.offset, 10) || 0) });
const like = v => '%' + c.clean(v, 60).replace(/[\\%_]/g, '\\$&') + '%';
async function audit(db, admin, req, detail) { await a.log(db, { userId: admin.id, phone: admin.phone, event: 'admin_action', detail, req }); }

// ---------- reads ----------
async function overview(db) {
  const day = "(created_at AT TIME ZONE 'Asia/Kolkata')::date";
  const today = bill.istToday();
  const [kpi, series, status, recent, events, low, pay] = await Promise.all([
    db.query(`SELECT
      (SELECT COUNT(*)::int FROM orders WHERE ${day}=$1::date) AS orders_today,
      (SELECT COALESCE(SUM(total),0)::text FROM orders WHERE ${day}=$1::date AND status<>'cancelled') AS sales_today,
      (SELECT COUNT(*)::int FROM orders WHERE status IN ('new','confirmed','out_for_delivery')) AS open_orders,
      (SELECT COALESCE(SUM(total),0)::text FROM orders WHERE created_at > NOW()-INTERVAL '30 days' AND status<>'cancelled') AS sales_30d,
      (SELECT COUNT(*)::int FROM orders WHERE payment_method='online' AND payment_status='paid' AND created_at > NOW()-INTERVAL '30 days') AS online_paid_30d,
      (SELECT COUNT(*)::int FROM subscriptions WHERE status='active') AS active_passes,
      (SELECT COUNT(*)::int FROM subscriptions WHERE status='pending') AS pending_passes,
      (SELECT COUNT(*)::int FROM users WHERE role='customer') AS customers,
      (SELECT COUNT(*)::int FROM users WHERE role='customer' AND created_at > NOW()-INTERVAL '7 days') AS new_customers_7d,
      (SELECT COUNT(*)::int FROM auth_logs WHERE event='login_failed' AND created_at > NOW()-INTERVAL '24 hours') AS failed_logins_24h`, [today]),
    db.query(`SELECT to_char(d,'YYYY-MM-DD') AS day,
      (SELECT COUNT(*)::int FROM orders o WHERE (o.created_at AT TIME ZONE 'Asia/Kolkata')::date=d::date) AS orders,
      (SELECT COALESCE(SUM(o.total),0)::float FROM orders o WHERE (o.created_at AT TIME ZONE 'Asia/Kolkata')::date=d::date AND o.status<>'cancelled') AS sales
      FROM generate_series($1::date-13,$1::date,'1 day') d ORDER BY d`, [today]),
    db.query('SELECT status,COUNT(*)::int AS n FROM orders GROUP BY status'),
    db.query('SELECT order_no,customer_name,total::text AS total,status,payment_method,payment_status,created_at FROM orders ORDER BY created_at DESC LIMIT 8'),
    db.query('SELECT l.event,l.phone,l.detail,l.created_at,u.name FROM auth_logs l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 8'),
    db.query("SELECT id::text AS id,name_en,kind,stock FROM products WHERE active AND kind<>'newspaper' AND stock<=5 ORDER BY stock,name_en LIMIT 10"),
    db.query("SELECT status,COUNT(*)::int AS n FROM payments WHERE created_at > NOW()-INTERVAL '30 days' GROUP BY status")
  ]);
  const due = await dueToday(db);
  return { kpis: { ...kpi.rows[0], due_today: due.length }, series: series.rows, statusBreakdown: status.rows,
    recentOrders: recent.rows, recentAuth: events.rows, lowStock: low.rows, payments30d: pay.rows };
}

async function orderList(db, q) {
  const { limit, offset } = paging(q);
  const where = [], args = [];
  if (q.status) { if (!ORDER_STATUS.includes(q.status)) throw c.bad('Invalid status.'); args.push(q.status); where.push('o.status=$' + args.length); }
  if (q.payment) { if (!['unpaid', 'pending', 'paid', 'failed'].includes(q.payment)) throw c.bad('Invalid payment status.'); args.push(q.payment); where.push('o.payment_status=$' + args.length); }
  if (q.q) { args.push(like(q.q)); where.push(`(o.order_no ILIKE $${args.length} OR o.phone ILIKE $${args.length} OR o.customer_name ILIKE $${args.length})`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.query('SELECT COUNT(*)::int AS n FROM orders o ' + w, args)).rows[0].n;
  const rows = await db.query(
    `SELECT o.id::text AS id,o.order_no,o.customer_name,o.phone,o.address,o.pincode,o.delivery_slot,o.notes,o.subtotal::text,o.delivery_fee::text,o.total::text,o.status,o.payment_method,o.payment_status,o.created_at,
      COALESCE((SELECT json_agg(json_build_object('name',i.name_snapshot,'qty',i.qty,'line_total',i.line_total::text) ORDER BY i.id) FROM order_items i WHERE i.order_id=o.id),'[]'::json) AS items
     FROM orders o ${w} ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`, args);
  return { orders: rows.rows, total };
}

const SUB_SELECT = `s.id::text AS id,s.sub_code,s.customer_name,s.phone,s.address,s.pincode,s.slot,s.frequency,s.status,s.start_date::text AS start_date,
  s.paused_until::text AS paused_until,s.paid_until::text AS paid_until,s.notes,s.created_at,
  COALESCE((SELECT json_agg(json_build_object('name',p.name_en,'pack',p.pack_size,'kind',p.kind,'qty',si.qty,'price',p.price::text) ORDER BY si.id)
    FROM subscription_items si JOIN products p ON p.id=si.product_id WHERE si.subscription_id=s.id),'[]'::json) AS items`;
async function subscriptionList(db, q) {
  const { limit, offset } = paging(q);
  const args = [], where = [];
  if (q.status) { if (!SUB_STATUS.includes(q.status)) throw c.bad('Invalid status.'); args.push(q.status); where.push('s.status=$1'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = await db.query(`SELECT ${SUB_SELECT} FROM subscriptions s ${w} ORDER BY (s.status='pending') DESC,s.created_at DESC LIMIT ${limit} OFFSET ${offset}`, args);
  return { subscriptions: rows.rows };
}
async function dueToday(db) {
  const today = bill.istToday();
  const rows = await db.query(
    `SELECT ${SUB_SELECT},COALESCE(d.delivered,FALSE) AS delivered FROM subscriptions s
     LEFT JOIN subscription_deliveries d ON d.subscription_id=s.id AND d.delivery_date=$1::date
     WHERE s.status IN ('active','paused') AND s.start_date <= $1::date AND (s.paused_until IS NULL OR s.paused_until < $1::date)
     ORDER BY s.slot,s.customer_name`, [today]);
  return rows.rows.filter(s => bill.dueOn(s.frequency, s.start_date, today)).map(s => {
    s.per_delivery = (s.items.reduce((t, i) => t + bill.cents(i.price) * i.qty, 0) / 100).toFixed(2);
    s.paid = Boolean(s.paid_until && s.paid_until >= today);
    return s;
  }).filter(s => s.status === 'active' || (s.paused_until && s.paused_until < today));
}
async function productList(db, q) {
  const kind = q.kind && ['vegetable', 'dairy', 'newspaper'].includes(q.kind) ? q.kind : null;
  const rows = await db.query(
    "SELECT id::text AS id,name_en,name_bn,kind,category,unit,pack_size,price::text AS price,stock,emoji,image_url,active,sort_order FROM products " +
    "WHERE ($1::text IS NULL OR kind=$1) ORDER BY kind,sort_order,name_en LIMIT 500", [kind]);
  return { products: rows.rows };
}
async function userList(db, q) {
  const { limit, offset } = paging(q);
  const args = [], w = q.q ? (args.push(like(q.q)), 'WHERE (u.phone ILIKE $1 OR u.name ILIKE $1)') : '';
  const rows = await db.query(
    `SELECT u.id::text AS id,u.phone,u.name,u.email,u.role,u.status,u.created_at,u.last_login_at,
      (SELECT COUNT(*)::int FROM orders o WHERE o.user_id=u.id) AS orders,
      (SELECT COUNT(*)::int FROM subscriptions s WHERE s.user_id=u.id AND s.status IN ('active','paused')) AS passes
     FROM users u ${w} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`, args);
  return { users: rows.rows };
}
async function logList(db, q) {
  const { limit, offset } = paging(q);
  const args = [], where = [];
  if (q.event) { args.push(c.clean(q.event, 24)); where.push('l.event=$' + args.length); }
  if (q.q) { args.push(like(q.q)); where.push('l.phone ILIKE $' + args.length); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = await db.query(
    `SELECT l.id::text AS id,l.event,l.phone,l.detail,l.created_at,l.user_agent,substr(l.ip_hash,1,8) AS ip_ref,u.name
     FROM auth_logs l LEFT JOIN users u ON u.id=l.user_id ${w} ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`, args);
  return { logs: rows.rows };
}
async function paymentList(db, q) {
  const { limit, offset } = paging(q);
  const rows = await db.query(
    `SELECT p.id::text AS id,p.payment_ref,p.amount::text AS amount,p.status,p.cf_payment_id,p.created_at,p.paid_at,p.covers_until::text AS covers_until,
      o.order_no,s.sub_code,COALESCE(o.customer_name,s.customer_name) AS customer
     FROM payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN subscriptions s ON s.id=p.subscription_id
     ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`);
  return { payments: rows.rows };
}

// ---------- writes ----------
async function tx(fn) {
  const client = await c.db().connect();
  try { await client.query('BEGIN'); const out = await fn(client); await client.query('COMMIT'); return out; }
  catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}
async function orderStatus(b, admin, req) {
  const orderId = id(b.id);
  if (!ORDER_STATUS.includes(b.status)) throw c.bad('Invalid status.');
  const out = await tx(async client => {
    const o = (await client.query('SELECT id,order_no,status,payment_method,payment_status FROM orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
    if (!o) throw c.bad('Order not found.', 'NOT_FOUND', 404);
    if (o.status === 'cancelled' && b.status !== 'cancelled') throw c.bad('A cancelled order cannot be reopened. Ask the customer to place a new order.', 'CONFLICT', 409);
    if (o.status !== 'cancelled' && b.status === 'cancelled') {
      // Return reserved stock exactly once.
      await client.query('UPDATE products p SET stock=p.stock+i.qty,updated_at=NOW() FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id', [orderId]);
    }
    await client.query('UPDATE orders SET status=$2 WHERE id=$1', [orderId, b.status]);
    // Cash is collected when a COD order is delivered.
    if (b.status === 'delivered' && o.payment_method === 'cod')
      await client.query("UPDATE orders SET payment_status='paid' WHERE id=$1", [orderId]);
    return o.order_no;
  });
  await audit(c.db(), admin, req, 'order ' + out + ' -> ' + b.status);
}
async function orderPayment(b, admin, req) {
  const orderId = id(b.id);
  if (!['paid', 'unpaid'].includes(b.paymentStatus)) throw c.bad('Invalid payment status.');
  const r = await c.db().query(
    "UPDATE orders SET payment_status=$2 WHERE id=$1 AND payment_method='cod' RETURNING order_no", [orderId, b.paymentStatus]);
  if (!r.rowCount) throw c.bad('Only cash-on-delivery orders can be marked manually. Online payments are set by Cashfree.', 'CONFLICT', 409);
  await audit(c.db(), admin, req, 'order ' + r.rows[0].order_no + ' payment ' + b.paymentStatus);
}
async function subscriptionStatus(b, admin, req) {
  const subId = id(b.id);
  if (!SUB_STATUS.includes(b.status)) throw c.bad('Invalid status.');
  let until = null;
  if (b.status === 'paused') {
    until = String(b.pausedUntil || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) throw c.bad('Choose a date to pause until.');
  }
  const r = await c.db().query(
    "UPDATE subscriptions SET status=$2,paused_until=$3::date WHERE id=$1 AND status<>'cancelled' RETURNING sub_code", [subId, b.status, until]);
  if (!r.rowCount) throw c.bad('Pass not found or already cancelled.', 'CONFLICT', 409);
  await audit(c.db(), admin, req, 'pass ' + r.rows[0].sub_code + ' -> ' + b.status);
}
async function deliver(b, admin, req) {
  const subId = id(b.id), today = bill.istToday();
  const done = b.delivered !== false;
  const items = (await c.db().query(
    "SELECT p.price::text AS price,si.qty FROM subscription_items si JOIN products p ON p.id=si.product_id WHERE si.subscription_id=$1", [subId])).rows;
  const amount = (items.reduce((t, i) => t + bill.cents(i.price) * i.qty, 0) / 100).toFixed(2);
  await c.db().query(
    "INSERT INTO subscription_deliveries(subscription_id,delivery_date,delivered,amount) VALUES($1,$2::date,$3,$4) " +
    "ON CONFLICT (subscription_id,delivery_date) DO UPDATE SET delivered=EXCLUDED.delivered,amount=EXCLUDED.amount", [subId, today, done, amount]);
  await audit(c.db(), admin, req, 'pass #' + subId + (done ? ' delivered ' : ' un-delivered ') + today);
}
function money(v, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) throw c.bad(label + ' must be between 0 and 100000.');
  return Math.round(n * 100) / 100;
}
function stock(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100000) throw c.bad('Stock must be a whole number from 0 to 100000.');
  return n;
}
function imageUrl(v) {
  const s = c.clean(v, 500);
  if (s && !/^https:\/\/[^\s]+$/i.test(s)) throw c.bad('Image URL must start with https://');
  return s;
}
async function productSave(b, admin, req) {
  const pid = id(b.id), price = money(b.price, 'Price'), st = stock(b.stock), active = b.active === true;
  if (active && price <= 0) throw c.bad('Set a price above 0 before activating a product.');
  const r = await c.db().query(
    "UPDATE products SET price=$2,stock=$3,active=$4,image_url=COALESCE($5,image_url),updated_at=NOW() WHERE id=$1 RETURNING name_en,pack_size",
    [pid, price, st, active, b.imageUrl === undefined ? null : imageUrl(b.imageUrl)]);
  if (!r.rowCount) throw c.bad('Product not found.', 'NOT_FOUND', 404);
  await audit(c.db(), admin, req, 'product ' + r.rows[0].name_en + ' price ' + price + ' stock ' + st + (active ? ' ON' : ' OFF'));
}
const UNITS = ['kg', 'g', 'piece', 'bunch', 'litre', 'ml', 'pack'];
async function productCreate(b, admin, req) {
  if (!['vegetable', 'dairy', 'newspaper'].includes(b.kind)) throw c.bad('Choose a product type.');
  if (!UNITS.includes(b.unit)) throw c.bad('Choose a valid unit.');
  const price = money(b.price, 'Price'), st = stock(b.stock ?? 0);
  try {
    await c.db().query(
      "INSERT INTO products(kind,name_en,name_bn,category,unit,pack_size,price,stock,emoji,image_url,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [b.kind, c.required(b.name_en, 120, 'English name'), c.required(b.name_bn || b.name_en, 120, 'Bengali name'),
        c.clean(b.category, 80) || 'Other', b.unit, c.clean(b.pack_size, 40), price, st,
        c.clean(b.emoji, 16) || '🛒', imageUrl(b.image_url), b.active === true && price > 0]);
  } catch (e) {
    if (e.code === '23505') throw c.bad('A product with this name and pack size already exists.', 'CONFLICT', 409);
    throw e;
  }
  await audit(c.db(), admin, req, 'product created ' + c.clean(b.name_en, 60));
}
async function userStatus(b, admin, req) {
  const uid = id(b.id);
  if (!['active', 'blocked'].includes(b.status)) throw c.bad('Invalid status.');
  if (uid === admin.id) throw c.bad('You cannot block your own account.', 'CONFLICT', 409);
  const out = await tx(async client => {
    const r = await client.query("UPDATE users SET status=$2 WHERE id=$1 AND role='customer' RETURNING phone", [uid, b.status]);
    if (!r.rowCount) throw c.bad('Customer not found.', 'NOT_FOUND', 404);
    if (b.status === 'blocked') await client.query('DELETE FROM user_sessions WHERE user_id=$1', [uid]);
    return r.rows[0].phone;
  });
  await audit(c.db(), admin, req, 'user ' + out + ' -> ' + b.status);
}

const READS = {
  overview: (db) => overview(db), orders: orderList, subscriptions: subscriptionList, deliveries: async db => ({ deliveries: await dueToday(db), date: bill.istToday() }),
  products: productList, users: userList, logs: logList, payments: paymentList
};
const WRITES = {
  'order-status': orderStatus, 'order-payment': orderPayment, 'subscription-status': subscriptionStatus,
  deliver, 'product-save': productSave, 'product-create': productCreate, 'user-status': userStatus
};

module.exports = async (req, res) => {
  try {
    const admin = await a.requireAdmin(req, res); if (!admin) return;
    const action = String(req.query?.action || 'overview');
    if (req.method === 'GET') {
      if (!c.allow(req, res, 'GET')) return;
      if (!Object.hasOwn(READS, action)) throw c.bad('Unknown action.', 'NOT_FOUND', 404);
      return c.respond(res, 200, { ok: true, ...(await READS[action](c.db(), req.query || {})) });
    }
    if (!c.allow(req, res, 'POST')) return;
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw c.bad('Invalid JSON body.');
    if (!Object.hasOwn(WRITES, action)) throw c.bad('Unknown action.', 'NOT_FOUND', 404);
    await WRITES[action](req.body, admin, req);
    return c.respond(res, 200, { ok: true });
  } catch (e) { return c.fail(res, e); }
const c=require('../neon-core');
const auth=require('../neon-admin-auth');
const guard=require('../neon-admin-guard');
const alerts=require('../order-alerts');
const VIEWS=['overview','orders','products','subscriptions','requests','kitchen','campaigns','settings'];
const ORDER_STATES=['new','confirmed','out_for_delivery','delivered','cancelled'];
const CAMPAIGN_CHANNELS=['whatsapp','facebook','instagram','google','flyer','referral','other'];
const CAMPAIGN_STATES=['draft','planned','active','paused','completed'];
const PRODUCT_STATES=['pending','active','paused','cancelled'];
const REQUEST_STATES=['new','contacted','confirmed','cancelled'];
const ID=/^[1-9][0-9]{0,14}$/;
const pageQueries={
 orders:"SELECT o.id::text,o.order_no,o.customer_name,o.phone,o.address,o.pincode,o.delivery_slot,o.notes,o.subtotal::text,o.delivery_fee::text,o.total::text,o.status,o.created_at,COALESCE(a.status,'not_queued') AS alert_status,a.last_error,COALESCE(json_agg(json_build_object('name',i.name_snapshot,'qty',i.qty,'unit',i.unit_snapshot,'price',i.price_snapshot::text,'total',i.line_total::text) ORDER BY i.id) FILTER(WHERE i.id IS NOT NULL),'[]'::json) AS items FROM orders o LEFT JOIN order_alerts a ON a.order_id=o.id LEFT JOIN order_items i ON i.order_id=o.id GROUP BY o.id,a.status,a.last_error ORDER BY o.created_at DESC LIMIT 200",
 products:"SELECT id::text,name_en,name_bn,kind,category,unit,pack_size,price::text,stock,active,updated_at FROM products ORDER BY kind,sort_order,id LIMIT 400",
 subscriptions:"SELECT s.id::text,s.sub_code,s.customer_name,s.phone,s.address,s.pincode,s.slot,s.frequency,s.start_date,s.status,s.paused_until,s.created_at,COALESCE(json_agg(json_build_object('name',p.name_en,'qty',si.qty)) FILTER(WHERE p.id IS NOT NULL),'[]'::json) AS items FROM subscriptions s LEFT JOIN subscription_items si ON si.subscription_id=s.id LEFT JOIN products p ON p.id=si.product_id GROUP BY s.id ORDER BY s.created_at DESC LIMIT 150",
 requests:"SELECT id::text,request_type,contact_name,phone,address,event_date,guest_count,notes,status,created_at FROM bulk_requests ORDER BY created_at DESC LIMIT 150",
 kitchen:"SELECT id::text,title,description,category,store,affiliate_url,approx_price::text,active FROM kitchen_items ORDER BY id DESC LIMIT 150",
 campaigns:"SELECT id::text,name,channel,objective,status,budget::text,spend::text,start_date::text,end_date::text,landing_path,notes,created_at,updated_at FROM marketing_campaigns ORDER BY updated_at DESC,id DESC LIMIT 150",
 settings:"SELECT key,value FROM settings WHERE key IN ('min_order','free_delivery_min','free_delivery_radius_km','delivery_fee','delivery_pincodes','shop_hours','shop_phone') ORDER BY key"
};
const overviewQuery="SELECT (SELECT COUNT(*)::int FROM orders WHERE status='new') AS new_orders,"+
 " (SELECT COUNT(*)::int FROM orders WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date=(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS orders_today,"+
 " (SELECT COALESCE(SUM(total),0)::text FROM orders WHERE status!='cancelled' AND (created_at AT TIME ZONE 'Asia/Kolkata')::date=(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS sales_today,"+
 " (SELECT COUNT(*)::int FROM products WHERE active AND stock<=5) AS low_stock,"+
 " (SELECT COUNT(*)::int FROM order_alerts WHERE status!='sent') AS pending_alerts,"+
 " (SELECT COUNT(*)::int FROM marketing_campaigns WHERE status='active') AS active_campaigns";
const safeId=id=>{if(!ID.test(String(id||'')))throw c.bad('Invalid record ID.');return String(id);};
function date(value){
 if(value===''||value===null||value===undefined)return null;
 if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)||Number.isNaN(Date.parse(value))||
   new Date(value).toISOString().slice(0,10)!==value)throw c.bad('Enter a valid date.');
 return value;
}
function price(value,label){
 const v=Number(value);
 if(value===null||value===''||!Number.isFinite(v)||v<0||v>99999999||Math.abs(Math.round(v*100)-v*100)>0.000001)
  throw c.bad('Invalid '+label+'.');
 return v.toFixed(2);
}
async function change(b){
 const action=c.clean(b.action,40),id=action==='campaign-save'&&!b.id?null:safeId(b.id);
 if(action==='retry-alert'){
  const r=await c.db().query("SELECT 1 FROM order_alerts WHERE order_id=$1",[id]);
  if(!r.rowCount)throw c.bad('Notification record not found.','NOT_FOUND',404);
  return {id,notification:await alerts.dispatch(id)};
 }
 if(action==='campaign-save'){
  const name=c.required(b.name,120,'Campaign name'),channel=c.clean(b.channel,30),status=c.clean(b.status,20);
  if(!CAMPAIGN_CHANNELS.includes(channel)||!CAMPAIGN_STATES.includes(status))throw c.bad('Invalid campaign channel or status.');
  const start=date(b.start_date),end=date(b.end_date);
  if(start&&end&&end<start)throw c.bad('Campaign end must not precede start.');
  const path=c.clean(b.landing_path||'/',300);
  if(!path.startsWith('/')||path.startsWith('//')||/[\\\r\n]/.test(path))throw c.bad('Use a relative storefront landing path.');
  const values=[name,channel,c.clean(b.objective,160),status,price(b.budget,'budget'),price(b.spend,'spend'),start,end,path,c.clean(b.notes,800)];
  let result;
  if(id){
   result=await c.db().query("UPDATE marketing_campaigns SET name=$2,channel=$3,objective=$4,status=$5,budget=$6,spend=$7,start_date=$8,end_date=$9,landing_path=$10,notes=$11,updated_at=NOW() WHERE id=$1 RETURNING id::text",[id,...values]);
  }else{
   result=await c.db().query("INSERT INTO marketing_campaigns(name,channel,objective,status,budget,spend,start_date,end_date,landing_path,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text",values);
  }
  if(!result.rowCount)throw c.bad('Campaign not found.','NOT_FOUND',404);
  return {id:result.rows[0].id};
 }
 let query,params;
 if(action==='product'){
  const stock=Number(b.stock),amount=price(b.price,'price');
  if(!Number.isInteger(stock)||stock<0||stock>1000000||typeof b.active!=='boolean')
   throw c.bad('Invalid stock or active status.');
  if(b.active&&Number(amount)<=0)throw c.bad('Set a real selling price before activation.');
  query="UPDATE products SET price=$2,stock=$3,active=$4,updated_at=NOW() WHERE id=$1 RETURNING id::text";
  params=[id,amount,stock,b.active];
 }else if(action==='order-status'){
  if(!ORDER_STATES.includes(b.status))throw c.bad('Invalid order status.');
  query="UPDATE orders SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='subscription-status'){
  if(!PRODUCT_STATES.includes(b.status))throw c.bad('Invalid subscription status.');
  query="UPDATE subscriptions SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='request-status'){
  if(!REQUEST_STATES.includes(b.status))throw c.bad('Invalid enquiry status.');
  query="UPDATE bulk_requests SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='kitchen-status'){
  if(typeof b.active!=='boolean')throw c.bad('Invalid active status.');
  query="UPDATE kitchen_items SET active=$2 WHERE id=$1 RETURNING id::text";params=[id,b.active];
 }else throw c.bad('Invalid admin action.');
 const r=await c.db().query(query,params);
 if(!r.rowCount)throw c.bad('Record not found.','NOT_FOUND',404);
 return {id:r.rows[0].id};
}
module.exports=async(req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 if(!auth.authenticated(req))return c.respond(res,401,{ok:false,error:'Admin sign-in required.'});
 try{
  if(req.method==='GET'){
   const view=c.clean(req.query?.view,30)||'overview';
   if(!VIEWS.includes(view))throw c.bad('Invalid admin view.');
   const result=await c.db().query(view==='overview'?overviewQuery:pageQueries[view]);
   return c.respond(res,200,view==='overview'?{ok:true,view,summary:result.rows[0]}:{ok:true,view,rows:result.rows});
  }
  if(!guard.post(req,res))return;
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw c.bad('Invalid request body.');
  const result=await change(req.body);
  return c.respond(res,200,{ok:true,...result});
 }catch(error){return c.fail(res,error);}
};
