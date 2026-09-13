import { firebaseConfig } from './firebase-config.js';

const NOTIFICATIONS_API_BASE = window.NOTIFICATIONS_API_BASE || '/api';
let messaging = null;

function getMessagingInstance() {
  if (messaging) return messaging;
  if (typeof firebase === 'undefined' || !firebase.messaging) return null;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  messaging = firebase.messaging();
  return messaging;
}

export async function requestNotificationPermission(vapidKey = '') {
  const instance = getMessagingInstance();
  if (!instance) throw new Error('Firebase Messaging is unavailable');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }
  const token = await instance.getToken(vapidKey ? { vapidKey } : undefined);
  return token;
}

export function registerForegroundNotifications(onNotification) {
  const instance = getMessagingInstance();
  if (!instance) return;
  instance.onMessage((payload) => {
    if (typeof onNotification === 'function') onNotification(payload);
    if (payload?.notification?.title) {
      new Notification(payload.notification.title, {
        body: payload.notification.body || '',
        icon: '/favicon.ico',
      });
    }
  });
}

export async function sendOrderNotification(orderDetails) {
  const response = await fetch(`${NOTIFICATIONS_API_BASE}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'New Order Received',
      body: `Order ${orderDetails.orderNumber || orderDetails.orderId || ''} placed for ₹${orderDetails.total || 0}`,
      orderDetails,
    }),
  });
  if (!response.ok) throw new Error('Failed to send notification');
  return response.json();
}
