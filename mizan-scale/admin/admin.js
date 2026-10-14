/* =====================================================================
   admin.js — صفحة الأدمن لـ«ميزان المتطوع»
   ---------------------------------------------------------------------
   • الدخول: حساب الأدمن في Firebase Authentication (admin@fouad-academy.com). نفس isAdmin() في القواعد.
   • القايمة: كل متطوع وحالته (ما بدأش · وصل لمحطة كام · خلّص) وآخر حفظ، وعلامة ⚑ لو المحرك طلّع تنبيه.
   • الإضافة: متطوع واحد، أو قايمة كاملة بالّصق (سطر لكل متطوع: الاسم، المحافظة، الدور).
     الكود بيتعمل بـ MZS.makeCode() (عمره ما يبدأ بـ TEST)، وبيتأكد إنه مش موجود قبل ما يتكتب.
   • لكل متطوع: نسخ الرابط · رابط جديد (بيقفل القديم فورًا) · التقرير زي ما شافه · ورقة الكوتش · البيانات.
   • الأرقام المجمّعة، وتنزيل Excel وJSON.
   • العلامات معلومة بس: مفيش أي حاجة بتتعمل لوحدها، ومفيش أي رسالة بتروح للمتطوع من هنا.
   • مفيش مسح من هنا.
   ===================================================================== */
