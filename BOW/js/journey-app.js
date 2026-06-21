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



function loadJourneyLocal(){
  try {
    const raw = localStorage.getItem(JOURNEY_SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    // تجاهل أي تقدّم أقدم من ٧ أيام
    if (!d || (Date.now() - (d.savedAt || 0)) > 7*24*60*60*1000){
      localStorage.removeItem(JOURNEY_SAVE_KEY);
      return false;
    }
    journeyState.participantId     = d.participantId || null;
    journeyState.resultCode        = d.resultCode || null;
    journeyState.user              = d.user || journeyState.user;
    journeyState.currentStation    = d.currentStation || 1;
    journeyState.completedStations = d.completedStations || [];
    journeyState.choices           = d.choices || journeyState.choices;
    journeyState.fingerprint       = d.fingerprint || journeyState.fingerprint;
    return true;
  } catch(e){ console.warn("loadJourneyLocal", e); return false; }
}

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
    station3_strategy: null,
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
/* بلوك فيديو Vimeo (مع زرّ احتياطي للفتح الخارجي) */
/* ====================================================================
   (١) استبدال vimeoBlock — حلّ مشكلة الحجم والـ fallback link
   ──────────────────────────────────────────────────────────────────── */
function vimeoBlock(id, title, variant){
  if (!id){
    return `
      <div class="station-video" aria-label="${CONTENT.ui.videoPlaceholder}">
        <div class="station-video__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        </div>
        <div class="station-video__label">${CONTENT.ui.videoPlaceholder}</div>
      </div>`;
  }
  const variantClass = variant ? ` jv-wrap--${variant}` : "";
  return `
    <div class="jv-wrap${variantClass}">
      <div class="jv-frame">
        <iframe src="https://player.vimeo.com/video/${id}?badge=0&autopause=0&player_id=0&app_id=58479"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                referrerpolicy="strict-origin-when-cross-origin"
                title="${escapeHtml(title || "")}"
                loading="lazy"></iframe>
      </div>
    </div>`;
}
 


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

        ${ vimeoBlock(s.videoId, s.title) }

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
         saveJourneyLocal();
    render();
    // scroll لأعلى بسلاسة
    smoothScrollTo(document.getElementById("stationContainer"), 90);
  }, 220);
}

/* ============================================================
   completeStation — إضافة محطة للمكتملة
   ============================================================ */
