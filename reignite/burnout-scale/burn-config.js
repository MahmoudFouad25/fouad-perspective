/* ════════════════════════════════════════════════════════════════════════
   burn-config.js — العمود الفقري لمقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-config.js

   بيانات نقيّة: لا منطق، لا عرض، لا HTML، لا Firestore.
   يُقرأ في زمن التشغيل من GitHub Pages، وكل ملفّات المقياس تشتقّ منه.

   ──────────────────────────────────────────────────────────────────────
   مساحة الأسماء BURN_* منفصلة تمامًا عن:
     • AXES_*  (مقياس المحاور العام — three-axes و reignite/scale)
     • FOUAD_* (مقياس المرايا)
     • RAPID_* (المقياس السريع)
     • CROSS_* (مقياس المرايا × المحاور)
   حتى تتعايش الملفّات في الصفحة الواحدة بلا أيّ تصادم.

   ──────────────────────────────────────────────────────────────────────
   القاعدة الحاكمة (مُوَرَّثة من معمار المقاييس السابقة):
     الربط بالهويّة (axisId / dimId / state / level) لا بالأرقام ولا بالمواضع.

   ──────────────────────────────────────────────────────────────────────
   البنية:
     • ثلاثة محاور (اتجاه الطاقة من النفس)، كلٌّ بثلاثة أبعاد.
     • كل بُعد على طيفٍ رباعيّ: اتزان / إفراط / تفريط / تذبذب.
     • ثلاثة مستويات إحساس (خطّ العافية)، كلٌّ يطابق محورًا:
         التماسك ↔ التوقّد ، الحيوية ↔ الامتلاء ، الانتماء ↔ الحضور.
     • خمس طبقات على ستّ جرعات، بتفريعٍ يُقفَل بعد الجرعة الثانية.

   ──────────────────────────────────────────────────────────────────────
   ملاحظة على العتبات:
     كل رقم في الخوارزمية مجموعٌ هنا في thresholds. لا رقم سحريّ في المحرّك.
     الأرقام الحاليّة مبنيّة على منطق التصميم لا على بيانات ميدانيّة،
     وتُعاير بعد أوّل ٥٠ استجابة فعليّة — ومن هذا الملفّ وحده.
   ════════════════════════════════════════════════════════════════════════ */

