/*
 * مدة الاشتراك في الكورس — js/enrollment-access.js
 *
 * القاعدة (قرار محمود، ٢٢ أكتوبر ٢٠٢٦):
 *  - الكورس بيفضل مفتوح لحد تاريخ نهايته (dates.endDate).
 *  - بعدها ٧ أيام سماح: مفتوح، بس العميل بيشوف «مدتك خلصت» وزرار تجديد.
 *  - بعد السماح: الكورس بيتقفل، بس عمره ما بيتمسح من الحساب (بيفضل في السجل «كان مشترك»).
 *  - اللي مدتهم كانت خلصت قبل يوم التفعيل: مهلة ١٤ يوم من يوم التفعيل، علشان محدش يتفاجئ.
 *  - كورس متعلّم يدويًا expired أو cancelled: مقفول.
 *  - كورس موقوف مؤقتًا (status.current = paused): مقفول، و paused: true، والمدة بتتمد لما يرجع (من ملف العميل).
 *  - من غير تاريخ نهاية، أو تاريخ ٢٠٩٩ («غير محدود»): مفتوح على طول.
 *
 * ملحوظة: ده قفل في الصفحات. القفل الكامل على قاعدة البيانات بييجي مع مرحلة قفل users.
 */
(function (root) {
  'use strict';

  var DAY = 86400000;
  var GRACE_DAYS = 7;
  var LAUNCH_DATE = '2026-10-22';          // يوم تفعيل القاعدة
  var LEGACY_GRACE_DAYS = 14;              // مهلة اللي مدتهم خلصت قبل التفعيل
  var RENEW_URL = 'https://t.me/fouad_academy_bot';

  function parseDay(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') v = v.toDate();
    var t = v instanceof Date ? v.getTime() : Date.parse(String(v).length === 10 ? v + 'T23:59:59+03:00' : v);
    return isNaN(t) ? null : t;
  }

  function endOf(enrollment) {
    var e = enrollment || {};
    return (e.dates && e.dates.endDate) || e.endDate || null;
  }

  /*
   * حالة اشتراك واحد:
   *   state: 'active' | 'ending' (فاضل ٧ أيام أو أقل) | 'grace' (المدة خلصت، لسه مفتوح) | 'locked' | 'unlimited'
   *   open: true لو الدروس تتفتح
   */
  function status(enrollment, now) {
    var e = enrollment || {};
    now = typeof now === 'number' ? now : (now ? now.getTime() : Date.now());
    var cur = e.status && e.status.current;
    var endRaw = endOf(e);
    var end = parseDay(endRaw);
    var base = { endDate: endRaw, endMs: end, lockAt: null, daysLeft: null, daysLocked: null, renewUrl: RENEW_URL };

    if (cur === 'paused') {
      return Object.assign(base, { state: 'locked', open: false, manual: true, paused: true, pausedAt: (e.status && e.status.pausedAt) || null });
    }
    if (cur === 'cancelled' || cur === 'expired' || (e.status && e.status.isExpired === true)) {
      base.endMs = end; return Object.assign(base, { state: 'locked', open: false, manual: true, cancelled: cur === 'cancelled' });
    }
    if (!end || new Date(end).getUTCFullYear() >= 2099) {
      return Object.assign(base, { state: 'unlimited', open: true });
    }
    var launch = parseDay(LAUNCH_DATE);
    var lockAt = end + GRACE_DAYS * DAY;
    if (end < launch) lockAt = Math.max(lockAt, launch + LEGACY_GRACE_DAYS * DAY);
    base.lockAt = lockAt;

    if (now <= end) {
      var left = Math.ceil((end - now) / DAY);
      return Object.assign(base, { state: left <= 7 ? 'ending' : 'active', open: true, daysLeft: left });
    }
    if (now < lockAt) {
      return Object.assign(base, { state: 'grace', open: true, daysLeft: 0, daysToLock: Math.ceil((lockAt - now) / DAY) });
    }
    return Object.assign(base, { state: 'locked', open: false, daysLocked: Math.floor((now - lockAt) / DAY) });
  }

  function fmt(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"'`]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
    });
  }

  // سطر قصير للعميل
  function message(st) {
    if (st.state === 'ending') return 'فاضل ' + st.daysLeft.toLocaleString('ar-EG') + ' يوم على نهاية اشتراكك (' + fmt(st.endMs) + ')';
    if (st.state === 'grace') return 'مدة اشتراكك خلصت يوم ' + fmt(st.endMs) + '. الكورس هيفضل مفتوح لحد ' + fmt(st.lockAt) + '، جدّد علشان تكمل.';
    if (st.paused) return 'اشتراكك في الكورس ده متوقف مؤقتًا، ومدتك محفوظة. لما يرجع هتكمّل من مكانك.';
    if (st.state === 'locked') return (st.manual && (st.cancelled || !st.endMs)) ? 'الاشتراك في الكورس ده متوقف.' : 'مدة اشتراكك خلصت يوم ' + fmt(st.endMs) + '.';
    return '';
  }

  /*
   * لصفحات الكورسات: بعد ما الصفحة تلاقي الاشتراك.
   * مقفول → شاشة «اشتراكك خلص» + throw (الصفحة ما تكملش).
   * سماح أو قرب ينتهي → شريط تنبيه فوق، والصفحة تكمل عادي.
   */
  function guard(enrollment, opts) {
    opts = opts || {};
    var st = status(enrollment);
    var title = opts.courseTitle || (enrollment && enrollment.title) || 'الكورس';
    injectStyle();
    if (!st.open) {
      var o = document.createElement('div');
      o.className = 'ea-overlay';
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-modal', 'true');
      o.innerHTML =
        '<div class="ea-card">' +
        '<div class="ea-icon" aria-hidden="true">⏳</div>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(message(st)) + '</p>' +
        '<p class="ea-sub">رحلتك وتقدّمك محفوظين. لما تجدّد، هتكمّل من مكانك.</p>' +
        '<a class="ea-btn" href="' + RENEW_URL + '" target="_blank" rel="noopener">جدّد اشتراكك على تليجرام</a>' +
        '<a class="ea-link" href="' + (opts.backUrl || '/fouad-perspective/my-courses.html') + '">رجوع لكورساتي</a>' +
        '</div>';
      document.body.appendChild(o);
      document.documentElement.style.overflow = 'hidden';
      var err = new Error('انتهت مدة الاشتراك في الكورس ده');
      err.code = 'enrollment-expired';
      throw err;
    }
    if (st.state === 'grace' || st.state === 'ending') {
      var bar = document.createElement('div');
      bar.className = 'ea-bar' + (st.state === 'grace' ? ' ea-grace' : '');
      bar.setAttribute('role', 'status');
      bar.innerHTML = '<span>' + esc(message(st)) + '</span><a href="' + RENEW_URL + '" target="_blank" rel="noopener">جدّد</a>';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    return st;
  }

  var styled = false;
  function injectStyle() {
    if (styled || typeof document === 'undefined') return;
    styled = true;
    var s = document.createElement('style');
    s.textContent =
      '.ea-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:rgba(15,23,42,.94);direction:rtl;font-family:Tajawal,system-ui,sans-serif}' +
      '.ea-card{max-width:420px;width:100%;background:#1e293b;color:#f1f5f9;border:1px solid rgba(148,163,184,.25);border-radius:18px;padding:28px 22px;text-align:center}' +
      '.ea-icon{font-size:2.4rem;margin-bottom:6px}.ea-card h2{margin:0 0 10px;font-size:1.3rem;color:#fbbf24}' +
      '.ea-card p{margin:0 0 10px;line-height:1.8}.ea-sub{color:#94a3b8;font-size:.92rem}' +
      '.ea-btn{display:block;margin:18px 0 10px;padding:12px;border-radius:12px;background:#229ED9;color:#fff;font-weight:800;text-decoration:none}' +
      '.ea-link{color:#94a3b8;font-size:.92rem}' +
      '.ea-bar{position:sticky;top:0;z-index:9999;display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;' +
      'padding:10px 16px;background:#1e3a8a;color:#fff;direction:rtl;font-family:Tajawal,system-ui,sans-serif;font-size:.95rem}' +
      '.ea-bar.ea-grace{background:#92400e}' +
      '.ea-bar a{color:#fff;font-weight:800;background:rgba(255,255,255,.18);padding:4px 12px;border-radius:99px;text-decoration:none}';
    document.head.appendChild(s);
  }

  // لو العميل عنده أكتر من اشتراك لنفس الكورس (قديم منتهي + تجديد)، ناخد اللي مفتوح وآخر تاريخ نهاية
  function best(list, now) {
    var arr = (list || []).filter(Boolean);
    if (!arr.length) return null;
    return arr.slice().sort(function (a, b) {
      var sa = status(a, now), sb = status(b, now);
      if (sa.open !== sb.open) return sa.open ? -1 : 1;
      var ea = sa.state === 'unlimited' ? Infinity : (sa.endMs || 0);
      var eb = sb.state === 'unlimited' ? Infinity : (sb.endMs || 0);
      return eb - ea;
    })[0];
  }

  var api = {
    status: status, guard: guard, best: best, message: message, endOf: endOf, fmt: fmt,
    GRACE_DAYS: GRACE_DAYS, LAUNCH_DATE: LAUNCH_DATE, LEGACY_GRACE_DAYS: LEGACY_GRACE_DAYS, RENEW_URL: RENEW_URL
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EnrollmentAccess = api;
})(typeof window !== 'undefined' ? window : this);