function completeStation(n){
  let isNew = false;
  if (!journeyState.completedStations.includes(n)){
    journeyState.completedStations.push(n);
    isNew = true;
  }
  saveJourneyLocal();
  if (isNew) saveJourneyRemote();
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
    case "axis-crossover": return renderAxisCrossover(station, mountEl);
    case "door-flavor":    return renderDoorFlavor(station, mountEl);
    case "multi-choice":   return renderMultiChoice(station, mountEl);
    case "covenant":       return renderCovenant(station, mountEl);
    case "strategies-self": return renderStrategiesSelf(station, mountEl);
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
      if (res){
        journeyState.participantId = res.id;
        journeyState.resultCode = res.code;
        putCodeInUrl(res.code);
        saveJourneyLocal();
        saveJourneyRemote();
        showResumeBanner(res.code);
      }
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
   النوع (ج-جديد): axis-crossover — مواقف + تقاطع + واتساب
   ============================================================ */
function injectCrossStyles(){
  if (document.getElementById("jr-cross-styles")) return;
  const s = document.createElement("style");
  s.id = "jr-cross-styles";
  s.textContent = `
  .ix-cross__progress{display:flex;align-items:center;gap:12px;margin-bottom:20px;font-size:12px;color:var(--muted);}
  .ix-cross__bar{flex:1;height:4px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;}
  .ix-cross__fill{height:100%;background:var(--gold);border-radius:99px;transition:width .4s var(--ease);}
  .ix-cross__intro{font-size:15px;color:var(--muted);line-height:1.8;margin:0 0 18px;}
  .ix-cross__scenario{margin-bottom:22px;}
  .ix-cross__text{font-size:18px;color:var(--cream);line-height:1.7;margin:0 0 8px;}
  .ix-cross__prompt{font-size:15px;color:var(--gold);margin:0;}
  .ix-cross__wa{margin-top:24px;padding-top:20px;border-top:1px solid rgba(212,175,55,.18);}`;
  document.head.appendChild(s);
}

function composeAxisEcho(ix, main, caseType, didTiebreak, behaviorLeader){
  let frame;
  if (caseType === "discovery"){
    frame = ix.framing.discovery.replace("{behavior}", AXIS_AR[behaviorLeader] || "");
  } else if (didTiebreak){
    frame = ix.framing.tiebreakNote;
  } else if (caseType === "agreement"){
    frame = ix.framing.agreement;
  } else {
    frame = ix.framing.neutral;
  }
  return frame + "\n\n" + (ix.axisDescriptions[main] || "");
}

function injectAxisReportStyles(){
    if (document.getElementById("ar-styles")) return;
    const s = document.createElement("style");
    s.id = "ar-styles";
    s.textContent = `
    .ar-report{margin-top:28px;}
    .ar-card{background:var(--navy-deep);border:1px solid rgba(212,175,55,.3);border-radius:12px;padding:28px 26px;}
    .ar-eyebrow{font-size:11px;letter-spacing:3px;color:var(--gold);margin:0 0 8px;}
    .ar-title{font-size:26px;color:var(--cream);margin:0 0 6px;font-weight:700;}
    .ar-tagline{color:var(--muted);font-size:15px;margin:0 0 22px;line-height:1.7;}
    .ar-h3{font-size:17px;color:var(--cream);margin:24px 0 12px;font-weight:600;border-top:1px solid rgba(212,175,55,.14);padding-top:20px;}
    .ar-h3.ar-good{color:var(--gold);}
    .ar-h3.ar-warn{color:#e0894f;}
    .ar-p{font-size:15px;line-height:1.9;color:#e7e3da;margin:0 0 12px;}
    .ar-dim{display:flex;gap:14px;margin-bottom:14px;}
    .ar-dim-n{font-family:var(--font-quote);font-size:24px;color:var(--gold);opacity:.7;flex-shrink:0;line-height:1;}
    .ar-dim b{color:var(--cream);font-size:15px;}
    .ar-dim p{font-size:14px;color:var(--muted);line-height:1.75;margin:4px 0 0;}
    .ar-list{margin:0 0 8px;padding-inline-start:20px;}
    .ar-list li{font-size:14px;color:#e7e3da;line-height:1.7;margin-bottom:6px;}
    .ar-list--warn li{color:var(--muted);}
    .ar-tension{display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0;flex-wrap:wrap;}
    .ar-tension span{padding:10px 20px;border:1px solid rgba(212,175,55,.4);border-radius:10px;color:var(--cream);font-weight:600;background:rgba(212,175,55,.05);}
    .ar-tension .ar-vs{border:none;color:var(--muted);font-size:20px;background:none;padding:0;}
    .ar-step{margin-top:22px;padding:22px;background:rgba(212,175,55,.05);border:1px solid rgba(212,175,55,.3);border-radius:10px;}
    .ar-step-eyebrow{font-size:11px;letter-spacing:2px;color:var(--gold);margin:0 0 8px;}
    .ar-step-title{font-size:18px;color:var(--cream);margin:0 0 12px;}
    .ar-verify{margin-top:26px;padding:24px;background:var(--navy-raised);border:1px solid rgba(212,175,55,.35);border-radius:12px;}
    .ar-verify-q{font-size:19px;color:var(--cream);margin:0 0 6px;}
    .ar-verify-note{font-size:13px;color:var(--muted);margin:0 0 18px;line-height:1.7;}
    .ar-scale{display:flex;flex-direction:column;gap:10px;}
    .ar-scale-btn{appearance:none;background:var(--navy);color:var(--cream);border:1px solid var(--sky);border-radius:8px;padding:14px 18px;font:inherit;font-size:15px;cursor:pointer;text-align:right;transition:all .2s;}
    .ar-scale-btn:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
    .ar-scale-btn.ar-picked{border-color:var(--gold);background:rgba(212,175,55,.1);color:var(--gold);font-weight:700;}
    .ar-scale-btn.ar-dim-out{opacity:.35;}
    .ar-confirmed{margin-top:16px;color:var(--gold);font-size:15px;font-weight:600;}
    .ar-correct{margin-top:22px;padding-top:20px;border-top:1px dashed rgba(212,175,55,.3);}
    .ar-cmp{margin-bottom:18px;background:var(--navy);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:16px 18px;}
    .ar-cmp-q{font-size:15px;color:var(--gold);margin:0 0 12px;font-weight:600;}
    .ar-cmp-row{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);}
    .ar-cmp-row:last-child{border-bottom:0;}
    .ar-cmp-ax{flex-shrink:0;width:70px;color:var(--cream);font-weight:600;font-size:14px;}
    .ar-cmp-txt{color:var(--muted);font-size:14px;line-height:1.7;}
    .ar-cmp-pick{font-size:16px;color:var(--cream);margin:18px 0 12px;font-weight:600;}
    @media (max-width:768px){.ar-card{padding:22px 18px;}.ar-cmp-row{flex-direction:column;gap:2px;}.ar-cmp-ax{width:auto;}}
       .jv-wrap{margin:24px 0;}
    .jv-frame{position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;border:1px solid rgba(212,175,55,.3);background:#000;}
    .jv-frame iframe{position:absolute;inset:0;width:100%;height:100%;}
    .jv-ext{display:inline-block;margin-top:8px;font-size:12px;color:var(--muted);text-decoration:underline;}
    .jv-ext:hover{color:var(--gold);}
    .fl-doorvid{margin:18px 0 6px;}
    .fl-otherbtn{appearance:none;background:transparent;color:var(--cream);border:1px dashed rgba(212,175,55,.4);border-radius:8px;padding:12px 18px;font:inherit;font-size:14px;cursor:pointer;margin-top:18px;transition:all .2s;}
    .fl-otherbtn:hover{border-color:var(--gold);color:var(--gold);}
    .fl-other{margin-top:18px;display:flex;flex-direction:column;gap:22px;}
    .fl-other__door{background:var(--navy);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:18px;}
    .fl-other__name{color:var(--gold);font-weight:700;font-size:16px;margin:0 0 12px;}
    .fl-other__flavors{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
    .fl-other__fl{display:flex;gap:10px;font-size:14px;color:var(--muted);line-height:1.7;}
    .fl-other__fl b{color:var(--cream);}
    .fl-changebtn{appearance:none;background:rgba(212,175,55,.08);color:var(--cream);border:1px solid var(--gold);border-radius:8px;padding:11px 16px;font:inherit;font-size:13px;cursor:pointer;margin-top:10px;transition:all .2s;}
    .fl-changebtn:hover{background:rgba(212,175,55,.16);color:var(--gold);}
    .fl-verify{margin-top:22px;padding:20px;background:var(--navy-raised);border:1px solid rgba(212,175,55,.35);border-radius:10px;}`;
    document.head.appendChild(s);
  }

function renderAxisCrossover(station, mountEl){
  injectCrossStyles();
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");

  /* الاسترجاع: لو المحطة خلصت قبل كده — اعرض النتيجة بس */
  const savedMain = journeyState.choices.station4_axisMain;
  if (savedMain && ix.axisDescriptions[savedMain]){
    const echo = composeAxisEcho(ix, savedMain,
      journeyState.choices.station4_caseType,
      journeyState.choices.station4_didTiebreak,
      journeyState.choices.station4_behaviorLeader);
    mountEl.innerHTML = `<div class="ix ix-axis ix-axis--done"><p class="ix-form__note">حفظنا بصمتك. تقدر تكمّل لمحطتك الجاية في أي وقت.</p></div>`;
    showEcho(stationEl, echo, false);
    unlockNext(stationEl);
    return;
  }

  const local = {
    scenarioIdx: 0,
    behavior: { tamasok:0, hayawiyya:0, intima:0 },
    answers: {}, elim: null, retained: null,
    caseType: null, needTiebreak: false, behaviorLeader: null,
    autoMain: null, main: null, didTiebreak: false
  };

  renderScenario();

  function lockButtons(btns, chosen){
    btns.forEach(x => { x.dataset.locked = "1"; x.disabled = true;
      if (x !== chosen) x.classList.add("is-disabled"); });
    chosen.classList.add("is-selected");
  }

  function renderScenario(){
    const total = ix.scenarios.length;
    const s = ix.scenarios[local.scenarioIdx];
    const num = local.scenarioIdx + 1;
    mountEl.innerHTML = `
      <div class="ix ix-axis ix-cross">
        <div class="ix-cross__progress">
          <span>الموقف ${toArabicDigits(num)} / ${toArabicDigits(total)}</span>
          <div class="ix-cross__bar"><div class="ix-cross__fill" style="width:${(num/total)*100}%"></div></div>
        </div>
        ${ local.scenarioIdx === 0 ? `<p class="ix-cross__intro">${escapeHtml(ix.intro)}</p>` : `` }
        <div class="ix-cross__scenario">
          <p class="ix-cross__text">${escapeHtml(s.scenario)}</p>
          ${ s.prompt ? `<p class="ix-cross__prompt">${escapeHtml(s.prompt)}</p>` : `` }
        </div>
        <div class="ix-choice__list" role="radiogroup">
          ${s.options.map(o => `
            <button type="button" class="ix-choice__btn" data-axis="${escapeHtml(o.axis)}">
              <span class="ix-choice__label">${escapeHtml(o.label)}</span>
              <span class="ix-choice__mark" aria-hidden="true">✓</span>
            </button>`).join("")}
        </div>
      </div>`;
    const btns = mountEl.querySelectorAll(".ix-choice__btn");
    btns.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.locked) return;
      lockButtons(btns, b);
      local.behavior[b.dataset.axis]++;
      local.answers["s" + (local.scenarioIdx + 1)] = b.dataset.axis;
      setTimeout(() => {
        local.scenarioIdx++;
        if (local.scenarioIdx >= total) renderElimination();
        else renderScenario();
        smoothScrollTo(stationEl.querySelector(".station-header"), 90);
      }, 300);
    }));
  }

  function renderElimination(){
    const e = ix.elimination;
    mountEl.innerHTML = `
      <div class="ix ix-axis ix-cross">
        <p class="ix-cross__intro">${escapeHtml(ix.eliminationIntro)}</p>
        <h2 class="ix__prompt">${escapeHtml(e.prompt)}</h2>
        <div class="ix-choice__list" role="radiogroup">
          ${e.options.map(o => `
            <button type="button" class="ix-choice__btn" data-axis="${escapeHtml(o.id)}">
              <span class="ix-choice__label">${escapeHtml(o.label)}</span>
              <span class="ix-choice__mark" aria-hidden="true">✓</span>
            </button>`).join("")}
        </div>
      </div>`;
    const btns = mountEl.querySelectorAll(".ix-choice__btn");
    btns.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.locked) return;
      lockButtons(btns, b);
      local.elim = b.dataset.axis;
      compute();
      setTimeout(() => { local.needTiebreak ? renderTiebreak() : finalize(); }, 350);
    }));
  }

  function compute(){
    const axes = ["tamasok","hayawiyya","intima"];
    const bh = local.behavior;
    local.retained = axes.filter(a => a !== local.elim);
    const counts = axes.map(a => bh[a]);
    const maxC = Math.max(...counts), minC = Math.min(...counts);
    const elimSoleMax = bh[local.elim] === maxC && counts.filter(c => c === maxC).length === 1;
    const elimSoleMin = bh[local.elim] === minC && counts.filter(c => c === minC).length === 1;
    local.caseType = elimSoleMax ? "discovery" : (elimSoleMin ? "agreement" : "neutral");
    local.behaviorLeader = axes.reduce((a,b) => bh[b] > bh[a] ? b : a);
    const [r1, r2] = local.retained;
    local.autoMain = bh[r1] >= bh[r2] ? r1 : r2;
    local.needTiebreak = (bh[r1] === bh[r2]) || (local.caseType === "discovery");
  }

  function renderTiebreak(){
    const [r1, r2] = local.retained;
    const t = ix.tiebreak;
    const prompt = t.promptTemplate.replace("{a}", AXIS_AR[r1]).replace("{b}", AXIS_AR[r2]);
    mountEl.innerHTML = `
      <div class="ix ix-axis ix-cross">
        ${ local.caseType === "discovery" ? `<p class="ix-cross__intro">${escapeHtml(t.discoveryHint)}</p>` : `` }
        <h2 class="ix__prompt">${escapeHtml(prompt)}</h2>
        <div class="ix-choice__list" role="radiogroup">
          ${[r1, r2].map(ax => `
            <button type="button" class="ix-choice__btn" data-axis="${ax}">
              <span class="ix-choice__label">${escapeHtml(t.keepLabels[ax])}</span>
              <span class="ix-choice__mark" aria-hidden="true">✓</span>
            </button>`).join("")}
        </div>
      </div>`;
    const btns = mountEl.querySelectorAll(".ix-choice__btn");
    btns.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.locked) return;
      lockButtons(btns, b);
      local.main = b.dataset.axis;
      local.didTiebreak = true;
      setTimeout(finalize, 350);
    }));
  }

  function finalize(){
    const main = local.main || local.autoMain;
    const sub  = local.retained.find(a => a !== main);
    journeyState.choices.station4_axisMain       = main;
    journeyState.choices.station4_axisSub        = sub;
    journeyState.choices.station4_eliminated     = local.elim;
    journeyState.choices.station4_behavior       = { ...local.behavior };
    journeyState.choices.station4_scenarios      = { ...local.answers };
    journeyState.choices.station4_caseType       = local.caseType;
    journeyState.choices.station4_didTiebreak    = !!local.didTiebreak;
    journeyState.choices.station4_behaviorLeader = local.behaviorLeader;
    journeyState.fingerprint.axis                = main;

    const echo = composeAxisEcho(ix, main, local.caseType, !!local.didTiebreak, local.behaviorLeader);
    mountEl.innerHTML = `<div class="ix ix-axis ix-axis--done"><p class="ix-form__note">${escapeHtml(ix.resultNote)}</p></div>`;
    showEcho(stationEl, echo, true);
    completeStation(station.id);
    setTimeout(() => smoothScrollTo(stationEl.querySelector("[data-role='echo']")), 380);
    setTimeout(() => renderAxisReport(stationEl, mountEl, main), 1200);
  }

   /* تقرير المحور التفصيلي + سؤال التحقق */
  function renderAxisReport(stationEl, mountEl, mainAxis){
    injectAxisReportStyles();
    const R = (window.JOURNEY_AXIS_REPORT || {})[mainAxis];
    if (!R){ renderWhatsapp(); return; }
    const host = mountEl.querySelector(".ix-axis--done") || mountEl;
    const block = document.createElement("div");
    block.className = "ar-report";
    block.innerHTML = `
      <div class="ar-card">
        <p class="ar-eyebrow">تقرير محورك التفصيلي</p>
        <h2 class="ar-title">محور ${escapeHtml(R.name)}</h2>
        <p class="ar-tagline">${escapeHtml(R.tagline)}</p>

        <h3 class="ar-h3">أبعاد محورك التلاتة</h3>
        ${R.dimensions.map((d,i) => `<div class="ar-dim"><span class="ar-dim-n">${toArabicDigits(i+1)}</span><div><b>${escapeHtml(d.name)}</b><p>${escapeHtml(d.body)}</p></div></div>`).join("")}

        <h3 class="ar-h3 ar-good">${escapeHtml(R.fitra.title)}</h3>
        <p class="ar-p">${escapeHtml(R.fitra.body)}</p>
        <ul class="ar-list">${R.fitra.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>

        <h3 class="ar-h3 ar-warn">${escapeHtml(R.qina_ifrat.title)}</h3>
        <p class="ar-p">${escapeHtml(R.qina_ifrat.body)}</p>
        <ul class="ar-list ar-list--warn">${R.qina_ifrat.signs.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>

        <h3 class="ar-h3 ar-warn">${escapeHtml(R.qina_tafrit.title)}</h3>
        <p class="ar-p">${escapeHtml(R.qina_tafrit.body)}</p>
        <ul class="ar-list ar-list--warn">${R.qina_tafrit.signs.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>

        <h3 class="ar-h3">${escapeHtml(R.tension.title)}</h3>
        <div class="ar-tension"><span>${escapeHtml(R.tension.between[0])}</span><span class="ar-vs">↔</span><span>${escapeHtml(R.tension.between[1])}</span></div>
        <p class="ar-p">${escapeHtml(R.tension.body)}</p>

        <div class="ar-step">
          <p class="ar-step-eyebrow">${escapeHtml(R.step.eyebrow)}</p>
          <h4 class="ar-step-title">${escapeHtml(R.step.title)}</h4>
          <p class="ar-p">${escapeHtml(R.step.body)}</p>
        </div>
      </div>

      <div class="ar-verify">
        <h3 class="ar-verify-q">إلى أي مدى الكلام ده بيوصفك فعلًا؟</h3>
        <p class="ar-verify-note">كن صادقًا — ده بيحدّد إذا كنّا وصلنا لمحورك الصح ولا محتاجين نراجع.</p>
        <div class="ar-scale">
          ${[["5","بيوصفني تمامًا"],["4","لحدٍّ كبير"],["3","لحدٍّ ما"],["2","مش حاسس بيه قوي"],["1","مش أنا خالص"]].map(([v,l]) =>
            `<button type="button" class="ar-scale-btn" data-score="${v}">${escapeHtml(l)}</button>`).join("")}
        </div>
      </div>`;
    host.appendChild(block);
    setTimeout(() => smoothScrollTo(block, 80), 200);

    block.querySelectorAll(".ar-scale-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const score = +btn.dataset.score;
        block.querySelectorAll(".ar-scale-btn").forEach(b => { b.disabled = true; if (b!==btn) b.classList.add("ar-dim-out"); });
        btn.classList.add("ar-picked");
        journeyState.choices.station4_matchScore = score;
        saveJourneyLocal(); saveJourneyRemote();
        if (score >= 3){
          const ok = document.createElement("p");
          ok.className = "ar-confirmed";
          ok.textContent = "تمام — محورك متأكّد. نكمّل.";
          block.querySelector(".ar-verify").appendChild(ok);
          setTimeout(renderWhatsapp, 700);
        } else {
          renderAxisCorrection(stationEl, mountEl, block, mainAxis);
        }
      });
    });
  }

  /* المقارنة الحاسمة على بُعدين عند التقييم المنخفض */
  function renderAxisCorrection(stationEl, mountEl, reportBlock, currentAxis){
    const D = (window.AXIS_DISTINCTIONS || {}).dimensions || [];
    const axes = ["tamasok","hayawiyya","intima"];
    const block = document.createElement("div");
    block.className = "ar-correct";
    block.innerHTML = `
      <h3 class="ar-h3">طب خلّينا نتأكّد — ده قرار مهم</h3>
      <p class="ar-p">قارن بنفسك بين المحاور التلاتة في البُعدين دول، واختار اللي بيوصفك فعلًا:</p>
      ${D.map(dim => `
        <div class="ar-cmp">
          <p class="ar-cmp-q">${escapeHtml(dim.q)}</p>
          ${axes.map(a => `<div class="ar-cmp-row"><span class="ar-cmp-ax">${escapeHtml((window.AXIS_AR||{})[a]||a)}</span><span class="ar-cmp-txt">${escapeHtml(dim.answers[a])}</span></div>`).join("")}
        </div>`).join("")}
      <p class="ar-cmp-pick">بعد ما قرأت — أنهي محور أقرب لك فعلًا؟</p>
      <div class="ix-choice__list">
        ${axes.map(a => `<button type="button" class="ix-choice__btn" data-axis="${a}"><span class="ix-choice__label">${escapeHtml((window.AXIS_AR||{})[a]||a)}</span><span class="ix-choice__mark">✓</span></button>`).join("")}
      </div>`;
    reportBlock.appendChild(block);
    setTimeout(() => smoothScrollTo(block, 80), 200);

    block.querySelectorAll(".ix-choice__btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const chosen = btn.dataset.axis;
        block.querySelectorAll(".ix-choice__btn").forEach(b => { b.disabled = true; if (b.dataset.axis!==chosen){ b.classList.add("is-disabled"); } });
        btn.classList.add("is-selected");
        const changed = chosen !== currentAxis;
        if (changed){
          const sub = journeyState.choices.station4_axisSub;
          journeyState.choices.station4_axisSub = (sub === chosen) ? currentAxis : sub;
          journeyState.choices.station4_axisMain = chosen;
          journeyState.fingerprint.axis = chosen;
          journeyState.choices.station4_corrected = true;
        } else {
          journeyState.choices.station4_corrected = false;
        }
        saveJourneyLocal(); saveJourneyRemote();
        const msg = document.createElement("p");
        msg.className = "ar-confirmed";
        msg.textContent = changed ? `صحّحنا محورك إلى ${(window.AXIS_AR||{})[chosen]}. نكمّل على الصح.` : "أكّدت محورك. نكمّل.";
        block.appendChild(msg);
        setTimeout(renderWhatsapp, 800);
      });
    });
  }

  

  function renderWhatsapp(){
    const w = ix.whatsapp;
    const host = mountEl.querySelector(".ix-axis--done") || mountEl;
    const block = document.createElement("div");
    block.className = "ix-cross__wa";
    block.innerHTML = `
      <h2 class="ix__prompt">${escapeHtml(w.prompt)}</h2>
      <form class="ix-form ix-form--stack" novalidate>
        <div class="ix-radio-group" role="radiogroup">
          ${w.radioOptions.map(o => `
            <label class="ix-radio">
              <input type="radio" name="wa_consent" value="${escapeHtml(o.value)}">
              <span class="ix-radio__mark" aria-hidden="true"></span>
              <span class="ix-radio__label">${escapeHtml(o.label)}</span>
            </label>`).join("")}
          <div class="ix-field__error" role="alert" data-role="consent-error"></div>
        </div>
        <div class="ix-field" data-field="whatsapp" hidden>
          <label class="ix-field__label">${escapeHtml(w.whatsappLabel)}</label>
          <input class="ix-field__input" type="tel" name="whatsapp" inputmode="tel" dir="ltr" style="text-align:right;" placeholder="${escapeHtml(w.whatsappPlaceholder)}" autocomplete="off">
          <div class="ix-field__error" role="alert"></div>
        </div>
        <p class="ix-form__note">${escapeHtml(w.note)}</p>
        <div class="ix-form__actions">
          <button type="submit" class="ix-form__submit">${escapeHtml(w.submitLabel)}</button>
        </div>
      </form>`;
    host.appendChild(block);

    const form = block.querySelector("form");
    const waField = block.querySelector(".ix-field[data-field='whatsapp']");
    const waInput = waField.querySelector("input");
    const rads = form.querySelectorAll("[name='wa_consent']");
    const cErr = form.querySelector("[data-role='consent-error']");

    rads.forEach(r => r.addEventListener("change", () => {
      waField.hidden = (r.value !== "yes"); cErr.textContent = "";
    }));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      cErr.textContent = "";
      waField.querySelector(".ix-field__error").textContent = "";
      const chosen = [...rads].find(r => r.checked);
      if (!chosen){ cErr.textContent = w.errors.consent; return; }
      if (chosen.value === "yes"){
        const val = waInput.value.trim();
        if (!val){ waField.querySelector(".ix-field__error").textContent = w.errors.whatsapp; waInput.focus(); return; }
        journeyState.user.whatsapp = val; journeyState.user.consentWhatsapp = true;
      } else {
        journeyState.user.whatsapp = ""; journeyState.user.consentWhatsapp = false;
      }
      Persist.saveContact(journeyState.participantId, {
        whatsapp: journeyState.user.whatsapp,
        consentWhatsapp: journeyState.user.consentWhatsapp
      });
      saveJourneyLocal();
      form.classList.add("is-submitted");
      form.querySelectorAll("input, button").forEach(el => el.disabled = true);
      const ok = document.createElement("p");
      ok.className = "ix-form__note"; ok.style.color = "var(--gold)";
      ok.textContent = w.thanks; block.appendChild(ok);
      unlockNext(stationEl);
      setTimeout(() => smoothScrollTo(stationEl.querySelector(".station-nav"), 120), 250);
    });
  }
}

