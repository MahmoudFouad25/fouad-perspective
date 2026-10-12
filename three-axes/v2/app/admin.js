/* =====================================================================
   admin.js — صفحة الأدمن لـ«مقياس مسارات الطاقة» (النسخة ٢)
   • قايمة العملاء، وفلتر، ولكل عميل: تقريره زي ما شافه، وورقة الكوتش، وتعديل الكوتش.
   • إعادة الحساب بالمحرك الحالي (لعميل أو للكل). النتيجة القديمة بتتحفظ في resultHistory.
   • تنزيل كل البيانات JSON. ومفيش مسح من هنا (القواعد بتمنعه أصلًا).
   ===================================================================== */
(function () {
  "use strict";
  var X = window.AXV2, E = window.AxesV2Engine, C = window.AXES_V2_CONFIG, RP = window.AxesV2Report, CO = window.AxesV2Coach;
  var esc = X.esc, ar = X.ar;
  var NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };
  var ITEMS = null, TEXTS = null, CT = null, ME = null;
  var ROWS = [], FILTER = "all", SEL = null, TAB = "report", main = null;
  function $(s) { return document.querySelector(s); }
  function say(t, cls) { var d = $("#sync"); d.className = "sync " + (cls || ""); d.textContent = t || ""; }

  /* ───────── أدوات ───────── */
  function ms(v) { if (!v) return null; if (typeof v === "number") return v; if (v.toMillis) return v.toMillis(); if (v.seconds) return v.seconds * 1000; return null; }
  function day(v) { var t = ms(v); if (!t) return "—"; var d = new Date(t); return ar(d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear()); }
  function plain(o) {   // للتنزيل: Timestamp ← ISO
    if (o == null || typeof o !== "object") return o;
    if (o.toDate && typeof o.toDate === "function") return o.toDate().toISOString();
    if (Array.isArray(o)) return o.map(plain);
    var r = {}; Object.keys(o).forEach(function (k) { r[k] = plain(o[k]); }); return r;
  }
  function follow(d) {
    var R = d.result; if (!R || d.purchase !== "standalone") return false;
    return !!(R.alerts && (R.alerts.freeze.on || R.alerts.depletion.on || R.alerts.mood.on));
  }
  function orderOf(d) {
    var R = d.result; if (!R) return "—";
    var o = [R.final.main, R.final.supporting, R.final.suppressed || R.ranking.order[2]].filter(Boolean).map(function (a) { return NAME[a]; }).join(" ← ");
    return o + (R.final.source === "الكوتش" ? " ✎" : "");
  }
  function summary(R) {
    return { order: [R.final.main, R.final.supporting, R.final.suppressed || R.ranking.order[2]], confidence: R.ranking.confidence,
             suppressedStatus: R.suppressed.status, alerts: ["freeze", "depletion", "mood", "period"].filter(function (k) { return R.alerts[k].on; }) };
  }

  /* ───────── الدخول ───────── */
  function loginHTML(msg) {
    return '<section class="card rise" style="max-width:420px;margin:40px auto"><h2>دخول الأدمن</h2>' +
      '<label class="field"><span>الإيميل</span><input id="ae" type="email" dir="ltr" value="' + esc(X.CFG.admins[0]) + '"></label>' +
      '<label class="field"><span>الباسورد</span><input id="ap" type="password" dir="ltr"></label>' +
      '<button class="next" id="ago">ادخل</button><p class="hint" id="amsg"' + (msg ? "" : " hidden") + ">" + esc(msg || "") + "</p></section>";
  }
  function showLogin(msg) {
    main.innerHTML = loginHTML(msg);
    function go() {
      X.fb().auth.signInWithEmailAndPassword($("#ae").value.trim(), $("#ap").value).then(start).catch(function (e) {
        var m = $("#amsg"); m.hidden = false; m.textContent = "ما نفعش: " + ((e && e.code) || e);
      });
    }
    $("#ago").addEventListener("click", go);
    $("#ap").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  }

  /* ───────── القايمة ───────── */
  function load() {
    say("بيحمّل…");
    return X.fb().db.collection(X.CFG.collection).get().then(function (q) {
      ROWS = q.docs.map(function (d) { var x = d.data(); x._id = d.id; return x; })
        .sort(function (a, b) { return (ms(b.startedAt) || 0) - (ms(a.startedAt) || 0); });
      say(ar(ROWS.length) + " عميل", "ok");
      render();
    }).catch(function (e) {
      say("", "");
      main.innerHTML = '<section class="card"><h2>قواعد الأمان رافضة القراءة</h2><p>اتأكد إن مقطع maqyas_axes_v2 اتلصق في Firestore Rules واتنشر، وإن الإيميل اللي داخل بيه في قايمة الأدمن.</p><p class="soft">' + esc((e && e.code) || e) + "</p></section>";
    });
  }
  function visible() {
    return ROWS.filter(function (d) {
      if (FILTER === "follow") return follow(d);
      if (FILTER === "insight") return d.purchase === "insight";
      if (FILTER === "standalone") return d.purchase === "standalone";
      return true;
    });
  }
  function render() {
    var F = [["all", "الكل"], ["follow", "محتاج متابعة"], ["insight", "البصيرة"], ["standalone", "منفرد"]];
    var h = '<div class="tabs">';
    F.forEach(function (f) { h += '<button class="mini' + (FILTER === f[0] ? " on" : "") + '" data-f="' + f[0] + '">' + f[1] + (f[0] === "follow" ? " (" + ar(ROWS.filter(follow).length) + ")" : "") + "</button>"; });
    h += '<span style="flex:1"></span><button class="mini" id="recAll">إعادة الحساب للكل</button><button class="mini" id="dl">نزّل JSON</button><button class="mini" id="reload">تحديث</button></div>';
    h += '<div class="tbl-wrap"><table class="ax"><thead><tr><th>الاسم</th><th>البداية</th><th>الشراء</th><th>الصيغة</th><th>الحالة</th><th>الترتيب</th><th>متابعة</th><th>التقييم</th></tr></thead><tbody>';
    var list = visible();
    if (!list.length) h += '<tr><td colspan="8" class="soft">مفيش عملاء هنا لسه.</td></tr>';
    list.forEach(function (d) {
      h += '<tr data-id="' + esc(d._id) + '"' + (SEL === d._id ? ' class="sel"' : "") + "><td>" + esc(d.name || d._id) + '<div class="soft" dir="ltr">' + esc(d.email || "") + "</div></td>";
      h += "<td>" + day(d.startedAt) + "</td>";
      h += '<td><span class="tag' + (d.purchase === "insight" ? " ins" : "") + '">' + (d.purchase === "insight" ? "البصيرة" : "منفرد") + "</span></td>";
      h += "<td>" + (d.address === "f" ? "مؤنث" : d.address === "m" ? "مذكر" : '<span class="soft">ما اختارش</span>') + "</td>";
      h += '<td><span class="tag' + (d.status === "خلص" ? " done" : "") + '">' + esc(d.status || "—") + "</span></td>";
      h += "<td>" + esc(orderOf(d)) + "</td>";
      h += "<td>" + (follow(d) ? '<span class="tag follow">⚑ محتاج متابعة</span>' : "") + "</td>";
      h += "<td>" + (d.rating ? ar(d.rating.value) + " من ٥" + (d.rating.note ? " ✉" : "") : "—") + "</td></tr>";
    });
    h += '</tbody></table></div><div id="detail" class="panel"></div>';
    main.innerHTML = h;
    if (SEL) detail();
  }

  /* ───────── العميل ───────── */
  function cur() { return ROWS.filter(function (d) { return d._id === SEL; })[0]; }
  function blocksHTML(B) {
    var h = "", inList = false;
    B.forEach(function (b) {
      if (b.t !== "li" && inList) { h += "</ul>"; inList = false; }
      if (b.t === "title") h += '<h1 class="rp-title">' + esc(b.text) + "</h1>";
      else if (/^h[234]$/.test(b.t)) h += "<" + b.t + ">" + esc(b.text) + "</" + b.t + ">";
      else if (b.t === "li") { if (!inList) { h += "<ul>"; inList = true; } h += "<li>" + esc(b.text) + "</li>"; }
      else if (b.t === "btn") h += '<p class="rp-btn"><a class="next wa" href="' + esc(b.href) + '" target="_blank" rel="noopener">' + esc(b.text) + "</a></p>";
      else if (b.t === "card") h += '<div class="dcard"><div class="dc-name">' + esc(b.name) + '</div><div class="dc-line">' + esc(b.line) + '</div><div class="dc-state">' + (b.label ? '<span class="dc-lbl">' + esc(b.label) + '</span>' : '') + esc(b.state) + '</div><p>' + esc(b.text) + "</p></div>";
      else if (b.t === "rate") h += '<div class="soft">' + esc(b.text) + " (خانة التقييم تحت التقرير)</div>";
      else if (b.t !== "pending") h += "<p>" + esc(b.text) + "</p>";
    });
    return h + (inList ? "</ul>" : "");
  }
  function detail() {
    var d = cur(), box = $("#detail"); if (!d || !box) return;
    var h = '<div class="card rise"><h2>' + esc(d.name || d._id) + ' <span class="soft">· ' + esc(d._id) + "</span></h2>";
    h += '<div class="tabs">';
    [["report", "تقريره زي ما شافه"], ["coach", "ورقة الكوتش"], ["override", "تعديل الكوتش"], ["data", "البيانات"]].forEach(function (t) {
      h += '<button class="mini' + (TAB === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
    });
    h += '<span style="flex:1"></span><button class="mini" id="recOne"' + (d.status === "خلص" ? "" : " disabled") + ">إعادة الحساب</button></div>";
    if (d.status !== "خلص" || !d.result) {
      h += '<p class="soft">لسه ما خلّصش. وصل لـ: ' + esc(d.screen || "—") + "، وآخر حفظ: " + day(d.updatedAt) + ".</p>";
      if (TAB === "data") h += '<pre class="soft" dir="ltr" style="white-space:pre-wrap">' + esc(JSON.stringify(plain(d), null, 1)) + "</pre>";
      box.innerHTML = h + "</div>"; return;
    }
    var A = E.normalize(d);
    if (TAB === "report") {
      var fa = d.address === "f";
      var rep = RP.renderReport(d.result, A, ITEMS, TEXTS, { mode: d.purchase, name: X.first(d.name), contact: X.CFG.contact.text, contactLink: X.CFG.contact.link, contactLabel: fa ? X.CFG.contact.labelF : X.CFG.contact.label, address: d.address || "m" });
      h += '<p class="soft">النسخة: ' + (d.purchase === "insight" ? "البصيرة الحكيمة" : "المنفردة") + " · الصيغة: " + (fa ? "مؤنث" : d.address === "m" ? "مذكر" : "مذكر (ما اختارش)") + " · نصوص " + esc(TEXTS.version) + " · " + ar(rep.meta.words) + " كلمة" + (rep.meta.problems.length ? " · مشاكل: " + esc(rep.meta.problems.join(" | ")) : "") + "</p>";
      h += '<div class="report">' + blocksHTML(rep.blocks) + "</div>";
    } else if (TAB === "coach") {
      h += '<div class="report">' + blocksHTML(CO.renderCoach(d.result, A, ITEMS, CT, { mode: d.purchase, name: d.name, rating: d.rating || null, address: d.address || "m" })) + "</div>";
    } else if (TAB === "override") {
      var o = (d.override && d.override.order) || [d.result.final.main, d.result.final.supporting, d.result.final.suppressed || d.result.ranking.order[2]];
      h += "<p>الحساب الأصلي: " + d.result.ranking.order.map(function (a) { return NAME[a]; }).join(" ← ") + " (ثقة " + esc(d.result.ranking.confidence) + "، والهادي " + esc(d.result.suppressed.status) + ").</p>";
      if (d.override) h += '<p class="soft">متعدّل حاليًا: ' + d.override.order.map(function (a) { return NAME[a]; }).join(" ← ") + " · «" + esc(d.override.reason || "") + "» · " + day(d.override.at) + "</p>";
      [["oMain", "الأقوى"], ["oSup", "المساند"], ["oQuiet", "الهادي"]].forEach(function (f, i) {
        h += '<label class="field"><span>' + f[1] + '</span><select id="' + f[0] + '">';
        ["H", "V", "A"].forEach(function (a) { h += '<option value="' + a + '"' + (o[i] === a ? " selected" : "") + ">" + NAME[a] + "</option>"; });
        h += "</select></label>";
      });
      h += '<label class="field"><span>السبب (لازم)</span><textarea id="oWhy" rows="3"></textarea></label>';
      h += '<div class="row"><button class="next" id="oSave">احفظ التعديل والتقرير يتولّد بيه</button>' + (d.override ? '<button class="next ghost" id="oClear">شيل التعديل</button>' : "") + "</div>";
      h += '<p class="hint" id="oMsg" hidden></p>';
      if ((d.resultHistory || []).length) {
        h += "<h3>النتايج القديمة المحفوظة</h3><ul>";
        d.resultHistory.forEach(function (x) { h += "<li>" + day(x.at) + " · " + esc(x.why) + " · " + esc((x.result && x.result.engineVersion) || "") + " · " + (x.result ? x.result.ranking.order.map(function (a) { return NAME[a]; }).join(" ← ") : "") + (x.reason ? " · «" + esc(x.reason) + "»" : "") + "</li>"; });
        h += "</ul>";
      }
    } else {
      h += '<pre class="soft" dir="ltr" style="white-space:pre-wrap;max-height:60vh;overflow:auto">' + esc(JSON.stringify(plain(d), null, 1)) + "</pre>";
    }
    box.innerHTML = h + "</div>";
  }

  /* ───────── الكتابة (حقول الأدمن بس) ───────── */
  function writeResult(d, R, why, extra) {
    var FV = firebase.firestore.FieldValue, at = Date.now();
    var patch = {
      result: X.clone(R), summary: summary(R), engineVersion: R.engineVersion, configVersion: R.configVersion, textsVersion: TEXTS.version,
      resultHistory: FV.arrayUnion({ at: at, why: why, by: ME.email, reason: (extra && extra.reason) || "", result: X.clone(d.result) }),
      adminUpdatedAt: X.ts()
    };
    if (extra && "override" in extra) patch.override = extra.override === null ? FV.delete() : extra.override;
    return X.docRef(d._id).update(patch).then(function () {
      d.result = X.clone(R); d.summary = patch.summary; d.engineVersion = R.engineVersion; d.textsVersion = TEXTS.version;
      d.resultHistory = (d.resultHistory || []).concat([{ at: at, why: why, by: ME.email, reason: (extra && extra.reason) || "", result: null }]);
      if (extra && "override" in extra) { if (extra.override === null) delete d.override; else d.override = extra.override; }
    });
  }
  function recompute(d) {
    var R = E.score(d, ITEMS, C, d.override ? { override: d.override } : {});
    var same = JSON.stringify(R) === JSON.stringify(d.result) && d.textsVersion === TEXTS.version;
    return same ? Promise.resolve(false) : writeResult(d, R, "إعادة الحساب").then(function () { return true; });
  }

  /* ───────── الأحداث ───────── */
  function onClick(e) {
    var t = e.target;
    var f = t.closest("[data-f]"); if (f) { FILTER = f.getAttribute("data-f"); return render(); }
    var tb = t.closest("[data-tab]"); if (tb) { TAB = tb.getAttribute("data-tab"); return detail(); }
    var tr = t.closest("tr[data-id]"); if (tr) { SEL = tr.getAttribute("data-id"); TAB = "report"; render(); var dd = $("#detail"); if (dd) dd.scrollIntoView({ behavior: "smooth" }); return; }
    if (t.id === "reload") return load();
    if (t.id === "dl") {
      var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), collection: X.CFG.collection, filter: FILTER, rows: visible().map(plain) }, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "maqyas_axes_v2-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
      return;
    }
    if (t.id === "recOne") {
      t.disabled = true;
      return recompute(cur()).then(function (ch) { say(ch ? "اتحسب من جديد، والقديم اتحفظ" : "النتيجة زي ما هي، مفيش تغيير", "ok"); render(); })
        .catch(function (er) { say("ما اتحفظش: " + ((er && er.code) || er), "err"); t.disabled = false; });
    }
    if (t.id === "recAll") {
      if (!confirm("إعادة الحساب لكل اللي خلّصوا بالمحرك الحالي؟ النتايج القديمة هتتحفظ.")) return;
      var done = ROWS.filter(function (d) { return d.status === "خلص" && d.result; }), n = 0, ch = 0;
      return done.reduce(function (p, d) { return p.then(function () { return recompute(d).then(function (c) { n++; if (c) ch++; say(ar(n) + " من " + ar(done.length)); }); }); }, Promise.resolve())
        .then(function () { say("خلص: " + ar(ch) + " اتغيّروا من " + ar(done.length), "ok"); render(); })
        .catch(function (er) { say("وقف عند " + ar(n) + ": " + ((er && er.code) || er), "err"); });
    }
    if (t.id === "oSave" || t.id === "oClear") {
      var d = cur(), msg = $("#oMsg");
      function bad(m) { msg.hidden = false; msg.textContent = m; }
      var extra;
      if (t.id === "oSave") {
        var order = [$("#oMain").value, $("#oSup").value, $("#oQuiet").value], why = ($("#oWhy").value || "").trim();
        if (order[0] === order[1] || order[1] === order[2] || order[0] === order[2]) return bad("كل مسار يتختار مرة واحدة.");
        if (!why) return bad("اكتب السبب.");
        extra = { override: { order: order, reason: why, by: ME.email, at: Date.now() }, reason: why };
      } else extra = { override: null, reason: "شيل تعديل الكوتش" };
      var R = E.score(d, ITEMS, C, extra.override ? { override: extra.override } : {});
      t.disabled = true;
      return writeResult(d, R, t.id === "oSave" ? "تعديل الكوتش" : "شيل التعديل", extra)
        .then(function () { say("اتحفظ، والتقرير بقى بالتعديل", "ok"); TAB = "report"; render(); })
        .catch(function (er) { t.disabled = false; bad("ما اتحفظش: " + ((er && er.code) || er)); });
    }
  }

  function start() {
    var u = X.fb().auth.currentUser;
    if (!u || X.CFG.admins.indexOf(X.lower(u.email)) === -1) return showLogin(u ? "الحساب ده مش أدمن: " + u.email : "");
    ME = u; return load();
  }
  function boot() {
    main = $("#main");
    document.addEventListener("click", onClick);
    Promise.all([X.loadJSON("../engine/items.json"), X.loadJSON("../report/texts.json"), X.loadJSON("../report/coach_texts.json"), X.waitAuth()])
      .then(function (r) { ITEMS = r[0]; TEXTS = r[1]; CT = r[2]; start(); })
      .catch(function (e) { main.innerHTML = '<section class="card"><h2>الصفحة ما اتحمّلتش</h2><p class="soft">' + esc((e && e.message) || e) + "</p></section>"; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
