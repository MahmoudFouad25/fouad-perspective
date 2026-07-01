/* ════════════════════════════════════════════════════════════════════════
   axes-journey-controller.js — متحكّم رحلة التقرير
   ────────────────────────────────────────────────────────────────────────
   يربط اللبنات: يبني الرحلة (JOURNEY) → يعرض خطوةً خطوة (RENDER) → يدير
   التنقّل (تابِع/السابق) بحركةٍ ناعمة → يعرض «التقرير الكامل» للمراجعة والطباعة.

   نقطة الدخول: AXES_JOURNEY_CONTROLLER.start(mountEl, result, opts)
     mountEl : العنصر الذي تُعرَض فيه الرحلة.
     result  : { ranking, burnout, burnoutRepressed, wellness, lean }
     opts    : { onComplete } — تُستدعى عند بلوغ آخر خطوة (اختياريّة).

   لا يقيس ولا يحسب — يقرأ ما جهّزه المحرّك ويقود التجربة.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function JOURNEY() {
    return (typeof AXES_JOURNEY !== "undefined") ? AXES_JOURNEY
         : (typeof window !== "undefined" ? window.AXES_JOURNEY : null);
  }
  function RENDER() {
    return (typeof AXES_JOURNEY_RENDER !== "undefined") ? AXES_JOURNEY_RENDER
         : (typeof window !== "undefined" ? window.AXES_JOURNEY_RENDER : null);
  }

  /* ─────────── حالة الرحلة الجاريّة ─────────── */
  var S = {
    mount: null,
    journey: null,
    index: 0,
    onComplete: null,
    completed: false
  };

  /* يبني HTML الممارسة لخطوة «خطوتك» (نمرّره كـ ctx للعارض) */
  function practiceContext(step) {
    if (step.kind !== "step") return {};
    var R = RENDER();
    var tag = step.practiceBalanced
      ? '<span class="aj-practice-tag">حراسة، لا علاج</span>'
      : '<span class="aj-practice-tag">تجربة الأسبوع</span>';
    var html = '<div class="aj-practice-card">' + tag + R.paras(step.practice || "") + '</div>';
    return { practiceHTML: html };
  }

  /* يعرض الخطوة الحاليّة */
  function renderCurrent() {
    var R = RENDER();
    var step = S.journey.steps[S.index];
    var isFirst = (S.index === 0);
    var isLast  = (S.index === S.journey.steps.length - 1);

    var ctx = practiceContext(step);
    var html = R.renderScreen(step, {
      isFirst: isFirst, isLast: isLast,
      phases: S.journey.phases, ctx: ctx
    });

    S.mount.innerHTML = '<div class="aj-wrap"><div class="aj-anim-in">' + html + '</div></div>';
    try { window.scrollTo(0, 0); } catch (e) {}

    // ربط الأزرار
    var nextBtn = document.getElementById("ajNext");
    var backBtn = document.getElementById("ajBack");
    if (nextBtn) nextBtn.addEventListener("click", goNext);
    if (backBtn) backBtn.addEventListener("click", goBack);
  }

  function goNext() {
    if (S.index < S.journey.steps.length - 1) {
      S.index++;
      renderCurrent();
    } else {
      // آخر خطوة → التقرير الكامل
      renderFullReport();
    }
  }

  function goBack() {
    if (S.index > 0) {
      S.index--;
      renderCurrent();
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     التقرير الكامل — كل الخطوات على صفحةٍ واحدة للمراجعة والطباعة
     ════════════════════════════════════════════════════════════════════ */
  function renderFullReport() {
    var R = RENDER();
    var parts = S.journey.steps.map(function (step) {
      var ctx = practiceContext(step);
      // في العرض الكامل نخفي أزرار التنقّل ونعرض الجسم فقط داخل شاشةٍ مبسّطة
      return '<div class="aj-screen">'
           +   R.phaseHeader(step)
           +   '<div class="aj-body">' + R.renderStep(step, ctx) + '</div>'
           + '</div>';
    }).join("");

    var controls =
        '<div class="aj-nav" style="justify-content:center;gap:14px;">'
      +   '<button class="aj-btn ghost" id="ajRestart">◄ ارجع للرحلة</button>'
      +   '<button class="aj-btn primary" id="ajPrint" style="max-width:320px;">احفظ نسخة (طباعة)</button>'
      + '</div>';

    S.mount.innerHTML =
        '<div class="aj-wrap aj-full">'
      +   '<div class="aj-full-head aj-anim-in">'
      +     '<div class="aj-ground-title">تقريرك كامل</div>'
      +   '</div>'
      +   parts
      +   controls
      + '</div>';
    try { window.scrollTo(0, 0); } catch (e) {}

    var pr = document.getElementById("ajPrint");
    if (pr) pr.addEventListener("click", function () { try { window.print(); } catch (e) {} });
    var rs = document.getElementById("ajRestart");
    if (rs) rs.addEventListener("click", function () { S.index = 0; renderCurrent(); });

    // إشعار الإتمام مرّةً واحدة
    if (!S.completed) {
      S.completed = true;
      if (typeof S.onComplete === "function") {
        try { S.onComplete(); } catch (e) {}
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     نقطة الدخول
     ════════════════════════════════════════════════════════════════════ */
  function start(mountEl, result, opts) {
    opts = opts || {};
    var J = JOURNEY();
    if (!J || !mountEl) return;

    S.mount = mountEl;
    S.index = 0;
    S.completed = false;
    S.onComplete = opts.onComplete || null;

    var journey = J.buildJourney(result || {});
    journey = J.annotatePhaseProgress(journey);
    S.journey = journey;

    renderCurrent();
  }

  /* ─────────── التصدير ─────────── */
  var API = { start: start };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; }
  if (typeof window !== "undefined") { window.AXES_JOURNEY_CONTROLLER = API; }

})();
