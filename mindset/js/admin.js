// ========================================
// منظور الفؤاد - منطق لوحة المدرّب
// admin.js
// ========================================

let currentSession = null;
let currentParticipants = [];
let currentGroups = [];
let showParticipantAnswers = false;
let timerInterval = null;
let localTimerSeconds = 0;
let isTimerRunning = false;

// انتظار جاهزية Firebase
function bootstrap() {
    if (!window.firebaseReady) {
        document.addEventListener('firebaseReady', init);
    } else {
        init();
    }
}

async function init() {
    console.log('🚀 تهيئة لوحة المدرّب...');
    createStars();

    // ضمان وجود جلسة
    let session = await SessionManager.getSession();
    if (!session) {
        session = await SessionManager.initSession();
        showToast('تم إنشاء جلسة جديدة');
    }

    // الاستماع للتغييرات
    SessionManager.onSessionChange(handleSessionChange);
    SessionManager.onParticipantsChange(handleParticipantsChange);
    SessionManager.onGroupsChange(handleGroupsChange);

    // بناء قائمة المراحل
    buildPhaseList();
    console.log('✅ لوحة المدرّب جاهزة');
}

// ====================================
// إنشاء النجوم
// ====================================
function createStars() {
    const container = document.getElementById('starsBackground');
    for (let i = 0; i < 80; i++) {
        const star = document.createElement('div');
        const size = Math.random();
        star.className = 'star ' + (size < 0.6 ? 'star-small' : size < 0.9 ? 'star-medium' : 'star-large');
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 4 + 's';
        container.appendChild(star);
    }
}

// ====================================
// التعامل مع تغييرات الجلسة
// ====================================
function handleSessionChange(session) {
    currentSession = session;
    
    // تحديث المرحلة المعروضة
    updateCurrentPhaseDisplay(session.currentPhase);
    
    // مزامنة المؤقت
    if (session.timerRunning && session.timerSeconds > 0) {
        const elapsed = session.timerStartedAt ? Math.floor((Date.now() - session.timerStartedAt) / 1000) : 0;
        localTimerSeconds = Math.max(0, session.timerSeconds - elapsed);
        if (!isTimerRunning) startLocalTimer();
    } else {
        if (isTimerRunning) stopLocalTimer();
        if (!session.timerRunning) {
            localTimerSeconds = session.timerSeconds || 0;
            updateTimerDisplay();
        }
    }
}

function handleParticipantsChange(participants) {
    currentParticipants = participants;
    document.getElementById('participantCount').textContent = participants.length;
    renderParticipantsGrid();
}

function handleGroupsChange(groups) {
    currentGroups = groups;
    // إعادة رسم تحكمات المرحلة إذا كانت مرحلة المجموعات
    if (currentSession && (currentSession.currentPhase === 'osama_groups_work' || currentSession.currentPhase === 'osama_protocol')) {
        renderPhaseControls(currentSession.currentPhase);
    }
}

// ====================================
// بناء قائمة المراحل في الشريط الجانبي
// ====================================
function buildPhaseList() {
    const list = document.getElementById('phaseList');
    const phases = SessionData.phaseOrder;
    const sessionTitles = {
        0: '⏳ قبل البداية',
        1: '🌅 الجلسة الأولى: الافتتاح',
        2: '🪜 الجلسة الثانية: دويك',
        3: '🛡️ الجلسة الثالثة: المناعة',
        4: '🤝 الجلسة الرابعة: أسامة',
        5: '🕊️ الجلسة الخامسة: الختام'
    };

    let html = '';
    let currentSessionGroup = -1;

    phases.forEach(phaseId => {
        const phase = SessionData.phases[phaseId];
        if (!phase) return;

        if (phase.session !== currentSessionGroup) {
            if (currentSessionGroup !== -1) html += '</div>';
            currentSessionGroup = phase.session;
            html += `<div class="phase-session-group">
                <div class="phase-session-title">${sessionTitles[phase.session] || '—'}</div>`;
        }

        const isBreak = phase.isBreak ? 'break' : '';
        html += `<div class="phase-item ${isBreak}" data-phase="${phaseId}" onclick="setPhase('${phaseId}')">
            ${phase.title}
        </div>`;
    });
    html += '</div>';

    list.innerHTML = html;
}

