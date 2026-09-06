/* =====================================================================
   day-config.js — الإعدادات
   منظومة يوم الاستقبال · «إنت بتردّ على إيه؟»
   ---------------------------------------------------------------------
   ده الملف الوحيد اللي بيتعدّل قبل التشغيل. باقي الملفات متلمسهاش.
   ===================================================================== */

/* ١) مفاتيح المشروع — منقولة زي ما هي من profile.html في نفس الريبو.
      المشروع: fouad-perspective */
var DAY_FIREBASE = {
  apiKey:            "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
  authDomain:        "fouad-perspective.firebaseapp.com",
  projectId:         "fouad-perspective",
  storageBucket:     "fouad-perspective.firebasestorage.app",
  messagingSenderId: "1068763865336",
  appId:             "1:1068763865336:web:b791abcd22d536aedd5b0d"
};

/* ٢) إيميلات الأدمن — اللي بيفتحوا لوحة التحكّم.
      لازم تبقى نفس القايمة الموجودة في firestore.rules بالحرف،
      ولازم يكون ليها حساب فعلي في Firebase Authentication. */
var DAY_ADMINS = [
  "admin@fouad-academy.com"
];

/* ٣) إعدادات اليوم */
var DAY_SETTINGS = {
  sessionId:      "sc2026",   // معرّف الجلسة الافتراضي لو الرابط مافيهوش ?s=
  expectedCount:  36,         // عدد الدفعة — بيستعمل في العدّادات بس
  vibrateMs:      80,         // اهتزاز واحد خفيف عند تغيّر الحالة. صفر = يتلغي
  offlineGraceMin: 10,        // اللي مابعتش إشارة من كام دقيقة يتشال من الإقران
  answerWindow:   3           // الإجابة تتقبل لو حالتها من آخر كام حالة
};
