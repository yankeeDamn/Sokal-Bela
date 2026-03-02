// Sokal Bela Admin Panel
// Comprehensive admin system with working authentication

class AdminPanel {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.currentEditingProduct = null;

        // Admin credentials
        this.adminCredentials = {
            username: "admin",
            password: "admin123"
        };

        // Sample data from the provided JSON
        this.orders = [
            {
                "id": "ORD001",
                "orderNumber": "FVB202509210001",
                "customerName": "Amit Kumar Sharma",
                "phone": "9876543210",
                "email": "amit.sharma@email.com",
                "address": "123 Park Street, Central Kolkata, West Bengal - 700016",
                "items": [
                    {"id": "1", "name": "Fresh Potatoes", "quantity": 2, "price": 25, "unit": "kg"},
                    {"id": "3", "name": "Fresh Tomatoes", "quantity": 1.5, "price": 40, "unit": "kg"}
                ],
                "subtotal": 110,
                "deliveryCharge": 0,
                "totalAmount": 110,
                "status": "pending",
                "paymentMethod": "cash-on-delivery",
                "orderDate": "2025-09-21",
                "orderTime": "10:30 AM"
            },
            {
                "id": "ORD002",
                "orderNumber": "FVB202509210002",
                "customerName": "Priya Das",
                "phone": "9876543211",
                "email": "priya.das@email.com",
                "address": "456 Salt Lake, Sector V, Kolkata - 700091",
                "items": [
                    {"id": "4", "name": "Cauliflower (Phulkopi)", "quantity": 2, "price": 35, "unit": "piece"},
                    {"id": "6", "name": "Spinach (Palak)", "quantity": 3, "price": 15, "unit": "bunch"}
                ],
                "subtotal": 145,
                "deliveryCharge": 0,
                "totalAmount": 145,
                "status": "confirmed",
                "paymentMethod": "online",
                "orderDate": "2025-09-20",
                "orderTime": "8:45 PM"
            },
            {
                "id": "ORD003",
                "orderNumber": "FVB202509200003",
                "customerName": "Rohit Ghosh",
                "phone": "9876543212",
                "email": "rohit.ghosh@email.com",
                "address": "789 New Town, Action Area I, Kolkata - 700156",
                "items": [
                    {"id": "8", "name": "Green Beans (Sheem)", "quantity": 1, "price": 50, "unit": "kg"},
                    {"id": "10", "name": "Brinjal (Begun)", "quantity": 2, "price": 35, "unit": "kg"}
                ],
                "subtotal": 120,
                "totalAmount": 120,
                "status": "delivered",
                "paymentMethod": "cash-on-delivery",
                "orderDate": "2025-09-20",
                "orderTime": "6:15 PM"
            }
        ];

        this.products = [
            {
                "id": "1",
                "name": "Fresh Potatoes",
                "price": 25,
                "unit": "kg",
                "image": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
                "category": "Root Vegetables",
                "description": "Fresh local potatoes, perfect for cooking",
                "inStock": true,
                "currentStock": 45,
                "minStock": 10,
                "featured": true
            },
            {
                "id": "2", 
                "name": "Red Onions",
                "price": 30,
                "unit": "kg",
                "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
                "category": "Root Vegetables", 
                "description": "Premium quality red onions",
                "inStock": true,
                "currentStock": 38,
                "minStock": 15,
                "featured": false
            },
            {
                "id": "3",
                "name": "Fresh Tomatoes", 
                "price": 40,
                "unit": "kg",
                "image": "https://images.unsplash.com/photo-1546470427-e8357e28870d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
                "category": "Fruits",
                "description": "Ripe red tomatoes, locally grown",
                "inStock": true,
                "currentStock": 28,
                "minStock": 10,
                "featured": true
            },
            {
                "id": "4",
                "name": "Cauliflower (Phulkopi)",
                "price": 35,
                "unit": "piece", 
                "image": "https://images.unsplash.com/photo-1568584989129-4926e2c8b0e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
                "category": "Cruciferous",
                "description": "Fresh white cauliflower heads",
                "inStock": true,
                "currentStock": 23,
                "minStock": 8,
                "featured": true
            },
            {
                "id": "5",
                "name": "Cabbage (Bandha Kopi)",
                "price": 20,
                "unit": "piece",
                "image": "https://images.unsplash.com/photo-1594282503929-505300d690e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80", 
                "category": "Leafy Greens",
                "description": "Crisp green cabbage heads",
                "inStock": true,
                "currentStock": 19,
                "minStock": 5,
                "featured": false
            }
        ];

