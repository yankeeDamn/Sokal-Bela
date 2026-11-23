'use strict';
const c=require('../neon-core');
const auth=require('../neon-admin-auth');
const guard=require('../neon-admin-guard');
module.exports=async(req,res)=>{
 try {
  res.setHeader('Cache-Control','private, no-store');
  if(req.method==='GET')return c.respond(res,200,{ok:true,authenticated:auth.authenticated(req),configured:auth.configured()});
  if(!guard.post(req,res))return;
  const action=c.clean(req.body?.action,20);
  if(action==='logout'){auth.clearSession(res);return c.respond(res,200,{ok:true});}
  if(action!=='login')throw c.bad('Invalid action.');
  if(!auth.configured())throw c.bad('Admin login is not configured.','ADMIN_UNAVAILABLE',503);
  await c.enforceLimit(req,'neon-admin-login',5,15);
  if(!auth.verifyPassword(req.body?.password))throw c.bad('Invalid admin password.','LOGIN_FAILED',401);
  auth.setSession(res);
  return c.respond(res,200,{ok:true,authenticated:true});
 }catch(e){return c.fail(res,e);}
};