/* ============================================================
   النوع (د): door-flavor — اختيار الباب ثم النكهة → بطاقة بصمة
   ============================================================ */
/* ====================================================================
   (٢) renderDoorFlavor الجديد — Phase A → F
   ──────────────────────────────────────────────────────────────────── */
function renderDoorFlavor(station, mountEl){
  const ix = station.interaction;
  const stationEl = mountEl.closest(".station");
 
  /* الاسترجاع الكامل: لو خلّص كل المحطة قبل كده */
  /* الاسترجاع الكامل: لو خلّص كل المحطة قبل كده */
  const savedDoor   = journeyState.choices.station5_door;
  const savedFlavor = journeyState.choices.station5_flavor;
  if (savedDoor && savedFlavor != null && ix.q2.flavorEchoes[savedFlavor]){
    mountEl.innerHTML = `<div class="df-stage" data-current="E"></div>`;
    const stage = mountEl.querySelector(".df-stage");
    const localResumed = {
      door:   savedDoor,
      flavor: savedFlavor,
      flavorMatch: journeyState.choices.station5_flavorMatch || null
    };
    dfRenderPhaseE(stage, ix, localResumed);
    unlockNext(stationEl);
    return;
  }
 
  /* البناء الأولي */
  mountEl.innerHTML = `<div class="df-stage" data-current="A"></div>`;
  const stage = mountEl.querySelector(".df-stage");
 
  const local = {
    door: null,
    flavor: null,
    flavorMatch: null
  };
 
  dfRenderPhaseA(stage, ix, local);
}
 
