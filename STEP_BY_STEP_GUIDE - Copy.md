# 🎬 SOKAL BELA - STEP-BY-STEP USAGE GUIDE

## 🎯 Goal: See How the Server Works

Follow these steps to test all features!

---

## 📺 STEP 1: ACCESS THE SERVER (30 seconds)

### What to do:
1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Type this URL in the address bar:
   ```
   http://localhost:3000
   ```
3. Press Enter

### What you should see:
- Beautiful grocery store homepage
- Product showcase with 5 items
- Navigation bar with Login button
- Hero section with welcome message

**✅ If you see this, the server is working!**

---

## 🔐 STEP 2: LOGIN TO ADMIN ACCOUNT (1 minute)

### What to do:
1. Click the **"Login"** button in the top right
2. A modal popup will appear
3. Click the **"Sign In"** tab
4. Enter these credentials:
   ```
   Email: admin@sokal.com
   Password: admin123
   ```
5. Click **"Login"** button

### What you should see:
- Login modal closes
- Page refreshes
- Your name appears in the top right corner
- Admin menu might appear

**✅ You are now logged in as admin!**

---

## 🛍️ STEP 3: BROWSE PRODUCTS (2 minutes)

### What to do:
1. Click on **"Products"** in the navigation
2. You should see a grid of 5 products:
   - Fresh Tomatoes
   - Organic Milk
   - Whole Wheat Bread
   - Bananas
   - Chicken Breast

### Try searching:
1. In the search box (if visible), type: **"milk"**
2. The page should filter to show only "Organic Milk"
3. Clear the search

### Try filtering by category:
1. Look for category buttons or dropdown
2. Click "vegetables" 
3. See only vegetables displayed
4. Try "dairy", "bakery", "fruits", "meat"

**✅ Search and filter are working!**

---

## 🛒 STEP 4: ADD ITEMS TO CART (2 minutes)

### What to do:
1. Find "Fresh Tomatoes" product
2. Look for **"Add to Cart"** button
3. Click it
4. See a toast notification: "Added to cart"

### Add another item:
1. Find "Organic Milk"
2. Click **"Add to Cart"**
3. See notification

### View your cart:
1. Click **"Cart"** in the navigation (top right)
2. You should see:
   - Fresh Tomatoes (1 item)
   - Organic Milk (1 item)
   - Total price calculated

**✅ Shopping cart is working!**

---

## 📦 STEP 5: MODIFY CART (1 minute)

### Change quantities:
1. Find "Fresh Tomatoes" in cart
2. Click the **"+"** button to increase quantity to 2
3. See total price updated
4. Click **"-"** button to decrease

### Remove items:
1. Find "Organic Milk" in cart
2. Click **"Remove"** button
3. Item disappears from cart
4. Total updates

**✅ Cart management works!**

---

## 🎁 STEP 6: APPLY COUPON CODE (2 minutes)

### What to do:
1. In your cart, look for **"Coupon Code"** section
2. You should see a text input field
3. Type one of these coupon codes:
   ```
   SAVE10  (for 10% discount)
   SAVE50  (for ₹50 discount)
   WELCOME20  (for 20% discount)
   ```
4. Click **"Apply Coupon"** or press Enter
5. See a success message

### Check the discount:
1. Look at the order summary
2. You should see:
   - Subtotal: Original price
   - Discount: Applied amount
   - Total: Reduced price

**Example:**
```
Subtotal:      ₹80
Discount:      ₹8 (10% with SAVE10)
Delivery Fee:  ₹50
Tax:           ₹30
Total:         ₹152  ✅
```

**✅ Coupon system works!**

---

## 💳 STEP 7: CHECKOUT (2 minutes)

### What to do:
1. In your cart, look for **"Proceed to Checkout"** button
2. Click it
3. A checkout form appears with fields:
   - Customer Name
   - Phone Number
   - Address

### Fill the form:
1. **Name**: Enter any name (e.g., "John Doe")
2. **Phone**: Enter a 10-digit number (e.g., 9876543210)
3. **Address**: Enter any address (e.g., "123 Main Street")
4. Click **"Place Order"** button

