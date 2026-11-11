'use strict';
const crypto = require('node:crypto');
const gate = require('../lib/server-auth');
const contact = require('../config/contact.mjs').default;

module.exports = async function handler(req, res) {
  gate.setHeaders(res);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (req.method !== 'GET') return res.status(405).end();
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; script-src 'self' https://www.gstatic.com 'nonce-" + nonce +
    "'; style-src 'nonce-" + nonce + "'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  const cfg = JSON.stringify({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || ''
  }).replace(/</g, '\\u003c');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(page.replaceAll('__NONCE__', nonce).replace('__FIREBASE_CFG__', cfg)
    .replaceAll('__CONTACT_PHONE__', contact.displayPhone)
    .replaceAll('__CONTACT_ADDRESS__', contact.address));
};
const page = String.raw`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Store Operations | Sokal Bela</title>
<style nonce="__NONCE__">
:root{--green:#2d7a3a;--forest:#1e5a28;--mint:#e8f5ea;--gold:#f4a624;--bg:#f6f8f5;--card:#fff;--ink:#1a2b20;--muted:#607064;--line:#dbe6dc}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}body.dark{--bg:#0e1912;--card:#19261d;--ink:#f1f9f2;--muted:#aabfb1;--line:#334638;--mint:#203f29}
button,input,select,textarea{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
button.primary{background:var(--green);color:white;border:0;border-radius:10px;padding:11px 18px;font-weight:700}
button.secondary{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:9px 14px}
button.danger{color:#be2c26}.hidden{display:none!important}.auth{max-width:440px;margin:9vh auto;padding:24px;background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:0 10px 35px #0001}
.auth h1{color:var(--green);margin:0}.auth label,.field label{display:block;font-weight:600;margin:12px 0 6px}
.auth input,.field input,.field select,.field textarea,#search{width:100%;border:1px solid var(--line);border-radius:9px;padding:11px;background:var(--card);color:var(--ink)}
.otp{display:flex;gap:8px;margin:18px 0}.otp input{width:16.67%;min-width:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:0}
#auth-error{color:#c22;min-height:24px}.layout{display:grid;grid-template-columns:238px minmax(0,1fr);min-height:100vh}
aside{background:var(--forest);color:#fff;padding:22px 14px;min-width:0}aside h2{padding:0 12px}aside button{display:block;width:100%;text-align:left;background:transparent;color:white;border:0;padding:12px;border-radius:10px;margin-bottom:5px}aside button.active,aside button:hover{background:#ffffff25}
main{min-width:0;padding:22px clamp(14px,3vw,42px)}header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:24px}
header h1{font-size:clamp(1.5rem,3vw,2rem);margin:0}.actions{display:flex;gap:8px;flex-wrap:wrap}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.card b.number{display:block;font-size:1.8rem;color:var(--green);margin-top:12px}.label{color:var(--muted);font-size:.9rem}
.two{display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-top:18px}.bars{display:flex;align-items:end;justify-content:space-around;gap:6px;min-height:175px;padding-top:25px}
.bars div{flex:1;text-align:center;font-size:12px;color:var(--muted)}.bars b{display:block;margin:auto;background:var(--green);width:min(46px,95%);border-radius:5px 5px 0 0;min-height:2px}
.chart-key{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}.dot{width:10px;height:10px;display:inline-block;background:var(--green);border-radius:50%;margin-right:5px}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:16px 0}.toolbar #search{width:min(100%,330px)}
.table-scroll{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:14px}table{border-collapse:collapse;width:100%;min-width:640px}th,td{border-bottom:1px solid var(--line);padding:11px 12px;text-align:left;font-size:13px}th{background:var(--mint);white-space:nowrap}th button{background:transparent;border:0;font-weight:700;color:var(--ink)}td button,td select{max-width:155px}
.pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px}
.activity{list-style:none;padding:0}.activity li{padding:10px 0;border-bottom:1px solid var(--line)}
#toast{position:fixed;right:18px;bottom:18px;max-width:360px;padding:14px 18px;border-radius:12px;background:var(--forest);color:#fff;box-shadow:0 8px 20px #0003;z-index:20}
dialog{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:16px;max-width:min(95vw,540px);width:100%}dialog::backdrop{background:#0009}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.skeleton{height:100px;border-radius:16px;background:linear-gradient(90deg,var(--line),var(--card),var(--line));background-size:200% 100%;animation:shimmer 1.4s infinite}
@keyframes shimmer{to{background-position:-200% 0}}@media(prefers-reduced-motion:reduce){.skeleton{animation:none}}
@media(max-width:850px){.layout{grid-template-columns:1fr}aside{position:relative;padding:12px}aside h2{margin:5px 0}aside nav{display:flex;overflow-x:auto;gap:5px}aside button{white-space:nowrap;width:auto}.two{grid-template-columns:1fr}}
@media(max-width:450px){.auth{margin:16px 12px;padding:18px}.form-grid{grid-template-columns:1fr}main{padding:15px}}

.donut{height:170px;width:170px;border-radius:50%;margin:10px auto 20px;position:relative}
.donut:after{content:"";position:absolute;inset:26px;border-radius:50%;background:var(--card)}
  </style></head>
<body>
<section class="auth" id="login">
<h1>🥬 Sokal Bela</h1><p>Authorized store operations sign-in</p>
<form id="request-form"><label for="email">Email address</label><input id="email" type="email" autocomplete="username" required maxlength="254">
<label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required>
<p><button class="primary" type="submit" id="send">Sign in</button></p></form>
<button class="secondary" id="reset-password" type="button">Forgot password?</button>
<p id="auth-error" role="alert"></p>
</section>
<div class="layout hidden" id="panel">
<aside><h2>🥬 Sokal Bela</h2><nav id="sidebar" aria-label="Dashboard sections"></nav></aside>
<main><header><h1 id="page-title">Overview</h1><div class="actions"><button class="secondary" id="sidebar-toggle" aria-label="Collapse sidebar">☰</button><button class="secondary" id="theme">Dark / light</button><button class="secondary" id="refresh">Refresh</button><button class="secondary" id="logout">Sign out</button></div></header>
<div id="skeleton" class="kpis"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
<section id="content" aria-live="polite"></section></main></div>
<dialog id="product-dialog"><form id="product-form"><h2 id="product-heading">Product</h2><div class="form-grid">
<div class="field"><label for="p-name">English name</label><input id="p-name" required></div>
<div class="field"><label for="p-bn">বাংলা নাম</label><input id="p-bn" required></div>
<div class="field"><label for="p-price">Price (₹)</label><input id="p-price" type="number" min="0.01" step=".01" required></div>
<div class="field"><label for="p-stock">Stock</label><input id="p-stock" type="number" min="0" step="1" required></div>
<div class="field"><label for="p-unit">Unit</label><select id="p-unit"><option>kg</option><option>g</option><option>litre</option><option>ml</option><option>pack</option><option>piece</option><option>bunch</option></select></div>
<div class="field"><label for="p-category">Category</label><input id="p-category" value="Others"></div></div>
<div class="field"><label for="p-description">Freshness description</label><textarea id="p-description"></textarea></div>
<div class="field"><label for="p-image">Optional image URL</label><input id="p-image"></div>
<div class="form-grid"><div class="field"><label>Brand <input id="p-brand"></label></div><div class="field"><label>Pack size <input id="p-pack"></label></div>
<div class="field"><label>Shelf life days <input id="p-shelf" type="number" min="0"></label></div><div class="field"><label>Daily stock target <input id="p-target" type="number" min="0"></label></div></div>
<div class="field"><label>FSSAI note <input id="p-fssai"></label></div><p><label><input type="checkbox" id="p-perishable"> Perishable · daily stock reset</label></p>
<p><label><input type="checkbox" id="p-active" checked> Available to customers</label></p>
<div class="actions"><button class="primary" type="submit">Save</button><button class="secondary" type="button" id="product-cancel">Cancel</button></div>
</form></dialog>
<dialog id="kitchen-dialog"><form id="kitchen-form"><h2>Partner Picks · Kitchen Items</h2>
<div class="form-grid"><div class="field"><label>Title<input id="k-title" required></label></div>
<div class="field"><label>Store<select id="k-store"><option value="amazon">Amazon</option><option value="flipkart">Flipkart</option></select></label></div>
<div class="field"><label>Affiliate HTTPS URL<input id="k-url" required type="url"></label></div>
<div class="field"><label>Approximate price (optional)<input id="k-price" type="number" min="0" step=".01"></label></div>
<div class="field"><label>Emoji<input id="k-emoji" value="🍳"></label></div>
<div class="field"><label>Sort order<input id="k-order" type="number" value="0"></label></div></div>
<div class="field"><label>Your own description<textarea id="k-description"></textarea></label></div>
<div class="field"><label>Image URL (optional)<input id="k-image"></label></div>
<div class="field"><label>Category<input id="k-category" value="Kitchen"></label></div>
<p><label><input type="checkbox" id="k-active" checked> Active</label></p>
<div class="actions"><button class="primary" type="submit">Save</button><button type="button" class="secondary" id="kitchen-cancel">Cancel</button></div>
</form></dialog><div id="toast" role="status" class="hidden"></div>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script nonce="__NONCE__">
'use strict';
const config = __FIREBASE_CFG__;
const sections = ['overview','orders','bulk','users','products','kitchenItems','payments','deliveries','settings','activity'];
const titles = {overview:'Overview',orders:'Daily Orders',bulk:'Bulk Event Inquiries',users:'Users',products:'Products',kitchenItems:'Kitchen Items',payments:'Payments',deliveries:'Deliveries',settings:'Store Settings',activity:'Recent Activity'};
const $ = id => document.getElementById(id), safe = x => String(x == null ? '' : x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data = null, section = 'overview', keyword = '', sortKey = '', descending = false, pageNum = 0, productId = '', kitchenId = '', expiry = 0, resendAt = 0, timer = null, lastInput = Date.now();

const api = (url, options) => fetch(url, {credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options?.headers||{})}})
  .then(async response => { const result = await response.json().catch(()=>({})); if(!response.ok) throw new Error(result.error||'Request failed'); return result; });
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),4000);}
function error(msg){$('auth-error').textContent=msg;}
$('request-form').addEventListener('submit',async e=>{
  e.preventDefault();error('');$('send').disabled=true;
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
    const credential=await firebase.auth().signInWithEmailAndPassword($('email').value.trim(),$('password').value);
    const idToken=await credential.user.getIdToken(true);
    await api('/api/auth/session',{method:'POST',body:JSON.stringify({idToken,purpose:'admin'})});
    $('password').value='';await load();
  } catch(err) { await api('/api/auth/logout',{method:'POST',body:'{}'}).catch(()=>{}); await firebase.auth().signOut().catch(()=>{}); error(err.message === 'Forbidden' ? 'Administrator access is not configured for this account. Check the admin role and allowlist.' : 'Sign-in or dashboard loading failed. Check your credentials, connection and server configuration.'); }
  finally {$('send').disabled=false;}
});
$('reset-password').addEventListener('click',async()=>{
  const email=$('email').value.trim();if(!email)return error('Enter your email address first.');
  try{await firebase.auth().sendPasswordResetEmail(email);error('If the account is eligible, a password reset email will be sent.');}
  catch(err){error('Unable to request a password reset. Please try again.');}
});
function adminUi(){ $('login').classList.add('hidden');$('panel').classList.remove('hidden');$('sidebar').innerHTML=sections.map(s=>'<button data-section="'+s+'" class="'+(s===section?'active':'')+'">'+safe(titles[s])+'</button>').join('');
  $('sidebar').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{section=b.dataset.section;keyword='';sortKey='';pageNum=0;render();adminUi();}));}
async function load(){
  $('skeleton').classList.remove('hidden');
  try{data=await api('/api/admin-data');adminUi();render();lastInput=Date.now();}
  catch(e){if($('panel').classList.contains('hidden')) throw e; toast(e.message);if(e.message==='Forbidden'){await signOut();error('Your session expired or administrator access is unavailable.');}}
  finally{$('skeleton').classList.add('hidden');}
}
async function signOut(){await api('/api/auth/logout',{method:'POST',body:'{}'}).catch(()=>{});await firebase.auth().signOut().catch(()=>{});$('panel').classList.add('hidden');$('login').classList.remove('hidden');$('password').value='';error('');}
$('logout').addEventListener('click',signOut);$('refresh').addEventListener('click',load);
$('theme').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('sb-admin-theme',document.body.classList.contains('dark')?'dark':'light');});
if(localStorage.getItem('sb-admin-theme')==='dark')document.body.classList.add('dark');
$('sidebar-toggle').addEventListener('click',()=>{const side=document.querySelector('aside');side.hidden=!side.hidden;});
['mousemove','keydown','pointerdown','touchstart'].forEach(name=>document.addEventListener(name,()=>{lastInput=Date.now();},{passive:true}));
setInterval(()=>{if(!$('panel').classList.contains('hidden')&&Date.now()-lastInput>15*60000){signOut();toast('Signed out due to inactivity.');}},1000);
function rowDate(v){return v?String(v).slice(0,10):'—';}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});}
function tableFields(s){return {orders:['orderNumber','customerName','phone','total','orderStatus','createdAt'],
bulk:['contactName','phone','eventType','eventDate','guestCount','status'],
users:['displayName','email','role','lastLoginAt'],
products:['name','bengaliName','category','price','stock','unit','perishable','status'],
kitchenItems:['title','store','active','sortOrder','affiliateUrl'],
payments:['orderId','amount','paymentStatus','paymentMethod','createdAt'],
deliveries:['orderId','address','status','deliveryNotes','updatedAt']}[s]||[];}
function csvText(rows, fields){return [fields.join(','),...rows.map(r=>fields.map(f=>'"'+String(r[f]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');}
function exportCsv(rows,fields){const blob=new Blob([csvText(rows,fields)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sokal-bela-'+section+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function filtered(){let rows=(data.tables[section]||[]).filter(r=>JSON.stringify(r).toLowerCase().includes(keyword.toLowerCase()));
  if(sortKey)rows.sort((a,b)=>String(a[sortKey]??'').localeCompare(String(b[sortKey]??''),undefined,{numeric:true})*(descending?-1:1));return rows;}
function render(){
  if(!data)return;$('page-title').textContent=titles[section];
  if(section==='overview')return overview();
  if(section==='settings')return settings();
  if(section==='activity'){$('content').innerHTML='<div class="card"><h2>Recent activity</h2><ul class="activity">'+
    (data.logs.length?data.logs.map(a=>'<li>'+safe(a.action)+' · '+safe(a.target)+' · '+rowDate(a.at)+'</li>').join(''):'<li>No actions recorded.</li>')+'</ul></div>';return;}
  renderTable();
}
function overview(){
  const labels={users:'Total Users',orders:'Total Orders',revenue:'Revenue',deliveries:'Pending Deliveries',emergency:'24/7 Emergency Orders',bulk:'Bulk Event Inquiries'};
  const cards=Object.entries(labels).map(([k,label])=>{
    const trend=data.trends?.[k];
    const change=trend===null||trend===undefined?'No comparison available':(trend>0?'↑ ':trend<0?'↓ ':'→ ')+Math.abs(trend)+'% vs previous 7 days';
    return '<div class="card"><div class="label">'+label+'</div><b class="number">'+
      (k==='revenue'?money(data.kpis[k]):data.kpis[k])+'</b><small>'+safe(change)+'</small></div>';
  }).join('');
  const max=Math.max(1,...data.days.map(x=>x.sales));
  const bars=data.days.map(x=>'<div title="'+safe(x.day)+' • '+money(x.sales)+'"><b data-bar-height="'+
    Math.max(2,Math.round(x.sales/max*140))+'"></b>'+safe(x.day.slice(-5))+'</div>').join('');
  const total=Object.values(data.status).reduce((s,n)=>s+Number(n),0);
  const colors=['#2d7a3a','#f4a624','#70a9f3','#86b995','#e53935'];
  const status=Object.entries(data.status).map(([name,n],i)=>'<li><span class="dot" data-color="'+i+'"></span>'+safe(name)+': <b>'+n+'</b></li>').join('');
  $('content').innerHTML='<div class="kpis">'+cards+'</div><div class="two"><div class="card"><h2>Sales · last 7 days</h2>'+
    '<div class="bars" role="img" aria-label="Daily sales bar chart">'+bars+'</div></div><div class="card">'+
    '<h2>Order statuses</h2><div class="donut" id="donut" role="img" aria-label="Order status breakdown"></div><ul>'+status+'</ul></div></div>'+
    (data.truncated?'<p role="note">KPI calculations and exports use up to 250 records per collection. Historical percentages may be incomplete.</p>':'');
  document.querySelectorAll('[data-bar-height]').forEach(el=>{el.style.height=el.dataset.barHeight+'px';});
  document.querySelectorAll('[data-color]').forEach(el=>{el.style.background=colors[Number(el.dataset.color)]||colors[0];});
  let pct=0;
  const segments=Object.values(data.status).map((n,i)=>{
    const start=pct;pct+=total?Number(n)/total*100:0;
    return colors[i%colors.length]+' '+start+'% '+pct+'%';
  });
  $('donut').style.background=total?'conic-gradient('+segments.join(',')+')':'var(--line)';
  $('donut').setAttribute('aria-label',total+' orders: '+Object.entries(data.status).map(([name,n])=>name+' '+n).join(', '));
}
function renderTable(){
  const fields=tableFields(section),rows=filtered(),start=pageNum*15,visible=rows.slice(start,start+15);
  const toolbar='<div class="toolbar"><input id="search" type="search" aria-label="Search records" placeholder="Search records..." value="'+safe(keyword)+'"><div class="actions">'+
    (section==='products'?'<button class="primary" id="add-product">Add product</button> <button class="secondary" id="reset-daily">Reset today’s stock</button>':section==='kitchenItems'?'<button class="primary" id="add-kitchen">Add partner pick</button>':'')+
    '<button class="secondary" id="csv">Export CSV</button></div></div>';
  const header='<tr>'+fields.map(f=>'<th><button data-sort="'+f+'">'+safe(f.replace(/[A-Z]/g,x=>' '+x))+'</button></th>').join('')+
    (section==='orders'||section==='products'||section==='kitchenItems'?'<th>Actions</th>':'')+'</tr>';
  const body=visible.map(r=>'<tr>'+fields.map(f=>'<td>'+safe(r[f] && typeof r[f]==='object'?JSON.stringify(r[f]):r[f])+'</td>').join('')+
    (section==='orders'?'<td><select aria-label="Order status" data-order="'+safe(r.id)+'">'+
    ['Pending','Confirmed','Out for Delivery','Delivered','Cancelled'].map(s=>'<option'+(String(r.orderStatus||r.status||'').replace(/\s/g,'').toLowerCase()===s.replace(/\s/g,'').toLowerCase()?' selected':'')+'>'+s+'</option>').join('')+
    '</select><button class="secondary" data-note="'+safe(r.id)+'">Delivery note</button></td>':
    section==='products'?'<td><button class="secondary" data-edit="'+safe(r.id)+'">Edit</button> <button class="secondary danger" data-delete="'+safe(r.id)+'">Delete</button></td>':
    section==='kitchenItems'?'<td><button class="secondary" data-kedit="'+safe(r.id)+'">Edit</button> <button class="secondary danger" data-kdelete="'+safe(r.id)+'">Delete</button></td>':'')+'</tr>').join('');
  $('content').innerHTML=toolbar+'<div class="table-scroll"><table><thead>'+header+'</thead><tbody>'+ (body||'<tr><td colspan="10">No records found.</td></tr>')+
    '</tbody></table></div><div class="pager"><button class="secondary" id="prev" '+(!pageNum?'disabled':'')+'>Previous</button><span>Page '+(pageNum+1)+' of '+Math.max(1,Math.ceil(rows.length/15))+'</span><button class="secondary" id="next" '+(start+15>=rows.length?'disabled':'')+'>Next</button></div>';
  $('search').addEventListener('input',e=>{keyword=e.target.value;pageNum=0;renderTable();$('search').focus();$('search').setSelectionRange(keyword.length,keyword.length);});
  $('csv').addEventListener('click',()=>exportCsv(rows,fields));
  $('prev').addEventListener('click',()=>{pageNum--;renderTable();});$('next').addEventListener('click',()=>{pageNum++;renderTable();});
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{descending=sortKey===b.dataset.sort?!descending:false;sortKey=b.dataset.sort;renderTable();}));
  document.querySelectorAll('[data-order]').forEach(sel=>sel.addEventListener('change',async()=>{
    const row=data.tables.orders.find(o=>o.id===sel.dataset.order);if(!row)return;
    await changeOrder(row,sel.value,row.deliveryNotes||'');}));
  document.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',async()=>{
    const row=data.tables.orders.find(o=>o.id===b.dataset.note);if(!row)return;
    const note=prompt('Delivery notes',row.deliveryNotes||'');if(note!==null)await changeOrder(row,row.orderStatus||row.status||'Pending',note);
  }));
  if(section==='products'){
    $('add-product').addEventListener('click',()=>editProduct());
    $('reset-daily').addEventListener('click',async()=>{
      if(!confirm('Reset perishable stock to its configured daily target?'))return;
      try{const x=await api('/api/admin-data?action=reset-perishable',{method:'POST',body:'{}'});toast('Reset '+x.count+' dairy/perishable items');load();}
      catch(e){toast(e.message);}
    });
    document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editProduct(data.tables.products.find(p=>p.id===b.dataset.edit))));
    document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{
      if(!confirm('Delete this product? This cannot be undone.'))return;
      try{await api('/api/admin-data?action=product',{method:'DELETE',body:JSON.stringify({id:b.dataset.delete})});toast('Product deleted');load();}catch(e){toast(e.message);}
    }));
  }
  if(section==='kitchenItems'){
    $('add-kitchen').addEventListener('click',()=>editKitchen());
    document.querySelectorAll('[data-kedit]').forEach(b=>b.addEventListener('click',()=>editKitchen(data.tables.kitchenItems.find(p=>p.id===b.dataset.kedit))));
    document.querySelectorAll('[data-kdelete]').forEach(b=>b.addEventListener('click',async()=>{
      if(!confirm('Delete this affiliate pick?'))return;
      try{await api('/api/admin-data?action=kitchen-item',{method:'DELETE',body:JSON.stringify({id:b.dataset.kdelete})});toast('Removed');load();}
      catch(e){toast(e.message);}
    }));
  }
}
async function changeOrder(row,status,note){
  if(status==='OutForDelivery')status='Out for Delivery';
  if(!['Pending','Confirmed','Out for Delivery','Delivered','Cancelled'].includes(status))return toast('Unsupported status');
  try{await api('/api/admin-data?action=order',{method:'PATCH',body:JSON.stringify({id:row.id,status,note})});toast('Order updated');load();}
  catch(e){toast(e.message);}
}
function editProduct(product){
  productId=product?.id||'';$('product-heading').textContent=productId?'Edit product':'Add product';
  for(const [id,key] of [['p-name','name'],['p-bn','bengaliName'],['p-price','price'],['p-stock','stock'],['p-unit','unit'],['p-category','category'],['p-description','description'],['p-image','imageUrl']]){
    $(id).value=product?.[key]??(key==='unit'?'kg':key==='category'?'Others':'');
  }
  for(const [id,key] of [['p-brand','brand'],['p-pack','packSize'],['p-shelf','shelfLifeDays'],['p-target','dailyStockTarget'],['p-fssai','fssaiNote']])$(id).value=product?.[key]??'';
  $('p-perishable').checked=product?.perishable===true;
  $('p-active').checked=product?.active!==false;$('product-dialog').showModal();
}
$('product-cancel').addEventListener('click',()=>$('product-dialog').close());
$('product-form').addEventListener('submit',async e=>{
  e.preventDefault();const obj={id:productId,name:$('p-name').value,bengaliName:$('p-bn').value,
    price:Number($('p-price').value),stock:Number($('p-stock').value),unit:$('p-unit').value,category:$('p-category').value,
    description:$('p-description').value,imageUrl:$('p-image').value,active:$('p-active').checked,
    brand:$('p-brand').value,packSize:$('p-pack').value,perishable:$('p-perishable').checked,
    shelfLifeDays:$('p-shelf').value,dailyStockTarget:$('p-target').value,fssaiNote:$('p-fssai').value};
  try{await api('/api/admin-data?action=product',{method:productId?'PATCH':'POST',body:JSON.stringify(obj)});
    $('product-dialog').close();toast('Product saved');load();}catch(err){toast(err.message);}
});
function editKitchen(item){
  kitchenId=item?.id||'';
  for(const [id,key] of [['k-title','title'],['k-store','store'],['k-url','affiliateUrl'],['k-price','price'],['k-emoji','emoji'],['k-order','sortOrder'],['k-description','description'],['k-image','imageUrl'],['k-category','category']]){
    $(id).value=item?.[key]??(key==='store'?'amazon':key==='emoji'?'🍳':key==='sortOrder'?0:key==='category'?'Kitchen':'');
  }
  $('k-active').checked=item?.active!==false;
  $('kitchen-dialog').showModal();
}
$('kitchen-cancel').addEventListener('click',()=>$('kitchen-dialog').close());
$('kitchen-form').addEventListener('submit',async e=>{
  e.preventDefault();const obj={id:kitchenId,title:$('k-title').value,store:$('k-store').value,
    affiliateUrl:$('k-url').value,price:$('k-price').value,emoji:$('k-emoji').value,
    sortOrder:Number($('k-order').value),description:$('k-description').value,
    imageUrl:$('k-image').value,category:$('k-category').value,active:$('k-active').checked};
  try{await api('/api/admin-data?action=kitchen-item',{method:kitchenId?'PATCH':'POST',body:JSON.stringify(obj)});
    $('kitchen-dialog').close();toast('Partner pick saved');load();}catch(e){toast(e.message);}
});
function settings(){
  const s=data.settings||{};
  $('content').innerHTML='<form id="settings-form" class="card"><h2>Store settings</h2><p>Contact, payment and delivery number: <strong>__CONTACT_PHONE__</strong></p>'+
    '<div class="field"><label for="address">Store address</label><input id="address" required value="'+safe(s.address||'__CONTACT_ADDRESS__')+'"></div>'+
    '<div class="form-grid"><div class="field"><label for="minimum">Minimum order (₹)</label><input id="minimum" type="number" value="'+safe(s.minOrder||200)+'" min="200"></div>'+
    '<div class="field"><label for="free">Free delivery threshold (₹)</label><input id="free" type="number" min="300" value="'+safe(s.freeDeliveryAt||300)+'"></div></div>'+
    '<p>Free delivery within 5 km. Open 24/7.</p><button class="primary">Save settings</button></form>';
  $('settings-form').addEventListener('submit',async e=>{e.preventDefault();try{
    await api('/api/admin-data?action=settings',{method:'PATCH',body:JSON.stringify({address:$('address').value,
      minOrder:Number($('minimum').value),freeDeliveryAt:Number($('free').value)})});toast('Settings saved');load();
  }catch(err){toast(err.message);}});
}
try{firebase.initializeApp(config);firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(()=>{
    api('/api/admin-data').then(d=>{data=d;adminUi();render();}).catch(()=>{});
  });}catch(err){error('Authentication configuration is unavailable.');}
</script>
</body></html>`;
