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
- **Hosting**: Can be deployed to Firebase Hosting or any static hosting service

## 📁 Project Structure

```
Sokal Bela/
├── index.html          # Main HTML file
├── app.js             # Main application logic
├── app_1.js           # Additional app logic (backup)
├── app_2.js           # Additional app logic (backup)
├── style.css          # Styling and responsive design
├── firebase-config.js # Firebase configuration
├── db-operations.js   # Database operations
└── notifications.js   # Push notification handling
```

## 🚀 Getting Started

### Prerequisites

- Web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local development server) or any HTTP server
- Firebase account (for database functionality)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Sokal Bela Project VibeCoding week"
```

2. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication
   - Update `firebase-config.js` with your Firebase configuration

### Running the Application

#### Option 1: Python HTTP Server
```bash
cd "Sokal Bela"
python -m http.server 8080
```
Then open http://localhost:8080 in your browser.

#### Option 2: VS Code Live Server
1. Install the Live Server extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

#### Option 3: Any Static Server
You can use any static file server like:
- Node.js `http-server`
- PHP built-in server
- Apache/Nginx

## 🔐 Admin Access

To access the admin dashboard:
1. Navigate to the Admin page from the navigation menu
2. Use the following credentials:
   - Username: `admin`
   - Password: `admin123`

**Note**: For production, please change these credentials in the code.

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
2. Initialize Firebase: `firebase init`
3. Deploy: `firebase deploy`

### Other Hosting Options
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

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