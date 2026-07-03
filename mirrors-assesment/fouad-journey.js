/* ════════════════════════════════════════════════════════════════════════
   fouad-journey.js — رحلة التقرير المتكامل لمقياس الفؤاد v2
   ────────────────────────────────────────────────────────────────────────
   يحول مخرجات محرك التقرير (report-engine) والنتائج المحفوظة إلى رحلة
   من سبع محطات مسماة: قبل أن تقرأ · طابعك · دوافعك · مراياك · الخيط الجامع
   · خطوتك · الختام. كل محطة شاشة، وينتهي بعرض كامل قابل للطباعة.

   البناء طبقتان:
   • buildModel(ctx)  — منطق نقي يُرجع مصفوفة محطات (قابل للاختبار في Node).
   • start(ctx)       — عرض وتنقل في المتصفح عبر ctx.setHTML.

   قواعد صارمة: لا رقم طابع ولا مصطلح تقني يصل للعميل. الأسماء من
   FOUAD_JOURNEY_CONTENT حصرًا. لا حسم لأي تعادل أو التباس.
   ════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FOUAD_JOURNEY = api;
  if (typeof globalThis !== "undefined") globalThis.FOUAD_JOURNEY = api;
})(this, function () {
  "use strict";

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  /* تطبيع عرضي للترقيم: الشرطة الاعتراضية الطويلة في النصوص المصدرية القديمة
     تتحول عند العرض فقط إلى فاصلة منقوطة (الملفات الأصلية لا تُمس). */
  function noDash(t){ return String(t==null?'':t).replace(/\s*—\s*/g, '؛ '); }
  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }
  function fill(tpl, map){
    return String(tpl||'').replace(/\{(\w+)\}/g, function(_,k){ return (map && map[k]!=null) ? map[k] : ''; });
  }

  /* اسم الطابع بحسب صيغة المخاطبة المختارة ('f' مؤنث، غير ذلك مذكر) */
  function typeName(content, typeId, gender){
    var t = content.typeNames && content.typeNames[typeId];
    if(!t) return '';
    return (gender === 'f' && t.f) ? t.f : (t.m || '');
  }

  /* ════════════════ بناء نموذج المحطات (منطق نقي) ════════════════
     ctx: { cfg, edu, content, rep, results, partial, gender,
            mirrorDisplayName(name), posLabel:{...} }                */
  function buildModel(ctx){
    var cfg = ctx.cfg, edu = ctx.edu, C = ctx.content, rep = ctx.rep;
    var results = ctx.results || {};
    var R = C.report;
    var posLabel = ctx.posLabel || C.posLabels;
    var dispName = ctx.mirrorDisplayName || function(n){ return (C.mirrorDisplay && C.mirrorDisplay[n]) || n; };
    var stations = [];

    /* ── المحطة ١: قبل أن تقرأ ── */
    stations.push({
      id: 'ground', name: R.navNames[0],
      blocks: [
        { kind: 'ground', text: R.ground },
        ctx.partial ? { kind: 'note', text: R.partialNote } : null
      ].filter(Boolean)
    });

    /* ── المحطة ٢: طابعك ── */
    var tp = (rep && rep.typesPattern) || { dominant: [], tie: false };
    var typeBlocks = [];
    if(tp.tie && tp.dominant.length > 1){
      typeBlocks.push({ kind: 'p', text: R.type.tie });
      tp.dominant.slice(0, 2).forEach(function(t){
        typeBlocks.push({ kind: 'portrait', name: typeName(C, t, ctx.gender), text: C.portraits[t] || '' });
      });
    } else if(tp.dominant.length === 1){
      typeBlocks.push({ kind: 'p', text: R.type.intro });
      typeBlocks.push({ kind: 'portrait', name: typeName(C, tp.dominant[0], ctx.gender), text: C.portraits[tp.dominant[0]] || '' });
    } else {
      typeBlocks.push({ kind: 'p', text: R.type.none });
    }
    stations.push({ id: 'type', name: R.navNames[1], blocks: typeBlocks });

    /* ── المحطة ٣: دوافعك الثلاثة ──
       الوجه الغالب لكل قوة = أعلى طابع من طبائعها في ترتيب التقرير
       (نفس منطق التوليفة في لوحة الإدارة: أعلى طابع في كل مركز). */
    var ranking = (rep && rep.typesPattern && rep.typesPattern.ranking) || [];
    var scoreOf = {};
    ranking.forEach(function(r){ if(r && r.type) scoreOf[r.type] = (typeof r.rawSum==='number' ? r.rawSum : 0); });
    var dominantType = (!tp.tie && tp.dominant.length === 1) ? tp.dominant[0] : null;

    var motiveBlocks = [{ kind: 'p', text: R.motives.intro }];
    (R.motives.centers || []).forEach(function(c){
      var best = null, bestScore = -1, tieBest = false;
      c.types.forEach(function(t){
        var sc = scoreOf[t] || 0;
        if(sc > bestScore){ best = t; bestScore = sc; tieBest = false; }
        else if(sc === bestScore && sc > 0){ tieBest = true; }
      });
      var block = { kind: 'motive', center: c.name, desc: c.desc };
      if(best && bestScore > 0){
        block.face = fill(R.motives.faceLine, { name: typeName(C, best, ctx.gender) });
        if(tieBest){
          // تعادل داخل القوة: نعرض الاسمين بأمانة
          var names = c.types.filter(function(t){ return (scoreOf[t]||0) === bestScore; })
                             .map(function(t){ return typeName(C, t, ctx.gender); });
          block.face = fill(R.motives.faceLine, { name: names.join(' و') });
        }
        if(dominantType && c.types.indexOf(dominantType) !== -1 && best === dominantType && !tieBest){
          block.note = R.motives.dominantNote;
        }
      } else {
        block.face = R.motives.missing;
      }
      motiveBlocks.push(block);
    });
    stations.push({ id: 'motives', name: R.navNames[2], blocks: motiveBlocks });

    /* ── المحطة ٤: مراياك ── */
    var mirrorBlocks = [];
    (cfg.mirrors || []).forEach(function(m){
      var res = results[m.id];
      if(!res || !Array.isArray(res.ranking) || !res.ranking.length) return;   // مرآة غير مكتملة تُتخطى
      var mb = { kind: 'mirror', mirrorId: m.id, name: dispName(m.name), intro: (R.mirrorIntros || {})[m.id] || '', axes: [] };

      var isWeak = (res.scenario === 'weak') || (res.flags && res.flags.weakSignal);
      var spectrum = (res.spectrum && typeof res.spectrum === 'object') ? res.spectrum : null;
      if(isWeak || !spectrum || !Object.keys(spectrum).length){
        mb.weak = (edu[m.id] && edu[m.id].weakSignal) || R.weakMirror;
        mirrorBlocks.push(mb);
        return;
      }

      var domAxis = res.dominantAxis || (res.ranking[0] ? res.ranking[0].axisId : null);
      Object.keys(spectrum).forEach(function(axisId){
        var sp = spectrum[axisId]; if(!sp) return;
        var axCfg = (m.axes || []).find(function(a){ return a.id === axisId; });
        var text = ((edu[m.id] && edu[m.id].axes[axisId] && edu[m.id].axes[axisId].spectrum) || {})[sp.key] || '';
        var entry = {
          axisId: axisId,
          axisName: axCfg ? axCfg.name : axisId,
          isDominant: (axisId === domAxis),
          position: sp.position || null,
          key: sp.key || null,
          label: posLabel[sp.position] || '',
          sp: sp,
          text: text
        };
        if(sp.ambiguous === true || sp.position === 'ambiguous') entry.unstable = C.unstable || R.unstable;
        if(sp.suspiciousBalance === true) entry.suspicious = R.suspicious;
        mb.axes.push(entry);
      });
      // الطريقة الغالبة أولًا
      mb.axes.sort(function(a, b){ return (b.isDominant?1:0) - (a.isDominant?1:0); });
      mirrorBlocks.push(mb);
    });
    stations.push({ id: 'mirrors', name: R.navNames[3], blocks: mirrorBlocks });

    /* ── المحطة ٥: الخيط الجامع (يُركب من خريطة الطيف بصدق) ── */
    var sm = (rep && rep.spectrumMap) || { counts: { balance:0, excess:0, deficit:0, ambiguous:0, total:0 } };
    var c0 = sm.counts;
    var measured = (c0.balance||0) + (c0.excess||0) + (c0.deficit||0);
    var threadParas = [R.thread.opening];

    var majority = null;
    if(measured > 0){
      if((c0.excess||0)  > (c0.balance||0) && (c0.excess||0)  > (c0.deficit||0)) majority = 'excess';
      else if((c0.deficit||0) > (c0.balance||0) && (c0.deficit||0) > (c0.excess||0)) majority = 'deficit';
      else if((c0.balance||0) > (c0.excess||0)  && (c0.balance||0) > (c0.deficit||0)) majority = 'balance';
    }
    if(majority === 'excess')       threadParas.push(R.thread.excess);
    else if(majority === 'deficit') threadParas.push(R.thread.deficit);
    else if(majority === 'balance') threadParas.push(R.thread.balance);
    else if(measured > 0)           threadParas.push(R.thread.split);

    if((c0.ambiguous||0) >= Math.max(2, Math.ceil(((c0.total||0)) / 2))){
      threadParas.push(R.thread.ambiguousMany);
    }

    // صدى العمق: موقع الطريقة الغالبة في الجذر الخفي مقابل الاتجاه العام
    var deep = results['mirror7'];
    if(majority && deep && deep.spectrum){
      var dAxis = deep.dominantAxis || (deep.ranking && deep.ranking[0] ? deep.ranking[0].axisId : null);
      var dsp = dAxis ? deep.spectrum[dAxis] : null;
      if(!dsp){ var ks = Object.keys(deep.spectrum); if(ks.length) dsp = deep.spectrum[ks[0]]; }
      if(dsp && dsp.position && dsp.position !== 'ambiguous'){
        threadParas.push(dsp.position === majority ? R.thread.deepSame : R.thread.deepDiff);
      }
    }
    threadParas.push(R.thread.close);
    stations.push({ id: 'thread', name: R.navNames[4], blocks: threadParas.map(function(t){ return { kind:'p', text:t }; }), lean: majority });

    /* ── المحطة ٦: خطوتك ── */
    var stepKey = majority || 'mixed';
    if((c0.ambiguous||0) >= Math.max(2, Math.ceil(((c0.total||0)) / 2))) stepKey = 'mixed';
    stations.push({
      id: 'step', name: R.navNames[5],
      blocks: [
        { kind: 'p', text: R.step.intro },
        { kind: 'experiment', text: R.step[stepKey] || R.step.mixed },
        { kind: 'note', text: R.step.note }
      ]
    });

    /* ── المحطة ٧: الختام ── */
    stations.push({ id: 'closing', name: R.navNames[6], blocks: [ { kind: 'ground', text: R.closing } ] });

    return { stations: stations, navNames: R.navNames };
  }

  /* ════════════════ العرض (متصفح) ════════════════ */

  function blockHTML(b, ctx){
    var C = ctx.content, R = C.report;
    if(!b) return '';
    if(b.kind === 'ground')  return '<div class="jr-ground"><p>' + esc(b.text) + '</p></div>';
    if(b.kind === 'note')    return '<p class="jr-note">' + esc(b.text) + '</p>';
    if(b.kind === 'p')       return '<p class="jr-p">' + esc(b.text) + '</p>';
    if(b.kind === 'portrait')
      return '<div class="jr-portrait">'
           +   (b.name ? '<div class="jr-type-name">' + esc(b.name) + '</div>' : '')
           +   '<p class="jr-p">' + esc(b.text) + '</p>'
           + '</div>';
    if(b.kind === 'experiment')
      return '<div class="jr-experiment"><p>' + esc(b.text) + '</p></div>';
    if(b.kind === 'motive')
      return '<div class="jr-motive">'
           +   '<div class="jr-motive-name">' + esc(b.center) + '</div>'
           +   '<div class="jr-motive-desc">' + esc(b.desc) + '</div>'
           +   '<div class="jr-motive-face">' + esc(b.face) + (b.note ? ' <span class="jr-motive-note">' + esc(b.note) + '</span>' : '') + '</div>'
           + '</div>';
    if(b.kind === 'mirror'){
      var inner = '<div class="jr-mirror-name">مرآة ' + esc(b.name) + '</div>'
                + (b.intro ? '<p class="jr-mirror-intro">' + esc(b.intro) + '</p>' : '');
      if(b.weak){
        inner += '<p class="jr-p">' + esc(noDash(b.weak)) + '</p>';
      } else {
        (b.axes || []).forEach(function(a){
          var color = ctx.posColor ? ctx.posColor(a.position, a.key) : 'var(--muted)';
          var bar   = ctx.spectrumBar ? ctx.spectrumBar(Object.assign({}, a.sp, { key: a.key })) : '';
          inner += '<div class="jr-axis" style="border-inline-start-color:' + color + '">'
                +    '<div class="jr-axis-name" style="color:' + color + '">'
                +      esc(a.axisName)
                +      (a.isDominant ? ' <span class="jr-dom-tag">طريقتك الغالبة</span>' : '')
                +      (a.label ? ': ' + esc(a.label) : '')
                +    '</div>'
                +    bar
                +    '<p class="jr-axis-text">' + esc(noDash(a.text)) + '</p>'
                +    (a.suspicious ? '<p class="jr-flag">' + esc(a.suspicious) + '</p>' : '')
                +    (a.unstable && (a.position === 'ambiguous') ? '<p class="jr-flag">' + esc(a.unstable) + '</p>' : '')
                +  '</div>';
        });
      }
      return '<div class="jr-mirror">' + inner + '</div>';
    }
    return '';
  }

  function stationHTML(model, idx, ctx){
    var st = model.stations[idx], R = ctx.content.report;
    var dots = model.stations.map(function(s, i){
      var cls = 'jr-dot' + (i === idx ? ' on' : (i < idx ? ' done' : ''));
      return '<span class="' + cls + '" title="' + esc(s.name) + '"></span>';
    }).join('');
    var body = (st.blocks || []).map(function(b){ return blockHTML(b, ctx); }).join('');

    var isLast = (idx === model.stations.length - 1);
    var nav = '<div class="jr-nav">'
            +   (idx > 0 ? '<button class="btn ghost" id="jrPrev">' + esc(R.buttons.prev) + '</button>' : '')
            +   (!isLast ? '<button class="btn primary" id="jrNext">' + esc(R.buttons.next) + '</button>' : '')
            + '</div>';
    var finalActions = isLast
      ? '<div class="jr-final">'
        +   '<button class="btn primary" id="jrFull">'  + esc(R.buttons.full)  + '</button>'
        +   '<button class="btn ghost"   id="jrPrint">' + esc(R.buttons.print) + '</button>'
        +   '<button class="btn ghost"   id="jrBack">'  + esc(R.buttons.back)  + '</button>'
        + '</div>'
      : '';

    return '<div class="jr-head">'
         +   '<div class="jr-station-name">' + esc(st.name) + '</div>'
         +   '<div class="jr-progress">' + esc(fill(R.buttons.stationOf, { i: arabicNum(idx + 1), n: arabicNum(model.stations.length) })) + '</div>'
         +   '<div class="jr-dots">' + dots + '</div>'
         + '</div>'
         + '<div class="jr-body">' + body + '</div>'
         + nav + finalActions;
  }

  function fullReportHTML(model, ctx){
    var R = ctx.content.report;
    var sections = model.stations.map(function(st){
      return '<div class="jr-full-section">'
           +   '<div class="jr-station-name">' + esc(st.name) + '</div>'
           +   (st.blocks || []).map(function(b){ return blockHTML(b, ctx); }).join('')
           + '</div>';
    }).join('');
    return sections
      + '<div class="jr-final no-print">'
      +   '<button class="btn ghost" id="jrPrint2">' + esc(R.buttons.print) + '</button>'
      +   '<button class="btn ghost" id="jrBack2">'  + esc(R.buttons.back)  + '</button>'
      + '</div>';
  }

  function start(ctx){
    var model = buildModel(ctx);
    var idx = 0;

    function wire(){
      var p = document.getElementById('jrPrev');   if(p) p.addEventListener('click', function(){ idx = Math.max(0, idx - 1); show(); });
      var n = document.getElementById('jrNext');   if(n) n.addEventListener('click', function(){ idx = Math.min(model.stations.length - 1, idx + 1); show(); });
      var f = document.getElementById('jrFull');   if(f) f.addEventListener('click', showFull);
      var pr = document.getElementById('jrPrint'); if(pr) pr.addEventListener('click', function(){ showFull(true); });
      var b = document.getElementById('jrBack');   if(b) b.addEventListener('click', function(){ if(ctx.onExit) ctx.onExit(); });
    }
    function show(){
      ctx.setHTML('<div class="card report jr">' + stationHTML(model, idx, ctx) + '</div>');
      wire();
    }
    function showFull(andPrint){
      ctx.setHTML('<div class="card report jr jr-full">' + fullReportHTML(model, ctx) + '</div>');
      var pr = document.getElementById('jrPrint2'); if(pr) pr.addEventListener('click', function(){ window.print(); });
      var b  = document.getElementById('jrBack2');  if(b)  b.addEventListener('click', function(){ if(ctx.onExit) ctx.onExit(); });
      if(andPrint === true) setTimeout(function(){ window.print(); }, 150);
    }
    show();
  }

  return { buildModel: buildModel, start: start };
});
