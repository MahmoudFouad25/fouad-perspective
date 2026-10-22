/*
 * تسجيل أوّلي لسجل النقاط — server/backfill-points-ledger.js
 *
 * بيتشغّل مرة واحدة من صفحة أدمن (الأدمن داخل)، علشان الدروس والتمارين والتأملات اللي العملاء
 * خلّصوها قبل ما النقاط تتنقل للسيرفر تتسجل «اتصرفت»، فمحدش يقدر ياخد نقاطها تاني.
 * مش بيدّي ولا بياخد نقاط من حد. بيكتب في points_ledger بس، وما بيكتبش فوق سطر موجود.
 *
 * الاستعمال: BackfillPointsLedger.run({ dryRun: true }) ← بيعدّ بس
 *            BackfillPointsLedger.run({ dryRun: false }) ← بيكتب
 */
(function () {
  'use strict';

  var PILLARS = ['courage', 'mirror', 'action', 'witness'];

  function flat(modules) {
    var out = [];
    (Array.isArray(modules) ? modules : []).forEach(function (m) {
      (Array.isArray(m && m.lessons) ? m.lessons : []).forEach(function (l) {
        out.push({ contentId: (l && l.libraryContentId) || null });
      });
    });
    return out;
  }

  function lid(parts) { return parts.join('__').replace(/\//g, '_').slice(0, 700); }

  async function run(opts) {
    opts = opts || {};
    var db = firebase.firestore();
    var FV = firebase.firestore.FieldValue;
    var courses = {};
    async function course(id) {
      if (!(id in courses)) {
        var s = await db.collection('courses').doc(id).get();
        courses[id] = flat(s.exists ? s.data().modules : []);
      }
      return courses[id];
    }

    var existing = new Set();
    (await db.collection('points_ledger').get()).forEach(function (d) { existing.add(d.id); });

    var want = {};   // id → data
    function add(id, data) { if (!existing.has(id) && !want[id]) want[id] = data; }

    var users = await db.collection('users').get();
    for (var ui = 0; ui < users.docs.length; ui++) {
      var ud = users.docs[ui], u = ud.data() || {}, uid = ud.id;
      var progress = u.progress || {};
      var courseIds = new Set(Object.keys(progress));
      (u.enrollments || []).forEach(function (e) { if (e && e.courseId) courseIds.add(e.courseId); });

      // ١) الدروس
      for (var cid in progress) {
        var p = progress[cid] || {}, fl = await course(cid);
        (p.completedLessonsIds || []).forEach(function (c) {
          if (c) add(lid([uid, cid, 'c_' + c]), { userId: uid, courseId: cid, contentId: c, kind: 'lesson' });
        });
        (p.completedLessons || []).forEach(function (i) {
          var l = fl[i];
          if (l && l.contentId) add(lid([uid, cid, 'c_' + l.contentId]), { userId: uid, courseId: cid, contentId: l.contentId, kind: 'lesson' });
          else if (Number.isInteger(i)) add(lid([uid, cid, 'i_' + i]), { userId: uid, courseId: cid, lessonIndex: i, kind: 'lesson' });
        });
      }

      // ٢) التمارين
      var ap = await db.collection('users').doc(uid).collection('awakening_progress').get();
      ap.forEach(function (d) {
        var ex = (d.data() || {}).exercises || {};
        Object.keys(ex).forEach(function (exId) {
          if (!ex[exId] || !ex[exId].completed) return;
          PILLARS.forEach(function (pk) {
            add(lid([uid, d.id, 'p_ex_' + exId + '_' + pk]), { userId: uid, courseId: d.id, contentId: exId, pillarKey: pk, kind: 'pillar' });
          });
        });
      });

      // ٣) التأملات: الوثيقة فيها المحتوى بس، فبنسجلها لكل كورس عند العميل فيه المحتوى ده
      async function coursesWith(contentId) {
        var out = [];
        for (var c of courseIds) { if ((await course(c)).some(function (l) { return l.contentId === contentId; })) out.push(c); }
        return out;
      }
      var rm = await db.collection('users').doc(uid).collection('reflectionMoments').get();
      for (var r of rm.docs) {
        var x = r.data() || {};
        if (!x.contentId || !Number.isInteger(x.momentIndex)) continue;
        for (var c1 of await coursesWith(x.contentId)) PILLARS.forEach(function (pk) {
          add(lid([uid, c1, 'p_rm' + x.momentIndex + '_' + x.contentId + '_' + pk]), { userId: uid, courseId: c1, contentId: x.contentId, pillarKey: pk, kind: 'pillar' });
        });
      }
      var ir = await db.collection('users').doc(uid).collection('immediateReflections').get();
      for (var r2 of ir.docs) {
        var y = r2.data() || {};
        if (!y.contentId) continue;
        for (var c2 of await coursesWith(y.contentId)) PILLARS.forEach(function (pk) {
          add(lid([uid, c2, 'p_ir_' + y.contentId + '_' + pk]), { userId: uid, courseId: c2, contentId: y.contentId, pillarKey: pk, kind: 'pillar' });
        });
      }
    }

    var ids = Object.keys(want);
    var summary = { users: users.size, alreadyInLedger: existing.size, toWrite: ids.length,
      lessons: ids.filter(function (i) { return want[i].kind === 'lesson'; }).length,
      pillars: ids.filter(function (i) { return want[i].kind === 'pillar'; }).length, written: 0 };
    if (opts.dryRun !== false) return summary;

    for (var k = 0; k < ids.length; k += 400) {
      var batch = db.batch();
      ids.slice(k, k + 400).forEach(function (id) {
        batch.set(db.collection('points_ledger').doc(id), Object.assign({}, want[id], { points: 0, legacy: true, at: FV.serverTimestamp() }));
      });
      await batch.commit();
      summary.written += Math.min(400, ids.length - k);
    }
    return summary;
  }

  window.BackfillPointsLedger = { run: run };
})();
