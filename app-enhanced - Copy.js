// ============================================================================
// SOKAL BELA - ENHANCED VERSION WITH ALL FEATURES
// ============================================================================

// Backend functions base (set in index.html for emulator or cloud)
const FUNCTIONS_BASE = window.FUNCTIONS_BASE || 'http://localhost:5001/sokal-bela-store/us-central1/api';

// Initialize Firestore (Firebase SDK must be loaded in index.html first)
const db = window.firebase ? firebase.firestore() : null;

// ============================================================================
// APPLICATION STATE
// ============================================================================

let currentUser = null; // { uid, email, displayName, phone, addresses[] }
let currentProducts = [];
let currentCategory = 'All';
let searchQuery = '';
let cart = [];
let orders = [];
let isAdminLoggedIn = false;
let userWishlist = [];
let appliedCoupon = null;

// Sample products to use as a fallback when no backend/firestore is available
const SAMPLE_PRODUCTS = [
    {
        id: 'p-potato',
        name: 'Potato',
        category: 'Root Vegetables',
        unit: 'kg',
        base_price: 30,
        stock: 500,
        images: ['https://images.unsplash.com/photo-1582515073490-3998137b60d7?auto=format&fit=crop&w=800&q=60'],
        description: 'Fresh local potatoes',
        rating: 4.5,
        reviews: 12
    },
    {
        id: 'p-tomato',
        name: 'Tomato',
        category: 'Fruits',
        unit: 'kg',
        base_price: 40,
        stock: 300,
        images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=60'],
        description: 'Ripe red tomatoes',
        rating: 4.8,
        reviews: 25
    },
    {
        id: 'p-onion',
        name: 'Onion',
        category: 'Root Vegetables',
        unit: 'kg',
        base_price: 35,
        stock: 400,
        images: ['https://images.unsplash.com/photo-1582464312705-1f7a1b7b8d1b?auto=format&fit=crop&w=800&q=60'],
        description: 'Fresh red onions',
        rating: 4.3,
        reviews: 8
    },
    {
        id: 'p-spinach',
        name: 'Spinach',
        category: 'Leafy Vegetables',
        unit: 'bunch',
        base_price: 25,
        stock: 150,
        images: ['https://images.unsplash.com/photo-1599599810694-2202a2e68fa0?auto=format&fit=crop&w=800&q=60'],
        description: 'Fresh green spinach',
        rating: 4.6,
        reviews: 5
    },
    {
        id: 'p-carrot',
        name: 'Carrot',
        category: 'Root Vegetables',
        unit: 'kg',
        base_price: 28,
        stock: 250,
        images: ['https://images.unsplash.com/photo-1599599810694-2202a2e68fa0?auto=format&fit=crop&w=800&q=60'],
        description: 'Orange sweet carrots',
        rating: 4.7,
        reviews: 15
    }
];

// Sample coupons
const SAMPLE_COUPONS = {
    'SAVE10': { code: 'SAVE10', discount: 10, type: 'percent', minAmount: 200 },
    'SAVE50': { code: 'SAVE50', discount: 50, type: 'fixed', minAmount: 500 },
    'WELCOME20': { code: 'WELCOME20', discount: 20, type: 'percent', minAmount: 300 },
};

// ============================================================================
// INITIALIZE & EVENT SETUP
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadCartFromStorage();
    loadUserFromStorage();
    loadWishlistFromStorage();
    updateCartCount();
    updateAuthUI();
});

