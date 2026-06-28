// ============================================
// صفحة الاستثمار — منطق الحاسبة الذكية
// ============================================

// أسعار افتراضية (يمكن تعديلها)
const PRICES = {
  'part1':         { base: 3400, name: 'الجزء الأول مسجَّل',           sub: 'اكتشاف المعجزة' },
  'full':          { base: 9000, name: 'الباقة الكاملة',                sub: 'اكتشاف + احتضان المعجزة' },
  'part2-alumni':  { base: 6700, name: 'الجزء الثاني · للمجموعة السابقة', sub: 'احتضان المعجزة' }
};

const OFFER_PCT = 20;          // عرض المبادرات
const CASH_PCT = 10;           // خصم الدفع الكامل الإضافي
const ALUMNI_LOYALTY_PCT = 30; // خصم تكريمي للمجموعة السابقة (إضافي للسعر الأساسي)

const COUPONS = {
  'HUDN10': { pct: 10, label: 'HUDN10' },
  'WARM15': { pct: 15, label: 'WARM15' },
  'MOTHER': { pct: 12, label: 'MOTHER' }
};

// قائمة الأسئلة الشائعة لصفحة التسعير
const pricingFaqs = [
  {
    q: 'ما الفرق بين الباقة الكاملة وشراء الجزأين منفصلين؟',
    a: 'الباقةُ الكاملة تمنحكِ خصماً يصل إلى ٢٥٪ مقارنةً بشراء الجزأين منفصلين. كما تحصلين على كلّ الأدوات الذكيّة (رفيق الجوهر، خريطة المرآة، رصد نقاط القوة) ومجتمع المشتركات الدائم، ووصولٍ مدى الحياة. هي الخيارُ الأكثرُ قيمةً على المدى الطويل.'
  },
  {
    q: 'لماذا لا يمكنني شراء الجزء الثاني فقط؟',
    a: 'لأنّ الجزء الثاني مبنيٌّ بالكامل على فهم الطبائع التسعة ونقاط القوة الـ ٨١ التي تتعلّمينها في الجزء الأول. بدون هذا الأساس، لن تستفيدي من تطبيقات الجزء الثاني. الاستثناءُ الوحيد: إذا كنتِ من المجموعة السابقة التي حضرت الجزء الأول معنا، فيمكنكِ التسجيل في الجزء الثاني مباشرةً بسعرٍ تكريميّ خاص.'
  },
  {
    q: 'هل أستطيع الترقية لاحقاً من الجزء الأول للباقة الكاملة؟',
    a: 'بالتأكيد. في أيّ وقتٍ تقرّرين فيه الترقية، سنحسب لكِ ما دفعتيه في الجزء الأول، وتدفعين الفارق فقط. لا خسارةَ على الإطلاق.'
  },
  {
    q: 'ما هي طرق الدفع المتاحة؟',
    a: 'داخل مصر: فودافون كاش، إنستاباي، التحويل البنكي. من الخارج: PayPal، Wise، Western Union. يمكنكِ الدفعُ كاملاً أو على دفعتين أو ثلاث دفعاتٍ بدون أيّ رسومٍ إضافيّة.'
  },
  {
    q: 'ماذا لو كان المبلغ صعباً عليّ؟',
    a: 'اضغطي على زرّ "أحتاج دعماً أكبر" في الحاسبة. لدينا خياراتٌ متعدّدة: زيادةُ عدد الأقساط حتى ٦ دفعات، خصوماتٌ إضافيّةٌ حتى ٥٠٪ للحالات الخاصّة، ومنحٌ كاملةٌ لحالاتٍ مستحقّة. طلبكِ يُعامَل بسرّيّةٍ تامّةٍ وكرامةٍ كاملة.'
  },
  {
    q: 'متى يبدأ الجزء الثاني الحضوري؟',
    a: 'الجزءُ الثاني سيبدأ في شهر ٧ (يوليو) — التواريخُ الدقيقةُ تُعلَن للمسجَّلات قبل أسبوعين على الأقلّ. اللقاءاتُ تكون مساءً بتوقيت القاهرة لتناسب الأمّهات العاملات. كلُّ اللقاءاتُ تُسجَّل، فلن تخسري شيئاً لو لم تستطيعي الحضور.'
  },
  {
    q: 'لو لم أتمكّن من حضور لقاءٍ حيّ، هل سأخسره؟',
    a: 'أبداً. كلُّ اللقاءات الحيّةُ تُسجَّل، وتحصلين على رابط التسجيل خلال ٢٤ ساعةً من انتهاء اللقاء. تستطيعين مشاهدته في أيِّ وقت، وتبقى التسجيلاتُ متاحةً لكِ دائماً مع الباقة الكاملة.'
  },
  {
    q: 'متى أحصل على الوصول للمحتوى بعد الدفع؟',
    a: 'الجزء الأول (المسجَّل): وصولٌ فوريٌّ خلال دقائقَ من تأكيد الدفع. الجزء الثاني (الحضوري): تحصلين على لينك مجتمع المشتركات فوراً، وروابط اللقاءات قبل كلّ لقاءٍ بـ ٢٤ ساعة.'
  },
  {
    q: 'هل يمكن لزوجي أن يشترك معي بسعرٍ واحد؟',
    a: 'نعم! العائلةُ الواحدةُ تشترك بحسابٍ واحد. زوجكِ يستطيع حضور كلّ اللقاءات معكِ ومشاهدة كلّ المحتوى من نفس الحساب. نشجّع بشدّةٍ مشاركة الأب لأنّ الحضنَ الأعمقَ يحتاج طرفَين.'
  },
  {
    q: 'كيف يعمل ضمان الاسترداد ٧ أيام؟',
    a: 'خلال أوّل ٧ أيامٍ من بدء الدورة، إن شعرتِ أنّ المحتوى لا يناسبكِ، راسلينا على الواتساب وسنُعيدُ المبلغ كاملاً خلال ٧ أيام عمل. بدون استجواب، بدون تعقيدات، بدون أسئلةٍ محرجة. ثقتُكِ تستحقُّ ضمانكِ.'
  }
];

