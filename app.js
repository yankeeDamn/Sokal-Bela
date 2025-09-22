// Initialize Firestore (Firebase SDK must be loaded in index.html first)
const db = firebase.firestore();

// Application State
let currentProducts = [];
let currentCategory = 'All';
let searchQuery = '';
let cart = [];
let orders = [];
let isAdminLoggedIn = false;

// DOM Elements
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const cartCountElement = document.getElementById('cart-count');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadCartFromStorage();
    updateCartCount();
});

// Load products from Firebase Firestore
async function loadProductsFromFirebase() {
    try {
        const snapshot = await db.collection('products').get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return products;
    } catch (error) {
        console.error('Error loading products from Firebase:', error);
        alert('Failed to load products. Showing sample data for now.');
        return sampleData.vegetables; // fallback sample data
    }
}

// Save order to Firebase Firestore
async function saveOrderToFirebase(order) {
    try {
        await db.collection('orders').add(order);
        console.log('Order saved to Firebase:', order);
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Failed to save order. Please try again.');
        throw error;
    }
}

// Load orders from Firebase Firestore
async function loadOrdersFromFirebase() {
    try {
        const snapshot = await db.collection('orders').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error loading orders from Firebase:', error);
        alert('Failed to load orders.');
        return orders; // fallback to local orders
    }
}

// Application Initialization
async function initializeApp() {
    showLoading();
    try {
        currentProducts = await loadProductsFromFirebase();
        renderFeaturedProducts();
        renderAllProducts();
        renderCategoryFilters();

        if (isAdminLoggedIn) {
            await loadAdminDashboard();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to load application data');
    } finally {
        hideLoading();
    }
}

// The rest of your code (event listeners, rendering, cart handling, admin, etc.) stays as it was.
// Replace calls to save orders and load orders with saveOrderToFirebase and loadOrdersFromFirebase respectively.

// Updated Order Submission Handler using Firebase
async function handleOrderSubmission(e) {
    e.preventDefault();

    const customerName = document.getElementById('customer-name')?.value.trim();
    const customerPhone = document.getElementById('customer-phone')?.value.trim();
    const customerAddress = document.getElementById('customer-address')?.value.trim();

    if (!customerName || !customerPhone || !customerAddress) {
        showError('Please fill in all required fields');
        return;
    }

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        showError('Please enter a valid 10-digit phone number');
        return;
    }

    if (cart.length === 0) {
        showError('Your cart is empty');
        return;
    }

    const total = getCartTotal();
    if (total < 200) {
        showError('Minimum order amount is ₹200');
        return;
    }

    showLoading();

    try {
        const order = {
            customerName,
            phone: customerPhone,
            address: customerAddress,
            items: [...cart],
            total,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0]
        };

        await saveOrderToFirebase(order);

        cart = [];
        saveCartToStorage();
        updateCartCount();

        const form = document.getElementById('checkout-form');
        if (form) form.reset();

        renderCartPage();
        showModal('success-modal');
    } catch (error) {
        console.error('Error placing order:', error);
        showError('Failed to place order. Please try again.');
    } finally {
        hideLoading();
    }
}

// Wherever orders are loaded in admin, replace with:
async function loadAdminDashboard() {
    try {
        orders = await loadOrdersFromFirebase();
        // Then proceed to update admin dashboard UI as before
        // ...
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}
