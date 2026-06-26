/* ════════════════════════════════════════════════════════════════════════
   axes-render.js — طبقة العرض لمقياس المحاور (Reignite)
   ────────────────────────────────────────────────────────────────────────
   عرضٌ صرف: لا حالة، لا حساب، لا Firestore. دوالٌّ نقيّة تأخذ بياناتٍ جاهزة
   وتُعيد HTML كنصّ. النبرة: مرآة لا محكمة، على أرض الكرامة.

   ☆ تحديث:
     • استقبال الشرح العاميّ (hint) في الخيار والعبارة، ودالّتا questionHint
       و introBlock.
     • شاشة النتيجة (resultScreen) أُعيد تصميمها بتنسيقٍ أعمق وأبرز:
        - بطاقاتٌ بأرقام خطوات وأكسنت لونيّ لكل قسم.
        - سطرٌ تمهيديٌّ بارز (ax-lead-line) أعلى فقرة المحور.
        - شارةٌ مرئيّة للبُعد المحترق وشكله فوق شريط الطيف.
        - الجسر كبطاقةٍ مميّزة.
        - النصوص متعدّدة الفقرات تُقسَّم على سطرين فارغين.
     • المعرّفات (axPrint / axDone) وعقد الموديل (الحقول) كما هي — لا تغيير
       في axes-app.js مطلوب.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var COLOR = { green: '#10b981', gold: '#fbbf24', blue: '#3b82f6', purple: '#a78bfa' };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function nl2br(s){ return String(s==null?'':s).replace(/\n/g,'<br>'); }
  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }

  // يقسّم نصًّا على الأسطر المزدوجة إلى فقرات. leadFirst → الفقرة الأولى بارزة.
  function paras(text, leadFirst){
    var parts = String(text==null?'':text).split(/\n{2,}/).map(function(s){ return s.trim(); }).filter(Boolean);
    if(!parts.length) return '';
    return parts.map(function(p, i){
      var cls = (leadFirst && i===0) ? 'ax-p ax-lead-line' : 'ax-p';
      return '<p class="' + cls + '">' + esc(p) + '</p>';
    }).join('');
  }

  function posColor(position){
    if(position==='balance') return COLOR.green;
    if(position==='excess')  return COLOR.gold;
    if(position==='deficit') return COLOR.blue;
    if(position==='both')    return COLOR.gold;
    return COLOR.purple;
  }

  function questionHint(text){ return text ? '<div class="ax-question-hint">' + nl2br(esc(text)) + '</div>' : ''; }
  function introBlock(text){   return text ? '<div class="ax-intro">' + nl2br(esc(text)) + '</div>' : ''; }

  function likertOption(opt){
    var scale = [1,2,3,4,5,6,7].map(function(v){
      var sel = (opt.saved === v) ? ' selected' : '';
      return '<button class="ax-likert' + sel + '" data-letter="' + esc(opt.letter) + '" data-val="' + v + '">' + arabicNum(v) + '</button>';
    }).join('');
    var hintHTML = opt.hint ? '<div class="ax-option-hint">' + nl2br(esc(opt.hint)) + '</div>' : '';
    return '<div class="ax-option">'
         +   '<div class="ax-option-text"><span class="ax-letter">' + esc(opt.letter) + '</span><span>' + esc(opt.text) + '</span></div>'
         +   hintHTML
         +   '<div class="ax-scale">' + scale + '</div>'
         +   '<div class="ax-scale-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>'
         + '</div>';
  }

  function likertStatement(s){
    var scale = [1,2,3,4,5,6,7].map(function(v){
      var sel = (s.saved === v) ? ' selected' : '';
      return '<button class="ax-likert' + sel + '" data-val="' + v + '">' + arabicNum(v) + '</button>';
    }).join('');
    var hintHTML = s.hint ? '<div class="ax-statement-hint">' + nl2br(esc(s.hint)) + '</div>' : '';
    return '<div class="ax-statement-text">' + esc(s.text) + '</div>'
         + hintHTML
         + '<div class="ax-scale">' + scale + '</div>'
         + '<div class="ax-scale-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>';
  }

  function spectrumBar(sp){
    sp = sp || {};
    var position = sp.position || 'balance';
    var ambiguous = (position === 'ambiguous');
    var pct = 50;
    if(position === 'deficit') pct = 17;
    else if(position === 'excess') pct = 83;
    else if(position === 'both') pct = 50;
    else pct = 50;

    var marker = ambiguous
      ? '<span class="axsb-band"></span>'
      : (position === 'both'
          ? '<span class="axsb-dot" style="inset-inline-start:17%; background:' + COLOR.blue + '"></span>'
          + '<span class="axsb-dot" style="inset-inline-start:83%; background:' + COLOR.gold + '"></span>'
          : '<span class="axsb-dot" style="inset-inline-start:' + pct + '%; background:' + posColor(position) + '"></span>');

    var whisper = '';
    if(ambiguous) whisper = '<div class="axsb-whisper">لم يستقرّ بعد — يُفرَز في تأمّلٍ أعمق.</div>';
    else if(position === 'both') whisper = '<div class="axsb-whisper">تذبذبٌ بين الطرفين — أشدّ من الوقوف في أحدهما.</div>';

    return '<div class="ax-spectrum-bar">'
         +   '<div class="axsb-track">'
         +     '<span class="axsb-zone axsb-deficit"></span>'
         +     '<span class="axsb-zone axsb-balance"></span>'
         +     '<span class="axsb-zone axsb-excess"></span>'
         +     marker
         +   '</div>'
         +   '<div class="axsb-labels"><span>تفريط</span><span>اتزان</span><span>إفراط</span></div>'
         +   whisper
         + '</div>';
  }

  function wellnessLine(points){
    points = points || [];
    var bars = points.map(function(p){
      var pct = p.wellness != null ? Math.round((p.wellness / 7) * 100) : 0;
      var col = p.isWorst ? COLOR.gold : COLOR.green;
      return '<div class="ax-wl-row">'
           +   '<span class="ax-wl-name">' + esc(p.name) + (p.isWorst ? ' <span class="ax-wl-tag">الأشدّ نزيفًا</span>' : '') + '</span>'
           +   '<div class="ax-wl-bar"><div class="ax-wl-fill" style="width:' + pct + '%; background:' + col + '"></div></div>'
           +   '<span class="ax-wl-val">' + (p.wellness != null ? arabicNum(p.wellness) : '—') + '</span>'
           + '</div>';
    }).join('');
    return '<div class="ax-wellness">'
         +   '<div class="ax-wl-caption">خطّ عافيتك اليوم — أوّل نقطةٍ ستراها ترتفع أسبوعًا بعد أسبوع:</div>'
         +   bars
         + '</div>';
  }

  function resultScreen(m){
    m = m || {};
    var h = '';

    function step(n){ return '<span class="axr-step">' + arabicNum(n) + '</span>'; }

    // القسم صفر — الافتتاحية (أرض الكرامة)
    h += '<div class="axr-ground axr-ground-open">'
       +   '<div class="axr-ground-title">' + esc(m.openingTitle || 'قبل أن تقرأ') + '</div>'
       +   paras(m.openingBody)
       + '</div>';

    // ١ — المحور الرئيسيّ (هيرو)
    h += '<div class="axr-card axr-hero">'
       +   step(1)
       +   '<div class="axr-kicker">اتجاه طاقتك</div>'
       +   paras(m.primaryPara, true)
       + '</div>';

    // ٢ — وراء الرئيسيّ (الفرعيّ + بذرة المكبوت)
    if(m.secondaryPara || m.repressedSeed){
      h += '<div class="axr-card">'
         +   step(2)
         +   '<div class="ax-h">وراء الرئيسيّ</div>'
         +   (m.secondaryPara ? paras(m.secondaryPara) : '')
         +   (m.repressedSeed ? '<p class="ax-p ax-seed">' + esc(m.repressedSeed) + '</p>' : '')
         + '</div>';
    }

    // ٣ — أين تحترق الآن (بطاقة التشخيص المبروزة)
    var chip = '';
    if(m.burnedDimName){
      chip = '<div class="axr-chip">'
           +   '<span class="axr-chip-dim">' + esc(m.burnedDimName) + '</span>'
           +   (m.burnedShapeLabel ? '<span class="axr-chip-sep">·</span><span class="axr-chip-shape">' + esc(m.burnedShapeLabel) + '</span>' : '')
           + '</div>';
    }
    h += '<div class="axr-card axr-diag">'
       +   step(3)
       +   '<div class="ax-h">أين تحترق الآن</div>'
       +   chip
       +   (m.spectrumBarHTML || '')
       +   paras(m.burnedPara)
       + '</div>';

    // الجسر (بطاقة موصولة مميّزة)
    if(m.bridge){
      h += '<div class="axr-bridge">'
         +   '<div class="axr-kicker">الخيط الذي يربط</div>'
         +   paras(m.bridge)
         + '</div>';
    }

    // ٤ — خطّ العافية
    h += '<div class="axr-card">'
       +   step(4)
       +   '<div class="ax-h">خطّ عافيتك</div>'
       +   paras(m.burnoutNarrative)
       +   (m.wellnessHTML || '')
       + '</div>';

    // ٥ — ممارسة التعافي
    if(m.practice){
      h += '<div class="axr-card axr-practice-wrap">'
         +   step(5)
         +   '<div class="ax-h">ممارستك لهذا الأسبوع</div>'
         +   (m.practiceIntro ? paras(m.practiceIntro) : '')
         +   '<div class="ax-practice-card">' + esc(m.practice) + '</div>'
         + '</div>';
    }

    // الخاتمة (أرض الكرامة)
    h += '<div class="axr-ground axr-ground-close">'
       +   '<div class="axr-ground-title">بعد أن قرأت</div>'
       +   paras(m.closingBody)
       + '</div>';

    // أزرار (نفس المعرّفات)
    h += '<div class="ax-actions">'
       +   '<button class="ax-btn ghost" id="axPrint">احفظ نسخةً (طباعة)</button>'
       +   '<button class="ax-btn primary" id="axDone">تمّ</button>'
       + '</div>';

    return h;
  }

  window.AXES_RENDER = {
    COLOR: COLOR, esc: esc, nl2br: nl2br, arabicNum: arabicNum, posColor: posColor, paras: paras,
    questionHint: questionHint, introBlock: introBlock,
    likertOption: likertOption, likertStatement: likertStatement,
    spectrumBar: spectrumBar, wellnessLine: wellnessLine,
    resultScreen: resultScreen
  };
})();
