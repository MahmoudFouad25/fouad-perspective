/* تقارير نموذجية لـ«ميزان المتطوع»:  node mizan-scale/report/samples.js
   ٥ متطوعين مصنوعين، كل واحد بيغطي حالة طلبتها المراجعة:
     أ. بنت (صيغة المؤنث): الانتماء أقوى والتطوع بيكبّره، وموجة انتماء في التطوع، وعلامة تجمّد (الرسالة اللطيفة من غير تواصل)
     ب. التطوع بيصحّي الهادي
     ج. متطوع جديد أقل من شهر: «صورتك المتوقعة» في «إنت والتطوع»، و«لسه بدري» في الدايرة
     د. تعادل: بيصحّي الهادي + بيكبّر الأقوى، ومن شهر لـ٣ (الدايرة متوقعة)، وعبارة المواسم عالية من غير تنبيه مزاج
     هـ. ثقة التطوع ضعيفة ← «تطوعك شبه حياتك» من غير سطر الترتيبين
   بيكتب samples.json (التقرير + ورقة الكوتش + المعلومات الداخلية لكل واحد). ما تتعدّلش بإيد. */
"use strict";
var fs = require("fs"), path = require("path");
var E = require("../engine/engine.js"), C = require("../engine/config.js"), items = require("../engine/items.json");
var T = require("./texts.json"), Rp = require("./render.js"), Co = require("./coach.js"), CT = require("./coach_texts.json");
var NONE = items.client.start.period.options.filter(function (o) { return o.none; })[0].id;

function pick(it, c, f) {
  function o(ax) { return it.options.filter(function (x) { return x.axis === ax; })[0].id; }
  return { closest: o(c), farthest: o(f), none: false };
}
// p: { s1(k), s2(i), s7(k), dims{dimId: kind}, cyc{H,V,A}, vcyc(it), pressure(it), bip, period, client, vnow }
function build(p) {
  var a = { questionsVersion: items.version, period: p.period || { selected: [NONE], impact: null }, triad: {}, freq: {}, bipolar: {}, timing: {},
            client: p.client, vnow: p.vnow };
  var k = 0;
  items.station1.forEach(function (it) {
    if (it.light) { a.triad[it.id] = { closest: null, farthest: null, none: true }; return; }
    var pr = p.s1(k++); a.triad[it.id] = pick(it, pr[0], pr[1]);
  });
  items.station2.forEach(function (it, i) { var pr = p.s2(i); a.triad[it.id] = pick(it, pr[0], pr[1]); });
  k = 0;
  items.station7.forEach(function (it) {
    if (it.light) { a.triad[it.id] = p.s7light ? pick(it, p.s7light[0], p.s7light[1]) : { closest: null, farthest: null, none: true }; return; }
    var pr = p.s7(k++); a.triad[it.id] = pick(it, pr[0], pr[1]);
  });
  var V = { excess: { excess: 3, deficit: 1, leave: 1, take: 3 }, deficit: { excess: 1, deficit: 3, leave: 3, take: 1 },
            fitra: { excess: 1, deficit: 1, leave: 3, take: 3 }, cycle: { excess: 3, deficit: 3, leave: 2, take: 2 },
            flat: { excess: 2, deficit: 2, leave: 2, take: 2 }, lean_def: { excess: 1, deficit: 2, leave: 2, take: 2 } };
  items.freq.forEach(function (it) {
    if (it.dim) a.freq[it.id] = V[(p.dims && p.dims[it.dim]) || "flat"][it.kind];
    else if (it.kind === "cycle") a.freq[it.id] = (p.cyc && p.cyc[it.axis]) || 1;
    else if (it.kind === "validity") a.freq[it.id] = 1;
    else a.freq[it.id] = p.pressure ? p.pressure(it) : 1;
  });
  items.vcycle.forEach(function (it) { a.freq[it.id] = p.vcyc ? p.vcyc(it) : 1; });
  a.bipolar = p.bip || { s6t1: 2, s6t2: 3, s6t3: 4 };
  a.adaptiveShown = { row: E.adaptiveRow(a, items, C).row };
  return a;
}
function all(c, f) { return function () { return [c, f]; }; }
function seq(spec) { var L = []; spec.forEach(function (x) { for (var i = 0; i < x[2]; i++) L.push([x[0], x[1]]); }); return function (k) { return L[k]; }; }

