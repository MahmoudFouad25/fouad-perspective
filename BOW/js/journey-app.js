/* ====================================================================
   منظور الفؤاد — هندسة العقلية — Journey App (المنطق)
   يعتمد على: journey-content.js (النصوص/الخرائط) + journey-data.js (الحفظ)
   الحفظ best-effort: لو Firebase مش موجود، الرحلة بتشتغل بالكامل من الذاكرة.
   ──────────────────────────────────────────────────────────────────── */

/* ===== إعدادات الرحلة ===== */
const JOURNEY_CONFIG = {
  // صفحة التقرير الدائم (نفس مجلّد BOW)
  resultPagePath: "journey-result.html",
  // رقم واتساب التواصل (محمود) مع كود الدولة وبدون + — مثال: "201001234567"
  // سيبه فاضي "" لو مش عاوز يظهر زرّ "ابعتلنا بصمتك".
  contactWhatsapp: ""
};

/* ===== غلاف آمن لطبقة الحفظ (مايكسرش لو الملف/Firebase ناقص) ===== */
const Persist = {
  register(user){
    try { return (window.MFPJourney ? window.MFPJourney.register(user) : Promise.resolve(null)); }
    catch (e){ console.warn("persist.register", e); return Promise.resolve(null); }
  },
  saveContact(id, contact){
    try { if (window.MFPJourney && id) return window.MFPJourney.saveContact(id, contact); }
    catch (e){ console.warn("persist.saveContact", e); }
    return Promise.resolve(null);
  },
  finalize(id, payload){
    try { if (window.MFPJourney && id) return window.MFPJourney.finalize(id, payload); }
    catch (e){ console.warn("persist.finalize", e); }
    return Promise.resolve(null);
  }
};

/* ============================================================
   journeyState — الحالة العامة للرحلة
   ============================================================ */
const journeyState = {
  participantId: null,   // معرّف المستند في Firebase (لو اتسجّل)
  resultCode:    null,   // كود فتح التقرير الدائم
  user: {
    name: "", email: "", job: "", ageRange: "", whatsapp: "",
    consentWhatsapp: false, consentFollowup: false
  },
  currentStation: 1,
  completedStations: [],
  choices: {
    station2_level: null,
    station3_firstThought: null,
    station4_axisMain: null, station4_axisSub: null,
    station5_door: null, station5_flavor: null,
    station6_signs: [],
    station7_covenant: { line1: "", line2: "", line3: "" }
  },
  fingerprint: {
    axis: null, door: null, flavor: null, name: null, burnoutType: null
  }
};

function buildRail(){
  const rail = document.getElementById("rail");
  rail.innerHTML = CONTENT.stations.map(s => `
    <li class="rail__item" data-station="${s.id}" role="button" tabindex="0"
        aria-label="المحطة ${toArabicDigits(s.id)}: ${s.title}">
      <span class="rail__dot" aria-hidden="true"></span>
      <span class="rail__label">${s.title}</span>
    </li>
  `).join("");

  // التنقل بالضغط على نقاط مكتملة أو الحالية
  rail.querySelectorAll(".rail__item").forEach(el => {
    const goId = +el.dataset.station;
    const handler = () => {
      const isReachable =
        journeyState.completedStations.includes(goId) ||
        goId === journeyState.currentStation ||
        goId === Math.max(...journeyState.completedStations, 0) + 1;
      if (isReachable) goToStation(goId);
    };
    el.addEventListener("click", handler);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
    });
  });
}

/* ============================================================
   بناء DOM المحطات (مرة واحدة)
   - المحطات اللي فيها interaction: مفيش placeholder + الزر مقفول
   - باقي المحطات: placeholder + زر مفتوح
   ============================================================ */
function buildStations(){
  const wrap = document.getElementById("stationContainer");
  const total = CONTENT.stations.length;

  wrap.innerHTML = CONTENT.stations.map((s, i) => {
    const isLast = i === total - 1;
    const hasIx  = !!s.interaction;
    const btnLabel = isLast ? CONTENT.ui.finish : CONTENT.ui.next;
    const lockClass = hasIx ? " is-locked" : "";

    return `
      <section class="station" data-station="${s.id}" data-screen-label="${toArabicDigits(s.id)} ${s.title}" aria-hidden="true">
        <header class="station-header">
          <div class="station-header__index">
            <span>المحطة ${toArabicDigits(s.id)} / ${toArabicDigits(total)}</span>
          </div>
          <h1 class="station-header__title">${s.title}</h1>
          <div class="station-header__meta">
            <span>${s.duration}</span>
            <span class="dot" aria-hidden="true"></span>
            <span>تجربة شخصية</span>
          </div>
        </header>

        <!-- مكان الفيديو (placeholder حتى يجي videoId) -->
        <div class="station-video" aria-label="${CONTENT.ui.videoPlaceholder}">
          <div class="station-video__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
          </div>
          <div class="station-video__label">${CONTENT.ui.videoPlaceholder}</div>
        </div>

        <!-- منطقة التفاعل (هتتبني بـ renderInteraction لو فيه interaction) -->
        <div class="station-interaction" data-role="interaction"></div>

        <!-- منطقة الصدى (مخفية لحد ما يظهر) -->
        <div class="station-echo" data-role="echo" aria-hidden="true"></div>

        ${ hasIx ? "" : `<p class="station-body__placeholder">${CONTENT.ui.bodyPlaceholder}</p>` }

        <!-- التنقل -->
        <div class="station-nav">
          <button type="button" class="btn-next${lockClass}" data-action="next" ${isLast ? "data-finish='1'" : ""}>
            <span>${btnLabel}</span>
            <span class="btn-next__arrow" aria-hidden="true">←</span>
          </button>
          <span class="completion-note" data-role="completion-note" hidden></span>
        </div>
      </section>
    `;
  }).join("");

  // ربط أزرار التالي
  wrap.querySelectorAll(".btn-next").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-locked")) return; // أمان إضافي
      const stationEl = btn.closest(".station");
      const id = +stationEl.dataset.station;
      completeStation(id);

      if (btn.dataset.finish === "1") {
        // اكتملت الرحلة — اعرض شاشة البصمة النهائية
        completeStation(id);
        showFingerprintScreen();
        return;
      }
      goToStation(id + 1);
    });
  });

  // ابني التفاعلات لكل محطة عندها interaction (مرة واحدة)
  CONTENT.stations.forEach(s => {
    if (!s.interaction) return;
    const stationEl = wrap.querySelector(`.station[data-station="${s.id}"]`);
    const mount = stationEl.querySelector("[data-role='interaction']");
    renderInteraction(s, mount);
  });
}

/* ============================================================
   render — عرض المحطة الحالية (fade ناعم)
   ============================================================ */
function render(){
  const all = document.querySelectorAll(".station");
  all.forEach(el => {
    const isActive = +el.dataset.station === journeyState.currentStation;
    if (isActive){
      el.classList.add("is-active");
      el.setAttribute("aria-hidden", "false");
      // محتوى ديناميكي بيقرا من journeyState الحي (مثلاً محور الميثاق)
      if (typeof el.__refreshDynamic === "function") el.__refreshDynamic();
      // fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("is-visible"));
      });
    } else {
      el.classList.remove("is-active", "is-visible");
      el.setAttribute("aria-hidden", "true");
    }
  });
  updateProgress();
}

/* ============================================================
   goToStation — انتقال + scroll + تحديث الشريط
   ============================================================ */
