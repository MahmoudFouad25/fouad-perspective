/* اختبارات محرك «ميزان المتطوع»:  node mizan-scale/engine/tests/run.js
   ١. اختبارات v2 نفسها بنفس المتوقع بالحرف (v2_cases.js).
   ٢. مقارنة مباشرة بمحرك v2: نفس الإجابات ← نفس نتيجة الحياة. محرك v2 بيتقري بس من three-axes/، وما بيتكتبش فيه حاجة.
   ٣. طبقة التطوع: النتايج الأربعة، والتعادل، والحد، والـbaseline، والمحطة ٢ برّه الحساب، والدايرة، والمدة.
   ⚑ لو حاجة فشلت: ما تغيّرش المتوقع علشان الاختبار ينجح. افهم إيه اللي اختلف وليه. */
"use strict";
var path = require("path"), fs = require("fs");
var T = require("./v2_cases.js");                         // بيشغّل الجزء الأول وهو بيتحمّل
var E = require("../engine.js"), C = require("../config.js"), items = require("../items.json");
var V2 = path.join(__dirname, "..", "..", "..", "three-axes", "v2", "engine");
var E2 = require(path.join(V2, "engine.js")), C2 = require(path.join(V2, "config.js")), I2 = require(path.join(V2, "items.json"));
var eq = T.eq, log = T.log, rot = T.rot, dimMap = T.dimMap, AX = ["H", "V", "A"];
function flush(title) { if (title) console.log("\n" + title); console.log(log.splice(0).join("\n")); }
// بيقارن جزء جزء، علشان لو فيه فرق يبان في أنهي حقل بالظبط
function eqLife(name, got, want) {
  Object.keys(want).forEach(function (k) { eq(name + " · " + k, got[k], want[k]); });
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }

/* ───────── ٢. نفس نتيجة الحياة زي محرك v2 ───────── */
function lifePart(r) {
  return {
    ranking: [r.ranking.points, r.ranking.order, r.ranking.confidence, r.ranking.consistency],
    suppressed: [r.suppressed.silence, r.suppressed.status, r.suppressed.axis, r.suppressed.supporting, r.suppressed.alternatives],
    final: [r.final.main, r.final.supporting, r.final.suppressed, r.final.suppressedStatus],
    dims: r.dimensions.map(function (d) { return [d.id, d.E, d.D, d.T, d.K, d.status, d.reportStatus, d.clientWord, d.silentPath, d.face]; }),
    cycles: r.cycles, tension: r.tension,
    // أرقام عبارات الضغط بتختلف (s7n عند v2 وs9n هنا)، فبنوحّدها قبل المقارنة
    pressure: JSON.parse(JSON.stringify([r.station7.fear, r.station7.freeze, r.station7.substitution.mean, r.station7.substitution.signal]).replace(/s9n/g, "s7n")),
    alerts: [r.alerts.depletion.on, r.alerts.depletion.hits.map(function (x) { return x.replace(/^s9n/, "s7n"); }), r.alerts.mood.on, r.alerts.freeze.on, r.alerts.freeze.axes, r.alerts.period.on, r.alerts.period.level],
    quality: [r.quality.validity.flag, r.quality.acquiescence.flag, r.quality.contradictions.count]
  };
}
// v2 بيرقّم محطة الضغط ٧، والمتطوعين ٩: نحوّل إجابات v2 لأرقام المتطوعين قبل ما نقارن
function v2ToVol(a2, p) {
  var a = clone(a2), f = {};
  Object.keys(a.freq).forEach(function (id) { f[id.replace(/^s7n/, "s9n")] = a.freq[id]; });
  a.freq = f;
  a.period = T.periodToVol(a.period);
  items.station7.forEach(function (it, i) { var pr = rot(i); a.triad[it.id] = { closest: it.options.filter(function (o) { return o.axis === pr[0]; })[0].id, farthest: it.options.filter(function (o) { return o.axis === pr[1]; })[0].id }; });
  items.vcycle.forEach(function (it) { a.freq[it.id] = 1; });
  a.vnow = "w6"; a.client = { tenure: "t4" };
  return a;
}
T.profiles.forEach(function (p) {
  var a2 = T.build(p, I2, E2), r2 = E2.score(a2, I2, C2), r = E.score(v2ToVol(a2, p), items, C);
  eqLife(p.name.split(" ")[0] + " نتيجة الحياة = محرك v2", lifePart(r), lifePart(r2));
});
(function () {
  var M = JSON.parse(fs.readFileSync(path.join(__dirname, "mahmoud.json"), "utf8"));
  var a2 = { questionsVersion: I2.version, period: M.period, triad: {}, freq: {}, bipolar: {}, adaptiveShown: { row: M.adaptiveShown } };
  I2.station1.forEach(function (it, i) { a2.triad[it.id] = { closest: "o" + (M.s1[i][0] + 1), farthest: "o" + (M.s1[i][1] + 1) }; });
  I2.station2.forEach(function (it, i) { a2.triad[it.id] = { closest: "o" + (M.s2[i][0] + 1), farthest: "o" + (M.s2[i][1] + 1) }; });
  [3, 4, 5, 7].forEach(function (k) { M["s" + k].forEach(function (v, i) { a2.freq["s" + k + "n" + (i + 1)] = v; }); });
  M.s6.forEach(function (v, i) { a2.freq["s6n" + (i + 1)] = v; });
  M.s6t.forEach(function (v, i) { a2.bipolar["s6t" + (i + 1)] = v; });
  eqLife("إجابات محمود: نتيجة الحياة = محرك v2", lifePart(E.score(v2ToVol(a2), items, C)), lifePart(E2.score(a2, I2, C2)));
})();
// ملف أسئلة v2 ما اتلمسش
eq("ملف أسئلة v2 لسه 2.1 بنفس الرقم", [I2.version, I2.hash], [I2.version, require(path.join(V2, "questions.lock.json")).hash]);
flush("٢. نفس نتيجة الحياة زي محرك v2 (من غير ما نلمسه)");

