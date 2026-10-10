/* تقارير نموذجية:  node three-axes/v2/report/samples.js
   ٣ عملاء: محمود (إجاباته الحقيقية)، وعميلين مصنوعين. بيكتب samples.json (التقارير + معلومات داخلية). */
"use strict";
var fs = require("fs"), path = require("path");
var E = require("../engine/engine.js"), C = require("../engine/config.js"), items = require("../engine/items.json");
var T = require("./texts.json"), Rp = require("./render.js");

function base() { return { questionsVersion: items.version, period: { selected: ["p8"], impact: null }, triad: {}, freq: {}, bipolar: {}, timing: {} }; }
function pick(it, c, f) {
  var o = function (ax) { return it.options.filter(function (x) { return x.axis === ax; })[0].id; };
  return { closest: o(c), farthest: o(f), none: false };
}

/* أ. محمود: من engine/tests/mahmoud.json */
function mahmoud() {
  var m = require("../engine/tests/mahmoud.json"), a = base();
  a.period = m.period;
  items.station1.forEach(function (it, i) { a.triad[it.id] = { closest: "o" + (m.s1[i][0] + 1), farthest: "o" + (m.s1[i][1] + 1), none: false }; });
  items.station2.forEach(function (it, i) { a.triad[it.id] = { closest: "o" + (m.s2[i][0] + 1), farthest: "o" + (m.s2[i][1] + 1), none: false }; });
  [3, 4, 5, 7].forEach(function (k) { m["s" + k].forEach(function (v, i) { a.freq["s" + k + "n" + (i + 1)] = v; }); });
  m.s6.forEach(function (v, i) { a.freq["s6n" + (i + 1)] = v; });
  m.s6t.forEach(function (v, i) { a.bipolar["s6t" + (i + 1)] = v; });
  a.adaptiveShown = { row: m.adaptiveShown };
  return a;
}

/* ب. الرئيسي الحيوية بثقة متوسطة، والمكبوت غير محسوم، والبدن متزن، ومفيش أي تنبيه */
function clientB() {
  var a = base(), k = 0;
  items.station1.forEach(function (it) {
    if (it.light) { a.triad[it.id] = { closest: null, farthest: null, none: true }; return; }
    a.triad[it.id] = k < 9 ? pick(it, "V", "H") : pick(it, "A", "H"); k++;
  });
  items.station2.forEach(function (it, i) { a.triad[it.id] = i < 4 ? pick(it, "A", "V") : pick(it, "H", "V"); });
  var dimVals = {
    H1: { excess: [1, 0], deficit: [1, 1], leave: 3, take: 3 },   // متزن
    H2: { excess: [2, 2], deficit: [1, 1], leave: 2, take: 2 },   // ميل بالفرق ناحية الإفراط
    H3: { excess: [2, 2], deficit: [2, 2], leave: 2, take: 2 },   // منطقة وسط
    V1: { excess: [3, 2], deficit: [1, 1], leave: 2, take: 3 },   // ميل بالفرق
    V2: { excess: [2, 2], deficit: [2, 1], leave: 2, take: 2 },
    V3: { excess: [2, 1], deficit: [2, 2], leave: 2, take: 1 },   // ميل ناحية التفريط (الأخذ واطي)
    A1: { excess: [2, 2], deficit: [1, 2], leave: 2, take: 2 },
    A2: { excess: [1, 1], deficit: [2, 2], leave: 2, take: 2 },
    A3: { excess: [2, 2], deficit: [2, 2], leave: 2, take: 2 }
  };
  var seen = {};
  items.freq.forEach(function (it) {
    if (it.dim) {
      var v = dimVals[it.dim][it.kind];
      if (Array.isArray(v)) { var key = it.dim + it.kind; seen[key] = (seen[key] || 0); a.freq[it.id] = v[seen[key]++]; }
      else a.freq[it.id] = v;
    } else if (it.kind === "cycle") a.freq[it.id] = it.axis === "V" ? (it.id === "s6n8" ? 2 : 3) : 1;
    else if (it.kind === "validity") a.freq[it.id] = 1;
    else a.freq[it.id] = 1;   // خوف وتجمّد وانطفاء واستبدال: نادرًا
  });
  a.bipolar = { s6t1: 2, s6t2: 3, s6t3: 4 };
  a.adaptiveShown = { row: E.adaptiveRow(a, items, C).row };
  return a;
}

