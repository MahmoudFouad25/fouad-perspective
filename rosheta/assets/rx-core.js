/* =====================================================================
   rx-core.js — نواة ورشة «قبل الروشتة»
   ---------------------------------------------------------------------
   بيعتمد على نواة الميزان (mizan/assets/config.js + core.js) في:
   الاتصال بفايربيز، والدخول، ورسايل الأخطاء بالاسم، والقناة المحلية.
   وبيستخدم نفس مجموعة «mizan» في قاعدة البيانات، بمعرّف جلسة مختلف
   (rosheta-1)، فمش محتاجين نغيّر أي قواعد أمان.

   القاعدة الذهبية: مفيش حاجة هنا بتوقف الصفحة.
   ===================================================================== */

var RX = (function () {
  var esc = MZ.esc, ar = MZ.ar;

  /* معرّف الجلسة: من الرابط ?s= ، أو rosheta-1 */
  function sid() {
    var s = MZ.qs("s", "rosheta-1") || "rosheta-1";
    s = s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
    return s || "rosheta-1";
  }

  var ROLES = { t: "مدرب", d: "مسؤول تنمية", o: "فريق تنظيم / ضيف" };

  var GOVS = ["القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الشرقية", "الدقهلية", "الغربية", "المنوفية",
    "كفر الشيخ", "البحيرة", "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا",
    "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح", "شمال سيناء", "جنوب سيناء"];

  /* ───────── الترابيزات ─────────
     people: [{u, n, r:"t"|"d"|"o", g:"محافظة"}]
     الهدف: كل ترابيزة فيها مدربين ومسؤولين تنمية مخلوطين،
     ومن محافظات مختلفة على قد ما نقدر.
     الطريقة: كل دور لوحده، مترتب بالمحافظة، ويتوزع بشكل ثعباني
     على الترابيزات. فاللي من نفس المحافظة بيتفرقوا لوحدهم. */
  function makeTables(people, size) {
    size = size || 6;
    var count = Math.max(1, Math.round(people.length / size));
    var out = {}, i = 0;
    function byGov(a, b) { return (a.g || "").localeCompare(b.g || "", "ar") || (a.n || "").localeCompare(b.n || "", "ar"); }
    var seq = []
      .concat(people.filter(function (p) { return p.r === "t"; }).sort(byGov))
      .concat(people.filter(function (p) { return p.r === "d"; }).sort(byGov))
      .concat(people.filter(function (p) { return p.r !== "t" && p.r !== "d"; }).sort(byGov));
    seq.forEach(function (p) {
      var lap = Math.floor(i / count), pos = i % count;
      out[p.u] = 1 + ((lap % 2 === 0) ? pos : (count - 1 - pos));
      i++;
    });
    return out;
  }

  /* المتأخر بيروح لأصغر ترابيزة، والأفضل اللي ناقصها دوره */
  function placeLate(person, groups, people) {
    var size = {}, same = {};
    people.forEach(function (p) {
      var t = groups[p.u]; if (!t) return;
      size[t] = (size[t] || 0) + 1;
      if (p.r === person.r) same[t] = (same[t] || 0) + 1;
    });
    var keys = Object.keys(size);
    if (!keys.length) return 1;
    keys.sort(function (a, b) { return (size[a] - size[b]) || ((same[a] || 0) - (same[b] || 0)); });
    return +keys[0];
  }

  /* ───────── تجميع الإجابات ─────────
     كل مشارك بيكتب إجاباته في مستند باسمه (votes/{uid}).
     لوحة التحكم بتجمعها هنا، وبتكتب النتيجة في مستند عام (pub/agg)
     فيه اللي محتاجينه للشاشة بس. والموبايلات بتقراه برضه. */
  function aggregate(votes, people, groups) {
    var acts = {};
    Object.keys(RX_ACTS).forEach(function (id) {
      var A = RX_ACTS[id], res;
      if (A.type === "tablePick") {
        /* اختيار الترابيزة: آخر حد سلّم من الترابيزة هو اللي بيتحسب */
        var byT = {};
        Object.keys(votes).forEach(function (u) {
          var v = votes[u] && votes[u][id]; if (!v || !v.c) return;
          var t = groups[u] || 0;
          if (!byT[t] || (v.at || 0) > (byT[t].at || 0)) byT[t] = { c: v.c, w: v.w || {}, at: v.at || 0, by: (people[u] && people[u].n) || "" };
        });
        var count = {};
        Object.keys(byT).forEach(function (t) { byT[t].c.forEach(function (c) { count[c] = (count[c] || 0) + 1; }); });
        res = { byT: byT, count: count, nT: Object.keys(byT).length };
      }
      else if (A.type === "texts") {
        /* إجابات مكتوبة بتتعرض على الحيطة */
        var list = [];
        Object.keys(votes).forEach(function (u) {
          var v = votes[u] && votes[u][id]; if (!v || !v.length) return;
          v.forEach(function (x, i) {
            if (!x || !x.t) return;
            list.push({ k: u.slice(0, 8) + i, t: String(x.t).slice(0, A.maxLen || 160), at: x.at || 0, tb: groups[u] || 0 });
          });
        });
        list.sort(function (a, b) { return a.at - b.at; });
        res = { list: list.slice(-120), n: list.length };
      }
      else if (A.type === "sort") {
        /* تصنيف كروت: لكل كارت، كام واحد حطه في كل خانة */
        var by = {}, n = 0;
        Object.keys(votes).forEach(function (u) {
          var v = votes[u] && votes[u][id]; if (!v) return; n++;
          Object.keys(v).forEach(function (card) { var b = v[card]; if (!b) return; by[card] = by[card] || {}; by[card][b] = (by[card][b] || 0) + 1; });
        });
        res = { by: by, n: n };
      }
      else if (A.type === "choice") {
        var cnt = {}, m = 0;
        Object.keys(votes).forEach(function (u) {
          var v = votes[u] && votes[u][id]; if (v === undefined || v === null || v === "") return; m++;
          [].concat(v).forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
        });
        res = { count: cnt, n: m };
      }
      if (res) acts[id] = res;
    });
    return acts;
  }

  /* أرقام عربية لعدد مع كلمة */
  function count(n, one, two, many) {
    n = n || 0;
    if (n === 0) return "مفيش";
    if (n === 1) return one;
    if (n === 2) return two;
    return ar(n) + " " + many;
  }

  return { sid: sid, ROLES: ROLES, GOVS: GOVS, makeTables: makeTables, placeLate: placeLate, aggregate: aggregate, count: count };
})();
