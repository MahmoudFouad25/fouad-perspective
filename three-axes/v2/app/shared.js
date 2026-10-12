/* =====================================================================
   shared.js — اللي بتستعمله صفحات «مقياس مسارات الطاقة» (النسخة ٢) كلها:
   الإعدادات، وهوية العميل في المنصة، وتأكيد الدخول، والاشتراك، والتخزين.
   ---------------------------------------------------------------------
   الحماية (قرار محمود: «أ»):
   • وثيقة العميل في maqyas_axes_v2/{userId} (نفس رقم المنصة).
   • قواعد فايربيز بتسمح بيها بس لو حساب الدخول (Firebase Auth) إيميله هو نفس
     إيميل users/{userId}.personalInfo.email. يعني رقم العميل لوحده مش كفاية.
   • لو العميل داخل المنصة من غير حساب فايربيز (firestore-only)، الصفحة بتطلب منه
     يأكد دخوله بالباسورد مرة واحدة. ولو ما نفعش، رسالة واضحة وزرار واتساب.
   ===================================================================== */
(function (root) {
  "use strict";

  var CFG = {
    scaleName: "مقياس مسارات الطاقة",
    collection: "maqyas_axes_v2",
    oldCollection: "maqyas_axes_results",
    courses: { standalone: "three-axes", insight: "insight-out", legacy: ["reignite"] },
    admins: ["admin@fouad-academy.com"],          // لازم تبقى نفس القايمة اللي في firestore.rules
    contact: { text: "واتساب 01024584537", link: "https://wa.me/201024584537", label: "كلّمنا على واتساب", labelF: "كلّمينا على واتساب" },
    courseLink: "../../../insight-out/insight-out.html",
    loginPath: "../../../login.html",
    myCoursesPath: "../../../my-courses.html",
    assetsVersion: "2026-10-12c"                  // بيتغيّر مع كل رفع علشان المتصفح ما يمسكش نسخة قديمة
  };
  // الحقول اللي الكوتش بس اللي يكتبها (ولازم تبقى زي firestore.rules)
  var ADMIN_KEYS = ["override", "resultHistory", "adminUpdatedAt", "adminNote"];

  /* ───────── أدوات ───────── */
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[+d]; }); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function lower(s) { return String(s || "").trim().toLowerCase(); }
  function first(name) { return String(name || "").trim().split(/\s+/)[0] || ""; }

  /* ───────── صيغة الكلام (مذكر/مؤنث) ─────────
     العميل بيختارها أول مرة («نكلمك إزاي؟»)، وبتتحفظ في وثيقته وفي users/{userId}.personalInfo.address.
     النصوص المؤنثة نفسها في items.fem و texts.fem (جملة المذكر ← جملة المؤنث). */
  function addressOf(doc) {
    var a = doc && ((doc.personalInfo && doc.personalInfo.address) || doc.address);
    return a === "f" || a === "m" ? a : null;
  }
  function femmer(map, on) { return function (s) { return (on && s && map && map[s]) || s; }; }
  function saveAddressToUser(userId, v) {
    try { return fb().db.collection("users").doc(userId).update({ "personalInfo.address": v }).catch(function (e) { console.warn("[axv2] address→users", e && e.code); }); }
    catch (e) { return Promise.resolve(); }
  }

  var store = (function () {
    var mem = {}, can = false;
    try { localStorage.setItem("__axv2", "1"); localStorage.removeItem("__axv2"); can = true; } catch (e) {}
    return {
      get: function (k) { try { var v = can ? localStorage.getItem(k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } },
      set: function (k, v) { var s = JSON.stringify(v); try { if (can) localStorage.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } },
      del: function (k) { try { if (can) localStorage.removeItem(k); delete mem[k]; } catch (e) {} },
      raw: function (k) { try { return can ? localStorage.getItem(k) : null; } catch (e) { return null; } }
    };
  })();

  function loadJSON(path) {
    return fetch(path + (path.indexOf("?") === -1 ? "?" : "&") + "v=" + CFG.assetsVersion, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); });
  }

  /* ───────── فايربيز ───────── */
  function fb() {
    if (typeof firebase === "undefined") throw new Error("no-sdk");
    return { auth: firebase.auth(), db: firebase.firestore() };
  }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function docRef(userId) { return fb().db.collection(CFG.collection).doc(userId); }

  // أول حالة دخول فايربيز (أو null بعد المهلة)
  function waitAuth(ms) {
    return new Promise(function (resolve) {
      var done = false, t = setTimeout(function () { finish(fb().auth.currentUser || null); }, ms || 6000), unsub = null;
      function finish(u) { if (done) return; done = true; clearTimeout(t); try { unsub && unsub(); } catch (e) {} resolve(u); }
      try { unsub = fb().auth.onAuthStateChanged(function (u) { finish(u || null); }); } catch (e) { finish(null); }
    });
  }

  /* ───────── هوية العميل في المنصة (نفس طريقة المقاييس التانية) ───────── */
  function decryptSecure(key) {
    try {
      var enc = store.raw("_enc_" + key);
      if (!enc) return null;
      return JSON.parse(decodeURIComponent(atob(enc.split("").reverse().join(""))));
    } catch (e) { return null; }
  }
  function platformUserId() {
    var raw = store.raw("userId");
    return raw || decryptSecure("userId") || null;
  }

  function enrollment(userDoc) {
    var list = (userDoc && (userDoc.enrollments || userDoc.courses)) || [];
    var ids = list.map(function (e) { return e && (e.courseId || (e.courseInfo && e.courseInfo.id) || e.id); }).filter(Boolean);
    var has = function (id) { return ids.indexOf(id) !== -1; };
    return {
      mode: has(CFG.courses.insight) ? "insight" : has(CFG.courses.standalone) ? "standalone" : null,
      legacy: CFG.courses.legacy.some(has),
      ids: ids
    };
  }

  /* identify() ← واحدة من:
       {status:"ok", userId, userDoc, authUser, email, name, mode}
       {status:"login"}          مش داخل المنصة خالص
       {status:"confirm", ...}   داخل المنصة بس من غير حساب فايربيز (أو بحساب تاني) ← لازم يأكد بالباسورد
       {status:"not-enrolled", ...}
       {status:"no-profile", ...} حسابه في المنصة ناقصه الإيميل */
  function identify() {
    var F = fb();
    return waitAuth().then(function (authUser) {
      var uid = platformUserId();
      var find = uid ? F.db.collection("users").doc(uid).get().then(function (s) { return s.exists ? { id: s.id, data: s.data() } : null; })
        : authUser && authUser.email
          ? F.db.collection("users").where("personalInfo.email", "==", authUser.email).limit(1).get()
              .then(function (q) { return q.empty ? null : { id: q.docs[0].id, data: q.docs[0].data() }; })
          : Promise.resolve(null);
      return find.then(function (u) {
        if (!u) return { status: "login" };
        var email = (u.data.personalInfo && u.data.personalInfo.email) || "";
        var name = (u.data.personalInfo && u.data.personalInfo.name) || store.raw("userName") || "";
        var en = enrollment(u.data);
        var base = { userId: u.id, userDoc: u.data, email: email, name: name, mode: en.mode, legacy: en.legacy, address: addressOf(u.data) };
        if (!email) return Object.assign(base, { status: "no-profile" });
        if (!en.mode) return Object.assign(base, { status: "not-enrolled" });
        if (authUser && lower(authUser.email) === lower(email)) return Object.assign(base, { status: "ok", authUser: authUser });
        return Object.assign(base, { status: "confirm", otherAccount: authUser ? authUser.email : null });
      });
    });
  }

  // نفس منطق login.html في قراءة الباسورد المحفوظ
  function savedPassword(userDoc) {
    var t = userDoc && userDoc.auth && userDoc.auth.tempPassword;
    if (!t) return null;
    try { var d = atob(t); return /^[\x20-\x7E@.؀-ۿ]+$/.test(d) ? d : t; } catch (e) { return t; }
  }

  /* تأكيد الدخول بالباسورد. ← Promise<authUser> أو reject بـ {kind:"wrong"|"locked"|"network"|"help"} */
  function confirmLogin(ctx, password) {
    var F = fb(), email = ctx.email;
    var pre = F.auth.currentUser && lower(F.auth.currentUser.email) !== lower(email) ? F.auth.signOut() : Promise.resolve();
    return pre.then(function () {
      return F.auth.signInWithEmailAndPassword(email, password).then(function (c) { return c.user; });
    }).catch(function (e) {
      var code = (e && e.code) || "";
      if (code === "auth/too-many-requests") throw { kind: "locked" };
      if (code === "auth/network-request-failed") throw { kind: "network" };
      // مفيش حساب فايربيز، أو الباسورد مختلف عن اللي فيه. زي login.html بالظبط:
      // لو الباسورد هو المحفوظ في المنصة، نعمل حساب فايربيز بيه.
      if (savedPassword(ctx.userDoc) !== password) throw { kind: "wrong" };
      return F.auth.createUserWithEmailAndPassword(email, password).then(function (c) { return c.user; }).catch(function (e2) {
        var c2 = (e2 && e2.code) || "";
        if (c2 === "auth/network-request-failed") throw { kind: "network" };
        if (c2 === "auth/too-many-requests") throw { kind: "locked" };
        throw { kind: "help", code: c2 };   // الإيميل ليه حساب فايربيز بباسورد تاني ← محتاج محمود يظبطه
      });
    });
  }

  /* ───────── شاشات الهوية المشتركة ───────── */
  function gateHTML(ctx) {
    var C = CFG.contact, h = '<section class="card rise">', f = ctx.address === "f";
    function G(m, w) { return f ? w : m; }
    if (ctx.status === "login") {
      h += G("<h2>محتاج تدخل حسابك الأول</h2><p>ادخل حسابك في المنصة، وبعدها افتح المقياس من «كورساتي».</p>", "<h2>محتاجة تدخلي حسابك الأول</h2><p>ادخلي حسابك في المنصة، وبعدها افتحي المقياس من «كورساتي».</p>");
      h += '<a class="next" href="' + CFG.loginPath + '">' + G("ادخل حسابك", "ادخلي حسابك") + '</a>';
    } else if (ctx.status === "not-enrolled") {
      h += "<h2>المقياس ده مش مفتوح في حسابك</h2>";
      h += "<p>" + esc(CFG.scaleName) + G(" بيتفتح للي اشترك فيه لوحده، أو للي مشترك في رحلة «البصيرة الحكيمة». ولو إنت اشتركت فعلًا وشايف الرسالة دي، كلّمنا وهنظبطها.</p>", " بيتفتح للي اشترك فيه لوحده، أو للي مشترك في رحلة «البصيرة الحكيمة». ولو إنتي اشتركتي فعلًا وشايفة الرسالة دي، كلّمينا وهنظبطها.</p>");
      h += '<div class="row"><a class="next" href="' + CFG.courseLink + '">اعرف عن البصيرة الحكيمة</a>';
      h += '<a class="next ghost" href="' + C.link + '" target="_blank" rel="noopener">' + esc(G(C.label, C.labelF)) + "</a></div>";
    } else if (ctx.status === "no-profile") {
      h += G("<h2>حسابك محتاج تظبيط صغير</h2><p>مش لاقيين إيميل في بيانات حسابك، ومن غيره مش هنقدر نحفظ إجاباتك بأمان. كلّمنا وهنظبطه في دقايق.</p>", "<h2>حسابك محتاج تظبيط صغير</h2><p>مش لاقيين إيميل في بيانات حسابك، ومن غيره مش هنقدر نحفظ إجاباتك بأمان. كلّمينا وهنظبطه في دقايق.</p>");
      h += '<a class="next" href="' + C.link + '" target="_blank" rel="noopener">' + esc(G(C.label, C.labelF)) + "</a>";
    } else if (ctx.status === "confirm") {
      h += G("<h2>أكّد دخولك مرة واحدة</h2>", "<h2>أكّدي دخولك مرة واحدة</h2>");
      h += G("<p>إجابات المقياس ده خاصة بيك، فبنحفظها في مكان محمي ما يفتحهوش غيرك. علشان كده محتاجين تكتب باسورد حسابك في المنصة مرة واحدة بس.</p>", "<p>إجابات المقياس ده خاصة بيكي، فبنحفظها في مكان محمي ما يفتحهوش غيرك. علشان كده محتاجين تكتبي باسورد حسابك في المنصة مرة واحدة بس.</p>");
      if (ctx.otherAccount) h += '<p class="soft">المتصفح ده كان داخل بحساب تاني (' + esc(ctx.otherAccount) + ")، وهنخرج منه.</p>";
      h += '<label class="field"><span>الإيميل</span><input type="email" value="' + esc(ctx.email) + '" readonly dir="ltr"></label>';
      h += '<label class="field"><span>الباسورد</span><input id="axPw" type="password" autocomplete="current-password" dir="ltr"></label>';
      h += '<button type="button" class="next" id="axPwGo">' + G("ادخل", "ادخلي") + '</button>';
      h += '<p class="hint" id="axPwMsg" hidden></p>';
    }
    return h + "</section>";
  }
  // بيرسم شاشة التأكيد ويستنى لحد ما ينجح ← Promise<ctx بحالة ok>
  function runGate(main, ctx) {
    main.innerHTML = gateHTML(ctx);
    if (ctx.status !== "confirm") return new Promise(function () {});
    var f = ctx.address === "f";
    function G(m, w) { return f ? w : m; }
    return new Promise(function (resolve) {
      var btn = document.getElementById("axPwGo"), pw = document.getElementById("axPw"), msg = document.getElementById("axPwMsg");
      function say(html) { msg.innerHTML = html; msg.hidden = false; }
      function go() {
        if (!pw.value) { say(G("اكتب الباسورد.", "اكتبي الباسورد.")); return; }
        btn.setAttribute("aria-disabled", "true"); btn.textContent = "لحظة…";
        confirmLogin(ctx, pw.value).then(function (u) {
          ctx.status = "ok"; ctx.authUser = u; resolve(ctx);
        }).catch(function (e) {
          btn.removeAttribute("aria-disabled"); btn.textContent = G("ادخل", "ادخلي");
          var k = (e && e.kind) || "help";
          if (k === "wrong") say(G("الباسورد مش مظبوط. اكتبه زي ما بتدخل بيه المنصة بالظبط.", "الباسورد مش مظبوط. اكتبيه زي ما بتدخلي بيه المنصة بالظبط."));
          else if (k === "locked") say(G("محاولات كتير ورا بعض. استنى ٥ دقايق وجرّب تاني.", "محاولات كتير ورا بعض. استني ٥ دقايق وجرّبي تاني."));
          else if (k === "network") say(G("النت فاصل. اتأكد من الاتصال وجرّب تاني.", "النت فاصل. اتأكدي من الاتصال وجرّبي تاني."));
          else say(G('مش قادرين نأكد دخولك من هنا، والمشكلة عندنا مش عندك. كلّمنا وهنظبطها في دقايق: ', 'مش قادرين نأكد دخولك من هنا، والمشكلة عندنا مش عندك. كلّمينا وهنظبطها في دقايق: ') + '<a href="' + CFG.contact.link + '" target="_blank" rel="noopener">' + esc(CFG.contact.text) + "</a>");
        });
      }
      btn.addEventListener("click", go);
      pw.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      setTimeout(function () { try { pw.focus(); } catch (e) {} }, 50);
    });
  }

  root.AXV2 = {
    CFG: CFG, ADMIN_KEYS: ADMIN_KEYS,
    ar: ar, esc: esc, clone: clone, lower: lower, first: first, store: store, loadJSON: loadJSON,
    addressOf: addressOf, femmer: femmer, saveAddressToUser: saveAddressToUser,
    fb: fb, ts: ts, docRef: docRef, waitAuth: waitAuth,
    platformUserId: platformUserId, enrollment: enrollment, identify: identify, confirmLogin: confirmLogin, runGate: runGate
  };
})(typeof self !== "undefined" ? self : this);
