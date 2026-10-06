/* =====================================================================
   console.js — لوحة التحكم
   ---------------------------------------------------------------------
   «التالي» بيمشي اليوم كله. كل حركة بتتكتب في مستند الجلسة (للموبايلات
   وشاشة العرض)، وفي نفس اللحظة بتتبعت مباشرة لشاشة العرض على نفس الجهاز.
   فلو السيرفر وقع، اللابتوب لوحده كفاية يكمّل اليوم.
   ===================================================================== */
(function () {
  "use strict";
  var SID = MZ.sid(), esc = MZ.esc, ar = MZ.ar;
  var root = document.getElementById("root");
  var bus = MZ.localBus(SID);
  var LKEY = "mz:" + SID + ":console";
  var S = MZ.store.getJ(LKEY, null) || { state: MZ_STATES[0].id, step: 0, rev: 0 };
  var user = null, remoteOk = false, localOnly = false, lastErr = null;
  var people = {}, votes = {}, agg = {};
  var unsubs = [];
  var knownHelp = {};

  /* ───────────── الدخول ───────────── */
  function loginView(msg) {
    root.innerHTML = '<div class="login"><div class="eyebrow">الميزان · لوحة التحكم</div><h2 style="margin:0 0 12px">ادخل بإيميل الأدمن</h2>' +
      '<label>الإيميل<input id="em" type="email" autocomplete="username" value="' + esc(MZ.store.get("mz:adminEmail") || MZ_ADMINS[0] || "") + '"></label>' +
      '<label>كلمة السر<input id="pw" type="password" autocomplete="current-password"></label>' +
      '<button class="b dark" id="go" style="width:100%;padding:12px">دخول</button><div class="err" id="er">' + esc(msg || "") + "</div>" +
      '<hr style="border:none;border-top:1px solid var(--line);margin:18px 0">' +
      '<p class="meta">النت واقع أو الدخول مش راضي؟ تقدر تشغّل اليوم من اللابتوب ده بس: شاشة العرض لازم تبقى مفتوحة على نفس الجهاز ونفس المتصفح. الموبايلات ساعتها هتمشي «مع الشاشة» برقمها.</p>' +
      '<button class="b" id="loc" style="width:100%;padding:10px">تشغيل محلي من غير سيرفر</button>' +
      '<p class="meta" style="margin-top:14px">الجلسة: <b>' + esc(SID) + '</b> · <a href="../check/?s=' + encodeURIComponent(SID) + '">صفحة الفحص</a></p></div>';
    document.getElementById("go").onclick = doLogin;
    document.getElementById("pw").onkeydown = function (e) { if (e.key === "Enter") doLogin(); };
    document.getElementById("loc").onclick = function () { localOnly = true; app(); };
  }
  function doLogin() {
    var em = document.getElementById("em").value.trim().toLowerCase(), pw = document.getElementById("pw").value, er = document.getElementById("er");
    if (!MZ.hasFb()) { er.textContent = MZ.errText({ code: "mz/no-sdk" }); return; }
    if (MZ_ADMINS.indexOf(em) === -1) { er.textContent = MZ.errText({ code: "mz/not-admin" }); return; }
    er.textContent = "بندخل…";
    MZ.store.set("mz:adminEmail", em);
    MZ.auth.signInWithEmailAndPassword(em, pw).catch(function (e) { er.textContent = MZ.errText(e); });
  }

  if (MZ.hasFb()) {
    MZ.auth.onAuthStateChanged(function (u) {
      if (u && MZ.isAdmin(u)) { user = u; localOnly = false; app(); }
      else if (u && !u.isAnonymous) { MZ.auth.signOut(); loginView(MZ.errText({ code: "mz/not-admin" })); }
      else if (!localOnly) loginView();
    }, function (e) { loginView(MZ.errText(e)); });
  } else loginView(MZ.errText({ code: "mz/no-sdk" }));

  /* ───────────── الكتابة ───────────── */
  function push(patch) {
    Object.keys(patch).forEach(function (k) { S[k] = patch[k]; });
    S.rev = Date.now(); patch.rev = S.rev;
    MZ.store.setJ(LKEY, S);
    bus.send({ S: S });
    if (user && MZ.db) {
      MZ.sRef(SID).set(patch, { mergeFields: Object.keys(patch) })
        .then(function () { remoteOk = true; lastErr = null; head(); })
        .catch(function (e) { remoteOk = false; lastErr = e; head(); });
    }
    paint();
  }
  function go(id, step) {
    var now = Date.now();
    var patch = { step: step || 0, stepAt: now };
    if (id !== S.state) { patch.state = id; patch.stateAt = now; }
    push(patch);
  }
  function next() {
    var st = mzState(S.state), n = mzSteps(st).steps.length;
    if ((S.step || 0) < n - 1) return go(S.state, (S.step || 0) + 1);
    var i = mzIndex(S.state); if (i < MZ_STATES.length - 1) go(MZ_STATES[i + 1].id, 0);
  }
  function prev() {
    if ((S.step || 0) > 0) return go(S.state, S.step - 1);
    var i = mzIndex(S.state); if (i > 0) { var p = MZ_STATES[i - 1]; go(p.id, mzSteps(p).steps.length - 1); }
  }

  /* ───────────── الاشتراكات ───────────── */
  function listen() {
    unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = [];
    if (!user || !MZ.db) return;
    unsubs.push(MZ.watchDoc(MZ.sRef(SID), function (d, server) {
      if (server) remoteOk = true;
      if (!d) {  /* أول مرة: نعمل مستند الجلسة من الحالة المحلية */
        push({ state: S.state, step: S.step || 0, stateAt: Date.now(), stepAt: Date.now(), support: S.support || MZ_SETTINGS.supportName, createdBy: user.email });
        return;
      }
      if ((d.rev || 0) >= (S.rev || 0)) { S = d; MZ.store.setJ(LKEY, S); bus.send({ S: S }); paint(); }
      head();
    }, function (e) { remoteOk = false; lastErr = e; head(); }));
    unsubs.push(MZ.pCol(SID).onSnapshot(function (q) {
      people = {}; q.forEach(function (d) { var x = d.data(); if (x && x.n) people[d.id] = x; });   // صفحة الفحص بتكتب مستند من غير اسم وبتمسحه
      checkHelp(); recompute(); paint();
    }, function (e) { lastErr = e; head(); }));
    unsubs.push(MZ.vCol(SID).onSnapshot(function (q) {
      votes = {}; q.forEach(function (d) { votes[d.id] = d.data(); });
      recompute(); paintTab();
    }, function (e) { lastErr = e; head(); }));
  }

  /* الأعداد المجمّعة: بتتحسب هنا وبتتكتب في مستند عام فيه أرقام بس */
  var aggTimer = null;
  function recompute() {
    var counts = {};
    Object.keys(votes).forEach(function (u) {
      var v = votes[u];
      MZ_AGG_KEYS.forEach(function (k) {
        if (v[k] === undefined || v[k] === null || v[k] === "") return;
        counts[k] = counts[k] || {}; counts[k][v[k]] = (counts[k][v[k]] || 0) + 1;
      });
    });
    agg = { counts: counts, n: Object.keys(people).length };
    bus.send({ agg: agg });
    clearTimeout(aggTimer);
    aggTimer = setTimeout(function () {
      if (user && MZ.db) MZ.aggRef(SID).set({ counts: agg.counts, n: agg.n, at: Date.now() }).catch(function (e) { lastErr = e; head(); });
    }, 1200);
  }

  /* «محتاج حد يكلمني» */
  function beep() {
    try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 660; o.connect(g); g.connect(c.destination); g.gain.value = .15; o.start(); setTimeout(function () { o.stop(); c.close(); }, 350); } catch (e) {}
  }
  function checkHelp() {
    var fresh = false;
    Object.keys(people).forEach(function (u) { var h = people[u].help; if (h && !knownHelp[u]) fresh = true; knownHelp[u] = h || null; });
    if (fresh) beep();
  }
  function clearHelp(u) { if (user) MZ.pRef(SID, u).set({ help: null }, { merge: true }); }

  /* ───────────── الواجهة ───────────── */
  var tabNow = "people";
  function app() {
    root.innerHTML =
      '<div class="wrap"><aside><div style="padding:14px"><div class="eyebrow">الميزان</div><b>' + esc(SID) + '</b></div><div class="tl" id="tl"></div></aside>' +
      '<main><div class="help-alert" id="ha"></div><div class="hdr" id="hdr"></div>' +
      '<div class="grid"><div class="panel"><div class="eyebrow" id="cses"></div><div class="cur-label" id="clab"></div>' +
        '<div class="meta" id="cmeta"></div><div class="cue" id="ccue"></div>' +
        '<div class="nav"><button class="prev" id="bprev">→ السابق</button><button class="next" id="bnext">التالي ←</button></div>' +
        '<div class="tools"><button id="bblack">شاشة سودا</button><button id="btimer">ابدأ العداد من جديد</button><button id="btheme">شاشة فاتحة/غامقة</button>' +
        '<a class="b" target="_blank" id="lstage">افتح شاشة العرض ↗</a><a class="b" target="_blank" id="llive">افتح صفحة المشارك ↗</a></div>' +
        '<div class="next-peek" id="cnext"></div></div>' +
      '<div class="panel"><div class="pv" id="pv"><iframe id="pvf" title="معاينة"></iframe></div><div class="meta">معاينة شاشة العرض · الرقم في الركن هو اللي الموبايلات بتمشي بيه لو النت وقع</div></div></div>' +
      '<div class="tabs" id="tabs"><button data-t="people">الناس والحلقات</button><button data-t="nums">الأرقام</button><button data-t="set">الإعدادات والبروفة</button></div>' +
      '<div class="panel tab" id="t-people"></div><div class="panel tab" id="t-nums"></div><div class="panel tab" id="t-set"></div></main></div>';
    var base = location.href.split("?")[0].replace(/\/console\/(index\.html)?$/, "/");
    document.getElementById("lstage").href = base + "stage/?s=" + encodeURIComponent(SID);
    document.getElementById("llive").href = base + "live/?s=" + encodeURIComponent(SID);
    document.getElementById("pvf").src = base + "stage/?s=" + encodeURIComponent(SID);
    document.getElementById("bnext").onclick = next;
    document.getElementById("bprev").onclick = prev;
    document.getElementById("bblack").onclick = function () { push({ black: !S.black }); };
    document.getElementById("btimer").onclick = function () { push({ stepAt: Date.now() }); };
    document.getElementById("btheme").onclick = function () { push({ theme: S.theme === "light" ? "dark" : "light" }); };
    document.getElementById("tabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; tabNow = b.dataset.t; paintTab(); };
    document.getElementById("tl").onclick = function (e) { var b = e.target.closest("button[data-id]"); if (!b) return;
      if (confirm("تروح لـ«" + mzState(b.dataset.id).label + "»؟")) go(b.dataset.id, 0); };
    window.addEventListener("resize", scalePv); scalePv();
    if (!window._mzKeys) { window._mzKeys = 1;
      document.addEventListener("keydown", function (e) {
        if (/input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === "ArrowLeft" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
        if (e.key === "ArrowRight" || e.key === "PageUp") { e.preventDefault(); prev(); }
        if (e.key === "b" || e.key === "B" || e.key === "لا") push({ black: !S.black });
      }); }
    bus.send({ S: S });
    listen(); recompute(); paint(); head();
    setInterval(head, 5000);
  }
  function scalePv() {
    var pv = document.getElementById("pv"), f = document.getElementById("pvf"); if (!pv || !f) return;
    f.style.transform = "scale(" + (pv.clientWidth / 1600) + ")";
  }

  function head() {
    var h = document.getElementById("hdr"); if (!h) return;
    var n = Object.keys(people).length, fake = Object.keys(people).filter(function (u) { return people[u].fake; }).length;
    var conn = localOnly ? '<span class="pill warn">تشغيل محلي · من غير سيرفر</span>'
      : remoteOk && !lastErr ? '<span class="pill ok">متصل بالسيرفر</span>'
      : '<span class="pill bad">' + esc(lastErr ? MZ.errText(lastErr) : "بنوصل للسيرفر…") + "</span>";
    h.innerHTML = '<span class="t">لوحة التحكم</span>' + conn +
      '<span class="pill">الحاضرين: ' + ar(n - fake) + (fake ? " (+" + ar(fake) + " بروفة)" : "") + "</span>" +
      (user ? '<span class="pill">' + esc(user.email) + '</span><button class="b" id="out">خروج</button>' : "");
    var o = document.getElementById("out"); if (o) o.onclick = function () { MZ.auth.signOut(); };
  }

  function paint() {
    if (!document.getElementById("tl")) return;
    var cur = mzIndex(S.state), st = mzState(S.state), steps = mzSteps(st).steps.length;
    /* الخط الزمني */
    var html = "", lastSes = null;
    MZ_STATES.forEach(function (x, i) {
      if (x.ses !== lastSes) { html += "<h4>" + esc(MZ_SESSIONS[x.ses]) + "</h4>"; lastSes = x.ses; }
      html += '<button data-id="' + x.id + '" class="' + (i === cur ? "cur" : i < cur ? "done" : "") + '"><span class="n">' + ar(i + 1) + "</span><span>" + esc(x.label) + "</span></button>";
    });
    var tl = document.getElementById("tl"); tl.innerHTML = html;
    var c = tl.querySelector(".cur"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "nearest" });
    document.getElementById("cses").textContent = MZ_SESSIONS[st.ses] + " · شاشة " + ar(cur + 1) + " من " + ar(MZ_STATES.length);
    document.getElementById("clab").textContent = st.label;
    var ph = st.phone || { t: "listen" };
    var at = st.phoneAt === undefined ? 0 : Math.min(st.phoneAt, steps - 1);
    document.getElementById("cmeta").textContent = "الخطوة " + ar((S.step || 0) + 1) + " من " + ar(steps) +
      " · الموبايل: " + phoneLabel(ph) + ((S.step || 0) < at ? " (هيظهر في الخطوة " + ar(at + 1) + ")" : "");
    var cue = document.getElementById("ccue"); cue.textContent = st.cue || "—";
    var nx = MZ_STATES[cur + 1];
    document.getElementById("cnext").textContent = (S.step || 0) < steps - 1 ? "«التالي» يكشف الخطوة الجاية في نفس الشاشة." : (nx ? "بعدها: " + nx.label : "دي آخر شاشة.");
    document.getElementById("bblack").classList.toggle("on", !!S.black);
    var needCircles = ["g1-circles", "g1-circle-talk"].indexOf(st.id) >= 0 && !(S.groups && Object.keys(S.groups).length);
    var needPairs = st.id === "g6-rafiq" && !(S.pairs && Object.keys(S.pairs).length);
    if (needCircles) cue.textContent = "⚑ الحلقات لسه ما اتوزعتش! تبويب «الناس والحلقات» ← «وزّع الحلقات». · " + cue.textContent;
    if (needPairs) cue.textContent = "⚑ الرفقة لسه ما اتعملتش! تبويب «الناس والحلقات» ← «اعمل الرفقة». · " + cue.textContent;
    paintHelp(); paintTab();
  }
  function phoneLabel(ph) {
    return ({ listen: "اسمع", vote: "تصويت", slider: "سلايدر خاص", cycle: "الدايرة", note: "دفتري", map: "خريطة الدايرة", hours: "كام ساعة", circle: "الحلقة", rank: "ترتيب",
      mizani: "صفحة ميزاني", commit: "التزاماتي", rafiq: "رفيقي", feedback: "تقييم", after: "بعد اليوم", break: "استراحة", agree: "اتفاقنا", sitresult: "اختياراتك",
      chars: "الشخصيات", axtable: "جدول المحاور", axtitle: "سؤال المحور", qasiya: "القاصية" })[ph.t] || ph.t;
  }

  function circleOf(u) { return (S.groups || {})[u] || ""; }
  function paintHelp() {
    var el = document.getElementById("ha"); if (!el) return;
    var hs = Object.keys(people).filter(function (u) { return people[u].help; });
    el.classList.toggle("on", hs.length > 0);
    el.innerHTML = hs.length ? '<b>محتاج حد يكلمه:</b>' + hs.map(function (u) {
      return '<div class="r"><span>' + esc(people[u].n || "…") + (circleOf(u) ? " · حلقة " + ar(circleOf(u)) : "") + '</span><button data-help="' + u + '">اتكلّمنا ✓</button></div>'; }).join("") : "";
    el.onclick = function (e) { var b = e.target.closest("[data-help]"); if (b) clearHelp(b.dataset.help); };
  }

  /* ───────────── التبويبات ───────────── */
  function paintTab() {
    var tabs = document.getElementById("tabs"); if (!tabs) return;
    [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.t === tabNow); });
    ["people", "nums", "set"].forEach(function (t) { document.getElementById("t-" + t).classList.toggle("on", t === tabNow); });
    if (tabNow === "people") paintPeople();
    if (tabNow === "nums") paintNums();
    if (tabNow === "set") paintSet();
  }

  function plist() { return Object.keys(people).map(function (u) { var p = people[u]; return { u: u, n: p.n || "…", ten: p.ten || "", g: p.g || "", fake: !!p.fake, seen: p.seen }; }); }
  function rosterOf() { var r = {}; plist().forEach(function (p) { r[p.u] = p.n; }); return r; }

  function paintPeople() {
    var el = document.getElementById("t-people"); if (!el) return;
    if (el.contains(document.activeElement) && document.activeElement.tagName === "SELECT") return;   // ما نقطعش اختيار شغال
    var L = plist(), G = S.groups || {}, Pr = S.pairs || {};
    var maxC = 0; Object.keys(G).forEach(function (u) { maxC = Math.max(maxC, G[u]); });
    var unplaced = L.filter(function (p) { return !G[p.u]; });
    var h = '<div class="ctr"><button class="b dark" id="mkc">وزّع الحلقات' + (Object.keys(G).length ? " من جديد" : "") + "</button>" +
      (unplaced.length && Object.keys(G).length ? '<button class="b dark" id="late">حط اللي من غير حلقة (' + ar(unplaced.length) + ")</button>" : "") +
      '<button class="b" id="mkp">اعمل الرفقة' + (Object.keys(Pr).length ? " من جديد" : "") + '</button><span class="meta">حجم الحلقة: ' + ar(MZ_SETTINGS.circleSize) +
      (MZ_SETTINGS.separateGender ? " · فصل ولاد وبنات" : "") + "</span></div>";
    /* كروت الحلقات */
    if (Object.keys(G).length) {
      var by = {}; L.forEach(function (p) { if (G[p.u]) (by[G[p.u]] = by[G[p.u]] || []).push(p); });
      h += '<div class="sec">' + Object.keys(by).sort(function (a, b) { return a - b; }).map(function (k) {
        return '<div class="circ-card"><b>' + ar(k) + "</b> · " + ar(by[k].length) + "<div>" + by[k].map(function (p) { return esc(p.n) + (p.ten === "new" ? " ✦" : ""); }).join("، ") + "</div></div>"; }).join("") + '</div><div class="meta">✦ = جديد (أقل من ٣ شهور)</div>';
    }
    h += '<table><tr><th>الاسم</th><th>المدة</th><th>الحلقة</th><th>الرفيق</th><th></th></tr>' + L.sort(function (a, b) { return (G[a.u] || 99) - (G[b.u] || 99) || a.n.localeCompare(b.n, "ar"); }).map(function (p) {
      var opts = '<option value="">—</option>'; for (var i = 1; i <= maxC + 1; i++) opts += '<option value="' + i + '"' + (G[p.u] === i ? " selected" : "") + ">" + ar(i) + "</option>";
      var mates = L.filter(function (q) { return q.u !== p.u && G[q.u] && G[q.u] === G[p.u]; });
      var popts = '<option value="">—</option>' + mates.map(function (q) { return '<option value="' + q.u + '"' + ((Pr[p.u] || [])[0] === q.u ? " selected" : "") + ">" + esc(q.n) + "</option>"; }).join("");
      return "<tr><td>" + esc(p.n) + (p.fake ? ' <span class="meta">(بروفة)</span>' : "") + (people[p.u].help ? " 🔴" : "") + "</td><td>" + (p.ten === "new" ? "جديد" : p.ten === "old" ? "قديم" : "—") + (p.g ? " · " + (p.g === "m" ? "ولد" : "بنت") : "") +
        '</td><td><select data-circ="' + p.u + '">' + opts + '</select></td><td><select data-pair="' + p.u + '">' + popts + "</select>" + ((Pr[p.u] || []).length > 1 ? ' <span class="meta">+' + ar(Pr[p.u].length - 1) + "</span>" : "") +
        '</td><td><button class="b red" data-del="' + p.u + '">شيل</button></td></tr>';
    }).join("") + "</table>";
    if (!L.length) h += '<p class="meta">لسه محدش دخل. الموبايلات بتظهر هنا أول ما حد يكتب اسمه.</p>';
    el.innerHTML = h;
    var mk = document.getElementById("mkc");
    mk.onclick = function () {
      if (!L.length) return alert("لسه محدش دخل.");
      if (Object.keys(G).length && !confirm("هتوزّع الحلقات كلها من جديد. متأكد؟")) return;
      push({ groups: MZ.makeCircles(L, MZ_SETTINGS.circleSize, MZ_SETTINGS.separateGender), roster: rosterOf() });
    };
    var lt = document.getElementById("late");
    if (lt) lt.onclick = function () {
      var g2 = Object.assign({}, G);
      unplaced.forEach(function (p) { g2[p.u] = MZ.placeLate(p, g2, L, MZ_SETTINGS.separateGender); });
      push({ groups: g2, roster: rosterOf() });
    };
    document.getElementById("mkp").onclick = function () {
      if (!Object.keys(G).length) return alert("وزّع الحلقات الأول.");
      if (Object.keys(Pr).length && !confirm("هتعمل الرفقة كلها من جديد. متأكد؟")) return;
      push({ pairs: MZ.makePairs(G, L, MZ_SETTINGS.separateGender), roster: rosterOf() });
    };
    el.onchange = function (e) {
      var c = e.target.closest("[data-circ]"), pp = e.target.closest("[data-pair]");
      if (c) { var g2 = Object.assign({}, G); if (c.value) g2[c.dataset.circ] = +c.value; else delete g2[c.dataset.circ]; push({ groups: g2, roster: rosterOf() }); }
      if (pp) setPair(pp.dataset.pair, pp.value);
    };
    el.onclick = function (e) {
      var d = e.target.closest("[data-del]"); if (!d) return;
      var u = d.dataset.del; if (!confirm("تشيل «" + (people[u].n || "") + "» من الجلسة؟")) return;
      removePerson(u);
    };
  }
  function setPair(a, b) {
    var P = JSON.parse(JSON.stringify(S.pairs || {}));
    function detach(x) { (P[x] || []).forEach(function (y) { P[y] = (P[y] || []).filter(function (z) { return z !== x; }); if (!P[y].length) delete P[y]; }); delete P[x]; }
    var oldA = (P[a] || []).slice(), oldB = b ? (P[b] || []).slice() : [];
    detach(a); if (b) detach(b);
    if (b) { P[a] = [b]; P[b] = [a]; }
    /* اللي اتسابوا لوحدهم: نقرنهم ببعض */
    var lone = oldA.concat(oldB).filter(function (x) { return x !== a && x !== b && !(P[x] && P[x].length); });
    while (lone.length >= 2) { var x = lone.shift(), y = lone.shift(); P[x] = [y]; P[y] = [x]; }
    push({ pairs: P, roster: rosterOf() });
  }
  function removePerson(u) {
    var g2 = Object.assign({}, S.groups || {}); delete g2[u];
    var P = JSON.parse(JSON.stringify(S.pairs || {})); (P[u] || []).forEach(function (y) { P[y] = (P[y] || []).filter(function (z) { return z !== u; }); if (!P[y].length) delete P[y]; }); delete P[u];
    var r = rosterOf(); delete r[u];
    push({ groups: g2, pairs: P, roster: r });
    if (user) { MZ.pRef(SID, u).delete().catch(function (e) { alert(MZ.errText(e)); }); MZ.vRef(SID, u).delete().catch(function () {}); }
  }

  function paintNums() {
    var el = document.getElementById("t-nums"); if (!el) return;
    var C = agg.counts || {};
    function block(title, key, labels) {
      var c = C[key] || {}, keys = Object.keys(labels), tot = keys.reduce(function (a, k) { return a + (c[k] || 0); }, 0), max = Math.max(1, Math.max.apply(null, keys.map(function (k) { return c[k] || 0; })));
      return '<div class="sec"><b>' + esc(title) + '</b> <span class="meta">(' + ar(tot) + ')</span><div class="bars">' + keys.map(function (k) {
        return "<div><span>" + esc(labels[k]) + '</span><span><i style="width:' + (100 * (c[k] || 0) / max) + '%"></i></span><span>' + ar(c[k] || 0) + "</span></div>"; }).join("") + "</div></div>";
    }
    var ax = { H: "أنا كويس؟", V: "أنا عايش؟", B: "ليّا مكان؟" };
    function cyc(a) { var o = {}; MZ_CYCLES[a].st.forEach(function (s, i) { o[i + 1] = ar(i + 1) + ". " + s; }); o.no = "مش شبهي"; return o; }
    var h = '<p class="meta">كل الأرقام هنا من غير أسماء. ودي اللي بتطلع في التقرير.</p>' +
      block("المحور الأول (من صفحات ميزاني)", "mzFirst", ax) + block("المحور المكبوت", "mzHidden", ax) +
      block("الأركان", "corner", { H: "أنا كويس؟", V: "أنا عايش؟", B: "ليّا مكان؟", M: "في النص" }) +
      block("دايرة الذوبان والتجمد", "cyB", cyc("B")) + block("دايرة الاشتعال والرماد", "cyV", cyc("V")) + block("دايرة الضغط والانفجار", "cyH", cyc("H")) +
      block("النوم", "sleep", { a: "أقل من ٥", b: "٥–٦", c: "٧–٨", d: "أكتر من ٨" }) + block("الفطار", "ate", { a: "فطر", b: "حاجة خفيفة", c: "لأ" });
    var hc = C.hours || {}, hs = [], sum = 0, cnt = 0; Object.keys(hc).forEach(function (v) { sum += +v * hc[v]; cnt += hc[v]; });
    h += '<div class="sec"><b>ساعات الحياة في الأسبوع</b> · المتوسط: ' + (cnt ? ar((sum / cnt).toFixed(1)) : "—") + " من " + ar(cnt) + "</div>";
    el.innerHTML = h;
  }

  function paintSet() {
    var el = document.getElementById("t-set"); if (!el) return;
    if (el.contains(document.activeElement) && /input|textarea/i.test(document.activeElement.tagName)) return;
    el.innerHTML =
      '<div class="sec"><b>شخص الدعم</b> <span class="meta">(اسمه بيظهر للي يدوس «محتاج حد يكلمني»)</span><div class="ctr"><input class="s" id="sup" value="' + esc(S.support || MZ_SETTINGS.supportName) + '"><button class="b" id="supS">احفظ</button></div></div>' +
      '<div class="sec"><b>رسالة الاستراحة</b> <span class="meta">(بتظهر على الشاشة والموبايلات وقت الاستراحة)</span><div class="ctr"><input class="s" id="brk" style="min-width:280px" placeholder="نرجع الساعة ١:١٠" value="' + esc(S.breakMsg || "") + '"><button class="b" id="brkS">احفظ</button></div></div>' +
      '<div class="sec"><b>صفحة الميسّر في «نقرا صفحتي سوا»</b> <span class="meta">الافتراضي: صفحة نموذجية. أو الصق كود صفحتك من موبايلك (صفحة الفحص بتطلّعه).</span><div class="ctr"><input class="s" id="demo" style="min-width:280px" placeholder="الصق هنا…"><button class="b" id="demoS">استعمل صفحتي</button><button class="b" id="demoR">رجّع النموذجية</button></div></div>' +
      '<hr style="border:none;border-top:1px solid var(--line)">' +
      '<div class="sec"><b>البروفة</b><div class="ctr"><input class="s" id="fn" type="number" min="2" max="80" value="36" style="width:70px"><button class="b dark" id="fake">ولّد مشاركين وهميين</button><button class="b red" id="unfake">امسح بيانات البروفة</button></div>' +
      '<p class="meta">الوهميين بيجاوبوا عشوائي على كل التصويتات، فتشوف الأعمدة والحلقات والرفقة شغالة. وامسحهم قبل اليوم.</p></div>' +
      '<div class="sec"><b>بعد اليوم</b><div class="ctr"><button class="b" id="rep">حمّل التقرير المجمّع (من غير أسماء)</button><button class="b" id="att">حمّل كشف الحضور والحلقات</button></div></div>' +
      '<hr style="border:none;border-top:1px solid var(--line)">' +
      '<div class="sec"><b>البداية من جديد</b><div class="ctr"><button class="b" id="rst">رجّع الشاشات لأول اليوم</button><button class="b red" id="wipe">امسح كل بيانات الجلسة</button></div>' +
      '<p class="meta">لكل يوم أو محافظة جلسة لوحدها: غيّر <code>?s=</code> في الروابط (مثلًا <code>?s=mizan-sohag-1</code>).</p></div>';
    document.getElementById("supS").onclick = function () { push({ support: document.getElementById("sup").value.trim() || MZ_SETTINGS.supportName }); };
    document.getElementById("brkS").onclick = function () { push({ breakMsg: document.getElementById("brk").value.trim() }); };
    document.getElementById("demoS").onclick = function () {
      try { var d = JSON.parse(decodeURIComponent(escape(atob(document.getElementById("demo").value.trim())))); push({ demo: d }); alert("تمام ✓"); }
      catch (e) { alert("الكود ده مش سليم. انسخه تاني من صفحة الفحص على موبايلك."); }
    };
    document.getElementById("demoR").onclick = function () { push({ demo: null }); };
    document.getElementById("fake").onclick = makeFakes;
    document.getElementById("unfake").onclick = clearFakes;
    document.getElementById("rep").onclick = report;
    document.getElementById("att").onclick = attendance;
    document.getElementById("rst").onclick = function () { if (confirm("ترجع لأول شاشة؟")) go(MZ_STATES[0].id, 0); };
    document.getElementById("wipe").onclick = wipe;
  }

  /* ───────────── البروفة ───────────── */
  var NAMES = ["أحمد", "منة", "يوسف", "سلمى", "عمر", "نور", "مريم", "كريم", "هاجر", "زياد", "رنا", "محمد", "آية", "خالد", "فرح", "مصطفى", "ملك", "عبدالله", "شهد", "حسن", "دينا", "طه", "روان", "إسلام", "ندى", "بلال", "سارة", "معاذ", "جنى", "أنس"];
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function makeFakes() {
    if (!user) return alert("البروفة محتاجة دخول الأدمن (عشان بتكتب في السيرفر).");
    var n = Math.max(2, Math.min(80, +document.getElementById("fn").value || 36));
    var batch = MZ.db.batch();
    for (var i = 0; i < n; i++) {
      var u = "fake-" + Math.random().toString(36).slice(2, 9);
      batch.set(MZ.pRef(SID, u), { n: rnd(NAMES) + " " + MZ.ar(i + 1), ten: Math.random() < .35 ? "new" : "old", g: rnd(["m", "f"]), fake: true, at: Date.now() });
      batch.set(MZ.vRef(SID, u), { sit1: rnd(["H", "V", "B", "B"]), sit2: rnd(["H", "V", "B", "B"]), sit3: rnd(["H", "V", "B"]), corner: rnd(["H", "V", "B", "B", "M"]),
        ignored: rnd(["a", "a", "b", "c"]), cyB: rnd([1, 1, 2, 3, 3, 4, 5, 6, "no"]), crowd: rnd(["V", "B"]), cyV: rnd([1, 2, 3, 4, 5, 6, "no"]), hours: Math.floor(Math.random() * 25),
        sleep: rnd(["a", "b", "b", "c", "d"]), ate: rnd(["a", "b", "c"]), cyH: rnd([1, 2, 2, 3, 4, 5, 6, "no"]), mzFirst: rnd(["H", "V", "B", "B"]), mzHidden: rnd(["H", "H", "V", "B"]), fake: true });
    }
    batch.commit().then(function () { alert("اتولّد " + ar(n) + " ✓"); }).catch(function (e) { alert(MZ.errText(e)); });
  }
  function clearFakes() {
    if (!user) return;
    var fakes = Object.keys(people).filter(function (u) { return people[u].fake; });
    if (!fakes.length) return alert("مفيش بيانات بروفة.");
    if (!confirm("تمسح " + ar(fakes.length) + " مشارك وهمي؟")) return;
    var batch = MZ.db.batch();
    fakes.forEach(function (u) { batch.delete(MZ.pRef(SID, u)); batch.delete(MZ.vRef(SID, u)); });
    var g2 = Object.assign({}, S.groups || {}), P = JSON.parse(JSON.stringify(S.pairs || {})), r = rosterOf();
    fakes.forEach(function (u) { delete g2[u]; delete P[u]; delete r[u]; });
    Object.keys(P).forEach(function (u) { P[u] = P[u].filter(function (x) { return fakes.indexOf(x) < 0; }); if (!P[u].length) delete P[u]; });
    batch.commit().then(function () { push({ groups: g2, pairs: P, roster: r }); alert("اتمسحت ✓"); }).catch(function (e) { alert(MZ.errText(e)); });
  }
  function wipe() {
    if (!user) return;
    var t = prompt("ده هيمسح كل الناس والإجابات في الجلسة «" + SID + "». اكتب اسم الجلسة عشان تأكد:");
    if (t !== SID) return;
    var batch = MZ.db.batch();
    Object.keys(people).forEach(function (u) { batch.delete(MZ.pRef(SID, u)); });
    Object.keys(votes).forEach(function (u) { batch.delete(MZ.vRef(SID, u)); });
    batch.commit().then(function () { push({ groups: {}, pairs: {}, roster: {}, state: MZ_STATES[0].id, step: 0, stateAt: Date.now(), stepAt: Date.now() }); alert("اتمسح ✓"); })
      .catch(function (e) { alert(MZ.errText(e)); });
  }

  /* ───────────── التصدير ───────────── */
  function download(name, text, type) {
    var b = new Blob(["﻿" + text], { type: type || "text/plain;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function report() {
    var C = agg.counts || {}, real = Object.keys(people).filter(function (u) { return !people[u].fake; });
    var L = ["تقرير يوم «الميزان» — " + SID, "التاريخ: " + new Date().toLocaleDateString("ar-EG"), "عدد الحاضرين: " + real.length, "",
      "⚑ كل الأرقام هنا مجمّعة ومن غير أسماء.", ""];
    function sec(t, key, labels) {
      var c = C[key] || {}, tot = 0; Object.keys(c).forEach(function (k) { tot += c[k]; });
      L.push("■ " + t + " (" + tot + ")");
      Object.keys(labels).forEach(function (k) { var n = c[k] || 0; L.push("   " + labels[k] + ": " + n + (tot ? " (" + Math.round(100 * n / tot) + "٪)" : "")); });
      L.push("");
    }
    var ax = { H: "الحفظ (أنا كويس؟)", V: "الحيوية (أنا عايش؟)", B: "الانتماء (ليّا مكان؟)" };
    function cyc(a) { var o = {}; MZ_CYCLES[a].st.forEach(function (s, i) { o[i + 1] = (i + 1) + ". " + s; }); o.no = "مش شبهي"; return o; }
    sec("المحور الأول", "mzFirst", ax); sec("المحور المكبوت", "mzHidden", ax);
    sec("دايرة الذوبان والتجمد", "cyB", cyc("B")); sec("دايرة الاشتعال والرماد", "cyV", cyc("V")); sec("دايرة الضغط والانفجار", "cyH", cyc("H"));
    sec("النوم ليلة اليوم", "sleep", { a: "أقل من ٥", b: "٥–٦", c: "٧–٨", d: "أكتر من ٨" }); sec("الفطار", "ate", { a: "فطر", b: "حاجة خفيفة", c: "لأ" });
    sec("اتجاهلت قبل كده وفضلت تفكر فيها", "ignored", { a: "حصل كتير", b: "مرة أو اتنين", c: "ما أفتكرش" });
    var hc = C.hours || {}, s = 0, n = 0; Object.keys(hc).forEach(function (v) { s += +v * hc[v]; n += hc[v]; });
    L.push("■ متوسط ساعات «الحياة في حياتك إنت» في الأسبوع: " + (n ? (s / n).toFixed(1) : "—") + " (" + n + ")", "");
    L.push("■ قراءة للمسؤولين:");
    var cB = C.cyB || {}, risk = (cB[3] || 0) + (cB[4] || 0) + (cB[5] || 0);
    L.push("   في مراحل الخطر في دايرة الانتماء (التراكم/الخيبة/التجمد): " + risk);
    var cV = C.cyV || {}; L.push("   في الاستنزاف/الخيبة/الرماد: " + ((cV[3] || 0) + (cV[4] || 0) + (cV[5] || 0)));
    var cH = C.cyH || {}; L.push("   في التراكم/القشة/الانفجار/الذنب: " + ((cH[2] || 0) + (cH[3] || 0) + (cH[4] || 0) + (cH[5] || 0)));
    L.push("", "■ كلام المشاركين (من غير أسماء):");
    Object.keys(votes).forEach(function (u) { var v = votes[u]; if (v.fake) return;
      if (v.fb1) L.push("   • لحظة فضلت معاه: " + String(v.fb1).replace(/\s+/g, " "));
      if (v.fb2) L.push("   • في جملة: " + String(v.fb2).replace(/\s+/g, " ")); });
    download("mizan-report-" + SID + ".txt", L.join("\n"));
  }
  function attendance() {
    var G = S.groups || {}, P = S.pairs || {}, r = rosterOf();
    var rows = [["الاسم", "المدة", "الحلقة", "الرفيق"]].concat(plist().filter(function (p) { return !p.fake; }).map(function (p) {
      return [p.n, p.ten === "new" ? "جديد" : "قديم", G[p.u] || "", (P[p.u] || []).map(function (x) { return r[x] || ""; }).join(" و")]; }));
    download("mizan-attendance-" + SID + ".csv", rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), "text/csv;charset=utf-8");
  }
})();
