/*
 * الدخول عن طريق السيرفر — js/server-login.js
 *
 * الباسورد المحفوظ عمره ما بيتقري في المتصفح. لو حساب الدخول (Firebase Auth) رفض الباسورد،
 * السيرفر بيقارنه بالمحفوظ، ولو مطابق بيظبط حساب الدخول عليه، وبعدها الدخول العادي بينجح.
 * ورابط تليجرام (?uid=&token=) بياخد «تذكرة دخول» من السيرفر من غير أي باسورد.
 *
 * محتاج: firebase-app + firebase-auth (compat أو v8).
 */
(function () {
  'use strict';

  var BASE = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot';
  var RETRY_CODES = ['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found',
                     'auth/invalid-login-credentials', 'auth/invalid-password'];

  function err(code, message) { var e = new Error(message); e.code = code; return e; }

  var MESSAGES = {
    invalid: 'البيانات غير صحيحة... تأكد من الإيميل والباسورد',
    suspended: 'الحساب ده متوقف. كلّمنا على تليجرام',
    'too-many': 'محاولات كتير. استنى ربع ساعة وجرّب تاني، أو كلّمنا على تليجرام',
    'weak-password': 'الباسورد ده محتاج يتغيّر. كلّمنا على تليجرام وهنغيّرهولك',
    'no-email': 'الحساب ده ناقصه إيميل. كلّمنا على تليجرام',
    server: 'حصلت مشكلة مؤقتة. جرّب تاني بعد دقيقة',
    network: 'مفيش اتصال بالإنترنت. اتأكد من الاتصال وجرّب تاني'
  };

  function post(path, body) {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.httpStatus = r.status; return j; });
    }, function () { return { ok: false, error: 'network' }; });
  }

  // بيرجّع طريقة الدخول ('direct-auth' أو 'server-migrated') أو بيرمي Error فيه code
  function signIn(email, password) {
    var auth = firebase.auth();
    email = String(email || '').trim().toLowerCase();
    return auth.signInWithEmailAndPassword(email, password).then(function () { return 'direct-auth'; }, function (e) {
      if (e && e.code === 'auth/too-many-requests') throw err('too-many', MESSAGES['too-many']);
      if (e && e.code === 'auth/network-request-failed') throw err('network', MESSAGES.network);
      if (!e || RETRY_CODES.indexOf(e.code) < 0) throw err('server', MESSAGES.server);
      return post('/auth/login-migrate', { email: email, password: password }).then(function (j) {
        if (!j.ok) { var c = j.error || 'server'; throw err(c, MESSAGES[c] || MESSAGES.server); }
        return auth.signInWithEmailAndPassword(email, password).then(function () { return 'server-migrated'; });
      });
    });
  }

  // رابط تليجرام: بيرجّع { userId, email }
  function telegram(uid, token) {
    return post('/auth/telegram-login', { uid: uid, token: token }).then(function (j) {
      if (!j.ok || !j.customToken) {
        var c = j.error || 'server';
        throw err(c, c === 'invalid' ? 'الرابط ده مش صالح أو اتغيّر. ادخل بالإيميل والباسورد، أو اطلب رابط جديد على تليجرام' : (MESSAGES[c] || MESSAGES.server));
      }
      return firebase.auth().signInWithCustomToken(j.customToken).then(function () {
        return { userId: j.userId, email: j.email };
      });
    });
  }

  window.ServerLogin = { signIn: signIn, telegram: telegram, MESSAGES: MESSAGES, BASE: BASE };
})();
