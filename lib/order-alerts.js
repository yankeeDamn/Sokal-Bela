'use strict';
// Server-only owner alerts. No customer personal data goes to browser logs.
// Existing Vercel RESEND_API_KEY, EMAIL_FROM and ADMIN_EMAILS are reused.
// ORDER_ALERT_EMAIL overrides ADMIN_EMAILS when provided.
const c = require('./neon-core');
const emailPattern = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
function recipient() {
  const raw=process.env.ORDER_ALERT_EMAIL || process.env.ADMIN_EMAILS || '';
  return raw.split(',').map(s=>s.trim()).find(s=>emailPattern.test(s)) || '';
}
function configured() {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && recipient());
}
function buildEmail(order) {
  const money=x=>'₹'+Number(x).toFixed(2);
  const lines=(order.items||[]).map(i=>i.name+' × '+i.qty+' ('+money(i.line)+')');
  const text=[
    'A new Sokal Bela order has been saved.',
    'Order: '+order.order_no,
    'Items:',...lines.map(line=>'• '+line),
    'Subtotal: '+money(order.subtotal),
    'Delivery fee: '+money(order.delivery_fee),
    'Total: '+money(order.total),
    'Customer: '+order.customer_name,
    'Phone: '+order.phone,
    'Address: '+order.address+', '+order.pincode,
    'Delivery time: '+order.delivery_slot,
    'Notes: '+(order.notes||'-'),
    'Open the secure dashboard: https://sokal-bela.vercel.app/neon-admin/'
  ].join('\n');
  return {subject:'New Sokal Bela order '+order.order_no+' · '+money(order.total),text};
}
async function dispatch(orderId, send=globalThis.fetch) {
  const id=String(orderId);
  if (!/^[1-9][0-9]{0,14}$/.test(id))throw Error('Invalid order identifier');
  const db=c.db();
  const claim=await db.query(
    "UPDATE order_alerts SET status='sending',attempts=attempts+1,last_attempt_at=NOW(),last_error=NULL "+
    "WHERE order_id=$1 AND (status IN ('pending','failed') OR (status='sending' AND last_attempt_at<NOW()-INTERVAL '5 minutes')) "+
    "RETURNING order_id", [id]);
  if(!claim.rowCount)return {sent:false,reason:'already-processed'};
  try {
    if(!configured())throw Object.assign(new Error('Email is not configured'),{code:'ALERT_NOT_CONFIGURED'});
    const rows=await db.query(
      "SELECT o.id,o.order_no,o.customer_name,o.phone,o.address,o.pincode,o.delivery_slot,o.notes,"+
      "o.subtotal::text,o.delivery_fee::text,o.total::text,"+
      "COALESCE(json_agg(json_build_object('name',i.name_snapshot,'qty',i.qty,'line',i.line_total::text) "+
      "ORDER BY i.id) FILTER(WHERE i.id IS NOT NULL),'[]'::json) AS items "+
      "FROM orders o LEFT JOIN order_items i ON i.order_id=o.id WHERE o.id=$1 GROUP BY o.id",[id]);
    if(!rows.rowCount)throw Object.assign(new Error('Order missing'),{code:'ORDER_NOT_FOUND'});
    const email=buildEmail(rows.rows[0]);
    const response=await send('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+process.env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':'sokal-bela/order/'+rows.rows[0].order_no
      },
      body:JSON.stringify({from:process.env.EMAIL_FROM,to:[recipient()],...email}),
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)throw Object.assign(new Error('Email service rejected request'),{code:'EMAIL_HTTP_'+response.status});
    const payload=await response.json();
    await db.query("UPDATE order_alerts SET status='sent',sent_at=NOW(),provider_message_id=$2,last_error=NULL WHERE order_id=$1",[id,String(payload.id||'').slice(0,120)]);
    return {sent:true};
  }catch(error){
    const code=/^[A-Z0-9_]{3,64}$/.test(error.code||'')?error.code:'EMAIL_DELIVERY_ERROR';
    await db.query("UPDATE order_alerts SET status='failed',last_error=$2 WHERE order_id=$1",[id,code]).catch(()=>{});
    // Log only diagnostic code, not order/customer details or API credentials.
    console.error('Order alert:',code);
    return {sent:false,reason:code};
  }
}
module.exports={recipient,configured,buildEmail,dispatch};
