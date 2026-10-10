/* =====================================================================
   coach.js — ورقة الكوتش لعميل واحد (بتظهر لمحمود في صفحة الأدمن)
   renderCoach(result, answers, items, coachTexts, opts) ← blocks
     opts = { mode: "standalone" | "insight", name, timing: {"1":{startedAt,endedAt}…}, rating: {value, note} }
   ===================================================================== */
(function (root) {
  "use strict";
  var AX = ["H", "V", "A"], NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };
  var FACE_OK = true;
  function f(n) { return n == null ? "—" : String(n).replace(/[0-9]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[+d]; }).replace(".", "٫"); }
  function sgn(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + f(Math.abs(n)); }

  function renderCoach(R, A, items, CT, opts) {
    opts = opts || {};
    var B = [];
    function add(t, text) { B.push({ t: t, text: text }); }
    var F = R.final, dims = R.dimensions;
    var on = ["depletion", "mood", "freeze", "period"].filter(function (k) { return R.alerts[k].on; });
    var alertName = { depletion: "الانطفاء", mood: "تقلّب المزاج", freeze: "التجمّد", period: "الفترة" };
    var needFollow = opts.mode === "standalone" && (R.alerts.depletion.on || R.alerts.mood.on || R.alerts.freeze.on);

    add("title", "ورقة الكوتش" + (opts.name ? ": " + opts.name : ""));
    if (needFollow) add("p", "⚑ محتاج متابعة: فيه تنبيه شغال والعميل اشترى المقياس لوحده.");

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
    add("h3", "المحطة ٧");
    add("li", "الخوف وقودًا: " + AX.map(function (a) { return NAME[a] + " " + f(R.station7.fear[a].mean) + (R.station7.fear[a].high ? " (عالي)" : ""); }).join("، ") + ".");
    add("li", "التجمّد: " + AX.map(function (a) { var z = R.station7.freeze[a]; return NAME[a] + (z.flag ? " علامة (" + z.items.map(function (i) { return i.id + "=" + f(i.value); }).join("، ") + ")" : " مفيش"); }).join(" · ") + ".");
    add("li", "الاستبدال: متوسط " + f(R.station7.substitution.mean) + (R.station7.substitution.signal ? " (إشارة)" : "") + "، والصيغة اللي ظهرت: " + (R.adaptive.shown || R.adaptive.computed.row) + (R.adaptive.shown && R.adaptive.shown !== R.adaptive.computed.row ? " (المحرك الحالي كان هيختار " + R.adaptive.computed.row + ")" : "") + ".");
    add("h3", "الجودة والسياق");
    add("li", "الصدق: " + f(R.quality.validity.count) + " من ٣ عالية" + (R.quality.validity.flag ? " ← احتمال تجميل" : "") + ". نمط الموافقة: " + f(R.quality.acquiescence.dims.length) + " أبعاد الإفراط والتفريط فيها عاليين" + (R.quality.acquiescence.flag ? " ← نمط إجابة" : "") + ". التناقضات: " + f(R.quality.contradictions.count) + ". السرعة: " + (R.quality.speed.measured ? (R.quality.speed.flag ? "إجابة سريعة في " + R.quality.speed.stations.map(function (s) { return "المحطة " + f(s.station); }).join("، ") : "طبيعية") : "الأوقات مش متسجلة") + ".");
    var per = (A.period && A.period.selected || []).filter(function (x) { return x !== "p8"; });
    var popts = {}; ((items.client && items.client.period && items.client.period.options) || []).forEach(function (o) { popts[o.id] = o.text; });
    add("li", "سؤال الفترة: " + (per.length ? per.map(function (x) { return popts[x] || x; }).join("، ") + "، والأثر: " + (A.period.impact || "—") : "الفترة عادية") + ".");
    var tm = opts.timing || A.timing || {};
    add("li", "وقت كل محطة: " + (Object.keys(tm).length ? Object.keys(tm).sort().map(function (k) { return "المحطة " + f(k) + " " + f(Math.round((tm[k].endedAt - tm[k].startedAt) / 60000)) + " د"; }).join("، ") : "مش متسجل") + ".");
    add("li", "تقييم العميل للتقرير: " + (opts.rating ? f(opts.rating.value) + " من ٥" + (opts.rating.note ? "، وكتب: «" + opts.rating.note + "»" : "") : "لسه ما قيّمش") + ".");

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

    /* ٥. الحدود */
    add("h2", "٥. اللي المقياس ما بيقيسوش");
    CT.limits.forEach(function (l) { add("p", l); });

    /* ٦. تعديل الكوتش */
    add("h2", "٦. تعديل الكوتش");
    if (F.source === "الكوتش") add("p", "متعدّل: " + order + "، والسبب: «" + (F.reason || "") + "»" + (F.by ? "، بواسطة " + F.by : "") + ". والحساب الأصلي: " + R.ranking.order.map(function (a) { return NAME[a]; }).join(" ← ") + ".");
    else add("p", "مفيش تعديل. ولو الجلسة بيّنت إن الترتيب مش مظبوط:");
    CT.override.forEach(function (o) { add("li", o); });
    return B;
  }
  function pr(d) { return { cycle: 0, excess: 1, deficit: 2, fitra: 3, ambiguous: 4, lean_excess: 5, lean_deficit: 5, lean_both: 6 }[d.reportStatus]; }

  var API = { renderCoach: renderCoach };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AxesV2Coach = API;
})(typeof self !== "undefined" ? self : this);
