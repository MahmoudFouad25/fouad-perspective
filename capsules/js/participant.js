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

/* ============================================================
   participant.js — Part 2: Render Templates & Actions
   ============================================================ */
(function () {
    'use strict';

    const S = window.__participantState;

    // ============ Render helpers ============
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    // ============================================================
    // RENDER PHASE — الموجّه الرئيسي
    // ============================================================
    window.__renderPhaseImpl = function (phaseId) {
        const phase = SessionData.phases[phaseId];
        const container = document.getElementById('phaseContent');
        if (!container) return;

        if (!phase || phaseId === 'waiting') {
            container.innerHTML = renderWaiting();
            return;
        }

        const tpl = phase.template;
        let html = '';

        switch (tpl) {
            case 'welcome-logo':            html = renderWelcomeLogo(phase); break;
            case 'charter-three-points':    html = renderCharter(phase); break;
            case 'phone-register':          html = renderPhoneSetup(phase); break;
            case 'big-question-dark':       html = renderBigQuestionDark(phase); break;
            case 'single-choice-poll':      html = renderSingleChoicePoll(phase); break;
            case 'bar-chart-result':        html = renderResultWait(phase); break;
            case 'pie-chart-result':        html = renderResultWait(phase); break;
            case 'two-column-compare':      html = renderTwoColumnCompare(phase); break;
            case 'three-levels-circles':    html = renderThreeLevels(phase); break;
            case 'degrees-summary':         html = renderDegrees(phase); break;
            case 'name-only-big':           html = renderNameOnly(phase); break;
            case 'profile-card':            html = renderProfileCard(phase); break;
            case 'dark-narrative':          html = renderDarkNarrative(phase); break;
            case 'reveal-text':             html = renderRevealText(phase); break;
            case 'dark-list-fade':          html = renderDarkListFade(phase); break;
            case 'simple-bridge':           html = renderSimpleBridge(phase); break;
            case 'break':                   html = renderBreak(phase); break;
            case 'section-title':           html = renderSectionTitle(phase); break;
            case 'situation-text':          html = renderSituationText(phase); break;
            case 'six-cards-choice':        html = renderSixCardsChoice(phase); break;
            case 'six-cards-analysis':      html = renderSixCardsAnalysis(phase); break;
            case 'reveal-name':             html = renderRevealName(phase); break;
            case 'axis-intro':              html = renderAxisIntro(phase); break;
            case 'axis-scenario':           html = renderAxisScenario(phase); break;
            case 'axis-questions':          html = renderAxisQuestions(phase); break;
            case 'axis-result':             html = renderResultWait(phase); break;
            case 'radar-fingerprint':       html = renderRadarFingerprint(phase); setTimeout(buildParticipantRadar, 200); break;
            case 'text-inputs':             html = renderTextInputs(phase); break;
            case 'four-layers-nested':      html = renderFourLayers(phase); break;
            case 'three-axes-pie':          html = renderThreeAxes(phase); break;
            case 'loss-write-five':         html = renderLossWrite(phase); break;
            case 'loss-drop-four':          html = renderLossDrop(phase); break;
            case 'axes-distribution':       html = renderResultWait(phase); break;
            case 'three-patterns-overview': html = renderThreePatternsOverview(phase); break;
            case 'pattern-detail':          html = renderPatternDetail(phase); break;
            case 'simple-intro':            html = renderSimpleIntro(phase); break;
            case 'behavior-assessment':     html = renderBehaviorAssessment(phase); break;
            case 'behavior-result':         html = renderBehaviorResultPersonal(phase); break;
            case 'khaled-return':           html = renderKhaledReturn(phase); break;
            case 'repressed-axis':          html = renderRepressedAxis(phase); break;
            case 'triple-distinction-table': html = renderTripleDistinction(phase); break;
            case 'paths-grid':              html = renderPathsGrid(phase); break;
            case 'verse-final':             html = renderVerseFinal(phase); break;
            default:
                html = `<div class="phase-display text-center">
                    <h1 class="gold-text">${escapeHtml(phase.title)}</h1>
                    ${phase.subtitle ? `<p class="subtitle">${escapeHtml(phase.subtitle)}</p>` : ''}
                </div>`;
        }
        container.innerHTML = html;
    };

    // ============ Simple templates ============
    function renderWaiting() {
        return `<div class="phase-display text-center">
            <div class="loading-spinner mx-auto mb-3"></div>
            <h2>في انتظار بدء اللقاء</h2>
            <p class="subtitle mt-2">اللقاء هيبدأ قريباً — استرخي ❤️</p>
        </div>`;
    }

    function renderWelcomeLogo(p) {
        return `<div class="phase-display text-center">
            <h1 class="gold-text" style="font-size: 3rem;">${escapeHtml(p.title)}</h1>
            <p class="subtitle" style="font-size: 1.25rem;">${escapeHtml(p.subtitle || '')}</p>
            <div class="mt-4" style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(p.footer || '')}</div>
        </div>`;
    }

    function renderCharter(p) {
        let h = `<div class="phase-display text-center"><h2 class="gold-text mb-3">${escapeHtml(p.title)}</h2>`;
        p.points.forEach((pt, i) => {
            h += `<div class="card mb-2 fade-in-delay-${i + 1}" style="text-align: right;">
                <div class="flex items-center gap-3">
                    <div style="font-size: 2rem; color: var(--gold); font-weight: 800; min-width: 40px;">${pt.num}</div>
                    <div>
                        <div style="font-weight: 700; color: var(--gold-light); font-size: 1.1rem;">${escapeHtml(pt.title)}</div>
                        <div style="color: var(--text-secondary); margin-top: 0.25rem;">${escapeHtml(pt.body)}</div>
                    </div>
                </div>
            </div>`;
        });
        return h + '</div>';
    }

    function renderPhoneSetup(p) {
        return `<div class="phase-display text-center">
            <h2 class="gold-text mb-3">✅ إنت متسجّل</h2>
            <p class="subtitle">باسم: <span class="gold-text" style="font-size: 1.2rem; font-weight: 700;">${escapeHtml(S.participantName)}</span></p>
            <div class="card mt-3" style="text-align: right;">
                <p>اللقاء جاهز يبدأ. كل التفاعلات هتظهر هنا، والمحتوى هيتبدّل تلقائياً مع المدرّب.</p>
                <p class="mt-2" style="color: var(--text-muted); font-size: 0.9rem;">
                    💡 احفظ كودك من فوق — هتقدر ترجع من أي جهاز.
                </p>
            </div>
        </div>`;
    }

    function renderBigQuestionDark(p) {
        return `<div class="phase-display text-center" style="background: rgba(0,0,0,0.4); border-radius: 20px; padding: 3rem 2rem;">
            <h1 style="font-size: clamp(1.4rem, 4vw, 2rem); line-height: 1.5; color: var(--text-primary); font-weight: 600;">
                ${escapeHtml(p.title)}
            </h1>
            <p class="mt-3" style="color: var(--text-muted); font-size: 0.9rem;">
                خد ثانية مع السؤال ده. مش هتجاوبني — هتجاوب نفسك.
            </p>
        </div>`;
    }

    function renderSingleChoicePoll(p) {
        const saved = S.currentResponses[p.saveKey];
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="subtitle text-center mb-3">${escapeHtml(p.subtitle)}</p>` : ''}`;

        if (saved && saved.optionId) {
            const opt = p.options.find(o => o.id === saved.optionId);
            h += `<div class="card card-glow text-center" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 0.5rem;">✅ إجابتك مسجّلة</div>
                <div style="font-size: 1.1rem;">${opt ? escapeHtml(opt.label) : ''}</div>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.75rem;">
                    استنى النتيجة على الشاشة الكبيرة
                </p>
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.changeAnswer('${p.saveKey}')">عدّل إجابتي</button>
            </div>`;
        } else {
            h += `<div class="choice-grid">`;
            p.options.forEach(opt => {
                h += `<button class="choice-option" onclick="window.submitSingleChoice('${p.saveKey}','${opt.id}')">
                    ${escapeHtml(opt.label)}
                </button>`;
            });
            h += `</div>`;
        }
        return h + '</div>';
    }

    function renderResultWait(p) {
        return `<div class="phase-display text-center">
            <h2 class="gold-text mb-2">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="subtitle mb-3">${escapeHtml(p.subtitle)}</p>` : ''}
            <div class="card">
                <div style="font-size: 3rem;">📊</div>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">النتيجة بتظهر على الشاشة الكبيرة دلوقتي</p>
            </div>
        </div>`;
    }

    function renderTwoColumnCompare(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-3">${escapeHtml(p.title)}</h2>
            <div class="compare-columns">`;
        p.columns.forEach(col => {
            h += `<div class="compare-col" style="border-top: 3px solid ${col.color};">
                <h3 style="color: ${col.color};">${escapeHtml(col.title)}</h3>
                <ul>`;
            col.items.forEach(it => {
                h += `<li data-icon="${col.icon}">${escapeHtml(it)}</li>`;
            });
            h += `</ul></div>`;
        });
        return h + '</div></div>';
    }

    function renderThreeLevels(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-3">${escapeHtml(p.title)}</h2>
            <div class="levels-container">`;
        p.levels.forEach((l, i) => {
            h += `<div class="level-card fade-in-delay-${i + 1}" style="border-right-color: ${l.color};">
                <h4 style="color: ${l.color};">${escapeHtml(l.name)}</h4>
                <p>${escapeHtml(l.desc)}</p>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderDegrees(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-3">${escapeHtml(p.title)}</h2>
            <div class="levels-container">`;
        p.degrees.forEach((d, i) => {
            h += `<div class="card fade-in-delay-${i + 1}" style="border-right: 4px solid ${d.color}; text-align: right;">
                <div style="font-weight: 700; color: ${d.color}; font-size: 1.1rem;">${escapeHtml(d.count)}</div>
                <div style="color: var(--text-secondary); margin-top: 0.25rem;">${escapeHtml(d.label)}</div>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderNameOnly(p) {
        return `<div class="phase-display text-center" style="min-height: 50vh; display: flex; align-items: center; justify-content: center;">
            <div>
                <p class="subtitle" style="margin-bottom: 1rem;">تعرّف على</p>
                <h1 class="gold-text" style="font-size: clamp(4rem, 10vw, 6rem); font-weight: 800;">${escapeHtml(p.title)}</h1>
            </div>
        </div>`;
    }

    function renderProfileCard(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-3">${escapeHtml(p.title)}</h2>
            <div class="profile-card">
                <div class="profile-avatar">👤</div>
                <ul class="profile-bullets">`;
        p.profileBullets.forEach(b => h += `<li>${escapeHtml(b)}</li>`);
        return h + `</ul></div></div>`;
    }

    function renderDarkNarrative(p) {
        let h = `<div class="dark-narrative"><h2>${escapeHtml(p.title)}</h2>`;
        p.paragraphs.forEach((par, i) => {
            h += `<p class="fade-in-delay-${Math.min(i + 1, 5)}">${escapeHtml(par)}</p>`;
        });
        return h + '</div>';
    }

    function renderRevealText(p) {
        return `<div class="phase-display text-center">
            <h2 class="gold-text mb-3">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="subtitle mb-3">${escapeHtml(p.subtitle)}</p>` : ''}
            <div class="card card-glow" style="border: 2px solid var(--gold);">
                <div class="badge badge-gold">اسمه</div>
                <h2 class="mt-2" style="color: var(--gold-light); font-size: 1.75rem;">${escapeHtml(p.revealName)}</h2>
                <p class="mt-2" style="color: var(--text-secondary);">${escapeHtml(p.revealDesc)}</p>
            </div>
        </div>`;
    }

    function renderDarkListFade(p) {
        let h = `<div class="dark-narrative">
            <h2 class="gold-text">${escapeHtml(p.title)}</h2>
            <p class="subtitle mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div style="max-width: 500px; width: 100%;">`;
        p.items.forEach((it, i) => {
            h += `<div class="card mb-2 fade-in-delay-${Math.min(i + 1, 6)}" style="text-align: center;">${escapeHtml(it)}</div>`;
        });
        return h + `<p class="mt-4" style="color: var(--gold-light); font-style: italic;">${escapeHtml(p.footer || '')}</p></div></div>`;
    }

    function renderSimpleBridge(p) {
        return `<div class="dark-narrative">
            <h1 class="gold-text">${escapeHtml(p.title)}</h1>
            <p class="subtitle mt-3" style="font-size: 1.3rem;">${escapeHtml(p.subtitle)}</p>
        </div>`;
    }

    function renderBreak(p) {
        return `<div class="phase-display text-center">
            <div style="font-size: 4rem;">☕</div>
            <h1 class="gold-text mt-2">${escapeHtml(p.title)}</h1>
            <p class="subtitle">${escapeHtml(p.subtitle)}</p>
            <p class="mt-3" style="color: var(--text-muted);">المؤقّت في الأعلى. ارجع لمكانك قبل ما ينتهي 🙏</p>
        </div>`;
    }

    function renderSectionTitle(p) {
        return `<div class="phase-display text-center">
            <p class="subtitle" style="letter-spacing: 4px;">${escapeHtml(p.subtitle || '')}</p>
            <div class="divider divider-gold mt-2 mb-3"></div>
            <h1 class="gold-text" style="font-size: clamp(2rem, 6vw, 3.5rem);">${escapeHtml(p.title)}</h1>
        </div>`;
    }

    function renderSituationText(p) {
        return `<div class="phase-display">
            <h2 class="text-center gold-text mb-3">${escapeHtml(p.title)}</h2>
            <div class="card card-glow">
                <p style="white-space: pre-line; line-height: 1.9; color: var(--text-secondary);">${escapeHtml(p.situation)}</p>
            </div>
            ${p.finalQuestion ? `
            <div class="card mt-3" style="border: 2px solid var(--gold); text-align: center;">
                <p style="color: var(--gold-light); font-size: 1.1rem; font-weight: 600; line-height: 1.6;">
                    ${escapeHtml(p.finalQuestion)}
                </p>
            </div>` : ''}
        </div>`;
    }

    function renderSixCardsChoice(p) {
        const saved = S.currentResponses[p.saveKey];
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="subtitle text-center mb-3">${escapeHtml(p.subtitle)}</p>` : ''}`;

        if (saved && saved.optionId) {
            const opt = p.options.find(o => o.id === saved.optionId);
            h += `<div class="card card-glow text-center" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 0.5rem;">✅ اختيارك</div>
                <div style="font-size: 1.05rem;">${opt ? escapeHtml(opt.label) : ''}</div>
                ${opt && opt.tag ? `<div class="tag" style="display: inline-block; margin-top: 0.5rem;">${escapeHtml(opt.tag)}</div>` : ''}
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.changeAnswer('${p.saveKey}')">عدّل إجابتي</button>
            </div>`;
        } else {
            h += `<div class="choice-grid">`;
            p.options.forEach(opt => {
                h += `<button class="choice-option" onclick="window.submitSingleChoice('${p.saveKey}','${opt.id}')">
                    ${escapeHtml(opt.label)}
                </button>`;
            });
            h += `</div>`;
        }
        return h + '</div>';
    }

    function renderSixCardsAnalysis(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="subtitle text-center mb-3">${escapeHtml(p.subtitle)}</p>` : ''}
            <div class="six-cards-grid">`;
        p.cards.forEach((c, i) => {
            h += `<div class="card fade-in-delay-${Math.min(i + 1, 6)}">
                <div style="color: var(--gold); font-size: 1.5rem; font-weight: 800;">${c.num}</div>
                <div style="font-weight: 600; margin-top: 0.25rem;">${escapeHtml(c.label)}</div>
                <span class="tag mt-2">${escapeHtml(c.tag)}</span>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderRevealName(p) {
        return `<div class="phase-display text-center">
            <h2 class="subtitle mb-3">${escapeHtml(p.title)}</h2>
            <div class="card card-glow" style="border: 2px solid var(--gold);">
                <h1 class="gold-text" style="font-size: clamp(3rem, 8vw, 5rem); font-weight: 900;">${escapeHtml(p.revealWord)}</h1>
                <p class="mt-2" style="color: var(--text-secondary); font-size: 1.1rem;">${escapeHtml(p.revealSubtitle)}</p>
            </div>
        </div>`;
    }

    function renderAxisIntro(p) {
        const axis = SessionData.mindsetAxes[p.axisIndex];
        return `<div class="phase-display text-center">
            <p class="subtitle" style="letter-spacing: 2px;">${escapeHtml(p.title)}</p>
            <h1 class="mt-2" style="color: ${axis.color};">${escapeHtml(axis.name)}</h1>
            <p class="mt-3" style="font-size: 1.2rem; color: var(--text-primary);">${escapeHtml(axis.question)}</p>
            <div class="card mt-4">
                <div class="flex justify-between gap-3">
                    <div style="flex: 1; text-align: center;">
                        <div style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(axis.poles.negative)}</div>
                    </div>
                    <div style="color: var(--gold);">⟷</div>
                    <div style="flex: 1; text-align: center;">
                        <div style="color: ${axis.color}; font-weight: 600;">${escapeHtml(axis.poles.positive)}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function renderAxisScenario(p) {
        const axis = SessionData.mindsetAxes[p.axisIndex];
        let h = `<div class="phase-display">
            <h2 class="text-center mb-2" style="color: ${axis.color};">${escapeHtml(axis.name)}</h2>
            <div class="card card-glow mb-3">
                <p style="line-height: 1.9; color: var(--text-secondary); white-space: pre-line;">${escapeHtml(p.situation)}</p>
            </div>
            <div class="compare-columns">`;
        p.poles.forEach(pole => {
            const color = pole.side === 'positive' ? axis.color : '#dc2626';
            h += `<div class="compare-col" style="border-top: 3px solid ${color};">
                <h3 style="color: ${color};">${escapeHtml(pole.title)}</h3>
                <p style="color: var(--text-secondary); font-style: italic;">"${escapeHtml(pole.text)}"</p>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderAxisQuestions(p) {
        const axisKey = p.axisKey;
        const axis = SessionData.mindsetAxes.find(a => a.key === axisKey);
        const questions = SessionData.axisQuestions[axisKey] || [];
        const saved = S.currentResponses[p.saveKey] || {};

        let h = `<div class="phase-display">
            <h2 class="text-center mb-2" style="color: ${axis.color};">${escapeHtml(axis.name)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;

        if (saved.locked) {
            h += `<div class="card card-glow text-center" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700;">✅ تم تسجيل إجاباتك</div>
                <p class="mt-2" style="color: var(--text-muted); font-size: 0.85rem;">استنى النتيجة على الشاشة الكبيرة</p>
                <div class="mt-2"><strong>متوسطك:</strong> <span style="color: ${axis.color}; font-size: 1.5rem; font-weight: 800;">${(saved.avg || 0).toFixed(1)}</span> / 5</div>
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.unlockAxis('${p.saveKey}','${axisKey}')">عدّل إجاباتي</button>
            </div>`;
        } else {
            questions.forEach((q, qi) => {
                const currentVal = (S.pendingLikerts[axisKey] || {})[qi];
                h += `<div class="card mb-3">
                    <p style="font-weight: 600; margin-bottom: 1rem;">${qi + 1}. ${escapeHtml(q.text)}</p>
                    <div class="likert-scale">`;
                for (let v = 1; v <= 5; v++) {
                    const checked = currentVal === v ? 'checked' : '';
                    h += `<label class="likert-option">
                        <input type="radio" name="${axisKey}_q${qi}" value="${v}" ${checked} onchange="window.recordLikert('${axisKey}',${qi},${v})">
                        <div class="likert-circle">${v}</div>
                    </label>`;
                }
                h += `</div>
                    <div class="likert-labels">
                        <span>${escapeHtml(q.poles[1])}</span>
                        <span>${escapeHtml(q.poles[0])}</span>
                    </div>
                </div>`;
            });
            h += `<button class="btn btn-gold btn-large w-full mt-3" onclick="window.submitAxisQuestions('${p.saveKey}','${axisKey}')">احفظ إجاباتي</button>`;
        }
        return h + '</div>';
    }

    function renderRadarFingerprint(p) {
        return `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="radar-container">
                <canvas id="participantRadar" width="400" height="400"></canvas>
            </div>
            <div id="radarSummary" class="mt-3"></div>
        </div>`;
    }

    function buildParticipantRadar() {
        const canvas = document.getElementById('participantRadar');
        if (!canvas || typeof Chart === 'undefined') return;

        const labels = SessionData.mindsetAxes.map(a => a.name);
        const data = SessionData.mindsetAxes.map(a => {
            const saved = S.currentResponses['axis_' + a.key];
            return (saved && saved.avg) ? saved.avg : 0;
        });

        const old = window.__getChartInstance();
        if (old) try { old.destroy(); } catch (e) {}

        const chart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels,
                datasets: [{
                    label: 'بصمتك',
                    data,
                    backgroundColor: 'rgba(251, 191, 36, 0.25)',
                    borderColor: 'rgba(251, 191, 36, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                    pointBorderColor: '#fff',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        min: 0, max: 5,
                        ticks: { stepSize: 1, color: 'rgba(255,255,255,0.5)', backdropColor: 'transparent' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#fbbf24', font: { family: 'Tajawal', size: 13, weight: '600' } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
        window.__setChartInstance(chart);

        // Summary text below
        const summary = document.getElementById('radarSummary');
        if (summary) {
            let h = '<div class="card"><h4 class="gold-text mb-2">قراءة بصمتك</h4>';
            SessionData.mindsetAxes.forEach((a, i) => {
                const v = data[i];
                if (v === 0) return;
                let interp = v >= 4 ? a.poles.positive : v <= 2 ? a.poles.negative : 'وسط';
                h += `<div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle);">
                    <span style="color: ${a.color};">${a.name}</span>
                    <span><strong style="color: ${a.color};">${v.toFixed(1)}</strong> — ${interp}</span>
                </div>`;
            });
            h += '</div>';
            summary.innerHTML = h;
        }
    }

    function renderTextInputs(p) {
        const saved = S.currentResponses[p.saveKey] || {};
        const isSaved = saved.locked;

        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;

        if (isSaved) {
            h += `<div class="card card-glow" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 1rem;">✅ ميثاقك محفوظ</div>`;
            p.inputs.forEach(inp => {
                h += `<div class="mb-2">
                    <div style="color: var(--gold); font-weight: 600;">${escapeHtml(inp.label)}</div>
                    <p style="color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.6;">${escapeHtml(saved[inp.key] || '')}</p>
                </div>`;
            });
            h += `</div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.unlockTextInputs('${p.saveKey}')">عدّل</button>
            </div>`;
        } else {
            p.inputs.forEach(inp => {
                const val = saved[inp.key] || '';
                h += `<div class="card mb-3">
                    <label>${escapeHtml(inp.label)}</label>
                    <textarea id="text_${p.saveKey}_${inp.key}" placeholder="${escapeHtml(inp.placeholder || '')}" rows="3">${escapeHtml(val)}</textarea>
                </div>`;
            });
            h += `<button class="btn btn-gold btn-large w-full mt-3" onclick="window.submitTextInputs('${p.saveKey}')">احفظ ميثاقي</button>`;
        }
        return h + '</div>';
    }

    function renderFourLayers(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="levels-container">`;
        p.layers.forEach((l, i) => {
            h += `<div class="card fade-in-delay-${i + 1}" style="border-right: 4px solid ${l.color}; text-align: right;">
                <h4 style="color: ${l.color};">${escapeHtml(l.name)}</h4>
                <p style="color: var(--text-secondary); margin-top: 0.25rem;">${escapeHtml(l.desc)}</p>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderThreeAxes(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;
        SessionData.nafsAxes.forEach((a, i) => {
            h += `<div class="card mb-2 fade-in-delay-${i + 1}" style="border-right: 4px solid ${a.color};">
                <h4 style="color: ${a.color};">${escapeHtml(a.name)}</h4>
                <p style="color: var(--text-primary); font-style: italic; margin-top: 0.25rem;">"${escapeHtml(a.question)}"</p>
                <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.95rem;">${escapeHtml(a.description)}</p>
            </div>`;
        });
        return h + '</div>';
    }

    function renderLossWrite(p) {
        const saved = S.currentResponses[p.saveKey] || {};
        const isSaved = saved.locked;
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;
        if (isSaved && saved.values) {
            h += `<div class="card card-glow" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 1rem;">✅ الخمسة محفوظين</div>`;
            saved.values.forEach((v, i) => {
                h += `<div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle);">
                    <span style="color: var(--gold); font-weight: 700; margin-left: 0.5rem;">${i + 1}.</span>${escapeHtml(v)}
                </div>`;
            });
            h += `</div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.unlockLoss('${p.saveKey}')">عدّل</button>
            </div>`;
        } else {
            for (let i = 0; i < 5; i++) {
                const v = (saved.values || [])[i] || '';
                h += `<div class="card mb-2">
                    <label>الحاجة ${i + 1}</label>
                    <input type="text" id="loss_${i}" placeholder="${i === 0 ? escapeHtml(p.placeholder || '') : ''}" value="${escapeHtml(v)}" maxlength="60">
                </div>`;
            }
            h += `<button class="btn btn-gold btn-large w-full mt-3" onclick="window.submitLossWrite('${p.saveKey}')">احفظ الخمسة</button>`;
        }
        return h + '</div>';
    }

    function renderLossDrop(p) {
        const written = S.currentResponses['loss_five_values'] || {};
        const saved = S.currentResponses[p.saveKey] || {};
        const values = written.values || [];

        if (!values.length) {
            return `<div class="phase-display text-center">
                <h2 class="gold-text mb-3">${escapeHtml(p.title)}</h2>
                <div class="card">
                    <p>⚠️ ارجع للمرحلة السابقة واكتب الخمس حاجات الأول</p>
                </div>
            </div>`;
        }

        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;

        if (saved.locked && saved.remaining) {
            const axis = SessionData.nafsAxes.find(a => a.key === saved.axisKey);
            h += `<div class="card card-glow" style="border-color: var(--green-sufi);">
                <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 0.5rem;">✅ اللي فضل</div>
                <div style="font-size: 1.4rem; color: var(--gold-light); font-weight: 700; padding: 1rem 0; text-align: center;">
                    "${escapeHtml(saved.remaining)}"
                </div>
                ${axis ? `<div class="mt-2" style="text-align: center;">
                    <div class="badge" style="background: ${axis.color}22; color: ${axis.color};">محورك المرشّح: ${axis.name}</div>
                </div>` : ''}
            </div>
            <div class="text-center mt-3">
                <button class="btn btn-ghost btn-small" onclick="window.unlockLossDrop('${p.saveKey}')">ابدأ من جديد</button>
            </div>`;
        } else {
            const dropped = saved.dropped || [];
            const remaining = values.filter((v, i) => !dropped.includes(i));
            const step = dropped.length;
            const stepLabel = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'][step] || '';

            if (step < 4 && remaining.length > 1) {
                h += `<div class="card mb-3" style="text-align: center;">
                    <div class="badge badge-gold">الخسارة ${stepLabel} من 4</div>
                    <p class="mt-2" style="color: var(--text-secondary);">اللي بتخسرها بسهولة — اللي إنت أقل واحدة بتتعلق بيها</p>
                </div>`;
                values.forEach((v, i) => {
                    if (dropped.includes(i)) return;
                    h += `<button class="choice-option mb-2" onclick="window.dropValue('${p.saveKey}',${i})">
                        <span style="text-decoration: line-through; color: var(--red-soft); margin-left: 0.5rem;">✕</span>
                        ${escapeHtml(v)}
                    </button>`;
                });
            } else {
                // الخامسة: اختار المحور
                const last = values.filter((v, i) => !dropped.includes(i))[0];
                h += `<div class="card card-glow" style="border-color: var(--gold);">
                    <p style="text-align: center;">الحاجة اللي فضلت معاك:</p>
                    <div style="font-size: 1.5rem; color: var(--gold-light); font-weight: 700; text-align: center; padding: 1rem 0;">
                        "${escapeHtml(last)}"
                    </div>
                    <p style="color: var(--text-secondary); text-align: center; margin-top: 1rem;">
                        تنتمي لأي محور؟
                    </p>
                </div>`;
                SessionData.nafsAxes.forEach(a => {
                    h += `<button class="choice-option mb-2" onclick="window.pickAxisFromLoss('${p.saveKey}','${a.key}','${escapeHtml(last).replace(/'/g, "\\'")}')">
                        <strong style="color: ${a.color};">${a.name}</strong> —
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${a.keywords.slice(0, 4).join('، ')}</span>
                    </button>`;
                });
            }
        }
        return h + '</div>';
    }

    function renderThreePatternsOverview(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;
        SessionData.behaviorPatterns.forEach((pat, i) => {
            h += `<div class="card mb-2 fade-in-delay-${i + 1}" style="border-right: 4px solid ${pat.color};">
                <div class="flex items-center gap-3">
                    <div style="font-size: 2rem; color: ${pat.color};">${pat.symbol}</div>
                    <div>
                        <h4 style="color: ${pat.color};">${escapeHtml(pat.name)}</h4>
                        <p style="color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">"${escapeHtml(pat.tagline)}"</p>
                    </div>
                </div>
            </div>`;
        });
        return h + '</div>';
    }

    function renderPatternDetail(p) {
        const pat = SessionData.behaviorPatterns.find(x => x.key === p.patternKey);
        return `<div class="phase-display">
            <p class="text-center subtitle" style="letter-spacing: 2px;">${escapeHtml(p.title)}</p>
            <h1 class="text-center mt-2" style="color: ${pat.color};">${escapeHtml(pat.name)}</h1>
            <p class="subtitle text-center mt-2 mb-3">"${escapeHtml(pat.description)}"</p>
            <div class="card mb-2">
                <h4 style="color: ${pat.color};">من أين يأتي؟</h4>
                <ul style="margin-top: 0.5rem; padding-right: 1.5rem;">
                    ${pat.sources.map(s => `<li style="margin: 0.4rem 0; color: var(--text-secondary);">${escapeHtml(s)}</li>`).join('')}
                </ul>
            </div>
            <div class="card mb-2" style="border-right: 3px solid var(--green-sufi);">
                <h4 style="color: var(--green-sufi);">القوة</h4>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">${escapeHtml(p.strength)}</p>
            </div>
            <div class="card mb-2" style="border-right: 3px solid var(--orange);">
                <h4 style="color: var(--orange);">الخطر</h4>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">${escapeHtml(p.risk)}</p>
            </div>
            <div class="card mb-2" style="border-right: 3px solid var(--red-soft);">
                <h4 style="color: var(--red-soft);">الأشد خطراً</h4>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">${escapeHtml(p.danger)}</p>
            </div>
        </div>`;
    }

    function renderSimpleIntro(p) {
        return `<div class="phase-display text-center">
            <h1 class="gold-text">${escapeHtml(p.title)}</h1>
            <p class="subtitle mt-3" style="font-size: 1.25rem;">${escapeHtml(p.subtitle || '')}</p>
        </div>`;
    }

    function renderBehaviorAssessment(p) {
        const saved = S.currentResponses[p.saveKey] || {};
        if (saved.locked) {
            return `<div class="phase-display text-center">
                <h2 class="gold-text mb-2">${escapeHtml(p.title)}</h2>
                <div class="card card-glow" style="border-color: var(--green-sufi);">
                    <div style="color: var(--green-sufi); font-weight: 700; margin-bottom: 1rem;">✅ تم تسجيل إجاباتك</div>
                    <p style="color: var(--text-muted);">استنى النتيجة على الشاشة الكبيرة</p>
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-ghost btn-small" onclick="window.unlockBehavior('${p.saveKey}')">عدّل إجاباتي</button>
                </div>
            </div>`;
        }

        const answers = saved.answers || {};
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;

        SessionData.behaviorQuestions.forEach((q, qi) => {
            const v = answers[qi];
            h += `<div class="card mb-3">
                <p style="font-weight: 600; margin-bottom: 1rem; font-size: 0.95rem;">${qi + 1}. ${escapeHtml(q.text)}</p>
                <div class="likert-scale">`;
            for (let val = 1; val <= 7; val++) {
                const checked = v === val ? 'checked' : '';
                h += `<label class="likert-option">
                    <input type="radio" name="bh_q${qi}" value="${val}" ${checked} onchange="window.recordBehavior(${qi},${val})">
                    <div class="likert-circle">${val}</div>
                </label>`;
            }
            h += `</div>
                <div class="likert-labels"><span>مش بشبهني</span><span>بيشبهني تماماً</span></div>
            </div>`;
        });
        h += `<button class="btn btn-gold btn-large w-full mt-3" onclick="window.submitBehavior('${p.saveKey}')">احسب نمطي</button>`;
        return h + '</div>';
    }

    function renderBehaviorResultPersonal(p) {
        const saved = S.currentResponses[p.sourceKey || 'behavior_assessment'];
        if (!saved || !saved.dominantPattern) return renderResultWait(p);

        const pat = SessionData.behaviorPatterns.find(x => x.key === saved.dominantPattern);
        const spectrum = saved.spectrumState || 'balance';
        const spectrumLabels = {
            'balance': 'الاتزان',
            'excess': 'الإفراط',
            'deficit': 'التفريط'
        };
        const spectrumColors = {
            'balance': 'var(--green-sufi)',
            'excess': 'var(--orange)',
            'deficit': 'var(--red-soft)'
        };

        return `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="card card-glow" style="border: 2px solid ${pat.color};">
                <div style="text-align: center;">
                    <div style="font-size: 3rem; color: ${pat.color};">${pat.symbol}</div>
                    <h3 style="color: ${pat.color}; margin-top: 0.5rem;">نمطك الرئيسي</h3>
                    <div style="font-size: 2rem; color: ${pat.color}; font-weight: 800; margin-top: 0.5rem;">${escapeHtml(pat.name)}</div>
                    <p style="color: var(--text-secondary); font-style: italic; margin-top: 0.5rem;">"${escapeHtml(pat.tagline)}"</p>
                </div>
            </div>
            <div class="card mt-3" style="text-align: center;">
                <div style="color: var(--text-muted); font-size: 0.9rem;">موقعك على الطيف</div>
                <div style="font-size: 1.5rem; color: ${spectrumColors[spectrum]}; font-weight: 700; margin-top: 0.5rem;">
                    ${spectrumLabels[spectrum] || 'الاتزان'}
                </div>
            </div>
        </div>`;
    }

    function renderKhaledReturn(p) {
        return `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="card card-glow" style="text-align: center;">
                <div style="font-size: 4rem;">🌙</div>
                <p style="margin-top: 1rem; color: var(--text-secondary); line-height: 1.8;">
                    خالد محوره الرئيسي <strong style="color: var(--gold);">التماسك</strong> — واضح من حياته كلها.<br>
                    ونمطه السلوكي <strong style="color: var(--gold);">الحزم</strong> — بيقفل صفقات، بيقود فرق.<br><br>
                    طب ليه بيصحى التلاتة الفجر؟
                </p>
                <p class="mt-3" style="color: var(--gold-light); font-weight: 600;">
                    الإجابة في طبقة لسه ما فتحناهاش.
                </p>
            </div>
        </div>`;
    }

    function renderRepressedAxis(p) {
        return `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="card mb-3">
                <p style="line-height: 1.8; color: var(--text-secondary);">${escapeHtml(p.description)}</p>
            </div>
            <div class="card card-glow" style="border: 2px solid var(--purple-light);">
                <div class="badge" style="background: rgba(167, 139, 250, 0.15); color: var(--purple-light);">قصة خالد كاملة</div>
                <p class="mt-2" style="line-height: 1.8; color: var(--text-secondary);">${escapeHtml(p.khaledStory)}</p>
            </div>
            <div class="card mt-3" style="text-align: center; border: 1px solid var(--gold);">
                <p style="color: var(--gold-light); font-style: italic;">
                    خد لحظة. اسأل نفسك بصدق:<br><br>
                    "في حد عندي زي خالد؟ هل أنا زي خالد؟"
                </p>
            </div>
        </div>`;
    }

    function renderTripleDistinction(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>`;
        p.rows.forEach((row, i) => {
            h += `<div class="card mb-3 fade-in-delay-${i + 1}" style="border-right: 4px solid ${row.color};">
                <div style="color: ${row.color}; font-weight: 700; font-size: 1.2rem; margin-bottom: 0.5rem;">${escapeHtml(row.type)}</div>
                <div style="color: var(--text-muted); font-size: 0.9rem;">${escapeHtml(row.desc)}</div>
                <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <div class="badge">${escapeHtml(row.feeling)}</div>
                </div>
                <div style="margin-top: 0.5rem; color: ${row.color}; font-style: italic;">${escapeHtml(row.question)}</div>
            </div>`;
        });
        return h + '</div>';
    }

    function renderPathsGrid(p) {
        let h = `<div class="phase-display">
            <h2 class="text-center gold-text mb-2">${escapeHtml(p.title)}</h2>
            <p class="subtitle text-center mb-3">${escapeHtml(p.subtitle || '')}</p>
            <div class="paths-grid">`;
        SessionData.nafsAxes.forEach(axis => {
            const paths = SessionData.recoveryPaths.filter(pa => pa.axis === axis.key);
            h += `<div class="path-group" style="border-top-color: ${axis.color};">
                <h4 style="color: ${axis.color};">${escapeHtml(axis.name)}</h4>
                <ul>${paths.map(pa => `<li>${escapeHtml(pa.name)}</li>`).join('')}</ul>
            </div>`;
        });
        return h + '</div></div>';
    }

    function renderVerseFinal(p) {
        return `<div class="phase-display">
            <div class="verse-final-container">
                <p class="subtitle" style="font-size: 1.2rem;">${escapeHtml(p.title)}</p>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">${escapeHtml(p.subtitle || '')}</p>
                <div class="arabic-verse mt-4">﴿ ${p.verse} ﴾</div>
                <div class="verse-ref">— ${escapeHtml(p.verseRef)}</div>
                <div class="mt-4" style="color: var(--gold); font-weight: 600;">
                    شكراً ليكم. على وقتكم. على ثقتكم.
                </div>
            </div>
        </div>`;
    }

    // ============================================================
    // ACTIONS — حفظ الإجابات
    // ============================================================

    window.submitSingleChoice = async function (saveKey, optionId) {
        try {
            const phase = Object.values(SessionData.phases).find(p => p.saveKey === saveKey);
            const opt = phase ? phase.options.find(o => o.id === optionId) : null;
            await SessionManager.saveResponse(S.participantId, saveKey, {
                optionId,
                optionLabel: opt ? opt.label : '',
                optionTag: opt ? (opt.tag || '') : ''
            });
            await SessionManager.updateParticipantStatus(S.participantId, { lastAnswer: opt ? opt.label : optionId });
            window.showToast('✅ اتسجّلت');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.changeAnswer = async function (saveKey) {
        try {
            await SessionManager.responsesRef(S.participantId).doc(saveKey).delete();
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    window.recordLikert = function (axisKey, qi, val) {
        S.setPendingLikert(axisKey, qi, val);
    };

    window.submitAxisQuestions = async function (saveKey, axisKey) {
        const responses = S.pendingLikerts[axisKey] || {};
        const questions = SessionData.axisQuestions[axisKey] || [];
        const filled = Object.keys(responses).length;
        if (filled < questions.length) {
            window.showToast('جاوب على كل الأسئلة الأول', 'error');
            return;
        }
        const values = Object.values(responses);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, {
                answers: responses,
                avg,
                locked: true
            });
            S.clearPending(axisKey);
            window.showToast('✅ اتحفظت');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.unlockAxis = async function (saveKey, axisKey) {
        try {
            const saved = S.currentResponses[saveKey];
            if (saved && saved.answers) {
                Object.entries(saved.answers).forEach(([qi, v]) => {
                    S.setPendingLikert(axisKey, parseInt(qi), v);
                });
            }
            await SessionManager.saveResponse(S.participantId, saveKey, { locked: false });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    window.submitTextInputs = async function (saveKey) {
        const phase = Object.values(SessionData.phases).find(p => p.saveKey === saveKey);
        if (!phase) return;
        const data = { locked: true };
        let allFilled = true;
        phase.inputs.forEach(inp => {
            const val = (document.getElementById(`text_${saveKey}_${inp.key}`).value || '').trim();
            if (inp.minLength && val.length < inp.minLength) allFilled = false;
            data[inp.key] = val;
        });
        if (!allFilled) { window.showToast('املأ كل السطور', 'error'); return; }
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, data);
            window.showToast('✅ ميثاقك محفوظ');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.unlockTextInputs = async function (saveKey) {
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, { locked: false });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    window.submitLossWrite = async function (saveKey) {
        const values = [];
        for (let i = 0; i < 5; i++) {
            const v = (document.getElementById('loss_' + i).value || '').trim();
            if (!v) { window.showToast('اكتب الخمسة كلهم', 'error'); return; }
            values.push(v);
        }
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, { values, locked: true });
            window.showToast('✅ اتحفظت');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.unlockLoss = async function (saveKey) {
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, { locked: false });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    window.dropValue = async function (saveKey, idx) {
        try {
            const saved = S.currentResponses[saveKey] || {};
            const dropped = (saved.dropped || []).concat([idx]);
            await SessionManager.saveResponse(S.participantId, saveKey, { dropped });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    window.pickAxisFromLoss = async function (saveKey, axisKey, remaining) {
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, {
                axisKey,
                remaining,
                locked: true
            });
            await SessionManager.updateParticipantStatus(S.participantId, { primaryAxis: axisKey });
            window.showToast('✅ تم تحديد محورك');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.unlockLossDrop = async function (saveKey) {
        try {
            await SessionManager.saveResponse(S.participantId, saveKey, { dropped: [], locked: false });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    // ============ Behavior assessment ============
    let pendingBehavior = {};

    window.recordBehavior = function (qi, val) {
        pendingBehavior[qi] = val;
    };

    window.submitBehavior = async function (saveKey) {
        const total = SessionData.behaviorQuestions.length;
        if (Object.keys(pendingBehavior).length < total) {
            window.showToast('جاوب على كل الأسئلة', 'error');
            return;
        }
        // Calculate dominant pattern
        const patternScores = { compliance: 0, assertive: 0, withdrawal: 0 };
        let balanceScore = 0;
        let excessScore = 0;
        let deficitScore = 0;

        SessionData.behaviorQuestions.forEach((q, qi) => {
            const val = pendingBehavior[qi] || 0;
            if (q.dim === 'pattern') {
                if (patternScores[q.maps] !== undefined) {
                    patternScores[q.maps] += val;
                }
            } else if (q.dim === 'spectrum') {
                if (q.maps === 'balance') balanceScore += val;
                else if (q.maps.startsWith('deficit')) deficitScore += val;
                else excessScore += val;
            }
        });

        const dominantPattern = Object.entries(patternScores).sort((a, b) => b[1] - a[1])[0][0];
        let spectrumState = 'balance';
        if (excessScore > balanceScore && excessScore > deficitScore) spectrumState = 'excess';
        else if (deficitScore > balanceScore) spectrumState = 'deficit';

        try {
            await SessionManager.saveResponse(S.participantId, saveKey, {
                answers: pendingBehavior,
                patternScores,
                dominantPattern,
                spectrumState,
                locked: true
            });
            pendingBehavior = {};
            window.showToast('✅ اتحفظت');
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) { window.showToast('فشل الحفظ', 'error'); }
    };

    window.unlockBehavior = async function (saveKey) {
        try {
            const saved = S.currentResponses[saveKey];
            if (saved && saved.answers) {
                pendingBehavior = { ...saved.answers };
            }
            await SessionManager.saveResponse(S.participantId, saveKey, { locked: false });
            await window.__reloadResponses();
            window.__renderPhase(S.currentSession.currentPhase);
        } catch (e) {}
    };

    // ============ Bootstrap ============
    document.addEventListener('DOMContentLoaded', () => {
        window.__participantInit();
    });

})();
