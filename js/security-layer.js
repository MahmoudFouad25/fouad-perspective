// Security Layer for Course Discovery
(function() {
    'use strict';
    
    // تعطيل أدوات المطور
    const disableDevTools = () => {
        // منع كليك يمين
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // منع F12 و Ctrl+Shift+I و Ctrl+Shift+J
        document.addEventListener('keydown', (e) => {
            if (e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
                (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
                (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
                e.preventDefault();
                return false;
            }
        });
        
        // كشف فتح أدوات المطور
        let devtools = {open: false, orientation: null};
        const threshold = 160;
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    handleDevToolsOpen();
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    };
    
    // التعامل عند فتح أدوات المطور
    const handleDevToolsOpen = () => {
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-family: 'Tajawal', sans-serif;
                text-align: center;
            ">
                <div>
                    <h1 style="font-size: 3rem; margin-bottom: 20px;">⚠️ تحذير أمني</h1>
                    <p style="font-size: 1.5rem;">تم رصد محاولة وصول غير مصرح بها</p>
                    <p style="margin-top: 20px;">سيتم إعادة توجيهك...</p>
                </div>
            </div>
        `;
        setTimeout(() => {
            window.location.href = 'https://mahmoudfouad25.github.io/fouad-perspective/';
        }, 3000);
    };
    
    // تشفير البيانات الحساسة
    const encryptConfig = () => {
        // إخفاء معلومات Firebase
        if (window.firebaseConfig) {
            Object.defineProperty(window, 'firebaseConfig', {
                get: function() {
                    return undefined;
                },
                configurable: false
            });
        }
        
        // إخفاء كائنات Firebase
        ['firebase', 'db', 'auth'].forEach(obj => {
            if (window[obj]) {
                Object.defineProperty(window[obj], 'toString', {
                    value: function() { return '[Protected Object]'; }
                });
            }
        });
    };
    
    // حماية الكود المصدري
    const protectSource = () => {
        // منع النسخ
        document.addEventListener('copy', (e) => {
            e.clipboardData.setData('text/plain', 'المحتوى محمي بحقوق الطبع والنشر');
            e.preventDefault();
        });
        
        // منع التحديد
        document.addEventListener('selectstart', (e) => {
            if (!e.target.matches('input, textarea')) {
                e.preventDefault();
            }
        });
        
        // إضافة CSS للحماية
        const style = document.createElement('style');
        style.innerHTML = `
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
            input, textarea {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
    };
    
    // تهيئة الحماية
    const init = () => {
        disableDevTools();
        encryptConfig();
        protectSource();
        
        // رسالة تحذيرية في الـ Console
        console.log('%c⛔ توقف!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cهذه منطقة محمية للمطورين المصرح لهم فقط', 'color: red; font-size: 20px;');
        console.log('%cأي محاولة للعبث قد تعرض حسابك للإيقاف', 'color: orange; font-size: 16px;');
    };
    
    // بدء الحماية عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
