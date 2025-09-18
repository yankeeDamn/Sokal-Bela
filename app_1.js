// Sample Data - This will be replaced with Firebase data
const sampleData = {
  "vegetables": [
    {
      "id": "1",
      "name": "Fresh Potatoes",
      "price": 25,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Root Vegetables",
      "description": "Fresh local potatoes, perfect for cooking",
      "inStock": true,
      "quantity": 50
    },
    {
      "id": "2", 
      "name": "Red Onions",
      "price": 30,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Root Vegetables", 
      "description": "Premium quality red onions",
      "inStock": true,
      "quantity": 40
    },
    {
      "id": "3",
      "name": "Fresh Tomatoes", 
      "price": 40,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1546470427-e8357e28870d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Fruits",
      "description": "Ripe red tomatoes, locally grown",
      "inStock": true,
      "quantity": 30
    },
    {
      "id": "4",
      "name": "Cauliflower",
      "price": 35,
      "unit": "piece", 
      "image": "https://images.unsplash.com/photo-1568584989129-4926e2c8b0e6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Cruciferous",
      "description": "Fresh white cauliflower heads",
      "inStock": true,
      "quantity": 25
    },
    {
      "id": "5",
      "name": "Green Cabbage",
      "price": 20,
      "unit": "piece",
      "image": "https://images.unsplash.com/photo-1594282503929-505300d690e9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80", 
      "category": "Leafy Greens",
      "description": "Crisp green cabbage heads",
      "inStock": true,
      "quantity": 20
    },
    {
      "id": "6",
      "name": "Fresh Spinach",
      "price": 15,
      "unit": "bunch",
      "image": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Leafy Greens", 
      "description": "Nutrient-rich fresh spinach",
      "inStock": true,
      "quantity": 35
    },
    {
      "id": "7",
      "name": "Carrots",
      "price": 45,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Root Vegetables",
      "description": "Sweet orange carrots", 
      "inStock": true,
      "quantity": 28
    },
    {
      "id": "8",
      "name": "Green Beans",
      "price": 50,
      "unit": "kg", 
      "image": "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Legumes",
      "description": "Tender green beans",
      "inStock": true,
      "quantity": 22
    },
    {
      "id": "9",
      "name": "Bell Peppers",
      "price": 80,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80", 
      "category": "Peppers",
      "description": "Colorful bell peppers mix",
      "inStock": true,
      "quantity": 18
    },
    {
      "id": "10",
      "name": "Brinjal (Eggplant)", 
      "price": 35,
      "unit": "kg",
      "image": "https://images.unsplash.com/photo-1515023115689-589c33041d3c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=200&q=80",
      "category": "Nightshades",
      "description": "Fresh purple brinjal",
      "inStock": true,
      "quantity": 24
    }
  ],
  "categories": [
    "All",
    "Root Vegetables", 
    "Leafy Greens",
    "Fruits", 
    "Cruciferous",
    "Legumes",
    "Peppers",
    "Nightshades"
  ],
  "orders": [
    {
      "id": "ORD001",
      "customerName": "Rahul Das",
      "phone": "9876543210", 
      "address": "123 Park Street, Kolkata",
      "items": [
        {"id": "1", "name": "Fresh Potatoes", "quantity": 2, "price": 25},
        {"id": "3", "name": "Fresh Tomatoes", "quantity": 1, "price": 40}
      ],
      "total": 90,
      "status": "Pending",
      "date": "2025-09-14"
    }
  ],
  "settings": {
    "storeName": "Fresh Veggies Bengal",
    "contact": {
      "phone": "+91 98765 43210",
      "email": "freshveggies@example.com", 
      "address": "Main Market, Salt Lake, Kolkata - 700064",
      "hours": "Monday-Sunday: 7:00 AM - 9:00 PM"
    },
    "deliveryInfo": "Free delivery within 5km radius. Minimum order ₹200.",
    "adminCredentials": {
      "username": "admin",
      "password": "admin123"
    }
  }
};

// Application State
let currentProducts = sampleData.vegetables;
let currentCategory = 'All';
let searchQuery = '';
let cart = [];
let orders = [...sampleData.orders];
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

