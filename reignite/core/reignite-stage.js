/* ════════════════════════════════════════════════════════════════════════
   reignite-stage.js — محرّك عرض المراحل (مشترك: عرض كبير + عميل تفاعليّ)
   ────────────────────────────────────────────────────────────────────────
   STAGE.render(mountEl, phaseId, mode, ctx)
     mode = 'display' (بروجكتور، قراءة) | 'client' (عميل، تفاعليّ)
     ctx  = { user, role, answers, responses, onAnswer, axisName }
   لا منطق جلسة هنا — عرض فقط، يقرأ من REIGNITE_FLOW.
   ════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var F = global.REIGNITE_FLOW;

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function arNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }
  function scenarioFor(phaseId, role){
    var s = F.SCENARIOS[phaseId]; if(!s) return '';
    return s[role] || s.leader || '';
  }

  /* ════════ مرحلة الانتظار ════════ */
  function rWait(p, mode){
    return '<div class="stg stg-center">' +
      '<div class="stg-kicker">Reignite</div>' +
      '<div class="stg-title">'+esc(p.title)+'</div>' +
      '<div class="stg-note">'+esc(p.clientNote)+'</div>' +
      (mode==='client' ? '<div class="stg-dots"><span></span><span></span><span></span></div>' : '') +
    '</div>';
  }

  /* ════════ السؤال الافتتاحيّ ════════ */
  function rQuestion(p, mode, ctx){
    var h = '<div class="stg stg-center">' +
      '<div class="stg-kicker">'+esc(p.kicker||'')+'</div>' +
      '<div class="stg-title gold">'+esc(p.question)+'</div>' +
      '<div class="stg-note">'+esc(p.sub)+'</div>';
    if(p.selfWrite){
      if(mode==='client'){
        var saved = (ctx.answers && ctx.answers[p.id] && ctx.answers[p.id][p.selfWrite.key]) || '';
        h += '<div class="stg-selfwrite">' +
          '<label>'+esc(p.selfWrite.label)+'</label>' +
          '<input type="text" class="stg-input" id="sw_'+p.id+'" value="'+esc(saved)+'" placeholder="'+esc(p.selfWrite.placeholder)+'">' +
          '<button class="stg-btn primary" data-act="selfwrite" data-key="'+esc(p.selfWrite.key)+'" data-phase="'+p.id+'">احتفظ به لنفسك</button>' +
        '</div>';
      } else {
        h += '<div class="stg-selfwrite-hint">'+esc(p.selfWrite.label)+'</div>';
      }
    }
    h += '</div>';
    return h;
  }

  /* ════════ الميثاق ════════ */
  function rCharter(p, mode){
    var words = (p.words||[]).map(function(w){ return '<span class="stg-word">'+esc(w)+'</span>'; }).join('<span class="stg-word-sep">·</span>');
    var lines = (p.lines||[]).map(function(l){ return '<p class="stg-p">'+esc(l)+'</p>'; }).join('');
    return '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<div class="stg-words">'+words+'</div>' +
      lines +
    '</div>';
  }

  /* ════════ التصويت (الإرهاق/الاحتراق) ════════ */
  function rPoll(p, mode, ctx){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<p class="stg-p">'+esc(p.intro)+'</p>';

    // سيناريو الدور (لو موجود)
    var sc = scenarioFor(p.id, ctx.role);
    if(sc && mode==='client') h += '<div class="stg-scenario">'+esc(sc)+'</div>';

    h += '<div class="stg-pollq">'+esc(p.pollQuestion)+'</div>';

    if(mode==='client'){
      var myChoice = (ctx.answers && ctx.answers[p.id] && ctx.answers[p.id].choice) || '';
      h += '<div class="stg-options">';
      (p.options||[]).forEach(function(o){
        var sel = (myChoice===o.id) ? ' selected' : '';
        h += '<button class="stg-opt'+sel+'" data-act="poll" data-phase="'+p.id+'" data-choice="'+esc(o.id)+'">'+esc(o.label)+'</button>';
      });
      h += '</div>';
    } else {
      // عرض كبير: نتائج مجمّعة
      var tally = ctx.tally || { counts:{}, total:0 };
      h += '<div class="stg-bars">';
      (p.options||[]).forEach(function(o){
        var c = tally.counts[o.id]||0;
        var pct = tally.total ? Math.round((c/tally.total)*100) : 0;
        h += '<div class="stg-bar-row">' +
          '<div class="stg-bar-label">'+esc(o.label)+'</div>' +
          '<div class="stg-bar-track"><div class="stg-bar-fill" style="width:'+pct+'%"></div></div>' +
          '<div class="stg-bar-val">'+arNum(pct)+'٪</div>' +
        '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ════════ بيان (الاحتراق عَرَض) ════════ */
  function rStatement(p, mode){
    var lines = (p.lines||[]).map(function(l){ return '<p class="stg-p">'+esc(l)+'</p>'; }).join('');
    return '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      lines +
      (p.highlight ? '<div class="stg-highlight">'+esc(p.highlight)+'</div>' : '') +
    '</div>';
  }

  /* ════════ المستويات الثلاثة ════════ */
  function rLevels(p, mode, ctx){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<p class="stg-p">'+esc(p.intro)+'</p>' +
      '<div class="stg-pollq">'+esc(p.pollQuestion)+'</div>' +
      '<div class="stg-levels">';
    F.LEVELS.forEach(function(lv){
      var sel = (mode==='client' && ctx.answers && ctx.answers[p.id] && ctx.answers[p.id].choice===lv.id) ? ' selected' : '';
      var attrs = (mode==='client') ? ' data-act="poll" data-phase="'+p.id+'" data-choice="'+lv.id+'"' : '';
      var tag = (mode==='client') ? 'button' : 'div';
      h += '<'+tag+' class="stg-level'+sel+'"'+attrs+' style="--lvc:'+lv.color+'">' +
        '<div class="stg-level-name">'+esc(lv.name)+'</div>' +
        '<div class="stg-level-line">'+esc(lv.line)+'</div>' +
      '</'+tag+'>';
    });
    h += '</div>';
    if(mode==='display' && ctx.tally && ctx.tally.total){
      h += '<div class="stg-bars" style="margin-top:18px">';
      F.LEVELS.forEach(function(lv){
        var c = ctx.tally.counts[lv.id]||0;
        var pct = ctx.tally.total ? Math.round((c/ctx.tally.total)*100) : 0;
        h += '<div class="stg-bar-row"><div class="stg-bar-label">'+esc(lv.name)+'</div>' +
          '<div class="stg-bar-track"><div class="stg-bar-fill" style="width:'+pct+'%;background:'+lv.color+'"></div></div>' +
          '<div class="stg-bar-val">'+arNum(pct)+'٪</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ════════ المحاور كعدسة ════════ */
  function rAxes(p, mode){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<p class="stg-p">'+esc(p.intro)+'</p>' +
      '<div class="stg-axes">';
    F.AXES_LENS.forEach(function(ax){
      h += '<div class="stg-axis" style="--axc:'+ax.color+'">' +
        '<div class="stg-axis-name">'+esc(ax.name)+'</div>' +
        '<div class="stg-axis-q">'+esc(ax.q)+'</div>' +
        '<div class="stg-axis-desc">'+esc(ax.desc)+'</div>' +
      '</div>';
    });
    h += '</div>' +
      '<div class="stg-bridge">'+esc(p.bridge)+'</div>' +
    '</div>';
    return h;
  }

  /* ════════ الترتيب الشخصيّ ════════ */
  function rOrder(p, mode, ctx){
    var lines = (p.lines||[]).map(function(l){ return '<p class="stg-p">'+esc(l)+'</p>'; }).join('');
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' + lines;
    if(mode==='client'){
      var saved = (ctx.answers && ctx.answers[p.id]) || {};
      h += '<div class="stg-rank">' +
        '<div class="stg-rank-hint">رتّب محاورك (اختَر لكل خانة):</div>';
      ['primary','secondary','repressed'].forEach(function(slot){
        var lbl = slot==='primary'?'الرئيسيّ':(slot==='secondary'?'الفرعيّ':'المكبوت');
        h += '<div class="stg-rank-row"><span class="stg-rank-lbl">'+lbl+'</span><div class="stg-rank-opts">';
        F.AXES_LENS.forEach(function(ax){
          var sel = saved[slot]===ax.id ? ' selected':'';
          h += '<button class="stg-chip'+sel+'" data-act="rank" data-phase="'+p.id+'" data-slot="'+slot+'" data-axis="'+ax.id+'">'+esc(ax.name)+'</button>';
        });
        h += '</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ════════ الاستراتيجية بالأربع لحظات ════════ */
  function rStrategy(p, mode, ctx){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<div class="stg-title gold" style="font-size:clamp(22px,3.6vw,40px)">'+esc(p.question)+'</div>' +
      '<div class="stg-moments">';
    F.MOMENTS.forEach(function(m){
      h += '<div class="stg-moment" style="--mc:'+m.color+'">' +
        '<div class="stg-moment-name">'+esc(m.name)+'</div>' +
        '<div class="stg-moment-text">'+esc(m.text)+'</div>' +
      '</div>';
    });
    h += '</div>';
    var sc = scenarioFor(p.id, ctx.role);
    if(sc && mode==='client') h += '<div class="stg-scenario">'+esc(sc)+'</div>';
    h += '<div class="stg-seed">'+esc(p.seed)+'</div>' +
    '</div>';
    return h;
  }

  /* ════════ المنحنى كمرآة ════════ */
  function rCurve(p, mode){
    var lines = (p.lines||[]).map(function(l){ return '<p class="stg-p">'+esc(l)+'</p>'; }).join('');
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<div class="stg-curve">';
    F.CURVE.forEach(function(st,i){
      var cls = st.danger ? ' danger' : '';
      h += '<div class="stg-curve-step'+cls+'" style="--i:'+i+'">' +
        '<div class="stg-curve-dot"></div>' +
        '<div class="stg-curve-name">'+esc(st.name)+'</div>' +
        '<div class="stg-curve-note">'+esc(st.note)+'</div>' +
      '</div>';
    });
    h += '</div>' + lines + '</div>';
    return h;
  }

  /* ════════ الكروت التسعة ════════ */
  function rCards(p, mode, ctx){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<p class="stg-p">'+esc(p.intro)+'</p>';

    if(mode==='display'){
      // عرض كبير: المدرّب يمرّ عليهم — أسطر سريعة
      h += '<div class="stg-cards-grid display">';
      F.CARDS.forEach(function(c){
        h += '<div class="stg-card-mini" style="--ci:'+c.order+'">' +
          '<div class="stg-card-num">'+arNum(c.order)+'</div>' +
          '<div class="stg-card-name">'+esc(c.name)+'</div>' +
          '<div class="stg-card-coach">'+esc(c.coach)+'</div>' +
        '</div>';
      });
      h += '</div>';
      var touched = ctx.touchedCount || 0;
      h += '<div class="stg-counter-line">فتح الكروت حتى الآن: <b>'+arNum(touched)+'</b></div>';
    } else {
      // عميل: كروت قابلة للفتح
      h += '<div class="stg-prompt">'+esc(p.prompt)+'</div>' +
        '<div class="stg-cards-grid client">';
      var opened = (ctx.answers && ctx.answers[p.id] && ctx.answers[p.id].opened) || [];
      F.CARDS.forEach(function(c){
        var isOpen = opened.indexOf(c.id)>=0;
        h += '<div class="stg-card'+(isOpen?' open':'')+'" data-card="'+c.id+'">' +
          '<button class="stg-card-front" data-act="flip" data-phase="'+p.id+'" data-card="'+c.id+'">' +
            '<div class="stg-card-num">'+arNum(c.order)+'</div>' +
            '<div class="stg-card-name">'+esc(c.name)+'</div>' +
            '<div class="stg-card-tag">'+esc(c.tag)+'</div>' +
            '<div class="stg-card-fline">'+esc(c.front)+'</div>' +
          '</button>' +
          '<div class="stg-card-back">' +
            c.back.map(function(par){ return '<p class="stg-p">'+esc(par)+'</p>'; }).join('') +
          '</div>' +
        '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ════════ يعيش نمطه ════════ */
  function rPattern(p, mode, ctx){
    var h = '<div class="stg">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>';
    var sc = scenarioFor(p.id, ctx.role);
    if(mode==='client'){
      if(sc) h += '<div class="stg-scenario big">'+esc(sc)+'</div>';
      h += '<div class="stg-ask">'+esc(p.ask)+'</div>';
      var saved = (ctx.answers && ctx.answers[p.id] && ctx.answers[p.id].word) || '';
      h += '<div class="stg-selfwrite">' +
        '<label>'+esc(p.inputLabel)+'</label>' +
        '<input type="text" class="stg-input" id="pw_'+p.id+'" value="'+esc(saved)+'" placeholder="'+esc(p.placeholder)+'">' +
        '<button class="stg-btn primary" data-act="word" data-phase="'+p.id+'">أرسِل</button>' +
      '</div>';
    } else {
      h += '<p class="stg-p">'+esc(p.ask)+'</p>';
      // عرض كبير: سحابة كلمات مجمّعة
      var words = ctx.words || [];
      h += '<div class="stg-wordcloud">';
      if(words.length){
        words.forEach(function(w){ h += '<span class="stg-cloud-word">'+esc(w)+'</span>'; });
      } else {
        h += '<span class="stg-muted">في انتظار الكلمات…</span>';
      }
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  /* ════════ المقياس (حاوية فقط — يملؤها AXES_APP) ════════ */
  function rScale(p, mode){
    if(mode==='display'){
      return '<div class="stg stg-center">' +
        '<div class="stg-kicker">مقياس المحاور</div>' +
        '<div class="stg-title gold">افتح المقياس على هاتفك</div>' +
        '<div class="stg-note">'+esc(p.clientNote)+'</div>' +
        '<div class="stg-scale-counter" id="scaleCounter"></div>' +
      '</div>';
    }
    // عميل: علامة لازم AXES_APP يتفعّل (course-view بيتولّاه)
    return '<div class="stg-scale-mount" data-scale="1"></div>';
  }

  /* ════════ النتيجة ════════ */
  function rResult(p, mode, ctx){
    if(mode==='display'){
      return '<div class="stg stg-center">' +
        '<div class="stg-kicker">خريطتك</div>' +
        '<div class="stg-title gold">كلٌّ يرى خريطته على هاتفه</div>' +
        '<div class="stg-note">على أرض الكرامة — ﴿وَلَقَدْ كَرَّمْنَا بَنِي آدَمَ﴾</div>' +
      '</div>';
    }
    return '<div class="stg-scale-mount" data-scale="1"></div>';
  }

  /* ════════ أول تعافٍ ════════ */
  function rRecovery(p, mode){
    return '<div class="stg stg-center">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' +
      '<p class="stg-p">'+esc(p.generic)+'</p>' +
      '<div class="stg-practice-hint">تمرينك المخصّص ظهر مع خريطتك في الأسفل.</div>' +
    '</div>';
  }

  /* ════════ الإغلاق ════════ */
  function rClosing(p, mode, ctx){
    var lines = (p.lines||[]).map(function(l){ return '<p class="stg-p">'+esc(l)+'</p>'; }).join('');
    var h = '<div class="stg stg-center">' +
      '<div class="stg-kicker">'+esc(p.title)+'</div>' + lines;
    if(p.selfWrite && mode==='client'){
      var saved = (ctx.answers && ctx.answers[p.id] && ctx.answers[p.id][p.selfWrite.key]) || '';
      h += '<div class="stg-selfwrite">' +
        '<label>'+esc(p.selfWrite.label)+'</label>' +
        '<input type="text" class="stg-input" id="sw_'+p.id+'" value="'+esc(saved)+'" placeholder="'+esc(p.selfWrite.placeholder)+'">' +
        '<button class="stg-btn primary" data-act="selfwrite" data-key="'+esc(p.selfWrite.key)+'" data-phase="'+p.id+'">احتفظ به لنفسك</button>' +
      '</div>';
    } else if(p.selfWrite){
      h += '<div class="stg-selfwrite-hint">'+esc(p.selfWrite.label)+'</div>';
    }
    h += '<div class="stg-aya">'+esc(p.aya)+'</div></div>';
    return h;
  }

  /* ════════ الموجّه ════════ */
  function renderHTML(phaseId, mode, ctx){
    ctx = ctx || {};
    var p = F.phases[phaseId];
    if(!p) return '<div class="stg stg-center"><div class="stg-note">…</div></div>';
    switch(p.kind){
      case 'wait':      return rWait(p, mode);
      case 'question':  return rQuestion(p, mode, ctx);
      case 'charter':   return rCharter(p, mode);
      case 'poll':      return rPoll(p, mode, ctx);
      case 'statement': return rStatement(p, mode);
      case 'levels':    return rLevels(p, mode, ctx);
      case 'axes':      return rAxes(p, mode);
      case 'order':     return rOrder(p, mode, ctx);
      case 'strategy':  return rStrategy(p, mode, ctx);
      case 'curve':     return rCurve(p, mode);
      case 'cards':     return rCards(p, mode, ctx);
      case 'pattern':   return rPattern(p, mode, ctx);
      case 'scale':     return rScale(p, mode);
      case 'result':    return rResult(p, mode, ctx);
      case 'recovery':  return rRecovery(p, mode);
      case 'closing':   return rClosing(p, mode, ctx);
      default:          return rWait(p, mode);
    }
  }

  /* يربط أحداث التفاعل (عميل فقط) بعد الحقن */
  function bindClient(mountEl, phaseId, ctx){
    if(!mountEl) return;
    mountEl.querySelectorAll('[data-act]').forEach(function(el){
      el.addEventListener('click', function(){
        var act = el.getAttribute('data-act');
        var phase = el.getAttribute('data-phase') || phaseId;
        if(act==='poll'){
          var choice = el.getAttribute('data-choice');
          ctx.onAnswer && ctx.onAnswer(phase, { choice: choice });
          // علّم الاختيار بصريًّا
          var sib = mountEl.querySelectorAll('[data-act="poll"][data-phase="'+phase+'"]');
          sib.forEach(function(s){ s.classList.remove('selected'); });
          el.classList.add('selected');
        } else if(act==='selfwrite'){
          var key = el.getAttribute('data-key');
          var inp = mountEl.querySelector('#sw_'+phase);
          var obj = {}; obj[key] = inp ? inp.value.trim() : '';
          ctx.onAnswer && ctx.onAnswer(phase, obj);
          el.textContent = '✓ محفوظ';
        } else if(act==='word'){
          var inpw = mountEl.querySelector('#pw_'+phase);
          var w = inpw ? inpw.value.trim() : '';
          if(!w) return;
          ctx.onAnswer && ctx.onAnswer(phase, { word: w });
          el.textContent = '✓ تم';
        } else if(act==='rank'){
          var slot = el.getAttribute('data-slot');
          var axis = el.getAttribute('data-axis');
          ctx.onAnswer && ctx.onAnswer(phase, _mkRank(mountEl, phase, slot, axis));
          var row = el.parentNode;
          row.querySelectorAll('.stg-chip').forEach(function(c){ c.classList.remove('selected'); });
          el.classList.add('selected');
        } else if(act==='flip'){
          var card = el.getAttribute('data-card');
          var box = mountEl.querySelector('.stg-card[data-card="'+card+'"]');
          if(box) box.classList.toggle('open');
          ctx.onAnswer && ctx.onAnswer(phase, _mkOpened(mountEl, phase, card));
        }
      });
    });
  }
  function _mkRank(mountEl, phase, slot, axis){
    var cur = {};
    ['primary','secondary','repressed'].forEach(function(s){
      var sel = mountEl.querySelector('.stg-chip.selected[data-slot="'+s+'"]');
      if(sel) cur[s] = sel.getAttribute('data-axis');
    });
    cur[slot] = axis;
    return cur;
  }
  function _mkOpened(mountEl, phase, card){
    var opened = [];
    mountEl.querySelectorAll('.stg-card.open').forEach(function(b){ opened.push(b.getAttribute('data-card')); });
    if(opened.indexOf(card)<0) opened.push(card);
    return { opened: opened };
  }

  function render(mountEl, phaseId, mode, ctx){
    if(!mountEl) return;
    mountEl.innerHTML = renderHTML(phaseId, mode, ctx);
    if(mode==='client') bindClient(mountEl, phaseId, ctx||{});
  }

  global.REIGNITE_STAGE = { render: render, renderHTML: renderHTML, bindClient: bindClient };
  console.log('✅ REIGNITE_STAGE جاهز');
})(window);
