// اختبارات موديول تجهيز الطلاب: node js/tests/student-setup.test.js
// بيشغّل المنطق القديم (من صفحة الحجوزات الفردية قبل إعادة البناء، commit 7888e81) والموديول الجديد
// على نفس البيانات، ويقارن اللي اتكتب في القاعدة.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), cp = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OLD_REV = '7888e81';
const OLD_PAGE = cp.execSync('git show ' + OLD_REV + ':"admin/bookings/creat&allow.html"', { cwd: ROOT, maxBuffer: 1 << 26 }).toString();

// ---------- قاعدة وهمية ----------
function makeWorld(seed) {
  const DATA = JSON.parse(JSON.stringify(seed));
  const sent = [], serverCalls = [];
  let reads = 0;
  const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  function AU(v) { this.v = v; } function AR(v) { this.v = v; } function DEL() {} function INC(n) { this.n = n; } function TS() {}
  const rows = c => (DATA[c] = DATA[c] || {});
  const getp = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
  function put(o, k, v) {
    const ks = k.split('.'); let t = o;
    for (let i = 0; i < ks.length - 1; i++) { if (t[ks[i]] == null || typeof t[ks[i]] !== 'object') t[ks[i]] = {}; t = t[ks[i]]; }
    const l = ks[ks.length - 1];
    if (v instanceof DEL) delete t[l];
    else if (v instanceof AU) { const a = Array.isArray(t[l]) ? t[l] : []; v.v.forEach(x => { if (!a.some(y => JSON.stringify(y) === JSON.stringify(x))) a.push(clone(x)); }); t[l] = a; }
    else if (v instanceof AR) { t[l] = (Array.isArray(t[l]) ? t[l] : []).filter(y => !v.v.some(x => JSON.stringify(x) === JSON.stringify(y))); }
    else if (v instanceof INC) t[l] = (Number(t[l]) || 0) + v.n;
    else if (v instanceof TS) t[l] = '<server-ts>';
    else if (v && typeof v === 'object' && !Array.isArray(v)) { t[l] = {}; Object.keys(v).forEach(kk => put(t[l], kk, v[kk])); }
    else t[l] = clone(v);
  }
  const snapOf = (col, id) => { const d = rows(col)[id]; return { id, exists: !!d, data: () => clone(d), ref: new Ref(col, id) }; };
  function Ref(col, id) { this.col = col; this.id = id; this.parent = { id: col }; }
  Ref.prototype.get = function () { reads++; return Promise.resolve(snapOf(this.col, this.id)); };
  Ref.prototype.set = function (v, o) { const r = rows(this.col); if (!r[this.id] || !(o && o.merge)) r[this.id] = {}; Object.keys(v).forEach(k => put(r[this.id], k, v[k])); return Promise.resolve(); };
  Ref.prototype.update = function (v) { const d = rows(this.col)[this.id]; if (!d) return Promise.reject(new Error('no doc ' + this.col + '/' + this.id)); Object.keys(v).forEach(k => put(d, k, v[k])); return Promise.resolve(); };
  function Q(col, f, lim) { this.col = col; this.f = f || []; this.lim = lim; }
  Q.prototype.where = function (a, op, v) { return new Q(this.col, this.f.concat([[a, op, v]]), this.lim); };
  Q.prototype.limit = function (n) { return new Q(this.col, this.f, n); };
  Q.prototype.orderBy = function () { return this; };
  Q.prototype.doc = function (id) { return new Ref(this.col, id); };
  Q.prototype.get = function () {
    let ids = Object.keys(rows(this.col)).filter(id => this.f.every(([a, op, v]) => {
      const x = getp(rows(this.col)[id], a);
      return op === '==' ? x === v : op === 'in' ? v.includes(x) : op === 'array-contains' ? Array.isArray(x) && x.includes(v) : op === '!=' ? x !== v && x != null : true;
    }));
    if (this.lim) ids = ids.slice(0, this.lim);
    reads += Math.max(1, ids.length);
    const docs = ids.map(id => snapOf(this.col, id));
    return Promise.resolve({ docs, empty: !docs.length, size: docs.length, forEach: fn => docs.forEach(fn) });
  };
  const fsFn = () => ({
    collection: n => new Q(n),
    runTransaction: async fn => { const w = []; const out = await fn({ get: r => r.get(), update: (r, v) => w.push(() => r.update(v)), set: (r, v, o) => w.push(() => r.set(v, o)) }); for (const x of w) await x(); return out; },
    batch: () => { const w = []; return { update: (r, v) => w.push(() => r.update(v)), set: (r, v, o) => w.push(() => r.set(v, o)), commit: async () => { for (const x of w) await x(); } }; }
  });
  fsFn.FieldValue = { arrayUnion: (...a) => new AU(a), arrayRemove: (...a) => new AR(a), delete: () => new DEL(), increment: n => new INC(n), serverTimestamp: () => new TS() };
  fsFn.DocumentReference = Ref;
  const firebase = { firestore: fsFn, auth: () => ({ currentUser: { getIdToken: () => Promise.resolve('t') } }) };

  // البوت: send-custom-message + login-link + admin-secure-password
  async function botFetch(url, opt) {
    const body = JSON.parse(opt.body || '{}');
    serverCalls.push([url.replace(/^.*telegramBot/, ''), body]);
    const ok = j => ({ ok: true, status: 200, json: async () => j });
    if (/send-custom-message$/.test(url)) { sent.push(body); return ok({ success: true }); }
    if (/\/client\/login-link$/.test(url)) {
      const u = rows('users')[body.userId]; if (!u) return { ok: false, status: 404, json: async () => ({ ok: false, error: 'not-found' }) };
      const token = 'srv' + serverCalls.length; put(u, 'auth.telegramAutoLoginToken', token);
      return ok({ ok: true, url: 'https://x/login.html?uid=' + body.userId + '&token=' + token });
    }
    if (/admin-secure-password$/.test(url)) { const u = rows('users')[body.userId]; if (u && u.auth) { u.auth.secured = true; delete u.auth.tempPassword; } return ok({ ok: true }); }
    return ok({ ok: true });
  }
  return { DATA, sent, serverCalls, firebase, botFetch, reads: () => reads };
}

