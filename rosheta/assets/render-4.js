/* =====================================================================
   render-4.js — شاشات العيادة · الميزان · محافظتك · التسليم والختام
   ===================================================================== */
(function () {
  var esc = MZ.esc, ar = MZ.ar, E = RXR.EXT, M = RXR.MEXT;
  function act(ctx, id) { return RXR.act(ctx, id); }
  function S(ctx) { return ctx.S || {}; }
  function tablesOf(ctx) { var G = S(ctx).groups || {}, m = 0; Object.keys(G).forEach(function (u) { m = Math.max(m, G[u] || 0); }); return m; }
  function filled(v) { var n = 0; if (v && v.f) for (var i = 1; i <= 7; i++) if (v.f[i] && String(v.f[i]).trim()) n++; return n; }
  function hasDec(v) { return !!(v && ((v.dec && v.dec.trim()) || (v.ty || []).indexOf("p") !== -1)); }

  /* ───── الأدوار ───── */
  E.roles = function () {
    return '<div class="x-roles">' + RX_CROLES.map(function (r, i) {
      return '<div class="rl" style="animation-delay:' + (i * .15) + 's"><i>' + r.ic + "</i><b>" + esc(r.n) + "</b><span>" + esc(r.d) + "</span></div>"; }).join("") + "</div>";
  };
  M.roles = function () { return RX_CROLES.map(function (r) { return '<div class="m-card"><b>' + r.ic + " " + esc(r.n) + "</b>" + esc(r.d) + "</div>"; }).join(""); };

  /* ───── لوحة العيادات ───── */
  function lockDots(n) { var h = ""; for (var i = 0; i < 7; i++) h += '<span class="' + (i < n ? "on" : "") + '"></span>'; return h; }
  E.clinicBoard = function (it, ctx) {
    var T = Math.max(tablesOf(ctx), 1), A = act(ctx, "cc"), by = A.byT || {}, h = '<div class="x-clin' + (T > 8 ? " dense" : T <= 6 ? " few" : "") + '">';
    for (var t = 1; t <= T; t++) {
      var c = rxClinicFor(t), x = by[t], v = x && x.v, n = filled(v);
      h += '<div class="cl' + (n === 7 ? " full" : "") + '"><div class="t"><b>' + ar(t) + "</b><span>" + esc(c.h) + '</span></div><div class="dots">' + lockDots(n) + '</div><div class="st">' +
        (v ? ar(n) + " من ٧" + (hasDec(v) ? ' · <em>🏢 فيها قرار</em>' : "") : "لسه…") + "</div></div>";
    }
    return h + "</div>";
  };
  M.clinicBoard = function () { return ""; };

  /* ───── التنبيهات الزمنية (تحت العداد) ───── */
  E.ms = function (it, ctx) {
    return '<div class="x-ms" data-ms="' + esc(JSON.stringify(it.marks)) + '" data-start="' + (ctx.stepAt || Date.now()) + '"></div>';
  };
  RXR.tickExtra = function (root) {
    [].forEach.call(root.querySelectorAll("[data-ms]"), function (el) {
      var marks = JSON.parse(el.getAttribute("data-ms") || "[]"), min = (Date.now() - (+el.dataset.start)) / 60000, txt = "";
      marks.forEach(function (m) { if (min >= m[0]) txt = m[1]; });
      if (el.textContent !== txt) { el.textContent = txt; el.classList.toggle("on", !!txt); }
    });
  };

  /* ───── لوحة المراجعة ───── */
  E.reviewBoard = function (it, ctx) {
    var T = Math.max(tablesOf(ctx), 1), L = act(ctx, "rv").list || [], cards = act(ctx, "cc").byT || {}, h = '<div class="x-clin' + (T > 8 ? " dense" : T <= 6 ? " few" : "") + '">';
    for (var t = 1; t <= T; t++) {
      var q = L.filter(function (x) { return x.to === t; }).length, from = t === 1 ? T : t - 1;
      h += '<div class="cl"><div class="t"><b>' + ar(t) + "</b><span>" + esc(rxClinicFor(t).h) + '</span></div><div class="st">بتراجعها ترابيزة ' + ar(from) + '</div><div class="q">' +
        (q ? "<b>" + ar(q) + "</b> سؤال" : (cards[t] ? "…" : "مفيش بطاقة لسه")) + "</div></div>";
    }
    return h + "</div>";
  };
  M.reviewBoard = function () { return ""; };

  /* ───── الاكتشافات الخمسة ───── */
  E.found = function (it, ctx) {
    var c = RX_CLINIC[it.i], T = tablesOf(ctx), tabs = [];
    for (var t = 1; t <= T; t++) if (rxClinicFor(t).id === c.id) tabs.push(ar(t));
    return '<div class="x-found fresh"><div class="case"><span class="lt">' + ["أ", "ب", "ج", "د", "هـ"][it.i] + "</span><b>" + esc(c.h) + "</b><small>" + esc(c.n) + (tabs.length ? " · ترابيزة " + tabs.join(" و") : "") + '</small></div><div class="x-big"><div class="t">' + esc(c.found.t) + '</div><div class="s">' + esc(c.found.s) + "</div></div></div>";
  };
  M.found = function (it) { var c = RX_CLINIC[it.i]; return '<div class="m-big">' + esc(c.h) + "<small>" + esc(c.found.t) + " " + esc(c.found.s) + "</small></div>"; };

  E.clinicCount = function (it, ctx) {
    var by = act(ctx, "cc").byT || {}, n = 0, dec = 0, tr = 0, other = 0;
    Object.keys(by).forEach(function (t) { var v = by[t].v; n++; if (hasDec(v)) dec++; var ty = v.ty || []; if (ty.indexOf("k") !== -1) tr++; if (ty.indexOf("f") !== -1 || ty.indexOf("l") !== -1) other++; });
    return '<div class="x-stats"><div><b>' + ar(n) + "</b><span>بطاقة اتعملت</span></div><div><b>" + ar(tr) + "</b><span>فيها تدريب</span></div><div class=\"hot\"><b>" + ar(dec) + "</b><span>طلع منها قرار</span></div><div><b>" + ar(other) + "</b><span>دور تاني أو دعم</span></div></div>" +
      '<div class="x-sub" style="margin-top:30px">كل الحالات جت كطلبات تدريب.</div>';
  };
  M.clinicCount = function () { return ""; };

  /* ───── أزواج المحافظات ───── */
  function pairsList(ctx) {
    var P = S(ctx).pairs || {}, R = S(ctx).roster || {}, by = {};
    Object.keys(P).forEach(function (u) { var p = P[u]; (by[p] = by[p] || []).push(Object.assign({ u: u }, R[u] || { n: "…", r: "o", g: "" })); });
    return Object.keys(by).sort(function (a, b) { return a - b; }).map(function (p) {
      var m = by[p], d = m.filter(function (x) { return x.r === "d"; })[0] || m[0];
      return { p: +p, m: m, g: (d && d.g) || "" };
    });
  }
  E.pairsBoard = function (it, ctx) {
    var L = pairsList(ctx), gm = act(ctx, "gm").byP || {}, notes = act(ctx, "gn").list || [];
    if (!L.length) return '<div class="empty">الأزواج هتظهر هنا أول ما تتعمل من لوحة التحكم…</div>';
    var dense = L.length > 12 ? " dense" : "";
    return '<div class="x-pairs' + dense + (it.show === "names" ? " names" : "") + '">' + L.map(function (x) {
      var f = gm[x.p] && gm[x.p].v, needs = (f && f.needs || []).filter(function (n) { return n && n.t; }), nn = notes.filter(function (y) { return y.pr === x.p; }).length;
      var h = '<div class="pc"><div class="g">' + esc(x.g || "—") + "</div>";
      if (it.show === "names" || it.show === "full") h += '<div class="nm">' + x.m.map(function (y) { return '<span class="r-' + (y.r || "o") + '">' + esc((y.n || "").split(" ")[0]) + "</span>"; }).join("") + "</div>";
      if (it.show === "notes") h += '<div class="kv"><b>' + ar(nn) + "</b> ورقة</div>";
      if (it.show === "full") {
        var tr = needs.filter(function (n) { return n.ct === "k"; }).length, dc = needs.filter(function (n) { return n.ct === "p"; }).length;
        h += '<div class="chips"><span>🎯 ' + ar((f && f.goals || []).filter(function (g) { return g; }).length) + "</span><span>📋 " + ar(needs.length) + "</span><span>📚 " + ar(tr) + "</span><span>🏢 " + ar(dc) + "</span>" + (f && f.month ? '<span class="m">⚖️ ' + esc(f.month) + "</span>" : "") + "</div>";
      }
      return h + "</div>";
    }).join("") + "</div>";
  };
  M.pairsBoard = function () { return ""; };

  /* ───── مصفوفة الأثر والمجهود ───── */
  E.quad = function () {
    return '<div class="x-quad"><div class="ylab">الأثر ↑</div><div class="xlab">المجهود ←</div>' + RX_QUAD.map(function (q) {
      return '<div class="q q-' + q.id + '"><b>' + esc(q.s) + "</b><span>" + esc(q.l) + "</span></div>"; }).join("") + '</div><div class="x-sub" style="margin-top:22px">واختاروا أهم ٥ من المربعين اللي فوق</div>';
  };
  M.quad = function () { return RX_QUAD.map(function (q) { return '<div class="m-card"><b>' + esc(q.s) + "</b>" + esc(q.l) + "</div>"; }).join(""); };

  /* ───── التسليم ───── */
  E.handBoard = function (it, ctx) {
    var L = pairsList(ctx), H = act(ctx, "ho").byP || {}, ready = 0, back = 0, dated = 0;
    L.forEach(function (x) { var v = H[x.p] && H[x.p].v; if (!v) return; if (v.st === "ready") ready++; if (v.st === "back") back++; if (v.follow) dated++; });
    return '<div class="x-stats"><div><b>' + ar(ready) + '</b><span>جاهزة ✓</span></div><div class="hot"><b>' + ar(back) + '</b><span>ترجع بقفل وتاريخ</span></div><div><b>' + ar(dated) + "</b><span>حطّوا ميعاد متابعة</span></div><div><b>" + ar(L.length) + "</b><span>زوج</span></div></div>" +
      '<div class="x-hand">' + L.map(function (x) { var v = H[x.p] && H[x.p].v; return '<span class="' + (v ? v.st || "" : "") + '">' + esc(x.g || "—") + "</span>"; }).join("") + "</div>";
  };
  M.handBoard = function () { return ""; };

  /* ───── صندوق القرارات ───── */
  function decisions(ctx) {
    var gm = act(ctx, "gm").byP || {}, cc = act(ctx, "cc").byT || {}, a = 0, b = 0;
    Object.keys(gm).forEach(function (p) { (gm[p].v.needs || []).forEach(function (n) { if (n && n.t && n.ct === "p") a++; }); });
    Object.keys(cc).forEach(function (t) { if (hasDec(cc[t].v)) b++; });
    return { maps: a, clinic: b, mizan: 1, all: a + b + 1 };
  }
  RXR.decisions = decisions;
  E.box = function (it, ctx) {
    var d = decisions(ctx);
    return '<div class="x-box"><div class="bx"><svg viewBox="0 0 200 170"><path d="M20 60 L100 30 L180 60 L100 90 Z" class="lid"/><path d="M20 60 L20 140 L100 168 L100 90 Z" class="l"/><path d="M180 60 L180 140 L100 168 L100 90 Z" class="r"/></svg><b>' + ar(d.all) + '</b></div><div class="br"><div><b>' + ar(d.maps) + "</b> من خرايط المحافظات</div><div><b>" + ar(d.clinic) + "</b> من عيادة الاحتياج</div><div><b>" + ar(d.mizan) + "</b> جنب الميزان</div></div></div>";
  };
  M.box = function (it, ctx) { var d = decisions(ctx); return '<div class="m-big">🗳 ' + ar(d.all) + " بطاقة قرار<small>رايحة لمجلس الإدارة</small></div>"; };

  /* ───── كل طلب بقى إيه ───── */
  var BECAME = [
    ["تواصل", "تدريب على بدء الكلام مع الغريب + قرارين: حكايات قبل كل حملة، ورسالة حملة جديدة"],
    ["إدارة وقت", "في الغالب: دور مش واضح"],
    ["ثقة بالنفس", "ساعات: اجتماع بيعلّم الناس تسكت"],
    ["الفريق مش ملتزم", "التدريب الصح ممكن يكون لمسؤول الملف، مش للمتطوعين"],
    ["ذكاء اصطناعي", "ليه مكان… بس مكافأة بتخلّي المتطوع يكمّل"]
  ];
  E.became = function () {
    return '<div class="x-became">' + BECAME.map(function (b, i) { return '<div class="bc" style="animation-delay:' + (i * .35) + 's"><s>«' + esc(b[0]) + '»</s><span>←</span><b>' + esc(b[1]) + "</b></div>"; }).join("") + "</div>";
  };
  M.became = function () { return '<div class="m-card">' + BECAME.map(function (b) { return "<div>«" + esc(b[0]) + "» ← " + esc(b[1]) + "</div>"; }).join("") + "</div>"; };

  /* ───── عدد اللي كتبوا (من غير ما الكلام يظهر) ───── */
  E.wallCount = function (it, ctx) {
    var n = (act(ctx, it.act).list || []).length;
    return '<div class="x-wcount"><div class="t">' + esc(it.t) + '</div><div class="n"><b>' + ar(n) + "</b> كتبوا</div></div>";
  };
  M.wallCount = function (it) { return '<div class="m-big">' + esc(it.t) + "</div>"; };
})();
