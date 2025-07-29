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

// بدلاً من Firebase Storage، سنستخدم GitHub للملفات
const GITHUB_REPO = 'https://raw.githubusercontent.com/MahmoudFouad25/fouad-perspective/main/';

// دالة لرفع مسارات الملفات في Firestore
async function saveMediaUrl(path, url, type) {
  try {
    await db.collection('media').add({
      path: path,
      url: url,
      type: type, // 'video', 'image', 'pdf', etc.
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ تم حفظ مسار الملف');
  } catch (error) {
    console.error('❌ خطأ في حفظ المسار:', error);
  }
}

// دالة لجلب الملفات
async function getMediaByType(type) {
  try {
    const snapshot = await db.collection('media')
      .where('type', '==', type)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ خطأ في جلب الملفات:', error);
    return [];
  }
}

// تهيئة Analytics بشكل آمن
let analytics;
try {
  analytics = firebase.analytics();
  console.log('✅ Firebase Analytics جاهز');
} catch (error) {
  console.warn('⚠️ Firebase Analytics غير متاح:', error.message);
}

console.log('🚀 Firebase تم تهيئته بنجاح!');
