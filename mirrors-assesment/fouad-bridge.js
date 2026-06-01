/* ════════════════════════════════════════════════════════════════════════
   fouad-bridge.js — جسر مقياس الفؤاد v2
   ────────────────────────────────────────────────────────────────────────
   منطق نقيّ بالكامل: لا UI، لا HTML، لا Firestore، لا نصّ معروض للمستخدم.
   يقف بين محرّك الحساب (calc-engine.js) وبين المحتوى التعليميّ
   (educational-content.js). وظيفته الترجمة والفرز فقط — لا حساب ولا عرض.

   ثلاث دوالّ:
     1) resolveDominantAxis  — معرّف محور الطابع الأقوى لمرآة (ربط بالهوية).
     2) resolveDisplayScenario — أيّ سيناريو عرض (weak/dual/closeness/clear).
     3) resolveSpectrumKey   — مفتاح القراءة النصّيّ المطابق للمحتوى التعليميّ.

   مبدأ حاكم: الربط بالهوية (mirrorId + types) لا بالرقم في كلّ موضع.
   التصدير مزدوج بنفس نمط calc-engine.js (window + module.exports).
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;       // Node
  if (typeof window !== "undefined") window.FOUAD_BRIDGE = api;                     // المتصفّح
  if (typeof globalThis !== "undefined") globalThis.FOUAD_BRIDGE = api;
})(this, function () {
  "use strict";

  /* ───────────────── محلِّل المصدر (يعمل في المتصفّح وفي Node) ─────────────────
     نفس منطق calc-engine: في المتصفّح يُقرأ FOUAD_CONFIG كاسمٍ مجرّد من سكربتٍ
     سابق، وفي Node عبر require. typeof على اسم غير معرَّف آمن (لا يرمي خطأً). */
  function _resolve(name, requirePath) {
    try {
      if (name === "FOUAD_CONFIG" && typeof FOUAD_CONFIG !== "undefined") return FOUAD_CONFIG;
    } catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) { /* تجاهُل */ }
    }
    return null;
  }
  // الجسر لا يتعطّل لو غاب الـconfig؛ يرجع null ويلجأ لاحقًا لاحتياطٍ آمن.
  function _cfg() { return _resolve("FOUAD_CONFIG", "./mirrors-config.js"); }

  /* مفاتيح القراءة التسعة المعتمدة في المحتوى التعليميّ — مرجع تحقّق نهائيّ. */
  const SPECTRUM_KEYS = [
    "balance", "suspicious_balance",
    "excess_a", "excess_b", "excess_both",
    "deficit_a", "deficit_b", "deficit_both",
    "ambiguous"
  ];

  /* سيناريوهات العرض الأربعة. */
  const SCENARIOS = ["weak", "dual", "closeness", "clear"];

  /* ════════════════════ الدالّة الأولى — محور الطابع الأقوى ════════════════════
     resolveDominantAxis(identification, mirrorId)
       identification = مخرج computeMirrorIdentification (يحوي ranking + mirrorId).
       mirrorId       = معرّف المراية (اختياريّ؛ يُؤخذ من المخرج إن غاب).
     تُرجع axisId الذي ينتمي إليه الطابع الأقوى — بالبحث في MIRRORS بالهوية.
     مدخلٌ ناقص → null آمن بدل التعطّل. */
  function resolveDominantAxis(identification, mirrorId) {
    if (!identification || !Array.isArray(identification.ranking) || identification.ranking.length === 0) {
      return null;
    }
    const mid = mirrorId || identification.mirrorId || null;
    const topType = identification.ranking[0] && identification.ranking[0].type;
    if (!topType) return null;

    // الربط بالهوية: المراية بمعرّفها، ثمّ المحور الذي يضمّ الطابع الأقوى في types.
    const cfg = _cfg();
    if (cfg && Array.isArray(cfg.mirrors) && mid) {
      const mirror = cfg.mirrors.find(function (m) { return m.id === mid; });
      if (mirror && Array.isArray(mirror.axes)) {
        const axis = mirror.axes.find(function (ax) {
          return Array.isArray(ax.types) && ax.types.indexOf(topType) !== -1;
        });
        if (axis) return axis.id;
      }
    }
    // احتياط آمن: المحرّك نفسه يحمل axisId مشتقًّا من الهوية في حقول الترتيب.
    return (identification.ranking[0] && identification.ranking[0].axisId) || null;
  }

  /* ════════════════════ الدالّة الثانية — فرز سيناريو العرض ════════════════════
     resolveDisplayScenario(identification)
       تقرأ الأعلام: weakSignal / dualAxis / sameAxisCloseness + الترتيب.
     ترتيب الأولويّة الصارم: weak ← dual ← closeness ← clear (أوّل متحقّق يحكم).
     تُرجع كائنًا: { scenario, level, doors }
       weak      → لا باب، محتوى على مستوى المراية         level="mirror", doors=[]
       dual      → بابان لمحورَي الترتيب الأوّلين            level="axis",   doors=[axisId,axisId]
       closeness → باب الطابع الأوّل فقط                    level="type",   doors=[typeId]
       clear     → باب الطابع الأوّل فقط (الافتراضيّ)        level="type",   doors=[typeId] */
  function resolveDisplayScenario(identification) {
    const ranking = (identification && Array.isArray(identification.ranking)) ? identification.ranking : [];
    const firstType = ranking[0] ? ranking[0].type : null;

    // (د) إشارة ضعيفة — يُلغي ما عداه: لا يُعرض أيّ باب.
    if (identification && identification.weakSignal === true) {
      return { scenario: "weak", level: "mirror", doors: [] };
    }
    // (ب) تقارب محورين مختلفين — بابان. dualAxis من المحرّك = [axisId1, axisId2].
    if (identification && identification.dualAxis) {
      const pair = Array.isArray(identification.dualAxis) ? identification.dualAxis.slice(0, 2) : [];
      return { scenario: "dual", level: "axis", doors: pair };
    }
    // (ج) تقارب داخل المحور الواحد — باب الطابع الأوّل.
    if (identification && identification.sameAxisCloseness === true) {
      return { scenario: "closeness", level: "type", doors: firstType ? [firstType] : [] };
    }
    // (أ) الحالة الواضحة الافتراضيّة — باب الطابع الأوّل.
    return { scenario: "clear", level: "type", doors: firstType ? [firstType] : [] };
  }

  /* تجريد لاحقة الصورة إلى a / b / both — يحلّ اختلاف التسمية بين المحرّك والمحتوى.
     المحرّك قد يُخرج "excess_a" أو "deficit_both" أو لاحقةً مجرّدة "a"/"both".
     أيّ شكل غير متوقَّع أو غياب الصورة → "both" (أعمّ الحالات، الأسلم). */
  function _imageSuffix(image) {
    if (typeof image !== "string" || !image) return "both";
    var img = image.toLowerCase().replace(/^excess_/, "").replace(/^deficit_/, "");
    return (img === "a" || img === "b" || img === "both") ? img : "both";
  }

  /* ════════════════════ الدالّة الثالثة — مفتاح القراءة ════════════════════
     resolveSpectrumKey(spectrum)
       spectrum = مخرج computeAxisSpectrum (position / image / ambiguous / suspiciousBalance).
     جدول أولويّة صارم — أوّل شرط يتحقّق يحكم، من فوقٍ لتحت:
       1) ambiguous            → "ambiguous"
       2) suspiciousBalance    → "suspicious_balance"   (camelCase → snake_case)
       3) position "balance"   → "balance"
       4) position "excess"    → "excess_"  + لاحقة الصورة
       5) position "deficit"   → "deficit_" + لاحقة الصورة
     المخرج دائمًا snake_case ومن ضمن المفاتيح التسعة حصرًا.
     مدخلٌ ناقص أو موقعٌ غير متوقَّع → "ambiguous" (أسلم قراءة عند نقص البيانات). */
  function resolveSpectrumKey(spectrum) {
    if (!spectrum || typeof spectrum !== "object") return "ambiguous";

    if (spectrum.ambiguous === true) return "ambiguous";
    if (spectrum.suspiciousBalance === true) return "suspicious_balance";

    const position = spectrum.position;
    if (position === "balance") return "balance";
    if (position === "excess")  return "excess_"  + _imageSuffix(spectrum.image);
    if (position === "deficit") return "deficit_" + _imageSuffix(spectrum.image);

    return "ambiguous"; // أيّ موقع غير معروف → ملتبس
  }

  return {
    resolveDominantAxis: resolveDominantAxis,
    resolveDisplayScenario: resolveDisplayScenario,
    resolveSpectrumKey: resolveSpectrumKey,
    SPECTRUM_KEYS: SPECTRUM_KEYS,
    SCENARIOS: SCENARIOS
  };
});


