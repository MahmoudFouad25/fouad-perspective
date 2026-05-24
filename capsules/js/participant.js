/* ============================================================
   participant.js — منطق شاشة المشارك
   مع طبقة الحفظ بالكود الإلزامية (Section 14)
   ============================================================ */

(function () {
    'use strict';

    // ============ State ============
    let participantId = null;
    let participantName = null;
    let participantCode = null;
    let currentSession = null;
    let currentResponses = {};
    let timerInterval = null;
    let localTimerSeconds = 0;
    let heartbeatInterval = null;
    let chartInstance = null;
    let pendingLikerts = {}; // لجمع إجابات الليكرت قبل الإرسال

    const SAVE_KEY = 'reignite_participant';

    // ============ Toast ============
    function showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.textContent = msg;
        document.getElementById('toastContainer').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
    window.showToast = showToast;

    // ============ Stars ============
    function createStars() {
        const sb = document.getElementById('starsBackground');
        if (!sb) return;
        for (let i = 0; i < 60; i++) {
            const s = document.createElement('div');
            const r = Math.random();
            s.className = 'star ' + (r < 0.6 ? 'star-small' : r < 0.9 ? 'star-medium' : 'star-large');
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.animationDelay = Math.random() * 4 + 's';
            sb.appendChild(s);
        }
    }

    // ============ Code persistence helpers ============
    function putCodeInUrl(code) {
        if (!code) return;
        try {
            const url = new URL(location.href);
            if (url.searchParams.get('c') === code) return;
            url.searchParams.set('c', code);
            history.replaceState(null, '', url.toString());
        } catch (e) {}
    }

    function saveLocal() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                participantId, participantName, participantCode,
                savedAt: Date.now()
            }));
        } catch (e) {}
    }

    function loadLocal() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const d = JSON.parse(raw);
            if (!d || (Date.now() - (d.savedAt || 0)) > 7 * 24 * 60 * 60 * 1000) {
                localStorage.removeItem(SAVE_KEY);
                return false;
            }
            participantId = d.participantId;
            participantName = d.participantName;
            participantCode = d.participantCode;
            return true;
        } catch (e) { return false; }
    }

    async function tryResume() {
        const params = new URLSearchParams(location.search);
        const urlCode = params.get('c') || params.get('code');

        if (urlCode && window.SessionManager) {
            try {
                document.getElementById('registrationForm').classList.add('hidden');
                document.getElementById('resumeLoader').classList.remove('hidden');
                const formatted = window.ResultCodes ? window.ResultCodes.format(urlCode) : urlCode;
                const p = await SessionManager.findParticipantByCode(formatted);
                if (p) {
                    participantId = p.id;
                    participantName = p.name;
                    participantCode = p.result_code || formatted;
                    saveLocal();
                    return true;
                }
                document.getElementById('resumeLoader').classList.add('hidden');
                document.getElementById('registrationForm').classList.remove('hidden');
                showToast('الكود ده مش موجود — سجّل بمعرف جديد', 'error');
            } catch (e) {
                document.getElementById('resumeLoader').classList.add('hidden');
                document.getElementById('registrationForm').classList.remove('hidden');
            }
        }

        if (loadLocal() && participantId) {
            try {
                const p = await SessionManager.getParticipant(participantId);
                if (p) {
                    if (p.result_code) participantCode = p.result_code;
                    if (participantCode) putCodeInUrl(participantCode);
                    return true;
                }
                localStorage.removeItem(SAVE_KEY);
                participantId = null; participantName = null; participantCode = null;
            } catch (e) {}
        }
        return false;
    }

    // ============ Code input formatting ============
    function setupCodeInputFormatter() {
        const input = document.getElementById('codeInput');
        if (!input) return;
        input.addEventListener('input', (e) => {
            let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
            if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8);
            e.target.value = v;
        });
    }

    // ============ Registration ============
    window.registerNow = async function () {
        const aliasInput = document.getElementById('aliasInput');
        const alias = (aliasInput.value || '').trim();
        if (!alias) { showToast('اكتب اسم وهمي', 'error'); return; }
        if (alias.length > 20) { showToast('الاسم لازم يكون أقصر من 20 حرف', 'error'); return; }

        try {
            const code = window.ResultCodes ? window.ResultCodes.randomCode() : ('R' + Math.random().toString(36).slice(2, 9).toUpperCase());
            participantCode = code;
            participantId = await SessionManager.registerParticipant(alias, code);
            participantName = alias;
            saveLocal();
            putCodeInUrl(code);
            showDynamicScreen();
            startHeartbeat();
        } catch (e) {
            console.error(e);
            showToast('حصل خطأ — اتأكد من النت', 'error');
        }
    };

    window.resumeWithCode = async function () {
        const codeInput = document.getElementById('codeInput');
        const raw = (codeInput.value || '').trim();
        if (!window.ResultCodes || !window.ResultCodes.isValid(raw)) {
            showToast('الكود مش صحيح — صيغته XXXX-XXXX', 'error');
            return;
        }
        const code = window.ResultCodes.format(raw);
        try {
            const p = await SessionManager.findParticipantByCode(code);
            if (!p) { showToast('الكود ده مش موجود', 'error'); return; }
            participantId = p.id;
            participantName = p.name;
            participantCode = code;
            saveLocal();
            putCodeInUrl(code);
            showDynamicScreen();
            startHeartbeat();
            showToast('مرحباً برجوعك، ' + participantName);
        } catch (e) {
            showToast('حصل خطأ', 'error');
        }
    };

    window.copyLink = async function () {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('✅ اتنسخ الرابط');
        } catch (e) { showToast('اضغط طويل على الرابط لنسخه', 'error'); }
    };

    window.copyCode = async function () {
        if (!participantCode) return;
        try {
            await navigator.clipboard.writeText(participantCode);
            showToast('✅ اتنسخ الكود');
        } catch (e) { showToast('فشل النسخ', 'error'); }
    };

    function showDynamicScreen() {
        document.getElementById('registrationScreen').classList.add('hidden');
        document.getElementById('dynamicScreen').classList.remove('hidden');
        document.getElementById('welcomeName').textContent = participantName;
        if (participantCode) {
            document.getElementById('codeDisplay').textContent = participantCode;
            document.getElementById('resumeBar').classList.remove('hidden');
        }
        loadAllResponses().then(() => {
            if (currentSession) renderPhase(currentSession.currentPhase);
        });
    }

    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (participantId) {
                SessionManager.updateParticipantStatus(participantId, {}).catch(() => {});
            }
        }, 30000);
    }

    async function loadAllResponses() {
        if (!participantId) return;
        try {
            currentResponses = await SessionManager.getAllResponses(participantId);
        } catch (e) {}
    }

    // ============ Timer sync ============
    function syncTimer(session) {
        const bar = document.getElementById('timerBar');
        if (session.timerRunning && session.timerSeconds > 0) {
            const elapsed = session.timerStartedAt
                ? Math.floor((Date.now() - session.timerStartedAt) / 1000) : 0;
            localTimerSeconds = Math.max(0, session.timerSeconds - elapsed);
            startLocalTimer();
            bar.classList.remove('hidden');
        } else if (session.timerSeconds > 0) {
            localTimerSeconds = session.timerSeconds;
            updateTimerDisplay();
            bar.classList.remove('hidden');
            stopLocalTimer();
        } else {
            bar.classList.add('hidden');
            stopLocalTimer();
        }
    }

    function startLocalTimer() {
        if (timerInterval) clearInterval(timerInterval);
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            if (localTimerSeconds > 0) { localTimerSeconds--; updateTimerDisplay(); }
            else stopLocalTimer();
        }, 1000);
    }

    function stopLocalTimer() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    }

    function updateTimerDisplay() {
        const el = document.getElementById('timerDisplay');
        if (!el) return;
        const m = Math.floor(localTimerSeconds / 60);
        const s = localTimerSeconds % 60;
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        el.classList.remove('warning', 'danger');
        if (localTimerSeconds <= 30 && localTimerSeconds > 0) el.classList.add('danger');
        else if (localTimerSeconds <= 60 && localTimerSeconds > 0) el.classList.add('warning');
    }

    // ============ Session change ============
    function handleSessionChange(session) {
        const prevPhase = currentSession ? currentSession.currentPhase : null;
        currentSession = session;
        syncTimer(session);
        if (participantId) {
            if (prevPhase !== session.currentPhase) {
                pendingLikerts = {};
                loadAllResponses().then(() => renderPhase(session.currentPhase));
            } else {
                renderPhase(session.currentPhase);
            }
        }
    }

    // ============ Bootstrap (continues in part 2) ============
    window.__participantState = {
        get participantId() { return participantId; },
        get participantName() { return participantName; },
        get participantCode() { return participantCode; },
        get currentSession() { return currentSession; },
        get currentResponses() { return currentResponses; },
        get pendingLikerts() { return pendingLikerts; },
        setPendingLikert(axis, qi, v) { 
            if (!pendingLikerts[axis]) pendingLikerts[axis] = {};
            pendingLikerts[axis][qi] = v;
        },
        clearPending(axis) { delete pendingLikerts[axis]; }
    };

    window.__participantInit = function () {
        createStars();
        setupCodeInputFormatter();

        const proceed = async () => {
            const ok = await tryResume();
            if (ok && participantId) {
                showDynamicScreen();
                startHeartbeat();
            } else {
                document.getElementById('registrationScreen').classList.remove('hidden');
                document.getElementById('resumeLoader').classList.add('hidden');
                document.getElementById('registrationForm').classList.remove('hidden');
            }
            // ابدأ الاستماع للجلسة (حتى لو ما اتسجلش — للتحضير)
            SessionManager.onSessionChange(handleSessionChange);
        };

        if (!window.firebaseReady) {
            document.addEventListener('firebaseReady', proceed);
        } else {
            proceed();
        }
    };

    // expose helpers used by part 2
    window.__renderPhase = function (phaseId) { renderPhase(phaseId); };
    window.__reloadResponses = loadAllResponses;
    window.__getChartInstance = () => chartInstance;
    window.__setChartInstance = (c) => { chartInstance = c; };

    function renderPhase(phaseId) {
        // الدالة الفعلية في part 2
        if (window.__renderPhaseImpl) {
            window.__renderPhaseImpl(phaseId);
        }
    }

})();
