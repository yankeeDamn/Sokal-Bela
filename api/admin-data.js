'use strict';
const gate = require('../lib/server-auth');
const contact = require('../config/contact.mjs').default;
const storePhones = { phone: contact.phone, deliveryPhone: contact.phone, paymentPhone: contact.phone };
const STATUSES = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];
const PHASE1_UNITS = ['kg','g','piece','bunch','litre','ml','pack'];
function partnerUrl(value, store) {
  try {
    const u = new URL(String(value || ''));
    const host = store === 'amazon' ? 'amazon.in' : store === 'flipkart' ? 'flipkart.com' : '';
    return host && u.protocol === 'https:' && (u.hostname === host || u.hostname.endsWith('.' + host)) ? u.href : null;
  } catch { return null; }
}
function clean(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, clean(item)])
  );
  return value;
}
async function audit(db, admin, action, target) {
  await db.collection('adminAuditLog').add({
    actor: admin.uid, action, target: String(target || '').slice(0, 120),
    at: new Date(), email: admin.email || ''
  });
}
async function table(db, name) {
  const snap = await db.collection(name).limit(250).get();
  return snap.docs.map(doc => ({ id: doc.id, ...clean(doc.data()) }));
}
function toStatus(value) {
  const x = String(value || '').replace(/[_\s]/g, '').toLowerCase();
  return STATUSES.find(s => s.replace(/\s/g, '').toLowerCase() === x) || 'Pending';
}
function numeric(n) { const v = Number(n); return Number.isFinite(v) ? v : 0; }
module.exports = async function handler(req, res) {
  gate.setHeaders(res);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (!['GET', 'PATCH', 'POST', 'DELETE'].includes(req.method))
    return res.status(405).json({ error: 'Method not allowed' });
  if (req.method !== 'GET' && !gate.checkOrigin(req))
    return res.status(403).json({ error: 'Forbidden' });
  let admin;
  try { admin = await gate.requireActiveAdmin(req); }
  catch (err) {
    console.error('Admin authorization error:', err.message);
    return res.status(503).json({ error: 'Service unavailable' });
  }
  if (!admin) return res.status(403).json({ error: 'Forbidden' });
  const db = gate.firestore(), action = String(req.query?.action || 'overview');
  try {
    if (req.method === 'GET') {
      // Full catalogue export is available only after the existing server-side admin check.
      if (action === 'partner-catalog') return res.status(200).json({ products: require('../src/data/partnerProducts.js') });
      if (action !== 'overview') return res.status(404).json({ error: 'Not found' });
      const [users, orders, bulk, products, kitchenItems, payments, deliveries, logs, settings] = await Promise.all([
        table(db, 'users'), table(db, 'orders'), table(db, 'bulkOrders'),
        table(db, 'products'), table(db, 'kitchenItems'), table(db, 'payments'), table(db, 'deliveries'),
        db.collection('adminAuditLog').orderBy('at', 'desc').limit(25).get()
          .then(s => s.docs.map(d => ({ id:d.id, ...clean(d.data()) }))),
        db.collection('storeConfig').doc('main').get().then(d => d.exists ? clean(d.data()) : {})
      ]);
      const revenue = orders.filter(o => toStatus(o.orderStatus || o.status) !== 'Cancelled')
        .reduce((sum, o) => sum + numeric(o.total), 0);
      const kpis = {
        users: users.length, orders: orders.length, revenue,
        deliveries: orders.filter(o => ['Pending','Confirmed','Out for Delivery']
          .includes(toStatus(o.orderStatus || o.status))).length,
        emergency: orders.filter(o => o.emergency || o.isEmergency).length,
        bulk: bulk.length
      };

      // Comparisons cover the latest seven calendar days versus the preceding seven.
      // They reflect the retrieved sample; a truncated collection cannot give complete historical totals.
      const now = Date.now(), dayMs = 86400000;
      const dateValue = row => Date.parse(row.createdAt || row.timestamp || row.lastLoginAt || row.updatedAt || '') || 0;
      const current = list => list.filter(row => dateValue(row) > now - 7*dayMs && dateValue(row) <= now);
      const previous = list => list.filter(row => dateValue(row) > now - 14*dayMs && dateValue(row) <= now - 7*dayMs);
      const sumRevenue = list => list.filter(row => toStatus(row.orderStatus || row.status) !== 'Cancelled')
        .reduce((total,row) => total + numeric(row.total), 0);
      const pending = list => list.filter(row =>
        ['Pending','Confirmed','Out for Delivery'].includes(toStatus(row.orderStatus || row.status)));
      const emergency = list => list.filter(row => row.emergency || row.isEmergency);
      const changes = {
        users:[current(users).length,previous(users).length],
        orders:[current(orders).length,previous(orders).length],
        revenue:[sumRevenue(current(orders)),sumRevenue(previous(orders))],
        deliveries:[pending(current(orders)).length,pending(previous(orders)).length],
        emergency:[emergency(current(orders)).length,emergency(previous(orders)).length],
        bulk:[current(bulk).length,previous(bulk).length]
      };
      const trends = Object.fromEntries(Object.entries(changes).map(([key,[recent,prior]]) =>
        [key, prior > 0 ? Math.round((recent-prior)/prior*100) : null]));
      const days = Array.from({length:7}, (_, i) => {
        const date = new Date(); date.setUTCDate(date.getUTCDate() - 6 + i);
        const day = date.toISOString().slice(0,10);
        const subset = orders.filter(o => String(o.createdAt || o.timestamp || '').slice(0,10) === day);
        return { day, orders: subset.length,
          sales: subset.filter(o => toStatus(o.status || o.orderStatus) !== 'Cancelled')
            .reduce((sum,o)=>sum+numeric(o.total),0) };
      });
      return res.status(200).json({
        kpis, trends, days, status: Object.fromEntries(STATUSES.map(s =>
          [s,orders.filter(o => toStatus(o.orderStatus || o.status) === s).length])),
        tables: {users, orders, bulk, products, kitchenItems, payments, deliveries},
        logs, settings: { ...settings, ...storePhones }, truncated: [users,orders,bulk,products,kitchenItems,payments,deliveries]
          .some(list => list.length === 250)
      });
    }
    if (req.method === 'PATCH' && action === 'order') {
      const id = String(req.body?.id || '');
      const status = String(req.body?.status || '');
      const note = String(req.body?.note || '').trim().slice(0,1000);
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !STATUSES.includes(status))
        return res.status(400).json({ error: 'Invalid order or status' });
      const ref = db.collection('orders').doc(id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Order not found' });
      await ref.update({
        status: status === 'Out for Delivery' ? 'OutForDelivery' : status,
        orderStatus: status === 'Out for Delivery' ? 'OutForDelivery' : status,
        deliveryNotes: note, updatedAt: new Date()
      });
      await audit(db, admin, 'order.update', id);
      return res.status(200).json({ ok: true });
    }
    
    if (req.method === 'POST' && action === 'reset-perishable') {
      const snaps = await db.collection('products').where('perishable','==',true).limit(250).get();
      const batch = db.batch(); let count = 0;
      for (const doc of snaps.docs) {
        const p = doc.data(); const target = Number(p.dailyStockTarget);
        if (!Number.isInteger(target) || target < 0 || target > 100000) continue;
        batch.update(doc.ref, { stock: target, status: p.active === false ? 'inactive' : target ? 'active' : 'out_of_stock', updatedAt: new Date() });
        count++;
      }
      if (count) await batch.commit();
      await audit(db, admin, 'product.reset-daily-stock', String(count));
      return res.status(200).json({ok:true,count, capped:snaps.size === 250});
    }
    if (action === 'kitchen-item' && ['POST','PATCH','DELETE'].includes(req.method)) {
      const input = req.body || {}, id = String(input.id || '');
      if (req.method === 'DELETE') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return res.status(400).json({error:'Invalid item id'});
        await db.collection('kitchenItems').doc(id).delete();
        await audit(db,admin,'kitchen.delete',id);
        return res.status(200).json({ok:true});
      }
      const store = String(input.store || '').toLowerCase();
      const affiliateUrl = partnerUrl(input.affiliateUrl,store);
      const title = String(input.title || '').trim().slice(0,100);
      const description = String(input.description || '').trim().slice(0,400);
      const imageUrl = String(input.imageUrl || '').trim();
      const price = input.price === '' || input.price == null ? null : Number(input.price);
      const sortOrder = Number(input.sortOrder ?? 0);
      if (!title || !affiliateUrl || !['amazon','flipkart'].includes(store) || imageUrl.length > 1024 ||
          (imageUrl && !/^https:\/\//.test(imageUrl)) ||
          (price !== null && (!Number.isFinite(price) || price < 0)) ||
          !Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000)
        return res.status(400).json({error:'Enter title, valid Amazon/Flipkart HTTPS affiliate link, and optional approx. price.'});
      const saved = {title,description,store,affiliateUrl,imageUrl,
        emoji:String(input.emoji || '🍳').slice(0,8),price,
        category:String(input.category || 'Kitchen').slice(0,80),
        sortOrder,active:input.active !== false,updatedAt:new Date()};
      let ref;
      if (req.method === 'PATCH') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return res.status(400).json({error:'Invalid item id'});
        ref=db.collection('kitchenItems').doc(id);if(!(await ref.get()).exists)return res.status(404).json({error:'Item missing'});
        await ref.update(saved);
      } else {
        ref=db.collection('kitchenItems').doc();await ref.set({...saved,createdAt:new Date()});
      }
      await audit(db,admin,req.method === 'POST'?'kitchen.create':'kitchen.update',ref.id);
      return res.status(200).json({ok:true,id:ref.id});
    }
    if (action === 'product' && ['POST','PATCH','DELETE'].includes(req.method)) {
      const data = req.body || {};
      const id = String(data.id || '');
      if (req.method === 'DELETE') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
          return res.status(400).json({ error: 'Invalid product' });
        await db.collection('products').doc(id).delete();
        await audit(db, admin, 'product.delete', id);
        return res.status(200).json({ ok: true });
      }
      const name = String(data.name || '').trim().slice(0,100);
      const bengaliName = String(data.bengaliName || '').trim().slice(0,100);
      const price = numeric(data.price), stock = numeric(data.stock);
      const unit = String(data.unit || 'kg');
      const imageUrl = String(data.imageUrl || '').trim();
      if (!name || !bengaliName || price <= 0 || stock < 0 || stock > 100000 ||
          !PHASE1_UNITS.includes(unit) || imageUrl.length > 1024 ||
          (imageUrl && !/^https:\/\//.test(imageUrl) && !/^\/public\/images\/[a-z0-9-]+\.svg$/.test(imageUrl)))
        return res.status(400).json({ error: 'Check bilingual names, price, stock, unit and image URL.' });
      const saved = {
        name, bengaliName, nameEn:name, nameBn:bengaliName, price, stock, unit, imageUrl,
        description: String(data.description || '').trim().slice(0,500),
        category: String(data.category || 'Others').slice(0,80),
        active: data.active !== false, updatedAt: new Date(),
        perishable: data.perishable === true,
        brand: String(data.brand || '').slice(0,100),
        packSize: String(data.packSize || '').slice(0,50),
        fssaiNote: String(data.fssaiNote || '').slice(0,200),
        shelfLifeDays: data.shelfLifeDays === '' || data.shelfLifeDays == null ? null : Math.max(0,Math.min(365,Number(data.shelfLifeDays)||0)),
        dailyStockTarget: Math.max(0,Math.min(100000,Math.floor(Number(data.dailyStockTarget)||0))),
        status: data.active === false ? 'inactive' : stock > 0 ? 'active' : 'out_of_stock'
      };
      let ref;
      if (req.method === 'PATCH') {
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
          return res.status(400).json({ error: 'Invalid product' });
        ref = db.collection('products').doc(id);
        await ref.update(saved);
      } else {
        ref = db.collection('products').doc();
        await ref.set({ ...saved, id: ref.id, productId: ref.id,
          sellerId: admin.uid, createdAt: new Date() });
      }
      await audit(db, admin, req.method === 'PATCH' ? 'product.update' : 'product.create', ref.id);
      return res.status(200).json({ ok: true, id: ref.id });
    }
    if (req.method === 'PATCH' && action === 'settings') {
      const input = req.body || {};
      const settings = {
        ...storePhones,
        address: String(input.address || '').trim().slice(0,300),
        minOrder: Math.max(contact.minimumOrder, numeric(input.minOrder)),
        freeDeliveryAt: Math.max(contact.freeDeliveryAt, numeric(input.freeDeliveryAt)),
        freeDeliveryRadiusKm: contact.freeDeliveryRadiusKm, updatedAt: new Date()
      };
      await db.collection('storeConfig').doc('main').set(settings, { merge: true });
      await audit(db, admin, 'settings.update', 'main');
      return res.status(200).json({ ok: true });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Admin API failure:', err.message);
    return res.status(500).json({ error: 'Operation failed. Please retry.' });
  }
};