// ============================================================================
// AUTHENTICATION SYSTEM
// ============================================================================

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value.trim();
    const displayName = document.getElementById('signup-name')?.value.trim();
    const phone = document.getElementById('signup-phone')?.value.trim();

    if (!email || !password || !displayName || !phone) {
        showError('Please fill in all required fields');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    showLoading();
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName, phone })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        currentUser = { uid: data.uid, email, displayName, phone, addresses: [] };
        saveUserToStorage();
        updateAuthUI();
        showPage('home');
        showToast('Account created successfully! Welcome ' + displayName);
        document.getElementById('signup-form')?.reset();
    } catch (error) {
        console.error('Signup error:', error);
        showError('Failed to create account: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();

    if (!email || !password) {
        showError('Please enter email and password');
        return;
    }

    showLoading();
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        currentUser = data.user;
        saveUserToStorage();
        updateAuthUI();
        showPage('home');
        showToast('Welcome back, ' + currentUser.displayName);
        document.getElementById('login-form')?.reset();
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    currentUser = null;
    cart = [];
    localStorage.removeItem('sokal_user_v1');
    localStorage.removeItem('sokal_cart_v1');
    updateAuthUI();
    showPage('home');
    showToast('Logged out successfully');
}

function saveUserToStorage() {
    try { localStorage.setItem('sokal_user_v1', JSON.stringify(currentUser)); } catch (e) { console.error(e); }
}

function loadUserFromStorage() {
    try {
        const raw = localStorage.getItem('sokal_user_v1');
        if (raw) currentUser = JSON.parse(raw);
    } catch (e) { console.error(e); currentUser = null; }
}

function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    
    if (!authSection || !userSection) return;

    if (currentUser) {
        authSection.innerHTML = '';
        authSection.style.display = 'none';
        userSection.style.display = 'block';
        document.getElementById('user-name').textContent = currentUser.displayName;
        document.getElementById('user-email').textContent = currentUser.email;
    } else {
        authSection.style.display = 'block';
        userSection.style.display = 'none';
        authSection.innerHTML = `
            <div style="display: flex; gap: 10px;">
                <button class="btn btn--outline" onclick="showAuthModal('login')">Login</button>
                <button class="btn btn--primary" onclick="showAuthModal('signup')">Sign Up</button>
            </div>
        `;
    }
}

function showAuthModal(type) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    const loginForm = document.getElementById('login-form-container');
    const signupForm = document.getElementById('signup-form-container');

    if (type === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }

    showModal('auth-modal');
}

// ============================================================================
// PRODUCT LOADING
// ============================================================================

async function loadProductsFromBackend() {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/products`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products)) {
            return data.products.map(p => ({ id: p.id, ...p }));
        }
        if (db) {
            const snapshot = await db.collection('products').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return [];
    } catch (error) {
        console.error('Error loading products from backend:', error);
        if (db) {
            try {
                const snapshot = await db.collection('products').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error('Fallback Firestore load failed', e);
            }
        }
        return [];
    }
}

async function initializeApp() {
    showLoading();
    try {
        currentProducts = await loadProductsFromBackend();
        if (!currentProducts || !Array.isArray(currentProducts) || currentProducts.length === 0) {
            console.warn('No products loaded — using SAMPLE_PRODUCTS fallback');
            currentProducts = SAMPLE_PRODUCTS.slice();
        }
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

// ============================================================================
// ORDERS & CHECKOUT
// ============================================================================

async function saveOrderToBackend(orderPayload) {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (!data || !data.success) {
            throw new Error(data && data.error ? data.error : 'Unknown error from backend');
        }
        return data;
    } catch (error) {
        console.error('Error saving order to backend:', error);
        throw error;
    }
}

async function loadOrdersFromBackend() {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/admin/orders`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.orders)) return data.orders;
        if (db) {
            const snapshot = await db.collection('orders').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return [];
    } catch (error) {
        console.error('Error loading orders from backend:', error);
        if (db) {
            try {
                const snapshot = await db.collection('orders').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error('Fallback Firestore load failed', e);
            }
        }
        return [];
    }
}

async function handleOrderSubmission(e) {
    e.preventDefault();

    if (!currentUser) {
        showError('Please log in to place an order');
        showAuthModal('login');
        return;
    }

    const customerAddress = document.getElementById('customer-address')?.value.trim();

    if (!customerAddress) {
        showError('Please enter a delivery address');
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
        const payload = {
            customerId: currentUser.uid,
            customerSnapshot: { 
                displayName: currentUser.displayName, 
                phone: currentUser.phone, 
                address: customerAddress,
                email: currentUser.email
            },
            items: cart.map(i => ({ productId: i.id || i.productId, qty: i.qty || 1 })),
            delivery_fee: 0,
            tax: 0,
            discount: appliedCoupon ? appliedCoupon.discount : 0,
            notes: document.getElementById('order-notes')?.value || ''
        };

        const result = await saveOrderToBackend(payload);

        // Send email notification
        await sendOrderEmail(currentUser.email, result.orderId, total);

        cart = [];
        appliedCoupon = null;
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

async function sendOrderEmail(email, orderId, amount) {
    try {
        await fetch(`${FUNCTIONS_BASE}/notify/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                subject: `Order Confirmation - #${orderId}`,
                template: 'order_confirmation',
                data: { orderId, amount, timestamp: new Date().toISOString() }
            })
        });
    } catch (err) {
        console.error('Email notification failed (non-blocking):', err);
    }
}

