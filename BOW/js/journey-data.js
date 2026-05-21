/* ====================================================================
   منظور الفؤاد — هندسة العقلية — Journey Data Layer
   يلفّ Firebase/Firestore. لو Firebase موجود (../js/firebase-config.js
   مرفوع جنب الصفحة) — بيقرأ ويكتب في Firestore. غير كده — كل الدوال
   بترجع null بهدوء، والرحلة بتشتغل بالكامل من الذاكرة.

   الكولكشن: journey_participants  (منفصل تمامًا عن تشخيص الويبينار القديم)
   يعتمد على: result-codes.js + journey-content.js (للخرائط)
   ──────────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  const COLLECTION = 'journey_participants';

  /* ── توافر Firebase ── */
  function hasFirebase() {
    return typeof firebase !== 'undefined'
        && firebase.firestore
        && firebase.apps
        && firebase.apps.length > 0;
  }
  function db()  { return firebase.firestore(); }
  function col() { return db().collection(COLLECTION); }
  function now() {
    return (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();
  }

  /* ── كود النتيجة ── */
  function makeCode() {
    return (global.ResultCodes && global.ResultCodes.randomCode)
      ? global.ResultCodes.randomCode()
      : 'JQ' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  /* ════════════════════════════════════════════════════════════
     (1) إنشاء المشارك عند التسجيل (المحطة ١)
     ──────────────────────────────────────────────────────────── */
  async function register(user) {
    if (!hasFirebase()) return null;
    const code = makeCode();
    const payload = {
      name:        (user && user.name)     || '',
      email:       (user && user.email)    || '',
      job:         (user && user.job)      || '',
      age_range:   (user && user.ageRange) || '',
      whatsapp:    '',
      consent_whatsapp: false,
      result_code: code,
      current_station: 1,
      completed: false,
      created_at:  now(),
      completed_at: null,
      whatsapp_sent_at: null,
      choices: null,
      fingerprint: null
    };
    try {
      const ref = await col().add(payload);
      return { id: ref.id, code };
    } catch (err) {
      console.warn('journey register failed:', err);
      return null;
    }
  }

  /* ════════════════════════════════════════════════════════════
     (2) حفظ رقم الواتس + الموافقة (المحطة ٤)
     ──────────────────────────────────────────────────────────── */
  async function saveContact(id, contact) {
    if (!hasFirebase() || !id) return null;
    try {
      await col().doc(id).set({
        whatsapp:         (contact && contact.whatsapp) || '',
        consent_whatsapp: !!(contact && contact.consentWhatsapp),
        current_station:  4
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('journey saveContact failed:', err);
      return null;
    }
  }

  /* ════════════════════════════════════════════════════════════
     (3) الحفظ النهائي عند عرض البصمة (نهاية الرحلة)
     ──────────────────────────────────────────────────────────── */
  async function finalize(id, p) {
    if (!hasFirebase() || !id) return null;
    const fp  = p.fingerprint || {};
    const ch  = p.choices || {};
    const cov = ch.station7_covenant || { line1: '', line2: '', line3: '' };
    try {
      await col().doc(id).set({
        name:      (p.user && p.user.name)     || '',
        email:     (p.user && p.user.email)    || '',
        job:       (p.user && p.user.job)      || '',
        age_range: (p.user && p.user.ageRange) || '',
        whatsapp:  (p.user && p.user.whatsapp) || '',
        consent_whatsapp: !!(p.user && p.user.consentWhatsapp),
        result_code: p.code || makeCode(),
        completed: true,
        completed_at: now(),
        current_station: 7,
        choices: ch,
        fingerprint: fp,
        // حقول مُسطّحة لتسهيل عرض الأدمن والتقرير
        level:           ch.station2_level || null,
        first_thought:   ch.station3_firstThought || null,
        main_axis:       fp.axis || null,
        secondary_axis:  ch.station4_axisSub || null,
        door:            fp.door || null,
        flavor:          fp.flavor != null ? fp.flavor : null,
        fingerprint_name: fp.name || null,
        burnout_type:    fp.burnoutType || null,
        covenant: cov
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('journey finalize failed:', err);
      return null;
    }
  }

  /* ════════════════════════════════════════════════════════════
     تشكيل المستند → شكل موحّد للقراءة
     ──────────────────────────────────────────────────────────── */
  function pickDate(...cands) {
    for (const c of cands) {
      if (!c) continue;
      if (typeof c.toDate === 'function') return c.toDate();
      if (c instanceof Date) return c;
      if (typeof c === 'number') return new Date(c);
      if (typeof c === 'string' && c.length) return new Date(c);
    }
    return null;
  }

  function shape(doc) {
    const d  = doc.data ? doc.data() : doc;
    const id = doc.id || d.id || '';
    const fp = d.fingerprint || {};
    const ch = d.choices || {};
    const cov = d.covenant || ch.station7_covenant || { line1: '', line2: '', line3: '' };
    return {
      id,
      name:      d.name || '',
      email:     d.email || '',
      job:       d.job || '',
      age_range: d.age_range || '',
      whatsapp:  d.whatsapp || '',
      consent_whatsapp: !!d.consent_whatsapp,
      result_code: d.result_code || null,
      completed:   !!d.completed,
      created_at:   pickDate(d.created_at, d.createdAt),
      completed_at: pickDate(d.completed_at),
      whatsapp_sent_at: pickDate(d.whatsapp_sent_at, d.sent_at),
      level:          d.level || ch.station2_level || null,
      main_axis:      d.main_axis      || fp.axis || null,
      secondary_axis: d.secondary_axis || ch.station4_axisSub || null,
      door:           d.door   || fp.door || null,
      flavor:         (d.flavor != null ? d.flavor : (fp.flavor != null ? fp.flavor : null)),
      fingerprint_name: d.fingerprint_name || fp.name || null,
      burnout_type:   d.burnout_type || fp.burnoutType || null,
      covenant: cov,
      choices: ch,
      fingerprint: fp
    };
  }

  /* ════════════════════════════════════════════════════════════
     (4) قراءة بالكود — لصفحة التقرير الدائم
     ──────────────────────────────────────────────────────────── */
  async function fetchByCode(rawCode) {
    if (!global.ResultCodes) throw new Error('result-codes.js not loaded');
    const code = global.ResultCodes.format(rawCode);
    if (!global.ResultCodes.isValid(code)) throw new Error('INVALID_CODE');
    if (!hasFirebase()) throw new Error('NO_FIREBASE');

    const snap = await col().where('result_code', '==', code).limit(1).get();
    if (snap.empty) throw new Error('NOT_FOUND');
    return shape(snap.docs[0]);
  }

  /* ════════════════════════════════════════════════════════════
     (5) قائمة المشاركين — لصفحة الأدمن
     ──────────────────────────────────────────────────────────── */
  async function listParticipants() {
    if (!hasFirebase()) return [];
    try {
      const snap = await col().get();
      const rows = [];
      snap.forEach(doc => {
        const r = shape(doc);
        if (r.completed && r.main_axis) rows.push(r);   // اللي خلّصوا الرحلة بس
      });
      const priority = r => r.whatsapp_sent_at ? 3 : (r.whatsapp ? 1 : 2);
      rows.sort((a, b) => {
        const pa = priority(a), pb = priority(b);
        if (pa !== pb) return pa - pb;
        const ta = (a.created_at || 0).valueOf?.() || 0;
        const tb = (b.created_at || 0).valueOf?.() || 0;
        return tb - ta;
      });
      return rows;
    } catch (err) {
      console.error('listParticipants error:', err);
      throw err;
    }
  }

  async function setSent(id, sent) {
    if (!hasFirebase() || !id) return null;
    await col().doc(id).set(
      { whatsapp_sent_at: sent ? now() : null },
      { merge: true }
    );
    return true;
  }

  /* ════════════════════════════════════════════════════════════
     CSV
     ──────────────────────────────────────────────────────────── */
  function toCSV(rows) {
    const AX = global.AXIS_AR   || {};
    const DR = global.DOOR_AR   || {};
    const FL = global.FLAVOR_AR || {};
    const BR = global.BURNOUT_AR|| {};
    const headers = [
      'الاسم','الإيميل','الواتس','الوظيفة','الفئة العمرية',
      'المحور','الفرعي','الباب','النكهة','اسم البصمة','نوع الاحتراق',
      'كود التقرير','تاريخ الإكمال','اتبعت'
    ];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const cells = [
        r.name || '', r.email || '', r.whatsapp || '', r.job || '', r.age_range || '',
        AX[r.main_axis] || '', AX[r.secondary_axis] || '', DR[r.door] || '',
        FL[r.flavor] || '', r.fingerprint_name || '', BR[r.burnout_type] || '',
        r.result_code || '',
        r.completed_at ? r.completed_at.toLocaleString('ar-EG') : '',
        r.whatsapp_sent_at ? 'نعم' : ''
      ].map(v => {
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(cells.join(','));
    });
    return '\uFEFF' + lines.join('\n');
  }

  global.MFPJourney = {
    hasFirebase, register, saveContact, finalize,
    fetchByCode, listParticipants, setSent, toCSV, shape
  };
})(window);
