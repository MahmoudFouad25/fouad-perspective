// Security Layer - Mobile & Desktop Compatible
(function() {
    'use strict';
    
    // كشف نوع الجهاز
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // تعطيل أدوات المطور (للكمبيوتر فقط)
    const disableDevTools = () => {
        // تطبيق الحماية على الكمبيوتر فقط
        if (!isMobile) {
            // منع كليك يمين
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showSecurityAlert('كليك يمين غير مسموح');
                return false;
            });
            
            // منع F12 و Ctrl+Shift+I و Ctrl+Shift+J و Ctrl+U
            document.addEventListener('keydown', (e) => {
                if (e.keyCode === 123 || // F12
                    (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
                    (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
                    (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
                    e.preventDefault();
                    showSecurityAlert('أدوات المطور محظورة');
                    return false;
                }
            });
            
            // كشف فتح أدوات المطور (للكمبيوتر فقط)
            let checkInterval;
            const threshold = 160;
            
            checkInterval = setInterval(() => {
                if (window.outerHeight - window.innerHeight > threshold || 
                    window.outerWidth - window.innerWidth > threshold) {
                    handleDevToolsOpen();
                    clearInterval(checkInterval);
                }
            }, 1000);
        }
    };
    
    // إشعار أمني بسيط
    const showSecurityAlert = (message) => {
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-family: 'Tajawal', sans-serif;
            z-index: 999999;
            animation: slideDown 0.5s ease;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        alert.textContent = `⚠️ ${message}`;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideUp 0.5s ease';
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    };
    
    // التعامل عند فتح أدوات المطور (للكمبيوتر فقط)
    const handleDevToolsOpen = () => {
        if (!isMobile) {
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
                    direction: rtl;
                ">
                    <div>
                        <h1 style="font-size: 3rem; margin-bottom: 20px;">⚠️ تحذير أمني</h1>
                        <p style="font-size: 1.5rem;">تم رصد محاولة وصول غير مصرح بها</p>
                        <p style="margin-top: 20px;">سيتم إعادة توجيهك خلال 3 ثوان...</p>
                    </div>
                </div>
            `;
            setTimeout(() => {
                window.location.href = 'https://mahmoudfouad25.github.io/fouad-perspective/';
            }, 3000);
        }
    };
    
    // حماية النسخ (للموبايل والكمبيوتر)
    const protectContent = () => {
        // منع النسخ
        document.addEventListener('copy', (e) => {
            e.preventDefault();
            e.clipboardData.setData('text/plain', 'المحتوى محمي بحقوق النشر © منظور الفؤاد');
            showSecurityAlert('النسخ غير مسموح');
            return false;
        });
        
        // منع القص
        document.addEventListener('cut', (e) => {
            e.preventDefault();
            showSecurityAlert('القص غير مسموح');
            return false;
        });
        
        // منع التحديد (ماعدا حقول الإدخال)
        document.addEventListener('selectstart', (e) => {
            if (!e.target.matches('input, textarea')) {
                e.preventDefault();
                return false;
            }
        });
        
        // إضافة CSS للحماية
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            }
            
            body {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
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
            
            /* منع السحب والإفلات للصور */
            img {
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                user-drag: none;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    };
    
    // حماية قاعدة البيانات
    const protectDatabase = () => {
        // إخفاء معلومات Firebase
        if (window.firebaseConfig) {
            delete window.firebaseConfig;
        }
        
        // حماية كائنات Firebase
        if (window.firebase) {
            Object.defineProperty(window.firebase, 'apiKey', {
                get: () => undefined,
                set: () => {},
                configurable: false
            });
        }
        
        // رسالة تحذيرية في الـ Console (للكمبيوتر فقط)
        if (!isMobile && window.console) {
            const warningStyle = 'color: red; font-size: 30px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);';
            console.log('%c⛔ توقف! STOP!', warningStyle);
            console.log('%cهذه منطقة محمية - Protected Area', 'color: orange; font-size: 18px;');
            console.log('%cأي محاولة للعبث ستُسجل وقد تعرض حسابك للحظر', 'color: #ff6b6b; font-size: 14px;');
            
            // تعطيل بعض وظائف Console
            const noop = () => {};
            ['log', 'debug', 'info', 'warn'].forEach(method => {
                console[method] = noop;
            });
        }
    };


    // حماية خاصة للموبايل من Eruda و vConsole
    const blockMobileDebuggers = () => {
        // حظر Eruda
        if (window.eruda) {
            window.eruda = undefined;
            document.body.innerHTML = '<h1 style="text-align:center; margin-top:50px;">غير مسموح</h1>';
        }
        
        // حظر vConsole
        if (window.VConsole) {
            window.VConsole = undefined;
        }
        
        // مراقبة التغييرات
        Object.defineProperty(window, 'eruda', {
            set: function() {
                location.reload();
            }
        });
        
        Object.defineProperty(window, 'VConsole', {
            set: function() {
                location.reload();
            }
        });
        
        // حماية من التلاعب بالـ URL
        const checkURL = () => {
            if (location.href.includes('eruda=true') || 
                location.href.includes('vconsole=true') ||
                location.href.includes('debug=')) {
                location.href = location.href.split('?')[0];
            }
        };
        
        checkURL();
        setInterval(checkURL, 1000);
    };
    
    // تهيئة الحماية
    const init = () => {
        // تطبيق أنواع الحماية المناسبة
        disableDevTools();
        protectContent();
        protectDatabase();
        blockMobileDebuggers();
        // إضافة شارة الحماية
        const badge = document.createElement('div');
        badge.className = 'security-badge';
        badge.innerHTML = `
            <span style="animation: pulse 2s infinite;">🔒</span>
            <span>${isMobile ? 'محمي' : 'محتوى محمي'}</span>
        `;
        badge.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
            color: white;
            padding: ${isMobile ? '8px 15px' : '10px 20px'};
            border-radius: 25px;
            font-size: ${isMobile ? '12px' : '14px'};
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 9998;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            pointer-events: none;
        `;
        
        // إضافة animation للنبض
        const pulseStyle = document.createElement('style');
        pulseStyle.innerHTML = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(pulseStyle);
        
        document.body.appendChild(badge);
    };
    
    // بدء الحماية
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