// ====================================
// تحديث عرض المرحلة الحالية
// ====================================
function updateCurrentPhaseDisplay(phaseId) {
    const phase = SessionData.phases[phaseId];
    if (!phase) return;

    // تحديث العناوين
    document.getElementById('phaseTitle').textContent = phase.title;
    document.getElementById('phaseSubtitle').textContent = phase.subtitle || '';
    document.getElementById('phaseBlockBadge').textContent = phase.block || '—';
    document.getElementById('currentPhaseLabel').textContent = phase.title;

    // تظليل المرحلة في القائمة
    document.querySelectorAll('.phase-item').forEach(item => {
        item.classList.toggle('active', item.dataset.phase === phaseId);
    });

    // التمرير للمرحلة النشطة
    const activeItem = document.querySelector('.phase-item.active');
    if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // بناء تحكمات المرحلة
    renderPhaseControls(phaseId);
}

// ====================================
// بناء تحكمات خاصة بكل مرحلة
// ====================================
function renderPhaseControls(phaseId) {
    const controls = document.getElementById('phaseControls');
    const phase = SessionData.phases[phaseId];
    if (!phase) {
        controls.innerHTML = '<p style="color: var(--text-muted);">لا تحكمات خاصة لهذه المرحلة</p>';
        return;
    }

    let html = '';

    // ===== مرحلة الانتظار =====
    if (phaseId === 'waiting') {
        html = `
            <div class="control-section">
                <h4>قبل البداية</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    شارك الرابط مع المشاركين ليدخلوا على هواتفهم.<br>
                    عدد الذين دخلوا: <strong style="color: var(--gold);">${currentParticipants.length}</strong>
                </p>
                <button class="btn btn-gold btn-large" onclick="setPhase('intro_welcome')">
                    🚀 ابدأ التدريب
                </button>
            </div>
        `;
    }

    // ===== التعارف الذكي =====
    else if (phaseId === 'intro_introductions') {
        html = `
            <div class="control-section">
                <h4>التعارف الذكي</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    المشاركون يجاوبون على سؤال واحد من ٤. اضغط على اسم مشارك ليظهر إجابته على شاشة العرض.
                </p>
                <button class="btn btn-gold" onclick="enableParticipantHighlight()">
                    عرض إجابات المشاركين على الشاشة الكبيرة
                </button>
            </div>
        `;
    }

    // ===== الشفرة =====
    else if (phaseId === 'intro_code') {
        html = `
            <div class="control-section">
                <h4>تحدي الشفرة</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    المجموعات تحاول حل الشفرة في ٧ دقائق.<br>
                    الحل: <strong>الواقع = ٥</strong> (عدد الحروف)
                </p>
                <div class="flex gap-2">
                    <button class="btn btn-gold" onclick="setTimer(420); toggleTimer();">▶ ابدأ التايمر ٧ دق</button>
                    <button class="btn btn-outline" onclick="setPhase('intro_code_reveal')">كشف الإجابة</button>
                </div>
            </div>
        `;
    }

    // ===== مواقف دويك =====
    else if (phaseId.includes('_situation') && phase.session === 2) {
        html = `
            <div class="control-section">
                <h4>${phase.title}</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    ${phase.situation}
                </p>
                <h5 style="color: var(--gold); margin-bottom: 0.5rem;">أسئلة النقاش:</h5>
                <ul style="color: var(--text-secondary); margin-right: 1.5rem; margin-bottom: 1rem;">
                    ${phase.questions.map(q => `<li style="margin-bottom: 0.5rem;">${q}</li>`).join('')}
                </ul>
                <button class="btn btn-gold" onclick="setTimer(240); toggleTimer();">▶ ابدأ نقاش ٤ دقائق</button>
            </div>
        `;
    }

    // ===== أسئلة التشخيص =====
    else if (phaseId.includes('_questions') && phase.session === 2) {
        const diff = SessionData.dweck_differences[phase.differenceIndex];
        html = `
            <div class="control-section">
                <h4>${phase.title}</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    ٥ أسئلة تشخيصية على موبايل كل مشارك. عداد الإجابات:
                </p>
                <div id="diagnosticProgress" class="card" style="background: rgba(0,0,0,0.3);">
                    <div>المشاركون اللي خلصوا: <strong id="diagCount" style="color: var(--gold);">0</strong> / ${currentParticipants.length}</div>
                </div>
            </div>
        `;
        // تحديث العداد لاحقاً
        setTimeout(() => updateDiagnosticCount(diff.key), 500);
    }

    // ===== الخريطة العنكبوتية =====
    else if (phaseId === 'dweck_radar') {
        html = `
            <div class="control-section">
                <h4>عرض النتائج</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    كل مشارك يرى خريطته العنكبوتية الشخصية على هاتفه.
                </p>
                <button class="btn btn-gold" onclick="showResultsOnDisplay()">
                    📊 اعرض الإحصائيات الجماعية على الشاشة
                </button>
                <div class="mt-3" id="aggregatedStats"></div>
            </div>
        `;
        setTimeout(() => updateAggregatedStats(), 500);
    }

    // ===== اختيار الفرق =====
    else if (phaseId === 'dweck_choose_focus') {
        html = `
            <div class="control-section">
                <h4>اختيار الفرق</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    المشاركون يختارون فرق واحد للعمل عليه باقي اليوم.
                </p>
                <div id="focusDistribution" class="card" style="background: rgba(0,0,0,0.3);"></div>
            </div>
        `;
        setTimeout(() => updateFocusDistribution(), 500);
    }

    // ===== التطبيق الذاتي للمناعة =====
    else if (phaseId === 'immunity_personal_work') {
        html = `
            <div class="control-section">
                <h4>خريطة المناعة الشخصية</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    كل مشارك يعمل على ٥ مربعات مع شريك. الوقت المطلوب: ٣٥ دقيقة.
                </p>
                <div class="flex gap-2 mb-2">
                    <button class="btn btn-ghost" onclick="setTimer(300); toggleTimer();">▶ ٥ دق</button>
                    <button class="btn btn-ghost" onclick="setTimer(420); toggleTimer();">▶ ٧ دق</button>
                    <button class="btn btn-ghost" onclick="setTimer(600); toggleTimer();">▶ ١٠ دق</button>
                </div>
                <div id="immunityProgress" class="card" style="background: rgba(0,0,0,0.3);"></div>
            </div>
        `;
        setTimeout(() => updateImmunityProgress(), 500);
    }

    // ===== جلسة أسامة - عمل المجموعات =====
    else if (phaseId === 'osama_groups_work') {
        html = `
            <div class="control-section">
                <h4>إعداد المجموعات الخمس</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    اضغط على "إنشاء المجموعات" لتوزيع المشاركين تلقائياً على ٥ مداخل.
                </p>
                <button class="btn btn-gold mb-3" onclick="createOsamaGroups()">
                    🎯 إنشاء المجموعات الـ٥
                </button>
                <button class="btn btn-outline mb-3" onclick="setTimer(900); toggleTimer();">▶ ابدأ ١٥ دقيقة عمل</button>
                <div class="groups-grid" id="groupsDisplay"></div>
            </div>
        `;
        setTimeout(() => renderGroupsDisplay(), 500);
    }

    // ===== بروتوكول أسامة =====
    else if (phaseId === 'osama_protocol') {
        html = `
            <div class="control-section">
                <h4>البروتوكول المبني</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    اقتراحات المجموعات الـ٥ على شاشة العرض.
                </p>
                <div class="groups-grid" id="protocolDisplay"></div>
            </div>
        `;
        setTimeout(() => renderProtocolDisplay(), 500);
    }

    // ===== الميثاق =====
    else if (phaseId === 'closing_charter') {
        html = `
            <div class="control-section">
                <h4>الميثاق الشخصي</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    كل مشارك يملأ ميثاقه على هاتفه. ٥ دقائق لكتابة الميثاق.
                </p>
                <button class="btn btn-gold mb-3" onclick="setTimer(300); toggleTimer();">▶ ٥ دقايق للميثاق</button>
                <div id="chartersProgress" class="card" style="background: rgba(0,0,0,0.3);"></div>
            </div>
        `;
        setTimeout(() => updateChartersProgress(), 500);
    }

    // ===== الطبائع =====
    else if (phaseId.startsWith('nature_')) {
        const nature = phase.data;
        const colorMap = {
            'nature_1': '#fbbf24', 'nature_2': '#ec4899', 'nature_3': '#f59e0b',
            'nature_4': '#8b5cf6', 'nature_5': '#3b82f6', 'nature_6': '#6366f1',
            'nature_7': '#eab308', 'nature_8': '#dc2626', 'nature_9': '#10b981'
        };
        html = `
            <div class="control-section">
                <h4>${phase.title}</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${phase.subtitle}</p>
                <div class="card" style="background: rgba(0,0,0,0.3); border-color: ${colorMap[phaseId]};">
                    <div style="margin-bottom: 1rem;">
                        <div style="color: var(--gold); margin-bottom: 0.3rem;">الالتزام المخفي:</div>
                        <strong>${nature.hidden_commitment}</strong>
                    </div>
                    <div>
                        <div style="color: var(--gold); margin-bottom: 0.3rem;">الافتراض الكبير:</div>
                        <strong>${nature.big_assumption}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== مرحلة افتراضية =====
    else {
        html = `
            <div class="control-section">
                <h4>${phase.title}</h4>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${phase.subtitle || 'استمر للمرحلة التالية'}</p>
            </div>
        `;
    }

    controls.innerHTML = html;
}

// ====================================
// عرض المشاركين
// ====================================
function renderParticipantsGrid() {
    const grid = document.getElementById('participantsGrid');
    if (!grid) return;

    if (currentParticipants.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">لم يدخل أي مشارك بعد...</p>';
        return;
    }

    grid.innerHTML = currentParticipants.map(p => `
        <div class="participant-card online" onclick="showParticipantDetails('${p.id}')">
            <div class="name">${p.name || 'بدون اسم'}</div>
            <div class="status">${formatStatus(p)}</div>
            ${showParticipantAnswers && p.lastAnswer ? `<div class="answer">${p.lastAnswer}</div>` : ''}
        </div>
    `).join('');
}

function formatStatus(participant) {
    if (!participant.lastSeen) return 'متصل';
    const now = Date.now();
    const lastSeen = participant.lastSeen.toDate ? participant.lastSeen.toDate().getTime() : participant.lastSeen;
    const diff = (now - lastSeen) / 1000;
    if (diff < 30) return '🟢 متصل الآن';
    if (diff < 120) return '🟡 متصل';
    return '⚪ غائب';
}

async function showParticipantDetails(id) {
    const full = await SessionManager.getParticipantFull(id);
    if (!full) return;
    
    const responses = full.responses || {};
    let detailsHTML = `<h3>${full.name}</h3><div class="divider"></div>`;
    
    if (responses.intro) {
        detailsHTML += `<div class="mb-2"><strong>التعارف:</strong><br>${responses.intro.answer || '—'}</div>`;
    }
    
    Object.keys(responses).forEach(key => {
        if (key.startsWith('dweck_')) {
            const data = responses[key];
            detailsHTML += `<div class="mb-1"><strong>${key}:</strong> متوسط ${data.avg || '—'}</div>`;
        }
    });
    
    if (responses.immunity) {
        detailsHTML += `<div class="mt-3"><strong>المناعة:</strong><br>الالتزام المخفي: ${responses.immunity.hidden_commitment || '—'}</div>`;
    }

    if (responses.charter) {
        detailsHTML += `<div class="mt-3"><strong>الميثاق:</strong><br>${responses.charter.weekly_commitment || '—'}</div>`;
    }
    
    showModal(detailsHTML);
}

function toggleParticipantsView() {
    showParticipantAnswers = !showParticipantAnswers;
    document.getElementById('participantsViewLabel').textContent = 
        showParticipantAnswers ? 'إخفاء الإجابات' : 'عرض الإجابات';
    renderParticipantsGrid();
}

// ====================================
// التنقل بين المراحل
// ====================================
async function setPhase(phaseId) {
    const phase = SessionData.phases[phaseId];
    if (!phase) {
        showToast('مرحلة غير موجودة', 'error');
        return;
    }
    await SessionManager.setPhase(phaseId);
    showToast(`📍 ${phase.title}`);
}

async function goNextPhase() {
    if (!currentSession) return;
    const idx = SessionData.phaseOrder.indexOf(currentSession.currentPhase);
    if (idx < 0 || idx >= SessionData.phaseOrder.length - 1) {
        showToast('المرحلة الأخيرة');
        return;
    }
    await setPhase(SessionData.phaseOrder[idx + 1]);
}

async function goPreviousPhase() {
    if (!currentSession) return;
    const idx = SessionData.phaseOrder.indexOf(currentSession.currentPhase);
    if (idx <= 0) {
        showToast('المرحلة الأولى');
        return;
    }
    await setPhase(SessionData.phaseOrder[idx - 1]);
}

// ====================================
// المؤقت
// ====================================
async function setTimer(seconds) {
    localTimerSeconds = seconds;
    updateTimerDisplay();
    await SessionManager.sessionRef().update({
        timerSeconds: seconds,
        timerRunning: false,
        timerStartedAt: null
    });
}

async function toggleTimer() {
    if (isTimerRunning) {
        await SessionManager.stopTimer();
    } else {
        await SessionManager.startTimer(localTimerSeconds);
    }
}

async function resetTimer() {
    localTimerSeconds = 0;
    isTimerRunning = false;
    stopLocalTimer();
    await SessionManager.sessionRef().update({
        timerSeconds: 0,
        timerRunning: false,
        timerStartedAt: null
    });
    updateTimerDisplay();
}

function startLocalTimer() {
    isTimerRunning = true;
    document.getElementById('timerToggle').textContent = '⏸';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (localTimerSeconds > 0) {
            localTimerSeconds--;
            updateTimerDisplay();
        } else {
            stopLocalTimer();
            showToast('انتهى الوقت!');
            // إيقاف التايمر في Firebase
            SessionManager.stopTimer();
        }
    }, 1000);
}

function stopLocalTimer() {
    isTimerRunning = false;
    document.getElementById('timerToggle').textContent = '▶';
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;
    const mins = Math.floor(localTimerSeconds / 60);
    const secs = localTimerSeconds % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    display.classList.remove('warning', 'danger');
    if (localTimerSeconds <= 30 && localTimerSeconds > 0) display.classList.add('danger');
    else if (localTimerSeconds <= 60 && localTimerSeconds > 0) display.classList.add('warning');
}

// ====================================
// إحصاءات وعدّادات
// ====================================
async function updateDiagnosticCount(diffKey) {
    let count = 0;
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        if (responses[`dweck_${diffKey}`] && responses[`dweck_${diffKey}`].avg) count++;
    }
    const el = document.getElementById('diagCount');
    if (el) el.textContent = count;
}

async function updateAggregatedStats() {
    const stats = {};
    SessionData.dweck_differences.forEach(d => stats[d.key] = { sum: 0, count: 0 });
    
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        SessionData.dweck_differences.forEach(d => {
            if (responses[`dweck_${d.key}`] && responses[`dweck_${d.key}`].avg) {
                stats[d.key].sum += responses[`dweck_${d.key}`].avg;
                stats[d.key].count++;
            }
        });
    }

    const el = document.getElementById('aggregatedStats');
    if (!el) return;
    let html = '<table class="stats-table"><thead><tr><th>الفرق</th><th>المتوسط الجماعي</th><th>عدد المجاوبين</th></tr></thead><tbody>';
    SessionData.dweck_differences.forEach(d => {
        const avg = stats[d.key].count > 0 ? (stats[d.key].sum / stats[d.key].count).toFixed(2) : '—';
        html += `<tr><td>${d.name}</td><td>${avg}</td><td>${stats[d.key].count}</td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

async function updateFocusDistribution() {
    const dist = {};
    SessionData.dweck_differences.forEach(d => dist[d.key] = 0);
    
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        if (responses.dweck_focus && responses.dweck_focus.choice) {
            dist[responses.dweck_focus.choice] = (dist[responses.dweck_focus.choice] || 0) + 1;
        }
    }
    
    const el = document.getElementById('focusDistribution');
    if (!el) return;
    let html = '<table class="stats-table"><thead><tr><th>الفرق</th><th>اختاره</th></tr></thead><tbody>';
    SessionData.dweck_differences.forEach(d => {
        html += `<tr><td>${d.name}</td><td><strong style="color: ${d.color}">${dist[d.key]}</strong></td></tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

async function updateImmunityProgress() {
    let count = 0;
    let completed = 0;
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        if (responses.immunity) {
            count++;
            if (responses.immunity.stated_goal && responses.immunity.hidden_commitment && responses.immunity.big_assumption) completed++;
        }
    }
    const el = document.getElementById('immunityProgress');
    if (el) el.innerHTML = `بدأ: <strong style="color:var(--gold)">${count}</strong> | أكمل: <strong style="color:var(--green-sufi)">${completed}</strong> / ${currentParticipants.length}`;
}

async function updateChartersProgress() {
    let count = 0;
    for (const p of currentParticipants) {
        const charter = await SessionManager.getCharter(p.id);
        if (charter) count++;
    }
    const el = document.getElementById('chartersProgress');
    if (el) el.innerHTML = `وقّع الميثاق: <strong style="color: var(--gold);">${count}</strong> / ${currentParticipants.length}`;
}

// ====================================
// إنشاء مجموعات أسامة
// ====================================
async function createOsamaGroups() {
    if (currentParticipants.length < 5) {
        showToast('تحتاج على الأقل ٥ مشاركين', 'error');
        return;
    }
    
    // خلط المشاركين عشوائياً
    const shuffled = [...currentParticipants].sort(() => Math.random() - 0.5);
    const groupAssignments = {};
    const dimensions = SessionData.osama_dimensions;
    
    // توزيع كل مشارك على مدخل
    dimensions.forEach((dim, idx) => {
        groupAssignments[`group_${idx + 1}`] = {
            name: `مجموعة ${dim.name}`,
            dimension: dim.key,
            members: []
        };
    });
    
    shuffled.forEach((p, idx) => {
        const groupIdx = idx % dimensions.length;
        const groupKey = `group_${groupIdx + 1}`;
        groupAssignments[groupKey].members.push({ id: p.id, name: p.name });
    });
    
    // تخصيص كل مشارك لمجموعته
    for (const groupKey in groupAssignments) {
        for (const member of groupAssignments[groupKey].members) {
            await SessionManager.updateParticipantStatus(member.id, {
                groupId: groupKey,
                groupDimension: groupAssignments[groupKey].dimension
            });
        }
    }
    
    await SessionManager.setupGroups(groupAssignments);
    showToast('✅ تم إنشاء المجموعات الـ٥');
    setTimeout(() => renderGroupsDisplay(), 500);
}

async function renderGroupsDisplay() {
    const el = document.getElementById('groupsDisplay');
    if (!el) return;

    if (currentGroups.length === 0) {
        el.innerHTML = '<p style="color: var(--text-muted);">لم تُنشأ المجموعات بعد...</p>';
        return;
    }

    const colorMap = {};
    SessionData.osama_dimensions.forEach(d => colorMap[d.key] = d.color);

    el.innerHTML = currentGroups.map(g => {
        const dim = SessionData.osama_dimensions.find(d => d.key === g.dimension);
        return `
            <div class="group-card" style="border-color: ${colorMap[g.dimension] || 'var(--gold)'};">
                <h5 style="color: ${colorMap[g.dimension] || 'var(--gold)'};">${g.name}</h5>
                <div class="members">
                    ${g.members.map(m => m.name).join(' · ')}
                </div>
                ${g.response ? `
                    <div class="responses">
                        <strong>السؤال الأقوى:</strong> ${g.response.bestQuestion || '—'}
                    </div>
                ` : '<div class="badge badge-blue">في انتظار الإجابة...</div>'}
            </div>
        `;
    }).join('');
}

async function renderProtocolDisplay() {
    const el = document.getElementById('protocolDisplay');
    if (!el) return;

    el.innerHTML = currentGroups.map(g => {
        const dim = SessionData.osama_dimensions.find(d => d.key === g.dimension);
        if (!g.response) return '';
        return `
            <div class="group-card" style="border-color: ${dim.color};">
                <h5 style="color: ${dim.color};">مدخل ${dim.name}</h5>
                <div class="responses">
                    <div style="margin-bottom: 0.5rem;"><strong>الجملة الكاشفة:</strong><br>${(g.response.revealingSentences || []).join(' · ')}</div>
                    <div style="margin-bottom: 0.5rem;"><strong>الأسئلة المقترحة:</strong>
                        <ul style="margin-right: 1rem;">
                            ${(g.response.questions || []).map(q => `<li>${q}</li>`).join('')}
                        </ul>
                    </div>
                    <div><strong>الرد المتوقع لأسامة:</strong> ${g.response.expectedResponse || '—'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ====================================
// إعادة تعيين الجلسة
// ====================================
async function resetSession() {
    if (!confirm('هل أنت متأكد من إعادة تعيين الجلسة كاملة؟ سيتم حذف كل البيانات الحالية.')) return;
    
    try {
        // حذف كل المشاركين
        const snap = await SessionManager.participantsRef().get();
        const batch1 = db.batch();
        snap.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();
        
        // حذف كل المجموعات
        const groupsSnap = await SessionManager.groupsRef().get();
        const batch2 = db.batch();
        groupsSnap.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();
        
        // حذف كل المواثيق
        const chartersSnap = await SessionManager.chartersRef().get();
        const batch3 = db.batch();
        chartersSnap.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();
        
        // إعادة تهيئة الجلسة
        await SessionManager.initSession();
        showToast('✅ تم إعادة تعيين الجلسة');
    } catch (e) {
        console.error(e);
        showToast('خطأ: ' + e.message, 'error');
    }
}

// ====================================
// مساعدات UI
// ====================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    if (type === 'error') {
        toast.style.borderColor = 'var(--red-soft)';
    }
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.85); 
        z-index: 9999; display: flex; align-items: center; justify-content: center;
        padding: 2rem; backdrop-filter: blur(10px);
    `;
    modal.innerHTML = `
        <div class="card" style="max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto;">
            ${content}
            <button class="btn btn-outline mt-3 w-full" onclick="this.closest('[style]').remove()">إغلاق</button>
        </div>
    `;
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

// ====================================
// تشغيل
// ====================================
bootstrap();
