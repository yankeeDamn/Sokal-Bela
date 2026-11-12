'use strict';
const c=require('../neon-core');
const allowedHost=host=>['amazon.in','flipkart.com'].some(domain=>host===domain||host.endsWith('.'+domain));
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'GET'))return;
 try{
  const rows=await c.db().query(
   "SELECT id::text,title,description,category,store,affiliate_url,image_url,emoji,approx_price::text FROM kitchen_items WHERE active=TRUE ORDER BY sort_order,id LIMIT 100");
  const items=rows.rows.filter(item=>{
   try{const u=new URL(item.affiliate_url);return u.protocol==='https:'&&allowedHost(u.hostname.toLowerCase());}
   catch{return false;}
  });
  return c.respond(res,200,{ok:true,items});
 }catch(e){return c.fail(res,e);}
};
