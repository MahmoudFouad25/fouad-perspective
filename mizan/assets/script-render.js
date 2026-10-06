/* =====================================================================
   script-render.js — رسم سكريبت الميسّر (صفحة السكريبت + جوّه لوحة التحكم)
   ===================================================================== */
var MZS = (function () {
  var esc = MZ.esc;

  function lines(arr) {
    var h = "", i = 0;
    while (i < arr.length) {
      var t = arr[i][0], v = arr[i][1];
      if (t === "row") {                       /* صفوف ورا بعض = جدول */
        h += '<table class="sc-t">';
        while (i < arr.length && arr[i][0] === "row") {
          h += "<tr>" + arr[i][1].map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; i++;
        }
        h += "</table>"; continue;
      }
      if (t === "li" || t === "li2") {
        h += '<ul class="sc-ul">';
        while (i < arr.length && (arr[i][0] === "li" || arr[i][0] === "li2")) {
          h += '<li class="' + arr[i][0] + '">' + fmt(arr[i][1]) + "</li>"; i++;
        }
        h += "</ul>"; continue;
      }
      var cls = { say: "sc-say", do: "sc-do", h: "sc-h", lab: "sc-lab", why: "sc-why", p: "sc-p" }[t] || "sc-p";
      h += '<div class="' + cls + '">' + fmt(v) + "</div>";
      i++;
    }
    return h;
  }
  /* [إرشاد] جوّه سطر كلام بيتلوّن لوحده */
  function fmt(s) { return esc(s).replace(/\[([^\]]+)\]/g, '<span class="sc-in">[$1]</span>'); }

  function state(id) { return (MZ_SCRIPT.st[id] || []); }
  function ses(n) { return MZ_SCRIPT.ses[n] || null; }

  /* أول كام سطر كلام من الشاشة الجاية */
  function peek(id, n) {
    return state(id).filter(function (l) { return l[0] === "say"; }).slice(0, n || 2).map(function (l) { return l[1]; });
  }

  return { lines: lines, state: state, ses: ses, peek: peek };
})();
