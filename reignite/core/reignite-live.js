/* ════════════════════════════════════════════════════════════════════════
   reignite-live.js — إجابات الأجزاء التفاعليّة (تصويت/كلمة/كروت)
   ────────────────────────────────────────────────────────────────────────
   • تُخزَّن في reignite_sessions/{id}/live_responses/{userId}
   • merge على answers يحفظ كل مرحلة دون أن يمسح غيرها.
   • الأدمن/العرض يستمعان للتجميع — بلا أسماء على الإجابات (سرّية).
   ════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function _db(){ return global.db; }
  function _fv(){ return firebase.firestore.FieldValue; }
  function _sid(){ return (global.AXES_SESSION && global.AXES_SESSION.getSessionId) ? global.AXES_SESSION.getSessionId() : 'reignite-active'; }
  function _col(){ return _db().collection(global.AXES_SESSION.SESSION_COLLECTION).doc(_sid()).collection('live_responses'); }

  function _ready(){
    return new Promise(function(resolve){
      if(global.db) return resolve(true);
      var t=0, iv=setInterval(function(){ t+=120; if(global.db){clearInterval(iv);resolve(true);} else if(t>=10000){clearInterval(iv);resolve(false);} },120);
    });
  }

  /* حفظ إجابة مرحلة واحدة (data كائن صغير) */
  async function saveResponse(user, phaseId, data){
    if(!(await _ready()) || !user || !user.id || !phaseId) return false;
    var patch = { userId:user.id, name:user.name||'—', updatedAt:_fv().serverTimestamp(), answers:{} };
    patch.answers[phaseId] = data || {};
    try{ await _col().doc(user.id).set(patch, { merge:true }); return true; }
    catch(e){ console.warn('[REIGNITE_LIVE] حفظ:', e); return false; }
  }

  /* تحميل إجابات العميل (للاستئناف على نفس الجهاز/جهاز آخر) */
  async function getMyResponses(userId){
    if(!(await _ready()) || !userId) return {};
    try{ var d = await _col().doc(userId).get(); return (d.exists && d.data().answers) ? d.data().answers : {}; }
    catch(e){ return {}; }
  }

  /* استماع لحظيّ لكل الإجابات (أدمن/عرض) — يرجّع مصفوفة { id, answers } */
  function onResponsesChange(cb){
    var unsub=function(){};
    _ready().then(function(ok){
      if(!ok) return;
      unsub = _col().onSnapshot(function(snap){
        var arr=[]; snap.forEach(function(d){ var v=d.data()||{}; arr.push({ id:d.id, answers:v.answers||{} }); }); cb(arr);
      }, function(e){ console.error('[REIGNITE_LIVE] مستمع:', e); });
    });
    return function(){ try{ unsub(); }catch(e){} };
  }

  /* تجميع تصويت مرحلة معيّنة: phaseId + قائمة معرّفات الخيارات */
  function tallyPoll(responses, phaseId, optionIds, valueKey){
    valueKey = valueKey || 'choice';
    var counts={}, total=0;
    (optionIds||[]).forEach(function(o){ counts[o]=0; });
    (responses||[]).forEach(function(r){
      var a = r.answers && r.answers[phaseId];
      if(a && a[valueKey]!=null && counts.hasOwnProperty(a[valueKey])){ counts[a[valueKey]]++; total++; }
    });
    return { counts:counts, total:total };
  }

  /* تجميع كلمات مرحلة (pattern) — يرجّع قائمة كلمات بلا أسماء */
  function collectWords(responses, phaseId, key){
    key = key || 'word';
    var words=[];
    (responses||[]).forEach(function(r){
      var a = r.answers && r.answers[phaseId];
      if(a && a[key]) words.push(String(a[key]));
    });
    return words;
  }

  /* عدّ من فتح/تفاعل في مرحلة (مثل الكروت) */
  function countTouched(responses, phaseId){
    var n=0;
    (responses||[]).forEach(function(r){ if(r.answers && r.answers[phaseId]) n++; });
    return n;
  }

  global.REIGNITE_LIVE = {
    saveResponse: saveResponse, getMyResponses: getMyResponses,
    onResponsesChange: onResponsesChange,
    tallyPoll: tallyPoll, collectWords: collectWords, countTouched: countTouched
  };
  console.log('✅ REIGNITE_LIVE جاهز');
})(window);
