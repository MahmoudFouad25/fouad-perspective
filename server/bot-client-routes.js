// ==================== ملف العميل: الخزنة والحساب (المرحلة ١٣) ====================
// بيتحط في telegram-bot-server.js قبل function smartRound (جنب موديول الأقساط)، وبيستعمل اللي موجود هناك:
//   app, db, admin, bot, requireAdmin
//
// نقط الربط:
//   ١) جوه rcOnText (موديول الأقساط، أول سطر بعد try): if (typeof clOnText === 'function' && await clOnText(chatId, text)) return true;
//   ٢) جوه /auth/admin-set-password بعد ما الباسورد يتظبط: await clVaultStore(userId, password, 'admin');
//   ٣) جوه pwSecureOne بعد upsertAuthUser:                 await clVaultStore(ref.id, plain, 'إنشاء حساب');
//
// الخزنة:
//   الباسورد اللي الأدمن بيحطه بيتحفظ منه نسخة مقفولة AES-256-GCM في client_vault/{userId}.
//   المفتاح بيتولّد هنا مرة واحدة في app_secrets/client_vault، والرقم السري للأدمن بصمته بس (scrypt).
//   القواعد قافلة الاتنين على المتصفح خالص (allow read, write: if false)، فمحدش يوصلهم غير السيرفر.
//   ٥ محاولات غلط = الخزنة تتقفل ساعة. كل فتح باسورد بيتسجل في client_log/{userId}.
//
// الدوال (كلها للأدمن):
//   /client/info        { userId }                    حساب الدخول + حالة الخزنة + الرقم السري
//   /client/vault/pin   { pin, oldPin? }              تحديد أو تغيير الرقم السري
//   /client/vault/put   { userId, password }          حفظ نسخة بعد ما الباسورد يتظبط (PasswordSafe بيناديها)
//   /client/vault/reveal{ userId, pin? | pass? }      عرض الباسورد. pass = تصريح ١٠ دقايق بيرجع مع أول فتح
//   /client/account     { userId, action }            disable | enable | signout
//   /client/email       { userId, email }             يغيّر إيميل الدخول والملف مع بعض
//   /client/login-link  { userId, send }              رابط دخول جديد (والقديم يبطل)، ويبعته على التليجرام لو send
//   /client/merge       { keepId, dropId }            دمج حساب مكرر في حساب
//   /client/test-flag   { userId, isTest }            علامة «تجريبي» على الحساب وحجوزاته

const CL_LOGIN_URL = 'https://mahmoudfouad25.github.io/fouad-perspective/login.html';
const CL_MAX_FAILS = 5;
const CL_LOCK_MS = 60 * 60 * 1000;
const CL_PASS_MS = 10 * 60 * 1000;
const CL_LOG_MAX = 1500;
const clCrypto = require('crypto');

function clFV() { return admin.firestore.FieldValue; }
function clId(v) { const s = String(v == null ? '' : v).trim(); return s && !s.includes('/') && s.length < 200 ? s : ''; }
function clBy(req) { return (req && (req.adminEmail || (req.user && req.user.email) || (req.admin && req.admin.email))) || 'admin'; }
function clEsc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function clFail(res, code, error, extra) { return res.status(code).json(Object.assign({ ok: false, error }, extra || {})); }

// سطر في سجل العميل (وثيقة واحدة لكل عميل، علشان السجل كله يتقري بقراية واحدة)
async function clLog(userId, entry) {
    try {
        const ref = db.collection('client_log').doc(userId);
        const item = Object.assign({ at: new Date().toISOString() }, entry);
        await ref.set({ userId, items: clFV().arrayUnion(item), updatedAt: clFV().serverTimestamp() }, { merge: true });
        const s = await ref.get();
        const items = (s.exists && s.data().items) || [];
        if (items.length > CL_LOG_MAX) await ref.update({ items: items.slice(items.length - CL_LOG_MAX) });
    } catch (e) { console.error('client_log', userId, e && e.message); }
}

