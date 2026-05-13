/* ====================================================================
   منظور الفؤاد — Admin Page Controller
   ──────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── إعدادات ──
  const CONFIG = {
    resultPageUrl: location.href.replace(/admin\.html.*$/, 'result.html'),
    groupUrl:      'https://chat.whatsapp.com/H0RyRnCJP1bJVC6YDF0yju',
    nextSessionUrl: 'https://youtu.be/AlfsYx-2z3M?si=oMflxvCh3wQ8TJzP',
  };

  // ── State ──
  const state = {
    rows: [],
    filter: { axis: 'all', query: '' },
    selectedRow: null,
    loading: true,
    error: null
  };

  // ── DOM ──
  const $ = sel => document.querySelector(sel);
  const els = {
    list:       $('#participantsList'),
    statsStrip: $('#statsStrip'),
    searchInput: $('#searchInput'),
    filterBar:  $('#filterBar'),
    exportBtn:  $('#exportCsvBtn'),
    statusDot:  $('#statusDot'),
    statusLbl:  $('#statusLabel'),
    bannerHost: $('#bannerHost')
  };

  // ── Init ──
  async function init() {
    setupHeader();
    setupFilters();
    setupSearch();
    setupExport();
    await loadData();
  }

  function setupHeader() {
    const hasFB = MFPData.hasFirebase();
    els.statusDot.classList.toggle('offline', !hasFB);
    els.statusLbl.textContent = hasFB ? 'متّصل بقاعدة البيانات' : 'بدون اتّصال بقاعدة البيانات';

    if (!hasFB) {
      els.bannerHost.innerHTML = `
        <div class="banner warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <div>
            <strong style="color: var(--text-bright);">Firebase مش متحمّل في الصفحة دي.</strong><br>
            ضيف <code>&lt;script src="../js/firebase-config.js"&gt;&lt;/script&gt;</code> فوق <code>admin-data.js</code> علشان الصفحة تقرأ من Firestore.
            الصفحة جاهزة وبتشتغل — بس مفيش بيانات لتعرضها.
          </div>
        </div>
      `;
    }
  }

  async function loadData() {
    try {
      state.loading = true;
      render();
      const raw = await MFPData.listParticipants();
      const withCodes = await Promise.all(raw.map(async r => {
        const code = await MFPData.ensureResultCode(r.id, r.result_code);
        return { ...r, result_code: code };
      }));
      state.rows = MFPData.applyOverrides(withCodes);
      state.loading = false;
      render();
    } catch (err) {
      console.error(err);
      state.loading = false;
      state.error = err.message;
      render();
    }
  }

  // ── Filters & search ──
  function setupFilters() {
    els.filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-axis]');
      if (!btn) return;
      state.filter.axis = btn.dataset.axis;
      render();
    });
  }

  function setupSearch() {
    let t = null;
    els.searchInput.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.filter.query = e.target.value.trim().toLowerCase();
        render();
      }, 120);
    });
  }

  function setupExport() {
    els.exportBtn.addEventListener('click', () => {
      const rows = getFilteredRows();
      if (rows.length === 0) {
        toast('مفيش بيانات للتصدير');
        return;
      }
      const csv = MFPData.toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mfp_participants_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`اتصدّر ${toArNum(rows.length)} صفّ`);
    });
  }

  function getFilteredRows() {
    return state.rows.filter(r => {
      if (state.filter.axis !== 'all' && r.result?.main_axis !== state.filter.axis) return false;
      if (state.filter.query) {
        const q = state.filter.query;
        const hay = `${r.name} ${r.whatsapp} ${r.result_code || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ── Render ──
  function render() {
    renderStats();
    renderFilters();
    renderList();
  }

  function renderStats() {
    const all = state.rows;
    const counts = { tamasok: 0, haywiyya: 0, intima: 0 };
    all.forEach(r => {
      const a = r.result?.main_axis;
      if (a && counts.hasOwnProperty(a)) counts[a]++;
    });
    const total = all.length || 1;
    const sent = all.filter(r => r.whatsapp_sent_at).length;

    els.statsStrip.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">مسجّلين كملوا التشخيص</div>
        <div class="stat-value">${toArNum(all.length)}<span class="unit">${all.length === 1 ? 'مشارك' : 'مشارك'}</span></div>
        <div style="margin-top: 12px; color: var(--text-muted); font-size: 13px;">
          ${toArNum(sent)} اتبعتلهم الرسالة · ${toArNum(all.length - sent)} لسه
        </div>
      </div>
      <div class="stat-card tamasok">
        <div class="stat-label">التماسك</div>
        <div class="stat-value">${toArNum(counts.tamasok)}<span class="unit">${pct(counts.tamasok, total)}٪</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width: ${pct(counts.tamasok, total)}%;"></div></div>
      </div>
      <div class="stat-card haywiyya">
        <div class="stat-label">الحيوية</div>
        <div class="stat-value">${toArNum(counts.haywiyya)}<span class="unit">${pct(counts.haywiyya, total)}٪</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width: ${pct(counts.haywiyya, total)}%;"></div></div>
      </div>
      <div class="stat-card intima">
        <div class="stat-label">الانتماء</div>
        <div class="stat-value">${toArNum(counts.intima)}<span class="unit">${pct(counts.intima, total)}٪</span></div>
        <div class="stat-bar"><div class="stat-bar-fill" style="width: ${pct(counts.intima, total)}%;"></div></div>
      </div>
    `;
  }

  function renderFilters() {
    const all = state.rows;
    const c = { tamasok: 0, haywiyya: 0, intima: 0 };
    all.forEach(r => { if (r.result?.main_axis) c[r.result.main_axis]++; });

    els.filterBar.innerHTML = `
      <button data-axis="all" class="${state.filter.axis === 'all' ? 'active' : ''}">
        الكل <span class="count">${toArNum(all.length)}</span>
      </button>
      <button data-axis="tamasok" class="${state.filter.axis === 'tamasok' ? 'active tamasok' : ''}">
        التماسك <span class="count">${toArNum(c.tamasok)}</span>
      </button>
      <button data-axis="haywiyya" class="${state.filter.axis === 'haywiyya' ? 'active haywiyya' : ''}">
        الحيوية <span class="count">${toArNum(c.haywiyya)}</span>
      </button>
      <button data-axis="intima" class="${state.filter.axis === 'intima' ? 'active intima' : ''}">
        الانتماء <span class="count">${toArNum(c.intima)}</span>
      </button>
    `;
  }

  function renderList() {
    if (state.loading) {
      els.list.innerHTML = `
        <div class="loading">
          <div class="pulse"></div>
          <div style="color: var(--text-muted); font-size: 14px;">بنقرأ المسجّلين...</div>
        </div>
      `;
      return;
    }

    const rows = getFilteredRows();

    if (rows.length === 0) {
      els.list.innerHTML = `
        <div class="empty">
          <div class="pulse" style="background: var(--text-faint); box-shadow: none;"></div>
          <h3>${state.rows.length === 0 ? 'لسه مفيش مسجّلين' : 'مفيش نتيجة للبحث'}</h3>
          <p>${state.rows.length === 0
            ? 'الصفحة دي بتعرض اللي كملوا الاختبار التشخيصيّ وسجّلوا أسماءهم ورقم الواتس. لمّا أوّل مشارك يكمّل — هيظهر هنا تلقائيًّا.'
            : 'جرّب تغيّر المحور أو تمسح البحث.'}</p>
        </div>
      `;
      return;
    }

    els.list.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>المشارك</th>
            <th>المحاور</th>
            <th>أ/ب/ج</th>
            <th>كود النتيجة</th>
            <th>اتسجّل</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml).join('')}
        </tbody>
      </table>
    `;

    els.list.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      const row = state.rows.find(r => r.id === id);
      if (!row) return;

      tr.querySelector('[data-act="preview"]')?.addEventListener('click', () => openPreview(row));
      tr.querySelector('[data-act="copy"]')?.addEventListener('click', () => copyLink(row));
      tr.querySelector('[data-act="open"]')?.addEventListener('click', () => window.open(resultUrl(row), '_blank'));
      tr.querySelector('[data-act="wa"]')?.addEventListener('click', () => sendWA(row));
      tr.querySelector('[data-act="toggle-sent"]')?.addEventListener('click', () => toggleSent(row));
    });
  }

  function rowHtml(r) {
    const main = r.result?.main_axis;
    const sec  = r.result?.secondary_axis;
    const color = main ? `var(--${main})` : 'var(--text-faint)';
    const glow  = main ? `var(--${main}-glow)` : 'transparent';
    const initial = (r.name || '?').trim().slice(0, 1).toUpperCase();
    const dateStr = r.created_at ? formatRelative(r.created_at) : '—';
    const sent = !!r.whatsapp_sent_at;

    return `
      <tr data-id="${r.id}" class="${sent ? 'sent' : ''}">
        <td data-label="المشارك">
          <div class="cell-name" style="--axis-color: ${color}; --axis-glow: ${glow};">
            <div class="avatar">${escape(initial)}</div>
            <div>
              <div class="name">${escape(r.name)}</div>
              <div class="meta">${escape(r.whatsapp)} · ${dateStr}</div>
            </div>
          </div>
        </td>
        <td data-label="المحاور">
          <div class="cell-axis">
            <span class="axis-pill" style="--axis-color: var(--${main}); --axis-soft: var(--${main}-soft);">
              ${AXIS_AR[main] || '—'}
            </span>
            <span class="secondary">فرعيّ: ${AXIS_AR[sec] || '—'}</span>
          </div>
        </td>
        <td data-label="أ/ب/ج">
          ${countsPipsHtml(r)}
        </td>
        <td data-label="كود النتيجة">
          <span class="cell-code">${escape(r.result_code || '—')}</span>
        </td>
        <td data-label="اتسجّل">
          <span style="color: ${sent ? '#25D366' : 'var(--text-muted)'}; font-size: 13px;">
            ${sent ? '✓ اتبعت' : '·'}
          </span>
        </td>
        <td data-label="إجراءات">
          <div class="cell-actions">
            <button class="btn-icon" data-act="preview" title="معاينة الرسالة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="btn-icon" data-act="open" title="افتح التقرير الشخصيّ في تابة جديدة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            <button class="btn-icon" data-act="copy" title="انسخ رابط النتيجة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="wa-btn ${sent ? 'sent' : ''}" data-act="wa" title="ابعت رسالة الواتس">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.337 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              ${sent ? 'تمّ' : 'ابعت'}
            </button>
            <button class="btn-icon" data-act="toggle-sent" title="${sent ? 'لغي علامة اتبعت' : 'علم إنّها اتبعت يدويًّا'}">
              ${sent
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function countsPipsHtml(r) {
    const lt = r.result?.letters || { a: 0, b: 0, c: 0 };
    const main = r.result?.main_axis;
    const letterToAxis = { a: 'tamasok', b: 'haywiyya', c: 'intima' };
    return `<div class="cell-counts">${['a','b','c'].map(k => {
      const isMain = letterToAxis[k] === main;
      return `<span class="count-pip ${isMain ? 'lead ' + main : ''}">${toArNum(lt[k] || 0)}</span>`;
    }).join('')}</div>`;
  }

  // ── Actions ──
  function resultUrl(r) {
    return `${CONFIG.resultPageUrl}?c=${encodeURIComponent(r.result_code || '')}`;
  }

  function waMessage(r) {
    const axisName = AXIS_AR[r.result?.main_axis] || '';
    const url = resultUrl(r);
    return [
      `أهلاً ${r.name}،`,
      '',
      'شكرًا إنّك معانا في "من الاحتراق إلى استعادة الاتّزان".',
      '',
      'في الاختبار التشخيصيّ اللي عملته في الويبينار — طلع عندنا حاجة مهمّة عن طريقة احتراقك إنت تحديدًا.',
      '',
      `محورك الرئيسيّ: *${axisName}*`,
      '',
      'التقرير الكامل (المحور + الأبعاد التلاتة + وجه الفطرة والقناع + خطوة عمليّة لإسبوعك الجاي):',
      url,
      '',
      `كود الدخول: ${r.result_code || ''}`,
      '',
      '— — —',
      '',
      'لإنّ الكلام ده ربع التشخيص — في الجزء التاني من الويبينار هندخل عمق الطبائع التسعة وبصمتك إنت تحديدًا تحت محورك.',
      '',
      'احفظ مكانك واتابع تفاصيل اللقاء الجاي في الجروب:',
      CONFIG.groupUrl,
      '',
      'تسجيل اللقاء الأوّل (لو حابب تشاركه مع حدّ يحضر اللقاء الجاي):',
      CONFIG.nextSessionUrl,
      '',
      '— محمود فؤاد',
      'منظور الفؤاد'
    ].join('\n');
  }

  function sendWA(r) {
    const phone = (r.whatsapp || '').replace(/\D/g, '');
    if (!phone) { toast('رقم الواتس مش متوفّر'); return; }
    const normalized = phone.startsWith('20') ? phone
                     : phone.startsWith('0')  ? '2' + phone
                     :                          '20' + phone;
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(waMessage(r))}`;
    window.open(url, '_blank');

    // مش بنعلّم تلقائيًّا — المسؤول هو اللي بيقول "اتبعتت"
    setTimeout(() => {
      if (!confirm('تمّ فتح واتس آب. تعلّم الصفّ ده "اتبعت"؟')) return;
      toggleSent(r, true);
    }, 600);
  }

  async function toggleSent(r, force) {
    const next = typeof force === 'boolean' ? force : !r.whatsapp_sent_at;
    await MFPData.setSent(r.id, next);
    r.whatsapp_sent_at = next ? new Date() : null;
    render();
    toast(next ? 'اتعلّمت "اتبعت"' : 'اتلغت علامة الإرسال');
  }

  async function copyLink(r) {
    const url = resultUrl(r);
    try {
      await navigator.clipboard.writeText(url);
      toast('اللينك اتنسخ');
    } catch (e) {
      prompt('انسخ اللينك:', url);
    }
  }

  function openPreview(r) {
    state.selectedRow = r;
    const msg = waMessage(r);
    const html = `
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">معاينة رسالة الواتس</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                إلى ${escape(r.name)} — ${escape(r.whatsapp)}
              </div>
            </div>
            <button class="btn-icon" id="modalCloseBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="wa-preview">${formatPreview(msg)}</div>
          </div>
          <div class="modal-footer">
            <div style="font-size: 12px; color: var(--text-faint);">
              كود الدخول: <span style="color: var(--tamasok); font-weight: 600;">${escape(r.result_code || '—')}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-ghost btn-sm" id="modalOpenResult">شوف التقرير</button>
              <button class="btn btn-primary btn-sm" id="modalSendWA" style="background: #25D366; color: #fff;">ابعت الواتس</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);

    const close = () => document.getElementById('modalBackdrop')?.remove();
    document.getElementById('modalBackdrop').addEventListener('click', close);
    document.getElementById('modalCloseBtn').addEventListener('click', close);
    document.getElementById('modalSendWA').addEventListener('click', () => { close(); sendWA(r); });
    document.getElementById('modalOpenResult').addEventListener('click', () => window.open(resultUrl(r), '_blank'));
  }

  function formatPreview(msg) {
    return escape(msg).replace(/(https?:\/\/[^\s]+)/g, '<span class="link">$1</span>');
  }

  // ── Helpers ──
  function pct(n, total) { return Math.round((n / total) * 100); }
  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }

  function formatRelative(d) {
    const ms = Date.now() - d.getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'لسه دلوقتي';
    if (m < 60) return `من ${toArNum(m)} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `من ${toArNum(h)} ساعة`;
    const days = Math.floor(h / 24);
    if (days < 7) return `من ${toArNum(days)} يوم`;
    return d.toLocaleDateString('ar-EG');
  }

  function toast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);
})();
