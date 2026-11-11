'use strict';
const crypto=require('node:crypto');
function headers(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Vary','Origin');
}
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
function method(req,res,allowed) {
  headers(res);
  if (!allowed.includes(req.method)) {res.setHeader('Allow',allowed.join(', '));res.status(405).json({error:'Method not allowed'});return false;}
  return true;
}
function originAllowed(req) {
  const origin=req.headers?.origin;
  if (!origin) return true;
  try {
    const u=new URL(origin),host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
    return u.protocol==='https:' && u.host.toLowerCase()===host
      || (process.env.NODE_ENV==='test' && u.protocol==='http:' && u.host.toLowerCase()===host);
  } catch { return false; }
}
function normalizeBody(req) {
  if(typeof req.body==='object' && req.body && !Array.isArray(req.body)) return req.body;
  if(typeof req.body==='string') {try {const value=JSON.parse(req.body);if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch {}}
  throw new HttpError(400,'Invalid JSON object');
}
function str(value,max=120) {return typeof value==='string'?value.trim().slice(0,max):'';}
function required(value,label,max=120) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new HttpError(400,label+' is required (max '+max+' characters)');
  return value.trim();
}
function phone(value) {const v=str(value,32).replace(/\D/g,'');const ten=v.startsWith('91')&&v.length===12?v.slice(2):v;if(!/^[6-9]\d{9}$/.test(ten))throw new HttpError(400,'Enter a valid 10-digit Indian phone number');return ten;}
function pin(value) {const v=str(value,10);if(!/^\d{6}$/.test(v))throw new HttpError(400,'Enter a valid 6-digit pincode');return v;}
function requestIp(req) {const forwarded=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim();return forwarded||String(req.socket?.remoteAddress||'unknown');}
async function rateLimit(client,req,scope,max,minutes) {
  const key=crypto.createHash('sha256').update(scope+'|'+requestIp(req)).digest('hex');
  const query=`INSERT INTO request_rate_limits(scope,ip_hash,window_start,hits) VALUES($1,$2,NOW(),1)
    ON CONFLICT (scope,ip_hash) DO UPDATE
       SET window_start=CASE WHEN request_rate_limits.window_start < NOW()-($3::integer * INTERVAL '1 minute') THEN NOW() ELSE request_rate_limits.window_start END,
           hits=CASE WHEN request_rate_limits.window_start < NOW()-($3::integer * INTERVAL '1 minute') THEN 1 ELSE request_rate_limits.hits+1 END
       WHERE request_rate_limits.window_start < NOW()-($3::integer * INTERVAL '1 minute') OR request_rate_limits.hits < $4
       RETURNING hits`;
  const result=await client.query(query,[scope,key,minutes,max]);
  if(!result.rowCount)throw new HttpError(429,'Too many requests. Please try again later.');
}
function fail(res,error) {
  const status=Number(error?.status)||500;
  if(status>=500)console.error('Phase2 API error',error?.code||error?.message||'unknown');
  return res.status(status).json({error:status>=500?'Service temporarily unavailable':error.message});
}
function safe(req,res) {
  if(!originAllowed(req)){res.status(403).json({error:'Request origin not allowed'});return false;}
  if(req.headers?.['content-length'] && Number(req.headers['content-length'])>16*1024){res.status(413).json({error:'Request too large'});return false;}
  return true;
}
module.exports={headers,HttpError,method,originAllowed,normalizeBody,str,required,phone,pin,rateLimit,fail,safe};