function context(w, extra) {
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} }, firebase: w.firebase, botFetch: w.botFetch,
    btoa: s => Buffer.from(String(s), 'binary').toString('base64'), crypto: require('crypto').webcrypto,
    setTimeout, Promise, Date, Math, JSON, Object, Array, String, Number, Error, Uint32Array, URLSearchParams
  }, extra || {});
  ctx.window = ctx;
  ctx.PasswordSafe = { secure: id => w.botFetch('https://bot/telegramBot/auth/admin-secure-password', { body: JSON.stringify({ userId: id }) }).then(r => r.json()) };
  vm.createContext(ctx);
  return ctx;
}

// ---------- المنطق القديم ----------
function oldSource() {
  const lines = OLD_PAGE.split('\n');
  const grab = (startRe, endRe) => {
    const s = lines.findIndex(l => startRe.test(l)); assert(s >= 0, 'old: ' + startRe);
    let e = s + 1; while (e < lines.length && !endRe.test(lines[e])) e++;
    return lines.slice(s, e).join('\n');
  };
  return [
    'var db = firebase.firestore(); var allStudents = []; var currentFilter = "all";',
    'var Swal = { fire: async () => ({ isConfirmed: true }) };',
    grab(/^const UserStructure = \{/, /^\s*\/\/ نظام رتب منظور الفؤاد - البنية الجديدة/),
    grab(/^const EnrollmentManager = \{/, /^\s*async function addJourneyPoints/),
    grab(/^async function addDualPoints/, /^\/\/ دالة استخدام نقاط المحفظة فقط/),
    grab(/^async function findExistingUserAccount/, /^\s*\/\/ تحديد المودويلات المطلوبة/),
    grab(/^function getStudentModules/, /^window\.getStudentModules/),
    grab(/^async function autoAssignCourse/, /^\/\/ تعريض الدوال للاستخدام العام/),
    'this.oldRun = autoCreateAccountAndAssignCourse;'
  ].join('\n');
}

// ---------- مقارنة ----------
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function scrub(x, k) {
  if (Array.isArray(x)) return x.map(v => scrub(v));
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach(kk => { o[kk] = scrub(x[kk], kk); }); return o; }
  if (typeof x === 'string') {
    if (ISO.test(x)) return '<ts>';
    if (/^enrollment-\d+-/.test(x)) return '<enr>';
    if (/^discount-\d+-/.test(x)) return '<disc>';
    if (/^offer-\d+$/.test(x)) return '<offer>';
    if (k === 'myCode') return '<ref>';
    if (/-\d{6}-[a-z0-9]{2,3}$/.test(x)) return '<slug>';
  }
  return x;
}
function diffs(a, b, p, out) {
  out = out || []; p = p || '';
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    new Set(Object.keys(a).concat(Object.keys(b))).forEach(k => diffs(a[k], b[k], p ? p + '.' + k : k, out));
  } else if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    a.forEach((v, i) => diffs(v, b[i], p + '[' + i + ']', out));
  } else out.push(p);
  return out;
}

