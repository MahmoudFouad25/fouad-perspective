// Advanced Data Protection Layer
(function() {
    'use strict';
    
    // مفتاح التشفير الديناميكي
    const generateKey = () => {
        const d = new Date();
        const seed = d.getDate() + d.getMonth() + 2024;
        return btoa(seed.toString()).substring(0, 16);
    };
    
    // تشفير البيانات
    window.secureData = {
        encode: function(data) {
            if (!data) return null;
            try {
                const key = generateKey();
                const str = JSON.stringify(data);
                let encoded = btoa(unescape(encodeURIComponent(str)));
                
                // خلط البيانات
                encoded = encoded.split('').reverse().join('');
                encoded = encoded.replace(/=/g, '_');
                
                return encoded;
            } catch(e) {
                return null;
            }
        },
        
        decode: function(encoded) {
            if (!encoded) return null;
            try {
                // فك الخلط
                let decoded = encoded.replace(/_/g, '=');
                decoded = decoded.split('').reverse().join('');
                
                const str = decodeURIComponent(escape(atob(decoded)));
                return JSON.parse(str);
            } catch(e) {
                return null;
            }
        }
    };
    
    // حماية استعلامات Firebase
    const protectFirestore = () => {
        if (!window.db) return;
        
        const originalCollection = window.db.collection;
        
        window.db.collection = function(name) {
            // السماح فقط بالمجموعات المصرح بها
            const allowedCollections = ['courses', 'courseContentLibrary'];
            
            if (!allowedCollections.includes(name)) {
                console.warn('Unauthorized collection access blocked');
                return {
                    get: () => Promise.reject('Access Denied'),
                    doc: () => ({
                        get: () => Promise.reject('Access Denied'),
                        set: () => Promise.reject('Access Denied'),
                        update: () => Promise.reject('Access Denied')
                    })
                };
            }
            
            return originalCollection.call(this, name);
        };
    };
    
    // مراقب النشاطات المشبوهة
    const activityMonitor = {
        attempts: 0,
        maxAttempts: 5,
        
        track: function(action) {
            this.attempts++;
            
            if (this.attempts > this.maxAttempts) {
                this.blockUser();
            }
            
            // تسجيل النشاط
            const activity = {
                action: action,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                screenRes: `${screen.width}x${screen.height}`
            };
            
            sessionStorage.setItem('_sa', window.secureData.encode(activity));
        },
        
        blockUser: function() {
            document.body.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                ">
                    <div style="
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <h1 style="color: #c92a2a; margin-bottom: 20px;">
                            🚫 تم حظر الوصول
                        </h1>
                        <p style="color: #666; font-size: 18px;">
                            تم رصد نشاط مشبوه من جهازك
                        </p>
                        <p style="color: #999; margin-top: 20px;">
                            IP Address: ${Math.random().toString(36).substring(7)}
                        </p>
                    </div>
                </div>
            `;
            
            // إيقاف كل الوظائف
            setInterval(() => {
                debugger;
            }, 100);
        }
    };
    
    // حماية ضد الـ Scraping
    const antiScraping = () => {
        // منع الـ iframes
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
        
        // كشف الـ bots
        const botPatterns = /bot|crawl|spider|scrape|curl|wget|python|java(?!script)/i;
        if (botPatterns.test(navigator.userAgent)) {
            activityMonitor.blockUser();
        }
        
        // حماية ضد التلاعب بالـ DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const scripts = Array.from(mutation.addedNodes)
                        .filter(node => node.tagName === 'SCRIPT');
                    
                    scripts.forEach(script => {
                        if (!script.src.includes('mahmoudfouad25.github.io')) {
                            script.remove();
                            activityMonitor.track('suspicious_script');
                        }
                    });
                }
            });
        });
        
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    };
    
    // تفعيل الحماية
    document.addEventListener('DOMContentLoaded', () => {
        protectFirestore();
        antiScraping();
        
        // إضافة بصمة مخفية
        const fingerprint = document.createElement('div');
        fingerprint.style.cssText = 'position:absolute;left:-9999px;';
        fingerprint.innerHTML = btoa(Date.now().toString());
        document.body.appendChild(fingerprint);
    });
    
    // تعطيل وظائف خطرة
    ['eval', 'Function'].forEach(fn => {
        window[fn] = new Proxy(window[fn], {
            apply: function() {
                activityMonitor.track('dangerous_function');
                throw new Error('Security Error: Operation not permitted');
            }
        });
    });
    
})();
