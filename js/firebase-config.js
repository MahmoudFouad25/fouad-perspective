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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional)
if (typeof firebase.analytics !== 'undefined') {
    firebase.analytics();
}

// Helper functions for authentication
const auth = firebase.auth();

// تسجيل الخروج
function signOut() {
    auth.signOut().then(() => {
        // تم تسجيل الخروج بنجاح
        window.location.href = '../index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// التحقق من صلاحية الأدمن
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

// حماية صفحات الأدمن
function protectAdminPage() {
    auth.onAuthStateChanged((user) => {
        if (!user || user.email !== 'admin@fouad-academy.com') {
            window.location.href = './login.html';
        }
    });
}
// دوال إدارة المعاملات المالية
const transactionsDB = {
    // إنشاء معاملة جديدة
    createTransaction: async function(transactionData) {
        try {
            const db = firebase.firestore();
            
            // إضافة الطوابع الزمنية
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            transactionData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // إنشاء المعاملة
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
    getUserTransactions: async function(userId, filters = {}) {
        try {
            const db = firebase.firestore();
            let query = db.collection('transactions').where('userId', '==', userId);
            
            // تطبيق الفلاتر
            if (filters.type) {
                query = query.where('type', '==', filters.type);
            }
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.startDate) {
                query = query.where('date', '>=', filters.startDate);
            }
            if (filters.endDate) {
                query = query.where('date', '<=', filters.endDate);
            }
            
            // الترتيب
            query = query.orderBy('createdAt', 'desc');
            
            const snapshot = await query.get();
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

    // تحديث معاملة
    updateTransaction: async function(transactionId, updates) {
        try {
            const db = firebase.firestore();
            updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            await db.collection('transactions').doc(transactionId).update(updates);
            
            // جلب المعاملة لتحديث المحفظة
            const doc = await db.collection('transactions').doc(transactionId).get();
            if (doc.exists) {
                const transaction = doc.data();
                await this.updateUserWallet(transaction.userId);
            }
            
            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    },

    // حذف معاملة
    deleteTransaction: async function(transactionId) {
        try {
            const db = firebase.firestore();
            
            // جلب المعاملة قبل الحذف
            const doc = await db.collection('transactions').doc(transactionId).get();
            if (!doc.exists) {
                throw new Error('المعاملة غير موجودة');
            }
            
            const transaction = doc.data();
            
            // حذف المعاملة
            await db.collection('transactions').doc(transactionId).delete();
            
            // تحديث محفظة المستخدم
            await this.updateUserWallet(transaction.userId);
            
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    },

    // تحديث محفظة المستخدم
    updateUserWallet: async function(userId) {
        try {
            const db = firebase.firestore();
            
            // جلب جميع معاملات المستخدم
            const snapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .get();
            
            let totalPaid = 0;
            let totalPending = 0;
            let totalGrants = 0;
            let loyaltyPoints = 0;
            const upcomingPayments = [];
            
            snapshot.forEach(doc => {
                const transaction = doc.data();
                
                if (transaction.status === 'completed') {
                    if (transaction.type === 'payment') {
                        totalPaid += transaction.amount || 0;
                        // حساب نقاط الولاء (1 نقطة لكل 100 جنيه)
                        loyaltyPoints += Math.floor((transaction.amount || 0) / 100);
                    } else if (transaction.type === 'grant' || transaction.type === 'gift') {
                        totalGrants += transaction.amount || 0;
                    }
                } else if (transaction.status === 'pending') {
                    totalPending += transaction.amount || 0;
                    
                    // إضافة للمدفوعات القادمة إذا كانت قسط
                    if (transaction.paymentPlan && transaction.paymentPlan.nextDueDate) {
                        upcomingPayments.push({
                            transactionId: doc.id,
                            amount: transaction.amount,
                            dueDate: transaction.paymentPlan.nextDueDate,
                            relatedTo: transaction.relatedTo,
                            installmentNumber: transaction.paymentPlan.currentInstallment,
                            totalInstallments: transaction.paymentPlan.totalInstallments
                        });
                    }
                }
            });
            
            // ترتيب المدفوعات القادمة حسب التاريخ
            upcomingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            
            // تحديث محفظة المستخدم
            const walletData = {
                balance: {
                    total: totalPaid + totalGrants,
                    paid: totalPaid,
                    pending: totalPending,
                    grants: totalGrants,
                    points: loyaltyPoints
                },
                upcomingPayments: upcomingPayments.slice(0, 5), // أول 5 أقساط قادمة
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
            const db = firebase.firestore();
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
    },

    // إنشاء خطة أقساط
    createInstallmentPlan: async function(userId, planData) {
        try {
            const db = firebase.firestore();
            const batch = db.batch();
            
            const {
                totalAmount,
                numberOfInstallments,
                frequency,
                startDate,
                relatedTo,
                paymentMethod
            } = planData;
            
            const installmentAmount = Math.ceil(totalAmount / numberOfInstallments);
            let currentDate = new Date(startDate);
            
            for (let i = 1; i <= numberOfInstallments; i++) {
                const transactionData = {
                    userId: userId,
                    type: 'payment',
                    amount: installmentAmount,
                    status: 'pending',
                    paymentMethod: paymentMethod,
                    date: currentDate.toISOString(),
                    relatedTo: relatedTo,
                    paymentPlan: {
                        type: 'installment',
                        totalAmount: totalAmount,
                        installmentAmount: installmentAmount,
                        currentInstallment: i,
                        totalInstallments: numberOfInstallments,
                        frequency: frequency,
                        nextDueDate: currentDate.toISOString()
                    },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // إنشاء وثيقة لكل قسط
                const docRef = db.collection('transactions').doc();
                batch.set(docRef, transactionData);
                
                // حساب تاريخ القسط التالي
                if (frequency === 'monthly') {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                } else if (frequency === 'weekly') {
                    currentDate.setDate(currentDate.getDate() + 7);
                }
            }
            
            // تنفيذ الدفعة
            await batch.commit();
            
            // تحديث محفظة المستخدم
            await this.updateUserWallet(userId);
            
            return true;
        } catch (error) {
            console.error('Error creating installment plan:', error);
            throw error;
        }
    }
};

// إضافة للكائن window للوصول العام
window.firebaseDB = window.firebaseDB || {};
window.firebaseDB.transactions = transactionsDB;
window.firebaseDB.users = usersDB;

// دوال إدارة الدورات - المحدثة
const coursesDB = {
    // إنشاء دورة جديدة مع استخدام slug كـ ID
    createCourse: async function(courseData) {
        try {
            const db = firebase.firestore();
            
            // تأكد من وجود slug
            let slug = courseData.slug;
            if (!slug && courseData.title) {
                slug = this.createSlug(courseData.title);
            }
            
            // التحقق من عدم وجود دورة بنفس الـ slug
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
            const db = firebase.firestore();
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
            const db = firebase.firestore();
            const doc = await db.collection('courses').doc(courseId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting course:', error);
            throw error;
        }
    },

    // جلب جميع الدورات
    getAllCourses: async function() {
        try {
            const db = firebase.firestore();
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

    // نشر دورة
    publishCourse: async function(courseId) {
        try {
            const db = firebase.firestore();
            await db.collection('courses').doc(courseId).update({
                status: 'published',
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error publishing course:', error);
            throw error;
        }
    },

    // إنشاء URL صديق للـ SEO - محدث ومحسن
    createSlug: function(title) {
        // قاموس تحويل الحروف والكلمات العربية للإنجليزية
        const arabicToEnglish = {
            'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ء': 'a',
            'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h',
            'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
            'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
            'ظ': 'dh', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
            'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h',
            'و': 'w', 'ي': 'y', 'ة': 'h', 'ى': 'a',
            ' ': '-',
            // كلمات شائعة
            'الذات': 'self',
            'التطوير': 'development',
            'النفس': 'psychology',
            'الشخصية': 'personality',
            'القيادة': 'leadership',
            'النجاح': 'success',
            'الحياة': 'life',
            'التغيير': 'change',
            'الهدف': 'goal',
            'الإنجاز': 'achievement',
            'الثقة': 'confidence',
            'الإبداع': 'creativity',
            'التواصل': 'communication',
            'المهارات': 'skills',
            'الفكر': 'thinking',
            'العقل': 'mind',
            'الروح': 'spirit',
            'الطاقة': 'energy',
            'التحفيز': 'motivation',
            'الإلهام': 'inspiration'
        };
        
        let slug = title.toLowerCase().trim();
        
        // استبدال الكلمات والحروف العربية
        for (let [arabic, english] of Object.entries(arabicToEnglish)) {
            slug = slug.replace(new RegExp(arabic, 'g'), english);
        }
        
        // تنظيف إضافي
        slug = slug
            .replace(/[^\w\-]+/g, '') // إزالة الأحرف الغير مرغوبة
            .replace(/\-\-+/g, '-')   // دمج الشرطات المتعددة
            .replace(/^-+/, '')       // إزالة الشرطات من البداية
            .replace(/-+$/, '');      // إزالة الشرطات من النهاية
        
        // إذا كان الناتج فارغ أو قصير جداً، استخدم fallback
        if (!slug || slug.length < 3) {
            const now = new Date();
            slug = `course-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        }
        
        // اقتصر على 50 حرف
        if (slug.length > 50) {
            slug = slug.substring(0, 50).replace(/-[^-]*$/, '');
        }
        
        return slug;
    }
};

// Export functions for use in other scripts
window.firebaseAuth = {
    signOut,
    checkAdminAuth,
    protectAdminPage,
    auth
};

window.firebaseDB = {
    courses: coursesDB
};

// إضافة متغير db عام
const db = firebase.firestore();

// Export للاستخدام العام
window.db = db;
// دوال إدارة المستخدمين
const usersDB = {
    // إنشاء مستخدم جديد
    createUser: async function(userData) {
        try {
            const db = firebase.firestore();
            
            // إضافة الطوابع الزمنية
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // إنشاء المستخدم
            const docRef = await db.collection('users').add(userData);
            
            // إنشاء محفظة فارغة للمستخدم
            await window.firebaseDB.transactions.getUserWallet(docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // تحديث مستخدم
    updateUser: async function(userId, updates) {
        try {
            const db = firebase.firestore();
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
            const db = firebase.firestore();
            const doc = await db.collection('users').doc(userId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }
};

window.firebaseDB.users = usersDB;
console.log('✅ Firestore database initialized and available globally');

