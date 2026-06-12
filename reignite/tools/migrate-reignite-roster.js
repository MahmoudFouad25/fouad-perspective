/* ════════════════════════════════════════════════════════════════════════
   migrate-reignite-roster.js — سكريبت ترحيل لمرّة واحدة (Console)
   ────────────────────────────────────────────────────────────────────────
   الغرض: نقل عملاء reignite الموجودين فعلًا في users إلى reignite_roster،
   عشان يظهروا في لوحة الأدمن. تشغّله مرّة واحدة فقط ثمّ تنساه.

   كيف تشغّله:
     1) افتح أي صفحة من المشروع فيها Firebase جاهز (my-courses.html أو
        reignite-admin.html) وإنت داخل بحساب الأدمن.
     2) افتح Console (F12 → Console).
     3) الصق كل محتوى هذا الملف واضغط Enter.
     4) اقرأ التقرير في الكونسول: كم عميلًا تمّ ترحيله.

   آمن: لا يكتب فوق تسكين موجود (merge بدون مسح cohort). يقرأ users قراءةً
   فقط، ويكتب في reignite_roster فقط. لا يلمس أي حقل حسّاس في users.
   ════════════════════════════════════════════════════════════════════════ */
(async function migrateReigniteRoster(){
  'use strict';
  if(!window.db){ console.error('❌ Firestore غير جاهز — افتح صفحة فيها Firebase مهيّأ.'); return; }
  var db = window.db;
  var ROSTER = 'reignite_roster';
  var FV = firebase.firestore.FieldValue;

  console.log('🔵 بدء الترحيل — أقرأ المستخدمين…');
  var snap;
  try{ snap = await db.collection('users').limit(5000).get(); }
  catch(e){ console.error('❌ تعذّرت قراءة users:', e); return; }

  var found = 0, migrated = 0, skipped = 0, errors = 0;

  for(var i=0;i<snap.docs.length;i++){
    var doc = snap.docs[i];
    var u = doc.data() || {};
    var enr = u.enrollments || [];
    var inReignite = enr.some(function(e){
      var t = (e.title||'').toString().toLowerCase();
      var cid = (e.courseId||'').toString().toLowerCase();
      return t.indexOf('reignite')>=0 || cid.indexOf('reignite')>=0;
    });
    if(!inReignite) continue;
    found++;

    var pass = '';
    try{ if(u.auth && u.auth.tempPassword) pass = atob(u.auth.tempPassword); }catch(e){ pass=''; }

    var rec = {
      userId: doc.id, courseId: 'reignite',
      name: (u.personalInfo && u.personalInfo.name) || '—',
      email: (u.personalInfo && u.personalInfo.email) || '',
      whatsapp: (u.personalInfo && u.personalInfo.whatsapp) || '',
      password: pass,
      token: (u.auth && u.auth.telegramAutoLoginToken) || null,
      status: (u.accountStatus && u.accountStatus.status) || 'active',
      source: 'migrated',
      updatedAt: FV.serverTimestamp()
    };

    try{
      var ex = await db.collection(ROSTER).doc(doc.id).get();
      if(!ex.exists){
        rec.cohort = null;            // غير مسكَّن بعد
        rec.retakeAxes = false;
        rec.createdAt = FV.serverTimestamp();
        await db.collection(ROSTER).doc(doc.id).set(rec);
        migrated++;
      } else {
        // موجود — حدّث اللقطة فقط دون لمس cohort/retakeAxes
        delete rec.cohort;
        await db.collection(ROSTER).doc(doc.id).set(rec, { merge:true });
        skipped++;
      }
    }catch(e){ console.warn('⚠️ خطأ مع', doc.id, e); errors++; }
  }

  console.log('═══════════════════════════════════');
  console.log('✅ انتهى الترحيل');
  console.log('   عملاء reignite الموجودون: ', found);
  console.log('   تمّ ترحيلهم (جدد في السجلّ):', migrated);
  console.log('   محدَّثون (موجودون مسبقًا): ', skipped);
  console.log('   أخطاء:                    ', errors);
  console.log('═══════════════════════════════════');
  console.log('دلوقتي افتح reignite-admin.html → تبويب «العملاء والمجموعات» وهتلاقيهم كلهم.');
})();
