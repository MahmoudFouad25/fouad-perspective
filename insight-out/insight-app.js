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
    { q: "جسمك بيعمل إيه أول ما الضغط يجي؟",
      a: "قبل ما تفكّر، جسمك بيكون اتحرّك. اندفع، أو استنّى إشارة، أو سحب نفسه. الحركة دي ليها معنى." },
    { q: "نظرك بيروح فين؟",
      a: "جوّه كل واحد فينا كشّاف بيوجّه انتباهه قبل وعيه. لجوّه، أو لبرّه، أو متأرجح. والكشّاف ده بيحكم اللي بتشوفه من غير ما تحسّ." },
    { q: "بيحصل إيه لمشاعرك؟",
      a: "الانفعال بيوصل لقلبك ويتعاش ويمضي؟ ولا بيتعطّل في السكة؟ وعند كل واحد بيتعطّل في مكان مختلف." },
    { q: "عقلك بينظّم العالم إزاي؟",
      a: "المعلومة الجديدة بتدخل دماغك، بيعمل بيها إيه في أول ثانية؟ بيصبّها في إطار جاهز، ولا بيولّد منها فكرة جديدة، ولا بيعلّقها في ميزان لحد ما يفهمها؟" },
    { q: "اللي بيحرّكك إيه فعلاً؟",
      a: "الوقود اللي بيمشّيك، حبّ وشغف صافي، ولا خوف لابس ثوب الإنجاز؟ نفس الشغل ممكن يتعمل بوقودين مختلفين، والفرق بينهم هو الفرق بين إنك تشتعل وإنك تحترق." },
    { q: "قيمتك معلّقة على إيه؟",
      a: "فيه شرط خفي كل واحد فينا علّق عليه إحساسه بقيمته، من غير ما يدري. أول ما تشوف الشرط ده، بيخفّ سلطانه عليك." },
    { q: "الأثر القديم اللي لسه شغّال فيك",
      a: "حاجة حصلت زمان، وانطوت، بس لسه بتكتب بعض ردود فعلك دلوقتي من غير ما تاخد بالك. أعمق مرآة، وأكترهم تحرير." },
  ];

  /* ── محطّات العزم الثماني: كل واحدة بتفكّ عقدة ── */
  const STATIONS = [
    { t: "نهدم اللي إنت فاكره",
      d: "هتكتشف إن مشكلتك مش معلومات. لو كانت معلومات، كنت حسمت من زمان. فيه حاجة تانية بتمسكك، وحنكتشفها سوا." },
    { t: "نفرّق بين نوعين القرار",
      d: "قرار يحسمه التحليل، وقرار يُصنَع بالالتزام. وبتكتشف إنك كنت بتعامل قرارك الصعب كإنه سهل، فقاعد تدوّر على إجابة مش موجودة." },
    { t: "نرجّعلك إحساسك",
      d: "العقل لوحده مش بيقرّر، محتاج ميل في القلب. بس مش كل إحساس صادق، أحياناً اللي بنسمّيه حدس بيكون خوف متنكّر. وهنتعلّم نفرّق بين الاتنين." },
    { t: "ليه بنهرب أصلاً؟",
      d: "السبب إنك خايف من حاجتين: المسؤولية، والندم. وإنت عارف مسارك من المقاييس، بتواجه نمط هروبك إنت بالذات، وتشوف إنه نفس مسارك وهو شغّال بالخوف." },
    { t: "نحرّرك من انتظار اليقين",
      d: "القرارات الكبيرة بتغيّرك إنت. بدل ما تسأل هل ده هيسعدني، بتسأل: هل أنا مستعدّ أخوض وأكتشف، وواثق إني أقدر أتعامل مع اللي جاي؟" },
    { t: "من إنك تلاقي الإجابة لإنك تصنعها",
      d: "لما تخلص الأسباب، إنت بتختار وتقف ورا اختيارك بقلبك، وبكده إنت اللي بتخلّيه الصح. وهنا بتعلن قرارك قدام المجموعة، وتقف وراه." },
    { t: "نظبط الأولويات",
      d: "اللي مش عارف يظبط أولوياته بيدوّر عليها كإنها موجودة. والأولويات بتتقرّر مش بتتلاقى، وبتنبع من إنت قرّرت تبقى مين." },
    { t: "إزاي تعيش قرارك بعد ما تاخده",
      d: "القرار مش لحظة بتعدّي، ده موقف بتحافظ عليه. هتتعلّم ما تنقُضش قرارك أول ما الشك يرجع، وتبني حكايتك عنه، وتتصالح مع الطريق اللي ما اخترتهوش." },
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
