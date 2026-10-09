/* =====================================================================
   config.js — إعدادات النسخة التجريبية لـ«مقياس المحاور ٢»
   ---------------------------------------------------------------------
   نفس مشروع فايربيز بتاع fouad-perspective (نفس مفاتيح الميزان).
   ===================================================================== */

var AXP_FIREBASE = {
  apiKey:            "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
  authDomain:        "fouad-perspective.firebaseapp.com",
  projectId:         "fouad-perspective",
  storageBucket:     "fouad-perspective.firebasestorage.app",
  messagingSenderId: "1068763865336",
  appId:             "1:1068763865336:web:b791abcd22d536aedd5b0d"
};

/* المجموعة في Firestore. منفصلة عن الإنتاج. */
var AXP_COLLECTION = "maqyas_axes_v2_pilot";

/* إيميلات الأدمن (حروف صغيرة). لازم تبقى نفس القايمة اللي في firestore.rules بالحرف،
   ولازم يكون ليها حساب Email/Password في Firebase Authentication (نفس حساب الميزان). */
var AXP_ADMINS = [
  "admin@fouad-academy.com"
];
