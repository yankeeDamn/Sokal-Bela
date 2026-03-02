// Backend functions base (set in index.html for emulator or cloud)
const FUNCTIONS_BASE = window.FUNCTIONS_BASE || 'http://localhost:5001/sokal-bela-store/us-central1/api';

// Initialize Firestore (Firebase SDK must be loaded in index.html first)
const db = window.firebase ? firebase.firestore() : null;

// Application State
let currentProducts = [];
let currentCategory = 'All';
let searchQuery = '';
let cart = [];
let orders = [];
let isAdminLoggedIn = false;

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
        // Build payload that backend expects
        const payload = {
            customerSnapshot: { displayName: customerName, phone: customerPhone, address: customerAddress },
            items: cart.map(i => ({ productId: i.id || i.productId, qty: i.qty || i.quantity || 1 })),
            delivery_fee: 0,
            tax: 0,
            notes: ''
        };

        const result = await saveOrderToBackend(payload);

        // If user chose mock payment, mark order as Paid and send a notification (emulator/demo)
        const payNow = document.getElementById('pay-now-mock')?.checked;
        if (payNow && result && result.orderId) {
            try {
                await fetch(`${FUNCTIONS_BASE}/admin/orders/${result.orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentStatus: 'Paid', paymentMethod: 'mock' }) });
                await fetch(`${FUNCTIONS_BASE}/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Order Paid', body: `Order ${result.orderId} paid (mock)`, orderId: result.orderId }) });
            } catch (err) {
                console.error('Mock payment/notify failed', err);
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
function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const user = document.getElementById('admin-username')?.value.trim();
    const pass = document.getElementById('admin-password')?.value.trim();
    const errorEl = document.getElementById('login-error');
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
    // simple modal or console output for now
    alert('Open order details in admin UI (id: ' + orderId + ')');
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
    // simple toast using alert for now - can be enhanced
    console.log('TOAST', type, msg);
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Expose some functions for inline HTML handlers
window.addToCartFromCard = addToCartFromCard;
window.addToCartFromButton = addToCartFromButton;
window.changeCartQty = changeCartQty;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.closeModal = closeModal;

// Note: initial rendering happens in `initializeApp()` which is called on DOMContentLoaded at top of file.

