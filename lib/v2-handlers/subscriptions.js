'use strict';
const crypto=require('node:crypto');
const c=require('../neon-core');
const a=require('../auth-core');
// Morning Pass is a REQUEST until the shop confirms it; never auto-charge
// or decrement stock on a subscription request.
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'POST'))return;
 let client;
 try{
  const user=await a.requireUser(req,res);if(!user)return;
  c.validateHoneypot(req.body);
  const b=req.body;
  const name=c.required(b.customerName,120,'Name'),phone=c.phone(b.phone),
   address=c.required(b.address,500,'Address'),pincode=c.pin(b.pincode),
   notes=c.clean(b.notes,500);
  if(!['06:00-08:00','07:00-09:00','08:00-10:00'].includes(b.slot))
   throw c.bad('Choose a valid morning delivery slot.');
  if(!['daily','mon_sat','weekly'].includes(b.frequency))
   throw c.bad('Choose a valid delivery frequency.');
  if(typeof b.startDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.startDate)||
    !Number.isFinite(Date.parse(b.startDate))||
    new Date(b.startDate).toISOString().slice(0,10)!==b.startDate)
   throw c.bad('Choose a valid start date.');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today=parts.year+'-'+parts.month+'-'+parts.day;
  if(b.startDate<today)throw c.bad('Start date cannot be in the past.');
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>20)
   throw c.bad('Choose 1 to 20 products.');
  const quantities=new Map();
  for(const item of b.items){
   if(!item||!/^[1-9][0-9]{0,14}$/.test(String(item.productId))||
      !Number.isInteger(item.qty)||item.qty<1||item.qty>50)
    throw c.bad('Invalid product or quantity.');
   const id=String(item.productId);
   quantities.set(id,(quantities.get(id)||0)+item.qty);
   if(quantities.get(id)>50)throw c.bad('Maximum 50 units per product.');
  }
  await c.enforceLimit(req,'subscriptions',3,30);
  client=await c.db().connect();
  await client.query('BEGIN');
  const settings=await c.settings(client);
  if(settings.deliveryPincodes.length&&!settings.deliveryPincodes.includes(pincode))
   throw c.bad('Delivery is not available for this pincode. Please contact the shop.','OUTSIDE_DELIVERY_AREA',422);
  const ids=[...quantities.keys()];
  const rows=await client.query(
   "SELECT id::text,name_en FROM products WHERE id=ANY($1::bigint[]) AND kind IN ('dairy','newspaper') AND active=TRUE AND stock>0 AND price>0",
   [ids]);
  if(rows.rowCount!==ids.length)throw c.bad('Some products are unavailable. Please refresh.','PRODUCT_UNAVAILABLE',409);
  const code='MP-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  const saved=await client.query(
   "INSERT INTO subscriptions(sub_code,customer_name,phone,address,pincode,slot,frequency,start_date,status,notes,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10) RETURNING id::text",
   [code,name,phone,address,pincode,b.slot,b.frequency,b.startDate,notes,user.id]);
  for(const [id,qty] of quantities)
   await client.query('INSERT INTO subscription_items(subscription_id,product_id,qty) VALUES($1,$2,$3)',[saved.rows[0].id,id,qty]);
  await client.query('COMMIT');
  return c.respond(res,201,{ok:true,subscriptionCode:code,status:'pending'});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return c.fail(res,e);}
 finally{client?.release();}
};
