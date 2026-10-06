/* =====================================================================
   config.js — الإعدادات
   ورشة «الميزان» · صناع الحياة × منظور الفؤاد
   ---------------------------------------------------------------------
   ده الملف الوحيد اللي بيتعدّل قبل التشغيل.
   ===================================================================== */

/* ١) مفاتيح المشروع — نفس مشروع fouad-perspective */
var MZ_FIREBASE = {
  apiKey:            "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
  authDomain:        "fouad-perspective.firebaseapp.com",
  projectId:         "fouad-perspective",
  storageBucket:     "fouad-perspective.firebasestorage.app",
  messagingSenderId: "1068763865336",
  appId:             "1:1068763865336:web:b791abcd22d536aedd5b0d"
};

/* ٢) إيميلات اللي بيفتحوا لوحة التحكم.
      لازم تبقى نفس القايمة اللي في firestore.rules بالحرف،
      ولازم يكون ليها حساب Email/Password في Firebase Authentication. */
var MZ_ADMINS = [
  "admin@fouad-academy.com"
];

/* ٣) إعدادات اليوم */
var MZ_SETTINGS = {
  sessionId:      "mizan-1",  // معرّف الجلسة لو الرابط مافيهوش ?s=
                              // كل محافظة أو كل يوم ليه معرّف مختلف: mizan-sohag-1 ...
  circleSize:     6,          // حجم الحلقة المستهدف (بيطلع من ٥ لـ٧)
  separateGender: false,      // true = بنسأل ولد/بنت ونفصل الحلقات والرفقة
  supportName:    "شخص الدعم",// اسم اللي بيروح للي يدوس «محتاج حد يكلمني» — يتغير من اللوحة كمان
  hotline:        "16328",    // ⚑ اتأكد من الرقم قبل اليوم
  emergency:      "123",
  vibrateMs:      60,         // اهتزاز خفيف عند تغيّر الشاشة. صفر = يتلغي
  heartbeatMin:   5,          // كل كام دقيقة الموبايل يقول «أنا هنا» (توفير في الكتابة)
  offlineAfterSec: 15         // بعد كام ثانية من غير اتصال نفتح وضع «امشي مع الشاشة»
};
