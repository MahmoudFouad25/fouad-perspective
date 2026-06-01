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
    if(ambiguous)       whisper = '<div class="sb-whisper">لم تُحسَم بعد — تُفرَز في تأمّلٍ أعمق.</div>';
    else if(suspicious) whisper = '<div class="sb-whisper">اتزانٌ يستحقّ نظرة.</div>';

    return ''
      + '<div class="spectrum-bar' + (ambiguous ? ' is-amb' : '') + '">'
      +   '<div class="sb-track">'
      +     '<span class="sb-zone sb-deficit"></span>'
      +     '<span class="sb-zone sb-balance"></span>'
      +     '<span class="sb-zone sb-excess"></span>'
      +     marker
      +   '</div>'
      +   '<div class="sb-labels"><span>تفريط</span><span>اتزان</span><span>إفراط</span></div>'
      +   suffixHTML
      +   whisper
      + '</div>';
  }

  /* ───────────────── (١)(٣) النخلة/المسار الصاعد ─────────────────
     nodes: مصفوفة بترتيب القوس (القاعدة→القمّة): السلوك أسفل، الجروح أعلى.
     كلّ عنصر: { id, name, status:'done'|'active'|'todo', color }.
     opts.allDone: يُشعل تاج النخلة عند اكتمال المرايا.
     SVG موحٍ بالنخلة لا محاكاةٌ حرفيّة. الوصول دائمًا بالهويّة لا بالموضع. */
  function palmTree(nodes, opts){
    opts  = opts  || {};
    nodes = nodes || [];
    var n = nodes.length || 7;
    var W = 400, padTop = 72, padBottom = 58, step = 86, trunkX = 104, labelX = 268;
    var H = padTop + (n > 1 ? (n - 1) * step : 0) + padBottom;

    // نقاط العقد من القاعدة (أسفل) إلى القمّة (أعلى) مع تمايلٍ عضويّ خفيف
    var pts = [];
    for(var i = 0; i < n; i++){
      pts.push({ x: +(trunkX + Math.sin(i * 1.05) * 15).toFixed(1), y: H - padBottom - i * step });
    }

    // الجذع: منحنى ناعم صاعد عبر العقد
    var trunk = 'M ' + pts[0].x + ' ' + (H - 14).toFixed(1) + ' L ' + pts[0].x + ' ' + pts[0].y.toFixed(1);
    for(var k = 1; k < n; k++){
      var a = pts[k-1], b = pts[k], my = ((a.y + b.y) / 2).toFixed(1);
      trunk += ' C ' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y.toFixed(1);
    }

    var STATUS_WORD = { done: 'تمّت', active: 'جاريّة', todo: 'لم تبدأ' };
    var body = '';

    for(var j = 0; j < n; j++){
      var p = pts[j], nd = nodes[j] || {}, st = nd.status || 'todo';
      var col = (st === 'done') ? (nd.color || DONE_NEUTRAL) : null;
      var frondOp = (st === 'done') ? 0.9 : (st === 'active' ? 0.5 : 0.22);
      var frondColor = col || 'var(--palm-frond)';
      var y = p.y.toFixed(1);

      // سعفتان توحيان بالنخلة
      body += '<g opacity="' + frondOp + '" fill="none" stroke="' + frondColor + '" stroke-width="2.2" stroke-linecap="round">'
           +    '<path d="M ' + p.x + ' ' + y + ' q -16 -9 -28 -26"/>'
           +    '<path d="M ' + p.x + ' ' + y + ' q 16 -9 28 -26"/>'
           +  '</g>';

      // خيطٌ خافتٌ يربط العقدة باسمها
      body += '<line x1="' + (p.x + 16) + '" y1="' + y + '" x2="196" y2="' + y + '" stroke="var(--line)" stroke-width="1" opacity="0.38" stroke-dasharray="2 4"/>';

      // العقدة بحسب الحالة
      if(st === 'done'){
        body += '<circle cx="' + p.x + '" cy="' + y + '" r="22" fill="' + col + '" opacity="0.13"/>'
             +  '<circle cx="' + p.x + '" cy="' + y + '" r="13" fill="' + col + '" stroke="' + col + '" stroke-width="1.5"/>'
             +  '<circle cx="' + p.x + '" cy="' + y + '" r="4" fill="#0f172a" opacity="0.55"/>';
      } else if(st === 'active'){
        body += '<circle cx="' + p.x + '" cy="' + y + '" r="13" fill="rgba(251,191,36,0.14)" stroke="' + COLOR.gold + '" stroke-width="2" stroke-dasharray="3 4"/>'
             +  '<circle cx="' + p.x + '" cy="' + y + '" r="3.5" fill="' + COLOR.gold + '"/>';
      } else {
        body += '<circle cx="' + p.x + '" cy="' + y + '" r="12.5" fill="none" stroke="var(--line)" stroke-width="1.5"/>';
      }

      // الاسم والحالة (نصّ SVG عربيّ)
      body += '<text x="' + labelX + '" y="' + (p.y - 3) + '" text-anchor="middle" class="palm-name">' + esc(nd.name || '') + '</text>'
           +  '<text x="' + labelX + '" y="' + (p.y + 16) + '" text-anchor="middle" class="palm-status palm-' + st + '">' + esc(STATUS_WORD[st] || '') + '</text>';

      // منطقة النقر للمكتملة فقط → مراجعة (لا قفز داخل مرآةٍ جاريّة)
      if(st === 'done'){
        body += '<circle class="palm-hit" data-node="' + esc(nd.id || '') + '" cx="' + p.x + '" cy="' + y + '" r="30" fill="transparent" style="cursor:pointer"/>';
      }
    }

    // تاج النخلة في القمّة — يكتمل ضوؤه حين تكتمل المرايا
    var top = pts[n - 1];
    var crownVivid = !!opts.allDone;
    var crownCol = crownVivid ? 'url(#palmCrown)' : 'var(--palm-frond)';
    var crown = '<g opacity="' + (crownVivid ? 0.95 : 0.3) + '" fill="none" stroke="' + crownCol + '" stroke-width="2.4" stroke-linecap="round">';
    var fan = [-46, -28, -10, 10, 28, 46];
    for(var f = 0; f < fan.length; f++){
      var ang = fan[f] * Math.PI / 180;
      var ex = (top.x + Math.sin(ang) * 52).toFixed(1);
      var ey = (top.y - 30 - Math.cos(ang) * 40).toFixed(1);
      crown += '<path d="M ' + top.x + ' ' + (top.y - 6) + ' Q ' + (top.x + Math.sin(ang) * 22).toFixed(1) + ' ' + (top.y - 24) + ' ' + ex + ' ' + ey + '"/>';
    }
    crown += '</g>';

    return ''
      + '<svg class="palm-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="شجرة الرحلة">'
      +   '<defs>'
      +     '<linearGradient id="palmTrunk" x1="0" y1="1" x2="0" y2="0">'
      +       '<stop offset="0" stop-color="var(--palm-trunk-1)"/><stop offset="1" stop-color="var(--palm-trunk-2)"/>'
      +     '</linearGradient>'
      +     '<linearGradient id="palmCrown" x1="0" y1="1" x2="0" y2="0">'
      +       '<stop offset="0" stop-color="' + COLOR.green + '"/><stop offset="1" stop-color="' + COLOR.gold + '"/>'
      +     '</linearGradient>'
      +   '</defs>'
      +   '<path d="' + trunk + '" fill="none" stroke="url(#palmTrunk)" stroke-width="5" stroke-linecap="round"/>'
      +   crown
      +   body
      + '</svg>';
  }

  /* ───────────────── (١) كارت البيت ─────────────────
     model: { name, palmSVG, doneCount, totalCount, progressPct, hasNext, allDone } */
  function homeCard(m){
    m = m || {};
    var greet = m.name ? ('أهلًا، ' + esc(m.name)) : 'أهلًا بك';
    var actions = '';
    if(m.hasNext) actions += '<button class="btn primary" id="homeContinue">تابِع رحلتك</button>';
    if(m.allDone) actions += '<button class="btn primary" id="homeReport">صورتك المتكاملة</button>';

    return ''
      + '<div class="home-head">'
      +   '<div class="home-greet">' + greet + '</div>'
      +   '<div class="home-sub">هذه شجرة رحلتك في المرايا. انظر أين بلغتَ، وعُد إلى ما تمّ حين تشاء.</div>'
      + '</div>'
      + '<div class="home-progress">'
      +   '<div class="progress-bar"><div class="progress-fill" style="width:' + (m.progressPct || 0) + '%"></div></div>'
      +   '<div class="home-progress-label">أتممتَ ' + arabicNum(m.doneCount || 0) + ' من ' + arabicNum(m.totalCount || 0) + ' مرايا</div>'
      + '</div>'
      + '<div class="palm-wrap">' + (m.palmSVG || '') + '</div>'
      + (actions ? '<div class="home-actions">' + actions + '</div>' : '')
      + '<div class="home-hint">انقر مرآةً تمّت لتعود إلى قراءتها.</div>';
  }

  /* ───────────────── شاشة المراجعة ─────────────────
     model: { mirrorName, mirrorOrdinal, weakText?, blocks:[{axisName,axisIntro,afterRanking,rooting}],
              spectra:[{axisName,positionLabel,barHTML,text}] }
     تعيد عرض ما رآه العميل من المحفوظ + المحتوى — لا توليد جديد. */
  function mirrorReviewCard(m){
    m = m || {};
    var inner = '';
    inner += '<div class="mirror-tag">المرآة ' + esc(m.mirrorOrdinal || '') + ' — ' + esc(m.mirrorName || '') + '</div>';
    inner += '<div class="review-note">هذه قراءتك كما رأيتَها — نعيدها عليك كما هي، لا نكتب جديدًا.</div>';

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
              +    '<div class="sr-axis">' + esc(s.axisName || '') + (s.positionLabel ? (' — ' + esc(s.positionLabel)) : '') + '</div>'
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
      +   '<div class="palm-wrap palm-complete">' + (m.palmSVG || '') + '</div>'
      +   '<div class="completion-line">أتممتَ المرايا السبع. ما رأيتَه فيها مجموعٌ الآن في صورةٍ واحدة.</div>'
      +   '<div class="completion-sub">خذ نَفَسًا، ثمّ انظر إليها كما تُنظَر مرآة — بهدوء.</div>'
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
    spectrumBar: spectrumBar, palmTree: palmTree,
    homeCard: homeCard, mirrorReviewCard: mirrorReviewCard,
    completionCard: completionCard, movementMap: movementMap
  };
})();
