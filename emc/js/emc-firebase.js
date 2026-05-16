// ═══════════════════════════════════════════════════════
// emc-firebase.js — Bootstrap
// يستخدم Firebase config الموجود في /js/firebase-config.js
// مع layer من localStorage كـ fallback للعرض المحلي
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Firebase Config (نفس اللي عندك) ───
  const firebaseConfig = {
    apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
    authDomain: "fouad-perspective.firebaseapp.com",
    projectId: "fouad-perspective",
    storageBucket: "fouad-perspective.firebasestorage.app",
    messagingSenderId: "1068763865336",
    appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
    measurementId: "G-RY1FYVB3Q9"
  };

  // ─── حاول تهيئة Firebase لو الـ SDK متحمّل ───
  let firebaseReady = false;
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      window.emcAuth = firebase.auth();
      window.emcFirestore = firebase.firestore();
      firebaseReady = true;
      console.log('✅ EMC Firebase initialized');
    } catch (err) {
      console.warn('⚠️ EMC Firebase failed to initialize, falling back to local store:', err);
    }
  }

  // ─── Local Store Adapter ───
  // واجهة بسيطة بتحاكي Firestore API — نفس الـ signatures
  // علشان لما ترفع على GitHub Pages مع Firebase يبقى الكود نفسه
  const STORAGE_PREFIX = 'emc_v1_';

  const LocalStore = {
    _key(coll) { return STORAGE_PREFIX + coll; },
    _read(coll) {
      try {
        return JSON.parse(localStorage.getItem(this._key(coll)) || '{}');
      } catch (e) { return {}; }
    },
    _write(coll, data) {
      localStorage.setItem(this._key(coll), JSON.stringify(data));
    },
    _now() { return new Date().toISOString(); },
    _genId() { return 'c_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4); },

    async create(coll, data, id) {
      const docs = this._read(coll);
      const docId = id || this._genId();
      docs[docId] = { ...data, id: docId, createdAt: this._now(), updatedAt: this._now() };
      this._write(coll, docs);
      return docId;
    },
    async update(coll, id, data) {
      const docs = this._read(coll);
      if (!docs[id]) throw new Error('Document not found: ' + id);
      docs[id] = { ...docs[id], ...data, updatedAt: this._now() };
      this._write(coll, docs);
      return true;
    },
    async get(coll, id) {
      const docs = this._read(coll);
      return docs[id] || null;
    },
    async list(coll) {
      const docs = this._read(coll);
      return Object.values(docs);
    },
    async remove(coll, id) {
      const docs = this._read(coll);
      delete docs[id];
      this._write(coll, docs);
      return true;
    },
    async clear(coll) {
      this._write(coll, {});
    }
  };

  // ─── الواجهة العامة ───
  // عند الرفع على GitHub Pages مع Firebase compat،
  // غيّر `mode` لـ 'firestore' هتشتغل تلقائياً
  window.EMC = window.EMC || {};
  window.EMC.config = {
    mode: firebaseReady ? 'local-with-firestore' : 'local',  // الآن: محلي. لاحقاً: firestore
    namespace: 'emc_'
  };
  window.EMC.store = LocalStore;
  window.EMC.firebaseReady = firebaseReady;

  // ─── Demo Auth (للعرض، Firebase Auth في الإنتاج) ───
  window.EMC.auth = {
    SESSION_KEY: 'emc_v1_session',
    async signIn(email, password) {
      // في الإنتاج: firebase.auth().signInWithEmailAndPassword(email, password)
      // هنا: تحقق محلي بسيط لاختبار الواجهة
      const validUsers = {
        'abdullah@emc.academy': { name: 'عبدالله عامر', role: 'super_admin', initials: 'ع.ع' },
        'admin@emc.academy': { name: 'مساعد الأكاديمية', role: 'admin', initials: 'م.أ' }
      };
      const user = validUsers[email.toLowerCase()];
      if (user && password === 'demo2026') {
        const session = { email, ...user, signedInAt: new Date().toISOString() };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return session;
      }
      throw new Error('بيانات الدخول غير صحيحة');
    },
    async signOut() {
      localStorage.removeItem(this.SESSION_KEY);
      window.location.href = './login.html';
    },
    getSession() {
      try {
        return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
      } catch (e) { return null; }
    },
    protect() {
      const session = this.getSession();
      if (!session) {
        window.location.href = './login.html';
        return null;
      }
      return session;
    }
  };

  // ─── تهيئة بيانات الديمو لو القاعدة فاضية ───
  window.EMC.seedIfEmpty = async function () {
    const existing = await LocalStore.list('emc_contacts');
    if (existing.length > 0) return;

    const sampleContacts = [
      {
        identity: {
          fullName: 'كريم سلامة', firstName: 'كريم', lastName: 'سلامة',
          title: 'مؤسس وشريك إداري', companyName: 'سلامة للأغذية',
          industry: 'manufacturing', companySize: '51_250', revenueRange: '10m_50m',
          yearsInBusiness: '10_20', country: 'EG', city: 'القاهرة', preferredLanguage: 'ar'
        },
        channels: {
          primaryEmail: 'k.salama@example.com', mobile: '+201001234567',
          whatsapp: '+201001234567', linkedinUrl: 'linkedin.com/in/ksalama',
          preferredChannel: 'whatsapp', bestContactTime: 'morning', isContactable: true, optedOutChannels: []
        },
        context: {
          source: 'referral', sourceDetails: 'إحالة من د. هشام يونس',
          firstTouchAt: '2026-04-22T10:00:00Z', lastInteractionAt: '2026-05-14T16:30:00Z',
          referrerId: '', tags: ['c_level', 'manufacturing', 'high_intent'],
          notes: 'مهتم جداً، اتفقنا على مكالمة استكشاف الأسبوع الجاي'
        },
        eosProfile: {
          currentRole: 'visionary', eosFamiliarity: 'read_traction',
          companyStage: 'scaling', ceiling: 'leadership_fracture',
          pains: ['تفكك فريق القيادة', 'صعوبة المساءلة', 'بطء اتخاذ القرار'],
          primaryComponent: 'people', goals12Months: 'بناء فريق قيادة مستقل ومضاعفة الإيرادات'
        },
        engagement: {
          emailOpens: 12, emailClicks: 5, contentConsumed: [], eventsAttended: [],
          callsCount: 1, engagementScore: 78, lastEngagedAt: '2026-05-14T16:30:00Z', temperature: 'hot'
        },
        opportunity: {
          expectedValue: 85000, closeProbability: 65, expectedCloseDate: '2026-06-15',
          objections: [], decisionRole: 'sole_decision_maker', stakeholders: ['الشريك المؤسس'],
          budgetConfirmed: 'yes', timelineUrgency: '1_3_months'
        },
        customer: { cohortId: '', paymentStatus: '', paymentAmount: 0, attendanceRate: 0, rocksCompletionRate: 0, sessionsAttended: [], assignedCoach: '' },
        outcomes: { resultsNarrative: '', metricsBefore: {}, metricsAfter: {}, nps3Month: null, nps6Month: null, nps12Month: null, testimonialStatus: 'not_requested', testimonialContent: '', caseStudyApproved: false, eosComponentsImplemented: [] },
        advocacy: { referralsCount: 0, successfulReferrals: 0, referralsValue: 0, referredContactIds: [], contentContributions: [], eventsSpoken: [], advocateLevel: '' },
        currentStage: 6, stageHistory: [
          { stage: 1, enteredAt: '2026-04-22T10:00:00Z' },
          { stage: 3, enteredAt: '2026-04-22T10:15:00Z' },
          { stage: 4, enteredAt: '2026-04-28T11:00:00Z' },
          { stage: 5, enteredAt: '2026-05-08T09:30:00Z' },
          { stage: 6, enteredAt: '2026-05-12T14:00:00Z' }
        ],
        assignedTo: 'abdullah', status: 'active', createdBy: 'abdullah@emc.academy'
      },
      {
        identity: {
          fullName: 'منى الشريف', firstName: 'منى', lastName: 'الشريف',
          title: 'الرئيس التنفيذي', companyName: 'إنوفيت للحلول الرقمية',
          industry: 'tech', companySize: '11_50', revenueRange: '1m_5m',
          yearsInBusiness: '5_10', country: 'EG', city: 'الإسكندرية', preferredLanguage: 'ar'
        },
        channels: { primaryEmail: 'mona.s@innovate.eg', mobile: '+201112345678', whatsapp: '+201112345678', linkedinUrl: '', preferredChannel: 'email', bestContactTime: 'afternoon', isContactable: true, optedOutChannels: [] },
        context: { source: 'linkedin', sourceDetails: 'بوست عن السقف القيادي', firstTouchAt: '2026-05-02T14:00:00Z', lastInteractionAt: '2026-05-15T09:00:00Z', referrerId: '', tags: ['c_level', 'tech', 'female_leader'], notes: '' },
        eosProfile: { currentRole: 'visionary', eosFamiliarity: 'heard_only', companyStage: 'early_growth', ceiling: 'operational_chaos', pains: ['فوضى في العمليات', 'كل شيء بيرجعلي'], primaryComponent: 'process', goals12Months: 'مضاعفة الفريق بدون إرهاق' },
        engagement: { emailOpens: 8, emailClicks: 3, contentConsumed: [], eventsAttended: [], callsCount: 0, engagementScore: 52, lastEngagedAt: '2026-05-15T09:00:00Z', temperature: 'warm' },
        opportunity: { expectedValue: 0, closeProbability: 0, expectedCloseDate: null, objections: [], decisionRole: '', stakeholders: [], budgetConfirmed: 'exploring', timelineUrgency: '3_6_months' },
        customer: { cohortId: '', paymentStatus: '', paymentAmount: 0, attendanceRate: 0, rocksCompletionRate: 0, sessionsAttended: [], assignedCoach: '' },
        outcomes: { resultsNarrative: '', metricsBefore: {}, metricsAfter: {}, nps3Month: null, nps6Month: null, nps12Month: null, testimonialStatus: 'not_requested', testimonialContent: '', caseStudyApproved: false, eosComponentsImplemented: [] },
        advocacy: { referralsCount: 0, successfulReferrals: 0, referralsValue: 0, referredContactIds: [], contentContributions: [], eventsSpoken: [], advocateLevel: '' },
        currentStage: 4, stageHistory: [
          { stage: 1, enteredAt: '2026-05-02T14:00:00Z' },
          { stage: 2, enteredAt: '2026-05-02T14:30:00Z' },
          { stage: 3, enteredAt: '2026-05-05T10:00:00Z' },
          { stage: 4, enteredAt: '2026-05-12T11:15:00Z' }
        ],
        assignedTo: 'abdullah', status: 'active', createdBy: 'system'
      },
      {
        identity: { fullName: 'أحمد الباز', firstName: 'أحمد', lastName: 'الباز', title: 'العضو المنتدب', companyName: 'الباز للمقاولات', industry: 'real_estate', companySize: '51_250', revenueRange: '50m_plus', yearsInBusiness: '20_plus', country: 'EG', city: 'الجيزة', preferredLanguage: 'ar' },
        channels: { primaryEmail: 'a.elbaz@elbaz.com.eg', mobile: '+201223456789', whatsapp: '+201223456789', linkedinUrl: '', preferredChannel: 'whatsapp', bestContactTime: 'evening', isContactable: true, optedOutChannels: [] },
        context: { source: 'webinar', sourceDetails: 'ندوة: السقف القيادي في الشركات العائلية', firstTouchAt: '2026-03-10T18:00:00Z', lastInteractionAt: '2026-05-10T20:00:00Z', referrerId: '', tags: ['c_level', 'family_business', 'high_value'], notes: 'حضر ندوتين، استلم عرض' },
        eosProfile: { currentRole: 'visionary', eosFamiliarity: 'partial_implementation', companyStage: 'mature', ceiling: 'leadership_transition', pains: ['الانتقال للجيل الثاني', 'مقاومة التغيير'], primaryComponent: 'vision', goals12Months: 'تنظيم انتقال القيادة لابني خلال 18 شهر' },
        engagement: { emailOpens: 24, emailClicks: 11, contentConsumed: [], eventsAttended: [], callsCount: 3, engagementScore: 88, lastEngagedAt: '2026-05-10T20:00:00Z', temperature: 'burning' },
        opportunity: { expectedValue: 120000, closeProbability: 80, expectedCloseDate: '2026-05-25', objections: [{ type: 'timing', raisedAt: '2026-05-08T00:00:00Z', status: 'addressed' }], decisionRole: 'sole_decision_maker', stakeholders: ['الابن — الوريث المرتقب'], budgetConfirmed: 'yes', timelineUrgency: 'immediate' },
        customer: { cohortId: '', paymentStatus: '', paymentAmount: 0, attendanceRate: 0, rocksCompletionRate: 0, sessionsAttended: [], assignedCoach: '' },
        outcomes: { resultsNarrative: '', metricsBefore: {}, metricsAfter: {}, nps3Month: null, nps6Month: null, nps12Month: null, testimonialStatus: 'not_requested', testimonialContent: '', caseStudyApproved: false, eosComponentsImplemented: [] },
        advocacy: { referralsCount: 0, successfulReferrals: 0, referralsValue: 0, referredContactIds: [], contentContributions: [], eventsSpoken: [], advocateLevel: '' },
        currentStage: 8, stageHistory: [{ stage: 1, enteredAt: '2026-03-10T18:00:00Z' }, { stage: 2, enteredAt: '2026-03-10T18:30:00Z' }, { stage: 3, enteredAt: '2026-03-15T10:00:00Z' }, { stage: 4, enteredAt: '2026-04-01T11:00:00Z' }, { stage: 5, enteredAt: '2026-04-15T11:00:00Z' }, { stage: 6, enteredAt: '2026-04-22T15:00:00Z' }, { stage: 7, enteredAt: '2026-05-02T14:00:00Z' }, { stage: 8, enteredAt: '2026-05-08T16:00:00Z' }],
        assignedTo: 'abdullah', status: 'active', createdBy: 'abdullah@emc.academy'
      },
      {
        identity: { fullName: 'ياسر الجندي', firstName: 'ياسر', lastName: 'الجندي', title: 'الشريك المؤسس', companyName: 'لوجستيك بلس', industry: 'services', companySize: '11_50', revenueRange: '5m_10m', yearsInBusiness: '5_10', country: 'EG', city: 'القاهرة', preferredLanguage: 'ar' },
        channels: { primaryEmail: 'yasser@logistics-plus.com', mobile: '+201334567890', whatsapp: '+201334567890', linkedinUrl: '', preferredChannel: 'whatsapp', bestContactTime: 'morning', isContactable: true, optedOutChannels: [] },
        context: { source: 'facebook', sourceDetails: 'إعلان عن الكوهورت', firstTouchAt: '2026-05-08T12:00:00Z', lastInteractionAt: '2026-05-13T15:00:00Z', referrerId: '', tags: ['mid_market'], notes: 'سجل في الندوة المجانية' },
        eosProfile: { currentRole: 'integrator', eosFamiliarity: 'never_heard', companyStage: 'early_growth', ceiling: 'strategic_fog', pains: [], primaryComponent: '', goals12Months: '' },
        engagement: { emailOpens: 3, emailClicks: 1, contentConsumed: [], eventsAttended: [], callsCount: 0, engagementScore: 28, lastEngagedAt: '2026-05-13T15:00:00Z', temperature: 'cold' },
        opportunity: { expectedValue: 0, closeProbability: 0, expectedCloseDate: null, objections: [], decisionRole: '', stakeholders: [], budgetConfirmed: '', timelineUrgency: '' },
        customer: { cohortId: '', paymentStatus: '', paymentAmount: 0, attendanceRate: 0, rocksCompletionRate: 0, sessionsAttended: [], assignedCoach: '' },
        outcomes: { resultsNarrative: '', metricsBefore: {}, metricsAfter: {}, nps3Month: null, nps6Month: null, nps12Month: null, testimonialStatus: 'not_requested', testimonialContent: '', caseStudyApproved: false, eosComponentsImplemented: [] },
        advocacy: { referralsCount: 0, successfulReferrals: 0, referralsValue: 0, referredContactIds: [], contentContributions: [], eventsSpoken: [], advocateLevel: '' },
        currentStage: 3, stageHistory: [{ stage: 1, enteredAt: '2026-05-08T12:00:00Z' }, { stage: 2, enteredAt: '2026-05-08T12:15:00Z' }, { stage: 3, enteredAt: '2026-05-08T12:30:00Z' }],
        assignedTo: 'abdullah', status: 'active', createdBy: 'system'
      },
      {
        identity: { fullName: 'هدى عبد الفتاح', firstName: 'هدى', lastName: 'عبد الفتاح', title: 'مديرة عامة', companyName: 'تيراكوتا للديكور', industry: 'retail', companySize: '11_50', revenueRange: '1m_5m', yearsInBusiness: '5_10', country: 'EG', city: 'الجيزة', preferredLanguage: 'ar' },
        channels: { primaryEmail: 'huda@terracotta.eg', mobile: '+201445678901', whatsapp: '+201445678901', linkedinUrl: '', preferredChannel: 'email', bestContactTime: 'afternoon', isContactable: true, optedOutChannels: [] },
        context: { source: 'referral', sourceDetails: 'إحالة من كريم سلامة', firstTouchAt: '2026-05-10T09:00:00Z', lastInteractionAt: '2026-05-15T11:00:00Z', referrerId: '', tags: ['c_level', 'referral'], notes: 'إحالة قوية' },
        eosProfile: { currentRole: 'visionary', eosFamiliarity: 'heard_only', companyStage: 'scaling', ceiling: 'operational_chaos', pains: ['عدم وضوح الأدوار', 'تأخر في النمو'], primaryComponent: 'people', goals12Months: '' },
        engagement: { emailOpens: 6, emailClicks: 4, contentConsumed: [], eventsAttended: [], callsCount: 1, engagementScore: 62, lastEngagedAt: '2026-05-15T11:00:00Z', temperature: 'hot' },
        opportunity: { expectedValue: 55000, closeProbability: 50, expectedCloseDate: '2026-06-30', objections: [], decisionRole: 'strong_influencer', stakeholders: ['مجلس الإدارة'], budgetConfirmed: 'exploring', timelineUrgency: '1_3_months' },
        customer: { cohortId: '', paymentStatus: '', paymentAmount: 0, attendanceRate: 0, rocksCompletionRate: 0, sessionsAttended: [], assignedCoach: '' },
        outcomes: { resultsNarrative: '', metricsBefore: {}, metricsAfter: {}, nps3Month: null, nps6Month: null, nps12Month: null, testimonialStatus: 'not_requested', testimonialContent: '', caseStudyApproved: false, eosComponentsImplemented: [] },
        advocacy: { referralsCount: 0, successfulReferrals: 0, referralsValue: 0, referredContactIds: [], contentContributions: [], eventsSpoken: [], advocateLevel: '' },
        currentStage: 5, stageHistory: [{ stage: 1, enteredAt: '2026-05-10T09:00:00Z' }, { stage: 3, enteredAt: '2026-05-10T09:15:00Z' }, { stage: 4, enteredAt: '2026-05-13T10:00:00Z' }, { stage: 5, enteredAt: '2026-05-15T11:00:00Z' }],
        assignedTo: 'abdullah', status: 'active', createdBy: 'abdullah@emc.academy'
      },
      {
        identity: { fullName: 'طارق عبد الله', firstName: 'طارق', lastName: 'عبد الله', title: 'المدير التنفيذي', companyName: 'دلتا فارما', industry: 'healthcare', companySize: '51_250', revenueRange: '10m_50m', yearsInBusiness: '10_20', country: 'EG', city: 'القاهرة', preferredLanguage: 'ar' },
        channels: { primaryEmail: 't.abdullah@deltapharma.eg', mobile: '+201556789012', whatsapp: '+201556789012', linkedinUrl: '', preferredChannel: 'email', bestContactTime: 'morning', isContactable: true, optedOutChannels: [] },
        context: { source: 'referral', sourceDetails: 'إحالة من خريج (أحمد الباز)', firstTouchAt: '2026-01-12T10:00:00Z', lastInteractionAt: '2026-05-10T14:00:00Z', referrerId: '', tags: ['c_level', 'alumni_referral'], notes: 'خريج كوهورت 2025، متابعة تطبيق' },
        eosProfile: { currentRole: 'visionary', eosFamiliarity: 'full_implementation', companyStage: 'mature', ceiling: 'growth_stall', pains: [], primaryComponent: 'data', goals12Months: 'تحسين Scorecard وزيادة الـ Rocks المنجزة' },
        engagement: { emailOpens: 32, emailClicks: 18, contentConsumed: [], eventsAttended: [], callsCount: 6, engagementScore: 72, lastEngagedAt: '2026-05-10T14:00:00Z', temperature: 'hot' },
        opportunity: { expectedValue: 0, closeProbability: 100, expectedCloseDate: '2026-02-01', objections: [], decisionRole: 'sole_decision_maker', stakeholders: [], budgetConfirmed: 'yes', timelineUrgency: 'immediate' },
        customer: { cohortId: 'cohort-2026-01', enrollmentDate: '2026-02-01', paymentStatus: 'complete', paymentAmount: 95000, attendanceRate: 92, rocksCompletionRate: 78, sessionsAttended: [], assignedCoach: 'عبدالله عامر' },
        outcomes: { resultsNarrative: 'تطبيق كامل لـ EOS بعد 90 يوم. زيادة 22% في الإيرادات.', metricsBefore: { revenue: '12M' }, metricsAfter: { revenue: '14.6M' }, nps3Month: 9, nps6Month: null, nps12Month: null, testimonialStatus: 'received', testimonialContent: 'البرنامج غير شركتي من الجذور.', caseStudyApproved: true, eosComponentsImplemented: ['vto', 'accountability_chart', 'level_10', 'rocks', 'scorecard', 'ids'] },
        advocacy: { referralsCount: 2, successfulReferrals: 1, referralsValue: 120000, referredContactIds: [], contentContributions: ['شهادة فيديو', 'حالة دراسية'], eventsSpoken: [], advocateLevel: 'active_referrer' },
        currentStage: 13, stageHistory: [],
        assignedTo: 'abdullah', status: 'active', createdBy: 'system'
      }
    ];

    for (const c of sampleContacts) {
      await LocalStore.create('emc_contacts', c);
    }

    // Seed cohort + events
    await LocalStore.create('emc_cohorts', {
      name: 'كوهورت يونيو 2026', startDate: '2026-06-15', endDate: '2026-08-30',
      capacity: 12, enrolled: 7, price: 95000, currency: 'EGP', status: 'upcoming', sessions: []
    }, 'cohort-2026-06');

    console.log('✅ Seeded EMC demo data');
  };

  // expose
  window.EMC = window.EMC;
})();
