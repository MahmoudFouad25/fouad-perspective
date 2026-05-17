/* ====================================================================
   منظور الفؤاد — Type Guess Module (v2 — Mirror-Organized)
   ────────────────────────────────────────────────────────────────────
   التغيير في v2:
   • الطبائع التسعة مرتّبة بألوان المرايا الثلاثة (مش بترتيب رقميّ)
   • كل مجموعة بـ Header يميّزها
   • Feedback يحاول استدعاء اختيارات المرايا السابقة لو موجودة
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// الطبائع التسعة — منظّمة بالمرايا الثلاث
// ────────────────────────────────────────────────────────────────────
const MIRROR_GROUPS = [
  {
    mirror: 'الاحتواء',
    mirrorSubtitle: 'بيحبس الشعور قبل ما يخرج',
    color: '#D4A24E',
    glow: 'rgba(212, 162, 78, 0.3)',
    types: [
      {
        id: 1,
        name: 'الدقيق المصلح',
        persona: 'ليلى',
        role: 'Marketing Director',
        line: 'بتراجع كل ميل ٣ مرّات. عينها على الخطأ قبل ما تشوف الصحّ.',
        detail: 'الإتقان والاستقامة',
        color: '#D4A24E',
        glow: 'rgba(212, 162, 78, 0.4)'
      },
      {
        id: 3,
        name: 'المُنجِز المؤثّر',
        persona: 'كريم',
        role: 'Sales Director',
        line: 'بيقفل ٣ Deals في اليوم. بيوصل البيت ١١ مساءً. ناجح من برّا، فاضي من جوّا.',
        detail: 'الحركة والتأثير',
        color: '#F0B859',
        glow: 'rgba(240, 184, 89, 0.4)'
      },
      {
        id: 5,
        name: 'العقل الفيّاض',
        persona: 'عمر',
        role: 'Tech Lead',
        line: 'عنده ٤ شاشات وكتب. بيختفي ساعتين، يرجع بفكرة بتغيّر المشروع.',
        detail: 'الفهم العميق والاستقلاليّة',
        color: '#5BA8B8',
        glow: 'rgba(91, 168, 184, 0.4)'
      }
    ]
  },
  {
    mirror: 'التعبير الكامل',
    mirrorSubtitle: 'بيخرج الشعور بقوّته بس مش بيمشي',
    color: '#9B7EBD',
    glow: 'rgba(155, 126, 189, 0.3)',
    types: [
      {
        id: 4,
        name: 'العميق الأصيل',
        persona: 'سلمى',
        role: 'Designer',
        line: 'بترفض كل Brief مش "حقيقيّ". ساعة بشغف، أسبوع بدون إلهام.',
        detail: 'العمق والأصالة',
        color: '#9B7EBD',
        glow: 'rgba(155, 126, 189, 0.4)'
      },
      {
        id: 6,
        name: 'الإرادة المتجسّدة',
        persona: 'طارق',
        role: 'Project Manager',
        line: 'بيسأل "ماذا لو فشل ده؟". عنده Plan B لكل خطوة. الفريق بيحبّه.',
        detail: 'الولاء والاستعداد للأسوأ',
        color: '#7B92C7',
        glow: 'rgba(123, 146, 199, 0.4)'
      },
      {
        id: 8,
        name: 'القوّة الحقيقيّة',
        persona: 'سامي',
        role: 'CEO',
        line: 'بيواجه مديريه بصراحة قاسية. بيحمي فريقه. يا تحبّه يا تخاف منه.',
        detail: 'الحماية والشجاعة',
        color: '#C84028',
        glow: 'rgba(200, 64, 40, 0.4)'
      }
    ]
  },
  {
    mirror: 'التحويل',
    mirrorSubtitle: 'بيحوّل الشعور قبل ما يصل للوعي',
    color: '#4ABEDF',
    glow: 'rgba(74, 190, 223, 0.3)',
    types: [
      {
        id: 2,
        name: 'الكريم الحنون',
        persona: 'ندى',
        role: 'HR Director',
        line: 'بتعرف عيد ميلاد كل واحد في الفريق. بتحلّ مشاكل الكلّ.',
        detail: 'العطاء والملاحظة الحانية',
        color: '#E58FA2',
        glow: 'rgba(229, 143, 162, 0.4)'
      },
      {
        id: 7,
        name: 'الحرّ المتدفّق',
        persona: 'أحمد',
        role: 'Founder',
        line: 'بدأ شركته بنار حقيقيّة. بياخد إجازة كل ٤ شهور. ميتنجاته بتلهم الفريق.',
        detail: 'الإلهام والتجدّد',
        color: '#E8543F',
        glow: 'rgba(232, 84, 63, 0.4)'
      },
      {
        id: 9,
        name: 'السلام الداخليّ',
        persona: 'هانم',
        role: 'Office Manager',
        line: 'بتحلّ كل خلاف بهدوء. لمّا تختفي يوم، الشركة كلّها بتحسّ بفجوة.',
        detail: 'التوحيد والتأليف',
        color: '#4ABEDF',
        glow: 'rgba(74, 190, 223, 0.4)'
      }
    ]
  }
];

// Flatten للوصول السريع
const TYPE_PERSONAS = MIRROR_GROUPS.flatMap(g => g.types);

// ────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────
function toArabicNumTG(n) {
  const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(d => map[+d] ?? d).join('');
}

// ────────────────────────────────────────────────────────────────────
// Type Guess Application
// ────────────────────────────────────────────────────────────────────
const TypeGuess = {
  state: {
    screen: 'intro',
    selected: [],
    notSure: false
  },
  container: null,

  init(host) {
    this.container = host;
    this.state = {
      screen: 'intro',
      selected: [],
      notSure: false
    };
    this.loadFromLocalStorage();
    this.render();
  },

  saveToLocalStorage() {
    const payload = {
      ...this.state,
      participant_id: getParticipantId(),
      saved_at: Date.now()
    };
    localStorage.setItem('mfp_typeguess_state', JSON.stringify(payload));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem('mfp_typeguess_state');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.participant_id !== getParticipantId()) {
        localStorage.removeItem('mfp_typeguess_state');
        return;
      }
      if (Date.now() - data.saved_at > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('mfp_typeguess_state');
        return;
      }
      delete data.participant_id;
      delete data.saved_at;
      this.state = { ...this.state, ...data };
    } catch (e) {
      console.error('Failed to parse typeguess state:', e);
    }
  },

  toggleType(typeId) {
    const idx = this.state.selected.indexOf(typeId);
    if (idx >= 0) {
      this.state.selected.splice(idx, 1);
    } else {
      if (this.state.selected.length >= 2) {
        this.state.selected.shift();
      }
      this.state.selected.push(typeId);
    }
    this.state.notSure = false;
    this.saveToLocalStorage();
    this.updateSelectionUI();
  },

  pickNotSure() {
    this.state.notSure = true;
    this.state.selected = [];
    this.saveToLocalStorage();
    this.confirm();
  },

  async confirm() {
    const result = this.state.notSure
      ? { not_sure: true }
      : { selected_types: this.state.selected };

    try {
      await submitQuizResult('type_guess', result, result);
    } catch (err) {
      console.error('Failed to submit type guess:', err);
    }

    this.state.screen = 'feedback';
    this.saveToLocalStorage();
    this.render();
  },

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
      <div class="tg-intro animate-scale">
        <h2 class="title-section">الإطار الكامل</h2>
        <p class="subtitle" style="margin-bottom: var(--space-md);">
          التسعة طبائع — منظّمة على المرايا التلاتة اللي عشتها.
        </p>
        <div class="intro-points">
          <div class="intro-point">شوف اللي اخترته في كل مرآة</div>
          <div class="intro-point">قارن بصدق بين الكلّ في مشهد واحد</div>
          <div class="intro-point">اختار اللي يخصّك (واحد أو اتنين)</div>
          <div class="intro-point">أو "مش متأكّد" — وده أصدق إجابة</div>
        </div>
        <button id="tgStartBtn" class="cta-btn">شوف الإطار الكامل</button>
      </div>
    `;

    document.getElementById('tgStartBtn').addEventListener('click', () => {
      this.state.screen = 'selection';
      this.saveToLocalStorage();
      this.render();
    });
  },

  // استرجاع اختيارات المرايا الثلاثة من LocalStorage
  getMirrorChoices() {
    const choices = {};
    ['mirror_containment', 'mirror_full_expression', 'mirror_transformation'].forEach(stage => {
      const saved = localStorage.getItem(`mfp_poll_${stage}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.selected) choices[stage] = data.selected;
        } catch (e) {}
      }
    });
    return choices;
  },

  renderSelection() {
    const mirrorChoices = this.getMirrorChoices();

    this.container.innerHTML = `
      <div class="tg-selection animate-fade">
        <div class="tg-header">
          <h3 class="tg-title">الإطار الكامل قدّامك</h3>
          <p class="tg-subtitle" id="tgCounter">
            <span id="tgCountText">لسه ما اخترتش حدّ</span>
          </p>
        </div>

        ${MIRROR_GROUPS.map((group, idx) => {
          // مفتاح المرحلة المقابلة
          const stageKey = ['mirror_containment', 'mirror_full_expression', 'mirror_transformation'][idx];
          const choiceId = mirrorChoices[stageKey];

          return `
            <div class="tg-mirror-group" style="--mc: ${group.color}; --mg: ${group.glow};">
              <div class="tg-mirror-header">
                <div class="tg-mirror-label">المحور ${toArabicNumTG(idx + 1)} في مرآة المشاعر</div>
                <div class="tg-mirror-name">${group.mirror}</div>
                <div class="tg-mirror-subtitle">${group.mirrorSubtitle}</div>
              </div>
              <div class="tg-mirror-cards">
                ${group.types.map(t => `
                  <button class="tg-card ${choiceId === t.persona.split(' ')[0] || (t.id === 1 && choiceId === 'leila') || (t.id === 3 && choiceId === 'kareem') || (t.id === 5 && choiceId === 'omar') || (t.id === 4 && choiceId === 'salma') || (t.id === 6 && choiceId === 'tariq') || (t.id === 8 && choiceId === 'samy') || (t.id === 2 && choiceId === 'nada') || (t.id === 7 && choiceId === 'ahmed') || (t.id === 9 && choiceId === 'hanem') ? 'previously-chosen' : ''}"
                          data-id="${t.id}"
                          style="--c: ${t.color}; --g: ${t.glow};">
                    <div class="tg-card-num">${toArabicNumTG(t.id)}</div>
                    <div class="tg-card-name">${t.name}</div>
                    <div class="tg-card-persona">${t.persona} — ${t.role}</div>
                    <div class="tg-card-line">${t.line}</div>
                    <div class="tg-card-detail">${t.detail}</div>
                    <div class="tg-card-check">✓</div>
                    <div class="tg-card-echo">صداك في المرآة دي</div>
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

        <div class="tg-actions">
          <button id="tgConfirmBtn" class="cta-btn" disabled>أكّد بصمتك الرئيسيّة</button>
          <button id="tgNotSureBtn" class="text-link-btn">مش متأكّد — ده الأصدق</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.tg-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id, 10);
        this.toggleType(id);
      });
    });

    document.getElementById('tgConfirmBtn').addEventListener('click', () => {
      if (this.state.selected.length === 0) return;
      this.confirm();
    });

    document.getElementById('tgNotSureBtn').addEventListener('click', () => {
      this.pickNotSure();
    });

    this.updateSelectionUI();
  },

  updateSelectionUI() {
    const cards = this.container.querySelectorAll('.tg-card');
    cards.forEach(card => {
      const id = parseInt(card.dataset.id, 10);
      card.classList.toggle('selected', this.state.selected.includes(id));
    });

    const counter = document.getElementById('tgCountText');
    const confirmBtn = document.getElementById('tgConfirmBtn');
    const n = this.state.selected.length;

    if (counter) {
      if (n === 0) counter.textContent = 'لسه ما اخترتش حدّ';
      else if (n === 1) counter.textContent = 'اخترت واحد — تقدر تضيف تاني لو محتار';
      else counter.textContent = 'اخترت اتنين — الأقصى';
    }

    if (confirmBtn) {
      confirmBtn.disabled = n === 0;
    }
  },

  renderFeedback() {
    let body, headline;

    if (this.state.notSure) {
      headline = 'الصدق ده شجاعة';
      body = 'لمست تلات مرايا — مرآة واحدة من سبع في الإطار الكامل. في الدورة، التشخيص الكامل بياخد ٢٠٠+ سؤال عبر السبع مرايا، لنوصل لبصمتك الفريدة من ٢٧ بصمة. اللي عملته النّهاردة بداية، مش نهاية.';
    } else {
      const types = this.state.selected.map(id =>
        TYPE_PERSONAS.find(t => t.id === id)
      );

      if (types.length === 1) {
        headline = `بصمتك أقرب لـ ${types[0].persona}`;
        body = 'الاختيار ده بناه ثلاث مقارنات داخل مرآة المشاعر. لكنّ بصمتك الكاملة تظهر في السبع مرايا — دوافع، انتباه، مشاعر، سلوك، إدراك، معتقدات، جراح. النّهاردة لمست مرآة واحدة. الدورة بتمشي في السبعة.';
      } else {
        headline = `بين ${types[0].persona} و ${types[1].persona}`;
        body = 'الحيرة بين اتنين بتكشف بنية معيّنة — واحد رئيسيّ، والتاني صدى من محور تاني. السبع مرايا في الدورة بتفصل ده بدقّة، وبتدّيك بصمتك الفريدة من ٢٧ بصمة.';
      }
    }

    this.container.innerHTML = `
      <div class="tg-feedback tone-good animate-scale">
        <div class="feedback-mark"></div>
        <h2 class="feedback-headline">${headline}</h2>
        <p class="feedback-body">${body}</p>
        <div class="feedback-divider"></div>
        <p class="feedback-cont">ارجع للزووم — جايّ الجزء الأعمق</p>
        <div class="pulse" style="margin-top: 1.5rem;"></div>
      </div>
    `;
  }
};

console.log('✅ TypeGuess ready (v2 — mirror-organized)');
