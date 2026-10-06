/* =====================================================================
   script.js (صفحة) — سكريبت الميسّر
   ---------------------------------------------------------------------
   بتمشي مع اللوحة لوحدها: كل ما الشريحة تتغيّر، الكلام اللي تقوله يظهر هنا.
   ولو دخلت بإيميل الأدمن، تقدر تقلّب الشرايح من هنا (من الموبايل أو التابلت)
   من غير ما تقوم للابتوب.
   ===================================================================== */
(function () {
  "use strict";
  var SID = MZ.sid(), esc = MZ.esc, ar = MZ.ar;
  var bus = MZ.localBus(SID);
  var remote = null, local = null, admin = null, serverOk = false, lastErr = null;
  var tab = "now", browseId = null, people = {};
  var $ = function (id) { return document.getElementById(id); };
  var size = parseFloat(MZ.store.get("mz:scsize") || "1.12");
  $("body").style.setProperty("--sc-size", size + "rem");

  function S() {
    if (remote && local) return (local.rev || 0) > (remote.rev || 0) ? local : remote;
    return remote || local || { state: MZ_STATES[0].id, step: 0 };
  }

  /* ───────── الرسم ───────── */
  function draw() {
    var cur = S(), id = browseId || cur.state, st = mzState(id), idx = mzIndex(id);
    var steps = mzSteps(st).steps.length, step = browseId ? 0 : (cur.step || 0);
    $("ses").textContent = MZ_SESSIONS[st.ses] || "";
    $("no").textContent = "شاشة " + ar(idx + 1) + " من " + ar(MZ_STATES.length);
    $("lab").textContent = st.label;
    var ses = MZS.ses(st.ses);
    $("tExtra").hidden = !(ses && ses.extra && ses.extra.length);
    [].forEach.call($("tabs").querySelectorAll("[data-t]"), function (b) { b.classList.toggle("on", b.dataset.t === tab); });
    var h = "";
    if (tab === "now") {
      if (browseId) h += '<div class="cue" style="background:#fff3dc">إنت بتتصفّح شاشة تانية. الشرايح ما اتحركتش.</div>';
      h += '<div class="stepbar">' + (browseId ? "" : "الخطوة " + ar(step + 1) + " من " + ar(steps) + " ") +
        Array.apply(null, Array(steps)).map(function (_, i) { return '<i class="' + (!browseId && i <= step ? "on" : "") + '"></i>'; }).join("") + "</div>";
      if (st.cue) h += '<div class="cue">' + esc(st.cue) + "</div>";
      var lines = MZS.state(id);
      if (lines.length) h += MZS.lines(lines);
      else if (id !== MZ_STATES[0].id) h += '<p class="sc-empty">مفيش كلام في الشاشة دي. (استراحة)</p>';
      if (id === MZ_STATES[0].id) h += '<div class="sc-h">قبل ج١</div>' + MZS.lines((MZS.ses(1) || {}).head || []);
      var nx = MZ_STATES[idx + 1];
      if (nx) {
        var pk = MZS.peek(nx.id, 2);
        h += '<div class="next">اللي جاي: <b>' + esc(nx.label) + "</b>" + (pk.length ? "<br>«" + esc(pk.join(" ").replace(/^«/, "").slice(0, 160)) + "…»" : "") + "</div>";
      }
    } else {
      var part = ses && ses[tab];
      h += part && part.length ? MZS.lines(part) : '<p class="sc-empty">مفيش حاجة هنا للجلسة دي.</p>';
    }
    $("body").innerHTML = h;
    if (draw._last !== id + "|" + tab) { window.scrollTo(0, 0); draw._last = id + "|" + tab; }
    drawCtl();
  }

  function drawCtl() {
    var cur = S();
    var c = $("ctl");
    if (admin) {
      c.innerHTML = '<button class="pv" id="bp">→ السابق</button><button class="nx" id="bn">التالي ←</button><button class="bk' + (cur.black ? " on" : "") + '" id="bb">سودا</button>';
      $("bp").onclick = prev; $("bn").onclick = next; $("bb").onclick = function () { push({ black: !S().black }); };
      $("cmeta").textContent = "إنت ماسك الشرايح من هنا · " + admin.email + " · ";
      var o = document.createElement("a"); o.href = "#"; o.textContent = "خروج"; o.onclick = function (e) { e.preventDefault(); MZ.auth.signOut(); };
      $("cmeta").appendChild(o);
    } else {
      c.innerHTML = '<button class="ghost" id="lg">دخول للتحكم في الشرايح من هنا</button>';
      $("lg").onclick = function () { if (!MZ.hasFb()) return alert(MZ.errText({ code: "mz/no-sdk" })); $("sheet").classList.add("on"); };
      $("cmeta").textContent = "الصفحة دي بتمشي مع لوحة التحكم لوحدها.";
    }
    $("brw").innerHTML = browseId
      ? '<button id="bw0">رجوع للشاشة الحالية</button>'
      : '<button id="bwp">‹ اقرا اللي فات</button><button id="bwn">اقرا اللي جاي ›</button>';
    if (browseId) $("bw0").onclick = function () { browseId = null; draw(); };
    else {
      $("bwp").onclick = function () { browse(-1); };
      $("bwn").onclick = function () { browse(1); };
    }
  }
  function browse(d) {
    var i = mzIndex(browseId || S().state) + d;
    if (i < 0 || i >= MZ_STATES.length) return;
    browseId = MZ_STATES[i].id; if (browseId === S().state) browseId = null;
    tab = "now"; draw();
  }

  /* ───────── التحكم (للأدمن بس) ───────── */
  function push(patch) {
    var cur = JSON.parse(JSON.stringify(S()));
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    cur.rev = patch.rev = Date.now();
    local = cur; bus.send({ S: cur }); draw();
    MZ.sRef(SID).set(patch, { mergeFields: Object.keys(patch) })
      .then(function () { lastErr = null; conn(); })
      .catch(function (e) { lastErr = e; conn(); alert(MZ.errText(e)); });
  }
  function go(id, step) {
    var now = Date.now(), p = { step: step || 0, stepAt: now };
    if (id !== S().state) { p.state = id; p.stateAt = now; }
    browseId = null; push(p);
  }
  function next() {
    var c = S(), st = mzState(c.state), n = mzSteps(st).steps.length;
    if ((c.step || 0) < n - 1) return go(c.state, (c.step || 0) + 1);
    var i = mzIndex(c.state); if (i < MZ_STATES.length - 1) go(MZ_STATES[i + 1].id, 0);
  }
  function prev() {
    var c = S();
    if ((c.step || 0) > 0) return go(c.state, c.step - 1);
    var i = mzIndex(c.state); if (i > 0) { var p = MZ_STATES[i - 1]; go(p.id, mzSteps(p).steps.length - 1); }
  }
  document.addEventListener("keydown", function (e) {
    if (!admin || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
    if (e.key === "ArrowRight" || e.key === "PageUp") { e.preventDefault(); prev(); }
  });

  /* ───────── الحالة والاتصال ───────── */
  function conn() {
    var p = $("conn");
    if (browseId) { p.className = "pill brw"; p.textContent = "بتتصفّح"; return; }
    if (lastErr) { p.className = "pill off"; p.textContent = MZ.errText(lastErr).slice(0, 60); return; }
    p.className = "pill " + (serverOk || local ? "live" : "off");
    p.textContent = serverOk ? "متصل" : local ? "متصل باللوحة على نفس الجهاز" : "بنوصل…";
  }
  setInterval(function () {
    var c = S(); if (!c.stateAt) { $("clk").textContent = ""; return; }
    var s = Math.max(0, Math.floor((Date.now() - c.stateAt) / 1000));
    $("clk").textContent = "في الشاشة دي من " + ar(Math.floor(s / 60)) + ":" + ar(("0" + s % 60).slice(-2));
    conn();
  }, 1000);

  bus.on(function (d) { if (d && d.S) { local = d.S; draw(); } });
  var l0 = bus.last(); if (l0 && l0.S) local = l0.S;

  $("tabs").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.t) { tab = b.dataset.t; draw(); }
    if (b.dataset.sz) { size = Math.max(.85, Math.min(1.8, size + (+b.dataset.sz) * .1)); MZ.store.set("mz:scsize", size); $("body").style.setProperty("--sc-size", size + "rem"); }
  };

  /* الدخول */
  $("cx").onclick = function () { $("sheet").classList.remove("on"); };
  $("em").value = MZ.store.get("mz:adminEmail") || MZ_ADMINS[0] || "";
  $("go").onclick = function () {
    var em = $("em").value.trim().toLowerCase();
    if (MZ_ADMINS.indexOf(em) < 0) { $("er").textContent = MZ.errText({ code: "mz/not-admin" }); return; }
    $("er").textContent = "بندخل…"; MZ.store.set("mz:adminEmail", em);
    MZ.auth.signInWithEmailAndPassword(em, $("pw").value).then(function () { $("sheet").classList.remove("on"); $("er").textContent = ""; })
      .catch(function (e) { $("er").textContent = MZ.errText(e); });
  };

  /* «محتاج حد يكلمني» للأدمن */
  var unP = null, known = {};
  function watchHelp() {
    if (unP) { unP(); unP = null; }
    if (!admin) { $("help").classList.remove("on"); return; }
    unP = MZ.pCol(SID).onSnapshot(function (q) {
      people = {}; var fresh = false;
      q.forEach(function (d) { var x = d.data(); if (x && x.n) { people[d.id] = x; if (x.help && !known[d.id]) fresh = true; known[d.id] = x.help || null; } });
      var hs = Object.keys(people).filter(function (u) { return people[u].help; }), g = S().groups || {};
      $("help").classList.toggle("on", hs.length > 0);
      $("help").innerHTML = hs.map(function (u) { return "🔴 " + esc(people[u].n) + (g[u] ? " · حلقة " + ar(g[u]) : "") + ' <button data-u="' + u + '">اتكلّمنا ✓</button>'; }).join("<br>");
      if (fresh) try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    }, function () {});
  }
  $("help").onclick = function (e) { var b = e.target.closest("[data-u]"); if (b) MZ.pRef(SID, b.dataset.u).set({ help: null }, { merge: true }); };

  if (MZ.hasFb()) {
    MZ.auth.onAuthStateChanged(function (u) {
      admin = (u && MZ.isAdmin(u)) ? u : null;
      watchHelp(); draw();
      if (!u) MZ.signInAnon(8000).catch(function () {});
    });
    MZ.watchDoc(MZ.sRef(SID), function (d, server) {
      if (server) serverOk = true;
      remote = d; conn(); draw();
    }, function (e) { lastErr = e; conn(); });
  }
  /* الشاشة ما تطفيش وإنت ماسك السكريبت */
  function wake() { try { if (navigator.wakeLock && document.visibilityState === "visible") navigator.wakeLock.request("screen").catch(function () {}); } catch (e) {} }
  document.addEventListener("visibilitychange", wake); wake();
  draw(); conn();
})();
