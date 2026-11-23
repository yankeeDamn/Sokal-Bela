'use strict';
const crypto=require('node:crypto');
const c=require('../neon-core');
const a=require('../auth-core');
const pay=require('../payments-core');
const alerts=require('../order-alerts');
function cents(n) { return Math.round(Number(n)*100); }
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'POST'))return;
 let client;
 try{
  c.validateHoneypot(req.body);
  const b=req.body;
  const name=c.required(b.customerName,120,'Name'),phone=c.phone(b.phone),
   address=c.required(b.address,500,'Address'),pincode=c.pin(b.pincode),
   slot=c.required(b.deliverySlot,100,'Delivery time'),notes=c.clean(b.notes,500);
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>40)throw c.bad('Cart must contain 1 to 40 items.');
  const basket=new Map();
  for(const item of b.items){
   if(!item || !/^[1-9][0-9]{0,14}$/.test(String(item.productId)))throw c.bad('Invalid product in cart.');
   if(!Number.isInteger(item.qty)||item.qty<1||item.qty>50)throw c.bad('Quantity must be between 1 and 50.');
   const id=String(item.productId);
   basket.set(id,(basket.get(id)||0)+item.qty);
   if(basket.get(id)>50)throw c.bad('Maximum 50 units per product.');
  }
  const method=b.paymentMethod===undefined?'cod':b.paymentMethod;
  if(!['cod','online'].includes(method))throw c.bad('Choose cash on delivery or online payment.');
  await c.enforceLimit(req,'orders',5,15);
  const user=await a.currentUser(req);
  if(method==='online'&&!(await pay.onlineEnabled(c.db())))throw c.bad('Online payment is not available right now. Please choose cash on delivery.','PAYMENTS_DISABLED',409);
  client=await c.db().connect();
  await client.query('BEGIN');
  const s=await c.settings(client);
  if(s.deliveryPincodes.length&&!s.deliveryPincodes.includes(pincode))throw c.bad('Delivery is not available for this pincode. Please call or WhatsApp us.','OUTSIDE_DELIVERY_AREA',422);
  const ids=[...basket.keys()].sort((a,b)=>BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0);
  const selected=await client.query("SELECT id::text,name_en,name_bn,unit,pack_size,price::text,stock,active FROM products WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE",[ids]);
  if(selected.rowCount!==ids.length)throw c.bad('Some products are no longer available. Please refresh the cart.','PRODUCT_UNAVAILABLE',409);
  let subtotal=0;
  const lines=[];
  for(const p of selected.rows){
   const qty=basket.get(p.id);
   if(!p.active||Number(p.price)<=0)throw c.bad(p.name_en+' is unavailable.','PRODUCT_UNAVAILABLE',409);
   if(p.stock<qty)throw c.bad('Only '+p.stock+' left of '+p.name_en+'.','STOCK_CHANGED',409);
   const unitCents=cents(p.price);
   subtotal+=unitCents*qty;
   lines.push({p,qty,lineCents:unitCents*qty});
  }
  if(subtotal<cents(s.minOrder))throw c.bad('Minimum order is ₹'+s.minOrder+'. Add ₹'+((cents(s.minOrder)-subtotal)/100).toFixed(2)+' more.','MIN_ORDER',422);
  const delivery=subtotal>=cents(s.freeDeliveryMin)?0:cents(s.deliveryFee);
  const orderNo='SB-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  const ins=await client.query(
   "INSERT INTO orders (order_no,customer_name,phone,address,pincode,delivery_slot,notes,subtotal,delivery_fee,total,status,user_id,payment_method,payment_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new',$11,$12,$13) RETURNING id::text",
   [orderNo,name,phone,address,pincode,slot,notes,(subtotal/100).toFixed(2),(delivery/100).toFixed(2),((subtotal+delivery)/100).toFixed(2),user?user.id:null,method,method==='online'?'pending':'unpaid']
  );
  for(const {p,qty,lineCents} of lines){
   await client.query("INSERT INTO order_items(order_id,product_id,name_snapshot,unit_snapshot,price_snapshot,qty,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [ins.rows[0].id,p.id,p.name_en+(p.pack_size?' · '+p.pack_size:''),p.unit,p.price,qty,(lineCents/100).toFixed(2)]);
   await client.query("UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2 AND stock >= $1",[qty,p.id]);
  }
  // Queue inside the same order transaction. Missing migration must never
  // roll back a customer's paid-or-payable order; deploy the migration first.
  await client.query('SAVEPOINT order_alert_queue');
  try {
   await client.query('INSERT INTO order_alerts(order_id) VALUES($1) ON CONFLICT DO NOTHING',[ins.rows[0].id]);
   await client.query('RELEASE SAVEPOINT order_alert_queue');
  }catch(alertError){
   await client.query('ROLLBACK TO SAVEPOINT order_alert_queue');
   await client.query('RELEASE SAVEPOINT order_alert_queue');
   console.error('Order alert queue unavailable:',/^[A-Z0-9_]{3,12}$/.test(alertError.code||'')?alertError.code:'QUEUE_ERROR');
  }
  await client.query('COMMIT');
  const total=((subtotal+delivery)/100).toFixed(2);
  const result={ok:true,orderNo,subtotal:(subtotal/100).toFixed(2),deliveryFee:(delivery/100).toFixed(2),total,status:'new',paymentMethod:method};
  if(method==='online'){
   // The order (and its stock reservation) is already saved. If the gateway is
   // down the shopper can retry from My Orders, so do not fail the whole order.
   try{Object.assign(result,{payment:await pay.startPayment(c.db(),req,{orderId:ins.rows[0].id,userId:user?user.id:null,amount:total,customer:{id:user?user.id:phone,phone,name},refPrefix:orderNo})});}
   catch(e){result.paymentError=e.message;}
  }
  return c.respond(res,201,result);
  // Notification delivery must not turn an already-committed order into an
  // apparent checkout failure. Failed alerts stay visible in the admin.
  try {await alerts.dispatch(ins.rows[0].id);}catch(error){console.error('Order alert transport unavailable');}
  return c.respond(res,201,{ok:true,orderNo,subtotal:(subtotal/100).toFixed(2),deliveryFee:(delivery/100).toFixed(2),total:((subtotal+delivery)/100).toFixed(2),status:'new'});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return c.fail(res,e);}
 finally{client?.release();}
};
