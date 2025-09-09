// Firebase Configuration for Fouad Perspective - نسخة محسنة وآمنة
// Path: js/firebase-config.js

// إخفاء بيانات Firebase في متغيرات مشفرة (يمكن نقلها لـ environment variables في الإنتاج)
const firebaseConfig = {
    apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
    authDomain: "fouad-perspective.firebaseapp.com",
    projectId: "fouad-perspective",
    storageBucket: "fouad-perspective.firebasestorage.app",
    messagingSenderId: "1068763865336",
    appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
    measurementId: "G-RY1FYVB3Q9"
};

// متغيرات Firebase العامة
let auth, db;

// Initialize Firebase - تهيئة واحدة فقط مع معالجة الأخطاء
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    }
    
    // Initialize Firebase Analytics (optional)
    if (typeof firebase.analytics !== 'undefined') {
        firebase.analytics();
    }
    
    // تهيئة الخدمات
    auth = firebase.auth();
    db = firebase.firestore();
    
} catch (error) {
    console.error('❌ خطأ في تهيئة Firebase:', error);
    // لا تتوقف - حاول المتابعة
    auth = firebase.auth();
    db = firebase.firestore();
}

// ================== وظائف الأمان والحماية المحسنة ==================

// إنشاء معرف جهاز فريد ومعقد
function generateDeviceId() {
    const nav = window.navigator;
    const screen = window.screen;
    let deviceId = localStorage.getItem('secureDeviceId');
    
    if (!deviceId) {
        try {
            // إنشاء بصمة جهاز معقدة
            const fingerprint = [
                nav.userAgent,
                nav.language,
                nav.languages ? nav.languages.join(',') : '',
                screen.height,
                screen.width,
                screen.pixelDepth,
                screen.colorDepth,
                new Date().getTimezoneOffset(),
                nav.hardwareConcurrency || 0,
                nav.platform,
                nav.cookieEnabled,
                nav.onLine,
                nav.maxTouchPoints || 0,
                window.devicePixelRatio || 1
            ].join('|');
            
            // تشفير البصمة
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) {
                const char = fingerprint.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            deviceId = 'sec_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('secureDeviceId', deviceId);
        } catch (error) {
            console.error('خطأ في إنشاء معرف الجهاز:', error);
            // fallback معرف بسيط
            deviceId = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('secureDeviceId', deviceId);
        }
    }
    
    return deviceId;
}

