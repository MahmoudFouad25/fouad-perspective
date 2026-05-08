/* ====================================================================
   منظور الفؤاد — Diagnostic Quiz Module
   الاختبار التشخيصيّ — تسع مواقف، ثلاثة محاور
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// بيانات المحاور الثلاثة
// ────────────────────────────────────────────────────────────────────
const QUIZ_AXES = {
  tamasok: {
    key: 'tamasok',
    name: 'التماسك',
    question: 'هل أنا بخير؟',
    color: '#D4A24E',
    glowSoft: 'rgba(212, 162, 78, 0.25)',
    glowStrong: 'rgba(212, 162, 78, 0.5)',
    essence: 'طاقتك الداخليّة بتتّجه نحو حماية ذاتك ومواردك والاستقرار.',
    description: 'إنت بتحسّ بإشارات جسدك مبكّرًا. بتدبّر مواردك بحكمة. بتضبط نفسك عند الضغط. ده محورك اللي بنيت عليه شخصيّتك.'
  },
  haywiyya: {
    key: 'haywiyya',
    name: 'الحيوية',
    question: 'هل أنا حيّ؟',
    color: '#E8543F',
    glowSoft: 'rgba(232, 84, 63, 0.25)',
    glowStrong: 'rgba(232, 84, 63, 0.5)',
    essence: 'طاقتك الداخليّة بتتّجه نحو الاشتعال والتجدّد والتجربة العميقة.',
    description: 'إنت مش بتدوّر على Stability — بتدوّر على إحساس بالحياة. بتشتعل بالأفكار، بتتجدّد بالتجارب، بتحسّ بالحياة في عمقها.'
  },
  intima: {
    key: 'intima',
    name: 'الانتماء',
    question: 'هل أنا منتمي؟',
    color: '#4ABEDF',
    glowSoft: 'rgba(74, 190, 223, 0.25)',
    glowStrong: 'rgba(74, 190, 223, 0.5)',
    essence: 'طاقتك الداخليّة بتتّجه نحو المكانة والدور والإسهام في المجموعة.',
    description: 'إنت بتدوّر على مكانك في النسيج الاجتماعيّ. بتستثمر في العلاقات، بتفهم الناس، بتلاحظ التفاصيل اللي ما حدّش بيلاحظها.'
  }
};

// ────────────────────────────────────────────────────────────────────
// بيانات المواقف التسعة
// ────────────────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    scenario: 'خرجت من الشغل في يوم متعب جدًا. وصلت البيت الساعة ٨ مساءً. صاحبك القديم بعتلك Voice Note يقولّك إنّه في أزمة وعايز يتكلّم.',
    prompt: 'ردّ فعلك التلقائيّ:',
    options: [
      { letter: 'أ', text: 'متعب جدًا — هابعتله بكرة الصبح. صحّتي أوّلًا.', axis: 'tamasok' },
      { letter: 'ب', text: 'برجع له فورًا — لو أنا في أزمة كنت هحبّ حدّ يكون موجود.', axis: 'haywiyya' },
      { letter: 'ج', text: 'هل في عيلته أو ناس تانية تقدر تساعده؟ قبل ما أنخرط.', axis: 'intima' }
    ]
  },
  {
    id: 'q2',
    scenario: 'Manager بتاعك جالك بـ Project كبير. مش في تخصّصك ١٠٠٪، لكنّه فرصة للـ Promotion.',
    prompt: 'أوّل سؤال جالك:',
    options: [
      { letter: 'أ', text: 'هل عندي القدرة الماليّة والصحّيّة أتحمّل لو فشل ده؟', axis: 'tamasok' },
      { letter: 'ب', text: 'هل المشروع ده هيشعّلني فعلًا؟ ولّا روتينيّ بـ Title أحسن؟', axis: 'haywiyya' },
      { letter: 'ج', text: 'مين الفريق اللي هاشتغل معاه يوميًّا؟', axis: 'intima' }
    ]
  },
  {
    id: 'q3',
    scenario: 'بقالك ٣ شهور حاسس بحاجة بداخلك مش كويّسة. لو سألت نفسك "إيه السبب؟"، أوّل إجابة:',
    prompt: '',
    options: [
      { letter: 'أ', text: 'محتاج إجازة، نوم منتظم، وأرجع لرياضتي.', axis: 'tamasok' },
      { letter: 'ب', text: 'حاسس إنّ حياتي بقت روتينيّة. محتاج حاجة تشعّلني.', axis: 'haywiyya' },
      { letter: 'ج', text: 'علاقاتي بقت سطحيّة. مفيش حدّ بيسألني عن نفسي بصدق.', axis: 'intima' }
    ]
  },
  {
    id: 'q4',
    scenario: 'عيد ميلادك.',
    prompt: 'اختار طريقة الاحتفال الأقرب لقلبك:',
    options: [
      { letter: 'أ', text: 'قعدة هادية في البيت مع الأقرب — مفيش زحمة ولا Surprises.', axis: 'tamasok' },
      { letter: 'ب', text: 'رحلة لمكان جديد ما رحتوش قبل كده — حتى لو يومين.', axis: 'haywiyya' },
      { letter: 'ج', text: 'عزومة كبيرة في مكان جميل، كل اللي بحبّهم في مكان واحد.', axis: 'intima' }
    ]
  },
  {
    id: 'q5',
    scenario: 'الشركة أعلنت Restructuring. مفيش ضمان لوظيفتك.',
    prompt: 'أوّل ردّ فعل داخليّ:',
    options: [
      { letter: 'أ', text: 'محتاج أراجع Savings وأبدأ Plan B الماليّ.', axis: 'tamasok' },
      { letter: 'ب', text: 'ممكن دي فرصة. ربّما الوقت جه أفكّر في حاجة تانية.', axis: 'haywiyya' },
      { letter: 'ج', text: 'مين في الفريق هيتأثّر معايا؟ ولاد فلان عندهم مدارس...', axis: 'intima' }
    ]
  },
  {
    id: 'q6',
    scenario: 'لحظات أكبر إحساس بالرضا في حياتك بتكون عادةً:',
    prompt: '',
    options: [
      { letter: 'أ', text: 'لمّا أحسّ إنّ كل حاجة في حياتي تحت السّيطرة.', axis: 'tamasok' },
      { letter: 'ب', text: 'لمّا أعمل حاجة بشغف وأحسّ إنّها لمست شخصًا تاني فعلًا.', axis: 'haywiyya' },
      { letter: 'ج', text: 'لمّا أكون وسط ناس بحبّهم، وحاسس إنّ ليّ مكان حقيقيّ.', axis: 'intima' }
    ]
  },
  {
    id: 'q7',
    scenario: 'شركة جديدة قدّمتلك Offer. الراتب أعلى ٢٥٪. المكان بعيد ساعة في الزحمة.',
    prompt: 'أكتر سؤال شغل بالك:',
    options: [
      { letter: 'أ', text: 'ساعة في الزحمة هتهدّ صحّتي ووقتي مع عيلتي.', axis: 'tamasok' },
      { letter: 'ب', text: 'هل المشروع نفسه هيدّيني تحدّي حقيقيّ؟', axis: 'haywiyya' },
      { letter: 'ج', text: 'هل الفريق هناك حلو؟ حسّيت بـ Vibe كويّس في الـ Interview؟', axis: 'intima' }
    ]
  },
  {
    id: 'q8',
    scenario: 'في Performance Review، Manager قال "محتاج تشتغل على نفسك".',
    prompt: 'لو هتركّز على نقطة واحدة:',
    options: [
      { letter: 'أ', text: 'أبني عادات صحّيّة وأنظّم حياتي بشكل أفضل.', axis: 'tamasok' },
      { letter: 'ب', text: 'أرجع للحاجة اللي بتشعّلني — بدأت أنسى أنا بحبّ إيه.', axis: 'haywiyya' },
      { letter: 'ج', text: 'أبني علاقات أعمق في الشّغل.', axis: 'intima' }
    ]
  },
  {
    id: 'q9',
    scenario: 'حياتك بعد ١٠ سنين — اللي تتمنّاها فعلًا:',
    prompt: '',
    options: [
      { letter: 'أ', text: 'حياة مستقرّة، صحّتي تمام، ماديًا مرتاح، سلامي الداخليّ محفوظ.', axis: 'tamasok' },
      { letter: 'ب', text: 'حياة مليانة بالتجارب الجديدة، شغل بشغف، إحساس مستمرّ إنّي حيّ.', axis: 'haywiyya' },
      { letter: 'ج', text: 'حياة محاطة بناس بحبّهم وبيحبّوني، علاقات عميقة، حدّ بيرجعلي وقت الأزمات.', axis: 'intima' }
    ]
  }
];

// ────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────
function toArabicNum(n) {
  const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(d => map[+d] ?? d).join('');
}

// ────────────────────────────────────────────────────────────────────
// Diagnostic Quiz Application
// ────────────────────────────────────────────────────────────────────
const DiagnosticQuiz = {
  state: {
    screen: 'intro',           // intro | question | calculating | reveal | capture | complete
    questionIdx: 0,
    answers: {},               // { q1: { letter, axis }, ... }
    result: null,
    contactSaved: false
  },

  container: null,

  // ── Init ──
  init(container) {
    this.container = container;
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
    localStorage.setItem('mfp_quiz_state', JSON.stringify(payload));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem('mfp_quiz_state');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      const currentPid = getParticipantId();
      // مطابقة المشارك الحاليّ مع الـ state المحفوظ
      if (data.participant_id !== currentPid) {
        localStorage.removeItem('mfp_quiz_state');
        return;
      }
      // تجاهل أيّ state أقدم من ٦ ساعات
      if (Date.now() - data.saved_at > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('mfp_quiz_state');
        return;
      }
      delete data.participant_id;
      delete data.saved_at;
      this.state = { ...this.state, ...data };
    } catch (e) {
      console.error('Failed to parse quiz state:', e);
      localStorage.removeItem('mfp_quiz_state');
    }
  },

  // ── Logic ──
  selectAnswer(letter) {
    const q = QUIZ_QUESTIONS[this.state.questionIdx];
    const opt = q.options.find(o => o.letter === letter);
    if (!opt) return;

    this.state.answers[q.id] = { letter, axis: opt.axis };
    this.saveToLocalStorage();

    // Animation: fade out, then advance
    const card = this.container.querySelector('.quiz-question');
    if (card) card.classList.add('fade-out');

    setTimeout(() => {
      if (this.state.questionIdx < QUIZ_QUESTIONS.length - 1) {
        this.state.questionIdx++;
        this.state.screen = 'question';
      } else {
        this.calculateResult();
        this.state.screen = 'calculating';
      }
      this.saveToLocalStorage();
      this.render();
    }, 280);
  },

  calculateResult() {
    const counts = { tamasok: 0, haywiyya: 0, intima: 0 };
    Object.values(this.state.answers).forEach(ans => {
      counts[ans.axis]++;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    this.state.result = {
      main_axis: sorted[0][0],
      secondary_axis: sorted[1][0],
      repressed_axis: sorted[2][0],
      counts: counts,
      letters: {
        a: Object.values(this.state.answers).filter(a => a.letter === 'أ').length,
        b: Object.values(this.state.answers).filter(a => a.letter === 'ب').length,
        c: Object.values(this.state.answers).filter(a => a.letter === 'ج').length
      }
    };
  },

  async persistResult() {
    try {
      const answersForFB = {};
      Object.entries(this.state.answers).forEach(([qId, ans]) => {
        answersForFB[qId] = ans.letter;
      });
      await submitQuizResult('diagnostic', answersForFB, this.state.result);
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  },

  // ── Rendering ──
  render() {
    if (!this.container) return;
    switch (this.state.screen) {
      case 'intro':       this.renderIntro(); break;
      case 'question':    this.renderQuestion(); break;
      case 'calculating': this.renderCalculating(); break;
      case 'reveal':      this.renderReveal(); break;
      case 'capture':     this.renderCapture(); break;
      case 'complete':    this.renderComplete(); break;
    }
  },

  renderIntro() {
    this.container.innerHTML = `
      <div class="quiz-intro animate-scale">
        <h2 class="title-section">الاختبار التشخيصيّ</h2>
        <p class="subtitle" style="margin-bottom: var(--space-md);">
          تسع مواقف من حياتك. عشر دقايق.
        </p>
        <div class="intro-points">
          <div class="intro-point">اختار الإجابة الأقرب لتصرّفك الفعليّ</div>
          <div class="intro-point">مش الإجابة اللي تتمنّى تكون عليها</div>
          <div class="intro-point">نتيجتك تخصّك إنت — ما حدّش هيشوفها</div>
        </div>
        <button id="quizStartBtn" class="cta-btn">ابدأ الموقف الأوّل</button>
      </div>
    `;

    document.getElementById('quizStartBtn').addEventListener('click', () => {
      this.state.screen = 'question';
      this.state.questionIdx = 0;
      this.saveToLocalStorage();
      this.render();
    });
  },

  renderQuestion() {
    const idx = this.state.questionIdx;
    const q = QUIZ_QUESTIONS[idx];
    const progress = ((idx + 1) / QUIZ_QUESTIONS.length) * 100;

    this.container.innerHTML = `
      <div class="quiz-question animate-fade">
        <div class="quiz-progress">
          <div class="quiz-progress-label">
            <span>الموقف ${toArabicNum(idx + 1)}</span>
            <span class="quiz-progress-total">من ${toArabicNum(QUIZ_QUESTIONS.length)}</span>
          </div>
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${progress}%;"></div>
          </div>
        </div>

        <div class="quiz-scenario">
          <p class="scenario-text">${q.scenario}</p>
          ${q.prompt ? `<p class="scenario-prompt">${q.prompt}</p>` : ''}
        </div>

        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option" data-letter="${opt.letter}">
              <span class="quiz-option-letter">${opt.letter}</span>
              <span class="quiz-option-text">${opt.text}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        // Visual feedback
        this.container.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          if (b !== btn) b.classList.add('dimmed');
        });
        btn.classList.add('selected');
        // Process after animation
        setTimeout(() => this.selectAnswer(btn.dataset.letter), 320);
      });
    });
  },

  renderCalculating() {
    this.container.innerHTML = `
      <div class="quiz-calculating animate-fade">
        <div class="calc-rings">
          <div class="calc-ring"></div>
          <div class="calc-ring"></div>
          <div class="calc-ring"></div>
        </div>
        <p class="calc-text">بنحسب نتيجتك...</p>
      </div>
    `;

    // بعد 1.6 ثانية، اعرض الكشف وخزّن في Firebase
    setTimeout(() => {
      this.persistResult();
      this.state.screen = 'reveal';
      this.saveToLocalStorage();
      this.render();
    }, 1600);
  },

  renderReveal() {
    const r = this.state.result;
    const main = QUIZ_AXES[r.main_axis];

    // CSS variables للون المحور (Dynamic styling)
    const styleVars = `
      --axis-color: ${main.color};
      --axis-glow-soft: ${main.glowSoft};
      --axis-glow-strong: ${main.glowStrong};
    `;

    this.container.innerHTML = `
      <div class="quiz-reveal" style="${styleVars}">

        <div class="reveal-header">
          <p class="reveal-label">محورك الرئيسيّ</p>
          <h1 class="reveal-axis-name">${main.name}</h1>
          <p class="reveal-axis-question">${main.question}</p>
        </div>

        <div class="reveal-circles">
          ${['tamasok', 'haywiyya', 'intima'].map(key => {
            const ax = QUIZ_AXES[key];
            const isMain = key === r.main_axis;
            const count = r.counts[key];
            return `
              <div class="reveal-circle ${isMain ? 'is-main' : ''}"
                   style="--c: ${ax.color}; --g: ${ax.glowSoft};">
                <div class="reveal-circle-inner">
                  <span class="reveal-circle-count">${toArabicNum(count)}</span>
                </div>
                <span class="reveal-circle-label">${ax.name}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="reveal-essence">
          <p>${main.essence}</p>
        </div>

        <div class="reveal-actions">
          <button id="revealCaptureBtn" class="cta-btn">
            احفظ تشخيصك على الواتس
          </button>
          <button id="revealSkipBtn" class="text-link-btn">
            تابع التجربة بدون حفظ
          </button>
        </div>
      </div>
    `;

    document.getElementById('revealCaptureBtn').addEventListener('click', () => {
      this.state.screen = 'capture';
      this.saveToLocalStorage();
      this.render();
    });

    document.getElementById('revealSkipBtn').addEventListener('click', () => {
      this.state.screen = 'complete';
      this.saveToLocalStorage();
      this.render();
    });
  },

  renderCapture() {
    this.container.innerHTML = `
      <div class="quiz-capture animate-scale">
        <h2 class="title-section">احفظ تشخيصك</h2>
        <p class="subtitle">
          هابعتلك على الواتس:<br>
          <span class="capture-list-item">· تشخيصك الكامل</span>
          <span class="capture-list-item">· هديّة الويبينار</span>
          <span class="capture-list-item">· إيميلات إنت تستفيد منها</span>
        </p>

        <form id="captureForm" class="capture-form">
          <div class="form-field">
            <label for="captureName">الاسم الأوّل</label>
            <input
              type="text"
              id="captureName"
              placeholder="اسمك"
              autocomplete="given-name"
              required
              minlength="2"
            >
          </div>

          <div class="form-field">
            <label for="captureWhatsapp">رقم الواتس</label>
            <input
              type="tel"
              id="captureWhatsapp"
              placeholder="01000000000"
              autocomplete="tel"
              required
              pattern="[0-9+\\s]{8,20}"
              inputmode="tel"
            >
          </div>

          <button type="submit" class="cta-btn">احفظ بياناتي</button>
          <button type="button" id="captureSkipBtn" class="text-link-btn">
            مش دلوقتي
          </button>
        </form>

        <p class="capture-trust">
          بياناتك آمنة معايا — مش هتتباع لحدّ
        </p>
      </div>
    `;

    document.getElementById('captureForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ...';

      const name = document.getElementById('captureName').value.trim();
      const whatsapp = document.getElementById('captureWhatsapp').value.trim();

      try {
        await saveContact(name, whatsapp);
        this.state.contactSaved = true;
        this.state.screen = 'complete';
        this.saveToLocalStorage();
        this.render();
      } catch (err) {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'حاول تاني';
        alert('حصل خطأ في الحفظ. تأكّد من الإنترنت وحاول تاني.');
      }
    });

    document.getElementById('captureSkipBtn').addEventListener('click', () => {
      this.state.screen = 'complete';
      this.saveToLocalStorage();
      this.render();
    });
  },

  renderComplete() {
    const main = QUIZ_AXES[this.state.result.main_axis];
    const saved = this.state.contactSaved;

    this.container.innerHTML = `
      <div class="quiz-complete animate-scale" style="--axis-color: ${main.color}; --axis-glow-soft: ${main.glowSoft};">
        <div class="complete-mark">✓</div>
        <h2 class="title-section">تمام</h2>
        <p class="complete-axis">
          محورك الرئيسيّ: <strong style="color: ${main.color};">${main.name}</strong>
        </p>
        <p class="subtitle">
          ${saved
            ? 'تشخيصك هيوصلك على الواتس بعد الويبينار.'
            : 'احتفظ بنتيجتك في ذهنك — هنبني عليها بعدين.'}
        </p>
        <div class="complete-divider"></div>
        <p class="text-faint">
          ارجع للزووم — في حاجات أعمق هنفتحها سوا
        </p>
        <div class="pulse" style="margin-top: var(--space-md);"></div>
      </div>
    `;
  }
};
