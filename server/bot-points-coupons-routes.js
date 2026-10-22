// ==================== نقاط الدروس على السيرفر (المرحلة ٥) ====================
// نقاط المحفظة بتتحسب هنا بس: من نظام نقاط الدرس في courseContentLibrary،
// ومرة واحدة لكل درس لكل عميل (السجل في points_ledger، والمتصفح ما يقدرش يكتب فيه).
// /points/lesson  { courseId, lessonIndex, contentId? }

const PTS_DAY = 86400000;
const PTS_GRACE_DAYS = 7;
const PTS_LAUNCH = Date.parse('2026-10-22T23:59:59+03:00');
const PTS_LEGACY_GRACE_DAYS = 14;

function ptsParseDay(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') v = v.toDate();
    const t = v instanceof Date ? v.getTime() : Date.parse(String(v).length === 10 ? v + 'T23:59:59+03:00' : v);
    return isNaN(t) ? null : t;
}

// نفس قاعدة js/enrollment-access.js: الكورس مفتوح لحد النهاية + ٧ أيام سماح
function ptsEnrollmentOpen(e, now) {
    e = e || {};
    const cur = e.status && e.status.current;
    if (cur === 'cancelled' || cur === 'expired' || (e.status && e.status.isExpired === true)) return false;
    const end = ptsParseDay((e.dates && e.dates.endDate) || e.endDate || null);
    if (!end || new Date(end).getUTCFullYear() >= 2099) return true;
    let lockAt = end + PTS_GRACE_DAYS * PTS_DAY;
    if (end < PTS_LAUNCH) lockAt = Math.max(lockAt, PTS_LAUNCH + PTS_LEGACY_GRACE_DAYS * PTS_DAY);
    return now < lockAt;
}

function ptsFlatLessons(modules) {
    const out = [];
    (Array.isArray(modules) ? modules : []).forEach((m, mi) => {
        (Array.isArray(m && m.lessons) ? m.lessons : []).forEach((l, li) => {
            out.push({ title: (l && l.title) || '', contentId: (l && l.libraryContentId) || null, moduleIndex: mi, lessonIndex: li });
        });
    });
    return out;
}

