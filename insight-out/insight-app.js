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
      a: "قبل ما عقلك يفكّر, جسمك بيتحرّك ناحية, أو ضد, أو بعيد. الحركة دي بتقول عنك أكتر مما تتخيّل." },
    { q: "نظرك بيروح فين وإنت بتتحرّك؟",
      a: "فيه حاجة عينك بتروحلها أول, وحاجة بتعديها — وده بيكشف كتير عن اللي بتركّز عليه من غير ما تحسّ." },
    { q: "بيحصل إيه للإحساس وهو بييجي على قلبك؟",
      a: "فيه إحساس بيوصلك كامل وتعيشه ويمضي, وفيه بيتمسك أو بينقلب قبل ما تحسّ بيه أصلاً. وكل واحد فينا بيتعطّل عنده الإحساس في مكان مختلف." },
    { q: "عقلك بينظّم الدنيا إزاي؟",
      a: "قدام أي معلومة جديدة, عقلك بيعمل بيها إيه؟ بيصبّها في قالب جاهز, ولا بيوزنها لحد ما يفهمها, ولا بيخلق منها فكرة جديدة؟" },
    { q: "إيه اللي بيحرّكك من جوّه فعلاً؟",
      a: "تحت كل تصرّفاتك فيه وقود واحد بيشغّلها. نفس الشغل ممكن يتعمل بحب وشغف, أو بخوف لابس ثوب الإنجاز — والفرق بينهم هو الفرق بين إنك تشتعل وإنك تحترق." },
    { q: "بتستمدّ قيمتك منين؟",
      a: "فيه شرط خفي كل واحد فينا علّق عليه إحساسه بقيمته من غير ما يدري. وأول ما تشوف الشرط ده, بيخفّ سلطانه عليك." },
    { q: "إيه اللي حصل وما زال شغّال فيك من غير ما تدري؟",
      a: "أعمق مرآة, وأكترهم تحرير. مش السؤال إيه اللي حصلك زمان, لكن إيه اللي لسه بيكتب بعض ردود فعلك دلوقتي وإنت مش واخد بالك." },
  ];

  /* ── محطّات العزم الثماني: منهجية صناعة القرار ── */
  const STATIONS = [
    { t: "ليه بنفضل سنين قدّام قرار من غير ما ناخده؟",
      d: "ناس كتير عندها قرار شاغل بالها من شهور، أو سنين. تفتح الموضوع، تفكّر فيه، تأجّله، وترجعله تاني، من غير ما توصل لحاجة. وساعات بيقولوا لنفسهم: لسه ما عرفتش كفاية، لو بس أعرف أكتر كنت قررت. فيقعدوا يقروا ويسألوا ويقارنوا. بس خلّينا نبص للحقيقة: إنت قرأت وسألت وقارنت فعلاً، وبرضه واقف مكانك. لو كانت المعلومات هي الحل، كنت اتحرّكت من زمان. يبقى فيه حاجة تانية هي اللي بتأجّل القرار، مش قلّة المعلومات. وهنا بنبدأ نلاقيها مع بعض." },
    { t: "مش كل قرار بيتاخد بنفس الطريقة",
      d: "فيه قرارات ليها إجابة صح، إنت بس بتدوّر عليها. زي لما تشتري حاجة بميزانية، أو تختار دكتور كويس لعملية. دي بتتحل بالمقارنة، وكل ما تجمع معلومات أكتر بتقرّب من الصح. وفيه قرارات تانية مفيش فيها إجابة صح من الأساس. زي إنك تفضل في شغلك المريّح، ولا تسيبه لشغل أحسن بس متعِب. محدش يقدر يقولك أنهي أصح، لأن كل واحد فيهم بيكسبك حاجة ويفوّتك حاجة. والتعب بييجي لما نعامل القرار التاني زي الأول، ونقعد ندوّر على إجابة صح، وهي أصلاً مش موجودة. هنا بنتعلّم سوا نفرّق بين النوعين، وده لوحده بيوقّف نص الحيرة." },
    { t: "قلبك بيعرف، بس إحنا بطّلنا نسمعه",
      d: "لما القرار يتعب الواحد، بيحاول يحسمه بعقله بس، بالورق والجداول والمقارنات، وبيقفل على إحساسه خالص. والمفاجأة إن ده مش بس صعب، ده مستحيل. فيه ناس اتأذّى عندها الجزء الحسّي في المخ، وفضل عقلها وذكاؤها سليم تماماً، ومع ذلك بقت عاجزة تاخد أبسط قرار، حتى تختار تاكل إيه. لأن العقل لوحده، من غير إحساس يميله ناحية، مبيقدرش يحسم. هنا بنرجع نسمع قلوبنا تاني. وبنتعلّم نفرّق بين صوت قلبك الحقيقي، وبين الخوف اللي بيتنكّر في صورة حدس عشان يخليك واقف مكانك." },
    { t: "ليه بنهرب من القرار أصلاً؟",
      d: "دي أعمق محطة في الرحلة. لو القرار اللي مفيش له إجابة، حلّه إنك تختار وبس، يبقى ليه مش بنختار؟ ليه بنفضل نأجّل وندوّر؟ السبب إننا خايفين من حاجتين. الأولى المسؤولية: طول ما أنا ما قررتش، مفيش حاجة ذنبي، بس أول ما أقرّر بقيت أنا اللي حتحمّل لو طلع غلط. والتانية الندم: بتخيّل نفسي بعدين بقول يا ريتني عملت العكس، والإحساس ده مؤلم لدرجة إني بهرب منه قبل ما يحصل. وكل واحد بيهرب بطريقته: واحد بيأجّل، وواحد بيسيب غيره يقرّر له، وواحد بيستنّى علامة من السما مش جايّة. وهنا بنشوف طريقتنا في الهروب بوضوح، ولما تشوفها، بتعرف إنك مش عاجز عن القرار، إنت بتتجنّبه — وفيه فرق كبير." },
    { t: "إنك متبقاش متأكد، ده طبيعي مش نقص فيك",
      d: "فيه قرارات كبيرة بنفضل واقفين قدّامها سنين، مستنّيين لحظة نتأكد فيها. أتجوّز ولا لأ؟ أخلّف ولا لأ؟ أغيّر مجالي كله ولا لأ؟ وهنا بنتعلّم حاجة بترفع حمل كبير عن القلب: اليقين ده مش جايّ، ومش المفروض ييجي. ليه؟ لأن القرارات دي بتغيّرك إنت شخصياً. الواحد اللي حيبقى عنده عيال مش نفس الواحد القاعد دلوقتي بيفكّر يخلّف ولا لأ. فإزاي تحكم على حياة حيعيشها واحد تاني، هو إنت بعد ما اتغيّرت؟ ده زي ما تطلب تتذوّق أكلة قبل ما تدوقها. فبدل ما تستنّى يقين مستحيل، بنغيّر السؤال: مش هل ده حيسعدني، لكن هل أنا مستعد أخوض التجربة وأثق إني حأتعامل مع اللي حييجي؟ والسؤال ده ليه إجابة." },
    { t: "الصح مش بتلاقيه، إنت اللي بتصنعه",
      d: "دي ذروة الرحلة، واللحظة اللي كنا ماشيين ناحيتها من الأول. بعد ما نكون فهمنا إن فيه قرارات مفيش لها إجابة جاهزة، وإننا مش حنتأكد قبل ما نعيش، يبقى نعمل إيه؟ هنا بتختار، وتقف ورا اختيارك بقلبك، وبكده إنت اللي بتخلّيه الصح. زي اللي بيتجوّز: مكانش فيه ضمان إنها الزيجة الصح، بس هو التزم ووقف معاها، وبالوقوف ده خلّاها صح. لو كان استنّى الضمان، عمره ما كان اتجوّز. وفي اللحظة دي إنت مش بس بتاخد قرار، إنت بتقرّر تبقى مين. واللي بيفضل واقف من غير ما يختار، وبيسيب الأيام تقرّر عنه، ده هو اللي خسر فعلاً، لأنه ساب حياته تتكتب من برّه. هنا بتعلن قرارك قدّام ناس بتشهدك، والإعلان ده بيخلّيه أثقل وأصدق من قرار بتهمسه لنفسك وتنساه بكرة." },
    { t: "أولوياتك مش بتلاقيها، إنت اللي بتقرّرها",
      d: "ناس كتير بتتعب وهي بتحاول ترتّب أولوياتها، وتفضل تسأل: إيه الأهم؟ وكإن الأولوية حاجة مخبّية لازم تكتشفها. والحقيقة إنها حاجة بتقرّرها إنت. الأولوية بتنبع من إنك قرّرت تبقى مين. لو قرّرت إنك واحد عيلته أهم حاجة عنده، يبقى وقت عيلتك بقى أولوية، مش لأنك اكتشفت ده، لكن لأنك اخترته. فبدل ما نقعد نرتّب المهام على ورقة، بنرجع للسؤال الأعمق: إنت اخترت تبقى مين؟ وبناءً على ده، إيه اللي يستاهل وقتك، وإيه اللي تسيبه؟ ساعتها الأولوية بتبقى واضحة، والتشتت بيهدا، لأن بقى فيه بوصلة جوّاك." },
    { t: "القرار مش لحظة بتعدّي، ده موقف بتعيشه",
      d: "ناس كتير بتاخد القرار، وبعد كام يوم النفس بترجع تقول: هو أنا عملت صح؟ يا ريتني ما عملتش. خلّيني أرجع فيه. وآخر محطة بنتعلّم فيها إن القرار مش لحظة واحدة بتعدّي، ده موقف بتحافظ عليه على طول. بنتعلّم إن طبيعي الشك والندم يزوروك بعد أي قرار كبير، وده مش معناه إنك غلطت، ده بس النفس بتتعوّد على الطريق الجديد. وبنتعلّم إن أهم شغل بيحصل بعد القرار مش قبله: إنك تبني لنفسك حكاية عن ليه اخترت ده، وتعيشها، وتخلّيها جزء منك. وبنتصالح مع الطريق اللي ما اخترناهوش، نودّعه بسلام من غير ما نفضل نبص وراه طول العمر. وفي الآخر كل واحد بيقف قدّام المجموعة ويعلن التزامه، والمجموعة بتشهد. ودي اللحظة اللي القرار بيتختم فيها." },
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

  /* ── بناء رحلة العزم الحيّة (٨ نقط بتتوهّج للقرار) ── */
  function renderAzmJourney() {
    const g = document.getElementById("azmDots");
    if (!g) return;
    const NS = "http://www.w3.org/2000/svg";
    const N = 8;
    for (let i = 0; i < N; i++) {
      const x = 660 - (620 / (N - 1)) * i;   // RTL: من اليمين للشمال
      const isLast = i === N - 1;
      const r = isLast ? 13 : 6;
      const fill = isLast ? "url(#azmFinal)" : (i < 4 ? "#57D2C4" : "#E5B567");
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", 60); c.setAttribute("r", r);
      c.setAttribute("fill", fill); c.setAttribute("class", "azm-dot");
      g.appendChild(c);
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", 88);
      t.setAttribute("fill", isLast ? "#E5B567" : "#7F979C");
      t.setAttribute("font-size", "12"); t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "'Readex Pro', sans-serif");
      if (isLast) t.setAttribute("font-weight", "600");
      t.textContent = isLast ? "القرار" : toAr(i + 1);
      g.appendChild(t);
    }

    const viz = document.querySelector(".azm-viz");
    if (!viz) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lightUp = () => {
      const dots = viz.querySelectorAll(".azm-dot");
      if (reduce) { dots.forEach((d) => d.classList.add("lit")); return; }
      dots.forEach((d, i) => setTimeout(() => d.classList.add("lit"), 1200 + i * 350));
    };
    if ("IntersectionObserver" in window && !reduce) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { lightUp(); io.unobserve(e.target); }
        });
      }, { threshold: 0.3 });
      io.observe(viz);
    } else {
      lightUp();
    }
  }

  function init() {
    renderMirrors();
    renderStations();
    renderAzmJourney();
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
