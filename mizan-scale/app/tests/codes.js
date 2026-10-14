/* مولّد الأكواد الحقيقية:  node mizan-scale/app/tests/codes.js
   ١) مليون كود عشوائي: كلهم ٨ حروف صح، ومفيش ولا واحد بيبدأ بـ TEST، ومفيش حرف ممنوع.
   ٢) أسوأ حالة مقصودة: «العشوائي» بيختار T ثم E ثم S ثم T كل مرة يقدر ← برضه مش TEST.
   ٣) كل الحروف المسموحة بتطلع (مفيش حرف اتشال بالغلط غير E في الخانة التانية). */
"use strict";
var X; global.self = global; require("../shared.js"); X = global.MZS;
var A = X.CFG.codeAlphabet, fails = 0, seen = {};
function ok(n, c, extra) { console.log((c ? "  ✓ " : "  ✗ ") + n + (c || !extra ? "" : "  ← " + extra)); if (!c) fails++; }
var bad = 0, trial = 0, N = 1000000;
for (var i = 0; i < N; i++) {
  var c = X.makeCode();
  if (!X.validCode(c)) bad++;
  if (X.isTrial(c)) trial++;
  for (var j = 0; j < c.length; j++) seen[j + ":" + c[j]] = 1;
}
ok("مليون كود: كلهم صالحين", bad === 0, bad);
ok("مليون كود: ولا واحد بيبدأ بـ TEST", trial === 0, trial);
var want = "TEST";
var k = 0, worst = X.makeCode(function (n) { var alpha = n === A.length ? A : A.replace("E", ""); var ch = want[k++] || "A"; var ix = alpha.indexOf(ch); return ix === -1 ? 0 : ix; });
ok("أسوأ حالة (العشوائي بيحاول يكتب TEST): " + worst, !X.isTrial(worst) && X.validCode(worst));
var missing = [];
for (var p = 0; p < 8; p++) for (var q = 0; q < A.length; q++) if (!seen[p + ":" + A[q]] && !(p === 1 && A[q] === "E")) missing.push(p + ":" + A[q]);
ok("كل الحروف المسموحة طلعت في كل خانة", missing.length === 0, missing.join(","));
console.log(fails ? fails + " فشل" : "كله نجح");
process.exit(fails ? 1 : 0);
