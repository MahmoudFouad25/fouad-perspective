/*
 * فحص الجلسة لصفحات العميل — js/session-check.js
 *
 * ملفات العملاء بقت مقفولة: كل عميل يقرا ملفه بس، وده محتاج دخول حقيقي (Firebase Auth).
 * الجلسات القديمة اللي كانت بتعتمد على رقم العميل المحفوظ في المتصفح بس ما بقتش تنفع،
 * فالسكريبت ده بيمسحها ويودّي العميل لصفحة الدخول، بدل ما الصفحة تفتح فاضية.
 *
 * <script src="js/session-check.js" data-login="login.html"></script>   (آخر الصفحة)
 */
(function () {
  'use strict';

  var me = document.currentScript;
  var LOGIN = (me && me.getAttribute('data-login')) || 'login.html';
  var KEYS = ['userId', 'userEmail', 'userName', 'userLevel', 'userStatus', 'user', 'secure_user'];

  function expire() {
    try { KEYS.forEach(function (k) { localStorage.removeItem(k); }); sessionStorage.removeItem('_session'); } catch (e) {}
    location.replace(LOGIN + (LOGIN.indexOf('?') < 0 ? '?' : '&') + 'expired=1');
  }

  function start() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length || !firebase.auth) return false;
    var done = false;
    firebase.auth().onAuthStateChanged(function (user) {
      if (done) return;
      done = true;
      if (!user) expire();
    });
    return true;
  }

  function boot(tries) {
    if (start()) return;
    if (tries > 50) return;                // الصفحة ما فيهاش فايربيز أصلًا
    setTimeout(function () { boot(tries + 1); }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();
