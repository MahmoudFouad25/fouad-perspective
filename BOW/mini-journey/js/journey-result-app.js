/* ====================================================================
   منظور الفؤاد — هندسة العقلية — التقرير الدائم (Controller)
   يقرأ الكود من الـ URL (?c=XXXX-XXXX)، يجيب البصمة من Firebase،
   ويبني صفحة التقرير الكاملة بشكل بسيط ونظيف.

   وضع المعاينة للتجربة بدون Firebase:
     journey-result.html?preview=1&axis=tamasok&door=hemma&flavor=1&level=level_3&burnout=muhtariq&name=محمود
   يعتمد على: result-codes.js + journey-content.js + journey-data.js
   ──────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const CONFIG = {
    contactWhatsapp: "",            // رقم محمود (كود الدولة بدون +) — لزرّ "تواصل"
    courseUrl: "#"                  // لينك الدورة لمّا يجهز
  };

  const ACCENT = {
    tamasok:   { c: "#d4af37", deep: "#b4862e", glow: "rgba(212,175,55,.22)" },
    hayawiyya: { c: "#e76f51", deep: "#c0492f", glow: "rgba(231,111,81,.22)" },
    intima:    { c: "#4a90e2", deep: "#2f6fbf", glow: "rgba(74,144,226,.22)" }
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
        return renderError("الكود مش مكتمل", "الكود مكوّن من ٨ خانات (مثال K7M2-P9X4). تأكّد إنك نسخته بالظبط، أو اكتبه تحت.", true);
      }

      renderLoading();
      const data = await window.MFPJourney.fetchByCode(code);
      renderReport(data);

    } catch (err) {
      const m = (err && err.message) || "";
      if (m === "INVALID_CODE")      renderError("الكود مش صحيح", "الكود مكوّن من ٨ خانات. تأكّد إنك نسخته بالظبط.", true);
      else if (m === "NOT_FOUND")    renderError("الكود ده مش موجود عندنا", "يا إمّا مكتوب غلط، يا إمّا التقرير لسه ما اتسجّلش. راجع رسالتك ولو الموضوع مستمرّ كلّمنا.", true);
      else if (m === "NO_FIREBASE")  renderError("التقرير مش متاح دلوقتي", "الصفحة دي محتاجة اتّصال بقاعدة البيانات. لو إنت بتجرّب محليًّا — استخدم وضع المعاينة (preview).", false);
      else { console.error(err); renderError("في عطل في الاتّصال", "حدّث الصفحة بعد ثانية. لو استمرّ، كلّمنا.", false); }
    }
  }

  /* ── معاينة (بدون Firebase) ── */
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

  /* ── حالات ثابتة ── */
  function brandStrip() {
    return `
      <div class="top-strip">
        <div class="brand">
          <span class="brand__dot"></span>
          <span class="brand__name">منظور الفؤاد</span>
          <span class="brand__tag">· هندسة العقلية</span>
        </div>
      </div>`;
  }

  function renderLoading() {
    app.innerHTML = `${brandStrip()}
      <div class="state-page"><div class="state-inner">
        <div class="loader"></div>
        <p class="state-sub">بنحضّر بصمتك…</p>
      </div></div>`;
  }

  function renderCodeEntry(prefill) {
    app.innerHTML = `${brandStrip()}
      <div class="state-page"><div class="state-inner">
        <h1 class="state-title">تقريرك في انتظارك</h1>
        <p class="state-sub">اكتب الكود اللي وصلك — ٨ خانات (مثال <b>K7M2-P9X4</b>).</p>
        <form class="code-form" id="codeForm">
          <input type="text" id="codeInput" placeholder="X X X X — X X X X" maxlength="9"
                 autocomplete="off" autocapitalize="characters" spellcheck="false" value="${prefill || ""}">
          <button type="submit" class="r-btn r-btn--primary">افتح</button>
        </form>
      </div></div>`;
    wireCodeForm();
  }

  function renderError(title, msg, showForm) {
    app.innerHTML = `${brandStrip()}
      <div class="state-page"><div class="state-inner">
        <h1 class="state-title">${esc(title)}</h1>
        <p class="state-sub">${esc(msg)}</p>
        ${showForm ? `
          <form class="code-form" id="codeForm">
            <input type="text" id="codeInput" placeholder="X X X X — X X X X" maxlength="9"
                   autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button type="submit" class="r-btn r-btn--primary">جرّب تاني</button>
          </form>` : ``}
      </div></div>`;
    if (showForm) wireCodeForm();
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

    document.title = `بصمة ${name} — هندسة العقلية`;

    app.innerHTML = `
      <div class="progress-rail"><div class="progress-fill" id="progressFill"></div></div>
      ${brandStrip()}

      <!-- HERO -->
      <section class="scene hero">
        <div class="hero-ring" aria-hidden="true"></div>
        <div class="scene-inner hero-inner">
          <p class="greeting reveal">أهلًا يا <strong>${esc(name)}</strong></p>
          <p class="hero-eyebrow reveal d2">بصمتك في هندسة العقلية</p>
          <h1 class="hero-name reveal d3">${esc(fpName)}</h1>
          ${axisQ ? `<p class="hero-q reveal d4">سؤالك الجوهري: «${esc(axisQ)}»</p>` : ``}
          <p class="hero-formula reveal d5">${esc(axisName)} · ${esc(doorName)} · ${esc(flavorName)}</p>
        </div>
        <div class="scroll-cue" aria-hidden="true">انزل</div>
      </section>

      <!-- المستوى -->
      <section class="scene">
        <div class="scene-inner">
          <p class="eyebrow reveal">الطبقة الأولى — مستواك</p>
          <h2 class="title reveal d2">${esc(levelText)}</h2>
        </div>
      </section>

      <!-- المحور -->
      <section class="scene tint">
        <div class="scene-inner">
          <p class="eyebrow reveal">الطبقة الثانية — محورك الرئيسي</p>
          <h2 class="title reveal d2"><em>${esc(axisName)}</em></h2>
          <div class="prose reveal d3">${paras(axisProse)}</div>
        </div>
      </section>

      <!-- الباب والنكهة -->
      <section class="scene">
        <div class="scene-inner">
          <p class="eyebrow reveal">الطبقة الثالثة — بابك ونكهتك</p>
          <div class="duo reveal d2">
            <div class="duo-cell"><span class="duo-k">بابك</span><span class="duo-v">${esc(doorName)}</span></div>
            <div class="duo-cell"><span class="duo-k">نكهتك (طابعك)</span><span class="duo-v">${esc(flavorName)}</span></div>
          </div>
          <div class="prose reveal d3">${paras(flavorProse)}</div>
        </div>
      </section>

      <!-- البصمة الكاملة -->
      <section class="scene hero-mini">
        <div class="scene-inner center">
          <p class="eyebrow reveal">بصمتك الكاملة</p>
          <h2 class="bigname reveal d2">${esc(fpName)}</h2>
          <p class="formula reveal d3"><b>${esc(axisName)}</b> · <b>${esc(doorName)}</b> · <b>${esc(flavorName)}</b></p>
        </div>
      </section>

      <!-- نوع الاحتراق -->
      <section class="scene tint">
        <div class="scene-inner">
          <p class="eyebrow reveal">الطبقة الأعمق — نوع احتراقك المُرشّح</p>
          <h2 class="title reveal d2">${esc(burnName)}</h2>
          ${burnDesc ? `<p class="prose reveal d3"><span>${esc(burnDesc)}</span></p>` : ``}
        </div>
      </section>

      ${ hasCov ? `
      <!-- الميثاق -->
      <section class="scene">
        <div class="scene-inner">
          <p class="eyebrow reveal">ميثاقك</p>
          <div class="cov reveal d2">
            <div class="cov-row"><span class="cov-k">السطر الأول</span><p class="cov-t">${esc(cov.line1 || "—")}</p></div>
            <div class="cov-row"><span class="cov-k">الالتزام المخفي</span><p class="cov-t">«${esc(cov.line2)}»</p></div>
            <div class="cov-row"><span class="cov-k">خطوتي الأسبوع الجاي</span><p class="cov-t">«${esc(cov.line3)}»</p></div>
          </div>
        </div>
      </section>` : `` }

      <!-- المسارات -->
      <section class="scene tint">
        <div class="scene-inner">
          <p class="eyebrow reveal">طريقك في الدورة الكاملة</p>
          <div class="chips reveal d2">
            ${paths.map(p => `<span class="chip">${esc(p)}</span>`).join("")}
          </div>
          <p class="prose reveal d3"><span>دي المسارات اللي بنشتغل عليها في الدورة الكاملة — بالتفصيل وبالأدوات العملية. النهارده عرفت بصمتك؛ في الدورة بتدوقها وتتعمّق فيها.</span></p>
        </div>
      </section>

      <!-- الخاتمة -->
      <section class="scene closing">
        <div class="scene-inner center">
          <p class="verse reveal">﴿إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّى يُغَيِّرُوا مَا بِأَنْفُسِهِمْ﴾</p>
          <p class="verse-src reveal d2">الرعد — ١١</p>
          <p class="closing-quote reveal d3">الإنسان مش مخلوق عشان يحترق. هو مخلوق عشان يتزن. والاتزان رحلة، مش لحظة.</p>
          <div class="cta reveal d4">
            <button type="button" class="r-btn" id="pdfBtn">احفظ بصمتك PDF</button>
            <button type="button" class="r-btn" id="shareBtn">شارك بصمتك</button>
            ${ CONFIG.courseUrl && CONFIG.courseUrl !== "#"
                ? `<a class="r-btn r-btn--primary" href="${CONFIG.courseUrl}" target="_blank" rel="noopener">الدورة الكاملة</a>`
                : `<a class="r-btn r-btn--primary" href="#" aria-disabled="true">الدورة الكاملة — قريبًا</a>` }
          </div>
          <p class="sign reveal d5">— محمود فؤاد · منظور الفؤاد</p>
        </div>
      </section>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("animate-on")));
    setupProgress();
    wireActions(d, fpName, name);
  }

  /* ── جلب نصوص الأصداء من CONTENT ── */
  function station(id) { return (window.CONTENT.stations || []).find(s => s.id === id); }
  function getAxisEcho(axis) {
    try { return station(4).interaction.q2.finalEchoes[axis] || ""; } catch (e) { return ""; }
  }
  function getFlavorEcho(flavor) {
    try { return station(5).interaction.q2.flavorEchoes[flavor] || ""; } catch (e) { return ""; }
  }
  // نشيل الفقرة الأخيرة اللي بتشاور على "المحطة الجاية" — لأنها سياق رحلة مش تقرير
  function trimJourneyTail(text) {
    if (!text) return "";
    return String(text).split(/\n+/)
      .filter(p => !/المحطة الجاية|هنفتح طبقة|هنحدد بابك/.test(p))
      .join("\n\n");
  }

  /* ── أزرار ── */
  function wireActions(d, fpName, name) {
    const pdfBtn = document.getElementById("pdfBtn");
    if (pdfBtn) pdfBtn.addEventListener("click", () => exportPDF(pdfBtn, name));

    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.addEventListener("click", () => share(name, fpName));
  }

  async function exportPDF(btn, name) {
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = "بنجهّز بصمتك…";
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
    const navyDeep = "#142338";
    const target = document.getElementById("app");
    const opt = {
      margin: 0,
      filename: `بصمة ${name || "بصمتي"} — هندسة العقلية.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: navyDeep, useCORS: true, logging: false, windowWidth: target.scrollWidth },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".scene", ".cov", ".duo"] }
    };
    try {
      if (typeof window.html2pdf === "function") await window.html2pdf().set(opt).from(target).save();
      else window.print();
    } catch (err) { console.error(err); window.print(); }
    finally { btn.disabled = false; btn.textContent = original; }
  }

  async function share(name, fpName) {
    const url = location.href;
    const text = `بصمة ${name || "—"} — هندسة العقلية\nالبصمة: ${fpName}\n\n— منظور الفؤاد`;
    if (navigator.share) {
      try { await navigator.share({ title: "بصمتي — هندسة العقلية", text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text + " " + url); toast("اتنسخ — ابعته للي تحب"); }
    catch (e) { prompt("انسخ:", url); }
  }

  function setupProgress() {
    const bar = document.getElementById("progressFill");
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

  /* ── helpers ── */
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
