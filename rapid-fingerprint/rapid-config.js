/* ════════════════════════════════════════════════════════════════════════
   rapid-config.js — البنية الحاكمة لمقياس البصمة السريع (Rapid Fingerprint)
   ────────────────────────────────────────────────────────────────────────
   المرجعان: METHODOLOGY.md (الأقسام ٢، ٣، ٥، ٧) و LENSES.md (القسم ٣ والملحق أ).
   هذا الملف بيانات نقيّة + دوالّ وصول صغيرة — لا منطق حسم (المنطق في
   rapid-engine.js) ولا عرض ولا Firestore.

   ما يحويه:
     ١) meta            — المجموعة والإصدار
     ٢) axes            — المحاور الثلاثة (مفاتيح الكود الداخلية)
     ٣) families        — العائلات الثلاث (بوابة أ = مرآة الدوافع مضغوطة)
     ٤) behaviors       — الأساليب الثلاثة (بوابة ب = مرآة السلوك مضغوطة)
     ٥) latinSquare     — المربع اللاتيني عائلة × أسلوب → طابع (فرض رياضي
                          مثبت في المنهجية §٢.٢ من كونفج المقياس الكبير)
     ٦) mirrors         — التقسيمات السبعة كاملة (مصدر اشتقاق الجبهات)
     ٧) signatures      — جدول التواقيع (الملحق أ) — مرجع المحرك للاشتقاق
                          الآلي: التقسيمات المختلفة بين طابعين = جبهاتهما
     ٨) frontLadder     — سلّم صلاحية الجبهات (LENSES §٣)
     ٩) narrowPairs     — الأزواج الضيقة السبعة ذات البطاريات الجاهزة
    ١٠) thresholds      — عتبات الحسم كلها (الموروث منها موثق بمصدره)
    ١١) truthDevice     — جهاز الصدق: أزواج الاتساق + بند الانتباه المموّه
    ١٢) confidence      — نموذج مؤشر الثقة الداخلي (لا يُعرض للعميل أبدًا)
    ١٣) flow            — تسلسل المراحل وأحجامها
    ١٤) دوالّ وصول      — typeFromCell / cellOfType / signatureOf /
                          frontsOfPair / pairKey / getStrengthMap
    ١٥) verifyIntegrity — فحص ذاتي للكونفج ضد نفسه وضد بنك البنود

   القاموس الأسود: كل المفاتيح والتسميات هنا داخلية للكود حصرًا —
   لا يصل للعميل رقم طابع ولا اسم طابع ولا اسم مرآة ولا اسم مسار.
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var RAPID_CONFIG = {};

  /* ════════════════ ١) التعريف ════════════════ */
  RAPID_CONFIG.meta = {
    version: 'v1',
    module: 'rapid-fingerprint',
    collection: 'rapid_fingerprint_results',
    defaultCourseId: 'rapid'
  };

  /* ════════════════ ٢) المحاور الثلاثة ════════════════
     مفاتيح الكود الموروثة من مقياس المحاور حرفيًّا — الترتيب ترتيب
     AXIS_IDS في axes-engine.js نفسه. */
  RAPID_CONFIG.axes = {
    order: ['tamasuk', 'hayawiyya', 'intima'],
    tamasuk:   { label: 'الحفظ والاستقرار' },
    hayawiyya: { label: 'الحيوية والتجدد' },
    intima:    { label: 'الانتماء والمشاركة' }
  };

  /* ════════════════ ٣) العائلات الثلاث — بوابة أ ════════════════
     مفاتيح cross-config نفسها (agency/bonding/certainty). */
  RAPID_CONFIG.families = {
    order: ['agency', 'bonding', 'certainty'],
    agency:    { label: 'الهمّة والعزيمة', types: ['1', '8', '9'] },
    bonding:   { label: 'الأنس والقرب',   types: ['2', '3', '4'] },
    certainty: { label: 'اليقين والبيان', types: ['5', '6', '7'] }
  };

  /* ════════════════ ٤) الأساليب الثلاثة — بوابة ب ════════════════ */
  RAPID_CONFIG.behaviors = {
    order: ['imtithal', 'hazm', 'insihab'],
    imtithal: { label: 'امتثال',  types: ['1', '2', '6'] },
    hazm:     { label: 'حزم',     types: ['3', '7', '8'] },
    insihab:  { label: 'انسحاب',  types: ['4', '5', '9'] }
  };

  /* ════════════════ ٥) المربع اللاتيني — قلب البصمة ════════════════
     عائلة × أسلوب → طابع واحد. الجدول منقول حرفيًّا من المنهجية §٢.٢
     (المثبت من mirrors-config.js الفعلي). verifyIntegrity يتحقق أنه
     متسق مع عضويات العائلات والأساليب أعلاه. */
  RAPID_CONFIG.latinSquare = {
    agency:    { imtithal: '1', hazm: '8', insihab: '9' },
    bonding:   { imtithal: '2', hazm: '3', insihab: '4' },
    certainty: { imtithal: '6', hazm: '7', insihab: '5' }
  };

  /* ════════════════ ٦) التقسيمات السبعة ════════════════
     كل مرآة تقسم التسعة إلى ثلاث ثلاثيات — منقولة من المنهجية §٢.١.
     m1 و m5 هما البوابتان (مستهلكتان في أ و ب)؛ m2/m3/m4 مصدر بنود
     التأكيد (stageC)؛ m6 محجوزة لبنود الجذر داخل البطاريات؛ m7 مستبعدة
     من البنود الباردة (مبدأ أمان الجرح) وتبقى في الجدول للاشتقاق فقط. */
  RAPID_CONFIG.mirrors = {
    order: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
    m1: { name: 'السلوك', divisions: {
      imtithal:  ['1', '2', '6'],
      hazm:      ['3', '7', '8'],
      insihab:   ['4', '5', '9']
    } },
    m2: { name: 'الانتباه', divisions: {
      dakhili:   ['1', '4', '5'],
      khariji:   ['2', '7', '8'],
      mutaarjih: ['3', '6', '9']
    } },
    m3: { name: 'المشاعر', divisions: {
      ihtiwa:    ['1', '3', '5'],
      taabir:    ['4', '6', '8'],
      tahwil:    ['2', '7', '9']
    } },
    m4: { name: 'النموذج الإدراكي', divisions: {
      tanfith:   ['1', '3', '6'],
      ibtikar:   ['4', '7', '8'],
      taqyim:    ['2', '5', '9']
    } },
    m5: { name: 'الدوافع', divisions: {
      agency:    ['1', '8', '9'],
      bonding:   ['2', '3', '4'],
      certainty: ['5', '6', '7']
    } },
    m6: { name: 'المعتقدات', divisions: {
      sayrura:   ['1', '3', '7'],
      maiyya:    ['2', '6', '9'],
      kaynuna:   ['4', '5', '8']
    } },
    m7: { name: 'الجروح', divisions: {
      ihtiyaj:   ['2', '5', '8'],
      ittisal:   ['3', '6', '9'],
      waqi:      ['1', '4', '7']
    } }
  };

  /* ════════════════ ٧) جدول التواقيع — الملحق أ حرفيًّا ════════════════
     المحرك لا يحفظ أطلس الأزواج — يحفظ هذا الجدول ويشتق منه جبهات أي
     زوج لحظيًّا (LENSES §٥). verifyIntegrity يتحقق أن كل توقيع متسق
     مع عضويات التقسيمات في §٦ (مصدر واحد للحقيقة، والجدولان يتراقبان). */
  RAPID_CONFIG.signatures = {
    '1': { m1: 'imtithal', m2: 'dakhili',   m3: 'ihtiwa', m4: 'tanfith', m5: 'agency',    m6: 'sayrura', m7: 'waqi'    },
    '2': { m1: 'imtithal', m2: 'khariji',   m3: 'tahwil', m4: 'taqyim',  m5: 'bonding',   m6: 'maiyya',  m7: 'ihtiyaj' },
    '3': { m1: 'hazm',     m2: 'mutaarjih', m3: 'ihtiwa', m4: 'tanfith', m5: 'bonding',   m6: 'sayrura', m7: 'ittisal' },
    '4': { m1: 'insihab',  m2: 'dakhili',   m3: 'taabir',  m4: 'ibtikar', m5: 'bonding',   m6: 'kaynuna', m7: 'waqi'    },
    '5': { m1: 'insihab',  m2: 'dakhili',   m3: 'ihtiwa', m4: 'taqyim',  m5: 'certainty', m6: 'kaynuna', m7: 'ihtiyaj' },
    '6': { m1: 'imtithal', m2: 'mutaarjih', m3: 'taabir',  m4: 'tanfith', m5: 'certainty', m6: 'maiyya',  m7: 'ittisal' },
    '7': { m1: 'hazm',     m2: 'khariji',   m3: 'tahwil', m4: 'ibtikar', m5: 'certainty', m6: 'sayrura', m7: 'waqi'    },
    '8': { m1: 'hazm',     m2: 'khariji',   m3: 'taabir',  m4: 'ibtikar', m5: 'agency',    m6: 'kaynuna', m7: 'ihtiyaj' },
    '9': { m1: 'insihab',  m2: 'mutaarjih', m3: 'tahwil', m4: 'taqyim',  m5: 'agency',    m6: 'maiyya',  m7: 'ittisal' }
  };

  /* ════════════════ ٨) سلّم صلاحية الجبهات — LENSES §٣ ════════════════
     يحكم ترتيب سحب بنود التأكيد من جبهات افتراق المرشح/المنافس:
       m1 مستهلكة في البوابة (لا بنود تأكيد لها)،
       ثم m4 (النموذج) فالأصلح، ثم m2 (الانتباه) بحذر، ثم m3 (المشاعر)
       بحذر أشد. m6 محجوزة لبنود الجذر داخل البطاريات، m7 مستبعدة. */
  RAPID_CONFIG.frontLadder = {
    confirmation: ['m4', 'm2', 'm3'],  // مصدر بنود stageC حصرًا
    reservedRoot: 'm6',                // تعمل في بنود الجذر فقط
    excluded: ['m7']                   // أمان الجرح — لا بنود باردة عليها
  };

  /* ════════════════ ٩) الأزواج الضيقة — بطاريات جاهزة ════════════════
     الأزواج ذات ٤ جبهات (الملحق أ، محسوبة آليًّا) — لكل منها بطارية
     كاملة في rapid-questions.duels. مفتاح الزوج: الرقمان تصاعديًّا
     بينهما شرطة. خمسة منها عابرة للبوابتين — لذلك كشف المنافس يعمل
     بالطريقتين معًا (thresholds.rival أدناه). */
  RAPID_CONFIG.narrowPairs = ['1-3', '2-9', '3-6', '4-5', '4-8', '6-9', '7-8'];

  /* ════════════════ ١٠) عتبات الحسم ════════════════ */
  RAPID_CONFIG.thresholds = {

    /* موروثان حرفيًّا من axes-engine.js — لا يُعدَّلان إلا بالمعايرة:
       DIFF_GAP: عتبة الفرق المعنوي على تجميعات ليكرت (الترتيب/التقارب).
       DIM_GAP: عتبة حسم موقع القوة على طيفها. */
    DIFF_GAP: 3,
    DIM_GAP: 2,

    /* البوابتان (أ، ب): البوابة تعتبر «متقاربة» إذا كان فارق الأعلى عن
       الثاني ≤ GATE_CLOSE_MARGIN — عندها الخلية المجاورة من جهة هذه
       البوابة مرشح منافس مشروع. */
    gate: {
      GATE_CLOSE_MARGIN: 3          // = DIFF_GAP
    },

    /* كشف المنافس — بالطريقتين معًا (قرار موثق):
       ١) قرب البوابات: خلايا الجوار (العائلة الثانية × الأسلوب الأول،
          والأولى × الثاني) لمن جاءت بوابته متقاربة.
       ٢) قرب مجموع الأدلة الكلي: أي طابع مجموعه ضمن EVIDENCE_MARGIN من
          المرشح — ضروري لأن خمسة أزواج ضيقة عابرة للبوابتين ولا يلتقطها
          الجوار وحده.
       وعند تعدد المنافسين: الأولوية لمن يكوّن مع المرشح زوجًا ضيقًا
       (بطارية جاهزة)، ثم الأعلى مجموعًا. */
    rival: {
      EVIDENCE_MARGIN: 4,
      NARROW_PAIR_PRIORITY: true
    },

    /* التأكيد (stageC): بين ٤ و٦ بنود من جبهات الافتراق بسلّم الصلاحية.
       كل بند يصوّت لطرف. الفارق الصافي (أصوات المرشح − أصوات المنافس)
       ≥ CONFIRM_NET يثبّت المرشح (مسار standard). أقل من ذلك أو انحياز
       للمنافس → المرحلة د. */
    confirmation: {
      MIN_ITEMS: 4,
      MAX_ITEMS: 6,
      CONFIRM_NET: 2
    },

    /* فض الاشتباك (stageD) — درجاته بترتيب المنهجية §٣/د، والتنقيط
       مبني على الميكانيكا الفعلية لبنود البنك (اختيار واحد من وصفين):
       المبارزات: ٣ بنود، المختار +DUEL_POINTS. بعد الثلاثة:
         ٣-٠ (صافي ٦) ≥ DUEL_NET → حسم بالمبارزة.
         ٢-١ (صافي ٢) < DUEL_NET → «بقي التقارب» → الجذور.
       الجذور: بندان أعمق فأثقل، المختار +ROOT_POINTS. الحسم بالمجموع
       التراكمي: |الصافي| ≥ RESOLVE_NET — فانقسام الجذور (١-١) وحده هو
       ما يُبقي التقارب ويستدعي التعرّف.
       التعرّف المرآتي: اختيار واحد إجباري = +RECOGNITION_WEIGHT — وزن
       يجعل |الصافي| بعده ≥ RESOLVE_NET حتميًّا من أي نقطة سابقة، فيستحيل
       رياضيًّا خروج المحرك بغير طابع واحد. وللاحتياط النظري المطلق:
       كسر حتمي بمجموع الأدلة الخام ثم بأسبقية خلية المربع للمرشح.
       الأزواج بلا بطارية (المنافس من قرب الأدلة خارج السبعة الضيقة):
       تصعيدها المباشر هو التعرّف المرآتي — بنك الأصوات التسعة صُمّم
       ليغطي أي زوج من الـ٣٦ (قرار موثق في رأس البنك). */
    duel: {
      DUEL_POINTS: 2,
      DUEL_NET: 4,
      ROOT_POINTS: 3,
      RESOLVE_NET: 4,
      RECOGNITION_WEIGHT: 6
    },

    /* المسارات (stageE) — منطق computeAxisRanking الموروث:
       الترتيب بالفعل، النقد كاسر تعادل، فجوة الاشتياق > DIFF_GAP تؤكد
       المدفون. عند closeTop (فارق الرئيسي/الداعم ≤ DIFF_GAP) يقدَّم
       بندا الترتيب الإجباري، وترتيبهما يضاف لتجميع الفعل بالأوزان:
       الأقرب +٣، الأوسط +١، الأبعد ٠ — ثم يعاد الترتيب. وإن بقي
       التعادل الحسابي التام: كسر حتمي بالنقد الأدنى ثم بترتيب المحاور
       الثابت (نفس كسر التعادل الموروث). */
    ranking: {
      CLOSE_TOP_GAP: 3,             // = DIFF_GAP
      RANK_POINTS: { first: 3, second: 1, third: 0 }
    },

    /* الطيف (stageF) — منطق computeDimensionBurnout الموروث حرفيًّا:
       يقدَّم لكل قوة ثلاث عبارات (balance + excess/a + deficit/a).
       الموقع: الأعلى بشرط فارق ≥ DIM_GAP عن الثاني.
       تذبذب (both): إفراط ≥ BOTH_MIN وتفريط ≥ BOTH_MIN والاتزان أدنى
       منهما — موقع مشروع على الخريطة، لا يستدعي حسمًا.
       التباس (ambiguous): فارق الأعلى عن الثاني < DIM_GAP — يستدعي
       فورًا عبارتي الحسم (excess/b + deficit/b) ويعاد الحساب بالخمس.
       فإن بقي الالتباس بعدها: الموقع «قريبة من الاتزان مع ميل نحو
       الاتجاه الأعلى حسابيًّا» (nearBalanceLean) — قرار محسوم لا سؤال
       معلق. ملاحظة معايرة: عتبة BOTH_MIN موروثة من نظام ٣ عبارات؛ عند
       إعادة الحساب بخمس عبارات يقيسها المحرك على متوسط العبارة لا
       المجموع حفاظًا على معناها. */
    spectrum: {
      SERVE_FIRST: ['balance', 'excess:a', 'deficit:a'],
      SERVE_RESOLVE: ['excess:b', 'deficit:b'],
      BOTH_MIN: 5,                  // موروث (بمقياس متوسط العبارة ≥ ٥)
      NEAR_BALANCE_LABEL: 'قريبة من الاتزان مع ميل'
    }
  };

  /* ════════════════ ١١) جهاز الصدق — المنهجية §٥.٦ ════════════════
     ١) زوجا الاتساق: معرّفان داخل بنود البوابتين نفسها (حقل
        consistencyPair في البنك: a2↔a7 و b2↔b5). التناقض = فارق تقييم
        > TOLERANCE على الخيار المتناظر بين الصياغتين.
     ٢) بند الانتباه المموّه: غير موجود في بنك البنود (فجوة مرصودة) —
        فعُرِّف هنا كبند تشغيلي لجهاز الصدق لا كبند قياس: بند «نُدرة»
        لا يستطيع إنسان صادق تقييمه عاليًا، يُدسّ في منتصف تدفق stageC
        بنفس شكل بنود ليكرت. تقييمه ≥ ATTENTION_FLAG_AT يرفع علم انتباه.
        ⚑ للمراجعة: نص البند أدناه جديد — يعتمد أو يُستبدل. */
  RAPID_CONFIG.truthDevice = {
    CONSISTENCY_TOLERANCE: 2,
    attentionItem: {
      id: 'att1',
      serveAfterConfirmIndex: 2,     // يُدسّ بعد ثاني بند تأكيد
      text: 'في كلّ المواقف الصعبة التي مررتُ بها في حياتي كلّها، بلا استثناءٍ واحد، لم أشعر بأيّ توتّرٍ أو تردّدٍ إطلاقًا مهما كان الموقف.',
      hint: 'في كل المواقف الصعبة اللي عديت بيها في حياتك كلها، من غير استثنا واحد، ما حسّيتش بأي توتر أو تردد خالص مهما كان الموقف.',
      ATTENTION_FLAG_AT: 5           // تقييم ≥ ٥ لهذه العبارة = علم انتباه
    }
  };

  /* ════════════════ ١٢) مؤشر الثقة الداخلي ════════════════
     يُحسب ويُخزَّن للمعايرة ولعين الكوتش في الأدمن — لا يُعرض للعميل
     أبدًا كتشكيك في نتيجته (المنهجية §٣). نموذج v1 — أوزانه قابلة
     للضبط في المعايرة (§٨):
       الأساس + إسهام هامشي البوابتين + صافي التأكيد
       − خصم مسار الحسم − خصوم أعلام الصدق
       + مكافأة اتفاق التعرّف مع مجموع الأدلة (في مسار recognition). */
  RAPID_CONFIG.confidence = {
    BASE: 55,
    GATE_MARGIN_POINT: 3,           // × هامش كل بوابة (بسقف GATE_MARGIN_CAP)
    GATE_MARGIN_CAP: 6,
    CONFIRM_NET_POINT: 3,           // × صافي أصوات التأكيد (بسقف CONFIRM_NET_CAP)
    CONFIRM_NET_CAP: 4,
    PATH_PENALTY: { standard: 0, duel: 6, root: 10, recognition: 14 },
    RECOGNITION_AGREEMENT_BONUS: 4,
    CONSISTENCY_FLAG_PENALTY: 5,    // لكل علم تناقض
    ATTENTION_FLAG_PENALTY: 8,
    MIN: 5,
    MAX: 99
  };

  /* ════════════════ ١٣) تدفق المراحل ════════════════ */
  RAPID_CONFIG.flow = {
    order: ['stageA', 'stageB', 'stageC', 'stageD', 'stageE', 'stageF'],
    conditional: ['stageD'],        // تعمل فقط عند تعارض الأدلة
    resolutionPaths: ['standard', 'duel', 'root', 'recognition']
  };

  /* ════════════════ ١٤) دوالّ الوصول ════════════════ */

  /* الطابع من خلية المربع */
  RAPID_CONFIG.typeFromCell = function (family, behavior) {
    var row = RAPID_CONFIG.latinSquare[family];
    return row ? (row[behavior] || null) : null;
  };

  /* خلية الطابع في المربع */
  RAPID_CONFIG.cellOfType = function (typeNum) {
    var fams = RAPID_CONFIG.families.order;
    for (var i = 0; i < fams.length; i++) {
      var row = RAPID_CONFIG.latinSquare[fams[i]];
      for (var b in row) {
        if (row[b] === String(typeNum)) return { family: fams[i], behavior: b };
      }
    }
    return null;
  };

  /* توقيع الطابع */
  RAPID_CONFIG.signatureOf = function (typeNum) {
    return RAPID_CONFIG.signatures[String(typeNum)] || null;
  };

  /* مفتاح الزوج القياسي: الرقمان تصاعديًّا */
  RAPID_CONFIG.pairKey = function (a, b) {
    var x = parseInt(a, 10), y = parseInt(b, 10);
    return x < y ? (x + '-' + y) : (y + '-' + x);
  };

  /* جبهات زوج طبائع — الاشتقاق الآلي من جدول التواقيع (LENSES §٥):
     التقسيمات التي يختلفان فيها، مرتّبةً بسلّم صلاحية التأكيد أولًا
     (m4, m2, m3) ثم الجذر (m6) ثم المستهلكتان/المستبعدة للعلم فقط. */
  RAPID_CONFIG.frontsOfPair = function (a, b) {
    var sa = RAPID_CONFIG.signatureOf(a), sb = RAPID_CONFIG.signatureOf(b);
    if (!sa || !sb) return [];
    var differing = [];
    RAPID_CONFIG.mirrors.order.forEach(function (m) {
      if (sa[m] !== sb[m]) differing.push(m);
    });
    var ladder = RAPID_CONFIG.frontLadder.confirmation
      .concat([RAPID_CONFIG.frontLadder.reservedRoot])
      .concat(['m1', 'm5'])
      .concat(RAPID_CONFIG.frontLadder.excluded);
    differing.sort(function (x, y) { return ladder.indexOf(x) - ladder.indexOf(y); });
    return differing;
  };

  /* خريطة قوى الطابع — فهرس مفوَّض (قرار هندسي موثق):
     المصدر الوحيد للحقيقة هو rapid-questions.spectrum (الأسماء
     والانزلاقات والعبارات بحقولها) — الكونفج لا يكرر البيانات بل يقدّم
     واجهة الوصول إليها، منعًا لانحراف نسختين. */
  RAPID_CONFIG.getStrengthMap = function (typeNum) {
    var Q = (typeof global.RAPID_QUESTIONS !== 'undefined' && global.RAPID_QUESTIONS) ||
            (typeof require !== 'undefined' ? (function () {
              try { return require('./rapid-questions.js'); } catch (e) { return null; }
            })() : null);
    if (!Q || !Q.spectrum) return null;
    var t = Q.spectrum['type' + String(typeNum)];
    if (!t) return null;
    var out = { typeKey: 'type' + String(typeNum), axes: [] };
    RAPID_CONFIG.axes.order.forEach(function (ax) {
      var axis = t[ax];
      if (!axis) return;
      out.axes.push({
        key: ax,
        axisName: axis.axisName,
        strengths: axis.strengths.map(function (s) {
          return { id: s.id, name: s.name, excessName: s.excessName, deficitName: s.deficitName };
        })
      });
    });
    return out;
  };

  /* ════════════════ ١٥) الفحص الذاتي ════════════════
     يتحقق أن الكونفج متسق مع نفسه (المربع ↔ العضويات، التواقيع ↔
     التقسيمات، الأزواج الضيقة = ذوات الجبهات الأربع) ومع بنك البنود
     إن كان متاحًا (بطاريات الأزواج، اكتمال الطيف). يُرجع قائمة مشاكل
     فارغة عند السلامة. */
  RAPID_CONFIG.verifyIntegrity = function () {
    var problems = [];
    var C = RAPID_CONFIG;

    /* المربع اللاتيني ↔ عضويات العائلات والأساليب */
    C.families.order.forEach(function (f) {
      C.behaviors.order.forEach(function (b) {
        var t = C.latinSquare[f][b];
        if (C.families[f].types.indexOf(t) === -1)
          problems.push('المربع: ' + t + ' ليس من عائلة ' + f);
        if (C.behaviors[b].types.indexOf(t) === -1)
          problems.push('المربع: ' + t + ' ليس من أسلوب ' + b);
      });
    });
    var seen = {};
    C.families.order.forEach(function (f) {
      C.behaviors.order.forEach(function (b) {
        var t = C.latinSquare[f][b];
        if (seen[t]) problems.push('المربع: الطابع ' + t + ' مكرر');
        seen[t] = true;
      });
    });
    if (Object.keys(seen).length !== 9) problems.push('المربع: لا يغطي التسعة');

    /* التواقيع ↔ التقسيمات (اتساق مزدوج الاتجاه) */
    for (var n = 1; n <= 9; n++) {
      var sig = C.signatures[String(n)];
      C.mirrors.order.forEach(function (m) {
        var div = sig[m];
        var members = C.mirrors[m].divisions[div];
        if (!members || members.indexOf(String(n)) === -1)
          problems.push('توقيع ' + n + '/' + m + ': ' + div + ' لا يضمه');
      });
    }
    C.mirrors.order.forEach(function (m) {
      var covered = [];
      Object.keys(C.mirrors[m].divisions).forEach(function (d) {
        var arr = C.mirrors[m].divisions[d];
        if (arr.length !== 3) problems.push(m + '/' + d + ': ليست ثلاثية');
        covered = covered.concat(arr);
      });
      if (covered.slice().sort().join(',') !== '1,2,3,4,5,6,7,8,9')
        problems.push(m + ': التقسيم لا يغطي التسعة مرة واحدة');
    });

    /* الأزواج الضيقة = كل الأزواج ذات الجبهات الأربع، لا أكثر ولا أقل */
    var computedNarrow = [];
    for (var i = 1; i <= 9; i++) for (var j = i + 1; j <= 9; j++) {
      var fronts = C.frontsOfPair(i, j);
      if (fronts.length < 4) problems.push('زوج ' + i + '-' + j + ': جبهات ' + fronts.length + ' < 4');
      if (fronts.length === 4) computedNarrow.push(i + '-' + j);
    }
    if (computedNarrow.sort().join('|') !== C.narrowPairs.slice().sort().join('|'))
      problems.push('الأزواج الضيقة المحسوبة (' + computedNarrow.join(',') + ') لا تطابق المعلنة');

    /* ضد بنك البنود إن كان متاحًا */
    var Q = (typeof global.RAPID_QUESTIONS !== 'undefined' && global.RAPID_QUESTIONS) ||
            (typeof require !== 'undefined' ? (function () {
              try { return require('./rapid-questions.js'); } catch (e) { return null; }
            })() : null);
    if (Q) {
      var bankPairs = Object.keys(Q.duels || {}).sort().join('|');
      if (bankPairs !== C.narrowPairs.slice().sort().join('|'))
        problems.push('بطاريات البنك (' + bankPairs + ') لا تطابق الأزواج الضيقة');
      if (Object.keys(Q.recognitionVoices || {}).length !== 9)
        problems.push('بنك الأصوات غير مكتمل');
      for (var k = 1; k <= 9; k++) {
        var map = C.getStrengthMap(k);
        if (!map || map.axes.length !== 3 ||
            map.axes.some(function (a) { return a.strengths.length !== 3; }))
          problems.push('خريطة قوى الطابع ' + k + ' غير مكتملة في البنك');
      }
    }

    return problems;
  };

  /* تصدير مزدوج: وحدات Node والمتصفّح — نمط ملفات المنظومة. */
  if (typeof module !== 'undefined' && module.exports) { module.exports = RAPID_CONFIG; }
  global.RAPID_CONFIG = RAPID_CONFIG;

})(typeof window !== 'undefined' ? window : globalThis);