/* ════════════════════════════════════════════════════════════════════════
   اختبار ذاتيّ — يعمل عند تشغيل الملف مباشرةً في Node فقط (لا في المتصفّح).
   يغطّي: الحالات التسع للدالّة الثالثة، السيناريوهات الأربعة + الأولويّة
   للدالّة الثانية، ومثالًا للدالّة الأولى. يطبع نجاح/فشل كلّ اختبار.
   ════════════════════════════════════════════════════════════════════════ */
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const B = module.exports;

  let passed = 0, failed = 0;
  function _eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function check(name, got, want) {
    const ok = _eq(got, want);
    if (ok) passed++; else failed++;
    console.log((ok ? "✓ " : "✗ ") + name +
      (ok ? "" : "   → الناتج: " + JSON.stringify(got) + " | المتوقَّع: " + JSON.stringify(want)));
  }

  console.log("\n══ الدالّة الثالثة — مفاتيح القراءة التسعة ══");
  check("ambiguous (علم ملتبس)",          B.resolveSpectrumKey({ ambiguous: true }), "ambiguous");
  check("suspicious_balance (camelCase)", B.resolveSpectrumKey({ suspiciousBalance: true, position: "balance" }), "suspicious_balance");
  check("balance",                        B.resolveSpectrumKey({ position: "balance" }), "balance");
  check("excess_a",                       B.resolveSpectrumKey({ position: "excess",  image: "excess_a" }),  "excess_a");
  check("excess_b",                       B.resolveSpectrumKey({ position: "excess",  image: "excess_b" }),  "excess_b");
  check("excess_both",                    B.resolveSpectrumKey({ position: "excess",  image: "excess_both" }), "excess_both");
  check("deficit_a",                      B.resolveSpectrumKey({ position: "deficit", image: "deficit_a" }), "deficit_a");
  check("deficit_b",                      B.resolveSpectrumKey({ position: "deficit", image: "deficit_b" }), "deficit_b");
  check("deficit_both",                   B.resolveSpectrumKey({ position: "deficit", image: "deficit_both" }), "deficit_both");

  console.log("\n══ الدالّة الثالثة — توحيد التسمية والأولويّة والأمان ══");
  check("لاحقة مجرّدة 'a' → excess_a",    B.resolveSpectrumKey({ position: "excess", image: "a" }), "excess_a");
  check("الصورة 'both' المجرّدة → deficit_both", B.resolveSpectrumKey({ position: "deficit", image: "both" }), "deficit_both");
  check("صورة غائبة → both افتراضيًّا",   B.resolveSpectrumKey({ position: "excess" }), "excess_both");
  check("الأولويّة: ambiguous يسبق suspicious", B.resolveSpectrumKey({ ambiguous: true, suspiciousBalance: true }), "ambiguous");
  check("الأولويّة: suspicious يسبق excess", B.resolveSpectrumKey({ suspiciousBalance: true, position: "excess", image: "excess_a" }), "suspicious_balance");
  check("مدخل غائب → ambiguous آمن",     B.resolveSpectrumKey(undefined), "ambiguous");
  check("المخرج دائمًا ضمن المفاتيح التسعة", B.SPECTRUM_KEYS.indexOf(B.resolveSpectrumKey({ position: "خطأ" })) !== -1, true);

  console.log("\n══ الدالّة الثانية — سيناريوهات العرض الأربعة ══");
  check("weak (د)",      B.resolveDisplayScenario({ weakSignal: true, ranking: [{ type: "type1" }] }),
                         { scenario: "weak", level: "mirror", doors: [] });
  check("dual (ب)",      B.resolveDisplayScenario({ dualAxis: ["module1", "module2"], ranking: [{ type: "type1" }, { type: "type3" }] }),
                         { scenario: "dual", level: "axis", doors: ["module1", "module2"] });
  check("closeness (ج)", B.resolveDisplayScenario({ sameAxisCloseness: true, ranking: [{ type: "type1" }] }),
                         { scenario: "closeness", level: "type", doors: ["type1"] });
  check("clear (أ)",     B.resolveDisplayScenario({ ranking: [{ type: "type1" }] }),
                         { scenario: "clear", level: "type", doors: ["type1"] });

  console.log("\n══ الدالّة الثانية — أولويّة الأعلام عند التزاحم ══");
  check("weak يسبق الجميع", B.resolveDisplayScenario({ weakSignal: true, dualAxis: ["m1", "m2"], sameAxisCloseness: true, ranking: [{ type: "type1" }] }).scenario, "weak");
  check("dual يسبق closeness", B.resolveDisplayScenario({ dualAxis: ["m1", "m2"], sameAxisCloseness: true, ranking: [{ type: "type1" }] }).scenario, "dual");
  check("مدخل غائب → clear آمن", B.resolveDisplayScenario(undefined), { scenario: "clear", level: "type", doors: [] });

  console.log("\n══ الدالّة الأولى — محور الطابع الأقوى (ربط بالهوية) ══");
  let cfgAvailable = false;
  try { const c = require("./mirrors-config.js"); cfgAvailable = !!(c && c.mirrors); } catch (e) { /* تجاهُل */ }

  if (cfgAvailable) {
    // المدخل يحمل axisId خاطئًا عمدًا — الدالّة يجب أن تتجاوزه بالبحث في الهوية.
    check("type1 في mirror1 → module1 (يتجاوز axisId الخاطئ)",
          B.resolveDominantAxis({ mirrorId: "mirror1", ranking: [{ type: "type1", axisId: "axis_خاطئ" }] }, "mirror1"),
          "module1");
    check("type8 في mirror1 → module2 (الحزم)",
          B.resolveDominantAxis({ mirrorId: "mirror1", ranking: [{ type: "type8" }] }),
          "module2");
    check("type9 في mirror3 → module9 (التحويل)",
          B.resolveDominantAxis({ ranking: [{ type: "type9" }] }, "mirror3"),
          "module9");
    check("مدخل ناقص → null آمن",
          B.resolveDominantAxis({ ranking: [] }, "mirror1"), null);
  } else {
    console.log("  (mirrors-config.js غير متاح — اختبار الاحتياط الآمن بدلًا منه)");
    check("بدون config: احتياط إلى axisId المرفق",
          B.resolveDominantAxis({ mirrorId: "mirror1", ranking: [{ type: "type1", axisId: "module1" }] }, "mirror1"),
          "module1");
  }

  console.log("\n──────────────────────────────");
  console.log("النتيجة: نجح " + passed + " / فشل " + failed);
  console.log(failed === 0 ? "✓ كلّ الاختبارات نجحت." : "✗ توجد اختبارات فاشلة — راجع أعلاه.");
}
