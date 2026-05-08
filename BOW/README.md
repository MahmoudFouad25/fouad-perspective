# 📘 منظور الفؤاد — تجربة الويبينار التفاعليّة
## Phase 1 — البنية الأساسيّة (محدّث ليتوافق مع firebase-config الموجود)

---

## 📂 هيكل الملفّات الكامل

```
fouad-perspective/                   ← الـ Repo بتاعك على GitHub
├── js/
│   └── firebase-config.js           ← الموجود عندك بالفعل (لا نلمسه)
├── (ملفّات المشروع الأخرى...)
│
└── BOW/                             ← فولدر الـ Webinar الجديد
    ├── index.html                   ← دخول المشاركين
    ├── live.html                    ← الشاشة التفاعليّة
    ├── display.html                 ← شاشة العرض (للزووم)
    ├── admin.html                   ← لوحة التحكّم
    ├── README.md                    ← هذا الملف
    ├── css/
    │   └── style.css                ← نظام التصميم
    └── js/
        └── session.js               ← منطق الجلسة (يعتمد على firebase-config)
```

---

## 🔗 العلاقة مع firebase-config.js الموجود عندك

**كل صفحات الـ Webinar تشاور على `../js/firebase-config.js`** — يعني نفس الملف الموجود في الجذر، بدون تعديل.

تسلسل تحميل الـ Scripts في كل صفحة:

```html
1. firebase-app-compat.js       (من CDN)
2. firebase-auth-compat.js      (من CDN — لازم لكود إعداداتك)
3. firebase-firestore-compat.js (من CDN)
4. ../js/firebase-config.js     (الموجود عندك)
5. js/session.js                (منطق الجلسة الخاص بالـ Webinar)
```

`session.js` بيستخدم متغيّر `db` العالميّ اللي بيعرّفه `firebase-config.js` بتاعك، فمفيش تكرار للتهيئة.

---

## 🚀 خطوات الرفع على GitHub

١. **افتح Repo `fouad-perspective`** على GitHub.

٢. **أنشئ مجلّد `BOW`** في الجذر.

٣. **ارفع كل ملفّات الـ Webinar داخل `BOW/`** بنفس الهيكل اللي فوق.

٤. **`firebase-config.js` بتاعك في `/js/`** — متلمسش فيه أيّ حاجة، شغّال زيّ ما هو.

٥. **GitHub Pages** غالبًا مفعّل عندك بالفعل، فالروابط هتبقى:
   - دخول المشاركين: `https://USERNAME.github.io/fouad-perspective/BOW/`
   - شاشة العرض: `https://USERNAME.github.io/fouad-perspective/BOW/display.html`
   - لوحة التحكّم: `https://USERNAME.github.io/fouad-perspective/BOW/admin.html`

---

## 🧪 خطوات الاختبار الكامل

### اختبار ١ — التدفّق الأساسيّ
1. افتح `admin.html` في تاب.
2. افتح `display.html` في تاب تاني.
3. افتح `index.html` على موبايلك (أو في تاب incognito).
4. اضغط "ابدأ التجربة" على الموبايل.
5. **النتيجة المتوقّعة:** ينقلك للـ `live.html` ويظهر "أهلًا بيك".

### اختبار ٢ — تحديث المرحلة من Admin
1. افتح `admin.html` في تاب.
2. شاشة `live.html` مفتوحة على الموبايل.
3. في Admin، اضغط "الاختبار التشخيصيّ".
4. **النتيجة المتوقّعة:** على الموبايل، الشاشة تتغيّر فورًا لتعرض "Phase 2 — قيد التطوير".
5. جرّب كل المراحل السبعة — كلّها هتبدّل الشاشة.

### اختبار ٣ — عدّاد المشاركين
1. افتح `index.html` من ٣ متصفّحات مختلفة (Chrome، Safari، Incognito).
2. اضغط "ابدأ" في كلّ منهم.
3. افتح `admin.html` و `display.html`.
4. **النتيجة المتوقّعة:** عدّاد "المتّصلون الآن" يقول `٣` في الإثنين.

