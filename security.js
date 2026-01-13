// ============================
// DG SOCIAL SERVICE - Security Layer
// ============================

(function() {
    'use strict';
    
    console.log('🔒 DG Security Layer Initialized');
    
    // 1. DOMAIN VALIDATION
    const allowedDomains = ['dgotpservice.github.io'];
    const currentDomain = window.location.hostname.toLowerCase();
    let isValidDomain = false;
    
    for (let domain of allowedDomains) {
        if (currentDomain.includes(domain)) {
            isValidDomain = true;
            break;
        }
    }
    
    if (!isValidDomain && currentDomain !== '') {
        console.warn('⚠️ Running on unauthorized domain:', currentDomain);
        // Add your production domain check here
        if (!currentDomain.includes('yourdomain.com')) {
            // Optional: Redirect to main domain
            // window.location.href = "https://dgsocialservice.com";
        }
    }
    
    // 2. MULTIPLE TABS PROTECTION
    if (sessionStorage.getItem('dg_tab_active')) {
        const tabCount = parseInt(sessionStorage.getItem('dg_tab_count') || '0');
        if (tabCount > 2) {
            alert('🚫 Multiple tabs detected! Please use only one tab.');
            if (confirm('Close this tab?')) {
                window.close();
                return;
            }
        }
        sessionStorage.setItem('dg_tab_count', (tabCount + 1).toString());
    } else {
        sessionStorage.setItem('dg_tab_active', 'true');
        sessionStorage.setItem('dg_tab_count', '1');
    }
    
    // Cleanup on tab close
    window.addEventListener('beforeunload', function() {
        if (sessionStorage.getItem('dg_tab_active')) {
            const tabs = parseInt(sessionStorage.getItem('dg_tab_count') || '1');
            const newCount = Math.max(0, tabs - 1);
            sessionStorage.setItem('dg_tab_count', newCount.toString());
            if (newCount <= 0) {
                sessionStorage.removeItem('dg_tab_active');
            }
        }
    });
    
    // 3. DEBUGGER DETECTION
    let debugCheckTime = Date.now();
    
    function detectDebugger() {
        const now = Date.now();
        const diff = now - debugCheckTime;
        
        if (diff > 100) { // Debugger detected (100ms threshold)
            console.warn('🔍 Possible debugger detected!');
            // You can take action here if needed
        }
        debugCheckTime = now;
    }
    
    // Run debugger check periodically
    setInterval(detectDebugger, 500);
    
    // 4. CODE TAMPERING CHECK
    const ORIGINAL_HASH = 'dg_secure_2024';
    
    function checkCodeIntegrity() {
        try {
            // Check for modified script tags
            const scriptTags = document.querySelectorAll('script[src*=".js"]');
            let hash = 0;
            
            scriptTags.forEach(script => {
                const src = script.src.toLowerCase();
                if (src.includes('firebase') || src.includes('app') || src.includes('security')) {
                    hash += src.length;
                }
            });
            
            const computedHash = 'dg_secure_' + (hash % 10000);
            
            // Simple check - you can make it more complex
            if (Math.abs(hash) > 100 && computedHash !== ORIGINAL_HASH) {
                console.warn('🚨 Possible code tampering detected!');
            }
        } catch (e) {
            // Silent fail
        }
    }
    
    // Check after page loads
    setTimeout(checkCodeIntegrity, 2000);
    
    // 5. RATE LIMITING FOR API CALLS
    let apiRequestCount = 0;
    const MAX_REQUESTS_PER_MINUTE = 60;
    
    // Intercept fetch calls
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        apiRequestCount++;
        
        // Block if too many requests
        if (apiRequestCount > MAX_REQUESTS_PER_MINUTE) {
            console.error('⏰ Rate limit exceeded!');
            return Promise.reject(new Error('Too many requests. Please wait.'));
        }
        
        // Reset counter every minute
        if (apiRequestCount === 1) {
            setTimeout(() => {
                apiRequestCount = 0;
            }, 60000);
        }
        
        return originalFetch.apply(this, args);
    };
    
    // 6. LOCALSTORAGE PROTECTION
    try {
        const lsTestKey = 'dg_secure_test';
        localStorage.setItem(lsTestKey, 'test');
        localStorage.removeItem(lsTestKey);
    } catch (e) {
        console.error('LocalStorage access denied!');
    }
    
    // 7. PREVENT RIGHT CLICK (Optional)
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault();
    });
    
    // 8. PREVENT KEYBOARD SHORTCUTS (Optional)
    document.addEventListener('keydown', function(e) {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
            e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
            (e.ctrlKey && e.keyCode === 85) // Ctrl+U
        ) {
            e.preventDefault();
            return false;
        }
    });
    
    console.log('✅ Security checks completed');
})();
