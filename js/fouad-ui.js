/* =====================================================================
   هوية «المحراب الهادي» — السلوك المشترك
   - شريط قسم «إدارة الحجوزات والمستخدمين» فوق الصفحة (لو body عليه data-fu-nav="bookings")
   - FU.toast(نص, {type:'ok'|'bad'|'wait', undo:fn})   رسالة تأكيد تحت
   - FU.confirm(عنوان, نص, {ok:'امسح', danger:true})  → Promise<boolean>
   - FU.badge(حالة)  → HTML شارة حالة بالكلمة واللون
   ما بيلمسش أي بيانات ولا Firebase.
   ===================================================================== */
(function () {
  'use strict';
  var me = document.currentScript;
  var root = me && me.src ? me.src.replace(/js\/fouad-ui\.js.*$/, '') : '/fouad-perspective/';

  var SECTIONS = {
    bookings: {
      title: 'إدارة الحجوزات والمستخدمين',
      links: [
        ['admin/book-bot-online.html', 'الحجوزات'],
        ['admin/telegram-monitor.html', 'مكتب المتابعة'],
        ['admin/bookings/creat&allow.html', 'الحجوزات الفردية'],
        ['admin/edite-user.html', 'ملف العميل'],
        ['admin/renewals.html', 'التجديدات'],
        ['admin/coupon-settings.html', 'حد الكوبونات']
      ]
    }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- الوضع الليلي ----------
  var THEME_KEY = 'fu-theme';
  function getTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function darkAllowed() { return !!(document.body && document.body.getAttribute('data-fu-dark') === 'on'); }
  function initTheme() { if (darkAllowed()) applyTheme(getTheme()); }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function toggleTheme() {
    var next = isDark() ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    var b = document.querySelector('.fu-nav__theme');
    if (b) { b.textContent = isDark() ? '☀' : '☾'; b.title = isDark() ? 'الوضع النهاري' : 'الوضع الليلي'; }
  }

  // ---------- شريط القسم ----------
  function buildNav() {
    var key = document.body && document.body.getAttribute('data-fu-nav');
    var sec = key && SECTIONS[key];
    if (!sec || document.querySelector('.fu-nav')) return;
    var here = decodeURIComponent(location.pathname);
    var links = sec.links.map(function (l) {
      var cur = here.slice(-l[0].length) === l[0] ? ' aria-current="page"' : '';
      return '<a href="' + esc(root + l[0]) + '"' + cur + '>' + esc(l[1]) + '</a>';
    }).join('');
    var nav = document.createElement('nav');
    nav.className = 'fu-nav';
    nav.setAttribute('aria-label', sec.title);
    nav.innerHTML =
      '<div class="fu-nav__in">' +
        '<a class="fu-nav__brand" href="' + esc(root + 'admin/admin-dashboard-secure.html') + '" title="لوحة التحكم">' +
          '<span class="fu-nav__mark">ف</span><span class="t">منظور الفؤاد<small>' + esc(sec.title) + '</small></span>' +
        '</a>' +
        '<div class="fu-nav__links">' + links + '</div>' +
        (darkAllowed() ? '<div class="fu-nav__end"><button type="button" class="fu-nav__theme"></button></div>' : '') +
      '</div>';
    document.body.insertBefore(nav, document.body.firstChild);
    var tb = nav.querySelector('.fu-nav__theme');
    if (tb) {
    tb.textContent = isDark() ? '☀' : '☾';
    tb.title = isDark() ? 'الوضع النهاري' : 'الوضع الليلي';
    tb.setAttribute('aria-label', 'بدّل الوضع الليلي والنهاري');
    tb.addEventListener('click', toggleTheme);
    }
    var cur = nav.querySelector('[aria-current]');
    if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }
  }

  // ---------- رسالة التأكيد ----------
  function toast(text, opts) {
    opts = opts || {};
    var box = document.querySelector('.fu-toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'fu-toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'fu-toast' + (opts.type && opts.type !== 'ok' ? ' fu-toast--' + opts.type : '');
    t.innerHTML = '<span>' + esc(text) + '</span>';
    if (typeof opts.undo === 'function') {
      var u = document.createElement('button');
      u.type = 'button'; u.textContent = 'تراجع';
      u.onclick = function () { opts.undo(); t.remove(); };
      t.appendChild(u);
    }
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.ms || (opts.undo ? 6000 : 3200));
    return t;
  }

  // ---------- نافذة التأكيد ----------
  function confirmBox(title, body, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var d = document.createElement('dialog');
      if (typeof d.showModal !== 'function') { resolve(window.confirm(title + '\n' + (body || ''))); return; }
      d.className = 'fu-dialog';
      d.innerHTML =
        '<div class="fu-dialog__b"><h2>' + esc(title) + '</h2>' + (body ? '<p>' + esc(body) + '</p>' : '') + '</div>' +
        '<div class="fu-dialog__f">' +
          '<button type="button" class="fu-btn ' + (opts.danger ? 'fu-btn--danger' : 'fu-btn--primary') + '" data-v="1">' + esc(opts.ok || 'تمام') + '</button>' +
          '<button type="button" class="fu-btn" data-v="0">' + esc(opts.cancel || 'رجوع') + '</button>' +
        '</div>';
      document.body.appendChild(d);
      var done = function (v) { d.close(); d.remove(); resolve(v); };
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]');
        if (b) done(b.getAttribute('data-v') === '1');
      });
      d.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      d.showModal();
      d.querySelector('[data-v="0"]').focus();
    });
  }

  // ---------- شارة الحالة ----------
  var BADGES = {
    pending: ['wait', 'مستني رد'], awaiting_receipt: ['wait', 'مستني إيصال'], receipt_sent: ['info', 'الإيصال وصل'],
    confirmed: ['info', 'اتأكد'], paid: ['ok', 'اتدفع'], completed: ['ok', 'اتدفع'], transferred: ['ok', 'اتحوّل لطالب'],
    partial: ['wait', 'مدفوع جزئي'], overdue: ['bad', 'متأخر'], rejected: ['bad', 'مرفوض'], cancelled: ['bad', 'ملغي'],
    expired: ['', 'منتهي'], active: ['ok', 'شغال'], grant: ['grant', 'منحة']
  };
  function badge(status, label) {
    var b = BADGES[status] || ['', label || status || '—'];
    return '<span class="fu-badge' + (b[0] ? ' fu-badge--' + b[0] : '') + '">' + esc(label || b[1]) + '</span>';
  }

  window.FU = { toast: toast, confirm: confirmBox, badge: badge, esc: esc, toggleTheme: toggleTheme, root: root };

  function boot() { initTheme(); buildNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
