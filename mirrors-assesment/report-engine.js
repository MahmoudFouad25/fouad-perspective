/* ════════════════════════════════════════════════════════════════════════
   report-engine.js — محرّك تركيب أرقام التقرير الذاتيّ (مقياس الفؤاد v2)
   ────────────────────────────────────────────────────────────────────────
   منطق حسابيّ نقيّ بالكامل: لا UI، لا HTML، لا Firestore، لا نصوص معروضة.
   يأخذ نتائج المرايا السبعة المحفوظة (results[mirrorId]) ويُخرج أرقامًا
   وأنماطًا فقط (لا صياغة)، تُستعمل لاحقًا لتركيب التقرير الذاتيّ.

   الربط بالهويّة دائمًا (mirrorId / axisId / type) لا بالأرقام أو المواضع.
   بنية المرايا/المحاور/الطبائع تُقرأ من FOUAD_CONFIG (mirrors-config.js).

   شكل المُدخَل المتوقَّع لكلّ مرآة resultsByMirror[mirrorId]:
     {
       ranking:      [{ type, axisId, raw, percent }, ...]   // تنازليًّا
       dominantAxis: "moduleX",
       scenario:     "clear|dual|closeness|weak",
       flags:        { weakSignal, dualAxis, sameAxisCloseness },
       spectrum:     { [axisId]: { balance, excess, deficit, position,
                                   positionLabel, image, ambiguous,
                                   suspiciousBalance, key } }
     }
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;          // Node
  if (typeof window !== "undefined") window.FOUAD_REPORT_ENGINE = api;                // المتصفّح
  if (typeof globalThis !== "undefined") globalThis.FOUAD_REPORT_ENGINE = api;
})(this, function () {
  "use strict";

  /* ───────── محلِّل المصدر (المتصفّح/Node) — نفس نمط calc-engine ───────── */
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
  function _cfg() {
    const v = _resolve("FOUAD_CONFIG", "./mirrors-config.js");
    if (!v) throw new Error("FOUAD_CONFIG غير متاح — حمّل mirrors-config.js قبل محرّك التقرير.");
    return v;
  }

  /* قيمة رقميّة آمنة أو null */
  function _num(v) { return (typeof v === "number" && !isNaN(v)) ? v : null; }

  /* المواقع المعروفة على الطيف */
  const POSITIONS = ["balance", "excess", "deficit", "ambiguous"];

  /* خرائط بحث من الـconfig: مرآة بالمعرّف، محور بالمعرّف (مع أبيه)، ترتيب الطبائع. */
  function _configMaps(cfg) {
    const mirrorById = {};
    const axisById   = {};
    (cfg.mirrors || []).forEach(function (m) {
      mirrorById[m.id] = m;
      (m.axes || []).forEach(function (ax) {
        axisById[ax.id] = {
          axis: ax, mirrorId: m.id,
          mirrorName: m.name || null, mirrorOrder: m.order || null
        };
      });
    });
    const typeOrder = {};
    Object.keys(cfg.types || {}).forEach(function (t, i) { typeOrder[t] = i; });
    return { mirrorById: mirrorById, axisById: axisById, typeOrder: typeOrder };
  }

  /* ════════════════════════ الدالّة الرئيسيّة ════════════════════════ */
  function computeReport(resultsByMirror) {
    resultsByMirror = resultsByMirror || {};
    const cfg  = _cfg();
    const maps = _configMaps(cfg);

    /* مجمّعات الطبائع — مهيّأة من الـconfig (الطبائع التسع كلّها تبدأ من صفر). */
    const typeAgg = {};
    Object.keys(cfg.types || {}).forEach(function (t) {
      typeAgg[t] = { type: t, firstCount: 0, percentSum: 0, appearances: 0, firstInMirrors: [] };
    });
    /* طابع ظهر في البيانات وليس في الـconfig — يُضاف بأمان دون تعطّل. */
    function _ensureType(t) {
      if (!typeAgg[t]) {
        typeAgg[t] = { type: t, firstCount: 0, percentSum: 0, appearances: 0, firstInMirrors: [] };
        if (!(t in maps.typeOrder)) maps.typeOrder[t] = Object.keys(maps.typeOrder).length;
      }
      return typeAgg[t];
    }

    /* مجمّع المحاور الدومينانت (يُملأ عند الظهور فقط). */
    const axisAgg = {};

    /* خريطة الطيف: عدّادات + قوائم لكلّ موقع. */
    const spectrumCounts = { balance: 0, excess: 0, deficit: 0, ambiguous: 0, unknown: 0, total: 0 };
    const spectrumByPos  = { balance: [], excess: [], deficit: [], ambiguous: [] };

    /* المواضع التي تحمل أعلامًا (تُفرَز في الجلسة لا تُحسَم آليًّا). */
    const flagged = [];

    /* تتبّع الاكتمال والتجاوز الآمن. */
    const completedMirrorIds = []; // مرايا فيها ranking صالح
    const spectrumMirrorIds  = []; // مرايا فيها طيف صالح
    const skipped = [];            // ما تعذّر استعماله مع السبب

    Object.keys(resultsByMirror).forEach(function (mirrorId) {
      const res = resultsByMirror[mirrorId];
      if (!res || typeof res !== "object") {
        skipped.push({ mirrorId: mirrorId, reason: "نتيجة غائبة أو غير صالحة" });
        return;
      }

      /* ── (أ) الترتيب → الطبائع + المحور الدومينانت ── */
      const ranking = Array.isArray(res.ranking) ? res.ranking : null;
      if (ranking && ranking.length) {
        completedMirrorIds.push(mirrorId);

        // أعلى طابع في هذه المرآة (الأقوى) — يُحسب +1 على firstCount لهويّته.
        const top = ranking[0];
        if (top && top.type) {
          const a = _ensureType(top.type);
          a.firstCount += 1;
          a.firstInMirrors.push(mirrorId);
        }

        // مجموع النسب لكلّ طابع عبر هذه المرآة (تجاوز الصفوف الناقصة بأمان).
        ranking.forEach(function (row) {
          if (!row || !row.type) return;
          const a = _ensureType(row.type);
          a.appearances += 1;
          const p = _num(row.percent);
          if (p !== null) a.percentSum += p;
        });

        // المحور الدومينانت بالهويّة — من الحقل المخصّص أو من أعلى الترتيب.
        const domAxis = res.dominantAxis || (top ? top.axisId : null);
        if (domAxis) {
          if (!axisAgg[domAxis]) {
            const info = maps.axisById[domAxis] || null;
            axisAgg[domAxis] = {
              axisId: domAxis,
              mirrorId:  info ? info.mirrorId  : mirrorId,
              axisName:  info ? (info.axis.name || null) : null,
              mirrorName: info ? info.mirrorName : (maps.mirrorById[mirrorId] ? maps.mirrorById[mirrorId].name : null),
              types: info ? (info.axis.types || []) : [],
              dominantCount: 0,
              dominantInMirrors: []
            };
          }
          axisAgg[domAxis].dominantCount += 1;
          axisAgg[domAxis].dominantInMirrors.push(mirrorId);
        }
      } else {
        skipped.push({ mirrorId: mirrorId, reason: "ترتيب (ranking) غائب أو فارغ" });
      }

      /* ── (ب) الطيف → خريطة التحرّك + الأعلام ── */
      const spectrum = (res.spectrum && typeof res.spectrum === "object") ? res.spectrum : null;
      if (spectrum) {
        let usedAny = false;
        Object.keys(spectrum).forEach(function (axisId) {
          const sp = spectrum[axisId];
          if (!sp || typeof sp !== "object") return;
          usedAny = true;

          const pos = sp.position;
          const entry = {
            mirrorId: mirrorId, axisId: axisId,
            key: sp.key || null, image: sp.image || null,
            position: pos || null
          };

          // عدّ الموقع بالهويّة (balance/excess/deficit/ambiguous). الموقع غير المعروف يُعدّ unknown ولا يُصنّف.
          if (POSITIONS.indexOf(pos) !== -1) {
            spectrumCounts[pos] += 1;
            spectrumByPos[pos].push(entry);
          } else {
            spectrumCounts.unknown += 1;
          }
          spectrumCounts.total += 1;

          // الأعلام: ملتبس (ambiguous) أو اتزان مريب (suspiciousBalance).
          const isAmbiguous  = sp.ambiguous === true;
          const isSuspicious = sp.suspiciousBalance === true;
          if (isAmbiguous || isSuspicious) {
            const flagTypes = [];
            if (isAmbiguous)  flagTypes.push("ambiguous");
            if (isSuspicious) flagTypes.push("suspiciousBalance");
            flagged.push({
              mirrorId: mirrorId, axisId: axisId,
              ambiguous: isAmbiguous, suspiciousBalance: isSuspicious,
              flagTypes: flagTypes,
              position: pos || null, key: sp.key || null
            });
          }
        });
        if (usedAny) spectrumMirrorIds.push(mirrorId);
      }
    });

    /* ── (١) ترتيب الطبائع تنازليًّا: firstCount ← مجموع النسب ← المتوسّط ← ترتيب الـconfig ── */
    const typesRanking = Object.keys(typeAgg).map(function (t) {
      const a = typeAgg[t];
      return {
        type: a.type,
        firstCount: a.firstCount,
        percentSum: a.percentSum,
        appearances: a.appearances,
        percentAvg: a.appearances ? Math.round((a.percentSum / a.appearances) * 10) / 10 : 0,
        firstInMirrors: a.firstInMirrors
      };
    }).sort(function (x, y) {
      return (y.firstCount - x.firstCount) ||
             (y.percentSum - x.percentSum) ||
             (y.percentAvg - x.percentAvg) ||
             ((maps.typeOrder[x.type] || 0) - (maps.typeOrder[y.type] || 0));
    });

    // الطابع/الطبائع الأبرز: المتصدّر في (firstCount ثمّ percentSum) — مع رصد التعادل بلا حسمٍ آليّ.
    let dominantTypes = [];
    let typesTie = false;
    const withData = typesRanking.filter(function (r) { return r.appearances > 0; });
    if (withData.length) {
      const lead = withData[0];
      dominantTypes = withData.filter(function (r) {
        return r.firstCount === lead.firstCount && r.percentSum === lead.percentSum;
      }).map(function (r) { return r.type; });
      typesTie = dominantTypes.length > 1;
    }

    /* ── (٢) ترتيب المحاور الدومينانت تنازليًّا (ثمّ بترتيب المرآة) ──
       ملاحظة بنيويّة: كلّ محور يخصّ مرآةً واحدة، فلا يتكرّر معرّفه عبر المرايا؛
       لذا dominantCount يكون 1 لكلّ محور ظهر، والقائمة عمليًّا = المحاور الأظهر في كلّ مرآة. */
    const axesRanking = Object.keys(axisAgg).map(function (id) { return axisAgg[id]; })
      .sort(function (x, y) {
        return (y.dominantCount - x.dominantCount) ||
               (((maps.axisById[x.axisId] && maps.axisById[x.axisId].mirrorOrder) || 0) -
                ((maps.axisById[y.axisId] && maps.axisById[y.axisId].mirrorOrder) || 0));
      });
    let dominantAxes = [];
    let axesTie = false;
    if (axesRanking.length) {
      const maxC = axesRanking[0].dominantCount;
      dominantAxes = axesRanking.filter(function (a) { return a.dominantCount === maxC; })
                                .map(function (a) { return a.axisId; });
      axesTie = dominantAxes.length > 1;
    }

    /* ── (٣) ميل الطيف العامّ: أكثر المواقع تكرارًا — أو null عند التعادل (لا حسمَ آليّ). ── */
    let lean = null, leanTie = false, leanCandidates = [];
    const posCounts = POSITIONS.map(function (p) { return { position: p, count: spectrumCounts[p] }; })
      .filter(function (o) { return o.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });
    if (posCounts.length) {
      const maxCount = posCounts[0].count;
      leanCandidates = posCounts.filter(function (o) { return o.count === maxCount; })
                                .map(function (o) { return o.position; });
      if (leanCandidates.length === 1) lean = leanCandidates[0];
      else leanTie = true;
    }

    /* ── (٥) الطابع الأبرز إجمالًا (للملخّص). ── */
    const topTypeOverall = withData.length ? withData[0].type : null;

    return {
      /* ١ — النمط الإجماليّ للطبائع */
      typesPattern: {
        ranking: typesRanking,   // كلّ طابع: firstCount / percentSum / percentAvg / appearances / firstInMirrors
        dominant: dominantTypes, // الطابع/الطبائع الأبرز (هويّات)
        tie: typesTie            // تعادل على القمّة؟
      },

      /* ٢ — النمط الإجماليّ للمحاور الدومينانت */
      axesPattern: {
        ranking: axesRanking,    // كلّ محور دومينانت: dominantCount / المرآة الأمّ / أسماء / طبائعه
        dominant: dominantAxes,
        tie: axesTie
      },

      /* ٣ — خريطة التحرّك على الطيف */
      spectrumMap: {
        counts: spectrumCounts,    // balance/excess/deficit/ambiguous/unknown/total
        byPosition: spectrumByPos, // قوائم (مرآة+محور) في كلّ فئة
        lean: lean,                // الميل العامّ (موقع واحد) أو null عند التعادل/الفراغ
        leanTie: leanTie,
        leanCandidates: leanCandidates
      },

      /* ٤ — المواضع التي تحمل أعلامًا (تُفرَز في الجلسة) */
      flags: {
        items: flagged,            // [{mirrorId, axisId, ambiguous, suspiciousBalance, flagTypes, position, key}]
        count: flagged.length,
        ambiguousCount: flagged.filter(function (f) { return f.ambiguous; }).length,
        suspiciousBalanceCount: flagged.filter(function (f) { return f.suspiciousBalance; }).length
      },

      /* ٥ — ملخّص رقميّ موجز */
      summary: {
        completedMirrors: completedMirrorIds.length,
        completedMirrorIds: completedMirrorIds,
        spectrumMirrors: spectrumMirrorIds.length,
        positionDistribution: {
          balance: spectrumCounts.balance,
          excess: spectrumCounts.excess,
          deficit: spectrumCounts.deficit,
          ambiguous: spectrumCounts.ambiguous,
          total: spectrumCounts.total
        },
        topType: topTypeOverall,
        topTypeTie: typesTie,
        spectrumLean: lean,
        flaggedCount: flagged.length
      },

      /* ميتا — للشفافية والتعامل الآمن (لا تُعرَض، تساعد التشخيص) */
      meta: {
        mirrorsProcessed: Object.keys(resultsByMirror).length,
        completedMirrorIds: completedMirrorIds,
        spectrumMirrorIds: spectrumMirrorIds,
        skipped: skipped
      }
    };
  }

  return { computeReport: computeReport };
});