var people = [
  { key: "أ", title: "متطوعة (صيغة المؤنث): الانتماء أقوى والتطوع بيكبّره، وموجة انتماء في التطوع، وعلامة تجمّد", name: "منة", address: "f",
    p: { s1: function (k) { return k < 9 ? ["A", "H"] : ["V", "H"]; }, s2: all("H", "A"),
         s7: all("A", "H"),
         dims: { A3: "cycle", A1: "excess", H1: "deficit", V1: "fitra" }, cyc: { A: 3 },
         vcyc: function (it) { return it.axis === "A" ? 3 : 1; },
         pressure: function (it) { return it.kind === "freeze" && it.axis === "A" ? 3 : it.kind === "fear" && it.axis === "A" ? 3 : 1; },
         client: { form: "f2", age: "a2", role: "r1", tenure: "t3" }, vnow: "w3" } },
  { key: "ب", title: "متطوع: التطوع بيصحّي الهادي (الحفظ أقوى في الحياة، والانتماء هادي، وفي التطوع الانتماء بيعلى)", name: "يوسف", address: "m",
    p: { s1: all("H", "A"), s2: all("A", "H"), s7: function (k) { return k < 11 ? ["A", "V"] : ["H", "V"]; },
         dims: { H2: "excess", H3: "excess", A2: "deficit", V2: "fitra" },
         client: { form: "f1", age: "a3", role: "r2", tenure: "t4" }, vnow: "w2" } },
  { key: "ج", title: "متطوع جديد (أقل من شهر): صورة متوقعة في «إنت والتطوع»، و«لسه بدري» في «دايرتك»", name: "عمر", address: "m",
    p: { s1: function (k) { return k < 11 ? ["V", "A"] : ["H", "A"]; }, s2: all("A", "V"),
         s7: function (k) { return k < 11 ? ["H", "A"] : ["V", "A"]; },
         dims: { V1: "excess", V2: "fitra", A1: "lean_def" },
         vcyc: function (it) { return it.n % 3 === 0 ? 1 : "early"; },
         client: { form: "f1", age: "a1", role: "r3", tenure: "t1" }, vnow: "w1" } },
  { key: "د", title: "متطوعة: تعادل (بيصحّي الهادي + بيكبّر الأقوى)، من شهر لـ٣ (الدايرة متوقعة)، وعبارة المواسم عالية من غير تنبيه مزاج", name: "سلمى", address: "f",
    p: { s1: seq([["V", "A", 7], ["H", "V", 6], ["A", "H", 1], ["V", "H", 1]]), s2: all("A", "H"),        // الحياة: H 4، V 2، A −6
         s7: seq([["H", "V", 12], ["V", "A", 1], ["A", "H", 1], ["V", "H", 1]]),                              // التطوع: H 10، A 0، V −10
         dims: { H1: "fitra", H3: "deficit", V3: "excess" },
         vcyc: function (it) { return it.axis === "V" ? 3 : 1; },
         client: { form: "f2", age: "a2", role: "r1", tenure: "t2" }, vnow: "w6" } },
  { key: "هـ", title: "متطوع: ثقة ترتيب التطوع ضعيفة ← «تطوعك شبه حياتك» من غير سطر الترتيبين، ومفيش موجة واضحة", name: "كريم", address: "m",
    p: { s1: all("A", "V"), s2: function (i) { return i < 4 ? ["V", "A"] : ["H", "A"]; },
         s7: function (k) { return [["H", "V"], ["V", "A"], ["A", "H"]][k % 3]; },
         dims: { A1: "excess", A3: "excess", V1: "deficit" },
         client: { form: "f1", age: "a2", role: "r4", tenure: "t3" }, vnow: "w4" } }
];

var out = { generated: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", engine: E.ENGINE_VERSION, config: C.configVersion,
            questions: items.version + " (" + items.hash + ")", texts: T.version + " (" + T.hash + ")", samples: [] };
var problems = 0;
people.forEach(function (x) {
  var A = build(x.p), R = E.score(A, items, C);
  var rep = Rp.renderReport(R, A, items, T, { name: x.name, address: x.address });
  var coach = Co.renderCoach(R, A, items, CT, { name: x.name, address: x.address });
  problems += rep.meta.problems.length;
  out.samples.push({ key: x.key, title: x.title, name: x.name, address: x.address,
    summary: { ranking: R.ranking.order, confidence: R.ranking.confidence, suppressed: [R.suppressed.status, R.suppressed.axis],
               volunteer: { outcomes: R.volunteer.outcomes, axisOf: R.volunteer.axisOf, diff: R.volunteer.diff, reason: R.volunteer.reason,
                            vconf: R.volunteer.volunteerRanking.confidence, season: R.volunteer.season, moodAlert: R.alerts.mood.on, expected: R.volunteer.expectedPicture, cycleExpected: R.volunteer.cycleExpected },
               alerts: ["depletion", "mood", "freeze", "period"].filter(function (k) { return R.alerts[k].on; }), complete: R.complete, missing: R.missing },
    report: rep, coach: coach });
  console.log(x.key + ". " + x.name + " · " + rep.meta.words + " كلمة · " + R.volunteer.outcomes.join("+") + " · مشاكل: " + (rep.meta.problems.join(" | ") || "مفيش"));
});
fs.writeFileSync(path.join(__dirname, "samples.json"), JSON.stringify(out, null, 1));
process.exit(problems ? 1 : 0);
