// ========================================
// منظور الفؤاد - منطق شاشة العرض
// display.js
// ========================================

let currentSession = null;
let currentParticipants = [];
let currentGroups = [];
let timerInterval = null;
let localTimerSeconds = 0;
let radarChart = null;

function bootstrap() {
    if (!window.firebaseReady) {
        document.addEventListener('firebaseReady', init);
    } else {
        init();
    }
}

async function init() {
    createStars();
    SessionManager.onSessionChange(handleSessionChange);
    SessionManager.onParticipantsChange(handleParticipantsChange);
    SessionManager.onGroupsChange(handleGroupsChange);
    
    // محاولة دخول وضع الشاشة الكاملة عند الضغط
    document.addEventListener('click', () => {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(()=>{});
        }
    }, { once: true });
}

function createStars() {
    const container = document.getElementById('starsBackground');
    for (let i = 0; i < 150; i++) {
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
    syncTimer(session);
    renderPhase(session.currentPhase);
}

function handleParticipantsChange(participants) {
    currentParticipants = participants;
    document.getElementById('participantCountDisplay').textContent = participants.length;
    
    // إعادة الرسم إذا كانت المرحلة الحالية تعتمد على المشاركين
    if (currentSession && (
        currentSession.currentPhase === 'intro_introductions' ||
        currentSession.currentPhase === 'waiting' ||
        currentSession.currentPhase === 'dweck_radar' ||
        currentSession.currentPhase === 'dweck_choose_focus'
    )) {
        renderPhase(currentSession.currentPhase);
    }
}

function handleGroupsChange(groups) {
    currentGroups = groups;
    if (currentSession && (
        currentSession.currentPhase === 'osama_groups_work' ||
        currentSession.currentPhase === 'osama_protocol'
    )) {
        renderPhase(currentSession.currentPhase);
    }
}

function syncTimer(session) {
    if (session.timerRunning && session.timerSeconds > 0) {
        const elapsed = session.timerStartedAt ? Math.floor((Date.now() - session.timerStartedAt) / 1000) : 0;
        localTimerSeconds = Math.max(0, session.timerSeconds - elapsed);
        startLocalTimer();
        document.getElementById('timerBar').classList.remove('hidden');
    } else if (session.timerSeconds > 0) {
        localTimerSeconds = session.timerSeconds;
        updateTimerMassive();
        document.getElementById('timerBar').classList.remove('hidden');
        stopLocalTimer();
    } else {
        document.getElementById('timerBar').classList.add('hidden');
        stopLocalTimer();
    }
}

function startLocalTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerMassive();
    timerInterval = setInterval(() => {
        if (localTimerSeconds > 0) {
            localTimerSeconds--;
            updateTimerMassive();
        } else {
            stopLocalTimer();
        }
    }, 1000);
}

function stopLocalTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerMassive() {
    const el = document.getElementById('timerMassive');
    if (!el) return;
    const mins = Math.floor(localTimerSeconds / 60);
    const secs = localTimerSeconds % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    el.classList.remove('warning', 'danger');
    if (localTimerSeconds <= 30 && localTimerSeconds > 0) el.classList.add('danger');
    else if (localTimerSeconds <= 60 && localTimerSeconds > 0) el.classList.add('warning');
}

