/* ════════════════════════════════════════════════════════════════════════
   axes-session.js — التحكّم الحيّ + حضور العملاء (Reignite)
   ────────────────────────────────────────────────────────────────────────
   • وثيقة جلسة واحدة (reignite_sessions/{id}) فيها المرحلة الحالية والمؤقّت.
     الأدمن يكتبها، وصفحة العميل والعرض يسمعوها لحظيًّا.
   • حضور العملاء في subcollection (presence) — نبضة من صفحة المضيف.
   • قراءات الأدمن لنتائج المقياس من reignite_axes_results (لحظيّة).
   • يعتمد على window.db مباشرة (Firebase 8.10.1)، بـpolling لا بحدث firebaseReady.
   ════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SESSION_COLLECTION = 'reignite_sessions';
  var RESULTS_COLLECTION = 'reignite_axes_results';
  var _sessionId = 'reignite-active';
  var _readyTimeoutMs = 10000;

  function _ready() {
    return new Promise(function (resolve) {
      if (global.db) return resolve(true);
      var done = false, elapsed = 0, step = 100;
      function finish(ok){ if(done) return; done = true; resolve(!!ok); }
      document.addEventListener('firebaseReady', function(){ if(global.db) finish(true); });
      var iv = setInterval(function(){
        elapsed += step;
        if (global.db) { clearInterval(iv); finish(true); }
        else if (elapsed >= _readyTimeoutMs) { clearInterval(iv); console.error('[AXES_SESSION] انتهت مهلة انتظار Firebase'); finish(false); }
      }, step);
    });
  }

  /* ── مراحل اليوم (قابلة للتوسعة بإسكربت الاعتراف لاحقًا) ── */
  var PHASES = {
    waiting: { id:'waiting', title:'في انتظار البدء',  kind:'wait',    clientNote:'استعدّ… سنبدأ بعد قليل.' },
    welcome: { id:'welcome', title:'الافتتاح والأمان',  kind:'content', clientNote:'أنت في مكانٍ آمن. اتفاقنا الوحيد: أن تصدق مع نفسك.' },
    scale:   { id:'scale',   title:'مقياس المحاور',     kind:'scale',   clientNote:'افتح المقياس وابدأ بإيقاعك.' },
    result:  { id:'result',  title:'خريطتك',            kind:'result',  clientNote:'هذه خريطتك كما تبدو اليوم.' },
    closing: { id:'closing', title:'الإغلاق',           kind:'content', clientNote:'ما رأيته الآن طرفُ خيط — وسنكمل معًا.' }
  };
  var phaseOrder = ['waiting','welcome','scale','result','closing'];

  function setSessionId(id){ if(id) _sessionId = id; return _sessionId; }
  function _db(){ return global.db; }
  function sessionRef(){ return _db().collection(SESSION_COLLECTION).doc(_sessionId); }
  function presenceRef(){ return sessionRef().collection('presence'); }
  function resultsCol(){ return _db().collection(RESULTS_COLLECTION); }
  function _fv(){ return firebase.firestore.FieldValue; }

  async function getSession(){
    if(!(await _ready())) return null;
    var d = await sessionRef().get(); return d.exists ? d.data() : null;
  }
  async function initSession(opts){
    if(!(await _ready())) return false;
    opts = opts || {};
    await sessionRef().set({
      sessionId: _sessionId, cohort: opts.cohort || 'Reignite',
      currentPhase: 'waiting', customData: {},
      timerSeconds: 0, timerRunning: false, timerStartedAt: 0,
      status: 'active', createdAt: _fv().serverTimestamp(), updatedAt: _fv().serverTimestamp()
    }, { merge: false });
    return true;
  }
  async function ensureSession(opts){
    var s = await getSession();
    if(!s){ await initSession(opts); return await getSession(); }
    return s;
  }
  async function setPhase(phaseId, customData){
    if(!(await _ready())) return false;
    var patch = {
      currentPhase: phaseId,
      timerSeconds: 0, timerRunning: false, timerStartedAt: 0,
      updatedAt: _fv().serverTimestamp()
    };
    // لا نكتب customData إلا لو مُرِّر فعليًّا وبه مفاتيح.
    // set({customData:{}}, {merge:true}) يمسح الحقل بالكامل (اليوم/المكتبة/الحالات).
    if(customData && Object.keys(customData).length){
      patch.customData = customData;
    }
    await sessionRef().set(patch, { merge: true });
    return true;
  }
  async function startTimer(seconds){
    if(!(await _ready())) return false;
    await sessionRef().set({
      timerSeconds: seconds|0, timerStartedAt: Date.now(), timerRunning: true,
      updatedAt: _fv().serverTimestamp()
    }, { merge: true });
    return true;
  }
  async function stopTimer(){
    if(!(await _ready())) return false;
    await sessionRef().set({ timerRunning: false, updatedAt: _fv().serverTimestamp() }, { merge: true });
    return true;
  }
  function onSessionChange(cb){
    var unsub = function(){};
    _ready().then(function(ok){
      if(!ok) return;
      unsub = sessionRef().onSnapshot(function(doc){ if(doc.exists) cb(doc.data()); },
        function(e){ console.error('[AXES_SESSION] مستمع الجلسة:', e); });
    });
    return function(){ try{ unsub(); }catch(e){} };
  }

  /* ── حضور العميل (يُستدعى من صفحة المضيف) ── */
  async function registerPresence(user, info){
    if(!(await _ready()) || !user || !user.id) return false;
    info = info || {};
    await presenceRef().doc(user.id).set({
      userId: user.id, name: user.name || '—',
      status: info.status || 'online', stage: info.stage || 'waiting',
      joinedAt: _fv().serverTimestamp(), lastSeen: _fv().serverTimestamp()
    }, { merge: true });
    return true;
  }
  async function heartbeat(user, data){
    try{
      if(!global.db || !user || !user.id) return;
      await presenceRef().doc(user.id).set(Object.assign({ lastSeen: _fv().serverTimestamp() }, data || {}), { merge: true });
    }catch(e){}
  }

  /* ── قراءات الأدمن (لحظيّة) ── */
  function onClientsChange(cb){
    var unsub = function(){};
    _ready().then(function(ok){
      if(!ok) return;
      unsub = presenceRef().onSnapshot(function(snap){
        var arr=[]; snap.forEach(function(d){ arr.push(Object.assign({ id:d.id }, d.data())); }); cb(arr);
      }, function(e){ console.error('[AXES_SESSION] مستمع الحضور:', e); });
    });
    return function(){ try{ unsub(); }catch(e){} };
  }
  function onResultsChange(cb){
    var unsub = function(){};
    _ready().then(function(ok){
      if(!ok) return;
      unsub = resultsCol().onSnapshot(function(snap){
        var arr=[]; snap.forEach(function(d){ arr.push(Object.assign({ id:d.id }, d.data())); }); cb(arr);
      }, function(e){ console.error('[AXES_SESSION] مستمع النتائج:', e); });
    });
    return function(){ try{ unsub(); }catch(e){} };
  }

  async function resetSession(){
    if(!(await _ready())) return false;
    try{
      var snap = await presenceRef().get();
      var batch = _db().batch();
      snap.forEach(function(d){ batch.delete(d.ref); });
      await batch.commit();
    }catch(e){ console.warn('[AXES_SESSION] تعذّر مسح الحضور:', e); }
    await initSession();                 // النتائج لا تُحذف — محفوظة لكل عميل
    return true;
  }

