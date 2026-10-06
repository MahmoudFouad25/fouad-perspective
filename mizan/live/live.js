/* =====================================================================
   live.js — شاشة المشارك
   ---------------------------------------------------------------------
   ثلاث قواعد ما تتكسرش:
   ١. الصفحة عمرها ما تستنى حد. لو الجلسة لسه ما بدأتش، بتعرض الترحيب.
      ولو الاتصال وقع، بتفتح وضع «امشي مع الشاشة» برقم الشاشة اللي على البروجكتور.
   ٢. كل الإجابات الشخصية (السلايدرز، الدفتر، الخريطة، الالتزامات، ميزاني)
      بتتحفظ على الموبايل ده بس.
      اللي بيتبعت: اسمك الأول، وإجابات التصويت المجهولة اللي بتظهر أعداد على الشاشة.
   ٣. كل خطأ له رسالة باسمه.
   ===================================================================== */
(function () {
  "use strict";
  var SID = MZ.sid();
  /* ?as=اسم: بيخلي أكتر من «موبايل» يشتغلوا في نفس المتصفح (للبروفة بس) */
  var KEY = "mz:" + SID + ":me" + (MZ.qs("as") ? ":" + MZ.qs("as") : "");
  var me = MZ.store.getJ(KEY, {});            // كل حاجة تخص المشارك على الجهاز ده
  function save() { MZ.store.setJ(KEY, me); }

  var $main = document.getElementById("main"), $bar = document.getElementById("bar"),
      $dot = document.getElementById("dot"), $ses = document.getElementById("ses"),
      $help = document.getElementById("helpBtn"), $sheet = document.getElementById("sheet"),
      $sheetIn = document.getElementById("sheetIn"), $toast = document.getElementById("toast");

  var esc = MZ.esc, ar = MZ.ar;
  var uid = null, session = null, sessionKnown = false, serverOk = false, lastErr = null;
  var mode = "auto";            // auto | manual
  var manualIdx = 0, manualSinceRev = 0;
  var bootAt = Date.now(), lastGoodAt = 0;
  var lastViewKey = "";

  /* ───────────── أدوات ───────────── */
  function toast(t) { $toast.textContent = t; $toast.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { $toast.classList.remove("on"); }, 2200); }
  function axName(a) { return MZ_AX[a] ? MZ_AX[a].q : ""; }
  function axChip(a, txt) { return '<span class="chip ax-' + a + '"><i></i>' + esc(txt || MZ_AX[a].q) + "</span>"; }
  function seedShuffle(arr, seed) {          // ترتيب ثابت لكل شخص ولكل سؤال
    var a = arr.slice(), h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    for (var j = a.length - 1; j > 0; j--) { h = (h * 1103515245 + 12345) >>> 0; var k = h % (j + 1); var t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  function firstName() { return (me.name || "").split(" ")[0]; }

  /* إرسال تصويت مجهول (بيتعرض كأعداد بس). لو مفيش اتصال، بيتحفظ ويتبعت بعدين. */
  function sendVote(key, val) {
    me.pending = me.pending || {}; me.pending[key] = val; save();
    flushVotes();
  }
  function flushVotes() {
    if (!uid || !MZ.db || !me.pending || !Object.keys(me.pending).length) return;
    var data = me.pending;
    MZ.vRef(SID, uid).set(data, { merge: true }).then(function () {
      Object.keys(data).forEach(function (k) { if (me.pending && me.pending[k] === data[k]) delete me.pending[k]; });
      save();
    }).catch(function (e) { lastErr = e; status(); });
  }

  /* ───────────── الحالة الحالية ───────────── */
  function current() {
    if (mode === "manual") return { st: MZ_STATES[manualIdx], step: 999, manual: true };
    if (session && session.state) {
      var st = mzState(session.state);
      return { st: st, step: session.step || 0 };
    }
    return { st: MZ_STATES[0], step: 0, notStarted: true };
  }

  /* ───────────── شريط الحالة ───────────── */
  function status() {
    var live = serverOk && sessionKnown;
    $dot.className = "dot " + (mode === "manual" ? "manual" : live ? "live" : "off");
    $dot.title = mode === "manual" ? "ماشي مع الشاشة يدوي" : live ? "متصل" : "مش متصل";
    var html = "", cls = "";
    var stale = !live && Date.now() - bootAt > MZ_SETTINGS.offlineAfterSec * 1000 && Date.now() - lastGoodAt > MZ_SETTINGS.offlineAfterSec * 1000;
    if (mode === "manual") {
      cls = "warn";
      html = "إنت ماشي مع الشاشة بنفسك. اكتب الرقم اللي في ركن الشاشة الكبيرة:" +
        '<div class="row"><button data-m="prev">اللي قبلها</button>' +
        '<input id="mnum" inputmode="numeric" style="width:80px;border:1px solid #e0c48f;border-radius:10px;padding:5px 8px;text-align:center" value="' + ar(manualIdx + 1) + '">' +
        '<button data-m="go">روح</button><button data-m="next">اللي بعدها</button></div>' +
        '<div class="row"><button data-m="auto">رجّعني للمزامنة</button></div>';
    } else if (stale && me.name) {
      cls = lastErr && lastErr.code === "permission-denied" ? "err" : "warn";
      html = (lastErr ? esc(MZ.errText(lastErr)) : "مش واصلين للمرشد دلوقتي.") +
        '<br>لو الشاشة الكبيرة اتغيرت ومفيش حاجة اتغيرت هنا:' +
        '<div class="row"><button data-m="manual">امشي مع الشاشة بنفسي</button><button data-m="retry">جرّب تاني</button></div>';
    }
    $bar.className = "bar " + (html ? "on " + cls : "");
    $bar.innerHTML = html;
  }
  $bar.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var m = b.getAttribute("data-m");
    if (m === "manual") { mode = "manual"; manualIdx = Math.max(0, session && session.state ? mzIndex(session.state) : (me.lastIdx || 0)); manualSinceRev = (session && session.rev) || 0; }
    if (m === "auto") { mode = "auto"; }
    if (m === "retry") { MZ.reconnect(); toast("بنحاول…"); start(); }
    if (m === "prev") manualIdx = Math.max(0, manualIdx - 1);
    if (m === "next") manualIdx = Math.min(MZ_STATES.length - 1, manualIdx + 1);
    if (m === "go") { var v = parseInt(MZ.en(document.getElementById("mnum").value), 10); if (v >= 1 && v <= MZ_STATES.length) manualIdx = v - 1; }
    status(); render(true);
  });
  setInterval(status, 4000);

  /* ───────────── «محتاج حد يكلمني» ───────────── */
  function supportName() { return (session && session.support) || MZ_SETTINGS.supportName; }
  $help.onclick = function () {
    if (me.helpAt) {
      openSheet('<div class="big">طلبك وصل 🤍</div><p class="sub">' + esc(supportName()) + ' جاي لك. خليك مكانك.</p>' +
        '<button class="btn ghost" data-h="cancel">خلاص، أنا كويس دلوقتي</button><button class="btn ghost" data-h="close">رجوع</button>');
      return;
    }
    openSheet('<div class="big">محتاج حد يكلمك؟</div>' +
      '<p class="sub">هنبعت لـ' + esc(supportName()) + ' إنك محتاج تتكلم معاه لوحدك. هييجي لك بهدوء، ومحدش تاني في القاعة هيعرف.</p>' +
      '<button class="btn" data-h="send">أيوه، ابعت</button><button class="btn ghost" data-h="close">لأ، رجوع</button>' +
      '<p class="muted" style="margin-top:14px">لو حاسس إنك في خطر دلوقتي: خط الدعم النفسي ' + esc(MZ_SETTINGS.hotline) + ' · الإسعاف ' + esc(MZ_SETTINGS.emergency) + "</p>");
  };
  function openSheet(h) { $sheetIn.innerHTML = h; $sheet.classList.add("on"); }
  function closeSheet() { $sheet.classList.remove("on"); }
  $sheet.addEventListener("click", function (e) {
    if (e.target === $sheet) return closeSheet();
    var b = e.target.closest("button"); if (!b) return;
    var h = b.getAttribute("data-h");
    if (h === "close") closeSheet();
    if (h === "send") {
      me.helpAt = Date.now(); save(); syncHelp(true);
      $help.classList.add("on");
      openSheet('<div class="big">تمام 🤍</div><p class="sub">' + esc(supportName()) + ' جاي لك. خليك مكانك.</p>' +
        (uid && MZ.db ? "" : '<p class="sub" style="color:var(--danger)">الموبايل مش متصل دلوقتي، فالطلب ممكن ما يوصلش. ارفع إيدك أو روح لـ' + esc(supportName()) + " مباشرة.</p>") +
        '<button class="btn ghost" data-h="close">رجوع</button>');
    }
    if (h === "cancel") { me.helpAt = null; save(); syncHelp(false); $help.classList.remove("on"); closeSheet(); }
  });
  function syncHelp(on) {
    if (!uid || !MZ.db) return;
    MZ.pRef(SID, uid).set({ help: on ? (me.helpAt || Date.now()) : null }, { merge: true }).catch(function (e) { lastErr = e; status(); });
  }

  /* ───────────── الدخول (الاسم مرة واحدة) ───────────── */
  function renderJoin() {
    $help.hidden = true;
    var ten = me.ten || "", g = me.g || "";
    $main.innerHTML =
      '<div class="eyebrow">صناع الحياة · منظور الفؤاد</div>' +
      '<div class="big">أهلًا بيك في «الميزان» 🌿</div>' +
      '<p class="sub">اكتب اسمك الأول بس. ومحدش هيشوف إجاباتك الشخصية غيرك.</p>' +
      '<label class="field"><span>اسمك</span><input id="jn" autocomplete="given-name" maxlength="30" value="' + esc(me.name || "") + '"></label>' +
      '<div class="field"><span>بقالك قد إيه في صناع الحياة؟</span><div class="seg" id="jten">' +
        '<button data-v="new" class="' + (ten === "new" ? "on" : "") + '">أقل من ٣ شهور</button>' +
        '<button data-v="old" class="' + (ten === "old" ? "on" : "") + '">أكتر من كده</button></div></div>' +
      (MZ_SETTINGS.separateGender ? '<div class="field"><span>أنا</span><div class="seg" id="jg">' +
        '<button data-v="m" class="' + (g === "m" ? "on" : "") + '">ولد</button><button data-v="f" class="' + (g === "f" ? "on" : "") + '">بنت</button></div></div>' : "") +
      '<button class="btn" id="jgo">يلا</button><div class="saved" id="jerr" style="color:var(--danger)"></div>';
    function seg(id, key) {
      var el = document.getElementById(id); if (!el) return;
      el.onclick = function (e) { var b = e.target.closest("button"); if (!b) return;
        [].forEach.call(el.children, function (c) { c.classList.toggle("on", c === b); }); if (key === "ten") ten = b.dataset.v; else g = b.dataset.v; };
    }
    seg("jten", "ten"); seg("jg", "g");
    document.getElementById("jgo").onclick = function () {
      var n = document.getElementById("jn").value.trim().replace(/\s+/g, " ");
      var err = document.getElementById("jerr");
      if (n.length < 2) { err.textContent = "اكتب اسمك الأول 🙂"; return; }
      if (!ten) { err.textContent = "اختار: بقالك قد إيه في صناع الحياة؟"; return; }
      if (MZ_SETTINGS.separateGender && !g) { err.textContent = "اختار ولد أو بنت."; return; }
      me.name = n; me.ten = ten; me.g = g; me.joinedAt = me.joinedAt || Date.now(); save();
      register(); render(true);
    };
  }

  function register() {
    if (!uid || !MZ.db || !me.name) return;
    var d = { n: me.name, ten: me.ten || "", g: me.g || "", seen: MZ.TS() };
    if (!me.registered) d.at = MZ.TS();
    MZ.pRef(SID, uid).set(d, { merge: true }).then(function () { me.registered = true; save(); flushVotes(); })
      .catch(function (e) { lastErr = e; status(); });
  }
  setInterval(function () {
    if (uid && MZ.db && me.name && document.visibilityState === "visible")
      MZ.pRef(SID, uid).set({ seen: MZ.TS() }, { merge: true }).catch(function () {});
  }, Math.max(1, MZ_SETTINGS.heartbeatMin) * 60000);

  /* ───────────── الرسم ───────────── */
  function render(force) {
    if (!me.name) return renderJoin();
    $help.hidden = false; $help.classList.toggle("on", !!me.helpAt);
    var c = current(), st = c.st;
    var stepsInfo = mzSteps(st);
    var at = st.phoneAt === undefined ? 0 : Math.min(st.phoneAt, stepsInfo.steps.length - 1);
    var showPhone = c.manual || c.step >= at;
    var ph = showPhone ? (st.phone || { t: "listen" }) : { t: "listen" };
    $ses.textContent = (MZ_SESSIONS[st.ses] || "الميزان") + (c.manual ? " · شاشة " + ar(mzIndex(st.id) + 1) : "");
    if (!c.manual && !c.notStarted) me.lastIdx = mzIndex(st.id);
    /* ما نعيدش الرسم لو مفيش تغيير حقيقي — عشان اللي بيكتبه ما يضيعش */
    var dyn = (ph.t === "circle" || ph.t === "rafiq" || ph.t === "break") ? JSON.stringify([session && session.groups && session.groups[uid], session && session.pairs && session.pairs[uid], session && session.roster && Object.keys(session.roster).length, session && session.breakMsg]) : "";
    var key = st.id + "|" + ph.t + "|" + (ph.key || "") + "|" + dyn + "|" + (c.notStarted ? "ns" : "");
    if (!force && key === lastViewKey) return;
    lastViewKey = key;
    if (st.id !== render._lastSt) { MZ.vibrate(); render._lastSt = st.id; window.scrollTo(0, 0); }
    var V = VIEWS[ph.t] || VIEWS.listen;
    $main.style.animation = "none"; void $main.offsetWidth; $main.style.animation = "";
    $main.innerHTML = "";
    $main.onclick = null; $main.oninput = null;     // ما نسيبش handlers من شاشة قديمة
    V(ph, st, c);
  }

  function html(h) { $main.innerHTML = h; }

  /* ───────────── الشاشات ───────────── */
  var VIEWS = {};

  VIEWS.listen = function (ph, st, c) {
    var line = ph.line || "بص على الشاشة الكبيرة… واسمع 🙂";
    var sub = ph.sub || "";
    if (c && c.notStarted) { line = "أهلًا يا " + firstName() + " 🌿"; sub = "اليوم لسه ما بدأش. أول ما يبدأ، الشاشة دي هتتغير لوحدها."; }
    html('<div class="listen"><div class="glyph"></div><div class="big">' + esc(line) + '</div>' + (sub ? '<div class="sub">' + esc(sub) + "</div>" : "") + "</div>");
  };

  VIEWS.break = function (ph) {
    var msg = (session && session.breakMsg) || "";
    html('<div class="listen"><div class="big">استراحة 🌿</div>' + (msg ? '<div class="sub">' + esc(msg) + "</div>" : "") +
      (ph.sub ? '<div class="sub">' + esc(ph.sub) + "</div>" : "") + "</div>");
  };

  VIEWS.agree = function () {
    html('<div class="eyebrow">اتفاقنا</div>' +
      ['محدش مطلوب منه يحكي حاجة مش عايز يحكيها. «أنا هعدّي» إجابة كاملة.',
       'اللي يتقال في الحلقة… يفضل في الحلقة.',
       'الموبايل النهارده للاختيار مش للتصوير. ومحدش غيرك هيشوف إجاباتك. الشاشة الكبيرة بتعرض أرقام بس.',
       'فوق في الصفحة زرار «محتاج حد يكلمني». دوس عليه في أي لحظة. ده مش ضعف… ده ذكاء.']
      .map(function (t, i) { return '<div class="card"><b>' + ar(i + 1) + ".</b> " + esc(t) + "</div>"; }).join("") +
      '<p class="muted">الزرار الأحمر فوق ده… هيفضل موجود طول اليوم.</p>');
  };

  VIEWS.vote = function (ph) {
    var q = ph.q, opts = ph.opts, letters = false;
    if (ph.from === "sit") { var s = MZ_SIT[ph.key]; q = s.q; opts = s.opts; letters = true; }
    var cur = me[ph.key];
    html((ph.from === "sit" ? '<div class="eyebrow">موقف · أول حاجة بتاخد بالك منها فعلًا</div>' : "") +
      '<div class="big">' + esc(q) + "</div>" +
      '<div id="opts">' + opts.map(function (o, i) {
        return '<button class="opt' + (cur === o.v ? " on" : "") + '" data-v="' + esc(o.v) + '"><span class="k">' + (letters ? "أبج"[i] : ar(i + 1)) + "</span><span>" + esc(o.l) + "</span></button>";
      }).join("") + '</div><div class="saved" id="sv">' + (cur ? "اتسجل ✓ (تقدر تغيّر)" : "") + "</div>" +
      '<p class="muted">الشاشة الكبيرة بتعرض أعداد بس… من غير أسماء.</p>');
    document.getElementById("opts").onclick = function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      me[ph.key] = b.dataset.v; save(); sendVote(ph.key, b.dataset.v);
      [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); });
      document.getElementById("sv").textContent = "اتسجل ✓ (تقدر تغيّر)";
    };
  };

  VIEWS.sitresult = function () {
    var cnt = { H: 0, V: 0, B: 0 }, n = 0;
    ["sit1", "sit2", "sit3"].forEach(function (k) { if (cnt.hasOwnProperty(me[k])) { cnt[me[k]]++; n++; } });
    var colors = { H: "أخضر", V: "أحمر", B: "أزرق" };
    var h = '<div class="eyebrow">ليك إنت بس</div><div class="big">اختياراتك في التلات مواقف</div>';
    if (!n) h += '<p class="sub">ما اخترتش في المواقف. عادي… اليوم كله هيوضّح.</p>';
    else h += '<div class="card">' + ["H", "V", "B"].filter(function (a) { return cnt[a]; }).map(function (a) {
      return '<div style="margin:6px 0">' + axChip(a, ar(cnt[a]) + " " + colors[a]) + " <span class='muted'>" + esc(MZ_AX[a].q) + "</span></div>";
    }).join("") + "</div>";
    h += '<div class="card">تلات مواقف مش كفاية نحكم بيهم على حد. دي أول نظرة بس… واليوم كله هيوضّح أكتر.</div>';
    html(h);
  };

  VIEWS.chars = function () {
    html('<div class="eyebrow">تلات أصحاب هيمشوا معانا طول اليوم</div>' + ["H", "V", "B"].map(function (a) {
      var A = MZ_AX[a];
      return '<div class="card ax ax-' + a + '"><b style="color:var(--ax)">' + esc(A.who) + "</b> · " + esc(A.q) +
        '<div class="muted">' + esc(A.name) + "</div></div>";
    }).join(""));
  };

  VIEWS.axtable = function () {
    html('<div class="eyebrow">التلات محاور</div><table class="t"><tr><th></th><th>سؤاله</th><th>أبعاده</th></tr>' +
      ["H", "V", "B"].map(function (a) { var A = MZ_AX[a];
        return '<tr class="ax-' + a + '"><td><b style="color:var(--ax)">' + esc(A.short) + "</b></td><td>" + esc(A.q) + "</td><td>" + esc(A.dims.join(" · ")) + "</td></tr>"; }).join("") +
      "</table>");
  };

  VIEWS.axtitle = function (ph) {
    var A = MZ_AX[ph.ax];
    html('<div class="listen ax-' + ph.ax + '"><div class="eyebrow">' + esc(A.name) + '</div><div class="big" style="font-size:2.3rem;color:var(--ax)">' + esc(A.q) + "</div></div>");
  };

  function circleInfo() {
    var g = session && session.groups, r = (session && session.roster) || {};
    if (!g || !uid || !g[uid]) return null;
    var no = g[uid];
    var mates = Object.keys(g).filter(function (u) { return g[u] === no; }).map(function (u) { return { u: u, n: r[u] || "…" }; });
    return { no: no, mates: mates };
  }
  VIEWS.circle = function (ph) {
    var ci = circleInfo(), h = "";
    if (ci) {
      h += '<div class="card" style="text-align:center"><div class="muted">حلقتك</div><div class="circle-no">' + ar(ci.no) + '</div>' +
        '<div class="members">' + ci.mates.map(function (m) { return '<span class="' + (m.u === uid ? "me" : "") + '">' + esc(m.n) + "</span>"; }).join("") + "</div></div>";
    } else {
      h += '<div class="card"><b>حلقتك لسه ما ظهرتش هنا.</b><div class="muted">بص على الشاشة الكبيرة، أو اسأل المساعد… واقعد مع الحلقة اللي يقولك عليها.</div></div>';
    }
    if (ph.card) h += '<div class="card">' + ph.card.map(function (q, i) { return "<p style='margin:6px 0'><b>" + ar(i + 1) + ".</b> " + esc(q) + "</p>"; }).join("") + "</div>";
    if (ph.rule) h += '<p class="muted">' + esc(ph.rule) + "</p>";
    else if (ph.card) h += '<p class="muted">ومش عايز تجاوب؟ «أنا هعدّي». ودي إجابة كاملة.</p>';
    html(h);
  };

  VIEWS.qasiya = function () {
    html('<div class="eyebrow">قاعدة آخر كل جلسة</div><div class="big">القاصية</div>' +
      '<div class="card"><p>مين ما اتكلمش؟</p><p>مين غاب؟</p><p>مين محتاج نسأل عليه؟</p></div><p class="sub">بص على حلقتك… وابتسم للي كان ساكت 🙂</p>');
  };

  /* السلايدر: ٥ مواضع، والتلات صور بلسان حالها من نفس الشاشة */
  VIEWS.slider = function (ph, st) {
    var D = MZ_DIMS[ph.key], A = MZ_AX[D.ax];
    var pics = {}; (st.items || []).forEach(function (it) { if (it.k === "pic") pics[it.side] = it; });
    var cur = me[ph.key];
    var labels = ["ناقصة", "", "سليمة", "", "زيادة"];
    html('<div class="ax-' + D.ax + '"><div class="eyebrow">' + esc(A.q) + " · " + esc(D.n) + '</div><div class="big">' + esc(D.q) + "</div>" +
      (pics.minus ? '<div class="tongue"><b>ناقصة:</b> «' + esc(pics.minus.tongue) + "»</div>" : "") +
      (pics.ok ? '<div class="tongue"><b>سليمة:</b> «' + esc(pics.ok.tongue) + "»</div>" : "") +
      (pics.plus ? '<div class="tongue"><b>زيادة:</b> «' + esc(pics.plus.tongue) + "»</div>" : "") +
      '<div class="scale" id="sc">' + [-2, -1, 0, 1, 2].map(function (v, i) {
        return '<button data-v="' + v + '" class="' + (cur === v ? "on" : "") + '">' + (labels[i] || "·") + "</button>"; }).join("") + "</div>" +
      '<div class="saved" id="sv">' + (cur !== undefined && cur !== null ? "اتحفظ على موبايلك ✓" : "") + "</div>" +
      '<p class="muted">حط نفسك فين بصدق. محدش هيشوف ده غيرك. واللي في النص مش أحسن منك… هو بس في مكان تاني.</p></div>');
    document.getElementById("sc").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      me[ph.key] = +b.dataset.v; save();
      [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); });
      document.getElementById("sv").textContent = "اتحفظ على موبايلك ✓";
    };
  };

  function cycleHtml(ax, key) {
    var C = MZ_CYCLES[ax], cur = me[key];
    return '<div class="cyc ax-' + ax + '" id="cy">' + C.st.map(function (s, i) {
      return '<button class="opt ax' + (String(cur) === String(i + 1) ? " on" : "") + '" data-v="' + (i + 1) + '"><span class="k">' + ar(i + 1) +
        '</span><span class="t"><b>' + esc(s) + "</b><small>" + esc(C.d[i]) + "</small></span></button>";
    }).join("") + '<button class="opt' + (cur === "no" ? " on" : "") + '" data-v="no"><span class="k">–</span><span class="t"><b>مش شبهي</b></span></button></div>';
  }
  function bindCycle(key, onDone) {
    document.getElementById("cy").onclick = function (e) {
      var b = e.target.closest(".opt"); if (!b) return;
      var v = b.dataset.v; me[key] = v === "no" ? "no" : +v; save(); sendVote(key, me[key]);
      [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); });
      if (onDone) onDone();
    };
  }
  VIEWS.cycle = function (ph) {
    var C = MZ_CYCLES[ph.ax];
    html('<div class="eyebrow">' + esc(C.name) + '</div><div class="big">إنت فين فيها دلوقتي؟</div>' +
      '<p class="sub">في التطوع… أو في أي حاجة تانية في حياتك.</p>' + cycleHtml(ph.ax, ph.key) +
      '<div class="saved" id="sv"></div><p class="muted">الشاشة الكبيرة بتعرض عدد الناس في كل مرحلة بس، من غير أسماء… عشان تشوف إنك مش لوحدك.</p>');
    bindCycle(ph.key, function () { document.getElementById("sv").textContent = "اتسجل ✓"; });
  };

  function noteField(key, short, ph) {
    var v = (me.notes && me.notes[key]) || "";
    return '<label class="field"><span>' + esc(ph || "") + "</span>" +
      (short ? '<input data-note="' + key + '" value="' + esc(v) + '">' : '<textarea data-note="' + key + '">' + esc(v) + "</textarea>") + "</label>";
  }
  function bindNotes() {
    [].forEach.call($main.querySelectorAll("[data-note]"), function (el) {
      el.addEventListener("input", function () {
        me.notes = me.notes || {}; me.notes[el.dataset.note] = el.value; save();
        var s = document.getElementById("sv"); if (s) s.textContent = "اتحفظ على موبايلك ✓";
      });
    });
  }
  VIEWS.note = function (ph) {
    html('<div class="eyebrow">دفتري · ليك إنت بس</div><div class="big">' + esc(ph.prompt) + "</div>" +
      noteField(ph.key, ph.short, "") + '<div class="saved" id="sv"></div>' + (ph.hint ? '<p class="muted">' + esc(ph.hint) + "</p>" : ""));
    bindNotes();
  };

  VIEWS.map = function () {
    var qsArr = ["إيه اللي بيشعلني عادة؟", "اشتعالي شكله إيه؟", "إمتى بيبدأ التعب؟", "إيه اللي بيطلّع الخيبة؟", "رمادي شكله إيه؟", "بيفضل قد إيه؟", "إيه اللي بيرجّعني أدوّر تاني؟"];
    html('<div class="eyebrow">خريطتي · ليك إنت بس</div><div class="big">ارسم دايرتك</div><p class="muted">كلمة أو اتنين في كل سؤال. مش لازم جمل.</p>' +
      qsArr.map(function (q, i) { return noteField("map" + (i + 1), true, ar(i + 1) + ". " + q); }).join("") +
      '<div class="card"><b>وأخيرًا: أنا فين في الدايرة دي… دلوقتي؟</b></div>' + cycleHtml("V", "cyV") + '<div class="saved" id="sv"></div>');
    bindNotes(); bindCycle("cyV", function () { document.getElementById("sv").textContent = "اتحفظ ✓"; });
  };

  VIEWS.hours = function (ph) {
    var cur = me[ph.key] === undefined ? 5 : me[ph.key];
    html('<div class="big">كام ساعة في الأسبوع… بتحس فيها بالحياة في حياتك إنت؟</div>' +
      '<p class="sub">مش في الماتش، ولا المسلسل، ولا حياة صاحبك. في حياتك إنت.</p>' +
      '<div class="card" style="text-align:center"><div class="circle-no" id="hv">' + ar(cur) + '</div><div class="muted">ساعة في الأسبوع</div>' +
      '<input type="range" min="0" max="40" step="1" value="' + cur + '" id="hr" style="width:100%;margin-top:14px;accent-color:var(--V)"></div>' +
      '<button class="btn" id="hs">ابعت</button><div class="saved" id="sv">' + (me[ph.key] !== undefined ? "اتسجل ✓" : "") + "</div>");
    var r = document.getElementById("hr");
    r.oninput = function () { document.getElementById("hv").textContent = ar(r.value); };
    document.getElementById("hs").onclick = function () {
      me[ph.key] = +r.value; save(); sendVote(ph.key, +r.value);
      document.getElementById("sv").textContent = "اتسجل ✓ (تقدر تغيّر)";
    };
  };

  /* الترتيب: دوس بالترتيب الأول ثم التاني ثم التالت */
  VIEWS.rank = function (ph) {
    var K = MZ_KEYS[ph.key];
    var opts = seedShuffle(K.opts, (uid || me.name || "x") + ph.key);
    var order = (me[ph.key] || []).slice();
    function draw() {
      html((ph.key === "felt" ? '<div class="eyebrow">إحساسك · ٢٠ ثانية</div>' : '<div class="eyebrow">مفتاح · رتّب حسب اللي بتعمله فعلًا</div>') +
        '<div class="big">' + esc(K.q) + "</div>" +
        '<p class="muted">دوس على الأقرب ليك الأول… وبعده… وبعده.</p><div class="rank" id="rk">' +
        opts.map(function (o) {
          var pos = order.indexOf(o.v);
          return '<button class="opt' + (pos >= 0 ? " on" : "") + '" data-v="' + o.v + '"><span class="k">' + (pos >= 0 ? ar(pos + 1) : "") + "</span><span>" + esc(o.l) + "</span></button>";
        }).join("") + '</div><div class="saved" id="sv">' + (order.length === 3 ? "اتحفظ على موبايلك ✓" : "") + "</div>" +
        (order.length ? '<button class="btn ghost" id="rr">رتّب من الأول</button>' : ""));
      document.getElementById("rk").onclick = function (e) {
        var b = e.target.closest(".opt"); if (!b) return;
        var v = b.dataset.v, i = order.indexOf(v);
        if (i >= 0) { order = order.slice(0, i); delete me[ph.key]; save(); }      /* رجوع: يشيله هو واللي بعده */
        else { order.push(v); if (order.length === 2) order.push(["H", "V", "B"].filter(function (x) { return order.indexOf(x) < 0; })[0]); }
        if (order.length === 3) { me[ph.key] = order.slice(); save(); }
        draw();
      };
      var rr = document.getElementById("rr"); if (rr) rr.onclick = function () { order = []; delete me[ph.key]; save(); draw(); };
    }
    draw();
  };

  /* ───────────── ميزاني ───────────── */
  function mizaniHtml(data, opts) {
    opts = opts || {};
    var R = mzCompute(data), h = "";
    var maxS = Math.max(1, R.sc.H, R.sc.V, R.sc.B);
    h += '<div class="mz"><div class="eyebrow">' + esc(opts.title || "ميزاني") + " · " + esc(data.name || "") + "</div>";
    h += '<div class="q-font" style="font-size:1.05rem;color:var(--ink-2)">﴿وأقيموا الوزن بالقسط ولا تُخسِروا الميزان﴾</div>';
    if (R.thin) h += '<div class="card">صفحتك مبنية على أسئلة قليلة النهارده. اقراها كبداية… مش كصورة كاملة.</div>';
    /* ١. الترتيب */
    h += '<div class="sec"><div class="sec-h">١ · ترتيبك</div><div class="axbars">' + R.order.map(function (a, i) {
      return '<div class="axbar ax-' + a + '"><span>' + ["الأول", "التاني", "التالت"][i] + ": <b style='color:var(--ax)'>" + esc(MZ_AX[a].q) + '</b></span><span class="tr"><i style="width:' + Math.round(100 * Math.max(0.08, R.sc[a] / maxS)) + '%"></i></span><span class="n">' + ar(R.sc[a]) + "</span></div>";
    }).join("") + "</div>";
    if (R.allClose) h += '<div class="card">محاورك قريبة من بعض النهارده. ده ممكن يكون اتزان… وممكن يكون إن اليوم ما لقطش الصورة كاملة.</div>';
    else if (R.close.length) h += '<p class="muted">' + R.close.map(function (p) { return esc(MZ_AX[p[0]].q) + " و" + esc(MZ_AX[p[1]].q); }).join("، ") + " قريبين من بعض. ده طبيعي جدًا.</p>";
    if (R.felt) h += '<div class="rankline"><span class="muted">إحساسك:</span>' + R.felt.map(function (a) { return axChip(a); }).join("") + "</div>" +
      (R.feltDiffers ? '<p class="muted">اختياراتك وإحساسك مختلفين. ده باب حوار، مش غلط.</p>' : "");
    if (!opts.demo) h += '<button class="btn ghost noprint" id="ovr">أنا شايف ترتيبي كده…</button>';
    h += "</div>";
    /* ٢. الأبعاد التسعة */
    var anyDim = Object.keys(R.dims).some(function (k) { return R.dims[k] !== null; });
    if (anyDim) {
      h += '<div class="sec"><div class="sec-h">٢ · أبعادك التسعة</div><div class="dimcap"><span></span><div><span>ناقصة</span><span>سليمة</span><span>زيادة</span></div></div><div class="dim9">';
      ["B", "V", "H"].forEach(function (a) { [1, 2, 3].forEach(function (n) {
        var k = a + n, v = R.dims[k];
        h += '<div class="dimrow ax-' + a + '"><span>' + esc(MZ_DIMS[k].n) + '</span><span class="dimtrack">' +
          (v === null ? "" : '<i style="right:' + (50 + v * 22) + '%"></i>') + "</span></div>";
      }); });
      h += "</div>";
      if (R.link) h += '<p class="sub" style="margin-top:12px">لاحظ: «' + esc(MZ_DIMS[R.link[0]].n) + "» عندك زيادة… و«" + esc(MZ_DIMS[R.link[1]].n) + "» ناقصة. ساعات الاتنين دول بيبقوا وش واحد.</p>";
      h += "</div>";
    }
    /* ٣. الدايرة */
    h += '<div class="sec"><div class="sec-h">٣ · الدايرة اللي محتاجة انتباهك</div>';
    if (R.hot.length) h += R.hot.map(function (x) { var C = MZ_CYCLES[x.ax];
      return '<div class="card ax ax-' + x.ax + '"><b>' + esc(C.name) + "</b> · إنت قلت إنك في «" + esc(C.st[x.st - 1]) + "»<div class='sub'>خطوتك: " + esc(C.step) + "</div></div>"; }).join("");
    else h += '<div class="card">إنت لسه في البداية أو في مكان مستقر. احفظ الخرايط.</div>';
    h += "</div>";
    /* ٤. الهدية */
    h += '<div class="sec ax-' + R.hidden + '"><div class="sec-h">٤ · الهدية المخبوءة في «' + esc(MZ_AX[R.hidden].q) + '»</div><div class="gift">' + esc(R.gift) + "</div></div>";
    /* ٥. التطوع */
    var C2 = R.combo;
    h += '<div class="sec"><div class="sec-h">٥ · التطوع… بيوزنك فين؟ وبيحرقك فين؟</div><div class="split2">' +
      '<div class="ok"><b>بيوزنك</b>' + esc(C2.ok) + '</div><div class="risk"><b>ممكن يحرقك</b>' + esc(C2.risk) + "</div></div>" +
      '<div class="card"><b>سؤالك:</b> ' + esc(C2.q) + '</div><div class="card"><b>خطوتك:</b> ' + esc(C2.step) + "</div></div>";
    if (!opts.demo) {
      h += '<div class="sec"><div class="sec-h">سطرك</div>' + noteField("line", false, "أكتر جملة في صفحتي حسيت إنها شبهي… هي:") + '<div class="saved" id="sv"></div></div>';
      if (me.commits && me.commits.some(function (x) { return x && x.t; })) h += '<div class="sec"><div class="sec-h">التزاماتي</div>' + commitsSummary() + "</div>";
    }
    h += '<div class="foot-note">دي مراية من يوم واحد، مش تشخيص. إنت أكبر منها.</div></div>';
    return { html: h, R: R };
  }

  function commitsSummary() {
    return ["H", "V", "B"].map(function (a, i) {
      var c = (me.commits || [])[i]; if (!c || !c.t) return "";
      return '<div class="card ax ax-' + a + '">' + (me.star === i ? "⭐ " : "") + esc(c.t) + (c.when ? '<div class="muted">إمتى: ' + esc(c.when) + "</div>" : "") + "</div>";
    }).join("");
  }

  VIEWS.mizani = function () {
    var out = mizaniHtml(me);
    html(out.html + '<button class="btn noprint" id="pr">احفظ PDF / اطبع</button><p class="muted noprint" style="text-align:center">أو خد سكرين شوت للصفحة 🙂</p>');
    /* رقمين مجهولين للمنظمة: المحور الأول والمكبوت */
    if (me._sentMz !== out.R.first + out.R.hidden) { me._sentMz = out.R.first + out.R.hidden; save(); sendVote("mzFirst", out.R.first); sendVote("mzHidden", out.R.hidden); }
    bindNotes();
    document.getElementById("pr").onclick = function () { window.print(); };
    var ov = document.getElementById("ovr");
    if (ov) ov.onclick = function () {
      var order = [];
      openSheet('<div class="big">رتّب محاورك زي ما إنت شايفها</div><p class="sub">قبل ما تعدّل… اسأل حد قريب منك: «أنا لما بدخل فرح بعمل إيه؟»</p><div id="ovl"></div>' +
        '<button class="btn ghost" data-h="ovreset">رجّع للحساب</button><button class="btn ghost" data-h="close">رجوع</button>');
      function d() {
        document.getElementById("ovl").innerHTML = ["H", "V", "B"].map(function (a) { var p = order.indexOf(a);
          return '<button class="opt ax ax-' + a + (p >= 0 ? " on" : "") + '" data-a="' + a + '"><span class="k">' + (p >= 0 ? ar(p + 1) : "") + "</span><span>" + esc(MZ_AX[a].q) + "</span></button>"; }).join("");
      }
      d();
      document.getElementById("ovl").onclick = function (e) {
        var b = e.target.closest(".opt"); if (!b) return; var a = b.dataset.a;
        if (order.indexOf(a) < 0) order.push(a);
        if (order.length === 2) order.push(["H", "V", "B"].filter(function (x) { return order.indexOf(x) < 0; })[0]);
        d();
        if (order.length === 3) { me.override = order.slice(); save(); setTimeout(function () { closeSheet(); render(true); }, 500); }
      };
      $sheetIn.querySelector('[data-h="ovreset"]').onclick = function () { delete me.override; save(); closeSheet(); render(true); };
    };
  };

  /* ───────────── التزاماتي ───────────── */
  VIEWS.commit = function () {
    me.commits = me.commits || [{}, {}, {}];
    function draw() {
      var h = '<div class="eyebrow">التزاماتي · صغيرة ومحددة وليها وقت</div><div class="big">واحد في كل محور… ونجمة على واحد بس.</div>';
      ["H", "V", "B"].forEach(function (a, i) {
        var c = me.commits[i] || {};
        h += '<div class="card ax ax-' + a + '"><b style="color:var(--ax)">' + esc(MZ_AX[a].q) + "</b>" +
          '<div style="margin:8px 0">' + MZ_COMMIT_SUGG[a].map(function (s, j) {
            return '<button class="chip ax-' + a + '" style="border:none;cursor:pointer" data-sug="' + i + ":" + j + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
          '<label class="field"><span>التزامي</span><textarea data-c="' + i + ':t" style="min-height:70px">' + esc(c.t || "") + "</textarea></label>" +
          '<label class="field"><span>إمتى؟</span><input data-c="' + i + ':when" value="' + esc(c.when || "") + '" placeholder="الأسبوع ده · كل يوم بعد العشا · قبل آخر الشهر"></label>' +
          '<button class="btn ghost" data-star="' + i + '" style="margin-top:4px">' + (me.star === i ? "⭐ ده الأهم" : "حط النجمة هنا") + "</button></div>";
      });
      h += '<div class="saved" id="sv"></div><p class="muted">غالبًا النجمة تروح لمحورك المكبوت (' + esc(MZ_AX[mzCompute(me).hidden].q) + ")… بس إنت حر.</p>";
      html(h);
    }
    draw();
    $main.onclick = function (e) {
      var s = e.target.closest("[data-sug]"), st = e.target.closest("[data-star]");
      if (s) { var p = s.dataset.sug.split(":"); me.commits[+p[0]] = me.commits[+p[0]] || {}; me.commits[+p[0]].t = MZ_COMMIT_SUGG[["H", "V", "B"][+p[0]]][+p[1]]; save(); draw(); }
      if (st) { me.star = +st.dataset.star; save(); draw(); }
    };
    $main.oninput = function (e) {
      var el = e.target.closest("[data-c]"); if (!el) return;
      var p = el.dataset.c.split(":"); me.commits[+p[0]] = me.commits[+p[0]] || {}; me.commits[+p[0]][p[1]] = el.value; save();
      document.getElementById("sv").textContent = "اتحفظ على موبايلك ✓";
    };
  };

  /* ───────────── رفيقي ───────────── */
  function rafiqNames() {
    var p = session && session.pairs && uid && session.pairs[uid], r = (session && session.roster) || {};
    if (p && p.length) { me.rafiq = p.map(function (u) { return r[u] || "…"; }); save(); }
    return me.rafiq || null;
  }
  function starText() { var c = (me.commits || [])[me.star]; return (c && c.t) ? c.t : ""; }
  function rafiqBlock() {
    var names = rafiqNames(), h = "";
    if (!names) return '<div class="card"><b>رفيقك لسه ما ظهرش هنا.</b><div class="muted">بص على الشاشة الكبيرة أو اسأل المساعد.</div></div>';
    h += '<div class="card" style="text-align:center"><div class="muted">' + (names.length > 1 ? "رفقاؤك الشهر ده" : "رفيقك الشهر ده") + '</div><div class="big" style="color:var(--gold)">' + names.map(esc).join(" و") + "</div></div>";
    h += '<div class="card">«أنا رفيقك الشهر ده… وهسأل عليك… وهدعي لك.»</div>';
    h += '<div class="card"><p style="margin:4px 0">١. تسأل عليه… مرة في الأسبوع على الأقل.</p><p style="margin:4px 0">٢. تدعي له بظهر الغيب… باسمه.</p><p style="margin:4px 0">٣. تنصحه… وتقبل نصيحته.</p></div>';
    h += '<label class="field"><span>رقم واتساب رفيقك (بيتحفظ على موبايلك بس)</span><input id="rnum" inputmode="tel" value="' + esc(me.rafiqNum || "") + '" placeholder="01xxxxxxxxx"></label>' +
      '<button class="btn" id="rsal">ابعت له سلام على واتساب</button>' +
      (starText() ? '<button class="btn ghost" id="rstar">ابعت له نجمتك (التزامك الأهم)</button>' : "");
    return h;
  }
  function waLink(num, text) {
    var n = MZ.en(num || "").replace(/[^0-9]/g, "");
    if (n.indexOf("0") === 0) n = "2" + n;     // رقم مصري 01… ← 201…
    return "https://wa.me/" + n + "?text=" + encodeURIComponent(text);
  }
  function bindRafiq() {
    var n = document.getElementById("rnum"); if (!n) return;
    n.oninput = function () { me.rafiqNum = n.value; save(); };
    document.getElementById("rsal").onclick = function () {
      if (!n.value.trim()) { toast("اكتب رقمه الأول 🙂"); return; }
      location.href = waLink(n.value, "السلام عليكم 🌿 أنا " + firstName() + "… رفيقك الشهر ده من يوم الميزان. هسأل عليك… وهدعي لك.");
    };
    var s = document.getElementById("rstar");
    if (s) s.onclick = function () {
      if (!n.value.trim()) { toast("اكتب رقمه الأول 🙂"); return; }
      location.href = waLink(n.value, "دي نجمتي من يوم الميزان ⭐: «" + starText() + "». اسألني عليها 🙂");
    };
  }
  VIEWS.rafiq = function () { html('<div class="eyebrow">عهد الرفقة</div>' + rafiqBlock()); bindRafiq(); };

  /* ───────────── التقييم والختام ───────────── */
  VIEWS.feedback = function () {
    html('<div class="big">ربنا معاك 🌿</div><p class="sub">سؤالين صغيرين قبل ما تمشي (من غير اسمك):</p>' +
      noteField("fb1", false, "أكتر لحظة في اليوم فضلت معاك؟") +
      noteField("fb2", false, "لو هتقول لصاحبك عن اليوم ده في جملة… هتقول إيه؟") +
      '<button class="btn" id="fbs">ابعت</button><div class="saved" id="sv"></div>');
    bindNotes();
    document.getElementById("fbs").onclick = function () {
      var n = me.notes || {};
      sendVote("fb1", (n.fb1 || "").slice(0, 600)); sendVote("fb2", (n.fb2 || "").slice(0, 600));
      me.dayAt = me.dayAt || Date.now(); save();
      document.getElementById("sv").textContent = "وصل ✓ شكرًا ليك";
    };
  };

  /* بعد اليوم: الصفحة بتفضل شغالة على الموبايل */
  VIEWS.after = function () {
    me.dayAt = me.dayAt || Date.now(); save();
    var days = Math.floor((Date.now() - me.dayAt) / 86400000);
    var prompts = [
      { d: 3, t: "بقالك ٣ أيام. لحظة التفقّد عاملة إيه؟", k: "f3" },
      { d: 7, t: "بقالك أسبوع. سألت على رفيقك؟", k: "f7" },
      { d: 14, t: "بقالك أسبوعين. نجمتك… عاملة إيه؟", k: "f14" },
      { d: 30, t: "بقالك شهر. افتح «ميزاني» تاني… وشوف إيه اتغير. وجدّد عهد الرفقة لو حابب.", k: "f30" }
    ];
    var due = prompts.filter(function (p) { return days >= p.d && !(me.follow && me.follow[p.k]); }).pop();
    var h = '<div class="eyebrow">بعد يوم الميزان</div><div class="big">أهلًا يا ' + esc(firstName()) + " 🌿</div>";
    if (due) h += '<div class="card ax ax-B"><b>' + esc(due.t) + '</b><div class="seg" style="margin-top:10px"><button data-f="' + due.k + '">عملتها ✓</button><button data-f="' + due.k + ':later">لسه</button></div></div>';
    h += '<div class="seg noprint" style="margin:10px 0"><button data-tab="miz">ميزاني</button><button data-tab="com">التزاماتي</button><button data-tab="raf">رفيقي</button></div><div id="tab"></div>';
    html(h);
    function tab(t) {
      var el = document.getElementById("tab");
      if (t === "miz") { el.innerHTML = mizaniHtml(me).html + '<button class="btn noprint" id="pr">احفظ PDF / اطبع</button>'; document.getElementById("pr").onclick = function () { window.print(); }; bindNotes(); var o = document.getElementById("ovr"); if (o) o.remove(); }
      if (t === "com") el.innerHTML = commitsSummary() || '<div class="card">ما كتبتش التزامات. ولسه ممكن: اكتب واحد صغير النهارده 🙂</div>';
      if (t === "raf") { el.innerHTML = rafiqBlock(); bindRafiq(); }
      [].forEach.call($main.querySelectorAll("[data-tab]"), function (b) { b.classList.toggle("on", b.dataset.tab === t); });
    }
    $main.onclick = function (e) {
      var b = e.target.closest("[data-tab]"); if (b) tab(b.dataset.tab);
      var f = e.target.closest("[data-f]");
      if (f) { var k = f.dataset.f; if (k.indexOf(":later") < 0) { me.follow = me.follow || {}; me.follow[k] = Date.now(); save(); toast("ربنا يباركلك 🌿"); } else toast("ولا يهمك… الأسبوع ده 🙂"); render(true); }
    };
    tab("miz");
  };

  /* ───────────── الاتصال ───────────── */
  var unsub = null, started = false;
  function start() {
    if (!MZ.hasFb()) { lastErr = { code: "mz/no-sdk" }; status(); return; }
    if (started && uid) return;
    started = true;
    MZ.signInAnon(15000).then(function (u) {
      uid = u.uid; lastErr = null;
      if (me.name) register();
      if (me.helpAt) syncHelp(true);
      flushVotes();
      if (unsub) unsub();
      unsub = MZ.watchDoc(MZ.sRef(SID), function (data, server) {
        if (server) { serverOk = true; sessionKnown = true; lastGoodAt = Date.now(); lastErr = null; }
        else if (!navigator.onLine) serverOk = false;
        var prevRev = session && session.rev;
        session = data;
        /* لو كان يدوي ورجع الاتصال واللوحة اتحركت، نرجع للمزامنة لوحدنا */
        if (mode === "manual" && server && data && data.rev && data.rev !== manualSinceRev && data.rev !== prevRev) { mode = "auto"; toast("رجعنا متصلين ✓"); }
        status(); render();
      }, function (e) { lastErr = e; serverOk = false; status(); });
    }).catch(function (e) { lastErr = e; started = false; status(); setTimeout(start, 20000); });
  }
  window.addEventListener("online", function () { flushVotes(); if (!uid) start(); });

  /* ───────────── البداية ───────────── */
  render(true);
  status();
  start();
})();