/* ── أيقونات الأبواب ── */
const DF_DOOR_ICONS = {
  hemma: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  ons:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  yaqeen:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
};
 
const DF_DOOR_LINES = {
  hemma:  "الحركة والفعل تيجي أول",
  ons:    "الصلة والقُرب تيجي أول",
  yaqeen: "الفهم والوضوح يجوا أول"
};
 
/* ────────────────────────────────────────────────────────────────────
   Phase A — اختيار الباب
   ──────────────────────────────────────────────────────────────────── */
function dfRenderPhaseA(stage, ix, local){
  stage.dataset.current = "A";
  stage.innerHTML = `
    <div class="df-phase is-entering" data-phase="A">
      <p class="df-question">${escapeHtml(ix.q1.prompt)}</p>
      <div class="df-doors" role="radiogroup" aria-label="اختر بابك">
        ${ix.q1.options.map(o => `
          <button type="button" class="df-door-card" data-door="${escapeHtml(o.id)}" role="radio" aria-checked="false">
            <span class="df-door-card__icon" aria-hidden="true">${DF_DOOR_ICONS[o.id] || ""}</span>
            <p class="df-door-card__name">${escapeHtml(DOOR_AR[o.id] || o.label)}</p>
            <p class="df-door-card__line">${escapeHtml(DF_DOOR_LINES[o.id] || "")}</p>
          </button>
        `).join("")}
      </div>
    </div>
  `;
 
  const cards = stage.querySelectorAll(".df-door-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      if (local.door) return;
      local.door = card.dataset.door;
 
      // حفظ الباب
      journeyState.choices.station5_door = local.door;
      journeyState.fingerprint.door = local.door;
 
      // تأثير اختيار
      cards.forEach(c => {
        const isMatch = c === card;
        c.classList.toggle("is-selected", isMatch);
        c.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch) c.classList.add("is-dim");
      });
 
      // انتقال لـ Phase B
      setTimeout(() => dfTransitionTo(stage, () => dfRenderPhaseB(stage, ix, local)), 500);
    });
  });
}
 
/* ────────────────────────────────────────────────────────────────────
   Phase B — شاشة الباب: فيديو الباب + الـecho + كروت النكهات
   ──────────────────────────────────────────────────────────────────── */
function dfRenderPhaseB(stage, ix, local){
  stage.dataset.current = "B";
  const doorVid    = ix.doorVideos ? ix.doorVideos[local.door] : "";
  const doorName   = DOOR_AR[local.door] || "";
  const doorEcho   = ix.q1.doorEchoes[local.door] || "";
  const flavors    = ix.q2.flavorsByDoor[local.door];
  const flavorsPrompt = ix.q2.promptByDoor[local.door];
 
  stage.innerHTML = `
    <div class="df-phase is-entering" data-phase="B">
      <div class="df-door-header">
        <p class="df-door-header__eyebrow">بابك</p>
        <h2 class="df-door-header__name">${escapeHtml(doorName)}</h2>
      </div>
 
      ${ doorVid ? vimeoBlock(doorVid, doorName, "door") : "" }
 
      <div class="df-door-echo">${textToParagraphs(doorEcho)}</div>
 
      <p class="df-flavors-prompt">${escapeHtml(flavorsPrompt)}</p>
 
      <div class="df-flavors" role="radiogroup" aria-label="اختر نكهتك">
        ${flavors.map(f => `
          <button type="button" class="df-flavor-card" data-flavor="${f.id}" role="radio" aria-checked="false">
            <span class="df-flavor-card__num">${toArabicDigits(f.id)}</span>
            <div class="df-flavor-card__body">
              <p class="df-flavor-card__name">${escapeHtml(FLAVOR_AR[f.id])}</p>
              <p class="df-flavor-card__line">${escapeHtml(f.label)}</p>
            </div>
          </button>
        `).join("")}
      </div>
    </div>
  `;
 
  // scroll لأعلى الـ phase
  setTimeout(() => smoothScrollTo(stage, 80), 100);
 
  const cards = stage.querySelectorAll(".df-flavor-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      if (local.flavor != null) return;
      local.flavor = +card.dataset.flavor;
 
      // حفظ النكهة المبدئية
      dfSaveFlavor(local.flavor);
 
      // تأثير اختيار
      cards.forEach(c => {
        const isMatch = c === card;
        c.classList.toggle("is-selected", isMatch);
        c.setAttribute("aria-checked", isMatch ? "true" : "false");
        if (!isMatch) c.classList.add("is-dim");
      });
 
      // انتقال لـ Phase C
      setTimeout(() => dfTransitionTo(stage, () => dfRenderPhaseC(stage, ix, local)), 500);
    });
  });
}
 
/* ────────────────────────────────────────────────────────────────────
   Phase C — شاشة النكهة: شرح + سؤال التحقق
   ──────────────────────────────────────────────────────────────────── */
function dfRenderPhaseC(stage, ix, local){
  stage.dataset.current = "C";
  const doorName   = DOOR_AR[local.door] || "";
  const flavorName = FLAVOR_AR[local.flavor] || "";
  const flavorEcho = ix.q2.flavorEchoes[local.flavor] || "";
 
  stage.innerHTML = `
    <div class="df-phase is-entering" data-phase="C">
      <div class="df-breadcrumb">
        <span>باب ${escapeHtml(doorName)}</span>
        <span class="df-breadcrumb__sep">•</span>
        <span class="df-breadcrumb__current">نكهة ${escapeHtml(flavorName)}</span>
      </div>
 
      <div class="df-flavor-header">
        <p class="df-flavor-header__eyebrow">طابعك</p>
        <h2 class="df-flavor-header__name">${escapeHtml(flavorName)}</h2>
      </div>
 
      <div class="df-flavor-prose">${textToParagraphs(flavorEcho)}</div>
 
      <div class="df-verify">
        <h3 class="df-verify__q">${escapeHtml(ix.flavorVerifyPrompt || "النكهة دي بتوصفك فعلًا؟")}</h3>
        <p class="df-verify__note">كن صادقًا — التقييم ده بيساعدنا نتأكّد إن البصمة دقيقة عليك.</p>
        <div class="df-scale">
          ${[
            ["5","بتوصفني تمامًا"],
            ["4","لحدٍّ كبير"],
            ["3","لحدٍّ ما"],
            ["2","مش حاسس بيها قوي"],
            ["1","مش أنا خالص"]
          ].map(([v,l]) => `
            <button type="button" class="df-scale__btn" data-score="${v}">
              <span class="df-scale__num">${toArabicDigits(v)}</span>
              <span class="df-scale__label">${escapeHtml(l)}</span>
            </button>
          `).join("")}
        </div>
        <p class="df-verify__result" data-role="verify-result"></p>
      </div>
    </div>
  `;
 
  setTimeout(() => smoothScrollTo(stage, 80), 100);
 
  const buttons = stage.querySelectorAll(".df-scale__btn");
  const resultEl = stage.querySelector("[data-role='verify-result']");
 
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (local.flavorMatch != null) return;
      const score = +btn.dataset.score;
      local.flavorMatch = score;
 
      // حفظ التقييم
      journeyState.choices.station5_flavorMatch = score;
      saveJourneyLocal();
 
      // تأثير
      buttons.forEach(b => {
        b.disabled = true;
        if (b !== btn) b.classList.add("is-dim");
      });
      btn.classList.add("is-picked");
 
      if (score >= 3){
        resultEl.textContent = "تمام — نكهتك مؤكّدة.";
        resultEl.classList.add("is-shown");
        // مباشرة لـ Phase E
        setTimeout(() => dfTransitionTo(stage, () => dfRenderPhaseE(stage, ix, local)), 1100);
      } else {
        resultEl.textContent = "نتأكّد سوا — هنقارن لك نكهات بابك.";
        resultEl.classList.add("is-shown");
        // لـ Phase D للتصحيح
        setTimeout(() => dfTransitionTo(stage, () => dfRenderPhaseD(stage, ix, local)), 1100);
      }
    });
  });
}
 
/* ────────────────────────────────────────────────────────────────────
   Phase D — مقارنة حاسمة بين نكهات الباب الثلاثة
   ──────────────────────────────────────────────────────────────────── */
