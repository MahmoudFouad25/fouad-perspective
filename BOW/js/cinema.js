/* ====================================================================
   منظور الفؤاد — Cinema Engine
   محرّك العرض التقديميّ
   ──────────────────────────────────────────────────────────────────── */

const Cinema = {
  slides: [],
  current: 0,
  partLabel: '',
  partNum: 0,
  totalParts: 4,

  init(opts = {}) {
    this.partLabel = opts.partLabel || 'الجزء الأوّل';
    this.partNum = opts.partNum || 1;
    this.slides = Array.from(document.querySelectorAll('.slide'));

    if (this.slides.length === 0) {
      console.error('Cinema: no slides found');
      return;
    }

    // قراءة sessionStorage عشان لو reload يفتكر آخر سلايد
    const savedIdx = parseInt(sessionStorage.getItem(`cinema_${this.partNum}_idx`) || '0', 10);
    this.current = Math.min(Math.max(savedIdx, 0), this.slides.length - 1);

    this.buildHud();
    this.bindKeyboard();
    this.bindClicks();
    this.show(this.current);
  },

  buildHud() {
    // Progress bar
    const progress = document.createElement('div');
    progress.className = 'hud hud-progress';
    progress.innerHTML = '<div class="hud-progress-fill" id="hudProgressFill"></div>';
    document.body.appendChild(progress);

    // Bottom-left info
    const info = document.createElement('div');
    info.className = 'hud hud-info';
    info.innerHTML = `
      <span class="hud-part-label">${this.partLabel}</span>
      <span class="hud-counter">
        <span id="hudCurrent">1</span>
        <span style="opacity: 0.5; margin: 0 0.4rem;">/</span>
        <span id="hudTotal">${this.slides.length}</span>
      </span>
    `;
    document.body.appendChild(info);

    // Bottom-right brand
    const brand = document.createElement('div');
    brand.className = 'hud hud-brand';
    brand.innerHTML = `
      <span>منظور الفؤاد</span>
      <div class="hud-brand-mark">م.ف</div>
    `;
    document.body.appendChild(brand);

    // Help overlay
    const help = document.createElement('div');
    help.className = 'help-overlay';
    help.id = 'helpOverlay';
    help.innerHTML = `
      <div style="text-align: right;">
        <h2 style="font-family: var(--font-display); font-size: 2rem; margin-bottom: 2rem; color: var(--sky);">اختصارات لوحة المفاتيح</h2>
        <div class="help-grid">
          <div class="help-key"><kbd>→</kbd> <span>السلايد التالي</span></div>
          <div class="help-key"><kbd>←</kbd> <span>السلايد السابق</span></div>
          <div class="help-key"><kbd>Space</kbd> <span>التالي</span></div>
          <div class="help-key"><kbd>Home</kbd> <span>أوّل سلايد</span></div>
          <div class="help-key"><kbd>End</kbd> <span>آخر سلايد</span></div>
          <div class="help-key"><kbd>F</kbd> <span>Fullscreen</span></div>
          <div class="help-key"><kbd>B</kbd> <span>شاشة سوداء</span></div>
          <div class="help-key"><kbd>?</kbd> <span>المساعدة</span></div>
          <div class="help-key"><kbd>Esc</kbd> <span>إغلاق</span></div>
          <div class="help-key"><kbd>0-9</kbd> <span>قفز سريع</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(help);

    // Black screen
    const black = document.createElement('div');
    black.className = 'black-screen';
    black.id = 'blackScreen';
    document.body.appendChild(black);
  },

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // لو help مفتوح، Esc بيقفل
      const helpOverlay = document.getElementById('helpOverlay');
      if (helpOverlay.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === '?') {
          helpOverlay.classList.remove('active');
          e.preventDefault();
        }
        return;
      }

      // Black screen toggle
      const black = document.getElementById('blackScreen');
      if (black.classList.contains('active') && e.key !== 'b' && e.key !== 'B') {
        black.classList.remove('active');
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          this.next();
          e.preventDefault();
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          this.prev();
          e.preventDefault();
          break;

        case 'Home':
          this.show(0);
          e.preventDefault();
          break;

        case 'End':
          this.show(this.slides.length - 1);
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

        default:
          // Numbers 1-9 for jumping
          if (/^[1-9]$/.test(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < this.slides.length) this.show(idx);
            e.preventDefault();
          }
      }
    });
  },

  bindClicks() {
    // Click anywhere on right half = next, left half = prev
    document.addEventListener('click', (e) => {
      // تجاهل الكليكس على عناصر تفاعليّة
      if (e.target.closest('a, button, input, textarea, select, .help-overlay')) return;

      const x = e.clientX;
      const w = window.innerWidth;
      if (x < w / 2) {
        this.next(); // الكليك على الشمال = التالي (RTL)
      } else {
        this.prev();
      }
    });
  },

  show(idx) {
    if (idx < 0 || idx >= this.slides.length) return;
    this.slides.forEach(s => s.classList.remove('active'));
    this.slides[idx].classList.add('active');
    this.current = idx;
    sessionStorage.setItem(`cinema_${this.partNum}_idx`, String(idx));
    this.updateHud();
  },

  next() {
    if (this.current < this.slides.length - 1) {
      this.show(this.current + 1);
    }
  },

  prev() {
    if (this.current > 0) {
      this.show(this.current - 1);
    }
  },

  updateHud() {
    const fill = document.getElementById('hudProgressFill');
    const cur = document.getElementById('hudCurrent');
    if (fill) {
      const pct = ((this.current + 1) / this.slides.length) * 100;
      fill.style.width = `${pct}%`;
    }
    if (cur) cur.textContent = this.current + 1;
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
};
