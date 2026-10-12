# مقياس مسارات الطاقة (النسخة ٢) — المنتج

| | الرابط |
|---|---|
| العميل (من «كورساتي» أو مباشرة) | https://mahmoudfouad25.github.io/fouad-perspective/three-axes/course-view.html |
| المقياس نفسه | https://mahmoudfouad25.github.io/fouad-perspective/three-axes/v2/app/ |
| التقرير | https://mahmoudfouad25.github.io/fouad-perspective/three-axes/v2/app/report.html |
| الأدمن | https://mahmoudfouad25.github.io/fouad-perspective/three-axes/v2/app/admin.html |

```
three-axes/
├── course-view.html        ← البوابة (كورساتي وريجنايت بيفتحوها بالاسم)
├── v1.html                 ← المقياس القديم زي ما هو (كان course-view.html)
└── v2/app/
    ├── index.html · app.js       ← المقياس
    ├── report.html · report.js   ← التقرير
    ├── admin.html · admin.js     ← الأدمن
    ├── shared.js                 ← الإعدادات، والهوية، وتأكيد الدخول، والاشتراك
    ├── style.css
    ├── firestore.rules           ← المقطع الخاص بالمقياس (للقراية)
    ├── firestore.full.rules      ← ملف القواعد كله بعد الإضافة (بيتلصق مكان القديم في Console)
    └── tests/                    ← سيرفر اختبار + فايربيز وهمي + اختبار المتصفح
```

الصفحات بتقرا كل حاجة من الملفات المقفولة: الأسئلة `engine/items.json`، والمحرك `engine/engine.js` + `engine/config.js`، ونصوص التقرير `report/texts.json`، وورقة الكوتش `report/coach_texts.json`. مفيش حاجة بتتقري من جوجل دوكس.

## البوابة

| العميل | بيروح فين |
|---|---|
| مش داخل المنصة | صفحة الدخول |
| مشترك في `three-axes` أو `insight-out`، ومعاه نتيجة قديمة | كارت فيه «افتح تقريرك القديم» و«اعمل المقياس الجديد». محدش بيتحوّل غصب عنه |
| مشترك ومن غير نتيجة قديمة | المقياس الجديد |
| مش مشترك فيهم، بس مشترك في `reignite` | المقياس القديم زي ما هو النهارده |
| غير كده | المقياس الجديد، وبيقوله إنه مش مفتوح في حسابه |

النسخة: لو مشترك في `insight-out` ياخد نسخة البصيرة، حتى لو مشترك في الاتنين. وإلا المنفردة.

## الحماية

- وثيقة العميل: `maqyas_axes_v2/{userId}` (نفس رقم المنصة).
- القواعد بتفتحها بس لو العميل داخل بحساب فايربيز إيميله هو نفسه `users/{userId}.personalInfo.email`.
- لو العميل داخل المنصة من غير حساب فايربيز، الصفحة بتطلب منه الباسورد مرة واحدة:
  - لو مالوش حساب فايربيز، بيتعمله واحد بنفس الإيميل والباسورد (نفس اللي `login.html` بيعمله).
  - لو ليه حساب فايربيز بباسورد تاني (حالة firestore-only)، بتظهر رسالة واضحة وزرار واتساب. الحل من عندك: Firebase Console ← Authentication ← العميل ← Reset password، أو امسح حسابه في Authentication وهو يأكد تاني من الصفحة.
- العميل ما يقدرش يكتب حقول الكوتش. وبعد ما يخلّص ما يقدرش يغيّر إجاباته ولا نتيجته، يقدر بس يقيّم التقرير.
- الأدمن يقرا الكل، ويكتب تعديل الكوتش وإعادة الحساب بس. ومحدش يمسح من الصفحات.

## نشر القواعد (مرة واحدة، وقبل ما تجرّب)

**١. Authentication ← Sign-in method:** اتأكد إن **Email/Password** متفعّل. وحساب الأدمن: `admin@fouad-academy.com`.

**٢. Firestore Database ← تبويب Rules.** ما تمسحش أي حاجة موجودة.

