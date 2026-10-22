/*
 * حساب فلوس الحجز — js/booking-money.js
 *
 * المصدر الوحيد للفلوس هو tempBookings/{id}.paymentDetails (اللي صفحة الحجوزات بتسجّل فيه
 * والبوت بيقرا منه). أي صفحة عايزة تعرض «اتدفع كام، فاضل كام، القسط الجاي إمتى، مين متأخر»
 * تستعمل الملف ده بدل ما تحسب لوحدها أو تحتفظ بنسخة.
 *
 * كل التواريخ بتتحسب بتوقيت القاهرة، والمبالغ بالجنيه الصحيح.
 */
(function (root) {
  'use strict';

  var TZ = 'Africa/Cairo';
  var DAY = 86400000;

  // رقم من أي شكل: 1500 أو "1,500" أو "١٥٠٠ ج.م" أو "1500.5"
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v)
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
      .replace(/[٬,\s]/g, '')
      .replace(/٫/g, '.');
    var m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  // تاريخ اليوم في القاهرة كنص YYYY-MM-DD (مش بتوقيت جرينتش)
  function cairoDateString(d) {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d || new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    return get('year') + '-' + get('month') + '-' + get('day');
  }

  // عدد الأيام بين يومين في القاهرة (b - a)، من غير ما الساعة تفرق
  function cairoDayDiff(a, b) {
    var da = Date.parse(cairoDateString(a) + 'T00:00:00Z');
    var db = Date.parse(cairoDateString(b) + 'T00:00:00Z');
    return Math.round((db - da) / DAY);
  }

  // نفس اليوم بعد n شهر، ولو الشهر أقصر ناخد آخر يوم فيه (٣١ يناير + شهر = ٢٨/٢٩ فبراير، مش ٣ مارس)
  function addMonthsClamped(dateStr, n) {
    var y = +dateStr.slice(0, 4), m = +dateStr.slice(5, 7) - 1, d = +dateStr.slice(8, 10);
    var tm = m + n, ty = y + Math.floor(tm / 12);
    tm = ((tm % 12) + 12) % 12;
    var last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
    var dd = Math.min(d, last);
    return ty + '-' + String(tm + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  }

  // تاريخ قسط (YYYY-MM-DD) → ISO عند الضهر بتوقيت القاهرة، علشان ما يقعش في اليوم اللي قبله في أي مكان
  function dueIso(dateStr) {
    return new Date(dateStr + 'T12:00:00+03:00').toISOString();
  }

  /*
   * جدول أقساط جديد: دفعة أولى + n قسط شهري.
   * الأقساط بالجنيه الصحيح، والكسر بيتحط على آخر قسط، فالمجموع = السعر بالظبط.
   * الترقيم: الدفعة الأولى 0، وبعدها 1..n (نفس الترقيم اللي في البيانات الحالية).
   */
  function buildSchedule(total, firstPayment, n, opts) {
    opts = opts || {};
    total = Math.round(num(total));
    firstPayment = Math.round(num(firstPayment));
    n = Math.max(1, Math.floor(num(n)));
    var start = opts.startDate || cairoDateString(new Date());
    var nowIso = new Date().toISOString();
    var remaining = Math.max(0, total - firstPayment);
    var base = Math.floor(remaining / n);
    var schedule = [{
      installmentNumber: 0, amount: firstPayment, dueDate: dueIso(start),
      status: 'paid', paidAt: nowIso, actualPaidAmount: firstPayment,
      paymentMethod: opts.method || null, reference: opts.reference || null
    }];
    for (var i = 1; i <= n; i++) {
      var amount = i === n ? remaining - base * (n - 1) : base;
      schedule.push({
        installmentNumber: i, amount: amount, dueDate: dueIso(addMonthsClamped(start, i)),
        status: 'pending', paidAt: null, paymentMethod: null, reference: null
      });
    }
    return schedule;
  }

  // المدفوع من القسط ده لحد دلوقتي (القسط الجزئي ممكن يتدفع على كذا مرة)
  function paidOn(inst) {
    if (!inst) return 0;
    if (typeof inst.paidSoFar === 'number') return inst.paidSoFar;
    if (inst.status === 'paid') return num(inst.amount);
    if (inst.status === 'partial') return Math.min(num(inst.actualPaidAmount), num(inst.amount));
    return 0;
  }

  /*
   * ملخص فلوس حجز واحد: الإجمالي، والمدفوع، والباقي، والقسط الجاي، والمتأخر.
   * المدفوع = paymentDetails.paidAmount (اللي صفحة الحجوزات بتجمعه مع كل دفعة).
   */
  function summarize(booking, now) {
    now = now || new Date();
    var b = booking || {};
    var pd = b.paymentDetails || {};
    var total = num(pd.totalAmount) || num(b.pricing && (b.pricing.finalPriceNumber || b.pricing.finalPrice));
    var paid = num(pd.paidAmount);
    if (pd.type === 'full' && pd.fullyPaid && !paid) paid = total;
    var remaining = Math.max(0, total - paid);
    var sched = Array.isArray(pd.installmentSchedule) ? pd.installmentSchedule : [];
    var rows = sched.map(function (inst, idx) {
      var amount = num(inst.amount);
      var already = paidOn(inst);
      var open = inst.status !== 'paid';
      var days = inst.dueDate ? cairoDayDiff(new Date(inst.dueDate), now) : null; // موجب = متأخر
      var state = !open ? 'paid'
        : days === null ? 'unknown'
        : days > 0 ? 'overdue'
        : days >= -7 ? 'due'
        : 'upcoming';
      return {
        idx: idx, number: inst.installmentNumber != null ? inst.installmentNumber : idx,
        label: idx === 0 && inst.installmentNumber === 0 ? 'الدفعة الأولى' : 'القسط ' + (inst.installmentNumber != null ? inst.installmentNumber : idx),
        amount: amount, paidSoFar: already, left: open ? Math.max(0, amount - already) : 0,
        dueDate: inst.dueDate || null, daysLate: days !== null && days > 0 ? days : 0,
        daysUntil: days !== null && days <= 0 ? -days : null,
        state: state, partial: inst.status === 'partial', raw: inst
      };
    });
    var open = rows.filter(function (r) { return r.state !== 'paid'; });
    var overdue = open.filter(function (r) { return r.state === 'overdue'; });
    var next = open.filter(function (r) { return r.state !== 'overdue'; })[0] || null;
    var scheduleTotal = rows.reduce(function (a, r) { return a + r.amount; }, 0);
    return {
      bookingId: b.id || null,
      type: pd.type || (sched.length ? 'installment' : (b.status === 'paid' || b.status === 'transferred' ? 'full' : null)),
      total: total, paid: paid, remaining: remaining,
      fullyPaid: !!pd.fullyPaid || (total > 0 && remaining === 0),
      rows: rows, next: next,
      overdue: overdue, overdueCount: overdue.length,
      overdueAmount: overdue.reduce(function (a, r) { return a + r.left; }, 0),
      maxDaysLate: overdue.reduce(function (a, r) { return Math.max(a, r.daysLate); }, 0),
      scheduleMismatch: sched.length > 0 && total > 0 && Math.abs(scheduleTotal - total) >= 1
    };
  }

  function egp(n) {
    return Math.round(num(n)).toLocaleString('ar-EG') + ' ج.م';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-EG', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
  }

  var api = {
    num: num, cairoDateString: cairoDateString, cairoDayDiff: cairoDayDiff,
    addMonthsClamped: addMonthsClamped, dueIso: dueIso,
    buildSchedule: buildSchedule, paidOn: paidOn, summarize: summarize,
    egp: egp, formatDate: formatDate
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BookingMoney = api;
})(typeof window !== 'undefined' ? window : this);
