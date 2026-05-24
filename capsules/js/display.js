/* ============================================================
display.js — منطق شاشة العرض الكبيرة
تتبع المدرّب وتعرض المحتوى المجمّع
============================================================ */

(function () {
‘use strict’;

```
let currentSession = null;
let currentParticipants = [];
let timerInterval = null;
let localTimerSeconds = 0;
let chartInstance = null;

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function createStars() {
    const sb = document.getElementById('starsBackground');
    if (!sb) return;
    for (let i = 0; i < 150; i++) {
        const s = document.createElement('div');
        const r = Math.random();
        s.className = 'star ' + (r < 0.6 ? 'star-small' : r < 0.9 ? 'star-medium' : 'star-large');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.animationDelay = Math.random() * 4 + 's';
        sb.appendChild(s);
    }
}

// ============ Fullscreen on first click ============
function setupFullscreen() {
    document.addEventListener('click', () => {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }, { once: true });
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

// ============ Body dark mode ============
function setBodyDark(isDark) {
    document.body.classList.toggle('is-dark', !!isDark);
}

// ============ Session changes ============
function handleSessionChange(session) {
    const prev = currentSession ? currentSession.currentPhase : null;
    currentSession = session;
    syncTimer(session);
    if (prev !== session.currentPhase) {
        destroyChart();
        renderPhase(session.currentPhase);
    }
}

function handleParticipantsChange(list) {
    currentParticipants = list;
    document.getElementById('participantCountDisplay').textContent = list.length + ' مشارك';

    // إعادة الرسم لو المرحلة الحالية بتعرض نتائج جماعية
    if (currentSession) {
        const phase = SessionData.phases[currentSession.currentPhase];
        if (phase && needsLiveResults(phase)) {
            renderPhase(currentSession.currentPhase);
        }
    }
}

function needsLiveResults(phase) {
    const t = phase.template;
    return t === 'bar-chart-result' || t === 'pie-chart-result' ||
           t === 'axis-result' || t === 'axes-distribution' ||
           t === 'radar-fingerprint' || t === 'behavior-result' ||
           t === 'single-choice-poll' || t === 'six-cards-choice' ||
           t === 'axis-questions' || t === 'behavior-assessment' ||
           t === 'text-inputs' || t === 'loss-write-five' || t === 'loss-drop-four';
}

function destroyChart() {
    if (chartInstance) {
        try { chartInstance.destroy(); } catch (e) {}
        chartInstance = null;
    }
}

// ============================================================
// RENDER DISPATCHER
// ============================================================
function renderPhase(phaseId) {
    const phase = SessionData.phases[phaseId];
    const container = document.getElementById('displayContent');
    if (!container) return;

    // إخفاء/إظهار الـ dark overlay
    const isDark = phase && (phase.isDark || phase.template === 'dark-narrative' ||
                   phase.template === 'dark-list-fade' || phase.template === 'simple-bridge' ||
                   phase.template === 'big-question-dark');
    setBodyDark(isDark);

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
        case 'single-choice-poll':      html = renderPollLive(phase); break;
        case 'bar-chart-result':        html = renderBarChartResult(phase); setTimeout(() => buildBarChart(phase), 200); break;
        case 'pie-chart-result':        html = renderPieChartResult(phase); setTimeout(() => buildPieChart(phase), 200); break;
        case 'two-column-compare':     html = renderTwoColumnCompare(phase); break;
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
        case 'six-cards-choice':        html = renderSixCardsLive(phase); break;
        case 'six-cards-analysis':      html = renderSixCardsAnalysis(phase); break;
        case 'reveal-name':             html = renderRevealName(phase); break;
        case 'axis-intro':              html = renderAxisIntro(phase); break;
        case 'axis-scenario':           html = renderAxisScenario(phase); break;
        case 'axis-questions':          html = renderAxisQuestionsLive(phase); break;
        case 'axis-result':             html = renderAxisResult(phase); setTimeout(() => buildAxisResultChart(phase), 200); break;
        case 'radar-fingerprint':       html = renderRadarFingerprint(phase); setTimeout(() => buildGroupRadar(), 200); break;
        case 'text-inputs':             html = renderTextInputsLive(phase); break;
        case 'four-layers-nested':      html = renderFourLayers(phase); break;
        case 'three-axes-pie':          html = renderThreeAxes(phase); break;
        case 'loss-write-five':         html = renderLossLive(phase); break;
        case 'loss-drop-four':          html = renderLossLive(phase); break;
        case 'axes-distribution':       html = renderAxesDistribution(phase); break;
        case 'three-patterns-overview': html = renderThreePatternsOverview(phase); break;
        case 'pattern-detail':          html = renderPatternDetail(phase); break;
        case 'simple-intro':            html = renderSimpleIntro(phase); break;
        case 'behavior-assessment':     html = renderBehaviorLive(phase); break;
        case 'behavior-result':         html = renderBehaviorResult(phase); break;
        case 'khaled-return':           html = renderKhaledReturn(phase); break;
        case 'repressed-axis':          html = renderRepressedAxis(phase); break;
        case 'triple-distinction-table': html = renderTripleDistinction(phase); break;
        case 'paths-grid':              html = renderPathsGrid(phase); break;
        case 'verse-final':             html = renderVerseFinal(phase); break;
        default:
            html = `<div class="text-center">
                <h1 class="display-h1 gold-text">${escapeHtml(phase.title)}</h1>
                ${phase.subtitle ? `<p class="display-subtitle">${escapeHtml(phase.subtitle)}</p>` : ''}
            </div>`;
    }
    container.innerHTML = html;
}

// ============================================================
// RENDER TEMPLATES — large screen versions
// ============================================================

function renderWaiting() {
    return `<div class="text-center">
        <h1 class="display-h1 gold-text">Reignite</h1>
        <p class="display-subtitle">Burnout to Brilliance Program</p>
        <div class="loading-spinner mx-auto mt-4" style="width: 60px; height: 60px;"></div>
        <p class="mt-3" style="color: var(--text-muted); font-size: 1.25rem;">في انتظار بدء اللقاء...</p>
    </div>`;
}

function renderWelcomeLogo(p) {
    return `<div class="text-center">
        <h1 class="display-very-massive gold-text" style="letter-spacing: -3px;">${escapeHtml(p.title)}</h1>
        <p class="display-subtitle" style="color: var(--gold); letter-spacing: 4px; margin-top: 1.5rem;">${escapeHtml(p.subtitle || '')}</p>
        <p class="mt-4" style="color: var(--text-muted); font-size: 1rem;">${escapeHtml(p.footer || '')}</p>
    </div>`;
}

function renderCharter(p) {
    let h = `<div>
        <h2 class="display-h2 gold-text mb-5">${escapeHtml(p.title)}</h2>
        <div class="display-charter">`;
    p.points.forEach((pt, i) => {
        h += `<div class="display-charter-card fade-in-delay-${i + 1}">
            <div class="display-charter-num">${pt.num}</div>
            <div class="display-charter-title">${escapeHtml(pt.title)}</div>
            <div class="display-charter-body">${escapeHtml(pt.body)}</div>
        </div>`;
    });
    return h + '</div></div>';
}

function renderPhoneSetup(p) {
    return `<div class="text-center">
        <h2 class="display-h2 gold-text mb-4">📱 افتح موبايلك</h2>
        <p class="display-subtitle" style="margin-bottom: 3rem;">${escapeHtml(p.subtitle)}</p>
        <div class="display-charter-card" style="max-width: 600px; margin: 0 auto;">
            <div style="font-size: 5rem;">📋</div>
            <p style="font-size: 1.5rem; margin-top: 1rem; line-height: 1.8;">${escapeHtml(p.instructions)}</p>
            <div class="mt-4" style="font-size: 2.5rem; font-weight: 800; color: var(--gold);">
                <span id="liveCountReg">${currentParticipants.length}</span>
                <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">مشارك متصل</span>
            </div>
        </div>
    </div>`;
}

function renderBigQuestionDark(p) {
    return `<div class="text-center" style="max-width: 1400px;">
        <h1 class="display-question" style="color: white; font-weight: 300; line-height: 1.5;">
            ${escapeHtml(p.title)}
        </h1>
    </div>`;
}

function renderPollLive(p) {
    // عرض السؤال + عدد اللي جاوبوا (حي)
    const answered = currentParticipants.filter(pa => pa.lastAnswer).length;
    return `<div class="text-center">
        <h1 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h1>
        ${p.subtitle ? `<p class="display-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="mt-5">
            <div style="font-size: 3rem;">📱</div>
            <p style="font-size: 1.5rem; color: var(--text-muted); margin-top: 1rem;">
                افتحوا موبايلكم — السؤال متاح للإجابة
            </p>
            <div class="mt-4" style="font-size: 4rem; font-weight: 800; color: var(--gold);">
                ${answered} / ${currentParticipants.length}
            </div>
            <p style="font-size: 1.25rem; color: var(--text-muted);">أجابوا حتى الآن</p>
        </div>
    </div>`;
}

function renderBarChartResult(p) {
    return `<div style="width: 100%; max-width: 1200px;">
        <h1 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h1>
        ${p.subtitle ? `<p class="display-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-chart-wrap mx-auto mt-4">
            <canvas id="displayBarChart"></canvas>
        </div>
    </div>`;
}

function renderPieChartResult(p) {
    return `<div style="width: 100%; max-width: 1100px;">
        <h1 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h1>
        ${p.subtitle ? `<p class="display-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-chart-wrap display-pie-wrap mx-auto mt-4">
            <canvas id="displayPieChart"></canvas>
        </div>
    </div>`;
}

function renderTwoColumnCompare(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-5">${escapeHtml(p.title)}</h2>
        <div class="display-compare">`;
    p.columns.forEach(col => {
        h += `<div class="display-compare-col" style="border-top: 4px solid ${col.color};">
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
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-5">${escapeHtml(p.title)}</h2>
        <div class="display-three-circles">`;
    p.levels.forEach((l, i) => {
        h += `<div class="display-circle fade-in-delay-${i + 1}" style="border-color: ${l.color};">
            <h4 style="color: ${l.color};">${escapeHtml(l.name)}</h4>
            <p>${escapeHtml(l.desc)}</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderDegrees(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-5">${escapeHtml(p.title)}</h2>
        <div class="display-three-circles">`;
    p.degrees.forEach((d, i) => {
        h += `<div class="display-circle fade-in-delay-${i + 1}" style="border-color: ${d.color};">
            <h4 style="color: ${d.color};">${escapeHtml(d.count)}</h4>
            <p style="font-size: 1.1rem; margin-top: 0.5rem;">${escapeHtml(d.label)}</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderNameOnly(p) {
    return `<div class="text-center">
        <p class="display-subtitle" style="letter-spacing: 4px;">تعرّف على</p>
        <h1 class="display-very-massive gold-text mt-4">${escapeHtml(p.title)}</h1>
    </div>`;
}

function renderProfileCard(p) {
    let h = `<div style="max-width: 1200px; width: 100%;">
        <h2 class="display-h2 gold-text text-center mb-5">${escapeHtml(p.title)}</h2>
        <div class="display-profile">
            <div class="display-profile-photo">👤</div>
            <ul class="display-profile-bullets">`;
    p.profileBullets.forEach(b => h += `<li>${escapeHtml(b)}</li>`);
    return h + `</ul></div></div>`;
}

function renderDarkNarrative(p) {
    let h = `<div class="display-dark-narrative">
        <h2>${escapeHtml(p.title)}</h2>`;
    p.paragraphs.forEach((par, i) => {
        h += `<p class="fade-in-delay-${Math.min(i + 1, 5)}">${escapeHtml(par)}</p>`;
    });
    return h + '</div>';
}

function renderRevealText(p) {
    return `<div class="text-center" style="max-width: 1200px;">
        <h2 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p class="display-subtitle mb-5">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-charter-card" style="max-width: 800px; margin: 0 auto;">
            <div class="badge badge-gold" style="font-size: 1rem;">اسمه</div>
            <h2 class="mt-3" style="color: var(--gold-light); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800;">${escapeHtml(p.revealName)}</h2>
            <p class="mt-3" style="font-size: 1.5rem; color: var(--text-secondary); line-height: 1.7;">${escapeHtml(p.revealDesc)}</p>
        </div>
    </div>`;
}

function renderDarkListFade(p) {
    let h = `<div class="display-dark-narrative">
        <h2 class="gold-text">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle" style="margin-bottom: 2rem;">${escapeHtml(p.subtitle || '')}</p>
        <div style="max-width: 800px; width: 100%;">`;
    p.items.forEach((it, i) => {
        h += `<div class="display-charter-card mb-2 fade-in-delay-${Math.min(i + 1, 6)}" style="padding: 1rem 2rem; font-size: 1.5rem;">${escapeHtml(it)}</div>`;
    });
    return h + `<p class="mt-5" style="color: var(--gold-light); font-style: italic; font-size: 1.5rem;">${escapeHtml(p.footer || '')}</p></div></div>`;
}

function renderSimpleBridge(p) {
    return `<div class="display-dark-narrative">
        <h1 class="display-h1 gold-text">${escapeHtml(p.title)}</h1>
        <p class="display-subtitle mt-4" style="font-size: 2rem;">${escapeHtml(p.subtitle)}</p>
    </div>`;
}

function renderBreak(p) {
    return `<div class="text-center">
        <div style="font-size: 8rem;">☕</div>
        <h1 class="display-h1 gold-text mt-3">${escapeHtml(p.title)}</h1>
        <p class="display-subtitle">${escapeHtml(p.subtitle)}</p>
    </div>`;
}

function renderSectionTitle(p) {
    return `<div class="text-center">
        <p class="display-subtitle" style="letter-spacing: 8px; color: var(--text-muted);">${escapeHtml(p.subtitle || '')}</p>
        <div class="divider divider-gold mt-3 mb-4" style="max-width: 500px; margin-left: auto; margin-right: auto;"></div>
        <h1 class="display-very-massive gold-text">${escapeHtml(p.title)}</h1>
    </div>`;
}

function renderSituationText(p) {
    return `<div style="max-width: 1200px;">
        <h2 class="display-h2 gold-text text-center mb-4">${escapeHtml(p.title)}</h2>
        <div class="display-charter-card mb-4">
            <p style="white-space: pre-line; font-size: 1.5rem; line-height: 1.9; color: var(--text-primary);">${escapeHtml(p.situation)}</p>
        </div>
        ${p.finalQuestion ? `
        <div class="display-charter-card" style="border: 3px solid var(--gold); background: rgba(251,191,36,0.05);">
            <p class="text-center" style="color: var(--gold-light); font-size: 1.75rem; font-weight: 600; line-height: 1.6;">
                ${escapeHtml(p.finalQuestion)}
            </p>
        </div>` : ''}
    </div>`;
}

function renderSixCardsLive(p) {
    const answered = currentParticipants.filter(pa => pa.lastAnswer).length;
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p class="display-subtitle mb-4">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-six-grid">`;
    p.options.forEach((opt, i) => {
        h += `<div class="display-six-card fade-in-delay-${Math.min(i + 1, 6)}">
            <div class="num">${i + 1}</div>
            <div class="label">${escapeHtml(opt.label)}</div>
            ${opt.tag ? `<div class="tag">${escapeHtml(opt.tag)}</div>` : ''}
        </div>`;
    });
    h += `</div>
        <div class="text-center mt-5">
            <div style="font-size: 3rem; font-weight: 800; color: var(--gold);">${answered} / ${currentParticipants.length}</div>
            <p style="color: var(--text-muted);">أجابوا</p>
        </div>
    </div>`;
    return h;
}

function renderSixCardsAnalysis(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p class="display-subtitle mb-4">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-six-grid">`;
    p.cards.forEach((c, i) => {
        h += `<div class="display-six-card fade-in-delay-${Math.min(i + 1, 6)}">
            <div class="num">${c.num}</div>
            <div class="label">${escapeHtml(c.label)}</div>
            <div class="tag">${escapeHtml(c.tag)}</div>
        </div>`;
    });
    return h + '</div></div>';
}

function renderRevealName(p) {
    return `<div class="text-center" style="max-width: 1200px;">
        <p class="display-subtitle" style="margin-bottom: 2rem;">${escapeHtml(p.title)}</p>
        <div class="display-charter-card" style="border: 3px solid var(--gold); padding: 4rem 3rem;">
            <h1 class="display-very-massive gold-text">${escapeHtml(p.revealWord)}</h1>
            <p class="mt-4" style="font-size: 1.75rem; color: var(--text-secondary); line-height: 1.7;">${escapeHtml(p.revealSubtitle)}</p>
        </div>
    </div>`;
}

function renderAxisIntro(p) {
    const axis = SessionData.mindsetAxes[p.axisIndex];
    return `<div class="text-center" style="max-width: 1200px;">
        <p class="display-subtitle" style="letter-spacing: 3px; color: var(--text-muted);">${escapeHtml(p.title)}</p>
        <h1 class="display-very-massive mt-2" style="color: ${axis.color};">${escapeHtml(axis.name)}</h1>
        <p class="mt-4" style="font-size: 2rem; color: var(--text-primary); font-style: italic;">${escapeHtml(axis.question)}</p>
        <div class="mt-5 flex justify-between items-center" style="max-width: 800px; margin-left: auto; margin-right: auto; gap: 2rem;">
            <div style="flex: 1; text-align: center;">
                <div style="color: var(--text-muted); font-size: 1.5rem;">${escapeHtml(axis.poles.negative)}</div>
            </div>
            <div style="color: var(--gold); font-size: 3rem;">⟷</div>
            <div style="flex: 1; text-align: center;">
                <div style="color: ${axis.color}; font-size: 1.5rem; font-weight: 700;">${escapeHtml(axis.poles.positive)}</div>
            </div>
        </div>
    </div>`;
}

function renderAxisScenario(p) {
    const axis = SessionData.mindsetAxes[p.axisIndex];
    let h = `<div style="max-width: 1400px;">
        <h2 class="text-center mb-4" style="color: ${axis.color}; font-size: clamp(2rem, 4vw, 3rem);">${escapeHtml(axis.name)}</h2>
        <div class="display-charter-card mb-5">
            <p style="font-size: 1.5rem; line-height: 1.9; color: var(--text-primary); white-space: pre-line;">${escapeHtml(p.situation)}</p>
        </div>
        <div class="display-compare">`;
    p.poles.forEach(pole => {
        const color = pole.side === 'positive' ? axis.color : '#dc2626';
        h += `<div class="display-compare-col" style="border-top: 4px solid ${color};">
            <h3 style="color: ${color};">${escapeHtml(pole.title)}</h3>
            <p style="color: var(--text-secondary); font-style: italic; font-size: 1.25rem; line-height: 1.7;">"${escapeHtml(pole.text)}"</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderAxisQuestionsLive(p) {
    const axis = SessionData.mindsetAxes.find(a => a.key === p.axisKey);
    let answered = 0;
    currentParticipants.forEach(() => {});  // tally below in async path
    return `<div class="text-center" style="max-width: 1100px;">
        <h2 class="display-h2 mb-3" style="color: ${axis.color};">${escapeHtml(axis.name)}</h2>
        <p class="display-subtitle">${escapeHtml(p.subtitle || '')}</p>
        <div class="mt-5">
            <div style="font-size: 4rem;">📱</div>
            <p style="font-size: 1.5rem; color: var(--text-muted); margin-top: 1.5rem;">
                3 أسئلة على موبايلك — اقرا بهدوء وجاوب بصدق
            </p>
            <div id="liveAnswered" class="mt-4" style="font-size: 3.5rem; font-weight: 800; color: ${axis.color};">
                — / ${currentParticipants.length}
            </div>
            <p style="color: var(--text-muted);">سجّلوا إجاباتهم</p>
        </div>
    </div>`;
}

function renderAxisResult(p) {
    const axis = SessionData.mindsetAxes[p.axisIndex];
    return `<div style="max-width: 1100px;">
        <h2 class="display-h2 text-center mb-3" style="color: ${axis.color};">${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p class="display-subtitle text-center">${escapeHtml(p.subtitle)}</p>` : ''}
        <div class="display-chart-wrap mt-4">
            <canvas id="displayAxisChart"></canvas>
        </div>
        <div class="text-center mt-3" id="displayAxisAvg" style="font-size: 2rem; color: var(--gold);"></div>
    </div>`;
}

function renderRadarFingerprint(p) {
    return `<div style="max-width: 1100px; width: 100%;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-4">${escapeHtml(p.subtitle || '')}</p>
        <div class="display-chart-wrap display-radar-wrap mx-auto">
            <canvas id="displayRadarChart"></canvas>
        </div>
        <p class="text-center mt-3" style="color: var(--text-muted); font-size: 1.1rem;">متوسط القاعة على المحاور الخمسة</p>
    </div>`;
}

function renderTextInputsLive(p) {
    return `<div class="text-center" style="max-width: 1100px;">
        <h2 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="font-size: 5rem;">✍️</div>
        <p style="font-size: 1.5rem; color: var(--text-muted); margin-top: 1rem;">
            اكتب لنفسك على موبايلك
        </p>
        <div class="mt-4">
            <div id="liveCharterCount" style="font-size: 3rem; font-weight: 800; color: var(--gold);">
                — / ${currentParticipants.length}
            </div>
            <p style="color: var(--text-muted);">كتبوا ميثاقهم</p>
        </div>
    </div>`;
}

function renderFourLayers(p) {
    let h = `<div style="max-width: 1100px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="position: relative; padding: 2rem;">`;
    // عرض كدوائر متداخلة
    const sizes = [400, 300, 200, 100];
    p.layers.forEach((l, i) => {
        const size = sizes[i] || 80;
        const opacity = 0.1 + (i * 0.15);
        h += `<div style="
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: ${size}px; height: ${size}px;
            border: 3px solid ${l.color};
            border-radius: 50%;
            background: ${l.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')};
            display: flex; align-items: center; justify-content: center;
            z-index: ${i + 1};
        "><div style="color: ${l.color}; font-weight: 800; font-size: 1.5rem;">${escapeHtml(l.name)}</div></div>`;
    });
    h += `<div style="height: 450px;"></div></div>
    <div class="mt-3" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">`;
    p.layers.forEach(l => {
        h += `<div style="text-align: center; color: ${l.color};">
            <strong>${escapeHtml(l.name)}</strong>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">${escapeHtml(l.desc)}</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderThreeAxes(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div class="display-three-circles">`;
    SessionData.nafsAxes.forEach((a, i) => {
        h += `<div class="display-circle fade-in-delay-${i + 1}" style="border-color: ${a.color}; width: 280px; height: 280px;">
            <h4 style="color: ${a.color}; font-size: 1.8rem;">${escapeHtml(a.name)}</h4>
            <p style="font-style: italic; margin-top: 0.5rem; color: var(--text-primary); font-size: 1.1rem;">"${escapeHtml(a.question)}"</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderLossLive(p) {
    return `<div class="text-center" style="max-width: 1100px;">
        <h2 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="font-size: 5rem;">🤲</div>
        <p style="font-size: 1.5rem; color: var(--text-muted); margin-top: 1.5rem;">
            التجربة على موبايلك — خد وقتك بهدوء
        </p>
    </div>`;
}

function renderAxesDistribution(p) {
    // حساب التوزيع من إجابات loss_remaining
    return `<div style="max-width: 1100px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-4">${escapeHtml(p.subtitle || '')}</p>
        <div id="axesDistribution" class="display-axis-bars">
            <div style="text-align: center;"><div class="loading-spinner mx-auto"></div></div>
        </div>
    </div>`;
}

function renderThreePatternsOverview(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div class="display-three-circles">`;
    SessionData.behaviorPatterns.forEach((pat, i) => {
        h += `<div class="display-circle fade-in-delay-${i + 1}" style="border-color: ${pat.color}; width: 280px; height: 280px;">
            <div style="font-size: 5rem; color: ${pat.color}; line-height: 1;">${pat.symbol}</div>
            <h4 style="color: ${pat.color}; margin-top: 0.5rem; font-size: 1.5rem;">${escapeHtml(pat.name)}</h4>
            <p style="margin-top: 0.5rem; color: var(--text-secondary); font-style: italic;">"${escapeHtml(pat.tagline)}"</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderPatternDetail(p) {
    const pat = SessionData.behaviorPatterns.find(x => x.key === p.patternKey);
    return `<div style="max-width: 1300px; width: 100%;">
        <div class="text-center">
            <p class="display-subtitle" style="letter-spacing: 3px;">${escapeHtml(p.title)}</p>
            <h1 class="display-h1 mt-2" style="color: ${pat.color};">${escapeHtml(pat.name)}</h1>
            <p class="display-subtitle" style="margin-top: 1rem; font-style: italic;">"${escapeHtml(pat.description)}"</p>
        </div>
        <div class="mt-5" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem;">
            <div class="display-charter-card" style="border-top: 4px solid ${pat.color};">
                <h4 style="color: ${pat.color};">المصادر</h4>
                <ul style="margin-top: 1rem; padding-right: 1.5rem;">
                    ${pat.sources.map(s => `<li style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 1.05rem;">${escapeHtml(s)}</li>`).join('')}
                </ul>
            </div>
            <div class="display-charter-card" style="border-top: 4px solid var(--green-sufi);">
                <h4 style="color: var(--green-sufi);">القوة</h4>
                <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 1.1rem; line-height: 1.7;">${escapeHtml(p.strength)}</p>
            </div>
            <div class="display-charter-card" style="border-top: 4px solid var(--red-soft);">
                <h4 style="color: var(--red-soft);">الخطر</h4>
                <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6;">${escapeHtml(p.risk)}</p>
                <p style="margin-top: 0.5rem; color: var(--orange); font-size: 1rem; font-style: italic;">عند الانكسار: ${escapeHtml(p.danger)}</p>
            </div>
        </div>
    </div>`;
}

function renderSimpleIntro(p) {
    return `<div class="text-center" style="max-width: 1100px;">
        <h1 class="display-h1 gold-text">${escapeHtml(p.title)}</h1>
        <p class="display-subtitle mt-3" style="font-size: 1.75rem;">${escapeHtml(p.subtitle || '')}</p>
    </div>`;
}

function renderBehaviorLive(p) {
    return `<div class="text-center" style="max-width: 1100px;">
        <h2 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="font-size: 5rem;">📋</div>
        <p style="font-size: 1.5rem; color: var(--text-muted); margin-top: 1.5rem;">
            12 سؤال — 7 دقايق — اقرا بهدوء وجاوب بصدق
        </p>
        <div class="mt-4" id="behaviorAnswered" style="font-size: 3rem; font-weight: 800; color: var(--gold);">
            — / ${currentParticipants.length}
        </div>
        <p style="color: var(--text-muted);">أكملوا المقياس</p>
    </div>`;
}

function renderBehaviorResult(p) {
    return `<div style="max-width: 1200px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-4">${escapeHtml(p.subtitle || '')}</p>
        <div id="behaviorResultBars" class="display-axis-bars">
            <div style="text-align: center;"><div class="loading-spinner mx-auto"></div></div>
        </div>
    </div>`;
}

function renderKhaledReturn(p) {
    return `<div class="text-center" style="max-width: 1200px;">
        <h2 class="display-h2 gold-text mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="font-size: 7rem;">🌙</div>
        <p class="mt-3" style="font-size: 1.75rem; color: var(--gold-light); font-weight: 600;">
            الإجابة في طبقة لسه ما فتحناهاش.
        </p>
    </div>`;
}

function renderRepressedAxis(p) {
    return `<div style="max-width: 1200px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div class="display-charter-card mb-3">
            <p style="font-size: 1.4rem; line-height: 1.9; color: var(--text-primary);">${escapeHtml(p.description)}</p>
        </div>
        <div class="display-charter-card" style="border: 3px solid var(--purple-light);">
            <div class="badge" style="background: rgba(167, 139, 250, 0.15); color: var(--purple-light); font-size: 1rem;">قصة خالد كاملة</div>
            <p class="mt-3" style="font-size: 1.35rem; line-height: 1.9; color: var(--text-secondary);">${escapeHtml(p.khaledStory)}</p>
        </div>
    </div>`;
}

function renderTripleDistinction(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem;">`;
    p.rows.forEach((row, i) => {
        h += `<div class="display-charter-card fade-in-delay-${i + 1}" style="border-top: 5px solid ${row.color};">
            <h3 style="color: ${row.color}; font-size: 1.75rem;">${escapeHtml(row.type)}</h3>
            <p style="color: var(--text-muted); margin-top: 0.5rem;">${escapeHtml(row.desc)}</p>
            <div class="mt-3">
                <div class="badge" style="font-size: 0.9rem;">${escapeHtml(row.feeling)}</div>
            </div>
            <p class="mt-3" style="color: ${row.color}; font-style: italic; font-size: 1.2rem;">${escapeHtml(row.question)}</p>
        </div>`;
    });
    return h + '</div></div>';
}

function renderPathsGrid(p) {
    let h = `<div style="max-width: 1400px;">
        <h2 class="display-h2 gold-text text-center mb-3">${escapeHtml(p.title)}</h2>
        <p class="display-subtitle text-center mb-5">${escapeHtml(p.subtitle || '')}</p>
        <div class="display-paths">`;
    SessionData.nafsAxes.forEach(axis => {
        const paths = SessionData.recoveryPaths.filter(pa => pa.axis === axis.key);
        h += `<div class="display-path-group" style="border-top-color: ${axis.color};">
            <h4 style="color: ${axis.color};">${escapeHtml(axis.name)}</h4>
            <ul>${paths.map(pa => `<li>${escapeHtml(pa.name)}</li>`).join('')}</ul>
        </div>`;
    });
    return h + '</div></div>';
}

function renderVerseFinal(p) {
    return `<div class="display-verse">
        <p class="display-subtitle" style="font-size: 1.75rem;">${escapeHtml(p.title)}</p>
        <p style="color: var(--text-secondary); margin-top: 1rem; font-size: 1.4rem;">${escapeHtml(p.subtitle || '')}</p>
        <div class="verse-text mt-5">﴿ ${p.verse} ﴾</div>
        <div class="verse-ref mt-3">— ${escapeHtml(p.verseRef)}</div>
        <div class="mt-5" style="color: var(--gold-light); font-size: 1.4rem;">
            شكراً ليكم
        </div>
    </div>`;
}

// ============================================================
// CHARTS — Chart.js builders
// ============================================================

async function buildBarChart(phase) {
    const canvas = document.getElementById('displayBarChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const counts = await tallyOptions(phase);
    destroyChart();
    chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: phase.options.map(o => truncateLabel(o.label, 40)),
            datasets: [{
                data: phase.options.map(o => counts[o.id] || 0),
                backgroundColor: phase.options.map(o => o.color || '#fbbf24'),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: '#cbd5e1', stepSize: 1, font: { family: 'Tajawal', size: 14 } },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: '#fbbf24', font: { family: 'Tajawal', size: 13, weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });
    // ضبط ارتفاع
    canvas.parentElement.style.height = (phase.options.length * 60 + 80) + 'px';
}

async function buildPieChart(phase) {
    const canvas = document.getElementById('displayPieChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const counts = await tallyOptions(phase);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    destroyChart();
    chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: phase.options.map(o => truncateLabel(o.label, 50)),
            datasets: [{
                data: phase.options.map(o => counts[o.id] || 0),
                backgroundColor: phase.options.map(o => o.color || '#fbbf24'),
                borderColor: '#0a0e27',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#cbd5e1', font: { family: 'Tajawal', size: 14 }, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const v = ctx.parsed;
                            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                            return `${ctx.label}: ${v} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
    canvas.parentElement.style.height = '500px';
}

async function buildAxisResultChart(phase) {
    const canvas = document.getElementById('displayAxisChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const axis = SessionData.mindsetAxes[phase.axisIndex];
    // اجمع كل المتوسطات من المشاركين
    const buckets = { negative: 0, mid: 0, positive: 0 };
    let total = 0;
    let sumAvg = 0;
    for (const p of currentParticipants) {
        try {
            const r = await SessionManager.getResponse(p.id, phase.sourceKey);
            if (r && typeof r.avg === 'number') {
                sumAvg += r.avg;
                total++;
                if (r.avg <= 2) buckets.negative++;
                else if (r.avg >= 4) buckets.positive++;
                else buckets.mid++;
            }
        } catch (e) {}
    }
    const groupAvg = total > 0 ? (sumAvg / total).toFixed(1) : 0;

    destroyChart();
    chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [axis.poles.negative, 'وسط', axis.poles.positive],
            datasets: [{
                data: [buckets.negative, buckets.mid, buckets.positive],
                backgroundColor: ['#dc2626', '#94a3b8', axis.color],
                borderRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#cbd5e1', stepSize: 1, font: { family: 'Tajawal', size: 14 } },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#fbbf24', font: { family: 'Tajawal', size: 16, weight: '700' } },
                    grid: { display: false }
                }
            }
        }
    });
    canvas.parentElement.style.height = '400px';
    const avgEl = document.getElementById('displayAxisAvg');
    if (avgEl) avgEl.innerHTML = `متوسط القاعة: <strong style="color: ${axis.color};">${groupAvg}</strong> / 5`;
}

async function buildGroupRadar() {
    const canvas = document.getElementById('displayRadarChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const axisData = {};
    SessionData.mindsetAxes.forEach(a => axisData[a.key] = { sum: 0, count: 0 });

    for (const p of currentParticipants) {
        for (const a of SessionData.mindsetAxes) {
            try {
                const r = await SessionManager.getResponse(p.id, 'axis_' + a.key);
                if (r && typeof r.avg === 'number') {
                    axisData[a.key].sum += r.avg;
                    axisData[a.key].count++;
                }
            } catch (e) {}
        }
    }
    const data = SessionData.mindsetAxes.map(a => {
        const d = axisData[a.key];
        return d.count > 0 ? (d.sum / d.count) : 0;
    });

    destroyChart();
    chartInstance = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: SessionData.mindsetAxes.map(a => a.name),
            datasets: [{
                label: 'متوسط القاعة',
                data,
                backgroundColor: 'rgba(251, 191, 36, 0.25)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                pointBorderColor: '#fff',
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    min: 0, max: 5,
                    ticks: { stepSize: 1, color: 'rgba(255,255,255,0.5)', backdropColor: 'transparent', font: { size: 12 } },
                    grid: { color: 'rgba(255,255,255,0.15)' },
                    angleLines: { color: 'rgba(255,255,255,0.15)' },
                    pointLabels: { color: '#fbbf24', font: { family: 'Tajawal', size: 18, weight: '700' } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ============ Tally helpers ============
async function tallyOptions(phase) {
    const counts = {};
    phase.options.forEach(o => counts[o.id] = 0);
    for (const p of currentParticipants) {
        try {
            const r = await SessionManager.getResponse(p.id, phase.saveKey);
            if (r && r.optionId && counts[r.optionId] !== undefined) {
                counts[r.optionId]++;
            }
        } catch (e) {}
    }
    return counts;
}

function truncateLabel(label, max) {
    if (!label || label.length <= max) return label;
    return label.substring(0, max) + '...';
}

// ============ Render axes distribution after participants pick ============
async function buildAxesDistribution() {
    const container = document.getElementById('axesDistribution');
    if (!container) return;
    const counts = {};
    SessionData.nafsAxes.forEach(a => counts[a.key] = 0);
    for (const p of currentParticipants) {
        try {
            const r = await SessionManager.getResponse(p.id, 'loss_remaining');
            if (r && r.axisKey && counts[r.axisKey] !== undefined) {
                counts[r.axisKey]++;
            }
        } catch (e) {}
    }
    let h = '';
    SessionData.nafsAxes.forEach(a => {
        h += `<div class="display-axis-bar" style="border-top: 4px solid ${a.color};">
            <div class="axis-name" style="color: ${a.color};">${escapeHtml(a.name)}</div>
            <div class="axis-count" style="color: ${a.color};">${counts[a.key]}</div>
            <p style="color: var(--text-muted); font-size: 0.9rem;">مشارك</p>
        </div>`;
    });
    container.innerHTML = h;
}

// ============ Render behavior result bars ============
async function buildBehaviorResultBars() {
    const container = document.getElementById('behaviorResultBars');
    if (!container) return;
    const counts = { compliance: 0, assertive: 0, withdrawal: 0 };
    const spectrum = { balance: 0, excess: 0, deficit: 0 };
    for (const p of currentParticipants) {
        try {
            const r = await SessionManager.getResponse(p.id, 'behavior_assessment');
            if (r && r.dominantPattern && counts[r.dominantPattern] !== undefined) {
                counts[r.dominantPattern]++;
                if (r.spectrumState && spectrum[r.spectrumState] !== undefined) {
                    spectrum[r.spectrumState]++;
                }
            }
        } catch (e) {}
    }
    let h = '';
    SessionData.behaviorPatterns.forEach(pat => {
        h += `<div class="display-axis-bar" style="border-top: 4px solid ${pat.color};">
            <div style="font-size: 2.5rem; color: ${pat.color};">${pat.symbol}</div>
            <div class="axis-name" style="color: ${pat.color};">${escapeHtml(pat.name)}</div>
            <div class="axis-count" style="color: ${pat.color};">${counts[pat.key]}</div>
            <p style="color: var(--text-muted); font-size: 0.9rem;">مشارك</p>
        </div>`;
    });
    // إضافة معلومة عن الطيف أسفل
    h += `<div style="grid-column: 1 / -1; text-align: center; margin-top: 1.5rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 16px;">
        <div style="color: var(--text-muted); margin-bottom: 0.5rem;">الموقع على الطيف</div>
        <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;">
            <div><strong style="color: var(--green-sufi); font-size: 1.5rem;">${spectrum.balance}</strong> اتزان</div>
            <div><strong style="color: var(--orange); font-size: 1.5rem;">${spectrum.excess}</strong> إفراط</div>
            <div><strong style="color: var(--red-soft); font-size: 1.5rem;">${spectrum.deficit}</strong> تفريط</div>
        </div>
    </div>`;
    container.innerHTML = h;
}

// إعادة بناء النتائج الجماعية حسب المرحلة عند تغير المشاركين
setInterval(() => {
    if (!currentSession) return;
    const phase = SessionData.phases[currentSession.currentPhase];
    if (!phase) return;
    if (phase.template === 'axes-distribution') buildAxesDistribution();
    if (phase.template === 'behavior-result') buildBehaviorResultBars();
}, 5000);

// ============ Init ============
function init() {
    createStars();
    setupFullscreen();
    SessionManager.onSessionChange(handleSessionChange);
    SessionManager.onParticipantsChange(handleParticipantsChange);
}

if (!window.firebaseReady) {
    document.addEventListener('firebaseReady', init);
} else {
    init();
}
```

})();