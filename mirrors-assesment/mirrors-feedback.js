/* ============================================================
   mirrors-feedback.js
   زرّ الاعتراض: «أنا مش شايف نفسي هنا»
   ------------------------------------------------------------
   المكان: mirrors-assesment/mirrors-feedback.js

   ثلاث وظائف في حركة واحدة:
     • حقّ المتفحّص في الاعتراض على قراءة آليّة
     • مادّة تحسين للمحتوى، بلسان الناس أنفسهم
     • إعلانٌ عمليّ بأنّ الأداة لا تدّعي العصمة

   يُخزَّن في مجموعة mirrors_feedback مستقلّة، لا في نتيجة
   المتفحّص، حتّى لا يختلط رأيه في الأداة بقياسه هو.
   ============================================================ */

(function (global) {
  "use strict";

  var COLLECTION = "mirrors_feedback";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function html(mk) {
    return ''
      + '<div class="mf-wrap" data-mf="' + esc(mk) + '">'
      +   '<button type="button" class="mf-open">لا أرى نفسي هنا</button>'
      +   '<div class="mf-panel" hidden>'
      +     '<p class="mf-note">ما الذي لم يشبهك؟ اكتب بعبارتك، ولو سطرًا واحدًا.</p>'
      +     '<textarea class="mf-input" rows="3" placeholder="اكتب هنا"></textarea>'
      +     '<div class="mf-row">'
      +       '<button type="button" class="mf-send">أرسل</button>'
      +       '<span class="mf-state"></span>'
      +     '</div>'
      +     '<p class="mf-note small">يصلنا ما تكتبه لنراجع النصّ نفسه. ولا يغيّر شيئًا في نتيجتك.</p>'
      +   '</div>'
      + '</div>';
  }

  function send(mk, text, stateEl) {
    try {
      var S = global.FOUAD_STORE;
      var u = S && S.getCurrentUser ? S.getCurrentUser() : null;
      if (!global.db) { if (stateEl) stateEl.textContent = "تعذّر الإرسال"; return; }
      global.db.collection(COLLECTION).add({
        mirror: mk,
        text: text,
        lang: (global.MIRRORS_REPORT_BRIDGE && global.MIRRORS_REPORT_BRIDGE.lang)
                ? global.MIRRORS_REPORT_BRIDGE.lang() : "ar",
        userId: (u && u.id) ? u.id : null,
        userName: (u && u.name) ? u.name : null,
        createdAt: new Date().toISOString()
      })
      .then(function () { if (stateEl) stateEl.textContent = "وصلنا. شكرًا لك."; })
      .catch(function () { if (stateEl) stateEl.textContent = "تعذّر الإرسال"; });
    } catch (e) { if (stateEl) stateEl.textContent = "تعذّر الإرسال"; }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var open = t.closest(".mf-open");
    if (open) {
      var wrap = open.closest(".mf-wrap");
      var panel = wrap && wrap.querySelector(".mf-panel");
      if (panel) {
        if (panel.hasAttribute("hidden")) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      }
      return;
    }

    var btn = t.closest(".mf-send");
    if (btn) {
      var w = btn.closest(".mf-wrap");
      if (!w) return;
      var mk = w.getAttribute("data-mf");
      var input = w.querySelector(".mf-input");
      var st = w.querySelector(".mf-state");
      var val = String(input && input.value || "").trim();
      if (!val) { if (st) st.textContent = "اكتب سطرًا أوّلًا"; return; }
      if (st) st.textContent = "جارٍ الإرسال";
      send(mk, val, st);
    }
  });

  (function styles() {
    if (document.getElementById("mf-styles")) return;
    var css = ''
      + '.mf-wrap{margin:22px 0 6px}'
      + '.mf-open{border:1px dashed rgba(180,150,90,.5);background:transparent;color:inherit;opacity:.75;'
      + 'border-radius:999px;padding:7px 16px;font-family:inherit;font-size:14px;cursor:pointer}'
      + '.mf-panel{margin-top:12px}'
      + '.mf-note{margin:0 0 8px;font-size:15px;opacity:.8;line-height:1.8}'
      + '.mf-note.small{font-size:13px;opacity:.6;margin-top:8px}'
      + '.mf-input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;'
      + 'border:1px solid rgba(180,150,90,.35);background:transparent;color:inherit;font-family:inherit;'
      + 'font-size:16px;line-height:1.8;resize:vertical}'
      + '.mf-row{display:flex;align-items:center;gap:10px;margin-top:8px}'
      + '.mf-send{border:1px solid rgba(180,150,90,.6);background:rgba(180,150,90,.14);color:inherit;'
      + 'border-radius:999px;padding:7px 18px;font-family:inherit;font-size:15px;cursor:pointer}'
      + '.mf-state{font-size:13px;opacity:.7}';
    var s = document.createElement("style");
    s.id = "mf-styles"; s.textContent = css;
    document.head.appendChild(s);
  })();

  global.MIRRORS_FEEDBACK = { html: html, COLLECTION: COLLECTION };
})(window);