function goToStation(n){
  if (n < 1 || n > CONTENT.stations.length) return;
  if (n === journeyState.currentStation) return;

  const current = document.querySelector(`.station[data-station="${journeyState.currentStation}"]`);
  if (current) current.classList.remove("is-visible");

  // ننتظر فترة fade-out قصيرة قبل التبديل
  setTimeout(() => {
    journeyState.currentStation = n;
    render();
    // scroll لأعلى بسلاسة
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 220);
}

/* ============================================================
   completeStation — إضافة محطة للمكتملة
   ============================================================ */
function completeStation(n){
  if (!journeyState.completedStations.includes(n)){
    journeyState.completedStations.push(n);
  }
  updateProgress();
}

/* ============================================================
   updateProgress — تحديث نقاط الشريط
   ============================================================ */
function updateProgress(){
  const items = document.querySelectorAll(".rail__item");
  const total = CONTENT.stations.length;
  let lastDoneIdx = -1;

  items.forEach((el, idx) => {
    const id = +el.dataset.station;
    el.classList.remove("is-done", "is-current");
    if (journeyState.completedStations.includes(id)){
      el.classList.add("is-done");
      lastDoneIdx = Math.max(lastDoneIdx, idx);
    }
    if (id === journeyState.currentStation){
      el.classList.add("is-current");
    }
  });

  // طول الخط المكتمل: من أول نقطة إلى المحطة الحالية
  const currentIdx = CONTENT.stations.findIndex(s => s.id === journeyState.currentStation);
  const reached = Math.max(lastDoneIdx, currentIdx);
  // نسبة بين النقاط (total-1 فواصل)
  const ratio = total > 1 ? Math.max(0, reached) / (total - 1) : 0;
  document.querySelector(".rail__list").style.setProperty("--rail-progress", `${ratio * 100}%`);
}

/* ============================================================
   ============== محرّك التفاعل (reusable) ====================
   renderInteraction(station, mountEl) → switch على type
   ============================================================ */
function renderInteraction(station, mountEl){
  const ix = station.interaction;
  if (!ix || !mountEl) return;
  switch (ix.type){
    case "form":           return renderForm(station, mountEl);
    case "single-choice":  return renderSingleChoice(station, mountEl);
    case "axis-picker":    return renderAxisPicker(station, mountEl);
    case "door-flavor":    return renderDoorFlavor(station, mountEl);
    case "multi-choice":   return renderMultiChoice(station, mountEl);
    case "covenant":       return renderCovenant(station, mountEl);
    default:
      console.warn("نوع تفاعل غير معروف:", ix.type);
  }
}

/* ---------- مساعدات عامة ---------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
  ));
}
function textToParagraphs(text){
  // النصوص اللي فيها \n تتحوّل لفقرات
  return String(text).split(/\n+/).map(line => {
    const t = line.trim();
    return t ? `<p>${escapeHtml(t)}</p>` : "";
  }).join("");
}
function smoothScrollTo(el, offset = 80){
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const y = window.scrollY + rect.top - offset;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

/* ---------- بوّابة التقدّم: فتح زر التالي ---------- */
function unlockNext(stationEl){
  const btn = stationEl.querySelector(".btn-next");
  if (!btn) return;
  if (!btn.classList.contains("is-locked")) return; // متفتوحه أصلاً
  btn.classList.remove("is-locked");
  // أنيميشن ظهور بسيط
  requestAnimationFrame(() => btn.classList.add("is-revealed"));
}

/* ---------- صندوق الصدى ---------- */
function showEcho(stationEl, text, animate = true){
  const echo = stationEl.querySelector("[data-role='echo']");
  if (!echo) return;
  echo.innerHTML = `
    <div class="echo__head">${CONTENT.ui.echoHead}</div>
    <div class="echo__body">${textToParagraphs(text)}</div>
  `;
  echo.classList.add("is-shown");
  echo.setAttribute("aria-hidden", "false");
  if (animate){
    echo.classList.remove("is-fade-in");
    // force reflow ثم نطبق فادين
    void echo.offsetWidth;
    requestAnimationFrame(() => echo.classList.add("is-fade-in"));
  } else {
    echo.classList.add("is-fade-in");
  }
}

/* امسح صندوق الصدى (بنحتاجها بين مراحل axis-picker) */
function clearEcho(stationEl){
  const echo = stationEl.querySelector("[data-role='echo']");
  if (!echo) return;
  echo.classList.remove("is-shown", "is-fade-in");
  echo.setAttribute("aria-hidden", "true");
  echo.innerHTML = "";
}

/* ============================================================
   النوع (أ): form — نموذج المحطة ١
   ============================================================ */
function renderForm(station, mountEl){
  const ix = station.interaction;
  const u  = journeyState.user;

  const fieldsHtml = ix.fields.map(f => fieldHtml(f, u[f.key] || "")).join("");

  mountEl.innerHTML = `
    <div class="ix ix-form-wrap">
      <h2 class="ix__prompt">${escapeHtml(ix.prompt)}</h2>
      <form class="ix-form ix-form__grid" novalidate>
        ${fieldsHtml}
        <div class="ix-form__actions">
          <button type="submit" class="ix-form__submit">${escapeHtml(ix.submitLabel)}</button>
        </div>
      </form>
    </div>
  `;

  const stationEl = mountEl.closest(".station");
  const form      = mountEl.querySelector("form");

  // استرجاع: لو المحطة دي مكتملة قبل كده — اعرض الحالة المحفوظة بدون أنيميشن
  const wasCompleted = journeyState.completedStations.includes(station.id);
  if (wasCompleted && u.email){
    disableForm(form);
    showFormWelcome(stationEl, station, false);
    unlockNext(stationEl);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const errors = validateForm(form, ix.fields);
    if (errors.length){
      showErrors(form, errors);
      return;
    }
    // احفظ القيم في journeyState.user
    ix.fields.forEach(f => {
      const el = form.querySelector(`[name="${f.key}"]`);
      if (el) journeyState.user[f.key] = el.value.trim();
    });
    refreshParticipant();
    // ── حفظ best-effort: إنشاء المشارك + توليد كود التقرير ──
    Persist.register({ ...journeyState.user }).then(res => {
      if (res){ journeyState.participantId = res.id; journeyState.resultCode = res.code; }
    });
    disableForm(form);
    showFormWelcome(stationEl, station, true);
    completeStation(station.id);
    unlockNext(stationEl);

    // scroll لطيف للصدى
    setTimeout(() => {
      smoothScrollTo(stationEl.querySelector("[data-role='echo']"));
    }, 350);
  });
}

function fieldHtml(f, value = ""){
  const halfCls = f.half ? " ix-field--half" : "";
  const req = f.required ? `<span class="req" aria-hidden="true">*</span>` : "";
  let control = "";

  if (f.kind === "select"){
    const opts = (f.options || []).map(o =>
      `<option value="${escapeHtml(o)}" ${o === value ? "selected" : ""}>${escapeHtml(o)}</option>`
    ).join("");
    control = `
      <select class="ix-field__select" name="${f.key}" ${f.required ? "required" : ""}>
        <option value="" disabled ${value ? "" : "selected"}>${CONTENT.ui.selectPlaceholder}</option>
        ${opts}
      </select>
    `;
  } else {
    const type = f.kind === "email" ? "email" : "text";
    control = `<input class="ix-field__input" type="${type}" name="${f.key}" value="${escapeHtml(value)}" ${f.required ? "required" : ""} autocomplete="off" />`;
  }
  return `
    <div class="ix-field${halfCls}" data-field="${f.key}">
      <label class="ix-field__label">${escapeHtml(f.label)}${req}</label>
      ${control}
      <div class="ix-field__error" role="alert"></div>
    </div>
  `;
}

function validateForm(form, fields){
  const errors = [];
  fields.forEach(f => {
    const el = form.querySelector(`[name="${f.key}"]`);
    const val = (el?.value || "").trim();
    if (f.required && !val){
      errors.push({ key: f.key, msg: CONTENT.ui.errors.required });
      return;
    }
    if (f.kind === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){
      errors.push({ key: f.key, msg: CONTENT.ui.errors.email });
    }
  });
  return errors;
}

