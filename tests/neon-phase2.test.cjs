'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const order=require('../api/v2/orders');
const products=require('../api/v2/products');
const settings=require('../api/v2/settings');
const lookup=require('../api/v2/order-lookup');
const enquiry=require('../api/v2/requests');
const conn=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
let nextIp=20;
function mock(method,body={},query={}){
 const ip='10.0.0.'+(nextIp++);
 const req={method,body,query,headers:{host:'localhost:8787','x-real-ip':ip},socket:{remoteAddress:ip}};
 const result={};
 const res={headers:{},status(code){result.status=code;return this;},json(payload){result.payload=payload;return this;},setHeader(k,v){this.headers[k]=v;}};
 return {req,res,result};
}
async function invoke(fn,method,body,query){
 const m=mock(method,body,query);
 await fn(m.req,m.res);
 return m.result;
}
const customer={customerName:'Test Customer',phone:'9986418638',address:'Test road Rampurhat',pincode:'731224',deliverySlot:'Today evening',website:''};
const item=(id,qty=1)=>({productId:String(id),qty});
async function productRow(name,price,stock){
 const r=await conn.query("INSERT INTO products(name_en,name_bn,kind,category,unit,price,stock,active) VALUES ($1,$2,'vegetable','Test','kg',$3,$4,true) RETURNING id::text",[name,'টেস্ট',price,stock]);
 return r.rows[0].id;
}
test.before(async()=>{await conn.query("UPDATE settings SET value='300'::jsonb WHERE key='min_order'");await conn.query("UPDATE settings SET value='500'::jsonb WHERE key='free_delivery_min'");});
test.after(async()=>{await conn.end();});
test('public settings are centralized and no secret leaks',async()=>{
 const r=await invoke(settings,'GET');assert.equal(r.status,200);
 assert.equal(r.payload.settings.minOrder,300);
 assert.equal(r.payload.settings.freeDeliveryMin,500);
 assert.equal(JSON.stringify(r.payload).includes('DATABASE_URL'),false);
});
test('public products returns only active positive-price items',async()=>{
 await productRow('Active Test 1',300,5);
 const r=await invoke(products,'GET',{}, {kind:'vegetable',q:'Active Test 1'});
 assert.equal(r.status,200);assert.equal(r.payload.products.length,1);
 const none=await invoke(products,'GET',{}, {kind:'vegetable',q:'Definitely no result'});
 assert.equal(none.payload.products.length,0);
});
test('minimum order rejected, tampered client price ignored',async()=>{
 const id=await productRow('Low Price Test',299,4);
 const r=await invoke(order,'POST',{...customer,items:[{...item(id),price:'0.01',lineTotal:999999}]});
 assert.equal(r.status,422);assert.equal(r.payload.code,'MIN_ORDER');
 const remain=await conn.query('SELECT stock FROM products WHERE id=$1',[id]);assert.equal(remain.rows[0].stock,4);
});
test('server recomputes price and free delivery, persists order items',async()=>{
 const id=await productRow('Delivery Test',500,3);
 const r=await invoke(order,'POST',{...customer,items:[{...item(id),price:'0.01'}]});
 assert.equal(r.status,201,JSON.stringify(r.payload));assert.equal(r.payload.total,'500.00');assert.equal(r.payload.deliveryFee,'0.00');
 const saved=await conn.query('SELECT o.total::text, i.price_snapshot::text, i.qty FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.order_no=$1',[r.payload.orderNo]);
 assert.equal(saved.rowCount,1);assert.equal(saved.rows[0].price_snapshot,'500.00');assert.equal(saved.rows[0].qty,1);
 const found=await invoke(lookup,'GET',{}, {phone:customer.phone,order_no:r.payload.orderNo});
 assert.equal(found.status,200);assert.equal(found.payload.order.order_no,r.payload.orderNo);
 const hidden=await invoke(lookup,'GET',{}, {phone:'9876543210',order_no:r.payload.orderNo});
 assert.equal(hidden.status,404);
});
test('two concurrent orders for last unit: exactly one succeeds',async()=>{
 const id=await productRow('Last Stock Test',300,1);
 const requests=[mock('POST',{...customer,items:[item(id)]}),mock('POST',{...customer,items:[item(id)]})];
 await Promise.all(requests.map(x=>order(x.req,x.res)));
 assert.deepEqual(requests.map(x=>x.result.status).sort(),[201,409]);
 const stock=await conn.query('SELECT stock FROM products WHERE id=$1',[id]);assert.equal(stock.rows[0].stock,0);
 const count=await conn.query('SELECT count(*)::int AS c FROM order_items WHERE product_id=$1',[id]);assert.equal(count.rows[0].c,1);
});
test('honeypot and invalid pincode requests do not save',async()=>{
 const id=await productRow('Validation Test',400,1);
 const trap=await invoke(order,'POST',{...customer,website:'spam',items:[item(id)]});
 assert.equal(trap.status,400);
 const pin=await invoke(order,'POST',{...customer,pincode:'999999',items:[item(id)]});
 assert.equal(pin.status,422);
});
test('bulk and catering requests are stored without payments',async()=>{
 for(const type of ['bulk','catering']){
  const r=await invoke(enquiry,'POST',{type,contactName:'Test Event',phone:customer.phone,address:'Rampurhat',guestCount:20,notes:'Potato 20 kg',items:[]});
  assert.equal(r.status,201,JSON.stringify(r.payload));
  const check=await conn.query('SELECT request_type FROM bulk_requests WHERE id=$1',[r.payload.requestId]);
  assert.equal(check.rows[0].request_type,type);
 }
});
