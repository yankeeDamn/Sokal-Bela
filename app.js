// Backend functions base (set in index.html for emulator or cloud)
const FUNCTIONS_BASE = window.FUNCTIONS_BASE || 'http://localhost:5001/sokal-bela-store/us-central1/api';

// db and auth are initialized in index.html via Firebase SDK
// If Firebase SDK is unavailable (e.g. local dev without CDN), fall back to null

// Application State
let currentProducts = [];
let currentCategory = 'All';
let searchQuery = '';
let cart = [];
let orders = [];
let isAdminLoggedIn = false;

// Sample products to use as a fallback when no backend/firestore is available
let currentUser = null; // regular user
const SAMPLE_PRODUCTS = [
    {
        id: 'p-potato',
        name: 'Potato',
        category: 'Root Vegetables',
        unit: 'kg',
        base_price: 30,
        stock: 500,
        images: ['https://images.unsplash.com/photo-1582515073490-3998137b60d7?auto=format&fit=crop&w=800&q=60'],
        description: 'Fresh local potatoes'
    },
    {
        id: 'p-tomato',
        name: 'Tomato',
        category: 'Fruits',
        unit: 'kg',
        base_price: 40,
        stock: 300,
        images: ['https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=60'],
        description: 'Ripe red tomatoes'
    },
    {
        id: 'p-onion',
        name: 'Onion',
        category: 'Root Vegetables',
        unit: 'kg',
        base_price: 35,
        stock: 400,
        images: ['https://images.unsplash.com/photo-1582464312705-1f7a1b7b8d1b?auto=format&fit=crop&w=800&q=60'],
        description: 'Fresh red onions'
    }
];

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

