// ============================================================================
// RAZORPAY PAYMENT INTEGRATION FOR SOKAL BELA
// Add this to your app-enhanced.js
// ============================================================================

// Initialize Razorpay
let razorpayLoaded = false;

function loadRazorpayScript() {
    if (razorpayLoaded) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            razorpayLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initiate payment
async function initiatePayment(orderId, amount) {
    try {
        // Load Razorpay script
        await loadRazorpayScript();

        // Create Razorpay order
        const response = await fetch(`${FUNCTIONS_BASE}/create-payment-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                amount: amount * 100, // Convert to paise
                currency: 'INR'
            })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const razorpayOrderId = data.razorpayOrderId;

        // Razorpay options
        const options = {
            key: 'YOUR_RAZORPAY_KEY_ID', // Get from Razorpay Dashboard
            amount: amount * 100,
            currency: 'INR',
            name: 'Sokal Bela',
            description: 'Fresh Vegetables Delivery',
            order_id: razorpayOrderId,
            prefill: {
                name: currentUser?.displayName || '',
                email: currentUser?.email || '',
                contact: currentUser?.phone || ''
            },
            handler: async function(response) {
                await verifyPayment(orderId, response);
            },
            modal: {
                ondismiss: function() {
                    showError('Payment cancelled');
                }
            },
            theme: {
                color: '#218b91'
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error('Payment error:', error);
        showError('Failed to initiate payment: ' + error.message);
    }
}

// Verify payment
async function verifyPayment(orderId, paymentData) {
    try {
        showLoading();

        const response = await fetch(`${FUNCTIONS_BASE}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: orderId,
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_signature: paymentData.razorpay_signature
            })
        });

        const data = await response.json();

        if (data.success) {
            // Clear cart and show success
            cart = [];
            saveCartToStorage();
            updateCartCount();
            appliedCoupon = null;
            
            showModal('success-modal');
            showToast('Payment successful! Order confirmed.');
            
            // Redirect to orders page after 2 seconds
            setTimeout(() => {
                showPage('orders');
            }, 2000);
        } else {
            throw new Error(data.error || 'Payment verification failed');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('Payment verification failed: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Update checkout form to use Razorpay
async function handleCheckoutWithPayment(e) {
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
        // Create order first
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
        const orderId = result.orderId;

        hideLoading();

        // Now initiate payment
        await initiatePayment(orderId, total);

    } catch (error) {
        console.error('Error placing order:', error);
        showError('Failed to create order: ' + error.message);
        hideLoading();
    }
}

// Export payment function
window.initiatePayment = initiatePayment;
window.handleCheckoutWithPayment = handleCheckoutWithPayment;
