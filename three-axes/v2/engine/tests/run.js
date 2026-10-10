/* اختبارات المحرك:  node three-axes/v2/engine/tests/run.js
   ٦ ملفات مصنوعة + حالة حقيقية (إجابات محمود). بيطبع كل نتيجة، وبيخرج بكود ١ لو فيه فشل.
   ⚑ لو حاجة فشلت: ما تغيّرش المتوقع علشان الاختبار ينجح. افهم إيه اللي اختلف وليه. */
"use strict";
var path = require("path"), fs = require("fs");
var E = require("../engine.js"), C = require("../config.js");
var items = require("../items.json");

var fails = 0, passes = 0, log = [];
function eq(name, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passes++; else fails++;
  log.push((ok ? "  ✓ " : "  ✗ ") + name + (ok ? "" : "  ← المتوقع " + JSON.stringify(want) + " والمحرك طلّع " + JSON.stringify(got)));
}
var AX = ["H", "V", "A"];

/* ───────── بنّاء إجابات ───────── */
function build(p) {
  var a = { questionsVersion: items.version, period: p.period || { selected: ["p8"], impact: null }, triad: {}, freq: {}, bipolar: {}, timing: p.timing || {} };
  function pick(it, cAx, fAx) {
    var c = it.options.filter(function (o) { return o.axis === cAx; })[0], f = it.options.filter(function (o) { return o.axis === fAx; })[0];
    return { closest: c.id, farthest: f.id, none: false };
  }
  var core = 0;
  items.station1.forEach(function (it, i) {
    var pr = p.s1(it, it.light ? -1 : core++, i);
    a.triad[it.id] = pr ? pick(it, pr[0], pr[1]) : { closest: null, farthest: null, none: true };
  });
  items.station2.forEach(function (it, i) { var pr = p.s2(it, i); a.triad[it.id] = pick(it, pr[0], pr[1]); });
  items.freq.forEach(function (it) { a.freq[it.id] = p.freq(it); });
  items.bipolar.forEach(function (b) { a.bipolar[b.id] = p.bip ? p.bip(b) : 3; });
  var r = E.adaptiveRow(a, items, C); a.adaptiveShown = { row: r.row };
  return a;
}
function rot(k) { return [AX[k % 3], AX[(k + 1) % 3]]; }   // الأقرب والأبعد بيلفّوا ← كل محور صفر
function dimMap(spec) { // spec: {H:'excess', V:'fitra', ...} ← قيم العبارات حسب نوعها
  var V = {
    excess:   { excess: 3, deficit: 1, leave: 1, take: 3 },
    deficit:  { excess: 1, deficit: 3, leave: 3, take: 1 },
    fitra:    { excess: 1, deficit: 1, leave: 3, take: 3 },
    flat:     { excess: 2, deficit: 2, leave: 2, take: 2 }
  };
  return function (it) {
    if (it.dim) return V[spec[it.axis]][it.kind];
    if (it.kind === "validity") return spec.validity != null ? spec.validity : 0;
    if (it.kind === "cycle") return spec.cycle != null ? spec.cycle : 1;
    if (it.kind === "adaptive" || it.kind === "fear" || it.kind === "freeze" || it.kind === "depletion") return spec.s7 != null ? spec.s7 : 1;
    return 1;
  };
}

