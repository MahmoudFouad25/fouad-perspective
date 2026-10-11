/* سيرفر اختبار محلي: بيقدّم الريبو، ومعاه «فايربيز وهمي» على /__api بيطبّق نفس منطق firestore.rules
   للمجموعة maqyas_axes_v2. فايربيز الحقيقي مش متاح من بيئة الاختبار، فده بيختبر الصفحات + منطق القواعد،
   مش ملف القواعد نفسه (ده بيتجرّب بعد النشر، الخطوات في README.md).
   التشغيل:  node three-axes/v2/app/tests/server.js 8765   (من جذر الريبو) */
"use strict";
var http = require("http"), fs = require("fs"), path = require("path");
var ROOT = path.resolve(__dirname, "../../../..");
var PORT = +process.argv[2] || 8765;
var ADMINS = ["admin@fouad-academy.com"];
var ADMIN_KEYS = ["override", "resultHistory", "adminUpdatedAt", "adminNote"];
var DB = {}, AUTH = {}, LOG = [];   // DB[col][id] = data · AUTH[email] = {uid, password}

function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function resolve(v, prev) {
  if (v && typeof v === "object" && v.__fv) {
    if (v.__fv === "ts") return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    if (v.__fv === "union") { var arr = Array.isArray(prev) ? prev.slice() : []; v.v.forEach(function (x) { if (!arr.some(function (y) { return eq(x, y); })) arr.push(x); }); return arr; }
    if (v.__fv === "del") return undefined;
  }
  if (Array.isArray(v)) return v.map(function (x) { return resolve(x); });
  if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { var r = resolve(v[k], prev && prev[k]); if (r !== undefined) o[k] = r; }); return o; }
  return v;
}
function deepMerge(base, patch) {
  var out = clone(base) || {};
  Object.keys(patch).forEach(function (k) {
    var p = patch[k];
    if (p && typeof p === "object" && p.__fv === "del") { delete out[k]; return; }
    if (p && typeof p === "object" && !Array.isArray(p) && !p.__fv && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = deepMerge(out[k], p);
    else { var r = resolve(p, out[k]); if (r === undefined) delete out[k]; else out[k] = r; }
  });
  return out;
}
function affected(a, b) {
  var keys = {}; Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (k) { keys[k] = 1; });
  return Object.keys(keys).filter(function (k) { return !eq((a || {})[k], (b || {})[k]); });
}

/* ───── نفس firestore.rules للمجموعة maqyas_axes_v2 ───── */
function lower(s) { return String(s || "").toLowerCase(); }
function isAdmin(auth) { return auth && auth.email && ADMINS.indexOf(lower(auth.email)) !== -1; }
function isOwner(auth, uid) {
  var u = (DB.users || {})[uid];
  return !!(auth && auth.email && u && u.personalInfo && u.personalInfo.email && lower(u.personalInfo.email) === lower(auth.email));
}
function allow(op, col, id, auth, before, after) {
  if (col !== "maqyas_axes_v2") return true;     // باقي المجموعات مفتوحة زي القاعدة العامة النهارده
  if (op === "get") return isAdmin(auth) || isOwner(auth, id);
  if (op === "list") return isAdmin(auth);
  if (op === "delete") return false;
  if (!before) {   // create
    return isOwner(auth, id) && after.userId === id && after.authUid === auth.uid && after.status === "شغال" &&
      !Object.keys(after).some(function (k) { return ADMIN_KEYS.indexOf(k) !== -1; });
  }
  var ch = affected(before, after);
  if (isOwner(auth, id) && before.status === "شغال" && after.userId === id && after.authUid === auth.uid &&
      !ch.some(function (k) { return ADMIN_KEYS.indexOf(k) !== -1; })) return true;
  if (isOwner(auth, id) && before.status === "خلص" &&
      ch.every(function (k) { return ["rating", "reportViewedAt", "purchase", "updatedAt"].indexOf(k) !== -1; })) return true;
  if (isAdmin(auth) && ch.every(function (k) { return ["override", "result", "summary", "resultHistory", "engineVersion", "configVersion", "textsVersion", "adminUpdatedAt", "adminNote"].indexOf(k) !== -1; })) return true;
  return false;
}

function api(body) {
  var col = body.col, id = body.id, auth = body.auth || null, c = (DB[col] = DB[col] || {});
  function deny() { LOG.push({ denied: body.op, col: col, id: id, who: auth && auth.email }); return { error: "permission-denied" }; }
  switch (body.op) {
    case "get":
      if (!allow("get", col, id, auth)) return deny();
      return { exists: !!c[id], data: clone(c[id]) || null };
    case "list":
      if (!allow("list", col, null, auth)) return deny();
      return { docs: Object.keys(c).map(function (k) { return { id: k, data: c[k] }; }) };
    case "where":
      if (col === "maqyas_axes_v2" && !isAdmin(auth)) return deny();
      return { docs: Object.keys(c).filter(function (k) { var v = body.field.split(".").reduce(function (o, p) { return o && o[p]; }, c[k]); return v === body.value; })
        .slice(0, body.limit || 1e9).map(function (k) { return { id: k, data: c[k] }; }) };
    case "set": case "update": {
      var before = c[id] ? clone(c[id]) : null;
      if (body.op === "update" && !before) return { error: "not-found" };
      var after = body.merge || body.op === "update" ? deepMerge(before || {}, body.data) : resolve(body.data);
      if (body.op === "update") { after = clone(before); Object.keys(body.data).forEach(function (k) { var p = body.data[k]; if (p && p.__fv === "del") delete after[k]; else after[k] = resolve(p, after[k]); }); }
      if (!allow("write", col, id, auth, before, after)) return deny();
      c[id] = after; return { ok: true };
    }
    case "delete":
      if (!allow("delete", col, id, auth)) return deny();
      delete c[id]; return { ok: true };
    case "signIn": {
      var a = AUTH[lower(body.email)];
      if (!a) return { error: "auth/user-not-found" };
      if (a.password !== body.password) return { error: "auth/wrong-password" };
      return { user: { uid: a.uid, email: body.email } };
    }
    case "createUser": {
      if (AUTH[lower(body.email)]) return { error: "auth/email-already-in-use" };
      var uid = "auth_" + Math.random().toString(36).slice(2, 10);
      AUTH[lower(body.email)] = { uid: uid, password: body.password };
      return { user: { uid: uid, email: body.email } };
    }
    // للاختبار بس
    case "_reset": DB = body.db || {}; AUTH = body.auth || {}; LOG = []; return { ok: true };
    case "_dump": return { db: DB, auth: AUTH, log: LOG };
  }
  return { error: "bad-op" };
}

var TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8" };
http.createServer(function (req, res) {
  if (req.url.indexOf("/__api") === 0) {
    var b = ""; req.on("data", function (d) { b += d; });
    req.on("end", function () {
      var out; try { out = api(JSON.parse(b || "{}")); } catch (e) { out = { error: String(e) }; }
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(out));
    });
    return;
  }
  var u = decodeURIComponent(req.url.split("?")[0]).replace(/^\/fouad-perspective/, "");
  var f = path.join(ROOT, u); if (u.slice(-1) === "/") f = path.join(f, "index.html");
  if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, function () { console.log("http://127.0.0.1:" + PORT + "/fouad-perspective/"); });
