import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase Messaging
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request notification permission
export async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Get FCM token
            const token = await getToken(messaging);
            console.log('FCM Token:', token);
            return token;
        }
        throw new Error('Notification permission denied');
    } catch (error) {
        console.error('Error getting notification permission:', error);
        throw error;
    }
}

// Handle incoming messages when app is in foreground
onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    // Create and show notification
    const notification = new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/path/to/icon.png'  // Add your notification icon
    });
});

// Function to send notification when order is placed
export async function sendOrderNotification(orderDetails) {
    try {
        // Send to your backend/Firebase Function
        const response = await fetch('YOUR_FIREBASE_FUNCTION_URL', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: 'New Order Received!',
                body: `Order #${orderDetails.orderId} has been placed for ₹${orderDetails.total}`,
                orderDetails: orderDetails
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send notification');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}