function showErrors(form, errors){
  // امسح الأخطاء القديمة
  form.querySelectorAll(".ix-field").forEach(el => {
    el.classList.remove("is-error");
    el.querySelector(".ix-field__error").textContent = "";
  });
  // اعرض الجدد
  errors.forEach(e => {
    const el = form.querySelector(`.ix-field[data-field="${e.key}"]`);
    if (el){
      el.classList.add("is-error");
      el.querySelector(".ix-field__error").textContent = e.msg;
    }
  });
  // ركّز على أول حقل ناقص
  const firstBad = form.querySelector(".ix-field.is-error input, .ix-field.is-error select");
  firstBad?.focus();
}

function disableForm(form){
  form.classList.add("is-submitted");
  form.querySelectorAll("input, select, button").forEach(el => el.disabled = true);
}

function showFormWelcome(stationEl, station, animate){
  const ix   = station.interaction;
  const name = (journeyState.user.name || "").trim();
  const text = ix.welcome.replace(/\{name\}/g, name);
  showEcho(stationEl, text, animate);
}

/* ============================================================
   النوع (ب): single-choice — اختيار من ضمن خيارات
   ============================================================ */
function renderSingleChoice(station, mountEl){
  const ix = station.interaction;

  mountEl.innerHTML = `
    <div class="ix ix-choice">
      <h2 class="ix__prompt">${escapeHtml(ix.prompt)}</h2>
      <div class="ix-choice__list" role="radiogroup" aria-label="${escapeHtml(ix.prompt)}">
        ${ix.options.map(o => `
          <button type="button" class="ix-choice__btn" data-id="${escapeHtml(o.id)}" role="radio" aria-checked="false">
            <span class="ix-choice__label">${escapeHtml(o.label)}</span>
            <span class="ix-choice__mark" aria-hidden="true">✓</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  const stationEl = mountEl.closest(".station");
  const buttons   = mountEl.querySelectorAll(".ix-choice__btn");

  const applySelection = (id, animate) => {
    const opt = ix.options.find(o => o.id === id);
    if (!opt) return;

    buttons.forEach(b => {
      const isMatch = b.dataset.id === id;
      b.classList.toggle("is-selected", isMatch);
      b.setAttribute("aria-checked", isMatch ? "true" : "false");
      if (!isMatch){
        b.classList.add("is-disabled");
        b.disabled = true;
      } else {
        b.disabled = false; // الزر المختار يبقى قابل للقراءة بصريًا
      }
    });

    // احفظ في الـ state
    journeyState.choices[ix.saveKey] = id;

    // اعرض الصدى
    showEcho(stationEl, opt.echo, animate);

    if (animate){
      completeStation(station.id);
      // scroll لطيف للصدى بعد ظهوره
      setTimeout(() => {
        smoothScrollTo(stationEl.querySelector("[data-role='echo']"));
      }, 350);
    }

    unlockNext(stationEl);
  };

  // استرجاع اختيار سابق
  const saved = journeyState.choices[ix.saveKey];
  if (saved){
    applySelection(saved, false);
  }

  // ربط النقرات
  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (journeyState.choices[ix.saveKey]) return; // اختيار اتعمل بالفعل
      applySelection(b.dataset.id, true);
    });
  });
}

/* ============================================================
   النوع (ج): axis-picker — ٣ مراحل داخلية
   phase0: واتساب → phase1: حذف محور → phase2: اختيار الرئيسي
   ============================================================ */
function renderAxisPicker(station, mountEl){
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");

  /* الاسترجاع الكامل: لو المحطة خلصت قبل كده اعرض النتيجة النهائية فقط */
  const savedMain = journeyState.choices.station4_axisMain;
  if (savedMain && ix.q2.finalEchoes[savedMain]){
    mountEl.innerHTML = `
      <div class="ix ix-axis ix-axis--done">
        <p class="ix-form__note">حفظنا بصمتك. تقدر تعود لشاشة النتيجة في أي وقت — أو تكمل لمحطتك الجاية.</p>
      </div>
    `;
    showEcho(stationEl, ix.q2.finalEchoes[savedMain], false);
    unlockNext(stationEl);
    return;
  }

  /* البناء الأولي للمراحل الثلاث */
  mountEl.innerHTML = `
    <div class="ix ix-axis">
      <!-- المرحلة 0: واتساب + موافقة -->
      <div class="ix-phase is-fading" data-phase="0">
        <h2 class="ix__prompt">${escapeHtml(ix.phase0.prompt)}</h2>
        <form class="ix-form ix-form--stack" novalidate>
          <div class="ix-field" data-field="whatsapp">
            <label class="ix-field__label">${escapeHtml(ix.phase0.whatsappLabel)}</label>
            <input class="ix-field__input" type="tel" name="whatsapp" inputmode="tel"
                   dir="ltr" style="text-align:right;"
                   placeholder="${escapeHtml(ix.phase0.whatsappPlaceholder)}" autocomplete="off" />
            <div class="ix-field__error" role="alert"></div>
          </div>

          <div class="ix-radio-group" role="radiogroup" aria-label="موافقة الواتس">
            ${ix.phase0.radioOptions.map(o => `
              <label class="ix-radio">
                <input type="radio" name="wa_consent" value="${escapeHtml(o.value)}" />
                <span class="ix-radio__mark" aria-hidden="true"></span>
                <span class="ix-radio__label">${escapeHtml(o.label)}</span>
              </label>
            `).join("")}
            <div class="ix-field__error" role="alert" data-role="consent-error"></div>
          </div>

          <p class="ix-form__note">${escapeHtml(ix.phase0.note)}</p>

          <div class="ix-form__actions">
            <button type="submit" class="ix-form__submit">${escapeHtml(ix.phase0.submitLabel)}</button>
          </div>
        </form>
      </div>

      <!-- المرحلة 1: سؤال الحذف -->
      <div class="ix-phase" data-phase="1" hidden>
        <h2 class="ix__prompt">${escapeHtml(ix.q1.prompt)}</h2>
        <div class="ix-choice__list" role="radiogroup" aria-label="${escapeHtml(ix.q1.prompt)}">
          ${ix.q1.options.map(o => `
            <button type="button" class="ix-choice__btn" data-axis="${escapeHtml(o.id)}" role="radio" aria-checked="false">
              <span class="ix-choice__label">${escapeHtml(o.label)}</span>
              <span class="ix-choice__mark" aria-hidden="true">✓</span>
            </button>
          `).join("")}
        </div>
        <div class="ix-axis__continue" data-role="continue-1">
          <button type="button" class="ix-step-btn" data-action="to-phase-2">
            <span>${escapeHtml(ix.q1.continueLabel || "نكمّل")}</span>
            <span class="ix-step-btn__arrow" aria-hidden="true">←</span>
          </button>
        </div>
      </div>

      <!-- المرحلة 2: تبني ديناميكيًا (الخيارات تعتمد على المحور المحذوف) -->
      <div class="ix-phase" data-phase="2" hidden></div>
    </div>
  `;

  /* حالة محلية للمحطة */
  const local = { eliminatedAxis: null };

  bindAxisPhase0(mountEl, stationEl, ix, local);
  bindAxisPhase1(mountEl, stationEl, ix, local);
}

/* ---------- مساعد: تبديل مرحلة axis-picker ---------- */
function switchAxisPhase(mountEl, n){
  const phases = mountEl.querySelectorAll(".ix-phase");
  phases.forEach(p => {
    const isActive = +p.dataset.phase === n;
    p.hidden = !isActive;
    if (isActive){
      p.classList.remove("is-fading");
      void p.offsetWidth; // reflow → اعادة تشغيل الأنيميشن
      p.classList.add("is-fading");
    } else {
      p.classList.remove("is-fading");
    }
  });
}