// Firebase Integration Points - Replace these functions with Firebase calls
async function loadProductsFromFirebase() {
    // TODO: Replace with Firebase Firestore call
    // const snapshot = await firebase.firestore().collection('products').get();
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return sampleData.vegetables;
}

async function saveOrderToFirebase(order) {
    // TODO: Replace with Firebase Firestore call
    // await firebase.firestore().collection('orders').add(order);
    console.log('Order saved locally:', order);
    orders.push(order);
}

async function loadOrdersFromFirebase() {
    // TODO: Replace with Firebase Firestore call
    // const snapshot = await firebase.firestore().collection('orders').get();
    // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders;
}

// Application Initialization
async function initializeApp() {
    showLoading();
    try {
        // Load products from Firebase (currently using sample data)
        currentProducts = await loadProductsFromFirebase();
        
        renderFeaturedProducts();
        renderAllProducts();
        renderCategoryFilters();
        
        // Load orders if admin is logged in
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

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }
    
    // Navigation links - Fixed event handling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                showPage(page);
                // Close mobile menu after navigation
                if (navMenu) {
                    navMenu.classList.remove('show');
                }
            }
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Admin login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Checkout form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleOrderSubmission);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleAdminLogout);
    }
}

// Page Navigation - Fixed implementation
function showPage(pageName) {
    console.log('Navigating to page:', pageName); // Debug log
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('Page shown successfully:', pageName); // Debug log
    } else {
        console.error('Page not found:', `${pageName}-page`);
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Update page-specific content
    switch(pageName) {
        case 'products':
            renderAllProducts();
            renderCategoryFilters();
            break;
        case 'cart':
            renderCartPage();
            break;
        case 'admin':
            renderAdminPage();
            break;
        case 'home':
            renderFeaturedProducts();
            break;
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    if (navMenu) {
        navMenu.classList.toggle('show');
    }
}

// Get fallback image with proper vegetable-themed placeholder
function getVegetableImage(product) {
    const fallbackImage = `https://via.placeholder.com/300x200/22C55E/ffffff?text=${encodeURIComponent(product.name)}`;
    return product.image || fallbackImage;
}

// Featured Products Rendering
function renderFeaturedProducts() {
    const featuredGrid = document.getElementById('featured-grid');
    if (!featuredGrid) return;
    
    // Get first 6 products as featured
    const featuredProducts = currentProducts.slice(0, 6);
    
    featuredGrid.innerHTML = featuredProducts.map(product => `
        <div class="product-card">
            <img src="${getVegetableImage(product)}" alt="${product.name}" class="product-image" loading="lazy" 
                 onerror="this.src='https://via.placeholder.com/300x200/22C55E/ffffff?text=${encodeURIComponent(product.name)}'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">₹${product.price}/${product.unit}</div>
                <div class="product-actions">
                    <button class="btn btn--primary" onclick="addToCart('${product.id}')">
                        Add to Cart
                    </button>
                    <button class="btn btn--outline" onclick="showPage('products')">
                        View All
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// All Products Rendering
function renderAllProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    let filteredProducts = currentProducts;
    
    // Apply category filter
    if (currentCategory !== 'All') {
        filteredProducts = filteredProducts.filter(product => 
            product.category === currentCategory
        );
    }
    
    // Apply search filter
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="text-center" style="grid-column: 1 / -1; padding: var(--space-32);">
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria.</p>
                <button class="btn btn--primary" onclick="clearFilters()">Show All Products</button>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <img src="${getVegetableImage(product)}" alt="${product.name}" class="product-image" loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x200/22C55E/ffffff?text=${encodeURIComponent(product.name)}'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">₹${product.price}/${product.unit}</div>
                <div class="status status--${product.inStock ? 'success' : 'error'}">
                    ${product.inStock ? `In Stock (${product.quantity})` : 'Out of Stock'}
                </div>
                <div class="product-actions">
                    <button class="btn btn--primary" 
                            onclick="addToCart('${product.id}')"
                            ${!product.inStock ? 'disabled' : ''}>
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Category Filters Rendering
function renderCategoryFilters() {
    const filtersContainer = document.getElementById('category-filters');
    if (!filtersContainer) return;
    
    filtersContainer.innerHTML = sampleData.categories.map(category => `
        <button class="filter-btn ${category === currentCategory ? 'active' : ''}" 
                onclick="filterByCategory('${category}')">
            ${category}
        </button>
    `).join('');
}

// Search Handler
function handleSearch(e) {
    searchQuery = e.target.value.trim();
    renderAllProducts();
}

// Category Filter Handler
function filterByCategory(category) {
    currentCategory = category;
    renderCategoryFilters();
    renderAllProducts();
}

// Clear all filters
function clearFilters() {
    currentCategory = 'All';
    searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    renderCategoryFilters();
    renderAllProducts();
}

// Shopping Cart Functions
function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product || !product.inStock) {
        showError('Product not available');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            image: getVegetableImage(product),
            quantity: 1
        });
    }
    
    saveCartToStorage();
    updateCartCount();
    showSuccess(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCount();
    renderCartPage();
    showSuccess('Item removed from cart');
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = Math.max(1, parseInt(quantity));
            saveCartToStorage();
            updateCartCount();
            renderCartPage();
        }
    }
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartCount() {
    if (cartCountElement) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem('vegetable-cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart to storage:', error);
    }
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('vegetable-cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (error) {
        console.error('Error loading cart from storage:', error);
        cart = [];
    }
}

// Cart Page Rendering
function renderCartPage() {
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartSummary = document.getElementById('cart-summary');
    
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        if (cartItemsContainer) cartItemsContainer.innerHTML = '';
        return;
    }
    
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    // Render cart items
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/80x80/22C55E/ffffff?text=${encodeURIComponent(item.name)}'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price}/${item.unit}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" 
                               onchange="updateCartQuantity('${item.id}', parseInt(this.value || 1))" min="1">
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
            </div>
        `).join('');
    }
    
    // Update totals
    const total = getCartTotal();
    const subtotalElement = document.getElementById('cart-subtotal');
    const totalElement = document.getElementById('cart-total');
    
    if (subtotalElement) subtotalElement.textContent = `₹${total}`;
    if (totalElement) totalElement.textContent = `₹${total}`;
}

