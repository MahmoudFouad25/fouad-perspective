/* ════════════════════════════════════════════════════════════════════════
   calc-engine.js — محرّك حساب مقياس الفؤاد v2
   ────────────────────────────────────────────────────────────────────────
   منطق حساب نقيّ: لا UI، لا HTML، لا Firestore، لا عرض، لا تخزين.
   يقرأ المحتوى الثابت (config + أسئلة التحديد + عبارات الطيف) ويُرجع
   نتائج محسوبة جاهزة. الربط بالهوية (mirrorId/axisId/types) لا بالأرقام.

   مصادر القراءة (محتوى ثابت تبنيه ملفات أخرى):
     • FOUAD_CONFIG            ← mirrors-config.js
     • IDENTIFICATION_QUESTIONS ← identification-questions.js
     • SPECTRUM_STATEMENTS     ← spectrum-questions.js

   تنبيه بنيويّ حاسم (محسوم داخل المحرّك):
     ترتيب عبارات الطيف ليس واحدًا عبر المودويلات (الملف نفسه يوثّق تبديلتين).
     لذلك يُحسب الموقع من حقل category لكلّ عبارة، لا من موضعها في المصفوفة.
     ratings[i] يقابل SPECTRUM_STATEMENTS[axisId][i] دائمًا (نفس ترتيب العرض)،
     والمحرّك يجمع balance/excess/deficit بقراءة category لا بمواضع ثابتة.
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;       // Node
  if (typeof window !== "undefined") window.FOUAD_ENGINE = api;                     // المتصفّح
  if (typeof globalThis !== "undefined") globalThis.FOUAD_ENGINE = api;
})(this, function () {
  "use strict";

  /* ───────────────── محلِّل المصادر (يعمل في المتصفّح وفي Node) ─────────────────
     في المتصفّح: المتغيّرات const في سكربتات سابقة تُقرأ بالاسم المجرّد.
     في Node: تُجلَب عبر require (لمن يصدّر module.exports).
     typeof على اسم غير معرَّف آمن (يُرجع 'undefined' بلا خطأ). */
  function _resolve(name, requirePath) {
    try {
      if (name === "FOUAD_CONFIG" && typeof FOUAD_CONFIG !== "undefined") return FOUAD_CONFIG;
      if (name === "IDENTIFICATION_QUESTIONS" && typeof IDENTIFICATION_QUESTIONS !== "undefined") return IDENTIFICATION_QUESTIONS;
      if (name === "SPECTRUM_STATEMENTS" && typeof SPECTRUM_STATEMENTS !== "undefined") return SPECTRUM_STATEMENTS;
    } catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) { /* تجاهُل */ }
    }
    return null;
  }
  function _cfg()       { const v = _resolve("FOUAD_CONFIG", "./mirrors-config.js");            if (!v) throw new Error("FOUAD_CONFIG غير متاح — حمّل mirrors-config.js قبل المحرّك."); return v; }
  function _questions() { const v = _resolve("IDENTIFICATION_QUESTIONS", "./identification-questions.js"); if (!v) throw new Error("IDENTIFICATION_QUESTIONS غير متاح — حمّل identification-questions.js قبل المحرّك."); return v; }
  function _spectrum()  { const v = _resolve("SPECTRUM_STATEMENTS", "./spectrum-questions.js");  if (!v) throw new Error("SPECTRUM_STATEMENTS غير متاح — حمّل spectrum-questions.js قبل المحرّك (ويحتاج module.exports لتشغيله في Node)."); return v; }

  const CHOICES = ["أ", "ب", "ج"];

  /* بناء خريطة (نوع → محور) وترتيب الأنواع الثابت داخل مرآة بعينها. */
  function _mirrorMaps(mirror) {
    const typeToAxis = {};
    const order = [];
    mirror.axes.forEach(function (ax) {
      (ax.types || []).forEach(function (t) { typeToAxis[t] = ax.id; order.push(t); });
    });
    const orderIndex = {};
    order.forEach(function (t, i) { orderIndex[t] = i; });
    return { typeToAxis: typeToAxis, order: order, orderIndex: orderIndex };
  }

  /* ════════════════════ الدالّة الأولى — حساب التحديد لمرآة ════════════════════*/
    function computeMirrorIdentification(mirrorId, answers) {
    answers = answers || {};
    const cfg = _cfg();
    const Q = _questions();

    const mirror = cfg.mirrors.find(function (m) { return m.id === mirrorId; });
    if (!mirror) throw new Error("مرآة غير معروفة: " + mirrorId);
    const mq = Q[mirrorId];
    if (!mq) throw new Error("لا توجد أسئلة تحديد للمرآة: " + mirrorId);

    const maps = _mirrorMaps(mirror);

    // الدرجات الخام لكلّ نوع (تبدأ صفرًا، تتراكم بجمع درجات likert)
    const raw = {};
    maps.order.forEach(function (t) { raw[t] = 0; });

    // ── التقييم المستقل: كلّ خيار في كلّ سؤال يضيف درجته (١..٧) لطابعه ──
    //    (بدل forced-choice القديم: +1 للمختار وصفر للباقي)
    //    شكل الإجابة الجديد: answers[qId] = { "أ":n, "ب":n, "ج":n }
    mirror.axes.forEach(function (ax) {
      const qs = mq[ax.id];
      if (!Array.isArray(qs)) return;
      qs.forEach(function (q) {
        const ans = answers[q.id];
        if (!ans || typeof ans !== "object") return;            // سؤال غير مُجاب → تجاهُل
        CHOICES.forEach(function (L) {
          const opt = q.options && q.options[L];
          if (!opt || !opt.type) return;
          const score = ans[L];
          if (typeof score !== "number" || isNaN(score)) return; // خيار غير مُقيّم → تجاهُل
          if (Object.prototype.hasOwnProperty.call(raw, opt.type)) raw[opt.type] += score;
        });
      });
    });

    // ── النسبة المعايرة على المدى الحقيقيّ: خام ٦..٤٢ → ٠..١٠٠٪ ──
    //    (raw−6)/36×100 ، مع clamp للأمان لو بقي سؤالٌ غير مُجاب
    const ranking = maps.order.map(function (t) {
      const r = raw[t] || 0;
      let pct = Math.round(((r - 6) / 36) * 100);
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      return { type: t, axisId: maps.typeToAxis[t] || null, raw: r, percent: pct };
    });
    // تنازليًّا بالخام، وعند التساوي ترتيب ثابت (ترتيب الـconfig)
    ranking.sort(function (a, b) {
      return (b.raw - a.raw) || (maps.orderIndex[a.type] - maps.orderIndex[b.type]);
    });

    // ── العتبتان الوحيدتان (مؤسَّستان على بنية likert، لا على تكرارات) ──
    const PRESENCE = 24;  // متوسط ٤×٦ = نقطة الحياد = نصف المدى (٦..٤٢)
    const DIFF     = 3;   // فرق متوسط ٠٫٥×٦ = أصغر فرقٍ ذي دلالة عمليّة

    let absent           = false; // (أ) عدم الحضور — لا محور فوق الحياد
    let undifferentiated = false; // (ب) عدم التمييز — المحاور الثلاثة متّصلة
    let dualAxis         = null;  // (ج) بابان — محوران متمايزان متقاربان
    let sameAxisCloseness= false; // (د) الباب واضح والأسلوب داخله لا

    /* ── درجات المحاور: أعلى طابع في كلّ محور، وهو نفسه ما يعرضه التقرير ── */
    const axisRaw = {};
    ranking.forEach(function (r) {
      if (!r.axisId) return;
      if (axisRaw[r.axisId] === undefined || r.raw > axisRaw[r.axisId]) axisRaw[r.axisId] = r.raw;
    });
    const axisRank = Object.keys(axisRaw).map(function (id) {
      return { axisId: id, raw: axisRaw[id] };
    }).sort(function (a, b) { return b.raw - a.raw; });

    /* ── القرار الأوّل على مستوى المحور لا على مستوى الطابع ──
       فالتقرير يبني على الباب، والباب محورٌ لا طابع. وقياس الفجوة على
       الطبائع التسعة المسطّحة يرفع إشارةً ضعيفة حتّى حين يكون محوران
       متقدّمين بفارقٍ كبير على الثالث. */
    if (axisRank.length) {
      const a1 = axisRank[0];
      const a2 = axisRank[1] || null;
      const a3 = axisRank[2] || null;
      const gapA12 = a2 ? (a1.raw - a2.raw) : Infinity;
      const gapA23 = a3 ? (a2.raw - a3.raw) : Infinity;

      if (a1.raw <= PRESENCE) {
        absent = true;                                          // (أ)
      } else if (gapA12 >= DIFF) {
        /* (هـ) المحور واضح. والفرز الآن داخله: أثمّ أسلوبٌ متقدّم؟ */
        const inAxis = ranking.filter(function (r) { return r.axisId === a1.axisId; });
        if (inAxis.length >= 2 && (inAxis[0].raw - inAxis[1].raw) < DIFF) {
          sameAxisCloseness = true;                             // (د)
        }
      } else if (gapA23 >= DIFF) {
        dualAxis = [a1.axisId, a2.axisId];                      // (ج)
      } else {
        undifferentiated = true;                                // (ب)
      }
    }

    /* المحور الغالب يُقرأ من ترتيب المحاور، لا من أوّل طابع في القائمة */
    const dominantAxis = axisRank.length ? axisRank[0].axisId
                       : (ranking[0] ? ranking[0].axisId : null);

    return {
      mirrorId: mirrorId,
      ranking: ranking,
      dominantAxis: dominantAxis,
      dualAxis: dualAxis,
      sameAxisCloseness: sameAxisCloseness,
      absent: absent,
      undifferentiated: undifferentiated,
      // توافق خلفيّ: أيّ من الحالتين = إشارةٌ ضعيفة، للطبقات التي لم تُحدَّث بعد
      weakSignal: absent || undifferentiated
    };
  }

  /* ════════════════════ الدالّة الثانية — حساب الطيف لمحور ════════════════════
     computeAxisSpectrum(axisId, ratings)
       ratings = مصفوفة أرقام (1..7) بترتيب عبارات المحور كما في SPECTRUM_STATEMENTS.
       ratings[i] يقابل SPECTRUM_STATEMENTS[axisId][i] (نفس ترتيب العرض على العميل).
     الجمع يتمّ بقراءة category لا بمواضع ثابتة (الترتيب يختلف بين المودويلات).
     يُرجع: { axisId, balance, excess, deficit, position, positionLabel,
              image, ambiguous, suspiciousBalance } */
  function computeAxisSpectrum(axisId, ratings) {
    const S = _spectrum();
    const statements = S[axisId];
    if (!statements) throw new Error("لا توجد عبارات طيف للمحور: " + axisId);
    if (!Array.isArray(ratings) || ratings.length !== statements.length) {
      throw new Error("عدد التقييمات (" + (ratings ? ratings.length : "-") +
                      ") لا يطابق عدد عبارات المحور " + axisId + " (" + statements.length + ").");
    }

    let balance = 0;
    let excessA = null, excessB = null, deficitA = null, deficitB = null;

    statements.forEach(function (st, i) {
      const v = ratings[i];
      if (typeof v !== "number" || isNaN(v)) {
        throw new Error("تقييم غير رقميّ في الموضع " + i + " للمحور " + axisId + ".");
      }
      switch (st.category) {
        case "balance":   balance += v;  break;
        case "excess_a":  excessA = v;   break;
        case "excess_b":  excessB = v;   break;
        case "deficit_a": deficitA = v;  break;
        case "deficit_b": deficitB = v;  break;
        default: throw new Error("تصنيف غير معروف (" + st.category + ") في طيف " + axisId + ".");
      }
    });

    const excess  = (excessA || 0)  + (excessB || 0);
    const deficit = (deficitA || 0) + (deficitB || 0);

    // الموقع = الأعلى من الثلاثة، بشرط فرقه عن الثاني ≥ 3، وإلّا ملتبس
    const trio = [
      { key: "balance", label: "اتزان",  val: balance },
      { key: "excess",  label: "إفراط",  val: excess  },
      { key: "deficit", label: "تفريط",  val: deficit }
    ].sort(function (a, b) { return b.val - a.val; });

    const ambiguous = (trio[0].val - trio[1].val) < 3;

    let position, positionLabel, image = null;
    if (ambiguous) {
      position = "ambiguous";
      positionLabel = "ملتبس";
    } else {
      position = trio[0].key;
      positionLabel = trio[0].label;
      if (position === "excess") {
        if (excessA > excessB) image = "excess_a";
        else if (excessA < excessB) image = "excess_b";
        else image = "excess_both";          // التساوي — يطابق مفتاح المحتوى
      } else if (position === "deficit") {
        if (deficitA > deficitB) image = "deficit_a";
        else if (deficitA < deficitB) image = "deficit_b";
        else image = "deficit_both";         // التساوي — يطابق مفتاح المحتوى
      }
    }

    const suspiciousBalance = (balance >= 10 && deficit >= 10);

    return {
      axisId: axisId,
      balance: balance, excess: excess, deficit: deficit,
      position: position, positionLabel: positionLabel,
      image: image, ambiguous: ambiguous, suspiciousBalance: suspiciousBalance
    };
  }

  /* ════════════════════ تحقّق سلامة (الهوية مطابقة للـconfig) ════════════════════
     يتأكّد أنّ أنواع كلّ محور في الأسئلة تطابق الـconfig حرفيًّا، وأنّ كلّ سؤال
     يغطّي الأنواع الثلاثة، وأنّ كلّ مودويل طيف يحمل التصنيفات الستّة المتوقَّعة. */
  function verifyIntegrity() {
    const issues = [];
    const cfg = _resolve("FOUAD_CONFIG", "./mirrors-config.js");
    const Q   = _resolve("IDENTIFICATION_QUESTIONS", "./identification-questions.js");
    const S   = _resolve("SPECTRUM_STATEMENTS", "./spectrum-questions.js");
    if (!cfg) issues.push("FOUAD_CONFIG غير متاح");
    if (!Q)   issues.push("IDENTIFICATION_QUESTIONS غير متاح");
    if (!S)   issues.push("SPECTRUM_STATEMENTS غير متاح");
    if (!cfg || !Q) return { ok: issues.length === 0, issues: issues };

    const expectCats = ["balance", "balance", "deficit_a", "deficit_b", "excess_a", "excess_b"].join(",");

    cfg.mirrors.forEach(function (m) {
      const mq = Q[m.id];
      if (!mq) { issues.push("لا أسئلة تحديد للمرآة " + m.id); return; }
      m.axes.forEach(function (ax) {
        const qs = mq[ax.id];
        if (!Array.isArray(qs)) { issues.push("لا أسئلة للمحور " + m.id + "/" + ax.id); return; }
        if (qs.length !== 6) issues.push(m.id + "/" + ax.id + ": عدد الأسئلة " + qs.length + " (المتوقَّع 6)");
        const declared = new Set(ax.types);
        const seen = new Set();
        qs.forEach(function (q) {
          const qTypes = [];
          CHOICES.forEach(function (L) {
            const opt = q.options && q.options[L];
            if (!opt || !opt.type) { issues.push(q.id + ": ينقص الخيار " + L); return; }
            if (!declared.has(opt.type)) {
              issues.push(q.id + "/" + L + ": النوع " + opt.type + " ليس من أنواع المحور " + ax.id + " [" + ax.types.join(",") + "]");
            }
            qTypes.push(opt.type); seen.add(opt.type);
          });
          if (new Set(qTypes).size !== 3) issues.push(q.id + ": لا يغطّي الأنواع الثلاثة (" + qTypes.join(",") + ")");
        });
        ax.types.forEach(function (t) { if (!seen.has(t)) issues.push(m.id + "/" + ax.id + ": النوع " + t + " لا يظهر في أيّ خيار"); });

        if (S) {
          const st = S[ax.id];
          if (!st) { issues.push("لا عبارات طيف للمحور " + ax.id); return; }
          if (st.length !== 6) issues.push("طيف " + ax.id + ": عدد العبارات " + st.length + " (المتوقَّع 6)");
          const cats = st.map(function (x) { return x.category; }).slice().sort().join(",");
          if (cats !== expectCats) issues.push("طيف " + ax.id + ": تصنيفات غير متوقَّعة [" + st.map(function (x){return x.category;}).join(",") + "]");
        }
      });
    });
    return { ok: issues.length === 0, issues: issues };
  }

  return {
    computeMirrorIdentification: computeMirrorIdentification,
    computeAxisSpectrum: computeAxisSpectrum,
    verifyIntegrity: verifyIntegrity
  };
});


