// ============================
// DG SOCIAL SERVICE - Main Application
// ============================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Constants
const MY_UID = "ndjVRXUrm7byZUhfAMnIBhxUA0F3";
const BACKEND_URL = "https://dg-otp-backend.onrender.com";
let globalComm = 0;

// Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        // Check if user is blocked
        db.ref('users/' + user.uid + '/status').on('value', snap => {
            if (snap.val() === 'blocked') {
                alert("Your account has been blocked!");
                auth.signOut();
                return;
            }
            if (document.getElementById('userStatus')) {
                document.getElementById('userStatus').innerText = snap.val() || 'Active';
            }
        });
        
        // Show app, hide auth
        document.getElementById('authBox').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        // Update user profile
        const displayName = user.displayName || 'User';
        const email = user.email || 'user@email.com';
        const photoURL = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=6366f1&color=fff";
        
        // Update profile elements if they exist
        const uNameEl = document.getElementById('uName');
        const uEmailEl = document.getElementById('uEmail');
        const uPfpEl = document.getElementById('uPfp');
        const sidebarNameEl = document.getElementById('sidebarName');
        const sidebarEmailEl = document.getElementById('sidebarEmail');
        const sidebarPfpEl = document.getElementById('sidebarPfp');
        
        if (uNameEl) uNameEl.innerText = displayName;
        if (uEmailEl) uEmailEl.innerText = email;
        if (uPfpEl) uPfpEl.src = photoURL;
        if (sidebarNameEl) sidebarNameEl.innerText = displayName;
        if (sidebarEmailEl) sidebarEmailEl.innerText = email;
        if (sidebarPfpEl) sidebarPfpEl.src = photoURL;
        
        // Load commission
        db.ref('settings/commission').on('value', snap => {
            globalComm = snap.val() || 0;
            if (user.uid === MY_UID) {
                const commInput = document.getElementById('commInput');
                const currentCommission = document.getElementById('currentCommission');
                if (commInput) commInput.value = globalComm;
                if (currentCommission) currentCommission.innerText = globalComm + "%";
            }
        });
        
        // Show admin button for admin
        if (user.uid === MY_UID) {
            const adminBtn = document.getElementById('adminBtn');
            if (adminBtn) adminBtn.style.display = 'flex';
            loadAdminPanel();
        }
        
        // Load balance
        db.ref('users/' + user.uid + '/balance').on('value', snap => {
            const balance = (snap.val() || 0).toFixed(2);
            const balText = document.getElementById('balText');
            const profileBal = document.getElementById('profileBal');
            if (balText) balText.innerText = balance;
            if (profileBal) profileBal.innerText = balance;
        });
        
        // Load user data for other pages
        loadOrders();
        loadRefillHistory();
        loadAllServices();
        loadTickets();
        loadAPIKey();
        loadReferralData();
        
    } else {
        // Show auth, hide app
        document.getElementById('authBox').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// Commission Update
function updateComm() {
    const commInput = document.getElementById('commInput');
    if (!commInput) return;
    
    const val = parseFloat(commInput.value);
    if (isNaN(val) || val < 0 || val > 100) {
        alert("Please enter a valid commission percentage (0-100)");
        return;
    }
    
    db.ref('settings/commission').set(val).then(() => {
        alert("Commission updated successfully to " + val + "%!");
        const currentCommission = document.getElementById('currentCommission');
        if (currentCommission) currentCommission.innerText = val + "%";
    }).catch(error => {
        alert("Error updating commission: " + error.message);
    });
}

// Fetch Services from API
async function fetchServicesFromAPI() {
    const catSelect = document.getElementById('catSelect');
    const srvSelect = document.getElementById('srvSelect');
    
    if (!catSelect || !srvSelect) return;
    
    const category = catSelect.value;
    
    if (!category) {
        srvSelect.innerHTML = '<option value="">Select a category first</option>';
        return;
    }
    
    srvSelect.innerHTML = '<option value="">Loading services...</option>';
    
    try {
        const res = await fetch(`${BACKEND_URL}/get-services?category=${encodeURIComponent(category)}`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            srvSelect.innerHTML = '<option value="">No services found</option>';
            return;
        }
        
        srvSelect.innerHTML = '<option value="">Choose Service ▼</option>';
        data.forEach(s => {
            let apiPrice = parseFloat(s.price) || 0;
            let finalPrice = apiPrice + (apiPrice * (globalComm / 100));
            srvSelect.innerHTML += `<option value="${finalPrice}" data-id="${s.id}">${s.name} - ₹${finalPrice.toFixed(2)}/1k</option>`;
        });
        
        calculateAutoPrice();
    } catch (e) {
        console.error("Error fetching services:", e);
        srvSelect.innerHTML = '<option value="">Error loading services</option>';
    }
}

// Calculate Price
function calculateAutoPrice() {
    const srvSelect = document.getElementById('srvSelect');
    const orderQty = document.getElementById('orderQty');
    const totalPrice = document.getElementById('totalPrice');
    
    if (!srvSelect || !orderQty || !totalPrice) return;
    
    const pricePerK = parseFloat(srvSelect.value) || 0;
    const quantity = parseFloat(orderQty.value) || 0;
    const calculatedPrice = (pricePerK * (quantity / 1000)).toFixed(2);
    totalPrice.innerText = calculatedPrice;
}

// Submit UTR
function submitUTR() {
    const amtInp = document.getElementById('amtInp');
    const utrInp = document.getElementById('utrInp');
    const qrDiv = document.getElementById('qrDiv');
    
    if (!amtInp || !utrInp) return;
    
    const amt = amtInp.value;
    const utr = utrInp.value;
    
    if (!amt || amt <= 0) {
        alert("Please enter a valid amount!");
        return;
    }
    
    if (!utr || utr.trim().length < 8) {
        alert("Please enter a valid UTR/Transaction ID!");
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    db.ref('paymentRequests').push({
        uid: user.uid,
        email: user.email,
        amt: parseFloat(amt),
        utr: utr.trim(),
        status: 'pending',
        timestamp: Date.now(),
        name: user.displayName || 'User'
    }).then(() => {
        alert("UTR submitted successfully! Admin will approve it soon.");
        if (qrDiv) qrDiv.style.display = 'none';
        if (amtInp) amtInp.value = '';
        if (utrInp) utrInp.value = '';
    }).catch(error => {
        alert("Error submitting UTR: " + error.message);
    });
}

// Load Admin Panel
function loadAdminPanel() {
    // Load users
    db.ref('users').on('value', snap => {
        const adminUserList = document.getElementById('adminUserList');
        if (!adminUserList) return;
        
        let html = '';
        
        snap.forEach(user => {
            const data = user.val();
            const isSelf = user.key === MY_UID;
            
            html += `
                <div class="admin-user-card">
                    <div class="user-info">
                        <h5>${data.email || 'User'}</h5>
                        <div class="user-details">
                            <span>Bal: ₹${(data.balance || 0).toFixed(2)}</span>
                            <span>Status: ${data.status || 'Active'}</span>
                        </div>
                    </div>
                    <div class="admin-actions">
                        ${isSelf ? 
                            '<span style="font-size:12px; color:var(--primary); font-weight:600;">(Admin)</span>' : 
                            `
                            <button class="btn-sm btn-primary-sm" onclick="editBal('${user.key}')">Edit Balance</button>
                            <button class="btn-sm ${data.status === 'blocked' ? 'btn-success-sm' : 'btn-warning-sm'}" onclick="toggleBlock('${user.key}', '${data.status || 'active'}')">
                                ${data.status === 'blocked' ? 'Unblock' : 'Block'}
                            </button>
                            `
                        }
                    </div>
                </div>
            `;
        });
        
        adminUserList.innerHTML = html || '<p style="text-align:center; color:var(--text-light);">No users found</p>';
    });
    
    // Load payment requests
    db.ref('paymentRequests').orderByChild('status').equalTo('pending').on('value', snap => {
        const adminPayments = document.getElementById('adminPayments');
        if (!adminPayments) return;
        
        let html = '';
        
        snap.forEach(payment => {
            const data = payment.val();
            
            html += `
                <div class="admin-user-card">
                    <div class="user-info">
                        <h5>${data.name || data.email || 'User'}</h5>
                        <div class="user-details">
                            <span>Amount: ₹${data.amt.toFixed(2)}</span>
                            <span>UTR: ${data.utr}</span>
                            <span>${new Date(data.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="admin-actions">
                        <button class="btn-sm btn-success-sm" onclick="approveUTR('${payment.key}', '${data.uid}', ${data.amt})">
                            Approve
                        </button>
                        <button class="btn-sm btn-danger-sm" onclick="rejectUTR('${payment.key}')">
                            Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        adminPayments.innerHTML = html || '<p style="text-align:center; color:var(--text-light);">No pending payment requests</p>';
    });
}

// Admin Functions
function approveUTR(key, uid, amt) {
    if (!confirm(`Approve payment of ₹${amt.toFixed(2)}?`)) return;
    
    // Update user balance
    db.ref('users/' + uid + '/balance').transaction(current => {
        return (current || 0) + parseFloat(amt);
    });
    
    // Update payment status
    db.ref('paymentRequests/' + key + '/status').set('approved');
    
    alert("Payment approved successfully!");
}

function rejectUTR(key) {
    if (!confirm("Reject this payment request?")) return;
    db.ref('paymentRequests/' + key).remove();
}

function editBal(uid) {
    if (uid === MY_UID) {
        alert("Cannot edit admin balance!");
        return;
    }
    
    const newBal = prompt("Enter new balance:");
    if (newBal !== null && !isNaN(parseFloat(newBal))) {
        db.ref('users/' + uid + '/balance').set(parseFloat(newBal));
    }
}

function toggleBlock(uid, currentStatus) {
    if (uid === MY_UID) {
        alert("Cannot block admin account!");
        return;
    }
    
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const action = newStatus === 'blocked' ? 'Block' : 'Unblock';
    
    if (confirm(`${action} this user?`)) {
        db.ref('users/' + uid + '/status').set(newStatus);
    }
}

// Load Orders
function loadOrders() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.ref('orders/' + user.uid).limitToLast(10).on('value', snap => {
        const ordersList = document.getElementById('ordersList');
        if (!ordersList) return;
        
        let html = '';
        
        if (!snap.exists()) {
            html = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-light);">No orders yet</td></tr>';
        } else {
            snap.forEach(order => {
                const data = order.val();
                const date = new Date(data.timestamp || Date.now());
                const statusClass = data.status === 'completed' ? 'status-completed' : 
                                   data.status === 'failed' ? 'status-failed' : 'status-pending';
                
                html += `
                    <tr>
                        <td>${order.key.substring(0, 8)}</td>
                        <td>${data.service || 'N/A'}</td>
                        <td>${data.quantity || 0}</td>
                        <td>₹${data.amount || '0.00'}</td>
                        <td class="${statusClass}">${data.status || 'pending'}</td>
                    </tr>
                `;
            });
        }
        
        ordersList.innerHTML = html;
    });
}

// Load Refill History
function loadRefillHistory() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.ref('refills/' + user.uid).limitToLast(10).on('value', snap => {
        const refillList = document.getElementById('refillList');
        if (!refillList) return;
        
        let html = '';
        
        if (!snap.exists()) {
            html = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-light);">No refill history</td></tr>';
        } else {
            snap.forEach(refill => {
                const data = refill.val();
                const date = new Date(data.timestamp || Date.now());
                const statusClass = data.status === 'completed' ? 'status-completed' : 
                                   data.status === 'failed' ? 'status-failed' : 'status-pending';
                
                html += `
                    <tr>
                        <td>${refill.key.substring(0, 8)}</td>
                        <td>${data.service || 'N/A'}</td>
                        <td>${date.toLocaleDateString()}</td>
                        <td class="${statusClass}">${data.status || 'pending'}</td>
                    </tr>
                `;
            });
        }
        
        refillList.innerHTML = html;
    });
}

// Load All Services
async function loadAllServices() {
    try {
        const allServices = document.getElementById('allServices');
        if (!allServices) return;
        
        const res = await fetch(`${BACKEND_URL}/get-services`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            allServices.innerHTML = '<p style="text-align: center; color: var(--text-light);">No services available</p>';
            return;
        }
        
        // Group services by category
        const categories = {};
        data.forEach(service => {
            if (!categories[service.category]) {
                categories[service.category] = [];
            }
            let apiPrice = parseFloat(service.price) || 0;
            let finalPrice = apiPrice + (apiPrice * (globalComm / 100));
            categories[service.category].push({
                name: service.name,
                price: finalPrice.toFixed(2),
                min: service.min || 100,
                max: service.max || 10000
            });
        });
        
        let html = '';
        for (const category in categories) {
            html += `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: var(--primary); margin-bottom: 15px; border-bottom: 1px solid rgba(99, 102, 241, 0.3); padding-bottom: 5px;">${category}</h3>
            `;
            
            categories[category].forEach(service => {
                html += `
                    <div style="background: rgba(255, 255, 255, 0.03); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${service.name}</div>
                            <div style="font-size: 12px; color: var(--text-light);">Min: ${service.min} | Max: ${service.max}</div>
                        </div>
                        <div style="color: var(--accent); font-weight: 700;">₹${service.price}/1k</div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        allServices.innerHTML = html;
    } catch (error) {
        console.error("Error loading services:", error);
        const allServices = document.getElementById('allServices');
        if (allServices) {
            allServices.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading services</p>';
        }
    }
}

// Create Ticket
function createTicket() {
    const ticketSubject = document.getElementById('ticketSubject');
    const ticketMessage = document.getElementById('ticketMessage');
    
    if (!ticketSubject || !ticketMessage) return;
    
    const subject = ticketSubject.value;
    const message = ticketMessage.value;
    
    if (!subject || !message) {
        alert("Please fill all fields!");
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    const ticketId = 'TICKET' + Date.now();
    db.ref('tickets/' + user.uid + '/' + ticketId).set({
        subject: subject,
        message: message,
        status: 'open',
        timestamp: Date.now(),
        email: user.email,
        name: user.displayName || 'User'
    }).then(() => {
        alert("Ticket created successfully!");
        ticketSubject.value = '';
        ticketMessage.value = '';
        loadTickets();
    }).catch(error => {
        alert("Error creating ticket: " + error.message);
    });
}

// Load Tickets
function loadTickets() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.ref('tickets/' + user.uid).limitToLast(5).on('value', snap => {
        const ticketsList = document.getElementById('ticketsList');
        if (!ticketsList) return;
        
        let html = '';
        
        if (!snap.exists()) {
            html = '<p style="text-align: center; color: var(--text-light); padding: 20px;">No tickets yet</p>';
        } else {
            snap.forEach(ticket => {
                const data = ticket.val();
                const date = new Date(data.timestamp);
                const statusClass = data.status === 'closed' ? 'status-completed' : 
                                   data.status === 'open' ? 'status-pending' : '';
                
                html += `
                    <div style="background: rgba(255, 255, 255, 0.03); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-weight: 600;">${data.subject}</div>
                            <span class="${statusClass}" style="font-size: 12px;">${data.status || 'open'}</span>
                        </div>
                        <div style="color: var(--text-light); font-size: 14px; margin-bottom: 8px;">${data.message}</div>
                        <div style="font-size: 12px; color: var(--text-light);">${date.toLocaleString()}</div>
                    </div>
                `;
            });
        }
        
        ticketsList.innerHTML = html;
    });
}

// Load API Key
function loadAPIKey() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.ref('apiKeys/' + user.uid).once('value').then(snap => {
        const apiKeyDisplay = document.getElementById('apiKeyDisplay');
        if (!apiKeyDisplay) return;
        
        if (snap.exists()) {
            apiKeyDisplay.innerText = snap.val().key || 'No API key found';
        } else {
            apiKeyDisplay.innerText = 'No API key generated yet';
        }
    });
}

// Generate API Key
function generateAPIKey() {
    const user = auth.currentUser;
    if (!user) return;
    
    const apiKey = 'DG_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    db.ref('apiKeys/' + user.uid).set({
        key: apiKey,
        created: Date.now()
    }).then(() => {
        const apiKeyDisplay = document.getElementById('apiKeyDisplay');
        if (apiKeyDisplay) apiKeyDisplay.innerText = apiKey;
        alert("New API key generated successfully!");
    }).catch(error => {
        alert("Error generating API key: " + error.message);
    });
}

// Load Referral Data
function loadReferralData() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Generate referral code from user ID
    const referralCode = 'DG' + user.uid.substring(0, 8).toUpperCase();
    const referralLink = window.location.origin + window.location.pathname + '?ref=' + referralCode;
    
    const referralCodeEl = document.getElementById('referralCode');
    if (referralCodeEl) referralCodeEl.innerText = referralLink;
    
    // Load referral stats
    db.ref('referrals/' + user.uid).once('value').then(snap => {
        const data = snap.val() || { count: 0, earned: 0 };
        const refCount = document.getElementById('refCount');
        const refEarned = document.getElementById('refEarned');
        
        if (refCount) refCount.innerText = data.count || 0;
        if (refEarned) refEarned.innerText = '₹' + (data.earned || 0).toFixed(2);
    });
}

// Copy Referral Link
function copyReferralLink() {
    const referralCode = document.getElementById('referralCode');
    if (!referralCode) return;
    
    const referralLink = referralCode.innerText;
    navigator.clipboard.writeText(referralLink).then(() => {
        alert("Referral link copied to clipboard!");
    }).catch(err => {
        alert("Failed to copy: " + err);
    });
}

// Navigation Functions
function openPage(pageId, element) {
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const pageElement = document.getElementById(pageId);
    if (pageElement) pageElement.classList.add('active');
    
    // Update sidebar items
    if (element) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
    }
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate corresponding bottom nav item
    const navItems = document.querySelectorAll('.nav-item');
    if (pageId === 'home' && navItems[0]) {
        navItems[0].classList.add('active');
    } else if (pageId === 'addfund' && navItems[1]) {
        navItems[1].classList.add('active');
    } else if (pageId === 'orders' && navItems[2]) {
        navItems[2].classList.add('active');
    } else if (pageId === 'support' && navItems[3]) {
        navItems[3].classList.add('active');
    }
    
    // Close sidebar on mobile
    toggleSidebar(false);
    
    // Refresh data for certain pages
    if (pageId === 'services') {
        loadAllServices();
    } else if (pageId === 'orders') {
        loadOrders();
    } else if (pageId === 'tickets') {
        loadTickets();
    }
}

