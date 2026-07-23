/* ════════════════════════════════════════════════════════════════════════
   rapid-strengths-content.js — المحتوى التفصيلي لنقاط القوة التسع والثمانين
   ────────────────────────────────────────────────────────────────────────
   هذا الملف حاويةٌ للمحتوى السرديّ التفصيليّ لكل قوّة، يُغذّيه المحتوى
   المولَّد من برومبت الشرح (STRENGTHS-CONTENT-PROMPT.md). التقرير يقرأ
   منه: إن وُجد محتوى قوّةٍ عرضه مفصَّلًا، وإلا رجع للعرض المختصر تلقائيًّا
   (تدهورٌ رشيق — لا شيء يتعطّل إن كان بعض القوى بلا محتوى بعد).

   ── العقد (بنية كل مدخل) ──
   المفتاح: معرّف القوّة نفسه من بنك البنود (t1_tawaqqi ... t9_sila) —
   ٨١ مفتاحًا. قيمة كل مفتاح كائنٌ بالحقول الخمسة:
     define   : تعريف القوّة — ما هي هذه الطاقة في داخل صاحبها. (جملتان)
     balance  : كيف تبدو حين تعمل من موضعها الصحيح. (٢–٣ جمل)
     excess   : كيف تنقلب حين تعمل فوق حدّها (باسم الإفراط). (٢–٣ جمل)
     deficit  : كيف تخفت حين تنقلب دون حدّها (باسم التفريط). (٢–٣ جمل)
     seed     : بذرة تعافٍ — خطوة رصدٍ أو التفاتةٍ واحدة، لا وصفة. (جملة)
   كلّها بصيغة المخاطب «أنت»، فصحى مبسّطة رصينة، على أرض الكرامة،
   بلا اسم طابعٍ ولا رقمٍ ولا مصطلح إنياجرام — والاسم لا يتكرّر حشوًا.

   ── كيف تملأ الحاوية ──
   ١) خذ ملف RAW-strengths-material.txt وبرومبت STRENGTHS-CONTENT-PROMPT.md
      إلى محادثةٍ خارجيّة.
   ٢) البرومبت يُخرج كائن JS جاهزًا بنفس المفاتيح — الصقه مكان القوس
      الفارغ في STRENGTHS_CONTENT أدناه (بين ��� و ���).
   ٣) شغّل بطاقة التحقّق في ذيل الملف (تعمل تلقائيًّا في المتصفّح
      وتطبع نقصًا إن وُجد) — أو verifyStrengthsContent() يدويًّا.

   القالب المرجعيّ: القوّة الأولى (t1_tawaqqi) معبّأةٌ كنموذجٍ حيّ يبيّن
   المستوى والنبرة المطلوبين. احذفها واستبدلها بمخرجات البرومبت، أو
   أبقها فالبرومبت سيعيد إنتاجها ضمن الحزمة.
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var STRENGTHS_CONTENT =
  /* ��� الصق مخرجات البرومبت هنا (تحلّ محل هذا الكائن كاملًا) ��� */
  {

    /* ── نموذجٌ مرجعيّ واحد يبيّن المستوى المطلوب (القوّة الأولى) ── */
    "t1_tawaqqi": {
      define:  "هذه فيك عينٌ تستشرف: تلمح ما قد يعثر قبل أن يقع، فتضع القدم في موضعها قبل أن تزلّ. ليست خوفًا من الغد، بل قراءةً هادئةً لما يلوح في أفقه.",
      balance: "بفطرتك ترى الخلل الآتي فتتحرّك مبكّرًا وأنت ساكن القلب: تُصلح الشقّ وهو شعرةٌ قبل أن يصير صدعًا، ومَن حولك ينامون مطمئنّين لأنّ أحدًا يقظًا يحرس الطريق. وهذه اليقظة تكلّفك أحيانًا راحةً لا تجدها، فمن يرى الخطر أوّلًا يحمله أوّلًا.",
      excess:  "وحين تُفرِط فيها تحت الضغط، ترى في كلّ ظلٍّ خطرًا وفي كلّ سكونٍ نُذُرَ عاصفة: تفحص ما فُحص، وتراجع ما استقرّ، وتحمل ثقلًا لم يطلبه أحد. في المواقف التي يكفيها احتياطٌ واحد، تعيد التأمين مرّاتٍ حتى تصير العين التي كانت تحرس عينًا لا تنام.",
      deficit: "وحين تخفت دون حدّها، تمرّ العلاماتُ الواضحة أمامك ولا تتحرّك: تؤجّل ما يستحقّ فحصًا اليوم إلى غدٍ لا يجيء، وتمشي كأنّ المكروه لا يصيبك. الحذر الذي كان درعك ينام، فتفاجئك أمورٌ كان غيرك يراها تلوّح من بعيد.",
      seed:    "ربما تجرّب هذا الأسبوع أن تلاحظ أوّل موقفٍ يوقظ فيك الاستشراف: هل يخدمك بقراءةٍ تتحرّك بها، أم يستنزفك بفحصٍ لا ينتهي؟"
    }

    /* ⚑ باقي القوى الثمانون تُملأ من مخرجات البرومبت بنفس البنية */

  }
  /* ��� نهاية موضع اللصق ��� */
  ;

  /* ── دالّة الوصول: تُرجع محتوى القوّة أو null إن لم يُملأ بعد ── */
  function getStrengthContent(strengthId) {
    if (!strengthId) return null;
    var c = STRENGTHS_CONTENT[strengthId];
    if (!c) return null;
    // اكتمال أدنى: يجب أن تحمل الحقول الخمسة نصًّا
    if (!c.define || !c.balance || !c.excess || !c.deficit || !c.seed) return null;
    return c;
  }

  /* ── التحقّق: يُرجع {filled, missing[], partial[]} مقابل بنك البنود ── */
  function verifyStrengthsContent() {
    var Q = global.RAPID_QUESTIONS ||
            (typeof require !== 'undefined' ? (function () {
              try { return require('./rapid-questions.js'); } catch (e) { return null; }
            })() : null);
    var missing = [], partial = [], filled = [];
    if (!Q || !Q.spectrum) return { ok: false, reason: 'بنك البنود غير متاح', filled: filled, missing: missing, partial: partial };

    var axes = ['tamasuk', 'intima', 'hayawiyya'];
    for (var n = 1; n <= 9; n++) {
      axes.forEach(function (ax) {
        var axis = Q.spectrum['type' + n][ax];
        if (!axis) return;
        axis.strengths.forEach(function (s) {
          var c = STRENGTHS_CONTENT[s.id];
          if (!c) { missing.push(s.id); return; }
          var full = c.define && c.balance && c.excess && c.deficit && c.seed;
          if (full) filled.push(s.id); else partial.push(s.id);
        });
      });
    }
    return {
      ok: (missing.length === 0 && partial.length === 0),
      total: 81, filled: filled.length,
      missing: missing, partial: partial
    };
  }

  /* تصدير مزدوج */
  var API = {
    STRENGTHS_CONTENT: STRENGTHS_CONTENT,
    getStrengthContent: getStrengthContent,
    verifyStrengthsContent: verifyStrengthsContent
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  global.RAPID_STRENGTHS_CONTENT = API;

  /* بطاقة تحقّق صامتة في المتصفّح (تكتب في الـ console فقط) */
  if (typeof window !== 'undefined' && window.console) {
    try {
      var rep = verifyStrengthsContent();
      if (rep.ok) console.log('✅ محتوى القوى التفصيلي مكتمل (٨١/٨١).');
      else console.log('ℹ️ محتوى القوى: مملوء ' + rep.filled + '/81 — التقرير يعرض المتاح مفصّلًا والباقي مختصرًا. الناقص:', rep.missing.length, 'الجزئي:', rep.partial.length);
    } catch (e) { /* صامت */ }
  }

})(typeof window !== 'undefined' ? window : globalThis);
