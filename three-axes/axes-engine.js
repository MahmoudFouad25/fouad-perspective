/* ════════════════════════════════════════════════════════════════════════
   axes-engine.js — محرّك حساب مقياس المحاور (Reignite)
   ────────────────────────────────────────────────────────────────────────
   منطق حساب نقيّ: لا UI، لا HTML، لا Firestore، لا عرض، لا تخزين.
   يقرأ المحتوى الثابت (config + questions) ويُرجع نتائج محسوبة جاهزة.
   الربط بالهويّة (axisId / dimId / level) لا بالأرقام أو المواضع.

   تنبيه بنيويّ حاسم (محسوم داخل المحرّك):
     عبارات الطيف في الطبقة الثانية تُقيَّم بترتيب العرض، لكنّ الحساب يجمع
     balance/excess/deficit بقراءة حقل category لكل عبارة لا بموضعها — كما في
     مقياس المرايا. ratings[axisId][dimId][i] يقابل L2[axisId][dimId][i] دائمًا.

   ثلاث دوالّ رئيسيّة:
     1) computeAxisRanking(answers)            — الطبقة الأولى → ترتيب المحاور + بذرة المكبوت.
     2) computeDimensionBurnout(axisId, ratings) — الطبقة الثانية → موقع كل بُعد على الطيف.
     3) computeWellnessLine(L3answers)         — الطبقة الثالثة → ثلاث نقاط العافية.
     + computeBurnoutLean(...)                 — الميل النوعيّ (للقاع، لا يُعلَن).
     + verifyIntegrity()                       — تحقّق سلامة المحتوى.
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.AXES_ENGINE = api;
  if (typeof globalThis !== "undefined") globalThis.AXES_ENGINE = api;
})(this, function () {
  "use strict";

  function _resolve(name, requirePath) {
    try {
      if (name === "AXES_CONFIG" && typeof AXES_CONFIG !== "undefined") return AXES_CONFIG;
      if (name === "AXES_QUESTIONS" && typeof AXES_QUESTIONS !== "undefined") return AXES_QUESTIONS;
    } catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) { /* تجاهُل */ }
    }
    return null;
  }
  function _cfg() { const v = _resolve("AXES_CONFIG", "./axes-config.js"); if (!v) throw new Error("AXES_CONFIG غير متاح."); return v; }
  function _q()   { const v = _resolve("AXES_QUESTIONS", "./axes-questions.js"); if (!v) throw new Error("AXES_QUESTIONS غير متاح."); return v; }

  const CHOICES = ["أ", "ب", "ج"];
  const AXIS_IDS = ["tamasuk", "hayawiyya", "intima"];

  /* عتبة الفرق المعنويّ على مقياس ليكرت (٠٫٥×عددٍ تقريبيّ) — تُستعمل في التمييز */
  const DIFF_GAP = 3;
  const DIM_GAP = 2;

  /* ════════════════════ الدالّة الأولى — ترتيب المحاور ════════════════════
     answers = { action:{qId:{أ,ب,ج}}, longing:{...}, critique:{...} }
       كل قيمة درجة ليكرت ١..٧ (تقييم مستقلّ لكل خيار).
     تُرجع ترتيب المحاور (رئيسيّ/فرعيّ/مكبوت) + إشارات النقد والاشتياق. */
  function computeAxisRanking(answers) {
    answers = answers || {};
    const Q = _q();

    // مجمّعات لكل محور عبر الكتل الثلاث
    const actionSum  = { tamasuk: 0, hayawiyya: 0, intima: 0 };
    const longingSum = { tamasuk: 0, hayawiyya: 0, intima: 0 };
    const critiqueSum= { tamasuk: 0, hayawiyya: 0, intima: 0 };
    const actionN    = { tamasuk: 0, hayawiyya: 0, intima: 0 };

    function _accumulate(block, sumObj, countObj) {
      const qs = Q.L1[block] || [];
      const ans = answers[block] || {};
      qs.forEach(function (q) {
        const a = ans[q.id];
        if (!a || typeof a !== "object") return;
        CHOICES.forEach(function (L) {
          const opt = q.options && q.options[L];
          if (!opt || !opt.axis) return;
          const v = a[L];
          if (typeof v !== "number" || isNaN(v)) return;
          sumObj[opt.axis] += v;
          if (countObj) countObj[opt.axis] += 1;
        });
      });
    }

    _accumulate("action",  actionSum,  actionN);
    _accumulate("longing", longingSum, null);
    _accumulate("critique",critiqueSum,null);

    // ترتيب أساسيّ بالفعل التلقائيّ (الإشارة الأقوى للهيمنة)
    const order = AXIS_IDS.map(function (ax) {
      return {
        axisId: ax,
        action: actionSum[ax],
        longing: longingSum[ax],
        critique: critiqueSum[ax],
        // فجوة الاشتياق فوق الفعل: موجبةٌ = جذبٌ بلا فعل (تسريب فرعيّ/مكبوت)
        longingGap: longingSum[ax] - actionSum[ax]
      };
    });

    // ترتيب تنازليّ بالفعل، وعند التعادل: النقد الأعلى أقرب للكبت (يُؤخَّر)، ثمّ ثبات الترتيب
    order.sort(function (a, b) {
      return (b.action - a.action)
          || (a.critique - b.critique)
          || (AXIS_IDS.indexOf(a.axisId) - AXIS_IDS.indexOf(b.axisId));
    });

    let primary   = order[0] || null;
    let secondary = order[1] || null;
    let repressed = order[2] || null;

    // تصحيح الخطأ الشائع: محورٌ اشتياقه عالٍ وفعله منخفض لا يصلح رئيسًا.
    // لو الرئيسيّ الحاليّ فعله لا يفوق الثاني فعليًّا والثاني فعله أعلى صدقًا — يُحسم بالفعل وحده (مضمون أعلاه).

    // بذرة المكبوت: المحور الأدنى فعلًا، يؤكّده نقدٌ عالٍ تجاهه أو فجوة اشتياقٍ موجبة.
    let repressedConfirmed = false;
    if (repressed) {
      const critiqueRank = order.slice().sort(function (a, b) { return b.critique - a.critique; });
      const highestCritique = critiqueRank[0] ? critiqueRank[0].axisId : null;
      repressedConfirmed = (highestCritique === repressed.axisId) || (repressed.longingGap > DIFF_GAP);
    }

    // إشارة ضعيفة: كل المحاور قريبةٌ من بعضها في الفعل (فرقٌ ضئيل بين الأوّل والثالث)
    const span = primary && repressed ? (primary.action - repressed.action) : 0;
    const weakSignal = span < DIFF_GAP;

    return {
      ranking: order,                               // مرتّبة تنازليًّا بالفعل
      primaryAxis:   primary ? primary.axisId : null,
      secondaryAxis: secondary ? secondary.axisId : null,
      repressedAxis: repressed ? repressed.axisId : null,
      repressedConfirmed: repressedConfirmed,
      weakSignal: weakSignal,
      sums: { action: actionSum, longing: longingSum, critique: critiqueSum }
    };
  }

  /* ════════════════════ الدالّة الثانية — احتراق أبعاد محور ════════════════════
     computeDimensionBurnout(axisId, ratingsByDim)
       ratingsByDim = { dimId: [r1,r2,r3], ... }  (٣ تقييمات لكل بُعد ١..٧)
       ratings[i] يقابل L2[axisId][dimId][i] (نفس ترتيب العرض).
     يُرجع لكل بُعد: balance/excess/deficit/position/positionLabel + شدّة الاحتراق،
     ويحدّد البُعد الأشدّ احتراقًا (هدف التعافي). */
  function computeDimensionBurnout(axisId, ratingsByDim) {
    const Q = _q();
    const axisL2 = Q.L2[axisId];
    if (!axisL2) throw new Error("لا أبعاد طيف للمحور: " + axisId);
    ratingsByDim = ratingsByDim || {};

    const dims = {};
    let worst = null; // { dimId, distance, position }

    Object.keys(axisL2).forEach(function (dimId) {
      const statements = axisL2[dimId];
      const ratings = ratingsByDim[dimId] || [];
      if (ratings.length !== statements.length) {
        throw new Error("عدد تقييمات البُعد " + axisId + "/" + dimId + " (" + ratings.length +
                        ") لا يطابق عدد عباراته (" + statements.length + ").");
      }

      let balance = 0, excess = 0, deficit = 0;
      statements.forEach(function (st, i) {
        const v = ratings[i];
        if (typeof v !== "number" || isNaN(v)) throw new Error("تقييم غير رقميّ في " + axisId + "/" + dimId + " الموضع " + i + ".");
        if (st.category === "balance") balance += v;
        else if (st.category === "excess") excess += v;
        else if (st.category === "deficit") deficit += v;
        else throw new Error("تصنيف غير معروف (" + st.category + ") في " + axisId + "/" + dimId + ".");
      });

      // الموقع: الأعلى من الثلاثة، بشرط فرقه عن الثاني ≥ DIFF_GAP، وإلّا تذبذب/التباس
      const trio = [
        { key: "balance", label: "اتزان", val: balance },
        { key: "excess",  label: "إفراط", val: excess  },
        { key: "deficit", label: "تفريط", val: deficit }
      ].sort(function (a, b) { return b.val - a.val; });

      let position, positionLabel;
      const both = (excess >= 5) && (deficit >= 5) && (balance < excess) && (balance < deficit);
      if (both) {
        position = "both"; positionLabel = "تذبذب";
      } else if ((trio[0].val - trio[1].val) < DIM_GAP) {
        position = "ambiguous"; positionLabel = "التباس";
      } else {
        position = trio[0].key; positionLabel = trio[0].label;
      }

      // شدّة الاحتراق = البُعد عن الاتزان (كم يبعد الموقع المنزلق عن الاتزان)
      let distance = 0;
      if (position === "excess")       distance = excess  - balance;
      else if (position === "deficit") distance = deficit - balance;
      else if (position === "both")    distance = (excess + deficit) - balance;
      else if (position === "ambiguous") distance = Math.max(excess, deficit) - balance;
      else /* balance */               distance = 0;
      if (distance < 0) distance = 0;

      dims[dimId] = {
        dimId: dimId, balance: balance, excess: excess, deficit: deficit,
        position: position, positionLabel: positionLabel, distance: distance
      };

      // البُعد الأشدّ احتراقًا (الأبعد عن الاتزان، والاتزان نفسه لا يُحسَب هدفًا)
      if ((position === "excess" || position === "deficit" || position === "both") &&
          (worst === null || distance > worst.distance)) {
        worst = { dimId: dimId, distance: distance, position: position };
      }
    });

    return {
      axisId: axisId,
      dimensions: dims,
      burnedDim:   worst ? worst.dimId   : null,
      burnedShape: worst ? worst.position : null,   // excess / deficit / both / ambiguous
      isAxisBalanced: worst === null                // كل الأبعاد متّزنة
    };
  }

  /* ════════════════════ الدالّة الثالثة — خطّ العافية ════════════════════
     L3answers = { tawaqud:[r,r,r], hudur:[r,r,r], imtila:[r,r,r] } (١..٧ نزيفًا)
     يُرجع: درجة نزيف لكل مستوى + المستوى الأشدّ نزيفًا + درجة العافية (مقلوبة).
     العافية = 8 − متوسّط النزيف (كلّما زاد النزيف قلّت العافية). */
  function computeWellnessLine(L3answers) {
    L3answers = L3answers || {};
    const LEVELS = ["tawaqud", "hudur", "imtila"];
    const out = {};
    let worst = null;

    LEVELS.forEach(function (lvl) {
      const arr = L3answers[lvl] || [];
      let sum = 0, n = 0;
      arr.forEach(function (v) { if (typeof v === "number" && !isNaN(v)) { sum += v; n++; } });
      const bleed = n ? (sum / n) : 0;              // متوسّط النزيف ١..٧
      const wellness = n ? Math.round((8 - bleed) * 10) / 10 : null; // ١..٧ عافية
      out[lvl] = { level: lvl, bleed: Math.round(bleed * 10) / 10, wellness: wellness, raw: sum };
      if (n && (worst === null || bleed > worst.bleed)) worst = { level: lvl, bleed: bleed };
    });

    return {
      levels: out,
      worstLevel: worst ? worst.level : null,        // المستوى الأشدّ نزيفًا
      wellnessPoint: {                                // أوّل نقطة على خطّ العافية
        tawaqud: out.tawaqud ? out.tawaqud.wellness : null,
        hudur:   out.hudur   ? out.hudur.wellness   : null,
        imtila:  out.imtila  ? out.imtila.wellness  : null
      }
    };
  }

  /* ════════════════════ الميل النوعيّ (للقاع، لا يُعلَن) ════════════════════
     يجمع المخرجات الثلاثة ويحسب ميلًا واحدًا: محترق / مجوّع / مكبوت.
       • تطابق المستوى الأشدّ نزيفًا مع مستوى المحور الرئيسيّ + أبعادٌ في إفراط → محترق.
       • عدم التطابق → مجوّع.
       • نقدٌ عالٍ مؤكِّد للمكبوت مع حملٍ على الرئيسيّ → مكبوت (يُرجَّح إن تحقّق).
     يُرجع { lean, matched, reason } — يُخزَّن، لا يُعرَض. */
  function computeBurnoutLean(rankingResult, burnoutResult, wellnessResult) {
    const cfg = _cfg();
    const primary = rankingResult ? rankingResult.primaryAxis : null;
    const worstLevel = wellnessResult ? wellnessResult.worstLevel : null;

    // مستوى المحور الرئيسيّ المتوقَّع
    const axisObj = (cfg.axes || []).find(function (a) { return a.id === primary; });
    const expectedLevel = axisObj ? axisObj.burnoutLevel : null;
    const matched = (expectedLevel && worstLevel) ? (expectedLevel === worstLevel) : null;

    // هل في أبعاد المحور الرئيسيّ إفراط/تذبذب؟ (دليل اللفّ الساخن)
    let hasExcess = false;
    if (burnoutResult && burnoutResult.dimensions) {
      Object.keys(burnoutResult.dimensions).forEach(function (d) {
        const p = burnoutResult.dimensions[d].position;
        if (p === "excess" || p === "both") hasExcess = true;
      });
    }

    let lean = null, reason = "";

    if (rankingResult && rankingResult.repressedConfirmed && _repressedLoadsPrimary(rankingResult)) {
      lean = "makbut";
      reason = "نقدٌ عالٍ مؤكِّد للمحور المكبوت مع حملٍ مضاعفٍ على الرئيسيّ.";
    } else if (matched === true) {
      lean = "muhtariq";
      reason = "تطابق المحور الرئيسيّ مع المستوى الأشدّ نزيفًا" + (hasExcess ? " مع أبعادٍ في إفراط." : ".");
    } else if (matched === false) {
      lean = "mujawwa";
      reason = "المستوى الأشدّ نزيفًا لا يطابق مستوى المحور الرئيسيّ — البيئة لا تغذّي المحور.";
    } else {
      lean = null; // غير محسوم بعد
      reason = "إشارة غير كافية لحسم الميل.";
    }

    return { lean: lean, matched: matched, hasExcess: hasExcess, expectedLevel: expectedLevel, worstLevel: worstLevel, reason: reason };
  }

  // المكبوت يحمّل الرئيسيّ: فجوة الاشتياق للمكبوت موجبة قويّة (دليلٌ غير مباشر على الحمل)
  function _repressedLoadsPrimary(rankingResult) {
    if (!rankingResult || !rankingResult.ranking) return false;
    const rep = rankingResult.ranking.find(function (r) { return r.axisId === rankingResult.repressedAxis; });
    return !!(rep && rep.longingGap > DIFF_GAP);
  }

  /* ════════════════════ تحقّق سلامة ════════════════════ */
  function verifyIntegrity() {
    const issues = [];
    const cfg = _resolve("AXES_CONFIG", "./axes-config.js");
    const Q   = _resolve("AXES_QUESTIONS", "./axes-questions.js");
    if (!cfg) issues.push("AXES_CONFIG غير متاح");
    if (!Q)   issues.push("AXES_QUESTIONS غير متاح");
    if (!cfg || !Q) return { ok: issues.length === 0, issues: issues };

    // الطبقة الأولى: كل بند يغطّي المحاور الثلاثة بخيارات أ/ب/ج
    ["action", "longing", "critique"].forEach(function (block) {
      (Q.L1[block] || []).forEach(function (q) {
        const seen = new Set();
        CHOICES.forEach(function (L) {
          const opt = q.options && q.options[L];
          if (!opt || !opt.axis) { issues.push(q.id + ": ينقص الخيار " + L); return; }
          if (AXIS_IDS.indexOf(opt.axis) === -1) issues.push(q.id + "/" + L + ": محور غير معروف " + opt.axis);
          seen.add(opt.axis);
        });
        if (seen.size !== 3) issues.push(q.id + ": لا يغطّي المحاور الثلاثة");
      });
    });

    // الطبقة الثانية: كل بُعد ثلاث حالات بتصنيفات balance/excess/deficit
    AXIS_IDS.forEach(function (ax) {
      const axL2 = Q.L2[ax];
      if (!axL2) { issues.push("لا أبعاد طيف للمحور " + ax); return; }
      const axisCfg = (cfg.axes || []).find(function (a) { return a.id === ax; });
      const declaredDims = axisCfg ? axisCfg.dimensions.map(function (d) { return d.id; }) : [];
      declaredDims.forEach(function (dimId) {
        const sts = axL2[dimId];
        if (!Array.isArray(sts)) { issues.push("لا عبارات للبُعد " + ax + "/" + dimId); return; }
        const cats = sts.map(function (x) { return x.category; }).slice().sort().join(",");
        if (cats !== "balance,deficit,excess") issues.push(ax + "/" + dimId + ": تصنيفات غير متوقَّعة [" + sts.map(function (x){return x.category;}).join(",") + "]");
      });
    });

    // الطبقة الثالثة: ثلاثة مستويات، كلٌّ ثلاث عبارات
    ["tawaqud", "hudur", "imtila"].forEach(function (lvl) {
      const arr = Q.L3[lvl];
      if (!Array.isArray(arr) || arr.length !== 3) issues.push("نبضة " + lvl + ": عدد العبارات غير متوقَّع");
    });

    return { ok: issues.length === 0, issues: issues };
  }

  return {
    computeAxisRanking: computeAxisRanking,
    computeDimensionBurnout: computeDimensionBurnout,
    computeWellnessLine: computeWellnessLine,
    computeBurnoutLean: computeBurnoutLean,
    verifyIntegrity: verifyIntegrity,
    AXIS_IDS: AXIS_IDS
  };
});