function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    if (show !== undefined) {
        sidebar.classList.toggle('active', show);
    } else {
        sidebar.classList.toggle('active');
    }
}

// Auth Functions
function doGoogleAuth() {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(error => {
            alert("Google sign-in failed: " + error.message);
        });
}

function genQR() {
    const amtInp = document.getElementById('amtInp');
    if (!amtInp) return;
    
    const amount = amtInp.value;
    
    if (!amount || amount <= 0) {
        alert("Please enter a valid amount first!");
        return;
    }
    
    const upiId = "aqdaskhan03@fam";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${encodeURIComponent(upiId)}&am=${amount}&cu=INR&tn=DG Social Service Payment`;
    
    const qrImg = document.getElementById('qrImg');
    const qrDiv = document.getElementById('qrDiv');
    
    if (qrImg) qrImg.src = qrUrl;
    if (qrDiv) qrDiv.style.display = 'block';
    
    // Scroll to QR
    if (qrDiv) {
        qrDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

function doLogout() {
    if (confirm("Are you sure you want to logout?")) {
        auth.signOut();
    }
}

function toggleAuth(isLogin) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
    if (signupForm) signupForm.style.display = isLogin ? 'none' : 'block';
}

function doLogin() {
    const loginEmail = document.getElementById('loginEmail');
    const loginPass = document.getElementById('loginPass');
    
    if (!loginEmail || !loginPass) return;
    
    const email = loginEmail.value;
    const password = loginPass.value;
    
    if (!email || !password) {
        alert("Please enter both email and password!");
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            alert("Login failed: " + error.message);
        });
}

function doSignup() {
    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPass = document.getElementById('signupPass');
    
    if (!signupName || !signupEmail || !signupPass) return;
    
    const name = signupName.value;
    const email = signupEmail.value;
    const password = signupPass.value;
    
    if (!name || !email || !password) {
        alert("Please fill all fields!");
        return;
    }
    
    if (password.length < 6) {
        alert("Password must be at least 6 characters long!");
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(result => {
            // Update profile
            return result.user.updateProfile({
                displayName: name
            }).then(() => {
                // Create user in database
                return db.ref('users/' + result.user.uid).set({
                    email: email,
                    name: name,
                    balance: 0,
                    status: 'active',
                    createdAt: Date.now()
                });
            });
        })
        .then(() => {
            alert("Account created successfully! You are now logged in.");
        })
        .catch(error => {
            alert("Signup failed: " + error.message);
        });
}

// Place Order
async function placeFinalOrder() {
    const srvSelect = document.getElementById('srvSelect');
    const orderLink = document.getElementById('orderLink');
    const orderQty = document.getElementById('orderQty');
    const totalPrice = document.getElementById('totalPrice');
    const orderBtn = document.getElementById('orderBtn');
    
    if (!srvSelect || !orderLink || !orderQty || !totalPrice || !orderBtn) return;
    
    const serviceId = srvSelect.options[srvSelect.selectedIndex]?.getAttribute('data-id');
    const link = orderLink.value;
    const qty = orderQty.value;
    const total = parseFloat(totalPrice.innerText);
    
    // Validation
    if (!serviceId) {
        alert("Please select a service!");
        return;
    }
    
    if (!link || link.trim().length < 3) {
        alert("Please enter a valid link or username!");
        return;
    }
    
    if (!qty || qty < 10) {
        alert("Quantity must be at least 10!");
        return;
    }
    
    if (total <= 0) {
        alert("Total price must be greater than 0!");
        return;
    }
    
    // Check balance
    const user = auth.currentUser;
    if (!user) return;
    
    const balanceSnap = await db.ref('users/' + user.uid + '/balance').once('value');
    const currentBal = balanceSnap.val() || 0;
    
    if (currentBal < total) {
        alert(`Insufficient balance! You need ₹${total.toFixed(2)} but have only ₹${currentBal.toFixed(2)}`);
        return;
    }
    
    // Confirm order
    if (!confirm(`Confirm order for ₹${total.toFixed(2)}?`)) return;
    
    // Update button
    const originalText = orderBtn.innerHTML;
    orderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    orderBtn.disabled = true;
    
    try {
        // Place order with backend
        const res = await fetch(`${BACKEND_URL}/place-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                service: serviceId, 
                link: link.trim(), 
                quantity: qty 
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Deduct balance
            await db.ref('users/' + user.uid + '/balance').set(currentBal - total);
            
            // Save order to user's orders
            const orderId = 'ORDER' + Date.now();
            await db.ref('orders/' + user.uid + '/' + orderId).set({
                service: serviceId,
                link: link,
                quantity: qty,
                amount: total,
                status: 'pending',
                timestamp: Date.now()
            });
            
            // Show success
            alert(`Order placed successfully!\nOrder ID: ${data.orderId || orderId}\nAmount: ₹${total.toFixed(2)}\nRemaining Balance: ₹${(currentBal - total).toFixed(2)}`);
            
            // Reset form
            orderLink.value = '';
            totalPrice.innerText = '0.00';
            
        } else {
            alert("Order Error: " + (data.message || "Unknown error"));
        }
        
    } catch (error) {
        console.error("Order error:", error);
        alert("Failed to place order. Please try again later.");
    } finally {
        // Reset button
        orderBtn.innerHTML = originalText;
        orderBtn.disabled = false;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    // Add click outside sidebar to close
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (sidebar && menuToggle && sidebar.classList.contains('active') && 
            !sidebar.contains(event.target) && 
            !menuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    });
    
    // Close sidebar when clicking on a menu item (for mobile)
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                toggleSidebar(false);
            }
        });
    });
    
    // Check for referral parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode && !auth.currentUser) {
        localStorage.setItem('referralCode', refCode);
    }
});

// Global export for HTML onclick events
window.updateComm = updateComm;
window.fetchServicesFromAPI = fetchServicesFromAPI;
window.calculateAutoPrice = calculateAutoPrice;
window.submitUTR = submitUTR;
window.approveUTR = approveUTR;
window.rejectUTR = rejectUTR;
window.editBal = editBal;
window.toggleBlock = toggleBlock;
window.createTicket = createTicket;
window.generateAPIKey = generateAPIKey;
window.copyReferralLink = copyReferralLink;
window.openPage = openPage;
window.toggleSidebar = toggleSidebar;
window.doGoogleAuth = doGoogleAuth;
window.genQR = genQR;
window.doLogout = doLogout;
window.toggleAuth = toggleAuth;
window.doLogin = doLogin;
window.doSignup = doSignup;
window.placeFinalOrder = placeFinalOrder;