let n = 0;
const ok = (c, m) => { assert(c, m); n++; console.log('✓', m); };

// ---------- البيانات ----------
const COURSES = {
  c1: { title: 'كورس الميزان', slug: 'mizan', whatsappGroupLink: 'https://chat.whatsapp.com/x', pricing: { basePrice: 3000 } },
  c2: { title: 'المرايا', pricing: { basePrice: 1500 } },
  c3: { title: 'سبورة', pricing: { basePrice: 1000 }, accessMonths: 12 }
};
function booking(over) {
  const pd = over.paymentDetails || { type: 'full', fullyPaid: true, totalAmount: 2500, paidAmount: 2500, remainingAmount: 0 };
  return Object.assign({
    customer: { name: 'سارة أحمد', whatsapp: '01012345678', email: 'sara@example.com', age: 30, gender: 'f', country: 'مصر', city: 'القاهرة', job: 'مهندسة', expectations: 'أفهم نفسي' },
    courseName: 'كورس الميزان', pricing: { basePrice: '3,000 ج.م', basePriceNumber: 3000, finalPrice: '2,500 ج.م', finalPriceNumber: 2500 },
    discounts: [{ type: 'early', label: 'حجز مبكر', amount: 500 }], totalSavings: 500,
    paymentConfirmed: true, status: 'paid', telegramChatId: 777, paymentDetails: pd,
    paymentInfo: { isInstallment: pd.type === 'installment', fullyPaid: !!pd.fullyPaid, paidAmount: pd.paidAmount, totalInstallments: pd.totalInstallments || 0, paidInstallments: pd.paidInstallments || 0, installmentSchedule: pd.installmentSchedule || [] },
    accountStatus: 'pending_creation', accountCreated: false, userId: null, courseAssigned: false
  }, over);
}

async function both(seed, id, newOpts) {
  const wo = makeWorld(seed), wn = makeWorld(seed);
  const co = context(wo); vm.runInContext(oldSource(), co);
  const ro = await co.oldRun(id, true);
  const cn = context(wn); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), cn);
  const p = await cn.StudentSetup.plan(id);
  const rn = await cn.StudentSetup.run(p, Object.assign({ welcome: true }, newOpts || {}));
  return { wo, wn, ro, rn, p, S: cn.StudentSetup };
}
function userOf(w, exclude) { const ids = Object.keys(w.DATA.users || {}).filter(x => !(exclude || []).includes(x)); return w.DATA.users[ids[ids.length - 1]]; }

