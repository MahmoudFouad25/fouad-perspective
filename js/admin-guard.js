/*
 * حارس صفحات الأدمن — js/admin-guard.js
 *
 * أي صفحة أدمن تحطه بعد سكريبتات فايربيز (app + auth + firestore، نسخة compat):
 *
 *   <script src="../js/admin-guard.js"></script>
 *   <script>
 *     AdminGuard.ready().then(({ db, auth, user }) => { ... ابدأ الصفحة هنا ... });
 *   </script>
 *
 * لو اللي فاتح الصفحة مش داخل بحساب الأدمن، بيظهر له فورم دخول فوق الصفحة،
 * والصفحة نفسها ما تبدأش لحد ما يدخل بالإيميل الصح.
 * القواعد في Firestore هي الحماية الحقيقية؛ الحارس ده بيخلي الصفحة تعمل دخول فعلًا
 * علشان القواعد تعرف إن ده الأدمن.
 */
(function () {
  'use strict';

  var ADMIN_EMAIL = 'admin@fouad-academy.com';
  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w',
    authDomain: 'fouad-perspective.firebaseapp.com',
    projectId: 'fouad-perspective',
    storageBucket: 'fouad-perspective.firebasestorage.app',
    messagingSenderId: '1068763865336',
    appId: '1:1068763865336:web:b791abcd22d536aedd5b0d'
  };

  var readyPromise = null;
  var firstWasAdmin = null;   // حالة الدخول أول ما الصفحة فتحت

  function isAdminUser(user) {
    return !!(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL);
  }

  function buildOverlay() {
    // نفس هوية «المحراب الهادي»؛ القيم بعد الفاصلة للصفحات اللي لسه ما حمّلتش css/fouad-ui.css
    var css =
      '#ag-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
      'background:var(--fu-paper,#F6F4EE);font-family:var(--fu-font,"IBM Plex Sans Arabic",Tajawal,system-ui,sans-serif);direction:rtl;padding:16px}' +
      '#ag-card{background:var(--fu-surface,#fff);color:var(--fu-ink,#1F2A24);border:1px solid var(--fu-line,#E2DED3);border-radius:16px;width:100%;max-width:380px;padding:28px 24px;' +
      'box-shadow:0 1px 2px rgba(31,42,36,.06),0 12px 32px rgba(31,42,36,.08)}' +
      '#ag-card .ag-mark{width:36px;height:36px;border-radius:10px;background:var(--fu-primary,#0B7A56);color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:14px}' +
      '#ag-card h2{margin:0 0 4px;font-size:20px;font-weight:700}' +
      '#ag-card p{margin:0 0 18px;color:var(--fu-muted,#6B7468);font-size:14px;line-height:1.6}' +
      '#ag-card label{display:block;font-size:13.5px;font-weight:600;margin:12px 0 6px}' +
      '#ag-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--fu-line-2,#CFCAB9);border-radius:8px;background:var(--fu-surface,#fff);color:inherit;' +
      'font-size:15px;font-family:inherit;direction:ltr;text-align:left}' +
      '#ag-card input:focus{outline:2px solid var(--fu-primary,#0B7A56);outline-offset:1px;border-color:var(--fu-primary,#0B7A56)}' +
      '#ag-card button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:8px;background:var(--fu-primary,#0B7A56);color:#fff;' +
      'font-size:15px;font-weight:600;font-family:inherit;cursor:pointer}' +
      '#ag-card button[disabled]{opacity:.6;cursor:wait}' +
      '#ag-error{display:none;margin-top:12px;color:var(--fu-danger,#B42318);font-size:13.5px}' +
      '#ag-wait{text-align:center;color:var(--fu-muted,#6B7468);font-size:15px}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'ag-overlay';
    overlay.innerHTML =
      '<div id="ag-wait">جاري التأكد من الدخول…</div>' +
      '<form id="ag-card" style="display:none" autocomplete="on">' +
      '<div class="ag-mark">ف</div><h2>دخول الأدمن</h2>' +
      '<p>الصفحة دي للأدمن بس. ادخل بحساب الأدمن علشان تكمل.</p>' +
      '<label for="ag-email">الإيميل</label>' +
      '<input id="ag-email" type="email" autocomplete="username" required>' +
      '<label for="ag-pass">كلمة السر</label>' +
      '<input id="ag-pass" type="password" autocomplete="current-password" required>' +
      '<button id="ag-btn" type="submit">دخول</button>' +
      '<div id="ag-error" role="alert" aria-live="polite"></div>' +
      '</form>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function showError(msg) {
    var el = document.getElementById('ag-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function (resolve) {
      function start() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
          document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">الصفحة ناقصها مكتبة Firebase Auth.</p>';
          return;
        }
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        var auth = firebase.auth();
        var db = firebase.firestore();
        var overlay = buildOverlay();
        var resolved = false;

        auth.onAuthStateChanged(function (user) {
          if (firstWasAdmin === null) firstWasAdmin = isAdminUser(user);
          if (isAdminUser(user)) {
            overlay.style.display = 'none';
            if (!resolved) { resolved = true; resolve({ db: db, auth: auth, user: user }); }
            return;
          }
          if (resolved) { location.reload(); return; }   // خرج أو اتغيّر الحساب
          if (user) auth.signOut();                        // داخل بحساب مش أدمن
          overlay.style.display = 'flex';
          document.getElementById('ag-wait').style.display = 'none';
          document.getElementById('ag-card').style.display = 'block';
          document.getElementById('ag-email').focus();
        });

        document.getElementById('ag-card').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = document.getElementById('ag-btn');
          var email = document.getElementById('ag-email').value.trim();
          var pass = document.getElementById('ag-pass').value;
          document.getElementById('ag-error').style.display = 'none';
          if (email.toLowerCase() !== ADMIN_EMAIL) { showError('الإيميل ده مش إيميل الأدمن.'); return; }
          btn.disabled = true;
          auth.signInWithEmailAndPassword(email, pass)
            .catch(function () { showError('بيانات الدخول غير صحيحة.'); })
            .then(function () { btn.disabled = false; });
        });
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    });
    return readyPromise;
  }

  function signOut() {
    return firebase.auth().signOut();
  }

  // للصفحات القديمة اللي بتبدأ لوحدها من غير ما تستنى ready():
  // لو الأدمن داخل أصلًا، مفيش أي تغيير. لو مش داخل، الفورم بيظهر فوق الصفحة،
  // وبعد الدخول الصفحة بتعمل reload مرة واحدة علشان تبدأ وهي داخلة.
  function protect() {
    return ready().then(function (r) {
      if (firstWasAdmin === false) { location.reload(); return new Promise(function () {}); }
      return r;
    });
  }

  window.AdminGuard = { ready: ready, protect: protect, signOut: signOut, ADMIN_EMAIL: ADMIN_EMAIL };
})();
