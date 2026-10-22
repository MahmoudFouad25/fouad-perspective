/*
 * الباسوردات في صفحات الأدمن — js/password-safe.js
 *
 * الباسورد بيتحفظ عند جوجل بس (حساب الدخول)، وما بيتكتبش في ملف العميل ولا في الحجز.
 *   PasswordSafe.secure(userId)          → بعد إنشاء حساب: السيرفر بينقل الباسورد لحساب الدخول ويمسح النسخة
 *   PasswordSafe.setPassword(userId, pw) → باسورد جديد لعميل (بيتظبط على حساب الدخول نفسه)
 *
 * محتاج js/bot-client.js (botFetch) قبله، والأدمن يكون داخل.
 */
(function () {
  'use strict';

  var BASE = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot/auth/';

  function call(path, body) {
    if (typeof botFetch !== 'function') return Promise.reject(new Error('bot-client.js مش محمّل'));
    return botFetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok) {
          var e = new Error({ 'no-email': 'العميل ده ما عندوش إيميل في ملفه', 'not-found': 'العميل مش موجود',
            'bad-request': 'الباسورد لازم يكون ٦ حروف على الأقل' }[j.error] ||
            ('السيرفر رفض العملية' + (r.status === 401 || r.status === 403 ? ' — ادخل بحساب الأدمن تاني' : '')));
          e.code = j.error; throw e;
        }
        return j;
      });
    });
  }

  window.PasswordSafe = {
    secure: function (userId) { return call('admin-secure-password', { userId: String(userId) }); },
    setPassword: function (userId, password) { return call('admin-set-password', { userId: String(userId), password: String(password) }); }
  };
})();
