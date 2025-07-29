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

// Export functions for use in other scripts
window.firebaseAuth = {
    signOut,
    checkAdminAuth,
    protectAdminPage,
    auth
};
