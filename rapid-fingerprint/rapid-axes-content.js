/* ════════════════════════════════════════════════════════════════════════
   rapid-axes-content.js — المحتوى التفصيلي لمسارات الطاقة الثلاثة
   ────────────────────────────────────────────────────────────────────────
   ┌──────────────────────────────────────────────────────────────────┐
   │  كيف تملأ هذا الملف — خانةٌ لكلّ مسار، بلا خبرةٍ برمجيّة          │
   │                                                                  │
   │  البرومبت يعطيك دفعةً لكلّ مسار، شكلها:                          │
   │      {                                                           │
   │        define:     "...",                                        │
   │        asPrimary:  "...",  ...                                   │
   │      }                                                           │
   │  انسخ ما بين القوسين، وألصقه في خانة مساره بين السطرين           │
   │  «ابدأ اللصق» و«انتهِ هنا». ثلاث خانات مستقلّة، بلا دمج.          │
   └──────────────────────────────────────────────────────────────────┘

   ── بنية كلّ مسار (ستّة حقول) ──
     define      : ما هذا المسار؟ الطاقة التي يصفها، بصورةٍ محسوسة. (٢–٣ جمل)
     asPrimary   : حين يكون مسارك الرئيسيّ، ماذا يعني في يومك؟ (٣–٤ جمل)
     asSecondary : حين يكون الداعم، كيف يعمل في الخلفية؟ (٢–٣ جمل)
     asRepressed : حين يكون المدفون، ما الذي سكت فيك وما ثمنه؟ (٣–٤ جمل)
     fromLove    : وجهه حين يعمل من الحبّ (وقودُه صافٍ). (جملتان)
     fromFear    : وجهه حين يعمل من الخوف (وقودُه مشوب). (جملتان)

   المرجع: AXES-CONTENT-PROMPT.md · المادة الخام: RAW-axes-material.txt
   التقرير يعرض المملوء مفصّلًا والباقي مختصرًا (تدهورٌ رشيق).
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var AXES_DETAIL = {};

  function add(key, batch) {
    if (!batch || typeof batch !== 'object') return;
    var hasAny = false;
    for (var k in batch) { if (Object.prototype.hasOwnProperty.call(batch, k)) { hasAny = true; break; } }
    if (hasAny) AXES_DETAIL[key] = batch;
  }

  /* ══════════════════════════════════════════════════════════════════
     الخانة ١ — مسار الحفظ والاستقرار   [tamasuk]
     ══════════════════════════════════════════════════════════════════ */
  add('tamasuk', {
    /* ▼▼▼ ابدأ اللصق هنا ▼▼▼ */

    define: "هذه فيك طاقةٌ تتّجه إلى تثبيت الأرض تحت قدميك: أن يكون لك ما يكفيك، وأن يبقى ما بنيتَه قائمًا. تسبقك عينُك إلى ما يحفظ البيت والرزق والجسد، ويسكن في خلفيّتك سؤالٌ هادئ لا يفارقك: هل أنا في أمان؟",
    asPrimary: "حين يكون هذا أقوى مساراتك، فإنّ أوّل ما يتحرّك فيك أمام أيّ جديدٍ هو ميزان الأمان: ما ثمنه؟ وهل تحتمله أرضي؟ تُرتّب قبل أن تبدأ، وتؤمّن قبل أن تنطلق، ووعيك بمواردك ومواعيدك وصحّتك حاضرٌ لا يهدأ. وهذا لا يعني انشغالك بنفسك: أمانك يشمل بيتك وأهلك ولقمتك، فأنت تحمي عشًّا كاملًا لا نفسك وحدها. ومَن حولك ينامون مطمئنّين لأنّ أحدًا يحسب الحساب.",
    asSecondary: "وحين يكون داعمًا، فهو أرضٌ هادئةٌ تقف عليها وأنت ماضٍ نحو ما هو أهمّ عندك: تحبّ أن تشعر أنّ ظهرك مغطًّى، ثمّ تنطلق. لا يتصدّر انتباهك، لكنّك تفتقده فورًا إن اهتزّ.",
    asRepressed: "وحين يكون هذا مسارك الساكت، فإنّ فيك جزءًا يحتاج أن يطمئنّ ولم تعطه حقّه منذ زمن: ربّما علّمتك الظروف أن تشدّ حيلك وتمضي بلا أن تسأل نفسك إن كنتَ مؤمَّنًا. لم يختفِ هذا الجزء، بل ينتظر: يظهر في إرهاقٍ لا تعرف مصدره، أو في تأجيلٍ لأمورٍ تخصّ جسدك ومواردك. وأغنى ما قد تكتشفه عن نفسك يجيء غالبًا من هنا، حين يعود الساكتُ إلى الكلام.",
    fromLove: "حين يعمل من الحبّ، تعتني بأمرك عناية مَن يرعى أمانة، وتبني استقرارك بثقةٍ هادئة. فيصير وجودك نفسه طمأنينةً لمن حولك.",
    fromFear: "وحين يعمل من الخوف، تنقلب العناية قبضةً لا تُفكّ: تحفظ أكثر ممّا تحتاج، وتطمئنّ أقلّ ممّا تستحقّ، ويصير التأمين نفسه مصدر قلقك."

    /* ▲▲▲ انتهِ هنا ▲▲▲ */
  });

  /* ══════════════════════════════════════════════════════════════════
     الخانة ٢ — مسار الحيوية والتجدّد   [hayawiyya]
     ══════════════════════════════════════════════════════════════════ */
  add('hayawiyya', {
    /* ▼▼▼ ابدأ اللصق هنا ▼▼▼ */

    /* ▲▲▲ انتهِ هنا ▲▲▲ */
  });

  /* ══════════════════════════════════════════════════════════════════
     الخانة ٣ — مسار الانتماء والمشاركة   [intima]
     ══════════════════════════════════════════════════════════════════ */
  add('intima', {
    /* ▼▼▼ ابدأ اللصق هنا ▼▼▼ */

    /* ▲▲▲ انتهِ هنا ▲▲▲ */
  });

  /* ════════════════ لا تعديل تحت هذا السطر ════════════════ */

  var ROLE_FIELD = { primary: 'asPrimary', secondary: 'asSecondary', repressed: 'asRepressed' };

  /* يُرجع محتوى المسار في دوره، أو null إن لم يُملأ */
  function getAxisContent(axisKey, role) {
    var a = AXES_DETAIL[axisKey];
    if (!a) return null;
    var field = ROLE_FIELD[role];
    if (!field || !a[field] || !a.define) return null;
    return {
      define: a.define,
      roleText: a[field],
      fromLove: a.fromLove || null,
      fromFear: a.fromFear || null
    };
  }

  function verifyAxesContent() {
    var keys = ['tamasuk', 'hayawiyya', 'intima'];
    var missing = [], partial = [], filled = [];
    keys.forEach(function (k) {
      var a = AXES_DETAIL[k];
      if (!a || !a.define) { missing.push(k); return; }
      var full = a.define && a.asPrimary && a.asSecondary && a.asRepressed && a.fromLove && a.fromFear;
      if (full) filled.push(k); else partial.push(k);
    });
    return { ok: missing.length === 0 && partial.length === 0, total: 3,
             filled: filled.length, missing: missing, partial: partial };
  }

  var API = { AXES_DETAIL: AXES_DETAIL, getAxisContent: getAxisContent, verifyAxesContent: verifyAxesContent };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  global.RAPID_AXES_CONTENT = API;

  if (typeof window !== 'undefined' && window.console) {
    try {
      var rep = verifyAxesContent();
      if (rep.ok) console.log('✅ محتوى المسارات مكتمل (٣/٣).');
      else console.log('ℹ️ محتوى المسارات: ' + rep.filled + '/3'
        + (rep.missing.length ? ' · ينتظر: ' + rep.missing.join('، ') : '')
        + (rep.partial.length ? ' · ناقص: ' + rep.partial.join('، ') : ''));
    } catch (e) { /* صامت */ }
  }

})(typeof window !== 'undefined' ? window : globalThis);