### What happens next:
1. Success modal appears
2. Shows **Order ID** (e.g., "ORD101")
3. Shows order details with total
4. Cart clears automatically

**✅ Order placement works!**

---

## 📋 STEP 8: VIEW ORDER HISTORY (2 minutes)

### What to do:
1. Click **"My Orders"** in the navigation
2. You should see your placed order in a list
3. It should show:
   - Order ID
   - Order date
   - Total amount
   - Current status (should be "Pending")

### Click on order:
1. Click the order to expand
2. See all order details:
   - Items purchased
   - Quantities
   - Prices
   - Subtotal, tax, delivery fee
   - Discount applied
   - Final total

**✅ Order history works!**

---

## 👨‍💼 STEP 9: ADMIN DASHBOARD (3 minutes)

### Access admin features:
1. Click on your **name** in the top right
2. Look for **"Admin Dashboard"** option
3. Click it

### View all orders:
1. You should see a table of all orders
2. Shows:
   - Order ID
   - Customer name
   - Order total
   - Current status
   - Order date

### Update order status:
1. Find an order (your recent one)
2. Click to view details
3. Look for **status dropdown**
4. Click it and select:
   - "Pending" → "Confirmed"
   - "Confirmed" → "Processing"
   - "Processing" → "Shipped"
   - "Shipped" → "Delivered"
5. See status update instantly

### Try different statuses:
1. Change from "Pending" to "Confirmed"
2. Change from "Confirmed" to "Processing"
3. Change from "Processing" to "Shipped"
4. See the order progress through the pipeline

**✅ Admin dashboard works!**

---

## ⭐ STEP 10: SUBMIT REVIEW (2 minutes)

### Find a product:
1. Go to **"Products"** page
2. Click on "Fresh Tomatoes"
3. Product details modal opens

### Submit a review:
1. Look for **"Submit Review"** section
2. Select **rating** (1-5 stars)
3. Enter **comment** (e.g., "Great quality tomatoes!")
4. Click **"Submit Review"** button
5. See success message

### View reviews:
1. Below the review form, see reviews count
2. See your review listed (if fetched)

**✅ Review system works!**

---

## 📞 STEP 11: TEST API ENDPOINTS (Advanced - Optional)

### Open PowerShell and test:

#### Test 1: Get all products
```powershell
Invoke-WebRequest "http://localhost:3000/api/products" | Select-Object -ExpandProperty Content
```

#### Test 2: Get single product
```powershell
Invoke-WebRequest "http://localhost:3000/api/products/1" | Select-Object -ExpandProperty Content
```

#### Test 3: Search products
```powershell
Invoke-WebRequest "http://localhost:3000/api/products?search=milk" | Select-Object -ExpandProperty Content
```

#### Test 4: Check API health
```powershell
Invoke-WebRequest "http://localhost:3000/api/health" | Select-Object -ExpandProperty Content
```

**✅ All APIs are working!**

---

## 🎬 COMPLETE DEMO WORKFLOW (10 minutes)

Here's the complete flow in order:

### Minute 1: Setup
- [ ] Open http://localhost:3000
- [ ] See homepage load

### Minutes 2-3: Login
- [ ] Click Login
- [ ] Enter admin@sokal.com / admin123
- [ ] See logged-in state

### Minutes 4-5: Browse
- [ ] Go to Products page
- [ ] Search for "milk"
- [ ] Filter by "vegetables"

### Minutes 6-7: Shop
- [ ] Add Tomatoes to cart
- [ ] Add Milk to cart
- [ ] View cart

### Minutes 8-9: Checkout
- [ ] Apply coupon "SAVE10"
- [ ] See discount
- [ ] Fill checkout form
- [ ] Place order

### Minute 10: Admin
- [ ] Go to Admin Dashboard
- [ ] Find your order
- [ ] Update status to "Confirmed"
- [ ] Update status to "Shipped"

**Result: 10-minute complete demo! ✅**

---

## 🎯 FEATURE CHECKLIST

As you follow these steps, checkmark these features:

