/* ════════════════════════════════════════════════════════════════════════
   axes-render.js — طبقة العرض لمقياس المحاور (Reignite)
   ────────────────────────────────────────────────────────────────────────
   عرضٌ صرف: لا حالة، لا حساب، لا Firestore، لا نداء محرّك/جسر/مخزن.
   دوالٌّ نقيّة تأخذ بياناتٍ جاهزة وتُعيد HTML/SVG كنصّ. النبرة: مرآة لا محكمة،
   على أرض الكرامة.

   ☆ جديد: استقبال الشرح العاميّ (hint):
     • likertOption  : يطبع opt.hint تحت نصّ الخيار إن وُجد.
     • likertStatement: يطبع s.hint تحت العبارة إن وُجد.
     • questionHint  : دالّةٌ تطبع شرح السؤال (يستدعيها app بعد نصّ السؤال).
     • introBlock    : دالّةٌ تطبع مقدّمة كتلة/طبقة (يستدعيها app عند الانتقال).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var COLOR = { green: '#10b981', gold: '#fbbf24', blue: '#3b82f6', purple: '#a78bfa' };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function nl2br(s){ return String(s==null?'':s).replace(/\n/g,'<br>'); }
  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }

  // لون الموقع على الطيف
  function posColor(position){
    if(position==='balance') return COLOR.green;
    if(position==='excess')  return COLOR.gold;
    if(position==='deficit') return COLOR.blue;
    if(position==='both')    return COLOR.gold; // التذبذب يميل للإفراط بصريًّا
    return COLOR.purple; // ambiguous
  }

  /* ───────────────── شرح السؤال (عاميّ) — يُستدعى بعد نصّ السؤال ─────────────────
     يطبع لا شيء إن لم يوجد شرح. */
  function questionHint(text){
    return text ? '<div class="ax-question-hint">' + nl2br(esc(text)) + '</div>' : '';
  }

  /* ───────────────── مقدّمة كتلة/طبقة (عاميّ) — تُستدعى عند الانتقال ───────────────── */
  function introBlock(text){
    return text ? '<div class="ax-intro">' + nl2br(esc(text)) + '</div>' : '';
  }

  /* ───────────────── بلوك ليكرت لخيارٍ واحد (الطبقة الأولى) ─────────────────
     opt: { letter, text, hint, saved } — hint شرحٌ عاميّ اختياريّ، saved قيمةٌ محفوظة أو null */
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

  /* ───────────────── بلوك عبارة ليكرت مفردة (الطبقة الثانية/الثالثة) ─────────────────
     s: { text, hint, saved } — hint اختياريّ */
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

  /* ───────────────── شريط الطيف التوقيعيّ ─────────────────
     sp: { position, positionLabel } */
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

  /* ───────────────── خطّ العافية: ثلاث نقاط (توقّد/حضور/امتلاء) ─────────────────
     points: [{ name, wellness(١..٧), isWorst }] */
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

  /* ───────────────── شاشة النتيجة الكاملة ─────────────────
     model يحوي كل القطع المركّبة من الجسر:
       { openingTitle, openingBody, partial,
         primaryName, primaryPara, secondaryPara, repressedSeed,
         burnedDimName, burnedShapeLabel, burnedPara, spectrumBarHTML,
         bridge, burnoutNarrative, wellnessHTML,
         practiceIntro, practice,
         closingBody } */
  function resultScreen(m){
    m = m || {};
    var h = '';

    // القسم صفر — الافتتاحية
    h += '<div class="ax-section ax-ground">'
       +   '<div class="ax-ground-title">' + esc(m.openingTitle || 'قبل أن تقرأ') + '</div>'
       +   '<p>' + esc(m.openingBody || '') + '</p>'
       + '</div>';

    // المحور الرئيسيّ
    h += '<div class="ax-section">'
       +   '<div class="ax-h">محورك الرئيسيّ</div>'
       +   '<p class="ax-p">' + esc(m.primaryPara || '') + '</p>'
       + '</div>';

    // الفرعيّ + المكبوت
    if(m.secondaryPara || m.repressedSeed){
      h += '<div class="ax-section">'
         +   '<div class="ax-h">وراء الرئيسيّ</div>'
         +   (m.secondaryPara ? '<p class="ax-p">' + esc(m.secondaryPara) + '</p>' : '')
         +   (m.repressedSeed ? '<p class="ax-p ax-seed">' + esc(m.repressedSeed) + '</p>' : '')
         + '</div>';
    }

    // البُعد المحترق + شريط الطيف
    h += '<div class="ax-section">'
       +   '<div class="ax-h">أين تحترق بالضبط</div>'
       +   (m.spectrumBarHTML || '')
       +   '<p class="ax-p">' + esc(m.burnedPara || '') + '</p>'
       + '</div>';

    // الجسر — يربط الإحساس بالبنية
    if(m.bridge){
      h += '<div class="ax-section ax-bridge">'
         +   '<div class="ax-h">من الإحساس إلى البنية</div>'
         +   '<p class="ax-p">' + esc(m.bridge) + '</p>'
         + '</div>';
    }

    // نبضة الإحساس + خطّ العافية
    h += '<div class="ax-section">'
       +   '<div class="ax-h">خطّ عافيتك</div>'
       +   '<p class="ax-p">' + esc(m.burnoutNarrative || '') + '</p>'
       +   (m.wellnessHTML || '')
       + '</div>';

    // ممارسة التعافي
    if(m.practice){
      h += '<div class="ax-section ax-practice">'
         +   '<div class="ax-h">ممارستك لهذا الأسبوع</div>'
         +   (m.practiceIntro ? '<p class="ax-p">' + esc(m.practiceIntro) + '</p>' : '')
         +   '<div class="ax-practice-card">' + esc(m.practice) + '</div>'
         + '</div>';
    }

    // القسم السابع — الخاتمة
    h += '<div class="ax-section ax-ground">'
       +   '<div class="ax-ground-title">بعد أن قرأت</div>'
       +   '<p>' + esc(m.closingBody || '') + '</p>'
       + '</div>';

    // أزرار
    h += '<div class="ax-actions">'
       +   '<button class="ax-btn ghost" id="axPrint">احفظ نسخةً (طباعة)</button>'
       +   '<button class="ax-btn primary" id="axDone">تمّ</button>'
       + '</div>';

    return h;
  }

  window.AXES_RENDER = {
    COLOR: COLOR, esc: esc, nl2br: nl2br, arabicNum: arabicNum, posColor: posColor,
    questionHint: questionHint, introBlock: introBlock,
    likertOption: likertOption, likertStatement: likertStatement,
    spectrumBar: spectrumBar, wellnessLine: wellnessLine,
    resultScreen: resultScreen
  };
})();