/* ── حلّ معرّف الجلسة من تسكين العميل في الـ roster (للقاعة) ──
     لو الرابط فيه ?session= فهو الأولى (تجاوز يدويّ). وإلا نقرأ مجموعة العميل
     من REIGNITE_ROSTER ونضبط الجلسة تلقائيًّا. */
  async function resolveSessionFromRoster(user){
    try{
      var qs = new URLSearchParams(location.search);
      var explicit = qs.get('session');
      if(explicit){ setSessionId(explicit); return _sessionId; }      // تجاوز يدويّ له الأولوية
      if(user && user.id && global.REIGNITE_ROSTER && global.REIGNITE_ROSTER.getMySessionId){
        var sid = await global.REIGNITE_ROSTER.getMySessionId(user.id);
        if(sid) setSessionId(sid);
      }
    }catch(e){ console.warn('[AXES_SESSION] resolveSessionFromRoster:', e); }
    return _sessionId;
  }
   
  global.AXES_SESSION = {
     resolveSessionFromRoster: resolveSessionFromRoster,
    setSessionId: setSessionId, getSessionId: function(){ return _sessionId; },
    PHASES: PHASES, phaseOrder: phaseOrder,
    getSession: getSession, initSession: initSession, ensureSession: ensureSession,
    setPhase: setPhase, startTimer: startTimer, stopTimer: stopTimer, onSessionChange: onSessionChange,
    registerPresence: registerPresence, heartbeat: heartbeat,
    onClientsChange: onClientsChange, onResultsChange: onResultsChange, resetSession: resetSession,
    SESSION_COLLECTION: SESSION_COLLECTION, RESULTS_COLLECTION: RESULTS_COLLECTION
  };
  console.log('✅ AXES_SESSION جاهز — جلسة:', _sessionId);
})(window);
