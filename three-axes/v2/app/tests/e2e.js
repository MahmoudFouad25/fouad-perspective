/* اختبار الصفحات من أولها لآخرها على متصفح حقيقي (Chromium) وفايربيز وهمي.
   التشغيل (من جذر الريبو):
     node three-axes/v2/app/tests/server.js 8765 &
     NODE_PATH=$(npm root -g) node three-axes/v2/app/tests/e2e.js
   بيطبع ✓/✗ لكل خطوة، وبيحفظ صور الموبايل في tests/shots/. */
"use strict";
var path = require("path"), fs = require("fs");
var pw = require("playwright");
var BASE = "http://127.0.0.1:" + (process.env.PORT || 8765) + "/fouad-perspective/three-axes/";
var MOCK = fs.readFileSync(path.join(__dirname, "firebase-mock.js"), "utf8");
var SHOTS = path.join(__dirname, "shots"); if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS);
var V2 = path.resolve(__dirname, "../..");
var E = require(path.join(V2, "engine/engine.js")), C = require(path.join(V2, "engine/config.js")), ITEMS = require(path.join(V2, "engine/items.json"));
var TEXTS = require(path.join(V2, "report/texts.json")), RP = require(path.join(V2, "report/render.js"));
var SAMPLES = require(path.join(V2, "report/samples.json"));
var M = require(path.join(V2, "engine/tests/mahmoud.json"));

var pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else fail++; console.log((cond ? "  ✓ " : "  ✗ ") + name + (cond || !extra ? "" : "  ← " + extra)); }
function api(body) { return fetch("http://127.0.0.1:" + (process.env.PORT || 8765) + "/__api", { method: "POST", body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
function b64(s) { return Buffer.from(s, "utf8").toString("base64"); }

var USERS = {
  u_sara: { personalInfo: { email: "sara@x.com", name: "سارة أحمد" }, enrollments: [{ courseId: "three-axes" }], auth: { tempPassword: b64("pw-sara") } },
  u_mahmoud: { personalInfo: { email: "m@x.com", name: "محمود فؤاد" }, enrollments: [{ courseId: "insight-out" }, { courseId: "three-axes" }], auth: { tempPassword: b64("pw-m") } },
  u_fo: { personalInfo: { email: "fo@x.com", name: "فاطمة" }, enrollments: [{ courseInfo: { id: "three-axes" } }], auth: { tempPassword: b64("pw-fo") } },
  u_new: { personalInfo: { email: "new@x.com", name: "نادر" }, enrollments: [{ id: "three-axes" }], auth: { tempPassword: b64("pw-new") } },
  u_none: { personalInfo: { email: "none@x.com", name: "منى" }, enrollments: [{ courseId: "mirrors-assesment" }] },
  u_rei: { personalInfo: { email: "rei@x.com", name: "رامي" }, enrollments: [{ courseId: "reignite" }] },
  u_old: { personalInfo: { email: "old@x.com", name: "عمر" }, enrollments: [{ courseId: "three-axes" }] }
};
var AUTH = {
  "sara@x.com": { uid: "A_sara", password: "pw-sara" }, "m@x.com": { uid: "A_m", password: "pw-m" },
  "fo@x.com": { uid: "A_fo", password: "another-password" }, "old@x.com": { uid: "A_old", password: "x" },
  "none@x.com": { uid: "A_none", password: "x" }, "admin@fouad-academy.com": { uid: "A_admin", password: "adminpw" }
};

function newCtx(browser, user, signedIn, mobile) {
  return browser.newContext(mobile ? { viewport: { width: 375, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1200, height: 900 } })
    .then(function (ctx) {
      return ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app\.js/, function (r) { r.fulfill({ contentType: "application/javascript", body: MOCK }); })
        .then(function () { return ctx.route(/gstatic\.com\/firebasejs\/.*firebase-(auth|firestore)\.js/, function (r) { r.fulfill({ contentType: "application/javascript", body: "" }); }); })
        .then(function () { return ctx.route(/fonts\.(googleapis|gstatic)\.com/, function (r) { r.fulfill({ body: "" }); }); })
        .then(function () {
          if (!user) return;
          var a = signedIn && AUTH[USERS[user].personalInfo.email];
          return ctx.addInitScript(function (o) {
            if (!localStorage.getItem("__seeded")) {
              localStorage.setItem("__seeded", "1");
              localStorage.setItem("userId", o.id); localStorage.setItem("userName", o.name);
              if (o.auth) localStorage.setItem("__mockAuth", JSON.stringify(o.auth));
            }
          }, { id: user, name: USERS[user].personalInfo.name, auth: a ? { uid: a.uid, email: USERS[user].personalInfo.email } : null });
        })
        .then(function () { return ctx; });
    });
}

/* ───── إجابة محطة بالكامل ───── */
function answerStation(page, plan) {
  return page.evaluate(function (plan) {
    var st = +document.querySelector('[data-act="stNext"]').getAttribute("data-st");
    function click(sel) { var b = document.querySelector(sel); if (!b) throw new Error("مش لاقي " + sel); b.click(); }
    var arts = Array.prototype.slice.call(document.querySelectorAll("article.item"));
    arts.forEach(function (a) {
      var id = a.id.slice(3), p = plan[id];
      if (p === undefined) throw new Error("مفيش خطة لـ " + id);
      if (st <= 2) {
        if (p === "none") return click('[data-act="none"][data-id="' + id + '"]');
        click('[data-act="close"][data-id="' + id + '"][data-o="' + p[0] + '"]');
        click('[data-act="far"][data-id="' + id + '"][data-o="' + p[1] + '"]');
      } else if (/^s6t/.test(id)) click('[data-act="bip"][data-id="' + id + '"][data-v="' + p + '"]');
      else click('[data-act="freq"][data-id="' + id + '"][data-v="' + p + '"]');
    });
    return st;
  }, plan);
}
function waitScreen(page, sel) { return page.waitForSelector(sel, { timeout: 15000 }); }
function clickAct(page, act) { return page.click('[data-act="' + act + '"]'); }

function mahmoudPlan() {
  var p = {};
  ITEMS.station1.forEach(function (it, i) { p[it.id] = ["o" + (M.s1[i][0] + 1), "o" + (M.s1[i][1] + 1)]; });
  ITEMS.station2.forEach(function (it, i) { p[it.id] = ["o" + (M.s2[i][0] + 1), "o" + (M.s2[i][1] + 1)]; });
  [3, 4, 5, 7].forEach(function (k) { M["s" + k].forEach(function (v, i) { p["s" + k + "n" + (i + 1)] = v; }); });
  M.s6.forEach(function (v, i) { p["s6n" + (i + 1)] = v; });
  M.s6t.forEach(function (v, i) { p["s6t" + (i + 1)] = v; });
  return p;
}
function saraPlan() {   // الحيوية رئيسية، ومعاها تنبيه تجمّد علشان الرسالة اللطيفة تظهر في المنفردة
  var p = {}, ax = function (it, a) { return it.options.filter(function (o) { return o.axis === a; })[0].id; };
  ITEMS.station1.forEach(function (it) { p[it.id] = it.light ? "none" : [ax(it, "V"), ax(it, "H")]; });
  ITEMS.station2.forEach(function (it) { p[it.id] = [ax(it, "H"), ax(it, "V")]; });
  ITEMS.freq.forEach(function (it) { p[it.id] = it.kind === "freeze" ? 3 : it.kind === "validity" ? 0 : (it.n % 4); });
  ITEMS.bipolar.forEach(function (b, i) { p[b.id] = i + 2; });
  return p;
}

function runAll(page, plan, opts) {
  opts = opts || {};
  return waitScreen(page, '[data-act="go"]').then(function () { return clickAct(page, "go"); })             // الترحيب
    .then(function () { return waitScreen(page, '[data-act="period"]'); })
    .then(function () { return page.evaluate(function (sel) { sel.forEach(function (id) { document.querySelector('[data-act="period"][data-id="' + id + '"]').click(); }); }, opts.period || ["p8"]); })
    .then(function () { if (opts.impact) return page.click('[data-act="impact"][data-v="' + opts.impact + '"]'); })
    .then(function () { return clickAct(page, "periodNext"); })
    .then(function () { return waitScreen(page, '[data-act="go"]'); }).then(function () { return clickAct(page, "go"); })
    .then(function loop() {
      return waitScreen(page, '[data-act="stNext"]').then(function () { return answerStation(page, plan); }).then(function (st) {
        return page.click('[data-act="stNext"]').then(function () {
          if (opts.stopAfter === st) return "stopped";
          if (st === 7) return waitScreen(page, '[data-act="go"]').then(function () { return clickAct(page, "go"); }).then(function () { return "done"; });
          return waitScreen(page, '[data-act="go"]').then(function () { return clickAct(page, "go"); }).then(loop);
        });
      });
    });
}
function reportText(page) {
  return page.waitForSelector("article.report", { timeout: 15000 }).then(function () {
    return page.evaluate(function () {
      return Array.prototype.slice.call(document.querySelectorAll("article.report h1, article.report h2, article.report h3, article.report h4, article.report p, article.report li"))
        .filter(function (e) { return !e.closest("#rate"); }).map(function (e) { return e.textContent.trim(); });
    });
  });
}
function noHScroll(page) { return page.evaluate(function () { return document.documentElement.scrollWidth <= window.innerWidth + 1; }); }

(async function () {
  await api({ op: "_reset", db: { users: USERS, maqyas_axes_results: { u_old: { results: { ranking: [] } } } }, auth: AUTH });
  var browser = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
  var errors = [];
  function watch(page, who) { page.on("pageerror", function (e) { errors.push(who + ": " + e.message); }); }

  console.log("\n١. البوابة");
  for (var c of [["u_none", "v2/app/", true], ["u_rei", "v1.html", true], ["u_sara", "v2/app/", true]]) {
    var cx = await newCtx(browser, c[0], c[2]), pg = await cx.newPage(); watch(pg, c[0]);
    await pg.goto(BASE + "course-view.html"); await pg.waitForURL(new RegExp(c[1].replace(".", "\\.") + "$"), { timeout: 15000 }).catch(function () {});
    ok(c[0] + " ← " + c[1], pg.url().indexOf(c[1]) !== -1, pg.url());
    await cx.close();
  }
  var cxo = await newCtx(browser, "u_old", true), po = await cxo.newPage(); watch(po, "u_old");
  await po.goto(BASE + "course-view.html"); await po.waitForSelector(".card h2");
  var oldCard = await po.textContent("main");
  ok("عنده نتيجة قديمة ← كارت فيه الاتنين", /تقريرك القديم/.test(oldCard) && /اعمل المقياس الجديد/.test(oldCard));
  await cxo.close();
  var cxl = await newCtx(browser, null), pl = await cxl.newPage();
  await pl.goto(BASE + "course-view.html"); await pl.waitForURL(/login\.html/, { timeout: 8000 }).catch(function () {});
  ok("مش داخل ← صفحة الدخول", /login\.html/.test(pl.url()), pl.url()); await cxl.close();

  console.log("\n٢. مش مشترك");
  var cxn = await newCtx(browser, "u_none", true), pn = await cxn.newPage(); watch(pn, "u_none");
  await pn.goto(BASE + "v2/app/"); await pn.waitForSelector(".card h2");
  ok("رسالة «مش مفتوح في حسابك» ورابط الكورس", /مش مفتوح في حسابك/.test(await pn.textContent("main")) && !!(await pn.$('a[href*="insight-out"]')));
  await cxn.close();

  console.log("\n٣. firestore-only (حساب فايربيز بباسورد تاني)");
  var cxf = await newCtx(browser, "u_fo", false), pf = await cxf.newPage(); watch(pf, "u_fo");
  await pf.goto(BASE + "v2/app/"); await pf.waitForSelector("#axPw");
  ok("بيطلب تأكيد الدخول", /أكّد دخولك/.test(await pf.textContent("main")));
  await pf.fill("#axPw", "wrong"); await pf.click("#axPwGo"); await pf.waitForSelector("#axPwMsg:not([hidden])");
  ok("باسورد غلط ← رسالة الباسورد", /الباسورد مش مظبوط/.test(await pf.textContent("#axPwMsg")));
  await pf.fill("#axPw", "pw-fo"); await pf.click("#axPwGo"); await pf.waitForFunction(function () { return /كلّمنا/.test(document.querySelector("#axPwMsg").textContent); });
  ok("باسورد المنصة صح بس حساب فايربيز مختلف ← رسالة واضحة + واتساب", !!(await pf.$('#axPwMsg a[href^="https://wa.me/201024584537"]')));
  await cxf.close();

  console.log("\n٤. من غير حساب فايربيز خالص (بيتعمل في الخلفية بعد الباسورد)");
  var cxw = await newCtx(browser, "u_new", false), pnw = await cxw.newPage(); watch(pnw, "u_new");
  await pnw.goto(BASE + "v2/app/"); await pnw.waitForSelector("#axPw");
  await pnw.fill("#axPw", "pw-new"); await pnw.click("#axPwGo");
  await pnw.waitForSelector('[data-act="go"]');
  var dump = await api({ op: "_dump" });
  ok("حساب فايربيز اتعمل بنفس الإيميل والمقياس فتح", !!dump.auth["new@x.com"]);
  await cxw.close();

  console.log("\n٥. سارة (منفرد): الرجوع بعد القفل، والتقرير، والتقييم");
  var cxs = await newCtx(browser, "u_sara", true, true), ps = await cxs.newPage(); watch(ps, "u_sara");
  await ps.goto(BASE + "course-view.html");
  var r1 = await runAll(ps, saraPlan(), { stopAfter: 3 });
  await ps.waitForFunction(function () { return /^اتحفظ$/.test(document.querySelector("#sync").textContent); });
  dump = await api({ op: "_dump" });
  var sd = dump.db.maqyas_axes_v2 && dump.db.maqyas_axes_v2.u_sara;
  ok("بعد المحطة ٣ الوثيقة على فايربيز فيها ٣ محطات والشاشة t3", r1 === "stopped" && sd && sd.st["3"] && sd.st["3"].endedAt && sd.screen === "t3", sd && sd.screen);
  ok("الوثيقة فيها userId وauthUid ونسخة الأسئلة ونوع الشراء", sd && sd.userId === "u_sara" && sd.authUid === "A_sara" && sd.questionsVersion === ITEMS.version && sd.purchase === "standalone");
  await ps.evaluate(function () { Object.keys(localStorage).filter(function (k) { return k.indexOf("axv2:s:") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); });
  await ps.goto(BASE + "v2/app/"); await waitScreen(ps, '[data-act="go"]');
  ok("الرجوع من فايربيز (الجهاز اتمسح) ← نفس المكان", /المحطة الجاية/.test(await ps.textContent("main")));
  await clickAct(ps, "go");
  await (async function loop() {
    await waitScreen(ps, '[data-act="stNext"]'); var st = await answerStation(ps, saraPlan()); await ps.click('[data-act="stNext"]');
    await waitScreen(ps, '[data-act="go"]'); await clickAct(ps, "go"); if (st < 7) return loop();
  })();
  await waitScreen(ps, '[data-act="report"]');
  await ps.screenshot({ path: path.join(SHOTS, "mobile-closing.png") });
  await clickAct(ps, "report"); await ps.waitForURL(/report\.html/);
  var sr = await reportText(ps);
  ok("التقرير اتعرض", sr.length > 20, sr.length);
  ok("الواتساب ظاهر (فيه تنبيه في المنفردة)", !!(await ps.$('article.report a[href="https://wa.me/201024584537"]')) && sr.join(" ").indexOf("01024584537") !== -1);
  ok("مفيش «هنكمّل في الجلسة» في المنفردة", !/جلستك/.test(sr.join(" ")));
  ok("مفيش أي حاجة داخلية (أرقام/تنبيهات/استبدال)", !/(استبدال|تجمّد|انطفاء|ثقة (قوية|متوسطة|ضعيفة)|E \d|\bH\b|\bV\b)/.test(sr.join(" ")));
  ok("موبايل ٣٧٥: مفيش سكرول عرضي", await noHScroll(ps));
  await ps.waitForTimeout(700); await ps.screenshot({ path: path.join(SHOTS, "mobile-report-top.png") });
  await ps.evaluate(function () { var c = document.querySelector("article.report .dcard"); if (c) c.scrollIntoView({ block: "start" }); window.scrollBy(0, -120); });
  await ps.waitForTimeout(400); await ps.screenshot({ path: path.join(SHOTS, "mobile-report-cards.png") });
  await ps.evaluate(function () { document.querySelector("#rate").scrollIntoView({ block: "start" }); window.scrollBy(0, -80); });
  await ps.waitForTimeout(300); await ps.screenshot({ path: path.join(SHOTS, "mobile-report-rate.png") });
  await ps.click('#rate .dots5 button[data-v="4"]'); await ps.fill("#rateNote", "قريب جدًا"); await ps.click("#rateSave");
  await ps.waitForFunction(function () { return /وصلنا رأيك/.test(document.querySelector("#rateMsg").textContent); });
  dump = await api({ op: "_dump" }); sd = dump.db.maqyas_axes_v2.u_sara;
  ok("التقييم اتحفظ", sd.rating && sd.rating.value === 4 && sd.rating.note === "قريب جدًا");
  ok("الحالة خلص والنتيجة والنسخ متسجلة", sd.status === "خلص" && sd.result && sd.engineVersion === E.ENGINE_VERSION && sd.configVersion === C.configVersion && sd.textsVersion === TEXTS.version);
  // بعد ما خلّص: ما يقدرش يغيّر إجاباته
  var tamper = await ps.evaluate(function () { return firebase.firestore().collection("maqyas_axes_v2").doc("u_sara").update({ "status": "شغال" }).then(function () { return "ok"; }, function (e) { return e.code || e.message; }); });
  ok("بعد ما خلّص ما يقدرش يغيّر حالته أو إجاباته", tamper === "permission-denied", tamper);
  var steal = await ps.evaluate(function () { return firebase.firestore().collection("maqyas_axes_v2").doc("u_mahmoud").get().then(function () { return "ok"; }, function (e) { return e.code || e.message; }); });
  ok("ما يقدرش يقرا وثيقة عميل تاني", steal === "permission-denied", steal);
  var forge = await ps.evaluate(function () { return firebase.firestore().collection("maqyas_axes_v2").doc("u_rei").set({ userId: "u_rei", authUid: "A_sara", status: "شغال" }).then(function () { return "ok"; }, function (e) { return e.code || e.message; }); });
  ok("ما يقدرش يعمل وثيقة باسم عميل تاني", forge === "permission-denied", forge);
  var coach = await ps.evaluate(function () { return firebase.firestore().collection("maqyas_axes_v2").doc("u_sara").update({ override: { order: ["A", "V", "H"] } }).then(function () { return "ok"; }, function (e) { return e.code || e.message; }); });
  ok("العميل ما يقدرش يكتب تعديل الكوتش", coach === "permission-denied", coach);
  await ps.goto(BASE + "v2/app/"); await ps.waitForURL(/report\.html/);
  ok("فتح المقياس تاني بعد ما خلّص ← التقرير", /report\.html/.test(ps.url()));
  await cxs.close();

  console.log("\n٦. محمود (البصيرة): إجاباته ← نفس التقرير اللي في التاب");
  var cxm = await newCtx(browser, "u_mahmoud", true), pm = await cxm.newPage(); watch(pm, "u_mahmoud");
  await pm.goto(BASE + "v2/app/");
  await runAll(pm, mahmoudPlan(), { period: M.period.selected, impact: M.period.impact });
  var t7 = await pm.textContent("main");
  await clickAct(pm, "report"); await pm.waitForURL(/report\.html/);
  var mr = await reportText(pm);
  dump = await api({ op: "_dump" }); var md = dump.db.maqyas_axes_v2.u_mahmoud;
  ok("الصيغة المتكيفة اللي ظهرت هي اللي في ملف الاختبار (" + M.adaptiveShown + ")", md.adaptive.row === M.adaptiveShown, md.adaptive.row);
  var sample = SAMPLES.filter(function (s) { return s.key === "أ"; })[0];
  var want = sample.blocks.filter(function (b) { return b.t !== "pending" && b.t !== "btn" && b.t !== "rate"; }).map(function (b) { return b.text; });
  var same = JSON.stringify(want) === JSON.stringify(mr);
  ok("تقرير الموقع = تقرير التاب حرف بحرف (" + want.length + " سطر)", same, (function () { for (var i = 0; i < Math.max(want.length, mr.length); i++) if (want[i] !== mr[i]) return "أول اختلاف عند " + i + ": «" + (want[i] || "").slice(0, 60) + "» ≠ «" + (mr[i] || "").slice(0, 60) + "»"; })());
  ok("نسخة البصيرة: فيها الجلسة", /جلستك/.test(mr.join(" ")));
  var cards = await pm.$$eval("article.report .dcard", function (c) { return c.map(function (x) { return x.querySelector(".dc-name").textContent + "|" + x.querySelector(".dc-state").textContent; }); });
  ok("كروت باقي المساحات ظاهرة (" + cards.length + ") وفيها «حالها عندك»", cards.length === 6 && cards.every(function (c) { return c.indexOf("حالها عندك: ") !== -1; }), cards.join(" / "));
  ok("مفيش «الأبعاد التسعة في سطر» ولا الكلمات القديمة", !/الأبعاد التسعة في سطر|سايبه شوية|ماسك فيه زيادة|منطقة وسط|خريطة المحاور/.test(mr.join(" ")));
  ok("سؤال التقييم مكتوب مرة واحدة (في الخانة بس)", (await pm.$$eval("article.report", function (a) { return (a[0].textContent.match(/التقرير ده وصفك قد إيه؟/g) || []).length; })) === 1);
  var R2 = E.score(md, ITEMS, C);
  ok("النتيجة المحفوظة = حساب المحرك في Node", JSON.stringify(R2) === JSON.stringify(md.result));
  await cxm.close();

  console.log("\n٧. الأدمن: القايمة، والفلتر، والتقرير، وورقة الكوتش، والتعديل، وإعادة الحساب");
  var cxa = await newCtx(browser, null), pa = await cxa.newPage(); watch(pa, "admin");
  await pa.goto(BASE + "v2/app/admin.html"); await pa.waitForSelector("#ap");
  await pa.fill("#ap", "adminpw"); await pa.click("#ago"); await pa.waitForSelector("table.ax tbody tr[data-id]");
  var rows = await pa.$$eval("table.ax tbody tr[data-id]", function (t) { return t.map(function (r) { return r.getAttribute("data-id"); }); });
  ok("القايمة فيها العملاء (" + rows.join("، ") + ")", rows.indexOf("u_sara") !== -1 && rows.indexOf("u_mahmoud") !== -1);
  await pa.click('[data-f="follow"]');
  var fr = await pa.$$eval("table.ax tbody tr[data-id]", function (t) { return t.map(function (r) { return r.getAttribute("data-id"); }); });
  ok("فلتر «محتاج متابعة» = سارة بس (منفرد وعندها تنبيه)", fr.length === 1 && fr[0] === "u_sara", fr.join(","));
  await pa.click('[data-f="insight"]');
  fr = await pa.$$eval("table.ax tbody tr[data-id]", function (t) { return t.map(function (r) { return r.getAttribute("data-id"); }); });
  ok("فلتر البصيرة = محمود", fr.length === 1 && fr[0] === "u_mahmoud", fr.join(","));
  await pa.click('[data-f="all"]'); await pa.click('tr[data-id="u_mahmoud"]'); await pa.waitForSelector("#detail .report");
  var ar1 = await pa.$$eval("#detail .report h1, #detail .report h2, #detail .report h3, #detail .report h4, #detail .report p, #detail .report li", function (e) { return e.map(function (x) { return x.textContent.trim(); }); });
  ok("تقريره في الأدمن زي ما شافه بالظبط", JSON.stringify(ar1) === JSON.stringify(mr));
  await pa.click('[data-tab="coach"]'); await pa.waitForSelector("#detail .report");
  var ct = await pa.textContent("#detail .report");
  ok("ورقة الكوتش فيها الملخص والأرقام والتنبيهات ووقت المحطات", /الملخص/.test(ct) && /الأرقام/.test(ct) && /التنبيهات/.test(ct) && !/وقت كل محطة: مش متسجل/.test(ct));
  await pa.click('[data-tab="override"]'); await pa.waitForSelector("#oMain");
  await pa.selectOption("#oMain", "H"); await pa.selectOption("#oSup", "V"); await pa.selectOption("#oQuiet", "A");
  await pa.fill("#oWhy", "الجلسة بيّنت إن الحفظ هو الأقوى"); await pa.click("#oSave");
  await pa.waitForFunction(function () { return /اتحفظ/.test(document.querySelector("#sync").textContent); });
  dump = await api({ op: "_dump" }); md = dump.db.maqyas_axes_v2.u_mahmoud;
  ok("التعديل اتحفظ، والنتيجة بقت بيه، والأصلي محفوظ في التاريخ",
    md.override && md.result.final.source === "الكوتش" && md.result.final.main === "H" && md.result.ranking.main === "A" && md.resultHistory.length === 1 && md.resultHistory[0].result.final.source === "المحرك");
  var cxm2 = await newCtx(browser, "u_mahmoud", true), pm2 = await cxm2.newPage();
  await pm2.goto(BASE + "v2/app/report.html"); var mr2 = await reportText(pm2);
  ok("تقرير العميل اتولّد من جديد بالتعديل", JSON.stringify(mr2) !== JSON.stringify(mr) && /الحفظ/.test(mr2.slice(0, 30).join(" ")));
  await cxm2.close();
  await pa.click('[data-tab="report"]'); await pa.click("#recOne");
  await pa.waitForFunction(function () { return /مفيش تغيير|اتحسب/.test(document.querySelector("#sync").textContent); });
  ok("إعادة الحساب لعميل: نفس المحرك ← مفيش تغيير", /مفيش تغيير/.test(await pa.textContent("#sync")));
  // نغيّر نسخة النصوص المسجلة علشان إعادة الحساب للكل يبقى ليها شغل
  await api({ op: "set", col: "maqyas_axes_v2", id: "u_sara", data: { textsVersion: "0.9" }, merge: true, auth: { uid: "A_admin", email: "admin@fouad-academy.com" } });
  await pa.click("#reload"); await pa.waitForSelector("table.ax tbody tr[data-id]");
  pa.once("dialog", function (d) { d.accept(); });
  await pa.click("#recAll"); await pa.waitForFunction(function () { return /^خلص/.test(document.querySelector("#sync").textContent); });
  dump = await api({ op: "_dump" });
  ok("إعادة الحساب للكل: سارة اتحدّثت والقديم اتحفظ", dump.db.maqyas_axes_v2.u_sara.textsVersion === TEXTS.version && (dump.db.maqyas_axes_v2.u_sara.resultHistory || []).length === 1);
  var dl = await Promise.all([pa.waitForEvent("download"), pa.click("#dl")]);
  var json = JSON.parse(fs.readFileSync(await dl[0].path(), "utf8"));
  ok("تنزيل JSON فيه كل العملاء", json.rows.length === rows.length);
  await cxa.close();

  console.log("\n٨. صور الموبايل");
  var cxv = await newCtx(browser, "u_new", true, true);
  var pv = await cxv.newPage();
  await pv.addInitScript(function () { localStorage.setItem("__mockAuth", JSON.stringify({ uid: "A_new", email: "new@x.com" })); });
  await pv.goto(BASE + "v2/app/"); await waitScreen(pv, '[data-act="go"]');
  await pv.waitForTimeout(700); await pv.screenshot({ path: path.join(SHOTS, "mobile-welcome.png") });
  await clickAct(pv, "go"); await waitScreen(pv, '[data-act="period"]'); await pv.click('[data-act="period"][data-id="p8"]'); await clickAct(pv, "periodNext");
  await waitScreen(pv, '[data-act="go"]'); await clickAct(pv, "go"); await waitScreen(pv, '[data-act="stNext"]');
  await pv.waitForTimeout(700); await pv.screenshot({ path: path.join(SHOTS, "mobile-station1.png") });
  ok("موبايل: المحطة ١ من غير سكرول عرضي", await noHScroll(pv));
  await cxv.close();

  ok("مفيش أخطاء جافاسكريبت في الصفحات", errors.length === 0, errors.join(" | "));
  await browser.close();
  console.log("\n" + pass + " نجح · " + fail + " فشل");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
