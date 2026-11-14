'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Pool}=require('pg');
const admin=require('../lib/v2-handlers/admin');
const login=require('../lib/v2-handlers/admin-auth');
const alerts=require('../lib/order-alerts');
const orderHandler=require('../lib/v2-handlers/orders');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:false});
const salt=crypto.randomBytes(16),password='Very-Strong-Admin-Test-Password-2026';
let session='',id='',orderId='';
let counter=60;
function mock(method='GET',body={},query={},authenticated=true,origin='http://localhost:8787'){
 const ip='10.2.0.'+(counter++);
 const req={method,body,query,headers:{
  host:'localhost:8787','content-type':'application/json',
  'x-vercel-forwarded-for':ip,
  ...(origin?{origin}:{}),
  ...(authenticated&&session?{cookie:session}:{}),
 },socket:{remoteAddress:ip}};
 const result={};
 const res={status(code){result.status=code;return this;},json(value){result.json=value;return this;},
  setHeader(k,v){result[k.toLowerCase()]=v;}};
 return {req,res,result};
}
async function call(handler,method,body={},query={},authenticated=true,origin='http://localhost:8787'){
 const m=mock(method,body,query,authenticated,origin);await handler(m.req,m.res);return m.result;
}
test.before(async()=>{
 process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
 process.env.ADMIN_PASSWORD_HASH='scrypt:'+salt.toString('hex')+':'+crypto.scryptSync(password,salt,64).toString('hex');
 process.env.RESEND_API_KEY='test-key';
 process.env.EMAIL_FROM='Test <noreply@example.org>';
 process.env.ORDER_ALERT_EMAIL='owner@example.org';
 const p=await pool.query("INSERT INTO products(name_en,name_bn,kind,category,unit,price,stock,active) VALUES('Phase5 Inventory','টেস্ট','vegetable','Test','kg',340,3,true) RETURNING id::text");
 id=p.rows[0].id;
 await pool.query("UPDATE settings SET value='300'::jsonb WHERE key='min_order'");
 await pool.query("UPDATE settings SET value='500'::jsonb WHERE key='free_delivery_min'");
});
test.after(async()=>{await pool.end();});
test('admin API denies unsigned requests and rejects cross-origin writes',async()=>{
 const unauthorized=await call(admin,'GET',{}, {view:'orders'},false);
 assert.equal(unauthorized.status,401);
 const bad=await call(login,'POST',{action:'login',password:'wrong-password'}, {},false);
 assert.equal(bad.status,401);
 const ok=await call(login,'POST',{action:'login',password}, {},false);
 assert.equal(ok.status,200,JSON.stringify(ok));
 assert.ok(ok['set-cookie'].includes('HttpOnly'));
 session=ok['set-cookie'].split(';')[0];
 const cross=await call(admin,'POST',{action:'order-status',id:'1',status:'confirmed'},{},true,'https://malicious.example');
 assert.equal(cross.status,403);
 const missing=await call(admin,'POST',{action:'order-status',id:'1',status:'confirmed'},{},true,'');
 assert.equal(missing.status,403);
 const overview=await call(admin,'GET',{}, {view:'overview'});
 assert.equal(overview.status,200);
 assert.equal(typeof overview.json.summary.new_orders,'number');
});
test('inventory changes are validated and saved in Neon',async()=>{
 const bad=await call(admin,'POST',{action:'product',id,price:-1,stock:2,active:true});
 assert.equal(bad.status,400);
 const good=await call(admin,'POST',{action:'product',id,price:389.29,stock:4,active:true});
 assert.equal(good.status,200,JSON.stringify(good));
 const row=await pool.query('SELECT price::text,stock FROM products WHERE id=$1',[id]);
 assert.equal(row.rows[0].price,'389.29');assert.equal(row.rows[0].stock,4);
});
test('campaign planner validates and persists records without sending ads',async()=>{
 const blocked=await call(admin,'POST',{action:'campaign-save',name:'Unsafe',channel:'facebook',status:'draft',budget:10,spend:0,landing_path:'//evil.example'});
 assert.equal(blocked.status,400);
 const good=await call(admin,'POST',{action:'campaign-save',name:'Winter greens',channel:'instagram',status:'planned',objective:'Rampurhat shoppers',budget:1500,spend:0,start_date:'2026-12-01',end_date:'2026-12-15',landing_path:'/',notes:'Locally approved creative'});
 assert.equal(good.status,200,JSON.stringify(good));
 const listed=await call(admin,'GET',{}, {view:'campaigns'});
 assert.equal(listed.status,200);assert.ok(listed.json.rows.some(x=>x.name==='Winter greens'));
 const updated=await call(admin,'POST',{action:'campaign-save',id:good.json.id,name:'Winter greens',channel:'instagram',status:'active',objective:'Rampurhat shoppers',budget:1500,spend:300,start_date:'2026-12-01',end_date:'2026-12-15',landing_path:'/',notes:'Ready'});
 assert.equal(updated.status,200);
 const row=await pool.query('SELECT spend::text,status FROM marketing_campaigns WHERE id=$1',[good.json.id]);
 assert.equal(row.rows[0].spend,'300.00');assert.equal(row.rows[0].status,'active');
});
test('order is saved even if email unavailable, with a durable failed alert',async()=>{
 delete process.env.RESEND_API_KEY;
 const m=mock('POST',{customerName:'Alert Test',phone:'9876543210',address:'Test Street',pincode:'731224',deliverySlot:'Tomorrow morning',items:[{productId:id,qty:1}]},{},false);
 await orderHandler(m.req,m.res);
 assert.equal(m.result.status,201,JSON.stringify(m.result));
 const saved=await pool.query('SELECT o.id::text,a.status,o.order_no FROM orders o JOIN order_alerts a ON a.order_id=o.id WHERE o.order_no=$1',[m.result.json.orderNo]);
 assert.equal(saved.rowCount,1);assert.equal(saved.rows[0].status,'failed');
 orderId=saved.rows[0].id;
 process.env.RESEND_API_KEY='test-key';
});
test('manual retry sends one idempotent email with all order details',async()=>{
 const calls=[];
 const fake=async(url,opts)=>{calls.push({url,opts});return {ok:true,status:200,json:async()=>({id:'test-email-id'})};};
 const r=await alerts.dispatch(orderId,fake);
 assert.equal(r.sent,true);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.resend.com/emails');
 const body=JSON.parse(calls[0].opts.body);
 assert.match(body.text,/New Sokal Bela order|new Sokal Bela order/i);
 assert.match(body.text,/9876543210/);
 assert.match(body.text,/Tomorrow morning/);
 assert.match(body.text,/Phase5 Inventory/);
 assert.match(body.text,/389.29/);
 assert.equal(body.to[0],'owner@example.org');
 assert.match(calls[0].opts.headers['Idempotency-Key'],/^sokal-bela\/order\//);
 const next=await alerts.dispatch(orderId,fake);
 assert.equal(next.sent,false);assert.equal(calls.length,1);
 const row=await pool.query('SELECT status,attempts FROM order_alerts WHERE order_id=$1',[orderId]);
 assert.equal(row.rows[0].status,'sent');
 assert.equal(row.rows[0].attempts,2);
});
