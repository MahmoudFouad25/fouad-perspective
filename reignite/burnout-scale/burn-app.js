/* ════════════════════════════════════════════════════════════════════════
   burn-app.js — آلة حالة مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-app.js

   التنسيق فقط: لا حساب (المحرّك)، ولا HTML (العرض)، ولا Firestore (المخزن)،
   ولا نصوصٌ عربيّة (السلاسل). هذا الملفّ يقرّر «ماذا يُعرَض الآن» ولا شيء غير ذلك.

   ──────────────────────────────────────────────────────────────────────
   الأطوار:
     boot → deferred? → opening → instructions → dose(1..6) → result

   وداخل كل جرعة:
     doseOpen → page(0..n) → doseClose

   والانتقالات الخاصّة:
     بعد الجرعة ٢ : حساب الترتيب → سؤالٌ فارزٌ عند التعادل → قفل التفريع
     بعد الجرعة ٦ : حساب النتيجة كاملةً → عرض ضبط الجودة → الحفظ → النتيجة

   ──────────────────────────────────────────────────────────────────────
   ★ ثلاث قواعد يحرسها هذا الملفّ:

     ١) الحفظ داخل الجرعة في localStorage بندًا ببند، والكتابة في Firestore
        عند إغلاق الجرعة وحدها. فلا نُحمّل Firestore ٨٨ كتابة، ولا نخسر يومًا.

     ٢) بعد قفل التفريع تصير الجرعتان الأولى والثانية للقراءة فقط.
        لأنّ تغيير المحور بعد التفريع يترك المشارك بأبعادٍ من محورين،
        والنتيجة تفسد بلا أن ينتبه أحد.

     ٣) البنود المرشَّحة تُخزَّن وقت القفل ولا يُعاد ترشيحها. فلو عُدّل
        ملفّ البنود لاحقًا، لا يتلخبط من هو في نصف الرحلة.

   ──────────────────────────────────────────────────────────────────────
   التشغيل:
     BURN_APP.init({ rootId: 'burn-scale-root', loginPath: '../../login.html',
                     role: 'lead', cohortId: '...', alias: '...' })
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     ٠ — الوصول إلى الوحدات
     ═══════════════════════════════════════════════════════════════════ */
  function CFG()    { return global.BURN_CONFIG; }
  function ITEMS()  { return global.BURN_ITEMS; }
  function S()      { return global.BURN_STRINGS; }
  function ENG()    { return global.BURN_ENGINE; }
  function FLAGS()  { return global.BURN_FLAGS; }
  function STORE()  { return global.BURN_STORE; }
  function R()      { return global.BURN_RENDER; }
  function BRIDGE() { return global.BURN_BRIDGE || null; }   /* يصل في المرحلة ١٢ */

  function _log(m, x) { if (x !== undefined) console.log('[BURN_APP] ' + m, x); else console.log('[BURN_APP] ' + m); }
  function _err(m, e) { console.error('[BURN_APP] ' + m, e || ''); }

  /* ═══════════════════════════════════════════════════════════════════
     ١ — الحالة
     ═══════════════════════════════════════════════════════════════════ */
  var state = {
    rootId: 'burn-scale-root',
    loginPath: '../../login.html',
    user: null,
    doc: null,
    meta: {},                 /* role · cohortId · alias */

    phase: 'boot',            /* boot|deferred|opening|instructions|doseOpen|page|doseClose|tie|qcOffer|qcReview|result|specialResult|done|error */
    doseId: 1,
    pages: [],
    pageIndex: 0,

    values: {},               /* itemId → value (الجرعة الجارية + ما حُمّل) */
    itemTimer: {},            /* itemId → طابع زمنيّ لبداية العرض */

    lockedAxis: null,
    branchItems: [],

    tie: null,                /* بند السؤال الفارز المعروض */
    qcItems: [],

    result: null,
    flags: null,
    resultScreen: 1,

    busy: false,
    booted: false
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ — أدوات
     ═══════════════════════════════════════════════════════════════════ */

  function root() { return document.getElementById(state.rootId); }

  function paint(html) {
    var el = root();
    if (!el) { _err('حاوية #' + state.rootId + ' غير موجودة'); return; }
    el.innerHTML = html;
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function fail(kind, retryAction) { paint(R().error(kind, retryAction)); state.phase = 'error'; }

  /* كل الإجابات: المخزَّنة في الوثيقة + المحلّيّة في الكاش + الجارية */
  function allAnswers() {
    var out = {};
    var stored = (state.doc && state.doc.raw) ? state.doc.raw : {};
    Object.keys(stored).forEach(function (k) { out[k] = stored[k]; });

    var cached = STORE().cacheAnswers(state.user.id) || {};
    Object.keys(cached).forEach(function (k) { out[k] = cached[k]; });

    Object.keys(state.values).forEach(function (k) {
      if (state.values[k] !== undefined && state.values[k] !== null) {
        out[k] = { v: state.values[k], ms: (cached[k] && cached[k].ms) || null };
      }
    });
    return out;
  }

  /* تحميل الإجابات المخزَّنة إلى state.values ليظهر المختار عند العودة */
  function hydrateValues() {
    var merged = allAnswers();
    Object.keys(merged).forEach(function (k) {
      var c = merged[k];
      state.values[k] = (c && typeof c === 'object') ? c.v : c;
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ — بناء صفحات الجرعة

     قاعدة التقسيم:
       • بند الفلترة الثنائيّ  → صفحةٌ وحده
       • المشهد الثلاثيّ        → صفحةٌ لكل مشهد
       • العبارات المفردة       → خمسٌ في الصفحة، ولا تُخلَط كتلتان
     ═══════════════════════════════════════════════════════════════════ */

  var STATEMENTS_PER_PAGE = 5;

  /* أيّ مقدّمةٍ تُعرَض لأيّ كتلة */
  var INTRO_OF_BLOCK = {
    action: 'action', longing: 'longing', critique: 'critique',
    spectrum: 'spectrum', discrimination: null, pulse: null,
    env: 'env',
    slf: 'functionality', fue: null, agn: null, dbl: null,
    aut: 'aut',
    wbg: 'wbg',
    qc: null, filter: null
  };

  function itemsForDose(doseId) {
    var axis = state.lockedAxis;
    var dose = CFG().getDose(doseId);

    /* الجرعات ٣ إلى ٥ متفرّعة: نستعمل القائمة المخزَّنة وقت القفل إن وُجدت */
    if (dose && dose.branched && state.branchItems && state.branchItems.length) {
      var byId = {};
      ITEMS().all().forEach(function (it) { byId[it.id] = it; });
      var branchSet = {};
      state.branchItems.forEach(function (id) { branchSet[id] = true; });

      return ITEMS().byDose(doseId)
        .filter(function (it) {
          if (it.visibility === 'conditional') return false;
          if (it.visibility === 'branch') return !!branchSet[it.id];
          return true;
        })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }

    return ITEMS().forParticipant(axis, doseId);
  }

  function buildPages(doseId) {
    var items = itemsForDose(doseId);
    var pages = [];
    var introShown = {};

    var i = 0;
    while (i < items.length) {
      var it = items[i];

      /* (أ) بند الفلترة الثنائيّ */
      if (it.block === 'filter') {
        pages.push({ type: 'boolean', items: [it], intro: null });
        i++;
        continue;
      }

      /* (ب) المشهد الثلاثيّ */
      if (it.scene) {
        var sceneId = it.scene;
        var group = [];
        while (i < items.length && items[i].scene === sceneId) { group.push(items[i]); i++; }
        var introKey = INTRO_OF_BLOCK[it.block];
        var intro = (introKey && !introShown[introKey]) ? ITEMS().blockIntros[introKey] : null;
        if (intro) introShown[introKey] = true;
        pages.push({ type: 'scene', scene: ITEMS().scenes[sceneId], items: group, intro: intro });
        continue;
      }

      /* (ج) عباراتٌ مفردة — لا تُخلَط كتلتان في صفحة */
      var blockKey = it.block;
      var chunk = [];
      while (i < items.length && items[i].block === blockKey &&
             !items[i].scene && chunk.length < STATEMENTS_PER_PAGE) {
        chunk.push(items[i]); i++;
      }
      var ik = INTRO_OF_BLOCK[blockKey];
      var intro2 = (ik && !introShown[ik]) ? ITEMS().blockIntros[ik] : null;
      if (intro2) introShown[ik] = true;
      pages.push({ type: 'statements', items: chunk, intro: intro2 });
    }

    return pages;
  }

  function doseTotalItems(doseId) { return itemsForDose(doseId).length; }

  function doseAnsweredCount(doseId) {
    var ids = itemsForDose(doseId).map(function (x) { return x.id; });
    var n = 0;
    ids.forEach(function (id) {
      if (state.values[id] !== undefined && state.values[id] !== null) n++;
    });
    return n;
  }

  function pageMissing(page) {
    var n = 0;
    (page.items || []).forEach(function (it) {
      if (state.values[it.id] === undefined || state.values[it.id] === null) n++;
    });
    return n;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ — العرض
     ═══════════════════════════════════════════════════════════════════ */

  function renderPage() {
    var page = state.pages[state.pageIndex];
    if (!page) return renderDoseClose();

    var blocks = [];
    if (page.type === 'scene') {
      blocks.push(R().sceneBlock(page.scene, page.items, state.values));
    } else if (page.type === 'boolean') {
      page.items.forEach(function (it) { blocks.push(R().booleanBlock(it, state.values[it.id])); });
    } else {
      page.items.forEach(function (it) { blocks.push(R().statementBlock(it, state.values[it.id])); });
    }

    var isLastPage = (state.pageIndex >= state.pages.length - 1);
    var missing = pageMissing(page);

    paint(R().doseScreen({
      doseId: state.doseId,
      answered: doseAnsweredCount(state.doseId),
      totalItems: doseTotalItems(state.doseId),
      blocks: blocks,
      introText: page.intro,
      showShortInstructions: (state.pageIndex === 0 && state.doseId > 1),
      isLastPage: isLastPage,
      isLastDose: (state.doseId >= CFG().meta.totalDoses),
      canGoBack: (state.pageIndex > 0),
      missingCount: missing,
      nextDisabled: false
    }));

    /* توقيت العرض لكل بندٍ في الصفحة — أساسُ زمن الاستجابة */
    var now = Date.now();
    (page.items || []).forEach(function (it) { state.itemTimer[it.id] = now; });

    state.phase = 'page';
  }

  function renderDoseOpen() {
    state.phase = 'doseOpen';
    paint(R().doseOpen(state.doseId, null));
  }

  function renderDoseClose() {
    state.phase = 'doseClose';
    paint(R().doseClosing(state.doseId, state.doseId >= CFG().meta.totalDoses));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ — التقاط الإجابات
     ═══════════════════════════════════════════════════════════════════ */

  function recordAnswer(itemId, value) {
    var started = state.itemTimer[itemId] || Date.now();
    var ms = Math.max(0, Date.now() - started);
    state.values[itemId] = value;
    STORE().cacheAnswer(state.user.id, itemId, value, ms);
    /* البند التالي في الصفحة يُقاس من هذه اللحظة */
    state.itemTimer[itemId] = Date.now();
  }

  function refreshCurrentPage() {
    /* إعادة رسمٍ خفيفةٌ تحافظ على موضع التمرير */
    var y = 0;
    try { y = window.scrollY || 0; } catch (e) {}
    renderPage();
    try { window.scrollTo(0, y); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ — إغلاق الجرعة
     ═══════════════════════════════════════════════════════════════════ */

  async function closeDose() {
    if (state.busy) return;
    state.busy = true;

    try {
      var ids = itemsForDose(state.doseId).map(function (x) { return x.id; });
      var cached = STORE().cacheAnswers(state.user.id) || {};

      var answers = {};
      ids.forEach(function (id) {
        if (state.values[id] === undefined || state.values[id] === null) return;
        var c = cached[id];
        answers[id] = {
          v: state.values[id],
          ms: (c && typeof c === 'object' && typeof c.ms === 'number') ? c.ms : null
        };
      });

      /* الفلاتر تُخزَّن في حقلها الخاصّ أيضًا */
      var patch = { filters: {} };
      if (state.values['PRE_FLT_01'] !== undefined) patch.filters.acuteCrisis = state.values['PRE_FLT_01'];
      if (state.values['PRE_FLT_02'] !== undefined) patch.filters.recentChange = state.values['PRE_FLT_02'];
      if (state.meta.role) patch.role = state.meta.role;

      var res = await STORE().saveDose(state.user.id, state.doseId, answers, patch);
      if (!res.ok) { state.busy = false; return fail('save', 'retry-close'); }

      state.doc = await STORE().load(state.user.id);

      /* ── الانتقال الخاصّ بعد الجرعة الثانية ── */
      if (state.doseId === 2 && !state.lockedAxis) {
        state.busy = false;
        return await afterDoseTwo();
      }

      /* ── الانتقال الخاصّ بعد الجرعة الأخيرة ── */
      if (state.doseId >= CFG().meta.totalDoses) {
        state.busy = false;
        return await finalize();
      }

      state.doseId = Math.min(state.doseId + 1, CFG().meta.totalDoses);
      state.pages = buildPages(state.doseId);
      state.pageIndex = 0;
      state.busy = false;

      if (isGated()) return renderGated();
      renderDoseOpen();

    } catch (e) {
      _err('closeDose error:', e);
      state.busy = false;
      fail('save', 'retry-close');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ — بعد الجرعة الثانية: الترتيب والتعادل والقفل
     ═══════════════════════════════════════════════════════════════════ */

  async function afterDoseTwo() {
    var raw = allAnswers();
    var ranking = ENG().computeRanking(raw);

    var progress = (state.doc && state.doc.progress) || {};

    /* ── التعادل: يُعرَض سؤالٌ فارزٌ واحدٌ فورًا ── */
    if (ranking.needsTieBreaker && ranking.tiePair && !progress.tieAsked) {
      var tie = ITEMS().tieBreakerFor(ranking.tiePair[0], ranking.tiePair[1]);
      if (tie) {
        state.tie = tie;
        state.phase = 'tie';
        paint(R().tieBreaker(tie, ITEMS().tieBreakerIntro));
        return;
      }
    }

    var chosen = progress.tieChoice || null;
    await lockAndProceed(chosen ? ENG().applyTieBreaker(ranking, chosen) : ranking);
  }

  async function onTieChoice(axisId) {
    if (state.busy) return;
    state.busy = true;
    try {
      var raw = allAnswers();
      var ranking = ENG().applyTieBreaker(ENG().computeRanking(raw), axisId);
      await STORE().saveDose(state.user.id, 2, {}, { tieAsked: true, tieChoice: axisId });
      state.doc = await STORE().load(state.user.id);
      state.busy = false;
      await lockAndProceed(ranking);
    } catch (e) {
      _err('onTieChoice error:', e);
      state.busy = false;
      fail('save', 'retry-close');
    }
  }

  async function lockAndProceed(ranking) {
    var axis = ranking.primary;

    /* ★ البنود المرشَّحة تُحسَب مرّةً وتُخزَّن، ولا يُعاد ترشيحها.
       فلو عُدّل ملفّ البنود لاحقًا، لا يتلخبط من هو في نصف الرحلة. */
    var branch = [];
    [3, 4, 5].forEach(function (d) {
      ITEMS().forParticipant(axis, d).forEach(function (it) { branch.push(it.id); });
    });

    var snapshot = {
      primary: ranking.primary,
      secondary: ranking.secondary,
      repressed: ranking.repressed,
      repressionScore: ranking.repressionScore,
      repressionClass: ranking.repressionClass,
      axes: ranking.axes
    };

    var lock = await STORE().lockBranch(state.user.id, axis, branch, snapshot);

    if (!lock.ok && lock.error === 'already-locked') {
      /* الوثيقة مقفولةٌ بمحورٍ آخر — نحترم القفل ولا نتجاوزه */
      _log('القفل قائمٌ بمحور ' + lock.lockedAxis + ' — نتابع به');
      state.lockedAxis = lock.lockedAxis;
      state.branchItems = lock.branchItems || [];
    } else if (lock.ok) {
      state.lockedAxis = lock.lockedAxis || axis;
      state.branchItems = lock.branchItems && lock.branchItems.length ? lock.branchItems : branch;
    } else {
      return fail('save', 'retry-close');
    }

    state.doc = await STORE().load(state.user.id);
    state.doseId = 3;
    state.pages = buildPages(3);
    state.pageIndex = 0;

    if (isGated()) return renderGated();
    renderDoseOpen();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ — الإنهاء: الحساب وضبط الجودة والحفظ
     ═══════════════════════════════════════════════════════════════════ */

  async function finalize() {
    paint(R().resultLoading());
    state.phase = 'result';

    try {
      var raw = allAnswers();
      var progress = (state.doc && state.doc.progress) || {};

      var result = ENG().computeAll(raw, {
        role: state.meta.role || (state.doc && state.doc.meta && state.doc.meta.role) || 'lead',
        primaryOverride: progress.lockedAxis || state.lockedAxis || null,
        tieChoice: progress.tieChoice || null
      });

      /* ── عرض المراجعة عند رفع علامة ضبط الجودة ──
         ★ بلا لومٍ وبإذنٍ صريحٍ بالرفض. و«أكمل كما هي» مسموحٌ تمامًا. */
      if (result.qualityCheck && result.qualityCheck.raised && !progress.qcReviewOffered) {
        state.result = result;
        state.qcItems = (result.qualityCheck.reviewIds || [])
          .map(function (id) { return ITEMS().byId(id); })
          .filter(Boolean);
        state.phase = 'qcOffer';
        await STORE().saveDose(state.user.id, 6, {}, { qcReviewOffered: true });
        state.doc = await STORE().load(state.user.id);
        return paint(R().qualityCheckOffer());
      }

      await commitResult(result);

    } catch (e) {
      _err('finalize error:', e);
      fail('generic', 'retry-finalize');
    }
  }

  async function commitResult(result) {
    var flags = FLAGS().evaluate(result, allAnswers());
    var saved = await STORE().saveResult(state.user.id, result, flags);
    if (!saved.ok) return fail('save', 'retry-finalize');

    state.result = result;
    state.flags = flags;
    state.doc = await STORE().load(state.user.id);
    STORE().cacheClear(state.user.id);

    try {
      if (typeof global.onBurnComplete === 'function') global.onBurnComplete(result, flags);
    } catch (e) {}

    state.resultScreen = 1;
    renderResult();
  }

  async function onQcReview() {
    state.phase = 'qcReview';
    paint(R().qualityCheckReview(state.qcItems, state.values));
    var now = Date.now();
    state.qcItems.forEach(function (it) { state.itemTimer[it.id] = now; });
  }

  async function onQcDone(accepted) {
    if (state.busy) return;
    state.busy = true;
    try {
      var answers = {};
      var cached = STORE().cacheAnswers(state.user.id) || {};
      state.qcItems.forEach(function (it) {
        if (state.values[it.id] === undefined || state.values[it.id] === null) return;
        var c = cached[it.id];
        answers[it.id] = { v: state.values[it.id], ms: (c && c.ms) || null };
      });

      await STORE().saveDose(state.user.id, 6, answers, { qcReviewAccepted: !!accepted });
      state.doc = await STORE().load(state.user.id);

      var raw = allAnswers();
      var progress = (state.doc && state.doc.progress) || {};
      var result = ENG().computeAll(raw, {
        role: state.meta.role || 'lead',
        primaryOverride: progress.lockedAxis || state.lockedAxis || null,
        tieChoice: progress.tieChoice || null
      });

      state.busy = false;
      paint(R().resultLoading());
      await commitResult(result);

    } catch (e) {
      _err('onQcDone error:', e);
      state.busy = false;
      fail('save', 'retry-finalize');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٩ — شاشات النتيجة

     الوسيط إلى المحتوى: يُفوَّض إلى BURN_BRIDGE إن كان محمَّلًا،
     وإلّا تُعرَض شاشةٌ تشخيصيّةٌ مؤقّتةٌ حتى يصل المحتوى — فالمقياس
     يُختبَر بنيويًّا قبل أن يُستثمَر في النصوص.
     ═══════════════════════════════════════════════════════════════════ */

  function renderResult() {
    state.phase = 'result';
    var br = BRIDGE();
    var special = state.flags && state.flags.specialScreen;

    /* ── شاشةٌ خاصّةٌ تحلّ محلّ الثلاث ── */
    if (special) {
      var sBlock = br ? br.blockById(special, state.result) : _placeholderSpecial(special);
      var sPractice = br ? br.practiceHtml(state.result) : '';
      state.phase = 'specialResult';
      return paint(R().specialResultScreen(sBlock, sPractice));
    }

    if (!br) return paint(_diagnosticScreen());

    var screenNo = state.resultScreen;
    var blocksHtml = br.screenHtml(screenNo, state.result, state.flags);
    paint(R().resultScreen(screenNo, blocksHtml, { reopenNote: true }));
  }

  function _placeholderSpecial(id) {
    return { title: id, body: ['(المحتوى النصّيّ لم يُحمَّل بعد.)'] };
  }

  /* شاشةٌ تشخيصيّةٌ مؤقّتة — تختفي فور تحميل المحتوى والجسر */
  function _diagnosticScreen() {
    var r = state.result, f = state.flags, cfg = CFG();
    var ax = cfg.getAxis(r.primary) || {};
    var dim = cfg.getDim(r.primary, r.targetDim) || {};
    var esc = R().esc;

    var rows = [
      ['المحور الرئيسيّ', ax.name || r.primary],
      ['الفرعيّ', (cfg.getAxis(r.secondary) || {}).name || r.secondary],
      ['المكبوت', (cfg.getAxis(r.repressed) || {}).name || r.repressed],
      ['تصنيف الكبت', r.repressionClass + ' (' + r.repressionScore + ')'],
      ['البُعد الهدف', (dim.name || r.targetDim) + ' — ' + (S().labels.stateNames[r.targetCls] || r.targetCls)],
      ['شدّة البُعد', r.targetSeverity],
      ['شدّة المحور', r.axisSeverity + ' (' + r.axisSeverityClass + ')'],
      ['البيئة', 'ENV ' + r.environment.ENV + ' · RCV ' + r.environment.RCV + ' · ' + r.environment.flag],
      ['الوظيفية', 'SLF ' + r.functionality.SLF + ' · FUE ' + r.functionality.FUE +
                   ' · AGN ' + r.functionality.AGN + ' · DBL ' + r.functionality.DBL],
      ['الحركة', r.functionality.move],
      ['الوجه الآليّ', r.functionality.AUT + ' (' + r.functionality.autShow + ')'],
      ['خطّ العافية', 'توقّد ' + r.wellbeing.vig + ' · حضور ' + r.wellbeing.prs + ' · امتلاء ' + r.wellbeing.ful],
      ['التطابق', r.matchesAxis ? 'مطابق' : 'غير مطابق'],
      ['الميل النوعيّ', JSON.stringify(r.typeLean.pct)],
      ['العلامات', (f.clientShown || []).join('، ') || '—'],
      ['المفتاح', r.textKey]
    ].map(function (p) {
      return '<div class="bn-diag-row"><span class="bn-diag-k">' + esc(p[0]) +
             '</span><span class="bn-diag-v">' + esc(String(p[1])) + '</span></div>';
    }).join('');

    return R().card(
      '<div class="bn-kicker">معاينةٌ بنيويّةٌ مؤقّتة</div>' +
      '<h2 class="bn-title">الحساب اكتمل</h2>' +
      '<p class="bn-p">هذه ليست شاشة النتيجة. المحتوى النصّيّ لم يُحمَّل بعد، فتُعرَض القيم المحسوبة للتحقّق منها.</p>' +
      '<div class="bn-diag">' + rows + '</div>' +
      R().spectrumSet(r.dimensions, r.targetDim) +
      R().wellbeingBars(r.wellbeing)
    );
  }

  function resultNext() {
    var total = CFG().resultScreens.length;
    if (state.resultScreen < total) { state.resultScreen++; renderResult(); }
    else resultClose();
  }

  function resultBack() {
    if (state.resultScreen > 1) { state.resultScreen--; renderResult(); }
  }

  function resultClose() {
    state.phase = 'done';
    paint(R().card(
      '<div class="bn-centered">' +
        '<div class="bn-check">✓</div>' +
        '<p class="bn-p">' + R().esc(S().result.reopenNote) + '</p>' +
      '</div>'
    ));
    try { if (typeof global.onBurnClosed === 'function') global.onBurnClosed(state.result); } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٠ — التأجيل والبوّابة الزمنيّة
     ═══════════════════════════════════════════════════════════════════ */

  function isGated() {
    var g = CFG().doseGating;
    if (!g || !g.enabled) return false;
    var p = (state.doc && state.doc.progress) || {};
    if (!p.lastDoseAt) return false;
    var last = p.lastDoseAt.toMillis ? p.lastDoseAt.toMillis() : Number(p.lastDoseAt);
    if (!last) return false;
    return (Date.now() - last) < (g.minHoursBetweenDoses * 3600 * 1000);
  }

  function renderGated() {
    var g = CFG().doseGating;
    var p = (state.doc && state.doc.progress) || {};
    var last = p.lastDoseAt && p.lastDoseAt.toMillis ? p.lastDoseAt.toMillis() : Number(p.lastDoseAt || 0);
    var remain = Math.max(1, Math.ceil((g.minHoursBetweenDoses * 3600 * 1000 - (Date.now() - last)) / 3600000));
    state.phase = 'doseOpen';
    paint(R().card(
      '<h2 class="bn-title">' + R().esc(S().dose.gatedTitle) + '</h2>' +
      R().paras(S().fill(S().dose.gatedBody, { hours: S().arabicNum(remain) }))
    ));
  }

  async function onDefer() {
    await STORE().setDeferral(state.user.id, 2);
    state.doc = await STORE().load(state.user.id);
    renderDeferred();
  }

  function renderDeferred() {
    var p = (state.doc && state.doc.progress) || {};
    var until = p.deferredUntil ? new Date(Number(p.deferredUntil)) : null;
    var label = until ? until.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) : '';
    state.phase = 'deferred';
    paint(R().deferredWaiting(label));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١١ — معالجة الأحداث
     ═══════════════════════════════════════════════════════════════════ */

  function bindEvents() {
    var el = root();
    if (!el || el._bnBound) return;
    el._bnBound = true;

    el.addEventListener('click', function (ev) {

      /* ليكرت */
      var lik = ev.target.closest('[data-bn-value]');
      if (lik) {
        var id = lik.getAttribute('data-bn-item');
        var v = parseInt(lik.getAttribute('data-bn-value'), 10);
        recordAnswer(id, v);
        if (state.phase === 'qcReview') {
          paint(R().qualityCheckReview(state.qcItems, state.values));
        } else {
          refreshCurrentPage();
        }
        return;
      }

      /* ثنائيّ (نعم/لا) */
      var bo = ev.target.closest('[data-bn-bool]');
      if (bo) {
        var bid = bo.getAttribute('data-bn-item');
        var bv = (bo.getAttribute('data-bn-bool') === 'yes');
        recordAnswer(bid, bv);
        /* ★ الفلترة تُرفع للمدرّب فورًا، بلا انتظار إكمال المقياس */
        if (bid === 'PRE_FLT_01') {
          STORE().flagFilterImmediately(state.user.id, 'acuteCrisis', bv);
          if (bv === true) { state.phase = 'deferOffer'; return paint(R().deferralOffer()); }
        }
        if (bid === 'PRE_FLT_02') STORE().flagFilterImmediately(state.user.id, 'recentChange', bv);
        refreshCurrentPage();
        return;
      }

      /* السؤال الفارز */
      var tie = ev.target.closest('[data-bn-tie]');
      if (tie) { onTieChoice(tie.getAttribute('data-bn-tie')); return; }

      /* الأزرار */
      var b = ev.target.closest('[data-bn-action]');
      if (!b) return;
      handleAction(b.getAttribute('data-bn-action'));
    });
  }

  function handleAction(action) {
    switch (action) {

      case 'start':
        state.phase = 'instructions';
        return paint(R().instructions());

      case 'instructions-done':
        state.pages = buildPages(state.doseId);
        state.pageIndex = 0;
        return renderDoseOpen();

      case 'dose-begin':
        return renderPage();

      case 'next':
        if (state.pageIndex < state.pages.length - 1) { state.pageIndex++; return renderPage(); }
        return renderDoseClose();

      case 'back':
        /* ★ بعد قفل التفريع تصير الجرعتان ١ و٢ للقراءة فقط */
        if (state.pageIndex > 0) { state.pageIndex--; return renderPage(); }
        return;

      case 'dose-close':
      case 'retry-close':
        return renderDoseClose();

      case 'dose-done':
        return closeDose();

      case 'to-result':
        return closeDose();

      case 'retry-finalize':
        return finalize();

      case 'defer':
        return onDefer();

      case 'continue-anyway':
        return refreshCurrentPage();

      case 'start-early':
        STORE().clearDeferral(state.user.id).then(function () { boot(true); });
        return;

      case 'qc-review':
        return onQcReview();

      case 'qc-skip':
        return onQcDone(false);

      case 'qc-done':
        return onQcDone(true);

      case 'result-next':
        return resultNext();

      case 'result-back':
        return resultBack();

      case 'result-close':
        return resultClose();

      case 'view-result':
        state.resultScreen = 1;
        return renderResult();

      case 'continue':
        state.pages = buildPages(state.doseId);
        state.pageIndex = 0;
        return isGated() ? renderGated() : renderDoseOpen();

      case 'restart-dose':
        return restartDose();

      default:
        _log('إجراءٌ غير معروف: ' + action);
    }
  }

  /* إعادة بدء الجرعة من أوّلها — عند العودة من جهازٍ آخر */
  function restartDose() {
    var ids = itemsForDose(state.doseId).map(function (x) { return x.id; });
    var storedRaw = (state.doc && state.doc.raw) ? state.doc.raw : {};
    ids.forEach(function (id) {
      if (!storedRaw[id]) delete state.values[id];   /* المحفوظ في Firestore يبقى */
    });
    STORE().cacheClearDose(state.user.id, ids);
    state.pages = buildPages(state.doseId);
    state.pageIndex = 0;
    renderDoseOpen();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٢ — الإقلاع
     ═══════════════════════════════════════════════════════════════════ */

  async function boot(skipDeferralCheck) {
    state.phase = 'boot';
    paint(R().loading());

    /* الهويّة */
    var user = STORE().requireAuth({ loginPath: state.loginPath });
    if (!user) return;
    state.user = user;

    /* الوثيقة */
    var doc = await STORE().loadOrCreate(user.id, {
      cohortId: state.meta.cohortId,
      alias: state.meta.alias,
      role: state.meta.role,
      courseId: state.meta.courseId
    });
    if (!doc) return fail('load', 'retry-boot');
    state.doc = doc;

    var p = doc.progress || {};

    /* التأجيل */
    if (!skipDeferralCheck && p.deferred && p.deferredUntil && Date.now() < Number(p.deferredUntil)) {
      return renderDeferred();
    }

    /* القفل */
    state.lockedAxis = p.lockedAxis || null;
    state.branchItems = p.branchItems || [];

    /* الإجابات */
    hydrateValues();

    /* مكتمل؟ */
    if (p.completed && doc.computed) {
      state.result = doc.computed;
      state.flags = doc.flags || FLAGS().evaluate(doc.computed, doc.raw || {});
      state.phase = 'resume';
      return paint(R().resume('completed', {}));
    }

    /* استئناف */
    var done = p.dosesCompleted || [];
    state.doseId = Math.min(p.currentDose || 1, CFG().meta.totalDoses);

    if (done.length === 0 && !STORE().cacheGet(user.id)) {
      state.phase = 'opening';
      return paint(R().opening());
    }

    /* هل كان في وسط جرعة؟ */
    var cache = STORE().cacheGet(user.id);
    var midDose = cache && cache.dose === state.doseId &&
                  done.indexOf(state.doseId) === -1 &&
                  Object.keys(cache.data || {}).length > 0;

    state.phase = 'resume';
    if (midDose && !CFG().doseGating.resumeMidDose) {
      return paint(R().resume('mid-dose', { dose: state.doseId }));
    }
    paint(R().resume('between', { done: done.length, total: CFG().meta.totalDoses }));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٣ — سؤال دقّة الخريطة (الأسبوع الثاني) — واجهةٌ مستقلّة
     ═══════════════════════════════════════════════════════════════════ */
  async function askAccuracy(containerId) {
    var el = document.getElementById(containerId || state.rootId);
    if (!el) return;
    var r = S().result;
    var cells = '';
    for (var i = 1; i <= 10; i++) {
      cells += '<button class="bn-likert" data-bn-acc="' + i + '">' + S().arabicNum(i) + '</button>';
    }
    el.innerHTML = R().card(
      '<h2 class="bn-title">' + R().esc(r.accuracyTitle) + '</h2>' +
      '<p class="bn-p">' + R().esc(r.accuracyBody) + '</p>' +
      '<div class="bn-scale">' + cells + '</div>' +
      '<div class="bn-scale-labels"><span>' + R().esc(r.accuracyLow) +
      '</span><span>' + R().esc(r.accuracyHigh) + '</span></div>'
    );
    el.addEventListener('click', async function (ev) {
      var b = ev.target.closest('[data-bn-acc]');
      if (!b) return;
      var score = parseInt(b.getAttribute('data-bn-acc'), 10);
      var u = STORE().getCurrentUser();
      if (u) await STORE().saveAccuracy(u.id, score);
      var min = CFG().thresholds.display.accuracyMinScore;
      el.innerHTML = R().card('<div class="bn-centered"><p class="bn-p">' +
        R().esc(score < min ? r.accuracyFollowUp : r.accuracyThanks) + '</p></div>');
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٤ — التهيئة
     ═══════════════════════════════════════════════════════════════════ */

  function init(options) {
    options = options || {};
    state.rootId = options.rootId || 'burn-scale-root';
    state.loginPath = options.loginPath || '../../login.html';
    state.meta = {
      role: options.role || null,
      cohortId: options.cohortId || null,
      alias: options.alias || null,
      courseId: options.courseId || null
    };

    if (!root()) { _err('حاوية #' + state.rootId + ' غير موجودة'); return; }

    /* فحص الوحدات قبل الإقلاع */
    var missing = [];
    if (!CFG())   missing.push('BURN_CONFIG');
    if (!ITEMS()) missing.push('BURN_ITEMS');
    if (!S())     missing.push('BURN_STRINGS');
    if (!ENG())   missing.push('BURN_ENGINE');
    if (!FLAGS()) missing.push('BURN_FLAGS');
    if (!STORE()) missing.push('BURN_STORE');
    if (!R())     missing.push('BURN_RENDER');
    if (missing.length) {
      _err('وحداتٌ ناقصة: ' + missing.join('، '));
      root().innerHTML = '<pre dir="ltr">Missing: ' + missing.join(', ') + '</pre>';
      return;
    }

    /* تحقّق السلامة في التطوير */
    try {
      var vi = ENG().verifyIntegrity();
      if (!vi.ok) console.warn('[BURN_APP] تحذيرات سلامة المحرّك:', vi.issues);
      var vf = FLAGS().verifyIntegrity();
      if (!vf.ok) console.warn('[BURN_APP] تحذيرات سلامة العلامات:', vf.issues);
    } catch (e) {}

    bindEvents();
    state.booted = true;
    boot(false);
  }

  /* واجهةٌ مصغَّرةٌ للتشخيص */
  function debug() {
    return {
      phase: state.phase,
      doseId: state.doseId,
      pageIndex: state.pageIndex,
      pages: state.pages.length,
      lockedAxis: state.lockedAxis,
      branchItems: state.branchItems.length,
      answered: Object.keys(state.values).length,
      hasResult: !!state.result
    };
  }

  global.BURN_APP = {
    init: init,
    askAccuracy: askAccuracy,
    debug: debug,
    _state: state
  };

  console.log('✅ BURN_APP جاهز');

})(window);
