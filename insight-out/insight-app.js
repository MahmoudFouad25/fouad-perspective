/* ============================================================================
   Insight Out — تفاعلات الصفحة والمحتوى
   ----------------------------------------------------------------------------
   مسؤول عن: المرايا السبع (أكورديون)، محطّات العزم الثماني، الظهور عند التمرير،
   حالة شريط التنقل، والشريط الثابت على الموبايل.
   التسعير والحجز والكوبونات كلها في insight-engine.js (منفصل تماماً).
   ============================================================================ */

(function () {
  "use strict";

  const AR = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  const toAr = (n) => String(n).replace(/\d/g, (d) => AR[d]);

  /* ── المرايا السبع: من السطح للعمق ── */
  const MIRRORS = [
    { q: "تحت الضغط، جسمك بيعمل إيه في أول ثانية؟",
      a: "قبل ما عقلك يفكّر، جسمك بيتحرّك ناحية، أو ضد، أو بعيد. الحركة دي بتقول عنك أكتر مما تتخيّل." },
    { q: "نظرك بيروح فين وإنت بتتحرّك؟",
      a: "فيه حاجة عينك بتروحلها أول، وحاجة بتعديها — وده بيكشف كتير عن اللي بتركّز عليه من غير ما تحسّ." },
    { q: "بيحصل إيه للإحساس وهو بييجي على قلبك؟",
      a: "فيه إحساس بيوصلك كامل وتعيشه ويمضي، وفيه بيتمسك أو بينقلب قبل ما تحسّ بيه أصلاً. وكل واحد فينا بيتعطّل عنده الإحساس في مكان مختلف." },
    { q: "عقلك بينظّم الدنيا إزاي؟",
      a: "قدام أي معلومة جديدة، عقلك بيعمل بيها إيه؟ بيصبّها في قالب جاهز، ولا بيوزنها لحد ما يفهمها، ولا بيخلق منها فكرة جديدة؟" },
    { q: "إيه اللي بيحرّكك من جوّه فعلاً؟",
      a: "تحت كل تصرّفاتك فيه وقود واحد بيشغّلها. نفس الشغل ممكن يتعمل بحب وشغف، أو بخوف لابس ثوب الإنجاز — والفرق بينهم هو الفرق بين إنك تشتعل وإنك تحترق." },
    { q: "بتستمدّ قيمتك منين؟",
      a: "فيه شرط خفي كل واحد فينا علّق عليه إحساسه بقيمته من غير ما يدري. وأول ما تشوف الشرط ده، بيخفّ سلطانه عليك." },
    { q: "إيه اللي حصل وما زال شغّال فيك من غير ما تدري؟",
      a: "أعمق مرآة، وأكترهم تحرير. مش السؤال إيه اللي حصلك زمان، لكن إيه اللي لسه بيكتب بعض ردود فعلك دلوقتي وإنت مش واخد بالك." },
  ];

  /* ── محطّات العزم الثماني: كل واحدة بتفتح باب ── */
  const STATIONS = [
    { t: "المشكلة مش اللي فاكرها",
      d: "لو قرارك كان محتاج معلومات، كنت حسمته من زمان. فيه حاجة تانية بتمسكك، وهنكتشفها سوا." },
    { t: "فيه نوعين قرارات",
      d: "بتتعلّم تفرّق بين قرار ليه إجابة صح بتدوّر عليها، وقرار مفيش فيه أحسن حقيقي. وأغلب التعب بييجي من إننا بنخلط بين الاتنين." },
    { t: "جسمك بيعرف قبلك",
      d: "بترجع تسمع إحساسك بعد ما كنت قافل عليه، وبتتعلّم تفرّق بين ميل قلبك الحقيقي، وبين الخوف وهو لابس لبس الحدس." },
    { t: "ليه بنهرب أصلاً",
      d: "أعمق محطة. بتشوف إنك مش عاجز عن القرار، إنت بتتجنّبه خوفًا من المسؤولية ومن الندم. ولما تشوف طريقتك في الهروب بوضوح، تبطّل تقدر تخبّيها عن نفسك." },
    { t: "إنت مش حتعرف، وده طبيعي",
      d: "القرارات الكبيرة بتغيّرك إنت، فمستحيل تتأكد من النتيجة قبل ما تعيشها. بترتاح لمّا تسيب المطلب المستحيل ده، وتثق إنك حتقدر تتعامل مع اللي جاي." },
    { t: "من إنك تلاقي الإجابة، لإنك تصنعها",
      d: "ذروة الرحلة. لما الأسباب تخلص، إنت اللي بتختار وتقف ورا اختيارك، وبكده بتصنع الصواب مش بتدوّر عليه. وهنا بتعلن قرارك قدام المجموعة." },
    { t: "الأولويات بتتقرّر، مش بتتلاقى",
      d: "مش حتلاقي أولوياتك بتفكير أكتر — بتقرّرها، نابعة من مين قرّرت تكون. وهنا بيهدا التشتت، لأن بقى فيه بوصلة جوّاك." },
    { t: "تعيش قرارك بعد ما تاخده",
      d: "القرار مش لحظة بتعدّي، ده موقف بتحافظ عليه. بتتعلّم تثبت لما الشك يرجع، وتتصالح مع الطريق اللي ما اخترتوش." },
  ];

  /* ── بناء المرايا السبع ── */
  function renderMirrors() {
    const host = document.getElementById("mirrorsList");
    if (!host) return;
    host.innerHTML = MIRRORS.map((m, i) => `
      <div class="mirror-item" data-i="${i}">
        <div class="mirror-q">
          <span class="mirror-num eastern-num">${toAr(String(i + 1).padStart(2, "0"))}</span>
          <span class="mirror-q-text">${m.q}</span>
          <button class="mirror-toggle" aria-label="افتح" aria-expanded="false">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <div class="mirror-a"><div class="mirror-a-inner">${m.a}</div></div>
      </div>`).join("");

    host.querySelectorAll(".mirror-item").forEach((el) => {
      const q = el.querySelector(".mirror-q");
      const btn = el.querySelector(".mirror-toggle");
      q.addEventListener("click", () => {
        const open = el.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ── بناء محطّات العزم ── */
  function renderStations() {
    const host = document.getElementById("stationsList");
    if (!host) return;
    host.innerHTML = STATIONS.map((s, i) => `
      <div class="station">
        <span class="s-num eastern-num">${toAr(i + 1)}</span>
        <div>
          <h4>${s.t}</h4>
          <p>${s.d}</p>
        </div>
      </div>`).join("");
  }

  /* ── الظهور التدريجي عند التمرير ── */
  function setupReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    const vh = window.innerHeight || document.documentElement.clientHeight;
    items.forEach((el) => {
      el.classList.add("reveal");
      if (el.getBoundingClientRect().top < vh - 40) el.classList.add("in");
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.06, rootMargin: "0px 0px -40px 0px" });
      items.forEach((el) => { if (!el.classList.contains("in")) io.observe(el); });
    } else {
      items.forEach((el) => el.classList.add("in"));
    }
    setTimeout(() => items.forEach((el) => el.classList.add("in")), 2200);
  }

  /* ── شريط التنقل: حالة عند التمرير ── */
  function setupNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── الشريط الثابت (موبايل) ── */
  function setupStickyBar() {
    const bar = document.getElementById("stickyBar");
    const anchor = document.getElementById("packages");
    if (!bar || !anchor) return;
    const onScroll = () => {
      const past = anchor.getBoundingClientRect().top < window.innerHeight * 0.5;
      const nearFoot = (window.innerHeight + window.scrollY) > (document.body.offsetHeight - 360);
      bar.classList.toggle("show", past && !nearFoot);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function init() {
    renderMirrors();
    renderStations();
    setupReveal();
    setupNav();
    setupStickyBar();

    // الشريط الثابت "احجز" → ينزل للحاسبة
    document.getElementById("stickyBookBtn")?.addEventListener("click", () => {
      document.getElementById("offer-calc")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
