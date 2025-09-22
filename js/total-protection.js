// نظام الحماية الشامل - Total Protection System
(function() {
    'use strict';
    
    // ============ الجزء الأول: منع النسخ واللصق ============
    
    // منع النسخ
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });
    
    // منع القص
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });
    
    // منع اللصق (في حالة المدخلات)
    document.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    
    // منع التحديد
    document.addEventListener('selectstart', function(e) {
        // السماح فقط في خانات الإدخال
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });
    
    // منع كليك يمين
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // ============ الجزء الثاني: منع الطباعة وحفظ الصفحة ============
    
    // منع الطباعة Ctrl+P
    document.addEventListener('keydown', function(e) {
        // منع Ctrl+P (طباعة)
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            showWarning('الطباعة غير مسموحة');
            return false;
        }
        
        // منع Ctrl+S (حفظ)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            showWarning('حفظ الصفحة غير مسموح');
            return false;
        }
        
        // منع Ctrl+A (تحديد الكل)
        if (e.ctrlKey && e.keyCode === 65) {
            e.preventDefault();
            return false;
        }
    });
    
    // إضافة CSS لمنع الطباعة
    const noPrintCSS = document.createElement('style');
    noPrintCSS.innerHTML = `
        @media print {
            body {
                display: none !important;
            }
        }
        
        /* منع التحديد */
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        /* السماح بالتحديد في المدخلات فقط */
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(noPrintCSS);
    
    // ============ الجزء الثالث: منع عرض الكود المصدري ============
    
    // منع F12 و Ctrl+Shift+I و Ctrl+U
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123) {
            e.preventDefault();
            showWarning('أدوات المطور محظورة');
            return false;
        }
        
        // Ctrl+Shift+I
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            showWarning('أدوات المطور محظورة');
            return false;
        }
        
        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            showWarning('Console محظور');
            return false;
        }
        
        // Ctrl+U (عرض المصدر)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            showWarning('عرض الكود محظور');
            return false;
        }
    });
    
    // ============ الجزء الرابع: كشف أدوات المطور ============
    
    let devToolsOpen = false;
    
    // طريقة 1: كشف بحجم النافذة
    setInterval(function() {
        if (window.outerHeight - window.innerHeight > 100) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                blockPage();
            }
        }
        
        if (window.outerWidth - window.innerWidth > 100) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                blockPage();
            }
        }
    }, 500);
    
    // طريقة 2: كشف بـ debugger
    setInterval(function() {
        debugger;
    }, 5000);
    
    // ============ الجزء الخامس: حماية من الموبايل ============
    
    // كشف أدوات فحص الموبايل
    if (window.eruda || window.VConsole) {
        blockPage();
    }
    
    // منع الضغط الطويل في الموبايل
    document.addEventListener('touchstart', function(e) {
        let touch = e.touches[0];
        let timeout = setTimeout(function() {
            e.preventDefault();
            showWarning('النسخ غير مسموح');
        }, 500);
        
        document.addEventListener('touchend', function() {
            clearTimeout(timeout);
        }, {once: true});
    });
    
    // ============ الجزء السادس: حماية Firebase ============
    
    // إخفاء معلومات Firebase
    if (window.firebase) {
        Object.defineProperty(window, 'firebase', {
            get: function() {
                console.warn('Firebase Access Blocked');
                return undefined;
            }
        });
    }
    
    if (window.firebaseConfig) {
        delete window.firebaseConfig;
    }
    
    // ============ الدوال المساعدة ============
    
    // عرض تحذير
    function showWarning(message) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b6b, #c92a2a);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            z-index: 999999;
            animation: slideDown 0.5s ease;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        warning.textContent = '⚠️ ' + message;
        
        document.body.appendChild(warning);
        
        setTimeout(function() {
            warning.style.animation = 'slideUp 0.5s ease';
            setTimeout(function() {
                warning.remove();
            }, 500);
        }, 3000);
    }
    
    // حظر الصفحة
    function blockPage() {
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            ">
                <div style="
                    text-align: center;
                    color: white;
                    font-family: 'Tajawal', sans-serif;
                ">
                    <h1 style="font-size: 72px; margin-bottom: 20px;">🚫</h1>
                    <h2 style="font-size: 36px; margin-bottom: 20px;">تم حظر الوصول</h2>
                    <p style="font-size: 18px;">تم اكتشاف محاولة فتح أدوات المطور</p>
                    <p style="font-size: 16px; margin-top: 20px;">الصفحة محمية ولا يمكن عرض الكود</p>
                </div>
            </div>
        `;
        
        // إيقاف كل شيء
        setInterval(function() {
            debugger;
        }, 100);
    }
    
    // إضافة CSS للأنيميشن
    const animationCSS = document.createElement('style');
    animationCSS.innerHTML = `
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(-100px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(-100px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(animationCSS);
    
    // ============ رسالة في الـ Console ============
    
    console.log('%c🛑 توقف!', 'color: red; font-size: 50px; font-weight: bold;');
    console.log('%cهذه منطقة محظورة', 'color: red; font-size: 20px;');
    console.log('%cأي محاولة للعبث ستؤدي لحظر حسابك', 'color: orange; font-size: 16px;');
    
})();
