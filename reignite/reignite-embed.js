/* ═══════════════════════════════════════════════════════════════
   REIGNITE_EMBED — جسر التوصيل بين صفحات Reignite
   ومنصّة الدورات (course-view.html)
   يتكلّم بروتوكول postMessage الخاص بنظام external-exercise
   ═══════════════════════════════════════════════════════════════ */
(function(){
  "use strict";

  var params = new URLSearchParams(window.location.search);

  var ctx = {
    exerciseId: params.get('exerciseId') || null,
    userId:     params.get('userId')     || null,
    courseId:   params.get('courseId')   || null
  };

  /* الصفحة تعتبر "مضمّنة" لو مفتوحة جوّه iframe ومعاها exerciseId */
  var embedded = (function(){
    try { return window.parent && window.parent !== window && !!ctx.exerciseId; }
    catch(e){ return false; }
  })();

  /* وضع مستقلّ: لو الصفحة مفتوحة لوحدها ناخد المستخدم من AXES_STORE */
  if(!ctx.userId){
    try{
      var u = (window.AXES_STORE && window.AXES_STORE.getCurrentUser)
                ? window.AXES_STORE.getCurrentUser() : null;
      if(u && u.id) ctx.userId = u.id;
    }catch(e){}
  }


   /* في الوضع المضمّن: نزرع هويّة المستخدم القادمة من المنصّة في localStorage
     حتى تجدها getCurrentUser في AXES_STORE — قبل أن يعمل أيّ سكريبت آخر */
  if (embedded && ctx.userId) {
    try {
      var existingUid = localStorage.getItem('userId');
      if (existingUid !== ctx.userId) {
        localStorage.setItem('userId', ctx.userId);
      }
    } catch(e){}
  }

   
  var savedDataCallbacks = [];
  var summaryCallbacks   = [];

  function post(type, data){
    if(!embedded) return false;
    try{
      window.parent.postMessage({ type: type, data: data }, '*');
      return true;
    }catch(e){ return false; }
  }

  function basePayload(extra){
    var p = {
      exerciseId: ctx.exerciseId,
      userId:     ctx.userId,
      courseId:   ctx.courseId
    };
    if(extra){ for(var k in extra){ p[k] = extra[k]; } }
    return p;
  }

  /* استقبال ردود المنصّة */
  window.addEventListener('message', function(ev){
    var m = ev.data || {};
    if(m.type === 'load-saved-data'){
      savedDataCallbacks.forEach(function(cb){ try{ cb(m.data || null); }catch(e){} });
    } else if(m.type === 'show-points-summary'){
      summaryCallbacks.forEach(function(cb){ try{ cb(m.data || null); }catch(e){} });
    }
  });

  window.REIGNITE_EMBED = {
    ctx: ctx,

    isEmbedded: function(){ return embedded; },

    /* إكمال نهائيّ — المنصّة تحفظ وتضيف نقاط الركائز وتعلّم الدرس مكتملًا */
    complete: function(answers, customData){
      return post('exercise-completed', basePayload({
        answers:     answers    || {},
        customData:  customData || {},
        completedAt: new Date().toISOString()
      }));
    },

    /* حفظ مسودة قبل الإكمال */
    saveDraft: function(answers){
      return post('exercise-draft-save', basePayload({
        answers: answers || {},
        savedAt: new Date().toISOString()
      }));
    },

    /* تحديث الإجابات بعد الإكمال (بدون نقاط جديدة) */
    update: function(answers){
      return post('exercise-update', basePayload({
        answers:   answers || {},
        updatedAt: new Date().toISOString()
      }));
    },

    /* طلب البيانات المحفوظة — الردّ يصل عبر onSavedData */
    requestSavedData: function(){
      return post('request-saved-data', basePayload());
    },

    onSavedData:     function(cb){ if(typeof cb === 'function') savedDataCallbacks.push(cb); },
    onPointsSummary: function(cb){ if(typeof cb === 'function') summaryCallbacks.push(cb); }
  };
})();