### اختبار ٤ — Heartbeat (الانفصال)
1. ادخل من موبايل.
2. اقفل الموبايل أو شيل التاب.
3. استنّى دقيقتين ونصّ.
4. **النتيجة المتوقّعة:** عدّاد "المتّصلون الآن" ينقص. عدّاد "إجمالي المسجّلين" يفضل زيّ ما هو.

### اختبار ٥ — استمراريّة الجلسة (localStorage)
1. ادخل من موبايل.
2. اقفل التاب وافتح `index.html` تاني.
3. **النتيجة المتوقّعة:** الزرّ بيقول "كمّل التجربة" بدل "ابدأ".

### اختبار ٦ — Reset
1. في Admin، اضغط "إعادة بدء الجلسة بالكامل".
2. أكّد مرّتين.
3. **النتيجة المتوقّعة:** كل العدّادات بترجع `٠`، والمرحلة بترجع "الترحيب".

---

## 🔍 Console Logs للتأكّد من سلامة التحميل

افتح Console في المتصفّح (F12) وشوف الرسائل دي:

```
✅ Firebase initialized successfully
✅ Firestore database available globally
✅ Authentication service ready
✅ All database functions exported
✅ Firebase app initialized: [DEFAULT]
✅ Webinar session layer ready
```

لو أيّ `❌` ظهر — ابعتلي اللوج وأنا أصحّح.

---

## 🔐 حماية لوحة التحكّم

**حاليًّا `admin.html` مفتوحة بدون حماية** للاختبار.

`firebase-config.js` بتاعك فيه دالة `protectAdminPage()` بتشترط دخول بـ `admin@fouad-academy.com`.

**قبل الويبينار الفعليّ**، افتح `admin.html` وفعّل السطر ده (موجود معلّق):

```html
<script>
  window.firebaseAuth.protectAdminPage();
  // ... باقي الكود
</script>
```

كده مش هيدخل لوحة التحكّم غيرك.

---

## 🎨 نظام الألوان (متناسق مع هويّة Proactive)

| المتغيّر | اللون | الاستخدام |
|---------|-------|-----------|
| `--navy-deepest` | `#0A1525` | خلفيّة عميقة |
| `--navy` | `#1A2A44` | Cards |
| `--sky` | `#4ABEDF` | Brand، CTAs، Accents |
| `--sky-light` | `#7DD3F0` | Highlights |
| `--axis-tamasok` | `#D4A24E` | محور التماسك |
| `--axis-haywiyya` | `#E8543F` | محور الحيوية |
| `--axis-intima` | `#4ABEDF` | محور الانتماء (نفس Proactive) |

---

## 📊 بنية البيانات في Firestore

```
webinar_sessions/
└── active/                    ← Document واحد للجلسة النشطة
    ├── current_stage          (string)
    ├── status                 (string: "waiting" | "live")
    ├── last_changed           (timestamp)
    │
    ├── participants/          ← Sub-collection
    │   └── {participant_id}/
    │       ├── joined_at      (timestamp)
    │       └── last_seen      (timestamp)
    │
    └── responses/             ← Sub-collection (Phase 2+)
        └── {participant_id}_{stage}/
            ├── participant_id (string)
            ├── stage          (string)
            ├── answers        (object)
            ├── result         (object)
            └── submitted_at   (timestamp)
```

البيانات دي **منفصلة تمامًا** عن `courses`, `users`, `transactions` بتاعتك. صفر تداخل.

---

## ✅ Phase 1 جاهز للنشر والاختبار

لو كل اللي فوق شغّال زيّ ما تتوقّع، قول **"كمّل"** عشان أبدأ Phase 2 (الاختبار التشخيصيّ — اللحظة المركزيّة).

لو فيه مشكلة، ابعتلي:
- لقطة شاشة من Console (F12 → Console)
- بالظبط فين الخطأ بيحصل
- إيه اللي بتحاول تعمله

وأنا أصحّح فورًا.
