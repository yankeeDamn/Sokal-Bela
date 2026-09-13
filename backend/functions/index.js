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
const { rateLimit } = require('express-rate-limit');
const Razorpay = require('razorpay');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');

const { getFirestore, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

// Razorpay credentials — configure with:
//   firebase functions:secrets:set RAZORPAY_KEY_ID   (recommended), or
//   firebase functions:config:set razorpay.key_id="rzp_live_..." razorpay.key_secret="..."
const RAZORPAY_KEY_ID = defineString('RAZORPAY_KEY_ID', { default: '' });
const RAZORPAY_KEY_SECRET = defineString('RAZORPAY_KEY_SECRET', { default: '' });
const RAZORPAY_WEBHOOK_SECRET = defineString('RAZORPAY_WEBHOOK_SECRET', { default: '' });

// Comma-separated list of origins allowed to call the JSON APIs from a browser.
// If unset, cross-origin browser calls are blocked (same-origin hosting rewrites
// still work and send no Origin header). Non-browser tools are unaffected.
const ALLOWED_ORIGINS = defineString('ALLOWED_ORIGINS', { default: '' });

function getAllowedOrigins() {
  return ALLOWED_ORIGINS.value().split(',').map((s) => s.trim()).filter(Boolean);
}

const MIN_ORDER_RUPEES = 200;
const ORDER_COLLECTION = 'orders';
const PAYMENTS_COLLECTION = 'payments';
const VALID_PAYMENT_STATUSES = new Set(['Pending', 'Paid', 'Failed', 'Cancelled', 'Timeout', 'PaidUnverified']);

function normalizePaymentStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  if (!key || key === 'created' || key === 'pending') return 'Pending';
  if (key === 'captured' || key === 'authorized' || key === 'paid') return 'Paid';
  if (key === 'failed') return 'Failed';
  if (key === 'cancelled' || key === 'canceled') return 'Cancelled';
  if (key === 'timeout') return 'Timeout';
  if (key === 'paidunverified' || key === 'paid_unverified' || key === 'paid-unverified') return 'PaidUnverified';
  return null;
}

function normalizePaymentMethod(method) {
  const key = String(method || '').trim().toLowerCase();
  if (!key) return 'Online';
  const methodMap = {
    upi: 'UPI',
    card: 'Card',
    netbanking: 'NetBanking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'PayLater',
    cod: 'COD',
    online: 'Online',
  };
  return methodMap[key] || 'Online';
}

function resolveCustomerId(customer) {
  if (!customer || typeof customer !== 'object') return null;
  return customer.customerId || customer.uid || null;
}

function getRazorpay() {
  const keyId = RAZORPAY_KEY_ID.value();
  const keySecret = RAZORPAY_KEY_SECRET.value();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured on the server');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function getVerifiedUser(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (err) {
    console.warn('Invalid auth token:', err.message);
    return null;
  }
}