/* ---------- المرحلة 0: نموذج الواتساب ---------- */
function bindAxisPhase0(mountEl, stationEl, ix, local){
  const phaseEl     = mountEl.querySelector(".ix-phase[data-phase='0']");
  const form        = phaseEl.querySelector("form");
  const whatsappEl  = form.querySelector("[name='whatsapp']");
  const whatsappFld = form.querySelector(".ix-field[data-field='whatsapp']");
  const consentRads = form.querySelectorAll("[name='wa_consent']");
  const consentErr  = form.querySelector("[data-role='consent-error']");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    // امسح الأخطاء القديمة
    whatsappFld.classList.remove("is-error");
    whatsappFld.querySelector(".ix-field__error").textContent = "";
    consentErr.textContent = "";

    const chosen = [...consentRads].find(r => r.checked);
    if (!chosen){
      consentErr.textContent = ix.phase0.errors.consent;
      return;
    }

    if (chosen.value === "yes"){
      const val = whatsappEl.value.trim();
      if (!val){
        whatsappFld.classList.add("is-error");
        whatsappFld.querySelector(".ix-field__error").textContent = ix.phase0.errors.whatsapp;
        whatsappEl.focus();
        return;
      }
      journeyState.user.whatsapp = val;
      journeyState.user.consentWhatsapp = true;
    } else {
      journeyState.user.whatsapp = "";
      journeyState.user.consentWhatsapp = false;
    }

    // ── حفظ رقم الواتس + الموافقة (best-effort) ──
    Persist.saveContact(journeyState.participantId, {
      whatsapp: journeyState.user.whatsapp,
      consentWhatsapp: journeyState.user.consentWhatsapp
    });

    // انتقل للمرحلة 1
    switchAxisPhase(mountEl, 1);
  });
}

/* ---------- المرحلة 1: سؤال الحذف ---------- */
function bindAxisPhase1(mountEl, stationEl, ix, local){
  const phaseEl     = mountEl.querySelector(".ix-phase[data-phase='1']");
  const buttons     = phaseEl.querySelectorAll(".ix-choice__btn");
  const continueBox = phaseEl.querySelector("[data-role='continue-1']");
  const continueBtn = continueBox.querySelector(".ix-step-btn");

  let chosen = null;

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (chosen) return;
      chosen = b.dataset.axis;
      local.eliminatedAxis = chosen;

      buttons.forEach(other => {
        const isMatch = other === b;
        other.classList.toggle("is-selected", isMatch);
        other.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch){ other.classList.add("is-disabled"); other.disabled = true; }
      });

      // صدى q1 → في صندوق الصدى الرئيسي
      showEcho(stationEl, ix.q1.echoes[chosen], true);

      // ظاهر زر "نكمّل" بعد ظهور الصدى بشوية
      setTimeout(() => continueBox.classList.add("is-revealed"), 250);

      // scroll لطيف للصدى
      setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);
    });
  });

  continueBtn.addEventListener("click", () => {
    if (!local.eliminatedAxis) return;
    // امسح صدى q1 قبل التحويل، ثم ابني المرحلة 2 ديناميكيًا
    clearEcho(stationEl);
    buildAxisPhase2(mountEl, stationEl, ix, local);
    switchAxisPhase(mountEl, 2);
  });
}

/* ---------- المرحلة 2: تمييز الرئيسي من الفرعي ---------- */
function buildAxisPhase2(mountEl, stationEl, ix, local){
  const phase2El = mountEl.querySelector(".ix-phase[data-phase='2']");
  const remaining = ix.q1.options.filter(o => o.id !== local.eliminatedAxis);

  phase2El.innerHTML = `
    <h2 class="ix__prompt">${escapeHtml(ix.q2.prompt)}</h2>
    <div class="ix-choice__list" role="radiogroup" aria-label="${escapeHtml(ix.q2.prompt)}">
      ${remaining.map(o => `
        <button type="button" class="ix-choice__btn" data-axis="${escapeHtml(o.id)}" role="radio" aria-checked="false">
          <span class="ix-choice__label">${escapeHtml(o.label)}</span>
          <span class="ix-choice__mark" aria-hidden="true">✓</span>
        </button>
      `).join("")}
    </div>
  `;

  const buttons = phase2El.querySelectorAll(".ix-choice__btn");
  let chosen = null;

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (chosen) return;
      chosen = b.dataset.axis;

      buttons.forEach(other => {
        const isMatch = other === b;
        other.classList.toggle("is-selected", isMatch);
        other.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch){ other.classList.add("is-disabled"); other.disabled = true; }
      });

      // المحور الفرعي = اللي لا محذوف ولا مختار
      const subAxis = ix.q1.options.find(o => o.id !== local.eliminatedAxis && o.id !== chosen)?.id || null;

      // احفظ في journeyState
      journeyState.choices.station4_axisMain = chosen;
      journeyState.choices.station4_axisSub  = subAxis;
      journeyState.fingerprint.axis          = chosen;

      // الصدى النهائي + فتح زر «المحطة التالية»
      showEcho(stationEl, ix.q2.finalEchoes[chosen], true);
      completeStation(4);
      unlockNext(stationEl);

      setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);

      // بعد ما المشارك يشوف اختياره لشوية، نطوي شاشة السؤال
      // لحالة الـ done — عشان الرجوع للمحطة لاحقًا يعرض النتيجة بس
      setTimeout(() => {
        mountEl.innerHTML = `
          <div class="ix ix-axis ix-axis--done">
            <p class="ix-form__note">حفظنا بصمتك. تقدر تعود لشاشة النتيجة في أي وقت — أو تكمل لمحطتك الجاية.</p>
          </div>
        `;
      }, 900);
    });
  });
}

/* ============================================================
   النوع (د): door-flavor — اختيار الباب ثم النكهة → بطاقة بصمة
   ============================================================ */
function renderDoorFlavor(station, mountEl){
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");

  /* الاسترجاع الكامل: الباب + النكهة محفوظين → اعرض النتيجة فقط */
  const savedDoor   = journeyState.choices.station5_door;
  const savedFlavor = journeyState.choices.station5_flavor;
  if (savedDoor && savedFlavor != null && ix.q2.flavorEchoes[savedFlavor]){
    showEcho(stationEl, ix.q2.flavorEchoes[savedFlavor], false);
    mountEl.innerHTML = renderFingerprintCardHtml(ix);
    requestAnimationFrame(() => animateFingerprintCard(mountEl, /*delayedStart=*/false));
    unlockNext(stationEl);
    return;
  }

  /* البناء الأولي: مرحلتين، التانية فاضية لحد ما الباب يتختار */
  mountEl.innerHTML = `
    <div class="ix ix-axis ix-door-flavor">
      <!-- المرحلة 1: اختيار الباب -->
      <div class="ix-phase is-fading" data-phase="1">
        <h2 class="ix__prompt">${escapeHtml(ix.q1.prompt)}</h2>
        <div class="ix-choice__list" role="radiogroup" aria-label="${escapeHtml(ix.q1.prompt)}">
          ${ix.q1.options.map(o => `
            <button type="button" class="ix-choice__btn" data-door="${escapeHtml(o.id)}" role="radio" aria-checked="false">
              <span class="ix-choice__label">${escapeHtml(o.label)}</span>
              <span class="ix-choice__mark" aria-hidden="true">✓</span>
            </button>
          `).join("")}
        </div>
        <div class="ix-axis__continue" data-role="continue-1">
          <button type="button" class="ix-step-btn" data-action="to-phase-2">
            <span>${escapeHtml(ix.q1.continueLabel || "نكمّل")}</span>
            <span class="ix-step-btn__arrow" aria-hidden="true">←</span>
          </button>
        </div>
      </div>

      <!-- المرحلة 2: اختيار النكهة (تتبني ديناميكيًا) -->
      <div class="ix-phase" data-phase="2" hidden></div>
    </div>
  `;

  const local = { door: null };
  bindDoorPhase1(mountEl, stationEl, ix, local);
}

