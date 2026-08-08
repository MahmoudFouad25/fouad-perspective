/* ============================================================
   mirrors-report-bridge.js
   جسر قراءة المرآة — النسخة الرابعة
   ------------------------------------------------------------
   المكان: mirrors-assesment/mirrors-report-bridge.js

   الجديد في هذه النسخة:
   ١. أسماء الأبواب في التمهيد تقرأ من المحتوى، لا من الجسر.
      فكل مرآة تعرض أسماء أبوابها هي، بلا تعديل في الكود.
   ٢. بلوك التأصيل رجع إلى البنية الثانية، بعد الحركة المركزية
      وقبل التمييز، ويظهر للمحور الغالب وحده.
   ============================================================ */

(function (global) {
  "use strict";

  var LANG_KEY  = "fouad_report_lang";
  var STAGE_KEY = "fouad_preface_seen";
  var DEF_KEY   = "fouad_deferred_choice";
  var _last = null;
  var _stage = null;

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
  function readMap(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); }
    catch (e) { return {}; }
  }
  function writeMap(key, k, v) {
    try { var o = readMap(key); o[k] = v; localStorage.setItem(key, JSON.stringify(o)); }
    catch (e) {}
  }

  function mKey(mirror) {
    var id = (mirror && mirror.id) || "";
    return /^mirror\d$/.test(id) ? id.replace("mirror", "m") : null;
  }
  function aKey(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) {
      if (ax[i] && ax[i].id === axisId) return "a" + (ax[i].order || (i + 1));
    }
    return null;
  }
  function axisNameOf(mirror, axisId) {
    var ax = (mirror && mirror.axes) || [];
    for (var i = 0; i < ax.length; i++) if (ax[i] && ax[i].id === axisId) return ax[i].name || "";
    return "";
  }

  function txt(key) { var t = T(); return t ? t.get(key, lang()) : null; }
  function para(v) { return v.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join(""); }
  function block(key, cls) {
    var v = txt(key);
    if (!v || !v.length) return "";
    return '<div class="rb-block ' + (cls || "") + '">' + para(v) + "</div>";
  }
  function labeled(key, label, cls) {
    var v = txt(key);
    if (!v || !v.length) return "";
    return '<div class="rb-block ' + (cls || "") + '">'
      + '<div class="rb-label">' + esc(label) + "</div>" + para(v) + "</div>";
  }

  function schemaOf(mirror) {
    var mk = mKey(mirror), t = T();
    if (!mk || !t) return null;
    if (t.has(mk + ".preface.opening", lang())) return "v2";
    if (t.has(mk + ".threshold", lang())) return "v1";
    return null;
  }
  function canRender(mirror) { return !!schemaOf(mirror); }

  function gapKey(mk, res) {
    if (!res) return mk + ".gap.clear";
    var f = res.flags || {};
    if (res.scenario === "weak" || f.weakSignal) return mk + ".gap.weak";
    if (res.dualAxis && res.dualAxis.length === 2) return mk + ".gap.dual";
    if (f.sameAxisCloseness || res.scenario === "closeness") return mk + ".gap.closeness";
    return mk + ".gap.clear";
  }

  /* مفاتيح الطيف من مخرج المحرّك:
     position: balance | excess | deficit | ambiguous
     image:    excess_a | excess_b | excess_both | deficit_a | deficit_b | deficit_both */
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
      + '<span class="rb-lang-note">لغة القراءة</span>'
      + '<button type="button" class="rb-lang-btn' + (eg ? "" : " on") + '" data-rb-lang="ar">فصحى</button>'
      + '<button type="button" class="rb-lang-btn' + (eg ? " on" : "") + '" data-rb-lang="eg">عامية</button>'
      + "</div>";
  }

  function rankingHTML(model) {
    var r = model && model.ranking;
    if (!r || !r.rows || !r.rows.length) return "";
    var rows = r.rows.map(function (x) {
      return '<div class="rank-row' + (x.top ? " top" : "") + '">'
        + '<span class="rank-axis">' + esc(x.name || "") + "</span>"
        + '<div class="rank-bar"><div class="rank-fill" style="width:' + (x.percent || 0) + '%"></div></div>'
        + '<span class="rank-pct">' + arabicNum(x.percent || 0) + "٪</span></div>";
    }).join("");
    return '<div class="review-ranking"><div class="sr-axis">صورة هذه المرآة</div>'
      + '<div class="ranking">' + rows + "</div></div>";
  }

  function doorHead(base, fallback) {
    var n = txt(base + ".name");
    var main = (n && n[0]) ? n[0] : (fallback || "");
    var term = (n && n[1]) ? n[1] : "";
    return '<div class="rb-door-head"><div class="rb-door-main">' + esc(main) + "</div>"
      + (term ? '<div class="rb-door-term">واسمه في منظور الفؤاد: ' + esc(term) + "</div>" : "")
      + "</div>";
  }

  function ownershipHTML(mk, saved) {
    var v = txt(mk + ".ownership");
    if (!v || !v.length) return "";
    return '<div class="rb-own">' + para(v)
      + '<textarea class="rb-own-input" data-rb-own="' + esc(mk) + '" rows="2" '
      + 'placeholder="اكتب هنا إن أحببت">' + esc(saved || "") + "</textarea>"
      + '<div class="rb-own-state" data-rb-own-state="' + esc(mk) + '"></div></div>';
  }

  /* ─────────── التمهيد ─────────── */
  /* عناوين الأبواب تبنى من المحتوى، فكل مرآة تعرض أسماءها هي */

  var ORD = ["الأول", "الثاني", "الثالث"];

  function doorLabel(mk, n) {
    var v = txt(mk + ".a" + n + ".name");
    var main = (v && v[0]) ? v[0] : "";
    return "الباب " + ORD[n - 1] + (main ? " · " + main : "");
  }

  var PREFACE_KEYS = [
    ["opening", null],
    ["why", null],
    ["doorMeaning", null],
    ["door.a1", 1],
    ["door.a2", 2],
    ["door.a3", 3],
    ["scene", "الثلاثة في لحظة واحدة"],
    ["styleMeaning", "الأسلوب داخل الباب"],
    ["spectrumMeaning", "معنى الطيف"]
  ];

  function prefaceBody(mk) {
    var h = "";
    PREFACE_KEYS.forEach(function (p) {
      var key = mk + ".preface." + p[0];
      var lbl = (typeof p[1] === "number") ? doorLabel(mk, p[1]) : p[1];
      h += lbl ? labeled(key, lbl, "rb-pre") : block(key, "rb-pre");
    });
    return h;
  }

  function renderPreface(mirror, model, mk) {
    return '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": "
      + esc(model.mirrorName || "") + "</div>"
      + langBar()
      + '<div class="rb-preface">' + prefaceBody(mk) + "</div>"
      + '<div class="rb-go"><button type="button" class="rb-go-btn" data-rb-stage="report">'
      + "فهمت. أرني نتيجتي</button></div>";
  }

  /* ─────────── بوّابة المؤجّل ─────────── */
  function deferredHTML(mk, bases, model) {
    var d = D();
    if (!d) return "";
    var choice = (model && model.deferredChoice) || readMap(DEF_KEY)[mk] || null;
    if (choice === "later") return "";
    var keys = [];
    bases.forEach(function (b) {
      var k = b + ".spectrum.suspect";
      if (d.has(k, lang())) keys.push(k);
    });
    if (!keys.length) return "";

    var opened = (choice === "now");
    var h = '<div class="rb-deferred" data-rb-def="' + esc(mk) + '">';
    if (!opened) {
      h += '<div class="rb-def-ask"><p>وثمّ قراءة أخرى لحالتك، أدقّ من هذه وأثقل قليلا.</p>'
        + "<p>تقرأ على مهل، والصباح أفضل أوقاتها.</p>"
        + '<div class="rb-def-btns">'
        + '<button type="button" class="rb-def-btn" data-rb-def-act="now">أقرؤها الآن</button>'
        + '<button type="button" class="rb-def-btn ghost" data-rb-def-act="later">تنتظرني في زيارتي القادمة</button>'
        + "</div></div>";
    }
    h += '<div class="rb-def-body"' + (opened ? "" : " hidden") + ">";
    keys.forEach(function (k) {
      var v = d.get(k, lang());
      if (v) h += '<div class="rb-block rb-def-block">'
        + '<div class="rb-label">قراءة أدقّ لحالتك</div>' + para(v) + "</div>";
    });
    return h + "</div></div>";
  }

  /* ─────────── التقرير ─────────── */
  function renderReport(mirror, res, model, mk) {
    var h = '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": "
      + esc(model.mirrorName || "") + "</div>" + langBar();

    var weak = !!model.weakText || (res && (res.scenario === "weak" || (res.flags && res.flags.weakSignal)));

    var topByAxis = {};
    ((res && res.ranking) || []).forEach(function (row) {
      if (row && row.axisId && topByAxis[row.axisId] === undefined) topByAxis[row.axisId] = row.type;
    });
    var domAxis = (res && res.dominantAxis)
      || ((res && res.ranking && res.ranking[0]) ? res.ranking[0].axisId : null);

    if (!weak && domAxis && topByAxis[domAxis]) {
      var ak0 = aKey(mirror, domAxis);
      if (ak0) h += block(mk + "." + ak0 + ".threshold." + topByAxis[domAxis], "rb-threshold");
    }

    h += rankingHTML(model);
    h += block(gapKey(mk, res), "rb-gap");

    var bases = [];
    var RND = global.FOUAD_RENDER || null;

    if (!weak && res && res.spectrum && Object.keys(res.spectrum).length) {
      Object.keys(res.spectrum).forEach(function (axisId) {
        var ak = aKey(mirror, axisId);
        if (!ak) return;
        var base = mk + "." + ak;
        var sp = res.spectrum[axisId] || {};
        var t = topByAxis[axisId];
        bases.push(base);

        h += '<div class="rb-door">';
        h += doorHead(base, axisNameOf(mirror, axisId));
        h += block(base + ".intro", "rb-intro");

        /* التأصيل: للمحور الغالب وحده، بعد الحركة المركزية */
        if (axisId === domAxis) {
          h += labeled(base + ".rooting", "في الأصل", "rb-rooting");
        }

        if (t) h += labeled(base + ".door." + t, "أسلوبك داخل الباب", "rb-persona");
        h += labeled(base + ".distinguish", "كيف تفرق بين الثلاثة", "rb-distinction");
        if (t) h += labeled(base + ".daily." + t, "كيف يظهر في يومك", "rb-daily");

        var keys = spectrumKeys(base, sp);
        if (keys.length) {
          h += '<div class="rb-spectrum"><div class="sr-axis">'
            + esc(sp.positionLabel || "حال بابك الآن") + "</div>";
          h += (RND && RND.spectrumBar) ? RND.spectrumBar(sp) : "";
          keys.forEach(function (k) { h += block(k, "rb-pos"); });
          h += "</div>";
        }

        h += labeled(base + ".giftCost", "مكسب الباب وثمنه", "rb-gift");
        if (t) h += labeled(base + ".experiment." + t, "تجربة واحدة حتى المرآة القادمة", "rb-seed");
        h += "</div>";
      });
    }

    h += ownershipHTML(mk, model.ownershipSaved || "");
    h += block(mk + ".convergence", "rb-convergence");
    if (!weak) h += deferredHTML(mk, bases, model);
    h += block(mk + ".bridge", "rb-bridge");

    h += '<details class="rb-recall"><summary>تذكير بمعنى الباب والأسلوب والطيف</summary>'
      + '<div class="rb-recall-body">' + prefaceBody(mk) + "</div></details>";

    if (global.MIRRORS_FEEDBACK && global.MIRRORS_FEEDBACK.html) {
      h += global.MIRRORS_FEEDBACK.html(mk);
    }
    h += '<div class="home-actions"><button class="btn ghost" id="reviewBack">رجوع للبيت</button></div>';
    return h;
  }

  /* ─────────── البنية الأولى · كما كانت ─────────── */
  function renderV1(mirror, res, model, mk) {
    var h = '<div class="mirror-tag">المرآة ' + esc(model.mirrorOrdinal || "") + ": "
      + esc(model.mirrorName || "") + "</div>" + langBar();
    h += block(mk + ".threshold", "rb-threshold");
    h += rankingHTML(model);
    h += block(gapKey(mk, res), "rb-gap");

    var weak = !!model.weakText || (res && (res.scenario === "weak" || (res.flags && res.flags.weakSignal)));
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
        var base = mk + "." + ak, sp = res.spectrum[axisId] || {}, t = topByAxis[axisId];
        h += '<div class="rb-door">' + doorHead(base, axisNameOf(mirror, axisId));
        h += block(base + ".intro", "rb-intro");
        if (t) h += block(base + ".door." + t, "rb-persona");
        if (res.scenario === "clear" && axisId === domAxis) {
          h += labeled(base + ".rooting", "في الأصل", "rb-rooting");
        }
        var pos = sp.position;
        var susp = (sp.suspiciousBalance === true) || sp.key === "suspicious_balance";
        if (pos === "balance" || pos === "excess" || pos === "deficit") {
          var st = base + ".spectrum." + pos + ".";
          h += '<div class="rb-spectrum"><div class="sr-axis">' + esc(sp.positionLabel || "") + "</div>";
          h += (RND && RND.spectrumBar) ? RND.spectrumBar(sp) : "";
          h += block(st + "text", "rb-pos");
          h += labeled(st + "echo", "كيف يظهر في أسبوعك", "rb-echo");
          h += labeled(st + "face", "وجهها المتزن", "rb-face");
          h += labeled(st + "seed", "دعوة", "rb-seed");
          h += labeled(st + "marker", "علامة رصد", "rb-marker");
          h += "</div>";
        } else if (pos === "ambiguous") {
          h += block(mk + ".whisper.ambiguous", "rb-whisper");
        }
        if (susp) h += block(mk + ".whisper.suspicious", "rb-whisper");
        h += "</div>";
      });
    } else {
      h += block(mk + ".whisper.weak", "rb-whisper");
    }
    h += ownershipHTML(mk, model.ownershipSaved || "");
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
    if (schema === "v1") return renderV1(mirror, res, model, mk);
    if (schema !== "v2") return null;

    if (_stage === null) _stage = readMap(STAGE_KEY)[mk] ? "report" : "preface";
    return (_stage === "preface")
      ? renderPreface(mirror, model, mk)
      : renderReport(mirror, res, model, mk);
  }

  function repaint() {
    if (!_last) return;
    var host = document.querySelector(".card.review");
    if (!host) return;
    var html = render(_last.mirror, _last.res, _last.model);
    if (html) host.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function saveField(field, value, stateEl) {
    try {
      var S = global.FOUAD_STORE;
      var u = S && S.getCurrentUser ? S.getCurrentUser() : null;
      if (!u || !u.id || !global.db) { if (stateEl) stateEl.textContent = ""; return; }
      var payload = {}; payload[field] = value;
      global.db.collection(S.COLLECTION || "fouad_v2_results").doc(u.id)
        .set(payload, { merge: true })
        .then(function () { if (stateEl) stateEl.textContent = "حُفظ"; })
        .catch(function () { if (stateEl) stateEl.textContent = ""; });
    } catch (err) { if (stateEl) stateEl.textContent = ""; }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var lb = t.closest("[data-rb-lang]");
    if (lb) {
      try { localStorage.setItem(LANG_KEY, lb.getAttribute("data-rb-lang")); } catch (err) {}
      repaint(); return;
    }

    var sb = t.closest("[data-rb-stage]");
    if (sb) {
      _stage = sb.getAttribute("data-rb-stage");
      if (_last && _last.mirror) writeMap(STAGE_KEY, mKey(_last.mirror), true);
      repaint(); return;
    }

    var db = t.closest("[data-rb-def-act]");
    if (db) {
      var wrap = db.closest("[data-rb-def]");
      if (!wrap) return;
      var mk = wrap.getAttribute("data-rb-def");
      var act = db.getAttribute("data-rb-def-act");
      writeMap(DEF_KEY, mk, act);
      if (_last && _last.model) _last.model.deferredChoice = act;
      var o = {}; o[mk] = act;
      saveField("deferredChoice", o, null);
      if (act === "now") {
        var ask = wrap.querySelector(".rb-def-ask");
        var body = wrap.querySelector(".rb-def-body");
        if (ask) ask.remove();
        if (body) body.removeAttribute("hidden");
      } else {
        wrap.innerHTML = '<div class="rb-def-ask"><p>تمام. تنتظرك في زيارتك القادمة.</p></div>';
      }
    }
  });

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

  (function styles() {
    if (document.getElementById("rb-styles")) return;
    var css = ""
      + ".rb-lang{display:flex;align-items:center;gap:8px;margin:10px 0 18px;flex-wrap:wrap}"
      + ".rb-lang-note{font-size:13px;opacity:.6}"
      + ".rb-lang-btn{border:1px solid rgba(180,150,90,.45);background:transparent;color:inherit;"
      + "border-radius:999px;padding:5px 16px;font-family:inherit;font-size:14px;cursor:pointer}"
      + ".rb-lang-btn.on{background:rgba(180,150,90,.18);border-color:rgba(180,150,90,.9)}"
      + ".rb-block{margin:0 0 18px}"
      + ".rb-block p{margin:0 0 12px;line-height:2.05;font-size:17px}"
      + ".rb-label{font-size:13px;letter-spacing:.5px;opacity:.62;margin-bottom:8px}"
      + ".rb-preface .rb-block{margin-bottom:22px}"
      + ".rb-go{margin:30px 0 10px;text-align:center}"
      + ".rb-go-btn{border:1px solid rgba(180,150,90,.7);background:rgba(180,150,90,.16);color:inherit;"
      + "border-radius:999px;padding:12px 30px;font-family:inherit;font-size:17px;cursor:pointer}"
      + ".rb-threshold{border-inline-start:2px solid rgba(180,150,90,.55);padding-inline-start:14px;margin-bottom:24px}"
      + ".rb-threshold p{opacity:.94;font-size:18px}"
      + ".rb-door{margin:28px 0;padding:20px 0 4px;border-top:1px solid rgba(180,150,90,.22)}"
      + ".rb-door-head{margin-bottom:16px}"
      + ".rb-door-main{font-size:21px;font-weight:600}"
      + ".rb-door-term{font-size:14px;opacity:.65;margin-top:3px}"
      + ".rb-rooting{border-top:1px dashed rgba(180,150,90,.28);border-bottom:1px dashed rgba(180,150,90,.28);"
      + "padding:16px 0;margin:20px 0}"
      + ".rb-rooting p{opacity:.86;font-size:16px}"
      + ".rb-distinction{background:rgba(180,150,90,.06);border-radius:10px;padding:14px 16px}"
      + ".rb-spectrum{margin-top:20px}"
      + ".rb-seed,.rb-gift{background:rgba(180,150,90,.08);border-radius:10px;padding:14px 16px}"
      + ".rb-whisper{background:rgba(180,150,90,.07);border-radius:10px;padding:12px 14px}"
      + ".rb-convergence{margin-top:24px;padding-top:18px;border-top:1px solid rgba(180,150,90,.22)}"
      + ".rb-own{margin:28px 0 10px;padding-top:18px;border-top:1px solid rgba(180,150,90,.22)}"
      + ".rb-own-input{width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;border-radius:10px;"
      + "border:1px solid rgba(180,150,90,.35);background:transparent;color:inherit;font-family:inherit;"
      + "font-size:16px;line-height:1.8;resize:vertical}"
      + ".rb-own-state{font-size:12px;opacity:.6;margin-top:5px;min-height:16px}"
      + ".rb-deferred{margin:26px 0;padding:16px;border:1px solid rgba(180,150,90,.3);border-radius:12px}"
      + ".rb-def-ask p{margin:0 0 8px;line-height:1.95;font-size:16px;opacity:.85}"
      + ".rb-def-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}"
      + ".rb-def-btn{border:1px solid rgba(180,150,90,.6);background:rgba(180,150,90,.14);color:inherit;"
      + "border-radius:999px;padding:8px 18px;font-family:inherit;font-size:15px;cursor:pointer}"
      + ".rb-def-btn.ghost{background:transparent;opacity:.8}"
      + ".rb-def-block{margin-top:14px}"
      + ".rb-recall{margin:26px 0 8px;border-top:1px solid rgba(180,150,90,.22);padding-top:14px}"
      + ".rb-recall summary{cursor:pointer;font-size:15px;opacity:.75;list-style:none}"
      + ".rb-recall summary::-webkit-details-marker{display:none}"
      + ".rb-recall-body{margin-top:16px}"
      + ".rb-bridge p{opacity:.88}";
    var s = document.createElement("style");
    s.id = "rb-styles"; s.textContent = css;
    document.head.appendChild(s);
  })();

  global.MIRRORS_REPORT_BRIDGE = {
    canRender: canRender,
    render: render,
    lang: lang,
    schemaOf: schemaOf,
    resetStage: function () { _stage = null; }
  };
})(window);
