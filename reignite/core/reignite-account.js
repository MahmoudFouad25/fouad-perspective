/*
 * إنشاء حساب Reignite — reignite/core/reignite-account.js
 *
 * نفس الكود اللي كان في صفحة التسجيل الذاتي بالظبط، اتنقل هنا علشان الأدمن هو اللي يعمل الحساب
 * بعد ما يقبل الطلب (كابينة Reignite ← طلبات التسجيل). صفحة التسجيل بقت بتبعت طلب بس.
 *
 * ReigniteAccount.create(db, { name, email, whatsapp }) → { userId, token, password }
 *   - بيتأكد إن الإيميل مش مستعمل
 *   - بيعمل ملف العميل ويخصص دورة reignite (١٢ شهر) ونقاط الترحيب
 *   - الباسورد بيتولّد هنا، وبيتظبط على حساب الدخول من السيرفر (admin-set-password)
 */
(function (global) {
'use strict';
var db = null;   // بيتحدد مع كل create()

var CONFIG = { courseName: 'reignite', courseId: '', accessMonths: 12 };
/* ════════════════════════════════════════════════════════════
   🗂️ بنية المستخدم — منسوخة كما هي من صفحة الإدارة (للتوافق الكامل)
   ════════════════════════════════════════════════════════════ */
const UserStructure = {
  createNewUser: function(studentData){
    const now = new Date().toISOString();
    const customer = studentData.customer || {};
    const uniqueId = this.generateUniqueSlug(customer.name);
    return {
      id: uniqueId,
      personalInfo: {
        name: customer.name || '', title: customer.title || '', email: customer.email || '',
        whatsapp: customer.whatsapp || '', phone: customer.phone || customer.whatsapp || '',
        age: customer.age || null, gender: customer.gender || '', country: customer.country || '',
        city: customer.city || '', job: customer.job || ''
      },
      auth: {
        tempPassword: btoa(this.generateStrongPassword()), lastLogin: null, loginCount: 0,
        createdAt: now, createdBy: 'self', createdFrom: 'reignite-signup',
        lastPasswordChange: null, twoFactorEnabled: false
      },
      accountStatus: {
        status: 'active', journeyStage: 1, journeyTitle: 'ملبي النداء', journeyStars: 1, journeyProgress: 0,
        seeds: 0, fruits: 0, totalPoints: 0, verified: false, suspended: false, suspensionReason: null,
        lastActivityAt: now, accountHealth: 100, joinedAt: now, daysInSystem: 0
      },
      enrollments: [],
      financial: {
        totalPaid: 0, totalDue: 0, totalSavings: 0, totalOriginalPrice: 0,
        paymentHistory: [], preferredPaymentMethods: customer.paymentMethods || [],
        creditLimit: 0, creditUsed: 0
      },
      journeyPoints: { balance: 0, stage: 1, stageTitle: 'ملبي النداء', stageStars: 1, history: [], lastUpdated: now, lifetime: 0 },
      walletPoints: { balance: 0, used: 0, lifetime: 0, history: [], lastUpdated: now, conversionRate: 0.1, minRedemption: 100 },
      referralProgram: {
        myCode: this.generateReferralCode(customer.name), status: 'inactive', usageCount: 0,
        earnings: { cashRewards: 0, pointsEarned: 0, freeCoursesEarned: 0, totalValue: 0 },
        referredUsers: [], referredBy: null
      },
      bookingHistory: [],
      engagement: { coursesStarted: 0, coursesCompleted: 0, averageProgress: 0, lastCourseAccess: null, totalStudyHours: 0, certificates: [], achievements: [] },
      communication: { preferences: { email: true, whatsapp: true, sms: false }, lastContacted: null, messagesReceived: 0, unsubscribed: false },
      metadata: { originalStudentDocId: studentData.id, dataCompleteness: this.calculateDataCompleteness(studentData), importSource: 'self-signup', tags: [], customFields: {}, internalNotes: '' },
      timestamps: { createdAt: now, updatedAt: now, lastModifiedBy: 'self', deletedAt: null }
    };
  },
  generateUniqueSlug: function(name){
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    const isArabic = /[\u0600-\u06FF]/.test(name || '');
    if (isArabic && name){
      const map = {'ا':'a','أ':'a','إ':'e','آ':'aa','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'h','ئ':'e','ء':'a','ؤ':'o'};
      let latin = '';
      for (let ch of name){ if (map[ch]) latin += map[ch]; else if (ch === ' ') latin += '-'; }
      latin = latin.toLowerCase().slice(0, 15);
      if (latin.length < 3) latin = 'user';
      return `${latin}-${timestamp}-${random}`;
    } else {
      const clean = (name || 'user').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').slice(0, 15);
      if (!clean || clean.length < 3) return `user-${timestamp}-${random}`;
      return `${clean}-${timestamp}-${random}`;
    }
  },
  generateStrongPassword: function(){
    const sets = { upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower:'abcdefghijklmnopqrstuvwxyz', numbers:'0123456789', special:'!@#$%^&*+-=' };
    let p = '';
    p += sets.upper[Math.floor(Math.random()*26)];
    p += sets.lower[Math.floor(Math.random()*26)];
    p += sets.numbers[Math.floor(Math.random()*10)];
    p += sets.special[Math.floor(Math.random()*11)];
    const all = Object.values(sets).join('');
    for (let i=4; i<14; i++) p += all[Math.floor(Math.random()*all.length)];
    return p.split('').sort(()=>Math.random()-0.5).join('');
  },
  generateReferralCode: function(name){
    const cn = (name || 'USER').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);
    const year = new Date().getFullYear();
    const r = Math.floor(Math.random()*1000).toString().padStart(3,'0');
    return `${cn}${year}${r}`;
  },
  calculateDataCompleteness: function(studentData){
    const c = studentData.customer || {};
    const req = ['name','email','whatsapp','age','gender','country','city','job'];
    let filled = 0; req.forEach(f=>{ if (c[f] && c[f] !== '') filled++; });
    const pct = Math.round((filled/req.length)*100);
    return { percentage: pct, isComplete: pct === 100, missingFields: req.filter(f=>!c[f]) };
  }
};

/* ════════════════════════════════════════════════════════════
   📚 مدير التخصيص — منسوخ كما هو من صفحة الإدارة
   ════════════════════════════════════════════════════════════ */
const EnrollmentManager = {
  getCourseIdByName: async function(courseName){
    if (!courseName) return null;
    try{
      const snap = await db.collection('courses').where('title','==',courseName).limit(1).get();
      if (!snap.empty) return snap.docs[0].id;
      const slugSnap = await db.collection('courses').where('slug','==',courseName.toLowerCase().replace(/\s+/g,'-')).limit(1).get();
      if (!slugSnap.empty) return slugSnap.docs[0].id;
      return null;
    }catch(e){ console.error('getCourseIdByName', e); return null; }
  },
  createEnrollment: function(studentData, courseSettings){
    const now = new Date().toISOString();
    const enrollmentId = `enrollment-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    return {
      id: enrollmentId,
      courseId: studentData.actualCourseId || studentData.courseId || null,
      title: studentData.courseName || 'دورة غير محددة',
      type: studentData.journey?.type || 'individual',
      enrollmentType: courseSettings.enrollmentType || 'new',
      previousEnrollmentId: courseSettings.previousEnrollmentId || null,
      dates: { enrolledAt: now, startDate: courseSettings.startDate, endDate: courseSettings.endDate, lastAccessedAt: null, completedAt: null, expiredAt: null, renewedAt: courseSettings.isRenewal ? now : null },
      courseInfo: { instructor: studentData.instructor || 'كوتش محمود فؤاد', category: studentData.category || 'تطوير شخصي', level: studentData.experience || 'beginner', duration: courseSettings.duration || '6 أشهر', totalLessons: 0, completedLessons: 0, progress: 0 },
      pricing: {
        originalPrice: studentData.pricing?.basePriceNumber || 0, finalPrice: studentData.pricing?.finalPriceNumber || 0, currency: 'EGP',
        discounts: this.processDiscounts(studentData), totalDiscountAmount: studentData.totalSavings || 0, totalDiscountPercentage: this.calculateDiscountPercentage(studentData),
        activeOffer: null, coupon: null
      },
      payment: {
        method: this.determinePaymentMethod(studentData), status: this.determinePaymentStatus(studentData),
        totalAmount: studentData.pricing?.finalPriceNumber || 0, paidAmount: this.calculatePaidAmount(studentData), remainingAmount: this.calculateRemainingAmount(studentData),
        firstPaymentDate: studentData.paymentConfirmed ? now : null, lastPaymentDate: null, fullyPaidDate: null,
        installments: this.createInstallmentSystem(studentData),
        paymentDetails: { reference: null, method: null, gateway: null, transactionId: null, receipt: null }
      },
      progress: { overallProgress: 0, lessonsProgress: 0, assignmentsProgress: 0, quizzesProgress: 0, milestones: [], certificates: [], badges: [] },
      metadata: { originalBookingId: studentData.id, transferredFrom: 'reignite-signup', notes: courseSettings.notes || '', tags: [], customFields: {} },
      enrollmentFormData: { expectations: '', applicationPlan: '', experience: '', source: 'reignite-signup', notes: '', submittedAt: now },
      status: { current: 'active', isActive: true, isPaused: false, isExpired: false, reason: null, updatedAt: now }
    };
  },
  processDiscounts: function(){ return []; },
  calculateDiscountPercentage: function(){ return 0; },
  determinePaymentMethod: function(){ return 'free'; },
  calculatePaidAmount: function(){ return 0; },
  calculateRemainingAmount: function(){ return 0; },
  determinePaymentStatus: function(){ return 'free'; },
  createInstallmentSystem: function(){ return null; },
  calculateFinancialTotals: function(enrollments){
    let t = { totalPaid:0, totalDue:0, totalSavings:0, totalOriginalPrice:0, activeCourses:0, completedCourses:0 };
    enrollments.forEach(e=>{
      t.totalPaid += e.payment.paidAmount || 0; t.totalDue += e.payment.remainingAmount || 0;
      t.totalSavings += e.pricing.totalDiscountAmount || 0; t.totalOriginalPrice += e.pricing.originalPrice || 0;
      if (e.status.current === 'active') t.activeCourses++; else if (e.status.current === 'completed') t.completedCourses++;
    });
    return t;
  }
};

/* توكن الدخول السريع — نفس صياغة صفحة الإدارة */
function generateSecureToken(){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i=0;i<64;i++) token += chars.charAt(Math.floor(Math.random()*chars.length));
  return token + '_' + Date.now();
}


async function create(dbIn, req) {
  db = dbIn;
  var name = String(req.name || '').trim();
  var email = String(req.email || '').trim().toLowerCase();
  var whatsapp = String(req.whatsapp || '').replace(/[^0-9]/g, '');
  if (!email) throw new Error('الطلب ناقصه إيميل');

  var dup = await db.collection('users').where('personalInfo.email', '==', email).limit(1).get();
  if (!dup.empty) { var e = new Error('الإيميل ده عنده حساب بالفعل'); e.code = 'exists'; e.userId = dup.docs[0].id; throw e; }

  var courseId = CONFIG.courseId || await EnrollmentManager.getCourseIdByName(CONFIG.courseName);
  var today = new Date().toISOString().split('T')[0];
  var endDate;
  if (CONFIG.accessMonths === 0) endDate = '2099-12-31';
  else { var d = new Date(); d.setMonth(d.getMonth() + CONFIG.accessMonths); endDate = d.toISOString().split('T')[0]; }

  var finalName = name || email.split('@')[0];
  var studentData = {
    id: 'self-' + Date.now(),
    customer: { name: finalName, email: email, whatsapp: whatsapp, phone: whatsapp },
    courseName: CONFIG.courseName,
    actualCourseId: courseId,
    pricing: { basePriceNumber: 0, finalPriceNumber: 0, basePrice: '0', finalPrice: 'مجانًا' },
    paymentConfirmed: false,
    journey: { type: 'individual' }
  };

  var slug = UserStructure.generateUniqueSlug(finalName), tries = 0;
  while (tries < 5) { var ex = await db.collection('users').doc(slug).get(); if (!ex.exists) break; slug = UserStructure.generateUniqueSlug(finalName); tries++; }

  var token = generateSecureToken();
  var password = UserStructure.generateStrongPassword();
  var now = new Date().toISOString();
  var newUser = UserStructure.createNewUser(studentData);
  newUser.id = slug;
  newUser.personalInfo.name = finalName;
  newUser.personalInfo.email = email;
  newUser.auth.tempPassword = null;                 // الباسورد بيتظبط من السيرفر بعد الإنشاء
  newUser.auth.telegramAutoLoginToken = token;
  newUser.auth.tokenGeneratedAt = now;

  var welcome = { amount: 50, reason: 'إنشاء حساب جديد (طلب تسجيل Reignite)', description: 'نقاط ترحيبية عند الانضمام لمنظور الفؤاد', timestamp: now };
  newUser.journeyPoints.balance = 50; newUser.journeyPoints.lifetime = 50; newUser.journeyPoints.history = [Object.assign({}, welcome, { type: 'journey' })];
  newUser.walletPoints.balance = 50; newUser.walletPoints.lifetime = 50; newUser.walletPoints.history = [Object.assign({}, welcome, { type: 'wallet' })];
  newUser.metadata.source = 'reignite-request';
  newUser.metadata.automatedCreation = false;

  var enrollment = EnrollmentManager.createEnrollment(studentData, {
    enrollmentType: 'new', startDate: today, endDate: endDate,
    duration: CONFIG.accessMonths === 0 ? 'غير محدود' : (CONFIG.accessMonths + ' شهر'),
    notes: 'طلب تسجيل — دورة Reignite (اتقبل من الأدمن)', isRenewal: false
  });
  newUser.enrollments = [enrollment];
  var totals = EnrollmentManager.calculateFinancialTotals([enrollment]);
  newUser.financial.totalPaid = totals.totalPaid;
  newUser.financial.totalDue = totals.totalDue;
  newUser.financial.totalSavings = totals.totalSavings;
  newUser.financial.totalOriginalPrice = totals.totalOriginalPrice;

  await db.collection('users').doc(slug).set(newUser);
  return { userId: slug, token: token, password: password, name: finalName, email: email, whatsapp: whatsapp };
}

global.ReigniteAccount = { create: create, CONFIG: CONFIG };
})(window);