/* ════════════════════════════════════════════════════════════════════════
   مثال تشغيليّ صغير للتحقّق بالعين (يعمل عند تشغيل الملف مباشرةً في Node).
   لا يعمل في المتصفّح؛ مجرّد فحص يدويّ. يتطلّب أن تُحمَّل الملفات الثلاثة بنجاح.
   ════════════════════════════════════════════════════════════════════════ */
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const E = module.exports;

  console.log("\n— تحقّق السلامة —");
  try {
    const v = E.verifyIntegrity();
    console.log(v.ok ? "✓ كلّ الأنواع/التصنيفات مطابقة للـconfig." : "✗ مشاكل:\n  - " + v.issues.join("\n  - "));
  } catch (e) { console.log("تعذّر التحقّق: " + e.message); }

  // إجابات وهميّة لمرآة السلوك: تفضيل نوعٍ هدف لكلّ سؤال (تُبنى من الأسئلة نفسها)
  try {
    const Q = require("./identification-questions.js");
    const targets = {
      module1: ["type1","type1","type1","type1","type1","type1"],      // type1 = 6
      module2: ["type3","type3","type3","type3","type3","type7"],      // type3 = 5 ، type7 = 1
      module3: ["type9","type9","type9","type9","type4","type4"]       // type9 = 4 ، type4 = 2
    };
    const answers = {};
    Object.keys(Q.mirror1).forEach(function (mod) {
      Q.mirror1[mod].forEach(function (q, i) {
        const want = targets[mod][i];
        let chosen = "أ";
        ["أ","ب","ج"].forEach(function (L) { if (q.options[L] && q.options[L].type === want) chosen = L; });
        answers[q.id] = chosen;
      });
    });

    console.log("\n— ترتيب مرآة السلوك (mirror1) —");
    const r = E.computeMirrorIdentification("mirror1", answers);
    r.ranking.forEach(function (x) { console.log("  " + x.type + " | " + x.axisId + " | خام " + x.raw + " | " + x.percent + "%"); });
    console.log("  المحور الدومينانت: " + r.dominantAxis);
    console.log("  dualAxis: " + (r.dualAxis ? r.dualAxis.join(" + ") : "null"));
    // المتوقَّع: type1(6) ثمّ type3(5) ثمّ type9(4) ثمّ type4(2) ثمّ type7(1)...
    //          dominant = module1 ، dualAxis = [module1, module2] (الفرق 1)
  } catch (e) { console.log("تعذّر اختبار التحديد: " + e.message); }

  // طيف محورين: module1 (ترتيب اتزان/اتزان/إفراط…) و module4 (ترتيب اتزان/إفراط/اتزان…)
  try {
    console.log("\n— الطيف —");
    const s1 = E.computeAxisSpectrum("module1", [2, 3, 6, 7, 1, 2]); // balance5 excess13 deficit3
    console.log("  module1:", JSON.stringify(s1));                    // المتوقَّع: إفراط، image=excess_b
    const s4 = E.computeAxisSpectrum("module4", [6, 2, 6, 3, 1, 1]); // ترتيب مختلف: balance=12، excess=5، deficit=2
    console.log("  module4:", JSON.stringify(s4));                    // المتوقَّع: اتزان (يثبت أنّ الجمع بالتصنيف لا بالموضع)
  } catch (e) { console.log("تعذّر اختبار الطيف: " + e.message + "  (راجع تنبيه تصدير spectrum أدناه)"); }
}
