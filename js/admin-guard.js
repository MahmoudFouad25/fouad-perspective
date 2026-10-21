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

  function isAdminUser(user) {
    return !!(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL);
  }

  function buildOverlay() {
    var css =
      '#ag-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(15,23,42,.92);font-family:Tajawal,system-ui,sans-serif;direction:rtl;padding:16px}' +
      '#ag-card{background:#fff;color:#0f172a;border-radius:14px;width:100%;max-width:360px;padding:28px 24px;' +
      'box-shadow:0 20px 50px rgba(0,0,0,.35)}' +
      '#ag-card h2{margin:0 0 4px;font-size:1.25rem}' +
      '#ag-card p{margin:0 0 18px;color:#475569;font-size:.9rem;line-height:1.6}' +
      '#ag-card label{display:block;font-size:.85rem;font-weight:700;margin:12px 0 6px}' +
      '#ag-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;' +
      'font-size:1rem;font-family:inherit;direction:ltr;text-align:left}' +
      '#ag-card input:focus{outline:2px solid #2563eb;outline-offset:1px;border-color:#2563eb}' +
      '#ag-card button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:9px;background:#1e3a8a;color:#fff;' +
      'font-size:1rem;font-weight:700;font-family:inherit;cursor:pointer}' +
      '#ag-card button[disabled]{opacity:.6;cursor:wait}' +
      '#ag-error{display:none;margin-top:12px;color:#b91c1c;font-size:.85rem}' +
      '#ag-wait{text-align:center;color:#e2e8f0;font-size:1rem}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'ag-overlay';
    overlay.innerHTML =
      '<div id="ag-wait">جاري التأكد من الدخول…</div>' +
      '<form id="ag-card" style="display:none" autocomplete="on">' +
      '<h2>دخول الأدمن</h2>' +
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

  window.AdminGuard = { ready: ready, signOut: signOut, ADMIN_EMAIL: ADMIN_EMAIL };
})();
