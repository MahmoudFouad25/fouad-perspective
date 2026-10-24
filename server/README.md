# إضافات كود البوت (telegramBot على Cloud Run)

نسخة من الأجزاء اللي اتضافت لملف `telegram-bot-server.js` في البوت، علشان تبقى متراجعة ومحفوظة هنا.
الكود الشغال فعلًا هو اللي في Cloud Run؛ الملفات دي مرجع بس، ومفيهاش أي توكن أو مفتاح.

- `bot-wallet-routes.js` — المرحلة ٤: كوبونات المحفظة (`/wallet/coupon`، `/wallet/coupon-cancel`) و`requireClient`.
- `bot-points-coupons-routes.js` — المرحلة ٥: نقاط الدروس (`/points/lesson`)، نقاط التمارين والتأملات (`/points/pillar`)،
  والكوبونات وقت الحجز (`/coupon/check`، `/coupon/redeem`، `/wallet/coupons`).
- `bot-receipts-routes.js` — المرحلة ٨: رحلة القسط كلها. إيصالات الأقساط (`receipts`) وطلبات التأجيل (نفس المجموعة، `kind: postpone`)،
  أزرار الطالب («ابعت إيصال القسط»، «حسابي»، «محتاج أأجل»، «دي مش إيصال»، «مش ده القسط»)، التذكير التلقائي (`/installments/run`)،
  التأكيد الموحّد بعد تسجيل الدفعة (`/installments/paid-notify`)، قرار التأجيل (`/installments/postpone`)، وقرار الإيصال (`/receipts/decision`).
  نقاط الربط الأربعة جوه `/webhook` مكتوبة في أول الملف.
- `bot-client-routes.js` — المرحلة ١٣: ملف العميل. خزنة الباسوردات بالرقم السري (`/client/vault/*`)، حساب الدخول (`/client/info`، `/client/account`، `/client/email`)،
  رابط الدخول (`/client/login-link`)، دمج الحسابات المكررة (`/client/merge`)، علامة «تجريبي» (`/client/test-flag`)، ورد البوت على «نسيت الباسورد» (`clOnText`).
  نقط الربط التلاتة مكتوبة في أول الملف. المجموعات الجديدة: `client_vault` (السيرفر بس)، `client_log` و`client_notes` (الأدمن بس) — القواعد في `firestore-rules/v6-client.rules`.
- `tests/client.test.js` — اختبارات الخزنة والحساب والدمج: `node server/tests/client.test.js`
- `tests/receipts.test.js` — اختبارات كل سيناريوهات الأقساط على قاعدة بيانات وهمية: `node server/tests/receipts.test.js`
