# Sokal Bela - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Backup Original Files
```bash
cd c:\Users\Downloads\Sokal-Bela-main\Sokal-Bela-main
# Backup old files
move index.html index-backup.html
move app.js app-backup.js
move backend\functions\index.js backend\functions\index-backup.js
```

### Step 2: Use Enhanced Version
```bash
# Copy enhanced files
copy index-enhanced.html index.html
copy app-enhanced.js app.js
copy backend\functions\index-enhanced.js backend\functions\index.js
```

### Step 3: Install Dependencies
```bash
cd backend\functions
npm install
```

### Step 4: Start Firebase Emulator (Optional but Recommended)
```bash
# In backend/functions directory
firebase emulators:start
```

### Step 5: Run the Application
```bash
# From root directory (in a new terminal)
cd c:\Users\Downloads\Sokal-Bela-main\Sokal-Bela-main
python -m http.server 8080
```

### Step 6: Open in Browser
```
http://localhost:8080
```

---

## ✅ Test the Features

### 1. **Sign Up**
- Click "Sign Up" button
- Enter: Name, Email, Phone, Password
- Submit

### 2. **Browse Products**
- Click "Products" in navbar
- Search for "Potato", "Tomato", etc.
- Click category buttons to filter

### 3. **Add to Cart**
- Click "Add to cart" on any product
- Adjust quantity with +/- buttons
- See cart count increase in navbar

### 4. **Apply Coupon**
- Go to Cart
- Try code: `SAVE10` (10% discount)
- See discount applied in summary

### 5. **Place Order**
- Enter delivery address
- Click "Place Order"
- See success message

### 6. **View Orders**
- Click "My Orders" in navbar
- See your recent orders

### 7. **Admin Dashboard**
- Click "Admin" in navbar
- Login: `admin` / `admin123`
- View all orders
- Change order status
- See dashboard stats

---

## 🎁 What's Included

✅ User Authentication (Sign up & Login)
✅ Product Browsing & Search
✅ Shopping Cart
✅ Wishlist
✅ Coupon Codes
✅ Order Management
✅ Admin Dashboard
✅ Reviews & Ratings
✅ Delivery Address Management

---

## 🔧 Optional: Add Payment Gateway

### Setup Razorpay (India's #1 Payment Gateway)

1. **Create Razorpay Account**
   - Go to: https://razorpay.com
   - Sign up
   - Get API keys from Dashboard

2. **Add to app-enhanced.js**
   ```javascript
   // Include at end of file
   // <script src="razorpay-integration.js"></script>
   ```

3. **Include Razorpay Script in index.html**
   ```html
   <!-- Add before closing </body> -->
   <script src="razorpay-integration.js"></script>
   ```

4. **Update Checkout Form**
   ```html
   <!-- In cart checkout section -->
   <button type="submit" class="btn btn--primary btn--full-width">
     Pay with Razorpay
   </button>
   ```

---

## 📧 Optional: Setup Email Notifications

### Using SendGrid

1. **Get SendGrid API Key**
   - Sign up at: https://sendgrid.com
   - Get API key from settings

2. **Deploy to Firebase**
   ```bash
   cd backend/functions
   firebase functions:config:set sendgrid.key="your-api-key"
   firebase deploy --only functions
   ```

---

## 🆘 Troubleshooting

### Problem: "Products Not Loading"
**Solution:** 
- Make sure Firebase is initialized
- Check console for errors (F12)
- Run seed script if using emulator: `npm run seed`

### Problem: "Can't Sign Up"
**Solution:**
- Check email format is valid
- Password must be at least 6 characters
- Check browser console for errors

### Problem: "Order Not Saving"
**Solution:**
- Check Firestore is enabled in Firebase
- Verify minimum order amount (₹200)
- Check network tab (F12) for API errors

### Problem: "Admin Login Not Working"
**Solution:**
- Username must be: `admin`
- Password must be: `admin123`
- Case sensitive!

