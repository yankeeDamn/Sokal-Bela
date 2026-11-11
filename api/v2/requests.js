'use strict';
const c=require('../../lib/neon-core');
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'POST'))return;
 let client;
 try{
  c.validateHoneypot(req.body);
  const b=req.body,type=c.clean(b.type,12);
  if(!['bulk','catering'].includes(type))throw c.bad('Invalid request type.');
  const name=c.required(b.contactName,120,'Contact name'),phone=c.phone(b.phone),
  address=c.clean(b.address,500),notes=c.clean(b.notes,1000);
  const eventDate=c.clean(b.eventDate,10);
  if(eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw c.bad('Invalid event date.');
  const guests=b.guestCount==null||b.guestCount===''?null:Number(b.guestCount);
  if(guests!==null&&(!Number.isInteger(guests)||guests<1||guests>100000))throw c.bad('Invalid guest count.');
  const items=Array.isArray(b.items)?b.items:[];
  if(items.length>30||JSON.stringify(items).length>5000)throw c.bad('Too many requested items.');
  const safeItems=items.map(x=>({name:c.clean(x?.name,100),qty:c.clean(String(x?.qty||''),30)})).filter(x=>x.name);
  client=await c.db().connect();await client.query('BEGIN');
  await c.limit(client,req,'requests',4,30);
  const row=await client.query("INSERT INTO bulk_requests(request_type,contact_name,phone,address,event_date,guest_count,items,notes) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING id::text",[type,name,phone,address,eventDate||null,guests,JSON.stringify(safeItems),notes]);
  await client.query('COMMIT');
  return c.respond(res,201,{ok:true,requestId:row.rows[0].id,message:'Request received. Please confirm details on WhatsApp.'});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return c.fail(res,e);}
 finally{client?.release();}
};
