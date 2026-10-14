/* فايربيز وهمي للاختبار بس: الاختبار بيقدّمه مكان https://www.gstatic.com/firebasejs/…/firebase-app-compat.js
   بنفس شكل مكتبة compat اللي الصفحة بتستعملها (initializeApp · firestore().settings · collection().doc().get/set
   · FieldValue.serverTimestamp)، وبيكلّم /__api في سيرفر الاختبار. الأخطاء بنفس أكواد فايربيز. */
(function () {
  if (window.firebase && window.firebase.__mock) return;
  function err(code, message) { var e = new Error(message || code); e.code = code; e.name = "FirebaseError"; return e; }
  function call(body) {
    return fetch("/__api", { method: "POST", body: JSON.stringify(body) }).then(function (r) {
      if (!r.ok) throw err("unavailable", "server " + r.status);
      return r.json();
    }, function () { throw err("unavailable", "Failed to get document because the client is offline."); })
      .then(function (o) { if (o.error) throw err(o.error, o.message); return o; });
  }
  // FieldValue وundefined: زي المكتبة الحقيقية، undefined بيترفض
  function enc(v, path) {
    if (v === undefined) throw err("invalid-argument", "Function setDoc() called with invalid data. Unsupported field value: undefined (" + path + ")");
    if (v && v.__sentinel) return v.__sentinel;
    if (Array.isArray(v)) return v.map(function (x, i) { return enc(x, path + "[" + i + "]"); });
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = enc(v[k], path + "." + k); }); return o; }
    return v;
  }
  function snap(id, data) { return { id: id, exists: !!data, data: function () { return data ? JSON.parse(JSON.stringify(data)) : undefined; } }; }
  function doc(col, id) {
    return {
      id: id,
      get: function () { return call({ op: "get", col: col, id: id }).then(function (o) { return snap(id, o.data); }); },
      set: function (d, opt) {
        var data; try { data = enc(d, "data"); } catch (e) { return Promise.reject(e); }
        return call({ op: "set", col: col, id: id, data: data, merge: !!(opt && opt.merge) }).then(function () {});
      }
    };
  }
  var db = { settings: function (s) { window.__mockSettings = s; }, collection: function (col) { return { doc: function (id) { return doc(col, id); } }; } };
  var apps = [];
  function firestore() { return db; }
  firestore.FieldValue = { serverTimestamp: function () { return { __sentinel: { __fv: "ts" } }; } };
  window.firebase = { __mock: true, apps: apps, initializeApp: function (c) { apps.push({ options: c }); window.__mockConfig = c; return apps[0]; }, firestore: firestore };
})();