function ptsLedgerId(userId, courseId, lesson, index) {
    const part = lesson.contentId ? 'c_' + lesson.contentId : 'i_' + index;
    return (userId + '__' + courseId + '__' + part).replace(/\//g, '_').slice(0, 700);
}

app.post('/points/lesson', requireClient, async (req, res) => {
    try {
        const courseId = String((req.body && req.body.courseId) || '');
        const contentId = req.body && req.body.contentId ? String(req.body.contentId) : null;
        const lessonIndex = Number(req.body && req.body.lessonIndex);
        if (!courseId || courseId.includes('/') || (contentId && contentId.includes('/'))) return res.status(400).json({ ok: false, error: 'bad-request' });

        const userSnap = await req.client.ref.get();
        const u = userSnap.data() || {};
        const enrs = (Array.isArray(u.enrollments) ? u.enrollments : []).filter(e =>
            e && (e.courseId === courseId || (e.courseInfo && e.courseInfo.id === courseId) || e.id === courseId));
        const now = Date.now();
        const enr = enrs.find(e => ptsEnrollmentOpen(e, now));
        if (!enr) return res.status(403).json({ ok: false, error: 'not-enrolled' });

        const courseSnap = await db.collection('courses').doc(courseId).get();
        const modules = courseSnap.exists ? courseSnap.data().modules : enr.modules;
        const flat = ptsFlatLessons(modules);
        let idx = -1;
        if (contentId) idx = flat.findIndex(l => l.contentId === contentId);
        if (idx < 0 && Number.isInteger(lessonIndex) && lessonIndex >= 0 && lessonIndex < flat.length) {
            if (!contentId || !flat[lessonIndex].contentId) idx = lessonIndex;
        }
        if (idx < 0) return res.status(404).json({ ok: false, error: 'no-lesson' });
        const lesson = flat[idx];

        let ps = null;
        if (lesson.contentId) {
            const c = await db.collection('courseContentLibrary').doc(lesson.contentId).get();
            ps = c.exists ? (c.data().pointsSystem || null) : null;
        }
        const points = Math.max(0, Math.min(100000, Math.round(Number((ps && ps.totalPossible) || 0))));

        const ledgerRef = db.collection('points_ledger').doc(ptsLedgerId(req.client.userId, courseId, lesson, idx));
        let out;
        await db.runTransaction(async (tx) => {
            const l = await tx.get(ledgerRef);
            if (l.exists) { out = { ok: true, already: true, points: 0 }; return; }
            tx.set(ledgerRef, {
                userId: req.client.userId, courseId, contentId: lesson.contentId, lessonIndex: idx,
                lessonTitle: lesson.title, points, kind: 'lesson',
                at: admin.firestore.FieldValue.serverTimestamp()
            });
            if (points > 0) {
                const hist = {
                    amount: points,
                    timestamp: new Date().toISOString(),
                    type: 'journey',
                    reason: 'إكمال درس: ' + lesson.title,
                    description: 'حصلت على ' + points + ' نقطة',
                    details: {
                        achievement: (ps && ps.achievement) || 0,
                        bonus: (ps && ps.bonus) || 0,
                        participation: (ps && (ps.participationValue || ps.participation)) || 0,
                        speed: (ps && (ps.speedValue || ps.speed)) || 0,
                        multiplier: (ps && (ps.multiplierValue || ps.multiplier)) || 0
                    },
                    source: 'server'
                };
                const FV = admin.firestore.FieldValue;
                tx.update(req.client.ref, {
                    'journeyPoints.balance': FV.increment(points),
                    'journeyPoints.lifetime': FV.increment(points),
                    'journeyPoints.history': FV.arrayUnion(hist),
                    'walletPoints.balance': FV.increment(points),
                    'walletPoints.lifetime': FV.increment(points),
                    'walletPoints.history': FV.arrayUnion(Object.assign({}, hist, { type: 'wallet' }))
                });
            }
            out = { ok: true, already: false, points };
        });
        res.json(out);
    } catch (e) {
        console.error('points/lesson:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});

// /points/pillar { courseId, pillarKey, type, contentId|exerciseId, momentIndex? }
// نقاط التمارين والتأملات: الرقم من إعدادات المحتوى في المكتبة (نفس اللي الصفحة بتعرضه)، ومرة واحدة لكل عمود في كل تمرين.
const PTS_PILLARS = ['courage', 'mirror', 'action', 'witness'];

function ptsPillarValue(content, type, pillarKey, momentIndex) {
    const vd = content.videoData || {};
    if (type === 'reflection_moment') {
        const m = (Array.isArray(vd.reflectionMoments) ? vd.reflectionMoments : [])[momentIndex];
        if (!m) return null;
        const pp = m.pillarsPoints || { courage: 0, mirror: m.points || 5, action: 0, witness: 0 };
        return Number(pp[pillarKey]) || 0;
    }
    if (type === 'immediate_reflection') {
        const ir = vd.immediateReflection || { courage: 0, mirror: 20, action: 0, witness: 0 };
        return Number(ir[pillarKey]) || 0;
    }
    const a = (content.exerciseData && content.exerciseData.pillars) || null;
    const b = (content.externalExercise && content.externalExercise.pillars) || null;
    const isExternal = type === 'external_exercise' || type === 'external-exercise';
    const src = isExternal ? (b || a) : (a || b);
    return src ? (Number(src[pillarKey]) || 0) : null;
}

app.post('/points/pillar', requireClient, async (req, res) => {
    try {
        const b = req.body || {};
        const courseId = String(b.courseId || '');
        const pillarKey = String(b.pillarKey || '');
        const type = String(b.type || '');
        const contentId = String(b.contentId || b.exerciseId || '');
        const momentIndex = b.momentIndex == null ? null : Number(b.momentIndex);
        const okType = ['reflection_moment', 'immediate_reflection', 'pillar_exercise', 'external_exercise', 'external-exercise'].includes(type);
        if (!courseId || !contentId || courseId.includes('/') || contentId.includes('/') || !PTS_PILLARS.includes(pillarKey) || !okType
            || (type === 'reflection_moment' && !(Number.isInteger(momentIndex) && momentIndex >= 0 && momentIndex < 200))) {
            return res.status(400).json({ ok: false, error: 'bad-request' });
        }

        const u = (await req.client.ref.get()).data() || {};
        const enrs = (Array.isArray(u.enrollments) ? u.enrollments : []).filter(e =>
            e && (e.courseId === courseId || (e.courseInfo && e.courseInfo.id === courseId) || e.id === courseId));
        const enr = enrs.find(e => ptsEnrollmentOpen(e, Date.now()));
        if (!enr) return res.status(403).json({ ok: false, error: 'not-enrolled' });

        const courseSnap = await db.collection('courses').doc(courseId).get();
        const flat = ptsFlatLessons(courseSnap.exists ? courseSnap.data().modules : enr.modules);
        if (!flat.some(l => l.contentId === contentId)) return res.status(404).json({ ok: false, error: 'not-in-course' });

        const c = await db.collection('courseContentLibrary').doc(contentId).get();
        if (!c.exists) return res.status(404).json({ ok: false, error: 'no-content' });
        const val = ptsPillarValue(c.data(), type, pillarKey, momentIndex);
        if (val === null) return res.status(404).json({ ok: false, error: 'no-points' });
        const points = Math.max(0, Math.min(10000, Math.round(val)));

        const kind = (type === 'reflection_moment') ? 'rm' + momentIndex : (type === 'immediate_reflection' ? 'ir' : 'ex');
        const ledgerId = (req.client.userId + '__' + courseId + '__p_' + kind + '_' + contentId + '_' + pillarKey).replace(/\//g, '_').slice(0, 700);
        const ledgerRef = db.collection('points_ledger').doc(ledgerId);
        let out;
        await db.runTransaction(async (tx) => {
            const l = await tx.get(ledgerRef);
            if (l.exists) { out = { ok: true, already: true, points: 0 }; return; }
            tx.set(ledgerRef, {
                userId: req.client.userId, courseId, contentId, pillarKey, type, momentIndex, points, kind: 'pillar',
                at: admin.firestore.FieldValue.serverTimestamp()
            });
            if (points > 0) {
                const FV = admin.firestore.FieldValue;
                tx.update(req.client.ref, {
                    'walletPoints.balance': FV.increment(points),
                    'walletPoints.lifetime': FV.increment(points),
                    'walletPoints.history': FV.arrayUnion({
                        amount: points, timestamp: new Date().toISOString(), type: 'wallet',
                        reason: 'تمرين: ' + ((c.data().name) || contentId), description: 'عمود ' + pillarKey,
                        source: 'server', ref: ledgerId
                    })
                });
            }
            out = { ok: true, already: false, points };
        });
        res.json(out);
    } catch (e) {
        console.error('points/pillar:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});
// ==================== الكوبونات وقت الحجز على السيرفر (المرحلة ٥) ====================
// محدش يقدر يعرض الكوبونات من المتصفح: صفحة البيع بتسأل عن كود بعينه، والسيرفر بيرد بالكوبون ده بس.
// /coupon/check   { code }                   → الكوبون لو موجود (مع حد للمحاولات)
// /coupon/redeem  { couponId, bookingDocId } → يتعلّم «اتستعمل» على حجز حقيقي فيه الكوبون ده، مرة واحدة
// /wallet/coupons                            → كوبونات المحفظة بتاعة العميل الداخل بس

const CPN_WINDOW = 15 * 60 * 1000;
const CPN_MAX = 30;
const CPN_BOOKING_MAX_AGE = 2 * 60 * 60 * 1000;

function cpnIp(req) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return xf || (req.ip || 'unknown');
}

async function cpnAllow(key) {
    const ref = db.collection('auth_attempts').doc(crypto.createHash('sha256').update(key).digest('hex'));
    const now = Date.now();
    return db.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        const d = s.exists ? s.data() : { count: 0, windowStart: now };
        if (now - d.windowStart > CPN_WINDOW) { tx.set(ref, { count: 1, windowStart: now }); return true; }
        if (d.count >= CPN_MAX) return false;
        tx.set(ref, { count: d.count + 1, windowStart: d.windowStart });
        return true;
    });
}

function cpnPublic(id, d) {
    return {
        id, code: d.code, type: d.type || 'fixed', value: d.value || 0,
        status: d.status || 'active', source: d.source || null,
        limit: d.limit == null ? null : d.limit, used: d.used || 0,
        expiresAt: d.expiresAt && d.expiresAt.toMillis ? d.expiresAt.toMillis() : (d.expiresAt || null),
        courseId: d.courseId || null, courses: d.courses || null, minAmount: d.minAmount || null,
        description: d.description || null,
        createdBy: d.createdBy || null, createdByName: d.createdByName || null
    };
}

app.post('/coupon/check', async (req, res) => {
    try {
        const code = String((req.body && req.body.code) || '').trim().toUpperCase();
        if (!code || code.length > 60) return res.status(400).json({ ok: false, error: 'bad-request' });
        if (!(await cpnAllow('cpn:' + cpnIp(req)))) return res.status(429).json({ ok: false, error: 'too-many' });
        let snap = await db.collection('coupons').where('code', '==', code).limit(1).get();
        if (snap.empty) {
            const raw = String(req.body.code).trim();
            if (raw !== code) snap = await db.collection('coupons').where('code', '==', raw).limit(1).get();
        }
        if (snap.empty) return res.json({ ok: false, error: 'not-found' });
        const doc = snap.docs[0];
        res.json({ ok: true, coupon: cpnPublic(doc.id, doc.data()) });
    } catch (e) {
        console.error('coupon/check:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});

function cpnBookingMs(b) {
    const v = b.timestamp || b.createdAt || b.created_at || null;
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
}

app.post('/coupon/redeem', async (req, res) => {
    try {
        const couponId = String((req.body && req.body.couponId) || '');
        const bookingDocId = String((req.body && req.body.bookingDocId) || '');
        if (!couponId || !bookingDocId || couponId.includes('/') || bookingDocId.includes('/')) return res.status(400).json({ ok: false, error: 'bad-request' });
        const couponRef = db.collection('coupons').doc(couponId);
        const bookingRef = db.collection('tempBookings').doc(bookingDocId);
        let out;
        await db.runTransaction(async (tx) => {
            const [c, b] = await Promise.all([tx.get(couponRef), tx.get(bookingRef)]);
            if (!c.exists || !b.exists) { out = { status: 404, body: { ok: false, error: 'not-found' } }; return; }
            const cd = c.data(), bd = b.data();
            const want = String(cd.code || '').toUpperCase();
            const inBooking = [bd.coupon, bd.appliedCoupon].some(x => x && (x.id === couponId || (want && String(x.code || '').toUpperCase() === want)));
            if (!inBooking) {
                out = { status: 403, body: { ok: false, error: 'not-in-booking' } }; return;
            }
            const ms = cpnBookingMs(bd);
            if (!ms || Date.now() - ms > CPN_BOOKING_MAX_AGE) { out = { status: 409, body: { ok: false, error: 'booking-old' } }; return; }
            if (bd.couponRedeemedAt) { out = { status: 200, body: { ok: true, already: true } }; return; }
            const used = Number(cd.used || 0);
            const limit = cd.limit == null ? 1000000 : Number(cd.limit);
            if ((cd.status && cd.status !== 'active') || used >= limit) { out = { status: 409, body: { ok: false, error: 'used' } }; return; }
            const FV = admin.firestore.FieldValue;
            const name = (bd.customer && bd.customer.name) || bd.name || bd.customerName || null;
            const course = bd.courseName || (bd.course && bd.course.name) || bd.courseId || null;
            tx.update(couponRef, {
                used: FV.increment(1),
                status: used + 1 >= limit ? 'used' : 'active',
                usedAt: FV.serverTimestamp(),
                usedBy: bd.userId || bd.bookingId || bookingDocId,
                usedByName: name,
                usedInCourse: course,
                bookingId: bookingDocId,
                lastBookingId: bookingDocId
            });
            tx.update(bookingRef, { couponRedeemedAt: FV.serverTimestamp() });
            out = { status: 200, body: { ok: true } };
        });
        res.status(out.status).json(out.body);
    } catch (e) {
        console.error('coupon/redeem:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});

app.post('/wallet/coupons', requireClient, async (req, res) => {
    try {
        const snap = await db.collection('coupons').where('createdBy', '==', req.client.userId).limit(200).get();
        const list = snap.docs.map(d => {
            const x = d.data();
            if (x.source !== 'wallet_points') return null;
            return {
                id: d.id, code: x.code, value: x.value || 0, status: x.status || 'active', used: x.used || 0,
                pointsDeducted: x.pointsDeducted || 0, usedByName: x.usedByName || null, usedInCourse: x.usedInCourse || null,
                createdAt: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : null,
                usedAt: x.usedAt && x.usedAt.toMillis ? x.usedAt.toMillis() : null
            };
        }).filter(Boolean).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        res.json({ ok: true, coupons: list });
    } catch (e) {
        console.error('wallet/coupons:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});
