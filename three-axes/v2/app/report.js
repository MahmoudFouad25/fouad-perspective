/* =====================================================================
   report.js — تقرير العميل في «مقياس مسارات الطاقة» (النسخة ٢)
   بيبني التقرير من النتيجة المحفوظة في وثيقته + نصوص التقرير المقفولة (report/texts.json)،
   بالنسخة الصح (منفرد / البصيرة الحكيمة). مفيش أي رقم أو تنبيه أو اسم داخلي بيظهر للعميل.
   ===================================================================== */
(function () {
  "use strict";
  var X = window.AXV2, E = window.AxesV2Engine, RP = window.AxesV2Report;
  var esc = X.esc, ar = X.ar;
  var main = null, CTX = null, DOC = null, RATE = null;
  function $(s) { return document.querySelector(s); }

  function blocksHTML(B) {
    var h = "", inList = false;
    B.forEach(function (b) {
      if (b.t === "pending") return;
      if (b.t !== "li" && inList) { h += "</ul>"; inList = false; }
      if (b.t === "title") h += '<h1 class="rp-title">' + esc(b.text) + "</h1>";
      else if (b.t === "h2" || b.t === "h3" || b.t === "h4") h += "<" + b.t + ">" + esc(b.text) + "</" + b.t + ">";
      else if (b.t === "li") { if (!inList) { h += "<ul>"; inList = true; } h += "<li>" + esc(b.text) + "</li>"; }
      else if (b.t === "btn") h += '<p class="rp-btn"><a class="next wa" href="' + esc(b.href) + '" target="_blank" rel="noopener">' + esc(b.text) + "</a></p>";
      else if (b.t === "card") h += '<div class="dcard"><div class="dc-name">' + esc(b.name) + '</div><div class="dc-line">' + esc(b.line) + '</div><div class="dc-state">' + (b.label ? '<span class="dc-lbl">' + esc(b.label) + '</span>' : '') + esc(b.state) + '</div><p>' + esc(b.text) + "</p></div>";
      else if (b.t === "rate") RATE = b;
      else h += "<p>" + esc(b.text) + "</p>";
    });
    return h + (inList ? "</ul>" : "");
  }

  function rateHTML() {
    var r = DOC.rating || {}, Q = RATE || { text: "التقرير ده وصفك قد إيه؟", scale: [], note: "لو حابب تقول أكتر (اختياري)" };
    var h = '<section class="rate noprint" id="rate"><h3>' + esc(Q.text) + '</h3><div class="dots5" role="radiogroup" aria-label="' + esc(Q.text) + '">';
    for (var v = 1; v <= 5; v++) h += '<button type="button" data-v="' + v + '" class="' + (r.value === v ? "on" : "") + '" role="radio" aria-checked="' + (r.value === v) + '" title="' + esc(Q.scale[v - 1] || "") + '">' + ar(v) + "</button>";
    h += '</div><p class="scale-now" id="scaleNow">' + esc(r.value ? (Q.scale[r.value - 1] || "") : (Q.scale.length ? "١ = " + Q.scale[0] + " · ٥ = " + Q.scale[4] : "")) + "</p>";
    h += '<label class="field"><span>' + esc(Q.note) + '</span><textarea id="rateNote" rows="3" maxlength="2000">' + esc(r.note || "") + "</textarea></label>";
    h += '<button type="button" class="next" id="rateSave"' + (r.value ? "" : ' aria-disabled="true"') + ">ابعت رأيك</button>";
    return h + '<p class="soft" id="rateMsg">' + (r.value ? "وصلنا رأيك، شكرًا. تقدر تغيّره في أي وقت." : "") + "</p></section>";
  }

  function render() {
    var A = E.normalize(DOC), ITEMS = window.__items, TEXTS = window.__texts;
    var rep = RP.renderReport(DOC.result, A, ITEMS, TEXTS, {
      mode: CTX.mode, name: X.first(CTX.name || DOC.name),
      contact: X.CFG.contact.text, contactLink: X.CFG.contact.link, contactLabel: X.CFG.contact.label
    });
    if (rep.meta.problems.length) console.warn("[axv2 report]", rep.meta.problems);
    var body = blocksHTML(rep.blocks);
    var h = '<article class="card report rise">' + body + rateHTML() + "</article>";
    h += '<div class="tools"><button type="button" class="next ghost" id="print">احفظه PDF أو اطبعه</button><a class="next ghost" href="' + X.CFG.myCoursesPath + '">ارجع لكورساتي</a></div>';
    main.innerHTML = h;
    wire();
  }

  function wire() {
    var val = (DOC.rating && DOC.rating.value) || null;
    document.querySelectorAll("#rate .dots5 button").forEach(function (b) {
      b.addEventListener("click", function () {
        val = +b.getAttribute("data-v");
        document.querySelectorAll("#rate .dots5 button").forEach(function (x) { var on = +x.getAttribute("data-v") === val; x.className = on ? "on" : ""; x.setAttribute("aria-checked", on); });
        $("#rateSave").removeAttribute("aria-disabled");
        if (RATE && RATE.scale[val - 1]) $("#scaleNow").textContent = RATE.scale[val - 1];
      });
    });
    $("#rateSave").addEventListener("click", function () {
      if (!val) return;
      var btn = this, msg = $("#rateMsg"), note = ($("#rateNote").value || "").trim().slice(0, 2000);
      btn.setAttribute("aria-disabled", "true");
      var rating = { value: val, note: note, at: Date.now() };
      X.docRef(CTX.userId).update({ rating: rating, updatedAt: X.ts() }).then(function () {
        DOC.rating = rating; msg.textContent = "وصلنا رأيك، شكرًا. تقدر تغيّره في أي وقت."; btn.removeAttribute("aria-disabled");
      }).catch(function (e) {
        console.warn(e); msg.textContent = "ما اتبعتش. اتأكد من النت وجرّب تاني."; btn.removeAttribute("aria-disabled");
      });
    });
    $("#print").addEventListener("click", function () { window.print(); });
  }

  function boot() {
    main = $("#main");
    Promise.all([X.loadJSON("../engine/items.json"), X.loadJSON("../report/texts.json"), X.identify()]).then(function (r) {
      window.__items = r[0]; window.__texts = r[1];
      return r[2].status === "ok" ? r[2] : X.runGate(main, r[2]);
    }).then(function (ctx) {
      CTX = ctx;
      return X.docRef(CTX.userId).get();
    }).then(function (snap) {
      DOC = snap.exists ? snap.data() : null;
      if (!DOC || DOC.status !== "خلص" || !DOC.result) { location.replace("index.html"); return; }
      render();
      var patch = {};
      if (!DOC.reportViewedAt) patch.reportViewedAt = Date.now();
      if (DOC.purchase !== CTX.mode) patch.purchase = CTX.mode;   // لو اشترى البصيرة بعد ما خلّص
      if (Object.keys(patch).length) X.docRef(CTX.userId).update(patch).catch(function (e) { console.warn(e); });
    }).catch(function (e) {
      console.error(e);
      main.innerHTML = '<section class="card"><h2>التقرير ما اتحمّلش</h2><p>جرّب تقفل الصفحة وتفتحها تاني. ولو المشكلة فضلت، كلّمنا: <a href="' +
        X.CFG.contact.link + '" target="_blank" rel="noopener">' + esc(X.CFG.contact.text) + '</a></p><p class="soft">' + esc((e && e.message) || e) + "</p></section>";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
