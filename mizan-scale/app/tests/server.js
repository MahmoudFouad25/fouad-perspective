/* سيرفر اختبار محلي لصفحة «ميزان المتطوع»: بيقدّم الريبو، ومعاه Firestore وهمي على /__api
   بيطبّق نفس منطق mizan-scale/firestore.rules للمجموعة mizan_scale، ونفس حدود Firestore في البيانات
   (مفيش array جوه array، ومفيش undefined، والوثيقة أقل من ١ ميجا).
   ده بيختبر الصفحة ومنطق القواعد، مش ملف القواعد نفسه على فايربيز (ده الخطوة ٤).
   التشغيل:  node mizan-scale/app/tests/server.js 8790   (من أي مكان) */
"use strict";
var http = require("http"), fs = require("fs"), path = require("path");
var ROOT = path.resolve(__dirname, "../../..");
var PORT = +process.argv[2] || 8790;
var VOL = ["v", "address", "addressAt", "status", "screen", "device", "questionsVersion", "questionsHash", "qVersion",
  "startedAt", "updatedAtMs", "finishedAt", "period", "client", "st", "adaptive",
  "updatedAt", "lastPush", "result", "summary", "engineVersion", "configVersion", "textsVersion", "computedAt",
  "rating", "reportViewedAt"];
var AFTER_DONE = ["rating", "reportViewedAt", "address", "addressAt", "updatedAt", "updatedAtMs", "lastPush"];
var DB = {}, LOG = [], MODE = { get: "ok", set: "ok" };   // ok | hang | denied | unavailable

function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function resolve(v) {
  if (v && typeof v === "object" && v.__fv === "ts") return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
  if (Array.isArray(v)) return v.map(resolve);
  if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = resolve(v[k]); }); return o; }
  return v;
}
// set(…, {merge:true}) في Firestore: الـmaps بتتدمج، وأي حاجة تانية بتتبدل
function deepMerge(base, patch) {
  var out = clone(base) || {};
  Object.keys(patch).forEach(function (k) {
    var p = patch[k];
    if (p && typeof p === "object" && !Array.isArray(p) && !p.__fv && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = deepMerge(out[k], p);
    else out[k] = resolve(p);
  });
  return out;
}
// حدود Firestore نفسها: لو الصفحة بعتت حاجة زي دي، فايربيز الحقيقي كان هيرفضها
function invalid(v, where, inArray) {
  if (v === undefined) return "undefined في " + where;
  if (Array.isArray(v)) {
    if (inArray) return "array جوه array في " + where;
    for (var i = 0; i < v.length; i++) { var e = invalid(v[i], where + "[" + i + "]", true); if (e) return e; }
    return null;
  }
  if (v && typeof v === "object") {
    var ks = Object.keys(v);
    for (var j = 0; j < ks.length; j++) {
      if (ks[j] === "" || /^__.*__$/.test(ks[j])) return "اسم حقل ممنوع في " + where;
      var e2 = invalid(v[ks[j]], where + "." + ks[j], false); if (e2) return e2;
    }
  }
  return null;
}
function changed(a, b) {
  var keys = {}; Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (k) { keys[k] = 1; });
  return Object.keys(keys).filter(function (k) { return !eq((a || {})[k], (b || {})[k]); });
}
function hasOnly(list, allowed) { return list.every(function (k) { return allowed.indexOf(k) !== -1; }); }

/* ───── نفس firestore.rules ───── */
function canUpdate(before, after) {
  if (!before) return false;                                 // create للأدمن بس
  if (before.revoked === true) return false;
  var ch = changed(before, after);
  if (!hasOnly(ch, VOL)) return false;
  if (before.status === "خلص" && !hasOnly(ch, AFTER_DONE)) return false;
  return true;
}

function api(body, res) {
  function send(o) { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(o)); }
  var op = body.op, col = body.col, id = body.id;
  if (op === "seed") { (DB[col] = DB[col] || {})[id] = body.data; return send({ ok: true }); }
  if (op === "mode") { Object.keys(body.mode).forEach(function (k) { MODE[k] = body.mode[k]; }); return send({ ok: true, mode: MODE }); }
  if (op === "dump") return send({ db: DB, log: LOG });
  if (op === "reset") { DB = {}; LOG = []; MODE = { get: "ok", set: "ok" }; return send({ ok: true }); }
  var mode = op === "get" ? MODE.get : MODE.set;
  LOG.push({ op: op, col: col, id: id, mode: mode, keys: body.data ? Object.keys(body.data) : null, reason: body.data && body.data.lastPush });
  if (mode === "hang") return;                                         // ما بيردّش أبدًا
  if (mode === "unavailable") return send({ error: "unavailable" });
  if (mode === "denied") return send({ error: "permission-denied" });
  if (col !== "mizan_scale") return send({ error: "permission-denied" });   // القاعدة العامة مستثنية mizan.*
  var cur = (DB[col] || {})[id];
  if (op === "get") return send({ data: cur === undefined ? null : cur });
  if (op === "list") return send({ error: "permission-denied" });
  if (op === "set") {
    var bad = invalid(body.data, "data", false);
    if (bad) return send({ error: "invalid-argument", message: bad });
    var next = body.merge ? deepMerge(cur, body.data) : resolve(body.data);
    if (Buffer.byteLength(JSON.stringify(next)) > 1048000) return send({ error: "invalid-argument", message: "الوثيقة أكبر من ١ ميجا" });
    if (!canUpdate(cur, next)) return send({ error: "permission-denied" });
    DB[col][id] = next;
    return send({ ok: true });
  }
  send({ error: "unimplemented" });
}

var TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg" };
http.createServer(function (req, res) {
  if (req.url === "/__api" && req.method === "POST") {
    // البايتات بتتجمع الأول وبعدين تتحوّل نص: لو اتجمعت كنص، حرف عربي بيتقسم بين قطعتين بيبوظ (ده اللي حصل لـ«الأصالة»)
    var chunks = []; req.on("data", function (c) { chunks.push(c); }); req.on("end", function () { try { api(JSON.parse(Buffer.concat(chunks).toString("utf8")), res); } catch (e) { res.writeHead(500); res.end(String(e)); } });
    return;
  }
  var p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  var f = path.join(ROOT, p);
  if (f.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (err, data) {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(data);
  });
}).listen(PORT, function () { console.log("mizan-scale test server on :" + PORT); });