// ============================================
// تحويل الأرقام للعربية الشرقية
// ============================================
function toAr(n) {
  const map = { 0:'٠',1:'١',2:'٢',3:'٣',4:'٤',5:'٥',6:'٦',7:'٧',8:'٨',9:'٩' };
  return String(n).replace(/\d/g, d => map[d]);
}
function formatPrice(n) {
  // 3-digit grouping with Arabic thousand separator
  const s = Math.round(n).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '٬';
    out += s[i];
  }
  return toAr(out);
}

// ============================================
// حالة الحاسبة
// ============================================
const state = {
  pack: 'full',
  pay: 'cash',       // 'cash' | 'two' | 'three'
  coupon: null,      // {pct, label} | null
  userState: null    // 'new' | 'alumni' | 'starter'
};

// ============================================
// حساب السعر
// ============================================
function compute() {
  const p = PRICES[state.pack];
  const base = p.base;
  let after = base;

  // عرض المبادرات
  const offer = Math.round(base * OFFER_PCT / 100);
  after -= offer;

  // خصم الدفع الكامل
  let cash = 0;
  if (state.pay === 'cash') {
    cash = Math.round(after * CASH_PCT / 100);
    after -= cash;
  }

  // كود الخصم
  let coupon = 0;
  if (state.coupon) {
    coupon = Math.round(after * state.coupon.pct / 100);
    after -= coupon;
  }

  const total = Math.max(0, Math.round(after / 10) * 10);
  const saved = base - total;

  return { base, offer, cash, coupon, total, saved, packInfo: p };
}

