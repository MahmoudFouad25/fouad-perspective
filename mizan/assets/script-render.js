/* =====================================================================
   script-render.js — رسم سكريبت الميسّر (صفحة السكريبت + جوّه لوحة التحكم)
   ---------------------------------------------------------------------
   السكريبت متقسّم «مقاطع»: كل مقطع = خطوة على الشاشة.
   قبل كل مقطع علامة «⏭ التالي» فيها اللي هيظهر على الشاشة لما تدوس.
   المقطع اللي إنت فيه دلوقتي متعلّم، واللي فات باهت شوية.
   ===================================================================== */
var MZS = (function () {
  var esc = MZ.esc, ar = MZ.ar;

  /* [إرشاد] جوّه سطر كلام بيتلوّن لوحده */
  function fmt(s) { return esc(s).replace(/\[([^\]]+)\]/g, '<span class="sc-in">[$1]</span>'); }

  /* سطور من a لحد b (من غير b) */
  function chunk(arr, a, b) {
    var h = "", i = a;
    while (i < b) {
      var t = arr[i][0], v = arr[i][1];
      if (t === "row") {
        h += '<table class="sc-t">';
        while (i < b && arr[i][0] === "row") { h += "<tr>" + arr[i][1].map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; i++; }
        h += "</table>"; continue;
      }
      if (t === "li" || t === "li2") {
        h += '<ul class="sc-ul">';
        while (i < b && (arr[i][0] === "li" || arr[i][0] === "li2")) { h += '<li class="' + arr[i][0] + '">' + fmt(arr[i][1]) + "</li>"; i++; }
        h += "</ul>"; continue;
      }
      var cls = { say: "sc-say", do: "sc-do", h: "sc-h", lab: "sc-lab", why: "sc-why", p: "sc-p" }[t] || "sc-p";
      h += '<div class="' + cls + '">' + fmt(v) + "</div>";
      i++;
    }
    return h;
  }

  /* السطور كلها من غير علامات (لو حصل · ملاحظات المدرب · قبل الجلسة) */
  function lines(arr) { return chunk(arr || [], 0, (arr || []).length); }

  /* سكريبت شاشة كاملة بعلامات «التالي».
     o = { step: الخطوة الحالية (أو -1 لو بتتصفّح), next: الشاشة الجاية (state) } */
  function state(id, o) {
    o = o || {};
    var st = mzState(id), arr = (MZ_SCRIPT.st[id] || []);
    var mk = (typeof MZ_MARKS !== "undefined" && MZ_MARKS[id]) || [[-1, ""]];
    var n = mk.length, cur = o.step === undefined ? -1 : o.step;
    var at = st.phoneAt === undefined ? (st.phone && st.phone.t !== "listen" ? 0 : -1) : Math.min(st.phoneAt, n - 1);
    var h = "";
    for (var k = 0; k < n; k++) {
      var from = k === 0 ? 0 : mk[k][0], to = k + 1 < n ? mk[k + 1][0] : arr.length;
      var cls = cur < 0 ? "" : k === cur ? " now" : k < cur ? " done" : " later" + (k === cur + 1 ? " nx" : "");
      h += '<div class="sc-seg' + cls + '" data-seg="' + k + '">';
      if (k === 0) {
        h += '<div class="sc-mk first">🖥 الشاشة بتفتح على: <q>' + esc(mk[0][1]) + "</q>" + (at === 0 ? ' <span class="sc-ph">📱 الموبايلات فيها تفاعل</span>' : "") + "</div>";
      } else {
        h += '<div class="sc-mk">' + (cur >= 0 && k === cur + 1 ? '<span class="sc-go">👈 دُس هنا</span> ' : "") + '<span class="sc-k">⏭ التالي</span> <span class="sc-n">' + ar(k + 1) + "/" + ar(n) + "</span> يظهر: <q>" + esc(mk[k][1]) + "</q>" +
          (k === at ? ' <span class="sc-ph">📱 وهنا الموبايلات بتتفتح للتفاعل</span>' : "") + "</div>";
      }
      h += chunk(arr, from, Math.max(from, to));
      h += "</div>";
    }
    if (!arr.length && n <= 1) h = '<div class="sc-seg' + (cur >= 0 ? " now" : "") + '"><div class="sc-mk first">🖥 الشاشة: <q>' + esc(mk[0][1]) + '</q></div><p class="sc-empty">مفيش كلام في الشاشة دي.</p></div>';
    if (o.next) h += '<div class="sc-mk end' + (cur >= 0 && cur === n - 1 ? " nx" : "") + '">' + (cur >= 0 && cur === n - 1 ? '<span class="sc-go">👈 دُس هنا</span> ' : "") + '<span class="sc-k">⏭ التالي</span> ينقلك للشاشة الجاية: <q>' + esc(o.next.label) + "</q></div>";
    return h;
  }

  /* يخلّي المقطع الحالي في نص الشاشة */
  function focus(root, smooth, inBox, offset) {
    var el = root && root.querySelector(".sc-seg.now");
    if (!el) return;
    if (inBox) {                       /* جوّه صندوق بيسكرول (لوحة التحكم) */
      var top = root.scrollTop + el.getBoundingClientRect().top - root.getBoundingClientRect().top - 6;
      root.scrollTop = top;            /* فوري: أضمن من الـsmooth لو اللوحة اترسمت تاني */
      return;
    }
    var y = el.getBoundingClientRect().top + window.pageYOffset - (offset || 0);
    try { window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" }); } catch (e) { window.scrollTo(0, y); }
  }

  function ses(n) { return MZ_SCRIPT.ses[n] || null; }
  function peek(id, n) {
    return (MZ_SCRIPT.st[id] || []).filter(function (l) { return l[0] === "say"; }).slice(0, n || 2).map(function (l) { return l[1]; });
  }
  return { lines: lines, state: state, focus: focus, ses: ses, peek: peek, raw: function (id) { return MZ_SCRIPT.st[id] || []; } };
})();
