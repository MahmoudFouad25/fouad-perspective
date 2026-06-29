// ═══════════════════════════════════════════════════════════
// 📦 cross-store.js — طبقة القراءة الوحيدة للتقاطع (mirrors-axes)
// مجمِّعٌ لا قائس: يقرأ مستندَي المرايا والمسارات بنفس userId المشترك،
// ولا يكتب أيّ مستند قياسٍ جديد. (مخرجات التقرير تُكتب لاحقًا في مستند
// الكوتشينج بالأدمن، لا هنا.)
//
// المتطلّبات البيئيّة (نفس باقي المقاييس):
//   • Firebase compat 8.10.1 (firebase.firestore())
//   • window.db و window.auth متوفّران بعد التهيئة في صفحة الـ HTML
//   • هويّة المنصّة المشتركة في localStorage (userId) — يستخدمها الجميع
//
// مجموعتان للقراءة فقط:
//   • المرايا   → fouad_v2_results   (وثيقة {userId})
//   • المسارات → maqyas_axes_results (وثيقة {userId})
// ═══════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  var MIRRORS_COLLECTION = 'fouad_v2_results';
  var AXES_COLLECTION    = 'maqyas_axes_results';

  var _config = { readyTimeoutMs: 10000 };

  // ── SecureStorage مصغّر للقراءة (نفس منطق باقي المقاييس) ──
  var _ss = null;
  function _getSecureStorage() {
    if (_ss) return _ss;
    if (global.SecureStorage && typeof global.SecureStorage.getItem === 'function') {
      _ss = global.SecureStorage; return _ss;
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

  // ── انتظار جاهزيّة Firebase ──
  function _ready() {
    return new Promise(function (resolve) {
      if (global.db) return resolve(true);
      var done = false;
      function finish(ok) { if (done) return; done = true; resolve(!!ok); }
      function onReady() { if (global.db) finish(true); }
      document.addEventListener('firebaseReady', onReady);
      if (global.firebaseReady && global.db) return finish(true);
      var elapsed = 0, step = 100;
      var iv = setInterval(function () {
        elapsed += step;
        if (global.db) { clearInterval(iv); finish(true); }
        else if (elapsed >= _config.readyTimeoutMs) {
          clearInterval(iv);
          console.error('[CROSS_STORE] انتهت مهلة انتظار جاهزيّة Firebase');
          finish(false);
        }
      }, step);
    });
  }

  // ── هويّة العميل (نفس userId الذي تستخدمه باقي الدورات) ──
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
    } catch (e) { console.error('[CROSS_STORE] getCurrentUser error:', e); return null; }
  }

  function requireAuth(options) {
    options = options || {};
    var loginPath = options.loginPath || '../login.html';
    var user = getCurrentUser();
    if (!user || !user.id) {
      try { window.location.href = loginPath; } catch (e) {}
      return null;
    }
    return user;
  }

  // ── قراءة وثيقة من مجموعةٍ ما بمعرّف العميل ──
  async function _readDoc(collection, userId) {
    try {
      var ok = await _ready();
      if (!ok || !global.db) { console.error('[CROSS_STORE] Firestore غير جاهز'); return null; }
      if (!userId) { console.error('[CROSS_STORE] userId مفقود'); return null; }
      var snap = await global.db.collection(collection).doc(userId).get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      console.error('[CROSS_STORE] _readDoc error (' + collection + '):', e);
      return null;
    }
  }

  // ── قراءة مستند المرايا ──
  async function loadMirrors(userId) {
    return _readDoc(MIRRORS_COLLECTION, userId);
  }

  // ── قراءة مستند المسارات ──
  async function loadAxes(userId) {
    return _readDoc(AXES_COLLECTION, userId);
  }

  // ── هل أكمل العميل المرايا؟ (وجود وثيقة بنتائج، ويُفضّل meta.completed) ──
  function mirrorsComplete(mirrorDoc) {
    if (!mirrorDoc) return false;
    var meta = mirrorDoc.meta || {};
    var results = mirrorDoc.results || {};
    var hasResults = results && Object.keys(results).length > 0;
    // نكتفي بوجود نتائجٍ لمرآةٍ واحدةٍ على الأقلّ ليجمّع المحرّك الطابع؛
    // و meta.completed إن وُجد يؤكّد الإكمال الكامل للسبع.
    return !!(meta.completed || hasResults);
  }

  // ── هل أكمل العميل المسارات؟ (وجود ترتيبٍ محسوب) ──
  function axesComplete(axesDoc) {
    if (!axesDoc) return false;
    var results = axesDoc.results || {};
    return !!(results.ranking && (results.primaryAxis || results.ranking.primaryAxis));
  }

  // ── القراءة المجمّعة: المستندان معًا + حالة الجاهزيّة ──
  //   يُرجع: {
  //     userId, name, email,
  //     mirrorDoc, axesDoc,
  //     mirrorResults, axesResults,   // كائنا results الجاهزان للمحرّك
  //     status: {
  //       mirrorsDone, axesDone,
  //       bothDone, missing: ['mirrors'|'axes' ...]
  //     }
  //   }
  async function loadBoth(userId) {
    var uid = userId || (getCurrentUser() && getCurrentUser().id);
    if (!uid) return null;

    var pair = await Promise.all([ loadMirrors(uid), loadAxes(uid) ]);
    var mirrorDoc = pair[0];
    var axesDoc   = pair[1];

    var mirrorsDone = mirrorsComplete(mirrorDoc);
    var axesDone    = axesComplete(axesDoc);
    var missing = [];
    if (!mirrorsDone) missing.push('mirrors');
    if (!axesDone)    missing.push('axes');

    var cu = getCurrentUser();
    return {
      userId: uid,
      name:  (mirrorDoc && mirrorDoc.meta && mirrorDoc.meta.name)  || (cu && cu.name)  || null,
      email: (mirrorDoc && mirrorDoc.meta && mirrorDoc.meta.email) || (cu && cu.email) || null,
      mirrorDoc: mirrorDoc,
      axesDoc: axesDoc,
      mirrorResults: (mirrorDoc && mirrorDoc.results) || {},
      axesResults:   (axesDoc && axesDoc.results) || {},
      status: {
        mirrorsDone: mirrorsDone,
        axesDone: axesDone,
        bothDone: mirrorsDone && axesDone,
        missing: missing
      }
    };
  }

  function setConfig(cfg) {
    if (cfg && typeof cfg === 'object') {
      if (cfg.readyTimeoutMs !== undefined) _config.readyTimeoutMs = cfg.readyTimeoutMs;
    }
    return _config;
  }

  global.CROSS_STORE = {
    getCurrentUser: getCurrentUser,
    requireAuth: requireAuth,
    loadMirrors: loadMirrors,
    loadAxes: loadAxes,
    loadBoth: loadBoth,
    mirrorsComplete: mirrorsComplete,
    axesComplete: axesComplete,
    setConfig: setConfig,
    MIRRORS_COLLECTION: MIRRORS_COLLECTION,
    AXES_COLLECTION: AXES_COLLECTION
  };

  console.log('✅ CROSS_STORE جاهز — يقرأ:', MIRRORS_COLLECTION, '+', AXES_COLLECTION);

})(window);
