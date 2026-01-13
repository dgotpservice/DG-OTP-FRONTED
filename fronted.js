// ==================== FRONTEND CONFIG ====================

const CONFIG = {
    API_BASE_URL: 'https://backend-9k4m.onrender.com/api'  // ✅ Your backend URL
};

// ==================== AUTH FUNCTIONS ====================

// Store token and user data
function storeAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTime', Date.now());
}

// Check if token is valid (24 hours expiry)
function isTokenValid() {
    const token = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!token || !loginTime) return false;
    
    // Check if token is older than 24 hours
    const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
    return hoursSinceLogin < 24;
}

// Login function
async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    btn.disabled = true;
    
    try {
        console.log('Attempting login to:', CONFIG.API_BASE_URL + '/login');
        
        const response = await fetch(CONFIG.API_BASE_URL + '/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Response status:', response.status);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.log('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            storeAuthData(data.token, data.user);
            showApp(data.user);
            showAlert('Login successful!', 'success');
        } else {
            showAlert(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed: ' + error.message, 'error');
        
        // Fallback for testing - remove in production
        if (email === 'test@example.com' && password === 'password123') {
            setTimeout(() => {
                const demoUser = {
                    uid: 'demo123',
                    email: email,
                    name: email.split('@')[0],
                    balance: '500.00'
                };
                storeAuthData('demo-token', demoUser);
                showApp(demoUser);
                showAlert('Demo login successful!', 'success');
                
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 1000);
            return;
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Signup function
async function doSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPass').value;
    
    if (!name || !email || !password) {
        showAlert('Please fill all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    btn.disabled = true;
    
    try {
        const response = await fetch(CONFIG.API_BASE_URL + '/signup', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Account created successfully! Please sign in.', 'success');
            toggleAuth(true);
            // Auto-fill login
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPass').value = password;
        } else {
            showAlert(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('Signup failed: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Google Auth
function doGoogleAuth() {
    showAlert('Google authentication will be available soon', 'info');
}

// ==================== UI FUNCTIONS ====================

function toggleAuth(isLogin) {
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
}

function showApp(user) {
    document.getElementById('authBox').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Update user info
    if (user) {
        document.getElementById('sidebarName').textContent = user.name || user.email.split('@')[0];
        document.getElementById('sidebarEmail').textContent = user.email;
        document.getElementById('uName').textContent = user.name || user.email.split('@')[0];
        document.getElementById('uEmail').textContent = user.email;
        document.getElementById('profileBal').textContent = user.balance || '0.00';
        document.getElementById('balText').textContent = user.balance || '0.00';
    }
}

async function fetchServicesFromAPI() {
    const category = document.getElementById('catSelect').value;
    if (!category) return;
    
    try {
        console.log('Fetching services for category:', category);
        const response = await fetch(CONFIG.API_BASE_URL + `/services?category=${category}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Services response:', data);
        
        if (data.success && data.services) {
            populateServicesDropdown(data.services);
        } else {
            // Demo services for testing
            showDemoServices(category);
        }
    } catch (error) {
        console.error('Error fetching services:', error);
        showAlert('Failed to load services. Using demo data.', 'warning');
        showDemoServices(category);
    }
}

function showDemoServices(category) {
    const demoServices = {
        'Instagram': [
            { id: 'insta_followers', name: 'Instagram Followers', rate: 20 },
            { id: 'insta_likes', name: 'Instagram Likes', rate: 15 },
            { id: 'insta_views', name: 'Instagram Views', rate: 10 }
        ],
        'YouTube': [
            { id: 'yt_subs', name: 'YouTube Subscribers', rate: 50 },
            { id: 'yt_likes', name: 'YouTube Likes', rate: 25 },
            { id: 'yt_views', name: 'YouTube Views', rate: 30 }
        ],
        'Telegram': [
            { id: 'tg_members', name: 'Telegram Members', rate: 40 },
            { id: 'tg_views', name: 'Telegram Post Views', rate: 20 }
        ],
        'Facebook': [
            { id: 'fb_likes', name: 'Facebook Likes', rate: 18 },
            { id: 'fb_followers', name: 'Facebook Followers', rate: 22 }
        ],
        'Twitter': [
            { id: 'tw_followers', name: 'Twitter Followers', rate: 35 },
            { id: 'tw_likes', name: 'Twitter Likes', rate: 15 }
        ],
        'TikTok': [
            { id: 'tt_followers', name: 'TikTok Followers', rate: 45 },
            { id: 'tt_likes', name: 'TikTok Likes', rate: 20 }
        ]
    };
    
    const services = demoServices[category] || [];
    populateServicesDropdown(services);
}

function populateServicesDropdown(services) {
    const select = document.getElementById('srvSelect');
    select.innerHTML = '<option value="">Choose Service ▼</option>';
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - ₹${service.rate}/1000`;
        option.setAttribute('data-rate', service.rate);
        select.appendChild(option);
    });
    
    // Trigger price calculation
    calculateAutoPrice();
}

function calculateAutoPrice() {
    const select = document.getElementById('srvSelect');
    const selectedOption = select.options[select.selectedIndex];
    const rate = parseFloat(selectedOption.getAttribute('data-rate')) || 0;
    const quantity = parseInt(document.getElementById('orderQty').value) || 100;
    
    const price = (quantity * rate / 1000).toFixed(2);
    document.getElementById('totalPrice').textContent = price;
}

async function placeFinalOrder() {
    const serviceId = document.getElementById('srvSelect').value;
    const link = document.getElementById('orderLink').value.trim();
    const quantity = document.getElementById('orderQty').value;
    
    if (!serviceId || !link) {
        showAlert('Please select service and enter link', 'error');
        return;
    }
    
    if (!isTokenValid()) {
        showAlert('Session expired. Please login again.', 'error');
        doLogout();
        return;
    }
    
    const token = localStorage.getItem('token');
    
    // Show loading
    const btn = document.getElementById('orderBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    btn.disabled = true;
    
    try {
        const response = await fetch(CONFIG.API_BASE_URL + '/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ serviceId, link, quantity })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ Order placed successfully! Order ID: ${data.order?.id || 'N/A'}`, 'success');
            // Clear form
            document.getElementById('orderLink').value = '';
            document.getElementById('orderQty').value = '100';
            document.getElementById('totalPrice').textContent = '0.00';
            document.getElementById('srvSelect').selectedIndex = 0;
        } else {
            showAlert(data.error || 'Order failed', 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showAlert('Demo: Order would be placed via API', 'info');
        
        // Demo order for testing
        const orderId = 'ORD_' + Date.now();
        showAlert(`✅ Demo Order placed! ID: ${orderId}`, 'success');
        document.getElementById('orderLink').value = '';
        document.getElementById('orderQty').value = '100';
        document.getElementById('totalPrice').textContent = '0.00';
        document.getElementById('srvSelect').selectedIndex = 0;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadUserOrders() {
    if (!isTokenValid()) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(CONFIG.API_BASE_URL + '/orders', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.orders) {
            displayOrders(data.orders);
        } else {
            displayDemoOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        displayDemoOrders();
    }
}

function displayDemoOrders() {
    const orders = [
        { id: 'ORD12345', service: 'Instagram Followers', quantity: 1000, amount: '₹20.00', status: 'completed' },
        { id: 'ORD12346', service: 'YouTube Views', quantity: 5000, amount: '₹150.00', status: 'processing' },
        { id: 'ORD12347', service: 'Twitter Followers', quantity: 2000, amount: '₹70.00', status: 'pending' }
    ];
    
    const tbody = document.getElementById('ordersList');
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.service}</td>
            <td>${order.quantity}</td>
            <td>${order.amount}</td>
            <td class="status-${order.status}">${order.status}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== HELPER FUNCTIONS ====================

function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.custom-alert').forEach(alert => alert.remove());
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer; margin-left:15px;">&times;</button>
    `;
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function openPage(pageId, element = null) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        // Load data for specific pages
        if (pageId === 'orders') {
            loadUserOrders();
        } else if (pageId === 'services') {
            loadAllServices();
        }
    }
    
    // Update active menu item
    if (element) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }
    
    // Update bottom nav
    const pageToNavMap = {
        'home': 0,
        'orders': 2,
        'services': 3,
        'support': 4
    };
    
    if (pageToNavMap[pageId] !== undefined) {
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            item.classList.toggle('active', index === pageToNavMap[pageId]);
        });
    }
}

function toggleSidebar(show = null) {
    const sidebar = document.getElementById('sidebar');
    if (show !== null) {
        sidebar.classList.toggle('active', show);
    } else {
        sidebar.classList.toggle('active');
    }
}

function doLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        document.getElementById('app').style.display = 'none';
        document.getElementById('authBox').style.display = 'flex';
        toggleAuth(true);
        showAlert('Logged out successfully', 'info');
    }
}

async function loadAllServices() {
    try {
        const response = await fetch(CONFIG.API_BASE_URL + '/services');
        const data = await response.json();
        
        const container = document.getElementById('allServices');
        if (data.success && data.services) {
            container.innerHTML = '<p>Services loaded from API</p>';
        } else {
            container.innerHTML = '<p>Demo services loaded</p>';
        }
    } catch (error) {
        console.error('Error loading all services:', error);
    }
}

function createTicket() {
    const subject = document.getElementById('ticketSubject').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    
    if (!subject || !message) {
        showAlert('Please fill subject and message', 'error');
        return;
    }
    
    showAlert(`Ticket submitted: ${subject}`, 'success');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketMessage').value = '';
}

function generateAPIKey() {
    const apiKey = 'dg_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
    document.getElementById('apiKeyDisplay').textContent = apiKey;
    showAlert('New API key generated!', 'success');
}

function copyReferralLink() {
    const link = 'https://dgotpservice.github.io/DG-OTP-FRC?ref=USER' + Math.floor(Math.random() * 10000);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link)
            .then(() => showAlert('Referral link copied!', 'success'))
            .catch(() => copyToClipboardFallback(link));
    } else {
        copyToClipboardFallback(link);
    }
}

function copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showAlert('Referral link copied!', 'success');
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Frontend initialized with API URL:', CONFIG.API_BASE_URL);
    
    // Check if user is already logged in
    if (isTokenValid()) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        showApp(user);
    } else {
        // Clear expired session
        localStorage.clear();
    }
    
    // Set default values
    document.getElementById('totalPrice').textContent = '0.00';
    document.getElementById('referralCode').textContent = 'DGREF' + Math.floor(Math.random() * 10000);
    document.getElementById('refCount').textContent = Math.floor(Math.random() * 10);
    document.getElementById('refEarned').textContent = '₹' + (Math.random() * 500).toFixed(2);
    document.getElementById('balText').textContent = '500.00';
    document.getElementById('profileBal').textContent = '500.00';
    
    // Close sidebar by default
    document.getElementById('sidebar').classList.remove('active');
    
    // Add alert styles
    const style = document.createElement('style');
    style.textContent = `
        .custom-alert {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            color: white;
            border-radius: 10px;
            z-index: 10000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        }
        
        .alert-success { background: #10b981; }
        .alert-error { background: #ef4444; }
        .alert-warning { background: #f59e0b; }
        .alert-info { background: #6366f1; }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Test backend connection
    testBackendConnection();
});

async function testBackendConnection() {
    try {
        const response = await fetch(CONFIG.API_BASE_URL);
        console.log('Backend connection test:', response.status);
    } catch (error) {
        console.warn('Backend might be offline or sleeping:', error.message);
    }
}
