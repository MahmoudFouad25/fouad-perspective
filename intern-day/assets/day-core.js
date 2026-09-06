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
  function signInSilently() {
    return new Promise(function (resolve, reject) {
      auth.onAuthStateChanged(function (u) {
        if (u) return resolve(u);
        auth.signInAnonymously().catch(reject);
      });
    });
  }

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

  function watchSession(sid, cb) {
    return sRef(sid).onSnapshot(function (snap) {
      cb(snap.exists ? snap.data() : null);
    }, function (err) { console.warn("session watch:", err.message); });
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
    sRef: sRef, pRef: pRef, pCol: pCol, cardsCol: cardsCol, derivedRef: derivedRef,
    watchSession: watchSession, derive: derive, makeGroups: makeGroups, shuffle: shuffle
  };
})();
