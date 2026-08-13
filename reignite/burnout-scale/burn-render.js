/* ════════════════════════════════════════════════════════════════════════
   burn-render.js — توليد واجهة مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-render.js

   عرضٌ نقيّ: لا حالة، لا منطق قرار، لا Firestore، لا حساب.
   يأخذ بياناتٍ ويُرجع سلاسل HTML. كل دالّةٍ هنا نقيّةٌ بالمعنى الدقيق:
   نفس المدخل يُعطي نفس المخرج دائمًا.

   ──────────────────────────────────────────────────────────────────────
   ★ قاعدةٌ ملزِمةٌ لهذا الملفّ:
     لا كلمةً عربيّةً واحدةً مكتوبةً هنا. كل نصٍّ يأتي من BURN_STRINGS
     أو من البيانات الممرَّرة. فلو أردتَ تعديل نبرةٍ، تعدّلها في ملفٍّ
     واحدٍ ولا تطاردها في الكود.

   ★ البادئة .bn- على كل صنفٍ في الـCSS، منفصلةً تمامًا عن .ax- (مقياس
     المحاور) و.fp- (المرايا)، فتتعايش الصفحات بلا تصادم.

   ──────────────────────────────────────────────────────────────────────
   الأقسام:
     ١ — أدوات (تهريب، أسطر، أرقام)
     ٢ — عناصر مشتركة (البطاقة، الشريط، الأزرار)
     ٣ — شاشات التمهيد (الافتتاح، التعليمات، الاستئناف، التأجيل)
     ٤ — شاشات الجرعة (المشهد، العبارة المفردة، الاختيار الثنائيّ)
     ٥ — شاشات الانتقال (إغلاق الجرعة، ضبط الجودة، السؤال الفارز)
     ٦ — شاشات النتيجة الثلاث
     ٧ — الرسوم (شريط الطيف، خطّ العافية)
     ٨ — النبضة الأسبوعيّة
     ٩ — حالات النظام (تحميل، خطأ)
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════
     ٠ — الوصول إلى البيانات الثابتة
     ═══════════════════════════════════════════════════════════════════ */
  function CFG() { return (typeof BURN_CONFIG  !== 'undefined') ? BURN_CONFIG  : global.BURN_CONFIG; }
  function S()   { return (typeof BURN_STRINGS !== 'undefined') ? BURN_STRINGS : global.BURN_STRINGS; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ — أدوات
     ═══════════════════════════════════════════════════════════════════ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nl2br(s) { return String(s == null ? '' : s).replace(/\n/g, '<br>'); }

  /* نصٌّ متعدّد الفقرات: كل سطرين فارغين فقرةٌ مستقلّة */
  function paras(text, className) {
    if (!text) return '';
    var cls = className || 'bn-p';
    return String(text).split(/\n{2,}/).map(function (p) {
      return '<p class="' + cls + '">' + nl2br(esc(p.trim())) + '</p>';
    }).join('');
  }

  /* مصفوفة فقرات */
  function paraList(arr, className) {
    if (!arr || !arr.length) return '';
    var cls = className || 'bn-p';
    return arr.map(function (p) {
      return '<p class="' + cls + '">' + nl2br(esc(p)) + '</p>';
    }).join('');
  }

  function num(n) { return S().arabicNum(n); }

  function attr(v) { return esc(v == null ? '' : v); }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ — عناصر مشتركة
     ═══════════════════════════════════════════════════════════════════ */

  function card(inner, extraClass) {
    return '<div class="bn-card' + (extraClass ? ' ' + extraClass : '') + '">' + inner + '</div>';
  }

  function progressBar(done, total, label) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '' +
      '<div class="bn-progress-row">' +
        '<span class="bn-progress-label">' + esc(label || '') + '</span>' +
        '<div class="bn-progress-bar"><div class="bn-progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  function btn(label, action, style, disabled) {
    return '<button class="bn-btn ' + (style || 'primary') + '"' +
           ' data-bn-action="' + attr(action) + '"' +
           (disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
  }

  function navRow(buttons) {
    return '<div class="bn-nav">' + buttons.join('') + '</div>';
  }

  function kicker(text) {
    return text ? '<div class="bn-kicker">' + esc(text) + '</div>' : '';
  }

  function ayah(text) {
    return '<div class="bn-ayah">' + esc(text) + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ — شاشات التمهيد
     ═══════════════════════════════════════════════════════════════════ */

  function opening() {
    var o = S().opening;
    return card(
      '<div class="bn-centered">' + ayah(o.ayah) + '</div>' +
      '<h2 class="bn-title">' + esc(o.title) + '</h2>' +
      paraList(o.body) +
      '<div class="bn-note">' +
        '<div class="bn-note-label">' + esc(o.privacyLabel) + '</div>' +
        '<p class="bn-p">' + esc(o.privacy) + '</p>' +
      '</div>' +
      '<div class="bn-note">' +
        '<div class="bn-note-label">' + esc(o.timeLabel) + '</div>' +
        '<p class="bn-p">' + esc(o.time) + '</p>' +
      '</div>' +
      navRow([ btn(o.startBtn, 'start') ])
    , 'bn-opening');
  }

  function instructions() {
    var ins = S().instructions;
    var rules = ins.rules.map(function (r) {
      return '<div class="bn-rule">' +
               '<div class="bn-rule-head">' + esc(r.head) + '</div>' +
               '<div class="bn-rule-body">' + esc(r.body) + '</div>' +
             '</div>';
    }).join('');
    return card(
      '<h2 class="bn-title">' + esc(ins.title) + '</h2>' +
      rules +
      navRow([ btn(ins.understoodBtn, 'instructions-done') ])
    );
  }

  function instructionsShort() {
    return '<div class="bn-instructions-short">' + esc(S().instructions.short) + '</div>';
  }

  /* شاشة الاستئناف — ثلاث حالات */
  function resume(mode, data) {
    var r = S().resume;
    data = data || {};
    var body = '', actions = [];

    if (mode === 'completed') {
      body = paras(r.completed);
      actions = [ btn(r.viewResultBtn, 'view-result') ];
    } else if (mode === 'mid-dose') {
      body = paras(S().fill(r.midDose, { n: num(data.dose) }));
      actions = [ btn(r.restartDoseBtn, 'restart-dose') ];
    } else {
      body = paras(S().fill(r.betweenDoses, {
        done: num(data.done), total: num(data.total)
      }));
      actions = [ btn(r.continueBtn, 'continue') ];
    }

    return card('<h2 class="bn-title">' + esc(r.title) + '</h2>' + body + navRow(actions));
  }

  /* شاشة عرض التأجيل — بعد «نعم» على سؤال الأزمة الحادّة */
  function deferralOffer() {
    var f = S().filter;
    return card(
      '<h2 class="bn-title">' + esc(f.deferralTitle) + '</h2>' +
      paraList(f.deferralBody) +
      navRow([
        btn(f.deferBtn, 'defer', 'ghost'),
        btn(f.continueAnywayBtn, 'continue-anyway')
      ])
    );
  }

  /* شاشة من أجّل ثم عاد قبل الموعد */
  function deferredWaiting(untilLabel) {
    var f = S().filter;
    return card(
      '<h2 class="bn-title">' + esc(f.deferredTitle) + '</h2>' +
      paras(S().fill(f.deferredBody, { date: untilLabel })) +
      navRow([ btn(f.startEarlyBtn, 'start-early', 'ghost') ])
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ — شاشات الجرعة
     ═══════════════════════════════════════════════════════════════════ */

  /* شاشة فتح الجرعة */
  function doseOpen(doseId, introText) {
    var d = S().dose;
    var cfg = CFG();
    return card(
      kicker(S().fill(d.headerOfTotal, { n: num(doseId), total: num(cfg.meta.totalDoses) })) +
      '<h2 class="bn-title">' + esc(d.openTitle[doseId] || '') + '</h2>' +
      (introText ? '<div class="bn-intro">' + nl2br(esc(introText)) + '</div>' : '') +
      navRow([ btn(S().buttons.next, 'dose-begin') ])
    );
  }

  /* ── مقياس ليكرت لعبارةٍ واحدة ──
     value = القيمة المختارة أو null. itemId يُحقن في data-bn-item. */
  function likert(itemId, value) {
    var sc = CFG().scale;
    var cells = '';
    for (var v = sc.min; v <= sc.max; v++) {
      var sel = (value === v) ? ' selected' : '';
      cells += '<button class="bn-likert' + sel + '"' +
               ' data-bn-item="' + attr(itemId) + '"' +
               ' data-bn-value="' + v + '"' +
               ' aria-label="' + attr(sc.anchors[v - 1].label) + '">' +
               num(v) + '</button>';
    }
    return '' +
      '<div class="bn-scale" role="group">' + cells + '</div>' +
      '<div class="bn-scale-labels">' +
        '<span>' + esc(sc.endLabels.low) + '</span>' +
        '<span>' + esc(sc.endLabels.high) + '</span>' +
      '</div>';
  }

  /* ── مشهدٌ ثلاثيّ: إطارٌ فوق ثلاث عباراتٍ تُقيَّم كلٌّ على حدة ──
     scene = { prompt, hint }
     items = [ { id, text }, ... ]  ·  values = { itemId: v } */
  function sceneBlock(scene, items, values) {
    values = values || {};
    var opts = items.map(function (it, i) {
      var letter = ['أ', 'ب', 'ج'][i] || String(i + 1);
      return '' +
        '<div class="bn-option" data-bn-option="' + attr(it.id) + '">' +
          '<div class="bn-option-text">' +
            '<span class="bn-letter">' + esc(letter) + '</span>' +
            '<span>' + esc(it.text) + '</span>' +
          '</div>' +
          likert(it.id, values[it.id]) +
        '</div>';
    }).join('');

    return '' +
      '<div class="bn-scene">' +
        '<div class="bn-prompt">' + esc(scene.prompt) + '</div>' +
        (scene.hint ? '<div class="bn-hint">' + nl2br(esc(scene.hint)) + '</div>' : '') +
        '<div class="bn-options">' + opts + '</div>' +
      '</div>';
  }

  /* ── عبارةٌ مفردة: الطبقات ٢ إلى ٥ ── */
  function statementBlock(item, value) {
    return '' +
      '<div class="bn-statement" data-bn-option="' + attr(item.id) + '">' +
        '<div class="bn-statement-text">' + esc(item.text) + '</div>' +
        likert(item.id, value) +
      '</div>';
  }

  /* ── سؤالٌ ثنائيّ: بندا الفلترة ── */
  function booleanBlock(item, value) {
    var b = S().buttons;
    return '' +
      '<div class="bn-boolean" data-bn-option="' + attr(item.id) + '">' +
        '<div class="bn-statement-text">' + esc(item.text) + '</div>' +
        '<div class="bn-bool-row">' +
          '<button class="bn-bool' + (value === true  ? ' selected' : '') + '"' +
            ' data-bn-item="' + attr(item.id) + '" data-bn-bool="yes">' + esc(b.yes) + '</button>' +
          '<button class="bn-bool' + (value === false ? ' selected' : '') + '"' +
            ' data-bn-item="' + attr(item.id) + '" data-bn-bool="no">'  + esc(b.no)  + '</button>' +
        '</div>' +
      '</div>';
  }

  /* ── صفحة الجرعة الكاملة ──
     blocks = مصفوفة سلاسل HTML مولّدةٍ ممّا سبق */
  function doseScreen(opts) {
    var d = S().dose;
    var cfg = CFG();
    var showBack = opts.canGoBack !== false;

    var nav = [];
    if (showBack) nav.push(btn(S().buttons.back, 'back', 'ghost'));
    nav.push(btn(opts.isLastPage ? (opts.isLastDose ? d.closeBtnLast : d.closeBtn) : S().buttons.next,
                 opts.isLastPage ? 'dose-close' : 'next',
                 'primary',
                 opts.nextDisabled === true));

    var warn = '';
    if (opts.missingCount > 0) {
      var msg = (opts.missingCount === 1)
        ? S().system.incompleteOne
        : S().fill(S().system.incompleteItems, { n: num(opts.missingCount) });
      warn = '<div class="bn-warn">' + esc(msg) + '</div>';
    }

    return card(
      kicker(S().fill(d.headerOfTotal, { n: num(opts.doseId), total: num(cfg.meta.totalDoses) })) +
      progressBar(opts.answered || 0, opts.totalItems || 1,
                  S().fill(d.progressLabel, { done: num(opts.answered || 0), total: num(opts.totalItems || 0) })) +
      (opts.showShortInstructions ? instructionsShort() : '') +
      (opts.introText ? '<div class="bn-intro">' + nl2br(esc(opts.introText)) + '</div>' : '') +
      (opts.blocks || []).join('') +
      warn +
      navRow(nav)
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ — شاشات الانتقال
     ═══════════════════════════════════════════════════════════════════ */

  function doseClosing(doseId, isLast) {
    var c = S().dose.closing[doseId] || {};
    var body = '<h2 class="bn-title">' + esc(c.head || '') + '</h2>';
    if (c.reflect) body += '<div class="bn-reflect">' + nl2br(esc(c.reflect)) + '</div>';
    if (c.outro)   body += '<p class="bn-outro">' + esc(c.outro) + '</p>';

    var action = isLast ? 'to-result' : 'dose-done';
    var label  = isLast ? S().dose.closeBtnLast : S().buttons.confirm;

    return card(body + navRow([ btn(label, action) ]), 'bn-closing');
  }

  /* ── السؤال الفارز — اختيارٌ ثنائيّ لا تقييم ليكرت ──
     tie = { id, optionA:{axis,text}, optionB:{axis,text} } */
  function tieBreaker(tie, introText) {
    return card(
      '<div class="bn-intro">' + nl2br(esc(introText)) + '</div>' +
      '<div class="bn-tie">' +
        '<button class="bn-tie-option" data-bn-tie="' + attr(tie.optionA.axis) + '">' +
          esc(tie.optionA.text) + '</button>' +
        '<button class="bn-tie-option" data-bn-tie="' + attr(tie.optionB.axis) + '">' +
          esc(tie.optionB.text) + '</button>' +
      '</div>'
    , 'bn-tiebreaker');
  }

  /* ── ضبط الجودة — بلا لومٍ وبإذنٍ صريحٍ بالرفض ── */
  function qualityCheckOffer() {
    var q = S().qualityCheck;
    return card(
      '<h2 class="bn-title">' + esc(q.title) + '</h2>' +
      paraList(q.body) +
      navRow([
        btn(q.reviewBtn, 'qc-review'),
        btn(q.skipBtn, 'qc-skip', 'ghost')
      ])
    );
  }

  function qualityCheckReview(items, values) {
    var q = S().qualityCheck;
    var blocks = items.map(function (it) {
      return statementBlock(it, values[it.id]);
    }).join('');
    return card(
      '<h2 class="bn-title">' + esc(q.reviewTitle) + '</h2>' +
      '<div class="bn-intro">' + esc(q.reviewIntro) + '</div>' +
      blocks +
      navRow([ btn(q.reviewDoneBtn, 'qc-done') ])
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ — شاشات النتيجة

     ثلاث شاشاتٍ لا واحدة، بأزرارٍ نصّها طلبٌ لا «التالي» —
     ★ لأنّ المشارك حين يطلب الكشف يدخله باختياره فتقلّ مقاومته.
     ═══════════════════════════════════════════════════════════════════ */

  /* كتلةٌ نصّيّةٌ واحدة: { title?, body: [..], style? } */
  function contentBlock(block, opts) {
    if (!block) return '';
    opts = opts || {};
    var cls = 'bn-block' + (block.style ? ' bn-block-' + block.style : '') +
              (opts.extraClass ? ' ' + opts.extraClass : '');
    var head = '';
    if (opts.label)      head += '<div class="bn-block-label">' + esc(opts.label) + '</div>';
    if (block.title)     head += '<div class="bn-block-title">' + esc(block.title) + '</div>';
    var body = paraList(block.body || []);
    var cond = (block.conditionalBody && block.conditionalBody.length)
      ? '<div class="bn-block-aside">' + paraList(block.conditionalBody) + '</div>'
      : '';
    return '<div class="' + cls + '">' + head + body + cond + '</div>';
  }

  /* شاشة نتيجةٍ واحدة */
  function resultScreen(screenNo, blocksHtml, opts) {
    opts = opts || {};
    var r = S().result;
    var cfg = CFG();
    var isLast = (screenNo >= cfg.resultScreens.length);
    var label  = isLast ? r.closeBtn : (r.nextScreen[screenNo] || S().buttons.next);
    var action = isLast ? 'result-close' : 'result-next';

    var nav = [];
    if (screenNo > 1) nav.push(btn(r.backBtn, 'result-back', 'ghost'));
    nav.push(btn(label, action));

    return card(
      kicker(S().fill(r.screenLabel, {
        n: num(screenNo), total: num(cfg.resultScreens.length)
      })) +
      blocksHtml +
      (isLast && opts.reopenNote ? '<p class="bn-note-line">' + esc(r.reopenNote) + '</p>' : '') +
      navRow(nav)
    , 'bn-result bn-result-' + screenNo);
  }

  /* شاشةٌ خاصّةٌ تحلّ محلّ الثلاث — عند تجاوز النطاق أو «ليس احتراقًا» */
  function specialResultScreen(block, practiceHtml) {
    return card(
      contentBlock(block) +
      (practiceHtml || '') +
      navRow([ btn(S().result.closeBtn, 'result-close') ])
    , 'bn-result bn-result-special');
  }

  /* ── رقاقة البُعد الهدف: الاسم وشكل الانزلاق والشدّة ── */
  function targetChip(dimName, stateId, severityLabel) {
    var names = S().labels.stateNames;
    return '' +
      '<div class="bn-chip">' +
        '<span class="bn-chip-dim">' + esc(dimName) + '</span>' +
        '<span class="bn-chip-sep">·</span>' +
        '<span class="bn-chip-state">' + esc(names[stateId] || stateId) + '</span>' +
        (severityLabel ? '<span class="bn-chip-sep">·</span><span class="bn-chip-sev">' +
          esc(severityLabel) + '</span>' : '') +
      '</div>';
  }

  /* ── بطاقة الممارسة ── */
  function practiceCard(practice, roleVariant) {
    if (!practice) return '';
    var L = S().labels;
    var parts = '';
    parts += '<div class="bn-block-label">' + esc(L.practiceLabel) + '</div>';
    parts += '<div class="bn-practice-name">' + esc(practice.name) + '</div>';
    if (practice.what)  parts += '<p class="bn-p">' + esc(practice.what) + '</p>';
    if (practice.when)  parts += '<p class="bn-p bn-practice-when">' + esc(practice.when) + '</p>';
    if (roleVariant)    parts += '<p class="bn-p bn-practice-role">' + esc(roleVariant) + '</p>';
    if (practice.successSign) {
      parts += '<div class="bn-practice-sign">' +
                 '<span class="bn-practice-sign-label">' + esc(L.successLabel) + ':</span> ' +
                 esc(practice.successSign) +
               '</div>';
    }
    return '<div class="bn-practice">' + parts + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ — الرسوم
     ═══════════════════════════════════════════════════════════════════ */

  /* ── شريط الطيف ──
     منطقتان طرفيّتان (تفريط · إفراط) واتزانٌ في الوسط، والنقطة تُوضَع
     بحسب التصنيف. وحالة التذبذب تُعرَض شريطًا ممتدًّا لا نقطةً واحدة،
     ★ لأنّ صاحبها لا يقف في طرفٍ بل يتأرجح بينهما — والنقطة الواحدة
       تكذب عليه. */
  function spectrumBar(dim) {
    var cfg = CFG();
    var names = S().labels.stateNames;
    var marker = '';

    if (dim.cls === 'osc') {
      marker = '<div class="bn-sb-band" title="' + attr(names.osc) + '"></div>';
    } else {
      var pos = 50;
      if (dim.cls === 'def') pos = 18;
      else if (dim.cls === 'exc') pos = 82;
      else if (dim.cls === 'tlt') pos = (dim.tiltToward === 'exc') ? 66 : (dim.tiltToward === 'def' ? 34 : 50);
      var color = (cfg.getState(dim.cls === 'tlt' ? (dim.tiltToward || 'bal') : dim.cls) || {}).color || '#94a3b8';
      marker = '<div class="bn-sb-dot" style="inset-inline-start:' + pos + '%;background:' + color + '"></div>';
    }

    return '' +
      '<div class="bn-spectrum">' +
        '<div class="bn-sb-name">' + esc(dim.name) + '</div>' +
        '<div class="bn-sb-track">' +
          '<div class="bn-sb-zone bn-sb-def"></div>' +
          '<div class="bn-sb-zone bn-sb-bal"></div>' +
          '<div class="bn-sb-zone bn-sb-exc"></div>' +
          marker +
        '</div>' +
        '<div class="bn-sb-labels">' +
          '<span>' + esc(names.def) + '</span>' +
          '<span>' + esc(names.bal) + '</span>' +
          '<span>' + esc(names.exc) + '</span>' +
        '</div>' +
      '</div>';
  }

  function spectrumSet(dimensions, targetDim) {
    return '<div class="bn-spectrum-set">' +
      (dimensions || []).map(function (d) {
        var html = spectrumBar(d);
        return (d.dim === targetDim)
          ? html.replace('class="bn-spectrum"', 'class="bn-spectrum bn-spectrum-target"')
          : html;
      }).join('') +
    '</div>';
  }

  /* ── خطّ العافية: النقطة الأولى (ثلاثة أشرطة) ── */
  function wellbeingBars(wb) {
    var cfg = CFG();
    var rows = cfg.wellbeingLevels.map(function (lv) {
      var v = wb[lv.id];
      var pct = (typeof v === 'number') ? Math.round(((v - 1) / 6) * 100) : 0;
      return '' +
        '<div class="bn-wl-row">' +
          '<span class="bn-wl-name">' + esc(lv.name) +
            ' <span class="bn-wl-domain">' + esc(lv.domain) + '</span></span>' +
          '<div class="bn-wl-bar">' +
            '<div class="bn-wl-fill" style="width:' + pct + '%;background:' + lv.color + '"></div>' +
          '</div>' +
          '<span class="bn-wl-val">' + (typeof v === 'number' ? num(v.toFixed(1)) : '—') + '</span>' +
        '</div>';
    }).join('');
    return '<div class="bn-wellbeing">' + rows + '</div>';
  }

  /* ── خطّ العافية عبر الأسابيع: SVG خفيفٌ بلا مكتبات ──
     pulses = [ { week, computed:{vig,prs,ful}, status } ]
     ★ الأسابيع الفائتة تُوصَل بخطٍّ منقّطٍ ولا يُعلَّق عليها سلبًا. */
  function wellbeingLine(pulses, opts) {
    opts = opts || {};
    var cfg = CFG();
    var W = opts.width || 640, H = opts.height || 220;
    var padL = 34, padR = 14, padT = 16, padB = 30;
    var totalWeeks = cfg.pulse.totalWeeks;

    function x(week) { return padL + (week / totalWeeks) * (W - padL - padR); }
    function y(val)  { return padT + (1 - ((val - 1) / 6)) * (H - padT - padB); }

    /* شبكةٌ أفقيّةٌ خفيفة */
    var grid = '';
    [1, 3, 5, 7].forEach(function (v) {
      grid += '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) +
              '" class="bn-grid"/>' +
              '<text x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" class="bn-axis-label">' + num(v) + '</text>';
    });

    /* أسابيع النزول المتوقَّع — تُظلَّل بلا نصّ حكمٍ عليها */
    var dipShade = '';
    (cfg.pulse.expectedDipWeeks || []).forEach(function (w) {
      var x1 = x(w - 0.5), x2 = x(w + 0.5);
      dipShade += '<rect x="' + x1 + '" y="' + padT + '" width="' + (x2 - x1) +
                  '" height="' + (H - padT - padB) + '" class="bn-dip"/>';
    });

    /* المسارات الثلاثة */
    var paths = '', dots = '';
    cfg.wellbeingLevels.forEach(function (lv) {
      var pts = (pulses || [])
        .filter(function (p) { return p.computed && typeof p.computed[lv.id] === 'number'; })
        .sort(function (a, b) { return a.week - b.week; })
        .map(function (p) { return { w: p.week, v: p.computed[lv.id], missed: p.status === 'missed' }; });

      if (!pts.length) return;

      var d = pts.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + x(p.w).toFixed(1) + ' ' + y(p.v).toFixed(1);
      }).join(' ');

      paths += '<path d="' + d + '" fill="none" stroke="' + lv.color +
               '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

      pts.forEach(function (p) {
        dots += '<circle cx="' + x(p.w).toFixed(1) + '" cy="' + y(p.v).toFixed(1) +
                '" r="3.5" fill="' + lv.color + '"><title>' +
                attr(S().fill(S().pulse.weekLabel, { n: num(p.w) })) + ' · ' +
                attr(lv.name) + ' ' + attr(p.v.toFixed(1)) + '</title></circle>';
      });
    });

    /* تسميات الأسابيع */
    var weekLabels = '';
    for (var w = 0; w <= totalWeeks; w++) {
      weekLabels += '<text x="' + x(w) + '" y="' + (H - 8) + '" class="bn-axis-label">' + num(w) + '</text>';
    }

    var legend = cfg.wellbeingLevels.map(function (lv) {
      return '<span class="bn-legend-item">' +
               '<span class="bn-legend-dot" style="background:' + lv.color + '"></span>' +
               esc(lv.name) +
             '</span>';
    }).join('');

    return '' +
      '<div class="bn-line">' +
        '<div class="bn-line-title">' + esc(S().pulse.lineTitle) + '</div>' +
        '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bn-line-svg" role="img">' +
          dipShade + grid + paths + dots + weekLabels +
        '</svg>' +
        '<div class="bn-legend">' + legend + '</div>' +
        '<div class="bn-line-caption">' + esc(S().pulse.lineCaption) + '</div>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ — النبضة الأسبوعيّة
     ═══════════════════════════════════════════════════════════════════ */

  function pulseScreen(opts) {
    var p = S().pulse;
    var blocks = (opts.items || []).map(function (it) {
      return statementBlock(it, (opts.values || {})[it.id]);
    }).join('');

    var open = '';
    if (opts.showOpenQuestion) {
      open = '<div class="bn-pulse-open">' +
               '<label class="bn-pulse-open-label">' + esc(p.openQuestion) + '</label>' +
               '<input type="text" class="bn-pulse-open-input" data-bn-pulse-note' +
               ' placeholder="' + attr(p.openPlaceholder) + '">' +
             '</div>';
    }

    return card(
      kicker(S().fill(p.weekLabel, { n: num(opts.week) })) +
      '<h2 class="bn-title">' + esc(p.title) + '</h2>' +
      '<div class="bn-sub">' + esc(opts.isFull ? p.subtitleFull : p.subtitleShort) + '</div>' +
      '<div class="bn-prompt bn-prompt-pulse">' + esc(p.prompt) + '</div>' +
      blocks + open +
      navRow([ btn(p.submitBtn, 'pulse-submit', 'primary', opts.nextDisabled === true) ])
    , 'bn-pulse');
  }

  /* التعليق على حركة الخطّ — النصّ يأتي جاهزًا من BURN_STRINGS.lineComment */
  function pulseDone(comment, lineHtml) {
    var p = S().pulse;
    var body = '';
    if (comment) {
      if (comment.head) body += '<div class="bn-comment-head">' + esc(comment.head) + '</div>';
      if (comment.body) body += '<p class="bn-p">' + esc(comment.body) + '</p>';
      if (comment.ask)  body += '<div class="bn-comment-ask">' + esc(comment.ask) + '</div>';
    }
    return card(
      '<h2 class="bn-title">' + esc(p.doneTitle) + '</h2>' +
      body +
      (lineHtml || '') +
      navRow([ btn(S().buttons.close, 'pulse-close', 'ghost') ])
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٩ — حالات النظام
     ═══════════════════════════════════════════════════════════════════ */

  function loading(text) {
    return card(
      '<div class="bn-centered">' +
        '<div class="bn-spinner"></div>' +
        '<div class="bn-muted">' + esc(text || S().system.loading) + '</div>' +
      '</div>'
    );
  }

  function resultLoading() {
    var r = S().result;
    return card(
      '<div class="bn-centered">' +
        '<div class="bn-spinner"></div>' +
        '<div class="bn-title-sm">' + esc(r.loadingTitle) + '</div>' +
        '<div class="bn-muted">' + esc(r.loadingBody) + '</div>' +
      '</div>'
    );
  }

  /* ★ رسائل الخطأ بلا لومٍ وبلا مصطلحٍ تقنيّ */
  function error(kind, retryAction) {
    var sys = S().system;
    var msg = sys.errorGeneric;
    if (kind === 'save')    msg = sys.errorSave;
    if (kind === 'load')    msg = sys.errorLoad;
    if (kind === 'offline') msg = sys.offline;
    if (kind === 'auth')    msg = sys.authRequired;

    var nav = retryAction ? navRow([ btn(S().buttons.retry, retryAction, 'ghost') ]) : '';
    return card('<div class="bn-centered"><p class="bn-p">' + esc(msg) + '</p></div>' + nav);
  }

  function saving() {
    return '<div class="bn-saving">' + esc(S().system.saving) + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     التصدير
     ═══════════════════════════════════════════════════════════════════ */
  global.BURN_RENDER = {
    /* أدوات */
    esc: esc, nl2br: nl2br, paras: paras, paraList: paraList, num: num,

    /* عناصر */
    card: card, btn: btn, navRow: navRow, progressBar: progressBar, kicker: kicker,

    /* تمهيد */
    opening: opening,
    instructions: instructions,
    instructionsShort: instructionsShort,
    resume: resume,
    deferralOffer: deferralOffer,
    deferredWaiting: deferredWaiting,

    /* جرعة */
    doseOpen: doseOpen,
    doseScreen: doseScreen,
    likert: likert,
    sceneBlock: sceneBlock,
    statementBlock: statementBlock,
    booleanBlock: booleanBlock,

    /* انتقال */
    doseClosing: doseClosing,
    tieBreaker: tieBreaker,
    qualityCheckOffer: qualityCheckOffer,
    qualityCheckReview: qualityCheckReview,

    /* نتيجة */
    contentBlock: contentBlock,
    resultScreen: resultScreen,
    specialResultScreen: specialResultScreen,
    targetChip: targetChip,
    practiceCard: practiceCard,

    /* رسوم */
    spectrumBar: spectrumBar,
    spectrumSet: spectrumSet,
    wellbeingBars: wellbeingBars,
    wellbeingLine: wellbeingLine,

    /* نبضة */
    pulseScreen: pulseScreen,
    pulseDone: pulseDone,

    /* نظام */
    loading: loading,
    resultLoading: resultLoading,
    error: error,
    saving: saving
  };

  console.log('✅ BURN_RENDER جاهز');

})(window);