// ---------- مفتاح الخزنة ----------
let clKeyCache = null;
async function clKey() {
    if (clKeyCache) return clKeyCache;
    const ref = db.collection('app_secrets').doc('client_vault');
    const s = await ref.get();
    let b64 = s.exists && s.data().key;
    if (!b64) {
        b64 = clCrypto.randomBytes(32).toString('base64');
        await ref.set({ key: b64, createdAt: clFV().serverTimestamp() }, { merge: true });
        const again = await ref.get();               // لو طلبين في نفس اللحظة: اللي اتحفظ هو اللي يكسب
        b64 = again.data().key;
    }
    clKeyCache = Buffer.from(b64, 'base64');
    return clKeyCache;
}
async function clSeal(plain) {
    const iv = clCrypto.randomBytes(12);
    const c = clCrypto.createCipheriv('aes-256-gcm', await clKey(), iv);
    const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
    return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), enc: enc.toString('base64') };
}
async function clOpen(box) {
    const d = clCrypto.createDecipheriv('aes-256-gcm', await clKey(), Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(box.enc, 'base64')), d.final()]).toString('utf8');
}

// ---------- الرقم السري ----------
function clPinRef() { return db.collection('app_secrets').doc('client_vault_pin'); }
function clHash(pin, salt) { return clCrypto.scryptSync(String(pin), Buffer.from(salt, 'base64'), 32).toString('base64'); }
function clSame(a, b) {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && clCrypto.timingSafeEqual(x, y);
}
function clPinOk(pin) { return /^\d{6,12}$/.test(String(pin || '')); }
async function clPinState() {
    const s = await clPinRef().get();
    const d = s.exists ? s.data() : {};
    return { ref: clPinRef(), d, set: !!d.hash, lockedUntil: (d.lockedUntil || 0) > Date.now() ? d.lockedUntil : 0 };
}
// بيتأكد من الرقم أو من تصريح الـ١٠ دقايق. بيرجّع { ok, pass?, error?, left?, lockedUntil? }
async function clCheck(pin, pass) {
    const st = await clPinState();
    if (!st.set) return { ok: false, error: 'no-pin' };
    if (st.lockedUntil) return { ok: false, error: 'locked', lockedUntil: st.lockedUntil };
    if (pass) {
        const p = st.d.pass || {};
        if (p.hash && p.exp > Date.now() && clSame(clCrypto.createHash('sha256').update(String(pass)).digest('base64'), p.hash)) return { ok: true, pass: null };
        if (!pin) return { ok: false, error: 'pass-expired' };
    }
    if (!pin) return { ok: false, error: 'bad-request' };
    if (clSame(clHash(pin, st.d.salt), st.d.hash)) {
        const fresh = clCrypto.randomBytes(24).toString('base64url');
        await st.ref.set({ fails: 0, lockedUntil: 0, pass: { hash: clCrypto.createHash('sha256').update(fresh).digest('base64'), exp: Date.now() + CL_PASS_MS } }, { merge: true });
        return { ok: true, pass: fresh };
    }
    const fails = (st.d.fails || 0) + 1;
    const lock = fails >= CL_MAX_FAILS ? Date.now() + CL_LOCK_MS : 0;
    await st.ref.set({ fails: lock ? 0 : fails, lockedUntil: lock, pass: clFV().delete() }, { merge: true });
    return lock ? { ok: false, error: 'locked', lockedUntil: lock } : { ok: false, error: 'wrong-pin', left: CL_MAX_FAILS - fails };
}

