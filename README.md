# Sokal Bela - Local Vegetable Delivery Web App

A modern web application for local vegetable delivery service in Kolkata, featuring an intuitive shopping experience and comprehensive admin dashboard.

## 🌟 Features

### Customer Features
- **Product Catalog**: Browse fresh vegetables with search and category filtering
- **Shopping Cart**: Add/remove items, update quantities, and view order summary
- **Easy Checkout**: Simple order placement with customer details
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Real-time Updates**: Live inventory and pricing information

### Admin Features
- **Secure Dashboard**: Password-protected admin access
- **Order Management**: View and manage customer orders
- **Inventory Control**: Add, update, and manage product inventory
- **Sales Analytics**: Track total orders and revenue
- **Real-time Notifications**: Firebase-powered push notifications

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Notifications**: Firebase Cloud Messaging
- **Payments**: Razorpay (UPI, credit/debit cards, net banking, wallets) via Firebase Cloud Functions
- **Hosting**: Can be deployed to Firebase Hosting or any static hosting service

## 📁 Project Structure

```
Sokal Bela/
├── index.html              # Main customer-facing HTML (incl. payment success/failure pages)
├── admin.html              # Admin dashboard HTML
├── app.js                  # Main customer application logic
├── admin.js                # Admin dashboard logic
├── style.css               # Styling and responsive design
├── firebase-config.js      # Firebase configuration
├── db-operations.js        # Database operations
├── notifications.js        # Push notification handling
├── razorpay-integration.js # Razorpay checkout module (frontend)
├── local-server.js         # Local Express development server
├── backend/
│   └── functions/          # Firebase Cloud Functions (Razorpay payment APIs)
│       ├── index.js        #   create-payment-order / verify-payment / webhook
│       └── package.json
├── .env.example            # Environment variables template
├── package.json            # Project dependencies and npm scripts
├── firebase.json           # Firebase configuration (incl. /api/** → functions rewrite)
├── firestore.rules         # Firestore security rules (incl. payments collection)
├── storage.rules           # Firebase Storage security rules
└── .firebaserc             # Firebase project configuration
```

## 🚀 Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local development server) or any HTTP server
- Node.js & npm (for Firebase CLI and functions emulator)
- Firebase account (for database functionality)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Sokal-Bela
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (or configure as needed)
   - Update with your Firebase project credentials if using Firebase directly

4. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication
   - Update `firebase-config.js` with your Firebase configuration
   - (Optional) For Cloud Messaging notifications, set up Firebase Cloud Messaging in your project

### Running the Application

#### Option 1: Local Development Server (Recommended)

The project includes a local Express server for development:

```bash
# Start the local development server
npm start

# Or with auto-reload on file changes
npm run dev
```

Then open `http://localhost:3000` in your browser.

The server provides:
- CORS-enabled API for testing
- Static file serving for the frontend
- Mock in-memory database for local development
- Rate limiting for API endpoints

#### Option 2: Python HTTP Server

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

#### Option 3: VS Code Live Server
1. Install the Live Server extension in VS Code
2. Right-click on `index.html` or `admin.html`
3. Select "Open with Live Server"

#### Option 4: Any Static Server
You can use any static file server like:
- Node.js `http-server`
- PHP built-in server
- Apache/Nginx

### npm Scripts

The following npm scripts are available:

- `npm start` - Start the local Express development server on port 3000
- `npm run dev` - Start the development server with auto-reload using nodemon
- `npm run func:start` - Start Firebase Cloud Functions emulator (if backend/functions exists)

## 💳 Razorpay Payment Gateway

