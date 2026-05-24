/* ============================================================
   training-session.js — SessionManager
   طبقة التدريب فوق Firestore — كل الواجهات تستهلكها
   ============================================================ */
(function () {
    'use strict';

    const SESSION_ID = 'reignite-training-active';

    if (typeof firebase === 'undefined' || !window.db) {
        console.error('Firebase أو db غير متاح — تأكد من تحميل firebase-config.js قبل هذا الملف');
        return;
    }

    const SessionManager = {
        // ---- مراجع سريعة ----
        sessionRef: () => db.collection('training').doc(SESSION_ID),
        participantsRef: () => db.collection('training').doc(SESSION_ID).collection('participants'),
        responsesRef: (pid) => db.collection('training').doc(SESSION_ID).collection('participants').doc(pid).collection('responses'),
        groupsRef: () => db.collection('training').doc(SESSION_ID).collection('groups'),
        chartersRef: () => db.collection('training').doc(SESSION_ID).collection('charters'),

        // ---- إدارة الجلسة ----
        async getSession() {
            const d = await this.sessionRef().get();
            return d.exists ? d.data() : null;
        },

        async initSession() {
            const data = {
                sessionName: 'Reignite — Burnout to Brilliance',
                currentPhase: 'waiting',
                phaseStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
                timerSeconds: 0,
                timerRunning: false,
                displayMode: 'default',
                customData: {},
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await this.sessionRef().set(data, { merge: false });
            return data;
        },

        async ensureSession() {
            const existing = await this.getSession();
            if (!existing) {
                return await this.initSession();
            }
            return existing;
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

        async setDisplayMode(mode) {
            await this.sessionRef().update({ displayMode: mode });
        },

        async setCustomData(customData) {
            await this.sessionRef().update({ customData });
        },

        // ---- المؤقّت ----
        async startTimer(seconds) {
            await this.sessionRef().update({
                timerSeconds: seconds,
                timerStartedAt: Date.now(),
                timerRunning: true
            });
        },

        async stopTimer() {
            await this.sessionRef().update({ timerRunning: false });
        },

        async setTimerOnly(seconds) {
            await this.sessionRef().update({
                timerSeconds: seconds,
                timerRunning: false,
                timerStartedAt: Date.now()
            });
        },

        // ---- المستمعون اللحظيون ----
        onSessionChange(cb) {
            return this.sessionRef().onSnapshot(
                doc => { if (doc.exists) cb(doc.data()); },
                err => console.error('Session listener error:', err)
            );
        },

        onParticipantsChange(cb) {
            return this.participantsRef().onSnapshot(snap => {
                const arr = [];
                snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
                cb(arr);
            }, err => console.error('Participants listener error:', err));
        },

        onGroupsChange(cb) {
            return this.groupsRef().onSnapshot(snap => {
                const arr = [];
                snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
                cb(arr);
            }, err => console.error('Groups listener error:', err));
        },

        // ---- المشاركون ----
        async registerParticipant(name, resultCode = null) {
            const data = {
                name: name.trim(),
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                currentPhase: 'waiting',
                status: 'online'
            };
            if (resultCode) data.result_code = resultCode;
            const ref = await this.participantsRef().add(data);
            return ref.id;
        },

        async findParticipantByCode(code) {
            if (!code) return null;
            const snap = await this.participantsRef()
                .where('result_code', '==', code)
                .limit(1)
                .get();
            if (snap.empty) return null;
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        },

        async getParticipant(pid) {
            const d = await this.participantsRef().doc(pid).get();
            return d.exists ? { id: d.id, ...d.data() } : null;
        },

        async updateParticipantStatus(pid, data) {
            try {
                await this.participantsRef().doc(pid).update({
                    ...data,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.warn('Participant update failed:', e);
            }
        },

        // ---- إجابات المشاركين ----
        async saveResponse(pid, type, data) {
            await this.responsesRef(pid).doc(type).set({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        },

        async getResponse(pid, type) {
            const d = await this.responsesRef(pid).doc(type).get();
            return d.exists ? d.data() : null;
        },

        async getAllResponses(pid) {
            const snap = await this.responsesRef(pid).get();
            const out = {};
            snap.forEach(d => out[d.id] = d.data());
            return out;
        },

        async getParticipantFull(pid) {
            const p = await this.getParticipant(pid);
            if (!p) return null;
            p.responses = await this.getAllResponses(pid);
            return p;
        },

        // ---- إعادة ضبط الجلسة ----
        async resetSession() {
            // حذف كل المشاركين وإجاباتهم
            const partSnap = await this.participantsRef().get();
            for (const partDoc of partSnap.docs) {
                // حذف responses الفرعية
                const respSnap = await this.responsesRef(partDoc.id).get();
                const batch1 = db.batch();
                respSnap.forEach(d => batch1.delete(d.ref));
                if (respSnap.size > 0) await batch1.commit();
                // حذف المشارك نفسه
                await partDoc.ref.delete();
            }

            // حذف المجموعات
            const grpSnap = await this.groupsRef().get();
            const batch2 = db.batch();
            grpSnap.forEach(d => batch2.delete(d.ref));
            if (grpSnap.size > 0) await batch2.commit();

            // إعادة التهيئة
            await this.initSession();
        }
    };

    window.SessionManager = SessionManager;
    window.TRAINING_SESSION_ID = SESSION_ID;
    console.log('✅ SessionManager loaded');
})();