// ====================================
// عرض المراحل المختلفة على الشاشة الكبيرة
// ====================================
function renderPhase(phaseId) {
    const phase = SessionData.phases[phaseId];
    const content = document.getElementById('displayContent');
    
    if (!phase || phaseId === 'waiting') {
        content.innerHTML = `
            <div class="fade-in text-center">
                <h1 class="gold-text">تحت السطح</h1>
                <p class="subtitle">هندسة العقلية ورحلة التحوّل من الاحتياج إلى القدرة</p>
                <p class="mt-4" style="color: var(--text-muted); font-size: 1.3rem;">
                    👥 في انتظار المشاركين: <strong style="color: var(--gold);">${currentParticipants.length}</strong>
                </p>
                <p class="mt-3" style="color: var(--text-muted); font-size: 1rem;">
                    افتح participant.html على هاتفك لتسجيل الدخول
                </p>
            </div>
        `;
        return;
    }

    let html = '';

    // ===== الترحيب والسؤال المعلّق =====
    if (phaseId === 'intro_welcome') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    else if (phaseId === 'intro_question') {
        html = `
            <div class="fade-in text-center">
                <p class="subtitle" style="color: var(--text-muted);">سؤال معلّق</p>
                <h1 class="gold-text mt-3 massive-text">${phase.question}</h1>
            </div>
        `;
    }
    
    // ===== التعارف الذكي =====
    else if (phaseId === 'intro_introductions') {
        html = `
            <div class="fade-in" style="width: 100%;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <p class="subtitle text-center mt-2">اختار سؤال واحد وجاوب عليه</p>
                <div class="participants-flow mt-4">
                    ${currentParticipants.map(p => `
                        <div class="participant-display-card">
                            <div class="name">${p.name}</div>
                            ${p.lastAnswer ? `<div class="answer">"${p.lastAnswer}"</div>` : '<div class="answer">في انتظار الإجابة...</div>'}
                        </div>
                    `).join('')}
                </div>
                ${currentParticipants.length === 0 ? '<p class="text-center mt-3" style="color: var(--text-muted); font-size: 1.5rem;">في انتظار المشاركين...</p>' : ''}
            </div>
        `;
    }
    
    // ===== الشفرة =====
    else if (phaseId === 'intro_code') {
        html = `
            <div class="fade-in text-center" style="width: 100%;">
                <h1 class="gold-text">${phase.title}</h1>
                <div class="big-card mt-4">
                    <h2 style="color: var(--gold); margin-bottom: 1.5rem; text-align: center;">الشفرة</h2>
                    <div class="code-display">
                        ${phase.code.map(item => `
                            <div><strong>${item.word}</strong> = ${item.value}</div>
                        `).join('')}
                    </div>
                    <p class="mt-3 text-center" style="color: var(--text-muted); font-size: 1.4rem;">💡 ${phase.hint}</p>
                </div>
            </div>
        `;
    }
    
    // ===== كشف الشفرة =====
    else if (phaseId === 'intro_code_reveal') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text massive-text fade-in-up">إنتم مش بتحلوا الشفرة</h1>
                <h2 class="gold-text mt-4 fade-in-up fade-in-delay-2" style="font-size: 3rem;">إنتم بتفسروها</h2>
            </div>
        `;
    }
    
    // ===== التفسير والعقلية =====
    else if (phaseId === 'intro_perception') {
        html = `
            <div class="fade-in" style="width: 100%;">
                <h1 class="text-center" style="color: var(--text-muted);">كل يوم في حياتك...</h1>
                ${phase.lines.map((line, idx) => `
                    <h2 class="text-center fade-in-up fade-in-delay-${idx + 2} mt-3 ${idx === phase.lines.length - 1 ? 'gold-text' : ''}" style="font-size: 2.8rem; line-height: 1.5;">
                        ${line}
                    </h2>
                `).join('')}
            </div>
        `;
    }
    
    // ===== تأطير غيث =====
    else if (phaseId === 'intro_framing') {
        html = `
            <div class="fade-in text-center">
                <h2 style="color: var(--text-muted); font-size: 1.8rem;">${phase.title}</h2>
                <h1 class="gold-text mt-3 massive-text">${phase.subtitle}</h1>
            </div>
        `;
    }
    
    // ===== اليوم المقبل =====
    else if (phaseId === 'intro_day_outline') {
        html = `
            <div class="fade-in" style="max-width: 1200px;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <div class="mt-4" style="display: flex; flex-direction: column; gap: 1.2rem;">
                    ${phase.points.map((p, idx) => `
                        <div class="big-card fade-in-up fade-in-delay-${idx + 1}" style="padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1.5rem;">
                            <div style="font-size: 2.5rem; color: var(--gold); font-weight: 800;">${idx + 1}</div>
                            <div style="font-size: 1.4rem; line-height: 1.5;">${p}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ===== استراحات =====
    else if (phase.isBreak) {
        html = `
            <div class="fade-in text-center">
                <div style="font-size: 6rem; margin-bottom: 1rem;">☕</div>
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    
    // ===== افتتاح دويك =====
    else if (phaseId === 'dweck_intro') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
                <p class="mt-4" style="color: var(--text-muted); font-size: 1.5rem;">
                    كارول دويك — ستانفورد · ٤٠ سنة بحث
                </p>
            </div>
        `;
    }
    
    // ===== مواقف دويك =====
    else if (phaseId.includes('_situation') && phase.session === 2) {
        const diff = SessionData.dweck_differences[phase.differenceIndex];
        html = `
            <div class="fade-in" style="max-width: 1400px;">
                <div class="text-center mb-3">
                    <span class="badge" style="font-size: 1.2rem; padding: 0.5rem 1.2rem; background: ${diff.color}30; color: ${diff.color};">الفرق ${phase.differenceIndex + 1}/٥</span>
                    <h1 class="gold-text mt-2">${phase.title}</h1>
                </div>
                <div class="big-card">
                    <h2 style="color: var(--gold); text-align: center; margin-bottom: 1.5rem;">الموقف</h2>
                    <p style="font-size: 1.6rem; line-height: 1.8;">${phase.situation}</p>
                    <div class="divider"></div>
                    <h3 style="color: var(--gold);">ناقشوا في مجموعاتكم:</h3>
                    <ul style="font-size: 1.4rem; line-height: 1.8; margin-right: 2rem; margin-top: 1rem;">
                        ${phase.questions.map(q => `<li style="margin: 0.8rem 0;">${q}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    // ===== الطبقة العميقة لدويك =====
    else if (phaseId.includes('_deep') && phase.session === 2) {
        const diff = SessionData.dweck_differences[phase.differenceIndex];
        html = `
            <div class="fade-in text-center" style="max-width: 1200px;">
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3" style="color: ${diff.color};">${phase.subtitle || ''}</p>
                <div class="big-card mt-4">
                    <h2 style="color: ${diff.color}; text-align: center;">المحور العميق: ${diff.axis}</h2>
                </div>
            </div>
        `;
    }
    
    // ===== أسئلة التشخيص =====
    else if (phaseId.includes('_questions') && phase.session === 2) {
        const diff = SessionData.dweck_differences[phase.differenceIndex];
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">خد لحظة مع نفسك</h1>
                <p class="subtitle mt-3">٥ أسئلة — جاوب بصدق</p>
                <p class="mt-4" style="font-size: 1.5rem; color: ${diff.color};">
                    ${diff.name}
                </p>
                <p class="mt-3" style="color: var(--text-muted); font-size: 1.2rem;">
                    الإجابات على هاتفك · ستظهر بصمتك في النهاية
                </p>
            </div>
        `;
    }
    
    // ===== الخريطة العنكبوتية الجماعية =====
    else if (phaseId === 'dweck_radar') {
        html = `
            <div class="fade-in" style="max-width: 1200px;">
                <h1 class="gold-text text-center">بصمتك الخماسية</h1>
                <p class="subtitle text-center mt-3">كل واحد يرى خريطته على هاتفه</p>
                <div class="big-chart-container mt-4">
                    <canvas id="bigRadarCanvas"></canvas>
                </div>
                <p class="text-center mt-3" style="color: var(--text-muted); font-size: 1.2rem;">المتوسطات الجماعية</p>
            </div>
        `;
        setTimeout(() => buildAggregatedRadarChart(), 200);
    }
    
    // ===== اختيار الفرق - heatmap =====
    else if (phaseId === 'dweck_choose_focus') {
        html = renderFocusHeatmap();
    }
    
    // ===== المناعة - السؤال المعلق =====
    else if (phaseId === 'immunity_question') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text massive-text">${phase.title}</h1>
            </div>
        `;
    }
    
    // ===== مفهوم المناعة =====
    else if (phaseId === 'immunity_concept') {
        html = `
            <div class="fade-in text-center">
                <div style="font-size: 5rem;">🧠</div>
                <h1 class="gold-text mt-3">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    
    // ===== قصة كريم =====
    else if (phaseId === 'immunity_karim') {
        const k = phase.data;
        html = `
            <div class="fade-in" style="max-width: 1400px;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <div class="mt-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;">
                    <div class="big-card fade-in-up fade-in-delay-1" style="padding: 1.5rem; text-align: center;">
                        <h3 style="color: var(--gold);">١. هدفه المعلَن</h3>
                        <p class="mt-2" style="font-size: 1.1rem;">${k.stated_goal}</p>
                    </div>
                    <div class="big-card fade-in-up fade-in-delay-2" style="padding: 1.5rem; text-align: center; border-color: rgba(251, 146, 60, 0.3);">
                        <h3 style="color: #fb923c;">٢. سلوكياته المضادة</h3>
                        <p class="mt-2" style="font-size: 1.1rem;">${k.counter_behaviors}</p>
                    </div>
                    <div class="big-card fade-in-up fade-in-delay-3" style="padding: 1.5rem; text-align: center; border-color: rgba(220, 38, 38, 0.3);">
                        <h3 style="color: var(--red-soft);">٣. التزامه المخفي</h3>
                        <p class="mt-2" style="font-size: 1.1rem;">${k.hidden_commitment}</p>
                    </div>
                    <div class="big-card fade-in-up fade-in-delay-4" style="padding: 1.5rem; text-align: center; border-color: rgba(168, 85, 247, 0.3);">
                        <h3 style="color: #a855f7;">٤. افتراضه الكبير</h3>
                        <p class="mt-2" style="font-size: 1.1rem;">${k.big_assumption}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== اللحظة الانكشافية =====
    else if (phaseId === 'immunity_revelation') {
        html = `
            <div class="fade-in text-center">
                <h1 class="fade-in-up massive-text" style="color: white;">لست ضعيفاً.</h1>
                <h1 class="fade-in-up fade-in-delay-1 massive-text" style="color: white;">لست كسولاً.</h1>
                <h1 class="fade-in-up fade-in-delay-2 massive-text" style="color: white;">لست رافضاً للتغيير.</h1>
                <div class="divider mt-4"></div>
                <h2 class="gold-text fade-in-up fade-in-delay-4 mt-4" style="font-size: 2.5rem;">
                    داخلك التزام مخفي يحمي الوضع الحالي
                </h2>
            </div>
        `;
    }
    
    // ===== الأبواب الثلاثة =====
    else if (phaseId === 'immunity_doors_intro') {
        html = `
            <div class="fade-in" style="max-width: 1400px;">
                <h1 class="gold-text text-center">الأبواب الثلاثة</h1>
                <p class="subtitle text-center mt-3">٩ ميكانيكيات مناعة عقلية</p>
                <div class="mt-4" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
                    <div class="big-card text-center fade-in-up fade-in-delay-1" style="border-color: rgba(251, 191, 36, 0.4);">
                        <div style="font-size: 3rem;">🔥</div>
                        <h2 style="color: var(--gold);">الباب الأول</h2>
                        <h3 style="margin-top: 0.5rem;">الهمة والعزيمة</h3>
                        <p class="mt-3" style="color: var(--text-muted);">الطبائع: ١ · ٨ · ٩</p>
                    </div>
                    <div class="big-card text-center fade-in-up fade-in-delay-2" style="border-color: rgba(236, 72, 153, 0.4);">
                        <div style="font-size: 3rem;">💗</div>
                        <h2 style="color: #ec4899;">الباب الثاني</h2>
                        <h3 style="margin-top: 0.5rem;">الأنس والقرب</h3>
                        <p class="mt-3" style="color: var(--text-muted);">الطبائع: ٢ · ٣ · ٤</p>
                    </div>
                    <div class="big-card text-center fade-in-up fade-in-delay-3" style="border-color: rgba(59, 130, 246, 0.4);">
                        <div style="font-size: 3rem;">💡</div>
                        <h2 style="color: #3b82f6;">الباب الثالث</h2>
                        <h3 style="margin-top: 0.5rem;">اليقين والبيان</h3>
                        <p class="mt-3" style="color: var(--text-muted);">الطبائع: ٥ · ٦ · ٧</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===== الأبواب الفردية =====
    else if (phaseId.startsWith('door_')) {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    
    // ===== الطبائع الفردية =====
    else if (phaseId.startsWith('nature_')) {
        const natureNum = parseInt(phaseId.replace('nature_', ''));
        const nature = SessionData.natures.find(n => n.num === natureNum);
        html = `
            <div class="fade-in" style="max-width: 1200px;">
                <div class="text-center">
                    <h1 class="gold-text">${phase.title}</h1>
                    <p class="subtitle mt-3" style="color: ${nature?.color || 'var(--gold)'};">${phase.subtitle}</p>
                </div>
                ${phase.data ? `
                    <div class="big-card mt-4" style="border-color: ${nature?.color || 'var(--gold)'};">
                        <div class="text-center" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                            <div>
                                <h3 style="color: var(--gold); margin-bottom: 1rem;">الالتزام المخفي</h3>
                                <p style="font-size: 1.5rem; font-weight: 600;">${phase.data.hidden_commitment}</p>
                            </div>
                            <div>
                                <h3 style="color: var(--red-soft); margin-bottom: 1rem;">الافتراض الكبير</h3>
                                <p style="font-size: 1.5rem; font-weight: 600;">${phase.data.big_assumption}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ===== جدول الطبائع التسعة =====
    else if (phaseId === 'natures_table') {
        html = `
            <div class="fade-in" style="max-width: 1400px;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <div class="big-card mt-4">
                    <table class="natures-display-table">
                        <thead>
                            <tr>
                                <th>الطبيعة</th>
                                <th>الباب</th>
                                <th>الالتزام المخفي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${SessionData.natures.map(n => `
                                <tr>
                                    <td><strong style="color: ${n.color};">${n.num}. ${n.name}</strong></td>
                                    <td style="color: var(--text-muted);">${n.door}</td>
                                    <td>${n.hidden}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // ===== التطبيق الذاتي =====
    else if (phaseId === 'immunity_personal_work') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
                <p class="mt-4" style="color: var(--text-muted); font-size: 1.5rem;">
                    اشتغل مع شريكك على هاتفك · ٣٥ دقيقة
                </p>
            </div>
        `;
    }
    
    // ===== ختام المناعة =====
    else if (phaseId === 'immunity_closing') {
        html = `
            <div class="fade-in" style="max-width: 1300px;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <div class="mt-4" style="display: flex; flex-direction: column; gap: 1.5rem;">
                    ${phase.points.map((p, idx) => `
                        <div class="big-card fade-in-up fade-in-delay-${idx + 1}" style="padding: 1.8rem;">
                            <div style="font-size: 1.5rem; line-height: 1.6;">
                                <strong style="color: var(--gold);">${idx + 1}.</strong> ${p}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ===== قصة أسامة =====
    else if (phaseId === 'osama_intro') {
        html = `
            <div class="fade-in text-center">
                <div style="font-size: 5rem;">🤝</div>
                <h1 class="gold-text mt-3">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    else if (phaseId === 'osama_story') {
        html = `
            <div class="fade-in" style="max-width: 1300px;">
                <h1 class="gold-text text-center">${phase.title}</h1>
                <div class="big-card mt-4">
                    <h2 style="color: var(--gold); margin-bottom: 1.5rem; text-align: center;">جمل أسامة</h2>
                    ${phase.sentences.map((s, idx) => `
                        <div class="fade-in-up fade-in-delay-${(idx % 5) + 1}" style="padding: 1rem; margin: 0.5rem 0; background: rgba(0,0,0,0.3); border-radius: 12px; font-style: italic; font-size: 1.3rem;">
                            "${s}"
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ===== عمل المجموعات على أسامة =====
    else if (phaseId === 'osama_groups_work') {
        html = renderGroupsWorkDisplay();
    }
    
    // ===== بروتوكول أسامة المبني =====
    else if (phaseId === 'osama_protocol') {
        html = renderProtocolDisplay();
    }
    
    // ===== الجبل الجليدي =====
    else if (phaseId === 'closing_iceberg_intro') {
        html = `
            <div class="fade-in text-center">
                <div style="font-size: 5rem;">🏔️</div>
                <h1 class="gold-text mt-3">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
            </div>
        `;
    }
    else if (phaseId === 'closing_iceberg_full') {
        html = renderIcebergDisplay();
    }
    
    // ===== كشف منظور الفؤاد =====
    else if (phaseId === 'closing_perspective') {
        html = `
            <div class="fade-in text-center">
                <p class="fade-in-up" style="color: var(--text-muted); font-size: 1.8rem;">اللي عشتموه النهارده — له اسم</p>
                <h1 class="gold-text fade-in-up fade-in-delay-2 mt-4" style="font-size: 6rem; letter-spacing: 0.05em;">منظور الفؤاد</h1>
                <p class="fade-in-up fade-in-delay-3 mt-4" style="font-size: 1.5rem; color: var(--text-secondary);">
                    شغل يربط ابن القيم والغزالي وابن مسكويه بعلم النفس الحديث
                </p>
            </div>
        `;
    }
    
    // ===== الميثاق =====
    else if (phaseId === 'closing_charter') {
        html = `
            <div class="fade-in text-center">
                <div style="font-size: 5rem;">📜</div>
                <h1 class="gold-text mt-3">${phase.title}</h1>
                <p class="subtitle mt-3">${phase.subtitle}</p>
                <p class="mt-4" style="color: var(--text-muted); font-size: 1.5rem;">
                    كل واحد يكتب ميثاقه على هاتفه
                </p>
            </div>
        `;
    }
    
    // ===== الآية =====
    else if (phaseId === 'closing_verse') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text" style="font-family: 'Amiri', serif; font-size: 4rem; line-height: 1.6;">
                    "إن الله لا يغيّر ما بقوم<br>حتى يغيّروا ما بأنفسهم"
                </h1>
                <p class="mt-4" style="color: var(--text-muted); font-size: 1.5rem;">
                    سورة الرعد — آية ١١
                </p>
            </div>
        `;
    }
    
    // ===== الختام النهائي =====
    else if (phaseId === 'closing_final') {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text massive-text">رحلة الـ٩٠ يوم بدأت</h1>
                <p class="mt-4" style="font-size: 1.8rem; color: var(--text-secondary);">
                    شكراً لكم · بارك الله في شغلكم · وفي مؤسستكم
                </p>
            </div>
        `;
    }
    
    // ===== افتراضي =====
    else {
        html = `
            <div class="fade-in text-center">
                <h1 class="gold-text">${phase.title}</h1>
                ${phase.subtitle ? `<p class="subtitle mt-3">${phase.subtitle}</p>` : ''}
            </div>
        `;
    }
    
    content.innerHTML = html;
}

// ====================================
// الخريطة العنكبوتية الجماعية
// ====================================
async function buildAggregatedRadarChart() {
    const canvas = document.getElementById('bigRadarCanvas');
    if (!canvas) return;
    
    // جمع كل البيانات
    const stats = {};
    SessionData.dweck_differences.forEach(d => stats[d.key] = { sum: 0, count: 0 });
    
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        SessionData.dweck_differences.forEach(d => {
            if (responses[`dweck_${d.key}`] && responses[`dweck_${d.key}`].avg) {
                stats[d.key].sum += parseFloat(responses[`dweck_${d.key}`].avg);
                stats[d.key].count++;
            }
        });
    }
    
    const labels = SessionData.dweck_differences.map(d => d.name);
    const data = SessionData.dweck_differences.map(d => {
        return stats[d.key].count > 0 ? (stats[d.key].sum / stats[d.key].count) : 0;
    });
    
    if (radarChart) radarChart.destroy();
    
    radarChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'المتوسط الجماعي',
                data: data,
                backgroundColor: 'rgba(251, 191, 36, 0.25)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 8
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0, max: 5,
                    ticks: { stepSize: 1, color: '#cbd5e1', backdropColor: 'transparent', font: { size: 16 } },
                    grid: { color: 'rgba(255,255,255,0.15)' },
                    angleLines: { color: 'rgba(255,255,255,0.15)' },
                    pointLabels: { color: '#f8fafc', font: { size: 20, family: 'Tajawal', weight: '700' } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ====================================
// heatmap اختيار الفرق
// ====================================
async function renderFocusHeatmap() {
    const dist = {};
    SessionData.dweck_differences.forEach(d => dist[d.key] = 0);
    
    for (const p of currentParticipants) {
        const responses = await SessionManager.getAllResponses(p.id);
        if (responses.dweck_focus && responses.dweck_focus.choice) {
            dist[responses.dweck_focus.choice] = (dist[responses.dweck_focus.choice] || 0) + 1;
        }
    }
    
    // إعادة التحديث الديناميكي
    document.getElementById('displayContent').innerHTML = `
        <div class="fade-in" style="width: 100%;">
            <h1 class="gold-text text-center">اللي اختارته القاعة</h1>
            <p class="subtitle text-center mt-3">توزيع الفرق المختار</p>
            <div class="heatmap-display">
                ${SessionData.dweck_differences.map(d => `
                    <div class="heatmap-cell" style="border-color: ${d.color}; background: ${d.color}10;">
                        <h4 style="color: ${d.color};">${d.name}</h4>
                        <div class="count" style="color: ${d.color};">${dist[d.key]}</div>
                        <p style="color: var(--text-muted);">مشارك</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    return ''; // المحتوى تم بناؤه أعلاه
}

// ====================================
// عرض المجموعات تعمل
// ====================================
function renderGroupsWorkDisplay() {
    return `
        <div class="fade-in" style="max-width: 1600px; width: 100%;">
            <h1 class="gold-text text-center">المجموعات الخمس تعمل</h1>
            <p class="subtitle text-center mt-3">كل مجموعة على مدخل · ١٥ دقيقة</p>
            <div class="groups-display-grid mt-4">
                ${SessionData.osama_dimensions.map(dim => {
                    const group = currentGroups.find(g => g.dimension === dim.key);
                    const hasResponse = group && group.response;
                    return `
                        <div class="group-display-card" style="border-color: ${dim.color}; ${hasResponse ? 'background: ' + dim.color + '15;' : ''}">
                            <h4 style="color: ${dim.color};">${dim.name}</h4>
                            <p>${dim.description}</p>
                            ${group ? `<p style="margin-top: 0.8rem; color: var(--text-muted); font-size: 0.95rem;">
                                ${group.members.map(m => m.name).join(' · ')}
                            </p>` : '<p style="margin-top: 0.8rem; color: var(--text-muted);">في انتظار التوزيع</p>'}
                            ${hasResponse ? '<div class="badge badge-green mt-2">✓ أكملت</div>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderProtocolDisplay() {
    const respondedGroups = currentGroups.filter(g => g.response && g.response.bestQuestion);
    
    return `
        <div class="fade-in" style="max-width: 1700px; width: 100%;">
            <h1 class="gold-text text-center">البروتوكول الذي بنيتموه</h1>
            <p class="subtitle text-center mt-3">٥ مداخل لتحويل أسامة</p>
            ${respondedGroups.length === 0 ? '<p class="text-center mt-4" style="font-size: 1.5rem; color: var(--text-muted);">في انتظار إجابات المجموعات...</p>' : `
                <div class="groups-display-grid mt-4">
                    ${respondedGroups.map(g => {
                        const dim = SessionData.osama_dimensions.find(d => d.key === g.dimension);
                        if (!dim) return '';
                        return `
                            <div class="group-display-card" style="border-color: ${dim.color}; background: ${dim.color}15;">
                                <h4 style="color: ${dim.color}; font-size: 1.6rem;">مدخل ${dim.name}</h4>
                                <p style="color: var(--text-muted); margin-bottom: 1rem;">${dim.description}</p>
                                ${g.response.bestQuestion ? `
                                    <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin-top: 0.8rem;">
                                        <strong style="color: var(--gold);">السؤال الأقوى:</strong>
                                        <p style="margin-top: 0.4rem; font-style: italic; font-size: 1.1rem; line-height: 1.6;">"${g.response.bestQuestion}"</p>
                                    </div>
                                ` : ''}
                                ${g.response.revealingSentences && g.response.revealingSentences.length > 0 ? `
                                    <div class="mt-2" style="color: var(--text-muted); font-size: 0.9rem;">
                                        الجمل الكاشفة: ${g.response.revealingSentences.length}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

function renderIcebergDisplay() {
    return `
        <div class="fade-in" style="max-width: 1200px; width: 100%;">
            <h1 class="gold-text text-center">الجبل الجليدي</h1>
            <p class="subtitle text-center mt-3">٧ مرايا · ١ طبقة هوية</p>
            <div class="iceberg-visual mt-4">
                <div class="iceberg-above">
                    <strong style="color: var(--blue-light); font-size: 1.4rem;">🌊 فوق السطح — ١٠٪</strong>
                    <p class="mt-2" style="font-size: 1.3rem;">النتائج المرئية · الـ٥ نتائج لدويك</p>
                </div>
                <div class="iceberg-below">
                    <strong style="color: var(--gold); font-size: 1.4rem; display: block; text-align: center; margin-bottom: 1rem;">
                        🌊 تحت السطح — ٩٠٪
                    </strong>
                    ${SessionData.iceberg_layers.filter(l => l.position === 'below').map((layer, idx) => `
                        <div class="layer-row">
                            <strong>${idx + 1}.</strong> ${layer.name}
                        </div>
                    `).join('')}
                    <div class="mt-3 text-center" style="padding: 1.5rem; background: rgba(251, 191, 36, 0.15); border-radius: 16px; border: 2px solid var(--gold);">
                        <strong style="color: var(--gold); font-size: 1.6rem;">◯ طبقة الهوية ◯</strong>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 1.2rem;">الجوهر والأشواق</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ====================================
// تشغيل
// ====================================
bootstrap();
