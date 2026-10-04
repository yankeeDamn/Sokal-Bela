// Local Development Server for Sokal Bela
// This runs the API locally for testing without Firebase emulator

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

// Optional: real Razorpay integration for local development.
// Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in your environment or .env to enable;
// otherwise the payment endpoints return mock data.
try { require('dotenv').config(); } catch { /* dotenv not installed — use real env vars */ }
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('💳 Razorpay enabled (key: ' + process.env.RAZORPAY_KEY_ID.slice(0, 8) + '…)');
}

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Mock database in memory — match the storefront vegetable catalogue
let products = [
  { id: 'alu', name: 'Potato', bengaliName: 'আলু', hindiName: 'आलू', category: 'Root Vegetables', unit: 'kg', price: 30, base_price: 30, stock: 200, imageUrl: '/public/images/potato.svg', description: 'Fresh local potatoes', active: true, emoji: '🥔' },
  { id: 'peyaj', name: 'Onion', bengaliName: 'পেঁয়াজ', hindiName: 'प्याज', category: 'Root Vegetables', unit: 'kg', price: 40, base_price: 40, stock: 150, imageUrl: '/public/images/onion.svg', description: 'Fresh red onions', active: true, emoji: '🧅' },
  { id: 'tomato', name: 'Tomato', bengaliName: 'টমেটো', hindiName: 'टमाटर', category: 'Others', unit: 'kg', price: 60, base_price: 60, stock: 100, imageUrl: '/public/images/tomato.svg', description: 'Ripe red tomatoes', active: true, emoji: '🍅' },
  { id: 'morich', name: 'Green Chili', bengaliName: 'কাঁচা মরিচ', hindiName: 'हरी मिर्च', category: 'Others', unit: 'kg', price: 80, base_price: 80, stock: 40, imageUrl: '/public/images/chili.svg', description: 'Fresh green chillies', active: true, emoji: '🌶️' },
  { id: 'begun', name: 'Brinjal', bengaliName: 'বেগুন', hindiName: 'बैंगन', category: 'Others', unit: 'kg', price: 40, base_price: 40, stock: 80, imageUrl: '/public/images/veg-fallback.svg', description: 'Fresh brinjal', active: true, emoji: '🍆' },
  { id: 'palong', name: 'Spinach', bengaliName: 'পালং শাক', hindiName: 'पालक', category: 'Leafy Greens', unit: 'bunch', price: 20, base_price: 20, stock: 90, imageUrl: '/public/images/spinach.svg', description: 'Fresh spinach', active: true, emoji: '🥬' },
  { id: 'phkopi', name: 'Cauliflower', bengaliName: 'ফুলকপি', hindiName: 'फूलगोभी', category: 'Others', unit: 'piece', price: 50, base_price: 50, stock: 60, imageUrl: '/public/images/cauliflower.svg', description: 'Fresh cauliflower', active: true, emoji: '🥦' },
  { id: 'bkopi', name: 'Cabbage', bengaliName: 'বাঁধাকপি', hindiName: 'पत्ता गोभी', category: 'Others', unit: 'piece', price: 35, base_price: 35, stock: 50, imageUrl: '/public/images/cabbage.svg', description: 'Fresh cabbage', active: true, emoji: '🥬' },
  { id: 'karela', name: 'Bitter Gourd', bengaliName: 'করলা', hindiName: 'करेला', category: 'Gourds', unit: 'kg', price: 60, base_price: 60, stock: 40, imageUrl: '/public/images/bitter-gourd.svg', description: 'Fresh bitter gourd', active: true, emoji: '🥒' },
  { id: 'lau', name: 'Bottle Gourd', bengaliName: 'লাউ', hindiName: 'लौकी', category: 'Gourds', unit: 'piece', price: 25, base_price: 25, stock: 70, imageUrl: '/public/images/bottle-gourd.svg', description: 'Fresh bottle gourd', active: true, emoji: '🫙' }
];

let orders = [];
let orderCounter = 100;

