/* ====================================================================
   منظور الفؤاد — هندسة العقلية — أدمن الرحلات (Controller)
   يقرأ journey_participants عبر MFPJourney، يعرض البصمة الكاملة،
   ويبني رسالة واتس فيها ملخّص البصمة + لينك التقرير الدائم.
   ──────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const CONFIG = {
    // لينك صفحة التقرير (نفس مجلّد الأدمن)
    resultPath: location.href.replace(/[^/]*(\?.*)?$/, 'journey-result.html'),
    // لينك الدورة + جروب (اختياري) — حطّهم لمّا يجهزوا
    courseUrl: '',
    groupUrl:  ''
  };

  const AX = () => window.AXIS_AR || {};
  const DR = () => window.DOOR_AR || {};
  const FL = () => window.FLAVOR_AR || {};
  const BR = () => window.BURNOUT_AR || {};
  const ar = (n) => (window.toArabicDigits ? window.toArabicDigits(n) : String(n));

  const state = { rows: [], filter: { axis: 'all', status: 'all', query: '' }, loading: true };

  const $ = s => document.querySelector(s);
  const els = {
    list: $('#participantsList'), stats: $('#statsStrip'), search: $('#searchInput'),
    filterBar: $('#filterBar'), exportBtn: $('#exportCsvBtn'),
    dot: $('#statusDot'), lbl: $('#statusLabel'), banner: $('#bannerHost')
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupHeader();
    setupFilters();
    setupSearch();
    setupExport();
    await load();
  }

  function setupHeader() {
    const ok = window.MFPJourney && window.MFPJourney.hasFirebase();
    els.dot.classList.toggle('offline', !ok);
    els.lbl.textContent = ok ? 'متّصل بقاعدة البيانات' : 'بدون اتّصال';
    if (!ok) {
      els.banner.innerHTML = `
        <div class="banner warn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div><strong>Firebase مش متحمّل.</strong> ضيف <code>../js/firebase-config.js</code> فوق <code>journey-data.js</code> علشان الصفحة تقرأ من Firestore. للتجربة بس: زوّد <code>?demo=1</code> على الرابط.</div>
        </div>`;
    }
  }

  async function load() {
    try {
      state.loading = true; render();
      state.rows = await window.MFPJourney.listParticipants();
      state.loading = false; render();
    } catch (err) {
      console.error(err); state.loading = false; state.rows = []; render();
      toast('في مشكلة في قراءة البيانات');
    }
  }

  /* ── فلاتر وبحث ── */
  function setupFilters() {
    els.filterBar.addEventListener('click', e => {
      const b = e.target.closest('button[data-axis],button[data-status]');
      if (!b) return;
      if (b.dataset.status) state.filter.status = b.dataset.status;
      if (b.dataset.axis) state.filter.axis = b.dataset.axis;
      render();
    });
  }
  function setupSearch() {
    let t;
    els.search.addEventListener('input', e => {
      clearTimeout(t);
      t = setTimeout(() => { state.filter.query = e.target.value.trim().toLowerCase(); render(); }, 120);
    });
  }
  function setupExport() {
    els.exportBtn.addEventListener('click', () => {
      const rows = filtered();
      if (!rows.length) return toast('مفيش بيانات للتصدير');
      const csv = window.MFPJourney.toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `journey_participants_${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast(`اتصدّر ${ar(rows.length)} صفّ`);
    });
  }

  function filtered() {
    return state.rows.filter(r => {
      if (state.filter.axis !== 'all' && r.main_axis !== state.filter.axis) return false;
      if (state.filter.status === 'ready' && (!r.whatsapp || r.whatsapp_sent_at)) return false;
      if (state.filter.status === 'sent' && !r.whatsapp_sent_at) return false;
      if (state.filter.status === 'no_contact' && r.whatsapp) return false;
      if (state.filter.query) {
        const hay = `${r.name} ${r.whatsapp} ${r.result_code || ''} ${r.fingerprint_name || ''}`.toLowerCase();
        if (!hay.includes(state.filter.query)) return false;
      }
      return true;
    });
  }

  /* ── render ── */
  function render() { renderStats(); renderFilters(); renderList(); }

  function pct(n, t) { return Math.round((n / (t || 1)) * 100); }

  function renderStats() {
    const all = state.rows;
    const c = { tamasok: 0, hayawiyya: 0, intima: 0 };
    all.forEach(r => { if (c.hasOwnProperty(r.main_axis)) c[r.main_axis]++; });
    const total = all.length || 1;
    const sent = all.filter(r => r.whatsapp_sent_at).length;
    const ready = all.filter(r => r.whatsapp && !r.whatsapp_sent_at).length;
    const noc = all.filter(r => !r.whatsapp).length;
    els.stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">إجمالي المكمّلين</div>
        <div class="stat-value">${ar(all.length)}<span class="unit">مشارك</span></div>
        <div style="margin-top:13px;display:flex;flex-direction:column;gap:5px;font-size:12.5px;">
          <div style="color:#25D366;">● ${ar(ready)} جاهزين للإرسال</div>
          <div style="color:var(--muted);">○ ${ar(sent)} اتبعتلهم</div>
          <div style="color:var(--faint);">○ ${ar(noc)} بدون رقم</div>
        </div>
      </div>
      ${['tamasok','hayawiyya','intima'].map(k => `
        <div class="stat-card ${k}">
          <div class="stat-label">${AX()[k]}</div>
          <div class="stat-value">${ar(c[k])}<span class="unit">${ar(pct(c[k],total))}٪</span></div>
          <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct(c[k],total)}%;"></div></div>
        </div>`).join('')}
    `;
  }

  function renderFilters() {
    const all = state.rows;
    const c = { tamasok: 0, hayawiyya: 0, intima: 0 };
    const s = { ready: 0, sent: 0, no_contact: 0 };
    all.forEach(r => {
      if (c.hasOwnProperty(r.main_axis)) c[r.main_axis]++;
      if (r.whatsapp_sent_at) s.sent++; else if (r.whatsapp) s.ready++; else s.no_contact++;
    });
    const f = state.filter;
    els.filterBar.innerHTML = `
      <button data-status="all" class="${f.status==='all'?'active':''}">الكلّ <span class="count">${ar(all.length)}</span></button>
      <button data-status="ready" class="${f.status==='ready'?'active':''}">جاهزين <span class="count">${ar(s.ready)}</span></button>
      <button data-status="sent" class="${f.status==='sent'?'active':''}">اتبعتلهم <span class="count">${ar(s.sent)}</span></button>
      <button data-status="no_contact" class="${f.status==='no_contact'?'active':''}">بدون رقم <span class="count">${ar(s.no_contact)}</span></button>
      <span style="width:1px;height:22px;background:var(--border);align-self:center;margin:0 4px;"></span>
      <button data-axis="all" class="${f.axis==='all'?'active':''}">كل المحاور</button>
      <button data-axis="tamasok" class="${f.axis==='tamasok'?'active tamasok':''}">${AX().tamasok} <span class="count">${ar(c.tamasok)}</span></button>
      <button data-axis="hayawiyya" class="${f.axis==='hayawiyya'?'active hayawiyya':''}">${AX().hayawiyya} <span class="count">${ar(c.hayawiyya)}</span></button>
      <button data-axis="intima" class="${f.axis==='intima'?'active intima':''}">${AX().intima} <span class="count">${ar(c.intima)}</span></button>
    `;
  }

  function renderList() {
    if (state.loading) {
      els.list.innerHTML = `<div class="loading"><div class="pulse"></div><div style="color:var(--muted);font-size:14px;">بنقرأ المكمّلين…</div></div>`;
      return;
    }
    const rows = filtered();
    if (!rows.length) {
      const noData = state.rows.length === 0;
      els.list.innerHTML = `
        <div class="empty">
          <div class="pulse" style="background:var(--faint);box-shadow:none;"></div>
          <h3>${noData ? 'لسه مفيش مكمّلين' : 'مفيش نتيجة للفلتر ده'}</h3>
          <p>${noData ? 'أول ما حد يخلّص رحلة "هندسة العقلية" هيظهر هنا تلقائيًّا. للتجربة زوّد ?demo=1 على الرابط.' : 'جرّب تغيّر الفلتر أو تمسح البحث.'}</p>
        </div>`;
      return;
    }
    els.list.innerHTML = `
      <table class="table">
        <thead><tr><th>المشارك</th><th>البصمة</th><th>الاحتراق</th><th>الكود</th><th>اتبعت</th><th></th></tr></thead>
        <tbody>${rows.map(rowHtml).join('')}</tbody>
      </table>`;
    els.list.querySelectorAll('tr[data-id]').forEach(tr => {
      const r = state.rows.find(x => x.id === tr.dataset.id);
      if (!r) return;
      tr.querySelector('[data-act="preview"]')?.addEventListener('click', () => openPreview(r));
      tr.querySelector('[data-act="open"]')?.addEventListener('click', () => window.open(resultUrl(r), '_blank'));
      tr.querySelector('[data-act="copy"]')?.addEventListener('click', () => copyLink(r));
      tr.querySelector('[data-act="wa"]')?.addEventListener('click', () => sendWA(r));
      tr.querySelector('[data-act="toggle"]')?.addEventListener('click', () => toggleSent(r));
    });
  }

  function rowHtml(r) {
    const color = r.main_axis ? `var(--${r.main_axis})` : 'var(--faint)';
    const initial = (r.name || '?').trim().slice(0, 1).toUpperCase();
    const sent = !!r.whatsapp_sent_at;
    const when = r.completed_at ? rel(r.completed_at) : '—';
    return `
      <tr data-id="${r.id}" class="${sent ? 'sent' : ''}">
        <td data-label="المشارك">
          <div class="cell-name" style="--axis-color:${color};">
            <div class="avatar">${esc(initial)}</div>
            <div><div class="name">${esc(r.name)}</div><div class="meta">${esc(r.whatsapp || 'بدون رقم')} · ${when}</div></div>
          </div>
        </td>
        <td data-label="البصمة">
          <span class="fp-pill" style="--axis-color:${color};">${esc(r.fingerprint_name || '—')}</span>
          <div class="axis-line">${esc(AX()[r.main_axis] || '—')} · ${esc(DR()[r.door] || '—')} · ${esc(FL()[r.flavor] || '—')}</div>
        </td>
        <td data-label="الاحتراق">${esc(BR()[r.burnout_type] || '—')}</td>
        <td data-label="الكود"><span class="cell-code">${esc(r.result_code || '—')}</span></td>
        <td data-label="اتبعت"><span style="color:${sent ? '#25D366' : 'var(--muted)'};font-size:13px;">${sent ? '✓ اتبعت' : '·'}</span></td>
        <td data-label="إجراءات">
          <div class="cell-actions">
            <button class="btn-icon" data-act="preview" title="معاينة الرسالة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="btn-icon" data-act="open" title="افتح التقرير"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
            <button class="btn-icon" data-act="copy" title="انسخ اللينك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            <button class="wa-btn ${sent ? 'sent' : ''}" data-act="wa"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.337 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>${sent ? 'تمّ' : 'ابعت'}</button>
            <button class="btn-icon" data-act="toggle" title="${sent ? 'إلغاء علامة اتبعت' : 'علّم اتبعت يدويًّا'}">${sent
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'}</button>
          </div>
        </td>
      </tr>`;
  }

  /* ── رسالة الواتس ── */
  function resultUrl(r) { return `${CONFIG.resultPath}?c=${encodeURIComponent(r.result_code || '')}`; }

  function waMessage(r) {
    const name = (r.name || '').trim();
    const lines = [
      `السلام عليكم ورحمة الله، مساء الخير يا ${name || ''} 👋`,
      '',
      `تابعنا إنك خلّصت رحلة "هندسة العقلية" ووصلت لبصمتك: *${r.fingerprint_name || '—'}*.`,
      '',
      'حابين ناخد رأيك بصراحة في الرحلة لحدّ دلوقتي — إيه اللي لمسك فعلًا؟ وفيه حاجة حسّيت إنها بتخصّك بالظبط؟',
      '',
      'وده تقريرك الدائم لو حبّيت ترجعله أو تشاركه في أي وقت:',
      resultUrl(r),
      '',
      `واحتفظ بكودك — بتفتح بيه رحلتك وتقريرك من أي جهاز: ${r.result_code || ''}`,
      '',
      '— محمود فؤاد · منظور الفؤاد'
    ];
    return lines.join('\n');
  }

  function sendWA(r) {
    const raw = String(r.whatsapp || '').trim();
    if (!raw) return toast('مفيش رقم واتس');
    const hadPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return toast('مفيش رقم واتس');
    let number = null;
    if (hadPlus) number = digits;
    else if (digits.startsWith('00')) number = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('01')) number = '20' + digits.slice(1);
    else if (digits.length === 10 && digits.startsWith('1')) number = '20' + digits;
    else if (digits.startsWith('20') && digits.length >= 11) number = digits;
    else if (!digits.startsWith('0') && digits.length >= 10) number = digits;
    if (number) return openWA(r, number);
    openCountryPicker(r, digits.replace(/^0+/, ''));
  }

  function openWA(r, number) {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(waMessage(r))}`, '_blank');
    setTimeout(() => { if (confirm('اتفتح واتساب. أعلّم الصفّ "اتبعت"؟')) toggleSent(r, true); }, 600);
  }

  function openCountryPicker(r, localNum) {
    const countries = [
      ['966','السعوديّة'],['971','الإمارات'],['965','الكويت'],['974','قطر'],['973','البحرين'],
      ['968','عُمان'],['962','الأردنّ'],['20','مصر'],['218','ليبيا'],['249','السودان'],
      ['212','المغرب'],['216','تونس'],['213','الجزائر'],['90','تركيا']
    ];
    const html = `
      <div class="modal-backdrop" id="cpb">
        <div class="modal" style="max-width:560px;" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div><div class="modal-title">اختار كود الدولة</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;">الرقم: <strong>${esc(r.whatsapp)}</strong> — مش واضح من أي دولة</div></div>
            <button class="btn-icon" id="cpx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body">
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
              ${countries.map(([code,n]) => `<button class="btn btn-ghost btn-sm" data-code="${code}" style="justify-content:space-between;"><span>${n}</span><span style="color:var(--muted);">+${code}</span></button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
    const close = () => document.getElementById('cpb')?.remove();
    document.getElementById('cpb').addEventListener('click', close);
    document.getElementById('cpx').addEventListener('click', close);
    document.querySelectorAll('#cpb [data-code]').forEach(b =>
      b.addEventListener('click', () => { close(); openWA(r, b.dataset.code + localNum); }));
  }

  async function toggleSent(r, force) {
    const next = typeof force === 'boolean' ? force : !r.whatsapp_sent_at;
    await window.MFPJourney.setSent(r.id, next);
    r.whatsapp_sent_at = next ? new Date() : null;
    render();
    toast(next ? 'اتعلّمت "اتبعت"' : 'اتلغت العلامة');
  }

  async function copyLink(r) {
    try { await navigator.clipboard.writeText(resultUrl(r)); toast('اللينك اتنسخ'); }
    catch (e) { prompt('انسخ اللينك:', resultUrl(r)); }
  }

  function openPreview(r) {
    const msg = waMessage(r);
    const html = `
      <div class="modal-backdrop" id="mb">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div><div class="modal-title">معاينة رسالة الواتس</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;">إلى ${esc(r.name)} — ${esc(r.whatsapp || 'بدون رقم')}</div></div>
            <button class="btn-icon" id="mx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="modal-body"><div class="wa-preview">${esc(msg).replace(/(https?:\/\/[^\s]+)/g, '<span class="link">$1</span>')}</div></div>
          <div class="modal-footer">
            <div style="font-size:12px;color:var(--faint);">الكود: <span style="color:var(--gold);font-weight:700;">${esc(r.result_code || '—')}</span></div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-sm" id="mopen">شوف التقرير</button>
              <button class="btn btn-sm" id="msend" style="background:#25D366;color:#062b14;font-weight:700;">ابعت الواتس</button>
            </div>
          </div>
        </div>
      </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
    const close = () => document.getElementById('mb')?.remove();
    document.getElementById('mb').addEventListener('click', close);
    document.getElementById('mx').addEventListener('click', close);
    document.getElementById('mopen').addEventListener('click', () => window.open(resultUrl(r), '_blank'));
    document.getElementById('msend').addEventListener('click', () => { close(); sendWA(r); });
  }

  /* ── helpers ── */
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function rel(d) {
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'لسه دلوقتي';
    if (m < 60) return `من ${ar(m)} دقيقة`;
    const h = Math.floor(m / 60); if (h < 24) return `من ${ar(h)} ساعة`;
    const days = Math.floor(h / 24); if (days < 7) return `من ${ar(days)} يوم`;
    return d.toLocaleDateString('ar-EG');
  }
  function toast(msg) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2400);
  }

  /* ── وضع التجربة ?demo=1 ── */
  if (new URLSearchParams(location.search).get('demo') === '1') {
    const fpName = (ax, fl) => (window.BURNOUT_FINGERPRINTS || {})[`${ax}_${fl}`] || '';
    const mk = (name, wa, ax, sub, door, fl, burnout, mins, sent) => ({
      id: 'demo-' + Math.random().toString(36).slice(2, 9),
      name, whatsapp: wa, email: '', job: '', age_range: '٣٥–٤٤',
      result_code: (window.ResultCodes ? window.ResultCodes.randomCode() : 'DEMO-1234'),
      completed: true, main_axis: ax, secondary_axis: sub, door, flavor: fl,
      fingerprint_name: fpName(ax, fl), burnout_type: burnout, level: 'level_3',
      covenant: { line1: 'محوري الرئيسي: ' + (AX()[ax] || ''), line2: 'إن أنا ما أبانش ناقص', line3: 'هرفض طلب واحد' },
      created_at: new Date(Date.now() - mins * 60000),
      completed_at: new Date(Date.now() - (mins - 4) * 60000),
      whatsapp_sent_at: sent ? new Date(Date.now() - mins * 30000) : null
    });
    const demo = [
      mk('فاطمة عبد العزيز', '+201005551234', 'tamasok', 'hayawiyya', 'hemma', 1, 'muhtariq', 25, false),
      mk('أحمد إبراهيم', '+201112223344', 'hayawiyya', 'intima', 'yaqeen', 7, 'mujawwaa', 60, true),
      mk('ندى السيّد', '+201207778899', 'intima', 'tamasok', 'ons', 2, 'makbout', 90, false),
      mk('خالد الشاذلي', '01556667788', 'tamasok', 'intima', 'hemma', 8, 'muhtariq', 130, false),
      mk('ليلى منصور', '+966503456789', 'intima', 'hayawiyya', 'ons', 3, 'mujawwaa', 8, false),
      mk('يوسف رضوان', '+201198765432', 'hayawiyya', 'tamasok', 'yaqeen', 5, 'makbout', 200, true)
    ];
    window.MFPJourney.listParticipants = async () => demo;
    window.MFPJourney.hasFirebase = () => true;
    window.MFPJourney.setSent = async () => true;
  }
})();
