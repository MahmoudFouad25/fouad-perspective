// ==================== المحفظة على السيرفر (المرحلة ٤) ====================
// كوبونات المحفظة بتتعمل وتتلغي هنا بس، في عملية واحدة مع خصم/رجوع النقاط.
// العميل بيبعت إثبات دخوله (Firebase ID token)، والسيرفر بيلاقي ملفه بنفسه.
// /wallet/coupon         { amount }    → كوبون جديد بالقيمة دي (١ جنيه = ١٠ نقاط)
// /wallet/coupon-cancel  { couponId }  → يلغي كوبون محفظة لسه ما اتستعملش ويرجّع نقاطه

const WALLET_POINTS_PER_EGP = 10;
const WALLET_MIN_EGP = 10;
const WALLET_FALLBACK_MAX = 2000;   // نفس الرقم الاحتياطي في القواعد وفي js/wallet-coupon-limit.js

function walletToMs(v) {
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
}

// نفس حساب صفحة الإعداد والقواعد: حد الفترة لو شغالة، غير كده الحد العادي
async function walletCouponMax() {
    const snap = await db.collection('app_settings').doc('wallet_coupons').get();
    const d = snap.exists ? snap.data() : {};
    const def = typeof d.defaultMax === 'number' ? d.defaultMax : WALLET_FALLBACK_MAX;
    const from = walletToMs(d.periodFrom), to = walletToMs(d.periodTo), now = Date.now();
    const inPeriod = typeof d.periodMax === 'number' && from !== null && to !== null && now >= from && now < to;
    return inPeriod ? d.periodMax : def;
}

// العميل الداخل: من التوكن لملفه في users
async function requireClient(req, res, next) {
    try {
        const h = String(req.headers.authorization || '');
        const m = h.match(/^Bearer\s+(.+)$/i);
        if (!m) return res.status(401).json({ ok: false, error: 'login' });
        const decoded = await admin.auth().verifyIdToken(m[1]);
        let snap = await db.collection('users').where('auth.authUid', '==', decoded.uid).limit(1).get();
        if (snap.empty && decoded.email) {
            snap = await db.collection('users').where('personalInfo.email', '==', String(decoded.email).toLowerCase()).limit(1).get();
        }
        if (snap.empty) return res.status(404).json({ ok: false, error: 'no-profile' });
        const doc = snap.docs[0];
        const u = doc.data();
        if ((u.accountStatus && u.accountStatus.status === 'inactive') || (u.accountStatus && u.accountStatus.suspended === true)) {
            return res.status(403).json({ ok: false, error: 'suspended' });
        }
        req.client = { userId: doc.id, ref: doc.ref, authUid: decoded.uid };
        next();
    } catch (e) {
        console.error('requireClient:', e && e.code, e && e.message);
        res.status(401).json({ ok: false, error: 'login' });
    }
}

function walletCode(name) {
    const first = String(name || 'USER').trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9؀-ۿ]/g, '').slice(0, 20) || 'USER';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    for (const b of crypto.randomBytes(6)) r += chars[b % chars.length];
    return first + '-' + r;
}

app.post('/wallet/coupon', requireClient, async (req, res) => {
    try {
        const amount = Number(req.body && req.body.amount);
        if (!Number.isInteger(amount) || amount < WALLET_MIN_EGP) return res.status(400).json({ ok: false, error: 'min', min: WALLET_MIN_EGP });
        const max = await walletCouponMax();
        if (amount > max) return res.status(400).json({ ok: false, error: 'max', max });
        const need = amount * WALLET_POINTS_PER_EGP;
        if (!(await allowAttempt('wallet:' + req.client.userId))) return res.status(429).json({ ok: false, error: 'too-many' });

        const couponRef = db.collection('coupons').doc();
        let out;
        await db.runTransaction(async (tx) => {
            const userSnap = await tx.get(req.client.ref);
            const u = userSnap.data() || {};
            const balance = Number((u.walletPoints && u.walletPoints.balance) || 0);
            if (balance < need) { out = { status: 400, body: { ok: false, error: 'balance', balance, need } }; return; }
            const name = (u.personalInfo && u.personalInfo.name) || 'USER';
            const code = walletCode(name);
            tx.set(couponRef, {
                code, type: 'fixed', value: amount, limit: 1, used: 0,
                source: 'wallet_points', createdBy: req.client.userId, createdByName: name,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                pointsDeducted: need, usedBy: null, usedByName: null, usedAt: null, usedInCourse: null,
                status: 'active', createdVia: 'server'
            });
            tx.update(req.client.ref, {
                'walletPoints.balance': admin.firestore.FieldValue.increment(-need),
                'walletPoints.lastUpdate': admin.firestore.FieldValue.serverTimestamp()
            });
            out = { status: 200, body: { ok: true, id: couponRef.id, code, value: amount, pointsDeducted: need, balance: balance - need } };
        });
        res.status(out.status).json(out.body);
    } catch (e) {
        console.error('wallet/coupon:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});

app.post('/wallet/coupon-cancel', requireClient, async (req, res) => {
    try {
        const couponId = String((req.body && req.body.couponId) || '');
        if (!couponId || couponId.includes('/')) return res.status(400).json({ ok: false, error: 'bad-request' });
        const couponRef = db.collection('coupons').doc(couponId);
        let out;
        await db.runTransaction(async (tx) => {
            const c = await tx.get(couponRef);
            if (!c.exists) { out = { status: 404, body: { ok: false, error: 'not-found' } }; return; }
            const d = c.data();
            if (d.source !== 'wallet_points' || d.createdBy !== req.client.userId) { out = { status: 403, body: { ok: false, error: 'not-yours' } }; return; }
            if (d.status !== 'active' || Number(d.used || 0) !== 0) { out = { status: 409, body: { ok: false, error: 'used' } }; return; }
            const back = Number(d.pointsDeducted || 0);
            tx.delete(couponRef);
            if (back > 0) {
                tx.update(req.client.ref, {
                    'walletPoints.balance': admin.firestore.FieldValue.increment(back),
                    'walletPoints.lastUpdate': admin.firestore.FieldValue.serverTimestamp()
                });
            }
            out = { status: 200, body: { ok: true, pointsReturned: back } };
        });
        res.status(out.status).json(out.body);
    } catch (e) {
        console.error('wallet/coupon-cancel:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});
