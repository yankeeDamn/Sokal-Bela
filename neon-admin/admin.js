'use strict';
const BASE='/api/v2', $=id=>document.getElementById(id);
const SECTIONS={
 overview:['STORE PERFORMANCE','Overview','Your store at a glance.'],
 orders:['FULFILMENT','Orders','Review customers, delivery details, payment totals and notification status.'],
 products:['CATALOGUE','Inventory','Update prices, stock quantities and visibility safely.'],
 subscriptions:['RECURRING REQUESTS','Morning Pass','Confirm or pause customer dairy requests.'],
 requests:['CUSTOMER REQUESTS','Enquiries','Track bulk vegetable and catering enquiries.'],
 kitchen:['PARTNER PRODUCTS','Kitchen','Control visibility of existing approved affiliate items.'],
 campaigns:['GROWTH','Campaigns & advertising','Plan offers, manage budgets and create trackable campaign links.'],
 settings:['STORE CONFIGURATION','Shop settings','Read-only operational settings from Neon.']
};
const ORDER=['new','confirmed','out_for_delivery','delivered','cancelled'];
const SUB=['pending','active','paused','cancelled'];
const REQUEST=['new','contacted','confirmed','cancelled'];
let current='overview',rows=[],summary={},filterText='';
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0));
const date=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}):'—';
const str=v=>String(v??'');
function node(tag,className,text){
 const e=document.createElement(tag);
 if(className)e.className=className;
 if(text!==undefined)e.textContent=str(text);
 return e;
}
function button(text,cls='light',onClick){
 const b=node('button','button '+cls,text);b.type='button';
 if(onClick)b.addEventListener('click',onClick);return b;
}
function badge(v){return node('span','pill '+str(v).toLowerCase().replace(/[^a-z0-9_-]/g,''),str(v).replaceAll('_',' '));}
function line(text,sub){const d=node('div');d.append(node('span','row-title',text));if(sub)d.append(node('small','subline',sub));return d;}
function notice(text,error=false){
 const e=$('notice');e.textContent=text;e.className='notice'+(error?' error':'');e.hidden=false;
}
function clearNotice(){$('notice').hidden=true;}
async function api(path,options={}){
 let response;
 try{response=await fetch(BASE+path,{
  ...options,credentials:'same-origin',headers:options.body?{'Content-Type':'application/json'}:{}
 });}catch{throw Error('Could not connect to the admin API.');}
 const data=await response.json().catch(()=>({}));
 if(response.status===401 && path.startsWith('/admin')){showLogin();throw Error('Your admin session expired. Sign in again.');}
 if(!response.ok)throw Error(data.error||'Request failed (HTTP '+response.status+').');
 return data;
}
function showLogin(){
 $('app').hidden=true;$('login-screen').hidden=false;
 $('admin-password').value='';$('admin-password').focus();
}
function showApp(){$('login-screen').hidden=true;$('app').hidden=false;}
async function authenticate(){
 try{
  const d=await api('/admin-auth');
  if(d.authenticated){showApp();await load();}
  else{showLogin();$('login-help').textContent=d.configured?'Use your configured admin password.':'Admin login is not yet configured. Ask the store owner to set ADMIN_PASSWORD_HASH and JWT_SECRET in Vercel.';}
 }catch(e){showLogin();$('login-help').textContent=e.message;}
}
function go(view){
 if(!SECTIONS[view])return;
 current=view;filterText='';$('search').value='';
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const [label,title,subtitle]=SECTIONS[view];
 $('section-label').textContent=label;$('page-breadcrumb').textContent=title;
 $('page-title').textContent=view==='overview'?'Your shop, in control.':title;
 $('page-subtitle').textContent=subtitle;
 $('list-tools').hidden=view==='overview'||view==='settings';
 const actions=$('page-actions');actions.replaceChildren();
 if(view==='campaigns')actions.append(button('+ New campaign','primary',()=>openCampaign()));
 clearNotice();load().catch(e=>notice(e.message,true));
}
async function load(){
 const view=current;
 const result=await api('/admin?view='+encodeURIComponent(view));
 if(current!==view)return;
 if(view==='overview'){summary=result.summary||{};renderOverview();return;}
 rows=Array.isArray(result.rows)?result.rows:[];
 renderList();
}
async function save(payload,label){
 if(!confirm('Save '+label+' to the connected Neon database?'))return;
 const d=await api('/admin',{method:'POST',body:JSON.stringify(payload)});
 if(d.notification&&!d.notification.sent)notice('Alert was not sent: '+str(d.notification.reason),true);
 else notice(label+' saved successfully.');
 await load();
}
function showDetails(title,render){
 $('dialog-title').textContent=title;
 const body=$('dialog-body');body.replaceChildren();render(body);
 $('detail-dialog').showModal();
}
function details(data,keys){
 const dl=node('dl','detail-list');
 for(const [label,key] of keys){
  dl.append(node('dt','',label));
  dl.append(node('dd','',data[key]??'—'));
 }return dl;
}
function makeTable(columns,records){
 const box=node('div','table-scroll'),table=node('table','data-table'),head=node('thead'),tr=node('tr');
 for(const [name] of columns)tr.append(node('th','',name));
 head.append(tr);table.append(head);
 const body=node('tbody');
 for(const entry of records){
  const row=node('tr');
  for(const [,render] of columns){
   const td=node('td');const value=render(entry);
   if(value instanceof Node)td.append(value);else td.textContent=str(value);
   row.append(td);
  }body.append(row);
 }table.append(body);box.append(table);
 return box;
}
function relevant(){
 const q=filterText.toLowerCase().trim();
 if(!q)return rows;
 return rows.filter(r=>Object.values(r).some(v=>{
  if(typeof v==='object')return false;
  return str(v).toLowerCase().includes(q);
 }));
}
function renderList(){
 const filtered=relevant();
 $('record-count').textContent=filtered.length+' of '+rows.length+' records';
 $('view').replaceChildren();
 const renderers={
  orders:renderOrders,products:renderProducts,subscriptions:renderSubscriptions,
  requests:renderRequests,kitchen:renderKitchen,campaigns:renderCampaigns,settings:renderSettings
 };
 if(renderers[current])renderers[current](filtered);
 if(!filtered.length && current!=='settings'){
  const empty=node('div','empty');empty.append(node('strong','','No matching records'),node('p','','Try clearing your search or check this section later.'));
  $('view').append(empty);
 }
}
function renderOverview(){
 $('view').replaceChildren();$('list-tools').hidden=true;
 const kpis=node('div','kpis');
 const values=[
  ['New orders',summary.new_orders,'Awaiting confirmation','orders'],
  ['Orders today',summary.orders_today,'Based on India local date','orders'],
  ['Today\'s sales',money(summary.sales_today),'Excluding cancelled orders','orders'],
  ['Low-stock items',summary.low_stock,'Active products with 5 or fewer left','products'],
  ['Alerts needing attention',summary.pending_alerts,'Pending or failed email notifications','orders'],
  ['Active campaigns',summary.active_campaigns,'Planned campaigns are separate from live ads','campaigns']
 ];
 for(const [label,value,detail,view] of values){
  const card=node('div','kpi');card.append(node('div','label',label),node('div','value',value??'—'),node('small','',detail));
  card.style.cursor='pointer';card.tabIndex=0;card.setAttribute('role','button');
  card.addEventListener('click',()=>go(view));card.addEventListener('keydown',e=>{if(e.key==='Enter')go(view);});
  kpis.append(card);
 }
 $('view').append(kpis);
 const panel=node('section','panel'),head=node('div','panel-head');
 head.append(node('h2','','Quick actions'));panel.append(head);
 const actions=node('div','quick-actions');
 actions.append(button('Review orders','outline',()=>go('orders')),
  button('Edit inventory','outline',()=>go('products')),
  button('Plan a campaign','outline',()=>{go('campaigns');openCampaign();}),
  button('Check customer requests','outline',()=>go('requests')));
 panel.append(actions);
 $('view').append(panel);
 const note=node('section','panel');
 note.append(node('h2','','Store operations checklist'),
  node('p','muted','Confirm new orders promptly, check stock each morning, and monitor failed email alerts. Cancellation does not automatically restore inventory.'));
 $('view').append(note);
}
function editSelect(value,options){
 const select=node('select');for(const s of options){const opt=node('option','',str(s).replaceAll('_',' '));opt.value=s;select.append(opt);}
 select.value=str(value);return select;
}
function renderOrders(data){
 $('view').append(makeTable([
  ['Order',o=>line(o.order_no,date(o.created_at))],
  ['Customer',o=>line(o.customer_name,o.phone)],
  ['Delivery',o=>line(o.delivery_slot,o.pincode)],
  ['Total',o=>line(money(o.total),'Delivery '+money(o.delivery_fee))],
  ['Email alert',o=>{const wrap=node('div');wrap.append(badge(o.alert_status));
   if(o.alert_status!=='sent'&&o.alert_status!=='sending')wrap.append(button('Retry','small light',async()=>{try{await save({action:'retry-alert',id:o.id},'order alert');}catch(e){notice(e.message,true);}}));
   return wrap;}],
  ['Status',o=>{const sel=editSelect(o.status,ORDER);const wrap=node('div');wrap.append(sel,button('Save','small primary',()=>save({action:'order-status',id:o.id,status:sel.value},'order status').catch(e=>notice(e.message,true))));return wrap;}],
  ['Details',o=>button('View','small outline',()=>orderDetail(o))]
 ],data));
}
function orderDetail(o){
 showDetails('Order '+o.order_no,root=>{
  const items=node('ul','item-list');
  for(const i of o.items||[]){const li=node('li');li.append(node('span','',i.name+' × '+i.qty),node('strong','',money(i.total)));items.append(li);}
  root.append(items,details(o,[['Customer','customer_name'],['Phone','phone'],['Address','address'],['Pincode','pincode'],['Delivery time','delivery_slot'],['Notes','notes'],['Subtotal','subtotal'],['Delivery fee','delivery_fee'],['Total','total'],['Status','status'],['Email alert','alert_status']]));
  const chat=node('a','button light','Message customer on WhatsApp ↗');chat.href='https://wa.me/91'+o.phone;chat.target='_blank';chat.rel='noopener noreferrer';root.append(node('p'),chat);
 });
}
function renderProducts(data){
 $('view').append(makeTable([
  ['Item',p=>line(p.name_en,p.name_bn+' · '+p.kind+' · '+p.unit)],
  ['Category',p=>p.category],
  ['Price ₹',p=>{const n=node('input');n.type='number';n.step='0.01';n.min='0';n.max='99999999';n.value=p.price;n.dataset.field='price';n.dataset.id=p.id;n.setAttribute('aria-label','Price for '+p.name_en);return n;}],
  ['Stock',p=>{const n=node('input');n.type='number';n.step='1';n.min='0';n.max='1000000';n.value=p.stock;n.dataset.field='stock';n.dataset.id=p.id;n.setAttribute('aria-label','Stock for '+p.name_en);return n;}],
  ['Visible',p=>{const n=editSelect(str(p.active),['true','false']);n.dataset.field='active';n.dataset.id=p.id;return n;}],
  ['Update',p=>button('Save changes','small primary',()=>{
   const field=k=>$('view').querySelector('[data-id="'+p.id+'"][data-field="'+k+'"]').value;
   save({action:'product',id:p.id,price:Number(field('price')),stock:Number(field('stock')),active:field('active')==='true'},p.name_en+' inventory').catch(e=>notice(e.message,true));
  })]
 ],data));
}
function renderSubscriptions(data){
 $('view').append(makeTable([
  ['Request',r=>line(r.sub_code,date(r.created_at))],
  ['Customer',r=>line(r.customer_name,r.phone)],
  ['Schedule',r=>line(r.frequency,r.slot)],
  ['Status',r=>{const sel=editSelect(r.status,SUB);const w=node('div');w.append(sel,button('Save','small primary',()=>save({action:'subscription-status',id:r.id,status:sel.value},'Morning Pass').catch(e=>notice(e.message,true))));return w;}],
  ['Details',r=>button('View','small outline',()=>showDetails('Morning Pass '+r.sub_code,root=>{
   root.append(details(r,[['Customer','customer_name'],['Phone','phone'],['Address','address'],['Start','start_date'],['Status','status']]));
   const list=node('ul','item-list');for(const i of r.items||[])list.append(node('li','',i.name+' × '+i.qty));root.append(list);
  }))]
 ],data));
}
function renderRequests(data){
 $('view').append(makeTable([
  ['Type',r=>line(r.request_type,date(r.created_at))],
  ['Customer',r=>line(r.contact_name,r.phone)],
  ['Event',r=>line(r.event_date||'To confirm',r.guest_count?str(r.guest_count)+' guests':'')],
  ['Status',r=>{const sel=editSelect(r.status,REQUEST),w=node('div');w.append(sel,button('Save','small primary',()=>save({action:'request-status',id:r.id,status:sel.value},'enquiry status').catch(e=>notice(e.message,true))));return w;}],
  ['Details',r=>button('View','small outline',()=>showDetails('Customer enquiry',root=>root.append(details(r,[['Name','contact_name'],['Phone','phone'],['Address','address'],['Event','event_date'],['Guests','guest_count'],['Requirements','notes'],['Status','status']]))))]
 ],data));
}
function renderKitchen(data){
 $('view').append(makeTable([
  ['Partner product',r=>line(r.title,r.store)],
  ['Category',r=>r.category],
  ['Approx price',r=>money(r.approx_price)],
  ['Live listing',r=>{const sel=editSelect(str(r.active),['true','false']),w=node('div');w.append(sel,button('Save','small primary',()=>save({action:'kitchen-status',id:r.id,active:sel.value==='true'},'kitchen item').catch(e=>notice(e.message,true))));return w;}],
  ['Partner',r=>{const a=node('a','','Visit store ↗');a.href=r.affiliate_url;a.target='_blank';a.rel='noopener noreferrer sponsored';return a;}]
 ],data));
}
function campaignLink(r){
 const u=new URL(r.landing_path||'/',window.location.origin);
 u.searchParams.set('utm_source',r.channel);
 u.searchParams.set('utm_medium',['google','facebook','instagram'].includes(r.channel)?'paid':'organic');
 u.searchParams.set('utm_campaign',str(r.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'campaign-'+r.id);
 return u.href;
}
function renderCampaigns(data){
 const note=node('div','ad-note','Campaigns organize budgets, schedules and trackable store links. This does not publish or manage spend inside Meta or Google Ads. To measure conversions, connect analytics separately.');
 $('view').append(note);
 $('view').append(makeTable([
  ['Campaign',r=>line(r.name,r.objective)],
  ['Channel',r=>r.channel],
  ['Status',r=>badge(r.status)],
  ['Budget / spend',r=>line(money(r.budget),money(r.spend)+' spent')],
  ['Dates',r=>line(r.start_date||'—',r.end_date||'—')],
  ['Actions',r=>{const wrap=node('div');wrap.append(button('Edit','small outline',()=>openCampaign(r)),button('Copy link','small light',async()=>{
   try{await navigator.clipboard.writeText(campaignLink(r));notice('Tracking link copied.');}
   catch{showDetails('Campaign link',root=>root.append(node('p','',campaignLink(r))));}
  }));return wrap;}]
 ],data));
 const footer=node('section','panel');
 footer.append(node('h3','','Launch your advertising'),node('p','muted','Build creative and target audiences in your ad account. Record campaign spend here manually.'));
 const a=node('a','button outline','Meta Ads Manager ↗');a.href='https://business.facebook.com/adsmanager';a.target='_blank';a.rel='noopener noreferrer';
 const g=node('a','button outline','Google Ads ↗');g.href='https://ads.google.com/';g.target='_blank';g.rel='noopener noreferrer';
 footer.append(a,node('span','', ' '),g);$('view').append(footer);
}
function renderSettings(data){
 $('list-tools').hidden=true;
 const grid=node('div','setting-grid');
 for(const s of data){const card=node('div','setting');card.append(node('strong','',s.key.replaceAll('_',' ')),node('code','',typeof s.value==='object'?JSON.stringify(s.value):s.value));grid.append(card);}
 $('view').append(grid);
 const p=node('p','hint','Settings are read-only in this release. Changing delivery fees, service areas or shop contact requires a separately reviewed configuration update.');
 $('view').append(p);
}
function openCampaign(c={}){
 const form=$('campaign-form');form.reset();
 for(const [k,v] of Object.entries(c)){if(form.elements.namedItem(k))form.elements.namedItem(k).value=v??'';}
 $('campaign-dialog-title').textContent=c.id?'Edit campaign':'New campaign';
 $('campaign-dialog').showModal();
}
document.addEventListener('DOMContentLoaded',()=>{
 $('login-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,submit=form.querySelector('button[type=submit]');submit.disabled=true;
  try{
   await api('/admin-auth',{method:'POST',body:JSON.stringify({action:'login',password:form.password.value})});
   form.reset();showApp();await load();
  }catch(e){$('login-help').textContent=e.message;}
  finally{submit.disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{
  try{await api('/admin-auth',{method:'POST',body:JSON.stringify({action:'logout'})});}catch{}
  showLogin();
 });
 document.querySelectorAll('[data-view]').forEach(n=>n.addEventListener('click',()=>go(n.dataset.view)));
 $('refresh').addEventListener('click',()=>load().then(()=>notice('Updated from Neon.')).catch(e=>notice(e.message,true)));
 $('search').addEventListener('input',event=>{filterText=event.target.value;renderList();});
 $('close-dialog').addEventListener('click',()=>$('detail-dialog').close());
 $('close-campaign').addEventListener('click',()=>$('campaign-dialog').close());
 $('cancel-campaign').addEventListener('click',()=>$('campaign-dialog').close());
 $('campaign-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));if(!data.id)delete data.id;
  data.budget=Number(data.budget);data.spend=Number(data.spend);
  const b=form.querySelector('button[type=submit]');b.disabled=true;
  try{await api('/admin',{method:'POST',body:JSON.stringify({action:'campaign-save',...data})});$('campaign-dialog').close();notice('Campaign saved.');await load();}
  catch(e){notice(e.message,true);}finally{b.disabled=false;}
 });
 authenticate();
});