- [ ] **Server Running** - http://localhost:3000 loads
- [ ] **Homepage** - See beautiful landing page
- [ ] **Login** - Login works with admin account
- [ ] **Browse** - See 5 products on Products page
- [ ] **Search** - Search filters products
- [ ] **Filter** - Category filter works
- [ ] **Add to Cart** - Items added successfully
- [ ] **Cart View** - Cart shows items correctly
- [ ] **Update Cart** - Can change quantities
- [ ] **Remove Items** - Can remove from cart
- [ ] **Coupon Code** - Discount applied correctly
- [ ] **Checkout** - Order form fills successfully
- [ ] **Order Creation** - Order ID generated
- [ ] **Order History** - See orders in My Orders
- [ ] **Order Details** - View complete order info
- [ ] **Admin Access** - Admin dashboard accessible
- [ ] **View Orders** - See all orders as admin
- [ ] **Update Status** - Can change order status
- [ ] **Status Update** - Status changes reflected
- [ ] **Reviews** - Can submit product review

**Total: 20 Features to Test ✅**

---

## 🎓 WHAT YOU'RE TESTING

### Frontend Features
- HTML5 responsive design
- JavaScript interactivity
- Dynamic page loading
- Form validation
- Real-time calculations
- Data persistence (localStorage)
- Modal windows
- Toast notifications

### Backend Features
- REST API endpoints
- Authentication logic
- Product data retrieval
- Order creation
- Coupon application
- Stock management
- Order status updates
- Data validation

### Integration Features
- Client-server communication
- Data synchronization
- Error handling
- Success confirmations
- Real-time updates

---

## 💡 TIPS FOR TESTING

### Try different coupons:
```
SAVE10     → See 10% discount
SAVE50     → See fixed ₹50 discount
WELCOME20  → See 20% discount
```

### Try different quantities:
```
1 item     → Low total
5 items    → Higher total with discount
10 items   → Test stock limits
```

### Try different statuses:
```
Pending → Confirmed → Processing → Shipped → Delivered
```

### Try different products:
```
Vegetables: Tomatoes
Dairy: Milk
Bakery: Bread
Fruits: Bananas
Meat: Chicken
```

---

## 🚨 TROUBLESHOOTING

### Server not loading?
- [ ] Check if server is running (see terminal)
- [ ] Wait 5 seconds and refresh page
- [ ] Try: http://localhost:3000/api/health

### Login not working?
- [ ] Check email: admin@sokal.com (case-sensitive)
- [ ] Check password: admin123
- [ ] Check console for errors (F12)

### Products not showing?
- [ ] Refresh page (Ctrl+R)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Check if server is running

### Cart not updating?
- [ ] Check browser console (F12) for errors
- [ ] Try adding item again
- [ ] Refresh page and retry

### Order not creating?
- [ ] Fill all required fields (Name, Phone, Address)
- [ ] Check if stock is available
- [ ] See console for error details

---

## 📊 SUCCESS INDICATORS

### You know the server is working when:
✅ Page loads instantly
✅ Products display with images & prices
✅ Login succeeds with admin account
✅ Cart updates immediately
✅ Discount calculates correctly
✅ Order creates with confirmation
✅ Admin can update order status
✅ Pages are responsive & beautiful

---

## 🎉 YOU'VE COMPLETED THE TESTING!

By following all these steps, you have:

✅ Verified the server is running
✅ Tested all frontend features
✅ Tested all backend APIs
✅ Confirmed user authentication
✅ Tested shopping workflow
✅ Verified coupon system
✅ Tested order management
✅ Tested admin features
✅ Confirmed data persistence
✅ Validated error handling

**Result: Sokal Bela is fully functional and ready! 🚀**

---

## 🎬 NEXT VIDEO (After This Testing)

Once you complete this guide, you can:
1. Review the code (app-enhanced.js, etc.)
2. Integrate with Firebase
3. Configure Razorpay for real payments
4. Deploy to production
5. Monitor and scale

---

**Time to Complete**: 10-15 minutes  
**Difficulty**: Easy  
**Requirements**: Browser + running server  
**Success Rate**: 100% if server is running ✅

**Start Now: http://localhost:3000** 🎯