/* ───────── ٣. طبقة التطوع ───────── */
var P = T.profiles;                                   // ٠: H أقوى، A هادي مؤكد · ٢: A أقوى، الهادي غير محسوم · ٥: H 9، V 6، A −15
function vs(base, extra) { var p = Object.assign({}, base, extra); return p; }
function allOf(c, f) { return function (it, k) { return k < 0 ? null : [c, f]; }; }
function run(p, cfg) { return E.score(T.build(p), items, cfg || C); }
function v(r) { return r.volunteer; }

// أ. شبه حياتك: مواقف التطوع بتلف ← نقط صفر وثقة ضعيفة
var r = run(vs(P[0], {}));
eq("أ. شبه حياتك لما ثقة التطوع ضعيفة", [v(r).outcomes, v(r).volunteerRanking.confidence, v(r).reason], [["like_life"], "ضعيفة", "ثقة ترتيب التطوع ضعيفة"]);

// ب. بيصحّي الهادي: الحياة H أقوى وA هادي مؤكد، والتطوع A أقرب وV أبعد
r = run(vs(P[0], { s7: allOf("A", "V") }));
eq("ب. الفرق", v(r).diff, { H: -15, V: -15, A: 30 });
eq("ب. بيصحّي الهادي (الانتماء)", [v(r).outcomes, v(r).axisOf.wakes_quiet, v(r).tie], [["wakes_quiet"], "A", false]);

// ج. بيكبّر الأقوى: الحياة H 9 / V 6 / A −15، والتطوع H أقرب وA أبعد
r = run(vs(P[5], { s7: allOf("H", "A") }));
eq("ج. الفرق", v(r).diff, { H: 6, V: -6, A: 0 });
eq("ج. بيكبّر الأقوى (الحفظ)", [v(r).outcomes, v(r).axisOf.grows_main], [["grows_main"], "H"]);

