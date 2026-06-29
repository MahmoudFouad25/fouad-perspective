/* ════════════════════════════════════════════════════════════════════════
   cross-config.js — العمود الفقريّ للتقاطع (mirrors-axes)
   ────────────────────────────────────────────────────────────────────────
   بيانات نقيّة: لا منطق، لا عرض، لا HTML. يُقرأ في زمن التشغيل.
   يحدّد بنية التقاطع وأسماء المفاتيح التي يلتزم بها المحرّك والمحتوى والعرض.

   المبدأ الحاكم (لا يُخرَق):
     الطابع من القلب (المرايا)، المسار من النفس (المسارات)، متعامدان.
     نقطة القوّة = بُعد المسار × الطابع → تقاطعٌ لا استنتاج.

   ملاحظة على الأسماء التي تواجه العميل:
     • لا يُعرَض للعميل رقمُ طابعٍ ولا اسمُ طابعٍ ولا اسمُ مسارٍ ولا اسمُ بصمة.
     • أسماء البصمات (حارس الذات…) وأسماء المسارات (التماسك…) داخليّةٌ للكوتش فقط.
     • الذي يراه العميل: «نقاط قوّتك» ومسار رجوعها للاتزان، بلا تسمياتٍ كاشفة.
   ════════════════════════════════════════════════════════════════════════ */

