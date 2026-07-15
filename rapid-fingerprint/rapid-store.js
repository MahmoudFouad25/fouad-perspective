// ═══════════════════════════════════════════════════════════
// 📦 rapid-store.js — طبقة الوصول الوحيدة إلى Firestore (مقياس البصمة السريع)
// كل ملفّات المقياس تمرّ عبر هذا الملف. يُصدَّر عبر window.RAPID_STORE
//
// الوراثة: نمط AXES_STORE حرفيًّا (SecureStorage المصغّر، انتظار
// firebaseReady، getCurrentUser بهويّة المنصّة المشتركة، الكاش المحلّي،
// خطّاف REIGNITE_EMBED) — مكيّفًا على مجموعة المقياس ووثيقة القسم ٧
// من METHODOLOGY.md.
//
// المتطلّبات البيئيّة (نفس المقاييس الشقيقة):
//   • Firebase compat/namespaced 8.10.1 (firebase.firestore(), FieldValue, ...)
//   • window.db متوفّر بعد التهيئة في صفحة الـ HTML — لا تهيئة هنا
//
// المجموعة: rapid_fingerprint_results — وثيقة واحدة لكل عميل بمعرّفه.
// تخزّن: الإجابات الخام كاملة + النتائج المحسوبة + سجلّ الحسم (trace)
// — الخام لإعادة الحساب، والـ trace وقود المعايرة (المنهجية §٨).
// ═══════════════════════════════════════════════════════════

(function (global) {
    'use strict';

    var COLLECTION = 'rapid_fingerprint_results';
    var CACHE_PREFIX = 'rapid_fp_cache_';

    var _config = {
        courseId: 'rapid',
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
                    console.error('[RAPID_STORE] انتهت مهلة انتظار جاهزيّة Firebase');
                    finish(false);
                }
            }, step);
        });
    }

    async function _docRef(userId) {
        var ok = await _ready();
        if (!ok || !global.db) { console.error('[RAPID_STORE] Firestore غير جاهز'); return null; }
        if (!userId) { console.error('[RAPID_STORE] userId مفقود'); return null; }
        return global.db.collection(COLLECTION).doc(userId);
    }

    // ── هويّة العميل (هويّة المنصّة المشتركة: نفس userId الذي تستخدمه باقي الدورات) ──
    //   العميل يفتح المقياس وهو مسجَّل دخول على المنصّة، فنقرأ هويّته منها مباشرة.
    //   نقرأ أوّلًا المفاتيح العاديّة، فإن لم توجد جرّبنا المخزّن المشفّر (SecureStorage).
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
                return {
                    id: uid,
                    name: uname || null,
                    email: uemail || null,
                    level: null,
                    status: 'active'
                };
            }
            return null;
        } catch (e) { console.error('[RAPID_STORE] getCurrentUser error:', e); return null; }
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

    // ── قراءة وثيقة العميل ──
    async function loadAssessment(userId) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return null;
            var doc = await ref.get();
            if (doc.exists) return doc.data();
            return null;
        } catch (e) { console.error('[RAPID_STORE] loadAssessment error:', e); return null; }
    }

    // ── الكتابة الوحيدة: حفظ نتيجة المقياس كاملة ──
    //   data المتوقّع (خرج RAPID_ENGINE.buildResults + الإجابات الخام):
    //     { answers:{stageA..stageF}, results:{...}, trace:{...},
    //       itemsServed?, durationSec?, courseId? }
    //   هيكل الوثيقة = القسم ٧ من المنهجية حرفيًّا.
    async function saveResult(userId, data) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return false;
            data = data || {};
            var FV = firebase.firestore.FieldValue;

            var exists = false;
            try { var snap = await ref.get(); exists = snap.exists; }
            catch (re) { console.warn('[RAPID_STORE] تعذّر فحص وجود الوثيقة:', re); }

            var meta = { userId: userId, version: 'v1', module: 'rapid-fingerprint', lastUpdated: FV.serverTimestamp() };
            var _cu = getCurrentUser();
            if (_cu) { if (_cu.name) meta.name = _cu.name; if (_cu.email) meta.email = _cu.email; }
            var courseId = data.courseId || _config.courseId;
            if (courseId) meta.courseId = courseId;
            if (!exists) meta.createdAt = FV.serverTimestamp();
            meta.completed = true;

            var trace = data.trace || {};
            if (typeof data.itemsServed === 'number') trace.itemsServed = data.itemsServed;
            if (typeof data.durationSec === 'number') trace.durationSec = data.durationSec;

            var payload = {
                meta: meta,
                answers: data.answers || {},   // الخام كاملًا — لإعادة الحساب وللمعايرة (§٨)
                results: data.results || {},   // وثيقة النتيجة المحسوبة — §٧
                trace: trace,                  // سجلّ الحسم — وقود المعايرة
                progress: { rapidCompleted: true }
            };

            await ref.set(payload, { merge: true });
            clearCache(userId);

            // ── إبلاغ منصّة الدورة لو الصفحة مضمّنة (REIGNITE_EMBED) ──
            try {
                var EMB = global.REIGNITE_EMBED;
                if (EMB && EMB.isEmbedded && EMB.isEmbedded() && data.results) {
                    EMB.complete(
                        { type: 'rapid-fingerprint' },
                        { completedFrom: 'rapid-store' }
                    );
                }
            } catch (embErr) { console.warn('[RAPID_STORE] embed notify skipped:', embErr); }

            return true;
        } catch (e) { console.error('[RAPID_STORE] saveResult error:', e); return false; }
    }

    // ── قراءة البصمة لمنظومة التقاطع: النتائج المحسوبة دون إعادة حساب ──
    //   الوثيقة تحمل إشارتي المرايا والمسارات معًا (§٧) — منتج نقاط القوة
    //   يقرأ منها وحدها دون الرجوع إلى fouad_v2_results أو maqyas_axes_results.
    async function getFingerprint(userId) {
        try {
            var data = await loadAssessment(userId);
            return (data && data.results) ? data.results : null;
        } catch (e) { return null; }
    }

    // ── cache محلّي أثناء الحلّ (لا يلمس Firestore) — الاستئناف من نقطة التوقّف ──
    function _cacheKey(userId) {
        var u = userId || (getCurrentUser() && getCurrentUser().id) || 'anon';
        return CACHE_PREFIX + u;
    }
    function cacheProgress(partial) {
        try {
            localStorage.setItem(_cacheKey(), JSON.stringify({ data: partial, savedAt: Date.now() }));
            return true;
        } catch (e) { console.error('[RAPID_STORE] cacheProgress error:', e); return false; }
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

    global.RAPID_STORE = {
        getCurrentUser: getCurrentUser,
        requireAuth: requireAuth,
        loadAssessment: loadAssessment,
        saveResult: saveResult,
        getFingerprint: getFingerprint,
        cacheProgress: cacheProgress,
        readCache: readCache,
        clearCache: clearCache,
        setConfig: setConfig,
        COLLECTION: COLLECTION
    };

    console.log('✅ RAPID_STORE جاهز — مجموعة:', COLLECTION);

})(window);