// Load products from backend Cloud Functions (falls back to Firestore if needed)
async function loadProductsFromBackend() {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/products`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products)) {
            return data.products.map(p => ({ id: p.id, ...p }));
        }
        // fallback to Firestore if available
        if (db) {
            const snapshot = await db.collection('products').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return [];
    } catch (error) {
        console.error('Error loading products from backend:', error);
        // fallback to Firestore if available
        updateNavForUser();
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

// Save order via backend Cloud Function (creates order and updates stock transactionally)
async function saveOrderToBackend(orderPayload) {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (!data || !data.success) {
    // user logout link (if any)
    const userLogout = document.getElementById('user-logout');
    if (userLogout) {
        userLogout.addEventListener('click', () => {
            currentUser = null;
            updateNavForUser();
            showToast('Logged out');
            closeModal('auth-modal');
            try { localStorage.removeItem('sokal_user_v1'); } catch(e){}
        });
    }
            throw new Error(data && data.error ? data.error : 'Unknown error from backend');
        }
        return data;
    } catch (error) {
        console.error('Error saving order to backend:', error);
        throw error;
    }
}

// Load orders (admin) via backend - falls back to Firestore
async function loadOrdersFromBackend() {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/admin/orders`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.orders)) return data.orders;
        if (db) {
            const snapshot = await db.collection('orders').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
window.showAuthModal = showAuthModal;
window.loginUser = loginUser;
window.signupUser = signupUser;
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

// Application Initialization
async function initializeApp() {
    showLoading();
    try {
        // load products via backend first (emulator or deployed functions)
        if (typeof loadProductsFromBackend === 'function') {
            currentProducts = await loadProductsFromBackend();
        } else {
            currentProducts = await loadProductsFromFirebase();
        }
        // If backend/firestore returned no products, fall back to bundled sample products
        if (!currentProducts || !Array.isArray(currentProducts) || currentProducts.length === 0) {
            console.warn('No products loaded from backend/firestore — using SAMPLE_PRODUCTS fallback');
            currentProducts = SAMPLE_PRODUCTS.slice();
        }
        renderFeaturedProducts();
        renderAllProducts();
        renderCategoryFilters();

        if (isAdminLoggedIn) {
            await loadAdminDashboard();
        }
            // load any cached user
            loadUserFromStorage();
            updateNavForUser();
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

    // check if user wants to pay now (online)
    const payNow = document.getElementById('pay-now')?.checked;
    if (payNow) {
        if (!currentUser) {
            showError('Please login to pay');
            showAuthModal('login');
            return;
        }
        if (typeof handleCheckoutWithPayment === 'function') {
            return handleCheckoutWithPayment(e);
        }
        // if payment handler unavailable, continue to create order then mark paid
    }

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
        // Build payload that backend expects
        const payload = {
            customerSnapshot: { displayName: customerName, phone: customerPhone, address: customerAddress },
            items: cart.map(i => ({ productId: i.id || i.productId, qty: i.qty || i.quantity || 1 })),
            delivery_fee: 0,
            tax: 0,
            notes: ''
        };

        const result = await saveOrderToBackend(payload);
        const orderId = result.orderId || (result.order && result.order.id);

        // if payNow remained true but no real payment was processed, mark order paid
        if (payNow && orderId) {
            try {
                await fetch(`${FUNCTIONS_BASE}/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentStatus: 'Paid', paymentMethod: 'mock' }) });
                await fetch(`${FUNCTIONS_BASE}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Order Paid', body: `Order ${orderId} paid (mock)`, orderId }) });
            } catch (err) {
                console.error('Payment/notify failed', err);
            }
        }

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
        orders = await loadOrdersFromBackend();
        // Then proceed to update admin dashboard UI as before
        // ...
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

/* ------------------ Frontend rendering, cart and UI helpers ------------------ */

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
    if (ham) ham.addEventListener('click', () => document.getElementById('nav-menu')?.classList.toggle('show'));

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

    // auth form (login/signup)
    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuthForm);

    const authToggle = document.getElementById('auth-toggle-link');
    if (authToggle) authToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
}

function renderFeaturedProducts() {
    const container = document.getElementById('featured-grid');
    if (!container) return;
    const featured = currentProducts.filter(p => p.featured || (p.tags && p.tags.includes('featured'))).slice(0,6);
    container.innerHTML = featured.map(p => `
        <div class="card product-card">
            <img src="${p.images && p.images[0] ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1543353071-087092ec393a') }" alt="${escapeHtml(p.name)}">
            <div class="card__body">
                <div class="product-title">${escapeHtml(p.name)}</div>
                <div class="product-price">₹${p.base_price ?? p.price ?? 0} / ${p.unit ?? 'kg'}</div>
            </div>
            <div class="card__footer product-footer">
                <button class="btn btn--primary" data-product-id="${p.id}" onclick="addToCartFromButton(event)">Add</button>
                <div class="status">${p.stock ? `In stock ${p.stock}` : ''}</div>
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
            <img src="${p.images && p.images[0] ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1543353071-087092ec393a')}" alt="${escapeHtml(p.name)}">
            <div class="card__body">
                <div class="product-title">${escapeHtml(p.name)}</div>
                <div class="product-desc">${escapeHtml(p.description || '')}</div>
                <div class="product-price">₹${p.base_price ?? p.price ?? 0} / ${p.unit ?? 'kg'}</div>
                <div class="product-actions">
                    <input type="number" min="1" value="1" class="form-control qty-input" data-product-id="${p.id}" style="width:80px;display:inline-block;margin-right:8px;">
                    <button class="btn btn--primary" data-product-id="${p.id}" onclick="addToCartFromCard(event)">Add to cart</button>
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

/* ------------------ Bulk request UI & handlers ------------------ */
function renderBulkPage() {
    const itemsContainer = document.getElementById('bulk-items');
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    addBulkItemRow();
}

function addBulkItemRow(productId = '', qty = 1) {
    const itemsContainer = document.getElementById('bulk-items');
    if (!itemsContainer) return;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';

    const select = document.createElement('select');
    select.className = 'form-control bulk-product-select';
    select.style.flex = '1';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- select product --';
    select.appendChild(defaultOption);
    (currentProducts || SAMPLE_PRODUCTS).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} — ₹${p.base_price ?? p.price ?? 0}/${p.unit ?? 'kg'}`;
        if (p.id === productId) opt.selected = true;
        select.appendChild(opt);
    });

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = qty;
    qtyInput.className = 'form-control bulk-product-qty';
    qtyInput.style.width = '100px';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn--outline';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => row.remove();

    row.appendChild(select);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);
    itemsContainer.appendChild(row);
}

