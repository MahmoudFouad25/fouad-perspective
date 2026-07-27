/* ════════════════════════════════════════════════════════════════════════
   fouad-render.js — طبقة العرض المطوّرة لمقياس الفؤاد v2 (بنّاؤون أنقياء)
   ────────────────────────────────────────────────────────────────────────
   عرضٌ صرف: لا حالة، لا حساب، لا Firestore، لا نداء محرّك/جسر/مخزن.
   دوالٌّ نقيّة تأخذ بياناتٍ جاهزة وتُعيد HTML/SVG كنصّ. تُحمَّل قبل fouad-app.js
   وتُنادى منه. النبرة في كلّ نصّ ثابت: مرآة لا محكمة.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // ألوان القراءات (تطابق هويّة المشروع)
  var COLOR = { green: '#10b981', gold: '#fbbf24', blue: '#3b82f6', purple: '#a78bfa' };
  var DONE_NEUTRAL = '#94a3b8'; // عقدة تمّت بلا لون طيفٍ متاح (مثل الإشارة الضعيفة)

  // أدوات نصّيّة نقيّة (مستقلّة عن التطبيق حمايةً من أيّ اقتران)
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }

  // لون الموقع على الطيف (اتزان أخضر، إفراط ذهبيّ، تفريط أزرق، ملتبس/مريب بنفسجيّ)
  function posColor(position, key){
    key = key || '';
    if(position==='balance' || key==='balance') return COLOR.green;
    if(position==='excess'  || key.indexOf('excess')===0)  return COLOR.gold;
    if(position==='deficit' || key.indexOf('deficit')===0) return COLOR.blue;
    return COLOR.purple; // ambiguous + suspicious_balance
  }

  // لاحقة الصورة (أ/ب) من المفتاح أو اسم الصورة، إن وُجدت
  function imageSuffix(sp){
    var s = (sp && (sp.image || sp.key)) || '';
    if(/_a$/.test(s))    return 'أ';
    if(/_b$/.test(s))    return 'ب';
    if(/_both$/.test(s)) return 'أ/ب';
    return '';
  }

  /* ───────────────── (٢) شريط الطيف التوقيعيّ ─────────────────
     ثلاث مناطق: تفريط (أزرق) — اتزان (أخضر، الوسط) — إفراط (ذهبيّ).
     المؤشّر على موقع العميل. الملتبس → منطقة عريضة لا نقطة. الاتزان المريب →
     مؤشّر في الاتزان مع همسة. كلّ الألوان كريمة، لا تحذير. */
  function spectrumBar(sp){
    sp = sp || {};
    var key = sp.key || '';
    var ambiguous  = (sp.ambiguous === true) || key === 'ambiguous' || sp.position === 'ambiguous';
    var suspicious = (sp.suspiciousBalance === true) || key === 'suspicious_balance';
    var position = sp.position || (suspicious ? 'balance' : (ambiguous ? 'ambiguous' : key));

    // الموقع الأفقيّ للمؤشّر ضمن شريطٍ يُقرأ يسارًا→يمينًا: تفريط، اتزان، إفراط
    var pct = 50;
    if(position === 'deficit') pct = 17;
    else if(position === 'excess') pct = 83;
    else pct = 50; // اتزان + مريب + مركز الملتبس

    var suffix = imageSuffix(sp);
    var suffixHTML = suffix ? '<div class="sb-suffix">الصورة ' + esc(suffix) + '</div>' : '';

    // المؤشّر: الملتبس منطقةٌ عريضة، غيره نقطةٌ بلون موقعه
    var marker = ambiguous
      ? '<span class="sb-band"></span>'
      : '<span class="sb-dot" style="inset-inline-start:' + pct + '%; background:' + posColor(position, key) + '"></span>';

    // الهمسات (نبرة مرآة لا محكمة)
    var whisper = '';
    if(ambiguous)       whisper = '<div class="sb-whisper">لم تستقر بعد، وتتضح مع تأمل أهدأ.</div>';
    else if(suspicious) whisper = '<div class="sb-whisper">وسطية تستحق نظرة أصدق.</div>';

    return ''
      + '<div class="spectrum-bar' + (ambiguous ? ' is-amb' : '') + '">'
      +   '<div class="sb-track">'
      +     '<span class="sb-zone sb-deficit"></span>'
      +     '<span class="sb-zone sb-balance"></span>'
      +     '<span class="sb-zone sb-excess"></span>'
      +     marker
      +   '</div>'
      +   '<div class="sb-labels"><span>تفريط</span><span>وسطية</span><span>إفراط</span></div>'
      +   suffixHTML
      +   whisper
      + '</div>';
  }

  /* ───────────────── (١)(٣) خريطة النزول في الطبقات ─────────────────
     nodes: مصفوفة بترتيب القوس (السطح أولًا): السلوك في أعلى طبقة،
     والجذر الخفي في أعمق طبقة. كل عنصر: { id, name, status, color }.
     opts.allDone: تُضاء الخريطة كلها عند اكتمال المرايا.
     الفكرة: العميل ينزل من السطح نحو العمق، فكل طبقة تكتمل تُضاء بلون
     قراءتها، والطبقة الجارية عليها علامة "أنت هنا". الوصول بالهوية. */
  function layersMap(nodes, opts){
    opts  = opts  || {};
    nodes = nodes || [];
    var n = nodes.length || 7;
    var W = 400, headH = 40, rowH = 62, padBottom = 16;
    var H = headH + n * rowH + padBottom;
    var STATUS_WORD = { done: 'اكتملت', active: 'أنت هنا', todo: '' };

    var body = '';

    // خط السطح في الأعلى
    body += '<line x1="14" y1="' + (headH - 6) + '" x2="' + (W - 14) + '" y2="' + (headH - 6) + '" stroke="var(--gold)" stroke-width="1.4" opacity="0.55"/>'
         +  '<text x="' + (W - 18) + '" y="' + (headH - 14) + '" text-anchor="end" class="layer-surface">السطح</text>';

    for(var i = 0; i < n; i++){
      var nd = nodes[i] || {}, st = nd.status || 'todo';
      var y = headH + i * rowH;
      var col = (st === 'done') ? (nd.color || DONE_NEUTRAL) : null;
      var shade = Math.min(0.05 + i * 0.045, 0.4);   // الطبقات تغمق كلما نزلنا

      // جسم الطبقة
      body += '<rect x="12" y="' + (y + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" rx="10" fill="var(--card)"/>'
           +  '<rect x="12" y="' + (y + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" rx="10" fill="#000" opacity="' + shade.toFixed(3) + '"/>';

      if(st === 'done'){
        body += '<rect x="12" y="' + (y + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" rx="10" fill="none" stroke="' + col + '" stroke-width="1.4" opacity="0.75"/>'
             +  '<rect x="' + (W - 20) + '" y="' + (y + 8) + '" width="5" height="' + (rowH - 18) + '" rx="2.5" fill="' + col + '"/>'
             +  '<circle cx="34" cy="' + (y + rowH/2 - 3) + '" r="6.5" fill="' + col + '"/>';
      } else if(st === 'active'){
        body += '<rect x="12" y="' + (y + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" rx="10" fill="none" stroke="' + COLOR.gold + '" stroke-width="1.6" stroke-dasharray="5 5"/>'
             +  '<path d="M 34 ' + (y + rowH/2 - 11) + ' l 6 10 h -12 z" fill="' + COLOR.gold + '" transform="rotate(180 34 ' + (y + rowH/2 - 6) + ')"/>';
      } else {
        body += '<circle cx="34" cy="' + (y + rowH/2 - 3) + '" r="5.5" fill="none" stroke="var(--line)" stroke-width="1.4"/>';
      }

      // الاسم (يمين) والحالة (يسار)
      var nameOp = (st === 'todo') ? 0.5 : 1;
      body += '<text x="' + (W - 34) + '" y="' + (y + rowH/2 + 2) + '" text-anchor="end" class="layer-name" opacity="' + nameOp + '">' + esc(nd.name || '') + '</text>';
      var word = STATUS_WORD[st] || '';
      if(word){
        var wc = (st === 'done') ? col : COLOR.gold;
        body += '<text x="52" y="' + (y + rowH/2 + 2) + '" text-anchor="start" class="layer-status" fill="' + wc + '">' + esc(word) + '</text>';
      }

      // منطقة النقر للمكتملة فقط (مراجعة)
      if(st === 'done'){
        body += '<rect class="layer-hit" data-node="' + esc(nd.id || '') + '" x="12" y="' + (y + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" fill="transparent" style="cursor:pointer"/>';
      }
    }

    // عند الاكتمال: توهج هادئ في أعمق طبقة
    if(opts.allDone && n){
      var by = headH + (n - 1) * rowH;
      body += '<rect x="12" y="' + (by + 2) + '" width="' + (W - 24) + '" height="' + (rowH - 6) + '" rx="10" fill="url(#layerGlow)" opacity="0.16"/>';
    }

    return ''
      + '<svg class="layers-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="خريطة النزول في الطبقات">'
      +   '<defs>'
      +     '<linearGradient id="layerGlow" x1="0" y1="0" x2="0" y2="1">'
      +       '<stop offset="0" stop-color="' + COLOR.green + '"/><stop offset="1" stop-color="' + COLOR.gold + '"/>'
      +     '</linearGradient>'
      +   '</defs>'
      +   body
      + '</svg>';
  }

  /* ───────────────── (١) كارت البيت ─────────────────
     model: { name, palmSVG, doneCount, totalCount, progressPct, hasNext, allDone, canReport }
     allDone  = إضاءة الخريطة (اكتمال المرايا المفتوحة)
     canReport = ظهور زرّ التقرير (قواعد الإتاحة في fouad-app.js) */
  function homeCard(m){
    m = m || {};
    var greet = m.name ? ('مرحبًا، ' + esc(m.name)) : 'مرحبًا بك';
    var actions = '';
    if(m.hasNext) actions += '<button class="btn primary" id="homeContinue">تابِع رحلتك</button>';
    if(m.canReport) actions += '<button class="btn primary" id="homeReport">صورتك المتكاملة</button>';

    return ''
      + '<div class="home-head">'
      +   '<div class="home-greet">' + greet + '</div>'
      +   '<div class="home-sub">هذه خريطة رحلتك: سبع طبقات تنزل فيها من السطح نحو العمق، تبدأ بما يظهر منك للناس وتنتهي بأعمق ما يعمل فيك. كل طبقة تكتمل تُضاء بلون قراءتك فيها، ويمكنك العودة إلى أي طبقة اكتملت بالنقر عليها.</div>'
      + '</div>'
      + '<div class="home-progress">'
      +   '<div class="progress-bar"><div class="progress-fill" style="width:' + (m.progressPct || 0) + '%"></div></div>'
      +   '<div class="home-progress-label">أتممتَ ' + arabicNum(m.doneCount || 0) + ' من ' + arabicNum(m.totalCount || 0) + ' مرايا</div>'
      + '</div>'
      + '<div class="layers-wrap">' + (m.palmSVG || '') + '</div>'
      + (actions ? '<div class="home-actions">' + actions + '</div>' : '')
      + '';
  }

  /* ───────────────── شاشة المراجعة ─────────────────
     model: { mirrorName, mirrorOrdinal, weakText?, blocks:[{axisName,axisIntro,afterRanking,rooting}],
              spectra:[{axisName,positionLabel,barHTML,text}] }
     تعيد عرض ما رآه العميل من المحفوظ + المحتوى — لا توليد جديد. */
  function mirrorReviewCard(m){
    m = m || {};
    var inner = '';
    inner += '<div class="mirror-tag">المرآة ' + esc(m.mirrorOrdinal || '') + ': ' + esc(m.mirrorName || '') + '</div>';
    inner += '<div class="review-note">هذه قراءتك كما رأيتها، نعيدها عليك كما هي.</div>';

    // صورة هذه المرآة: نِسَب حضور المحاور (بنفس شكل شاشة الترتيب) — تظهر في كلّ الحالات
    if(m.ranking && m.ranking.rows && m.ranking.rows.length){
      var rankRowsHTML = m.ranking.rows.map(function(r){
        return '<div class="rank-row' + (r.top ? ' top' : '') + '">'
             +    '<span class="rank-axis">' + esc(r.name || '') + '</span>'
             +    '<div class="rank-bar"><div class="rank-fill" style="width:' + (r.percent || 0) + '%"></div></div>'
             +    '<span class="rank-pct">' + arabicNum(r.percent || 0) + '٪</span>'
             +  '</div>';
      }).join('');
      inner += '<div class="review-ranking">'
            +    '<div class="sr-axis">صورة هذه المرآة</div>'
            +    '<div class="ranking">' + rankRowsHTML + '</div>'
            +    (m.ranking.dominantName ? '<div class="dominant">طريقتك الغالبة: <strong>' + esc(m.ranking.dominantName) + '</strong></div>' : '')
            +  '</div>';
    }

    if(m.weakText){
      inner += '<div class="edu-block weak"><p>' + esc(m.weakText) + '</p></div>';
    } else {
      (m.blocks || []).forEach(function(b){
        inner += '<div class="edu-block door">';
        if(b.axisName)     inner += '<div class="edu-axis-name">' + esc(b.axisName) + '</div>';
        if(b.axisIntro)    inner += '<p class="edu-intro">' + esc(b.axisIntro) + '</p>';
        if(b.afterRanking) inner += '<p class="edu-after">' + esc(b.afterRanking) + '</p>';
        if(b.rooting)      inner += '<div class="edu-rooting"><div class="edu-rooting-tag">في الأصل</div><p>' + esc(b.rooting) + '</p></div>';
        inner += '</div>';
      });
      (m.spectra || []).forEach(function(s){
        inner += '<div class="review-spectrum">'
              +    '<div class="sr-axis">' + esc(s.axisName || '') + (s.positionLabel ? (': ' + esc(s.positionLabel)) : '') + '</div>'
              +    (s.barHTML || '')
              +    '<p class="sr-text">' + esc(s.text || '') + '</p>'
              +  '</div>';
      });
    }

    inner += '<div class="home-actions"><button class="btn ghost" id="reviewBack">رجوع للبيت</button></div>';
    return inner;
  }

  /* ───────────────── (٣) شاشة الاكتمال بالنخلة ─────────────────
     model: { palmSVG, name } — طقسيّة لا احتفاليّة صاخبة. */
  function completionCard(m){
    m = m || {};
    return ''
      + '<div class="completion">'
      +   '<div class="layers-wrap layers-complete">' + (m.palmSVG || '') + '</div>'
      +   '<div class="completion-line">نزلت الطبقات السبع كلها، من السطح إلى أعمق نقطة. ما رأيته فيها مجموع الآن في صورة واحدة.</div>'
      +   '<div class="completion-sub">خذ نفسًا، ثم اقرأها كما تُقرأ مرآة: بهدوء.</div>'
      +   '<button class="btn primary" id="completionShow">اعرض صورتك المتكاملة</button>'
      + '</div>';
  }

  /* ───────────────── (٤) خريطة التحرّك البصريّة (داخل التقرير) ─────────────────
     model: { cells:[{name, present, position, color, ambiguous, suspicious}] }
     صفّ المرايا، كلٌّ بشريط طيفٍ مصغّر ونقطةٍ بموقعها — يُرى النمط دفعةً واحدة. */
  function movementMap(m){
    m = m || {};
    var cells = (m.cells || []).map(function(c){
      var pct = 50;
      if(c.position === 'deficit') pct = 17; else if(c.position === 'excess') pct = 83; else pct = 50;
      var dot = !c.present
        ? '<span class="mm-empty"></span>'
        : (c.ambiguous
            ? '<span class="mm-band"></span>'
            : '<span class="mm-dot" style="inset-inline-start:' + pct + '%; background:' + (c.color || 'var(--muted)') + '"></span>');
      return '<div class="mm-cell' + (c.present ? '' : ' is-empty') + '">'
           +   '<div class="mm-mini"><span class="mm-z mm-d"></span><span class="mm-z mm-b"></span><span class="mm-z mm-e"></span>' + dot + '</div>'
           +   '<div class="mm-name">' + esc(c.name || '') + '</div>'
           + '</div>';
    }).join('');
    return '<div class="movemap">' + cells + '</div>';
  }

  window.FOUAD_RENDER = {
    COLOR: COLOR, esc: esc, arabicNum: arabicNum, posColor: posColor,
    spectrumBar: spectrumBar, layersMap: layersMap,
    homeCard: homeCard, mirrorReviewCard: mirrorReviewCard,
    completionCard: completionCard, movementMap: movementMap
  };
})();
