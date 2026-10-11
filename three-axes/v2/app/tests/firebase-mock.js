/* فايربيز وهمي (نفس واجهة compat 8.10.1 اللي الصفحات بتستعملها) بيكلّم /__api في سيرفر الاختبار.
   الاختبار بيحطه مكان روابط gstatic. ما يتستعملش في الموقع. */
(function () {
  if (window.firebase && window.firebase.__mock) return;
  var KEY = "__mockAuth";
  function call(body) {
    body.auth = auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : null;
    return fetch("/__api", { method: "POST", body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (o) {
      if (o.error) { var e = new Error(o.error); e.code = o.error.indexOf("auth/") === 0 ? o.error : o.error; throw e; }
      return o;
    });
  }
  function enc(v) {
    if (v && v.__sentinel) return v.__sentinel;
    if (Array.isArray(v)) return v.map(enc);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { if (v[k] !== undefined) o[k] = enc(v[k]); }); return o; }
    return v;
  }
  function ts(o) { // Timestamp
    if (o && typeof o === "object" && typeof o.seconds === "number" && typeof o.nanoseconds === "number" && Object.keys(o).length === 2)
      return { seconds: o.seconds, nanoseconds: o.nanoseconds, toMillis: function () { return o.seconds * 1000; }, toDate: function () { return new Date(o.seconds * 1000); } };
    if (Array.isArray(o)) return o.map(ts);
    if (o && typeof o === "object") { var r = {}; Object.keys(o).forEach(function (k) { r[k] = ts(o[k]); }); return r; }
    return o;
  }
  function snap(id, data) { return { id: id, exists: !!data, data: function () { return data ? ts(JSON.parse(JSON.stringify(data))) : undefined; } }; }

  var listeners = [];
  var auth = {
    currentUser: (function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } })(),
    onAuthStateChanged: function (cb) { listeners.push(cb); setTimeout(function () { cb(auth.currentUser); }, 30); return function () { listeners = listeners.filter(function (x) { return x !== cb; }); }; },
    _set: function (u) { auth.currentUser = u; try { if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY); } catch (e) {} listeners.forEach(function (cb) { cb(u); }); },
    signInWithEmailAndPassword: function (email, pw) { return call({ op: "signIn", email: email, password: pw }).then(function (o) { auth._set(o.user); return { user: o.user }; }); },
    createUserWithEmailAndPassword: function (email, pw) { return call({ op: "createUser", email: email, password: pw }).then(function (o) { auth._set(o.user); return { user: o.user }; }); },
    signOut: function () { auth._set(null); return Promise.resolve(); },
    setPersistence: function () { return Promise.resolve(); }
  };
  function docRef(col, id) {
    return {
      id: id,
      get: function () { return call({ op: "get", col: col, id: id }).then(function (o) { return snap(id, o.data); }); },
      set: function (d, opt) { return call({ op: "set", col: col, id: id, data: enc(d), merge: !!(opt && opt.merge) }); },
      update: function (d) { return call({ op: "update", col: col, id: id, data: enc(d) }); },
      delete: function () { return call({ op: "delete", col: col, id: id }); }
    };
  }
  function query(col, field, value, limit) {
    return {
      limit: function (n) { return query(col, field, value, n); },
      get: function () {
        var p = field ? call({ op: "where", col: col, field: field, value: value, limit: limit }) : call({ op: "list", col: col });
        return p.then(function (o) { var docs = o.docs.map(function (d) { return snap(d.id, d.data); }); return { empty: !docs.length, docs: docs, size: docs.length }; });
      }
    };
  }
  var db = {
    settings: function () {},
    collection: function (col) {
      var q = query(col);
      q.doc = function (id) { return docRef(col, id); };
      q.where = function (f, op, v) { return query(col, f, v); };
      return q;
    }
  };
  function firestore() { return db; }
  firestore.FieldValue = {
    serverTimestamp: function () { return { __sentinel: { __fv: "ts" } }; },
    arrayUnion: function () { return { __sentinel: { __fv: "union", v: enc([].slice.call(arguments)) } }; },
    delete: function () { return { __sentinel: { __fv: "del" } }; },
    increment: function (n) { return n; }
  };
  var apps = [];
  window.firebase = {
    __mock: true, apps: apps,
    initializeApp: function (c) { apps.push({ options: c }); return apps[0]; },
    auth: function () { return auth; }, firestore: firestore
  };
  window.firebase.auth.Auth = { Persistence: { LOCAL: "local", SESSION: "session" } };
})();
