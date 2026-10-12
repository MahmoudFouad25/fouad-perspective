/* =====================================================================
   console.js — لوحة التحكم · قبل الروشتة
   ---------------------------------------------------------------------
   «التالي» بيمشي الورشة كلها. كل دوسة بتتكتب في مستند الجلسة
   (للموبايلات وشاشة العرض)، وفي نفس اللحظة بتتبعت مباشرة لشاشة العرض
   على نفس اللابتوب. فلو السيرفر وقع، اللابتوب لوحده كفاية.
   ===================================================================== */
(function () {
  "use strict";
  var SID = RX.sid(), esc = MZ.esc, ar = MZ.ar;
  var root = document.getElementById("root");
  var bus = MZ.localBus(SID);
  var LKEY = "rx:" + SID + ":console";
  var S = MZ.store.getJ(LKEY, null) || { slide: RX_SLIDES[0].id, step: 0, rev: 0 };
  if (!rxSlide(S.slide) || rxSlide(S.slide).id !== S.slide) S.slide = RX_SLIDES[0].id;
  var user = null, who = null, remoteOk = false, localOnly = false, lastErr = null;
  var people = {}, votes = {}, agg = { acts: {}, n: 0 }, unsubs = [];
  var BASE = location.href.split("?")[0].replace(/\/console\/(index\.html)?$/, "/");
  function link(p) { return BASE + p + "/?s=" + encodeURIComponent(SID); }

  /* ───────────── الدخول ───────────── */
  function loginView(msg) {
    root.innerHTML = '<div class="login"><div class="rx">℞</div><div class="meta">قبل الروشتة · لوحة التحكم</div><h2>ادخل بإيميلك</h2>' +
      '<label>الإيميل<input id="em" type="email" autocomplete="username" value="' + esc(MZ.store.get("mz:adminEmail") || "") + '"></label>' +
      '<label>كلمة السر<input id="pw" type="password" autocomplete="current-password"></label>' +
      '<button class="b dark" id="go" style="width:100%;padding:12px;font-size:16px">دخول</button><div class="err" id="er">' + esc(msg || "") + "</div>" +
      '<hr style="border:none;border-top:1px solid var(--line);margin:18px 0">' +
      '<p class="meta">النت واقع أو الدخول مش راضي؟ تقدر تشغّل الورشة من اللابتوب ده بس: افتح شاشة العرض على نفس الجهاز ونفس المتصفح. الموبايلات ساعتها تمشي «مع الشاشة» برقم الشريحة.</p>' +
      '<button class="b" id="loc" style="width:100%;padding:10px">تشغيل محلي من غير سيرفر</button>' +
      '<p class="meta" style="margin-top:14px">الجلسة: <b>' + esc(SID) + '</b> · <a href="' + link("check") + '">صفحة الفحص</a></p></div>';
    document.getElementById("go").onclick = doLogin;
    document.getElementById("pw").onkeydown = function (e) { if (e.key === "Enter") doLogin(); };
    document.getElementById("loc").onclick = function () { localOnly = true; app(); };
  }
  function doLogin() {
    var em = document.getElementById("em").value.trim().toLowerCase(), pw = document.getElementById("pw").value, er = document.getElementById("er");
    if (!MZ.hasFb()) { er.textContent = MZ.errText({ code: "mz/no-sdk" }); return; }
    if (!em || !pw) { er.textContent = "اكتب الإيميل وكلمة السر."; return; }
    er.textContent = "بندخل…";
    MZ.store.set("mz:adminEmail", em);
    MZ.signIn(em, pw).catch(function (e) { er.textContent = MZ.errText(e); });
  }
  if (MZ.hasFb()) {
    MZ.auth.onAuthStateChanged(function (u) {
      if (!u || u.isAnonymous) { user = null; if (!localOnly) loginView(); return; }
      root.innerHTML = '<div class="login"><p>بنتأكد من حسابك…</p></div>';
      MZ.role(u).then(function (r) {
        if (!r.role) { MZ.auth.signOut(); loginView(MZ.errText({ code: r.why || "mz/not-admin" })); return; }
        who = r; user = u; localOnly = false; app(); listen();
      }).catch(function (e) { MZ.auth.signOut(); loginView(MZ.errText(e)); });
    }, function (e) { loginView(MZ.errText(e)); });
  } else loginView(MZ.errText({ code: "mz/no-sdk" }));

  /* ───────────── الكتابة ───────────── */
  var pending = {}, pTimer = null;
  function push(patch, quiet) {
    Object.keys(patch).forEach(function (k) { S[k] = patch[k]; });
    S.rev = Date.now(); patch.rev = S.rev;
    MZ.store.setJ(LKEY, S);
    bus.send({ S: S });
    if (user && MZ.db) {
      Object.keys(patch).forEach(function (k) { pending[k] = patch[k]; });
      clearTimeout(pTimer);
      pTimer = setTimeout(sendPending, 120);   /* الدوسات السريعة ورا بعض بتتجمع في كتابة واحدة */
    }
    if (!quiet) paint();
  }
  function sendPending() {
    var p = pending; pending = {};
    if (!Object.keys(p).length) return;
    MZ.sRef(SID).set(p, { mergeFields: Object.keys(p) })
      .then(function () { remoteOk = true; lastErr = null; head(); })
      .catch(function (e) { remoteOk = false; lastErr = e; head(); });
  }
  function go(id, step) {
    var now = Date.now(), patch = { step: step || 0, stepAt: now };
    if (id !== S.slide) { patch.slide = id; patch.slideAt = now; }
    push(patch);
  }
  function next() {
    var sl = rxSlide(S.slide), n = rxSteps(sl);
    if ((S.step || 0) < n - 1) return go(S.slide, (S.step || 0) + 1);
    var i = rxIndex(S.slide); if (i < RX_SLIDES.length - 1) go(RX_SLIDES[i + 1].id, 0);
  }
  function prev() {
    if ((S.step || 0) > 0) return go(S.slide, S.step - 1);
    var i = rxIndex(S.slide); if (i > 0) { var p = RX_SLIDES[i - 1]; go(p.id, rxSteps(p) - 1); }
  }

  /* ───────────── الاشتراكات ───────────── */
  function listen() {
    unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = [];
    if (!user || !MZ.db) return;
    unsubs.push(MZ.watchDoc(MZ.sRef(SID), function (d, server) {
      if (server) remoteOk = true;
      if (!d) {   /* أول مرة: نعمل مستند الجلسة من الحالة اللي على الجهاز */
        var base = { kind: "rosheta", title: "قبل الروشتة", createdAt: Date.now(), slide: S.slide, step: S.step || 0, stepAt: Date.now(), slideAt: Date.now(), rev: Date.now() };
        if (who && who.role !== "super") base.owner = who.email;
        MZ.sRef(SID).set(base, { merge: true }).then(function () { remoteOk = true; head(); }).catch(function (e) { lastErr = e; remoteOk = false; head(); });
        return;
      }
      if ((d.rev || 0) >= (S.rev || 0) && d.slide) { S = d; if (rxSlide(S.slide).id !== S.slide) S.slide = RX_SLIDES[0].id; MZ.store.setJ(LKEY, S); bus.send({ S: S }); paint(); }
      head();
    }, function (e) { remoteOk = false; lastErr = e; head(); }));
    unsubs.push(MZ.pCol(SID).onSnapshot(function (q) {
      people = {}; q.forEach(function (d) { var x = d.data(); if (x && x.n) people[d.id] = x; });
      syncRoster(); recompute(); paintTab(); head();
    }, function (e) { lastErr = e; head(); }));
    unsubs.push(MZ.vCol(SID).onSnapshot(function (q) {
      votes = {}; q.forEach(function (d) { votes[d.id] = d.data(); });
      recompute(); paintTab();
    }, function (e) { lastErr = e; head(); }));
  }

  /* أسامي الناس في مستند الجلسة: عشان كل موبايل يشوف اللي على ترابيزته */
  function syncRoster() {
    var r = {};
    Object.keys(people).forEach(function (u) { var p = people[u]; r[u] = { n: p.n, r: p.r || "o", g: p.g || "" }; });
    if (JSON.stringify(r) !== JSON.stringify(S.roster || {})) push({ roster: r }, true);
  }

  /* الأرقام المجمّعة: بتتحسب هنا وبتتكتب في مستند عام (للشاشة والموبايلات) */
  var aggTimer = null;
  function recompute() {
    agg = { acts: RX.aggregate(votes, people, S.groups || {}), n: Object.keys(people).length };
    bus.send({ agg: agg });
    paintLive();
    clearTimeout(aggTimer);
    aggTimer = setTimeout(function () {
      if (user && MZ.db) MZ.aggRef(SID).set({ acts: agg.acts, n: agg.n, at: Date.now() }).catch(function (e) { lastErr = e; head(); });
    }, 900);
  }

  /* ───────────── الواجهة ───────────── */
  var scTab = "now", tabNow = MZ.store.get("rx:tab") || "people";
  function app() {
    root.innerHTML =
      '<div class="wrap"><aside><div class="brand"><span class="rx">℞</span><div><b>قبل الروشتة</b><span class="meta">' + esc(SID) + '</span></div></div><div class="tl" id="tl"></div></aside>' +
      '<main><div class="hdr" id="hdr"></div>' +
      '<div class="grid"><div class="panel">' +
        '<div class="sch"><div><div class="ses" id="cses"></div><div class="lab" id="clab"></div><div class="dur" id="cdur"></div></div><span class="stepno" id="cno"></span></div>' +
        '<div class="stabs" id="stabs"></div><div class="sc" id="scb"></div></div>' +
      '<div class="ctl"><div class="panel">' +
        '<div class="pvwrap" id="pvw"><div class="pv"><iframe id="pvf" title="معاينة شاشة العرض"></iframe></div></div>' +
        '<div class="nav"><button class="prev" id="bprev">→ السابق</button><button class="next" id="bnext">التالي ←</button></div>' +
        '<div class="peek" id="peek"></div><div id="live"></div>' +
        '<div class="tools"><button class="b" id="bblack">شاشة سودا (B)</button><button class="b" id="btimer">ابدأ العداد من جديد</button><button class="b" id="bpv">إخفاء المعاينة</button>' +
        '<button class="b" id="bfont">A+</button><button class="b" id="bfont2">A−</button></div>' +
        '<div class="tools"><a class="b dark" target="_blank" href="' + link("stage") + '">افتح شاشة العرض ↗</a><a class="b" target="_blank" href="' + link("live") + '">صفحة المشارك ↗</a><a class="b" target="_blank" href="' + link("check") + '">الفحص ↗</a></div>' +
      '</div></div></div>' +
      '<div class="tabs" id="tabs"><button data-t="people">الناس والترابيزات</button><button data-t="ans">الإجابات</button><button data-t="set">البروفة والإعدادات</button></div>' +
      '<div class="panel tab" id="t-people"></div><div class="panel tab" id="t-ans"></div><div class="panel tab" id="t-set"></div></main></div>';
    document.getElementById("pvf").src = link("stage") + "&pv=1";
    document.getElementById("bnext").onclick = next;
    document.getElementById("bprev").onclick = prev;
    document.getElementById("bblack").onclick = function () { push({ black: !S.black }); };
    document.getElementById("btimer").onclick = function () { push({ stepAt: Date.now() }); };
    var fold = MZ.store.get("rx:pvfold") === "1";
    function setFold() { document.getElementById("pvw").classList.toggle("fold", fold); document.getElementById("pvw").style.display = fold ? "none" : ""; document.getElementById("bpv").textContent = fold ? "أظهر المعاينة" : "إخفاء المعاينة"; }
    document.getElementById("bpv").onclick = function () { fold = !fold; MZ.store.set("rx:pvfold", fold ? "1" : "0"); setFold(); };
    setFold();
    var fs = +(MZ.store.get("rx:fs") || 17);
    function setFs() { document.getElementById("scb").style.setProperty("--scs", fs + "px"); }
    document.getElementById("bfont").onclick = function () { fs = Math.min(26, fs + 1); MZ.store.set("rx:fs", fs); setFs(); };
    document.getElementById("bfont2").onclick = function () { fs = Math.max(13, fs - 1); MZ.store.set("rx:fs", fs); setFs(); };
    setFs();
    document.getElementById("tabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; tabNow = b.dataset.t; MZ.store.set("rx:tab", tabNow); paintTab(); };
    document.getElementById("stabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; scTab = b.dataset.st; paintScript(true); };
    document.getElementById("tl").onclick = function (e) { var b = e.target.closest("button[data-id]"); if (b) go(b.dataset.id, 0); };
    document.getElementById("scb").onclick = function (e) {
      var sg = e.target.closest(".seg[data-step]"); if (!sg || scTab !== "now") return;
      var st = +sg.dataset.step; if (st !== (S.step || 0)) go(S.slide, st);
    };
    if (!app.keys) {
      app.keys = true;
      document.addEventListener("keydown", function (e) {
        if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "")) return;
        if (e.key === "ArrowLeft" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
        else if (e.key === "ArrowRight" || e.key === "PageUp") { e.preventDefault(); prev(); }
        else if (e.key === "b" || e.key === "B" || e.key === ".") push({ black: !S.black });
      });
    }
    bus.send({ S: S }); recompute(); paint(); paintTab();
  }

  function head() {
    var el = document.getElementById("hdr"); if (!el) return;
    var n = Object.keys(people).length, fake = Object.keys(people).filter(function (u) { return people[u].fake; }).length;
    var conn = localOnly ? '<span class="pill warn">تشغيل محلي · شاشة العرض على نفس الجهاز بس</span>' :
      remoteOk ? '<span class="pill ok">● متصل · الموبايلات والشاشة ماشيين معاك</span>' :
      '<span class="pill bad">' + esc(lastErr ? MZ.errText(lastErr) : "بنوصل…") + "</span>";
    el.innerHTML = '<span class="t">قبل الروشتة</span>' + conn + '<span class="pill">دخل ' + ar(n) + (fake ? " (منهم " + ar(fake) + " بروفة)" : "") + "</span>" +
      (S.black ? '<span class="pill bad">الشاشة سودا</span>' : "") + '<span class="sp"></span>' +
      (user ? '<span class="meta">' + esc(user.email) + '</span> <button class="b" id="out">خروج</button>' : "");
    var o = document.getElementById("out"); if (o) o.onclick = function () { MZ.auth.signOut(); };
  }

  function paint() {
    if (!document.getElementById("tl")) return;
    head();
    /* الخط الزمني */
    var cur = rxIndex(S.slide), h = "", lastSes = -1;
    RX_SLIDES.forEach(function (sl, i) {
      if (sl.ses !== lastSes) { lastSes = sl.ses; var se = RX_SESSIONS[sl.ses] || {}; h += "<h4>" + esc(sl.ses ? "ج" + ar(sl.ses) + " · " + se.name : se.name) + "</h4>"; }
      h += '<button data-id="' + sl.id + '" class="' + (i === cur ? "cur" : i < cur ? "done" : "") + '"><span class="n">' + ar(i + 1) + "</span>" + esc(sl.label) + "</button>";
    });
    var plan = RX_PLAN.filter(function (p) { return !RX_SLIDES.some(function (x) { return x.ses === p.ses; }); });
    if (plan.length) h += "<h4>لسه بتتبني</h4>" + plan.map(function (p) { return '<div class="soon">ج' + ar(p.ses) + " · " + esc(p.l) + "</div>"; }).join("");
    var tl = document.getElementById("tl"); tl.innerHTML = h;
    var c = tl.querySelector(".cur"); if (c && c.scrollIntoViewIfNeeded) c.scrollIntoViewIfNeeded();

    var sl = rxSlide(S.slide), n = rxSteps(sl), st = Math.min(S.step || 0, n - 1);
    var se = RX_SESSIONS[sl.ses] || {};
    document.getElementById("cses").textContent = (sl.ses ? "الجلسة " + ar(sl.ses) + " · " : "") + (se.name || "") + " · شريحة " + ar(cur + 1);
    document.getElementById("clab").textContent = sl.label;
    document.getElementById("cdur").textContent = sl.dur ? "⏱ " + sl.dur : "";
    document.getElementById("cno").textContent = "دوسة " + ar(st + 1) + " / " + ar(n);

    /* اللي جاي */
    var nx = st < n - 1 ? { t: "في نفس الشريحة", s: sl.steps[st + 1].show } :
      (cur < RX_SLIDES.length - 1 ? { t: "الشريحة الجاية: " + RX_SLIDES[cur + 1].label, s: RX_SLIDES[cur + 1].steps[0].show } : null);
    document.getElementById("peek").innerHTML = nx ? "<b>التالي ←</b> " + esc(nx.t) + " · " + esc(qt(nx.s)) : "<b>ده آخر حاجة اتبنت لحد دلوقتي.</b>";
    document.getElementById("bblack").classList.toggle("on", !!S.black);
    paintScript(false); paintLive();
  }

  /* «…» حوالين الكلام، من غير ما تتكرر لو هي موجودة أصلًا */
  function qt(t) { t = String(t || ""); return /^«.*»$/.test(t) ? t : "«" + t + "»"; }

  /* ───────────── السكريبت ───────────── */
  var lastScKey = "";
  function line(t) {
    if (t === "") return '<div class="gap"></div>';
    var c = t.charAt(0), r = t.slice(1);
    if (c === "!") return '<div class="do">' + esc(r) + "</div>";
    if (c === "?") return '<div class="note">' + esc(r) + "</div>";
    if (c === "~") return '<div class="pause">' + esc(r || "وقفة") + "</div>";
    if (c === "*") return '<div class="me">' + esc(r) + "</div>";
    if (c === "#") return '<div class="ans">' + esc(r) + "</div>";
    return '<div class="say">' + esc(t) + "</div>";
  }
  function paintScript(force) {
    var sl = rxSlide(S.slide), n = rxSteps(sl), st = Math.min(S.step || 0, n - 1), cur = rxIndex(S.slide), se = RX_SESSIONS[sl.ses] || {};
    var ifs = sl.ifs || [];
    document.getElementById("stabs").innerHTML =
      '<button data-st="now" class="' + (scTab === "now" ? "on" : "") + '">الكلام</button>' +
      '<button data-st="ifs" class="' + (scTab === "ifs" ? "on" : "") + '">لو حصل' + (ifs.length ? '<span class="c">' + ar(ifs.length) + "</span>" : "") + "</button>" +
      (sl.ses ? '<button data-st="ses" class="' + (scTab === "ses" ? "on" : "") + '">فكرة الجلسة</button>' : "");
    var key = [S.slide, st, scTab].join("|");
    if (!force && key === lastScKey) return;
    var sameSlide = lastScKey.split("|")[0] === S.slide && lastScKey.split("|")[2] === scTab;
    lastScKey = key;
    var box = document.getElementById("scb"), h = "";
    if (scTab === "ifs") {
      h = ifs.length ? ifs.map(function (x) { return '<div class="if"><b>' + esc(x[0]) + "</b>" + esc(x[1]) + "</div>"; }).join("") : '<p class="meta">مفيش مواقف متوقعة في الشريحة دي.</p>';
    } else if (scTab === "ses") {
      h = '<div class="sesinfo"><p><b>المدة:</b> ' + esc(se.dur || "") + "</p><p><b>الحالة النفسية:</b> " + esc(se.mood || "") + "</p><p><b>الفكرة:</b> " + esc(se.idea || "") + "</p><p><b>الأسلوب:</b> " + esc(se.style || "") + "</p>" +
        (se.why ? '<h3 style="margin-top:16px">ورا الكواليس (ليك وللمدربين في الـTOT)</h3>' + se.why.map(function (w) { return '<p class="note" style="font-size:15px">' + esc(w) + "</p>"; }).join("") : "") + "</div>";
    } else {
      sl.steps.forEach(function (stp, i) {
        var cls = i === st ? "now" : i < st ? "done" : "";
        h += '<div class="seg ' + cls + '" data-step="' + i + '"><span class="onscr">🖥 ' + (i === 0 ? "الشاشة بتفتح على" : "على الشاشة") + ": " + esc(qt(stp.show)) + "</span>" +
          (stp.ph && stp.ph.k !== "mirror" ? '<span class="onscr" style="background:#e0f1eb;color:#205f50">📱 ' + esc(phoneLabel(stp.ph)) + "</span>" : "") +
          stp.s.map(line).join("");
        if (i < n - 1) h += '<span class="nx">👈 دوس التالي ← هيظهر: ' + esc(qt(sl.steps[i + 1].show)) + "</span>";
        else h += '<span class="nx end">👈 دوس التالي ← ' + (cur < RX_SLIDES.length - 1 ? "الشريحة الجاية: " + esc(qt(RX_SLIDES[cur + 1].label)) : "ده آخر حاجة اتبنت لحد دلوقتي") + "</span>";
        h += "</div>";
      });
    }
    box.innerHTML = h;
    var now = box.querySelector(".seg.now");
    if (now) {
      if (!sameSlide) box.scrollTop = 0;
      var top = now.offsetTop - box.offsetTop - 10;
      if (sameSlide || st > 0) box.scrollTop = Math.max(0, top);
    } else box.scrollTop = 0;
  }
  function phoneLabel(ph) {
    return { join: "الموبايلات: التسجيل", table: "الموبايلات: رقم الترابيزة واللي معاه", quiet: "الموبايلات هادية", pick: "الموبايلات بتفتح للاختيار", texts: "الموبايلات بتفتح للكتابة",
      sort: "الموبايلات بتفتح للتصنيف", choice: "الموبايلات بتفتح للاختيار", rewrite: "الموبايلات بتفتح على الست جمل",
      texts2: "الموبايلات بتفتح على عمودين", envs: "الموبايلات بتعرض الظروف التلاتة", inv: "الموبايلات: الظروف + التصنيف + ركن ليه", tag: "الموبايلات بتفتح للتصنيف على الخريطة" }[ph.k] || "";
  }

  /* ───────────── الحاجة الحيّة في الشريحة دي ───────────── */
  function paintLive() {
    var el = document.getElementById("live"); if (!el) return;
    var sl = rxSlide(S.slide), st = Math.min(S.step || 0, rxSteps(sl) - 1), ph = rxPhone(sl, st);
    var ids = [];
    [ph.act, ph.park, ph.a && ph.a.act, ph.b && ph.b.act].forEach(function (x) { if (x && ids.indexOf(x) === -1) ids.push(x); });
    if (!ids.length) RXR.visible(sl, st).forEach(function (it) { [it.act, it.a && it.a.act, it.b && it.b.act].forEach(function (x) { if (x && ids.indexOf(x) === -1) ids.push(x); }); });
    if (!ids.length) { el.innerHTML = ""; return; }
    var T = maxTable();
    el.innerHTML = ids.map(function (id) {
      var A = agg.acts[id] || {}, D = RX_ACTS[id] || {}, t = D.type, txt;
      if (t === "tablePick") txt = A.nT ? "سلّمت <b>" + ar(A.nT) + "</b>" + (T ? " من " + ar(T) + " ترابيزة" : " ترابيزة") : "لسه محدش سلّم من الموبايلات";
      else if (t === "texts") txt = A.n ? esc(D.label) + ": <b>" + ar(A.n) + "</b> إجابة" : esc(D.label) + ": لسه فاضية";
      else if (t === "sort" || t === "rewrite" || t === "choice" || t === "tag") txt = A.n ? esc(D.label) + ": جاوب <b>" + ar(A.n) + "</b> من " + ar(Object.keys(people).length) : esc(D.label) + ": لسه محدش جاوب";
      else txt = esc(D.label || id);
      return '<div class="livebox">' + txt + "</div>";
    }).join("");
  }
  function maxTable() { var G = S.groups || {}, m = 0; Object.keys(G).forEach(function (u) { m = Math.max(m, G[u] || 0); }); return m; }

  /* ───────────── التبويبات ───────────── */
  function paintTab() {
    var tabs = document.getElementById("tabs"); if (!tabs) return;
    [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.t === tabNow); });
    ["people", "ans", "set"].forEach(function (t) { document.getElementById("t-" + t).classList.toggle("on", t === tabNow); });
    var ae = document.activeElement; if (ae && /INPUT|SELECT/.test(ae.tagName) && ae.closest(".tab")) return;
    if (tabNow === "people") paintPeople(); else if (tabNow === "ans") paintAns(); else paintSet();
  }
  function plist() { return Object.keys(people).map(function (u) { var p = people[u]; return { u: u, n: p.n, r: p.r || "o", g: p.g || "", fake: !!p.fake }; }); }

  function paintPeople() {
    var el = document.getElementById("t-people"), L = plist(), G = S.groups || {};
    if (localOnly) { el.innerHTML = '<p class="meta">في التشغيل المحلي مفيش موبايلات متصلة، فمفيش ناس ولا ترابيزات هنا.</p>'; return; }
    var size = +(MZ.store.get("rx:tsize") || 6), unplaced = L.filter(function (p) { return !G[p.u]; });
    var h = '<div class="ctr"><b>' + ar(L.length) + " مشارك</b> · " + ar(L.filter(function (p) { return p.r === "t"; }).length) + " مدرب · " + ar(L.filter(function (p) { return p.r === "d"; }).length) + " مسؤول تنمية</div>" +
      '<div class="ctr"><label>كام واحد في الترابيزة؟ <input class="s" id="tsz" type="number" min="3" max="12" value="' + size + '" style="width:64px"></label>' +
      '<button class="b dark" id="mk">' + (Object.keys(G).length ? "وزّع الترابيزات من الأول" : "وزّع الترابيزات") + "</button>" +
      (unplaced.length && Object.keys(G).length ? '<button class="b" id="late">حط المتأخرين (' + ar(unplaced.length) + ")</button>" : "") +
      '<span class="meta">بيخلط المدربين بمسؤولين التنمية، وبيفرّق اللي من نفس المحافظة.</span></div>';
    var by = {};
    L.forEach(function (p) { if (G[p.u]) (by[G[p.u]] = by[G[p.u]] || []).push(p); });
    var ks = Object.keys(by).sort(function (a, b) { return a - b; });
    if (ks.length) h += "<div>" + ks.map(function (k) {
      return '<div class="tcard"><b>' + ar(k) + "</b>" + ar(by[k].length) + "<div>" + by[k].map(function (p) { return '<span class="dt ' + p.r + '"></span>' + esc(p.n.split(" ")[0]) + " <span class=\"meta\">" + esc(p.g) + "</span>"; }).join("<br>") + "</div></div>";
    }).join("") + '</div><p class="meta"><span class="dt t"></span>مدرب · <span class="dt d"></span>مسؤول تنمية · <span class="dt o"></span>تنظيم/ضيف</p>';
    var maxT = Math.max(maxTable(), ks.length);
    h += "<table><tr><th>الاسم</th><th>الدور</th><th>المحافظة</th><th>الترابيزة</th><th></th></tr>" + L.sort(function (a, b) { return (G[a.u] || 99) - (G[b.u] || 99) || a.n.localeCompare(b.n, "ar"); }).map(function (p) {
      var opts = '<option value="">—</option>'; for (var i = 1; i <= maxT + 1; i++) opts += '<option value="' + i + '"' + (G[p.u] === i ? " selected" : "") + ">" + ar(i) + "</option>";
      return "<tr><td>" + esc(p.n) + (p.fake ? ' <span class="meta">(بروفة)</span>' : "") + "</td><td>" + esc(RX.ROLES[p.r] || "") + "</td><td>" + esc(p.g) + '</td><td><select class="s" data-tb="' + p.u + '">' + opts + '</select></td><td><button class="b red" data-rm="' + p.u + '">شيله</button></td></tr>';
    }).join("") + "</table>";
    el.innerHTML = h;
    document.getElementById("tsz").onchange = function () { MZ.store.set("rx:tsize", this.value); };
    document.getElementById("mk").onclick = function () {
      if (Object.keys(G).length && !confirm("التوزيع الحالي هيتمسح ويتعمل من الأول. موافق؟")) return;
      var sz = +document.getElementById("tsz").value || 6; MZ.store.set("rx:tsize", sz);
      push({ groups: RX.makeTables(plist(), sz) }); recompute(); paintPeople();
    };
    var lt = document.getElementById("late");
    if (lt) lt.onclick = function () {
      var g2 = Object.assign({}, S.groups || {}), all = plist();
      unplaced.forEach(function (p) { g2[p.u] = RX.placeLate(p, g2, all); });
      push({ groups: g2 }); recompute(); paintPeople();
    };
    el.onchange = function (e) {
      var s = e.target.closest("[data-tb]"); if (!s) return;
      var g2 = Object.assign({}, S.groups || {}); if (s.value) g2[s.dataset.tb] = +s.value; else delete g2[s.dataset.tb];
      push({ groups: g2 }); recompute(); paintPeople();
    };
    el.onclick = function (e) {
      var r = e.target.closest("[data-rm]"); if (!r) return;
      var u = r.dataset.rm; if (!confirm("نشيل «" + (people[u] && people[u].n) + "» من الكشف؟ (لو موبايله لسه مفتوح، هيرجع يسجّل لو عدّل بياناته)")) return;
      var g2 = Object.assign({}, S.groups || {}); delete g2[u]; push({ groups: g2 });
      MZ.pRef(SID, u).delete().catch(function (x) { alert(MZ.errText(x)); }); MZ.vRef(SID, u).delete().catch(function () {});
    };
  }

  function paintAns() {
    var el = document.getElementById("t-ans"), hid = S.hidden || {}, h = "";
    Object.keys(RX_ACTS).forEach(function (id) {
      var A = RX_ACTS[id], R = agg.acts[id] || {};
      h += "<h3>" + esc(A.label) + "</h3>";
      if (A.type === "tablePick") {
        var byT = R.byT || {}, ks = Object.keys(byT).sort(function (a, b) { return a - b; });
        h += ks.length ? "<table><tr><th>الترابيزة</th><th>الاختيار</th><th>السبب</th><th>سلّم</th></tr>" + ks.map(function (t) {
          var x = byT[t]; return "<tr><td>" + (+t ? ar(t) : "من غير") + "</td><td>" + x.c.map(RXR.reqLabel).map(esc).join(" · ") + "</td><td>" + x.c.map(function (c) { return esc(x.w[c] || "—"); }).join(" · ") + "</td><td>" + esc(x.by || "") + "</td></tr>";
        }).join("") + "</table>" : '<p class="meta">لسه مفيش.</p>';
      } else if (A.type === "sort") {
        var by = R.by || {};
        h += R.n ? "<table><tr><th>الجملة</th>" + A.bins.map(function (b) { return "<th>" + esc(b.l) + "</th>"; }).join("") + "</tr>" + A.cards.map(function (c) {
          return "<tr><td>" + ar(c.no) + ". " + esc(c.t) + "</td>" + A.bins.map(function (b) { return "<td>" + ar((by[c.id] || {})[b.id] || 0) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>" : '<p class="meta">لسه مفيش.</p>';
      } else if (A.type === "tag") {
        var tg = R.by || {};
        h += R.n ? "<table><tr><th>الحالة</th><th>البُعد (الأكتر)</th>" + ((A.fields || []).indexOf("t") !== -1 ? "<th>نوع السبب (الأكتر)</th>" : "") + "</tr>" + A.cards.map(function (c) {
          function top(o) { var b = null, m = 0, tot = 0; Object.keys(o || {}).forEach(function (k) { tot += o[k]; if (o[k] > m) { m = o[k]; b = k; } }); return b ? { b: b, p: Math.round(100 * m / tot) } : null; }
          var x = tg[c.id] || {}, d = top(x.d), t = top(x.t);
          return "<tr><td>" + ar(c.no) + ". " + esc(c.t) + "</td><td>" + (d ? esc(rxDim(d.b).n) + " (" + ar(d.p) + "٪)" : "—") + "</td>" + ((A.fields || []).indexOf("t") !== -1 ? "<td>" + (t ? esc(rxType(t.b).n) + " (" + ar(t.p) + "٪)" : "—") + "</td>" : "") + "</tr>";
        }).join("") + "</table>" : '<p class="meta">لسه مفيش.</p>';
      } else if (A.type === "choice") {
        var cn = R.count || {};
        h += R.n ? A.opts.slice().sort(function (a, b) { return (cn[b.id] || 0) - (cn[a.id] || 0); }).map(function (o) { return '<div class="wl"><span>' + esc(o.l) + "</span><b>" + ar(cn[o.id] || 0) + "</b></div>"; }).join("") : '<p class="meta">لسه مفيش.</p>';
      } else if (A.type === "rewrite") {
        var bi = R.by || {};
        h += R.n ? A.items.map(function (it) {
          var L2 = (bi[it.i] || []).slice().reverse();
          return '<p style="margin:10px 0 2px"><b>' + esc(it.t) + "</b></p>" + (L2.length ? L2.map(function (x) {
            return '<div class="wl' + (hid[x.k] ? " off" : "") + '"><span>' + esc(x.t) + '</span><button class="b" data-hide="' + esc(x.k) + '">' + (hid[x.k] ? "رجّعها" : "خبّيها") + "</button></div>"; }).join("") : '<p class="meta">—</p>');
        }).join("") : '<p class="meta">لسه مفيش.</p>';
      } else if (A.type === "texts") {
        var L = (R.list || []).slice().reverse();
        h += L.length ? '<p class="meta">اللي بتشطب عليه بيختفي من الشاشة على طول.</p>' + L.map(function (x) {
          return '<div class="wl' + (hid[x.k] ? " off" : "") + '"><span>' + esc(x.t) + ' <span class="meta">· ترابيزة ' + (x.tb ? ar(x.tb) : "—") + '</span></span><button class="b" data-hide="' + esc(x.k) + '">' + (hid[x.k] ? "رجّعها" : "خبّيها") + "</button></div>";
        }).join("") : '<p class="meta">لسه مفيش.</p>';
      }
    });
    el.innerHTML = h;
    el.onclick = function (e) {
      var b = e.target.closest("[data-hide]"); if (!b) return;
      var H = Object.assign({}, S.hidden || {}), k = b.dataset.hide;
      if (H[k]) delete H[k]; else H[k] = 1;
      push({ hidden: H }); paintAns();
    };
  }

  function paintSet() {
    var el = document.getElementById("t-set");
    el.innerHTML = "<h3>البروفة</h3><p class=\"meta\">قبل اليوم: ولّد مشاركين وهميين، ووزّع الترابيزات، وامشي الورشة كلها بـ«التالي» وشوف الشاشة والموبايل. وبعدها امسح البروفة.</p>" +
      '<div class="ctr"><label>عدد <input class="s" id="fk" type="number" value="30" min="4" max="120" style="width:70px"></label><button class="b dark" id="mkf">ولّد مشاركين وهميين بإجاباتهم</button><button class="b red" id="clf">امسح بيانات البروفة</button></div>' +
      '<p class="meta">وعشان تجرّب موبايل حقيقي: افتح <a target="_blank" href="' + link("live") + '&as=1">صفحة المشارك ١</a> و<a target="_blank" href="' + link("live") + '&as=2">٢</a> في تابات جنب بعض.</p>' +
      "<h3 style=\"margin-top:20px\">الورشة</h3>" +
      '<div class="ctr"><button class="b" id="rst">ارجع لأول شريحة</button><button class="b red" id="wipe">امسح كل الإجابات (يبدأ اليوم نضيف)</button></div>' +
      '<p class="meta">«امسح كل الإجابات» بيمسح إجابات اللعبة والحيطة بتاعة الكل، ويسيب الناس والترابيزات. استخدمه بعد البروفة لو جربت بموبايلات حقيقية.</p>' +
      "<h3 style=\"margin-top:20px\">الكيبورد والريموت</h3><p class=\"meta\">السهم الشمال أو المسافة = التالي · السهم اليمين = السابق · B = شاشة سودا · والريموت (الكليكر) شغال لوحده. وعلى شاشة العرض: F = ملء الشاشة.</p>";
    document.getElementById("mkf").onclick = makeFakes;
    document.getElementById("clf").onclick = clearFakes;
    document.getElementById("rst").onclick = function () { if (confirm("ترجع لأول شريحة؟")) go(RX_SLIDES[0].id, 0); };
    document.getElementById("wipe").onclick = function () {
      if (!confirm("هتتمسح كل الإجابات بتاعة كل الناس. متأكد؟")) return;
      var batch = MZ.db.batch(), k = 0;
      Object.keys(votes).forEach(function (u) { if (k < 450) { batch.delete(MZ.vRef(SID, u)); k++; } });
      batch.commit().then(function () { push({ hidden: {} }); alert("اتمسحت ✓"); }).catch(function (e) { alert(MZ.errText(e)); });
    };
  }

  /* ───────────── البروفة ───────────── */
  var FN = ["أحمد", "مريم", "يوسف", "سارة", "محمد", "نور", "عمر", "منة", "خالد", "هبة", "علي", "دينا", "مصطفى", "آية", "كريم", "رنا", "محمود", "سلمى", "حسن", "ياسمين"];
  var LN = ["حسن", "عادل", "سمير", "فتحي", "جمال", "رمضان", "سعيد", "عبدالله"];
  var DQ = ["بيوجعك فين بالظبط؟", "من إمتى الوجع ده؟", "بيوجعك أكتر إمتى؟", "شغلك إيه؟ بتقعد كتير؟", "بتشيل حاجات تقيلة؟", "بتنام كويس؟", "حد تاني عنده نفس الوجع؟", "إنت عايز توصل لإيه؟", "بتتحرك ولا قاعد طول اليوم؟", "عملت أشعة قبل كده؟"];
  var WHY = ["اتطلب أكتر حاجة", "أساس أي شغل", "الناس محتاجاه في الحملات", "مهم لسوق العمل", "بيحل مشاكل كتير", ""];
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function makeFakes() {
    if (!user) { alert("البروفة محتاجة دخول (مش التشغيل المحلي)."); return; }
    var n = Math.min(120, +document.getElementById("fk").value || 30), batch = MZ.db.batch(), now = Date.now();
    for (var i = 0; i < n; i++) {
      var u = "fake_" + now.toString(36) + "_" + i;
      batch.set(MZ.pRef(SID, u), { n: rnd(FN) + " " + rnd(LN), r: i % 5 === 4 ? "o" : (i % 2 ? "t" : "d"), g: rnd(RX.GOVS.slice(0, 12)), at: now, fake: true });
      var pick = MZ.shuffle(RX_REQ.slice(0, 7).map(function (r) { return r.id; })).slice(0, 3), w = {};
      pick.forEach(function (c) { var x = rnd(WHY); if (x) w[c] = x; });
      var v = { pick3: { c: pick, w: w, at: now + i } };
      if (Math.random() < .6) v.drq = MZ.shuffle(DQ.slice()).slice(0, 1 + Math.floor(Math.random() * 2)).map(function (t, j) { return { t: t, at: now + i * 10 + j }; });
      addFake(v, now + i * 10);
      batch.set(MZ.vRef(SID, u), v);
    }
    batch.commit().then(function () { alert("اتولّد " + ar(n) + " مشارك وهمي ✓\nروح «الناس والترابيزات» ودوس «وزّع الترابيزات»."); }).catch(function (e) { alert(MZ.errText(e)); });
  }
  var L1 = ["في حملات الشارع، الناس تقف وتسمع المتطوع", "عدد اللي بيتبرعوا من الشارع يزيد", "المتطوعين بيكلموا الناس مش واقفين ساكتين", "الحملات تبقى أحسن"];
  var RWX = { 1: ["يقول في جملة واحدة الحملة هتساعد مين", "يحكي لأي حد بيسأله الحملة دي ليه"], 6: ["بيقف قدام الترابيزة مش وراها", "بيبص في عين اللي بيكلمه", "بيكمّل لو حد قاله لأ", "بيبدأ الكلام من غير ما يتردد"], 3: ["يبدأ الكلام مع حد غريب ويكمّل دقيقة"], 5: ["يشكر عضو بالاسم قدام الفريق"] };
  var CG = ["بيقف قدام الترابيزة", "بيقرّب من الناس الماشية", "بيبدأ بسلام أو سؤال", "بيحكي حكاية عن أسرة", "بيضحك وبيبص في العين", "لو حد رفض بيقوله ربنا يسهّلك"];
  var CB = ["واقف ورا الترابيزة", "بيستنى الناس تيجي", "ماسك الموبايل", "بيقول ممكن تتبرع على طول", "لو حد رفض بيسكت ويتضايق"];
  var PK = ["عشان مش واثقين", "عشان مش متحمسين", "عشان محدش ادّاهم حكايات", "عشان حاسين إنهم بيشحتوا", "عشان مكسوفين"];
  function addFake(v, at) {
    var nv = {}; RX_NV.forEach(function (c) { nv[c.id] = Math.random() < (c.id === "c3" || c.id === "c9" ? .5 : .85) ? RX_NV_KEY[c.id] : (RX_NV_KEY[c.id] === "r" ? "m" : "r"); }); v.nv = nv;
    if (Math.random() < .3) v.l1 = [{ t: rnd(L1), at: at }];
    var rw = {}; Object.keys(RWX).forEach(function (i) { if (Math.random() < .5) rw[i] = { t: rnd(RWX[i]), at: at + +i }; }); v.rw = rw;
    if (Math.random() < .6) v.camg = MZ.shuffle(CG.slice()).slice(0, 2).map(function (t, j) { return { t: t, at: at + j }; });
    if (Math.random() < .5) v.camb = MZ.shuffle(CB.slice()).slice(0, 2).map(function (t, j) { return { t: t, at: at + j }; });
    var top = ["near", "hi", "story", "front", "no"]; v.top3 = MZ.shuffle(top.slice()).slice(0, 3);
    var src = {}; RX_SRC.forEach(function (c) { src[c.id] = Math.random() < .75 ? RX_SRC_KEY[c.id] : rnd(["a", "o", "x"]); }); v.src = src;
    if (Math.random() < .35) v.park = [{ t: rnd(PK), at: at }];
    var dm = {}; RX_DS.forEach(function (c) { dm[c.id] = { d: Math.random() < .7 ? RX_DS_KEY[c.id] : rnd(RX_DIMS).id }; }); v.dm = dm;
    v.l4 = MZ.shuffle(["V2", "V3", "H2", "V1", "B2"]).slice(0, 3);
    var gr = {}; RX_GC.forEach(function (c) { var k = RX_GC_KEY[c.id]; gr[c.id] = { d: Math.random() < .75 ? k.d : rnd(RX_DIMS).id, t: Math.random() < .6 ? k.t : (Math.random() < .6 ? "k" : rnd(RX_TYPES).id) }; }); v.gr = gr;
    var ln = {}; RX_LINE.forEach(function (c) { ln[c.id] = rnd(["a", "b", "b", "c"]); }); v.ln = ln;
    var ld = {}; RX_LAD.forEach(function (c) { ld[c.id] = Math.random() < .7 ? RX_LAD_KEY[c.id] : rnd(["e", "l", "a", "r"]); }); v.ld = ld;
  }
  function clearFakes() {
    var fakes = Object.keys(people).filter(function (u) { return people[u].fake || /^fake_/.test(u); });
    if (!fakes.length) { alert("مفيش بيانات بروفة."); return; }
    if (!confirm("نمسح " + ar(fakes.length) + " مشارك وهمي وإجاباتهم؟")) return;
    var batch = MZ.db.batch();
    fakes.slice(0, 240).forEach(function (u) { batch.delete(MZ.pRef(SID, u)); batch.delete(MZ.vRef(SID, u)); });
    var g2 = Object.assign({}, S.groups || {}); fakes.forEach(function (u) { delete g2[u]; });
    batch.commit().then(function () { push({ groups: g2, hidden: {} }); alert("اتمسحت ✓"); }).catch(function (e) { alert(MZ.errText(e)); });
  }
})();
