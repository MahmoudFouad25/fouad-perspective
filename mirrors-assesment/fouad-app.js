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

  // ── الإطلاق المرحليّ: عدّل هذه المصفوفة فقط لفتح بقيّة المرايا لاحقًا ──
 // const ACTIVE_MIRRORS = ['mirror1'];
const ACTIVE_MIRRORS = ['mirror1','mirror2','mirror3','mirror4','mirror5','mirror6','mirror7'];
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
    return (p && p.length) ? p : null;
  }
  // محرّك التقرير الذاتيّ (report-engine.js) — يُحمَّل بعد mirrors-config.js
  function REP(){ return (typeof FOUAD_REPORT_ENGINE !== 'undefined') ? FOUAD_REPORT_ENGINE : window.FOUAD_REPORT_ENGINE; }

  // ── أدوات صغيرة ──
  const ORDINALS = {1:'الأولى',2:'الثانية',3:'الثالثة',4:'الرابعة',5:'الخامسة',6:'السادسة',7:'السابعة'};
  function arabicNum(n){ const m=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩']; return String(n).replace(/\d/g,d=>m[+d]); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── النصوص الثابتة الوحيدة في التقرير: نبرة «مرآة لا محكمة» (لا أرقام) ──
  const REPORT_TEXT = {
    openingTitle: 'قبل أن تقرأ',
    opening: `قبل أيّ كلمةٍ تقرؤها هنا، نضع شيئًا في موضعه: قيمتك ثابتةٌ قبل هذا التقرير وبعده، لا يرفعها سطرٌ فيه ولا يخفضها. ما بين يديك مرآةٌ لا محكمة — تعيد عليك ما رأيته في رحلتك عبر المرايا، مرتّبًا في صورةٍ واحدة، لا لتحكم عليك بل لتراك. وما من نتيجةٍ هنا تُعرِّفك تعريفًا نهائيًّا؛ هي قراءةٌ لِلَحظتك التي أجبتَ فيها، تتحرّك معك حين تتحرّك. اقرأها بالهدوء الذي تُقرأ به مرآة: تنظر، وتتأمّل، ثمّ تمضي.`,
    closingTitle: 'بعد أن قرأت',
    closing: `ما قرأته صورةٌ لِما هو حاضرٌ فيك الآن، لا حكمًا على ما ستكونه. المواضع التي بدت متّزنةً نعمةٌ تُشكَر، والتي بدت مائلةً ليست عيبًا تُدان عليه، هي أبوابٌ تعرف الآن أين تقف منها. وأصدق ما يُفعَل بمرآةٍ كهذه أن تُترَك تعمل بهدوء: تعود إليها حين تنضج، أو تأخذ ما استوقفك منها إلى جلسةٍ هادئةٍ مع مَن يُحسن أن يصغي ويسأل. قيمتك — كما بدأنا — ثابتةٌ، والطريق مفتوح.`,
    partialNote: `هذه صورةٌ جزئيّةٌ بُنيت على ما أتممتَه من المرايا حتى الآن؛ تكتمل حين تكتمل بقيّتها.`
  };

  // أسماء عرض مواقع الطيف (بالهويّة، لا حسم لأيّ تعادل)
  const POS_LABEL = { balance:'اتزان', excess:'إفراط', deficit:'تفريط', ambiguous:'التباس' };

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
  function orderedActiveMirrors(){
    return CFG().mirrors.filter(m => ACTIVE_MIRRORS.indexOf(m.id)!==-1).map(m=>m.id);
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

  // هل اكتملت كل المرايا الفعّالة؟ (لتقرير كليّ، لا جزئيّ)
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
        <div class="mirror-tag">المرآة ${ord} — ${esc(m.name)}</div>
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
        <div class="reminder">قيّم كلّ وصفٍ بمقدار ما يشبهك فعلًا — لا تختر واحدًا، فقد تشبهك أكثر من زاوية.</div>
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
    const pauses = PAUSES();
    const p = pauses[Object.keys(state.pausesShown).length % pauses.length]; // تناوب
    setHTML(`
      <div class="card pause">
        <div class="pause-verse">${esc(p.verse)}</div>
        <div class="pause-note">${esc(p.note)}</div>
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
        <p class="lead">يميل سلوكك في هذه المرآة إلى محورٍ أظهر من غيره. هذه نسبة حضور كلّ محورٍ في إجاباتك:</p>
        <div class="ranking">${rows}</div>
        <div class="dominant">المحور الأظهر: <strong>${esc(axisName(state.dominantAxis))}</strong></div>
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
    const title = (sc==='weak') ? 'إشارة هذه المرآة'
                : (sc==='dual') ? 'بابان متقاربان' : 'باب المحور الأظهر';

    let inner = '';
    blocks.forEach(b=>{
      if(b.type==='weak'){ inner += `<div class="edu-block weak"><p>${esc(b.text)}</p></div>`; }
      else {
        inner += `<div class="edu-block door">`;
        inner += `<div class="edu-axis-name">${esc(axisName(b.axisId))}</div>`;
        if(b.axisIntro)    inner += `<p class="edu-intro">${esc(b.axisIntro)}</p>`;
        if(b.afterRanking) inner += `<p class="edu-after">${esc(b.afterRanking)}</p>`;
        if(b.rooting)      inner += `<div class="edu-rooting"><div class="edu-rooting-tag">في الأصل</div><p>${esc(b.rooting)}</p></div>`;
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
        <div class="section-title">تعميق القراءة</div>
        <p class="lead">عرفتَ المحور الأظهر. الآن نتعمّق فيه قليلًا.</p>
        <p class="edu-intro">ستقرأ ${arabicNum(count)} عباراتٍ تخصّ ${esc(namesText)}، وتقيّم كلّ عبارةٍ على مقياسٍ من ١ إلى ٧ بحسب ما تراه أقرب إلى حقيقتك — لا إلى ما تتمنّاه.</p>
        <p class="reminder">قيّم على سجيّتك. لا توجد إجابة صحيحة، والقراءة تكتمل بعد أن تنتهي.</p>
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
          <div class="sr-axis" style="color:${color}">${esc(axisName(ax))} — ${esc(sr.result.positionLabel||'')}</div>
          ${bar}
          <p class="sr-text">${esc(sr.text)}</p>
        </div>`;
    });
    setHTML(`
      <div class="card">
        <div class="section-title">قراءة الطيف</div>
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
        <div class="home-actions"><button class="btn primary" id="backHome">رجوع للبيت</button></div>
      </div>`);

    if(!saved){ const rb=document.getElementById('retrySave'); if(rb) rb.addEventListener('click', finishMirror); }
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
        name: (mirrorById[id] ? mirrorById[id].name : id),
        status: status,
        color: (status==='done') ? mirrorNodeColor(id, results) : null
      };
    });

    const doneCount = order.filter(function(id){ return completed.indexOf(id)!==-1; }).length;
    const totalCount = order.length;
    const progressPct = totalCount ? Math.round((doneCount/totalCount)*100) : 0;

    const palmSVG = RND().palmTree(nodes, { allDone: allDone });
    const card = RND().homeCard({
      name: clientName(), palmSVG: palmSVG,
      doneCount: doneCount, totalCount: totalCount, progressPct: progressPct,
      hasNext: !!next, allDone: allDone
    });
    setHTML(`<div class="card home">${card}</div>`);

    // «تابِع» → المرآة التالية غير المكتملة (تستأنف الجاريّة إن وُجد تقدّم)
    const cont = document.getElementById('homeContinue');
    if(cont) cont.addEventListener('click', function(){
      const nx = orderedActiveMirrors().find(function(id){ return getCompletedMirrors().indexOf(id)===-1; });
      if(nx) startMirror(nx);
    });
    // «صورتك المتكاملة» → بوّابة الاكتمال (شاشة النخلة) ثمّ التقرير
    const rep = document.getElementById('homeReport');
    if(rep) rep.addEventListener('click', function(){ if(REP()) renderReportGate(); else renderReport(); });

    // نقر عقدةٍ تمّت → مراجعة تلك المرآة (لا قفز داخل مرآةٍ جاريّة)
    Array.prototype.forEach.call(document.querySelectorAll('.palm-hit'), function(hit){
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

    const model = { mirrorName: mirror.name, mirrorOrdinal: ord };

   // إشارة ضعيفة أو غياب طيف → نصّ المرآة الضعيف (كما رآه العميل)
    const hasSpectrum = res && res.spectrum && Object.keys(res.spectrum).length;
    const isWeak = res && (res.scenario === 'weak' || (res.flags && res.flags.weakSignal));
    if(isWeak || !hasSpectrum){
      model.weakText = edu.weakSignal || '';
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
        axisIntro: ac.axisIntro || '',
        afterRanking: (topType && ac.doors && ac.doors[topType]) ? ac.doors[topType].afterRanking : '',
        // التأصيل عُرِض في الحالة الواضحة فقط (مطابقةً لـ buildEducationBlocks)
        rooting: (res.scenario === 'clear' && axisId===domAxis) ? (ac.rooting || '') : ''
      });
      const sp = res.spectrum[axisId];
      const text = (ac.spectrum || {})[sp.key] || '';
      spectra.push({
        axisName: axisName(axisId),
        positionLabel: sp.positionLabel || '',
        barHTML: RND().spectrumBar(sp),
        text: text
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

  // اسم عرض النمط (الطبائع بلا أسماء في config → «النمط الأوّل/الثاني» أو رقم الطابع)
  function typeDisplay(typeId, ordinalIdx){
    const n = String(typeId||'').replace(/\D/g,'');           // "type1" → "1"
    const ord = { 1:'الأوّل', 2:'الثاني', 3:'الثالث' }[ordinalIdx] || '';
    return ord ? ('النمط ' + ord + (n ? (' (الطابع ' + arabicNum(n) + ')') : ''))
               : (n ? ('الطابع ' + arabicNum(n)) : '—');
  }

  function reportSpectrumColor(key, position){
    if(key === 'balance' || position === 'balance') return COLOR.green;
    if((key||'').indexOf('excess')===0  || position==='excess')  return COLOR.gold;
    if((key||'').indexOf('deficit')===0 || position==='deficit') return COLOR.blue;
    return COLOR.purple; // ambiguous + suspicious_balance
  }

  // يبني شاشة التقرير من التجميع + مخرجات المحرّك (تجميع لا توليد)
  function renderReport(){
    state.stage = 'report'; cache();
    const cfg = CFG();

    // ١) اجمع النتائج ومرّرها للمحرّك
    let results, rep;
    try{
      results = collectResultsForReport();
      rep = REP().computeReport(results);
    }catch(e){ errorCard('تعذّر تركيب التقرير: ' + e.message); return; }

    // خلايا خريطة التحرّك البصريّة (محور كلّ مرآة الأظهر بموقعه ولونه) — عرض صرف
    const mmCells = orderedActiveMirrors().map(function(id){
      const mm = cfg.mirrors.find(function(x){ return x.id===id; });
      const r2 = results[id];
      const nm = mm ? mm.name : id;
      if(!r2 || !r2.spectrum){ return { name: nm, present: false }; }
      const domAxis = r2.dominantAxis || (r2.ranking && r2.ranking[0] ? r2.ranking[0].axisId : null);
      let sp = domAxis ? r2.spectrum[domAxis] : null;
      if(!sp){ const ks = Object.keys(r2.spectrum); if(ks.length) sp = r2.spectrum[ks[0]]; }
      if(!sp){ return { name: nm, present: false }; }
      return {
        name: nm, present: true,
        position: sp.position,
        color: RND().posColor(sp.position, sp.key),
        ambiguous: (sp.ambiguous===true || sp.position==='ambiguous'),
        suspicious: (sp.suspiciousBalance===true)
      };
    });

    const partial = !allActiveMirrorsComplete();
    const axisInfo = function(axisId){
      for(let i=0;i<cfg.mirrors.length;i++){
        const ax = cfg.mirrors[i].axes.find(function(a){ return a.id===axisId; });
        if(ax) return { axisName: ax.name, mirrorName: cfg.mirrors[i].name };
      }
      return { axisName: axisId, mirrorName: '' };
    };

    let html = '';

    // ── (١) افتتاحيّة الأرض ──
    html += `<div class="report-section report-ground">
               <div class="report-ground-title">${esc(REPORT_TEXT.openingTitle)}</div>
               <p>${esc(REPORT_TEXT.opening)}</p>
               ${partial ? `<p class="report-partial">${esc(REPORT_TEXT.partialNote)}</p>` : ''}
             </div>`;

    // ── (٢) النمط الإجماليّ (typesPattern.dominant، مع رصد التعادل) ──
    const tp = rep.typesPattern;
    let typesBody = '';
    if(tp.tie && tp.dominant.length > 1){
      const names = tp.dominant.map(function(t,i){ return typeDisplay(t, i+1); });
      typesBody = `<p class="report-p">ظهر أكثر من نمطٍ بقوّةٍ متقاربة، فلا نحسم لك نمطًا واحدًا — ظهر معك: ${esc(names.join('، و'))}. هذا تعدّدٌ نعرضه كما هو، لا تردّدٌ يُصحَّح.</p>`;
    } else if(tp.dominant.length === 1){
      typesBody = `<p class="report-p">النمط الأبرز عبر مراياك: <strong style="color:var(--gold)">${esc(typeDisplay(tp.dominant[0], 1))}</strong>. ظهر متصدّرًا في أكثر من مرآة، فكان أقوى ما تكرّر في حركتك.</p>`;
    } else {
      typesBody = `<p class="report-p">لم يتقدّم نمطٌ واحدٌ تقدّمًا بيّنًا في هذه الصورة.</p>`;
    }
    html += `<div class="report-section">
               <div class="report-h">النمط الإجماليّ</div>
               ${typesBody}
             </div>`;

    // ── (٣) صورة كل مرآة (إعادة عرض القراءة التي رآها العميل حرفيًّا) ──
    let mirrorsHtml = '';
    cfg.mirrors.forEach(function(m){
      const res = results[m.id];
      if(!res || !res.spectrum) return;                          // مرآة غير مكتملة → تُتخطّى
      const domAxis = res.dominantAxis || (res.ranking && res.ranking[0] ? res.ranking[0].axisId : null);

      let axesHtml = '';
      // نعرض محاور الطيف الفعليّة لهذه المرآة (قد تكون محورًا أو محورين في dual)
      Object.keys(res.spectrum).forEach(function(axisId){
        const sp = res.spectrum[axisId];
        if(!sp) return;
        const key = sp.key;
        const text = ((EDU()[m.id] && EDU()[m.id].axes[axisId] && EDU()[m.id].axes[axisId].spectrum) || {})[key] || '';
        const info = axisInfo(axisId);
        const color = reportSpectrumColor(key, sp.position);
        const isDom = (axisId === domAxis);
        axesHtml += `<div class="report-axis" style="border-inline-start-color:${color}">
                       <div class="report-axis-name" style="color:${color}">
                         ${esc(info.axisName)}${isDom ? ' <span class="report-dom-tag">المحور الأظهر</span>' : ''}
                         ${sp.positionLabel ? ` — ${esc(sp.positionLabel)}` : ''}
                       </div>
                       <p class="report-axis-text">${esc(text)}</p>
                     </div>`;
      });

      mirrorsHtml += `<div class="report-mirror">
                        <div class="report-mirror-name">المرآة ${esc(m.name)}</div>
                        ${axesHtml}
                      </div>`;
    });
    html += `<div class="report-section">
               <div class="report-h">صورتك في كلّ مرآة</div>
               ${mirrorsHtml || '<p class="report-p">لا قراءات طيفٍ متاحة بعد.</p>'}
             </div>`;

    // ── (٤) خريطة التحرّك (تمثيلٌ بصريّ أوّلًا، ثمّ الأرقام النصّيّة كملحق) ──
    const sm = rep.spectrumMap, c = sm.counts;
    const fmtList = function(arr){
      return (arr||[]).map(function(e){ const i = axisInfo(e.axisId); return esc(i.mirrorName + ' · ' + i.axisName); }).join('، ');
    };
    let mapBody = `<p class="report-p">عبر المرايا المكتملة: 
        <span style="color:var(--green)">اتزان ${arabicNum(c.balance)}</span>،
        <span style="color:var(--gold)">إفراط ${arabicNum(c.excess)}</span>،
        <span style="color:var(--blue)">تفريط ${arabicNum(c.deficit)}</span>،
        <span style="color:var(--purple)">التباس ${arabicNum(c.ambiguous)}</span>.</p>`;
    if(c.balance)  mapBody += `<p class="report-map-line"><span style="color:var(--green)">اتزان:</span> ${fmtList(sm.byPosition.balance)}</p>`;
    if(c.excess)   mapBody += `<p class="report-map-line"><span style="color:var(--gold)">إفراط:</span> ${fmtList(sm.byPosition.excess)}</p>`;
    if(c.deficit)  mapBody += `<p class="report-map-line"><span style="color:var(--blue)">تفريط:</span> ${fmtList(sm.byPosition.deficit)}</p>`;
    if(c.ambiguous)mapBody += `<p class="report-map-line"><span style="color:var(--purple)">التباس:</span> ${fmtList(sm.byPosition.ambiguous)}</p>`;
    // الميل العامّ — لا حسم عند التعادل
    if(sm.lean){
      mapBody += `<p class="report-p">الميل العامّ في هذه الصورة إلى <strong>${esc(POS_LABEL[sm.lean]||sm.lean)}</strong>.</p>`;
    } else if(sm.leanTie && sm.leanCandidates && sm.leanCandidates.length){
      const cands = sm.leanCandidates.map(function(p){ return POS_LABEL[p]||p; });
      mapBody += `<p class="report-p">لم يترجّح ميلٌ عامٌّ واحد — تقاربت: ${esc(cands.join('، و'))}، فنعرضها كما هي دون حسم.</p>`;
    }
    html += `<div class="report-section">
               <div class="report-h">خريطة تحرّكك</div>
               ${RND().movementMap({ cells: mmCells })}
               <div class="movemap-appendix">${mapBody}</div>
             </div>`;

    // ── (٥) مواضع تُفرَز لاحقًا (flags.items، بنبرة دعوة لا حكم) ──
    if(rep.flags && rep.flags.items && rep.flags.items.length){
      let flagsHtml = '';
      rep.flags.items.forEach(function(f){
        const info = axisInfo(f.axisId);
        const note = f.suspiciousBalance ? 'اتزانٌ يستحقّ نظرةً أعمق' : 'موضعٌ لم يستقرّ بعد';
        flagsHtml += `<div class="report-flag">
                        <span class="report-flag-axis">${esc(info.mirrorName + ' · ' + info.axisName)}</span>
                        <span class="report-flag-note">${esc(note)}</span>
                      </div>`;
      });
      html += `<div class="report-section report-flags">
                 <div class="report-h">مواضع تستحقّ وقفةً أعمق</div>
                 <p class="report-p">هذه مواضع لم تُحسَم في الأرقام وحدها — نعرضها دعوةً إلى تأمّلٍ أصدق، أو إلى جلسةٍ هادئة، لا حكمًا عليك:</p>
                 ${flagsHtml}
               </div>`;
    }

    // ── (٦) خاتمة الأرض ──
    html += `<div class="report-section report-ground">
               <div class="report-ground-title">${esc(REPORT_TEXT.closingTitle)}</div>
               <p>${esc(REPORT_TEXT.closing)}</p>
             </div>`;

    // أزرار: طباعة + رجوع للبيت
    html += `<div class="report-actions">
               <button class="btn ghost" id="printReport">احفظ نسخةً (طباعة)</button>
               <button class="btn ghost" id="backFromReport">رجوع للبيت</button>
             </div>`;

    setHTML(`<div class="card report">${html}</div>`);

    const pb = document.getElementById('printReport');
    if(pb) pb.addEventListener('click', function(){ window.print(); });
    const bb = document.getElementById('backFromReport');
    if(bb) bb.addEventListener('click', renderHome);
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
        name: (mirrorById[id] ? mirrorById[id].name : id),
        status: 'done',
        color: mirrorNodeColor(id, results)
      };
    });

    const palmSVG = RND().palmTree(nodes, { allDone: true });
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
    if(hasCache) resumeMirror(c); else renderIntro();
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

    // ٣) توجيه نقطة الدخول:
    //    • يوجد تقدّم سابق (مرآة مكتملة أو تقدّم محلّيّ) → اهبط على البيت.
    //    • عميل جديد بلا تقدّم → ابدأ أوّل مرآة فعّالة مباشرةً (تدفّق نقيّ).
    const completed = getCompletedMirrors();
    const next = orderedActiveMirrors().find(id => completed.indexOf(id)===-1);
    const hasProgress = completed.length>0 || hasAnyCachedProgress();
    if(hasProgress){ renderHome(); return; }
    if(!next){ renderHome(); return; }    // (نادر) لا تالٍ ولا تقدّم
    startMirror(next);
  }

  window.FOUAD_APP = { init: init };
})();
