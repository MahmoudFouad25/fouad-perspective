/*
 * نداءات البوت من صفحات الأدمن — js/bot-client.js
 *
 * botFetch(url, options) زي fetch بالظبط، بس بيضيف إثبات دخول الأدمن
 * (Firebase ID token) في هيدر Authorization. البوت بيرفض أوامر الإرسال من غيره.
 *
 * لازم يتحمّل بعد مكتبات Firebase (app + auth، نسخة compat).
 */
(function () {
  'use strict';

  function currentToken() {
    try {
      var user = firebase.auth().currentUser;
      return user ? user.getIdToken() : Promise.resolve(null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  window.botFetch = function (url, options) {
    options = Object.assign({}, options || {});
    return currentToken().then(function (token) {
      var headers = new Headers(options.headers || {});
      if (token) headers.set('Authorization', 'Bearer ' + token);
      options.headers = headers;
      return fetch(url, options);
    });
  };
})();
