/* اختبار المتصفح لصفحة «ميزان المتطوع» (Playwright + Chromium، وWebKit لو موجود).
   التشغيل (من جذر الريبو):
     node mizan-scale/app/tests/server.js 8790 &
     NODE_PATH=$(npm root -g) node mizan-scale/app/tests/e2e.js
   مكتبة فايربيز الحقيقية بتتبدل بـ tests/firebase-mock.js، والسيرفر بيطبّق منطق القواعد.
   الصور بتتحفظ في mizan-scale/app/tests/shots/ (مش بتترفع). */
"use strict";
var path = require("path"), fs = require("fs");
var pw = require("playwright");
var BASE = "http://localhost:" + (process.env.PORT || 8790);
var APP = BASE + "/mizan-scale/app/";
var ROOT = path.resolve(__dirname, "../../..");
var MOCK = path.join(__dirname, "firebase-mock.js");
var SHOTS = path.join(__dirname, "shots"); try { fs.mkdirSync(SHOTS); } catch (e) {}
var E = require("../../engine/engine.js"), C = require("../../engine/config.js"), ITEMS = require("../../engine/items.json"), TEXTS = require("../../report/texts.json");

var passes = 0, fails = 0;
function ok(name, cond, extra) { if (cond) { passes++; console.log("  ✓ " + name); } else { fails++; console.log("  ✗ " + name + (extra ? "  ← " + extra : "")); } }
function api(body) { return fetch(BASE + "/__api", { method: "POST", body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
function seed(code, data) { return api({ op: "seed", col: "mizan_scale", id: code, data: data }); }
function dump() { return api({ op: "dump" }); }
function mode(m) { return api({ op: "mode", mode: m }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ───── المتصفح ───── */
var browser = null;
async function open(o) {
  o = o || {};
  var ctx = await browser.newContext({ viewport: { width: o.w || 375, height: 760 }, deviceScaleFactor: 2, isMobile: o.mobile !== false && o.engine !== "webkit", hasTouch: true, locale: "ar-EG" });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, function (r) { return r.abort(); });
  await ctx.route(/gstatic\.com\/firebasejs/, function (r) {
    if (o.sdk === "fail") return r.abort();
    if (o.sdk === "hang") return;                                   // ما بيردّش أبدًا
    if (r.request().url().indexOf("app-compat") !== -1) return r.fulfill({ path: MOCK, contentType: "text/javascript" });
    return r.fulfill({ body: "/* firestore-compat: جوه الموك */", contentType: "text/javascript" });
  });
  if (o.noStorage) await ctx.addInitScript(function () {
    Object.defineProperty(window, "localStorage", { get: function () { throw new Error("SecurityError: storage disabled"); } });
  });
  var p = await ctx.newPage();
  p.errs = [];
  p.on("pageerror", function (e) { p.errs.push(e.message); });
  p.on("console", function (m) { if (m.type() === "error" && !/ERR_FAILED|net::ERR/.test(m.text())) p.errs.push(m.text()); });
  p.ctx = ctx;
  return p;
}
function st(p) { return p.evaluate(function () { return window.MZS_APP && window.MZS_APP.state(); }); }
async function screen(p) { var s = await st(p); return s && s.screen; }
async function notes(p) { return p.evaluate(function () { var n = document.getElementById("note"); return n && !n.hidden ? n.innerText : ""; }); }
async function mainText(p) { return p.evaluate(function () { return document.getElementById("main").innerText; }); }
async function waitScreen(p, sc, ms) { await p.waitForFunction(function (sc) { var s = window.MZS_APP && window.MZS_APP.state(); return s && s.screen === sc; }, sc, { timeout: ms || 8000 }); }
async function click(p, sel) {
  try { await p.click(sel, { timeout: 10000 }); }
  catch (e) {   // لما حاجة تقف: نطبع الشاشة والكلام اللي عليها والرسايل اللي فوق، علشان السبب يبان
    try { await p.screenshot({ path: path.join(SHOTS, "STUCK.png") }); } catch (x) {}
    var hit = await p.evaluate(function (sel) { var el = document.querySelector(sel); if (!el) return "مش موجود في الصفحة"; var r = el.getBoundingClientRect(); var top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return "موجود " + JSON.stringify([Math.round(r.top), Math.round(r.height)]) + " والي فوقه: " + (top ? top.className + "/" + top.tagName : "لا شيء") + " · aria-disabled=" + el.getAttribute("aria-disabled"); }, sel).catch(function () { return "?"; });
    var info = await p.evaluate(function () { var s = window.MZS_APP && window.MZS_APP.state(); return { screen: s && s.screen, main: document.getElementById("main").innerText.slice(0, 160), note: document.getElementById("note").innerText }; }).catch(function () { return {}; });
    throw new Error("مش لاقي " + sel + " (" + hit + ") · الشاشة: " + info.screen + " · " + JSON.stringify(info.main) + " · فوق: " + JSON.stringify(info.note));
  }
  await sleep(30);
}

// بيجاوب على كل اللي في الشاشة الحالية بدوسات حقيقية على الزراير
async function answerAll(p, o) {
  await p.evaluate(function (o) {
    var ids = Array.prototype.map.call(document.querySelectorAll("article.item"), function (e) { return e.id; });
    var k = 0;
    ids.forEach(function (id) {
      function q() { return document.getElementById(id); }
      var el = q();
      if (el.querySelector(".opts")) {
        var c = (o.close === undefined ? k : o.close) % 3;
        el.querySelectorAll(".pk.c")[c].click();
        q().querySelectorAll(".pk.f")[(c + 1) % 3].click();
      } else if (el.classList.contains("now")) el.querySelectorAll(".check")[o.now === undefined ? 2 : o.now].click();
      else if (el.querySelector(".scale")) {
        var early = el.querySelector('[data-act="early"]');
        if (early && o.early && k % 3 === 0) early.click(); else el.querySelectorAll(".sc")[(o.freq === undefined ? k : o.freq) % 5].click();
      } else if (el.querySelector(".dots")) el.querySelectorAll(".dot")[k % 5].click();
      k++;
    });
  }, o || {});
}
// بيكمّل المحطة المفتوحة ويدوس «التالي» (محطات المواقف موقف موقف)
async function finishStation(p, o) {
  if (await p.$('[data-act="introGo"]')) await click(p, '[data-act="introGo"]');
  for (var k = 0; k < 20; k++) {
    await answerAll(p, o);
    if (await p.$('[data-act="sitNext"]')) await click(p, '[data-act="sitNext"]');
    else { await click(p, '[data-act="stNext"]'); return; }
  }
}
// بيمشي المقياس من مكانه لحد شاشة معيّنة (أو للتقرير)
async function walk(p, target, o) {
  o = o || {};
  await p.waitForFunction(function () { var s = window.MZS_APP && window.MZS_APP.state(); return s && s.screen; }, null, { timeout: 20000 });
  for (var guard = 0; guard < 60; guard++) {
    var sc = await screen(p);
    if (sc === target) return;
    if (sc === "address") await click(p, '[data-act="addr"][data-v="' + (o.address || "m") + '"]');
    else if (sc === "about") {
      await click(p, '[data-act="about"][data-k="age"][data-id="a2"]');
      await click(p, '[data-act="about"][data-k="role"][data-id="r1"]');
      await click(p, '[data-act="about"][data-k="tenure"][data-id="' + (o.tenure || "t3") + '"]');
      await click(p, '[data-act="aboutNext"]');
    } else if (sc === "period") { await click(p, '[data-act="period"][data-id="p9"]'); await click(p, '[data-act="periodNext"]'); }
    else if (/^s[127]$/.test(sc)) {   // محطات المواقف: شرح المحطة، وبعدين موقف واحد في الشاشة
      if (await p.$('[data-act="introGo"]')) await click(p, '[data-act="introGo"]');
      for (var k = 0; k < 20; k++) {
        await answerAll(p, o.answers && o.answers(+sc.slice(1)));
        if (await p.$('[data-act="sitNext"]')) await click(p, '[data-act="sitNext"]');
        else { await click(p, '[data-act="stNext"]'); break; }
      }
    }
    else if (/^s\d$/.test(sc)) { await answerAll(p, o.answers && o.answers(+sc.slice(1))); await click(p, '[data-act="stNext"]'); }
    else if (sc === "closing") await click(p, '[data-act="report"]');
    else await click(p, '[data-act="go"]');
    if (o.onScreen) await o.onScreen(sc);
  }
  throw new Error("walk ما وصلش لـ " + target);
}
async function noOverflow(p) { return p.evaluate(function () { return document.documentElement.scrollWidth <= window.innerWidth + 1; }); }

/* في صيغة المؤنث: ولا جملة ليها نسخة مؤنثة توصل للشاشة بالمذكر */
var FEM_KEYS = {};
Object.keys(ITEMS.fem).forEach(function (k) { if (ITEMS.fem[k] !== k) FEM_KEYS[k] = 1; });
Object.keys(TEXTS.fem).forEach(function (k) { if (TEXTS.fem[k] !== k) FEM_KEYS[k] = 1; });
async function mascLeaks(p) {
  var lines = await p.evaluate(function () {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll("#main h1,#main h2,#main h3,#main h4,#main p,#main li,#main button,#main .opt p"), function (e) {
      var t = (e.innerText || "").trim().replace(/^[٠-٩0-9]+\.\s*/, "").replace(/^✓\s*/, "");
      if (t) out.push(t);
    });
    return out;
  });
  return lines.filter(function (t) { return FEM_KEYS[t]; });
}

async function run() {
  browser = await pw.chromium.launch();
  await api({ op: "reset" });
  var p, d, s, t;

  console.log("\n١. الكود والرسايل");
  p = await open();
  await p.goto(APP);
  await p.waitForSelector("#codeForm");
  t = await mainText(p);
  ok("من غير كود ← شاشة «محتاجين الكود بتاعك»", /محتاجين الكود بتاعك/.test(t));
  await p.fill("#codeIn", "abc");
  await click(p, '#codeForm button[type="submit"]');
  ok("كود قصير ← «الكود ٨ حروف وأرقام» من غير ما الصفحة تتنقل", /٨ حروف وأرقام/.test(await p.innerText("#codeMsg")));
  await p.fill("#codeIn", "zz-zz 2345");
  await click(p, '#codeForm button[type="submit"]');
  await p.waitForSelector("#codeForm h2, .card h2");
  await sleep(400);
  ok("كود مكتوب بحروف صغيرة ومسافات ← بيتوحّد ويتفتح كـ ZZZZ2345", /c=ZZZZ2345/.test(p.url()));
  t = await mainText(p);
  ok("كود مش موجود ← «الكود ده مش موجود»", /الكود ده مش موجود/.test(t), t.slice(0, 80));
  ok("…ومفيش «استنى» في أي مكان", !/استن/.test(t + await notes(p)));
  await p.goto(APP + "?c=ABC0O1IL");
  await p.waitForSelector("#codeForm");
  ok("كود فيه 0 وO و1 وI وL ← «مش مكتوب صح»", /مش مكتوب صح/.test(await mainText(p)));
  await seed("RVKD2345", { name: "أحمد", revoked: true });
  await p.goto(APP + "?c=RVKD2345");
  await p.waitForFunction(function () { return /اتقفل/.test(document.getElementById("main").innerText); }, null, { timeout: 8000 });
  ok("رابط اتقفل ← «الرابط ده اتقفل، واتعمل لك رابط جديد»", /اتعمل لك رابط جديد/.test(await mainText(p)));
  ok("مفيش أخطاء JavaScript", !p.errs.length, p.errs.join(" | "));
  await p.ctx.close();

  console.log("\n٢. متطوعة من الأول للتقرير (صيغة المؤنث) + الرجوع + الحفظ على السيرفر");
  await seed("MENA2345", { name: "منة الله علي", gov: "سوهاج", status: "جديد", createdAt: Date.now() });
  p = await open({ w: 375 });
  await p.goto(APP + "?c=MENA2345");
  await waitScreen(p, "address");
  await click(p, '[data-act="addr"][data-v="f"]');
  await waitScreen(p, "welcome");
  t = await mainText(p);
  ok("الترحيب بالاسم الأول والمؤنث: «أهلًا بيكي يا منة»", /أهلًا بيكي يا منة/.test(t), t.slice(0, 60));
  d = (await dump()).db.mizan_scale.MENA2345;
  ok("الصيغة اتبعتت بعد «نكلمك إزاي؟»", d.address === "f" && d.client && d.client.form === "f2");
  ok("الاسم والمحافظة (حقول الأدمن) زي ما هم", d.name === "منة الله علي" && d.gov === "سوهاج");
  var leaks = [], trialBtns = 0;
  async function spy() { leaks = leaks.concat(await mascLeaks(p)); trialBtns += (await p.$$('[data-act="trialFill"],[data-act="trialReset"]')).length; }
  await walk(p, "s3", { address: "f", tenure: "t1", onScreen: spy });
  d = (await dump()).db.mizan_scale.MENA2345;
  ok("المحطتين ١ و٢ اتبعتوا للسيرفر", d.st && d.st["1"] && Object.keys(d.st["1"].answers).length === 18 && Object.keys(d.st["2"].answers).length === 6);
  ok("أسئلة البداية اتبعتت (السن والدور والمدة)", d.client.age === "a2" && d.client.role === "r1" && d.client.tenure === "t1");
  // نص محطة: نجاوب ٧ بس ونقفل
  await p.evaluate(function () { Array.prototype.slice.call(document.querySelectorAll("article.item"), 0, 7).forEach(function (el) { el.querySelectorAll(".sc")[3].click(); }); });
  var before = (await st(p)).st["3"].answers;
  await p.close();
  var ctx2 = p.ctx; p = await ctx2.newPage(); p.ctx = ctx2; p.errs = []; p.on("pageerror", function (e) { p.errs.push(e.message); });
  await p.goto(APP + "?c=MENA2345");
  await waitScreen(p, "s3");
  s = await st(p);
  ok("رجعت بنفس الرابط في نص المحطة ← نفس المحطة ونفس الـ٧ إجابات", Object.keys(s.st["3"].answers).length === 7 && JSON.stringify(Object.keys(s.st["3"].answers)) === JSON.stringify(Object.keys(before)));
  ok("…وعداد «فاضل» بيقول ١٢", /فاضل ١٢/.test(await p.innerText("#left")));
  await walk(p, "s8", { address: "f", onScreen: spy });
  await p.screenshot({ path: path.join(SHOTS, "s8-375-f.png"), fullPage: true });
  ok("المحطة ٨: ٩ عبارات + «إنت فين»", (await p.$$("article.item")).length === 10);
  ok("…«لسه بدري» بالمؤنث موجود جنب كل عبارة", (await p.$$('[data-act="early"]')).length === 9);
  ok("…«إنتي فين» بالمؤنث", /إنتي فين/.test(await mainText(p)));
  await walk(p, "report", { address: "f", answers: function (n) { return n === 8 ? { early: true, now: 3 } : null; }, onScreen: spy });
  await p.waitForSelector(".report");
  await sleep(600);
  leaks = leaks.concat(await mascLeaks(p));
  ok("صيغة المؤنث: ولا جملة ليها نسخة مؤنثة ظهرت بالمذكر (المقياس كله والتقرير)", !leaks.length, leaks.slice(0, 3).join(" | "));
  t = await mainText(p);
  trialBtns += (await p.$$('[data-act="trialFill"],[data-act="trialReset"]')).length;
  ok("كود حقيقي: زرار «املأ عشوائي» و«ابدأ من الأول» ما ظهروش ولا مرة (كل الشاشات من الأول للتقرير)", trialBtns === 0, trialBtns);
  ok("التقرير ظهر بعنوانه", /ميزاني/.test(t) && (await p.$$(".report h2")).length >= 8);
  ok("التقرير: ولا كلمة عن واتساب أو تواصل", !/واتساب|wa\.me|هنتواصل|هنكلمك|هيتابع|كلّمينا/.test(t));
  ok("المتطوعة أقل من شهر ← «صورتك المتوقعة» في التقرير", (await st(p)).result.volunteer.expectedPicture === true);
  await sleep(500);
  d = (await dump()).db.mizan_scale.MENA2345;
  ok("السيرفر: الحالة «خلص» والنتيجة متحفوظة", d.status === "خلص" && d.result && d.result.complete === true);
  var A = E.normalize(d), R2 = E.score(A, ITEMS, C);
  ok("النتيجة اللي الموبايل حسبها = المحرك على الإجابات المحفوظة في السيرفر", JSON.stringify(R2) === JSON.stringify(d.result));
  ok("«لسه بدري» اتحفظت وبرّه الحساب", JSON.stringify(d.st["8"].answers).indexOf('"early"') !== -1 && d.result.missing.length === 0);
  ok("الاسم والمحافظة لسه زي ما هم بعد كل الحفظ", d.name === "منة الله علي" && d.gov === "سوهاج");
  var VK = fs.readFileSync(path.join(__dirname, "..", "shared.js"), "utf8").match(/VOLUNTEER_KEYS = \[([\s\S]*?)\]/)[1].match(/"([^"]+)"/g).map(function (x) { return x.slice(1, -1); });
  var stray = Object.keys(d).filter(function (k) { return ["name", "gov", "createdAt"].indexOf(k) === -1 && VK.indexOf(k) === -1; });
  ok("الصفحة ما كتبتش ولا حقل برّه المسموح (pushedAtMs وغيره بيفضلوا على الموبايل)", !stray.length, stray.join(","));
  var RK = fs.readFileSync(path.join(__dirname, "..", "..", "firestore.rules"), "utf8").match(/mzsVolunteerKeys\(\) \{\s*return \[([\s\S]*?)\]/)[1].match(/'([^']+)'/g).map(function (x) { return x.slice(1, -1); });
  ok("قايمة الحقول في الصفحة = نفس القايمة في firestore.rules", JSON.stringify(VK) === JSON.stringify(RK));
  await click(p, '[data-act="rate"][data-v="4"]');
  await p.fill("#rateNote", "كويس");
  await click(p, '[data-act="rateSave"]');
  await sleep(500);
  d = (await dump()).db.mizan_scale.MENA2345;
  ok("التقييم اتبعت بعد ما خلّصت (القواعد بتسمح بيه)", d.rating && d.rating.value === 4 && d.rating.note === "كويس");
  await p.screenshot({ path: path.join(SHOTS, "report-375-f.png"), fullPage: true });
  await click(p, '[data-act="repAddr"]');
  ok("زرار الصيغة في التقرير ← المذكر", /مكتوب بصيغة المذكر/.test(await p.innerText(".addr-bar")));
  await click(p, '[data-act="repAddr"]');
  await p.goto(APP + "?c=MENA2345");
  await p.waitForSelector(".report");
  ok("فتحت الرابط تاني ← التقرير على طول", (await screen(p)) === "report");
  ok("مفيش أخطاء JavaScript", !p.errs.length, p.errs.join(" | "));
  await p.ctx.close();

  console.log("\n٣. القواعد (من الصفحة نفسها)");
  // محاولة كتابة حقل أدمن أو تعديل الإجابات بعد «خلص» من المتصفح
  p = await open();
  await p.goto(APP + "?c=MENA2345");
  await p.waitForSelector(".report");
  var tries = await p.evaluate(function () {
    var ref = firebase.firestore().collection("mizan_scale").doc("MENA2345");
    function t(d) { return ref.set(d, { merge: true }).then(function () { return "ok"; }, function (e) { return e.code; }); }
    return Promise.all([t({ name: "حد تاني" }), t({ override: { order: ["A", "V", "H"] } }), t({ st: { "1": { answers: { s1n1: { closest: "zz-changed" } } } } }),
                        t({ result: { hacked: true } }), t({ revoked: false }), t({ rating: { value: 5, note: "", at: 1 } })]);
  });
  ok("تغيير الاسم ← مرفوض", tries[0] === "permission-denied");
  ok("كتابة حقل كوتش ← مرفوض", tries[1] === "permission-denied");
  ok("تعديل الإجابات بعد «خلص» ← مرفوض", tries[2] === "permission-denied");
  ok("تعديل النتيجة بعد «خلص» ← مرفوض", tries[3] === "permission-denied");
  ok("لمس revoked ← مرفوض", tries[4] === "permission-denied");
  ok("التقييم ← مسموح", tries[5] === "ok");
  var mk = await p.evaluate(function () {
    return firebase.firestore().collection("mizan_scale").doc("NEWW2345").set({ status: "شغال" }, { merge: true }).then(function () { return "ok"; }, function (e) { return e.code; });
  });
  ok("كود مش موجود ما يقدرش يعمل وثيقة جديدة", mk === "permission-denied");
  await p.ctx.close();

  console.log("\n٤. النت وقع في النص، ورجع");
  await seed("NETT2345", { name: "يوسف", status: "جديد" });
  p = await open({ w: 360 });
  await p.goto(APP + "?c=NETT2345");
  await walk(p, "s2");
  await p.ctx.setOffline(true);
  await finishStation(p);
  await p.waitForFunction(function () { return /النت ضعيف/.test(document.getElementById("note").innerText); }, null, { timeout: 15000 });
  ok("النت وقع ← المتطوع على المحطة ٣ على طول (ما استناش)", (await screen(p)) === "t2" || (await screen(p)) === "s3");
  ok("…والرسالة: «النت ضعيف. إجاباتك محفوظة على موبايلك…»", /إجاباتك محفوظة على موبايلك، وهتتبعت أول ما النت يرجع/.test(await notes(p)));
  ok("…وفوق: «محفوظ على موبايلك»", /محفوظ على موبايلك/.test(await p.innerText("#sync")));
  await walk(p, "s4");
  await p.ctx.setOffline(false);
  await p.evaluate(function () { window.dispatchEvent(new Event("online")); });
  await p.waitForFunction(function () { return !/النت ضعيف/.test(document.getElementById("note").innerText); }, null, { timeout: 15000 });
  await sleep(300);
  d = (await dump()).db.mizan_scale.NETT2345;
  ok("النت رجع ← اتبعت لوحده، ومحطة ٣ وصلت", d.st && d.st["3"] && Object.keys(d.st["3"].answers).length === 19);
  ok("…والرسالة اختفت و«اتحفظ» فوق", /اتحفظ/.test(await p.innerText("#sync")));
  await p.ctx.close();

  console.log("\n٥. السيرفر رافض (القواعد لسه ما اتنشرتش)");
  await seed("DENY2345", { name: "سلمى", status: "جديد" });
  await mode({ get: "ok", set: "denied" });
  p = await open();
  await p.goto(APP + "?c=DENY2345");
  await walk(p, "welcome");
  await p.waitForFunction(function () { return /عندنا، مش عندك/.test(document.getElementById("note").innerText); }, null, { timeout: 8000 });
  ok("رفض الحفظ ← «فيه مشكلة في الحفظ عندنا، مش عندك» برقم الخطأ", /permission-denied/.test(await notes(p)));
  await walk(p, "s1");
  ok("…والمتطوع بيكمّل عادي للمحطة ١", (await screen(p)) === "s1");
  await mode({ get: "denied", set: "denied" });
  await p.goto(APP + "?c=DENY2345");
  await p.waitForFunction(function () { return window.MZS_APP && window.MZS_APP.state(); }, null, { timeout: 8000 });
  ok("حتى لو القراية مرفوضة كمان: الصفحة فتحت على المحطة ١ من الموبايل", (await screen(p)) === "s1" && /عندنا، مش عندك/.test(await notes(p)));
  await mode({ get: "ok", set: "ok" });
  await p.ctx.close();

  console.log("\n٦. السيرفر علّق (ما بيردّش)");
  await seed("HANG2345", { name: "كريم", status: "جديد" });
  await mode({ get: "hang", set: "hang" });
  p = await open();
  var t0 = Date.now();
  await p.goto(APP + "?c=HANG2345");
  await waitScreen(p, "address", 20000);
  var waited = Date.now() - t0;
  ok("السيرفر ما ردّش ← الصفحة فتحت بعد المهلة (" + Math.round(waited / 1000) + " ثانية) ومن غير «استنى»", waited < 16000 && !/استن/.test(await mainText(p) + await notes(p)));
  ok("…والرسالة: «النت ضعيف، فلسه ما اتأكدناش من الكود»", /لسه ما اتأكدناش من الكود/.test(await notes(p)));
  await click(p, '[data-act="addr"][data-v="m"]');
  ok("…وبيكمّل", (await screen(p)) === "welcome");
  await mode({ get: "ok", set: "ok" });
  await p.ctx.close();

  console.log("\n٧. مكتبة فايربيز فشلت / علّقت");
  await seed("NSDK2345", { name: "علي", status: "جديد" });
  p = await open({ sdk: "fail" });
  await p.goto(APP + "?c=NSDK2345");
  await waitScreen(p, "address", 10000);
  ok("المكتبة فشلت ← الصفحة شغالة، والرسالة: «مكتبة الاتصال ما اتحمّلتش»", /مكتبة الاتصال ما اتحمّلتش/.test(await notes(p)));
  await walk(p, "s1");
  ok("…والمتطوع بيكمّل للمحطة ١", (await screen(p)) === "s1");
  await p.ctx.close();
  p = await open({ sdk: "hang" });
  t0 = Date.now();
  await p.goto(APP + "?c=NSDK2345");
  await waitScreen(p, "address", 15000);
  ok("المكتبة علّقت ← الصفحة فتحت بعد " + Math.round((Date.now() - t0) / 1000) + " ثواني بالرسالة", Date.now() - t0 < 12000 && /مكتبة الاتصال/.test(await notes(p)));
  await p.ctx.close();

  console.log("\n٨. المتصفح قافل التخزين (جوه واتساب / تصفح خاص)");
  await seed("STRG2345", { name: "ندى", status: "جديد" });
  p = await open({ noStorage: true });
  await p.goto(APP + "?c=STRG2345");
  await waitScreen(p, "address");
  ok("نصيحة التخزين ظاهرة كنصيحة صغيرة", /نصيحة صغيرة/.test(await notes(p)));
  await click(p, '[data-act="noteHide"]');
  ok("…و«تمام» بيقفلها", !/نصيحة صغيرة/.test(await notes(p)));
  await walk(p, "s2");
  d = (await dump()).db.mizan_scale.STRG2345;
  ok("…والإجابات بتوصل السيرفر بعد كل محطة", d.st && d.st["1"] && Object.keys(d.st["1"].answers).length === 18);
  ok("مفيش أخطاء JavaScript", !p.errs.length, p.errs.join(" | "));
  await p.ctx.close();

  console.log("\n٩. كود التجربة");
  var before9 = JSON.stringify((await dump()).log.length);
  p = await open({ w: 360 });
  await p.goto(APP + "?c=TEST2345");
  await waitScreen(p, "address");
  ok("رسالة «دي نسخة تجربة» ظاهرة", /نسخة تجربة/.test(await notes(p)));
  await walk(p, "s1");
  await click(p, '[data-act="trialFill"]');
  ok("زرار «املأ اللي فاضل» بيكمّل المحطة ويفتح على آخر موقف", /خلّصت المحطة/.test(await p.innerText('[data-act="stNext"]')) && !(await p.getAttribute('[data-act="stNext"]', "aria-disabled")));
  await click(p, '[data-act="stNext"]');
  await walk(p, "report");
  await p.waitForSelector(".report");
  ok("التجربة وصلت للتقرير", (await p.$$(".report h2")).length >= 8);
  ok("…ومفيش ولا طلب راح للسيرفر", JSON.stringify((await dump()).log.length) === before9);
  await click(p, '[data-act="trialReset"]');
  await waitScreen(p, "address");
  ok("«ابدأ من الأول» بيرجّع التجربة لأولها", true);
  await p.ctx.close();

  console.log("\n١٠. الموبايلات الصغيرة");
  for (var w of [320, 360, 375]) {
    p = await open({ w: w });
    await p.goto(APP + "?c=TEST3456");
    var bad = [];
    await walk(p, "report", { onScreen: async function (sc) {
      if (!(await noOverflow(p))) bad.push(sc);
      if (sc === "s1" || sc === "s6" || sc === "s8") await p.screenshot({ path: path.join(SHOTS, sc + "-" + w + ".png"), fullPage: false });
    }, answers: function () { return null; } });
    await p.waitForSelector(".report");
    if (!(await noOverflow(p))) bad.push("report");
    await p.screenshot({ path: path.join(SHOTS, "report-" + w + ".png") });
    ok("عرض " + w + ": مفيش ولا شاشة بتتمدد لبرّه (scroll بالعرض)", !bad.length, bad.join(","));
    var fz = await p.evaluate(function () {
      function min(sel) { return Math.min.apply(null, Array.prototype.map.call(document.querySelectorAll(sel), function (e) { return Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10; })); }
      return { body: min(".report > p, .report li, .dcard p"), side: min(".report .soft, .dcard .dc-line, .rate .scale-now, .addr-bar") };
    });
    ok("عرض " + w + ": كلام التقرير نفسه أصغر خط فيه " + fz.body + "px (≥ ١٦)، والسطور الجانبية " + fz.side + "px (≥ ١٣)", fz.body >= 16 && fz.side >= 13);
    await p.ctx.close();
  }

  console.log("\n١١. موبايل رخيص (المعالج أبطأ ٦ مرات)");
  p = await open({ w: 360 });
  var cdp = await p.ctx.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  t0 = Date.now();
  await p.goto(APP + "?c=TEST4567");
  await waitScreen(p, "address", 20000);
  ok("أول شاشة في " + (Date.now() - t0) + "ms", Date.now() - t0 < 6000);
  await walk(p, "s9", {});
  t0 = Date.now(); await answerAll(p); var tAns = Date.now() - t0;   // محطة ٩ = عبارات، كلها في شاشة واحدة
  ok("١٨ دوسة في محطة الضغط: " + Math.round(tAns / 18) + "ms للدوسة", tAns / 18 < 250);
  t0 = Date.now();
  await click(p, '[data-act="stNext"]'); await walk(p, "report");
  await p.waitForSelector(".report");
  ok("حساب النتيجة + رسم التقرير في " + (Date.now() - t0) + "ms", Date.now() - t0 < 6000);
  await p.ctx.close();

  console.log("\n١٣. موقف واحد في الشاشة (محطات ١ و٢ و٧)");
  await seed("RANA2345", { name: "رنا", status: "جديد" });
  p = await open({ w: 360 });
  await p.goto(APP + "?c=RANA2345");
  await walk(p, "s1", { address: "f" });
  ok("أول ما المحطة تفتح: شاشة الشرح ومفيش ولا موقف", !!(await p.$('[data-act="introGo"]')) && (await p.$$("article.item")).length === 0);
  await click(p, '[data-act="introGo"]');
  ok("بعد «يلّا نبدأ»: موقف واحد بس في الشاشة، ومكتوب «موقف ١ من ١٨»", (await p.$$("article.item")).length === 1 && /موقف ١ من ١٨/.test(await mainText(p)));
  var vis = await p.evaluate(function () { var r = document.querySelector("article.item .opts").getBoundingClientRect(); return r.top < window.innerHeight; });
  ok("…والاختيارات باينة من غير scroll (عرض ٣٦٠)", vis);
  ok("«اللي بعده» مقفول قبل ما تختاري", (await p.getAttribute('[data-act="sitNext"]', "aria-disabled")) === "true");
  await p.evaluate(function () { document.querySelectorAll(".pk.c")[0].click(); });
  ok("اختارت «الأقرب» بس ← لسه على موقف ١ (مفيش نط لوحده)، والزرار لسه مقفول", /موقف ١ من ١٨/.test(await mainText(p)) && (await p.getAttribute('[data-act="sitNext"]', "aria-disabled")) === "true");
  await p.evaluate(function () { document.querySelectorAll(".pk.f")[1].click(); });
  var badges = await p.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll(".opt .badge"), function (b) { return b.textContent; }); });
  ok("شارة «الأقرب» و«الأبعد» جوه الاختيارين اللي اتختاروا بس", JSON.stringify(badges.sort()) === JSON.stringify(["الأبعد", "الأقرب"].sort()) && (await p.$$(".opt.is-c")).length === 1 && (await p.$$(".opt.is-f")).length === 1);
  ok("…و«اللي بعده» اتفتح", !(await p.getAttribute('[data-act="sitNext"]', "aria-disabled")));
  for (var q = 0; q < 2; q++) { await click(p, '[data-act="sitNext"]'); await answerAll(p); }
  ok("بعد ٣ مواقف: «موقف ٣ من ١٨»", /موقف ٣ من ١٨/.test(await mainText(p)));
  await click(p, '[data-act="sitPrev"]');
  s = await st(p);
  ok("«اللي قبله» ← موقف ٢ وإجابته زي ما هي", /موقف ٢ من ١٨/.test(await mainText(p)) && (await p.$$(".opt.is-c")).length === 1);
  await click(p, '[data-act="sitNext"]');
  await p.reload();
  await waitScreen(p, "s1");
  ok("قفلت وفتحت تاني ← نفس الموقف (٣) ومن غير شاشة الشرح", /موقف ٣ من ١٨/.test(await mainText(p)) && !(await p.$('[data-act="introGo"]')));
  ok("مفيش أخطاء JavaScript", !p.errs.length, p.errs.join(" | "));
  await p.screenshot({ path: path.join(SHOTS, "sit-360.png") });
  await p.ctx.close();

  console.log("\n١٤. صفحة الأدمن");
  var ADMIN = BASE + "/mizan-scale/admin/";
  await api({ op: "user", email: "admin@fouad-academy.com", password: "pass-1234" });
  await api({ op: "user", email: "someone@x.com", password: "pass-1234" });
  p = await open({ w: 1280, mobile: false });
  p.on("dialog", function (dl) { dl.accept(); });
  await p.ctx.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx/, function (r) {
    var f = process.env.XLSX_LOCAL || "/tmp/claude-0/xlsx.full.min.js";
    return fs.existsSync(f) ? r.fulfill({ path: f, contentType: "text/javascript" }) : r.abort();
  });
  await p.goto(ADMIN);
  await p.waitForSelector("#ago");
  await p.fill("#ap", "غلط");
  await click(p, "#ago");
  await p.waitForFunction(function () { var m = document.getElementById("amsg"); return m && !m.hidden; });
  ok("باسورد غلط ← «الإيميل أو الباسورد غلط»", /غلط/.test(await p.innerText("#amsg")));
  await p.fill("#ae", "someone@x.com"); await p.fill("#ap", "pass-1234"); await click(p, "#ago");
  await p.waitForFunction(function () { return /مش أدمن/.test(document.getElementById("main").innerText); });
  ok("إيميل مش أدمن ← «الإيميل ده مش أدمن» ومفيش قايمة", !(await p.$("table.ax")));
  await p.fill("#ae", "admin@fouad-academy.com"); await p.fill("#ap", "pass-1234"); await click(p, "#ago");
  await p.waitForSelector("table.ax");
  var nRows0 = (await p.$$("tbody tr[data-id]")).length;
  ok("الأدمن دخل والقايمة ظهرت (" + nRows0 + " متطوع من الاختبارات اللي فاتت)", nRows0 >= 5);
  await click(p, '[data-act="add"]');
  await p.fill("#addList", "هالة سمير، سوهاج، متطوعة في المحافظة\nمروان عادل\tالأقصر\tمسؤول ملف\nسيف، بني سويف");
  await click(p, '[data-act="addGo"]');
  await p.waitForFunction(function () { return /اتضاف/.test((document.getElementById("panel") || {}).innerText || ""); }, null, { timeout: 15000 });
  var db1 = (await dump()).db.mizan_scale;
  var added = Object.keys(db1).filter(function (k) { return ["هالة سمير", "مروان عادل", "سيف"].indexOf(db1[k].name) !== -1; });
  ok("القايمة اتضافت: ٣ متطوعين، بالاسم والمحافظة والدور (فصلة وTab)", added.length === 3 && db1[added.filter(function (k) { return db1[k].name === "مروان عادل"; })[0]].gov === "الأقصر" && db1[added.filter(function (k) { return db1[k].name === "هالة سمير"; })[0]].team === "متطوعة في المحافظة");
  global.self = global; require("../shared.js");
  ok("الأكواد الجديدة صالحة ومفيش ولا واحد بيبدأ بـ TEST", added.every(function (k) { return global.MZS.validCode(k) && !global.MZS.isTrial(k); }));
  ok("الروابط ظهرت في نتيجة الإضافة", (await p.innerText("#panel")).split("mizan-scale/app/?c=").length - 1 === 3);
  ok("الجدول اتحدث بالأسامي الجديدة", (await p.$$("tbody tr[data-id]")).length === nRows0 + 3);
  // متطوعة من الجداد تخلّص من موبايلها
  var hala = added.filter(function (k) { return db1[k].name === "هالة سمير"; })[0];
  var v = await open({ w: 360 });
  await v.goto(APP + "?c=" + hala);
  await walk(v, "report", { address: "f", tenure: "t1" });
  await v.waitForSelector(".report");
  ok("المتطوعة الجديدة فتحت رابطها وخلّصت (والترحيب باسمها)", /هالة/.test(await mainText(v)));
  // متطوع تاني يبدأ بس
  var marwan = added.filter(function (k) { return db1[k].name === "مروان عادل"; })[0];
  var v2 = await open({ w: 360 });
  await v2.goto(APP + "?c=" + marwan);
  await walk(v2, "s3");
  await v2.ctx.close();
  await click(p, '[data-act="reload"]');
  await p.waitForSelector("table.ax");
  await sleep(300);
  var rowTxt = async function (code) { return p.evaluate(function (c) { var r = document.querySelector('tr[data-id="' + c + '"]'); return r ? r.innerText : ""; }, code); };
  ok("الحالة: هالة «خلّص»، ومروان «خلّص المحطة ٢ من ٩»، وسيف «ما بدأش»", /\tخلّص\t/.test(await rowTxt(hala)) && /خلّص المحطة ٢ من ٩/.test(await rowTxt(marwan)) && /ما بدأش/.test(await rowTxt(added.filter(function (k) { return db1[k].name === "سيف"; })[0])));
  await p.click('tr[data-id="' + hala + '"] td');
  await p.waitForSelector("#detail .report");
  ok("فتح هالة ← التقرير زي ما شافته (بالمؤنث وباسمها)", /ميزاني/.test(await p.innerText("#detail")) && /إنتي والتطوع/.test(await p.innerText("#detail")));
  await click(p, '[data-act="tab"][data-v="coach"]');
  ok("ورقة الكوتش: «المتطوعة» والدور بالمؤنث وقسم التطوع", /ورقة الكوتش: هالة/.test(await p.innerText("#detail")) && /متطوعة في المحافظة/.test(await p.innerText("#detail")) && /التطوع/.test(await p.innerText("#detail")));
  await click(p, '[data-act="tab"][data-v="data"]');
  ok("البيانات ظاهرة", /"st"/.test(await p.innerText("#detail")));
  // رابط جديد
  await click(p, '[data-act="newLink"][data-id="' + hala + '"]');
  for (var w8 = 0; w8 < 60 && !(await dump()).db.mizan_scale[hala].revoked; w8++) await sleep(250);
  await p.waitForSelector("#detail .ad-link");
  var db2 = (await dump()).db.mizan_scale, oldD = db2[hala], newC = oldD.replacedBy, newD = db2[newC];
  ok("رابط جديد: القديم revoked وفيه الكود الجديد", oldD.revoked === true && global.MZS.validCode(newC) && !global.MZS.isTrial(newC));
  ok("…والجديد فيه كل الإجابات والنتيجة والاسم", newD && newD.name === "هالة سمير" && newD.status === "خلص" && JSON.stringify(newD.st) === JSON.stringify(oldD.st) && newD.replaces === hala && !newD.revoked);
  await v.goto(APP + "?c=" + hala);
  await v.waitForFunction(function () { return /اتقفل/.test(document.getElementById("main").innerText); });
  ok("الرابط القديم على موبايلها ← «الرابط ده اتقفل، واتعمل لك رابط جديد»", true);
  await v.goto(APP + "?c=" + newC);
  await v.waitForSelector(".report");
  ok("الرابط الجديد ← تقريرها على طول", (await screen(v)) === "report");
  await v.ctx.close();
  // الأرقام والتنزيل
  await click(p, '[data-act="stats"]');
  ok("الأرقام المجمّعة: العدد ظاهر، والتوزيعات مستخبية لحد ١٠ (لسه أقل)", /المتطوعين:/.test(await p.innerText("#panel")) && /بتظهر لما يخلّص ١٠/.test(await p.innerText("#panel")));
  var dl = p.waitForEvent("download");
  await click(p, '[data-act="json"]');
  var jf = await (await dl).path(), J = JSON.parse(fs.readFileSync(jf, "utf8"));
  ok("تنزيل JSON: كل الوثايق وفيها الكود", J.docs.length === Object.keys((await dump()).db.mizan_scale).length && J.docs.every(function (x) { return x.code; }));
  var xf = process.env.XLSX_LOCAL || "/tmp/claude-0/xlsx.full.min.js";
  if (fs.existsSync(xf)) {
    dl = p.waitForEvent("download");
    await click(p, '[data-act="xlsx"]');
    var xp = await (await dl).path();
    var XL = require(xf);   // نفس ملف المكتبة اللي الصفحة استعملته (UMD)
    var wb = XL.read(fs.readFileSync(xp), { type: "buffer" }), sh = XL.utils.sheet_to_json(wb.Sheets["المتطوعين"], { header: 1 });
    var hrow = sh.filter(function (r) { return r[0] === newC; })[0] || [];
    ok("تنزيل Excel: تابين، وصف لكل متطوع، وهالة فيها الترتيب ونتيجة التطوع", wb.SheetNames.join("|") === "المتطوعين|الأرقام المجمعة" && sh.length === J.docs.length + 1 && hrow[1] === "هالة سمير" && !!hrow[13] && !!hrow[19]);
  } else console.log("  · Excel: مكتبة xlsx مش متاحة محليًا، الاختبار ده اتعدّى");
  // من غير أدمن: القايمة مقفولة
  var nv = await open({ w: 360 });
  await nv.goto(APP + "?c=RANA2345");   // كود حقيقي علشان المكتبة تتحمّل (كود التجربة ما بيحمّلهاش)
  await nv.waitForFunction(function () { return typeof firebase !== "undefined" && window.MZS_APP.state(); });
  var listTry = await nv.evaluate(function () { return firebase.firestore().collection("mizan_scale").get().then(function () { return "ok"; }, function (e) { return e.code; }); });
  ok("من غير أدمن: عرض القايمة مرفوض", listTry === "permission-denied");
  await nv.ctx.close();
  ok("مفيش أخطاء JavaScript في الأدمن", !p.errs.length, p.errs.join(" | "));
  await p.screenshot({ path: path.join(SHOTS, "admin.png"), fullPage: false });
  await p.ctx.close();

  // WebKit (أقرب حاجة لسفاري الآيفون في البيئة دي) لو متسطّب
  try {
    var wk = await pw.webkit.launch();
    console.log("\n١٢. WebKit");
    var c2 = await wk.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
    await c2.route(/fonts\.(googleapis|gstatic)\.com/, function (r) { return r.abort(); });
    await c2.route(/gstatic\.com\/firebasejs/, function (r) { return r.request().url().indexOf("app-compat") !== -1 ? r.fulfill({ path: MOCK, contentType: "text/javascript" }) : r.fulfill({ body: "", contentType: "text/javascript" }); });
    p = await c2.newPage(); p.errs = []; p.on("pageerror", function (e) { p.errs.push(e.message); }); p.ctx = c2;
    await seed("SAFR2345", { name: "هبة", status: "جديد" });
    await p.goto(APP + "?c=SAFR2345");
    await walk(p, "report", { address: "f" });
    await p.waitForSelector(".report");
    d = (await dump()).db.mizan_scale.SAFR2345;
    ok("WebKit: من الأول للتقرير، والسيرفر عنده النتيجة", d.status === "خلص" && !p.errs.length, p.errs.join(" | "));
    await p.screenshot({ path: path.join(SHOTS, "webkit-report.png") });
    await wk.close();
  } catch (e) { console.log("\n١٢. WebKit: مش متسطّب في البيئة دي (" + String(e.message).split("\n")[0].slice(0, 80) + ")"); }

  await browser.close();
  console.log("\n" + passes + " نجح · " + fails + " فشل");
  process.exit(fails ? 1 : 0);
}
run().catch(function (e) { console.error(e); process.exit(2); });
