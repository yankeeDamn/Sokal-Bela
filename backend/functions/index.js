// ============================================================================
// SOKAL BELA — BACKEND API (Firebase Cloud Functions)
// Razorpay payment gateway integration:
//   POST /api/create-payment-order  — create a Razorpay order
//   POST /api/verify-payment        — verify checkout signature, store payment
//   POST /api/razorpay-webhook      — authoritative async payment events
//
// Payment methods (UPI, credit/debit cards, net banking, wallets) are enabled
// in the Razorpay Dashboard and surfaced automatically by Checkout.
// ============================================================================

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

// Razorpay credentials — configure with:
//   firebase functions:secrets:set RAZORPAY_KEY_ID   (recommended), or
//   firebase functions:config:set razorpay.key_id="rzp_live_..." razorpay.key_secret="..."
const RAZORPAY_KEY_ID = defineString('RAZORPAY_KEY_ID', { default: '' });
const RAZORPAY_KEY_SECRET = defineString('RAZORPAY_KEY_SECRET', { default: '' });
const RAZORPAY_WEBHOOK_SECRET = defineString('RAZORPAY_WEBHOOK_SECRET', { default: '' });

const MIN_ORDER_RUPEES = 200;
const ORDER_COLLECTION = 'orders';
const PAYMENTS_COLLECTION = 'payments';