/* ---------- المرحلة ١: اختيار الباب ---------- */
function bindDoorPhase1(mountEl, stationEl, ix, local){
  const phaseEl     = mountEl.querySelector(".ix-phase[data-phase='1']");
  const buttons     = phaseEl.querySelectorAll(".ix-choice__btn");
  const continueBox = phaseEl.querySelector("[data-role='continue-1']");
  const continueBtn = continueBox.querySelector(".ix-step-btn");

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (local.door) return;
      local.door = b.dataset.door;

      // احفظ الباب فورًا
      journeyState.choices.station5_door = local.door;
      journeyState.fingerprint.door      = local.door;

      buttons.forEach(other => {
        const isMatch = other === b;
        other.classList.toggle("is-selected", isMatch);
        other.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch){ other.classList.add("is-disabled"); other.disabled = true; }
      });

      // صدى الباب
      showEcho(stationEl, ix.q1.doorEchoes[local.door], true);
      setTimeout(() => continueBox.classList.add("is-revealed"), 250);
      setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);
    });
  });

  continueBtn.addEventListener("click", () => {
    if (!local.door) return;
    clearEcho(stationEl);
    buildDoorPhase2(mountEl, stationEl, ix, local);
    switchAxisPhase(mountEl, 2);
  });
}

/* ---------- المرحلة ٢: اختيار النكهة (٣ خيارات حسب الباب) ---------- */
function buildDoorPhase2(mountEl, stationEl, ix, local){
  const phase2El = mountEl.querySelector(".ix-phase[data-phase='2']");
  const prompt   = ix.q2.promptByDoor[local.door];
  const flavors  = ix.q2.flavorsByDoor[local.door];

  phase2El.innerHTML = `
    <h2 class="ix__prompt">${escapeHtml(prompt)}</h2>
    <div class="ix-choice__list" role="radiogroup" aria-label="${escapeHtml(prompt)}">
      ${flavors.map(f => `
        <button type="button" class="ix-choice__btn ix-choice__btn--lg" data-flavor="${f.id}" role="radio" aria-checked="false">
          <span class="ix-choice__label">${escapeHtml(f.label)}</span>
          <span class="ix-choice__mark" aria-hidden="true">✓</span>
        </button>
      `).join("")}
    </div>
  `;

  const buttons = phase2El.querySelectorAll(".ix-choice__btn");
  let chosen = null;

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (chosen) return;
      chosen = +b.dataset.flavor;

      buttons.forEach(other => {
        const isMatch = other === b;
        other.classList.toggle("is-selected", isMatch);
        other.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch){ other.classList.add("is-disabled"); other.disabled = true; }
      });

      // احفظ النكهة + اسم البصمة
      const axis = journeyState.fingerprint.axis;
      const fingerprintName = BURNOUT_FINGERPRINTS[`${axis}_${chosen}`] || "";
      journeyState.choices.station5_flavor = chosen;
      journeyState.fingerprint.flavor      = chosen;
      journeyState.fingerprint.name        = fingerprintName;

      // صدى النكهة
      showEcho(stationEl, ix.q2.flavorEchoes[chosen], true);
      completeStation(5);
      setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);

      // بعد ما يقرا الصدى لشوية، نطوي شاشة السؤال ونعرض بطاقة البصمة
      setTimeout(() => {
        mountEl.innerHTML = renderFingerprintCardHtml(ix);
        animateFingerprintCard(mountEl, /*delayedStart=*/true);
        unlockNext(stationEl);

        // scroll لطيف عشان البطاقة تبان
        setTimeout(() => smoothScrollTo(mountEl.querySelector(".ix-fingerprint-card"), 100), 600);
      }, 1400);
    });
  });
}

/* ---------- بطاقة تركيب البصمة ---------- */
function renderFingerprintCardHtml(ix){
  const fp = journeyState.fingerprint;
  const axisLabel   = AXIS_AR[fp.axis]      || "—";
  const doorLabel   = DOOR_AR[fp.door]      || "—";
  const flavorLabel = FLAVOR_AR[fp.flavor]  || "—";
  const card        = ix.fingerprintCard;

  return `
    <div class="ix-fingerprint-card" aria-live="polite">
      <div class="fp-card__head">${escapeHtml(card.head)}</div>
      <div class="fp-card__rows">
        <div class="fp-card__row" data-row="0">
          <span class="fp-card__label">${escapeHtml(card.labels.axis)}</span>
          <span class="fp-card__value">${escapeHtml(axisLabel)}</span>
        </div>
        <div class="fp-card__row" data-row="1">
          <span class="fp-card__label">${escapeHtml(card.labels.door)}</span>
          <span class="fp-card__value">${escapeHtml(doorLabel)}</span>
        </div>
        <div class="fp-card__row" data-row="2">
          <span class="fp-card__label">${escapeHtml(card.labels.flavor)}</span>
          <span class="fp-card__value">${escapeHtml(flavorLabel)}</span>
        </div>
      </div>
      <div class="fp-card__equation">
        <span class="fp-card__equals" aria-hidden="true">=</span>
        <span class="fp-card__name">${escapeHtml(fp.name || "")}</span>
      </div>
    </div>
  `;
}

function animateFingerprintCard(mountEl, delayedStart){
  const card = mountEl.querySelector(".ix-fingerprint-card");
  if (!card) return;
  const rows = card.querySelectorAll(".fp-card__row");
  const eq   = card.querySelector(".fp-card__equation");

  const start = () => {
    requestAnimationFrame(() => card.classList.add("is-shown"));
    // ظهور الأسطر بتتابع
    rows.forEach((r, i) => {
      setTimeout(() => r.classList.add("is-in"), 250 + i * 220);
    });
    // المعادلة النهائية تبان أخيرًا
    setTimeout(() => eq.classList.add("is-in"), 250 + rows.length * 220 + 180);
  };

  if (delayedStart) setTimeout(start, 100);
  else start();
}

/* ============================================================
   النوع (هـ): multi-choice — عدّ العلامات → نوع الاحتراق
   ============================================================ */
