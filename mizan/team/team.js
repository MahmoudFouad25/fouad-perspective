/* =====================================================================
   team.js — «جلساتي والفريق»
   ---------------------------------------------------------------------
   الأدمن الرئيسي (إيميله في MZ_ADMINS): بيضيف الميسّرين، وبيشوف كل الجلسات.
   الميسّر: بيعمل جلسة لكل يوم أو محافظة. كل جلسة ليها روابطها لوحدها
   (لوحة · سكريبت · شاشة عرض · مشاركين · فحص)، ومحدش غيره يقدر يحرّكها
   إلا لو ضافه «شريك في التحكم». وأي جلسة «مفتوحة للفريق» يتابعها بس.
   ===================================================================== */
(function () {
  "use strict";
  var esc = MZ.esc, ar = MZ.ar, db = MZ.db, auth = MZ.auth;
  var root = document.getElementById("root");
  var BASE = location.href.split("?")[0].split("#")[0].replace(/\/team\/(index\.html)?$/, "/");
  var TEAM = BASE + "team/";
  var me = null;                  /* {role:"super"|"staff", email, name, staff} */
  var sessions = {}, staff = {}, tab = null, showNew = false, editing = null, lastAdd = null, msgFor = {};
  var FV = (typeof firebase !== "undefined" && firebase.firestore) ? firebase.firestore.FieldValue : null;

  /* ───────────── أدوات ───────────── */
  function toast(t) {
    var el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#2b2621;color:#fff;padding:9px 16px;border-radius:12px;font-size:.9rem;z-index:99;box-shadow:0 6px 20px rgba(0,0,0,.2);transition:opacity .3s"; document.body.appendChild(el); }
    el.textContent = t; el.style.opacity = "1"; clearTimeout(toast._t); toast._t = setTimeout(function () { el.style.opacity = "0"; }, 2200);
  }
  function copy(t) {
    function fb() { var a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) {} a.remove(); }
    try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).catch(fb); else fb(); } catch (e) { fb(); }
    toast("اتنسخ ✓");
  }
  function wa(text, phone) {
    var p = String(phone || "").replace(/[^\d]/g, "");
    if (/^01\d{9}$/.test(p)) p = "2" + p;                     /* موبايل مصري 01xxxxxxxxx */
    return "https://wa.me/" + (p.length >= 10 ? p : "") + "?text=" + encodeURIComponent(text);
  }
  function genPw() { var c = "abcdefghjkmnpqrstuvwxyz", d = "23456789", s = ""; for (var i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)]; for (i = 0; i < 3; i++) s += d[Math.floor(Math.random() * d.length)]; return s; }
  function newSid() { return "mz-" + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5); }
  function links(sid) {
    var q = "?s=" + encodeURIComponent(sid);
    return { con: BASE + "console/" + q, scr: BASE + "script/" + q, stage: BASE + "stage/" + q, live: BASE + "live/" + q, check: BASE + "check/" + q };
  }
  function fmtDate(v) { if (!v) return ""; try { var d = typeof v === "number" ? new Date(v) : new Date(v + "T12:00:00"); return ar(d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear()); } catch (e) { return v; } }
  function staffName(email) { if (!email) return "—"; if (MZ_ADMINS.indexOf(email) !== -1) return "محمود (الأدمن الرئيسي)"; return (staff[email] && staff[email].name) || email; }
  function isMine(d) { return d.owner === me.email; }
  function canEdit(d) { return me.role === "super" || isMine(d); }
  function canCtl(d) { return canEdit(d) || (d.editors || []).indexOf(me.email) !== -1; }
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value.trim() : ""; }

  /* ───────────── الدخول ───────────── */
  function loginView(msg) {
    root.innerHTML = '<div class="login"><div class="eyebrow">الميزان</div><h2 style="margin:0 0 4px">جلساتي والفريق</h2>' +
      '<p class="meta" style="margin:0 0 10px">ادخل بالإيميل وكلمة السر اللي محمود بعتهم لك.</p>' +
      '<label>الإيميل<input id="em" type="email" autocomplete="username" value="' + esc(MZ.store.get("mz:adminEmail") || "") + '"></label>' +
      '<label>كلمة السر<input id="pw" type="password" autocomplete="current-password"></label>' +
      '<button class="b dark" id="go" style="width:100%;padding:12px;margin-top:12px">دخول</button>' +
      '<div class="err" id="er">' + esc(msg || "") + '</div>' +
      '<p class="meta"><a href="#" id="forgot">نسيت كلمة السر؟</a></p></div>';
    $("go").onclick = doLogin;
    $("pw").onkeydown = function (e) { if (e.key === "Enter") doLogin(); };
    $("forgot").onclick = function (e) {
      e.preventDefault(); var em = val("em").toLowerCase();
      if (!em) { $("er").textContent = "اكتب إيميلك فوق، وبعدين دوس «نسيت كلمة السر» تاني."; return; }
      auth.sendPasswordResetEmail(em).then(function () {
        $("er").innerHTML = '<span class="okm">بعتنا رابط تغيير كلمة السر على ' + esc(em) + '. افتح الإيميل (وبص في Spam كمان).</span>';
      }).catch(function (e) { $("er").textContent = MZ.errText(e); });
    };
  }
  function doLogin() {
    var em = val("em").toLowerCase(), pw = $("pw").value;
    if (!em || !pw) { $("er").textContent = "اكتب الإيميل وكلمة السر."; return; }
    $("er").textContent = "بندخل…"; MZ.store.set("mz:adminEmail", em);
    auth.signInWithEmailAndPassword(em, pw).catch(function (e) { $("er").textContent = MZ.errText(e); });
  }

  if (!MZ.hasFb()) { loginView(MZ.errText({ code: "mz/no-sdk" })); return; }
  auth.onAuthStateChanged(function (u) {
    if (!u || u.isAnonymous) { me = null; loginView(); return; }
    root.innerHTML = '<div class="login"><p>بنتأكد من حسابك…</p></div>';
    MZ.role(u).then(function (r) {
      if (!r.role) { auth.signOut(); loginView(MZ.errText({ code: r.why || "mz/not-admin" })); return; }
      me = r; tab = tab || "ses";
      reload();
    }).catch(function (e) { auth.signOut(); loginView(MZ.errText(e)); });
  });

  /* ───────────── التحميل ───────────── */
  function reload() {
    var col = db.collection("mizan");
    var qS = me.role === "super" ? col.get().then(function (q) { return [q]; })
      : Promise.all([col.where("owner", "==", me.email).get(), col.where("editors", "array-contains", me.email).get(),
          col.where("open", "==", true).get().catch(function () { return null; })]);
    var qT = db.collection("mizan_staff").get().catch(function () { return null; });
    return Promise.all([qS, qT]).then(function (res) {
      sessions = {};
      res[0].forEach(function (q) { if (q) q.forEach(function (d) { var x = d.data() || {}; if (me.role === "super" || x.owner) sessions[d.id] = x; }); });
      staff = {};
      if (res[1]) res[1].forEach(function (d) { staff[d.id] = d.data() || {}; });
      paint();
    }).catch(function (e) { root.innerHTML = '<div class="login"><div class="err">' + esc(MZ.errText(e)) + '</div><p class="meta">لو أول مرة: اتأكد إن ملف القواعد الجديد اتنشر (Publish).</p><button class="b" id="rt">جرّب تاني</button> <button class="b" id="out">خروج</button></div>';
      $("rt").onclick = reload; $("out").onclick = function () { auth.signOut(); }; });
  }

  /* ───────────── الرسم ───────────── */
  function paint() {
    var sup = me.role === "super";
    var tabs = sup ? [["ses", "الجلسات"], ["staff", "الميسّرين"], ["acc", "حسابي"]]
                   : [["ses", "جلساتي"], ["open", "جلسات أتابعها"], ["acc", "حسابي"]];
    var h = '<div class="top"><h1>الميزان · ' + (sup ? "جلسات الفريق كله" : "جلساتي") + '</h1>' +
      '<span class="pill ' + (sup ? "gold" : "blue") + '">' + (sup ? "الأدمن الرئيسي" : "ميسّر") + " · " + esc(me.name) + '</span>' +
      '<button class="b" data-act="out">خروج</button></div>' +
      '<div class="tabs" id="tabs">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + "</div>";
    if (tab === "ses") h += sesTab();
    else if (tab === "open") h += openTab();
    else if (tab === "staff" && sup) h += staffTab();
    else h += accTab();
    root.innerHTML = h;
  }

  function sortList(ids) {
    return ids.sort(function (a, b) {
      var x = sessions[a], y = sessions[b];
      if (!!x.archived !== !!y.archived) return x.archived ? 1 : -1;
      return (y.createdAt || 0) - (x.createdAt || 0);
    });
  }

  function sesTab() {
    var sup = me.role === "super";
    var h = '<div class="panel"><div class="ctr"><div class="sp"><h2>' + (sup ? "كل الجلسات" : "جلساتي") + '</h2>' +
      '<div class="meta">جلسة لكل يوم أو لكل محافظة. كل جلسة ليها روابطها لوحدها، فمحدش بيحرّك شرايح حد تاني.</div></div>' +
      '<button class="b dark" data-act="new">+ جلسة جديدة</button></div>';
    if (showNew) {
      h += '<div class="box"><div class="grid2">' +
        '<div><label>اسم الجلسة (الناس هتشوفه في اللوحة)</label><input id="nT" placeholder="مثلًا: سوهاج · الدفعة الأولى"></div>' +
        '<div><label>المحافظة</label><input id="nG" placeholder="مثلًا: سوهاج"></div>' +
        '<div><label>التاريخ (اختياري)</label><input id="nD" type="date"></div>';
      if (sup) {
        h += '<div><label>الجلسة دي بتاعة مين؟</label><select id="nO"><option value="' + esc(me.email) + '">أنا (محمود)</option>' +
          Object.keys(staff).filter(function (e) { return staff[e].active !== false; }).map(function (e) { return '<option value="' + esc(e) + '">' + esc(staff[e].name || e) + (staff[e].gov ? " · " + esc(staff[e].gov) : "") + "</option>"; }).join("") + "</select></div>";
      }
      h += '</div><div class="ctr" style="margin-top:12px"><button class="b dark" data-act="create">اعمل الجلسة</button><button class="b" data-act="new">إلغاء</button></div><div class="err" id="nErr"></div></div>';
    }
    h += "</div>";
    var ids = Object.keys(sessions).filter(function (s) { return sup || canCtl(sessions[s]); });
    if (!ids.length) return h + '<div class="panel empty">مفيش جلسات لسه. دوس «+ جلسة جديدة».</div>';
    if (sup) {     /* الأدمن: جلساته الأول، وبعدين كل ميسّر لوحده */
      var groups = {};
      ids.forEach(function (s) { var o = sessions[s].owner || ""; (groups[o] = groups[o] || []).push(s); });
      var owners = Object.keys(groups).sort(function (a, b) { return (a === me.email ? -1 : b === me.email ? 1 : a === "" ? 1 : b === "" ? -1 : staffName(a).localeCompare(staffName(b), "ar")); });
      owners.forEach(function (o) {
        h += '<div class="panel"><h2>' + (o === me.email ? "جلساتي أنا" : o === "" ? "جلسات قديمة (من غير صاحب)" : esc(staffName(o))) +
          ' <span class="meta">(' + ar(groups[o].length) + ")</span></h2>" + sortList(groups[o]).map(card).join("") + "</div>";
      });
      return h;
    }
    var mine = ids.filter(function (s) { return isMine(sessions[s]); }), part = ids.filter(function (s) { return !isMine(sessions[s]); });
    h += '<div class="panel">' + (mine.length ? sortList(mine).map(card).join("") : '<div class="empty">مفيش جلسات باسمك لسه.</div>') + "</div>";
    if (part.length) h += '<div class="panel"><h2>جلسات إنت شريك في التحكم فيها</h2>' + sortList(part).map(card).join("") + "</div>";
    return h;
  }

  function openTab() {
    var ids = Object.keys(sessions).filter(function (s) { var d = sessions[s]; return d.open && !canCtl(d); });
    var h = '<div class="panel"><h2>جلسات مفتوحة للفريق</h2><div class="meta">دي جلسات صاحبها فتحها عشان الفريق يتابعها (زي جلسات الكامب). بتشوف اللوحة والسكريبت والشاشة لحظة بلحظة، بس من غير تحكم.</div></div>';
    if (!ids.length) return h + '<div class="panel empty">مفيش جلسات مفتوحة دلوقتي.</div>';
    return h + '<div class="panel">' + sortList(ids).map(card).join("") + "</div>";
  }

  function card(sid) {
    var d = sessions[sid], L = links(sid), ed = canEdit(d), ctl = canCtl(d);
    var h = '<div class="card' + (d.archived ? " arch" : "") + '" data-sid="' + esc(sid) + '">';
    h += '<div class="ctr"><h3 class="sp">' + esc(d.title || sid) + "</h3>" +
      (d.gov ? '<span class="pill">' + esc(d.gov) + "</span>" : "") +
      (d.date ? '<span class="pill">' + fmtDate(d.date) + "</span>" : "") +
      (!isMine(d) ? '<span class="pill">صاحبها: ' + esc(staffName(d.owner)) + "</span>" : "") +
      (!ed && ctl ? '<span class="pill blue">شريك في التحكم</span>' : "") +
      (!ctl ? '<span class="pill blue">متابعة بس</span>' : "") +
      (d.open ? '<span class="pill gold">مفتوحة للفريق</span>' : "") +
      (d.archived ? '<span class="pill">مؤرشفة</span>' : "") + "</div>";
    h += '<div class="meta">كود الجلسة: <b dir="ltr">' + esc(sid) + "</b>" + (d.state ? " · دلوقتي: " + esc((mzState(d.state) || {}).label || d.state) : "") + "</div>";
    var rows = ctl
      ? [["con", "لوحة التحكم", "ليك إنت · اللابتوب"], ["scr", "السكريبت", "موبايلك أو التابلت"], ["stage", "شاشة العرض", "البروجكتور"], ["live", "المشاركين", "ده اللي في الـQR"], ["check", "الفحص", "قبل اليوم بيوم"]]
      : [["con", "اللوحة (متابعة)", "تشوف كل حاجة من غير تحكم"], ["scr", "السكريبت", "بيمشي مع الشرايح"], ["stage", "شاشة العرض", ""]];
    h += '<div class="links">' + rows.map(function (r) {
      return '<div class="lk"><span class="n">' + r[1] + (r[2] ? '<span class="h">' + r[2] + "</span>" : "") + '</span><span class="u">' + esc(L[r[0]]) + "</span>" +
        '<a class="b sm" target="_blank" href="' + esc(L[r[0]]) + '">افتح ↗</a><button class="b sm" data-act="copy" data-u="' + esc(L[r[0]]) + '">انسخ</button></div>';
    }).join("") + "</div>";
    h += '<div class="ctr"><a class="b green sm" target="_blank" href="' + esc(wa(linksMsg(sid))) + '">📲 ابعت الروابط واتساب</a><button class="b sm" data-act="copyall">انسخ كل الروابط</button>';
    if (ed) h += '<button class="b sm" data-act="edit">✏️ تعديل</button><button class="b sm" data-act="open">' + (d.open ? "👀 اقفلها على الفريق" : "👀 افتحها للفريق يتابعوها") + '</button>' +
      '<button class="b sm" data-act="arch">' + (d.archived ? "رجّعها من الأرشيف" : "أرشفة") + '</button><button class="b sm red" data-act="del">🗑 مسح</button>';
    h += "</div>";
    /* الشركاء */
    if (ed) {
      var eds = d.editors || [];
      var cand = Object.keys(staff).filter(function (e) { return staff[e].active !== false && e !== d.owner && eds.indexOf(e) === -1; });
      h += '<div class="box"><b style="font-size:.9rem">شركاء في التحكم</b> <span class="meta">— يقدروا يقلّبوا الشرايح ويوزّعوا الحلقات في الجلسة دي (زي ميسّر مساعد).</span><div style="margin-top:6px">' +
        (eds.length ? eds.map(function (e) { return '<span class="chip">' + esc(staffName(e)) + '<button data-act="unpart" data-e="' + esc(e) + '" title="شيله">✕</button></span>'; }).join("") : '<span class="meta">مفيش.</span>') + "</div>";
      if (cand.length) h += '<div class="ctr" style="margin-top:8px"><select class="sp" id="pa-' + esc(sid) + '" style="max-width:320px"><option value="">— اختار ميسّر —</option>' +
        cand.map(function (e) { return '<option value="' + esc(e) + '">' + esc(staff[e].name || e) + (staff[e].gov ? " · " + esc(staff[e].gov) : "") + "</option>"; }).join("") + '</select><button class="b sm" data-act="part">ضيفه شريك</button></div>';
      h += "</div>";
    }
    if (editing === sid) {
      h += '<div class="box"><div class="grid2"><div><label>اسم الجلسة</label><input id="eT" value="' + esc(d.title || "") + '"></div>' +
        '<div><label>المحافظة</label><input id="eG" value="' + esc(d.gov || "") + '"></div>' +
        '<div><label>التاريخ</label><input id="eD" type="date" value="' + esc(d.date || "") + '"></div>';
      if (me.role === "super") h += '<div><label>صاحبها</label><select id="eO"><option value="' + esc(me.email) + '"' + (d.owner === me.email ? " selected" : "") + '>أنا (محمود)</option>' +
        Object.keys(staff).map(function (e) { return '<option value="' + esc(e) + '"' + (d.owner === e ? " selected" : "") + ">" + esc(staff[e].name || e) + "</option>"; }).join("") + "</select></div>";
      h += '</div><div class="ctr" style="margin-top:10px"><button class="b dark sm" data-act="save">احفظ</button><button class="b sm" data-act="edit">إلغاء</button></div><div class="err" id="eErr"></div></div>';
    }
    return h + "</div>";
  }

  function linksMsg(sid) {
    var d = sessions[sid] || {}, L = links(sid);
    var s = "الميزان · " + (d.title || sid) + (d.gov ? " — " + d.gov : "") + (d.date ? " · " + fmtDate(d.date) : "") + "\n\n";
    if (canCtl(d)) {
      s += "🎛 لوحة التحكم (للميسّر · اللابتوب):\n" + L.con + "\n\n📜 السكريبت (موبايل أو تابلت الميسّر):\n" + L.scr +
        "\n\n🖥 شاشة العرض (البروجكتور):\n" + L.stage + "\n\n📱 المشاركين (ده اللي في الـQR):\n" + L.live + "\n\n✅ الفحص قبل اليوم:\n" + L.check;
    } else s += "👀 متابعة اللوحة:\n" + L.con + "\n\n📜 السكريبت:\n" + L.scr + "\n\n🖥 الشاشة:\n" + L.stage;
    return s;
  }

  function staffTab() {
    var h = '<div class="panel"><h2>ضيف ميسّر</h2><div class="meta">بيتعمل له حساب دخول (إيميل وكلمة سر)، ومن صفحته بيعمل جلساته بروابطها. ولو الإيميل ليه حساب قبل كده في المنصة، بيتضاف للفريق وبيدخل بكلمة السر بتاعته.</div>' +
      '<div class="grid2"><div><label>الاسم</label><input id="sN" placeholder="مثلًا: أحمد علي"></div>' +
      '<div><label>الإيميل</label><input id="sE" type="email" placeholder="name@gmail.com"></div>' +
      '<div><label>المحافظة</label><input id="sG" placeholder="مثلًا: سوهاج"></div>' +
      '<div><label>رقم الواتساب (اختياري)</label><input id="sP" dir="ltr" placeholder="01xxxxxxxxx"></div>' +
      '<div><label>كلمة السر الأولى (يغيّرها بعد كده)</label><input id="sW" dir="ltr" value="' + genPw() + '"></div></div>' +
      '<div class="ctr" style="margin-top:12px"><button class="b dark" data-act="addstaff">ضيف الميسّر</button></div><div class="err" id="sErr"></div>';
    if (lastAdd) h += '<div class="box"><b>' + esc(lastAdd.title) + '</b><div class="meta">' + esc(lastAdd.note) + '</div><div class="msg">' + esc(lastAdd.msg) + '</div>' +
      '<div class="ctr"><a class="b green sm" target="_blank" href="' + esc(wa(lastAdd.msg, lastAdd.phone)) + '">📲 ابعتها واتساب</a><button class="b sm" data-act="copy" data-u="' + esc(lastAdd.msg) + '">انسخ الرسالة</button><button class="b sm" data-act="clradd">تمام</button></div></div>';
    h += "</div>";
    var es = Object.keys(staff).sort(function (a, b) { return (staff[a].name || a).localeCompare(staff[b].name || b, "ar"); });
    h += '<div class="panel"><h2>الميسّرين <span class="meta">(' + ar(es.length) + ")</span></h2>";
    if (!es.length) return h + '<div class="empty">مفيش ميسّرين لسه.</div></div>';
    var cnt = {}; Object.keys(sessions).forEach(function (s) { var o = sessions[s].owner; if (o) cnt[o] = (cnt[o] || 0) + 1; });
    h += '<table><thead><tr><th>الاسم</th><th>المحافظة</th><th>جلساته</th><th>الحالة</th><th></th></tr></thead><tbody>';
    es.forEach(function (e) {
      var x = staff[e], off = x.active === false;
      h += '<tr data-e="' + esc(e) + '"><td><b>' + esc(x.name || "—") + '</b><br><span class="e">' + esc(e) + "</span>" + (x.phone ? '<br><span class="e">' + esc(x.phone) + "</span>" : "") + "</td>" +
        "<td>" + esc(x.gov || "—") + "</td><td>" + ar(cnt[e] || 0) + "</td>" +
        '<td><span class="pill ' + (off ? "off" : "blue") + '">' + (off ? "موقوف" : "شغّال") + "</span></td>" +
        '<td><div class="ctr"><a class="b sm green" target="_blank" href="' + esc(wa(welcomeMsg(x, null), x.phone)) + '">📲 رسالة الدخول</a>' +
        '<button class="b sm" data-act="reset">ابعت له رابط كلمة سر جديدة</button>' +
        '<button class="b sm" data-act="toggle">' + (off ? "شغّله" : "وقّفه") + '</button>' +
        '<button class="b sm red" data-act="rmstaff">شيله</button></div>' + (msgFor[e] ? '<div class="okm">' + esc(msgFor[e]) + "</div>" : "") + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }

  function welcomeMsg(x, pw) {
    return "أهلًا " + (x.name || "") + " 🌿\nده حسابك في منظومة «الميزان»:\n\n" +
      "📧 الإيميل: " + x.email + "\n🔑 كلمة السر: " + (pw || "(كلمة السر اللي اتبعتتلك قبل كده — ولو ناسيها دوس «نسيت كلمة السر» في الصفحة)") + "\n\n" +
      "🗂 صفحتك (جلساتك وروابطها):\n" + TEAM + "\n\n" +
      "من هناك تعمل جلسة لكل يوم أو محافظة، وكل جلسة ليها روابطها لوحدها: لوحة التحكم، والسكريبت، وشاشة العرض، ورابط المشاركين.\n" +
      (pw ? "وأول ما تدخل غيّر كلمة السر من «حسابي»." : "");
  }

  function accTab() {
    return '<div class="panel"><h2>حسابي</h2><div class="meta">' + esc(me.name) + " · <span dir=\"ltr\">" + esc(me.email) + "</span></div>" +
      '<div class="grid2"><div><label>كلمة السر الحالية</label><input id="aC" type="password" autocomplete="current-password"></div><div></div>' +
      '<div><label>كلمة السر الجديدة (٦ حروف أو أرقام على الأقل)</label><input id="aN" type="password" autocomplete="new-password"></div>' +
      '<div><label>اكتبها تاني</label><input id="aN2" type="password" autocomplete="new-password"></div></div>' +
      '<div class="ctr" style="margin-top:12px"><button class="b dark" data-act="chpw">غيّر كلمة السر</button><button class="b" data-act="mereset">ابعتلي رابط تغيير على إيميلي</button></div><div class="err" id="aErr"></div></div>' +
      '<div class="panel"><h2>إزاي بتشتغل</h2><div class="meta" style="font-size:.9rem;line-height:2">' +
      "• كل يوم أو محافظة = جلسة جديدة من «+ جلسة جديدة». ليها روابط لوحدها، والمشاركين بتوعها ما بيتخلطوش مع حد.<br>" +
      "• لوحة التحكم والسكريبت بيتحكموا في جلستك إنت بس. لو فتحت رابط جلسة حد تاني، هتشتغل «متابعة» من غير تحكم.<br>" +
      "• «شريك في التحكم» = ميسّر تاني معاك في نفس اليوم، يقدر يقلّب الشرايح ويوزّع الحلقات.<br>" +
      "• «افتحها للفريق» = أي ميسّر يقدر يتابعها (زي جلسات الكامب)، من غير ما يحرّك حاجة.</div></div>";
  }

  /* ───────────── الأفعال ───────────── */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab],[data-act]"); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; editing = null; paint(); return; }
    var act = t.dataset.act, cardEl = t.closest("[data-sid]"), sid = cardEl && cardEl.dataset.sid, d = sid && sessions[sid];
    var row = t.closest("tr[data-e]"), em = row && row.dataset.e;
    switch (act) {
      case "out": auth.signOut(); break;
      case "new": showNew = !showNew; paint(); if (showNew) setTimeout(function () { var i = $("nT"); i && i.focus(); }, 30); break;
      case "create": createSession(); break;
      case "copy": copy(t.dataset.u); break;
      case "copyall": copy(linksMsg(sid)); break;
      case "edit": editing = editing === sid ? null : sid; paint(); break;
      case "save": saveEdit(sid); break;
      case "open": upd(sid, { open: !d.open }, d.open ? "اتقفلت على الفريق" : "بقت مفتوحة للفريق يتابعوها"); break;
      case "arch": upd(sid, { archived: !d.archived }, d.archived ? "رجعت" : "اتأرشفت"); break;
      case "del": delSession(sid); break;
      case "part": var sel = $("pa-" + sid); if (sel && sel.value) upd(sid, { editors: FV.arrayUnion(sel.value) }, "اتضاف شريك ✓"); break;
      case "unpart": upd(sid, { editors: FV.arrayRemove(t.dataset.e) }, "اتشال"); break;
      case "addstaff": addStaff(); break;
      case "clradd": lastAdd = null; paint(); break;
      case "reset": auth.sendPasswordResetEmail(em).then(function () { msgFor[em] = "اتبعت رابط تغيير كلمة السر على إيميله ✓"; paint(); }).catch(function (x) { alert(MZ.errText(x)); }); break;
      case "toggle": MZ.staffRef(em).update({ active: staff[em].active === false }).then(reload).catch(function (x) { alert(MZ.errText(x)); }); break;
      case "rmstaff":
        if (!confirm("تشيل «" + (staff[em].name || em) + "» من الفريق؟\nمش هيقدر يدخل اللوحة تاني، وجلساته هتفضل موجودة (وإنت تقدر تنقلها لحد تاني من «تعديل»).")) return;
        MZ.staffRef(em).delete().then(reload).catch(function (x) { alert(MZ.errText(x)); }); break;
      case "chpw": changePw(); break;
      case "mereset": auth.sendPasswordResetEmail(me.email).then(function () { $("aErr").innerHTML = '<span class="okm">اتبعت على ' + esc(me.email) + " ✓</span>"; }).catch(function (x) { $("aErr").textContent = MZ.errText(x); }); break;
    }
  });

  function upd(sid, patch, ok) {
    MZ.sRef(sid).update(patch).then(function () { toast(ok || "اتحفظ ✓"); return reload(); }).catch(function (e) { alert(MZ.errText(e)); });
  }

  function createSession() {
    var title = val("nT"), gov = val("nG"), date = val("nD"), owner = me.role === "super" && $("nO") ? $("nO").value : me.email, er = $("nErr");
    if (!title) { er.textContent = "اكتب اسم للجلسة."; return; }
    er.textContent = "بنعمل الجلسة…";
    var sid = newSid(), now = Date.now();
    var ownerName = owner === me.email ? me.name : ((staff[owner] && staff[owner].name) || owner);
    MZ.sRef(sid).get().then(function (x) {
      if (x.exists) sid = newSid() + "x";
      return MZ.sRef(sid).set({ owner: owner, ownerName: ownerName, title: title, gov: gov, date: date, editors: [], open: false, archived: false,
        createdAt: now, createdBy: me.email, state: MZ_STATES[0].id, step: 0, rev: 1, stateAt: now, stepAt: now, support: MZ_SETTINGS.supportName });
    }).then(function () { showNew = false; toast("الجلسة اتعملت ✓"); return reload(); })
      .catch(function (e) { er.textContent = MZ.errText(e); });
  }

  function saveEdit(sid) {
    var patch = { title: val("eT"), gov: val("eG"), date: val("eD") };
    if (!patch.title) { $("eErr").textContent = "اكتب اسم للجلسة."; return; }
    if (me.role === "super" && $("eO")) { patch.owner = $("eO").value; patch.ownerName = patch.owner === me.email ? me.name : ((staff[patch.owner] && staff[patch.owner].name) || patch.owner); }
    MZ.sRef(sid).update(patch).then(function () { editing = null; toast("اتحفظ ✓"); return reload(); }).catch(function (e) { $("eErr").textContent = MZ.errText(e); });
  }

  function delSession(sid) {
    var d = sessions[sid];
    if (!confirm("تمسح «" + (d.title || sid) + "» نهائي؟\nهيتمسح معاها الحضور والتصويت والحلقات. والروابط بتاعتها هتبطل.")) return;
    if (prompt("للتأكيد اكتب كلمة: امسح") !== "امسح") return;
    function wipe(col) { return col.get().then(function (q) { return Promise.all(q.docs.map(function (x) { return x.ref.delete(); })); }); }
    Promise.all([wipe(MZ.pCol(sid)), wipe(MZ.vCol(sid)), MZ.aggRef(sid).delete().catch(function () {})])
      .then(function () { return MZ.sRef(sid).delete(); })
      .then(function () { toast("اتمسحت"); return reload(); })
      .catch(function (e) { alert(MZ.errText(e)); });
  }

  /* حساب دخول جديد من غير ما الأدمن يخرج: بنستعمل نسخة تانية من فايربيز */
  function createAuthUser(email, pw) {
    var app2 = null;
    (firebase.apps || []).forEach(function (a) { if (a.name === "mzAdd") app2 = a; });
    if (!app2) app2 = firebase.initializeApp(MZ_FIREBASE, "mzAdd");
    var a2 = app2.auth();
    return a2.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(function () {})
      .then(function () { return a2.createUserWithEmailAndPassword(email, pw); })
      .then(function () { return a2.signOut().catch(function () {}).then(function () { return true; }); },
            function (e) { if (e && e.code === "auth/email-already-in-use") return false; throw e; });
  }

  function addStaff() {
    var name = val("sN"), email = val("sE").toLowerCase(), gov = val("sG"), phone = val("sP"), pw = val("sW"), er = $("sErr");
    if (!name || !email) { er.textContent = "اكتب الاسم والإيميل."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { er.textContent = MZ.errText({ code: "auth/invalid-email" }); return; }
    if (MZ_ADMINS.indexOf(email) !== -1) { er.textContent = "ده إيميل الأدمن الرئيسي نفسه."; return; }
    if (staff[email] && !confirm("«" + email + "» موجود في الفريق. تحدّث بياناته؟")) return;
    if (pw.length < 6) { er.textContent = MZ.errText({ code: "auth/weak-password" }); return; }
    er.textContent = "بنعمل الحساب…";
    createAuthUser(email, pw).then(function (created) {
      return MZ.staffRef(email).set({ name: name, email: email, gov: gov, phone: phone, active: true, createdAt: Date.now(), by: me.email }, { merge: true })
        .then(function () { return created; });
    }).then(function (created) {
      var x = { name: name, email: email };
      lastAdd = created
        ? { title: "اتعمل حساب " + name + " ✓", note: "ابعتله الرسالة دي. كلمة السر دي مش هتظهر تاني، فابعتها دلوقتي.", msg: welcomeMsg(x, pw), phone: phone }
        : { title: name + " اتضاف للفريق ✓", note: "الإيميل ده كان عنده حساب قبل كده (مثلًا في منصة منظور الفؤاد)، فهيدخل بكلمة السر بتاعته هو، مش اللي فوق. ولو ناسيها: «ابعت له رابط كلمة سر جديدة».", msg: welcomeMsg(x, null), phone: phone };
      er.textContent = ""; return reload();
    }).catch(function (e) { er.textContent = MZ.errText(e); });
  }

  function changePw() {
    var c = $("aC").value, n = $("aN").value, n2 = $("aN2").value, er = $("aErr");
    if (!c) { er.textContent = "اكتب كلمة السر الحالية."; return; }
    if (n.length < 6) { er.textContent = MZ.errText({ code: "auth/weak-password" }); return; }
    if (n !== n2) { er.textContent = "كلمة السر الجديدة مش زي بعضها في المرتين."; return; }
    var u = auth.currentUser; er.textContent = "بنغيّر…";
    u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(me.email, c))
      .then(function () { return u.updatePassword(n); })
      .then(function () { er.innerHTML = '<span class="okm">كلمة السر اتغيّرت ✓</span>'; $("aC").value = $("aN").value = $("aN2").value = ""; })
      .catch(function (e) { er.textContent = MZ.errText(e); });
  }
})();
