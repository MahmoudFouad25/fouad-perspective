/* ════════════════════════════════════════════════════════════════════════
   burn-items.js — بنود مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-items.js

   بيانات نقيّة: لا منطق، لا عرض، لا حساب.
   النصوص معتمدة من جلسة التصميم حرفيًّا — لا يُعدَّل حرفٌ إلّا بقرارٍ صريح.

   ──────────────────────────────────────────────────────────────────────
   الأرقام:
     ١٤٣ بندًا مكتوبًا · ٨٨ يراها مشاركٌ واحد بعد التفريع (+١ شرطيّ للفارز)

     الفلترة              ٢
     ط١ الفعل التلقائيّ   ١٨      (٦ مشاهد × ٣)
     ط١ الاشتياق           ٩      (٣ مشاهد × ٣)
     ط١ النقد              ٦      (٢ مشهد × ٣)
     ط٢ الطيف             ٣٦      (٣ محاور × ٣ أبعاد × ٤ حالات) → يُعرَض ١٢
     ط٢ التمييز            ٦      (٣ محاور × ٢)                 → يُعرَض ٢
     ط٢ النبضة             ٣
     ط٣ البيئة            ٢٧      (٣ محاور × ٩)                 → يُعرَض ٩
     ط٤ الوظيفية          ١٢
     ط٤ الوجه الآليّ        ٩      (٣ محاور × ٣)                 → يُعرَض ٣
     ط٥ نبضة الإحساس       ٩
     ضبط الجودة            ٣
     السؤال الفارز         ٣      (شرطيّ: يُعرَض واحدٌ عند التعادل)

   ──────────────────────────────────────────────────────────────────────
   عقد البند الواحد:
     id          معرّف ثابت لا يتغيّر أبدًا (هو مفتاح التخزين في Firestore)
     layer       1..5 أو 0 للفلترة
     block       action|longing|critique|spectrum|discrimination|pulse|
                 env|slf|fue|agn|dbl|aut|wbg|qc|tie|filter
     scene       معرّف المشهد الذي يُعرَض تحته (أو null)
     axis        coh|vit|bel|null   — وهو مفتاح التفريع في البنود المتفرّعة
     dim         d1|d2|d3|null
     state       bal|exc|def|osc|null
     level       vig|prs|ful|null
     text        نصّ البند كما يُعرَض
     reverse     هل تُعكَس درجته في الحساب
     visibility  always|branch|conditional
     dose        1..6 أو null للشرطيّ
     order       موضعه داخل الجرعة
     qcPairId    معرّف نظيره في ضبط الجودة (أو null)

   ──────────────────────────────────────────────────────────────────────
   قاعدة الشرح (hint):
     الشرح على المشهد لا على الخيار، بنُبلٍ متساوٍ للخيارات الثلاثة،
     يوضّح الموقف ولا يلمّح إلى بنية. وبنود العبارة المفردة بلا شرح.

   ──────────────────────────────────────────────────────────────────────
   قاعدة العكس (reverse):
     البنود العكسيّة خمسةٌ فقط: بند «الاتجاه العام» الإيجابيّ في كل فرعٍ
     من البيئة (٣)، وبند الوظيفية الذاتيّة الإيجابيّ (١).
     أمّا الطبقة الخامسة فكلّها في اتجاهٍ واحد، والعكس يقع في معادلة خطّ
     العافية (8 − المتوسّط) لا في البند — فلا تُعلَّم reverse.
   ════════════════════════════════════════════════════════════════════════ */

