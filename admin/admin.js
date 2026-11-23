'use strict';
/* Sokal Bela admin console. Talks only to /api/v2/auth and /api/v2/admin.
   Every action is re-checked on the server; hiding a button here is cosmetic. */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dt = v => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
const dOnly = v => v ? new Date(v + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const TONES = { new: 'amber', confirmed: 'blue', out_for_delivery: 'blue', delivered: 'green', cancelled: 'red', pending: 'amber', active: 'green', paused: 'grey', paid: 'green', unpaid: 'grey', failed: 'red', created: 'amber', expired: 'red', blocked: 'red', login_success: 'green', login_failed: 'red', login_blocked: 'red', signup: 'blue', logout: 'grey', password_changed: 'amber', admin_action: 'blue' };
const pretty = v => String(v).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const badge = v => '<span class="badge ' + (TONES[v] || 'grey') + '">' + esc(pretty(v)) + '</span>';
const FREQ = { daily: 'Daily', mon_sat: 'Mon–Sat', weekly: 'Weekly' };
const state = { view: 'overview', admin: null, counts: {}, page: {} };

async function api(action, { method = 'GET', query = {}, body } = {}) {
  const qs = new URLSearchParams({ action, ...query }).toString();
  let res;
  try {
    res = await fetch('/api/v2/manage?' + qs, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw Error('Cannot reach the server. Check your connection.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { showLogin(); throw Error('Please sign in again.'); }
  if (!res.ok) throw Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}
async function auth(action, body) {
  const res = await fetch('/api/v2/auth?action=' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(data.error || 'Request failed');
  return data;
}
let toastTimer;
function toast(msg, bad = false) { const t = $('toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 4500); }
async function act(action, body, ok = 'Saved') {
  try { await api(action, { method: 'POST', body }); toast(ok); await render(); } catch (e) { toast(e.message, true); }
}

/* ---------- shell ---------- */
const NAV = [['overview', '📊', 'Overview'], ['orders', '🧺', 'Orders'], ['deliveries', '🚚', 'Today’s deliveries'], ['passes', '🌅', 'Morning Passes'], ['products', '🥛', 'Products & prices'], ['customers', '👥', 'Customers'], ['payments', '💳', 'Payments'], ['logs', '🔐', 'Sign-in logs']];
function drawNav() {
  $('nav').innerHTML = NAV.map(([id, icon, name]) => '<button data-view="' + id + '"' + (state.view === id ? ' aria-current="page"' : '') + '><span>' + icon + '</span>' + name +
    (state.counts[id] ? '<span class="count">' + state.counts[id] + '</span>' : '') + '</button>').join('');
  $('title').textContent = (NAV.find(n => n[0] === state.view) || NAV[0])[2];
}
function showLogin() { $('app').hidden = true; $('login').hidden = false; }
function showApp() { $('login').hidden = true; $('app').hidden = false; $('who').textContent = state.admin.name + ' · ' + state.admin.phone; }
async function boot() {
  try {
    const r = await (await fetch('/api/v2/auth?action=me', { credentials: 'same-origin' })).json();
    if (r.user?.role === 'admin') { state.admin = r.user; showApp(); const h = location.hash.slice(1); if (NAV.some(n => n[0] === h)) state.view = h; return render(); }
    if (r.user) { $('login-error').textContent = 'This account is not an administrator.'; }
  } catch { $('login-error').textContent = 'Cannot reach the server.'; }
  showLogin();
}
async function render() {
  drawNav();
  const view = $('view');
  try { view.innerHTML = await VIEWS[state.view](); } catch (e) { if (!/sign in/i.test(e.message)) view.innerHTML = '<div class="panel"><p class="err">' + esc(e.message) + '</p></div>'; return; }
  bindView();
  api('overview').then(o => { state.counts = { orders: o.kpis.open_orders, passes: o.kpis.pending_passes, deliveries: o.kpis.due_today }; drawNav(); }).catch(() => {});
}

/* ---------- Overview ---------- */
function salesChart(series) {
  const W = 640, H = 220, L = 46, B = 28, T = 10, n = series.length;
  const max = Math.max(1, ...series.map(d => d.sales)), nice = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / nice * 2) / 2 * nice || 1;
  const step = (W - L) / n, bw = Math.min(24, step - 8);
  const y = v => T + (H - T - B) * (1 - v / top);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = top * i / 4; g += '<line class="grid-line" x1="' + L + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)) + '</text>'; }
  const bars = series.map((d, i) => {
    const x = L + i * step + (step - bw) / 2, h = Math.max(d.sales > 0 ? 3 : 0, (H - T - B) * d.sales / top), yy = H - B - h, r = Math.min(4, h);
    const lbl = new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return '<g class="col" data-tip="' + esc(lbl + ' · ' + inr(d.sales) + ' · ' + d.orders + ' order' + (d.orders === 1 ? '' : 's')) + '" tabindex="0" role="img" aria-label="' + esc(lbl + ': ' + inr(d.sales) + ', ' + d.orders + ' orders') + '">' +
      '<rect class="bar-hit" x="' + (L + i * step) + '" y="' + T + '" width="' + step + '" height="' + (H - T - B) + '" fill="transparent"/>' +
      (h > 0 ? '<path class="bar-rect" d="M' + x + ' ' + (H - B) + 'V' + (yy + r) + 'Q' + x + ' ' + yy + ' ' + (x + r) + ' ' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + yy + ' ' + (x + bw) + ' ' + (yy + r) + 'V' + (H - B) + 'Z"/>' : '') +
      (i % 2 === 0 || n < 8 ? '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lbl) + '</text>' : '') + '</g>';
  }).join('');
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Daily sales, last 14 days">' + g + '<line class="axis" x1="' + L + '" x2="' + W + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>' + bars + '</svg>';
}
function salesTable(series) {
  return '<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th class="num">Orders</th><th class="num">Sales</th></tr></thead><tbody>' +
    series.map(d => '<tr><td>' + dOnly(d.day) + '</td><td class="num">' + d.orders + '</td><td class="num">' + inr(d.sales) + '</td></tr>').join('') + '</tbody></table></div>';
}
const VIEWS = {};
VIEWS.overview = async () => {
  const o = await api('overview'), k = o.kpis;
  const total = o.statusBreakdown.reduce((s, x) => s + x.n, 0) || 1;
  const week = o.series.slice(-7).reduce((s, d) => s + d.sales, 0);
  const kpi = (l, v, s) => '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>';
  return '<div class="kpis">' +
    kpi('Orders today', k.orders_today, 'Sales ' + inr(k.sales_today)) +
    kpi('Open orders', k.open_orders, 'New, confirmed or on the way') +
    kpi('Sales · 30 days', inr(k.sales_30d), k.online_paid_30d + ' paid online') +
    kpi('Deliveries today', k.due_today, 'Morning Pass runs') +
    kpi('Active passes', k.active_passes, k.pending_passes + ' awaiting approval') +
    kpi('Customers', k.customers, '+' + k.new_customers_7d + ' this week') +
    kpi('Failed sign-ins · 24h', k.failed_logins_24h, k.failed_logins_24h > 10 ? 'Unusually high' : 'Normal') + '</div>' +
    '<div class="grid2"><section class="panel"><div class="panel-head"><div><h2>Daily sales</h2><p class="sub">Last 14 days · ' + inr(week) + ' in the past 7 days</p></div>' +
    '<div class="seg" role="group" aria-label="View"><button data-chartview="chart" aria-pressed="true">Chart</button><button data-chartview="table" aria-pressed="false">Table</button></div></div>' +
    '<div class="chart" id="chart">' + salesChart(o.series) + '<div class="tip" hidden></div></div><div id="chart-table" hidden>' + salesTable(o.series) + '</div></section>' +
    '<section class="panel"><h2>Orders by status</h2><p class="sub">All time</p><div class="bars">' + (o.statusBreakdown.length ? o.statusBreakdown.map(s => '<div class="row"><span>' + badge(s.status) + '</span><div class="track"><div class="fill" style="width:' + Math.round(s.n / total * 100) + '%"></div></div><strong>' + s.n + '</strong></div>').join('') : '<p class="empty">No orders yet.</p>') + '</div>' +
    (o.payments30d.length ? '<h2 style="margin-top:18px">Online payments · 30 days</h2><div class="bars">' + o.payments30d.map(s => '<div class="row"><span>' + badge(s.status) + '</span><div class="track"><div class="fill" style="width:' + Math.round(s.n / Math.max(1, o.payments30d.reduce((a, b) => a + b.n, 0)) * 100) + '%"></div></div><strong>' + s.n + '</strong></div>').join('') + '</div>' : '') + '</section></div>' +
    '<div class="grid3"><section class="panel"><h2>Recent orders</h2><p class="sub"><button class="linkbtn" data-view="orders">View all →</button></p><ul class="list">' +
    (o.recentOrders.map(r => '<li><div><strong>' + esc(r.order_no) + '</strong><small>' + esc(r.customer_name) + ' · ' + dt(r.created_at) + '</small></div><div style="text-align:right">' + inr(r.total) + '<small>' + badge(r.status) + '</small></div></li>').join('') || '<li class="empty">No orders yet.</li>') + '</ul></section>' +
    '<section class="panel"><h2>Low stock</h2><p class="sub">Active products with 5 or fewer left</p><ul class="list">' +
    (o.lowStock.map(r => '<li><div>' + esc(r.name_en) + '<small>' + esc(r.kind) + '</small></div><strong>' + r.stock + ' left</strong></li>').join('') || '<li class="empty">Everything is stocked.</li>') + '</ul></section>' +
    '<section class="panel"><h2>Recent sign-ins</h2><p class="sub"><button class="linkbtn" data-view="logs">All logs →</button></p><ul class="list">' +
    (o.recentAuth.map(r => '<li><div>' + esc(r.name || r.phone || 'Unknown') + '<small>' + dt(r.created_at) + '</small></div>' + badge(r.event) + '</li>').join('') || '<li class="empty">No activity yet.</li>') + '</ul></section></div>';
};

/* ---------- Orders ---------- */
const ORDER_STATUSES = ['new', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
const filt = (name, extra = {}) => ({ ...(state.page[name] || {}), ...extra });
VIEWS.orders = async () => {
  const f = filt('orders'), off = f.offset || 0;
  const r = await api('orders', { query: { status: f.status || '', payment: f.payment || '', q: f.q || '', offset: off } });
  const opt = (arr, cur) => arr.map(v => '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + pretty(v) + '</option>').join('');
  return '<div class="toolbar"><input id="f-q" placeholder="Search order, phone, name" value="' + esc(f.q || '') + '"><select id="f-status"><option value="">All statuses</option>' + opt(ORDER_STATUSES, f.status) + '</select>' +
    '<select id="f-payment"><option value="">Any payment</option>' + opt(['unpaid', 'pending', 'paid', 'failed'], f.payment) + '</select><button class="btn" data-apply="orders">Filter</button><span class="sub">' + r.total + ' orders</span></div>' +
    '<section class="panel scroll">' + (r.orders.length ? '<table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>' +
      r.orders.map(o => '<tr><td><strong>' + esc(o.order_no) + '</strong><small>' + dt(o.created_at) + '</small><small>' + esc(o.delivery_slot) + '</small></td>' +
        '<td>' + esc(o.customer_name) + '<small><a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a></small><small>' + esc(o.address) + ', ' + esc(o.pincode) + '</small>' + (o.notes ? '<small>📝 ' + esc(o.notes) + '</small>' : '') + '</td>' +
        '<td>' + o.items.map(i => esc(i.name) + ' × ' + i.qty).join('<br>') + '</td><td class="num"><strong>' + inr(o.total) + '</strong>' + (Number(o.delivery_fee) ? '<small>incl. ' + inr(o.delivery_fee) + ' delivery</small>' : '') + '</td>' +
        '<td>' + badge(o.payment_status) + '<small>' + (o.payment_method === 'online' ? 'Online · Cashfree' : 'Cash / UPI') + '</small>' +
        (o.payment_method === 'cod' && o.status !== 'cancelled' ? '<div class="row" style="margin-top:6px"><button class="btn small" data-act="order-payment" data-id="' + o.id + '" data-pay="' + (o.payment_status === 'paid' ? 'unpaid' : 'paid') + '">' + (o.payment_status === 'paid' ? 'Mark unpaid' : 'Mark paid') + '</button></div>' : '') + '</td>' +
        '<td><select data-order-status="' + o.id + '" aria-label="Order status">' + opt(ORDER_STATUSES, o.status) + '</select></td></tr>').join('') + '</tbody></table>' : '<p class="empty">No orders match.</p>') + '</section>' + pager('orders', off, r.orders.length);
};
function pager(name, off, n) { return '<div class="pager">' + (off > 0 ? '<button class="btn" data-page="' + name + '" data-off="' + Math.max(0, off - 50) + '">← Newer</button>' : '') + (n === 50 ? '<button class="btn" data-page="' + name + '" data-off="' + (off + 50) + '">Older →</button>' : '') + '</div>'; }

/* ---------- Passes & deliveries ---------- */
const itemsHtml = items => items.map(i => '<li>' + esc(i.name) + (i.pack ? ' · ' + esc(i.pack) : '') + ' × ' + i.qty + ' <small>(' + (Number(i.price) > 0 ? inr(i.price) : 'no price') + ')</small></li>').join('');
VIEWS.passes = async () => {
  const f = filt('passes');
  const r = await api('subscriptions', { query: { status: f.status || '', offset: f.offset || 0 } });
  const tabs = ['', 'pending', 'active', 'paused', 'cancelled'];
  return '<div class="toolbar"><div class="seg">' + tabs.map(t => '<button data-passfilter="' + t + '" aria-pressed="' + ((f.status || '') === t) + '">' + (t ? pretty(t) : 'All') + '</button>').join('') + '</div></div>' +
    (r.subscriptions.length ? '<div class="cards">' + r.subscriptions.map(s => '<article class="card"><header><div><strong>' + esc(s.sub_code) + '</strong><small style="display:block;color:var(--muted)">' + dt(s.created_at) + '</small></div>' + badge(s.status) + '</header>' +
      '<p style="margin:8px 0 0"><strong>' + esc(s.customer_name) + '</strong> · <a href="tel:' + esc(s.phone) + '">' + esc(s.phone) + '</a><br><small style="color:var(--muted)">' + esc(s.address) + ', ' + esc(s.pincode) + '</small></p>' +
      '<ul class="items">' + itemsHtml(s.items) + '</ul><p style="margin:0;color:var(--ink2)">' + FREQ[s.frequency] + ' · ' + esc(s.slot.replace('-', '–')) + ' · from ' + dOnly(s.start_date) + (s.paused_until ? ' · paused to ' + dOnly(s.paused_until) : '') + '<br>' + (s.paid_until ? 'Paid until ' + dOnly(s.paid_until) : 'Not prepaid') + '</p>' + (s.notes ? '<p style="margin:6px 0 0">📝 ' + esc(s.notes) + '</p>' : '') +
      '<div class="acts">' + (s.status === 'pending' ? '<button class="btn small primary" data-sub="' + s.id + '" data-to="active">Approve</button>' : '') +
      (s.status === 'active' ? '<button class="btn small" data-subpause="' + s.id + '">Pause…</button>' : '') + (s.status === 'paused' ? '<button class="btn small" data-sub="' + s.id + '" data-to="active">Resume</button>' : '') +
      (s.status !== 'cancelled' ? '<button class="btn small danger" data-sub="' + s.id + '" data-to="cancelled" data-confirm="Cancel pass ' + esc(s.sub_code) + '?">Cancel</button>' : '') + '</div></article>').join('') + '</div>' : '<p class="empty">No passes here.</p>');
};
VIEWS.deliveries = async () => {
  const r = await api('deliveries');
  const bySlot = {};
  r.deliveries.forEach(d => (bySlot[d.slot] ||= []).push(d));
  const done = r.deliveries.filter(d => d.delivered).length;
  return '<p class="sub">' + dOnly(r.date) + ' · ' + done + ' of ' + r.deliveries.length + ' delivered</p>' +
    (r.deliveries.length ? Object.keys(bySlot).sort().map(slot => '<section class="panel"><h2>' + esc(slot.replace('-', '–')) + '</h2><div class="scroll"><table class="tbl"><thead><tr><th>Done</th><th>Customer</th><th>Items</th><th class="num">Amount</th><th>Billing</th></tr></thead><tbody>' +
      bySlot[slot].map(d => '<tr><td><label class="check"><input type="checkbox" data-deliver="' + d.id + '"' + (d.delivered ? ' checked' : '') + ' aria-label="Delivered"></label></td>' +
        '<td><strong>' + esc(d.customer_name) + '</strong><small><a href="tel:' + esc(d.phone) + '">' + esc(d.phone) + '</a></small><small>' + esc(d.address) + ', ' + esc(d.pincode) + '</small>' + (d.notes ? '<small>📝 ' + esc(d.notes) + '</small>' : '') + '</td>' +
        '<td><ul class="items" style="margin:0;padding:0;list-style:none">' + itemsHtml(d.items) + '</ul></td><td class="num">' + inr(d.per_delivery) + '</td><td>' + (d.paid ? badge('paid') : '<span class="badge amber">Collect on delivery</span>') + '</td></tr>').join('') + '</tbody></table></div></section>').join('') : '<div class="panel"><p class="empty">No Morning Pass deliveries are due today.</p></div>');
};

/* ---------- Products ---------- */
VIEWS.products = async () => {
  const f = filt('products'), kind = f.kind || 'vegetable';
  const r = await api('products', { query: { kind } });
  const kinds = [['vegetable', 'Vegetables'], ['dairy', 'Milk, ghee & dairy'], ['newspaper', 'Newspapers']];
  const units = ['kg', 'g', 'piece', 'bunch', 'litre', 'ml', 'pack'];
  return '<div class="toolbar"><div class="seg">' + kinds.map(([k, n]) => '<button data-kind="' + k + '" aria-pressed="' + (kind === k) + '">' + n + '</button>').join('') + '</div><span class="sub">Set a price above ₹0 to switch a product on. Customers only see active products.</span></div>' +
    '<section class="panel scroll"><table class="tbl"><thead><tr><th>Product</th><th>Price (₹)</th><th>Stock</th><th>Active</th><th></th></tr></thead><tbody>' +
    (r.products.map(p => '<tr data-prow="' + p.id + '"><td>' + esc(p.emoji) + ' <strong>' + esc(p.name_en) + '</strong> <span lang="bn">' + esc(p.name_bn) + '</span><small>' + esc(p.category) + ' · per ' + esc(p.pack_size || p.unit) + '</small></td>' +
      '<td><input class="inl" type="number" min="0" step="0.5" value="' + esc(p.price) + '" data-f="price" aria-label="Price"></td><td><input class="inl sm" type="number" min="0" step="1" value="' + p.stock + '" data-f="stock" aria-label="Stock"></td>' +
      '<td><label class="check"><input type="checkbox" data-f="active"' + (p.active ? ' checked' : '') + '> ' + (p.active ? 'On' : 'Off') + '</label></td><td><button class="btn small primary" data-save="' + p.id + '">Save</button></td></tr>').join('') || '<tr><td colspan="5" class="empty">No products.</td></tr>') + '</tbody></table></section>' +
    '<section class="panel"><h2>Add a product</h2><p class="sub">e.g. Ghee 500 g, a new newspaper or a seasonal vegetable</p><form id="new-product" class="form-row"><input type="hidden" name="kind" value="' + kind + '">' +
    '<label>Name (English)<input name="name_en" required maxlength="120"></label><label>Name (Bengali)<input name="name_bn" maxlength="120"></label><label>Category<input name="category" maxlength="80" placeholder="Milk, Roots…"></label>' +
    '<label>Unit<select name="unit">' + units.map(u => '<option' + (u === (kind === 'newspaper' ? 'piece' : kind === 'dairy' ? 'pack' : 'kg') ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></label><label>Pack size<input name="pack_size" maxlength="40" placeholder="500 g"></label>' +
    '<label>Price (₹)<input name="price" type="number" min="0" step="0.5" required></label><label>Stock<input name="stock" type="number" min="0" value="' + (kind === 'newspaper' ? 9999 : 0) + '"></label><label>Emoji<input name="emoji" maxlength="8" placeholder="🥛"></label>' +
    '<label class="check"><input type="checkbox" name="active"> Active now</label><button class="btn primary" type="submit">Add product</button></form></section>';
};

/* ---------- Customers, payments, logs ---------- */
VIEWS.customers = async () => {
  const f = filt('customers'), r = await api('users', { query: { q: f.q || '', offset: f.offset || 0 } });
  return '<div class="toolbar"><input id="f-q" placeholder="Search name or phone" value="' + esc(f.q || '') + '"><button class="btn" data-apply="customers">Search</button></div><section class="panel scroll"><table class="tbl"><thead><tr><th>Customer</th><th>Joined</th><th>Last sign-in</th><th class="num">Orders</th><th class="num">Passes</th><th>Status</th><th></th></tr></thead><tbody>' +
    (r.users.map(u => '<tr><td><strong>' + esc(u.name) + '</strong> ' + (u.role === 'admin' ? '<span class="badge blue">Admin</span>' : '') + '<small><a href="tel:' + esc(u.phone) + '">' + esc(u.phone) + '</a>' + (u.email ? ' · ' + esc(u.email) : '') + '</small></td><td>' + dt(u.created_at) + '</td><td>' + dt(u.last_login_at) + '</td><td class="num">' + u.orders + '</td><td class="num">' + u.passes + '</td><td>' + badge(u.status) + '</td><td>' +
      (u.role === 'customer' ? '<button class="btn small' + (u.status === 'active' ? ' danger' : '') + '" data-user="' + u.id + '" data-to="' + (u.status === 'active' ? 'blocked' : 'active') + '">' + (u.status === 'active' ? 'Block' : 'Unblock') + '</button>' : '') + '</td></tr>').join('') || '<tr><td colspan="7" class="empty">No customers yet.</td></tr>') + '</tbody></table></section>' + pager('customers', f.offset || 0, r.users.length);
};
VIEWS.payments = async () => {
  const r = await api('payments', { query: { offset: filt('payments').offset || 0 } });
  return '<section class="panel scroll"><table class="tbl"><thead><tr><th>Reference</th><th>For</th><th>Customer</th><th class="num">Amount</th><th>Status</th><th>Created</th><th>Paid</th></tr></thead><tbody>' +
    (r.payments.map(p => '<tr><td><small style="color:var(--ink)">' + esc(p.payment_ref) + '</small>' + (p.cf_payment_id ? '<small>Cashfree #' + esc(p.cf_payment_id) + '</small>' : '') + '</td><td>' + esc(p.order_no || p.sub_code) + (p.covers_until ? '<small>covers to ' + dOnly(p.covers_until) + '</small>' : '') + '</td><td>' + esc(p.customer || '—') + '</td><td class="num">' + inr(p.amount) + '</td><td>' + badge(p.status) + '</td><td>' + dt(p.created_at) + '</td><td>' + dt(p.paid_at) + '</td></tr>').join('') || '<tr><td colspan="7" class="empty">No online payments yet.</td></tr>') + '</tbody></table></section>' + pager('payments', filt('payments').offset || 0, r.payments.length);
};
VIEWS.logs = async () => {
  const f = filt('logs'), r = await api('logs', { query: { event: f.event || '', q: f.q || '', offset: f.offset || 0 } });
  const ev = ['signup', 'login_success', 'login_failed', 'login_blocked', 'logout', 'password_changed', 'admin_action'];
  return '<div class="toolbar"><input id="f-q" placeholder="Search phone" value="' + esc(f.q || '') + '"><select id="f-event"><option value="">All events</option>' + ev.map(e => '<option value="' + e + '"' + (f.event === e ? ' selected' : '') + '>' + pretty(e) + '</option>').join('') + '</select><button class="btn" data-apply="logs">Filter</button></div>' +
    '<section class="panel scroll"><table class="tbl"><thead><tr><th>When</th><th>Event</th><th>Who</th><th>Detail</th><th>Device</th></tr></thead><tbody>' +
    (r.logs.map(l => '<tr><td>' + dt(l.created_at) + '</td><td>' + badge(l.event) + '</td><td>' + esc(l.name || '—') + '<small>' + esc(l.phone) + '</small></td><td>' + esc(l.detail) + '</td><td><small>' + esc(l.user_agent.slice(0, 60)) + '</small><small>ref ' + esc(l.ip_ref) + '</small></td></tr>').join('') || '<tr><td colspan="5" class="empty">No events.</td></tr>') + '</tbody></table></section>' + pager('logs', f.offset || 0, r.logs.length);
};

/* ---------- events ---------- */
function bindView() {
  const chart = $('chart');
  if (chart) {
    const tip = chart.querySelector('.tip');
    const show = g => { const r = g.getBoundingClientRect(), c = chart.getBoundingClientRect(); tip.textContent = g.dataset.tip; tip.style.left = (r.left + r.width / 2 - c.left) + 'px'; tip.style.top = (r.top - c.top + 20) + 'px'; tip.hidden = false; };
    chart.querySelectorAll('.col').forEach(g => { g.addEventListener('mouseenter', () => show(g)); g.addEventListener('focus', () => show(g)); g.addEventListener('mouseleave', () => tip.hidden = true); g.addEventListener('blur', () => tip.hidden = true); });
  }
}
document.addEventListener('click', async e => {
  const t = e.target;
  const nav = t.closest('[data-view]'); if (nav) { state.view = nav.dataset.view; location.hash = state.view; $('side').classList.remove('open'); return render(); }
  if (t.closest('#menu')) return $('side').classList.toggle('open');
  if (t.closest('#refresh')) return render();
  if (t.closest('#logout')) { try { await auth('logout'); } catch { /* ignore */ } state.admin = null; return showLogin(); }
  const cv = t.closest('[data-chartview]');
  if (cv) { const tbl = cv.dataset.chartview === 'table'; $('chart').hidden = tbl; $('chart-table').hidden = !tbl; cv.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === cv))); return; }
  const ap = t.closest('[data-apply]');
  if (ap) { const v = ap.dataset.apply; state.page[v] = { q: $('f-q')?.value.trim(), status: $('f-status')?.value, payment: $('f-payment')?.value, event: $('f-event')?.value }; return render(); }
  const pg = t.closest('[data-page]'); if (pg) { state.page[pg.dataset.page] = filt(pg.dataset.page, { offset: Number(pg.dataset.off) }); return render(); }
  const pf = t.closest('[data-passfilter]'); if (pf) { state.page.passes = { status: pf.dataset.passfilter }; return render(); }
  const kd = t.closest('[data-kind]'); if (kd) { state.page.products = { kind: kd.dataset.kind }; return render(); }
  const op = t.closest('[data-act="order-payment"]'); if (op) return act('order-payment', { id: op.dataset.id, paymentStatus: op.dataset.pay }, 'Payment updated');
  const sub = t.closest('[data-sub]');
  if (sub) { if (sub.dataset.confirm && !confirm(sub.dataset.confirm)) return; return act('subscription-status', { id: sub.dataset.sub, status: sub.dataset.to }, 'Pass updated'); }
  const sp = t.closest('[data-subpause]');
  if (sp) { const until = prompt('Pause until which date? (YYYY-MM-DD)'); if (until) return act('subscription-status', { id: sp.dataset.subpause, status: 'paused', pausedUntil: until.trim() }, 'Pass paused'); return; }
  const us = t.closest('[data-user]'); if (us) { if (us.dataset.to === 'blocked' && !confirm('Block this customer? They will be signed out.')) return; return act('user-status', { id: us.dataset.user, status: us.dataset.to }, 'Customer updated'); }
  const sv = t.closest('[data-save]');
  if (sv) {
    const row = document.querySelector('[data-prow="' + sv.dataset.save + '"]'), q = f => row.querySelector('[data-f="' + f + '"]');
    return act('product-save', { id: sv.dataset.save, price: q('price').value, stock: q('stock').value, active: q('active').checked }, 'Product saved');
  }
});
document.addEventListener('change', e => {
  const os = e.target.closest('[data-order-status]');
  if (os) { if (os.value === 'cancelled' && !confirm('Cancel this order? Reserved stock will be returned.')) return render(); act('order-status', { id: os.dataset.orderStatus, status: os.value }, 'Order updated'); }
  const dv = e.target.closest('[data-deliver]'); if (dv) act('deliver', { id: dv.dataset.deliver, delivered: dv.checked }, dv.checked ? 'Marked delivered' : 'Delivery unmarked');
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'login-form') {
    e.preventDefault(); const f = e.target, err = $('login-error'); err.textContent = '';
    try {
      const r = await auth('login', Object.fromEntries(new FormData(f)));
      if (r.user.role !== 'admin') { await auth('logout'); err.textContent = 'This account is not an administrator.'; return; }
      state.admin = r.user; showApp(); render();
    } catch (x) { err.textContent = x.message; }
  }
  if (e.target.id === 'new-product') {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); v.active = e.target.elements.active.checked;
    act('product-create', v, 'Product added');
  }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') $('side').classList.remove('open'); });
boot();