function getRazorpay() {
  const keyId = RAZORPAY_KEY_ID.value();
  const keySecret = RAZORPAY_KEY_SECRET.value();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured on the server');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Razorpay checkout signature: HMAC_SHA256(order_id + "|" + payment_id, secret)
function verifyCheckoutSignature(razorpayOrderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET.value())
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Webhook signature: HMAC_SHA256(raw request body, webhook secret)
function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET.value())
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Persist a payment record (doc ID = paymentId → idempotent) and update the order.
async function recordPayment({ paymentId, razorpayOrderId, orderId, amountRupees, customer, status, method, raw }) {
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
  await paymentRef.set({
    paymentId,
    orderId: orderId || null,
    razorpayOrderId,
    amount: amountRupees,
    currency: 'INR',
    customer: customer || null,
    status, // 'captured' | 'failed'
    method: method || null, // upi | card | netbanking | wallet | ...
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(raw ? { gateway: raw } : {}),
  }, { merge: true });

  if (orderId) {
    try {
      await db.collection(ORDER_COLLECTION).doc(orderId).update({
        paymentStatus: status === 'captured' ? 'paid' : 'failed',
        paymentId,
        razorpayOrderId,
        paymentMethod: method || 'online',
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      // Order doc may not exist in Firestore — payment record is still stored.
      console.warn(`Order ${orderId} update failed: ${e.message}`);
    }
  }
}

const app = express();
app.use(cors({ origin: true }));

// JSON parsing for all routes EXCEPT the webhook, which needs the raw body
// to verify the Razorpay webhook signature.
app.use((req, res, next) => {
  if (req.path === '/razorpay-webhook') return next();
  return express.json({ limit: '256kb' })(req, res, next);
});

// ---------------------------------------------------------------------------
// POST /api/create-payment-order
// Body: { orderId, amount (rupees), currency?, customer? {name,email,phone} }
// ---------------------------------------------------------------------------
app.post('/create-payment-order', async (req, res) => {
  try {
    const { orderId, amount, currency = 'INR', customer } = req.body || {};

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees < 1) {
      return res.status(400).json({ success: false, error: 'A valid amount (rupees) is required' });
    }
    if (rupees < MIN_ORDER_RUPEES) {
      return res.status(400).json({ success: false, error: `Minimum order amount is ₹${MIN_ORDER_RUPEES}` });
    }
    const paise = Math.round(rupees * 100);

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
      amount: paise,
      currency,
      receipt: String(orderId).slice(0, 40),
      notes: {
        orderId: String(orderId),
        customerName: customer?.name || '',
        customerPhone: customer?.phone || '',
      },
    });

    // Track the payment intent so there is always an audit trail.
    await db.collection(PAYMENTS_COLLECTION).doc(rzpOrder.id).set({
      orderId: String(orderId),
      razorpayOrderId: rzpOrder.id,
      amount: rupees,
      currency,
      customer: customer || null,
      status: 'created',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount, // paise, as expected by Checkout
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID.value(),
    });
  } catch (err) {
    console.error('create-payment-order failed:', err);
    return res.status(500).json({ success: false, error: 'Could not create payment order' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/verify-payment
// Body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature,
//         customer? {name,email,phone}, amount? }
// ---------------------------------------------------------------------------
app.post('/verify-payment', async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      customer,
    } = req.body || {};

    if (!rzpOrderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
    }

    if (!verifyCheckoutSignature(rzpOrderId, paymentId, signature)) {
      await recordPayment({
        paymentId,
        razorpayOrderId: rzpOrderId,
        orderId,
        amountRupees: Number(req.body.amount) || null,
        customer,
        status: 'failed',
      });
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Fetch the authoritative payment from Razorpay (amount, method, status).
    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.order_id !== rzpOrderId) {
      return res.status(400).json({ success: false, error: 'Payment does not match the order' });
    }

    const captured = payment.status === 'captured' || payment.status === 'authorized';
    if (payment.status === 'authorized') {
      // Auto-capture if the dashboard capture setting is manual.
      await razorpay.payments.capture(paymentId, payment.amount, payment.currency).catch((e) => {
        console.warn(`Capture for ${paymentId} failed (may already be captured): ${e.message}`);
      });
    }

    await recordPayment({
      paymentId,
      razorpayOrderId: rzpOrderId,
      orderId,
      amountRupees: payment.amount / 100,
      customer,
      status: captured ? 'captured' : 'failed',
      method: payment.method,
      raw: {
        method: payment.method,
        bank: payment.bank || null,
        wallet: payment.wallet || null,
        vpa: payment.vpa || null,
        cardNetwork: payment.card?.network || null,
        email: payment.email || null,
        contact: payment.contact || null,
      },
    });

    if (!captured) {
      return res.status(400).json({ success: false, error: `Payment not captured (status: ${payment.status})` });
    }

    return res.json({
      success: true,
      paymentId,
      orderId: orderId || null,
      amount: payment.amount / 100,
      method: payment.method,
      message: 'Payment verified successfully',
    });
  } catch (err) {
    console.error('verify-payment failed:', err);
    return res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/razorpay-webhook
// Configure in Razorpay Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET.
// Handles payment.captured / payment.failed as the authoritative source.
// ---------------------------------------------------------------------------
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('x-razorpay-signature');
    if (!RAZORPAY_WEBHOOK_SECRET.value()) {
      console.error('Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ success: false });
    }
    if (!signature || !verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const entity = event?.payload?.payment?.entity;
    if (!entity) return res.json({ success: true, ignored: true });

    const orderId = entity.notes?.orderId || null;
    const status = event.event === 'payment.captured' ? 'captured'
      : event.event === 'payment.failed' ? 'failed'
      : entity.status;

    await recordPayment({
      paymentId: entity.id,
      razorpayOrderId: entity.order_id,
      orderId,
      amountRupees: (entity.amount || 0) / 100,
      customer: entity.notes?.customerName ? {
        name: entity.notes.customerName,
        phone: entity.notes.customerPhone || '',
      } : null,
      status,
      method: entity.method,
      raw: {
        event: event.event,
        method: entity.method,
        bank: entity.bank || null,
        wallet: entity.wallet || null,
        vpa: entity.vpa || null,
        errorCode: entity.error_code || null,
        errorDescription: entity.error_description || null,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('razorpay-webhook failed:', err);
    return res.status(500).json({ success: false });
  }
});

app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

exports.api = onRequest(
  { region: 'asia-south1', secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET] },
  app
);