function dfRenderPhaseD(stage, ix, local){
  stage.dataset.current = "D";
  const doorName = DOOR_AR[local.door] || "";
  const flavors  = ix.q2.flavorsByDoor[local.door];
  const currentFlavor = local.flavor;
 
  stage.innerHTML = `
    <div class="df-phase is-entering" data-phase="D">
      <div class="df-compare-intro">
        <p class="df-compare-intro__eyebrow">المقارنة الحاسمة</p>
        <h2 class="df-compare-intro__title">نكهات باب ${escapeHtml(doorName)}</h2>
        <p class="df-compare-intro__sub">اقرأ الالتزام المخفي لكل نكهة — اللي بيشتغل من سنين جوّاك من غير ما تنتبه — واختار اللي بتحسّها بتوصفك فعلًا.</p>
      </div>
 
      <div class="df-compare-grid">
        ${flavors.map(f => {
          const isCurrent = f.id === currentFlavor;
          const commit = ix.flavorCommit[f.id] || "";
          return `
            <div class="df-compare-card ${isCurrent ? 'is-current' : ''}">
              ${ isCurrent ? `<span class="df-compare-card__badge">نكهتك الحالية</span>` : `` }
              <h3 class="df-compare-card__name">${escapeHtml(FLAVOR_AR[f.id])}</h3>
              <p class="df-compare-card__commit">${escapeHtml(commit)}</p>
              <button type="button" class="df-compare-card__btn" data-flavor="${f.id}">
                ${ isCurrent ? "أأكّد دي نكهتي" : "دي الأقرب ليّ" }
              </button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
 
  setTimeout(() => smoothScrollTo(stage, 80), 100);
 
  const buttons = stage.querySelectorAll(".df-compare-card__btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const newFlavor = +btn.dataset.flavor;
      const changed = newFlavor !== currentFlavor;
 
      buttons.forEach(b => {
        b.disabled = true;
        if (+b.dataset.flavor !== newFlavor) b.classList.add("is-dim");
      });
      btn.classList.add("is-picked");
 
      if (changed){
        local.flavor = newFlavor;
        dfSaveFlavor(newFlavor);
        journeyState.choices.station5_flavorCorrected = true;
      }
      saveJourneyLocal();
 
      setTimeout(() => dfTransitionTo(stage, () => dfRenderPhaseE(stage, ix, local)), 900);
    });
  });
}
 
/* ────────────────────────────────────────────────────────────────────
   Phase E — البصمة + دعوة الاستكشاف
   ──────────────────────────────────────────────────────────────────── */
function dfRenderPhaseE(stage, ix, local, opts){
  opts = opts || {};
  stage.dataset.current = "E";
  const stationEl = stage.closest(".station");
 
  stage.innerHTML = `
    <div class="df-phase is-entering" data-phase="E">
      <div class="df-fingerprint-stage">
        ${ renderFingerprintCardHtml(ix) }
      </div>
 
      <div class="df-explore-invite" data-role="explore-invite">
        <h3 class="df-explore-invite__title">حابب تستكشف الأبواب التانية؟</h3>
        <p class="df-explore-invite__sub">بصمتك محفوظة. الاستكشاف اختياري — ممكن تتفرّج على الأبواب التانية بفيديوهاتها ونكهاتها، ولو حسّيت إن باب تاني أقرب ليك، تقدر تجرّبه.</p>
        <div class="df-explore-invite__actions">
          <button type="button" class="df-explore-btn" data-action="open-explore">استكشف الأبواب</button>
          <button type="button" class="df-explore-btn df-explore-btn--primary" data-action="continue">أكمّل بصمتي</button>
        </div>
      </div>
    </div>
  `;
 
  // أنيميشن بطاقة البصمة
  animateFingerprintCard(stage, true);
 
  // إظهار الدعوة بعد البطاقة
  const invite = stage.querySelector("[data-role='explore-invite']");
  setTimeout(() => invite.classList.add("is-shown"), 1400);
 
 // حفظ نهائي + فتح زر التالي
  completeStation(+stationEl.dataset.station);
  saveJourneyRemote();
  unlockNext(stationEl);
 
  setTimeout(() => smoothScrollTo(stage.querySelector(".ix-fingerprint-card"), 100), 600);
 
  // ربط أزرار الدعوة
  stage.querySelector("[data-action='continue']").addEventListener("click", () => {
    // scroll لزر التالي
    smoothScrollTo(stationEl.querySelector(".station-nav"), 120);
  });
  stage.querySelector("[data-action='open-explore']").addEventListener("click", () => {
    dfOpenExploreOverlay(ix, local, stage);
  });
}
 
/* ────────────────────────────────────────────────────────────────────
   Phase F — overlay الاستكشاف
   ──────────────────────────────────────────────────────────────────── */
function dfOpenExploreOverlay(ix, local, stage){
  // أزل overlay قديم إن وجد
  const old = document.getElementById("dfExplore");
  if (old) old.remove();
 
  const allDoors = Object.keys(ix.q1.doorEchoes);
  const currentDoor = local.door;
  // التاب الافتراضي: أول باب مش بابه الحالي
  const defaultTab = allDoors.find(d => d !== currentDoor) || allDoors[0];
 
  const overlay = document.createElement("div");
  overlay.id = "dfExplore";
  overlay.className = "df-explore";
  overlay.setAttribute("aria-hidden", "false");
  overlay.innerHTML = `
    <div class="df-explore__header">
      <div>
        <h2 class="df-explore__title">استكشاف الأبواب</h2>
        <p class="df-explore__current">بصمتك الحالية: <b>${escapeHtml(journeyState.fingerprint.name || "—")}</b> — محفوظة</p>
      </div>
      <button type="button" class="df-explore__close" data-action="close">
        <span>إغلاق</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
 
    <div class="df-explore__tabs" role="tablist">
      ${allDoors.map(d => `
        <button type="button" class="df-explore__tab ${d === defaultTab ? 'is-active' : ''}" data-tab="${d}" role="tab">
          ${escapeHtml(DOOR_AR[d])}
          ${ d === currentDoor ? `<span class="df-explore__tab-badge">بابك</span>` : `` }
        </button>
      `).join("")}
    </div>
 
    ${allDoors.map(d => `
      <div class="df-explore__panel" data-panel="${d}" ${d === defaultTab ? '' : 'hidden'}>
        ${ dfBuildExplorePanel(ix, d, currentDoor) }
      </div>
    `).join("")}
  `;
 
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
 
  // فتح بـ animation
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-open")));
 
  // إغلاق
  const close = () => dfCloseExploreOverlay(overlay);
  overlay.querySelector("[data-action='close']").addEventListener("click", close);
 
  // Esc
  overlay.__escHandler = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", overlay.__escHandler);
 
  // تابات
  overlay.querySelectorAll(".df-explore__tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      overlay.querySelectorAll(".df-explore__tab").forEach(t => t.classList.toggle("is-active", t === tab));
      overlay.querySelectorAll(".df-explore__panel").forEach(p => {
        p.hidden = p.dataset.panel !== target;
      });
      // scroll panel لأعلى
      overlay.scrollTop = 0;
    });
  });
 
  // أزرار "جرّب فيه"
  overlay.querySelectorAll("[data-action='try-door']").forEach(btn => {
    btn.addEventListener("click", () => {
      const newDoor = btn.dataset.door;
      dfHandleTryNewDoor(newDoor, ix, local, stage, overlay);
    });
  });
}
 
function dfBuildExplorePanel(ix, doorId, currentDoor){
  const doorName = DOOR_AR[doorId] || "";
  const doorEcho = ix.q1.doorEchoes[doorId] || "";
  const doorVid  = ix.doorVideos ? ix.doorVideos[doorId] : "";
  const flavors  = ix.q2.flavorsByDoor[doorId];
  const isCurrent = doorId === currentDoor;
 
  return `
    <div class="df-explore__panel-head">
      <p class="df-explore__panel-eyebrow">${isCurrent ? "بابك الحالي" : "اكتشف"}</p>
      <h2 class="df-explore__panel-name">${escapeHtml(doorName)}</h2>
    </div>
 
    ${ doorVid ? vimeoBlock(doorVid, doorName, "explore") : "" }
 
    <div class="df-explore__echo">${textToParagraphs(doorEcho)}</div>
 
    <p class="df-explore__flavors-title">نكهات باب ${escapeHtml(doorName)}</p>
    <div class="df-explore__flavors">
      ${flavors.map(f => `
        <div class="df-explore__flavor">
          <span class="df-explore__flavor-num">${toArabicDigits(f.id)}</span>
          <div class="df-explore__flavor-body">
            <p class="df-explore__flavor-name">${escapeHtml(FLAVOR_AR[f.id])}</p>
            <p class="df-explore__flavor-commit">${escapeHtml(ix.flavorCommit[f.id] || "")}</p>
          </div>
        </div>
      `).join("")}
    </div>
 
    ${ !isCurrent ? `
      <div class="df-explore__try">
        <button type="button" class="df-explore__try-btn" data-action="try-door" data-door="${doorId}">
          حسّيت إن «${escapeHtml(doorName)}» أقرب ليّ — جرّب فيه
        </button>
      </div>
    ` : `` }
  `;
}
 
function dfCloseExploreOverlay(overlay){
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
  if (overlay.__escHandler){
    document.removeEventListener("keydown", overlay.__escHandler);
    delete overlay.__escHandler;
  }
  setTimeout(() => overlay.remove(), 500);
}
 
function dfHandleTryNewDoor(newDoor, ix, local, stage, overlay){
  // اقفل الـ overlay
  dfCloseExploreOverlay(overlay);
 
  // علّم إن العميل غيّر الباب
  journeyState.choices.station5_doorChanged = true;
 
  // امسح النكهة القديمة من الـ state، علشان يبدأ من جديد
  local.flavor = null;
  local.flavorMatch = null;
  journeyState.choices.station5_flavor = null;
  journeyState.choices.station5_flavorMatch = null;
  journeyState.choices.station5_flavorCorrected = false;
 
  // عيّن الباب الجديد
  local.door = newDoor;
  journeyState.choices.station5_door = newDoor;
  journeyState.fingerprint.door = newDoor;
  journeyState.fingerprint.flavor = null;
  journeyState.fingerprint.name = null;
 
  saveJourneyLocal();
  saveJourneyRemote();
 
  // ارجع لـ Phase B بالباب الجديد
  setTimeout(() => {
    dfTransitionTo(stage, () => dfRenderPhaseB(stage, ix, local));
  }, 300);
}
 