function renderMultiChoice(station, mountEl){
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");

  // الاسترجاع: لو محفوظة قبل كده، نعرض بدون استدعاء جديد للحساب
  const wasCompleted = journeyState.completedStations.includes(station.id);
  const savedArr     = journeyState.choices[ix.saveKey];

  mountEl.innerHTML = `
    <div class="ix ix-multi">
      <h2 class="ix__prompt">${escapeHtml(ix.prompt)}</h2>
      <div class="ix-multi__list" role="group" aria-label="${escapeHtml(ix.prompt)}">
        ${ix.options.map(o => `
          <button type="button" class="ix-multi__btn" data-id="${escapeHtml(o.id)}" aria-pressed="false">
            <span class="ix-multi__box" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 8 7 12 13 4"></polyline>
              </svg>
            </span>
            <span class="ix-multi__label">${escapeHtml(o.label)}</span>
          </button>
        `).join("")}
        <hr class="ix-multi__divider" />
        <button type="button" class="ix-multi__btn ix-multi__btn--none" data-id="${escapeHtml(ix.noneOption.id)}" aria-pressed="false">
          <span class="ix-multi__box" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 8 7 12 13 4"></polyline>
            </svg>
          </span>
          <span class="ix-multi__label">${escapeHtml(ix.noneOption.label)}</span>
        </button>
      </div>
      <div class="ix-multi__actions" data-role="multi-actions">
        <button type="button" class="ix-step-btn" data-action="confirm-multi">
          <span>${escapeHtml(ix.confirmLabel)}</span>
          <span class="ix-step-btn__arrow" aria-hidden="true">←</span>
        </button>
      </div>
    </div>
  `;

  const buttons    = mountEl.querySelectorAll(".ix-multi__btn");
  const actionsBox = mountEl.querySelector("[data-role='multi-actions']");
  const noneId     = ix.noneOption.id;

  const isChecked = (b) => b.classList.contains("is-checked");
  const anyChecked = () => [...buttons].some(isChecked);
  const refreshActions = () => {
    if (anyChecked()) actionsBox.classList.add("is-revealed");
    else actionsBox.classList.remove("is-revealed");
  };

  buttons.forEach(b => {
    b.addEventListener("click", () => {
      if (b.classList.contains("is-locked")) return;
      const id = b.dataset.id;

      if (id === noneId){
        // «ولا واحدة» حصري: لو اتعلّم، يلغي الباقي
        const willCheck = !isChecked(b);
        buttons.forEach(other => {
          other.classList.toggle("is-checked", other === b && willCheck);
          other.setAttribute("aria-pressed", (other === b && willCheck) ? "true" : "false");
        });
      } else {
        // تعليم/إلغاء — ولو كان «ولا واحدة» متعلّم، شيله
        const noneBtn = mountEl.querySelector(`.ix-multi__btn[data-id="${noneId}"]`);
        if (noneBtn && isChecked(noneBtn)){
          noneBtn.classList.remove("is-checked");
          noneBtn.setAttribute("aria-pressed", "false");
        }
        b.classList.toggle("is-checked");
        b.setAttribute("aria-pressed", isChecked(b) ? "true" : "false");
      }
      refreshActions();
    });
  });

  // التأكيد → حساب النوع + الصدى + فتح زر التالي
  mountEl.querySelector("[data-action='confirm-multi']").addEventListener("click", () => {
    const checkedIds = [...buttons]
      .filter(isChecked)
      .map(b => b.dataset.id);
    const hasNone = checkedIds.includes(noneId);
    const signs   = hasNone ? [] : checkedIds.slice();

    // احفظ
    journeyState.choices[ix.saveKey] = signs;

    // احسب نوع الاحتراق
    const n = signs.length;
    let burnoutType, echoKey;
    if (n === 0)      { burnoutType = "muhtariq";  echoKey = "muhtariq";  }
    else if (n <= 2)  { burnoutType = "mujawwaa";  echoKey = "mujawwaa";  }
    else              { burnoutType = "makbout";   echoKey = "makbout";   }
    journeyState.fingerprint.burnoutType = burnoutType;

    // اعرض الصدى
    const text = ix.burnoutEchoes[echoKey].replace(/\{n\}/g, toArabicDigits(n));
    showEcho(stationEl, text, true);
    completeStation(station.id);
    unlockNext(stationEl);

    // اقفل التعديل + خلي الأزرار في حالة عرض
    buttons.forEach(b => {
      b.classList.add("is-locked");
      b.disabled = true;
    });
    actionsBox.classList.remove("is-revealed");
    actionsBox.style.display = "none";

    setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);
  });

  // الاسترجاع: ضع الحالة المحفوظة
  if (wasCompleted && Array.isArray(savedArr)){
    const useNone = savedArr.length === 0;
    buttons.forEach(b => {
      const id   = b.dataset.id;
      const want = useNone ? (id === noneId) : savedArr.includes(id);
      b.classList.toggle("is-checked", want);
      b.setAttribute("aria-pressed", want ? "true" : "false");
      b.classList.add("is-locked");
      b.disabled = true;
    });
    actionsBox.style.display = "none";

    // أعد بناء الصدى من النوع المحفوظ
    const echoKey = journeyState.fingerprint.burnoutType
      || (savedArr.length === 0 ? "muhtariq" : (savedArr.length <= 2 ? "mujawwaa" : "makbout"));
    const text = ix.burnoutEchoes[echoKey].replace(/\{n\}/g, toArabicDigits(savedArr.length));
    showEcho(stationEl, text, false);
    unlockNext(stationEl);
  }
}

/* ============================================================
   النوع (و): covenant — الميثاق
   ============================================================ */
function renderCovenant(station, mountEl){
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");

  // قيمة السطر الأول التلقائية — تتحسب من الـ state الحي وقت العرض/الحفظ
  const computeAutoLine1 = () => {
    const axis = journeyState.fingerprint.axis;
    return axis ? `محوري الرئيسي: ${AXIS_AR[axis]}` : `محورك الرئيسي`;
  };

  // القيم المحفوظة
  const saved = journeyState.choices.station7_covenant || { line1: "", line2: "", line3: "" };
  const wasSaved = !!(saved.line2 && saved.line3);

  mountEl.innerHTML = `
    <div class="ix ix-covenant">
      <!-- لمسة الآية -->
      <div class="ix-covenant__verse" aria-label="آية">
        <p class="ix-covenant__verse-text">${escapeHtml(ix.verse.text)}</p>
        <p class="ix-covenant__verse-source">${escapeHtml(ix.verse.source)}</p>
      </div>

      <h2 class="ix__prompt">${escapeHtml(ix.prompt)}</h2>

      <div class="ix-covenant__lines">
        <!-- السطر ١ — auto -->
        <div class="ix-covenant__line" data-key="line1">
          <span class="ix-covenant__num">السطر الأول</span>
          <label class="ix-covenant__label">${escapeHtml(ix.fields[0].label.replace(/^السطر الأول — /, ""))}</label>
          <div class="ix-covenant__auto" data-role="cov-auto">${escapeHtml(computeAutoLine1())}</div>
          <span class="ix-covenant__hint">${escapeHtml(ix.fields[0].hint || "")}</span>
        </div>

        <!-- السطر ٢ -->
        <div class="ix-covenant__line" data-key="line2">
          <span class="ix-covenant__num">السطر الثاني</span>
          <label class="ix-covenant__label" for="cov-line2">${escapeHtml(ix.fields[1].label.replace(/^السطر الثاني — /, ""))}</label>
          <textarea id="cov-line2" class="ix-covenant__textarea" name="line2"
                    placeholder="${escapeHtml(ix.fields[1].placeholder || "")}">${escapeHtml(saved.line2 || "")}</textarea>
        </div>

        <!-- السطر ٣ -->
        <div class="ix-covenant__line" data-key="line3">
          <span class="ix-covenant__num">السطر الثالث</span>
          <label class="ix-covenant__label" for="cov-line3">${escapeHtml(ix.fields[2].label.replace(/^السطر الثالث — /, ""))}</label>
          <textarea id="cov-line3" class="ix-covenant__textarea" name="line3"
                    placeholder="${escapeHtml(ix.fields[2].placeholder || "")}">${escapeHtml(saved.line3 || "")}</textarea>
        </div>
      </div>

      <div class="ix-covenant__actions">
        <button type="button" class="ix-covenant__submit" data-role="cov-submit" disabled>
          ${escapeHtml(wasSaved ? ix.savedLabel : ix.submitLabel)}
        </button>
        <span class="ix-covenant__status" data-role="cov-status"></span>
      </div>
    </div>
  `;

  const ta2    = mountEl.querySelector("#cov-line2");
  const ta3    = mountEl.querySelector("#cov-line3");
  const btn    = mountEl.querySelector("[data-role='cov-submit']");
  const status = mountEl.querySelector("[data-role='cov-status']");
  const autoEl = mountEl.querySelector("[data-role='cov-auto']");

  // عرّف دالة تحديث على عنصر المحطة، عشان render() ينديها كل ما المحطة تنشّط
  stationEl.__refreshDynamic = () => {
    if (autoEl) autoEl.textContent = computeAutoLine1();
  };

  const refreshSubmitState = () => {
    const ok = ta2.value.trim() && ta3.value.trim();
    btn.disabled = !ok;
  };
  ta2.addEventListener("input", () => { refreshSubmitState(); status.classList.remove("is-shown"); });
  ta3.addEventListener("input", () => { refreshSubmitState(); status.classList.remove("is-shown"); });
  refreshSubmitState();

  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    const line2 = ta2.value.trim();
    const line3 = ta3.value.trim();
    const line1 = computeAutoLine1();   // قيمة حيّة وقت الحفظ
    // حدّث العرض في حالة كان stale لأي سبب
    if (autoEl) autoEl.textContent = line1;
    journeyState.choices.station7_covenant = { line1, line2, line3 };

    btn.textContent = ix.savedLabel;
    status.textContent = ix.done;
    status.classList.add("is-shown");

    completeStation(station.id);
    unlockNext(stationEl);

    setTimeout(() => smoothScrollTo(stationEl.querySelector(".station-nav"), 120), 250);
  });

  // الاسترجاع: لو الميثاق متعبّى وحفظ قبل كده
  if (wasSaved){
    status.textContent = ix.done;
    status.classList.add("is-shown");
    // ضمن إن line1 محفوظة بأحدث قيمة من الـ state
    journeyState.choices.station7_covenant = {
      line1: computeAutoLine1(),
      line2: saved.line2,
      line3: saved.line3
    };
    unlockNext(stationEl);
  }
}