async function loadAdminDashboard() {
    try {
        orders = await loadOrdersFromBackend();
        const tbody = document.getElementById('orders-table-body');
        if (tbody) {
            tbody.innerHTML = orders.map(o => `
                <tr>
                    <td>${o.id}</td>
                    <td>${escapeHtml(o.customerSnapshot?.displayName || o.customerName || '')}</td>
                    <td>${escapeHtml(o.customerSnapshot?.phone || o.phone || '')}</td>
                    <td>${(o.items || []).map(it => escapeHtml(it.name || it.productId)).join('<br>')}</td>
                    <td>₹${o.total ?? o.totalAmount ?? 0}</td>
                    <td>
                        <select class="form-control" onchange="updateOrderStatus('${o.id}', this.value)">
                            <option ${o.status==='Pending'?'selected':''}>Pending</option>
                            <option ${o.status==='Confirmed'?'selected':''}>Confirmed</option>
                            <option ${o.status==='Packed'?'selected':''}>Packed</option>
                            <option ${o.status==='OutForDelivery'?'selected':''}>OutForDelivery</option>
                            <option ${o.status==='Delivered'?'selected':''}>Delivered</option>
                            <option ${o.status==='Cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                    <td>${o.createdAt ? (o.createdAt.seconds ? new Date(o.createdAt.seconds*1000).toISOString().split('T')[0] : o.createdAt) : ''}</td>
                    <td><button class="btn btn--sm" onclick="fetchOrderDetails('${o.id}')">View</button></td>
                </tr>
            `).join('');
        }

        document.getElementById('total-orders').textContent = orders.length;
        const revenue = orders.reduce((s, x) => s + (x.total || 0), 0);
        document.getElementById('total-revenue').textContent = `₹${revenue}`;
        document.getElementById('total-products').textContent = currentProducts.length;
    } catch (err) {
        console.error('renderAdminDashboard error', err);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/admin/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (!data || !data.success) throw new Error('Failed to update order');
        showToast('Order status updated');
        await loadAdminDashboard();
    } catch (err) {
        console.error(err);
        showError('Failed to update order status');
    }
}

async function fetchOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        showError('Order not found');
        return;
    }
    
    const detailsHtml = `
        <div style="max-width: 500px;">
            <h3>Order #${order.id}</h3>
            <p><strong>Customer:</strong> ${escapeHtml(order.customerSnapshot?.displayName || '')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(order.customerSnapshot?.phone || '')}</p>
            <p><strong>Address:</strong> ${escapeHtml(order.customerSnapshot?.address || '')}</p>
            <h4>Items:</h4>
            <ul>
                ${(order.items || []).map(it => `<li>${escapeHtml(it.name || it.productId)} - ${it.qty} x ₹${it.unit_price || 0}</li>`).join('')}
            </ul>
            <p><strong>Total:</strong> ₹${order.total || 0}</p>
            <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
            <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleString() : ''}</p>
        </div>
    `;
    
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        modal.innerHTML = detailsHtml;
        showModal('order-details-modal');
    }
}

// ============================================================================
// WISHLIST & REVIEWS
// ============================================================================

function addToWishlist(productId) {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }

    if (userWishlist.includes(productId)) {
        userWishlist = userWishlist.filter(id => id !== productId);
        showToast('Removed from wishlist');
    } else {
        userWishlist.push(productId);
        showToast('Added to wishlist');
    }
    saveWishlistToStorage();
    renderAllProducts();
}

function saveWishlistToStorage() {
    try { localStorage.setItem(`sokal_wishlist_${currentUser?.uid || 'guest'}`, JSON.stringify(userWishlist)); } catch (e) { console.error(e); }
}

function loadWishlistFromStorage() {
    try {
        const raw = localStorage.getItem(`sokal_wishlist_${currentUser?.uid || 'guest'}`);
        if (raw) userWishlist = JSON.parse(raw);
    } catch (e) { console.error(e); userWishlist = []; }
}

function isInWishlist(productId) {
    return userWishlist.includes(productId);
}

