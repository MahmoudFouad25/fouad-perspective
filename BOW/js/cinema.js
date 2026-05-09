/* ====================================================================
   منظور الفؤاد — Cinema Engine (v2)
   Click-to-Reveal Architecture
   ────────────────────────────────────────────────────────────────────
   كيف يعمل:
   • كل سلايد فيها عناصر بـ data-step
   • الضغطة الأولى داخل السلايد = أوّل عنصر يظهر
   • كل ضغطة بعدها = العنصر اللي بعده
   • بعد ما الكلّ يظهر، الضغطة الجاية = السلايد التالية
   • السهم لليسار = خطوة للوراء (يخفي العنصر، أو يرجع للسلايد السابقة)
   ──────────────────────────────────────────────────────────────────── */

const Cinema = {
  slides: [],
  current: 0,
  partLabel: '',
  partNum: 1,

  // كل سلايد بيخزّن step حالي (كم عنصر ظاهر)
  slideSteps: [],

  init(opts = {}) {
    this.partLabel = opts.partLabel || 'الجزء الأوّل';
    this.partNum = opts.partNum || 1;
    this.slides = Array.from(document.querySelectorAll('.slide'));

    if (this.slides.length === 0) {
      console.error('Cinema: no slides found');
      return;
    }

    // تهيئة الـ steps لكل سلايد
    this.slides.forEach((slide, idx) => {
      const steps = slide.querySelectorAll('[data-step]');
      this.slideSteps[idx] = {
        total: steps.length,
        current: 0   // كم عنصر ظاهر الآن
      };
    });

    // قراءة آخر سلايد
    const savedIdx = parseInt(sessionStorage.getItem(`cinema_${this.partNum}_idx`) || '0', 10);
    this.current = Math.min(Math.max(savedIdx, 0), this.slides.length - 1);

    this.buildHud();
    this.bindKeyboard();
    this.bindClicks();
    this.showSlide(this.current);
  },

  // ────────────────────────────────────────────────────────────────
  // HUD
  // ────────────────────────────────────────────────────────────────
  buildHud() {
    const progress = document.createElement('div');
    progress.className = 'hud hud-progress';
    progress.innerHTML = '<div class="hud-progress-fill" id="hudProgressFill"></div>';
    document.body.appendChild(progress);

    const info = document.createElement('div');
    info.className = 'hud hud-info';
    info.innerHTML = `
      <span class="hud-counter">
        <span id="hudCurrent">1</span>
        <span style="opacity: 0.5; margin: 0 0.4rem;">/</span>
        <span id="hudTotal">${this.slides.length}</span>
      </span>
      <span style="direction: rtl;">${this.partLabel}</span>
    `;
    document.body.appendChild(info);

    const brand = document.createElement('div');
    brand.className = 'hud hud-brand';
    brand.innerHTML = `
      <span>منظور الفؤاد</span>
      <div class="hud-brand-mark">م.ف</div>
    `;
    document.body.appendChild(brand);

    const help = document.createElement('div');
    help.className = 'help-overlay';
    help.id = 'helpOverlay';
    help.innerHTML = `
      <div style="text-align: right; direction: rtl;">
        <h2 style="font-family: var(--font-display); font-size: 2rem; margin-bottom: 2rem; color: var(--sky);">اختصارات لوحة المفاتيح</h2>
        <div class="help-grid">
          <div class="help-key"><kbd>→</kbd> <span>الخطوة التالية</span></div>
          <div class="help-key"><kbd>←</kbd> <span>الخطوة السابقة</span></div>
          <div class="help-key"><kbd>Space</kbd> <span>التالي</span></div>
          <div class="help-key"><kbd>↓</kbd> <span>اقفز للسلايد التالية</span></div>
          <div class="help-key"><kbd>↑</kbd> <span>اقفز للسلايد السابقة</span></div>
          <div class="help-key"><kbd>Home</kbd> <span>أوّل سلايد</span></div>
          <div class="help-key"><kbd>End</kbd> <span>آخر سلايد</span></div>
          <div class="help-key"><kbd>F</kbd> <span>Fullscreen</span></div>
          <div class="help-key"><kbd>B</kbd> <span>شاشة سوداء</span></div>
          <div class="help-key"><kbd>?</kbd> <span>المساعدة</span></div>
          <div class="help-key"><kbd>Esc</kbd> <span>إغلاق</span></div>
        </div>
        <p style="margin-top: 2rem; color: var(--white-faint); font-size: 0.9rem;">
          💡 الضغطة على الشاشة = خطوة للأمام · يمكنك أيضًا الكليك على الشاشة بدل الكيبورد
        </p>
      </div>
    `;
    document.body.appendChild(help);

    const black = document.createElement('div');
    black.className = 'black-screen';
    black.id = 'blackScreen';
    document.body.appendChild(black);
  },

  // ────────────────────────────────────────────────────────────────
  // Keyboard
  // ────────────────────────────────────────────────────────────────
  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      const helpOverlay = document.getElementById('helpOverlay');
      if (helpOverlay.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === '?') {
          helpOverlay.classList.remove('active');
          e.preventDefault();
        }
        return;
      }

      const black = document.getElementById('blackScreen');
      if (black.classList.contains('active') && e.key !== 'b' && e.key !== 'B') {
        black.classList.remove('active');
      }

      switch (e.key) {
        // الخطوة الفرعيّة (داخل السلايد) أو السلايد التالية
        case ' ':
        case 'PageDown':
        case 'ArrowRight':  // في RTL، السهم اليمين = للأمام (الكشف التالي)
          this.next();
          e.preventDefault();
          break;

        case 'ArrowLeft':   // في RTL، السهم الشمال = للوراء
        case 'PageUp':
          this.prev();
          e.preventDefault();
          break;

        // قفز سلايد كاملة (تجاوز الخطوات الفرعيّة)
        case 'ArrowDown':
          this.jumpNextSlide();
          e.preventDefault();
          break;

        case 'ArrowUp':
          this.jumpPrevSlide();
          e.preventDefault();
          break;

        case 'Home':
          this.gotoSlide(0);
          e.preventDefault();
          break;

        case 'End':
          this.gotoSlide(this.slides.length - 1);
          e.preventDefault();
          break;

        case 'f':
        case 'F':
          this.toggleFullscreen();
          e.preventDefault();
          break;

        case 'b':
        case 'B':
          black.classList.toggle('active');
          e.preventDefault();
          break;

        case '?':
          helpOverlay.classList.add('active');
          e.preventDefault();
          break;
      }
    });
  },

  // ────────────────────────────────────────────────────────────────
  // Mouse clicks (الكليك في أيّ مكان = خطوة للأمام)
  // ────────────────────────────────────────────────────────────────
  bindClicks() {
    document.addEventListener('click', (e) => {
      // تجاهل الكليك على عناصر تفاعليّة
      if (e.target.closest('a, button, input, textarea, select, .help-overlay, .hud')) return;

      // في RTL: الكليك على اليسار = للأمام، اليمين = للوراء
      const x = e.clientX;
      const w = window.innerWidth;
      if (x < w / 2) {
        this.next();
      } else {
        this.prev();
      }
    });
  },

  // ────────────────────────────────────────────────────────────────
  // ⭐ Core navigation logic — Click-to-Reveal
  // ────────────────────────────────────────────────────────────────
  next() {
    const stepInfo = this.slideSteps[this.current];

    if (stepInfo.current < stepInfo.total) {
      // فيه خطوات داخليّة لسه — اكشف الجاية
      this.revealNextStep();
    } else if (this.current < this.slides.length - 1) {
      // كل الخطوات ظاهرة — انقل للسلايد التالية
      this.gotoSlide(this.current + 1);
    }
  },

  prev() {
    const stepInfo = this.slideSteps[this.current];

    if (stepInfo.current > 0) {
      // فيه خطوات ظاهرة — اخفي آخر واحدة
      this.hideLastStep();
    } else if (this.current > 0) {
      // عند بداية السلايد — ارجع للسلايد السابقة (وكل خطواتها ظاهرة)
      this.gotoSlide(this.current - 1, /* showAllSteps */ true);
    }
  },

  // قفز سلايد بدون مرور بالخطوات
  jumpNextSlide() {
    if (this.current < this.slides.length - 1) {
      this.gotoSlide(this.current + 1);
    }
  },

  jumpPrevSlide() {
    if (this.current > 0) {
      this.gotoSlide(this.current - 1);
    }
  },

  // ────────────────────────────────────────────────────────────────
  // Reveal/Hide steps
  // ────────────────────────────────────────────────────────────────
  revealNextStep() {
    const slide = this.slides[this.current];
    const stepInfo = this.slideSteps[this.current];
    const steps = slide.querySelectorAll('[data-step]');

    // لاقي العنصر التالي (اللي بعد الـ current)
    const nextStepIdx = stepInfo.current;
    if (nextStepIdx < steps.length) {
      steps[nextStepIdx].classList.add('revealed');
      stepInfo.current++;
    }
  },

  hideLastStep() {
    const slide = this.slides[this.current];
    const stepInfo = this.slideSteps[this.current];
    const steps = slide.querySelectorAll('[data-step]');

    if (stepInfo.current > 0) {
      stepInfo.current--;
      steps[stepInfo.current].classList.remove('revealed');
    }
  },

  showAllSteps() {
    const slide = this.slides[this.current];
    const steps = slide.querySelectorAll('[data-step]');
    steps.forEach(s => s.classList.add('revealed'));
    this.slideSteps[this.current].current = steps.length;
  },

  hideAllSteps() {
    const slide = this.slides[this.current];
    const steps = slide.querySelectorAll('[data-step]');
    steps.forEach(s => s.classList.remove('revealed'));
    this.slideSteps[this.current].current = 0;
  },

  // ────────────────────────────────────────────────────────────────
  // Slide transitions
  // ────────────────────────────────────────────────────────────────
  gotoSlide(idx, showAllSteps = false) {
    if (idx < 0 || idx >= this.slides.length) return;

    // إخفاء كل الخطوات في السلايد الحاليّة
    this.hideAllSteps();

    // تبديل الـ active class
    this.slides.forEach(s => s.classList.remove('active'));
    this.slides[idx].classList.add('active');

    this.current = idx;
    sessionStorage.setItem(`cinema_${this.partNum}_idx`, String(idx));

    // لو رجوع للوراء، اعرض كل الخطوات في السلايد المستهدفة
    if (showAllSteps) {
      this.showAllSteps();
    }

    this.updateHud();
  },

  showSlide(idx) {
    this.gotoSlide(idx);
  },

  // ────────────────────────────────────────────────────────────────
  // HUD update
  // ────────────────────────────────────────────────────────────────
  updateHud() {
    const fill = document.getElementById('hudProgressFill');
    const cur = document.getElementById('hudCurrent');
    if (fill) {
      const pct = ((this.current + 1) / this.slides.length) * 100;
      fill.style.width = `${pct}%`;
    }
    if (cur) cur.textContent = this.current + 1;
  },

  // ────────────────────────────────────────────────────────────────
  // Fullscreen
  // ────────────────────────────────────────────────────────────────
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
};