// ===== AUTH ENDPOINTS =====
app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing email or password' });
    }
    const user = {
      uid: 'user_' + Date.now(),
      email,
      displayName: displayName || 'User',
      phone: '',
      addresses: [],
      createdAt: new Date().toISOString()
    };
    res.json({ success: true, user, message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing email or password' });
    }
    // Mock login
    if (email === 'admin@sokal.com' && password === 'admin123') {
      return res.json({ 
        success: true, 
        user: { 
          uid: 'admin', 
          email: 'admin@sokal.com', 
          displayName: 'Admin',
          isAdmin: true 
        },
        message: 'Login successful'
      });
    }
    res.json({ 
      success: true, 
      user: { 
        uid: 'user_' + Date.now(), 
        email, 
        displayName: email.split('@')[0],
        isAdmin: false 
      },
      message: 'Login successful' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== PRODUCT ENDPOINTS =====
app.get('/api/products', (req, res) => {
  try {
    let filtered = products;
    if (req.query.category) {
      filtered = products.filter(p => p.category === req.query.category);
    }
    if (req.query.search) {
      const search = req.query.search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
    }
    const lang = String(req.query.lang || req.get('x-language') || 'en').toLowerCase();
    const localized = filtered.map((p) => ({
      ...p,
      displayName: lang === 'bn' ? (p.bengaliName || p.name) : lang === 'hi' ? (p.hindiName || p.name) : p.name,
      lang
    }));
    res.json({ success: true, products: localized, lang });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ORDER ENDPOINTS =====
app.post('/api/orders', (req, res) => {
  try {
    const { customerSnapshot, items, delivery_fee = 0, tax = 0, couponCode = '', notes = '' } = req.body;
    
    if (!customerSnapshot || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product ${item.productId} not found` });
      }
      if (product.stock < item.qty) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}` });
      }
      
      const itemTotal = product.base_price * item.qty;
      subtotal += itemTotal;
      orderItems.push({
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        price: product.base_price,
        total: itemTotal
      });
      
      // Deduct stock
      product.stock -= item.qty;
    }

    // Calculate discount
    let discount = 0;
    if (couponCode === 'SAVE10') discount = subtotal * 0.10;
    else if (couponCode === 'SAVE50') discount = 50;
    else if (couponCode === 'WELCOME20') discount = subtotal * 0.20;

    const total = subtotal + delivery_fee + tax - discount;
    
    const order = {
      id: 'ORD' + (++orderCounter),
      customerId: customerSnapshot.uid || 'guest',
      customerSnapshot,
      items: orderItems,
      subtotal,
      delivery_fee,
      tax,
      discount,
      total,
      status: 'Pending',
      paymentStatus: 'Pending',
      notes,
      couponCode: couponCode || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(order);
    res.json({ success: true, order, message: 'Order created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/orders/:userId', (req, res) => {
  try {
    const userOrders = orders.filter(o => o.customerId === req.params.userId);
    res.json({ success: true, orders: userOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/orders', (req, res) => {
  try {
    res.json({ success: true, orders, count: orders.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/admin/orders/:orderId', (req, res) => {
  try {
    const { status } = req.body;
    const order = orders.find(o => o.id === req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    res.json({ success: true, order, message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== REVIEW ENDPOINTS =====
app.post('/api/products/:productId/reviews', (req, res) => {
  try {
    const { userId, userName, rating, comment } = req.body;
    const product = products.find(p => p.id === req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const review = {
      userId,
      userName,
      rating: parseInt(rating),
      comment,
      createdAt: new Date().toISOString()
    };

    if (!product.reviews) product.reviews = [];
    product.reviews = (product.reviews || 0) + 1;
    
    res.json({ success: true, review, message: 'Review added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:productId/reviews', (req, res) => {
  try {
    const product = products.find(p => p.id === req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, reviews: [], count: product.reviews || 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== NOTIFICATION ENDPOINTS =====
app.post('/api/notify/email', (req, res) => {
  try {
    const { to, subject, message } = req.body;
    console.log(`📧 Email sent to ${to}: ${subject}`);
    res.json({ success: true, message: 'Email notification sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notify/sms', (req, res) => {
  try {
    const { phone, message } = req.body;
    console.log(`📱 SMS sent to ${phone}: ${message}`);
    res.json({ success: true, message: 'SMS notification sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== PAYMENT ENDPOINTS =====
// In-memory payment records for local dev (Firestore is used in production).
let payments = [];

app.post('/api/create-payment-order', async (req, res) => {
  try {
    const { orderId, amount, customer } = req.body || {};
    if (!orderId || !Number.isFinite(Number(amount)) || Number(amount) < 1) {
      return res.status(400).json({ success: false, error: 'orderId and a valid amount are required' });
    }
    if (Number(amount) < 200) {
      return res.status(400).json({ success: false, error: 'Minimum order amount is ₹200' });
    }
    const paise = Math.round(Number(amount) * 100);

    if (razorpay) {
      const rzpOrder = await razorpay.orders.create({
        amount: paise,
        currency: 'INR',
        receipt: String(orderId).slice(0, 40),
        notes: { orderId: String(orderId), customerName: customer?.name || '' },
      });
      payments.push({
        orderId: String(orderId), razorpayOrderId: rzpOrder.id, amount: Number(amount),
        currency: 'INR', customer: customer || null, status: 'created',
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true, razorpayOrderId: rzpOrder.id, amount: rzpOrder.amount,
        currency: rzpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Mock mode (no Razorpay keys configured)
    const razorpayOrderId = 'order_mock' + Math.random().toString(36).slice(2, 11);
    payments.push({
      orderId: String(orderId), razorpayOrderId, amount: Number(amount),
      currency: 'INR', customer: customer || null, status: 'created',
      createdAt: new Date().toISOString(),
    });
    res.json({
      success: true, razorpayOrderId, amount: paise, currency: 'INR',
      keyId: '', message: 'Payment order created (mock)',
    });
  } catch (err) {
    console.error('create-payment-order failed:', err.message);
    res.status(500).json({ success: false, error: 'Could not create payment order' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
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

    if (razorpay) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${rzpOrderId}|${paymentId}`)
        .digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(String(signature), 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        payments.push({
          paymentId, orderId: orderId || null, razorpayOrderId: rzpOrderId,
          amount: Number(req.body.amount) || null, currency: 'INR',
          customer: customer || null, status: 'failed',
          createdAt: new Date().toISOString(),
        });
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
      const payment = await razorpay.payments.fetch(paymentId);
      payments.push({
        paymentId, orderId: orderId || null, razorpayOrderId: rzpOrderId,
        amount: payment.amount / 100, currency: 'INR', customer: customer || null,
        status: payment.status, method: payment.method,
        createdAt: new Date().toISOString(),
      });
      const captured = payment.status === 'captured' || payment.status === 'authorized';
      return res.status(captured ? 200 : 400).json({
        success: captured, paymentId, orderId: orderId || null,
        amount: payment.amount / 100, method: payment.method,
        message: captured ? 'Payment verified successfully' : `Payment status: ${payment.status}`,
      });
    }

    // Mock mode: signature check skipped
    payments.push({
      paymentId, orderId: orderId || null, razorpayOrderId: rzpOrderId,
      amount: Number(req.body.amount) || null, currency: 'INR',
      customer: customer || null, status: 'captured', method: 'mock',
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, paymentId, orderId: orderId || null, method: 'mock', message: 'Payment verified (mock)' });
  } catch (err) {
    console.error('verify-payment failed:', err.message);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

app.post('/api/payment-status', (req, res) => {
  try {
    const {
      orderId,
      paymentStatus = 'Pending',
      paymentMethod = 'Online',
      paymentId = null,
      amount = null,
      customerId = null,
      reason = '',
    } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const normalized = String(paymentStatus || 'Pending');
    payments.push({
      paymentId: paymentId || `manual-${orderId}`,
      orderId,
      amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
      customerId: customerId || null,
      paymentStatus: normalized,
      paymentMethod,
      reason,
      createdAt: new Date().toISOString(),
    });

    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.paymentStatus = normalized;
      order.paymentMethod = paymentMethod;
      order.updatedAt = new Date().toISOString();
    }

    res.json({ success: true, orderId, paymentStatus: normalized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List stored payment records (local dev inspection only)
app.get('/api/payments', (req, res) => {
  res.json({ success: true, payments, count: payments.length });
});

// ===== BULK REQUEST ENDPOINT =====
app.post('/api/bulk-requests', (req, res) => {
  try {
    const { contact, event_type, event_date, guest_count, items } = req.body;
    const bulkRequest = {
      id: 'BULK' + Date.now(),
      contact,
      event_type,
      event_date,
      guest_count,
      itemsRequested: items,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    res.json({ success: true, bulkRequest, message: 'Bulk request submitted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/products',
      'GET /api/products/:id',
      'POST /api/orders',
      'GET /api/orders/:userId',
      'GET /api/admin/orders',
      'PATCH /api/admin/orders/:orderId',
      'POST /api/products/:productId/reviews',
      'GET /api/products/:productId/reviews',
      'POST /api/notify/email',
      'POST /api/notify/sms',
      'POST /api/create-payment-order',
      'POST /api/verify-payment',
      'POST /api/payment-status',
      'GET /api/payments',
      'POST /api/bulk-requests'
    ]
  });
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get(/^\/admin\/.+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// SPA fallback for extensionless frontend routes
app.get(/^\/(?!api\/)(?!.*\.[a-zA-Z0-9]+$).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     🚀 Sokal Bela Development Server Started           ║
╠════════════════════════════════════════════════════════╣
║ Server: http://localhost:${PORT}                        ║
║ API Health: http://localhost:${PORT}/api/health         ║
║ Frontend: http://localhost:${PORT}                      ║
╠════════════════════════════════════════════════════════╣
║ Sample Credentials:                                    ║
║ - Email: admin@sokal.com                               ║
║ - Password: admin123                                    ║
║                                                        ║
║ Sample Coupons:                                        ║
║ - SAVE10 (10% off)                                      ║
║ - SAVE50 (₹50 off)                                      ║
║ - WELCOME20 (20% off)                                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
