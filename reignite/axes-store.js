// ═══════════════════════════════════════════════════════════
// 📦 axes-store.js — طبقة الوصول الوحيدة إلى Firestore (مقياس المحاور / Reignite)
// كل ملفّات المقياس تمرّ عبر هذا الملف. يُصدَّر عبر window.AXES_STORE
//
// المتطلّبات البيئيّة (نفس مقياس المرايا):
//   • Firebase compat/namespaced 8.10.1 (firebase.firestore(), FieldValue, ...)
//   • window.db و window.auth متوفّران بعد التهيئة في صفحة الـ HTML
//   • لا تهيئة هنا — تتمّ قبل تحميل هذا الملف
//
// مجموعة منفصلة عن المرايا: reignite_axes_results — وثيقة واحدة لكل عميل.
// تخزّن: الإجابات الخام + النتائج المحسوبة + الميل النوعيّ (lean) للقاع.
// ═══════════════════════════════════════════════════════════

(function (global) {
    'use strict';

    var COLLECTION = 'reignite_axes_results';
    var CACHE_PREFIX = 'reignite_axes_cache_';

    var _config = {
        courseId: 'reignite',
        readyTimeoutMs: 10000
    };

    // ── SecureStorage مصغّر للقراءة (نفس منطق المشروع) ──
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
                    console.error('[AXES_STORE] انتهت مهلة انتظار جاهزيّة Firebase');
                    finish(false);
                }
            }, step);
        });
    }

    async function _docRef(userId) {
        var ok = await _ready();
        if (!ok || !global.db) { console.error('[AXES_STORE] Firestore غير جاهز'); return null; }
        if (!userId) { console.error('[AXES_STORE] userId مفقود'); return null; }
        return global.db.collection(COLLECTION).doc(userId);
    }

    // ── هويّة العميل ──
    function getCurrentUser() {
        try {
            var SS = _getSecureStorage();
            var user = (SS && SS.getItem) ? SS.getItem('user') : null;
            if (user && user.id) return user;
            var uid = localStorage.getItem('userId');
            if (uid) {
                return {
                    id: uid,
                    name: localStorage.getItem('userName') || null,
                    email: localStorage.getItem('userEmail') || null,
                    level: localStorage.getItem('userLevel') || null,
                    status: localStorage.getItem('userStatus') || null
                };
            }
            return null;
        } catch (e) { console.error('[AXES_STORE] getCurrentUser error:', e); return null; }
    }

    function requireAuth(options) {
        options = options || {};
        var loginPath = options.loginPath || './login.html';
        var user = getCurrentUser();
        if (!user || !user.id) {
            try { window.location.href = loginPath; } catch (e) {}
            return null;
        }
        return user;
    }

    // ── قراءة وثيقة العميل ──
    async function loadAssessment(userId) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return null;
            var doc = await ref.get();
            if (doc.exists) return doc.data();
            return null;
        } catch (e) { console.error('[AXES_STORE] loadAssessment error:', e); return null; }
    }

    // ── الكتابة الوحيدة: حفظ نتيجة المقياس كاملة ──
    //   data المتوقّع:
    //     { answers:{L1,L2,L3}, results:{ranking,burnout,wellness}, lean:{...}, courseId? }
    //   تخزّن الخام + النتائج + الميل النوعيّ (للقاع) + هويّة العميل.
    async function saveResult(userId, data) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return false;
            data = data || {};
            var FV = firebase.firestore.FieldValue;

            var exists = false;
            try { var snap = await ref.get(); exists = snap.exists; }
            catch (re) { console.warn('[AXES_STORE] تعذّر فحص وجود الوثيقة:', re); }

            var meta = { userId: userId, version: 'v1', module: 'reignite-axes', lastUpdated: FV.serverTimestamp() };
            var _cu = getCurrentUser();
            if (_cu) { if (_cu.name) meta.name = _cu.name; if (_cu.email) meta.email = _cu.email; }
            var courseId = data.courseId || _config.courseId;
            if (courseId) meta.courseId = courseId;
            if (!exists) { meta.createdAt = FV.serverTimestamp(); meta.completed = false; }

            var payload = {
                meta: meta,
                answers: data.answers || {},      // L1 / L2 / L3 الخام (لإعادة الحساب لو نضج المنطق)
                results: data.results || {},      // ranking / burnout / wellness المحسوبة
                lean: data.lean || null,          // الميل النوعيّ — يقرؤه القاع لاحقًا دون إعادة حساب
                progress: { axesCompleted: true }
            };
            if (!exists) payload.meta.completed = true; else payload.meta = Object.assign(payload.meta, { completed: true });

            await ref.set(payload, { merge: true });
            clearCache(userId);

            // ── إبلاغ منصّة الدورة لو الصفحة مضمّنة (REIGNITE_EMBED) ──
            try {
                var EMB = global.REIGNITE_EMBED;
                var rk = data.results && data.results.ranking;
                if (EMB && EMB.isEmbedded && EMB.isEmbedded() && rk) {
                    EMB.complete(
                        {
                            type: 'axes-assessment',
                            primaryAxis: (data.results.primaryAxis || rk.primaryAxis || null)
                        },
                        { completedFrom: 'axes-store' }
                    );
                }
            } catch (embErr) { console.warn('[AXES_STORE] embed notify skipped:', embErr); }

            return true;
        } catch (e) { console.error('[AXES_STORE] saveResult error:', e); return false; }
    }

    // ── الميل النوعيّ للقاع: قراءةٌ مباشرة دون إعادة حساب ──
    async function getBurnoutLean(userId) {
        try {
            var data = await loadAssessment(userId);
            return (data && data.lean) ? data.lean : null;
        } catch (e) { return null; }
    }

    // ── cache محلّي أثناء الحلّ (لا يلمس Firestore) ──
    function _cacheKey(userId) {
        var u = userId || (getCurrentUser() && getCurrentUser().id) || 'anon';
        return CACHE_PREFIX + u;
    }
    function cacheProgress(partial) {
        try {
            localStorage.setItem(_cacheKey(), JSON.stringify({ data: partial, savedAt: Date.now() }));
            return true;
        } catch (e) { console.error('[AXES_STORE] cacheProgress error:', e); return false; }
    }
    function readCache() {
        try {
            var raw = localStorage.getItem(_cacheKey());
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return (parsed && 'data' in parsed) ? parsed.data : parsed;
        } catch (e) { return null; }
    }
    function clearCache(userId) {
        try { localStorage.removeItem(_cacheKey(userId)); return true; } catch (e) { return false; }
    }

    function setConfig(cfg) {
        if (cfg && typeof cfg === 'object') {
            if (cfg.courseId !== undefined) _config.courseId = cfg.courseId;
            if (cfg.readyTimeoutMs !== undefined) _config.readyTimeoutMs = cfg.readyTimeoutMs;
        }
        return _config;
    }

    global.AXES_STORE = {
        getCurrentUser: getCurrentUser,
        requireAuth: requireAuth,
        loadAssessment: loadAssessment,
        saveResult: saveResult,
        getBurnoutLean: getBurnoutLean,
        cacheProgress: cacheProgress,
        readCache: readCache,
        clearCache: clearCache,
        setConfig: setConfig,
        COLLECTION: COLLECTION
    };

    console.log('✅ AXES_STORE جاهز — مجموعة:', COLLECTION);

})(window);
