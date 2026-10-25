/*
 * تجهيز الطلاب — js/student-setup.js
 *
 * المنطق المشترك اللي بيحوّل حجز مدفوع (individualStudents) لطالب جاهز:
 * الحساب (ربط بحساب موجود أو حساب جديد) ← تخصيص الكورسات ← النقاط ← رسالة الترحيب.
 * المنطق منقول من صفحة الحجوزات الفردية القديمة زي ما هو (نفس شكل الحساب والتخصيص والنقاط)،
 * مع تصليحات: النقاط بقت بمعاملة (transaction) فما بتضيعش لو صفحتين اشتغلوا مع بعض،
 * ورابط الدخول بيتعمل من السيرفر، وأي فشل في التخصيص بيظهر بدل ما يتبلع.
 *
 * محتاج قبله: Firebase compat (app + firestore + auth) و js/bot-client.js و js/password-safe.js.
 *
 *   StudentSetup.plan(bookingId)               → إيه اللي محتاج يتعمل للحجز ده (من غير ما يكتب حاجة)
 *   StudentSetup.run(plan, {decision, welcome}) → يعمله: الحساب، الكورس، النقاط، الترحيب
 *   StudentSetup.queueState(data)              → حالة الحجز في الطابور
 *   StudentSetup.assignCourse(userId, opts)    → تخصيص كورس يدوي (من ملف العميل)
 *   StudentSetup.changeCourse(userId, enrollmentId, course) → تغيير كورس (نفس الفلوس والمدة)
 *   StudentSetup.sendWelcome(...) / loginLink(userId)
 */
