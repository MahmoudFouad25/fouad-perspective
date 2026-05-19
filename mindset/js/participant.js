// ========================================
// منظور الفؤاد - منطق المشارك
// participant.js
// ========================================

let participantId = null;
let participantName = '';
let currentSession = null;
let currentResponses = {};
let timerInterval = null;
let localTimerSeconds = 0;
let radarChart = null;
let selectedIntroQuestion = null;

function bootstrap() {
    if (!window.firebaseReady) {
        document.addEventListener('firebaseReady', init);
    } else {
        init();
    }
}

async function init() {
    createStars();
    
    participantId = sessionStorage.getItem('participantId');
    participantName = sessionStorage.getItem('participantName');
    
    if (participantId) {
        try {
            const doc = await SessionManager.participantsRef().doc(participantId).get();
            if (doc.exists) {
                showDynamicScreen();
                await loadAllResponses();
            } else {
                sessionStorage.clear();
                participantId = null;
                participantName = '';
            }
        } catch (e) { console.warn(e); }
    }

    SessionManager.onSessionChange(handleSessionChange);

    // Heartbeat لتحديث آخر ظهور كل 30 ثانية
    setInterval(() => {
        if (participantId) {
            SessionManager.updateParticipantStatus(participantId, {}).catch(()=>{});
        }
    }, 30000);
}

