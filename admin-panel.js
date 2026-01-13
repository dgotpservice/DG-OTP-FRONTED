// ============================
// ADMIN PANEL FUNCTIONS
// ============================

// Check if user is admin and show admin panel
function checkAdminStatus() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const userRef = firebase.database().ref('users/' + user.uid);
    userRef.once('value').then(snapshot => {
        const userData = snapshot.val();
        if (userData && userData.admin === true) {
            document.getElementById('adminBtn').style.display = 'flex';
            loadAdminData();
        } else {
            document.getElementById('adminBtn').style.display = 'none';
        }
    });
}

// Load admin data (users, payments, commission)
function loadAdminData() {
    loadAllUsers();
    loadPaymentRequests();
    loadCurrentCommission();
}

// Load all users for admin
function loadAllUsers() {
    const userListDiv = document.getElementById('adminUserList');
    userListDiv.innerHTML = '<p style="color: var(--text-light); text-align: center;">Loading users...</p>';
    
    const usersRef = firebase.database().ref('users');
    usersRef.once('value').then(snapshot => {
        const users = snapshot.val();
        userListDiv.innerHTML = '';
        
        if (!users) {
            userListDiv.innerHTML = '<p style="color: var(--text-light); text-align: center;">No users found</p>';
            return;
        }
        
        Object.keys(users).forEach(uid => {
            const user = users[uid];
            const userCard = document.createElement('div');
            userCard.className = 'admin-user-card';
            
            userCard.innerHTML = `
                <div class="user-info">
                    <h5>${user.name || 'No Name'}</h5>
                    <div class="user-details">
                        <span>Email: ${user.email || 'No Email'}</span>
                        <span>Balance: ₹${user.balance || '0.00'}</span>
                        <span>Status: ${user.status || 'Active'}</span>
                        <span>Joined: ${new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="admin-actions">
                    ${user.admin ? 
                        '<span style="color: var(--warning); font-weight: 600;">Admin</span>' : 
                        `<button class="btn-sm btn-primary-sm" onclick="makeAdmin('${uid}')">Make Admin</button>`
                    }
                    <button class="btn-sm btn-warning-sm" onclick="editUser('${uid}')">Edit</button>
                    ${user.status === 'banned' ? 
                        `<button class="btn-sm btn-success-sm" onclick="unbanUser('${uid}')">Unban</button>` :
                        `<button class="btn-sm btn-danger-sm" onclick="banUser('${uid}')">Ban</button>`
                    }
                </div>
            `;
            
            userListDiv.appendChild(userCard);
        });
    });
}

// Load payment requests for admin approval
function loadPaymentRequests() {
    const paymentsDiv = document.getElementById('adminPayments');
    paymentsDiv.innerHTML = '<p style="color: var(--text-light); text-align: center;">Loading payment requests...</p>';
    
    const paymentsRef = firebase.database().ref('paymentRequests');
    paymentsRef.orderByChild('status').equalTo('pending').once('value').then(snapshot => {
        const payments = snapshot.val();
        paymentsDiv.innerHTML = '';
        
        if (!payments) {
            paymentsDiv.innerHTML = '<p style="color: var(--text-light); text-align: center;">No pending payments</p>';
            return;
        }
        
        Object.keys(payments).forEach(paymentId => {
            const payment = payments[paymentId];
            const paymentCard = document.createElement('div');
            paymentCard.className = 'admin-user-card';
            
            paymentCard.innerHTML = `
                <div class="user-info">
                    <h5>Payment Request #${paymentId.substring(0, 8)}</h5>
                    <div class="user-details">
                        <span>User: ${payment.userName || 'Unknown'}</span>
                        <span>Amount: ₹${payment.amount}</span>
                        <span>UTR: ${payment.utr}</span>
                        <span>Date: ${new Date(payment.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="btn-sm btn-success-sm" onclick="approvePayment('${paymentId}', '${payment.userId}', ${payment.amount})">Approve</button>
                    <button class="btn-sm btn-danger-sm" onclick="rejectPayment('${paymentId}')">Reject</button>
                </div>
            `;
            
            paymentsDiv.appendChild(paymentCard);
        });
    });
}

// Load current commission rate
function loadCurrentCommission() {
    const commissionRef = firebase.database().ref('settings/commission');
    commissionRef.once('value').then(snapshot => {
        const commission = snapshot.val() || 0;
        document.getElementById('currentCommission').textContent = commission + '%';
    });
}

// Update commission rate
function updateComm() {
    const newComm = parseFloat(document.getElementById('commInput').value);
    
    if (isNaN(newComm) || newComm < 0 || newComm > 100) {
        alert('Please enter a valid commission between 0 and 100%');
        return;
    }
    
    const commissionRef = firebase.database().ref('settings/commission');
    commissionRef.set(newComm)
        .then(() => {
            alert('Commission updated successfully!');
            document.getElementById('currentCommission').textContent = newComm + '%';
            document.getElementById('commInput').value = '';
        })
        .catch(error => {
            alert('Error updating commission: ' + error.message);
        });
}

// Make user admin
function makeAdmin(uid) {
    if (!confirm('Are you sure you want to make this user an admin?')) return;
    
    const userRef = firebase.database().ref('users/' + uid + '/admin');
    userRef.set(true)
        .then(() => {
            alert('User promoted to admin successfully!');
            loadAllUsers();
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
}

// Ban user
function banUser(uid) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    const userRef = firebase.database().ref('users/' + uid);
    userRef.update({ status: 'banned' })
        .then(() => {
            alert('User banned successfully!');
            loadAllUsers();
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
}

// Unban user
function unbanUser(uid) {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    const userRef = firebase.database().ref('users/' + uid);
    userRef.update({ status: 'active' })
        .then(() => {
            alert('User unbanned successfully!');
            loadAllUsers();
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
}

// Approve payment
function approvePayment(paymentId, userId, amount) {
    if (!confirm('Approve this payment request?')) return;
    
    const db = firebase.database();
    const paymentRef = db.ref('paymentRequests/' + paymentId);
    const userRef = db.ref('users/' + userId + '/balance');
    
    // Get current balance
    userRef.once('value').then(snapshot => {
        const currentBalance = parseFloat(snapshot.val()) || 0;
        const newBalance = currentBalance + parseFloat(amount);
        
        // Update payment status
        paymentRef.update({ status: 'approved', approvedAt: Date.now() })
            .then(() => {
                // Update user balance
                return userRef.set(newBalance);
            })
            .then(() => {
                alert('Payment approved and balance updated!');
                loadPaymentRequests();
                
                // If current user is the one who got payment, update display
                const currentUser = firebase.auth().currentUser;
                if (currentUser && currentUser.uid === userId) {
                    document.getElementById('balText').textContent = newBalance.toFixed(2);
                    document.getElementById('profileBal').textContent = newBalance.toFixed(2);
                }
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
    });
}

// Reject payment
function rejectPayment(paymentId) {
    if (!confirm('Reject this payment request?')) return;
    
    const paymentRef = firebase.database().ref('paymentRequests/' + paymentId);
    paymentRef.update({ status: 'rejected', rejectedAt: Date.now() })
        .then(() => {
            alert('Payment rejected!');
            loadPaymentRequests();
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
}

// Edit user (placeholder - you can expand this)
function editUser(uid) {
    alert('Edit user functionality coming soon!');
}
