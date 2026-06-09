/* ════════════════════════════════════════════════════════════════════════
   axes-app.js — منطق وآلة حالة مقياس المحاور (Reignite)
   ────────────────────────────────────────────────────────────────────────
   • كل حساب عبر AXES_ENGINE، كل ترجمة عبر AXES_BRIDGE، كل Firestore عبر
     AXES_STORE حصرًا. كل عرض عبر AXES_RENDER.
   • مصمّم كمودويل قابل للتضمين: يأخذ حاوية (افتراضيًّا #reignite-axes-root)
     لا الصفحة كلها، كي تضمّه صفحة reignite ويتحكّم به الأدمن.
   • التدفّق (الكشف قبل التسمية محفوظ):
       تمهيد → ط١ تحديد المحور → كشف المحور الرئيسيّ → ط٢ احتراق أبعاده →
       ط٣ نبضة الإحساس → شاشة النتيجة (كتابة Firestore واحدة).
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function CFG()   { return (typeof AXES_CONFIG    !== 'undefined') ? AXES_CONFIG    : window.AXES_CONFIG; }
  function Q()     { return (typeof AXES_QUESTIONS !== 'undefined') ? AXES_QUESTIONS : window.AXES_QUESTIONS; }
  function ENG()   { return (typeof AXES_ENGINE    !== 'undefined') ? AXES_ENGINE    : window.AXES_ENGINE; }
  function BR()    { return (typeof AXES_BRIDGE    !== 'undefined') ? AXES_BRIDGE    : window.AXES_BRIDGE; }
  function STORE() { return window.AXES_STORE; }
  function RND()   { return (typeof AXES_RENDER    !== 'undefined') ? AXES_RENDER    : window.AXES_RENDER; }

  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // مجموعة بنود الطبقة الأولى مسطّحة (action ثمّ longing ثمّ critique)
  function flattenL1(){
    var q = Q().L1, out = [];
    ['action','longing','critique'].forEach(function(block){
      (q[block]||[]).forEach(function(item){ out.push({ block: block, item: item }); });
    });
    return out;
  }

  // ── الحالة ──
  var state = {
    rootId: 'reignite-axes-root',
    user: null,
    stage: 'intro',
    l1: [],            // البنود المسطّحة
    l1Index: 0,
    l1Answers: { action:{}, longing:{}, critique:{} },
    ranking: null,
    primaryAxis: null,
    l2Dims: [],        // أبعاد المحور الرئيسيّ (مسطّحة بعباراتها)
    l2Index: 0,
    l2Ratings: {},     // { dimId: [r,r,r] }
    l3: [],            // عبارات الإحساس المسطّحة
    l3Index: 0,
    l3Answers: { tawaqud:[], hudur:[], imtila:[] },
    burnout: null,
    wellness: null,
    lean: null
  };

  function root(){ return document.getElementById(state.rootId); }
  function setHTML(html){ var r = root(); if(!r) return; r.innerHTML = '<div class="ax-card">' + html + '</div>'; try{ window.scrollTo(0,0); }catch(e){} }
  function errorCard(msg){ setHTML('<div class="ax-centered"><div class="ax-saving">' + esc(msg) + '</div></div>'); }

  function cache(){
    try{ STORE().cacheProgress({
      stage: state.stage, l1Answers: state.l1Answers,
      l2Ratings: state.l2Ratings, l3Answers: state.l3Answers,
      primaryAxis: state.primaryAxis
    }); }catch(e){}
  }

  /* ════════════════════ التمهيد ════════════════════ */
  function renderIntro(){
    state.stage = 'intro'; cache();
    setHTML(
        '<div class="ax-tag">مقياس المحاور — اتجاه طاقتك</div>'
      + '<div class="ax-core">قبل أن نعرف أين تحترق، نعرف أين تتّجه طاقتك. أجب من تجربتك الحقيقيّة، لا ممّا تتمنّاه — أصدق إجاباتك أنفعها لك.</div>'
      + '<div class="ax-reminder">لا توجد إجابة صحيحة. قيّم كلّ وصفٍ بمقدار ما يشبهك فعلًا.</div>'
      + '<button class="ax-btn primary" id="axStart">ابدأ</button>'
    );
    document.getElementById('axStart').addEventListener('click', function(){
      state.stage = 'l1'; state.l1Index = 0; renderL1();
    });
  }

  /* ════════════════════ الطبقة الأولى — تحديد المحور ════════════════════ */
  function renderL1(){
    state.stage = 'l1';
    var N = state.l1.length;
    if(state.l1Index >= N){ computeRanking(); return; }

    var entry = state.l1[state.l1Index];
    var block = entry.block, q = entry.item;
    var pos = state.l1Index + 1;
    var pct = Math.round((state.l1Index / N) * 100);
    var saved = state.l1Answers[block][q.id] || {};

    var blockHint = (block === 'critique')
      ? 'قيّم بمقدار ما يستفزّك فعلًا.'
      : 'قيّم كلّ وصفٍ بمقدار ما يشبهك — لا تختر واحدًا، فقد تشبهك أكثر من زاوية.';

    var opts = ['أ','ب','ج'].map(function(L){
      var o = q.options[L]; if(!o) return '';
      return RND().likertOption({ letter: L, text: o.text, saved: (typeof saved[L]==='number' ? saved[L] : null) });
    }).join('');

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(N) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + '<div class="ax-question">' + esc(q.text) + '</div>'
      + '<div class="ax-reminder">' + blockHint + '</div>'
      + '<div class="ax-options">' + opts + '</div>'
      + '<div class="ax-nav">'
      +   (state.l1Index>0 ? '<button class="ax-btn ghost" id="axPrev">السابق</button>' : '')
      +   '<button class="ax-btn primary" id="axNext" ' + (l1Complete(block,q)?'':'disabled') + '>تابِع</button>'
      + '</div>'
    );

    Array.prototype.forEach.call(document.querySelectorAll('.ax-likert'), function(btn){
      btn.addEventListener('click', function(){
        var L = btn.getAttribute('data-letter');
        var v = parseInt(btn.getAttribute('data-val'),10);
        if(!state.l1Answers[block][q.id]) state.l1Answers[block][q.id] = {};
        state.l1Answers[block][q.id][L] = v;
        cache();
        var group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.ax-likert'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        var nb = document.getElementById('axNext');
        if(nb && l1Complete(block,q)) nb.removeAttribute('disabled');
      });
    });

    var pb = document.getElementById('axPrev');
    if(pb) pb.addEventListener('click', function(){ if(state.l1Index>0){ state.l1Index--; cache(); renderL1(); } });
    var nb = document.getElementById('axNext');
    if(nb) nb.addEventListener('click', function(){ if(!l1Complete(block,q)) return; state.l1Index++; cache(); renderL1(); });
  }

  function l1Complete(block, q){
    var a = state.l1Answers[block][q.id];
    if(!a || typeof a !== 'object') return false;
    return ['أ','ب','ج'].every(function(L){ return !q.options[L] || typeof a[L] === 'number'; });
  }

  function computeRanking(){
    try{ state.ranking = ENG().computeAxisRanking(state.l1Answers); }
    catch(e){ errorCard('تعذّر حساب الترتيب: ' + e.message); return; }
    state.primaryAxis = state.ranking.primaryAxis;
    renderAxisReveal();
  }

  /* ════════════════════ كشف المحور الرئيسيّ (بين ط١ وط٢) ════════════════════
     زيّ المرايا: «عرفت المحور، نتعمّق فيه» — الكشف قبل التسمية محفوظ لأن عبارات
     ط٢ عن حالاتٍ معيشة لا عن «هل أنت تماسك». */
  function renderAxisReveal(){
    state.stage = 'axisReveal'; cache();
    var name = BR().axisName(state.primaryAxis);
    setHTML(
        '<div class="ax-section-title">اتجاه طاقتك</div>'
      + '<p class="ax-lead">من إجاباتك، طاقتك تتّجه قبل أن تفكّر نحو محورٍ أظهر من غيره:</p>'
      + '<div class="ax-reveal">' + esc(name) + '</div>'
      + '<p class="ax-p">الآن نتعمّق في هذا المحور قليلًا. ستقرأ عباراتٍ عن حالاتٍ قد تعيشها، وتقيّم كلّ واحدةٍ بمقدار ما تشبه حالك هذه الفترة — لا ما تتمنّاه.</p>'
      + '<button class="ax-btn primary" id="axToL2">تابِع</button>'
    );
    document.getElementById('axToL2').addEventListener('click', function(){ prepareL2(); });
  }

  /* ════════════════════ الطبقة الثانية — احتراق أبعاد المحور الرئيسيّ ════════════════════ */
  function prepareL2(){
    var axisL2 = Q().L2[state.primaryAxis] || {};
    var cfgAxis = (CFG().axes || []).find(function(a){ return a.id === state.primaryAxis; });
    var dimOrder = cfgAxis ? cfgAxis.dimensions.map(function(d){ return d.id; }) : Object.keys(axisL2);

    state.l2Dims = [];
    dimOrder.forEach(function(dimId){
      var sts = axisL2[dimId] || [];
      if(!Array.isArray(state.l2Ratings[dimId])) state.l2Ratings[dimId] = [];
      sts.forEach(function(st, idx){ state.l2Dims.push({ dimId: dimId, idx: idx, text: st.text }); });
    });
    state.l2Index = firstUnrated(state.l2Dims, function(s){ return state.l2Ratings[s.dimId]; });
    state.stage = 'l2'; cache(); renderL2();
  }

  function renderL2(){
    var total = state.l2Dims.length;
    if(total === 0 || state.l2Index >= total){ computeBurnout(); return; }
    var s = state.l2Dims[state.l2Index];
    var pos = state.l2Index + 1, pct = Math.round((state.l2Index/total)*100);
    var saved = (state.l2Ratings[s.dimId] && typeof state.l2Ratings[s.dimId][s.idx]==='number') ? state.l2Ratings[s.dimId][s.idx] : null;

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(total) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + RND().likertStatement({ text: s.text, saved: saved })
    );
    Array.prototype.forEach.call(document.querySelectorAll('.ax-likert'), function(btn){
      btn.addEventListener('click', function(){
        var v = parseInt(btn.getAttribute('data-val'),10);
        if(!Array.isArray(state.l2Ratings[s.dimId])) state.l2Ratings[s.dimId] = [];
        state.l2Ratings[s.dimId][s.idx] = v;
        state.l2Index++; cache(); renderL2();
      });
    });
  }

  function computeBurnout(){
    try{ state.burnout = ENG().computeDimensionBurnout(state.primaryAxis, state.l2Ratings); }
    catch(e){ errorCard('تعذّر حساب الاحتراق: ' + e.message); return; }
    prepareL3();
  }

  /* ════════════════════ الطبقة الثالثة — نبضة الإحساس ════════════════════ */
  function prepareL3(){
    var l3 = Q().L3;
    state.l3 = [];
    ['tawaqud','hudur','imtila'].forEach(function(lvl){
      if(!Array.isArray(state.l3Answers[lvl])) state.l3Answers[lvl] = [];
      (l3[lvl]||[]).forEach(function(text, idx){ state.l3.push({ level: lvl, idx: idx, text: text }); });
    });
    state.l3Index = firstUnrated(state.l3, function(s){ return state.l3Answers[s.level]; });
    state.stage = 'l3'; cache(); renderL3();
  }

  function renderL3(){
    var total = state.l3.length;
    if(total === 0 || state.l3Index >= total){ computeWellness(); return; }
    if(state.l3Index === 0){
      // تمهيد خفيف لمرّة واحدة
    }
    var s = state.l3[state.l3Index];
    var pos = state.l3Index + 1, pct = Math.round((state.l3Index/total)*100);
    var saved = (state.l3Answers[s.level] && typeof state.l3Answers[s.level][s.idx]==='number') ? state.l3Answers[s.level][s.idx] : null;

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(total) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + '<div class="ax-reminder">قيّم كم تعيش هذا في هذه الفترة.</div>'
      + RND().likertStatement({ text: s.text, saved: saved })
    );
    Array.prototype.forEach.call(document.querySelectorAll('.ax-likert'), function(btn){
      btn.addEventListener('click', function(){
        var v = parseInt(btn.getAttribute('data-val'),10);
        if(!Array.isArray(state.l3Answers[s.level])) state.l3Answers[s.level] = [];
        state.l3Answers[s.level][s.idx] = v;
        state.l3Index++; cache(); renderL3();
      });
    });
  }

  function computeWellness(){
    try{ state.wellness = ENG().computeWellnessLine(state.l3Answers); }
    catch(e){ errorCard('تعذّر حساب خطّ العافية: ' + e.message); return; }
    finalize();
  }

  /* ════════════════════ التركيب والحفظ والنتيجة ════════════════════ */
  function finalize(){
    // الميل النوعيّ (للقاع، لا يُعلَن)
    try{ state.lean = ENG().computeBurnoutLean(state.ranking, state.burnout, state.wellness); }
    catch(e){ state.lean = null; }

    state.stage = 'saving';
    setHTML('<div class="ax-centered"><div class="ax-spinner"></div><div class="ax-saving">نحفظ نتيجتك…</div></div>');

    var payload = {
      answers: { L1: state.l1Answers, L2: state.l2Ratings, L3: state.l3Answers },
      results: {
        ranking: state.ranking,
        burnout: state.burnout,
        wellness: state.wellness,
        primaryAxis: state.primaryAxis
      },
      lean: state.lean
    };

    var uid = state.user && state.user.id;
    STORE().saveResult(uid, payload).then(function(){ renderResult(); })
      .catch(function(){ renderResult(); });
  }

  function renderResult(){
    state.stage = 'result';
    var br = BR(), rnd = RND(), cfg = CFG();

    var primaryAxis   = state.primaryAxis;
    var secondaryAxis = state.ranking.secondaryAxis;
    var repressedAxis = state.ranking.repressedAxis;

    // البُعد المحترق وشكله
    var burnedDim   = state.burnout ? state.burnout.burnedDim : null;
    var burnedShape = state.burnout ? state.burnout.burnedShape : null;

    // شريط الطيف لأبرز بُعد (المحترق، أو أوّل بُعد لو كله متّزن)
    var spDim = burnedDim || (state.burnout && Object.keys(state.burnout.dimensions)[0]);
    var spObj = (state.burnout && spDim) ? state.burnout.dimensions[spDim] : null;
    var spectrumBarHTML = spObj ? rnd.spectrumBar({ position: spObj.position, positionLabel: spObj.positionLabel }) : '';

    // تطابق المستوى الأشدّ نزيفًا مع مستوى المحور الرئيسيّ؟
    var matched = state.lean ? state.lean.matched : null;
    var worstLevel = state.wellness ? state.wellness.worstLevel : null;

    // خطّ العافية: ثلاث نقاط
    var levelMap = { tawaqud:'التوقّد', hudur:'الحضور', imtila:'الامتلاء' };
    var wl = state.wellness ? state.wellness.wellnessPoint : {};
    var points = ['tawaqud','hudur','imtila'].map(function(lvl){
      return { name: levelMap[lvl], wellness: wl[lvl], isWorst: (lvl === worstLevel) };
    });

    var model = {
      openingTitle: br.opening().title,
      openingBody:  br.opening().body,
      primaryPara:  br.primaryParagraph(primaryAxis),
      secondaryPara:br.secondaryParagraph(secondaryAxis),
      repressedSeed:br.repressedSeed(repressedAxis),
      burnedDimName: burnedDim ? br.dimName(primaryAxis, burnedDim) : '',
      burnedShapeLabel: burnedDim ? br.shapeLabel(primaryAxis, burnedDim, burnedShape) : '',
      burnedPara:   br.burnedDimensionParagraph(primaryAxis, burnedDim, burnedShape),
      spectrumBarHTML: spectrumBarHTML,
      bridge:       br.buildBridge(primaryAxis, burnedDim, burnedShape, matched),
      burnoutNarrative: br.burnoutNarrative(worstLevel),
      wellnessHTML: rnd.wellnessLine(points),
      closingBody:  br.closing().body
    };

    var r = root();
    if(r) r.innerHTML = '<div class="ax-card ax-result">' + rnd.resultScreen(model) + '</div>';
    try{ window.scrollTo(0,0); }catch(e){}

    var pb = document.getElementById('axPrint');
    if(pb) pb.addEventListener('click', function(){ window.print(); });
    var db = document.getElementById('axDone');
    if(db) db.addEventListener('click', function(){
      // نقطة وصلٍ مع حاوية reignite (الأدمن يقرّر ما بعدها)
      if(typeof window.onAxesComplete === 'function') window.onAxesComplete(state.lean);
      renderDone();
    });
  }

  function renderDone(){
    setHTML(
        '<div class="ax-centered">'
      +   '<div class="ax-check">✓</div>'
      +   '<div class="ax-done-line">أتممتَ المقياس. خريطتك محفوظة.</div>'
      +   '<div class="ax-done-note">سنبني على هذا فيما هو قادم من الرحلة.</div>'
      + '</div>'
    );
  }

  /* ════════════════════ أدوات ════════════════════ */
  function firstUnrated(list, arrGetter){
    for(var i=0;i<list.length;i++){
      var s = list[i], arr = arrGetter(s);
      if(!arr || typeof arr[s.idx] !== 'number') return i;
    }
    return list.length;
  }

  function resumeFromCache(c){
    if(c.l1Answers) state.l1Answers = c.l1Answers;
    if(c.l2Ratings) state.l2Ratings = c.l2Ratings;
    if(c.l3Answers) state.l3Answers = c.l3Answers;
    if(c.primaryAxis) state.primaryAxis = c.primaryAxis;

    // أين توقّف؟ أوّل بند ط١ غير مكتمل
    var firstUn = -1;
    for(var i=0;i<state.l1.length;i++){
      var e = state.l1[i];
      if(!l1Complete(e.block, e.item)){ firstUn = i; break; }
    }
    if(firstUn !== -1){ state.stage='l1'; state.l1Index = firstUn; renderL1(); return; }

    // ط١ مكتملة — احسب الترتيب ثمّ تابع من حيث وصل
    try{ state.ranking = ENG().computeAxisRanking(state.l1Answers); state.primaryAxis = state.ranking.primaryAxis; }
    catch(e){ renderIntro(); return; }

    // هل بدأ ط٢؟
    var axisL2 = Q().L2[state.primaryAxis] || {};
    var anyL2 = Object.keys(state.l2Ratings).some(function(d){ return (state.l2Ratings[d]||[]).some(function(v){ return typeof v==='number'; }); });
    if(!anyL2){ renderAxisReveal(); return; }

    prepareL2(); // prepareL2 يحسب أوّل غير مقيّم تلقائيًّا
  }

  /* ════════════════════ الإقلاع ════════════════════ */
  function init(options){
    options = options || {};
    if(options.rootId) state.rootId = options.rootId;
    if(!root()){ console.error('[AXES_APP] حاوية #' + state.rootId + ' غير موجودة'); return; }

    var missing = [];
    if(!CFG())   missing.push('AXES_CONFIG');
    if(!Q())     missing.push('AXES_QUESTIONS');
    if(!ENG())   missing.push('AXES_ENGINE');
    if(!BR())    missing.push('AXES_BRIDGE');
    if(!STORE()) missing.push('AXES_STORE');
    if(!RND())   missing.push('AXES_RENDER');
    if(missing.length){ errorCard('تعذّر تحميل ملفّات المقياس — الغائب: ' + missing.join('، ')); return; }

    // المصادقة (نفس أكونت العميل الموجود)
    var user = STORE().requireAuth({ loginPath: options.loginPath || '../login.html' });
    if(!user) return;
    state.user = user;
    state.l1 = flattenL1();

    setHTML('<div class="ax-centered"><div class="ax-spinner"></div><div class="ax-saving">نحمّل…</div></div>');

    // هل أتمّ المقياس سابقًا؟ (عرض النتيجة) — أو استئناف من cache — أو بداية
    STORE().loadAssessment(user.id).then(function(data){
      if(data && data.results && data.results.ranking){
        // أعِد بناء الحالة من المحفوظ واعرض النتيجة
        state.ranking      = data.results.ranking;
        state.primaryAxis  = data.results.primaryAxis || data.results.ranking.primaryAxis;
        state.burnout      = data.results.burnout;
        state.wellness     = data.results.wellness;
        state.lean         = data.lean || null;
        renderResult();
        return;
      }
      var c = null; try{ c = STORE().readCache(); }catch(e){ c=null; }
      var hasCache = c && (c.l1Answers && Object.keys(c.l1Answers.action||{}).length);
      if(hasCache) resumeFromCache(c); else renderIntro();
    }).catch(function(){ renderIntro(); });
  }

  window.AXES_APP = { init: init };
})();