// د. وش تاني: نفس الحياة، والتطوع V أقرب وA أبعد ← المساند V هو اللي علي
r = run(vs(P[5], { s7: allOf("V", "A") }));
eq("د. الفرق", v(r).diff, { H: -9, V: 9, A: 0 });
eq("د. وش تاني (الحيوية)", [v(r).outcomes, v(r).axisOf.other_face], [["other_face"], "V"]);

// هـ. تعادل: الحياة H 4 / V 2 / A −6 (الهادي A مؤكد)، والتطوع H 10 / A 0 / V −10 ← فرق H 6 وA 6
function seq(spec) { var L = []; spec.forEach(function (x) { for (var i = 0; i < x[2]; i++) L.push([x[0], x[1]]); }); return function (it, k) { return k < 0 ? null : L[k]; }; }
var lifeTie = seq([["V", "A", 7], ["H", "V", 6], ["A", "H", 1], ["V", "H", 1]]);
var volTie = seq([["H", "V", 12], ["V", "A", 1], ["A", "H", 1], ["V", "H", 1]]);
r = run({ s1: lifeTie, s2: function () { return ["A", "H"]; }, s7: volTie, freq: dimMap({ H: "fitra", V: "fitra", A: "fitra" }) });
eq("هـ. نقط الحياة والتطوع", [r.ranking.points, v(r).volunteerRanking.points], [{ H: 4, V: 2, A: -6 }, { H: 10, V: -10, A: 0 }]);
eq("هـ. الهادي مؤكد", [r.suppressed.axis, r.suppressed.status], ["A", "مؤكد"]);
eq("هـ. الفرق", v(r).diff, { H: 6, V: -12, A: 6 });
eq("هـ. تعادل بالترتيب: الهادي الأول وبعده الأقوى", [v(r).outcomes, v(r).tie, v(r).axisOf], [["wakes_quiet", "grows_main"], true, { wakes_quiet: "A", grows_main: "H" }]);

// هـ٢. شرط الترتيب: الهادي علي ٤ بس فضل آخر واحد في التطوع ← ما يتقالش «بيصحّي الهادي»
function lastS7(it, k) { if (k < 0) return null; return k < 12 ? ["H", "A"] : k === 12 ? ["A", "H"] : ["H", "V"]; }   // H 13، V −2، A −11
r = run(vs(P[5], { s7: lastS7 }));
eq("هـ٢. الفرق: الحفظ ٤ والانتماء ٤", [v(r).diff.H, v(r).diff.A], [4, 4]);
eq("هـ٢. الانتماء لسه آخر في التطوع ← بيتشال، ويفضل «بيكبّر الأقوى»", [v(r).outcomes, v(r).dropped.length], [["grows_main"], 1]);
// والمساند اللي علي وبقى الأول ← وش تاني (الحياة H 15 / V 0 / A −15، والتطوع V 13 / A −6 / H −7)
r = run(vs(P[0], { s7: seq([["V", "A", 8], ["A", "H", 2], ["V", "H", 5]]) }));
eq("هـ٢. المساند بقى الأول في التطوع ← وش تاني", [v(r).volunteerRanking.order[0], v(r).outcomes], ["V", ["other_face"]]);

