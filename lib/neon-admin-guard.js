'use strict';
const c=require('./neon-core');
function post(req,res) {
 if(req.method!=='POST'){c.respond(res,405,{ok:false,error:'Method not allowed'});return false;}
 if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||''))){c.respond(res,415,{ok:false,error:'JSON required'});return false;}
 if(Number(req.headers['content-length']||0)>16000){c.respond(res,413,{ok:false,error:'Request too large'});return false;}
 const origin=String(req.headers.origin||'');
 const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
 let allowed=false;
 try{
  const parsed=new URL(origin);
  allowed=parsed.host===host&&(parsed.protocol==='https:'||(process.env.NODE_ENV==='test'&&parsed.protocol==='http:'));
 }catch{}
 if(!allowed || req.headers['sec-fetch-site']==='cross-site'){
  c.respond(res,403,{ok:false,error:'Invalid request origin'});return false;
 }
 return true;
}
module.exports={post};
