/* =====================================================================
   app.js — صفحة المتطوع في «ميزان المتطوع»: المقياس والتقرير في صفحة واحدة.
   ---------------------------------------------------------------------
   • الرابط: mizan-scale/app/?c=CODE   (الكود = رقم الوثيقة في mizan_scale، والأدمن هو اللي بيعمله)
   • الأسئلة والنصوص من الملفات المقفولة: engine/items.json و report/texts.json. مفيش نص أسئلة هنا.
   • الحفظ: على الموبايل بعد كل دوسة، وعلى السيرفر بعد كل محطة. والرجوع بنفس الرابط بيكمّل من نفس المكان.
   • الصفحة ما بتقفش أبدًا: لو السيرفر مش واصل أو رافض، المتطوع بيكمّل والإجابات على موبايله،
     والرسالة بتقول السبب باسمه، والإرسال بيتعاد لوحده.
   • لما المحطة التاسعة تخلص: النتيجة بتتحسب على الموبايل بالمحرك، والتقرير بيظهر على طول، وبيتبعت للسيرفر.
   • الصيغة: F() لنصوص ملف الأسئلة (نسختها المؤنثة من items.fem)، و G() للجمل القليلة المكتوبة هنا.
   ===================================================================== */
(function () {
  "use strict";
  var X = window.MZS, E = window.MizanScaleEngine, CONF = window.MIZAN_SCALE_CONFIG, RP = window.MizanScaleReport;
  var ar = X.ar, esc = X.esc, clone = X.clone, MSG = X.MSG;
  var FREQ = ["عمري", "نادرًا", "أحيانًا", "كتير", "دايمًا"];
  function $(s, r) { return (r || document).querySelector(s); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function now() { return Date.now(); }

  var ITEMS = null, TEXTS = null, CODE = "", TRIAL = false, VERIFIED = false, META = { name: "" };
  var ST = [], S = null, SCREENS = [], shownAt = 0, main = null, booted = false, stopped = false;
  var sync = { state: "idle", pending: false };
  function LS() { return "mzs:" + CODE; }
  function addr() { return S ? S.address : null; }
  function fem() { return addr() === "f"; }
  function F(s) { return (fem() && s && ITEMS && ITEMS.fem && ITEMS.fem[s]) || s; }
  function G(m, f) { return fem() ? f : m; }

  /* ───────── الرسائل اللي فوق (كل واحدة باسم سببها) ───────── */
  var notes = {}, hidden = {};   // نصيحة التخزين ممكن تتقفل بـ«تمام»؛ رسايل الحفظ لأ
  function setNote(kind, text) { notes[kind] = text; paintNotes(); }
  // الرسايل اللي اتكتبت قبل ما نعرف الصيغة: تتكتب تاني بالصيغة اللي اختارها
  function refreshNotes() {
    if (notes.trial) notes.trial = MSG.trial(addr());
    if (notes.storage) notes.storage = MSG.storage(addr());
    if (notes.net) notes.net = VERIFIED ? MSG.offline(addr()) : MSG.unverified(addr());
    paintNotes();
  }
  function clearNote(kind) { if (notes[kind]) { delete notes[kind]; paintNotes(); } }
  function paintNotes() {
    var d = $("#note"); if (!d) return;
    var order = ["trial", "ours", "nosdk", "net", "storage"], h = "";
    order.forEach(function (k) {
      if (!notes[k] || hidden[k]) return;
      h += '<div class="nt nt-' + k + '" data-kind="' + k + '">' + esc(notes[k]) +
           (k === "storage" ? ' <button type="button" class="linkish nt-x" data-act="noteHide" data-kind="storage">تمام</button>' : "") + "</div>";
    });
    d.innerHTML = h; d.hidden = !h;
  }

  /* ───────── المحطات من ملف الأسئلة ───────── */
  function buildStations() {
    ST = ITEMS.client.stations.map(function (c) {
      var st = { id: c.id, title: c.title, intro: [].concat(c.intro || []), transition: c.transition, scale: c.scale || FREQ };
      if (c.id === 1 || c.id === 2 || c.id === 7) {
        st.kind = "triad";
        st.items = ITEMS["station" + c.id].map(function (it) { return { id: it.id, n: it.n, text: it.text, light: !!it.light, options: it.options }; });
      } else if (c.id === 8) {
        st.kind = "vcycle";
        st.items = ITEMS.vcycle.slice().sort(function (a, b) { return a.n - b.n; }).map(function (i) { return { id: i.id, n: i.n, text: i.text, early: i.early }; });
        st.now = ITEMS.vnow;
      } else {
        st.kind = "freq";
        st.items = ITEMS.freq.filter(function (i) { return i.station === c.id; }).sort(function (a, b) { return a.n - b.n; })
          .map(function (i) { return { id: i.id, n: i.n, text: i.text, adaptive: i.kind === "adaptive" ? i.slot : null }; });
      }
      if (c.bipolar) st.bipolar = { title: c.bipolar.title, intro: c.bipolar.intro, scale: c.bipolar.scale, items: ITEMS.bipolar };
      return st;
    });
    SCREENS = ["address", "welcome", "about", "period", "periodThanks"];
    ST.forEach(function (st) { SCREENS.push("s" + st.id); SCREENS.push("t" + st.id); });
    SCREENS.push("closing");
  }
  function stationOf(id) { for (var i = 0; i < ST.length; i++) if (ST[i].id === id) return ST[i]; return null; }

  /* ───────── الحالة ───────── */
  function fresh() {
    return {
      v: 1, address: null, status: "شغال", screen: "address", device: device(),
      questionsVersion: ITEMS.version, questionsHash: ITEMS.hash, qVersion: { questions: ITEMS.version, hash: ITEMS.hash },
      startedAt: now(), updatedAtMs: now(), finishedAt: null,
      period: { selected: [], impact: null }, client: {}, st: {}, adaptive: null
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
  // save(): تغيير جديد (بيحدّث updatedAtMs). persist(): كتابة على الموبايل من غير ما نعتبرها تغيير.
  // الفرق مهم: pushedAtMs = updatedAtMs معناها «كل اللي على الموبايل وصل السيرفر».
  function persist() { X.store.set(LS(), { code: CODE, S: S, meta: META, verified: VERIFIED }); }
  function save() { S.updatedAtMs = now(); persist(); }
  function unsent() { return S && S.pushedAtMs !== S.updatedAtMs; }

  /* ───────── السيرفر ───────── */
  var ref = null;
  function server() { if (TRIAL) return null; if (!ref) ref = X.docRef(CODE); return ref; }
  function noteFor(e) {
    var k = X.kindOf(e);
    if (k === "ours") { clearNote("net"); setNote("ours", MSG.ours(addr(), (e && e.code) || "")); }
    else if (k === "nosdk") setNote("nosdk", MSG.nosdk(addr()));
    else setNote("net", VERIFIED ? MSG.offline(addr()) : MSG.unverified(addr()));
  }
  // بيتأكد إن الكود موجود ومش مقفول. ← true (اتأكد) / false (لسه: النت أو مشكلة عندنا) / بيوقّف الصفحة لو الكود مش موجود أو اتقفل
  function verify() {
    return X.sdk(4000).then(function () {
      var r = server();
      if (!r) { noteFor(X.fbError() || { code: "mzs/no-sdk" }); return false; }
      return X.withTimeout(r.get()).then(function (snap) {
      if (!snap.exists) { stop("notFound"); return false; }
      var d = snap.data() || {};
      if (d.revoked) { stop("revoked"); return false; }
      VERIFIED = true; META.name = d.name || META.name || "";
      clearNote("net"); clearNote("ours"); clearNote("nosdk");
      if (S) persist();
      return true;
      });
    }).catch(function (e) { noteFor(e); return false; });
  }
  // S.serverDone (على الموبايل بس، مش بيتبعت): النتيجة وصلت السيرفر. بعدها الحفظ بيبعت الحقول المسموحة بعد «خلص» بس.
  // من غير ده، «اعرض خريطتي» كانت بتبعت كل حاجة ومعاها screen، والقواعد بترفض الحفظ كله (permission-denied).
  function payload(extra) {
    var data = X.pickKeys(clone(S), S.serverDone ? X.AFTER_DONE_KEYS : X.VOLUNTEER_KEYS);
    if (S.status === "خلص") delete data.screen;   // ولو أول إرسال للنتيجة اتعاد (الرد ضاع في السكة)، برضه من غير screen
    if (S.status !== "خلص") { delete data.result; delete data.summary; delete data.engineVersion; delete data.configVersion; delete data.textsVersion; delete data.computedAt; }
    if (extra) Object.keys(extra).forEach(function (k) { data[k] = extra[k]; });
    data.updatedAt = X.ts();
    return data;
  }
  // send(): بيبعت data (اللي اتحسبت من S بعد آخر save). لو نجح، كل لحد updatedAtMs ده وصل.
  function send(data, reason) {
    var stamp = S.updatedAtMs;
    if (TRIAL) { sync.state = "trial"; paintSync(); return Promise.resolve(true); }
    sync.pending = true; paintSync();
    var go = VERIFIED ? Promise.resolve(true) : verify();
    return go.then(function (ok) {
      if (!ok) { sync.pending = false; sync.state = "err"; paintSync(); return false; }
      data.lastPush = reason || "";
      return X.withTimeout(server().set(data, { merge: true })).then(function () {
        sync.pending = false; sync.state = "ok";
        // لو اتغيرت حاجة وهو بيتبعت، ما بنعلّمهاش «وصلت»: هتتبعت مع المحطة الجاية (وهي على الموبايل أصلًا)
        if (data.status === "خلص" && data.result) S.serverDone = true;
        if (S.updatedAtMs === stamp) { S.pushedAtMs = stamp; }
        persist();
        paintSync();
        clearNote("net"); clearNote("ours"); clearNote("nosdk");
        return true;
      });
    }).catch(function (e) {
      console.warn("[mzs] push", e);
      sync.pending = false; sync.state = "err"; paintSync(); noteFor(e); return false;
    });
  }
  function push(reason) { save(); return send(payload(), reason); }
  function paintSync() {
    var d = $("#sync"); if (!d) return;
    if (sync.state === "trial") { d.className = "sync"; d.textContent = "تجربة: على الموبايل بس"; }
    else if (sync.pending && sync.state !== "err") { d.className = "sync"; d.textContent = "بيتحفظ…"; }
    else if (sync.state === "ok") { d.className = "sync ok"; d.textContent = "اتحفظ"; }
    else if (sync.state === "err") { d.className = "sync err"; d.textContent = "محفوظ على موبايلك"; }
    else { d.className = "sync"; d.textContent = ""; }
  }
  // إعادة الإرسال لوحدها: أول ما النت يرجع، وكل ٢٠ ثانية طول ما فيه حاجة ما وصلتش
  function retry() {
    if (!S || TRIAL || stopped || sync.pending) return;
    if (sync.state !== "err" && VERIFIED) return;
    X.resetSdkIfFailed();
    if (S.status === "خلص") return finish();
    return send(payload(), "retry");
  }
  window.addEventListener("online", retry);
  setInterval(retry, 20000);

  /* ───────── صيغة محطة الضغط (المحرك نفسه، بعد المحطة ٢) ───────── */
  function computeAdaptive() {
    var r = E.adaptiveRow(S, ITEMS, CONF), shown = {};
    stationOf(9).items.forEach(function (it) { if (it.adaptive) shown[it.id] = r.slots[it.adaptive - 1]; });
    return { row: r.row, main: r.main, suppressed: r.suppressed, general: r.general, reason: r.reason, shown: shown, engineVersion: E.ENGINE_VERSION };
  }
  function itemText(it) { return F(it.adaptive ? ((S.adaptive && S.adaptive.shown[it.id]) || "") : it.text); }

  /* ───────── الاكتمال ───────── */
  function itemDone(st, it, ans) {
    var a = ans[it.id];
    if (!a) return false;
    if (st.kind === "triad") return !!(a.none || (a.closest && a.farthest && a.closest !== a.farthest));
    if (st.kind === "vcycle") return typeof a.v === "number" || a.v === "early";
    return typeof a.v === "number";
  }
  function missingOf(st) {
    var ans = ensureSt(st.id).answers, miss = [];
    st.items.forEach(function (it) { if (!itemDone(st, it, ans)) miss.push(it.id); });
    if (st.bipolar) st.bipolar.items.forEach(function (it) { var a = ans[it.id]; if (!a || typeof a.v !== "number") miss.push(it.id); });
    if (st.now) { var w = ans[st.now.id]; if (!w || !w.v) miss.push(st.now.id); }
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
    var m = /^([st])(\d)$/.exec(S.screen), n = m ? +m[2] : 0;
    var pct = S.screen === "closing" ? 100 : m ? Math.round((n - (m[1] === "s" ? 1 : 0)) / 9 * 100) : 0;
    return '<div class="prog" aria-hidden="true"><i style="width:' + Math.max(0, pct) + '%"></i></div>';
  }
  function render() {
    if (S.screen === "report") return renderReport();
    var s = S.screen, h = "";
    if (s === "address") h = rAddress();
    else if (s === "welcome") h = rWelcome();
    else if (s === "about") h = rAbout();
    else if (s === "period") h = rPeriod();
    else if (s === "periodThanks") h = rText(F(ITEMS.client.start.period.thanks), "يلّا نبدأ");
    else if (/^s\d$/.test(s)) h = rStation(stationOf(+s.slice(1)));
    else if (/^t\d$/.test(s)) h = rText(F(stationOf(+s.slice(1)).transition), s === "t9" ? G("كمّل", "كمّلي") : "المحطة الجاية");
    else if (s === "closing") h = rClosing();
    main.innerHTML = progressHTML() + h;
    shownAt = now(); paintSync();
  }
  // أول شاشة: نكلمك إزاي؟ (من غير صيغة لسه، فالكلام فيها محايد)
  function rAddress() {
    var Q = ITEMS.client.start.form;
    var h = '<section class="card rise center addr"><h2>' + esc(Q.question) + "</h2>";
    h += "<p>الأسئلة والتقرير بيكلموك على طول، فأنهي صيغة تناسبك؟</p>";
    h += '<div class="addr-pick"><button type="button" class="next" data-act="addr" data-v="m">' + esc(Q.options[0].text) + "</button>";
    h += '<button type="button" class="next" data-act="addr" data-v="f">' + esc(Q.options[1].text) + "</button></div>";
    return h + '<p class="soft">الاختيار ده بيغيّر الكلام بس. الأسئلة والحساب واحد في الصيغتين، والصيغة ممكن تتغير بعدين.</p></section>';
  }
  function rWelcome() {
    var W = ITEMS.client.welcome, nm = X.first(META.name);
    var h = '<section class="card rise"><h1>' + esc(F(W.title)) + (nm ? " يا " + esc(nm) : "") + "</h1>";
    W.paragraphs.forEach(function (p) { h += "<p>" + esc(F(p)) + "</p>"; });
    h += '<button type="button" class="next" data-act="go">يلّا</button>';
    h += '<p class="soft addr-now">' + G("بنكلمك بصيغة المذكر.", "بنكلمك بصيغة المؤنث.") +
         ' <button type="button" class="linkish" data-act="addrSwitch">' + G("غيّرها لصيغة المؤنث", "غيّريها لصيغة المذكر") + "</button></p>";
    h += '<p class="soft">' + G("الرابط ده بتاعك إنت بس. احتفظ بيه، وارجع بيه في أي وقت تكمّل من مكانك.", "الرابط ده بتاعك إنتي بس. احتفظي بيه، وارجعي بيه في أي وقت تكمّلي من مكانك.") + "</p>";
    return h + "</section>";
  }
  // السن والدور والمدة: كل سؤال اختيار واحد
  var ABOUT = ["age", "role", "tenure"];
  function rAbout() {
    var Q = ITEMS.client.start, c = S.client || {};
    var h = '<section class="card rise"><h2>' + G("عرّفنا بيك شوية", "عرّفينا بيكي شوية") + "</h2>";
    h += '<p class="soft">' + G("تلات أسئلة قصيرة، علشان التقرير يتكلم من مكانك إنت.", "تلات أسئلة قصيرة، علشان التقرير يتكلم من مكانك إنتي.") + "</p>";
    ABOUT.forEach(function (k) {
      h += '<p class="q">' + esc(F(Q[k].question)) + '</p><div class="checks" role="radiogroup">';
      Q[k].options.forEach(function (o) {
        var on = c[k] === o.id;
        h += '<button type="button" class="check radio' + (on ? " sel" : "") + '" data-act="about" data-k="' + k + '" data-id="' + o.id + '" role="radio" aria-checked="' + on + '"><b aria-hidden="true">' + (on ? "✓" : "") + "</b>" + esc(F(o.text)) + "</button>";
      });
      h += "</div>";
    });
    var ok = ABOUT.every(function (k) { return c[k]; });
    return h + '<button type="button" class="next" data-act="aboutNext"' + (ok ? "" : ' aria-disabled="true"') + ">التالي</button></section>";
  }
  function periodQ() { return ITEMS.client.start.period; }
  function isNone(id) { return periodQ().options.some(function (o) { return o.id === id && o.none; }); }
  function rPeriod() {
    var P = periodQ(), sel = S.period.selected;
    var h = '<section class="card rise"><h2>قبل ما نبدأ</h2><p class="q">' + esc(F(P.question)) + '</p><div class="checks">';
    P.options.forEach(function (o) {
      var on = sel.indexOf(o.id) !== -1;
      h += '<button type="button" class="check' + (on ? " sel" : "") + '" data-act="period" data-id="' + o.id + '" aria-pressed="' + on + '"><b aria-hidden="true">' + (on ? "✓" : "") + "</b>" + esc(F(o.text)) + "</button>";
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
  // محطات المواقف (١ و٢ و٧): موقف واحد في الشاشة (قرار المراجعة: التداخل بين المواقف كان بيلخبط العين).
  // rec.cur = الموقف المفتوح. والرجوع بيفتح على أول موقف ما اتجاوبش.
  function curOf(st, rec) {
    if (typeof rec.cur === "number" && rec.cur >= 0 && rec.cur < st.items.length) return rec.cur;
    for (var i = 0; i < st.items.length; i++) if (!itemDone(st, st.items[i], rec.answers)) return i;
    return st.items.length - 1;
  }
  function stHead(st, full) {
    var h = '<header class="st-head rise"><div class="st-n">المحطة ' + ar(st.id) + " من ٩</div><h2>" + esc(F(st.title)) + "</h2>";
    if (full) st.intro.forEach(function (p) { h += "<p>" + esc(F(p)) + "</p>"; });
    return h;
  }
  function trialBtn(st) {
    return TRIAL ? '<button type="button" class="mini trialfill noprint" data-act="trialFill" data-st="' + st.id + '">تجربة بس: املأ اللي فاضل في المحطة دي عشوائي</button>' : "";
  }
  function rStation(st) {
    var rec = ensureSt(st.id);
    if (!rec.startedAt) { rec.startedAt = now(); save(); }
    if (st.id === 9 && !S.adaptive) { S.adaptive = computeAdaptive(); save(); }
    if (st.kind === "triad") return rTriadStation(st, rec);
    var h = stHead(st, true) + trialBtn(st) + "</header>";
    var n = st.items.length + (st.now ? 1 : 0);
    st.items.forEach(function (it, i) {
      h += st.kind === "vcycle" ? rCycle(st, it, i, rec.answers, n) : rFreq(st, it, i, rec.answers, n);
    });
    if (st.now) h += rNow(st, rec.answers);
    if (st.bipolar) {
      h += '<header class="st-head sub"><h3>' + esc(F(st.bipolar.title)) + "</h3><p>" + esc(F(st.bipolar.intro)) + "</p></header>";
      st.bipolar.items.forEach(function (it, i) { h += rBipolar(st, it, i, rec.answers, st.bipolar.items.length); });
    }
    var miss = missingOf(st);
    h += '<div class="foot"><div class="left" id="left">' + (miss.length ? "فاضل " + ar(miss.length) : "كده المحطة كملت") + "</div>";
    return h + '<button type="button" class="next" data-act="stNext" data-st="' + st.id + '"' + (miss.length ? ' aria-disabled="true"' : "") + ">" + (st.id === 9 ? "خلّصت" : "التالي") + "</button></div>";
  }
  function rTriadStation(st, rec) {
    // شرح المحطة في شاشة لوحده قبل أول موقف: من غيره الشرح الطويل كان بيزق الموقف الأول لتحت الشاشة.
    if (!rec.introSeen) {
      var hi = stHead(st, true) + '<p class="soft how">' + G("في كل موقف: اختار «الأقرب» ليك، وبعدين «الأبعد» عنك. والمواقف بتيجي واحد واحد.", "في كل موقف: اختاري «الأقرب» ليكي، وبعدين «الأبعد» عنك. والمواقف بتيجي واحد واحد.") + "</p>" + trialBtn(st) + "</header>";
      return hi + '<div class="intro-go"><button type="button" class="next" data-act="introGo" data-st="' + st.id + '">' + G("يلّا نبدأ", "يلّا نبدأ") + " (" + ar(st.items.length) + " موقف)</button></div>";
    }
    var cur = curOf(st, rec), it = st.items[cur], last = cur === st.items.length - 1;
    if (rec.cur !== cur) { rec.cur = cur; persist(); }   // بنثبّته: من غير ده، أول ما يجاوب، الشاشة كانت بتنط للموقف اللي بعده لوحدها
    var h = '<header class="st-head mini-head"><div class="st-n">المحطة ' + ar(st.id) + " من ٩ · " + esc(F(st.title)) + "</div>" + trialBtn(st) + "</header>";
    h += rTriad(st, it, cur, rec);
    var done = itemDone(st, it, rec.answers), all = !missingOf(st).length;
    h += '<div class="foot sit-foot">';
    h += cur > 0 ? '<button type="button" class="next ghost back" data-act="sitPrev" data-st="' + st.id + '">اللي قبله</button>' : "<span></span>";
    if (last) h += '<button type="button" class="next" data-act="stNext" data-st="' + st.id + '"' + (all ? "" : ' aria-disabled="true"') + ">" + (all ? "خلّصت المحطة" : "فاضل مواقف") + "</button>";
    else h += '<button type="button" class="next" data-act="sitNext" data-st="' + st.id + '"' + (done ? "" : ' aria-disabled="true"') + ">اللي بعده</button>";
    return h + "</div>";
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rTriad(st, it, i, rec) {
    if (!rec.order[it.id]) { rec.order[it.id] = shuffle(it.options.map(function (o) { return o.id; })); save(); }
    var a = rec.answers[it.id] || {}, byId = {};
    it.options.forEach(function (o) { byId[o.id] = o; });
    var h = '<article class="item sit' + (itemDone(st, it, rec.answers) ? " done" : "") + (a.none ? " none" : "") + '" id="it-' + it.id + '">';
    h += '<div class="count">موقف ' + ar(i + 1) + " من " + ar(st.items.length) + "</div>";
    h += '<p class="q">' + esc(F(it.text)) + '</p><div class="opts">';
    rec.order[it.id].forEach(function (oid) {
      var o = byId[oid], c = a.closest === oid, f = a.farthest === oid;
      h += '<div class="opt' + (c ? " is-c" : "") + (f ? " is-f" : "") + '">';
      if (c || f) h += '<span class="badge ' + (c ? "c" : "f") + '">' + (c ? "الأقرب" : "الأبعد") + "</span>";
      h += "<p>" + esc(F(o.text)) + '</p><div class="pick">';
      h += '<button type="button" class="pk c' + (c ? " on" : "") + '" data-act="close" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + c + '">الأقرب</button>';
      h += '<button type="button" class="pk f' + (f ? " on" : "") + '" data-act="far" data-st="' + st.id + '" data-id="' + it.id + '" data-o="' + oid + '" aria-pressed="' + f + '">الأبعد</button></div></div>';
    });
    h += "</div>";
    if (it.light) h += '<button type="button" class="skip' + (a.none ? " on" : "") + '" data-act="none" data-st="' + st.id + '" data-id="' + it.id + '">' + (a.none ? "✓ " : "") + esc(G("ما مريتش بده قريب", "ما مريتيش بده قريب")) + "</button>";
    return h + "</article>";
  }
  function scaleHTML(st, it, a) {
    var h = '<div class="scale">';
    FREQ.forEach(function (lab, v) {
      h += '<button type="button" class="sc' + (a.v === v ? " on" : "") + '" data-act="freq" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" aria-pressed="' + (a.v === v) + '">' + esc(lab) + "</button>";
    });
    return h + "</div>";
  }
  function count(i, n) { return '<div class="count">عبارة ' + ar(i + 1) + " من " + ar(n) + "</div>"; }
  function rFreq(st, it, i, ans, n) {
    var a = ans[it.id] || {};
    return '<article class="item' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '">' + count(i, n || st.items.length) + '<p class="q">' + esc(itemText(it)) + "</p>" + scaleHTML(st, it, a) + "</article>";
  }
  // دايرة التطوع: نفس سلم التكرار، ومعاه «لسه بدري عليّا أعرف» (برّه الحساب)
  function rCycle(st, it, i, ans, n) {
    var a = ans[it.id] || {}, early = a.v === "early";
    var h = '<article class="item' + (typeof a.v === "number" || early ? " done" : "") + (early ? " none" : "") + '" id="it-' + it.id + '">' + count(i, n || st.items.length) + '<p class="q">' + esc(F(it.text)) + "</p>";
    h += scaleHTML(st, it, a);
    return h + '<button type="button" class="skip' + (early ? " on" : "") + '" data-act="early" data-st="' + st.id + '" data-id="' + it.id + '">' + (early ? "✓ " : "") + esc(F(it.early || "لسه بدري عليّا أعرف")) + "</button></article>";
  }
  // «إنت فين دلوقتي؟»: اختيار واحد من ستة
  function rNow(st, ans) {
    var Q = st.now, a = ans[Q.id] || {};
    var h = '<article class="item now' + (a.v ? " done" : "") + '" id="it-' + Q.id + '"><div class="count">آخر سؤال</div><p class="q">' + esc(F(Q.text)) + '</p><div class="checks" role="radiogroup">';
    Q.options.forEach(function (o) {
      var on = a.v === o.id;
      h += '<button type="button" class="check radio' + (on ? " sel" : "") + '" data-act="now" data-st="' + st.id + '" data-id="' + Q.id + '" data-v="' + o.id + '" role="radio" aria-checked="' + on + '"><b aria-hidden="true">' + (on ? "✓" : "") + "</b>" + esc(F(o.text)) + "</button>";
    });
    return h + "</div></article>";
  }
  function rBipolar(st, it, i, ans, n) {
    var a = ans[it.id] || {}, sc = st.bipolar.scale;
    var h = '<article class="item' + (typeof a.v === "number" ? " done" : "") + '" id="it-' + it.id + '"><div class="count">سؤال ' + ar(i + 1) + " من " + ar(n || 3) + '</div><p class="q">' + esc(F(it.text)) + "</p>";
    h += '<div class="poles"><div class="pole"><b>أ</b>' + esc(F(it.a)) + '</div><div class="pole"><b>ب</b>' + esc(F(it.b)) + '</div></div><div class="dots" role="radiogroup">';
    for (var v = 1; v <= 5; v++) h += '<button type="button" class="dot' + (a.v === v ? " on" : "") + '" data-act="bip" data-st="' + st.id + '" data-id="' + it.id + '" data-v="' + v + '" role="radio" aria-checked="' + (a.v === v) + '" aria-label="' + esc(sc[v - 1]) + '"><i></i></button>';
    h += '</div><div class="dots-lab"><span>أقرب لـ«أ»</span><span>في النص</span><span>أقرب لـ«ب»</span></div>';
    return h + '<p class="dot-now">' + (typeof a.v === "number" ? esc(sc[a.v - 1]) : "&nbsp;") + "</p></article>";
  }
  function rClosing() {
    var h = '<section class="card rise center">';
    ITEMS.client.closing.forEach(function (p) { h += '<p class="big">' + esc(F(p)) + "</p>"; });
    return h + '<button type="button" class="next" data-act="report">اعرض خريطتي</button></section>';
  }

  /* ───────── تحديث جزئي (من غير ما الصفحة تتنط) ───────── */
  function refreshItem(st, id) {
    var el = document.getElementById("it-" + id);
    if (!el) return render();
    var rec = ensureSt(st.id), html = null;
    if (st.kind === "triad") { var y = window.scrollY; render(); window.scrollTo(0, y); return; }
    var n = st.items.length + (st.now ? 1 : 0);
    st.items.forEach(function (x, i) {
      if (x.id === id) html = st.kind === "vcycle" ? rCycle(st, x, i, rec.answers, n) : rFreq(st, x, i, rec.answers, n);
    });
    if (!html && st.now && st.now.id === id) html = rNow(st, rec.answers);
    if (!html && st.bipolar) st.bipolar.items.forEach(function (x, i) { if (x.id === id) html = rBipolar(st, x, i, rec.answers, st.bipolar.items.length); });
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
  // تجربة بس: يملأ اللي فاضل في المحطة عشوائي، علشان اللي بيجرّب يوصل للتقرير بسرعة
  function trialFill(st) {
    var rec = ensureSt(st.id);
    function rnd(n) { return Math.floor(Math.random() * n); }
    st.items.forEach(function (it) {
      if (itemDone(st, it, rec.answers)) return;
      if (st.kind === "triad") {
        if (!rec.order[it.id]) rec.order[it.id] = shuffle(it.options.map(function (o) { return o.id; }));
        var o = shuffle(it.options.map(function (x) { return x.id; }));
        rec.answers[it.id] = { closest: o[0], farthest: o[1], none: false, changes: 1, t: 0, trial: true };
      } else rec.answers[it.id] = { v: rnd(5), label: FREQ[0], changes: 1, t: 0, trial: true };
    });
    if (st.bipolar) st.bipolar.items.forEach(function (it) { if (!rec.answers[it.id]) rec.answers[it.id] = { v: 1 + rnd(5), changes: 1, t: 0, trial: true }; });
    if (st.now && !rec.answers[st.now.id]) rec.answers[st.now.id] = { v: st.now.options[rnd(6)].id, changes: 1, t: 0, trial: true };
    if (st.kind === "triad") { rec.cur = st.items.length - 1; rec.introSeen = rec.introSeen || now(); }
    save(); render();
  }

  /* ───────── النهاية: الحساب على الموبايل، والتقرير على طول، والإرسال ───────── */
  function compute() {
    var R = E.score(S, ITEMS, CONF);
    S.status = "خلص"; if (!S.finishedAt) S.finishedAt = now();
    S.result = clone(R); S.engineVersion = R.engineVersion; S.configVersion = R.configVersion; S.textsVersion = TEXTS.version;
    S.summary = summary(R); S.computedAt = now();
    save();
    return R;
  }
  function finish() { return send(payload(), "finish"); }
  // سطر مختصر لقايمة الأدمن (من غير ما يحتاج يقرا النتيجة كلها)
  function summary(R) {
    var V = R.volunteer || {};
    return { order: [R.final.main, R.final.supporting, R.final.suppressed || R.ranking.order[2]], confidence: R.ranking.confidence,
             suppressedStatus: R.suppressed.status, alerts: ["freeze", "depletion", "mood", "period"].filter(function (k) { return R.alerts[k].on; }),
             volunteer: V.outcomes || [], volunteerOrder: (V.volunteerRanking && V.volunteerRanking.order) || [], now: (V.now && V.now.id) || null,
             expected: !!V.expectedPicture };
  }

  /* ───────── التقرير ───────── */
  var RATE = null;
  function blocksHTML(B) {
    var h = "", inList = false;
    RATE = null;
    B.forEach(function (b) {
      if (b.t === "pending") return;
      if (b.t !== "li" && inList) { h += "</ul>"; inList = false; }
      if (b.t === "title") h += '<h1 class="rp-title">' + esc(b.text) + "</h1>";
      else if (b.t === "h2" || b.t === "h3" || b.t === "h4") h += "<" + b.t + ">" + esc(b.text) + "</" + b.t + ">";
      else if (b.t === "li") { if (!inList) { h += "<ul>"; inList = true; } h += "<li>" + esc(b.text) + "</li>"; }
      else if (b.t === "card") h += '<div class="dcard"><div class="dc-name">' + esc(b.name) + '</div><div class="dc-line">' + esc(b.line) + '</div><div class="dc-state">' + (b.label ? '<span class="dc-lbl">' + esc(b.label) + "</span>" : "") + esc(b.state) + "</div><p>" + esc(b.text) + "</p></div>";
      else if (b.t === "rate") RATE = b;
      else h += "<p>" + esc(b.text) + "</p>";
    });
    return h + (inList ? "</ul>" : "");
  }
  function rateHTML() {
    var r = S.rating || {}, Q = RATE || { text: "التقرير ده وصفك قد إيه؟", scale: [], note: G("لو حابب تقول أكتر (اختياري)", "لو حابة تقولي أكتر (اختياري)") };
    var h = '<section class="rate noprint" id="rate"><h3>' + esc(Q.text) + '</h3><div class="dots5" role="radiogroup" aria-label="' + esc(Q.text) + '">';
    for (var v = 1; v <= 5; v++) h += '<button type="button" data-act="rate" data-v="' + v + '" class="' + (r.value === v ? "on" : "") + '" role="radio" aria-checked="' + (r.value === v) + '" title="' + esc(Q.scale[v - 1] || "") + '">' + ar(v) + "</button>";
    h += '</div><p class="scale-now" id="scaleNow">' + esc(r.value ? (Q.scale[r.value - 1] || "") : (Q.scale.length ? "١ = " + Q.scale[0] + " · ٥ = " + Q.scale[4] : "")) + "</p>";
    h += '<label class="field"><span>' + esc(Q.note) + '</span><textarea id="rateNote" rows="3" maxlength="2000">' + esc(r.note || "") + "</textarea></label>";
    h += '<button type="button" class="next" data-act="rateSave" id="rateSave"' + (rateVal ? "" : ' aria-disabled="true"') + ">" + G("ابعت رأيك", "ابعتي رأيك") + "</button>";
    return h + '<p class="soft" id="rateMsg">' + (r.value ? G("وصلنا رأيك، شكرًا. تقدر تغيّره في أي وقت.", "وصلنا رأيك، شكرًا. تقدري تغيّريه في أي وقت.") : "") + "</p></section>";
  }
  var rateVal = null;
  function renderReport() {
    var R = S.result, A = E.normalize(S);
    var rep = RP.renderReport(R, A, ITEMS, TEXTS, { name: X.first(META.name), address: S.address || "m" });
    if (rep.meta.problems.length) console.warn("[mzs report]", rep.meta.problems);
    var body = blocksHTML(rep.blocks);
    if (rateVal == null) rateVal = (S.rating && S.rating.value) || null;
    var f = fem();
    var h = '<div class="addr-bar noprint">' + (f ? "التقرير مكتوب بصيغة المؤنث." : "التقرير مكتوب بصيغة المذكر.") +
            ' <button type="button" class="linkish" data-act="repAddr">' + (f ? "اقرا التقرير بصيغة المذكر" : "اقري التقرير بصيغة المؤنث") + "</button></div>";
    h += '<article class="card report rise">' + body + rateHTML() + "</article>";
    h += '<div class="tools noprint"><button type="button" class="next ghost" data-act="print">' + G("احفظه PDF أو اطبعه", "احفظيه PDF أو اطبعيه") + "</button>";
    if (TRIAL) h += '<button type="button" class="next ghost" data-act="trialReset">تجربة بس: ابدأ من الأول</button>';
    h += '</div><p class="soft center noprint keep">' + G("الرابط ده بيفتح تقريرك في أي وقت. احتفظ بيه.", "الرابط ده بيفتح تقريرك في أي وقت. احتفظي بيه.") + "</p>";
    main.innerHTML = h;
    paintSync();
  }
  function openReport() {
    S.screen = "report";
    if (!S.reportViewedAt) S.reportViewedAt = now();
    save(); render(); window.scrollTo(0, 0);
    if (!TRIAL && unsent()) finish();
  }

  /* ───────── الأحداث ───────── */
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    if (b.getAttribute("data-act") === "noteHide") { hidden[b.getAttribute("data-kind")] = true; paintNotes(); return; }
    if (!S) return;
    if (b.getAttribute("aria-disabled") === "true" && b.getAttribute("data-act") !== "stNext") return;
    var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    var st = b.hasAttribute("data-st") ? stationOf(+b.getAttribute("data-st")) : null;
    if (act === "go") return go(nextScreen());
    if (act === "addr" || act === "addrSwitch") {
      var v = act === "addr" ? b.getAttribute("data-v") : (S.address === "f" ? "m" : "f");
      S.address = v; S.addressAt = now(); S.client = S.client || {}; S.client.form = v === "f" ? "f2" : "f1"; save();
      refreshNotes();
      if (S.screen === "address") return go("welcome", "address");
      push("address"); return render();
    }
    if (act === "about") {
      S.client = S.client || {}; S.client[b.getAttribute("data-k")] = id; save();
      var y = window.scrollY; render(); window.scrollTo(0, y); return;
    }
    if (act === "aboutNext") return go(nextScreen(), "about");
    if (act === "period") {
      var sel = S.period.selected, i = sel.indexOf(id);
      if (i !== -1) sel.splice(i, 1);
      else if (isNone(id)) { S.period.selected = [id]; S.period.impact = null; }
      else { S.period.selected = sel.filter(function (x) { return !isNone(x); }); S.period.selected.push(id); }
      if (!S.period.selected.length || (S.period.selected.length === 1 && isNone(S.period.selected[0]))) S.period.impact = null;
      save(); var y2 = window.scrollY; render(); window.scrollTo(0, y2); return;
    }
    if (act === "impact") { S.period.impact = b.getAttribute("data-v"); save(); var y3 = window.scrollY; render(); window.scrollTo(0, y3); return; }
    if (act === "periodNext") { S.period.t = now() - shownAt; return go(nextScreen(), "period"); }
    if (act === "close" || act === "far") {
      var a = ensureSt(st.id).answers[id] || {}, o = b.getAttribute("data-o"), p = { none: false };
      if (act === "close") { p.closest = a.closest === o ? null : o; if (p.closest && a.farthest === o) p.farthest = null; }
      else { p.farthest = a.farthest === o ? null : o; if (p.farthest && a.closest === o) p.closest = null; }
      return setAns(st, id, p);
    }
    if (act === "none") { var cur = ensureSt(st.id).answers[id] || {}; return setAns(st, id, cur.none ? { none: false } : { none: true, closest: null, farthest: null }); }
    if (act === "freq") { var fv = +b.getAttribute("data-v"); return setAns(st, id, { v: fv, label: FREQ[fv] }); }
    if (act === "early") { var ce = ensureSt(st.id).answers[id] || {}; return setAns(st, id, ce.v === "early" ? { v: null, label: null } : { v: "early", label: "لسه بدري" }); }
    if (act === "now") return setAns(st, id, { v: b.getAttribute("data-v") });
    if (act === "bip") return setAns(st, id, { v: +b.getAttribute("data-v") });
    if (act === "trialFill" && TRIAL) return trialFill(st);
    if (act === "introGo") { ensureSt(st.id).introSeen = now(); save(); render(); window.scrollTo(0, 0); return; }
    if (act === "sitNext" || act === "sitPrev") {
      var rc = ensureSt(st.id), cu = curOf(st, rc);
      if (act === "sitNext" && !itemDone(st, st.items[cu], rc.answers)) return;
      rc.cur = Math.max(0, Math.min(st.items.length - 1, cu + (act === "sitNext" ? 1 : -1)));
      save(); render(); window.scrollTo(0, 0); return;
    }
    if (act === "stNext") {
      var miss = missingOf(st);
      if (miss.length && st.kind === "triad") {   // فيه موقف فات من غير إجابة: يفتح عليه
        var rm = ensureSt(st.id); rm.introSeen = rm.introSeen || now();
        st.items.forEach(function (x, i) { if (x.id === miss[0]) rm.cur = i; });
        save(); render(); window.scrollTo(0, 0); return;
      }
      if (miss.length) {
        var el = document.getElementById("it-" + miss[0]);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
        return;
      }
      ensureSt(st.id).endedAt = now();
      if (st.id === 2 && !S.adaptive) S.adaptive = computeAdaptive();
      if (st.id === 9) {
        try { compute(); } catch (err) { console.error(err); setNote("ours", MSG.ours(addr(), "engine")); return; }
        S.screen = nextScreen(); save(); render(); window.scrollTo(0, 0);
        return finish();
      }
      return go(nextScreen(), "station " + st.id);
    }
    if (act === "report") return openReport();
    if (act === "repAddr") {
      var yy = window.scrollY;
      S.address = S.address === "f" ? "m" : "f"; S.addressAt = now(); save(); refreshNotes(); render(); window.scrollTo(0, yy);
      if (!TRIAL) send({ address: S.address, addressAt: S.addressAt, updatedAtMs: S.updatedAtMs, updatedAt: X.ts() }, "address");
      return;
    }
    if (act === "rate") {
      rateVal = +b.getAttribute("data-v");
      each(document.querySelectorAll("#rate .dots5 button"), function (x) { var on = +x.getAttribute("data-v") === rateVal; x.className = on ? "on" : ""; x.setAttribute("aria-checked", on); });
      var rs = $("#rateSave"); if (rs) rs.removeAttribute("aria-disabled");
      if (RATE && RATE.scale[rateVal - 1]) $("#scaleNow").textContent = RATE.scale[rateVal - 1];
      return;
    }
    if (act === "rateSave") {
      if (!rateVal) return;
      var msg = $("#rateMsg"), note = (($("#rateNote") || {}).value || "").trim().slice(0, 2000);
      S.rating = { value: rateVal, note: note, at: now() }; save();
      if (TRIAL) { msg.textContent = "تجربة: الرأي اتحفظ على الموبايل بس."; return; }
      b.setAttribute("aria-disabled", "true");
      return send({ rating: S.rating, updatedAtMs: S.updatedAtMs, updatedAt: X.ts() }, "rating").then(function (ok) {
        b.removeAttribute("aria-disabled");
        msg.textContent = ok ? G("وصلنا رأيك، شكرًا. تقدر تغيّره في أي وقت.", "وصلنا رأيك، شكرًا. تقدري تغيّريه في أي وقت.")
                             : G("رأيك محفوظ على موبايلك، وهيتبعت لوحده أول ما النت يرجع.", "رأيك محفوظ على موبايلك، وهيتبعت لوحده أول ما النت يرجع.");
      });
    }
    if (act === "print") return window.print();
    if (act === "trialReset" && TRIAL) { X.store.del(LS()); location.reload(); }
  }

  /* ───────── شاشات الوقوف والكود ───────── */
  function stop(kind) {
    stopped = true;
    var m = MSG[kind](addr());
    main.innerHTML = '<section class="card rise"><h2>' + esc(m.title) + "</h2><p>" + esc(m.text) + "</p>" + codeForm() + "</section>";
    clearNote("net"); clearNote("ours");
    var d = $("#sync"); if (d) d.textContent = "";
  }
  function codeForm(val) {
    return '<form class="codeform" id="codeForm" autocomplete="off"><label class="field"><span>الكود</span>' +
      '<input id="codeIn" inputmode="latin" autocapitalize="characters" spellcheck="false" maxlength="14" dir="ltr" value="' + esc(val || "") + '" placeholder="مثلًا: ABCD2345"></label>' +
      '<button type="submit" class="next">افتح</button><p class="hint" id="codeMsg" hidden></p></form>';
  }
  function codeScreen(m, val) {
    main.innerHTML = '<section class="card rise"><h2>' + esc(m.title) + "</h2><p>" + esc(m.text) + "</p>" + codeForm(val) + "</section>";
  }
  function onSubmit(e) {
    if (!e.target || e.target.id !== "codeForm") return;
    e.preventDefault();
    var c = X.cleanCode(($("#codeIn") || {}).value), msg = $("#codeMsg");
    if (!X.validCode(c)) { msg.textContent = MSG.badCode(null).text; msg.hidden = false; return; }
    location.href = location.pathname + "?c=" + encodeURIComponent(c);
  }
  function fatal(m) {
    main.innerHTML = '<section class="card rise"><h2>' + esc(m.title) + "</h2><p>" + esc(m.text) + '</p><button type="button" class="next" onclick="location.reload()">جرّب تاني</button></section>';
  }

  /* ───────── البداية ───────── */
  function start(local, remote) {
    var localS = local && local.code === CODE && local.S && local.S.v === 1 ? local.S : null;
    if (local && local.meta && !META.name) META.name = local.meta.name || "";
    var remoteS = remote && remote.st ? X.pickKeys(remote, X.VOLUNTEER_KEYS) : null;
    if (remote && remote.status === "خلص" && remote.result) {
      S = X.pickKeys(remote, X.VOLUNTEER_KEYS);
      if (localS && localS.rating && (!S.rating || (localS.rating.at || 0) > (S.rating.at || 0))) S.rating = localS.rating;   // رأي ما اتبعتش لسه
      S.screen = "report"; S.pushedAtMs = S.updatedAtMs; S.serverDone = true;
    } else if (localS && localS.status === "خلص" && localS.result) {
      S = localS; S.screen = "report";       // خلّص على الموبايل ولسه ما وصلش ← التقرير على طول، والإرسال بيتعاد
    } else {
      var pick = remoteS;
      if (localS && (!pick || (localS.updatedAtMs || 0) >= (pick.updatedAtMs || 0))) pick = localS;
      if (pick) {
        S = clone(pick);
        ["result", "summary", "engineVersion", "configVersion", "textsVersion", "computedAt"].forEach(function (k) { delete S[k]; });
        S.status = "شغال";
        if (!S.st) S.st = {};
        if (!S.period) S.period = { selected: [], impact: null };
        if (!S.client) S.client = {};
        if (SCREENS.indexOf(S.screen) === -1) S.screen = S.address ? "welcome" : "address";
        if (S.screen === "address" && S.address) S.screen = "welcome";
        if (remoteS && pick === remoteS) { sync.state = "ok"; S.pushedAtMs = S.updatedAtMs; }
      } else S = fresh();
    }
    persist(); render();
    if (!X.store.persistent) setNote("storage", MSG.storage(addr()));
    if (TRIAL) { setNote("trial", MSG.trial(addr())); sync.state = "trial"; paintSync(); }
    else if (S.screen === "report" && unsent()) finish();
    else if (localS && pick === localS && unsent() && S.screen !== "address") send(payload(), "resume");
  }
  function boot() {
    if (booted) return; booted = true;
    main = $("#main");
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    if (!X.store.persistent) setNote("storage", MSG.storage(null));
    var raw = X.codeFromUrl();
    if (!raw) return codeScreen(MSG.noCode());
    if (!X.validCode(raw)) return codeScreen(MSG.badCode(null), raw);
    CODE = raw; TRIAL = X.isTrial(CODE);
    if (!E || !CONF || !RP) return fatal(MSG.file(null, !E ? "engine.js" : !CONF ? "config.js" : "render.js"));
    Promise.all([X.loadJSON("../engine/items.json"), X.loadJSON("../report/texts.json")]).then(function (r) {
      ITEMS = r[0]; TEXTS = r[1];
      var ints = E.verifyIntegrity(ITEMS);
      if (!ints.ok) throw { code: "mzs/items", detail: ints.errors.join(" · ") };
      buildStations();
      var local = X.store.get(LS());
      if (local && local.verified) VERIFIED = true;
      if (TRIAL) return start(local, null);
      return X.sdk(8000).then(function () {
      var r0 = server();
      if (!r0) { start(local, null); noteFor(X.fbError() || { code: "mzs/no-sdk" }); sync.state = "err"; paintSync(); return; }
      return X.withTimeout(r0.get()).then(function (snap) {
        if (!snap.exists) { S = local && local.S ? local.S : null; return stop("notFound"); }
        var d = snap.data() || {};
        if (d.revoked) { S = local && local.S ? local.S : null; return stop("revoked"); }
        VERIFIED = true; META.name = d.name || "";
        start(local, d);
      }, function (e) {
        // السيرفر مش واصل أو رافض: المتطوع يكمّل من غير ما يستنى، والسبب مكتوب فوق
        console.warn("[mzs] get", e);
        start(local, null);
        noteFor(e);
        sync.state = "err"; paintSync();
      });
      });
    }).catch(function (e) {
      console.error(e);
      if (e && e.code === "mzs/file") return fatal(MSG.file(null, e.file.replace(/^\.\.\//, "")));
      if (e && e.code === "mzs/items") return fatal({ title: "ملف الأسئلة فيه مشكلة", text: "المشكلة عندنا مش عندك، ومحتاجة تتصلح قبل ما المقياس يكمّل. (" + e.detail + ")" });
      fatal({ title: "الصفحة ما اتحمّلتش", text: "حصلت مشكلة غير متوقعة. إجاباتك اللي فاتت محفوظة على موبايلك. (" + ((e && e.message) || e) + ")" });
    });
  }

  window.MZS_APP = { state: function () { return S; }, verified: function () { return VERIFIED; }, notes: function () { return notes; } };   // للاختبار بس
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
