/* ════════════════════════════════════════════════════════════════════════
   axes-journey-render.js — طبقة عرض رحلة التقرير
   ────────────────────────────────────────────────────────────────────────
   تحوّل كل «خطوة» (من axes-journey.js) إلى شاشة HTML بالهوية البصريّة
   الداكنة نفسها المستعملة في المقياس، مع:
     • رأس مرحلةٍ مسمّى (مساراتك · جوانبك · الخيط والنزيف · خطوتك)
     • مؤشّر تقدّمٍ داخل المرحلة (الخطوة ٢ من ٥)
     • شارة حالة الجانب (متوازن/مشدود/متوقّف) بلونها
     • زرّ الإمساك = زرّ «تابِع» (نصّه هو جملة الإمساك نفسها)
     • زرّ «السابق» للرجوع

   مستقلّةٌ عن الـbridge القديم — تقرأ من AXES_CONTENT الجديد مباشرة.
   لا منطق قياس هنا؛ عرضٌ محض.
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ─────────── أدوات نصّية ─────────── */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function arNum(n) {
    var m = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(n).replace(/\d/g, function (d) { return m[+d]; });
  }
  /* يقسّم نصًّا بفواصل \n\n إلى فقرات <p>، مع إبراز الفقرة الأولى اختياريًّا */
  function paras(text, leadFirst) {
    var parts = String(text == null ? "" : text)
      .split(/\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean);
    return parts.map(function (p, i) {
      var cls = (leadFirst && i === 0) ? "ajp ajp-lead" : "ajp";
      return '<p class="' + cls + '">' + esc(p) + "</p>";
    }).join("");
  }

  /* ─────────── شارة حالة الجانب ─────────── */
  var STATE_META = {
    balanced: { label: "متوازن", cls: "st-balanced", note: "شغّال من الحب" },
    strained: { label: "مشدود",  cls: "st-strained", note: "شغّال زيادة" },
    stalled:  { label: "متوقّف", cls: "st-stalled",  note: "ساكت" },
    both:     { label: "متذبذب", cls: "st-both",     note: "بين الطرفين" },
    ambiguous:{ label: "لسه مش واضح", cls: "st-amb",  note: "نفرزه سوا" }
  };
  function stateBadge(stateKey) {
    var m = STATE_META[stateKey] || STATE_META.balanced;
    return '<span class="aj-badge ' + m.cls + '">'
         +   '<span class="aj-badge-dot"></span>'
         +   '<span class="aj-badge-label">' + esc(m.label) + '</span>'
         +   '<span class="aj-badge-note">' + esc(m.note) + '</span>'
         + '</span>';
  }

  /* ─────────── رأس المرحلة + مؤشّر التقدّم ─────────── */
  function phaseHeader(step) {
    if (!step.phaseName) return "";
    return '<div class="aj-phase">'
         +   '<span class="aj-phase-name">' + esc(step.phaseName) + '</span>'
         +   '<span class="aj-phase-count">الخطوة ' + arNum(step.phaseIndex)
         +     ' من ' + arNum(step.phaseTotal) + '</span>'
         + '</div>';
  }

  /* شريط مراحل علويّ يبيّن المرحلة الحاليّة من الأربع */
  function phaseRail(currentPhaseId, phases) {
    var dots = phases.map(function (p) {
      var active = (p.id === currentPhaseId) ? " active" : "";
      return '<span class="aj-rail-item' + active + '">'
           +   '<span class="aj-rail-mark"></span>'
           +   '<span class="aj-rail-text">' + esc(p.name) + '</span>'
           + '</span>';
    }).join('<span class="aj-rail-sep"></span>');
    return '<div class="aj-rail">' + dots + '</div>';
  }

  /* ─────────── أزرار التنقّل (الإمساك = تابِع) ─────────── */
  function navButtons(step, isFirst, isLast) {
    var back = isFirst ? "" :
      '<button class="aj-btn ghost" id="ajBack">◄ السابق</button>';
    var nextText = isLast ? "شوف التقرير كامل ►" : (step.handoff || "تابِع ►");
    var next =
      '<button class="aj-btn primary" id="ajNext">' + esc(nextText) + '</button>';
    return '<div class="aj-nav">' + back + next + '</div>';
  }

  /* ════════════════════════════════════════════════════════════════════
     عارض الخطوة الواحدة — يختار القالب حسب step.kind
     ════════════════════════════════════════════════════════════════════ */
  function renderStep(step, ctx) {
    var body = "";

    switch (step.kind) {

      /* أرض الكرامة — افتتاحًا */
      case "ground":
        body = '<div class="aj-ground">'
             +   '<div class="aj-ground-title">' + esc(step.title) + '</div>'
             +   paras(step.body)
             + '</div>';
        break;

      /* مدخل النهر */
      case "intro":
        body = '<div class="aj-kicker">نبدأ من هنا</div>'
             + '<h2 class="aj-h">' + esc(step.title) + '</h2>'
             + paras(step.body, true);
        break;

      /* المسار الأقوى */
      case "primary":
        body = '<div class="aj-kicker">اتجاه طاقتك الأقوى</div>'
             + paras(step.body, true);
        break;

      /* الداعم + المنسيّ */
      case "behind":
        body = '<div class="aj-kicker">وراء الأقوى</div>'
             + paras(step.intro)
             + '<div class="aj-sub">'
             +   '<div class="aj-sub-tag">مسارك الداعم</div>'
             +   paras(step.secondaryBody)
             + '</div>'
             + '<div class="aj-sub aj-sub-repressed">'
             +   '<div class="aj-sub-tag">مسارك المنسيّ</div>'
             +   paras(step.repressedBody)
             + '</div>';
        break;

      /* صح وغلط (الفطرة/القناع) */
      case "lens":
        body = '<div class="aj-kicker">قبل ما تقرا نتيجتك</div>'
             + '<h2 class="aj-h">' + esc(step.title) + '</h2>'
             + paras(step.body, true);
        break;

      /* تمهيد الجوانب */
      case "dimsIntro":
        body = '<div class="aj-kicker">'
             +   (step.frame === "repressed" ? "جوانب مسارك المنسيّ" : "جوانب مسارك الأقوى")
             + '</div>'
             + '<h2 class="aj-h">' + esc(step.title) + '</h2>'
             + paras(step.body);
        break;

      /* قراءة جانبٍ واحد */
      case "dimension":
        body = '<div class="aj-dim-head">'
             +   stateBadge(step.stateKey)
             + '</div>'
             + '<div class="aj-dim-intro">' + paras(step.intro) + '</div>'
             + '<div class="aj-dim-reading">' + paras(step.reading, true) + '</div>';
        break;

      /* تأطير المنسيّ */
      case "repressedFraming":
        body = '<div class="aj-kicker">مكان تاني تمامًا</div>'
             + paras(step.intro, true);
        break;

      /* ختام المنسيّ */
      case "repressedClosing":
        body = '<div class="aj-note-card">' + paras(step.body) + '</div>';
        break;

      /* الخيط الجامع */
      case "thread":
        body = '<div class="aj-kicker">الخيط اللي بيربط</div>'
             + '<h2 class="aj-h">' + esc(step.title) + '</h2>'
             + '<div class="aj-thread-gift">' + paras(step.giftAndCost, true) + '</div>'
             + '<div class="aj-thread-conn">' + paras(step.connection) + '</div>'
             + (step.mismatchNote
                 ? '<div class="aj-thread-mismatch">' + paras(step.mismatchNote) + '</div>'
                 : '');
        break;

      /* مقياس النزيف */
      case "bleed":
        body = '<div class="aj-kicker">مقياس نزيفك</div>'
             + '<h2 class="aj-h">' + esc(step.title) + '</h2>'
             + paras(step.intro);
        if (step.reading) {
          body += '<div class="aj-bleed-card">'
               +    '<div class="aj-bleed-name">' + esc(step.reading.name) + '</div>'
               +    paras(step.reading.body)
               +  '</div>';
        }
        break;

      /* الخطوة (الممارسة) */
      case "step":
        body = '<div class="aj-kicker">خطوتك</div>'
             + paras(step.intro)
             + (ctx && ctx.practiceHTML ? ctx.practiceHTML : "");
        break;

      /* الخاتمة */
      case "closing":
        body = '<div class="aj-ground aj-ground-close">'
             +   '<div class="aj-ground-title">' + esc(step.title) + '</div>'
             +   paras(step.body)
             + '</div>';
        break;

      default:
        body = paras(step.body || "");
    }

    return body;
  }

  /* ════════════════════════════════════════════════════════════════════
     يبني شاشة الخطوة كاملةً (رأس + جسم + أزرار)
     ════════════════════════════════════════════════════════════════════ */
  function renderScreen(step, opts) {
    opts = opts || {};
    var isFirst = !!opts.isFirst, isLast = !!opts.isLast;
    var phases  = opts.phases || [];

    return '<div class="aj-screen">'
         +   phaseRail(step.phase, phases)
         +   phaseHeader(step)
         +   '<div class="aj-body">' + renderStep(step, opts.ctx) + '</div>'
         +   navButtons(step, isFirst, isLast)
         + '</div>';
  }

  /* ─────────── التصدير ─────────── */
  var API = {
    renderScreen: renderScreen,
    renderStep: renderStep,
    stateBadge: stateBadge,
    phaseRail: phaseRail,
    phaseHeader: phaseHeader,
    esc: esc, arNum: arNum, paras: paras
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; }
  if (typeof window !== "undefined") { window.AXES_JOURNEY_RENDER = API; }

})();
