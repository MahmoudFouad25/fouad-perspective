/* ====================================================================
   منظور الفؤاد — Webinar Live Session Layer (v3 — Mirror Stages)
   ────────────────────────────────────────────────────────────────────
   الجديد في v3:
   • ٣ مراحل جديدة لمرآة المشاعر:
     - mirror_containment      (الاحتواء — ليلى/كريم/عمر)
     - mirror_full_expression  (التعبير الكامل — سلمى/طارق/سامي)
     - mirror_transformation   (التحويل — ندى/أحمد/هانم)
   • type_guess معدّلة لتعرض الطبائع منظّمة بالمرايا
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
// تعريف المراحل (مع المراحل الجديدة للمرايا)
// ────────────────────────────────────────────────────────────────────
const STAGES = {
  welcome:                 { num: '٠',  label: 'انتظار الجمهور' },
  welcome_question:        { num: '١',  label: 'السؤال الافتتاحيّ' },
  opening_poll:            { num: '٢',  label: 'Poll الافتتاح (إرهاق/احتراق)' },
  khalid_moment:           { num: '٣',  label: 'لحظة خالد' },
  diagnostic:              { num: '٤',  label: 'الاختبار التشخيصيّ (٩ مواقف)' },

  // ── المراحل الجديدة لمرآة المشاعر ──
  mirror_containment:      { num: '٥',  label: 'مرآة المشاعر — الاحتواء (ليلى/كريم/عمر)' },
  mirror_full_expression:  { num: '٦',  label: 'مرآة المشاعر — التعبير الكامل (سلمى/طارق/سامي)' },
  mirror_transformation:   { num: '٧',  label: 'مرآة المشاعر — التحويل (ندى/أحمد/هانم)' },

  type_guess:              { num: '٨',  label: 'حدس الطابع (٩ كروت منظّمة بالمرايا)' },
  burnout_stage:           { num: '٩',  label: 'مرحلة الاحتراق (Timeline)' },
  closing:                 { num: '١٠', label: 'قرار الإغلاق' }
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
// Heartbeat — كل 90 ثانية
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
  return setInterval(pingHeartbeat, 90000);
}

// ────────────────────────────────────────────────────────────────────
// Stage subscription
// ────────────────────────────────────────────────────────────────────
function subscribeToStage(callback) {
  return SESSION_REF.onSnapshot(snap => {
    const data = snap.data() || {};
    const stage = data.current_stage || 'welcome';
    callback(stage, data);
  });
}

// ────────────────────────────────────────────────────────────────────
// Participant counts (polling-based)
// ────────────────────────────────────────────────────────────────────
async function fetchParticipantCounts() {
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

function subscribeToParticipantCount(callback) {
  let intervalId;
  const poll = async () => {
    const { active, total } = await fetchParticipantCounts();
    callback(active, total);
  };
  poll();
  intervalId = setInterval(poll, 20000);
  return () => clearInterval(intervalId);
}

// ────────────────────────────────────────────────────────────────────
// Admin controls
// ────────────────────────────────────────────────────────────────────
async function setStage(stage) {
  await SESSION_REF.set({
    current_stage: stage,
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'live'
  }, { merge: true });
}

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
// Quiz / Poll result submission
// ────────────────────────────────────────────────────────────────────
async function submitQuizResult(stage, answers, result) {
  const id = getParticipantId();
  if (!id) return;

  await RESPONSES_REF.doc(`${id}_${stage}`).set({
    participant_id: id,
    stage: stage,
    answers: answers,
    result: result,
    submitted_at: firebase.firestore.FieldValue.serverTimestamp()
  });

  await PARTICIPANTS_REF.doc(id).set({
    [`${stage}_result`]: result,
    last_seen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function saveContact(name, whatsapp) {
  const id = getParticipantId();
  if (!id) throw new Error('No participant ID');
  await PARTICIPANTS_REF.doc(id).set({
    name: name,
    whatsapp: whatsapp,
    contact_saved_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function subscribeToStageResults(stage, callback) {
  return RESPONSES_REF.where('stage', '==', stage).onSnapshot(snap => {
    const results = [];
    snap.forEach(doc => results.push(doc.data()));
    callback(results);
  });
}

console.log('✅ Webinar session layer ready (v3 — mirror stages)');
