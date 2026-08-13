// ═══════════════════════════════════════════════════════════════════════
// 📦 burn-store.js — طبقة الوصول الوحيدة إلى Firestore
//    مقياس الاحتراق المحوري · Reignite
//    المسار: reignite/burnout-scale/burn-store.js
//
//    كل ملفّات المقياس تمرّ عبر هذا الملف. يُصدَّر عبر window.BURN_STORE
//
//    المتطلّبات البيئيّة (نفس بقيّة المقاييس):
//      • Firebase compat/namespaced 8.10.1
//      • window.db و window.auth متوفّران بعد التهيئة في صفحة الـHTML
//      • لا تهيئة هنا — تتمّ قبل تحميل هذا الملف
//
// ───────────────────────────────────────────────────────────────────────
// ★ ثلاثة انحرافاتٍ مقصودةٍ عن مقاييسك السابقة، وكلٌّ له سببه:
//
//   ١) الحفظ على مستوى الجرعة لا على مستوى الإنهاء.
//      مقاييسك الحالية جلسةٌ واحدة، فيكفيها localStorage وكتابةٌ واحدةٌ
//      في النهاية. وهذا ستّة أيّام: المشارك قد يبدأ على الموبايل ويكمّل
//      على اللابتوب، وقد يُمسح الكاش. فالحفظ داخل الجرعة في localStorage
//      (بندًا ببند)، والكتابة في Firestore عند إغلاق الجرعة.
//      فلا نُحمّل Firestore ٨٨ كتابة، ولا نخسر يومًا كاملًا.
//
//   ٢) قفل التفريع تعاقدٌ لا اتفاق.
//      بعد الجرعة الثانية يُحسب المحور ويُقفَل، ويرفض هذا الملفّ أيّ
//      محاولةٍ لتغييره بعدها. لأنّ تغييره يترك المشارك بأبعادٍ من محورين،
//      والنتيجة تفسد بلا أن ينتبه أحد.
//
//   ٣) تسجيل زمن الاستجابة لكل بند.
//      يُخزَّن ولا يُعرَض للمشارك أبدًا. وهو شرط ضبط الجودة.
//
// ───────────────────────────────────────────────────────────────────────
// المجموعة: reignite_burnout_results — وثيقةٌ واحدةٌ لكل عميل، مفتاحها userId.
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  var COLLECTION   = 'reignite_burnout_results';
  var CACHE_PREFIX = 'burn_cache_';
  var LOCK_PREFIX  = 'burn_lock_';

  var _config = {
    courseId: 'reignite',
    module: 'reignite-burnout',
    version: 'v1',
    readyTimeoutMs: 10000
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٠ — البنية والأدوات
     ═══════════════════════════════════════════════════════════════════ */

  function CFG() {
    return (typeof BURN_CONFIG !== 'undefined') ? BURN_CONFIG : global.BURN_CONFIG;
  }

  function _log(msg, extra) {
    if (extra !== undefined) console.log('[BURN_STORE] ' + msg, extra);
    else console.log('[BURN_STORE] ' + msg);
  }
  function _err(msg, e) { console.error('[BURN_STORE] ' + msg, e || ''); }
  function _warn(msg, e) { console.warn('[BURN_STORE] ' + msg, e || ''); }

  /* SecureStorage مصغَّر للقراءة — نفس منطق المشروع */
  var _ss = null;
  function _getSecureStorage() {
    if (_ss) return _ss;
    if (global.SecureStorage && typeof global.SecureStorage.getItem === 'function') {
      _ss = global.SecureStorage;
      return _ss;
    }
    _ss = {
      decrypt: function (encrypted) {
        try {
          var unshuffled = encrypted.split('').reverse().join('');
          var decoded = decodeURIComponent(atob(unshuffled));
          return JSON.parse(decoded);
        } catch (e) { return null; }
      },
      getItem: function (key) {
        var encrypted = localStorage.getItem('_enc_' + key);
        if (encrypted) return this.decrypt(encrypted);
        return null;
      }
    };
    return _ss;
  }

  /* انتظار جاهزيّة Firebase */
  function _ready() {
    return new Promise(function (resolve) {
      if (global.db) return resolve(true);
      var done = false;
      function finish(ok) { if (done) return; done = true; resolve(!!ok); }
      document.addEventListener('firebaseReady', function () { if (global.db) finish(true); });
      if (global.firebaseReady && global.db) return finish(true);
      var elapsed = 0, step = 100;
      var iv = setInterval(function () {
        elapsed += step;
        if (global.db) { clearInterval(iv); finish(true); }
        else if (elapsed >= _config.readyTimeoutMs) {
          clearInterval(iv);
          _err('انتهت مهلة انتظار جاهزيّة Firebase');
          finish(false);
        }
      }, step);
    });
  }

  async function _docRef(userId) {
    var ok = await _ready();
    if (!ok || !global.db) { _err('Firestore غير جاهز'); return null; }
    if (!userId) { _err('userId مفقود'); return null; }
    return global.db.collection(COLLECTION).doc(userId);
  }

  function _fv() { return firebase.firestore.FieldValue; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ — هويّة العميل

     هويّة المنصّة المشتركة: نفس userId الذي تستخدمه باقي الدورات.
     نقرأ المفاتيح العاديّة أوّلًا، فإن غابت جرّبنا المخزَّن المشفَّر.
     ═══════════════════════════════════════════════════════════════════ */
  function getCurrentUser() {
    try {
      var uid    = localStorage.getItem('userId');
      var uname  = localStorage.getItem('userName');
      var uemail = localStorage.getItem('userEmail');

      if (!uid) {
        try {
          var ss = _getSecureStorage();
          uid    = ss.getItem('userId')    || uid;
          uname  = ss.getItem('userName')  || uname;
          uemail = ss.getItem('userEmail') || uemail;
        } catch (e) { /* تجاهُل */ }
      }

      if (uid) {
        return { id: uid, name: uname || null, email: uemail || null, status: 'active' };
      }
      return null;
    } catch (e) { _err('getCurrentUser error:', e); return null; }
  }

  function requireAuth(options) {
    options = options || {};
    var loginPath = options.loginPath || '../../login.html';
    var user = getCurrentUser();
    if (!user || !user.id) {
      try { window.location.href = loginPath; } catch (e) {}
      return null;
    }
    return user;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ — الوثيقة الفارغة

     تُنشأ عند أوّل دخول، وتُثبِّت شكل الوثيقة فلا تتفاجأ القراءةُ بحقلٍ غائب.
     ═══════════════════════════════════════════════════════════════════ */
  function _emptyDoc(userId, extra) {
    extra = extra || {};
    var cfg = CFG();
    return {
      meta: {
        userId: userId,
        module: _config.module,
        version: _config.version,
        engineVersion: cfg ? cfg.meta.version : null,
        courseId: extra.courseId || _config.courseId,
        cohortId: extra.cohortId || null,
        alias: extra.alias || null,
        role: extra.role || null
      },
      progress: {
        currentDose: 1,
        dosesCompleted: [],
        branchLocked: false,
        lockedAxis: null,
        lockedAt: null,
        branchItems: [],
        deferred: false,
        deferredUntil: null,
        tieAsked: false,
        tieChoice: null,
        qcReviewOffered: false,
        qcReviewAccepted: null,
        completed: false,
        completedAt: null
      },
      filters: {
        acuteCrisis: null,
        recentChange: null
      },
      raw: {},
      computed: null,
      flags: null,
      weeklyPulses: [],
      verification: {
        week2AccuracyScore: null,
        verifiedAt: null
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ — القراءة
     ═══════════════════════════════════════════════════════════════════ */

  async function load(userId) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return null;
      var doc = await ref.get();
      return doc.exists ? doc.data() : null;
    } catch (e) { _err('load error:', e); return null; }
  }

  /* يُنشئ الوثيقة إن لم تكن موجودة، ويُرجعها دائمًا */
  async function loadOrCreate(userId, extra) {
    try {
      var existing = await load(userId);
      if (existing) return existing;

      var ref = await _docRef(userId);
      if (!ref) return null;

      var fresh = _emptyDoc(userId, extra);
      var cu = getCurrentUser();
      if (cu) {
        if (cu.name)  fresh.meta.name  = cu.name;
        if (cu.email) fresh.meta.email = cu.email;
      }
      fresh.meta.createdAt = _fv().serverTimestamp();
      fresh.meta.lastUpdated = _fv().serverTimestamp();

      await ref.set(fresh);
      _log('وثيقةٌ جديدةٌ أُنشئت للمستخدم', userId);
      return fresh;
    } catch (e) { _err('loadOrCreate error:', e); return null; }
  }

  async function getProgress(userId) {
    var d = await load(userId);
    return d ? (d.progress || null) : null;
  }

  async function getComputed(userId) {
    var d = await load(userId);
    return d ? (d.computed || null) : null;
  }

  async function getTextKey(userId) {
    var c = await getComputed(userId);
    return c ? (c.textKey || null) : null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ — الكاش المحلّي أثناء الجرعة

     ★ الحفظ داخل الجرعة يقع هنا، بندًا ببند، بلا لمس Firestore.
       والكتابة في Firestore عند إغلاق الجرعة وحدها.
     ═══════════════════════════════════════════════════════════════════ */

  function _cacheKey(userId) {
    var u = userId || (getCurrentUser() && getCurrentUser().id) || 'anon';
    return CACHE_PREFIX + u;
  }

  function cacheGet(userId) {
    try {
      var raw = localStorage.getItem(_cacheKey(userId));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && parsed.data) ? parsed : null;
    } catch (e) { return null; }
  }

  /* تسجيل إجابة بندٍ واحد — مع زمن الاستجابة */
  function cacheAnswer(userId, itemId, value, ms) {
    try {
      var current = cacheGet(userId) || { data: {}, dose: null, savedAt: 0 };
      current.data[itemId] = { v: value, ms: (typeof ms === 'number' ? Math.round(ms) : null) };
      current.savedAt = Date.now();
      localStorage.setItem(_cacheKey(userId), JSON.stringify(current));
      return true;
    } catch (e) { _warn('cacheAnswer error:', e); return false; }
  }

  function cacheSetDose(userId, doseId) {
    try {
      var current = cacheGet(userId) || { data: {}, dose: null, savedAt: 0 };
      current.dose = doseId;
      current.savedAt = Date.now();
      localStorage.setItem(_cacheKey(userId), JSON.stringify(current));
      return true;
    } catch (e) { return false; }
  }

  function cacheAnswers(userId) {
    var c = cacheGet(userId);
    return c ? (c.data || {}) : {};
  }

  function cacheClear(userId) {
    try { localStorage.removeItem(_cacheKey(userId)); return true; }
    catch (e) { return false; }
  }

  /* حذف إجابات جرعةٍ بعينها من الكاش — يُستعمل عند إعادة بدء الجرعة */
  function cacheClearDose(userId, itemIds) {
    try {
      var c = cacheGet(userId);
      if (!c) return true;
      (itemIds || []).forEach(function (id) { delete c.data[id]; });
      localStorage.setItem(_cacheKey(userId), JSON.stringify(c));
      return true;
    } catch (e) { return false; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ — إغلاق الجرعة: الكتابة الفعليّة في Firestore

     تُستدعى مرّةً واحدةً في نهاية كل جرعة. تدمج الإجابات الجديدة مع
     الموجود، وتحدّث التقدّم، ولا تلمس ما سبق قفله.
     ═══════════════════════════════════════════════════════════════════ */
  async function saveDose(userId, doseId, answers, patch) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return { ok: false, error: 'no-ref' };

      patch = patch || {};
      answers = answers || {};

      var snap = await ref.get();
      var doc = snap.exists ? snap.data() : _emptyDoc(userId);
      var progress = doc.progress || _emptyDoc(userId).progress;

      /* ── دمج الإجابات: raw مسطَّح، فالتحديث الجزئيّ بحقولٍ منفردة ── */
      var update = {};
      Object.keys(answers).forEach(function (id) {
        update['raw.' + id] = answers[id];
      });

      /* ── تحديث التقدّم ── */
      var done = (progress.dosesCompleted || []).slice();
      if (done.indexOf(doseId) === -1) done.push(doseId);
      done.sort(function (a, b) { return a - b; });

      var cfg = CFG();
      var totalDoses = cfg ? cfg.meta.totalDoses : 6;
      var nextDose = Math.min(doseId + 1, totalDoses);

      update['progress.dosesCompleted'] = done;
      update['progress.currentDose'] = (done.length >= totalDoses) ? totalDoses : nextDose;
      update['progress.lastDoseAt'] = _fv().serverTimestamp();
      update['meta.lastUpdated'] = _fv().serverTimestamp();

      /* ── ما يُسمح للجرعة بتحديثه من التقدّم ── */
      ['tieAsked', 'tieChoice', 'qcReviewOffered', 'qcReviewAccepted'].forEach(function (k) {
        if (patch[k] !== undefined) update['progress.' + k] = patch[k];
      });

      /* ── الفلاتر ── */
      if (patch.filters) {
        Object.keys(patch.filters).forEach(function (k) {
          update['filters.' + k] = patch.filters[k];
        });
      }

      /* ── تحديث الدور إن وصل متأخّرًا ── */
      if (patch.role) update['meta.role'] = patch.role;

      await ref.update(update);

      /* ── تنظيف الكاش من بنود هذه الجرعة فقط ── */
      cacheClearDose(userId, Object.keys(answers));

      _log('حُفظت الجرعة ' + doseId + ' — ' + Object.keys(answers).length + ' بندًا');
      return { ok: true, dosesCompleted: done, nextDose: update['progress.currentDose'] };

    } catch (e) {
      _err('saveDose error:', e);
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ — قفل التفريع

     ★ تعاقدٌ لا اتفاق: بعد القفل يرفض هذا الملفّ أيّ محاولةٍ لتغيير
       المحور، وإن جاءت من التطبيق نفسه. والسبب أنّ تغييره بعد التفريع
       يترك المشارك بأبعادٍ من محورين، والنتيجة تفسد بلا أن ينتبه أحد.
     ═══════════════════════════════════════════════════════════════════ */

  async function lockBranch(userId, axisId, branchItemIds, rankingSnapshot) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return { ok: false, error: 'no-ref' };

      var snap = await ref.get();
      var doc = snap.exists ? snap.data() : null;
      var progress = doc ? (doc.progress || {}) : {};

      /* ── الرفض عند محاولة إعادة القفل بمحورٍ مختلف ── */
      if (progress.branchLocked === true) {
        if (progress.lockedAxis && progress.lockedAxis !== axisId) {
          _warn('محاولةُ إعادة قفلٍ بمحورٍ مختلف — مرفوضة. المقفول: ' +
                progress.lockedAxis + ' · المطلوب: ' + axisId);
          return {
            ok: false,
            error: 'already-locked',
            lockedAxis: progress.lockedAxis,
            branchItems: progress.branchItems || []
          };
        }
        /* إعادة قفلٍ بنفس المحور: لا ضرر، نُرجع الحالة كما هي */
        return {
          ok: true,
          alreadyLocked: true,
          lockedAxis: progress.lockedAxis,
          branchItems: progress.branchItems || []
        };
      }

      var update = {
        'progress.branchLocked': true,
        'progress.lockedAxis': axisId,
        'progress.lockedAt': _fv().serverTimestamp(),
        'progress.branchItems': branchItemIds || [],
        'meta.lastUpdated': _fv().serverTimestamp()
      };

      /* لقطة الترتيب وقت القفل — للمراجعة والتدقيق لا للحساب */
      if (rankingSnapshot) update['progress.rankingSnapshot'] = rankingSnapshot;

      await ref.update(update);

      /* علامةٌ محلّيّةٌ تمنع سباق الكتابة من تبويبين مفتوحين */
      try { localStorage.setItem(LOCK_PREFIX + userId, axisId); } catch (e) {}

      _log('قُفل التفريع على محور ' + axisId + ' — ' + (branchItemIds || []).length + ' بندًا مرشَّحًا');
      return { ok: true, lockedAxis: axisId, branchItems: branchItemIds || [] };

    } catch (e) {
      _err('lockBranch error:', e);
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  async function getLock(userId) {
    var p = await getProgress(userId);
    if (!p) return { locked: false, axis: null, items: [] };
    return {
      locked: p.branchLocked === true,
      axis: p.lockedAxis || null,
      items: p.branchItems || [],
      lockedAt: p.lockedAt || null
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ — التأجيل

     من أعلن أزمةً حادّةً يُعرَض عليه التأجيل أسبوعين، ولا يُلزَم به.
     ★ العلامة تُرفع للمدرّب فورًا، بلا انتظار إكمال المقياس.
     ═══════════════════════════════════════════════════════════════════ */

  async function setDeferral(userId, weeks) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      var ms = (weeks || 2) * 7 * 24 * 60 * 60 * 1000;
      await ref.update({
        'progress.deferred': true,
        'progress.deferredUntil': Date.now() + ms,
        'progress.deferredAt': _fv().serverTimestamp(),
        'meta.lastUpdated': _fv().serverTimestamp()
      });
      _log('أُجّل المقياس ' + (weeks || 2) + ' أسبوعين');
      return true;
    } catch (e) { _err('setDeferral error:', e); return false; }
  }

  async function clearDeferral(userId) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      await ref.update({
        'progress.deferred': false,
        'progress.deferredUntil': null,
        'meta.lastUpdated': _fv().serverTimestamp()
      });
      return true;
    } catch (e) { return false; }
  }

  /* ★ يُستدعى فور إجابة سؤال الفلترة، لا في نهاية الجرعة —
     لأنّ الأزمة الحادّة تستدعي تنبيهًا قبل الجرعة الثالثة. */
  async function flagFilterImmediately(userId, filterKey, value) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      var update = { 'meta.lastUpdated': _fv().serverTimestamp() };
      update['filters.' + filterKey] = value;
      if (filterKey === 'acuteCrisis' && value === true) {
        update['meta.alertAcuteCrisis'] = true;
        update['meta.alertAcuteCrisisAt'] = _fv().serverTimestamp();
      }
      await ref.update(update);
      return true;
    } catch (e) { _warn('flagFilterImmediately error:', e); return false; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ — الحفظ النهائيّ: النتيجة المحسوبة والعلامات
     ═══════════════════════════════════════════════════════════════════ */
  async function saveResult(userId, computed, flags) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return { ok: false, error: 'no-ref' };

      var payload = {
        computed: computed || null,
        flags: flags || null,
        progress: {
          completed: true,
          completedAt: _fv().serverTimestamp()
        },
        meta: {
          lastUpdated: _fv().serverTimestamp(),
          textKey: (computed && computed.textKey) || null
        }
      };

      await ref.set(payload, { merge: true });
      cacheClear(userId);

      /* ── إبلاغ منصّة الدورة إن كانت الصفحة مضمَّنة ── */
      try {
        var EMB = global.REIGNITE_EMBED;
        if (EMB && EMB.isEmbedded && EMB.isEmbedded() && computed) {
          EMB.complete(
            { type: 'burnout-scale', primaryAxis: computed.primary || null, textKey: computed.textKey || null },
            { completedFrom: 'burn-store' }
          );
        }
      } catch (embErr) { _warn('embed notify skipped:', embErr); }

      _log('حُفظت النتيجة — المفتاح: ' + ((computed && computed.textKey) || '—'));
      return { ok: true };

    } catch (e) {
      _err('saveResult error:', e);
      return { ok: false, error: (e && e.message) || 'unknown' };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٩ — النبضة الأسبوعيّة

     مصفوفةٌ في الوثيقة نفسها. لا تُكتب مرّتان لأسبوعٍ واحد: الثانية تحلّ
     محلّ الأولى، ولا تُضاف بجانبها.
     ═══════════════════════════════════════════════════════════════════ */

  async function savePulse(userId, week, type, pulseRaw, computedPulse) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return { ok: false, error: 'no-ref' };

      var snap = await ref.get();
      var doc = snap.exists ? snap.data() : null;
      var pulses = (doc && doc.weeklyPulses) ? doc.weeklyPulses.slice() : [];

      var entry = {
        week: week,
        type: type,                 // 'short' | 'full'
        raw: pulseRaw || {},
        computed: computedPulse || null,
        calibrated: (type === 'short'),
        at: Date.now(),
        status: 'completed'
      };

      var idx = -1;
      for (var i = 0; i < pulses.length; i++) {
        if (pulses[i].week === week) { idx = i; break; }
      }
      if (idx > -1) pulses[idx] = entry;
      else pulses.push(entry);

      pulses.sort(function (a, b) { return a.week - b.week; });

      await ref.update({
        weeklyPulses: pulses,
        'meta.lastUpdated': _fv().serverTimestamp()
      });

      _log('حُفظت نبضة الأسبوع ' + week + ' (' + type + ')');
      return { ok: true, pulses: pulses };

    } catch (e) { _err('savePulse error:', e); return { ok: false, error: (e && e.message) }; }
  }

  async function getPulses(userId) {
    var d = await load(userId);
    return (d && d.weeklyPulses) ? d.weeklyPulses : [];
  }

  /* تسجيل أسبوعٍ فائت — يُوصَل الخطّ بخطٍّ منقّط ولا يُعلَّق عليه سلبًا */
  async function markPulseMissed(userId, week) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      var snap = await ref.get();
      var pulses = (snap.exists && snap.data().weeklyPulses) ? snap.data().weeklyPulses.slice() : [];
      var exists = pulses.some(function (p) { return p.week === week; });
      if (exists) return true;
      pulses.push({ week: week, type: null, raw: {}, computed: null, calibrated: false, at: Date.now(), status: 'missed' });
      pulses.sort(function (a, b) { return a.week - b.week; });
      await ref.update({ weeklyPulses: pulses });
      return true;
    } catch (e) { return false; }
  }

  /* معامل المعايرة المخزَّن — يُقرأ من نتيجة الأسبوع صفر */
  async function getCalibration(userId) {
    var c = await getComputed(userId);
    if (c && c.wellbeing && c.wellbeing.calibration) return c.wellbeing.calibration;
    return { vig: 1, prs: 1, ful: 1 };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٠ — سؤال دقّة الخريطة (الأسبوع الثاني)
     ═══════════════════════════════════════════════════════════════════ */
  async function saveAccuracy(userId, score) {
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      await ref.update({
        'verification.week2AccuracyScore': score,
        'verification.verifiedAt': _fv().serverTimestamp(),
        'meta.lastUpdated': _fv().serverTimestamp()
      });
      var cfg = CFG();
      var min = cfg ? cfg.thresholds.display.accuracyMinScore : 6;
      if (score < min) {
        await ref.update({ 'meta.alertLowAccuracy': true });
        _log('دقّةٌ منخفضة (' + score + ') — رُفعت علامةٌ للمدرّب');
      }
      return true;
    } catch (e) { _err('saveAccuracy error:', e); return false; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١١ — قراءات المدرّب

     ★ قراءةٌ فقط. لا يكتب المدرّب في وثيقة المشارك من هنا أبدًا.
     ═══════════════════════════════════════════════════════════════════ */

  async function listCohort(cohortId, limit) {
    try {
      var ok = await _ready();
      if (!ok) return [];
      var q = global.db.collection(COLLECTION);
      if (cohortId) q = q.where('meta.cohortId', '==', cohortId);
      if (limit) q = q.limit(limit);
      var snap = await q.get();
      var out = [];
      snap.forEach(function (d) { out.push(Object.assign({ _id: d.id }, d.data())); });
      return out;
    } catch (e) { _err('listCohort error:', e); return []; }
  }

  /* استماعٌ لحظيّ للوحة المدرّب */
  function watchCohort(cohortId, callback) {
    if (typeof callback !== 'function') return function () {};
    var unsub = function () {};
    _ready().then(function (ok) {
      if (!ok) return;
      var q = global.db.collection(COLLECTION);
      if (cohortId) q = q.where('meta.cohortId', '==', cohortId);
      unsub = q.onSnapshot(function (snap) {
        var out = [];
        snap.forEach(function (d) { out.push(Object.assign({ _id: d.id }, d.data())); });
        callback(out);
      }, function (e) { _err('watchCohort error:', e); });
    });
    return function () { try { unsub(); } catch (e) {} };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٢ — أدوات التطوير

     ★ resetParticipant تمسح كل شيء. لا تُستدعى من أيّ واجهةٍ للمشارك —
       فحدُّ الاستعمال السادس يقول: نتيجةٌ واحدةٌ لكل مشاركٍ في الدفعة،
       ولا يُعاد المقياس أثناء البرنامج.
     ═══════════════════════════════════════════════════════════════════ */
  async function resetParticipant(userId, confirmToken) {
    if (confirmToken !== 'BURN_RESET_CONFIRM') {
      _err('resetParticipant يحتاج رمز تأكيدٍ صريح — لم يُنفَّذ');
      return false;
    }
    try {
      var ref = await _docRef(userId);
      if (!ref) return false;
      await ref.set(_emptyDoc(userId), { merge: false });
      cacheClear(userId);
      try { localStorage.removeItem(LOCK_PREFIX + userId); } catch (e) {}
      _log('أُعيد ضبط وثيقة المستخدم ' + userId);
      return true;
    } catch (e) { _err('resetParticipant error:', e); return false; }
  }

  function setConfig(cfg) {
    if (cfg && typeof cfg === 'object') {
      ['courseId', 'module', 'version', 'readyTimeoutMs'].forEach(function (k) {
        if (cfg[k] !== undefined) _config[k] = cfg[k];
      });
    }
    return _config;
  }

  /* فحصٌ سريعٌ للاتّصال — يُستعمل في التطوير */
  async function selfTest(userId) {
    var issues = [];
    var ok = await _ready();
    if (!ok) issues.push('Firebase غير جاهز');
    if (!CFG()) issues.push('BURN_CONFIG غير محمَّل');
    if (!userId) {
      var u = getCurrentUser();
      if (!u || !u.id) issues.push('لا هويّة مستخدم');
      else userId = u.id;
    }
    if (issues.length) return { ok: false, issues: issues };
    var doc = await load(userId);
    return {
      ok: true,
      collection: COLLECTION,
      userId: userId,
      docExists: !!doc,
      progress: doc ? doc.progress : null
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     التصدير
     ═══════════════════════════════════════════════════════════════════ */
  global.BURN_STORE = {
    /* الهويّة */
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,

    /* القراءة */
    load: load,
    loadOrCreate: loadOrCreate,
    getProgress: getProgress,
    getComputed: getComputed,
    getTextKey: getTextKey,
    getLock: getLock,

    /* الكاش أثناء الجرعة */
    cacheAnswer: cacheAnswer,
    cacheAnswers: cacheAnswers,
    cacheGet: cacheGet,
    cacheSetDose: cacheSetDose,
    cacheClear: cacheClear,
    cacheClearDose: cacheClearDose,

    /* الكتابة */
    saveDose: saveDose,
    lockBranch: lockBranch,
    saveResult: saveResult,
    setDeferral: setDeferral,
    clearDeferral: clearDeferral,
    flagFilterImmediately: flagFilterImmediately,
    saveAccuracy: saveAccuracy,

    /* النبضة */
    savePulse: savePulse,
    getPulses: getPulses,
    markPulseMissed: markPulseMissed,
    getCalibration: getCalibration,

    /* المدرّب */
    listCohort: listCohort,
    watchCohort: watchCohort,

    /* التطوير */
    resetParticipant: resetParticipant,
    selfTest: selfTest,
    setConfig: setConfig,

    COLLECTION: COLLECTION
  };

  console.log('✅ BURN_STORE جاهز — مجموعة: ' + COLLECTION);

})(window);
