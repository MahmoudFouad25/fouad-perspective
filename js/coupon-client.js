/*
 * الكوبونات عن طريق السيرفر — js/coupon-client.js
 *
 * محدش بقى يقدر يعرض الكوبونات من المتصفح. الصفحات بتسأل السيرفر:
 *   CouponServer.findByCode(code)   → زي نتيجة query في Firestore: { empty, docs: [{ id, data() }] }
 *   CouponServer.redeem(id, bookingDocId) → الكوبون يتعلّم «اتستعمل» على الحجز ده (السيرفر بيتأكد إنه فيه)
 *   CouponServer.myWalletCoupons()  → كوبونات محفظة العميل الداخل، بنفس شكل نتيجة الـquery
 */
(function () {
  'use strict';

  var BASE = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot';

  function ts(ms) {
    if (!ms) return null;
    return { toDate: function () { return new Date(ms); }, toMillis: function () { return ms; }, seconds: Math.floor(ms / 1000) };
  }

  function snapshot(items) {
    var docs = items.map(function (it) {
      return { id: it.id, exists: true, data: function () { return it.data; } };
    });
    return {
      empty: docs.length === 0, size: docs.length, docs: docs,
      forEach: function (fn) { docs.forEach(fn); }
    };
  }

  function post(path, body, token) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(BASE + path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }); });
  }

  function findByCode(code) {
    return post('/coupon/check', { code: String(code || '') }).then(function (j) {
      if (j && j.error === 'too-many') {
        var e = new Error('محاولات كتير. استنى ربع ساعة وجرّب تاني'); e.code = 'too-many'; throw e;
      }
      if (!j || !j.ok || !j.coupon) return snapshot([]);
      var c = j.coupon, data = {};
      Object.keys(c).forEach(function (k) { if (k !== 'id') data[k] = c[k]; });
      data.expiresAt = ts(c.expiresAt);
      return snapshot([{ id: c.id, data: data }]);
    });
  }

  function redeem(couponId, bookingDocId) {
    return post('/coupon/redeem', { couponId: String(couponId), bookingDocId: String(bookingDocId) }).then(function (j) {
      if (!j || !j.ok) { var e = new Error('ما اتسجلش استعمال الكوبون (' + ((j && j.error) || 'server') + ')'); e.code = j && j.error; throw e; }
      return j;
    });
  }

  function myWalletCoupons() {
    var user = null;
    try { user = firebase.auth().currentUser; } catch (e) {}
    if (!user) return Promise.resolve(snapshot([]));
    return user.getIdToken().then(function (token) { return post('/wallet/coupons', {}, token); }).then(function (j) {
      if (!j || !j.ok) throw new Error('ما قدرناش نجيب كوبوناتك');
      return snapshot((j.coupons || []).map(function (c) {
        var data = {};
        Object.keys(c).forEach(function (k) { if (k !== 'id') data[k] = c[k]; });
        data.source = 'wallet_points';
        data.createdAt = ts(c.createdAt);
        data.usedAt = ts(c.usedAt);
        return { id: c.id, data: data };
      }));
    });
  }

  window.CouponServer = { findByCode: findByCode, redeem: redeem, myWalletCoupons: myWalletCoupons };
})();
