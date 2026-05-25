/* ============================================================================
   🧮  محرّك دورة "جاهز للتحوّل"
   ============================================================================
   الفلسفة:
   • العروض والأسعار والخصومات → من offers-config.js (محلي، بدون Firebase)
     ← ده اللي بيتعرض وقت تحميل الصفحة، فمفيش خطأ وصول لقاعدة البيانات.
   • الأكواد → تُستدعى من Firebase وقت الضغط على "تطبيق" فقط.
   • إتمام الحجز + التليجرام → Firebase كامل (نفس النظام الأصلي).

   ⚠️  مش محتاج تعدّل هنا. كل تحكّم العروض في offers-config.js
       وإعدادات Firebase/التليجرام في offers-config.js كمان.
   ============================================================================ */

(function () {
  "use strict";

  const CFG = window.COURSE_CONFIG;
  if (!CFG) { console.error("⚠️ offers-config.js مش متحمّل."); return; }

  const fmt = (n) => Math.round(n / 10) * 10;
  const arNum = (n) => fmt(n).toLocaleString("ar-EG");
  const cur = CFG.course.currency;

  /* ── تهيئة Firebase (للحجز والأكواد فقط — مش للعروض) ── */
  let db = null;
  function ensureFirebase() {
    if (db) return db;
    if (typeof firebase === "undefined" || !CFG.firebase || !CFG.firebase.apiKey) return null;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG.firebase);
      db = firebase.firestore();
      return db;
    } catch (e) { console.warn("Firebase init skipped:", e); return null; }
  }

  /* ── تحديد العرض الزمني النشط (محلي) ── */
  function getActiveTimeOffer() {
    const now = new Date();
    return (CFG.timeOffers || []).find((o) => {
      if (!o.enabled) return false;
      const s = new Date(o.startDate), e = new Date(o.endDate);
      e.setHours(23, 59, 59, 999);
      return now >= s && now <= e && o.percentage > 0;
    }) || null;
  }

  const state = { payment: "cash", coupon: null, lastCalc: null };

  /* ====================================================================
     عرض بطاقات العروض (محلي بالكامل)
     ==================================================================== */
  function renderOffers() {
    const container = document.querySelector("#offers-render");
    if (!container) return;
    const base = CFG.course.basePrice;
    const offer = getActiveTimeOffer();
    let html = "";

    if (offer) {
      const finalP = fmt(base - base * offer.percentage / 100);
      const savings = fmt(base - finalP);
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card urgent">
          <span class="offer-badge urgent pulse">${offer.name}</span>
          <div class="offer-header"><h4>استثمارك في الرحلة</h4><i class="fas fa-fire offer-icon"></i></div>
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
          <span class="offer-badge">الاستثمار في الرحلة</span>
          <div class="offer-header"><h4>الاستثمار في الدورة</h4><i class="fas fa-graduation-cap offer-icon"></i></div>
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
        <div class="offer-header"><h4>الدفع الكامل</h4><i class="fas fa-money-bill-wave offer-icon"></i></div>
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
        const inst = plan.installments || 3, fp = plan.firstPaymentPercent || 0;
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
    const el = document.getElementById("offerTimer");
    if (!el) return;
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    (function tick() {
      const diff = end - new Date();
      if (diff <= 0) { el.innerHTML = `<div class="timer-item"><span>انتهى</span></div>`; return; }
      const d = Math.floor(diff / 86400000), h = Math.floor(diff % 86400000 / 3600000),
            m = Math.floor(diff % 3600000 / 60000), s = Math.floor(diff % 60000 / 1000);
      el.innerHTML =
        `<div class="timer-item"><span>${d}</span><span class="label">يوم</span></div>
         <div class="timer-item"><span>${h}</span><span class="label">ساعة</span></div>
         <div class="timer-item"><span>${m}</span><span class="label">دقيقة</span></div>
         <div class="timer-item"><span>${s}</span><span class="label">ثانية</span></div>`;
      setTimeout(tick, 1000);
    })();
  }

  /* ====================================================================
     الحاسبة الذكية (حساب محلي)
     ==================================================================== */
  function renderPaymentCards() {
    const c = document.getElementById("calcPaymentCards");
    if (!c) return;
    let html = "";
    if (CFG.cashDiscount && CFG.cashDiscount.enabled) {
      html += `<div class="payment-card active" data-payment="cash"><i class="fas fa-money-bill-wave"></i><h6>دفعة واحدة</h6><small>خصم ${CFG.cashDiscount.percentage}%</small></div>`;
    } else {
      html += `<div class="payment-card active" data-payment="full"><i class="fas fa-credit-card"></i><h6>دفعة واحدة</h6></div>`;
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
    state.payment = c.querySelector(".payment-card.active")?.dataset.payment || "full";
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
    const base = CFG.course.basePrice;
    let price = base;
    const discounts = [];
    const offer = getActiveTimeOffer();
    if (offer) { const d = base * offer.percentage / 100; price -= d; discounts.push({ type: "time", amount: d, name: offer.name }); }
    if (state.payment === "cash" && CFG.cashDiscount && CFG.cashDiscount.enabled) {
      const d = price * CFG.cashDiscount.percentage / 100; price -= d; discounts.push({ type: "cash", amount: d });
    }
    if (state.coupon) {
      const d = state.coupon.type === "percentage" ? price * state.coupon.value / 100 : Math.min(state.coupon.value, price);
      price -= d; discounts.push({ type: "coupon", amount: d, name: state.coupon.code });
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
      if (plan) { document.getElementById("calcInstallmentPlan").textContent = installmentText(final, plan); det.style.display = "block"; }
    } else det.style.display = "none";
    const savings = base - final;
    const sv = document.getElementById("calcSavings");
    if (savings > 0) { sv.style.display = "block"; document.getElementById("calcSavingsAmount").textContent = arNum(savings); }
    else sv.style.display = "none";
  }

  function installmentText(total, plan) {
    const inst = plan.installments || 3, fp = plan.firstPaymentPercent || 0;
    total = fmt(total);
    if (fp > 0) {
      const first = fmt(total * fp / 100), monthly = fmt((total - first) / (inst - 1));
      return `دفعة أولى ${arNum(first)} ${cur} + ${inst - 1} قسط × ${arNum(monthly)} ${cur}`;
    }
    const monthly = fmt(total / inst);
    return `${inst} أقساط × ${arNum(monthly)} ${cur} شهرياً`;
  }

  /* ====================================================================
     أكواد الخصم — تُستدعى من Firebase وقت الضغط فقط
     ==================================================================== */
  async function applyCoupon() {
    const input = document.getElementById("calcCoupon");
    const code = input.value.trim().toUpperCase();
    if (!code) { swal("warning", "كود فارغ", "اكتب كود الخصم الأول"); return; }

    let valid = null;

    // 1) أولاً: حاول من Firebase (نظامك في تفعيل الأكواد)
    const fdb = ensureFirebase();
    if (fdb) {
      try {
        const snap = await fdb.collection("coupons").where("code", "==", code).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0], data = doc.data();
          if (data.status === "used") { swal("error", "كود مستخدم", "الكود ده اتستخدم قبل كده"); return; }
          if (data.status === "expired") { swal("error", "كود منتهي", "صلاحية الكود انتهت"); return; }
          valid = { id: doc.id, code: data.code, type: data.type || "fixed", value: data.value || 0, isFirebase: true };
        }
      } catch (e) { console.warn("Coupon Firebase lookup failed, trying local:", e); }
    }

    // 2) fallback: الأكواد المحلية في offers-config.js (لو موجودة)
    if (!valid) {
      const local = (CFG.coupons || []).find((c) => c.code.toUpperCase() === code);
      if (local) valid = { code: local.code, type: local.type, value: local.value, isFirebase: false };
    }

    if (!valid) { swal("error", "كود غير صحيح", "تأكد من الكود وحاول تاني"); return; }

    state.coupon = valid;
    input.disabled = true;
    input.style.background = "rgba(74,138,92,.1)";
    input.style.borderColor = "var(--sage)";
    document.getElementById("applyCouponCalc").style.display = "none";
    if (!document.querySelector(".coupon-remove-btn")) {
      const btn = document.createElement("button");
      btn.className = "coupon-remove-btn";
      btn.innerHTML = '<i class="fas fa-times"></i> إزالة';
      btn.style.cssText = "background:var(--danger);color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;margin-right:10px;font-family:Cairo,sans-serif;";
      btn.onclick = removeCoupon;
      input.parentElement.appendChild(btn);
    }
    document.getElementById("calcCouponMessage").innerHTML =
      `<div style="background:rgba(74,138,92,.08);border:1px solid var(--sage);padding:10px;border-radius:8px;color:var(--sage-bright);margin-top:10px;"><i class="fas fa-check-circle"></i> الكود <strong>${valid.code}</strong> مُفعّل ${valid.type === "percentage" ? `(خصم ${valid.value}%)` : `(خصم ${valid.value} ${cur})`}</div>`;
    swal("success", "تم التطبيق!", "", 1600);
    calculate();
  }

  function removeCoupon() {
    state.coupon = null;
    const input = document.getElementById("calcCoupon");
    input.value = ""; input.disabled = false; input.style.background = ""; input.style.borderColor = "";
    document.getElementById("applyCouponCalc").style.display = "inline-block";
    const rb = document.querySelector(".coupon-remove-btn"); if (rb) rb.remove();
    document.getElementById("calcCouponMessage").innerHTML = "";
    calculate();
  }

  function swal(icon, title, text, timer) {
    const o = { icon, title, confirmButtonColor: "#4A8A5C" };
    if (text) o.text = text;
    if (timer) { o.timer = timer; o.showConfirmButton = false; }
    Swal.fire(o);
  }

  /* ====================================================================
     جمع بيانات الحساب الحالي
     ==================================================================== */
  function collectCalc() {
    const c = state.lastCalc || { base: CFG.course.basePrice, final: CFG.course.basePrice, discounts: [], payment: "full" };
    let paymentLabel = "دفعة واحدة", instText = "";
    if (c.payment.startsWith("plan_")) {
      const plan = CFG.paymentPlans[parseInt(c.payment.split("_")[1])];
      paymentLabel = plan.name;
      instText = installmentText(c.final, plan);
    } else if (c.payment === "cash") paymentLabel = "دفعة واحدة (دفع كامل)";
    return {
      courseTitle: CFG.course.title,
      courseId: CFG.course.id,
      basePrice: c.base, finalPrice: c.final, savings: c.base - c.final,
      paymentLabel, installmentText: instText,
      coupon: state.coupon, currency: cur,
      discounts: c.discounts,
    };
  }

  /* ====================================================================
     استمارة الحجز الكاملة (نفس حقول النظام الأصلي)
     ==================================================================== */
  function showBookingForm() {
    const d = collectCalc();
    const payLine = d.installmentText ? `${d.paymentLabel} — ${d.installmentText}` : d.paymentLabel;
    Swal.fire({
      title: "📋 إتمام الحجز",
      html: `<div style="text-align:right;direction:rtl;max-height:62vh;overflow-y:auto;">
        <div style="background:linear-gradient(135deg,#4A8A5C,#2E6940);padding:14px;border-radius:10px;margin-bottom:16px;color:#fff;">
          <h4 style="margin:0;font-family:Amiri,serif;"><i class="fas fa-book"></i> ${d.courseTitle}</h4>
          <p style="margin:8px 0 2px;">المبلغ المطلوب: <strong style="font-size:1.2rem;">${d.finalPrice.toLocaleString("ar-EG")} ${d.currency}</strong></p>
          <p style="margin:0;font-size:.82rem;opacity:.9;">${payLine}</p>
        </div>
        <div style="background:#F9FAFB;padding:16px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#1F2937;margin-bottom:12px;"><i class="fas fa-user"></i> البيانات الشخصية</h4>
          ${inp("bkName", "الاسم الكامل", "اكتب اسمك", true)}
          ${inp("bkWhatsapp", "رقم الواتساب", "01xxxxxxxxx", true, "ltr", "تأكّد من كتابته بالأرقام الإنجليزية")}
          ${inp("bkEmail", "البريد الإلكتروني", "example@email.com", true, "ltr")}
          ${inp("bkTitle", "اللقب المفضّل (اختياري)", "أستاذ، مهندس، دكتور...")}
          ${inp("bkAge", "العمر (اختياري)", "", false, "", "", "number")}
          ${inp("bkCountry", "البلد (اختياري)", "مصر، السعودية...")}
          ${inp("bkCity", "المحافظة/المدينة (اختياري)", "")}
          ${inp("bkJob", "الوظيفة (اختياري)", "")}
          ${inp("bkSource", "كيف عرفت عنّا؟ (اختياري)", "")}
        </div>
        <div style="background:#F0FDF4;padding:16px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#065F46;margin-bottom:12px;"><i class="fas fa-info-circle"></i> معلومات إضافية</h4>
          ${txt("bkExpectations", "توقّعاتك من الدورة (اختياري)", 3)}
          ${inp("bkExperience", "خبرة سابقة في التطوير (اختياري)", "")}
          ${txt("bkNotes", "ملاحظات (اختياري)", 2)}
        </div>
        <div style="background:#FEF3C7;padding:16px;border-radius:10px;margin-bottom:8px;">
          <h4 style="color:#92400E;margin-bottom:10px;"><i class="fas fa-credit-card"></i> وسيلة الدفع <span style="color:red;">*</span></h4>
          ${payOpt("vodafone", "فودافون كاش")}
          ${payOpt("instapay", "انستاباي")}
          ${payOpt("bank", "تحويل بنكي")}
        </div>
        <div style="background:#EFF6FF;padding:11px;border-radius:10px;border-right:3px solid #3B82F6;">
          <p style="color:#1E40AF;margin:0;text-align:center;font-size:.9rem;"><i class="fas fa-lock"></i> بياناتك آمنة ومحميّة</p>
        </div>
      </div>`,
      showCancelButton: true, confirmButtonText: "✅ تأكيد الحجز", cancelButtonText: "رجوع",
      confirmButtonColor: "#4A8A5C", width: window.innerWidth <= 768 ? "95%" : "680px", allowOutsideClick: false,
      didOpen: () => document.getElementById("bkName")?.focus(),
      preConfirm: () => {
        const name = document.getElementById("bkName").value.trim();
        const wa = document.getElementById("bkWhatsapp").value.trim();
        const email = document.getElementById("bkEmail").value.trim();
        const pm = document.querySelectorAll('input[name="bkPay"]:checked');
        if (!name) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!wa) { Swal.showValidationMessage("اكتب رقم الواتساب"); return false; }
        if (!/^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{6,14}$/.test(wa.replace(/[\s\-()]/g, ""))) { Swal.showValidationMessage("رقم الواتساب مش صحيح"); return false; }
        if (!email) { Swal.showValidationMessage("اكتب بريدك الإلكتروني"); return false; }
        if (pm.length === 0) { Swal.showValidationMessage("اختر وسيلة دفع"); return false; }
        return true;
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      const pays = [];
      document.querySelectorAll('input[name="bkPay"]:checked').forEach((c) => pays.push(c.value));
      const booking = {
        bookingType: "individual",
        courseName: d.courseTitle,
        courseId: d.courseId,
        pricing: { basePriceNumber: d.basePrice, finalPriceNumber: d.finalPrice, finalPrice: `${d.finalPrice.toLocaleString("ar-EG")} ${cur}`, basePrice: `${d.basePrice.toLocaleString("ar-EG")} ${cur}` },
        totalSavings: d.savings,
        payment: { method: d.paymentLabel, installmentText: d.installmentText || "", methods: pays },
        coupon: d.coupon ? { ...d.coupon, applied: true } : { applied: false },
        customer: {
          name: val("bkName"), whatsapp: val("bkWhatsapp"), email: val("bkEmail"),
          title: val("bkTitle"), age: val("bkAge"), country: val("bkCountry"),
          city: val("bkCity"), job: val("bkJob"), source: val("bkSource"),
          expectations: val("bkExpectations"), experience: val("bkExperience"),
          notes: val("bkNotes"), paymentMethods: pays,
        },
      };
      saveAndGoTelegram(booking);
    });
  }

  /* ====================================================================
     استمارة المنحة الكاملة (3 اختيارات: تقسيط / جزئية / كاملة)
     ==================================================================== */
  function showGrantForm() {
    const d = collectCalc();
    const base = d.basePrice, finalP = d.finalPrice;
    const maxP = (CFG.grant && CFG.grant.maxDiscountPercent) || 50;
    Swal.fire({
      title: "🤲 طلب دعم مالي",
      html: `<div style="text-align:right;direction:rtl;max-height:62vh;overflow-y:auto;">
        <div style="background:rgba(74,138,92,.1);padding:16px;border-radius:10px;margin-bottom:16px;text-align:center;">
          <i class="fas fa-heart" style="font-size:2rem;color:#4A8A5C;"></i>
          <h4 style="color:#2E6940;margin:8px 0 0;">نؤمن أن المال لا يجب أن يكون عائقاً</h4>
        </div>
        <div style="background:#F9FAFB;padding:16px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#1F2937;margin-bottom:12px;"><i class="fas fa-user"></i> البيانات الشخصية</h4>
          ${inp("grName", "الاسم", "", true)}
          ${inp("grWhatsapp", "الواتساب", "", true, "ltr")}
          ${inp("grEmail", "الإيميل", "", true, "ltr")}
          ${inp("grCountry", "البلد (اختياري)", "")}
          ${inp("grCity", "المدينة (اختياري)", "")}
          ${inp("grJob", "الوظيفة (اختياري)", "")}
        </div>
        <div style="background:#FFF7ED;padding:16px;border-radius:10px;margin-bottom:14px;border-right:4px solid #F59E0B;">
          <h4 style="color:#7C2D12;margin-bottom:12px;"><i class="fas fa-book-open"></i> قصّتك</h4>
          ${txt("grReason", "لماذا تحتاج الدعم؟ *", 3)}
          ${txt("grChallenges", "التحديات التي تواجهها *", 3)}
          ${txt("grContribution", "كيف ستساهم في مجتمعك بعد التعلّم؟ (اختياري)", 2)}
        </div>
        <div style="background:#F3E8FF;padding:16px;border-radius:10px;margin-bottom:14px;">
          <h4 style="color:#581C87;margin-bottom:12px;"><i class="fas fa-hand-holding-heart"></i> الدعم المطلوب</h4>
          <div style="margin-bottom:12px;"><label style="font-weight:600;color:#6B21A8;">الوضع الوظيفي *</label>
            <select id="grEmployment" style="width:100%;padding:11px;border:2px solid #E9D5FF;border-radius:8px;background:#fff;color:#000;margin-top:5px;">
              <option value="">-- اختر --</option><option value="student">طالب</option><option value="employed">موظف</option>
              <option value="freelance">عمل حر</option><option value="unemployed">بدون عمل</option><option value="retired">متقاعد</option><option value="other">أخرى</option>
            </select></div>
          <label style="font-weight:600;color:#6B21A8;display:block;margin-bottom:8px;">نوع الدعم *</label>
          <div style="background:#fff;padding:14px;border-radius:8px;margin-bottom:8px;border:2px solid #E9D5FF;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;gap:8px;"><input type="radio" name="grType" value="installment" style="margin-top:4px;"><div style="flex:1;"><strong style="color:#581C87;">تقسيط مُيسّر</strong><p style="color:#6B7280;font-size:.85rem;margin:2px 0 0;">قسّم المبلغ على شهور أكتر</p>
              <div id="grInstBox" style="display:none;margin-top:10px;">
                <input type="range" id="grInstMonths" min="2" max="18" value="3" style="width:100%;" oninput="document.getElementById('grInstVal').textContent=this.value;document.getElementById('grInstMonthly').textContent=Math.ceil(${finalP}/this.value).toLocaleString('ar-EG')">
                <div style="text-align:center;padding:8px;background:#F3E8FF;border-radius:6px;color:#581C87;"><span id="grInstVal">3</span> أشهر × <strong id="grInstMonthly">${Math.ceil(finalP / 3).toLocaleString("ar-EG")}</strong> ${cur} شهرياً</div>
              </div></div></label>
          </div>
          <div style="background:#fff;padding:14px;border-radius:8px;margin-bottom:8px;border:2px solid #E9D5FF;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;gap:8px;"><input type="radio" name="grType" value="partial" style="margin-top:4px;"><div style="flex:1;"><strong style="color:#581C87;">منحة جزئية</strong><p style="color:#6B7280;font-size:.85rem;margin:2px 0 0;">خصم إضافي حسب إمكانياتك</p>
              <div id="grPartBox" style="display:none;margin-top:10px;">
                <input type="range" id="grPartPct" min="${100 - maxP}" max="90" value="50" style="width:100%;" oninput="document.getElementById('grPartVal').textContent=this.value;document.getElementById('grPartAmt').textContent=Math.round(${finalP}*this.value/100).toLocaleString('ar-EG')">
                <div style="text-align:center;padding:8px;background:#F3E8FF;border-radius:6px;color:#581C87;">تدفع <strong><span id="grPartVal">50</span>%</strong> = <strong id="grPartAmt">${Math.round(finalP * 0.5).toLocaleString("ar-EG")}</strong> ${cur}</div>
              </div></div></label>
          </div>
          <div style="background:#fff;padding:14px;border-radius:8px;border:2px solid #E9D5FF;">
            <label style="display:flex;align-items:flex-start;cursor:pointer;gap:8px;"><input type="radio" name="grType" value="full" style="margin-top:4px;"><div><strong style="color:#581C87;">منحة كاملة ١٠٠٪</strong><p style="color:#6B7280;font-size:.85rem;margin:2px 0 0;">لا أستطيع الدفع حالياً</p></div></label>
          </div>
        </div>
        <div style="background:#FEF2F2;padding:16px;border-radius:10px;margin-bottom:8px;">
          <h4 style="color:#991B1B;margin-bottom:10px;"><i class="fas fa-handshake"></i> التعهّدات</h4>
          <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:#000;margin-bottom:8px;"><input type="checkbox" id="grC1"> أتعهّد بالحضور الكامل واستثمار المحتوى</label>
          <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:#000;margin-bottom:8px;"><input type="checkbox" id="grC2"> أتعهّد بالمشاركة الفعّالة والتفاعل الجادّ</label>
          <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:#000;"><input type="checkbox" id="grC3"> المعلومات التي أدخلتها صحيحة وحقيقية</label>
        </div>
        <div style="background:#DCFCE7;padding:11px;border-radius:10px;border-right:3px solid #22C55E;"><p style="color:#14532D;margin:0;text-align:center;font-size:.9rem;"><i class="fas fa-clock"></i> سنراجع طلبك خلال ٢٤–٤٨ ساعة</p></div>
      </div>`,
      showCancelButton: true, confirmButtonText: "إرسال طلب الدعم", cancelButtonText: "رجوع",
      confirmButtonColor: "#4A8A5C", width: window.innerWidth <= 768 ? "95%" : "680px", allowOutsideClick: false,
      didOpen: () => {
        document.querySelectorAll('input[name="grType"]').forEach((r) => {
          r.addEventListener("change", () => {
            document.getElementById("grInstBox").style.display = r.value === "installment" && r.checked ? "block" : "none";
            document.getElementById("grPartBox").style.display = r.value === "partial" && r.checked ? "block" : "none";
          });
        });
      },
      preConfirm: () => {
        if (!val("grName")) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!val("grWhatsapp")) { Swal.showValidationMessage("اكتب الواتساب"); return false; }
        if (!val("grEmail")) { Swal.showValidationMessage("اكتب الإيميل"); return false; }
        if (!val("grReason")) { Swal.showValidationMessage("اشرح سبب طلب الدعم"); return false; }
        if (!val("grChallenges")) { Swal.showValidationMessage("اشرح التحديات التي تواجهها"); return false; }
        if (!val("grEmployment")) { Swal.showValidationMessage("حدّد وضعك الوظيفي"); return false; }
        if (!document.querySelector('input[name="grType"]:checked')) { Swal.showValidationMessage("اختر نوع الدعم"); return false; }
        if (!document.getElementById("grC1").checked || !document.getElementById("grC2").checked || !document.getElementById("grC3").checked) { Swal.showValidationMessage("يجب الموافقة على التعهّدات الثلاثة"); return false; }
        return true;
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      const type = document.querySelector('input[name="grType"]:checked').value;
      let supportDetails = {}, fpn = finalP, ts = base - finalP;
      if (type === "full") { fpn = 0; ts = base; supportDetails = { type: "full", discount: 100 }; }
      else if (type === "partial") {
        const pct = parseInt(document.getElementById("grPartPct").value);
        fpn = Math.round(finalP * pct / 100); ts = base - fpn;
        supportDetails = { type: "partial", percentage: pct, affordableAmount: fpn };
      } else {
        const months = parseInt(document.getElementById("grInstMonths").value);
        fpn = finalP; ts = base - finalP;
        supportDetails = { type: "installment", months, monthlyAmount: Math.ceil(finalP / months) };
      }
      const grant = {
        bookingType: "grant_request",
        courseName: d.courseTitle, courseId: d.courseId,
        coursePrice: base, salePrice: finalP,
        pricing: { basePriceNumber: base, finalPriceNumber: fpn, finalPrice: `${fpn.toLocaleString("ar-EG")} ${cur}` },
        totalSavings: ts,
        customer: { name: val("grName"), whatsapp: val("grWhatsapp"), email: val("grEmail"), country: val("grCountry"), city: val("grCity"), job: val("grJob") },
        grantDetails: {
          reason: val("grReason"), challenges: val("grChallenges"), communityContribution: val("grContribution"),
          financial: { employmentStatus: val("grEmployment") },
          supportType: type, supportDetails,
          commitments: { fullAttendance: true, activeParticipation: true, truthfulInfo: true },
        },
      };
      saveAndGoTelegram(grant);
    });
  }

  /* ====================================================================
     الحفظ في Firebase + الانتقال الأوتوماتيكي للتليجرام
     (الكود بينتقل تلقائياً — بدون "انسخ الكود")
     ==================================================================== */
  async function saveAndGoTelegram(data) {
    Swal.fire({ title: "جاري معالجة طلبك...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const fdb = ensureFirebase();
    data.timestamp = new Date().toISOString();
    data.bookingDate = new Date().toISOString();
    data.status = "pending";
    data.bookingId = "BK_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    data.telegramCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    data.automationEnabled = true;

    let saved = false;
    if (fdb) {
      try {
        const ref = await fdb.collection(CFG.firebase.bookingsCollection || "tempBookings").add(data);
        saved = true;
        const cp = data.coupon;
        if (cp && cp.isFirebase && cp.id) {
          try {
            await fdb.collection("coupons").doc(cp.id).update({
              used: firebase.firestore.FieldValue.increment(1),
              status: "used",
              usedAt: firebase.firestore.FieldValue.serverTimestamp(),
              bookingId: ref.id,
            });
          } catch (e) { console.warn("coupon update failed:", e); }
        }
      } catch (e) { console.error("Firebase save failed:", e); }
    }

    const botUrl = `https://t.me/${CFG.telegram.botUsername}?start=${data.telegramCode}`;
    const isGrant = data.bookingType === "grant_request";

    await Swal.fire({
      icon: "success",
      title: isGrant ? "🤲 استلمنا طلبك!" : "🎯 خطوة أخيرة لتأكيد حجزك",
      html: `<div style="text-align:center;direction:rtl;">
        <div style="background:linear-gradient(135deg,#FEF3C7,#FDE68A);padding:18px;border-radius:14px;margin:12px 0;">
          <p style="color:#78350F;font-size:1.05rem;line-height:1.8;margin:0;">شكراً لاختيارك الانضمام لرحلة <strong>${data.courseName}</strong> 🌟</p>
        </div>
        <div style="background:linear-gradient(135deg,#E0F2FE,#BAE6FD);padding:22px;border-radius:14px;margin:14px 0;border:2px solid #0EA5E9;">
          <h4 style="color:#0369A1;margin:0 0 10px;"><i class="fab fa-telegram"></i> ${isGrant ? "لمتابعة طلبك" : "لإتمام حجزك"}</h4>
          <p style="color:#1E293B;font-size:.96rem;line-height:1.8;margin:0;">اضغط الزر بالأسفل، وهتتنقل تلقائياً لبوت التليجرام ومعاك كود التأكيد جاهز — <strong>من غير ما تنسخ أو تكتب أي حاجة</strong>. كل اللي عليك هناك تضغط <strong>Start</strong> وتستنى الرد.</p>
        </div>
        ${saved ? "" : `<div style="background:#FEF2F2;padding:10px;border-radius:8px;margin-top:10px;"><p style="color:#991B1B;font-size:.85rem;margin:0;">لو ما اتفتحش التليجرام تلقائياً، راسلنا على الواتساب وهنكمّل معاك فوراً.</p></div>`}
      </div>`,
      confirmButtonText: isGrant ? "📲 متابعة عبر التليجرام" : "🚀 إتمام الحجز عبر التليجرام",
      confirmButtonColor: "#0EA5E9", allowOutsideClick: false,
    }).then((r) => { if (r.isConfirmed) window.open(botUrl, "_blank"); });
  }

  /* ── HTML helpers للاستمارات ── */
  function inp(id, label, ph, req, dir, hint, type) {
    return `<div style="margin-bottom:11px;"><label style="display:block;margin-bottom:4px;color:#374151;font-weight:600;font-size:.92rem;">${label} ${req ? '<span style="color:red;">*</span>' : ""}</label>
      <input type="${type || "text"}" id="${id}" placeholder="${ph || ""}" style="width:100%;padding:10px;border:2px solid #E5E7EB;border-radius:8px;color:#000;background:#fff;${dir ? "direction:" + dir + ";" : ""}">
      ${hint ? `<small style="color:#6B7280;font-size:.78rem;">${hint}</small>` : ""}</div>`;
  }
  function txt(id, label, rows) {
    return `<div style="margin-bottom:11px;"><label style="display:block;margin-bottom:4px;color:#374151;font-weight:600;font-size:.92rem;">${label}</label>
      <textarea id="${id}" rows="${rows || 2}" style="width:100%;padding:10px;border:2px solid #E5E7EB;border-radius:8px;resize:none;color:#000;background:#fff;"></textarea></div>`;
  }
  function payOpt(v, l) {
    return `<label style="display:flex;align-items:center;padding:10px;background:#fff;border:2px solid #E5E7EB;border-radius:8px;cursor:pointer;margin-bottom:6px;"><input type="checkbox" name="bkPay" value="${v}" style="margin-left:10px;width:17px;height:17px;"><strong style="color:#000;">${l}</strong></label>`;
  }
  function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }

  /* ====================================================================
     التهيئة
     ==================================================================== */
  function init() {
    renderOffers();
    renderPaymentCards();
    renderActiveOfferBadge();
    calculate();

    document.getElementById("applyCouponCalc")?.addEventListener("click", applyCoupon);
    document.getElementById("calcBookBtn")?.addEventListener("click", showBookingForm);
    if (CFG.grant && CFG.grant.enabled) {
      const g = document.getElementById("calcGrantBtn");
      const sm = document.getElementById("calcSupportMessage");
      if (g) { g.style.display = "block"; g.addEventListener("click", showGrantForm); }
      if (sm) sm.style.display = "block";
    } else document.getElementById("calcGrantBtn")?.remove();

    const offer = getActiveTimeOffer();
    const hb = document.getElementById("heroOfferBadge");
    if (offer && hb) {
      hb.style.display = "inline-flex";
      hb.querySelector("[data-offer-name]").textContent = offer.name;
      hb.querySelector("[data-offer-pct]").textContent = `${offer.percentage}%`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
