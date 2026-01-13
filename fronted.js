// ==================== FRONTEND API FUNCTIONS ====================

const API_BASE_URL = 'https://your-backend-domain.com/api'; // Replace with your backend URL

// 1. Login Function
async function doLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    }
}

// 2. Fetch Services from API
async function fetchServicesFromAPI() {
    const category = document.getElementById('catSelect').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/services?category=${category}`);
        const data = await response.json();
        
        if (data.success) {
            populateServicesDropdown(data.services);
        }
    } catch (error) {
        console.error('Error fetching services:', error);
    }
}

// 3. Place Order via API
async function placeFinalOrder() {
    const serviceId = document.getElementById('srvSelect').value;
    const link = document.getElementById('orderLink').value;
    const quantity = document.getElementById('orderQty').value;
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.uid) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/order`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                serviceId,
                link,
                quantity,
                userId: user.uid
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Order placed! Order ID: ${data.orderId}`);
            loadUserOrders();
        } else {
            alert(data.error || 'Order failed');
        }
    } catch (error) {
        alert('Order error: ' + error.message);
    }
}

// 4. Load User Orders
async function loadUserOrders() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${user.uid}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// 5. Submit Payment via API
async function submitUTR() {
    const amount = document.getElementById('amtInp').value;
    const utr = document.getElementById('utrInp').value;
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        const response = await fetch(`${API_BASE_URL}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: user.uid,
                amount,
                utr
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Payment request submitted! Admin will verify.');
        } else {
            alert(data.error || 'Payment submission failed');
        }
    } catch (error) {
        alert('Payment error: ' + error.message);
    }
}

// 6. Admin Functions
async function loadAdminData() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAdminUsers(data.users);
        }
    } catch (error) {
        console.error('Admin data error:', error);
    }
}

async function updateCommission() {
    const commission = document.getElementById('commInput').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/commission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ commission })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Commission updated!');
        }
    } catch (error) {
        alert('Commission update error: ' + error.message);
    }
}