/* ───────── الملفات المصنوعة ───────── */
var profiles = [
  { name: "١. رئيسي واضح: الحفظ (والمكبوت الانتماء مؤكد، وأبعاده تفريط = سكوت المسار)",
    s1: function (it, k) { return k < 0 ? null : ["H", "A"]; },
    s2: function () { return ["A", "H"]; },
    freq: dimMap({ H: "excess", V: "fitra", A: "deficit" }),
    expect: function (r) {
      eq("الرئيسي", r.ranking.main, "H"); eq("الثقة", r.ranking.confidence, "قوية"); eq("النقط", r.ranking.points, { H: 15, V: 0, A: -15 });
      eq("الاتساق", r.ranking.consistency, { closest: 15, of: 15 });
      eq("المكبوت", [r.suppressed.axis, r.suppressed.status], ["A", "مؤكد"]); eq("المساند", r.suppressed.supporting, "V");
      eq("أبعاد الحفظ", r.dimensions.filter(function (d) { return d.axis === "H"; }).map(function (d) { return d.status; }), ["excess", "excess", "excess"]);
      eq("أبعاد الحيوية", r.dimensions.filter(function (d) { return d.axis === "V"; }).map(function (d) { return d.status; }), ["fitra", "fitra", "fitra"]);
      eq("أبعاد الانتماء + سكوت المسار", r.dimensions.filter(function (d) { return d.axis === "A"; }).map(function (d) { return d.status + (d.silentPath ? "+سكوت" : ""); }), ["deficit+سكوت", "deficit+سكوت", "deficit+سكوت"]);
      eq("صيغة الاستبدال", r.adaptive.computed.row, "H←A");
      eq("مفيش نمط إجابة", r.quality.acquiescence.flag, false);
    } },
  { name: "٢. رئيسي واضح: الحيوية (والمرشح الحفظ سكوته صفر ← «الأضعف بس»)",
    s1: function (it, k) { return k < 0 ? null : ["V", "H"]; },
    s2: function () { return ["A", "V"]; },
    freq: dimMap({ H: "flat", V: "excess", A: "fitra" }),
    expect: function (r) {
      eq("الرئيسي", r.ranking.main, "V"); eq("الثقة", r.ranking.confidence, "قوية");
      eq("المكبوت", [r.suppressed.axis, r.suppressed.status], ["H", "الأضعف بس"]); eq("المساند", r.suppressed.supporting, "A");
      eq("أبعاد الحفظ (كلها ٢)", r.dimensions.filter(function (d) { return d.axis === "H"; }).map(function (d) { return d.status; }), ["undetermined", "undetermined", "undetermined"]);
      eq("صيغة الاستبدال", r.adaptive.computed.row, "V←H");
    } },
  { name: "٣. رئيسي واضح: الانتماء (بس أعلى سكوت لمحور تاني ← «غير محسوم» بالاحتمالين)",
    s1: function (it, k) { return k < 0 ? null : ["A", "V"]; },
    s2: function (it, i) { return i < 4 ? ["H", "A"] : ["V", "A"]; },
    freq: dimMap({ H: "fitra", V: "fitra", A: "excess", cycle: 3 }),
    expect: function (r) {
      eq("الرئيسي", r.ranking.main, "A"); eq("الثقة", r.ranking.confidence, "قوية");
      eq("السكوت", r.suppressed.silence, { H: 4, V: 2, A: -6 });
      eq("المكبوت", [r.suppressed.axis, r.suppressed.status], [null, "غير محسوم"]);
      eq("الاحتمالين", r.suppressed.alternatives, ["V", "H"]);
      eq("أبعاد الانتماء (إفراط عالي ودايرة عالية، بس التفريط واطي)", r.dimensions.filter(function (d) { return d.axis === "A"; }).map(function (d) { return d.status; }), ["excess", "excess", "excess"]);
      eq("صيغة الاستبدال عامة", r.adaptive.computed.row, "عامة");
    } },
  { name: "٤. بيوافق على كل حاجة (دايمًا في كل عبارة)",
    s1: function (it, k) { return rot(Math.max(k, 0)); },
    s2: function (it, i) { return rot(i); },
    freq: function () { return 4; }, bip: function () { return 5; },
    expect: function (r) {
      eq("الثقة", r.ranking.confidence, "ضعيفة"); eq("المكبوت", r.suppressed.status, "غير محسوم");
      eq("نمط إجابة", r.quality.acquiescence.label, "نمط إجابة");
      eq("احتمال تجميل", r.quality.validity.label, "احتمال تجميل");
      eq("التناقضات (ترك عالي مع إفراط عالي، وأخذ عالي مع تفريط عالي، في الـ٩)", r.quality.contradictions.count, 18);
      eq("حال الأبعاد (الدايرة عالية فبتكسب على التباس)", r.dimensions.map(function (d) { return d.status; }).filter(function (s) { return s === "cycle"; }).length, 9);
      eq("وفي التقرير: كل «دايرة» بتتقري «التباس» لأن فيه نمط إجابة", r.dimensions.map(function (d) { return d.reportStatus; }).filter(function (s) { return s === "ambiguous"; }).length, 9);
      eq("والعميل يشوف «إشارات متداخلة»، والتقرير يقول ده في أوله", [r.dimensions[0].clientWord, r.quality.acquiescence.reportNote], ["إشارات متداخلة", true]);
      eq("التنبيهات", [r.alerts.depletion.on, r.alerts.mood.on, r.alerts.freeze.on], [true, true, true]);
    } },
  { name: "٥. متعادل (الترتيب صفر في الكل، وكل العبارات «أحيانًا»)",
    s1: function (it, k) { return rot(Math.max(k, 0)); },
    s2: function (it, i) { return rot(i + 1); },
    freq: function () { return 2; },
    expect: function (r) {
      eq("النقط", r.ranking.points, { H: 0, V: 0, A: 0 }); eq("الثقة", r.ranking.confidence, "ضعيفة"); eq("تعادل في الأول", r.ranking.tiedTop, true);
      eq("المكبوت", r.suppressed.status, "غير محسوم");
      eq("حال الأبعاد", r.dimensions.map(function (d) { return d.status; }).filter(function (s) { return s === "undetermined"; }).length, 9);
      eq("والعميل يشوفها «منطقة وسط»", r.dimensions[0].clientWord, "منطقة وسط");
      eq("صيغة الاستبدال عامة", r.adaptive.computed.row, "عامة");
      eq("مفيش نمط إجابة", r.quality.acquiescence.flag, false);
    } },
  { name: "٦. متوازن: رئيسي بثقة متوسطة، والأبعاد كلها فطرة، وإجابة سريعة في محطة",
    s1: function (it, k) { return k < 0 ? null : k < 9 ? ["H", "A"] : ["V", "A"]; },
    s2: function () { return ["A", "H"]; },
    freq: dimMap({ H: "fitra", V: "fitra", A: "fitra" }),
    timing: { "3": { startedAt: 0, endedAt: 19 * 1500 }, "4": { startedAt: 0, endedAt: 19 * 6000 } },
    expect: function (r) {
      eq("النقط", r.ranking.points, { H: 9, V: 6, A: -15 }); eq("الثقة", r.ranking.confidence, "متوسطة");
      eq("المكبوت", [r.suppressed.axis, r.suppressed.status], ["A", "مؤكد"]);
      eq("كل الأبعاد فطرة", r.dimensions.every(function (d) { return d.status === "fitra"; }), true);
      eq("إجابة سريعة في المحطة ٣ بس", r.quality.speed.stations.map(function (s) { return s.station; }), [3]);
      eq("مفيش تنبيهات", [r.alerts.depletion.on, r.alerts.mood.on, r.alerts.freeze.on, r.alerts.period.on], [false, false, false, false]);
      eq("الإجابات كاملة", r.complete, true);
    } }
];

