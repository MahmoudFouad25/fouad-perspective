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
    if (mode === "manual") {
      /* ماشي بنفسه: نفتح الجزء التفاعلي في الشريحة لو فيه، عشان يقدر يشارك حتى من غير اتصال */
      var sl = RX_SLIDES[manualIdx], st = rxSteps(sl) - 1;
      var alt = -1;
      for (var i = 0; i < sl.steps.length; i++) {
        var p = sl.steps[i].ph; if (!p) continue;
        if (p.act || (p.a && p.a.act)) { alt = -1; st = i; break; }          /* أولوية: الجزء اللي فيه إجابة */
        if (alt < 0 && !/^(mirror|quiet|join|table)$/.test(p.k)) alt = i;
      }
      if (alt >= 0) st = alt;
      return { sl: sl, step: st, manual: true };
    }
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
    else if (XV[ph.k]) h = XV[ph.k](ph);
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
      (ph.guard ? '<div class="guard" id="gd"></div>' : "") +
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
    if (XB[ph.k]) { XB[ph.k](ph); return; }
    var txg = document.getElementById("tx"), gd = document.getElementById("gd");
    if (txg && gd) txg.oninput = function () { gd.outerHTML = guardHtml(txg.value, ph.guard, "gd"); gd = document.getElementById("gd"); };
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
        if (ph.guard && bannedIn(v, ph.guard).length) { er.textContent = "شيل الكلمة الممنوعة الأول 🙂"; return; }
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
    $main.oninput = null;
  }
  function keepWhy() {
    [].forEach.call(document.querySelectorAll("[data-w]"), function (i) { draft.w[i.dataset.w] = i.value.trim(); });
  }


  /* ═════════ أوضاع الموبايل الإضافية (الأقفال ١ → ٣ وبعدها) ═════════ */
  var XV = {}, XB = {}, uiTab = {};
  function words(g) { return g === 1 || g === true ? RX_BANNED : (g || RX_BANNED); }
  function bannedIn(t, g) { var w = []; t = t || ""; words(g).forEach(function (b) { if (t.indexOf(b) !== -1 && w.indexOf(b) === -1) w.push(b); }); return w; }
  function guardHtml(t, g, id) {
    var w = bannedIn(t, g), a = id ? ' id="' + id + '"' : "";
    if (w.length) return '<div class="guard bad"' + a + '>فيها كلمة ممنوعة: «' + w.map(esc).join("»، «") + "». " + (g && g.length && g !== RX_BANNED && g !== 1 ? "دي وسيلة… النتيجة بعدها إيه؟" : "الكاميرا مش هتشوفها 🙂") + "</div>";
    return '<div class="guard' + ((t || "").trim().length > 4 ? " ok" : "") + '"' + a + ">" + ((t || "").trim().length > 4 ? "تمام، دي حاجة تتشاف ✓" : "") + "</div>";
  }
  function sent(act) { return (me.sent && me.sent[act]) || null; }

  /* ── التصنيف ── */
  function sortRows(act) {
    var A = RX_ACTS[act], my = sent(act) || {}, done = 0;
    var h = A.cards.map(function (c) {
      var v = my[c.id]; if (v) done++;
      return '<div class="srt' + (v ? " done" : "") + '"><div class="t"><i>' + ar(c.no) + "</i>" + esc(c.t) + '</div><div class="bs">' + A.bins.map(function (b) {
        return '<button data-sc="' + c.id + '" data-sb="' + b.id + '" data-sa="' + act + '"' + (v === b.id ? ' class="on" style="background:' + b.c + '"' : "") + ">" + esc(b.s || b.l) + "</button>"; }).join("") + "</div></div>";
    }).join("");
    return { h: h, done: done, n: A.cards.length };
  }
  XV.sort = function (ph) {
    var r = sortRows(ph.act);
    return "<h2>" + esc(ph.title || "صنّف") + '</h2><p class="lead">' + esc(ph.hint || "") + '</p><p class="muted" id="sdone">صنّفت ' + ar(r.done) + " من " + ar(r.n) + "</p>" + r.h;
  };
  function sortClick(e) {
    var b = e.target.closest("[data-sc]"); if (!b) return false;
    var act = b.dataset.sa, my = Object.assign({}, sent(act) || {});
    my[b.dataset.sc] = b.dataset.sb; sendVote(act, my);
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) {}
    var keep = window.scrollY; render(true); window.scrollTo(0, keep);
    return true;
  }
  XB.sort = function () { $main.onclick = sortClick; $main.oninput = null; };

  /* ── الاختيار ── */
  XV.choice = function (ph) {
    var A = RX_ACTS[ph.act], my = sent(ph.act) || [], max = ph.max || A.max || 3;
    return "<h2>" + esc(ph.prompt) + '</h2><p class="muted">اخترت ' + ar(my.length) + " من " + ar(max) + (my.length === max ? " ✓ اتبعت" : "") + '</p><div class="picks">' + A.opts.map(function (o) {
      var on = my.indexOf(o.id) !== -1;
      return '<button class="pick' + (on ? " on" : "") + '" data-ch="' + o.id + '"' + (!on && my.length >= max ? " disabled" : "") + '><span class="bx">' + (on ? "✓" : "") + "</span>" + esc(o.l) + "</button>";
    }).join("") + "</div>";
  };
  XB.choice = function (ph) {
    $main.oninput = null;
    $main.onclick = function (e) {
      var b = e.target.closest("[data-ch]"); if (!b) return;
      var A = RX_ACTS[ph.act], max = ph.max || A.max || 3, my = (sent(ph.act) || []).slice(), i = my.indexOf(b.dataset.ch);
      if (i !== -1) my.splice(i, 1); else if (my.length < max) my.push(b.dataset.ch);
      sendVote(ph.act, my); render(true);
    };
  };

  /* ── إعادة الكتابة (الكلمات الممنوعة) ── */
  XV.rewrite = function (ph) {
    var A = RX_ACTS[ph.act], my = sent(ph.act) || {};
    return "<h2>" + esc(ph.title) + '</h2><p class="lead">' + esc(ph.hint || "") + "</p>" + A.items.map(function (it) {
      var v = (my[it.i] && my[it.i].t) || "";
      return '<div class="rw"><s>' + esc(it.t) + '</s><input data-rw="' + it.i + '" maxlength="140" value="' + esc(v) + '" placeholder="المتطوع بي…"' + (v ? ' class="ok"' : "") + ">" + guardHtml(v, 1, "g" + it.i) + "</div>";
    }).join("") + '<button class="btn" id="rwsend">ابعت اللي كتبته</button><div class="err" id="er"></div>';
  };
  XB.rewrite = function (ph) {
    $main.onclick = null;
    $main.oninput = function (e) {
      var i = e.target.closest("[data-rw]"); if (!i) return;
      var g = document.getElementById("g" + i.dataset.rw); if (g) g.outerHTML = guardHtml(i.value, 1, "g" + i.dataset.rw);
      i.className = bannedIn(i.value, 1).length ? "bad" : "";
    };
    document.getElementById("rwsend").onclick = function () {
      var my = Object.assign({}, sent(ph.act) || {}), bad = 0, any = 0, er = document.getElementById("er");
      [].forEach.call(document.querySelectorAll("[data-rw]"), function (i) {
        var v = i.value.trim(); if (!v) return;
        if (bannedIn(v, 1).length) { bad++; return; }
        any++; if (!my[i.dataset.rw] || my[i.dataset.rw].t !== v) my[i.dataset.rw] = { t: v, at: Date.now() };
      });
      if (bad) { er.textContent = "فيه " + ar(bad) + " جملة لسه فيها كلمة ممنوعة. صلّحها، أو امسحها."; }
      if (!any) { if (!bad) er.textContent = "اكتب جملة واحدة على الأقل."; return; }
      sendVote(ph.act, my); toast("اتبعت ✓");
    };
  };

  /* ── عمودين (الكاميرا) ── */
  XV.texts2 = function (ph) {
    var cur = uiTab.t2 || "a", c = ph[cur], A = RX_ACTS[c.act], mine = sent(c.act) || [];
    return "<h2>" + esc(ph.prompt) + '</h2><p class="lead">' + esc(ph.hint || "") + '</p><div class="tabs2"><button data-t2="a" class="good' + (cur === "a" ? " on" : "") + '">' + esc(ph.a.l) + " (" + ar((sent(ph.a.act) || []).length) + ')</button><button data-t2="b" class="bad' + (cur === "b" ? " on" : "") + '">' + esc(ph.b.l) + " (" + ar((sent(ph.b.act) || []).length) + ")</button></div>" +
      '<div class="card"><textarea class="inp" id="tx" maxlength="' + (A.maxLen || 110) + '" placeholder="مثلًا: بيقف قدام الترابيزة"></textarea><div class="guard" id="gd"></div><button class="btn" id="tsend"' + (mine.length >= (A.max || 10) ? " disabled" : "") + ">ابعت</button><div class=\"err\" id=\"er\"></div></div>" +
      (mine.length ? '<div class="card"><b>اللي بعته هنا</b><ul class="mine">' + mine.map(function (x, i) { return "<li><span>" + esc(x.t) + '</span><button data-del="' + i + '">امسح</button></li>'; }).join("") + "</ul></div>" : "");
  };
  XB.texts2 = function (ph) {
    var cur = uiTab.t2 || "a", act = ph[cur].act, tx = document.getElementById("tx"), gd = document.getElementById("gd");
    $main.oninput = function () { gd.outerHTML = guardHtml(tx.value, 1, "gd"); gd = document.getElementById("gd"); };
    $main.onclick = function (e) {
      var t = e.target.closest("[data-t2]"); if (t) { uiTab.t2 = t.dataset.t2; render(true); return; }
      var d = e.target.closest("[data-del]"); if (d) { var m = (sent(act) || []).slice(); m.splice(+d.dataset.del, 1); sendVote(act, m); render(true); }
    };
    document.getElementById("tsend").onclick = function () {
      var v = tx.value.trim(), er = document.getElementById("er");
      if (v.length < 3) { er.textContent = "اكتب اللي الكاميرا هتشوفه."; return; }
      if (bannedIn(v, 1).length) { er.textContent = "شيل الكلمة الممنوعة الأول 🙂"; return; }
      var m = (sent(act) || []).slice(); if (m.some(function (x) { return x.t === v; })) { er.textContent = "بعته قبل كده ✓"; return; }
      m.push({ t: v, at: Date.now() }); sendVote(act, m); toast("اتبعت ✓"); render(true);
      setTimeout(function () { var t2 = document.getElementById("tx"); if (t2) t2.focus(); }, 50);
    };
  };

  /* ── الظروف ── */
  function envTabs(list) {
    var cur = Math.min(uiTab.env || 0, list.length - 1), e = list[cur];
    return '<div class="envtabs">' + list.map(function (x, i) { return '<button data-env="' + i + '" class="' + x.tone + (i === cur ? " on" : "") + '">' + esc(x.h.split(" (")[0]) + "</button>"; }).join("") + "</div>" +
      '<div class="m-card m-env ' + e.tone + '"><b>' + esc(e.h) + "</b>" + e.lines.map(function (l) { return '<div style="margin:6px 0">' + esc(l) + "</div>"; }).join("") + "</div>";
  }
  function envClick(e) { var t = e.target.closest("[data-env]"); if (!t) return false; uiTab.env = +t.dataset.env; render(true); return true; }
  XV.envs = function (ph) { return "<h2>التلات ظروف</h2><p class=\"lead\">اقرا التلاتة. دوس على كل لون.</p>" + envTabs(ph.list); };
  XB.envs = function () { $main.oninput = null; $main.onclick = envClick; };

  /* ── التحقيق: الظروف + التصنيف + ركن «ليه؟» ── */
  XV.inv = function (ph) {
    var r = sortRows(ph.act), mine = sent(ph.park) || [];
    return "<h2>التحقيق</h2>" + envTabs(RX_ENVS) +
      '<h3 style="margin:18px 0 4px">صنّف كل جملة</h3><p class="muted" id="sdone">صنّفت ' + ar(r.done) + " من " + ar(r.n) + "</p>" + r.h +
      '<div class="card" style="border:1.5px dashed #d8b97a"><b>ركن «ليه؟»</b><p class="muted" style="margin:0 0 6px">قلت «عشان»؟ اركنها هنا. هنرجعلها بعد الاستراحة.</p><input class="inp" id="pk" maxlength="90" placeholder="عشان…"><button class="btn soft" id="pks">اركنها</button>' +
      (mine.length ? '<ul class="mine">' + mine.map(function (x, i) { return "<li><span>" + esc(x.t) + '</span><button data-pdel="' + i + '">امسح</button></li>'; }).join("") + "</ul>" : "") + "</div>";
  };
  XB.inv = function (ph) {
    $main.oninput = null;
    $main.onclick = function (e) {
      if (envClick(e) || sortClick(e)) return;
      var d = e.target.closest("[data-pdel]"); if (d) { var m = (sent(ph.park) || []).slice(); m.splice(+d.dataset.pdel, 1); sendVote(ph.park, m); render(true); }
    };
    document.getElementById("pks").onclick = function () {
      var i = document.getElementById("pk"), v = i.value.trim(); if (v.length < 3) return;
      var m = (sent(ph.park) || []).slice(); if (m.length >= 6) { toast("كفاية ٦ 🙂"); return; }
      m.push({ t: v, at: Date.now() }); sendVote(ph.park, m); toast("اتركنت ✓"); var keep = window.scrollY; render(true); window.scrollTo(0, keep);
    };
  };

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
