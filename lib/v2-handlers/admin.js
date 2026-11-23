'use strict';
const c=require('../neon-core');
const auth=require('../neon-admin-auth');
const guard=require('../neon-admin-guard');
const alerts=require('../order-alerts');
const VIEWS=['overview','orders','products','subscriptions','requests','kitchen','campaigns','settings'];
const ORDER_STATES=['new','confirmed','out_for_delivery','delivered','cancelled'];
const CAMPAIGN_CHANNELS=['whatsapp','facebook','instagram','google','flyer','referral','other'];
const CAMPAIGN_STATES=['draft','planned','active','paused','completed'];
const PRODUCT_STATES=['pending','active','paused','cancelled'];
const REQUEST_STATES=['new','contacted','confirmed','cancelled'];
const ID=/^[1-9][0-9]{0,14}$/;
const pageQueries={
 orders:"SELECT o.id::text,o.order_no,o.customer_name,o.phone,o.address,o.pincode,o.delivery_slot,o.notes,o.subtotal::text,o.delivery_fee::text,o.total::text,o.status,o.created_at,COALESCE(a.status,'not_queued') AS alert_status,a.last_error,COALESCE(json_agg(json_build_object('name',i.name_snapshot,'qty',i.qty,'unit',i.unit_snapshot,'price',i.price_snapshot::text,'total',i.line_total::text) ORDER BY i.id) FILTER(WHERE i.id IS NOT NULL),'[]'::json) AS items FROM orders o LEFT JOIN order_alerts a ON a.order_id=o.id LEFT JOIN order_items i ON i.order_id=o.id GROUP BY o.id,a.status,a.last_error ORDER BY o.created_at DESC LIMIT 200",
 products:"SELECT id::text,name_en,name_bn,kind,category,unit,pack_size,price::text,stock,active,updated_at FROM products ORDER BY kind,sort_order,id LIMIT 400",
 subscriptions:"SELECT s.id::text,s.sub_code,s.customer_name,s.phone,s.address,s.pincode,s.slot,s.frequency,s.start_date,s.status,s.paused_until,s.created_at,COALESCE(json_agg(json_build_object('name',p.name_en,'qty',si.qty)) FILTER(WHERE p.id IS NOT NULL),'[]'::json) AS items FROM subscriptions s LEFT JOIN subscription_items si ON si.subscription_id=s.id LEFT JOIN products p ON p.id=si.product_id GROUP BY s.id ORDER BY s.created_at DESC LIMIT 150",
 requests:"SELECT id::text,request_type,contact_name,phone,address,event_date,guest_count,notes,status,created_at FROM bulk_requests ORDER BY created_at DESC LIMIT 150",
 kitchen:"SELECT id::text,title,description,category,store,affiliate_url,approx_price::text,active FROM kitchen_items ORDER BY id DESC LIMIT 150",
 campaigns:"SELECT id::text,name,channel,objective,status,budget::text,spend::text,start_date::text,end_date::text,landing_path,notes,created_at,updated_at FROM marketing_campaigns ORDER BY updated_at DESC,id DESC LIMIT 150",
 settings:"SELECT key,value FROM settings WHERE key IN ('min_order','free_delivery_min','free_delivery_radius_km','delivery_fee','delivery_pincodes','shop_hours','shop_phone') ORDER BY key"
};
const overviewQuery="SELECT (SELECT COUNT(*)::int FROM orders WHERE status='new') AS new_orders,"+
 " (SELECT COUNT(*)::int FROM orders WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date=(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS orders_today,"+
 " (SELECT COALESCE(SUM(total),0)::text FROM orders WHERE status!='cancelled' AND (created_at AT TIME ZONE 'Asia/Kolkata')::date=(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS sales_today,"+
 " (SELECT COUNT(*)::int FROM products WHERE active AND stock<=5) AS low_stock,"+
 " (SELECT COUNT(*)::int FROM order_alerts WHERE status!='sent') AS pending_alerts,"+
 " (SELECT COUNT(*)::int FROM marketing_campaigns WHERE status='active') AS active_campaigns";
