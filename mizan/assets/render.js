/* =====================================================================
   render.js — رسم شاشة العرض (مشترك بين شاشة العرض ومعاينة لوحة التحكم)
   ===================================================================== */
var MZR = (function () {
  var esc = MZ.esc, ar = MZ.ar;

  function axOf(a) { return a && MZ_AX[a] ? " ax-" + a : ""; }

  function bars(rows, total) {
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.n; })));
    return '<div class="s-bars">' + rows.map(function (r) {
      var pct = total ? Math.round(100 * r.n / total) : 0;
      return '<div class="s-bar' + axOf(r.ax) + '"><span>' + esc(r.l) + '</span><span class="tr"><i style="width:' + (r.n ? Math.max(3, 100 * r.n / max) : 0) + '%"></i></span><span class="n"><bdi>' + ar(r.n) + "</bdi>" + (total ? ' <small><bdi>' + ar(pct) + "٪</bdi></small>" : "") + "</span></div>";
    }).join("") + '</div><div class="s-total">' + (total ? "جاوب " + ar(total) : "لسه محدش جاوب… خدوا وقتكم") + "</div>";
  }

  function cycleSvg(ax, upto) {
    var C = MZ_CYCLES[ax], A = MZ_AX[ax], n = 6, R = 80, cx = 110, cy = 110, s = "";
    s += '<svg viewBox="0 0 220 220" role="img" aria-label="' + esc(C.name) + '"><circle cx="110" cy="110" r="80" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="2"/>';
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      var on = upto === undefined || i < upto, cur = upto !== undefined && i === upto - 1;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (cur ? 17 : 13) + '" fill="' + (on ? A.color : "transparent") + '" stroke="' + A.color + '" stroke-width="2" opacity="' + (on ? 1 : .45) + '"/>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (y + 5).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + (on ? "#fff" : A.color) + '">' + ar(i + 1) + "</text>";
    }
    s += "</svg>";
    return s;
  }

  function cycleBlock(ax, upto, small) {
    var C = MZ_CYCLES[ax];
    return '<div class="s-cycle' + (small ? " small" : "") + axOf(ax) + '">' + cycleSvg(ax, upto) +
      '<div><div class="s-eyebrow">' + esc(C.name) + '</div><div class="cap">' +
      C.st.map(function (s, i) { var on = upto === undefined || i < upto; return '<span style="opacity:' + (on ? 1 : .35) + (upto === i + 1 ? ";color:var(--ax);font-weight:600" : "") + '">' + ar(i + 1) + ". " + esc(s) + "</span>"; }).join(" · ") +
      "</div></div></div>";
  }

  function timerHtml(it, startedAt) {
    var total = it.sec || (it.min || 1) * 60;
    var left = Math.max(0, Math.round(total - (Date.now() - (startedAt || Date.now())) / 1000));
    var m = Math.floor(left / 60), s = left % 60;
    return '<div class="s-timer' + (left === 0 ? " done" : "") + '" data-timer="' + total + '" data-start="' + (startedAt || Date.now()) + '">' + ar(m) + ":" + ar(s < 10 ? "0" + s : s) + "</div>";
  }
  function tickTimers(root) {
    [].forEach.call(root.querySelectorAll("[data-timer]"), function (el) {
      var total = +el.dataset.timer, st = +el.dataset.start;
      var left = Math.max(0, Math.round(total - (Date.now() - st) / 1000));
      var m = Math.floor(left / 60), s = left % 60;
      el.textContent = ar(m) + ":" + ar(s < 10 ? "0" + s : s);
      el.classList.toggle("done", left === 0);
    });
  }

  function mizDemo(part, me) {
    var R = mzCompute(me), h = '<div class="s-mz">';
    var maxS = Math.max(1, R.sc.H, R.sc.V, R.sc.B);
    if (part === 1) {
      h += '<div class="s-eyebrow">١ · ترتيبي</div><div class="axbars">' + R.order.map(function (a, i) {
        return '<div class="ab ax-' + a + '"><span>' + ["الأول", "التاني", "التالت"][i] + ": <b style='color:var(--ax)'>" + esc(MZ_AX[a].q) + '</b></span><span class="tr"><i style="width:' + Math.round(100 * Math.max(.08, R.sc[a] / maxS)) + '%"></i></span></div>'; }).join("") + "</div>";
      if (R.felt) h += '<div class="s-total" style="margin-top:.8em">إحساسي: ' + R.felt.map(function (a) { return MZ_AX[a].q; }).join(" ← ") + (R.feltDiffers ? " · مختلف عن الحساب… وده باب حوار" : " · نفس الترتيب") + "</div>";
      h += '<div class="s-total">وتحتها زرار: «أنا شايف ترتيبي كده». إنت صاحب الكلمة الأخيرة.</div>';
    }
    if (part === 2) {
      h += '<div class="s-eyebrow">٢ · أبعادي التسعة (ناقصة ← سليمة → زيادة)</div><div class="d9">';
      ["B", "V", "H"].forEach(function (a) { [1, 2, 3].forEach(function (n) { var k = a + n, v = R.dims[k];
        h += '<div class="ax-' + a + '">' + esc(MZ_DIMS[k].n) + '<div class="tk">' + (v === null ? "" : '<i style="right:' + (50 + v * 22) + '%"></i>') + "</div></div>"; }); });
      h += "</div>";
      if (R.link) h += '<div class="s-p" style="margin-top:.6em">«' + esc(MZ_DIMS[R.link[0]].n) + "» زيادة… و«" + esc(MZ_DIMS[R.link[1]].n) + "» ناقصة. ساعات بيبقوا وش واحد.</div>";
    }
    if (part === 3) {
      h += '<div class="s-eyebrow">٣ · الدايرة اللي محتاجة انتباهي</div>';
      h += R.hot.length ? R.hot.map(function (x) { var C = MZ_CYCLES[x.ax];
        return '<div class="s-card ax-' + x.ax + '"><b>' + esc(C.name) + "</b>أنا في «" + esc(C.st[x.st - 1]) + '»<span class="tg">خطوتي: ' + esc(C.step) + "</span></div>"; }).join("") :
        '<div class="s-card">لسه في البداية أو في مكان مستقر. احفظ الخرايط 🙂</div>';
    }
    if (part === 4) h += '<div class="s-eyebrow">٤ · الهدية المخبوءة في «' + esc(MZ_AX[R.hidden].q) + '»</div><div class="s-card ax-' + R.hidden + '">' + esc(R.gift) + "</div>";
    if (part === 5) h += '<div class="s-eyebrow">٥ · التطوع… بيوزنني فين؟ وبيحرقني فين؟</div>' +
      '<div class="s-split"><div class="s-card ax-H"><b>بيوزنني</b>' + esc(R.combo.ok) + '</div><div class="s-card ax-V"><b>ممكن يحرقني</b>' + esc(R.combo.risk) + "</div></div>" +
      '<div class="s-card"><b>سؤالي</b>' + esc(R.combo.q) + '<span class="tg">خطوتي: ' + esc(R.combo.step) + "</span></div>";
    return h + "</div>";
  }

  function circlesHtml(S) {
    var g = (S && S.groups) || {}, r = (S && S.roster) || {}, by = {};
    Object.keys(g).forEach(function (u) { (by[g[u]] = by[g[u]] || []).push(r[u] || "…"); });
    var ks = Object.keys(by).sort(function (a, b) { return a - b; });
    if (!ks.length) return '<div class="s-p" style="color:var(--fg3)">الحلقات لسه ما اتوزعتش… الأرقام على الترابيزات.</div>';
    return '<div class="s-circles">' + ks.map(function (k) { return "<div><b>" + ar(k) + "</b>" + by[k].map(esc).join("، ") + "</div>"; }).join("") + "</div>";
  }

  /* عنصر واحد */
  function item(it, ctx) {
    var S = ctx.S || {}, agg = ctx.agg || {}, counts = agg.counts || {};
    switch (it.k) {
      case "eyebrow": return '<div class="s-eyebrow">' + esc(it.t) + "</div>";
      case "big": return '<div class="s-big">' + esc(it.t) + (it.s ? "<small>" + esc(it.s) + "</small>" : "") + "</div>";
      case "p": return '<div class="s-p">' + esc(it.t) + "</div>";
      case "q": return '<div class="s-q">' + esc(it.t) + (it.ref ? "<cite>" + esc(it.ref) + "</cite>" : "") + "</div>";
      case "list": return '<ul class="s-list">' + it.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      case "card": return '<div class="s-card' + axOf(it.ax) + '">' + (it.h ? "<b>" + esc(it.h) + "</b>" : "") + esc(it.t) + (it.tongue ? '<span class="tg">«' + esc(it.tongue) + "»</span>" : "") + "</div>";
      case "axq": var A = MZ_AX[it.ax]; return '<div class="s-axq' + (it.small ? " small" : "") + axOf(it.ax) + '"><div class="t">' + esc(A.q) + '</div><div class="n">' + esc(A.name) + "</div></div>";
      case "corners": return '<div class="row3">' + ["H", "V", "B"].map(function (a) { return item({ k: "axq", ax: a, small: it.small }, ctx); }).join("") + "</div>";
      case "char": var C = MZ_AX[it.ax];
        return '<div class="s-char' + axOf(it.ax) + '"><div class="av">' + esc(C.who[0]) + '</div><div><div class="nm">' + esc(C.who) + ' <span class="meta">· ' + esc(C.q) + " · " + esc(C.name) + "</span></div>" +
          (it.lines || []).map(function (l) { return '<div class="ln">' + esc(l) + "</div>"; }).join("") + "</div></div>";
      case "table":
        return '<table class="s-table"><tr>' + it.head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr>" +
          it.rows.map(function (r) { var ax = MZ_AX[r[0]] ? r[0] : "";
            return '<tr class="' + axOf(ax) + '">' + r.map(function (c, i) { return "<td" + (i === 0 && ax ? ' style="color:var(--ax)"' : "") + ">" + esc(i === 0 && ax ? MZ_AX[ax].short : c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>";
      case "sit": var Sx = MZ_SIT[it.key];
        return '<div class="s-eyebrow">موقف</div><div class="s-big">' + esc(Sx.q) + '</div><ul class="s-list">' + Sx.opts.map(function (o, i) { return "<li>" + "أبج"[i] + ") " + esc(o.l) + "</li>"; }).join("") + "</ul>";
      case "bars":
        var src = it.opts, c = counts[it.key] || {}, rows;
        if (src === "sit") rows = MZ_SIT[it.key].opts.map(function (o, i) { return { v: o.v, l: "أبج"[i], ax: it.neutral ? "" : o.v }; });
        else if (it.cycle) rows = MZ_CYCLES[it.cycle].st.map(function (s, i) { return { v: String(i + 1), l: ar(i + 1) + ". " + s, ax: it.cycle }; }).concat([{ v: "no", l: "مش شبهي" }]);
        else rows = src;
        rows = rows.map(function (r) { return { l: r.l, ax: r.ax, n: c[r.v] || 0 }; });
        var tot = rows.reduce(function (a, r) { return a + r.n; }, 0);
        return bars(rows, tot);
      case "hist":
        var hc = counts[it.key] || {}, b = [["٠–٢", 0, 2], ["٣–٥", 3, 5], ["٦–١٠", 6, 10], ["١١–٢٠", 11, 20], ["أكتر من ٢٠", 21, 999]];
        var hr = b.map(function (x) { var n = 0; Object.keys(hc).forEach(function (v) { if (+v >= x[1] && +v <= x[2]) n += hc[v]; }); return { l: x[0] + " ساعة", ax: "V", n: n }; });
        return bars(hr, hr.reduce(function (a, r) { return a + r.n; }, 0));
      case "chat":
        return '<div class="s-chat"><div class="hd">فريق قافلة الشرقية 👥</div><div class="msg">يا جماعة أنا ممكن آجي بدري أساعد في الترتيب 🙏<div class="seen">٩:٠٢ م · ✓✓</div></div><div class="seen" style="text-align:center;margin-top:.8em">اتشافت من ٧ · ٠ رد</div></div>';
      case "axtitle": var T = MZ_AX[it.ax]; return '<div class="s-axtitle' + axOf(it.ax) + '"><div class="n">' + esc(T.name) + '</div><div class="t">' + esc(T.q) + "</div></div>";
      case "dims": var D = MZ_AX[it.ax];
        return '<div class="row3">' + D.dims.map(function (d, i) { return '<div class="s-card' + axOf(it.ax) + '"><b>' + ar(i + 1) + "</b>" + esc(d) + "</div>"; }).join("") + "</div>";
      case "arrow":
        return it.mizan ? '<div class="s-arrow"><span>«ولا تُخسِروا»<small>ناقصة</small></span><span class="mid">القسط<small>سليمة</small></span><span>«ألّا تطغَوا»<small>زيادة</small></span></div>'
          : '<div class="s-arrow"><span>ناقصة<small>اتقفلت… من خوف أو جرح</small></span><span class="mid">سليمة<small>شغالة صح</small></span><span>زيادة<small>شغالة بخوف… فبقت أكتر من اللازم</small></span></div>';
      case "dimhead": return '<div class="s-dimhead' + axOf(it.ax) + '"><span class="n">' + esc(MZ_AX[it.ax].q) + " · البعد " + ar(it.n) + ": " + esc(MZ_AX[it.ax].dims[it.n - 1]) + '</span><span class="q">' + esc(it.q) + "</span></div>";
      case "pic": var lab = { plus: "زيادة", minus: "ناقصة", ok: "سليمة" }[it.side];
        return '<div class="s-pic ' + it.side + '"><span class="tag">' + lab + "</span><div>" + esc(it.t) + '<span class="tg">لسان حاله: «' + esc(it.tongue) + "»</span></div></div>";
      case "scene": return '<div class="s-scene">' + esc(it.t) + "</div>";
      case "cycle": return cycleBlock(it.ax, it.grow ? Math.min(6, (ctx.step || 0) + 1) : undefined, !it.grow && ctx.hasBars);
      case "circles": return circlesHtml(S);
      case "round": return '<div class="s-big">جولة ' + ar(it.n) + " من ٣ <small>لما الوقت يخلص… غيّر الشريك 🔄</small></div>";
      case "timer": return timerHtml(it, ctx.stepAt);
      case "split": return '<div class="s-split"><div class="s-card ax-V">' + esc(it.a) + '</div><div class="s-card">' + esc(it.b) + "</div></div>";
      case "strike": return '<div class="s-strike">' + it.words.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + "</div>";
      case "keyq": var K = MZ_KEYS[it.key]; return '<div class="s-eyebrow">المفتاح ' + ar(it.n) + ' من ٤</div><div class="s-big">' + esc(K.q) + "<small>رتّب التلاتة على موبايلك: الأقرب الأول.</small></div>";
      case "mizdemo": return mizDemo(it.part, (S && S.demo) || MZ_DEMO_ME);
      case "merge":
        var F = { H: "حب الحياة… في نفسك وفي كل حي", V: "أنا بحيا… وبحيي", B: "ليكم مكان عندي… نشيل ونتشال" };
        return '<div class="s-merge' + (it.step === 2 ? " m2" : "") + '">' + ["H", "V", "B"].map(function (a) { return '<div class="c' + axOf(a) + '"><div class="q">' + esc(MZ_AX[a].q) + '</div><div class="f">' + esc(F[a]) + "</div></div>"; }).join("") + "</div>" +
          (it.step === 2 ? '<div class="s-merged">صناع الحياة</div>' : "");
      case "god": return '<div class="s-god"><span>مين بيحفظني؟</span><span>مين بيحييني؟</span><span>مين بيشيلني؟</span></div><div class="s-god"><span class="g">الله</span></div><div class="s-p" style="text-align:center;margin:0 auto">نقدر نحفظ ونحيا وننتمي… من غير خوف. من فيض.</div>';
      case "dua": return '<div class="s-q" style="font-size:1.45em">اللهم اجعلنا ممن أحيا… وممن أحييته… وممن يمشي بنورك في الناس. اللهم اجعل ما نعطيه من فيض لا من خوف. ومن كان يحمل الناس… فاحمله أنت.</div>';
      case "break": return '<div class="s-break"><div class="t">' + esc(it.t) + "</div>" + (it.s ? '<div class="s">' + esc(it.s) + "</div>" : "") + (S.breakMsg ? '<div class="m">' + esc(S.breakMsg) + "</div>" : "") + "</div>";
      case "qr": return '<div class="s-qr"><div class="box" id="qrbox"></div><div><div class="t">امسح الكود<br>واكتب اسمك الأول بس</div><div class="u" id="qrurl"></div><div class="n">' + (agg.n ? "وصل " + ar(agg.n) + " 🌿" : "") + "</div></div></div>";
    }
    return "";
  }

  /* الشاشة كلها */
  function screen(st, step, ctx) {
    var info = mzSteps(st), steps = info.steps, mode = st.mode || "focus";
    step = Math.max(0, Math.min(step || 0, steps.length - 1));
    ctx.step = step;
    ctx.hasBars = (st.items || []).some(function (i) { return i.k === "bars"; });
    var h = info.pins.map(function (it) { return '<div class="blk">' + item(it, ctx) + "</div>"; }).join("");
    var from = mode === "all" ? 0 : Math.max(0, step - 1);
    for (var i = from; i <= step; i++) {
      var dim = mode !== "all" && i < step;
      h += '<div class="blk' + (dim ? " dim" : "") + '">' + steps[i].map(function (it) {
        if (it.k === "timer" && i !== step) return "";
        return item(it, ctx);
      }).join("") + "</div>";
    }
    return h;
  }

  return { screen: screen, tickTimers: tickTimers, item: item };
})();