// Order Submission
async function handleOrderSubmission(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customer-name')?.value.trim();
    const customerPhone = document.getElementById('customer-phone')?.value.trim();
    const customerAddress = document.getElementById('customer-address')?.value.trim();
    
    // Validation
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
        // Create order object
        const order = {
            id: 'ORD' + Date.now(),
            customerName,
            phone: customerPhone,
            address: customerAddress,
            items: [...cart],
            total,
            status: 'Pending',
            date: new Date().toISOString().split('T')[0]
        };
        
        // Save order to Firebase (currently local)
        await saveOrderToFirebase(order);
        
        // Clear cart
        cart = [];
        saveCartToStorage();
        updateCartCount();
        
        // Reset form
        const form = document.getElementById('checkout-form');
        if (form) form.reset();
        
        // Update cart page
        renderCartPage();
        
        // Show success modal
        showModal('success-modal');
        
    } catch (error) {
        console.error('Error placing order:', error);
        showError('Failed to place order. Please try again.');
    } finally {
        hideLoading();
    }
}

// Admin Authentication
function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('admin-username')?.value.trim();
    const password = document.getElementById('admin-password')?.value.trim();
    
    if (username === sampleData.settings.adminCredentials.username && 
        password === sampleData.settings.adminCredentials.password) {
        isAdminLoggedIn = true;
        showAdminDashboard();
        const errorElement = document.getElementById('login-error');
        if (errorElement) errorElement.style.display = 'none';
    } else {
        const errorElement = document.getElementById('login-error');
        if (errorElement) errorElement.style.display = 'block';
    }
}

function handleAdminLogout() {
    isAdminLoggedIn = false;
    const loginSection = document.getElementById('admin-login');
    const dashboardSection = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    const errorElement = document.getElementById('login-error');
    
    if (loginSection) loginSection.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (loginForm) loginForm.reset();
    if (errorElement) errorElement.style.display = 'none';
}

