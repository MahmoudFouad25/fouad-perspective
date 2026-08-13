/* ════════════════════════════════════════════════════════════════════════
   burn-pulse.js — النبضة الأسبوعيّة ومودويل خطّ العافية
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-pulse.js

   مودويلٌ مستقلٌّ خفيف: يُركَّب في أيّ صفحةٍ فيها حاويةٌ وFirebase مُهيّأ.
   يقرأ من نفس وثيقة المقياس ويكتب في مصفوفة weeklyPulses.

   ──────────────────────────────────────────────────────────────────────
   ★ لماذا فُصل عن burn-app؟
     لأنّه يعمل تسع مرّاتٍ عبر تسعة أسابيع، بعد أن ينتهي المقياس بأسابيع.
     ولو دخل في آلة حالة التطبيق لوّثها بمنطقٍ لا علاقة له بتدفّق الجرعات.

   ──────────────────────────────────────────────────────────────────────
   ★ ثلاث قواعد يحرسها:

     ١) البنود لا تتغيّر أبدًا — لا صياغةً ولا ترتيبًا ولا مراسي.
        لأنّ أيّ تغييرٍ يكسر قابليّة المقارنة عبر تسع نقاط، والقيمة كلّها
        في المقارنة.

     ٢) لا تعليقَ سلبيًّا على الهبوط إطلاقًا، ولا تذكيرَ بممارسةٍ فائتةٍ
        في سياقه. فالمشارك الذي يُلام على الهبوط يبدأ يجمّل، فيرتفع الخطّ
        وتسوء الحالة — وهو أسوأ ما يمكن أن يقع لأداة متابعة.

     ٣) الأسبوعان السابع والثامن (القاع والدوران) هبوطهما متوقّعٌ ومقصود،
        ويُعلَّق عليهما بنصٍّ خاصٍّ لا بنبرة الهبوط العاديّة.

   ──────────────────────────────────────────────────────────────────────
   التشغيل:
     BURN_PULSE.init({ rootId:'burn-pulse-root', week: 3 })
     BURN_PULSE.renderLine('burn-line-root')     ← عرض الخطّ وحده
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  function CFG()   { return global.BURN_CONFIG; }
  function ITEMS() { return global.BURN_ITEMS; }
  function S()     { return global.BURN_STRINGS; }
  function ENG()   { return global.BURN_ENGINE; }
  function STORE() { return global.BURN_STORE; }
  function R()     { return global.BURN_RENDER; }

  var state = {
    rootId: 'burn-pulse-root',
    week: null,
    isFull: false,
    user: null,
    doc: null,
    values: {},
    note: '',
    busy: false,
    phase: 'boot'
  };

  function root(){ return document.getElementById(state.rootId); }
  function paint(html){ var e = root(); if(e){ e.innerHTML = html; try{ e.scrollIntoView({block:'nearest'}); }catch(x){} } }

  /* ═══════════════════════════════════════════════════════════════════
     ١ — تحديد نوع النبضة ونافذتها
     ═══════════════════════════════════════════════════════════════════ */

  function isFullWeek(week){
    var p = CFG().pulse;
    return (p.fullWeeks || []).indexOf(week) > -1;
  }

  function pulseItems(week){
    var full = isFullWeek(week);
    return ITEMS().L5.filter(function(it){ return full || it.inShort === true; })
                     .sort(function(a,b){ return (a.order||0)-(b.order||0); });
  }

  /* آخر أسبوعٍ مسجَّل + الأسبوع المقترح */
  function suggestWeek(doc){
    var pulses = (doc && doc.weeklyPulses) || [];
    var done = pulses.filter(function(p){ return p.status === 'completed'; })
                     .map(function(p){ return p.week; });
    if(!done.length) return 0;
    var max = Math.max.apply(null, done);
    return Math.min(max + 1, CFG().pulse.totalWeeks);
  }

  function pulseOfWeek(doc, week){
    var pulses = (doc && doc.weeklyPulses) || [];
    for(var i=0;i<pulses.length;i++){ if(pulses[i].week === week) return pulses[i]; }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ — العرض
     ═══════════════════════════════════════════════════════════════════ */

  function renderForm(){
    state.phase = 'form';
    var items = pulseItems(state.week);
    var missing = items.filter(function(it){
      return state.values[it.id] === undefined || state.values[it.id] === null;
    }).length;

    paint(R().pulseScreen({
      week: state.week,
      isFull: state.isFull,
      items: items,
      values: state.values,
      showOpenQuestion: true,
      nextDisabled: (missing > 0)
    }));

    /* استعادة نصّ الملاحظة إن كان مكتوبًا */
    var input = root().querySelector('[data-bn-pulse-note]');
    if(input && state.note) input.value = state.note;
  }

  function renderDone(comment, lineHtml){
    state.phase = 'done';
    paint(R().pulseDone(comment, lineHtml));
  }

  function renderClosed(){
    state.phase = 'closed';
    var p = S().pulse;
    paint(R().card(
      '<h2 class="bn-title">' + R().esc(p.closedTitle) + '</h2>' +
      '<p class="bn-p">' + R().esc(p.closedBody) + '</p>'
    ));
  }

  function renderAlready(entry){
    state.phase = 'done';
    var lineHtml = R().wellbeingLine(state.doc.weeklyPulses || []);
    var comment = commentFor(state.week, entry.computed);
    renderDone(comment, lineHtml);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ — التعليق على حركة الخطّ

     ★ يُختار عبر BURN_STRINGS.lineComment، ولا يُكتب هنا حرفٌ عربيّ.
     ═══════════════════════════════════════════════════════════════════ */
  function commentFor(week, computed){
    var s = S(), cfg = CFG();
    var pulses = (state.doc && state.doc.weeklyPulses) || [];

    /* أوّل نقطة */
    var prior = pulses.filter(function(p){
      return p.week < week && p.computed && p.status === 'completed';
    }).sort(function(a,b){ return b.week - a.week; });

    if(!prior.length){
      return s.lineComment(0, week, true, cfg.pulse.expectedDipWeeks,
                           cfg.thresholds.wellbeing.changeSignificant);
    }

    var prev = prior[0].computed;
    /* الفرق يُقاس على متوسّط المستويات الثلاثة */
    function avg(o){
      var v = ['vig','prs','ful'].map(function(k){ return o[k]; })
                                 .filter(function(x){ return typeof x === 'number'; });
      return v.length ? v.reduce(function(a,b){return a+b;},0)/v.length : null;
    }
    var a = avg(computed), b = avg(prev);
    var delta = (a !== null && b !== null) ? (a - b) : 0;

    return s.lineComment(delta, week, false, cfg.pulse.expectedDipWeeks,
                         cfg.thresholds.wellbeing.changeSignificant);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ — الحفظ
     ═══════════════════════════════════════════════════════════════════ */
  async function submit(){
    if(state.busy) return;
    var items = pulseItems(state.week);
    var missing = items.filter(function(it){
      return state.values[it.id] === undefined || state.values[it.id] === null;
    });
    if(missing.length) return;

    state.busy = true;

    try{
      var rawPulse = {};
      items.forEach(function(it){ rawPulse[it.id] = { v: state.values[it.id] }; });

      /* ★ المعايرة: درجة الستّة تُوصَل بدرجة التسعة على مسطرةٍ واحدة،
         بمعاملٍ فرديٍّ حُسب مرّةً في الأسبوع صفر. */
      var calibration = await STORE().getCalibration(state.user.id);
      var computed = ENG().computePulse(rawPulse, calibration, state.isFull);

      var noteInput = root().querySelector('[data-bn-pulse-note]');
      state.note = noteInput ? String(noteInput.value || '').trim() : '';
      if(state.note) rawPulse.__note = state.note;

      var res = await STORE().savePulse(
        state.user.id, state.week,
        state.isFull ? 'full' : 'short',
        rawPulse, computed
      );

      state.busy = false;
      if(!res.ok) return paint(R().error('save', null));

      state.doc = await STORE().load(state.user.id);
      var comment = commentFor(state.week, computed);
      var lineHtml = R().wellbeingLine(state.doc.weeklyPulses || []);
      renderDone(comment, lineHtml);

      try{ if(typeof global.onPulseSaved === 'function') global.onPulseSaved(state.week, computed); }catch(e){}

    }catch(e){
      console.error('[BURN_PULSE] submit error:', e);
      state.busy = false;
      paint(R().error('save', null));
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ — الأحداث
     ═══════════════════════════════════════════════════════════════════ */
  function bind(){
    var e = root();
    if(!e || e._bnPulseBound) return;
    e._bnPulseBound = true;

    e.addEventListener('click', function(ev){
      var lik = ev.target.closest('[data-bn-value]');
      if(lik){
        var id = lik.getAttribute('data-bn-item');
        var v = parseInt(lik.getAttribute('data-bn-value'), 10);
        state.values[id] = v;
        var input = e.querySelector('[data-bn-pulse-note]');
        if(input) state.note = String(input.value || '');
        renderForm();
        return;
      }
      var b = ev.target.closest('[data-bn-action]');
      if(!b) return;
      var act = b.getAttribute('data-bn-action');
      if(act === 'pulse-submit') submit();
      if(act === 'pulse-close'){
        state.phase = 'closed';
        if(typeof global.onPulseClosed === 'function'){ try{ global.onPulseClosed(); }catch(x){} }
        paint('');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ — الإقلاع
     ═══════════════════════════════════════════════════════════════════ */
  async function boot(){
    paint(R().loading());

    var user = STORE().requireAuth({ loginPath: '../../login.html' });
    if(!user) return;
    state.user = user;

    var doc = await STORE().load(user.id);
    if(!doc) return paint(R().error('load', null));
    state.doc = doc;

    /* النبضة لا تُفتَح قبل اكتمال المقياس — فالأسبوع صفر يقع داخله */
    if(!doc.progress || !doc.progress.completed){
      return paint(R().card(
        '<p class="bn-p bn-muted">النبضة تبدأ بعد أن تكتمل خريطتك.</p>'
      ));
    }

    if(state.week === null || state.week === undefined){
      state.week = suggestWeek(doc);
    }
    state.isFull = isFullWeek(state.week);

    /* مسجَّلةٌ من قبل؟ */
    var existing = pulseOfWeek(doc, state.week);
    if(existing && existing.status === 'completed'){
      return renderAlready(existing);
    }

    bind();
    renderForm();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ — عرض الخطّ وحده (بلا نموذج)
     ═══════════════════════════════════════════════════════════════════ */
  async function renderLine(containerId){
    var el = document.getElementById(containerId);
    if(!el) return;
    el.innerHTML = R().loading();
    var user = STORE().getCurrentUser();
    if(!user) { el.innerHTML = R().error('auth', null); return; }
    var doc = await STORE().load(user.id);
    var pulses = (doc && doc.weeklyPulses) || [];
    if(!pulses.filter(function(p){return p.computed;}).length){
      el.innerHTML = R().card('<p class="bn-p bn-muted">لا نقاطَ بعد.</p>');
      return;
    }
    el.innerHTML = R().card(R().wellbeingLine(pulses));
  }

  /* تسجيل أسبوعٍ فائت — يُستدعى من مهمّةٍ مجدولةٍ أو من لوحة المدرّب */
  async function markMissed(week){
    var user = STORE().getCurrentUser();
    if(!user) return false;
    return await STORE().markPulseMissed(user.id, week);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ — التهيئة
     ═══════════════════════════════════════════════════════════════════ */
  function init(options){
    options = options || {};
    state.rootId = options.rootId || 'burn-pulse-root';
    state.week = (typeof options.week === 'number') ? options.week : null;
    state.values = {};
    state.note = '';

    if(!root()){ console.error('[BURN_PULSE] حاوية #' + state.rootId + ' غير موجودة'); return; }

    var missing = [];
    ['BURN_CONFIG','BURN_ITEMS','BURN_STRINGS','BURN_ENGINE','BURN_STORE','BURN_RENDER']
      .forEach(function(n){ if(!global[n]) missing.push(n); });
    if(missing.length){
      root().innerHTML = '<pre dir="ltr">Missing: ' + missing.join(', ') + '</pre>';
      return;
    }

    boot();
  }

  global.BURN_PULSE = {
    init: init,
    renderLine: renderLine,
    markMissed: markMissed,
    isFullWeek: isFullWeek,
    suggestWeek: suggestWeek,
    _state: state
  };

  console.log('✅ BURN_PULSE جاهز');

})(window);
