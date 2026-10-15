/* =====================================================================
   shared.js — صفحة «ميزان المتطوع»: الإعدادات، والكود، والتخزين، وفايربيز، والرسائل.
   ---------------------------------------------------------------------
   • مسار لوحده تمامًا: مفيش حساب منصة، ولا إيميل، ولا باسورد، ولا Firebase Auth خالص.
     (يعني مفيش «الدخول المجهول مش متفعّل» ولا أي حاجة تخص الدخول ممكن توقّف الصفحة.)
   • الكود الشخصي هو رقم الوثيقة: mizan_scale/{CODE}. اللي معاه الكود بيفتح وثيقته هو بس.
   • كل فشل ليه رسالة باسمه (MSG تحت). ومفيش ولا رسالة «استنى».
   • أكواد التجربة بتبدأ بـ TEST: بتشتغل على الموبايل بس، ومن غير أي سيرفر.
     (صفحة الأدمن لازم ما تطلّعش أبدًا كود حقيقي بيبدأ بـ TEST.)
   ===================================================================== */
(function (root) {
  "use strict";

  var CFG = {
    collection: "mizan_scale",
    assetsVersion: "2026-10-14b",          // بيتغيّر مع كل رفع، ومعاه ?v= في index.html
    codeAlphabet: "ABCDEFGHJKMNPQRSTUVWXYZ23456789",   // من غير 0 وO، ولا 1 وI وL
    codeLength: 8,
    trialPrefix: "TEST",
    timeoutMs: 12000,                       // أي طلب للسيرفر أطول من كده بيتعامل كإن النت ضعيف
    firebase: {                             // نفس مشروع fouad-perspective (نفس اللي في mizan/assets/config.js)
      apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
      authDomain: "fouad-perspective.firebaseapp.com",
      projectId: "fouad-perspective",
      storageBucket: "fouad-perspective.firebasestorage.app",
      messagingSenderId: "1068763865336",
      appId: "1:1068763865336:web:b791abcd22d536aedd5b0d"
    }
  };

  // الحقول اللي المتطوع بيكتبها. أي حاجة غيرها (الاسم، المحافظة، حقول الكوتش، revoked…) ما بتتبعتش من الصفحة أبدًا.
  // ولازم تبقى نفس القايمة اللي في firestore.rules.
  var VOLUNTEER_KEYS = ["v", "address", "addressAt", "status", "screen", "device", "questionsVersion", "questionsHash", "qVersion",
    "startedAt", "updatedAtMs", "finishedAt", "period", "client", "st", "adaptive",
    "updatedAt", "lastPush", "result", "summary", "engineVersion", "configVersion", "textsVersion", "computedAt",
    "rating", "reportViewedAt"];

  // بعد ما النتيجة توصل السيرفر (status = خلص): القواعد بتسمح بالحقول دي بس. أي حقل تاني بيترفض كله.
  // ولازم تبقى نفس mzsAfterDoneKeys() في firestore.rules (الاختبار بيقارنهم).
  var AFTER_DONE_KEYS = ["rating", "reportViewedAt", "address", "addressAt", "updatedAt", "updatedAtMs", "lastPush"];

  /* ───────── أدوات ───────── */
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function first(name) { return String(name || "").trim().split(/\s+/)[0] || ""; }
  function pickKeys(o, keys) { var out = {}; keys.forEach(function (k) { if (o && o[k] !== undefined) out[k] = o[k]; }); return out; }

  /* ───────── الكود ─────────
     بيقبل الحروف الصغيرة والمسافات والشرط (لو حد كتبه بإيده)، ويرجّعه بالشكل الموحّد. */
  function cleanCode(s) { return String(s || "").toUpperCase().replace(/[\s\-_.]/g, ""); }
  function validCode(c) {
    if (!c || c.length !== CFG.codeLength) return false;
    for (var i = 0; i < c.length; i++) if (CFG.codeAlphabet.indexOf(c.charAt(i)) === -1) return false;
    return true;
  }
  function isTrial(c) { return c.indexOf(CFG.trialPrefix) === 0; }
  /* مولّد الأكواد الحقيقية (صفحة الأدمن بتستعمله). عشوائي من crypto، ومستحيل يطلّع كود بيبدأ بـ TEST:
     الحرف التاني بيتسحب من غير E، فأول ٤ حروف عمرها ما تبقى TEST (اختبار tests/codes.js على مليون كود).
     rand(n) ← رقم من 0 لـ n−1 (للاختبار بس، علشان نجرّب أسوأ الحالات). */
  function makeCode(rand) {
    var A = CFG.codeAlphabet, noE = A.replace("E", "");
    rand = rand || function (n) {
      var c = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : (typeof require === "function" ? require("crypto").webcrypto : null);
      var u = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n;
      do { c.getRandomValues(u); } while (u[0] >= lim);   // من غير ميل لحروف دون غيرها
      return u[0] % n;
    };
    var out = "";
    for (var i = 0; i < CFG.codeLength; i++) out += i === 1 ? noE.charAt(rand(noE.length)) : A.charAt(rand(A.length));
    return out;
  }
  function codeFromUrl() {
    var m = /[?&#]c=([^&#]*)/.exec(location.search + location.hash);
    return m ? cleanCode(decodeURIComponent(m[1])) : "";
  }

  /* ───────── التخزين على الموبايل ─────────
     لو المتصفح قافل التخزين (جوه واتساب أحيانًا، أو التصفح الخاص)، الصفحة بتشتغل من الذاكرة،
     و store.persistent = false علشان الصفحة تقول للمتطوع بالظبط إيه اللي بيحصل. */
  var store = (function () {
    var mem = {}, can = false;
    try { localStorage.setItem("__mzs", "1"); can = localStorage.getItem("__mzs") === "1"; localStorage.removeItem("__mzs"); } catch (e) { can = false; }
    return {
      persistent: can,
      get: function (k) { try { var v = can ? localStorage.getItem(k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } },
      set: function (k, v) {
        var s = JSON.stringify(v);
        mem[k] = s;
        if (!can) return true;
        try { localStorage.setItem(k, s); return true; } catch (e) { return false; }   // المساحة خلصت مثلًا: لسه في الذاكرة
      },
      del: function (k) { delete mem[k]; try { if (can) localStorage.removeItem(k); } catch (e) {} }
    };
  })();

  function loadJSON(path) {
    return fetch(path + (path.indexOf("?") === -1 ? "?" : "&") + "v=" + CFG.assetsVersion, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw { code: "mzs/file", file: path, status: r.status }; return r.json(); })
      .catch(function (e) { if (e && e.code === "mzs/file") throw e; throw { code: "mzs/file", file: path, status: 0 }; });
  }

  /* ───────── فايربيز (Firestore بس) ─────────
     المكتبة بتتحمّل في الخلفية (مش <script> عادي في الصفحة): لو سيرفر جوجل علّق، الصفحة ما بتقفش
     على «لحظة…». الصفحة بتبدأ على طول، ولو المكتبة وصلت بعدين، الإرسال بيشتغل لوحده. */
  var SDK = ["https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
             "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"];
  var sdkState = "idle", sdkWaiters = [];
  function loadSdk() {
    if (sdkState !== "idle") return;
    if (typeof firebase !== "undefined" && firebase.firestore) { sdkState = "ok"; return; }   // اتحمّلت من الصفحة نفسها (الاختبار)
    sdkState = "loading";
    var i = 0;
    (function next() {
      if (i >= SDK.length) { sdkState = "ok"; sdkWaiters.splice(0).forEach(function (f) { f(true); }); return; }
      var el = document.createElement("script");
      el.src = SDK[i++]; el.async = false;
      el.onload = next;
      el.onerror = function () { sdkState = "failed"; sdkWaiters.splice(0).forEach(function (f) { f(false); }); };
      document.head.appendChild(el);
    })();
  }
  // ← true لو المكتبة جاهزة خلال ms، وإلا false (والتحميل بيكمّل في الخلفية)
  function sdk(ms) {
    loadSdk();
    if (sdkState === "ok") return Promise.resolve(true);
    if (sdkState === "failed") return Promise.resolve(false);
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      sdkWaiters.push(fin);
      setTimeout(function () { fin(false); }, ms || 8000);
    });
  }
  // لو المكتبة فشلت خالص، المحاولة الجاية (الإرسال التلقائي) بتجرّب تحمّلها تاني
  function resetSdkIfFailed() { if (sdkState === "failed") { sdkState = "idle"; } }
  var db = null, fbError = null;
  function firestore() {
    if (db) return db;
    if (fbError && fbError.code !== "mzs/no-sdk") return null;   // خطأ إعداد حقيقي: ما بيتصلحش بالمحاولة
    fbError = null;
    try {
      if (typeof firebase === "undefined" || !firebase.firestore) throw { code: "mzs/no-sdk" };
      if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
      db = firebase.firestore();
      // نفس إعداد يوم الميزان: long-polling إجباري (متصفح واتساب والشبكات اللي بتقفل الـstreaming)،
      // والكشف التلقائي مقفول صراحةً لأن الاتنين مع بعض بيلغوا الإعداد كله في نسخة ١٠.
      try { db.settings({ experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: false, useFetchStreams: false, merge: true }); }
      catch (e) { console.warn("[mzs] settings", e && e.message); }
      return db;
    } catch (e) { fbError = e && e.code ? e : { code: "mzs/no-sdk" }; db = null; return null; }
  }
  function docRef(code) { var d = firestore(); return d ? d.collection(CFG.collection).doc(code) : null; }
  function ts() { try { return firebase.firestore.FieldValue.serverTimestamp(); } catch (e) { return Date.now(); } }
  // أي طلب للسيرفر: لو أخد أكتر من المهلة، بيرجع خطأ «mzs/timeout» بدل ما الصفحة تفضل واقفة
  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; reject({ code: "mzs/timeout" }); } }, ms || CFG.timeoutMs);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
             function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }
  // نوع الخطأ بالنسبة للمتطوع: النت، ولا عندنا
  function kindOf(e) {
    var c = (e && e.code) || "";
    if (c === "permission-denied" || c === "unauthenticated" || c === "failed-precondition" || c === "invalid-argument") return "ours";
    if (c === "mzs/no-sdk") return "nosdk";
    return "net";   // unavailable, deadline-exceeded, mzs/timeout, network…
  }

  /* ───────── الرسائل ─────────
     n = محايدة (قبل ما نعرف الصيغة)، m و f بعد ما يختار. كلها متفق عليها في مراجعة التصور (نقطة ٧). */
  function G(addr, m, f, n) { return addr === "f" ? f : addr === "m" ? m : (n || m); }
  var MSG = {
    noCode: function () {
      return { title: "محتاجين الكود بتاعك", text: "الرابط اللي وصلك فيه كود من ٨ حروف وأرقام. لو فتحت الصفحة من غيره، اكتب الكود هنا." };
    },
    badCode: function (a) {
      return { title: "الكود ده مش مكتوب صح",
        text: G(a, "الكود ٨ حروف وأرقام إنجليزي. اتأكد إنك كتبته زي ما وصلك بالظبط، أو افتح الرابط نفسه بدل ما تكتبه.",
                   "الكود ٨ حروف وأرقام إنجليزي. اتأكدي إنك كتبتيه زي ما وصلك بالظبط، أو افتحي الرابط نفسه بدل ما تكتبيه.",
                   "الكود ٨ حروف وأرقام إنجليزي. لازم يتكتب زي ما وصل بالظبط، والأسهل فتح الرابط نفسه بدل كتابته.") };
    },
    notFound: function (a) {
      return { title: "الكود ده مش موجود",
        text: G(a, "اتأكد إنك كتبته زي ما وصلك، أو اطلب الرابط تاني من اللي بعتهولك.",
                   "اتأكدي إنك كتبتيه زي ما وصلك، أو اطلبي الرابط تاني من اللي بعتهولك.",
                   "الكود لازم يتكتب زي ما وصل بالظبط. ولو مظبوط، الحل إن الرابط يتطلب تاني من اللي بعته.") };
    },
    revoked: function (a) {
      return { title: "الرابط ده اتقفل",
        text: G(a, "واتعمل لك رابط جديد. اطلبه من اللي بعتهولك.", "واتعمل لك رابط جديد. اطلبيه من اللي بعتهولك.",
                   "واتعمل لك رابط جديد. الرابط الجديد مع اللي بعتلك الرابط ده.") };
    },
    offline: function (a) { return "النت ضعيف. إجاباتك محفوظة على موبايلك، وهتتبعت أول ما النت يرجع."; },
    unverified: function (a) {
      return G(a, "النت ضعيف، فلسه ما اتأكدناش من الكود. تقدر تكمّل عادي، وإجاباتك محفوظة على موبايلك، وهنتأكد ونبعتها أول ما النت يرجع.",
                  "النت ضعيف، فلسه ما اتأكدناش من الكود. تقدري تكمّلي عادي، وإجاباتك محفوظة على موبايلك، وهنتأكد ونبعتها أول ما النت يرجع.",
                  "النت ضعيف، فلسه ما اتأكدناش من الكود. المقياس شغال عادي، والإجابات محفوظة على الموبايل، وهتتبعت أول ما النت يرجع.");
    },
    ours: function (a, code) { return "فيه مشكلة في الحفظ عندنا، مش عندك. إجاباتك محفوظة على موبايلك." + (code ? " (رقم الخطأ: " + code + ")" : ""); },
    nosdk: function (a) { return "مكتبة الاتصال ما اتحمّلتش (غالبًا النت ضعيف). المقياس شغال من غيرها، وإجاباتك محفوظة على موبايلك لحد ما ترجع."; },
    storage: function (a) {
      return G(a, "نصيحة صغيرة: المتصفح ده مش بيحفظ على الموبايل، بس إجاباتك بتتبعت لنا بعد كل محطة، فكمّل عادي.",
                  "نصيحة صغيرة: المتصفح ده مش بيحفظ على الموبايل، بس إجاباتك بتتبعت لنا بعد كل محطة، فكمّلي عادي.",
                  "نصيحة صغيرة: المتصفح ده مش بيحفظ على الموبايل، بس الإجابات بتتبعت بعد كل محطة، فالمقياس شغال عادي.");
    },
    trial: function (a) {
      return G(a, "دي نسخة تجربة. إجاباتك بتتحفظ على الموبايل ده بس، ومش بتتبعت لأي حد. والتقرير بيطلع عادي في الآخر.",
                  "دي نسخة تجربة. إجاباتك بتتحفظ على الموبايل ده بس، ومش بتتبعت لأي حد. والتقرير بيطلع عادي في الآخر.",
                  "دي نسخة تجربة. الإجابات بتتحفظ على الموبايل ده بس، ومش بتتبعت لأي حد. والتقرير بيطلع عادي في الآخر.");
    },
    file: function (a, file) {
      return { title: "الصفحة ما اتحمّلتش كاملة",
        text: "فيه ملف من ملفات المقياس ما وصلش (" + file + ")، والسبب غالبًا إن النت ضعيف. إجاباتك اللي فاتت محفوظة على موبايلك ومش هتضيع." };
    }
  };

  root.MZS = {
    CFG: CFG, VOLUNTEER_KEYS: VOLUNTEER_KEYS, AFTER_DONE_KEYS: AFTER_DONE_KEYS, MSG: MSG,
    ar: ar, esc: esc, clone: clone, first: first, pickKeys: pickKeys,
    cleanCode: cleanCode, validCode: validCode, isTrial: isTrial, codeFromUrl: codeFromUrl, makeCode: makeCode,
    store: store, loadJSON: loadJSON,
    sdk: sdk, resetSdkIfFailed: resetSdkIfFailed,
    firestore: firestore, fbError: function () { return fbError; }, docRef: docRef, ts: ts, withTimeout: withTimeout, kindOf: kindOf
  };
})(typeof self !== "undefined" ? self : this);
