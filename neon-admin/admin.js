'use strict';
const BASE='/api/v2',VIEWS=['orders','products','subscriptions','requests','kitchen','settings'];
const $=id=>document.getElementById(id);
let view='orders',rows=[];
async function request(path,options={}){
 const response=await fetch(BASE+path,{...options,credentials:'same-origin',
  headers:options.body?{'Content-Type':'application/json'}:{}});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Request failed');
 return data;
}
function message(s){$('admin-message').textContent=s;}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text??'');return n;}
function control(tag,value,options){
 const n=document.createElement(tag);
 if(tag==='select'){for(const v of options){const o=el('option',v);o.value=v;n.append(o);}}
 else{n.type='text';n.value=String(value??'');}
 if(tag==='select')n.value=String(value??'');
 return n;
}
function cell(row,text){const td=el('td',text);row.append(td);return td;}
function render(){
 const root=$('admin-view');root.replaceChildren();
 const table=el('table'),thead=el('thead'),head=el('tr'),body=el('tbody');
 const keys=rows.length?Object.keys(rows[0]):[];
 for(const key of keys)head.append(el('th',key.replaceAll('_',' ')));
 if(view!=='settings')head.append(el('th','Action'));
 thead.append(head);table.append(thead);
 for(const item of rows){
  const tr=el('tr'),inputs={};
  for(const key of keys){
   const td=el('td');
   const editable=(view==='products'&&['price','stock','active'].includes(key))||
    (view==='orders'&&key==='status')||
    (view==='subscriptions'&&key==='status')||
    (view==='requests'&&key==='status')||
    (view==='kitchen'&&key==='active');
   if(editable){
    let opts=null;
    if(key==='active')opts=['false','true'];
    if(key==='status')opts=view==='orders'?['new','confirmed','out_for_delivery','delivered','cancelled']:
     view==='subscriptions'?['pending','active','paused','cancelled']:['new','contacted','confirmed','cancelled'];
    const input=control(opts?'select':'input',item[key],opts);
    input.setAttribute('aria-label',key+' for record '+item.id);
    inputs[key]=input;td.append(input);
   }else td.textContent=typeof item[key]==='object'?JSON.stringify(item[key]):String(item[key]??'');
   tr.append(td);
  }
  if(view!=='settings'){
   const td=el('td'),button=el('button','Save');
   button.type='button';button.className='button outline';
   button.addEventListener('click',async()=>{
    const action={products:'product',orders:'order-status',subscriptions:'subscription-status',requests:'request-status',kitchen:'kitchen-status'}[view];
    const payload={action,id:item.id};
    for(const [key,input] of Object.entries(inputs))
     payload[key]=key==='active'?input.value==='true':key==='stock'?Number(input.value):key==='price'?Number(input.value):input.value;
    if(!confirm('Save changes to '+view+' record #'+item.id+'?'))return;
    button.disabled=true;
    try{await request('/admin',{method:'POST',body:JSON.stringify(payload)});message('Saved record #'+item.id);await load();}
    catch(e){message(e.message);}finally{button.disabled=false;}
   });
   td.append(button);tr.append(td);
  }
  body.append(tr);
 }
 table.append(body);root.append(table);
 if(!rows.length)root.append(el('p','No records found.'));
 $('view-note').textContent=view==='settings'?'Settings are read-only in this first admin release.':
  view==='kitchen'?'Only existing kitchen items can be enabled or disabled. New partner links require a separate approved import.':
  'Review changes carefully before saving. There is no automatic stock restoration on order cancellation.';
}
async function load(){
 const d=await request('/admin?view='+encodeURIComponent(view));rows=d.rows;render();
}
async function check(){
 try{
  const d=await request('/admin-auth');
  $('login-panel').hidden=d.authenticated;$('dashboard').hidden=!d.authenticated;
  if(!d.configured)message('Admin is not configured. Set ADMIN_PASSWORD_HASH and JWT_SECRET securely in Vercel.');
  if(d.authenticated)await load();
 }catch(e){message(e.message);}
}
document.addEventListener('DOMContentLoaded',()=>{
 const nav=$('views');
 for(const name of VIEWS){
  const b=el('button',name);b.type='button';b.className='button outline';
  b.addEventListener('click',()=>{view=name;load().catch(e=>message(e.message));});nav.append(b);
 }
 $('login-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;
  try{await request('/admin-auth',{method:'POST',body:JSON.stringify({action:'login',password:new FormData(form).get('password')})});form.reset();message('Signed in');await check();}
  catch(e){message(e.message);}
 });
 $('logout').addEventListener('click',async()=>{
  try{await request('/admin-auth',{method:'POST',body:JSON.stringify({action:'logout'})});rows=[];$('admin-view').replaceChildren();await check();}
  catch(e){message(e.message);}
 });
 check();
});