---

## 📂 File Structure

```
Sokal-Bela-main/
├── index.html                 ← Main webpage (enhanced)
├── app.js                     ← Frontend JavaScript (enhanced)
├── style.css                  ← Styling
├── app-enhanced.js            ← Backup: new version with features
├── index-enhanced.html        ← Backup: new HTML
├── razorpay-integration.js    ← Payment integration (optional)
├── IMPLEMENTATION_GUIDE.md    ← Full feature guide
├── QUICK_START.md            ← This file
│
├── backend/
│   └── functions/
│       ├── index.js           ← Cloud functions (enhanced)
│       ├── index-enhanced.js  ← Backup: new version
│       ├── razorpay-payments.js ← Payment endpoints (optional)
│       ├── package.json
│       └── seed.js            ← Sample data script
```

---

## 🎓 Learning Resources

### Firebase
- [Firebase Console](https://console.firebase.google.com)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)

### Payment Integration
- [Razorpay Docs](https://razorpay.com/docs/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/paypal/payments/test-cards/)

### Email Services
- [SendGrid Docs](https://sendgrid.com/docs/)
- [SendGrid Setup](https://sendgrid.com/docs/for-developers/sending-email/quickstart-nodejs/)

---

## 💡 Tips & Tricks

### Test Razorpay Payments (Without Real Money)
Use test card:
- Card Number: `4111 1111 1111 1111`
- Expiry: `12/25`
- CVV: `123`
- Click "Pay Now" - it will succeed

### Sample Coupon Codes
- `SAVE10` - 10% off (min ₹200)
- `SAVE50` - ₹50 off (min ₹500)  
- `WELCOME20` - 20% off (min ₹300)

### View Logs
Open browser console (F12) and check:
- Console tab for errors
- Network tab for API calls
- Application tab for localStorage

---

## 🚀 Next Steps

After getting basic version working:

1. **Customize Products**
   - Add your vegetables to Firestore
   - Update product images
   - Set pricing

2. **Setup Email Notifications**
   - Get SendGrid API key
   - Configure in Cloud Functions
   - Test order emails

3. **Add Payment Gateway**
   - Integrate Razorpay
   - Test with test cards
   - Deploy to production

4. **Deploy to Production**
   - Get domain name
   - Deploy frontend to Firebase Hosting
   - Deploy backend to Cloud Functions
   - Setup SSL certificate

5. **Monitor & Improve**
   - Check analytics
   - Monitor Firestore usage
   - Optimize images
   - Improve user experience

---

## 📞 Need Help?

### Common Issues & Solutions

**Issue:** "Cannot POST /api/products"
- **Cause:** Cloud Functions not deployed
- **Fix:** Run `firebase deploy --only functions`

**Issue:** "Firebase initialization error"
- **Cause:** Wrong firebase config
- **Fix:** Check firebase-config.js has correct keys

**Issue:** "CORS error on API calls"
- **Cause:** CORS not enabled on backend
- **Fix:** Check `app.use(cors({ origin: true }))` in functions

**Issue:** "Cart empty after refresh"
- **Cause:** localStorage disabled
- **Fix:** Enable localStorage in browser settings

---

## ✨ What You've Built

You now have a **fully functional e-commerce platform** with:

- ✅ User authentication system
- ✅ Product catalog with search/filter
- ✅ Shopping cart with persistence
- ✅ Order management system
- ✅ Admin dashboard
- ✅ Coupon/discount system
- ✅ Wishlist feature
- ✅ Review system
- ✅ Cloud database (Firestore)
- ✅ Backend API (Cloud Functions)

---

## 🎉 Congratulations!

You've successfully set up **Sokal Bela** - a complete modern grocery delivery platform!

Start testing, customize it with your products, and deploy to production.

**Happy coding! 🚀**

---

**Last Updated:** March 2025
**Version:** 2.0