// هـ٣. الشرط ما اتحققش ← «شبه حياتك»، ومن غير ما نروح للمحور اللي بعده في الفرق (قرار المراجعة).
// الحياة H 15 / V 0 / A −15 (A هادي مؤكد). التطوع H −1 / V 6 / A −5 ← فرق A +10 (الأعلى)، V +6، H −16.
// A لسه آخر في التطوع ← بيتشال. والحيوية (فرق ٦ ≥ ٤ وبقت الأولى) كانت هتعدّي لو رحنا للي بعده، بس إحنا ما بنروحش.
r = run(vs(P[0], { s7: seq([["V", "A", 5], ["V", "H", 1], ["H", "V", 3], ["V", "A", 3], ["A", "H", 3]]) }));
eq("هـ٣. نقط التطوع", v(r).volunteerRanking.points, { H: -1, V: 6, A: -5 });
eq("هـ٣. الأعلى فرق الانتماء، والحيوية بعده فوق الحد", [v(r).topAxes, v(r).diff], [["A"], { H: -16, V: 6, A: 10 }]);
eq("هـ٣. الحيوية الأولى في التطوع والانتماء الآخر", [v(r).volunteerRanking.order[0], v(r).volunteerRanking.order[2]], ["V", "A"]);
eq("هـ٣. الشرط ما اتحققش ← شبه حياتك (مش وش تاني)", [v(r).outcomes, v(r).dropped.length, /ما غيّرش مكانه/.test(v(r).reason)], [["like_life"], 1, true]);

// هـ٤. الحالة اللي اتكشفت في المراجعة (اختبار ثابت بإجاباتها كاملة من tests/regression_guard.json):
// تعادل الحفظ والانتماء في الفرق (٤ و٤)، والانتماء الهادي لسه آخر في التطوع. من غير الشرط كان التقرير بيقول
// «التطوع بيصحّي الانتماء» + «بيكبّر الأقوى». الشرط على كل محور لوحده ← «بيكبّر الأقوى» بس.
var RG = require("./regression_guard.json");
r = E.score(RG.answers, items, C);
eq("هـ٤. الحالة الثابتة: نفس الأرقام", [v(r).lifeRanking.points, v(r).volunteerRanking.points, v(r).diff], RG.expect.points);
eq("هـ٤. الحالة الثابتة: «بيكبّر الأقوى» بس، والهادي اتشال", [v(r).outcomes, v(r).dropped], RG.expect.outcome);

// و. الهادي غير محسوم: اللي علي هو الاحتمالين ← شبه حياتك
r = run(vs(P[2], { s7: allOf("H", "A") }));
eq("و. الهادي غير محسوم", r.suppressed.status, "غير محسوم");
eq("و. اللي علي من الاحتمالين ← شبه حياتك", [v(r).outcomes, v(r).reason], [["like_life"], "اللي علي هو الهادي وهو غير محسوم"]);

// ز. تحت الحد: أعلى فرق ٣ ← شبه حياتك (حياة P[5] H9، تطوع H12 / V0 / A−12)
function underS7(it, k) { if (k < 0) return null; return k < 12 ? ["H", "A"] : ["V", "H"]; }   // H 12−3=9، V 3، A −12
r = run(vs(P[5], { s7: underS7 }));
eq("ز. نقط التطوع", v(r).volunteerRanking.points, { H: 9, V: 3, A: -12 });
eq("ز. أعلى فرق تحت ٤ ← شبه حياتك", [v(r).maxDiff, v(r).outcomes], [3, ["like_life"]]);

// ح. الـbaseline بيتطرح قبل المقارنة: لو المتوسط عند الكل الانتماء +٣١، حالة «ب» ترجع شبه حياتك
var C3 = clone(C); C3.volunteer.baseline = { H: 0, V: 0, A: 31 };
r = run(vs(P[0], { s7: allOf("A", "V") }), C3);
eq("ح. baseline الانتماء ٣١ ← الفرق −١ ← شبه حياتك", [v(r).diff.A, v(r).outcomes], [-1, ["like_life"]]);

// ط. المحطة ٢ برّه الحساب: نفس الشخص ٣ مرات (بالمحطة ٢ · من غيرها · معكوسة)
var base = T.build(vs(P[0], { s7: allOf("A", "V") }));
var noS2 = clone(base); items.station2.forEach(function (it) { delete noS2.triad[it.id]; });
var revS2 = clone(base); items.station2.forEach(function (it) { var t = revS2.triad[it.id]; revS2.triad[it.id] = { closest: t.farthest, farthest: t.closest }; });
function rks(a) { var x = E.score(a, items, C).volunteer; return [x.lifeRanking, x.volunteerRanking.points, x.volunteerRanking.order, x.volunteerRanking.confidence, x.diff]; }
eq("ط. الترتيبين من غير المحطة ٢ = بيها", rks(noS2), rks(base));
eq("ط. الترتيبين بالمحطة ٢ معكوسة = بيها", rks(revS2), rks(base));
eq("ط. ترتيب الحياة في التطوع = ترتيب المحرك نفسه", [v(E.score(base, items, C)).lifeRanking.points], [E.score(base, items, C).ranking.points]);

