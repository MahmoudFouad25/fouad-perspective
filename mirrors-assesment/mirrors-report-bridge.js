/* ============================================================
   mirrors-report-bridge.js
   جسر قراءة المرآة: يقرأ من مخزن النصوص ويرسم الأنفاس التسعة
   ------------------------------------------------------------
   المكان: mirrors-assesment/mirrors-report-bridge.js

   يعتمد على:
     mirrors-report-content.js      (الفصحى)
     mirrors-report-content-eg.js   (العامية)

   قاعدة الأمان: أي مرآة ليس لها محتوى جديد تعمل بالطريقة
   القديمة تمامًا، فلا يتوقف شيء عن الناس أثناء البناء.
   ============================================================ */

(function (global) {
  "use strict";

  var LANG_KEY = "fouad_report_lang";
  var _last = null;   // آخر نموذج رُسم، لإعادة الرسم عند تبديل اللسان

  function T() { return global.MIRRORS_TEXT || null; }
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

  /* مفاتيح: mirror1 → m1 ، module1 → a1 */
  function mKey(mirror) {
    var id = (mirror && mirror.id) || "";
    return /^mirror\d$/.test(id) ? id.replace("mirror", "m") : null;
  }
  /* ترتيب الباب داخل مرآته (١ أو ٢ أو ٣)، يُقرأ من الكونفج لا من اسم الباب،
     لأن أسماء الأبواب تتسلسل عبر المرايا: module1..module21 */
  function aKey(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) {
      if (ax[i] && ax[i].id === axisId) return "a" + (ax[i].order || (i + 1));
    }
    return null;
  }

  /* نص بالمفتاح، بلسان القارئ، مع السقوط للفصحى داخل MIRRORS_TEXT */
  function txt(key) {
    var t = T();
    return t ? t.get(key, lang()) : null;
  }
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

  /* هل لهذه المرآة محتوى جديد؟ */
  function canRender(mirror) {
    var mk = mKey(mirror), t = T();
    return !!(mk && t && t.has(mk + ".threshold", lang()));
  }

  /* أي قراءة للفارق تناسب حالة الإجابات */
  function gapKey(mk, res) {
    if (!res) return mk + ".gap.clear";
    var f = res.flags || {};
    if (res.scenario === "weak" || f.weakSignal) return mk + ".gap.weak";
    if (res.dualAxis && res.dualAxis.length === 2) return mk + ".gap.dual";
    if (f.sameAxisCloseness || res.scenario === "closeness") return mk + ".gap.closeness";
    return mk + ".gap.clear";
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

  /* اسم الباب: الاسم الواضح أولًا، ثم اسم المصطلح.
     يُقرأ من المخزن بالمفتاح <base>.name = [الاسم الواضح، اسم المصطلح] */
  function axisNameOf(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) { if (ax[i] && ax[i].id === axisId) return ax[i].name || ""; }
    return "";
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

  /* ─────────────── الرسم ─────────────── */
  function render(mirror, res, model) {
    _last = { mirror: mirror, res: res, model: model };
    var mk = mKey(mirror);
    if (!mk) return null;

    var h = "";
    h += '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": " + esc(model.mirrorName || "") + "</div>";
    h += langBar();

    /* ١ العتبة */
    h += block(mk + ".threshold", "rb-threshold");

    /* ٢ الصورة وقراءة الفارق */
    h += rankingHTML(model);
    h += block(gapKey(mk, res), "rb-gap");

    var weak = !!(model.weakText) || (res && (res.scenario === "weak" || (res.flags && res.flags.weakSignal)));
    var RND = global.FOUAD_RENDER || null;

    if (!weak && res && res.spectrum && Object.keys(res.spectrum).length) {
      /* الطابع الأعلى لكل باب: أول ظهور في الترتيب لأنه تنازلي */
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

        /* ٣ تعريف الباب */
        h += block(base + ".intro", "rb-intro");

        /* ٤ صورتك داخل الباب */
        if (topType) h += block(base + ".door." + topType, "rb-persona");

        /* التأصيل: في الحالة الواضحة وللباب الغالب، كما في الأصل */
        if (res.scenario === "clear" && axisId === domAxis) {
          h += labeled(base + ".rooting", "في الأصل", "rb-rooting");
        }

        /* ٥ موضعك على الطيف ومعه الأثر والوجه والبذرة وعلامة الرصد */
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

    /* ٦ لحظة التملك */
    h += ownershipHTML(mk, (model.ownershipSaved || ""));

    /* ٧ الجسر */
    h += block(mk + ".bridge", "rb-bridge");

    h += '<div class="home-actions"><button class="btn ghost" id="reviewBack">رجوع للبيت</button></div>';
    return h;
  }

  /* ─────────────── تبديل اللسان وحفظ التملك ─────────────── */
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

  function saveOwnership(mk, text, stateEl) {
    try {
      var S = global.FOUAD_STORE;
      var u = S && S.getCurrentUser ? S.getCurrentUser() : null;
      if (!u || !u.id || !global.db) { if (stateEl) stateEl.textContent = ""; return; }
      var payload = { ownership: {} };
      payload.ownership[mk] = text;
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
    saveOwnership(mk, val, st);
  }, true);

  /* ─────────────── الأنماط ─────────────── */
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
      + '.rb-threshold p{opacity:.85}'
      + '.rb-door{margin:26px 0;padding:18px 0 4px;border-top:1px solid rgba(180,150,90,.22)}'
      + '.rb-door-head{margin-bottom:14px}'
      + '.rb-door-main{font-size:21px;font-weight:600}'
      + '.rb-door-term{font-size:14px;opacity:.65;margin-top:3px}'
      + '.rb-rooting{border-inline-start:2px solid rgba(180,150,90,.5);padding-inline-start:12px}'
      + '.rb-spectrum{margin-top:18px}'
      + '.rb-seed,.rb-marker{background:rgba(180,150,90,.08);border-radius:10px;padding:12px 14px}'
      + '.rb-whisper{background:rgba(180,150,90,.07);border-radius:10px;padding:12px 14px}'
      + '.rb-own{margin:26px 0 10px;padding-top:16px;border-top:1px solid rgba(180,150,90,.22)}'
      + '.rb-own-input{width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border-radius:10px;'
      + 'border:1px solid rgba(180,150,90,.35);background:transparent;color:inherit;font-family:inherit;'
      + 'font-size:16px;line-height:1.8;resize:vertical}'
      + '.rb-own-state{font-size:12px;opacity:.6;margin-top:5px;min-height:16px}'
      + '.rb-bridge p{opacity:.85}';
    var s = document.createElement("style");
    s.id = "rb-styles"; s.textContent = css;
    document.head.appendChild(s);
  })();

  global.MIRRORS_REPORT_BRIDGE = {
    canRender: canRender,
    render: render,
    lang: lang
  };
})(window);