const CROSS_CONFIG = {

  meta: {
    version: "1.0",
    module: "mirrors-axes",
    product: "intersection",
    // النطاق: الوسط الذكيّ — عنقودا الرئيسيّ + المكبوت (٦ نقاط قوّة تُقرأ).
    scope: "primary+repressed",
    clientFacingName: "نقاط قوّتك"   // اسم العرض للعميل (لا «تقاطع» ولا «احتراق»)
  },

  /* ════════════════════ الطبائع التسعة ════════════════════
     مفاتيح برقم الطابع "1".."9". الاسم والأيقونة والمركز — داخليّ للكوتش فقط.
     مطابق لـ TYPE_INFO في لوحة الأدمن كي يتّسق العرض الإداريّ. */
  types: {
    "1": { num: "1", name: "المُحسِّن المُتقِن",   icon: "⚖️", center: "agency"    },
    "2": { num: "2", name: "العطوف المُعطي",      icon: "💚", center: "bonding"   },
    "3": { num: "3", name: "الناجح المُنجِز",      icon: "🏆", center: "bonding"   },
    "4": { num: "4", name: "الحالم العميق",        icon: "🎨", center: "bonding"   },
    "5": { num: "5", name: "المُفكّر المُتأمّل",    icon: "🧠", center: "certainty" },
    "6": { num: "6", name: "الحذِر المُستعِدّ",    icon: "🛡️", center: "certainty" },
    "7": { num: "7", name: "المُتفائل المُتحمّس",  icon: "✨", center: "certainty" },
    "8": { num: "8", name: "القويّ المؤثّر",       icon: "🔴", center: "agency"    },
    "9": { num: "9", name: "الوسيط الهادئ",        icon: "☮️", center: "agency"    }
  },

  /* مراكز القوى الثلاث (للتوليفة) — مطابقة للأدمن والمحرّك. */
  centers: [
    { key: "agency",    label: "الهمّة والعزيمة", types: ["1", "8", "9"] },
    { key: "bonding",   label: "الأنس والقرب",     types: ["2", "3", "4"] },
    { key: "certainty", label: "اليقين والبيان",   types: ["5", "6", "7"] }
  ],

  /* ════════════════════ المسارات الثلاثة وأبعادها ════════════════════
     مطابقة لـ axes-config حرفيًّا (id + dimensions). الاسم داخليّ للكوتش.
     لكل بُعدٍ سؤالٌ محوريّ يُذكّر الكوتش بما يقيسه (لا يُعرَض للعميل). */
  axes: {
    tamasuk: {
      id: "tamasuk", name: "التماسك والاستقرار", center: "agency-ish",
      energy: "صون الذات وتأمين البقاء واستقرار العالم",
      dims: [
        { id: "jasad",   name: "رعاية الجسد"    },
        { id: "mawarid", name: "تأمين الموارد"  },
        { id: "tanzim",  name: "التنظيم الذاتيّ" }
      ]
    },
    hayawiyya: {
      id: "hayawiyya", name: "الحيوية والتجدد",
      energy: "الاتصال المكثّف والاشتعال الداخليّ والتجدد",
      dims: [
        { id: "ishtial",   name: "الاشتعال والحضور"  },
        { id: "jazibiyya", name: "الجاذبية والتأثير" },
        { id: "tajaddud",  name: "التجدد والتحوّل"   }
      ]
    },
    intima: {
      id: "intima", name: "الانتماء والمشاركة",
      energy: "المجموعة والمكانة والدور والإسهام فيما هو أكبر من الذات",
      dims: [
        { id: "qiraa",  name: "قراءة الحقل"        },
        { id: "makana", name: "المكانة والدور"     },
        { id: "ishaam", name: "الإسهام والمسؤولية" }
      ]
    }
  },

  axisOrder: ["tamasuk", "hayawiyya", "intima"],

  /* ════════════════════ حالات الطيف ════════════════════
     ثلاث حالاتٍ أساسيّة + حالتا علمٍ لا تُحسَمان (تُفرَزان في الجلسة). */
  spectrumStates: {
    balance: { key: "balance", label: "اتزان", face: "fitra",  resolved: true  },
    excess:  { key: "excess",  label: "إفراط", face: "qina",   resolved: true  },
    deficit: { key: "deficit", label: "تفريط", face: "qina",   resolved: true  },
    both:    { key: "both",    label: "تذبذب", face: "flag",   resolved: false },
    ambiguous:{ key:"ambiguous",label:"التباس",face: "flag",   resolved: false }
  },

  /* ════════════════════ العناقيد وأطر قراءتها ════════════════════
     لكل عنقودٍ إطارُ «آها» مختلف في الجلسة:
       • الرئيسيّ → الهبة/الكُلفة (العين التي تحميك هي التي تكلّفك أحيانًا).
       • المكبوت → الحدّ النائم (بُعدٌ مطفأ فيك، استعادته تفتح حياة). */
  clusters: {
    primary: {
      key: "primary",
      ahaKey: "gift_cost",
      ahaLabel: "الهبة والكُلفة",
      ahaHint: "نفس العين التي تحميك هي التي تكلّفك أحيانًا.",
      // الرئيسيّ غالبًا اتزان أو إفراط → الشغل: تهدئة وتنقية.
      tilt: "calm"
    },
    repressed: {
      key: "repressed",
      ahaKey: "sleeping_edge",
      ahaLabel: "الحدّ النائم",
      ahaHint: "بُعدٌ يعمل فيك بهدوء منذ زمن، استعادته تفتح بابًا مغلقًا.",
      // المكبوت غالبًا تفريط → الشغل: إيقاظ لطيف.
      tilt: "awaken"
    }
  },

  /* ════════════════════ خريطة بنية المحتوى ════════════════════
     تصف ما يتوقّعه المحرّك/العرض من cross-content لكل (طابع × مسار).
     ليست محتوًى — هي عقدٌ بنيويّ يضمن اتّساق كل الطبائع.

     INTERSECTION_CONTENT["type4"]["tamasuk"] = {
       identity: { name, line },           // اسم البصمة + جملة هويّة (داخليّ)
       virtue:   "..",                     // الفضيلة حين تعبر هذا المسار
       fitra:    "..",                     // وجه الفطرة (فقرة «أنت»)
       qina:     { excess:"..", deficit:".." },
       counterType: false,                 // هل هذا المسار هو النمط المضاد لهذا الطابع؟
       counterNote: "..",                  // تنبيه الكوتش إن counterType=true
       signs:    [".." , ".."],            // علامات تعرّف («أنت»)
       strengths: {                        // ثلاث نقاط قوّة بمفاتيح dimId
         <dimId>: {
           name: "..",                     // اسم نقطة القوّة (التوقّي…)
           spectrum: { balance:"..", excess:"..", deficit:".." },
           rootsRef: ".."                  // تأصيلٌ كما ورد في المادّة الخام (اختياريّ)
         }, ... ×3
       }
     } */
  contentContract: {
    perAxis: ["identity", "virtue", "fitra", "qina", "counterType", "signs", "strengths"],
    qinaFaces: ["excess", "deficit"],
    strengthsPerAxis: 3,
    spectrumStatesRequired: ["balance", "excess", "deficit"]
  },

  /* خريطة (طابع × مسار) → معرّفات نقاط القوّة الثلاث، بترتيب الأبعاد.
     معرّف نقطة القوّة = type + axis + dimId (للربط الداخليّ، لا يُعرَض). */
  strengthPointId: function (typeNum, axisId, dimId) {
    return "sp_" + typeNum + "_" + axisId + "_" + dimId;
  }
};

/* تصدير مزدوج: Node ومتصفّح. */
if (typeof module !== "undefined" && module.exports) { module.exports = CROSS_CONFIG; }
if (typeof window !== "undefined") { window.CROSS_CONFIG = CROSS_CONFIG; }
