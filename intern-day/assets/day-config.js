/* =====================================================================
   day-config.js — الإعدادات
   منظومة يوم الاستقبال · «إنت بتردّ على إيه؟»
   ---------------------------------------------------------------------
   ده الملف الوحيد اللي بيتعدّل قبل التشغيل. باقي الملفات متلمسهاش.
   ===================================================================== */

/* ١) مفاتيح المشروع — انسخها زي ما هي من أي ملف شغّال في الريبو
      (مثلاً BOW/journey.html). المشروع: fouad-perspective */
var DAY_FIREBASE = {
  apiKey:            "PASTE_API_KEY",
  authDomain:        "fouad-perspective.firebaseapp.com",
  projectId:         "fouad-perspective",
  storageBucket:     "fouad-perspective.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID"
};

/* ٢) إيميلات الأدمن — اللي بيفتحوا لوحة التحكّم.
      لازم تبقى نفس القايمة الموجودة في firestore.rules بالحرف. */
var DAY_ADMINS = [
  "PASTE_ADMIN_EMAIL"
];

/* ٣) إعدادات اليوم */
var DAY_SETTINGS = {
  sessionId:      "sc2026",   // معرّف الجلسة الافتراضي لو الرابط مافيهوش ?s=
  expectedCount:  36,         // عدد الدفعة — بيستعمل في العدّادات بس
  vibrateMs:      80,         // اهتزاز واحد خفيف عند تغيّر الحالة. صفر = يتلغي
  offlineGraceMin: 10,        // اللي مابعتش إشارة من كام دقيقة يتشال من الإقران
  answerWindow:   3           // الإجابة تتقبل لو حالتها من آخر كام حالة
};