// ============================================
// تحديث النتائج في الـ DOM
// ============================================
function render() {
  const r = compute();

  // المدخلات
  document.querySelectorAll('[data-set-pack]').forEach(b => {
    b.classList.toggle('on', b.dataset.setPack === state.pack);
  });
  document.querySelectorAll('[data-set-pay]').forEach(b => {
    b.classList.toggle('on', b.dataset.setPay === state.pay);
  });

  // اسم الباقة
  document.getElementById('rPackName').textContent = r.packInfo.name;
  document.getElementById('rPackSub').textContent = r.packInfo.sub;

  // الأرقام
  document.getElementById('rBase').textContent = formatPrice(r.base);
  document.getElementById('rOffer').textContent = formatPrice(r.offer);
  document.getElementById('rCash').textContent = formatPrice(r.cash);
  document.getElementById('rCoupon').textContent = formatPrice(r.coupon);
  document.getElementById('rTotal').textContent = formatPrice(r.total);
  document.getElementById('rSaved').textContent = r.saved > 0
    ? `وفّرتِ ${formatPrice(r.saved)} ج.م!`
    : '';

  // إظهار/إخفاء الصفوف
  document.getElementById('rCashRow').classList.toggle('hidden', state.pay !== 'cash');
  document.getElementById('rCouponRow').classList.toggle('hidden', !state.coupon);
  if (state.coupon) {
    document.getElementById('rCouponCode').textContent = state.coupon.label;
  }

  // التقسيط
  const stripEl = document.getElementById('installmentsStrip');
  const infoEl = document.getElementById('installmentsInfo');
  if (state.pay === 'two' || state.pay === 'three') {
    const n = state.pay === 'two' ? 2 : 3;
    const per = Math.round(r.total / n / 10) * 10;
    stripEl.classList.add('show');
    document.getElementById('iCount').textContent = toAr(n);
    document.getElementById('iPer').textContent = formatPrice(per);

    infoEl.style.display = 'flex';
    infoEl.innerHTML = `
      <div class="ii-row"><span>الدفعة الأولى (الآن)</span><span class="eastern-num">${formatPrice(per)} ج.م</span></div>
      ${Array.from({length: n - 1}).map((_, i) => `
        <div class="ii-row"><span>الدفعة ${toAr(i + 2)} · بعد ${toAr((i + 1) * 30)} يوم</span><span class="eastern-num">${formatPrice(per)} ج.م</span></div>
      `).join('')}
    `;
  } else {
    stripEl.classList.remove('show');
    infoEl.style.display = 'none';
    infoEl.innerHTML = '';
  }

  // Nudge
  const nudge = document.getElementById('nudge');
  if (state.pay === 'three' || state.pay === 'two') {
    nudge.classList.add('show');
  } else {
    nudge.classList.remove('show');
  }

  // Sticky CTA على الموبايل
  const sticky = document.getElementById('stickyCta');
  if (sticky) {
    document.getElementById('stickyTotal').textContent = formatPrice(r.total) + ' ج.م';
  }

  // Modal summary
  const mTotal = document.getElementById('mTotal');
  if (mTotal) {
    mTotal.textContent = formatPrice(r.total);
    document.getElementById('mPackName').textContent = r.packInfo.name;
    const planLabel = state.pay === 'cash' ? 'دفعة كاملة' : (state.pay === 'two' ? 'دفعتان' : 'ثلاث دفعات');
    document.getElementById('mPlan').textContent = planLabel;
  }
}

// ============================================
// FAQ — بناء قائمة أسئلة التسعير
// ============================================
function renderPricingFaqs() {
  const list = document.getElementById('faqListPricing');
  if (!list) return;
  list.innerHTML = pricingFaqs.map((f, i) => `
    <div class="faq-item">
      <div class="faq-q">
        <div class="faq-q-num eastern-num">${toAr(String(i + 1).padStart(2, '0'))}.</div>
        <div class="faq-q-text">${f.q}</div>
        <button class="faq-toggle" aria-label="فتح">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="faq-a"><div class="faq-a-inner">${f.a}</div></div>
    </div>
  `).join('');

  list.querySelectorAll('.faq-item').forEach(el => {
    el.querySelector('.faq-q').addEventListener('click', () => el.classList.toggle('open'));
  });
}

// ============================================
// العدّ التنازلي للعرض النشط
// ============================================
function setupCountdown() {
  // اضبط نهاية العرض على ٧ أيام من الآن (ثابت داخل الجلسة)
  let target = Number(localStorage.getItem('hudn-offer-end'));
  if (!target || target < Date.now()) {
    target = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('hudn-offer-end', String(target));
  }

  function tick() {
    const left = Math.max(0, target - Date.now());
    const d = Math.floor(left / (1000 * 60 * 60 * 24));
    const h = Math.floor((left / (1000 * 60 * 60)) % 24);
    const m = Math.floor((left / (1000 * 60)) % 60);
    const s = Math.floor((left / 1000) % 60);
    const set = (sel, v) => {
      const el = document.querySelector(`[data-cd="${sel}"]`);
      if (el) el.textContent = toAr(String(v).padStart(2, '0'));
    };
    set('d', d); set('h', h); set('m', m); set('s', s);
  }
  tick();
  setInterval(tick, 1000);
}

// ============================================
// Modals
// ============================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(el) {
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================
// اختيار الباقة من البطاقة → الانتقال للحاسبة
// ============================================
function setupPackPicker() {
  document.querySelectorAll('[data-pick-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.pack = btn.dataset.pickPack;
      render();
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-set-pack]').forEach(b => {
    b.addEventListener('click', () => {
      state.pack = b.dataset.setPack;
      render();
    });
  });

  document.querySelectorAll('[data-set-pay]').forEach(b => {
    b.addEventListener('click', () => {
      state.pay = b.dataset.setPay;
      render();
    });
  });
}

