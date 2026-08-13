/* ════════════════════════════════════════════════════════════════════════
   burn-engine.js — محرّك حساب مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-engine.js

   منطق حسابٍ نقيّ: لا UI، لا HTML، لا Firestore، لا عرض، لا تخزين.
   يقرأ الإجابات الخام + البنية الثابتة، ويُرجع أرقامًا محسوبة.
   العلامات والتنبيهات ليست هنا — موضعها burn-flags.js.

   ──────────────────────────────────────────────────────────────────────
   القاعدة الحاكمة:
     الربط بالهويّة (axisId / dimId / state / level) لا بالأرقام ولا المواضع.
     ولا رقمَ سحريًّا هنا: كل عتبةٍ تُقرأ من BURN_CONFIG.thresholds.

   ──────────────────────────────────────────────────────────────────────
   الخطوات الثمان:
     ١) computeRanking(raw)                     → ترتيب المحاور + درجة الكبت + التعادل
     ٢) computeDimensions(raw, axisId)          → الطيف + الشدّة + البُعد الهدف + الأسبقيّة
     ٣) computeEnvironment(raw, axisId)         → ENV و RCV والتصنيف
     ٤) computeFunctionality(raw, axisId)       → SLF و FUE و AGN و DBL و AUT
     ٥) computeWellbeing(raw)                   → التوقّد والحضور والامتلاء + المعايرة
     ٦) computeTypeLean(...)                    → الميل النوعيّ ببنية الأدلّة الثلاثيّة
     ٧) computeQualityCheck(raw, meta)          → إشارات الإجابة غير المتمعّنة
     ٨) buildTextKey(...)                       → المفتاح النصّيّ العشاريّ
     + computeAll(raw, options)                 → المنسّق الذي يستدعي الثمانية
     + applyTieBreaker(ranking, chosenAxis)     → حسم التعادل بعد إجابة السؤال الفارز
     + verifyIntegrity()                        → تحقّق سلامة البنية

   ──────────────────────────────────────────────────────────────────────
   شكل raw المتوقَّع (مسطَّح، لا متداخل):
     { "L1_ACT_S1_COH": { v: 5, ms: 3400 }, ... }
   ويقبل كذلك الشكل المختصر { "L1_ACT_S1_COH": 5 } للاختبار.
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BURN_ENGINE = api;
  if (typeof globalThis !== "undefined") globalThis.BURN_ENGINE = api;
})(this, function () {
  "use strict";

  /* ══════════════════════════════════════════════════════════════════════
     ٠ — الوصول إلى البيانات الثابتة
     ══════════════════════════════════════════════════════════════════════ */
  function _resolve(name, requirePath) {
    try {
      if (name === "BURN_CONFIG" && typeof BURN_CONFIG !== "undefined") return BURN_CONFIG;
      if (name === "BURN_ITEMS"  && typeof BURN_ITEMS  !== "undefined") return BURN_ITEMS;
    } catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) { /* تجاهُل */ }
    }
    return null;
  }
  function CFG() {
    const v = _resolve("BURN_CONFIG", "./burn-config.js");
    if (!v) throw new Error("BURN_CONFIG غير متاح.");
    return v;
  }
  function ITEMS() {
    const v = _resolve("BURN_ITEMS", "./burn-items.js");
    if (!v) throw new Error("BURN_ITEMS غير متاح.");
    return v;
  }
  function TH() { return CFG().thresholds; }

  const AXES = ["coh", "vit", "bel"];
  const DIMS = ["d1", "d2", "d3"];
  const LEVELS = ["vig", "prs", "ful"];

  /* ══════════════════════════════════════════════════════════════════════
     أدوات صغيرة
     ══════════════════════════════════════════════════════════════════════ */

  /* القيمة الخام لبند، بعد تطبيق العكس إن كان البند معكوسًا.
     يُرجع null إن لم يُجَب — والحساب يتجاهل الفراغ لا يعدّه صفرًا. */
  function val(raw, id) {
    if (!raw) return null;
    const cell = raw[id];
    if (cell === undefined || cell === null) return null;
    const v = (typeof cell === "object") ? cell.v : cell;
    if (typeof v !== "number" || isNaN(v)) return null;
    const item = ITEMS().byId(id);
    if (item && item.reverse) return CFG().scale.reverseFormula - v;
    return v;
  }

  /* القيمة الخام بلا تطبيق العكس — تُستعمل في ضبط الجودة والفحوص المباشرة */
  function rawVal(raw, id) {
    if (!raw) return null;
    const cell = raw[id];
    if (cell === undefined || cell === null) return null;
    const v = (typeof cell === "object") ? cell.v : cell;
    return (typeof v === "number" && !isNaN(v)) ? v : null;
  }

  function responseMs(raw, id) {
    if (!raw) return null;
    const cell = raw[id];
    if (!cell || typeof cell !== "object") return null;
    return (typeof cell.ms === "number") ? cell.ms : null;
  }

  /* متوسّط قائمة معرّفات، متجاهلًا غير المجاب */
  function meanOf(raw, ids) {
    let sum = 0, n = 0;
    (ids || []).forEach(function (id) {
      const v = val(raw, id);
      if (v !== null) { sum += v; n++; }
    });
    return n ? round2(sum / n) : null;
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function safe(x, fallback) { return (typeof x === "number" && !isNaN(x)) ? x : fallback; }

  /* معرّفات بنودٍ بحسب معايير — يُشتقّ من BURN_ITEMS لا يُكتب يدويًّا */
  function idsWhere(pred) {
    return ITEMS().all().filter(pred).map(function (it) { return it.id; });
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ١ — ترتيب المحاور

     ثلاث إشاراتٍ لكل محور:
       A = متوسّط الفعل التلقائيّ   (٦ بنود) — الدليل الأساسيّ على الهيمنة
       L = متوسّط الاشتياق          (٣ بنود) — يكشف الجذب لا الفعل
       C = متوسّط النقد             (٢ بند)  — الباب الخلفيّ للمكبوت
       G = L − A                              — الفجوة، وهي أدقّ مفتاحٍ تشخيصيّ

     المبدأ: المهيمن متبوعٌ بفعل. الاشتياق وحده ليس دليل هيمنة.
     ══════════════════════════════════════════════════════════════════════ */
  function computeRanking(raw) {
    const t = TH().ranking;
    const axes = {};

    AXES.forEach(function (ax) {
      const A = meanOf(raw, idsWhere(function (it) { return it.block === "action"   && it.axis === ax; }));
      const L = meanOf(raw, idsWhere(function (it) { return it.block === "longing"  && it.axis === ax; }));
      const C = meanOf(raw, idsWhere(function (it) { return it.block === "critique" && it.axis === ax; }));
      const G = (L !== null && A !== null) ? round2(L - A) : null;
      axes[ax] = { A: A, L: L, C: C, G: G };
    });

    /* ── قاعدة الاستبعاد ──
       محورٌ فعلُه منخفضٌ واشتياقه حادّ لا يصلح رئيسيًّا مهما علا اشتياقه.
       هذا يمنع أشهر خطأ في تحديد المحور: خلط الحرمان بالهيمنة. */
    const excluded = [];
    AXES.forEach(function (ax) {
      const a = axes[ax];
      if (a.A !== null && a.L !== null &&
          a.A < t.exclusionActionMax && a.L > t.exclusionLongingMin) {
        excluded.push(ax);
      }
    });

    /* لو استُبعد المحوران الأعلى، أُلغي الاستبعاد ونرفع علامة عدم استقرار */
    let unstable = false;
    let pool = AXES.filter(function (ax) { return excluded.indexOf(ax) === -1; });
    if (pool.length < 2) { pool = AXES.slice(); unstable = true; }

    /* ── الرئيسيّ: أعلى A بين غير المستبعدين ── */
    const sortedPool = pool.slice().sort(function (a, b) {
      return safe(axes[b].A, -1) - safe(axes[a].A, -1);
    });
    const primary = sortedPool[0];

    /* ── التعادل: فرقٌ أقلّ من العتبة بين أعلى A والذي يليه ── */
    let needsTieBreaker = false;
    let tiePair = null;
    if (sortedPool.length >= 2) {
      const gap = safe(axes[sortedPool[0]].A, 0) - safe(axes[sortedPool[1]].A, 0);
      if (Math.abs(gap) < t.tieGap) {
        needsTieBreaker = true;
        tiePair = [sortedPool[0], sortedPool[1]];
      }
    }

    /* ── المكبوت: أدنى A في المحاور الثلاثة، ويُؤكَّد بواحدٍ من ثلاثة ── */
    const byActionAsc = AXES.slice().sort(function (a, b) {
      return safe(axes[a].A, 99) - safe(axes[b].A, 99);
    });
    let repressed = byActionAsc[0];
    if (repressed === primary) repressed = byActionAsc[1];

    const r = axes[repressed];
    const confirmed =
      (r.C !== null && r.C >= t.repressionConfirm.critiqueMin) ||
      (r.G !== null && r.G >= t.repressionConfirm.gapMin) ||
      (r.A !== null && r.A <= t.repressionConfirm.actionMax);

    /* درجة الكبت — مركّبة من ثلاث إشارات بأوزانها */
    const w = t.repressionWeights;
    const cPart = (r.C !== null) ? (r.C / 7) * w.critique : 0;
    const gPart = (r.G !== null) ? (clamp(r.G, 0, 3) / 3) * w.gap : 0;
    const aPart = (r.A !== null) ? ((7 - r.A) / 7) * w.action : 0;
    const repressionScore = round2(cPart + gPart + aPart);

    let repressionClass;
    if (confirmed && repressionScore >= t.repressionClassMin.loud) repressionClass = "loud";
    else if (repressionScore >= t.repressionClassMin.quiet)        repressionClass = "quiet";
    else                                                            repressionClass = "sec2";

    /* ── الفرعيّ: الباقي ── */
    const secondary = AXES.filter(function (ax) {
      return ax !== primary && ax !== repressed;
    })[0];

    return {
      axes: axes,
      primary: primary,
      secondary: secondary,
      repressed: repressed,
      repressionScore: repressionScore,
      repressionClass: repressionClass,
      repressionConfirmed: confirmed,
      excluded: excluded,
      unstableOrder: unstable,
      needsTieBreaker: needsTieBreaker,
      tiePair: tiePair,
      tieResolvedByQuestion: false
    };
  }

  /* ── حسم التعادل بعد إجابة السؤال الفارز ──
     يُستدعى من التطبيق بعد اختيار المشارك، ويُعيد ترتيبًا محسومًا. */
  function applyTieBreaker(ranking, chosenAxis) {
    if (!ranking || !chosenAxis) return ranking;
    if (AXES.indexOf(chosenAxis) === -1) return ranking;

    const out = JSON.parse(JSON.stringify(ranking));
    out.primary = chosenAxis;

    /* المكبوت يبقى كما هو ما لم يصر هو المختار */
    if (out.repressed === chosenAxis) {
      const byActionAsc = AXES.slice().sort(function (a, b) {
        return safe(out.axes[a].A, 99) - safe(out.axes[b].A, 99);
      });
      out.repressed = byActionAsc.filter(function (ax) { return ax !== chosenAxis; })[0];
    }
    out.secondary = AXES.filter(function (ax) {
      return ax !== out.primary && ax !== out.repressed;
    })[0];

    out.needsTieBreaker = false;
    out.tieResolvedByQuestion = true;
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٢ — احتراق الأبعاد

     لكل بُعدٍ أربع درجات: B اتزان · E إفراط · F تفريط · O تذبذب.
     والإفراط والتفريط حالتان مستقلّتان لا طرفا مسطرةٍ واحدة، والتذبذب
     يُقاس صراحةً ولا يُستنتج من ارتفاع الطرفين وحدهما.

     الشدّة: S = max(E,F,O) − B، ثم تُرفع بمعاملين:
       • +١ لكل الأبعاد إن كان متوسّط بندَي التمييز مرتفعًا (تشبّع المحور كلّه).
       • +٠٫٥ للبُعد المتذبذب وحده (لأنّه يدفع كلفة الطرفين معًا).
     ══════════════════════════════════════════════════════════════════════ */
  function computeDimensions(raw, axisId) {
    const t = TH().spectrum;
    const cfg = CFG();

    /* معامل التمييز: متوسّط بندَي المحور */
    const discIds = idsWhere(function (it) {
      return it.block === "discrimination" && it.axis === axisId;
    });
    const discMean = meanOf(raw, discIds);
    const discBoost = (discMean !== null && discMean >= t.discBoostMin) ? t.severityBoostDisc : 0;

    const dimensions = DIMS.map(function (d) {
      function scoreOf(state) {
        const ids = idsWhere(function (it) {
          return it.block === "spectrum" && it.axis === axisId && it.dim === d && it.state === state;
        });
        return meanOf(raw, ids);
      }

      const B = scoreOf("bal");
      const E = scoreOf("exc");
      const F = scoreOf("def");
      const O = scoreOf("osc");

      /* ── التصنيف بالترتيب: التذبذب يعلو على الجميع ── */
      let cls;
      if (O !== null && O >= t.oscDirectMin) {
        cls = "osc";
      } else if (E !== null && F !== null && O !== null &&
                 E >= t.oscIndirectEF && F >= t.oscIndirectEF && O >= t.oscIndirectO) {
        cls = "osc";
      } else if (E !== null && F !== null && (E - F) >= t.excessDiffMin) {
        cls = "exc";
      } else if (E !== null && F !== null && (F - E) >= t.deficitDiffMin) {
        cls = "def";
      } else if (B !== null && B >= t.balanceMin &&
                 Math.max(safe(E, 0), safe(F, 0), safe(O, 0)) <= t.balanceMaxOther) {
        cls = "bal";
      } else {
        cls = "tlt";   /* ميلٌ خفيف: لم يبلغ نزيفًا، ويُذكر بلا حسم */
      }

      /* ── الشدّة ── */
      const peak = Math.max(safe(E, 0), safe(F, 0), safe(O, 0));
      let S = round2(peak - safe(B, 0));
      S = round2(S + discBoost);
      if (cls === "osc") S = round2(S + t.severityBoostOsc);

      /* ── الاتجاه الذي يميل إليه صاحب الميل الخفيف (يحدّد ممارسته) ── */
      let tiltToward = null;
      if (cls === "tlt") {
        const trio = [
          { s: "exc", v: safe(E, 0) },
          { s: "def", v: safe(F, 0) },
          { s: "osc", v: safe(O, 0) }
        ].sort(function (a, b) { return b.v - a.v; });
        tiltToward = trio[0].s;
      }

      return {
        dim: d,
        name: (cfg.getDim(axisId, d) || {}).name || d,
        B: B, E: E, F: F, O: O,
        cls: cls,
        tiltToward: tiltToward,
        S: S
      };
    });

    /* ── البُعد الهدف ── */
    const sorted = dimensions.slice().sort(function (a, b) { return b.S - a.S; });
    let target = sorted[0];

    if (sorted.length >= 2 && (sorted[0].S - sorted[1].S) < t.targetTieGap) {
      /* عند التقارب: الأولويّة للمتذبذب، وإلّا للبُعد الثالث (الأعمق والأشدّ أثرًا) */
      const oscCandidate = sorted.filter(function (x) { return x.cls === "osc"; })[0];
      if (oscCandidate) {
        target = oscCandidate;
      } else {
        const third = dimensions.filter(function (x) { return x.dim === "d3"; })[0];
        const nearTop = sorted.slice(0, 2).some(function (x) { return x.dim === "d3"; });
        if (third && nearTop) target = third;
      }
    }

    /* ── شدّة المحور الكلّيّة ── */
    const axisSeverity = round2(
      dimensions.reduce(function (s, x) { return s + x.S; }, 0) / dimensions.length
    );

    let axisSeverityClass;
    if (axisSeverity >= t.axisSeverityHigh)     axisSeverityClass = "high";
    else if (axisSeverity < t.axisSeverityLow)  axisSeverityClass = "low";
    else                                        axisSeverityClass = "mid";

    /* ── تذبذبٌ مزدوج: بُعدان أو أكثر متذبذبان في المحور نفسه ── */
    const oscCount = dimensions.filter(function (x) { return x.cls === "osc"; }).length;

    /* ── قاعدة الأسبقيّة ──
       التنظيم الذاتيّ المتذبذب بشدّةٍ عالية يُقدَّم على البُعد الهدف،
       لأنّه البُعد الذي تقوم عليه القدرة على الممارسة نفسها:
       من لا ينظّم داخله لا يثبت على ممارسةٍ أصلًا. */
    const p = TH().precedence;
    let precedenceApplied = false;
    let practiceOverride = null;

    if (axisId === p.axis) {
      const pd = dimensions.filter(function (x) { return x.dim === p.dim; })[0];
      if (pd && pd.cls === p.state && pd.S >= p.severityMin && target.dim !== p.dim) {
        precedenceApplied = true;
        practiceOverride = { axis: p.axis, dim: p.dim, state: p.state, deferWeeks: p.deferTargetWeeks };
      }
    }

    return {
      axis: axisId,
      dimensions: dimensions,
      targetDim: target.dim,
      targetCls: target.cls,
      targetTiltToward: target.tiltToward,
      targetSeverity: target.S,
      axisSeverity: axisSeverity,
      axisSeverityClass: axisSeverityClass,
      discriminationMean: discMean,
      discBoostApplied: discBoost > 0,
      oscillatingCount: oscCount,
      precedenceApplied: precedenceApplied,
      practiceOverride: practiceOverride
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٣ — البيئة

     تقيس التوافق لا الحكم: البيئة قد تكون جيّدةً تمامًا ولا تناسب اتجاهك.

     ثمانية بنودٍ في اتجاه الغياب، وبندٌ إيجابيٌّ واحدٌ معكوس.
       HNG = متوسّط بنود الغياب الثمانية
       IMP = درجة البند الإيجابيّ (بعد العكس)
       ENV = (8 − HNG) × 0.8 + IMP × 0.2
       RCV = متوسّط بندَي «هل يصل إليك» — وهما في اتجاه الغياب أيضًا،
             فارتفاع RCV يعني انسدادًا أشدّ لا انفتاحًا.
     ══════════════════════════════════════════════════════════════════════ */
  function computeEnvironment(raw, axisId) {
    const t = TH().environment;

    const branchItems = ITEMS().L3.filter(function (it) { return it.axis === axisId; });

    const absenceIds = branchItems
      .filter(function (it) { return !it.reverse; })
      .map(function (it) { return it.id; });

    const positiveIds = branchItems
      .filter(function (it) { return it.reverse; })
      .map(function (it) { return it.id; });

    const receptionIds = branchItems
      .filter(function (it) { return it.group === "reception"; })
      .map(function (it) { return it.id; });

    /* بنود الغياب تُقرأ خامًا (لا reverse عليها) */
    let sum = 0, n = 0;
    absenceIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { sum += v; n++; }
    });
    const HNG = n ? round2(sum / n) : null;

    /* البند الإيجابيّ يُقرأ بعد العكس عبر val() فيصير في اتجاه الغياب،
       لكنّنا نريده هنا في اتجاهه الأصليّ (ارتفاعٌ = تحسّن)، فنقرؤه خامًا. */
    let impSum = 0, impN = 0;
    positiveIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { impSum += v; impN++; }
    });
    const IMP = impN ? round2(impSum / impN) : null;

    let recSum = 0, recN = 0;
    receptionIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { recSum += v; recN++; }
    });
    const RCV = recN ? round2(recSum / recN) : null;

    let ENV = null;
    if (HNG !== null) {
      const base = (8 - HNG) * t.weightHunger;
      const bonus = (IMP !== null) ? IMP * t.weightImprovement : (8 - HNG) * t.weightImprovement;
      ENV = round2(base + bonus);
    }

    let cls = null;
    if (ENV !== null) {
      if (ENV >= t.feedingMin)       cls = "feed";
      else if (ENV <= t.starvingMax) cls = "starve";
      else                           cls = "mid";
    }

    /* ── العلامة المركّبة: الفارز بين المجوَّع والمحترق ──
       لأنّ بيئةً لا تُقدّم أصلًا (جوعٌ حقيقيّ) غير بيئةٍ تُقدّم ولا يصل
       (انسدادٌ داخليّ)، والفرق يقلب العلاج. */
    let flag = null;
    if (ENV !== null && RCV !== null) {
      if (ENV <= t.starvingMax && RCV >= t.receptionBlocked)      flag = "both";
      else if (ENV <= t.starvingMax && RCV <= t.receptionOpen)    flag = "starve";
      else if (ENV >= t.feedingMin && RCV >= t.receptionBlocked)  flag = "block";
      else if (ENV >= t.feedingMin)                               flag = "feed";
      else                                                        flag = (RCV >= t.receptionBlocked) ? "block" : "feed";
    }

    return { HNG: HNG, IMP: IMP, ENV: ENV, RCV: RCV, cls: cls, flag: flag };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٤ — الوظيفية والوجه الآليّ

     ★ أربعة مؤشّراتٍ مستقلّة لا تُجمع في درجةٍ واحدة أبدًا.
       السبب: لا تقيس بناءً واحدًا. قد تنهار الوظيفية الذاتيّة وحدها مع
       بقاء الباقي سليمًا، وقد يكون الأداء ممتازًا ووقودُه مسمومًا —
       والجمع في رقمٍ واحد يطمس الفرق العلاجيّ بين الحالتين.
     ══════════════════════════════════════════════════════════════════════ */
  function computeFunctionality(raw, axisId) {
    const t = TH().functionality;

    /* ── (١) الوظيفية الذاتيّة ──
       ثلاثة بنودٍ في اتجاه التعطّل (تُعكَس)، وبندٌ إيجابيٌّ واحد. */
    const slfNeg = ["L4_SLF_01", "L4_SLF_02", "L4_SLF_03"];
    let sSum = 0, sN = 0;
    slfNeg.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { sSum += v; sN++; }
    });
    const slfNegMean = sN ? sSum / sN : null;
    const slfPos = rawVal(raw, "L4_SLF_04");

    let SLF = null;
    if (slfNegMean !== null && slfPos !== null) SLF = round2(((8 - slfNegMean) + slfPos) / 2);
    else if (slfNegMean !== null)               SLF = round2(8 - slfNegMean);
    else if (slfPos !== null)                   SLF = round2(slfPos);

    /* ── (٢) نقاء الوقود ── */
    const fueIds = ["L4_FUE_01", "L4_FUE_02", "L4_FUE_03"];
    let fSum = 0, fN = 0;
    fueIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { fSum += v; fN++; }
    });
    const FUE = fN ? round2(8 - (fSum / fN)) : null;

    /* ── (٣) الفاعليّة ── */
    const agnIds = ["L4_AGN_01", "L4_AGN_02", "L4_AGN_03"];
    let aSum = 0, aN = 0;
    agnIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { aSum += v; aN++; }
    });
    const AGN = aN ? round2(8 - (aSum / aN)) : null;

    /* ── (٤) الحمل المضاعف — يُحسب ولا يُعرَض للمشارك، ومادّتُه للقاع ── */
    const dblIds = ["L4_DBL_01", "L4_DBL_02"];
    let dSum = 0, dN = 0;
    dblIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { dSum += v; dN++; }
    });
    const DBL = dN ? round2(dSum / dN) : null;

    /* ── الوجه الآليّ — ثلاثة بنودٍ لمحور المشارك ── */
    const autIds = ITEMS().L4.automaticFace
      .filter(function (it) { return it.axis === axisId; })
      .map(function (it) { return it.id; });
    let uSum = 0, uN = 0;
    autIds.forEach(function (id) {
      const v = rawVal(raw, id);
      if (v !== null) { uSum += v; uN++; }
    });
    const AUT = uN ? round2(uSum / uN) : null;

    /* ── التصنيفات ── */
    function classify(v, hi, lo, names) {
      if (v === null) return null;
      if (v >= hi) return names[0];
      if (v <= lo) return names[2];
      return names[1];
    }

    const slfClass = classify(SLF, t.slfSoundMin,   t.slfStalledMax, ["sound", "strained", "stalled"]);
    const fueClass = classify(FUE, t.fueCleanMin,   t.fueToxicMax,   ["clean", "mixed",    "toxic"]);
    const agnClass = classify(AGN, t.agnPresentMin, t.agnAbsentMax,  ["present", "eroded", "absent"]);

    /* ── حالة الحركة: قسمٌ واحدٌ يُعرَض في شاشة النتيجة ──
       الأولويّة مقصودة، وتتبع شجرة أولويّة العلامات:
         TOXIC  أداءٌ عالٍ على وقودٍ ضارّ — أخطر شريحةٍ وأقلّها شكوى
         HORIZ  انهيار الأفق
         STALL  تعطّلٌ ذاتيّ
         FUEL   وقودٌ ملوَّثٌ بأداءٍ متوسّط
         SOUND  حركةٌ سليمة */
    const horizonItem = rawVal(raw, "L4_AGN_03");
    let move;
    if (SLF !== null && FUE !== null && SLF >= t.slfSoundMin && FUE <= t.fueToxicMax) {
      move = "TOXIC";
    } else if (horizonItem !== null && horizonItem >= t.horizonCollapse) {
      move = "HORIZ";
    } else if (SLF !== null && SLF <= t.slfStalledMax) {
      move = "STALL";
    } else if (FUE !== null && FUE <= t.fueToxicMax) {
      move = "FUEL";
    } else {
      move = "SOUND";
    }

    /* ── هل يُعرَض الوجه الآليّ في النتيجة أم يُؤجَّل للأطلس؟ ── */
    let autShow = "hide";
    if (AUT !== null) {
      if (AUT >= t.autShowMin)      autShow = "show";
      else if (AUT >= t.autDeferMin) autShow = "atlas";
    }

    return {
      SLF: SLF, FUE: FUE, AGN: AGN, DBL: DBL, AUT: AUT,
      slfClass: slfClass, fueClass: fueClass, agnClass: agnClass,
      move: move,
      autShow: autShow,
      horizonRaw: horizonItem
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٥ — خطّ العافية

     تسع عبارات، ثلاثٌ لكل مستوى، كلّها في اتجاهٍ واحد، والعكس يقع في
     المعادلة (8 − المتوسّط) فيصير الارتفاع عافيةً.

     ★ هذه الطبقة وحدها هي التي تتكرّر أسبوعيًّا، ومنها معامل المعايرة
       الفرديّ الذي يوصل درجة الستّة بدرجة التسعة على مسطرةٍ واحدة.
     ══════════════════════════════════════════════════════════════════════ */
  function computeWellbeing(raw) {
    const t = TH().wellbeing;
    const out = {};

    LEVELS.forEach(function (lv) {
      const ids = ITEMS().L5
        .filter(function (it) { return it.level === lv; })
        .map(function (it) { return it.id; });
      let sum = 0, n = 0;
      ids.forEach(function (id) {
        const v = rawVal(raw, id);
        if (v !== null) { sum += v; n++; }
      });
      out[lv] = n ? round2(8 - (sum / n)) : null;
    });

    /* المستوى الأشدّ نزيفًا = الأدنى درجةً */
    let lowest = null, lowestVal = 99;
    LEVELS.forEach(function (lv) {
      if (out[lv] !== null && out[lv] < lowestVal) { lowestVal = out[lv]; lowest = lv; }
    });

    /* ── معامل المعايرة الفرديّ ──
       نسبة درجة التسعة إلى درجة الستّة لكل مستوًى، محسوبةٌ مرّةً واحدةً
       في الأسبوع صفر ومطبَّقةٌ على كل نبضةٍ مختصرةٍ بعدها. */
    const calibration = {};
    LEVELS.forEach(function (lv) {
      const shortIds = ITEMS().L5
        .filter(function (it) { return it.level === lv && it.inShort === true; })
        .map(function (it) { return it.id; });
      let s = 0, k = 0;
      shortIds.forEach(function (id) {
        const v = rawVal(raw, id);
        if (v !== null) { s += v; k++; }
      });
      const shortScore = k ? (8 - (s / k)) : null;
      if (out[lv] !== null && shortScore !== null && shortScore !== 0) {
        calibration[lv] = round2(clamp(out[lv] / shortScore, t.calibrationMin, t.calibrationMax));
      } else {
        calibration[lv] = 1;
      }
    });

    /* هل انهار المستويات الثلاثة معًا؟ — شرطٌ في تجاوز نطاق الأداة */
    const allCritical = LEVELS.every(function (lv) {
      return out[lv] !== null && out[lv] <= t.lowestCritical;
    });

    return {
      vig: out.vig, prs: out.prs, ful: out.ful,
      lowest: lowest,
      lowestValue: (lowestVal === 99) ? null : round2(lowestVal),
      calibration: calibration,
      allCritical: allCritical
    };
  }

  /* حساب نبضةٍ أسبوعيّةٍ مختصرة (ستّة بنود) مع تطبيق المعايرة */
  function computePulse(pulseRaw, calibration, isFull) {
    const out = {};
    LEVELS.forEach(function (lv) {
      const ids = ITEMS().L5
        .filter(function (it) { return it.level === lv && (isFull || it.inShort === true); })
        .map(function (it) { return it.id; });
      let sum = 0, n = 0;
      ids.forEach(function (id) {
        const c = pulseRaw ? pulseRaw[id] : null;
        const v = (c && typeof c === "object") ? c.v : c;
        if (typeof v === "number" && !isNaN(v)) { sum += v; n++; }
      });
      let score = n ? (8 - (sum / n)) : null;
      if (score !== null && !isFull && calibration && calibration[lv]) {
        score = score * calibration[lv];
      }
      out[lv] = (score === null) ? null : round2(clamp(score, 1, 7));
    });
    return { vig: out.vig, prs: out.prs, ful: out.ful, calibrated: !isFull };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٦ — الميل النوعيّ

     ★ بنيةٌ ثلاثيّةٌ للأدلّة لا مجموعُ نقاطٍ مسطَّح.
       السبب: الطبقات ليست متساويةً في قوّة دلالتها. البيئة المُجوِّعة دليلٌ
       شبه قاطعٍ على الجوع لأنّها تقيس مصدره نفسه، والفاعليّة المنخفضة
       دليلٌ ضعيفٌ لأنّها تنخفض في الأنواع الثلاثة. وجمعُهما بأوزانٍ
       متقاربةٍ يساوي بين دليلٍ قويٍّ وآخر ضعيف.

     ★ يُحسب من الجرعة الأولى ويُخزَّن، ولا يُعلَن للمشارك في النتيجة.
       يُحسم في القاع (الأسبوع السابع) بعد أن يكون قد عاش الفرق بنفسه.
     ══════════════════════════════════════════════════════════════════════ */
  function computeTypeLean(raw, ranking, dims, env, fn, wb) {
    const t = TH().typeLean;
    const cfg = CFG();

    const W = { d: t.weightDecisive, c: t.weightConfirm, s: t.weightSupport };
    const evidence = { burnt: [], starved: [], repressed: [] };
    const score = { burnt: 0, starved: 0, repressed: 0 };

    function add(type, tier, label, condition) {
      if (!condition) return;
      const weight = W[tier];
      score[type] += weight;
      evidence[type].push({ tier: tier, weight: weight, label: label });
    }

    const ENV = env.ENV, RCV = env.RCV;
    const sev = dims.axisSeverity;
    const targetCls = dims.targetCls;
    const matchesAxis = (wb.lowest !== null) &&
                        (wb.lowest === cfg.levelOfAxis(ranking.primary));

    /* ─────────── أدلّة المحترق ─────────── */
    add("burnt", "d", "بيئةٌ ليست مُجوِّعةً مع شدّةٍ مرتفعة",
        ENV !== null && ENV >= 4.0 && sev >= TH().spectrum.axisSeverityHigh);

    add("burnt", "c", "البُعد الهدف في إفراطٍ أو تذبذب",
        targetCls === "exc" || targetCls === "osc");
    add("burnt", "c", "وقودٌ ملوَّث",
        fn.FUE !== null && fn.FUE <= TH().functionality.fueToxicMax);
    add("burnt", "c", "المستوى النازف يطابق المحور",
        matchesAxis);
    add("burnt", "c", "البيئة تُعطي ولا يصل",
        env.flag === "block");

    add("burnt", "s", "الوجه الآليّ مرتفع",
        fn.AUT !== null && fn.AUT >= TH().functionality.autShowMin);
    add("burnt", "s", "حدّة الخوف الأساسيّ مرتفعة",
        (function () {
          const it = ITEMS().L2.discrimination.filter(function (x) {
            return x.axis === ranking.primary && x.role === "fearIntensity";
          })[0];
          const v = it ? rawVal(raw, it.id) : null;
          return v !== null && v >= 5.5;
        })());
    add("burnt", "s", "التوقّد منهار",
        wb.vig !== null && wb.vig <= 3.0);

    /* ─────────── أدلّة المجوَّع ─────────── */
    add("starved", "d", "بيئةٌ مُجوِّعةٌ مع شدّةٍ غير مرتفعة",
        ENV !== null && ENV <= TH().environment.starvingMax &&
        sev < TH().spectrum.axisSeverityHigh);

    add("starved", "c", "البُعد الهدف في تفريط",
        targetCls === "def");
    add("starved", "c", "الفاعليّة غائبة",
        fn.AGN !== null && fn.AGN <= TH().functionality.agnAbsentMax);
    add("starved", "c", "البيئة لا تُعطي أصلًا",
        env.flag === "starve");
    add("starved", "c", "استهلاكٌ من رصيدٍ قديمٍ بلا إضافة",
        (function () {
          const it = ITEMS().L3.filter(function (x) {
            return x.axis === ranking.primary && x.group === "trend" && !x.reverse;
          })[0];
          const v = it ? rawVal(raw, it.id) : null;
          return v !== null && v >= 5.5;
        })());

    add("starved", "s", "تفريطٌ حادٌّ في أحد الأبعاد",
        dims.dimensions.some(function (d) { return d.F !== null && d.F >= 5.5; }));
    add("starved", "s", "الامتلاء منهار",
        wb.ful !== null && wb.ful <= 3.0);
    add("starved", "s", "الأفق ضبابيّ",
        fn.horizonRaw !== null && fn.horizonRaw >= 5.0);

    /* ─────────── أدلّة المكبوت ─────────── */
    add("repressed", "d", "حملٌ مضاعفٌ مع كبتٍ صاخب",
        fn.DBL !== null && fn.DBL >= TH().functionality.dblFullWeight &&
        ranking.repressionScore >= TH().ranking.repressionClassMin.loud);

    add("repressed", "c", "نبضة المحور المكبوت مرتفعة",
        (function () {
          const id = "L2_PLS_" + String(ranking.repressed).toUpperCase();
          const v = rawVal(raw, id);
          return v !== null && v >= 5.0;
        })());
    add("repressed", "c", "تعطّلٌ ذاتيٌّ مع وقودٍ غير ملوَّث",
        fn.SLF !== null && fn.FUE !== null &&
        fn.SLF <= TH().functionality.slfStalledMax && fn.FUE >= 4.0);
    add("repressed", "c", "شدّةٌ عاليةٌ في بيئةٍ مُغذّية",
        sev >= TH().spectrum.axisSeverityHigh &&
        ENV !== null && ENV >= TH().environment.feedingMin);

    add("repressed", "s", "نقدٌ حادٌّ تجاه المكبوت",
        (ranking.axes[ranking.repressed].C || 0) >= 6.0);
    add("repressed", "s", "فجوةٌ واسعةٌ في المكبوت",
        (ranking.axes[ranking.repressed].G || 0) >= 2.0);
    add("repressed", "s", "تفاوتٌ شديدٌ بين شدّات الأبعاد",
        (function () {
          const vals = dims.dimensions.map(function (d) { return d.S; });
          return (Math.max.apply(null, vals) - Math.min.apply(null, vals)) >= 2.5;
        })());

    /* ─────────── النسب والحسم ─────────── */
    const total = score.burnt + score.starved + score.repressed;
    const pct = {
      burnt:     total ? Math.round((score.burnt     / total) * 100) : 0,
      starved:   total ? Math.round((score.starved   / total) * 100) : 0,
      repressed: total ? Math.round((score.repressed / total) * 100) : 0
    };

    const ordered = ["burnt", "starved", "repressed"].sort(function (a, b) {
      return pct[b] - pct[a];
    });
    const top = ordered[0], second = ordered[1], third = ordered[2];

    let dominant = null, isComposite = false, unresolved = false;

    if (pct[top] - pct[third] < t.unresolvedGap) {
      unresolved = true;                       /* الثلاثة متقاربة — يُترك للقاع بلا ترجيح */
    } else if (pct[top] >= t.dominantMinPct && (pct[top] - pct[second]) >= t.compositeMaxGap) {
      dominant = top;
    } else {
      isComposite = true;
    }

    /* ── الحالة المركّبة الخاصّة: الأشدّ ──
       جهدٌ عالٍ في بيئةٍ لا تُرجع شيئًا. أسرع طريقٍ إلى الانهيار،
       وانتظارُ الأسبوع السابع لتشخيصه متأخّرٌ جدًّا. */
    const severeComposite =
      ENV !== null &&
      ENV <= TH().environment.starvingMax &&
      sev >= TH().spectrum.axisSeverityHigh;

    return {
      score: score,
      pct: pct,
      dominant: dominant,
      isComposite: isComposite,
      unresolved: unresolved,
      severeComposite: severeComposite,
      topTwo: [top, second],
      evidence: evidence
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٧ — ضبط الجودة

     ★ وظيفتها كشف الإجابة غير المتمعّنة، لا كشف الكذب.
       الفرق مهمّ: لسنا نشكّ في المستجيب، بل نتحقّق أنّه كان حاضرًا وهو يجيب.
     ══════════════════════════════════════════════════════════════════════ */
  function computeQualityCheck(raw, options) {
    options = options || {};
    const t = TH().qualityCheck;
    const signals = [];

    /* ── (١) أزواج التحقّق: المتوقَّع أن يقرب مجموع كل زوجٍ من ٨ ── */
    const pairs = [];
    ITEMS().QC.forEach(function (q) {
      const a = rawVal(raw, q.id);
      const b = rawVal(raw, q.pairsWith);
      if (a === null || b === null) return;
      const deviation = Math.abs((a + b) - t.pairExpectedSum);
      pairs.push({ qc: q.id, partner: q.pairsWith, sum: a + b, deviation: round2(deviation) });
    });
    const inconsistent = pairs.filter(function (p) { return p.deviation < t.pairMaxDeviation; });
    if (inconsistent.length >= t.pairsNeeded) {
      signals.push({ kind: "pairs", detail: inconsistent.length + " زوجًا متناقضًا" });
    }

    /* ── (٢) الرتابة: جرعةٌ كاملةٌ في درجةٍ واحدةٍ أو درجتين متجاورتين ── */
    const flatDoses = [];
    CFG().doses.forEach(function (d) {
      const ids = ITEMS().byDose(d.id)
        .filter(function (it) { return it.block !== "filter" && it.block !== "tie"; })
        .map(function (it) { return it.id; });
      const vals = ids.map(function (id) { return rawVal(raw, id); })
                      .filter(function (v) { return v !== null; });
      if (vals.length < 5) return;
      const range = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      if (range <= t.flatRangeMax) flatDoses.push(d.id);
    });
    if (flatDoses.length) {
      signals.push({ kind: "flat", detail: "الجرعات " + flatDoses.join("، ") });
    }

    /* ── (٣) السرعة: متوسّط زمن جرعةٍ أقلّ من الحدّ ── */
    const fastDoses = [];
    CFG().doses.forEach(function (d) {
      const ids = ITEMS().byDose(d.id).map(function (it) { return it.id; });
      const times = ids.map(function (id) { return responseMs(raw, id); })
                       .filter(function (v) { return v !== null && v > 0; });
      if (times.length < 5) return;
      const avg = times.reduce(function (s, x) { return s + x; }, 0) / times.length;
      if (avg < t.fastResponseMs) fastDoses.push(d.id);
    });
    if (fastDoses.length) {
      signals.push({ kind: "fast", detail: "الجرعات " + fastDoses.join("، ") });
    }

    /* ── (٤) التسلسل: أكثر من الحدّ متتاليًا بنفس القيمة ── */
    const ordered = ITEMS().all()
      .filter(function (it) { return it.dose !== null && it.block !== "filter" && it.block !== "tie"; })
      .sort(function (a, b) {
        if (a.dose !== b.dose) return a.dose - b.dose;
        return (a.order || 0) - (b.order || 0);
      });
    let streak = 1, maxStreak = 1, prev = null;
    ordered.forEach(function (it) {
      const v = rawVal(raw, it.id);
      if (v === null) { prev = null; streak = 1; return; }
      if (prev !== null && v === prev) { streak++; if (streak > maxStreak) maxStreak = streak; }
      else streak = 1;
      prev = v;
    });
    if (maxStreak > t.streakMax) {
      signals.push({ kind: "streak", detail: maxStreak + " بندًا متتاليًا" });
    }

    /* ── البنود الخمسة المعروضة عند قبول المراجعة ──
       البندان الأكثر انحرافًا في أزواج التحقّق، وثلاثةٌ من أشدّ الجرعات رتابة. */
    const reviewIds = [];
    pairs.slice()
      .sort(function (a, b) { return a.deviation - b.deviation; })
      .slice(0, 2)
      .forEach(function (p) { reviewIds.push(p.partner); });

    const flatSource = flatDoses[0] || fastDoses[0] || 3;
    ITEMS().byDose(flatSource)
      .filter(function (it) { return it.block !== "filter" && it.block !== "tie" && it.block !== "qc"; })
      .slice(0, t.reviewItemsCount)
      .forEach(function (it) {
        if (reviewIds.length < t.reviewItemsCount && reviewIds.indexOf(it.id) === -1) {
          reviewIds.push(it.id);
        }
      });

    return {
      raised: signals.length > 0,
      signals: signals,
      pairs: pairs,
      maxStreak: maxStreak,
      reviewIds: reviewIds.slice(0, t.reviewItemsCount)
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     الخطوة ٨ — المفتاح النصّيّ

     عشر خاناتٍ تحدّد النتيجة بالكامل. يُخزَّن في الوثيقة، فيُعاد بناء
     التقرير منه في أيّ وقتٍ بلا إعادة حساب، ويتفرّع عليه الأطلس والمسار
     لاحقًا في البرنامج.
     ══════════════════════════════════════════════════════════════════════ */
  function buildTextKey(parts) {
    const sep = CFG().textKey.separator;
    const up = function (x) { return String(x || "").toUpperCase(); };

    const envMap = { feed: "FEED", starve: "STARVE", block: "BLOCK", both: "BOTH", mid: "FEED" };
    const repMap = { loud: "LOUD", quiet: "QUIET", sec2: "SEC2" };

    return [
      up(parts.axis),
      up(parts.secondary),
      repMap[parts.repressionClass] || "SEC2",
      up(parts.targetDim),
      up(parts.targetCls),
      envMap[parts.envFlag] || "FEED",
      parts.matchesAxis ? "MATCH" : "NOMATCH",
      up(parts.move),
      (parts.autShow === "show") ? "YES" : "NO",
      up(parts.role || "lead")
    ].join(sep);
  }

  /* تفكيك المفتاح — يُستعمل في burn-report.html لإعادة البناء */
  function parseTextKey(key) {
    const cfg = CFG();
    const parts = String(key || "").split(cfg.textKey.separator);
    const out = {};
    cfg.textKey.segments.forEach(function (seg, i) {
      out[seg.key] = parts[i] || null;
    });
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     المنسّق — computeAll

     يستدعي الخطوات بترتيبها، ولا خطوةَ تُحسب قبل مدخلاتها.
     options: { role, primaryOverride, tieChoice }
     ══════════════════════════════════════════════════════════════════════ */
  function computeAll(raw, options) {
    options = options || {};
    const cfg = CFG();

    /* ١ — الترتيب */
    let ranking = computeRanking(raw);

    /* حسم التعادل إن كان قد أُجيب عن السؤال الفارز */
    if (options.tieChoice) ranking = applyTieBreaker(ranking, options.tieChoice);

    /* ★ احترام القفل: إن كان المحور قد قُفل سابقًا فلا يُعاد حسابه.
       السبب: تغييرُه بعد التفريع يترك المشارك بأبعادٍ من محورين، والنتيجة
       تفسد بلا أن ينتبه أحد. */
    if (options.primaryOverride && AXES.indexOf(options.primaryOverride) > -1 &&
        options.primaryOverride !== ranking.primary) {
      ranking = applyTieBreaker(ranking, options.primaryOverride);
      ranking.tieResolvedByQuestion = false;
      ranking.lockedOverride = true;
    }

    const primary = ranking.primary;

    /* ٢ إلى ٥ */
    const dims = computeDimensions(raw, primary);
    const env  = computeEnvironment(raw, primary);
    const fn   = computeFunctionality(raw, primary);
    const wb   = computeWellbeing(raw);

    const matchesAxis = (wb.lowest !== null) && (wb.lowest === cfg.levelOfAxis(primary));

    /* ٦ */
    const lean = computeTypeLean(raw, ranking, dims, env, fn, wb);

    /* ٧ */
    const qc = computeQualityCheck(raw, options);

    /* ٨ */
    const textKey = buildTextKey({
      axis: primary,
      secondary: ranking.secondary,
      repressionClass: ranking.repressionClass,
      targetDim: dims.targetDim,
      targetCls: dims.targetCls,
      envFlag: env.flag,
      matchesAxis: matchesAxis,
      move: fn.move,
      autShow: fn.autShow,
      role: options.role
    });

    return {
      axes: ranking.axes,
      primary: primary,
      secondary: ranking.secondary,
      repressed: ranking.repressed,
      repressionScore: ranking.repressionScore,
      repressionClass: ranking.repressionClass,
      unstableOrder: ranking.unstableOrder,
      needsTieBreaker: ranking.needsTieBreaker,
      tiePair: ranking.tiePair,
      tieResolvedByQuestion: ranking.tieResolvedByQuestion,

      dimensions: dims.dimensions,
      targetDim: dims.targetDim,
      targetCls: dims.targetCls,
      targetTiltToward: dims.targetTiltToward,
      targetSeverity: dims.targetSeverity,
      axisSeverity: dims.axisSeverity,
      axisSeverityClass: dims.axisSeverityClass,
      oscillatingCount: dims.oscillatingCount,
      precedenceApplied: dims.precedenceApplied,
      practiceOverride: dims.practiceOverride,

      environment: env,
      functionality: fn,
      wellbeing: wb,
      matchesAxis: matchesAxis,

      typeLean: lean,
      qualityCheck: qc,
      textKey: textKey,
      role: options.role || null,

      computedAt: Date.now(),
      engineVersion: cfg.meta.version
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     تحقّق سلامة البنية — يُستدعى في التطوير لا في الإنتاج
     ══════════════════════════════════════════════════════════════════════ */
  function verifyIntegrity() {
    const issues = [];
    let cfg, items;
    try { cfg = CFG(); items = ITEMS(); }
    catch (e) { return { ok: false, issues: ["البيانات الثابتة غير متاحة: " + e.message] }; }

    /* البنود الثابتة موجودة لكل محور */
    AXES.forEach(function (ax) {
      DIMS.forEach(function (d) {
        ["bal", "exc", "def", "osc"].forEach(function (s) {
          const found = items.L2.spectrum.some(function (it) {
            return it.axis === ax && it.dim === d && it.state === s;
          });
          if (!found) issues.push("بند طيفٍ ناقص: " + ax + "/" + d + "/" + s);
        });
      });
      const disc = items.L2.discrimination.filter(function (it) { return it.axis === ax; });
      if (disc.length !== 2) issues.push("بندا التمييز ناقصان في " + ax);
      if (!disc.some(function (it) { return it.role === "fearIntensity"; }))
        issues.push("بند حدّة الخوف ناقص في " + ax);

      const envItems = items.L3.filter(function (it) { return it.axis === ax; });
      if (envItems.length !== 9) issues.push("بنود البيئة في " + ax + ": " + envItems.length);
      if (envItems.filter(function (it) { return it.reverse; }).length !== 1)
        issues.push("البند الإيجابيّ في بيئة " + ax + " ليس واحدًا");
      if (envItems.filter(function (it) { return it.group === "reception"; }).length !== 2)
        issues.push("بندا التلقّي ناقصان في بيئة " + ax);

      const aut = items.L4.automaticFace.filter(function (it) { return it.axis === ax; });
      if (aut.length !== 3) issues.push("بنود الوجه الآليّ في " + ax + ": " + aut.length);
    });

    /* بنود الوظيفية بمعرّفاتها المستعملة صراحةً في المحرّك */
    ["L4_SLF_01","L4_SLF_02","L4_SLF_03","L4_SLF_04",
     "L4_FUE_01","L4_FUE_02","L4_FUE_03",
     "L4_AGN_01","L4_AGN_02","L4_AGN_03",
     "L4_DBL_01","L4_DBL_02"].forEach(function (id) {
      if (!items.byId(id)) issues.push("بند وظيفيّة مفقود: " + id);
    });

    /* بنود النبضة الثلاثة بمعرّفاتها المشتقّة في ميل المكبوت */
    AXES.forEach(function (ax) {
      const id = "L2_PLS_" + ax.toUpperCase();
      if (!items.byId(id)) issues.push("بند نبضة مفقود: " + id);
    });

    /* الطبقة الخامسة: ثلاثٌ لكل مستوى، واثنتان منها في المختصرة */
    LEVELS.forEach(function (lv) {
      const all = items.L5.filter(function (it) { return it.level === lv; });
      if (all.length !== 3) issues.push("بنود " + lv + ": " + all.length);
      const shortOnes = all.filter(function (it) { return it.inShort; });
      if (shortOnes.length !== 2) issues.push("بنود " + lv + " في المختصرة: " + shortOnes.length);
    });

    /* خانات المفتاح النصّيّ عشر */
    if (!cfg.textKey || cfg.textKey.segments.length !== 10)
      issues.push("خانات المفتاح النصّيّ ليست عشرًا");

    /* قيم خانة الحركة تطابق ما يُنتجه المحرّك */
    const moveSeg = cfg.textKey.segments.filter(function (s) { return s.key === "move"; })[0];
    const produced = ["TOXIC", "HORIZ", "STALL", "FUEL", "SOUND"];
    if (moveSeg) {
      produced.forEach(function (v) {
        if (moveSeg.values.indexOf(v) === -1)
          issues.push("قيمة حركةٍ ينتجها المحرّك وليست في الـconfig: " + v);
      });
    }

    return { ok: issues.length === 0, issues: issues };
  }

  /* ══════════════════════════════════════════════════════════════════════
     التصدير
     ══════════════════════════════════════════════════════════════════════ */
  return {
    /* الخطوات الثمان */
    computeRanking: computeRanking,
    computeDimensions: computeDimensions,
    computeEnvironment: computeEnvironment,
    computeFunctionality: computeFunctionality,
    computeWellbeing: computeWellbeing,
    computeTypeLean: computeTypeLean,
    computeQualityCheck: computeQualityCheck,
    buildTextKey: buildTextKey,

    /* مساعِدات */
    computeAll: computeAll,
    applyTieBreaker: applyTieBreaker,
    computePulse: computePulse,
    parseTextKey: parseTextKey,
    verifyIntegrity: verifyIntegrity,

    /* ثوابت للاستعمال الخارجيّ */
    AXES: AXES,
    DIMS: DIMS,
    LEVELS: LEVELS
  };
});

if (typeof window !== "undefined") {
  console.log("✅ BURN_ENGINE جاهز");
}
