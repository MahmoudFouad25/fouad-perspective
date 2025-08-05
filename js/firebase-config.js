// Firebase Configuration for Fouad Perspective
// Path: js/firebase-config.js

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
    authDomain: "fouad-perspective.firebaseapp.com",
    projectId: "fouad-perspective",
    storageBucket: "fouad-perspective.firebasestorage.app",
    messagingSenderId: "1068763865336",
    appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
    measurementId: "G-RY1FYVB3Q9"
};

// Initialize Firebase - تهيئة واحدة فقط
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase Analytics (optional)
if (typeof firebase.analytics !== 'undefined') {
    firebase.analytics();
}

// متغيرات Firebase العامة
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ================== AUTHENTICATION FUNCTIONS ==================
function signOut() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
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
    // إنشاء slug من العنوان
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

    // إنشاء دورة جديدة
    createCourse: async function(courseData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            let slug = this.createSlug(courseData.title);
            let finalSlug = slug;
            let counter = 1;
            
            // التحقق من عدم وجود دورة بنفس الـ slug
            while (true) {
                const existingDoc = await db.collection('courses').doc(finalSlug).get();
                if (!existingDoc.exists) {
                    break;
                }
                finalSlug = `${slug}-${counter}`;
                counter++;
            }
            
            // إضافة الدورة مع slug كـ ID
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

    // تحديث دورة
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

    // جلب دورة واحدة
    getCourse: async function(courseId) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            console.log('جاري جلب الدورة:', courseId);
            const doc = await db.collection('courses').doc(courseId).get();
            
            if (doc.exists) {
                const courseData = { id: doc.id, ...doc.data() };
                console.log('تم جلب الدورة بنجاح:', courseData);
                return courseData;
            } else {
                console.log('الدورة غير موجودة:', courseId);
                return null;
            }
        } catch (error) {
            console.error('Error getting course:', error);
            throw error;
        }
    },

    // جلب جميع الدورات
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

    // حذف دورة
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
    // إنشاء مستخدم جديد
    createUser: async function(userData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection('users').add(userData);
            
            // إنشاء محفظة فارغة للمستخدم
            await transactionsDB.getUserWallet(docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // تحديث مستخدم
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

    // جلب مستخدم
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

    // جلب جميع المستخدمين
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
    // إنشاء معاملة جديدة
    createTransaction: async function(transactionData) {
        try {
            if (!db) {
                throw new Error('Firestore not initialized');
            }
            
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            transactionData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            const docRef = await db.collection('transactions').add(transactionData);
            
            // تحديث محفظة المستخدم
            await this.updateUserWallet(transactionData.userId);
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    },

    // جلب معاملات مستخدم
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

    // تحديث محفظة المستخدم
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
            
            // حفظ في مستند فرعي
            await db.collection('users').doc(userId)
                .collection('financial').doc('wallet')
                .set(walletData, { merge: true });
            
            return walletData;
        } catch (error) {
            console.error('Error updating user wallet:', error);
            throw error;
        }
    },

    // جلب محفظة المستخدم
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
                // إنشاء محفظة جديدة إذا لم تكن موجودة
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
// Export للمصادقة
window.firebaseAuth = {
    signOut,
    checkAdminAuth,
    protectAdminPage,
    auth
};

// Export لقاعدة البيانات
window.firebaseDB = {
    courses: coursesDB,
    users: usersDB,
    transactions: transactionsDB
};

// Export للمتغيرات العامة
window.firebase = firebase;
window.db = db;
window.auth = auth;
window.storage = storage;

// تأكيد التهيئة
console.log('✅ Firebase initialized successfully');
console.log('✅ Firestore database available globally');
console.log('✅ Authentication service ready');
console.log('✅ All database functions exported');

// التحقق من حالة Firebase
if (firebase.apps.length > 0) {
    console.log('✅ Firebase app initialized:', firebase.apps[0].name);
} else {
    console.error('❌ Firebase app not initialized');
}

// إشارة جاهزية Firebase
window.firebaseReady = true;
document.dispatchEvent(new CustomEvent('firebaseReady'));
