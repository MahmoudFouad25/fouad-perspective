/* ====================================================================
   PDS Branding Module — Shared between journey.html & journey-result.html
   ────────────────────────────────────────────────────────────────────
   يبني:
   - لوجو PDS متحرك (SVG)
   - Hero section موحّد (Reignite + المدرب)
   - Modal تعريف المدرب الكامل
   - زرار CTA لاستمارة Reignite
   ──────────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  const PDS_CONFIG = {
    companyName: "Proactive Development Solutions",
    companyShort: "PDS",
    programName: "Reignite",
    programFull: "Reignite — Burnout to Brilliance Program",
    programTagline: "من الاحتراق إلى الاشتعال — رحلة الـ٩٠ يومًا",
    instructor: {
      name: "كوتش محمود فؤاد",
      nameLatin: "Coach Mahmoud Fouad",
      shortBio: "سفير التراحم التطبيقي — جامعة ستانفورد",
      photo: "https://raw.githubusercontent.com/MahmoudFouad25/fouad-perspective/main/media/instructors/MAHMOUD%20PHOTO.jpg",
      credentials: [
        { icon: "stanford", text: "سفير التراحم التطبيقي من مركز CCARE", org: "جامعة ستانفورد · الولايات المتحدة" },
        { icon: "framework", text: "مصمم الـ Compassionate Enneagram™ Framework", org: "إطار أصيل لفهم الطبائع في بيئات القيادة" },
        { icon: "certified", text: "ممارس معتمد دوليًا في تطوير القيادات وفرق العمل", org: "" },
        { icon: "business", text: "كوتش معتمد في الإنياجرام للأعمال", org: "The Enneagram in Business · سان فرانسيسكو" },
        { icon: "integrative", text: "ممارس تكاملي معتمد في الإنياجرام", org: "Integrative Enneagram Solutions · جنوب أفريقيا" },
        { icon: "experience", text: "أكثر من ١٥ سنة خبرة", org: "مع مؤسسات محلية ودولية" }
      ]
    },
    reigniteFormUrl: "https://docs.google.com/forms/d/1ipZAn8K9MgkdQgNzHe-3EPx8UTqpT9jaDfQKVUKKTto/viewform"
  };

  /* ════════════════════════════════════════════════════════════
     لوجو PDS — SVG متحرك مرسوم من الصفر
     الدرع، الـP، والـS — كل عنصر يترسم بحركة stroke
     ──────────────────────────────────────────────────────────── */
  function pdsLogoSVG(size = "compact") {
    // size: "compact" | "hero" | "footer"
    const dims = {
      compact: { w: 36, h: 42 },
      hero:    { w: 88, h: 104 },
      footer:  { w: 28, h: 32 }
    }[size] || { w: 36, h: 42 };

    // الدرع: shape مستوحى من اللوجو الأصلي
    // ينتهي بنقطة سفلية، أطرافه العلوية متعرّجة قليلًا
    return `
      <svg class="pds-logo pds-logo--${size}" viewBox="0 0 100 120" width="${dims.w}" height="${dims.h}" xmlns="http://www.w3.org/2000/svg" aria-label="PDS logo">
        <defs>
          <linearGradient id="pdsShieldGrad-${size}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4FB8E0"/>
            <stop offset="60%" stop-color="#1A6FAE"/>
            <stop offset="100%" stop-color="#0D4D87"/>
          </linearGradient>
          <linearGradient id="pdsLetterGrad-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7DD3FC"/>
            <stop offset="100%" stop-color="#0EA5E9"/>
          </linearGradient>
        </defs>
        <!-- الدرع outline (يترسم) -->
        <path class="pds-shield" d="M 12 18 L 12 65 Q 12 88 50 112 Q 88 88 88 65 L 88 18 L 65 18 L 60 25 L 40 25 L 35 18 Z"
              fill="none" stroke="url(#pdsShieldGrad-${size})" stroke-width="3.5"
              stroke-linejoin="round" stroke-linecap="round"/>
        <!-- الدرع fill (يظهر بعد الـoutline) -->
        <path class="pds-shield-fill" d="M 12 18 L 12 65 Q 12 88 50 112 Q 88 88 88 65 L 88 18 L 65 18 L 60 25 L 40 25 L 35 18 Z"
              fill="url(#pdsShieldGrad-${size})" opacity="0"/>
        <!-- حرف P -->
        <path class="pds-letter pds-letter--p"
              d="M 28 40 L 28 78 M 28 40 L 42 40 Q 50 40 50 50 Q 50 60 42 60 L 28 60"
              fill="none" stroke="url(#pdsLetterGrad-${size})" stroke-width="4"
              stroke-linecap="round" stroke-linejoin="round"/>
        <!-- حرف S (stylized) -->
        <path class="pds-letter pds-letter--s"
              d="M 72 44 Q 64 40 58 44 Q 54 48 58 54 L 68 60 Q 72 62 72 66 Q 72 74 62 76 Q 56 76 52 72"
              fill="none" stroke="url(#pdsLetterGrad-${size})" stroke-width="4"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     شعار + اسم الشركة (لـheaders)
     ──────────────────────────────────────────────────────────── */
  function pdsBrandBlock(opts = {}) {
    const showProgram = opts.showProgram !== false;
    return `
      <div class="pds-brand">
        <div class="pds-brand__logo">${pdsLogoSVG("compact")}</div>
        <div class="pds-brand__text">
          <span class="pds-brand__company">Proactive Development Solutions</span>
          ${showProgram ? `<span class="pds-brand__program">${PDS_CONFIG.programName}</span>` : ``}
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     Hero Section — يظهر مرة واحدة في أعلى الصفحة
     ──────────────────────────────────────────────────────────── */
  function pdsHeroSection() {
    const ins = PDS_CONFIG.instructor;
    return `
      <section class="pds-hero" id="pdsHero">
        <div class="pds-hero__particles" aria-hidden="true">
          ${Array(20).fill(0).map((_,i) => `<span class="pds-particle" style="--i:${i}"></span>`).join("")}
        </div>

        <div class="pds-hero__inner">
          <!-- العمود الأيمن: الشركة والبرنامج -->
          <div class="pds-hero__main">
            <div class="pds-hero__logo-wrap">${pdsLogoSVG("hero")}</div>

            <div class="pds-hero__company">
              <span class="pds-hero__company-line">Proactive</span>
              <span class="pds-hero__company-line">Development</span>
              <span class="pds-hero__company-line">Solutions</span>
            </div>

            <div class="pds-hero__divider" aria-hidden="true"></div>

            <div class="pds-hero__program">
              <span class="pds-hero__program-label">يقدّم برنامج</span>
              <h1 class="pds-hero__program-name">Reignite</h1>
              <p class="pds-hero__program-sub">Burnout to Brilliance Program</p>
              <p class="pds-hero__program-tagline">${PDS_CONFIG.programTagline}</p>
            </div>
          </div>

          <!-- العمود الأيسر: المدرب -->
          <aside class="pds-hero__instructor">
            <div class="pds-hero__photo-frame">
              <div class="pds-hero__photo-ring"></div>
              <img class="pds-hero__photo" src="${ins.photo}" alt="${escapeHtml(ins.name)}" loading="lazy" onerror="this.style.display='none'">
              <div class="pds-hero__photo-glow"></div>
            </div>
            <div class="pds-hero__instructor-text">
              <span class="pds-hero__instructor-label">مع</span>
              <h2 class="pds-hero__instructor-name">${escapeHtml(ins.name)}</h2>
              <p class="pds-hero__instructor-bio">${escapeHtml(ins.shortBio)}</p>
              <button type="button" class="pds-hero__instructor-cta" data-action="pds-open-instructor">
                <span>تعرّف على المدرب</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </aside>
        </div>

        <div class="pds-hero__scroll-cue" aria-hidden="true">
          <span>ابدأ رحلتك</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </section>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     Modal تعريف المدرب الكامل
     ──────────────────────────────────────────────────────────── */
  const CRED_ICONS = {
    stanford: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    framework: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    certified: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    business: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    integrative: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    experience: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  };

  function pdsInstructorModal() {
    const ins = PDS_CONFIG.instructor;
    return `
      <div class="pds-modal" id="pdsInstructorModal" hidden aria-hidden="true">
        <div class="pds-modal__backdrop" data-action="pds-close-instructor"></div>
        <div class="pds-modal__panel" role="dialog" aria-labelledby="pdsModalTitle">
          <button type="button" class="pds-modal__close" data-action="pds-close-instructor" aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <header class="pds-modal__header">
            <div class="pds-modal__photo-wrap">
              <img class="pds-modal__photo" src="${ins.photo}" alt="${escapeHtml(ins.name)}" loading="lazy" onerror="this.style.display='none'">
            </div>
            <div class="pds-modal__title-wrap">
              <p class="pds-modal__eyebrow">المدرب</p>
              <h2 class="pds-modal__title" id="pdsModalTitle">${escapeHtml(ins.name)}</h2>
              <p class="pds-modal__name-latin">${escapeHtml(ins.nameLatin)}</p>
            </div>
          </header>

          <div class="pds-modal__body">
            <p class="pds-modal__intro">منهجية مبنية على ١٥ سنة خبرة، واعتمادات دولية من مؤسسات مرجعية في تطوير القيادات والتراحم التطبيقي.</p>

            <ul class="pds-creds">
              ${ins.credentials.map(c => `
                <li class="pds-cred">
                  <div class="pds-cred__icon">${CRED_ICONS[c.icon] || ""}</div>
                  <div class="pds-cred__body">
                    <p class="pds-cred__text">${escapeHtml(c.text)}</p>
                    ${c.org ? `<p class="pds-cred__org">${escapeHtml(c.org)}</p>` : ``}
                  </div>
                </li>
              `).join("")}
            </ul>
          </div>

          <footer class="pds-modal__footer">
            <button type="button" class="pds-btn pds-btn--ghost" data-action="pds-close-instructor">إغلاق</button>
            <a class="pds-btn pds-btn--primary" href="${PDS_CONFIG.reigniteFormUrl}" target="_blank" rel="noopener">
              <span>اعرف أكتر عن Reignite</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </footer>
        </div>
      </div>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     CTA لـReignite — يستبدل كل أزرار "الدورة الكاملة"
     ──────────────────────────────────────────────────────────── */
  function pdsReigniteCTA(opts = {}) {
    const variant = opts.variant || "primary"; // primary | ghost | inline
    const label = opts.label || "اعرف أكتر عن Reignite";
    return `
      <a class="pds-btn pds-btn--${variant} pds-cta-reignite"
         href="${PDS_CONFIG.reigniteFormUrl}" target="_blank" rel="noopener">
        ${variant === "primary" ? `<span class="pds-cta-reignite__icon" aria-hidden="true">✦</span>` : ``}
        <span>${escapeHtml(label)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     Footer مختصر — يظهر في الصفحات الكبيرة
     ──────────────────────────────────────────────────────────── */
  function pdsFooter() {
    return `
      <footer class="pds-footer">
        <div class="pds-footer__inner">
          <div class="pds-footer__brand">
            ${pdsLogoSVG("footer")}
            <div class="pds-footer__text">
              <span class="pds-footer__company">Proactive Development Solutions</span>
              <span class="pds-footer__rights">جميع الحقوق محفوظة</span>
            </div>
          </div>
          <div class="pds-footer__instructor">
            <span class="pds-footer__instructor-label">المدرب:</span>
            <span class="pds-footer__instructor-name">كوتش محمود فؤاد</span>
          </div>
        </div>
      </footer>
    `;
  }

  /* ════════════════════════════════════════════════════════════
     ربط الأحداث: فتح/إغلاق modal، scroll للـHero
     ──────────────────────────────────────────────────────────── */
  function pdsWireEvents() {
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-action='pds-open-instructor']");
      if (trigger) {
        e.preventDefault();
        pdsOpenInstructorModal();
        return;
      }
      const close = e.target.closest("[data-action='pds-close-instructor']");
      if (close) {
        e.preventDefault();
        pdsCloseInstructorModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") pdsCloseInstructorModal();
    });
  }

  function pdsOpenInstructorModal() {
    const modal = document.getElementById("pdsInstructorModal");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
  }

  function pdsCloseInstructorModal() {
    const modal = document.getElementById("pdsInstructorModal");
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
    }, 400);
  }

  /* ════════════════════════════════════════════════════════════
     Init: تركيب الـHero و الـModal في الصفحة
     ──────────────────────────────────────────────────────────── */
  function pdsInit(opts = {}) {
    // opts: { heroMount: selector, modalMount: selector|null, autoFooter: bool }
    const heroMount = opts.heroMount && document.querySelector(opts.heroMount);
    if (heroMount && !document.getElementById("pdsHero")) {
      heroMount.insertAdjacentHTML("afterbegin", pdsHeroSection());
    }
    if (!document.getElementById("pdsInstructorModal")) {
      document.body.insertAdjacentHTML("beforeend", pdsInstructorModal());
    }
    pdsWireEvents();
    pdsInitScrollReveal();
  }

  /* Scroll-triggered reveal */
  function pdsInitScrollReveal() {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    setTimeout(() => {
      document.querySelectorAll(".pds-reveal").forEach(el => io.observe(el));
    }, 100);
  }

  /* helper */
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  /* تعريض للنطاق العام */
  global.PDS = {
    config: PDS_CONFIG,
    init: pdsInit,
    hero: pdsHeroSection,
    brand: pdsBrandBlock,
    logo: pdsLogoSVG,
    modal: pdsInstructorModal,
    cta: pdsReigniteCTA,
    footer: pdsFooter,
    openInstructor: pdsOpenInstructorModal,
    closeInstructor: pdsCloseInstructorModal
  };
})(window);
