/*
 * كوبونات المحفظة عن طريق السيرفر — js/wallet-client.js
 *
 * الكوبون بيتعمل وبيتلغي على السيرفر بس، في نفس العملية اللي بتخصم أو ترجّع النقاط.
 * الصفحة بتبعت إثبات دخول العميل (Firebase ID token)، والسيرفر بيلاقي ملفه بنفسه.
 *
 * WalletServer.createCoupon(amount) → { id, code, value, pointsDeducted, balance }
 * WalletServer.cancelCoupon(id)     → { pointsReturned }
 * الأخطاء: Error فيه code و message بالعربي جاهزة للعرض.
 */
(function () {
  'use strict';

  var BASE = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot';

  function msg(j) {
    switch (j.error) {
      case 'login': return 'محتاج تدخل حسابك تاني. اخرج وادخل، وبعدها جرّب';
      case 'no-profile': return 'مش لاقيين ملفك. كلّمنا على تليجرام';
      case 'suspended': return 'الحساب ده متوقف. كلّمنا على تليجرام';
      case 'min': return 'أقل قيمة للكوبون ' + (j.min || 10) + ' جنيه';
      case 'max': return 'أقصى قيمة لكوبون دلوقتي ' + Number(j.max || 0).toLocaleString('ar-EG') + ' جنيه';
      case 'balance': return 'رصيدك مش كفاية: محتاج ' + Number(j.need || 0).toLocaleString('ar-EG') + ' نقطة';
      case 'too-many': return 'محاولات كتير ورا بعض. استنى ربع ساعة وجرّب تاني';
      case 'not-found': return 'الكوبون ده مش موجود';
      case 'not-yours': return 'الكوبون ده مش من محفظتك';
      case 'used': return 'الكوبون ده اتستعمل، فمش هينفع يتلغي';
      case 'network': return 'مفيش اتصال بالإنترنت. اتأكد من الاتصال وجرّب تاني';
      default: return 'حصلت مشكلة مؤقتة. جرّب تاني بعد دقيقة';
    }
  }

  function call(path, body) {
    var user = null;
    try { user = firebase.auth().currentUser; } catch (e) {}
    var tokenP = user ? user.getIdToken() : Promise.resolve(null);
    return tokenP.then(function (token) {
      if (!token) { var e0 = new Error(msg({ error: 'login' })); e0.code = 'login'; throw e0; }
      return fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().catch(function () { return {}; });
      }, function () { return { ok: false, error: 'network' }; });
    }).then(function (j) {
      if (!j || !j.ok) { var e = new Error(msg(j || {})); e.code = (j && j.error) || 'server'; e.data = j; throw e; }
      return j;
    });
  }

  window.WalletServer = {
    createCoupon: function (amount) { return call('/wallet/coupon', { amount: Number(amount) }); },
    cancelCoupon: function (id) { return call('/wallet/coupon-cancel', { couponId: String(id) }); }
  };
})();