const BURN_CONFIG = {

  /* ══════════════════════════════════════════════════════════════════════
     ٠ — البطاقة التعريفيّة
     ══════════════════════════════════════════════════════════════════════ */
  meta: {
    version: "1.0.0",
    module: "reignite-burnout",
    nameInternal: "مقياس الاحتراق المحوري",
    nameClient: "بوصلتك",
    program: "Reignite",
    collection: "reignite_burnout_results",
    cssPrefix: "bn-",
    rootId: "burn-scale-root",

    totalAxes: 3,
    totalDimensions: 9,
    totalStates: 4,
    totalRoles: 6,
    totalDoses: 6,

    itemsWritten: 143,          // كل البنود المكتوبة في burn-items.js
    itemsShown: 88,             // ما يراه مشاركٌ واحد (بعد التفريع)
    blocksTotal: 69,            // كتل النصّ (٦٦ + ٣ للحالات الخاصّة)
    practicesBase: 27,          // ٩ أبعاد × ٣ حالات
    practicesVariants: 162,     // ٢٧ × ٦ أدوار

    estimatedMinutes: 36,
    estimatedDays: 6
  },

  /* ══════════════════════════════════════════════════════════════════════
     ١ — المحاور الثلاثة بأبعادها

     كل محور:
       id              معرّف الربط الداخليّ (قصير، يدخل في المفتاح النصّيّ)
       legacyId        المعرّف المقابل في axes-config.js القديم (للجسور فقط)
       name            اسم العرض
       coreQuestion    السؤال الجوهريّ
       energyDirection وجهة الطاقة في جملة
       wellbeingLevel  مستوى الإحساس الذي يطابقه على خطّ العافية
       coreFear        الخوف الأساسيّ تحته
       automaticFace   الوجه الآليّ حين يمسكه الخوف
       dimensions      أبعاده الثلاثة، لكلٍّ اسمه ومساره من المسارات التسعة
     ══════════════════════════════════════════════════════════════════════ */
  axes: [

    {
      id: "coh",
      legacyId: "tamasuk",
      name: "التماسك والاستقرار",
      shortName: "التماسك",
      coreQuestion: "هل أنا بخير؟",
      energyDirection: "صون الذات وتأمين بقائها واستقرار عالمها",
      wellbeingLevel: "vig",
      coreFear: "الندرة والأذى",
      coreTension: { poleA: "الاستقلاليّة", poleB: "الاحتياج" },
      automaticFace: {
        id: "mechanicity",
        name: "الآليّة",
        gist: "الحياة تُدار بالعادة بلا حضور"
      },
      dimensions: [
        { id: "d1", legacyId: "jasad",   name: "رعاية الجسد",    order: 1, path: { id: "sukna",   name: "السُّكنى" } },
        { id: "d2", legacyId: "mawarid", name: "تأمين الموارد",  order: 2, path: { id: "kafaf",   name: "الكَفَاف" } },
        { id: "d3", legacyId: "tanzim",  name: "التنظيم الذاتيّ", order: 3, path: { id: "hilm",    name: "الحِلم"   } }
      ]
    },

    {
      id: "vit",
      legacyId: "hayawiyya",
      name: "الحيوية والتجدد",
      shortName: "الحيوية",
      coreQuestion: "هل أنا حيّ؟",
      energyDirection: "الاتصال المكثّف والاشتعال الداخليّ والتجدّد بالتجربة",
      wellbeingLevel: "ful",
      coreFear: "الانطفاء واللاقيمة",
      coreTension: { poleA: "الاندماج", poleB: "التفرّد" },
      automaticFace: {
        id: "reduction",
        name: "الاختزال",
        gist: "النفس والناس تُختزل إلى وظائف وأدوار"
      },
      dimensions: [
        { id: "d1", legacyId: "ishtial",  name: "الاشتعال والحضور", order: 1, path: { id: "yaqaza",   name: "اليقظة"  } },
        { id: "d2", legacyId: "tabir",    name: "التعبير والأثر",   order: 2, path: { id: "bayan",    name: "البَيَان" } },
        { id: "d3", legacyId: "tajaddud", name: "التجدّد والتحوّل",  order: 3, path: { id: "tajaddud", name: "التجدّد" } }
      ]
    },

    {
      id: "bel",
      legacyId: "intima",
      name: "الانتماء والمشاركة",
      shortName: "الانتماء",
      coreQuestion: "هل لي مكان؟",
      energyDirection: "المجموعة والمكانة والدور والإسهام فيما هو أكبر من الذات",
      wellbeingLevel: "prs",
      coreFear: "النبذ والهجران",
      coreTension: { poleA: "الانسجام", poleB: "الأصالة" },
      automaticFace: {
        id: "positioning",
        name: "التموضع",
        gist: "تعلّقٌ بالأدوار، وارتباطٌ بالناس عبر التصوّر لا الإحساس"
      },
      dimensions: [
        { id: "d1", legacyId: "qiraa",  name: "قراءة الحقل",        order: 1, path: { id: "mizan",   name: "الميزان"  } },
        { id: "d2", legacyId: "makana", name: "المكانة والدور",     order: 2, path: { id: "taassul", name: "التأصّل"  } },
        { id: "d3", legacyId: "ishaam", name: "الإسهام والمسؤولية", order: 3, path: { id: "fayd",    name: "الفَيْض"  } }
      ]
    }

  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٢ — مستويات الإحساس (خطّ العافية)

     ثلاثة مستويات محسوسة، كلٌّ يطابق محورًا.
     التطابق بين المستوى الأشدّ نزيفًا ومستوى المحور الرئيسيّ = اتّساق (المحترق).
     عدم التطابق = بذرة المجوّع أو المكبوت.

     المصطلح محروس: الخطّ اسمه «العافية»، والمحور اسمه «الحيوية».
     «خطّ الحيوية» خطأ لا يُسمح به في أيّ مادّة.
     ══════════════════════════════════════════════════════════════════════ */
  wellbeingLevels: [
    { id: "vig", name: "التوقّد",  domain: "الطاقة",  axisId: "coh", color: "#38bdf8" },
    { id: "prs", name: "الحضور",  domain: "العلاقة", axisId: "bel", color: "#fbbf24" },
    { id: "ful", name: "الامتلاء", domain: "المعنى",  axisId: "vit", color: "#e2e8f0" }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٣ — حالات الطيف الأربع

     الإفراط والتفريط حالتان مستقلّتان لا طرفا مسطرة واحدة.
     والتذبذب يُقاس صراحةً ببندٍ خاصّ، ولا يُستنتج من ارتفاع الطرفين وحدهما.
     ══════════════════════════════════════════════════════════════════════ */
  spectrumStates: [
    { id: "bal", name: "اتزان",  key: "balance",     inPractices: false, color: "#10b981" },
    { id: "exc", name: "إفراط",  key: "excess",      inPractices: true,  color: "#fbbf24" },
    { id: "def", name: "تفريط",  key: "deficit",     inPractices: true,  color: "#3b82f6" },
    { id: "osc", name: "تذبذب",  key: "oscillation", inPractices: true,  color: "#a78bfa" }
  ],

  /* حالة خامسة عرضيّة لا قياسيّة: ميلٌ خفيف لم يبلغ نزيفًا.
     تأخذ ممارسة الحالة التي تميل إليها، بنصف الجرعة، وبنصٍّ افتتاحيّ مختلف. */
  tiltState: { id: "tlt", name: "ميل خفيف", practiceDose: "half" },

  /* ══════════════════════════════════════════════════════════════════════
     ٤ — أنواع الاحتراق الثلاثة

     تُحسب داخليًّا من الجرعة الأولى، وتُخزَّن، ولا تُعلَن للمشارك في النتيجة.
     تُحسم في القاع (الأسبوع السابع) بعد أن يكون قد عاش الفرق بنفسه.
     ══════════════════════════════════════════════════════════════════════ */
  burnoutTypes: {
    burnt: {
      id: "burnt", name: "المحترق",
      mechanism: "المحور الرئيسيّ يلفّ ساخنًا بالخوف. الصرف أعلى من الاسترداد.",
      mark: "التعب يعود بعد الراحة بيومين.",
      question: "هل أُكمل قدر هذا الضغط؟",
      treatment: "إطفاء الماكينة، والعمل على الافتراض الذي يشغّلها."
    },
    starved: {
      id: "starved", name: "المجوّع",
      mechanism: "المحور يعمل ويبحث عن وقوده، والبيئة لا تقدّم ما يُسجَّل على قائمته الداخليّة.",
      mark: "ليس متعبًا، لكنّه باهتٌ وكل شيء عنده عاديّ.",
      question: "أين النار التي كانت معي؟",
      treatment: "إدخال الغذاء المحوريّ قصدًا أو تغيير البيئة. الراحة تزيد الجوع."
    },
    repressed: {
      id: "repressed", name: "المكبوت",
      mechanism: "محورٌ مدفونٌ يصرخ، والرئيسيّ يحمل حِمل اثنين فينهار.",
      mark: "النجاح الكامل مع فراغٍ جوهريّ.",
      question: "أنا وصلت، فما الذي ينقص؟",
      treatment: "نبشٌ واستعادةٌ للمحور المكبوت بجرعاتٍ صغيرةٍ آمنة."
    }
  },

  /* تصنيفات درجة الكبت (تحدّد كتلة بذرة المكبوت في شاشة النتيجة) */
  repressionClasses: [
    { id: "loud",  name: "مكبوت صاخب", blockId: "REP_LOUD"  },
    { id: "quiet", name: "مكبوت هادئ", blockId: "REP_QUIET" },
    { id: "sec2",  name: "فرعيّ ثانٍ",  blockId: "REP_SEC2"  }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٥ — الأدوار المهنيّة الستّة

     الإيكوسيستم: كل مفهوم وكل ممارسة بستّ نسخ سياقيّة.
     النسخة السياقيّة تغيّر المثال والمفردات، لا المفهوم.
     ══════════════════════════════════════════════════════════════════════ */
  roles: [
    {
      id: "lead", name: "قائد",
      profile: "يدير فريقًا والمعوّل عليه.",
      pain: "الحِمل الذي لا يُشارَك.",
      fear: "أن يبدو غير متحكّم.",
      trigger: "قرارٌ اتُّخذ من دونه.",
      phrase: "كل حاجة بتقف عليّا."
    },
    {
      id: "mgr", name: "مدير",
      profile: "عالقٌ بين طرفين.",
      pain: "التمزّق.",
      fear: "أن يخسر طرفًا.",
      trigger: "لحظة حسمٍ لا مفرّ منها.",
      phrase: "أنا مش صاحب القرار وأنا اللي بادفع تمنه."
    },
    {
      id: "found", name: "صاحب مشروع",
      profile: "يلبس كل القبّعات.",
      pain: "أنّ المشروع كبر وهو لم يكبر معه.",
      fear: "أن ينهار ما بناه لو سلّم.",
      trigger: "شيءٌ فوّضه فخرج ناقصًا.",
      phrase: "لو مانا عملتهاش، مش هتتعمل."
    },
    {
      id: "free", name: "مستقلّ",
      profile: "يعمل وحده.",
      pain: "العزلة وغياب الحدود.",
      fear: "أن يجفّ العمل.",
      trigger: "عرض عملٍ في وقتٍ مشغول.",
      phrase: "مش قادر أرفض."
    },
    {
      id: "sale", name: "مبيعات",
      profile: "يواجه الرفض والأرقام.",
      pain: "أنّ قيمته تُعاد حسابها كل شهر.",
      fear: "أن يخسر الرقم.",
      trigger: "صفقةٌ أُغلقت في وجهه.",
      phrase: "بابدأ من الصفر كل شهر."
    },
    {
      id: "hr", name: "موارد بشرية",
      profile: "يحمل مشاكل الجميع.",
      pain: "أن يكون الصندوق الذي لا صندوق له.",
      fear: "أن يفشل في الحلّ.",
      trigger: "نزاعٌ مستعصٍ.",
      phrase: "كل الناس بتيجي لي، وأنا بروح لمين؟"
    }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٦ — الطبقات الخمس
     ══════════════════════════════════════════════════════════════════════ */
  layers: [
    {
      id: 1, key: "direction", name: "اتجاه الطاقة",
      measures: "ترتيب المحاور الثلاثة: رئيسيّ وفرعيّ ومكبوت",
      blocks: ["action", "longing", "critique"],
      branched: false, written: 33, shown: 33
    },
    {
      id: 2, key: "dimensions", name: "احتراق الأبعاد",
      measures: "أيّ بُعدٍ ينزف وبأيّ شكل",
      blocks: ["spectrum", "discrimination", "pulse"],
      branched: true, written: 45, shown: 17
    },
    {
      id: 3, key: "environment", name: "البيئة",
      measures: "هل بين ما حولك وبين اتجاهك توافق",
      blocks: ["env"],
      branched: true, written: 27, shown: 9
    },
    {
      id: 4, key: "functionality", name: "الوظيفية والوجه الآليّ",
      measures: "هل تمرّ الطاقة في الفعل، وكيف يعمل الوجه الآليّ",
      blocks: ["slf", "fue", "agn", "dbl", "aut"],
      branched: "partial", written: 21, shown: 15
    },
    {
      id: 5, key: "wellbeing", name: "نبضة الإحساس",
      measures: "التوقّد والحضور والامتلاء — وأوّل نقطةٍ على خطّ العافية",
      blocks: ["wbg"],
      branched: false, written: 9, shown: 9
    }
  ],

  /* مؤشّرات الطبقة الرابعة الأربعة — تُقاس مستقلّةً ولا تُجمع في درجةٍ واحدة */
  functionalityIndices: [
    { id: "slf", name: "الوظيفية الذاتيّة", gist: "هل تتحرّك فيما يخصّك أنت",         shown: true  },
    { id: "fue", name: "نقاء الوقود",       gist: "هل تتحرّك بالخوف أم بغيره",        shown: true  },
    { id: "agn", name: "الفاعليّة",          gist: "هل تختار أم تُساق",                shown: true  },
    { id: "dbl", name: "الحمل المضاعف",     gist: "هل تعوّض غيابًا بمبالغة",           shown: false }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٧ — الجرعات الستّ

     نقطة التفريع: بعد إغلاق الجرعة الثانية. يُحسب المحور الرئيسيّ،
     ويُقفَل، ولا يُعاد حسابه أبدًا — حتى لو رجع المشارك وعدّل.
     ══════════════════════════════════════════════════════════════════════ */
  doses: [
    { id: 1, day: "الأحد",    blocks: ["filter", "action"],                          items: 19, minutes: 6.5, branched: false },
    { id: 2, day: "الاثنين",  blocks: ["longing", "critique"],                       items: 15, minutes: 6.0, branched: false, locksBranch: true },
    { id: 3, day: "الثلاثاء", blocks: ["spectrum", "discrimination", "pulse", "qc"], items: 18, minutes: 7.5, branched: true  },
    { id: 4, day: "الأربعاء", blocks: ["filter", "env", "qc"],                       items: 11, minutes: 5.0, branched: true  },
    { id: 5, day: "الخميس",   blocks: ["slf", "fue", "agn", "dbl", "aut"],           items: 15, minutes: 6.0, branched: "partial" },
    { id: 6, day: "الجمعة",   blocks: ["wbg", "qc"],                                 items: 10, minutes: 4.0, branched: false, computesResult: true }
  ],

  /* بوّابة التجريع الزمنيّة — مغلقة في الدفعة الأولى (أي: بلا تقييد).
     تُفعَّل بتغيير enabled إلى true، فلا تُفتح الجرعة التالية قبل مرور المهلة. */
  doseGating: {
    enabled: false,
    minHoursBetweenDoses: 16,
    resumeMidDose: false     // العودة من جهازٍ آخر تعيد الجرعة من أوّلها
  },

  /* ══════════════════════════════════════════════════════════════════════
     ٨ — المراسي السبعة

     تصف التكرار لا الشدّة، لأنّ سؤال الاحتراق سؤال نمطٍ لا سؤال حِدّة.
     ══════════════════════════════════════════════════════════════════════ */
  scale: {
    min: 1,
    max: 7,
    anchors: [
      { value: 1, label: "لا يحدث معي" },
      { value: 2, label: "نادرًا" },
      { value: 3, label: "أحيانًا قليلة" },
      { value: 4, label: "بين بين" },
      { value: 5, label: "كثيرًا" },
      { value: 6, label: "غالبًا" },
      { value: 7, label: "يحدث معي دائمًا" }
    ],
    endLabels: { low: "لا يحدث معي", high: "دائمًا" },
    reverseFormula: 8      // درجة البند المعكوس = 8 − القيمة
  },

  /* ══════════════════════════════════════════════════════════════════════
     ٩ — العتبات والثوابت الرقميّة

     ★ كل رقمٍ في الخوارزمية موجودٌ هنا. لا رقم سحريّ في المحرّك.
     ★ الأرقام الحاليّة تصميميّة لا ميدانيّة، وتُعاير بعد أوّل ٥٠ استجابة.
     ══════════════════════════════════════════════════════════════════════ */
  thresholds: {

    /* ─── الخطوة ١: ترتيب المحاور ─── */
    ranking: {
      exclusionActionMax:   3.5,   // يُستبعد من الرئاسة إن كان A أقلّ من
      exclusionLongingMin:  5.5,   // مع L أعلى من  (منع خلط الاشتياق بالهيمنة)
      tieGap:               0.5,   // فرقٌ أقلّ من هذا بين أعلى A والذي يليه ← سؤال فارز
      repressionConfirm: {
        critiqueMin: 5.0,          // C ≥  → تأكيد الكبت
        gapMin:      1.5,          // G ≥  → تأكيد الكبت
        actionMax:   3.0           // A ≤  → تأكيد الكبت
      },
      repressionWeights: {         // REP = (C/7)*wC + (G/3)*wG + ((7−A)/7)*wA
        critique: 0.4,
        gap:      0.4,
        action:   0.2
      },
      repressionClassMin: {
        loud:  0.65,
        quiet: 0.40
      }
    },

    /* ─── الخطوة ٢: تصنيف الأبعاد على الطيف ─── */
    spectrum: {
      oscDirectMin:      5.0,   // O ≥            → تذبذب مباشرةً (يعلو على الجميع)
      oscIndirectEF:     4.5,   // E و F كلاهما ≥ مع
      oscIndirectO:      3.5,   // O ≥            → تذبذب بتأكيدٍ غير مباشر
      excessDiffMin:     1.5,   // E − F ≥        → إفراط
      deficitDiffMin:    1.5,   // F − E ≥        → تفريط
      balanceMin:        5.0,   // B ≥  مع
      balanceMaxOther:   3.5,   // max(E,F,O) ≤   → اتزان
      severityBoostDisc: 1.0,   // متوسّط بندَي التمييز ≥ 5.5 ← تُرفع شدّة كل الأبعاد بـ
      discBoostMin:      5.5,
      severityBoostOsc:  0.5,   // التصنيف تذبذب ← تُرفع شدّة هذا البُعد بـ
      targetTieGap:      0.4,   // تقاربٌ أقلّ من هذا ← الأولويّة للمتذبذب، وإلّا للبُعد الثالث
      axisSeverityHigh:  2.5,   // شدّة المحور الكليّة ≥ → مرتفعة
      axisSeverityLow:   1.0    // شدّة المحور الكليّة <  → منخفضة
    },

    /* ─── الخطوة ٣: البيئة ───
       ENV = (8 − HNG) × envWeightHunger + IMP × envWeightImprovement */
    environment: {
      weightHunger:      0.8,
      weightImprovement: 0.2,
      feedingMin:        5.0,   // ENV ≥ → مُغذّية
      starvingMax:       3.4,   // ENV ≤ → مُجوِّعة
      receptionBlocked:  5.0,   // RCV ≥ → قناة الاستقبال مسدودة
      receptionOpen:     3.5    // RCV ≤ → القناة سالكة (والغياب من البيئة نفسها)
    },

    /* ─── الخطوة ٤: الوظيفية والوجه الآليّ ─── */
    functionality: {
      slfSoundMin:     5.0,   // وظيفيّة سليمة
      slfStalledMax:   3.4,   // وظيفيّة معطّلة
      fueCleanMin:     5.0,   // وقود نظيف
      fueToxicMax:     3.4,   // إدمان التحفيز بالخوف
      agnPresentMin:   5.0,
      agnAbsentMax:    3.4,
      dblFullWeight:   5.5,   // يدخل في ميل المكبوت بوزنٍ كامل
      dblHalfWeight:   4.0,   // بوزنٍ نصفيّ
      autShowMin:      5.0,   // يُعرَض الوجه الآليّ في شاشة النتيجة
      autDeferMin:     3.5,   // يُؤجَّل إلى الأطلس
      horizonCollapse: 6.0    // بند «لا أعرف ماذا أريد» ≥ → انهيار الأفق
    },

    /* ─── الخطوة ٥: خطّ العافية والمعايرة ─── */
    wellbeing: {
      calibrationMin: 0.7,    // معامل المعايرة الفرديّ يُقصّ عند
      calibrationMax: 1.3,
      changeSignificant: 0.5, // فرقٌ أقلّ منه بين أسبوعين = ثبات
      lowestCritical: 2.5     // كل المستويات ≤ → ضمن شرط تجاوز نطاق الأداة
    },

    /* ─── الخطوة ٦: الميل النوعيّ ─── */
    typeLean: {
      weightDecisive:  5,     // دليلٌ حاسم
      weightConfirm:   3,     // دليلٌ مؤكِّد
      weightSupport:   1,     // دليلٌ مرجِّح
      dominantMinPct:  50,    // نوعٌ غالب
      compositeMaxGap: 15,    // فرقٌ أقلّ من هذا بين أعلى نوعين ← مركّب
      unresolvedGap:   12     // الثلاثة داخل هذا المدى ← غير محسوم، يُترك للقاع
    },

    /* ─── قاعدة الأسبقية ───
       التنظيم الذاتيّ المتذبذب بشدّةٍ عالية يُقدَّم على البُعد الهدف،
       لأنّه البُعد الذي تقوم عليه القدرة على الممارسة نفسها. */
    precedence: {
      axis:        "coh",
      dim:         "d3",
      state:       "osc",
      severityMin: 3.0,
      deferTargetWeeks: 2
    },

    /* ─── ضبط الجودة ─── */
    qualityCheck: {
      pairExpectedSum:   8,
      pairMaxDeviation:  2,    // انحرافٌ أقلّ من هذا في زوجين أو أكثر ← علامة
      pairsNeeded:       2,
      flatRangeMax:      1,    // مدى جرعةٍ كاملة ≤ ← علامة
      fastResponseMs:    4000, // متوسّط زمن جرعةٍ أقلّ من ← علامة
      streakMax:         12,   // أكثر من هذا العدد متتاليًا بنفس القيمة ← علامة
      reviewItemsCount:  5     // عدد البنود المعروضة عند قبول المراجعة
    },

    /* ─── العرض ─── */
    display: {
      maxFlags:          3,    // حدٌّ أقصى للعلامات في شاشة النتيجة
      resultScreens:     3,
      accuracyCheckWeek: 2,    // أسبوع سؤال «الخريطة دي قريبة منك قد إيه»
      accuracyMinScore:  6     // أقلّ من هذا ← يُفتح مسار تحقّقٍ مع المدرّب
    },

    /* ─── الصلاحية ─── */
    validity: {
      months: 6,
      minAge: 20
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     ١٠ — المفتاح النصّيّ

     عشر خاناتٍ مفصولة بنقطة، تحدّد النتيجة بالكامل.
     يُخزَّن في الوثيقة، فيُعاد بناء التقرير منه في أيّ وقتٍ بلا إعادة حساب،
     ويتفرّع عليه الأطلس والمسار لاحقًا في البرنامج.

     مثال:  COH.BEL.LOUD.D3.OSC.STARVE.MATCH.TOXIC.YES.LEAD
     ══════════════════════════════════════════════════════════════════════ */
  textKey: {
    separator: ".",
    segments: [
      { pos: 1,  key: "axis",    label: "المحور الرئيسيّ", values: ["COH", "VIT", "BEL"] },
      { pos: 2,  key: "sec",     label: "المحور الفرعيّ",  values: ["COH", "VIT", "BEL"] },
      { pos: 3,  key: "rep",     label: "تصنيف الكبت",     values: ["LOUD", "QUIET", "SEC2"] },
      { pos: 4,  key: "dim",     label: "البُعد الهدف",     values: ["D1", "D2", "D3"] },
      { pos: 5,  key: "cls",     label: "تصنيف الطيف",     values: ["EXC", "DEF", "OSC", "TLT"] },
      { pos: 6,  key: "env",     label: "تصنيف البيئة",    values: ["FEED", "STARVE", "BLOCK", "BOTH"] },
      { pos: 7,  key: "match",   label: "تطابق المستوى",   values: ["MATCH", "NOMATCH"] },
      { pos: 8,  key: "move",    label: "حالة الحركة",     values: ["TOXIC", "STALL", "EFFIC", "HORIZ", "SOUND"] },
      { pos: 9,  key: "aut",     label: "الوجه الآليّ",     values: ["YES", "NO"] },
      { pos: 10, key: "role",    label: "الدور المهنيّ",    values: ["LEAD", "MGR", "FOUND", "FREE", "SALE", "HR"] }
    ]
  },

  /* ══════════════════════════════════════════════════════════════════════
     ١١ — خريطة الكتل النصّيّة

     ٦٩ كتلة: ٦٦ في المسار العاديّ، و٣ للحالات الخاصّة.
     كل قسمٍ يستدعي كتلةً واحدةً بمفتاحه.
     ══════════════════════════════════════════════════════════════════════ */
  blockMap: [
    { section: 1,  id: "GRD_00",              key: null,             screen: 1, count: 1,  name: "الأرض" },
    { section: 2,  id: "AXS_{axis}",          key: "axis",           screen: 1, count: 3,  name: "اتجاه طاقتك" },
    { section: 3,  id: "SEC_{sec}",           key: "sec",            screen: 1, count: 3,  name: "المحور الفرعيّ" },
    { section: 4,  id: "REP_{rep}",           key: "rep",            screen: 1, count: 3,  name: "بذرة المكبوت" },
    { section: 5,  id: "TGT_{axis}_{dim}_{cls}", key: "axis+dim+cls", screen: 2, count: 36, name: "بُعدك الهدف" },
    { section: 6,  id: "ENV_{env}",           key: "env",            screen: 2, count: 4,  name: "بيئتك" },
    { section: 7,  id: "BRG_{axis}_{match}",  key: "axis+match",     screen: 2, count: 6,  name: "الجسر" },
    { section: 8,  id: "MOV_{move}",          key: "move",           screen: 3, count: 5,  name: "كيف تتحرّك" },
    { section: 9,  id: "MIR_{axis}",          key: "axis",           screen: 3, count: 3,  name: "مرآتك اليوميّة", conditional: "aut" },
    { section: 10, id: "WBL_00",              key: null,             screen: 3, count: 1,  name: "خطّ العافية" },
    { section: 11, id: "PRC_00",              key: null,             screen: 3, count: 1,  name: "إطار الممارسة" }
  ],

  specialBlocks: [
    { id: "SPC_BEYOND",  flag: "FLG_BEYOND_SCOPE",     name: "تجاوز نطاق الأداة", replacesScreens: true },
    { id: "SPC_NOTBURN", flag: "FLG_NOT_BURNOUT",      name: "ليس احتراقًا",       replacesScreens: true },
    { id: "SPC_GAP",     flag: "FLG_UNEXPLAINED_GAP",  name: "فجوةٌ غير مفسَّرة",   replacesScreens: true }
  ],

  /* الشاشات الثلاث ونصوص أزرار الانتقال بينها */
  resultScreens: [
    { id: 1, name: "من أنت",             sections: [1, 2, 3, 4],      nextLabel: "أرني أين أنزف" },
    { id: 2, name: "أين تنزف ولماذا",     sections: [5, 6, 7],         nextLabel: "أرني ما أفعله" },
    { id: 3, name: "ما التالي",           sections: [8, 9, 10, 11],    nextLabel: "فهمت" }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ١٢ — النبضة الأسبوعيّة

     تُعاد تسع مرّات على مدى الرحلة. البنود لا تتغيّر أبدًا — لا صياغةً
     ولا ترتيبًا ولا مراسي — لأنّ أيّ تغييرٍ يكسر قابليّة المقارنة،
     والقيمة كلّها في المقارنة.
     ══════════════════════════════════════════════════════════════════════ */
  pulse: {
    fullWeeks:  [0, 4, 9],
    shortWeeks: [1, 2, 3, 5, 6, 7, 8],
    totalWeeks: 9,
    day: "الخميس",
    windowHours: 48,
    reminderCount: 1,

    shortItems: [
      "L5_WBG_VIG_01", "L5_WBG_VIG_02",
      "L5_WBG_PRS_01", "L5_WBG_PRS_02",
      "L5_WBG_FUL_01", "L5_WBG_FUL_02"
    ],

    /* الأسبوعان السابع والثامن هما القاع والدوران: هبوط الخطّ فيهما
       متوقَّعٌ ومقصود، ولا يُقرأ تراجعًا، ويُقارَن بالتاسع لا بما قبله. */
    expectedDipWeeks: [7, 8]
  },

  /* ══════════════════════════════════════════════════════════════════════
     ١٣ — الحدود الثمانية للاستعمال

     تُكتب صراحةً هنا لأنّ الأداة التي لا تعرف حدودها تتمدّد حتى تفسد.
     ══════════════════════════════════════════════════════════════════════ */
  usageLimits: [
    "أداة احتراقٍ مهنيّ لا أداة إكلينيكيّة. لا تشخّص اكتئابًا ولا قلقًا ولا اضطرابًا.",
    "لا تُستعمل في التوظيف ولا التقييم ولا الترقية ولا المكافآت ولا إنهاء الخدمة.",
    "للراشدين العاملين فوق العشرين. غير مصمَّمة لغير العاملين ولا للطلّاب.",
    "لا تُستعمل بمعزلٍ عن البرنامج. النتيجة بلا مسارٍ ولا متابعةٍ كشفٌ بلا تعافٍ.",
    "صلاحيّتها ستّة أشهر. بعدها تُعاد الطبقات الأربع الأولى.",
    "نتيجةٌ واحدة لكل مشاركٍ في الدفعة. لا تُعاد أثناء البرنامج.",
    "النتيجة خريطةٌ قابلةٌ للمراجعة لا تشخيصٌ نهائيّ.",
    "لا تُستعمل مع من هو في أزمةٍ حادّة خلال الشهر الأخير — تُؤجَّل أسبوعين."
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ١٤ — الهويّة البصريّة (تُقرأ في burn-render.js و burn-scale.html)
     ══════════════════════════════════════════════════════════════════════ */
  theme: {
    bg:      "#0f172a",
    bg2:     "#1a2332",
    card:    "#16202e",
    line:    "#2a3850",
    text:    "#e2e8f0",
    muted:   "#94a3b8",
    blue:    "#3b82f6",
    green:   "#10b981",
    gold:    "#fbbf24",
    purple:  "#a78bfa",
    serif:   "'Amiri', serif",
    sans:    "'Tajawal', sans-serif"
  }

};

/* ════════════════════════════════════════════════════════════════════════
   دوالّ بحثٍ صغيرة — قراءةٌ فقط، لا حساب. تُختصر بها آلافُ الأسطر لاحقًا.
   (هي ملحقٌ بالبيانات لا منطقٌ عليها: مجرّد وصولٍ بالهويّة.)
   ════════════════════════════════════════════════════════════════════════ */
BURN_CONFIG.getAxis = function (axisId) {
  return BURN_CONFIG.axes.find(function (a) { return a.id === axisId; }) || null;
};

BURN_CONFIG.getDim = function (axisId, dimId) {
  var ax = BURN_CONFIG.getAxis(axisId);
  if (!ax) return null;
  return ax.dimensions.find(function (d) { return d.id === dimId; }) || null;
};

BURN_CONFIG.getState = function (stateId) {
  return BURN_CONFIG.spectrumStates.find(function (s) { return s.id === stateId; }) || null;
};

BURN_CONFIG.getLevel = function (levelId) {
  return BURN_CONFIG.wellbeingLevels.find(function (l) { return l.id === levelId; }) || null;
};

BURN_CONFIG.getRole = function (roleId) {
  return BURN_CONFIG.roles.find(function (r) { return r.id === roleId; }) || null;
};

BURN_CONFIG.getDose = function (doseId) {
  return BURN_CONFIG.doses.find(function (d) { return d.id === doseId; }) || null;
};

/* المستوى الذي يطابق محورًا، والمحور الذي يطابق مستوًى */
BURN_CONFIG.levelOfAxis = function (axisId) {
  var ax = BURN_CONFIG.getAxis(axisId);
  return ax ? ax.wellbeingLevel : null;
};

BURN_CONFIG.axisOfLevel = function (levelId) {
  var lv = BURN_CONFIG.getLevel(levelId);
  return lv ? lv.axisId : null;
};

/* مسار البُعد من المسارات التسعة */
BURN_CONFIG.pathOf = function (axisId, dimId) {
  var d = BURN_CONFIG.getDim(axisId, dimId);
  return d ? d.path : null;
};

/* ترجمة إلى معرّفات المقياس القديم (للجسور مع three-axes فقط، إن لزمت) */
BURN_CONFIG.toLegacyAxis = function (axisId) {
  var ax = BURN_CONFIG.getAxis(axisId);
  return ax ? ax.legacyId : null;
};

BURN_CONFIG.fromLegacyAxis = function (legacyId) {
  var ax = BURN_CONFIG.axes.find(function (a) { return a.legacyId === legacyId; });
  return ax ? ax.id : null;
};

/* ════════════════════════════════════════════════════════════════════════
   تصدير مزدوج: وحدات Node والمتصفّح — كنمط باقي مقاييس المنظور.
   ════════════════════════════════════════════════════════════════════════ */
if (typeof module !== "undefined" && module.exports) {
  module.exports = BURN_CONFIG;
}
if (typeof window !== "undefined") {
  window.BURN_CONFIG = BURN_CONFIG;
  console.log("✅ BURN_CONFIG جاهز — الإصدار " + BURN_CONFIG.meta.version +
              " · " + BURN_CONFIG.meta.totalAxes + " محاور · " +
              BURN_CONFIG.meta.totalDimensions + " أبعاد · " +
              BURN_CONFIG.meta.itemsShown + " بندًا معروضًا");
}
