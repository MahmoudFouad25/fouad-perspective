/* =====================================================================
   coach.js — ورقة الكوتش لمتطوع واحد (بتظهر في صفحة أدمن «ميزان المتطوع» بس، والمتطوع ما بيشوفهاش)
   نسخة لوحدها من three-axes/v2/report/coach.js (ما اتلمسش)، ومعاها قسم «٥. التطوع».
   renderCoach(result, answers, items, coachTexts, opts) ← blocks
     opts = { name, timing: {"1":{startedAt,endedAt}…}, rating: {value, note}, address: "m" | "f" }
     address "f": الورقة بتقول «المتطوعة» بدل «المتطوع» (وأفعالها). وأسئلة الجلسة مكتوبة زي ما هي.
   ===================================================================== */
(function (root) {
  "use strict";
  var AX = ["H", "V", "A"], NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };
  var FACE_OK = true;
  function f(n) { return n == null ? "—" : String(n).replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[+d]; }).replace(".", "٫"); }
  function sgn(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n)); }

  // «المتطوع» ← «المتطوعة» في جمل الورقة (الأطول الأول، علشان الفعل اللي بعدها يتأنث معاها)
  var CLIENT_F = [["كلام المتطوع عن نفسه", "كلام المتطوعة عن نفسها"], ["والمتطوع شاف", "والمتطوعة شافت"], ["المتطوع اختار", "المتطوعة اختارت"],
                  ["المتطوع يحس", "المتطوعة تحس"], ["للمتطوع", "للمتطوعة"], ["المتطوع", "المتطوعة"]];
  var CLIENT_MAP = {}, CLIENT_RE = new RegExp(CLIENT_F.map(function (p) { CLIENT_MAP[p[0]] = p[1]; return p[0]; }).join("|") + "(?!ة)", "g");
  function renderCoach(R, A, items, CT, opts) {
    opts = opts || {};
    var B = [], fem = opts.address === "f";
    function W(s) {
      if (!fem || typeof s !== "string") return s;
      return s.replace(CLIENT_RE, function (m) { return CLIENT_MAP[m]; });
    }
    function add(t, text) { if (text) B.push({ t: t, text: W(text) }); }
    var F = R.final, dims = R.dimensions;
    var on = ["depletion", "mood", "freeze", "period"].filter(function (k) { return R.alerts[k].on; });
    var alertName = { depletion: "الانطفاء", mood: "تقلّب المزاج", freeze: "التجمّد", period: "الفترة" };
    var needFollow = R.alerts.depletion.on || R.alerts.mood.on || R.alerts.freeze.on;   // علامة في الأدمن بس، من غير أي إجراء
    var VT = R.volunteer, VCT = CT.volunteer;
    var start = (items.client && items.client.start) || {}, cl = A.client || {};
    function optText(q, id) { var o = ((start[q] || {}).options || []).filter(function (x) { return x.id === id; })[0]; if (!o) return "—"; return fem && items.fem && items.fem[o.text] ? items.fem[o.text] : o.text; }   // بالمؤنث لو المتطوعة اختارته (الورقة ممكن تتقري معاها)

    add("title", "ورقة الكوتش" + (opts.name ? ": " + opts.name : ""));
    if (fem) add("p", "المتطوعة اختارت إن المقياس والتقرير يكلموها بصيغة المؤنث.");
    add("p", "الدور: " + optText("role", cl.role) + " · المدة: " + optText("tenure", cl.tenure) + " · السن: " + optText("age", cl.age) + ".");
    if (needFollow) add("p", "⚑ فيه تنبيه شغال (التفاصيل في «٣. التنبيهات»). العلامة معلومة بس، ومفيش أي حاجة اتعملت لوحدها.");

    /* ١. الملخص */
    add("h2", "١. الملخص");
    var order = [F.main, F.supporting, F.suppressed || R.ranking.order[2]].filter(Boolean).map(function (a) { return NAME[a]; }).join(" ← ");
    var quiet = R.suppressed.status === "غير محسوم"
      ? "غير محسوم (" + R.suppressed.alternatives.map(function (a) { return NAME[a]; }).join(" أو ") + ")"
      : NAME[F.suppressed || R.suppressed.axis] + " (" + (F.source === "الكوتش" ? "حدّده الكوتش" : R.suppressed.status) + ")";
    var clear = dims.filter(function (d) { return d.reportStatus !== "undetermined"; })
      .sort(function (x, y) { return pr(x) - pr(y); }).slice(0, 3)
      .map(function (d) { return d.name + ": " + d.reportLabel + (d.silentPath ? " + سكوت المسار" : ""); });
    add("p", "الترتيب: " + order + " (ثقة " + R.ranking.confidence + "، فرق " + f(R.ranking.gap) + (F.source === "الكوتش" ? "، معدّل من الكوتش" : "") + "). الهادي: " + quiet + ".");
    add("p", "أوضح إشارات: " + (clear.join(" · ") || "مفيش، الأبعاد كلها منطقة وسط") + ". التنبيهات: " +
      (on.length ? on.map(function (k) { return alertName[k] + (k === "period" && R.alerts.period.level === "عالي" ? " (عالي)" : "") + (k === "freeze" ? " (" + R.alerts.freeze.axes.map(function (a) { return NAME[a]; }).join("، ") + ")" : ""); }).join("، ") : "مفيش") + ".");

    /* ٢. الأرقام */
    add("h2", "٢. الأرقام");
    add("h3", "الترتيب والهادي");
    add("li", "نقط المحطة ١ (من −١٥ لـ+١٥): " + AX.map(function (a) { return NAME[a] + " " + sgn(R.ranking.points[a]); }).join("، ") + ". الثقة " + R.ranking.confidence + "، والاتساق: الرئيسي «الأقرب» في " + f(R.ranking.consistency.closest) + " من " + f(R.ranking.consistency.of) + ".");
    add("li", "السكوت في المحطة ٢ (من −٦ لـ+٦): " + AX.map(function (a) { return NAME[a] + " " + sgn(R.suppressed.silence[a]); }).join("، ") + ". الحالة: " + R.suppressed.status + " (" + R.suppressed.reason + ").");
    add("li", "المواقف الخفيفة: " + R.ranking.lightSituations.map(function (l) { return l.id + " " + (l.skipped ? "ما مرّش بيه" : "الأقرب " + NAME[l.closest] + "، الأبعد " + NAME[l.farthest]); }).join(" · ") + ".");
    add("h3", "الأبعاد التسعة");
    dims.forEach(function (d) {
      add("li", d.name + " (" + NAME[d.axis] + "): E " + f(d.E) + " · D " + f(d.D) + " · T " + f(d.T) + " · K " + f(d.K) + " ← " + d.label +
        (d.reportStatus !== d.status ? " (في التقرير: " + d.reportLabel + ")" : "") + (d.silentPath ? " + سكوت المسار" : "") +
        (d.leanBy ? " [الميل من " + d.leanBy + "]" : "") + (d.face.length ? " · الوش: " + d.face.join("/") : "") + (d.contradictions ? " · تناقض " + f(d.contradictions) : ""));
    });
    add("h3", "الموجات والتوتر");
    add("li", "الدواير: " + AX.map(function (a) { return NAME[a] + " " + f(R.cycles[a].mean) + (R.cycles[a].high ? " (عالية)" : ""); }).join("، ") + ".");
    add("li", "التوتر: " + AX.map(function (a) { var t = R.tension[a]; return NAME[a] + " " + f(t.value) + " ← " + (t.label || "—"); }).join(" · ") + ".");
    add("h3", "محطة الضغط (المحطة ٩)");
    add("li", "الخوف وقودًا: " + AX.map(function (a) { return NAME[a] + " " + f(R.station7.fear[a].mean) + (R.station7.fear[a].high ? " (عالي)" : ""); }).join("، ") + ".");
    add("li", "التجمّد: " + AX.map(function (a) { var z = R.station7.freeze[a]; return NAME[a] + (z.flag ? " علامة (" + z.items.map(function (i) { return i.id + "=" + f(i.value); }).join("، ") + ")" : " مفيش"); }).join(" · ") + ".");
    add("li", "الاستبدال: متوسط " + f(R.station7.substitution.mean) + (R.station7.substitution.signal ? " (إشارة)" : "") + "، والصيغة اللي ظهرت: " + (R.adaptive.shown || R.adaptive.computed.row) + (R.adaptive.shown && R.adaptive.shown !== R.adaptive.computed.row ? " (المحرك الحالي كان هيختار " + R.adaptive.computed.row + ")" : "") + ".");
    add("h3", "الجودة والسياق");
    add("li", "الصدق: " + f(R.quality.validity.count) + " من ٣ عالية" + (R.quality.validity.flag ? " ← احتمال تجميل" : "") + ". نمط الموافقة: " + f(R.quality.acquiescence.dims.length) + " أبعاد الإفراط والتفريط فيها عاليين" + (R.quality.acquiescence.flag ? " ← نمط إجابة" : "") + ". التناقضات: " + f(R.quality.contradictions.count) + ". السرعة: " + (R.quality.speed.measured ? (R.quality.speed.flag ? "إجابة سريعة في " + R.quality.speed.stations.map(function (s) { return "المحطة " + f(s.station); }).join("، ") : "طبيعية") : "الأوقات مش متسجلة") + ".");
    var pq = (items.client && (items.client.period || (items.client.start && items.client.start.period))) || { options: [] };
    var popts = {}, pnone = {}; pq.options.forEach(function (o) { popts[o.id] = o.text; if (o.none) pnone[o.id] = 1; });
    var per = (A.period && A.period.selected || []).filter(function (x) { return !pnone[x]; });
    add("li", "سؤال الفترة: " + (per.length ? per.map(function (x) { return popts[x] || x; }).join("، ") + "، والأثر: " + (A.period.impact || "—") : "الفترة عادية") + ".");
    var tm = opts.timing || A.timing || {};
    add("li", "وقت كل محطة: " + (Object.keys(tm).length ? Object.keys(tm).sort().map(function (k) { return "المحطة " + f(k) + " " + f(Math.round((tm[k].endedAt - tm[k].startedAt) / 60000)) + " د"; }).join("، ") : "مش متسجل") + ".");
    add("li", "تقييم المتطوع للتقرير: " + (opts.rating ? f(opts.rating.value) + " من ٥" + (opts.rating.note ? (fem ? "، وكتبت: «" : "، وكتب: «") + opts.rating.note + "»" : "") : (fem ? "لسه ما قيّمتش" : "لسه ما قيّمش")) + ".");

    /* ٣. التنبيهات */
    add("h2", "٣. التنبيهات");
    if (!on.length) add("p", "مفيش تنبيهات.");
    on.forEach(function (k) {
      var a = CT.alerts[k];
      add("h3", a.title + (k === "freeze" ? ": " + R.alerts.freeze.axes.map(function (x) { return NAME[x]; }).join("، ") : "") + (k === "period" && R.alerts.period.level === "عالي" ? " (عالي)" : ""));
      add("li", "يعني إيه: " + a.what);
      add("li", "اسأل في الجلسة: " + a.ask);
      add("li", "إمتى تحيل: " + a.refer);
    });
    if (on.length) add("p", CT.referLang);
    if (needFollow) add("p", CT.followUp);

    /* ٤. أسئلة الجلسة */
    add("h2", "٤. أسئلة الجلسة");
    add("p", CT.deepWarning);
    add("h3", "المسار الأقوى: " + NAME[F.main]);
    if (F.main === "A") add("p", "ابدأ بالسؤال اللي بيحترم الدفاع: «" + CT.defenseQ + "»");
    CT.mainQ[F.main].forEach(function (g) { add("h4", g[0]); g[1].forEach(function (q) { add("li", q); }); });
    var quietAxes = R.suppressed.status === "غير محسوم" ? R.suppressed.alternatives : [F.suppressed || R.suppressed.axis];
    quietAxes.filter(Boolean).forEach(function (a) {
      add("h3", "المسار الهادي: " + NAME[a] + (quietAxes.length > 1 ? " (احتمال)" : ""));
      add("p", CT.quietNote[a]);
      if (a === "A") add("p", "ابدأ بـ: «" + CT.defenseQ + "»");
      CT.quietQ[a].forEach(function (q) { add("li", q); });
    });

    /* ٥. التطوع (جديد) */
    add("h2", "٥. التطوع");
    if (VT.expectedPicture) add("p", VCT.expectedNotes.picture);
    if (VT.cycleExpected) add("p", AX.some(function (a) { return VT.vcycles[a].high; }) ? VCT.expectedNotes.cycleWave : VCT.expectedNotes.cycleNoWave);
    add("h3", "المقارنة");
    add("li", "الحياة (المحطة ١): " + AX.map(function (a) { return NAME[a] + " " + sgn(VT.lifeRanking.points[a]); }).join("، ") + "، ثقة " + VT.lifeRanking.confidence + ".");
    add("li", "التطوع (المحطة ٧): " + AX.map(function (a) { return NAME[a] + " " + sgn(VT.volunteerRanking.points[a]); }).join("، ") + "، ثقة " + VT.volunteerRanking.confidence +
      "، والترتيب: " + VT.volunteerRanking.order.map(function (a) { return NAME[a]; }).join(" ← ") + ".");
    var bl = AX.some(function (a) { return VT.baseline[a]; });
    add("li", "الفرق (تطوع − حياة" + (bl ? " − baseline" : "") + "): " + AX.map(function (a) { return NAME[a] + " " + sgn(VT.diff[a]); }).join("، ") + "، والحد " + f(VT.diffMin) + ".");
    add("li", "النتيجة: " + VT.outcomes.map(function (o) { return VCT.outcomeName[o] + (o === "like_life" ? "" : " (" + NAME[VT.axisOf[o]] + ")"); }).join(" + ") +
      (VT.tie ? " (تعادل)" : "") + " — " + VT.reason + ".");
    add("li", "المواقف الخفيفة في التطوع: " + VT.volunteerRanking.lightSituations.map(function (l) { return l.id + " " + (l.skipped ? "ما مرّش بيه" : "الأقرب " + NAME[l.closest] + "، الأبعد " + NAME[l.farthest]); }).join(" · ") + ".");
    add("p", VCT.method);
    add("h3", "الدايرة في التطوع، وإنت فين");
    add("li", "الدواير (المحطة ٨، المتوسط من ٠ لـ٤): " + AX.map(function (a) {
      var c = VT.vcycles[a];
      return NAME[a] + " " + (c.clear ? f(c.mean) + (c.high ? " (عالية)" : "") : "مش واضحة") + (c.early.length ? " · «لسه بدري» " + f(c.early.length) : "");
    }).join("، ") + ".");
    add("li", "إنت فين دلوقتي: " + (VT.now ? "«" + VT.now.text.replace(/[.،]\s*$/, "") + "»" + (VT.now.coachFlag ? " ⚑" : "") + (VT.now.coachFlag && R.alerts.depletion.on ? "، ومعاه تنبيه الانطفاء" : "") : "ما اتجاوبش") + ".");
    add("li", "عبارة المواسم (" + (VT.season ? VT.season.item : "—") + "): " + (VT.season && VT.season.value != null ? (VT.season.value === "early" ? "لسه بدري" : f(VT.season.value)) : "—") + ".");
    add("p", VCT.nowNote);
    add("p", VCT.seasonNote);
    add("h3", "أسئلة الجلسة في التطوع");
    VT.outcomes.forEach(function (o) {
      add("h4", VCT.outcomeName[o]);
      VCT.questions[o].forEach(function (q) { add("li", q); });
    });

    /* ٦. الحدود */
    add("h2", "٦. اللي المقياس ما بيقيسوش");
    CT.limits.forEach(function (l) { add("p", l); });

    /* ٦. تعديل الكوتش */
    add("h2", "٧. تعديل الكوتش");
    if (F.source === "الكوتش") add("p", "متعدّل: " + order + "، والسبب: «" + (F.reason || "") + "»" + (F.by ? "، بواسطة " + F.by : "") + ". والحساب الأصلي: " + R.ranking.order.map(function (a) { return NAME[a]; }).join(" ← ") + ".");
    else add("p", "مفيش تعديل. ولو الجلسة بيّنت إن الترتيب مش مظبوط:");
    CT.override.forEach(function (o) { add("li", o); });
    return B;
  }
  function pr(d) { return { cycle: 0, excess: 1, deficit: 2, fitra: 3, ambiguous: 4, lean_excess: 5, lean_deficit: 5, lean_both: 6 }[d.reportStatus]; }

  var API = { renderCoach: renderCoach };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MizanScaleCoach = API;
})(typeof self !== "undefined" ? self : this);
