/* ====================================================================
   منظور الفؤاد — Data Adapter
   يلفّ Firebase/Firestore بحيث صفحة الإدارة وصفحة التقرير
   تشتغل سواء Firebase متوفّر أو لأ. لو Firebase موجود (firebase-config.js
   مرفوع جنب الصفحات) — بيقرأ من Firestore. غير كده — fallback محلّيّ.
   ──────────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  const COLLECTION = 'participants';
  const QUIZ_KEY   = 'diagnostic_result';   // ← اسم الـ field اللي بيخزّن فيه quiz.js
  const LOCAL_KEY  = 'mfp_admin_overrides';

  // ── Firebase availability ──
  function hasFirebase() {
    return typeof firebase !== 'undefined'
        && firebase.firestore
        && firebase.apps
        && firebase.apps.length > 0;
  }

  function db() { return firebase.firestore(); }

  // ── Local overrides (sent status etc.) في حالة عدم وجود Firebase ──
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveOverrides(obj) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(obj));
  }

  // ────────────────────────────────────────────────────────────
  // Normalization — من شكل المستند الخام إلى شكل سطر العرض
  // ────────────────────────────────────────────────────────────
  function shape(doc) {
    const d = doc.data ? doc.data() : doc;
    const id = doc.id || d.id || d.participant_id || '';
    const quiz = d[QUIZ_KEY] || d.diagnostic || null;
    const result = quiz || d.result || null;

    return {
      id,
      name:      d.name || d.first_name || '',
      whatsapp:  d.whatsapp || d.phone || d.tel || '',
      created_at: pickDate(d.joined_at, d.contact_saved_at, d.created_at, d.createdAt, d.timestamp, d.saved_at),
      completed_at: pickDate(
        quiz && quiz.completed_at,
        d.quiz_completed_at,
        d.completed_at
      ),
      result: result ? {
        main_axis:      result.main_axis      || result.mainAxis      || null,
        secondary_axis: result.secondary_axis || result.secondaryAxis || null,
        repressed_axis: result.repressed_axis || result.repressedAxis || null,
        counts:  result.counts || { tamasok: 0, haywiyya: 0, intima: 0 },
        letters: result.letters || { a: 0, b: 0, c: 0 }
      } : null,
      result_code: d.result_code || d.code || null,
      whatsapp_sent_at: pickDate(d.whatsapp_sent_at, d.sent_at)
    };
  }

  function pickDate(...candidates) {
    for (const c of candidates) {
      if (!c) continue;
      if (typeof c.toDate === 'function') return c.toDate();
      if (c instanceof Date) return c;
      if (typeof c === 'number') return new Date(c);
      if (typeof c === 'string' && c.length) return new Date(c);
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // Admin queries
  // ────────────────────────────────────────────────────────────
  async function listParticipants() {
    if (hasFirebase()) {
      try {
        const snap = await db().collection('webinar_sessions').doc('active').collection('participants').get();
        const rows = [];
        snap.forEach(doc => {
          const row = shape(doc);
          if (row.result && row.result.main_axis) rows.push(row);  // فقط اللي عمل التشخيص وسجّل
        });
        // ترتيب: الأحدث أولًا
        rows.sort((a, b) => {
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
    return [];   // بدون Firebase: لا بيانات
  }

  // ────────────────────────────────────────────────────────────
  // كود النتيجة — ضمان توافره لكل مشارك مكمّل
  // ────────────────────────────────────────────────────────────
  async function ensureResultCode(participantId, existingCode) {
    if (existingCode && global.ResultCodes && global.ResultCodes.isValid(existingCode)) {
      return existingCode;
    }
    const newCode = global.ResultCodes.randomCode();

    if (hasFirebase()) {
      try {
        await db().collection('webinar_sessions').doc('active').collection('participants').doc(participantId).update({
          result_code: newCode
        });
      } catch (err) {
        // لو الـ doc ما يقبلش update جزئيّ
        console.warn('ensureResultCode: update failed, trying set/merge', err);
        await db().collection('webinar_sessions').doc('active').collection('participants').doc(participantId).set(
          { result_code: newCode }, { merge: true }
        );
      }
    } else {
      const ovr = loadOverrides();
      ovr[participantId] = { ...(ovr[participantId] || {}), result_code: newCode };
      saveOverrides(ovr);
    }
    return newCode;
  }

  // ────────────────────────────────────────────────────────────
  // Mark / unmark sent
  // ────────────────────────────────────────────────────────────
  async function setSent(participantId, sent) {
    const value = sent ? new Date() : null;

    if (hasFirebase()) {
      await db().collection('webinar_sessions').doc('active').collection('participants').doc(participantId).set(
        { whatsapp_sent_at: value }, { merge: true }
      );
    } else {
      const ovr = loadOverrides();
      ovr[participantId] = { ...(ovr[participantId] || {}), whatsapp_sent_at: value };
      saveOverrides(ovr);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Result page lookup — by code
  // ────────────────────────────────────────────────────────────
  async function fetchByCode(rawCode) {
    if (!global.ResultCodes) throw new Error('result-codes.js not loaded');
    const code = global.ResultCodes.format(rawCode);
    if (!global.ResultCodes.isValid(code)) throw new Error('INVALID_CODE');

    if (hasFirebase()) {
      const snap = await db().collection('webinar_sessions').doc('active').collection('participants')
        .where('result_code', '==', code)
        .limit(1)
        .get();

      if (snap.empty) throw new Error('NOT_FOUND');
      return shape(snap.docs[0]);
    }
    throw new Error('NOT_FOUND');
  }

  // ────────────────────────────────────────────────────────────
  // Apply local overrides (used when Firebase not present)
  // ────────────────────────────────────────────────────────────
  function applyOverrides(rows) {
    if (hasFirebase()) return rows;
    const ovr = loadOverrides();
    return rows.map(r => ({ ...r, ...(ovr[r.id] || {}) }));
  }

  // ────────────────────────────────────────────────────────────
  // CSV export
  // ────────────────────────────────────────────────────────────
  function toCSV(rows) {
    const AXIS_AR = { tamasok: 'التماسك', haywiyya: 'الحيوية', intima: 'الانتماء' };
    const headers = [
      'الاسم', 'الواتس', 'المحور الرئيسيّ', 'الفرعيّ', 'المكبوت',
      'أ', 'ب', 'ج', 'كود النتيجة', 'تاريخ التسجيل', 'تمّ الإرسال'
    ];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      const cells = [
        r.name || '',
        r.whatsapp || '',
        AXIS_AR[r.result?.main_axis] || '',
        AXIS_AR[r.result?.secondary_axis] || '',
        AXIS_AR[r.result?.repressed_axis] || '',
        r.result?.letters?.a ?? '',
        r.result?.letters?.b ?? '',
        r.result?.letters?.c ?? '',
        r.result_code || '',
        r.created_at ? r.created_at.toLocaleString('ar-EG') : '',
        r.whatsapp_sent_at ? 'نعم' : ''
      ].map(v => {
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(cells.join(','));
    });
    return '\uFEFF' + lines.join('\n');  // BOM للعربيّة في Excel
  }

  global.MFPData = {
    hasFirebase, listParticipants, ensureResultCode,
    setSent, fetchByCode, applyOverrides, toCSV
  };
})(window);