/* ───────── التشغيل ───────── */
var integ = E.verifyIntegrity(items);
console.log("verifyIntegrity: " + (integ.ok ? "سليم" : "فيه مشاكل:\n  " + integ.errors.join("\n  ")));
if (!integ.ok) fails++;

// ملف أسئلة بايظ لازم يترفض
var broken = JSON.parse(JSON.stringify(items));
broken.freq = broken.freq.filter(function (i) { return i.id !== "s3n1"; });
broken.freq.filter(function (i) { return i.id === "s4n1"; })[0].face = undefined;
var bi = E.verifyIntegrity(broken);
eq("verifyIntegrity بيمسك ملف ناقص", bi.ok, false);
console.log(log.splice(0).join("\n") + "\n   (" + bi.errors.slice(0, 3).join(" · ") + ")");

profiles.forEach(function (p) {
  var r = E.score(build(p), items, C);
  console.log("\n" + p.name);
  p.expect(r);
  console.log(log.splice(0).join("\n"));
});

// تعديل الكوتش: الأصلي بيفضل، والنهائي بياخد التعديل
var r0 = E.score(build(profiles[0]), items, C, { override: { order: ["V", "H", "A"], reason: "في الجلسة بان إن الحيوية أقوى", by: "محمود" } });
console.log("\nتعديل الكوتش");
eq("الحساب الأصلي زي ما هو", r0.ranking.main, "H"); eq("النهائي من الكوتش", [r0.final.main, r0.final.source, r0.final.reason], ["V", "الكوتش", "في الجلسة بان إن الحيوية أقوى"]);
console.log(log.splice(0).join("\n"));