/* ────────────────────────────────────────────────────────────────────
   مساعدات
   ──────────────────────────────────────────────────────────────────── */
 
/* انتقال بين الـ phases */
function dfTransitionTo(stage, builderFn){
  const current = stage.querySelector(".df-phase");
  if (current){
    current.style.opacity = "0";
    current.style.transform = "translateY(-8px)";
  }
  setTimeout(() => {
    builderFn();
  }, 280);
}
 
/* حفظ النكهة + اسم البصمة */
function dfSaveFlavor(flavorId){
  const axis = journeyState.fingerprint.axis;
  journeyState.choices.station5_flavor = flavorId;
  journeyState.fingerprint.flavor = flavorId;
  journeyState.fingerprint.name = BURNOUT_FINGERPRINTS[`${axis}_${flavorId}`] || "";
  saveJourneyLocal();
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
   النوع (جديد): strategies-self — استكشاف الـ٩ بعمق + اختيار واحدة (بصمتك المبدئية)
   ============================================================ */
function injectStrategiesStyles(){
  if (document.getElementById("jr-strat-styles")) return;
  var s = document.createElement("style");
  s.id = "jr-strat-styles";
  s.textContent = `
  .ss-intro{font-size:16px;color:#e7e3da;line-height:1.95;margin:0 0 18px;}
  .ss-note{font-size:13.5px;color:var(--muted);line-height:1.8;margin:18px 0 0;padding:12px 16px;background:rgba(212,175,55,.04);border:1px solid rgba(212,175,55,.18);border-radius:10px;}
  .ss-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .ss-card{appearance:none;background:var(--navy-deep);color:var(--cream);border:1px solid rgba(212,175,55,.2);border-radius:14px;padding:20px 16px;font:inherit;cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;min-height:178px;transition:all .3s var(--ease);position:relative;}
  .ss-card:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.28);}
  .ss-card.is-selected{border-color:var(--gold);background:linear-gradient(135deg,rgba(212,175,55,.1),var(--navy-deep));box-shadow:0 0 0 2px rgba(212,175,55,.4);}
  .ss-card__icon{width:46px;height:46px;border-radius:50%;border:1.5px solid var(--gold);display:grid;place-items:center;font-size:22px;background:rgba(212,175,55,.05);}
  .ss-card__name{font-family:var(--font-quote);font-size:16px;font-weight:700;color:var(--cream);margin:0;line-height:1.3;}
  .ss-card__line{font-size:12px;color:var(--muted);line-height:1.6;margin:0;flex:1;}
  .ss-card__cta{font-size:11.5px;color:var(--gold);font-weight:600;margin-top:auto;}
  .ss-card__badge{position:absolute;top:-9px;inset-inline-end:14px;background:var(--gold);color:var(--navy-deep);font-size:10.5px;font-weight:700;padding:3px 11px;border-radius:99px;display:none;}
  .ss-card.is-selected .ss-card__badge{display:block;}
  .ss-modal{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:20px;opacity:0;transition:opacity .3s var(--ease);}
  .ss-modal[hidden]{display:none;}
  .ss-modal.is-open{opacity:1;}
  .ss-modal__backdrop{position:absolute;inset:0;background:rgba(10,23,41,.8);backdrop-filter:blur(6px);}
  .ss-modal__panel{position:relative;background:linear-gradient(180deg,var(--navy),var(--navy-deep));border:1px solid rgba(212,175,55,.35);border-radius:18px;max-width:620px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.5);transform:translateY(16px) scale(.98);transition:transform .35s var(--ease);}
  .ss-modal.is-open .ss-modal__panel{transform:translateY(0) scale(1);}
  .ss-modal__close{position:absolute;top:14px;inset-inline-end:14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--muted);cursor:pointer;display:grid;place-items:center;z-index:3;}
  .ss-modal__close:hover{border-color:var(--gold);color:var(--gold);}
  .ss-modal__head{padding:34px 32px 18px;text-align:center;border-bottom:1px solid rgba(212,175,55,.15);}
  .ss-modal__icon{width:58px;height:58px;border-radius:50%;border:1.5px solid var(--gold);display:grid;place-items:center;font-size:28px;margin:0 auto 14px;background:rgba(212,175,55,.05);}
  .ss-modal__name{font-family:var(--font-quote);font-size:26px;font-weight:700;color:var(--gold);margin:0 0 4px;}
  .ss-modal__tag{font-size:13px;color:var(--muted);margin:0;letter-spacing:.5px;}
  .ss-modal__body{padding:24px 32px 8px;}
  .ss-modal__voice{font-family:var(--font-quote);font-size:18px;color:var(--cream);line-height:1.9;margin:0 0 22px;padding-inline-start:16px;border-inline-start:2px solid var(--gold);}
  .ss-modal__story p{font-size:15.5px;color:#e7e3da;line-height:1.95;margin:0 0 14px;}
  .ss-modal__foot{padding:18px 32px 28px;display:flex;justify-content:center;position:sticky;bottom:0;background:linear-gradient(180deg,transparent,var(--navy-deep) 30%);}
  .ss-select-btn{appearance:none;background:rgba(212,175,55,.1);color:var(--cream);border:1px solid var(--gold);border-radius:10px;padding:14px 30px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:all .25s var(--ease);}
  .ss-select-btn:hover{background:rgba(212,175,55,.2);color:var(--gold);box-shadow:0 0 0 1px var(--gold);}
  .ss-select-btn.is-current{background:var(--gold);color:var(--navy-deep);}
  @media (max-width:680px){.ss-grid{grid-template-columns:1fr;}.ss-card{flex-direction:row;text-align:right;min-height:0;gap:14px;align-items:center;}.ss-card__cta{display:none;}.ss-modal__body{padding:20px 22px 8px;}.ss-modal__head{padding:28px 22px 16px;}.ss-modal__foot{padding:16px 22px 22px;}}`;
  document.head.appendChild(s);
}

function renderStrategiesSelf(station, mountEl){
  injectStrategiesStyles();
  var ix = station.interaction;
  var stationEl = mountEl.closest(".station");
  var cards = (window.STRATEGY_CARDS || []).slice().sort(function(a,b){ return a.order - b.order; });

  mountEl.innerHTML =
    '<div class="ix ss">' +
      (ix.intro ? '<p class="ss-intro">'+escapeHtml(ix.intro)+'</p>' : '') +
      '<h2 class="ix__prompt">'+escapeHtml(ix.prompt)+'</h2>' +
      '<div class="ss-grid">' +
        cards.map(function(c){
          return '<button type="button" class="ss-card" data-id="'+escapeHtml(c.id)+'">' +
            '<span class="ss-card__badge">اختيارك</span>' +
            '<span class="ss-card__icon" aria-hidden="true">'+(c.icon||"")+'</span>' +
            '<p class="ss-card__name">'+escapeHtml(c.name)+'</p>' +
            '<p class="ss-card__line">'+escapeHtml(c.coach)+'</p>' +
            '<span class="ss-card__cta">افتح واقرا قصتها ←</span>' +
          '</button>';
        }).join("") +
      '</div>' +
      (ix.note ? '<p class="ss-note">'+escapeHtml(ix.note)+'</p>' : '') +
    '</div>';

  var gridCards = mountEl.querySelectorAll(".ss-card");

  function markSelected(id){
    gridCards.forEach(function(b){ b.classList.toggle("is-selected", b.dataset.id === id); });
  }

  function selectCard(id){
    var c = cards.find(function(x){ return x.id === id; });
    if (!c) return;
    journeyState.choices[ix.saveKey] = id;
    journeyState.choices[ix.saveKey + "_name"] = c.name;
    markSelected(id);
    saveJourneyLocal(); saveJourneyRemote();
    showEcho(stationEl, "اخترت «"+c.name+"». ده اللي إنت شايفه عن نفسك دلوقتي — وفي آخر الرحلة هنشوف سوا هل هو هو اللي هنكتشفه، ولا في طبقة أعمق.", true);
    completeStation(station.id);
    unlockNext(stationEl);
    setTimeout(function(){ smoothScrollTo(stationEl.querySelector("[data-role='echo']")); }, 350);
  }

  /* الاسترجاع */
  var saved = journeyState.choices[ix.saveKey];
  if (saved){
    markSelected(saved);
    var sc = cards.find(function(x){ return x.id === saved; });
    if (sc){ showEcho(stationEl, "اخترت «"+sc.name+"». تقدر تفتح أي طريقة تاني وتغيّر اختيارك، أو تكمّل.", false); unlockNext(stationEl); }
  }

  gridCards.forEach(function(b){
    b.addEventListener("click", function(){ openCardModal(b.dataset.id); });
  });

  function openCardModal(id){
    var c = cards.find(function(x){ return x.id === id; });
    if (!c) return;
    var isCurrent = journeyState.choices[ix.saveKey] === id;
    var storyHtml = (c.back||[]).map(function(p){ return '<p>'+escapeHtml(p)+'</p>'; }).join("");

    var modal = document.createElement("div");
    modal.className = "ss-modal";
    modal.innerHTML =
      '<div class="ss-modal__backdrop" data-close="1"></div>' +
      '<div class="ss-modal__panel" role="dialog">' +
        '<button type="button" class="ss-modal__close" data-close="1" aria-label="إغلاق"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '<div class="ss-modal__head">' +
          '<div class="ss-modal__icon" aria-hidden="true">'+(c.icon||"")+'</div>' +
          '<h3 class="ss-modal__name">'+escapeHtml(c.name)+'</h3>' +
          '<p class="ss-modal__tag">'+escapeHtml(c.tag||"")+'</p>' +
        '</div>' +
        '<div class="ss-modal__body">' +
          '<p class="ss-modal__voice">«'+escapeHtml(c.front)+'»</p>' +
          '<div class="ss-modal__story">'+storyHtml+'</div>' +
        '</div>' +
        '<div class="ss-modal__foot">' +
          '<button type="button" class="ss-select-btn '+(isCurrent?"is-current":"")+'" data-select="1">'+
            escapeHtml(isCurrent ? (ix.selectedLabel||"دي اختيارك ✓") : (ix.selectLabel||"دي أقرب واحدة ليّا"))+
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ modal.classList.add("is-open"); }); });

    function close(){
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", esc);
      setTimeout(function(){ modal.remove(); }, 320);
    }
    function esc(e){ if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc);
    modal.querySelectorAll("[data-close]").forEach(function(el){ el.addEventListener("click", close); });
    modal.querySelector("[data-select]").addEventListener("click", function(){ selectCard(id); close(); });
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
    completedStations: [...journeyState.completedStations],
    code:        journeyState.resultCode
  });

  // ابني الوثيقة
  doc.innerHTML = buildFingerprintDoc();

  // عنوان الصفحة أثناء العرض/الطباعة
  const name = (journeyState.user.name || "").trim();
  document.title = name
    ? `بصمة ${name} — Reignite`
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
    // ارجع لمحطة الميثاق (آخر محطة) ديناميكيًا
    const covenantId = CONTENT.stations[CONTENT.stations.length - 1].id;
    if (journeyState.currentStation !== covenantId){
      journeyState.currentStation = covenantId;
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
 
  const cov = c.station7_covenant || { line1: "", line2: "", line3: "" };
  const hasCov = !!(cov.line2 && cov.line3);
 
  // زرّ Reignite — يُحقن بشكل آمن
  const reigniteCTA = (window.PDS && typeof window.PDS.cta === "function")
    ? window.PDS.cta({ variant: "primary", label: "اعرف أكتر عن Reignite" })
    : '';
 
  return `
    <header class="fp-head">
      <h1 class="fp-head__title">بصمة <span class="fp-head__name">${escapeHtml(name)}</span></h1>
      <p class="fp-head__sub">من رحلة هندسة العقلية — Reignite</p>
      <p class="fp-head__date">${escapeHtml(arabicDate())}</p>
    </header>
 
    <hr class="fp-divider" />
 
    <section class="fp-section">
      <h2 class="fp-section__head">مستواك</h2>
      <p class="fp-section__value">${escapeHtml(levelText)}</p>
    </section>
 
    <hr class="fp-divider" />
 
    <section class="fp-section">
      <h2 class="fp-section__head">محورك الرئيسي</h2>
      <p class="fp-section__value">${escapeHtml(axisText)}</p>
      ${ axisQuest ? `<p class="fp-section__sub">سؤالك الجوهري: <q>${escapeHtml(axisQuest)}</q></p>` : "" }
    </section>
 
    <hr class="fp-divider" />
 
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
 
    <section class="fp-hero">
      <p class="fp-hero__head">البصمة الكاملة</p>
      <h2 class="fp-hero__name">${escapeHtml(fingerName)}</h2>
      <p class="fp-hero__formula">
        التركيبة — <b>${escapeHtml(axisText)}</b> · <b>${escapeHtml(doorText)}</b> · <b>${escapeHtml(flavorText)}</b>
      </p>
    </section>
 
    ${ buildSelfStrategyBlock() }

    <section class="fp-section">
      <h2 class="fp-section__head">نوع احتراقك المُرشّح</h2>
      <p class="fp-section__value">${escapeHtml(burnoutText)}</p>
      ${ burnoutDesc ? `<p class="fp-section__sub">${escapeHtml(burnoutDesc)}</p>` : "" }
    </section>
 
    <hr class="fp-divider" />
 
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
 
    <section class="fp-section">
      <h2 class="fp-section__head">طريقك في برنامج Reignite</h2>
      <div class="fp-paths">
        ${ paths.map(p => `<span class="fp-paths__chip">${escapeHtml(p)}</span>`).join("") }
      </div>
      <p class="fp-paths__note">دي المسارات اللي بنشتغل عليها في برنامج Reignite الكامل — من الاحتراق إلى الاشتعال، بالتفصيل وبالأدوات العملية.</p>
    </section>
 
    <hr class="fp-divider" />
 
    <section class="fp-outro">
      <p class="fp-outro__verse">﴿إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّى يُغَيِّرُوا مَا بِأَنْفُسِهِمْ﴾</p>
      <p class="fp-outro__verse-src">الرعد — ١١</p>
      <p class="fp-outro__quote">الإنسان مش مخلوق عشان يحترق. هو مخلوق عشان يتزن. والاتزان رحلة، مش لحظة.</p>
      <p class="fp-outro__sign">— مع كوتش محمود فؤاد · Proactive Development Solutions</p>
    </section>
 
    ${ buildSavedReportBlock() }
 
    <div class="fp-actions">
      <button type="button" class="fp-btn" data-action="print">احفظ بصمتك PDF</button>
      <button type="button" class="fp-btn" data-action="share">شارك بصمتك</button>
      ${ reigniteCTA }
    </div>
  `;
}


