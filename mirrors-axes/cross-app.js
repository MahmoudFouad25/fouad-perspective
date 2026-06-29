/* ════════════════════════════════════════════════════════════════════════
   cross-app.js — منسّق التقاطع (mirrors-axes)
   ────────────────────────────────────────────────────────────────────────
   يربط القطع: مصادقة → قراءة المستندين → إن نقص أحدهما رسالةُ إكمال →
   تركيب (compose) → ربط العناقيد بمحتوى الطابع → عرض.

   لا يقيس شيئًا ولا يكتب مستند قياس. مجمِّعٌ وعارض.
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function CFG()   { return global.CROSS_CONFIG || null; }
  function CONT()  { return global.INTERSECTION_CONTENT || null; }
  function ENG()   { return global.CROSS_ENGINE || null; }
  function STORE() { return global.CROSS_STORE || null; }
  function RND()   { return global.CROSS_RENDER || null; }

  var state = {
    rootId: "mirrors-axes-root",
    user: null
  };

  function root() { return document.getElementById(state.rootId); }
  function setHTML(html) {
    var r = root();
    if (!r) return;
    r.innerHTML = '<div class="ax-card">' + html + "</div>";
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function centered(msg) {
    setHTML('<div class="ax-centered"><div class="ax-spinner"></div><div class="ax-saving">' + msg + "</div></div>");
  }
  function errorCard(msg) {
    setHTML('<div class="ax-centered"><div class="ax-saving">' + msg + "</div></div>");
  }

  /* اسم مفتاح المسار لطابعٍ ما حسب عنقود: نحتاج معرفة أيّ مسارٍ هو الرئيسيّ
     وأيّه المكبوت كي نختار محتوى البورتريه الصحيح من cross-content. */
  function axisKeyFor(axisId) {
    // محتوى الطابع مُفهرسٌ بمعرّف المسار نفسه (tamasuk/hayawiyya/intima)
    return axisId;
  }

  /* تحويل مُخرَج compose إلى موديل العرض */
  function buildModel(composed) {
    var typeKey = composed.primaryType ? ("type" + composed.primaryType) : null;
    var typeContent = (typeKey && CONT()) ? CONT()[typeKey] : null;

    var primaryCluster   = (composed.clusters && composed.clusters.primary)   ? composed.clusters.primary.points   : [];
    var repressedCluster = (composed.clusters && composed.clusters.repressed) ? composed.clusters.repressed.points : [];

    return {
      ground: RND().defaultGround(),
      typeContent: typeContent,
      axisKeys: {
        primary:   axisKeyFor(composed.primaryAxis),
        repressed: axisKeyFor(composed.repressedAxis)
      },
      primaryCluster: primaryCluster,
      repressedCluster: repressedCluster,
      _composed: composed
    };
  }

  /* هل محتوى هذا الطابع جاهز (غير pending)؟ */
  function typeReady(typeKey) {
    var c = CONT();
    if (!c || !typeKey || !c[typeKey]) return false;
    var t = c[typeKey];
    // جاهزٌ إن كان أحد المسارات على الأقلّ مكتوبًا (identity.name غير null)
    return ["tamasuk", "intima", "hayawiyya"].some(function (ax) {
      return t[ax] && t[ax].identity && t[ax].identity.name != null;
    });
  }

  function renderResult(composed) {
    var typeKey = composed.primaryType ? ("type" + composed.primaryType) : null;

    if (!typeKey || !typeReady(typeKey)) {
      // الطابع غير مكتوبٍ بعد → شاشة «قريبًا» (لا كسر)
      var r0 = root();
      if (r0) r0.innerHTML = '<div class="ax-card ax-result">' + RND().pendingScreen() + "</div>";
      return;
    }

    var model = buildModel(composed);
    var r = root();
    if (r) r.innerHTML = '<div class="ax-card ax-result">' + RND().resultScreen(model) + "</div>";
    try { window.scrollTo(0, 0); } catch (e) {}

    // زرّ طباعةٍ إن وُجد لاحقًا في التقرير
    var pb = document.getElementById("axPrint");
    if (pb) pb.addEventListener("click", function () { window.print(); });
  }

  function init(options) {
    options = options || {};
    if (options.rootId) state.rootId = options.rootId;
    if (!root()) { console.error("[CROSS_APP] حاوية #" + state.rootId + " غير موجودة"); return; }

    var missing = [];
    if (!CFG())   missing.push("CROSS_CONFIG");
    if (!CONT())  missing.push("INTERSECTION_CONTENT");
    if (!ENG())   missing.push("CROSS_ENGINE");
    if (!STORE()) missing.push("CROSS_STORE");
    if (!RND())   missing.push("CROSS_RENDER");
    if (missing.length) { errorCard("تعذّر تحميل ملفّات التقاطع — الغائب: " + missing.join("، ")); return; }

    var user = STORE().requireAuth({ loginPath: options.loginPath || "../login.html" });
    if (!user) return;
    state.user = user;

    centered("نجمع صورتك المتكاملة…");

    STORE().loadBoth(user.id).then(function (bundle) {
      if (!bundle) { errorCard("تعذّر قراءة بياناتك. حاول لاحقًا."); return; }

      // إن نقص أحد المقياسين → رسالة إكمال
      if (!bundle.status.bothDone) {
        var r = root();
        if (r) r.innerHTML = '<div class="ax-card ax-result">' + RND().needBothScreen(bundle.status.missing) + "</div>";
        return;
      }

      // تركيب التقاطع
      var composed;
      try {
        composed = ENG().compose(bundle.mirrorResults, bundle.axesResults);
      } catch (e) {
        errorCard("تعذّر تركيب نقاط قوّتك: " + (e && e.message ? e.message : e));
        return;
      }

      // حارس: لا طابع أو لا مسار → لا يمكن التلوين
      if (!composed.ready.hasType || !composed.ready.hasPrimaryAxis) {
        var r2 = root();
        var miss = [];
        if (!composed.ready.hasType) miss.push("mirrors");
        if (!composed.ready.hasPrimaryAxis) miss.push("axes");
        if (r2) r2.innerHTML = '<div class="ax-card ax-result">' + RND().needBothScreen(miss) + "</div>";
        return;
      }

      renderResult(composed);

      // نقطة وصلٍ اختياريّة للمنصّة (لو احتجناها لاحقًا في التقرير/الأدمن)
      try { if (typeof global.onCrossComplete === "function") global.onCrossComplete(composed); } catch (e) {}
    }).catch(function (e) {
      errorCard("حدث خطأٌ أثناء القراءة: " + (e && e.message ? e.message : e));
    });
  }

  global.CROSS_APP = { init: init };
  console.log("✅ CROSS_APP جاهز");

})(window);
