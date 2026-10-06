/* =====================================================================
   core.js — النواة المشتركة
   ورشة «الميزان»
   ---------------------------------------------------------------------
   القاعدة الذهبية في الملف ده: مفيش حاجة هنا بتوقف الصفحة.
   لو فايربيز ما اتحمّلش، أو الشبكة مقفولة، أو القواعد رافضة —
   كل دالة بترجّع خطأ باسمه، والصفحة بتكمّل باللي عندها.
   ===================================================================== */

var MZ = (function () {

  /* ───────── فايربيز (لو موجود) ───────── */
  var hasFb = (typeof firebase !== "undefined");
  var db = null, auth = null, TS = null, fbInitError = null;
  if (hasFb) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(MZ_FIREBASE);
      db = firebase.firestore();
      auth = firebase.auth();
      TS = firebase.firestore.FieldValue.serverTimestamp;
      /* long-polling إجباري: القناة الحيّة العادية بتتقفل على شبكات المحمول
         وسفاري ومتصفح واتساب. ده كان سبب «الشاشة واقفة» في أيام سابقة. */
      try { db.settings({ experimentalForceLongPolling: true, useFetchStreams: false, merge: true }); }
      catch (e) { console.warn("[mz] settings", e && e.message); }
    } catch (e) { fbInitError = e; hasFb = false; db = null; auth = null; }
  }

  /* ───────── تخزين محلي آمن ─────────
     localStorage بيرمي في التصفح الخاص وفي متصفح واتساب على iOS. */
  var store = (function () {
    var mem = {}, can = false;
    try { localStorage.setItem("__mz", "1"); localStorage.removeItem("__mz"); can = true; } catch (e) {}
    function get(k) { try { return can ? localStorage.getItem(k) : (k in mem ? mem[k] : null); } catch (e) { return mem[k] || null; } }
    function set(k, v) { try { if (can) localStorage.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
    return {
      available: can,
      get: get, set: set,
      getJ: function (k, d) { try { var v = get(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
      setJ: function (k, v) { set(k, JSON.stringify(v)); }
    };
  })();

  /* ───────── أدوات ───────── */
  function qs(k, d) {
    var v = null;
    try { v = new URLSearchParams(location.search).get(k); } catch (e) {}
    return (v === null || v === "") ? (d === undefined ? null : d) : v;
  }
  var AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function en(s) { return String(s || "").replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function vibrate() { try { if (MZ_SETTINGS.vibrateMs && navigator.vibrate) navigator.vibrate(MZ_SETTINGS.vibrateMs); } catch (e) {} }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sid() { return (qs("s", MZ_SETTINGS.sessionId) || "mizan-1").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "mizan-1"; }

  /* ───────── رسايل الأخطاء بالاسم ─────────
     ممنوع رسالة واحدة لكل حاجة. اللي واقف في القاعة لازم يعرف يتصرف. */
  function errText(e) {
    var c = (e && e.code) || "";
    var map = {
      "mz/no-sdk":   "مكتبة الاتصال ما اتحمّلتش (غالبًا النت ضعيف أو مقفول). الصفحة شغالة عادي، بس من غير مزامنة.",
      "auth/network-request-failed": "الشبكة مش سايبة الاتصال يعدّي. جرّب تقفل الواي فاي وتشتغل بالبيانات.",
      "auth/web-storage-unsupported": "المتصفح ده مقفّل التخزين. افتح الرابط في كروم أو سفاري مباشرة، مش من جوّه واتساب.",
      "auth/operation-not-supported-in-this-environment": "المتصفح ده مقفّل التخزين. افتح الرابط في كروم أو سفاري مباشرة.",
      "auth/operation-not-allowed": "الدخول المجهول مش متفعّل في فايربيز. (إعداد عند الأدمن: Authentication ← Anonymous)",
      "auth/admin-restricted-operation": "الدخول المجهول مقفول في فايربيز. (إعداد عند الأدمن)",
      "auth/wrong-password": "كلمة السر غلط.",
      "auth/invalid-credential": "الإيميل أو كلمة السر غلط.",
      "auth/invalid-login-credentials": "الإيميل أو كلمة السر غلط.",
      "auth/user-not-found": "الإيميل ده مالوش حساب في فايربيز.",
      "auth/too-many-requests": "محاولات كتير. استنى دقيقة وجرّب تاني.",
      "permission-denied": "قواعد الأمان رافضة. (ملف firestore.rules بتاع الميزان لسه ما اتنشرش، أو الإيميل مش في قايمة الأدمن)",
      "unavailable": "السيرفر مش واصل دلوقتي. الصفحة هتحاول لوحدها.",
      "mz/timeout": "الاتصال أخد وقت طويل.",
      "mz/not-admin": "الإيميل ده مش في قايمة الأدمن (config.js و firestore.rules)."
    };
    return map[c] || ("حصلت مشكلة" + (c ? " (" + c + ")" : "") + ". " + ((e && e.message) || ""));
  }

  /* ───────── الهوية ───────── */
  function pickPersistence() {
    var P = firebase.auth.Auth.Persistence;
    return auth.setPersistence(P.LOCAL)
      .catch(function () { return auth.setPersistence(P.SESSION); })
      .catch(function () { return auth.setPersistence(P.NONE); })
      .catch(function () { return null; });
  }

  /* دخول مجهول صامت. بيرجّع promise ما بيعلّقش أكتر من timeoutMs. */
  function signInAnon(timeoutMs) {
    if (!hasFb) return Promise.reject({ code: "mz/no-sdk" });
    timeoutMs = timeoutMs || 15000;
    return new Promise(function (resolve, reject) {
      var done = false, tries = 0, unsub;
      function ok(u) { if (done) return; done = true; clearTimeout(t); try { unsub && unsub(); } catch (e) {} resolve(u); }
      function no(e) { if (done) return; done = true; clearTimeout(t); try { unsub && unsub(); } catch (x) {} reject(e); }
      var t = setTimeout(function () { auth.currentUser ? ok(auth.currentUser) : no({ code: "mz/timeout" }); }, timeoutMs);
      unsub = auth.onAuthStateChanged(function (u) { if (u) ok(u); }, no);
      pickPersistence().then(function attempt() {
        if (done || auth.currentUser) return;
        tries++;
        auth.signInAnonymously().catch(function (e) {
          var again = e && (e.code === "auth/network-request-failed" || e.code === "auth/internal-error");
          if (!done && again && tries < 3) return setTimeout(attempt, 1200 * tries);
          no(e);
        });
      });
    });
  }

  function isAdmin(u) { return !!(u && u.email && MZ_ADMINS.indexOf(u.email.toLowerCase()) !== -1); }

  /* ───────── المراجع ───────── */
  function sRef(s)       { return db.collection("mizan").doc(s); }
  function aggRef(s)     { return sRef(s).collection("pub").doc("agg"); }
  function pRef(s, u)    { return sRef(s).collection("people").doc(u); }
  function pCol(s)       { return sRef(s).collection("people"); }
  function vRef(s, u)    { return sRef(s).collection("votes").doc(u); }
  function vCol(s)       { return sRef(s).collection("votes"); }

  /* ───────── إعادة فتح القناة بعد ما الموبايل يصحى ───────── */
  var lastServerAt = 0;
  function touch() { lastServerAt = Date.now(); }
  function reconnect() {
    if (!db) return Promise.resolve();
    return db.disableNetwork().then(function () { return db.enableNetwork(); }).catch(function () {});
  }
  if (hasFb) {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - lastServerAt > 12000) reconnect();
    });
    window.addEventListener("online", reconnect);
    window.addEventListener("pageshow", function (e) { if (e.persisted) reconnect(); });
  }

  /* مراقبة مستند واحد. cb(data|null, fromServer). مش بيرمي أبدًا. */
  function watchDoc(ref, cb, onErr) {
    if (!db) { if (onErr) onErr({ code: "mz/no-sdk" }); return function () {}; }
    var got = false;
    var guard = setTimeout(function () { if (!got) reconnect(); }, 10000);
    try {
      return ref.onSnapshot({ includeMetadataChanges: true }, function (snap) {
        var server = !snap.metadata.fromCache;
        if (server) { got = true; clearTimeout(guard); touch(); }
        cb(snap.exists ? snap.data() : null, server);
      }, function (e) {
        clearTimeout(guard);
        if (onErr) onErr(e);
        if (e && e.code !== "permission-denied") setTimeout(reconnect, 3000);
      });
    } catch (e) { if (onErr) onErr(e); return function () {}; }
  }

  /* ───────── القناة المحلية: لوحة التحكم ← شاشة العرض على نفس الجهاز ─────────
     لو النت وقع خالص، اللوحة والشاشة على نفس اللابتوب بيكلموا بعض من غير سيرفر. */
  function localBus(s) {
    var name = "mizan-bus-" + s, ch = null, subs = [];
    try { ch = new BroadcastChannel(name); ch.onmessage = function (m) { subs.forEach(function (f) { f(m.data); }); }; } catch (e) {}
    window.addEventListener("storage", function (e) {
      if (e.key === name && e.newValue) { try { var d = JSON.parse(e.newValue); subs.forEach(function (f) { f(d); }); } catch (x) {} }
    });
    return {
      send: function (data) {
        try { if (ch) ch.postMessage(data); } catch (e) {}
        try { localStorage.setItem(name, JSON.stringify(data)); } catch (e) {}
      },
      last: function () { try { return JSON.parse(localStorage.getItem(name) || "null"); } catch (e) { return null; } },
      on: function (f) { subs.push(f); }
    };
  }

  /* ───────── الحلقات ─────────
     people: [{u, n, ten:"new"|"old", g:"m"|"f"|""}]
     بيرجّع {u: رقم الحلقة}. حجم كل حلقة من ٥ لـ٧ تقريبًا،
     والجداد والقدام متوزعين بالتساوي (توزيع ثعباني). */
  function makeCircles(people, size, separate, startNo) {
    size = size || 6; startNo = startNo || 1;
    var pools = separate ? groupBy(people, function (p) { return p.g || "x"; }) : { all: people };
    var out = {}, no = startNo;
    Object.keys(pools).sort().forEach(function (k) {
      var pool = pools[k];
      var count = Math.max(1, Math.round(pool.length / size));
      var olds = shuffle(pool.filter(function (p) { return p.ten !== "new"; }));
      var news = shuffle(pool.filter(function (p) { return p.ten === "new"; }));
      var seq = news.concat(olds), i = 0;
      seq.forEach(function (p) {
        var lap = Math.floor(i / count), pos = i % count;
        var c = (lap % 2 === 0) ? pos : (count - 1 - pos);
        out[p.u] = no + c; i++;
      });
      no += count;
    });
    return out;
  }
  function groupBy(a, f) { var o = {}; a.forEach(function (x) { var k = f(x); (o[k] = o[k] || []).push(x); }); return o; }

  /* المتأخر بيروح لأصغر حلقة (من نفس النوع لو فيه فصل) */
  function placeLate(person, circles, people, separate) {
    var sizes = {};
    people.forEach(function (p) {
      var c = circles[p.u]; if (!c) return;
      if (separate && (p.g || "x") !== (person.g || "x")) return;
      sizes[c] = (sizes[c] || 0) + 1;
    });
    var keys = Object.keys(sizes);
    if (!keys.length) {
      var max = 0; Object.keys(circles).forEach(function (u) { max = Math.max(max, circles[u]); });
      return max + 1;
    }
    keys.sort(function (a, b) { return sizes[a] - sizes[b]; });
    return +keys[0];
  }

  /* الرفقة: جوّه نفس الحلقة. لو العدد فردي، آخر تلاتة مع بعض.
     بيرجّع {u: [شركاؤه]} */
  function makePairs(circles, people, separate) {
    var byC = {};
    people.forEach(function (p) { var c = circles[p.u]; if (c) (byC[c] = byC[c] || []).push(p); });
    var out = {};
    Object.keys(byC).forEach(function (c) {
      var pools = separate ? groupBy(byC[c], function (p) { return p.g || "x"; }) : { all: byC[c] };
      Object.keys(pools).forEach(function (k) {
        var list = shuffle(pools[k].slice()), groups = [];
        while (list.length >= 2) groups.push([list.shift(), list.shift()]);
        if (list.length === 1) { if (groups.length) groups[groups.length - 1].push(list.shift()); else groups.push([list.shift()]); }
        groups.forEach(function (g) {
          g.forEach(function (p) { out[p.u] = g.filter(function (q) { return q.u !== p.u; }).map(function (q) { return q.u; }); });
        });
      });
    });
    return out;
  }

  return {
    hasFb: function () { return hasFb; }, fbInitError: fbInitError,
    db: db, auth: auth, TS: TS,
    store: store, qs: qs, ar: ar, en: en, esc: esc, vibrate: vibrate, shuffle: shuffle, sid: sid,
    errText: errText, signInAnon: signInAnon, isAdmin: isAdmin,
    sRef: sRef, aggRef: aggRef, pRef: pRef, pCol: pCol, vRef: vRef, vCol: vCol,
    watchDoc: watchDoc, reconnect: reconnect, touch: touch,
    lastServerAt: function () { return lastServerAt; },
    localBus: localBus,
    makeCircles: makeCircles, placeLate: placeLate, makePairs: makePairs
  };
})();
