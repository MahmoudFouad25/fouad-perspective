// اختبارات موديول ملف العميل: node server/tests/client.test.js
require('./harness.js');
const fs = require('fs'), path = require('path'), assert = require('assert');

// حساب الدخول الوهمي
const authUsers = {};
let authAuto = 0;
global.admin.auth = () => ({
    getUser: async uid => { if (!authUsers[uid]) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } return authUsers[uid]; },
    getUserByEmail: async email => { const u = Object.values(authUsers).find(x => x.email === email); if (!u) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } return u; },
    updateUser: async (uid, v) => {
        if (v.email && Object.values(authUsers).some(x => x.email === v.email && x.uid !== uid)) { const e = new Error('dup'); e.code = 'auth/email-already-exists'; throw e; }
        Object.assign(authUsers[uid], v);
    },
    revokeRefreshTokens: async uid => { authUsers[uid].revoked = (authUsers[uid].revoked || 0) + 1; }
});
function addAuth(email) { const uid = 'a' + (++authAuto); authUsers[uid] = { uid, email, disabled: false, metadata: { lastSignInTime: 'Fri, 23 Oct 2026 10:00:00 GMT', creationTime: 'Mon, 01 Sep 2026 10:00:00 GMT' } }; return uid; }
// transaction على نفس القاعدة الوهمية
global.db.runTransaction = async fn => {
    const writes = [];
    const tx = { get: r => r.get(), update: (r, v) => writes.push(() => r.update(v)) };
    const out = await fn(tx);
    for (const w of writes) await w();
    return out;
};

eval(fs.readFileSync(path.join(__dirname, '..', 'bot-client-routes.js'), 'utf8') + ';global.clOnText=clOnText;');

let n = 0;
const ok = (c, m) => { assert(c, m); n++; console.log('✓', m); };
const A = { admin: 1 };
const log = id => ((store.client_log || {})[id] || {}).items || [];

