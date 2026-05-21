/* ====================================================================
   منظور الفؤاد — هندسة العقلية — أدمن الرحلات (CSS مستقلّ)
   ──────────────────────────────────────────────────────────────────── */
:root{
  --bg:        #0f1b2d;
  --bg-2:      #142338;
  --raised:    #1b2c44;
  --raised-2:  #213650;
  --border:    rgba(255,255,255,.08);
  --border-2:  rgba(255,255,255,.14);
  --text:      #eef2f8;
  --muted:     #9fb0c8;
  --faint:     #6b7a92;
  --gold:      #d4af37;
  --tamasok:   #d4af37;
  --hayawiyya: #e76f51;
  --intima:    #4a90e2;
  --wa:        #25D366;
  --font:      "Cairo","IBM Plex Sans Arabic",system-ui,sans-serif;
  --r:         12px;
}
*,*::before,*::after{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{ font-family:var(--font); background:var(--bg); color:var(--text); line-height:1.6; -webkit-font-smoothing:antialiased; }
a{ color:var(--intima); }
button{ font:inherit; cursor:pointer; }

.app{ max-width:1280px; margin:0 auto; padding:24px 22px 60px; }

/* ── هيدر ── */
.app-header{ display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
.brand{ display:flex; align-items:center; gap:12px; }
.brand-mark{ width:42px; height:42px; border-radius:10px; background:linear-gradient(135deg,var(--gold),#a8801f);
  display:grid; place-items:center; color:#1a130a; font-weight:800; font-size:13px; }
.brand-name{ font-weight:800; font-size:18px; }
.brand-tagline{ color:var(--muted); font-size:12px; }
.header-meta{ display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
.status-dot{ width:9px; height:9px; border-radius:50%; background:var(--wa); box-shadow:0 0 10px rgba(37,211,102,.6); }
.status-dot.offline{ background:#e0564b; box-shadow:none; }

/* ── بانر ── */
.banner{ display:flex; gap:14px; padding:16px 18px; border-radius:var(--r); margin-bottom:20px; font-size:14px; line-height:1.7; }
.banner.warn{ background:rgba(231,111,81,.1); border:1px solid rgba(231,111,81,.35); }
.banner svg{ width:22px; height:22px; flex-shrink:0; color:var(--hayawiyya); }
.banner code{ background:rgba(255,255,255,.08); padding:1px 6px; border-radius:5px; font-size:12px; }

/* ── إحصائيات ── */
.stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
.stat-card{ background:var(--raised); border:1px solid var(--border); border-radius:var(--r); padding:18px 20px; }
.stat-card.tamasok{ border-top:3px solid var(--tamasok); }
.stat-card.hayawiyya{ border-top:3px solid var(--hayawiyya); }
.stat-card.intima{ border-top:3px solid var(--intima); }
.stat-label{ font-size:12.5px; color:var(--muted); margin-bottom:10px; }
.stat-value{ font-size:30px; font-weight:800; }
.stat-value .unit{ font-size:13px; font-weight:500; color:var(--muted); margin-inline-start:6px; }
.stat-bar{ height:6px; background:rgba(255,255,255,.06); border-radius:99px; margin-top:12px; overflow:hidden; }
.stat-bar-fill{ height:100%; background:var(--gold); border-radius:99px; }
.stat-card.hayawiyya .stat-bar-fill{ background:var(--hayawiyya); }
.stat-card.intima .stat-bar-fill{ background:var(--intima); }

/* ── شريط أدوات ── */
.toolbar{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:18px; }
.search-field{ position:relative; flex:1; min-width:220px; }
.search-field input{ width:100%; padding:11px 40px 11px 16px; background:var(--raised); border:1px solid var(--border-2);
  border-radius:10px; color:var(--text); font-size:14px; }
.search-field input:focus{ outline:none; border-color:var(--gold); }
.search-field svg{ position:absolute; inset-inline-start:14px; top:50%; transform:translateY(-50%);
  width:16px; height:16px; color:var(--faint); pointer-events:none; }
.filter-segment{ display:flex; flex-wrap:wrap; gap:6px; }
.filter-segment button{ padding:9px 14px; background:var(--raised); border:1px solid var(--border);
  border-radius:9px; color:var(--muted); font-size:13px; display:flex; align-items:center; gap:7px; }
.filter-segment button.active{ background:var(--raised-2); color:var(--text); border-color:var(--border-2); }
.filter-segment button.active.tamasok{ border-color:var(--tamasok); color:var(--tamasok); }
.filter-segment button.active.hayawiyya{ border-color:var(--hayawiyya); color:var(--hayawiyya); }
.filter-segment button.active.intima{ border-color:var(--intima); color:var(--intima); }
.filter-segment .count{ background:rgba(255,255,255,.1); border-radius:99px; padding:1px 8px; font-size:11px; }
.btn{ padding:10px 16px; border-radius:10px; border:1px solid var(--border-2); background:var(--raised); color:var(--text); font-size:14px; display:inline-flex; align-items:center; gap:8px; }
.btn-ghost:hover{ border-color:var(--gold); }
.btn-primary{ background:var(--gold); color:#1a130a; border-color:var(--gold); font-weight:700; }
.btn-sm{ padding:8px 13px; font-size:13px; }

/* ── جدول ── */
.table-wrap{ background:var(--raised); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
.table{ width:100%; border-collapse:collapse; }
.table thead th{ text-align:start; font-size:12px; color:var(--muted); font-weight:600;
  padding:14px 18px; border-bottom:1px solid var(--border); white-space:nowrap; }
.table tbody tr{ border-bottom:1px solid var(--border); transition:background .15s; }
.table tbody tr:last-child{ border-bottom:0; }
.table tbody tr:hover{ background:rgba(255,255,255,.025); }
.table tbody tr.sent{ opacity:.62; }
.table td{ padding:14px 18px; vertical-align:middle; font-size:14px; }

.cell-name{ display:flex; align-items:center; gap:12px; --axis-color:var(--faint); }
.avatar{ width:38px; height:38px; border-radius:10px; display:grid; place-items:center; flex-shrink:0;
  background:color-mix(in srgb, var(--axis-color) 18%, transparent); color:var(--axis-color); font-weight:800; }
.name{ font-weight:600; }
.meta{ font-size:12px; color:var(--faint); margin-top:2px; }
.fp-pill{ display:inline-block; padding:5px 11px; border-radius:8px; font-size:12.5px; font-weight:700;
  background:color-mix(in srgb, var(--axis-color) 16%, transparent); color:var(--axis-color); }
.axis-line{ font-size:12px; color:var(--muted); margin-top:4px; }
.cell-code{ font-family:monospace; letter-spacing:1px; color:var(--gold); font-size:13px; }

.cell-actions{ display:flex; gap:6px; align-items:center; justify-content:flex-end; }
.btn-icon{ width:34px; height:34px; border-radius:9px; border:1px solid var(--border); background:transparent;
  color:var(--muted); display:grid; place-items:center; }
.btn-icon:hover{ border-color:var(--border-2); color:var(--text); }
.btn-icon svg{ width:16px; height:16px; }
.wa-btn{ padding:8px 14px; border-radius:9px; border:1px solid var(--wa); background:rgba(37,211,102,.12);
  color:var(--wa); font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px; }
.wa-btn svg{ width:15px; height:15px; }
.wa-btn.sent{ opacity:.6; }

/* ── حالات فارغة/تحميل ── */
.loading,.empty{ padding:70px 24px; text-align:center; }
.empty h3{ margin:14px 0 8px; font-size:18px; }
.empty p{ color:var(--muted); font-size:14px; max-width:440px; margin:0 auto; line-height:1.8; }
.pulse{ width:14px; height:14px; border-radius:50%; background:var(--gold); margin:0 auto 16px;
  box-shadow:0 0 0 0 rgba(212,175,55,.5); animation:p 1.6s infinite; }
@keyframes p{ 70%{ box-shadow:0 0 0 12px rgba(212,175,55,0); } 100%{ box-shadow:0 0 0 0 rgba(212,175,55,0); } }

/* ── مودال ── */
.modal-backdrop{ position:fixed; inset:0; background:rgba(8,14,24,.7); backdrop-filter:blur(4px);
  display:grid; place-items:center; z-index:100; padding:24px; }
.modal{ background:var(--bg-2); border:1px solid var(--border-2); border-radius:16px; width:100%; max-width:520px;
  max-height:86vh; overflow:auto; }
.modal-header{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:20px 22px; border-bottom:1px solid var(--border); }
.modal-title{ font-weight:700; font-size:16px; }
.modal-body{ padding:20px 22px; }
.modal-footer{ display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 22px; border-top:1px solid var(--border); }
.wa-preview{ background:var(--raised); border:1px solid var(--border); border-radius:12px; padding:16px 18px;
  font-size:13.5px; line-height:1.85; white-space:pre-wrap; color:#dbe3ef; }
.wa-preview .link{ color:var(--intima); word-break:break-all; }

/* ── toast ── */
.toast{ position:fixed; bottom:24px; inset-inline-start:50%; transform:translateX(50%);
  background:var(--raised-2); border:1px solid var(--border-2); color:var(--text);
  padding:11px 20px; border-radius:10px; font-size:14px; z-index:200; }

/* ── موبايل ── */
@media (max-width:760px){
  .stats{ grid-template-columns:1fr 1fr; }
  .table thead{ display:none; }
  .table,.table tbody,.table tr,.table td{ display:block; width:100%; }
  .table tr{ padding:8px 4px; }
  .table td{ padding:7px 16px; }
  .table td[data-label]::before{ content:attr(data-label) " — "; color:var(--faint); font-size:12px; }
  .cell-actions{ justify-content:flex-start; flex-wrap:wrap; }
}
