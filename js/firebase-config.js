// تكوين Firebase - منظور الفؤاد
const firebaseConfig = {
  apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
  authDomain: "fouad-perspective.firebaseapp.com",
  projectId: "fouad-perspective",
  storageBucket: "fouad-perspective.firebasestorage.app",
  messagingSenderId: "1068763865336",
  appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
  measurementId: "G-RY1FYVB3Q9"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تهيئة الخدمات
const auth = firebase.auth();
const db = firebase.firestore();

// تهيئة Storage
let storage;
try {
  storage = firebase.storage();
  console.log('✅ Firebase Storage جاهز');
} catch (error) {
  console.warn('⚠️ Firebase Storage غير متاح:', error.message);
}

// تهيئة Analytics
let analytics;
try {
  analytics = firebase.analytics();
  console.log('✅ Firebase Analytics جاهز');
} catch (error) {
  console.warn('⚠️ Firebase Analytics غير متاح:', error.message);
}

console.log('🚀 Firebase تم تهيئته بنجاح!');
