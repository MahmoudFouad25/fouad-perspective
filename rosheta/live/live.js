/* =====================================================================
   live.js — صفحة المشارك · قبل الروشتة
   ---------------------------------------------------------------------
   تلات قواعد ما تتكسرش:
   ١. الصفحة عمرها ما تستنى حد. التسجيل بيظهر على طول، ولو الجلسة لسه
      ما بدأتش بتعرض الترحيب. ومفيش في الصفحة دي أي رسالة «مستني الأدمن».
   ٢. لو الاتصال وقع، بتقول السبب بالاسم، وبتفتح «امشي مع الشاشة» برقم
      الشريحة اللي في ركن البروجكتور.
   ٣. الإجابات بتتحفظ على الموبايل الأول، وبتتبعت أول ما الاتصال يسمح.
   ===================================================================== */
(function () {
  "use strict";
  var SID = RX.sid(), esc = MZ.esc, ar = MZ.ar;
  /* ?as=اسم: أكتر من «موبايل» في نفس المتصفح (للبروفة بس) */
  var KEY = "rx:" + SID + ":me" + (MZ.qs("as") ? ":" + MZ.qs("as") : "");
  var me = MZ.store.getJ(KEY, {});
  function save() { MZ.store.setJ(KEY, me); }

  var $main = document.getElementById("main"), $bar = document.getElementById("bar"), $dot = document.getElementById("dot"),
      $me = document.getElementById("me"), $toast = document.getElementById("toast");

  var uid = null, S = null, known = false, serverOk = false, lastErr = null, agg = {};
  var mode = "auto", manualIdx = 0, bootAt = Date.now(), lastGoodAt = 0, editing = false;
  var viewKey = "";

  function toast(t) { $toast.textContent = t; $toast.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { $toast.classList.remove("on"); }, 2200); }
  function joined() { return !!(me.name && me.role && me.gov); }
  function myTable() { return (S && S.groups && uid && S.groups[uid]) || 0; }

  /* ───────── الإرسال: محفوظ على الموبايل لحد ما يوصل ───────── */
  function sendVote(k, v) {
    me.pending = me.pending || {}; me.pending[k] = v; me.sent = me.sent || {}; me.sent[k] = v; save();
    flush();
  }
  function flush() {
    if (!uid || !MZ.db) return;
    if (me.pending && Object.keys(me.pending).length) {
      var data = me.pending;
      MZ.vRef(SID, uid).set(data, { merge: true }).then(function () {
        Object.keys(data).forEach(function (k) { if (me.pending && me.pending[k] === data[k]) delete me.pending[k]; });
        save(); lastErr = null; status();
      }).catch(function (e) { lastErr = e; status(); });
    }
    if (joined() && !me.registered) {
      MZ.pRef(SID, uid).set({ n: me.name, r: me.role, g: me.gov, at: Date.now() }, { merge: true })
        .then(function () { me.registered = true; save(); lastErr = null; status(); })
        .catch(function (e) { lastErr = e; status(); });
    }
  }

  /* ───────── الشريحة الحالية ───────── */
  function current() {
    if (mode === "manual") { var sl = RX_SLIDES[manualIdx]; return { sl: sl, step: rxSteps(sl) - 1, manual: true }; }
    if (S && S.slide) { var s2 = rxSlide(S.slide); return { sl: s2, step: Math.min(S.step || 0, rxSteps(s2) - 1) }; }
    return { sl: RX_SLIDES[0], step: 0, notStarted: true };
  }

  /* ───────── شريط الحالة ───────── */
  function status() {
    var live = serverOk && known;
    if (live) lastGoodAt = Date.now();
    $dot.className = "dot " + (mode === "manual" ? "manual" : live ? "live" : "off");
    var stale = !live && Date.now() - bootAt > 15000 && Date.now() - lastGoodAt > 15000;
    var html = "", cls = "";
    if (mode === "manual") {
      cls = "warn";
      html = "إنت ماشي مع الشاشة بنفسك. اكتب الرقم اللي في ركن الشاشة الكبيرة (تحت على الشمال):" +
        '<div class="row"><button data-m="prev">اللي قبلها</button><input id="mnum" inputmode="numeric" style="width:70px;border:1px solid #e0c48f;border-radius:10px;padding:4px 8px;text-align:center" value="' + ar(manualIdx + 1) + '">' +
        '<button data-m="go">روح</button><button data-m="next">اللي بعدها</button></div><div class="row"><button data-m="auto">رجّعني للمزامنة</button></div>';
    } else if (stale) {
      cls = lastErr && lastErr.code === "permission-denied" ? "err" : "warn";
      html = esc(lastErr ? MZ.errText(lastErr) : "مش واصلين للسيرفر دلوقتي. إجاباتك متحفظة على موبايلك، وهتتبعت أول ما الاتصال يرجع.") +
        '<br>لو الشاشة الكبيرة اتغيرت وموبايلك ما اتغيرش:<div class="row"><button data-m="manual">امشي مع الشاشة بنفسي</button><button data-m="retry">جرّب تاني</button></div>';
    }
    $bar.className = "bar" + (html ? " on " + cls : "");
    $bar.innerHTML = html;
  }
  $bar.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var m = b.getAttribute("data-m");
    if (m === "manual") { mode = "manual"; manualIdx = S && S.slide ? rxIndex(S.slide) : 0; }
    if (m === "auto") mode = "auto";
    if (m === "retry") { MZ.reconnect(); toast("بنحاول…"); start(); }
    if (m === "prev") manualIdx = Math.max(0, manualIdx - 1);
    if (m === "next") manualIdx = Math.min(RX_SLIDES.length - 1, manualIdx + 1);
    if (m === "go") { var v = parseInt(MZ.en(document.getElementById("mnum").value), 10); if (v >= 1 && v <= RX_SLIDES.length) manualIdx = v - 1; }
    status(); render(true);
  });
  setInterval(status, 4000);

  /* ───────── الشريط اللي فوق ───────── */
  function head() {
    if (!joined()) { $me.innerHTML = ""; return; }
    var t = myTable();
    $me.innerHTML = '<span>' + esc(me.name.split(" ")[0]) + "</span>" + (t ? '<span class="tbl">ترابيزة ' + ar(t) + "</span>" : "") + '<button class="edit" id="edit">عدّل</button>';
    document.getElementById("edit").onclick = function () { editing = true; render(true); };
  }

  /* ───────── العرض ───────── */
  function render(force) {
    head();
    var c = current(), ph = rxPhone(c.sl, c.step);
    if (!joined() || editing) ph = { k: "join" };
    else if (ph.k === "join") ph = { k: "table" };   /* سجّل خلاص: يشوف ترابيزته ويستنى */
    var key = [c.sl.id, c.step, ph.k, ph.act || "", joined(), editing, myTable(), mode].join("|");
    if (!force && key === viewKey) { refresh(); return; }
    /* ما نقطعش حد بيكتب في نفس الشاشة */
    var ae = document.activeElement;
    if (!force && ae && /INPUT|TEXTAREA/.test(ae.tagName) && viewKey.split("|").slice(0, 4).join("|") === key.split("|").slice(0, 4).join("|")) { viewKey = key; head(); refresh(); return; }
    viewKey = key;
    var h = "";
    if (ph.k === "join") h = joinView();
    else if (ph.k === "table") h = tableView();
    else if (ph.k === "quiet") h = '<div class="quiet"><div class="rx">℞</div><p>' + esc(ph.t || "بص للشاشة الكبيرة") + "</p></div>";
    else if (ph.k === "pick") h = pickView(ph);
    else if (ph.k === "texts") h = textsView(ph);
    else h = mirrorView(c);
    $main.innerHTML = '<div class="view">' + h + "</div>";
    bind(ph);
    refresh();
  }

  function joinView() {
    var notStarted = !(S && S.slide);
    var h = '<h1>' + (editing ? "عدّل بياناتك" : "أهلًا بيك 🌿") + '</h1><p class="lead">' + (editing ? "" : "ورشة «قبل الروشتة». اكتب بياناتك مرة واحدة، والموبايل هيمشي مع الشاشة لوحده طول اليوم.") + "</p>";
    h += '<div class="card"><label class="lbl">اسمك</label><input class="inp" id="nm" autocomplete="name" maxlength="40" value="' + esc(me.name || "") + '" placeholder="الاسم الأول والتاني">' +
      '<label class="lbl">إنت…</label><div class="seg" id="rl"><button data-r="t" class="' + (me.role === "t" ? "on" : "") + '">مدرب</button><button data-r="d" class="' + (me.role === "d" ? "on" : "") + '">مسؤول تنمية</button><button data-r="o" class="wide ' + (me.role === "o" ? "on" : "") + '">فريق تنظيم / ضيف</button></div>' +
      '<label class="lbl">محافظتك</label><select class="inp" id="gv"><option value="">اختار…</option>' + RX.GOVS.map(function (g) { return '<option' + (me.gov === g ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + "</select>" +
      '<button class="btn" id="go">' + (editing ? "احفظ" : "ادخل") + '</button><div class="err" id="er"></div></div>';
    if (notStarted && !editing) h += '<p class="muted" style="text-align:center">لو الورشة لسه ما بدأتش، عادي. الصفحة هتتغير لوحدها أول ما نبدأ.</p>';
    return h;
  }

  function tableView() {
    var t = myTable();
    if (!t) return '<div class="tbig"><div class="k">ترابيزتك</div><div class="n" style="font-size:54px;color:#b9ab95">…</div></div><div class="card">لسه الترابيزات ما اتوزعتش. اقعد في أي مكان دلوقتي، وأول ما تتوزع رقم ترابيزتك هيظهر هنا لوحده.</div>';
    var R = (S && S.roster) || {}, G = S.groups || {};
    var mates = Object.keys(G).filter(function (u) { return G[u] === t && u !== uid && R[u]; }).map(function (u) { return R[u]; });
    return '<div class="tbig"><div class="k">ترابيزتك</div><div class="n">' + ar(t) + '</div></div>' +
      '<div class="card"><b>معاك على الترابيزة</b><ul class="mates">' + (mates.length ? mates.map(function (p) {
        return "<li><span>" + esc(p.n) + (p.g ? ' <span class="muted">· ' + esc(p.g) + "</span>" : "") + '</span><span class="tag ' + (p.r || "o") + '">' + esc(RX.ROLES[p.r] || "") + "</span></li>";
      }).join("") : '<li class="muted">لسه محدش تاني</li>') + "</ul></div>";
  }

  function mirrorView(c) {
    var t = myTable();
    return RXR.mirror(c.sl, c.step, { S: S || {}, agg: agg }) || '<div class="quiet"><div class="rx">℞</div><p>بص للشاشة الكبيرة</p></div>';
  }

  /* ───── اختيار الترابيزة (اللعبة) ───── */
  var draft = null;
  function pickView(ph) {
    var A = RX_ACTS[ph.act], N = A.pick || 3;
    var sent = me.sent && me.sent[ph.act];
    draft = draft && draft.act === ph.act ? draft : { act: ph.act, c: sent ? sent.c.slice() : [], w: sent ? Object.assign({}, sent.w) : {} };
    var h = '<h2>اختاروا ' + ar(N) + ' تدريبات بس</h2><p class="lead">اتفقوا في الترابيزة الأول. وجنب كل تدريب: سطر واحد… ليه.</p><div id="tstat"></div><div class="picks" id="pk">';
    RX_REQ.forEach(function (r) {
      var on = draft.c.indexOf(r.id) !== -1;
      h += '<button class="pick' + (on ? " on" : "") + '" data-id="' + r.id + '"' + (!on && draft.c.length >= N ? " disabled" : "") + '><span class="bx">' + (on ? "✓" : "") + "</span>" + esc(r.l) + '<span class="n">' + ar(r.n) + "</span></button>";
      if (on) h += '<div class="why"><input data-w="' + r.id + '" maxlength="90" placeholder="ليه اخترتوه؟ (سطر واحد)" value="' + esc(draft.w[r.id] || "") + '"></div>';
    });
    h += '</div><div class="counter"><button class="btn gold" id="sb"' + (draft.c.length !== N ? " disabled" : "") + ">" +
      (draft.c.length === N ? (sent ? "عدّل اختيار ترابيزتنا" : "سلّم اختيار ترابيزتنا") : "اختار " + ar(N - draft.c.length) + " كمان") + "</button></div>";
    return h;
  }

  /* ───── الكتابة على الحيطة ───── */
  function textsView(ph) {
    var A = RX_ACTS[ph.act], mine = (me.sent && me.sent[ph.act]) || [];
    var h = '<h2>' + esc(ph.prompt) + '</h2><p class="lead">' + esc(ph.hint || "") + "</p>" +
      '<div class="card"><textarea class="inp" id="tx" maxlength="' + (A.maxLen || 140) + '" placeholder="' + esc(ph.ph || "") + '"></textarea>' +
      '<button class="btn" id="tsend"' + (mine.length >= (A.max || 8) ? " disabled" : "") + '>ابعت للحيطة</button><div class="err" id="er"></div></div>';
    if (mine.length) h += '<div class="card"><b>اللي بعته (' + ar(mine.length) + ")</b><ul class=\"mine\">" + mine.map(function (x, i) {
      return "<li><span>" + esc(x.t) + '</span><button data-del="' + i + '">امسح</button></li>'; }).join("") + "</ul></div>";
    h += '<p class="muted" id="wallc"></p>';
    return h;
  }

  /* حاجات بتتحدث من غير ما الشاشة تترسم من الأول */
  function refresh() {
    var c = current(), ph = rxPhone(c.sl, c.step);
    var ts = document.getElementById("tstat");
    if (ts && ph.act) {
      var A = (agg.acts && agg.acts[ph.act]) || {}, mine = A.byT && A.byT[myTable()];
      var sent = me.sent && me.sent[ph.act];
      ts.innerHTML = mine ? '<div class="done"><b>ترابيزتك سلّمت ✓</b>' + mine.c.map(RXR.reqLabel).map(esc).join(" · ") + (mine.by ? ' <span class="muted">· من ' + esc(mine.by.split(" ")[0]) + "</span>" : "") + "</div>"
        : sent ? '<div class="done"><b>اتسلّم من موبايلك ✓</b>هيظهر على الشاشة خلال ثواني.</div>' : "";
    }
    var wc = document.getElementById("wallc");
    if (wc && ph.act) { var B = (agg.acts && agg.acts[ph.act]) || {}; wc.textContent = B.n ? "على الحيطة دلوقتي " + ar(B.n) + " إجابة من القاعة." : ""; }
  }

  function bind(ph) {
    var go = document.getElementById("go");
    if (go) {
      var rl = document.getElementById("rl"), role = me.role || "";
      rl.onclick = function (e) { var b = e.target.closest("button"); if (!b) return; role = b.dataset.r; [].forEach.call(rl.children, function (x) { x.classList.toggle("on", x === b); }); };
      go.onclick = function () {
        var n = document.getElementById("nm").value.trim().replace(/\s+/g, " "), g = document.getElementById("gv").value, er = document.getElementById("er");
        if (n.length < 2) { er.textContent = "اكتب اسمك."; return; }
        if (!role) { er.textContent = "اختار: مدرب ولا مسؤول تنمية."; return; }
        if (!g) { er.textContent = "اختار محافظتك."; return; }
        me.name = n; me.role = role; me.gov = g; me.registered = false; editing = false; save();
        flush(); toast("أهلًا يا " + n.split(" ")[0] + " ✓"); render(true);
      };
    }
    var pk = document.getElementById("pk");
    if (pk) {
      var N = RX_ACTS[ph.act].pick || 3;
      pk.onclick = function (e) {
        var b = e.target.closest("button.pick"); if (!b) return;
        var id = b.dataset.id, i = draft.c.indexOf(id);
        keepWhy();
        if (i !== -1) draft.c.splice(i, 1); else if (draft.c.length < N) draft.c.push(id);
        render(true);
      };
      document.getElementById("sb").onclick = function () {
        keepWhy();
        if (draft.c.length !== N) return;
        var w = {}; draft.c.forEach(function (c) { if (draft.w[c]) w[c] = draft.w[c].slice(0, 90); });
        sendVote(ph.act, { c: draft.c.slice(), w: w, at: Date.now() });
        toast("اتسلّم ✓"); render(true);
      };
    }
    var ts = document.getElementById("tsend");
    if (ts) {
      ts.onclick = function () {
        var tx = document.getElementById("tx"), v = tx.value.trim(), er = document.getElementById("er");
        if (v.length < 3) { er.textContent = "اكتب السؤال الأول."; return; }
        var mine = ((me.sent && me.sent[ph.act]) || []).slice();
        if (mine.some(function (x) { return x.t === v; })) { er.textContent = "بعته قبل كده ✓"; return; }
        mine.push({ t: v, at: Date.now() });
        sendVote(ph.act, mine); tx.value = ""; toast("اتبعت للحيطة ✓"); render(true);
        setTimeout(function () { var t2 = document.getElementById("tx"); if (t2) t2.focus(); }, 50);
      };
      $main.onclick = function (e) {
        var d = e.target.closest("[data-del]"); if (!d) return;
        var mine = ((me.sent && me.sent[ph.act]) || []).slice(); mine.splice(+d.dataset.del, 1);
        sendVote(ph.act, mine); render(true);
      };
    } else $main.onclick = null;
  }
  function keepWhy() {
    [].forEach.call(document.querySelectorAll("[data-w]"), function (i) { draft.w[i.dataset.w] = i.value.trim(); });
  }

  /* ───────── الاتصال ───────── */
  var unsubs = [];
  function start() {
    unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = [];
    if (!MZ.hasFb()) { lastErr = { code: "mz/no-sdk" }; status(); return; }
    /* الجلسة مقروءة للكل، فبنسمعها حتى قبل الدخول المجهول */
    unsubs.push(MZ.watchDoc(MZ.sRef(SID), function (d, server) {
      known = true; if (server) { serverOk = true; lastGoodAt = Date.now(); }
      var oldSlide = S && S.slide;
      S = d;
      if (mode === "manual" && d && d.slide && d.slide !== oldSlide) { mode = "auto"; toast("رجعنا للمزامنة ✓"); }
      if (d && d.slide && d.slide !== oldSlide) { try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {} }
      status(); render(false);
    }, function (e) { serverOk = false; lastErr = e; status(); }));
    unsubs.push(MZ.watchDoc(MZ.aggRef(SID), function (d) { agg = d || {}; refresh(); var c = current(); if (rxPhone(c.sl, c.step).k === "mirror") render(true); }, function () {}));
    MZ.signInAnon(15000).then(function (u) { uid = u.uid; lastErr = null; flush(); render(true); status(); })
      .catch(function (e) { lastErr = e; status(); });
  }
  window.addEventListener("online", flush);
  setInterval(flush, 20000);

  render(true); status(); start();
})();