// ---------- حساب الدخول ----------
async function clUser(userId) {
    const ref = db.collection('users').doc(userId);
    const s = await ref.get();
    return s.exists ? { ref, u: s.data() || {} } : null;
}
function clEmailOf(u) { return String((u && u.personalInfo && u.personalInfo.email) || '').trim().toLowerCase(); }
async function clAuthRecord(u) {
    const uid = u && u.auth && u.auth.authUid;
    try { if (uid) return await admin.auth().getUser(uid); } catch (e) { if (e && e.code !== 'auth/user-not-found') throw e; }
    const email = clEmailOf(u);
    if (!email) return null;
    try { return await admin.auth().getUserByEmail(email); } catch (e) { if (e && e.code === 'auth/user-not-found') return null; throw e; }
}
async function clChatFor(userId, u) {
    const direct = u && ((u.telegram && u.telegram.chatId) || u.telegramChatId);
    if (direct) return String(direct);
    const found = [];
    for (const c of ['tempBookings', 'individualStudents']) {
        try {
            const s = await db.collection(c).where('userId', '==', userId).get();
            s.forEach(d => { const x = d.data(); if (x.telegramChatId) found.push({ id: String(x.telegramChatId), t: Date.parse(x.lastUpdated || x.createdAt || 0) || 0 }); });
        } catch (e) {}
    }
    found.sort((a, b) => b.t - a.t);
    return found.length ? found[0].id : null;
}
function clToken() { return clCrypto.randomBytes(36).toString('base64url') + '_' + Date.now(); }

// ======================= الدوال =======================

app.post('/client/info', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId);
        if (!userId) return clFail(res, 400, 'bad-request');
        const x = await clUser(userId);
        if (!x) return clFail(res, 404, 'not-found');
        const [rec, vault, pin] = await Promise.all([
            clAuthRecord(x.u).catch(e => { console.error('client/info auth', e && e.code); return undefined; }),
            db.collection('client_vault').doc(userId).get(),
            clPinState()
        ]);
        const v = vault.exists ? vault.data() : null;
        res.json({
            ok: true,
            auth: rec === undefined ? { error: true } : rec ? {
                exists: true, uid: rec.uid, email: rec.email || null, disabled: !!rec.disabled,
                lastSignIn: (rec.metadata && rec.metadata.lastSignInTime) || null,
                lastActive: (rec.metadata && rec.metadata.lastRefreshTime) || null,
                created: (rec.metadata && rec.metadata.creationTime) || null
            } : { exists: false },
            vault: v ? { saved: true, setAt: v.setAt || null, changedOutside: !!v.changedOutside } : { saved: false },
            pin: { set: pin.set, lockedUntil: pin.lockedUntil || 0 }
        });
    } catch (e) { console.error('/client/info', e); clFail(res, 500, 'server'); }
});

app.post('/client/vault/pin', requireAdmin, async (req, res) => {
    try {
        const pin = String((req.body && req.body.pin) || ''), oldPin = (req.body && req.body.oldPin) || '';
        if (!clPinOk(pin)) return clFail(res, 400, 'weak-pin');
        const st = await clPinState();
        if (st.set) {
            const c = await clCheck(oldPin, null);
            if (!c.ok) return clFail(res, c.error === 'locked' ? 423 : 403, c.error, { left: c.left, lockedUntil: c.lockedUntil });
        }
        const salt = clCrypto.randomBytes(16).toString('base64');
        await st.ref.set({ salt, hash: clHash(pin, salt), fails: 0, lockedUntil: 0, pass: clFV().delete(), changedAt: new Date().toISOString() }, { merge: true });
        res.json({ ok: true });
    } catch (e) { console.error('/client/vault/pin', e); clFail(res, 500, 'server'); }
});

// بيتنادى من /auth/admin-set-password ومن pwSecureOne بعد ما الباسورد يتظبط على حساب الدخول،
// فأي صفحة بتحط باسورد (ملف العميل، إنشاء الحسابات، Reignite) بتملا الخزنة لوحدها.
async function clVaultStore(userId, plain, by) {
    try {
        if (!userId || !plain || String(plain).length < 6) return false;
        await db.collection('client_vault').doc(String(userId)).set(Object.assign(await clSeal(String(plain)), { setAt: new Date().toISOString(), setBy: by || 'admin', changedOutside: false }));
        await clLog(String(userId), { kind: 'acct', text: 'باسورد جديد اتحط واتحفظ في الخزنة', by: by || 'admin' });
        return true;
    } catch (e) { console.error('clVaultStore', userId, e && e.message); return false; }
}