- انزل لحد القاعدة العامة اللي شكلها: `match /{collection}/{doc=**} {`
- **فوقها مباشرة** الصق المقطع (١) من `firestore.rules`: الدالتين `isAxv2Admin` و`isAxv2Owner`، ومقطع `match /maqyas_axes_v2/{userId}`.
- **جوّه القاعدة العامة** زوّد المجموعة على الاستثناءات، بنفس الطريقة اللي اتعملت مع `maqyas_axes_v2_pilot`: السطر اللي فيه `collection == 'sessions' ...` يبقى فيه كمان `|| collection == 'maqyas_axes_v2'` جوّه نفس القوس. من غير الخطوة دي، القاعدة العامة هتفتح المجموعة لأي حد.
- دوس **Publish**.

**٣. اتأكد (٥ دقايق):**

1. افتح صفحة الأدمن وادخل. لو ظهر جدول (حتى لو فاضي)، القراءة شغالة.
2. ادخل المنصة بحساب عميل تجريبي مشترك في `three-axes`، وافتح المقياس، وخلّص المحطة الأولى. لو فوق على الشمال ظهرت «اتحفظ»، الكتابة شغالة.
3. لو ظهرت «محفوظ على جهازك، وهيتبعت لما النت يرجع» والنت شغال، يبقى القواعد رافضة. غالبًا المقطع ما اتلصقش صح، أو إيميل الحساب في `users` مختلف عن إيميل حساب الدخول.

## الاختبار

```
node three-axes/v2/app/tests/server.js 8765 &
CHROME=/path/to/chrome NODE_PATH=$(npm root -g) node three-axes/v2/app/tests/e2e.js
```

السيرفر بيقدّم الريبو ومعاه فايربيز وهمي بيطبّق نفس منطق `firestore.rules`. فده بيختبر الصفحات ومنطق القواعد، مش ملف القواعد نفسه، وده بيتجرّب بالخطوة ٣ فوق.

بيختبر: البوابة بحالاتها، ومش مشترك، وfirestore-only، والعميل اللي مالوش حساب فايربيز، والمنفرد من الأول للتقرير، والرجوع بعد القفل، والتقييم، ومحاولات الوصول لوثيقة عميل تاني، وإجابات محمود اللي لازم تطلّع نفس تقرير التاب حرف بحرف بنسخة البصيرة، والأدمن كله (الفلتر، والتقرير، وورقة الكوتش، والتعديل، وإعادة الحساب، والتنزيل)، وعرض موبايل ٣٧٥.

## لو حاجة اتغيّرت

- **نص سؤال:** `pilot/build_items.py doc.json --version 2.1` (نفس README التجربة).
- **نص في التقرير:** `report/extract_texts.py doc.json --version 1.1`. السكريبت بيرفض لو النصوص اتغيّرت والرقم زي ما هو، وكل وثيقة بتتسجل معاها `textsVersion`.
- **المحرك أو أرقامه:** ارفع `ENGINE_VERSION` أو `configVersion`، وبعدين من الأدمن «إعادة الحساب للكل». النتيجة القديمة بتتحفظ في `resultHistory`.
- وبعد أي رفع: غيّر `assetsVersion` في `shared.js` ورقم `?v=` في الصفحات التلاتة، علشان المتصفحات ما تمسكش نسخة قديمة.

## اللي في كل وثيقة

`userId` · `authUid` · `email` · `name` · `purchase` (`standalone` / `insight`) · `status` (شغال / خلص) · `screen` · `device` ·
`questionsVersion` / `questionsHash` · `startedAt` / `finishedAt` / `updatedAtMs` / `updatedAt` · `period` ·
`st["1".."7"]` ← `startedAt`, `endedAt`, `answers`, `order` (نفس شكل التجربة) · `adaptive` (الصيغة اللي ظهرت في المحطة ٧) ·
بعد ما يخلّص: `result` (ناتج المحرك كامل) · `summary` · `engineVersion` · `configVersion` · `textsVersion` · `computedAt` ·
`rating` (`value`, `note`, `at`) · `reportViewedAt` ·
من الأدمن: `override` (`order`, `reason`, `by`, `at`) · `resultHistory` (كل نتيجة اتغيّرت، وسببها) · `adminUpdatedAt`.