const safeId=id=>{if(!ID.test(String(id||'')))throw c.bad('Invalid record ID.');return String(id);};
function date(value){
 if(value===''||value===null||value===undefined)return null;
 if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)||Number.isNaN(Date.parse(value))||
   new Date(value).toISOString().slice(0,10)!==value)throw c.bad('Enter a valid date.');
 return value;
}
function price(value,label){
 const v=Number(value);
 if(value===null||value===''||!Number.isFinite(v)||v<0||v>99999999||Math.abs(Math.round(v*100)-v*100)>0.000001)
  throw c.bad('Invalid '+label+'.');
 return v.toFixed(2);
}
async function change(b){
 const action=c.clean(b.action,40),id=action==='campaign-save'&&!b.id?null:safeId(b.id);
 if(action==='retry-alert'){
  const r=await c.db().query("SELECT 1 FROM order_alerts WHERE order_id=$1",[id]);
  if(!r.rowCount)throw c.bad('Notification record not found.','NOT_FOUND',404);
  return {id,notification:await alerts.dispatch(id)};
 }
 if(action==='campaign-save'){
  const name=c.required(b.name,120,'Campaign name'),channel=c.clean(b.channel,30),status=c.clean(b.status,20);
  if(!CAMPAIGN_CHANNELS.includes(channel)||!CAMPAIGN_STATES.includes(status))throw c.bad('Invalid campaign channel or status.');
  const start=date(b.start_date),end=date(b.end_date);
  if(start&&end&&end<start)throw c.bad('Campaign end must not precede start.');
  const path=c.clean(b.landing_path||'/',300);
  if(!path.startsWith('/')||path.startsWith('//')||/[\\\r\n]/.test(path))throw c.bad('Use a relative storefront landing path.');
  const values=[name,channel,c.clean(b.objective,160),status,price(b.budget,'budget'),price(b.spend,'spend'),start,end,path,c.clean(b.notes,800)];
  let result;
  if(id){
   result=await c.db().query("UPDATE marketing_campaigns SET name=$2,channel=$3,objective=$4,status=$5,budget=$6,spend=$7,start_date=$8,end_date=$9,landing_path=$10,notes=$11,updated_at=NOW() WHERE id=$1 RETURNING id::text",[id,...values]);
  }else{
   result=await c.db().query("INSERT INTO marketing_campaigns(name,channel,objective,status,budget,spend,start_date,end_date,landing_path,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text",values);
  }
  if(!result.rowCount)throw c.bad('Campaign not found.','NOT_FOUND',404);
  return {id:result.rows[0].id};
 }
 let query,params;
 if(action==='product'){
  const stock=Number(b.stock),amount=price(b.price,'price');
  if(!Number.isInteger(stock)||stock<0||stock>1000000||typeof b.active!=='boolean')
   throw c.bad('Invalid stock or active status.');
  if(b.active&&Number(amount)<=0)throw c.bad('Set a real selling price before activation.');
  query="UPDATE products SET price=$2,stock=$3,active=$4,updated_at=NOW() WHERE id=$1 RETURNING id::text";
  params=[id,amount,stock,b.active];
 }else if(action==='order-status'){
  if(!ORDER_STATES.includes(b.status))throw c.bad('Invalid order status.');
  query="UPDATE orders SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='subscription-status'){
  if(!PRODUCT_STATES.includes(b.status))throw c.bad('Invalid subscription status.');
  query="UPDATE subscriptions SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='request-status'){
  if(!REQUEST_STATES.includes(b.status))throw c.bad('Invalid enquiry status.');
  query="UPDATE bulk_requests SET status=$2 WHERE id=$1 RETURNING id::text";params=[id,b.status];
 }else if(action==='kitchen-status'){
  if(typeof b.active!=='boolean')throw c.bad('Invalid active status.');
  query="UPDATE kitchen_items SET active=$2 WHERE id=$1 RETURNING id::text";params=[id,b.active];
 }else throw c.bad('Invalid admin action.');
 const r=await c.db().query(query,params);
 if(!r.rowCount)throw c.bad('Record not found.','NOT_FOUND',404);
 return {id:r.rows[0].id};
}
module.exports=async(req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 if(!auth.authenticated(req))return c.respond(res,401,{ok:false,error:'Admin sign-in required.'});
 try{
  if(req.method==='GET'){
   const view=c.clean(req.query?.view,30)||'overview';
   if(!VIEWS.includes(view))throw c.bad('Invalid admin view.');
   const result=await c.db().query(view==='overview'?overviewQuery:pageQueries[view]);
   return c.respond(res,200,view==='overview'?{ok:true,view,summary:result.rows[0]}:{ok:true,view,rows:result.rows});
  }
  if(!guard.post(req,res))return;
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw c.bad('Invalid request body.');
  const result=await change(req.body);
  return c.respond(res,200,{ok:true,...result});
 }catch(error){return c.fail(res,error);}
};
