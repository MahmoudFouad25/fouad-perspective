/* ====================================================================
   منظور الفؤاد — Webinar Live Session Layer (v2 — Optimized)
   ────────────────────────────────────────────────────────────────────
   التحسينات في v2:
   • Heartbeat: 30s → 90s (يقلّل الكتابات بمقدار الثلث)
   • count() Aggregation بدل subscribe على كل المشاركين
   • Polling-based count refresh كل 20s (بدل listener دائم)
   • دوال جديدة: submitQuizResult, saveContact, subscribeToStageResults
   ──────────────────────────────────────────────────────────────────── */

if (typeof db === 'undefined') {
  console.error('❌ session.js: db is undefined.');
}

// ────────────────────────────────────────────────────────────────────
// مراجع الجلسة
// ────────────────────────────────────────────────────────────────────
const SESSION_ID = 'active';
const SESSION_REF = db.collection('webinar_sessions').doc(SESSION_ID);
const PARTICIPANTS_REF = SESSION_REF.collection('participants');
const RESPONSES_REF = SESSION_REF.collection('responses');

// ────────────────────────────────────────────────────────────────────
// تعريف المراحل
// ────────────────────────────────────────────────────────────────────
const STAGES = {
  welcome:           { num: '٠', label: 'انتظار الجمهور' },
  welcome_question:  { num: '١', label: 'السؤال الافتتاحيّ' },
  opening_poll:      { num: '٢', label: 'Poll الافتتاح (إرهاق/احتراق)' },
  khalid_moment:     { num: '٣', label: 'لحظة خالد' },
  diagnostic:        { num: '٤', label: 'الاختبار التشخيصيّ (٩ مواقف)' },
  type_guess:        { num: '٥', label: 'حدس الطابع (٩ كروت)' },
  burnout_stage:     { num: '٦', label: 'مرحلة الاحتراق (Timeline)' },
  closing:           { num: '٧', label: 'قرار الإغلاق' }
};

// ────────────────────────────────────────────────────────────────────
// Anonymous Participant ID
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

async function joinSession() {
  const id = generateParticipantId();
  await PARTICIPANTS_REF.doc(id).set({
    joined_at: firebase.firestore.FieldValue.serverTimestamp(),
    last_seen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return id;
}

// ────────────────────────────────────────────────────────────────────
// ⚡ Heartbeat — كل 90 ثانية (محسّن)
// ────────────────────────────────────────────────────────────────────
async function pingHeartbeat() {
  const id = getParticipantId();
  if (!id) return;
  try {
    await PARTICIPANTS_REF.doc(id).update({
      last_seen: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    await PARTICIPANTS_REF.doc(id).set({
      joined_at: firebase.firestore.FieldValue.serverTimestamp(),
      last_seen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}

function startHeartbeat() {
  pingHeartbeat();
  return setInterval(pingHeartbeat, 90000); // 90s
}

// ────────────────────────────────────────────────────────────────────
// الاشتراك في تغييرات المرحلة
// ────────────────────────────────────────────────────────────────────
function subscribeToStage(callback) {
  return SESSION_REF.onSnapshot(snap => {
    const data = snap.data() || {};
    const stage = data.current_stage || 'welcome';
    callback(stage, data);
  });
}

// ────────────────────────────────────────────────────────────────────
// ⚡ count() Aggregation بدل listener على كل المشاركين
// ────────────────────────────────────────────────────────────────────
async function fetchParticipantCounts() {
  // النشط = آخر heartbeat له خلال آخر 4 دقايق (90s heartbeat + buffer)
  const fourMinAgo = firebase.firestore.Timestamp.fromMillis(
    Date.now() - 4 * 60 * 1000
  );

  try {
    const activeSnap = await PARTICIPANTS_REF
      .where('last_seen', '>', fourMinAgo)
      .count()
      .get();
    const totalSnap = await PARTICIPANTS_REF.count().get();

    return {
      active: activeSnap.data().count,
      total: totalSnap.data().count
    };
  } catch (err) {
    console.error('Error in fetchParticipantCounts:', err);
    return { active: 0, total: 0 };
  }
}

// Polling-based subscription (بدل listener — توفير ضخم في الـ reads)
function subscribeToParticipantCount(callback) {
  let intervalId;

  const poll = async () => {
    const { active, total } = await fetchParticipantCounts();
    callback(active, total);
  };

  poll(); // فورًا
  intervalId = setInterval(poll, 20000); // كل 20 ثانية

  return () => clearInterval(intervalId);
}

// ────────────────────────────────────────────────────────────────────
// Admin: تغيير المرحلة
// ────────────────────────────────────────────────────────────────────
async function setStage(stage) {
  await SESSION_REF.set({
    current_stage: stage,
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'live'
  }, { merge: true });
}

// ────────────────────────────────────────────────────────────────────
// Admin: إعادة بدء الجلسة
// ────────────────────────────────────────────────────────────────────
async function resetSession() {
  const partSnap = await PARTICIPANTS_REF.get();
  const batch1 = db.batch();
  partSnap.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();

  const respSnap = await RESPONSES_REF.get();
  const batch2 = db.batch();
  respSnap.forEach(doc => batch2.delete(doc.ref));
  await batch2.commit();

  await SESSION_REF.set({
    current_stage: 'welcome',
    status: 'waiting',
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
    reset_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ────────────────────────────────────────────────────────────────────
// ⚡ NEW: حفظ نتيجة الاختبار التشخيصيّ
// ────────────────────────────────────────────────────────────────────
async function submitQuizResult(stage, answers, result) {
  const id = getParticipantId();
  if (!id) return;

  // 1. حفظ في responses (للتحليل التفصيليّ)
  await RESPONSES_REF.doc(`${id}_${stage}`).set({
    participant_id: id,
    stage: stage,
    answers: answers,
    result: result,
    submitted_at: firebase.firestore.FieldValue.serverTimestamp()
  });

  // 2. حفظ على المشارك نفسه (للوصول السريع)
  await PARTICIPANTS_REF.doc(id).set({
    [`${stage}_result`]: result,
    last_seen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// ────────────────────────────────────────────────────────────────────
// ⚡ NEW: حفظ بيانات الواتس (الاسم + الرقم)
// ────────────────────────────────────────────────────────────────────
async function saveContact(name, whatsapp) {
  const id = getParticipantId();
  if (!id) throw new Error('No participant ID');

  await PARTICIPANTS_REF.doc(id).set({
    name: name,
    whatsapp: whatsapp,
    contact_saved_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// ────────────────────────────────────────────────────────────────────
// ⚡ NEW: الاشتراك في كل نتائج مرحلة معيّنة (لشاشة العرض)
// ────────────────────────────────────────────────────────────────────
function subscribeToStageResults(stage, callback) {
  return RESPONSES_REF.where('stage', '==', stage).onSnapshot(snap => {
    const results = [];
    snap.forEach(doc => results.push(doc.data()));
    callback(results);
  });
}

console.log('✅ Webinar session layer ready (v2 — optimized)');