/* ============================================================
   ================ شاشة البصمة النهائية =====================
   ============================================================ */
function showFingerprintScreen(){
  const screen = document.getElementById("fingerprintScreen");
  const doc    = document.getElementById("fpDoc");
  if (!screen || !doc) return;

  // ── حفظ نهائي best-effort: الاختيارات + البصمة + الميثاق ──
  Persist.finalize(journeyState.participantId, {
    user:        { ...journeyState.user },
    choices:     JSON.parse(JSON.stringify(journeyState.choices)),
    fingerprint: { ...journeyState.fingerprint },
    code:        journeyState.resultCode
  });

  // ابني الوثيقة
  doc.innerHTML = buildFingerprintDoc();

  // عنوان الصفحة أثناء العرض/الطباعة
  const name = (journeyState.user.name || "").trim();
  document.title = name
    ? `بصمة ${name} — هندسة العقلية`
    : "بصمة هندسة العقلية";

  // اظهر بـ fade
  screen.hidden = false;
  screen.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";          // اقفل scroll الخلفية
  screen.scrollTop = 0;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => screen.classList.add("is-open"));
  });

  // stagger الأقسام لأول مرة
  const sections = doc.querySelectorAll(".fp-section, .fp-hero, .fp-outro");
  sections.forEach((s, i) => {
    setTimeout(() => s.classList.add("is-in"), 220 + i * 130);
  });

  // اربط الأزرار
  screen.querySelector("[data-action='back-to-journey']")
    .addEventListener("click", hideFingerprintScreen, { once: true });

  doc.querySelector("[data-action='print']")
    ?.addEventListener("click", (e) => downloadFingerprintPDF(e.currentTarget), { once: false });

  const shareBtn = doc.querySelector("[data-action='share']");
  if (shareBtn){
    shareBtn.addEventListener("click", () => shareFingerprint(), { once: false });
  }

  // Esc → رجوع
  screen.__escHandler = (e) => {
    if (e.key === "Escape") hideFingerprintScreen();
  };
  document.addEventListener("keydown", screen.__escHandler);
}

function hideFingerprintScreen(){
  const screen = document.getElementById("fingerprintScreen");
  if (!screen) return;
  screen.classList.remove("is-open");
  document.body.style.overflow = "";
  if (screen.__escHandler){
    document.removeEventListener("keydown", screen.__escHandler);
    delete screen.__escHandler;
  }
  setTimeout(() => {
    screen.hidden = true;
    screen.setAttribute("aria-hidden", "true");
    // ارجع للمحطة ٧
    if (journeyState.currentStation !== 7){
      journeyState.currentStation = 7;
      render();
    }
    // ارجع العنوان
    document.title = "هندسة العقلية — منظور الفؤاد";
  }, 500);
}

/* ============================================================
   buildFingerprintDoc — HTML الوثيقة الكاملة
   ============================================================ */
function buildFingerprintDoc(){
  const u  = journeyState.user;
  const c  = journeyState.choices;
  const fp = journeyState.fingerprint;

  const name = (u.name || "").trim() || "—";

  // البيانات المعرّفة
  const levelText   = LEVEL_AR[c.station2_level] || "—";
  const axisText    = AXIS_AR[fp.axis]            || "—";
  const axisQuest   = AXIS_QUESTION[fp.axis]      || "";
  const doorText    = DOOR_AR[fp.door]            || "—";
  const flavorText  = FLAVOR_AR[fp.flavor]        || "—";
  const fingerName  = fp.name                     || "—";
  const burnoutKey  = fp.burnoutType;
  const burnoutText = BURNOUT_AR[burnoutKey]      || "—";
  const burnoutDesc = BURNOUT_DESC[burnoutKey]    || "";
  const paths       = AXIS_PATHS[fp.axis]         || [];

  // الميثاق
  const cov = c.station7_covenant || { line1: "", line2: "", line3: "" };
  const hasCov = !!(cov.line2 && cov.line3);

  return `
    <!-- ترويسة -->
    <header class="fp-head">
      <h1 class="fp-head__title">بصمة <span class="fp-head__name">${escapeHtml(name)}</span></h1>
      <p class="fp-head__sub">من رحلة هندسة العقلية — منظور الفؤاد</p>
      <p class="fp-head__date">${escapeHtml(arabicDate())}</p>
    </header>

    <hr class="fp-divider" />

    <!-- (١) المستوى -->
    <section class="fp-section">
      <h2 class="fp-section__head">مستواك</h2>
      <p class="fp-section__value">${escapeHtml(levelText)}</p>
    </section>

    <hr class="fp-divider" />

    <!-- (٢) المحور الرئيسي -->
    <section class="fp-section">
      <h2 class="fp-section__head">محورك الرئيسي</h2>
      <p class="fp-section__value">${escapeHtml(axisText)}</p>
      ${ axisQuest ? `<p class="fp-section__sub">سؤالك الجوهري: <q>${escapeHtml(axisQuest)}</q></p>` : "" }
    </section>

    <hr class="fp-divider" />

    <!-- (٣) بابك ونكهتك -->
    <section class="fp-section">
      <h2 class="fp-section__head">بابك ونكهتك</h2>
      <div class="fp-door-flavor">
        <div class="fp-door-flavor__cell">
          <h3 class="fp-section__head">بابك</h3>
          <p class="fp-section__value">${escapeHtml(doorText)}</p>
        </div>
        <div class="fp-door-flavor__cell">
          <h3 class="fp-section__head">نكهتك</h3>
          <p class="fp-section__value">${escapeHtml(flavorText)}</p>
        </div>
      </div>
    </section>

    <!-- (٤) البصمة الكاملة — الذروة -->
    <section class="fp-hero">
      <p class="fp-hero__head">البصمة الكاملة</p>
      <h2 class="fp-hero__name">${escapeHtml(fingerName)}</h2>
      <p class="fp-hero__formula">
        التركيبة — <b>${escapeHtml(axisText)}</b> · <b>${escapeHtml(doorText)}</b> · <b>${escapeHtml(flavorText)}</b>
      </p>
    </section>

    <!-- (٥) نوع الاحتراق -->
    <section class="fp-section">
      <h2 class="fp-section__head">نوع احتراقك المُرشّح</h2>
      <p class="fp-section__value">${escapeHtml(burnoutText)}</p>
      ${ burnoutDesc ? `<p class="fp-section__sub">${escapeHtml(burnoutDesc)}</p>` : "" }
    </section>

    <hr class="fp-divider" />

    <!-- (٦) ميثاقك -->
    <section class="fp-section">
      <h2 class="fp-section__head">ميثاقك</h2>
      ${ hasCov ? `
        <div class="fp-covenant">
          <div class="fp-covenant__row">
            <span class="fp-covenant__num">السطر الأول</span>
            <p class="fp-covenant__text">${escapeHtml(cov.line1 || "—")}</p>
          </div>
          <div class="fp-covenant__row">
            <span class="fp-covenant__num">الالتزام المخفي</span>
            <p class="fp-covenant__text">«${escapeHtml(cov.line2)}»</p>
          </div>
          <div class="fp-covenant__row">
            <span class="fp-covenant__num">خطوتي الأسبوع الجاي</span>
            <p class="fp-covenant__text">«${escapeHtml(cov.line3)}»</p>
          </div>
        </div>
      ` : `
        <p class="fp-covenant__empty">لم تكتب ميثاقك بعد — ارجع للمحطة السابعة لتدوّنه.</p>
      ` }
    </section>

    <hr class="fp-divider" />

    <!-- (٧) المسارات -->
    <section class="fp-section">
      <h2 class="fp-section__head">طريقك في الدورة الكاملة</h2>
      <div class="fp-paths">
        ${ paths.map(p => `<span class="fp-paths__chip">${escapeHtml(p)}</span>`).join("") }
      </div>
      <p class="fp-paths__note">دي المسارات اللي بنشتغل عليها في الدورة الكاملة، بالتفصيل وبالأدوات العملية.</p>
    </section>

    <hr class="fp-divider" />

    <!-- خاتمة -->
    <section class="fp-outro">
      <p class="fp-outro__verse">﴿إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّى يُغَيِّرُوا مَا بِأَنْفُسِهِمْ﴾</p>
      <p class="fp-outro__verse-src">الرعد — ١١</p>
      <p class="fp-outro__quote">الإنسان مش مخلوق عشان يحترق. هو مخلوق عشان يتزن. والاتزان رحلة، مش لحظة.</p>
      <p class="fp-outro__sign">— محمود فؤاد · منظور الفؤاد</p>
    </section>

    ${ buildSavedReportBlock() }

    <!-- أزرار الإجراءات -->
    <div class="fp-actions">
      <button type="button" class="fp-btn" data-action="print">احفظ بصمتك PDF</button>
      <button type="button" class="fp-btn" data-action="share">شارك بصمتك</button>
      <a class="fp-btn fp-btn--primary" data-action="full-course" href="#" aria-disabled="true">الدورة الكاملة</a>
    </div>
  `;
}

