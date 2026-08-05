/* ============================================================
   mirrors-report-bridge.js
   جسر قراءة المرآة — النسخة الثانية
   ------------------------------------------------------------
   المكان: mirrors-assesment/mirrors-report-bridge.js

   يعتمد على:
     mirrors-report-content.js       (الفصحى)
     mirrors-report-content-eg.js    (العامية)
     mirrors-report-deferred.js      (المؤجّل — اختياريّ)
     mirrors-feedback.js             (زرّ الاعتراض — اختياريّ)

   ────────────────────────────────────────────────────────────
   بنيتان تعملان معًا:

   • البنية الثانية (مرآة السلوك): عتبة لكل طابع، وبلوك تمييز،
     وهبة وكلفة، وأثر في اليوم، وتجربة، وطيف بخمس حالات
     مربوطة بمخرج المحرّك (image) لا بموضعه العام فقط.

   • البنية الأولى (المرايا التي لم تُعَد كتابتها بعد): تعمل
     بالترتيب القديم تمامًا كما كانت، فلا يتوقّف شيء عن الناس
     أثناء البناء.

   الكشف آليّ بمفتاح <mk>.question. لا إعداد يدويّ.
   ============================================================ */

(function (global) {
  "use strict";

  var LANG_KEY = "fouad_report_lang";
  var _last = null;

  function T() { return global.MIRRORS_TEXT || null; }
  function D() { return global.MIRRORS_DEFERRED || null; }

  function lang() {
    try { return localStorage.getItem(LANG_KEY) === "eg" ? "eg" : "ar"; }
    catch (e) { return "ar"; }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function arabicNum(n) {
    var m = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(n).replace(/\d/g, function (d) { return m[+d]; });
  }

  /* mirror1 → m1 */
  function mKey(mirror) {
    var id = (mirror && mirror.id) || "";
    return /^mirror\d$/.test(id) ? id.replace("mirror", "m") : null;
  }
  /* ترتيب الباب داخل مرآته → a1 / a2 / a3 */
  function aKey(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) {
      if (ax[i] && ax[i].id === axisId) return "a" + (ax[i].order || (i + 1));
    }
    return null;
  }
  function axisNameOf(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) { if (ax[i] && ax[i].id === axisId) return ax[i].name || ""; }
    return "";
  }

  function txt(key) { var t = T(); return t ? t.get(key, lang()) : null; }

  function block(key, cls) {
    var v = txt(key);
    if (!v || !v.length) return "";
    var body = v.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("");
    return '<div class="rb-block ' + (cls || "") + '">' + body + '</div>';
  }
  function labeled(key, label, cls) {
    var v = txt(key);
    if (!v || !v.length) return "";
    var body = v.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("");
    return '<div class="rb-block ' + (cls || "") + '">'
         +   '<div class="rb-label">' + esc(label) + '</div>' + body
         + '</div>';
  }

  /* ─────────── كشف البنية ─────────── */
  function schemaOf(mirror) {
    var mk = mKey(mirror), t = T();
    if (!mk || !t) return null;
    if (t.has(mk + ".question", lang())) return "v2";
    if (t.has(mk + ".threshold", lang())) return "v1";
    return null;
  }
  function canRender(mirror) { return !!schemaOf(mirror); }

  /* أيّ قراءة للفارق تناسب حالة الإجابات */
  function gapKey(mk, res) {
    if (!res) return mk + ".gap.clear";
    var f = res.flags || {};
    if (res.scenario === "weak" || f.weakSignal) return mk + ".gap.weak";
    if (res.dualAxis && res.dualAxis.length === 2) return mk + ".gap.dual";
    if (f.sameAxisCloseness || res.scenario === "closeness") return mk + ".gap.closeness";
    return mk + ".gap.clear";
  }

  /* مفاتيح الطيف من مخرج المحرّك.
     المحرّك يُرجع position (balance/excess/deficit/ambiguous)
     و image (excess_a / excess_b / excess_both / deficit_a / deficit_b / deficit_both).
     نقرأ الصورة الدقيقة متى وُجدت، ونسقط للحالتين معًا عند التساوي. */
  function spectrumKeys(base, sp) {
    if (!sp) return [];
    var pos = sp.position;
    if (pos === "ambiguous") return [base + ".spectrum.ambiguous"];
    if (pos === "balance")   return [base + ".spectrum.balance"];
    if (pos === "excess" || pos === "deficit") {
      var img = sp.image;
      if (img === "excess_both")  return [base + ".spectrum.excess_a",  base + ".spectrum.excess_b"];
      if (img === "deficit_both") return [base + ".spectrum.deficit_a", base + ".spectrum.deficit_b"];
      if (img) return [base + ".spectrum." + img];
      return [base + ".spectrum." + pos + "_a"];
    }
    return [];
  }

  function langBar() {
    var eg = lang() === "eg";
    return '<div class="rb-lang">'
         +   '<span class="rb-lang-note">لغة القراءة</span>'
         +   '<button type="button" class="rb-lang-btn' + (eg ? "" : " on") + '" data-rb-lang="ar">فصحى</button>'
         +   '<button type="button" class="rb-lang-btn' + (eg ? " on" : "") + '" data-rb-lang="eg">عامية</button>'
         + '</div>';
  }

  function rankingHTML(model) {
    var r = model && model.ranking;
    if (!r || !r.rows || !r.rows.length) return "";
    var rows = r.rows.map(function (x) {
      return '<div class="rank-row' + (x.top ? " top" : "") + '">'
           +   '<span class="rank-axis">' + esc(x.name || "") + '</span>'
           +   '<div class="rank-bar"><div class="rank-fill" style="width:' + (x.percent || 0) + '%"></div></div>'
           +   '<span class="rank-pct">' + arabicNum(x.percent || 0) + '٪</span>'
           + '</div>';
    }).join("");
    return '<div class="review-ranking"><div class="sr-axis">صورة هذه المرآة</div>'
         +   '<div class="ranking">' + rows + '</div></div>';
  }

  function doorHead(base, fallbackName) {
    var n = txt(base + ".name");
    var main = (n && n[0]) ? n[0] : (fallbackName || "");
    var term = (n && n[1]) ? n[1] : "";
    return '<div class="rb-door-head">'
         +   '<div class="rb-door-main">' + esc(main) + '</div>'
         +   (term ? '<div class="rb-door-term">واسمها في منظور الفؤاد: ' + esc(term) + '</div>' : "")
         + '</div>';
  }

  function ownershipHTML(mk, saved) {
    var v = txt(mk + ".ownership");
    if (!v || !v.length) return "";
    var body = v.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("");
    return '<div class="rb-own">' + body
         +   '<textarea class="rb-own-input" data-rb-own="' + esc(mk) + '" rows="2" '
         +     'placeholder="اكتب هنا إن أحببت">' + esc(saved || "") + '</textarea>'
         +   '<div class="rb-own-state" data-rb-own-state="' + esc(mk) + '"></div>'
         + '</div>';
  }

  /* ─────────── بوّابة المحتوى المؤجّل ─────────── */
  var DEF_KEY = "fouad_deferred_choice";
  function defChoice(mk) {
    try { return JSON.parse(localStorage.getItem(DEF_KEY) || "{}")[mk] || null; }
    catch (e) { return null; }
  }
  function setDefChoice(mk, val) {
    try {
      var o = JSON.parse(localStorage.getItem(DEF_KEY) || "{}");
      o[mk] = val;
      localStorage.setItem(DEF_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  function deferredHTML(mk, axes, model) {
    var d = D();
    if (!d) return "";
    var keys = [];
    axes.forEach(function (o) {
      var k = o.base + ".spectrum.suspect";
      if (d.has(k, lang())) keys.push(k);
    });
    if (!keys.length) return "";

    var opened = (model && model.deferredChoice === "now") || (defChoice(mk) === "now");
    var declined = (model && model.deferredChoice === "later") || (defChoice(mk) === "later");
    if (declined) return "";
    var h = '<div class="rb-deferred" data-rb-def="' + esc(mk) + '">';
    if (!opened) {
      h += '<div class="rb-def-ask">'
        +    '<p>وثمّ قراءة أخرى لحالتك، أدقّ من هذه وأثقل قليلًا.</p>'
        +    '<p>تُقرأ على مهل، والصباح أفضل أوقاتها.</p>'
        +    '<div class="rb-def-btns">'
        +      '<button type="button" class="rb-def-btn" data-rb-def-act="now">أقرؤها الآن</button>'
        +      '<button type="button" class="rb-def-btn ghost" data-rb-def-act="later">تنتظرني في زيارتي القادمة</button>'
        +    '</div>'
        +  '</div>';
    }
    h += '<div class="rb-def-body"' + (opened ? '' : ' hidden') + '>';
    keys.forEach(function (k) {
      var v = d.get(k, lang());
      if (!v) return;
      h += '<div class="rb-block rb-def-block">'
        +    '<div class="rb-label">قراءة أدقّ لحالتك</div>'
        +    v.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("")
        +  '</div>';
    });
    h += '</div></div>';
    return h;
  }

  /* ─────────── الرسم · البنية الثانية ─────────── */
  function renderV2(mirror, res, model, mk) {
    var h = "";
    h += '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": " + esc(model.mirrorName || "") + "</div>";
    h += langBar();

    var weak = !!(model.weakText) || (res && (res.scenario === "weak" || (res.flags && res.flags.weakSignal)));

    /* الطابع الأعلى لكلّ باب */
    var topByAxis = {};
    (res && res.ranking || []).forEach(function (row) {
      if (row && row.axisId && topByAxis[row.axisId] === undefined) topByAxis[row.axisId] = row.type;
    });
    var domAxis = (res && res.dominantAxis) || ((res && res.ranking && res.ranking[0]) ? res.ranking[0].axisId : null);

    /* ١ العتبة — مشهد الطابع الراجح في الباب الغالب */
    if (!weak && domAxis && topByAxis[domAxis]) {
      var ak0 = aKey(mirror, domAxis);
      if (ak0) h += block(mk + "." + ak0 + ".threshold." + topByAxis[domAxis], "rb-threshold");
    }

    /* ٢ ما الذي قيس */
    h += block(mk + ".question", "rb-question");

    /* ٣ الصورة وقراءة الفارق (مؤشّر الثقة) */
    h += rankingHTML(model);
    h += block(gapKey(mk, res), "rb-gap");

    var axesShown = [];

    if (!weak && res && res.spectrum && Object.keys(res.spectrum).length) {
      Object.keys(res.spectrum).forEach(function (axisId) {
        var ak = aKey(mirror, axisId);
        if (!ak) return;
        var base = mk + "." + ak;
        var sp = res.spectrum[axisId] || {};
        var topType = topByAxis[axisId];
        axesShown.push({ base: base, sp: sp });

        h += '<div class="rb-door">';
        h += doorHead(base, axisNameOf(mirror, axisId));

        /* الحركة المركزية */
        h += block(base + ".intro", "rb-intro");

        /* البصمة */
        if (topType) h += block(base + ".door." + topType, "rb-persona");

        /* الفرق المميّز */
        if (topType) h += labeled(base + ".distinction." + topType, "ولماذا لست الحركتين الأخريين", "rb-distinction");

        /* الهبة والكلفة */
        h += labeled(base + ".giftCost", "هبتها وكلفتها", "rb-gift");

        /* الأثر في اليوم */
        if (topType) h += labeled(base + ".daily." + topType, "كيف يظهر في يومك", "rb-daily");

        /* التأصيل — للباب الغالب في الحالة الواضحة */
        if (res.scenario === "clear" && axisId === domAxis) {
          h += labeled(base + ".rooting", "في الأصل", "rb-rooting");
        }

        /* موضعك على الطيف */
        var RND = global.FOUAD_RENDER || null;
        var keys = spectrumKeys(base, sp);
        if (keys.length) {
          h += '<div class="rb-spectrum">';
          h += '<div class="sr-axis">' + esc(sp.positionLabel || "موضعك الآن") + '</div>';
          h += (RND && RND.spectrumBar) ? RND.spectrumBar(sp) : "";
          keys.forEach(function (k) { h += block(k, "rb-pos"); });
          h += '</div>';
        }

        /* التجربة */
        if (topType) h += labeled(base + ".experiment." + topType, "تجربة واحدة حتى المرآة التالية", "rb-seed");

        h += '</div>';
      });
    } else {
      h += block(mk + ".whisper.weak", "rb-whisper");
    }

    /* مساحتك */
    h += ownershipHTML(mk, (model.ownershipSaved || ""));

    /* خط التقارب */
    h += block(mk + ".convergence", "rb-convergence");

    /* المؤجّل */
    if (!weak) h += deferredHTML(mk, axesShown, model);

    /* الباب المقفول */
    h += block(mk + ".bridge", "rb-bridge");

    /* زرّ الاعتراض */
    if (global.MIRRORS_FEEDBACK && global.MIRRORS_FEEDBACK.html) {
      h += global.MIRRORS_FEEDBACK.html(mk);
    }

    h += '<div class="home-actions"><button class="btn ghost" id="reviewBack">رجوع للبيت</button></div>';
    return h;
  }

  /* ─────────── الرسم · البنية الأولى (كما كانت) ─────────── */
  function renderV1(mirror, res, model, mk) {
    var h = "";
    h += '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": " + esc(model.mirrorName || "") + "</div>";
    h += langBar();
    h += block(mk + ".threshold", "rb-threshold");
    h += rankingHTML(model);
    h += block(gapKey(mk, res), "rb-gap");

    var weak = !!(model.weakText) || (res && (res.scenario === "weak" || (res.flags && res.flags.weakSignal)));
    var RND = global.FOUAD_RENDER || null;

    if (!weak && res && res.spectrum && Object.keys(res.spectrum).length) {
      var topByAxis = {};
      (res.ranking || []).forEach(function (row) {
        if (row && row.axisId && topByAxis[row.axisId] === undefined) topByAxis[row.axisId] = row.type;
      });
      var domAxis = res.dominantAxis || ((res.ranking && res.ranking[0]) ? res.ranking[0].axisId : null);

      Object.keys(res.spectrum).forEach(function (axisId) {
        var ak = aKey(mirror, axisId);
        if (!ak) return;
        var base = mk + "." + ak;
        var sp = res.spectrum[axisId] || {};
        var topType = topByAxis[axisId];

        h += '<div class="rb-door">';
        h += doorHead(base, axisNameOf(mirror, axisId));
        h += block(base + ".intro", "rb-intro");
        if (topType) h += block(base + ".door." + topType, "rb-persona");
        if (res.scenario === "clear" && axisId === domAxis) {
          h += labeled(base + ".rooting", "في الأصل", "rb-rooting");
        }
        var pos = sp.position;
        var suspicious = (sp.suspiciousBalance === true) || sp.key === "suspicious_balance";
        if (pos === "balance" || pos === "excess" || pos === "deficit") {
          var st = base + ".spectrum." + pos + ".";
          h += '<div class="rb-spectrum">';
          h += '<div class="sr-axis">' + esc(sp.positionLabel || "") + '</div>';
          h += (RND && RND.spectrumBar) ? RND.spectrumBar(sp) : "";
          h += block(st + "text", "rb-pos");
          h += labeled(st + "echo", "كيف يظهر في أسبوعك", "rb-echo");
          h += labeled(st + "face", "وجهها المتزن", "rb-face");
          h += labeled(st + "seed", "دعوة", "rb-seed");
          h += labeled(st + "marker", "علامة رصد", "rb-marker");
          h += '</div>';
        } else if (pos === "ambiguous") {
          h += block(mk + ".whisper.ambiguous", "rb-whisper");
        }
        if (suspicious) h += block(mk + ".whisper.suspicious", "rb-whisper");
        h += '</div>';
      });
    } else {
      h += block(mk + ".whisper.weak", "rb-whisper");
    }

    h += ownershipHTML(mk, (model.ownershipSaved || ""));
    h += block(mk + ".bridge", "rb-bridge");
    h += '<div class="home-actions"><button class="btn ghost" id="reviewBack">رجوع للبيت</button></div>';
    return h;
  }

  /* ─────────── الموزّع ─────────── */
  function render(mirror, res, model) {
    _last = { mirror: mirror, res: res, model: model };
    var mk = mKey(mirror);
    if (!mk) return null;
    var schema = schemaOf(mirror);
    if (schema === "v2") return renderV2(mirror, res, model, mk);
    if (schema === "v1") return renderV1(mirror, res, model, mk);
    return null;
  }

  /* ─────────── تبديل اللسان ─────────── */
  function repaint() {
    if (!_last) return;
    var host = document.querySelector(".card.review");
    if (!host) return;
    var html = render(_last.mirror, _last.res, _last.model);
    if (html) host.innerHTML = html;
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-rb-lang]");
    if (!b) return;
    try { localStorage.setItem(LANG_KEY, b.getAttribute("data-rb-lang")); } catch (err) {}
    repaint();
  });

  /* ─────────── حفظ في Firestore ─────────── */
  function saveField(field, value, stateEl) {
    try {
      var S = global.FOUAD_STORE;
      var u = S && S.getCurrentUser ? S.getCurrentUser() : null;
      if (!u || !u.id || !global.db) { if (stateEl) stateEl.textContent = ""; return; }
      var payload = {};
      payload[field] = value;
      global.db.collection(S.COLLECTION || "fouad_v2_results").doc(u.id)
        .set(payload, { merge: true })
        .then(function () { if (stateEl) stateEl.textContent = "حُفظ"; })
        .catch(function () { if (stateEl) stateEl.textContent = ""; });
    } catch (err) { if (stateEl) stateEl.textContent = ""; }
  }

  document.addEventListener("blur", function (e) {
    var t = e.target;
    if (!t || !t.getAttribute || !t.getAttribute("data-rb-own")) return;
    var mk = t.getAttribute("data-rb-own");
    var st = document.querySelector('[data-rb-own-state="' + mk + '"]');
    var val = String(t.value || "").trim();
    if (!val) { if (st) st.textContent = ""; return; }
    if (st) st.textContent = "جارٍ الحفظ";
    var o = {}; o[mk] = val;
    saveField("ownership", o, st);
  }, true);

  /* ─────────── بوّابة المؤجّل ─────────── */
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("[data-rb-def-act]");
    if (!b) return;
    var wrap = b.closest("[data-rb-def]");
    if (!wrap) return;
    var mk = wrap.getAttribute("data-rb-def");
    var act = b.getAttribute("data-rb-def-act");
    var ask = wrap.querySelector(".rb-def-ask");
    var body = wrap.querySelector(".rb-def-body");

    var o = {}; o[mk] = act;
    setDefChoice(mk, act);
    saveField("deferredChoice", o, null);
    if (_last && _last.model) _last.model.deferredChoice = act;

    if (act === "now") {
      if (ask) ask.remove();
      if (body) body.removeAttribute("hidden");
    } else {
      wrap.innerHTML = '<div class="rb-def-ask"><p>تمام. تنتظرك في زيارتك القادمة.</p></div>';
    }
  });

  /* ─────────── الأنماط ─────────── */
  (function styles() {
    if (document.getElementById("rb-styles")) return;
    var css = ''
      + '.rb-lang{display:flex;align-items:center;gap:8px;margin:10px 0 18px;flex-wrap:wrap}'
      + '.rb-lang-note{font-size:13px;opacity:.6}'
      + '.rb-lang-btn{border:1px solid rgba(180,150,90,.45);background:transparent;color:inherit;'
      + 'border-radius:999px;padding:5px 16px;font-family:inherit;font-size:14px;cursor:pointer}'
      + '.rb-lang-btn.on{background:rgba(180,150,90,.18);border-color:rgba(180,150,90,.9)}'
      + '.rb-block{margin:0 0 16px}'
      + '.rb-block p{margin:0 0 10px;line-height:1.95;font-size:17px}'
      + '.rb-label{font-size:13px;letter-spacing:.5px;opacity:.62;margin-bottom:6px}'
      + '.rb-threshold{border-inline-start:2px solid rgba(180,150,90,.55);padding-inline-start:14px;margin-bottom:22px}'
      + '.rb-threshold p{opacity:.92;font-size:18px}'
      + '.rb-question p{opacity:.75;font-size:16px}'
      + '.rb-door{margin:26px 0;padding:18px 0 4px;border-top:1px solid rgba(180,150,90,.22)}'
      + '.rb-door-head{margin-bottom:14px}'
      + '.rb-door-main{font-size:21px;font-weight:600}'
      + '.rb-door-term{font-size:14px;opacity:.65;margin-top:3px}'
      + '.rb-rooting{border-inline-start:2px solid rgba(180,150,90,.5);padding-inline-start:12px}'
      + '.rb-distinction{background:rgba(180,150,90,.06);border-radius:10px;padding:14px 16px}'
      + '.rb-spectrum{margin-top:18px}'
      + '.rb-seed,.rb-gift{background:rgba(180,150,90,.08);border-radius:10px;padding:12px 14px}'
      + '.rb-whisper{background:rgba(180,150,90,.07);border-radius:10px;padding:12px 14px}'
      + '.rb-convergence{margin-top:22px;padding-top:16px;border-top:1px solid rgba(180,150,90,.22)}'
      + '.rb-own{margin:26px 0 10px;padding-top:16px;border-top:1px solid rgba(180,150,90,.22)}'
      + '.rb-own-input{width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border-radius:10px;'
      + 'border:1px solid rgba(180,150,90,.35);background:transparent;color:inherit;font-family:inherit;'
      + 'font-size:16px;line-height:1.8;resize:vertical}'
      + '.rb-own-state{font-size:12px;opacity:.6;margin-top:5px;min-height:16px}'
      + '.rb-deferred{margin:24px 0;padding:16px;border:1px solid rgba(180,150,90,.3);border-radius:12px}'
      + '.rb-def-ask p{margin:0 0 8px;line-height:1.9;font-size:16px;opacity:.85}'
      + '.rb-def-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}'
      + '.rb-def-btn{border:1px solid rgba(180,150,90,.6);background:rgba(180,150,90,.14);color:inherit;'
      + 'border-radius:999px;padding:8px 18px;font-family:inherit;font-size:15px;cursor:pointer}'
      + '.rb-def-btn.ghost{background:transparent;opacity:.8}'
      + '.rb-def-block{margin-top:14px}'
      + '.rb-bridge p{opacity:.85}';
    var s = document.createElement("style");
    s.id = "rb-styles"; s.textContent = css;
    document.head.appendChild(s);
  })();

  global.MIRRORS_REPORT_BRIDGE = {
    canRender: canRender,
    render: render,
    lang: lang,
    schemaOf: schemaOf
  };
})(window);