const BURN_ITEMS = {

  /* ══════════════════════════════════════════════════════════════════════
     ٠ — مقدّمات الكتل

     تُعرَض قبل الكتلة، مرّةً واحدة، وليست بنودًا.
     ══════════════════════════════════════════════════════════════════════ */
  blockIntros: {

    action:
      "الجزء الأول عن ما يحدث فيك تلقائيًّا.\n\n" +
      "ستّة مواقف من عالم العمل، وتحت كل موقفٍ ثلاث عبارات. " +
      "قيّم كل عبارةٍ وحدها: ما مدى ما يحدث هذا فيك قبل أن تفكّر؟\n\n" +
      "وليست العبارات الثلاث اختيارًا بينها. قد تشبهك ثلاثتها، وقد لا تشبهك أيّ منها. هذا طبيعيّ ومفيد.",

    longing:
      "الجزء التالي مختلف قليلًا.\n\n" +
      "لن نسألك عمّا تفعله، بل عمّا تشتاق إليه — وقد يكون ما تشتاق إليه غير ما تلاحقه فعلًا. " +
      "وهذا الفرق نفسه معلومةٌ تخصّك.",

    critique:
      "الجزء التالي مختلف.\n\n" +
      "سنسألك عمّا يزعجك في غيرك، لا حكمًا على أحد، بل لأنّ ما يزعجنا في الناس كثيرًا ما يكشف شيئًا فينا.",

    spectrum:
      "من هنا يبدأ الجزء الذي يخصّك أنت وحدك.\n\n" +
      "ما تبقّى من المقياس تفرّع على ما ظهر في إجاباتك، فصارت العبارات مكتوبةً لحالك أنت لا لكل الناس.\n\n" +
      "قيّم كل عبارةٍ بالنظر إلى حالك في الشهور الأخيرة.",

    env:
      "الجزء التالي عن ما حولك، لا عمّا فيك.\n\n" +
      "ولن نسألك: هل بيئتك جيدة؟ فقد تكون البيئة جيدةً تمامًا ولا تناسب اتجاهك، " +
      "وقد تكون صعبةً وتعطيك ما تحتاجه بالضبط.\n\n" +
      "سنسأل عن شيءٍ واحد: هل بين ما حولك وبين اتجاهك توافق؟\n\n" +
      "ولا يوجد هنا لوم: لا عليك، ولا على مكانك.",

    functionality:
      "الجزء التالي عن أصعب مسافةٍ في حياة أيّ إنسان: المسافة بين أن يعرف وأن يفعل.\n\n" +
      "قيّم كل عبارةٍ بالنظر إلى حياتك المهنيّة في الشهور الستّة الأخيرة.",

    aut:
      "وثلاث عباراتٍ أخيرة، عن شيءٍ يعمل فيك كل يومٍ بلا أن تنتبه.",

    wbg:
      "الجزء الأخير، وهو أقصرها.\n\n" +
      "تسع عباراتٍ عن إحساسك في الأسبوعين الماضيين. وهذه العبارات تحديدًا هي التي ستعود إليها " +
      "كل أسبوعٍ في رحلتك، لترى إحساسك وهو يتحرّك.\n\n" +
      "ولهذا لا تجمّل. لو جمّلت اليوم، فأنت ترفع نقطة البداية بيدك، وتضيّع على نفسك أن ترى التحسّن الحقيقيّ بعدها. " +
      "النقطة المنخفضة اليوم ليست فشلًا — هي خطّ البداية الذي ستتفرّج عليه وهو يصعد."
  },

  /* ══════════════════════════════════════════════════════════════════════
     ١ — المشاهد

     المشهد إطارٌ يُعرَض فوق ثلاث عباراتٍ تُقيَّم كلٌّ على حدة.
     prompt يُعرَض دائمًا، وhint شرحٌ عاميّ اختياريّ يوضّح الموقف بنُبلٍ متساوٍ.
     ══════════════════════════════════════════════════════════════════════ */
  scenes: {

    /* ── مشاهد الفعل التلقائيّ ── */
    S1: {
      block: "action",
      prompt: "حين أنتقل إلى وضعٍ مهنيّ جديد، أوّل ما ينشغل به ذهني تلقائيًّا:",
      hint: "وضع جديد: شغل جديد، فريق جديد، دور اتغيّر، شركة انتقلت لها. تخيّل نفسك في أوّل أسبوع. " +
            "السؤال مش «إيه المفروض تعمله» — السؤال: دماغك راحت على إيه لوحدها في أوّل يومين؟"
    },
    S2: {
      block: "action",
      prompt: "حين يصلني خبرٌ مقلقٌ في العمل، أوّل ما يتحرّك فيّ تلقائيًّا:",
      hint: "خبر يخضّ: تقليص، عميل كبير هيمشي، قرار من فوق مكانش في الحسبان. " +
            "اللحظة الأولى بس — قبل ما تفكّر وتخطّط. إيه اللي اتحرّك جوّاك في أوّل ثانية؟"
    },
    S3: {
      block: "action",
      prompt: "خلال يوم العمل، أجدني تلقائيًّا:",
      hint: "مش موقف معيّن — يومك العادي. انتباهك بيروح فين من غير ما تبعته؟ " +
            "خُد ثانية وافتكر آخر ثلاثة أيام شغل عاديّة."
    },
    S4: {
      block: "action",
      prompt: "حين أفكّر في قرارٍ مهنيٍّ كبير، أوّل ما أزنه تلقائيًّا:",
      hint: "عرض شغل، أو نقلة، أو قرار توسّع، أو تسيب حاجة. " +
            "قبل ما تعمل مقارنة منظّمة على ورق — إيه أوّل حاجة العقل بيوزنها لوحده؟"
    },
    S5: {
      block: "action",
      prompt: "حين يشتدّ الضغط عليّ في العمل، أوّل ما أفعله تلقائيًّا:",
      hint: "الضغط الحقيقي: مواعيد اتزنقت، ومشاكل جت ورا بعض، والحمل أكبر من الوقت. " +
            "مش اللي بتنصح بيه غيرك — اللي بتلاقي نفسك بتعمله فعلًا."
    },
    S6: {
      block: "action",
      prompt: "حين أُنجز شيئًا كبيرًا في عملي، ما يستقرّ في نفسي بعده:",
      hint: "افتكر آخر مرّة حسّيت فيها إنك نجحت بجدّ. مش لحظة التصفيق — بعدها بيومين، " +
            "لمّا قعدت لوحدك. الإحساس اللي فضل إيه؟"
    },

    /* ── مشاهد الاشتياق ── */
    S7: {
      block: "longing",
      prompt: "حين أتخيّل حياةً مهنيّةً أوسع ممّا أعيشه، أشتاق إلى:",
      hint: "الصورة اللي في بالك للحياة اللي نفسك فيها — مش الواقعيّة، اللي نفسك فيها فعلًا."
    },
    S8: {
      block: "longing",
      prompt: "الشيء الذي أشعر أنّه ينقصني، ولا أفعل شيئًا لأجله:",
      hint: "ركّز في نصّ السؤال التاني: «ولا أفعل شيئًا لأجله». " +
            "يعني حاجة عارف إنها ناقصاك ومع ذلك مش بتلاحقها."
    },
    S9: {
      block: "longing",
      prompt: "حين أرى غيري، أجد نفسي أتمنّى لو عندي مثل ما عندهم:",
      hint: "مش حسد — تمنّي. لمّا تشوف حدّ وتقول في نفسك «يا بختك»، بتكون بتبصّ على إيه في حياته؟"
    },

    /* ── مشاهد النقد ── */
    S10: {
      block: "critique",
      prompt: "أكثر ما يستفزّني في زملاء العمل:",
      hint: "بصراحة كده. مش هيتقري على إنه رأيك في زمايلك — ده سؤال عنك إنت."
    },
    S11: {
      block: "critique",
      prompt: "حين أرى أحدًا يعيش على هذا النحو، أشعر بشيءٍ من الشفقة:",
      hint: "الشفقة مش الاستفزاز. دي نظرة من فوق شوية — «حرام عليه، بيضيّع عمره كده»."
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     ٢ — بندا الفلترة

     ثنائيّان (نعم/لا)، لا يدخلان أيّ حساب، ويرفعان علاماتٍ للمدرّب.
     ══════════════════════════════════════════════════════════════════════ */
  filters: [
    {
      id: "PRE_FLT_01",
      layer: 0, block: "filter", scene: null,
      axis: null, dim: null, state: null, level: null,
      type: "boolean",
      text: "هل مررت خلال الشهر الأخير بحدثٍ كبيرٍ غيّر حياتك — فقدٍ، أو انفصال، أو أزمةٍ صحّية، أو تغييرٍ مفاجئ في عملك؟",
      onYes: "offerDeferral",
      flag: "FLG_ACUTE_CRISIS",
      reverse: false, visibility: "always", dose: 1, order: 0, qcPairId: null
    },
    {
      id: "PRE_FLT_02",
      layer: 0, block: "filter", scene: null,
      axis: null, dim: null, state: null, level: null,
      type: "boolean",
      text: "هل تغيّر عملك أو وضعك المهنيّ جذريًّا خلال الستّة أشهر الماضية؟",
      onYes: "shortenEnvWindow",
      flag: "FLG_SHORT_ENV_WINDOW",
      reverse: false, visibility: "always", dose: 4, order: 0, qcPairId: null
    }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٣ — الطبقة الأولى · اتجاه الطاقة (٣٣ بندًا)
     ══════════════════════════════════════════════════════════════════════ */
  L1: [

    /* ─────── الكتلة (أ): الفعل التلقائيّ · ١٨ بندًا · الجرعة ١ ─────── */

    /* المشهد ١ — الدخول على وضعٍ جديد */
    { id:"L1_ACT_S1_COH", layer:1, block:"action", scene:"S1", axis:"coh", dim:"d2", state:null, level:null,
      text:"أن أعرف هل أرضي هنا ثابتة، وهل ما أحتاجه مضمون.",
      reverse:false, visibility:"always", dose:1, order:1, qcPairId:null },
    { id:"L1_ACT_S1_VIT", layer:1, block:"action", scene:"S1", axis:"vit", dim:"d1", state:null, level:null,
      text:"أن أعرف هل فيه ما يوقظني، أم سيكون تكرارًا لما مضى.",
      reverse:false, visibility:"always", dose:1, order:2, qcPairId:null },
    { id:"L1_ACT_S1_BEL", layer:1, block:"action", scene:"S1", axis:"bel", dim:"d1", state:null, level:null,
      text:"أن أعرف من هنا، وكيف يتعاملون مع بعضهم، وأين موقعي بينهم.",
      reverse:false, visibility:"always", dose:1, order:3, qcPairId:null },

    /* المشهد ٢ — الخبر المقلق */
    { id:"L1_ACT_S2_COH", layer:1, block:"action", scene:"S2", axis:"coh", dim:"d2", state:null, level:null,
      text:"أن أتفقّد ما بيدي، وأحسب ما قد يسقط.",
      reverse:false, visibility:"always", dose:1, order:4, qcPairId:null },
    { id:"L1_ACT_S2_VIT", layer:1, block:"action", scene:"S2", axis:"vit", dim:"d1", state:null, level:null,
      text:"أن أشعر بشيءٍ ينطفئ، وأسأل هل بقي هنا ما يستحقّ.",
      reverse:false, visibility:"always", dose:1, order:5, qcPairId:null },
    { id:"L1_ACT_S2_BEL", layer:1, block:"action", scene:"S2", axis:"bel", dim:"d2", state:null, level:null,
      text:"أن أفكّر فيمن سيعرف، وهل يبقى لي موقعي بينهم.",
      reverse:false, visibility:"always", dose:1, order:6, qcPairId:null },

    /* المشهد ٣ — الانتباه الجسديّ والحسّيّ */
    { id:"L1_ACT_S3_COH", layer:1, block:"action", scene:"S3", axis:"coh", dim:"d1", state:null, level:null,
      text:"ينصرف انتباهي إلى ما يشعر به جسدي: توتّره، وجوعه، وحاجته للتوقّف.",
      reverse:false, visibility:"always", dose:1, order:7, qcPairId:null },
    { id:"L1_ACT_S3_VIT", layer:1, block:"action", scene:"S3", axis:"vit", dim:"d1", state:null, level:null,
      text:"ينصرف انتباهي إلى ما إن كنت حاضرًا فيما أفعل، أم أؤدّيه وأنا غائب.",
      reverse:false, visibility:"always", dose:1, order:8, qcPairId:null },
    { id:"L1_ACT_S3_BEL", layer:1, block:"action", scene:"S3", axis:"bel", dim:"d1", state:null, level:null,
      text:"ينصرف انتباهي إلى ما لم يُقَل: نبرةٍ، أو صمت، أو تغيّرٍ في الأجواء.",
      reverse:false, visibility:"always", dose:1, order:9, qcPairId:null },

    /* المشهد ٤ — القرار المهنيّ */
    { id:"L1_ACT_S4_COH", layer:1, block:"action", scene:"S4", axis:"coh", dim:"d2", state:null, level:null,
      text:"هل يجعل وضعي أثبت وأهدأ.",
      reverse:false, visibility:"always", dose:1, order:10, qcPairId:null },
    { id:"L1_ACT_S4_VIT", layer:1, block:"action", scene:"S4", axis:"vit", dim:"d3", state:null, level:null,
      text:"هل فيه ما أخرج به من التكرار، أم سأبقى مكاني.",
      reverse:false, visibility:"always", dose:1, order:11, qcPairId:null },
    { id:"L1_ACT_S4_BEL", layer:1, block:"action", scene:"S4", axis:"bel", dim:"d3", state:null, level:null,
      text:"هل يجعل لي أثرًا ودورًا أوسع.",
      reverse:false, visibility:"always", dose:1, order:12, qcPairId:null },

    /* المشهد ٥ — تحت الضغط */
    { id:"L1_ACT_S5_COH1", layer:1, block:"action", scene:"S5", axis:"coh", dim:"d3", state:null, level:null,
      text:"أضيّق دائرتي وأغلق ما هو مفتوح، حتى لا ينهار شيء.",
      reverse:false, visibility:"always", dose:1, order:13, qcPairId:null },
    { id:"L1_ACT_S5_COH2", layer:1, block:"action", scene:"S5", axis:"coh", dim:"d3", state:null, level:null,
      text:"أُمسك ما أشعر به وأمضي، وأؤجّله إلى ما بعد المهمّة.",
      reverse:false, visibility:"always", dose:1, order:14, qcPairId:null },
    { id:"L1_ACT_S5_BEL", layer:1, block:"action", scene:"S5", axis:"bel", dim:"d1", state:null, level:null,
      text:"أتأكّد أنّ علاقاتي على ما يرام، فأيّ شرخٍ فيها يشغلني أكثر من الضغط.",
      reverse:false, visibility:"always", dose:1, order:15, qcPairId:null },

    /* المشهد ٦ — بعد الإنجاز */
    { id:"L1_ACT_S6_COH", layer:1, block:"action", scene:"S6", axis:"coh", dim:"d2", state:null, level:null,
      text:"الاطمئنان أنّ وضعي صار أثبت.",
      reverse:false, visibility:"always", dose:1, order:16, qcPairId:null },
    { id:"L1_ACT_S6_VIT", layer:1, block:"action", scene:"S6", axis:"vit", dim:"d2", state:null, level:null,
      text:"الشعور أنّي كنت حيًّا فيه فعلًا، وأنّي أُخرجت ما فيّ.",
      reverse:false, visibility:"always", dose:1, order:17, qcPairId:null },
    { id:"L1_ACT_S6_BEL", layer:1, block:"action", scene:"S6", axis:"bel", dim:"d3", state:null, level:null,
      text:"أن ما قدّمته وصل، وأنّ له أثرًا عند من يعنيني.",
      reverse:false, visibility:"always", dose:1, order:18, qcPairId:null },

    /* ─────── الكتلة (ب): الاشتياق · ٩ بنود · الجرعة ٢ ─────── */

    /* المشهد ٧ — الحياة الأوسع */
    { id:"L1_LNG_S7_COH", layer:1, block:"longing", scene:"S7", axis:"coh", dim:null, state:null, level:null,
      text:"أرضٌ ثابتةٌ لا أخاف أن تُسحب من تحتي.",
      reverse:false, visibility:"always", dose:2, order:1, qcPairId:null },
    { id:"L1_LNG_S7_VIT", layer:1, block:"longing", scene:"S7", axis:"vit", dim:null, state:null, level:null,
      text:"عملٌ يوقظني وأشتعل له بكل ما فيّ.",
      reverse:false, visibility:"always", dose:2, order:2, qcPairId:null },
    { id:"L1_LNG_S7_BEL", layer:1, block:"longing", scene:"S7", axis:"bel", dim:null, state:null, level:null,
      text:"مكانٌ بين الناس وأثرٌ يبقى بعدي.",
      reverse:false, visibility:"always", dose:2, order:3, qcPairId:null },

    /* المشهد ٨ — النقص الذي لا يُلاحَق */
    { id:"L1_LNG_S8_COH", layer:1, block:"longing", scene:"S8", axis:"coh", dim:null, state:null, level:null,
      text:"أن يهدأ فيّ القلق على وضعي.",
      reverse:false, visibility:"always", dose:2, order:4, qcPairId:null },
    { id:"L1_LNG_S8_VIT", layer:1, block:"longing", scene:"S8", axis:"vit", dim:null, state:null, level:null,
      text:"أن أشعر بالحياة تجري فيّ لا أن أمرّ بها.",
      reverse:false, visibility:"always", dose:2, order:5, qcPairId:null },
    { id:"L1_LNG_S8_BEL", layer:1, block:"longing", scene:"S8", axis:"bel", dim:null, state:null, level:null,
      text:"أن يعرفني أحدٌ على حقيقتي ثم يقبلني.",
      reverse:false, visibility:"always", dose:2, order:6, qcPairId:null },

    /* المشهد ٩ — التمنّي */
    { id:"L1_LNG_S9_COH", layer:1, block:"longing", scene:"S9", axis:"coh", dim:null, state:null, level:null,
      text:"مطمئنّون على أمرهم، لا يحسبون كل خطوة.",
      reverse:false, visibility:"always", dose:2, order:7, qcPairId:null },
    { id:"L1_LNG_S9_VIT", layer:1, block:"longing", scene:"S9", axis:"vit", dim:null, state:null, level:null,
      text:"أحياءٌ متّقدون، عندهم ما يستحقّ أن يُعاش.",
      reverse:false, visibility:"always", dose:2, order:8, qcPairId:null },
    { id:"L1_LNG_S9_BEL", layer:1, block:"longing", scene:"S9", axis:"bel", dim:null, state:null, level:null,
      text:"في قلب الناس، لهم مكانٌ ودورٌ واضح.",
      reverse:false, visibility:"always", dose:2, order:9, qcPairId:null },

    /* ─────── الكتلة (ج): النقد · ٦ بنود · الجرعة ٢ ─────── */
    /* الحساب معكوس المعنى: استفزازٌ عالٍ تجاه محورٍ = ترجيحُ كبتِه في المستجيب */

    /* المشهد ١٠ — ما يستفزّني */
    { id:"L1_CRT_S10_COH", layer:1, block:"critique", scene:"S10", axis:"coh", dim:null, state:null, level:null,
      text:"انشغالهم الدائم بحدودهم وحساباتهم، وكأنّ لا شيء يستحقّ المجازفة.",
      reverse:false, visibility:"always", dose:2, order:10, qcPairId:null },
    { id:"L1_CRT_S10_VIT", layer:1, block:"critique", scene:"S10", axis:"vit", dim:null, state:null, level:null,
      text:"لهاثهم وراء كل جديدٍ وظهورهم الدائم، وكأنّ الهدوء عندهم موت.",
      reverse:false, visibility:"always", dose:2, order:11, qcPairId:null },
    { id:"L1_CRT_S10_BEL", layer:1, block:"critique", scene:"S10", axis:"bel", dim:null, state:null, level:null,
      text:"انشغالهم بمواقعهم وبمن يقبلهم، وكأنّ رأي الناس هو كل شيء.",
      reverse:false, visibility:"always", dose:2, order:12, qcPairId:null },

    /* المشهد ١١ — ما تشفق منه */
    { id:"L1_CRT_S11_COH", layer:1, block:"critique", scene:"S11", axis:"coh", dim:null, state:null, level:null,
      text:"من يعيش عمره كلّه يحتاط لما لم يحدث.",
      reverse:false, visibility:"always", dose:2, order:13, qcPairId:null },
    { id:"L1_CRT_S11_VIT", layer:1, block:"critique", scene:"S11", axis:"vit", dim:null, state:null, level:null,
      text:"من يعيش لحظته ولا يبني شيئًا يبقى.",
      reverse:false, visibility:"always", dose:2, order:14, qcPairId:null },
    { id:"L1_CRT_S11_BEL", layer:1, block:"critique", scene:"S11", axis:"bel", dim:null, state:null, level:null,
      text:"من لا يقرّ له قرارٌ إلّا إذا رضي عنه الناس.",
      reverse:false, visibility:"always", dose:2, order:15, qcPairId:null }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٤ — الطبقة الثانية · احتراق الأبعاد (٤٥ بندًا مكتوبًا · ١٧ معروضًا)

     متفرّعة: يُعرَض فرع المحور الرئيسيّ وحده (١٢ طيف + ٢ تمييز)،
     ثم ٣ بنود نبضةٍ يجيب عنها الجميع.

     قاعدة الصياغة المحروسة:
       • بند الاتزان يصف أثرًا خارجيًّا أو فعلًا ملاحَظًا، لا حالًا داخليًّا.
         (لأنّ الكاتم يظنّ نفسه متّزنًا، ولا يستطيع أن يدّعي أثرًا في غيره.)
       • بندا الإفراط والتفريط يصفان الحال الداخليّ.
       • بند التذبذب يصف الدورة بعناصرها الثلاثة: الطرف، والانقلاب، والارتداد.
     ══════════════════════════════════════════════════════════════════════ */
  L2: {

    /* ─────────────── الطيف · ٣٦ بندًا ─────────────── */
    spectrum: [

      /* ══ فرع التماسك ══ */

      /* البُعد ١ — رعاية الجسد */
      { id:"L2_SPC_COH_D1_BAL", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d1", state:"bal", level:null,
        text:"أتوقّف حين يطلب جسدي التوقّف، حتى لو كان في الوقت عملٌ غير منتهٍ.",
        reverse:false, visibility:"branch", dose:3, order:1, qcPairId:null },
      { id:"L2_SPC_COH_D1_EXC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d1", state:"exc", level:null,
        text:"أتفقّد إشارات جسدي وأبحث عن معناها، ولا يهدأ لي بالٌ حتى أطمئنّ.",
        reverse:false, visibility:"branch", dose:3, order:2, qcPairId:null },
      { id:"L2_SPC_COH_D1_DEF", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d1", state:"def", level:null,
        text:"تمرّ عليّ أيامٌ لا آكل فيها في وقتٍ ولا أنام في وقت، وكأنّ جسدي ليس لي.",
        reverse:false, visibility:"branch", dose:3, order:3, qcPairId:null },
      { id:"L2_SPC_COH_D1_OSC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d1", state:"osc", level:null,
        text:"أهمل جسدي حتى يصرخ، ثم أنقلب إلى اهتمامٍ مبالغٍ فيه أيامًا، ثم أعود أهمله.",
        reverse:false, visibility:"branch", dose:3, order:4, qcPairId:null },

      /* البُعد ٢ — تأمين الموارد */
      { id:"L2_SPC_COH_D2_BAL", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d2", state:"bal", level:null,
        text:"أتّخذ قرارًا ماليًّا وأمضي، ولا أعود لأقلّبه بعد أن أتّخذه.",
        reverse:false, visibility:"branch", dose:3, order:5, qcPairId:null },
      { id:"L2_SPC_COH_D2_EXC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d2", state:"exc", level:null,
        text:"أحسب ما عندي وأعيد حسابه، ولا يكفيني مهما بلغ.",
        reverse:false, visibility:"branch", dose:3, order:6, qcPairId:null },
      { id:"L2_SPC_COH_D2_DEF", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d2", state:"def", level:null,
        text:"تركت أمر مواردي يمضي كيفما اتّفق، ولا أنظر فيه.",
        reverse:false, visibility:"branch", dose:3, order:7, qcPairId:null },
      { id:"L2_SPC_COH_D2_OSC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d2", state:"osc", level:null,
        text:"أشدّ على نفسي في الإنفاق مدّة، ثم أنفق فجأةً بلا حساب، ثم أشدّ من جديد.",
        reverse:false, visibility:"branch", dose:3, order:8, qcPairId:null },

      /* البُعد ٣ — التنظيم الذاتيّ */
      { id:"L2_SPC_COH_D3_BAL", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d3", state:"bal", level:null,
        text:"يعرف من حولي ما يزعجني قبل أن ينفجر منّي، لأنّي أقوله في وقته.",
        reverse:false, visibility:"branch", dose:3, order:9, qcPairId:null },
      { id:"L2_SPC_COH_D3_EXC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d3", state:"exc", level:null,
        text:"أُغلق على ما أشعر به حتى لا يظهر، فأبدو هادئًا والداخل مشدود.",
        reverse:false, visibility:"branch", dose:3, order:10, qcPairId:null },
      { id:"L2_SPC_COH_D3_DEF", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d3", state:"def", level:null,
        text:"حين يتجاوز الضغط حدًّا أنفلت أو أنهار، ولا أعود أتماسك.",
        reverse:false, visibility:"branch", dose:3, order:11, qcPairId:null },
      { id:"L2_SPC_COH_D3_OSC", layer:2, block:"spectrum", scene:null, axis:"coh", dim:"d3", state:"osc", level:null,
        text:"أمسك ما فيّ أسابيع، ثم ينفجر مرّةً واحدةً على من لا ذنب له، ثم أعود أمسك أشدّ.",
        reverse:false, visibility:"branch", dose:3, order:12, qcPairId:null },

      /* ══ فرع الحيوية ══ */

      /* البُعد ١ — الاشتعال والحضور */
      { id:"L2_SPC_VIT_D1_BAL", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d1", state:"bal", level:null,
        text:"أجد ما يشغلني فعلًا في عملٍ عاديٍّ متكرّر، ولا أحتاج أن يكون استثنائيًّا.",
        reverse:false, visibility:"branch", dose:3, order:1, qcPairId:null },
      { id:"L2_SPC_VIT_D1_EXC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d1", state:"exc", level:null,
        text:"لا يرضيني إلّا ما كان مشتعلًا، وما دونه أراه فارغًا لا يستحقّ وقتي.",
        reverse:false, visibility:"branch", dose:3, order:2, qcPairId:null },
      { id:"L2_SPC_VIT_D1_DEF", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d1", state:"def", level:null,
        text:"صار كل شيءٍ عندي عاديًّا، لا يفرحني حقًّا ولا يوجعني حقًّا.",
        reverse:false, visibility:"branch", dose:3, order:3, qcPairId:null },
      { id:"L2_SPC_VIT_D1_OSC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d1", state:"osc", level:null,
        text:"أشتعل في شيءٍ حتى أُستنزف، ثم أنطفئ تمامًا مدّة، ثم أشتعل في غيره.",
        reverse:false, visibility:"branch", dose:3, order:4, qcPairId:null },

      /* البُعد ٢ — التعبير والأثر */
      { id:"L2_SPC_VIT_D2_BAL", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d2", state:"bal", level:null,
        text:"أقول ما عندي في وقته، ولا أخرج من اجتماعٍ وأنا أفكّر فيما كان ينبغي أن أقوله.",
        reverse:false, visibility:"branch", dose:3, order:5, qcPairId:null },
      { id:"L2_SPC_VIT_D2_EXC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d2", state:"exc", level:null,
        text:"أشتغل على صورتي وحضوري حتى لا أمرّ على أحدٍ دون أن يلاحظني.",
        reverse:false, visibility:"branch", dose:3, order:6, qcPairId:null },
      { id:"L2_SPC_VIT_D2_DEF", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d2", state:"def", level:null,
        text:"أحجب ما فيّ ولا أُظهره، لأنّ ما عندي لا يستحقّ أن يُرى.",
        reverse:false, visibility:"branch", dose:3, order:7, qcPairId:null },
      { id:"L2_SPC_VIT_D2_OSC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d2", state:"osc", level:null,
        text:"أصمت طويلًا ثم أنفجر بكل ما عندي مرّةً واحدة، فيصل مشوَّهًا.",
        reverse:false, visibility:"branch", dose:3, order:8, qcPairId:null },

      /* البُعد ٣ — التجدّد */
      { id:"L2_SPC_VIT_D3_BAL", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d3", state:"bal", level:null,
        text:"أُكمل ما أبدأه بعد أن يذهب حماسه الأوّل.",
        reverse:false, visibility:"branch", dose:3, order:9, qcPairId:null },
      { id:"L2_SPC_VIT_D3_EXC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d3", state:"exc", level:null,
        text:"أبدأ من جديدٍ كثيرًا، وأترك ما بدأته أوّل ما يفقد بريقه.",
        reverse:false, visibility:"branch", dose:3, order:10, qcPairId:null },
      { id:"L2_SPC_VIT_D3_DEF", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d3", state:"def", level:null,
        text:"أنا في مكاني منذ سنين، لا أجرّب جديدًا ولا أتعلّم من قديم.",
        reverse:false, visibility:"branch", dose:3, order:11, qcPairId:null },
      { id:"L2_SPC_VIT_D3_OSC", layer:2, block:"spectrum", scene:null, axis:"vit", dim:"d3", state:"osc", level:null,
        text:"أثبت على حالي سنوات، ثم أقلب حياتي فجأة، ثم أثبت من جديد.",
        reverse:false, visibility:"branch", dose:3, order:12, qcPairId:null },

      /* ══ فرع الانتماء ══ */

      /* البُعد ١ — قراءة الحقل */
      { id:"L2_SPC_BEL_D1_BAL", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d1", state:"bal", level:null,
        text:"ألتقط ما بين الناس، وأستعمل ما أفهمه في تقريبهم لا في حماية نفسي.",
        reverse:false, visibility:"branch", dose:3, order:1, qcPairId:null },
      { id:"L2_SPC_BEL_D1_EXC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d1", state:"exc", level:null,
        text:"أفحص كل إشارةٍ تصلني من الناس وأقلّبها، ولا يهدأ لي بال.",
        reverse:false, visibility:"branch", dose:3, order:2, qcPairId:null },
      { id:"L2_SPC_BEL_D1_DEF", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d1", state:"def", level:null,
        text:"أغلقت انتباهي عن الناس، فلم أعد ألاحظ ما يجري بينهم.",
        reverse:false, visibility:"branch", dose:3, order:3, qcPairId:null },
      { id:"L2_SPC_BEL_D1_OSC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d1", state:"osc", level:null,
        text:"أتابع كل إشارةٍ حتى أُنهك، ثم أقطع الناس تمامًا مدّة، ثم أعود أتابع.",
        reverse:false, visibility:"branch", dose:3, order:4, qcPairId:null },

      /* البُعد ٢ — المكانة والدور */
      { id:"L2_SPC_BEL_D2_BAL", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d2", state:"bal", level:null,
        text:"أدخل الاجتماع وأنا لا أفكّر في موقعي منه، بل فيما جئت لأجله.",
        reverse:false, visibility:"branch", dose:3, order:5, qcPairId:null },
      { id:"L2_SPC_BEL_D2_EXC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d2", state:"exc", level:null,
        text:"أقيس كل موقفٍ بما يرفع موقعي أو ينزله، وأتحرّك على ذلك.",
        reverse:false, visibility:"branch", dose:3, order:6, qcPairId:null },
      { id:"L2_SPC_BEL_D2_DEF", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d2", state:"def", level:null,
        text:"تركت لنفسي أن أكون على الهامش، وأقول إنّ هذا يريحني.",
        reverse:false, visibility:"branch", dose:3, order:7, qcPairId:null },
      { id:"L2_SPC_BEL_D2_OSC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d2", state:"osc", level:null,
        text:"أسعى لمكاني بقوّةٍ مدّة، ثم أنسحب زاهدًا فيه، ثم أعود أسعى.",
        reverse:false, visibility:"branch", dose:3, order:8, qcPairId:null },

      /* البُعد ٣ — الإسهام */
      { id:"L2_SPC_BEL_D3_BAL", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d3", state:"bal", level:null,
        text:"أعتذر عن طلبٍ لا أطيقه، ولا يبقى في صدري منه شيءٌ بعدها.",
        reverse:false, visibility:"branch", dose:3, order:9, qcPairId:null },
      { id:"L2_SPC_BEL_D3_EXC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d3", state:"exc", level:null,
        text:"أقول نعم لكل طلب، وأحمل ما ليس لي حتى أُنهك.",
        reverse:false, visibility:"branch", dose:3, order:10, qcPairId:null },
      { id:"L2_SPC_BEL_D3_DEF", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d3", state:"def", level:null,
        text:"كففت عن حمل أيّ همٍّ يتجاوزني، وأقول لنفسي: ما لي وما للناس.",
        reverse:false, visibility:"branch", dose:3, order:11, qcPairId:null },
      { id:"L2_SPC_BEL_D3_OSC", layer:2, block:"spectrum", scene:null, axis:"bel", dim:"d3", state:"osc", level:null,
        text:"أحمل عن الجميع حتى أنكسر، ثم أنقطع عن الكلّ، ثم أعود أحمل.",
        reverse:false, visibility:"branch", dose:3, order:12, qcPairId:null }
    ],

    /* ─────────────── بنود التمييز · ٦ بنود ───────────────
       الأوّل يقيس تشبّع المحور كلّه (لا بُعدًا واحدًا)،
       والثاني يقيس حدّة الخوف الأساسيّ.
       متوسّطهما ≥ 5.5 يرفع شدّة كل الأبعاد درجةً واحدة. */
    discrimination: [
      { id:"L2_DSC_COH_01", layer:2, block:"discrimination", scene:null, axis:"coh", dim:null, state:null, level:null,
        role:"saturation",
        text:"جسدي ومالي وأعصابي مشدودةٌ معًا، وأيّها اهتزّ اهتزّ الباقي.",
        reverse:false, visibility:"branch", dose:3, order:13, qcPairId:null },
      { id:"L2_DSC_COH_02", layer:2, block:"discrimination", scene:null, axis:"coh", dim:null, state:null, level:null,
        role:"fearIntensity",
        text:"حتى في يومٍ هادئٍ يبقى في صدري استعدادٌ لشيءٍ سيّئٍ قادم.",
        reverse:false, visibility:"branch", dose:3, order:14, qcPairId:null },

      { id:"L2_DSC_VIT_01", layer:2, block:"discrimination", scene:null, axis:"vit", dim:null, state:null, level:null,
        role:"saturation",
        text:"أعرف أنّي كنت أكثر حياةً ممّا أنا عليه، ولا أعرف متى انطفأت.",
        reverse:false, visibility:"branch", dose:3, order:13, qcPairId:null },
      { id:"L2_DSC_VIT_02", layer:2, block:"discrimination", scene:null, axis:"vit", dim:null, state:null, level:null,
        role:"fearIntensity",
        text:"حين أخلو إلى نفسي بلا انشغالٍ يظهر فراغٌ يخيفني، فأبحث عن شاغل.",
        reverse:false, visibility:"branch", dose:3, order:14, qcPairId:null },

      { id:"L2_DSC_BEL_01", layer:2, block:"discrimination", scene:null, axis:"bel", dim:null, state:null, level:null,
        role:"saturation",
        text:"أشعر أنّ مكاني بين الناس مُعار، وأنّ خطأً واحدًا قد يسحبه منّي.",
        reverse:false, visibility:"branch", dose:3, order:13, qcPairId:null },
      { id:"L2_DSC_BEL_02", layer:2, block:"discrimination", scene:null, axis:"bel", dim:null, state:null, level:null,
        role:"fearIntensity",
        text:"أعطي الناس كثيرًا، ثم تعلق في صدري مرارةٌ لأنّ أحدًا لا يسأل عنّي.",
        reverse:false, visibility:"branch", dose:3, order:14, qcPairId:null }
    ],

    /* ─────────────── نبضة المحاور الثلاثة · ٣ بنود · للجميع ───────────────
       تكشف انتشار النزيف خارج المحور الرئيسيّ، وتغذّي ميل المكبوت. */
    pulse: [
      { id:"L2_PLS_COH", layer:2, block:"pulse", scene:null, axis:"coh", dim:null, state:null, level:null,
        text:"أرضي الثابتة تهتزّ: جسدي أو مالي أو أعصابي، شيءٌ منها ليس على ما يرام.",
        reverse:false, visibility:"always", dose:3, order:15, qcPairId:null },
      { id:"L2_PLS_VIT", layer:2, block:"pulse", scene:null, axis:"vit", dim:null, state:null, level:null,
        text:"النار التي كانت فيّ خفتت، وأنا أعرف ذلك.",
        reverse:false, visibility:"always", dose:3, order:16, qcPairId:null },
      { id:"L2_PLS_BEL", layer:2, block:"pulse", scene:null, axis:"bel", dim:null, state:null, level:null,
        text:"مكاني بين الناس ليس كما كان، وأنا أحسّ ذلك.",
        reverse:false, visibility:"always", dose:3, order:17, qcPairId:null }
    ]
  },

  /* ══════════════════════════════════════════════════════════════════════
     ٥ — الطبقة الثالثة · البيئة (٢٧ بندًا مكتوبًا · ٩ معروضة)

     متفرّعة على المحور الرئيسيّ. أربع مجموعات:
       supply    هل يُقدَّم لك ما يغذّي اتجاهك؟   (٣)
       reception هل يصل إليك ما يُقدَّم؟          (٢)
       balance   هل تُعطي أكثر ممّا يعود؟         (٢)
       trend     الاتجاه العام                    (٢، أحدهما إيجابيّ معكوس)

     كل البنود في اتجاه «الغياب» عدا بندًا إيجابيًّا واحدًا لكسر الرتابة —
     فالحساب مباشر، وخطر انقلاب العكس شبه معدوم.
     ══════════════════════════════════════════════════════════════════════ */
  L3: [

    /* ══ فرع التماسك ══ */
    { id:"L3_ENV_COH_S1", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"supply",
      text:"في عملي غموضٌ دائم: لا أعرف ما هو ثابتٌ وما يمكن أن يتغيّر غدًا.",
      reverse:false, visibility:"branch", dose:4, order:1, qcPairId:null },
    { id:"L3_ENV_COH_S2", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"supply",
      text:"طبيعة عملي لا تسمح لي بأن أنظّم نومي ووقتي بشكلٍ معقول.",
      reverse:false, visibility:"branch", dose:4, order:2, qcPairId:null },
    { id:"L3_ENV_COH_S3", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"supply",
      text:"ما أحصل عليه من عملي لا يكفي احتياجاتي بلا شدٍّ مستمرّ.",
      reverse:false, visibility:"branch", dose:4, order:3, qcPairId:null },
    { id:"L3_ENV_COH_R1", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"reception",
      text:"حين يتحسّن وضعي فعلًا، لا أشعر بالفرق: أعرفه بعقلي ولا يستقرّ فيّ.",
      reverse:false, visibility:"branch", dose:4, order:4, qcPairId:null },
    { id:"L3_ENV_COH_R2", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"reception",
      text:"الاستقرار الذي وصلت إليه لا يعطيني طمأنينة، وكأنّه لم يحدث.",
      reverse:false, visibility:"branch", dose:4, order:5, qcPairId:null },
    { id:"L3_ENV_COH_X1", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"balance",
      text:"عملي يطلب منّي أكثر ممّا يعطيني من أمانٍ أو وضوحٍ أو راحة.",
      reverse:false, visibility:"branch", dose:4, order:6, qcPairId:null },
    { id:"L3_ENV_COH_X2", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"balance",
      text:"أُنفق من صحّتي ووقتي أكثر ممّا يعود إليّ منهما.",
      reverse:false, visibility:"branch", dose:4, order:7, qcPairId:null },
    { id:"L3_ENV_COH_G1", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"trend",
      text:"حين أنظر إلى وضعي، أشعر أنّ الأرض تحتي تصير أثبت مع الوقت.",
      reverse:true, visibility:"branch", dose:4, order:8, qcPairId:null },
    { id:"L3_ENV_COH_G2", layer:3, block:"env", scene:null, axis:"coh", dim:null, state:null, level:null,
      group:"trend",
      text:"أشعر أنّي أستهلك من رصيدٍ قديمٍ ولا أضيف إليه.",
      reverse:false, visibility:"branch", dose:4, order:9, qcPairId:null },

    /* ══ فرع الحيوية ══ */
    { id:"L3_ENV_VIT_S1", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"supply",
      text:"في عملي مهامٌّ تُنجَز، وليس فيه ما يستحقّ أن أشتعل له.",
      reverse:false, visibility:"branch", dose:4, order:1, qcPairId:null },
    { id:"L3_ENV_VIT_S2", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"supply",
      text:"طبيعة عملي لا تترك لي مساحةً أُجرّب فيها أو أُدخل شيئًا من عندي.",
      reverse:false, visibility:"branch", dose:4, order:2, qcPairId:null },
    { id:"L3_ENV_VIT_S3", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"supply",
      text:"حولي تعاملٌ وظيفيّ، وليس فيه من أحسّ معه بحياةٍ حقيقيّة.",
      reverse:false, visibility:"branch", dose:4, order:3, qcPairId:null },
    { id:"L3_ENV_VIT_R1", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"reception",
      text:"حين يحدث في عملي شيءٌ جيّدٌ أو مثير، لا أشعر به: أعرفه بعقلي ولا يستقرّ فيّ.",
      reverse:false, visibility:"branch", dose:4, order:4, qcPairId:null },
    { id:"L3_ENV_VIT_R2", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"reception",
      text:"الأشياء التي كانت تُشعلني صارت لا تحرّك فيّ شيئًا.",
      reverse:false, visibility:"branch", dose:4, order:5, qcPairId:null },
    { id:"L3_ENV_VIT_X1", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"balance",
      text:"عملي يستهلك حماسي ولا يعيد إليّ شيئًا منه.",
      reverse:false, visibility:"branch", dose:4, order:6, qcPairId:null },
    { id:"L3_ENV_VIT_X2", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"balance",
      text:"أُعطي طاقتي في أماكن لا أرى فيها أثرًا لما أعطيته.",
      reverse:false, visibility:"branch", dose:4, order:7, qcPairId:null },
    { id:"L3_ENV_VIT_G1", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"trend",
      text:"حين أنظر إلى مساري، أشعر أنّي أنمو وأتجدّد مع الوقت.",
      reverse:true, visibility:"branch", dose:4, order:8, qcPairId:null },
    { id:"L3_ENV_VIT_G2", layer:3, block:"env", scene:null, axis:"vit", dim:null, state:null, level:null,
      group:"trend",
      text:"أيّامي تتشابه إلى حدّ أنّي لا أميّز أسبوعًا عن أسبوع.",
      reverse:false, visibility:"branch", dose:4, order:9, qcPairId:null },

    /* ══ فرع الانتماء ══ */
    { id:"L3_ENV_BEL_S1", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"supply",
      text:"مكاني في عملي غير واضح: لا أعرف تمامًا ما دوري ولا يعرفه من حولي.",
      reverse:false, visibility:"branch", dose:4, order:1, qcPairId:null },
    { id:"L3_ENV_BEL_S2", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"supply",
      text:"حولي زملاء ولست جزءًا منهم فعلًا.",
      reverse:false, visibility:"branch", dose:4, order:2, qcPairId:null },
    { id:"L3_ENV_BEL_S3", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"supply",
      text:"ما أقدّمه لا يراه من يعنيني رأيهم.",
      reverse:false, visibility:"branch", dose:4, order:3, qcPairId:null },
    { id:"L3_ENV_BEL_R1", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"reception",
      text:"حين يصلني تقدير، يمرّ عليّ ولا يستقرّ في مكانٍ يشبعني.",
      reverse:false, visibility:"branch", dose:4, order:4, qcPairId:null },
    { id:"L3_ENV_BEL_R2", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"reception",
      text:"أسمع كلمات التقدير وأشكّ في صدقها، أو أراها أقلّ ممّا بذلت.",
      reverse:false, visibility:"branch", dose:4, order:5, qcPairId:null },
    { id:"L3_ENV_BEL_X1", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"balance",
      text:"أحمل عن الناس أكثر ممّا يحمل أحدٌ عنّي.",
      reverse:false, visibility:"branch", dose:4, order:6, qcPairId:null },
    { id:"L3_ENV_BEL_X2", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"balance",
      text:"أنا حاضرٌ لمن حولي في وقت حاجتهم، ولا أجد من يحضر لي.",
      reverse:false, visibility:"branch", dose:4, order:7, qcPairId:null },
    { id:"L3_ENV_BEL_G1", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"trend",
      text:"حين أنظر إلى علاقاتي المهنيّة، أشعر أنّها تصير أعمق مع الوقت.",
      reverse:true, visibility:"branch", dose:4, order:8, qcPairId:null },
    { id:"L3_ENV_BEL_G2", layer:3, block:"env", scene:null, axis:"bel", dim:null, state:null, level:null,
      group:"trend",
      text:"صرت أشعر بالوحدة وسط الناس أكثر ممّا كنت.",
      reverse:false, visibility:"branch", dose:4, order:9, qcPairId:null }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٦ — الطبقة الرابعة · الوظيفية والوجه الآليّ (٢١ بندًا · ١٥ معروضًا)

     أربعة مؤشّراتٍ مستقلّة لا تُجمع في درجةٍ واحدة، لأنّها لا تقيس بناءً
     واحدًا: قد تنهار الوظيفية الذاتيّة وحدها مع بقاء الباقي سليمًا،
     وقد يكون الأداء ممتازًا ووقودُه مسمومًا.
     ══════════════════════════════════════════════════════════════════════ */
  L4: {

    /* ─── الوظيفية · ١٢ بندًا · للجميع ─── */
    functionality: [

      /* (١) الوظيفية الذاتيّة — هل يمرّ ما تعرفه إلى ما تفعله، فيما يخصّك أنت */
      { id:"L4_SLF_01", layer:4, block:"slf", scene:null, axis:null, dim:null, state:null, level:null,
        text:"أؤجّل ما يخصّني أنا، وأُنجز ما يخصّ غيري في وقته.",
        reverse:false, visibility:"always", dose:5, order:1, qcPairId:null },
      { id:"L4_SLF_02", layer:4, block:"slf", scene:null, axis:null, dim:null, state:null, level:null,
        text:"أعرف منذ مدّةٍ ما ينبغي أن أغيّره في حياتي، ولم أبدأ بعد.",
        reverse:false, visibility:"always", dose:5, order:2, qcPairId:null },
      { id:"L4_SLF_03", layer:4, block:"slf", scene:null, axis:null, dim:null, state:null, level:null,
        text:"حين أقرّر شيئًا لنفسي، أجدني بعد أيّامٍ قد عدت إلى ما كنت عليه.",
        reverse:false, visibility:"always", dose:5, order:3, qcPairId:"QC_03" },
      { id:"L4_SLF_04", layer:4, block:"slf", scene:null, axis:null, dim:null, state:null, level:null,
        text:"أفعل ما ينبغي لنفسي حين أقرّره، لا حين تضطرّني الظروف.",
        reverse:true, visibility:"always", dose:5, order:4, qcPairId:null },

      /* (٢) نقاء الوقود — بأيّ شيءٍ تتحرّك */
      { id:"L4_FUE_01", layer:4, block:"fue", scene:null, axis:null, dim:null, state:null, level:null,
        text:"لا أبدأ إلّا حين يقترب الموعد أو يشتدّ الضغط.",
        reverse:false, visibility:"always", dose:5, order:5, qcPairId:null },
      { id:"L4_FUE_02", layer:4, block:"fue", scene:null, axis:null, dim:null, state:null, level:null,
        text:"أُنجز أفضل ما عندي حين يكون هناك ما أخافه.",
        reverse:false, visibility:"always", dose:5, order:6, qcPairId:null },
      { id:"L4_FUE_03", layer:4, block:"fue", scene:null, axis:null, dim:null, state:null, level:null,
        text:"حين تهدأ الأمور، لا أجد ما يدفعني للحركة.",
        reverse:false, visibility:"always", dose:5, order:7, qcPairId:null },

      /* (٣) الفاعليّة — هل تختار أم تُساق */
      { id:"L4_AGN_01", layer:4, block:"agn", scene:null, axis:null, dim:null, state:null, level:null,
        text:"تمضي بي حياتي، ولا أشعر أنّي أختار فيها كثيرًا.",
        reverse:false, visibility:"always", dose:5, order:8, qcPairId:null },
      { id:"L4_AGN_02", layer:4, block:"agn", scene:null, axis:null, dim:null, state:null, level:null,
        text:"معظم ما أفعله في يومي ليس لأنّي اخترته، بل لأنّه مطلوبٌ منّي.",
        reverse:false, visibility:"always", dose:5, order:9, qcPairId:null },
      { id:"L4_AGN_03", layer:4, block:"agn", scene:null, axis:null, dim:null, state:null, level:null,
        text:"حين أفكّر في السنتين القادمتين، لا أعرف ماذا أريد فيهما.",
        reverse:false, visibility:"always", dose:5, order:10, qcPairId:"QC_02" },

      /* (٤) الحمل المضاعف — يُحسب ولا يُعرَض للمشارك، ومادّتُه للقاع */
      { id:"L4_DBL_01", layer:4, block:"dbl", scene:null, axis:null, dim:null, state:null, level:null,
        text:"هناك جانبٌ في حياتي أُتقنه إلى حدّ المبالغة، وجانبٌ آخر مهملٌ تمامًا.",
        reverse:false, visibility:"always", dose:5, order:11, qcPairId:null },
      { id:"L4_DBL_02", layer:4, block:"dbl", scene:null, axis:null, dim:null, state:null, level:null,
        text:"حين ينقصني شيءٌ في ناحية، أجدني أضاعف جهدي في ناحيةٍ أخرى.",
        reverse:false, visibility:"always", dose:5, order:12, qcPairId:null }
    ],

    /* ─── الوجه الآليّ · ٩ بنود مكتوبة · ٣ معروضة ─── */
    automaticFace: [

      /* التماسك — الآليّة */
      { id:"L4_AUT_COH_01", layer:4, block:"aut", scene:null, axis:"coh", dim:null, state:null, level:null,
        text:"تمرّ أسابيعي متشابهة، أؤدّيها بلا حضور، ثم أنتبه فجأةً أنّ الشهر انتهى.",
        reverse:false, visibility:"branch", dose:5, order:13, qcPairId:null },
      { id:"L4_AUT_COH_02", layer:4, block:"aut", scene:null, axis:"coh", dim:null, state:null, level:null,
        text:"أفعل أشياء كثيرةً في يومي بلا أن أكون فيها، كأنّ أحدًا آخر يؤدّيها عنّي.",
        reverse:false, visibility:"branch", dose:5, order:14, qcPairId:null },
      { id:"L4_AUT_COH_03", layer:4, block:"aut", scene:null, axis:"coh", dim:null, state:null, level:null,
        text:"حين أحاول تغيير شيءٍ في روتيني أجد نفسي عائدًا إليه بلا قرار.",
        reverse:false, visibility:"branch", dose:5, order:15, qcPairId:null },

      /* الحيوية — الاختزال */
      { id:"L4_AUT_VIT_01", layer:4, block:"aut", scene:null, axis:"vit", dim:null, state:null, level:null,
        text:"صرت أرى نفسي والناس بما نؤدّيه من أدوار، لا بما نحن عليه.",
        reverse:false, visibility:"branch", dose:5, order:13, qcPairId:null },
      { id:"L4_AUT_VIT_02", layer:4, block:"aut", scene:null, axis:"vit", dim:null, state:null, level:null,
        text:"أتعامل مع جسدي كأداةٍ تؤدّي مهامّي، لا كشيءٍ أنا فيه.",
        reverse:false, visibility:"branch", dose:5, order:14, qcPairId:null },
      { id:"L4_AUT_VIT_03", layer:4, block:"aut", scene:null, axis:"vit", dim:null, state:null, level:null,
        text:"حين ألتقي أحدًا أقيسه سريعًا بما يمكن أن يقدّمه لي أو أقدّمه له.",
        reverse:false, visibility:"branch", dose:5, order:15, qcPairId:null },

      /* الانتماء — التموضع */
      { id:"L4_AUT_BEL_01", layer:4, block:"aut", scene:null, axis:"bel", dim:null, state:null, level:null,
        text:"ألبس دورًا في كل مكانٍ أدخله، ولا أعرف كيف أكون بلا دور.",
        reverse:false, visibility:"branch", dose:5, order:13, qcPairId:null },
      { id:"L4_AUT_BEL_02", layer:4, block:"aut", scene:null, axis:"bel", dim:null, state:null, level:null,
        text:"أبني في ذهني صورةً عمّا يفكّر فيه الناس تجاهي، وأتعامل معها كأنّها حقيقة.",
        reverse:false, visibility:"branch", dose:5, order:14, qcPairId:null },
      { id:"L4_AUT_BEL_03", layer:4, block:"aut", scene:null, axis:"bel", dim:null, state:null, level:null,
        text:"أنسحب من علاقةٍ قبل أن تكتمل، حتى لا أُفاجَأ برفضٍ لا أطيقه.",
        reverse:false, visibility:"branch", dose:5, order:15, qcPairId:null }
    ]
  },

  /* ══════════════════════════════════════════════════════════════════════
     ٧ — الطبقة الخامسة · نبضة الإحساس (٩ بنود)

     ★ قاعدة مقدّسة: هذه البنود لا تتغيّر أبدًا — لا صياغةً، ولا ترتيبًا،
       ولا مراسي. لأنّها تُعاد تسع مرّاتٍ عبر الرحلة، وأيّ تغييرٍ يكسر
       قابليّة المقارنة، والقيمة كلّها في المقارنة.

     ★ كلّها في اتجاهٍ واحد (سلبيّ)، والعكس يقع في معادلة خطّ العافية
       (8 − المتوسّط) لا في البند — فلا تُعلَّم reverse.

     ★ inShort يحدّد البنود الستّة التي تدخل النبضة الأسبوعيّة المختصرة،
       وهي مستخرجةٌ حرفيًّا من التسعة لا مختصرةٌ منها.
     ══════════════════════════════════════════════════════════════════════ */
  L5: [
    { id:"L5_WBG_VIG_01", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"vig",
      text:"أستيقظ متعبًا حتى بعد نومٍ كافٍ.",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:1, qcPairId:"QC_01" },
    { id:"L5_WBG_VIG_02", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"vig",
      text:"صارت المهمّة البسيطة تأخذ منّي جهدًا غير معتاد.",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:2, qcPairId:null },
    { id:"L5_WBG_VIG_03", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"vig",
      text:"أشعر أنّي فارغٌ من الداخل، وأنّ ما يدخل عليّ لا يبقى.",
      inShort:false, reverse:false, visibility:"always", dose:6, order:3, qcPairId:null },

    { id:"L5_WBG_PRS_01", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"prs",
      text:"صرت بعيدًا حتى عمّن أحبّهم.",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:4, qcPairId:null },
    { id:"L5_WBG_PRS_02", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"prs",
      text:"أتعامل مع المقرّبين منّي كأنّهم مهامٌّ في قائمة.",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:5, qcPairId:null },
    { id:"L5_WBG_PRS_03", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"prs",
      text:"أحضر بجسدي في اللقاءات وأنا غائبٌ عنها.",
      inShort:false, reverse:false, visibility:"always", dose:6, order:6, qcPairId:null },

    { id:"L5_WBG_FUL_01", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"ful",
      text:"أسأل نفسي كثيرًا: لماذا أفعل كل هذا؟",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:7, qcPairId:null },
    { id:"L5_WBG_FUL_02", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"ful",
      text:"فقدت الإحساس بأنّ ما أعمله يغيّر شيئًا.",
      inShort:true,  reverse:false, visibility:"always", dose:6, order:8, qcPairId:null },
    { id:"L5_WBG_FUL_03", layer:5, block:"wbg", scene:null, axis:null, dim:null, state:null, level:"ful",
      text:"أنا ناجحٌ في عين الناس، وفارغٌ في نفسي.",
      inShort:false, reverse:false, visibility:"always", dose:6, order:9, qcPairId:null }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٨ — ضبط الجودة (٣ بنود)

     وظيفتها كشف الإجابة غير المتمعّنة، لا كشف الكذب.
     موزَّعة عمدًا في جرعاتٍ غير جرعات نظائرها، حتى لا يلاحظ المستجيب
     التناظر فيجيب باتّساقٍ مصطنع.
     المتوقَّع أن يقرب مجموع كل زوجٍ من ٨.
     ══════════════════════════════════════════════════════════════════════ */
  QC: [
    { id:"QC_01", layer:5, block:"qc", scene:null, axis:null, dim:null, state:null, level:null,
      text:"أنام نومًا كافيًا وأستيقظ مرتاحًا.",
      pairsWith:"L5_WBG_VIG_01",
      reverse:false, visibility:"always", dose:4, order:10, qcPairId:"L5_WBG_VIG_01" },
    { id:"QC_02", layer:5, block:"qc", scene:null, axis:null, dim:null, state:null, level:null,
      text:"أعرف تمامًا ما أريده في هذه المرحلة من حياتي.",
      pairsWith:"L4_AGN_03",
      reverse:false, visibility:"always", dose:6, order:10, qcPairId:"L4_AGN_03" },
    { id:"QC_03", layer:5, block:"qc", scene:null, axis:null, dim:null, state:null, level:null,
      text:"حين أقرّر شيئًا لنفسي أمضي فيه إلى آخره.",
      pairsWith:"L4_SLF_03",
      reverse:false, visibility:"always", dose:3, order:18, qcPairId:"L4_SLF_03" }
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ٩ — السؤال الفارز (٣ بنود مكتوبة · شرطيّ)

     يظهر واحدٌ منها فورًا بعد الجرعة الثانية إن كان الفرق بين أعلى A
     والذي يليه أقلّ من العتبة. اختيارٌ ثنائيّ لا تقييم ليكرت.
     الخياران بصيغةٍ حياتيّةٍ بلا أسماء المحاور — حتى لا يُختار بالمعرفة.
     ══════════════════════════════════════════════════════════════════════ */
  tieBreakers: [
    {
      id:"TIE_COH_VIT", layer:1, block:"tie", scene:null,
      pair:["coh","vit"], type:"choice",
      optionA:{ axis:"coh", text:"أن يكون وضعي ثابتًا هادئًا، ولو كان يومي متكرّرًا." },
      optionB:{ axis:"vit", text:"أن يكون في يومي ما يوقظني، ولو كان وضعي غير مستقرّ." },
      reverse:false, visibility:"conditional", dose:2, order:16, qcPairId:null
    },
    {
      id:"TIE_COH_BEL", layer:1, block:"tie", scene:null,
      pair:["coh","bel"], type:"choice",
      optionA:{ axis:"coh", text:"أن يكون وضعي ثابتًا، ولو كنت وحدي فيه." },
      optionB:{ axis:"bel", text:"أن أكون بين ناسٍ لي مكانٌ بينهم، ولو كان وضعي غير مستقرّ." },
      reverse:false, visibility:"conditional", dose:2, order:16, qcPairId:null
    },
    {
      id:"TIE_VIT_BEL", layer:1, block:"tie", scene:null,
      pair:["vit","bel"], type:"choice",
      optionA:{ axis:"vit", text:"أن أعيش ما يوقظني، ولو لم يره أحد." },
      optionB:{ axis:"bel", text:"أن يكون لي مكانٌ وأثر، ولو كان ما أفعله متكرّرًا." },
      reverse:false, visibility:"conditional", dose:2, order:16, qcPairId:null
    }
  ],

  /* نصّ مقدّمة السؤال الفارز */
  tieBreakerIntro:
    "سؤالٌ أخير.\n\n" +
    "اتّجاهان فيك متقاربان، ونحبّ أن نتأكّد.\n\n" +
    "تخيّل أنّك مضطرٌّ للتخلّي عن أحدهما سنةً كاملة. أيّهما التخلّي عنه أصعب؟"
};

/* ════════════════════════════════════════════════════════════════════════
   دوالّ وصولٍ صغيرة — قراءةٌ وترشيحٌ فقط، لا حساب.
   ════════════════════════════════════════════════════════════════════════ */

/* كل البنود مسطَّحةً في مصفوفةٍ واحدة (تُبنى مرّةً وتُخزَّن) */
BURN_ITEMS._flat = null;
BURN_ITEMS.all = function () {
  if (BURN_ITEMS._flat) return BURN_ITEMS._flat;
  var out = [];
  out = out.concat(BURN_ITEMS.filters);
  out = out.concat(BURN_ITEMS.L1);
  out = out.concat(BURN_ITEMS.L2.spectrum, BURN_ITEMS.L2.discrimination, BURN_ITEMS.L2.pulse);
  out = out.concat(BURN_ITEMS.L3);
  out = out.concat(BURN_ITEMS.L4.functionality, BURN_ITEMS.L4.automaticFace);
  out = out.concat(BURN_ITEMS.L5);
  out = out.concat(BURN_ITEMS.QC);
  out = out.concat(BURN_ITEMS.tieBreakers);
  BURN_ITEMS._flat = out;
  return out;
};

/* بندٌ بمعرّفه */
BURN_ITEMS.byId = function (id) {
  return BURN_ITEMS.all().find(function (it) { return it.id === id; }) || null;
};

/* كل بنود جرعةٍ ما (قبل التفريع) */
BURN_ITEMS.byDose = function (doseId) {
  return BURN_ITEMS.all().filter(function (it) { return it.dose === doseId; });
};

/* كل بنود كتلةٍ ما */
BURN_ITEMS.byBlock = function (blockKey) {
  return BURN_ITEMS.all().filter(function (it) { return it.block === blockKey; });
};

/* ★ الترشيح الحاسم: ما يراه مشاركٌ محورُه axisId في جرعةٍ ما.
   البنود الثابتة تُعرَض للجميع، والمتفرّعة لصاحب محورها وحده،
   والشرطيّة لا تُعرَض هنا (يقرّرها التطبيق). */
BURN_ITEMS.forParticipant = function (axisId, doseId) {
  return BURN_ITEMS.byDose(doseId)
    .filter(function (it) {
      if (it.visibility === "conditional") return false;
      if (it.visibility === "branch") return it.axis === axisId;
      return true;
    })
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
};

/* السؤال الفارز المناسب لزوجٍ من المحاور */
BURN_ITEMS.tieBreakerFor = function (axisA, axisB) {
  return BURN_ITEMS.tieBreakers.find(function (t) {
    return t.pair.indexOf(axisA) > -1 && t.pair.indexOf(axisB) > -1;
  }) || null;
};

/* بنود النبضة الأسبوعيّة المختصرة (الستّة) */
BURN_ITEMS.shortPulseItems = function () {
  return BURN_ITEMS.L5.filter(function (it) { return it.inShort === true; });
};

/* ════════════════════════════════════════════════════════════════════════
   تحقّق السلامة — يُستدعى في التطوير لا في الإنتاج.
   يعدّ البنود، ويفحص تفرّد المعرّفات، ويتأكّد من اكتمال الطيف،
   ومن تطابق أزواج ضبط الجودة، ومن عدد ما يراه مشاركٌ واحد.
   ════════════════════════════════════════════════════════════════════════ */
BURN_ITEMS.verify = function () {
  var issues = [];
  var all = BURN_ITEMS.all();

  /* ١ — العدد الكلّيّ */
  if (all.length !== 143) issues.push("العدد الكلّيّ " + all.length + " والمتوقَّع ١٤٣");

  /* ٢ — تفرّد المعرّفات */
  var seen = {};
  all.forEach(function (it) {
    if (seen[it.id]) issues.push("معرّف مكرّر: " + it.id);
    seen[it.id] = true;
  });

  /* ٣ — اكتمال الطيف: ٣ محاور × ٣ أبعاد × ٤ حالات */
  ["coh", "vit", "bel"].forEach(function (ax) {
    ["d1", "d2", "d3"].forEach(function (d) {
      ["bal", "exc", "def", "osc"].forEach(function (s) {
        var found = BURN_ITEMS.L2.spectrum.some(function (it) {
          return it.axis === ax && it.dim === d && it.state === s;
        });
        if (!found) issues.push("بند طيفٍ ناقص: " + ax + "/" + d + "/" + s);
      });
    });
  });

  /* ٤ — التمييز: بندان لكل محور */
  ["coh", "vit", "bel"].forEach(function (ax) {
    var n = BURN_ITEMS.L2.discrimination.filter(function (it) { return it.axis === ax; }).length;
    if (n !== 2) issues.push("بنود تمييز " + ax + ": " + n + " والمتوقَّع ٢");
  });

  /* ٥ — البيئة: تسعة لكل محور، وبندٌ إيجابيٌّ واحد */
  ["coh", "vit", "bel"].forEach(function (ax) {
    var branch = BURN_ITEMS.L3.filter(function (it) { return it.axis === ax; });
    if (branch.length !== 9) issues.push("بنود بيئة " + ax + ": " + branch.length + " والمتوقَّع ٩");
    var rev = branch.filter(function (it) { return it.reverse; }).length;
    if (rev !== 1) issues.push("بنود بيئة " + ax + " العكسيّة: " + rev + " والمتوقَّع ١");
  });

  /* ٦ — الوجه الآليّ: ثلاثة لكل محور */
  ["coh", "vit", "bel"].forEach(function (ax) {
    var n = BURN_ITEMS.L4.automaticFace.filter(function (it) { return it.axis === ax; }).length;
    if (n !== 3) issues.push("بنود الوجه الآليّ " + ax + ": " + n + " والمتوقَّع ٣");
  });

  /* ٧ — أزواج ضبط الجودة متبادلة */
  BURN_ITEMS.QC.forEach(function (q) {
    var partner = BURN_ITEMS.byId(q.pairsWith);
    if (!partner) issues.push("نظير ضبط الجودة مفقود: " + q.pairsWith);
    else if (partner.qcPairId !== q.id) issues.push("الزوج غير متبادل: " + q.id + " ↔ " + q.pairsWith);
    else if (partner.dose === q.dose) issues.push("زوج ضبط الجودة في نفس الجرعة: " + q.id);
  });

  /* ٨ — النبضة المختصرة ستّة بنود */
  if (BURN_ITEMS.shortPulseItems().length !== 6)
    issues.push("بنود النبضة المختصرة: " + BURN_ITEMS.shortPulseItems().length + " والمتوقَّع ٦");

  /* ٩ — ما يراه مشاركٌ واحد لكل محور */
  var perAxis = {};
  ["coh", "vit", "bel"].forEach(function (ax) {
    var total = 0;
    [1, 2, 3, 4, 5, 6].forEach(function (d) {
      total += BURN_ITEMS.forParticipant(ax, d).length;
    });
    perAxis[ax] = total;
    if (total !== 88) issues.push("المعروض لمحور " + ax + ": " + total + " والمتوقَّع ٨٨");
  });

  return {
    ok: issues.length === 0,
    issues: issues,
    counts: {
      written: all.length,
      shownPerAxis: perAxis,
      byLayer: {
        filters: BURN_ITEMS.filters.length,
        L1: BURN_ITEMS.L1.length,
        L2: BURN_ITEMS.L2.spectrum.length + BURN_ITEMS.L2.discrimination.length + BURN_ITEMS.L2.pulse.length,
        L3: BURN_ITEMS.L3.length,
        L4: BURN_ITEMS.L4.functionality.length + BURN_ITEMS.L4.automaticFace.length,
        L5: BURN_ITEMS.L5.length,
        QC: BURN_ITEMS.QC.length,
        tie: BURN_ITEMS.tieBreakers.length
      }
    }
  };
};

/* ════════════════════════════════════════════════════════════════════════
   تصدير مزدوج
   ════════════════════════════════════════════════════════════════════════ */
if (typeof module !== "undefined" && module.exports) {
  module.exports = BURN_ITEMS;
}
if (typeof window !== "undefined") {
  window.BURN_ITEMS = BURN_ITEMS;
  console.log("✅ BURN_ITEMS جاهز — " + BURN_ITEMS.all().length + " بندًا مكتوبًا");
}
