/* ====================================================================
   منظور الفؤاد — Type Guess Module
   مرحلة حدس الطابع — تسع شخصيّات حقيقيّة من السكريبت
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// الطبائع التسعة — كل واحدة بشخصيّتها من السكريبت
// ────────────────────────────────────────────────────────────────────
const TYPE_PERSONAS = [
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
    id: 5,
    name: 'العقل الفيّاض',
    persona: 'عمر',
    role: 'Tech Lead',
    line: 'عنده ٤ شاشات وكتب. بيختفي ساعتين، يرجع بفكرة بتغيّر المشروع.',
    detail: 'الفهم العميق والاستقلاليّة',
    color: '#5BA8B8',
    glow: 'rgba(91, 168, 184, 0.4)'
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
    id: 8,
    name: 'القوّة الحقيقيّة',
    persona: 'سامي',
    role: 'CEO',
    line: 'بيواجه مديريه بصراحة قاسية. بيحمي فريقه. يا تحبّه يا تخاف منه.',
    detail: 'الحماية والشجاعة',
    color: '#C84028',
    glow: 'rgba(200, 64, 40, 0.4)'
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
];

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
    screen: 'intro',     // intro | selection | feedback
    selected: [],         // Array of type IDs (max 2)
    notSure: false
  },
  container: null,

  // ── Init ──
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

  // ── Persistence ──
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

  // ── Logic ──
  toggleType(typeId) {
    const idx = this.state.selected.indexOf(typeId);
    if (idx >= 0) {
      // إلغاء الاختيار
      this.state.selected.splice(idx, 1);
    } else {
      // إضافة (max 2)
      if (this.state.selected.length >= 2) {
        this.state.selected.shift(); // شيل أوّل واحد لو وصل لـ 2
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
      <div class="tg-intro animate-scale">
        <h2 class="title-section">حدس الطابع</h2>
        <p class="subtitle" style="margin-bottom: var(--space-md);">
          تسع شخصيّات قدّامك. كلّهم من ناس حقيقيّين قابلتهم في شغلي.
        </p>
        <div class="intro-points">
          <div class="intro-point">اقرا الشخصيّات بهدوء</div>
          <div class="intro-point">اختار اللي حسّيت إنّه يخصّك</div>
          <div class="intro-point">تقدر تختار اتنين لو محتار</div>
          <div class="intro-point">أو "مش متأكّد" — وده أصدق إجابة</div>
        </div>
        <button id="tgStartBtn" class="cta-btn">شوف الشخصيّات</button>
      </div>
    `;

    document.getElementById('tgStartBtn').addEventListener('click', () => {
      this.state.screen = 'selection';
      this.saveToLocalStorage();
      this.render();
    });
  },

  renderSelection() {
    this.container.innerHTML = `
      <div class="tg-selection animate-fade">
        <div class="tg-header">
          <h3 class="tg-title">اختار اللي يخصّك</h3>
          <p class="tg-subtitle" id="tgCounter">
            <span id="tgCountText">لسه ما اخترتش حدّ</span>
          </p>
        </div>

        <div class="tg-grid">
          ${TYPE_PERSONAS.map(t => `
            <button class="tg-card" data-id="${t.id}"
                    style="--c: ${t.color}; --g: ${t.glow};">
              <div class="tg-card-num">${toArabicNumTG(t.id)}</div>
              <div class="tg-card-name">${t.name}</div>
              <div class="tg-card-persona">${t.persona} — ${t.role}</div>
              <div class="tg-card-line">${t.line}</div>
              <div class="tg-card-detail">${t.detail}</div>
              <div class="tg-card-check">✓</div>
            </button>
          `).join('')}
        </div>

        <div class="tg-actions">
          <button id="tgConfirmBtn" class="cta-btn" disabled>أكّد اختياري</button>
          <button id="tgNotSureBtn" class="text-link-btn">مش متأكّد — ده الأصدق</button>
        </div>
      </div>
    `;

    // Bind events
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
      body = 'الحدس ده حدس بدائيّ — في الدورة، التشخيص الكامل بياخد ٢٠٠+ سؤال، علشان نوصل لبصمتك من ٢٧ بصمة. اللي اخترتو هنا بداية، مش نهاية.';
    } else {
      const types = this.state.selected.map(id =>
        TYPE_PERSONAS.find(t => t.id === id)
      );

      if (types.length === 1) {
        headline = `حسّيت إنّك قريب من ${types[0].persona}`;
        body = 'الحدس ده مفيد — لكنّه بداية. التشخيص الدقيق بياخد ٢٠٠+ سؤال في الدورة. في كل واحد فينا أصداء من أكتر من طابع، والمحدّد هو اللي بنبني عليه شخصيّتنا.';
      } else {
        headline = `بين ${types[0].persona} و ${types[1].persona}`;
        body = 'الحيرة دي طبيعيّة — معظم الناس بيكونوا بين طابعين. الواحد منهم رئيسيّ، والتاني الجناح. الدورة هتفصل ده بدقّة.';
      }
    }

    this.container.innerHTML = `
      <div class="tg-feedback tone-good animate-scale">
        <div class="feedback-mark"></div>
        <h2 class="feedback-headline">${headline}</h2>
        <p class="feedback-body">${body}</p>
        <div class="feedback-divider"></div>
        <p class="feedback-cont">ارجع للزووم — هنروح أعمق</p>
        <div class="pulse" style="margin-top: 1.5rem;"></div>
      </div>
    `;
  }
};
