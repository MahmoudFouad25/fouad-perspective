/* ============================================================================
   🧮  محرّك العروض + الحاسبة + الحجوزات + الكوبونات — رحلة "Insight Out"
   ============================================================================
   ✅ الأسعار والعرض: محلية (insight-config.js) — موديل: سعر أصلي + سعر عرض ثابت
   ✅ الكوبونات: Firebase أولاً (collection: coupons)، احتياطي محلي
   ✅ الحجوزات: Firebase (collection: tempBookings) → تليجرام بوت تلقائياً
   ✅ المنح والدعم: Firebase (نفس مسار الحجز، bookingType: grant_request)
   ✅ ٣ باقات (المعرفة / العزم / الكاملة)

   ⚠️ عقد البيانات مع Firebase مطابق تماماً لنظام الحضن الدافئ:
      - نفس المشروع (fouad-perspective)
      - نفس الـ collections: tempBookings + coupons
      - نفس بنية السجل (courseId يميّز الرحلة)
      عشان صفحة الأدمن تستقبل طلبات الرحلة دي زي ما هي.

   ⚠️ مش محتاج تعدّل في الملف ده. كل التحكم في insight-config.js
   ============================================================================ */

(function () {
  "use strict";

  const CFG = window.COURSE_CONFIG;
  if (!CFG) {
    console.error("⚠️ ملف insight-config.js مش متحمّل. تأكد إنه قبل ملف المحرّك.");
    return;
  }

  /* ── ثيم النوافذ (SweetAlert) — متناسق مع هوية الصفحة العميقة ── */
  const C = {
    deep:   "#0E1D24",
    panel:  "#122831",
    raised: "#17323D",
    line:   "#26424B",
    text:   "#E8F1F2",
    text2:  "#B9CDD0",
    muted:  "#7F979C",
    clarity:"#57D2C4",
    clarityDeep:"#2FA99B",
    gold:   "#E5B567",
    goldDeep:"#C8924A",
    danger: "#E07A6A",
    inputBg:"#0B171C",
  };

  /* ── helpers ── */
  const fmt = (n) => Math.round(n / 10) * 10;
  const arNum = (n) => fmt(n).toLocaleString("ar-EG");
  const cur = CFG.course.currency;
  const ARABIC_DIGITS = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  function arDigitsToEn(s) { let r = String(s); ARABIC_DIGITS.forEach((a,i)=>{r=r.replace(new RegExp(a,"g"),i);}); return r; }

  /* =========================================================================
     1) Firebase init (نفس إعداد النظام الأصلي — project: fouad-perspective)
        ⚠️ مطابق تماماً عشان الكوبونات والحجوزات تروح لنفس المكان
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
    payment: "cash",
    coupon: null,
    lastCalc: null,
  };
  let cdTimer = null;

  function getPack() { return CFG.packages[state.pack]; }
  function getBase() { return getPack().basePrice; }

  /* ── موديل العرض: سعر أصلي (origPrice) + سعر عرض (basePrice) ── */
  function launchActive() {
    const o = CFG.launchOffer;
    if (!o || !o.enabled) return false;
    if (o.endDate) {
      const e = new Date(o.endDate); e.setHours(23, 59, 59, 999);
      if (new Date() > e) return false;
    }
    return true;
  }
  function packOrig(id) {
    const p = CFG.packages[id];
    return (p && p.origPrice && p.origPrice > p.basePrice) ? p.origPrice : null;
  }
  function packSaving(id) {
    if (!launchActive()) return 0;
    const o = packOrig(id);
    return o ? (o - CFG.packages[id].basePrice) : 0;
  }
  function packPct(id) {
    const o = packOrig(id);
    if (!o || !launchActive()) return 0;
    return Math.round((o - CFG.packages[id].basePrice) / o * 100);
  }
  function anchorOf(id) {
    return (launchActive() && packOrig(id)) ? packOrig(id) : CFG.packages[id].basePrice;
  }

  /* =========================================================================
     3) بطاقات العروض (السيكشن الترويجي) — حسب الباقة المختارة
     ========================================================================= */
  function renderOffers() {
    const container = document.querySelector("#offers-render");
    if (!container) return;

    const id = state.pack;
    const pk = getPack();
    const orig = packOrig(id);
    const live = launchActive() && orig;
    let html = "";

    if (live) {
      const finalP = fmt(pk.basePrice);
      const savings = fmt(orig - pk.basePrice);
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card urgent">
          <span class="offer-badge urgent pulse">${CFG.launchOffer.name}</span>
          <div class="offer-header">
            <h4>استثمارك في ${pk.shortName}</h4><i class="fas fa-compass offer-icon"></i>
          </div>
          <div class="price-display">
            <div class="price-original">${arNum(orig)} ${cur}</div>
            <div class="price-current"><span class="price-number">${arNum(finalP)}</span><span class="price-currency">${cur}</span></div>
            <div class="savings-badge">وفّرت ${arNum(savings)} ${cur}</div>
          </div>
          <div class="time-offer-details">
            <div class="discount-circle"><span class="percentage">${packPct(id)}%</span><span class="label">خصم</span></div>
            <div class="dates">
              <div class="date-row"><i class="fas fa-users"></i><span>${CFG.seatsLimit || 15} مقعد بس</span></div>
              <div class="date-row"><i class="fas fa-stop"></i><span>العرض لحد ${new Date(CFG.launchOffer.endDate).toLocaleDateString("ar-EG")}</span></div>
            </div>
          </div>
          ${CFG.launchOffer.showCountdown ? `<div class="offer-timer" id="offerTimer"></div>` : ``}
          <div class="active-until"><i class="fas fa-bolt"></i><span>العرض والمقاعد محدودة — اقتنص مكانك</span></div>
        </div>
      </div>`;
    } else {
      html += `
      <div class="offers-row primary-offer-row">
        <div class="offer-card price-card">
          <span class="offer-badge">الاستثمار في ${pk.shortName}</span>
          <div class="offer-header"><h4>الاستثمار في الرحلة</h4><i class="fas fa-compass offer-icon"></i></div>
          <div class="price-display"><div class="price-current solo"><span class="price-number">${arNum(pk.basePrice)}</span><span class="price-currency">${cur}</span></div></div>
        </div>
      </div>`;
    }

    const priceForExtras = pk.basePrice;
    let secondRow = "";

    if (CFG.cashDiscount && CFG.cashDiscount.enabled) {
      const cashFinal = fmt(priceForExtras - priceForExtras * CFG.cashDiscount.percentage / 100);
      secondRow += `
      <div class="offer-card cash-card active">
        <span class="offer-badge cash">دفع كامل</span>
        <div class="offer-header"><h4>الدفع الكامل</h4><i class="fas fa-circle-check offer-icon"></i></div>
        <div class="cash-details">
          <div class="discount-percentage"><span class="big-number">${CFG.cashDiscount.percentage}%</span><span class="label">خصم إضافي</span></div>
          <div class="cash-price"><span class="instead-of">بدلاً من ${arNum(priceForExtras)} ${cur}</span><span class="final-price">${arNum(cashFinal)} ${cur}</span></div>
          <div class="offer-extra-info"><i class="fas fa-check-circle"></i>تأكيد فوري ومكان محجوز</div>
        </div>
      </div>`;
    }

    if (CFG.paymentPlans && CFG.paymentPlans.length) {
      let plansHTML = "";
      CFG.paymentPlans.slice(0, 3).forEach((plan, idx) => {
        const inst = plan.installments || 3;
        const fp = plan.firstPaymentPercent || 0;
        if (fp > 0) {
          const first = fmt(priceForExtras * fp / 100);
          const monthly = fmt((priceForExtras - first) / (inst - 1));
          plansHTML += `<div class="plan-item${idx === 0 ? " highlight" : ""}"><div class="plan-name">${plan.name}</div><div class="plan-details"><span class="first-payment">${arNum(first)} ${cur}</span><span>+ ${inst - 1} × </span><span class="monthly">${arNum(monthly)}</span><span>${cur}</span></div></div>`;
        } else {
          const monthly = fmt(priceForExtras / inst);
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

    if (live && CFG.launchOffer.showCountdown) startCountdown(CFG.launchOffer.endDate);
  }

  function startCountdown(endDate) {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    const el = document.getElementById("offerTimer");
    if (!el) return;
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    function tick() {
      const liveEl = document.getElementById("offerTimer");
      if (!liveEl) { clearInterval(cdTimer); cdTimer = null; return; }
      const diff = end - new Date();
      if (diff <= 0) { liveEl.innerHTML = `<div class="timer-item"><span>انتهى</span></div>`; clearInterval(cdTimer); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor(diff % 86400000 / 3600000);
      const m = Math.floor(diff % 3600000 / 60000);
      const s = Math.floor(diff % 60000 / 1000);
      liveEl.innerHTML =
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
    Object.keys(CFG.packages).forEach((id) => {
      const el = document.querySelector(`[data-pack-price="${id}"]`);
      if (!el) return;
      const p = CFG.packages[id];
      const orig = packOrig(id);
      if (launchActive() && orig) {
        el.innerHTML = `<span class="pc-strike">${arNum(orig)} ${cur}</span><span class="pc-now">${arNum(p.basePrice)} <small>${cur}</small></span><span class="pc-save">وفّرت ${arNum(orig - p.basePrice)} ${cur} بـ${CFG.launchOffer.name}</span>`;
      } else {
        el.innerHTML = `<span class="pc-now">${arNum(p.basePrice)} <small>${cur}</small></span>`;
      }
    });
  }

  /* =========================================================================
     5) أزرار اختيار الباقة (pills) داخل الحاسبة — اختياري
     ========================================================================= */
  function renderPackPills() {
    const c = document.getElementById("calcPackPills");
    if (!c) return;
    c.innerHTML = Object.keys(CFG.packages).map((id) => {
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
      html += `<div class="payment-card active" data-payment="cash"><i class="fas fa-circle-check"></i><h6>دفعة واحدة</h6><small>خصم ${CFG.cashDiscount.percentage}%</small></div>`;
    } else {
      html += `<div class="payment-card active" data-payment="cash"><i class="fas fa-circle-check"></i><h6>دفعة واحدة</h6></div>`;
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
    if (launchActive() && packOrig(state.pack)) {
      sec.style.display = "block";
      document.getElementById("activeOfferName").textContent = CFG.launchOffer.name;
      document.getElementById("activeOfferDiscount").textContent = `خصم ${packPct(state.pack)}%`;
    } else sec.style.display = "none";
  }

  function calculate() {
    const id = state.pack;
    const pk = getPack();
    const anchor = anchorOf(id);
    let price = anchor;
    const discounts = [];

    const ls = packSaving(id);
    if (ls > 0) {
      price -= ls;
      discounts.push({ type: "time", amount: ls, name: CFG.launchOffer.name });
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

    updateDisplay(anchor, price, discounts);
    state.lastCalc = { base: fmt(anchor), final: fmt(price), discounts, payment: state.payment };
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
    if (det) {
      if (state.payment.startsWith("plan_")) {
        const plan = CFG.paymentPlans[parseInt(state.payment.split("_")[1])];
        if (plan) {
          document.getElementById("calcInstallmentPlan").textContent = installmentText(final, plan);
          det.style.display = "block";
        }
      } else det.style.display = "none";
    }

    const savings = base - final;
    const sv = document.getElementById("calcSavings");
    if (sv) {
      if (savings > 0) {
        sv.style.display = "block";
        document.getElementById("calcSavingsAmount").textContent = arNum(savings);
      } else sv.style.display = "none";
    }

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
    input.style.background = "rgba(87,210,196,.10)";
    input.style.borderColor = C.clarity;
    document.getElementById("applyCouponCalc").style.display = "none";

    if (!document.querySelector(".coupon-remove-btn")) {
      const btn = document.createElement("button");
      btn.className = "coupon-remove-btn";
      btn.innerHTML = '<i class="fas fa-times"></i> إزالة';
      btn.style.cssText = `background:${C.danger};color:#0A1419;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;margin-right:10px;font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:600;`;
      btn.onclick = removeCoupon;
      input.parentElement.appendChild(btn);
    }
    document.getElementById("calcCouponMessage").innerHTML =
      `<div style="background:rgba(87,210,196,.10);border:1px solid ${C.clarityDeep};padding:10px;border-radius:8px;color:${C.clarity};margin-top:10px;"><i class="fas fa-check-circle"></i> الكود <strong>${validCoupon.code}</strong> مُفعّل ${validCoupon.type === "percentage" ? `(خصم ${validCoupon.value}%)` : `(خصم ${validCoupon.value} ${cur})`}</div>`;
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
    const opts = { icon, title, confirmButtonColor: C.clarityDeep };
    if (text) opts.text = text;
    if (timer) { opts.timer = timer; opts.showConfirmButton = false; }
    Swal.fire(opts);
  }

  /* =========================================================================
     8) جمع بيانات الحجز (بتشمل الباقة المختارة)
     ========================================================================= */
  function collectData() {
    const c = state.lastCalc || { base: anchorOf(state.pack), final: getBase(), discounts: [], payment: "cash" };
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
      modules: pk.modules || null,
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

  /* helpers لبناء الحقول (مثيّمة داكنة) */
  function field(id, label, ph, req, dir, hint, type) {
    const t = type || "text";
    const h = hint ? `<small style="color:${C.muted};display:block;margin-top:3px;">${hint}</small>` : "";
    return `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:${C.text2};font-weight:${req ? 600 : 500};">${label}${req ? ` <span style="color:${C.danger};">*</span>` : ""}</label>
      <input type="${t}" id="${id}" placeholder="${ph || ""}" style="width:100%;padding:11px;border:1px solid ${C.line};border-radius:8px;font-size:1rem;background:${C.inputBg};color:${C.text};${dir ? "direction:" + dir + ";" : ""}">${h}</div>`;
  }
  function textarea(id, label, rows) {
    return `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:5px;color:${C.text2};">${label}</label>
      <textarea id="${id}" rows="${rows || 3}" style="width:100%;padding:11px;border:1px solid ${C.line};border-radius:8px;resize:none;background:${C.inputBg};color:${C.text};font-family:'IBM Plex Sans Arabic',sans-serif;"></textarea></div>`;
  }
  function payOpt(val, label) {
    return `<label style="display:flex;align-items:center;padding:11px;background:${C.raised};border:1px solid ${C.line};border-radius:8px;cursor:pointer;"><input type="checkbox" name="paymentMethod" value="${val}" style="margin-left:10px;width:18px;height:18px;accent-color:${C.clarity};"><strong style="color:${C.text};">${label}</strong></label>`;
  }
  function commit(id, label) {
    return `<div style="margin-bottom:8px;"><label style="cursor:pointer;display:flex;align-items:flex-start;gap:8px;color:${C.text2};font-size:.92rem;line-height:1.6;">
      <input type="checkbox" id="${id}" style="margin-top:3px;width:17px;height:17px;flex-shrink:0;accent-color:${C.clarity};"><span>${label}</span></label></div>`;
  }

  /* =========================================================================
     9) استمارة الحجز الفردي — شاملة
     ========================================================================= */
  function showBookingForm() {
    const d = collectData();
    const payLine = d.installmentText ? `${d.paymentLabel} — ${d.installmentText}` : d.paymentLabel;

    Swal.fire({
      title: "إتمام الحجز",
      html: `<div style="text-align:right;direction:rtl;max-height:500px;overflow-y:auto;padding-left:8px;">
        <div style="background:linear-gradient(135deg,${C.clarityDeep},#0F3B38);padding:14px;border-radius:12px;margin-bottom:18px;color:#fff;">
          <h4 style="margin:0;font-family:'Readex Pro',sans-serif;"><i class="fas fa-compass"></i> ${d.courseTitle} — ${d.packageName}</h4>
          <p style="margin:8px 0 2px;">المبلغ المطلوب: <strong style="font-size:1.2rem;color:${C.gold};">${arNum(d.finalPrice)} ${d.currency}</strong></p>
          <p style="margin:0;font-size:.85rem;opacity:.9;">${payLine}</p>
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.clarity};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-user"></i> بياناتك</h4>
          ${field("customerName", "الاسم الكامل", "اكتب اسمك", true)}
          ${field("customerWhatsapp", "رقم الواتساب", "01234567890", true, "ltr", "اكتبه بالإنجليزي")}
          ${field("customerEmail", "البريد الإلكتروني", "example@email.com", true, "ltr", "", "email")}
          ${field("customerDecision", "القرار أو السؤال اللي شاغلك دلوقتي؟ (اختياري)", "تقدر تكتبه باختصار")}
          ${field("customerCountry", "البلد (اختياري)", "مصر، السعودية...")}
          ${field("customerCity", "المحافظة/المدينة (اختياري)", "")}
          ${field("customerSource", "عرفت عننا منين؟ (اختياري)", "")}
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.clarity};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-feather"></i> معلومات إضافية</h4>
          ${textarea("customerExpectations", "إيه اللي نفسك توصله من الرحلة دي؟ (اختياري)")}
          ${textarea("customerNotes", "أي ملاحظات (اختياري)", 2)}
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.gold};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-credit-card"></i> وسيلة الدفع <span style="color:${C.danger};">*</span></h4>
          <div style="display:grid;gap:8px;">
            ${payOpt("vodafone", "فودافون كاش")}
            ${payOpt("instapay", "انستاباي")}
            ${payOpt("bank", "تحويل بنكي")}
            ${payOpt("paypal", "PayPal / تحويل دولي")}
          </div>
        </div>

        <div style="background:rgba(87,210,196,.08);padding:13px;border-radius:10px;border-right:3px solid ${C.clarity};">
          <p style="color:${C.text2};margin:0;text-align:center;font-size:.9rem;"><i class="fas fa-lock" style="color:${C.clarity};"></i> بياناتك آمنة ومحميّة — مش هتتشارك مع أي طرف تاني</p>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "✅ تأكيد الحجز",
      cancelButtonText: "رجوع",
      confirmButtonColor: C.clarityDeep,
      width: window.innerWidth <= 768 ? "95%" : "720px",
      allowOutsideClick: false,
      customClass: { popup: "io-popup" },
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
        decision:     document.getElementById("customerDecision").value.trim() || "",
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
        courseModules: d.modules || null,
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

  /* =========================================================================
     10) استمارة طلب الدعم / المنحة (مطفّية افتراضياً — تتفعّل من الكونفيج)
     ========================================================================= */
  function showGrantForm() {
    const d = collectData();
    const anchorPrice = anchorOf(state.pack);
    const priceAfterOffer = getBase();

    let selectedInstallmentMonths = 3, selectedPercentage = 50, selectedPartialMonths = 3;
    const maxP = (CFG.grant && CFG.grant.maxDiscountPercent) || 90;
    const minPay = 100 - maxP;

    window.__io_updateInstallment = function () {
      const m = document.getElementById("installmentMonths").value;
      document.getElementById("monthsCount").textContent = m;
      document.getElementById("monthlyAmount").textContent = arNum(Math.ceil(priceAfterOffer / m));
      selectedInstallmentMonths = m;
    };
    window.__io_updatePartial = function () {
      const p = document.getElementById("affordableAmount").value;
      document.getElementById("percentageAmount").textContent = p;
      document.getElementById("finalAmount").textContent = arNum(Math.round(priceAfterOffer * (p / 100)));
      selectedPercentage = p;
      if (document.getElementById("installPartial")?.checked) window.__io_updatePartialInst();
    };
    window.__io_togglePartialInst = function () {
      const c = document.getElementById("installPartial").checked;
      document.getElementById("partialInstallmentDetails").style.display = c ? "block" : "none";
      if (c) window.__io_updatePartialInst();
    };
    window.__io_updatePartialInst = function () {
      const amt = Math.round(priceAfterOffer * (document.getElementById("affordableAmount").value / 100));
      const m = document.getElementById("partialInstallmentMonths").value;
      document.getElementById("partialMonthsCount").textContent = m;
      document.getElementById("partialMonthlyAmount").textContent = arNum(Math.ceil(amt / m));
      selectedPartialMonths = m;
    };
    window.__io_toggleSupport = function () {
      const s = document.querySelector('input[name="supportType"]:checked')?.value;
      const id = document.getElementById("installmentDetails");
      const pd = document.getElementById("partialDetails");
      if (id) id.style.display = "none";
      if (pd) pd.style.display = "none";
      if (s === "installment" && id) { id.style.display = "block"; window.__io_updateInstallment(); }
      else if (s === "partial" && pd) { pd.style.display = "block"; window.__io_updatePartial(); }
    };

    Swal.fire({
      title: "طلب منحة / دعم مالي",
      html: `<div style="text-align:right;direction:rtl;max-height:500px;overflow-y:auto;padding-left:8px;">
        <div style="background:linear-gradient(135deg,${C.clarityDeep},#0F3B38);padding:15px;border-radius:12px;margin-bottom:18px;color:#fff;">
          <h4 style="margin:0;font-family:'Readex Pro',sans-serif;"><i class="fas fa-compass"></i> ${d.courseTitle} — ${d.packageName}</h4>
        </div>
        <div style="background:rgba(87,210,196,.10);padding:18px;border-radius:12px;margin-bottom:18px;text-align:center;">
          <i class="fas fa-heart" style="font-size:2.2rem;color:${C.clarity};"></i>
          <h3 style="color:${C.clarity};margin:10px 0 4px;font-family:'Readex Pro',sans-serif;">المال مايصحّش يكون عائق</h3>
          <p style="color:${C.text2};margin:0;font-size:.92rem;">طلبك بيتعامل بسرّية تامّة، وبتفهّم لظروفك.</p>
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.clarity};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-user"></i> بياناتك</h4>
          ${field("customerName", "الاسم الكامل", "", true)}
          ${field("customerWhatsapp", "رقم الواتساب", "01234567890", true, "ltr")}
          ${field("customerEmail", "البريد الإلكتروني", "example@email.com", true, "ltr", "", "email")}
          ${field("customerRole", "نبذة عنك (اختياري)", "")}
          ${field("customerCountry", "البلد (اختياري)", "")}
          ${field("customerCity", "المدينة (اختياري)", "")}
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border-right:4px solid ${C.gold};border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};border-left:1px solid ${C.line};">
          <h4 style="color:${C.gold};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-book-open"></i> قصّتك</h4>
          ${textarea("whyNeedGrant", "ليه محتاج الدعم ده؟ *", 4)}
          ${textarea("challenges", "إيه التحديات اللي بتواجهها دلوقتي؟ *", 4)}
          ${textarea("communityContribution", "هتفيد محيطك إزاي بعد الرحلة؟ (اختياري)", 3)}
        </div>

        <div style="background:${C.panel};padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.clarity};margin-bottom:14px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-hand-holding-heart"></i> الدعم المطلوب</h4>

          <div style="margin-bottom:14px;">
            <label style="font-weight:600;color:${C.text2};display:block;margin-bottom:6px;">الوضع الوظيفي <span style="color:${C.danger};">*</span></label>
            <select id="employmentStatus" style="width:100%;padding:11px;border:1px solid ${C.line};border-radius:8px;background:${C.inputBg};color:${C.text};font-family:'IBM Plex Sans Arabic',sans-serif;">
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
              <label style="color:${C.text2};display:block;margin-bottom:6px;">دخل ثابت؟</label>
              <select id="hasIncome" style="width:100%;padding:11px;border:1px solid ${C.line};border-radius:8px;background:${C.inputBg};color:${C.text};font-family:'IBM Plex Sans Arabic',sans-serif;">
                <option value="">اختياري</option>
                <option value="yes">نعم</option>
                <option value="no">لا</option>
                <option value="irregular">غير منتظم</option>
              </select>
            </div>
            <div>
              <label style="color:${C.text2};display:block;margin-bottom:6px;">عدد المعالين</label>
              <input type="number" id="dependents" min="0" style="width:100%;padding:11px;border:1px solid ${C.line};border-radius:8px;background:${C.inputBg};color:${C.text};">
            </div>
          </div>

          <label style="font-weight:600;color:${C.text2};display:block;margin-bottom:10px;">نوع الدعم المطلوب <span style="color:${C.danger};">*</span></label>

          <div style="background:${C.raised};padding:16px;border-radius:10px;margin-bottom:12px;border:1px solid ${C.line};">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="installment" onchange="__io_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;accent-color:${C.clarity};">
              <div style="width:100%;">
                <strong style="color:${C.text};">تقسيط مُيسّر على شهور أكتر</strong>
                <p style="color:${C.muted};font-size:.88rem;margin:4px 0 0;">قسّط المبلغ كامل على عدد الشهور المناسب ليك (٢ – ١٨ شهر).</p>
                <div id="installmentDetails" style="display:none;margin-top:14px;">
                  <label style="color:${C.text2};font-size:.88rem;">عدد الأشهر:</label>
                  <input type="range" id="installmentMonths" min="2" max="18" value="3" oninput="__io_updateInstallment()" style="width:100%;margin:8px 0;accent-color:${C.clarity};">
                  <div style="text-align:center;padding:13px;background:${C.deep};border-radius:8px;">
                    <div style="font-size:1.1rem;color:${C.text};font-weight:700;"><span id="monthsCount">3</span> أشهر</div>
                    <div style="font-size:1.4rem;color:${C.clarity};font-weight:700;margin-top:4px;"><span id="monthlyAmount">0</span> ${cur} / شهرياً</div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <div style="background:${C.raised};padding:16px;border-radius:10px;margin-bottom:12px;border:1px solid ${C.line};">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="partial" onchange="__io_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;accent-color:${C.clarity};">
              <div style="width:100%;">
                <strong style="color:${C.text};">منحة جزئية — أقدر أدفع جزء بس</strong>
                <p style="color:${C.muted};font-size:.88rem;margin:4px 0 0;">حدّد النسبة اللي تقدر تدفعها، واحنا نتكفّل بالباقي.</p>
                <div id="partialDetails" style="display:none;margin-top:14px;">
                  <label style="color:${C.text2};font-size:.88rem;">النسبة اللي تقدر تدفعها:</label>
                  <input type="range" id="affordableAmount" min="${minPay}" max="90" value="50" oninput="__io_updatePartial()" style="width:100%;margin:8px 0;accent-color:${C.clarity};">
                  <div style="text-align:center;padding:13px;background:${C.deep};border-radius:8px;">
                    <div style="color:${C.text2};font-size:.95rem;">تدفع <strong><span id="percentageAmount">50</span>%</strong> من المبلغ</div>
                    <div style="font-size:1.4rem;color:${C.clarity};font-weight:700;margin-top:4px;"><span id="finalAmount">0</span> ${cur}</div>
                  </div>
                  <div style="margin-top:14px;padding:13px;background:${C.deep};border-radius:8px;">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;color:${C.text2};font-size:.92rem;">
                      <input type="checkbox" id="installPartial" onchange="__io_togglePartialInst()" style="width:17px;height:17px;accent-color:${C.clarity};">
                      عايز أقسّط المبلغ ده على شهور
                    </label>
                    <div id="partialInstallmentDetails" style="display:none;margin-top:12px;">
                      <input type="range" id="partialInstallmentMonths" min="2" max="12" value="3" oninput="__io_updatePartialInst()" style="width:100%;accent-color:${C.clarity};">
                      <div style="text-align:center;margin-top:8px;padding:10px;background:${C.raised};border-radius:8px;color:${C.text};">
                        <span id="partialMonthsCount">3</span> أشهر × <strong id="partialMonthlyAmount">0</strong> ${cur}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <div style="background:${C.raised};padding:16px;border-radius:10px;border:1px solid ${C.line};">
            <label style="display:flex;align-items:flex-start;cursor:pointer;">
              <input type="radio" name="supportType" value="full" onchange="__io_toggleSupport()" style="margin-left:10px;margin-top:3px;width:18px;height:18px;accent-color:${C.clarity};">
              <div>
                <strong style="color:${C.text};">منحة كاملة ١٠٠٪</strong>
                <p style="color:${C.muted};font-size:.88rem;margin:4px 0 0;">مش قادر أدفع حالياً، وبطلب منحة كاملة.</p>
              </div>
            </label>
          </div>
        </div>

        <div style="background:${C.panel};padding:16px;border-radius:12px;margin-bottom:14px;border:1px solid ${C.line};">
          <h4 style="color:${C.gold};margin-bottom:12px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-credit-card"></i> وسيلة الدفع المتاحة ليك (اختياري)</h4>
          <div style="display:grid;gap:8px;">
            ${payOpt("vodafone", "فودافون كاش")}
            ${payOpt("instapay", "انستاباي")}
            ${payOpt("bank", "تحويل بنكي")}
          </div>
        </div>

        <div style="background:rgba(224,122,106,.10);padding:18px;border-radius:12px;margin-bottom:14px;border:1px solid rgba(224,122,106,.3);">
          <h4 style="color:${C.danger};margin-bottom:12px;font-family:'Readex Pro',sans-serif;"><i class="fas fa-handshake"></i> التعهدات</h4>
          ${commit("commitment1", "أتعهّد بالحضور الكامل واستثمار المحتوى بجدّية")}
          ${commit("commitment2", "أتعهّد بالمشاركة الفعّالة والتفاعل الجادّ")}
          ${commit("commitment3", "المعلومات اللي كتبتها صحيحة وحقيقية")}
          <div style="margin-top:14px;padding:13px;background:rgba(87,210,196,.06);border-radius:8px;">
            ${commit("volunteerCommitment", "أتطوّع بمساعدة ٣ أشخاص من محيطي بعد إتمام الرحلة (اختياري)")}
          </div>
        </div>

        <div style="background:rgba(87,210,196,.08);padding:14px;border-radius:10px;border-right:3px solid ${C.clarity};">
          <p style="color:${C.text2};margin:0;text-align:center;font-size:.92rem;"><i class="fas fa-clock" style="color:${C.clarity};"></i> هنراجع طلبك خلال ٢٤–٤٨ ساعة</p>
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "✅ إرسال طلب الدعم",
      cancelButtonText: "رجوع",
      confirmButtonColor: C.clarityDeep,
      width: window.innerWidth <= 768 ? "95%" : "780px",
      allowOutsideClick: false,
      customClass: { popup: "io-popup" },
      didOpen: () => {
        document.getElementById("customerName")?.focus();
        window.__io_updateInstallment(); window.__io_updatePartial();
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
        finalPriceNumber = 0; totalSavings = anchorPrice; supportDetails = { type: "full", discount: 100 };
      } else if (supportType === "partial") {
        finalPriceNumber = Math.round(priceAfterOffer * (selectedPercentage / 100));
        totalSavings = anchorPrice - finalPriceNumber;
        supportDetails = {
          type: "partial", percentage: selectedPercentage, affordableAmount: finalPriceNumber,
          installmentRequested: document.getElementById("installPartial")?.checked || false,
          installmentMonths: document.getElementById("installPartial")?.checked ? selectedPartialMonths : null,
          monthlyAmount: document.getElementById("installPartial")?.checked ? Math.ceil(finalPriceNumber / selectedPartialMonths) : null,
        };
      } else {
        finalPriceNumber = priceAfterOffer; totalSavings = anchorPrice - priceAfterOffer;
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
        courseModules: d.modules || null,
        package: { id: d.packageId, name: d.packageName, sub: d.packageSub },
        coursePrice: anchorPrice,
        salePrice: priceAfterOffer,
        customer,
        pricing: { basePriceNumber: anchorPrice, finalPriceNumber, finalPrice: `${arNum(finalPriceNumber)} ${cur}` },
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
     11) حفظ الحجز في Firebase + تليجرام تلقائي
        ⚠️ نفس المنطق والـ collection بالظبط — ده اللي الأدمن بيقراه
     ========================================================================= */
  async function saveBookingAndOpenTelegram(bookingData) {
    Swal.fire({
      title: "جاري معالجة طلبك...",
      html: `<p style="color:${C.text2};">لحظات — بنحفظ بياناتك في النظام</p>`,
      allowOutsideClick: false,
      customClass: { popup: "io-popup" },
      didOpen: () => Swal.showLoading(),
    });

    const telegramCode = ("IO" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)).toUpperCase();

    const fullRecord = {
      ...bookingData,
      bookingId: "IO_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11),
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
      customClass: { popup: "io-popup" },
      html: `<div style="text-align:right;direction:rtl;">
        <div style="background:linear-gradient(135deg,${C.clarityDeep},#0F3B38);padding:18px;border-radius:12px;margin-bottom:18px;">
          <p style="color:#EAFBF8;font-size:1.05rem;line-height:1.85;margin:0;">
            ${isGrant
              ? "وصلنا طلبك، وهنراجعه خلال ٢٤–٤٨ ساعة. خطوتك الجاية: أكّد طلبك عبر بوت تليجرام بضغطة واحدة."
              : "بياناتك اتسجّلت في نظامنا. خطوتك الأخيرة: أكّد حجزك واستلم تعليمات الدفع عبر بوت تليجرام."}
          </p>
        </div>

        <div style="background:${C.panel};border:1px solid ${C.line};border-radius:12px;padding:18px;margin-bottom:14px;">
          <h4 style="color:#2c79c9;margin:0 0 12px;font-family:'Readex Pro',sans-serif;font-size:1.1rem;"><i class="fab fa-telegram"></i> التأكيد عبر تليجرام — تلقائي بضغطة واحدة</h4>
          <p style="color:${C.text2};margin:0 0 6px;font-size:.95rem;line-height:1.75;">١. اضغط الزر الأزرق تحت.</p>
          <p style="color:${C.text2};margin:0 0 6px;font-size:.95rem;line-height:1.75;">٢. في تليجرام، اضغط <strong style="color:#2c79c9;">Start</strong>.</p>
          <p style="color:${C.text2};margin:0;font-size:.95rem;line-height:1.75;">٣. هنبعتلك تعليمات الدفع وتفاصيل التأكيد فوراً.</p>
        </div>

        <div style="background:${C.deep};border-radius:10px;padding:12px 14px;text-align:center;border:1px dashed ${C.line};">
          <p style="margin:0 0 4px;color:${C.muted};font-size:.78rem;">رقم الطلب المرجعي (للحفظ فقط — بيتنقل تلقائياً):</p>
          <p style="margin:0;color:${C.clarity};font-family:monospace;letter-spacing:2px;font-size:.95rem;font-weight:700;">${telegramCode}</p>
        </div>

        ${!firebaseSaved ? `<div style="background:rgba(224,122,106,.12);border-right:3px solid ${C.danger};padding:12px;border-radius:8px;margin-top:14px;color:${C.danger};font-size:.88rem;">
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
     12) ربط كروت العرض (الكروت الكبيرة) بالحاسبة
     ========================================================================= */
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

    setupPackCards();

    document.getElementById("applyCouponCalc")?.addEventListener("click", applyCoupon);
    document.getElementById("calcCoupon")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyCoupon(); }
    });
    document.getElementById("calcBookBtn")?.addEventListener("click", showBookingForm);
    window.__insightSetPack = setPack;

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
    const heroBadge = document.getElementById("heroOfferBadge");
    if (launchActive() && heroBadge) {
      heroBadge.style.display = "inline-flex";
      const nameEl = heroBadge.querySelector("[data-offer-name]");
      const pctEl = heroBadge.querySelector("[data-offer-pct]");
      if (nameEl) nameEl.textContent = CFG.launchOffer.name;
      if (pctEl) pctEl.textContent = `${packPct(CFG.defaultPackage || state.pack)}%`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