(async () => {
    const a1 = addAuth('mena@x.com');
    store.users = {
        u1: { personalInfo: { name: 'منة شريف', email: 'mena@x.com', whatsapp: '01011112222' }, auth: { authUid: a1 }, accountStatus: { status: 'active' },
              enrollments: [{ id: 'e1', title: 'الحضن الدافئ' }], journeyPoints: { balance: 100, lifetime: 120, history: [{ amount: 100 }] }, walletPoints: { balance: 50, lifetime: 50, history: [] }, badges: [{ id: 'welcome_badge' }] },
        u2: { personalInfo: { name: 'منة ش', email: 'mena2@x.com', whatsapp: '01011112222' }, accountStatus: { status: 'active' },
              enrollments: [{ id: 'e2', title: 'المحراب' }, { id: 'e1', title: 'الحضن الدافئ' }], journeyPoints: { balance: 30, lifetime: 30, history: [{ amount: 30 }] }, walletPoints: { balance: 10, lifetime: 10, used: 5, history: [] }, badges: [{ id: 'welcome_badge' }, { id: 'first_course_badge' }] }
    };
    store.tempBookings = { b1: { userId: 'u1', telegramChatId: 555, lastUpdated: '2026-10-01' }, b2: { userId: 'u2', telegramChatId: 556 } };

    // ===== الحماية =====
    ok((await call('/client/info', { userId: 'u1' })).code === 401, 'من غير أدمن: مرفوض');
    let r = await call('/client/info', { userId: 'u1' }, A);
    ok(r.ok && r.auth.exists && r.auth.uid === a1 && !r.vault.saved && !r.pin.set, 'المعلومات: حساب الدخول موجود، الخزنة فاضية، مفيش رقم سري');
    ok((await call('/client/info', { userId: '../x' }, A)).code === 400, 'رقم عميل فيه / مرفوض');

    // ===== الخزنة =====
    ok((await call('/client/vault/reveal', { userId: 'u1', pin: '123456' }, A)).error === 'no-pin', 'قبل الرقم السري: العرض مقفول');
    ok((await call('/client/vault/pin', { pin: '12' }, A)).error === 'weak-pin', 'رقم سري أقل من ٦ أرقام مرفوض');
    ok((await call('/client/vault/pin', { pin: '246810' }, A)).ok, 'الرقم السري اتحدد');
    const pinDoc = store.app_secrets.client_vault_pin;
    ok(pinDoc.hash && pinDoc.salt && !JSON.stringify(pinDoc).includes('246810'), 'الرقم السري مش محفوظ، بصمته بس');
    ok((await call('/client/vault/pin', { pin: '135791', oldPin: '000000' }, A)).error === 'wrong-pin', 'تغيير الرقم من غير القديم الصح: مرفوض');

    ok((await call('/client/vault/put', { userId: 'u1', password: 'fouad-4821' }, A)).ok, 'الباسورد اتحفظ في الخزنة');
    const box = store.client_vault.u1;
    ok(box.enc && box.iv && box.tag && !JSON.stringify(box).includes('fouad-4821'), 'المحفوظ مقفول، مش الباسورد نفسه');
    ok(!JSON.stringify(store.app_secrets.client_vault).includes('fouad'), 'المفتاح لوحده في app_secrets');
    r = await call('/client/info', { userId: 'u1' }, A); ok(r.vault.saved && r.pin.set, 'المعلومات: الخزنة فيها باسورد');

    r = await call('/client/vault/reveal', { userId: 'u1', pin: '246810' }, A);
    ok(r.ok && r.password === 'fouad-4821' && r.pass, 'الرقم الصح: الباسورد بيظهر ومعاه تصريح ١٠ دقايق');
    const pass = r.pass;
    ok((await call('/client/vault/reveal', { userId: 'u1', pass }, A)).password === 'fouad-4821', 'بالتصريح: مش محتاج الرقم تاني');
    ok(log('u1').some(x => /اتعرض/.test(x.text)), 'كل عرض بيتسجل في سجل العميل');
    r = await call('/client/vault/reveal', { userId: 'u2', pin: '246810' }, A);
    ok(r.ok && r.saved === false, 'عميل ما اتحطلوش باسورد من اللوحة: «مش محفوظ»');

    for (let i = 1; i <= 4; i++) {
        r = await call('/client/vault/reveal', { userId: 'u1', pin: '999999' }, A);
        ok(r.error === 'wrong-pin' && r.left === 5 - i, `محاولة غلط ${i}: فاضل ${5 - i}`);
    }
    ok((await call('/client/vault/reveal', { userId: 'u1', pass }, A)).error === 'pass-expired', 'بعد رقم غلط: التصريح القديم بطّل');
    r = await call('/client/vault/reveal', { userId: 'u1', pin: '999999' }, A);
    ok(r.code === 423 && r.error === 'locked' && r.lockedUntil > Date.now() + 59 * 60e3, 'المحاولة الخامسة: الخزنة اتقفلت ساعة');
    ok((await call('/client/vault/reveal', { userId: 'u1', pin: '246810' }, A)).error === 'locked', 'وهي مقفولة: حتى الرقم الصح مرفوض');
    store.app_secrets.client_vault_pin.lockedUntil = Date.now() - 1;
    ok((await call('/client/vault/reveal', { userId: 'u1', pin: '246810' }, A)).password === 'fouad-4821', 'بعد الساعة: الرقم الصح بيفتح');
    ok((await call('/client/vault/pin', { pin: '135791', oldPin: '246810' }, A)).ok && (await call('/client/vault/reveal', { userId: 'u1', pin: '135791' }, A)).ok, 'تغيير الرقم السري بالقديم: الجديد شغال');
    ok((await call('/client/vault/put', { userId: 'u1', password: '123' }, A)).code === 400, 'باسورد أقل من ٦ مش بيتحفظ');

    // ===== الحساب =====
    ok((await call('/client/account', { userId: 'u1', action: 'disable', reason: 'تجربة' }, A)).ok && authUsers[a1].disabled && authUsers[a1].revoked === 1 && store.users.u1.accountStatus.status === 'suspended', 'إيقاف: الدخول اتقفل فعلًا واتطلّع من الأجهزة');
    ok((await call('/client/account', { userId: 'u1', action: 'enable' }, A)).ok && !authUsers[a1].disabled && store.users.u1.accountStatus.status === 'active', 'رجوع الحساب: الدخول اتفتح');
    ok((await call('/client/account', { userId: 'u1', action: 'signout' }, A)).ok && authUsers[a1].revoked === 2, 'اطلع من كل الأجهزة');
    ok((await call('/client/account', { userId: 'u2', action: 'signout' }, A)).error === 'no-auth', 'من غير حساب دخول: «اطلع من الأجهزة» مرفوض بوضوح');

    // ===== الإيميل =====
    ok((await call('/client/email', { userId: 'u1', email: 'bad' }, A)).error === 'bad-email', 'إيميل غلط مرفوض');
    r = await call('/client/email', { userId: 'u1', email: 'MENA2@x.com' }, A);
    ok(r.error === 'email-used' && r.otherId === 'u2', 'إيميل عميل تاني: بيقولك مين');
    r = await call('/client/email', { userId: 'u1', email: 'Mena.New@x.com' }, A);
    ok(r.ok && r.authUpdated && store.users.u1.personalInfo.email === 'mena.new@x.com' && authUsers[a1].email === 'mena.new@x.com', 'تغيير الإيميل: الملف وحساب الدخول مع بعض');
    ok(log('u1').some(x => x.field === 'email' && x.from === 'mena@x.com'), 'التغيير متسجل بالقديم والجديد');

    // ===== رابط الدخول =====
    r = await call('/client/login-link', { userId: 'u1', send: true }, A);
    const tok = store.users.u1.auth.telegramAutoLoginToken;
    ok(r.ok && r.sent && r.url.includes('uid=u1') && r.url.includes(encodeURIComponent(tok)) && sent.at(-1).chatId === '555', 'رابط دخول جديد اتبعت على تليجرام العميل');
    ok(/ادخل المنصة/.test(JSON.stringify(sent.at(-1).opts)), 'الرسالة فيها زرار الدخول');
    r = await call('/client/login-link', { userId: 'u1' }, A);
    ok(r.ok && store.users.u1.auth.telegramAutoLoginToken !== tok, 'رابط تاني: القديم بطّل');
    store.users.u3 = { personalInfo: { name: 'من غير تليجرام' } };
    ok((await call('/client/login-link', { userId: 'u3', send: true }, A)).error === 'no-telegram', 'من غير تليجرام: بيقولك بدل ما يفشل ساكت');
    blockedIds.add('555');
    r = await call('/client/login-link', { userId: 'u1', send: true }, A);
    ok(r.error === 'blocked' && r.url, 'الطالب قافل البوت: بيرجع الرابط علشان تبعته واتساب');
    blockedIds.delete('555');

    // ===== «نسيت الباسورد» =====
    let k = sent.length;
    ok(await clOnText(555, 'نسيت الباسورد بتاعي') === true && sent.length === k + 1 && /رابط دخولك/.test(sent.at(-1).text), '«نسيت الباسورد»: البوت بعت رابط الدخول');
    ok(await clOnText(555, 'مش عارف ادخل على المنصة') === true, '«مش عارف أدخل»: نفس الرد');
    ok(await clOnText(555, 'الدرس التالت جميل جدا') === false, 'كلام عادي: الموديول ما بيردش');
    ok(await clOnText(777, 'نسيت الباسورد') === true && /مش لاقيين حساب/.test(sent.at(-1).text) && store.telegramChats['777'].hasHelpRequest, 'محادثة من غير حساب: طلب مساعدة للأدمن');

    // ===== علامة «تجريبي» =====
    ok((await call('/client/test-flag', { userId: 'u2', isTest: true }, A)).bookings === 1 && store.users.u2.metadata.isTest && store.tempBookings.b2.isTestAccount, 'علامة «تجريبي» على الحساب وحجوزاته');

    // ===== الدمج =====
    store.coupons = { c1: { forUserId: 'u2', code: 'X' } };
    store.client_notes = { u2: { userId: 'u2', items: [{ text: 'اتفقنا آخر الشهر', pinned: true }] } };
    ok((await call('/client/merge', { keepId: 'u1', dropId: 'u1' }, A)).code === 400, 'دمج الحساب في نفسه مرفوض');
    r = await call('/client/merge', { keepId: 'u1', dropId: 'u2' }, A);
    const k1 = store.users.u1;
    ok(r.ok && r.enrollments === 1 && k1.enrollments.length === 2 && k1.enrollments[1].mergedFrom === 'u2', 'الدمج: الكورس الجديد اتنقل، والمتكرر ما اتكررش');
    ok(k1.journeyPoints.balance === 130 && k1.walletPoints.balance === 60 && k1.walletPoints.used === 5, 'النقاط اتجمعت');
    ok(k1.badges.length === 2, 'الشارات من غير تكرار');
    ok(store.tempBookings.b2.userId === 'u1' && store.coupons.c1.forUserId === 'u1', 'الحجوزات والكوبونات راحت للحساب اللي فاضل');
    ok(store.users.u2.accountStatus.status === 'merged' && store.users.u2.accountStatus.mergedInto === 'u1', 'الحساب التاني اتقفل ومكتوب عليه اتدمج في مين (ما اتمسحش)');
    ok((store.client_notes.u1.items || []).length === 1, 'الملاحظات اتنقلت');
    ok((await call('/client/merge', { keepId: 'u1', dropId: 'u2' }, A)).error === 'already-merged', 'دمج تاني لنفس الحساب مرفوض');

    console.log(`\nكل الاختبارات عدّت (${n})`);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
