/* ════════════════════════════════════════════════════════════════════════
   fouad-app.js — منطق وآلة حالة وعرض مقياس الفؤاد v2 (تطبيق صفحة واحدة)
   ────────────────────────────────────────────────────────────────────────
   • كل حساب عبر FOUAD_ENGINE، كل ترجمة عبر FOUAD_BRIDGE، كل Firestore عبر
     FOUAD_STORE حصرًا. هذا الملف لا يلمس Firestore مباشرة إطلاقًا.
   • يقرأ المحتوى من ملفّات البيانات (config/identification/spectrum/educational).
   • يحرّك العميل عبر مراحل المرآة السبع داخل صفحة واحدة.
   • طبقة العرض المطوّرة (النخلة/البيت/المراجعة/الاكتمال/خريطة التحرّك) في
     fouad-render.js (window.FOUAD_RENDER) — تُحمَّل قبل هذا الملف ويُنادى منه.
     آلة الحالة ونقاط الحفظ ونداءات المحرّك/الجسر/المخزن لم تتغيّر حرفيًّا.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── الإطلاق المرحليّ ──────────────────────────────────────────────
  // لم تعد المرايا المفتوحة مكتوبةً هنا. تُقرأ عند الإقلاع من إعدادات
  // الإتاحة في Firestore (لوحة الأدمن)، ويجوز لكلّ عميل استثناءٌ خاصّ.
  // القيمة null تعني: كلّ المرايا المعرّفة في mirrors-config.js.
  // أيّ فشلٍ في القراءة يُبقيها null، أي يفتح الكلّ كما كان اليوم.
  let ACTIVE_MIRRORS = null;

  // الإتاحة النهائيّة لهذا العميل (الوضع العامّ + استثناؤه). تُملأ في init().
  // القيم هنا احتياطٌ صرف لو تعذّر الوصول إلى المخزن أصلًا.
  let ACCESS = {
    activeMirrors   : null,
    adminMinMirrors : 1,
    clientEnabled   : true,
    clientMinMirrors: 7,
    hasOverride     : false,
    note            : ''
  };

  // عدد المجموعات البصريّة لأسئلة التحديد (الوقفات بينها = العدد − 1)
  const ID_GROUPS = 4;

  // ألوان القراءات (تطابق هويّة المشروع)
  const COLOR = { green: '#10b981', gold: '#fbbf24', blue: '#3b82f6', purple: '#a78bfa' };

  // ── الحالة الجاريّة في الذاكرة ──
  const state = {
    user: null, assessment: null,
    mirrorId: null, mirror: null,
    stage: 'intro',
    questions: [], answers: {}, qIndex: 0,
    pauseBeforeIndex: [], pausesShown: {},
    identificationResult: null, scenario: null, dominantAxis: null,
    spectrumAxes: [], spectrumStatements: [], ratings: {}, sIndex: 0,
    spectrumResults: {}
  };

  // ── مراجع الطبقات (تُقرأ من window بعد تحميل السكربتات بالترتيب) ──
  // ── مراجع الطبقات ──
  // محلّل آمن: يقرأ الاسم المجرّد (const عامّ من سكربت سابق) أوّلًا، ثمّ window احتياطًا.
  // السبب: mirrors-config.js يعرّف "const FOUAD_CONFIG" فقط، و const لا تُعلَّق على
  // window في المتصفّح — لكنّها مرئيّة كاسمٍ عامّ عبر typeof الآمن (لا يرمي خطأً).
  function CFG(){   return (typeof FOUAD_CONFIG             !== 'undefined') ? FOUAD_CONFIG             : window.FOUAD_CONFIG; }
  function IDQ(){   return (typeof IDENTIFICATION_QUESTIONS !== 'undefined') ? IDENTIFICATION_QUESTIONS : window.IDENTIFICATION_QUESTIONS; }
  function SPC(){   return (typeof SPECTRUM_STATEMENTS      !== 'undefined') ? SPECTRUM_STATEMENTS      : window.SPECTRUM_STATEMENTS; }
  function EDU(){   return (typeof EDUCATIONAL_CONTENT      !== 'undefined') ? EDUCATIONAL_CONTENT      : window.EDUCATIONAL_CONTENT; }
  function ENG(){   return (typeof FOUAD_ENGINE            !== 'undefined') ? FOUAD_ENGINE            : window.FOUAD_ENGINE; }
  function BR(){    return (typeof FOUAD_BRIDGE            !== 'undefined') ? FOUAD_BRIDGE            : window.FOUAD_BRIDGE; }
  function STORE(){ return window.FOUAD_STORE; }
  // طبقة العرض المطوّرة (fouad-render.js) — بنّاؤون أنقياء، لا حالة فيها
  function RND(){   return (typeof FOUAD_RENDER !== 'undefined') ? FOUAD_RENDER : window.FOUAD_RENDER; }
  function PAUSES(){
    var p = (typeof REFLECTION_PAUSES !== 'undefined') ? REFLECTION_PAUSES : window.REFLECTION_PAUSES;
    if(!p) return null;
    if(Array.isArray(p)) return p.length ? p : null;          // النسخة القديمة (مصفوفة عامة)
    if(p.byMirror || p.fallback) return p;                    // النسخة الجديدة (طقم لكل مرآة)
    return null;
  }
  // طقم وقفات المرآة الحالية (بترتيبها الثلاثي)، أو الطقم الاحتياطي
  function pauseSetForMirror(){
    var P = PAUSES(); if(!P) return null;
    if(Array.isArray(P)) return P;
    var set = (P.byMirror && P.byMirror[state.mirrorId]) || P.fallback;
    return (set && set.length) ? set : null;
  }
  // محرّك التقرير الذاتيّ (report-engine.js) — يُحمَّل بعد mirrors-config.js
  function REP(){ return (typeof FOUAD_REPORT_ENGINE !== 'undefined') ? FOUAD_REPORT_ENGINE : window.FOUAD_REPORT_ENGINE; }
  // محتوى رحلة الفهم (fouad-journey-content.js) ومحرك رحلة التقرير (fouad-journey.js)
  function JC(){ return (typeof FOUAD_JOURNEY_CONTENT !== 'undefined') ? FOUAD_JOURNEY_CONTENT : window.FOUAD_JOURNEY_CONTENT; }
  function JR(){ return (typeof FOUAD_JOURNEY !== 'undefined') ? FOUAD_JOURNEY : window.FOUAD_JOURNEY; }

  // اسم العرض للمرآة (المعرفات الداخلية لا تتغير؛ «الجروح» تُعرض «الجذر الخفي»)
  function mirrorDisplayName(name){
    const map = (JC() && JC().mirrorDisplay) || {};
    return map[name] || name;
  }

  // صيغة المخاطبة وشاشة الترحيب (تفضيلات محلية بمعرف العميل)
  function genderKey(){  return 'fouad_v2_gender_'  + ((state.user && state.user.id) || ''); }
  function welcomeKey(){ return 'fouad_v2_welcome_' + ((state.user && state.user.id) || ''); }
  function getGender(){  try{ return localStorage.getItem(genderKey()) || ''; }catch(e){ return ''; } }
  function setGender(v){ try{ localStorage.setItem(genderKey(), v || ''); }catch(e){ /* تجاهُل */ } }
  function welcomeDone(){ try{ return localStorage.getItem(welcomeKey()) === '1'; }catch(e){ return false; } }
  function markWelcomeDone(){ try{ localStorage.setItem(welcomeKey(), '1'); }catch(e){ /* تجاهُل */ } }

  // ── أدوات صغيرة ──
  const ORDINALS = {1:'الأولى',2:'الثانية',3:'الثالثة',4:'الرابعة',5:'الخامسة',6:'السادسة',7:'السابعة'};
  function arabicNum(n){ const m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,d=>m[+d]); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // تطبيع عرضي: الشرطة الطويلة في النصوص المصدرية القديمة → فاصلة منقوطة (عرض فقط)
  function noDash(t){ return String(t==null?'':t).replace(/\s*—\s*/g, '؛ '); }

  // أسماء عرض مواقع الطيف (بالهويّة، لا حسم لأيّ تعادل)
  const POS_LABEL = { balance:'وسطية', excess:'إفراط', deficit:'تفريط', ambiguous:'لم يستقر بعد' };

  const $app = () => document.getElementById('app');
  function setHTML(html){ const a=$app(); if(!a) return; a.innerHTML = html; window.scrollTo(0,0); }
  function errorCard(msg){ setHTML(`<div class="card centered"><div class="saving">${esc(msg)}</div></div>`); }

  // ── جمع أسئلة المرآة بترتيب الـconfig (لا بترتيب مفاتيح الكائن) ──
  function flattenIdentificationQuestions(mirrorId){
    const mirror = CFG().mirrors.find(m=>m.id===mirrorId);
    const all = [];
    mirror.axes.forEach(ax=>{
      const qs = IDQ()[mirrorId] && IDQ()[mirrorId][ax.id];
      if(Array.isArray(qs)) qs.forEach(q=>all.push(q));   // تباعًا q1..q6 لكل محور
    });
    return all;
  }

  // مواضع الوقفات: مؤشّرات (0-based) تظهر الوقفة قبل السؤال عندها
  function computePauseBoundaries(total, groups){
    groups = Math.min(groups, total);
    if(groups <= 1) return [];
    const base = Math.floor(total/groups), rem = total % groups, bounds = [];
    let acc = 0;
    for(let i=0;i<groups-1;i++){ acc += base + (i<rem?1:0); bounds.push(acc); }
    return bounds; // مثال 18/4 → [5,10,14]
  }

  // المراجع المكتملة من وثيقة Firestore المحمّلة
  function getCompletedMirrors(){
    const a = state.assessment;
    return (a && a.progress && Array.isArray(a.progress.completedMirrors)) ? a.progress.completedMirrors : [];
  }
  // كلّ المرايا المعرّفة بنيويًّا (السبع) — مستقلّة تمامًا عن المفتوح
  function allMirrorIds(){ return CFG().mirrors.map(function(m){ return m.id; }); }
  function totalStructuralMirrors(){ return CFG().mirrors.length; }

  // كم مرآةً أتمّها العميل فعليًّا من السبع (لا من المفتوح)
  function completedStructuralCount(){
    const ids = allMirrorIds(), done = getCompletedMirrors();
    return ids.filter(function(id){ return done.indexOf(id)!==-1; }).length;
  }
  // اكتمالٌ بنيويّ = السبع كلّها. هذا وحده ما يجعل التقرير غير جزئيّ.
  function isStructurallyComplete(){
    return completedStructuralCount() >= totalStructuralMirrors();
  }

  // المرايا المفتوحة لهذا العميل، بترتيب الـconfig.
  // احتياطٌ مزدوج: لو القائمة غائبة أو فارغة أو لا تطابق شيئًا → الكلّ مفتوح.
  // المبدأ: خللٌ في الإعدادات لا يقفل المقياس في وجه أحد.
  function orderedActiveMirrors(){
    const all = allMirrorIds();
    if(!Array.isArray(ACTIVE_MIRRORS) || !ACTIVE_MIRRORS.length) return all;
    const open = CFG().mirrors
      .filter(function(m){ return ACTIVE_MIRRORS.indexOf(m.id)!==-1; })
      .map(function(m){ return m.id; });
    return open.length ? open : all;
  }

  // هل يُعرَض للعميل زرّ «صورتك المتكاملة»؟
  // شرطان معًا: التقرير مُتاح له أصلًا، وبلغ عتبة عدد المرايا المطلوبة.
  function clientCanSeeReport(){
    if(!ACCESS || ACCESS.clientEnabled === false) return false;
    const need = (typeof ACCESS.clientMinMirrors === 'number')
      ? ACCESS.clientMinMirrors : totalStructuralMirrors();
    return completedStructuralCount() >= need;
  }

  // ── أدوات البيت (عرض صرف يعتمد على الهويّة) ──
  // هل في المرآة تقدّمٌ محلّيّ غير مكتمل؟ (لتمييز عقدة «جاريّة»)
  function mirrorHasCache(id){
    try{
      const c = STORE().readMirrorCache(id);
      return !!(c && ((c.answers && Object.keys(c.answers).length) || (c.ratings && Object.keys(c.ratings).length)));
    }catch(e){ return false; }
  }
  function hasAnyCachedProgress(){
    return orderedActiveMirrors().some(function(id){ return mirrorHasCache(id); });
  }
  // لون عقدة المرآة من موقع طيف محورها الأظهر (الوصول بالهويّة لا بالموضع)
  function mirrorNodeColor(mirrorId, results){
    const res = results && results[mirrorId];
    if(!res || !res.spectrum) return null;
    const domAxis = res.dominantAxis || (res.ranking && res.ranking[0] ? res.ranking[0].axisId : null);
    let sp = domAxis ? res.spectrum[domAxis] : null;
    if(!sp){                                   // احتياط: أوّل محور طيفٍ متاح
      const keys = Object.keys(res.spectrum);
      if(keys.length) sp = res.spectrum[keys[0]];
    }
    if(!sp) return null;
    return RND().posColor(sp.position, sp.key);
  }
  // اسم العميل من بيانات المصادقة (بأمان، بلا افتراض شكلٍ واحد)
  function clientName(){
    const u = state.user || {};
    return u.name || u.displayName || u.fullName || '';
  }

  // حفظ التقدّم الجاري محلّيًّا فقط (صفر كتابة Firestore)
  function cache(){
    try{ STORE().cacheMirrorProgress(state.mirrorId, {
      stage: state.stage, answers: state.answers, ratings: state.ratings
    }); }catch(e){ /* تجاهُل */ }
  }

  /* ════════════════════ الحساب عبر المحرّك والجسر ════════════════════ */

  function computeIdentification(){
    state.identificationResult = ENG().computeMirrorIdentification(state.mirrorId, state.answers);
    state.scenario             = BR().resolveDisplayScenario(state.identificationResult);
    state.dominantAxis         = BR().resolveDominantAxis(state.identificationResult, state.mirrorId);

    // محاور الطيف: dual → المحوران، غير ذلك → المحور الدومينانت وحده
    if(state.scenario.scenario === 'dual'){
      state.spectrumAxes = (state.scenario.doors || []).slice(0, 2);
    } else {
      state.spectrumAxes = state.dominantAxis ? [state.dominantAxis] : [];
    }

    // بناء قائمة عبارات الطيف المسطّحة بترتيب الملف + تهيئة مصفوفات التقييم
    state.spectrumStatements = [];
    state.spectrumAxes.forEach(ax=>{
      const sts = SPC()[ax] || [];
      if(!Array.isArray(state.ratings[ax])) state.ratings[ax] = [];
      sts.forEach((st, idx)=> state.spectrumStatements.push({ axisId: ax, idx: idx, text: st.text }));
    });
  }

  function computeSpectrumResults(){
    state.spectrumResults = {};
    state.spectrumAxes.forEach(ax=>{
      const result = ENG().computeAxisSpectrum(ax, state.ratings[ax]);   // الحساب بالتصنيف داخليًّا
      const key    = BR().resolveSpectrumKey(result);                    // أحد المفاتيح التسعة
      const text   = (EDU()[state.mirrorId].axes[ax].spectrum || {})[key] || '';
      state.spectrumResults[ax] = { result: result, key: key, text: text };
    });
  }

  // تركيبة الشرح حسب السيناريو (الوصول دائمًا بالهويّة)
  function buildEducationBlocks(){
    const mc = EDU()[state.mirrorId];
    const sc = state.scenario.scenario;
    const ranking = state.identificationResult.ranking;
    const blocks = [];

    if(sc === 'weak'){                       // (د) إشارة ضعيفة — لا باب
      blocks.push({ type:'weak', text: mc.weakSignal || '' });
      return blocks;
    }
    if(sc === 'dual'){                        // (ب) بابان — لكل محور topType الخاصّ به
      (state.scenario.doors || []).forEach(axisId=>{
        const ac = mc.axes[axisId]; if(!ac) return;
        const topItem = ranking.find(x=>x.axisId===axisId);
        const topType = topItem ? topItem.type : null;
        blocks.push({
          type:'door', axisId: axisId,
          axisIntro: ac.axisIntro,
          afterRanking: (topType && ac.doors[topType]) ? ac.doors[topType].afterRanking : ''
        });
      });
      return blocks;
    }
    // (أ) clear / (ج) closeness — باب الطابع الأوّل
    const domAxis = state.dominantAxis;
    const ac = mc.axes[domAxis] || {};
    const topType = ranking[0] ? ranking[0].type : null;
    const block = {
      type:'door', axisId: domAxis,
      axisIntro: ac.axisIntro,
      afterRanking: (topType && ac.doors && ac.doors[topType]) ? ac.doors[topType].afterRanking : ''
    };
    if(sc === 'clear') block.rooting = ac.rooting;   // التأصيل في الحالة الواضحة فقط
    blocks.push(block);
    return blocks;
  }

  function firstUnratedIndex(){
    for(let i=0;i<state.spectrumStatements.length;i++){
      const s = state.spectrumStatements[i], arr = state.ratings[s.axisId];
      if(!arr || typeof arr[s.idx] !== 'number') return i;
    }
    return state.spectrumStatements.length;
  }

  /* ════════════════════ تجميع نتائج التقرير (صفر لمس Firestore) ════════════════════ */

  // يجمع نتائج المرايا المكتملة: المحمّلة من Firestore + الجلسة الحاليّة في الذاكرة.
  function collectResultsForReport(){
    const out = {};
    // ١) المحمّلة أصلًا عند الدخول (إن وُجدت)
    const loaded = (state.assessment && state.assessment.results) ? state.assessment.results : null;
    if(loaded && typeof loaded === 'object'){
      Object.keys(loaded).forEach(function(mid){
        if(loaded[mid] && loaded[mid].results) out[mid] = loaded[mid].results; // الشكل المحفوظ: {identification, spectrum, results}
        else if(loaded[mid] && loaded[mid].ranking) out[mid] = loaded[mid];    // أو نتيجة جاهزة مباشرة
      });
    }
    // ٢) المرآة الحاليّة المنتهية للتوّ في الذاكرة (إن لم تُحمَّل بعد)
    if(state.mirrorId && state.identificationResult && !out[state.mirrorId]){
      const idr = state.identificationResult, results = {
        ranking: idr.ranking,
        dominantAxis: state.dominantAxis,
        scenario: state.scenario ? state.scenario.scenario : null,
        flags: { weakSignal: idr.weakSignal, dualAxis: idr.dualAxis, sameAxisCloseness: idr.sameAxisCloseness },
        spectrum: {}
      };
      (state.spectrumAxes||[]).forEach(function(ax){
        const sr = state.spectrumResults[ax];
        if(sr) results.spectrum[ax] = Object.assign({}, sr.result, { key: sr.key });
      });
      out[state.mirrorId] = results;
    }
    return out;
  }

  // (لم تعد مستعملة) كانت تقيس الاكتمال بالمرايا المفتوحة، وهو ما جعل تقريرًا
  // مبنيًّا على مرآتين يظهر «كاملًا». حلّ محلّها isStructurallyComplete().
  // تُترك للتوافق فقط — لا تُوصَل بالتقرير مرّةً أخرى.
  function allActiveMirrorsComplete(){
    const completed = getCompletedMirrors().slice();
    if(state.mirrorId && completed.indexOf(state.mirrorId)===-1) completed.push(state.mirrorId);
    const active = orderedActiveMirrors();
    return active.every(function(id){ return completed.indexOf(id)!==-1; });
  }

  /* ════════════════════ شاشات الرحلة السبع ════════════════════ */

  // المرحلة ١ — تهيئة خفيفة: سؤال المرآة الجوهريّ فقط (لا طبائع، لا محاور، لا أطياف)
  function renderIntro(){
    state.stage='intro'; cache();
    const m = state.mirror, ord = ORDINALS[m.order] || arabicNum(m.order);
    setHTML(`
      <div class="card intro">
        <div class="mirror-tag">المرآة ${ord}: ${esc(mirrorDisplayName(m.name))}</div>
        ${m.id==='mirror1' ? `<p class="founding-line">${esc(JC().mirror1Founding)}</p>` : ''}
        <div class="core-question">${esc(m.coreQuestion)}</div>
        <div class="reminder">ستجيب من تجربتك الحقيقيّة. لا توجد إجابة صحيحة. أصدق إجاباتك أنفعها لك.</div>
        <button class="btn primary" id="startBtn">ابدأ</button>
      </div>`);
    document.getElementById('startBtn').addEventListener('click', ()=>{
      state.stage='identification'; state.qIndex=0; renderIdentification();
    });
  }

  // المرحلة ٢ — أسئلة التحديد (تقييم مستقل ١..٧ لكلّ خيار، لا اختيار واحد)
  function renderIdentification(){
    state.stage='identification';
    const N = state.questions.length;
    if(state.qIndex >= N){ goToRanking(); return; }

    const pauses = PAUSES();
    if(pauses && state.pauseBeforeIndex.indexOf(state.qIndex)!==-1 && !state.pausesShown[state.qIndex] && state.qIndex < N){
      renderPause(state.qIndex); return;
    }

    const q = state.questions[state.qIndex];
    const pos = state.qIndex + 1;
    const pct = Math.round((state.qIndex / N) * 100);
    const saved = (state.answers[q.id] && typeof state.answers[q.id]==='object') ? state.answers[q.id] : {};

    const opts = ['أ','ب','ج'].map(function(L){
      const o = q.options[L]; if(!o) return '';
      const scale = [1,2,3,4,5,6,7].map(function(v){
        const sel = (saved[L] === v) ? ' selected' : '';
        return `<button class="likert id-likert${sel}" data-letter="${L}" data-val="${v}">${arabicNum(v)}</button>`;
      }).join('');
      return `<div class="id-option">
                <div class="id-option-text"><span class="opt-letter">${L}</span><span>${esc(o.text)}</span></div>
                <div class="likert-scale">${scale}</div>
                <div class="likert-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>
              </div>`;   // نعرض النصّ فقط — لا type ولا تصنيف
    }).join('');

    setHTML(`
      <div class="card">
        <div class="progress-row">
          <span class="progress-label">أنت في ${arabicNum(pos)} من ${arabicNum(N)}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="question-text">${esc(q.text)}</div>
        <div class="reminder">قيّم كل وصف بمقدار ما يشبهك فعلًا؛ لا تختر واحدًا، فقد تشبهك أكثر من زاوية.</div>
        <div class="id-options">${opts}</div>
        <div class="id-nav" style="display:flex; gap:12px; margin-top:8px;">
          ${state.qIndex>0 ? '<button class="btn ghost" id="idPrev">السابق</button>' : ''}
          <button class="btn primary" id="idNext" ${idQuestionComplete(q)?'':'disabled'}>تابِع</button>
        </div>
      </div>`);

    Array.prototype.forEach.call(document.querySelectorAll('.id-likert'), function(btn){
      btn.addEventListener('click', function(){
        const L = btn.getAttribute('data-letter');
        const v = parseInt(btn.getAttribute('data-val'),10);
        rateIdentificationOption(q, L, v);
        const group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.id-likert'), function(b){ b.classList.remove('selected'); });
        btn.classList.add('selected');
         
        const nb = document.getElementById('idNext');
        if(nb && idQuestionComplete(q)) nb.removeAttribute('disabled');
      });
    });

     const pb = document.getElementById('idPrev');
    if(pb) pb.addEventListener('click', function(){
      if(state.qIndex>0){ state.qIndex -= 1; cache(); renderIdentification(); }
    });
    const nb = document.getElementById('idNext');
    if(nb) nb.addEventListener('click', function(){
      if(!idQuestionComplete(q)) return;
      state.qIndex += 1; cache(); renderIdentification();
    });
  }

  // تخزين درجة خيارٍ واحد (١..٧) — الشكل: answers[qId] = { "أ":n, "ب":n, "ج":n }
  function rateIdentificationOption(q, L, v){
    if(!state.answers[q.id] || typeof state.answers[q.id] !== 'object') state.answers[q.id] = {};
    state.answers[q.id][L] = v;
    cache();
  }

  // هل قُيّمت الخيارات الثلاثة كلّها لهذا السؤال؟
  function idQuestionComplete(q){
    const a = state.answers[q.id];
    if(!a || typeof a !== 'object') return false;
    return ['أ','ب','ج'].every(function(L){
      return !q.options[L] || typeof a[L] === 'number';
    });
  }

  function renderPause(beforeIndex){
    const set = pauseSetForMirror();
    if(!set){ state.pausesShown[beforeIndex] = true; renderIdentification(); return; }
    // الوقفات تُعرض بترتيبها داخل المرآة: الأولى تُحضِر، والثانية تُصدِق، والثالثة تُثبِت
    const p = set[Object.keys(state.pausesShown).length % set.length];
    const kind = p.kind || (p.verse ? 'verse' : 'voice');

    let inner = '';
    if(kind === 'verse' || p.verse){
      inner = `<div class="pause-verse">${esc(p.verse || '')}</div>
               <div class="pause-note">${esc(p.note || p.text || '')}</div>`;
    } else if(kind === 'breath'){
      inner = `<div class="pause-breath">${esc(p.text || '')}</div>`;
    } else {
      inner = `<div class="pause-line pause-${esc(kind)}">${esc(p.text || '')}</div>`;
    }

    setHTML(`
      <div class="card pause pause-kind-${esc(kind)}">
        ${inner}
        <button class="btn ghost" id="pauseBtn">أكمل</button>
      </div>`);
    document.getElementById('pauseBtn').addEventListener('click', ()=>{
      state.pausesShown[beforeIndex] = true; renderIdentification();
    });
  }

  // المرحلة ٣ — شاشة نتيجة الترتيب (بلا شرح للطبائع بعد)
  function goToRanking(){
    try{ computeIdentification(); }catch(e){ errorCard('تعذّر حساب الترتيب: '+e.message); return; }
    state.stage='ranking'; cache(); renderRanking();
  }

  function renderRanking(){
    const r = state.identificationResult, mirror = state.mirror;
    const axisName = id => { const a = mirror.axes.find(x=>x.id===id); return a?a.name:id; };

    // أعلى نسبة لكل محور (تتّسق مع تحديد "المحور الأظهر" = محور الطابع الأقوى)
    const axisScore = {};
    r.ranking.forEach(item=>{
      if(axisScore[item.axisId]===undefined || item.percent > axisScore[item.axisId])
        axisScore[item.axisId] = item.percent;
    });
    const axes = mirror.axes.map(a=>({ id:a.id, name:a.name, percent: axisScore[a.id]||0 }));
    axes.sort((a,b)=> (b.percent - a.percent) || (a.id===state.dominantAxis ? -1 : 1));

    const rows = axes.map(ax=>`
      <div class="rank-row ${ax.id===state.dominantAxis?'top':''}">
        <span class="rank-axis">${esc(ax.name)}</span>
        <div class="rank-bar"><div class="rank-fill" style="width:${ax.percent}%"></div></div>
        <span class="rank-pct">${arabicNum(ax.percent)}٪</span>
      </div>`).join('');

    setHTML(`
      <div class="card">
        <div class="section-title">صورة هذه المرآة</div>
        <p class="lead">${esc(JC().ranking.intro)}</p>
        <div class="ranking">${rows}</div>
        <div class="dominant">${esc(JC().ranking.dominantLabel)}: <strong>${esc(axisName(state.dominantAxis))}</strong></div>
        <p class="lead subtle-lead">${esc(JC().ranking.explain)}</p>
        <button class="btn primary" id="toEdu">تابِع</button>
      </div>`);
    document.getElementById('toEdu').addEventListener('click', ()=>{ state.stage='education'; cache(); renderEducation(); });
  }

  // المرحلة ٤ — الشرح التعليميّ (لحظة afterRanking)
  function renderEducation(){
    const blocks = buildEducationBlocks();
    const mirror = state.mirror;
    const axisName = id => { const a=mirror.axes.find(x=>x.id===id); return a?a.name:id; };
    const sc = state.scenario.scenario;
    const title = (JC().eduTitles && JC().eduTitles[sc]) || 'التعرف على طريقتك';

    let inner = '';
    if(sc === 'dual') inner += `<p class="lead">${esc(JC().dualNote)}</p>`;
    blocks.forEach(b=>{
      if(b.type==='weak'){ inner += `<div class="edu-block weak"><p>${esc(noDash(b.text))}</p></div>`; }
      else {
        inner += `<div class="edu-block door">`;
        inner += `<div class="edu-axis-name">${esc(axisName(b.axisId))}</div>`;
        if(b.axisIntro)    inner += `<p class="edu-intro">${esc(noDash(b.axisIntro))}</p>`;
        if(b.afterRanking) inner += `<p class="edu-after">${esc(noDash(b.afterRanking))}</p>`;
        if(b.rooting)      inner += `<div class="edu-rooting"><div class="edu-rooting-tag">في الأصل</div><p>${esc(noDash(b.rooting))}</p></div>`;
        inner += `</div>`;
      }
    });

    setHTML(`<div class="card edu"><div class="section-title">${esc(title)}</div>${inner}<button class="btn primary" id="toSpectrum">تابِع</button></div>`);
    document.getElementById('toSpectrum').addEventListener('click', ()=>{
      state.stage='spectrumIntro'; cache(); renderSpectrumIntro();
    });
  }

  // المرحلة ٥ (تمهيد) — شاشة تُعرّف العميل بما سيفعله قبل عبارات الطيف (بلا أيّ تصنيف)
  function renderSpectrumIntro(){
    state.stage='spectrumIntro';
    const mirror = state.mirror;
    const axisName = id => { const a=mirror.axes.find(x=>x.id===id); return a?a.name:id; };
    const names = state.spectrumAxes.map(axisName);
    const namesText = names.length>1 ? `محوريْ ${names[0]} و${names[1]}` : `محور ${names[0]||''}`;
    const count = state.spectrumStatements.length;

    setHTML(`
      <div class="card">
        <div class="section-title">${esc(JC().spectrumIntro.title)}</div>
        <p class="edu-intro">${esc(JC().spectrumIntro.body)}</p>
        <p class="lead">${esc(JC().spectrumIntro.note)}</p>
        <p class="reminder">${esc(JC().spectrumIntro.task.replace('{n}', arabicNum(count)))}</p>
        <button class="btn primary" id="startSpectrum">ابدأ التقييم</button>
      </div>`);
    document.getElementById('startSpectrum').addEventListener('click', ()=>{
      state.stage='spectrum'; state.sIndex = firstUnratedIndex(); cache(); renderSpectrum();
    });
  }

  // المرحلة ٥ — أسئلة الطيف (تقييم أعمى على ليكرت ١–٧، بترتيب الملف، بلا تصنيف)
  function renderSpectrum(){
    const total = state.spectrumStatements.length;
    if(total === 0 || state.sIndex >= total){ goToSpectrumResult(); return; }
    const s = state.spectrumStatements[state.sIndex];
    const pos = state.sIndex + 1, pct = Math.round((state.sIndex/total)*100);
    const scale = [1,2,3,4,5,6,7].map(v=>`<button class="likert" data-val="${v}">${arabicNum(v)}</button>`).join('');
    setHTML(`
      <div class="card">
        <div class="progress-row">
          <span class="progress-label">أنت في ${arabicNum(pos)} من ${arabicNum(total)}</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="statement-text">${esc(s.text)}</div>
        <div class="likert-scale">${scale}</div>
        <div class="likert-labels"><span>لا يشبهني إطلاقًا</span><span>يشبهني تمامًا</span></div>
      </div>`);
    Array.prototype.forEach.call(document.querySelectorAll('.likert'), btn=>{
      btn.addEventListener('click', ()=> rateSpectrum(s, parseInt(btn.getAttribute('data-val'),10)));
    });
  }

  function rateSpectrum(s, val){
    if(!Array.isArray(state.ratings[s.axisId])) state.ratings[s.axisId] = [];
    state.ratings[s.axisId][s.idx] = val;   // نفس ترتيب العرض = ترتيب الملف
    state.sIndex += 1; cache();
    renderSpectrum();
  }

  // المرحلة ٦ — نتيجة الطيف
  function goToSpectrumResult(){
    try{ computeSpectrumResults(); }catch(e){ errorCard('تعذّر حساب الطيف: '+e.message); return; }
    state.stage='spectrumResult'; cache(); renderSpectrumResult();
  }

  function spectrumColor(key){
    if(key === 'balance') return COLOR.green;
    if(key.indexOf('excess')===0)  return COLOR.gold;
    if(key.indexOf('deficit')===0) return COLOR.blue;
    return COLOR.purple;   // ambiguous + suspicious_balance
  }

  function renderSpectrumResult(){
    const mirror = state.mirror;
    const axisName = id => { const a=mirror.axes.find(x=>x.id===id); return a?a.name:id; };
    let inner = '';
    state.spectrumAxes.forEach(ax=>{
      const sr = state.spectrumResults[ax], color = spectrumColor(sr.key);
      // شريط الطيف التوقيعيّ يُعرَض مع كلّ قراءة (عرض صرف من fouad-render.js)
      const sp  = Object.assign({}, sr.result, { key: sr.key });
      const bar = RND() ? RND().spectrumBar(sp) : '';
      inner += `
        <div class="spectrum-result" style="border-inline-start-color:${color}">
          <div class="sr-axis" style="color:${color}">${esc(axisName(ax))}: ${esc(POS_LABEL[sr.result.position] || '')}</div>
          ${bar}
          <p class="sr-text">${esc(noDash(sr.text))}</p>
        </div>`;
    });
    setHTML(`
      <div class="card">
        <div class="section-title">${esc(JC().spectrumResultTitle)}</div>
        ${inner}
        <button class="btn primary" id="finishMirror">أنهِ المرآة</button>
      </div>`);
    document.getElementById('finishMirror').addEventListener('click', finishMirror);
  }

  // المرحلة ٧ — استراحة-استئناف: هنا تتمّ كتابة Firestore الوحيدة لهذه المرآة
  async function finishMirror(){
    state.stage='rest';
    setHTML(`<div class="card centered"><div class="spinner"></div><div class="saving">نحفظ تقدّمك…</div></div>`);

    const idr = state.identificationResult;
    const results = {
      ranking: idr.ranking,
      dominantAxis: state.dominantAxis,
      scenario: state.scenario.scenario,
      flags: { weakSignal: idr.weakSignal, dualAxis: idr.dualAxis, sameAxisCloseness: idr.sameAxisCloseness },
      spectrum: {}
    };
    state.spectrumAxes.forEach(ax=>{
      const sr = state.spectrumResults[ax];
      results.spectrum[ax] = Object.assign({}, sr.result, { key: sr.key });
    });

    let ok = false;
    try{
      ok = await STORE().saveMirror(state.user.id, state.mirrorId, {
        identification: state.answers,   // { questionId: حرف }
        spectrum: state.ratings,         // { axisId: [r1..r6] }
        results: results
      });
    }catch(e){ ok = false; }
    renderRest(ok);
  }

  // بعد الحفظ: تُعرَض «رجوع للبيت» (البيت هو مَن يقرّر المرآة التالية / التقرير).
  // نحدّث النسخة المحلّيّة (المكتمل + نتيجة المرآة) كي يلوّن البيت العقدة بلا قراءة Firestore.
  function renderRest(saved){
    state.stage = 'rest';

    state.assessment = state.assessment || {};
    state.assessment.progress = state.assessment.progress || {};
    if(!Array.isArray(state.assessment.progress.completedMirrors)) state.assessment.progress.completedMirrors = [];
    if(saved && state.assessment.progress.completedMirrors.indexOf(state.mirrorId)===-1)
      state.assessment.progress.completedMirrors.push(state.mirrorId);

    // مرآةٌ مكتملة → خزّن نتيجتها محلّيًّا بنفس الشكل المحفوظ ({results:{…}}) (لا Firestore)
    if(saved && state.identificationResult){
      const idr = state.identificationResult;
      const rr = {
        ranking: idr.ranking,
        dominantAxis: state.dominantAxis,
        scenario: state.scenario ? state.scenario.scenario : null,
        flags: { weakSignal: idr.weakSignal, dualAxis: idr.dualAxis, sameAxisCloseness: idr.sameAxisCloseness },
        spectrum: {}
      };
      (state.spectrumAxes||[]).forEach(function(ax){
        const sr = state.spectrumResults[ax];
        if(sr) rr.spectrum[ax] = Object.assign({}, sr.result, { key: sr.key });
      });
      state.assessment.results = state.assessment.results || {};
      state.assessment.results[state.mirrorId] = { results: rr };
    }

    const savedNote = saved
      ? `<div class="rest-line">أتممتَ المرآة. تقدّمك محفوظ.</div>`
      : `<div class="rest-line warn">أتممتَ المرآة، لكن تعذّر الحفظ الآن.</div>`;
    const retry = saved ? '' : `<button class="btn ghost" id="retrySave">حاول الحفظ ثانيةً</button>`;

    setHTML(`
      <div class="card centered rest">
        <div class="rest-check">${saved?'✓':'…'}</div>
        ${savedNote}
        ${retry}
        <div class="rest-line subtle">${esc(JC().rest.savedLine)}</div>
        <div class="home-actions">
          <button class="btn ghost" id="reviewThis">${esc(JC().rest.reviewBtn)}</button>
          <button class="btn primary" id="backHome">${esc(JC().rest.homeBtn)}</button>
        </div>
      </div>`);

    if(!saved){ const rb=document.getElementById('retrySave'); if(rb) rb.addEventListener('click', finishMirror); }
    const rv = document.getElementById('reviewThis');
    if(rv) rv.addEventListener('click', function(){ renderMirrorReview(state.mirrorId); });
    const hb = document.getElementById('backHome');
    if(hb) hb.addEventListener('click', renderHome);
  }

  // (تبقى مُعرّفة احتياطًا — لم تعد جزءًا من المسار بعد اعتماد البيت)
  function renderAllActiveDone(){
    setHTML(`
      <div class="card centered">
        <div class="rest-check">✓</div>
        <div class="rest-line">لقد أتممتَ ما هو متاح في هذا الإصدار.</div>
        <div class="done-note">سيُفتح ما بعد هذه المرآة قريبًا بإذن الله.</div>
      </div>`);
  }

  /* ════════════════════ (١) شاشة البيت / خريطة الرحلة ════════════════════
     البيت نقطة الدخول حين يوجد تقدّم، وما يُعرَض «رجوع للبيت» بعد كلّ مرآة.
     يعيد عرض ما تمّ من المحفوظ + المحتوى (لا توليد). الوصول دائمًا بالهويّة. */
  function renderHome(){
    state.stage = 'home';
    const cfg = CFG();
    const order = orderedActiveMirrors();
    const completed = getCompletedMirrors();
    const results = collectResultsForReport();
    const mirrorById = {}; cfg.mirrors.forEach(function(m){ mirrorById[m.id]=m; });

    const next = order.find(function(id){ return completed.indexOf(id)===-1; });
    const allDone = order.length>0 && order.every(function(id){ return completed.indexOf(id)!==-1; });

    // العقد بترتيب القوس من الـconfig (السلوك قاعدةً، الجروح قمّةً — يرتّبها fouad-render)
    const nodes = order.map(function(id){
      let status = 'todo';
      if(completed.indexOf(id)!==-1)      status = 'done';
      else if(id===next && mirrorHasCache(id)) status = 'active';   // مرآةٌ جاريّة (تقدّمٌ غير مكتمل)
      return {
        id: id,
        name: mirrorDisplayName(mirrorById[id] ? mirrorById[id].name : id),
        status: status,
        color: (status==='done') ? mirrorNodeColor(id, results) : null
      };
    });

    const doneCount = order.filter(function(id){ return completed.indexOf(id)!==-1; }).length;
    const totalCount = order.length;
    const progressPct = totalCount ? Math.round((doneCount/totalCount)*100) : 0;

    const palmSVG = RND().layersMap(nodes, { allDone: allDone });
    const card = RND().homeCard({
      name: clientName(), palmSVG: palmSVG,
      doneCount: doneCount, totalCount: totalCount, progressPct: progressPct,
      hasNext: !!next,
      allDone: allDone,                    // إضاءة الخريطة: باكتمال المفتوح
      canReport: clientCanSeeReport()      // زرّ التقرير: بقواعد الإتاحة وحدها
    });
    setHTML(`<div class="card home">${card}</div>`);

    // «تابِع» → المرآة التالية غير المكتملة (تستأنف الجاريّة إن وُجد تقدّم)
    const cont = document.getElementById('homeContinue');
    if(cont) cont.addEventListener('click', function(){
      const nx = orderedActiveMirrors().find(function(id){ return getCompletedMirrors().indexOf(id)===-1; });
      if(nx) startMirror(nx);
    });
    // «صورتك المتكاملة» → بوّابة الاكتمال (شاشة النخلة) ثمّ التقرير.
    // البوّابة شاشة تهنئةٍ باكتمال السبع، فلا تُعرض على تقريرٍ جزئيّ:
    // الجزئيّ يذهب إلى التقرير مباشرةً حاملًا ملاحظة الجزئيّة.
    const rep = document.getElementById('homeReport');
    if(rep) rep.addEventListener('click', function(){
      if(REP() && isStructurallyComplete()) renderReportGate();
      else renderReport();
    });

    // نقر عقدةٍ تمّت → مراجعة تلك المرآة (لا قفز داخل مرآةٍ جاريّة)
    Array.prototype.forEach.call(document.querySelectorAll('.layer-hit'), function(hit){
      hit.addEventListener('click', function(){
        const id = hit.getAttribute('data-node');
        if(id) renderMirrorReview(id);
      });
    });
  }

  /* شاشة المراجعة — تعيد بناء ما رآه العميل من المحفوظ + المحتوى (لا توليد) */
  function renderMirrorReview(mirrorId){
    state.stage = 'review';
    const cfg = CFG();
    const mirror = cfg.mirrors.find(function(m){ return m.id===mirrorId; });
    if(!mirror){ renderHome(); return; }
    const results = collectResultsForReport();
    const res = results[mirrorId];
    const edu = EDU()[mirrorId] || {};
    const axisName = function(id){ const a=mirror.axes.find(function(x){return x.id===id;}); return a?a.name:id; };
    const ord = ORDINALS[mirror.order] || arabicNum(mirror.order);

    const model = { mirrorName: mirrorDisplayName(mirror.name), mirrorOrdinal: ord };

    // ── نِسَب حضور المحاور (صورة هذه المرآة) — كما ظهرت في شاشة الترتيب، تُعرَض في كلّ الحالات ──
    if(res && Array.isArray(res.ranking) && res.ranking.length){
      const axisScoreR = {};
      res.ranking.forEach(function(item){
        if(!item || !item.axisId) return;
        if(axisScoreR[item.axisId]===undefined || item.percent > axisScoreR[item.axisId])
          axisScoreR[item.axisId] = item.percent;
      });
      const domAxisR = res.dominantAxis || (res.ranking[0] ? res.ranking[0].axisId : null);
      const rankRows = mirror.axes.map(function(a){
        return { name: a.name, percent: axisScoreR[a.id]||0, top: (a.id===domAxisR) };
      }).sort(function(x,y){ return (y.percent - x.percent) || (x.top ? -1 : 1); });
      model.ranking = { rows: rankRows, dominantName: axisName(domAxisR) };
    }

   // إشارة ضعيفة أو غياب طيف → نصّ المرآة الضعيف (كما رآه العميل)
    const hasSpectrum = res && res.spectrum && Object.keys(res.spectrum).length;
    const isWeak = res && (res.scenario === 'weak' || (res.flags && res.flags.weakSignal));
    if(isWeak || !hasSpectrum){
      model.weakText = noDash(edu.weakSignal || '');
      setHTML(`<div class="card review">${RND().mirrorReviewCard(model)}</div>`);
      wireReviewBack(); return;
    }

    // الطابع الأعلى لكلّ محورٍ من ranking (أوّل ظهورٍ = الأعلى لأنّه تنازليّ)
    const ranking = res.ranking || [];
    const topByAxis = {};
    ranking.forEach(function(row){
      if(!row || !row.axisId) return;
      if(topByAxis[row.axisId]===undefined) topByAxis[row.axisId] = row.type;
    });
    const domAxis = res.dominantAxis || (ranking[0] ? ranking[0].axisId : null);

    const blocks = [], spectra = [];
    Object.keys(res.spectrum).forEach(function(axisId){
      const ac = (edu.axes && edu.axes[axisId]) || {};
      const topType = topByAxis[axisId];
      blocks.push({
        axisName: axisName(axisId),
        axisIntro: noDash(ac.axisIntro || ''),
        afterRanking: noDash((topType && ac.doors && ac.doors[topType]) ? ac.doors[topType].afterRanking : ''),
        // التأصيل عُرِض في الحالة الواضحة فقط (مطابقةً لـ buildEducationBlocks)
        rooting: noDash((res.scenario === 'clear' && axisId===domAxis) ? (ac.rooting || '') : '')
      });
      const sp = res.spectrum[axisId];
      const text = (ac.spectrum || {})[sp.key] || '';
      spectra.push({
        axisName: axisName(axisId),
        positionLabel: POS_LABEL[sp.position] || '',
        barHTML: RND().spectrumBar(sp),
        text: noDash(text)
      });
    });
    model.blocks = blocks;
    model.spectra = spectra;

    setHTML(`<div class="card review">${RND().mirrorReviewCard(model)}</div>`);
    wireReviewBack();
  }

  function wireReviewBack(){
    const b = document.getElementById('reviewBack');
    if(b) b.addEventListener('click', renderHome);
  }

  /* ════════════════════ شاشة التقرير الذاتيّ المتكامل ════════════════════ */

  /* شاشة التقرير: تُطلق رحلة الفهم (fouad-journey) — سبع محطات مسماة،
     ثم تقرير كامل قابل للطباعة. لا أرقام طبائع ولا مصطلحات تصل للعميل. */
  function renderReport(){
    state.stage = 'report'; cache();
    let results, rep;
    try{
      results = collectResultsForReport();
      rep = REP().computeReport(results);
    }catch(e){ errorCard('تعذّر تركيب التقرير: ' + e.message); return; }
    try{
      JR().start({
        cfg: CFG(), edu: EDU(), content: JC(),
        rep: rep, results: results,
        // الاكتمال يُقاس بالسبع دائمًا، لا بالمفتوح.
        // فلو كان المفتوح مرآتين وأتمّهما، يظلّ التقرير جزئيًّا كما هو حقًّا.
        partial: !isStructurallyComplete(),
        gender: getGender(),
        posLabel: POS_LABEL,
        mirrorDisplayName: mirrorDisplayName,
        posColor: function(pos, key){ return RND().posColor(pos, key); },
        spectrumBar: function(sp){ return RND().spectrumBar(sp); },
        setHTML: setHTML,
        onExit: renderHome
      });
    }catch(e){ errorCard('تعذّر عرض التقرير: ' + e.message); }
  }

  /* (٣) بوّابة الاكتمال — شاشة النخلة المكتملة ثمّ زرّ «اعرض صورتك المتكاملة» */
  function renderReportGate(){
    state.stage = 'completion';
    const cfg = CFG();
    const order = orderedActiveMirrors();
    const results = collectResultsForReport();
    const mirrorById = {}; cfg.mirrors.forEach(function(m){ mirrorById[m.id]=m; });

    // كلّ العقد مكتملة، ملوّنة بمواقع طيفها
    const nodes = order.map(function(id){
      return {
        id: id,
        name: mirrorDisplayName(mirrorById[id] ? mirrorById[id].name : id),
        status: 'done',
        color: mirrorNodeColor(id, results)
      };
    });

    const palmSVG = RND().layersMap(nodes, { allDone: true });
    const card = RND().completionCard({ palmSVG: palmSVG, name: clientName() });
    setHTML(`<div class="card completion-card centered">${card}</div>`);

    const sb = document.getElementById('completionShow');
    if(sb) sb.addEventListener('click', renderReport);
  }

  /* ════════════════════ الاستئناف من الـcache المحلّي ════════════════════ */
  function resumeMirror(c){
    state.answers = c.answers || {};
    state.ratings = c.ratings || {};
    state.questions       = flattenIdentificationQuestions(state.mirrorId);
    state.pauseBeforeIndex = computePauseBoundaries(state.questions.length, ID_GROUPS);

   // ما زلنا في التحديد؟ استأنف من أوّل سؤالٍ لم تكتمل خياراته الثلاثة
    let firstUn = state.questions.findIndex(function(q){ return !idQuestionComplete(q); });
    if(firstUn === -1) firstUn = state.questions.length;
    if(firstUn < state.questions.length){
      state.stage='identification'; state.qIndex = firstUn;
      state.pausesShown = {};
      state.pauseBeforeIndex.forEach(b=>{ if(b < firstUn) state.pausesShown[b]=true; });
      renderIdentification(); return;
    }

    // التحديد مكتمل — احسب ثمّ حدّد موضع الطيف
    try{ computeIdentification(); }catch(e){ errorCard('تعذّر استئناف المرآة: '+e.message); return; }
    const total = state.spectrumStatements.length;
    let rated = 0, firstUnrated = total;
    for(let i=0;i<total;i++){
      const s = state.spectrumStatements[i], arr = state.ratings[s.axisId];
      if(arr && typeof arr[s.idx]==='number') rated++;
      else if(firstUnrated===total) firstUnrated = i;
    }
    if(total === 0){ goToSpectrumResult(); return; }
    if(rated === 0){ state.stage='education';  renderEducation(); return; }      // لم يبدأ الطيف بعد
    if(rated < total){ state.stage='spectrum'; state.sIndex=firstUnrated; renderSpectrum(); return; }
    goToSpectrumResult();                                                         // الطيف مكتمل
  }

  function startMirror(mirrorId){
    state.mirrorId = mirrorId;
    state.mirror   = CFG().mirrors.find(m=>m.id===mirrorId);
    // إعادة تهيئة كاملة
    state.answers={}; state.ratings={}; state.qIndex=0; state.sIndex=0; state.pausesShown={};
    state.identificationResult=null; state.scenario=null; state.dominantAxis=null;
    state.spectrumAxes=[]; state.spectrumStatements=[]; state.spectrumResults={};
    state.questions        = flattenIdentificationQuestions(mirrorId);
    state.pauseBeforeIndex = computePauseBoundaries(state.questions.length, ID_GROUPS);

    // استئناف من الـcache المحلّي إن وُجد تقدّم
    let c = null; try{ c = STORE().readMirrorCache(mirrorId); }catch(e){ c=null; }
    const hasCache = c && (
      (c.answers && Object.keys(c.answers).length) ||
      (c.ratings && Object.keys(c.ratings).length)
    );
    if(hasCache) renderResumeNotice(c); else renderIntro();
  }

  /* رسالة العودة: تُطمئن العائد وتخبره أين توقف قبل استئناف الأسئلة */
  function renderResumeNotice(c){
    const R = JC().resume;
    const m = state.mirror;
    const total = state.questions.length;
    let answered = 0;
    state.questions.forEach(function(q){
      const a = (c.answers || {})[q.id];
      if(a && typeof a === 'object' && ['أ','ب','ج'].every(function(L){ return !q.options[L] || typeof a[L] === 'number'; })) answered++;
    });
    const inSpectrum = answered >= total;
    const line = inSpectrum
      ? R.atSpectrum.replace('{mirror}', mirrorDisplayName(m.name))
      : R.atQuestion.replace('{mirror}', mirrorDisplayName(m.name))
                    .replace('{n}', arabicNum(Math.min(answered + 1, total)))
                    .replace('{t}', arabicNum(total));
    const name = clientName();
    setHTML(`
      <div class="card centered resume-card">
        <div class="section-title">${esc(R.title)}${name ? ('، ' + esc(name)) : ''}</div>
        <p class="lead">${esc(line)}</p>
        <p class="reminder">${esc(R.saved)}</p>
        <button class="btn primary" id="resumeGo">${esc(R.btn)}</button>
      </div>`);
    document.getElementById('resumeGo').addEventListener('click', function(){ resumeMirror(c); });
  }

  /* ════════════════════ الإقلاع ════════════════════ */
  async function init(){
    if(!$app()){ console.error('عنصر #app غير موجود'); return; }
    var _missing = [];
    if(!CFG())   _missing.push('FOUAD_CONFIG');
    if(!IDQ())   _missing.push('IDENTIFICATION_QUESTIONS');
    if(!SPC())   _missing.push('SPECTRUM_STATEMENTS');
    if(!EDU())   _missing.push('EDUCATIONAL_CONTENT');
    if(!ENG())   _missing.push('FOUAD_ENGINE');
    if(!BR())    _missing.push('FOUAD_BRIDGE');
    if(!STORE()) _missing.push('FOUAD_STORE');
    if(!RND())   _missing.push('FOUAD_RENDER');
    if(!JC())    _missing.push('FOUAD_JOURNEY_CONTENT');
    if(!JR())    _missing.push('FOUAD_JOURNEY');
    if(_missing.length){
      console.error('[FOUAD_APP] طبقات غائبة:', _missing.join(', '));
      errorCard('تعذّر تحميل ملفّات المقياس — الغائب: ' + _missing.join('، ')); return;
    }
    // ١) المصادقة (تحويل لصفحة الدخول إن لزم — المقياس في مجلّد فرعيّ)
    const user = STORE().requireAuth({ loginPath: '../login.html' });
    if(!user) return;                     // أُعيد التوجيه
    state.user = user;

    // ٢) تحميل الوثيقة مرّة واحدة لمعرفة أين وصل العميل
    setHTML(`<div class="card centered"><div class="spinner"></div><div class="saving">نحمّل تقدّمك…</div></div>`);
    let assessment = null;
    try{ assessment = await STORE().loadAssessment(user.id); }catch(e){ assessment=null; }
    state.assessment = assessment;        // null = عميل جديد

    // ٢-ب) إعدادات الإتاحة: الوضع العامّ من Firestore + استثناء هذا العميل.
    //      قراءة واحدة لكلّ تحميل صفحة. أيّ فشلٍ هنا يُبقي الافتراضيّ،
    //      أي كلّ المرايا مفتوحة والتقرير عند اكتمال السبع — سلوك اليوم حرفيًّا.
    try{
      const S = STORE();
      if(S && typeof S.loadReleaseSettings === 'function' && typeof S.resolveAccess === 'function'){
        const settings = await S.loadReleaseSettings();
        ACCESS = S.resolveAccess(settings, assessment);
      }
    }catch(e){
      console.warn('[FOUAD_APP] تعذّرت قراءة إعدادات الإتاحة — نعمل بالافتراضيّ:', e);
    }
    // احتياطٌ أخير: لو غابت العتبة لأيّ سبب، اجعلها اكتمال السبع
    if(typeof ACCESS.clientMinMirrors !== 'number') ACCESS.clientMinMirrors = totalStructuralMirrors();
    ACTIVE_MIRRORS = ACCESS.activeMirrors;   // null = الكلّ

    // ٣) توجيه نقطة الدخول:
    //    • يوجد تقدّم سابق (مرآة مكتملة أو تقدّم محلّيّ) → اهبط على البيت.
    //    • عميل جديد بلا تقدّم → ابدأ أوّل مرآة فعّالة مباشرةً (تدفّق نقيّ).
    const completed = getCompletedMirrors();
    const next = orderedActiveMirrors().find(id => completed.indexOf(id)===-1);
    const hasProgress = completed.length>0 || hasAnyCachedProgress();
    if(hasProgress){ renderHome(); return; }
    if(!next){ renderHome(); return; }    // (نادر) لا تالٍ ولا تقدّم
    // عميل جديد بلا تقدم: شاشة الترحيب أولًا (مرة واحدة)، ثم أول مرآة
    if(!welcomeDone()){ renderWelcome(next); return; }
    startMirror(next);
  }

  /* شاشة الترحيب: تجيب أسئلة العميل الأربعة، وتذيب معنى «المرايا»،
     وتأخذ صيغة المخاطبة المفضلة (اختياري)، قبل أول مرآة. */
  function renderWelcome(nextMirrorId){
    state.stage = 'welcome';
    const W = JC().welcome;
    const paras  = W.paras.map(function(t){ return `<p class="welcome-p">${esc(t)}</p>`; }).join('');
    const blocks = W.blocks.map(function(b){
      return `<div class="welcome-block"><span class="welcome-h">${esc(b.h)}</span> <span class="welcome-bp">${esc(b.p)}</span></div>`;
    }).join('');
    const opts = W.genderQ.options.map(function(o, i){
      return `<label class="gender-opt"><input type="radio" name="genderPick" value="${esc(o.v)}" ${o.v==='' ? 'checked' : ''}/> <span>${esc(o.t)}</span></label>`;
    }).join('');
    setHTML(`
      <div class="card welcome">
        <div class="welcome-title">${esc(W.title)}</div>
        ${paras}
        <div class="welcome-blocks">${blocks}</div>
        <div class="gender-q">
          <div class="gender-label">${esc(W.genderQ.label)}</div>
          <div class="gender-opts">${opts}</div>
        </div>
        <button class="btn primary" id="welcomeStart">${esc(W.startBtn)}</button>
      </div>`);
    document.getElementById('welcomeStart').addEventListener('click', function(){
      let v = '';
      const picked = document.querySelector('input[name="genderPick"]:checked');
      if(picked) v = picked.value || '';
      setGender(v);
      markWelcomeDone();
      startMirror(nextMirrorId);
    });
  }

  window.FOUAD_APP = { init: init };
})();
