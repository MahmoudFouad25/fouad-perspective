// ملف حماية إضافي - ضعه في js/security.js

(function() {
    'use strict';
    
    // حماية ضد فتح Developer Tools
    let devtools = {
        open: false,
        orientation: null
    };
    
    setInterval(function() {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
            if (!devtools.open) {
                devtools.open = true;
                console.clear();
                // إخفاء المحتوى الحساس
                document.body.style.display = 'none';
                alert('Developer tools detected. Page will reload for security.');
                window.location.reload();
            }
        } else {
            devtools.open = false;
            document.body.style.display = 'block';
        }
    }, 500);
    
    // منع النقر بالزر الأيمن
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // منع اختصارات لوحة المفاتيح
    document.addEventListener('keydown', function(e) {
        // منع F12
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // منع Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        
        // منع Ctrl+Shift+J
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
        
        // منع Ctrl+U
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        
        // منع Ctrl+S
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });
    
    // تشفير بسيط لبيانات localStorage الحساسة
    window.secureStorage = {
        setItem: function(key, value) {
            const encrypted = btoa(JSON.stringify({
                data: value,
                timestamp: Date.now(),
                checksum: this.generateChecksum(value)
            }));
            localStorage.setItem('sec_' + key, encrypted);
        },
        
        getItem: function(key) {
            try {
                const encrypted = localStorage.getItem('sec_' + key);
                if (!encrypted) return null;
                
                const decrypted = JSON.parse(atob(encrypted));
                
                // التحقق من سلامة البيانات
                if (this.generateChecksum(decrypted.data) !== decrypted.checksum) {
                    this.removeItem(key);
                    return null;
                }
                
                // التحقق من انتهاء صلاحية البيانات (24 ساعة)
                if (Date.now() - decrypted.timestamp > 24 * 60 * 60 * 1000) {
                    this.removeItem(key);
                    return null;
                }
                
                return decrypted.data;
            } catch (error) {
                this.removeItem(key);
                return null;
            }
        },
        
        removeItem: function(key) {
            localStorage.removeItem('sec_' + key);
        },
        
        generateChecksum: function(data) {
            let hash = 0;
            const str = JSON.stringify(data);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        }
    };
    
    // مراقبة محاولات التلاعب
    let suspiciousActivity = 0;
    
    // مراقبة التلاعب بـ localStorage
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key, value) {
        if (key.includes('userId') || key.includes('deviceId') || key.includes('isLoggedIn')) {
            suspiciousActivity++;
            if (suspiciousActivity > 3) {
                console.warn('Suspicious activity detected. Logging out...');
                window.location.href = './login.html';
                return;
            }
        }
        return originalSetItem.apply(this, arguments);
    };
    
    // حماية ضد تنفيذ كود خارجي
    const originalEval = window.eval;
    window.eval = function() {
        throw new Error('eval() is disabled for security reasons');
    };
    
    // حماية ضد Function constructor
    const originalFunction = window.Function;
    window.Function = function() {
        throw new Error('Function constructor is disabled for security reasons');
    };
    
    // مراقبة تغييرات DOM الغريبة
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        // التحقق من script tags مشبوهة
                        if (node.tagName === 'SCRIPT' && !node.src.includes('firebase') && !node.src.includes('cdnjs')) {
                            console.warn('Suspicious script detected:', node);
                            node.remove();
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // حماية إضافية للإنتاج فقط
    if (window.location.hostname === 'mahmoudfouad25.github.io') {
        // تشويش console.log للمعلومات الحساسة
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            const safeArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return arg.replace(/AIzaSy[A-Za-z0-9_-]+/g, '[API_KEY_HIDDEN]');
                }
                return arg;
            });
            return originalConsoleLog.apply(console, safeArgs);
        };
        
        // منع copy/paste في حقول حساسة
        document.addEventListener('paste', function(e) {
            if (e.target.type === 'password' || e.target.classList.contains('sensitive-input')) {
                e.preventDefault();
            }
        });
        
        // إضافة watermark غير مرئي للصفحة
        const watermark = document.createElement('div');
        watermark.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.03;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><text x="50%" y="50%" text-anchor="middle" fill="black" font-size="14">Fouad Academy Protected</text></svg>') repeat;
        `;
        document.body.appendChild(watermark);
    }
    
    console.log('🛡️ Enhanced security layer activated');
})();