/* ───────── الحالة الحقيقية: إجابات محمود ───────── */
var M = JSON.parse(fs.readFileSync(path.join(__dirname, "mahmoud.json"), "utf8"));
function fromMahmoud(m) {
  var a = { questionsVersion: items.version, period: m.period, triad: {}, freq: {}, bipolar: {}, adaptiveShown: { row: m.adaptiveShown } };
  items.station1.forEach(function (it, i) { a.triad[it.id] = { closest: "o" + (m.s1[i][0] + 1), farthest: "o" + (m.s1[i][1] + 1), none: false }; });
  items.station2.forEach(function (it, i) { a.triad[it.id] = { closest: "o" + (m.s2[i][0] + 1), farthest: "o" + (m.s2[i][1] + 1), none: false }; });
  [3, 4, 5, 7].forEach(function (k) { m["s" + k].forEach(function (v, i) { a.freq["s" + k + "n" + (i + 1)] = v; }); });
  m.s6.forEach(function (v, i) { a.freq["s6n" + (i + 1)] = v; });
  m.s6t.forEach(function (v, i) { a.bipolar["s6t" + (i + 1)] = v; });
  return a;
}
var R = E.score(fromMahmoud(M), items, C), X = M.expected;
console.log("\nالحالة الحقيقية: إجابات محمود");
eq("الرئيسي", R.ranking.main, X.main); eq("الثقة", R.ranking.confidence, X.confidence);
eq("بُعد مفيهوش نمط إجابة: الدايرة بتفضل دايرة في التقرير", R.dimensions.filter(function (x) { return x.id === "H3"; })[0].reportStatus, "cycle");
eq("المكانة والدور: ميل بفرق الإفراط والتفريط", R.dimensions.filter(function (x) { return x.id === "A2"; })[0].leanBy, "فرق الإفراط والتفريط");
eq("المكبوت", R.suppressed.axis, X.suppressed); eq("حالة المكبوت", R.suppressed.status, X.suppressedStatus);
Object.keys(X.dims).forEach(function (d) { eq("البُعد " + d, R.dimensions.filter(function (x) { return x.id === d; })[0].status, X.dims[d]); });
eq("تنبيه الانطفاء", R.alerts.depletion.on, X.alerts.depletion); eq("تقلب المزاج", R.alerts.mood.on, X.alerts.mood); eq("تنبيه الفترة", R.alerts.period.on, X.alerts.period);
eq("علامات التجمّد", R.alerts.freeze.axes, X.freezeAxes); eq("إشارة الاستبدال", R.station7.substitution.signal, X.substitutionSignal);
console.log(log.splice(0).join("\n"));
fs.writeFileSync(path.join(__dirname, "mahmoud.result.json"), JSON.stringify(R, null, 1));

console.log("\n" + passes + " نجح · " + fails + " فشل");
process.exit(fails ? 1 : 0);
