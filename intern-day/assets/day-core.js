/* =====================================================================
   day-core.js — النواة المشتركة
   منظومة يوم الاستقبال · «إنت بتردّ على إيه؟»
   ---------------------------------------------------------------------
   بيتحمّل بعد firebase-app / firestore / auth (compat) وبعد day-config.js
   ===================================================================== */

var Day = (function () {

  if (!firebase.apps.length) firebase.initializeApp(DAY_FIREBASE);
  var db   = firebase.firestore();
  var auth = firebase.auth();
  var TS   = firebase.firestore.FieldValue.serverTimestamp;

  /* ───────── النقل: long-polling إجباري ─────────
     Firestore بيفتح القناة الحيّة بـ WebChannel + fetch streams.
     ده بيتقفل على شبكات المحمول وعلى Safari وفي متصفحات التطبيقات
     (واتساب/إنستجرام)، فـ onSnapshot ما بيوصلوش أول رد أبداً —
     والشاشة تفضل واقفة والكمبيوتر ماشي. الإعداد ده بيحلّ ده.
     ⚑ لازم يتنادى قبل أول قراءة أو كتابة. */
  try {
    db.settings({
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      merge: true
    });
  } catch (e) { console.warn("[day] firestore settings:", e && e.message); }

  /* ───────── تخزين آمن ─────────
     localStorage بيرمي استثناء في التصفح الخاص وفي متصفح واتساب
     على iOS. سطر واحد من غير حماية كان كفيل يوقف الصفحة كلها. */
  var store = (function () {
    var mem = {}, can = false;
    try { localStorage.setItem("__d", "1"); localStorage.removeItem("__d"); can = true; } catch (e) {}
    return {
      available: can,
      get: function (k) { try { return can ? localStorage.getItem(k) : (mem.hasOwnProperty(k) ? mem[k] : null); } catch (e) { return mem[k] || null; } },
      set: function (k, v) { try { if (can) localStorage.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
    };
  })();

  /* ───────── أدوات عامة ───────── */

  function qs(k, dflt) {
    var v = new URLSearchParams(location.search).get(k);
    return (v === null || v === "") ? (dflt === undefined ? null : dflt) : v;
  }

  var AR_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  function toAr(n) {
    return String(n).replace(/[0-9]/g, function (d) { return AR_DIGITS[+d]; });
  }

  /* slug عربي آمن: بيشيل التشكيل والعلامات، وبيسيب الحروف والأرقام والشرطة */
  function slugify(name) {
    var s = (name || "").trim()
      .replace(/[\u064B-\u0652\u0670\u0640]/g, "")   // تشكيل وتطويل
      .replace(/[إأآا]/g, "ا").replace(/[ىي]/g, "ي").replace(/ة/g, "ه")
      .replace(/\s+/g, "-")
      .replace(/[^\u0621-\u064Aa-zA-Z0-9\-]/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "")
      .toLowerCase();
    return s || ("m" + Math.random().toString(36).slice(2, 7));
  }

  function vibrate() {
    try {
      if (DAY_SETTINGS.vibrateMs && navigator.vibrate) navigator.vibrate(DAY_SETTINGS.vibrateMs);
    } catch (e) {}
  }

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hourBucket() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " " + d.getHours();
  }

  /* ───────── الهوية ───────── */

  /* المشارك: دخول مجهول صامت. مفيش حساب، ومفيش إيميل، ومفيش خطوة زيادة
     على الباب. الـuid ده هو اللي بيحمي بياناته في قواعد الأمان. */
  var lastAuthError = null;

  /* الثبات: LOCAL ← SESSION ← NONE. لو المتصفح مقفّل التخزين (تصفح خاص،
     «امنع كل الكوكيز»، متصفح واتساب) الأولى بترمي — وبنكمّل بالذاكرة. */
  function pickPersistence() {
    var P = firebase.auth.Auth.Persistence;
    return auth.setPersistence(P.LOCAL)
      .catch(function () { return auth.setPersistence(P.SESSION); })
      .catch(function () { return auth.setPersistence(P.NONE); })
      .catch(function () { return null; });
  }

  function signInSilently(opts) {
    opts = opts || {};
    var maxTries = opts.retries === undefined ? 3 : opts.retries;
    var timeoutMs = opts.timeoutMs === undefined ? 20000 : opts.timeoutMs;

    return new Promise(function (resolve, reject) {
      var settled = false, tries = 0, unsub = null, timer = null;

      function done(u) {
        if (settled) return; settled = true;
        clearTimeout(timer); if (unsub) try { unsub(); } catch (e) {}
        resolve(u);
      }
      function fail(e) {
        if (settled) return; settled = true;
        clearTimeout(timer); if (unsub) try { unsub(); } catch (e) {}
        lastAuthError = e; reject(e);
      }

      unsub = auth.onAuthStateChanged(function (u) { if (u) done(u); },
                                      function (e) { fail(e); });

      timer = setTimeout(function () {
        if (auth.currentUser) return done(auth.currentUser);
        fail({ code: "day/timeout", message: "auth timeout" });
      }, timeoutMs);

      pickPersistence().then(attempt);

      function attempt() {
        if (settled || auth.currentUser) return;
        tries++;
        auth.signInAnonymously().catch(function (e) {
          lastAuthError = e;
          var retriable = e && (e.code === "auth/network-request-failed" ||
                                e.code === "auth/internal-error" ||
                                e.code === "auth/too-many-requests");
          if (!settled && retriable && tries < maxTries) {
            return setTimeout(attempt, 1000 * tries);
          }
          fail(e);
        });
      }
    });
  }

  /* رسالة بالعربي لكل كود خطأ — عشان اللي واقف في القاعة يعرف يتصرّف */
  function errText(e) {
    var c = (e && e.code) || "";
    if (c === "auth/network-request-failed")
      return "الشبكة مش سايبة الاتصال يعدّي. جرّب تقفل الواي فاي وتشتغل بالبيانات.";
    if (c === "auth/web-storage-unsupported" || c === "auth/operation-not-supported-in-this-environment")
      return "المتصفح مقفّل التخزين. افتح الرابط في سفاري أو كروم مباشرة، مش من جوّه واتساب.";
    if (c === "auth/operation-not-allowed")
      return "الدخول المجهول مش مفتوح في المشروع. ده إعداد عند المرشد — دقيقة واحدة.";
    if (c === "auth/admin-restricted-operation")
      return "فتح حساب جديد مقفول في المشروع دلوقتي. ده إعداد عند المرشد — دقيقة واحدة.";
    if (c === "day/timeout")
      return "الاتصال أخد وقت طويل. اضغط «جرّب تاني».";
    if (c === "permission-denied")
      return "الرابط ده مش مفتوح لك. كلّم المساعد.";
    return "فيه حاجة مش راضية تفتح. كلّم المساعد.";
  }

  /* ───────── إعادة فتح القناة ─────────
     iOS بيجمّد الصفحة لما الشاشة تتقفل أو تبدّل تطبيق، والقناة بتموت
     من غير خطأ ومحدّش بيفتحها تاني. دي كانت أكبر حتّة ناقصة. */
  var lastSnapAt = Date.now();
  function touch() { lastSnapAt = Date.now(); }
  function reconnect() {
    return db.disableNetwork()
      .then(function () { return db.enableNetwork(); })
      .then(function () { touch(); })
      .catch(function (e) { console.warn("[day] reconnect:", e && e.message); });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Date.now() - lastSnapAt > 12000) reconnect();
  });
  window.addEventListener("online", function () { reconnect(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) reconnect(); });

  function isAdminUser(u) {
    return !!(u && u.email && DAY_ADMINS.indexOf(u.email) !== -1);
  }

  /* ───────── المراجع ───────── */

  function sRef(sid)             { return db.collection("sessions").doc(sid); }
  function pRef(sid, slug)       { return sRef(sid).collection("participants").doc(slug); }
  function pCol(sid)             { return sRef(sid).collection("participants"); }
  function cardsCol(sid)         { return sRef(sid).collection("thresholdCards"); }
  function derivedRef(sid, slug) { return sRef(sid).collection("derived").doc(slug); }

  /* ───────── الاشتراك في الحالة ───────── */

  function watchSession(sid, cb, onErr) {
    var settled = false;
    /* لو أول رد من السيرفر ما جاش في ١٠ ثواني، القناة مقفولة — نعيد فتحها */
    var guard = setTimeout(function () { if (!settled) reconnect(); }, 10000);
    return sRef(sid).onSnapshot({ includeMetadataChanges: true }, function (snap) {
      if (!snap.metadata.fromCache) { settled = true; clearTimeout(guard); touch(); }
      cb(snap.exists ? snap.data() : null);
    }, function (err) {
      clearTimeout(guard);
      console.warn("session watch:", err.code, err.message);
      if (onErr) onErr(err);
      setTimeout(reconnect, 2000);
    });
  }

  /* ───────── اشتقاق الباب والقراءة (يشتغل على اللوحة بس) ───────── */

  function derive(ans) {
    ans = ans || {};
    var rounds   = [ans.S25 && ans.S25.corner, ans.S26 && ans.S26.corner, ans.S27 && ans.S27.corner];
    var readings = [ans.S25 && ans.S25.reading, ans.S26 && ans.S26.reading, ans.S27 && ans.S27.reading];
    return {
      door:    majority(rounds, ans.S28),
      reading: majority(readings, ans.S21 && ans.S21 !== "?" ? ans.S21 : null),
      sub:     ans.S40 || ans.S45 || ans.S50 || null
    };
  }

  function majority(list, fallback) {
    var c = {};
    list.forEach(function (x) { if (x) c[x] = (c[x] || 0) + 1; });
    var vals = Object.keys(c);
    if (!vals.length) return (fallback && fallback !== "?") ? fallback : null;
    var max = Math.max.apply(null, vals.map(function (k) { return c[k]; }));
    var top = vals.filter(function (k) { return c[k] === max; });
    if (top.length === 1 && max >= 2) return top[0];
    return (fallback && fallback !== "?") ? fallback : null;   // التعادل بيتحسم بسؤال الضغط
  }

  /* ───────── الإقران ───────── */

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* people: [{slug, door}] · exclude: ["a|b", ...] · n: ٢ أو ٣

     الترتيب في الاختيار — تفضيل بيتدرّج، مش شرط بيكسر التمرين:
       ١. باب مختلف، وما اتقابلوش قبل كده
       ٢. باب مختلف
       ٣. ما اتقابلوش قبل كده
       ٤. أي حد فاضل
     ⚑ وحجم المجموعة مضمون n أو n+1 — يعني محدّش بيقعد لوحده، ومفيش
       مجموعة بتتنفخ لستّة لو التوزيع طلع متطرّف (زي ٣٠/٤/٢). */
  function makeGroups(people, exclude, n) {
    exclude = exclude || []; n = n || 2;
    var key = function (a, b) { return [a, b].sort().join("|"); };
    var rest = shuffle(people.slice());
    var groups = [];

    var count = function (list) {
      var c = {}; list.forEach(function (p) { c[p.door || "X"] = (c[p.door || "X"] || 0) + 1; }); return c;
    };

    while (rest.length >= n) {
      var c = count(rest);
      /* البداية من أكبر باب — عشان الأبواب الكبيرة ما تفضلش لوحدها في الآخر */
      rest.sort(function (a, b) { return (c[b.door || "X"] || 0) - (c[a.door || "X"] || 0); });
      var g = [rest.shift()];

      while (g.length < n && rest.length) {
        var doors = g.map(function (p) { return p.door; });
        var fresh = function (p) { return g.every(function (q) { return exclude.indexOf(key(p.slug, q.slug)) === -1; }); };
        var diff  = function (p) { return doors.indexOf(p.door) === -1; };
        var pick = rest.find(function (p) { return diff(p) && fresh(p); })
                || rest.find(diff)
                || rest.find(fresh)
                || rest[0];
        g.push(pick); rest.splice(rest.indexOf(pick), 1);
      }
      groups.push(g.map(function (p) { return p.slug; }));
    }

    /* الفائض أقلّ من n دايماً — كل واحد بيتضاف لمجموعة لوحدها */
    rest.forEach(function (p, i) {
      if (groups.length) groups[i % groups.length].push(p.slug);
      else groups.push([p.slug]);
    });
    return groups;
  }

  return {
    db: db, auth: auth, TS: TS,
    qs: qs, toAr: toAr, slugify: slugify, vibrate: vibrate, esc: esc, hourBucket: hourBucket,
    signInSilently: signInSilently, isAdminUser: isAdminUser,
    store: store, errText: errText, reconnect: reconnect, touch: touch,
    lastAuthError: function () { return lastAuthError; },
    sRef: sRef, pRef: pRef, pCol: pCol, cardsCol: cardsCol, derivedRef: derivedRef,
    watchSession: watchSession, derive: derive, makeGroups: makeGroups, shuffle: shuffle
  };
})();