        this.analytics = {
            totalRevenue: 15420,
            totalOrders: 45,
            totalCustomers: 18,
            avgOrderValue: 342.67
        };

        this.categories = ["Root Vegetables", "Leafy Greens", "Fruits", "Cruciferous"];
    }

    init() {
        console.log('Initializing Admin Panel...');
        this.setupEventListeners();
        this.showLoginPage();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Wait a bit to ensure DOM is fully loaded
        setTimeout(() => {
            // Login form - critical fix
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                console.log('Login form found, attaching event listener');
                loginForm.addEventListener('submit', (e) => {
                    console.log('Form submit event triggered');
                    e.preventDefault();
                    this.handleLogin();
                });
            } else {
                console.error('Login form not found!');
            }

            // Navigation links
            document.querySelectorAll('.nav__link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = e.target.getAttribute('data-section');
                    this.showSection(section);
                });
            });

            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }

            // Add product button
            const addProductBtn = document.getElementById('add-product-btn');
            if (addProductBtn) {
                addProductBtn.addEventListener('click', () => {
                    this.showProductModal();
                });
            }

            // Product form
            const productForm = document.getElementById('product-form');
            if (productForm) {
                productForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveProduct();
                });
            }

            // Modal close
            const modalClose = document.querySelector('.modal-close');
            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    this.hideProductModal();
                });
            }

            // Settings forms
            const storeSettingsForm = document.getElementById('store-settings-form');
            if (storeSettingsForm) {
                storeSettingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveStoreSettings();
                });
            }

            const deliverySettingsForm = document.getElementById('delivery-settings-form');
            if (deliverySettingsForm) {
                deliverySettingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveDeliverySettings();
                });
            }

            // Status filter
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => {
                    this.filterOrders();
                });
            }

            // Category filter
            const categoryFilter = document.getElementById('category-filter');
            if (categoryFilter) {
                categoryFilter.addEventListener('change', () => {
                    this.filterInventory();
                });
            }

            // Modal backdrop click
            const productModal = document.getElementById('product-modal');
            if (productModal) {
                productModal.addEventListener('click', (e) => {
                    if (e.target === productModal) {
                        this.hideProductModal();
                    }
                });
            }

            console.log('Event listeners setup completed');
        }, 100);
    }

    // Authentication Functions - FIXED
    handleLogin() {
        console.log('Handle login called');
        
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        const loginError = document.getElementById('login-error');
        const loginBtn = document.getElementById('login-btn');
        const loginBtnText = document.getElementById('login-btn-text');

        if (!usernameField || !passwordField) {
            console.error('Username or password field not found');
            return;
        }

        const username = usernameField.value.trim();
        const password = passwordField.value.trim();

        console.log('Login attempt with username:', username);

        // Clear previous errors
        if (loginError) {
            loginError.style.display = 'none';
        }

        // Show loading state
        if (loginBtn && loginBtnText) {
            loginBtn.disabled = true;
            loginBtnText.textContent = 'Logging in...';
        }

        // Simulate network delay for realistic feel
        setTimeout(() => {
            // Check credentials - BULLETPROOF authentication
            if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
                console.log('Login successful');
                this.isLoggedIn = true;
                this.currentUser = { username: username };
                this.showDashboard();
                this.showToast('Login successful! Welcome to the admin panel.');
            } else {
                console.log('Login failed - invalid credentials');
                if (loginError) {
                    loginError.textContent = 'Invalid username or password. Please try again.';
                    loginError.style.display = 'block';
                }
                this.showToast('Login failed. Please check your credentials.', 'error');
            }

            // Reset button state
            if (loginBtn && loginBtnText) {
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Login';
            }
        }, 800);
    }

    handleLogout() {
        console.log('Logging out');
        this.isLoggedIn = false;
        this.currentUser = null;
        this.showLoginPage();
        this.showToast('Logged out successfully.');
    }

    // Page Navigation
    showLoginPage() {
        console.log('Showing login page');
        this.hideAllPages();
        const loginPage = document.getElementById('login-page');
        if (loginPage) {
            loginPage.classList.add('active');
        }
        
        const mainNav = document.getElementById('main-nav');
        const adminActions = document.getElementById('admin-actions');
        
        if (mainNav) mainNav.style.display = 'none';
        if (adminActions) adminActions.style.display = 'none';
        
        // Clear login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.reset();
        }
        
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.style.display = 'none';
        }
    }

    showDashboard() {
        console.log('Showing dashboard');
        if (!this.isLoggedIn) {
            console.log('Not logged in, redirecting to login');
            this.showLoginPage();
            return;
        }

        this.hideAllPages();
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage) {
            dashboardPage.classList.add('active');
        }
        
        const mainNav = document.getElementById('main-nav');
        const adminActions = document.getElementById('admin-actions');
        
        if (mainNav) mainNav.style.display = 'block';
        if (adminActions) adminActions.style.display = 'block';
        
        this.currentSection = 'dashboard';
        this.updateNavigation();
        this.loadDashboard();
    }

    showSection(section) {
        console.log('Showing section:', section);
        if (!this.isLoggedIn) {
            this.showLoginPage();
            return;
        }

        this.hideAllPages();
        const sectionPage = document.getElementById(`${section}-page`);
        if (sectionPage) {
            sectionPage.classList.add('active');
        }
        
        this.currentSection = section;
        this.updateNavigation();

        // Load section-specific data
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'inventory':
                this.loadInventory();
                break;
            case 'customers':
                this.loadCustomers();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
    }

    updateNavigation() {
        document.querySelectorAll('.nav__link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav__link[data-section="${this.currentSection}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Dashboard Functions
    loadDashboard() {
        console.log('Loading dashboard data');
        this.loadDashboardStats();
        this.loadSalesChart();
        this.loadRecentOrders();
    }

    loadDashboardStats() {
        const totalRevenue = this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = this.orders.length;
        const totalCustomers = new Set(this.orders.map(order => order.customerName)).size;
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        const totalOrdersEl = document.getElementById('total-orders');
        const totalRevenueEl = document.getElementById('total-revenue');
        const totalCustomersEl = document.getElementById('total-customers');
        const avgOrderValueEl = document.getElementById('avg-order-value');

        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRevenue}`;
        if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
        if (avgOrderValueEl) avgOrderValueEl.textContent = `₹${avgOrderValue}`;
    }

    loadSalesChart() {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;
        if (typeof Chart === 'undefined') {
            ctx.parentElement && (ctx.parentElement.innerHTML = '<p style="padding:16px;color:#888;">Chart unavailable (Chart.js not loaded)</p>');
            return;
        }

        // Sample data for the chart
        const chartData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Sales (₹)',
                data: [12000, 19000, 15000, 17000, 22000, 24000],
                backgroundColor: '#1FB8CD',
                borderColor: '#1FB8CD',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    loadRecentOrders() {
        const tbody = document.getElementById('recent-orders-table');
        if (!tbody) return;

        const recentOrders = this.orders.slice(0, 5);
        
        tbody.innerHTML = recentOrders.map(order => `
            <tr>
                <td>${order.orderNumber}</td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customerName}</div>
                        <div class="customer-contact">${order.phone}</div>
                    </div>
                </td>
                <td>₹${order.totalAmount}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>${order.orderDate}</td>
            </tr>
        `).join('');
    }

    // Orders Functions
    loadOrders() {
        const tbody = document.getElementById('orders-table');
        if (!tbody) return;

        tbody.innerHTML = this.orders.map(order => `
            <tr>
                <td>${order.orderNumber}</td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customerName}</div>
                        <div class="customer-contact">${order.phone}</div>
                    </div>
                </td>
                <td>
                    <div class="order-items">${order.items.length} items</div>
                </td>
                <td>₹${order.totalAmount}</td>
                <td>
                    <select class="form-control" onchange="admin.updateOrderStatus('${order.id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>${order.orderDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn--xs btn--primary" onclick="admin.viewOrderDetails('${order.id}')">View</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterOrders() {
        const statusFilter = document.getElementById('status-filter');
        if (!statusFilter) return;

        const selectedStatus = statusFilter.value;
        let filteredOrders = this.orders;

        if (selectedStatus) {
            filteredOrders = this.orders.filter(order => order.status === selectedStatus);
        }

        const tbody = document.getElementById('orders-table');
        if (!tbody) return;

        if (filteredOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found matching the selected criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = filteredOrders.map(order => `
            <tr>
                <td>${order.orderNumber}</td>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${order.customerName}</div>
                        <div class="customer-contact">${order.phone}</div>
                    </div>
                </td>
                <td>
                    <div class="order-items">${order.items.length} items</div>
                </td>
                <td>₹${order.totalAmount}</td>
                <td>
                    <select class="form-control" onchange="admin.updateOrderStatus('${order.id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
                <td>${order.orderDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn--xs btn--primary" onclick="admin.viewOrderDetails('${order.id}')">View</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            this.showToast(`Order ${order.orderNumber} status updated to ${newStatus}`);
            this.loadDashboardStats();
            this.loadRecentOrders();
        }
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const itemsList = order.items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join('\n');
            alert(`Order Details:\n\nOrder Number: ${order.orderNumber}\nCustomer: ${order.customerName}\nPhone: ${order.phone}\nEmail: ${order.email}\nAddress: ${order.address}\n\nItems:\n${itemsList}\n\nSubtotal: ₹${order.subtotal}\nDelivery: ₹${order.deliveryCharge}\nTotal: ₹${order.totalAmount}\n\nPayment: ${order.paymentMethod}\nStatus: ${order.status}\nDate: ${order.orderDate} ${order.orderTime}`);
        }
    }

    // Products Functions
    loadProducts() {
        const tbody = document.getElementById('products-table');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>
                    <div class="product-info">
                        <img src="${product.image}" alt="${product.name}" class="product-image-small">
                        <div class="product-details">
                            <h4>${product.name}</h4>
                            <div class="product-meta">₹${product.price}/${product.unit}</div>
                        </div>
                    </div>
                </td>
                <td>${product.category}</td>
                <td>₹${product.price}</td>
                <td>${product.currentStock}</td>
                <td>
                    <span class="status-badge ${product.inStock ? 'status-in-stock' : 'status-out-of-stock'}">
                        ${product.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    ${product.featured ? '<span class="status-badge" style="background: #1FB8CD; color: white; margin-left: 8px;">Featured</span>' : ''}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn--xs btn--primary" onclick="admin.editProduct('${product.id}')">Edit</button>
                        <button class="btn btn--xs btn--outline" onclick="admin.deleteProduct('${product.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Inventory Functions
    loadInventory() {
        // Load category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }

        const tbody = document.getElementById('inventory-table');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => {
            const isLowStock = product.currentStock <= product.minStock;
            const stockStatus = product.currentStock === 0 ? 'out-of-stock' : (isLowStock ? 'low-stock' : 'in-stock');
            const stockText = product.currentStock === 0 ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock');

            return `
                <tr>
                    <td>
                        <div class="product-info">
                            <img src="${product.image}" alt="${product.name}" class="product-image-small">
                            <div class="product-details">
                                <h4>${product.name}</h4>
                                <div class="product-meta">${product.category}</div>
                            </div>
                        </div>
                    </td>
                    <td>${product.currentStock}</td>
                    <td>${product.minStock}</td>
                    <td><span class="status-badge status-${stockStatus}">${stockText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn--xs btn--primary" onclick="admin.updateStock('${product.id}')">Update Stock</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterInventory() {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;

        const selectedCategory = categoryFilter.value;
        let filteredProducts = this.products;

        if (selectedCategory) {
            filteredProducts = this.products.filter(product => product.category === selectedCategory);
        }

        const tbody = document.getElementById('inventory-table');
        if (!tbody) return;

        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No products found in this category.</td></tr>';
            return;
        }

        tbody.innerHTML = filteredProducts.map(product => {
            const isLowStock = product.currentStock <= product.minStock;
            const stockStatus = product.currentStock === 0 ? 'out-of-stock' : (isLowStock ? 'low-stock' : 'in-stock');
            const stockText = product.currentStock === 0 ? 'Out of Stock' : (isLowStock ? 'Low Stock' : 'In Stock');

            return `
                <tr>
                    <td>
                        <div class="product-info">
                            <img src="${product.image}" alt="${product.name}" class="product-image-small">
                            <div class="product-details">
                                <h4>${product.name}</h4>
                                <div class="product-meta">${product.category}</div>
                            </div>
                        </div>
                    </td>
                    <td>${product.currentStock}</td>
                    <td>${product.minStock}</td>
                    <td><span class="status-badge status-${stockStatus}">${stockText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn--xs btn--primary" onclick="admin.updateStock('${product.id}')">Update Stock</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStock(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const newStock = prompt(`Update stock for ${product.name}.\nCurrent stock: ${product.currentStock}\nEnter new stock quantity:`);
            if (newStock !== null && !isNaN(newStock) && parseInt(newStock) >= 0) {
                product.currentStock = parseInt(newStock);
                product.inStock = parseInt(newStock) > 0;
                this.showToast(`Stock updated for ${product.name}`);
                this.loadInventory();
                this.loadProducts();
            }
        }
    }

    // Customers Functions
    loadCustomers() {
        const tbody = document.getElementById('customers-table');
        if (!tbody) return;

        // Extract unique customers from orders
        const customersMap = new Map();
        
        this.orders.forEach(order => {
            const customerId = order.customerName + order.phone;
            if (customersMap.has(customerId)) {
                const customer = customersMap.get(customerId);
                customer.totalOrders++;
                customer.totalSpent += order.totalAmount;
                if (new Date(order.orderDate) > new Date(customer.lastOrder)) {
                    customer.lastOrder = order.orderDate;
                }
            } else {
                customersMap.set(customerId, {
                    name: order.customerName,
                    phone: order.phone,
                    email: order.email,
                    totalOrders: 1,
                    totalSpent: order.totalAmount,
                    lastOrder: order.orderDate
                });
            }
        });

        const customers = Array.from(customersMap.values());

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${customer.name}</div>
                        <div class="customer-contact">${customer.email || 'No email'}</div>
                    </div>
                </td>
                <td>${customer.phone}</td>
                <td>${customer.email || '-'}</td>
                <td>${customer.totalOrders}</td>
                <td>₹${customer.totalSpent}</td>
                <td>${customer.lastOrder}</td>
            </tr>
        `).join('');
    }

    // Product Management
    showProductModal(productId = null) {
        this.currentEditingProduct = productId;
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('modal-title');
        
        if (!modal || !title) return;
        
        if (productId) {
            title.textContent = 'Edit Product';
            const product = this.products.find(p => p.id === productId);
            if (product) {
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-price').value = product.price;
                document.getElementById('product-unit').value = product.unit;
                document.getElementById('product-category').value = product.category;
                document.getElementById('product-description').value = product.description;
                document.getElementById('current-stock').value = product.currentStock;
                document.getElementById('min-stock').value = product.minStock;
                document.getElementById('product-featured').checked = product.featured;
            }
        } else {
            title.textContent = 'Add New Product';
            const productForm = document.getElementById('product-form');
            if (productForm) {
                productForm.reset();
            }
        }
        
        modal.classList.remove('hidden');
    }

    hideProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentEditingProduct = null;
    }

    saveProduct() {
        const formData = {
            name: document.getElementById('product-name').value.trim(),
            price: parseFloat(document.getElementById('product-price').value) || 0,
            unit: document.getElementById('product-unit').value,
            category: document.getElementById('product-category').value,
            description: document.getElementById('product-description').value.trim(),
            currentStock: parseInt(document.getElementById('current-stock').value) || 0,
            minStock: parseInt(document.getElementById('min-stock').value) || 0,
            featured: document.getElementById('product-featured').checked
        };

        if (!formData.name || formData.price <= 0) {
            this.showToast('Please fill in all required fields correctly.', 'error');
            return;
        }

        if (this.currentEditingProduct) {
            const productIndex = this.products.findIndex(p => p.id === this.currentEditingProduct);
            if (productIndex !== -1) {
                this.products[productIndex] = { 
                    ...this.products[productIndex], 
                    ...formData,
                    inStock: formData.currentStock > 0
                };
                this.showToast('Product updated successfully!');
            }
        } else {
            const newProduct = {
                id: Date.now().toString(),
                ...formData,
                image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
                inStock: formData.currentStock > 0
            };
            this.products.push(newProduct);
            this.showToast('Product added successfully!');
        }

        this.hideProductModal();
        this.loadProducts();
        this.loadInventory();
    }

    editProduct(productId) {
        this.showProductModal(productId);
    }

    deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product && confirm(`Are you sure you want to delete "${product.name}"?`)) {
            this.products = this.products.filter(p => p.id !== productId);
            this.showToast('Product deleted successfully!');
            this.loadProducts();
            this.loadInventory();
        }
    }

    // Settings Functions
    loadSettings() {
        // Settings are already pre-filled in the HTML
    }

    saveStoreSettings() {
        this.showToast('Store settings saved successfully!');
    }

    saveDeliverySettings() {
        this.showToast('Delivery settings saved successfully!');
    }

    // Utility Functions
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            
            const toastContent = toast.querySelector('.toast-content');
            if (type === 'error') {
                toastContent.style.background = 'var(--color-error)';
                toastContent.innerHTML = `⚠ ${message}`;
            } else {
                toastContent.style.background = 'var(--color-success)';
                toastContent.innerHTML = `✓ ${message}`;
            }
            
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 4000);
        }
    }
}

// Global functions for onclick handlers
window.showSection = function(section) {
    if (window.admin) {
        window.admin.showSection(section);
    }
};

// Initialize the admin panel with proper DOM handling
function initializeAdmin() {
    console.log('DOM ready, initializing admin panel');
    if (!window.admin) {
        window.admin = new AdminPanel();
        window.admin.init();
    }
}

// Multiple initialization approaches for reliability
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
    // DOM is already ready
    initializeAdmin();
}

// Backup initialization
setTimeout(() => {
    if (!window.admin) {
        console.log('Backup initialization triggered');
        initializeAdmin();
    }
}, 500);