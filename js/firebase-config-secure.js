// firebase-config-secure.js
// نظام آمن لحماية بيانات Firebase

(function() {
    'use strict';
    
    // تشفير البيانات الحساسة - يجب تغيير هذا المفتاح
    const ENCRYPTION_KEY = 'FouadPerspective2024SecureKey!@#';
    
    // البيانات المشفرة (يجب تشفيرها من الخادم)
    const encryptedConfig = {
        // هذه البيانات يجب أن تكون مشفرة من الخادم
        // وليست مكتوبة بشكل مباشر
        apiKey: encrypt("AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w"),
        authDomain: encrypt("fouad-perspective.firebaseapp.com"),
        projectId: encrypt("fouad-perspective"),
        storageBucket: encrypt("fouad-perspective.firebasestorage.app"),
        messagingSenderId: encrypt("1068763865336"),
        appId: encrypt("1:1068763865336:web:b791abcd22d536aedd5b0d"),
        measurementId: encrypt("G-RY1FYVB3Q9")
    };
    
    // دالة تشفير بسيطة (يفضل استخدام مكتبة تشفير قوية)
    function encrypt(text) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result); // Base64 encoding
    }
    
    // دالة فك التشفير
    function decrypt(encrypted) {
        try {
            const decoded = atob(encrypted);
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (e) {
            console.error('Decryption failed');
            return null;
        }
    }
    
    // فك تشفير الإعدادات
    function getDecryptedConfig() {
        const config = {};
        for (const key in encryptedConfig) {
            config[key] = decrypt(encryptedConfig[key]);
        }
        return config;
    }
    
    // تهيئة Firebase بطريقة آمنة
    function initializeFirebase() {
        try {
            // التحقق من البيئة
            if (window.location.hostname !== 'mahmoudfouad25.github.io' && 
                window.location.hostname !== 'localhost') {
                console.error('Unauthorized domain');
                return null;
            }
            
            // فك التشفير والتهيئة
            const config = getDecryptedConfig();
            
            if (!firebase.apps.length) {
                firebase.initializeApp(config);
            }
            
            // مسح البيانات من الذاكرة
            for (const key in config) {
                config[key] = null;
            }
            
            return {
                auth: firebase.auth(),
                db: firebase.firestore()
            };
            
        } catch (error) {
            console.error('Firebase initialization failed');
            return null;
        }
    }
    
    // حماية ضد التلاعب
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // إخفاء المعلومات الحساسة من Console
    function sanitizeOutput(args) {
        return args.map(arg => {
            if (typeof arg === 'string') {
                // إخفاء API Keys
                arg = arg.replace(/AIza[0-9A-Za-z\-_]+/g, '[API_KEY_HIDDEN]');
                // إخفاء معرفات المشروع
                arg = arg.replace(/fouad-perspective/g, '[PROJECT_HIDDEN]');
                // إخفاء URLs
                arg = arg.replace(/https:\/\/[^\s]+firebaseapp\.com/g, '[URL_HIDDEN]');
            }
            return arg;
        });
    }
    
    console.log = function(...args) {
        originalConsoleLog.apply(console, sanitizeOutput(args));
    };
    
    console.error = function(...args) {
        originalConsoleError.apply(console, sanitizeOutput(args));
    };
    
    console.warn = function(...args) {
        originalConsoleWarn.apply(console, sanitizeOutput(args));
    };
    
    // نظام حماية الجلسة المحسن
    class SecureSessionManager {
        constructor() {
            this.sessionKey = this.generateSessionKey();
            this.deviceFingerprint = this.generateDeviceFingerprint();
            this.activityMonitor = null;
            this.sessionTimeout = 30 * 60 * 1000; // 30 دقيقة
            this.lastActivity = Date.now();
        }
        
        generateSessionKey() {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
        
        generateDeviceFingerprint() {
            const fingerprint = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency,
                screenResolution: `${screen.width}x${screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                canvas: this.getCanvasFingerprint()
            };
            
            // توليد hash للبصمة
            let hash = 0;
            const str = JSON.stringify(fingerprint);
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return 'device_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
        }
        
        getCanvasFingerprint() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('Fouad Academy 🔒', 2, 2);
                return canvas.toDataURL().substring(0, 100);
            } catch (e) {
                return 'canvas_not_available';
            }
        }
        
        async checkSession(userId, db) {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (!userDoc.exists) {
                    return { valid: false, reason: 'user_not_found' };
                }
                
                const userData = userDoc.data();
                const sessions = userData.sessions || {};
                
                // التحقق من الجلسات النشطة
                const activeSessions = Object.entries(sessions).filter(([key, session]) => {
                    const lastActivity = session.lastActivity?.toDate?.() || new Date(session.lastActivity);
                    const timeDiff = Date.now() - lastActivity.getTime();
                    return timeDiff < this.sessionTimeout && session.active;
                });
                
                // إذا كان هناك جلسة نشطة على جهاز آخر
                if (activeSessions.length > 0) {
                    const currentSession = activeSessions.find(([key]) => key === this.deviceFingerprint);
                    
                    if (!currentSession) {
                        // جلسة نشطة على جهاز آخر
                        return {
                            valid: false,
                            reason: 'active_session',
                            activeDevice: activeSessions[0][1].deviceInfo
                        };
                    }
                }
                
                // تسجيل الجلسة الحالية
                await this.registerSession(userId, db);
                
                return { valid: true };
                
            } catch (error) {
                console.error('Session check failed');
                return { valid: false, reason: 'error' };
            }
        }
        
        async registerSession(userId, db) {
            const sessionData = {
                sessionKey: this.sessionKey,
                deviceFingerprint: this.deviceFingerprint,
                active: true,
                startTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                deviceInfo: {
                    userAgent: navigator.userAgent.substring(0, 150),
                    platform: navigator.platform,
                    language: navigator.language,
                    screenResolution: `${screen.width}x${screen.height}`
                }
            };
            
            // حفظ الجلسة
            await db.collection('users').doc(userId).update({
                [`sessions.${this.deviceFingerprint}`]: sessionData
            });
            
            // بدء مراقبة النشاط
            this.startActivityMonitoring(userId, db);
        }
        
        startActivityMonitoring(userId, db) {
            // مراقبة النشاط
            this.activityMonitor = setInterval(async () => {
                try {
                    // التحقق من timeout
                    if (Date.now() - this.lastActivity > this.sessionTimeout) {
                        await this.endSession(userId, db);
                        window.location.href = './login.html';
                        return;
                    }
                    
                    // تحديث النشاط
                    await db.collection('users').doc(userId).update({
                        [`sessions.${this.deviceFingerprint}.lastActivity`]: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // التحقق من الإخراج القسري
                    const userDoc = await db.collection('users').doc(userId).get();
                    const userData = userDoc.data();
                    
                    if (userData.sessions?.[this.deviceFingerprint]?.forceLogout) {
                        await this.handleForceLogout();
                    }
                    
                } catch (error) {
                    console.error('Activity monitoring error');
                }
            }, 30000); // كل 30 ثانية
            
            // مراقبة نشاط المستخدم
            ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, () => {
                    this.lastActivity = Date.now();
                });
            });
            
            // تنظيف عند الخروج
            window.addEventListener('beforeunload', () => {
                this.endSession(userId, db);
            });
        }
        
        async endSession(userId, db) {
            if (this.activityMonitor) {
                clearInterval(this.activityMonitor);
            }
            
            try {
                await db.collection('users').doc(userId).update({
                    [`sessions.${this.deviceFingerprint}.active`]: false,
                    [`sessions.${this.deviceFingerprint}.endTime`]: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Failed to end session');
            }
        }
        
        async handleForceLogout() {
            if (typeof Swal !== 'undefined') {
                await Swal.fire({
                    icon: 'warning',
                    title: 'تم تسجيل الدخول من جهاز آخر',
                    text: 'سيتم تسجيل خروجك الآن',
                    confirmButtonText: 'حسناً',
                    allowOutsideClick: false
                });
            }
            
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = './login.html';
        }
    }
    
    // حماية ضد أدوات المطور
    class DevToolsProtection {
        constructor() {
            this.threshold = 160;
            this.devtoolsOpen = false;
            this.orientation = null;
            this.init();
        }
        
        init() {
            // فحص دوري
            setInterval(() => this.check(), 500);
            
            // حماية ضد debugger
            this.protectDebugger();
            
            // حماية ضد الاختصارات
            this.protectKeyboard();
            
            // حماية ضد النقر بالزر الأيمن
            document.addEventListener('contextmenu', e => e.preventDefault());
        }
        
        check() {
            if (window.outerHeight - window.innerHeight > this.threshold || 
                window.outerWidth - window.innerWidth > this.threshold) {
                if (!this.devtoolsOpen) {
                    this.onDevToolsOpen();
                    this.devtoolsOpen = true;
                }
            } else {
                this.devtoolsOpen = false;
            }
            
            // فحص إضافي باستخدام Performance
            const start = performance.now();
            debugger;
            const end = performance.now();
            
            if (end - start > 100) {
                this.onDevToolsOpen();
            }
        }
        
        protectDebugger() {
            const interval = setInterval(() => {
                debugger;
            }, 50);
            
            // إيقاف بعد 10 ثواني لتوفير الأداء
            setTimeout(() => clearInterval(interval), 10000);
        }
        
        protectKeyboard() {
            document.addEventListener('keydown', (e) => {
                // F12
                if (e.keyCode === 123) {
                    e.preventDefault();
                    return false;
                }
                
                // Ctrl+Shift+I/J/C
                if (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) {
                    e.preventDefault();
                    return false;
                }
                
                // Ctrl+U
                if (e.ctrlKey && e.keyCode === 85) {
                    e.preventDefault();
                    return false;
                }
            });
        }
        
        onDevToolsOpen() {
            // إخفاء المحتوى
            document.body.style.display = 'none';
            
            // مسح Console
            console.clear();
            
            // عرض تحذير
            console.log('%c⛔ توقف!', 'color: red; font-size: 50px; font-weight: bold;');
            console.log('%cهذه ميزة متصفح مخصصة للمطورين. إذا طلب منك شخص ما نسخ ولصق شيء هنا، فهو احتيال وسيمنحهم الوصول إلى حسابك.', 'font-size: 16px;');
            
            // إعادة التوجيه
            setTimeout(() => {
                window.location.href = 'about:blank';
            }, 3000);
        }
    }
    
    // التصدير الآمن
    window.SecureFirebase = {
        init: initializeFirebase,
        SessionManager: SecureSessionManager,
        DevToolsProtection: DevToolsProtection
    };
    
})();
