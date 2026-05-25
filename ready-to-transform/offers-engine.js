/* ============================================================================
   🧮  محرّك الحاسبة الذكية واستلام الحجوزات — دورة "جاهز للتحوّل"
   ============================================================================
   ⚠️  مش محتاج تعدّل في الملف ده. كل التحكم في offers-config.js
   ============================================================================ */

(function () {
  "use strict";

  const CFG = window.COURSE_CONFIG;
  if (!CFG) {
    console.error("⚠️ ملف offers-config.js مش متحمّل. تأكد إنه قبل ملف الحاسبة.");
    return;
  }

  const fmt = (n) => Math.round(n / 10) * 10;
  const arNum = (n) => fmt(n).toLocaleString("ar-EG");
  const cur = CFG.course.currency;

  /* ── تحديد العرض الزمني النشط ── */
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

  const state = {
    payment: "cash",      // cash | full | plan_0 | plan_1 ...
    coupon: null,
    lastCalc: null,
  };

  /* ====================================================================
     عرض بطاقات العروض النشطة (السيكشن الترويجي)
     ==================================================================== */
  function renderOffers() {
    const container = document.querySelector("#offers-render");
    if (!container) return;

    const base = CFG.course.basePrice;
    const offer = getActiveTimeOffer();
    let html = "";

    /* البطاقة الرئيسية — السعر */
    if (offer) {
      const finalP = fmt(base - base * offer.percentage / 100);
      const savings = fmt(base - finalP);
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card urgent">
          <span class="offer-badge urgent pulse">${offer.name}</span>
          <div class="offer-header">
            <h4>استثمارك في الرحلة</h4><i class="fas fa-fire offer-icon"></i>
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
          <span class="offer-badge">الاستثمار في الرحلة</span>
          <div class="offer-header"><h4>الاستثمار في الدورة</h4><i class="fas fa-graduation-cap offer-icon"></i></div>
          <div class="price-display"><div class="price-current solo"><span class="price-number">${arNum(base)}</span><span class="price-currency">${cur}</span></div></div>
        </div>
      </div>`;
    }

    /* صف ثانٍ — الدفع الكامل + الأقساط */
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

  /* ── العدّاد التنازلي ── */
  function startCountdown(endDate) {
    const el = document.getElementById("offerTimer");
    if (!el) return;
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    function tick() {
      const diff = end - new Date();
      if (diff <= 0) { el.innerHTML = `<div class="timer-item"><span>انتهى</span></div>`; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor(diff % 86400000 / 3600000);
      const m = Math.floor(diff % 3600000 / 60000);
      const s = Math.floor(diff % 60000 / 1000);
      el.innerHTML =
        `<div class="timer-item"><span>${d}</span><span class="label">يوم</span></div>
         <div class="timer-item"><span>${h}</span><span class="label">ساعة</span></div>
         <div class="timer-item"><span>${m}</span><span class="label">دقيقة</span></div>
         <div class="timer-item"><span>${s}</span><span class="label">ثانية</span></div>`;
      setTimeout(tick, 1000);
    }
    tick();
  }

  /* ====================================================================
     الحاسبة الذكية
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

    /* تفاصيل التقسيط */
    const det = document.getElementById("calcInstallmentDetails");
    if (state.payment.startsWith("plan_")) {
      const plan = CFG.paymentPlans[parseInt(state.payment.split("_")[1])];
      if (plan) {
        document.getElementById("calcInstallmentPlan").textContent = installmentText(final, plan);
        det.style.display = "block";
      }
    } else det.style.display = "none";

    /* التوفير */
    const savings = base - final;
    const sv = document.getElementById("calcSavings");
    if (savings > 0) {
      sv.style.display = "block";
      document.getElementById("calcSavingsAmount").textContent = arNum(savings);
    } else sv.style.display = "none";
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

  /* ── أكواد الخصم ── */
  function applyCoupon() {
    const input = document.getElementById("calcCoupon");
    const code = input.value.trim().toUpperCase();
    if (!code) { swal("warning", "كود فارغ", "اكتب كود الخصم الأول"); return; }
    const found = (CFG.coupons || []).find((c) => c.code.toUpperCase() === code);
    if (!found) { swal("error", "كود غير صحيح", "تأكد من الكود وحاول تاني"); return; }
    state.coupon = { code: found.code, type: found.type, value: found.value };
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
      `<div style="background:rgba(74,138,92,.08);border:1px solid var(--sage);padding:10px;border-radius:8px;color:var(--sage-bright);margin-top:10px;"><i class="fas fa-check-circle"></i> الكود <strong>${found.code}</strong> مُفعّل ${found.type === "percentage" ? `(خصم ${found.value}%)` : `(خصم ${found.value} ${cur})`}</div>`;
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

  /* helper Swal */
  function swal(icon, title, text, timer) {
    const opts = { icon, title, confirmButtonColor: "#4A8A5C" };
    if (text) opts.text = text;
    if (timer) { opts.timer = timer; opts.showConfirmButton = false; }
    Swal.fire(opts);
  }

  /* ====================================================================
     جمع بيانات الحجز
     ==================================================================== */
  function collectData() {
    const c = state.lastCalc || { base: CFG.course.basePrice, final: CFG.course.basePrice, discounts: [], payment: "full" };
    let paymentLabel = "دفعة واحدة";
    if (c.payment.startsWith("plan_")) paymentLabel = CFG.paymentPlans[parseInt(c.payment.split("_")[1])].name;
    let instText = "";
    if (c.payment.startsWith("plan_")) instText = installmentText(c.final, CFG.paymentPlans[parseInt(c.payment.split("_")[1])]);
    return {
      courseTitle: CFG.course.title,
      basePrice: c.base,
      finalPrice: c.final,
      savings: c.base - c.final,
      paymentLabel,
      installmentText: instText,
      coupon: state.coupon ? state.coupon.code : null,
      currency: cur,
    };
  }

  /* ====================================================================
     استمارة الحجز
     ==================================================================== */
  function showBookingForm() {
    const d = collectData();
    Swal.fire({
      title: "📋 إتمام الحجز",
      html: bookingFormHTML(d),
      showCancelButton: true,
      confirmButtonText: "✅ تأكيد الحجز",
      cancelButtonText: "رجوع",
      confirmButtonColor: "#4A8A5C",
      width: window.innerWidth <= 768 ? "95%" : "640px",
      allowOutsideClick: false,
      didOpen: () => document.getElementById("bkName")?.focus(),
      preConfirm: () => {
        const name = document.getElementById("bkName").value.trim();
        const wa = document.getElementById("bkWhatsapp").value.trim();
        const pm = document.querySelectorAll('input[name="bkPay"]:checked');
        if (!name) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!wa) { Swal.showValidationMessage("اكتب رقم الواتساب"); return false; }
        if (!/^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{6,14}$/.test(wa.replace(/[\s\-()]/g, ""))) {
          Swal.showValidationMessage("رقم الواتساب مش صحيح"); return false;
        }
        if (pm.length === 0) { Swal.showValidationMessage("اختر وسيلة الدفع"); return false; }
        return true;
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      const pays = [];
      document.querySelectorAll('input[name="bkPay"]:checked').forEach((c) => pays.push(c.value));
      const customer = {
        name: document.getElementById("bkName").value.trim(),
        whatsapp: document.getElementById("bkWhatsapp").value.trim(),
        email: document.getElementById("bkEmail").value.trim(),
        city: document.getElementById("bkCity").value.trim(),
        notes: document.getElementById("bkNotes").value.trim(),
        payMethods: pays,
      };
      submitBooking(d, customer, "booking");
    });
  }

  function bookingFormHTML(d) {
    const payLine = d.installmentText ? `${d.paymentLabel} — ${d.installmentText}` : d.paymentLabel;
    return `<div style="text-align:right;direction:rtl;">
      <div style="background:linear-gradient(135deg,#4A8A5C,#2E6940);padding:14px;border-radius:10px;margin-bottom:16px;color:#fff;">
        <h4 style="margin:0;font-family:Amiri,serif;">${d.courseTitle}</h4>
        <p style="margin:8px 0 2px;">المبلغ المطلوب: <strong style="font-size:1.2rem;">${d.finalPrice.toLocaleString("ar-EG")} ${d.currency}</strong></p>
        <p style="margin:0;font-size:.85rem;opacity:.9;">${payLine}</p>
      </div>
      ${field("bkName", "الاسم الكامل", "اكتب اسمك", true)}
      ${field("bkWhatsapp", "رقم الواتساب", "01xxxxxxxxx", true, "ltr")}
      ${field("bkEmail", "البريد الإلكتروني (اختياري)", "example@email.com", false, "ltr")}
      ${field("bkCity", "المدينة (اختياري)", "")}
      <div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:#374151;">ملاحظات (اختياري)</label>
        <textarea id="bkNotes" rows="2" style="width:100%;padding:10px;border:2px solid #E5E7EB;border-radius:8px;resize:none;color:#000;background:#fff;"></textarea></div>
      <div style="background:#FEF3C7;padding:14px;border-radius:10px;margin-bottom:6px;">
        <strong style="color:#92400E;display:block;margin-bottom:8px;">وسيلة الدفع *</strong>
        ${payOpt("vodafone", "فودافون كاش")}
        ${payOpt("instapay", "انستاباي")}
        ${payOpt("bank", "تحويل بنكي")}
      </div>
    </div>`;
  }

  function field(id, label, ph, req, dir) {
    return `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:#374151;font-weight:600;">${label} ${req ? '<span style="color:red;">*</span>' : ""}</label>
      <input type="text" id="${id}" placeholder="${ph}" style="width:100%;padding:11px;border:2px solid #E5E7EB;border-radius:8px;color:#000;background:#fff;${dir ? "direction:" + dir + ";" : ""}"></div>`;
  }
  function payOpt(val, label) {
    return `<label style="display:flex;align-items:center;padding:10px;background:#fff;border:2px solid #E5E7EB;border-radius:8px;cursor:pointer;margin-bottom:6px;"><input type="checkbox" name="bkPay" value="${val}" style="margin-left:10px;width:17px;height:17px;"><strong style="color:#000;">${label}</strong></label>`;
  }

  /* ====================================================================
     استمارة المنحة
     ==================================================================== */
  function showGrantForm() {
    const d = collectData();
    const maxP = CFG.grant.maxDiscountPercent || 50;
    Swal.fire({
      title: "🤲 طلب دعم مالي",
      html: `<div style="text-align:right;direction:rtl;max-height:60vh;overflow-y:auto;">
        <div style="background:rgba(74,138,92,.1);padding:16px;border-radius:10px;margin-bottom:16px;text-align:center;">
          <i class="fas fa-heart" style="font-size:2rem;color:#4A8A5C;"></i>
          <h4 style="color:#2E6940;margin:8px 0 0;">المال مش لازم يكون عائق</h4>
        </div>
        ${field("grName", "الاسم", "", true)}
        ${field("grWhatsapp", "الواتساب", "", true, "ltr")}
        ${field("grEmail", "الإيميل (اختياري)", "", false, "ltr")}
        <div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:#374151;font-weight:600;">ليه محتاج الدعم؟ <span style="color:red;">*</span></label>
          <textarea id="grReason" rows="3" style="width:100%;padding:10px;border:2px solid #E5E7EB;border-radius:8px;resize:none;color:#000;background:#fff;"></textarea></div>
        <div style="background:#F3E8FF;padding:16px;border-radius:10px;margin-bottom:12px;">
          <label style="font-weight:600;color:#6B21A8;display:block;margin-bottom:10px;">نوع الدعم المطلوب *</label>
          ${grantOpt("partial", "منحة جزئية — أقدر أدفع جزء")}
          ${grantOpt("installment", "تقسيط مُيسّر على شهور أكتر")}
          ${grantOpt("full", "منحة كاملة — مش قادر أدفع حالياً")}
          <div id="grPartialBox" style="display:none;margin-top:12px;background:#fff;padding:12px;border-radius:8px;">
            <label style="color:#6B21A8;font-size:.9rem;">النسبة اللي تقدر تدفعها:</label>
            <input type="range" id="grSlider" min="${100 - maxP}" max="90" value="50" style="width:100%;margin:8px 0;" oninput="document.getElementById('grSliderVal').textContent=this.value">
            <div style="text-align:center;color:#2E6940;font-weight:700;">تدفع <span id="grSliderVal">50</span>% من المبلغ</div>
          </div>
        </div>
        <div style="background:#FEF2F2;padding:14px;border-radius:10px;">
          <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:#000;"><input type="checkbox" id="grCommit"> أتعهّد بالحضور الكامل والمشاركة الجادّة، والبيانات دي صحيحة.</label>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "إرسال الطلب",
      cancelButtonText: "رجوع",
      confirmButtonColor: "#4A8A5C",
      width: window.innerWidth <= 768 ? "95%" : "640px",
      allowOutsideClick: false,
      didOpen: () => {
        document.querySelectorAll('input[name="grType"]').forEach((r) => {
          r.addEventListener("change", () => {
            document.getElementById("grPartialBox").style.display = r.value === "partial" && r.checked ? "block" : "none";
          });
        });
      },
      preConfirm: () => {
        if (!document.getElementById("grName").value.trim()) { Swal.showValidationMessage("اكتب اسمك"); return false; }
        if (!document.getElementById("grWhatsapp").value.trim()) { Swal.showValidationMessage("اكتب الواتساب"); return false; }
        if (!document.getElementById("grReason").value.trim()) { Swal.showValidationMessage("اشرح سبب الطلب"); return false; }
        if (!document.querySelector('input[name="grType"]:checked')) { Swal.showValidationMessage("اختر نوع الدعم"); return false; }
        if (!document.getElementById("grCommit").checked) { Swal.showValidationMessage("لازم توافق على التعهّد"); return false; }
        return true;
      },
    }).then((res) => {
      if (!res.isConfirmed) return;
      const type = document.querySelector('input[name="grType"]:checked').value;
      const customer = {
        name: document.getElementById("grName").value.trim(),
        whatsapp: document.getElementById("grWhatsapp").value.trim(),
        email: document.getElementById("grEmail").value.trim(),
        reason: document.getElementById("grReason").value.trim(),
        grantType: type === "partial" ? `منحة جزئية (يدفع ${document.getElementById("grSlider").value}%)` : type === "installment" ? "تقسيط مُيسّر" : "منحة كاملة",
      };
      submitBooking(d, customer, "grant");
    });
  }
  function grantOpt(val, label) {
    return `<label style="display:flex;align-items:flex-start;padding:10px;background:#fff;border:2px solid #E9D5FF;border-radius:8px;cursor:pointer;margin-bottom:6px;"><input type="radio" name="grType" value="${val}" style="margin-left:10px;margin-top:3px;"><strong style="color:#000;">${label}</strong></label>`;
  }

  /* ====================================================================
     إرسال الحجز (واتساب / جوجل فورم / الاتنين)
     ==================================================================== */
  function submitBooking(d, customer, kind) {
    const b = CFG.booking;
    const payNames = { vodafone: "فودافون كاش", instapay: "انستاباي", bank: "تحويل بنكي" };

    /* بناء رسالة الواتساب */
    let msg = "";
    if (kind === "grant") {
      msg = `🤲 *طلب دعم مالي — ${d.courseTitle}*\n\n`;
      msg += `👤 الاسم: ${customer.name}\n📱 واتساب: ${customer.whatsapp}\n`;
      if (customer.email) msg += `📧 إيميل: ${customer.email}\n`;
      msg += `\n💬 سبب الطلب: ${customer.reason}\n`;
      msg += `🎯 نوع الدعم: ${customer.grantType}\n`;
      msg += `\n💰 السعر الأساسي: ${d.basePrice.toLocaleString("ar-EG")} ${d.currency}`;
    } else {
      msg = `🎯 *حجز جديد — ${d.courseTitle}*\n\n`;
      msg += `👤 الاسم: ${customer.name}\n📱 واتساب: ${customer.whatsapp}\n`;
      if (customer.email) msg += `📧 إيميل: ${customer.email}\n`;
      if (customer.city) msg += `🏙️ المدينة: ${customer.city}\n`;
      msg += `\n💳 طريقة الدفع: ${d.paymentLabel}\n`;
      if (d.installmentText) msg += `📅 ${d.installmentText}\n`;
      msg += `\n💰 السعر الأساسي: ${d.basePrice.toLocaleString("ar-EG")} ${d.currency}\n`;
      if (d.savings > 0) msg += `🎁 التوفير: ${d.savings.toLocaleString("ar-EG")} ${d.currency}\n`;
      msg += `✅ *المبلغ المطلوب: ${d.finalPrice.toLocaleString("ar-EG")} ${d.currency}*\n`;
      if (d.coupon) msg += `🏷️ كود الخصم: ${d.coupon}\n`;
      msg += `\n💵 وسيلة الدفع المختارة: ${customer.payMethods.map((p) => payNames[p] || p).join("، ")}`;
      if (customer.notes) msg += `\n📝 ملاحظات: ${customer.notes}`;
    }

    /* جوجل فورم في الخلفية */
    if ((b.method === "googleform" || b.method === "both") && b.googleForm && b.googleForm.formId) {
      sendToGoogleForm(b.googleForm, d, customer);
    }

    /* واتساب */
    if (b.method === "whatsapp" || b.method === "both") {
      const url = `https://wa.me/${b.whatsappNumber}?text=${encodeURIComponent(msg)}`;
      Swal.fire({
        icon: "success",
        title: kind === "grant" ? "🤲 جاهز نراجع طلبك!" : "🎯 أنت على بُعد خطوة!",
        html: `<p style="line-height:1.9;color:#374151;">${kind === "grant" ? "اضغط الزر لإرسال طلبك عبر الواتساب، وهنراجعه ونتواصل معاك خلال ٢٤–٤٨ ساعة." : "اضغط الزر عشان تبعت تفاصيل حجزك على الواتساب، ونكمّل معاك إجراءات الدفع والوصول للمحتوى فوراً."}</p>`,
        confirmButtonText: "📲 إرسال عبر الواتساب",
        confirmButtonColor: "#25D366",
        allowOutsideClick: false,
      }).then((r) => { if (r.isConfirmed) window.open(url, "_blank"); });
    } else {
      Swal.fire({ icon: "success", title: "تم استلام طلبك ✅", text: "هنتواصل معاك قريباً.", confirmButtonColor: "#4A8A5C" });
    }
  }

  function sendToGoogleForm(gf, d, customer) {
    try {
      const fd = new FormData();
      const e = gf.entries;
      if (e.name) fd.append(e.name, customer.name);
      if (e.whatsapp) fd.append(e.whatsapp, customer.whatsapp);
      if (e.email) fd.append(e.email, customer.email || "");
      if (e.payment) fd.append(e.payment, (customer.payMethods || []).join(", ") || customer.grantType || "");
      if (e.plan) fd.append(e.plan, d.paymentLabel);
      if (e.amount) fd.append(e.amount, String(d.finalPrice));
      fetch(`https://docs.google.com/forms/d/e/${gf.formId}/formResponse`, {
        method: "POST", mode: "no-cors", body: fd,
      });
    } catch (err) { console.warn("Google Form submit skipped:", err); }
  }

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
    } else {
      document.getElementById("calcGrantBtn")?.remove();
    }

    /* عدّاد تنازلي في الـ hero لو فيه عرض */
    const offer = getActiveTimeOffer();
    const heroBadge = document.getElementById("heroOfferBadge");
    if (offer && heroBadge) {
      heroBadge.style.display = "inline-flex";
      heroBadge.querySelector("[data-offer-name]").textContent = offer.name;
      heroBadge.querySelector("[data-offer-pct]").textContent = `${offer.percentage}%`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();

})();