async function handleBulkRequestSubmission(e) {
    e.preventDefault();
    const name = document.getElementById('bulk-name')?.value.trim();
    const phone = document.getElementById('bulk-phone')?.value.trim();
    const email = document.getElementById('bulk-email')?.value.trim();
    const event_type = document.getElementById('bulk-event-type')?.value;
    const event_date = document.getElementById('bulk-event-date')?.value;
    const guest_count = Number(document.getElementById('bulk-guest-count')?.value || 0);
    const notes = document.getElementById('bulk-notes')?.value || '';

    if (!name || !phone) return showError('Please provide name and phone');

    const itemRows = Array.from(document.querySelectorAll('.bulk-product-select'));
    const itemsRequested = [];
    itemRows.forEach((sel, idx) => {
        const prodId = sel.value;
        const qtyEl = document.querySelectorAll('.bulk-product-qty')[idx];
        const estQty = Number(qtyEl?.value || 0);
        if (prodId && estQty > 0) itemsRequested.push({ productId: prodId, estimated_qty: estQty });
    });

    const payload = { contact: { name, phone, email }, event_type, event_date, guest_count, itemsRequested, notes };

    showLoading();
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/bulk-requests`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data || !data.success) throw new Error(data && data.error ? data.error : 'Failed to send request');
        const resultEl = document.getElementById('bulk-result');
        if (resultEl) resultEl.textContent = `Estimated total ₹${data.estimatedTotal} — Request ID: ${data.requestId}`;
        showToast('Bulk request submitted — we will contact you with a quote');
        document.getElementById('bulk-form')?.reset();
        renderBulkPage();
    } catch (err) {
        console.error('Bulk request error', err);
        showError('Failed to submit bulk request');
    } finally {
        hideLoading();
    }
}

/* ------------------ Admin login & dashboard wiring ------------------ */
async function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const user = document.getElementById('admin-username')?.value.trim();
    const pass = document.getElementById('admin-password')?.value.trim();
    const errorEl = document.getElementById('login-error');
    // attempt authentication via backend if available
    try {
        // backend expects full email for admin account
        let loginEmail = user;
        if (user === 'admin') loginEmail = 'admin@sokal.com';
        const result = await loginUser(loginEmail, pass);
        if (result && result.success && result.user && result.user.isAdmin) {
            isAdminLoggedIn = true;
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-dashboard').style.display = 'block';
            await renderAdminDashboard();
            return;
        }
    } catch (err) {
        console.error('Admin login error', err);
    }
    // fallback to hardcoded check
    if (user === 'admin' && pass === 'admin123') {
        isAdminLoggedIn = true;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        renderAdminDashboard();
    } else {
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = 'Invalid credentials'; }
    }
}

async function renderAdminDashboard() {
    try {
        const orders = await loadOrdersFromBackend();
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

        // Stats
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
        const res = await fetch(`${FUNCTIONS_BASE}/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        const data = await res.json();
        if (!data || !data.success) throw new Error('Failed to update order');
        showToast('Order status updated');
        renderAdminDashboard();
    } catch (err) {
        console.error(err);
        showError('Failed to update order status');
    }
}

async function fetchOrderDetails(orderId) {
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/admin/orders/${orderId}`);
        const data = await res.json();
        const o = (data && (data.order || (data.orders && data.orders[0]))) || {};
        const msg = [
            `Order ID: ${orderId}`,
            `Customer: ${o.customerSnapshot?.displayName || o.customerName || 'N/A'}`,
            `Phone: ${o.customerSnapshot?.phone || o.phone || 'N/A'}`,
            `Total: ₹${o.total || 0}`,
            `Status: ${o.status || 'N/A'}`,
            `Payment: ${o.paymentStatus || 'N/A'}`
        ].join('\n');
        showToast(msg, 'info');
    } catch (err) {
        showToast(`Order ID: ${orderId}`, 'info');
    }
}

/* ------------------ Setup form listeners for bulk & admin ------------------ */
document.addEventListener('DOMContentLoaded', () => {
    const addBulkBtn = document.getElementById('add-bulk-item-btn');
    if (addBulkBtn) addBulkBtn.addEventListener('click', () => addBulkItemRow());

    const bulkForm = document.getElementById('bulk-form');
    if (bulkForm) bulkForm.addEventListener('submit', handleBulkRequestSubmission);

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
});

// Cart helpers
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

function getCartTotal() {
    return cart.reduce((s, it) => s + (it.qty * (it.price || 0)), 0);
}

function renderCartPage() {
    const itemsContainer = document.getElementById('cart-items');
    const emptyEl = document.getElementById('empty-cart');
    const summaryEl = document.getElementById('cart-summary');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

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

    const subtotal = getCartTotal();
    subtotalEl.textContent = `₹${subtotal}`;
    totalEl.textContent = `₹${subtotal}`;
}

function saveCartToStorage() {
    try { localStorage.setItem('sokal_cart_v1', JSON.stringify(cart)); } catch (e) { console.error(e); }
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

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(`${pageId}-page`);
    if (el) el.classList.add('active');
    // special handling
    if (pageId === 'cart') renderCartPage();
    if (pageId === 'orders') loadUserOrders();
}

/* ------------------ Authentication helpers ------------------ */
function updateNavForUser() {
    // support two nav styles: simple `<ul id="nav-menu">` vs enhanced with separate auth/user sections
    const authSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    if (authSection && userSection) {
        if (currentUser) {
            authSection.style.display = 'none';
            userSection.style.display = 'block';
            const nameEl = document.getElementById('user-name');
            if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.email;
        } else {
            authSection.style.display = 'block';
            userSection.style.display = 'none';
        }
        return;
    }

    // fallback simple nav modification
    const nav = document.getElementById('nav-menu');
    if (!nav) return;
    const existing = nav.querySelectorAll('.nav-user');
    existing.forEach(e => e.remove());
    if (currentUser) {
        const li = document.createElement('li');
        li.className = 'nav-user';
        li.innerHTML = `<span>Hi, ${escapeHtml(currentUser.displayName || currentUser.email)}</span> <a href="#" id="user-logout">Logout</a>`;
        nav.appendChild(li);
    } else {
        const li = document.createElement('li');
        li.className = 'nav-user';
        li.innerHTML = `<a href="#" onclick="showAuthModal('login');return false;">Login</a>`;
        nav.appendChild(li);
    }
}

function showAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.style.display = 'block';
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    if (mode === 'login') {
        title.textContent = 'Login';
        submitBtn.textContent = 'Login';
        toggleText.innerHTML = `Don't have an account? <a href="#" id="auth-toggle-link">Sign up</a>`;
    } else {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        toggleText.innerHTML = `Already have an account? <a href="#" id="auth-toggle-link">Login</a>`;
    }
    modal.setAttribute('data-mode', mode);
    // clear fields
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
}

