/* ====================================================================
   منظور الفؤاد — هندسة العقلية — التقرير الدائم (v2)
   ────────────────────────────────────────────────────────────────────
   إعادة كتابة كاملة:
   - يبدأ بـPDS Hero (الشركة + المدرب) — مرة واحدة في الأعلى
   - قصة متدفقة، مش تكرار للبطاقة
   - 7 مشاهد متسلسلة بدون مساحات فاضية
   - CTA Reignite بدل "الدورة الكاملة"
   - PDF محسّن
   ──────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const ACCENT = {
    tamasok:   { c: "#d4af37", deep: "#b4862e", glow: "rgba(212,175,55,.25)", name: "ذهبي" },
    hayawiyya: { c: "#e76f51", deep: "#c0492f", glow: "rgba(231,111,81,.25)", name: "ناري" },
    intima:    { c: "#4a90e2", deep: "#2f6fbf", glow: "rgba(74,144,226,.25)", name: "سماوي" }
  };

  const app = document.getElementById("app");
  document.addEventListener("DOMContentLoaded", boot);

  async function boot() {
    const params = new URLSearchParams(location.search);
    const code = params.get("c") || params.get("code");

    try {
      if (params.get("preview")) { renderReport(buildPreview(params)); return; }
      if (!code) { renderCodeEntry(); return; }

      if (window.ResultCodes && !window.ResultCodes.isValid(code)) {
        return renderError("الكود مش مكتمل", "الكود مكوّن من ٨ خانات (مثال K7M2-P9X4). تأكّد إنك نسخته بالظبط.", true);
      }

      renderLoading();
      const data = await window.MFPJourney.fetchByCode(code);
      renderReport(data);

    } catch (err) {
      const m = (err && err.message) || "";
      if (m === "INVALID_CODE")      renderError("الكود مش صحيح", "الكود مكوّن من ٨ خانات. تأكّد إنك نسخته بالظبط.", true);
      else if (m === "NOT_FOUND")    renderError("الكود ده مش موجود عندنا", "يا إمّا مكتوب غلط، يا إمّا التقرير لسه ما اتسجّلش.", true);
      else if (m === "NO_FIREBASE")  renderError("التقرير مش متاح دلوقتي", "حاول مرة تانية بعد قليل.", false);
      else { console.error(err); renderError("في عطل في الاتّصال", "حدّث الصفحة وحاول تاني.", false); }
    }
  }

  function buildPreview(p) {
    const axis   = p.get("axis")   || "tamasok";
    const door   = p.get("door")   || "hemma";
    const flavor = +(p.get("flavor") || 1);
    return {
      name: p.get("name") || "صاحبي",
      result_code: "PREV-IEW0",
      level: p.get("level") || "level_3",
      main_axis: axis,
      secondary_axis: p.get("sec") || null,
      door, flavor,
      fingerprint_name: window.BURNOUT_FINGERPRINTS[`${axis}_${flavor}`] || "",
      burnout_type: p.get("burnout") || "muhtariq",
      covenant: {
        line1: `محوري الرئيسي: ${window.AXIS_AR[axis] || ""}`,
        line2: p.get("l2") || "إن أنا ما أبانش ناقص",
        line3: p.get("l3") || "هرفض طلب واحد وأراقب اللي هيحصل"
      },
      fingerprint: { axis, door, flavor }
    };
  }

  /* ════════════════════════════════════════════════════════════
     حالات
     ──────────────────────────────────────────────────────────── */
  function renderLoading() {
    app.innerHTML = `
      ${window.PDS.brand({ showProgram: false })}
      <div class="r-state">
        <div class="r-state__inner">
          <div class="r-loader"></div>
          <p class="r-state__sub">بنحضّر بصمتك…</p>
        </div>
      </div>`;
  }

  function renderCodeEntry(prefill) {
    app.innerHTML = `
      ${pdsTopBar()}
      <div class="r-state">
        <div class="r-state__inner">
          <h1 class="r-state__title">تقريرك في انتظارك</h1>
          <p class="r-state__sub">اكتب الكود اللي وصلك — ٨ خانات (مثال <b>K7M2-P9X4</b>).</p>
          <form class="r-code-form" id="codeForm">
            <input type="text" id="codeInput" placeholder="X X X X — X X X X" maxlength="9"
                   autocomplete="off" autocapitalize="characters" spellcheck="false" value="${prefill || ""}">
            <button type="submit" class="pds-btn pds-btn--primary">افتح</button>
          </form>
        </div>
      </div>`;
    wireCodeForm();
  }

  function renderError(title, msg, showForm) {
    app.innerHTML = `
      ${pdsTopBar()}
      <div class="r-state">
        <div class="r-state__inner">
          <h1 class="r-state__title">${esc(title)}</h1>
          <p class="r-state__sub">${esc(msg)}</p>
          ${showForm ? `
            <form class="r-code-form" id="codeForm">
              <input type="text" id="codeInput" placeholder="X X X X — X X X X" maxlength="9"
                     autocomplete="off" autocapitalize="characters" spellcheck="false">
              <button type="submit" class="pds-btn pds-btn--primary">جرّب تاني</button>
            </form>` : ``}
        </div>
      </div>`;
    if (showForm) wireCodeForm();
  }

  function pdsTopBar() {
    return `
      <div class="r-topbar">
        ${window.PDS.brand({ showProgram: true })}
      </div>`;
  }

  function wireCodeForm() {
    const input = document.getElementById("codeInput");
    if (!input) return;
    input.addEventListener("input", (e) => {
      let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4, 8);
      e.target.value = v;
    });
    document.getElementById("codeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (code) location.search = "?c=" + encodeURIComponent(code);
    });
    input.focus();
  }

  /* ════════════════════════════════════════════════════════════
     التقرير الكامل
     ──────────────────────────────────────────────────────────── */
  function renderReport(d) {
    const axis = d.main_axis;
    const ac = ACCENT[axis] || ACCENT.tamasok;
    document.documentElement.style.setProperty("--accent", ac.c);
    document.documentElement.style.setProperty("--accent-deep", ac.deep);
    document.documentElement.style.setProperty("--accent-glow", ac.glow);
         injectSelfStrategyStyles();   // ← ضيف السطر ده


    const name      = (d.name || "").trim() || "صاحبي";
    const axisName  = window.AXIS_AR[axis] || "—";
    const axisQ     = window.AXIS_QUESTION[axis] || "";
    const levelText = window.LEVEL_AR[d.level] || "—";
    const doorName  = window.DOOR_AR[d.door] || "—";
    const flavorName= window.FLAVOR_AR[d.flavor] || "—";
    const fpName    = d.fingerprint_name || window.BURNOUT_FINGERPRINTS[`${axis}_${d.flavor}`] || "—";
    const burnName  = window.BURNOUT_AR[d.burnout_type] || "—";
    const burnDesc  = window.BURNOUT_DESC[d.burnout_type] || "";
    const paths     = window.AXIS_PATHS[axis] || [];
    const cov       = d.covenant || {};
    const hasCov    = !!(cov.line2 && cov.line3);

    const axisProse   = trimJourneyTail(getAxisEcho(axis));
    const flavorProse = trimJourneyTail(getFlavorEcho(d.flavor));

    document.title = `بصمة ${name} — Reignite`;

    app.innerHTML = `
      <div class="r-progress-rail"><div class="r-progress-fill" id="rProgressFill"></div></div>

      ${pdsTopBar()}

      <!-- PDS Hero — يظهر مرة واحدة في الأعلى -->
      <div id="rHeroMount"></div>

      <!-- المشهد ١: الترحيب الشخصي -->
      <section class="r-scene r-scene--welcome">
        <div class="r-scene__inner">
          <p class="r-scene__greeting pds-reveal">أهلًا يا <strong>${esc(name)}</strong></p>
          <p class="r-scene__eyebrow pds-reveal">بصمتك في برنامج Reignite</p>
          <div class="r-scene__divider pds-reveal" aria-hidden="true"></div>
          <p class="r-scene__welcome-text pds-reveal">
            دي بصمتك الكاملة من رحلة "هندسة العقلية" — مرحلة الأساس قبل البرنامج التحويلي الكامل.
            احفظ الرابط، وارجعله أي وقت.
          </p>
        </div>
      </section>

      <!-- المشهد ٢: اسم البصمة — الذروة -->
      <section class="r-scene r-scene--fingerprint">
        <div class="r-scene__inner r-center">
          <div class="r-fp-ring pds-reveal" aria-hidden="true"></div>
          <p class="r-fp__eyebrow pds-reveal">بصمتك</p>
          <h1 class="r-fp__name pds-reveal">${esc(fpName)}</h1>
          ${axisQ ? `<p class="r-fp__question pds-reveal">«${esc(axisQ)}»</p>` : ``}
          <div class="r-fp__formula pds-reveal">
            <span class="r-fp__formula-cell">
              <span class="r-fp__formula-label">المحور</span>
              <span class="r-fp__formula-value">${esc(axisName)}</span>
            </span>
            <span class="r-fp__formula-sep" aria-hidden="true">·</span>
            <span class="r-fp__formula-cell">
              <span class="r-fp__formula-label">الباب</span>
              <span class="r-fp__formula-value">${esc(doorName)}</span>
            </span>
            <span class="r-fp__formula-sep" aria-hidden="true">·</span>
            <span class="r-fp__formula-cell">
              <span class="r-fp__formula-label">النكهة</span>
              <span class="r-fp__formula-value">${esc(flavorName)}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- المشهد ٣: قراءة محورك -->
      <section class="r-scene r-scene--axis">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num">٠١</span>
            <div>
              <p class="r-scene__kicker">طبقتك الأولى</p>
              <h2 class="r-scene__title">محور <em>${esc(axisName)}</em></h2>
            </div>
          </div>
          <div class="r-prose pds-reveal">${paras(axisProse)}</div>
        </div>
      </section>

      <!-- المشهد ٤: قراءة بابك ونكهتك -->
      <section class="r-scene r-scene--flavor">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num">٠٢</span>
            <div>
              <p class="r-scene__kicker">طبقتك الثانية</p>
              <h2 class="r-scene__title">طابع <em>${esc(flavorName)}</em> — في باب ${esc(doorName)}</h2>
            </div>
          </div>
          <div class="r-prose pds-reveal">${paras(flavorProse)}</div>
        </div>
      </section>
      ${ buildSelfStrategyScene(d) }

      <!-- المشهد ٥: نوع الاحتراق + المستوى -->
      <section class="r-scene r-scene--burnout">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num">٠٣</span>
            <div>
              <p class="r-scene__kicker">طبقتك الأعمق</p>
              <h2 class="r-scene__title">${esc(burnName)}</h2>
            </div>
          </div>
          ${burnDesc ? `<p class="r-prose pds-reveal">${esc(burnDesc)}</p>` : ``}
          <div class="r-level pds-reveal">
            <span class="r-level__label">مستواك الحالي:</span>
            <span class="r-level__value">${esc(levelText)}</span>
          </div>
        </div>
      </section>

      ${ hasCov ? `
      <!-- المشهد ٦: الميثاق -->
      <section class="r-scene r-scene--covenant">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num">٠٤</span>
            <div>
              <p class="r-scene__kicker">عهدك مع نفسك</p>
              <h2 class="r-scene__title">ميثاقك</h2>
            </div>
          </div>
          <div class="r-cov pds-reveal">
            <div class="r-cov__row">
              <span class="r-cov__num">١</span>
              <div class="r-cov__body">
                <span class="r-cov__label">محورك الرئيسي</span>
                <p class="r-cov__text">${esc(cov.line1 || "—")}</p>
              </div>
            </div>
            <div class="r-cov__row">
              <span class="r-cov__num">٢</span>
              <div class="r-cov__body">
                <span class="r-cov__label">الالتزام المخفي اللي اكتشفته</span>
                <p class="r-cov__text">«${esc(cov.line2)}»</p>
              </div>
            </div>
            <div class="r-cov__row">
              <span class="r-cov__num">٣</span>
              <div class="r-cov__body">
                <span class="r-cov__label">خطوتك للأسبوع الجاي</span>
                <p class="r-cov__text">«${esc(cov.line3)}»</p>
              </div>
            </div>
          </div>
        </div>
      </section>` : `` }

      <!-- المشهد ٧: الطريق في Reignite -->
      <section class="r-scene r-scene--paths">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num">٠٥</span>
            <div>
              <p class="r-scene__kicker">في البرنامج الكامل</p>
              <h2 class="r-scene__title">طريقك في Reignite</h2>
            </div>
          </div>
          <p class="r-prose pds-reveal">دي المسارات اللي بنشتغل عليها في برنامج <strong>Reignite</strong> — من الاحتراق إلى الاشتعال، بالتفصيل والأدوات العملية:</p>
          <div class="r-paths pds-reveal">
            ${paths.map((p,i) => `
              <div class="r-path" style="--delay:${i * 0.15}s">
                <span class="r-path__num">${toArabicDigits(i+1)}</span>
                <span class="r-path__name">${esc(p)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <!-- المشهد الأخير: الدعوة + الآية -->
      <section class="r-scene r-scene--closing">
        <div class="r-scene__inner r-center">
          <p class="r-verse pds-reveal">﴿إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّى يُغَيِّرُوا مَا بِأَنْفُسِهِمْ﴾</p>
          <p class="r-verse-src pds-reveal">الرعد — ١١</p>

          <p class="r-closing-quote pds-reveal">
            الإنسان مش مخلوق عشان يحترق.<br>
            هو مخلوق عشان يتزن. والاتزان رحلة، مش لحظة.
          </p>

          <div class="r-cta-block pds-reveal">
            <p class="r-cta-block__intro">جاهز للخطوة الجاية؟</p>
            <p class="r-cta-block__title">برنامج <strong>Reignite</strong> هو رحلة تحويل كاملة، مبنية على بصمتك الفريدة دي.</p>
            <div class="r-cta-block__actions">
              ${window.PDS.cta({ variant: "primary", label: "اعرف أكتر عن Reignite" })}
              <button type="button" class="pds-btn pds-btn--ghost" id="rPdfBtn">احفظ بصمتك PDF</button>
              <button type="button" class="pds-btn pds-btn--ghost" id="rShareBtn">شارك بصمتك</button>
            </div>
          </div>

          <p class="r-sign pds-reveal">
            مع كوتش <strong>محمود فؤاد</strong>
            <br>
            <span class="r-sign-sub">برنامج Reignite من Proactive Development Solutions</span>
          </p>
        </div>
      </section>

      ${window.PDS.footer()}
    `;

    // ركّب الـHero
    window.PDS.init({ heroMount: "#rHeroMount" });

    // فعّل الـscroll reveal
    requestAnimationFrame(() => {
      document.body.classList.add("r-animate-on");
    });

    setupProgress();
    wireActions(d, fpName, name);
  }

  /* ── جلب نصوص الأصداء من CONTENT ── */
  function station(id) { return (window.CONTENT.stations || []).find(s => s.id === id); }
  function getAxisEcho(axis) {
    try { return station(4).interaction.axisDescriptions[axis] || ""; } catch (e) { return ""; }
  }
  function getFlavorEcho(flavor) {
    try { return station(5).interaction.q2.flavorEchoes[flavor] || ""; } catch (e) { return ""; }
  }
  function trimJourneyTail(text) {
    if (!text) return "";
    return String(text).split(/\n+/)
      .filter(p => !/المحطة الجاية|هنفتح طبقة|هنحدد بابك/.test(p))
      .join("\n\n");
  }

  function wireActions(d, fpName, name) {
    document.getElementById("rPdfBtn")?.addEventListener("click", (e) => exportPDF(e.currentTarget, name));
    document.getElementById("rShareBtn")?.addEventListener("click", () => share(name, fpName));
  }

  async function exportPDF(btn, name) {
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = "بنجهّز بصمتك…";
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}

    // أضف class للطباعة قبل التصدير
    document.body.classList.add("r-printing");
    await new Promise(r => setTimeout(r, 100));

    const target = document.getElementById("app");
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `بصمة ${name || "بصمتي"} — Reignite.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: "#142338",
        useCORS: true,
        logging: false,
        windowWidth: 800
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".r-scene", ".r-cov", ".r-path"] }
    };
    try {
      if (typeof window.html2pdf === "function") await window.html2pdf().set(opt).from(target).save();
      else window.print();
    } catch (err) { console.error(err); window.print(); }
    finally {
      document.body.classList.remove("r-printing");
      btn.disabled = false; btn.textContent = original;
    }
  }

  async function share(name, fpName) {
    const url = location.href;
    const text = `بصمة ${name || "—"} — Reignite\nالبصمة: ${fpName}\n\nمع كوتش محمود فؤاد\nProactive Development Solutions`;
    if (navigator.share) {
      try { await navigator.share({ title: "بصمتي — Reignite", text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text + "\n\n" + url); toast("اتنسخ — ابعته للي تحب"); }
    catch (e) { prompt("انسخ:", url); }
  }

  function setupProgress() {
    const bar = document.getElementById("rProgressFill");
    if (!bar) return;
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      bar.style.width = pct + "%";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

   /* ════════════════════════════════════════════════════════════
     الطريقة اللي اخترها بنفسه (محطة ٣) — في التقرير الدائم
     ──────────────────────────────────────────────────────────── */
  function injectSelfStrategyStyles() {
    if (document.getElementById("r-self-strategy-styles")) return;
    const s = document.createElement("style");
    s.id = "r-self-strategy-styles";
    s.textContent = `
    .r-self-strategy{margin-top:6px;background:rgba(255,255,255,.025);border:1px solid var(--accent-glow,rgba(212,175,55,.25));border-radius:16px;padding:26px 24px;}
    .r-self-strategy__head{display:flex;align-items:center;gap:14px;margin-bottom:18px;}
    .r-self-strategy__icon{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-size:24px;flex-shrink:0;border:1.5px solid var(--accent,#d4af37);background:var(--accent-glow,rgba(212,175,55,.18));}
    .r-self-strategy__name{font-size:20px;font-weight:700;color:var(--accent,#d4af37);margin:0;line-height:1.3;}
    .r-self-strategy__tag{font-size:13px;color:var(--muted,#9aa3b2);margin:4px 0 0;}
    .r-self-strategy__voice{font-size:18px;line-height:1.9;color:var(--cream,#e7e3da);margin:0 0 14px;padding-inline-start:16px;border-inline-start:2px solid var(--accent,#d4af37);}
    .r-self-strategy__insight{margin:0;}
    @media (max-width:680px){.r-self-strategy{padding:22px 18px;}.r-self-strategy__voice{font-size:16px;}}`;
    document.head.appendChild(s);
  }

  function buildSelfStrategyScene(d) {
    const sid = d.choices && d.choices.station3_strategy;
    if (!sid) return "";
    const c = (window.STRATEGY_CARDS || []).find(x => x.id === sid);
    if (!c) return "";

    const fp = d.fingerprint || {};
    const flavor = (d.flavor != null) ? d.flavor : fp.flavor;
    const hasFlavor = flavor != null;
    const discovered = window.FLAVOR_AR[flavor] || "";

    let insight = "";
    if (hasFlavor) {
      insight = (c.order === flavor)
        ? `ولافت إن دي نفس طبقتك اللي اكتشفتها الرحلة (طابع ${esc(discovered)}) — وعيك بنفسك عالي، اللي حسّيته من بدري أكّدته الرحلة بالتفصيل.`
        : `ومثير للاهتمام إن اللي اخترته مختلف عن طابعك اللي اكتشفته الرحلة (طابع ${esc(discovered)}). الفرق ده مش غلط — هو مساحة غنية بين صورتك عن نفسك واللي اتكشف لما نزلنا أعمق، وده بالظبط شغل الرحلة الكاملة.`;
    }

    return `
      <!-- مشهد: الطريقة اللي اخترتها بنفسك -->
      <section class="r-scene r-scene--self-strategy">
        <div class="r-scene__inner">
          <div class="r-scene__head pds-reveal">
            <span class="r-scene__num" aria-hidden="true">✦</span>
            <div>
              <p class="r-scene__kicker">صورتك عن نفسك</p>
              <h2 class="r-scene__title">الطريقة اللي اخترتها بنفسك</h2>
            </div>
          </div>
          <div class="r-self-strategy pds-reveal">
            <div class="r-self-strategy__head">
              <span class="r-self-strategy__icon" aria-hidden="true">${c.icon || ""}</span>
              <div>
                <p class="r-self-strategy__name">${esc(c.name)}</p>
                <p class="r-self-strategy__tag">${esc(c.tag || "")}</p>
              </div>
            </div>
            <p class="r-self-strategy__voice">«${esc(c.front)}»</p>
            ${ insight ? `<p class="r-prose r-self-strategy__insight">${insight}</p>` : "" }
          </div>
        </div>
      </section>`;
  }

  /* helpers */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }
  function paras(text) {
    return String(text || "").split(/\n+/).map(t => t.trim()).filter(Boolean)
      .map(t => `<p>${esc(t)}</p>`).join("");
  }
  function toast(msg) {
    let t = document.querySelector(".r-toast");
    if (t) t.remove();
    t = document.createElement("div");
    t.className = "r-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-shown"));
    setTimeout(() => { t.classList.remove("is-shown"); setTimeout(() => t.remove(), 350); }, 2400);
  }
})();