async function submitReview(productId, rating, comment) {
    if (!currentUser) {
        showAuthModal('login');
        return;
    }

    showLoading();
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/products/${productId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.uid,
                userName: currentUser.displayName,
                rating: parseInt(rating),
                comment: comment.trim()
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast('Review submitted successfully');
    } catch (error) {
        console.error('Review error:', error);
        showError('Failed to submit review');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// COUPON & DISCOUNT SYSTEM
// ============================================================================

function applyCoupon(couponCode) {
    const coupon = SAMPLE_COUPONS[couponCode.toUpperCase()];
    
    if (!coupon) {
        showError('Invalid coupon code');
        return;
    }

    const subtotal = getCartTotal();
    if (subtotal < coupon.minAmount) {
        showError(`Minimum order amount for this coupon is ₹${coupon.minAmount}`);
        return;
    }

    appliedCoupon = coupon;
    updateCartSummary();
    showToast('Coupon applied: ' + coupon.code);
}

function removeCoupon() {
    appliedCoupon = null;
    updateCartSummary();
    showToast('Coupon removed');
}

// ============================================================================
// RENDERING & UI
// ============================================================================

function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) showPage(page);
        });
    });

    // Hamburger for mobile
    const ham = document.getElementById('hamburger');
    if (ham) ham.addEventListener('click', () => document.getElementById('nav-menu')?.classList.toggle('open'));

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderAllProducts();
        });
    }

    // Checkout form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) checkoutForm.addEventListener('submit', handleOrderSubmission);

    // Auth forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Coupon
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => {
            const code = document.getElementById('coupon-code')?.value.trim();
            if (code) applyCoupon(code);
        });
    }

    // Prevent modal background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

function renderFeaturedProducts() {
    const container = document.getElementById('featured-grid');
    if (!container) return;
    const featured = currentProducts.filter(p => p.featured || (p.tags && p.tags.includes('featured'))).slice(0, 6);
    container.innerHTML = featured.map(p => `
        <div class="card product-card">
            <img src="${p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1543353071-087092ec393a'}" alt="${escapeHtml(p.name)}">
            <div class="card__body">
                <div class="product-title">${escapeHtml(p.name)}</div>
                <div class="product-price">₹${p.base_price ?? p.price ?? 0} / ${p.unit ?? 'kg'}</div>
                ${p.rating ? `<div class="product-rating">⭐ ${p.rating} (${p.reviews || 0} reviews)</div>` : ''}
            </div>
            <div class="card__footer product-footer">
                <button class="btn btn--primary" data-product-id="${p.id}" onclick="addToCartFromButton(event)">Add</button>
                <button class="btn btn--outline" title="Add to wishlist" onclick="addToWishlist('${p.id}')">♡</button>
            </div>
        </div>
    `).join('');
}

function renderAllProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    const filtered = currentProducts.filter(p => {
        if (currentCategory && currentCategory !== 'All') {
            if ((p.category || '').toLowerCase() !== currentCategory.toLowerCase()) return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (p.name || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q));
        }
        return true;
    });

    grid.innerHTML = filtered.map(p => `
        <div class="card product-card">
            <div style="position: relative;">
                <img src="${p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1543353071-087092ec393a'}" alt="${escapeHtml(p.name)}">
                ${isInWishlist(p.id) ? '<div style="position: absolute; top: 10px; right: 10px; color: red; font-size: 20px;">♥</div>' : ''}
            </div>
            <div class="card__body">
                <div class="product-title">${escapeHtml(p.name)}</div>
                <div class="product-desc">${escapeHtml(p.description || '')}</div>
                <div class="product-price">₹${p.base_price ?? p.price ?? 0} / ${p.unit ?? 'kg'}</div>
                ${p.rating ? `<div class="product-rating">⭐ ${p.rating} (${p.reviews || 0})</div>` : ''}
                <div class="product-actions">
                    <input type="number" min="1" value="1" class="form-control qty-input" data-product-id="${p.id}" style="width:80px;display:inline-block;margin-right:8px;">
                    <button class="btn btn--primary" data-product-id="${p.id}" onclick="addToCartFromCard(event)">Add to cart</button>
                    <button class="btn btn--outline" onclick="addToWishlist('${p.id}')" style="margin-left: 8px;">♡</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    const cats = Array.from(new Set(['All', ...currentProducts.map(p => p.category).filter(Boolean)]));
    container.innerHTML = cats.map(c => `<button class="btn btn--outline category-btn" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    container.querySelectorAll('.category-btn').forEach(b => b.addEventListener('click', (e) => {
        currentCategory = b.getAttribute('data-cat') || 'All';
        renderAllProducts();
    }));
}

function getCartTotal() {
    let total = cart.reduce((s, it) => s + (it.qty * (it.price || 0)), 0);
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            total -= (total * appliedCoupon.discount / 100);
        } else {
            total -= appliedCoupon.discount;
        }
    }
    return Math.max(0, total);
}

function updateCartSummary() {
    const subtotal = cart.reduce((s, it) => s + (it.qty * (it.price || 0)), 0);
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (discountEl && appliedCoupon) {
        const discountAmount = appliedCoupon.type === 'percent' 
            ? (subtotal * appliedCoupon.discount / 100)
            : appliedCoupon.discount;
        discountEl.textContent = `-₹${discountAmount}`;
    }
    if (totalEl) totalEl.textContent = `₹${getCartTotal()}`;
}

