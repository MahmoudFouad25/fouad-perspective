// ═══════════════════════════════════════════════════════════
// 📦 fouad-store.js — طبقة الوصول الوحيدة إلى Firestore (مقياس الفؤاد v2)
// كل ملفّات المقياس تمرّ عبر هذا الملف. يُصدَّر للمتصفّح عبر window.FOUAD_STORE
//
// المتطلّبات البيئيّة (مأخوذة من ملفّات المشروع):
//   • Firebase نمط compat/namespaced 8.10.1 (firebase.firestore(), FieldValue, ...)
//   • window.db و window.auth متوفّران عامّيًّا بعد التهيئة في صفحة الـ HTML
//   • لا تهيئة هنا إطلاقًا — التهيئة تتمّ قبل تحميل هذا الملف
// ═══════════════════════════════════════════════════════════

(function (global) {
    'use strict';

    // ── ثوابت المخزن ──────────────────────────────────────────
    var COLLECTION = 'fouad_v2_results';   // مجموعة النتائج: وثيقة واحدة لكل عميل بمعرّفه
    var CACHE_PREFIX = 'fouad_v2_cache_';  // بادئة الـ cache المحلّي أثناء حلّ المرآة

    // ── إعدادات الإتاحة (الإطلاق المرحليّ) ────────────────────────
    // وثيقة واحدة عامّة يضبطها الأدمن، ويجوز لكلّ عميل استثناءٌ على وثيقته.
    var SETTINGS_COLLECTION = 'fouad_v2_settings';
    var SETTINGS_DOC        = 'release';

    // الافتراضيّات تُعيد سلوك النظام الحاليّ حرفيًّا لو غابت الوثيقة أو فشلت قراءتها.
    // مبدأ: غياب الإعداد لا يغيّر شيئًا على أيّ عميل.
    var DEFAULT_SETTINGS = {
        activeMirrors: null,          // null = كلّ المرايا المعرّفة في mirrors-config.js
        report: {
            adminMinMirrors : 1,      // الأدمن يرى تقرير العميل بعد أوّل مرآة
            clientEnabled   : true,   // التقرير متاح للعميل من حيث المبدأ
            clientMinMirrors: 7       // ولا يظهر له إلّا باكتمال السبع
        }
    };

    var _settings = null;  // نسخة الجلسة: قراءة واحدة لكلّ تحميل صفحة

    // ── مزامنة المسودّة السحابيّة (استئناف من أيّ جهاز) ──────────
    // أثناء حلّ المرآة يُحفَظ التقدّم محلّيًّا فورًا، ويُزامَن إلى Firestore
    // في حقل draft.<mirrorId> بكتابة واحدة كل DRAFT_THROTTLE_MS على الأكثر.
    var DRAFT_THROTTLE_MS = 15000;  // ارفعها إلى 30000 لتقليل الكتابات للنصف
    var _draftTimers = {};          // mirrorId → معرّف مؤقّت الكتابة المؤجّلة
    var _draftLastWrite = {};       // mirrorId → آخر وقت كتابة سحابيّة (ms)
    var _draftDirty = {};           // mirrorId → هل توجد تغييرات لم تُزامَن بعد؟

    // إعدادات قابلة للضبط من الصفحة (مثل courseId الخاصّ بالمقياس)
    var _config = {
        courseId: null,        // يُضبط عبر FOUAD_STORE.setConfig({ courseId: '...' })
        readyTimeoutMs: 10000  // أقصى انتظار لجاهزيّة Firebase
    };

    // ═══════════════════════════════════════════════════════════
    // 🔐 SecureStorage مصغّر للقراءة (نفس منطق فكّ التشفير في المشروع)
    //    إن وُجد window.SecureStorage مسبقًا نستعمله بدل تعريف نسخة جديدة
    // ═══════════════════════════════════════════════════════════
    var _ss = null;
    function _getSecureStorage() {
        if (_ss) return _ss;

        // استعمل النسخة الموجودة في الصفحة إن كانت معرّفة بالفعل
        if (global.SecureStorage && typeof global.SecureStorage.getItem === 'function') {
            _ss = global.SecureStorage;
            return _ss;
        }

        // نسخة مصغّرة للقراءة فقط: عكس النصّ ← atob ← decodeURIComponent ← JSON.parse
        _ss = {
            _key: 'f0u4d_P3r5p3ct1v3_2025',
            decrypt: function (encrypted) {
                try {
                    var unshuffled = encrypted.split('').reverse().join('');
                    var decoded = decodeURIComponent(atob(unshuffled));
                    return JSON.parse(decoded);
                } catch (e) {
                    return null;
                }
            },
            getItem: function (key) {
                var encrypted = localStorage.getItem('_enc_' + key);
                if (encrypted) return this.decrypt(encrypted);
                return null;
            }
        };
        return _ss;
    }

    // ═══════════════════════════════════════════════════════════
    // ⏳ انتظار جاهزيّة Firebase قبل أيّ عمليّة على Firestore
    //    نعتمد أساسًا على توفّر window.db، مع الاستماع لحدث firebaseReady
    // ═══════════════════════════════════════════════════════════
    function _ready() {
        return new Promise(function (resolve) {
            // جاهز بالفعل
            if (global.db) return resolve(true);

            var done = false;
            function finish(ok) {
                if (done) return;
                done = true;
                resolve(!!ok);
            }

            // استماع لحدث الجاهزيّة (كما في firebase-config.js)
            function onReady() {
                if (global.db) finish(true);
            }
            document.addEventListener('firebaseReady', onReady);

            if (global.firebaseReady && global.db) return finish(true);

            // احتياطيّ: فحص دوريّ لتوفّر window.db (لو لم يُطلق الحدث)
            var elapsed = 0;
            var step = 100;
            var iv = setInterval(function () {
                elapsed += step;
                if (global.db) {
                    clearInterval(iv);
                    finish(true);
                } else if (elapsed >= _config.readyTimeoutMs) {
                    clearInterval(iv);
                    console.error('[FOUAD_STORE] انتهت مهلة انتظار جاهزيّة Firebase (window.db غير متوفّر)');
                    finish(false);
                }
            }, step);
        });
    }

    // اختصار: تأكّد من الجاهزيّة وأرجع مرجع الوثيقة، أو null عند الفشل
    async function _docRef(userId) {
        var ok = await _ready();
        if (!ok || !global.db) {
            console.error('[FOUAD_STORE] Firestore غير جاهز');
            return null;
        }
        if (!userId) {
            console.error('[FOUAD_STORE] userId مفقود');
            return null;
        }
        return global.db.collection(COLLECTION).doc(userId);
    }

    // مرجع وثيقة الإعدادات العامّة
    async function _settingsRef() {
        var ok = await _ready();
        if (!ok || !global.db) return null;
        return global.db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    }

    // ═══════════════════════════════════════════════════════════
    // 1) getCurrentUser — هويّة العميل من SecureStorage أو fallback لـ localStorage
    // ═══════════════════════════════════════════════════════════
    function getCurrentUser() {
        try {
            var SS = _getSecureStorage();
            var user = (SS && SS.getItem) ? SS.getItem('user') : null;

            // المصدر الأساسيّ: النسخة المشفّرة
            if (user && user.id) {
                return user; // { id, name, email, level, status, ... }
            }

            // fallback: المفاتيح غير المشفّرة (مستخدم سجّل قبل التحديث مثلًا)
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

            // لا يوجد مستخدم مسجّل
            return null;
        } catch (e) {
            console.error('[FOUAD_STORE] getCurrentUser error:', e);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 2) requireAuth — تتأكّد من وجود مستخدم، وإلّا تحوّل لصفحة الدخول
    //    options.loginPath لتمرير مسار مختلف (مثل ../login.html من مجلّد فرعيّ)
    // ═══════════════════════════════════════════════════════════
    function requireAuth(options) {
        options = options || {};
        var loginPath = options.loginPath || './login.html';

        var user = getCurrentUser();
        if (!user || !user.id) {
            // لا يوجد مستخدم — تحويل المتصفّح لصفحة الدخول
            try { window.location.href = loginPath; } catch (e) {}
            return null;
        }
        return user;
    }

    // ═══════════════════════════════════════════════════════════
    // 3) loadAssessment — قراءة وثيقة العميل مرّة واحدة
    //    تُرجع البيانات، أو null لو الوثيقة غير موجودة (عميل جديد) أو عند فشل القراءة
    // ═══════════════════════════════════════════════════════════
    async function loadAssessment(userId) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return null;

            var doc = await ref.get();
            if (doc.exists) {
                var data = doc.data();
                // زرع المسودّات السحابيّة في الـcache المحلّي (إن كانت أحدث)
                // حتى يعمل الاستئناف من نفس السؤال على أيّ جهاز دون تعديل التطبيق
                _seedLocalFromCloudDrafts(data);
                return data;
            }

            return null; // عميل جديد — لا توجد وثيقة بعد
        } catch (e) {
            // فشل القراءة لا يعطّل التطبيق
            console.error('[FOUAD_STORE] loadAssessment error:', e);
            return null;
        }
    }

    // مقارنة مسودّة السحابة بالمحلّيّة لكل مرآة، والأخذ بالأحدث محلّيًّا
    function _seedLocalFromCloudDrafts(data) {
        try {
            var drafts = data && data.draft;
            if (!drafts || typeof drafts !== 'object') return;

            Object.keys(drafts).forEach(function (mirrorId) {
                var cloud = drafts[mirrorId];
                if (!cloud || !cloud.data) return;

                var localRaw = _readRawCache(mirrorId);
                var localAt = (localRaw && localRaw.savedAt) ? localRaw.savedAt : 0;
                var cloudAt = cloud.savedAt || 0;

                // السحابة أحدث (أو لا محلّيّ أصلًا) → ازرعها محلّيًّا
                if (cloudAt > localAt) {
                    localStorage.setItem(_cacheKey(mirrorId), JSON.stringify({
                        mirrorId: mirrorId,
                        data: cloud.data,
                        savedAt: cloudAt
                    }));
                }
            });
        } catch (e) {
            console.error('[FOUAD_STORE] _seedLocalFromCloudDrafts error:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 4) saveMirror — أهمّ دالّة: كتابة واحدة عند اكتمال كل مرآة
    //    mirrorData المتوقّع:
    //      { identification: {...}, spectrum: {...}, results: {...}, courseId? }
    //    أو بصيغة: { answers: { identification, spectrum }, results: {...} }
    //    تُحدّث: answers[mirrorId] + results[mirrorId]
    //            + إضافة mirrorId إلى progress.completedMirrors + meta.lastUpdated
    // ═══════════════════════════════════════════════════════════
    async function saveMirror(userId, mirrorId, mirrorData) {
        try {
            if (!mirrorId) {
                console.error('[FOUAD_STORE] saveMirror: mirrorId مفقود');
                return false;
            }
            var ref = await _docRef(userId);
            if (!ref) return false;

            mirrorData = mirrorData || {};
            var FV = firebase.firestore.FieldValue;

            // فحص وجود الوثيقة لضبط createdAt مرّة واحدة فقط
            // (هذه قراءة وليست كتابة — لا تُحتسب ضمن كتابات Firestore)
            var exists = false;
            try {
                var snap = await ref.get();
                exists = snap.exists;
            } catch (re) {
                console.warn('[FOUAD_STORE] تعذّر فحص وجود الوثيقة (سنكمل بافتراض جديدة):', re);
            }

            // استخراج الإجابات الخام والنتائج المحسوبة بمرونة
            var identification =
                mirrorData.identification ||
                (mirrorData.answers && mirrorData.answers.identification) || {};
            var spectrum =
                mirrorData.spectrum ||
                (mirrorData.answers && mirrorData.answers.spectrum) || {};
            var results = mirrorData.results || {};

            // بناء كائن meta — createdAt و completed فقط عند إنشاء الوثيقة لأوّل مرّة
            var meta = {
                userId: userId,
                version: 'v2',
                lastUpdated: FV.serverTimestamp()
            };

            // ── جديد: اسم العميل وإيميله من المستخدم الحاليّ (بلا أيّ قراءة إضافيّة من Firestore) ──
            // الهدف: أن تحمل كل وثيقة في fouad_v2_results هويّة صاحبها، فتقرأها صفحة الأدمن
            //        من هذه المجموعة وحدها دون join ولا قراءة مجموعة users.
            // نكتب الحقل فقط إن كانت له قيمة (Firestore يرفض undefined).
            var _cu = getCurrentUser();
            if (_cu) {
                if (_cu.name)  meta.name  = _cu.name;
                if (_cu.email) meta.email = _cu.email;
            }

            var courseId = mirrorData.courseId || _config.courseId;
            if (courseId) meta.courseId = courseId;
            if (!exists) {
                meta.createdAt = FV.serverTimestamp(); // أوّل مرآة تنشئ الوثيقة
                meta.completed = false;
            }

            // الحمولة — مفاتيح متداخلة بمعرّف المرآة (merge يدمج الخرائط دون مسح المرايا الأخرى)
            var payload = {
                meta: meta,
                progress: {
                    completedMirrors: FV.arrayUnion(mirrorId) // إضافة دون تكرار
                },
                answers: {},
                results: {}
            };
            payload.answers[mirrorId] = { identification: identification, spectrum: spectrum };
            payload.results[mirrorId] = results;

            // المرآة اكتملت → احذف مسودّتها السحابيّة في نفس الكتابة (بلا كتابة إضافيّة)
            if (exists) {
                payload.draft = {};
                payload.draft[mirrorId] = FV.delete();
            }

            // وألغِ أيّ مزامنة مؤجّلة لهذه المرآة حتى لا تُعاد كتابة المسودّة بعد الحذف
            _cancelDraftSync(mirrorId);

            // كتابة واحدة: merge ليعمل سواء كانت الوثيقة جديدة أو موجودة
            await ref.set(payload, { merge: true });

            // بعد نجاح الكتابة، امسح الـ cache المحلّي لهذه المرآة
            clearMirrorCache(mirrorId);

            return true;
        } catch (e) {
            // خطأ Firestore يُسجَّل ولا يُسقِط التطبيق
            console.error('[FOUAD_STORE] saveMirror error:', e);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 5) saveProgress — تحديث حقل progress فقط (الموضع الحاليّ للاستئناف)
    //    خفيفة، تُستعمل عند نقاط الاستراحة. merge لا يمسّ مفاتيح progress الأخرى
    //    (مرّر مثلًا { currentMirrorOrder, currentStage } دون completedMirrors)
    // ═══════════════════════════════════════════════════════════
    async function saveProgress(userId, progress) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return false;

            var FV = firebase.firestore.FieldValue;
            await ref.set({
                progress: progress || {},
                meta: { lastUpdated: FV.serverTimestamp() }
            }, { merge: true });

            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] saveProgress error:', e);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 6) saveFinalReport — كتابة التقرير الختاميّ وضبط meta.completed = true
    // ═══════════════════════════════════════════════════════════
    async function saveFinalReport(userId, finalReport) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return false;

            var FV = firebase.firestore.FieldValue;
            await ref.set({
                finalReport: finalReport || {},
                meta: { completed: true, lastUpdated: FV.serverTimestamp() }
            }, { merge: true });

            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] saveFinalReport error:', e);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 7) cache محلّي أثناء حلّ المرآة (دون أيّ كتابة في Firestore)
    //    المفتاح: fouad_v2_cache_<userId>_<mirrorId>
    // ═══════════════════════════════════════════════════════════
    function _cacheKey(mirrorId) {
        var u = getCurrentUser();
        var uid = (u && u.id) ? u.id : 'anon';
        return CACHE_PREFIX + uid + '_' + mirrorId;
    }

    // حفظ تقدّم المرآة الجاري: محلّيًّا فورًا + مزامنة سحابيّة مخنوقة زمنيًّا
    function cacheMirrorProgress(mirrorId, partialData) {
        try {
            if (!mirrorId) return false;
            localStorage.setItem(_cacheKey(mirrorId), JSON.stringify({
                mirrorId: mirrorId,
                data: partialData,
                savedAt: Date.now()
            }));
            // مزامنة إلى Firestore (كتابة واحدة كل DRAFT_THROTTLE_MS على الأكثر)
            _scheduleDraftSync(mirrorId);
            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] cacheMirrorProgress error:', e);
            return false;
        }
    }

    // قراءة الـcache الخام (مع savedAt) — للاستعمال الداخليّ في المزامنة والمقارنة
    function _readRawCache(mirrorId) {
        try {
            var raw = localStorage.getItem(_cacheKey(mirrorId));
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && 'data' in parsed) return parsed;
            // توافق مع صيغة قديمة بلا غلاف
            return { mirrorId: mirrorId, data: parsed, savedAt: 0 };
        } catch (e) {
            return null;
        }
    }

    // جدولة مزامنة المسودّة: فوريّة إن مضت المهلة، وإلّا مؤجّلة لنهايتها
    function _scheduleDraftSync(mirrorId) {
        _draftDirty[mirrorId] = true;
        if (_draftTimers[mirrorId]) return; // مؤقّت قائم بالفعل — سيلتقط آخر حالة

        var last = _draftLastWrite[mirrorId] || 0;
        var elapsed = Date.now() - last;
        var wait = Math.max(0, DRAFT_THROTTLE_MS - elapsed);

        _draftTimers[mirrorId] = setTimeout(function () {
            _draftTimers[mirrorId] = null;
            _syncDraftNow(mirrorId);
        }, wait);
    }

    // إلغاء أيّ مزامنة مؤجّلة لمرآة (تُستدعى عند اكتمالها)
    function _cancelDraftSync(mirrorId) {
        _draftDirty[mirrorId] = false;
        if (_draftTimers[mirrorId]) {
            clearTimeout(_draftTimers[mirrorId]);
            _draftTimers[mirrorId] = null;
        }
    }

    // الكتابة السحابيّة الفعليّة: draft.<mirrorId> = { data, savedAt }
    async function _syncDraftNow(mirrorId) {
        try {
            if (!_draftDirty[mirrorId]) return;
            var u = getCurrentUser();
            if (!u || !u.id) return;

            var cached = _readRawCache(mirrorId);
            if (!cached || !cached.data) return;

            var ref = await _docRef(u.id);
            if (!ref) return;

            _draftDirty[mirrorId] = false;
            _draftLastWrite[mirrorId] = Date.now();

            var FV = firebase.firestore.FieldValue;
            var payload = { draft: {}, meta: { lastUpdated: FV.serverTimestamp() } };
            payload.draft[mirrorId] = {
                data: cached.data,
                savedAt: cached.savedAt || Date.now()
            };
            await ref.set(payload, { merge: true });
        } catch (e) {
            // فشل المزامنة لا يعطّل الحلّ — المحلّيّ محفوظ، وستُعاد المحاولة مع التغيير التالي
            _draftDirty[mirrorId] = true;
            console.error('[FOUAD_STORE] _syncDraftNow error:', e);
        }
    }

    // دفع فوريّ لكل المسودّات المعلّقة (عند مغادرة الصفحة أو التبديل عنها)
    function _flushAllDrafts() {
        Object.keys(_draftDirty).forEach(function (mirrorId) {
            if (!_draftDirty[mirrorId]) return;
            if (_draftTimers[mirrorId]) {
                clearTimeout(_draftTimers[mirrorId]);
                _draftTimers[mirrorId] = null;
            }
            _syncDraftNow(mirrorId);
        });
    }

    // على الموبايل: التبديل لتطبيق آخر أو قفل الشاشة يطلق visibilitychange
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') _flushAllDrafts();
    });
    window.addEventListener('pagehide', _flushAllDrafts);

    // قراءة التقدّم المحلّي للمرآة (للاستئناف لو أُغلقت الصفحة في المنتصف)
    function readMirrorCache(mirrorId) {
        try {
            if (!mirrorId) return null;
            var raw = localStorage.getItem(_cacheKey(mirrorId));
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            // نُرجع data المخزّنة، ومع التوافق لو حُفظت بصيغة قديمة
            return (parsed && typeof parsed === 'object' && 'data' in parsed) ? parsed.data : parsed;
        } catch (e) {
            console.error('[FOUAD_STORE] readMirrorCache error:', e);
            return null;
        }
    }

    // مسح cache المرآة (يُستدعى تلقائيًّا بعد saveMirror الناجحة)
    function clearMirrorCache(mirrorId) {
        try {
            if (!mirrorId) return false;
            _cancelDraftSync(mirrorId);
            localStorage.removeItem(_cacheKey(mirrorId));
            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] clearMirrorCache error:', e);
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 🔓 إعدادات الإتاحة — الإطلاق المرحليّ وبوّابة التقرير
    //    قاعدة ذهبيّة: أيّ خللٍ هنا يرجع بالنظام إلى سلوكه الحاليّ،
    //    ولا يعطّل عميلًا ولا يمنعه من متابعة ما بدأه.
    // ═══════════════════════════════════════════════════════════

    // تطبيع دفاعيّ: يقبل أيّ شكلٍ للبيانات ويُخرج بنيةً مضمونة
    function _normalizeSettings(raw) {
        var d = DEFAULT_SETTINGS;
        var s = {
            activeMirrors: null,
            report: {
                adminMinMirrors : d.report.adminMinMirrors,
                clientEnabled   : d.report.clientEnabled,
                clientMinMirrors: d.report.clientMinMirrors
            }
        };
        if (!raw || typeof raw !== 'object') return s;

        // المرايا المفتوحة: مصفوفة نصوصٍ غير فارغة، وإلّا فالكلّ مفتوح
        if (Array.isArray(raw.activeMirrors)) {
            var list = raw.activeMirrors.filter(function (x) {
                return typeof x === 'string' && x.length > 0;
            });
            s.activeMirrors = list.length ? list : null;
        }

        var r = raw.report;
        if (r && typeof r === 'object') {
            if (typeof r.adminMinMirrors === 'number' && isFinite(r.adminMinMirrors)) {
                s.report.adminMinMirrors = Math.max(0, Math.round(r.adminMinMirrors));
            }
            if (typeof r.clientMinMirrors === 'number' && isFinite(r.clientMinMirrors)) {
                s.report.clientMinMirrors = Math.max(0, Math.round(r.clientMinMirrors));
            }
            if (typeof r.clientEnabled === 'boolean') {
                s.report.clientEnabled = r.clientEnabled;
            }
        }
        return s;
    }

    // قراءة الإعدادات العامّة مرّة واحدة لكلّ تحميل صفحة
    // options.force = true لإعادة القراءة (تستعملها لوحة الأدمن بعد الحفظ)
    async function loadReleaseSettings(options) {
        options = options || {};
        if (_settings && !options.force) return _settings;
        try {
            var ref = await _settingsRef();
            if (!ref) { _settings = _normalizeSettings(null); return _settings; }

            var doc = await ref.get();
            _settings = _normalizeSettings(doc.exists ? doc.data() : null);
        } catch (e) {
            console.warn('[FOUAD_STORE] تعذّرت قراءة إعدادات الإتاحة — نعمل بالافتراضيّ:', e);
            _settings = _normalizeSettings(null);
        }
        return _settings;
    }

    // كتابة الإعدادات العامّة (لوحة الأدمن وحدها)
    async function saveReleaseSettings(settings) {
        try {
            var ref = await _settingsRef();
            if (!ref) return false;

            var clean = _normalizeSettings(settings);
            var payload = {
                activeMirrors: clean.activeMirrors,   // null مسموح: يعني الكلّ
                report: {
                    adminMinMirrors : clean.report.adminMinMirrors,
                    clientEnabled   : clean.report.clientEnabled,
                    clientMinMirrors: clean.report.clientMinMirrors
                },
                updatedAt: new Date().toISOString()
            };

            var u = getCurrentUser();
            if (u && u.id) payload.updatedBy = u.id;

            await ref.set(payload, { merge: true });
            _settings = clean;   // حدّث نسخة الجلسة فورًا
            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] saveReleaseSettings error:', e);
            return false;
        }
    }

    // كتابة استثناءٍ على وثيقة عميلٍ بعينه (لوحة الأدمن وحدها)
    // مرّر null لمسح الاستثناء وإعادة العميل إلى الوضع العامّ
    async function saveClientAccess(userId, access) {
        try {
            var ref = await _docRef(userId);
            if (!ref) return false;

            // مسح الاستثناء بالكامل
            if (access === null) {
                await ref.set({
                    access: firebase.firestore.FieldValue.delete()
                }, { merge: true });
                return true;
            }

            if (!access || typeof access !== 'object') return false;

            // نكتب الحقول الموجودة فقط؛ الغائب يعني «اتبع الوضع العامّ»
            var payload = { updatedAt: new Date().toISOString() };

            if (Array.isArray(access.activeMirrors)) {
                var list = access.activeMirrors.filter(function (x) {
                    return typeof x === 'string' && x.length > 0;
                });
                payload.activeMirrors = list.length ? list : null;
            } else {
                payload.activeMirrors = null;
            }

            payload.clientEnabled = (typeof access.clientEnabled === 'boolean')
                ? access.clientEnabled : null;

            payload.clientMinMirrors = (typeof access.clientMinMirrors === 'number' && isFinite(access.clientMinMirrors))
                ? Math.max(0, Math.round(access.clientMinMirrors)) : null;

            payload.note = (typeof access.note === 'string') ? access.note : '';

            var u = getCurrentUser();
            if (u && u.id) payload.updatedBy = u.id;

            await ref.set({ access: payload }, { merge: true });
            return true;
        } catch (e) {
            console.error('[FOUAD_STORE] saveClientAccess error:', e);
            return false;
        }
    }

    // دالّة خالصة: تدمج استثناء العميل فوق الوضع العامّ وتُخرج الإتاحة النهائيّة.
    // يستعملها المقياس ولوحة الأدمن معًا — مصدر حقيقةٍ واحد لمنطق الأولويّة.
    //   settings   = ناتج loadReleaseSettings()
    //   assessment = وثيقة العميل (أو null لعميلٍ لم يبدأ بعد)
    function resolveAccess(settings, assessment) {
        var s = _normalizeSettings(settings);
        var out = {
            activeMirrors   : s.activeMirrors,
            adminMinMirrors : s.report.adminMinMirrors,
            clientEnabled   : s.report.clientEnabled,
            clientMinMirrors: s.report.clientMinMirrors,
            hasOverride     : false,
            note            : ''
        };

        var a = assessment && assessment.access;
        if (!a || typeof a !== 'object') return out;

        if (Array.isArray(a.activeMirrors)) {
            var list = a.activeMirrors.filter(function (x) {
                return typeof x === 'string' && x.length > 0;
            });
            if (list.length) { out.activeMirrors = list; out.hasOverride = true; }
        }
        if (typeof a.clientEnabled === 'boolean') {
            out.clientEnabled = a.clientEnabled; out.hasOverride = true;
        }
        if (typeof a.clientMinMirrors === 'number' && isFinite(a.clientMinMirrors)) {
            out.clientMinMirrors = Math.max(0, Math.round(a.clientMinMirrors));
            out.hasOverride = true;
        }
        if (typeof a.note === 'string') out.note = a.note;

        return out;
    }

    // ضبط إعدادات اختياريّة (مثل courseId)
    function setConfig(cfg) {
        if (cfg && typeof cfg === 'object') {
            if (cfg.courseId !== undefined) _config.courseId = cfg.courseId;
            if (cfg.readyTimeoutMs !== undefined) _config.readyTimeoutMs = cfg.readyTimeoutMs;
        }
        return _config;
    }

    // ═══════════════════════════════════════════════════════════
    // التصدير العامّ
    // ═══════════════════════════════════════════════════════════
    global.FOUAD_STORE = {
        // الهويّة
        getCurrentUser: getCurrentUser,
        requireAuth: requireAuth,
        // Firestore (المصدر الوحيد للحقيقة)
        loadAssessment: loadAssessment,
        saveMirror: saveMirror,
        saveProgress: saveProgress,
        saveFinalReport: saveFinalReport,
        // الـ cache المحلّي أثناء المرآة
        cacheMirrorProgress: cacheMirrorProgress,
        readMirrorCache: readMirrorCache,
        clearMirrorCache: clearMirrorCache,
        // إعدادات الإتاحة (الإطلاق المرحليّ وبوّابة التقرير)
        loadReleaseSettings: loadReleaseSettings,
        saveReleaseSettings: saveReleaseSettings,
        saveClientAccess: saveClientAccess,
        resolveAccess: resolveAccess,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        // إعدادات + ثوابت مكشوفة للقراءة
        setConfig: setConfig,
        COLLECTION: COLLECTION,
        SETTINGS_COLLECTION: SETTINGS_COLLECTION,
        SETTINGS_DOC: SETTINGS_DOC
    };

    console.log('✅ FOUAD_STORE جاهز — مجموعة:', COLLECTION);

})(window);