/* ============================================================
   قسم "تقريرك المحفوظ" — يظهر فقط لو فيه كود (يعني اتسجّل في Firebase)
   ============================================================ */
function buildSavedReportBlock(){
  const code = journeyState.resultCode;
  if (!code) return "";
 
  const reportUrl = `${JOURNEY_CONFIG.resultPagePath}?c=${encodeURIComponent(code)}`;
 
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
 
  const reigniteBtn = (window.PDS && typeof window.PDS.cta === "function")
    ? window.PDS.cta({ variant: "primary", label: "اعرف أكتر عن Reignite" })
    : '';
 
  return `
    <hr class="fp-divider" />
    <section class="fp-section fp-saved">
      <h2 class="fp-section__head">تقريرك محفوظ</h2>
      <p class="fp-section__sub">تقدر تفتح بصمتك في أي وقت بالكود ده — احتفظ بيه:</p>
      <p class="fp-saved__code">${escapeHtml(code)}</p>
      <div class="fp-saved__actions">
        <a class="fp-btn" href="${reportUrl}" target="_blank" rel="noopener">افتح تقريرك المحفوظ</a>
        ${waBtn}
        ${reigniteBtn}
      </div>
    </section>`;
}

/* ============================================================
   بلوك "الطريقة اللي اخترتها بنفسك" — في التقرير النهائي
   ============================================================ */
