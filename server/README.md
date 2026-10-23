# إضافات كود البوت (telegramBot على Cloud Run)

نسخة من الأجزاء اللي اتضافت لملف `telegram-bot-server.js` في البوت، علشان تبقى متراجعة ومحفوظة هنا.
الكود الشغال فعلًا هو اللي في Cloud Run؛ الملفات دي مرجع بس، ومفيهاش أي توكن أو مفتاح.

- `bot-wallet-routes.js` — المرحلة ٤: كوبونات المحفظة (`/wallet/coupon`، `/wallet/coupon-cancel`) و`requireClient`.
- `bot-points-coupons-routes.js` — المرحلة ٥: نقاط الدروس (`/points/lesson`)، نقاط التمارين والتأملات (`/points/pillar`)،
  والكوبونات وقت الحجز (`/coupon/check`، `/coupon/redeem`، `/wallet/coupons`).
- `bot-receipts-routes.js` — المرحلة ٧: إيصالات الأقساط (`receipts`)، وزرار «ابعت إيصال القسط»، والتذكير التلقائي (`/installments/run`)، وقرار الإيصال (`/receipts/decision`). ومعاه سطرين ربط جوه `/webhook` مكتوبين في أول الملف.
