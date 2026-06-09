/* ════════════════════════════════════════════════════════════════════════
   axes-bridge.js — جسر مقياس المحاور (Reignite)
   ────────────────────────────────────────────────────────────────────────
   منطق نقيّ: لا UI، لا HTML، لا Firestore، لا حساب. يقف بين المحرّك
   (axes-engine.js) والمحتوى (axes-content.js). وظيفته الترجمة والفرز فقط:
   أيّ فقرةٍ لأيّ محور/بُعد/شكل، وبناء جملة الجسر بحقن الوسوم.

   الربط بالهويّة دائمًا (axisId / dimId / shape / level).
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.AXES_BRIDGE = api;
  if (typeof globalThis !== "undefined") globalThis.AXES_BRIDGE = api;
})(this, function () {
  "use strict";

  function _resolve(name, requirePath) {
    try {
      if (name === "AXES_CONTENT" && typeof AXES_CONTENT !== "undefined") return AXES_CONTENT;
      if (name === "AXES_CONFIG"  && typeof AXES_CONFIG  !== "undefined") return AXES_CONFIG;
    } catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) { /* تجاهُل */ }
    }
    return null;
  }
  function _content() { const v = _resolve("AXES_CONTENT", "./axes-content.js"); if (!v) throw new Error("AXES_CONTENT غير متاح."); return v; }
  function _cfg()     { return _resolve("AXES_CONFIG", "./axes-config.js"); }

  /* فقرة المحور بدوره (رئيسيّ/فرعيّ/مكبوت) */
  function primaryParagraph(axisId)   { return (_content().primary   || {})[axisId] || ""; }
  function secondaryParagraph(axisId) { return (_content().secondary || {})[axisId] || ""; }
  function repressedSeed(axisId)      { return (_content().repressed || {})[axisId] || ""; }

  /* فقرة البُعد المحترق حسب الشكل (excess/deficit/both)، أو رسالة الاتزان */
  function burnedDimensionParagraph(axisId, dimId, shape) {
    const C = _content();
    if (!dimId || shape === "balance" || shape === null) return C.balanceMessage || "";
    const axisBlock = (C.burnedDimension || {})[axisId] || {};
    const dimBlock = axisBlock[dimId] || {};
    // التباس → نعرضه كرسالة تذبذب أقرب الأشكال، أو رسالة اتزان إن غاب
    if (shape === "ambiguous") return dimBlock.both || C.balanceMessage || "";
    return dimBlock[shape] || C.balanceMessage || "";
  }

  /* اسم شكل الانزلاق لحقنه في الجسر */
  function shapeLabel(axisId, dimId, shape) {
    const C = _content();
    const axisBlock = (C.shapeLabels || {})[axisId] || {};
    const dimBlock = axisBlock[dimId] || {};
    if (shape === "ambiguous") return dimBlock.both || "";
    return dimBlock[shape] || "";
  }

  /* اسم البُعد للعرض (من الـconfig) */
  function dimName(axisId, dimId) {
    const cfg = _cfg();
    if (!cfg) return dimId;
    const ax = (cfg.axes || []).find(function (a) { return a.id === axisId; });
    if (!ax) return dimId;
    const d = (ax.dimensions || []).find(function (x) { return x.id === dimId; });
    return d ? d.name : dimId;
  }

  /* اسم المحور للعرض */
  function axisName(axisId) {
    const cfg = _cfg();
    if (!cfg) return axisId;
    const ax = (cfg.axes || []).find(function (a) { return a.id === axisId; });
    return ax ? ax.name : axisId;
  }

  /* ════════════════════ جملة الجسر ════════════════════
     تربط الإحساس (المستوى الأشدّ نزيفًا) بالبنية (المحور/البُعد/الشكل).
     matched = هل المستوى الأشدّ نزيفًا يطابق مستوى المحور الرئيسيّ؟
       • مطابق → فقرة الجسر للمحور، مع حقن اسم البُعد والشكل.
       • غير مطابق → نضيف صيغة المجوّع البديلة (بذرة، لا إعلان). */
  function buildBridge(primaryAxis, burnedDim, burnedShape, matched) {
    const C = _content();
    const tmpl = (C.bridge || {})[primaryAxis] || "";
    const dN = dimName(primaryAxis, burnedDim);
    const sL = shapeLabel(primaryAxis, burnedDim, burnedShape);

    let sentence = tmpl.replace("{البُعد}", dN).replace("{الشكل}", sL);

    // لو البُعد متّزن (لا احتراق) لا معنى لحقن شكل — نكتفي بصدر الجملة
    if (!burnedDim || burnedShape === "balance" || burnedShape === null) {
      // نقصّ الجملة عند أوّل فاصلة منطقيّة لتفادي وسمٍ فارغ
      sentence = tmpl.split("؛")[0] + "؛ ومحورك في معظمه يعمل في اتزان، فاحرسه.";
    }

    if (matched === false && C.bridge && C.bridge.mismatch) {
      sentence += " " + C.bridge.mismatch;
    }
    return sentence;
  }

  /* نصّ نبضة الإحساس للمستوى الأشدّ نزيفًا */
  function burnoutNarrative(worstLevel) {
    return (_content().burnoutNarrative || {})[worstLevel] || "";
  }

  /* النصوص الثابتة */
  function opening() { return _content().opening || {}; }
  function closing() { return _content().closing || {}; }
  function positionLabel(pos) { return (_content().positionLabels || {})[pos] || pos; }

  return {
    primaryParagraph: primaryParagraph,
    secondaryParagraph: secondaryParagraph,
    repressedSeed: repressedSeed,
    burnedDimensionParagraph: burnedDimensionParagraph,
    shapeLabel: shapeLabel,
    dimName: dimName,
    axisName: axisName,
    buildBridge: buildBridge,
    burnoutNarrative: burnoutNarrative,
    opening: opening,
    closing: closing,
    positionLabel: positionLabel
  };
});
