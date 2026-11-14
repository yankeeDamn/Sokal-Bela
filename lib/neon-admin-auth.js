'use strict';
const crypto=require('node:crypto');
const COOKIE='sb_admin_v2',DURATION=8*60*60;
const safe=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function configured(){return typeof process.env.JWT_SECRET==='string'&&process.env.JWT_SECRET.length>=32&&
 typeof process.env.ADMIN_PASSWORD_HASH==='string'&&/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(process.env.ADMIN_PASSWORD_HASH);}
function verifyPassword(password){
 if(!configured()||typeof password!=='string'||password.length>256)return false;
 const [,salt,hash]=process.env.ADMIN_PASSWORD_HASH.split(':');
 const derived=crypto.scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
 return safe(derived,hash);
}
function sign(payload){return crypto.createHmac('sha256',process.env.JWT_SECRET).update(payload).digest('hex');}
function cookie(req){
 const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 return raw?raw.slice(COOKIE.length+1):'';
}
function authenticated(req){
 if(!configured())return false;
 const token=cookie(req),parts=token.split('.');
 if(parts.length!==2||!/^\\d{10}$/.test(parts[0])||!/^[0-9a-f]{64}$/.test(parts[1]))return false;
 const expiry=Number(parts[0]);
 return expiry>Date.now()/1000&&expiry<Date.now()/1000+DURATION+60&&safe(parts[1],sign(parts[0]));
}
function setSession(res){
 const expires=String(Math.floor(Date.now()/1000)+DURATION);
 res.setHeader('Set-Cookie',COOKIE+'='+expires+'.'+sign(expires)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+DURATION);
}
function clearSession(res){res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');}
module.exports={configured,verifyPassword,authenticated,setSession,clearSession};
