/* ====================================================================
   منظور الفؤاد — Webinar Live Session Layer
   ────────────────────────────────────────────────────────────────────
   ملاحظة: هذا الملف يعتمد على firebase-config.js الموجود في /js/
   على المسار الجذر للمشروع. يجب تحميله بعد firebase-config.js مباشرة.
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// التأكد من أن Firebase تمّ تحميله بنجاح
// ────────────────────────────────────────────────────────────────────
if (typeof db === 'undefined') {
  console.error('❌ session.js: الـ db غير معرّف. تأكّد من تحميل firebase-config.js قبل هذا الملف.');
}

// ────────────────────────────────────────────────────────────────────
// مراجع الجلسة (Webinar-specific collections)
// ────────────────────────────────────────────────────────────────────
const SESSION_ID = 'active';
const SESSION_REF = db.collection('webinar_sessions').doc(SESSION_ID);
const PARTICIPANTS_REF = SESSION_REF.collection('participants');
const RESPONSES_REF = SESSION_REF.collection('responses');

// ────────────────────────────────────────────────────────────────────
// تعريف المراحل — مصدر واحد للحقيقة
// ────────────────────────────────────────────────────────────────────
const STAGES = {
  welcome:        { num: '١', label: 'الترحيب والاستقبال' },
  opening_poll:   { num: '٢', label: 'Poll الافتتاح (إرهاق/احتراق)' },
  khalid_moment:  { num: '٣', label: 'لحظة خالد — هل ده إنت؟' },
  diagnostic:     { num: '٤', label: 'الاختبار التشخيصيّ (٩ مواقف)' },
  type_guess:     { num: '٥', label: 'حدس الطابع (٩ كروت)' },
  burnout_stage:  { num: '٦', label: 'مرحلة الاحتراق (Timeline)' },
  closing:        { num: '٧', label: 'الإغلاق' }
};

// ────────────────────────────────────────────────────────────────────
// Anonymous Participant ID (persistent via localStorage)
// مفتاح مخصّص لـ Webinar فقط حتى لا يتداخل مع باقي مفاتيح المشروع
// ────────────────────────────────────────────────────────────────────
function generateParticipantId() {
  let id = localStorage.getItem('mfp_webinar_participant_id');
  if (!id) {
    id = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('mfp_webinar_participant_id', id);
  }
  return id;
}

function getParticipantId() {
  return localStorage.getItem('mfp_webinar_participant_id');
}

// ────────────────────────────────────────────────────────────────────
// انضمام المشارك للجلسة الحاليّة
// ────────────────────────────────────────────────────────────────────
async function joinSession() {
  const id = generateParticipantId();
  await PARTICIPANTS_REF.doc(id).set({
    joined_at: firebase.firestore.FieldValue.serverTimestamp(),
    last_seen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return id;
}

// ────────────────────────────────────────────────────────────────────
// نبضة الحياة — تأكيد أنّ المشارك لا زال موجودًا (كل ٣٠ ثانية)
// ────────────────────────────────────────────────────────────────────
async function pingHeartbeat() {
  const id = getParticipantId();
  if (!id) return;
  try {
    await PARTICIPANTS_REF.doc(id).update({
      last_seen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    // لو الـ doc مش موجود لأيّ سبب، أنشئه
    await PARTICIPANTS_REF.doc(id).set({
      joined_at: firebase.firestore.FieldValue.serverTimestamp(),
      last_seen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

function startHeartbeat() {
  pingHeartbeat();
  return setInterval(pingHeartbeat, 30000);
}

// ────────────────────────────────────────────────────────────────────
// الاشتراك في تغييرات المرحلة الحاليّة
// ────────────────────────────────────────────────────────────────────
function subscribeToStage(callback) {
  return SESSION_REF.onSnapshot(snap => {
    const data = snap.data() || {};
    const stage = data.current_stage || 'welcome';
    callback(stage, data);
  });
}

// ────────────────────────────────────────────────────────────────────
// الاشتراك في عدّاد المشاركين (النشطون آخر دقيقتين)
// ────────────────────────────────────────────────────────────────────
function subscribeToParticipantCount(callback) {
  return PARTICIPANTS_REF.onSnapshot(snap => {
    const now = Date.now();
    const TWO_MIN = 2 * 60 * 1000;
    let activeCount = 0;
    let totalCount = 0;
    snap.forEach(doc => {
      totalCount++;
      const data = doc.data();
      const lastSeen = data.last_seen ? data.last_seen.toMillis() : 0;
      if (now - lastSeen < TWO_MIN) {
        activeCount++;
      }
    });
    callback(activeCount, totalCount);
  });
}

// ────────────────────────────────────────────────────────────────────
// Admin: تغيير المرحلة الحاليّة
// ────────────────────────────────────────────────────────────────────
async function setStage(stage) {
  await SESSION_REF.set({
    current_stage: stage,
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'live'
  }, { merge: true });
}

// ────────────────────────────────────────────────────────────────────
// Admin: إعادة بدء الجلسة بالكامل (يمسح المشاركين والإجابات)
// ────────────────────────────────────────────────────────────────────
async function resetSession() {
  // مسح المشاركين
  const partSnap = await PARTICIPANTS_REF.get();
  const batch1 = db.batch();
  partSnap.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();

  // مسح الإجابات
  const respSnap = await RESPONSES_REF.get();
  const batch2 = db.batch();
  respSnap.forEach(doc => batch2.delete(doc.ref));
  await batch2.commit();

  // إعادة ضبط الجلسة
  await SESSION_REF.set({
    current_stage: 'welcome',
    status: 'waiting',
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
    reset_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ────────────────────────────────────────────────────────────────────
// إرسال إجابة (يُستعمل في Phase 2+)
// ────────────────────────────────────────────────────────────────────
async function submitResponse(stage, answers, result = null) {
  const id = getParticipantId();
  if (!id) return;
  await RESPONSES_REF.doc(`${id}_${stage}`).set({
    participant_id: id,
    stage: stage,
    answers: answers,
    result: result,
    submitted_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ────────────────────────────────────────────────────────────────────
// الاشتراك في الإجابات لمرحلة معيّنة (لشاشة العرض)
// ────────────────────────────────────────────────────────────────────
function subscribeToResponses(stage, callback) {
  return RESPONSES_REF.where('stage', '==', stage).onSnapshot(snap => {
    const responses = [];
    snap.forEach(doc => responses.push(doc.data()));
    callback(responses);
  });
}

// ────────────────────────────────────────────────────────────────────
// Log loaded
// ────────────────────────────────────────────────────────────────────
console.log('✅ Webinar session layer ready');
