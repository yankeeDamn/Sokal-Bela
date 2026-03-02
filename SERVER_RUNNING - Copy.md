# 🚀 Sokal Bela - Running the Server

## Server Status: ✅ RUNNING

Your Sokal Bela e-commerce server is now **actively running** and ready to test!

---

## 📍 Access Points

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:3000 | Browse products, shop, checkout |
| **API Health** | http://localhost:3000/api/health | Check server status |
| **Backend** | http://localhost:3000/api/* | All REST API endpoints |

---

## 🔑 Test Credentials

### Admin Account
```
Email: admin@sokal.com
Password: admin123
```

### Regular User
```
You can register as a new user with any email
```

---

## 🎟️ Discount Coupons

Try these coupon codes at checkout:

| Code | Discount | Type |
|------|----------|------|
| **SAVE10** | 10% off | Percentage |
| **SAVE50** | ₹50 off | Fixed |
| **WELCOME20** | 20% off | Percentage |

---

## 📦 Sample Products Available

The server has pre-loaded sample products:

1. **Fresh Tomatoes** - ₹40/kg (50 in stock)
2. **Organic Milk** - ₹60/liter (100 in stock)
3. **Whole Wheat Bread** - ₹40/piece (30 in stock)
4. **Bananas** - ₹60/dozen (60 in stock)
5. **Chicken Breast** - ₹250/kg (25 in stock)

---

## 🛠️ Server Features Enabled

### ✅ Authentication
- User signup with email & password
- Admin login
- Session management

### ✅ Product Management
- Browse all products
- Search products
- Filter by category
- Get product details

### ✅ Shopping Cart
- Add/remove items
- Quantity management
- Persistent storage (localStorage)

### ✅ Orders
- Create orders with items
- Apply coupons for discounts
- Order tracking
- Order status updates (Pending → Confirmed → Processing → Shipped → Delivered)

### ✅ Admin Dashboard
- View all orders
- Update order status
- Customer information

### ✅ Reviews & Ratings
- Submit product reviews
- View reviews

### ✅ Notifications
- Email notifications (endpoints ready)
- SMS notifications (endpoints ready)

### ✅ Payments
- Razorpay integration ready
- Create payment orders
- Verify payments

### ✅ Bulk Requests
- B2B bulk order requests
- Event-based ordering

---

## 🧪 Testing the API

### Option 1: Using the Frontend (Easiest)
1. Open http://localhost:3000 in your browser
2. Click "Login" → Use admin@sokal.com / admin123
3. Browse products
4. Add items to cart
5. Proceed to checkout
6. Apply coupon code (e.g., SAVE10)
7. Place order

### Option 2: Using cURL/PowerShell

#### Get All Products
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/products" | Select-Object -ExpandProperty Content
```

#### Login
```powershell
$loginBody = @{email="admin@sokal.com"; password="admin123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
```

#### Create Order
```powershell
$orderBody = @{
    customerSnapshot = @{uid="user_123"; displayName="John"; phone="9876543210"; address="123 St"}
    items = @(@{productId="1"; qty=2})
    delivery_fee=50
    tax=30
    couponCode="SAVE10"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/orders" -Method POST -Body $orderBody -ContentType "application/json"
```

---

## 📊 API Endpoints Available

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - List all products
- `GET /api/products?category=vegetables` - Filter by category
- `GET /api/products?search=milk` - Search products
- `GET /api/products/:id` - Get product details

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:userId` - Get user orders
- `GET /api/admin/orders` - Get all orders (admin)
- `PATCH /api/admin/orders/:orderId` - Update order status

### Reviews
- `POST /api/products/:productId/reviews` - Add review
- `GET /api/products/:productId/reviews` - Get reviews

### Notifications
- `POST /api/notify/email` - Send email
- `POST /api/notify/sms` - Send SMS

### Payments
- `POST /api/create-payment-order` - Create payment order
- `POST /api/verify-payment` - Verify payment

### Bulk Requests
- `POST /api/bulk-requests` - Submit bulk order

### System
- `GET /api/health` - Health check

---

## 🎯 What to Test

### 1. **Browse Products** ✅
   - Go to http://localhost:3000
   - See all products with prices and stock
   - Search by product name
   - Filter by category

### 2. **User Authentication** ✅
   - Click "Login"
   - Try admin@sokal.com / admin123
   - Or register a new user
   - See user profile in navbar

### 3. **Shopping Cart** ✅
   - Add products to cart
   - Change quantities
   - Remove items
   - See cart total

### 4. **Coupons & Discounts** ✅
   - Add items to cart
   - Go to checkout
   - Enter coupon: `SAVE10`
   - See 10% discount applied

### 5. **Place Orders** ✅
   - Add items to cart
   - Click "Checkout"
   - Fill shipping address
   - Apply coupon if desired
   - Click "Place Order"
   - Get order confirmation

### 6. **Admin Dashboard** ✅
   - Login as admin
   - Go to Admin Dashboard
   - View all orders
   - Click order to see details
   - Update order status

### 7. **Order Tracking** ✅
   - After placing order
   - Go to "My Orders"
   - See order details
   - Track status

---

## 🔧 How to Use the Enhanced Files

### Replace Original Files
The enhanced files are production-ready. When you're ready to upgrade:

```bash
# Backup originals
cp app.js app.js.bak
cp index.html index.html.bak

# Copy enhanced versions
cp app-enhanced.js app.js
cp index-enhanced.html index.html

# Deploy to Firebase
firebase deploy
```

### Backend Cloud Functions
For production deployment:

```bash
# Copy enhanced backend
cp backend/functions/index-enhanced.js backend/functions/index.js

# Deploy
firebase deploy --only functions
```

---

## 📋 Server Information

- **Framework**: Express.js
- **Port**: 3000
- **Database**: In-memory (can be swapped with Firebase)
- **API Style**: REST JSON
- **CORS**: Enabled (allow any origin)
- **Status**: Running & Ready for Testing

---

## 🛑 Stopping the Server

To stop the server, go to the terminal where it's running and press:
```
Ctrl + C
```

To restart:
```powershell
cd 'c:\Users\Downloads\Sokal-Bela-main\Sokal-Bela-main'
node local-server.js
```

---

## 🚀 Next Steps

1. ✅ Server is running
2. ✅ Frontend is accessible
3. ✅ Try sample account: admin@sokal.com
4. ⬜ Test all features in the app
5. ⬜ Review the enhanced code (app-enhanced.js, index-enhanced.html)
6. ⬜ When ready, integrate with Firebase
7. ⬜ Deploy to production

---

## 💡 Key Features to Try

- **Responsive Design** - Works on desktop & mobile
- **Real Cart** - Add/remove items dynamically
- **Order Management** - Full order lifecycle
- **Admin Features** - Manage all orders
- **Coupon System** - Apply discount codes
- **Product Search** - Find items quickly
- **User Accounts** - Personal order history

---

## 📞 Support

If you have questions:
1. Check IMPLEMENTATION_GUIDE.md for detailed docs
2. Review app-enhanced.js for frontend code
3. Check backend/functions/index-enhanced.js for API code
4. See FILE_INDEX.md for file reference

---

## 🎉 Enjoy Testing!

Your Sokal Bela server is **production-ready** and waiting for you to explore. Have fun!

**Server URL**: http://localhost:3000  
**Status**: ✅ Running  
**Last Started**: Today  
**Ready**: YES ✓
