/* =====================================================================
   render.js — رسم شاشة العرض + نسخة الموبايل
   ---------------------------------------------------------------------
   الشاشة كلها «لوحة» ثابتة ١٦٠٠×٩٠٠، وبتتكبّر وتصغّر على قد أي بروجكتور.
   فالشكل اللي بتشوفه في معاينة اللوحة هو نفسه بالظبط اللي على الحيطة.
   ===================================================================== */
var RXR = (function () {
  var esc = MZ.esc, ar = MZ.ar;

  /* ───────── أنهي حاجات ظاهرة في الدوسة دي ───────── */
  function isPin(it) { return it.pin || it.k === "eyebrow" || it.k === "brand"; }
  function shown(it, step) { return (it.at || 0) <= step && (it.until === undefined || step <= it.until); }
  function visible(sl, step) {
    var vis = sl.items.filter(function (it) { return shown(it, step); });
    if (sl.mode !== "one") return vis;
    var max = -1;
    vis.forEach(function (it) { if (!isPin(it)) max = Math.max(max, it.at || 0); });
    return vis.filter(function (it) { return isPin(it) || (it.at || 0) === max; });
  }

  /* ───────── أيقونات ───────── */
  function lockSvg(open) {
    return open
      ? '<svg viewBox="0 0 24 24" class="lk on"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7" fill="none"/></svg>'
      : '<svg viewBox="0 0 24 24" class="lk"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11" fill="none"/></svg>';
  }

  /* السبع أسئلة */
  var SEVEN = [
    { q: "عايزين نوصل لإيه؟", d: "صاحبي عايز يرجع يشتغل يوم كامل من غير وجع" },
    { q: "المفروض يعمل إيه عشان نوصل؟", d: "يقعد يشتغل، ويقوم، ويشيل ورق، من غير وجع" },
    { q: "هو بيعمل إيه دلوقتي؟", d: "بيقوم كل ساعة من الوجع، ومش قادر يكمّل اليوم" },
    { q: "المشكلة في أنهي بُعد؟", d: "في الضهر بالظبط، تحت" },
    { q: "السبب من أنهي نوع؟", d: "الكرسي (المكان)، وعضلة ضعيفة (محتاج يتعلم تمارين)" },
    { q: "مين بالظبط محتاج؟", d: "هو، واتنين زمايله على نفس الكراسي" },
    { q: "هنعرف إنه نجح إزاي؟", d: "بعد أسبوعين يشتغل يوم كامل من غير وجع" }
  ];

  /* ───────── العداد ───────── */
  function timer(it, startAt) {
    var total = (it.min || 1) * 60;
    var left = Math.max(0, Math.round(total - (Date.now() - (startAt || Date.now())) / 1000));
    return '<div class="x-timer' + (left === 0 ? " done" : "") + '" data-timer="' + total + '" data-start="' + (startAt || Date.now()) + '">' +
      '<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" style="stroke-dashoffset:' + (339.3 * (1 - left / total)).toFixed(1) + '"/></svg>' +
      '<span class="t">' + fmt(left) + "</span></div></div>";
  }
  function fmt(left) { var m = Math.floor(left / 60), s = left % 60; return ar(m) + ":" + ar(s < 10 ? "0" + s : s); }
  function tick(root) {
    [].forEach.call(root.querySelectorAll("[data-timer]"), function (el) {
      var total = +el.dataset.timer, st = +el.dataset.start;
      var left = Math.max(0, Math.round(total - (Date.now() - st) / 1000));
      var t = el.querySelector(".t"); if (t) t.textContent = fmt(left);
      var fg = el.querySelector(".fg"); if (fg) fg.style.strokeDashoffset = (339.3 * (1 - left / total)).toFixed(1);
      el.classList.toggle("done", left === 0);
      el.classList.toggle("low", left > 0 && left <= 120);
    });
  }

  /* ───────── الحاجات الحيّة ───────── */
  function act(ctx, id) { return (ctx.agg && ctx.agg.acts && ctx.agg.acts[id]) || {}; }
  function tableCount(ctx) {
    var G = (ctx.S && ctx.S.groups) || {}, m = 0;
    Object.keys(G).forEach(function (u) { m = Math.max(m, G[u] || 0); });
    return m;
  }
  function reqLabel(id) { for (var i = 0; i < RX_REQ.length; i++) if (RX_REQ[i].id === id) return RX_REQ[i].l; return id; }

  function picksBoard(it, ctx) {
    var A = act(ctx, it.act), cnt = A.count || {}, nT = A.nT || 0;
    var rows = RX_REQ.slice().sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); });
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return cnt[r.id] || 0; })));
    var h = '<div class="x-picks"><div class="col"><div class="x-h3">كل تدريب… كام ترابيزة اختارته</div>' + rows.map(function (r) {
      var n = cnt[r.id] || 0;
      return '<div class="pk' + (n === 0 ? " zero" : "") + '"><span class="l">' + esc(r.l) + '</span><span class="tr"><i style="width:' + (n ? Math.max(4, 100 * n / max) : 0) + '%"></i></span><span class="ticks">' +
        (n ? new Array(Math.min(n, 14) + 1).join("✓") + (n > 14 ? "+" : "") : "") + '</span><span class="n">' + (n ? ar(n) : "") + "</span></div>";
    }).join("") + '<div class="x-foot">' + (nT ? "سلّمت " + ar(nT) + (tableCount(ctx) ? " من " + ar(tableCount(ctx)) : "") + " ترابيزة" : "لسه مفيش ترابيزة سلّمت…") + "</div></div>";
    var byT = A.byT || {}, keys = Object.keys(byT).sort(function (a, b) { return a - b; });
    h += '<div class="col tcards' + (keys.length > 6 ? " dense" : "") + '"><div class="x-h3">والسبب</div>' + keys.map(function (t) {
      var x = byT[t];
      return '<div class="tc"><b>' + (+t ? "ترابيزة " + ar(t) : "من غير ترابيزة") + "</b>" + x.c.map(function (c) {
        var w = x.w && x.w[c]; return '<div><span class="c">' + esc(reqLabel(c)) + "</span>" + (w ? '<span class="w">' + esc(w) + "</span>" : "") + "</div>";
      }).join("") + "</div>";
    }).join("") + "</div></div>";
    return h;
  }

  function wall(it, ctx) {
    var A = act(ctx, it.act), hid = (ctx.S && ctx.S.hidden) || {};
    var list = (A.list || []).filter(function (x) { return !hid[x.k]; });
    var n = list.length, last = list.slice(-48).reverse();   /* الأحدث الأول: لو الحيطة اتملت، القديم هو اللي يتقص */
    var size = n > 24 ? "s" : n > 10 ? "m" : "l";
    var h = '<div class="x-wall ' + size + '"><div class="x-h3">' + esc(it.title || "") + (n ? ' <span class="cnt">' + ar(n) + "</span>" : "") + "</div>";
    if (!n) return h + '<div class="empty">الأسئلة هتظهر هنا أول ما تتكتب…</div></div>';
    h += '<div class="cards">' + last.map(function (x, i) {
      return '<div class="wc' + (i < 3 ? " fresh" : "") + '">' + esc(x.t) + (x.tb ? '<i>' + ar(x.tb) + "</i>" : "") + "</div>";
    }).join("") + "</div></div>";
    return h;
  }

  function progress(it, ctx) {
    var A = act(ctx, it.act), n = A.nT || 0, T = tableCount(ctx);
    var dots = "";
    for (var i = 1; i <= T; i++) dots += '<span class="' + (A.byT && A.byT[i] ? "on" : "") + '">' + ar(i) + "</span>";
    return '<div class="x-prog"><div class="lbl">' + (n ? "سلّمت " + ar(n) + (T ? " من " + ar(T) : "") : "لسه محدش سلّم") + '</div><div class="dots">' + dots + "</div></div>";
  }

  function tables(ctx) {
    var S = ctx.S || {}, G = S.groups || {}, R = S.roster || {}, by = {}, none = 0;
    Object.keys(R).forEach(function (u) {
      var t = G[u]; if (!t) { none++; return; }
      by[t] = by[t] || { t: 0, d: 0, o: 0 }; by[t][(R[u] && R[u].r) || "o"]++;
    });
    var keys = Object.keys(by).sort(function (a, b) { return a - b; });
    if (!keys.length) return '<div class="x-tables"><div class="empty">الترابيزات هتظهر هنا أول ما تتوزع…</div></div>';
    return '<div class="x-tables"><div class="x-h3">كل واحد يبص في موبايله: رقم ترابيزته وأسامي اللي معاه</div><div class="grid' + (keys.length > 12 ? " dense" : "") + '">' + keys.map(function (k) {
      var x = by[k];
      return '<div class="tb"><b>' + ar(k) + '</b><span><i class="t"></i>' + ar(x.t) + ' مدرب</span><span><i class="d"></i>' + ar(x.d) + " تنمية</span>" + (x.o ? "<span>+" + ar(x.o) + "</span>" : "") + "</div>";
    }).join("") + "</div>" + (none ? '<div class="x-foot">' + ar(none) + " لسه من غير ترابيزة</div>" : "") + "</div>";
  }

  /* ───────── كل نوع ───────── */
  function item(it, ctx, step) {
    var fresh = (it.at || 0) === step ? " fresh" : "";
    switch (it.k) {
      case "eyebrow": return '<div class="x-eyebrow">' + esc(it.t) + "</div>";
      case "brand": return '<div class="x-brand"><span class="rx">℞</span><div><b>قبل الروشتة</b><small>ورشة السبع أسئلة لتحديد الاحتياج التدريبي</small></div></div>';
      case "title": return '<div class="x-title' + fresh + '">' + esc(it.t) + "</div>";
      case "sub": return '<div class="x-sub' + fresh + '">' + esc(it.t) + "</div>";
      case "big": return '<div class="x-big' + fresh + '"><div class="t">' + esc(it.t) + "</div>" + (it.s ? '<div class="s">' + esc(it.s) + "</div>" : "") + "</div>";
      case "quote": return '<div class="x-quote' + fresh + '"><span>' + esc(it.t) + "</span></div>";
      case "prompt": return '<div class="x-prompt"><div class="t">' + esc(it.t) + '</div><div class="s">' + esc(it.s || "") + '</div><div class="ph">📱 كل سؤال تتفقوا عليه… حد منكم يكتبه من موبايله</div></div>';
      case "duo":
        return '<div class="x-duo' + fresh + '"><div class="c"><b>' + esc(it.a.t) + "</b><span>" + esc(it.a.s) + '</span></div><div class="amp">×</div><div class="c"><b>' + esc(it.b.t) + "</b><span>" + esc(it.b.s || "؟") + "</span></div></div>" +
          (it.foot ? '<div class="x-sub">' + esc(it.foot) + "</div>" : "");
      case "task":
        return '<div class="x-task' + fresh + '"><div class="h">' + esc(it.t) + '</div><div class="row">' + it.list.map(function (x, i) { return '<span><i>' + ar(i + 1) + "</i>" + esc(x) + "</span>"; }).join("") + "</div>" + timer(it, ctx.stepAt) + "</div>";
      case "timer": return timer(it, ctx.stepAt);
      case "req":
        var mx = RX_REQ[0].n;
        return '<div class="x-req"><div class="x-h3">' + esc(it.head) + '</div>' + RX_REQ.map(function (r) {
          return '<div class="rq"><span class="l">' + esc(r.l) + '</span><span class="tr"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="n">' + ar(r.n) + "</span></div>";
        }).join("") + '<div class="x-foot">' + esc(it.foot) + "</div></div>";
      case "budget":
        return '<div class="x-budget' + fresh + '"><div class="pre">' + esc(it.t) + '</div><div class="num">' + esc(it.n) + '</div><div class="u">' + esc(it.u) + "</div>" +
          '<ul>' + it.rules.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul></div>";
      case "progress": return progress(it, ctx);
      case "picks": return picksBoard(it, ctx);
      case "wall": return wall(it, ctx);
      case "fact":
        return '<div class="x-fact' + fresh + '"><div class="n">' + esc(it.n) + '</div><div class="t">' + esc(it.t) + '</div><div class="em">' + esc(it.em) + "</div></div>";
      case "list":
        return '<div class="x-list' + fresh + '"><div class="h">' + esc(it.head) + "</div>" + it.t.map(function (x) { return "<div class=\"li\">" + esc(x) + "</div>"; }).join("") + '<div class="f">' + esc(it.foot || "") + "</div></div>";
      case "flow": return '<div class="x-flow' + fresh + ((it.at || 0) < step ? " past" : "") + (it.hot ? " hot" : "") + '"><div class="t">' + esc(it.t) + '</div><div class="s">' + esc(it.s || "") + "</div></div>";
      case "cards3":
        return '<div class="x-cards3' + fresh + '">' + it.t.map(function (c, i) { return '<div class="c" style="animation-delay:' + (i * .25) + 's"><i>' + ar(i + 1) + "</i><b>" + esc(c.h) + "</b><span>" + esc(c.s) + "</span></div>"; }).join("") + "</div>";
      case "rx":
        return '<div class="x-rx"><div class="paper"><div class="head"><span class="sym">℞</span><b>' + esc(it.title) + "</b></div>" +
          it.lines.map(function (l, i) {
            var on = l.at <= step;
            return '<div class="ln' + (on ? " on" : "") + (l.at === step ? " fresh" : "") + '"><i>' + ar(i + 1) + "</i><div><b>" + (on ? esc(l.t) : "") + "</b><span>" + (on ? esc(l.tag) : "") + "</span></div></div>";
          }).join("") + "</div></div>";
      case "map":
        return '<div class="x-map">' + it.rows.map(function (r) { return '<div class="r"><span class="a">' + esc(r.a) + '</span><span class="eq">=</span><span class="b">' + esc(r.b) + "</span></div>"; }).join("") +
          (it.foot && it.foot.at <= step ? '<div class="x-big fresh" style="margin-top:46px"><div class="t">' + esc(it.foot.t) + "</div></div>" : "") + "</div>";
      case "seven":
        var hl = it.hl && it.hl[step];
        return '<div class="x-seven' + (hl ? " has-hl" : "") + '"><div class="hd"><span></span><span>السؤال</span><span>عند الدكتور</span></div>' + SEVEN.map(function (r, i) {
          return '<div class="r' + (hl === i + 1 ? " hl" : "") + '"><span class="no">' + ar(i + 1) + '</span><span class="q">' + esc(r.q) + '</span><span class="d">' + esc(r.d) + "</span></div>";
        }).join("") + "</div>";
      case "locks":
        var open = it.open || 0;
        return '<div class="x-locks"><div class="card"><div class="ttl">بطاقة الاحتياج</div>' + SEVEN.map(function (r, i) {
          return '<div class="lr' + (i < open ? " on" : "") + '">' + lockSvg(i < open) + '<span class="no">' + ar(i + 1) + "</span><span>" + esc(r.q) + "</span></div>";
        }).join("") + (it.to && it.to.at <= step ? '<div class="to fresh">البطاقة رايحة لـ: <span>☐ المدرب</span><span>☐ البورد</span><span>☐ مسؤول الملف</span><span>☐ الجذب</span></div>' : "") + "</div>" +
          (it.rule && it.rule.at <= step ? '<div class="rule' + (it.rule.at === step ? " fresh" : "") + '">' + esc(it.rule.t) + "</div>" : "") + "</div>";
      case "next":
        return '<div class="x-next fresh"><div class="lk-big">' + lockSvg(false) + '<span>' + esc(it.n) + '</span></div><div><div class="t">' + esc(it.t) + '</div><div class="s">' + esc(it.s) + "</div></div></div>";
      case "qr":
        return '<div class="x-join"><div class="qrw"><div id="qrbox" class="qr"></div></div><div class="side"><div class="h">امسح الكود بموبايلك</div>' +
          '<div class="steps"><span><i>١</i>اكتب اسمك</span><span><i>٢</i>مدرب ولا مسؤول تنمية</span><span><i>٣</i>محافظتك</span></div>' +
          '<div class="url" id="qrurl"></div><div class="joined"><b>' + ar((ctx.agg && ctx.agg.n) || 0) + "</b> دخلوا لحد دلوقتي</div></div></div>";
      case "tables": return tables(ctx);
    }
    return "";
  }

  /* ───────── الشاشة كلها ───────── */
  function stage(sl, step, ctx) {
    var vis = visible(sl, step);
    var pins = vis.filter(isPin), body = vis.filter(function (it) { return !isPin(it); });
    var side = body.filter(function (it) { return it.col === "side"; }), main = body.filter(function (it) { return it.col !== "side"; });
    var ses = RX_SESSIONS[sl.ses] || {};
    var h = '<div class="x-top">' + pins.map(function (it) { return item(it, ctx, step); }).join("") +
      (sl.ses ? '<div class="x-ses">' + esc(ses.short || "") + "</div>" : "") + "</div>";
    if (side.length) {
      h += '<div class="x-body two"><div class="m">' + main.map(function (it) { return item(it, ctx, step); }).join("") + '</div><div class="sd">' + side.map(function (it) { return item(it, ctx, step); }).join("") + "</div></div>";
    } else {
      h += '<div class="x-body">' + main.map(function (it) { return item(it, ctx, step); }).join("") + "</div>";
    }
    return h;
  }

  /* ───────── نسخة الموبايل (نص مقروء من اللي على الشاشة) ───────── */
  function mirror(sl, step, ctx) {
    var vis = visible(sl, step), out = [];
    vis.forEach(function (it) {
      switch (it.k) {
        case "eyebrow": out.push('<div class="m-eb">' + esc(it.t) + "</div>"); break;
        case "title": out.push('<h2 class="m-t">' + esc(it.t) + "</h2>"); break;
        case "sub": out.push('<p class="m-s">' + esc(it.t) + "</p>"); break;
        case "big": case "flow": out.push('<div class="m-big">' + esc(it.t) + (it.s ? "<small>" + esc(it.s) + "</small>" : "") + "</div>"); break;
        case "quote": out.push('<div class="m-q">' + esc(it.t) + "</div>"); break;
        case "duo": out.push('<div class="m-duo"><div><b>' + esc(it.a.t) + "</b>" + esc(it.a.s) + "</div><div><b>" + esc(it.b.t) + "</b>" + esc(it.b.s || "؟") + "</div></div>"); break;
        case "task": out.push('<div class="m-card"><b>' + esc(it.t) + "</b>" + it.list.map(esc).join(" · ") + "</div>"); break;
        case "req": out.push('<div class="m-card"><b>' + esc(it.head) + "</b>" + RX_REQ.map(function (r) { return '<div class="m-row"><span>' + esc(r.l) + "</span><span>" + ar(r.n) + "</span></div>"; }).join("") + "</div>"); break;
        case "fact": out.push('<div class="m-card m-fact"><small>' + esc(it.n) + "</small>" + esc(it.t) + "<b>" + esc(it.em) + "</b></div>"); break;
        case "list": out.push('<div class="m-card"><b>' + esc(it.head) + "</b>" + it.t.map(function (x) { return "<div>• " + esc(x) + "</div>"; }).join("") + '<div class="m-s">' + esc(it.foot || "") + "</div></div>"); break;
        case "cards3": out.push(it.t.map(function (c) { return '<div class="m-card"><b>' + esc(c.h) + "</b>" + esc(c.s) + "</div>"; }).join("")); break;
        case "rx": out.push('<div class="m-card m-rx"><b>℞ ' + esc(it.title) + "</b>" + it.lines.filter(function (l) { return l.at <= step; }).map(function (l, i) { return "<div>" + ar(i + 1) + ". " + esc(l.t) + " <small>(" + esc(l.tag) + ")</small></div>"; }).join("") + "</div>"); break;
        case "map": out.push('<div class="m-card">' + it.rows.map(function (r) { return "<div>" + esc(r.a) + " = <b style=\"display:inline\">" + esc(r.b) + "</b></div>"; }).join("") + "</div>"); if (it.foot && it.foot.at <= step) out.push('<div class="m-big">' + esc(it.foot.t) + "</div>"); break;
        case "seven": out.push('<div class="m-card">' + SEVEN.map(function (r, i) { return '<div class="m-row7' + (it.hl && it.hl[step] === i + 1 ? " hl" : "") + '"><b>' + ar(i + 1) + ". " + esc(r.q) + "</b><small>" + esc(r.d) + "</small></div>"; }).join("") + "</div>"); break;
        case "locks": out.push('<div class="m-card m-locks">' + SEVEN.map(function (r, i) { return "<div>🔒 " + ar(i + 1) + ". " + esc(r.q) + "</div>"; }).join("") + "</div>"); if (it.rule && it.rule.at <= step) out.push('<div class="m-big">' + esc(it.rule.t) + "</div>"); break;
        case "next": out.push('<div class="m-big">🔒 ' + esc(it.n) + ". " + esc(it.t) + "<small>" + esc(it.s) + "</small></div>"); break;
        case "budget": out.push('<div class="m-big">' + esc(it.t) + " " + esc(it.n) + " " + esc(it.u) + "</div>"); break;
        case "prompt": out.push('<div class="m-big">' + esc(it.t) + "</div>"); break;
        case "picks":
          var A = act(ctx, it.act), cnt = A.count || {};
          out.push('<div class="m-card"><b>اختياراتنا</b>' + RX_REQ.slice().sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); }).filter(function (r) { return cnt[r.id]; }).map(function (r) { return '<div class="m-row"><span>' + esc(r.l) + "</span><span>" + ar(cnt[r.id]) + " ✓</span></div>"; }).join("") + "</div>");
          break;
      }
    });
    return out.join("");
  }

  return { visible: visible, stage: stage, mirror: mirror, tick: tick, lockSvg: lockSvg, SEVEN: SEVEN, reqLabel: reqLabel };
})();
