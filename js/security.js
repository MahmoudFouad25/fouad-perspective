// ملف حماية محسن - ضعه في js/security.js
// Enhanced Security Layer for Fouad Perspective

(function() {
    'use strict';
    
    // متغيرات أمان عالمية
    let securityInitialized = false;
    let devToolsDetector = null;
    let suspiciousActivityCount = 0;
    const MAX_SUSPICIOUS_ACTIVITY = 5;
    
    // تأخير تنفيذ الكود لتجنب حجب التحميل
    setTimeout(initializeSecurity, 1000);
    
    function initializeSecurity() {
        if (securityInitialized) return;
        securityInitialized = true;
        
        console.log('🛡️ تم تفعيل طبقة الحماية المحسنة');
        
        try {
            setupDevToolsDetection();
            setupKeyboardProtection();
            setupContextMenuProtection();
            setupSecureStorage();
            setupTamperDetection();
            setupPageProtection();
        } catch (error) {
            console.warn('تحذير: بعض ميزات الحماية قد لا تعمل:', error.message);
        }
    }
    
    // حماية ضد فتح Developer Tools
    function setupDevToolsDetection() {
        let devtools = {
            open: false,
            orientation: null
        };
        
        function detectDevTools() {
            try {
                const threshold = 160; // حد أقل للكشف
                
                if (window.outerHeight - window.innerHeight > threshold || 
                    window.outerWidth - window.innerWidth > threshold) {
                    
                    if (!devtools.open) {
                        devtools.open = true;
                        handleDevToolsDetected();
                    }
                } else {
                    devtools.open = false;
                    if (document.body.style.display === 'none') {
                        document.body.style.display = 'block';
                    }
                }
            } catch (error) {
                // تجاهل الأخطاء لتجنب تعطيل الصفحة
            }
        }
        
        // فحص كل ثانية واحدة
        devToolsDetector = setInterval(detectDevTools, 1000);
        
        // إيقاف الكشف عند مغادرة الصفحة
        window.addEventListener('beforeunload', () => {
            if (devToolsDetector) {
                clearInterval(devToolsDetector);
            }
        });
    }
    
    function handleDevToolsDetected() {
        console.clear();
        
        // إخفاء المحتوى مؤقتاً
        document.body.style.display = 'none';
        
        // عرض تحذير
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'تم اكتشاف أدوات المطور',
                text: 'لأغراض الأمان، سيتم إعادة تحميل الصفحة.',
                confirmButtonText: 'موافق',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                window.location.reload();
            });
        } else {
            alert('تم اكتشاف أدوات المطور. سيتم إعادة تحميل الصفحة.');
            window.location.reload();
        }
    }
    
    // منع النقر بالزر الأيمن
    function setupContextMenuProtection() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            recordSuspiciousActivity('context_menu');
            return false;
        });
    }
    
    // منع اختصارات لوحة المفاتيح
    function setupKeyboardProtection() {
        document.addEventListener('keydown', function(e) {
            // منع F12
            if (e.keyCode === 123) {
                e.preventDefault();
                recordSuspiciousActivity('f12_key');
                return false;
            }
            
            // منع Ctrl+Shift+I (Developer Tools)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
                e.preventDefault();
                recordSuspiciousActivity('dev_tools_shortcut');
                return false;
            }
            
            // منع Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
                e.preventDefault();
                recordSuspiciousActivity('console_shortcut');
                return false;
            }
            
            // منع Ctrl+U (View Source)
            if (e.ctrlKey && e.keyCode === 85) {
                e.preventDefault();
                recordSuspiciousActivity('view_source');
                return false;
            }
            
            // منع Ctrl+S (Save Page)
            if (e.ctrlKey && e.keyCode === 83) {
                e.preventDefault();
                recordSuspiciousActivity('save_page');
                return false;
            }
            
            // منع Ctrl+Shift+C (Inspect Element)
            if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                recordSuspiciousActivity('inspect_element');
                return false;
            }
        });
    }
    
    // تشفير محسن لبيانات localStorage
    function setupSecureStorage() {
        window.secureStorage = {
            setItem: function(key, value) {
                try {
                    const encrypted = btoa(JSON.stringify({
                        data: value,
                        timestamp: Date.now(),
                        checksum: this.generateChecksum(value),
                        salt: Math.random().toString(36).substr(2, 9)
                    }));
                    localStorage.setItem('sec_' + key, encrypted);
                } catch (error) {
                    console.error('خطأ في حفظ البيانات المشفرة:', error);
                }
            },
            
            getItem: function(key) {
                try {
                    const encrypted = localStorage.getItem('sec_' + key);
                    if (!encrypted) return null;
                    
                    const decrypted = JSON.parse(atob(encrypted));
                    
                    // التحقق من سلامة البيانات
                    if (this.generateChecksum(decrypted.data) !== decrypted.checksum) {
                        this.removeItem(key);
                        recordSuspiciousActivity('data_tampering');
                        return null;
                    }
                    
                    // التحقق من انتهاء صلاحية البيانات (24 ساعة)
                    if (Date.now() - decrypted.timestamp > 24 * 60 * 60 * 1000) {
                        this.removeItem(key);
                        return null;
                    }
                    
                    return decrypted.data;
                } catch (error) {
                    console.error('خطأ في قراءة البيانات المشفرة:', error);
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
    }
    
    // مراقبة محاولات التلاعب
    function setupTamperDetection() {
        // مراقبة التلاعب بـ localStorage
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        const originalRemoveItem = localStorage.removeItem;
        
        localStorage.setItem = function(key, value) {
            if (key.includes('userId') || key.includes('deviceId') || key.includes('isLoggedIn')) {
                recordSuspiciousActivity('localStorage_tampering');
            }
            return originalSetItem.apply(this, arguments);
        };
        
        // حماية ضد تنفيذ كود خارجي
        const originalEval = window.eval;
        window.eval = function() {
            recordSuspiciousActivity('eval_usage');
            throw new Error('eval() is disabled for security reasons');
        };
        
        // حماية ضد Function constructor
        const originalFunction = window.Function;
        window.Function = function() {
            recordSuspiciousActivity('function_constructor');
            throw new Error('Function constructor is disabled for security reasons');
        };
        
        // مراقبة تغييرات DOM المشبوهة
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // التحقق من script tags مشبوهة
                            if (node.tagName === 'SCRIPT' && 
                                !node.src.includes('firebase') && 
                                !node.src.includes('cdnjs') &&
                                !node.src.includes('jsdelivr') &&
                                !node.src.includes('gstatic')) {
                                console.warn('تم اكتشاف script مشبوه:', node);
                                node.remove();
                                recordSuspiciousActivity('malicious_script');
                            }
                        }
                    });
                }
            });
        });
        
        // بدء مراقبة DOM
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // حماية إضافية للصفحة
    function setupPageProtection() {
        // منع السحب والإفلات
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // منع التحديد للنصوص الحساسة
        document.addEventListener('selectstart', function(e) {
            if (e.target.classList.contains('sensitive-content') || 
                e.target.closest('.sensitive-content')) {
                e.preventDefault();
                return false;
            }
        });
        
        // منع الطباعة
        window.addEventListener('beforeprint', function(e) {
            recordSuspiciousActivity('print_attempt');
            e.preventDefault();
            return false;
        });
        
        // مراقبة focus/blur للكشف عن أدوات التطوير
        let windowFocused = true;
        window.addEventListener('focus', () => windowFocused = true);
        window.addEventListener('blur', () => windowFocused = false);
        
        // فحص دوري للتأكد من أن النافذة ما زالت نشطة
        setInterval(() => {
            if (!windowFocused && document.visibilityState === 'visible') {
                // قد يكون Developer Tools مفتوح
                recordSuspiciousActivity('possible_devtools');
            }
        }, 2000);
    }
    
    // تسجيل النشاط المشبوه
    function recordSuspiciousActivity(type) {
        suspiciousActivityCount++;
        console.warn(`⚠️ نشاط مشبوه: ${type} (${suspiciousActivityCount}/${MAX_SUSPICIOUS_ACTIVITY})`);
        
        if (suspiciousActivityCount >= MAX_SUSPICIOUS_ACTIVITY) {
            handleMaxSuspiciousActivity();
        }
        
        // إرسال تقرير للخادم (اختياري)
        try {
            if (typeof window.reportSuspiciousActivity === 'function') {
                window.reportSuspiciousActivity(type);
            }
        } catch (error) {
            // تجاهل أخطاء الإرسال
        }
    }
    
    // معالجة الوصول للحد الأقصى من النشاط المشبوه
    function handleMaxSuspiciousActivity() {
        console.warn('🚨 تم تجاوز الحد الأقصى للنشاط المشبوه');
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'تم اكتشاف نشاط مشبوه',
                text: 'تم تسجيل عدة محاولات مشبوهة. سيتم تسجيل خروجك لأغراض الأمان.',
                confirmButtonText: 'موافق',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                // تنظيف البيانات وإعادة التوجيه
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = './login.html';
            });
        } else {
            alert('تم اكتشاف نشاط مشبوه. سيتم تسجيل خروجك.');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = './login.html';
        }
    }
    
    // حماية خاصة للإنتاج
    if (window.location.hostname === 'mahmoudfouad25.github.io') {
        // تشويش console.log للمعلومات الحساسة
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        console.log = function(...args) {
            const safeArgs = args.map(arg => {
                if (typeof arg === 'string') {
                    return arg.replace(/AIzaSy[A-Za-z0-9_-]+/g, '[API_KEY_HIDDEN]')
                            .replace(/firebase.*\.com/g, '[FIREBASE_URL_HIDDEN]');
                }
                return arg;
            });
            return originalConsoleLog.apply(console, safeArgs);
        };
        
        // السماح بلصق كلمة المرور ولكن منع نسخها
        document.addEventListener('copy', function(e) {
            if (e.target.type === 'password') {
                e.preventDefault();
                recordSuspiciousActivity('copy_password_attempt');
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'غير مسموح',
                        text: 'لا يمكن نسخ كلمة المرور لأغراض الأمان',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        });
        
        // السماح بلصق كلمة المرور (من مدير كلمات المرور)
        document.addEventListener('paste', function(e) {
            // السماح بلصق كلمة المرور
            if (e.target.type === 'password') {
                console.log('✅ تم السماح بلصق كلمة المرور');
                return; // اسمح بالعملية
            }
            
            // منع اللصق في المحتوى الحساس الآخر
            if (e.target.classList.contains('sensitive-input') ||
                e.target.closest('.sensitive-content')) {
                e.preventDefault();
                recordSuspiciousActivity('paste_in_sensitive_field');
            }
        });
        
        // منع السحب من الحقول الحساسة
        document.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('sensitive-content') ||
                e.target.closest('.sensitive-content')) {
                e.preventDefault();
                recordSuspiciousActivity('drag_sensitive_content');
            }
        });
        
        // إضافة watermark غير مرئي للصفحة
        setTimeout(() => {
            const watermark = document.createElement('div');
            watermark.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                opacity: 0.02;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><text x="50%" y="50%" text-anchor="middle" fill="black" font-size="12">Fouad Academy Protected ${new Date().toISOString()}</text></svg>') repeat;
            `;
            document.body.appendChild(watermark);
        }, 2000);
        
        // حماية ضد screenshot tools (محدود في المتصفحات)
        document.addEventListener('keydown', function(e) {
            // منع Print Screen
            if (e.keyCode === 44) {
                e.preventDefault();
                recordSuspiciousActivity('print_screen');
            }
        });
    }
    
    // تصدير وظائف مفيدة
    window.SecurityLayer = {
        recordSuspiciousActivity: recordSuspiciousActivity,
        getSuspiciousActivityCount: () => suspiciousActivityCount,
        resetSuspiciousActivity: () => suspiciousActivityCount = 0,
        isDevToolsOpen: () => devtools?.open || false
    };
    
    console.log('🛡️ Enhanced security layer activated');
    console.log('🔒 Protection enabled for production environment');
    
})();