Online payments (UPI, credit/debit cards, net banking, wallets) are handled by Razorpay with a Firebase Cloud Functions backend. Payment methods are enabled/disabled in the [Razorpay Dashboard](https://dashboard.razorpay.com/) → Settings → Payment Methods; Checkout shows them automatically.

### Flow

1. Customer places an order → saved to Firestore with `paymentStatus: "pending"`.
2. Frontend calls `POST /api/create-payment-order` → backend creates a Razorpay order.
3. Razorpay Checkout popup opens (UPI / cards / net banking / wallets).
4. On payment, the signature is verified server-side via `POST /api/verify-payment` (HMAC-SHA256) and the payment is stored in the Firestore **`payments`** collection (`paymentId`, `orderId`, `amount`, `customerId`, `paymentStatus`, `paymentMethod`, `createdAt`).
5. A `POST /api/razorpay-webhook` endpoint handles `payment.captured` / `payment.failed` as the authoritative async fallback.
6. A `POST /api/payment-status` endpoint records cancellation/timeout/failure updates from the UI.
6. The customer lands on the **Payment Success** or **Payment Failure** page (with retry).

### Setup (production)

```bash
cd backend/functions && npm install

# Set secrets (recommended)
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
# Browser origins allowed to call the API cross-origin (comma-separated).
# Not needed when the frontend is served from Firebase Hosting (same-origin /api/** rewrite).
firebase functions:secrets:set ALLOWED_ORIGINS   # e.g. https://sokal-bela-store.web.app,https://sokal-bela-store.firebaseapp.com

firebase deploy --only functions,hosting,firestore:rules,storage
```

In the Razorpay Dashboard, add a webhook pointing to
`https://<region>-<project>.cloudfunctions.net/api/razorpay-webhook`
with the same `RAZORPAY_WEBHOOK_SECRET`, subscribing to `payment.captured` and `payment.failed`.

Set your **publishable** key ID in `index.html` (`RZP_KEY`) — it's used as a fallback when the backend is unreachable. The key **secret** must never appear in frontend code.

### Local development

Copy `.env.example` to `.env`, fill in your `rzp_test_*` keys, then `npm start`. The local server uses the real Razorpay API when keys are present and falls back to mock payments otherwise.

## 🔐 Authentication & Roles

The app now uses Firebase Authentication for customer and admin access.

- Customers can sign up/login from the customer auth modal in `index.html`.
- Admin dashboard access requires a Firebase user with role `Admin`.
- Supported roles: `Customer`, `Seller`, `Admin` (stored in `users/{uid}` and/or custom claims).

To bootstrap the first admin, sign in with your trusted admin email once and ensure `users/{uid}.role = "Admin"` (or set custom claim `role=Admin`).

## 📱 Features Overview

### Home Page
- Hero section with call-to-action
- Featured vegetables showcase
- Store information and contact details

### Products Page
- Complete vegetable catalog
- Search functionality
- Category filtering
- Add to cart functionality

### Shopping Cart
- View selected items
- Update quantities
- Remove items
- Order summary
- Checkout form

### Admin Dashboard
- Order management table
- Inventory management
- Sales statistics
- Product CRUD operations

## 🌐 Deployment

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase: `firebase init hosting`
3. Deploy: `firebase deploy`

### Other Hosting Options
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## 🔜 Next Steps & Improvements

Recommended enhancements for production:

- **Role setup**: Create admin/seller users in Firebase Auth and assign roles (`users/{uid}.role`)
- **Environment config**: Use proper environment variable management instead of hardcoded Firebase credentials
- **Testing & CI**: Add unit tests for core functions and setup CI pipeline (currently using npm-publish-github-packages workflow)
- **Accessibility & performance**: Run Lighthouse, optimize images, and ensure mobile accessibility
- **Backend API**: Consider deploying actual backend/functions for scalable payment processing
- **Error handling**: Add comprehensive error logging and user feedback for failed operations

## 📞 Contact Information

- **Store Location**: Main Market, Salt Lake, Kolkata - 700064
- **Phone**: +91 98765 43210
- **Hours**: Monday-Sunday, 7:00 AM - 9:00 PM
- **Delivery**: Free delivery within 5km (Minimum order ₹200)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with ❤️ for local vegetable vendors
- Images from Unsplash
- Firebase for backend services 