// fetch and render current user's orders
async function loadUserOrders() {
    if (!currentUser) {
        showError('Please login to view your orders');
        showAuthModal('login');
        return;
    }
    try {
        const res = await fetch(`${FUNCTIONS_BASE}/orders/${currentUser.uid}`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.orders)) {
            renderUserOrders(data.orders);
        } else {
            throw new Error(data.error || 'Failed to load orders');
        }
    } catch (err) {
        console.error('loadUserOrders error', err);
        showError('Could not load orders');
    }
}

function renderUserOrders(orders) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p>No orders found.</p>';
        return;
    }
    container.innerHTML = orders.map(o => `
        <div class="card" style="margin-bottom:12px;padding:12px;">
            <div><strong>Order #${escapeHtml(o.id || o.orderId || '')}</strong> - ₹${o.total || o.amount || 0}</div>
            <div>Status: ${escapeHtml(o.status || '')}</div>
            <div>Items: ${(o.items||[]).map(i=>escapeHtml(i.name||i.productName||i.productId)).join(', ')}</div>
            <div>${o.createdAt ? new Date(o.createdAt.seconds ? o.createdAt.seconds*1000 : o.createdAt).toLocaleString() : ''}</div>
        </div>
    `).join('');
}

function toggleAuthMode() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    const current = modal.getAttribute('data-mode') || 'login';
    showAuthModal(current === 'login' ? 'signup' : 'login');
}

async function handleAuthForm(e) {
    e.preventDefault();
    const mode = document.getElementById('auth-modal').getAttribute('data-mode');
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    if (!email || !password) return showError('Provide email and password');
    try {
        let result;
        if (mode === 'login') {
            result = await loginUser(email, password);
        } else {
            result = await signupUser(email, password);
        }
        if (result && result.success) {
            currentUser = result.user;
            saveUserToStorage();
            updateNavForUser();
            closeModal('auth-modal');
            showToast(mode === 'login' ? 'Logged in' : 'Signup successful');
        } else {
            showError(result.error || 'Auth failed');
        }
    } catch (err) {
        console.error('Auth error', err);
        showError('Authentication failed');
    }
}

async function loginUser(email, password) {
    const res = await fetch(`${FUNCTIONS_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
}

async function signupUser(email, password) {
    const res = await fetch(`${FUNCTIONS_BASE}/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
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
    showToast(msg, 'error');
}

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        const removeEl = () => { if (toast.parentNode) toast.remove(); };
        toast.addEventListener('transitionend', removeEl, { once: true });
        // Fallback in case transitionend doesn't fire
        setTimeout(removeEl, 400);
    }, 4000);
}

function createToastContainer() {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
    return el;
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Additional missing handlers and functions

// Handle logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            isAdminLoggedIn = false;
            document.getElementById('admin-login').style.display = 'block';
            document.getElementById('admin-dashboard').style.display = 'none';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
            document.getElementById('login-error').style.display = 'none';
            showToast('Logged out successfully');
        });
    }

    // Prevent modal background click issues
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
});

// Expose some functions for inline HTML handlers
window.addToCartFromCard = addToCartFromCard;
window.addToCartFromButton = addToCartFromButton;
window.changeCartQty = changeCartQty;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.closeModal = closeModal;
window.showModal = showModal;
window.updateOrderStatus = updateOrderStatus;
window.fetchOrderDetails = fetchOrderDetails;

// Note: initial rendering happens in `initializeApp()` which is called on DOMContentLoaded at top of file.