function isAdminUser(user) {
  return !!user && (user.role === 'Admin' || user.email === 'yankeecpp90@gmail.com');
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
async function recordPayment({ paymentId, razorpayOrderId, orderId, amountRupees, customer, status, method, raw, source = 'gateway' }) {
  const normalizedStatus = normalizePaymentStatus(status) || 'Pending';
  const normalizedMethod = normalizePaymentMethod(method);
  const customerId = resolveCustomerId(customer);
  const docId = String(paymentId || razorpayOrderId || `payment-${Date.now()}`);
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(docId);
  const existing = await paymentRef.get();

  const payload = {
    paymentId: paymentId || null,
    orderId: orderId || null,
    razorpayOrderId: razorpayOrderId || null,
    amount: Number.isFinite(Number(amountRupees)) ? Number(amountRupees) : null,
    customerId: customerId || null,
    paymentStatus: normalizedStatus,
    paymentMethod: normalizedMethod,
    updatedAt: FieldValue.serverTimestamp(),
    source,
    ...(raw ? { gateway: raw } : {}),
  };
  if (!existing.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await paymentRef.set(payload, { merge: true });

  if (orderId) {
    try {
      await db.collection(ORDER_COLLECTION).doc(orderId).set({
        paymentStatus: normalizedStatus,
        paymentId: paymentId || null,
        razorpayOrderId: razorpayOrderId || null,
        paymentMethod: normalizedMethod,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      // Order doc may not exist in Firestore — payment record is still stored.
      console.warn(`Order ${orderId} update failed: ${e.message}`);
    }
  }
}

const app = express();
app.disable('x-powered-by');

// Restrict browser cross-origin access to explicitly allowed origins.
// Requests without an Origin header (same-origin hosting rewrite, curl,
// server-to-server webhooks) are always allowed.
app.use(cors({
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
}));

// Rate limits — protect endpoints that create Razorpay orders / verify
// payments (cost and abuse), with a generous ceiling for the rest.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.use(apiLimiter);
app.use(['/create-payment-order', '/verify-payment', '/payment-status'], paymentLimiter);

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
    const user = await getVerifiedUser(req);

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const orderSnap = await db.collection(ORDER_COLLECTION).doc(orderId).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const orderData = orderSnap.data() || {};
    if (!isAdminUser(user) && orderData.customerId && orderData.customerId !== user.uid) {
      return res.status(403).json({ success: false, error: 'Not authorized for this order' });
    }
    if (normalizePaymentStatus(orderData.paymentStatus) === 'Paid') {
      return res.status(409).json({ success: false, error: 'Order is already paid' });
    }

    const requestedAmount = Number(amount);
    const orderAmount = Number(orderData.total);
    const rupees = Number.isFinite(orderAmount) && orderAmount > 0 ? orderAmount : requestedAmount;
    if (!Number.isFinite(rupees) || rupees < 1) {
      return res.status(400).json({ success: false, error: 'A valid amount (rupees) is required' });
    }
    if (
      Number.isFinite(orderAmount) && orderAmount > 0 &&
      Number.isFinite(requestedAmount) && Math.abs(orderAmount - requestedAmount) > 0.5
    ) {
      return res.status(400).json({ success: false, error: 'Order amount mismatch' });
    }
    if (rupees < MIN_ORDER_RUPEES) {
      return res.status(400).json({ success: false, error: `Minimum order amount is ₹${MIN_ORDER_RUPEES}` });
    }
    const paise = Math.round(rupees * 100);
    const customerId = orderData.customerId || resolveCustomerId(customer) || user.uid;
    const customerName = customer?.name || orderData.customerName || '';
    const customerPhone = customer?.phone || orderData.phone || '';

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
      amount: paise,
      currency,
      receipt: String(orderId).slice(0, 40),
      notes: {
        orderId: String(orderId),
        customerName,
        customerPhone,
        customerId: customerId || '',
      },
    });

    // Track the payment intent so there is always an audit trail.
    await db.collection(PAYMENTS_COLLECTION).doc(rzpOrder.id).set({
      paymentId: rzpOrder.id,
      orderId: String(orderId),
      razorpayOrderId: rzpOrder.id,
      amount: rupees,
      customerId: customerId || null,
      paymentStatus: 'Pending',
      paymentMethod: 'Online',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
    const user = await getVerifiedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    let orderData = null;

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

    if (orderId) {
      const orderSnap = await db.collection(ORDER_COLLECTION).doc(orderId).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      orderData = orderSnap.data() || {};
      if (!isAdminUser(user) && orderData.customerId && orderData.customerId !== user.uid) {
        return res.status(403).json({ success: false, error: 'Not authorized for this order' });
      }
    }

    if (!verifyCheckoutSignature(rzpOrderId, paymentId, signature)) {
      await recordPayment({
        paymentId,
        razorpayOrderId: rzpOrderId,
        orderId,
        amountRupees: Number(req.body.amount) || null,
        customer: {
          ...(customer || {}),
          customerId: customer?.customerId || customer?.uid || orderData?.customerId || user.uid,
        },
        status: 'failed',
        method: req.body.method || 'online',
        source: 'verify',
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
      customer: {
        ...(customer || {}),
        customerId: customer?.customerId || customer?.uid || orderData?.customerId || user.uid,
      },
      status: captured ? 'captured' : 'failed',
      method: payment.method,
      source: 'verify',
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
      paymentStatus: captured ? 'Paid' : 'Failed',
      message: 'Payment verified successfully',
    });
  } catch (err) {
    console.error('verify-payment failed:', err);
    return res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payment-status
// Body: { orderId, paymentStatus, paymentMethod?, paymentId?, razorpayOrderId?,
//         amount?, customerId?, reason? }
// Used for cancellation/timeout/failure updates from the client.
// ---------------------------------------------------------------------------
app.post('/payment-status', async (req, res) => {
  try {
    const user = await getVerifiedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const {
      orderId,
      paymentStatus,
      paymentMethod = 'online',
      paymentId = null,
      razorpayOrderId = null,
      amount = null,
      customerId = null,
      reason = '',
    } = req.body || {};

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const orderSnap = await db.collection(ORDER_COLLECTION).doc(orderId).get();
    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const orderData = orderSnap.data() || {};
    if (!isAdminUser(user) && orderData.customerId && orderData.customerId !== user.uid) {
      return res.status(403).json({ success: false, error: 'Not authorized for this order' });
    }

    const normalizedStatus = normalizePaymentStatus(paymentStatus);
    if (!VALID_PAYMENT_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ success: false, error: 'Invalid payment status' });
    }
    if (normalizedStatus === 'Paid' && !isAdminUser(user)) {
      return res.status(403).json({ success: false, error: 'Cannot mark payment as paid from this endpoint' });
    }

    await recordPayment({
      paymentId: paymentId || `manual-${orderId}`,
      razorpayOrderId,
      orderId,
      amountRupees: Number.isFinite(Number(amount)) ? Number(amount) : null,
      customer: { customerId: customerId || orderData.customerId || user.uid },
      status: normalizedStatus,
      method: paymentMethod,
      source: 'client-status',
      raw: {
        reason: reason || null,
      },
    });

    await db.collection(ORDER_COLLECTION).doc(orderId).set({
      paymentStatus: normalizedStatus,
      paymentMethod: normalizePaymentMethod(paymentMethod),
      paymentFailureReason: reason || '',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true, orderId, paymentStatus: normalizedStatus });
  } catch (err) {
    console.error('payment-status failed:', err);
    return res.status(500).json({ success: false, error: 'Could not update payment status' });
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
        customerId: entity.notes.customerId || null,
      } : null,
      status,
      method: entity.method,
      source: 'webhook',
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
  { region: 'asia-south1', secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, ALLOWED_ORIGINS] },
  app
);
