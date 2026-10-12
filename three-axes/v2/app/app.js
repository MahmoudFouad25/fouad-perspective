/* =====================================================================
   app.js — صفحة العميل في «مقياس مسارات الطاقة» (النسخة ٢)
   ---------------------------------------------------------------------
   • الأسئلة من engine/items.json (النسخة المقفولة). مفيش نص أسئلة هنا.
   • الحفظ: على الجهاز بعد كل ضغطة، وفي فايربيز بعد كل محطة. والرجوع بيكمّل من مكانه.
   • لما المحطة السابعة تخلص: النتيجة بتتحسب على الجهاز بالمحرك، وتتحفظ، والعميل يروح لتقريره.
   • صيغة الكلام: أول شاشة «نكلمك إزاي؟» (لو مش معروفة من حساب المنصة). والاختيار بيتحفظ في الوثيقة (address: m / f)
     وفي users/{userId}.personalInfo.address. وكل نص بيعدّي على F() اللي بتجيب نسخته المؤنثة من items.fem.
   ===================================================================== */
(function () {
  "use strict";
  var X = window.AXV2, E = window.AxesV2Engine, CONF = window.AXES_V2_CONFIG;
  var ar = X.ar, esc = X.esc, clone = X.clone;
  var FREQ = ["عمري", "نادرًا", "أحيانًا", "كتير", "دايمًا"];
  // ختام المحطة ٧ في نسخة البصيرة (قرار محمود): نفس النص وزيادة الجلسة
  var INSIGHT_S7_ADD = "وهنكمّله سوا في جلستك.";
  function $(s, r) { return (r || document).querySelector(s); }
  function now() { return Date.now(); }

  var ITEMS = null, TEXTS = null, CTX = null, ST = [], S = null, SCREENS = [], shownAt = 0, main = null;
  var sync = { state: "idle", pending: false };
  var LS = function () { return "axv2:s:" + CTX.userId; };
  // صيغة الكلام: F() للنصوص اللي جاية من ملف الأسئلة، و G() للجمل القليلة المكتوبة هنا
  function fem() { return !!(S && S.address === "f"); }
  function F(s) { return (fem() && s && ITEMS.fem && ITEMS.fem[s]) || s; }
  function G(m, f) { return fem() ? f : m; }

  /* ───────── المحطات من ملف الأسئلة ───────── */
  function buildStations() {
    ST = ITEMS.client.stations.map(function (c) {
      var st = { id: c.id, title: c.title, intro: [].concat(c.intro || []), transition: c.transition, scale: c.scale || FREQ };
      if (c.id === 1 || c.id === 2) {
        st.kind = "triad";
        st.items = (c.id === 1 ? ITEMS.station1 : ITEMS.station2).map(function (it) { return { id: it.id, n: it.n, text: it.text, light: !!it.light, options: it.options }; });
      } else {
        st.kind = "freq";
        st.items = ITEMS.freq.filter(function (i) { return i.station === c.id; }).sort(function (a, b) { return a.n - b.n; })
          .map(function (i) { return { id: i.id, n: i.n, text: i.text, adaptive: i.kind === "adaptive" ? i.slot : null }; });
      }
      if (c.bipolar) st.bipolar = { title: c.bipolar.title, intro: c.bipolar.intro, scale: c.bipolar.scale, items: ITEMS.bipolar };
      return st;
    });
    SCREENS = ["address", "welcome", "period", "periodThanks"];
    ST.forEach(function (st) { SCREENS.push("s" + st.id); SCREENS.push("t" + st.id); });
    SCREENS.push("closing");
  }
  function stationOf(id) { for (var i = 0; i < ST.length; i++) if (ST[i].id === id) return ST[i]; return null; }

  /* ───────── الحالة ───────── */
  function fresh() {
    return {
      v: 2, userId: CTX.userId, authUid: CTX.authUser.uid, email: CTX.email, name: CTX.name, purchase: CTX.mode,
      questionsVersion: ITEMS.version, questionsHash: ITEMS.hash, qVersion: { questions: ITEMS.version, hash: ITEMS.hash }, device: device(),
      address: CTX.address || null,
      status: "شغال", screen: CTX.address ? "welcome" : "address", startedAt: now(), updatedAtMs: now(), finishedAt: null,
      period: { selected: [], impact: null }, st: {}, adaptive: null
    };
  }
  function device() {
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPod|iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) ? "موبايل" : "كمبيوتر";
  }
  function ensureSt(id) {
    var k = String(id);
    if (!S.st[k]) S.st[k] = { startedAt: null, endedAt: null, answers: {}, order: {} };
    return S.st[k];
  }
  function save() { S.updatedAtMs = now(); X.store.set(LS(), S); }

  /* ───────── الإرسال لفايربيز (بعد كل محطة) ───────── */
  function push(reason, extra) {
    save();
    sync.pending = true; paintSync();
    var data = clone(S);
    data.authUid = CTX.authUser.uid;
    data.lastPush = reason || "";
    data.updatedAt = X.ts();
    if (extra) Object.keys(extra).forEach(function (k) { data[k] = extra[k]; });
    return X.docRef(CTX.userId).set(data, { merge: true }).then(function () {
      sync.pending = false; sync.state = "ok"; paintSync(); return true;
    }).catch(function (e) {
      sync.state = "err"; sync.err = (e && e.code) || "err"; paintSync();
      console.warn("[axv2] push", e); return false;
    });
  }
  function paintSync() {
    var d = $("#sync"); if (!d) return;
    if (sync.pending && sync.state !== "err") { d.className = "sync"; d.textContent = "بيتحفظ…"; }
    else if (sync.state === "ok") { d.className = "sync ok"; d.textContent = "اتحفظ"; }
    else if (sync.state === "err") { d.className = "sync err"; d.textContent = "محفوظ على جهازك، وهيتبعت لما النت يرجع"; }
    else { d.className = "sync"; d.textContent = ""; }
  }
  window.addEventListener("online", function () { if (S && sync.state === "err") retry(); });
  setInterval(function () { if (S && sync.state === "err") retry(); }, 30000);
  function retry() { return S.status === "خلص" ? finish() : push("retry"); }

  /* ───────── صيغة الاستبدال (المحرك نفسه، بعد المحطة ٢) ───────── */
  function computeAdaptive() {
    var r = E.adaptiveRow(S, ITEMS, CONF);
    var shown = {};
    stationOf(7).items.forEach(function (it) { if (it.adaptive) shown[it.id] = r.slots[it.adaptive - 1]; });
    return { row: r.row, main: r.main, suppressed: r.suppressed, general: r.general, reason: r.reason, shown: shown, engineVersion: E.ENGINE_VERSION };
  }
  function itemText(it) { return F(it.adaptive ? ((S.adaptive && S.adaptive.shown[it.id]) || "") : it.text); }

  /* ───────── الاكتمال ───────── */
  function itemDone(st, it, ans) {
    var a = ans[it.id];
    if (!a) return false;
    if (st.kind === "triad") return !!(a.none || (a.closest && a.farthest && a.closest !== a.farthest));
    return typeof a.v === "number";
  }
  function missingOf(st) {
    var ans = ensureSt(st.id).answers, miss = [];
    st.items.forEach(function (it) { if (!itemDone(st, it, ans)) miss.push(it.id); });
    if (st.bipolar) st.bipolar.items.forEach(function (it) { var a = ans[it.id]; if (!a || typeof a.v !== "number") miss.push(it.id); });
    return miss;
  }

  /* ───────── الرسم ───────── */
  function go(screen, reason) {
    S.screen = screen; save();
    if (reason) push(reason);   // الشاشة الجاية بتتسجل قبل الإرسال، فالرجوع يبقى من أول حاجة ما خلصتش
    render(); window.scrollTo(0, 0);
  }
  function nextScreen() { return SCREENS[SCREENS.indexOf(S.screen) + 1]; }
  function progressHTML() {
    var m = /^[st](\d)$/.exec(S.screen), n = m ? +m[1] : 0;
    var pct = S.screen === "closing" ? 100 : Math.round((n - (S.screen.charAt(0) === "s" ? 1 : 0)) / 7 * 100);
    return '<div class="prog" aria-hidden="true"><i style="width:' + Math.max(0, pct) + '%"></i></div>';
  }
  function render() {
    var s = S.screen, h = "";
    if (s === "address") h = rAddress();
    else if (s === "welcome") h = rWelcome();
    else if (s === "period") h = rPeriod();
    else if (s === "periodThanks") h = rText(F(ITEMS.client.period.thanks), "يلّا نبدأ");
    else if (/^s\d$/.test(s)) h = rStation(stationOf(+s.slice(1)));
    else if (/^t\d$/.test(s)) h = rText(transitionOf(stationOf(+s.slice(1))), s === "t7" ? G("كمّل", "كمّلي") : "المحطة الجاية");
    else if (s === "closing") h = rClosing();
    main.innerHTML = progressHTML() + h;
    shownAt = now(); paintSync();
  }
  function transitionOf(st) {
    var t = F(st.transition);
    return st.id === 7 && CTX.mode === "insight" ? String(t).replace(/\.?\s*$/, "، ") + INSIGHT_S7_ADD : t;
  }
  // أول شاشة: نكلمك إزاي؟ (إجباري، ومن غير صيغة لسه، فالكلام فيها محايد)
  function rAddress() {
    var h = '<section class="card rise center addr"><h2>نكلمك إزاي؟</h2>';
    h += "<p>الأسئلة والتقرير بيكلموك على طول، فأنهي صيغة تناسبك؟</p>";
    h += '<div class="addr-pick"><button type="button" class="next" data-act="addr" data-v="m">بصيغة المذكر</button>';
    h += '<button type="button" class="next" data-act="addr" data-v="f">بصيغة المؤنث</button></div>';
    return h + '<p class="soft">الاختيار ده بيغيّر الكلام بس. الأسئلة والحساب واحد في الصيغتين، والصيغة ممكن تتغير بعدين.</p></section>';
  }
  function rWelcome() {
    var W = ITEMS.client.welcome, nm = X.first(CTX.name);
    var h = '<section class="card rise"><h1>' + esc(F(W.title)) + (nm ? " يا " + esc(nm) : "") + "</h1>";
    W.paragraphs.forEach(function (p) { h += "<p>" + esc(F(p)) + "</p>"; });
    h += '<button type="button" class="next" data-act="go">يلّا</button>';
    // الصيغة معروفة (اختارها هنا أو محفوظة في حسابه): بتتعرض كإعداد يتغير
    h += '<p class="soft addr-now">' + G("بنكلمك بصيغة المذكر.", "بنكلمك بصيغة المؤنث.") +
         ' <button type="button" class="linkish" data-act="addrSwitch">' + G("غيّرها لصيغة المؤنث", "غيّريها لصيغة المذكر") + "</button></p>";
    return h + "</section>";
  }
  function isNone(id) { return ITEMS.client.period.options.some(function (o) { return o.id === id && o.none; }); }
  function rPeriod() {
    var P = ITEMS.client.period, sel = S.period.selected;
    var h = '<section class="card rise"><h2>قبل ما نبدأ</h2><p class="q">' + esc(F(P.question)) + '</p><div class="checks">';
    P.options.forEach(function (o) {
      var on = sel.indexOf(o.id) !== -1;
      h += '<button type="button" class="check' + (on ? " sel" : "") + '" data-act="period" data-id="' + o.id + '"><b aria-hidden="true">' + (on ? "✓" : "") + "</b>" + esc(F(o.text)) + "</button>";
    });
    h += "</div>";
    var some = sel.length && !(sel.length === 1 && isNone(sel[0]));
    if (some) {
      h += '<p class="q">' + esc(F(P.followup.question)) + '</p><div class="chips">';
      P.followup.options.forEach(function (o) { h += '<button type="button" class="chip' + (S.period.impact === o ? " sel" : "") + '" data-act="impact" data-v="' + esc(o) + '">' + esc(o) + "</button>"; });
      h += "</div>";
    }
    var ok = sel.length && (!some || S.period.impact);
    return h + '<button type="button" class="next" data-act="periodNext"' + (ok ? "" : ' aria-disabled="true"') + ">التالي</button></section>";
  }
  function rText(text, btn) {
    return '<section class="card rise center"><p class="big">' + esc(text) + '</p><button type="button" class="next" data-act="go">' + esc(btn) + "</button></section>";
  }
  function rStation(st) {
    var rec = ensureSt(st.id);
    if (!rec.startedAt) { rec.startedAt = now(); save(); }
    if (st.id === 7 && !S.adaptive) { S.adaptive = computeAdaptive(); save(); }
    var h = '<header class="st-head rise"><div class="st-n">المحطة ' + ar(st.id) + " من ٧</div><h2>" + esc(F(st.title)) + "</h2>";
    st.intro.forEach(function (p) { h += "<p>" + esc(F(p)) + "</p>"; });
    if (st.kind === "triad") h += '<p class="soft">' + G("في كل موقف: دوس «الأقرب» على اختيار، و«الأبعد» على اختيار تاني.", "في كل موقف: دوسي «الأقرب» على اختيار، و«الأبعد» على اختيار تاني.") + "</p>";
    h += "</header>";
    st.items.forEach(function (it, i) { h += st.kind === "triad" ? rTriad(st, it, i, rec) : rFreq(st, it, i, rec.answers); });
    if (st.bipolar) {
      h += '<header class="st-head sub"><h3>' + esc(F(st.bipolar.title)) + "</h3><p>" + esc(F(st.bipolar.intro)) + "</p></header>";
      st.bipolar.items.forEach(function (it, i) { h += rBipolar(st, it, i, rec.answers); });
    }
    var miss = missingOf(st);
    h += '<div class="foot"><div class="left" id="left">' + (miss.length ? "فاضل " + ar(miss.length) : "كده المحطة كملت") + "</div>";
    return h + '<button type="button" class="next" data-act="stNext" data-st="' + st.id + '"' + (miss.length ? ' aria-disabled="true"' : "") + ">" + (st.id === 7 ? "خلّصت" : "التالي") + "</button></div>";
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rTriad(st, it, i, rec) {
    if (!rec.order[it.id]) { rec.order[it.id] = shuffle(it.options.map(function (o) { return o.id; })); save(); }
    var a = rec.answers[it.id] || {}, byId = {};
    it.options.forEach(function (o) { byId[o.id] = o; });
    var h = '<article class="item' + (itemDone(st, it, rec.answers) ? " done" : "") + (a.none ? " none" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(F(it.text)) + '</p><div class="opts">';
    rec.order[it.id].forEach(function (oid) {
      var o = byId[oid], c = a.closest === oid, f = a.farthest === oid;
      h += '<div class="opt' + (c ? " is-c" : "") + (f ? " is-f" : "") + '"><p>' + esc(F(o.text)) + '</p><div class="pick">';
      h += '<button type="button" class="pk c' + (c ? " on" : "") + '" data-act="close" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + c + '">الأقرب</button>';
      h += '<button type="button" class="pk f' + (f ? " on" : "") + '" data-act="far" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + f + '">الأبعد</button></div></div>';
    });
    h += "</div>";
    if (it.light) h += '<button type="button" class="skip' + (a.none ? " on" : "") + '" data-act="none" data-st="' + st.id + '" data-id="' + it.id + '">' + (a.none ? "✓ " : "") + "ما مريتش بده قريب</button>";
    return h + "</article>";
  }
  function rFreq(st, it, i, ans) {
    var a = ans[it.id] || {};
    var h = '<article class="item' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(itemText(it)) + '</p><div class="scale">';
    st.scale.forEach(function (lab, v) {
      h += '<button type="button" class="sc' + (a.v === v ? " on" : "") + '" data-act="freq" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" aria-pressed="' + (a.v === v) + '">' + esc(lab) + "</button>";
    });
    return h + "</div></article>";
  }
  function rBipolar(st, it, i, ans) {
    var a = ans[it.id] || {}, sc = st.bipolar.scale;
    var h = '<article class="item' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '"><p class="q"><span class="num">' + ar(i + 1) + ".</span> " + esc(F(it.text)) + "</p>";
    h += '<div class="poles"><div class="pole"><b>أ</b>' + esc(F(it.a)) + '</div><div class="pole"><b>ب</b>' + esc(F(it.b)) + '</div></div><div class="dots" role="radiogroup">';
    for (var v = 1; v <= 5; v++) h += '<button type="button" class="dot' + (a.v === v ? " on" : "") + '" data-act="bip" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" role="radio" aria-checked="' + (a.v === v) + '" aria-label="' + esc(sc[v - 1]) + '"><i></i></button>';
    h += '</div><div class="dots-lab"><span>أقرب لـ«أ»</span><span>في النص</span><span>أقرب لـ«ب»</span></div>';
    return h + '<p class="dot-now">' + (typeof a.v === "number" ? esc(sc[a.v - 1]) : "&nbsp;") + "</p></article>";
  }
  function rClosing() {
    var h = '<section class="card rise center">';
    ITEMS.client.closing.forEach(function (p) { h += '<p class="big">' + esc(F(p)) + "</p>"; });
    h += '<button type="button" class="next" data-act="report">اعرض خريطتي</button><p class="soft" id="doneSync"></p></section>';
    return h;
  }

  /* ───────── تحديث جزئي ───────── */
  function refreshItem(st, id) {
    var el = document.getElementById("it-" + id);
    if (!el) return render();
    var rec = ensureSt(st.id), html = null;
    st.items.forEach(function (x, i) { if (x.id === id) html = st.kind === "triad" ? rTriad(st, x, i, rec) : rFreq(st, x, i, rec.answers); });
    if (!html && st.bipolar) st.bipolar.items.forEach(function (x, i) { if (x.id === id) html = rBipolar(st, x, i, rec.answers); });
    var tmp = document.createElement("div"); tmp.innerHTML = html;
    el.parentNode.replaceChild(tmp.firstChild, el);
    var miss = missingOf(st), left = $("#left"), nx = $('[data-act="stNext"]');
    if (left) left.textContent = miss.length ? "فاضل " + ar(miss.length) : "كده المحطة كملت";
    if (nx) { if (miss.length) nx.setAttribute("aria-disabled", "true"); else nx.removeAttribute("aria-disabled"); }
  }
  function setAns(st, id, patch) {
    var rec = ensureSt(st.id), a = rec.answers[id] || { changes: 0 };
    Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
    a.changes = (a.changes || 0) + 1;
    a.t = now() - shownAt;
    rec.answers[id] = a; save(); refreshItem(st, id);
  }

  /* ───────── النهاية: الحساب على الجهاز والحفظ ───────── */
  function finish() {
    var R;
    try { R = E.score(S, ITEMS, CONF); }
    catch (e) { console.error(e); sync.state = "err"; paintSync(); return Promise.resolve(false); }
    S.status = "خلص"; if (!S.finishedAt) S.finishedAt = now(); save();
    return push("finish", {
      result: clone(R), engineVersion: R.engineVersion, configVersion: R.configVersion, textsVersion: TEXTS.version,
      summary: summary(R), computedAt: now()
    });
  }
  // سطر مختصر لقايمة الأدمن (من غير ما يحتاج يقرا النتيجة كلها)
  function summary(R) {
    return { order: [R.final.main, R.final.supporting, R.final.suppressed || R.ranking.order[2]], confidence: R.ranking.confidence,
             suppressedStatus: R.suppressed.status, alerts: ["freeze", "depletion", "mood", "period"].filter(function (k) { return R.alerts[k].on; }) };
  }
  function toReport() { location.href = "report.html"; }

  /* ───────── الأحداث ───────── */
  function onClick(e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    var st = b.hasAttribute("data-st") ? stationOf(+b.getAttribute("data-st")) : null;
    if (act === "go") return go(nextScreen());
    if (act === "addr" || act === "addrSwitch") {
      var v = act === "addr" ? b.getAttribute("data-v") : (S.address === "f" ? "m" : "f");
      S.address = v; S.addressAt = now(); save();
      X.saveAddressToUser(CTX.userId, v);
      if (S.screen === "address") { var back = S.afterAddress || "welcome"; delete S.afterAddress; return go(back, "address"); }
      push("address"); return render();
    }
    if (act === "period") {
      var sel = S.period.selected, i = sel.indexOf(id);
      if (i !== -1) sel.splice(i, 1);
      else if (isNone(id)) { S.period.selected = [id]; S.period.impact = null; }
      else { S.period.selected = sel.filter(function (x) { return !isNone(x); }); S.period.selected.push(id); }
      if (!S.period.selected.length || (S.period.selected.length === 1 && isNone(S.period.selected[0]))) S.period.impact = null;
      save(); return render();
    }
    if (act === "impact") { S.period.impact = b.getAttribute("data-v"); save(); return render(); }
    if (act === "periodNext") { if (b.getAttribute("aria-disabled")) return; S.period.t = now() - shownAt; return go(nextScreen(), "period"); }
    if (act === "close" || act === "far") {
      var a = ensureSt(st.id).answers[id] || {}, o = b.getAttribute("data-o"), p = { none: false };
      if (act === "close") { p.closest = a.closest === o ? null : o; if (p.closest && a.farthest === o) p.farthest = null; }
      else { p.farthest = a.farthest === o ? null : o; if (p.farthest && a.closest === o) p.closest = null; }
      return setAns(st, id, p);
    }
    if (act === "none") { var cur = ensureSt(st.id).answers[id] || {}; return setAns(st, id, cur.none ? { none: false } : { none: true, closest: null, farthest: null }); }
    if (act === "freq") { var v = +b.getAttribute("data-v"); return setAns(st, id, { v: v, label: st.scale[v] }); }
    if (act === "bip") return setAns(st, id, { v: +b.getAttribute("data-v") });
    if (act === "stNext") {
      var miss = missingOf(st);
      if (miss.length) {
        var el = document.getElementById("it-" + miss[0]);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
        return;
      }
      ensureSt(st.id).endedAt = now();
      if (st.id === 2 && !S.adaptive) S.adaptive = computeAdaptive();
      if (st.id === 7) { S.screen = nextScreen(); save(); render(); window.scrollTo(0, 0); return finish(); }
      return go(nextScreen(), "station " + st.id);
    }
    if (act === "report") {
      if (sync.state === "ok" && S.status === "خلص") return toReport();
      b.setAttribute("aria-disabled", "true"); b.textContent = "بنحفظ إجاباتك…";
      return finish().then(function (ok) {
        if (ok) return toReport();
        b.removeAttribute("aria-disabled"); b.textContent = G("جرّب تاني", "جرّبي تاني");
        var d = $("#doneSync"); if (d) d.textContent = G("إجاباتك محفوظة على جهازك، بس لسه ما وصلتش. اتأكد من النت ودوس تاني.", "إجاباتك محفوظة على جهازك، بس لسه ما وصلتش. اتأكدي من النت ودوسي تاني.");
      });
    }
  }

  /* ───────── البداية ───────── */
  function fail(msg) {
    main.innerHTML = '<section class="card"><h2>الصفحة ما اتحمّلتش</h2><p>جرّب تقفل الصفحة وتفتحها تاني. ولو المشكلة فضلت، كلّمنا: <a href="' +
      X.CFG.contact.link + '" target="_blank" rel="noopener">' + esc(X.CFG.contact.text) + '</a></p><p class="soft">' + esc(msg) + "</p></section>";
  }
  function boot() {
    main = $("#main");
    Promise.all([X.loadJSON("../engine/items.json"), X.loadJSON("../report/texts.json"), X.identify()]).then(function (r) {
      ITEMS = r[0]; TEXTS = r[1];
      var ints = E.verifyIntegrity(ITEMS);
      if (!ints.ok) throw new Error("ملف الأسئلة: " + ints.errors.join(" · "));
      return r[2].status === "ok" ? r[2] : X.runGate(main, r[2]);
    }).then(function (ctx) {
      CTX = ctx; buildStations();
      return X.docRef(CTX.userId).get().then(function (snap) { return snap.exists ? snap.data() : null; });
    }).then(function (remote) {
      if (remote && remote.status === "خلص" && remote.result) return toReport();
      var local = X.store.get(LS());
      if (local && (local.v !== 2 || local.userId !== CTX.userId)) local = null;
      var pick = remote && remote.v === 2 ? remote : null;
      if (local && (!pick || (local.updatedAtMs || 0) >= (pick.updatedAtMs || 0))) pick = local;
      if (pick) {
        S = pick; delete S.updatedAt; delete S.lastPush;
        delete S.result; delete S.summary; delete S.engineVersion; delete S.configVersion; delete S.textsVersion; delete S.computedAt;
        X.ADMIN_KEYS.forEach(function (k) { delete S[k]; });
        S.authUid = CTX.authUser.uid;
        if (!S.address && CTX.address) S.address = CTX.address;           // اتحفظت في حسابه من مقياس تاني أو جهاز تاني
        if (SCREENS.indexOf(S.screen) === -1) S.screen = S.address ? "welcome" : "address";
        if (S.screen === "address" && S.address) S.screen = "welcome";
        if (!S.address && S.screen !== "address" && S.status !== "خلص") { S.afterAddress = S.screen; S.screen = "address"; }   // بدأ قبل ما الشاشة دي تتعمل: بيرجع لمكانه بعدها
        if (S.status === "خلص") S.screen = "closing";            // خلّص على الجهاز ولسه ما وصلش ← نكمّل الإرسال
        if (remote) sync.state = "ok";
      } else S = fresh();
      save(); render();
      if (S.screen === "closing" && S.status === "خلص") finish();
      document.addEventListener("click", onClick);
    }).catch(function (e) { console.error(e); fail((e && e.message) || String(e)); });
  }

  window.AXV2_APP = { state: function () { return S; } };   // للاختبار من الكونسول بس
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