function renderCartPage() {
    const itemsContainer = document.getElementById('cart-items');
    const emptyEl = document.getElementById('empty-cart');
    const summaryEl = document.getElementById('cart-summary');

    if (!itemsContainer || !emptyEl || !summaryEl) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '';
        emptyEl.style.display = 'block';
        summaryEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    summaryEl.style.display = 'block';

    itemsContainer.innerHTML = cart.map(i => `
        <div class="card" style="margin-bottom:12px;padding:12px;display:flex;align-items:center;gap:12px;">
            <div style="flex:1">
                <div style="font-weight:600">${escapeHtml(i.name)}</div>
                <div style="color:var(--color-text-secondary);font-size:13px">₹${i.price} each</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <button class="btn btn--outline" onclick="changeCartQty('${i.id}', ${Math.max(1, i.qty - 1)})">−</button>
                <div>${i.qty}</div>
                <button class="btn btn--outline" onclick="changeCartQty('${i.id}', ${i.qty + 1})">+</button>
                <button class="btn btn--secondary" onclick="removeFromCart('${i.id}')">Remove</button>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

// ============================================================================
// CART MANAGEMENT
// ============================================================================

function addToCartFromCard(e) {
    const id = e.currentTarget.getAttribute('data-product-id');
    const input = document.querySelector(`.qty-input[data-product-id="${id}"]`);
    const qty = Number(input?.value) || 1;
    addToCart(id, qty);
}

function addToCartFromButton(e) {
    const id = e.currentTarget.getAttribute('data-product-id');
    addToCart(id, 1);
}

function addToCart(productId, qty = 1) {
    const prod = currentProducts.find(p => p.id === productId);
    if (!prod) return showError('Product not found');
    const existing = cart.find(i => i.id === productId);
    if (existing) existing.qty = Math.min((existing.qty || 0) + qty, prod.stock || 999999);
    else cart.push({ id: productId, name: prod.name, qty: qty, price: prod.base_price ?? prod.price ?? 0 });
    saveCartToStorage();
    updateCartCount();
    showToast('Added to cart');
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCartToStorage();
    renderCartPage();
    updateCartCount();
}

function changeCartQty(productId, qty) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty = Math.max(1, qty);
    saveCartToStorage();
    renderCartPage();
    updateCartCount();
}

function saveCartToStorage() {
    try { localStorage.setItem('sokal_cart_v1', JSON.stringify(cart)); } catch (e) { console.error(e); }
}

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem('sokal_cart_v1');
        if (raw) cart = JSON.parse(raw);
    } catch (e) { console.error(e); cart = []; }
}

function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (el) {
        const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
        el.textContent = count;
    }
}

// ============================================================================
// ADMIN LOGIN
// ============================================================================

function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const user = document.getElementById('admin-username')?.value.trim();
    const pass = document.getElementById('admin-password')?.value.trim();
    const errorEl = document.getElementById('login-error');
    if (user === 'admin' && pass === 'admin123') {
        isAdminLoggedIn = true;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadAdminDashboard();
    } else {
        if (errorEl) { 
            errorEl.style.display = 'block'; 
            errorEl.textContent = 'Invalid credentials'; 
        }
    }
}

// ============================================================================
// PAGE NAVIGATION & MODALS
// ============================================================================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`${pageId}-page`);
    if (el) el.classList.add('active');
    if (pageId === 'cart') renderCartPage();
    window.scrollTo(0, 0);
}

function showModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function showLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'flex';
}

function hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
}

function showError(msg) {
    alert(msg);
}

function showToast(msg, type = 'success') {
    console.log('TOAST', type, msg);
    // You can implement a proper toast notification here
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================================================

// Cart & Product functions
window.addToCartFromCard = addToCartFromCard;
window.addToCartFromButton = addToCartFromButton;
window.changeCartQty = changeCartQty;
window.removeFromCart = removeFromCart;
window.addToWishlist = addToWishlist;
window.submitReview = submitReview;

// Page & Modal functions
window.showPage = showPage;
window.closeModal = closeModal;
window.showModal = showModal;
window.showAuthModal = showAuthModal;

// Admin functions
window.updateOrderStatus = updateOrderStatus;
window.fetchOrderDetails = fetchOrderDetails;
window.handleAdminLogin = handleAdminLogin;

// Auth functions
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;

// Coupon functions
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
