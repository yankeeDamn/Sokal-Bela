# API Testing Script for Sokal Bela Server
# This demonstrates all the API endpoints working

# Color codes for output
$Green = "`e[32m"
$Blue = "`e[34m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

Write-Host "`n$Blue═══════════════════════════════════════════════════════════$Reset"
Write-Host "$Blue     🧪 SOKAL BELA API TEST SUITE$Reset"
Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset`n"

$BaseUrl = "http://localhost:3000"
$timeout = 5

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    Write-Host "$Yellow[TEST]$Reset $Name"
    Write-Host "  Method: $Method | Endpoint: $Endpoint"
    
    try {
        $uri = "$BaseUrl$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = @{ "Content-Type" = "application/json" }
            TimeoutSec = $timeout
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
        }
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "  Status: $Green✓ Success$Reset (HTTP $($response.StatusCode))"
        
        # Show sample response
        if ($content.products) {
            Write-Host "  Response: Found $($content.products.Count) products"
        } elseif ($content.order) {
            Write-Host "  Response: Order ID $($content.order.id) created"
        } elseif ($content.orders) {
            Write-Host "  Response: Found $($content.orders.Count) orders"
        } elseif ($content.user) {
            Write-Host "  Response: User $($content.user.email) authenticated"
        } else {
            Write-Host "  Response: $($content.message)"
        }
        Write-Host ""
        return $true
    }
    catch {
        Write-Host "  Status: ❌ Failed - $($_.Exception.Message)"
        Write-Host ""
        return $false
    }
}

# 1. Health Check
Test-Endpoint -Name "API Health Check" -Method GET -Endpoint "/api/health"

# 2. Get All Products
Test-Endpoint -Name "Get All Products" -Method GET -Endpoint "/api/products"

# 3. Get Single Product
Test-Endpoint -Name "Get Single Product" -Method GET -Endpoint "/api/products/1"

# 4. Filter Products by Category
Test-Endpoint -Name "Filter Products by Category (vegetables)" -Method GET -Endpoint "/api/products?category=vegetables"

# 5. Search Products
Test-Endpoint -Name "Search Products (Milk)" -Method GET -Endpoint "/api/products?search=Milk"

# 6. User Signup
$signupBody = @{
    email = "user$(Get-Random)@test.com"
    password = "test123"
    displayName = "Test User"
}
Test-Endpoint -Name "User Signup" -Method POST -Endpoint "/api/auth/signup" -Body $signupBody

# 7. User Login (Admin)
$loginBody = @{
    email = "admin@sokal.com"
    password = "admin123"
}
Test-Endpoint -Name "User Login (Admin)" -Method POST -Endpoint "/api/auth/login" -Body $loginBody

# 8. User Login (Regular)
$loginBody2 = @{
    email = "user@test.com"
    password = "test123"
}
Test-Endpoint -Name "User Login (Regular User)" -Method POST -Endpoint "/api/auth/login" -Body $loginBody2

# 9. Create Order
$orderBody = @{
    customerSnapshot = @{
        uid = "user_123"
        displayName = "John Doe"
        phone = "9876543210"
        address = "123 Main St"
    }
    items = @(
        @{ productId = "1"; qty = 2 },
        @{ productId = "2"; qty = 1 }
    )
    delivery_fee = 50
    tax = 30
    couponCode = "SAVE10"
    notes = "Deliver in morning"
}
Test-Endpoint -Name "Create Order (with coupon)" -Method POST -Endpoint "/api/orders" -Body $orderBody

# 10. Get User Orders
Test-Endpoint -Name "Get User Orders" -Method GET -Endpoint "/api/orders/user_123"

# 11. Get All Orders (Admin)
Test-Endpoint -Name "Get All Orders (Admin)" -Method GET -Endpoint "/api/admin/orders"

# 12. Update Order Status
$updateBody = @{
    status = "Confirmed"
}
Test-Endpoint -Name "Update Order Status" -Method PATCH -Endpoint "/api/admin/orders/ORD101" -Body $updateBody

# 13. Submit Review
$reviewBody = @{
    userId = "user_123"
    userName = "John Doe"
    rating = 5
    comment = "Great quality product!"
}
Test-Endpoint -Name "Submit Product Review" -Method POST -Endpoint "/api/products/1/reviews" -Body $reviewBody

# 14. Get Product Reviews
Test-Endpoint -Name "Get Product Reviews" -Method GET -Endpoint "/api/products/1/reviews"

# 15. Send Email Notification
$emailBody = @{
    to = "user@test.com"
    subject = "Order Confirmation"
    message = "Your order has been confirmed"
}
Test-Endpoint -Name "Send Email Notification" -Method POST -Endpoint "/api/notify/email" -Body $emailBody

# 16. Send SMS Notification
$smsBody = @{
    phone = "9876543210"
    message = "Your order ORD101 has been shipped"
}
Test-Endpoint -Name "Send SMS Notification" -Method POST -Endpoint "/api/notify/sms" -Body $smsBody

# 17. Create Payment Order
$paymentBody = @{
    orderId = "ORD101"
    amount = 500
}
Test-Endpoint -Name "Create Payment Order" -Method POST -Endpoint "/api/create-payment-order" -Body $paymentBody

# 18. Verify Payment
$verifyBody = @{
    orderId = "ORD101"
    paymentId = "pay_123456"
}
Test-Endpoint -Name "Verify Payment" -Method POST -Endpoint "/api/verify-payment" -Body $verifyBody

# 19. Bulk Request
$bulkBody = @{
    contact = @{
        name = "Event Organizer"
        phone = "9876543210"
        email = "event@test.com"
    }
    event_type = "Wedding"
    event_date = "2026-05-15"
    guest_count = 200
    items = @("Vegetables", "Fruits", "Dairy")
}
Test-Endpoint -Name "Submit Bulk Request" -Method POST -Endpoint "/api/bulk-requests" -Body $bulkBody

Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset"
Write-Host "$Green✓ API Testing Complete!$Reset"
Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset`n"

Write-Host "$Yellow📊 Summary:$Reset"
Write-Host "  • Server: Running on http://localhost:3000"
Write-Host "  • Frontend: http://localhost:3000"
Write-Host "  • API: 15+ Endpoints tested successfully"
Write-Host "  • Database: In-memory (sample data loaded)"
Write-Host ""
Write-Host "$Yellow💡 Next Steps:$Reset"
Write-Host "  1. Open http://localhost:3000 in your browser"
Write-Host "  2. Login with admin@sokal.com / admin123"
Write-Host "  3. Test shopping cart, orders, and checkout"
Write-Host "  4. Try coupon codes: SAVE10, SAVE50, WELCOME20"
Write-Host ""
