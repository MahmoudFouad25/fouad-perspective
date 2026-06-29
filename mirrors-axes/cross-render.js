/* ════════════════════════════════════════════════════════════════════════
   cross-render.js — عرض التقاطع (mirrors-axes)
   ────────────────────────────────────────────────────────────────────────
   عرضٌ خالص: لا منطق حساب، لا Firestore. يأخذ مُخرَج المحرّك (compose) +
   المحتوى (cross-content) فيبني HTML الذي يراه العميل.

   قواعد ما يواجه العميل (صارمة):
     • لا رقمَ طابعٍ ولا اسمَ طابعٍ ولا اسمَ مسارٍ ولا اسمَ بصمة.
     • الإطار: «نقاط قوّتك» ومسار رجوعها للاتزان.
     • الكشف قبل التسمية: بورتريهٌ يُقرأ، ثمّ موقعٌ على الطيف.
     • مرآةٌ لا محكمة، وأرض الكرامة سابقةٌ على كلّ قراءة.
     • قراءات الطيف المحجوبة (session) لا تُعرَض هنا — تُكشَف بعد الجلسة.

   يستعمل مفردات أصناف ax-* نفسها كي يرث الهويّة البصريّة القائمة.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function nl2br(s) { return String(s == null ? "" : s).replace(/\n/g, "<br>"); }

  /* فقرات من نصٍّ متعدّد الأسطر */
  function paras(text, leadFirst) {
    if (!text) return "";
    return String(text).split(/\n{2,}/).map(function (p, i) {
      var cls = (leadFirst && i === 0) ? "ax-p ax-lead-line" : "ax-p";
      return '<p class="' + cls + '">' + nl2br(esc(p.trim())) + "</p>";
    }).join("");
  }

  var COLOR = { green: "#34d399", gold: "#fbbf24", blue: "#60a5fa", purple: "#a78bfa", muted: "#94a3b8" };
  function posColor(position) {
    if (position === "excess") return COLOR.gold;
    if (position === "deficit") return COLOR.blue;
    if (position === "balance") return COLOR.green;
    return COLOR.purple; // ambiguous/both
  }

  /* شريط طيفٍ مرئيّ (نفس فكرة axes-render) — يُظهر موقع نقطة القوّة */
  function spectrumBar(position) {
    position = position || "balance";
    var ambiguous = (position === "ambiguous");
    var pct = (position === "deficit") ? 17 : (position === "excess") ? 83 : 50;

    var marker = ambiguous
      ? '<span class="axsb-band"></span>'
      : (position === "both"
          ? '<span class="axsb-dot" style="inset-inline-start:17%; background:' + COLOR.blue + '"></span>'
          + '<span class="axsb-dot" style="inset-inline-start:83%; background:' + COLOR.gold + '"></span>'
          : '<span class="axsb-dot" style="inset-inline-start:' + pct + '%; background:' + posColor(position) + '"></span>');

    var whisper = "";
    if (ambiguous) whisper = '<div class="axsb-whisper">لم يستقرّ بعد — نفرزه معًا في تأمّلٍ أعمق.</div>';
    else if (position === "both") whisper = '<div class="axsb-whisper">تذبذبٌ بين الطرفين — أثقل من الوقوف في أحدهما.</div>';

    return '<div class="ax-spectrum-bar">'
         +   '<div class="axsb-track">'
         +     '<span class="axsb-zone axsb-deficit"></span>'
         +     '<span class="axsb-zone axsb-balance"></span>'
         +     '<span class="axsb-zone axsb-excess"></span>'
         +     marker
         +   "</div>"
         +   '<div class="axsb-labels"><span>تفريط</span><span>اتزان</span><span>إفراط</span></div>'
         +   whisper
         + "</div>";
  }

  /* بطاقة نقطة قوّة واحدة (تواجه العميل):
       • العنوان: اسم نقطة القوّة (التوقّي…) — مسموحٌ للعميل (ليس اسم طابع/مسار).
       • القراءة المرئيّة: فقرة الحالة الراهنة (اتزان/إفراط/تفريط) كتأمّل.
       • شريط الطيف يُظهر الموقع بلطف.
     ملاحظة: نعرض نصّ الحالة الراهنة فقط (الكشف قبل التسمية محفوظ: العميل
     يقرأ تأمّلًا، لا حكمًا جاهزًا عن كلّ الحالات). */
  function strengthCard(point, content) {
    if (!content || content.name == null) {
      return '<div class="ax-sp-card ax-sp-pending">'
           +   '<div class="ax-sp-name">قيد الإعداد</div>'
           +   '<p class="ax-p">هذه القوّة ستُفتح لك قريبًا.</p>'
           + "</div>";
    }
    var pos = point.position || "ambiguous";
    var stateText = (content.spectrum && content.spectrum[pos]) ? content.spectrum[pos] : null;
    // للحالات غير المحسومة (ambiguous/both) لا نصّ حالةٍ مباشر → نعرض دعوة تأمّل
    if (!stateText) {
      stateText = (content.spectrum && content.spectrum.balance) || "";
    }

    return '<div class="ax-sp-card">'
         +   '<div class="ax-sp-name">' + esc(content.name) + "</div>"
         +   paras(stateText)
         +   spectrumBar(pos)
         + "</div>";
  }

  /* قسم عنقودٍ كامل (الرئيسيّ أو المكبوت) بإطاره الخاصّ:
       • الرئيسيّ: «هباتك» — العين التي تحميك.
       • المكبوت: «حدٌّ نائمٌ فيك» — بُعدٌ يعمل بهدوء، استعادته تفتح بابًا. */
  function clusterSection(clusterMeta, clusterPoints, typeContent, axisKeyForType) {
    if (!clusterPoints || !clusterPoints.length) return "";
    var axisContent = typeContent ? typeContent[axisKeyForType] : null;

    var introHTML = "";
    if (clusterMeta.key === "primary") {
      introHTML =
          '<div class="ax-section-title">هباتك التلقائيّة</div>'
        + '<p class="ax-p">هذه قوًى تعمل فيك من غير أن تطلبها — طاقتك تتّجه إليها قبل أن تفكّر. '
        + 'وفيها سرٌّ لطيف: نفس العين التي تحميك هي التي قد تكلّفك أحيانًا. '
        + 'اقرأها بهدوء، لا كحكمٍ بل كمرآة.</p>';
    } else {
      introHTML =
          '<div class="ax-section-title">حدٌّ نائمٌ فيك</div>'
        + '<p class="ax-p">هنا اتجاهٌ يعمل فيك بهدوءٍ منذ زمن، أبعد عن السطح. '
        + 'غالبًا صوته خافت، لكنّ استعادته تفتح بابًا كان مغلقًا. '
        + 'ليست قوًى معطوبةً تحتاج إصلاحًا — بل بُعدٌ ينتظر أن يُوقَظ بلطف.</p>';
    }

    var cards = clusterPoints.map(function (p) {
      var spContent = (axisContent && axisContent.strengths) ? axisContent.strengths[p.dimId] : null;
      return strengthCard(p, spContent);
    }).join("");

    return '<div class="ax-cluster">' + introHTML + cards + "</div>";
  }

  /* الشاشة الكاملة التي يراها العميل */
  function resultScreen(model) {
    // model: { ground, primaryCluster, repressedCluster, typeContent, axisKeys, closing }
    var g = model.ground || {};
    var html = "";

    // أرض الكرامة (افتتاح)
    html += '<div class="axr-ground axr-ground-open">'
         +   '<div class="axr-ground-title">قبل أيّ كلمة</div>'
         +   paras(g.openBody || defaultGround().openBody)
         + "</div>";

    // عنقود الرئيسيّ (هباتك)
    html += clusterSection(
      { key: "primary" },
      model.primaryCluster,
      model.typeContent,
      model.axisKeys ? model.axisKeys.primary : null
    );

    // عنقود المكبوت (حدّ نائم)
    if (model.repressedCluster && model.repressedCluster.length) {
      html += clusterSection(
        { key: "repressed" },
        model.repressedCluster,
        model.typeContent,
        model.axisKeys ? model.axisKeys.repressed : null
      );
    }

    // خاتمة الأرض
    html += '<div class="axr-ground">'
         +   '<div class="axr-ground-title">وفي الختام</div>'
         +   paras(g.closeBody || defaultGround().closeBody)
         + "</div>";

    // ملاحظة الجلسة (تمهيدٌ لطيف، بلا كشف المحجوب)
    html += '<div class="ax-seed-note">'
         +   '<p class="ax-p">ما قرأته هنا بدايةٌ نفتحها معًا في الجلسة. '
         +   'هناك ننزل أعمق، ونرى كيف تتّصل هذه القوى ببعضها فيك.</p>'
         + "</div>";

    return html;
  }

  function defaultGround() {
    return {
      openBody: "قيمتك ثابتةٌ قبل أيّ شيءٍ تقرؤه هنا. ﴿وَلَقَدْ كَرَّمْنَا بَنِي آدَمَ﴾ — التكريم سابقٌ على كلّ قوّةٍ وكلّ موقع.\n\nما يلي مرآةٌ لا محكمة: يعكس قوًى تعمل فيك الآن لتراها فتختار، لا ليُحاسبك.",
      closeBody: "كلّ ما رأيته فيه جمالٌ ورهافة. وقيمتك ثابتةٌ قبله وبعده. ما هنا وعيٌ إضافيٌّ بقوًى فيك، لا حكمٌ عليك."
    };
  }

  /* بطاقة «قيد الإعداد» لطابعٍ لم يُكتب محتواه بعد */
  function pendingScreen() {
    return '<div class="axr-ground axr-ground-open">'
         +   '<div class="axr-ground-title">قريبًا</div>'
         +   '<p class="ax-p">نقاط قوّتك تُجهَّز الآن بعناية. سنفتحها لك قريبًا — '
         +   'وستجد فيها مرآةً تُريك ما يعمل فيك من قوًى، لتختار.</p>'
         + "</div>";
  }

  /* رسالة «أكمل المقياسين أوّلًا» */
  function needBothScreen(missing) {
    var lines = [];
    if (missing.indexOf("mirrors") !== -1) lines.push("مقياس المرايا");
    if (missing.indexOf("axes") !== -1) lines.push("مقياس مسارات الطاقة الثلاثة");
    var what = lines.join(" و");
    return '<div class="axr-ground axr-ground-open">'
         +   '<div class="axr-ground-title">خطوةٌ قبل أن نبدأ</div>'
         +   '<p class="ax-p">نقاط قوّتك تُبنى من رحلتين معًا. يبدو أنّك لم تُكمل بعد: '
         +   '<strong>' + esc(what) + "</strong>.</p>"
         +   '<p class="ax-p">أكمِلها أوّلًا، ثمّ عُد إلى هنا — وستجد صورتك المتكاملة بانتظارك.</p>'
         + "</div>";
  }

  window.CROSS_RENDER = {
    esc: esc,
    paras: paras,
    spectrumBar: spectrumBar,
    strengthCard: strengthCard,
    clusterSection: clusterSection,
    resultScreen: resultScreen,
    pendingScreen: pendingScreen,
    needBothScreen: needBothScreen,
    defaultGround: defaultGround
  };

  if (typeof module !== "undefined" && module.exports) module.exports = window.CROSS_RENDER;

  console.log("✅ CROSS_RENDER جاهز");
})();
