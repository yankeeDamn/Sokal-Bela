'use strict';
const c=require('../../lib/neon-core');
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'GET'))return;
 try{const s=await c.settings(c.db());return c.respond(res,200,{ok:true,settings:s});}
 catch(e){return c.fail(res,e);}
};
