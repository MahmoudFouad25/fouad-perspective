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
   • تحديث: زرّ «السابق» متاحٌ في كل مراحل المقياس (ط١/ط٢/ط٣) — العميل
     يقدر يرجع لو غلط أو جاوب بسرعة. وإعادة التمرين تُحترَم من الـ roster.

   ☆ جديد: توصيل الشرح العاميّ (يشرح المقياس نفسه بنفسه دون مرافقة المدرّب):
     • مقدّمة الافتتاح (intros.opening) في شاشة التمهيد.
     • شرح كل سؤال (q.hint) تحت نصّه، وشرح كل خيار (o.hint) تحت الخيار.
     • مقدّمة كل كتلة (intros.longing / intros.critique / intros.action)
       تظهر مرّةً عند أوّل بندٍ من الكتلة.
     • مقدّمة الطبقة الثانية (intros.L2) والثالثة (intros.L3) تظهر مرّةً
       عند أوّل عبارةٍ فيهما.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function CFG()   { return (typeof AXES_CONFIG    !== 'undefined') ? AXES_CONFIG    : window.AXES_CONFIG; }
  function Q()     { return (typeof AXES_QUESTIONS !== 'undefined') ? AXES_QUESTIONS : window.AXES_QUESTIONS; }
  function ENG()   { return (typeof AXES_ENGINE    !== 'undefined') ? AXES_ENGINE    : window.AXES_ENGINE; }
  function BR()    { return (typeof AXES_BRIDGE    !== 'undefined') ? AXES_BRIDGE    : window.AXES_BRIDGE; }
  function STORE() { return window.AXES_STORE; }
  function RND()   { return (typeof AXES_RENDER    !== 'undefined') ? AXES_RENDER    : window.AXES_RENDER; }
  function ROSTER(){ return window.REIGNITE_ROSTER; }

  function arabicNum(n){ var m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,function(d){return m[+d];}); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // وصول آمن للمقدّمات (intros) من ملفّ الأسئلة
  function INTROS(){ var q = Q(); return (q && q.intros) ? q.intros : {}; }

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
    l2Dims: [],        // أبعاد المحور الجاري قياسه (مسطّحة بعباراتها)
    l2Index: 0,
    l2Ratings: {},     // { dimId: [r,r,r] } — تقييمات المحور الجاري (alias حيّ للمحور الجاري)
    // ── قياس طيف محورين: الرئيسيّ + المكبوت (الوسط الذكيّ) ──
    //   l2RatingsByAxis: تقييمات كل محور محفوظة منفصلةً بمعرّفه كي لا تتصادم.
    //   l2Phase: أيّ محورٍ نقيس طيفه الآن — 'primary' ثمّ 'repressed'.
    l2RatingsByAxis: {},   // { axisId: { dimId:[r,r,r] } }
    l2Phase: 'primary',    // 'primary' | 'repressed'
    l2Axis: null,          // المحور الجاري قياس طيفه (يُضبط في prepareL2)
    l3: [],            // عبارات الإحساس المسطّحة
    l3Index: 0,
    l3Answers: { tawaqud:[], hudur:[], imtila:[] },
    burnout: null,         // احتراق أبعاد المحور الرئيسيّ (كما كان — توافُق خلفيّ)
    burnoutRepressed: null,// احتراق أبعاد المحور المكبوت (جديد — للتقاطع والقراءة)
    wellness: null,
    lean: null,
    forceRetake: false  // أمر إعادة التمرين من الأدمن
  };

  /* المحور المكبوت كما رتّبه المحرّك (نقيس طيفه بعد الرئيسيّ). */
  function repressedAxisId(){ return state.ranking ? state.ranking.repressedAxis : null; }

  /* ربط alias الحيّ: state.l2Ratings يشير دائمًا لبكت المحور الجاري في l2RatingsByAxis،
     فيظلّ كلّ كود العرض/الكاش/الاستئناف يعمل بلا تغيير على «المحور الجاري». */
  function bindL2Axis(axisId){
    state.l2Axis = axisId;
    if(!state.l2RatingsByAxis[axisId]) state.l2RatingsByAxis[axisId] = {};
    state.l2Ratings = state.l2RatingsByAxis[axisId];
  }

  function root(){ return document.getElementById(state.rootId); }
  function setHTML(html){ var r = root(); if(!r) return; r.innerHTML = '<div class="ax-card">' + html + '</div>'; try{ window.scrollTo(0,0); }catch(e){} }
  function errorCard(msg){ setHTML('<div class="ax-centered"><div class="ax-saving">' + esc(msg) + '</div></div>'); }

  function cache(){
    try{ STORE().cacheProgress({
      stage: state.stage, l1Answers: state.l1Answers,
      l2RatingsByAxis: state.l2RatingsByAxis, l2Phase: state.l2Phase,
      l3Answers: state.l3Answers,
      primaryAxis: state.primaryAxis
    }); }catch(e){}
  }

  /* ════════════════════ التمهيد ════════════════════ */
  function renderIntro(){
    state.stage = 'intro'; cache();
    setHTML(
        '<div class="ax-tag">مقياس المحاور — اتجاه طاقتك</div>'
      + '<div class="ax-core">قبل أن نعرف أين تحترق، نعرف أين تتّجه طاقتك. أجب من تجربتك الحقيقيّة, لا ممّا تتمنّاه — أصدق إجاباتك أنفعها لك.</div>'
      + RND().introBlock(INTROS().opening)
      + '<div class="ax-reminder">لا توجد إجابة صحيحة. قيّم كلّ وصفٍ بمقدار ما يشبهك فعلًا. وتقدر ترجع للسؤال السابق في أيّ وقت.</div>'
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

    // مقدّمة الكتلة: تظهر مرّةً واحدةً عند أوّل بندٍ من الكتلة
    var firstInBlock = (state.l1Index === 0) || (state.l1[state.l1Index-1].block !== block);
    var blockIntroHTML = firstInBlock ? RND().introBlock(INTROS()[block]) : '';

    var opts = ['أ','ب','ج'].map(function(L){
      var o = q.options[L]; if(!o) return '';
      return RND().likertOption({ letter: L, text: o.text, hint: o.hint, saved: (typeof saved[L]==='number' ? saved[L] : null) });
    }).join('');

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(N) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + blockIntroHTML
      + '<div class="ax-question">' + esc(q.text) + '</div>'
      + RND().questionHint(q.hint)
      + '<div class="ax-reminder">' + blockHint + '</div>'
      + '<div class="ax-options">' + opts + '</div>'
      + '<div class="ax-nav">'
      +   (state.l1Index>0 ? '<button class="ax-btn ghost" id="axPrev">◄ السابق</button>' : '')
      +   '<button class="ax-btn primary" id="axNext" ' + (l1Complete(block,q)?'':'disabled') + '>تابِع ►</button>'
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
      + '<div class="ax-nav">'
      +   '<button class="ax-btn ghost" id="axBackToL1">◄ أعِد أسئلة التحديد</button>'
      +   '<button class="ax-btn primary" id="axToL2">تابِع ►</button>'
      + '</div>'
    );
    document.getElementById('axToL2').addEventListener('click', function(){ prepareL2(); });
    var bk = document.getElementById('axBackToL1');
    if(bk) bk.addEventListener('click', function(){
      state.stage='l1'; state.l1Index = Math.max(0, state.l1.length-1); cache(); renderL1();
    });
  }

  /* ════════════════════ الطبقة الثانية — احتراق أبعاد المحور (الرئيسيّ ثمّ المكبوت) ════════════════════
     نقيس طيف محورين بالتتابع: الرئيسيّ أوّلًا (l2Phase='primary')، ثمّ المكبوت
     (l2Phase='repressed'). كلٌّ في بكت مستقلّ داخل l2RatingsByAxis، وstate.l2Ratings
     يبقى alias حيًّا للمحور الجاري فيظلّ كود العرض/الكاش يعمل بلا أيّ تغيير. */
  function prepareL2(){
    if(state.l2Phase === 'primary') bindL2Axis(state.primaryAxis);
    else                            bindL2Axis(repressedAxisId());

    var axisL2 = Q().L2[state.l2Axis] || {};
    var cfgAxis = (CFG().axes || []).find(function(a){ return a.id === state.l2Axis; });
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

    // مقدّمة الطبقة الثانية: مرّةً واحدةً عند أوّل عبارة.
    //   للمحور الرئيسيّ: المقدّمة المعتادة. للمكبوت: مقدّمة انتقالٍ تشرح أنّنا
    //   ننظر الآن في اتجاهٍ آخر من طاقتك (الذي يعمل بهدوءٍ في الخلفيّة).
    var l2Intro = '';
    if(state.l2Index === 0){
      if(state.l2Phase === 'repressed'){
        var repName = BR().axisName(state.l2Axis);
        l2Intro =
            '<div class="ax-section-title">اتجاهٌ آخر في طاقتك</div>'
          + '<p class="ax-p">نظرنا في المحور الأظهر. والآن ننظر في اتجاهٍ يعمل فيك بهدوء، '
          + 'أبعد عن السطح — محور <strong>' + esc(repName) + '</strong>. '
          + 'قيّم العبارات التالية بمقدار ما تشبه حالك هذه الفترة، لا ما تتمنّاه. '
          + 'ما يظهر هنا غالبًا ألطف صوتًا، لكنّه يكمّل الصورة.</p>';
      } else {
        l2Intro = RND().introBlock(INTROS().L2);
      }
    }

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(total) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + l2Intro
      + RND().likertStatement({ text: s.text, saved: saved })
      + '<div class="ax-nav">'
      +   '<button class="ax-btn ghost" id="axPrev">◄ السابق</button>'
      +   '<button class="ax-btn primary" id="axNext" ' + (saved!=null?'':'disabled') + '>تابِع ►</button>'
      + '</div>'
    );
    Array.prototype.forEach.call(document.querySelectorAll('.ax-likert'), function(btn){
      btn.addEventListener('click', function(){
        var v = parseInt(btn.getAttribute('data-val'),10);
        if(!Array.isArray(state.l2Ratings[s.dimId])) state.l2Ratings[s.dimId] = [];
        state.l2Ratings[s.dimId][s.idx] = v;
        cache();
        var group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.ax-likert'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        var nb = document.getElementById('axNext');
        if(nb) nb.removeAttribute('disabled');
      });
    });

    var pb = document.getElementById('axPrev');
    if(pb) pb.addEventListener('click', function(){ l2Back(); });
    var nb = document.getElementById('axNext');
    if(nb) nb.addEventListener('click', function(){
      var cur = (state.l2Ratings[s.dimId] && typeof state.l2Ratings[s.dimId][s.idx]==='number');
      if(!cur) return;
      state.l2Index++; cache(); renderL2();
    });
  }

  // الرجوع من ط٢: أوّل بندٍ في المحور الرئيسيّ يرجع لشاشة الكشف؛
  //   وأوّل بندٍ في المكبوت يرجع لآخر عبارةٍ في المحور الرئيسيّ.
  function l2Back(){
    if(state.l2Index > 0){ state.l2Index--; cache(); renderL2(); return; }
    if(state.l2Phase === 'repressed'){
      state.l2Phase = 'primary';
      bindL2Axis(state.primaryAxis);
      prepareL2Resume(9999); // آخر عبارة في طيف الرئيسيّ
      return;
    }
    renderAxisReveal();
  }

  function computeBurnout(){
    if(state.l2Phase === 'primary'){
      // احسب احتراق المحور الرئيسيّ من بكته المخصّص
      try{ state.burnout = ENG().computeDimensionBurnout(state.primaryAxis, state.l2RatingsByAxis[state.primaryAxis] || {}); }
      catch(e){ errorCard('تعذّر حساب الاحتراق: ' + e.message); return; }

      // انتقل لقياس طيف المحور المكبوت (الوسط الذكيّ: رئيسيّ + مكبوت)
      var rep = repressedAxisId();
      if(rep && rep !== state.primaryAxis && Q().L2[rep]){
        state.l2Phase = 'repressed';
        prepareL2();         // يربط بكت المكبوت ويعرض مقدّمة الانتقال
        return;
      }
      // لا مكبوت صالح للقياس (نادر) — تابع كما كان
      state.burnoutRepressed = null;
      prepareL3();
      return;
    }

    // l2Phase === 'repressed' — احسب احتراق المحور المكبوت ثمّ تابع لخطّ العافية
    var repAxis = repressedAxisId();
    try{ state.burnoutRepressed = ENG().computeDimensionBurnout(repAxis, state.l2RatingsByAxis[repAxis] || {}); }
    catch(e){ state.burnoutRepressed = null; } // لا نُسقط الرحلة لو تعثّر المكبوت
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
    var s = state.l3[state.l3Index];
    var pos = state.l3Index + 1, pct = Math.round((state.l3Index/total)*100);
    var saved = (state.l3Answers[s.level] && typeof state.l3Answers[s.level][s.idx]==='number') ? state.l3Answers[s.level][s.idx] : null;

    // مقدّمة الطبقة الثالثة: مرّةً واحدةً عند أوّل عبارة
    var l3Intro = (state.l3Index === 0) ? RND().introBlock(INTROS().L3) : '';

    setHTML(
        '<div class="ax-progress-row">'
      +   '<span class="ax-progress-label">أنت في ' + arabicNum(pos) + ' من ' + arabicNum(total) + '</span>'
      +   '<div class="ax-progress-bar"><div class="ax-progress-fill" style="width:' + pct + '%"></div></div>'
      + '</div>'
      + l3Intro
      + '<div class="ax-reminder">قيّم كم تعيش هذا في هذه الفترة.</div>'
      + RND().likertStatement({ text: s.text, saved: saved })
      + '<div class="ax-nav">'
      +   '<button class="ax-btn ghost" id="axPrev">◄ السابق</button>'
      +   '<button class="ax-btn primary" id="axNext" ' + (saved!=null?'':'disabled') + '>تابِع ►</button>'
      + '</div>'
    );
    Array.prototype.forEach.call(document.querySelectorAll('.ax-likert'), function(btn){
      btn.addEventListener('click', function(){
        var v = parseInt(btn.getAttribute('data-val'),10);
        if(!Array.isArray(state.l3Answers[s.level])) state.l3Answers[s.level] = [];
        state.l3Answers[s.level][s.idx] = v;
        cache();
        var group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.ax-likert'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
        var nb = document.getElementById('axNext');
        if(nb) nb.removeAttribute('disabled');
      });
    });

    var pb = document.getElementById('axPrev');
    if(pb) pb.addEventListener('click', function(){ l3Back(); });
    var nb = document.getElementById('axNext');
    if(nb) nb.addEventListener('click', function(){
      var cur = (state.l3Answers[s.level] && typeof state.l3Answers[s.level][s.idx]==='number');
      if(!cur) return;
      state.l3Index++; cache(); renderL3();
    });
  }

  // الرجوع من ط٣: لو أوّل بند، نرجع لآخر بندٍ في آخر محورٍ قِيس طيفه
  //   (المكبوت إن وُجد، وإلّا الرئيسيّ).
  function l3Back(){
    if(state.l3Index > 0){ state.l3Index--; cache(); renderL3(); return; }
    var rep = repressedAxisId();
    if(rep && rep !== state.primaryAxis && Q().L2[rep]){
      state.l2Phase = 'repressed';
      bindL2Axis(rep);
    } else {
      state.l2Phase = 'primary';
      bindL2Axis(state.primaryAxis);
    }
    prepareL2Resume(9999); // آخر عبارة في طيف ذلك المحور
  }
  function prepareL2Resume(idx){
    var axisId = state.l2Axis || state.primaryAxis;
    bindL2Axis(axisId);
    var axisL2 = Q().L2[axisId] || {};
    var cfgAxis = (CFG().axes || []).find(function(a){ return a.id === axisId; });
    var dimOrder = cfgAxis ? cfgAxis.dimensions.map(function(d){ return d.id; }) : Object.keys(axisL2);
    state.l2Dims = [];
    dimOrder.forEach(function(dimId){
      var sts = axisL2[dimId] || [];
      sts.forEach(function(st, i){ state.l2Dims.push({ dimId: dimId, idx: i, text: st.text }); });
    });
    state.l2Index = Math.max(0, Math.min(idx, state.l2Dims.length-1));
    state.stage='l2'; cache(); renderL2();
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
      answers: {
        L1: state.l1Answers,
        // L2 يبقى تقييمات المحور الرئيسيّ (توافُق خلفيّ مع أيّ قارئ قديم)
        L2: state.l2RatingsByAxis[state.primaryAxis] || {},
        // L2ByAxis: تقييمات كل محورٍ قِيس طيفه (الرئيسيّ + المكبوت) — لإعادة الحساب والتقاطع
        L2ByAxis: state.l2RatingsByAxis,
        L3: state.l3Answers
      },
      results: {
        ranking: state.ranking,
        burnout: state.burnout,                  // احتراق المحور الرئيسيّ (كما كان)
        burnoutRepressed: state.burnoutRepressed, // احتراق المحور المكبوت (جديد — للتقاطع)
        repressedAxis: repressedAxisId(),         // معرّف المحور المكبوت صراحةً
        wellness: state.wellness,
        primaryAxis: state.primaryAxis
      },
      lean: state.lean
    };

    var uid = state.user && state.user.id;
    STORE().saveResult(uid, payload).then(function(){
      // أطفئ علم إعادة التمرين بعد إتمام جديد
      try{ if(ROSTER() && ROSTER().setRetakeAxes && state.forceRetake) ROSTER().setRetakeAxes(uid, false); }catch(e){}
      renderResult();
    }).catch(function(){ renderResult(); });
  }

  /* ════════════════════════════════════════════════════════════════════════
   تعديل renderResult في axes-app.js
   ────────────────────────────────────────────────────────────────────────
   استبدل دالة renderResult القديمة بالكامل بهذه النسخة.
   هي تُطلق رحلة التقرير الجديدة (AXES_JOURNEY_CONTROLLER) بدل الشاشة القديمة،
   وتمرّر لها نتيجة العميل كاملةً، وتحافظ على منطق الإتمام (onAxesComplete).

   ملاحظة: لم نعد نستعمل br.* ولا rnd.resultScreen هنا — العرض كلّه صار داخل
   الرحلة. الدوال القديمة تبقى في الملفّ دون ضرر (لا تُستدعى).
   ════════════════════════════════════════════════════════════════════════ */

  function renderResult(){
    state.stage = 'result';

    var r = root();
    if(!r) return;

    // مُلّاذ الوصول لمتحكّم الرحلة
    var CTRL = (typeof AXES_JOURNEY_CONTROLLER !== 'undefined')
      ? AXES_JOURNEY_CONTROLLER
      : (window.AXES_JOURNEY_CONTROLLER || null);

    // نتيجة العميل كاملةً — كما جهّزها المحرّك وحُفظت في الـstate
    var result = {
      ranking:          state.ranking,
      burnout:          state.burnout,           // احتراق المحور الأقوى
      burnoutRepressed: state.burnoutRepressed,  // احتراق المحور المنسيّ
      wellness:         state.wellness,          // خطّ النزيف
      lean:             state.lean               // تطابق النزيف (للمجوّع)
    };

    // احتياط: لو لم يُحمّل متحكّم الرحلة، لا نكسر التجربة
    if(!CTRL || typeof CTRL.start !== 'function'){
      errorCard('تعذّر تحميل عرض التقرير. حدّث الصفحة أو راجع تحميل ملفّات الرحلة.');
      return;
    }

    // نقطة الإتمام: تُستدعى عند بلوغ التقرير الكامل (آخر الرحلة)
    function handleComplete(){
      if(typeof window.onAxesComplete === 'function'){
        try{ window.onAxesComplete(state.lean); }catch(e){}
      }
    }

    // أطلق الرحلة داخل جذر المقياس
    CTRL.start(r, result, { onComplete: handleComplete });

    try{ window.scrollTo(0,0); }catch(e){}
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
    // استرجاع التقييمات: الصيغة الجديدة (l2RatingsByAxis) أو القديمة (l2Ratings) للتوافق
    if(c.l2RatingsByAxis && typeof c.l2RatingsByAxis === 'object'){
      state.l2RatingsByAxis = c.l2RatingsByAxis;
    } else if(c.l2Ratings && c.primaryAxis){
      state.l2RatingsByAxis = {}; state.l2RatingsByAxis[c.primaryAxis] = c.l2Ratings;
    }
    if(c.l2Phase) state.l2Phase = c.l2Phase;
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

    var rep = repressedAxisId();
    var primRatings = state.l2RatingsByAxis[state.primaryAxis] || {};
    var repRatings  = rep ? (state.l2RatingsByAxis[rep] || {}) : {};
    function anyRated(obj){ return Object.keys(obj).some(function(d){ return (obj[d]||[]).some(function(v){ return typeof v==='number'; }); }); }

    // لم يبدأ أيّ طيف بعد → شاشة الكشف
    if(!anyRated(primRatings)){ state.l2Phase='primary'; renderAxisReveal(); return; }

    // بدأ المكبوت (أو الصيغة تقول repressed) → استأنف طيف المكبوت
    if(state.l2Phase === 'repressed' || anyRated(repRatings)){
      state.l2Phase = 'repressed';
      prepareL2(); // يربط بكت المكبوت ويحسب أوّل غير مقيّم
      return;
    }

    // ما زلنا في طيف الرئيسيّ
    state.l2Phase = 'primary';
    prepareL2();
  }

  // إعادة تصفير الحالة لتمرينٍ جديد
  function resetState(){
    state.stage='intro';
    state.l1Index=0; state.l1Answers={ action:{}, longing:{}, critique:{} };
    state.ranking=null; state.primaryAxis=null;
    state.l2Dims=[]; state.l2Index=0; state.l2Ratings={};
    state.l2RatingsByAxis={}; state.l2Phase='primary'; state.l2Axis=null;
    state.l3=[]; state.l3Index=0; state.l3Answers={ tawaqud:[], hudur:[], imtila:[] };
    state.burnout=null; state.burnoutRepressed=null; state.wellness=null; state.lean=null;
    try{ STORE().clearCache(state.user && state.user.id); }catch(e){}
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

    // اقرأ علم إعادة التمرين من الـ roster (لو الأدمن سمح بإعادته)
    var retakeP = (ROSTER() && ROSTER().getMyRoster)
      ? ROSTER().getMyRoster(user.id).then(function(r){ return !!(r && r.retakeAxes); }).catch(function(){ return false; })
      : Promise.resolve(false);

    retakeP.then(function(allowRetake){
      state.forceRetake = allowRetake;

      // هل أتمّ المقياس سابقًا؟ (عرض النتيجة) — أو استئناف من cache — أو بداية
      STORE().loadAssessment(user.id).then(function(data){
        if(data && data.results && data.results.ranking && !allowRetake){
          // أعِد بناء الحالة من المحفوظ واعرض النتيجة
          state.ranking      = data.results.ranking;
          state.primaryAxis  = data.results.primaryAxis || data.results.ranking.primaryAxis;
          state.burnout      = data.results.burnout;
          state.burnoutRepressed = data.results.burnoutRepressed || null;
          state.wellness     = data.results.wellness;
          state.lean         = data.lean || null;
          renderResult();
          return;
        }
        if(allowRetake){
          // الأدمن سمح بإعادة التمرين → ابدأ من جديد نظيفًا
          resetState();
          renderIntro();
          return;
        }
        var c = null; try{ c = STORE().readCache(); }catch(e){ c=null; }
        var hasCache = c && (c.l1Answers && Object.keys(c.l1Answers.action||{}).length);
        if(hasCache) resumeFromCache(c); else renderIntro();
      }).catch(function(){ renderIntro(); });
    });
  }

  window.AXES_APP = { init: init };
})();
