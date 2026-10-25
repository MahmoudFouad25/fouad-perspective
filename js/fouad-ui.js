/* =====================================================================
   هوية «المحراب الهادي» — السلوك المشترك
   - شريط قسم «إدارة الحجوزات والمستخدمين» فوق الصفحة (لو body عليه data-fu-nav="bookings")
   - FU.toast(نص, {type:'ok'|'bad'|'wait', undo:fn})   رسالة تأكيد تحت
   - FU.confirm(عنوان, نص, {ok:'امسح', danger:true})  → Promise<boolean>
   - FU.badge(حالة)  → HTML شارة حالة بالكلمة واللون
   - FU.ask({ title, sub, body, ok, danger, wide, run(form), mount(dialog) }) → Promise<نتيجة run أو null>
       نافذة فيها خانات. run بترمي Error برسالة → الرسالة بتظهر جوه النافذة وهي مفتوحة.
       ok: false = نافذة عرض بس (زرار «اقفل»). الخانات: .fu-f / .fu-seg / .fu-sum / .fu-rows (css/fouad-ui.css)
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
        ['admin/bookings.html', 'الحجوزات'],
        ['admin/telegram-monitor.html', 'مكتب المتابعة'],
        ['admin/bookings/creat&allow.html', 'تجهيز الطلاب'],
        ['admin/client.html', 'ملف العميل'],
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
        '<div class="fu-nav__end">' +
          (key === 'bookings' ? '<form class="fu-nav__find" action="' + esc(root + 'admin/client.html') + '" method="get" role="search"><input name="q" type="search" placeholder="افتح ملف عميل…" aria-label="دوّر على عميل بالاسم أو الرقم أو الإيميل" autocomplete="off"></form>' : '') +
          (darkAllowed() ? '<button type="button" class="fu-nav__theme"></button>' : '') +
        '</div>' +
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
    if (opts.action && typeof opts.action.fn === 'function') {
      var ab = document.createElement('button');
      ab.type = 'button'; ab.textContent = opts.action.label || 'افتح';
      ab.onclick = function () { opts.action.fn(); t.remove(); };
      t.appendChild(ab);
    }
    if (typeof opts.undo === 'function') {
      var u = document.createElement('button');
      u.type = 'button'; u.textContent = 'تراجع';
      u.onclick = function () { opts.undo(); t.remove(); };
      t.appendChild(u);
    }
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.ms || (opts.undo || opts.action ? 7000 : 3200));
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


  // ---------- نافذة فيها خانات ----------
  var askEl = null;
  function askDialog() {
    if (askEl) return askEl;
    askEl = document.createElement('dialog');
    askEl.className = 'fu-ask';
    askEl.innerHTML = '<form method="dialog" novalidate>' +
      '<div class="fu-ask__h"><div><h2></h2><p></p></div><button class="fu-ask__x" value="cancel" type="submit" formnovalidate aria-label="اقفل">×</button></div>' +
      '<div class="fu-ask__b"></div>' +
      '<div class="fu-ask__f"><span class="fu-ask__m" role="alert"></span><button class="fu-btn" value="cancel" type="submit" formnovalidate></button><button class="fu-btn fu-btn--primary" value="ok" type="submit"></button></div></form>';
    document.body.appendChild(askEl);
    return askEl;
  }
  function ask(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var d = askDialog(), f = d.querySelector('form');
      if (typeof d.showModal !== 'function') { resolve(null); return; }
      if (d.open) d.close();
      f.onchange = f.oninput = f.onclick = null;
      d.classList.toggle('fu-ask--wide', !!o.wide);
      d.querySelector('h2').textContent = o.title || '';
      var sub = d.querySelector('.fu-ask__h p'); sub.textContent = o.sub || ''; sub.hidden = !o.sub;
      d.querySelector('.fu-ask__b').innerHTML = o.body || '';
      var msg = d.querySelector('.fu-ask__m'); msg.textContent = '';
      var okB = d.querySelector('[value=ok]'), noB = d.querySelector('.fu-ask__f [value=cancel]');
      okB.textContent = o.ok || 'حفظ'; okB.hidden = o.ok === false; okB.disabled = false;
      okB.className = 'fu-btn ' + (o.danger ? 'fu-btn--danger' : 'fu-btn--primary');
      noB.textContent = o.ok === false ? (o.close || 'اقفل') : (o.cancel || 'رجوع');
      var done = false;
      function finish(v) { if (done) return; done = true; f.onsubmit = null; d.onclose = null; if (d.open) d.close(); resolve(v); }
      f.onsubmit = async function (e) {
        var btn = e.submitter && e.submitter.value;
        if (btn !== 'ok') { finish(null); return; }
        e.preventDefault();
        okB.disabled = true; msg.textContent = '';
        try { var v = o.run ? await o.run(f, d) : true; if (v === false) { okB.disabled = false; return; } finish(v === undefined ? true : v); }
        catch (err) { msg.textContent = err && err.message ? err.message : String(err); okB.disabled = false; }
      };
      d.onclose = function () { if (!d.open) finish(null); };   // حدث القفل بتاع نافذة قبلها ممكن يوصل متأخر
      d.showModal();
      var first = d.querySelector('.fu-ask__b input:not([type=radio]):not([type=checkbox]):not([readonly]),.fu-ask__b select,.fu-ask__b textarea');
      if (first) setTimeout(function () { first.focus(); }, 30);
      if (o.mount) o.mount(d, f, function (v) { finish(v); });
    });
  }
  // قيمة خانة من فورم النافذة
  function val(f, name) { var x = f.elements[name]; if (!x) return ''; if (x.type === 'checkbox') return x.checked; return String(x.value == null ? '' : x.value).trim(); }
  function fail(m) { throw new Error(m); }

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

  window.FU = { toast: toast, confirm: confirmBox, ask: ask, val: val, fail: fail, isOpen: function () { return !!(askEl && askEl.open) || !!document.querySelector('dialog.fu-dialog[open]'); }, badge: badge, esc: esc, toggleTheme: toggleTheme, root: root };

  function boot() { initTheme(); buildNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
