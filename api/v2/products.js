'use strict';
const c=require('../../lib/neon-core');
module.exports=async(req,res)=>{
 if(!c.allow(req,res,'GET'))return;
 try{
  const kind=c.clean(req.query?.kind,20)||'vegetable';
  if(!['vegetable','dairy'].includes(kind))throw c.bad('Invalid product type.');
  const q=c.clean(req.query?.q,80);
  const search='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  const sql="SELECT id::text,name_en,name_bn,kind,category,unit,pack_size,price::text,stock,emoji,image_url,sort_order FROM products "+
    "WHERE kind=$1 AND active=TRUE AND stock>=0 AND price>0 AND "+
    "(name_en ILIKE $2 ESCAPE '\\' OR name_bn ILIKE $2 ESCAPE '\\' OR category ILIKE $2 ESCAPE '\\') "+
    "ORDER BY sort_order,name_en LIMIT 200";
  const rows=await c.db().query(sql,[kind,search]);
  return c.respond(res,200,{ok:true,products:rows.rows});
 }catch(e){return c.fail(res,e);}
};
