/* ════════════════════════════════════════════════════════════════════════
   reignite-roster.js — طبقة تسكين المجموعات وبيانات العملاء (Reignite)
   ────────────────────────────────────────────────────────────────────────
   • collection منفصلة تمامًا: reignite_roster/{userId}
     تخزّن: cohort (رقم/اسم المجموعة) + flags تشغيليّة (إعادة تمرين... إلخ).
   • لا تلمس users/{id} إطلاقًا إلا قراءةً (إيميل/اسم/باسورد/توكن للرابط السريع).
   • تُصدَّر عبر window.REIGNITE_ROSTER.
   • يعتمد على window.db (Firebase 8.10.1 compat) — لا تهيئة هنا.

   مصدر الحقيقة الوحيد لتسكين المجموعات: لو العميل عنده cohort هنا، القاعة
   تدخّله جلسة 'reignite-<cohort>' تلقائيًّا دون رابط مخصّص.
   ════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var ROSTER_COLLECTION = 'reignite_roster';
  var COHORTS_COLLECTION= 'reignite_cohorts';
  var USERS_COLLECTION  = 'users';
  var COURSE_ID         = 'reignite';
  var READY_TIMEOUT_MS  = 10000;

  function _db(){ return global.db; }
  function _fv(){ return firebase.firestore.FieldValue; }

  function _ready(){
    return new Promise(function(resolve){
      if(global.db) return resolve(true);
      var done=false, elapsed=0, step=100;
      function finish(ok){ if(done) return; done=true; resolve(!!ok); }
      document.addEventListener('firebaseReady', function(){ if(global.db) finish(true); });
      var iv=setInterval(function(){
        elapsed+=step;
        if(global.db){ clearInterval(iv); finish(true); }
        else if(elapsed>=READY_TIMEOUT_MS){ clearInterval(iv); console.error('[ROSTER] مهلة Firebase انتهت'); finish(false); }
      }, step);
    });
  }

  function _rosterCol(){ return _db().collection(ROSTER_COLLECTION); }
  function _usersCol(){  return _db().collection(USERS_COLLECTION); }
  function _cohortsCol(){ return _db().collection(COHORTS_COLLECTION); }

  /* ── المجموعات ككيان أوّل: reignite_cohorts/{id} ── */
  function slugCohortId(s){
    s=String(s||'').trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'');
    return s;
  }
  async function listCohorts(){
    if(!(await _ready())) return [];
    var out=[];
    try{ var snap=await _cohortsCol().orderBy('createdAt','asc').get(); snap.forEach(function(d){ out.push(Object.assign({id:d.id}, d.data())); }); }
    catch(e){ try{ var s2=await _cohortsCol().get(); s2.forEach(function(d){ out.push(Object.assign({id:d.id}, d.data())); }); }catch(e2){ console.error('[ROSTER] listCohorts:', e2); } }
    return out;
  }
  function onCohortsChange(cb){
    var unsub=function(){};
    _ready().then(function(ok){ if(!ok) return;
      unsub=_cohortsCol().onSnapshot(function(snap){ var a=[]; snap.forEach(function(d){ a.push(Object.assign({id:d.id}, d.data())); }); cb(a); },
        function(e){ console.error('[ROSTER] cohorts مستمع:', e); }); });
    return function(){ try{ unsub(); }catch(e){} };
  }
  async function createCohort(name, code){
    if(!(await _ready())) return null;
    var id=slugCohortId(code) || ('g'+Date.now().toString(36).slice(-4));
    try{
      var ref=_cohortsCol().doc(id); var ex=await ref.get();
      if(ex.exists) id=id+'-'+Date.now().toString(36).slice(-3);
      await _cohortsCol().doc(id).set({
        cohortId:id, name:(name||id), courseId:COURSE_ID,
        sessionId:sessionIdForCohort(id), status:'active',
        createdAt:_fv().serverTimestamp(), updatedAt:_fv().serverTimestamp()
      });
      return id;
    }catch(e){ console.error('[ROSTER] createCohort:', e); return null; }
  }
  async function renameCohort(id, name){
    if(!(await _ready())||!id) return false;
    try{ await _cohortsCol().doc(id).set({ name:name||id, updatedAt:_fv().serverTimestamp() }, {merge:true}); return true; }catch(e){ return false; }
  }
  async function deleteCohort(id){
    if(!(await _ready())||!id) return false;
    try{
      var snap=await _rosterCol().where('cohort','==',id).get();
      var batch=_db().batch();
      snap.forEach(function(d){ batch.set(d.ref, { cohort:null, updatedAt:_fv().serverTimestamp() }, {merge:true}); });
      await batch.commit();
      await _cohortsCol().doc(id).delete();
      return true;
    }catch(e){ console.error('[ROSTER] deleteCohort:', e); return false; }
  }

  /* ── استيراد العملاء الموجودين من users → roster (بضغطة بدل الكونسول) ──
     آمن: قراءة فقط من users، ولا يكتب فوق cohort/retake موجود. */
  async function importLegacyUsers(opts){
    opts=opts||{};
    if(!(await _ready())) return { found:0, migrated:0, skipped:0, errors:0 };
    var found=0, migrated=0, skipped=0, errors=0, snap;
    try{ snap=await _usersCol().limit(opts.limit||5000).get(); }
    catch(e){ console.error('[ROSTER] import users:', e); return { found:0, migrated:0, skipped:0, errors:1 }; }
    for(var i=0;i<snap.docs.length;i++){
      var doc=snap.docs[i], u=doc.data()||{}, enr=u.enrollments||[];
      var inR=enr.some(function(e){ var t=(e.title||'').toString().toLowerCase(), c=(e.courseId||'').toString().toLowerCase(); return t.indexOf('reignite')>=0||c.indexOf('reignite')>=0; });
      if(!inR) continue; found++;
      var pass=''; try{ if(u.auth&&u.auth.tempPassword) pass=atob(u.auth.tempPassword); }catch(e){ pass=''; }
      var rec={ userId:doc.id, courseId:COURSE_ID,
        name:(u.personalInfo&&u.personalInfo.name)||'—', email:(u.personalInfo&&u.personalInfo.email)||'',
        whatsapp:(u.personalInfo&&u.personalInfo.whatsapp)||'', password:pass,
        token:(u.auth&&u.auth.telegramAutoLoginToken)||null, status:(u.accountStatus&&u.accountStatus.status)||'active',
        source:'imported', updatedAt:_fv().serverTimestamp() };
      try{
        var ex=await _rosterCol().doc(doc.id).get();
        if(!ex.exists){ rec.cohort=null; rec.retakeAxes=false; rec.createdAt=_fv().serverTimestamp(); await _rosterCol().doc(doc.id).set(rec); migrated++; }
        else { delete rec.cohort; await _rosterCol().doc(doc.id).set(rec, {merge:true}); skipped++; }
      }catch(e){ console.warn('[ROSTER] import', doc.id, e); errors++; }
    }
    return { found:found, migrated:migrated, skipped:skipped, errors:errors };
  }

  /* ── معرّف الجلسة من رقم/اسم المجموعة ──
     cohort 'g2' → 'reignite-g2' ، فاضي/null → 'reignite-active' (الافتراضيّة) */
  function sessionIdForCohort(cohort){
    if(!cohort) return 'reignite-active';
    var c = String(cohort).trim();
    if(!c) return 'reignite-active';
    return c.indexOf('reignite-')===0 ? c : ('reignite-'+c);
  }

  /* ── قراءة تسكين عميل واحد (للقاعة) ── */
  async function getMyRoster(userId){
    if(!(await _ready()) || !userId) return null;
    try{
      var d = await _rosterCol().doc(userId).get();
      return d.exists ? d.data() : null;
    }catch(e){ console.warn('[ROSTER] getMyRoster:', e); return null; }
  }

  /* ── معرّف جلسة العميل من تسكينه (للقاعة، يُستدعى مباشرة) ── */
  async function getMySessionId(userId){
    var r = await getMyRoster(userId);
    return sessionIdForCohort(r && r.cohort);
  }

  /* ── تسكين/تعديل مجموعة عميل (للأدمن) ── */
  async function setCohort(userId, cohort, extra){
    if(!(await _ready()) || !userId) return false;
    try{
      var payload = Object.assign({
        userId: userId,
        cohort: cohort || null,
        courseId: COURSE_ID,
        updatedAt: _fv().serverTimestamp()
      }, extra || {});
      var snap = await _rosterCol().doc(userId).get();
      if(!snap.exists) payload.createdAt = _fv().serverTimestamp();
      await _rosterCol().doc(userId).set(payload, { merge:true });
      return true;
    }catch(e){ console.error('[ROSTER] setCohort:', e); return false; }
  }

  /* ── تسجيل/تحديث عميل في السجلّ (يُستدعى من صفحة التسجيل وقت الإنشاء) ──
     يكتب لقطةً خفيفةً للأدمن: اسم/إيميل/باسورد/توكن/واتساب. لا يلمس users. */
  async function enroll(userId, info){
    if(!(await _ready()) || !userId) return false;
    info = info || {};
    try{
      var snap = await _rosterCol().doc(userId).get();
      var payload = {
        userId: userId, courseId: COURSE_ID,
        name: info.name || '—', email: info.email || '',
        whatsapp: info.whatsapp || '', password: info.password || '',
        token: info.token || null, status: info.status || 'active',
        updatedAt: _fv().serverTimestamp()
      };
      if(!snap.exists){
        payload.cohort = null;            // الأدمن يسكّنه لاحقًا
        payload.retakeAxes = false;
        payload.createdAt = _fv().serverTimestamp();
        payload.source = info.source || 'self-signup';
      }
      await _rosterCol().doc(userId).set(payload, { merge:true });
      return true;
    }catch(e){ console.error('[ROSTER] enroll:', e); return false; }
  }

  /* ── علم إعادة تمرين المحاور لعميل (للأدمن) ── */
  async function setRetakeAxes(userId, allow){
    if(!(await _ready()) || !userId) return false;
    try{
      await _rosterCol().doc(userId).set({
        userId: userId, retakeAxes: !!allow, retakeAxesAt: _fv().serverTimestamp(),
        updatedAt: _fv().serverTimestamp()
      }, { merge:true });
      return true;
    }catch(e){ console.error('[ROSTER] setRetakeAxes:', e); return false; }
  }

  /* ── استماع لحظيّ لكل التسكينات (للأدمن) ── */
  function onRosterChange(cb){
    var unsub=function(){};
    _ready().then(function(ok){
      if(!ok) return;
      unsub = _rosterCol().onSnapshot(function(snap){
        var arr=[]; snap.forEach(function(d){ arr.push(Object.assign({ id:d.id }, d.data())); }); cb(arr);
      }, function(e){ console.error('[ROSTER] مستمع:', e); });
    });
    return function(){ try{ unsub(); }catch(e){} };
  }

  /* ── قراءة عملاء reignite (للأدمن) — من السجلّ مباشرةً، سريع ونظيف ──
     مصدر الحقيقة هو reignite_roster: كل من سجّل (جديدًا أو مهاجَرًا) موجود هنا.
     لا تمشيط لـ users إطلاقًا. الباسورد والتوكن لُقطا وقت التسجيل. */
  async function loadReigniteUsers(opts){
    opts = opts || {};
    if(!(await _ready())) return [];
    var out = [];
    try{
      var snap = await _rosterCol().limit(opts.limit||2000).get();
      snap.forEach(function(doc){
        var r = doc.data() || {};
        out.push({
          id: doc.id,
          name: r.name || '—',
          email: r.email || '',
          whatsapp: r.whatsapp || '',
          password: r.password || '',
          token: r.token || null,
          status: r.status || 'active',
          cohort: r.cohort || null,
          retakeAxes: !!r.retakeAxes
        });
      });
    }catch(e){ console.error('[ROSTER] loadReigniteUsers:', e); }
    return out;
  }

  /* ── بناء الرابط السريع للعميل (نفس صياغة login.html: uid+token) ── */
  function quickLoginUrl(user, basePath){
    if(!user || !user.id) return '';
    var base = basePath || (location.origin + location.pathname.replace(/[^/]*$/,''));
    var url = base + 'login.html?uid=' + encodeURIComponent(user.id);
    if(user.token) url += '&token=' + encodeURIComponent(user.token);
    return url;
  }

  /* ── رابط واتساب جاهز برسالة ترحيب + رابط الدخول ── */
  function whatsappLink(user, quickUrl){
    var num = (user.whatsapp||'').toString().replace(/[^0-9]/g,'');
    var msg = 'أهلًا ' + (user.name||'') + ' 🌟\n'
            + 'ده رابط دخولك السريع لرحلة Reignite:\n' + (quickUrl||'')
            + '\nاحتفظ بيه — بيدخّلك على طول من غير باسورد.';
    var base = num ? ('https://wa.me/'+num) : 'https://wa.me/';
    return base + '?text=' + encodeURIComponent(msg);
  }

global.REIGNITE_ROSTER = {
    sessionIdForCohort: sessionIdForCohort,
    getMyRoster: getMyRoster,
    getMySessionId: getMySessionId,
    enroll: enroll,
    setCohort: setCohort,
    setRetakeAxes: setRetakeAxes,
    onRosterChange: onRosterChange,
    loadReigniteUsers: loadReigniteUsers,
    quickLoginUrl: quickLoginUrl,
    whatsappLink: whatsappLink,
    listCohorts: listCohorts,
    onCohortsChange: onCohortsChange,
    createCohort: createCohort,
    renameCohort: renameCohort,
    deleteCohort: deleteCohort,
    slugCohortId: slugCohortId,
    importLegacyUsers: importLegacyUsers,
    ROSTER_COLLECTION: ROSTER_COLLECTION,
    COHORTS_COLLECTION: COHORTS_COLLECTION,
    COURSE_ID: COURSE_ID
  };
  console.log('✅ REIGNITE_ROSTER جاهز — مجموعة:', ROSTER_COLLECTION);
})(window);
