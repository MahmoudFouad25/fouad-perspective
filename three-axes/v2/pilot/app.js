/* =====================================================================
   app.js — صفحة المشاركين في النسخة التجريبية لـ«مقياس المحاور ٢»
   ---------------------------------------------------------------------
   • الأسئلة كلها جاية من items.json (بيتولّد من الدوك بـ build_items.py). مفيش نص أسئلة هنا.
   • الحفظ: على الجهاز بعد كل ضغطة، وفي فايربيز أول ما الاسم يتكتب وبعد كل محطة.
   • المشارك ما بيشوفش أي نتيجة.
   • مفيش حاجة هنا بتوقف الصفحة لو فايربيز ما اشتغلش: الإجابات بتفضل على الجهاز وبتتبعت بعدين.
   ===================================================================== */
(function () {
  "use strict";

  var LS_KEY = "axv2p:state";
  var AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function now() { return Date.now(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var FLAG_REASONS = [
    "ما فهمتهاش من أول مرة",
    "مفيش إجابة مظبوطة ليّا",
    "حسيتها بتحكم عليّ",
    "الاختيار اللي يوصفني مش موجود",
    "فيه اختيار باين إنه الصح",
    "وقفت عندها كتير"
  ];
  var AGES = ["أقل من ٢٥", "٢٥–٣٥", "٣٥–٥٠", "أكبر من ٥٠"];
  var CLOSING_Q = ["إيه أكتر سؤال وقفك أو ما فهمتوش؟", "حسيت إن الأسئلة فاهماك؟ ليه؟"];

  /* ───────── تخزين محلي آمن (التصفح الخاص ومتصفح واتساب بيرموا) ───────── */
  var store = (function () {
    var mem = {}, can = false;
    try { localStorage.setItem("__axp", "1"); localStorage.removeItem("__axp"); can = true; } catch (e) {}
    return {
      get: function (k) { try { var v = can ? localStorage.getItem(k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } },
      set: function (k, v) { var s = JSON.stringify(v); try { if (can) localStorage.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } },
      del: function (k) { try { if (can) localStorage.removeItem(k); delete mem[k]; } catch (e) {} }
    };
  })();

  /* ───────── فايربيز ───────── */
  var fb = { ok: false, db: null, auth: null, user: null, err: null };
  try {
    if (typeof firebase !== "undefined") {
      if (!firebase.apps.length) firebase.initializeApp(AXP_FIREBASE);
      fb.db = firebase.firestore();
      fb.auth = firebase.auth();
      try { fb.db.settings({ experimentalForceLongPolling: true, useFetchStreams: false, merge: true }); } catch (e) {}
      fb.ok = true;
    } else { fb.err = "no-sdk"; }
  } catch (e) { fb.err = (e && e.code) || "init"; }

  function signIn() {
    if (!fb.ok) return Promise.reject({ code: fb.err || "no-sdk" });
    if (fb.user) return Promise.resolve(fb.user);
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; reject({ code: "timeout" }); } }, 15000);
      var unsub = fb.auth.onAuthStateChanged(function (u) {
        if (u && !done) { done = true; clearTimeout(t); try { unsub(); } catch (e) {} fb.user = u; resolve(u); }
      });
      var P = firebase.auth.Auth.Persistence;
      fb.auth.setPersistence(P.LOCAL).catch(function () { return fb.auth.setPersistence(P.SESSION); }).catch(function () {})
        .then(function () { if (!fb.auth.currentUser) return fb.auth.signInAnonymously(); })
        .catch(function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }

  /* ───────── الحالة ───────── */
  var Q = null;          // items.json
  var S = null;          // حالة المشارك
  var SCREENS = [];      // ترتيب الشاشات
  var shownAt = 0;       // إمتى الشاشة الحالية ظهرت (لزمن كل إجابة)
  var openFlag = null;   // العبارة اللي لوحة العلامة بتاعتها مفتوحة
  var sync = { state: "idle", pending: false, last: 0 };

  function qs(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function cohort() {
    var c = (qs("c") || "").replace(/[^\w؀-ۿ-]/g, "").slice(0, 40);
    return c || "بدون";
  }
  function device() {
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPod|iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) ? "موبايل" : "كمبيوتر";
  }

  function buildScreens() {
    SCREENS = ["intro", "welcome", "period", "periodThanks"];
    Q.stations.forEach(function (st) { SCREENS.push("s" + st.id); SCREENS.push("t" + st.id); });
    SCREENS.push("closing", "done");
  }
  function stationOf(id) { for (var i = 0; i < Q.stations.length; i++) if (Q.stations[i].id === id) return Q.stations[i]; return null; }

  function freshState() {
    return {
      v: 1, uid: null, prevUids: [], name: "", age: "", cohort: cohort(), device: device(),
      qVersion: Q.version, status: "شغال", screen: "intro",
      startedAt: now(), updatedAtMs: now(), finishedAt: null,
      period: { selected: [], impact: null },
      st: {}, adaptive: null, flags: {}, closing: { q1: "", q2: "" }
    };
  }
  function ensureSt(id) {
    var k = String(id);
    if (!S.st[k]) S.st[k] = { startedAt: null, endedAt: null, answers: {}, order: {} };
    return S.st[k];
  }
  function save() { S.updatedAtMs = now(); store.set(LS_KEY, S); }

  /* ───────── الإرسال لفايربيز ───────── */
  function push(reason) {
    save();
    sync.pending = true; paintSync();
    return signIn().then(function (u) {
      if (!S.uid) S.uid = u.uid;
      else if (S.uid !== u.uid) { if (S.prevUids.indexOf(S.uid) === -1) S.prevUids.push(S.uid); S.uid = u.uid; }
      var data = clone(S);
      data.lastPush = reason || "";
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      return fb.db.collection(AXP_COLLECTION).doc(u.uid).set(data);
    }).then(function () {
      sync.pending = false; sync.state = "ok"; sync.last = now(); save(); paintSync();
    }).catch(function (e) {
      sync.state = "err"; sync.err = (e && e.code) || "err"; paintSync();
      console.warn("[axp] push", e);
    });
  }
  function paintSync() {
    var d = $("#sync");
    if (!d) return;
    if (sync.pending && sync.state !== "err") { d.className = "sync wait"; d.textContent = "بيتحفظ…"; }
    else if (sync.state === "ok") { d.className = "sync ok"; d.textContent = "اتحفظ"; }
    else if (sync.state === "err") { d.className = "sync err"; d.textContent = "محفوظ على جهازك، وهيتبعت لما النت يرجع"; }
    else { d.className = "sync"; d.textContent = ""; }
  }
  window.addEventListener("online", function () { if (sync.state === "err" && S && S.name) push("online"); });
  setInterval(function () { if (S && S.name && sync.state === "err") push("retry"); }, 30000);

  /* ───────── قاعدة مؤقتة لاختيار صيغة الاستبدال ─────────
     ⚑ مؤقتة لحد ما المحرك يتبني (المرحلة ٤). ما تتنقلش للمنتج زي ما هي.
     • نقط المحطة ١: الأقرب +١، الأبعد −١، من غير المواقف الخفيفة.
     • لو الفرق بين الأول والتاني ≤ ١ ← الصيغة العامة.
     • غير كده: الرئيسي = الأول. والمكبوت = اللي (إشارات السكوت في المحطة ٢ ناقص نقطه في المحطة ١)
       عنده أعلى من الاتنين الباقيين. وإشارة السكوت = «الأقرب» في المحطة ٢ (المحطة معكوسة).
     • لو الاتنين الباقيين متعادلين في الحساب ده ← الصيغة العامة (الطلب ما قالش، فاخترنا الأحوط). */
  function computeAdaptive() {
    var s1 = { H: 0, V: 0, A: 0 }, sil = { H: 0, V: 0, A: 0 };
    var a1 = ensureSt(1).answers, a2 = ensureSt(2).answers;
    stationOf(1).items.forEach(function (it) {
      var a = a1[it.id];
      if (it.light || !a || a.none) return;
      var ax = {}; it.options.forEach(function (o) { ax[o.id] = o.axis; });
      if (a.closest) s1[ax[a.closest]] += 1;
      if (a.farthest) s1[ax[a.farthest]] -= 1;
    });
    stationOf(2).items.forEach(function (it) {
      var a = a2[it.id];
      if (!a || !a.closest) return;
      var o = it.options.filter(function (x) { return x.id === a.closest; })[0];
      if (o) sil[o.axis] += 1;
    });
    var order = ["H", "V", "A"].sort(function (x, y) { return s1[y] - s1[x]; });
    var res = { rule: "مؤقتة-١ (قبل المحرك)", s1: s1, silence: sil, main: null, suppressed: null, general: true, reason: "", shown: {} };
    if (s1[order[0]] - s1[order[1]] <= 1) {
      res.reason = "الفرق بين الأول والتاني ≤ ١";
    } else {
      res.main = order[0];
      var rest = order.slice(1), sc = {};
      rest.forEach(function (x) { sc[x] = sil[x] - s1[x]; });
      res.suppScore = sc;
      if (sc[rest[0]] === sc[rest[1]]) {
        res.reason = "الرئيسي واضح، بس الاتنين الباقيين متعادلين في حساب المكبوت";
      } else {
        res.suppressed = sc[rest[0]] > sc[rest[1]] ? rest[0] : rest[1];
        res.general = false;
        res.reason = "الرئيسي واضح والمكبوت واضح";
      }
    }
    var row = res.general ? Q.adaptive.general : Q.adaptive.rows.filter(function (r) { return r.main === res.main && r.suppressed === res.suppressed; })[0];
    res.row = res.general ? "عامة" : (res.main + "←" + res.suppressed);
    stationOf(7).items.forEach(function (it) { if (it.adaptive) res.shown[it.id] = row.slots[it.adaptive - 1]; });
    return res;
  }
  function itemText(st, it) {
    if (it.adaptive) return (S.adaptive && S.adaptive.shown[it.id]) || "";
    return it.text;
  }

  /* ───────── الاكتمال ───────── */
  function itemDone(st, it, ans) {
    var a = ans[it.id];
    if (!a) return false;
    if (st.kind === "triad") return !!(a.none || (a.closest && a.farthest && a.closest !== a.farthest));
    return typeof a.v === "number";
  }
  function stationMissing(st) {
    var ans = ensureSt(st.id).answers, miss = [];
    st.items.forEach(function (it) { if (!itemDone(st, it, ans)) miss.push(it.id); });
    if (st.bipolar) st.bipolar.items.forEach(function (it) { var a = ans[it.id]; if (!a || typeof a.v !== "number") miss.push(it.id); });
    return miss;
  }

  /* ───────── الرسم ───────── */
  var main = null;
  function go(screen, reason) {
    S.screen = screen; openFlag = null; save();
    if (reason) push(reason);   // الشاشة الجاية بتتسجل قبل الإرسال، فالرجوع يبقى من أول حاجة ما خلصتش
    render();
    window.scrollTo(0, 0);
  }
  function nextScreen() { return SCREENS[SCREENS.indexOf(S.screen) + 1]; }

  function progressHTML() {
    var m = /^[st](\d)$/.exec(S.screen), n = m ? +m[1] : 0;
    if (S.screen === "closing" || S.screen === "done") n = 7;
    var pct = Math.round((n - (S.screen.charAt(0) === "s" ? 1 : 0)) / 7 * 100);
    if (S.screen === "closing" || S.screen === "done") pct = 100;
    return '<div class="prog" aria-hidden="true"><i style="width:' + Math.max(0, pct) + '%"></i></div>';
  }

  function flagHTML(id) {
    var f = S.flags[id], on = !!f, open = openFlag === id;
    var h = '<div class="flag' + (on ? " on" : "") + '">';
    h += '<button type="button" class="flag-btn" data-act="flag" data-id="' + id + '">' + (on ? "متعلّم عليها ✓ (غيّر)" : "علّم دي لو وقفتك") + "</button>";
    if (open) {
      h += '<div class="flag-box"><div class="chips">';
      FLAG_REASONS.forEach(function (r, i) {
        var sel = f && f.reasons.indexOf(r) !== -1;
        h += '<button type="button" class="chip' + (sel ? " sel" : "") + '" data-act="reason" data-id="' + id + '" data-i="' + i + '">' + esc(r) + "</button>";
      });
      h += '</div><textarea class="note" data-id="' + id + '" rows="2" placeholder="لو حابب تكتب حاجة (اختياري)">' + esc(f ? f.note : "") + "</textarea>";
      h += '<div class="flag-actions"><button type="button" class="mini" data-act="flagdone" data-id="' + id + '">تمام</button>';
      if (on) h += '<button type="button" class="mini ghost" data-act="unflag" data-id="' + id + '">شيل العلامة</button>';
      h += "</div></div>";
    }
    return h + "</div>";
  }

  function render() {
    var s = S.screen, h = "";
    if (s === "intro") h = rIntro();
    else if (s === "welcome") h = rWelcome();
    else if (s === "period") h = rPeriod();
    else if (s === "periodThanks") h = rText(Q.period.thanks, "يلّا نبدأ");
    else if (/^s\d$/.test(s)) h = rStation(stationOf(+s.slice(1)));
    else if (/^t\d$/.test(s)) h = rText(stationOf(+s.slice(1)).transition, s === "t7" ? "كمّل" : "المحطة الجاية");
    else if (s === "closing") h = rClosing();
    else if (s === "done") h = rDone();
    main.innerHTML = progressHTML() + h;
    shownAt = now();
    paintSync();
  }

  function rIntro() {
    var h = '<section class="card rise"><h1>أهلًا بيك</h1>';
    h += '<p class="lead">شكرًا إنك وافقت تجرّب معانا النسخة الأولى من المقياس ده.</p>';
    h += '<label class="field"><span>اسمك</span><input id="nm" type="text" autocomplete="given-name" maxlength="60" value="' + esc(S.name) + '" placeholder="اكتب اسمك"></label>';
    h += '<div class="field"><span>سنك تقريبًا <em>(اختياري)</em></span><div class="chips">';
    AGES.forEach(function (a) { h += '<button type="button" class="chip' + (S.age === a ? " sel" : "") + '" data-act="age" data-v="' + esc(a) + '">' + esc(a) + "</button>"; });
    h += "</div></div>";
    h += '<p class="privacy">إجاباتك هيشوفها محمود فؤاد بس، علشان يطوّر المقياس، ومش هتتنشر.</p>';
    h += '<button type="button" class="next" data-act="start"' + (S.name.trim() ? "" : ' aria-disabled="true"') + ">ابدأ</button>";
    h += '<p class="hint" id="nmHint" hidden>اكتب اسمك الأول.</p>';
    if (!fb.ok) h += '<p class="warn">الاتصال ضعيف دلوقتي. تقدر تكمّل عادي، وإجاباتك هتتحفظ على جهازك وتتبعت أول ما النت يرجع.</p>';
    return h + "</section>";
  }

  function rWelcome() {
    var h = '<section class="card rise"><h1>' + esc(Q.welcome.title) + "</h1>";
    Q.welcome.paragraphs.forEach(function (p) { h += "<p>" + esc(p) + "</p>"; });
    h += '<p class="soft">وتحت كل سؤال هتلاقي «علّم دي لو وقفتك». لو أي سؤال وقفك، أو ما فهمتوش، أو حسيت إن مفيش إجابة مظبوطة ليك، علّم عليه. ده أهم حاجة بتساعدنا.</p>';
    return h + '<button type="button" class="next" data-act="go">يلّا</button></section>';
  }

  function rPeriod() {
    var P = Q.period, sel = S.period.selected;
    var h = '<section class="card rise"><h2>قبل ما نبدأ</h2><p class="q">' + esc(P.question) + '</p><div class="checks">';
    P.options.forEach(function (o) {
      var on = sel.indexOf(o.id) !== -1;
      h += '<button type="button" class="check' + (on ? " sel" : "") + '" data-act="period" data-id="' + o.id + '"><b aria-hidden="true">' + (on ? "✓" : "") + "</b>" + esc(o.text) + "</button>";
    });
    h += "</div>";
    var some = sel.length && !(sel.length === 1 && isNone(sel[0]));
    if (some) {
      h += '<p class="q">' + esc(P.followup.question) + '</p><div class="chips">';
      P.followup.options.forEach(function (o) { h += '<button type="button" class="chip' + (S.period.impact === o ? " sel" : "") + '" data-act="impact" data-v="' + esc(o) + '">' + esc(o) + "</button>"; });
      h += "</div>";
    }
    h += flagHTML("period");
    var ok = sel.length && (!some || S.period.impact);
    h += '<button type="button" class="next" data-act="periodNext"' + (ok ? "" : ' aria-disabled="true"') + ">التالي</button>";
    return h + "</section>";
  }
  function isNone(id) { return Q.period.options.some(function (o) { return o.id === id && o.none; }); }

  function rText(text, btn) {
    return '<section class="card rise center"><p class="big">' + esc(text) + '</p><button type="button" class="next" data-act="go">' + esc(btn) + "</button></section>";
  }

  function rStation(st) {
    var rec = ensureSt(st.id);
    if (!rec.startedAt) { rec.startedAt = now(); save(); }
    if (st.id === 7 && !S.adaptive) { S.adaptive = computeAdaptive(); save(); }
    var h = '<header class="st-head rise"><div class="st-n">المحطة ' + ar(st.id) + " من ٧</div><h2>" + esc(st.title) + "</h2>";
    st.intro.forEach(function (p) { h += "<p>" + esc(p) + "</p>"; });
    if (st.kind === "triad") h += '<p class="soft">في كل موقف: دوس «الأقرب» على اختيار، و«الأبعد» على اختيار تاني.</p>';
    h += "</header>";
    var ans = rec.answers;
    st.items.forEach(function (it, i) {
      h += st.kind === "triad" ? rTriad(st, it, i, rec) : rFreq(st, it, i, ans);
    });
    if (st.bipolar) {
      h += '<header class="st-head sub"><h3>' + esc(st.bipolar.title) + "</h3><p>" + esc(st.bipolar.intro) + "</p></header>";
      st.bipolar.items.forEach(function (it, i) { h += rBipolar(st, it, i, ans); });
    }
    var miss = stationMissing(st);
    h += '<div class="foot"><div class="left" id="left">' + (miss.length ? "فاضل " + ar(miss.length) : "كده المحطة كملت") + "</div>";
    h += '<button type="button" class="next" data-act="stNext" data-st="' + st.id + '"' + (miss.length ? ' aria-disabled="true"' : "") + ">" + (st.id === 7 ? "خلّصت" : "التالي") + "</button></div>";
    return h;
  }

  function rTriad(st, it, i, rec) {
    if (!rec.order[it.id]) {
      rec.order[it.id] = shuffle(it.options.map(function (o) { return o.id; }));
      save();
    }
    var a = rec.answers[it.id] || {}, byId = {};
    it.options.forEach(function (o) { byId[o.id] = o; });
    var done = itemDone(st, it, rec.answers);
    var h = '<article class="item' + (done ? " done" : "") + (a.none ? " none" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(it.text) + "</p>";
    h += '<div class="opts">';
    rec.order[it.id].forEach(function (oid) {
      var o = byId[oid], c = a.closest === oid, f = a.farthest === oid;
      h += '<div class="opt' + (c ? " is-c" : "") + (f ? " is-f" : "") + '"><p>' + esc(o.text) + '</p><div class="pick">';
      h += '<button type="button" class="pk c' + (c ? " on" : "") + '" data-act="close" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + c + '">الأقرب</button>';
      h += '<button type="button" class="pk f' + (f ? " on" : "") + '" data-act="far" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + f + '">الأبعد</button>';
      h += "</div></div>";
    });
    h += "</div>";
    if (it.light) h += '<button type="button" class="skip' + (a.none ? " on" : "") + '" data-act="none" data-st="' + st.id + '" data-id="' + it.id + '">' + (a.none ? "✓ " : "") + "ما مريتش بده قريب</button>";
    return h + flagHTML(it.id) + "</article>";
  }

  function rFreq(st, it, i, ans) {
    var a = ans[it.id] || {};
    var h = '<article class="item' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(itemText(st, it)) + '</p><div class="scale">';
    st.scale.forEach(function (lab, v) {
      h += '<button type="button" class="sc' + (a.v === v ? " on" : "") + '" data-act="freq" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" aria-pressed="' + (a.v === v) + '">' + esc(lab) + "</button>";
    });
    return h + "</div>" + flagHTML(it.id) + "</article>";
  }

  function rBipolar(st, it, i, ans) {
    var a = ans[it.id] || {}, sc = st.bipolar.scale;
    var h = '<article class="item bip' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(it.text) + "</p>";
    h += '<div class="poles"><div class="pole a"><b>أ</b>' + esc(it.a) + '</div><div class="pole b"><b>ب</b>' + esc(it.b) + "</div></div>";
    h += '<div class="dots" role="radiogroup">';
    for (var v = 1; v <= 5; v++) {
      h += '<button type="button" class="dot d' + v + (a.v === v ? " on" : "") + '" data-act="bip" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" role="radio" aria-checked="' + (a.v === v) + '" aria-label="' + esc(sc[v - 1]) + '"><i></i></button>';
    }
    h += '</div><div class="dots-lab"><span>أقرب لـ«أ»</span><span>في النص</span><span>أقرب لـ«ب»</span></div>';
    h += '<p class="dot-now">' + (typeof a.v === "number" ? esc(sc[a.v - 1]) : "&nbsp;") + "</p>";
    return h + flagHTML(it.id) + "</article>";
  }

  function rClosing() {
    var h = '<section class="card rise"><h2>آخر حاجة</h2><p>خلّصت المقياس. فاضل سؤالين صغيرين عن تجربتك إنت معاه.</p>';
    CLOSING_Q.forEach(function (q, i) {
      h += '<label class="field"><span>' + esc(q) + '</span><textarea id="cq' + (i + 1) + '" rows="4">' + esc(S.closing["q" + (i + 1)]) + "</textarea></label>";
    });
    return h + '<button type="button" class="next" data-act="finish">ابعت</button></section>';
  }

  function rDone() {
    var h = '<section class="card rise center"><h1>شكرًا يا ' + esc(S.name.split(" ")[0]) + "</h1>";
    h += '<p class="big">شكرًا من قلبي على وقتك وصراحتك. إجاباتك وملاحظاتك هي اللي هتخلّي المقياس ده أوضح للي جايين بعدك.</p>';
    h += '<p class="soft" id="doneSync"></p></section>';
    return h;
  }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ───────── تحديث جزئي (من غير ما الصفحة تنط) ───────── */
  function refreshItem(st, id) {
    var el = document.getElementById("it-" + id);
    if (!el) return render();
    var rec = ensureSt(st.id), html;
    var idx = -1, it = null, isB = false;
    st.items.forEach(function (x, i) { if (x.id === id) { idx = i; it = x; } });
    if (!it && st.bipolar) st.bipolar.items.forEach(function (x, i) { if (x.id === id) { idx = i; it = x; isB = true; } });
    if (isB) html = rBipolar(st, it, idx, rec.answers);
    else html = st.kind === "triad" ? rTriad(st, it, idx, rec) : rFreq(st, it, idx, rec.answers);
    var tmp = document.createElement("div"); tmp.innerHTML = html;
    el.parentNode.replaceChild(tmp.firstChild, el);
    var miss = stationMissing(st), left = $("#left"), nx = $('[data-act="stNext"]');
    if (left) left.textContent = miss.length ? "فاضل " + ar(miss.length) : "كده المحطة كملت";
    if (nx) { if (miss.length) nx.setAttribute("aria-disabled", "true"); else nx.removeAttribute("aria-disabled"); }
  }
  function refreshFlag(id) {
    var st = /^s\d$/.test(S.screen) ? stationOf(+S.screen.slice(1)) : null;
    if (st) return refreshItem(st, id);
    render();
  }

  function setAns(st, id, patch) {
    var rec = ensureSt(st.id), a = rec.answers[id] || { changes: 0 };
    Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
    a.changes = (a.changes || 0) + 1;
    a.t = now() - shownAt;     // من ظهور الشاشة لحد آخر ضغطة على العبارة دي
    rec.answers[id] = a;
    save();
    refreshItem(st, id);
  }

  /* ───────── الأحداث ───────── */
  function onClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    var st = b.hasAttribute("data-st") ? stationOf(+b.getAttribute("data-st")) : null;

    if (act === "age") { S.age = S.age === b.getAttribute("data-v") ? "" : b.getAttribute("data-v"); save(); return render(); }
    if (act === "start") {
      var nm = ($("#nm").value || "").trim().replace(/\s+/g, " ").slice(0, 60);
      if (!nm) { $("#nmHint").hidden = false; $("#nm").focus(); return; }
      S.name = nm; return go(nextScreen(), "start");
    }
    if (act === "go") return go(nextScreen());

    if (act === "period") {
      var sel = S.period.selected, i = sel.indexOf(id);
      if (i !== -1) sel.splice(i, 1);
      else if (isNone(id)) { S.period.selected = [id]; S.period.impact = null; }
      else { S.period.selected = sel.filter(function (x) { return !isNone(x); }); S.period.selected.push(id); }
      if (!S.period.selected.length || (S.period.selected.length === 1 && isNone(S.period.selected[0]))) S.period.impact = null;
      save(); return render();
    }
    if (act === "impact") { S.period.impact = b.getAttribute("data-v"); save(); return render(); }
    if (act === "periodNext") {
      if (b.getAttribute("aria-disabled")) return;
      S.period.t = now() - shownAt; return go(nextScreen(), "period");
    }

    if (act === "close" || act === "far") {
      var a = ensureSt(st.id).answers[id] || {}, o = b.getAttribute("data-o"), p = { none: false };
      if (act === "close") { p.closest = a.closest === o ? null : o; if (p.closest && a.farthest === o) p.farthest = null; }
      else { p.farthest = a.farthest === o ? null : o; if (p.farthest && a.closest === o) p.closest = null; }
      return setAns(st, id, p);
    }
    if (act === "none") {
      var cur = ensureSt(st.id).answers[id] || {};
      return setAns(st, id, cur.none ? { none: false } : { none: true, closest: null, farthest: null });
    }
    if (act === "freq") {
      var v = +b.getAttribute("data-v");
      return setAns(st, id, { v: v, label: st.scale[v] });
    }
    if (act === "bip") return setAns(st, id, { v: +b.getAttribute("data-v") });

    if (act === "stNext") {
      var miss = stationMissing(st);
      if (miss.length) {
        var el = document.getElementById("it-" + miss[0]);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
        return;
      }
      ensureSt(st.id).endedAt = now();
      if (st.id === 2 && !S.adaptive) S.adaptive = computeAdaptive();
      return go(nextScreen(), "station " + st.id);
    }

    if (act === "flag") { openFlag = openFlag === id ? null : id; return refreshFlag(id); }
    if (act === "reason") {
      var f = S.flags[id] || { reasons: [], note: "", at: now() }, r = FLAG_REASONS[+b.getAttribute("data-i")];
      var k = f.reasons.indexOf(r);
      if (k === -1) f.reasons.push(r); else f.reasons.splice(k, 1);
      f.at = now(); f.screen = S.screen;
      S.flags[id] = f; cleanFlag(id); save(); return refreshFlag(id);
    }
    if (act === "flagdone") { openFlag = null; return refreshFlag(id); }
    if (act === "unflag") { delete S.flags[id]; openFlag = null; save(); return refreshFlag(id); }

    if (act === "finish") {
      S.closing.q1 = ($("#cq1").value || "").trim().slice(0, 4000);
      S.closing.q2 = ($("#cq2").value || "").trim().slice(0, 4000);
      S.status = "خلص"; S.finishedAt = now(); S.screen = "done";
      save(); render();
      return push("finish").then(paintDone);
    }
    if (act === "retry") return push("retry").then(paintDone);
  }
  function cleanFlag(id) { var f = S.flags[id]; if (f && !f.reasons.length && !f.note) delete S.flags[id]; }
  function paintDone() {
    var d = $("#doneSync");
    if (!d) return;
    if (sync.state === "ok") d.textContent = "إجاباتك وصلت ✓";
    else d.innerHTML = 'إجاباتك محفوظة على جهازك، بس لسه ما وصلتش. <button type="button" class="mini" data-act="retry">جرّب تبعتها تاني</button>';
  }

  function onInput(e) {
    var t = e.target;
    if (t.id === "nm") {
      S.name = t.value.slice(0, 60); save();
      var btn = $('[data-act="start"]');
      if (btn) { if (t.value.trim()) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true"); }
      return;
    }
    if (t.classList.contains("note")) {
      var id = t.getAttribute("data-id"), f = S.flags[id] || { reasons: [], note: "", at: now() };
      f.note = t.value.slice(0, 2000); f.at = now(); f.screen = S.screen;
      S.flags[id] = f; cleanFlag(id); save();
      return;
    }
    if (t.id === "cq1" || t.id === "cq2") { S.closing["q" + t.id.slice(2)] = t.value.slice(0, 4000); save(); }
  }

  /* ───────── البداية ───────── */
  function boot() {
    main = $("#main");
    fetch("items.json?ts=" + Math.floor(now() / 60000), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("items " + r.status); return r.json(); })
      .then(function (q) {
        Q = q; buildScreens();
        S = store.get(LS_KEY);
        if (S && S.v === 1 && SCREENS.indexOf(S.screen) !== -1) {
          // كمّل من نفس المكان. ونسخة الأسئلة اللي بدأ بيها تفضل متسجلة زي ما هي.
          start();
        } else {
          S = freshState();
          // مفيش حاجة على الجهاز: لو فيه دخول قديم ووثيقة على فايربيز، كمّل منها.
          signIn().then(function (u) {
            return fb.db.collection(AXP_COLLECTION).doc(u.uid).get().then(function (snap) {
              if (snap.exists) {
                var d = snap.data(); delete d.updatedAt; delete d.lastPush;
                if (d.v === 1 && SCREENS.indexOf(d.screen) !== -1) { S = d; sync.state = "ok"; }
              }
            });
          }).catch(function () {}).then(start);
        }
      })
      .catch(function (e) {
        main.innerHTML = '<section class="card"><h2>الصفحة ما اتحمّلتش</h2><p>جرّب تقفل الصفحة وتفتحها تاني. ولو المشكلة فضلت، ابعت لمحمود.</p><p class="soft">' + esc(e.message || e) + "</p></section>";
      });
  }
  function start() {
    save(); render();
    if (S.screen === "done") paintDone();
    signIn().then(function (u) { if (!S.uid) { S.uid = u.uid; save(); } }).catch(function (e) { fb.err = (e && e.code) || fb.err; });
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
  }

  /* للاختبار من الكونسول بس */
  window.AXP = { state: function () { return S; }, computeAdaptive: function () { return computeAdaptive(); } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