// ي. دايرة التطوع و«لسه بدري» و«إنت فين» والمدة
var cy = T.build(vs(P[0], { s7: allOf("A", "V"), vnow: "w4", client: { tenure: "t1", form: "f2" },
  vcyc: function (it) { return it.axis === "A" ? 3 : it.axis === "V" ? (it.n === 2 ? "early" : it.n === 5 ? "early" : 4) : 1; } }));
r = E.score(cy, items, C);
eq("ي. دايرة الانتماء عالية", [v(r).vcycles.A.high, v(r).vcycles.A.mean], [true, 3]);
eq("ي. الحيوية فيها ٢ «لسه بدري» ← مش واضحة ومفيش حكم", [v(r).vcycles.V.answered, v(r).vcycles.V.clear, v(r).vcycles.V.high], [1, false, false]);
eq("ي. «إنت فين» w4 بيتعلّم للكوتش", [v(r).now.id, v(r).now.coachFlag], ["w4", true]);
eq("ي. أقل من شهر ← صورة متوقعة في الاتنين", [v(r).expectedPicture, v(r).cycleExpected], [true, true]);
var cy2 = clone(cy); cy2.client.tenure = "t2"; r = E.score(cy2, items, C);
eq("ي. من شهر لـ٣ ← الدايرة بس متوقعة", [v(r).expectedPicture, v(r).cycleExpected], [false, true]);
eq("ي. «لسه بدري» مش ناقصة", r.missing.filter(function (id) { return /^s8/.test(id); }), []);

// ك. عبارة المواسم ما بتشغّلش تنبيه المزاج
var mood = T.build(vs(P[0], { vcyc: function (it) { return it.n === 5 ? 4 : 1; } }));
mood.freq.s6n8 = 0;
r = E.score(mood, items, C);
eq("ك. عبارة المواسم ٤ والمزاج من المحطة ٦ صفر ← مفيش تنبيه", [v(r).season.value, r.alerts.mood.on], [4, false]);
mood.freq.s6n8 = 4; r = E.score(mood, items, C);
eq("ك. والمزاج بيشتغل من عبارة المحطة ٦ بس", r.alerts.mood.on, true);

// ل. الانطفاء من عبارات محطة الضغط (٩) زي v2
var dep = T.build(vs(P[0], {})); dep.freq.s9n8 = 4; dep.freq.s9n16 = 4;
eq("ل. الانطفاء من s9n8 وs9n16", E.score(dep, items, C).alerts.depletion.hits, ["s9n8", "s9n16"]);

// م. المواقف الخفيفة في التطوع برّه الترتيب
var lt = T.build(vs(P[0], { s7: allOf("A", "V") })); r = E.score(lt, items, C);
eq("م. الخفيفة ٣ وبرّه النقط", [v(r).volunteerRanking.lightSituations.length, v(r).volunteerRanking.consistency.of], [3, 15]);

// ن. مواقف تطوع ناقصة ← شبه حياتك والنقص ظاهر
var miss = clone(base); delete miss.triad.s7n1; r = E.score(miss, items, C);
eq("ن. موقف تطوع ناقص ← شبه حياتك", [v(r).outcomes, r.complete, r.missing.indexOf("s7n1") !== -1], [["like_life"], false, true]);
flush("٣. طبقة التطوع");

var c = T.counts();
console.log("\n" + c.passes + " نجح · " + c.fails + " فشل");
process.exit(c.fails ? 1 : 0);
