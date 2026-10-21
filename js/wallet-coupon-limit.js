/*
 * أقصى قيمة لكوبون المحفظة — js/wallet-coupon-limit.js
 *
 * الإعداد محفوظ في وثيقة واحدة: app_settings/wallet_coupons
 *   defaultMax : الحد العادي بالجنيه (بيشتغل على طول)
 *   periodMax  : حد لفترة معينة (اختياري)
 *   periodFrom : بداية الفترة (Timestamp)
 *   periodTo   : نهاية الفترة (Timestamp) — بعدها الحد بيرجع للعادي لوحده
 *
 * الأدمن بيغيّره من admin/coupon-settings.html.
 * قواعد Firestore بتحسب نفس الحساب بالظبط على السيرفر (function cpWalletMax)،
 * فحتى لو حد عدّل الصفحة، الكوبون الأكبر من الحد بيترفض.
 * الملف ده بس علشان العميل يشوف الحد ويعرف قبل ما يضغط.
 */
(function () {
  'use strict';

  var DOC_PATH = ['app_settings', 'wallet_coupons'];
  var FALLBACK_MAX = 2000;   // لازم يطابق الرقم الاحتياطي في القواعد
  var MIN_VALUE = 10;

  function toMs(v) {
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v;
    var t = Date.parse(v);
    return isNaN(t) ? null : t;
  }

  // نفس منطق القواعد: لو فيه فترة شغالة دلوقتي يبقى حدها، غير كده الحد العادي.
  function compute(data, nowMs) {
    data = data || {};
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var def = typeof data.defaultMax === 'number' ? data.defaultMax : FALLBACK_MAX;
    var from = toMs(data.periodFrom), to = toMs(data.periodTo);
    var inPeriod = typeof data.periodMax === 'number' && from !== null && to !== null && now >= from && now < to;
    return {
      max: inPeriod ? data.periodMax : def,
      min: MIN_VALUE,
      inPeriod: inPeriod,
      periodEndsAt: inPeriod ? new Date(to) : null,
      defaultMax: def
    };
  }

  function get(db) {
    return db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get()
      .then(function (snap) { return compute(snap.exists ? snap.data() : null); })
      .catch(function () { return compute(null); });
  }

  window.WalletCouponLimit = {
    get: get,
    compute: compute,
    DOC_PATH: DOC_PATH,
    FALLBACK_MAX: FALLBACK_MAX,
    MIN_VALUE: MIN_VALUE
  };
})();
