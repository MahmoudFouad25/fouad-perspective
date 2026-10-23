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
- `tests/receipts.test.js` — اختبارات كل سيناريوهات الأقساط على قاعدة بيانات وهمية: `node server/tests/receipts.test.js`