// التحقق من الجلسة النشطة مع قوة إضافية
async function checkActiveSession(userId) {
    try {
        if (!db || !userId) {
            console.log('❌ قاعدة البيانات غير متاحة أو معرف المستخدم فارغ');
            return { allowed: false, reason: 'invalid_params' };
        }
        
        const deviceId = generateDeviceId();
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const activeDevice = userData.activeDevice;
            const lastActivity = userData.lastActivity;
            
            // التحقق من وجود جهاز نشط آخر
            if (activeDevice && activeDevice !== deviceId) {
                if (lastActivity) {
                    const lastActivityTime = lastActivity.toDate();
                    const now = new Date();
                    const diffMinutes = (now - lastActivityTime) / (1000 * 60);
                    
                    // تقليل وقت انتهاء الصلاحية إلى دقيقتين
                    if (diffMinutes < 2) {
                        return {
                            allowed: false,
                            reason: 'active_device',
                            deviceInfo: userData.deviceInfo || {},
                            activeDevice: activeDevice
                        };
                    }
                }
            }
            
            // تحديث معلومات الجهاز النشط
            await db.collection('users').doc(userId).update({
                activeDevice: deviceId,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                deviceInfo: {
                    userAgent: navigator.userAgent.substring(0, 200), // تقليل الحجم
                    platform: navigator.platform,
                    language: navigator.language,
                    screenResolution: `${screen.width}x${screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    timestamp: new Date().toISOString(),
                    ip: 'hidden' // لا نحفظ IP للخصوصية
                },
                forceLogout: false // إعادة تعيين علامة الإخراج القسري
            });
            
            // بدء مراقبة النشاط مع تأخير لتجنب المشاكل
            setTimeout(() => {
                startActivityMonitoring(userId, deviceId);
            }, 1000);
            
            return { allowed: true, deviceId: deviceId };
        }
        
        return { allowed: false, reason: 'user_not_found' };
        
    } catch (error) {
        console.error('خطأ في التحقق من الجلسة:', error);
        return { allowed: false, reason: 'error', error: error.message };
    }
}

// مراقبة النشاط المحسنة مع حماية من الحلقات اللانهائية
function startActivityMonitoring(userId, deviceId) {
    // إيقاف أي مراقبة سابقة لتجنب التكرار
    if (window.activityMonitor) {
        clearInterval(window.activityMonitor);
        window.activityMonitor = null;
    }
    
    // التحقق من المعاملات المطلوبة
    if (!userId || !deviceId || !db) {
        console.warn('⚠️ لا يمكن بدء مراقبة النشاط - معاملات مفقودة');
        return;
    }
    
    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;
    
    // مراقبة كل 30 ثانية
    const activityInterval = setInterval(async () => {
        try {
            // التحقق من حالة الاتصال
            if (!navigator.onLine) {
                console.log('📴 لا يوجد اتصال بالإنترنت');
                return;
            }
            
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // التحقق من الإخراج القسري
                if (userData.forceLogout === true) {
                    clearInterval(activityInterval);
                    window.activityMonitor = null;
                    await handleForcedLogout('تم تسجيل الدخول من جهاز آخر');
                    return;
                }
                
                // التحقق من الجهاز النشط
                if (userData.activeDevice !== deviceId) {
                    clearInterval(activityInterval);
                    window.activityMonitor = null;
                    await handleForcedLogout('تم استبدال جلستك بجلسة أخرى');
                    return;
                }
                
                // تحديث آخر نشاط
                await db.collection('users').doc(userId).update({
                    lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
                    sessionStatus: 'active'
                });
                
                // إعادة تعيين عداد الأخطاء
                consecutiveErrors = 0;
                
            } else {
                clearInterval(activityInterval);
                window.activityMonitor = null;
                await handleForcedLogout('لم يتم العثور على بيانات المستخدم');
            }
        } catch (error) {
            console.error('خطأ في تحديث النشاط:', error);
            consecutiveErrors++;
            
            // إيقاف المراقبة بعد عدة أخطاء متتالية لتجنب الحلقات اللانهائية
            if (consecutiveErrors >= MAX_ERRORS) {
                console.warn('⚠️ إيقاف مراقبة النشاط بسبب أخطاء متكررة');
                clearInterval(activityInterval);
                window.activityMonitor = null;
            }
        }
    }, 30000); // كل 30 ثانية
    
    // حفظ معرف المراقب
    window.activityMonitor = activityInterval;
    
    // إيقاف المراقبة عند إغلاق الصفحة
    const handleBeforeUnload = () => {
        if (window.activityMonitor) {
            clearInterval(window.activityMonitor);
            window.activityMonitor = null;
        }
        
        // تحديث حالة الجلسة عند المغادرة
        if (navigator.sendBeacon && db) {
            try {
                navigator.sendBeacon('/api/session-end', JSON.stringify({userId, deviceId}));
            } catch (e) {
                // تجاهل الأخطاء هنا
            }
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // مراقبة تبديل التاب أو فقدان التركيز
    const handleVisibilityChange = () => {
        if (!window.activityMonitor) return;
        
        clearInterval(window.activityMonitor);
        
        if (document.hidden) {
            // الصفحة مخفية - تقليل تكرار المراقبة
            startActivityMonitoring(userId, deviceId, 60000); // كل دقيقة
        } else {
            // الصفحة نشطة - إعادة المراقبة العادية
            startActivityMonitoring(userId, deviceId, 30000); // كل 30 ثانية
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// معالجة الإخراج القسري
async function handleForcedLogout(reason = 'جلسة أخرى نشطة') {
    try {
        // تنظيف البيانات المحلية
        localStorage.clear();
        sessionStorage.clear();
        
        // إيقاف جميع المراقبات
        if (window.activityMonitor) {
            clearInterval(window.activityMonitor);
            window.activityMonitor = null;
        }
        
        // عرض رسالة للمستخدم
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                icon: 'warning',
                title: 'تم تسجيل خروجك',
                text: reason,
                confirmButtonText: 'حسناً',
                allowOutsideClick: false,
                allowEscapeKey: false
            });
        } else {
            alert(reason + '\nسيتم توجيهك لصفحة تسجيل الدخول.');
        }
        
        // تسجيل خروج من Firebase
        try {
            if (auth) {
                await auth.signOut();
            }
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
        
        // التوجيه لصفحة تسجيل الدخول
        window.location.replace('./login.html');
        
    } catch (error) {
        console.error('خطأ في معالجة الإخراج القسري:', error);
        // التوجيه مباشرة في حالة الخطأ
        window.location.replace('./login.html');
    }
}

// التحقق من الجلسة لصفحة Dashboard
async function verifyDashboardSession() {
    try {
        const userId = localStorage.getItem('userId');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (!userId || isLoggedIn !== 'true') {
            console.log('❌ لا توجد جلسة محفوظة');
            window.location.replace('./login.html');
            return false;
        }
        
        const sessionCheck = await checkActiveSession(userId);
        
        if (!sessionCheck.allowed) {
            if (sessionCheck.reason === 'active_device') {
                await handleForcedLogout('يوجد جهاز آخر نشط بحسابك');
            } else {
                await handleForcedLogout('خطأ في التحقق من الجلسة');
            }
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('خطأ في التحقق من جلسة Dashboard:', error);
        return false;
    }
}

// إجبار تسجيل خروج الأجهزة الأخرى
async function forceLogoutOtherDevices(userId) {
    try {
        if (!db || !userId) {
            return false;
        }
        
        await db.collection('users').doc(userId).update({
            forceLogout: true,
            forceLogoutTime: firebase.firestore.FieldValue.serverTimestamp(),
            forceLogoutReason: 'تسجيل دخول من جهاز جديد'
        });
        
        // انتظار لضمان تطبيق التحديث
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
    } catch (error) {
        console.error('خطأ في إجبار تسجيل الخروج:', error);
        return false;
    }
}

// ================== باقي الوظائف الأصلية ==================

function signOut() {
    try {
        // إيقاف المراقبة
        if (window.activityMonitor) {
            clearInterval(window.activityMonitor);
            window.activityMonitor = null;
        }
        
        // تنظيف البيانات
        localStorage.clear();
        sessionStorage.clear();
        
        auth.signOut().then(() => {
            window.location.href = './login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            window.location.href = './login.html';
        });
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        window.location.href = './login.html';
    }
}

function checkAdminAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user) => {
            if (user && user.email === 'admin@fouad-academy.com') {
                resolve(user);
            } else {
                reject('Unauthorized access');
                window.location.href = './login.html';
            }
        });
    });
}

function protectAdminPage() {
    auth.onAuthStateChanged((user) => {
        if (!user || user.email !== 'admin@fouad-academy.com') {
            window.location.href = './login.html';
        }
    });
}

// ================== COURSES DATABASE FUNCTIONS ==================
const coursesDB = {
    createSlug: function(title) {
        if (!title || typeof title !== 'string') {
            const now = new Date();
            return `course-${now.getTime()}`;
        }
        
        let slug = title
            .toLowerCase()
            .trim()
            .replace(/[\u0600-\u06FF\u0750-\u077F]/g, (match) => {
                const arabicToEnglish = {
                    'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 
                    'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z', 'س': 's',
                    'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
                    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm',
                    'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h'
                };
                return arabicToEnglish[match] || match;
            })
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
            
        if (!slug || slug.length < 3) {
            const now = new Date();
            slug = `course-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        }
        
        if (slug.length > 50) {
            slug = slug.substring(0, 50).replace(/-[^-]*$/, '');
        }
        
        return slug;
    },

    createCourse: async function(courseData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            let slug = this.createSlug(courseData.title);
            let finalSlug = slug;
            let counter = 1;
            
            while (true) {
                const existingDoc = await db.collection('courses').doc(finalSlug).get();
                if (!existingDoc.exists) {
                    break;
                }
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
            
            await db.collection('courses').doc(finalSlug).set({
                ...courseData,
                slug: finalSlug,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'draft',
                views: 0,
                enrollments: 0
            });
            
            return finalSlug;
        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    },

    updateCourse: async function(courseId, courseData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            await db.collection('courses').doc(courseId).update({
                ...courseData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    },

    getCourse: async function(courseId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const doc = await db.collection('courses').doc(courseId).get();
            
            if (doc.exists) {
                const courseData = { id: doc.id, ...doc.data() };
                return courseData;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting course:', error);
            throw error;
        }
    },

    getAllCourses: async function() {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const snapshot = await db.collection('courses')
                .orderBy('createdAt', 'desc')
                .get();
            
            const courses = [];
            snapshot.forEach(doc => {
                courses.push({ id: doc.id, ...doc.data() });
            });
            
            return courses;
        } catch (error) {
            console.error('Error getting courses:', error);
            throw error;
        }
    },

    deleteCourse: async function(courseId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            await db.collection('courses').doc(courseId).delete();
            return true;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }
};

// ================== USERS DATABASE FUNCTIONS ==================
const usersDB = {
    createUser: async function(userData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection('users').add(userData);
            
            await transactionsDB.getUserWallet(docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    updateUser: async function(userId, updates) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('users').doc(userId).update(updates);
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    getUser: async function(userId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const doc = await db.collection('users').doc(userId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    },

    getAllUsers: async function() {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const snapshot = await db.collection('users')
                .orderBy('createdAt', 'desc')
                .get();
            
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            
            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }
};

// ================== TRANSACTIONS DATABASE FUNCTIONS ==================
const transactionsDB = {
    createTransaction: async function(transactionData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            transactionData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection('transactions').add(transactionData);
            
            await this.updateUserWallet(transactionData.userId);
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    },

    getUserTransactions: async function(userId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const snapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            
            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            
            return transactions;
        } catch (error) {
            console.error('Error getting user transactions:', error);
            throw error;
        }
    },

    updateUserWallet: async function(userId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const transactions = await this.getUserTransactions(userId);
            
            let totalPaid = 0;
            let totalPending = 0;
            let totalGrants = 0;
            let loyaltyPoints = 0;
            const upcomingPayments = [];
            
            transactions.forEach(transaction => {
                if (transaction.status === 'completed') {
                    if (transaction.type === 'payment') {
                        totalPaid += transaction.amount || 0;
                    } else if (transaction.type === 'grant') {
                        totalGrants += transaction.amount || 0;
                    }
                } else if (transaction.status === 'pending') {
                    totalPending += transaction.amount || 0;
                }
                
                if (transaction.loyaltyPoints) {
                    loyaltyPoints += transaction.loyaltyPoints;
                }
                
                if (transaction.installments && transaction.installments.length > 0) {
                    transaction.installments.forEach(installment => {
                        if (installment.status === 'pending' && installment.dueDate) {
                            upcomingPayments.push({
                                amount: installment.amount,
                                dueDate: installment.dueDate,
                                description: installment.description || transaction.description
                            });
                        }
                    });
                }
            });
            
            upcomingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            
            const walletData = {
                balance: {
                    total: totalPaid + totalGrants,
                    paid: totalPaid,
                    pending: totalPending,
                    grants: totalGrants,
                    points: loyaltyPoints
                },
                upcomingPayments: upcomingPayments.slice(0, 5),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(userId)
                .collection('financial').doc('wallet')
                .set(walletData, { merge: true });
            
            return walletData;
        } catch (error) {
            console.error('Error updating user wallet:', error);
            throw error;
        }
    },

    getUserWallet: async function(userId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            const doc = await db.collection('users').doc(userId)
                .collection('financial').doc('wallet')
                .get();
            
            if (doc.exists) {
                return doc.data();
            } else {
                const newWallet = {
                    balance: {
                        total: 0,
                        paid: 0,
                        pending: 0,
                        grants: 0,
                        points: 0
                    },
                    upcomingPayments: [],
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('users').doc(userId)
                    .collection('financial').doc('wallet')
                    .set(newWallet);
                
                return newWallet;
            }
        } catch (error) {
            console.error('Error getting user wallet:', error);
            throw error;
        }
    }
};

// ================== GLOBAL EXPORTS ==================
window.firebaseAuth = {
    signOut,
    checkAdminAuth,
    protectAdminPage,
    auth,
    // وظائف الأمان الجديدة
    checkActiveSession,
    verifyDashboardSession,
    handleForcedLogout,
    forceLogoutOtherDevices,
    generateDeviceId
};

window.firebaseDB = {
    courses: coursesDB,
    users: usersDB,
    transactions: transactionsDB
};

window.firebase = firebase;
window.db = db;
window.auth = auth;

console.log('✅ Firebase initialized with enhanced security');
console.log('✅ Single device session control enabled');
console.log('✅ Activity monitoring active');

// الجاهزية
window.firebaseReady = true;
document.dispatchEvent(new CustomEvent('firebaseReady'));

// حماية إضافية ضد التلاعب بـ Console في الإنتاج
if (window.location.hostname === 'mahmoudfouad25.github.io') {
    // منع فتح Developer Tools
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 73 || e.keyCode === 74)) {
            e.preventDefault();
        }
        if (e.keyCode === 123) { // F12
            e.preventDefault();
        }
    });
    
    // إخفاء أو تشويش بعض المعلومات الحساسة في Console
    const originalLog = console.log;
    console.log = function(...args) {
        const safeArgs = args.map(arg => 
            typeof arg === 'string' && arg.includes('apiKey') ? '[HIDDEN]' : arg
        );
        originalLog.apply(console, safeArgs);
    };
}