app.post('/client/vault/put', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId), pw = String((req.body && req.body.password) || '');
        if (!userId || pw.length < 6 || pw.length > 128) return clFail(res, 400, 'bad-request');
        if (!(await clUser(userId))) return clFail(res, 404, 'not-found');
        if (!(await clVaultStore(userId, pw, clBy(req)))) return clFail(res, 500, 'server');
        res.json({ ok: true });
    } catch (e) { console.error('/client/vault/put', e); clFail(res, 500, 'server'); }
});

app.post('/client/vault/reveal', requireAdmin, async (req, res) => {
    try {
        const b = req.body || {};
        const userId = clId(b.userId);
        if (!userId) return clFail(res, 400, 'bad-request');
        const c = await clCheck(b.pin || '', b.pass || '');
        if (!c.ok) {
            if (c.error === 'locked') await clLog(userId, { kind: 'acct', text: 'الخزنة اتقفلت ساعة بعد محاولات رقم سري غلط', by: clBy(req) });
            return clFail(res, c.error === 'locked' ? 423 : c.error === 'no-pin' ? 409 : 403, c.error, { left: c.left, lockedUntil: c.lockedUntil });
        }
        const s = await db.collection('client_vault').doc(userId).get();
        if (!s.exists) return res.json({ ok: true, saved: false, pass: c.pass || undefined });
        const v = s.data();
        let pw;
        try { pw = await clOpen(v); } catch (e) { console.error('vault open', userId, e && e.message); return clFail(res, 500, 'vault-broken'); }
        await clLog(userId, { kind: 'acct', text: 'الباسورد اتعرض من الخزنة', by: clBy(req), sensitive: true });
        res.json({ ok: true, saved: true, password: pw, setAt: v.setAt || null, pass: c.pass || undefined });
    } catch (e) { console.error('/client/vault/reveal', e); clFail(res, 500, 'server'); }
});

app.post('/client/account', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId), action = String((req.body && req.body.action) || '');
        if (!userId || !['disable', 'enable', 'signout'].includes(action)) return clFail(res, 400, 'bad-request');
        const x = await clUser(userId);
        if (!x) return clFail(res, 404, 'not-found');
        const rec = await clAuthRecord(x.u);
        const now = new Date().toISOString();
        if (action === 'signout') {
            if (!rec) return clFail(res, 409, 'no-auth');
            await admin.auth().revokeRefreshTokens(rec.uid);
            await clLog(userId, { kind: 'acct', text: 'اتطلّع من كل الأجهزة', by: clBy(req) });
            return res.json({ ok: true });
        }
        const off = action === 'disable';
        if (rec) {
            await admin.auth().updateUser(rec.uid, { disabled: off });
            if (off) await admin.auth().revokeRefreshTokens(rec.uid);
        }
        const reason = String((req.body && req.body.reason) || '').slice(0, 300);
        await x.ref.update(off
            ? { 'accountStatus.status': 'suspended', 'accountStatus.suspendedAt': now, 'accountStatus.suspendReason': reason || null, 'accountStatus.suspendedBy': clBy(req) }
            : { 'accountStatus.status': 'active', 'accountStatus.reactivatedAt': now, 'accountStatus.suspendReason': null });
        await clLog(userId, { kind: 'acct', text: off ? 'الحساب اتوقف' + (reason ? ': ' + reason : '') : 'الحساب رجع يشتغل', by: clBy(req) });
        res.json({ ok: true, authUpdated: !!rec });
    } catch (e) { console.error('/client/account', e); clFail(res, 500, 'server'); }
});