function renderAdminPage() {
    if (isAdminLoggedIn) {
        showAdminDashboard();
    } else {
        const loginSection = document.getElementById('admin-login');
        const dashboardSection = document.getElementById('admin-dashboard');
        
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';
    }
}

async function showAdminDashboard() {
    const loginSection = document.getElementById('admin-login');
    const dashboardSection = document.getElementById('admin-dashboard');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    
    await loadAdminDashboard();
}

async function loadAdminDashboard() {
    try {
        // Load orders from Firebase (currently local)
        const allOrders = await loadOrdersFromFirebase();
        
        // Update statistics
        const totalOrdersElement = document.getElementById('total-orders');
        const totalRevenueElement = document.getElementById('total-revenue');
        const totalProductsElement = document.getElementById('total-products');
        
        if (totalOrdersElement) totalOrdersElement.textContent = allOrders.length;
        if (totalRevenueElement) {
            const revenue = allOrders.reduce((sum, order) => sum + order.total, 0);
            totalRevenueElement.textContent = `₹${revenue}`;
        }
        if (totalProductsElement) totalProductsElement.textContent = currentProducts.length;
        
        // Render orders table
        renderOrdersTable(allOrders);
        
        // Render inventory
        renderInventory();
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

function renderOrdersTable(orders) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No orders found</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customerName}</td>
            <td>${order.phone}</td>
            <td>${order.items.length} items</td>
            <td>₹${order.total}</td>
            <td>
                <select class="form-control" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${order.date}</td>
            <td>
                <button class="btn btn--sm btn--outline" onclick="viewOrderDetails('${order.id}')">
                    View
                </button>
            </td>
        </tr>
    `).join('');
}

function renderInventory() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;
    
    inventoryGrid.innerHTML = currentProducts.map(product => `
        <div class="inventory-item">
            <div class="inventory-item-header">
                <div>
                    <div class="inventory-item-name">${product.name}</div>
                    <div class="inventory-item-stock">Stock: ${product.quantity} ${product.unit}</div>
                </div>
                <div class="status status--${product.inStock ? 'success' : 'error'}">
                    ${product.inStock ? 'In Stock' : 'Out of Stock'}
                </div>
            </div>
            <div class="product-price">₹${product.price}/${product.unit}</div>
            <div class="inventory-actions">
                <button class="btn btn--sm btn--outline" onclick="editProduct('${product.id}')">
                    Edit
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteProduct('${product.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Admin Functions (Placeholder implementations)
function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        // TODO: Update in Firebase
        console.log(`Order ${orderId} status updated to ${newStatus}`);
        showSuccess(`Order status updated to ${newStatus}`);
    }
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        const itemsList = order.items.map(item => `${item.name} x${item.quantity} = ₹${item.price * item.quantity}`).join('\n');
        alert(`Order Details:\n\nOrder ID: ${order.id}\nCustomer: ${order.customerName}\nPhone: ${order.phone}\nAddress: ${order.address}\n\nItems:\n${itemsList}\n\nTotal: ₹${order.total}\nStatus: ${order.status}\nDate: ${order.date}`);
    }
}

function editProduct(productId) {
    // TODO: Implement product editing modal
    console.log('Edit product:', productId);
    showError('Product editing feature coming soon!');
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        // TODO: Delete from Firebase
        console.log('Delete product:', productId);
        showError('Product deletion feature coming soon!');
    }
}

// Utility Functions
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

function showSuccess(message) {
    // Create and show success toast
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--color-success);
        color: var(--color-btn-primary-text);
        padding: 12px 24px;
        border-radius: var(--radius-base);
        z-index: 9999;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: var(--shadow-lg);
        font-weight: var(--font-weight-medium);
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function showError(message) {
    // Create and show error toast
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--color-error);
        color: var(--color-btn-primary-text);
        padding: 12px 24px;
        border-radius: var(--radius-base);
        z-index: 9999;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: var(--shadow-lg);
        font-weight: var(--font-weight-medium);
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Global functions for onclick handlers
window.showPage = showPage;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.filterByCategory = filterByCategory;
window.clearFilters = clearFilters;
window.updateOrderStatus = updateOrderStatus;
window.viewOrderDetails = viewOrderDetails;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeModal = closeModal;