(async () => {
  // ١) حساب جديد + كورس واحد مدفوع كامل
  {
    const seed = { courses: COURSES, users: {}, individualStudents: { b1: booking({}) } };
    const { wo, wn, ro, rn, p } = await both(seed, 'b1');
    ok(ro.success && p.kind === 'create', 'حجز جديد: الخطة «حساب جديد»');
    const uo = userOf(wo), un = userOf(wn);
    const d = diffs(scrub(uo), scrub(un)).filter(k => !['telegramChatId', 'auth.telegramAutoLoginToken', 'auth.tokenGeneratedAt'].includes(k) && !/^metadata\.(source)$/.test(k));
    ok(d.length === 0, 'حساب جديد: نفس بنية الحساب والتخصيص والنقاط زي القديم' + (d.length ? ' — فرق: ' + d.join(', ') : ''));
    ok(un.journeyPoints.balance === 50 + 50 + 250 && un.walletPoints.balance === 350, 'النقاط: ٥٠ حساب + ٥٠ تخصيص + ٢٥٠ من المدفوع');
    ok(un.enrollments.length === 1 && un.enrollments[0].bookingId === 'b1' && un.enrollments[0].courseId === 'c1', 'الاشتراك مربوط بالحجز والكورس الصح');
    ok(un.enrollments[0].pricing.finalPrice === 2500 && un.enrollments[0].payment.paidAmount === 2500, 'سعر وفلوس الاشتراك من الحجز');
    ok(un.telegramChatId === '777', 'الحساب الجديد شايل رقم التليجرام');
    ok(!un.auth.tempPassword && un.auth.secured, 'الباسورد اتنقل لحساب الدخول ومش مكتوب في الملف');
    const so = wo.DATA.individualStudents.b1, sn = wn.DATA.individualStudents.b1;
    const ds = diffs(scrub(so), scrub(sn)).filter(k => !['welcomeSentAt', 'progress.welcomeMessage', 'automationCompleted.autoLoginUrl'].includes(k));
    ok(ds.length === 0, 'الحجز: نفس الحقول زي القديم' + (ds.length ? ' — فرق: ' + ds.join(', ') : ''));
    ok(sn.automationCompleted.credentialsSent === true && sn.automationCompleted.whatsappLinkSent === true, 'الترحيب اتسجّل إنه اتبعت ومعاه جروب الواتساب');
    const m = wn.sent[0];
    ok(wn.sent.length === 1 && m.chatId === 777 && /sara@example\.com/.test(m.message) && m.message.includes(rn.password), 'رسالة الترحيب فيها الإيميل والباسورد');
    ok(m.buttons[0][0].url.includes('token=srv') && m.buttons[1][0].url === 'https://chat.whatsapp.com/x', 'زرار الدخول من رابط السيرفر وزرار الجروب');
    ok(!JSON.stringify(wn.DATA).includes(rn.password), 'الباسورد مش مكتوب في أي حتة في القاعدة');
    ok(!Object.keys(rn).includes('password'), 'الباسورد مش ظاهر في نتيجة العملية (للواتساب بس)');
  }

  // ٢) باقة: المودويل الأول بالسعر والباقي مشمول، ومدة الكورس من إعداده
  {
    const seed = { courses: COURSES, users: {}, individualStudents: { b2: booking({ courseModules: ['كورس الميزان', 'سبورة', 'المرايا'] }) } };
    const { wo, wn, rn } = await both(seed, 'b2');
    const uo = userOf(wo), un = userOf(wn);
    ok(un.enrollments.length === 3 && un.enrollments[1].includedInPackage && un.enrollments[2].pricing.finalPrice === 0, 'الباقة: ٣ اشتراكات والتانيين مشمولين بصفر');
    const d = diffs(scrub(uo.enrollments), scrub(un.enrollments)).filter(k => !/^\[1\]\.(dates\.endDate|courseInfo\.duration)$/.test(k));
    ok(d.length === 0, 'الباقة: نفس الاشتراكات زي القديم (ماعدا مدة «سبورة» من إعداد الكورس)' + (d.length ? ' — ' + d.join(', ') : ''));
    ok(un.enrollments[1].courseInfo.duration === '12 شهر', 'الكورس اللي عليه accessMonths=12 خد سنة');
    ok(rn.assigned.count === 3, 'النتيجة: ٣ مودويل اتخصصوا');
    ok(uo.financial.totalPaid === un.financial.totalPaid && un.financial.totalPaid === 2500, 'الإجماليات المالية زي القديم');
  }

  // ٣) أقساط
  {
    const pd = { type: 'installment', totalAmount: 3000, paidAmount: 1000, remainingAmount: 2000, totalInstallments: 3, paidInstallments: 1, installmentSchedule: [{ amount: 1000, dueDate: '2026-10-01', status: 'paid' }, { amount: 1000, dueDate: '2026-11-01', status: 'pending' }, { amount: 1000, dueDate: '2026-12-01', status: 'pending' }] };
    const seed = { courses: COURSES, users: {}, individualStudents: { b3: booking({ paymentDetails: pd, pricing: { basePriceNumber: 3000, finalPriceNumber: 3000 } }) } };
    const { wo, wn } = await both(seed, 'b3');
    const uo = userOf(wo), un = userOf(wn);
    ok(diffs(scrub(uo.enrollments), scrub(un.enrollments)).length === 0, 'أقساط: نفس جدول الأقساط في الاشتراك');
    ok(un.journeyPoints.balance === 50 + 50 + 100, 'أقساط: النقاط من القسط المدفوع بس');
  }

  // ٤) حساب موجود بنفس الإيميل: ربط من غير سؤال
  {
    const seed = { courses: COURSES, users: { 'sara-1': { id: 'sara-1', personalInfo: { name: 'سارة', email: 'Sara@Example.com', whatsapp: '01099999999' }, enrollments: [], journeyPoints: { balance: 10, lifetime: 10, history: [] }, walletPoints: { balance: 10, lifetime: 10, history: [] }, auth: {} } }, individualStudents: { b4: booking({}) } };
    const { wo, wn, p } = await both(seed, 'b4');
    ok(p.kind === 'link' && p.candidate.userId === 'sara-1' && p.candidate.how === 'email', 'نفس الإيميل: الخطة «ربط» على طول');
    ok(Object.keys(wn.DATA.users).length === 1, 'ما اتعملش حساب مكرر');
    const uo = wo.DATA.users['sara-1'], un = wn.DATA.users['sara-1'];
    ok(diffs(scrub(uo.enrollments), scrub(un.enrollments)).length === 0 && un.journeyPoints.balance === uo.journeyPoints.balance, 'الربط: نفس التخصيص والنقاط زي القديم');
    ok(wn.DATA.individualStudents.b4.linkedToExistingAccount === true && wn.DATA.individualStudents.b4.userId === 'sara-1', 'الحجز اتربط بالحساب');
    ok(!/🔑/.test(wn.sent[0].message), 'رسالة الحساب الموجود من غير باسورد');
  }

  // ٥) نفس التليفون وإيميل مختلف: محتاج قرار
  {
    const users = { 'old-1': { id: 'old-1', personalInfo: { name: 'سارة القديمة', email: 'other@example.com', whatsapp: '+201012345678' }, enrollments: [], auth: {} } };
    const w = makeWorld({ courses: COURSES, users, individualStudents: { b5: booking({}) } });
    const c = context(w); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), c);
    const S = c.StudentSetup;
    const p = await S.plan('b5');
    ok(p.kind === 'ask' && p.candidate.userId === 'old-1' && p.candidate.how === 'phone', 'نفس التليفون وإيميل مختلف: «مستني قرارك»');
    let threw = false; try { await S.run(p, {}); } catch (e) { threw = /قرارك/.test(e.message); }
    ok(threw, 'من غير قرار: ما بيعملش حاجة');
    ok(Object.keys(w.DATA.users).length === 1 && !w.DATA.individualStudents.b5.userId, 'ولا اتكتب حاجة');
    const r = await S.run(p, { decision: 'create', welcome: false });
    ok(r.isNew && Object.keys(w.DATA.users).length === 2, 'قرار «شخص تاني»: حساب جديد');
    ok(w.DATA.individualStudents.b5.accountReviewDecision === 'different_person' && w.DATA.individualStudents.b5.courseAssigned === true, 'القرار اتسجّل والكورس اتخصص');
    ok(w.sent.length === 0, 'welcome:false ما بعتش رسالة');
  }

  // ٦) قرار «نفس الشخص» لحجز متعلّم للمراجعة
  {
    const users = { 'old-2': { id: 'old-2', personalInfo: { name: 'س', email: 'x@y.com', phone: '01012345678' }, enrollments: [], auth: {} } };
    const w = makeWorld({ courses: COURSES, users, individualStudents: { b6: booking({ needsAccountReview: true, accountReviewReason: 'matched_existing_phone', accountReviewCandidate: 'old-2' }) } });
    const c = context(w); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), c);
    const S = c.StudentSetup;
    ok(S.queueState(w.DATA.individualStudents.b6) === 'review', 'الحجز المتعلّم للمراجعة في «مستني قرارك»');
    const p = await S.plan('b6');
    ok(p.kind === 'ask' && p.candidate.userId === 'old-2', 'الخطة بتجيب المرشّح المحفوظ');
    await S.run(p, { decision: 'link', welcome: true });
    const b = w.DATA.individualStudents.b6;
    ok(b.userId === 'old-2' && !('needsAccountReview' in b) && b.accountReviewDecision === 'same_person', 'اتربط وعلامة المراجعة اتشالت');
    ok(w.DATA.users['old-2'].enrollments.length === 1 && S.queueState(b) === 'done', 'الكورس اتخصص والحجز خلص');
  }

  // ٧) حساب موجود ومن غير كورس + إعادة التشغيل ما بتكررش
  {
    const users = { 'u-7': { id: 'u-7', personalInfo: { name: 'م', email: 'm@m.com' }, enrollments: [], auth: {} } };
    const w = makeWorld({ courses: COURSES, users, individualStudents: { b7: booking({ userId: 'u-7', accountCreated: true, accountStatus: 'active' }) } });
    const c = context(w); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), c);
    const S = c.StudentSetup;
    ok(S.queueState(w.DATA.individualStudents.b7) === 'nocourse', '«حساب من غير كورس»');
    const p = await S.plan('b7');
    ok(p.kind === 'assign', 'الخطة «خصص كورس» بس');
    await S.run(p, { welcome: false });
    ok(w.DATA.users['u-7'].enrollments.length === 1, 'اتخصص');
    ok(S.queueState(w.DATA.individualStudents.b7) === 'nowelcome', 'اتجهّز وفاضل الترحيب: «ما اتبعتلوش ترحيب»');
    const again = await S.plan('b7');
    ok(again.kind === 'done', 'الحجز اللي خلص: الخطة «خلص»');
    await S.assignModules('b7', 'u-7');
    ok(w.DATA.users['u-7'].enrollments.length === 1 && w.DATA.users['u-7'].journeyPoints.balance === 300, 'التخصيص تاني ما بيكررش الكورس ولا النقاط');
    await S.sendWelcome({ student: S.normalize('b7', w.DATA.individualStudents.b7), userId: 'u-7', isNew: false });
    ok(S.queueState(w.DATA.individualStudents.b7) === 'done', 'بعد الترحيب: خلص');
  }

  // ٨) تخصيص يدوي وتغيير كورس
  {
    const users = { 'u-8': { id: 'u-8', personalInfo: { name: 'ع' }, enrollments: [], auth: {}, journeyPoints: { balance: 0, history: [] }, walletPoints: { balance: 0, history: [] } } };
    const w = makeWorld({ courses: COURSES, users, individualStudents: {} });
    const c = context(w); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), c);
    const S = c.StudentSetup;
    const en = await S.assignCourse('u-8', { courseId: 'c2', title: 'المرايا', startDate: '2026-01-31', months: 1, price: 1500, paid: 500 });
    const u = w.DATA.users['u-8'];
    ok(en.dates.endDate === '2026-02-28', 'تخصيص يدوي: آخر الشهر بيتظبط (٣١ يناير + شهر = ٢٨ فبراير)');
    ok(u.enrollments[0].payment.paidAmount === 500 && u.enrollments[0].payment.remainingAmount === 1000 && u.enrollments[0].payment.status === 'partial', 'تخصيص يدوي: المدفوع والباقي');
    ok(u.financial.totalPaid === 500 && u.financial.totalDue === 1000 && u.journeyPoints.balance === 100, 'تخصيص يدوي: الإجماليات والنقاط (٥٠ + ٥٠)');
    let dup = false; try { await S.assignCourse('u-8', { courseId: 'c2', title: 'المرايا', startDate: '2026-10-01', months: 6, price: 0 }); } catch (e) { dup = /متخصص له/.test(e.message); }
    // الاشتراك الأول خلص في فبراير، فالتاني مسموح
    ok(!dup, 'الاشتراك القديم منتهي، فالتخصيص الجديد عدّى');
    const u2 = w.DATA.users['u-8'];
    ok(u2.enrollments.length === 2, 'كورس منتهي ينفع يتخصص تاني');
    let dup2 = false; try { await S.assignCourse('u-8', { title: 'المرايا', price: 0 }); } catch (e) { dup2 = /متخصص له/.test(e.message); }
    ok(dup2, 'كورس شغال ما يتخصصش تاني من غير قصد');
    const made = await S.changeCourse('u-8', u2.enrollments[1].id, { id: 'c3', title: 'سبورة' });
    const u3 = w.DATA.users['u-8'];
    ok(u3.enrollments.length === 3 && u3.enrollments[1].status.current === 'cancelled' && u3.enrollments[1].changedTo === made.id, 'تغيير الكورس: القديم اتقفل (مش اتمسح)');
    ok(made.title === 'سبورة' && made.dates.endDate === u3.enrollments[1].dates.endDate && made.previousEnrollmentId === u3.enrollments[1].id, 'الجديد بنفس المدة ومربوط بالقديم');
    ok(u3.financial.totalPaid === 500 && u3.financial.totalDue === 1000, 'الفلوس ما اتحسبتش مرتين');
  }

  // ٩) حالات الطابور
  {
    const w = makeWorld({});
    const c = context(w); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'student-setup.js'), 'utf8'), c);
    const S = c.StudentSetup, old = new Date(Date.now() - 40 * 864e5).toISOString();
    ok(S.queueState({ paymentConfirmed: false }) === 'off', 'مش مدفوع: برّه الطابور');
    ok(S.queueState({ paymentConfirmed: true }) === 'new', 'مدفوع ومن غير حساب: جديد');
    ok(S.queueState({ paymentConfirmed: true, userId: 'u', courseAssigned: true, telegramChatId: 1, courseAssignedAt: old }) === 'done', 'ترحيب قديم ناقص (أكتر من أسبوعين): ما بيرجعش الطابور');
    ok(S.queueState({ paymentConfirmed: true, userId: 'u', courseAssigned: true, courseAssignedAt: new Date().toISOString() }) === 'done', 'من غير تليجرام: خلص');
    ok(S.queueState({ paymentConfirmed: true, userId: 'u', courseAssigned: true, telegramChatId: 1, courseAssignedAt: new Date().toISOString(), welcomeSkipped: true }) === 'done', '«مش محتاج ترحيب»: خلص');
  }

  console.log('\n' + n + ' اختبار عدّى');
})().catch(e => { console.error('✗', e && e.stack || e); process.exit(1); });
