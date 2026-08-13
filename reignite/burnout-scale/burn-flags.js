/* ════════════════════════════════════════════════════════════════════════
   burn-flags.js — شجرة العلامات في مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-flags.js

   منطق قرارٍ نقيّ: لا UI، لا HTML، لا Firestore، لا حساب.
   يأخذ مخرجات BURN_ENGINE.computeAll ويُخرج العلامات المرفوعة،
   مرتّبةً بأولويّتها، مصفّاةً بقواعد التنافي، مقسومةً بين ما يراه
   المشارك وما يراه المدرّب.

   ──────────────────────────────────────────────────────────────────────
   لماذا فُصل عن المحرّك؟
     لأنّ الحساب شيءٌ والقرار شيءٌ آخر. المحرّك يقول «ENV = 2.4»،
     وهذا الملفّ يقول «إذن: بيئةٌ مُجوِّعة، وهذه علامةٌ تستدعي تواصلًا
     في الأسبوع الأوّل». والفصل يجعل معايرة القرارات بعد الدفعة الأولى
     تقع في ملفٍّ صغيرٍ يُقرأ في دقيقة، لا في محرّكٍ من ثلاثين كيلوبايت.

   ──────────────────────────────────────────────────────────────────────
   المستويات الثلاثة:
     المستوى ١ — تحويلٌ وتدخّل   (٥ علامات) تستدعي تواصلًا شخصيًّا
     المستوى ٢ — ملاحظةٌ في النتيجة (٦ علامات) تستدعي كتلةً نصّيّة
     المستوى ٣ — داخليّة          (٨ علامات) لا يراها المشارك أبدًا

   ──────────────────────────────────────────────────────────────────────
   أربع قواعد حاكمة:
     ★ الحدّ الأقصى: ثلاث علاماتٍ في شاشة النتيجة الواحدة. أكثر من ذلك
       يتحوّل إلى قائمة عيوبٍ فيقفل المشارك.
     ★ الإغلاق: FLG_BEYOND_SCOPE تُغلق كل ما سواها وتستبدل الشاشات.
     ★ التنافي: علاماتٌ شروطها متناقضة لا تجتمع، وإن اجتمعت فخللٌ يُبلَّغ.
     ★ الترتيب: العلامات تُرتَّب بالأولويّة لا بترتيب اكتشافها.
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BURN_FLAGS = api;
  if (typeof globalThis !== "undefined") globalThis.BURN_FLAGS = api;
})(this, function () {
  "use strict";

  function _resolve(name, requirePath) {
    try { if (name === "BURN_CONFIG" && typeof BURN_CONFIG !== "undefined") return BURN_CONFIG; }
    catch (e) { /* تجاهُل */ }
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    if (typeof require !== "undefined" && requirePath) {
      try { const m = require(requirePath); if (m && Object.keys(m).length) return m; } catch (e) {}
    }
    return null;
  }
  function CFG() {
    const v = _resolve("BURN_CONFIG", "./burn-config.js");
    if (!v) throw new Error("BURN_CONFIG غير متاح.");
    return v;
  }
  function TH() { return CFG().thresholds; }

  function n(x, fallback) { return (typeof x === "number" && !isNaN(x)) ? x : fallback; }

  /* ══════════════════════════════════════════════════════════════════════
     ١ — سجلّ العلامات

     كل علامة:
       id         المعرّف الثابت
       level      1 تدخّل · 2 ملاحظة · 3 داخليّة
       priority   1 الأعلى إلى 19
       toClient   هل تُعرَض للمشارك في النتيجة
       toCoach    هل تظهر في لوحة المدرّب
       block      الكتلة النصّيّة التي تستدعيها (أو null)
       closes     هل تُغلق كل العلامات الأخرى
       test       دالّة الشرط، تأخذ نتيجة المحرّك وتُرجع true/false
       reason     دالّة اختياريّة تُرجع سطرًا يشرح سبب الرفع للمدرّب
     ══════════════════════════════════════════════════════════════════════ */
  const REGISTRY = [

    /* ══════════════ المستوى الأوّل — تحويلٌ وتدخّل ══════════════ */

    {
      /* الأداة تعترف بحدّها. حين يمتدّ ما يحمله المشارك إلى ما هو أعمق من
         الاحتراق المهنيّ، لا نشخّص ولا نُخوّف ولا ننسحب — بل نحوّل. */
      id: "FLG_BEYOND_SCOPE",
      level: 1, priority: 1, toClient: true, toCoach: true,
      block: "SPC_BEYOND", closes: true,
      test: function (r, raw) {
        const t = TH().wellbeing;
        const lost = _rawOf(raw, "L3_ENV_" + up(r.primary) + "_R2");
        const numb = _dimStateScore(r, "d1", "def");
        const vitNumb = _rawOf(raw, "L2_SPC_VIT_D1_DEF");
        const dulled = Math.max(n(numb, 0), n(vitNumb, 0));
        return n(lost, 0) >= 6.0 && dulled >= 6.0 && r.wellbeing.allCritical === true;
      },
      reason: function (r) {
        return "تبلّدٌ حادٌّ مع انهيارٍ في مستويات العافية الثلاثة معًا (" +
               [r.wellbeing.vig, r.wellbeing.prs, r.wellbeing.ful].join(" · ") + ").";
      }
    },

    {
      /* ★ اعترافٌ بحدود الأداة لا تفسيرٌ مصطنع.
         بيئةٌ تُعطي، وأبعادٌ قريبةٌ من اتزانها، وإحساسٌ منهار. لا نملك تفسيرًا،
         فنقولها صراحةً بدل أن نلبس المشارك تشخيصًا لا يشبهه. */
      id: "FLG_UNEXPLAINED_GAP",
      level: 1, priority: 2, toClient: true, toCoach: true,
      block: "SPC_GAP", closes: true,
      test: function (r) {
        const env = n(r.environment.ENV, 0);
        const sev = n(r.axisSeverity, 0);
        const low = n(r.wellbeing.lowestValue, 9);
        return env >= TH().environment.feedingMin &&
               sev <= TH().spectrum.axisSeverityLow &&
               low <= 3.0;
      },
      reason: function (r) {
        return "بيئةٌ مُغذّية (" + r.environment.ENV + ") وشدّةٌ منخفضة (" +
               r.axisSeverity + ") مع عافيةٍ منهارة (" + r.wellbeing.lowestValue + ").";
      }
    },

    {
      /* أسرع طريقٍ إلى الانهيار: جهدٌ عالٍ في بيئةٍ لا تُرجع شيئًا.
         وانتظارُ الأسبوع السابع لتشخيصه متأخّرٌ جدًّا. */
      id: "FLG_SEVERE_COMPOSITE",
      level: 1, priority: 3, toClient: true, toCoach: true,
      block: null, closes: false,
      test: function (r) { return r.typeLean.severeComposite === true; },
      reason: function (r) {
        return "بيئةٌ مُجوِّعة (" + r.environment.ENV + ") مع شدّةٍ مرتفعة (" +
               r.axisSeverity + ") — استنزافٌ من جهتين معًا.";
      }
    },

    {
      /* ★ الأداة التي لا تستطيع أن تقول «هذا ليس احتراقًا» أداةٌ غير صادقة،
         لأنّها ستجد احتراقًا عند كل من يستعملها. */
      id: "FLG_NOT_BURNOUT",
      level: 1, priority: 4, toClient: true, toCoach: true,
      block: "SPC_NOTBURN", closes: true,
      test: function (r) {
        const env = n(r.environment.ENV, 0);
        const maxS = Math.max.apply(null, (r.dimensions || []).map(function (d) { return n(d.S, 0); }));
        const low = n(r.wellbeing.lowestValue, 0);
        return env >= TH().environment.feedingMin &&
               maxS <= TH().spectrum.axisSeverityLow &&
               low >= 4.0;
      },
      reason: function (r) {
        return "لا نزيفَ يُذكر في الأبعاد، وبيئةٌ مُغذّية، وعافيةٌ سليمة.";
      }
    },

    {
      id: "FLG_ACUTE_CRISIS",
      level: 1, priority: 5, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r, raw) { return _rawOf(raw, "PRE_FLT_01") === true; },
      reason: function () { return "أعلن المشارك حدثًا كبيرًا خلال الشهر الأخير."; }
    },

    /* ══════════════ المستوى الثاني — ملاحظةٌ في النتيجة ══════════════ */

    {
      /* أخطر شريحةٍ وأقلّها شكوى: أداؤه ممتازٌ ووقودُه خوف، فلا يشكو
         ولا يتراجع — إلى أن يتوقّف مرّةً واحدة. */
      id: "FLG_TOXIC_FUEL",
      level: 2, priority: 6, toClient: true, toCoach: true,
      block: "MOV_TOXIC", closes: false,
      test: function (r) {
        const t = TH().functionality;
        return n(r.functionality.SLF, 0) >= t.slfSoundMin &&
               n(r.functionality.FUE, 9) <= t.fueToxicMax;
      },
      reason: function (r) {
        return "وظيفيّةٌ ذاتيّةٌ عالية (" + r.functionality.SLF +
               ") مع وقودٍ ملوَّث (" + r.functionality.FUE + ").";
      }
    },

    {
      /* تخيّل المستقبل يحتاج طاقة، وهي أوّل ما يُستهلك حين يطول الاستنزاف. */
      id: "FLG_HORIZON_COLLAPSE",
      level: 2, priority: 7, toClient: true, toCoach: true,
      block: "MOV_HORIZ", closes: false,
      test: function (r) {
        return n(r.functionality.horizonRaw, 0) >= TH().functionality.horizonCollapse;
      },
      reason: function (r) {
        return "بند الأفق عند " + r.functionality.horizonRaw + " — لا يعرف ما يريد في السنتين القادمتين.";
      }
    },

    {
      /* البيئة سليمةٌ والقناة مسدودة — احتراقٌ داخليٌّ لا جوعٌ بيئيّ.
         والفرق يقلب العلاج. */
      id: "FLG_ENV_GIVES_NOT_RECEIVED",
      level: 2, priority: 8, toClient: true, toCoach: true,
      block: "ENV_BLOCK", closes: false,
      test: function (r) { return r.environment.flag === "block"; },
      reason: function (r) {
        return "ENV " + r.environment.ENV + " مع RCV " + r.environment.RCV + " — ما يُعطى لا يستقرّ.";
      }
    },

    {
      id: "FLG_ENV_STARVING",
      level: 2, priority: 9, toClient: true, toCoach: true,
      block: "ENV_STARVE", closes: false,
      test: function (r) { return r.environment.flag === "starve"; },
      reason: function (r) { return "ENV " + r.environment.ENV + " — البيئة لا تقدّم ما يغذّي الاتجاه."; }
    },

    {
      /* العجز الانتقائيّ: يتحرّك بكفاءةٍ فيما يخصّ غيره ويتعطّل فيما يخصّه.
         ويُقرأ خطأً على أنّه إيثارٌ أو تفانٍ. */
      id: "FLG_SELF_STALLED",
      level: 2, priority: 10, toClient: true, toCoach: true,
      block: "MOV_STALL", closes: false,
      test: function (r) {
        return n(r.functionality.SLF, 9) <= TH().functionality.slfStalledMax;
      },
      reason: function (r) { return "الوظيفية الذاتيّة عند " + r.functionality.SLF + "."; }
    },

    {
      id: "FLG_AUTOMATIC_FACE",
      level: 2, priority: 11, toClient: true, toCoach: false,
      block: "MIR", closes: false,
      test: function (r) { return r.functionality.autShow === "show"; },
      reason: function (r) { return "الوجه الآليّ عند " + r.functionality.AUT + "."; }
    },

    /* ══════════════ المستوى الثالث — داخليّة، لا يراها المشارك ══════════════ */

    {
      /* ★ لا تُعرَض للمشارك أبدًا في النتيجة. المكبوت بذرةٌ في شاشة النتيجة،
         ويُفتح في القاع بعد أن يكون قد فهم الرئيسيّ بالكامل. */
      id: "FLG_LOUD_REPRESSION",
      level: 3, priority: 12, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) {
        return n(r.repressionScore, 0) >= TH().ranking.repressionClassMin.loud;
      },
      reason: function (r) {
        return "درجة الكبت " + r.repressionScore + " في محور " + r.repressed + " — مادّةٌ للقاع.";
      }
    },

    {
      /* أقوى مؤشّرٍ على وجود محورٍ مكبوت: مبالغةٌ في اتجاهٍ لتغطية غياب آخر. */
      id: "FLG_DOUBLE_LOAD",
      level: 3, priority: 13, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) {
        return n(r.functionality.DBL, 0) >= TH().functionality.dblFullWeight;
      },
      reason: function (r) { return "الحمل المضاعف عند " + r.functionality.DBL + " — مادّةٌ للقاع."; }
    },

    {
      id: "FLG_PRECEDENCE",
      level: 3, priority: 14, toClient: true, toCoach: true,
      block: null, closes: false,
      test: function (r) { return r.precedenceApplied === true; },
      reason: function () {
        return "تنظيمٌ ذاتيٌّ متذبذبٌ بشدّة — قُدِّمت ممارسته على البُعد الهدف.";
      }
    },

    {
      id: "FLG_TIE_RESOLVED",
      level: 3, priority: 15, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) { return r.tieResolvedByQuestion === true; },
      reason: function (r) {
        return "المحور حُسم بالسؤال الفارز — يستحقّ تحقّقًا في الأسبوع الثاني.";
      }
    },

    {
      id: "FLG_QUALITY_CHECK",
      level: 3, priority: 16, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) { return r.qualityCheck && r.qualityCheck.raised === true; },
      reason: function (r) {
        return "إشارات: " + (r.qualityCheck.signals || []).map(function (s) {
          return s.kind + " (" + s.detail + ")";
        }).join("، ");
      }
    },

    {
      id: "FLG_UNSTABLE_ORDER",
      level: 3, priority: 17, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) { return r.unstableOrder === true; },
      reason: function () { return "قاعدة الاستبعاد أقصت محورين — الترتيب غير مستقرّ."; }
    },

    {
      id: "FLG_DOUBLE_OSCILLATION",
      level: 3, priority: 18, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r) { return n(r.oscillatingCount, 0) >= 2; },
      reason: function (r) {
        return r.oscillatingCount + " أبعادٍ متذبذبةٍ في المحور نفسه — عدم استقرارٍ عامّ، يُنظر فيه في الأسبوع السادس.";
      }
    },

    {
      id: "FLG_SHORT_ENV_WINDOW",
      level: 3, priority: 19, toClient: false, toCoach: true,
      block: null, closes: false,
      test: function (r, raw) { return _rawOf(raw, "PRE_FLT_02") === true; },
      reason: function () { return "تغيّر مهنيٌّ حديث — قراءة البيئة قصيرة المدى."; }
    }
  ];

  /* ══════════════════════════════════════════════════════════════════════
     ٢ — قواعد التنافي

     علاماتٌ شروطها متناقضةٌ منطقيًّا فلا تجتمع. واجتماعها يعني خللًا في
     العتبات أو في المحرّك، فيُبلَّغ عنه بدل أن يُبتلع صامتًا.
     ══════════════════════════════════════════════════════════════════════ */
  const MUTUALLY_EXCLUSIVE = [
    { pair: ["FLG_NOT_BURNOUT", "FLG_SEVERE_COMPOSITE"], keep: "FLG_SEVERE_COMPOSITE",
      why: "شرطاهما متناقضان في ENV والشدّة" },
    { pair: ["FLG_NOT_BURNOUT", "FLG_ENV_STARVING"], keep: "FLG_ENV_STARVING",
      why: "الأولى تشترط بيئةً مُغذّيةً والثانية مُجوِّعة" },
    { pair: ["FLG_NOT_BURNOUT", "FLG_UNEXPLAINED_GAP"], keep: "FLG_UNEXPLAINED_GAP",
      why: "الأولى تشترط عافيةً سليمةً والثانية منهارة" },
    { pair: ["FLG_ENV_STARVING", "FLG_ENV_GIVES_NOT_RECEIVED"], keep: "FLG_ENV_STARVING",
      why: "شرطاهما متناقضان في ENV" },
    { pair: ["FLG_TOXIC_FUEL", "FLG_SELF_STALLED"], keep: "FLG_TOXIC_FUEL",
      why: "الأولى تشترط SLF عاليةً والثانية منخفضة" }
  ];

  /* كتل البيئة الأربع: واحدةٌ فقط تُعرَض، بترتيب الشدّة */
  const ENV_BLOCK_PRIORITY = ["ENV_BOTH", "ENV_STARVE", "ENV_BLOCK", "ENV_FEED"];

  /* ══════════════════════════════════════════════════════════════════════
     ٣ — أدوات داخليّة
     ══════════════════════════════════════════════════════════════════════ */
  function up(s) { return String(s || "").toUpperCase(); }

  function _rawOf(raw, id) {
    if (!raw) return null;
    const c = raw[id];
    if (c === undefined || c === null) return null;
    return (typeof c === "object") ? c.v : c;
  }

  function _dimStateScore(r, dimId, state) {
    const d = (r.dimensions || []).filter(function (x) { return x.dim === dimId; })[0];
    if (!d) return null;
    const map = { bal: "B", exc: "E", def: "F", osc: "O" };
    return d[map[state]];
  }

  function byId(flagId) {
    return REGISTRY.filter(function (f) { return f.id === flagId; })[0] || null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٤ — التقييم

     evaluate(result, raw) → كائنٌ واحدٌ فيه كل ما يحتاجه العرض والمدرّب.
     ══════════════════════════════════════════════════════════════════════ */
  function evaluate(result, raw) {
    if (!result) return _empty();

    /* ── (أ) رفع كل ما تحقّق شرطه ── */
    let raised = [];
    const errors = [];

    REGISTRY.forEach(function (f) {
      let ok = false;
      try { ok = !!f.test(result, raw || {}); }
      catch (e) { errors.push("خطأ في شرط " + f.id + ": " + e.message); }
      if (ok) {
        raised.push({
          id: f.id,
          level: f.level,
          priority: f.priority,
          toClient: f.toClient,
          toCoach: f.toCoach,
          block: f.block,
          closes: f.closes,
          reason: (typeof f.reason === "function") ? _safeReason(f, result) : null
        });
      }
    });

    /* ── (ب) تطبيق قواعد التنافي ── */
    const conflicts = [];
    MUTUALLY_EXCLUSIVE.forEach(function (rule) {
      const present = rule.pair.filter(function (id) {
        return raised.some(function (x) { return x.id === id; });
      });
      if (present.length === 2) {
        conflicts.push({ pair: rule.pair, kept: rule.keep, why: rule.why });
        const drop = rule.pair.filter(function (id) { return id !== rule.keep; })[0];
        raised = raised.filter(function (x) { return x.id !== drop; });
      }
    });

    /* ── (ج) الترتيب بالأولويّة ── */
    raised.sort(function (a, b) { return a.priority - b.priority; });

    /* ── (د) الإغلاق: علامةٌ closes تُغلق كل ما سواها ── */
    const closer = raised.filter(function (x) { return x.closes; })[0];
    let effective = raised;
    let closedBy = null;
    if (closer) {
      closedBy = closer.id;
      /* تبقى معه العلامات الداخليّة للمدرّب فقط — فالمدرّب يحتاج الصورة كاملة */
      effective = raised.filter(function (x) {
        return x.id === closer.id || x.level === 3;
      });
    }

    /* ── (هـ) القسمة: ما يراه المشارك وما يراه المدرّب ── */
    const clientAll = effective.filter(function (x) { return x.toClient; });
    const maxFlags = TH().display.maxFlags;
    const clientShown = clientAll.slice(0, maxFlags);
    const clientDeferred = clientAll.slice(maxFlags);   /* تُخزَّن للأطلس أو القاع */
    const coachFlags = raised.filter(function (x) { return x.toCoach; });

    /* ── (و) الكتل النصّيّة التي تستدعيها العلامات ── */
    const blocks = clientShown
      .map(function (x) { return x.block; })
      .filter(function (b) { return !!b; });

    /* ── (ز) هل تُستبدَل الشاشات الثلاث بشاشةٍ خاصّة؟ ── */
    const specialScreen = closer ? closer.block : null;

    /* ── (ح) التنبيهات: مواعيد التدخّل ── */
    const alerts = coachFlags
      .filter(function (x) { return x.level <= 2; })
      .map(function (x) {
        return {
          id: x.id,
          priority: x.priority,
          reason: x.reason,
          window: _alertWindow(x.id)
        };
      });

    return {
      all: raised.map(function (x) { return x.id; }),
      clientShown: clientShown.map(function (x) { return x.id; }),
      clientDeferred: clientDeferred.map(function (x) { return x.id; }),
      coach: coachFlags.map(function (x) { return x.id; }),
      detailed: raised,
      blocks: blocks,
      specialScreen: specialScreen,
      closedBy: closedBy,
      conflicts: conflicts,
      alerts: alerts,
      errors: errors
    };
  }

  function _safeReason(f, result) {
    try { return f.reason(result); } catch (e) { return null; }
  }

  function _empty() {
    return {
      all: [], clientShown: [], clientDeferred: [], coach: [],
      detailed: [], blocks: [], specialScreen: null, closedBy: null,
      conflicts: [], alerts: [], errors: ["لا نتيجةَ للتقييم"]
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٥ — مواعيد التدخّل

     ★ مواعيدُ ملزِمةٌ لا استرشاديّة. علامة تجاوز النطاق تعني تواصلًا خلال
       ٤٨ ساعة، والانتظار حتى نهاية البرنامج انتهاكٌ للحدّ المهنيّ.
     ══════════════════════════════════════════════════════════════════════ */
  const ALERT_WINDOWS = {
    FLG_BEYOND_SCOPE:           { hours: 48,  label: "تواصلٌ شخصيٌّ خلال ٤٨ ساعة",   urgency: "critical" },
    FLG_UNEXPLAINED_GAP:        { week: 1,    label: "تواصلٌ في الأسبوع الأوّل",     urgency: "high" },
    FLG_SEVERE_COMPOSITE:       { week: 1,    label: "تواصلٌ في الأسبوع الأوّل",     urgency: "high" },
    FLG_NOT_BURNOUT:            { week: 1,    label: "تواصلٌ في الأسبوع الأوّل",     urgency: "high" },
    FLG_ACUTE_CRISIS:           { dose: 3,    label: "تواصلٌ قبل الجرعة الثالثة",    urgency: "high" },
    FLG_TOXIC_FUEL:             { week: 2,    label: "ملاحظةٌ في الأسبوع الثاني",    urgency: "normal" },
    FLG_HORIZON_COLLAPSE:       { week: 2,    label: "ملاحظةٌ في الأسبوع الثاني",    urgency: "normal" },
    FLG_ENV_STARVING:           { week: 2,    label: "ملاحظةٌ في الأسبوع الثاني",    urgency: "normal" },
    FLG_ENV_GIVES_NOT_RECEIVED: { week: 2,    label: "ملاحظةٌ في الأسبوع الثاني",    urgency: "normal" },
    FLG_SELF_STALLED:           { week: 2,    label: "ملاحظةٌ في الأسبوع الثاني",    urgency: "normal" },
    FLG_TIE_RESOLVED:           { week: 2,    label: "تحقّقٌ في الأسبوع الثاني",     urgency: "low" },
    FLG_QUALITY_CHECK:          { week: 2,    label: "تحقّقٌ في الأسبوع الثاني",     urgency: "low" },
    FLG_UNSTABLE_ORDER:         { week: 2,    label: "تحقّقٌ في الأسبوع الثاني",     urgency: "low" },
    FLG_DOUBLE_OSCILLATION:     { week: 6,    label: "نظرٌ في الأسبوع السادس",       urgency: "low" }
  };

  function _alertWindow(flagId) {
    return ALERT_WINDOWS[flagId] || { label: "بلا موعدٍ محدّد", urgency: "low" };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٦ — كتلة البيئة الواحدة

     أربع كتلٍ، وواحدةٌ فقط تُعرَض بترتيب الشدّة.
     ══════════════════════════════════════════════════════════════════════ */
  function environmentBlock(result) {
    if (!result || !result.environment) return "ENV_FEED";
    const map = { both: "ENV_BOTH", starve: "ENV_STARVE", block: "ENV_BLOCK", feed: "ENV_FEED" };
    const candidate = map[result.environment.flag] || "ENV_FEED";
    /* ترتيب الشدّة محفوظ: لو تعدّدت الاحتمالات يُختار الأشدّ */
    for (let i = 0; i < ENV_BLOCK_PRIORITY.length; i++) {
      if (ENV_BLOCK_PRIORITY[i] === candidate) return candidate;
    }
    return "ENV_FEED";
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٧ — تقرير المدرّب

     صفٌّ واحدٌ في لوحة الدفعة.
     ★ اللوحة تُرتَّب أبجديًّا لا بالشدّة، والعلامات تُبرَز بلونها لا بموقعها —
       فالمدرّب لا ينبغي أن يرى الناس مرتَّبين بأوجاعهم.
     ══════════════════════════════════════════════════════════════════════ */
  function coachRow(result, flags, meta) {
    meta = meta || {};
    const cfg = CFG();
    const ax = cfg.getAxis(result.primary) || {};
    const dim = cfg.getDim(result.primary, result.targetDim) || {};

    const urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const topAlert = (flags.alerts || []).slice().sort(function (a, b) {
      return urgencyOrder[a.window.urgency] - urgencyOrder[b.window.urgency];
    })[0] || null;

    return {
      alias: meta.alias || null,
      role: result.role || null,

      axis: { id: result.primary, name: ax.name || result.primary },
      secondary: result.secondary,
      repressed: result.repressed,
      repressionClass: result.repressionClass,
      repressionScore: result.repressionScore,

      target: {
        dim: result.targetDim,
        name: dim.name || result.targetDim,
        cls: result.targetCls,
        severity: result.targetSeverity
      },
      axisSeverity: result.axisSeverity,
      axisSeverityClass: result.axisSeverityClass,

      environment: {
        ENV: result.environment.ENV,
        RCV: result.environment.RCV,
        cls: result.environment.cls,
        flag: result.environment.flag
      },

      functionality: {
        SLF: result.functionality.SLF,
        FUE: result.functionality.FUE,
        AGN: result.functionality.AGN,
        DBL: result.functionality.DBL,
        AUT: result.functionality.AUT,
        move: result.functionality.move
      },

      wellbeing: {
        vig: result.wellbeing.vig,
        prs: result.wellbeing.prs,
        ful: result.wellbeing.ful,
        lowest: result.wellbeing.lowest
      },

      typeLean: {
        pct: result.typeLean.pct,
        dominant: result.typeLean.dominant,
        composite: result.typeLean.isComposite,
        unresolved: result.typeLean.unresolved
      },

      flags: flags.coach,
      alerts: flags.alerts,
      topUrgency: topAlert ? topAlert.window.urgency : null,

      textKey: result.textKey,
      progress: meta.progress || null
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٨ — قراءة الدفعة ككلّ

     ★ متوسّط البيئة المنخفض عند أغلب الدفعة يعني أنّ المشكلة تنظيميّةٌ
       لا فرديّة — ويُقال للشريك المؤسّسيّ بصراحة، وإلّا حمّلنا الأفراد
       مسؤوليّة ما ليس منهم.
     ══════════════════════════════════════════════════════════════════════ */
  function cohortSummary(rows) {
    rows = rows || [];
    const total = rows.length;
    if (!total) return { total: 0 };

    const axisSpread = { coh: 0, vit: 0, bel: 0 };
    const typeSpread = { burnt: 0, starved: 0, repressed: 0, composite: 0, unresolved: 0 };
    const dimSpread = {};
    const flagCount = {};
    let envSum = 0, envN = 0;

    rows.forEach(function (r) {
      if (r.axis && axisSpread[r.axis.id] !== undefined) axisSpread[r.axis.id]++;

      if (r.typeLean.unresolved)      typeSpread.unresolved++;
      else if (r.typeLean.composite)  typeSpread.composite++;
      else if (r.typeLean.dominant)   typeSpread[r.typeLean.dominant]++;

      const key = (r.axis ? r.axis.id : "?") + "/" + r.target.dim;
      dimSpread[key] = (dimSpread[key] || 0) + 1;

      (r.flags || []).forEach(function (f) { flagCount[f] = (flagCount[f] || 0) + 1; });

      if (typeof r.environment.ENV === "number") { envSum += r.environment.ENV; envN++; }
    });

    const envAvg = envN ? Math.round((envSum / envN) * 100) / 100 : null;
    const organizational = (envAvg !== null) && (envAvg <= TH().environment.starvingMax);

    /* المسارات المطلوب بناؤها أوّلًا — ترجيحٌ عمليٌّ من توزيع الأبعاد */
    const pathPriority = Object.keys(dimSpread)
      .map(function (k) { return { key: k, count: dimSpread[k] }; })
      .sort(function (a, b) { return b.count - a.count; });

    return {
      total: total,
      axisSpread: axisSpread,
      typeSpread: typeSpread,
      dimSpread: dimSpread,
      pathPriority: pathPriority,
      flagCount: flagCount,
      envAverage: envAvg,
      organizationalIssue: organizational,
      organizationalNote: organizational
        ? "متوسّط البيئة في الدفعة منخفض. المشكلة هنا تنظيميّةٌ لا فرديّة، وينبغي أن تُقال للشريك المؤسّسيّ بصراحة — وإلّا حمّلنا الأفراد مسؤوليّة ما ليس منهم."
        : null,
      /* تشكيل المجموعات: محاورٌ مختلفةٌ وأدوارٌ متنوّعة، لأنّ أهمّ اكتشافٍ
         يقع للمشارك هو أنّ من بجانبه يحترق بشكلٍ مختلفٍ تمامًا. */
      groupingHint: "شكّل المجموعات بمحاورٍ مختلفةٍ وأدوارٍ متنوّعة."
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     ٩ — تحقّق السلامة
     ══════════════════════════════════════════════════════════════════════ */
  function verifyIntegrity() {
    const issues = [];
    const cfg = CFG();

    /* عدد العلامات */
    if (REGISTRY.length !== 19)
      issues.push("عدد العلامات " + REGISTRY.length + " والمتوقَّع ١٩");

    /* تفرّد المعرّفات والأولويّات */
    const ids = {}, prios = {};
    REGISTRY.forEach(function (f) {
      if (ids[f.id]) issues.push("علامة مكرّرة: " + f.id);
      ids[f.id] = true;
      if (prios[f.priority]) issues.push("أولويّة مكرّرة: " + f.priority);
      prios[f.priority] = true;
      if (typeof f.test !== "function") issues.push("شرط مفقود: " + f.id);
    });

    /* الأولويّات متّصلةٌ من ١ إلى ١٩ */
    for (let p = 1; p <= REGISTRY.length; p++) {
      if (!prios[p]) issues.push("أولويّة ناقصة: " + p);
    }

    /* قواعد التنافي تشير إلى علاماتٍ موجودة */
    MUTUALLY_EXCLUSIVE.forEach(function (rule) {
      rule.pair.forEach(function (id) {
        if (!byId(id)) issues.push("قاعدة تنافٍ تشير إلى علامةٍ غير موجودة: " + id);
      });
      if (rule.pair.indexOf(rule.keep) === -1)
        issues.push("قاعدة تنافٍ تُبقي علامةً خارج الزوج: " + rule.keep);
    });

    /* مواعيد التدخّل تغطّي كل علامات المستويين الأوّل والثاني */
    REGISTRY.filter(function (f) { return f.level <= 2 && f.toCoach; }).forEach(function (f) {
      if (!ALERT_WINDOWS[f.id]) issues.push("موعد تدخّلٍ مفقود: " + f.id);
    });

    /* أسماء العلامات موجودة في burn-strings إن كان محمّلًا */
    const S = (typeof window !== "undefined") ? window.BURN_STRINGS : null;
    if (S && S.admin && S.admin.flagNames) {
      REGISTRY.forEach(function (f) {
        if (!S.admin.flagNames[f.id]) issues.push("اسم عربيٌّ مفقود للعلامة: " + f.id);
      });
    }

    /* الكتل الخاصّة الثلاث معرَّفةٌ في الـconfig */
    ["SPC_BEYOND", "SPC_NOTBURN", "SPC_GAP"].forEach(function (b) {
      const found = (cfg.specialBlocks || []).some(function (x) { return x.id === b; });
      if (!found) issues.push("كتلةٌ خاصّةٌ غير معرَّفةٍ في الـconfig: " + b);
    });

    return { ok: issues.length === 0, issues: issues, count: REGISTRY.length };
  }

  /* ══════════════════════════════════════════════════════════════════════
     التصدير
     ══════════════════════════════════════════════════════════════════════ */
  return {
    evaluate: evaluate,
    environmentBlock: environmentBlock,
    coachRow: coachRow,
    cohortSummary: cohortSummary,
    verifyIntegrity: verifyIntegrity,
    byId: byId,
    alertWindow: _alertWindow,
    REGISTRY: REGISTRY,
    MUTUALLY_EXCLUSIVE: MUTUALLY_EXCLUSIVE
  };
});

if (typeof window !== "undefined") {
  console.log("✅ BURN_FLAGS جاهز — ١٩ علامة");
}
