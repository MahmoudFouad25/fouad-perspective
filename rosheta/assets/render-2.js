/* =====================================================================
   render-2.js — أنواع شاشات إضافية (الأقفال ١ → ٣ وبعدها)
   كل نوع: رسمه على شاشة العرض (EXT) + نسخته على الموبايل (MEXT)
   ===================================================================== */
(function () {
  var esc = MZ.esc, ar = MZ.ar, E = RXR.EXT, M = RXR.MEXT;
  function act(ctx, id) { return RXR.act(ctx, id); }
  /* الإجابات المتطابقة بتتجمع في كارت واحد عليه العدد (×٣) */
  function group(L) {
    var by = {}, out = [];
    L.forEach(function (x) { var k = String(x.t).trim().replace(/[\s.،!؟?]+/g, " ").trim(); if (by[k]) { by[k].n++; by[k].at = Math.max(by[k].at, x.at || 0); } else { by[k] = { t: x.t, n: 1, at: x.at || 0, tb: x.tb, k: x.k }; out.push(by[k]); } });
    return out.sort(function (a, b) { return a.at - b.at; });
  }
  function cnt(x) { return x.n > 1 ? '<b class="x">×' + ar(x.n) + "</b>" : ""; }
  RXR.group = group; RXR.cnt = cnt;

  /* ───── بطاقة الحالة: الأقفال اللي اتفتحت وإجاباتها ───── */
  E.caseCard = function (it, ctx, step, fresh) {
    var open = it.open || 0, focus = it.focus || 0;
    return '<div class="x-case' + (it.wide ? " wide" : "") + '"><div class="hd"><b>بطاقة احتياج · حالة «تواصل» في حملات الشارع</b><span>' + ar(open) + " من ٧ مفتوحة</span></div>" + RXR.SEVEN.map(function (r, i) {
      var on = i < open, ans = RX_CASE[i] || "";
      var cls = (on ? " on" : "") + (focus === i + 1 ? " focus" : "") + (focus === i + 1 && (it.at || 0) === step ? " fresh" : "");
      return '<div class="cr' + cls + '">' + RXR.lockSvg(on) + '<div><b><i>' + ar(i + 1) + "</i>" + esc(r.q) + "</b>" + (on && ans && (it.wide || open <= 3 || focus === i + 1) ? "<span>" + esc(ans) + "</span>" : "") + "</div></div>";
    }).join("") + "</div>";
  };
  M.caseCard = function (it) {
    var open = it.open || 0;
    return '<div class="m-card"><b>بطاقة الاحتياج · حالة «تواصل»</b>' + RXR.SEVEN.map(function (r, i) {
      return '<div class="m-row7' + (it.focus === i + 1 ? " hl" : "") + '"><b>' + (i < open ? "🔓" : "🔒") + " " + ar(i + 1) + ". " + esc(r.q) + "</b>" + (i < open && RX_CASE[i] ? "<small>" + esc(RX_CASE[i]) + "</small>" : "") + "</div>";
    }).join("") + "</div>";
  };

  /* ───── لوحة التصنيف الحيّة ───── */
  E.sortboard = function (it, ctx, step) {
    var A = act(ctx, it.act), by = A.by || {}, n = A.n || 0;
    var hot = it.hot && it.hot[step], showKey = it.keyAt !== undefined && step >= it.keyAt;
    var h = '<div class="x-sort' + (hot ? " has-hot" : "") + (it.cards.length <= 4 ? " few" : "") + '"><div class="lg">' + it.bins.map(function (b) { return '<span><i style="background:' + b.c + '"></i>' + esc(b.l) + "</span>"; }).join("") +
      '<span class="cnt">' + (n ? "صنّف " + ar(n) : "لسه محدش صنّف…") + "</span></div>";
    h += it.cards.map(function (c) {
      var x = by[c.id] || {}, tot = 0; it.bins.forEach(function (b) { tot += x[b.id] || 0; });
      var top = 0; it.bins.forEach(function (b) { top = Math.max(top, x[b.id] || 0); });
      var split = !it.noSplit && tot >= 3 && top / tot < 0.75;
      var bar = it.bins.map(function (b) { var v = x[b.id] || 0; return v ? '<i style="width:' + (100 * v / tot) + "%;background:" + b.c + '"><em>' + ar(Math.round(100 * v / tot)) + "٪</em></i>" : ""; }).join("");
      var key = showKey && it.key && it.key[c.id] ? it.bins.filter(function (b) { return b.id === it.key[c.id]; })[0] : null;
      return '<div class="sr' + (hot === c.id ? " hot" : "") + '"><span class="no">' + ar(c.no || "") + '</span><span class="t">' + esc(c.t) + "</span>" +
        '<span class="bar">' + (tot ? bar : "") + "</span>" + (split ? '<span class="sp">خلاف</span>' : '<span class="sp"></span>') +
        (key ? '<span class="key" style="color:' + key.c + '">' + esc(key.s || key.l) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
    return h;
  };
  M.sortboard = function (it, ctx, step) {
    var hot = it.hot && it.hot[step], c = hot && it.cards.filter(function (x) { return x.id === hot; })[0];
    return c ? '<div class="m-big">كارت ' + ar(c.no) + ": «" + esc(c.t) + "»</div>" : "";
  };

  /* ───── اختيار من قايمة (أعمدة حيّة) ───── */
  E.bars = function (it, ctx) {
    var A = act(ctx, it.act), cnt = A.count || {}, n = A.n || 0;
    var rows = it.opts.slice().sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); });
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return cnt[r.id] || 0; })));
    return '<div class="x-bars"><div class="x-h3">' + esc(it.title || "") + "</div>" + rows.map(function (r, i) {
      var v = cnt[r.id] || 0;
      return '<div class="br' + (n && i < (it.top || 0) && v ? " top" : "") + '"><span class="l">' + esc(r.l) + '</span><span class="tr"><i style="width:' + (v ? Math.max(3, 100 * v / max) : 0) + '%"></i></span><span class="n">' + (v ? ar(v) : "") + "</span></div>";
    }).join("") + '<div class="x-foot">' + (n ? "اختار " + ar(n) : "لسه محدش اختار…") + "</div></div>";
  };
  M.bars = function (it, ctx) {
    var A = act(ctx, it.act), cnt = A.count || {};
    return '<div class="m-card"><b>' + esc(it.title || "") + "</b>" + it.opts.slice().sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); }).map(function (r) {
      return '<div class="m-row"><span>' + esc(r.l) + "</span><span>" + ar(cnt[r.id] || 0) + "</span></div>"; }).join("") + "</div>";
  };

  /* ───── الظروف (كلام المصادر) ───── */
  function env(e, big) {
    return '<div class="env ' + e.tone + (big ? " big" : "") + '"><div class="eh"><span class="dot"></span>' + esc(e.h) + "</div>" + e.lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div>";
  }
  E.envs = function (it) { return '<div class="x-envs n' + it.list.length + '">' + it.list.map(function (e) { return env(e, it.list.length === 1); }).join("") + "</div>"; };
  M.envs = function (it) { return it.list.map(function (e) { return '<div class="m-card m-env ' + e.tone + '"><b>' + esc(e.h) + "</b>" + e.lines.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("") + "</div>"; }).join(""); };

  /* ───── كل مصدر شايف إيه ───── */
  E.persp = function (it) {
    return '<div class="x-persp">' + it.list.map(function (p, i) {
      return '<div class="pc ' + p.tone + '" style="animation-delay:' + (i * .2) + 's"><b>' + esc(p.h) + '</b><div class="see"><small>شايف</small>' + esc(p.see) + '</div><div class="miss"><small>مش شايف</small>' + esc(p.miss) + "</div></div>";
    }).join("") + "</div>";
  };
  M.persp = function (it) { return it.list.map(function (p) { return '<div class="m-card"><b>' + esc(p.h) + "</b>شايف: " + esc(p.see) + '<div class="m-s">مش شايف: ' + esc(p.miss) + "</div></div>"; }).join(""); };

  /* ───── الفجوة ───── */
  E.gap = function (it, ctx, step, fresh) {
    return '<div class="x-gap' + fresh + '"><div class="g a"><small>' + esc(it.a.h) + "</small><b>" + esc(it.a.t) + '</b></div><div class="mid"><span>' + esc(it.mid || "الفجوة") + '</span></div><div class="g b"><small>' + esc(it.b.h) + "</small><b>" + esc(it.b.t) + "</b></div></div>" +
      (it.foot ? '<div class="x-sub" style="margin-top:34px">' + esc(it.foot) + "</div>" : "");
  };
  M.gap = function (it) { return '<div class="m-card"><b>' + esc(it.a.h) + "</b>" + esc(it.a.t) + '</div><div class="m-big" style="text-align:center">↕ ' + esc(it.mid || "الفجوة") + '</div><div class="m-card"><b>' + esc(it.b.h) + "</b>" + esc(it.b.t) + "</div>"; };

  /* ───── شرايح كلمات (ممنوع / مسموح) ───── */
  E.chips = function (it, ctx, step, fresh) {
    return '<div class="x-chips' + fresh + '">' + it.groups.map(function (g) {
      return '<div class="grp ' + g.tone + '"><div class="gh">' + esc(g.h) + "</div><div class=\"cl\">" + g.items.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" + (g.s ? '<div class="gs">' + esc(g.s) + "</div>" : "") + "</div>";
    }).join("") + "</div>";
  };
  M.chips = function (it) { return it.groups.map(function (g) { return '<div class="m-card"><b>' + esc(g.h) + "</b>" + g.items.map(esc).join(" · ") + "</div>"; }).join(""); };

  /* ───── إعادة كتابة جملة: إجابات القاعة على جملة واحدة ───── */
  E.rwboard = function (it, ctx, step) {
    var A = act(ctx, it.act), hid = (ctx.S && ctx.S.hidden) || {}, L = group(((A.by || {})[it.i] || []).filter(function (x) { return !hid[x.k]; })).slice(-12).reverse();
    var showModel = it.modelAt !== undefined && step >= it.modelAt;
    return '<div class="x-rw"><div class="from"><small>الجملة</small><s>' + esc(it.from) + '</s></div><div class="arr">←</div><div class="to">' +
      (L.length ? L.map(function (x, i) { return '<div class="wc' + (i < 2 ? " fresh" : "") + '">' + esc(x.t) + cnt(x) + (x.tb && x.n === 1 ? "<i>" + ar(x.tb) + "</i>" : "") + "</div>"; }).join("") : '<div class="empty" style="padding:20px 0">إجاباتكم هتظهر هنا…</div>') +
      (showModel ? '<div class="model fresh"><small>اللي بيتشاف</small>' + it.model.map(function (m) { return "<div>• " + esc(m) + "</div>"; }).join("") + "</div>" : "") + "</div></div>";
  };
  M.rwboard = function (it) { return '<div class="m-card"><b>«' + esc(it.from) + "»</b>الواثق بيعمل إيه؟ " + it.model.map(esc).join(" · ") + "</div>"; };

  /* ───── حيطتين جنب بعض ───── */
  E.wall2 = function (it, ctx) {
    function col(c) {
      var A = act(ctx, c.act), hid = (ctx.S && ctx.S.hidden) || {}, L = group((A.list || []).filter(function (x) { return !hid[x.k]; })).slice(-22).reverse();
      return '<div class="col ' + (c.tone || "") + '"><div class="x-h3">' + esc(c.title) + (L.length ? ' <span class="cnt">' + ar((A.list || []).length) + "</span>" : "") + "</div>" +
        (L.length ? L.map(function (x, i) { return '<div class="wc' + (i < 2 ? " fresh" : "") + '">' + esc(x.t) + cnt(x) + "</div>"; }).join("") : '<div class="empty" style="padding:30px 0;font-size:22px">…</div>') + "</div>";
    }
    return '<div class="x-wall2">' + col(it.a) + col(it.b) + "</div>";
  };

  /* ───── سلّم «ليه؟» ───── */
  E.chain = function (it, ctx, step) {
    return '<div class="x-chain">' + it.t.filter(function (x) { return (x.at || 0) <= step; }).map(function (x, i, a) {
      return (i ? '<div class="q">' + esc(it.q || "وليه ده مهم؟") + "</div>" : "") + '<div class="rung' + (i === a.length - 1 ? " last" : "") + ((x.at || 0) === step ? " fresh" : "") + '">' + esc(x.t) + "</div>";
    }).join("") + "</div>";
  };
  M.chain = function (it, ctx, step) { return '<div class="m-card">' + it.t.filter(function (x) { return (x.at || 0) <= step; }).map(function (x) { return "<div>↑ " + esc(x.t) + "</div>"; }).join("") + "</div>"; };

  /* ───── «ده بيحصل إزاي في الحقيقة؟» ───── */
  E.aud = function (it) {
    function col(h, cls, L) { return L && L.length ? '<div class="ac ' + cls + '"><div class="ah">' + esc(h) + "</div>" + L.map(function (x) { return "<div class=\"al\">" + esc(x) + "</div>"; }).join("") + "</div>" : ""; }
    return '<div class="x-aud">' + col("يا مسؤولين التنمية", "d", it.d) + col("ويا مدربين", "t", it.t) + "</div>";
  };
  M.aud = function (it) {
    return (it.d ? '<div class="m-card"><b>مسؤولين التنمية</b>' + it.d.map(function (x) { return "<div>• " + esc(x) + "</div>"; }).join("") + "</div>" : "") +
      (it.t ? '<div class="m-card"><b>المدربين</b>' + it.t.map(function (x) { return "<div>• " + esc(x) + "</div>"; }).join("") + "</div>" : "");
  };

  /* ───── المشهد (تمرين الكاميرا) ───── */
  E.scene = function (it, ctx, step, fresh) {
    return '<div class="x-scene' + fresh + '"><div class="cam"><svg viewBox="0 0 48 48"><rect x="4" y="13" width="30" height="24" rx="5"/><path d="M34 21l10-6v18l-10-6z"/><circle cx="19" cy="25" r="6"/></svg><span class="rec">● REC</span></div><div class="ln">' +
      it.lines.map(function (l, i) { return '<div style="animation-delay:' + (i * .35) + 's">' + esc(l) + "</div>"; }).join("") + "</div></div>";
  };
  M.scene = function (it) { return '<div class="m-card">🎥 ' + it.lines.map(esc).join("<br>") + "</div>"; };

  /* ───── ركن «ليه؟» ───── */
  E.park = function (it, ctx) {
    var A = act(ctx, it.act), hid = (ctx.S && ctx.S.hidden) || {}, L = (A.list || []).filter(function (x) { return !hid[x.k]; });
    var last = group(L).slice(-(it.max || 8)).reverse();
    return '<div class="x-park' + (it.big ? " big" : "") + '"><div class="ph"><b>ركن «ليه؟»</b><span>' + (L.length ? ar(L.length) + " سبب مركون" : "أي «عشان»… مكانها هنا") + "</span></div>" +
      last.map(function (x) { return '<span class="pt">' + esc(x.t) + cnt(x) + "</span>"; }).join("") + "</div>";
  };
  M.park = function () { return ""; };

  /* ───── عداد لوحده جوّه عمود ───── */
  E.note = function (it, ctx, step, fresh) { return '<div class="x-note' + fresh + '">' + esc(it.t) + "</div>"; };
  M.note = function (it) { return '<p class="m-s">' + esc(it.t) + "</p>"; };
})();