(function () {
  "use strict";
  var X = window.MZS, E = window.MizanScaleEngine, CONF = window.MIZAN_SCALE_CONFIG, RP = window.MizanScaleReport, CO = window.MizanScaleCoach;
  var esc = X.esc, ar = X.ar;
  var ADMINS = ["admin@fouad-academy.com"];   // لازم تبقى نفس isAdmin() في firestore.rules
  var NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };
  var OUT = { like_life: "شبه حياتك", wakes_quiet: "بيصحّي الهادي", grows_main: "بيكبّر الأقوى", other_face: "وش تاني" };
  var DIMS = ["H1", "H2", "H3", "V1", "V2", "V3", "A1", "A2", "A3"];
  var ITEMS = null, TEXTS = null, CT = null, db = null, auth = null;
  var ROWS = [], VIEW = { filter: "all", q: "", gov: "", sel: null, tab: "report" }, main = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function say(t, cls) { var d = $("#sync"); d.className = "sync " + (cls || ""); d.textContent = t || ""; }
  function appURL(code) { return new URL("../app/?c=" + code, location.href).href; }

  /* ───────── أدوات ───────── */
  function ms(v) { if (!v) return null; if (typeof v === "number") return v; if (v.toMillis) return v.toMillis(); if (v.seconds) return v.seconds * 1000; return null; }
  function when(v) {
    var t = ms(v); if (!t) return "—";
    var d = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return ar(d.getDate() + "/" + (d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()));
  }
  function plain(o) {
    if (o == null || typeof o !== "object") return o;
    if (typeof o.toDate === "function") return o.toDate().toISOString();
    if (Array.isArray(o)) return o.map(plain);
    var r = {}; Object.keys(o).forEach(function (k) { r[k] = plain(o[k]); }); return r;
  }
  function optText(q, id, fem) {
    var o = (((ITEMS.client.start[q] || {}).options) || []).filter(function (x) { return x.id === id; })[0];
    return o ? ((fem && ITEMS.fem[o.text]) || o.text) : "";
  }
  // الحالة من الوثيقة نفسها
  function stateOf(d) {
    if (d.revoked) return { key: "revoked", label: "اتقفل" + (d.replacedBy ? " ← " + d.replacedBy : "") };
    if (d.status === "خلص" && d.result) return { key: "done", label: "خلّص" };
    // السيرفر بيعرف آخر حاجة اتبعتت: «t٢» = خلّص المحطة ٢ (والمحطة ٣ لسه ما اتبعتتش)
    var m = /^([st])(\d)$/.exec(d.screen || "");
    if (m) return { key: "going", label: m[1] === "t" ? "بدأ · خلّص المحطة " + ar(+m[2]) + " من ٩" : "بدأ · في المحطة " + ar(+m[2]) + " من ٩" };
    if (d.screen && d.screen !== "address") return { key: "going", label: "بدأ · قبل المحطات" };
    if (d.st || d.address) return { key: "going", label: "بدأ" };
    return { key: "new", label: "ما بدأش" };
  }
  function flags(d) {
    var R = d.result, out = [];
    if (!R) return out;
    var nm = { depletion: "انطفاء", mood: "تقلّب المزاج", freeze: "تجمّد" };
    Object.keys(nm).forEach(function (k) { if (R.alerts && R.alerts[k] && R.alerts[k].on) out.push(nm[k]); });
    if (R.volunteer && R.volunteer.now && R.volunteer.now.coachFlag) out.push("«إنت فين»: " + ar(R.volunteer.now.id.slice(1)));
    return out;
  }
  function order(arr) { return (arr || []).filter(Boolean).map(function (a) { return NAME[a]; }).join(" ← ") || "—"; }

  /* ───────── الدخول ───────── */
  function showLogin(msg) {
    main.innerHTML = '<section class="card rise" style="max-width:420px;margin:40px auto"><h2>دخول الأدمن</h2>' +
      '<label class="field"><span>الإيميل</span><input id="ae" type="email" dir="ltr" value="' + esc(ADMINS[0]) + '"></label>' +
      '<label class="field"><span>الباسورد</span><input id="ap" type="password" dir="ltr"></label>' +
      '<button class="next" id="ago">ادخل</button><p class="hint" id="amsg"' + (msg ? "" : " hidden") + ">" + esc(msg || "") + "</p></section>";
    function go() {
      var b = $("#ago"); b.setAttribute("aria-disabled", "true");
      auth.signInWithEmailAndPassword($("#ae").value.trim(), $("#ap").value).catch(function (e) {
        b.removeAttribute("aria-disabled");
        var m = $("#amsg"); m.hidden = false;
        var c = (e && e.code) || "";
        m.textContent = /wrong-password|invalid-credential|invalid-login|user-not-found/.test(c) ? "الإيميل أو الباسورد غلط." :
                        /too-many/.test(c) ? "محاولات كتير. استنى دقيقة وجرّب تاني." :
                        /network/.test(c) ? "النت فاصل." : "ما نفعش (" + c + ").";
      });
    }
    $("#ago").addEventListener("click", go);
    $("#ap").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  }

  /* ───────── القايمة ───────── */
  function load() {
    say("بيحمّل…");
    return X.withTimeout(db.collection(X.CFG.collection).get(), 20000).then(function (q) {
      ROWS = q.docs.map(function (s) { var d = s.data(); d.__id = s.id; return d; });
      ROWS.sort(function (a, b) { return (ms(b.updatedAt) || b.updatedAtMs || ms(b.createdAt) || 0) - (ms(a.updatedAt) || a.updatedAtMs || ms(a.createdAt) || 0); });
      say("اتحمّل · " + ar(ROWS.length), "ok");
      render();
    }).catch(function (e) {
      var c = (e && e.code) || "";
      say("", "");
      main.innerHTML = '<section class="card"><h2>القايمة ما اتحمّلتش</h2><p>' +
        (c === "permission-denied" ? "القواعد رافضة. غالبًا مقطع «ميزان المتطوع» لسه ما اتنشرش في Firestore ← Rules، أو الإيميل ده مش أدمن." :
         "السيرفر مش واصل (" + esc(c || String(e)) + ").") + '</p><button class="next" id="retry">جرّب تاني</button></section>';
      $("#retry").addEventListener("click", load);
    });
  }
  function visible() {
    var q = VIEW.q.trim();
    return ROWS.filter(function (d) {
      var s = stateOf(d).key;
      if (VIEW.filter === "flag" ? !flags(d).length : VIEW.filter !== "all" && VIEW.filter !== s) return false;
      if (VIEW.filter !== "revoked" && s === "revoked") return false;   // الروابط المقفولة في فلترها بس (والعدد في «الكل» من غيرها)
      if (VIEW.gov && (d.gov || "") !== VIEW.gov) return false;
      if (q && ((d.name || "") + " " + d.__id + " " + (d.gov || "") + " " + (d.team || "")).indexOf(q) === -1) return false;
      return true;
    });
  }
  function count(key) {
    return ROWS.filter(function (d) { var s = stateOf(d).key; return key === "all" ? s !== "revoked" : key === "flag" ? flags(d).length && s !== "revoked" : s === key; }).length;
  }
  function render() {
    var govs = {}; ROWS.forEach(function (d) { if (d.gov) govs[d.gov] = 1; });
    var h = '<div class="ad-bar">';
    [["all", "الكل"], ["new", "ما بدأش"], ["going", "بدأ"], ["done", "خلّص"], ["flag", "⚑ عليهم علامة"], ["revoked", "روابط اتقفلت"]].forEach(function (f) {
      h += '<button class="mini' + (VIEW.filter === f[0] ? " on" : "") + '" data-act="filter" data-v="' + f[0] + '">' + f[1] + " (" + ar(count(f[0])) + ")</button>";
    });
    h += '<select id="gov" class="mini"><option value="">كل المحافظات</option>' + Object.keys(govs).sort().map(function (g) { return '<option' + (VIEW.gov === g ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + "</select>";
    h += '<input id="q" class="mini" placeholder="دوّر بالاسم أو الكود" value="' + esc(VIEW.q) + '">';
    h += '<span class="grow"></span><button class="mini" data-act="add">+ ضيف متطوعين</button><button class="mini" data-act="stats">الأرقام المجمّعة</button>';
    h += '<button class="mini" data-act="xlsx">تنزيل Excel</button><button class="mini" data-act="json">تنزيل JSON</button><button class="mini" data-act="reload">تحديث</button></div>';
    h += '<div id="panel"></div>';
    var rows = visible();
    h += '<div class="tbl-wrap"><table class="ax"><thead><tr><th>الاسم</th><th>المحافظة</th><th>الدور</th><th>الكود</th><th>الحالة</th><th>آخر حفظ</th><th>الترتيب في الحياة</th><th>التطوع</th><th></th></tr></thead><tbody>';
    if (!rows.length) h += '<tr><td colspan="9" class="soft">مفيش حد هنا.</td></tr>';
    rows.forEach(function (d) {
      var st = stateOf(d), fl = flags(d), R = d.result, sm = d.summary || {};
      h += '<tr data-id="' + esc(d.__id) + '" class="' + (VIEW.sel === d.__id ? "sel" : "") + (st.key === "revoked" ? " off" : "") + '">';
      h += "<td>" + esc(d.name || "—") + (fl.length ? ' <span class="tag follow" title="' + esc(fl.join(" · ")) + '">⚑</span>' : "") + "</td>";
      h += "<td>" + esc(d.gov || "—") + "</td><td>" + esc(d.team || (d.client && optText("role", d.client.role)) || "—") + "</td>";
      h += '<td dir="ltr" class="code">' + esc(d.__id) + "</td>";
      h += '<td><span class="tag ' + (st.key === "done" ? "done" : "") + '">' + esc(st.label) + "</span></td>";
      h += "<td>" + when(d.updatedAt || d.updatedAtMs) + "</td>";
      h += "<td>" + (R ? order(sm.order || [R.final.main, R.final.supporting, R.final.suppressed]) : "—") + "</td>";
      h += "<td>" + (R && R.volunteer ? R.volunteer.outcomes.map(function (o) { return OUT[o] || o; }).join(" + ") : "—") + "</td>";
      h += '<td class="acts">' + (st.key === "revoked" ? "" : '<button class="mini" data-act="copy" data-id="' + esc(d.__id) + '">انسخ الرابط</button>') + "</td></tr>";
    });
    h += "</tbody></table></div>";
    if (VIEW.sel) h += '<div id="detail"></div>';
    main.innerHTML = h;
    if (VIEW.sel) renderDetail();
    $("#gov").addEventListener("change", function () { VIEW.gov = this.value; render(); });
    var qi = $("#q"); qi.addEventListener("input", function () { VIEW.q = this.value; var p = this.selectionStart; render(); var n = $("#q"); n.focus(); n.setSelectionRange(p, p); });
  }

  /* ───────── تفاصيل متطوع ───────── */
  function byId(id) { return ROWS.filter(function (d) { return d.__id === id; })[0]; }
  function blocksHTML(B) {
    var h = "", inList = false;
    B.forEach(function (b) {
      if (b.t === "pending" || b.t === "rate") return;
      if (b.t !== "li" && inList) { h += "</ul>"; inList = false; }
      if (b.t === "title") h += '<h1 class="rp-title">' + esc(b.text) + "</h1>";
      else if (/^h[234]$/.test(b.t)) h += "<" + b.t + ">" + esc(b.text) + "</" + b.t + ">";
      else if (b.t === "li") { if (!inList) { h += "<ul>"; inList = true; } h += "<li>" + esc(b.text) + "</li>"; }
      else if (b.t === "card") h += '<div class="dcard"><div class="dc-name">' + esc(b.name) + '</div><div class="dc-line">' + esc(b.line) + '</div><div class="dc-state">' + (b.label ? '<span class="dc-lbl">' + esc(b.label) + "</span>" : "") + esc(b.state) + "</div><p>" + esc(b.text) + "</p></div>";
      else h += "<p>" + esc(b.text) + "</p>";
    });
    return h + (inList ? "</ul>" : "");
  }
  function renderDetail() {
    var d = byId(VIEW.sel), box = $("#detail"); if (!d || !box) return;
    var st = stateOf(d), fl = flags(d), first = X.first(d.name || "");
    var h = '<section class="card ad-detail"><div class="ad-head"><h2>' + esc(d.name || "—") + ' <span class="code" dir="ltr">' + esc(d.__id) + "</span></h2>";
    h += '<button class="mini" data-act="close">✕ اقفل</button></div>';
    h += '<p class="soft">' + esc([d.gov, d.team].filter(Boolean).join(" · ")) + " · " + esc(st.label) + (d.createdAt ? " · اتضاف " + when(d.createdAt) : "") + "</p>";
    if (fl.length) h += '<p class="ad-flag">⚑ ' + esc(fl.join(" · ")) + ". العلامة معلومة بس، ومفيش أي حاجة اتعملت لوحدها.</p>";
    if (st.key !== "revoked") {
      h += '<div class="row ad-link"><input readonly dir="ltr" value="' + esc(appURL(d.__id)) + '" id="lnk"><button class="mini" data-act="copy" data-id="' + esc(d.__id) + '">انسخ الرابط</button>';
      h += '<button class="mini" data-act="copyMsg" data-id="' + esc(d.__id) + '">انسخ رسالة جاهزة</button>';
      h += '<button class="mini danger" data-act="newLink" data-id="' + esc(d.__id) + '">اعمل رابط جديد</button></div>';
    } else h += '<p class="soft">الرابط ده اتقفل' + (d.replacedBy ? '، والرابط الجديد: <span dir="ltr" class="code">' + esc(d.replacedBy) + "</span>" : "") + ".</p>";
    h += '<div class="tabs">';
    [["report", "التقرير زي ما شافه"], ["coach", "ورقة الكوتش"], ["data", "البيانات"]].forEach(function (t) {
      h += '<button class="mini' + (VIEW.tab === t[0] ? " on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
    });
    h += '</div><div class="panel">';
    if (VIEW.tab === "data") h += '<pre class="ad-pre" dir="ltr">' + esc(JSON.stringify(plain(Object.assign({}, d, { result: d.result ? "(" + "النتيجة كاملة في التنزيل JSON" + ")" : null })), null, 1)) + "</pre>";
    else if (!d.result) h += '<p class="soft">' + (st.key === "new" ? "لسه ما بدأش." : "لسه ما خلّصش، فمفيش تقرير ولا ورقة كوتش.") + "</p>";
    else {
      try {
        var A = E.normalize(d);
        if (VIEW.tab === "report") h += '<article class="report">' + blocksHTML(RP.renderReport(d.result, A, ITEMS, TEXTS, { name: first, address: d.address || "m" }).blocks) + "</article>";
        else h += '<article class="report">' + blocksHTML(CO.renderCoach(d.result, A, ITEMS, CT, { name: d.name, address: d.address || "m", rating: d.rating || null, timing: A.timing })) + "</article>";
      } catch (e) { h += '<p class="hint">ما اترسمش: ' + esc(e.message || e) + "</p>"; }
    }
    box.innerHTML = h + "</div></section>";
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function copy(text, okMsg) {
    var done = function () { say(okMsg, "ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) { prompt("انسخ:", text); } t.remove(); }
  }
  function message(d) {
    var n = X.first(d.name || "");
    return "أهلًا" + (n ? " يا " + n : "") + ".\nده رابط مقياس «ميزاني» الخاص بيك. الرابط ليك إنت بس، فما تبعتهوش لحد. وإجاباتك بتتحفظ أول بأول، فتقدر تقف وترجع تكمّل من نفس الرابط.\n" + appURL(d.__id);
  }

  /* ───────── أكواد جديدة ───────── */
  // بيعمل كود مش موجود قبل كده (بيتأكد من السيرفر). ٥ محاولات (الاحتمال إن كود يتكرر ١ من تريليون تقريبًا)
  function freshCode(tries) {
    tries = tries || 0;
    var c = X.makeCode();
    if (X.isTrial(c) || !X.validCode(c)) return Promise.reject(new Error("المولّد طلّع كود مش مسموح: " + c));
    return db.collection(X.CFG.collection).doc(c).get().then(function (s) {
      if (!s.exists) return c;
      if (tries >= 5) throw new Error("مش لاقي كود فاضي");
      return freshCode(tries + 1);
    });
  }
  function addOne(p) {
    return freshCode().then(function (c) {
      var doc = { name: p.name, gov: p.gov || "", team: p.team || "", createdAt: X.ts(), createdBy: auth.currentUser && auth.currentUser.email };
      return db.collection(X.CFG.collection).doc(c).set(doc).then(function () { doc.__id = c; doc.createdAt = Date.now(); ROWS.unshift(doc); return c; });
    });
  }
  function parseList(txt) {
    return txt.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split(/\t|،|,/).map(function (x) { return x.trim(); });
      return { name: p[0], gov: p[1] || "", team: p.slice(2).join("، ") };
    }).filter(function (p) { return p.name; });
  }
  function showAdd() {
    var pnl = $("#panel");
    pnl.innerHTML = '<section class="card ad-add"><h3>ضيف متطوعين</h3><p class="soft">سطر لكل متطوع: الاسم، المحافظة، الدور. (الفاصل فصلة أو Tab، فتلصق من Excel على طول.) والمحافظة والدور اختياريين.</p>' +
      '<label class="field"><textarea id="addList" rows="6" placeholder="منة علي، سوهاج، متطوعة في المحافظة&#10;يوسف حسن، الأقصر، مسؤول ملف"></textarea></label>' +
      '<div class="row"><button class="next" data-act="addGo">ضيف واعمل الروابط</button><button class="next ghost" data-act="panelClose">إلغاء</button></div><div id="addOut"></div></section>';
    $("#addList").focus();
  }
  function addGo(btn) {
    var list = parseList($("#addList").value), out = $("#addOut");
    if (!list.length) { out.innerHTML = '<p class="hint">اكتب اسم واحد على الأقل.</p>'; return; }
    btn.setAttribute("aria-disabled", "true");
    var made = [], failed = [];
    var chain = Promise.resolve();
    list.forEach(function (p, i) {
      chain = chain.then(function () {
        out.innerHTML = '<p class="soft">بيضيف ' + ar(i + 1) + " من " + ar(list.length) + "…</p>";
        return addOne(p).then(function (c) { made.push({ p: p, c: c }); }, function (e) { failed.push({ p: p, e: (e && (e.code || e.message)) || String(e) }); });
      });
    });
    chain.then(function () {
      btn.removeAttribute("aria-disabled");
      var h = "<p>اتضاف " + ar(made.length) + (failed.length ? '، و<b class="hint">ما اتضافش ' + ar(failed.length) + "</b>" : "") + ".</p>";
      if (made.length) {
        h += '<table class="ax"><thead><tr><th>الاسم</th><th>الرابط</th></tr></thead><tbody>' + made.map(function (m) { return "<tr><td>" + esc(m.p.name) + '</td><td dir="ltr" class="code">' + esc(appURL(m.c)) + "</td></tr>"; }).join("") + "</tbody></table>";
        h += '<button class="mini" data-act="copyAll">انسخ كل الأسامي والروابط</button>';
      }
      failed.forEach(function (f) { h += '<p class="hint">' + esc(f.p.name) + ": " + esc(f.e) + "</p>"; });
      out.innerHTML = h;
      out.__made = made;
      render2keepPanel(h, made);
    });
  }
  // الجدول بيتحدث بالأسامي الجديدة، والنتيجة تفضل ظاهرة فوقه
  function render2keepPanel(h, made) {
    render();
    $("#panel").innerHTML = '<section class="card ad-add"><h3>اتضافوا</h3>' + h + '<div class="row"><button class="next ghost" data-act="panelClose">تمام</button></div></section>';
    $("#panel").__made = made;
  }
  // رابط جديد: وثيقة جديدة بكود جديد فيها كل اللي في القديمة، والقديمة بتتقفل (المتطوع بيشوف «الرابط ده اتقفل»)
  function newLink(id) {
    var d = byId(id); if (!d) return;
    if (!confirm("الرابط القديم هيتقفل فورًا، واللي معاه الرابط القديم مش هيقدر يفتحه. إجابات " + (d.name || "المتطوع") + " هتتنقل للرابط الجديد. تكمّل؟")) return;
    say("بيعمل رابط جديد…");
    freshCode().then(function (c) {
      var copyDoc = JSON.parse(JSON.stringify(plainKeep(d))); delete copyDoc.__id; delete copyDoc.revoked; delete copyDoc.replacedBy; delete copyDoc.revokedAt;
      copyDoc.replaces = id; copyDoc.relinkedAt = X.ts();
      return db.collection(X.CFG.collection).doc(c).set(copyDoc).then(function () {
        return db.collection(X.CFG.collection).doc(id).set({ revoked: true, replacedBy: c, revokedAt: X.ts() }, { merge: true });
      }).then(function () { return c; });
    }).then(function (c) {
      say("اتعمل · الرابط القديم اتقفل", "ok");
      VIEW.sel = c;
      return load().then(function () { copy(appURL(c), "اتعمل رابط جديد، واتنسخ."); });
    }).catch(function (e) { say("ما نفعش: " + ((e && (e.code || e.message)) || e), "err"); });
  }
  // نسخة من الوثيقة للكتابة: الـTimestamps بتفضل زي ما هي (مش ISO)، وFieldValue مش موجودة هنا
  function plainKeep(d) { var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k]; }); return o; }

  /* ───────── الأرقام المجمّعة ───────── */
  var MIN_CELL = 10;   // أي مجموعة أقل من ١٠ أشخاص أرقامها ما بتظهرش (اتفاق الأخلاقيات)
  function stats(list) {
    var done = list.filter(function (d) { return stateOf(d).key === "done"; });
    var s = { n: list.length, done: done.length, going: list.filter(function (d) { return stateOf(d).key === "going"; }).length,
              main: { H: 0, V: 0, A: 0 }, quiet: { H: 0, V: 0, A: 0 }, out: {}, dims: {}, flags: 0, vnow: {} };
    DIMS.forEach(function (k) { s.dims[k] = {}; });
    done.forEach(function (d) {
      var R = d.result, F = R.final;
      if (F.main) s.main[F.main]++;
      if (F.suppressed) s.quiet[F.suppressed]++;
      (R.volunteer && R.volunteer.outcomes || []).forEach(function (o) { s.out[o] = (s.out[o] || 0) + 1; });
      (R.dimensions || []).forEach(function (x) { var w = x.clientWord || x.reportStatus; s.dims[x.id][w] = (s.dims[x.id][w] || 0) + 1; });
      if (flags(d).length) s.flags++;
      var nw = R.volunteer && R.volunteer.now && R.volunteer.now.id; if (nw) s.vnow[nw] = (s.vnow[nw] || 0) + 1;
    });
    return s;
  }
  function pct(n, of) { return of ? ar(Math.round(n / of * 100)) + "٪" : "—"; }
  function showStats() {
    var live = ROWS.filter(function (d) { return stateOf(d).key !== "revoked"; });
    var S = stats(live), h = '<section class="card"><div class="ad-head"><h3>الأرقام المجمّعة (من غير أسماء)</h3><button class="mini" data-act="panelClose">✕</button></div>';
    h += "<p>المتطوعين: " + ar(S.n) + " · خلّصوا: " + ar(S.done) + " · بدأوا ولسه: " + ar(S.going) + " · ما بدأوش: " + ar(S.n - S.done - S.going) + " · عليهم علامة: " + ar(S.flags) + "</p>";
    if (S.done < MIN_CELL) { $("#panel").innerHTML = h + '<p class="soft">التوزيعات بتظهر لما يخلّص ' + ar(MIN_CELL) + " على الأقل (لسه " + ar(S.done) + ").</p></section>"; return; }
    function dist(o, keys, names) { return keys.map(function (k) { return (names[k] || k) + " " + ar(o[k] || 0) + " (" + pct(o[k] || 0, S.done) + ")"; }).join(" · "); }
    h += "<p><b>المسار الأقوى:</b> " + dist(S.main, ["H", "V", "A"], NAME) + "</p>";
    h += "<p><b>المسار الهادي:</b> " + dist(S.quiet, ["H", "V", "A"], NAME) + "</p>";
    h += "<p><b>التطوع:</b> " + dist(S.out, Object.keys(OUT), OUT) + "</p>";
    var nowNames = {}; ITEMS.vnow.options.forEach(function (o) { nowNames[o.id] = o.text.replace(/[.،].*$/, ""); });
    h += "<p><b>«إنت فين دلوقتي»:</b> " + dist(S.vnow, ITEMS.vnow.options.map(function (o) { return o.id; }), nowNames) + "</p>";
    h += '<div class="tbl-wrap"><table class="ax"><thead><tr><th>المساحة</th><th>توزيع الحال</th></tr></thead><tbody>';
    DIMS.forEach(function (k) {
      var dm = ITEMS.dims.filter(function (x) { return x.id === k; })[0], o = S.dims[k];
      h += "<tr><td>" + esc(dm ? dm.name : k) + "</td><td>" + Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (w) { return esc(w) + " " + ar(o[w]); }).join(" · ") + "</td></tr>";
    });
    h += "</tbody></table></div>";
    // حسب المحافظة: الأقل من ١٠ ما بيظهرش
    var govs = {}; live.forEach(function (d) { var g = d.gov || "من غير محافظة"; (govs[g] = govs[g] || []).push(d); });
    h += '<h4>حسب المحافظة</h4><div class="tbl-wrap"><table class="ax"><thead><tr><th>المحافظة</th><th>العدد</th><th>خلّصوا</th><th>الأقوى (ح/ي/ن)</th><th>الهادي (ح/ي/ن)</th><th>علامات</th></tr></thead><tbody>';
    Object.keys(govs).sort().forEach(function (g) {
      var s = stats(govs[g]);
      h += "<tr><td>" + esc(g) + "</td><td>" + ar(s.n) + "</td><td>" + ar(s.done) + "</td>";
      if (s.done < MIN_CELL) h += '<td colspan="3" class="soft">أقل من ' + ar(MIN_CELL) + " خلّصوا، فالتوزيع مش ظاهر</td>";
      else h += "<td>" + ["H", "V", "A"].map(function (a) { return ar(s.main[a]); }).join(" / ") + "</td><td>" + ["H", "V", "A"].map(function (a) { return ar(s.quiet[a]); }).join(" / ") + "</td><td>" + ar(s.flags) + "</td>";
      h += "</tr>";
    });
    $("#panel").innerHTML = h + "</tbody></table></div></section>";
  }

  /* ───────── التنزيل ───────── */
  function save(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function downloadJSON() {
    save(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), collection: X.CFG.collection, docs: ROWS.map(function (d) { var o = plain(d); o.code = d.__id; delete o.__id; return o; }) }, null, 1)], { type: "application/json" }), "mizan_scale-" + stamp() + ".json");
  }
  function sheetRows() {
    var head = ["الكود", "الاسم", "المحافظة", "الدور (من الأدمن)", "الرابط", "الحالة", "آخر حفظ", "بدأ", "خلّص", "الصيغة", "السن", "الدور (من المتطوع)", "المدة",
                "الأقوى", "المساند", "الهادي", "ثقة الترتيب", "حال الهادي", "ترتيب التطوع", "نتيجة التطوع", "سبب النتيجة"]
      .concat(DIMS.map(function (k) { var dm = ITEMS.dims.filter(function (x) { return x.id === k; })[0]; return dm ? dm.name : k; }))
      .concat(["دايرة التطوع العالية", "إنت فين", "العلامات", "التقييم", "رأيه"]);
    var rows = [head];
    ROWS.forEach(function (d) {
      var R = d.result, c = d.client || {}, V = R && R.volunteer;
      var dims = {}; (R && R.dimensions || []).forEach(function (x) { dims[x.id] = x.clientWord || x.reportStatus; });
      var vc = V ? ["H", "V", "A"].filter(function (a) { return V.vcycles[a] && V.vcycles[a].high; }).map(function (a) { return NAME[a]; }).join("، ") : "";
      var iso = function (v) { var t = ms(v); return t ? new Date(t).toISOString().replace("T", " ").slice(0, 16) : ""; };
      rows.push([d.__id, d.name || "", d.gov || "", d.team || "", stateOf(d).key === "revoked" ? "" : appURL(d.__id), stateOf(d).label, iso(d.updatedAt || d.updatedAtMs), iso(d.startedAt), iso(d.finishedAt),
        d.address === "f" ? "مؤنث" : d.address === "m" ? "مذكر" : "", optText("age", c.age), optText("role", c.role), optText("tenure", c.tenure),
        R ? NAME[R.final.main] || "" : "", R ? NAME[R.final.supporting] || "" : "", R ? NAME[R.final.suppressed] || "" : "", R ? R.ranking.confidence : "", R ? R.suppressed.status : "",
        V ? order(V.volunteerRanking.order) : "", V ? V.outcomes.map(function (o) { return OUT[o] || o; }).join(" + ") : "", V ? (V.reason || "") : ""]
        .concat(DIMS.map(function (k) { return dims[k] || ""; }))
        .concat([vc, V && V.now ? V.now.text : "", flags(d).join("، "), d.rating ? d.rating.value : "", d.rating ? d.rating.note || "" : ""]));
    });
    return rows;
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error("xlsx")); };
      s.onerror = function () { rej(new Error("مكتبة Excel ما اتحمّلتش")); };
      document.head.appendChild(s);
    });
  }
  function downloadXLSX() {
    say("بيجهّز Excel…");
    loadXLSX().then(function (XL) {
      var wb = XL.utils.book_new();
      var ws = XL.utils.aoa_to_sheet(sheetRows()); ws["!views"] = [{ RTL: true }]; wb.Workbook = { Views: [{ RTL: true }] };
      XL.utils.book_append_sheet(wb, ws, "المتطوعين");
      var live = ROWS.filter(function (d) { return stateOf(d).key !== "revoked"; }), S = stats(live);
      var agg = [["الرقم", "القيمة"], ["المتطوعين", S.n], ["خلّصوا", S.done], ["بدأوا ولسه", S.going], ["ما بدأوش", S.n - S.done - S.going], ["عليهم علامة", S.flags]];
      if (S.done >= MIN_CELL) {
        ["H", "V", "A"].forEach(function (a) { agg.push(["الأقوى: " + NAME[a], S.main[a]]); });
        ["H", "V", "A"].forEach(function (a) { agg.push(["الهادي: " + NAME[a], S.quiet[a]]); });
        Object.keys(OUT).forEach(function (o) { agg.push(["التطوع: " + OUT[o], S.out[o] || 0]); });
      } else agg.push(["التوزيعات", "بتظهر لما يخلّص " + MIN_CELL + " على الأقل"]);
      var ws2 = XL.utils.aoa_to_sheet(agg); ws2["!views"] = [{ RTL: true }];
      XL.utils.book_append_sheet(wb, ws2, "الأرقام المجمعة");
      XL.writeFile(wb, "mizan_scale-" + stamp() + ".xlsx");
      say("اتنزّل", "ok");
    }).catch(function (e) { say("Excel ما اتعملش: " + (e.message || e), "err"); });
  }

  /* ───────── الأحداث ───────── */
  document.addEventListener("click", function (e) {
    var tr = e.target.closest && e.target.closest("tr[data-id]");
    var b = e.target.closest && e.target.closest("[data-act]");
    if (!b && tr) { VIEW.sel = VIEW.sel === tr.getAttribute("data-id") ? null : tr.getAttribute("data-id"); VIEW.tab = "report"; render(); return; }
    if (!b || b.getAttribute("aria-disabled") === "true") return;
    var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    if (act === "filter") { VIEW.filter = b.getAttribute("data-v"); render(); }
    else if (act === "reload") load();
    else if (act === "add") showAdd();
    else if (act === "addGo") addGo(b);
    else if (act === "panelClose") { $("#panel").innerHTML = ""; }
    else if (act === "stats") showStats();
    else if (act === "json") downloadJSON();
    else if (act === "xlsx") downloadXLSX();
    else if (act === "copy") copy(appURL(id), "الرابط اتنسخ");
    else if (act === "copyMsg") copy(message(byId(id)), "الرسالة اتنسخت");
    else if (act === "copyAll") { var m = $("#panel").__made || []; copy(m.map(function (x) { return x.p.name + "\t" + appURL(x.c); }).join("\n"), "اتنسخ (" + ar(m.length) + ")"); }
    else if (act === "newLink") newLink(id);
    else if (act === "tab") { VIEW.tab = b.getAttribute("data-v"); renderDetail(); }
    else if (act === "close") { VIEW.sel = null; render(); }
    else if (act === "logout") auth.signOut();
  });

  /* ───────── البداية ───────── */
  function boot() {
    main = $("#main");
    if (typeof firebase === "undefined") { main.innerHTML = '<section class="card"><h2>مكتبة فايربيز ما اتحمّلتش</h2><p>النت ضعيف أو مقفول. جرّب تاني.</p></section>'; return; }
    if (!firebase.apps.length) firebase.initializeApp(X.CFG.firebase);
    db = firebase.firestore(); auth = firebase.auth();
    Promise.all([X.loadJSON("../engine/items.json"), X.loadJSON("../report/texts.json"), X.loadJSON("../report/coach_texts.json")]).then(function (r) {
      ITEMS = r[0]; TEXTS = r[1]; CT = r[2];
      auth.onAuthStateChanged(function (u) {
        if (!u) return showLogin();
        if (ADMINS.indexOf(String(u.email || "").toLowerCase()) === -1) { auth.signOut(); return showLogin("الإيميل ده مش أدمن لميزان المتطوع."); }
        var t = $(".top"); if (t && !$("#logout")) { var lo = document.createElement("button"); lo.id = "logout"; lo.className = "mini"; lo.setAttribute("data-act", "logout"); lo.textContent = "خروج"; t.appendChild(lo); }
        load();
      });
    }).catch(function (e) { main.innerHTML = '<section class="card"><h2>الصفحة ما اتحمّلتش</h2><p>' + esc((e && (e.file || e.message)) || e) + "</p></section>"; });
  }
  window.MZS_ADMIN = { rows: function () { return ROWS; }, sheetRows: function () { return sheetRows(); } };   // للاختبار بس
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
