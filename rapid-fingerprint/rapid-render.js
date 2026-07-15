/* ════════════════════════════════════════════════════════════════════════
   rapid-render.js — طبقة العرض لمقياس البصمة السريع
   ────────────────────────────────────────────────────────────────────────
   عرضٌ صرف: لا حالة، لا حساب، لا Firestore. دوالٌّ نقيّة تأخذ بياناتٍ جاهزة
   وتُعيد HTML كنصّ. النبرة: مرآة لا محكمة، على أرض الكرامة.

   الوراثة: أدوات axes-render حرفيًّا (esc/nl2br/arabicNum/paras/likert)
   ببادئة .rf- المعزولة. والجديد الخاصّ بالبصمة:
     • binaryChoice — بطاقتا وصفٍ لاختيار الأقرب (مبارزات/جذور).
     • recognitionChoice — صوتان قانونيّان مقتبسان (خطّ أميري) للتعرّف.
     • rankingCard — الترتيب الإجباري باللمس (١ ← ٢ ← ٣) مع إعادة.
     • completionScreen — الإتمام والعبور إلى التقرير.
   القاموس الأسود مصان: لا يمرّ من هنا اسم طابع ولا رقم ولا اسم مرآة.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var COLOR = { green: '#10b981', gold: '#fbbf24', blue: '#3b82f6', purple: '#a78bfa' };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function nl2br(s){ return String(s==null?'':s).replace(/\n/g,'<br>'); }
  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }

  function paras(text, leadFirst){
    var parts = String(text==null?'':text).split(/\n{2,}/).map(function(s){ return s.trim(); }).filter(Boolean);
    if(!parts.length) return '';
    return parts.map(function(p, i){
      var cls = (leadFirst && i===0) ? 'rf-p rf-lead-line' : 'rf-p';
      return '<p class="' + cls + '">' + esc(p) + '</p>';
    }).join('');
  }

  function questionHint(text){ return text ? '<div class="rf-question-hint">' + nl2br(esc(text)) + '</div>' : ''; }
  function introBlock(text){   return text ? '<div class="rf-intro">' + nl2br(esc(text)) + '</div>' : ''; }

  function progressRow(label, pct){
    return '<div class="rf-progress-row">'
         +   '<span class="rf-progress-label">' + esc(label) + '</span>'
         +   '<div class="rf-progress-bar"><div class="rf-progress-fill" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>'
         + '</div>';
  }

  /* ── ليكرت ثلاثي الخيارات (بوابتا العائلة والسلوك + بنود المسارات) ── */
  function likertOption(opt){
    var scale = [1,2,3,4,5,6,7].map(function(v){
      var sel = (opt.saved === v) ? ' selected' : '';
      return '<button class="rf-likert' + sel + '" data-letter="' + esc(opt.letter) + '" data-val="' + v + '">' + arabicNum(v) + '</button>';
    }).join('');
    var hintHTML = opt.hint ? '<div class="rf-option-hint">' + nl2br(esc(opt.hint)) + '</div>' : '';
    return '<div class="rf-option">'
         +   '<div class="rf-option-text"><span class="rf-letter">' + esc(opt.letter) + '</span><span>' + esc(opt.text) + '</span></div>'
         +   hintHTML
         +   '<div class="rf-scale">' + scale + '</div>'
         +   '<div class="rf-scale-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>'
         + '</div>';
  }

  /* ── عبارة مفردة (التأكيد + بند الانتباه + عبارات الطيف) ── */
  function likertStatement(s){
    var scale = [1,2,3,4,5,6,7].map(function(v){
      var sel = (s.saved === v) ? ' selected' : '';
      return '<button class="rf-likert' + sel + '" data-val="' + v + '">' + arabicNum(v) + '</button>';
    }).join('');
    var hintHTML = s.hint ? '<div class="rf-statement-hint">' + nl2br(esc(s.hint)) + '</div>' : '';
    return '<div class="rf-statement-text">' + esc(s.text) + '</div>'
         + hintHTML
         + '<div class="rf-scale">' + scale + '</div>'
         + '<div class="rf-scale-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>';
  }

  /* ── اختيار ثنائي: بطاقتا وصف (مبارزات وجذور) ── */
  function binaryChoice(item, savedChoice){
    var cards = ['أ','ب'].map(function(L){
      var opt = item.options[L];
      if(!opt) return '';
      var sel = (savedChoice === L) ? ' selected' : '';
      var hintHTML = opt.hint ? '<div class="rf-choice-hint">' + nl2br(esc(opt.hint)) + '</div>' : '';
      return '<div class="rf-choice' + sel + '" data-letter="' + L + '" role="button" tabindex="0">'
           +   '<div class="rf-choice-head"><span class="rf-letter">' + L + '</span></div>'
           +   '<div class="rf-choice-text">' + esc(opt.text) + '</div>'
           +   hintHTML
           + '</div>';
    }).join('');
    return '<div class="rf-question">' + esc(item.text) + '</div>'
         + questionHint(item.hint)
         + '<div class="rf-choices">' + cards + '</div>';
  }

  /* ── التعرّف المرآتي: صوتان قانونيّان مقتبسان ──
     نصّا الصوتين يمرّران جاهزين من التطبيق (المصدر: بنك الأصوات الموحّد). */
  function recognitionChoice(item, voices, savedChoice){
    var cards = ['أ','ب'].map(function(L){
      var opt = item.options[L];
      if(!opt) return '';
      var sel = (savedChoice === L) ? ' selected' : '';
      var voice = voices && voices[L] ? voices[L] : '';
      return '<div class="rf-choice rf-voice' + sel + '" data-letter="' + L + '" role="button" tabindex="0">'
           +   '<div class="rf-choice-head"><span class="rf-letter">' + L + '</span></div>'
           +   '<div class="rf-voice-text">' + esc(voice) + '</div>'
           + '</div>';
    }).join('');
    return '<div class="rf-question">' + esc(item.text) + '</div>'
         + questionHint(item.hint)
         + '<div class="rf-choices">' + cards + '</div>';
  }

  /* ── الترتيب الإجباري باللمس: المسّة الأولى = ١ (الأصعب استغناءً)... ── */
  function rankingCard(item, order){
    order = order || [];
    var rows = ['أ','ب','ج'].map(function(L){
      var opt = item.options[L];
      if(!opt) return '';
      var pos = order.indexOf(L);
      var badge = pos > -1
        ? '<span class="rf-rank-badge">' + arabicNum(pos + 1) + '</span>'
        : '<span class="rf-rank-badge rf-rank-empty"></span>';
      var sel = pos > -1 ? ' ranked' : '';
      var hintHTML = opt.hint ? '<div class="rf-choice-hint">' + nl2br(esc(opt.hint)) + '</div>' : '';
      return '<div class="rf-rank-row' + sel + '" data-letter="' + L + '" role="button" tabindex="0">'
           +   badge
           +   '<div class="rf-rank-body"><div class="rf-choice-text">' + esc(opt.text) + '</div>' + hintHTML + '</div>'
           + '</div>';
    }).join('');
    return '<div class="rf-question">' + esc(item.text) + '</div>'
         + questionHint(item.hint)
         + '<div class="rf-rank-list">' + rows + '</div>'
         + '<div class="rf-rank-tools"><button class="rf-btn ghost" id="rfRankReset">إعادة الترتيب</button></div>';
  }

  /* ── شاشات الافتتاح والاستئناف والإتمام ── */
  function welcomeScreen(m){
    m = m || {};
    return '<div class="rf-centered">'
         +   '<div class="rf-tag">منظور البصمة</div>'
         +   '<div class="rf-core">' + esc(m.title || 'جلسة واحدة صادقة — وتخرج ببصمتك.') + '</div>'
         +   introBlock(m.intro)
         +   '<div class="rf-reminder">لا إجابة صحيحة وإجابة خاطئة هنا. الأصدقُ عن الفترة الأخيرة هو الأنفع لك.</div>'
         +   '<button class="rf-btn primary" id="rfStart">' + esc(m.startLabel || 'ابدأ') + '</button>'
         + '</div>';
  }

  function resumeScreen(){
    return '<div class="rf-centered">'
         +   '<div class="rf-tag">منظور البصمة</div>'
         +   '<div class="rf-core">توقّفتَ في منتصف الطريق — ومحفوظٌ لك مكانك.</div>'
         +   '<div class="rf-reminder">تقدر تكمل من حيث وقفت، أو تبدأ من الأوّل.</div>'
         +   '<div class="rf-actions">'
         +     '<button class="rf-btn primary" id="rfResume">أكمل من حيث توقّفت</button>'
         +     '<button class="rf-btn ghost" id="rfRestart">ابدأ من جديد</button>'
         +   '</div>'
         + '</div>';
  }

  function completedBeforeScreen(){
    return '<div class="rf-centered">'
         +   '<div class="rf-tag">منظور البصمة</div>'
         +   '<div class="rf-core">بصمتك محفوظة عندنا.</div>'
         +   '<div class="rf-reminder">تقدر تفتح تقريرك في أيّ وقت، أو تعيد المقياس فتحلّ النتيجة الجديدة محلّ القديمة.</div>'
         +   '<div class="rf-actions">'
         +     '<button class="rf-btn primary" id="rfToReport">افتح تقريرك</button>'
         +     '<button class="rf-btn ghost" id="rfRedo">أعد المقياس</button>'
         +   '</div>'
         + '</div>';
  }

  function savingScreen(){
    return '<div class="rf-centered"><div class="rf-spinner"></div><div class="rf-saving">لحظة — بنحفظ بصمتك...</div></div>';
  }

  function saveErrorScreen(){
    return '<div class="rf-centered">'
         +   '<div class="rf-core">تعذّر الحفظ — الشبكة على الأغلب.</div>'
         +   '<div class="rf-reminder">إجاباتك كاملة ومحفوظة على جهازك، مافيش حاجة ضاعت.</div>'
         +   '<button class="rf-btn primary" id="rfRetrySave">حاول الحفظ مرّة أخرى</button>'
         + '</div>';
  }

  function completionScreen(){
    return '<div class="rf-centered">'
         +   '<div class="rf-tag">منظور البصمة</div>'
         +   '<div class="rf-reveal">اكتملت بصمتك.</div>'
         +   '<div class="rf-reminder">تقريرك جاهز — خذه بهدوء، واقرأه قراءة صاحب البيت لا قراءة المتَّهم.</div>'
         +   '<button class="rf-btn primary" id="rfToReport">افتح تقريرك</button>'
         + '</div>';
  }

  window.RAPID_RENDER = {
    COLOR: COLOR, esc: esc, nl2br: nl2br, arabicNum: arabicNum, paras: paras,
    questionHint: questionHint, introBlock: introBlock, progressRow: progressRow,
    likertOption: likertOption, likertStatement: likertStatement,
    binaryChoice: binaryChoice, recognitionChoice: recognitionChoice, rankingCard: rankingCard,
    welcomeScreen: welcomeScreen, resumeScreen: resumeScreen,
    completedBeforeScreen: completedBeforeScreen,
    savingScreen: savingScreen, saveErrorScreen: saveErrorScreen, completionScreen: completionScreen
  };
})();