app.post('/client/email', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId);
        const email = String((req.body && req.body.email) || '').trim().toLowerCase();
        if (!userId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return clFail(res, 400, 'bad-email');
        const x = await clUser(userId);
        if (!x) return clFail(res, 404, 'not-found');
        const old = clEmailOf(x.u);
        if (old === email) return res.json({ ok: true, same: true });
        const dup = await db.collection('users').where('personalInfo.email', '==', email).limit(2).get();
        const other = dup.docs.find(d => d.id !== userId);
        if (other) return clFail(res, 409, 'email-used', { otherId: other.id, otherName: ((other.data().personalInfo || {}).name) || '' });
        const rec = await clAuthRecord(x.u);
        if (rec) {
            try { await admin.auth().updateUser(rec.uid, { email }); }
            catch (e) { if (e && e.code === 'auth/email-already-exists') return clFail(res, 409, 'email-used-auth'); throw e; }
        }
        const upd = { 'personalInfo.email': email, 'timestamps.lastUpdated': new Date().toISOString() };
        if (rec) upd['auth.authUid'] = rec.uid;
        await x.ref.update(upd);
        await clLog(userId, { kind: 'edit', field: 'email', from: old || null, to: email, text: 'الإيميل اتغيّر' + (rec ? ' (ومعاه إيميل الدخول)' : ''), by: clBy(req) });
        res.json({ ok: true, authUpdated: !!rec });
    } catch (e) { console.error('/client/email', e); clFail(res, 500, 'server'); }
});

