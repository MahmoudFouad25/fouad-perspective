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

console.log('✅ Firestore database initialized and available globally');
