/* ════════════════════════════════════════════════════════════════════════
   cross-engine.js — محرّك التقاطع (mirrors-axes)
   ────────────────────────────────────────────────────────────────────────
   مجمِّعٌ لا قائس. لا UI، لا HTML، لا Firestore هنا — منطق حساب نقيّ فقط.
   يأخذ مستندَي المرايا والمسارات (مقروءَين مسبقًا من cross-store) ويُخرج:
     • الطابع الأساسيّ + التوليفة الثلاثيّة (بمنطق لوحة الأدمن حرفيًّا).
     • ترتيب المسارات (رئيسيّ / فرعيّ / مكبوت) ومواقع أبعادها على الطيف.
     • نقاط القوّة = تقاطع (الطابع × بُعد المسار)، مقروءةً في موقعها على الطيف.

   المبدأ الحاكم (لا يُخرَق):
     الطابع من القلب (المرايا)، المسار من النفس (المسارات)، متعامدان.
     نقطة القوّة = بُعد المسار × الطابع → تقاطعٌ لا استنتاج.
     لا نقيس هنا شيئًا جديدًا؛ نقرأ ما حُسِب ونركّب المعنى.
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CROSS_ENGINE = api;
  if (typeof globalThis !== "undefined") globalThis.CROSS_ENGINE = api;
})(this, function () {
  "use strict";

  /* ═══════════ خرائط ثابتة (منقولة حرفيًّا من لوحة الأدمن) ═══════════
     مراكز القوى الثلاث وأرقام طبائعها — مطابقة لـ aggregateTypes في الأدمن
     كي يكون الطابع الأساسيّ والتوليفة مطابقَين تمامًا لما يراه الكوتش هناك. */
  const TYPE_CENTER = {
    "1": "agency",    "8": "agency",    "9": "agency",     // الهمّة والعزيمة
    "2": "bonding",   "3": "bonding",   "4": "bonding",    // الأنس والقرب
    "5": "certainty", "6": "certainty", "7": "certainty"   // اليقين والبيان
  };
  const CENTERS = [
    { key: "agency",    label: "الهمّة والعزيمة", types: ["1", "8", "9"] },
    { key: "bonding",   label: "الأنس والقرب",     types: ["2", "3", "4"] },
    { key: "certainty", label: "اليقين والبيان",   types: ["5", "6", "7"] }
  ];

  /* المسارات الثلاثة وأبعادها (مطابقة لـ axes-config حرفيًّا).
     لا نعتمد على تحميل axes-config هنا — نثبّتها كي يعمل التقاطع مستقلًّا،
     لكنّ verifyAgainstConfig() أدناه تتحقّق من التطابق إن وُجد الـconfig. */
  const AXIS_DIMS = {
    tamasuk:   ["jasad", "mawarid", "tanzim"],
    hayawiyya: ["ishtial", "jazibiyya", "tajaddud"],
    intima:    ["qiraa", "makana", "ishaam"]
  };
  const AXIS_IDS = ["tamasuk", "hayawiyya", "intima"];

  /* رقم الطابع من "type8" أو 8 أو "8" (نفس typeNum في الأدمن) */
  function typeNum(t) {
    if (t == null) return null;
    const s = String(t).replace(/[^0-9]/g, "");
    return s || null;
  }
  function numOrNull(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  /* ════════════════════ ١) تجميع الطابع من المرايا ════════════════════
     منطق aggregateTypes من الأدمن حرفيًّا: نجمع raw (أو percent) لكل طابع
     عبر كل المرايا المحلولة، نرتّب، فالأعلى = الطابع الأساسيّ، وأعلى طابعٍ
     في كل مركز = التوليفة الثلاثيّة.

     mirrorResults = كائن results من مستند المرايا: { mirrorId: { ranking:[...] } }
     يُرجع: { totals, ranked, tri, primary } أو null إن لا بيانات. */
  function aggregateMirrorType(mirrorResults) {
    const results = mirrorResults || {};
    const totals = {};
    for (let i = 1; i <= 9; i++) totals[String(i)] = 0;
    let any = false;

    Object.keys(results).forEach(function (mirrorId) {
      const mr = results[mirrorId];
      if (!mr || !Array.isArray(mr.ranking)) return;
      mr.ranking.forEach(function (item) {
        if (!item || typeof item !== "object") return;
        const num = typeNum(item.type);
        let val = numOrNull(item.raw);
        if (val == null) val = numOrNull(item.percent);
        if (num && val != null) { totals[num] += val; any = true; }
      });
    });
    if (!any) return null;

    const maxScore = Math.max.apply(null, Object.keys(totals).map(function (k) { return totals[k]; }).concat([1]));
    const ranked = Object.keys(totals).map(function (k) {
      return {
        num: k,
        center: TYPE_CENTER[k] || "",
        score: totals[k],
        pct: Math.round((totals[k] / maxScore) * 100)
      };
    }).sort(function (a, b) { return b.score - a.score; });

    const tri = CENTERS.map(function (c) {
      const top = ranked.filter(function (t) { return t.center === c.key; })[0] || null;
      return { center: c.key, label: c.label, type: top };
    });

    return { totals: totals, ranked: ranked, tri: tri, primary: ranked[0] || null };
  }

  /* ════════════════════ ٢) قراءة المسارات ════════════════════
     من مستند المسارات (results) نستخرج ترتيب المسارات ومواقع الأبعاد.
     نقرأ burnout (الرئيسيّ) وburnoutRepressed (المكبوت) كما حفظهما المقياس.

     axesResults = كائن results من مستند المسارات.
     يُرجع: {
       primaryAxis, secondaryAxis, repressedAxis,
       closeTop, repressedConfirmed, weakSignal,
       primaryDims:   { dimId: {position, positionLabel, ...} },
       repressedDims: { dimId: {...} } | null
     } */
  function readAxes(axesResults) {
    const r = axesResults || {};
    const ranking = r.ranking || {};
    const primaryAxis   = r.primaryAxis   || ranking.primaryAxis   || null;
    const repressedAxis = r.repressedAxis || ranking.repressedAxis || null;
    const secondaryAxis = ranking.secondaryAxis || null;

    function dimsOf(burnout) {
      if (!burnout || !burnout.dimensions) return null;
      const out = {};
      Object.keys(burnout.dimensions).forEach(function (dimId) {
        const d = burnout.dimensions[dimId] || {};
        out[dimId] = {
          dimId: dimId,
          position: d.position || null,            // balance / excess / deficit / both / ambiguous
          positionLabel: d.positionLabel || null,
          balance: numOrNull(d.balance),
          excess: numOrNull(d.excess),
          deficit: numOrNull(d.deficit),
          distance: numOrNull(d.distance)
        };
      });
      return out;
    }

    return {
      primaryAxis: primaryAxis,
      secondaryAxis: secondaryAxis,
      repressedAxis: repressedAxis,
      closeTop: !!ranking.closeTop,
      closeTopCandidate: ranking.closeTopCandidate || null,
      repressedConfirmed: !!ranking.repressedConfirmed,
      weakSignal: !!ranking.weakSignal,
      primaryDims:   dimsOf(r.burnout),
      repressedDims: dimsOf(r.burnoutRepressed)
    };
  }

  /* ════════════════════ ٣) التقاطع — نقاط القوّة ════════════════════
     لكل عنقود (الرئيسيّ، ثمّ المكبوت) ولكل بُعدٍ فيه، نبني «نقطة قوّة»:
       { axisId, dimId, position, cluster:'primary'|'repressed' }
     التسمية والقراءة الملوّنة بالطابع تأتي لاحقًا من cross-content عبر
     المفتاح (typeNum, axisId, dimId). هنا نُخرج الهيكل فقط — لا نصّ.

     يُخرج أيضًا أعلام الصدق على مستوى التقاطع (للكوتش):
       • closeTop: الرئيسيّ/الفرعيّ متقاربان.
       • ambiguousDims: أبعادٌ موقعها ملتبس (تُفرَز في الجلسة).
       • weakSignal: لا مسار متقدّم. */
  function buildStrengthPoints(axisRead, clusterKind) {
    // clusterKind: 'primary' | 'repressed'
    const axisId = (clusterKind === "primary") ? axisRead.primaryAxis : axisRead.repressedAxis;
    const dims   = (clusterKind === "primary") ? axisRead.primaryDims : axisRead.repressedDims;
    if (!axisId || !dims) return { axisId: axisId, cluster: clusterKind, points: [], measured: false };

    const dimOrder = AXIS_DIMS[axisId] || Object.keys(dims);
    const points = dimOrder.map(function (dimId) {
      const d = dims[dimId] || {};
      const pos = d.position || "ambiguous";
      return {
        axisId: axisId,
        dimId: dimId,
        cluster: clusterKind,
        position: pos,                              // balance/excess/deficit/both/ambiguous
        positionLabel: d.positionLabel || null,
        ambiguous: (pos === "ambiguous" || pos === "both"),
        scores: { balance: d.balance, excess: d.excess, deficit: d.deficit }
      };
    });
    return { axisId: axisId, cluster: clusterKind, points: points, measured: true };
  }

  /* ════════════════════ التركيب الكامل ════════════════════
     compose(mirrorResults, axesResults) → كل ما يحتاجه العرض والمحتوى.
     لا يكتب شيئًا، لا يقرأ Firestore — تجميعٌ خالص. */
  function compose(mirrorResults, axesResults) {
    const typeAgg  = aggregateMirrorType(mirrorResults);
    const axisRead = readAxes(axesResults);

    const primaryType = typeAgg && typeAgg.primary ? typeAgg.primary.num : null;

    const primaryCluster   = buildStrengthPoints(axisRead, "primary");
    const repressedCluster = buildStrengthPoints(axisRead, "repressed");

    // أعلام الصدق على مستوى التقاطع (للكوتش)
    const ambiguousPoints = []
      .concat(primaryCluster.points || [], repressedCluster.points || [])
      .filter(function (p) { return p.ambiguous; })
      .map(function (p) { return { axisId: p.axisId, dimId: p.dimId, cluster: p.cluster }; });

    return {
      // الطابع
      primaryType: primaryType,                       // "1".."9" أو null
      typeRanked: typeAgg ? typeAgg.ranked : null,
      tritype: typeAgg ? typeAgg.tri : null,

      // المسارات
      primaryAxis: axisRead.primaryAxis,
      secondaryAxis: axisRead.secondaryAxis,
      repressedAxis: axisRead.repressedAxis,

      // العناقيد (نقاط القوّة هيكلًا — التسمية لاحقًا من المحتوى)
      clusters: {
        primary: primaryCluster,
        repressed: repressedCluster
      },

      // أعلام الصدق
      flags: {
        closeTop: axisRead.closeTop,
        closeTopCandidate: axisRead.closeTopCandidate,
        repressedConfirmed: axisRead.repressedConfirmed,
        weakSignal: axisRead.weakSignal,
        ambiguousPoints: ambiguousPoints,
        repressedMeasured: repressedCluster.measured
      },

      // جاهزيّة المُدخلات (لتقرّر الصفحة هل تعرض أم تطلب الإكمال)
      ready: {
        hasType: !!primaryType,
        hasPrimaryAxis: !!axisRead.primaryAxis,
        hasRepressed: repressedCluster.measured
      }
    };
  }

  /* ════════════════════ تحقّق اختياريّ من التطابق مع config ════════════════════
     إن كان axes-config محمّلًا في الصفحة، نتأكّد أنّ معرّفات الأبعاد هنا
     تطابقه حرفيًّا — حارسٌ ضدّ أيّ انحراف مستقبليّ. يُرجع قائمة مخالفات. */
  function verifyAgainstConfig() {
    const issues = [];
    let cfg = null;
    try {
      if (typeof AXES_CONFIG !== "undefined") cfg = AXES_CONFIG;
      else if (typeof window !== "undefined" && window.AXES_CONFIG) cfg = window.AXES_CONFIG;
    } catch (e) { /* تجاهُل */ }
    if (!cfg || !Array.isArray(cfg.axes)) return issues; // لا config → لا تحقّق

    AXIS_IDS.forEach(function (ax) {
      const axisCfg = cfg.axes.find(function (a) { return a.id === ax; });
      if (!axisCfg) { issues.push("المحور غير موجود في config: " + ax); return; }
      const cfgDims = (axisCfg.dimensions || []).map(function (d) { return d.id; });
      const ourDims = AXIS_DIMS[ax] || [];
      if (cfgDims.join(",") !== ourDims.join(",")) {
        issues.push("أبعاد " + ax + " لا تطابق config: [" + ourDims.join(",") + "] ≠ [" + cfgDims.join(",") + "]");
      }
    });
    return issues;
  }

  return {
    aggregateMirrorType: aggregateMirrorType,
    readAxes: readAxes,
    buildStrengthPoints: buildStrengthPoints,
    compose: compose,
    verifyAgainstConfig: verifyAgainstConfig,
    typeNum: typeNum,
    TYPE_CENTER: TYPE_CENTER,
    CENTERS: CENTERS,
    AXIS_DIMS: AXIS_DIMS,
    AXIS_IDS: AXIS_IDS
  };
});
