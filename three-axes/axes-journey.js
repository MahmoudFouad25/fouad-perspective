/* ════════════════════════════════════════════════════════════════════════
   axes-journey.js — محرّك رحلة تقرير مسارات الطاقة الثلاثة
   ────────────────────────────────────────────────────────────────────────
   يحوّل نتيجة العميل (ranking + burnout + burnoutRepressed + wellness) إلى
   سلسلة «خطوات» مرتّبة عبر أربع مراحل مسمّاة، يمشي فيها العميل خطوةً خطوة،
   وجملةُ الإمساك بين كل خطوةٍ والتي بعدها هي زرّ الانتقال.

   لا يقيس ولا يحسب شيئًا — يقرأ ما حسبه المحرّك، ويركّب منه رحلةً مفهومة.

   المراحل الأربع المسمّاة:
     ١) مساراتك     — الأرض، النهر، الأقوى، الداعم/المنسيّ
     ٢) جوانبك      — صح/غلط، جوانب الأقوى، تأطير المنسيّ، جوانب المنسيّ
     ٣) الخيط والنزيف — الخيط الجامع، مقياس النزيف
     ٤) خطوتك       — الخطوة، الخاتمة

   القاموس (للعميل): الأقوى/الداعم/المنسيّ · متوازن/مشدود/متوقّف ·
                     الإنهاك/الوحدة/البلادة.

   مبدأ الأمان: الجوانب المتوازنة تظهر (تطمئن العميل وتفيد الكوتش)، إلّا
   إن كان في إظهارها ما قد يؤذي — فنصمت. (يُطبَّق في buildDimensionStep.)
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ملّاذ الوصول للبيانات (متصفّح أو Node) */
  function CONTENT() {
    return (typeof AXES_CONTENT !== "undefined") ? AXES_CONTENT
         : (typeof window !== "undefined" ? window.AXES_CONTENT : null);
  }

  /* ترتيب جوانب كل مسار (يطابق axes-config حرفيًّا) */
  var DIM_ORDER = {
    tamasuk:   ["jasad", "mawarid", "tanzim"],
    hayawiyya: ["ishtial", "jazibiyya", "tajaddud"],
    intima:    ["qiraa", "makana", "ishaam"]
  };

  /* تطابق مستوى النزيف الأشدّ باسمه المحسوس (خطّ الإحساس) */
  var BLEED_KEY = {
    tawaqud: "exhaustion",   // الإنهاك ↔ مسار الأمان
    hudur:   "loneliness",   // الوحدة ↔ مسار الانتماء
    imtila:  "numbness"      // البلادة ↔ مسار الحيوية
  };

  /* أسماء المراحل الأربع كما يراها العميل */
  var PHASES = [
    { id: "paths",   name: "مساراتك" },
    { id: "sides",   name: "جوانبك" },
    { id: "thread",  name: "الخيط والنزيف" },
    { id: "step",    name: "خطوتك" }
  ];

  /* ══════════════════════════════════════════════════════════════════
     تحويل موقع الجانب (من المحرّك) إلى مفتاح القراءة في المحتوى
     المحرّك يُرجع: balance / excess / deficit / both / ambiguous
     المحتوى يحمل:  balanced / strained / stalled / both
     ambiguous يُعامَل كـ«يُفرَز لاحقًا» — لا يُحسَم (نعرض تأمّلًا لطيفًا).
     ══════════════════════════════════════════════════════════════════ */
  function positionToStateKey(position) {
    switch (position) {
      case "balance":   return "balanced";
      case "excess":    return "strained";
      case "deficit":   return "stalled";
      case "both":      return "both";
      case "ambiguous": return "ambiguous";
      default:          return "balanced";
    }
  }

  /* هل الموقع «حيٌّ» (مشدود/متوقّف/متذبذب) أم متوازن؟ */
  function isActivePosition(position) {
    return position === "excess" || position === "deficit" || position === "both";
  }

  /* ══════════════════════════════════════════════════════════════════
     بناء خطوة قراءة جانبٍ واحد
     data.dimensions[dimId] = { position, positionLabel, ... }
     frame: 'primary' (الأقوى — هبة/كُلفة) أو 'repressed' (المنسيّ — باب نائم)
     ══════════════════════════════════════════════════════════════════ */
  function buildDimensionStep(axisId, dimId, dimResult, frame) {
    var c = CONTENT();
    var dimContent = c.dimensions[axisId] && c.dimensions[axisId][dimId];
    if (!dimContent) return null;

    var position = dimResult ? dimResult.position : "balance";
    var stateKey = positionToStateKey(position);

    // نصّ القراءة حسب الحالة
    var readingText;
    var isBalanced = (stateKey === "balanced");

    if (stateKey === "ambiguous") {
      // ملتبس: لا نحسم — تأمّلٌ لطيف، يُفرَز في الجلسة
      readingText = "هذا الجانب فيك لم يستقرّ موقعه بوضوحٍ بعد؛ مرّةً يبان من هنا ومرّةً من هناك. وده طبيعيّ. نسيبه دلوقتي علامة استفهام لطيفة، ونفرزها سوا لو نزلنا أعمق في جلسة.";
    } else {
      readingText = dimContent[stateKey] || dimContent.balanced;
    }

    return {
      kind: "dimension",
      phase: "sides",
      frame: frame,                 // primary | repressed
      axisId: axisId,
      dimId: dimId,
      position: position,
      stateKey: stateKey,
      isBalanced: isBalanced,
      isActive: isActivePosition(position),
      intro: dimContent.intro || "",
      reading: readingText
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     يختار نصّ الممارسة المناسب من المحتوى الجديد (c.practices)
     على مقاس الجانب المشدود/المتوقّف/المتذبذب. المتوازن أو غياب الجانب
     المحترق → رسالة الحراسة العامّة (stepAllBalanced).
     ══════════════════════════════════════════════════════════════════ */
  function resolvePractice(c, axisId, burnedDim, burnedResult) {
    // لا جانب محترق واضح → المسار في معظمه متوازن
    if (!burnedDim || !burnedResult) {
      return { text: c.stepAllBalanced || c.practiceBalanced || "", isBalanced: true };
    }
    var position = burnedResult.position;
    var stateKey = positionToStateKey(position);   // strained | stalled | both | balanced | ambiguous

    // متوازن → رسالة الحراسة (لا ممارسة علاجيّة)
    if (stateKey === "balanced") {
      return { text: c.practiceBalanced || "", isBalanced: true };
    }
    // ملتبس → أقرب ممارسة (both ثمّ stalled) بلا حسم قاطع
    var block = (c.practices && c.practices[axisId] && c.practices[axisId][burnedDim]) || {};
    var text;
    if (stateKey === "ambiguous") {
      text = block.both || block.stalled || c.practiceBalanced || "";
    } else {
      text = block[stateKey] || c.practiceBalanced || "";
    }
    return { text: text, isBalanced: false };
  }

  /* ══════════════════════════════════════════════════════════════════
     البنّاء الرئيسيّ — يركّب كل خطوات الرحلة من نتيجة العميل
     result = {
       ranking:          { primaryAxis, secondaryAxis, repressedAxis,
                           repressedConfirmed, weakSignal, closeTop, closeTopCandidate },
       burnout:          { dimensions:{...}, burnedDim, burnedShape },  // الأقوى
       burnoutRepressed: { dimensions:{...} },                          // المنسيّ
       wellness:         { worstLevel },                                // النزيف
       lean:             { matched }                                    // تطابق النزيف
     }
     ══════════════════════════════════════════════════════════════════ */
  function buildJourney(result) {
    var c = CONTENT();
    if (!c) return { steps: [], phases: PHASES };

    var r     = result.ranking || {};
    var bPrim = result.burnout || {};
    var bRep  = result.burnoutRepressed || {};
    var well  = result.wellness || {};
    var lean  = result.lean || {};

    var primaryAxis   = r.primaryAxis;
    var secondaryAxis = r.secondaryAxis;
    var repressedAxis = r.repressedAxis;

    var steps = [];

    /* ─────────── المرحلة ١: مساراتك ─────────── */

    // خطوة الأرض
    steps.push({
      kind: "ground", phase: "paths",
      title: c.ground.title, body: c.ground.body,
      handoff: c.handoffToIntro
    });

    // خطوة النهر (يعني إيه مسار)
    steps.push({
      kind: "intro", phase: "paths",
      title: c.intro.title, body: c.intro.body,
      handoff: c.handoffToPrimary
    });

    // خطوة المسار الأقوى
    steps.push({
      kind: "primary", phase: "paths",
      axisId: primaryAxis,
      body: c.primary[primaryAxis],
      handoff: c.handoffToBehind
    });

    // خطوة الداعم + المنسيّ (معًا في شاشةٍ واحدة تحت تمهيدٍ واحد)
    steps.push({
      kind: "behind", phase: "paths",
      intro: c.behindIntro,
      secondaryBody: c.secondary[secondaryAxis],
      repressedBody: c.repressed[repressedAxis],
      handoff: c.handoffToLens
    });

    /* ─────────── المرحلة ٢: جوانبك ─────────── */

    // خطوة «صح وغلط» (الفطرة/القناع)
    steps.push({
      kind: "lens", phase: "sides",
      title: c.lensIntro.title, body: c.lensIntro.body,
      handoff: c.handoffToDimensions
    });

    // خطوة تمهيد جوانب المسار الأقوى
    var dimsIntroP = c.dimensionsIntro[primaryAxis];
    steps.push({
      kind: "dimsIntro", phase: "sides", frame: "primary",
      axisId: primaryAxis,
      title: dimsIntroP.title, body: dimsIntroP.body
    });

    // جوانب المسار الأقوى الثلاثة
    (DIM_ORDER[primaryAxis] || []).forEach(function (dimId) {
      var dimResult = bPrim.dimensions ? bPrim.dimensions[dimId] : null;
      var st = buildDimensionStep(primaryAxis, dimId, dimResult, "primary");
      if (st) steps.push(st);
    });

    // خطوة تأطير المسار المنسيّ
    steps.push({
      kind: "repressedFraming", phase: "sides",
      axisId: repressedAxis,
      intro: c.repressedFraming.intro,
      handoff: c.handoffToThread
    });

    // خطوة تمهيد جوانب المسار المنسيّ (نستعمل نفس dimensionsIntro لكن بإطار المنسيّ)
    var dimsIntroR = c.dimensionsIntro[repressedAxis];
    steps.push({
      kind: "dimsIntro", phase: "sides", frame: "repressed",
      axisId: repressedAxis,
      title: dimsIntroR.title, body: dimsIntroR.body
    });

    // جوانب المسار المنسيّ الثلاثة
    (DIM_ORDER[repressedAxis] || []).forEach(function (dimId) {
      var dimResult = bRep.dimensions ? bRep.dimensions[dimId] : null;
      var st = buildDimensionStep(repressedAxis, dimId, dimResult, "repressed");
      if (st) steps.push(st);
    });

    // خطوة ختام المنسيّ (التأطير الختاميّ لهذا المسار)
    steps.push({
      kind: "repressedClosing", phase: "sides",
      axisId: repressedAxis,
      body: c.repressedFraming.closingByAxis[repressedAxis],
      handoff: c.handoffToThread
    });

    /* ─────────── المرحلة ٣: الخيط والنزيف ─────────── */

    // خطوة الخيط الجامع
    var mismatch = (lean.matched === false); // النزيف في مكانٍ غير الأقوى → المجوّع
    steps.push({
      kind: "thread", phase: "thread",
      title: c.thread.title,
      giftAndCost: c.thread.giftAndCost[primaryAxis],
      connection: c.thread.connection,
      mismatchNote: mismatch ? c.thread.mismatchNote : null,
      handoff: c.handoffToBleed
    });

    // خطوة مقياس النزيف
    var worstLevel = well.worstLevel;
    var bleedKey = BLEED_KEY[worstLevel];
    var bleedReading = bleedKey ? c.bleed[bleedKey] : null;
    steps.push({
      kind: "bleed", phase: "thread",
      title: c.bleedIntro.title,
      intro: c.bleedIntro.body,
      reading: bleedReading,   // { name, body } أو null
      handoff: c.handoffToStep
    });

    /* ─────────── المرحلة ٤: خطوتك ─────────── */

    // خطوة الممارسة (على مقاس الجانب المشدود/المتوقّف في الأقوى)
    // نجلب نصّ الممارسة مباشرةً من المحتوى الجديد (c.practices)، لا من الـbridge.
    var burnedDim   = bPrim.burnedDim;
    var burnedResult = (bPrim.dimensions && burnedDim) ? bPrim.dimensions[burnedDim] : null;
    var practiceText = resolvePractice(c, primaryAxis, burnedDim, burnedResult);
    steps.push({
      kind: "step", phase: "step",
      intro: c.stepIntro,
      burnedDim: burnedDim,
      axisId: primaryAxis,
      practice: practiceText.text,       // نصّ الممارسة الجاهز
      practiceBalanced: practiceText.isBalanced,
      handoff: c.handoffToClose
    });

    // خطوة الخاتمة
    steps.push({
      kind: "closing", phase: "step",
      title: c.closing.title, body: c.closing.body
    });

    return {
      steps: steps,
      phases: PHASES,
      meta: {
        primaryAxis: primaryAxis,
        secondaryAxis: secondaryAxis,
        repressedAxis: repressedAxis,
        worstLevel: worstLevel,
        mismatch: mismatch
      }
    };
  }

  /* حساب رقم الخطوة داخل مرحلتها، وإجماليّ خطوات المرحلة (لعرض «الخطوة ٢ من ٥») */
  function annotatePhaseProgress(journey) {
    var counts = {};
    journey.steps.forEach(function (s) { counts[s.phase] = (counts[s.phase] || 0) + 1; });
    var running = {};
    journey.steps.forEach(function (s) {
      running[s.phase] = (running[s.phase] || 0) + 1;
      s.phaseIndex = running[s.phase];
      s.phaseTotal = counts[s.phase];
      var ph = PHASES.find(function (p) { return p.id === s.phase; });
      s.phaseName = ph ? ph.name : "";
    });
    return journey;
  }

  /* التصدير */
  var API = {
    buildJourney: buildJourney,
    annotatePhaseProgress: annotatePhaseProgress,
    positionToStateKey: positionToStateKey,
    isActivePosition: isActivePosition,
    DIM_ORDER: DIM_ORDER,
    BLEED_KEY: BLEED_KEY,
    PHASES: PHASES
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = API; }
  if (typeof window !== "undefined") { window.AXES_JOURNEY = API; }

})();