/* ج. الرئيسي الحفظ بثقة ضعيفة، و«نمط إجابة»، وتنبيه فترة */
function clientC() {
  var a = base(), k = 0;
  var plan = [["H", "V"], ["H", "A"], ["V", "A"], ["A", "H"], ["V", "H"], ["H", "V"], ["A", "V"], ["V", "A"], ["H", "A"], ["A", "H"], ["V", "H"], ["H", "V"], ["A", "V"], ["V", "A"], ["A", "V"]];
  items.station1.forEach(function (it) {
    if (it.light) { a.triad[it.id] = pick(it, "H", "V"); return; }
    a.triad[it.id] = pick(it, plan[k][0], plan[k][1]); k++;
  });
  items.station2.forEach(function (it, i) { a.triad[it.id] = pick(it, ["V", "A", "V", "A", "H", "V"][i], ["A", "V", "H", "V", "A", "H"][i]); });
  items.freq.forEach(function (it) {
    if (it.dim) a.freq[it.id] = 3;
    else if (it.kind === "cycle") a.freq[it.id] = it.id === "s6n8" ? 2 : 3;
    else if (it.kind === "validity") a.freq[it.id] = 1;
    else if (it.kind === "fear") a.freq[it.id] = 3;
    else a.freq[it.id] = 2;   // تجمّد وانطفاء واستبدال
  });
  a.bipolar = { s6t1: 1, s6t2: 5, s6t3: 3 };
  a.period = { selected: ["p2"], impact: "متوسط" };
  a.adaptiveShown = { row: E.adaptiveRow(a, items, C).row };
  return a;
}

var cases = [
  { key: "أ", title: "أ. تقرير محمود (إجاباته في الاختبار) — نسخة البصيرة الحكيمة", answers: mahmoud(), opts: { mode: "insight", name: "محمود" } },
  { key: "ب", title: "ب. عميل مصنوع: الحيوية بثقة متوسطة، والهادي غير محسوم، ومفيش تنبيهات — النسخة المنفردة", answers: clientB(), opts: { mode: "standalone", name: "سارة" } },
  { key: "ج", title: "ج. عميل مصنوع: الحفظ بثقة ضعيفة، ونمط إجابة، وتنبيه فترة — النسخة المنفردة", answers: clientC(), opts: { mode: "standalone", name: "كريم" } }
];
var out = cases.map(function (c) {
  var R = E.score(c.answers, items, C), rep = Rp.renderReport(R, E.normalize(c.answers), items, T, c.opts);
  return { key: c.key, title: c.title, blocks: rep.blocks, meta: rep.meta,
           engine: { main: R.ranking.main, order: R.ranking.order, points: R.ranking.points, confidence: R.ranking.confidence,
                     suppressed: [R.suppressed.status, R.suppressed.axis, R.suppressed.alternatives], acq: R.quality.acquiescence.flag,
                     validity: R.quality.validity.flag, period: R.alerts.period.on,
                     alerts: ["freeze", "depletion", "mood"].filter(function (k) { return R.alerts[k].on; }),
                     dims: R.dimensions.map(function (d) { return d.id + ":" + d.reportStatus; }) } };
});
fs.writeFileSync(path.join(__dirname, "samples.json"), JSON.stringify(out, null, 1));
out.forEach(function (o) {
  console.log("\n=== " + o.title + "\n" + JSON.stringify(o.engine));
  console.log("كلمات: " + o.meta.words);
  console.log("ظهر: " + o.meta.shown.join(" | "));
  console.log("ما ظهرش: " + (o.meta.hidden.join(" | ") || "—"));
  console.log("مشاكل: " + (o.meta.problems.join(" | ") || "—"));
});
