'use strict';
const crypto = require('node:crypto');
const { Pool } = require('pg');
let pool;
function db() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('DATABASE_URL is not configured'),{status:503,code:'DATABASE_NOT_CONFIGURED'});
  if (!pool) {
    const target = new URL(process.env.DATABASE_URL);
    const localTest = process.env.NODE_ENV === 'test' && ['localhost','127.0.0.1'].includes(target.hostname);
    pool = new Pool({connectionString:process.env.DATABASE_URL,max:4,idleTimeoutMillis:15000,connectionTimeoutMillis:5000,
      ssl:localTest ? false : {rejectUnauthorized:true}});
  }
  return pool;
}
function respond(res,status,payload) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  return res.status(status).json(payload);
}
function fail(res,error) {
  const status=(error.status>=400&&error.status<=599)?error.status:500;
  if(status>=500) console.error('Phase2 API error:',error.code||error.name||'unknown');
  return respond(res,status,{ok:false,code:error.code||'SERVER_ERROR',error:status>=500?'Service temporarily unavailable. Please try again.':error.message});
}
function bad(message,code='INVALID_INPUT',status=400) {
  return Object.assign(new Error(message),{code,status});
}
function clean(value,max=120) {
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}
function required(value,max,label) {
  const result=clean(value,max);
  if(!result) throw bad(label+' is required');
  if(typeof value!=='string' || value.trim().length>max) throw bad(label+' is too long');
  return result;
}
function phone(value) {
  const p=String(value||'').replace(/[\s-]/g,'');
  if(!/^[6-9][0-9]{9}$/.test(p))throw bad('Enter a valid 10-digit Indian phone number.');
  return p;
}
function pin(value) {
  const p=String(value||'').trim();
  if(!/^[0-9]{6}$/.test(p))throw bad('Enter a valid six-digit pincode.');
  return p;
}
function originOk(req){
  const origin=req.headers.origin;
  if(!origin)return true;
  try{return new URL(origin).host === req.headers.host && new URL(origin).protocol==='https:' || 
    (req.headers.host||'').startsWith('localhost:') && new URL(origin).host===req.headers.host;}
  catch{return false;}
}
function ipKey(req,kind) {
  const forwarded=String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return crypto.createHash('sha256').update(kind+':'+forwarded).digest('hex');
}
async function limit(client,req,kind,max,minutes){
  const key=ipKey(req,kind);
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
  const count=await client.query("SELECT COUNT(*)::int AS count FROM request_rate_limits WHERE token=$1 AND created_at > NOW()-($2 * INTERVAL '1 minute')",[key,minutes]);
  if(count.rows[0].count >= max)throw bad('Too many requests. Please try again later.','RATE_LIMITED',429);
  await client.query('INSERT INTO request_rate_limits(token) VALUES($1)',[key]);
}
async function enforceLimit(req,kind,max,minutes) {
  // Separate committed transaction: failed orders and enquiries still count.
  const client=await db().connect();
  try {await client.query('BEGIN');await limit(client,req,kind,max,minutes);await client.query('COMMIT');}
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}
async function settings(client) {
  const rows=await client.query("SELECT key,value FROM settings WHERE key = ANY($1::text[])",[['shop_phone','min_order','free_delivery_min','free_delivery_radius_km','delivery_pincodes','shop_hours','delivery_fee']]);
  const result=Object.fromEntries(rows.rows.map(r=>[r.key,r.value]));
  const requiredKeys=['shop_phone','min_order','free_delivery_min','free_delivery_radius_km','delivery_pincodes','shop_hours'];
  if(requiredKeys.some(key=>result[key]===undefined))
    throw bad('Store settings are not configured.','STORE_CONFIG_MISSING',503);

  return {
    shopPhone:String(result.shop_phone||''),
    minOrder:Number(result.min_order ?? 300),
    freeDeliveryMin:Number(result.free_delivery_min ?? 500),
    radiusKm:Number(result.free_delivery_radius_km ?? 5),
    deliveryPincodes:Array.isArray(result.delivery_pincodes)?result.delivery_pincodes:[],
    shopHours:result.shop_hours||{open:'07:00',close:'21:00',timezone:'Asia/Kolkata'},
    deliveryFee:Number(result.delivery_fee ?? 0)
  };
}
function allow(req,res,method){
  if(req.method!==method){respond(res,405,{ok:false,error:'Method not allowed',code:'METHOD_NOT_ALLOWED'});return false;}
  if(method==='POST'&&!originOk(req)){respond(res,403,{ok:false,error:'Invalid request origin',code:'ORIGIN_REJECTED'});return false;}
  return true;
}
function validateHoneypot(body) {
  if(body?.website || body?.company_site)throw bad('Request could not be processed.','INVALID_REQUEST');
  if(!body || typeof body!=='object' || Array.isArray(body))throw bad('Invalid JSON body.');
}
module.exports={db,respond,fail,bad,clean,required,phone,pin,limit,enforceLimit,settings,allow,validateHoneypot};
