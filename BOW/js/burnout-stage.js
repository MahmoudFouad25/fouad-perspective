/* ====================================================================
   منظور الفؤاد — Burnout Stage Timeline
   مرحلة الاحتراق — Timeline تفاعليّ بـ ٧ مراحل
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// المراحل السبع — من السكريبت
// ────────────────────────────────────────────────────────────────────
const BURNOUT_STAGES = [
  {
    num: 1,
    name: 'الاندفاع',
    short: 'حماس مفرط',
    desc: 'حماس شديد، رفض للحدود، إحساس "أنا قادر، أنا قويّ". مفيش انتباه للإنذارات.',
    color: '#F5D78E',
    glow: 'rgba(245, 215, 142, 0.4)',
    feedback: {
      tone: 'good',
      headline: 'إنت في بداية الطريق',
      body: 'الاندفاع ده طاقة جميلة — لكن لو ما حطّيتش لها حدود، بيستهلكك بسرعة. الانتباه دلوقتي بيوفّر عليك سنوات.'
    }
  },
  {
    num: 2,
    name: 'الإهمال',
    short: 'كل حاجة "بعدين"',
    desc: 'النوم "بعدين". الجيم "بعدين". الصحّة "بعدين". "بعدين" بقت أسلوب حياة.',
    color: '#E8B86E',
    glow: 'rgba(232, 184, 110, 0.4)',
    feedback: {
      tone: 'caution',
      headline: 'لسه بدريّ — والرجوع سهل',
      body: 'الإهمال إشارة إنّ في حاجة بدأت تتنازل. لكن في المرحلة دي، تعديلات بسيطة في الإيقاع بترجّعك بسرعة.'
    }
  },
  {
    num: 3,
    name: 'الإزاحة',
    short: 'اللوم بيخرج برّا',
    desc: 'اللوم بيخرج برّا. "الشركة هي اللي بتحمّلني فوق طاقتي". "الزحمة هي اللي مرهّقاني".',
    color: '#E89954',
    glow: 'rgba(232, 153, 84, 0.4)',
    feedback: {
      tone: 'attention',
      headline: 'وقت الصدق مع النفس',
      body: 'لمّا اللوم بيخرج لبرّا، ده دفاع — مش حقيقة. الشركة جزء من المعادلة، لكن السبب الجوهريّ جوّاك. ابدأ تنظر بصدق.'
    }
  },
  {
    num: 4,
    name: 'الانسحاب',
    short: 'العلاقات بتبرد',
    desc: 'علاقاتك بتبرد. هواياتك بتتوقّف. التليفزيون بقى صاحبك. الشغل بقى أوتوماتيكيّ.',
    color: '#E47844',
    glow: 'rgba(228, 120, 68, 0.4)',
    feedback: {
      tone: 'attention',
      headline: 'دي مرحلة الاستفاقة',
      body: 'الانسحاب من الناس مش راحة — هو إشارة إنّ شيء بدأ يتفكّك. المسار الجاي مهمّ، والحركة دلوقتي بتفرق.'
    }
  },
  {
    num: 5,
    name: 'التبلّد',
    short: 'السخرية بقت Pattern',
    desc: 'السخرية بقت ردّ فعلك التلقائيّ. الـ Cynicism سيطرت. مفيش حماس لأيّ Project جديد.',
    color: '#DC5A38',
    glow: 'rgba(220, 90, 56, 0.4)',
    feedback: {
      tone: 'serious',
      headline: 'محتاج تشخيص دقيق',
      body: 'التبلّد ما بيعالجش بـ "إجازة طويلة" — هو طبقة عميقة محتاجة عمل منظّم. الدورة مصمّمة لمن في هذه المرحلة تحديدًا.'
    }
  },
  {
    num: 6,
    name: 'الفراغ',
    short: 'لا فرح، لا حزن',
    desc: 'لا فرح، لا حزن، لا غضب. فاضي. الإنجازات ما بقتش بتلمسك. النجاح ما بقاش بيدّيك معنى.',
    color: '#C84028',
    glow: 'rgba(200, 64, 40, 0.4)',
    feedback: {
      tone: 'serious',
      headline: 'دي مرحلة خالد',
      body: 'الفراغ مش مزاج عابر — هو صرخة المحور المكبوت. التعافي ممكن، لكن محتاج عمل عميق. الدورة فيها مسار مخصّص لده.'
    }
  },
  {
    num: 7,
    name: 'الانهيار',
    short: 'الجسد أو النفس بيصرخ',
    desc: 'الجسد أو النفس بيصرخوا. أزمة قلبيّة، انهيار عصبيّ، اكتئاب إكلينيكيّ. أو اختفاء كامل.',
    color: '#9E2818',
    glow: 'rgba(158, 40, 24, 0.4)',
    feedback: {
      tone: 'serious',
      headline: 'مهمّ تشتغل بالتوازي',
      body: 'الانهيار محتاج علاج طبّيّ ونفسيّ مباشر مع طبيب نفسيّ. الدورة هتساعدك على الفهم والتعافي طويل المدى، لكن لازم تكون بالتوازي مع متخصّص.'
    }
  }
];

// ────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────
function toArabicNumBS(n) {
  const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(d => map[+d] ?? d).join('');
}

// ────────────────────────────────────────────────────────────────────
// Burnout Stage Application
// ────────────────────────────────────────────────────────────────────
const BurnoutStageApp = {
  state: {
    screen: 'intro',     // intro | selection | feedback
    selectedStage: null,
    hoveredStage: null
  },
  container: null,

  // ── Init ──
  init(host) {
    this.container = host;
    this.state = {
      screen: 'intro',
      selectedStage: null,
      hoveredStage: null
    };
    this.loadFromLocalStorage();
    this.render();
  },

  // ── Persistence ──
  saveToLocalStorage() {
    const payload = {
      ...this.state,
      participant_id: getParticipantId(),
      saved_at: Date.now()
    };
    localStorage.setItem('mfp_burnout_state', JSON.stringify(payload));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem('mfp_burnout_state');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.participant_id !== getParticipantId()) {
        localStorage.removeItem('mfp_burnout_state');
        return;
      }
      if (Date.now() - data.saved_at > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('mfp_burnout_state');
        return;
      }
      delete data.participant_id;
      delete data.saved_at;
      this.state = { ...this.state, ...data };
    } catch (e) {
      console.error('Failed to parse burnout state:', e);
    }
  },

  // ── Logic ──
  hoverStage(stageNum) {
    this.state.hoveredStage = stageNum;
    this.updateDescription();
  },

  unhoverStage() {
    this.state.hoveredStage = null;
    this.updateDescription();
  },

  async selectStage(stageNum) {
    this.state.selectedStage = stageNum;
    const stage = BURNOUT_STAGES.find(s => s.num === stageNum);

    try {
      await submitQuizResult(
        'burnout_stage',
        { stage: stageNum },
        { stage_num: stageNum, stage_name: stage.name }
      );
    } catch (err) {
      console.error('Failed to submit burnout stage:', err);
    }

    this.state.screen = 'feedback';
    this.saveToLocalStorage();
    this.render();
  },

  // ── Rendering ──
  render() {
    if (!this.container) return;
    switch (this.state.screen) {
      case 'intro':     this.renderIntro(); break;
      case 'selection': this.renderSelection(); break;
      case 'feedback':  this.renderFeedback(); break;
    }
  },

  renderIntro() {
    this.container.innerHTML = `
      <div class="bs-intro animate-scale">
        <h2 class="title-section">على Timeline الاحتراق</h2>
        <p class="subtitle" style="margin-bottom: var(--space-md);">
          الاحتراق مش حدث — هو مسار من سبع مراحل.
        </p>
        <div class="intro-points">
          <div class="intro-point">كل واحد فينا في مرحلة من السبعة</div>
          <div class="intro-point">حدّد بصدق فين إنت دلوقتي</div>
          <div class="intro-point">الإجابة ليك إنت — بياناتك آمنة</div>
        </div>
        <button id="bsStartBtn" class="cta-btn">افتح الـ Timeline</button>
      </div>
    `;

    document.getElementById('bsStartBtn').addEventListener('click', () => {
      this.state.screen = 'selection';
      this.saveToLocalStorage();
      this.render();
    });
  },

  renderSelection() {
    this.container.innerHTML = `
      <div class="bs-selection animate-fade">
        <h3 class="bs-title">إنت في أيّ مرحلة دلوقتي؟</h3>
        <p class="bs-subtitle">دوس على المرحلة اللي حاسس إنّك فيها</p>

        <div class="bs-timeline">
          ${BURNOUT_STAGES.map((s, idx) => `
            <button class="bs-stage" data-num="${s.num}"
                    style="--c: ${s.color}; --g: ${s.glow};">
              <div class="bs-stage-dot"></div>
              <div class="bs-stage-num">${toArabicNumBS(s.num)}</div>
              <div class="bs-stage-info">
                <div class="bs-stage-name">${s.name}</div>
                <div class="bs-stage-short">${s.short}</div>
              </div>
            </button>
          `).join('')}
        </div>

        <div class="bs-detail" id="bsDetail">
          <p class="bs-detail-empty">دوس على مرحلة لتشوف وصفها</p>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.bs-stage').forEach(btn => {
      const num = parseInt(btn.dataset.num, 10);

      btn.addEventListener('mouseenter', () => this.hoverStage(num));
      btn.addEventListener('mouseleave', () => this.unhoverStage());

      btn.addEventListener('click', () => {
        // عرض الوصف أوّلًا، ثم زرّ التأكيد
        this.state.hoveredStage = num;
        this.showStageDetail(num);
      });
    });
  },

  showStageDetail(num) {
    const stage = BURNOUT_STAGES.find(s => s.num === num);
    const detail = document.getElementById('bsDetail');
    if (!detail) return;

    // Highlight selected button
    this.container.querySelectorAll('.bs-stage').forEach(b => {
      b.classList.toggle('focused', parseInt(b.dataset.num) === num);
    });

    detail.innerHTML = `
      <div class="bs-detail-card animate-fade" style="--c: ${stage.color}; --g: ${stage.glow};">
        <div class="bs-detail-header">
          <span class="bs-detail-num">${toArabicNumBS(stage.num)}</span>
          <h4 class="bs-detail-name">${stage.name}</h4>
        </div>
        <p class="bs-detail-desc">${stage.desc}</p>
        <button class="cta-btn bs-confirm-btn" data-num="${num}">
          أيوه — أنا في المرحلة دي
        </button>
      </div>
    `;

    detail.querySelector('.bs-confirm-btn').addEventListener('click', () => {
      this.selectStage(num);
    });
  },

  updateDescription() {
    // Optional: light hover effect
    const num = this.state.hoveredStage;
    if (!num) return;
    // Currently used for visual focus only — handled by CSS :hover
  },

  renderFeedback() {
    const stage = BURNOUT_STAGES.find(s => s.num === this.state.selectedStage);
    const fb = stage.feedback;

    this.container.innerHTML = `
      <div class="bs-feedback tone-${fb.tone} animate-scale"
           style="--c: ${stage.color}; --g: ${stage.glow};">
        <div class="bs-feedback-mark">${toArabicNumBS(stage.num)}</div>
        <p class="bs-feedback-stage">المرحلة ${toArabicNumBS(stage.num)} — ${stage.name}</p>
        <h2 class="feedback-headline">${fb.headline}</h2>
        <p class="feedback-body">${fb.body}</p>
        <div class="feedback-divider"></div>
        <p class="feedback-cont">ارجع للزووم — هنبني الطريق سوا</p>
        <div class="pulse" style="margin-top: 1.5rem;"></div>
      </div>
    `;
  }
};