// ============================================
// كود الخصم
// ============================================
function setupCoupon() {
  const input = document.getElementById('couponInput');
  const apply = document.getElementById('couponApply');
  const msg = document.getElementById('couponMsg');

  apply.addEventListener('click', () => {
    const code = (input.value || '').trim().toUpperCase();
    if (!code) { msg.textContent = ''; msg.className = 'coupon-msg'; return; }
    const c = COUPONS[code];
    if (c) {
      state.coupon = c;
      msg.textContent = `✓ تمّ تطبيق خصم ${toAr(c.pct)}٪ بنجاح`;
      msg.className = 'coupon-msg ok';
    } else {
      state.coupon = null;
      msg.textContent = '✗ الكود غير صحيح';
      msg.className = 'coupon-msg bad';
    }
    render();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); apply.click(); }
  });
}

// ============================================
// مسارات الزائرة
// ============================================
function setupPathPicker() {
  const paths = document.querySelectorAll('.path[data-state]');
  paths.forEach(p => {
    p.addEventListener('click', () => {
      const s = p.dataset.state;
      paths.forEach(x => x.classList.toggle('active', x === p));
      document.body.classList.remove('state-new', 'state-alumni', 'state-starter');
      document.body.classList.add('state-' + s);
      state.userState = s;

      // اضبط الباقة الافتراضية ومدخل الحاسبة
      const packPicker = document.getElementById('packPicker');
      if (s === 'new') {
        state.pack = 'full';
        document.getElementById('packsTitle').textContent = 'ثلاث باقاتٍ أمامكِ — أيُّها يناسبكِ؟';
        document.getElementById('packsSub').textContent = 'الباقةُ الكاملةُ هي الأنسبُ لمن تبدأ من الصفر';
        // أظهر كل أزرار الباقة في الحاسبة
        packPicker.querySelectorAll('.pill-opt').forEach(b => b.style.display = '');
      } else if (s === 'alumni') {
        state.pack = 'part2-alumni';
        document.getElementById('packsTitle').textContent = 'أهلاً بكِ من جديد · رحلةُ الاحتضان تنتظركِ';
        document.getElementById('packsSub').textContent = 'سعرٌ تكريميٌّ خاصٌّ للمجموعة السابقة — اعترافاً بثقتكِ';
        // أخفِ أزرار الباقات الأخرى في الحاسبة
        packPicker.querySelectorAll('.pill-opt').forEach(b => {
          b.style.display = b.dataset.setPack === 'part2-alumni' ? '' : 'none';
        });
      } else if (s === 'starter') {
        state.pack = 'part1';
        document.getElementById('packsTitle').textContent = 'ابدئي رحلتكِ بالاكتشاف';
        document.getElementById('packsSub').textContent = 'الجزءُ الأولُ رحلةٌ كاملةٌ بذاتها — مع إمكانية الترقية لاحقاً';
        packPicker.querySelectorAll('.pill-opt').forEach(b => {
          b.style.display = b.dataset.setPack === 'part1' ? '' : 'none';
        });
      }

      render();

      // مرّري الزائرة للأسفل لتشاهد الباقات
      setTimeout(() => {
        document.getElementById('packs').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    });
  });
}

// ============================================
// أزرار الـ Modal
// ============================================
function setupModals() {
  document.getElementById('grabBtn').addEventListener('click', () => openModal('bookModal'));
  document.getElementById('supportBtn').addEventListener('click', () => openModal('supportModal'));

  document.querySelectorAll('[data-close-modal]').forEach(b => {
    b.addEventListener('click', () => closeModal(b.closest('.modal-back')));
  });
  document.querySelectorAll('.modal-back').forEach(back => {
    back.addEventListener('click', e => {
      if (e.target === back) closeModal(back);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-back.open').forEach(closeModal);
    }
  });

  // تبديل لدفعة كاملة من الـ nudge
  document.getElementById('switchToCash').addEventListener('click', e => {
    e.preventDefault();
    state.pay = 'cash';
    render();
  });
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderPricingFaqs();
  setupCountdown();
  setupPackPicker();
  setupCoupon();
  setupPathPicker();
  setupModals();
  render();
});
