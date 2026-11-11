'use strict';
const c=require('../../lib/neon-core');
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'GET'))return;
 let client;
 try{
  const phone=c.phone(req.query?.phone),orderNo=c.required(req.query?.order_no,32,'Order number').toUpperCase();
  if(!/^SB-[0-9]{8}-[A-F0-9]{8}$/.test(orderNo))throw c.bad('Invalid order number.');
  await c.enforceLimit(req,'order-lookup',15,15);
  client=await c.db().connect();
  await client.query('BEGIN');
  const rows=await client.query("SELECT order_no,status,total::text,created_at,delivery_slot FROM orders WHERE order_no=$1 AND phone=$2",[orderNo,phone]);
  await client.query('COMMIT');
  return c.respond(res,rows.rowCount?200:404,rows.rowCount?{ok:true,order:rows.rows[0]}:{ok:false,code:'ORDER_NOT_FOUND',error:'Order not found. Check the phone and order number.'});
 }catch(e){if(client)await client.query('ROLLBACK').catch(()=>{});return c.fail(res,e);}
 finally{client?.release();}
};
