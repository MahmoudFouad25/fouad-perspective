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
    var key = [c.sl.id, c.step, ph.k, (ph.act || "") + (ph.sec || ""), joined(), editing, myTable(), mode, (S && S.pairs && uid && S.pairs[uid]) || 0].join("|");
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
    $main.onchange = null;
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


  /* ── التصنيف بالبُعد ونوع السبب (القفل ٤ و٥) ── */
  function dimsRef() {
    return '<details class="ref"><summary>📍 الأماكن التسعة (دوس تفتحها)</summary>' + ["H", "V", "B"].map(function (a) {
      var A = RX_AXES[a];
      return '<div class="refax" style="--c:' + A.c + '"><b>' + esc(A.q) + "</b>" + RX_DIMS.filter(function (d) { return d.ax === a; }).map(function (d) {
        return '<details class="refd"><summary>' + esc(d.n) + ' <span class="muted">· ' + esc(d.q) + '</span></summary><div class="ok">✓ لما يبقى كويس: ' + esc(d.ok) + '</div><div class="bad">✗ لما يبقى فيه مشكلة: ' + esc(d.bad) + "</div></details>";
      }).join("") + "</div>";
    }).join("") + "</details>";
  }
  function typesRef() {
    return '<details class="ref"><summary>🔎 أنواع السبب الأربعة (دوس تفتحها)</summary>' + RX_TYPES.map(function (t) {
      return '<details class="refd"><summary>' + t.ic + " " + esc(t.n) + ' <span class="muted">← ' + esc(t.sol) + "</span></summary><div>" + esc(t.d) + "</div>" + t.q.map(function (q) { return '<div class="muted">• ' + esc(q) + "</div>"; }).join("") + "</details>";
    }).join("") + '<div class="muted" style="margin-top:6px">الترتيب: المكان الأول ← الظرف ← الدور ← المهارة آخر حاجة. واسأل: لو حياته متوقفة عليها، هيقدر؟</div></details>';
  }
  XV.tag = function (ph) {
    var A = RX_ACTS[ph.act], my = sent(ph.act) || {}, F = A.fields || ["d"], done = 0;
    var rows = A.cards.map(function (c) {
      var v = my[c.id] || {}, full = F.every(function (f) { return v[f]; }); if (full) done++;
      var h = '<div class="srt' + (full ? " done" : "") + '"><div class="t"><i>' + ar(c.no) + "</i>" + esc(c.t) + "</div>";
      if (F.indexOf("d") !== -1) h += '<select class="inp dsel" data-tg="' + c.id + '" data-f="d"><option value="">البُعد: اختار…</option>' + ["H", "V", "B"].map(function (a) {
        return '<optgroup label="' + esc(RX_AXES[a].q) + '">' + RX_DIMS.filter(function (d) { return d.ax === a; }).map(function (d) { return '<option value="' + d.id + '"' + (v.d === d.id ? " selected" : "") + ">" + esc(d.n) + "</option>"; }).join("") + "</optgroup>";
      }).join("") + "</select>";
      if (F.indexOf("t") !== -1) h += '<div class="bs" style="margin-top:6px">' + RX_TYPES.map(function (t) {
        return '<button data-tg="' + c.id + '" data-f="t" data-v="' + t.id + '"' + (v.t === t.id ? ' class="on" style="background:' + t.c + '"' : "") + ">" + t.ic + " " + esc(t.n) + "</button>"; }).join("") + "</div>";
      return h + "</div>";
    }).join("");
    return "<h2>" + esc(ph.title) + '</h2><p class="lead">' + esc(ph.hint || "") + "</p>" + (F.indexOf("d") !== -1 ? dimsRef() : "") + (F.indexOf("t") !== -1 ? typesRef() : "") +
      '<p class="muted">خلصت ' + ar(done) + " من " + ar(A.cards.length) + "</p>" + rows;
  };
  XB.tag = function (ph) {
    function set(card, f, val) {
      var my = JSON.parse(JSON.stringify(sent(ph.act) || {})); my[card] = my[card] || {}; my[card][f] = val;
      sendVote(ph.act, my); try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) {}
      var open = [].map.call(document.querySelectorAll("details[open]"), function (d) { return d.querySelector("summary").textContent; });
      var keep = window.scrollY; render(true); window.scrollTo(0, keep);
      [].forEach.call(document.querySelectorAll("details"), function (d) { if (open.indexOf(d.querySelector("summary").textContent) !== -1) d.open = true; });
    }
    $main.onclick = function (e) { var b = e.target.closest("button[data-tg]"); if (b) set(b.dataset.tg, b.dataset.f, b.dataset.v); };
    $main.onchange = function (e) { var s = e.target.closest("select[data-tg]"); if (s) set(s.dataset.tg, s.dataset.f, s.value); };
    $main.oninput = null;
  };


  /* ═════════ العيادة · المراجعة · خريطة المحافظة · التسليم ═════════ */
  function T() { var G = (S && S.groups) || {}, m = 0; Object.keys(G).forEach(function (u) { m = Math.max(m, G[u] || 0); }); return m; }
  function aggAct(id) { return (agg.acts && agg.acts[id]) || {}; }
  function busy() { var a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && $main.contains(a); }
  function keepScroll(fn) { var y = window.scrollY; fn(); window.scrollTo(0, y); }

  /* الأدوار جوّا الترابيزة: الدكتور مسؤول تنمية، والمستلم مدرب، والباقي بالترتيب */
  function myRole() {
    var t = myTable(); if (!t || !S) return null;
    var G = S.groups || {}, R = S.roster || {};
    var m = Object.keys(G).filter(function (u) { return G[u] === t; }).sort();
    var D = m.filter(function (u) { return (R[u] || {}).r === "d"; }), Tr = m.filter(function (u) { return (R[u] || {}).r === "t"; });
    var as = {}, rest;
    var doc = D[0] || m[0]; as[doc] = "doc";
    var rec = Tr.filter(function (u) { return !as[u]; })[0] || m.filter(function (u) { return !as[u]; })[0]; if (rec) as[rec] = "rec";
    rest = m.filter(function (u) { return !as[u]; });
    if (rest[0]) as[rest[0]] = "grd"; if (rest[1]) as[rest[1]] = "wrt";
    rest.slice(2).forEach(function (u) { as[u] = "hlp"; });
    if (!rest[1] && !as[uid]) as[uid] = "wrt";
    var id = as[uid] || "hlp";
    for (var i = 0; i < RX_CROLES.length; i++) if (RX_CROLES[i].id === id) return RX_CROLES[i];
    return RX_CROLES[4];
  }

  /* حارس الأقفال على الموبايل */
  var LOCK_GUARD = {
    1: { w: ["كورس", "تدريب", "ورشة"], m: "دي وسيلة… النتيجة بعدها إيه؟" },
    2: { w: RX_BANNED, m: "كلمة ممنوعة… الكاميرا مش هتشوفها." },
    3: { w: ["عشان", "السبب إن", "بسبب"], m: "«عشان»؟ مكانها مش هنا. القفل التالت بيوصف بس." }
  };
  function lockGuard(i, v) {
    var g = LOCK_GUARD[i]; if (!g || !v) return "";
    var hit = g.w.filter(function (w) { return v.indexOf(w) !== -1; });
    return hit.length ? '🔐 «' + esc(hit[0]) + "» · " + esc(g.m) : "";
  }

  function envTabsList(list, key) {
    var cur = Math.min(uiTab[key] || 0, list.length - 1), e = list[cur];
    return '<div class="envtabs">' + list.map(function (x, i) { return '<button data-envk="' + key + '" data-envi="' + i + '" class="' + (x.tone === "paper" ? "paper" : x.tone) + (i === cur ? " on" : "") + '">' + esc(x.h) + "</button>"; }).join("") + "</div>" +
      '<div class="m-card m-env ' + e.tone + '"><b>' + esc(e.h) + "</b>" + e.lines.map(function (l) { return '<div style="margin:6px 0">' + esc(l) + "</div>"; }).join("") + "</div>";
  }
  function envClick2(e) { var b = e.target.closest("[data-envk]"); if (!b) return false; uiTab[b.dataset.envk] = +b.dataset.envi; keepScroll(function () { render(true); }); return true; }

  /* ── العيادة ── */
  function ccDraft() {
    var t = myTable(), x = (aggAct("cc").byT || {})[t], loc = me.cc && me.cc.t === t ? me.cc : null;
    if (x && x.v && (!loc || (x.at || 0) > (loc.at || 0))) { me.cc = JSON.parse(JSON.stringify(x.v)); me.cc.t = t; me.cc.fromAgg = x.at; save(); }
    if (!me.cc || me.cc.t !== t) { me.cc = { t: t, case: rxClinicFor(t).id, f: {}, ty: [], to: [], dec: "", at: 0 }; save(); }
    return me.cc;
  }
  XV.clinic = function (ph) {
    var t = myTable();
    if (!t) return '<div class="card">لسه ما اتحطتش على ترابيزة. اسأل الميسّر.</div>';
    var c = rxClinicFor(t), role = myRole(), sec = ph.sec || "card";
    var h = '<div class="ctop"><span class="tbl">ترابيزة ' + ar(t) + "</span><b>" + esc(c.h) + '</b><span class="muted">' + esc(c.n) + "</span></div>";
    if (role) h += '<div class="role"><i>' + role.ic + "</i><div><b>دورك: " + esc(role.n) + "</b><span>" + esc(role.d) + "</span></div></div>";
    if (sec === "role") return h + '<p class="muted">الأدوار اتوزعت لوحدها. لو الترابيزة حبت تبدّل، تبدّل بالكلام عادي.</p>';
    h += '<details class="ref"' + (sec === "file" ? " open" : "") + '><summary>📁 ملف المريض</summary>' + envTabsList(c.envs, "cf") + "</details>";
    if (sec === "file") return h;
    var d = ccDraft();
    if (sec === "mine") {
      return h + '<div class="card"><b>بطاقة ترابيزتكم</b>' + RXR.SEVEN.map(function (r, i) { var v = d.f[i + 1]; return '<div class="m-row7"><b>' + (v ? "🔓" : "🔒") + " " + ar(i + 1) + ". " + esc(r.q) + "</b>" + (v ? "<small>" + esc(v) + "</small>" : "") + "</div>"; }).join("") + "</div>";
    }
    h += '<div class="card ccf"><b>بطاقة الاحتياج</b><p class="muted" style="margin:2px 0 8px">بطاقة واحدة للترابيزة. أي حد يقدر يكتب، والكل بيشوفها. الأحسن الكاتب.</p>';
    RXR.SEVEN.forEach(function (r, i) {
      var n = i + 1, v = d.f[n] || "";
      h += '<div class="lk' + (v ? " on" : "") + '"><label>' + (v ? "🔓" : "🔒") + " " + ar(n) + ". " + esc(r.q) + '</label><textarea data-lk="' + n + '" rows="2" maxlength="300">' + esc(v) + '</textarea><div class="guard bad" id="lg' + n + '">' + lockGuard(n, v) + "</div>";
      if (n === 5) h += '<div class="ty">' + RX_TYPES.map(function (t2) { var on = (d.ty || []).indexOf(t2.id) !== -1; return '<button data-cty="' + t2.id + '" class="' + (on ? "on" : "") + '" style="' + (on ? "background:" + t2.c + ";color:#fff" : "") + '">' + t2.ic + " " + esc(t2.n) + "</button>"; }).join("") + "</div>";
      h += "</div>";
    });
    h += '<div class="lk"><label>البطاقة رايحة لـ</label><div class="ty">' + RX_TO.map(function (o) { var on = (d.to || []).indexOf(o.id) !== -1; return '<button data-cto="' + o.id + '" class="' + (on ? "on dark" : "") + '">' + esc(o.l) + "</button>"; }).join("") + "</div></div>";
    h += '<div class="lk"><label>🏢 فيه بطاقة قرار كمان؟ (اكتبها هنا)</label><textarea data-dec="1" rows="2" maxlength="300" placeholder="مثلًا: كل متطوع ياخد بطاقة دور مكتوبة">' + esc(d.dec || "") + "</textarea></div>";
    h += '<button class="btn gold" id="ccsend">سلّم بطاقة الترابيزة</button><div class="muted" id="ccst" style="margin-top:6px">' + (d.at ? "آخر تسليم: محفوظ ✓" : "") + "</div></div>";
    if (role && role.id === "rec") h += '<div class="card" style="background:#eef6f2"><b>📥 سؤالك كمستلم في الآخر:</b>«لو التدريب ده نجح، هشوف إيه مختلف؟»</div>';
    return h;
  };
  XB.clinic = function (ph) {
    $main.oninput = function (e) {
      var ta = e.target.closest("[data-lk]"), dc = e.target.closest("[data-dec]"), d = ccDraft();
      if (ta) { d.f[ta.dataset.lk] = ta.value; var g = document.getElementById("lg" + ta.dataset.lk); if (g) g.innerHTML = lockGuard(+ta.dataset.lk, ta.value); }
      if (dc) d.dec = dc.value;
      save();
    };
    $main.onclick = function (e) {
      if (envClick2(e)) return;
      var d = ccDraft(), b = e.target.closest("[data-cty]"), o = e.target.closest("[data-cto]");
      if (b) { var i = d.ty.indexOf(b.dataset.cty); if (i === -1) d.ty.push(b.dataset.cty); else d.ty.splice(i, 1); save(); keepScroll(function () { render(true); }); return; }
      if (o) { var j = d.to.indexOf(o.dataset.cto); if (j === -1) d.to.push(o.dataset.cto); else d.to.splice(j, 1); save(); keepScroll(function () { render(true); }); return; }
      if (e.target.id === "ccsend") {
        var bad = [1, 2, 3].filter(function (n) { return lockGuard(n, d.f[n]); });
        if (bad.length && !confirm("الحارس شايف حاجة في القفل " + bad.map(ar).join(" و") + ". تسلّم كده؟")) return;
        d.at = Date.now(); save();
        sendVote("cc", { case: d.case, f: d.f, ty: d.ty, to: d.to, dec: d.dec || "", at: d.at });
        toast("اتسلّمت ✓ الترابيزة كلها بتشوفها"); var st = document.getElementById("ccst"); if (st) st.textContent = "اتسلّمت ✓";
      }
    };
  };

  /* ── المراجعة ── */
  XV.review = function () {
    var t = myTable(), n = T();
    if (!t) return '<div class="card">لسه ما اتحطتش على ترابيزة.</div>';
    var nx = t % Math.max(n, 1) + 1, card = ((aggAct("cc").byT || {})[nx] || {}).v, L = aggAct("rv").list || [];
    var mineQ = L.filter(function (x) { return x.to === t; });
    var h = "<h2>راجعوا بطاقة ترابيزة " + ar(nx) + '</h2><p class="lead">' + esc(rxClinicFor(nx).h) + " · لو قفل لسه مقفول: اكتبوا عليه سؤال، مش حكم.</p>";
    if (!card) h += '<div class="card">الترابيزة دي لسه ما سلّمتش بطاقتها. استنوا ثواني، أو راجعوا من ملفها.</div>';
    else h += RXR.SEVEN.map(function (r, i) {
      var v = card.f && card.f[i + 1];
      return '<div class="rw"><b style="display:block">' + (v ? "🔓" : "🔒") + " " + ar(i + 1) + ". " + esc(r.q) + "</b>" + (v ? '<div style="margin:4px 0">' + esc(v) + "</div>" : '<div class="muted">فاضي</div>') +
        (i === 4 && card.ty && card.ty.length ? '<div class="muted">النوع: ' + card.ty.map(function (x) { var tt = rxType(x); return tt ? tt.n : x; }).join(" · ") + "</div>" : "") +
        '<div style="display:flex;gap:6px;margin-top:6px"><input class="inp" style="padding:7px" data-rq="' + (i + 1) + '" placeholder="سؤال على القفل ده؟"><button class="btn soft" style="margin:0;width:auto;padding:7px 12px" data-rs="' + (i + 1) + '">ابعت</button></div></div>';
    }).join("");
    h += '<div class="card"><b>الأسئلة اللي اتكتبت على بطاقتكم (' + ar(mineQ.length) + ")</b>" + (mineQ.length ? mineQ.map(function (x) { return "<div>• " + (x.l ? "قفل " + ar(x.l) + ": " : "") + esc(x.t) + "</div>"; }).join("") : '<div class="muted">لسه مفيش.</div>') + "</div>";
    return h;
  };
  XB.review = function () {
    $main.oninput = null;
    $main.onclick = function (e) {
      var b = e.target.closest("[data-rs]"); if (!b) return;
      var inp = document.querySelector('[data-rq="' + b.dataset.rs + '"]'), v = inp && inp.value.trim(); if (!v || v.length < 3) return;
      var t = myTable(), nx = t % Math.max(T(), 1) + 1, m = ((me.sent && me.sent.rv) || []).slice();
      if (m.length >= 10) { toast("كفاية ١٠ 🙂"); return; }
      m.push({ t: v, at: Date.now(), to: nx, l: +b.dataset.rs }); sendVote("rv", m); inp.value = ""; toast("اتبعت ✓");
    };
  };

  /* ── خريطة المحافظة (مشتركة للزوج) ── */
  function myPair() { return (S && S.pairs && uid && S.pairs[uid]) || 0; }
  function mates() { var P = (S && S.pairs) || {}, R = (S && S.roster) || {}, p = myPair(); return Object.keys(P).filter(function (u) { return P[u] === p && u !== uid; }).map(function (u) { return R[u] || { n: "…" }; }); }
  function gmDraft() {
    var p = myPair(), x = (aggAct("gm").byP || {})[p], loc = me.gm && me.gm.p === p ? me.gm : null;
    if (x && x.v && (!loc || (x.at || 0) > (loc.at || 0))) { me.gm = JSON.parse(JSON.stringify(x.v)); me.gm.p = p; save(); }
    if (!me.gm || me.gm.p !== p) { me.gm = { p: p, goals: ["", "", ""], needs: [], month: "", at: 0 }; save(); }
    return me.gm;
  }
  var gmTimer = null;
  function gmSave() {
    var d = gmDraft(); d.at = Date.now(); save();
    clearTimeout(gmTimer);
    gmTimer = setTimeout(function () { var o = JSON.parse(JSON.stringify(d)); delete o.p; sendVote("gm", o); var st = document.getElementById("gmst"); if (st) st.textContent = "اتحفظت ✓ وزميلك شايفها"; }, 900);
  }
  function selectHtml(attr, opts, val, ph) { return "<select class=\"inp\" " + attr + '><option value="">' + esc(ph || "اختار…") + "</option>" + opts.map(function (o) { return '<option value="' + esc(o.id) + '"' + (String(val) === String(o.id) ? " selected" : "") + ">" + esc(o.l) + "</option>"; }).join("") + "</select>"; }
  var DIM_OPTS = RX_DIMS.map(function (d) { return { id: d.id, l: d.n + " · " + RX_AXES[d.ax].q }; });
  var TY_OPTS = RX_TYPES.map(function (t) { return { id: t.id, l: t.ic + " " + t.n }; });
  var SC_OPTS = [{ id: 1, l: "١" }, { id: 2, l: "٢" }, { id: 3, l: "٣" }];
  var LOCK_OPTS = [{ id: "0", l: "مفيش، كاملة" }].concat(RXR.SEVEN.map(function (r, i) { return { id: String(i + 1), l: "القفل " + ar(i + 1) + ": " + r.q }; }));
  function score(n) { return n.s1 && n.s2 && n.s3 ? (+n.s1) * 2 + (+n.s2) + (+n.s3) : 0; }

  XV.map = function (ph) {
    var p = myPair(), sec = ph.sec || "view";
    if (!p) return '<div class="card">لسه ما اتعملتش أزواج المحافظات. الميسّر هيعملها دلوقتي، وزميلك هيظهر هنا لوحده.</div>';
    var M = mates(), d = gmDraft(), h = '<div class="ctop"><span class="tbl">زوج ' + ar(p) + "</span><b>" + esc(me.gov || "") + '</b><span class="muted">مع: ' + (M.length ? M.map(function (x) { return esc(x.n) + " (" + esc(RX.ROLES[x.r] || "") + ")"; }).join("، ") : "لسه محدش") + "</span></div>";
    if (sec === "pair") return h + '<div class="card"><b>من النهارده، إنتوا فريق.</b>مسؤول التنمية عينه على الناس، والمدرب إيده بتساعدهم.</div><p class="muted">القاعدتين: ممنوع اسم كورس (اكتبوا اللي بيحصل) · ممنوع اسم حد.</p>';
    if (sec === "notes") {
      var mine = (me.sent && me.sent.gn) || [];
      return h + "<h2>لوحدك، من غير كلام</h2><p class=\"lead\">إيه اللي بيحصل في المحافظة، ومحتاج يتغير؟ كل حاجة في سطر. لحد ٧.</p>" +
        '<div class="card"><input class="inp" id="gnx" maxlength="120" placeholder="المتطوعين بيقفوا ساكتين في الحملة…"><div class="guard bad" id="gng"></div><button class="btn" id="gns"' + (mine.length >= 7 ? " disabled" : "") + ">ضيف (" + ar(mine.length) + " من ٧)</button></div>" +
        (mine.length ? '<div class="card"><ul class="mine">' + mine.map(function (x, i) { return "<li><span>" + esc(x.t) + '</span><button data-gdel="' + i + '">امسح</button></li>'; }).join("") + "</ul></div>" : "");
    }
    if (sec === "round") {
      var mineR = (me.sent && me.sent.gn) || [], pre = (uid || "").slice(0, 8), other = (aggAct("gn").list || []).filter(function (x) { return x.pr === p && x.k.indexOf(pre) !== 0; });
      var sim = me.gsim || {};
      function row(x, k) { return '<li><span>' + esc(x.t) + '</span><button data-sim="' + esc(k) + '" class="' + (sim[k] ? "on" : "") + '">' + (sim[k] ? "شبه ✓" : "شبه؟") + "</button></li>"; }
      return h + "<h2>بالدور… ومن غير نقاش</h2><p class=\"lead\">كل واحد يقرا حاجة بصوت عالي. لو شبه حاجة اتقالت، علّمها «شبه».</p>" +
        '<div class="card"><b>ورقي</b><ul class="mine">' + (mineR.length ? mineR.map(function (x, i) { return row(x, "m" + i); }).join("") : '<li class="muted">مفيش</li>') + "</ul></div>" +
        '<div class="card"><b>ورق زميلي</b><ul class="mine">' + (other.length ? other.map(function (x) { return row(x, x.k); }).join("") : '<li class="muted">لسه ما وصلش… ثواني</li>') + "</ul></div>";
    }
    h += '<div class="card"><b>🎯 المحافظة عايزة توصل لإيه؟</b><p class="muted" style="margin:0">مسودة… هتتأكدوا منها مع البورد.</p>' + [0, 1, 2].map(function (i) { return '<input class="inp" style="margin-top:6px" data-goal="' + i + '" maxlength="160" value="' + esc(d.goals[i] || "") + '" placeholder="' + ar(i + 1) + '. نتيجة تتشاف…"' + (sec !== "goal" && sec !== "view" ? "" : "") + ">"; }).join("") + "</div>";
    if (sec === "goal") return h + '<p class="muted" id="gmst">' + (d.at ? "محفوظة ✓" : "") + "</p>";
    var needs = d.needs;
    var src = ((me.sent && me.sent.gn) || []).map(function (x) { return x.t; });
    h += '<div class="card"><b>📋 أهم ٥ احتياجات</b>';
    needs.forEach(function (n, i) {
      h += '<div class="need"><div class="nh"><b>' + ar(i + 1) + '</b><input class="inp" data-nf="t" data-ni="' + i + '" maxlength="140" value="' + esc(n.t || "") + '" placeholder="اللي بيحصل…"><button data-ndel="' + i + '" title="امسح">✕</button></div>';
      if (sec === "needs" || sec === "view") h += selectHtml('data-nf="q" data-ni="' + i + '"', RX_QUAD.map(function (q) { return { id: q.id, l: q.l + " · " + q.s }; }), n.q, "مكانه على المصفوفة…");
      if (sec === "type" || sec === "view") h += '<div class="g2">' + selectHtml('data-nf="d" data-ni="' + i + '"', DIM_OPTS, n.d, "البُعد…") + selectHtml('data-nf="ty" data-ni="' + i + '"', TY_OPTS, n.ty, "نوع السبب…") + "</div>" + selectHtml('data-nf="ct" data-ni="' + i + '"', RX_CTYPES, n.ct, "نوع البطاقة…");
      if (sec === "score") h += n.ct === "k" ? '<div class="g3">' + selectHtml('data-nf="s1" data-ni="' + i + '"', SC_OPTS, n.s1, "الهدف (×٢)") + selectHtml('data-nf="s2" data-ni="' + i + '"', SC_OPTS, n.s2, "كام واحد") + selectHtml('data-nf="s3" data-ni="' + i + '"', SC_OPTS, n.s3, "هيمشوا؟") + '</div><div class="muted">المجموع: <b>' + ar(score(n)) + "</b> من ١٢" + (score(n) >= 10 ? " · أولوية أولى ⭐" : "") + "</div>" : '<div class="muted">' + (n.ct ? "مش بطاقة تدريب: مش بتترتب هنا" : "حدد نوع البطاقة الأول") + "</div>";
      if (sec === "plan") h += selectHtml('data-nf="lock" data-ni="' + i + '"', LOCK_OPTS, n.lock, "القفل الناقص…") + '<div class="g2"><input class="inp" data-nf="who" data-ni="' + i + '" maxlength="60" value="' + esc(n.who || "") + '" placeholder="هنسأل مين؟"><input class="inp" data-nf="when" data-ni="' + i + '" maxlength="40" value="' + esc(n.when || "") + '" placeholder="لحد إمتى؟"></div>';
      h += "</div>";
    });
    if (needs.length < 5 && (sec === "needs" || sec === "view")) {
      h += '<button class="btn soft" id="nadd">+ احتياج</button>';
      if (src.length) h += '<p class="muted" style="margin:8px 0 2px">أو انقل من ورقك:</p><div class="ty">' + src.map(function (t, i) { return '<button data-nsrc="' + i + '">' + esc(t.slice(0, 40)) + "</button>"; }).join("") + "</div>";
    }
    h += "</div>";
    if (sec === "plan" || sec === "view") h += '<div class="card"><b>⚖️ الميزان في محافظتنا</b>' + selectHtml('data-month="1"', RX_MONTHS.map(function (m) { return { id: m, l: m }; }), d.month, "الشهر المقترح…") + '<p class="muted" style="margin:4px 0 0">بعيد عن الامتحانات، وأحسن قبل باقي التدريبات. مبدئي.</p></div>';
    return h + '<p class="muted" id="gmst">' + (d.at ? "محفوظة ✓ · واحد بس يكتب، والتاني بيشوف" : "واحد بس يكتب، والتاني بيشوف على موبايله") + "</p>";
  };
  XB.map = function (ph) {
    function upd(fn) { var d = gmDraft(); fn(d); gmSave(); }
    $main.oninput = function (e) {
      var g = e.target.closest("[data-goal]"), n = e.target.closest("input[data-nf]"), gx = e.target.id === "gnx";
      if (g) upd(function (d) { d.goals[+g.dataset.goal] = g.value; });
      if (n) upd(function (d) { d.needs[+n.dataset.ni][n.dataset.nf] = n.value; });
      if (gx) { var w = bannedIn(e.target.value, ["كورس", "تدريب على"]); document.getElementById("gng").textContent = w.length ? "ده اسم كورس؟ اكتب اللي بيحصل." : ""; }
    };
    $main.onchange = function (e) {
      var s = e.target.closest("select[data-nf]"), m = e.target.closest("select[data-month]");
      if (s) upd(function (d) { var x = d.needs[+s.dataset.ni]; x[s.dataset.nf] = s.value; if (s.dataset.nf === "ty" && !x.ct) x.ct = s.value; });
      if (m) upd(function (d) { d.month = m.value; });
      if (s && (s.dataset.nf === "ty" || s.dataset.nf === "ct" || /^s[123]$/.test(s.dataset.nf))) keepScroll(function () { render(true); });
    };
    $main.onclick = function (e) {
      var t = e.target;
      if (t.id === "nadd") { upd(function (d) { if (d.needs.length < 5) d.needs.push({ t: "" }); }); keepScroll(function () { render(true); }); return; }
      if (t.closest("[data-ndel]")) { upd(function (d) { d.needs.splice(+t.closest("[data-ndel]").dataset.ndel, 1); }); keepScroll(function () { render(true); }); return; }
      if (t.closest("[data-nsrc]")) { var src = ((me.sent && me.sent.gn) || [])[+t.closest("[data-nsrc]").dataset.nsrc]; if (src) upd(function (d) { if (d.needs.length < 5) d.needs.push({ t: src.t }); }); keepScroll(function () { render(true); }); return; }
      if (t.closest("[data-sim]")) { me.gsim = me.gsim || {}; var k = t.closest("[data-sim]").dataset.sim; me.gsim[k] = !me.gsim[k]; save(); keepScroll(function () { render(true); }); return; }
      if (t.closest("[data-gdel]")) { var mm = ((me.sent && me.sent.gn) || []).slice(); mm.splice(+t.closest("[data-gdel]").dataset.gdel, 1); sendVote("gn", mm); render(true); return; }
      if (t.id === "gns") {
        var i = document.getElementById("gnx"), v = i.value.trim(); if (v.length < 3) return;
        var m2 = ((me.sent && me.sent.gn) || []).slice(); if (m2.length >= 7) return;
        m2.push({ t: v, at: Date.now() }); sendVote("gn", m2); toast("اتضاف ✓"); render(true);
        setTimeout(function () { var x = document.getElementById("gnx"); if (x) x.focus(); }, 50);
      }
    };
  };

  /* ── اتفاق التسليم ── */
  function hoDraft() {
    var p = myPair(), x = (aggAct("ho").byP || {})[p], loc = me.ho && me.ho.p === p ? me.ho : null;
    if (x && x.v && (!loc || (x.at || 0) > (loc.at || 0))) { me.ho = JSON.parse(JSON.stringify(x.v)); me.ho.p = p; save(); }
    if (!me.ho || me.ho.p !== p) { me.ho = { p: p, card: "", ans: "", st: "", lock: "", until: "", follow: "", at: 0 }; save(); }
    return me.ho;
  }
  var hoTimer = null;
  function hoSave() { var d = hoDraft(); d.at = Date.now(); save(); clearTimeout(hoTimer); hoTimer = setTimeout(function () { var o = JSON.parse(JSON.stringify(d)); delete o.p; sendVote("ho", o); var st = document.getElementById("host"); if (st) st.textContent = "اتحفظ ✓"; }, 700); }
  XV.handover = function (ph) {
    var p = myPair(); if (!p) return '<div class="card">لسه ما اتعملتش أزواج المحافظات.</div>';
    var d = hoDraft(), g = gmDraft(), opts = (g.needs || []).filter(function (n) { return n.t; }).map(function (n, i) { return { id: String(i), l: (n.ct === "k" ? "📚 " : n.ct === "p" ? "🏢 " : "") + n.t + (score(n) ? " (" + ar(score(n)) + "/١٢)" : "") }; });
    var h = "<h2>اتفاق التسليم</h2>";
    if (ph.sec !== "date") {
      h += '<div class="card"><b>البطاقة</b>' + (opts.length ? selectHtml('data-ho="card"', opts, d.card, "اختار بطاقة التدريب الأعلى درجة…") : '<input class="inp" data-hoi="card" value="' + esc(d.card || "") + '" placeholder="اكتب البطاقة">') +
        '<label class="lbl">سؤال المدرب: «لو التدريب ده نجح، هشوف إيه مختلف؟»</label><textarea class="inp" data-hoi="ans" rows="2" placeholder="إجابة مسؤول التنمية… حاجة تتشاف">' + esc(d.ans || "") + "</textarea>" +
        '<label class="lbl">حالة البطاقة</label><div class="ty"><button data-hst="ready" class="' + (d.st === "ready" ? "on ok" : "") + '">✓ جاهزة: السبع أقفال مفتوحين</button><button data-hst="back" class="' + (d.st === "back" ? "on bk" : "") + '">↩ ترجع</button></div>';
      if (d.st === "back") h += selectHtml('data-ho="lock"', LOCK_OPTS.slice(1), d.lock, "القفل الناقص…") + '<input class="inp" data-hoi="until" style="margin-top:6px" value="' + esc(d.until || "") + '" placeholder="هيتكمل لحد إمتى؟ (تاريخ)">';
      h += "</div>";
    }
    h += '<div class="card"><b>📅 ميعاد المتابعة بتاعنا (بعد ٦ لـ٨ أسابيع)</b><input class="inp" type="date" data-hoi="follow" value="' + esc(d.follow || "") + '"><p class="muted" style="margin:6px 0 0">وحطه في تقويم موبايلك دلوقتي. ولو حد نسي، التاني يفكّره.</p></div>';
    return h + '<p class="muted" id="host">' + (d.at ? "محفوظ ✓" : "") + "</p>";
  };
  XB.handover = function () {
    $main.oninput = function (e) { var i = e.target.closest("[data-hoi]"); if (i) { hoDraft()[i.dataset.hoi] = i.value; hoSave(); } };
    $main.onchange = function (e) { var s = e.target.closest("select[data-ho]"), i = e.target.closest("[data-hoi]"); if (s) { hoDraft()[s.dataset.ho] = s.value; hoSave(); } if (i) { hoDraft()[i.dataset.hoi] = i.value; hoSave(); } };
    $main.onclick = function (e) { var b = e.target.closest("[data-hst]"); if (b) { hoDraft().st = b.dataset.hst; hoSave(); keepScroll(function () { render(true); }); } };
  };

  /* لما خريطة الزوج أو بطاقة الترابيزة تتحدث من الموبايل التاني: نعرضها لو محدش بيكتب */
  function sharedRefresh() {
    var c = current(), ph = rxPhone(c.sl, c.step);
    if (busy()) return;
    if (ph.k === "map" && myPair()) { var x = (aggAct("gm").byP || {})[myPair()]; if (x && me.gm && (x.at || 0) > (me.gm.at || 0)) keepScroll(function () { render(true); }); }
    if (ph.k === "clinic" && myTable()) { var y = (aggAct("cc").byT || {})[myTable()]; if (y && me.cc && (y.at || 0) > (me.cc.at || 0)) keepScroll(function () { render(true); }); }
    if (ph.k === "review" || (ph.k === "map" && ph.sec === "round")) keepScroll(function () { render(true); });
    if (ph.k === "handover" && myPair()) { var z = (aggAct("ho").byP || {})[myPair()]; if (z && me.ho && (z.at || 0) > (me.ho.at || 0)) keepScroll(function () { render(true); }); }
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
    unsubs.push(MZ.watchDoc(MZ.aggRef(SID), function (d) { agg = d || {}; refresh(); var c = current(); if (rxPhone(c.sl, c.step).k === "mirror") render(true); else sharedRefresh(); }, function () {}));
    MZ.signInAnon(15000).then(function (u) { uid = u.uid; lastErr = null; flush(); render(true); status(); })
      .catch(function (e) { lastErr = e; status(); });
  }
  window.addEventListener("online", flush);
  setInterval(flush, 20000);

  /* للبروفة على اللابتوب بس (?as=اسم&bus=1): الموبايل بيسمع لوحة التحكم المحلية من غير سيرفر */
  if (MZ.qs("as") && MZ.qs("bus")) {
    uid = "as_" + MZ.qs("as");
    MZ.localBus(SID).on(function (m) {
      if (m && m.S) { S = Object.assign({}, S || {}, m.S); known = true; lastGoodAt = Date.now(); serverOk = true; status(); render(false); }
      if (m && m.agg) { agg = m.agg; var c = current(); if (rxPhone(c.sl, c.step).k === "mirror") render(true); else sharedRefresh(); }
    });
  }

  render(true); status(); start();
})();