/* ============================================================
   قسم "تقريرك المحفوظ" — يظهر فقط لو فيه كود (يعني اتسجّل في Firebase)
   ============================================================ */
function buildSavedReportBlock(){
  const code = journeyState.resultCode;
  if (!code) return "";   // وضع التجربة بدون Firebase → مايظهرش

  const reportUrl = `${JOURNEY_CONFIG.resultPagePath}?c=${encodeURIComponent(code)}`;

  // زرّ واتساب التواصل (اختياري — يظهر لو فيه رقم في الإعدادات)
  let waBtn = "";
  if (JOURNEY_CONFIG.contactWhatsapp){
    const name   = (journeyState.user.name || "").trim();
    const fpName = journeyState.fingerprint.name || "—";
    const msg =
`السلام عليكم محمود 👋
خلّصت رحلة "هندسة العقلية".
بصمتي: ${fpName}
الاسم: ${name || "—"}
كود تقريري: ${code}`;
    const waUrl = `https://wa.me/${JOURNEY_CONFIG.contactWhatsapp}?text=${encodeURIComponent(msg)}`;
    waBtn = `<a class="fp-btn" href="${waUrl}" target="_blank" rel="noopener">ابعتلنا بصمتك على واتساب</a>`;
  }

  return `
    <hr class="fp-divider" />
    <section class="fp-section fp-saved">
      <h2 class="fp-section__head">تقريرك محفوظ</h2>
      <p class="fp-section__sub">تقدر تفتح بصمتك في أي وقت بالكود ده — احتفظ بيه:</p>
      <p class="fp-saved__code">${escapeHtml(code)}</p>
      <div class="fp-saved__actions">
        <a class="fp-btn fp-btn--primary" href="${reportUrl}" target="_blank" rel="noopener">افتح تقريرك المحفوظ</a>
        ${waBtn}
      </div>
    </section>`;
}

/* ============================================================
   تصدير الوثيقة كـ PDF عبر html2pdf — مطابق للشاشة
   ============================================================ */
async function downloadFingerprintPDF(btn){
  const docEl = document.querySelector(".fp-doc");
  if (!docEl) return;

  const original = btn ? btn.textContent : "";
  if (btn){ btn.disabled = true; btn.textContent = "بنجهّز بصمتك…"; }

  // استنى تحميل الخطوط قبل الالتقاط
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(e){}

  const name = (journeyState.user.name || "").trim() || "بصمتي";
  const navyDeep = (getComputedStyle(document.documentElement)
                    .getPropertyValue("--navy-deep") || "").trim() || "#142338";

  const opt = {
    margin: 8,
    filename: `بصمة ${name} — هندسة العقلية.pdf`,
    image:        { type: "jpeg", quality: 0.98 },
    html2canvas:  {
      scale: 2,
      backgroundColor: navyDeep,
      useCORS: true,
      logging: false,
      windowWidth: docEl.scrollWidth
    },
    jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak:    { mode: ["css", "legacy"], avoid: [".fp-section", ".fp-hero"] }
  };

  try {
    if (typeof window.html2pdf === "function"){
      await window.html2pdf().set(opt).from(docEl).save();
    } else {
      // المكتبة مش متحمّلة لأي سبب — ارجع للطباعة العادية
      window.print();
    }
  } catch(err){
    console.error("PDF error", err);
    // بديل: الطباعة العادية
    window.print();
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = original; }
  }
}

/* ============================================================
   مشاركة البصمة (Web Share أو نسخ + toast)
   ============================================================ */
async function shareFingerprint(){
  const name = (journeyState.user.name || "").trim();
  const fpName = journeyState.fingerprint.name || "—";
  const summary =
`بصمة ${name || "—"} — هندسة العقلية
البصمة: ${fpName}

﴿إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّى يُغَيِّرُوا مَا بِأَنْفُسِهِمْ﴾ — الرعد ١١

— منظور الفؤاد`;

  if (navigator.share){
    try {
      await navigator.share({ title: "بصمتي — هندسة العقلية", text: summary });
      return;
    } catch (err){
      // المستخدم لغى — نسقط لطريقة النسخ
      if (err && err.name === "AbortError") return;
    }
  }

  // نسخ للحافظة
  try {
    await navigator.clipboard.writeText(summary);
    showToast("تم نسخ بصمتك");
  } catch (err){
    // fallback يدوي
    const ta = document.createElement("textarea");
    ta.value = summary;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast("تم نسخ بصمتك"); }
    catch { showToast("تعذّر النسخ"); }
    document.body.removeChild(ta);
  }
}

function showToast(msg){
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("is-shown")));
  clearTimeout(t.__hideTimer);
  t.__hideTimer = setTimeout(() => {
    t.classList.remove("is-shown");
    setTimeout(() => { t.hidden = true; }, 350);
  }, 2400);
}

/* ============================================================
   تحديث اسم المشارك (لو اتعبّى لاحقًا)
   ============================================================ */
function refreshParticipant(){
  const el = document.getElementById("participantName");
  el.textContent = journeyState.user.name?.trim() || "—";
}

/* ============================================================
   init
   ============================================================ */
function init(){
  buildRail();
  buildStations();
  refreshParticipant();
  render();
}

document.addEventListener("DOMContentLoaded", init);
