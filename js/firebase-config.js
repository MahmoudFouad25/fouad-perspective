// تحقق من عدم تحميل Firebase مرتين
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase غير محمل! تأكد من تحميل المكتبات أولاً');
} else if (!firebase.apps.length) {
    // تكوين Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBAcPzPzIDYHvezf5klAwFzU0gmoo_AsCo",
        authDomain: "fouad-academy.firebaseapp.com",
        projectId: "fouad-academy",
        storageBucket: "fouad-academy.firebasestorage.app",
        messagingSenderId: "553738647199",
        appId: "1:553738647199:web:4e73c59b115da5be15d4aa",
        measurementId: "G-M0VML1SRZ4"
    };

    // تهيئة Firebase
    firebase.initializeApp(firebaseConfig);
    console.log('✅ تم تهيئة Firebase بنجاح');
} else {
    console.log('⚠️ Firebase محمل بالفعل');
}

// تهيئة الخدمات
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// جعل المتغيرات عامة
window.auth = auth;
window.db = db;
window.storage = storage;
