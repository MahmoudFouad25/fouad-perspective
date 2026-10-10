/* =====================================================================
   render.js — بيبني تقرير العميل من نتيجة المحرك + نصوص الدوك
   ---------------------------------------------------------------------
   renderReport(result, answers, items, texts, opts) ← { blocks, meta }
     result  = engine.score(...)
     answers = نفس الإجابات (شكل المحرك، أو بعد engine.normalize)
     items   = engine/items.json
     texts   = report/texts.json (بيتطلّع من الدوك بـ extract_texts.py)
     opts    = { mode: "standalone" | "insight", name: "…", contact: "…" }
   blocks: [{t:"title"|"h2"|"h3"|"p"|"li"|"pending", text}]   ← العميل بيشوف كل حاجة ما عدا "pending"
   meta:   الأقسام اللي ظهرت واللي ما ظهرتش وليه، والاقتباسات، والمشاكل اللي اتلقت وهو بيولّد.
   القواعد هنا هي نفس السطور الداخلية في الدوك (بيظهر إمتى). لو اتغيّرت هناك، تتغيّر هنا.
   ===================================================================== */
(function (root) {
  "use strict";
  var AX = ["H", "V", "A"];
  var NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };
  var FREQ = ["عمري", "نادرًا", "أحيانًا", "كتير", "دايمًا"];
  var DIM_TEXTS = { H1: "البدن (النموذج)" };   // الأبعاد اللي نصوصها اتكتبت. الباقي بيتكتب بعد اعتماد النموذج.
  var STATE_H3 = { fitra: "متزن", excess: "ماسك فيه زيادة", deficit: "سايبه شوية",
                   silent: "سايبه شوية، والمسار كله هادي (سكوت المسار)", cycle: "بيعلى وينزل" };
  var TEMPLATE_H3 = { ambiguous: "إشارات متداخلة", lean_excess: "مايل شوية ناحية إنك تمسك فيه زيادة",
                      lean_deficit: "مايل شوية ناحية إنك تسيبه", lean_both: "مايل شوية من الناحيتين", undetermined: "منطقة وسط" };

  function renderReport(R, A, items, T, opts) {
    opts = opts || {};
    var insight = opts.mode === "insight";
    var B = [], meta = { shown: [], hidden: [], quotes: [], problems: [] };
    var tx = T.texts;
    function sec(h2) { var k = Object.keys(tx).filter(function (x) { return x.indexOf(h2) !== -1; })[0]; if (!k) meta.problems.push("قسم مش موجود في الدوك: " + h2); return tx[k] || {}; }
    function part(s, h3) { var p = s[h3]; if (!p) meta.problems.push("جزء مش موجود في الدوك: " + h3); return p || { paras: [], bullets: [], insight: null, tables: [] }; }
    function secInsight(s) { var v = null; Object.keys(s).forEach(function (k) { if (s[k].insight) v = s[k].insight; }); return v && ins(v); }
    // السطر الأخضر في الدوك فيه وصف المكان، والنص نفسه بين «…»
    function ins(v) { var m = /«([\s\S]*)»/.exec(v); return m ? m[1] : v; }
    function add(t, text) { B.push({ t: t, text: text }); }
    function shown(name, why) { meta.shown.push(name + (why ? " (" + why + ")" : "")); }
    function hidden(name, why) { meta.hidden.push(name + ": " + why); }
    var used = {};

    /* ───── الاقتباسات ───── */
    var LABELS = {};
    (sec("جدول الاقتباسات")["_"] || { tables: [[]] }).tables[0].slice(1).forEach(function (r) { LABELS[r[0]] = r[1]; });
    function arNum(n) { return String(n).replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[+d]; }); }
    function noDot(s) { return s.replace(/[.،]\s*$/, ""); }
    function quoteS1(axis, which, preferOther) {
      var core = items.station1.filter(function (it) { return !it.light && !used[it.id]; });
      var hits = core.filter(function (it) {
        var a = A.triad[it.id]; if (!a || a.none) return false;
        var o = it.options.filter(function (x) { return x.id === a[which]; })[0];
        return o && o.axis === axis;
      });
      if (preferOther) {
        var pref = hits.filter(function (it) {
          var a = A.triad[it.id], k = which === "closest" ? "farthest" : "closest";
          var o = it.options.filter(function (x) { return x.id === a[k]; })[0];
          return o && o.axis === preferOther;
        });
        if (pref.length) hits = pref;
      }
      var it = hits[0];
      if (!it) return null;
      used[it.id] = 1;
      var opt = it.options.filter(function (x) { return x.id === A.triad[it.id][which]; })[0];
      var label = LABELS[arNum(it.n)];
      if (!label) { meta.problems.push("مفيش اسم قصير للموقف " + it.id); return null; }
      meta.quotes.push(it.id + " (" + which + ")");
      return which === "closest"
        ? "ولما سألناك عن " + label + "، كان أقرب حاجة ليك: «" + noDot(opt.text) + "»."
        : "ولما سألناك عن " + label + "، كان أبعد حاجة عنك: «" + noDot(opt.text) + "».";
    }
    function stmt(it) { return "«" + noDot(it.text) + "» بتحصل معاك " + FREQ[A.freq[it.id]]; }
    function topOf(list) {
      var best = null;
      list.forEach(function (it) { if (typeof A.freq[it.id] === "number" && (best === null || A.freq[it.id] > A.freq[best.id])) best = it; });
      return best;
    }
    function dimItems(d, kind) { return items.freq.filter(function (i) { return i.dim === d.id && i.kind === kind; }); }
    function quoteDim(d, kind) {
      var q = null;
      if (kind === "fitra") q = topOf(dimItems(d, "leave").concat(dimItems(d, "take")));
      else if (kind === "excess" || kind === "lean_excess_gap") q = topOf(dimItems(d, "excess"));
      else if (kind === "deficit" || kind === "lean_deficit_gap") q = topOf(dimItems(d, "deficit"));
      else if (kind === "lean_excess_tk" || kind === "lean_both") q = dimItems(d, "leave")[0];
      else if (kind === "lean_deficit_tk") q = dimItems(d, "take")[0];
      else if (kind === "cycle" || kind === "ambiguous") {
        var e = topOf(dimItems(d, "excess")), f = topOf(dimItems(d, "deficit"));
        meta.quotes.push(e.id + "، " + f.id);
        return "قلت إن " + stmt(e) + "، وإن " + stmt(f) + ".";
      }
      if (!q) return null;
      meta.quotes.push(q.id);
      return "قلت إن " + stmt(q) + ".";
    }
    function fill(paras, map) {
      var out = [];
      paras.forEach(function (p) {
        if (p === "[الاقتباس]") { if (map.quote) out.push(map.quote); return; }
        Object.keys(map).forEach(function (k) { if (k.charAt(0) === "[") p = p.split(k).join(map[k]); });
        out.push(p);
      });
      out.forEach(function (p) { if (/\[[^\]]+\]/.test(p)) meta.problems.push("قوس ما اتملاش: " + p.slice(0, 60)); });
      return out;
    }

    /* ───── العنوان ───── */
    add("title", "خريطة المحاور" + (opts.name ? ": " + opts.name : ""));

    /* ───── ١. الافتتاح ───── */
    var s1 = sec("١. الافتتاح");
    part(s1, "_").paras.forEach(function (p) { add("p", p); });
    var extra = [];
    if (R.alerts.period.on) { extra.push("فترة"); part(s1, "سطر إضافي: لو فيه تنبيه الفترة").paras.forEach(function (p) { add("p", p); }); }
    if (R.quality.validity.flag) { extra.push("احتمال تجميل"); part(s1, "سطر إضافي: لو فيه احتمال تجميل").paras.forEach(function (p) { add("p", p); }); }
    else if (R.quality.acquiescence.flag) { extra.push("إجابات متقاربة"); part(s1, "سطر إضافي: لو الإجابات كانت متقاربة").paras.forEach(function (p) { add("p", p); }); }
    if (insight && secInsight(s1)) add("p", secInsight(s1));
    shown("١. الافتتاح", extra.length ? "ومعاه سطر: " + extra.join("، ") : "من غير سطور إضافية");

    /* ───── ٢. خريطتك ───── */
    var F = R.final, weak = R.ranking.confidence === "ضعيفة" && F.source !== "الكوتش";
    var third = F.suppressed || R.ranking.order.filter(function (a) { return a !== F.main && a !== F.supporting; })[0];
    var s2 = sec("٢. خريطتك في سطر"), base = part(s2, "_");
    var AXLINE = {};
    // جملة المحور القصيرة (لحد أول «:») علشان تتحط جوه جمل تانية من غير نقطتين ورا بعض
    base.bullets.forEach(function (b) { AX.forEach(function (a) { if (b.indexOf(NAME[a] + ":") === 0) AXLINE[a] = b.slice(NAME[a].length + 1).trim().split(":")[0].replace(/\.$/, ""); }); });
    add("h2", "خريطتك في سطر");
    add("p", base.paras[0]);
    base.bullets.forEach(function (b) { add("li", b); });
    if (weak) {
      fill(part(s2, "نسخة الثقة الضعيفة").paras, { "[الأول]": NAME[R.ranking.order[0]], "[التاني]": NAME[R.ranking.order[1]] }).forEach(function (p) { add("p", p); });
      shown("٢. خريطتك", "نسخة الثقة الضعيفة");
    } else {
      fill([base.paras[1]], { "[الأقوى]": NAME[F.main], "[المساند]": NAME[F.supporting], "[الهادي]": NAME[third] }).forEach(function (p) { add("p", p); });
      shown("٢. خريطتك");
    }

    /* ───── ٣. الأقوى ───── */
    var s3 = sec("٣. مسارك الأقوى");
    add("h2", weak ? "أقوى مسارين عندك" : "مسارك الأقوى");
    (weak ? R.ranking.order.slice(0, 2) : [F.main]).forEach(function (ax) {
      if (weak) add("h3", NAME[ax]);
      fill(part(s3, NAME[ax]).paras, { quote: quoteS1(ax, "closest", third) }).forEach(function (p, k) {
        // الثقة الضعيفة: أول جملة بتقول «أقوى مسار عندك غالبًا هو …»، فبتتبدل علشان ما تتقالش لمحورين
        if (weak && k === 0) p = p.replace("أقوى مسار عندك غالبًا هو " + NAME[ax] + ".", NAME[ax] + " غالبًا واحد من أقوى مسارين عندك.");
        add("p", p);
      });
    });
    if (insight && secInsight(s3)) add("p", secInsight(s3));
    shown("٣. الأقوى", weak ? "نصين لأن الثقة ضعيفة" : NAME[F.main]);

    /* ───── ٤. المساند ───── */
    if (weak) hidden("٤. المساند", "الثقة ضعيفة، فالأقوى اتعرض لمسارين");
    else {
      var s4 = sec("٤. مسارك المساند");
      add("h2", "مسارك المساند");
      var q4 = quoteS1(F.supporting, "closest");
      fill(part(s4, NAME[F.supporting]).paras, { quote: q4 }).forEach(function (p) { add("p", p); });
      shown("٤. المساند", NAME[F.supporting] + (q4 ? "" : "، من غير اقتباس (مفيش موقف أساسي فاضل اختاره فيه الأقرب)"));
    }

    /* ───── ٥. الهادي ───── */
    var s5 = sec("٥. مسارك الهادي"), st5 = F.source === "الكوتش" ? "مؤكد" : R.suppressed.status;
    add("h2", "مسارك الهادي");
    if (st5 === "مؤكد") {
      fill(part(s5, "مؤكد: " + NAME[F.suppressed]).paras, { quote: quoteS1(F.suppressed, "farthest") }).forEach(function (p) { add("p", p); });
      shown("٥. الهادي", "مؤكد: " + NAME[F.suppressed]);
    } else if (st5 === "الأضعف بس") {
      fill(part(s5, "الأضعف بس (للتلات محاور)").paras, { quote: quoteS1(R.suppressed.axis, "farthest"), "[اسم المحور]": NAME[R.suppressed.axis], "[جملة المحور من القسم ٢]": AXLINE[R.suppressed.axis] })
        .forEach(function (p) { add("p", p); });
      shown("٥. الهادي", "الأضعف بس: " + NAME[R.suppressed.axis]);
    } else if (R.suppressed.alternatives.length === 1) {
      // الدوك: لو الاحتمالات محور واحد بس، يتكتب «الأضعف بس» بالمحور ده
      var one = R.suppressed.alternatives[0];
      fill(part(s5, "الأضعف بس (للتلات محاور)").paras, { quote: quoteS1(one, "farthest"), "[اسم المحور]": NAME[one], "[جملة المحور من القسم ٢]": AXLINE[one] })
        .forEach(function (p) { add("p", p); });
      shown("٥. الهادي", "غير محسوم باحتمال واحد، فاتكتب «الأضعف بس»: " + NAME[one]);
    } else {
      var alts = R.suppressed.alternatives.slice(0, 2), u = part(s5, "غير محسوم (الاحتمالين)");
      if (!weak && alts.indexOf(F.supporting) !== -1) meta.problems.push("تعارض: «" + NAME[F.supporting] + "» اتقال إنه المساند في القسم ٤، وهو كمان واحد من احتمالين الهادي في القسم ٥. وجملة الترتيب في القسم ٢ قالت إن الأهدى «" + NAME[third] + "»");
      add("p", fill([u.paras[0]], { "[المحور الأول]": NAME[alts[0]], "[المحور التاني]": NAME[alts[1]] })[0]);
      u.bullets.forEach(function (b) { alts.forEach(function (a) { if (b.indexOf("لو " + (a === "V" ? "هي " : "هو ") + NAME[a]) === 0) add("li", b); }); });
      add("p", u.paras[1]);
      shown("٥. الهادي", "غير محسوم: " + alts.map(function (a) { return NAME[a]; }).join(" أو "));
    }
    if (insight && secInsight(s5)) add("p", secInsight(s5));

    /* ───── ٦. الأبعاد ───── */
    var s6 = sec("٦. أبعادك"), tmpl = sec("قوالب عامة لأي بُعد");
    var DIMLINE = {};
    (part(s6, "جملة كل بُعد (بتظهر تحت اسمه في أي مكان)").tables[0] || []).slice(1).forEach(function (r) { DIMLINE[r[0]] = r[2]; });
    var dims = R.dimensions.slice();
    function rank(list, f) { return list.sort(function (x, y) { return f(y) - f(x); }); }
    var pick = [];
    pick = pick.concat(rank(dims.filter(function (d) { return d.reportStatus === "cycle"; }), function (d) { return d.E + d.D; }));
    pick = pick.concat(rank(dims.filter(function (d) { return d.reportStatus === "excess"; }), function (d) { return d.E; }));
    pick = pick.concat(rank(dims.filter(function (d) { return d.reportStatus === "deficit"; }), function (d) { return d.D; }));
    pick = pick.concat(rank(dims.filter(function (d) { return d.reportStatus === "fitra"; }), function (d) { return (d.T || 0) + (d.K || 0); }));
    pick = pick.slice(0, 3);
    if (pick.length < 2) pick = pick.concat(rank(dims.filter(function (d) { return /^lean_(excess|deficit)$/.test(d.reportStatus); }), function (d) { return Math.abs(d.E - d.D); }).slice(0, 2 - pick.length));
    if (!pick.length) pick = dims.filter(function (d) { return d.reportStatus === "ambiguous"; }).slice(0, 1);
    add("h2", "أبعادك");
    part(s6, "_").paras.forEach(function (p) { add("p", p); });
    var firstStep = null, dimShown = [];
    pick.forEach(function (d) {
      add("h3", d.name);
      var st = d.reportStatus, paras;
      if (!TEMPLATE_H3[st]) add("p", DIMLINE[d.name] || "");   // القوالب فيها جملة البُعد جواها
      if (TEMPLATE_H3[st]) {
        var tk = (st === "lean_excess" || st === "lean_deficit") ? (d.leanBy === "فرق الإفراط والتفريط" ? "_gap" : "_tk") : "";
        paras = fill(part(tmpl, TEMPLATE_H3[st]).paras, { quote: st === "undetermined" ? null : quoteDim(d, st + tk), "[البُعد]": d.name, "[جملته]": stripDot(DIMLINE[d.name]) });
        paras.forEach(function (p) { add("p", p); });
        dimShown.push(d.name + " ← قالب «" + TEMPLATE_H3[st] + "»");
      } else if (DIM_TEXTS[d.id]) {
        var key = st === "deficit" && d.silentPath ? "silent" : st;
        paras = fill(part(sec(DIM_TEXTS[d.id]), STATE_H3[key]).paras, { quote: quoteDim(d, st) });
        paras.forEach(function (p) { add("p", p); });
        var stp = paras.filter(function (p) { return p.indexOf("خطوة صغيرة للأسبوع ده:") === 0; })[0];
        if (stp && !firstStep && d === pick[0]) firstStep = stp.replace("خطوة صغيرة للأسبوع ده:", "").trim();
        dimShown.push(d.name + " ← «" + STATE_H3[key] + "»");
      } else {
        add("pending", "[نص «" + d.name + " — " + d.reportLabel + "» لسه ما اتكتبش. بيتكتب بعد اعتماد نموذج البدن.]");
        dimShown.push(d.name + " ← «" + d.reportLabel + "» (نصه لسه ما اتكتبش)");
        meta.problems.push("نص «" + d.name + " — " + d.reportLabel + "» لسه ما اتكتبش");
      }
    });
    add("h3", "الأبعاد التسعة في سطر");
    R.dimensions.forEach(function (d) { add("li", NAME[d.axis] + " · " + d.name + ": " + d.clientWord); });
    var ins6 = secInsight(tmpl) || secInsight(s6);
    if (insight && ins6) add("p", ins6);
    shown("٦. الأبعاد", dimShown.join(" · "));

    /* ───── ٧. الموجات والميل ───── */
    var s7 = sec("٧. موجاتك وميلك"), hiC = AX.filter(function (a) { return R.cycles[a].high; });
    add("h2", hiC.length ? "موجاتك وميلك" : "ميلك");
    if (hiC.length) {
      part(s7, "_").paras.forEach(function (p) { add("p", p); });
      hiC.forEach(function (a) {
        var c = topOf(items.freq.filter(function (i) { return i.kind === "cycle" && i.axis === a; }));
        meta.quotes.push(c.id);
        fill(part(s7, "موجة " + NAME[a]).paras, { quote: "قلت إن " + stmt(c) + "." }).forEach(function (p) { add("p", p); });
      });
    }
    var tp = part(s7, "ميلك: الأسئلة التلاتة");
    add("p", tp.paras[0]);
    var mid = false;
    items.bipolar.forEach(function (b, k) {
      var t = R.tension[b.axis]; if (!t || !t.side) return;
      add("h3", tp.paras[k + 1]);
      var pre = t.side === "أ" ? "أ:" : t.side === "ب" ? "ب:" : "النص:";
      if (t.side === "النص") mid = true;
      var line = tp.bullets.slice(k * 3, k * 3 + 3).filter(function (x) { return x.indexOf(pre) === 0; })[0];
      add("p", line.slice(pre.length).trim());
    });
    if (insight && mid && tp.insight) add("p", ins(tp.insight));
    shown("٧. " + (hiC.length ? "موجاتك وميلك" : "ميلك"), hiC.length ? "موجات: " + hiC.map(function (a) { return NAME[a]; }).join("، ") : "مفيش دايرة عالية، فالموجات ما ظهرتش");

    /* ───── ٨. الضغط ───── */
    var s8 = sec("٨. لما الضغط يزيد"), hiF = AX.filter(function (a) { return R.station7.fear[a].high; });
    var alertOn = R.alerts.freeze.on || R.alerts.depletion.on || R.alerts.mood.on;
    if (!hiF.length && !alertOn) hidden("٨. لما الضغط يزيد", "مفيش قلق عالي ولا أي تنبيه");
    else {
      add("h2", "لما الضغط يزيد");
      part(s8, "_").paras.forEach(function (p) { add("p", p); });
      var fearWhich = null;
      if (hiF.length === 3) fearWhich = "أكتر من مساحة";
      else if (hiF.length) {
        fearWhich = NAME[hiF.slice().sort(function (x, y) {
          return R.station7.fear[y].mean - R.station7.fear[x].mean || R.ranking.order.indexOf(x) - R.ranking.order.indexOf(y);
        })[0]];
      }
      if (fearWhich) part(s8, "القلق اللي بيحرك: " + fearWhich).paras.forEach(function (p) { add("p", p); });
      if (alertOn) {
        var g = part(s8, "الرسالة الواحدة اللطيفة");
        add("p", g.paras[0]);
        if (insight) add("p", ins(g.insight));
        else add("p", g.paras[1].replace("[النسخة المنفردة]", "").trim().split("[طريقة التواصل]").join(opts.contact || "(هنا هتظهر طريقة التواصل)"));
      }
      shown("٨. لما الضغط يزيد", [fearWhich ? "قلق: " + fearWhich : null, alertOn ? "الرسالة اللطيفة (" + ["freeze", "depletion", "mood"].filter(function (k) { return R.alerts[k].on; }).join("، ") + ")" : null].filter(Boolean).join(" + "));
    }

    /* ───── ٩. خطوة ───── */
    var s9 = sec("٩. خطوة واحدة للأسبوع ده"), why9 = "من أول بُعد بالتفصيل";
    if (!firstStep) {
      why9 = "خطوة بديلة من المسار الأقوى (أول بُعد ما عندوش خطوة مكتوبة)";
      var alt = part(s9, "خطوات بديلة حسب المسار الأقوى").bullets.filter(function (b) { return b.indexOf(NAME[F.main] + ":") === 0; })[0];
      firstStep = alt ? alt.slice(NAME[F.main].length + 1).trim() : "";
    }
    add("h2", "خطوة واحدة للأسبوع ده");
    fill(part(s9, "_").paras, { "[الخطوة]": firstStep }).forEach(function (p) { add("p", p); });
    shown("٩. خطوة", why9);

    /* ───── ١٠. الختام ───── */
    var s10 = sec("١٠. الختام");
    add("h2", "في الآخر");
    part(s10, insight ? "نسخة البصيرة الحكيمة" : "النسخة المنفردة").paras.forEach(function (p) { add("p", p); });
    part(s10, "سؤال آخر التقرير (للنسختين)").paras.forEach(function (p) { add("p", p); });
    shown("١٠. الختام", insight ? "نسخة البصيرة" : "النسخة المنفردة");

    // فحوصات: جملة مكررة، وقوس فاضل
    var seen = {};
    B.forEach(function (b) {
      if (b.t !== "p") return;
      if (seen[b.text]) meta.problems.push("جملة مكررة: " + b.text.slice(0, 50));
      seen[b.text] = 1;
      if (b.t !== "pending" && /\[[^\]]+\]/.test(b.text)) meta.problems.push("قوس فاضل: " + b.text.slice(0, 50));
    });
    meta.words = B.filter(function (b) { return b.t !== "pending"; }).reduce(function (s, b) { return s + b.text.split(/\s+/).filter(Boolean).length; }, 0);
    return { blocks: B, meta: meta };
  }
  function stripDot(s) { return (s || "").replace(/\.\s*$/, ""); }

  var API = { renderReport: renderReport };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AxesV2Report = API;
})(typeof self !== "undefined" ? self : this);