/* ════════════════════════════════════════════════════════════════════════
   اختبار ذاتيّ (Node فقط) — ببيانات وهميّة لثلاث مرايا + مرآة ناقصة عمدًا
   لإثبات التجاوز الآمن. يطبع المخرج للتأكّد بالعين. لا يعمل في المتصفّح.
   ════════════════════════════════════════════════════════════════════════ */
if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  const R = module.exports;

  const sp = function (b, e, d, pos, img, amb, sus, key) {
    return { balance: b, excess: e, deficit: d, position: pos, positionLabel: pos,
             image: img, ambiguous: amb, suspiciousBalance: sus, key: key };
  };

  const fake = {
    // مرآة ١ — أعلى طابع type1 (module1) ، طيف: إفراط/اتزان/ملتبس
    mirror1: {
      ranking: [
        { type: "type1", axisId: "module1", raw: 6, percent: 100 },
        { type: "type3", axisId: "module2", raw: 5, percent: 83 },
        { type: "type9", axisId: "module3", raw: 4, percent: 67 },
        { type: "type2", axisId: "module1", raw: 3, percent: 50 },
        { type: "type7", axisId: "module2", raw: 2, percent: 33 },
        { type: "type4", axisId: "module3", raw: 2, percent: 33 },
        { type: "type6", axisId: "module1", raw: 1, percent: 17 },
        { type: "type8", axisId: "module2", raw: 1, percent: 17 },
        { type: "type5", axisId: "module3", raw: 0, percent: 0 }
      ],
      dominantAxis: "module1", scenario: "clear",
      flags: { weakSignal: false, dualAxis: null, sameAxisCloseness: false },
      spectrum: {
        module1: sp(5, 13, 3, "excess",   "excess_b", false, false, "excess_b"),
        module2: sp(12, 5, 2, "balance",  null,       false, false, "balance"),
        module3: sp(8, 7, 6, "ambiguous", null,       true,  false, "ambiguous")
      }
    },
    // مرآة ٢ — أعلى طابع type1 (module4) ، فيها موضع يحمل علمين (ملتبس + اتزان مريب)
    mirror2: {
      ranking: [
        { type: "type1", axisId: "module4", raw: 6, percent: 100 },
        { type: "type8", axisId: "module5", raw: 4, percent: 67 },
        { type: "type6", axisId: "module6", raw: 3, percent: 50 },
        { type: "type4", axisId: "module4", raw: 3, percent: 50 },
        { type: "type2", axisId: "module5", raw: 2, percent: 33 },
        { type: "type3", axisId: "module6", raw: 2, percent: 33 },
        { type: "type5", axisId: "module4", raw: 1, percent: 17 },
        { type: "type7", axisId: "module5", raw: 1, percent: 17 },
        { type: "type9", axisId: "module6", raw: 0, percent: 0 }
      ],
      dominantAxis: "module4", scenario: "clear",
      flags: { weakSignal: false, dualAxis: null, sameAxisCloseness: false },
      spectrum: {
        module4: sp(12, 5, 2,  "balance",  null,       false, false, "balance"),
        module5: sp(6, 4, 11,  "deficit",  "deficit_a", false, false, "deficit_a"),
        module6: sp(11, 3, 10, "ambiguous", null,       true,  true,  "suspicious_balance")
      }
    },
    // مرآة ٣ — أعلى طابع type3 (module7) ، طيف: إفراط/اتزان/تفريط
    mirror3: {
      ranking: [
        { type: "type3", axisId: "module7", raw: 5, percent: 83 },
        { type: "type1", axisId: "module7", raw: 5, percent: 83 },
        { type: "type8", axisId: "module8", raw: 4, percent: 67 },
        { type: "type9", axisId: "module9", raw: 3, percent: 50 },
        { type: "type5", axisId: "module7", raw: 2, percent: 33 },
        { type: "type6", axisId: "module8", raw: 2, percent: 33 },
        { type: "type7", axisId: "module9", raw: 1, percent: 17 },
        { type: "type4", axisId: "module8", raw: 1, percent: 17 },
        { type: "type2", axisId: "module9", raw: 0, percent: 0 }
      ],
      dominantAxis: "module7", scenario: "clear",
      flags: { weakSignal: false, dualAxis: null, sameAxisCloseness: false },
      spectrum: {
        module7: sp(4, 14, 2, "excess",  "excess_a", false, false, "excess_a"),
        module8: sp(13, 3, 2, "balance", null,       false, false, "balance"),
        module9: sp(3, 4, 13, "deficit", "deficit_b", false, false, "deficit_b")
      }
    },
    // مرآة ٤ — ناقصة عمدًا (لا ranking ولا spectrum) → يجب تجاوزها بأمان
    mirror4: { scenario: "weak" }
  };

  const out = R.computeReport(fake);

  console.log("\n— ترتيب الطبائع (أعلى ٥) —");
  out.typesPattern.ranking.slice(0, 5).forEach(function (t) {
    console.log("  " + t.type + " | أوّل×" + t.firstCount + " | مجموع% " + t.percentSum + " | متوسّط% " + t.percentAvg + " | ظهر×" + t.appearances);
  });
  console.log("  الأبرز: " + out.typesPattern.dominant.join(", ") + (out.typesPattern.tie ? " (تعادل)" : ""));

  console.log("\n— المحاور الدومينانت —");
  out.axesPattern.ranking.forEach(function (a) {
    console.log("  " + a.axisId + " (" + (a.axisName || "؟") + ") | ×" + a.dominantCount + " | مرآة " + a.mirrorId + " | طبائع " + a.types.join("،"));
  });

  console.log("\n— خريطة الطيف —");
  console.log("  العدّادات: " + JSON.stringify(out.spectrumMap.counts));
  console.log("  الميل العامّ: " + (out.spectrumMap.lean || ("تعادل[" + out.spectrumMap.leanCandidates.join("/") + "]")));
  console.log("  اتزان: " + out.spectrumMap.byPosition.balance.map(function (e) { return e.axisId; }).join("،"));
  console.log("  إفراط: " + out.spectrumMap.byPosition.excess.map(function (e) { return e.axisId; }).join("،"));
  console.log("  تفريط: " + out.spectrumMap.byPosition.deficit.map(function (e) { return e.axisId; }).join("،"));
  console.log("  ملتبس: " + out.spectrumMap.byPosition.ambiguous.map(function (e) { return e.axisId; }).join("،"));

  console.log("\n— الأعلام (" + out.flags.count + ") —");
  out.flags.items.forEach(function (f) {
    console.log("  " + f.mirrorId + "/" + f.axisId + " → " + f.flagTypes.join("+"));
  });

  console.log("\n— الملخّص —");
  console.log("  " + JSON.stringify(out.summary));
  console.log("  متجاوَز: " + JSON.stringify(out.meta.skipped));
}
