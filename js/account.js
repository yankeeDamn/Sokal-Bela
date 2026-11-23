'use strict';
/* Customer accounts, Morning Pass builder, newspapers and Cashfree return handling.
   Loaded after /phase2-preview/app.js and uses its globals: $, api, flash, go,
   escapeHtml, money, shop. Never put secrets in this file. */
const PASS_KEY = 'sokal-bela-pass-draft-v1';
const SLOTS = [['06:00-08:00', '6–8 AM'], ['07:00-09:00', '7–9 AM'], ['08:00-10:00', '8–10 AM']];
const FREQS = [['daily', 'Every day · প্রতিদিন'], ['mon_sat', 'Monday–Saturday'], ['weekly', 'Once a week']];
const acct = { user: null, online: false, mode: 'sandbox', dairy: [], papers: [], draft: [], tab: 'orders', authMode: 'login', loaded: false };
const esc = s => escapeHtml(s);
const istDate = (offset = 0) => {
  const d = new Date(Date.now() + offset * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};
const dayDiff = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wday = iso => new Date(iso + 'T00:00:00Z').getUTCDay();
function dueOnClient(freq, start, iso) {
  if (iso < start) return false;
  if (freq === 'daily') return true;
  if (freq === 'mon_sat') return wday(iso) !== 0;
  return wday(iso) === wday(start);
}
function countClient(freq, start, from, to) { let n = 0; for (let d = from; d <= to; d = dayDiff(d, 1)) if (dueOnClient(freq, start, d)) n++; return n; }
const label = (map, key) => (map.find(x => x[0] === key) || [key, key])[1];
const fmtDate = iso => iso ? new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const fmtTime = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const badge = (text, tone) => '<span class="badge ' + tone + '">' + esc(text) + '</span>';
const statusTone = { new: 'amber', confirmed: 'blue', out_for_delivery: 'blue', delivered: 'green', cancelled: 'red', pending: 'amber', active: 'green', paused: 'grey', paid: 'green', unpaid: 'grey', failed: 'red' };
const statusText = { out_for_delivery: 'Out for delivery', mon_sat: 'Mon–Sat' };
const stat = v => badge(statusText[v] || v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '), statusTone[v] || 'grey');

/* ---------- Cashfree ---------- */
function loadCashfree() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.onload = resolve;
    s.onerror = () => reject(Error('Could not load the payment window. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}
async function launchCashfree(payment) {
  await loadCashfree();
  const cf = window.Cashfree({ mode: payment.mode === 'production' ? 'production' : 'sandbox' });
  cf.checkout({ paymentSessionId: payment.sessionId, redirectTarget: '_self' });
}
function onPaymentError() {
  $('success-note').textContent = 'Your order is saved, but online payment could not start. Open My Account → Orders and tap “Pay now”, or pay cash on delivery.';
}
async function startOrderPayment(orderNo, phone, button) {
  button.disabled = true;
  try {
    const r = await api('/payments?action=order', { method: 'POST', body: JSON.stringify({ orderNo, phone, website: '' }) });
    if (r.alreadyPaid) { flash('This order is already paid.'); return renderAccount(); }
    await launchCashfree(r);
  } catch (e) { flash(e.message, true); button.disabled = false; }
}
async function startPassPayment(code, button) {
  button.disabled = true;
  try {
    const r = await api('/payments?action=subscription', { method: 'POST', body: JSON.stringify({ subscriptionCode: code }) });
    await launchCashfree(r);
  } catch (e) { flash(e.message, true); button.disabled = false; }
}
async function handlePaymentReturn() {
  const ref = new URLSearchParams(location.search).get('pay');
  if (!ref || !/^[A-Za-z0-9_-]{8,45}$/.test(ref)) return;
  history.replaceState(null, '', location.pathname);
  const box = $('pay-result');
  box.innerHTML = '<div class="huge">⏳</div><h1>Confirming your payment…</h1><p>Please wait a moment. Do not close this page.</p>';
  go('pay-result');
  let result = null;
  for (let i = 0; i < 4; i++) {
    try { result = await api('/payments?action=verify&ref=' + encodeURIComponent(ref)); } catch (e) { result = { error: e.message }; }
    if (result.status === 'paid' || result.status === 'expired') break;
    await new Promise(r => setTimeout(r, 2500));
  }
  const what = result?.orderNo ? 'order <strong>' + esc(result.orderNo) + '</strong>' : result?.subscriptionCode ? 'Morning Pass <strong>' + esc(result.subscriptionCode) + '</strong>' : 'your payment';
  if (result?.status === 'paid') {
    box.innerHTML = '<div class="huge">✅</div><h1>Payment received</h1><p>Thank you! We have received your payment for ' + what + '.</p>' +
      '<div class="hero-actions"><button class="button primary" data-go="account">View my account</button><button class="button outline" data-go="vegetables">Keep shopping</button></div>';
    if (acct.user) { acct.tab = result.subscriptionCode ? 'passes' : 'orders'; }
  } else if (result?.status === 'expired') {
    box.innerHTML = '<div class="huge">⚠️</div><h1>Payment not completed</h1><p>The payment for ' + what + ' did not go through. No money is taken for a failed payment. You can try again from My Account, or choose cash on delivery.</p>' +
      '<div class="hero-actions"><button class="button primary" data-go="account">Go to my account</button></div>';
  } else {
    box.innerHTML = '<div class="huge">🕒</div><h1>Payment still processing</h1><p>We have not received confirmation for ' + what + ' yet. If money was deducted, it will be confirmed automatically in a few minutes.</p>' +
      '<div class="hero-actions"><button class="button primary" id="recheck-pay" type="button">Check again</button><button class="button outline" data-go="account">My account</button></div>';
    $('recheck-pay').onclick = () => { history.replaceState(null, '', '/?pay=' + encodeURIComponent(ref)); handlePaymentReturn(); };
  }
}

/* ---------- Session ---------- */
function setUser(user) {
  acct.user = user || null;
  $('account-label').textContent = user ? user.name.split(' ')[0].slice(0, 12) : 'Sign in';
}
async function loadMe() {
  try { setUser((await api('/auth?action=me')).user); } catch { setUser(null); }
}

/* ---------- Morning Pass draft ---------- */
function loadDraft() { try { acct.draft = JSON.parse(localStorage.getItem(PASS_KEY) || '[]').filter(x => /^[1-9][0-9]{0,14}$/.test(String(x?.id))).map(x => ({ id: String(x.id), qty: Math.max(1, Math.min(50, Math.floor(Number(x.qty) || 1))) })); } catch { acct.draft = []; } }
function saveDraft() { try { localStorage.setItem(PASS_KEY, JSON.stringify(acct.draft)); } catch { /* storage may be blocked */ } renderDraftSummary(); }
const passProduct = id => [...acct.dairy, ...acct.papers].find(p => String(p.id) === String(id));
function addToPass(id, qty = 1) {
  const p = passProduct(id);
  if (!p) return flash('That product is not available right now.', true);
  const line = acct.draft.find(x => x.id === String(id));
  if (line) line.qty = Math.min(50, line.qty + qty); else acct.draft.push({ id: String(id), qty });
  saveDraft();
  flash(p.name_en + ' added to your Morning Pass');
}
function draftTotals() {
  const lines = acct.draft.map(l => ({ ...l, p: passProduct(l.id) })).filter(l => l.p);
  const perDelivery = lines.reduce((s, l) => s + Math.round(Number(l.p.price) * 100) * l.qty, 0) / 100;
  return { lines, perDelivery };
}
function renderDraftSummary() {
  const el = $('pass-draft-summary'); if (!el) return;
  const { lines, perDelivery } = draftTotals();
  el.textContent = lines.length ? lines.length + ' item(s) · ' + money(perDelivery) + ' per delivery' : 'Your pass is empty.';
}
async function loadPassCatalog() {
  try { acct.dairy = (await api('/products?kind=dairy')).products || []; } catch { acct.dairy = []; }
  try { acct.papers = (await api('/products?kind=newspaper')).products || []; } catch { acct.papers = []; }
  renderPapers(); renderDraftSummary();
  // Existing dairy cards were rendered before this module loaded; add the pass buttons.
  if (typeof renderDairy === 'function') renderDairy();
}
function renderPapers() {
  const el = $('newspaper-grid'); if (!el) return;
  el.innerHTML = acct.papers.length ? acct.papers.map(p =>
    '<article class="product"><div class="visual"><span class="emoji">' + esc(p.emoji || '📰') + '</span></div>' +
    '<div class="info"><h3>' + esc(p.name_en) + ' <span lang="bn">' + esc(p.name_bn) + '</span></h3><p>' + esc(p.category) + '</p>' +
    '<div class="price">' + money(p.price) + ' / copy</div><p class="small">≈ ' + money(Number(p.price) * 30) + ' for 30 days</p></div>' +
    '<div class="actions"><button type="button" class="button primary" data-pass-add="' + p.id + '">Add to Morning Pass</button></div></article>'
  ).join('') : '<p>Newspaper delivery opens soon. The shop is setting up copy prices.</p>';
}

/* ---------- Screens ---------- */
function authForm() {
  const login = acct.authMode === 'login';
  return '<div class="auth-card"><h1>' + (login ? '👤 Sign in · সাইন ইন' : '✨ Create account · নতুন অ্যাকাউন্ট') + '</h1>' +
    '<p>Track your orders, manage your Morning Pass and check out faster.</p>' +
    '<form id="auth-form" class="form-grid" novalidate>' +
    (login ? '' : '<label class="field wide">Your name · নাম<input name="name" maxlength="120" required autocomplete="name"></label>') +
    '<label class="field wide">Mobile number · ফোন<input name="phone" inputmode="numeric" maxlength="10" pattern="[6-9][0-9]{9}" required autocomplete="tel-national" placeholder="10-digit mobile"></label>' +
    (login ? '' : '<label class="field wide">Email (optional)<input name="email" type="email" maxlength="254" autocomplete="email"></label>') +
    '<label class="field wide">Password · পাসওয়ার্ড<input name="password" type="password" minlength="8" maxlength="128" required autocomplete="' + (login ? 'current-password' : 'new-password') + '">' + (login ? '' : '<small>At least 8 characters.</small>') + '</label>' +
    '<label class="trap" aria-hidden="true">Leave blank<input name="website" tabindex="-1" autocomplete="off"></label>' +
    '<button class="button primary wide" type="submit">' + (login ? 'Sign in' : 'Create account') + '</button></form>' +
    '<p class="auth-switch">' + (login ? 'New here? <button type="button" class="text-button" data-auth-mode="signup">Create an account</button>' : 'Already registered? <button type="button" class="text-button" data-auth-mode="login">Sign in</button>') + '</p>' +
    '<p class="small">Forgot your password? Call or WhatsApp the shop and we will help you reset it.</p></div>';
}
async function submitAuth(event) {
  event.preventDefault();
  const form = event.target, values = Object.fromEntries(new FormData(form)), btn = form.querySelector('button[type=submit]');
  if (!/^[6-9][0-9]{9}$/.test(values.phone || '')) return flash('Enter a valid 10-digit mobile number.', true);
  if ((values.password || '').length < 8) return flash('Password must be at least 8 characters.', true);
  btn.disabled = true;
  try {
    const r = await api('/auth?action=' + acct.authMode, { method: 'POST', body: JSON.stringify(values) });
    setUser(r.user); acct.tab = 'orders';
    flash('Welcome, ' + r.user.name + '!');
    const back = acct.afterAuth || 'account'; acct.afterAuth = null;
    go(back);
  } catch (e) { flash(e.message, true); btn.disabled = false; }
}
async function renderAccount() {
  const box = $('account');
  if (!acct.user) { box.innerHTML = authForm(); return; }
  const u = acct.user, tabs = [['orders', '📦 Orders'], ['passes', '🌅 Morning Passes'], ['profile', '⚙️ Profile']];
  box.innerHTML = '<div class="section-head"><div><h1>👤 ' + esc(u.name) + '</h1><p>' + esc(u.phone) + (u.email ? ' · ' + esc(u.email) : '') + '</p></div>' +
    '<div class="hero-actions">' + (u.role === 'admin' ? '<a class="button amber" href="/admin">Admin dashboard</a>' : '') + '<button type="button" class="button outline" id="logout-btn">Sign out</button></div></div>' +
    '<div class="subtabs" role="tablist">' + tabs.map(t => '<button type="button" role="tab" class="chip' + (acct.tab === t[0] ? ' active' : '') + '" data-acct-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    '<div id="acct-body"><p>Loading…</p></div>';
  const body = $('acct-body');
  try {
    if (acct.tab === 'orders') body.innerHTML = ordersHtml((await api('/account?section=orders')).orders);
    else if (acct.tab === 'passes') { const r = await api('/account?section=passes'); body.innerHTML = passesHtml(r.passes, r.online); }
    else body.innerHTML = profileHtml();
  } catch (e) {
    if (/sign in/i.test(e.message)) { setUser(null); return renderAccount(); }
    body.innerHTML = '<p class="error-text">' + esc(e.message) + '</p>';
  }
}
function ordersHtml(list) {
  if (!list.length) return '<p>No orders yet. <button class="text-button" data-go="vegetables">Start shopping</button></p>';
  return '<div class="cards">' + list.map(o => {
    const canPay = acct.online && o.payment_method === 'online' && ['pending', 'failed'].includes(o.payment_status) && o.status !== 'cancelled';
    return '<article class="card"><div class="card-head"><div><strong>' + esc(o.order_no) + '</strong><small>' + fmtTime(o.created_at) + ' · ' + esc(o.delivery_slot) + '</small></div><div>' + stat(o.status) + ' ' + stat(o.payment_status === 'paid' ? 'paid' : o.payment_method === 'cod' ? 'unpaid' : o.payment_status) + '</div></div>' +
      '<ul class="lines">' + o.items.map(i => '<li>' + esc(i.name) + ' × ' + i.qty + '<span>' + money(i.line_total) + '</span></li>').join('') + '</ul>' +
      '<div class="card-foot"><strong>Total ' + money(o.total) + '</strong><span>' + (o.payment_method === 'online' ? 'Online payment' : 'Pay on delivery') + '</span>' +
      (canPay ? '<button type="button" class="button primary" data-pay-order="' + esc(o.order_no) + '">Pay now</button>' : '') + '</div></article>';
  }).join('') + '</div>';
}
function passesHtml(list, online) {
  acct.online = online;
  const cta = '<div class="pass-cta"><div><strong>Start a new pass</strong><p>Milk, ghee, paneer and newspapers, delivered each morning.</p></div><button class="button amber" data-go="pass">Build a Morning Pass</button></div>';
  if (!list.length) return cta;
  return cta + '<div class="cards">' + list.map(s => {
    const next = s.nextPayment;
    return '<article class="card"><div class="card-head"><div><strong>' + esc(s.sub_code) + '</strong><small>' + esc(label(FREQS, s.frequency)) + ' · ' + esc(label(SLOTS, s.slot)) + ' · from ' + fmtDate(s.start_date) + '</small></div><div>' + stat(s.status) + '</div></div>' +
      '<ul class="lines">' + s.items.map(i => '<li>' + esc(i.name) + (i.pack ? ' · ' + esc(i.pack) : '') + ' × ' + i.qty + '<span>' + (Number(i.price) > 0 ? money(Number(i.price) * i.qty) : 'price pending') + '</span></li>').join('') + '</ul>' +
      '<div class="card-foot"><strong>' + (s.perDelivery ? money(s.perDelivery) + ' per delivery' : 'Price confirmed by shop') + '</strong><span>' + (s.paid_until ? 'Paid until ' + fmtDate(s.paid_until) : s.status === 'pending' ? 'Awaiting shop confirmation' : 'Not prepaid') + '</span></div>' +
      (s.status === 'paused' ? '<p class="small">Paused until ' + fmtDate(s.paused_until) + '</p>' : '') +
      '<div class="card-actions">' +
      (next && online ? '<button type="button" class="button primary" data-pay-pass="' + esc(s.sub_code) + '">Pay ' + money(next.amount) + ' · next ' + next.deliveries + ' deliveries</button>' : '') +
      (s.status === 'active' ? '<span class="inline-pause"><input type="date" min="' + istDate(1) + '" max="' + istDate(90) + '" value="' + istDate(7) + '" aria-label="Pause until" data-pause-date="' + esc(s.sub_code) + '"><button type="button" class="button outline" data-pass-act="pause" data-code="' + esc(s.sub_code) + '">Pause</button></span>' : '') +
      (s.status === 'paused' ? '<button type="button" class="button outline" data-pass-act="resume" data-code="' + esc(s.sub_code) + '">Resume now</button>' : '') +
      (s.status !== 'cancelled' ? '<button type="button" class="button outline danger" data-pass-act="cancel" data-code="' + esc(s.sub_code) + '">Cancel</button>' : '') + '</div></article>';
  }).join('') + '</div>';
}
function profileHtml() {
  const u = acct.user;
  return '<div class="split"><form id="profile-form" class="form-grid"><h2 class="wide">Your details</h2>' +
    '<label class="field wide">Name<input name="name" required maxlength="120" value="' + esc(u.name) + '"></label>' +
    '<label class="field wide">Email (optional)<input name="email" type="email" maxlength="254" value="' + esc(u.email || '') + '"></label>' +
    '<label class="field wide">Default delivery address<textarea name="defaultAddress" maxlength="500" rows="3">' + esc(u.default_address || '') + '</textarea></label>' +
    '<label class="field">Pincode<input name="defaultPincode" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="' + esc(u.default_pincode || '') + '"></label>' +
    '<button class="button primary wide" type="submit">Save</button></form>' +
    '<form id="password-form" class="form-grid"><h2 class="wide">Change password</h2>' +
    '<label class="field wide">Current password<input name="currentPassword" type="password" required autocomplete="current-password"></label>' +
    '<label class="field wide">New password<input name="newPassword" type="password" minlength="8" maxlength="128" required autocomplete="new-password"></label>' +
    '<button class="button outline wide" type="submit">Update password</button></form></div>';
}
async function post(path, body) { return api(path, { method: 'POST', body: JSON.stringify(body) }); }

/* ---------- Morning Pass builder ---------- */
function renderPass() {
  const box = $('pass');
  if (!acct.user) {
    box.innerHTML = '<h1>🌅 Morning Pass · সকালের পাস</h1><p>Milk, ghee, paneer and your daily newspaper at your door every morning. Sign in to build your pass and manage it later.</p>' +
      '<button class="button primary" type="button" id="pass-signin">Sign in or create an account</button>';
    $('pass-signin').onclick = () => { acct.afterAuth = 'pass'; acct.authMode = 'login'; go('account'); };
    return;
  }
  const { lines, perDelivery } = draftTotals();
  const all = [...acct.dairy, ...acct.papers];
  const start = istDate(1), u = acct.user;
  box.innerHTML = '<h1>🌅 Morning Pass · সকালের পাস</h1><p>Pick what you want each morning. The shop confirms availability and your final schedule, then you can pay online or on delivery. Pause or cancel any time.</p>' +
    '<h2>1. Your morning basket</h2>' +
    (lines.length ? '<div class="cards single">' + lines.map(l => '<div class="cart-line"><div><strong>' + esc(l.p.name_en) + ' · ' + esc(l.p.name_bn) + '</strong><small>' + esc(l.p.pack_size || l.p.unit) + ' · ' + money(l.p.price) + ' each</small><button type="button" class="text-button" data-pass-remove="' + l.id + '">Remove</button></div>' +
      '<input type="number" min="1" max="50" value="' + l.qty + '" data-pass-qty="' + l.id + '" aria-label="Quantity"><strong>' + money(Number(l.p.price) * l.qty) + '</strong></div>').join('') + '</div>' : '<p class="notice">Your pass is empty. Add something below, or from the Dairy and Newspaper tabs.</p>') +
    (all.length ? '<div class="add-row"><label class="field">Add a product<select id="pass-add-select">' +
      (acct.dairy.length ? '<optgroup label="Milk, ghee &amp; dairy">' + acct.dairy.map(p => '<option value="' + p.id + '">' + esc(p.name_en) + ' · ' + esc(p.pack_size || p.unit) + ' · ' + money(p.price) + '</option>').join('') + '</optgroup>' : '') +
      (acct.papers.length ? '<optgroup label="Newspapers">' + acct.papers.map(p => '<option value="' + p.id + '">' + esc(p.name_en) + ' · ' + money(p.price) + '</option>').join('') + '</optgroup>' : '') +
      '</select></label><label class="field">Qty<input type="number" id="pass-add-qty" min="1" max="50" value="1"></label><button type="button" class="button outline" id="pass-add-btn">Add</button></div>'
      : '<p>No dairy or newspaper products are active yet. Please check back soon.</p>') +
    '<h2>2. Schedule &amp; address</h2>' +
    '<form id="pass-form" class="form-grid">' +
    '<label class="field">How often<select name="frequency" id="pass-freq">' + FREQS.map(f => '<option value="' + f[0] + '">' + f[1] + '</option>').join('') + '</select></label>' +
    '<label class="field">Morning slot<select name="slot">' + SLOTS.map(f => '<option value="' + f[0] + '">' + f[1] + '</option>').join('') + '</select></label>' +
    '<label class="field">Start date<input type="date" name="startDate" id="pass-start" min="' + istDate(0) + '" value="' + start + '" required></label>' +
    '<label class="field">Name<input name="customerName" required maxlength="120" value="' + esc(u.name) + '"></label>' +
    '<label class="field">Phone<input name="phone" required maxlength="10" inputmode="numeric" pattern="[6-9][0-9]{9}" value="' + esc(u.phone) + '"></label>' +
    '<label class="field">Pincode<input name="pincode" required maxlength="6" inputmode="numeric" pattern="[0-9]{6}" value="' + esc(u.default_pincode || '') + '" placeholder="731224"></label>' +
    '<label class="field wide">Delivery address<textarea name="address" required maxlength="500" rows="3">' + esc(u.default_address || '') + '</textarea></label>' +
    '<label class="field wide">Notes (optional)<textarea name="notes" maxlength="500" rows="2"></textarea></label>' +
    '<label class="trap" aria-hidden="true">Leave blank<input name="website" tabindex="-1" autocomplete="off"></label>' +
    '<div class="wide estimate" id="pass-estimate" aria-live="polite"></div>' +
    '<button class="button primary wide" type="submit" id="pass-submit"' + (lines.length ? '' : ' disabled') + '>Request Morning Pass · আবেদন করুন</button></form>' +
    '<p id="pass-result" role="status"></p>';
  updateEstimate();
}
function updateEstimate() {
  const el = $('pass-estimate'); if (!el) return;
  const { lines, perDelivery } = draftTotals();
  if (!lines.length) { el.textContent = ''; return; }
  const freq = $('pass-freq').value, start = $('pass-start').value || istDate(1);
  const from = start > istDate(0) ? start : istDate(0);
  const n = countClient(freq, start, from, dayDiff(from, 29));
  el.innerHTML = '<strong>' + money(perDelivery) + '</strong> per delivery · about <strong>' + money(perDelivery * n) + '</strong> for 30 days (' + n + ' deliveries). Final prices are confirmed by the shop. You are not charged until the pass is confirmed.';
}
async function submitPass(event) {
  event.preventDefault();
  const form = event.target, values = Object.fromEntries(new FormData(form)), btn = $('pass-submit');
  values.items = acct.draft.map(l => ({ productId: l.id, qty: l.qty }));
  if (!values.items.length) return flash('Add at least one product to your pass.', true);
  btn.disabled = true;
  try {
    const r = await post('/subscriptions', values);
    acct.draft = []; saveDraft(); acct.tab = 'passes';
    $('pass-result').innerHTML = '✅ Request saved: <strong>' + esc(r.subscriptionCode) + '</strong>. We will confirm your schedule by phone or WhatsApp. You can track it in <button class="text-button" data-go="account">My Account</button>.';
    form.hidden = true;
  } catch (e) {
    if (/sign in/i.test(e.message)) { setUser(null); acct.afterAuth = 'pass'; go('account'); }
    flash(e.message, true); btn.disabled = false;
  }
}

/* ---------- Navigation hook (called by app.js go()) ---------- */
function onScreen(id) {
  if (id === 'account') renderAccount();
  else if (id === 'pass') renderPass();
  else if (id === 'newspaper') renderDraftSummary();
  else if (id === 'checkout') prepareCheckout();
}
function prepareCheckout() {
  const online = $('pay-online-label'); if (online) online.hidden = !acct.online;
  if (!acct.online) { const cod = document.querySelector('#checkout-form [name=paymentMethod][value=cod]'); if (cod) cod.checked = true; }
  const f = $('checkout-form'), u = acct.user;
  const note = $('checkout-account-note');
  if (u && f) {
    const set = (n, v) => { const el = f.elements[n]; if (el && !el.value && v) el.value = v; };
    set('customerName', u.name); set('phone', u.phone); set('address', u.default_address); set('pincode', u.default_pincode);
    note.innerHTML = 'Signed in as <strong>' + esc(u.name) + '</strong>. This order will appear in <button type="button" class="text-button" data-go="account">My Account</button>. We confirm availability and delivery by WhatsApp or phone.';
  } else {
    note.innerHTML = 'We confirm availability and delivery by WhatsApp or phone. <button type="button" class="text-button" id="checkout-signin">Sign in</button> to track this order in your account.';
    const b = $('checkout-signin'); if (b) b.onclick = () => { acct.afterAuth = 'checkout'; acct.authMode = 'login'; go('account'); };
  }
}

/* ---------- Events ---------- */
function bindAccountEvents() {
  document.addEventListener('click', async event => {
    const t = event.target;
    const mode = t.closest('[data-auth-mode]'); if (mode) { acct.authMode = mode.dataset.authMode; renderAccount(); return; }
    const tab = t.closest('[data-acct-tab]'); if (tab) { acct.tab = tab.dataset.acctTab; renderAccount(); return; }
    const addBtn = t.closest('[data-pass-add]');
    if (addBtn) { const card = addBtn.closest('.product'); const q = Number(card?.querySelector('[data-qty]')?.value) || 1; addToPass(addBtn.dataset.passAdd, Math.max(1, Math.min(50, q))); return; }
    const rm = t.closest('[data-pass-remove]'); if (rm) { acct.draft = acct.draft.filter(x => x.id !== rm.dataset.passRemove); saveDraft(); renderPass(); return; }
    if (t.id === 'pass-add-btn') { addToPass($('pass-add-select').value, Math.max(1, Math.min(50, Number($('pass-add-qty').value) || 1))); renderPass(); return; }
    if (t.id === 'logout-btn') { try { await post('/auth?action=logout', {}); } catch { /* cookie cleared server-side when reachable */ } setUser(null); acct.afterAuth = null; renderAccount(); flash('Signed out.'); return; }
    const payOrder = t.closest('[data-pay-order]');
    if (payOrder) { await startOrderPayment(payOrder.dataset.payOrder, acct.user.phone, payOrder); return; }
    const payPass = t.closest('[data-pay-pass]'); if (payPass) { await startPassPayment(payPass.dataset.payPass, payPass); return; }
    const act = t.closest('[data-pass-act]');
    if (act) {
      const code = act.dataset.code, kind = act.dataset.passAct;
      if (kind === 'cancel' && !confirm('Cancel Morning Pass ' + code + '? Deliveries will stop.')) return;
      const body = { subscriptionCode: code, action: kind };
      if (kind === 'pause') body.pausedUntil = document.querySelector('[data-pause-date="' + code + '"]')?.value;
      act.disabled = true;
      try { await post('/account?action=pass-action', body); flash('Morning Pass updated.'); } catch (e) { flash(e.message, true); }
      renderAccount();
    }
  });
  document.addEventListener('submit', async event => {
    const f = event.target;
    if (f.id === 'auth-form') return submitAuth(event);
    if (f.id === 'pass-form') return submitPass(event);
    if (f.id === 'profile-form') {
      event.preventDefault();
      try { const r = await post('/auth?action=profile', Object.fromEntries(new FormData(f))); setUser(r.user); flash('Profile saved.'); renderAccount(); } catch (e) { flash(e.message, true); }
    }
    if (f.id === 'password-form') {
      event.preventDefault();
      try { await post('/auth?action=password', Object.fromEntries(new FormData(f))); f.reset(); flash('Password updated. Other devices were signed out.'); } catch (e) { flash(e.message, true); }
    }
  });
  document.addEventListener('change', event => {
    const q = event.target.closest('[data-pass-qty]');
    if (q) { const line = acct.draft.find(x => x.id === q.dataset.passQty); if (line) { line.qty = Math.max(1, Math.min(50, Math.floor(Number(q.value) || 1))); saveDraft(); renderPass(); } return; }
    if (event.target.id === 'pass-freq' || event.target.id === 'pass-start') updateEstimate();
  });
}

async function initAccount() {
  loadDraft(); bindAccountEvents();
  await Promise.all([loadMe(), loadPassCatalog(), api('/payments?action=config').then(c => { acct.online = c.online; acct.mode = c.mode; }).catch(() => { acct.online = false; })]);
  renderDraftSummary();
  await handlePaymentReturn();
}
