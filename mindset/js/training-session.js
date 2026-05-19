// ========================================
// منظور الفؤاد - تدريب "تحت السطح"
// SessionManager - طبقة التدريب فوق Firebase الأصلي
// ========================================
//
// ملاحظات مهمة:
// - ده ملف منفصل بيشتغل فوق js/firebase-config.js الأصلي
// - بيستخدم الـ db و firebase اللي مهيّأين عالمياً من الـ config الأصلي
// - مش بيهيّأ Firebase تاني (الأصلي بيعمل ده)
// - بيضيف SessionManager و TRAINING_SESSION_ID للـ window
// ========================================

(function() {
    'use strict';

    // التأكد إن Firebase وdb متاحين من الـ config الأصلي
    if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        console.error('❌ training-session.js: Firebase أو db مش متاحين. تأكد إن firebase-config.js بيتلود قبل ده.');
        return;
    }

    // معرّف الجلسة الحالية
    const TRAINING_SESSION_ID = 'ghaith-training-active';

    // ====================================
    // مدير الجلسة
    // ====================================
    const SessionManager = {
        sessionRef: () => db.collection('training').doc(TRAINING_SESSION_ID),
        participantsRef: () => db.collection('training').doc(TRAINING_SESSION_ID).collection('participants'),
        responsesRef: (participantId) => db.collection('training').doc(TRAINING_SESSION_ID).collection('participants').doc(participantId).collection('responses'),
        groupsRef: () => db.collection('training').doc(TRAINING_SESSION_ID).collection('groups'),
        chartersRef: () => db.collection('training').doc(TRAINING_SESSION_ID).collection('charters'),

        // ----- الجلسة -----
        async getSession() {
            const doc = await this.sessionRef().get();
            return doc.exists ? doc.data() : null;
        },

        async initSession() {
            const sessionData = {
                sessionName: 'تحت السطح - مؤسسة غيث',
                currentPhase: 'waiting',
                phaseStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
                timerSeconds: 0,
                timerRunning: false,
                displayMode: 'default',
                customData: {},
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.sessionRef().set(sessionData, { merge: false });
            return sessionData;
        },

        async setPhase(phaseId, customData = {}) {
            await this.sessionRef().update({
                currentPhase: phaseId,
                phaseStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
                customData: customData,
                timerSeconds: 0,
                timerRunning: false
            });
        },

        // ----- المؤقت -----
        async startTimer(seconds) {
            await this.sessionRef().update({
                timerSeconds: seconds,
                timerStartedAt: Date.now(),
                timerRunning: true
            });
        },

        async stopTimer() {
            await this.sessionRef().update({
                timerRunning: false
            });
        },

        // ----- الاستماع للتغييرات -----
        onSessionChange(callback) {
            return this.sessionRef().onSnapshot(doc => {
                if (doc.exists) {
                    callback(doc.data());
                }
            }, error => {
                console.error('Session listener error:', error);
            });
        },

        onParticipantsChange(callback) {
            return this.participantsRef().onSnapshot(snapshot => {
                const participants = [];
                snapshot.forEach(doc => {
                    participants.push({ id: doc.id, ...doc.data() });
                });
                callback(participants);
            });
        },

        // ----- المشاركون -----
        async registerParticipant(name) {
            const participantData = {
                name: name.trim(),
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                currentPhase: 'waiting',
                status: 'online'
            };
            const docRef = await this.participantsRef().add(participantData);
            return docRef.id;
        },

        async updateParticipantStatus(participantId, data) {
            try {
                await this.participantsRef().doc(participantId).update({
                    ...data,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.warn('Participant update failed:', e);
            }
        },

        // ----- إجابات المشاركين -----
        async saveResponse(participantId, responseType, data) {
            await this.responsesRef(participantId).doc(responseType).set({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        },

        async getResponse(participantId, responseType) {
            const doc = await this.responsesRef(participantId).doc(responseType).get();
            return doc.exists ? doc.data() : null;
        },

        async getAllResponses(participantId) {
            const snapshot = await this.responsesRef(participantId).get();
            const responses = {};
            snapshot.forEach(doc => {
                responses[doc.id] = doc.data();
            });
            return responses;
        },

        async getParticipantFull(participantId) {
            const participantDoc = await this.participantsRef().doc(participantId).get();
            const participant = participantDoc.exists ? { id: participantDoc.id, ...participantDoc.data() } : null;
            if (!participant) return null;
            participant.responses = await this.getAllResponses(participantId);
            return participant;
        },

        // ----- المجموعات (لجلسة أسامة) -----
        async setupGroups(groupAssignments) {
            const batch = db.batch();
            for (const groupId in groupAssignments) {
                batch.set(this.groupsRef().doc(groupId), {
                    name: groupAssignments[groupId].name,
                    dimension: groupAssignments[groupId].dimension,
                    members: groupAssignments[groupId].members,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await batch.commit();
        },

        async saveGroupResponse(groupId, data) {
            await this.groupsRef().doc(groupId).update({
                response: data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },

        onGroupsChange(callback) {
            return this.groupsRef().onSnapshot(snapshot => {
                const groups = [];
                snapshot.forEach(doc => {
                    groups.push({ id: doc.id, ...doc.data() });
                });
                callback(groups);
            });
        },

        // ----- الميثاق -----
        async saveCharter(participantId, charterData) {
            await this.chartersRef().doc(participantId).set({
                ...charterData,
                signedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },

        async getCharter(participantId) {
            const doc = await this.chartersRef().doc(participantId).get();
            return doc.exists ? doc.data() : null;
        }
    };

    // ====================================
    // تصدير عالمي
    // ====================================
    window.SessionManager = SessionManager;
    window.TRAINING_SESSION_ID = TRAINING_SESSION_ID;

    console.log('✅ SessionManager جاهز (طبقة التدريب فوق Firebase الأصلي)');

    // إشعار التدريب جاهز (firebaseReady بيتدبت من الـ config الأصلي بالفعل)
    if (window.firebaseReady) {
        document.dispatchEvent(new CustomEvent('trainingReady'));
    }
})();
