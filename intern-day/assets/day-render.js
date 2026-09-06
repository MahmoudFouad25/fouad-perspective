/* =====================================================================
   day-render.js — محرّك رسم الشرايح
   منظومة يوم الاستقبال · «إنت بتردّ على إيه؟»
   ---------------------------------------------------------------------
   شاشة العرض وصفحة المعاينة الاتنين بيستعملوا الملف ده، فأي تحسين
   في شكل شريحة بيبان في المكانين على طول.

   ⚑ قاعدة أمان مهمة:
     المحتوى اللي جوّه day-content.js إحنا اللي كاتبينه، فمسموح فيه
     وسوم بسيطة (<b> <em> <br>) وبتتحطّ زي ما هي.
     أي محتوى جايّ من قاعدة البيانات — بطاقات العتبة، سحابة الكلمات،
     جداول الأركان، حيطة الدفعة، الأسامي — بيعدّي على esc() إجبارياً.
     الفرق ده مقصود، ومكتوب جنب كل سطر بيستعمل esc.
   ===================================================================== */

var DayRender = (function () {
  "use strict";

  /* ───────── جوّ كل حركة ─────────
     لكل حركة من العشرة عمق ولون. الشاشة بتتنقّل بينهم لوحدها على مدى
     اليوم، فالقاعة بتحسّ إن اليوم بيتحرّك حتى وهي ساكتة. */
  var THEMES = {
    1:  { h1:"#0e1930", h2:"#1c2c4c", glow:"#3f63a4", accent:"#7fb2e8" },
    2:  { h1:"#161029", h2:"#271b46", glow:"#6a49a8", accent:"#b294e8" },
    3:  { h1:"#26101a", h2:"#3d1a2b", glow:"#8f3355", accent:"#ef7a9a" },
    4:  { h1:"#0b2321", h2:"#134039", glow:"#2b8578", accent:"#63d6c0" },
    5:  { h1:"#241a0e", h2:"#3d2c14", glow:"#9a6a1e", accent:"#e8b93f" },
    6:  { h1:"#0f1c26", h2:"#173242", glow:"#2d6c8c", accent:"#63b3e0" },
    7:  { h1:"#10241a", h2:"#1a4030", glow:"#2f8a58", accent:"#7fc98a" },
    8:  { h1:"#26180f", h2:"#3f2a18", glow:"#a05a2c", accent:"#f0a068" },
    9:  { h1:"#111a30", h2:"#1c2b4e", glow:"#3f5aa8", accent:"#8fa8ee" },
    10: { h1:"#0a0a0e", h2:"#141018", glow:"#3a2c44", accent:"#e8d4a0" },
    0:  { h1:"#0b0b12", h2:"#151520", glow:"#33334a", accent:"#c9c2b8" }
  };

  /* جوّه الحركة السادسة، الجوّ بياخد لون الباب اللي بنتكلّم فيه */
  var DOOR_TINT = {
    A:{ h1:"#241a0e", h2:"#3d2c14", glow:"#9a6a1e", accent:"#e8b93f" },
    B:{ h1:"#26140e", h2:"#41231a", glow:"#a04a2c", accent:"#ef7a5f" },
    C:{ h1:"#0f2418", h2:"#183d29", glow:"#2f8a52", accent:"#7fc98a" }
  };

  /* السواد الحقيقي — تجربة الصوت، والختام كله */
  var VOID_STATES = { S07:1, S68:1, S69:1, S70:1, S71:1, S72:1 };

  var AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  function ar(n){ return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }

  /* esc — للمحتوى الجايّ من قاعدة البيانات وبس */
  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  /* raw — للمحتوى اللي إحنا كاتبينه في day-content.js */
  function raw(s){ return (s === undefined || s === null) ? "" : String(s); }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function blank(holder){ holder.innerHTML = ""; }

  /* ───────── الغلاف الموحّد لكل شريحة ─────────
     كيكر فوق · المحتوى · قدم تحت. الترتيب ده مش بيتغيّر أبداً. */
  function frame(sl, inner) {
    var h = "";
    if (sl.kicker) h += '<div class="kicker in">' + raw(sl.kicker) + "</div>";
    h += inner;
    if (sl.foot) h += '<div class="foot in" style="animation-delay:.34s">' + raw(sl.foot) + "</div>";
    return h;
  }

  /* عرض الحاوية حسب نوع الشريحة */
  var WIDE = { three:1, grid3:1, vs:1, misread:1, rules:1, "body":1, exl:1, trans:1,
               blame:1, drill:1, steps:1, scene:1, cloud:1, chain:1, card:1, wall:1, term:1 };
  var FULL = { tables:1, models:1 };

  var wallTimer = null, wallIdx = 0, wallData = [];

  /* ═════════════════════════════════════════════════════
     المدخل الوحيد
     ═════════════════════════════════════════════════════ */
  function render(o) {
    var st = o.state, sl = o.slide || { k:"black" }, pl = o.payload || {};
    var holder = o.holder, stage = o.stage;

    if (wallTimer) { clearInterval(wallTimer); wallTimer = null; }

    var mvNo = dayMovementNo(st);
    var door = sl.door || null;

    /* الجوّ */
    var t = (door && DOOR_TINT[door]) || THEMES[mvNo] || THEMES[0];
    var r = document.documentElement.style;
    r.setProperty("--h1", t.h1); r.setProperty("--h2", t.h2);
    r.setProperty("--glow", t.glow); r.setProperty("--accent", t.accent);

    /* السواد */
    var isVoid = !!(VOID_STATES[st.id] || sl["void"]);
    if (stage) stage.classList.toggle("void", isVoid);

    /* اللافتة والسكّة */
    if (o.eyebrow) {
      if (isVoid || !mvNo) o.eyebrow.innerHTML = "";
      else {
        var e = '<span class="dot"></span><span>' + raw(DAY_MOVEMENTS[mvNo - 1] || "") + "</span>";
        if (door) e = '<span class="chip d-' + door + '" style="background:var(--door-' +
                      door.toLowerCase() + ')">' + (DAY_CORNERS[door] || "") + "</span>" + e;
        o.eyebrow.innerHTML = e;
      }
    }
    if (o.rail) {
      var kids = o.rail.children;
      for (var i = 0; i < kids.length; i++)
        kids[i].className = (i + 1 < mvNo ? "done" : (i + 1 === mvNo ? "now" : ""));
    }

    /* الرسم */
    var body = build(sl, pl, o);
    if (body === null) return blank(holder);

    holder.className = "sg" + (FULL[sl.k] ? " full" : (WIDE[sl.k] ? " wide" : ""));
    holder.innerHTML = '<div class="in">' + body + "</div>";

    if (sl.k === "wall") startWall(pl, holder);
  }

  /* ═════════════════════════════════════════════════════
     بناء المكوّنات
     ═════════════════════════════════════════════════════ */
  function build(sl, pl, o) {
    switch (sl.k) {

      /* ── سواد ── */
      case "black": return null;

      /* ── انتظار مصمّم: استراحة · قبل الكشف · لحظات الموبايل ── */
      case "hold":
        if (!sl.h && !sl.s) return null;
        return '<div class="hold">' +
          (sl.ic ? '<div class="ic">' + raw(sl.ic) + "</div>" : "") +
          (sl.h ? '<div class="h in">' + raw(sl.h) + "</div>" : "") +
          (sl.s ? '<div class="s in" style="animation-delay:.2s">' + raw(sl.s) + "</div>" : "") +
        "</div>";

      /* ── عنوان حركة ── */
      case "title":
        return '<div class="title-sl">' +
          (sl.n ? '<div class="n">' + raw(sl.n) + "</div>" : "") +
          '<div class="nm in">' + raw(sl.name) + "</div>" +
          (sl.thesis ? '<div class="th in" style="animation-delay:.22s">' + raw(sl.thesis) + "</div>" : "") +
        "</div>";

      /* ── سطور ── */
      case "lines":
        return frame(sl,
          '<div class="hr"></div><div class="ln sz-' + (sl.size || "lg") +
          (sl.lines.length > 2 ? " wide" : "") + '">' +
          sl.lines.map(function (t, i) {
            return '<div class="in" style="animation-delay:' + (i * .18) + 's">' + raw(t) + "</div>";
          }).join("") + "</div>");

      /* ── اقتباس ── */
      case "quote":
        return frame(sl,
          '<div class="quote' + (sl.sm ? " sm" : "") + '">' +
            '<span class="qm">”</span>' +
            '<div class="t">' + raw(sl.text) + "</div>" +
            (sl.sub ? '<div class="sub in" style="animation-delay:.28s">' + raw(sl.sub) + "</div>" : "") +
            (sl.who ? '<div class="who">' + raw(sl.who) + "</div>" : "") +
          "</div>");

      /* ── سؤال ── */
      case "ask":
        return frame(sl,
          '<div class="ask"><div class="mark">؟</div>' +
          '<div class="q">' + raw(sl.q) + "</div></div>");

      /* ── مصطلح ── */
      case "term":
        return frame(sl,
          '<div class="term"><span class="w">' + raw(sl.w) + "</span>" +
          sl.defs.map(function (d, i) {
            return '<p class="in" style="animation-delay:' + (.14 + i * .12) + 's">' + raw(d) + "</p>";
          }).join("") + "</div>");

      /* ── بطاقة الباب ── */
      case "door":
        return '<div class="doorcard d-' + sl.door + '">' +
          '<div class="letter">' + raw(sl.letter) + "</div>" +
          '<div class="nm in" style="animation-delay:.14s">' + raw(sl.name) + "</div>" +
          (sl.line ? '<div class="ds in" style="animation-delay:.3s">' + raw(sl.line) + "</div>" : "") +
        "</div>";

      /* ── بطاقة الحركة (أ١ · ب٢ · ج٣) ── */
      case "move":
        return '<div class="movecard d-' + sl.door + '">' +
          '<div class="code">' + raw(sl.code) + "</div>" +
          '<div class="nm in" style="animation-delay:.16s">' + raw(sl.name) + "</div>" +
        "</div>";

      /* ── التوقيع الجسدي ── */
      case "body":
        return frame(sl,
          '<div class="body-sig d-' + (sl.door || "N") + '">' +
          sl.items.map(function (x, i) {
            return '<div class="in" style="animation-delay:' + (i * .14) + 's">' +
                   '<span class="p">' + raw(x.p) + "</span>" +
                   '<div class="t">' + raw(x.t) + "</div></div>";
          }).join("") + "</div>");

      /* ── أمثلة من الحياة ── */
      case "exl":
        return frame(sl,
          '<div class="exl">' + sl.items.map(function (x, i) {
            return '<div class="in" style="animation-delay:' + (i * .13) + 's"><i></i><span>' +
                   raw(x) + "</span></div>";
          }).join("") + "</div>");

      /* ── الترجمة التلقائية ── */
      case "trans":
        return frame(sl,
          '<div class="trans d-' + (sl.door || "N") + '">' +
            '<div class="lab">الترجمة التلقائية</div>' +
            '<div class="box">' +
              (sl.pre ? '<div class="pre">' + raw(sl.pre) + "</div>" : "") +
              '<div class="t">' + raw(sl.t) + "</div>" +
              (sl.becomes ? '<div class="becomes in" style="animation-delay:.3s">' +
                            raw(sl.becomes) + "</div>" : "") +
            "</div></div>");

      /* ── سوء الفهم ── */
      case "misread":
        return frame(sl,
          '<div class="misread">' +
            '<div class="side a in"><div class="lab">' + raw(sl.a.lab) + "</div>" +
              '<div class="t">' + raw(sl.a.t) + "</div></div>" +
            '<div class="arrow">←</div>' +
            '<div class="side b in" style="animation-delay:.2s"><div class="lab">' + raw(sl.b.lab) +
              '</div><div class="t">' + raw(sl.b.t) + "</div></div>" +
          "</div>");

      /* ── الاتهام ── */
      case "blame":
        return frame(sl,
          '<div class="blame">' +
            '<div class="said">' + sl.said.map(function (x, i) {
              return '<b class="in" style="animation-delay:' + (i * .12) + 's">«' + raw(x) + "»</b>";
            }).join("") + "</div>" +
            '<div class="truth in" style="animation-delay:1.3s">' +
              sl.truth.map(function (x) { return "<span>" + raw(x) + "</span>"; }).join("") +
            "</div></div>");

      /* ── التمرين ── */
      case "drill":
        return frame(sl,
          '<div class="drill"><div class="box">' +
            '<div class="lab">' + raw(sl.lab || "التمرين — تعمله بكرة") + "</div>" +
            '<div class="t">' + raw(sl.t) + "</div>" +
            (sl.sub ? '<div class="sub in" style="animation-delay:.3s">' + raw(sl.sub) + "</div>" : "") +
          "</div></div>");

      /* ── تلاتة متوازيين ── */
      case "three":
        return frame(sl,
          '<div class="three">' + sl.items.map(function (x, i) {
            var bare = !x.t;
            return '<div class="t-' + (x.tone || "gold") + ' in' + (bare ? " bare" : "") +
                   '" style="animation-delay:' + (i * .13) + 's">' +
                   (bare
                     ? '<div class="n">' + raw(x.n) + "</div><div class=\"h\">" + raw(x.h) + "</div>"
                     : '<div class="rowtop"><div class="n">' + raw(x.n) + "</div>" +
                       '<div class="h">' + raw(x.h) + "</div></div>" +
                       '<div class="t">' + raw(x.t) + "</div>") +
                   "</div>";
          }).join("") + "</div>");

      /* ── مقارنة اتنين ── */
      case "vs":
        return frame(sl, '<div class="vs">' + ["a", "b"].map(function (k, i) {
          var s = sl[k];
          return '<div class="t-' + (s.tone || (i ? "warn" : "ok")) + ' in" style="animation-delay:' +
                 (i * .18) + 's"><div class="h">' + raw(s.h) + "</div>" +
                 '<div class="t">' + raw(s.t) + "</div>" +
                 (s.t2 ? '<div class="t">' + raw(s.t2) + "</div>" : "") + "</div>";
        }).join("") + "</div>");

      /* ── قواعد مرقّمة ── */
      case "rules":
        return frame(sl,
          '<div class="rules' + (sl.tone ? " t-" + sl.tone : "") + '">' +
          sl.items.map(function (x, i) {
            return '<div class="in" style="animation-delay:' + (i * .14) + 's"><i>' + ar(i + 1) + "</i>" +
                   '<div><div class="h">' + raw(x.h) + "</div>" +
                   (x.t ? '<div class="t">' + raw(x.t) + "</div>" : "") + "</div></div>";
          }).join("") + "</div>");

      /* ── شبكة الأبواب التلاتة ── */
      case "grid3":
        return frame(sl,
          '<div class="grid3">' + sl.items.map(function (x, i) {
            return '<div class="d-' + x.door + ' in" style="animation-delay:' + (i * .14) + 's">' +
              '<div class="hd"><b>' + (DAY_CORNERS[x.door] || "") + "</b><span>" + raw(x.h) + "</span></div>" +
              (x.t ? '<div class="t">' + raw(x.t) + "</div>" : "") +
              (x.t2 ? '<div class="t">' + raw(x.t2) + "</div>" : "") + "</div>";
          }).join("") + "</div>");

      /* ── الخطوات ── */
      case "steps":
        return frame(sl,
          '<div class="steps">' + sl.items.map(function (x, i) {
            var txt = (typeof x === "string") ? x.replace(/^[٠-٩0-9]+[.．]\s*/, "") : x.t;
            var key = (typeof x === "object" && x.key) ? " key" : "";
            return '<div class="in' + key + '" style="animation-delay:' + (i * .16) + 's"><i>' +
                   ar(i + 1) + '</i><div class="t">' + raw(txt) + "</div></div>";
          }).join("") + "</div>" +
          (sl.cap ? '<div class="steps-cap in" style="animation-delay:.6s">' + raw(sl.cap) + "</div>" : ""));

      /* ═════ المكوّنات الحيّة — كل نصّ جايّ من قاعدة البيانات بيعدّي على esc ═════ */

      case "counter": {
        var c = pl.count || 0, seats = "";
        for (var i2 = 0; i2 < (o.expected || 36); i2++) seats += '<i class="' + (i2 < c ? "f" : "") + '"></i>';
        return '<div class="counter"><div class="ring"><div class="n">' + ar(c) + "</div></div>" +
               "<small>اللي دخلوا</small>" +
               '<div class="seats">' + seats + "</div>" +
               (sl.cap ? '<div class="foot">' + raw(sl.cap) + "</div>" : "") + "</div>";
      }

      case "chain": {
        var n = sl.n || 0, parts = [];
        DAY_CHAIN.forEach(function (w, i) {
          if (i) parts.push("<i>←</i>");
          var cl = i < n ? (i === n - 1 && n === DAY_CHAIN.length ? "on last" : "on") : "";
          parts.push('<span class="' + cl + '">' + w + "</span>");
        });
        return '<div class="chain">' + parts.join(" ") + "</div>" +
               (sl.cap ? '<div class="chain-cap in" style="animation-delay:.5s">' + raw(sl.cap) + "</div>" : "");
      }

      case "card": {
        var cd = pl.card || {};
        if (!cd.said) return null;
        /* ⚑ esc — ده كلام كتبه مشارك */
        var h = '<div class="part"><div class="lab">اللي قلته</div><div class="txt">' +
                esc(cd.said) + "</div></div>";
        if (sl.mode === "full" && cd.replied)
          h += '<div class="part rep in"><div class="lab">واللي رجع لي</div><div class="txt">' +
               esc(cd.replied) + "</div></div>";
        return '<div class="card">' + h +
               (sl.mode === "face" && sl.hint ? '<div class="hint in" style="animation-delay:.5s">' +
                 raw(sl.hint) + "</div>" : "") + "</div>";
      }

      case "cloud": {
        var w2 = (pl.cloud || []).slice();
        if (!w2.length) return null;
        shuffle(w2);
        var sizes = [3.9, 2.7, 5.1, 3.2, 2.3, 4.4, 2.9, 3.6];
        var tints = ["#ffffff", "var(--accent)", "#ffffff", "#d8d2ea", "#ffffff", "var(--accent)"];
        return '<div class="cloud">' + w2.map(function (x, i) {
          var sz = sizes[i % sizes.length];
          /* ⚑ esc — كلمات كتبها المشاركون */
          return "<b style=\"font-size:clamp(1.35rem," + sz + "vw," + (sz * 1.05) + "rem);" +
                 "color:" + tints[i % tints.length] + ";animation-delay:" + (i * .06) + 's">' +
                 esc(x) + "</b>";
        }).join("") + "</div>" +
        (sl.cap ? '<div class="cloud-cap in" style="animation-delay:1.2s">' + raw(sl.cap) + "</div>" : "");
      }

      case "big": {
        var bn = pl.bigN || 0, bo = pl.bigOf || (o.expected || 36);
        return '<div class="big"><div class="n">' + ar(bn) + "</div>" +
               "<small>من " + ar(bo) + "</small>" +
               '<div class="bar"><u style="width:' + (bo ? (bn / bo * 100) : 0) + '%"></u></div>' +
               (sl.cap ? '<div class="cap in" style="animation-delay:.9s">' + raw(sl.cap) + "</div>" : "") +
               "</div>";
      }

      case "scene":
        return '<div class="scene">' +
          (sl.lab ? '<div class="sc-lab in">' + raw(sl.lab) + "</div>" : "") +
          '<h2 class="in" style="animation-delay:.1s">' + raw(sl.title) + "</h2>" +
          '<div class="opts">' + sl.opts.map(function (op, i) {
            var d = ["A", "B", "C"][i] || "A";
            return '<div class="opt d-' + d + ' in" style="animation-delay:' + (.24 + i * .13) + 's">' +
                   "<b>" + raw(op.c) + "</b><span>" + raw(op.t) + "</span></div>";
          }).join("") + "</div></div>";

      case "tables": {
        var tb = pl.tables || [];
        if (!tb.length) return null;
        return '<div class="tables">' + tb.map(function (x, i) {
          /* ⚑ esc — كتابة المتحدّثين */
          return '<div class="d-' + x.door + ' in" style="animation-delay:' + (i * .14) + 's">' +
            "<h3>" + (DAY_CORNERS[x.door] || "") + " · " + (DAY_DOOR_NAMES[x.door] || "") + "</h3>" +
            "<p><b>أدّانا</b>" + esc(x.gift) + "</p>" +
            "<p><b>بياخد مننا</b>" + esc(x.cost) + "</p>" +
            "<p><b>بنفوّت</b>" + esc(x.missed) + "</p></div>";
        }).join("") + "</div>";
      }

      case "wall":
        wallData = pl.wall || [];
        return wallData.length ? '<div id="wallSlot"></div>' : null;

      case "ayah":
        return '<div class="ayah">﴿ وَلَقَدْ كَرَّمْنَا بَنِي آدَمَ ﴾</div>';

      case "dots":
        return '<div class="circles"><i class="f"></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
               '<div class="note">اللي شفناه النهاردة: مرآة واحدة.</div>';

      case "models":
        return '<div class="models">' + DAY_MODELS.map(function (m, i) {
          var d = ["A", "B", "C"][i];
          return '<div class="d-' + d + ' in" style="animation-delay:' + (i * .14) + 's">' +
            m.map(function (l, j) { return j === 0 ? "<b>" + raw(l) + "</b>" : raw(l); }).join("<br>") +
            "</div>";
        }).join("") + "</div>" +
        (sl.cap ? '<div class="models-cap">' + raw(sl.cap) + "</div>" : "");

      default: return null;
    }
  }

  /* حيطة الدفعة — بتقلّب لوحدها كل تسع ثواني */
  function startWall(pl, holder) {
    wallIdx = 0;
    show();
    wallTimer = setInterval(show, 9000);
    function show() {
      var slot = holder.querySelector("#wallSlot");
      if (!slot || !wallData.length) return;
      var w = wallData[wallIdx % wallData.length];
      var dots = wallData.slice(0, 14).map(function (x, i) {
        return '<i class="' + (i === (wallIdx % wallData.length) ? "on" : "") + '"></i>';
      }).join("");
      wallIdx++;
      /* ⚑ esc — أسامي وأوراق المشاركين */
      slot.innerHTML = '<div class="wall">' +
        '<div class="who">' + esc(w.name || "من الدفعة") + "</div>" +
        w.lines.filter(Boolean).map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") +
        '</div><div class="wall-dots">' + dots + "</div>";
    }
  }

  return { render: render, blank: blank, build: build, ar: ar, esc: esc, THEMES: THEMES,
           DOOR_TINT: DOOR_TINT, VOID_STATES: VOID_STATES };
})();