async function clMakeLink(userId, x, by) {
    const token = clToken();
    await x.ref.update({ 'auth.telegramAutoLoginToken': token, 'auth.tokenGeneratedAt': new Date().toISOString() });
    await clLog(userId, { kind: 'acct', text: 'اتعمل رابط دخول جديد (القديم بطّل)', by });
    return `${CL_LOGIN_URL}?uid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
}
async function clSendLink(chatId, name, url) {
    const first = String(name || '').trim().split(/\s+/)[0];
    await bot.sendMessage(chatId,
        `${first ? 'أهلاً ' + clEsc(first) + ' 🌿\n' : ''}ده رابط دخولك للمنصة. دوس عليه وهتدخل على طول من غير باسورد.\n\nالرابط ده بتاعك لوحدك، فما تبعتهوش لحد.`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'ادخل المنصة', url }]] } });
}

app.post('/client/login-link', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId), send = !!(req.body && req.body.send);
        if (!userId) return clFail(res, 400, 'bad-request');
        const x = await clUser(userId);
        if (!x) return clFail(res, 404, 'not-found');
        let chatId = null;
        if (send) {
            chatId = await clChatFor(userId, x.u);
            if (!chatId) return clFail(res, 409, 'no-telegram');
        }
        const url = await clMakeLink(userId, x, clBy(req));
        if (send) {
            try { await clSendLink(chatId, (x.u.personalInfo || {}).name, url); }
            catch (e) {
                const blocked = e && e.response && e.response.statusCode === 403;
                return clFail(res, 502, blocked ? 'blocked' : 'send-failed', { url });
            }
        }
        res.json({ ok: true, url, sent: send });
    } catch (e) { console.error('/client/login-link', e); clFail(res, 500, 'server'); }
});

// ---------- الدمج ----------
function clSum(a, b, k) { return (Number((a || {})[k]) || 0) + (Number((b || {})[k]) || 0); }
app.post('/client/merge', requireAdmin, async (req, res) => {
    try {
        const keepId = clId(req.body && req.body.keepId), dropId = clId(req.body && req.body.dropId);
        if (!keepId || !dropId || keepId === dropId) return clFail(res, 400, 'bad-request');
        const keepRef = db.collection('users').doc(keepId), dropRef = db.collection('users').doc(dropId);
        const moved = await db.runTransaction(async tx => {
            const [ks, ds] = await Promise.all([tx.get(keepRef), tx.get(dropRef)]);
            if (!ks.exists || !ds.exists) throw Object.assign(new Error('not-found'), { status: 404 });
            const k = ks.data() || {}, d = ds.data() || {};
            if ((d.accountStatus || {}).status === 'merged') throw Object.assign(new Error('already-merged'), { status: 409 });
            const kEn = Array.isArray(k.enrollments) ? k.enrollments : [], dEn = Array.isArray(d.enrollments) ? d.enrollments : [];
            const have = new Set(kEn.map(e => e && e.id));
            const addEn = dEn.filter(e => e && !have.has(e.id)).map(e => Object.assign({}, e, { mergedFrom: dropId }));
            const kB = Array.isArray(k.badges) ? k.badges : [], dB = Array.isArray(d.badges) ? d.badges : [];
            const hasB = new Set(kB.map(b => b && (b.id || b.name)));
            const jp = k.journeyPoints || {}, wp = k.walletPoints || {}, djp = d.journeyPoints || {}, dwp = d.walletPoints || {};
            const now = new Date().toISOString();
            const prog = Object.assign({}, d.progress || {}, k.progress || {});
            tx.update(keepRef, {
                enrollments: kEn.concat(addEn),
                badges: kB.concat(dB.filter(b => b && !hasB.has(b.id || b.name))),
                progress: prog,
                'journeyPoints.balance': clSum(jp, djp, 'balance'), 'journeyPoints.lifetime': clSum(jp, djp, 'lifetime'),
                'journeyPoints.history': (jp.history || []).concat((djp.history || []).map(h => Object.assign({}, h, { mergedFrom: dropId }))),
                'walletPoints.balance': clSum(wp, dwp, 'balance'), 'walletPoints.lifetime': clSum(wp, dwp, 'lifetime'), 'walletPoints.used': clSum(wp, dwp, 'used'),
                'walletPoints.history': (wp.history || []).concat((dwp.history || []).map(h => Object.assign({}, h, { mergedFrom: dropId }))),
                'metadata.mergedIds': clFV().arrayUnion(dropId),
                'timestamps.lastUpdated': now
            });
            tx.update(dropRef, {
                'accountStatus.status': 'merged', 'accountStatus.mergedInto': keepId, 'accountStatus.mergedAt': now,
                'auth.telegramAutoLoginToken': clFV().delete()
            });
            return { enrollments: addEn.length, journey: Number(djp.balance) || 0, wallet: Number(dwp.balance) || 0, dropData: d };
        });
        // الحجوزات والكوبونات تروح للحساب اللي فاضل
        let bookings = 0;
        for (const c of ['tempBookings', 'individualStudents']) {
            const s = await db.collection(c).where('userId', '==', dropId).get().catch(() => ({ docs: [] }));
            for (const doc of s.docs) { await doc.ref.update({ userId: keepId, mergedFromUserId: dropId }); bookings++; }
        }
        const cps = await db.collection('coupons').where('forUserId', '==', dropId).get().catch(() => ({ docs: [] }));
        for (const doc of cps.docs) await doc.ref.update({ forUserId: keepId });
        // حساب الدخول القديم يتقفل (ما بيتمسحش)
        let authOff = false;
        try { const rec = await clAuthRecord(moved.dropData); if (rec) { await admin.auth().updateUser(rec.uid, { disabled: true }); await admin.auth().revokeRefreshTokens(rec.uid); authOff = true; } } catch (e) { console.error('merge auth', e && e.code); }
        // ملاحظات الحساب القديم تتنقل
        try {
            const n = await db.collection('client_notes').doc(dropId).get();
            if (n.exists && (n.data().items || []).length) await db.collection('client_notes').doc(keepId).set({ userId: keepId, items: clFV().arrayUnion(...n.data().items.map(i => Object.assign({}, i, { mergedFrom: dropId }))) }, { merge: true });
        } catch (e) {}
        const dn = ((moved.dropData.personalInfo || {}).name) || dropId;
        await clLog(keepId, { kind: 'acct', text: `اتدمج فيه حساب ${dn}: ${moved.enrollments} كورس و${bookings} حجز`, by: clBy(req), mergedFrom: dropId });
        await clLog(dropId, { kind: 'acct', text: 'الحساب ده اتدمج في حساب تاني واتقفل', by: clBy(req), mergedInto: keepId });
        res.json({ ok: true, enrollments: moved.enrollments, bookings, coupons: cps.docs.length, journey: moved.journey, wallet: moved.wallet, authDisabled: authOff });
    } catch (e) {
        if (e && e.status) return clFail(res, e.status, e.message);
        console.error('/client/merge', e); clFail(res, 500, 'server');
    }
});

app.post('/client/test-flag', requireAdmin, async (req, res) => {
    try {
        const userId = clId(req.body && req.body.userId), on = !!(req.body && req.body.isTest);
        if (!userId) return clFail(res, 400, 'bad-request');
        const x = await clUser(userId);
        if (!x) return clFail(res, 404, 'not-found');
        await x.ref.update({ 'metadata.isTest': on });
        let n = 0;
        for (const c of ['tempBookings', 'individualStudents']) {
            const s = await db.collection(c).where('userId', '==', userId).get().catch(() => ({ docs: [] }));
            for (const doc of s.docs) { await doc.ref.update({ isTestAccount: on }); n++; }
        }
        await clLog(userId, { kind: 'acct', text: on ? 'اتعلّم «حساب تجريبي»' : 'اتشالت علامة «تجريبي»', by: clBy(req) });
        res.json({ ok: true, bookings: n });
    } catch (e) { console.error('/client/test-flag', e); clFail(res, 500, 'server'); }
});

// ---------- الطالب كتب «نسيت الباسورد» ----------
const CL_FORGOT = /(نسيت|ناسي|ناسيه|مش فاكر|مش فاكره|مش عارف|مش عارفه|ضاع|ضايع|محتاج|عايز|عاوز|ابعت|ابعتلي).{0,25}(الباسورد|باسورد|الباس|كلمة السر|كلمه السر|الرقم السري|باسوورد|password|pass)|(forgot|forget).{0,15}pass/i;
const CL_CANT_LOGIN = /(مش عارف|مش عارفه|مش قادر|مش قادره|مبعرفش|معرفتش).{0,15}(ادخل|أدخل|اخش|أسجل دخول|اسجل دخول|افتح الحساب)/;
async function clOnText(chatId, text) {
    try {
        const t = String(text || '').trim();
        if (!t || t.length > 300 || !(CL_FORGOT.test(t) || CL_CANT_LOGIN.test(t))) return false;
        const ids = [String(chatId)];
        if (/^-?\d+$/.test(String(chatId))) ids.push(Number(chatId));
        const userIds = new Set();
        for (const c of ['tempBookings', 'individualStudents']) {
            const s = await db.collection(c).where('telegramChatId', 'in', ids).get().catch(() => ({ forEach() {} }));
            s.forEach(d => { const u = d.data().userId; if (u) userIds.add(String(u)); });
        }
        const live = [];
        for (const id of userIds) {
            const x = await clUser(id);
            if (x && !['merged', 'suspended'].includes((x.u.accountStatus || {}).status)) live.push({ id, x });
        }
        if (live.length !== 1) {
            await bot.sendMessage(chatId, live.length
                ? 'عندك أكتر من حساب، فهنبعتلك رابط الدخول الصح بنفسنا هنا في المحادثة 🌿'
                : 'مش لاقيين حساب على المنصة متربط بالمحادثة دي. هنراجع ونبعتلك بيانات الدخول هنا 🌿');
            await db.collection('telegramChats').doc(String(chatId)).set({ hasHelpRequest: true, helpCategory: 'نسي الباسورد', lastHelpAt: new Date().toISOString() }, { merge: true });
            return true;
        }
        const { id, x } = live[0];
        const url = await clMakeLink(id, x, 'البوت (الطالب كتب إنه نسي الباسورد)');
        await clSendLink(chatId, (x.u.personalInfo || {}).name, url);
        return true;
    } catch (e) { console.error('clOnText', e && e.message); return false; }
}
