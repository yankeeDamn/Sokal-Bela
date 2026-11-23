'use strict';
// Minimal Cashfree Payment Gateway client (Orders API + webhook signature).
// Secrets come only from environment variables and are never sent to the browser.
const crypto = require('node:crypto');

const API_VERSION = () => process.env.CASHFREE_API_VERSION || '2026-01-01';
const mode = () => (process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox');
const baseUrl = () => mode() === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
const configured = () => Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

// Tests replace this to avoid real network calls.
const http = { fetch: (...args) => fetch(...args) };

async function call(method, path, body) {
  if (!configured()) throw Object.assign(new Error('Online payments are not configured.'), { status: 503, code: 'PAYMENTS_NOT_CONFIGURED' });
  let response;
  try {
    response = await http.fetch(baseUrl() + path, {
      method,
      headers: {
        'x-api-version': API_VERSION(),
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'Content-Type': 'application/json', Accept: 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw Object.assign(new Error('Payment service is unreachable. Please try again.'), { status: 502, code: 'PAYMENT_GATEWAY_UNREACHABLE' });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Cashfree error', response.status, data?.code || data?.type || '');
    throw Object.assign(new Error('Payment could not be started. Please try again or choose cash on delivery.'),
      { status: 502, code: 'PAYMENT_GATEWAY_ERROR' });
  }
  return data;
}

async function createOrder({ orderId, amount, customer, returnUrl, notifyUrl }) {
  const body = {
    order_id: orderId, order_amount: Number(amount), order_currency: 'INR',
    customer_details: {
      customer_id: 'u' + String(customer.id || customer.phone).replace(/[^A-Za-z0-9]/g, '').slice(0, 40),
      customer_phone: customer.phone, customer_name: String(customer.name || '').slice(0, 100) || undefined
    },
    order_meta: { return_url: returnUrl, ...(notifyUrl ? { notify_url: notifyUrl } : {}) },
    order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  };
  const data = await call('POST', '/orders', body);
  if (!data.payment_session_id) throw Object.assign(new Error('Payment could not be started.'), { status: 502, code: 'PAYMENT_GATEWAY_ERROR' });
  return { cfOrderId: String(data.cf_order_id || ''), sessionId: data.payment_session_id, status: data.order_status };
}
async function getOrder(orderId) {
  const o = await call('GET', '/orders/' + encodeURIComponent(orderId));
  return { status: String(o.order_status || ''), amount: Number(o.order_amount), cfOrderId: String(o.cf_order_id || '') };
}
// Successful payment id and method, best effort (used for the admin ledger).
async function getSuccessfulPayment(orderId) {
  try {
    const list = await call('GET', '/orders/' + encodeURIComponent(orderId) + '/payments');
    const p = (Array.isArray(list) ? list : []).find(x => x.payment_status === 'SUCCESS');
    return p ? { cfPaymentId: String(p.cf_payment_id || ''), } : null;
  } catch { return null; }
}

// Cashfree signs timestamp + raw body with HMAC-SHA256 (Base64). Accept the two
// documented concatenation styles; compare in constant time.
function verifyWebhook(rawBody, signature, timestamp, secret = process.env.CASHFREE_SECRET_KEY) {
  if (!secret || !signature || !timestamp) return false;
  const given = Buffer.from(String(signature));
  for (const signed of [timestamp + rawBody, timestamp + '.' + rawBody]) {
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(signed).digest('base64'));
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) return true;
  }
  return false;
}

module.exports = { http, mode, configured, createOrder, getOrder, getSuccessfulPayment, verifyWebhook };
