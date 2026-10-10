/* =====================================================================
   engine.js — محرك «مقياس المحاور ٢»
   ---------------------------------------------------------------------
   دالة نقية: score(answers, items, config [, opts]) ← نتيجة.
   مفيش DOM ولا فايربيز. بيشتغل في المتصفح (window.AxesV2Engine) وفي Node (require).
   المواصفات بالكلام: three-axes/v2/engine-spec.md
   • items  = engine/items.json (بيتولّد من الدوك بـ pilot/build_items.py، ونسخته مقفولة)
   • config = engine/config.js (كل الأرقام، وكلها مبدئية)
   ===================================================================== */
(function (root) {
  "use strict";

  var ENGINE_VERSION = "2.0.0";
  var AX = ["H", "V", "A"];
  var AX_NAME = { H: "الحفظ", V: "الحيوية", A: "الانتماء" };

  /* ───────── أدوات ───────── */
  function avg(a) { var v = a.filter(isNum); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null; }
  function isNum(x) { return typeof x === "number" && !isNaN(x); }
  function r2(x) { return x == null ? null : Math.round(x * 100) / 100; }
  function zero() { return { H: 0, V: 0, A: 0 }; }
  function byKind(items, kind) { return items.freq.filter(function (i) { return i.kind === kind; }); }
  function sortAxes(pts) {
    // تنازلي بالنقط. والتعادل بيفضل ظاهر في gap = 0، مش بيتحسم في السر.
    return AX.slice().sort(function (a, b) { return pts[b] - pts[a] || AX.indexOf(a) - AX.indexOf(b); });
  }
  function uniqueMax(obj, keys) {
    var best = null, tie = false;
    keys.forEach(function (k) {
      if (best === null || obj[k] > obj[best]) { best = k; tie = false; }
      else if (obj[k] === obj[best]) tie = true;
    });
    return { key: tie ? null : best, value: best === null ? null : obj[best], tie: tie };
  }
  function uniqueMin(obj, keys) {
    var neg = {}; keys.forEach(function (k) { neg[k] = -obj[k]; });
    var m = uniqueMax(neg, keys);
    return { key: m.key, value: m.value === null ? null : -m.value, tie: m.tie };
  }

  /* ───────── التحقق من ملف الأسئلة ───────── */
  function verifyIntegrity(items) {
    var errors = [];
    function err(m) { errors.push(m); }
    if (!items || !items.version) err("ملف الأسئلة مالوش رقم نسخة");
    var dims = (items.dims || []);
    if (dims.length !== 9) err("لازم ٩ أبعاد، الموجود " + dims.length);
    AX.forEach(function (a) {
      var n = dims.filter(function (d) { return d.axis === a; }).length;
      if (n !== 3) err("المحور " + a + " فيه " + n + " أبعاد بدل ٣");
    });
    function triad(list, name, count) {
      if (!list || list.length !== count) err(name + ": لازم " + count + " موقف");
      (list || []).forEach(function (it) {
        var axes = (it.options || []).map(function (o) { return o.axis; }).sort().join("");
        if (axes !== "AHV") err(it.id + ": الاختيارات التلاتة لازم تبقى محور لكل واحد");
        (it.options || []).forEach(function (o) { if (!o.dim) err(it.id + "/" + o.id + ": من غير بُعد"); });
      });
    }
    triad(items.station1, "المحطة ١", 18);
    triad(items.station2, "المحطة ٢", 6);
    var core = (items.station1 || []).filter(function (i) { return !i.light; }).length;
    if (core !== 15) err("المحطة ١: لازم ١٥ موقف أساسي، الموجود " + core);
    var KINDS = { excess: 2, deficit: 2, leave: 1, take: 1 };
    dims.forEach(function (d) {
      Object.keys(KINDS).forEach(function (k) {
        var n = items.freq.filter(function (i) { return i.dim === d.id && i.kind === k; }).length;
        if (n !== KINDS[k]) err("البُعد " + d.name + ": " + k + " = " + n + " بدل " + KINDS[k]);
      });
      var all = items.freq.filter(function (i) { return i.dim === d.id; });
      if (all.length !== 6) err("البُعد " + d.name + " فيه " + all.length + " عبارات بدل ٦");
      all.forEach(function (i) { if (i.axis !== d.axis) err(i.id + ": المحور مش متسق مع البُعد"); });
      var defs = all.filter(function (i) { return i.kind === "deficit"; });
      defs.forEach(function (i) { if (!i.face) err(i.id + ": عبارة تفريط من غير وش"); });
    });
    items.freq.forEach(function (i) {
      if (!i.kind) err(i.id + ": من غير نوع");
      if (["excess", "deficit", "leave", "take", "cycle", "fear", "freeze"].indexOf(i.kind) !== -1 && !i.axis) err(i.id + ": من غير محور");
      if (i.kind !== "adaptive" && !i.text) err(i.id + ": من غير نص");
    });
    AX.forEach(function (a) {
      [["cycle", 3], ["fear", 2], ["freeze", 2]].forEach(function (p) {
        var n = items.freq.filter(function (i) { return i.kind === p[0] && i.axis === a; }).length;
        if (n !== p[1]) err("المحور " + a + ": " + p[0] + " = " + n + " بدل " + p[1]);
      });
      var t = (items.bipolar || []).filter(function (b) { return b.axis === a; }).length;
      if (t !== 1) err("المحور " + a + ": أسئلة الطرفين = " + t + " بدل ١");
    });
    if (byKind(items, "validity").length !== 3) err("عبارات الصدق لازم ٣");
    var slots = byKind(items, "adaptive").map(function (i) { return i.slot; }).sort().join("");
    if (slots !== "1234") err("أماكن الاستبدال لازم ١ لـ٤");
    if (!items.adaptive || items.adaptive.rows.length !== 6 || !items.adaptive.general) err("جدول الاستبدال لازم ٦ صيغ + صيغة عامة");
    else items.adaptive.rows.concat([items.adaptive.general]).forEach(function (r, k) {
      if (!r.slots || r.slots.length !== 4 || r.slots.some(function (s) { return !s; })) err("صيغة استبدال " + (k + 1) + " ناقصة");
    });
    return { ok: errors.length === 0, errors: errors };
  }

  /* ───────── توحيد شكل الإجابات ─────────
     بيقبل شكل المحرك:
       { questionsVersion, period:{selected,impact}, triad:{s1n1:{closest,farthest,none}}, freq:{s3n1:0..4},
         bipolar:{s6t1:1..5}, adaptiveShown:{row}, timing:{"3":{startedAt,endedAt}} }
     أو حالة صفحة التجربة زي ما هي (state.st[...].answers). */
  function normalize(raw) {
    if (!raw) return null;
    if (raw.triad || raw.freq) return raw;
    var out = { questionsVersion: raw.qVersion && (raw.qVersion.questions || raw.qVersion.hash), period: raw.period || { selected: [] },
                triad: {}, freq: {}, bipolar: {}, timing: {}, adaptiveShown: null };
    Object.keys(raw.st || {}).forEach(function (k) {
      var st = raw.st[k], ans = st.answers || {};
      Object.keys(ans).forEach(function (id) {
        var a = ans[id];
        if (/^s[12]n/.test(id)) out.triad[id] = { closest: a.closest || null, farthest: a.farthest || null, none: !!a.none };
        else if (/^s6t/.test(id)) out.bipolar[id] = a.v;
        else out.freq[id] = a.v;
      });
      if (st.startedAt && st.endedAt) out.timing[k] = { startedAt: st.startedAt, endedAt: st.endedAt };
    });
    if (raw.adaptive) out.adaptiveShown = { row: raw.adaptive.row };
    return out;
  }

  /* ───────── ١. الترتيب ───────── */
  function ranking(ans, items, C) {
    var pts = zero(), closestCount = zero(), answered = 0, light = [], missing = [];
    items.station1.forEach(function (it) {
      var a = ans.triad[it.id], ax = {};
      it.options.forEach(function (o) { ax[o.id] = o.axis; });
      if (it.light) {
        light.push({ id: it.id, skipped: !a || !!a.none, closest: a && a.closest ? ax[a.closest] : null, farthest: a && a.farthest ? ax[a.farthest] : null });
        return;
      }
      if (!a || !a.closest || !a.farthest) { missing.push(it.id); return; }
      answered++;
      pts[ax[a.closest]] += C.ranking.closest;
      pts[ax[a.farthest]] += C.ranking.farthest;
      closestCount[ax[a.closest]]++;
    });
    var order = sortAxes(pts), gap = pts[order[0]] - pts[order[1]];
    var conf = gap >= C.ranking.strongGap ? "قوية" : gap >= C.ranking.mediumGap ? "متوسطة" : "ضعيفة";
    return {
      points: pts, order: order, main: order[0], gap: gap, confidence: conf,
      tiedTop: gap === 0,
      consistency: { closest: closestCount[order[0]], of: answered },
      closestCount: closestCount, lightSituations: light, missing: missing
    };
  }

  /* ───────── ٢. المكبوت ───────── */
  function suppressed(ans, items, C, rk) {
    var sil = zero(), missing = [];
    items.station2.forEach(function (it) {
      var a = ans.triad[it.id], ax = {};
      it.options.forEach(function (o) { ax[o.id] = o.axis; });
      if (!a || !a.closest || !a.farthest) { missing.push(it.id); return; }
      sil[ax[a.closest]] += C.silence.closest;
      sil[ax[a.farthest]] += C.silence.farthest;
    });
    var cand = uniqueMin(rk.points, AX), top = uniqueMax(sil, AX);
    var res = { silence: sil, candidate: cand.key, candidateTie: cand.tie, topSilence: top.key, topSilenceTie: top.tie,
                status: null, axis: null, reason: "", alternatives: [], missing: missing };
    if (rk.confidence === "ضعيفة") {
      res.status = "غير محسوم"; res.reason = "ثقة الترتيب ضعيفة";
    } else if (!cand.key) {
      res.status = "غير محسوم"; res.reason = "أقل محورين في نقط المحطة ١ متعادلين";
    } else if (sil[cand.key] <= 0) {
      res.status = "الأضعف بس"; res.axis = cand.key; res.reason = "المرشح سكوته صفر أو أقل";
    } else if (top.key === cand.key && sil[cand.key] >= C.silence.confirmedMin) {
      res.status = "مؤكد"; res.axis = cand.key; res.reason = "المرشح هو نفسه أعلى سكوت في المحطة ٢";
    } else {
      res.status = "غير محسوم";
      res.reason = top.tie ? "أعلى سكوت متعادل بين محورين" : "أعلى سكوت كان لمحور تاني غير المرشح";
    }
    if (res.status === "غير محسوم") {
      // القرار ١٢: التقرير يعرض الاحتمالين
      var alts = [];
      if (cand.key) alts.push(cand.key); else AX.forEach(function (a) { if (rk.points[a] === cand.value && a !== rk.main) alts.push(a); });
      if (top.key && alts.indexOf(top.key) === -1 && top.key !== rk.main) alts.push(top.key);
      res.alternatives = alts;
    }
    var mid = AX.filter(function (a) { return a !== rk.main && a !== (res.axis || cand.key); });
    res.supporting = res.axis || cand.key ? (mid.length === 1 ? mid[0] : null) : rk.order[1];
    return res;
  }

  /* صيغة الاستبدال المتكيّفة (بتتعرض في المحطة ٧، فبتتحسب بعد المحطة ٢):
     الرئيسي ← المكبوت لو الثقة مش ضعيفة والمكبوت «مؤكد» أو «الأضعف بس». غير كده الصيغة العامة. */
  function adaptiveRow(ans, items, C) {
    ans = normalize(ans);
    var rk = ranking(ans, items, C), sp = suppressed(ans, items, C, rk);
    var general = rk.confidence === "ضعيفة" || !sp.axis;
    var row = general ? items.adaptive.general : items.adaptive.rows.filter(function (r) { return r.main === rk.main && r.suppressed === sp.axis; })[0];
    return { row: general ? "عامة" : rk.main + "←" + sp.axis, main: general ? null : rk.main, suppressed: general ? null : sp.axis,
             general: general, reason: general ? (rk.confidence === "ضعيفة" ? "ثقة الترتيب ضعيفة" : "المكبوت غير محسوم") : "الرئيسي والمكبوت واضحين",
             slots: row.slots };
  }

  /* ───────── ٤. الموجات ───────── */
  function cycles(ans, items, C) {
    var out = {};
    AX.forEach(function (a) {
      var its = items.freq.filter(function (i) { return i.kind === "cycle" && i.axis === a; });
      var m = avg(its.map(function (i) { return ans.freq[i.id]; }));
      out[a] = { mean: r2(m), high: m != null && m >= C.cycles.high, name: its[0] && its[0].cycle, items: its.map(function (i) { return i.id; }) };
    });
    return out;
  }
  function tension(ans, items, C) {
    var out = {};
    items.bipolar.forEach(function (b) {
      var v = ans.bipolar[b.id], side = null, label = null;
      if (isNum(v)) {
        if (v <= C.tension.aMax) { side = "أ"; label = "غلبة " + b.poleA; }
        else if (v >= C.tension.bMin) { side = "ب"; label = "غلبة " + b.poleB; }
        else { side = "النص"; label = "في النص بين " + b.poleA + " و" + b.poleB + " (يتسأل في الجلسة)"; }
      }
      out[b.axis] = { item: b.id, tension: b.tension, value: isNum(v) ? v : null, side: side, label: label, poleA: b.poleA, poleB: b.poleB };
    });
    return out;
  }

  /* ───────── ٣. حال الأبعاد التسعة ───────── */
  var STATUS = {
    cycle: "دايرة في البُعد ده", ambiguous: "التباس", excess: "إفراط", deficit: "تفريط", fitra: "فطرة",
    lean_excess: "ميل ناحية الإفراط", lean_deficit: "ميل ناحية التفريط", lean_both: "ميل من الناحيتين", undetermined: "غير محسوم"
  };
  function dimensions(ans, items, C, cyc) {
    var hi = C.dims.high, lo = C.dims.low;
    return items.dims.map(function (d) {
      function vals(kind) { return items.freq.filter(function (i) { return i.dim === d.id && i.kind === kind; }); }
      var ex = vals("excess"), de = vals("deficit"), le = vals("leave")[0], ta = vals("take")[0];
      var E = avg(ex.map(function (i) { return ans.freq[i.id]; })), D = avg(de.map(function (i) { return ans.freq[i.id]; }));
      var T = ans.freq[le.id], K = ans.freq[ta.id];
      T = isNum(T) ? T : null; K = isNum(K) ? K : null;
      var Eh = E != null && E >= hi, Dh = D != null && D >= hi, El = E != null && E <= lo, Dl = D != null && D <= lo;
      var Th = T != null && T >= hi, Kh = K != null && K >= hi, Tl = T != null && T <= lo, Kl = K != null && K <= lo;
      var code;
      if (Eh && Dh && cyc[d.axis].high) code = "cycle";
      else if (Eh && Dh) code = "ambiguous";
      else if (Eh) code = "excess";
      else if (Dh) code = "deficit";
      else if (El && Dl && Th && Kh) code = "fitra";
      else if (Tl && Kl) code = "lean_both";
      else if (Tl) code = "lean_excess";
      else if (Kl) code = "lean_deficit";
      else code = "undetermined";
      // الوش: وصف للعبارة اللي طلعت أعلى في التفريط (ولو متعادلين الاتنين)، مش نتيجة
      var dv = de.map(function (i) { return { face: i.face, v: ans.freq[i.id] }; }).filter(function (x) { return isNum(x.v) && x.v > 0; });
      var mx = Math.max.apply(null, dv.map(function (x) { return x.v; }).concat([-1]));
      var faces = dv.filter(function (x) { return x.v === mx; }).map(function (x) { return x.face; })
        .filter(function (f, k, a) { return a.indexOf(f) === k; });
      return {
        id: d.id, name: d.name, axis: d.axis,
        E: r2(E), D: r2(D), T: T, K: K,
        status: code, label: STATUS[code], face: faces,
        contradictions: (Th && Eh ? 1 : 0) + (Kh && Dh ? 1 : 0),
        bothHigh: Eh && Dh,
        missing: ex.concat(de, [le, ta]).filter(function (i) { return !isNum(ans.freq[i.id]); }).map(function (i) { return i.id; })
      };
    });
  }

  /* ───────── ٥. المحطة ٧ ───────── */
  function station7(ans, items, C, shownRow) {
    var fear = {}, freeze = {};
    AX.forEach(function (a) {
      var f = items.freq.filter(function (i) { return i.kind === "fear" && i.axis === a; });
      var m = avg(f.map(function (i) { return ans.freq[i.id]; }));
      fear[a] = { mean: r2(m), high: m != null && m >= C.station7.fearHigh };
      var z = items.freq.filter(function (i) { return i.kind === "freeze" && i.axis === a; });
      var hits = z.filter(function (i) { return isNum(ans.freq[i.id]) && ans.freq[i.id] >= C.station7.freezeItem; });
      freeze[a] = { flag: hits.length > 0, items: hits.map(function (i) { return { id: i.id, value: ans.freq[i.id], what: i.typeLabel }; }) };
    });
    var ad = byKind(items, "adaptive").sort(function (x, y) { return x.slot - y.slot; });
    var am = avg(ad.map(function (i) { return ans.freq[i.id]; }));
    return {
      fear: fear, freeze: freeze,
      clientFreezeMessage: AX.some(function (a) { return freeze[a].flag; }),   // العميل يشوف رسالة لطيفة واحدة من غير تسمية
      substitution: { mean: r2(am), signal: am != null && am >= C.station7.adaptiveHigh, shownRow: shownRow,
                      values: ad.map(function (i) { return ans.freq[i.id]; }) }
    };
  }

  /* ───────── ٦. التنبيهات ───────── */
  function alerts(ans, items, C, s7) {
    var dep = C.alerts.depletion, hit = dep.items.filter(function (id) { return isNum(ans.freq[id]) && ans.freq[id] >= dep.itemMin; });
    var noneIds = (items.client && items.client.period ? items.client.period.options : []).filter(function (o) { return o.none; }).map(function (o) { return o.id; });
    var sel = ((ans.period && ans.period.selected) || []).filter(function (x) { return noneIds.indexOf(x) === -1; });
    var mv = ans.freq[C.alerts.mood.item];
    return {
      depletion: { on: hit.length >= dep.count, hits: hit, note: "اسأل عن آخر أسبوعين" },
      mood: { on: isNum(mv) && mv >= C.alerts.mood.min, value: isNum(mv) ? mv : null, note: "اسأل عن النوم والطاقة في فترات الاشتعال قبل ما تشتغل على الدايرة" },
      freeze: { on: s7.clientFreezeMessage, axes: AX.filter(function (a) { return s7.freeze[a].flag; }) },
      period: { on: sel.length > 0, selected: sel, impact: (ans.period && ans.period.impact) || null,
                level: sel.length ? (ans.period.impact === C.alerts.period.highImpact ? "عالي" : "عادي") : null }
    };
  }

  /* ───────── ٧. جودة الإجابة ───────── */
  function quality(ans, items, C, dims) {
    var val = byKind(items, "validity"), vh = val.filter(function (i) { return isNum(ans.freq[i.id]) && ans.freq[i.id] >= C.quality.validityItemMin; });
    var both = dims.filter(function (d) { return d.bothHigh; });
    var fast = [];
    Object.keys(ans.timing || {}).forEach(function (k) {
      var t = ans.timing[k], n = countIn(k, items);
      if (t && isNum(t.startedAt) && isNum(t.endedAt) && n) {
        var per = (t.endedAt - t.startedAt) / n;
        if (per < C.quality.fastMsPerAnswer) fast.push({ station: +k, msPerAnswer: Math.round(per) });
      }
    });
    return {
      validity: { count: vh.length, of: val.length, items: vh.map(function (i) { return i.id; }), flag: vh.length >= C.quality.validityCount, label: vh.length >= C.quality.validityCount ? "احتمال تجميل" : null },
      acquiescence: { dims: both.map(function (d) { return d.id; }), flag: both.length >= C.quality.acquiescenceDims, label: both.length >= C.quality.acquiescenceDims ? "نمط إجابة" : null },
      contradictions: { count: dims.reduce(function (s, d) { return s + d.contradictions; }, 0),
                        dims: dims.filter(function (d) { return d.contradictions; }).map(function (d) { return d.id; }) },
      speed: { stations: fast, flag: fast.length > 0, label: fast.length ? "إجابة سريعة" : null, measured: Object.keys(ans.timing || {}).length > 0 }
    };
  }
  function countIn(k, items) {
    k = +k;
    if (k === 1) return items.station1.length;
    if (k === 2) return items.station2.length;
    return items.freq.filter(function (i) { return i.station === k; }).length + (k === 6 ? items.bipolar.length : 0);
  }

  /* ───────── الدالة الأساسية ───────── */
  function score(rawAnswers, items, C, opts) {
    opts = opts || {};
    var integ = verifyIntegrity(items);
    if (!integ.ok) throw new Error("ملف الأسئلة فيه مشكلة: " + integ.errors.join(" · "));
    var ans = normalize(rawAnswers);
    ans.triad = ans.triad || {}; ans.freq = ans.freq || {}; ans.bipolar = ans.bipolar || {};

    var rk = ranking(ans, items, C);
    var sp = suppressed(ans, items, C, rk);
    var cyc = cycles(ans, items, C);
    var dims = dimensions(ans, items, C, cyc);
    var computedRow = adaptiveRow(ans, items, C);
    var shown = (ans.adaptiveShown && ans.adaptiveShown.row) || null;
    var s7 = station7(ans, items, C, shown || computedRow.row);
    var al = alerts(ans, items, C, s7);
    var q = quality(ans, items, C, dims);

    // تعديل الكوتش: الحساب الأصلي بيفضل زي ما هو، والنهائي بياخد التعديل
    var ov = opts.override || null;
    var final = { main: rk.main, supporting: sp.supporting, suppressed: sp.axis, suppressedStatus: sp.status, source: "المحرك" };
    if (ov && ov.order && ov.order.length === 3) {
      final = { main: ov.order[0], supporting: ov.order[1], suppressed: ov.order[2], suppressedStatus: ov.suppressedStatus || "حدّده الكوتش", source: "الكوتش",
                reason: ov.reason || "", by: ov.by || "", at: ov.at || null };
    }
    // «سكوت المسار» (القرار ١٢): تفريط في بُعد تبع محور مكبوت مؤكد
    dims.forEach(function (d) {
      d.silentPath = d.status === "deficit" && final.suppressed === d.axis &&
        (final.source === "الكوتش" || final.suppressedStatus === "مؤكد");
    });

    var missing = rk.missing.concat(sp.missing);
    items.freq.forEach(function (i) { if (!isNum(ans.freq[i.id])) missing.push(i.id); });
    items.bipolar.forEach(function (b) { if (!isNum(ans.bipolar[b.id])) missing.push(b.id); });

    var notes = [];
    if (shown && shown !== computedRow.row) notes.push("الصيغة اللي ظهرت (" + shown + ") مختلفة عن اللي المحرك ده كان هيختارها (" + computedRow.row + ")");
    if (ans.questionsVersion && ans.questionsVersion !== items.version) notes.push("الإجابات على نسخة أسئلة " + ans.questionsVersion + " والمحرك شغال على " + items.version);

    return {
      engineVersion: ENGINE_VERSION, configVersion: C.configVersion,
      questionsVersion: items.version, questionsHash: items.hash, answersQuestionsVersion: ans.questionsVersion || null,
      complete: missing.length === 0, missing: missing, notes: notes,
      ranking: rk, suppressed: sp, final: final,
      dimensions: dims, cycles: cyc, tension: tension(ans, items, C),
      station7: s7, adaptive: { computed: computedRow, shown: shown },
      alerts: al, quality: q
    };
  }

  var API = { ENGINE_VERSION: ENGINE_VERSION, AX_NAME: AX_NAME, STATUS: STATUS,
              score: score, verifyIntegrity: verifyIntegrity, normalize: normalize, adaptiveRow: adaptiveRow };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.AxesV2Engine = API;
})(typeof self !== "undefined" ? self : this);