function buildSelfStrategyBlock(){
  var sid = journeyState.choices.station3_strategy;
  if (!sid) return "";
  var c = (window.STRATEGY_CARDS || []).find(function(x){ return x.id === sid; });
  if (!c) return "";
  var fp = journeyState.fingerprint;
  var hasFlavor = fp.flavor != null;
  var discovered = FLAVOR_AR[fp.flavor] || "";
  var insight = "";
  if (hasFlavor){
    insight = (c.order === fp.flavor)
      ? `ولافت إن دي نفس طبقتك اللي اكتشفتها الرحلة (طابع ${escapeHtml(discovered)}) — وعيك بنفسك عالي، اللي حسّيته من بدري أكّدته الرحلة بالتفصيل.`
      : `ومثير للاهتمام إن اللي اخترته مختلف عن طابعك اللي اكتشفته الرحلة (طابع ${escapeHtml(discovered)}). الفرق ده مش غلط — هو مساحة غنية بين صورتك عن نفسك واللي اتكشف لما نزلنا أعمق، وده بالظبط شغل الرحلة الكاملة.`;
  }
  return `
    <hr class="fp-divider" />
    <section class="fp-section">
      <h2 class="fp-section__head">الطريقة اللي اخترتها بنفسك</h2>
      <p class="fp-section__value">${escapeHtml(c.name)}</p>
      <p class="fp-section__sub"><q>${escapeHtml(c.front)}</q></p>
      ${ insight ? `<p class="fp-section__sub" style="margin-top:14px;">${insight}</p>` : "" }
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
   حفظ التقدّم + الاستئناف عبر الأجهزة
   ============================================================ */
const JOURNEY_SAVE_KEY = "mfp_journey_progress";

function saveJourneyLocal(){
  try {
    localStorage.setItem(JOURNEY_SAVE_KEY, JSON.stringify({
      participantId: journeyState.participantId, resultCode: journeyState.resultCode,
      user: journeyState.user, currentStation: journeyState.currentStation,
      completedStations: journeyState.completedStations, choices: journeyState.choices,
      fingerprint: journeyState.fingerprint, savedAt: Date.now()
    }));
  } catch(e){ console.warn("saveJourneyLocal", e); }
}
function loadJourneyLocal(){
  try {
    const raw = localStorage.getItem(JOURNEY_SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || (Date.now() - (d.savedAt||0)) > 7*24*60*60*1000){
      localStorage.removeItem(JOURNEY_SAVE_KEY); return false;
    }
    journeyState.participantId     = d.participantId || null;
    journeyState.resultCode        = d.resultCode || null;
    journeyState.user              = d.user || journeyState.user;
    journeyState.currentStation    = d.currentStation || 1;
    journeyState.completedStations = d.completedStations || [];
    journeyState.choices           = d.choices || journeyState.choices;
    journeyState.fingerprint       = d.fingerprint || journeyState.fingerprint;
    return true;
  } catch(e){ console.warn("loadJourneyLocal", e); return false; }
}
function saveJourneyRemote(){
  try {
    if (window.MFPJourney && window.MFPJourney.saveProgress && journeyState.participantId){
      window.MFPJourney.saveProgress(journeyState.participantId, {
        currentStation: journeyState.currentStation,
        completedStations: journeyState.completedStations,
        choices: journeyState.choices, fingerprint: journeyState.fingerprint,
        user: journeyState.user
      });
    }
  } catch(e){ console.warn("saveJourneyRemote", e); }
}
function putCodeInUrl(code){
  if (!code) return;
  try {
    const url = new URL(location.href);
    if (url.searchParams.get("c") === code) return;
    url.searchParams.set("c", code);
    history.replaceState(null, "", url.toString());
  } catch(e){}
}
async function tryResume(){
  const params = new URLSearchParams(location.search);
  const urlCode = params.get("c") || params.get("code");
  let codeFailed = false;
  if (urlCode && window.MFPJourney && window.MFPJourney.hasFirebase && window.MFPJourney.hasFirebase()){
    try {
      const d = await window.MFPJourney.fetchByCode(urlCode);
      applyResumedData(d); saveJourneyLocal();
      return { resumed:true, codeFailed:false };
    } catch(e){ console.warn("resume by code failed", e); codeFailed = true; }
  }
  if (loadJourneyLocal()){
    if (journeyState.resultCode) putCodeInUrl(journeyState.resultCode);
    return { resumed:true, codeFailed:false };
  }
  return { resumed:false, codeFailed };
}
function applyResumedData(d){
  if (!d) return;
  journeyState.participantId = d.id || null;
  journeyState.resultCode    = d.result_code || null;
  journeyState.user = {
    name: d.name||"", email: d.email||"", job: d.job||"",
    ageRange: d.age_range||"", whatsapp: d.whatsapp||"",
    consentWhatsapp: !!d.consent_whatsapp, consentFollowup: false
  };
  if (d.choices)     journeyState.choices     = d.choices;
  if (d.fingerprint) journeyState.fingerprint = d.fingerprint;
  journeyState.completedStations = Array.isArray(d.completed_stations) ? d.completed_stations : [];
  const comp = journeyState.completedStations;
  journeyState.currentStation = comp.length
    ? Math.min(Math.max(...comp) + 1, CONTENT.stations.length)
    : (d.current_station || 1);
}

/* واجهة الحفظ والعودة */
function injectResumeStyles(){
  if (document.getElementById("jr-resume-styles")) return;
  const style = document.createElement("style");
  style.id = "jr-resume-styles";
  style.textContent = `
  .jr-banner{max-width:var(--content-max);margin:14px auto 0;padding:16px 18px;background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.4);border-radius:10px;display:flex;flex-direction:column;gap:10px;}
  .jr-banner__top{display:flex;align-items:flex-start;gap:10px;}
  .jr-banner__icon{color:var(--gold);flex-shrink:0;margin-top:2px;}
  .jr-banner__txt{font-size:14px;line-height:1.7;color:var(--cream);}
  .jr-banner__txt b{color:var(--gold);}
  .jr-banner__code{font-family:monospace;letter-spacing:2px;color:var(--gold);font-size:16px;font-weight:700;background:rgba(0,0,0,.2);padding:6px 12px;border-radius:6px;display:inline-block;margin-top:4px;}
  .jr-banner__actions{display:flex;flex-wrap:wrap;gap:8px;}
  .jr-banner__btn{appearance:none;background:transparent;color:var(--cream);border:1px solid var(--sky);border-radius:6px;padding:9px 16px;font:inherit;font-size:13px;cursor:pointer;transition:all .2s;}
  .jr-banner__btn:hover{border-color:var(--gold);color:var(--gold);}
  .jr-banner__hide{margin-inline-start:auto;background:none;border:none;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;}
  .jr-resume{max-width:var(--content-max);margin:14px auto 0;padding:14px 18px;background:rgba(255,255,255,.03);border:1px dashed rgba(184,184,184,.3);border-radius:10px;font-size:13px;color:var(--muted);}
  .jr-resume__q{cursor:pointer;color:var(--cream);}
  .jr-resume__q b{color:var(--gold);text-decoration:underline;}
  .jr-resume__form{display:none;gap:8px;margin-top:12px;flex-wrap:wrap;}
  .jr-resume__form.is-open{display:flex;}
  .jr-resume__input{flex:1;min-width:160px;background:var(--navy-deep);color:var(--cream);border:1px solid rgba(184,184,184,.25);border-radius:6px;padding:11px 14px;font:inherit;text-align:center;letter-spacing:3px;text-transform:uppercase;}
  .jr-resume__input:focus{outline:none;border-color:var(--gold);}
  .jr-resume__go{background:var(--gold);color:var(--navy-deep);border:none;border-radius:6px;padding:11px 20px;font:inherit;font-weight:700;cursor:pointer;}
  .jr-loading{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--navy);}
  .jr-loading__box{text-align:center;color:var(--muted);font-size:14px;}
  .jr-loading__spin{width:38px;height:38px;border-radius:50%;border:2px solid rgba(212,175,55,.2);border-top-color:var(--gold);animation:jr-spin 1s linear infinite;margin:0 auto 16px;}
  @keyframes jr-spin{to{transform:rotate(360deg);}}
  @media (max-width:768px){.jr-banner,.jr-resume{margin-inline:14px;}}`;
  document.head.appendChild(style);
}
function showLoadingOverlay(){
  if (document.getElementById("jrLoading")) return;
  const el = document.createElement("div");
  el.id = "jrLoading"; el.className = "jr-loading";
  el.innerHTML = `<div class="jr-loading__box"><div class="jr-loading__spin"></div>بنفتح رحلتك المحفوظة…</div>`;
  document.body.appendChild(el);
}
function hideLoadingOverlay(){ document.getElementById("jrLoading")?.remove(); }
function showResumeBanner(code){
  if (!code) return;
  const main = document.getElementById("stationContainer");
  if (!main) return;
  document.getElementById("jrBanner")?.remove();
  const link = `${location.origin}${location.pathname}?c=${encodeURIComponent(code)}`;
  const banner = document.createElement("div");
  banner.id = "jrBanner"; banner.className = "jr-banner";
  banner.innerHTML = `
    <div class="jr-banner__top">
      <span class="jr-banner__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
      <div class="jr-banner__txt"><b>رحلتك بتتحفظ تلقائيًّا.</b> لو قفلت الصفحة أو حبّيت تكمّل من موبايل أو جهاز تاني، ارجع من نفس الرابط وهتلاقي نفسك في نفس المكان.<br>كودك الخاص: <span class="jr-banner__code">${escapeHtml(code)}</span></div>
      <button type="button" class="jr-banner__hide" data-jr="hide">إخفاء</button>
    </div>
    <div class="jr-banner__actions">
      <button type="button" class="jr-banner__btn" data-jr="copy-link">📋 انسخ رابط رحلتي</button>
      <button type="button" class="jr-banner__btn" data-jr="copy-code">انسخ الكود</button>
    </div>`;
  main.parentNode.insertBefore(banner, main);
  banner.querySelector('[data-jr="hide"]').addEventListener("click", () => banner.remove());
  banner.querySelector('[data-jr="copy-link"]').addEventListener("click", () => copyText(link, "اتنسخ الرابط — احفظه عندك"));
  banner.querySelector('[data-jr="copy-code"]').addEventListener("click", () => copyText(code, "اتنسخ الكود"));
}
function showReturningEntry(){
  const main = document.getElementById("stationContainer");
  if (!main || document.getElementById("jrResume")) return;
  const box = document.createElement("div");
  box.id = "jrResume"; box.className = "jr-resume";
  box.innerHTML = `
    <span class="jr-resume__q" data-jr="toggle">بدأت الرحلة قبل كده على جهاز تاني؟ <b>افتح رحلتك بالكود</b></span>
    <div class="jr-resume__form" data-jr="form">
      <input type="text" class="jr-resume__input" data-jr="input" placeholder="X X X X — X X X X" maxlength="9" autocomplete="off" spellcheck="false">
      <button type="button" class="jr-resume__go" data-jr="go">افتح رحلتي</button>
    </div>`;
  main.parentNode.insertBefore(box, main);
  const form = box.querySelector('[data-jr="form"]');
  const input = box.querySelector('[data-jr="input"]');
  box.querySelector('[data-jr="toggle"]').addEventListener("click", () => {
    form.classList.toggle("is-open");
    if (form.classList.contains("is-open")) input.focus();
  });
  input.addEventListener("input", (e) => {
    let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (v.length > 4) v = v.slice(0,4) + "-" + v.slice(4,8);
    e.target.value = v;
  });
  const go = () => { const code = input.value.trim(); if (code) location.search = "?c=" + encodeURIComponent(code); };
  box.querySelector('[data-jr="go"]').addEventListener("click", go);
  input.addEventListener("keypress", (e) => { if (e.key === "Enter"){ e.preventDefault(); go(); } });
}
function copyText(text, okMsg){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(() => showToast(okMsg||"اتنسخ")).catch(() => prompt("انسخ:", text));
  } else { prompt("انسخ:", text); }
}

/* ============================================================
   init
   ============================================================ */
async function init(){
  injectResumeStyles();
  const params = new URLSearchParams(location.search);
  const hasUrlCode = !!(params.get("c") || params.get("code"));
  if (hasUrlCode) showLoadingOverlay();

  const status = await tryResume();
  hideLoadingOverlay();

  buildRail();
  buildStations();
  refreshParticipant();
  render();

  if (journeyState.resultCode){
    showResumeBanner(journeyState.resultCode);
  } else {
    showReturningEntry();
    if (status.codeFailed) showToast("الكود مش موجود — تأكد إنك كتبته صح");
  }
}

document.addEventListener("DOMContentLoaded", init);