function createStars() {
    const container = document.getElementById('starsBackground');
    for (let i = 0; i < 60; i++) {
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
// التسجيل
// ====================================
async function registerParticipant() {
    const input = document.getElementById('nameInput');
    const name = input.value.trim();
    
    if (!name || name.length < 2) {
        showToast('من فضلك اكتب اسمك', 'error');
        input.focus();
        return;
    }

    try {
        participantId = await SessionManager.registerParticipant(name);
        participantName = name;
        sessionStorage.setItem('participantId', participantId);
        sessionStorage.setItem('participantName', name);
        
        showDynamicScreen();
        showToast(`أهلاً ${name} ✨`);
    } catch (e) {
        console.error(e);
        showToast('فشل التسجيل، حاول مرة أخرى', 'error');
    }
}

function showDynamicScreen() {
    document.getElementById('registrationScreen').classList.add('hidden');
    document.getElementById('dynamicScreen').classList.remove('hidden');
    document.getElementById('welcomeName').textContent = participantName;
}

async function loadAllResponses() {
    if (!participantId) return;
    currentResponses = await SessionManager.getAllResponses(participantId);
}

// ====================================
// التعامل مع تغييرات الجلسة
// ====================================
async function handleSessionChange(session) {
    currentSession = session;
    
    if (participantId) {
        SessionManager.updateParticipantStatus(participantId, {
            currentPhase: session.currentPhase
        }).catch(()=>{});
    }
    
    syncTimer(session);
    
    if (participantId) {
        await loadAllResponses();
        renderPhase(session.currentPhase);
    }
}

function syncTimer(session) {
    if (session.timerRunning && session.timerSeconds > 0) {
        const elapsed = session.timerStartedAt ? Math.floor((Date.now() - session.timerStartedAt) / 1000) : 0;
        localTimerSeconds = Math.max(0, session.timerSeconds - elapsed);
        startLocalTimer();
        showTimerMini();
    } else {
        stopLocalTimer();
        if (session.timerSeconds && session.timerSeconds > 0) {
            localTimerSeconds = session.timerSeconds;
            updateTimerMiniDisplay();
            showTimerMini();
        } else {
            hideTimerMini();
        }
    }
}

function showTimerMini() { document.getElementById('timerMini').classList.remove('hidden'); }
function hideTimerMini() { document.getElementById('timerMini').classList.add('hidden'); }

function startLocalTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerMiniDisplay();
    timerInterval = setInterval(() => {
        if (localTimerSeconds > 0) {
            localTimerSeconds--;
            updateTimerMiniDisplay();
        } else {
            stopLocalTimer();
        }
    }, 1000);
}

function stopLocalTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateTimerMiniDisplay() {
    const el = document.getElementById('timerMini');
    if (!el) return;
    const mins = Math.floor(localTimerSeconds / 60);
    const secs = localTimerSeconds % 60;
    el.textContent = `⏱ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    el.classList.remove('warning', 'danger');
    if (localTimerSeconds <= 30 && localTimerSeconds > 0) el.classList.add('danger');
    else if (localTimerSeconds <= 60 && localTimerSeconds > 0) el.classList.add('warning');
}

// ====================================
// عرض المراحل - الموجّه الرئيسي
// ====================================
async function renderPhase(phaseId) {
    const phase = SessionData.phases[phaseId];
    if (!phase) { renderWaiting(); return; }

    const content = document.getElementById('contentArea');
    let html = '';

    if (phaseId === 'waiting') { renderWaiting(); return; }
    else if (phaseId === 'intro_welcome' || phaseId === 'intro_question') html = renderSimplePhase(phase);
    else if (phaseId === 'intro_introductions') html = renderIntroductions(phase);
    else if (phaseId === 'intro_code') html = renderCodeChallenge(phase);
    else if (phaseId === 'intro_code_reveal' || phaseId === 'intro_perception' || phaseId === 'intro_framing' || phaseId === 'intro_day_outline') html = renderSimplePhase(phase);
    else if (phase.isBreak) html = renderBreak(phase);
    else if (phaseId.includes('_situation') && phase.session === 2) html = renderDweckSituation(phase);
    else if (phaseId.includes('_deep') && phase.session === 2) html = renderSimplePhase(phase);
    else if (phaseId.includes('_questions') && phase.session === 2) html = renderDweckQuestions(phase);
    else if (phaseId === 'dweck_radar') { html = renderRadarChart(); setTimeout(() => buildRadarChart(), 100); }
    else if (phaseId === 'dweck_choose_focus') html = renderFocusChoice();
    else if (phaseId === 'immunity_personal_work') html = renderImmunityWork();
    else if (phaseId === 'immunity_karim') html = renderKarimStory(phase);
    else if (phaseId === 'immunity_question' || phaseId === 'immunity_concept' || phaseId === 'immunity_revelation' || phaseId === 'immunity_closing') html = renderSimplePhase(phase);
    else if (phaseId === 'immunity_doors_intro') html = renderDoorsIntro();
    else if (phaseId.startsWith('door_') || phaseId.startsWith('nature_')) html = renderNature(phase);
    else if (phaseId === 'natures_table') html = renderNaturesTable();
    else if (phaseId === 'osama_intro' || phaseId === 'osama_story') html = renderOsamaStory(phase);
    else if (phaseId === 'osama_groups_work') { await renderOsamaGroupWork(); return; }
    else if (phaseId === 'osama_protocol') { await renderOsamaProtocol(); return; }
    else if (phaseId.startsWith('closing_iceberg')) html = renderIceberg(phase);
    else if (phaseId === 'closing_perspective') html = renderPerspectiveReveal();
    else if (phaseId === 'closing_charter') html = renderCharter();
    else if (phaseId === 'closing_verse' || phaseId === 'closing_final') html = renderSimplePhase(phase);
    else html = renderSimplePhase(phase);

    content.innerHTML = html;
}

function renderWaiting() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="phase-display waiting-display">
            <div class="icon">✨</div>
            <h1 class="gold-text">في انتظار البداية</h1>
            <p class="subtitle">المدرّب سيبدأ التدريب قريباً</p>
            <div class="progress-text">أنت في الموقع الصحيح، استرخ.</div>
        </div>
    `;
}

function renderBreak(phase) {
    return `
        <div class="phase-display waiting-display text-center">
            <div class="icon">☕</div>
            <h1 class="gold-text">${phase.title}</h1>
            <p class="subtitle">${phase.subtitle || ''}</p>
        </div>
    `;
}

function renderSimplePhase(phase) {
    let html = `<div class="phase-display text-center">`;
    if (phase.question) {
        html += `<h1 class="gold-text">${phase.question}</h1>`;
    } else {
        html += `<h1 class="gold-text">${phase.title}</h1>`;
    }
    if (phase.subtitle) html += `<p class="subtitle">${phase.subtitle}</p>`;
    
    if (phase.lines) {
        html += '<div class="mt-3">';
        phase.lines.forEach((line, idx) => {
            html += `<p class="fade-in-up fade-in-delay-${idx + 1}" style="font-size: 1.2rem; margin: 1rem 0; line-height: 1.6;">${line}</p>`;
        });
        html += '</div>';
    }
    
    if (phase.points) {
        html += '<div class="mt-3" style="text-align: right;">';
        phase.points.forEach((point, idx) => {
            html += `<div class="card fade-in-up fade-in-delay-${idx + 1}" style="margin-bottom: 0.8rem; padding: 1rem;">
                <strong style="color: var(--gold);">${idx + 1}.</strong> ${point}
            </div>`;
        });
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// ====================================
// التعارف الذكي
// ====================================
function renderIntroductions(phase) {
    const existing = currentResponses.intro;
    
    if (existing && existing.answer) {
        return `
            <div class="phase-display text-center">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h2 class="gold-text">شكراً ${participantName}!</h2>
                <p class="subtitle">إجابتك محفوظة. سننتقل قريباً للجزء التالي.</p>
                <div class="card mt-3" style="text-align: right;">
                    <strong style="color: var(--gold);">سؤالك:</strong>
                    <p>${phase.questions.find(q => q.id === existing.question_chosen)?.text || ''}</p>
                    <div class="divider"></div>
                    <strong style="color: var(--gold);">إجابتك:</strong>
                    <p>${existing.answer}</p>
                </div>
                <button class="btn btn-outline mt-3" onclick="resetIntroduction()">تعديل إجابتي</button>
            </div>
        `;
    }
    
    let html = `
        <div class="phase-display">
            <h2 class="gold-text text-center">${phase.title}</h2>
            <p class="subtitle text-center">اختار سؤال واحد وجاوب عليه</p>
            <div class="mt-3" id="introQuestions">
    `;
    
    phase.questions.forEach(q => {
        html += `
            <div class="question-card" onclick="selectIntroQuestion(${q.id})">
                <div class="question-text">${q.text}</div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div id="introAnswerArea" class="hidden mt-3">
                <label>إجابتك بصدق وبدون فلسفة</label>
                <textarea id="introAnswer" placeholder="اكتب من قلبك..." rows="5"></textarea>
                <button class="btn btn-gold w-full mt-2" onclick="submitIntroduction()">إرسال ✨</button>
            </div>
        </div>
    `;
    return html;
}

function selectIntroQuestion(id) {
    selectedIntroQuestion = id;
    document.querySelectorAll('#introQuestions .question-card').forEach((c, i) => {
        c.classList.toggle('selected', i + 1 === id);
    });
    document.getElementById('introAnswerArea').classList.remove('hidden');
    document.getElementById('introAnswer').focus();
}

async function submitIntroduction() {
    const answer = document.getElementById('introAnswer').value.trim();
    if (!selectedIntroQuestion || !answer) {
        showToast('من فضلك اختر سؤال وأجب عليه', 'error');
        return;
    }
    
    try {
        await SessionManager.saveResponse(participantId, 'intro', {
            question_chosen: selectedIntroQuestion,
            answer: answer
        });
        await SessionManager.updateParticipantStatus(participantId, { lastAnswer: answer });
        showToast('✅ تم الحفظ');
        await loadAllResponses();
        renderPhase(currentSession.currentPhase);
    } catch (e) {
        console.error(e);
        showToast('خطأ في الحفظ', 'error');
    }
}

async function resetIntroduction() {
    await SessionManager.responsesRef(participantId).doc('intro').delete();
    await loadAllResponses();
    renderPhase(currentSession.currentPhase);
}

// ====================================
// تحدي الشفرة
// ====================================
function renderCodeChallenge(phase) {
    let html = `
        <div class="phase-display text-center">
            <h2 class="gold-text">${phase.title}</h2>
            <p class="subtitle">اجتمعوا في مجموعات وحاولوا حل الشفرة</p>
            <div class="card mt-3" style="text-align: center;">
                <h3 style="color: var(--gold); margin-bottom: 1rem;">الشفرة</h3>
    `;
    
    phase.code.forEach(item => {
        html += `<div style="font-size: 1.3rem; margin: 0.5rem 0; line-height: 1.8;">
            <strong>${item.word}</strong> = <span style="color: var(--gold);">${item.value}</span>
        </div>`;
    });
    
    html += `
            </div>
            <p class="mt-3" style="color: var(--text-muted); font-size: 0.95rem;">💡 ${phase.hint}</p>
        </div>
    `;
    return html;
}

// ====================================
// دويك - المواقف والأسئلة
// ====================================
function renderDweckSituation(phase) {
    return `
        <div class="phase-display">
            <div class="badge mb-2">${phase.title}</div>
            <h2 class="gold-text mb-3">الموقف</h2>
            <div class="card" style="background: rgba(0,0,0,0.3); margin-bottom: 1.5rem;">
                <p style="font-size: 1.1rem; line-height: 1.8;">${phase.situation}</p>
            </div>
            <h3 style="color: var(--gold);">ناقشوا في مجموعاتكم:</h3>
            <ul style="margin-right: 1.5rem; margin-top: 0.5rem;">
                ${phase.questions.map(q => `<li style="margin: 0.8rem 0; line-height: 1.6;">${q}</li>`).join('')}
            </ul>
            <div class="progress-text mt-3">سيتم عرض الطبقة العميقة بعد النقاش</div>
        </div>
    `;
}

function renderDweckQuestions(phase) {
    const diff = SessionData.dweck_differences[phase.differenceIndex];
    const respKey = `dweck_${diff.key}`;
    const existing = currentResponses[respKey] || {};
    
    let html = `
        <div class="phase-display">
            <div class="badge mb-2">الفرق ${phase.differenceIndex + 1}/٥</div>
            <h2 class="gold-text mb-2">${phase.title}</h2>
            <p class="subtitle">جاوب بصدق تام · ١ = لا ينطبق، ٥ = ينطبق تماماً</p>
            <div class="mt-3" id="dweckQuestionsForm">
    `;
    
    diff.questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const savedValue = existing[`q${qNum}`];
        html += `
            <div class="card" style="margin-bottom: 1rem;">
                <p style="margin-bottom: 1rem; font-size: 1rem; line-height: 1.6;"><strong>${qNum}.</strong> ${q}</p>
                <div class="likert-scale">
                    ${[1,2,3,4,5].map(v => `
                        <div class="likert-option">
                            <input type="radio" id="q${qNum}_${v}_${diff.key}" name="q${qNum}_${diff.key}" value="${v}" ${savedValue == v ? 'checked' : ''}>
                            <label for="q${qNum}_${v}_${diff.key}">
                                <span class="num">${v}</span>
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="likert-labels">
                    <span>لا ينطبق</span>
                    <span>ينطبق تماماً</span>
                </div>
            </div>
        `;
    });
    
    html += `
                <button class="btn btn-gold w-full mt-3" onclick="submitDweckQuestions('${diff.key}')">
                    حفظ بصمتي في ${diff.name} ✨
                </button>
            </div>
        </div>
    `;
    return html;
}

async function submitDweckQuestions(diffKey) {
    const responses = {};
    let allAnswered = true;
    let sum = 0;
    
    for (let i = 1; i <= 5; i++) {
        const selected = document.querySelector(`input[name="q${i}_${diffKey}"]:checked`);
        if (!selected) { allAnswered = false; break; }
        responses[`q${i}`] = parseInt(selected.value);
        sum += parseInt(selected.value);
    }
    
    if (!allAnswered) {
        showToast('من فضلك أجب على كل الأسئلة', 'error');
        return;
    }
    
    responses.avg = (sum / 5).toFixed(2);
    
    try {
        await SessionManager.saveResponse(participantId, `dweck_${diffKey}`, responses);
        showToast('✅ تم حفظ بصمتك');
        await loadAllResponses();
    } catch (e) {
        console.error(e);
        showToast('خطأ في الحفظ', 'error');
    }
}

// ====================================
// الخريطة العنكبوتية
// ====================================
function renderRadarChart() {
    const data = SessionData.dweck_differences.map(d => {
        const resp = currentResponses[`dweck_${d.key}`];
        return resp ? parseFloat(resp.avg) : 0;
    });

    const interpretations = SessionData.dweck_differences.map((d, idx) => {
        const v = data[idx];
        let interp = '—';
        if (v >= 3.7) interp = 'عقلية نمو راسخة';
        else if (v >= 2.1) interp = 'مزيج، مع ميل';
        else if (v > 0) interp = 'مساحة كبيرة للنمو';
        return { name: d.name, value: v.toFixed(2), interp, color: d.color };
    });

    return `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-3">خريطتك الشخصية</h2>
            <p class="subtitle text-center">بصمتك الخماسية في عقلية النمو</p>
            <div class="card" style="background: rgba(0,0,0,0.4);">
                <canvas id="radarCanvas" style="max-width: 100%;"></canvas>
            </div>
            <table class="results-table mt-3">
                ${interpretations.map(i => `
                    <tr>
                        <td>${i.name}</td>
                        <td class="score-cell" style="color: ${i.color};">${i.value}</td>
                        <td style="color: var(--text-secondary); font-size: 0.9rem;">${i.interp}</td>
                    </tr>
                `).join('')}
            </table>
            <p class="progress-text mt-3">المرحلة القادمة: اختار فرق واحد للعمل عليه</p>
        </div>
    `;
}

function buildRadarChart() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    if (radarChart) radarChart.destroy();
    
    const labels = SessionData.dweck_differences.map(d => d.name);
    const data = SessionData.dweck_differences.map(d => {
        const resp = currentResponses[`dweck_${d.key}`];
        return resp ? parseFloat(resp.avg) : 0;
    });
    
    radarChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'بصمتك',
                data: data,
                backgroundColor: 'rgba(251, 191, 36, 0.25)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0, max: 5,
                    ticks: { stepSize: 1, color: '#94a3b8', backdropColor: 'transparent' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#f8fafc', font: { size: 13, family: 'Tajawal' } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderFocusChoice() {
    const existing = currentResponses.dweck_focus;
    
    let html = `
        <div class="phase-display">
            <h2 class="gold-text text-center">اختار فرق واحد</h2>
            <p class="subtitle text-center">هتشتغل عليه باقي اليوم</p>
            <p class="mt-2 text-center" style="color: var(--text-muted); font-size: 0.95rem;">
                اختار الفرق اللي درجتك فيه أقل من ٣، أو اللي لو اشتغلت عليه هيكون له أكبر تأثير
            </p>
            <div class="mt-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.8rem;">
    `;
    
    SessionData.dweck_differences.forEach(d => {
        const resp = currentResponses[`dweck_${d.key}`];
        const score = resp ? resp.avg : '—';
        const isSelected = existing && existing.choice === d.key;
        html += `
            <div class="focus-card ${isSelected ? 'selected' : ''}" onclick="selectFocus('${d.key}')">
                <h4>${d.name}</h4>
                <div class="score">درجتك: ${score}</div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    return html;
}

async function selectFocus(key) {
    await SessionManager.saveResponse(participantId, 'dweck_focus', { choice: key });
    await loadAllResponses();
    showToast('✅ ' + SessionData.dweck_differences.find(d => d.key === key).name);
    renderPhase(currentSession.currentPhase);
}

// ====================================
// قصة كريم والمناعة
// ====================================
function renderKarimStory(phase) {
    const k = phase.data;
    return `
        <div class="phase-display">
            <h2 class="gold-text text-center">${phase.title}</h2>
            <div class="card mt-3" style="background: rgba(0,0,0,0.3);">
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--gold);">١. هدفه المعلَن</strong>
                    <p style="margin-top: 0.3rem;">${k.stated_goal}</p>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong style="color: #fb923c;">٢. سلوكياته المضادة</strong>
                    <p style="margin-top: 0.3rem;">${k.counter_behaviors}</p>
                </div>
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--red-soft);">٣. التزامه المخفي</strong>
                    <p style="margin-top: 0.3rem;">${k.hidden_commitment}</p>
                </div>
                <div>
                    <strong style="color: #a855f7;">٤. افتراضه الكبير</strong>
                    <p style="margin-top: 0.3rem;">${k.big_assumption}</p>
                </div>
            </div>
        </div>
    `;
}

// ====================================
// الأبواب والطبائع
// ====================================
function renderDoorsIntro() {
    return `
        <div class="phase-display text-center">
            <h2 class="gold-text">الأبواب الثلاثة</h2>
            <p class="subtitle">٩ ميكانيكيات مناعة عقلية</p>
            <div class="mt-3" style="display: grid; gap: 1rem;">
                <div class="card" style="border-color: rgba(251, 191, 36, 0.3);">
                    <h3 style="color: var(--gold);">🔥 الباب الأول — الهمة والعزيمة</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">الطبائع: ١ · ٨ · ٩</p>
                </div>
                <div class="card" style="border-color: rgba(236, 72, 153, 0.3);">
                    <h3 style="color: #ec4899;">💗 الباب الثاني — الأنس والقرب</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">الطبائع: ٢ · ٣ · ٤</p>
                </div>
                <div class="card" style="border-color: rgba(59, 130, 246, 0.3);">
                    <h3 style="color: #3b82f6;">💡 الباب الثالث — اليقين والبيان</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">الطبائع: ٥ · ٦ · ٧</p>
                </div>
            </div>
        </div>
    `;
}

function renderNature(phase) {
    let html = `<div class="phase-display"><h2 class="gold-text text-center">${phase.title}</h2>`;
    if (phase.subtitle) html += `<p class="subtitle text-center">${phase.subtitle}</p>`;
    
    if (phase.data) {
        html += `
            <div class="card mt-3" style="background: rgba(0,0,0,0.3);">
                <div style="margin-bottom: 1rem;">
                    <strong style="color: var(--gold);">الالتزام المخفي:</strong>
                    <p style="font-size: 1.1rem; margin-top: 0.3rem;">${phase.data.hidden_commitment}</p>
                </div>
                <div>
                    <strong style="color: var(--red-soft);">الافتراض الكبير:</strong>
                    <p style="font-size: 1.1rem; margin-top: 0.3rem;">${phase.data.big_assumption}</p>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    return html;
}

function renderNaturesTable() {
    let html = `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-3">٩ طبائع · ٩ التزامات · ٩ ميكانيكيات</h2>
            <div class="card" style="background: rgba(0,0,0,0.3); padding: 1rem; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-subtle);">
                            <th style="text-align: right; padding: 0.5rem; color: var(--gold);">الطبيعة</th>
                            <th style="text-align: right; padding: 0.5rem; color: var(--gold);">الباب</th>
                            <th style="text-align: right; padding: 0.5rem; color: var(--gold);">الالتزام المخفي</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    SessionData.natures.forEach(n => {
        html += `<tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.6rem 0.5rem;"><strong style="color: ${n.color};">${n.num}. ${n.name}</strong></td>
            <td style="padding: 0.6rem 0.5rem; color: var(--text-muted); font-size: 0.85rem;">${n.door}</td>
            <td style="padding: 0.6rem 0.5rem;">${n.hidden}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div></div>`;
    return html;
}

// ====================================
// التطبيق الذاتي - خريطة المناعة (٥ مربعات)
// ====================================
function renderImmunityWork() {
    const existing = currentResponses.immunity || {};
    const chosenFocus = currentResponses.dweck_focus?.choice;
    const focusName = chosenFocus ? SessionData.dweck_differences.find(d => d.key === chosenFocus)?.name : 'الفرق المختار';
    
    return `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-2">خريطة المناعة</h2>
            <p class="subtitle text-center">اشتغل مع شريكك خطوة بخطوة</p>
            <p class="mt-2 text-center" style="color: var(--gold); font-size: 0.95rem;">
                الفرق المختار: <strong>${focusName}</strong>
            </p>
            
            <div class="mt-3">
                <div class="immunity-box ${existing.stated_goal ? 'completed' : ''}">
                    <div class="box-number">١</div>
                    <h3 class="box-title">هدفك المعلَن</h3>
                    <p class="box-description">اكتب هدفك بصياغة قرار. مثلاً: "أن أصبح أكثر مبادرة"</p>
                    <textarea id="im_goal" placeholder="هدفي هو..." rows="3">${existing.stated_goal || ''}</textarea>
                </div>
                
                <div class="immunity-box ${existing.counter_behaviors ? 'completed' : ''}">
                    <div class="box-number">٢</div>
                    <h3 class="box-title">سلوكياتك المضادة</h3>
                    <p class="box-description">إيه اللي بأعمله فعلاً، عكس الهدف؟ ٣ سلوكيات محددة بدون رحمة على نفسك</p>
                    <textarea id="im_behaviors" placeholder="١. بأفعل...&#10;٢. بأفعل...&#10;٣. بأفعل..." rows="4">${existing.counter_behaviors || ''}</textarea>
                </div>
                
                <div class="immunity-box ${existing.hidden_commitment ? 'completed' : ''}">
                    <div class="box-number">٣</div>
                    <h3 class="box-title">التزامك المخفي</h3>
                    <p class="box-description">"لو فعلت السلوكيات المضادة، فأنا ملتزم خفية بـ..." (يبدأ بـ"ألا")</p>
                    <textarea id="im_commitment" placeholder="ألا..." rows="3">${existing.hidden_commitment || ''}</textarea>
                </div>
                
                <div class="immunity-box ${existing.big_assumption ? 'completed' : ''}">
                    <div class="box-number">٤</div>
                    <h3 class="box-title">افتراضك الكبير</h3>
                    <p class="box-description">"لو حصل اللي خايف منه..." الافتراض المنطقي في عقلك</p>
                    <textarea id="im_assumption" placeholder="لو..." rows="3">${existing.big_assumption || ''}</textarea>
                </div>
                
                <div class="immunity-box ${existing.contrary_evidence ? 'completed' : ''}">
                    <div class="box-number">٥</div>
                    <h3 class="box-title">اختبار الافتراض</h3>
                    <p class="box-description">دليل واحد من حياتك أن افتراضك مش لازم يكون صحيح</p>
                    <textarea id="im_evidence" placeholder="مرة..." rows="3">${existing.contrary_evidence || ''}</textarea>
                </div>
                
                <button class="btn btn-gold w-full mt-3" onclick="saveImmunityWork()">
                    💾 حفظ كل المربعات
                </button>
            </div>
        </div>
    `;
}

async function saveImmunityWork() {
    const data = {
        stated_goal: document.getElementById('im_goal').value.trim(),
        counter_behaviors: document.getElementById('im_behaviors').value.trim(),
        hidden_commitment: document.getElementById('im_commitment').value.trim(),
        big_assumption: document.getElementById('im_assumption').value.trim(),
        contrary_evidence: document.getElementById('im_evidence').value.trim()
    };
    
    try {
        await SessionManager.saveResponse(participantId, 'immunity', data);
        await loadAllResponses();
        showToast('✅ تم الحفظ');
    } catch (e) {
        showToast('خطأ في الحفظ', 'error');
    }
}

// ====================================
// قصة أسامة وعمل المجموعات
// ====================================
function renderOsamaStory(phase) {
    let html = `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-2">${phase.title}</h2>
    `;
    
    if (phase.story) {
        html += '<div class="mt-3">';
        phase.story.forEach((paragraph, idx) => {
            html += `<div class="card" style="margin-bottom: 1rem;">
                <p style="line-height: 1.8;">${paragraph}</p>
            </div>`;
        });
        html += '</div>';
    }
    
    if (phase.sentences) {
        html += `<h3 style="color: var(--gold); margin-top: 2rem;">جمل أسامة:</h3>`;
        html += '<div class="mt-2">';
        phase.sentences.forEach(s => {
            html += `<div class="card" style="margin-bottom: 0.6rem; padding: 0.8rem 1.2rem; font-style: italic;">"${s}"</div>`;
        });
        html += '</div>';
    }
    
    html += `</div>`;
    return html;
}

async function renderOsamaGroupWork() {
    const content = document.getElementById('contentArea');
    
    // الحصول على المجموعة المخصصة للمشارك
    let groupId = null;
    let myGroup = null;
    
    if (participantId) {
        try {
            const participantDoc = await SessionManager.participantsRef().doc(participantId).get();
            if (participantDoc.exists) {
                const data = participantDoc.data();
                if (data.groupId) {
                    groupId = data.groupId;
                    const groupDoc = await SessionManager.groupsRef().doc(data.groupId).get();
                    if (groupDoc.exists) myGroup = groupDoc.data();
                }
            }
        } catch (e) { console.warn(e); }
    }
    
    if (!myGroup) {
        content.innerHTML = `
            <div class="phase-display waiting-display text-center">
                <div class="icon" style="font-size: 3rem;">⏳</div>
                <h2 class="gold-text">في انتظار توزيع المجموعات</h2>
                <p class="subtitle">المدرّب سيقسم القاعة لـ٥ مجموعات قريباً</p>
            </div>
        `;
        return;
    }
    
    const dim = SessionData.osama_dimensions.find(d => d.key === myGroup.dimension);
    const story = SessionData.phases.osama_story;
    const existing = myGroup.response || {};
    
    content.innerHTML = `
        <div class="phase-display">
            <div class="badge mb-2" style="background: ${dim.color}30; color: ${dim.color};">${myGroup.name}</div>
            <h2 class="gold-text">مدخل ${dim.name}</h2>
            <p class="subtitle">${dim.description}</p>
            
            <div class="card mt-3" style="background: rgba(0,0,0,0.3);">
                <h4 style="color: var(--gold); margin-bottom: 0.8rem;">جمل أسامة السبع</h4>
                ${story.sentences.map((s, idx) => `
                    <label style="display: block; padding: 0.5rem; margin-bottom: 0.3rem; cursor: pointer; border-radius: 6px; border: 1px solid var(--border-subtle);">
                        <input type="checkbox" class="osama-sentence" value="${s}" style="margin-left: 0.5rem;" ${(existing.revealingSentences||[]).includes(s) ? 'checked' : ''}>
                        <span style="font-style: italic;">${s}</span>
                    </label>
                `).join('')}
            </div>
            
            <div class="mt-3">
                <h4 style="color: var(--gold);">١. اختاروا جملتين كاشفتين لمدخلكم (فوق)</h4>
            </div>
            
            <div class="mt-3">
                <h4 style="color: var(--gold);">٢. اقترحوا ٣ أسئلة محددة</h4>
                ${[0,1,2].map(idx => `
                    <div class="mt-2">
                        <label>السؤال ${idx + 1}</label>
                        <textarea id="oq_${idx}" rows="2" placeholder="اكتب السؤال هنا...">${(existing.questions||[])[idx] || ''}</textarea>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-3">
                <h4 style="color: var(--gold);">٣. توقعوا رد أسامة وردكم عليه</h4>
                <label>الرد المتوقع من أسامة</label>
                <textarea id="expectedResponse" rows="3">${existing.expectedResponse || ''}</textarea>
                <label class="mt-2">ردكم على رده</label>
                <textarea id="teamResponse" rows="3">${existing.teamResponse || ''}</textarea>
            </div>
            
            <div class="mt-3">
                <label>السؤال الأقوى عندكم (الذي ستعرضوه على المدرب)</label>
                <textarea id="bestQuestion" rows="2" placeholder="السؤال الأكثر تأثيراً...">${existing.bestQuestion || ''}</textarea>
            </div>
            
            <button class="btn btn-gold w-full mt-3" onclick="saveGroupResponse('${groupId}')">
                💾 حفظ إجابة المجموعة
            </button>
        </div>
    `;
}

async function saveGroupResponse(groupId) {
    const sentences = [...document.querySelectorAll('.osama-sentence:checked')].map(c => c.value);
    const questions = [0,1,2].map(idx => document.getElementById(`oq_${idx}`).value.trim()).filter(q => q);
    const expectedResponse = document.getElementById('expectedResponse').value.trim();
    const teamResponse = document.getElementById('teamResponse').value.trim();
    const bestQuestion = document.getElementById('bestQuestion').value.trim();
    
    if (sentences.length === 0 && questions.length === 0) {
        showToast('من فضلك اختر جمل أو اكتب أسئلة', 'error');
        return;
    }
    
    try {
        await SessionManager.saveGroupResponse(groupId, {
            revealingSentences: sentences,
            questions: questions,
            expectedResponse,
            teamResponse,
            bestQuestion
        });
        showToast('✅ تم حفظ إجابة المجموعة');
    } catch (e) {
        console.error(e);
        showToast('خطأ في الحفظ', 'error');
    }
}

async function renderOsamaProtocol() {
    const content = document.getElementById('contentArea');
    const groupsSnapshot = await SessionManager.groupsRef().get();
    const groups = [];
    groupsSnapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() }));
    
    let html = `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-3">البروتوكول الذي بنيتموه</h2>
            <p class="subtitle text-center">٥ مداخل لتحويل أسامة من الاحتياج إلى القدرة</p>
            <div class="mt-3">
    `;
    
    groups.forEach(g => {
        const dim = SessionData.osama_dimensions.find(d => d.key === g.dimension);
        if (!dim || !g.response) return;
        html += `
            <div class="card" style="margin-bottom: 1rem; border-color: ${dim.color}; border-width: 2px;">
                <h3 style="color: ${dim.color};">مدخل ${dim.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${dim.description}</p>
                ${g.response.bestQuestion ? `
                    <div style="margin-bottom: 0.8rem;">
                        <strong style="color: var(--gold);">السؤال الأقوى:</strong>
                        <p style="margin-top: 0.3rem; font-style: italic;">"${g.response.bestQuestion}"</p>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    if (groups.filter(g => g.response).length === 0) {
        html += '<p class="text-center" style="color: var(--text-muted);">في انتظار إجابات المجموعات...</p>';
    }
    
    html += `</div></div>`;
    content.innerHTML = html;
}

// ====================================
// الجبل الجليدي والختام
// ====================================
function renderIceberg(phase) {
    return `
        <div class="phase-display">
            <h2 class="gold-text text-center mb-3">${phase.title}</h2>
            ${phase.subtitle ? `<p class="subtitle text-center">${phase.subtitle}</p>` : ''}
            
            <div class="card mt-3" style="background: linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 30%, rgba(10, 14, 39, 0.5) 30%, rgba(10, 14, 39, 0.8) 100%);">
                <div class="text-center" style="padding: 1rem 0; border-bottom: 2px solid var(--blue-light); margin-bottom: 1rem;">
                    <strong style="color: var(--blue-light); font-size: 1.1rem;">🌊 فوق السطح (١٠٪)</strong>
                    <p style="margin-top: 0.5rem; color: var(--text-secondary);">النتائج المرئية — الـ٥ نتائج لدويك</p>
                </div>
                <div style="padding-top: 1rem;">
                    <strong style="color: var(--gold); font-size: 1.1rem;">🌊 تحت السطح (٩٠٪)</strong>
                    ${SessionData.iceberg_layers.filter(l => l.position === 'below').map((layer, idx) => `
                        <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle);">
                            <strong style="color: var(--gold);">${idx + 1}.</strong> ${layer.name}
                        </div>
                    `).join('')}
                    <div class="mt-3" style="padding: 1rem; background: rgba(251, 191, 36, 0.1); border-radius: 12px; text-align: center;">
                        <strong style="color: var(--gold); font-size: 1.2rem;">◯ طبقة الهوية ◯</strong>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem;">الجوهر والأشواق</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPerspectiveReveal() {
    return `
        <div class="phase-display text-center">
            <h2 style="color: var(--text-secondary); font-size: 1.2rem;">اللي عشتموه النهارده — له اسم</h2>
            <h1 class="gold-text mt-3" style="font-size: 3.5rem; letter-spacing: 0.05em;">منظور الفؤاد</h1>
            <p class="subtitle mt-3">شغل يربط ابن القيم والغزالي وابن مسكويه بعلم النفس الحديث</p>
            
            <div class="card mt-4" style="text-align: right;">
                <h3 style="color: var(--gold); margin-bottom: 1rem;">النهارده لمستم:</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <div>✓ الـ٥ نتائج لدويك (السطح المرئي)</div>
                    <div>✓ مرآة السلوك (طبقة ١)</div>
                    <div>✓ مرآة الدوافع (طبقة ٦) - الأبواب الثلاثة</div>
                    <div>✓ مرآة الجروح (طبقة ٧) - في حالة أسامة</div>
                </div>
                <div class="divider"></div>
                <h3 style="color: var(--text-muted); margin-bottom: 1rem;">وفي العمق:</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; color: var(--text-muted);">
                    <div>○ ٤ مرايا أخرى لم نمسّها</div>
                    <div>○ طبقة الهوية — الجوهر والأشواق</div>
                    <div>○ ٩ طبائع بتفاصيلها الكاملة</div>
                </div>
            </div>
        </div>
    `;
}

// ====================================
// الميثاق الشخصي
// ====================================
function renderCharter() {
    // البيانات من المراحل السابقة
    const immunity = currentResponses.immunity || {};
    const focus = currentResponses.dweck_focus?.choice;
    const focusName = focus ? SessionData.dweck_differences.find(d => d.key === focus)?.name : '';
    const existing = currentResponses.charter || {};
    
    if (existing.signed) {
        return `
            <div class="phase-display text-center">
                <div style="font-size: 4rem;">✨</div>
                <h2 class="gold-text">ميثاقك محفوظ</h2>
                <p class="subtitle">رحلة الـ٩٠ يوم بدأت</p>
                
                <div class="card mt-3" style="text-align: right; background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%); border-color: var(--gold);">
                    <h3 style="color: var(--gold); margin-bottom: 1rem;">ميثاق ${participantName}</h3>
                    <div style="margin-bottom: 1rem;">
                        <strong>الفرق المختار:</strong> ${focusName}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>الالتزام المخفي:</strong>
                        <p>${immunity.hidden_commitment || existing.hidden_commitment || '—'}</p>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>الافتراض الكبير:</strong>
                        <p>${immunity.big_assumption || existing.big_assumption || '—'}</p>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>السلوك الأسبوعي:</strong>
                        <p style="color: var(--gold);">${existing.weekly_commitment || '—'}</p>
                    </div>
                    <div>
                        <strong>الدليل المضاد:</strong>
                        <p>${existing.contrary_evidence || immunity.contrary_evidence || '—'}</p>
                    </div>
                </div>
                <p class="mt-3" style="color: var(--text-muted);">بعد ٧ أيام، ستجد رسالة منا. ثم بعد ٣٠، ٦٠، ٩٠ يوم.</p>
            </div>
        `;
    }
    
    return `
        <div class="phase-display">
            <h2 class="gold-text text-center">ميثاقك الشخصي</h2>
            <p class="subtitle text-center">٩٠ يوم — بينك وبين نفسك</p>
            
            <div class="charter-form mt-3">
                <div class="form-group">
                    <label>اسمك</label>
                    <input type="text" value="${participantName}" readonly>
                </div>
                
                ${focusName ? `
                <div class="form-group">
                    <label>الفرق المختار من جلسة دويك</label>
                    <input type="text" value="${focusName}" readonly>
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label>الباب اللي اكتشفت إني أدخل منه</label>
                    <select id="ch_door">
                        <option value="">اختر الباب...</option>
                        <option value="1">الباب الأول — الهمة والعزيمة</option>
                        <option value="2">الباب الثاني — الأنس والقرب</option>
                        <option value="3">الباب الثالث — اليقين والبيان</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>الطبيعة الأقرب لي</label>
                    <select id="ch_nature">
                        <option value="">اختر الطبيعة...</option>
                        ${SessionData.natures.map(n => `<option value="${n.num}">الطبيعة ${n.num} — ${n.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>التزامي المخفي</label>
                    <textarea id="ch_commitment" rows="2">${immunity.hidden_commitment || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>افتراضي الكبير الذي سأختبره</label>
                    <textarea id="ch_assumption" rows="2">${immunity.big_assumption || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>السلوك الأسبوعي الذي ألتزم به (محدد وقابل للقياس)</label>
                    <textarea id="ch_weekly" rows="3" placeholder="مثال: هكتب يوم الخميس صفحة عن قراراتي الأسبوع ده"></textarea>
                </div>
                
                <div class="form-group">
                    <label>دليل واحد أن افتراضي مش لازم يكون صحيح</label>
                    <textarea id="ch_evidence" rows="3">${immunity.contrary_evidence || ''}</textarea>
                </div>
                
                <button class="btn btn-gold w-full btn-large" onclick="signCharter()">
                    ✨ أوقّع ميثاقي
                </button>
            </div>
        </div>
    `;
}

async function signCharter() {
    const data = {
        signed: true,
        door: document.getElementById('ch_door').value,
        nature: document.getElementById('ch_nature').value,
        hidden_commitment: document.getElementById('ch_commitment').value.trim(),
        big_assumption: document.getElementById('ch_assumption').value.trim(),
        weekly_commitment: document.getElementById('ch_weekly').value.trim(),
        contrary_evidence: document.getElementById('ch_evidence').value.trim(),
        focus: currentResponses.dweck_focus?.choice || ''
    };
    
    if (!data.weekly_commitment || !data.hidden_commitment) {
        showToast('من فضلك املأ السلوك الأسبوعي والالتزام المخفي', 'error');
        return;
    }
    
    try {
        // حفظ في الموقعين: في responses + في collection المواثيق
        await SessionManager.saveResponse(participantId, 'charter', data);
        await SessionManager.saveCharter(participantId, {
            ...data,
            participantName: participantName,
            participantId: participantId
        });
        
        await loadAllResponses();
        showToast('✨ ميثاقك محفوظ');
        renderPhase(currentSession.currentPhase);
    } catch (e) {
        console.error(e);
        showToast('خطأ في الحفظ', 'error');
    }
}

// ====================================
// مساعدات UI
// ====================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 50%; transform: translateX(50%);
        background: rgba(0, 0, 0, 0.95); color: var(--text-primary);
        padding: 1rem 1.8rem; border-radius: 12px;
        border: 1px solid ${type === 'error' ? 'var(--red-soft)' : 'var(--gold)'};
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        z-index: 9999; backdrop-filter: blur(20px);
        animation: slideUp 0.4s ease;
    `;
    toast.textContent = message;
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ====================================
// تشغيل
// ====================================
bootstrap();
