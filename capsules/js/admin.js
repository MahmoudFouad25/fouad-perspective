/* ============================================================
   admin.js — لوحة المدرّب
   التحكّم في المراحل، المؤقّت، المشاركون، الإحصاءات
   ============================================================ */

(function () {
    'use strict';

    let currentSession = null;
    let currentParticipants = [];
    let timerInterval = null;
    let localTimerSeconds = 0;
    let isTimerRunning = false;

    // ============ Helpers ============
    function showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.textContent = msg;
        document.getElementById('toastContainer').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function createStars() {
        const sb = document.getElementById('starsBackground');
        if (!sb) return;
        for (let i = 0; i < 80; i++) {
            const s = document.createElement('div');
            const r = Math.random();
            s.className = 'star ' + (r < 0.7 ? 'star-small' : r < 0.95 ? 'star-medium' : 'star-large');
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.animationDelay = Math.random() * 4 + 's';
            sb.appendChild(s);
        }
    }

    // ============ Phase list (sidebar) ============
    function buildPhaseList() {
        const sessionTitles = {
            0: '⏳ قبل البداية / استراحة',
            1: '🌅 الجلسة الأولى — الافتتاح',
            2: '🔍 الجلسة الثانية — الاعتراف',
            3: '🧠 الجلسة الثالثة — العقلية',
            4: '🏛️ الجلسة الرابعة — البنية والسلوك',
            5: '🌙 الجلسة الخامسة — الإغلاق'
        };

        const container = document.getElementById('phaseList');
        const grouped = {};

        SessionData.phaseOrder.forEach(pid => {
            const phase = SessionData.phases[pid];
            if (!phase) return;
            const grp = phase.session !== undefined ? phase.session : 0;
            if (!grouped[grp]) grouped[grp] = [];
            grouped[grp].push(phase);
        });

        let html = '';
        Object.keys(grouped).sort((a, b) => a - b).forEach(grp => {
            // For breaks (session=0), we want them shown inline. Skip empty groups.
            if (!grouped[grp].length) return;
            html += `<div class="session-group">
                <div class="session-group-title">${sessionTitles[grp] || 'جلسة'}</div>`;
            grouped[grp].forEach(phase => {
                const cls = phase.isBreak ? 'phase-item break' : 'phase-item';
                html += `<div class="${cls}" data-phase="${phase.id}" onclick="setPhase('${phase.id}')">
                    ${escapeHtml(phase.title)}
                </div>`;
            });
            html += '</div>';
        });

        container.innerHTML = html;
        highlightCurrentPhase();
    }

    function highlightCurrentPhase() {
        if (!currentSession) return;
        document.querySelectorAll('.phase-item').forEach(el => {
            el.classList.toggle('active', el.dataset.phase === currentSession.currentPhase);
        });
        const active = document.querySelector('.phase-item.active');
        if (active && active.scrollIntoView) {
            active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ============ Navigation ============
    window.setPhase = async function (phaseId) {
        try {
            await SessionManager.setPhase(phaseId);
            showToast('انتقلت لـ ' + (SessionData.phases[phaseId]?.title || phaseId));
        } catch (e) { showToast('فشل التحويل', 'error'); }
    };

    window.navigatePrev = function () {
        if (!currentSession) return;
        const order = SessionData.phaseOrder;
        const idx = order.indexOf(currentSession.currentPhase);
        if (idx > 0) setPhase(order[idx - 1]);
    };

    window.navigateNext = function () {
        if (!currentSession) return;
        const order = SessionData.phaseOrder;
        const idx = order.indexOf(currentSession.currentPhase);
        if (idx < order.length - 1) setPhase(order[idx + 1]);
    };

    // ============ Timer ============
    function syncTimer(session) {
        if (session.timerRunning && session.timerSeconds > 0) {
            const elapsed = session.timerStartedAt
                ? Math.floor((Date.now() - session.timerStartedAt) / 1000) : 0;
            localTimerSeconds = Math.max(0, session.timerSeconds - elapsed);
            isTimerRunning = true;
            startLocalTimer();
        } else if (session.timerSeconds > 0) {
            localTimerSeconds = session.timerSeconds;
            isTimerRunning = false;
            updateTimerDisplay();
            stopLocalTimer();
        } else {
            localTimerSeconds = 0;
            isTimerRunning = false;
            updateTimerDisplay();
            stopLocalTimer();
        }
        const btn = document.getElementById('timerToggleBtn');
        if (btn) btn.textContent = isTimerRunning ? '⏸️ وقف' : '▶️ ابدأ';
    }

    function startLocalTimer() {
        if (timerInterval) clearInterval(timerInterval);
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            if (localTimerSeconds > 0) {
                localTimerSeconds--;
                updateTimerDisplay();
                if (localTimerSeconds === 0) {
                    SessionManager.stopTimer().catch(() => {});
                    showToast('⏰ انتهى الوقت!');
                }
            } else {
                stopLocalTimer();
            }
        }, 1000);
    }

    function stopLocalTimer() {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    }

    function updateTimerDisplay() {
        const el = document.getElementById('adminTimer');
        if (!el) return;
        const m = Math.floor(localTimerSeconds / 60);
        const s = localTimerSeconds % 60;
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        el.classList.remove('warning', 'danger');
        if (localTimerSeconds <= 30 && localTimerSeconds > 0) el.classList.add('danger');
        else if (localTimerSeconds <= 60 && localTimerSeconds > 0) el.classList.add('warning');
    }

    window.setTimerAdmin = async function (seconds) {
        try { await SessionManager.setTimerOnly(seconds); }
        catch (e) { showToast('فشل', 'error'); }
    };

    window.toggleTimerAdmin = async function () {
        try {
            if (isTimerRunning) {
                await SessionManager.stopTimer();
            } else {
                if (localTimerSeconds <= 0) {
                    showToast('اضبط مدة الأول', 'error');
                    return;
                }
                await SessionManager.startTimer(localTimerSeconds);
            }
        } catch (e) { showToast('فشل', 'error'); }
    };

    window.resetTimerAdmin = async function () {
        try { await SessionManager.setTimerOnly(0); }
        catch (e) {}
    };

    // ============ Session change ============
    function handleSessionChange(session) {
        const prev = currentSession ? currentSession.currentPhase : null;
        currentSession = session;
        syncTimer(session);
        highlightCurrentPhase();
        updatePhaseLabel();
        if (prev !== session.currentPhase) {
            renderPhaseControls(session.currentPhase);
        }
    }

    function updatePhaseLabel() {
        if (!currentSession) return;
        const phase = SessionData.phases[currentSession.currentPhase];
        document.getElementById('currentPhaseLabel').firstChild.textContent =
            phase ? phase.title : currentSession.currentPhase;
        document.getElementById('currentPhaseBlock').textContent =
            phase ? (phase.block || '') : '';
    }

    // ============ Participants ============
    function handleParticipantsChange(list) {
        currentParticipants = list;
        document.getElementById('participantCount').textContent = list.length;
        renderParticipantsGrid();
        // إعادة عرض تحكّمات المرحلة لو فيها عدّاد إجابات
        if (currentSession) renderPhaseControls(currentSession.currentPhase);
    }

    function getStatusClass(p) {
        if (!p.lastSeen) return 'offline';
        const ts = p.lastSeen.toMillis ? p.lastSeen.toMillis() : Date.now();
        const diff = Date.now() - ts;
        if (diff < 60000) return 'online';
        if (diff < 180000) return 'away';
        return 'offline';
    }

    function renderParticipantsGrid() {
        const grid = document.getElementById('participantsGrid');
        if (!currentParticipants.length) {
            grid.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">لا يوجد مشاركون بعد</p>';
            return;
        }
        grid.innerHTML = currentParticipants.map(p => `
            <div class="participant-card ${getStatusClass(p)}" onclick="openParticipant('${p.id}')">
                <div class="participant-name">${escapeHtml(p.name)}</div>
                <div class="participant-status">${p.result_code ? escapeHtml(p.result_code) : ''}</div>
            </div>
        `).join('');
    }

    // ============ Participant detail modal ============
    window.openParticipant = async function (pid) {
        const p = currentParticipants.find(x => x.id === pid);
        if (!p) return;
        document.getElementById('modalParticipantName').textContent = p.name;
        document.getElementById('modalParticipantBody').innerHTML =
            '<div class="loading-spinner mx-auto"></div>';
        document.getElementById('participantModal').classList.add('is-open');
        try {
            const full = await SessionManager.getParticipantFull(pid);
            const r = full.responses || {};
            let h = `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                الكود: ${p.result_code || '—'}
            </div>`;

            const keys = Object.keys(r);
            if (!keys.length) {
                h += '<p style="color: var(--text-muted);">لا توجد إجابات بعد</p>';
            } else {
                keys.forEach(k => {
                    h += `<div class="card mb-2">
                        <div style="color: var(--gold); font-weight: 600; font-size: 0.9rem;">${escapeHtml(k)}</div>
                        <pre style="margin-top: 0.5rem; white-space: pre-wrap; color: var(--text-secondary); font-size: 0.85rem; font-family: inherit;">${escapeHtml(JSON.stringify(r[k], null, 2))}</pre>
                    </div>`;
                });
            }
            document.getElementById('modalParticipantBody').innerHTML = h;
        } catch (e) {
            document.getElementById('modalParticipantBody').innerHTML = '<p>فشل التحميل</p>';
        }
    };

    window.closeParticipantModal = function () {
        document.getElementById('participantModal').classList.remove('is-open');
    };

    // ============ Phase controls ============
    async function renderPhaseControls(phaseId) {
        const phase = SessionData.phases[phaseId];
        const container = document.getElementById('phaseControls');
        if (!phase) {
            container.innerHTML = '<p style="color: var(--text-muted);">لا توجد تحكّمات</p>';
            return;
        }

        const tpl = phase.template;
        let html = '';

        // عدّاد عام للمشاركين الذين أجابوا
        if (phase.saveKey) {
            const count = await countResponses(phase.saveKey);
            html += `<div class="stat-counter mb-3">
                <span class="num">${count}</span>
                <span class="label">من ${currentParticipants.length} أجابوا</span>
            </div>`;

            // إحصاءات
            if (tpl === 'single-choice-poll' || tpl === 'six-cards-choice') {
                const counts = await tallyOptions(phase);
                html += renderOptionsTable(phase, counts);
            }
        }

        // عرض اسم المرحلة وتفاصيلها
        html += `<div class="card" style="background: rgba(255,255,255,0.02);">
            <div class="badge">${escapeHtml(phase.block || '')}</div>
            <h4 class="mt-2">${escapeHtml(phase.title)}</h4>
            ${phase.subtitle ? `<p class="subtitle">${escapeHtml(phase.subtitle)}</p>` : ''}
        </div>`;

        // اقتراحات المؤقّت لكل نوع مرحلة
        const timerSuggestions = getTimerSuggestion(phase);
        if (timerSuggestions) {
            html += `<div class="mt-2" style="font-size: 0.85rem; color: var(--text-muted);">
                💡 ${timerSuggestions}
            </div>`;
        }

        container.innerHTML = html;
    }

    function getTimerSuggestion(phase) {
        const tpl = phase.template;
        if (phase.isBreak) {
            return phase.duration ? `استراحة ${phase.duration} دقيقة` : '';
        }
        if (tpl === 'single-choice-poll' || tpl === 'six-cards-choice') return 'اقترح: 2-3 دقايق';
        if (tpl === 'axis-questions') return 'اقترح: 3 دقايق';
        if (tpl === 'behavior-assessment') return 'اقترح: 7 دقايق';
        if (tpl === 'text-inputs') return 'اقترح: 3-4 دقايق';
        if (tpl === 'loss-write-five') return 'اقترح: 2 دقايق';
        if (tpl === 'loss-drop-four') return 'اقترح: 2 دقايق';
        return '';
    }

    async function countResponses(saveKey) {
        let count = 0;
        for (const p of currentParticipants) {
            try {
                const r = await SessionManager.getResponse(p.id, saveKey);
                if (r && (r.optionId || r.locked || r.values)) count++;
            } catch (e) {}
        }
        return count;
    }

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

    function renderOptionsTable(phase, counts) {
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        let html = '<table class="stats-table"><thead><tr><th>الخيار</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>';
        phase.options.forEach(o => {
            const c = counts[o.id] || 0;
            const pct = Math.round((c / total) * 100);
            const label = (o.label || '').length > 40 ? o.label.substring(0, 40) + '...' : o.label;
            html += `<tr>
                <td>${escapeHtml(label)}</td>
                <td style="text-align: center;"><strong>${c}</strong></td>
                <td style="text-align: center;">
                    ${pct}%
                    <div class="stats-bar"><div class="stats-bar-fill" style="width: ${pct}%; background: ${o.color || 'var(--gold)'};"></div></div>
                </td>
            </tr>`;
        });
        return html + '</tbody></table>';
    }

    // ============ Reset session ============
    window.confirmResetSession = async function () {
        if (!confirm('هتمسح كل المشاركين والإجابات. متأكد؟')) return;
        if (!confirm('تأكيد نهائي: كل البيانات هتتمسح!')) return;
        try {
            showToast('جاري الإعادة...');
            await SessionManager.resetSession();
            showToast('✅ اتعملت إعادة ضبط');
        } catch (e) {
            showToast('فشل الإعادة', 'error');
            console.error(e);
        }
    };

    // ============ Bootstrap ============
    async function init() {
        createStars();
        try {
            await SessionManager.ensureSession();
        } catch (e) {
            console.warn('ensureSession failed:', e);
        }
        buildPhaseList();
        SessionManager.onSessionChange(handleSessionChange);
        SessionManager.onParticipantsChange(handleParticipantsChange);

        // تحديث تلقائي لشبكة المشاركين كل 15 ثانية (للحالة)
        setInterval(() => {
            if (currentParticipants.length) renderParticipantsGrid();
        }, 15000);
    }

    if (!window.firebaseReady) {
        document.addEventListener('firebaseReady', init);
    } else {
        init();
    }

})();
