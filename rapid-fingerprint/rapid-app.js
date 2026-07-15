/* ════════════════════════════════════════════════════════════════════════
   rapid-app.js — منطق وآلة حالة مقياس البصمة السريع
   ────────────────────────────────────────────────────────────────────────
   • كل حساب عبر RAPID_ENGINE، كل Firestore عبر RAPID_STORE حصرًا، كل
     عرض عبر RAPID_RENDER — هذا الملف غراءٌ وتدفّق فقط.
   • مصمّم كمودويل قابل للتضمين: يأخذ حاوية (افتراضيًّا #rapid-fp-root).
   • التدفّق التكيفي كلّه بيد المحرّك: التطبيق يسأل planNext(answers)
     بعد كل إجابة ويعرض البند التالي — فالبوابات والتأكيد وفضّ الاشتباك
     بدرجاته والمسارات والطيف بحسم التباسه تُساق كلّها من نقطة واحدة،
     و«لا نتيجة مفتوحة» مضمونة بضمانة المحرّك نفسها.
   • بند الانتباه المموّه يصل من planNext وسط بنود التأكيد ويُعرض
     بنفس شكلها تمامًا — التمويه شرطه ألّا يتميّز بصريًّا بشيء.
   • «السابق» متاح دائمًا: سجلُّ تراجعٍ ذرّي — كل إجابة تسجَّل مع دالّة
     محوها، والرجوع يمحو الأخيرة ويعيد سؤال المحرّك، فالتدفّق يعيد
     تكوين نفسه رياضيًّا من الإجابات المتبقية.
   • كتابة Firestore واحدة عند الاكتمال (وثيقة القسم ٧) ثم العبور
     إلى report.html.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function CFG()   { return window.RAPID_CONFIG; }
  function Q()     { return window.RAPID_QUESTIONS; }
  function ENG()   { return window.RAPID_ENGINE; }
  function STORE() { return window.RAPID_STORE; }
  function RND()   { return window.RAPID_RENDER; }

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function INTROS(){ var q = Q(); return (q && q.intros) ? q.intros : {}; }

  /* ── الحالة ── */
  var state = {
    rootId: 'rapid-fp-root',
    loginPath: '../login.html',
    reportPath: 'report.html',
    user: null,
    answers: null,
    undoStack: [],          // [{label, undo:fn}]
    introShown: {},         // phase → true (المقدّمة تُعرض مرّة)
    phaseDone: {},          // phase → عدد ما أُجيب فيها (للتقدّم)
    startedAt: null,
    itemsServed: 0,
    lastResults: null
  };

  function freshAnswers(){
    return {
      stageA: {}, stageB: {}, stageC: {},
      stageD: { duels: {}, roots: {}, recognition: {} },
      stageE: {}, stageERank: {}, stageF: {}
    };
  }

  /* ── DOM ── */
  function root(){ return document.getElementById(state.rootId); }
  function setHTML(html){
    var r = root(); if(!r) return;
    r.innerHTML = '<div class="rf-card">' + html + '</div>';
    try{ window.scrollTo(0,0); }catch(e){}
  }
  function errorCard(msg){ setHTML('<div class="rf-centered"><div class="rf-saving">' + esc(msg) + '</div></div>'); }

  /* ── الكاش (استئناف من نقطة التوقّف) ── */
  function cache(){
    try {
      STORE().cacheProgress({
        answers: state.answers,
        introShown: state.introShown,
        phaseDone: state.phaseDone,
        startedAt: state.startedAt,
        itemsServed: state.itemsServed
      });
    } catch(e) { /* الكاش تحسين لا شرط */ }
  }
  function restoreFrom(c){
    state.answers = c.answers || freshAnswers();
    if(!state.answers.stageD) state.answers.stageD = { duels:{}, roots:{}, recognition:{} };
    state.introShown = c.introShown || {};
    state.phaseDone = c.phaseDone || {};
    state.startedAt = c.startedAt || Date.now();
    state.itemsServed = c.itemsServed || 0;
    state.undoStack = [];   // التراجع لا يعبر الجلسات
  }

  /* ── التقدّم: نطاقات المراحل + الكسر داخل المرحلة ── */
  var PHASE_RANGE = {
    gateA:     [0, 16],  gateB: [16, 32],
    confirm:   [32, 44], dispute: [44, 54],
    paths:     [54, 70], pathsRank: [70, 72],
    spectrum:  [72, 99]
  };
  var PHASE_LABEL = {
    gateA: 'المحطّة الأولى', gateB: 'المحطّة الثانية',
    confirm: 'المحطّة الثالثة', dispute: 'محطّة الحسم',
    paths: 'المحطّة الرابعة', pathsRank: 'المحطّة الرابعة',
    spectrum: 'المحطّة الأخيرة'
  };
  function progressPct(phase, remaining){
    var range = PHASE_RANGE[phase] || [0, 100];
    var done = state.phaseDone[phase] || 0;
    var total = done + remaining;
    var frac = total > 0 ? (done / total) : 0;
    return Math.round(range[0] + frac * (range[1] - range[0]));
  }

  /* ── مقدّمة المرحلة (تُعرض مرّة عند أوّل بند) ── */
  var PHASE_INTRO_KEY = {
    gateA: 'stageA', gateB: 'stageB', confirm: 'stageC',
    dispute: 'stageD', paths: 'stageE', spectrum: 'stageF'
  };
  function phaseIntroHTML(phase){
    var key = PHASE_INTRO_KEY[phase];
    if(!key || state.introShown[key]) return '';
    var text = INTROS()[key];
    return text ? RND().introBlock(text) : '';
  }
  function markIntroShown(phase){
    var key = PHASE_INTRO_KEY[phase];
    if(key) state.introShown[key] = true;
  }

  /* ── تسجيل إجابة + أثر التراجع ── */
  function record(label, applyFn, undoFn){
    applyFn();
    state.undoStack.push({ label: label, undo: undoFn });
    state.itemsServed++;
    var p = state.currentPhase;
    if(p) state.phaseDone[p] = (state.phaseDone[p] || 0) + 1;
    cache();
  }
  function goBack(){
    var last = state.undoStack.pop();
    if(!last) return;
    try { last.undo(); } catch(e){}
    state.itemsServed = Math.max(0, state.itemsServed - 1);
    var p = state.currentPhase;
    if(p && state.phaseDone[p]) state.phaseDone[p]--;
    cache();
    step();
  }

  function navButtons(canBack){
    return '<div class="rf-nav">'
         + (canBack ? '<button class="rf-btn ghost" id="rfPrev">◄ السابق</button>' : '')
         + '<button class="rf-btn primary" id="rfNext" disabled>التالي ►</button>'
         + '</div>';
  }
  function bindBack(){
    var pb = document.getElementById('rfPrev');
    if(pb) pb.addEventListener('click', goBack);
  }

  /* ════════════════ عارضات البنود ════════════════ */

  /* ليكرت ثلاثي (gateA / gateB / paths) */
  function renderTrio(phase, item, remaining, stageKey){
    var R = RND();
    var saved = state.answers[stageKey][item.id] || {};
    var letters = ['أ','ب','ج'].filter(function(L){ return item.options[L]; });
    var optsHTML = letters.map(function(L){
      var o = item.options[L];
      return R.likertOption({ letter: L, text: o.text, hint: o.hint, saved: saved[L] });
    }).join('');

    setHTML(
      R.progressRow(PHASE_LABEL[phase], progressPct(phase, remaining))
      + phaseIntroHTML(phase)
      + '<div class="rf-question">' + esc(item.text) + '</div>'
      + R.questionHint(item.hint)
      + '<div class="rf-options">' + optsHTML + '</div>'
      + navButtons(state.undoStack.length > 0)
    );
    markIntroShown(phase);

    var picked = {}; letters.forEach(function(L){ if(typeof saved[L] === 'number') picked[L] = saved[L]; });
    function refresh(){
      var nb = document.getElementById('rfNext');
      if(nb) nb.disabled = !letters.every(function(L){ return typeof picked[L] === 'number'; });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.rf-likert'), function(btn){
      btn.addEventListener('click', function(){
        var L = btn.getAttribute('data-letter'), v = parseInt(btn.getAttribute('data-val'), 10);
        picked[L] = v;
        Array.prototype.forEach.call(document.querySelectorAll('.rf-likert[data-letter="' + L + '"]'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        refresh();
      });
    });
    refresh(); bindBack();
    var nb = document.getElementById('rfNext');
    if(nb) nb.addEventListener('click', function(){
      if(nb.disabled) return;
      var val = {}; letters.forEach(function(L){ val[L] = picked[L]; });
      record(item.id,
        function(){ state.answers[stageKey][item.id] = val; },
        function(){ delete state.answers[stageKey][item.id]; });
      step();
    });
  }

  /* عبارة مفردة (confirm + بند الانتباه + spectrum) */
  function renderStatement(phase, item, remaining, applyPair){
    var R = RND();
    setHTML(
      R.progressRow(PHASE_LABEL[phase], progressPct(phase, remaining))
      + phaseIntroHTML(phase)
      + R.likertStatement({ text: item.text, hint: item.hint, saved: applyPair.saved })
      + navButtons(state.undoStack.length > 0)
    );
    markIntroShown(phase);

    var picked = (typeof applyPair.saved === 'number') ? applyPair.saved : null;
    function refresh(){ var nb = document.getElementById('rfNext'); if(nb) nb.disabled = (picked === null); }
    Array.prototype.forEach.call(document.querySelectorAll('.rf-likert'), function(btn){
      btn.addEventListener('click', function(){
        picked = parseInt(btn.getAttribute('data-val'), 10);
        Array.prototype.forEach.call(document.querySelectorAll('.rf-likert'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        refresh();
      });
    });
    refresh(); bindBack();
    var nb = document.getElementById('rfNext');
    if(nb) nb.addEventListener('click', function(){
      if(nb.disabled) return;
      var v = picked;
      record(item.id,
        function(){ applyPair.apply(v); },
        function(){ applyPair.remove(); });
      step();
    });
  }

  /* اختيار ثنائي (مبارزات/جذور/تعرّف) */
  function renderBinary(phase, kind, item, remaining){
    var R = RND();
    var bucket = state.answers.stageD[kind === 'duels' ? 'duels' : kind === 'roots' ? 'roots' : 'recognition'];
    var isRec = (kind === 'recognition');
    var body;
    if(isRec){
      var voices = {
        'أ': ENG().voiceOf(item.options['أ'].type),
        'ب': ENG().voiceOf(item.options['ب'].type)
      };
      body = R.recognitionChoice(item, voices, bucket[item.id]);
    } else {
      body = R.binaryChoice(item, bucket[item.id]);
    }

    setHTML(
      R.progressRow(PHASE_LABEL.dispute, progressPct('dispute', remaining))
      + phaseIntroHTML('dispute')
      + body
      + navButtons(state.undoStack.length > 0)
    );
    markIntroShown('dispute');

    var picked = bucket[item.id] || null;
    function refresh(){
      var nb = document.getElementById('rfNext'); if(nb) nb.disabled = !picked;
      Array.prototype.forEach.call(document.querySelectorAll('.rf-choice'), function(c){
        c.classList.toggle('selected', c.getAttribute('data-letter') === picked);
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.rf-choice'), function(c){
      c.addEventListener('click', function(){ picked = c.getAttribute('data-letter'); refresh(); });
    });
    refresh(); bindBack();
    var nb = document.getElementById('rfNext');
    if(nb) nb.addEventListener('click', function(){
      if(nb.disabled) return;
      var v = picked;
      record(item.id,
        function(){ bucket[item.id] = v; },
        function(){ delete bucket[item.id]; });
      step();
    });
  }

  /* الترتيب الإجباري (pathsRank) */
  function renderRanking(item, remaining){
    var R = RND();
    var order = [];   // حروف بترتيب المسّ: [الأصعب، الأوسط، الأسهل]

    function draw(){
      setHTML(
        R.progressRow(PHASE_LABEL.pathsRank, progressPct('pathsRank', remaining))
        + R.rankingCard(item, order)
        + navButtons(state.undoStack.length > 0)
      );
      Array.prototype.forEach.call(document.querySelectorAll('.rf-rank-row'), function(row){
        row.addEventListener('click', function(){
          var L = row.getAttribute('data-letter');
          if(order.indexOf(L) === -1 && order.length < 3){ order.push(L); draw(); }
        });
      });
      var rr = document.getElementById('rfRankReset');
      if(rr) rr.addEventListener('click', function(){ order = []; draw(); });
      bindBack();
      var nb = document.getElementById('rfNext');
      if(nb){
        nb.disabled = (order.length !== 3);
        nb.addEventListener('click', function(){
          if(nb.disabled) return;
          var val = order.slice();
          record(item.id,
            function(){ state.answers.stageERank[item.id] = val; },
            function(){ delete state.answers.stageERank[item.id]; });
          step();
        });
      }
    }
    draw();
  }

  /* ════════════════ محرّك التدفّق: خطوة ════════════════ */
  function step(){
    var plan;
    try { plan = ENG().planNext(state.answers); }
    catch(e){ console.error('[RAPID_APP] planNext:', e); errorCard('حدث خللٌ غير متوقّع — أعد تحميل الصفحة، وإجاباتك محفوظة.'); return; }

    state.currentPhase = plan.phase === 'pathsRank' ? 'pathsRank' : plan.phase;

    if(plan.phase === 'done'){ finish(); return; }

    var item = plan.items[0];
    var remaining = plan.items.length;

    if(plan.phase === 'gateA'){ renderTrio('gateA', item, remaining, 'stageA'); return; }
    if(plan.phase === 'gateB'){ renderTrio('gateB', item, remaining, 'stageB'); return; }
    if(plan.phase === 'paths'){ renderTrio('paths', item, remaining, 'stageE'); return; }

    if(plan.phase === 'confirm'){
      if(item.attention){
        renderStatement('confirm', item, remaining, {
          saved: state.answers.attention,
          apply: function(v){ state.answers.attention = v; },
          remove: function(){ delete state.answers.attention; }
        });
      } else {
        renderStatement('confirm', item, remaining, {
          saved: state.answers.stageC[item.id],
          apply: function(v){ state.answers.stageC[item.id] = v; },
          remove: function(){ delete state.answers.stageC[item.id]; }
        });
      }
      return;
    }

    if(plan.phase === 'dispute'){ renderBinary('dispute', plan.kind, item, remaining); return; }
    if(plan.phase === 'pathsRank'){ renderRanking(item, remaining); return; }

    if(plan.phase === 'spectrum'){
      renderStatement('spectrum', item, remaining, {
        saved: state.answers.stageF[item.id],
        apply: function(v){ state.answers.stageF[item.id] = v; },
        remove: function(){ delete state.answers.stageF[item.id]; }
      });
      return;
    }

    errorCard('مرحلة غير معروفة: ' + esc(plan.phase));
  }

  /* ════════════════ الاكتمال: حساب + حفظ واحد + عبور ════════════════ */
  function finish(){
    var R = RND();
    setHTML(R.savingScreen());

    var output;
    try { output = ENG().buildResults(state.answers); }
    catch(e){ console.error('[RAPID_APP] buildResults:', e); errorCard('تعذّر إتمام الحساب — أعد تحميل الصفحة، إجاباتك محفوظة.'); return; }
    state.lastResults = output;

    var durationSec = state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : null;

    STORE().saveResult(state.user.id, {
      answers: state.answers,
      results: output.results,
      trace: output.trace,
      itemsServed: state.itemsServed,
      durationSec: durationSec
    }).then(function(ok){
      if(ok){
        setHTML(R.completionScreen());
        var b = document.getElementById('rfToReport');
        if(b) b.addEventListener('click', function(){ window.location.href = state.reportPath; });
      } else {
        showSaveError();
      }
    }).catch(showSaveError);
  }
  function showSaveError(){
    var R = RND();
    setHTML(R.saveErrorScreen());
    var b = document.getElementById('rfRetrySave');
    if(b) b.addEventListener('click', finish);
  }

  /* ════════════════ الافتتاح والإقلاع ════════════════ */
  function renderWelcome(){
    var R = RND();
    setHTML(R.welcomeScreen({
      title: 'جلسة واحدة صادقة — وتخرج ببصمتك.',
      intro: 'مواقف قصيرة من حياتك اليوميّة، تُجيب عنها كما عشتها فعلًا في الفترة الأخيرة — لا كما تحبّ أن تكون. وفي الختام تقريرٌ يجمع لك الصورة.',
      startLabel: 'ابدأ'
    }));
    var b = document.getElementById('rfStart');
    if(b) b.addEventListener('click', function(){
      state.startedAt = state.startedAt || Date.now();
      cache(); step();
    });
  }

  function init(opts){
    opts = opts || {};
    if(opts.rootId) state.rootId = opts.rootId;
    if(opts.loginPath) state.loginPath = opts.loginPath;
    if(opts.reportPath) state.reportPath = opts.reportPath;

    if(!Q() || !CFG() || !ENG() || !STORE() || !RND()){
      errorCard('ملفّات المقياس لم تكتمل — راجع ترتيب التحميل.');
      return;
    }

    state.user = STORE().requireAuth({ loginPath: state.loginPath });
    if(!state.user) return;

    state.answers = freshAnswers();

    STORE().loadAssessment(state.user.id).then(function(doc){
      if(doc && doc.meta && doc.meta.completed && doc.results){
        var R = RND();
        setHTML(R.completedBeforeScreen());
        var tr = document.getElementById('rfToReport');
        var rd = document.getElementById('rfRedo');
        if(tr) tr.addEventListener('click', function(){ window.location.href = state.reportPath; });
        if(rd) rd.addEventListener('click', function(){
          STORE().clearCache(state.user.id);
          state.answers = freshAnswers(); state.introShown = {}; state.phaseDone = {};
          state.undoStack = []; state.itemsServed = 0; state.startedAt = Date.now();
          renderWelcome();
        });
        return;
      }
      var cached = STORE().readCache();
      if(cached && cached.answers){
        var R2 = RND();
        setHTML(R2.resumeScreen());
        var rs = document.getElementById('rfResume');
        var rt = document.getElementById('rfRestart');
        if(rs) rs.addEventListener('click', function(){ restoreFrom(cached); step(); });
        if(rt) rt.addEventListener('click', function(){
          STORE().clearCache(state.user.id);
          state.answers = freshAnswers(); renderWelcome();
        });
        return;
      }
      renderWelcome();
    });
  }

  window.RAPID_APP = { init: init };
})();
