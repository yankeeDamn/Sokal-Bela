'use strict';
/* ===== EDIT ME: READY BASKETS ONLY. Prices/stock/phone/settings are loaded from Neon.
   Do not put passwords, tokens or database URLs in this file. ===== */
const BASKETS=[
 {name:'Family Basket · পরিবার',items:[['Potato',2],['Onion',2],['Tomato',1],['Brinjal',1]]},
 {name:'Small Family · ছোট পরিবার',items:[['Potato',1],['Onion',1],['Tomato',1]]},
 {name:'Salad Pack · সালাদ',items:[['Cucumber',1],['Carrot',1],['Tomato',1]]}
];
const BASE='/api/v2',KEY='sokal-bela-pg-cart-v1', $=id=>document.getElementById(id);
let products=[],cart=[],category='All',settingsReady=false,shop={shopPhone:'',minOrder:0,freeDeliveryMin:1,radiusKm:0,deliveryFee:0,deliveryPincodes:[]};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const wa=text=>'https://wa.me/'+'91'+String(shop.shopPhone).replace(/\D/g,'')+'?text='+encodeURIComponent(text);
function flash(message,isError=false){const el=$('flash');el.textContent=message;el.className=isError?'error':'';el.hidden=false;clearTimeout(flash.timeout);flash.timeout=setTimeout(()=>el.hidden=true,6000);}
async function api(path,options={}){
 // Vercel's protected Preview deployment uses a same-origin authentication
 // cookie. Omitting credentials prevents the storefront from calling its own API.
 let response;
 try{
  response=await fetch(BASE+path,{...options,credentials:'same-origin',redirect:'follow',
   headers:options.body?{'Content-Type':'application/json'}:{}});
 }catch{throw Error('Could not connect to the store API. Check your connection.');}
 const type=response.headers.get('content-type')||'';
 const redirectedToLogin=response.redirected &&
   /(?:vercel\.com|vercel\.app)/i.test(new URL(response.url).hostname) &&
   !new URL(response.url).pathname.startsWith('/api/v2/');
 if(!type.includes('application/json')){
  if(redirectedToLogin||response.status===401||response.status===403)
   throw Error('Preview authentication required. Sign in to Vercel using this same Preview address, then reload.');
  throw Error('The store API returned a web page instead of JSON (HTTP '+response.status+'). Check Vercel Deployment Protection or Function Logs.');
 }
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||'Store API error (HTTP '+response.status+').');
 return data;
}
function sanitizeCart(items){
 const map=new Map();
 if(!Array.isArray(items))return [];
 for(const item of items){
  if(!/^[1-9][0-9]{0,14}$/.test(String(item?.id)))continue;
  const id=String(item.id),qty=Math.max(1,Math.min(50,Math.floor(Number(item.qty)||1)));
  map.set(id,Math.min(50,(map.get(id)||0)+qty));
 }
 return [...map].map(([id,qty])=>({id,qty}));
}
function readCart(){try{return sanitizeCart(JSON.parse(localStorage.getItem(KEY)||'[]'));}catch{return [];}}
function persist(){cart=sanitizeCart(cart);localStorage.setItem(KEY,JSON.stringify(cart));renderCart();}
const byId=id=>products.find(p=>String(p.id)===String(id));
const cartLines=()=>cart.map(c=>({...c,product:byId(c.id)})).filter(c=>c.product);
function addToCart(id,qty){
 const p=byId(id),n=Number(qty);
 if(!p||p.stock<1)return flash('Product is not currently available.',true);
 if(!Number.isInteger(n)||n<1||n>50)return flash('Quantity must be 1 to 50.',true);
 const item=cart.find(x=>x.id===String(id)),newQty=Math.min(50,p.stock,(item?.qty||0)+n);
 if(item)item.qty=newQty;else cart.push({id:String(id),qty:newQty});
 persist();flash('Added to basket · ঝুড়িতে যোগ হয়েছে');
}
function setQty(id,qty){
 const item=cart.find(x=>x.id===String(id));
 if(!item)return;
 const n=Number(qty);
 if(!Number.isInteger(n))return;
 if(n<=0){cart=cart.filter(x=>x.id!==String(id));persist();return;}
 item.qty=Math.min(50,byId(id)?.stock||n,n);persist();
}
function go(id){
 if(id==='products'){go('vegetables');requestAnimationFrame(()=>$('products').scrollIntoView({behavior:'smooth'}));return;}
 if(id==='bulk'||id==='catering'){
  $('request-title').textContent=id==='bulk'?'🌾 Bulk Orders · পাইকারি অর্ডার':'🍽️ Catering Enquiry · ক্যাটারিং';
  $('request-type').value=id;id='request';
 }
 const screen=$(id);if(!screen||!screen.classList.contains('screen'))return;
 document.querySelectorAll('.screen').forEach(node=>node.classList.toggle('active',node.id===id));
 document.querySelectorAll('.tab').forEach(node=>{const active=node.dataset.go===id;node.classList.toggle('active',active);node.setAttribute('aria-current',active?'page':'false');});
 if(id==='checkout'){
  const lines=cartLines();
  const count=lines.length;
  const total=lines.reduce((sum,line)=>sum+Math.round(Number(line.product.price)*100)*line.qty,0)/100;
  if(!settingsReady || !count || count>40 || total<shop.minOrder){
   flash(!count?'Your cart is empty. Add a vegetable first.':'Review your cart before checkout.',true);
   id='cart';
   document.querySelectorAll('.screen').forEach(node=>node.classList.toggle('active',node.id===id));
  }
 }
 if(id==='cart'||id==='checkout')renderCart();
 window.scrollTo({top:0,behavior:'auto'});
}
function renderProducts(){
 const q=$('search').value.toLowerCase().trim();
 const cats=['All',...new Set(products.map(p=>p.category))];
 $('categories').innerHTML=cats.map(c=>'<button type="button" class="chip'+(category===c?' active':'')+'" data-cat="'+escapeHtml(c)+'">'+escapeHtml(c)+'</button>').join('');
 const list=products.filter(p=>(category==='All'||p.category===category)&&[p.name_en,p.name_bn,p.category].some(x=>String(x||'').toLowerCase().includes(q)));
 $('item-count').textContent=list.length+' items';
 $('product-grid').innerHTML=list.length?list.map(p=>{
  const img=typeof p.image_url==='string'&&/^https:\/\//i.test(p.image_url);
  const picture=img?'<img src="'+escapeHtml(p.image_url)+'" alt="'+escapeHtml(p.name_en)+'" loading="lazy" onerror="this.nextElementSibling.hidden=false;this.remove();">':'';
  const emoji='<span class="emoji"'+(img?' hidden':'')+'>'+escapeHtml(p.emoji||'🥬')+'</span>';
  return '<article class="product"><div class="visual">'+picture+emoji+
   (p.stock<1?'<span class="stock-badge">Sold out</span>':p.stock<=5?'<span class="stock-badge">Only '+p.stock+' left</span>':'')+'</div>'+
   '<div class="info"><h3>'+escapeHtml(p.name_en)+' <span lang="bn">'+escapeHtml(p.name_bn)+'</span></h3><p>'+escapeHtml(p.category)+'</p><div class="price">'+money(p.price)+' / '+escapeHtml(p.unit)+'</div></div>'+
   '<div class="actions"><input type="number" min="1" max="50" value="1" aria-label="Quantity for '+escapeHtml(p.name_en)+'" data-qty="'+p.id+'" '+(p.stock<1?'disabled':'')+'>'+
   '<button class="button primary" data-add="'+p.id+'" '+(p.stock<1?'disabled':'')+'>Add · যোগ</button></div></article>';
 }).join(''):'<p>No items are active yet. The owner must enter real prices and stock in Neon before enabling products.</p>';
 $('bucket-product').innerHTML=products.filter(p=>p.stock>0).map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name_en)+' · '+money(p.price)+'</option>').join('');
}
function renderBaskets(){
 $('baskets').innerHTML=BASKETS.map((b,i)=>'<div class="basket"><div><strong>'+escapeHtml(b.name)+'</strong><small>'+b.items.map(x=>escapeHtml(x.join(' ×'))).join(', ')+'</small></div><button type="button" class="button outline" data-basket="'+i+'">Add</button></div>').join('');
}
function addBasket(index){
 const basket=BASKETS[index];if(!basket)return;
 let n=0;
 for(const [name,qty] of basket.items){
  const p=products.find(p=>p.name_en.toLowerCase()===name.toLowerCase()&&p.stock>0);if(!p)continue;
  const line=cart.find(c=>c.id===String(p.id));
  if(line)line.qty=Math.min(50,p.stock,line.qty+qty);else cart.push({id:String(p.id),qty:Math.min(p.stock,qty)});
  n++;
 }
 if(n){persist();flash(n+' available products added. Review cart.');}else flash('None of these basket products are currently available.',true);
}
function renderCart(){
 $('badge').textContent=cart.reduce((s,x)=>s+x.qty,0);
 const rows=cartLines(),subtotalCents=rows.reduce((s,x)=>s+Math.round(Number(x.product.price)*100)*x.qty,0);
 const subtotal=subtotalCents/100,fee=subtotal>=shop.freeDeliveryMin?0:shop.deliveryFee;
 $('cart-lines').innerHTML=rows.length?rows.map(x=>'<div class="cart-line"><div><strong>'+escapeHtml(x.product.name_en)+' · '+escapeHtml(x.product.name_bn)+'</strong><small>'+money(x.product.price)+' / '+escapeHtml(x.product.unit)+'</small><button type="button" class="text-button" data-remove="'+x.id+'">Remove</button></div><input type="number" min="0" max="50" value="'+x.qty+'" aria-label="Quantity" data-line="'+x.id+'"><strong>'+money(x.product.price*x.qty)+'</strong></div>').join(''):'<p>Your cart is empty.</p>';
 $('subtotal').textContent=money(subtotal);$('delivery-fee').textContent=money(rows.length?fee:0);$('grand-total').textContent=money(rows.length?subtotal+fee:0);
 $('free-progress').max=shop.freeDeliveryMin;$('free-progress').value=Math.min(subtotal,shop.freeDeliveryMin);
 $('progress-msg').textContent=!settingsReady?'Store settings are loading…':subtotal<shop.minOrder?'Add '+money(shop.minOrder-subtotal)+' for the minimum order.':
 subtotal<shop.freeDeliveryMin?'Minimum reached! Add '+money(shop.freeDeliveryMin-subtotal)+' for free delivery within '+shop.radiusKm+' km.':'Free delivery threshold reached (within '+shop.radiusKm+' km).';
 $('checkout-go').disabled=!settingsReady||!rows.length||subtotal<shop.minOrder;
 $('checkout-policy').textContent=settingsReady?'Minimum '+money(shop.minOrder)+' · Free delivery '+money(shop.freeDeliveryMin)+'+ within '+shop.radiusKm+' km. Cash or UPI on delivery.':'Loading store settings…';
}
async function checkout(event){
 event.preventDefault();
 if(!settingsReady)return flash('Shop settings unavailable. Checkout is disabled.',true);
 const lines=cartLines();
 if(lines.length<1 || lines.length>40){
  flash('Your cart is empty or has too many products. Return to Cart and add a vegetable.',true);
  go('cart');
  return;
 }
 const subtotal=lines.reduce((sum,line)=>sum+Math.round(Number(line.product.price)*100)*line.qty,0)/100;
 if(subtotal<shop.minOrder){
  flash('Minimum order is '+money(shop.minOrder)+'. Please add more items.',true);
  go('cart');
  return;
 }
 const btn=$('place-order'),values=Object.fromEntries(new FormData(event.currentTarget));
 values.items=lines.map(x=>({productId:x.id,qty:x.qty}));
 btn.disabled=true;btn.textContent='Saving order…';
 try{
  const data=await api('/orders',{method:'POST',body:JSON.stringify(values)});
  $('order-number').textContent=data.orderNo;$('success-total').textContent='Total: '+money(data.total);
  const rows=lines.map(x=>x.product.name_en+' × '+x.qty).join('\n');
  $('send-whatsapp').href=wa('Sokal Bela order '+data.orderNo+'\n'+rows+'\nTotal: ₹'+data.total+'\nName: '+values.customerName+'\nPhone: '+values.phone+'\nAddress: '+values.address+'\nPincode: '+values.pincode+'\nDelivery time: '+values.deliverySlot+'\nNotes: '+(values.notes||'-')+'\nConfirm by WhatsApp, pay cash or UPI on delivery.');
  cart=[];persist();event.currentTarget.reset();go('success');$('send-whatsapp').focus();
 }catch(e){flash(e.message,true);await refresh().catch(()=>{});}
 finally{btn.disabled=false;btn.textContent='Confirm Order · অর্ডার করুন';}
}
async function lookup(event){
 event.preventDefault();const f=new FormData(event.currentTarget);
 $('lookup-result').textContent='Checking…';
 try{const d=await api('/order-lookup?phone='+encodeURIComponent(f.get('phone'))+'&order_no='+encodeURIComponent(f.get('order_no')));
 $('lookup-result').textContent='Order '+d.order.order_no+' · '+d.order.status+' · '+money(d.order.total)+' · '+d.order.delivery_slot;}
 catch(e){$('lookup-result').textContent=e.message;}
}
async function enquiry(event){
 event.preventDefault();
 if(!settingsReady)return flash('Shop settings unavailable. Please retry later.',true);const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
 values.items=[];const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{
  const r=await api('/requests',{method:'POST',body:JSON.stringify(values)});
  const message='Sokal Bela '+values.type+' request #'+r.requestId+'\nName: '+values.contactName+'\nPhone: '+values.phone+'\nAddress/venue: '+values.address+'\nEvent: '+(values.eventDate||'To confirm')+'\nGuests: '+(values.guestCount||'-')+'\nRequirements: '+values.notes;
  $('request-result').innerHTML='<p>Request saved. Send the details on WhatsApp:</p><a class="button whats" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(wa(message))+'">Send on WhatsApp</a>';form.reset();
 }catch(e){flash(e.message,true);}finally{button.disabled=false;}
}
async function refresh(){
 const d=await api('/products?kind=vegetable');products=d.products||[];renderProducts();renderCart();
}
async function start(){
 cart=readCart();renderBaskets();renderCart();
 document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-go]');if(nav){event.preventDefault();go(nav.dataset.go);return;}
  const cat=event.target.closest('[data-cat]');if(cat){category=cat.dataset.cat;renderProducts();return;}
  const add=event.target.closest('[data-add]');if(add){addToCart(add.dataset.add,document.querySelector('[data-qty="'+add.dataset.add+'"]')?.value);return;}
  const basket=event.target.closest('[data-basket]');if(basket){addBasket(Number(basket.dataset.basket));return;}
  const rem=event.target.closest('[data-remove]');if(rem){setQty(rem.dataset.remove,0);}
 });
 document.addEventListener('change',event=>{if(event.target.matches('[data-line]'))setQty(event.target.dataset.line,event.target.value);});
 $('search').addEventListener('input',renderProducts);
 $('bucket-form').addEventListener('submit',event=>{event.preventDefault();addToCart($('bucket-product').value,Number($('bucket-qty').value));});
 $('checkout-form').addEventListener('submit',checkout);
 $('lookup-form').addEventListener('submit',lookup);
 $('request-form').addEventListener('submit',enquiry);
 try{
  const d=await api('/settings');shop={...shop,...d.settings};settingsReady=true;
  const formatTime=value=>{
   const [h,m]=String(value||'').split(':').map(Number);
   if(!Number.isInteger(h)||h<0||h>23)return '?';
   return ((h%12)||12)+(m?':'+String(m).padStart(2,'0'):'')+(h>=12?' PM':' AM');
  };
  const hours=shop.shopHours?formatTime(shop.shopHours.open)+'–'+formatTime(shop.shopHours.close):'';
  $('banner').textContent='🚚 Min '+money(shop.minOrder)+' · Free delivery '+money(shop.freeDeliveryMin)+'+ within '+shop.radiusKm+' km'+(hours?' · '+hours:'');
  $('floating-whatsapp').href=wa('Hello Sokal Bela, I would like to order vegetables.');renderCart();
 }catch(e){flash('Settings: '+e.message,true);$('banner').textContent='Store temporarily unavailable';}
 try{await refresh();}catch(e){$('product-grid').textContent='Could not load vegetables: '+e.message;flash(e.message,true);}
}
document.addEventListener('DOMContentLoaded',start);