(function () {
  'use strict';

  var LOGIN_URL = 'https://mahmoudfouad25.github.io/fouad-perspective/login.html';
  var BOT = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot';
  var DEFAULT_MONTHS = 6;
  var WELCOME_WINDOW_DAYS = 14;   // «ما اتبعتلوش ترحيب» بيتحسب للي اتجهّزوا في آخر أسبوعين بس

  function db() { return firebase.firestore(); }
  function FV() { return firebase.firestore.FieldValue; }
  function nowIso() { return new Date().toISOString(); }
  function sdb() { return db().collection('individualStudents'); }
  function udb() { return db().collection('users'); }

  // ==================== بنية المستخدم (منقولة زي ما هي) ====================
  var UserStructure = {
    createNewUser: function (studentData) {
      var now = nowIso();
      var customer = studentData.customer || {};
      var uniqueId = this.generateUniqueSlug(customer.name);
      return {
        id: uniqueId,
        personalInfo: {
          name: customer.name || '',
          title: customer.title || '',
          email: customer.email || '',
          whatsapp: customer.whatsapp || '',
          phone: customer.phone || customer.whatsapp || '',
          age: customer.age || null,
          gender: customer.gender || '',
          country: customer.country || '',
          city: customer.city || '',
          job: customer.job || ''
        },
        auth: {
          tempPassword: btoa(this.generateStrongPassword()),
          lastLogin: null,
          loginCount: 0,
          createdAt: now,
          createdBy: 'admin',
          createdFrom: 'individual-students',
          lastPasswordChange: null,
          twoFactorEnabled: false
        },
        accountStatus: {
          status: 'active',
          journeyStage: 1,
          journeyTitle: 'ملبي النداء',
          journeyStars: 1,
          journeyProgress: 0,
          seeds: 0,
          fruits: 0,
          totalPoints: 0,
          verified: false,
          suspended: false,
          suspensionReason: null,
          lastActivityAt: now,
          accountHealth: 100,
          joinedAt: now,
          daysInSystem: 0
        },
        enrollments: [],
        financial: {
          totalPaid: 0,
          totalDue: 0,
          totalSavings: 0,
          totalOriginalPrice: 0,
          paymentHistory: [],
          preferredPaymentMethods: customer.paymentMethods || [],
          creditLimit: 0,
          creditUsed: 0
        },
        journeyPoints: { balance: 0, stage: 1, stageTitle: 'ملبي النداء', stageStars: 1, history: [], lastUpdated: now, lifetime: 0 },
        walletPoints: { balance: 0, used: 0, lifetime: 0, history: [], lastUpdated: now, conversionRate: 0.1, minRedemption: 100 },
        referralProgram: {
          myCode: this.generateReferralCode(customer.name),
          status: 'inactive',
          usageCount: 0,
          earnings: { cashRewards: 0, pointsEarned: 0, freeCoursesEarned: 0, totalValue: 0 },
          referredUsers: [],
          referredBy: null
        },
        bookingHistory: [],
        engagement: { coursesStarted: 0, coursesCompleted: 0, averageProgress: 0, lastCourseAccess: null, totalStudyHours: 0, certificates: [], achievements: [] },
        communication: { preferences: { email: true, whatsapp: true, sms: false }, lastContacted: null, messagesReceived: 0, unsubscribed: false },
        metadata: {
          originalStudentDocId: studentData.id,
          dataCompleteness: this.calculateDataCompleteness(studentData),
          importSource: 'manual',
          tags: [],
          customFields: {},
          internalNotes: ''
        },
        timestamps: { createdAt: now, updatedAt: now, lastModifiedBy: 'admin', deletedAt: null }
      };
    },

    generateUniqueSlug: function (name) {
      var timestamp = Date.now().toString().slice(-6);
      var random = Math.random().toString(36).substring(2, 5);
      var isArabic = /[؀-ۿ]/.test(name);
      if (isArabic && name) {
        var map = {
          'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
          'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
          'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
          'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
          'ة': 'h', 'ئ': 'e', 'ء': 'a', 'ؤ': 'o'
        };
        var latin = '';
        for (var i = 0; i < name.length; i++) {
          var ch = name[i];
          if (map[ch]) latin += map[ch]; else if (ch === ' ') latin += '-';
        }
        latin = latin.toLowerCase().slice(0, 15);
        if (latin.length < 3) latin = 'user';
        return latin + '-' + timestamp + '-' + random;
      }
      var clean = (name || 'user').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').slice(0, 15);
      if (!clean || clean.length < 3) return 'user-' + timestamp + '-' + random;
      return clean + '-' + timestamp + '-' + random;
    },

    // نفس شكل الباسورد القديم (١٤ حرف من الأربع أنواع)، بس الأرقام العشوائية من crypto
    generateStrongPassword: function () {
      var sets = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', numbers: '0123456789', special: '!@#$%^&*+-=' };
      var pw = [sets.upper[rnd(26)], sets.lower[rnd(26)], sets.numbers[rnd(10)], sets.special[rnd(11)]];
      var all = sets.upper + sets.lower + sets.numbers + sets.special;
      for (var i = 4; i < 14; i++) pw.push(all[rnd(all.length)]);
      for (var j = pw.length - 1; j > 0; j--) { var k = rnd(j + 1), t = pw[j]; pw[j] = pw[k]; pw[k] = t; }
      return pw.join('');
    },

    generateReferralCode: function (name) {
      var cleanName = (name || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      var year = new Date().getFullYear();
      var random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return cleanName + year + random;
    },

    calculateDataCompleteness: function (studentData) {
      var customer = studentData.customer || {};
      var required = ['name', 'email', 'whatsapp', 'age', 'gender', 'country', 'city', 'job'];
      var filled = required.filter(function (f) { return customer[f] && customer[f] !== ''; }).length;
      var percentage = Math.round((filled / required.length) * 100);
      return { percentage: percentage, isComplete: percentage === 100, missingFields: required.filter(function (f) { return !customer[f]; }) };
    }
  };

  function rnd(n) {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    catch (e) { return Math.floor(Math.random() * n); }
  }

  // ==================== الكورسات ====================
  var courseCache = {};
  // الكورس بالاسم (العنوان، وبعدين الـ slug) — قراية واحدة لكل اسم في الجلسة
  function getCourseByName(courseName) {
    if (!courseName) return Promise.resolve(null);
    if (courseCache[courseName] !== undefined) return Promise.resolve(courseCache[courseName]);
    var col = db().collection('courses');
    return col.where('title', '==', courseName).limit(1).get().then(function (s) {
      if (!s.empty) return { id: s.docs[0].id, data: s.docs[0].data() || {} };
      return col.where('slug', '==', courseName.toLowerCase().replace(/\s+/g, '-')).limit(1).get().then(function (s2) {
        return s2.empty ? null : { id: s2.docs[0].id, data: s2.docs[0].data() || {} };
      });
    }).then(function (c) { courseCache[courseName] = c; return c; })
      .catch(function (e) { console.error('الكورس', courseName, e); return null; });
  }
  // الكورس بالاسم، ولو الاسم مش مطابق (تشكيل أو مسافة) بنجرب رقم الكورس اللي في الحجز
  function getCourseFor(name, fallbackId) {
    return getCourseByName(name).then(function (c) {
      if (c || !fallbackId) return c;
      return db().collection('courses').doc(String(fallbackId)).get().then(function (d) {
        var x = d.exists ? { id: d.id, data: d.data() || {} } : null;
        if (x) courseCache[name] = x;
        return x;
      }).catch(function () { return null; });
    });
  }
  // مدة الوصول الافتراضية للكورس: لو الكورس عليه accessMonths بنستعمله، غير كده ٦ شهور
  function courseMonths(course) {
    var m = course && course.data && Number(course.data.accessMonths || course.data.defaultAccessMonths);
    return m > 0 && m <= 120 ? Math.round(m) : DEFAULT_MONTHS;
  }
  var coursesList = null;
  function listCourses() {
    if (coursesList) return Promise.resolve(coursesList);
    return db().collection('courses').get().then(function (s) {
      var out = [];
      s.forEach(function (d) {
        var x = d.data() || {};
        if (x.isActive === false) return;
        out.push({ id: d.id, title: x.title || 'كورس من غير اسم', price: Number(x.pricing && x.pricing.basePrice) || 0, months: courseMonths({ data: x }), whatsappGroupLink: x.whatsappGroupLink || null });
        courseCache[x.title] = { id: d.id, data: x };
      });
      out.sort(function (a, b) { return a.title.localeCompare(b.title, 'ar'); });
      coursesList = out;
      return out;
    });
  }

  // ==================== التخصيص (منقول زي ما هو) ====================
  var EnrollmentManager = {
    getCourseIdByName: function (name) { return getCourseByName(name).then(function (c) { return c ? c.id : null; }); },

    createEnrollment: function (studentData, courseSettings) {
      var now = nowIso();
      var enrollmentId = 'enrollment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      var c = studentData.customer || {};
      return {
        id: enrollmentId,
        // رقم وثيقة الحجز نفسها (individualStudents/tempBookings بنفس الرقم)
        bookingId: studentData.id || studentData.bookingId || null,
        courseId: studentData.actualCourseId || studentData.courseId || null,
        title: studentData.courseName || 'دورة غير محددة',
        type: (studentData.journey && studentData.journey.type) || 'individual',
        enrollmentType: courseSettings.enrollmentType || 'new',
        previousEnrollmentId: courseSettings.previousEnrollmentId || null,
        dates: {
          enrolledAt: now,
          startDate: courseSettings.startDate,
          endDate: courseSettings.endDate,
          lastAccessedAt: null,
          completedAt: null,
          expiredAt: null,
          renewedAt: courseSettings.isRenewal ? now : null
        },
        courseInfo: {
          instructor: studentData.instructor || 'كوتش محمود فؤاد',
          category: studentData.category || 'تطوير شخصي',
          level: studentData.experience || 'beginner',
          duration: courseSettings.duration || '6 أشهر',
          totalLessons: 0,
          completedLessons: 0,
          progress: 0
        },
        pricing: {
          originalPrice: (studentData.pricing && studentData.pricing.basePriceNumber) || 0,
          finalPrice: (studentData.pricing && studentData.pricing.finalPriceNumber) || 0,
          currency: 'EGP',
          discounts: this.processDiscounts(studentData),
          totalDiscountAmount: studentData.totalSavings || 0,
          totalDiscountPercentage: this.calculateDiscountPercentage(studentData),
          activeOffer: studentData.activeOffer ? {
            id: studentData.activeOffer.id || ('offer-' + Date.now()),
            name: studentData.activeOffer.name,
            discount: studentData.activeOffer.discount,
            validUntil: studentData.activeOffer.validUntil || null
          } : null,
          coupon: studentData.coupon ? {
            code: studentData.coupon.code,
            value: studentData.coupon.value || 0,
            type: studentData.coupon.type || 'fixed',
            usedAt: now
          } : null
        },
        payment: {
          method: this.determinePaymentMethod(studentData),
          status: this.determinePaymentStatus(studentData),
          totalAmount: (studentData.pricing && studentData.pricing.finalPriceNumber) || 0,
          paidAmount: this.calculatePaidAmount(studentData),
          remainingAmount: this.calculateRemainingAmount(studentData),
          firstPaymentDate: studentData.paymentConfirmed ? now : null,
          lastPaymentDate: null,
          fullyPaidDate: null,
          installments: this.createInstallmentSystem(studentData),
          paymentDetails: { reference: studentData.paymentReference || null, method: studentData.paymentMethod || null, gateway: null, transactionId: null, receipt: null }
        },
        progress: { overallProgress: 0, lessonsProgress: 0, assignmentsProgress: 0, quizzesProgress: 0, milestones: [], certificates: [], badges: [] },
        metadata: {
          originalBookingId: studentData.originalBookingId || studentData.id,
          transferredFrom: 'individual-students',
          notes: courseSettings.notes || '',
          tags: [],
          customFields: {}
        },
        enrollmentFormData: {
          expectations: c.expectations || '',
          applicationPlan: c.applicationPlan || '',
          experience: c.experience || '',
          source: c.source || '',
          notes: c.notes || '',
          submittedAt: now
        },
        status: { current: 'active', isActive: true, isPaused: false, isExpired: false, reason: null, updatedAt: now }
      };
    },

    processDiscounts: function (studentData) {
      if (!Array.isArray(studentData.discounts)) return [];
      return studentData.discounts.map(function (d) {
        return { id: 'discount-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5), type: d.type, label: d.label, amount: d.amount || 0, percentage: d.percentage || 0, appliedAt: nowIso() };
      });
    },
    calculateDiscountPercentage: function (s) {
      var o = (s.pricing && s.pricing.basePriceNumber) || 0, f = (s.pricing && s.pricing.finalPriceNumber) || 0;
      return o === 0 ? 0 : Math.round(((o - f) / o) * 100);
    },
    determinePaymentMethod: function (s) {
      if (s.paymentInfo && s.paymentInfo.isInstallment) return 'installment-' + (s.paymentInfo.totalInstallments || 3) + 'months';
      return s.paymentMethod || 'cash';
    },
    calculatePaidAmount: function (s) {
      if (s.paymentInfo && s.paymentInfo.isInstallment) return s.paymentInfo.paidAmount || 0;
      if (s.paymentConfirmed || (s.paymentInfo && s.paymentInfo.fullyPaid)) return (s.pricing && s.pricing.finalPriceNumber) || 0;
      return 0;
    },
    calculateRemainingAmount: function (s) {
      return Math.max(0, ((s.pricing && s.pricing.finalPriceNumber) || 0) - this.calculatePaidAmount(s));
    },
    determinePaymentStatus: function (s) {
      if (s.paymentConfirmed || (s.paymentInfo && s.paymentInfo.fullyPaid)) return 'paid';
      if (s.paymentInfo && s.paymentInfo.paidAmount > 0) return 'partial';
      return 'pending';
    },
    createInstallmentSystem: function (s) {
      var pi = s.paymentInfo;
      if (!pi || !pi.isInstallment) return null;
      return {
        type: 'monthly',
        totalInstallments: pi.totalInstallments || 3,
        paidInstallments: pi.paidInstallments || 0,
        installmentAmount: Math.ceil(((s.pricing && s.pricing.finalPriceNumber) || 0) / (pi.totalInstallments || 1)),
        nextDueDate: pi.nextDueDate || null,
        lastPaidDate: null,
        schedule: this.generateInstallmentSchedule(s),
        settings: { gracePeriodDays: 7, lateFeePercentage: 5, autoReminder: true, reminderDaysBefore: 3 }
      };
    },
    generateInstallmentSchedule: function (s) {
      var list = (s.paymentInfo && s.paymentInfo.installmentSchedule) || [];
      return list.map(function (inst, i) {
        return {
          installmentNumber: inst.installmentNumber || i + 1,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.status || 'pending',
          paidDate: inst.status === 'paid' ? inst.paidDate || null : null,
          paidAmount: inst.status === 'paid' ? inst.amount : 0,
          paymentMethod: inst.paymentMethod || null,
          reference: inst.reference || null,
          isLate: false,
          lateFees: 0,
          notes: inst.notes || ''
        };
      });
    },
    calculateFinancialTotals: function (enrollments) {
      var t = { totalPaid: 0, totalDue: 0, totalSavings: 0, totalOriginalPrice: 0, activeCourses: 0, completedCourses: 0 };
      enrollments.forEach(function (e) {
        var cur = e.status && e.status.current;
        if (cur === 'cancelled') return;   // الكورس الملغي ما بيدخلش في الحساب
        t.totalPaid += (e.payment && e.payment.paidAmount) || 0;
        t.totalDue += (e.payment && e.payment.remainingAmount) || 0;
        t.totalSavings += (e.pricing && e.pricing.totalDiscountAmount) || 0;
        t.totalOriginalPrice += (e.pricing && e.pricing.originalPrice) || 0;
        if (cur === 'active') t.activeCourses++; else if (cur === 'completed') t.completedCourses++;
      });
      return t;
    }
  };

  // ==================== النقاط (بمعاملة) ====================
  // نفس حقول addDualPoints القديمة بالظبط، بس القراية والكتابة في معاملة واحدة
  function addDualPoints(userId, amount, reason, description) {
    var ref = udb().doc(userId);
    var label = String(reason || '').indexOf('(') === -1 ? reason + ' (النظامين)' : reason;
    return db().runTransaction(function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists) return false;
        var u = s.data() || {}, jp = u.journeyPoints || {}, wp = u.walletPoints || {}, ts = nowIso();
        tx.update(ref, {
          'journeyPoints.balance': (jp.balance || 0) + amount,
          'journeyPoints.lifetime': amount > 0 ? (jp.lifetime || 0) + amount : (jp.lifetime || 0),
          'journeyPoints.lastUpdated': ts,
          'journeyPoints.history': FV().arrayUnion({ amount: amount, reason: label, description: description, timestamp: ts, type: 'journey' }),
          'walletPoints.balance': (wp.balance || 0) + amount,
          'walletPoints.lifetime': amount > 0 ? (wp.lifetime || 0) + amount : (wp.lifetime || 0),
          'walletPoints.lastUpdated': ts,
          'walletPoints.history': FV().arrayUnion({ amount: amount, reason: label, description: description, timestamp: ts, type: 'wallet' })
        });
        return true;
      });
    });
  }

  // ==================== الحجز ====================
  // نفس تطبيع الصفحة القديمة (loadStudents / hydrateStudent)
  function normalize(id, data) {
    var d = data || {}, pd = d.paymentDetails || {};
    return Object.assign({ id: id }, d, {
      transferredAt: d.transferredAt || (d.transferInfo && d.transferInfo.transferredAt) || null,
      originalBookingId: (d.transferInfo && d.transferInfo.originalBookingId) || d.originalBookingId || id,
      accountCreated: d.accountCreated || false,
      accountStatus: d.accountStatus || 'pending',
      userId: d.userId || null,
      paymentInfo: d.paymentInfo || {
        status: d.status || 'pending',
        paymentConfirmed: d.paymentConfirmed || false,
        paymentMethod: d.paymentMethod || null,
        paymentReference: d.paymentReference || null,
        paymentDetails: d.paymentDetails || null,
        paidAt: d.paidAt || null,
        paymentConfirmedAt: d.paymentConfirmedAt || null,
        paymentConfirmedBy: d.paymentConfirmedBy || null,
        isInstallment: pd.type === 'installment',
        fullyPaid: pd.fullyPaid || false,
        totalAmount: pd.totalAmount || (d.pricing && d.pricing.finalPriceNumber) || 0,
        paidAmount: pd.paidAmount || 0,
        remainingAmount: pd.remainingAmount || 0,
        installmentSchedule: pd.installmentSchedule || [],
        nextDueDate: pd.nextDueDate || null,
        totalInstallments: pd.totalInstallments || 0,
        paidInstallments: pd.paidInstallments || 0
      },
      paymentConfirmed: d.paymentConfirmed || (d.paymentInfo && d.paymentInfo.paymentConfirmed) || pd.fullyPaid || false
    });
  }

  function needsProcessing(d) {
    if (!d || d.paymentConfirmed !== true) return false;
    return !d.userId || d.accountStatus === 'pending_creation' || d.courseAssigned !== true;
  }

  function modulesOf(s) {
    if (Array.isArray(s.courseModules) && s.courseModules.filter(Boolean).length) return s.courseModules.filter(Boolean);
    return s.courseName ? [s.courseName] : [];
  }
  function choiceLabel(s) {
    if (s.package && s.package.name) return s.package.name;
    var m = Array.isArray(s.courseModules) ? s.courseModules.filter(Boolean) : [];
    if (m.length > 1) return 'باقة كاملة (' + m.length + ' مودويل)';
    if (m.length === 1) return m[0];
    return null;
  }

  function welcomeSent(d) { return !!(d.automationCompleted && d.automationCompleted.credentialsSent) || !!d.welcomeSentAt; }
  function daysSince(iso) { var t = Date.parse(iso || ''); return isNaN(t) ? Infinity : (Date.now() - t) / 86400000; }

  // حالة الحجز في الطابور:
  //  new: جديد (مفيش حساب) · review: مستني قرارك · nocourse: حساب من غير كورس
  //  nowelcome: اتجهّز وما اتبعتلوش ترحيب (آخر أسبوعين) · done: خلص · off: مش مدفوع
  function queueState(d) {
    if (!d || d.paymentConfirmed !== true) return 'off';
    if (d.needsAccountReview && !d.courseAssigned) return 'review';
    if (!d.userId || d.accountStatus === 'pending_creation') return 'new';
    if (d.courseAssigned !== true) return 'nocourse';
    if (d.telegramChatId && !welcomeSent(d) && !d.welcomeSkipped && daysSince(d.courseAssignedAt || d.accountCreatedAt) <= WELCOME_WINDOW_DAYS) return 'nowelcome';
    return 'done';
  }

  // ==================== البحث عن حساب موجود (منقول) ====================
  var usersScan = null;
  var SCAN_TTL = 10 * 60 * 1000;
  function forgetScan() { usersScan = null; }
  function phoneVariants(phone) {
    if (!phone) return [];
    var digits = String(phone).replace(/\D/g, ''), last10 = digits.slice(-10);
    var v = [String(phone).trim(), digits, last10 ? '0' + last10 : '', last10 ? '20' + last10 : '', last10 ? '+20' + last10 : ''].filter(Boolean);
    return v.filter(function (x, i) { return v.indexOf(x) === i; }).slice(0, 10);
  }
  function findExisting(phone, email) {
    var pv = phoneVariants(phone);
    var ev = email ? [String(email).trim(), String(email).trim().toLowerCase()].filter(function (x, i, a) { return x && a.indexOf(x) === i; }) : [];
    var quick = [];
    function one(field, vals, t) {
      return udb().where(field, 'in', vals).limit(1).get().then(function (q) { return q.empty ? null : { id: q.docs[0].id, t: t }; });
    }
    // الإيميل الأول: لو اتلقى بالإيميل يبقى ربط من غير سؤال
    if (ev.length) quick.push(one('personalInfo.email', ev, 'email'));
    if (pv.length) { quick.push(one('personalInfo.phone', pv, 'phone')); quick.push(one('personalInfo.whatsapp', pv, 'phone')); }
    return Promise.all(quick).then(function (hits) {
      var hit = hits.filter(Boolean)[0];
      if (hit) return { found: true, userId: hit.id, matchType: hit.t };
      // احتياطي للأرقام المكتوبة بشكل مختلف: مسح المستخدمين مرة كل ١٠ دقايق
      var scan = usersScan && Date.now() - usersScan.t < SCAN_TTL ? Promise.resolve(usersScan)
        : udb().get().then(function (s) { usersScan = { t: Date.now(), docs: s.docs.map(function (d) { return { id: d.id, p: (d.data() || {}).personalInfo || {} }; }) }; return usersScan; });
      return scan.then(function (sc) {
        var cp = phone ? String(phone).replace(/\D/g, '') : '', ce = email ? String(email).toLowerCase().trim() : '';
        for (var i = 0; i < sc.docs.length; i++) {
          var p = sc.docs[i].p, up = p.phone || p.whatsapp;
          if (cp && up && String(up).replace(/\D/g, '') === cp) return { found: true, userId: sc.docs[i].id, matchType: 'phone' };
          if (ce && p.email && String(p.email).toLowerCase().trim() === ce) return { found: true, userId: sc.docs[i].id, matchType: 'email' };
        }
        return { found: false, userId: null };
      });
    }).catch(function (e) {
      console.error('البحث عن حساب', e);
      throw new Error('مقدرتش أدوّر على الحسابات الموجودة. جرّب تاني بعد شوية.');
    });
  }

  function sameEmail(a, b) { a = String(a || '').trim().toLowerCase(); b = String(b || '').trim().toLowerCase(); return !!a && a === b; }

  // ==================== الخطة: إيه اللي محتاج يتعمل؟ (قراية بس) ====================
  // kind: done | assign (حساب موجود ومحتاج كورس) | link (حساب بنفس الإيميل: ربط على طول)
  //       ask (حساب بنفس التليفون أو ربط محفوظ بإيميل مختلف: محتاج قرارك) | create (حساب جديد)
  function plan(bookingId) {
    return sdb().doc(bookingId).get().then(function (snap) {
      if (!snap.exists) throw new Error('الحجز ده مش موجود');
      var raw = snap.data() || {}, s = normalize(snap.id, raw), c = s.customer || {};
      var base = { bookingId: snap.id, student: s, raw: raw, modules: modulesOf(s), chatId: s.telegramChatId || null, state: queueState(raw) };
      if (raw.paymentConfirmed !== true) return Object.assign(base, { kind: 'unpaid' });
      if (raw.accountCreated && raw.userId && raw.courseAssigned) return Object.assign(base, { kind: 'done', userId: raw.userId });
      if (raw.userId && raw.accountStatus !== 'pending_creation' && !raw.needsAccountReview) return Object.assign(base, { kind: 'assign', userId: raw.userId });
      var cand;
      if (raw.needsAccountReview && raw.accountReviewCandidate) {
        cand = Promise.resolve({ userId: raw.accountReviewCandidate, how: String(raw.accountReviewReason || '').replace(/^(matched_existing_|admin_declined_)/, '') || 'saved' });
      } else if (raw.userAccountInfo && raw.userAccountInfo.hasExistingAccount && raw.userAccountInfo.existingUserId) {
        cand = Promise.resolve({ userId: raw.userAccountInfo.existingUserId, how: 'saved' });
      } else if (raw.userId) {
        cand = Promise.resolve({ userId: raw.userId, how: 'saved' });
      } else {
        cand = findExisting(c.phone || c.whatsapp || raw.phone || raw.whatsapp, c.email || raw.email).then(function (r) { return r.found ? { userId: r.userId, how: r.matchType } : null; });
      }
      return cand.then(function (cd) {
        if (!cd) return Object.assign(base, { kind: 'create' });
        return udb().doc(cd.userId).get().then(function (us) {
          if (!us.exists) return Object.assign(base, { kind: 'create', staleCandidate: cd.userId });
          var u = us.data() || {}, p = u.personalInfo || {};
          var info = { userId: cd.userId, how: cd.how, name: p.name || '', email: p.email || '', phone: p.whatsapp || p.phone || '', courses: (u.enrollments || []).length, merged: !!(u.metadata && u.metadata.mergedInto) };
          if (info.merged) info.mergedInto = u.metadata.mergedInto;
          var auto = !raw.needsAccountReview && !info.merged && (cd.how === 'email' || sameEmail(c.email, p.email));
          return Object.assign(base, { kind: auto ? 'link' : 'ask', candidate: info });
        });
      });
    });
  }

  // ==================== التنفيذ ====================
  // decision: 'link' (اربطه بالحساب المرشّح) | 'create' (حساب جديد) — مطلوب لو kind = ask
  // welcome: true = ابعت رسالة الترحيب على التليجرام لو فيه
  function run(p, opts) {
    opts = opts || {};
    var step = typeof opts.onStep === 'function' ? opts.onStep : function () {};
    var s = p.student, id = p.bookingId, out = { bookingId: id, steps: [] };
    function did(k, text) { out.steps.push({ k: k, text: text }); step(k, text); }
    if (p.kind === 'done') return Promise.resolve(Object.assign(out, { userId: p.userId, already: true }));
    if (p.kind === 'unpaid') return Promise.reject(new Error('الحجز ده لسه ما اتدفعش'));
    var decision = p.kind === 'link' ? 'link' : p.kind === 'create' ? 'create' : p.kind === 'assign' ? 'assign' : opts.decision;
    if (!decision) return Promise.reject(new Error('محتاج قرارك: نفس الشخص ولا حساب جديد؟'));

    var account;
    if (decision === 'assign') {
      account = Promise.resolve({ userId: p.userId, isNew: false });
    } else if (decision === 'link') {
      var uid = (opts.userId) || (p.candidate && p.candidate.userId);
      if (!uid) return Promise.reject(new Error('مفيش حساب أربطه بيه'));
      account = sdb().doc(id).update({
        accountCreated: true, accountStatus: 'active', userId: uid,
        accountLinkedAt: nowIso(), linkedToExistingAccount: true,
        needsAccountReview: FV().delete(), accountReviewReason: FV().delete(), accountReviewCandidate: FV().delete(),
        accountReviewDecision: p.kind === 'ask' ? 'same_person' : 'auto_email'
      }).then(function () { did('account', 'اتربط بحسابه الموجود'); return { userId: uid, isNew: false }; });
    } else {
      account = createAccount(s, p).then(function (a) { did('account', 'اتعمله حساب جديد'); return a; });
    }

    return account.then(function (a) {
      out.userId = a.userId; out.isNew = a.isNew; out.email = a.email || null;
      linkTempBooking(id, a.userId);
      if (a.password) Object.defineProperty(out, 'password', { value: a.password, enumerable: false });   // للواتساب بس، ما بيتحفظش
      return assignModules(id, a.userId).then(function (r) {
        out.assigned = r;
        did('course', r.count ? ('اتخصصله ' + r.modules.join('، ')) : (r.modules.length ? 'الكورس متخصص قبل كده' : 'الحجز مالوش كورس محدد'));
      });
    }).then(function () {
      if (!opts.welcome) return;
      if (!p.chatId) { out.welcome = { sent: false, reason: 'no-telegram' }; return; }
      return sendWelcome({ student: s, userId: out.userId, isNew: out.isNew, email: out.email, password: out.password, modules: p.modules })
        .then(function () { out.welcome = { sent: true }; did('welcome', 'اتبعتله رسالة الترحيب'); })
        .catch(function (e) { out.welcome = { sent: false, reason: e.message }; did('welcome-fail', 'رسالة الترحيب ما اتبعتتش: ' + e.message); });
    }).then(function () {
      logClient(out.userId, (out.isNew ? 'اتعمله حساب واتجهّز' : decision === 'assign' ? 'اتخصصله الكورس' : 'اتربط بالحجز واتجهّز') + ' من «تجهيز الطلاب»' +
        (out.assigned && out.assigned.count ? ': ' + out.assigned.modules.join('، ') : '') + (out.welcome && out.welcome.sent ? ' · اتبعتله الترحيب' : ''));
      return out;
    });
  }

  // الحجز الأصلي (tempBookings بنفس الرقم) ياخد رقم الحساب، علشان ملف العميل وعلامة «تجريبي» والبوت يلاقوه
  function linkTempBooking(id, userId) {
    var ref = db().collection('tempBookings').doc(id);
    return ref.get().then(function (d) {
      if (d.exists && (d.data() || {}).userId !== userId) return ref.update({ userId: userId, userLinkedAt: nowIso() });
    }).catch(function (e) { console.warn('ربط الحجز بالحساب:', e && e.message); });
  }
  // سطر في سجل العميل (نفس سجل ملف العميل)
  function logClient(userId, text) {
    if (!userId) return Promise.resolve();
    var by = 'admin';
    try { by = (firebase.auth().currentUser || {}).email || 'admin'; } catch (e) {}
    var item = { at: nowIso(), by: by, kind: 'course', text: text };
    return db().collection('client_log').doc(userId).set({ userId: userId, items: FV().arrayUnion(item), updatedAt: FV().serverTimestamp() }, { merge: true })
      .catch(function (e) { console.warn('السجل:', e && e.message); });
  }

  // حساب جديد — نفس خطوات autoCreateAccountAndAssignCourse القديمة
  function createAccount(student, p) {
    var c = student.customer || {};
    var email = c.email || ('user' + Date.now() + '@fouad.academy');
    var password = UserStructure.generateStrongPassword();
    var tries = 0;
    function pickSlug() {
      var slug = UserStructure.generateUniqueSlug(c.name || 'user');
      return udb().doc(slug).get().then(function (d) {
        if (!d.exists) return slug;
        if (++tries >= 5) throw new Error('فشل في توليد معرف فريد للحساب');
        return pickSlug();
      });
    }
    return pickSlug().then(function (slug) {
      var u = UserStructure.createNewUser(student);
      u.id = slug;
      u.personalInfo.email = email;
      u.auth.tempPassword = btoa(password);
      u.accountStatus.journeyStage = 1;
      u.accountStatus.journeyTitle = 'ملبي النداء';
      if (student.paymentInfo && student.paymentInfo.isInstallment) u.financial.totalPaid = student.paymentInfo.paidAmount || 0;
      else if (student.paymentConfirmed) u.financial.totalPaid = (student.pricing && student.pricing.finalPriceNumber) || 0;
      u.metadata = Object.assign({}, u.metadata, { source: student.telegramChatId ? 'telegram-automation' : 'admin-automation', automatedCreation: true, createdAt: nowIso() });
      if (student.telegramChatId) u.telegramChatId = String(student.telegramChatId);
      return udb().doc(slug).set(u).then(function () {
        forgetScan();
        // الباسورد يتنقل لحساب الدخول المحمي (والخزنة)، والنسخة المكتوبة تتمسح
        return (window.PasswordSafe ? PasswordSafe.secure(slug) : Promise.resolve()).catch(function (e) { console.warn('تأمين الباسورد:', e); });
      }).then(function () {
        var upd = {
          accountCreated: true, accountCreatedAt: nowIso(), accountStatus: 'active', userId: slug, userEmail: email,
          automationCompleted: { accountCreation: true, timestamp: nowIso() },
          progress: { accountSetup: 100, courseAssignment: 0, firstPayment: student.paymentConfirmed ? 100 : 0, welcomeMessage: 0, totalProgress: 50 }
        };
        if (p && p.kind === 'ask') {
          upd.needsAccountReview = FV().delete(); upd.accountReviewReason = FV().delete();
          upd.accountReviewCandidate = FV().delete(); upd.accountReviewDecision = 'different_person';
        }
        return sdb().doc(student.id).update(upd);
      }).then(function () {
        return addDualPoints(slug, 50, 'إنشاء حساب جديد (أتمتة)', 'نقاط ترحيبية عند الانضمام لمنظور الفؤاد');
      }).then(function () { return { userId: slug, isNew: true, email: email, password: password }; });
    });
  }

  function addMonthsIso(start, months) {
    if (months === 'unlimited') return '2099-12-31';
    var e = new Date(start + 'T00:00:00Z'), day = e.getUTCDate();
    e.setUTCMonth(e.getUTCMonth() + Number(months));
    if (e.getUTCDate() !== day) e.setUTCDate(0);
    return e.toISOString().split('T')[0];
  }
  function today() { return new Date().toISOString().split('T')[0]; }

  // تخصيص كورسات الحجز — نفس autoAssignCourse القديمة (المودويل الأول بالسعر، والباقي مشمول بالباقة)
  function assignModules(studentId, userId) {
    var student, modules;
    return sdb().doc(studentId).get().then(function (sd) {
      if (!sd.exists) throw new Error('لم يتم العثور على بيانات الطالب');
      student = Object.assign({ id: sd.id }, sd.data());
      modules = modulesOf(student);
      if (!modules.length) return { count: 0, modules: [] };
      return Promise.all(modules.map(function (n) { return getCourseFor(n, modules.length === 1 ? student.courseId : null); })).then(function (courses) {
        var userRef = udb().doc(userId), added = [], assignedIds = [];
        return db().runTransaction(function (tx) {
          added = []; assignedIds = [];
          return tx.get(userRef).then(function (us) {
            if (!us.exists) throw new Error('لم يتم العثور على حساب المستخدم');
            var list = ((us.data() || {}).enrollments || []).slice(), count = 0;
            modules.forEach(function (name, i) {
              var exists = list.find(function (e) {
                return e.title === name && e.dates && e.dates.endDate && new Date(e.dates.endDate) > new Date() && !(e.status && e.status.current === 'cancelled');
              });
              if (exists) return;
              var course = courses[i], cid = course ? course.id : null, months = courseMonths(course);
              var start = today(), primary = count === 0;
              var ms = Object.assign({}, student, { courseName: name, actualCourseId: cid });
              if (!primary) {
                ms.pricing = Object.assign({}, student.pricing || {}, { basePriceNumber: 0, finalPriceNumber: 0, basePrice: '0', finalPrice: '0 ج.م' });
                ms.paymentInfo = Object.assign({}, student.paymentInfo || {}, { isInstallment: false, paidAmount: 0, remainingAmount: 0, totalAmount: 0 });
              }
              var en = EnrollmentManager.createEnrollment(ms, {
                enrollmentType: 'new', startDate: start, endDate: addMonthsIso(start, months), duration: months + ' شهر',
                usePoints: false, pointsToUse: 0, notes: 'تخصيص تلقائي عبر نظام الأتمتة' + (primary ? '' : ' — مشمول ضمن الباقة'),
                isRenewal: false, automatedAssignment: true
              });
              if (!primary) en.includedInPackage = true;
              list.push(en); added.push(name); if (cid) assignedIds.push(cid); count++;
            });
            if (!count) return;
            var t = EnrollmentManager.calculateFinancialTotals(list);
            tx.update(userRef, {
              enrollments: list,
              'financial.totalPaid': t.totalPaid, 'financial.totalDue': t.totalDue,
              'financial.totalSavings': t.totalSavings, 'financial.totalOriginalPrice': t.totalOriginalPrice,
              'timestamps.updatedAt': nowIso()
            });
          });
        }).then(function () {
          return sdb().doc(studentId).update({
            courseAssigned: true, courseAssignedAt: nowIso(),
            assignedCourseId: assignedIds[0] || student.assignedCourseId || null,
            assignedCourseIds: assignedIds.length ? assignedIds : (student.assignedCourseIds || []),
            'automationCompleted.courseAssignment': true, 'progress.courseAssignment': 100, 'progress.totalProgress': 100
          });
        }).then(function () {
          if (!added.length) return;
          var paid = 0, desc = '';
          if (student.paymentInfo && student.paymentInfo.isInstallment) {
            paid = student.paymentInfo.paidAmount || 0;
            desc = 'القسط ' + (student.paymentInfo.paidInstallments || 1) + ' = ' + paid.toLocaleString('ar-EG') + ' ج.م';
          } else if (student.paymentConfirmed) {
            paid = (student.pricing && student.pricing.finalPriceNumber) || 0;
            desc = 'دفعة كاملة = ' + paid.toLocaleString('ar-EG') + ' ج.م';
          }
          var pts = Math.floor(paid / 10);
          return addDualPoints(userId, 50, 'تخصيص دورة/باقة (أتمتة)', 'تم تخصيص: ' + modules.join('، ')).then(function () {
            if (pts > 0) return addDualPoints(userId, pts, 'تخصيص باقة - ' + modules.join('، ') + ' (أتمتة)', desc);
          });
        }).then(function () { return { count: added.length, modules: added, all: modules }; });
      });
    });
  }

  // ==================== تخصيص يدوي / تغيير كورس (ملف العميل) ====================
  // opts: { courseId, title, startDate, months (رقم أو 'unlimited'), price, paid, bookingId, notes, enrollmentType, points:true }
  function assignCourse(userId, o) {
    o = o || {};
    if (!o.title) return Promise.reject(new Error('اختار الكورس'));
    var start = o.startDate || today(), months = o.months || DEFAULT_MONTHS;
    var price = Math.max(0, Number(o.price) || 0), paid = Math.min(price, Math.max(0, Number(o.paid) || 0));
    var booking = o.bookingId ? sdb().doc(o.bookingId).get().then(function (d) { return d.exists ? normalize(d.id, d.data()) : null; }) : Promise.resolve(null);
    var userRef = udb().doc(userId), en;
    return booking.then(function (b) {
      var src = b ? Object.assign({}, b) : { id: o.bookingId || null };
      src.courseName = o.title; src.actualCourseId = o.courseId || null;
      src.pricing = Object.assign({}, src.pricing || {}, { basePriceNumber: price, finalPriceNumber: price });
      src.paymentInfo = { isInstallment: false, paidAmount: paid, fullyPaid: paid >= price };
      src.paymentConfirmed = paid >= price;
      src.totalSavings = 0; src.discounts = []; src.activeOffer = null; src.coupon = null;
      return db().runTransaction(function (tx) {
        return tx.get(userRef).then(function (us) {
          if (!us.exists) throw new Error('الحساب مش موجود');
          var u = us.data() || {}, list = (u.enrollments || []).slice();
          var dup = list.find(function (e) { return e.title === o.title && e.dates && new Date(e.dates.endDate) > new Date() && !(e.status && e.status.current === 'cancelled'); });
          if (dup && !o.allowDuplicate) throw new Error('الكورس ده متخصص له وشغال لحد ' + dup.dates.endDate + '. لو عايز تمدّه استعمل «مدّ الاشتراك».');
          en = EnrollmentManager.createEnrollment(src, {
            enrollmentType: o.enrollmentType || 'new', startDate: start, endDate: addMonthsIso(start, months),
            duration: months === 'unlimited' ? 'غير محدود' : months + ' شهر', notes: o.notes || 'تخصيص يدوي من ملف العميل', isRenewal: false
          });
          en.payment.status = paid >= price ? 'paid' : paid > 0 ? 'partial' : (price === 0 ? 'paid' : 'pending');
          en.payment.paidAmount = paid; en.payment.remainingAmount = price - paid; en.payment.totalAmount = price;
          en.metadata.assignedFrom = 'client-file';
          list.push(en);
          var t = EnrollmentManager.calculateFinancialTotals(list);
          var bh = (u.bookingHistory || []).slice();
          bh.push({ id: 'booking-' + Date.now(), type: 'individual', courseId: en.courseId, courseName: en.title, bookedAt: nowIso(), source: 'admin-panel', status: 'confirmed', enrollmentCreated: true, enrollmentId: en.id, bookingFinancials: { originalPrice: price, offeredPrice: price, paidAtBooking: paid, paymentMethod: en.payment.method } });
          tx.update(userRef, {
            enrollments: list, bookingHistory: bh,
            'financial.totalPaid': t.totalPaid, 'financial.totalDue': t.totalDue,
            'financial.totalSavings': t.totalSavings, 'financial.totalOriginalPrice': t.totalOriginalPrice,
            'timestamps.updatedAt': nowIso()
          });
        });
      }).then(function () {
        if (!b) return;
        return sdb().doc(b.id).update({ courseAssigned: true, courseAssignedAt: nowIso(), assignedCourseId: o.courseId || null, 'progress.courseAssignment': 100, 'progress.totalProgress': 100 });
      }).then(function () {
        if (o.points === false) return;
        var pts = Math.floor(paid / 10);
        return addDualPoints(userId, 50, 'تخصيص دورة جديدة', 'تم تخصيص دورة: ' + o.title).then(function () {
          if (pts > 0) return addDualPoints(userId, pts, 'تخصيص دورة - ' + o.title, 'دفعة = ' + paid.toLocaleString('ar-EG') + ' ج.م');
        });
      }).then(function () { return en; });
    });
  }

  // تغيير الكورس: الاشتراك القديم بيتقفل (ملغي، مش ممسوح) وبيتعمل واحد جديد بنفس الفلوس والتواريخ
  function changeCourse(userId, enrollmentId, course, by) {
    if (!course || !course.title) return Promise.reject(new Error('اختار الكورس الجديد'));
    var ref = udb().doc(userId), made;
    return db().runTransaction(function (tx) {
      return tx.get(ref).then(function (us) {
        if (!us.exists) throw new Error('الحساب مش موجود');
        var list = ((us.data() || {}).enrollments || []).slice();
        var i = list.findIndex(function (e) { return e.id === enrollmentId; });
        if (i < 0) throw new Error('الاشتراك ده مش موجود');
        var old = list[i];
        if (old.title === course.title) throw new Error('ده نفس الكورس');
        var ts = nowIso();
        made = JSON.parse(JSON.stringify(old));
        made.id = 'enrollment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        made.courseId = course.id || null; made.title = course.title;
        made.enrollmentType = 'change'; made.previousEnrollmentId = old.id;
        made.status = { current: 'active', isActive: true, isPaused: false, isExpired: false, reason: null, updatedAt: ts };
        made.progress = { overallProgress: 0, lessonsProgress: 0, assignmentsProgress: 0, quizzesProgress: 0, milestones: [], certificates: [], badges: [] };
        made.courseInfo = Object.assign({}, made.courseInfo || {}, { completedLessons: 0, progress: 0 });
        made.metadata = Object.assign({}, made.metadata || {}, { changedFrom: old.title, changedAt: ts, changedBy: by || 'admin' });
        list[i] = Object.assign({}, old, {
          status: Object.assign({}, old.status || {}, { current: 'cancelled', isActive: false, reason: 'اتغيّر لـ ' + course.title, updatedAt: ts }),
          // الفلوس اتنقلت للاشتراك الجديد، فالقديم ما يتحسبش مرتين
          changedTo: made.id
        });
        list.push(made);
        var t = EnrollmentManager.calculateFinancialTotals(list);
        tx.update(ref, {
          enrollments: list,
          'financial.totalPaid': t.totalPaid, 'financial.totalDue': t.totalDue,
          'financial.totalSavings': t.totalSavings, 'financial.totalOriginalPrice': t.totalOriginalPrice,
          'timestamps.updatedAt': ts
        });
      });
    }).then(function () { return made; });
  }

  // ==================== رابط الدخول ورسالة الترحيب ====================
  function serverPost(path, body) {
    if (typeof botFetch !== 'function') return Promise.reject(new Error('bot-client.js مش محمّل'));
    return botFetch(BOT + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.ok === false) { var e = new Error(j.error || ('HTTP ' + r.status)); e.code = j.error; e.status = r.status; e.body = j; throw e; } return j; }); });
  }
  // رابط دخول جديد من السيرفر (القديم بيبطل). send=true: السيرفر بيبعته للعميل على التليجرام
  function loginLink(userId, send) {
    return serverPost('/client/login-link', { userId: userId, send: !!send }).then(function (j) { return j.url; }, function (e) {
      var m = { 'no-telegram': 'العميل ده مالوش تليجرام معروف', blocked: 'العميل قافل البوت', 'not-found': 'الحساب مش موجود', 'send-failed': 'التليجرام رفض الرسالة' }[e.code];
      var err = new Error(m || 'السيرفر ما ردش. جرّب تاني بعد شوية.'); err.code = e.code; err.url = e.body && e.body.url; throw err;
    });
  }
  function md(s) { return String(s == null ? '' : s).replace(/([_*`\[])/g, '\\$1'); }

  function welcomeText(o, url, wa) {
    var c = (o.student && o.student.customer) || {};
    var first = String(c.name || '').trim().split(/\s+/)[0];
    var courses = (o.modules && o.modules.length ? o.modules : [o.student && o.student.courseName].filter(Boolean));
    var lines = [];
    lines.push((first ? 'أهلاً ' + md(first) : 'أهلاً بيك') + ' 🌿');
    lines.push('');
    lines.push(o.isNew ? 'حسابك على منصة منظور الفؤاد جاهز، والكورس اتضاف لك.' : 'الكورس الجديد اتضاف لحسابك على منصة منظور الفؤاد.');
    if (courses.length) { lines.push(''); lines.push('📚 *' + (courses.length > 1 ? 'الكورسات' : 'الكورس') + ':*'); courses.forEach(function (x) { lines.push('• ' + md(x)); }); }
    lines.push('');
    lines.push('دوس على «ادخل المنصة» تحت وهتدخل على طول من غير باسورد.');
    if (o.isNew && o.email && o.password) {
      lines.push('');
      lines.push('ولو حبيت تدخل بالإيميل والباسورد:');
      lines.push('📧 `' + String(o.email).replace(/`/g, '') + '`');
      lines.push('🔑 `' + String(o.password).replace(/`/g, '') + '`');
    }
    if (wa) { lines.push(''); lines.push('💬 وفيه جروب واتساب للكورس، الزرار بتاعه تحت.'); }
    lines.push('');
    lines.push('الرابط ده بتاعك لوحدك، فما تبعتهوش لحد.');
    return lines.join('\n');
  }

  // o: { student, userId, isNew, email, password, modules }
  function sendWelcome(o) {
    var s = o.student || {}, chatId = s.telegramChatId;
    if (!chatId) return Promise.reject(new Error('الحجز ده مالوش تليجرام'));
    var mods = o.modules && o.modules.length ? o.modules : modulesOf(s);
    return Promise.all([loginLink(o.userId, false), getCourseFor(mods[0], mods.length === 1 ? s.courseId : null)]).then(function (r) {
      var url = r[0], wa = r[1] && r[1].data && r[1].data.whatsappGroupLink || null;
      var buttons = [[{ text: '⚡ ادخل المنصة', url: url }]];
      if (wa) buttons.push([{ text: '📱 جروب الواتساب', url: wa }]);
      buttons.push([{ text: '✅ دخلت تمام', callback_data: 'account_working' }]);
      buttons.push([{ text: '🆘 محتاج مساعدة في الدخول', callback_data: 'need_help_login' }]);
      return serverPost('/send-custom-message', { chatId: chatId, message: welcomeText(Object.assign({}, o, { modules: mods }), url, wa), buttons: buttons })
        .catch(function (e) { throw new Error(e.status === 403 ? 'العميل قافل البوت' : 'التليجرام ما استلمش الرسالة'); })
        .then(function () {
          var ts = nowIso();
          return sdb().doc(s.id).update({
            'automationCompleted.credentialsSent': true, 'automationCompleted.sentAt': ts,
            'automationCompleted.whatsappLinkSent': !!wa, welcomeSentAt: ts, 'progress.welcomeMessage': 100
          });
        });
    });
  }

  // نص الترحيب للواتساب (لو العميل مالوش تليجرام) — الباسورد بيبقى في الذاكرة بس
  function whatsappWelcome(o, url) {
    return welcomeText(o, url, null).replace(/[`*\\]/g, '') + '\n\n' + url;
  }

  // المعالجة الجماعية: الحجز اللي محتاج قرار بيتعلّم «مستني قرارك» ويستنى (زي القديم بالظبط)
  function markReview(p) {
    if (!p || !p.candidate) return Promise.resolve();
    return sdb().doc(p.bookingId).update({
      needsAccountReview: true,
      accountReviewReason: 'matched_existing_' + (p.candidate.how || 'saved'),
      accountReviewCandidate: p.candidate.userId,
      accountReviewAt: nowIso()
    });
  }
  function skipWelcome(bookingId) { return sdb().doc(bookingId).update({ welcomeSkipped: true, welcomeSkippedAt: nowIso() }); }

  // ==================== حجز يدوي ====================
  // للي دفع برّه البوت: بيتعمل حجز (tempBookings) وطالب (individualStudents) بنفس الرقم، فيظهر في الطابور
  // o: { name, whatsapp, email, courseName, price, plan: 'full'|'installment'|'grant', firstPayment, count, method, reference, note }
  function createManualBooking(o) {
    o = o || {};
    var name = String(o.name || '').trim(), wa = String(o.whatsapp || '').trim(), email = String(o.email || '').trim();
    if (!name) return Promise.reject(new Error('اكتب اسم العميل'));
    if (!wa && !email) return Promise.reject(new Error('اكتب رقم الواتساب أو الإيميل'));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.reject(new Error('الإيميل مش مظبوط'));
    if (!o.courseName) return Promise.reject(new Error('اختار الكورس'));
    var plan = o.plan || 'full', price = Math.max(0, Math.round(Number(o.price) || 0));
    if (plan !== 'grant' && !(price > 0)) return Promise.reject(new Error('اكتب سعر الكورس'));
    var now = nowIso(), method = o.method || (plan === 'grant' ? 'منحة كاملة 100%' : ''), ref = o.reference || 'لا يوجد';
    if (plan !== 'grant' && !method) return Promise.reject(new Error('اختار طريقة الدفع'));
    var pd;
    if (plan === 'grant') { price = 0; pd = { type: 'full_grant', totalAmount: 0, paidAmount: 0, remainingAmount: 0, fullyPaid: true, grantType: 'full' }; }
    else if (plan === 'installment') {
      var fp = Math.round(Number(o.firstPayment) || 0), n = Math.round(Number(o.count) || 0);
      if (!(fp > 0)) return Promise.reject(new Error('اكتب الدفعة الأولى'));
      if (fp >= price) return Promise.reject(new Error('الدفعة الأولى قد السعر أو أكتر — اختار «دفع كامل»'));
      if (!(n >= 1 && n <= 18)) return Promise.reject(new Error('عدد الأقساط الباقية من ١ لـ ١٨'));
      if (!window.BookingMoney) return Promise.reject(new Error('booking-money.js مش محمّل'));
      var sch = BookingMoney.buildSchedule(price, fp, n, { method: method, reference: ref });
      pd = { type: 'installment', totalAmount: price, paidAmount: fp, remainingAmount: price - fp, installmentSchedule: sch, totalInstallments: n + 1, paidInstallments: 1, nextDueDate: sch[1] ? sch[1].dueDate : null, fullyPaid: false };
    } else pd = { type: 'full', totalAmount: price, paidAmount: price, remainingAmount: 0, fullyPaid: true, paidAt: now };
    var priceText = price.toLocaleString('ar-EG') + ' ج.م';
    var ref0 = db().collection('tempBookings').doc(), id = ref0.id;
    var customer = { name: name, whatsapp: wa, phone: wa, email: email, notes: o.note || '' };
    var bookingDoc = {
      customer: customer, courseName: o.courseName, bookingType: plan === 'grant' ? 'grant_request' : 'direct', source: 'manual',
      pricing: { basePrice: priceText, basePriceNumber: price, finalPrice: priceText, finalPriceNumber: price },
      status: 'transferred', paidAt: now, paymentMethod: method, paymentReference: ref,
      paymentConfirmed: true, paymentConfirmedAt: now, paymentConfirmedBy: 'admin', paymentDetails: pd,
      createdAt: now, lastUpdated: now, manualBooking: true, manualNote: o.note || '',
      transferredAt: now, transferredTo: 'individualStudents', transferredToPage: 'bookings/creat&allow.html'
    };
    var studentDoc = Object.assign({}, bookingDoc, {
      status: 'paid', bookingSource: 'manual', isGrant: plan === 'grant',
      paymentInfo: {
        status: 'paid', paymentConfirmed: true, paymentMethod: method, paymentReference: ref, paymentDetails: pd, paidAt: now,
        paymentConfirmedAt: now, paymentConfirmedBy: 'admin', isInstallment: pd.type === 'installment', fullyPaid: !!pd.fullyPaid,
        totalAmount: pd.totalAmount, paidAmount: pd.paidAmount, remainingAmount: pd.remainingAmount,
        installmentSchedule: pd.installmentSchedule || [], nextDueDate: pd.nextDueDate || null,
        totalInstallments: pd.totalInstallments || 0, paidInstallments: pd.paidInstallments || 0
      },
      transferInfo: { transferredAt: now, transferredFrom: 'manual', transferredBy: 'admin', originalBookingId: id, displayBookingId: id.slice(-8).toUpperCase() },
      accountStatus: 'pending_creation', accountCreated: false, userId: null, courseAssigned: false,
      progress: { accountSetup: 0, courseAssignment: 0, firstPayment: 100, welcomeMessage: 0, totalProgress: 25 }
    });
    delete studentDoc.transferredTo; delete studentDoc.transferredToPage;
    return ref0.set(bookingDoc).then(function () { return sdb().doc(id).set(studentDoc); }).then(function () { return id; });
  }

  window.StudentSetup = {
    markReview: markReview,
    skipWelcome: skipWelcome,
    createManualBooking: createManualBooking,
    UserStructure: UserStructure,
    EnrollmentManager: EnrollmentManager,
    normalize: normalize,
    needsProcessing: needsProcessing,
    queueState: queueState,
    modulesOf: modulesOf,
    choiceLabel: choiceLabel,
    findExisting: findExisting,
    forgetScan: forgetScan,
    getCourseByName: getCourseByName,
    getCourseFor: getCourseFor,
    linkTempBooking: linkTempBooking,
    listCourses: listCourses,
    courseMonths: courseMonths,
    addMonthsIso: addMonthsIso,
    addDualPoints: addDualPoints,
    plan: plan,
    run: run,
    assignModules: assignModules,
    assignCourse: assignCourse,
    changeCourse: changeCourse,
    loginLink: loginLink,
    sendWelcome: sendWelcome,
    welcomeText: welcomeText,
    whatsappWelcome: whatsappWelcome,
    WELCOME_WINDOW_DAYS: WELCOME_WINDOW_DAYS
  };
})();
