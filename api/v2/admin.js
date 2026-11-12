'use strict';
const c=require('../../lib/neon-core'),auth=require('../../lib/neon-admin-auth');
const allowed=['products','orders','subscriptions','requests','kitchen','settings'];
module.exports=async(req,res)=>{
 if(!auth.authenticated(req))return c.respond(res,401,{ok:false,error:'Admin login required.'});
 try{
  if(req.method==='GET'){
   const view=c.clean(req.query?.view,30)||'orders';
   if(!allowed.includes(view))throw c.bad('Invalid admin view.');
   const queries={
    products:"SELECT id::text,name_en,name_bn,kind,category,unit,pack_size,price::text,stock,active FROM products ORDER BY kind,id LIMIT 300",
    orders:"SELECT id::text,order_no,customer_name,phone,address,pincode,delivery_slot,subtotal::text,delivery_fee::text,total::text,status,created_at FROM orders ORDER BY created_at DESC LIMIT 100",
    subscriptions:"SELECT s.id::text,s.sub_code,s.customer_name,s.phone,s.address,s.pincode,s.slot,s.frequency,s.start_date,s.status,s.paused_until,s.created_at,COALESCE(json_agg(json_build_object('name',p.name_en,'qty',si.qty)) FILTER (WHERE p.id IS NOT NULL),'[]') AS items FROM subscriptions s LEFT JOIN subscription_items si ON si.subscription_id=s.id LEFT JOIN products p ON p.id=si.product_id GROUP BY s.id ORDER BY s.created_at DESC LIMIT 100",
    requests:"SELECT id::text,request_type,contact_name,phone,address,event_date,guest_count,notes,status,created_at FROM bulk_requests ORDER BY created_at DESC LIMIT 100",
    kitchen:"SELECT id::text,title,description,category,store,affiliate_url,image_url,emoji,approx_price::text,active,sort_order FROM kitchen_items ORDER BY id DESC LIMIT 100",
    settings:"SELECT key,value FROM settings WHERE key IN ('min_order','free_delivery_min','free_delivery_radius_km','delivery_fee','delivery_pincodes','shop_hours','shop_phone') ORDER BY key"
   };
   const rows=await c.db().query(queries[view]);
   return c.respond(res,200,{ok:true,view,rows:rows.rows});
  }
  if(!c.allow(req,res,'POST'))return;
  const b=req.body||{},action=c.clean(b.action,40);
  const id=String(b.id||'');
  if(!/^[1-9][0-9]{0,14}$/.test(id))throw c.bad('Invalid record ID.');
  let query,params;
  if(action==='product'){
   const price=Number(b.price),stock=Number(b.stock);
   if(!Number.isFinite(price)||price<0||price>99999999||
      !Number.isInteger(stock)||stock<0||stock>1000000||typeof b.active!=='boolean')
    throw c.bad('Invalid price, stock or active status.');
   query='UPDATE products SET price=$2,stock=$3,active=$4,updated_at=NOW() WHERE id=$1 RETURNING id::text';
   params=[id,price.toFixed(2),stock,b.active];
  }else if(action==='order-status'){
   if(!['new','confirmed','out_for_delivery','delivered','cancelled'].includes(b.status))
    throw c.bad('Invalid order status.');
   query='UPDATE orders SET status=$2 WHERE id=$1 RETURNING id::text';params=[id,b.status];
  }else if(action==='subscription-status'){
   if(!['pending','active','paused','cancelled'].includes(b.status))throw c.bad('Invalid subscription status.');
   query='UPDATE subscriptions SET status=$2 WHERE id=$1 RETURNING id::text';params=[id,b.status];
  }else if(action==='request-status'){
   if(!['new','contacted','confirmed','cancelled'].includes(b.status))throw c.bad('Invalid enquiry status.');
   query='UPDATE bulk_requests SET status=$2 WHERE id=$1 RETURNING id::text';params=[id,b.status];
  }else if(action==='kitchen-status'){
   if(typeof b.active!=='boolean')throw c.bad('Invalid active status.');
   query='UPDATE kitchen_items SET active=$2 WHERE id=$1 RETURNING id::text';params=[id,b.active];
  }else throw c.bad('Invalid admin action.');
  const result=await c.db().query(query,params);
  if(!result.rowCount)throw c.bad('Record not found.','NOT_FOUND',404);
  return c.respond(res,200,{ok:true,id:result.rows[0].id});
 }catch(e){return c.fail(res,e);}
};
