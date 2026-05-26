/* ============================================================================
   🧮  محرّك العروض + الحاسبة + الحجوزات + الكوبونات — دورة "الحضن الدافئ"
   ============================================================================
   ✅ العروض والخصومات والأسعار: محلية (offers-config.js) — بدون Firebase
   ✅ الكوبونات: Firebase أولاً، احتياطي محلي
   ✅ الحجوزات: Firebase (tempBookings) → تليجرام بوت تلقائياً
   ✅ المنح والدعم: Firebase (نفس مسار الحجز)
   ✅ ٣ باقات (الجزء الأول / الكاملة / الجزء الثاني للمجموعة السابقة)
   ⚠️  مش محتاج تعدّل في الملف ده. كل التحكم في offers-config.js
   ============================================================================ */

(function () {
  "use strict";

  const CFG = window.COURSE_CONFIG;
  if (!CFG) {
    console.error("⚠️ ملف offers-config.js مش متحمّل. تأكد إنه قبل ملف المحرّك.");
    return;
  }

  /* ── helpers ── */
  const fmt = (n) => Math.round(n / 10) * 10;
  const arNum = (n) => fmt(n).toLocaleString("ar-EG");
  const cur = CFG.course.currency;
  const ARABIC_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  function arDigitsToEn(s) { let r = String(s); ARABIC_DIGITS.forEach((a,i)=>{r=r.replace(new RegExp(a,"g"),i);}); return r; }

  /* =========================================================================
     1) Firebase init (نفس إعداد النظام الأصلي — project: fouad-perspective)
     ========================================================================= */
  let db = null;
  let fbReady = false;

  function initFirebase() {
    if (!window.firebase) {
      console.warn("⚠️ Firebase scripts مش متحمّلة — الكوبونات والحجز هيستخدموا الاحتياطي.");
      return;
    }
    if (window._fbSecure) { db = firebase.firestore(); fbReady = true; return; }
    try {
      const _0xa3f8 = ["QUl6YVN5","REhnMFZy","aXZFM0M5","QTdqdnpS","dTdsUWd1","ZEx2Y0Rf","Rnhr"];
      const k = _0xa3f8.map((s)=>atob(s)).join("");
      firebase.initializeApp({
        apiKey: k,
        authDomain: "fouad-perspective.firebaseapp.com",
        projectId: "fouad-perspective",
        storageBucket: "fouad-perspective.appspot.com",
        messagingSenderId: "564654107574",
        appId: "1:564654107574:web:baebb660288b22f16213e6",
      });
      window._fbSecure = true;
      db = firebase.firestore();
      fbReady = true;
    } catch (e) {
      console.error("Firebase init failed:", e);
    }
  }

  /* =========================================================================
     2) حالة المحرّك
     ========================================================================= */
  const state = {
    pack: CFG.defaultPackage || "full",
    payment: "cash",          // cash | plan_0 | plan_1 ...
    coupon: null,
    userPath: null,           // new | alumni | starter
    lastCalc: null,
  };
  let allowedPacks = Object.keys(CFG.packages);
  let cdTimer = null;

  function getPack() { return CFG.packages[state.pack]; }
  function getBase() { return getPack().basePrice; }

  function getActiveTimeOffer() {
    const now = new Date();
    return (CFG.timeOffers || []).find((o) => {
      if (!o.enabled) return false;
      const s = new Date(o.startDate);
      const e = new Date(o.endDate);
      e.setHours(23, 59, 59, 999);
      return now >= s && now <= e && o.percentage > 0;
    }) || null;
  }

  /* =========================================================================
     3) بطاقات العروض (السيكشن الترويجي) — حسب الباقة المختارة
     ========================================================================= */
  function renderOffers() {
    const container = document.querySelector("#offers-render");
    if (!container) return;

    const pk = getPack();
    const base = getBase();
    const offer = getActiveTimeOffer();
    let html = "";

    if (offer) {
      const finalP = fmt(base - base * offer.percentage / 100);
      const savings = fmt(base - finalP);
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card urgent">
          <span class="offer-badge urgent pulse">${offer.name}</span>
          <div class="offer-header">
            <h4>استثمارك في ${pk.shortName}</h4><i class="fas fa-fire offer-icon"></i>
          </div>
          <div class="price-display">
            <div class="price-original">${arNum(base)} ${cur}</div>
            <div class="price-current"><span class="price-number">${arNum(finalP)}</span><span class="price-currency">${cur}</span></div>
            <div class="savings-badge">وفّرت ${arNum(savings)} ${cur}</div>
          </div>
          <div class="time-offer-details">
            <div class="discount-circle"><span class="percentage">${offer.percentage}%</span><span class="label">خصم</span></div>
            <div class="dates">
              <div class="date-row"><i class="fas fa-play"></i><span>من ${new Date(offer.startDate).toLocaleDateString("ar-EG")}</span></div>
              <div class="date-row"><i class="fas fa-stop"></i><span>حتى ${new Date(offer.endDate).toLocaleDateString("ar-EG")}</span></div>
            </div>
          </div>
          ${offer.showCountdown ? `<div class="offer-timer" id="offerTimer"></div>` : ``}
          <div class="active-until"><i class="fas fa-bolt"></i><span>العرض بينتهي قريباً — اقتنص الفرصة</span></div>
        </div>
      </div>`;
    } else {
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card">
          <span class="offer-badge">الاستثمار في ${pk.shortName}</span>
          <div class="offer-header"><h4>الاستثمار في الرحلة</h4><i class="fas fa-seedling offer-icon"></i></div>
          <div class="price-display"><div class="price-current solo"><span class="price-number">${arNum(base)}</span><span class="price-currency">${cur}</span></div></div>
        </div>
      </div>`;
    }

    const baseAfterOffer = offer ? fmt(base - base * offer.percentage / 100) : base;
    let secondRow = "";

    if (CFG.cashDiscount && CFG.cashDiscount.enabled) {
      const cashFinal = fmt(baseAfterOffer - baseAfterOffer * CFG.cashDiscount.percentage / 100);
      secondRow += `
      <div class="offer-card cash-card active">
        <span class="offer-badge cash">دفع كامل</span>
        <div class="offer-header"><h4>الدفع الكامل</h4><i class="fas fa-hand-holding-heart offer-icon"></i></div>
        <div class="cash-details">
          <div class="discount-percentage"><span class="big-number">${CFG.cashDiscount.percentage}%</span><span class="label">خصم إضافي</span></div>
          <div class="cash-price"><span class="instead-of">بدلاً من ${arNum(baseAfterOffer)} ${cur}</span><span class="final-price">${arNum(cashFinal)} ${cur}</span></div>
          <div class="offer-extra-info"><i class="fas fa-check-circle"></i>تأكيد فوري ووصول مباشر</div>
        </div>
      </div>`;
    }

    if (CFG.paymentPlans && CFG.paymentPlans.length) {
      let plansHTML = "";
      CFG.paymentPlans.slice(0, 3).forEach((plan, idx) => {
        const inst = plan.installments || 3;
        const fp = plan.firstPaymentPercent || 0;
        if (fp > 0) {
          const first = fmt(baseAfterOffer * fp / 100);
          const monthly = fmt((baseAfterOffer - first) / (inst - 1));
          plansHTML += `<div class="plan-item${idx === 0 ? " highlight" : ""}"><div class="plan-name">${plan.name}</div><div class="plan-details"><span class="first-payment">${arNum(first)} ${cur}</span><span>+ ${inst - 1} × </span><span class="monthly">${arNum(monthly)}</span><span>${cur}</span></div></div>`;
        } else {
          const monthly = fmt(baseAfterOffer / inst);
          plansHTML += `<div class="plan-item${idx === 0 ? " highlight" : ""}"><div class="plan-name">${plan.name}</div><div class="plan-details"><span>${inst} × </span><span class="monthly">${arNum(monthly)}</span><span>${cur} شهرياً</span></div></div>`;
        }
      });
      secondRow += `
      <div class="offer-card installments-card">
        <span class="offer-badge installments">تقسيط مرن</span>
        <div class="offer-header"><h4>خطط التقسيط</h4><i class="fas fa-calendar-alt offer-icon"></i></div>
        <div class="plans-grid">${plansHTML}</div>
        <div class="no-interest-badge"><i class="fas fa-check"></i> بدون أيّ رسوم إضافية</div>
      </div>`;
    }

    if (secondRow) html += `<div class="offers-row details-offers-row">${secondRow}</div>`;
    container.innerHTML = html;

    if (offer && offer.showCountdown) startCountdown(offer.endDate);
  }

  function startCountdown(endDate) {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    const el = document.getElementById("offerTimer");
    if (!el) return;
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    function tick() {
      const live = document.getElementById("offerTimer");
      if (!live) { clearInterval(cdTimer); cdTimer = null; return; }
      const diff = end - new Date();
      if (diff <= 0) { live.innerHTML = `<div class="timer-item"><span>انتهى</span></div>`; clearInterval(cdTimer); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor(diff % 86400000 / 3600000);
      const m = Math.floor(diff % 3600000 / 60000);
      const s = Math.floor(diff % 60000 / 1000);
      live.innerHTML =
        `<div class="timer-item"><span>${d}</span><span class="label">يوم</span></div>
         <div class="timer-item"><span>${h}</span><span class="label">ساعة</span></div>
         <div class="timer-item"><span>${m}</span><span class="label">دقيقة</span></div>
         <div class="timer-item"><span>${s}</span><span class="label">ثانية</span></div>`;
    }
    tick();
    cdTimer = setInterval(tick, 1000);
  }

  /* =========================================================================
     4) أسعار بطاقات الباقات (الكروت الثلاثة)
     ========================================================================= */
  function renderPackCardPrices() {
    const offer = getActiveTimeOffer();
    Object.keys(CFG.packages).forEach((id) => {
      const el = document.querySelector(`[data-pack-price="${id}"]`);
      if (!el) return;
      const base = CFG.packages[id].basePrice;
      if (offer) {
        const after = fmt(base - base * offer.percentage / 100);
        el.innerHTML = `<span class="pc-strike">${arNum(base)} ${cur}</span><span class="pc-now">${arNum(after)} <small>${cur}</small></span><span class="pc-save">وفّرت ${arNum(base - after)} ${cur} بـ${offer.name}</span>`;
      } else {
        el.innerHTML = `<span class="pc-now">${arNum(base)} <small>${cur}</small></span>`;
      }
    });
  }

  /* =========================================================================
     5) أزرار اختيار الباقة (pills) داخل الحاسبة
     ========================================================================= */
  function renderPackPills() {
    const c = document.getElementById("calcPackPills");
    if (!c) return;
    c.innerHTML = allowedPacks.map((id) => {
      const pk = CFG.packages[id];
      return `<button class="packpill${id === state.pack ? " active" : ""}" data-set-pack="${id}">${pk.shortName}</button>`;
    }).join("");
    c.querySelectorAll("[data-set-pack]").forEach((b) => {
      b.addEventListener("click", () => setPack(b.dataset.setPack));
    });
  }

  function setPack(id) {
    if (!CFG.packages[id]) return;
    state.pack = id;
    renderPackPills();
    renderOffers();
    renderActiveOfferBadge();
    updateChosenPackLabel();
    calculate();
  }

  function updateChosenPackLabel() {
    const el = document.getElementById("calcChosenPack");
    if (el) el.textContent = getPack().name;
  }

  /* =========================================================================
     6) الحاسبة الذكية
     ========================================================================= */
  function renderPaymentCards() {
    const c = document.getElementById("calcPaymentCards");
    if (!c) return;
    let html = "";
    if (CFG.cashDiscount && CFG.cashDiscount.enabled) {
      html += `<div class="payment-card active" data-payment="cash"><i class="fas fa-hand-holding-heart"></i><h6>دفعة واحدة</h6><small>خصم ${CFG.cashDiscount.percentage}%</small></div>`;
    } else {
      html += `<div class="payment-card active" data-payment="cash"><i class="fas fa-credit-card"></i><h6>دفعة واحدة</h6></div>`;
    }
    (CFG.paymentPlans || []).forEach((plan, i) => {
      html += `<div class="payment-card" data-payment="plan_${i}"><i class="fas fa-calendar-alt"></i><h6>${plan.name}</h6><small>بدون رسوم</small></div>`;
    });
    c.innerHTML = html;
    c.querySelectorAll(".payment-card").forEach((card) => {
      card.addEventListener("click", () => {
        c.querySelectorAll(".payment-card").forEach((x) => x.classList.remove("active"));
        card.classList.add("active");
        state.payment = card.dataset.payment;
        calculate();
      });
    });
    state.payment = c.querySelector(".payment-card.active")?.dataset.payment || "cash";
  }

  function renderActiveOfferBadge() {
    const sec = document.getElementById("calcActiveOffer");
    if (!sec) return;
    const o = getActiveTimeOffer();
    if (o) {
      sec.style.display = "block";
      document.getElementById("activeOfferName").textContent = o.name;
      document.getElementById("activeOfferDiscount").textContent = `خصم ${o.percentage}%`;
    } else sec.style.display = "none";
  }

  function calculate() {
    const base = getBase();
    let price = base;
    const discounts = [];

    const offer = getActiveTimeOffer();
    if (offer) {
      const d = base * offer.percentage / 100;
      price -= d;
      discounts.push({ type: "time", amount: d, name: offer.name });
    }
    if (state.payment === "cash" && CFG.cashDiscount && CFG.cashDiscount.enabled) {
      const d = price * CFG.cashDiscount.percentage / 100;
      price -= d;
      discounts.push({ type: "cash", amount: d });
    }
    if (state.coupon) {
      const d = state.coupon.type === "percentage"
        ? price * state.coupon.value / 100
        : Math.min(state.coupon.value, price);
      price -= d;
      discounts.push({ type: "coupon", amount: d, name: state.coupon.code });
    }

    updateDisplay(base, price, discounts);
    state.lastCalc = { base: fmt(base), final: fmt(price), discounts, payment: state.payment };
  }

  function updateDisplay(base, final, discounts) {
    base = fmt(base); final = fmt(final);
    document.getElementById("calcBase").textContent = `${arNum(base)} ${cur}`;
    ["calcTimeDiscountRow", "calcCashDiscountRow", "calcCouponDiscountRow"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.style.display = "none";
    });
    discounts.forEach((d) => {
      const amt = fmt(d.amount);
      if (d.type === "time") {
        document.getElementById("calcTimeDiscountRow").style.display = "flex";
        document.getElementById("calcTimeDiscountLabel").textContent = `خصم ${d.name}:`;
        document.getElementById("calcTimeDiscount").textContent = `-${arNum(amt)} ${cur}`;
      }
      if (d.type === "cash") {
        document.getElementById("calcCashDiscountRow").style.display = "flex";
        document.getElementById("calcCashDiscount").textContent = `-${arNum(amt)} ${cur}`;
      }
      if (d.type === "coupon") {
        document.getElementById("calcCouponDiscountRow").style.display = "flex";
        document.getElementById("calcCouponDiscount").textContent = `-${arNum(amt)} ${cur}`;
      }
    });
    document.getElementById("calcTotal").textContent = `${arNum(final)} ${cur}`;

    const det = document.getElementById("calcInstallmentDetails");
    if (state.payment.startsWith("plan_")) {
      const plan = CFG.paymentPlans[parseInt(state.payment.split("_")[1])];
      if (plan) {
        document.getElementById("calcInstallmentPlan").textContent = installmentText(final, plan);
        det.style.display = "block";
      }
    } else det.style.display = "none";

    const savings = base - final;
    const sv = document.getElementById("calcSavings");
    if (savings > 0) {
      sv.style.display = "block";
      document.getElementById("calcSavingsAmount").textContent = arNum(savings);
    } else sv.style.display = "none";

    // sticky bar mirror
    const sp = document.getElementById("stickyPrice");
    if (sp) sp.textContent = `${arNum(final)} ${cur}`;
  }

  function installmentText(total, plan) {
    const inst = plan.installments || 3, fp = plan.firstPaymentPercent || 0;
    total = fmt(total);
    if (fp > 0) {
      const first = fmt(total * fp / 100);
      const monthly = fmt((total - first) / (inst - 1));
      return `دفعة أولى ${arNum(first)} ${cur} + ${inst - 1} قسط × ${arNum(monthly)} ${cur}`;
    }
    const monthly = fmt(total / inst);
    return `${inst} أقساط × ${arNum(monthly)} ${cur} شهرياً`;
  }

  /* =========================================================================
     7) أكواد الخصم — Firebase أولاً، احتياطي محلي
     ========================================================================= */
  async function applyCoupon() {
    const input = document.getElementById("calcCoupon");
    const code = input.value.trim().toUpperCase();
    if (!code) { swal("warning", "كود فارغ", "اكتب كود الخصم الأول"); return; }

    let validCoupon = null;

    if (fbReady && db) {
      try {
        const snap = await db.collection("coupons").where("code", "==", code).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          if (data.status === "used")    { swal("error", "كود مستخدم", "الكود ده اتستخدم قبل كده."); return; }
          if (data.status === "expired") { swal("error", "كود منتهي", "الكود ده انتهت صلاحيته."); return; }
          validCoupon = {
            id: doc.id, code: data.code,
            type: data.type || "fixed", value: data.value || 0,
            source: data.source || null, isFirebase: true,
          };
        }
      } catch (e) { console.warn("Firebase coupon lookup failed:", e); }
    }

    if (!validCoupon) {
      const local = (CFG.coupons || []).find((c) => c.code.toUpperCase() === code);
      if (local) validCoupon = { ...local, isFirebase: false };
    }

    if (!validCoupon) { swal("error", "كود غير صحيح", "تأكد من الكود وحاول تاني."); return; }

    state.coupon = validCoupon;
    window._appliedCoupon = validCoupon;

    input.disabled = true;
    input.style.background = "rgba(79,122,100,.10)";
    input.style.borderColor = "var(--sage)";
    document.getElementById("applyCouponCalc").style.display = "none";

    if (!document.querySelector(".coupon-remove-btn")) {
      const btn = document.createElement("button");
      btn.className = "coupon-remove-btn";
      btn.innerHTML = '<i class="fas fa-times"></i> إزالة';
      btn.style.cssText = "background:var(--danger);color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;margin-right:10px;font-family:Tajawal,sans-serif;";
      btn.onclick = removeCoupon;
      input.parentElement.appendChild(btn);
    }
    document.getElementById("calcCouponMessage").innerHTML =
      `<div style="background:rgba(79,122,100,.08);border:1px solid var(--sage);padding:10px;border-radius:8px;color:var(--sage-deep);margin-top:10px;"><i class="fas fa-check-circle"></i> الكود <strong>${validCoupon.code}</strong> مُفعّل ${validCoupon.type === "percentage" ? `(خصم ${validCoupon.value}%)` : `(خصم ${validCoupon.value} ${cur})`}</div>`;
    swal("success", "تم التطبيق!", "", 1600);
    calculate();
  }

  function removeCoupon() {
    state.coupon = null;
    window._appliedCoupon = null;
    const input = document.getElementById("calcCoupon");
    input.value = ""; input.disabled = false; input.style.background = ""; input.style.borderColor = "";
    document.getElementById("applyCouponCalc").style.display = "inline-block";
    const rb = document.querySelector(".coupon-remove-btn"); if (rb) rb.remove();
    document.getElementById("calcCouponMessage").innerHTML = "";
    calculate();
  }

  function swal(icon, title, text, timer) {
    const opts = { icon, title, confirmButtonColor: "#4f7a64" };
    if (text) opts.text = text;
    if (timer) { opts.timer = timer; opts.showConfirmButton = false; }
    Swal.fire(opts);
  }

  /* =========================================================================
     8) جمع بيانات الحجز (بتشمل الباقة المختارة)
     ========================================================================= */
  function collectData() {
    const c = state.lastCalc || { base: getBase(), final: getBase(), discounts: [], payment: "cash" };
    const pk = getPack();
    let paymentLabel = "دفعة واحدة";
    if (c.payment.startsWith("plan_")) paymentLabel = CFG.paymentPlans[parseInt(c.payment.split("_")[1])].name;
    let instText = "";
    if (c.payment.startsWith("plan_")) instText = installmentText(c.final, CFG.paymentPlans[parseInt(c.payment.split("_")[1])]);
    return {
      courseTitle: CFG.course.title,
      courseId: CFG.course.id,
      packageId: state.pack,
      packageName: pk.name,
      packageSub: pk.sub,
      basePrice: c.base,
      finalPrice: c.final,
      savings: c.base - c.final,
      paymentCode: c.payment,
      paymentLabel,
      installmentText: instText,
      coupon: state.coupon,
      currency: cur,
    };
  }

  /* =========================================================================
     9) استمارة الحجز الفردي — شاملة
     ========================================================================= */
  function showBookingForm() {
    const d = collectData();
    const payLine = d.installmentText ? `${d.paymentLabel} — ${d.installmentText}` : d.paymentLabel;

    Swal.fire({
      title: "📋 إتمام الحجز",
      html: `<div style="text-align:right;direction:rtl;max-height:500px;overflow-y:auto;padding-left:8px;">
        <div style="background:linear-gradient(135deg,#4f7a64,#3c604f);padding:14px;border-radius:10px;margin-bottom:18px;color:#fff;">
          <h4 style="margin:0;font-family:Amiri,serif;"><i class="fas fa-baby"></i> ${d.courseTitle} — ${d.packageName}</h4>
          <p style="margin:8px 0 2px;">المبلغ المطلوب: <strong style="font-size:1.2rem;">${arNum(d.finalPrice)} ${d.currency}</strong></p>
          <p style="margin:0;font-size:.85rem;opacity:.9;">${payLine}</p>
        </div>

        <div style="background:#F9F6EF;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#3a322a;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-user"></i> بياناتك</h4>
          ${field("customerName", "الاسم الكامل", "اكتب اسمك", true)}
          ${field("customerWhatsapp", "رقم الواتساب", "01234567890", true, "ltr", "اكتبه بالإنجليزي")}
          ${field("customerEmail", "البريد الإلكتروني", "example@email.com", true, "ltr", "", "email")}
          ${field("customerRole", "إنت مين في رحلة التربية؟ (أم/أب/مربّي/معلّم...)", "مثلاً: أم لطفلين")}
          ${field("customerChildren", "عدد الأطفال (اختياري)", "", false, "", "", "number")}
          ${field("customerAges", "أعمارهم (اختياري)", "مثلاً: ٥، ٩، ١٤")}
          ${field("customerCountry", "البلد (اختياري)", "مصر، السعودية...")}
          ${field("customerCity", "المحافظة/المدينة (اختياري)", "")}
          ${field("customerSource", "عرفت عننا منين؟ (اختياري)", "")}
        </div>

        <div style="background:#F1F6F2;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#3c604f;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-info-circle"></i> معلومات إضافية</h4>
          ${textarea("customerExpectations", "إيه اللي نفسك توصله من الرحلة دي؟ (اختياري)")}
          ${textarea("customerNotes", "أي ملاحظات (اختياري)", 2)}
        </div>

        <div style="background:#FBF2DE;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#8a5a1e;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-credit-card"></i> وسيلة الدفع <span style="color:#c25a4f;">*</span></h4>
          <div style="display:grid;gap:8px;">
            ${payOpt("vodafone", "فودافون كاش")}
            ${payOpt("instapay", "انستاباي")}
            ${payOpt("bank", "تحويل بنكي")}
            ${payOpt("paypal", "PayPal / تحويل دولي")}
          </div>
        </div>

        <div style="background:#EEF4FA;padding:13px;border-radius:10px;border-right:3px solid #5b86c9;">
          <p style="color:#2c4a78;margin:0;text-align:center;font-size:.9rem;"><i class="fas fa-lock"></i> بياناتك آمنة ومحميّة — مش هتتشارك مع أي طرف تاني</p>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "✅ تأكيد الحجز",
      cancelButtonText: "رجوع",
      confirmButtonColor: "#4f7a64",
      width: window.innerWidth <= 768 ? "95%" : "720px",
      allowOutsideClick: false,
      didOpen: () => { document.getElementById("customerName")?.focus(); },
      preConfirm: () => {
        const name = document.getElementById("customerName").value.trim();
        const wa = document.getElementById("customerWhatsapp").value.trim();
        const email = document.getElementById("customerEmail").value.trim();
        const pm = document.querySelectorAll('input[name="paymentMethod"]:checked');
        if (!name) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!wa) { Swal.showValidationMessage("اكتب رقم الواتساب"); return false; }
        const waClean = arDigitsToEn(wa).replace(/[\s\-\(\)]/g, "");
        if (!/^(\+?\d{1,4})?\d{6,14}$/.test(waClean)) { Swal.showValidationMessage("رقم الواتساب مش مظبوط"); return false; }
        if (!email) { Swal.showValidationMessage("اكتب البريد الإلكتروني"); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage("البريد الإلكتروني مش مظبوط"); return false; }
        if (pm.length === 0) { Swal.showValidationMessage("اختر طريقة دفع واحدة على الأقل"); return false; }
        return true;
      },
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      const payments = [];
      document.querySelectorAll('input[name="paymentMethod"]:checked').forEach((c) => payments.push(c.value));

      const customer = {
        name:         document.getElementById("customerName").value.trim(),
        whatsapp:     document.getElementById("customerWhatsapp").value.trim(),
        email:        document.getElementById("customerEmail").value.trim(),
        role:         document.getElementById("customerRole").value.trim() || "",
        children:     document.getElementById("customerChildren").value || "",
        ages:         document.getElementById("customerAges").value.trim() || "",
        country:      document.getElementById("customerCountry").value.trim() || "",
        city:         document.getElementById("customerCity").value.trim() || "",
        source:       document.getElementById("customerSource").value.trim() || "",
        expectations: document.getElementById("customerExpectations").value.trim() || "",
        notes:        document.getElementById("customerNotes").value.trim() || "",
        paymentMethods: payments,
      };

      const booking = {
        bookingType: "individual",
        bookingDate: new Date().toISOString(),
        courseName: d.courseTitle,
        courseId: d.courseId,
        package: { id: d.packageId, name: d.packageName, sub: d.packageSub },
        customer,
        pricing: {
          basePriceNumber: d.basePrice,
          finalPriceNumber: d.finalPrice,
          finalPrice: `${arNum(d.finalPrice)} ${d.currency}`,
        },
        payment: { method: d.paymentLabel, code: d.paymentCode, installmentDetails: d.installmentText || null },
        coupon: d.coupon ? { ...d.coupon, applied: true } : null,
        totalSavings: d.savings,
      };

      await saveBookingAndOpenTelegram(booking);
    });
  }

  /* helpers لبناء الحقول */
  function field(id, label, ph, req, dir, hint, type) {
    const t = type || "text";
    const h = hint ? `<small style="color:#8a7f6c;display:block;margin-top:3px;">${hint}</small>` : "";
    return `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:#3a322a;font-weight:${req ? 600 : 500};">${label}${req ? ' <span style="color:#c25a4f;">*</span>' : ""}</label>
      <input type="${t}" id="${id}" placeholder="${ph || ""}" style="width:100%;padding:11px;border:2px solid #e6dcc4;border-radius:8px;font-size:1rem;background:#fff;color:#1f1a13;${dir ? "direction:" + dir + ";" : ""}">${h}</div>`;
  }
  function textarea(id, label, rows) {
    return `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:#3a322a;">${label}</label>
      <textarea id="${id}" rows="${rows || 3}" style="width:100%;padding:11px;border:2px solid #e6dcc4;border-radius:8px;resize:none;background:#fff;color:#1f1a13;font-family:Tajawal,sans-serif;"></textarea></div>`;
  }
  function payOpt(val, label) {
    return `<label style="display:flex;align-items:center;padding:11px;background:#fff;border:2px solid #e6dcc4;border-radius:8px;cursor:pointer;"><input type="checkbox" name="paymentMethod" value="${val}" style="margin-left:10px;width:18px;height:18px;"><strong style="color:#1f1a13;">${label}</strong></label>`;
  }
  function commit(id, label) {
    return `<div style="margin-bottom:8px;"><label style="cursor:pointer;display:flex;align-items:flex-start;gap:8px;color:#1f1a13;font-size:.92rem;line-height:1.6;">
      <input type="checkbox" id="${id}" style="margin-top:3px;width:17px;height:17px;flex-shrink:0;"><span>${label}</span></label></div>`;
  }

  /* =========================================================================
     10) استمارة طلب الدعم / المنحة — ٣ خيارات بسلايدرز
     ========================================================================= */
  function showGrantForm() {
    const d = collectData();
    const basePrice = getBase();
    const offer = getActiveTimeOffer();
    let priceAfterOffer = basePrice;
    if (offer) priceAfterOffer = Math.round(basePrice * (1 - offer.percentage / 100));

    let selectedInstallmentMonths = 3, selectedPercentage = 50, selectedPartialMonths = 3;
    const maxP = (CFG.grant && CFG.grant.maxDiscountPercent) || 90;
    const minPay = 100 - maxP;

    window.__hdn_updateInstallment = function () {
      const m = document.getElementById("installmentMonths").value;
      document.getElementById("monthsCount").textContent = m;
      document.getElementById("monthlyAmount").textContent = arNum(Math.ceil(priceAfterOffer / m));
      selectedInstallmentMonths = m;
    };
    window.__hdn_updatePartial = function () {
      const p = document.getElementById("affordableAmount").value;
      document.getElementById("percentageAmount").textContent = p;
      document.getElementById("finalAmount").textContent = arNum(Math.round(priceAfterOffer * (p / 100)));
      selectedPercentage = p;
      if (document.getElementById("installPartial")?.checked) window.__hdn_updatePartialInst();
    };
    window.__hdn_togglePartialInst = function () {
      const c = document.getElementById("installPartial").checked;
      document.getElementById("partialInstallmentDetails").style.display = c ? "block" : "none";
      if (c) window.__hdn_updatePartialInst();
    };
    window.__hdn_updatePartialInst = function () {
      const amt = Math.round(priceAfterOffer * (document.getElementById("affordableAmount").value / 100));
      const m = document.getElementById("partialInstallmentMonths").value;
      document.getElementById("partialMonthsCount").textContent = m;
      document.getElementById("partialMonthlyAmount").textContent = arNum(Math.ceil(amt / m));
      selectedPartialMonths = m;
    };
    window.__hdn_toggleSupport = function () {
      const s = document.querySelector('input[name="supportType"]:checked')?.value;
      const id = document.getElementById("installmentDetails");
      const pd = document.getElementById("partialDetails");
      if (id) id.style.display = "none";
      if (pd) pd.style.display = "none";
      if (s === "installment" && id) { id.style.display = "block"; window.__hdn_updateInstallment(); }
      else if (s === "partial" && pd) { pd.style.display = "block"; window.__hdn_updatePartial(); }
    };

    Swal.fire({
      title: "🤲 طلب منحة / دعم مالي",
      html: `<div style="text-align:right;direction:rtl;max-height:500px;overflow-y:auto;padding-left:8px;">
        <div style="background:linear-gradient(135deg,#4f7a64,#3c604f);padding:15px;border-radius:10px;margin-bottom:18px;color:#fff;">
          <h4 style="margin:0;font-family:Amiri,serif;"><i class="fas fa-baby"></i> ${d.courseTitle} — ${d.packageName}</h4>
        </div>
        <div style="background:rgba(79,122,100,.1);padding:18px;border-radius:10px;margin-bottom:18px;text-align:center;">
          <i class="fas fa-heart" style="font-size:2.2rem;color:#4f7a64;"></i>
          <h3 style="color:#3c604f;margin:10px 0 4px;font-family:Amiri,serif;">المال مايصحّش يكون عائق</h3>
          <p style="color:#3c604f;margin:0;font-size:.92rem;">طلبك بيتعامل بسرّية تامّة، وبتفهّم لظروفك.</p>
        </div>

        <div style="background:#F9F6EF;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#3a322a;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-user"></i> بياناتك</h4>
          ${field("customerName", "الاسم الكامل", "", true)}
          ${field("customerWhatsapp", "رقم الواتساب", "01234567890", true, "ltr")}
          ${field("customerEmail", "البريد الإلكتروني", "example@email.com", true, "ltr", "", "email")}
          ${field("customerRole", "إنت مين في رحلة التربية؟ (اختياري)", "")}
          ${field("customerCountry", "البلد (اختياري)", "")}
          ${field("customerCity", "المدينة (اختياري)", "")}
        </div>

        <div style="background:#FBF4E4;padding:18px;border-radius:10px;margin-bottom:14px;border-right:4px solid #c79a3a;">
          <h4 style="color:#7a5618;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-book-open"></i> قصّتك</h4>
          ${textarea("whyNeedGrant", "ليه محتاج الدعم ده؟ *", 4)}
          ${textarea("challenges", "إيه التحديات اللي بتواجهها دلوقتي؟ *", 4)}
          ${textarea("communityContribution", "هتفيد محيطك إزاي بعد ما تتعلّم؟ (اختياري)", 3)}
        </div>

        <div style="background:#F2EEF8;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#56407e;margin-bottom:14px;font-family:Amiri,serif;"><i class="fas fa-hand-holding-heart"></i> الدعم المطلوب</h4>

          <div style="margin-bottom:14px;">
            <label style="font-weight:600;color:#56407e;display:block;margin-bottom:6px;">الوضع الوظيفي <span style="color:#c25a4f;">*</span></label>
            <select id="employmentStatus" style="width:100%;padding:11px;border:2px solid #e3d8f0;border-radius:8px;background:#fff;color:#1f1a13;font-family:Tajawal,sans-serif;">
              <option value="">-- اختر --</option>
              <option value="student">طالب</option>
              <option value="employed">موظف</option>
              <option value="freelance">عمل حر</option>
              <option value="homemaker">ربّ/ربّة منزل</option>
              <option value="unemployed">بدون عمل</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
              <label style="color:#56407e;display:block;margin-bottom:6px;">دخل ثابت؟</label>
              <select id="hasIncome" style="width:100%;padding:11px;border:2px solid #e3d8f0;border-radius:8px;background:#fff;color:#1f1a13;font-family:Tajawal,sans-serif;">
                <option value="">اختياري</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
                <option value="irregular">غير منتظم</option>
              </select>
            </div>
            <div>
              <label style="color:#56407e;display:block;margin-bottom:6px;">عدد المعالين</label>
              <input type="number" id="dependents" min="0" style="width:100%;padding:11px;border:2px solid #e3d8f0;border-radius:8px;background:#fff;color:#1f1a13;">
            </div>
          </div>

          <label style="font-weight:600;color:#56407e;display:block;margin-bottom:10px;">نوع الدعم المطلوب <span style="color:#c25a4f;">*</span></label>

          <div style="background:#fff;padding:16px;border-radius:10px;margin-bottom:12px;border:2px solid #e3d8f0;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="installment" onchange="__hdn_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;">
              <div style="width:100%;">
                <strong style="color:#56407e;">تقسيط مُيسّر على شهور أكتر</strong>
                <p style="color:#6a5e4f;font-size:.88rem;margin:4px 0 0;">قسّط المبلغ كامل على عدد الشهور المناسب ليك (٢ – ١٨ شهر).</p>
                <div id="installmentDetails" style="display:none;margin-top:14px;">
                  <label style="color:#56407e;font-size:.88rem;">عدد الأشهر:</label>
                  <input type="range" id="installmentMonths" min="2" max="18" value="3" oninput="__hdn_updateInstallment()" style="width:100%;margin:8px 0;">
                  <div style="text-align:center;padding:13px;background:#F2EEF8;border-radius:8px;">
                    <div style="font-size:1.1rem;color:#56407e;font-weight:700;"><span id="monthsCount">3</span> أشهر</div>
                    <div style="font-size:1.4rem;color:#4f7a64;font-weight:700;margin-top:4px;"><span id="monthlyAmount">0</span> ${cur} / شهرياً</div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <div style="background:#fff;padding:16px;border-radius:10px;margin-bottom:12px;border:2px solid #e3d8f0;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="partial" onchange="__hdn_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;">
              <div style="width:100%;">
                <strong style="color:#56407e;">منحة جزئية — أقدر أدفع جزء بس</strong>
                <p style="color:#6a5e4f;font-size:.88rem;margin:4px 0 0;">حدّد النسبة اللي تقدر تدفعها، واحنا نتكفّل بالباقي.</p>
                <div id="partialDetails" style="display:none;margin-top:14px;">
                  <label style="color:#56407e;font-size:.88rem;">النسبة اللي تقدر تدفعها:</label>
                  <input type="range" id="affordableAmount" min="${minPay}" max="90" value="50" oninput="__hdn_updatePartial()" style="width:100%;margin:8px 0;">
                  <div style="text-align:center;padding:13px;background:#F2EEF8;border-radius:8px;">
                    <div style="color:#56407e;font-size:.95rem;">تدفع <strong><span id="percentageAmount">50</span>%</strong> من المبلغ</div>
                    <div style="font-size:1.4rem;color:#4f7a64;font-weight:700;margin-top:4px;"><span id="finalAmount">0</span> ${cur}</div>
                  </div>
                  <div style="margin-top:14px;padding:13px;background:#FBF4E4;border-radius:8px;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:#1f1a13;font-size:.92rem;">
                      <input type="checkbox" id="installPartial" onchange="__hdn_togglePartialInst()" style="width:17px;height:17px;">
                      عايز أقسّط المبلغ ده على شهور
                    </label>
                    <div id="partialInstallmentDetails" style="display:none;margin-top:12px;">
                      <input type="range" id="partialInstallmentMonths" min="2" max="12" value="3" oninput="__hdn_updatePartialInst()" style="width:100%;">
                      <div style="text-align:center;margin-top:8px;padding:10px;background:#fff;border-radius:8px;color:#1f1a13;">
                        <span id="partialMonthsCount">3</span> أشهر × <strong id="partialMonthlyAmount">0</strong> ${cur}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <div style="background:#fff;padding:16px;border-radius:10px;border:2px solid #e3d8f0;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="full" onchange="__hdn_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;">
              <div>
                <strong style="color:#56407e;">منحة كاملة ١٠٠٪</strong>
                <p style="color:#6a5e4f;font-size:.88rem;margin:4px 0 0;">مش قادر أدفع حالياً، وبطلب منحة كاملة.</p>
              </div>
            </label>
          </div>
        </div>

        <div style="background:#FBF2DE;padding:16px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#8a5a1e;margin-bottom:12px;font-family:Amiri,serif;"><i class="fas fa-credit-card"></i> وسيلة الدفع المتاحة ليك (اختياري)</h4>
          <div style="display:grid;gap:8px;">
            ${payOpt("vodafone", "فودافون كاش")}
            ${payOpt("instapay", "انستاباي")}
            ${payOpt("bank", "تحويل بنكي")}
          </div>
        </div>

        <div style="background:#FBEDEB;padding:18px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#9a3d34;margin-bottom:12px;font-family:Amiri,serif;"><i class="fas fa-handshake"></i> التعهدات</h4>
          ${commit("commitment1", "أتعهّد بالحضور الكامل واستثمار المحتوى بجدّية")}
          ${commit("commitment2", "أتعهّد بالمشاركة الفعّالة والتفاعل الجادّ")}
          ${commit("commitment3", "المعلومات اللي كتبتها صحيحة وحقيقية")}
          <div style="margin-top:14px;padding:13px;background:#F1F6F2;border-radius:8px;">
            ${commit("volunteerCommitment", "أتطوّع بمساعدة ٣ أشخاص من محيطي بعد إتمام الدورة (اختياري)")}
          </div>
        </div>

        <div style="background:#EAF5EC;padding:14px;border-radius:10px;border-right:3px solid #4f7a64;">
          <p style="color:#2f4d3e;margin:0;text-align:center;font-size:.92rem;"><i class="fas fa-clock"></i> هنراجع طلبك خلال ٢٤–٤٨ ساعة</p>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "✅ إرسال طلب الدعم",
      cancelButtonText: "رجوع",
      confirmButtonColor: "#4f7a64",
      width: window.innerWidth <= 768 ? "95%" : "780px",
      allowOutsideClick: false,
      didOpen: () => {
        document.getElementById("customerName")?.focus();
        window.__hdn_updateInstallment(); window.__hdn_updatePartial();
      },
      preConfirm: () => {
        if (!document.getElementById("customerName").value.trim()) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!document.getElementById("customerWhatsapp").value.trim()) { Swal.showValidationMessage("اكتب رقم الواتساب"); return false; }
        const email = document.getElementById("customerEmail").value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage("البريد الإلكتروني مطلوب وصحيح"); return false; }
        if (!document.getElementById("whyNeedGrant").value.trim()) { Swal.showValidationMessage("اشرح سبب طلب الدعم"); return false; }
        if (!document.getElementById("challenges").value.trim()) { Swal.showValidationMessage("اشرح التحديات اللي بتواجهها"); return false; }
        if (!document.getElementById("employmentStatus").value) { Swal.showValidationMessage("حدّد الوضع الوظيفي"); return false; }
        if (!document.querySelector('input[name="supportType"]:checked')) { Swal.showValidationMessage("اختر نوع الدعم المطلوب"); return false; }
        if (!document.getElementById("commitment1").checked || !document.getElementById("commitment2").checked || !document.getElementById("commitment3").checked) {
          Swal.showValidationMessage("لازم توافق على التعهدات الثلاثة"); return false;
        }
        return true;
      },
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      const payments = [];
      document.querySelectorAll('input[name="paymentMethod"]:checked').forEach((c) => payments.push(c.value));
      const supportType = document.querySelector('input[name="supportType"]:checked').value;

      let finalPriceNumber = 0, totalSavings = 0, supportDetails = {};
      if (supportType === "full") {
        finalPriceNumber = 0; totalSavings = basePrice; supportDetails = { type: "full", discount: 100 };
      } else if (supportType === "partial") {
        finalPriceNumber = Math.round(priceAfterOffer * (selectedPercentage / 100));
        totalSavings = basePrice - finalPriceNumber;
        supportDetails = {
          type: "partial", percentage: selectedPercentage, affordableAmount: finalPriceNumber,
          installmentRequested: document.getElementById("installPartial")?.checked || false,
          installmentMonths: document.getElementById("installPartial")?.checked ? selectedPartialMonths : null,
          monthlyAmount: document.getElementById("installPartial")?.checked ? Math.ceil(finalPriceNumber / selectedPartialMonths) : null,
        };
      } else {
        finalPriceNumber = priceAfterOffer; totalSavings = basePrice - priceAfterOffer;
        supportDetails = { type: "installment", months: selectedInstallmentMonths, monthlyAmount: Math.ceil(priceAfterOffer / selectedInstallmentMonths) };
      }

      const customer = {
        name:    document.getElementById("customerName").value.trim(),
        whatsapp:document.getElementById("customerWhatsapp").value.trim(),
        email:   document.getElementById("customerEmail").value.trim(),
        role:    document.getElementById("customerRole").value.trim() || "",
        country: document.getElementById("customerCountry").value.trim() || "",
        city:    document.getElementById("customerCity").value.trim() || "",
        paymentMethods: payments,
      };

      const grantBooking = {
        bookingType: "grant_request",
        bookingDate: new Date().toISOString(),
        courseName: d.courseTitle,
        courseId: d.courseId,
        package: { id: d.packageId, name: d.packageName, sub: d.packageSub },
        coursePrice: basePrice,
        salePrice: priceAfterOffer,
        customer,
        pricing: { basePriceNumber: basePrice, finalPriceNumber, finalPrice: `${arNum(finalPriceNumber)} ${cur}` },
        totalSavings,
        grantDetails: {
          reason: document.getElementById("whyNeedGrant").value.trim(),
          challenges: document.getElementById("challenges").value.trim(),
          communityContribution: document.getElementById("communityContribution").value.trim() || "",
          financial: {
            employmentStatus: document.getElementById("employmentStatus").value,
            hasIncome: document.getElementById("hasIncome").value || "",
            dependents: document.getElementById("dependents").value || "",
          },
          supportType, supportDetails,
          commitments: {
            fullAttendance: true, activeParticipation: true, truthfulInfo: true,
            volunteerWork: document.getElementById("volunteerCommitment")?.checked || false,
          },
        },
      };

      await saveBookingAndOpenTelegram(grantBooking);
    });
  }

  /* =========================================================================
     11) حفظ الحجز في Firebase + تليجرام تلقائي (بدون نسخ يدوي)
     ========================================================================= */
  async function saveBookingAndOpenTelegram(bookingData) {
    Swal.fire({
      title: "جاري معالجة طلبك...",
      html: '<p style="color:#6a5e4f;">لحظات — بنحفظ بياناتك في النظام</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const telegramCode = ("HD" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)).toUpperCase();

    const fullRecord = {
      ...bookingData,
      bookingId: "HD_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11),
      timestamp: new Date().toISOString(),
      status: "pending",
      telegramCode,
      automationEnabled: true,
    };

    let firebaseSaved = false;
    if (fbReady && db) {
      try {
        const docRef = await db.collection("tempBookings").add(fullRecord);
        firebaseSaved = true;
        if (fullRecord.coupon && fullRecord.coupon.isFirebase && fullRecord.coupon.id) {
          try {
            await db.collection("coupons").doc(fullRecord.coupon.id).update({
              used: firebase.firestore.FieldValue.increment(1),
              status: "used",
              usedAt: firebase.firestore.FieldValue.serverTimestamp(),
              bookingId: docRef.id,
            });
          } catch (e) { console.warn("Coupon update failed:", e); }
        }
      } catch (e) { console.error("Firebase save failed:", e); }
    }

    const botUrl = `https://t.me/${CFG.telegram.botUsername}?start=${telegramCode}`;
    const isGrant = bookingData.bookingType === "grant_request";

    await Swal.fire({
      icon: "success",
      title: isGrant ? "🤲 استلمنا طلب الدعم" : "🌱 تم تسجيل حجزك",
      html: `<div style="text-align:right;direction:rtl;">
        <div style="background:linear-gradient(135deg,#FBF2DE,#F3E6C8);padding:18px;border-radius:12px;margin-bottom:18px;">
          <p style="color:#6a4a18;font-size:1.05rem;line-height:1.85;margin:0;">
            ${isGrant
              ? "وصلنا طلبك، وهنراجعه خلال ٢٤–٤٨ ساعة. خطوتك الجاية: أكّد طلبك عبر بوت تليجرام بضغطة واحدة."
              : "بياناتك اتسجّلت في نظامنا. خطوتك الأخيرة: أكّد حجزك واستلم تعليمات الدفع عبر بوت تليجرام."}
          </p>
        </div>

        <div style="background:#EEF4FA;border:1px solid #cfe0f2;border-radius:12px;padding:18px;margin-bottom:14px;">
          <h4 style="color:#2c4a78;margin:0 0 12px;font-family:Amiri,serif;font-size:1.1rem;"><i class="fab fa-telegram"></i> التأكيد عبر تليجرام — تلقائي بضغطة واحدة</h4>
          <p style="color:#1f1a13;margin:0 0 6px;font-size:.95rem;line-height:1.75;">١. اضغط الزر الأزرق تحت.</p>
          <p style="color:#1f1a13;margin:0 0 6px;font-size:.95rem;line-height:1.75;">٢. في تليجرام، اضغط <strong style="color:#2c79c9;">Start</strong>.</p>
          <p style="color:#1f1a13;margin:0;font-size:.95rem;line-height:1.75;">٣. هنبعتلك تعليمات الدفع وتفاصيل التأكيد فوراً.</p>
        </div>

        <div style="background:#F9F6EF;border-radius:10px;padding:12px 14px;text-align:center;border:1px dashed #d9cba8;">
          <p style="margin:0 0 4px;color:#8a7f6c;font-size:.78rem;">رقم الطلب المرجعي (للحفظ فقط — بيتنقل تلقائياً):</p>
          <p style="margin:0;color:#3a322a;font-family:monospace;letter-spacing:2px;font-size:.95rem;font-weight:700;">${telegramCode}</p>
        </div>

        ${!firebaseSaved ? `<div style="background:#FBEDEB;border-right:3px solid #c25a4f;padding:12px;border-radius:8px;margin-top:14px;color:#9a3d34;font-size:.88rem;">
          <i class="fas fa-exclamation-triangle"></i> ملاحظة: حصلت مشكلة بسيطة في حفظ البيانات. لو ما وصلكش رد من البوت خلال دقائق، تواصل واتساب.
        </div>` : ""}
      </div>`,
      confirmButtonText: '<i class="fab fa-telegram"></i>  إكمال عبر تليجرام',
      confirmButtonColor: "#2c79c9",
      showCancelButton: !firebaseSaved,
      cancelButtonText: "تواصل واتساب",
      cancelButtonColor: "#25D366",
      width: window.innerWidth <= 768 ? "95%" : "560px",
      allowOutsideClick: false,
    }).then((res) => {
      if (res.isConfirmed) {
        window.open(botUrl, "_blank");
      } else if (res.dismiss === Swal.DismissReason.cancel) {
        const msg = buildFallbackWhatsAppMessage(fullRecord);
        window.open(`https://wa.me/${CFG.fallbackWhatsApp}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    });
  }

  function buildFallbackWhatsAppMessage(record) {
    const c = record.customer || {};
    const isGrant = record.bookingType === "grant_request";
    let m = isGrant ? `🤲 *طلب دعم — ${record.courseName}*\n\n` : `🌱 *حجز جديد — ${record.courseName}*\n\n`;
    if (record.package) m += `📦 الباقة: ${record.package.name}\n`;
    m += `📌 رقم الطلب: ${record.telegramCode}\n`;
    m += `👤 الاسم: ${c.name}\n📱 واتساب: ${c.whatsapp}\n`;
    if (c.email) m += `📧 ${c.email}\n`;
    if (c.city) m += `🏙️ ${c.city}\n`;
    if (isGrant && record.grantDetails) {
      m += `\n💬 السبب: ${record.grantDetails.reason}\n🎯 نوع الدعم: ${record.grantDetails.supportType}\n`;
    } else if (record.payment) {
      m += `\n💳 طريقة الدفع: ${record.payment.method}\n`;
      if (record.payment.installmentDetails) m += `📅 ${record.payment.installmentDetails}\n`;
    }
    m += `\n💰 المبلغ المطلوب: ${record.pricing.finalPrice}`;
    return m;
  }

  /* =========================================================================
     12) مسارات الزائر (جديد / مجموعة سابقة / مبتدئ)
     ========================================================================= */
  function setupPathSelector() {
    const cards = document.querySelectorAll(".pathcard[data-path]");
    const wrap = document.getElementById("packagesWrap");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const p = card.dataset.path;
        cards.forEach((x) => x.classList.toggle("active", x === card));
        if (wrap) wrap.dataset.path = p;
        state.userPath = p;

        if (p === "new") { allowedPacks = Object.keys(CFG.packages); state.pack = "full"; }
        else if (p === "alumni") { allowedPacks = ["part2-alumni"]; state.pack = "part2-alumni"; }
        else if (p === "starter") { allowedPacks = ["part1"]; state.pack = "part1"; }

        const titleEl = document.getElementById("packsTitle");
        const subEl = document.getElementById("packsSub");
        if (p === "new") {
          if (titleEl) titleEl.textContent = "تلات باقات قدامك — أنهي واحدة تناسبك؟";
          if (subEl) subEl.textContent = "الباقة الكاملة هي الأنسب لو بتبدأ من الأول";
        } else if (p === "alumni") {
          if (titleEl) titleEl.textContent = "أهلاً بيك من جديد · رحلة الاحتضان مستنياك";
          if (subEl) subEl.textContent = "سعر تكريمي خاص للمجموعة السابقة — اعترافاً بثقتك";
        } else if (p === "starter") {
          if (titleEl) titleEl.textContent = "ابدأ رحلتك بالاكتشاف";
          if (subEl) subEl.textContent = "الجزء الأول رحلة كاملة بذاتها — وتقدر تكمّل بعدين";
        }

        renderPackPills();
        renderOffers();
        renderActiveOfferBadge();
        updateChosenPackLabel();
        calculate();

        setTimeout(() => {
          document.getElementById("packagesWrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      });
    });
  }

  function setupPackCards() {
    document.querySelectorAll("[data-pick-pack]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setPack(btn.dataset.pickPack);
        document.getElementById("offer-calc")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* =========================================================================
     13) التهيئة
     ========================================================================= */
  function init() {
    initFirebase();

    renderPackCardPrices();
    renderPackPills();
    renderOffers();
    renderPaymentCards();
    renderActiveOfferBadge();
    updateChosenPackLabel();
    calculate();

    setupPathSelector();
    setupPackCards();

    document.getElementById("applyCouponCalc")?.addEventListener("click", applyCoupon);
    document.getElementById("calcCoupon")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyCoupon(); }
    });
    document.getElementById("calcBookBtn")?.addEventListener("click", showBookingForm);
    window.__alHednSetPack = setPack;

    if (CFG.grant && CFG.grant.enabled) {
      const g = document.getElementById("calcGrantBtn");
      const sm = document.getElementById("calcSupportMessage");
      if (g) { g.style.display = "block"; g.addEventListener("click", showGrantForm); }
      if (sm) sm.style.display = "block";
    } else {
      document.getElementById("calcGrantBtn")?.remove();
      document.getElementById("calcSupportMessage")?.remove();
    }

    // hero offer badge
    const offer = getActiveTimeOffer();
    const heroBadge = document.getElementById("heroOfferBadge");
    if (offer && heroBadge) {
      heroBadge.style.display = "inline-flex";
      const nameEl = heroBadge.querySelector("[data-offer-name]");
      const pctEl = heroBadge.querySelector("[data-offer-pct]");
      if (nameEl) nameEl.textContent = offer.name;
      if (pctEl) pctEl.textContent = `${offer.percentage}%`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
