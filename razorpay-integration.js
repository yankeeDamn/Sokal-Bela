// ============================================================================
// RAZORPAY PAYMENT INTEGRATION FOR SOKAL BELA (Frontend)
//
// Production flow:
//   1. Order is saved to Firestore (status: payment pending) by the caller.
//   2. Backend `/api/create-payment-order` creates a Razorpay order.
//   3. Razorpay Checkout popup opens — supports UPI, credit/debit cards,
//      net banking and wallets (methods enabled in the Razorpay Dashboard).
//   4. On payment, the signature is verified server-side via
//      `/api/verify-payment` and the payment is stored in the `payments`
//      Firestore collection. A webhook provides the authoritative fallback.
//   5. User lands on the payment success or failure page.
//
// If the backend is unreachable (pure static hosting), the module falls back
// to a client-only Checkout WITHOUT order_id and marks the order
// "paid-unverified" — always deploy the backend for production.
// ============================================================================

(function () {
  'use strict';

  // Same-origin when deployed on Firebase Hosting (rewrite /api/** → api function).
  // Override with `window.PAYMENTS_API_BASE` for local dev (e.g. http://localhost:3000/api).
  const API_BASE = window.PAYMENTS_API_BASE || '/api';
  const RZP_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
  const RZP_KEY = window.RZP_KEY || '';

  let razorpayScriptPromise = null;

  function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayScriptPromise) return razorpayScriptPromise;
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = RZP_CHECKOUT_URL;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
      document.head.appendChild(s);
    });
    return razorpayScriptPromise;
  }

  async function apiPost(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Start a Razorpay payment for an existing Sokal Bela order.
   *
   * @param {Object} opts
   * @param {Object} opts.order    Order doc: { id, orderNumber, total }
   * @param {Object} opts.customer { name, email, phone }
   * @param {Function} opts.onSuccess (result) => {} — result: { paymentId, method, verified }
   * @param {Function} opts.onFailure ({ reason }) => {}
   * @param {Function} [opts.onDismiss] () => {} — user closed the popup
   */
  async function startPayment({ order, customer, onSuccess, onFailure, onDismiss }) {
    try {
      await loadRazorpayScript();
    } catch (e) {
      onFailure({ reason: 'gateway-unavailable' });
      return;
    }

    const amountPaise = Math.round(order.total * 100);
    let rzpOrderId = null;
    let keyId = RZP_KEY;
    let serverAmount = amountPaise;
    let backendDown = false;

    // Step 1 — create the Razorpay order on our backend.
    try {
      const { ok, data } = await apiPost('/create-payment-order', {
        orderId: order.id,
        amount: order.total,
        currency: 'INR',
        customer,
      });
      if (ok && data.success) {
        rzpOrderId = data.razorpayOrderId;
        keyId = data.keyId || keyId;
        serverAmount = data.amount;
      } else {
        backendDown = true;
      }
    } catch (e) {
      backendDown = true;
    }

    if (backendDown) {
      console.warn('Payments backend unreachable — falling back to unverified client checkout');
    }
    if (!keyId) {
      onFailure({ reason: 'not-configured' });
      return;
    }

    // Step 2 — open Checkout. UPI / cards / netbanking / wallets are shown
    // automatically based on the methods enabled in the Razorpay Dashboard.
    const rzp = new Razorpay({
      key: keyId,
      amount: serverAmount,
      currency: 'INR',
      name: 'Sokal Bela',
      description: `Order ${order.orderNumber || order.id}`,
      ...(rzpOrderId ? { order_id: rzpOrderId } : {}),
      prefill: { name: customer.name || '', email: customer.email || '', contact: customer.phone || '' },
      notes: { orderId: order.id },
      theme: { color: '#2d7a3a' },

      // Step 3 — payment completed: verify signature on the server.
      handler: async (response) => {
        if (backendDown || !rzpOrderId) {
          // No backend available: record what we can and flag as unverified.
          try {
            if (window.db) {
              await window.db.collection('orders').doc(order.id).update({
                paymentStatus: 'paid-unverified',
                razorpayId: response.razorpay_payment_id,
              });
            }
          } catch (e) { console.error('Order update failed:', e); }
          onSuccess({ paymentId: response.razorpay_payment_id, method: null, verified: false });
          return;
        }
        try {
          const { ok, data } = await apiPost('/verify-payment', {
            orderId: order.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            customer,
            amount: order.total,
          });
          if (ok && data.success) {
            onSuccess({ paymentId: data.paymentId, method: data.method, verified: true });
          } else {
            onFailure({ reason: 'verification-failed', paymentId: response.razorpay_payment_id });
          }
        } catch (e) {
          onFailure({ reason: 'verification-failed', paymentId: response.razorpay_payment_id });
        }
      },

      modal: { ondismiss: () => { if (onDismiss) onDismiss(); } },
    });

    // Gateway-reported payment failure (bad card, UPI timeout, etc.)
    rzp.on('payment.failed', (resp) => {
      const err = resp && resp.error ? resp.error : {};
      console.warn('Razorpay payment failed:', err.code, err.description);
      if (onDismiss) onDismiss(); // popup closes itself; let caller keep order pending
    });

    rzp.open();
  }

  window.SokalPayments = { startPayment };
})();
