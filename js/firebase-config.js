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

// دوال إدارة الدورات
const coursesDB = {
    // إنشاء دورة جديدة
    createCourse: async function(courseData) {
        try {
            const db = firebase.firestore();
            const docRef = await db.collection('courses').add({
                ...courseData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'draft',
                views: 0,
                enrollments: 0
            });
            return docRef.id;
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

    // إنشاء URL صديق للـ SEO
    createSlug: function(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s\u0600-\u06FF]/gi, '') // احتفظ بالأحرف العربية
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
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
