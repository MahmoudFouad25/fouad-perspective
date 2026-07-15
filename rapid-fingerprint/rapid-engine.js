/* ════════════════════════════════════════════════════════════════════════
   rapid-engine.js — محرك مقياس البصمة السريع (Rapid Fingerprint)
   ────────────────────────────────────────────────────────────────────────
   محرك نقي: لا UI ولا Firestore ولا DOM. يقرأ RAPID_CONFIG و
   RAPID_QUESTIONS بنمط axes-engine (window ثم require) ويُصدَّر عبر
   window.RAPID_ENGINE.

   المراجع الحاكمة: METHODOLOGY.md §٢–§٣ و §٧، LENSES.md §٣ و §٥،
   وعتبات rapid-config.js (الموروث منها موثق بمصدره هناك).

   ── عقود الإجابات (يلتزم بها rapid-app) ──
   answers = {
     stageA: { itemId: {أ:1..7, ب:1..7, ج:1..7} },     // تقييم مستقل لكل خيار
     stageB: { itemId: {أ,ب,ج} },                       // نفس الصيغة
     stageC: { itemId: 1..7 },                          // عبارة واحدة لكل بند
     attention: 1..7 | undefined,                       // بند الانتباه المموّه
     stageD: {
       duels:       { itemId: 'أ'|'ب' },                // اختيار الأقرب
       roots:       { itemId: 'أ'|'ب' },
       recognition: { itemId: 'أ'|'ب' }
     },
     stageE: { itemId: {أ,ب,ج} },                       // بنود الكتل الثلاث
     stageERank: { itemId: ['أ','ب','ج'] },             // ترتيب: الأقرب فالأوسط فالأبعد
     stageF: { statementId: 1..7 }                      // عبارات الطيف
   }

   ── الواجهة العليا ──
   planNext(answers)        → الخطوة التالية للتدفق التكيفي (للـ app)
   buildResults(answers)    → وثيقة النتيجة كاملة (results + trace) — §٧
   verifyIntegrity()        → فحص بنيوي + محاكاة التسعة عبر الأنبوب كاملًا
   ════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ═══════════ الاستحضار — نمط axes-engine حرفيًّا ═══════════ */
  function _resolve(name, requirePath) {
    if (global[name]) return global[name];
    if (typeof require !== 'undefined' && requirePath) {
      try { var m = require(requirePath); if (m) return m; } catch (e) { /* تجاهل */ }
    }
    return null;
  }
  function _cfg() { var v = _resolve('RAPID_CONFIG', './rapid-config.js'); if (!v) throw new Error('RAPID_CONFIG غير متاح.'); return v; }
  function _q()   { var v = _resolve('RAPID_QUESTIONS', './rapid-questions.js'); if (!v) throw new Error('RAPID_QUESTIONS غير متاح.'); return v; }

  var CHOICES = ['أ', 'ب', 'ج'];

  var RAPID_ENGINE = {};

  /* ════════════════ ١) البوابتان — أ (العائلة) و ب (الأسلوب) ════════════════
     تجميع ليكرت لكل قسم عبر خيارات البنود (نفس تجميع L1 الموروث). */
  function _scoreGate(items, answers, optionField, keys) {
    var sums = {}; keys.forEach(function (k) { sums[k] = 0; });
    (items || []).forEach(function (it) {
      var a = (answers || {})[it.id];
      if (!a || typeof a !== 'object') return;
      CHOICES.forEach(function (L) {
        var opt = it.options && it.options[L];
        if (!opt || !opt[optionField]) return;
        var v = a[L];
        if (typeof v !== 'number' || isNaN(v)) return;
        sums[opt[optionField]] += v;
      });
    });
    var order = keys.map(function (k) { return { key: k, score: sums[k] }; })
      .sort(function (x, y) { return (y.score - x.score) || (keys.indexOf(x.key) - keys.indexOf(y.key)); });
    var margin = order.length > 1 ? (order[0].score - order[1].score) : order[0].score;
    return {
      sums: sums, order: order,
      top: order[0].key, second: order[1] ? order[1].key : null,
      margin: margin,
      close: margin <= _cfg().thresholds.gate.GATE_CLOSE_MARGIN
    };
  }

  RAPID_ENGINE.scoreGateA = function (answers) {
    var C = _cfg();
    return _scoreGate(_q().stageA, (answers || {}).stageA, 'family', C.families.order);
  };
  RAPID_ENGINE.scoreGateB = function (answers) {
    var C = _cfg();
    return _scoreGate(_q().stageB, (answers || {}).stageB, 'behavior', C.behaviors.order);
  };

  /* مجموع أدلة البوابتين لكل طابع = درجة عائلته + درجة أسلوبه —
     أساس كشف المنافس بطريقة قرب الأدلة، وأساس الكسر الحتمي الأخير. */
  RAPID_ENGINE.evidenceByType = function (gateA, gateB) {
    var C = _cfg(), ev = {};
    for (var n = 1; n <= 9; n++) {
      var cell = C.cellOfType(n);
      ev[String(n)] = (gateA.sums[cell.family] || 0) + (gateB.sums[cell.behavior] || 0);
    }
    return ev;
  };

  /* ════════════════ ٢) المرشح والمنافس ════════════════ */
  RAPID_ENGINE.deriveCandidate = function (gateA, gateB) {
    return _cfg().typeFromCell(gateA.top, gateB.top);
  };

  /* كشف المنافس — بالطريقتين معًا (القرار الموثق في الكونفج §١٠):
     ١) جوار البوابات: خلية العائلة الثانية × الأسلوب الأول إن كانت بوابة
        أ متقاربة، وخلية الأولى × الثاني إن كانت ب متقاربة.
     ٢) قرب مجموع الأدلة: أي طابع ضمن EVIDENCE_MARGIN من المرشح —
        يلتقط الأزواج الضيقة العابرة للبوابتين التي لا يراها الجوار.
     الاختيار: أولوية لمن يكوّن مع المرشح زوجًا ضيقًا (بطارية جاهزة)،
     ثم الأعلى أدلة. ولو لا مرشح ضمن الهوامش: المنافس الاحتياطي هو
     الأعلى أدلة بعد المرشح (التأكيد يجري دائمًا ضد الأقوى). */
  RAPID_ENGINE.detectRival = function (gateA, gateB, candidate) {
    var C = _cfg();
    var ev = RAPID_ENGINE.evidenceByType(gateA, gateB);
    var candEv = ev[candidate];
    var pool = {}; // typeNum → {source}

    if (gateA.close && gateA.second) {
      var t1 = C.typeFromCell(gateA.second, gateB.top);
      if (t1 && t1 !== candidate) pool[t1] = { source: 'adjacent' };
    }
    if (gateB.close && gateB.second) {
      var t2 = C.typeFromCell(gateA.top, gateB.second);
      if (t2 && t2 !== candidate) pool[t2] = { source: 'adjacent' };
    }
    for (var n = 1; n <= 9; n++) {
      var k = String(n);
      if (k === candidate) continue;
      if ((candEv - ev[k]) <= C.thresholds.rival.EVIDENCE_MARGIN) {
        if (!pool[k]) pool[k] = { source: 'proximity' };
      }
    }

    var keys = Object.keys(pool);
    var pick = null, source = null;
    if (keys.length) {
      if (C.thresholds.rival.NARROW_PAIR_PRIORITY) {
        var narrow = keys.filter(function (k) {
          return C.narrowPairs.indexOf(C.pairKey(candidate, k)) !== -1;
        });
        if (narrow.length) keys = narrow;
      }
      keys.sort(function (a, b) { return ev[b] - ev[a]; });
      pick = keys[0]; source = pool[pick].source;
    } else {
      // احتياطي: الأعلى أدلة بعد المرشح
      var rest = [];
      for (var m = 1; m <= 9; m++) if (String(m) !== candidate) rest.push(String(m));
      rest.sort(function (a, b) { return ev[b] - ev[a]; });
      pick = rest[0]; source = 'fallback';
    }
    return {
      rival: pick, source: source,
      isNarrow: C.narrowPairs.indexOf(C.pairKey(candidate, pick)) !== -1,
      evidence: ev
    };
  };

  /* ════════════════ ٣) التأكيد المتقاطع — stageC ════════════════
     الجبهات من الاشتقاق الآلي، مرشَّحة على سلّم التأكيد (m4→m2→m3).
     من الجبهة الأولى ٤ بنود (بندا مودويل المرشح + بندا مودويل المنافس)،
     ومن الثانية إن وُجدت بندان (١+١) — ضمن حدَّي MIN/MAX. */
  RAPID_ENGINE.selectConfirmationItems = function (candidate, rival) {
    var C = _cfg(), Q = _q();
    var conf = C.frontLadder.confirmation;
    var fronts = C.frontsOfPair(candidate, rival).filter(function (m) {
      return conf.indexOf(m) !== -1;
    });
    var sigC = C.signatureOf(candidate), sigR = C.signatureOf(rival);
    var selected = [];
    var MAX = C.thresholds.confirmation.MAX_ITEMS;

    fronts.forEach(function (m, fi) {
      if (selected.length >= MAX) return;
      var mirrorKey = m.toUpperCase();               // البنك يستخدم M2/M3/M4
      var perModule = (fi === 0) ? 2 : 1;            // الجبهة الأولى مضاعفة
      [ { mod: sigC[m], side: 'candidate' },
        { mod: sigR[m], side: 'rival' } ].forEach(function (t) {
        var items = Q.stageC.filter(function (it) {
          return it.mirror === mirrorKey && it.module === t.mod;
        }).slice(0, perModule);
        items.forEach(function (it) {
          if (selected.length < MAX &&
              !selected.some(function (s) { return s.item.id === it.id; })) {
            selected.push({ item: it, side: t.side, front: m });
          }
        });
      });
    });
    return selected;
  };

  /* تصويت التأكيد: بند مودويل المرشح بتقييم ≥ ٥ يصوّت للمرشح و≤ ٣
     يصوّت للمنافس (سباق ثنائي محسوم الطرفين) — والمرآة نفسها معكوسة
     لبنود مودويل المنافس. التقييم ٤ امتناع. */
  RAPID_ENGINE.scoreConfirmation = function (selected, answers) {
    var C = _cfg();
    var cv = 0, rv = 0, votes = [];
    (selected || []).forEach(function (s) {
      var v = ((answers || {}).stageC || {})[s.item.id];
      if (typeof v !== 'number' || isNaN(v)) return;
      var voteFor = null;
      if (v >= 5) voteFor = s.side;
      else if (v <= 3) voteFor = (s.side === 'candidate') ? 'rival' : 'candidate';
      if (voteFor === 'candidate') cv++;
      else if (voteFor === 'rival') rv++;
      votes.push({ itemId: s.item.id, side: s.side, rating: v, vote: voteFor });
    });
    var net = cv - rv;
    return {
      candidateVotes: cv, rivalVotes: rv, net: net, votes: votes,
      confirmed: net >= C.thresholds.confirmation.CONFIRM_NET
    };
  };

  /* ════════════════ ٤) فض الاشتباك — stageD ════════════════ */
  RAPID_ENGINE.hasBattery = function (candidate, rival) {
    return !!(_q().duels[_cfg().pairKey(candidate, rival)]);
  };
  RAPID_ENGINE.getBattery = function (candidate, rival) {
    return _q().duels[_cfg().pairKey(candidate, rival)] || null;
  };

  /* بند التعرّف لأي زوج: من البطارية إن وُجدت، وإلا يُركَّب من بنك
     الأصوات (القرار الموثق: البنك يغطي الـ٣٦) بنفس نص الموجّه القانوني. */
  RAPID_ENGINE.getRecognitionItem = function (candidate, rival) {
    var C = _cfg(), Q = _q();
    var battery = RAPID_ENGINE.getBattery(candidate, rival);
    if (battery && battery.recognition) return battery.recognition;
    var anyPair = Object.keys(Q.duels)[0];
    var proto = Q.duels[anyPair].recognition;      // الموجّه القانوني الموحد
    var lo = C.pairKey(candidate, rival).split('-');
    return {
      id: 'rec' + lo[0] + lo[1],
      pair: lo[0] + '-' + lo[1],
      synthesized: true,
      text: proto.text, hint: proto.hint,
      options: { 'أ': { type: 'type' + lo[0] }, 'ب': { type: 'type' + lo[1] } }
    };
  };

  /* نص صوت التعرّف يُقرأ من البنك الموحد حصرًا */
  RAPID_ENGINE.voiceOf = function (typeKeyOrNum) {
    var k = String(typeKeyOrNum).indexOf('type') === 0 ? String(typeKeyOrNum) : ('type' + typeKeyOrNum);
    return _q().recognitionVoices[k] || null;
  };

  function _binaryNet(items, picks, candidate, points) {
    // صافي نقاط المرشح − المنافس من بنود ثنائية الاختيار
    var net = 0, log = [];
    (items || []).forEach(function (it) {
      var choice = (picks || {})[it.id];
      if (choice !== 'أ' && choice !== 'ب') return;
      var chosenType = it.options[choice].type;       // 'typeN'
      var forCandidate = (chosenType === 'type' + candidate);
      net += forCandidate ? points : -points;
      log.push({ itemId: it.id, choice: choice, chosenType: chosenType });
    });
    return { net: net, log: log };
  }

  /* سلسلة الحسم الكاملة — تُعاد كل مرة من الإجابات المتاحة وتُرجع
     الحالة: ما حُسم، أو ما يجب تقديمه تاليًا. المسارات ذات البطارية:
     مبارزات → جذور → تعرّف. بلا بطارية: تعرّف مباشرة (قرار الكونفج). */
  RAPID_ENGINE.resolveDispute = function (answers, candidate, rival, evidence) {
    var C = _cfg(), T = C.thresholds.duel;
    var d = (answers.stageD || {});
    var battery = RAPID_ENGINE.getBattery(candidate, rival);
    var trace = { pair: C.pairKey(candidate, rival), hasBattery: !!battery, steps: [] };

    function _decide(net, path) {
      var winner = net > 0 ? candidate : rival;
      return { resolved: true, winner: winner, resolutionPath: path, net: net, trace: trace };
    }

    var cumNet = 0;

    if (battery) {
      /* ١) المبارزات — يُقدَّم غير المُجاب منها فقط */
      var pendingDuels = battery.duels.filter(function (it) { return !(d.duels || {})[it.id]; });
      if (pendingDuels.length) {
        return { resolved: false, serve: { kind: 'duels', items: pendingDuels }, trace: trace };
      }
      var duelR = _binaryNet(battery.duels, d.duels, candidate, T.DUEL_POINTS);
      cumNet += duelR.net;
      trace.steps.push({ step: 'duels', net: duelR.net, log: duelR.log });
      if (Math.abs(cumNet) >= T.DUEL_NET) return _decide(cumNet, 'duel');

      /* ٢) الجذور — يُقدَّم غير المُجاب منها فقط */
      var pendingRoots = battery.roots.filter(function (it) { return !(d.roots || {})[it.id]; });
      if (pendingRoots.length) {
        return { resolved: false, serve: { kind: 'roots', items: pendingRoots }, cumNet: cumNet, trace: trace };
      }
      var rootR = _binaryNet(battery.roots, d.roots, candidate, T.ROOT_POINTS);
      cumNet += rootR.net;
      trace.steps.push({ step: 'roots', net: rootR.net, log: rootR.log });
      if (Math.abs(cumNet) >= T.RESOLVE_NET) return _decide(cumNet, 'root');
    }

    /* ٣) التعرّف المرآتي — لأي زوج */
    var recItem = RAPID_ENGINE.getRecognitionItem(candidate, rival);
    var recPick = (d.recognition || {})[recItem.id];
    if (recPick !== 'أ' && recPick !== 'ب') {
      return { resolved: false, serve: { kind: 'recognition', items: [recItem] }, cumNet: cumNet, trace: trace };
    }
    var recType = recItem.options[recPick].type;
    var recNet = (recType === 'type' + candidate) ? T.RECOGNITION_WEIGHT : -T.RECOGNITION_WEIGHT;
    cumNet += recNet;
    trace.steps.push({ step: 'recognition', choice: recPick, chosenType: recType, net: recNet });
    if (cumNet !== 0) return _decide(cumNet, 'recognition');

    /* ٤) الكسر الحتمي المطلق (نظري بعد وزن التعرّف — ضمانة الاستحالة) */
    var evC = (evidence || {})[candidate] || 0, evR = (evidence || {})[rival] || 0;
    var winner = evC >= evR ? candidate : rival;   // ثم أسبقية خلية المربع للمرشح عند التساوي
    trace.steps.push({ step: 'absolute', evidence: { candidate: evC, rival: evR }, winner: winner });
    return { resolved: true, winner: winner, resolutionPath: 'recognition', net: cumNet, trace: trace };
  };

  /* ════════════════ ٥) جهاز الصدق ════════════════ */
  RAPID_ENGINE.checkConsistency = function (answers) {
    var C = _cfg(), Q = _q(), flags = [];
    var TOL = C.truthDevice.CONSISTENCY_TOLERANCE;
    [ { items: Q.stageA, ans: (answers || {}).stageA, field: 'family' },
      { items: Q.stageB, ans: (answers || {}).stageB, field: 'behavior' } ].forEach(function (g) {
      var byId = {}; g.items.forEach(function (it) { byId[it.id] = it; });
      var seen = {};
      g.items.forEach(function (it) {
        if (!it.consistencyPair || seen[it.id] || seen[it.consistencyPair]) return;
        seen[it.id] = seen[it.consistencyPair] = true;
        var other = byId[it.consistencyPair];
        if (!other) return;
        var a1 = (g.ans || {})[it.id], a2 = (g.ans || {})[other.id];
        if (!a1 || !a2) return;
        // مقارنة تقييم القسم الواحد عبر الصياغتين (الربط بالقسم لا بالحرف)
        var byKey1 = {}, byKey2 = {};
        CHOICES.forEach(function (L) {
          if (it.options[L]) byKey1[it.options[L][g.field]] = a1[L];
          if (other.options[L]) byKey2[other.options[L][g.field]] = a2[L];
        });
        Object.keys(byKey1).forEach(function (k) {
          if (typeof byKey1[k] === 'number' && typeof byKey2[k] === 'number' &&
              Math.abs(byKey1[k] - byKey2[k]) > TOL) {
            flags.push({ pair: it.id + '↔' + other.id, key: k, diff: Math.abs(byKey1[k] - byKey2[k]) });
          }
        });
      });
    });
    return flags;
  };

  RAPID_ENGINE.checkAttention = function (answers) {
    var att = _cfg().truthDevice.attentionItem;
    var v = (answers || {}).attention;
    if (typeof v !== 'number') return { answered: false, flagged: false };
    return { answered: true, flagged: v >= att.ATTENTION_FLAG_AT, rating: v };
  };

  /* ════════════════ ٦) المسارات — stageE (الوراثة الحرفية) ════════════════
     منطق computeAxisRanking الموروث: الترتيب بالفعل، النقد كاسر تعادل،
     فجوة الاشتياق تؤكد المدفون، weakSignal وcloseTop بعتبة DIFF_GAP.
     وعند closeTop: بندا الترتيب الإجباري يضيفان RANK_POINTS لتجميع
     الفعل ثم يُعاد الترتيب — «لا نتيجة مفتوحة». */
  RAPID_ENGINE.computeAxisRanking = function (answers) {
    var C = _cfg(), Q = _q();
    var AXIS_IDS = C.axes.order;
    var GAP = C.thresholds.ranking.CLOSE_TOP_GAP;
    var ans = (answers || {}).stageE || {};

    var actionSum = {}, longingSum = {}, critiqueSum = {};
    AXIS_IDS.forEach(function (a) { actionSum[a] = 0; longingSum[a] = 0; critiqueSum[a] = 0; });

    Q.stageE.forEach(function (it) {
      var a = ans[it.id];
      if (!a || typeof a !== 'object') return;
      var target = it.block === 'action' ? actionSum
                 : it.block === 'longing' ? longingSum
                 : it.block === 'critique' ? critiqueSum : null;
      if (!target) return;
      CHOICES.forEach(function (L) {
        var opt = it.options && it.options[L];
        if (!opt || !opt.axis) return;
        var v = a[L];
        if (typeof v !== 'number' || isNaN(v)) return;
        target[opt.axis] += v;
      });
    });

    /* بندا الترتيب الإجباري (إن أُجيبا): تضخيم الفعل بالأوزان */
    var rankAns = (answers || {}).stageERank || {};
    var RP = C.thresholds.ranking.RANK_POINTS;
    var rankApplied = false;
    (Q.rankingItems || []).forEach(function (it) {
      var order = rankAns[it.id];
      if (!Array.isArray(order) || order.length !== 3) return;
      rankApplied = true;
      [RP.first, RP.second, RP.third].forEach(function (pts, i) {
        var opt = it.options[order[i]];
        if (opt && opt.axis) actionSum[opt.axis] += pts;
      });
    });

    var order = AXIS_IDS.map(function (ax) {
      return {
        axisId: ax,
        action: actionSum[ax], longing: longingSum[ax], critique: critiqueSum[ax],
        longingGap: longingSum[ax] - actionSum[ax]
      };
    });
    order.sort(function (a, b) {
      return (b.action - a.action)
          || (a.critique - b.critique)
          || (AXIS_IDS.indexOf(a.axisId) - AXIS_IDS.indexOf(b.axisId));
    });

    var primary = order[0] || null, secondary = order[1] || null, repressed = order[2] || null;

    var repressedConfirmed = false;
    if (repressed) {
      var critiqueRank = order.slice().sort(function (a, b) { return b.critique - a.critique; });
      var highestCritique = critiqueRank[0] ? critiqueRank[0].axisId : null;
      repressedConfirmed = (highestCritique === repressed.axisId) || (repressed.longingGap > GAP);
    }
    var span = primary && repressed ? (primary.action - repressed.action) : 0;
    var closeTop = !!(primary && secondary && (primary.action - secondary.action) <= GAP);

    return {
      ranking: order,
      primaryAxis: primary ? primary.axisId : null,
      secondaryAxis: secondary ? secondary.axisId : null,
      repressedAxis: repressed ? repressed.axisId : null,
      repressedConfirmed: repressedConfirmed,
      weakSignal: span < GAP,
      closeTop: closeTop && !rankApplied,           // بعد الترتيب الإجباري يُحسم حسابيًّا
      closeTopCandidate: (closeTop && !rankApplied && secondary) ? secondary.axisId : null,
      rankApplied: rankApplied,
      sums: { action: actionSum, longing: longingSum, critique: critiqueSum }
    };
  };

  /* ════════════════ ٧) الطيف — stageF ════════════════
     منطق computeDimensionBurnout الموروث مقيسًا على متوسط العبارة
     (القرار الموثق في الكونفج): الثلاثية أولًا، والالتباس يستدعي
     عبارتي الحسم فورًا، وبقاؤه بعدها = nearBalanceLean محسومة. */
  function _stById(strength) {
    var map = {};
    strength.statements.forEach(function (st) { map[st.category + ':' + (st.variant || '')] = st; });
    return map;
  }
  RAPID_ENGINE.spectrumServePlan = function (strength, ratings) {
    var m = _stById(strength);
    var first = [m['balance:'], m['excess:a'], m['deficit:a']].filter(Boolean);
    var unansweredFirst = first.filter(function (st) { return typeof (ratings || {})[st.id] !== 'number'; });
    if (unansweredFirst.length) return { phase: 'first', items: unansweredFirst };
    var pos = RAPID_ENGINE.computeStrengthPosition(strength, ratings);
    if (pos.position === 'ambiguous' && !pos.resolveServed) {
      var resolve = [m['excess:b'], m['deficit:b']].filter(function (st) {
        return st && typeof (ratings || {})[st.id] !== 'number';
      });
      if (resolve.length) return { phase: 'resolve', items: resolve };
    }
    return { phase: 'done', items: [] };
  };

  RAPID_ENGINE.computeStrengthPosition = function (strength, ratings) {
    var C = _cfg(), T = C.thresholds;
    ratings = ratings || {};
    var sums = { balance: [], excess: [], deficit: [] };
    var resolveServed = false;
    strength.statements.forEach(function (st) {
      var v = ratings[st.id];
      if (typeof v !== 'number' || isNaN(v)) return;
      sums[st.category].push(v);
      if (st.variant === 'b') resolveServed = true;
    });
    function mean(arr) { return arr.length ? (arr.reduce(function (a, b) { return a + b; }, 0) / arr.length) : 0; }
    var balance = mean(sums.balance), excess = mean(sums.excess), deficit = mean(sums.deficit);

    var trio = [
      { key: 'balance', label: 'اتزان', val: balance },
      { key: 'excess',  label: 'إفراط', val: excess },
      { key: 'deficit', label: 'تفريط', val: deficit }
    ].sort(function (a, b) { return b.val - a.val; });

    var position, positionLabel, leanDir = null;
    var both = (excess >= T.spectrum.BOTH_MIN) && (deficit >= T.spectrum.BOTH_MIN) &&
               (balance < excess) && (balance < deficit);
    if (both) {
      position = 'both'; positionLabel = 'تذبذب';
    } else if ((trio[0].val - trio[1].val) < T.DIM_GAP) {
      if (resolveServed) {
        /* التباس بعد عبارتي الحسم → قرار محسوم: قرب اتزان بميل */
        leanDir = excess >= deficit ? 'excess' : 'deficit';
        position = 'nearBalanceLean';
        positionLabel = T.spectrum.NEAR_BALANCE_LABEL + ' نحو ' + (leanDir === 'excess' ? 'الإفراط' : 'التفريط');
      } else {
        position = 'ambiguous'; positionLabel = 'التباس';
      }
    } else {
      position = trio[0].key; positionLabel = trio[0].label;
    }

    var distance = 0;
    if (position === 'excess') distance = excess - balance;
    else if (position === 'deficit') distance = deficit - balance;
    else if (position === 'both') distance = (excess + deficit) - balance;
    else if (position === 'ambiguous' || position === 'nearBalanceLean') distance = Math.max(excess, deficit) - balance;
    if (distance < 0) distance = 0;

    return {
      id: strength.id, name: strength.name,
      excessName: strength.excessName, deficitName: strength.deficitName,
      balance: Math.round(balance * 10) / 10,
      excess: Math.round(excess * 10) / 10,
      deficit: Math.round(deficit * 10) / 10,
      position: position, positionLabel: positionLabel,
      leanDir: leanDir,
      distance: Math.round(distance * 10) / 10,
      resolveServed: resolveServed
    };
  };

  RAPID_ENGINE.computeSpectrum = function (typeNum, stageFRatings) {
    var Q = _q(), C = _cfg();
    var t = Q.spectrum['type' + typeNum];
    if (!t) throw new Error('لا طيف للطابع ' + typeNum);
    var out = [], worst = null;
    C.axes.order.forEach(function (ax) {
      (t[ax] ? t[ax].strengths : []).forEach(function (s) {
        var pos = RAPID_ENGINE.computeStrengthPosition(s, stageFRatings);
        pos.axisKey = ax; pos.axisName = t[ax].axisName;
        out.push(pos);
        if ((pos.position === 'excess' || pos.position === 'deficit' || pos.position === 'both') &&
            (worst === null || pos.distance > worst.distance)) {
          worst = { id: pos.id, name: pos.name, axisKey: ax, distance: pos.distance, position: pos.position };
        }
      });
    });
    return { strengths: out, worst: worst };
  };

  /* ════════════════ ٨) مؤشر الثقة الداخلي ════════════════ */
  RAPID_ENGINE.computeConfidence = function (ctx) {
    var W = _cfg().confidence;
    var v = W.BASE;
    v += Math.min(ctx.gateAMargin || 0, W.GATE_MARGIN_CAP) * W.GATE_MARGIN_POINT;
    v += Math.min(ctx.gateBMargin || 0, W.GATE_MARGIN_CAP) * W.GATE_MARGIN_POINT;
    v += Math.min(Math.max(ctx.confirmNet || 0, 0), W.CONFIRM_NET_CAP) * W.CONFIRM_NET_POINT;
    v -= W.PATH_PENALTY[ctx.resolutionPath || 'standard'] || 0;
    if (ctx.resolutionPath === 'recognition' && ctx.recognitionAgreesEvidence) v += W.RECOGNITION_AGREEMENT_BONUS;
    v -= (ctx.consistencyFlags || 0) * W.CONSISTENCY_FLAG_PENALTY;
    if (ctx.attentionFlagged) v -= W.ATTENTION_FLAG_PENALTY;
    return Math.max(W.MIN, Math.min(W.MAX, Math.round(v)));
  };

  /* ════════════════ ٩) المخطط التكيفي — واجهة rapid-app ════════════════
     planNext(answers) يُرجع دائمًا الخطوة التالية:
       { phase, items, context } أو { phase: 'done' }
     المراحل: gateA → gateB → confirm (+ بند الانتباه بموضعه) →
     dispute (شرطية بدرجاتها) → paths → pathsRank (شرطية) →
     spectrum (قوة قوة، بحسم الالتباس) → done. */
  RAPID_ENGINE.planNext = function (answers) {
    answers = answers || {};
    var C = _cfg(), Q = _q();

    function unanswered(items, ansMap, isLikertTrio) {
      return items.filter(function (it) {
        var a = (ansMap || {})[it.id];
        if (isLikertTrio) return !(a && typeof a === 'object' &&
          CHOICES.every(function (L) { return !it.options[L] || typeof a[L] === 'number'; }));
        return typeof a !== 'number';
      });
    }

    /* أ) بوابة العائلة */
    var uA = unanswered(Q.stageA, answers.stageA, true);
    if (uA.length) return { phase: 'gateA', items: uA };

    /* ب) بوابة السلوك */
    var uB = unanswered(Q.stageB, answers.stageB, true);
    if (uB.length) return { phase: 'gateB', items: uB };

    var gateA = RAPID_ENGINE.scoreGateA(answers);
    var gateB = RAPID_ENGINE.scoreGateB(answers);
    var candidate = RAPID_ENGINE.deriveCandidate(gateA, gateB);
    var rivalInfo = RAPID_ENGINE.detectRival(gateA, gateB, candidate);
    var context = { candidate: candidate, rival: rivalInfo.rival, rivalSource: rivalInfo.source, isNarrow: rivalInfo.isNarrow };

    /* ج) التأكيد + بند الانتباه المموّه في موضعه */
    var selected = RAPID_ENGINE.selectConfirmationItems(candidate, rivalInfo.rival);
    var att = C.truthDevice.attentionItem;
    var uC = selected.filter(function (s) { return typeof (answers.stageC || {})[s.item.id] !== 'number'; });
    if (uC.length) {
      var answeredCount = selected.length - uC.length;
      var items = uC.map(function (s) { return s.item; });
      if (typeof answers.attention !== 'number' && answeredCount >= att.serveAfterConfirmIndex) {
        items = [{ id: att.id, attention: true, text: att.text, hint: att.hint }].concat(items);
      }
      return { phase: 'confirm', items: items, context: context };
    }
    if (typeof answers.attention !== 'number') {
      return { phase: 'confirm', items: [{ id: att.id, attention: true, text: att.text, hint: att.hint }], context: context };
    }

    var confirm = RAPID_ENGINE.scoreConfirmation(selected, answers);
    var finalType = candidate, resolutionPath = 'standard', disputeTrace = null, disputeNet = 0;

    /* د) فض الاشتباك — شرطية */
    if (!confirm.confirmed) {
      var res = RAPID_ENGINE.resolveDispute(answers, candidate, rivalInfo.rival, rivalInfo.evidence);
      if (!res.resolved) {
        return { phase: 'dispute', kind: res.serve.kind, items: res.serve.items, context: context };
      }
      finalType = res.winner; resolutionPath = res.resolutionPath;
      disputeTrace = res.trace; disputeNet = res.net;
    }
    context.finalType = finalType; context.resolutionPath = resolutionPath;

    /* هـ) المسارات */
    var uE = unanswered(Q.stageE, answers.stageE, true);
    if (uE.length) return { phase: 'paths', items: uE, context: context };

    var ranking = RAPID_ENGINE.computeAxisRanking(answers);
    var rankItems = Q.rankingItems || [];
    var rankAnswered = rankItems.filter(function (it) {
      var o = (answers.stageERank || {})[it.id];
      return Array.isArray(o) && o.length === 3;
    }).length;
    /* الزناد: closeTop قبل أي ترتيب — وبعد انطلاقه يُستكمل البندان كلاهما
       (المنهجية: «بندا الترتيب الإجباري يُقدَّمان») */
    var rankTriggered = (ranking.closeTop && rankAnswered === 0) ||
                        (rankAnswered > 0 && rankAnswered < rankItems.length);
    if (rankTriggered) {
      var uR = rankItems.filter(function (it) {
        var o = (answers.stageERank || {})[it.id];
        return !(Array.isArray(o) && o.length === 3);
      });
      if (uR.length) return { phase: 'pathsRank', items: uR, context: context };
    }

    /* و) الطيف — قوة قوة بترتيب المحاور، بحسم الالتباس الفوري */
    var t = Q.spectrum['type' + finalType];
    for (var ai = 0; ai < C.axes.order.length; ai++) {
      var ax = C.axes.order[ai];
      var strengths = t[ax] ? t[ax].strengths : [];
      for (var si = 0; si < strengths.length; si++) {
        var plan = RAPID_ENGINE.spectrumServePlan(strengths[si], answers.stageF);
        if (plan.items.length) {
          return {
            phase: 'spectrum', kind: plan.phase, items: plan.items,
            context: context,
            strength: { id: strengths[si].id, name: strengths[si].name, axisKey: ax }
          };
        }
      }
    }

    return { phase: 'done', context: context };
  };

  /* ════════════════ ١٠) وثيقة النتيجة — §٧ ════════════════ */
  RAPID_ENGINE.buildResults = function (answers) {
    answers = answers || {};
    var C = _cfg();

    var gateA = RAPID_ENGINE.scoreGateA(answers);
    var gateB = RAPID_ENGINE.scoreGateB(answers);
    var candidate = RAPID_ENGINE.deriveCandidate(gateA, gateB);
    var rivalInfo = RAPID_ENGINE.detectRival(gateA, gateB, candidate);
    var selected = RAPID_ENGINE.selectConfirmationItems(candidate, rivalInfo.rival);
    var confirm = RAPID_ENGINE.scoreConfirmation(selected, answers);

    var finalType = candidate, resolutionPath = 'standard', disputeTrace = null, disputeNet = 0;
    if (!confirm.confirmed) {
      var res = RAPID_ENGINE.resolveDispute(answers, candidate, rivalInfo.rival, rivalInfo.evidence);
      if (!res.resolved) throw new Error('buildResults قبل اكتمال فض الاشتباك — استعمل planNext.');
      finalType = res.winner; resolutionPath = res.resolutionPath;
      disputeTrace = res.trace; disputeNet = res.net;
    }

    var ranking = RAPID_ENGINE.computeAxisRanking(answers);
    var spectrum = RAPID_ENGINE.computeSpectrum(finalType, answers.stageF);
    var cell = C.cellOfType(finalType);

    var consistencyFlags = RAPID_ENGINE.checkConsistency(answers);
    var attention = RAPID_ENGINE.checkAttention(answers);

    var recognitionAgrees = false;
    if (resolutionPath === 'recognition' && disputeTrace) {
      var evC = rivalInfo.evidence[finalType] || 0;
      var other = finalType === candidate ? rivalInfo.rival : candidate;
      recognitionAgrees = evC >= (rivalInfo.evidence[other] || 0);
    }

    var confidence = RAPID_ENGINE.computeConfidence({
      gateAMargin: gateA.margin, gateBMargin: gateB.margin,
      confirmNet: confirm.net, resolutionPath: resolutionPath,
      recognitionAgreesEvidence: recognitionAgrees,
      consistencyFlags: consistencyFlags.length,
      attentionFlagged: attention.flagged
    });

    /* بنية strengths في §٧ (بمقياس المتوسطات الموثق) */
    var strengths = spectrum.strengths.map(function (s) {
      return {
        id: s.id, axisKey: s.axisKey, name: s.name,
        position: s.position, positionLabel: s.positionLabel,
        balance: s.balance, excess: s.excess, deficit: s.deficit,
        distance: s.distance, leanDir: s.leanDir
      };
    });

    return {
      results: {
        type: 'type' + finalType,
        typeNum: String(finalType),
        family: cell.family,
        behavior: cell.behavior,
        confidence: confidence,
        resolutionPath: resolutionPath,
        axesRanking: {
          primaryAxis: ranking.primaryAxis,
          secondaryAxis: ranking.secondaryAxis,
          repressedAxis: ranking.repressedAxis,
          repressedConfirmed: ranking.repressedConfirmed,
          ranking: ranking.ranking
        },
        strengths: strengths,
        worstStrength: spectrum.worst,
        lean: {
          weakSignal: ranking.weakSignal,
          rankApplied: ranking.rankApplied,
          sums: ranking.sums
        }
      },
      trace: {
        latinCell: { family: gateA.top, behavior: gateB.top },
        gateA: { sums: gateA.sums, margin: gateA.margin, close: gateA.close },
        gateB: { sums: gateB.sums, margin: gateB.margin, close: gateB.close },
        candidate: 'type' + candidate,
        rival: 'type' + rivalInfo.rival,
        rivalSource: rivalInfo.source,
        evidence: rivalInfo.evidence,
        confirmations: confirm.votes,
        confirmNet: confirm.net,
        dispute: disputeTrace,
        disputeNet: disputeNet,
        consistencyFlags: consistencyFlags,
        attentionFlagged: attention.flagged
      }
    };
  };

  /* ════════════════ ١١) الفحص الذاتي — بنيوي + محاكاة التسعة ════════════════
     يشغّل الكونفج والبنك، ثم يحاكي التسعة طابعًا طابعًا عبر الأنبوب
     كاملًا (إجابات مركبة منحازة للطابع الهدف) ويتحقق أن المحرك يخرج
     بالطابع نفسه وبترتيب المسارات وبمواقع الطيف المستهدفة — البرهان
     التشغيلي على «لا نتيجة مفتوحة». */
  RAPID_ENGINE.simulateProfile = function (targetNum, opts) {
    opts = opts || {};
    var C = _cfg(), Q = _q();
    var cell = C.cellOfType(targetNum);
    var sig = C.signatureOf(targetNum);
    var answers = { stageA: {}, stageB: {}, stageC: {}, attention: 1,
                    stageD: { duels: {}, roots: {}, recognition: {} },
                    stageE: {}, stageERank: {}, stageF: {} };

    Q.stageA.forEach(function (it) {
      var a = {}; CHOICES.forEach(function (L) {
        var f = it.options[L].family;
        a[L] = (f === cell.family) ? 7 : (f === opts.secondFamily ? 6 : 2);
      });
      answers.stageA[it.id] = a;
    });
    Q.stageB.forEach(function (it) {
      var a = {}; CHOICES.forEach(function (L) {
        a[L] = (it.options[L].behavior === cell.behavior) ? 7 : 2;
      });
      answers.stageB[it.id] = a;
    });

    /* التأكيد: مع المرشح افتراضًا، أو منقسم لإجبار فض الاشتباك */
    var loop = 0;
    while (loop++ < 400) {
      var step = RAPID_ENGINE.planNext(answers);
      if (step.phase === 'done') break;
      step.items.forEach(function (it) {
        if (step.phase === 'confirm') {
          if (it.attention) { answers.attention = 1; return; }
          var mKey = 'm' + it.mirror.charAt(1);
          var mine = sig[mKey] === it.module;
          answers.stageC[it.id] = opts.forceDispute ? 4 : (mine ? 6 : 2);
        } else if (step.phase === 'dispute') {
          var bucket = step.kind === 'duels' ? answers.stageD.duels
                     : step.kind === 'roots' ? answers.stageD.roots
                     : answers.stageD.recognition;
          var pick = (it.options['أ'].type === 'type' + targetNum) ? 'أ' : 'ب';
          if (opts.splitDuels && step.kind === 'duels' &&
              Object.keys(answers.stageD.duels).length === 0) {
            pick = pick === 'أ' ? 'ب' : 'أ';   // خسارة مبارزة واحدة → ٢-١ → تصعيد
          }
          if (opts.splitRoots && step.kind === 'roots' &&
              Object.keys(answers.stageD.roots).length === 0) {
            pick = pick === 'أ' ? 'ب' : 'أ';   // انقسام الجذور ١-١ → التعرّف
          }
          bucket[it.id] = pick;
        } else if (step.phase === 'paths') {
          var a = {}; CHOICES.forEach(function (L) {
            var ax = it.options[L].axis;
            a[L] = ax === 'intima' ? 7 : ax === 'hayawiyya' ? (opts.closePaths ? 7 : 4) : 2;
          });
          answers.stageE[it.id] = a;
        } else if (step.phase === 'pathsRank') {
          var byAxis = {}; CHOICES.forEach(function (L) { byAxis[it.options[L].axis] = L; });
          answers.stageERank[it.id] = [byAxis.intima, byAxis.hayawiyya, byAxis.tamasuk];
        } else if (step.phase === 'spectrum') {
          it.forEach ? null : null;
          var st = it;
          var v = st.category === 'balance' ? 6 : 2;
          if (opts.ambiguousFirstStrength && step.strength && step.strength.id === opts.ambiguousFirstStrength) {
            v = 4; // تقييم مستوٍ → التباس → استدعاء عبارتي الحسم
          }
          answers.stageF[st.id] = v;
        }
      });
    }
    if (loop >= 400) throw new Error('المحاكاة لم تكتمل — حلقة مفرطة');
    return { answers: answers, output: RAPID_ENGINE.buildResults(answers) };
  };

  RAPID_ENGINE.verifyIntegrity = function () {
    var problems = [];
    var C = _cfg();

    /* الكونفج والبنك أولًا */
    problems = problems.concat(C.verifyIntegrity());

    /* محاكاة التسعة — المسار القياسي */
    for (var n = 1; n <= 9; n++) {
      try {
        var sim = RAPID_ENGINE.simulateProfile(String(n));
        var r = sim.output.results;
        if (r.typeNum !== String(n)) problems.push('محاكاة ' + n + ': خرج ' + r.typeNum);
        if (r.resolutionPath !== 'standard') problems.push('محاكاة ' + n + ': مسار ' + r.resolutionPath);
        if (r.axesRanking.primaryAxis !== 'intima') problems.push('محاكاة ' + n + ': ترتيب مسارات خاطئ');
        if (r.strengths.length !== 9) problems.push('محاكاة ' + n + ': قوى ' + r.strengths.length);
        if (r.strengths.some(function (s) { return s.position !== 'balance'; }))
          problems.push('محاكاة ' + n + ': مواقع طيف غير متزنة رغم الانحياز');
      } catch (e) { problems.push('محاكاة ' + n + ': ' + e.message); }
    }

    /* سلّم البطارية درجة درجة — بمنافس زوج ضيق حقيقي (٧ ضد ٨:
       بوابة عائلة متقاربة certainty/agency + أسلوب hazm مشترك):
       ١) مبارزات ٣-٠ → حسم بالمبارزة.
       ٢) مبارزات ٢-١ → جذور ٢-٠ → حسم بالجذر.
       ٣) مبارزات ٢-١ → جذور ١-١ → التعرّف — والفائز الطابع الهدف دائمًا. */
    try {
      var narrowOpts = { secondFamily: 'agency', forceDispute: true };

      var b1 = RAPID_ENGINE.simulateProfile('7', narrowOpts);
      if (b1.output.trace.rival !== 'type8' || !b1.output.trace.dispute.hasBattery)
        problems.push('بطارية: المنافس ' + b1.output.trace.rival + ' بلا بطارية — لم يتولد الزوج الضيق');
      if (b1.output.results.resolutionPath !== 'duel') problems.push('بطارية/مبارزة: مسار ' + b1.output.results.resolutionPath);
      if (b1.output.results.typeNum !== '7') problems.push('بطارية/مبارزة: خرج ' + b1.output.results.typeNum);

      var b2 = RAPID_ENGINE.simulateProfile('7', Object.assign({ splitDuels: true }, narrowOpts));
      if (b2.output.results.resolutionPath !== 'root') problems.push('بطارية/جذر: مسار ' + b2.output.results.resolutionPath);
      if (b2.output.results.typeNum !== '7') problems.push('بطارية/جذر: خرج ' + b2.output.results.typeNum);

      var b3 = RAPID_ENGINE.simulateProfile('7', Object.assign({ splitDuels: true, splitRoots: true }, narrowOpts));
      if (b3.output.results.resolutionPath !== 'recognition') problems.push('بطارية/تعرّف: مسار ' + b3.output.results.resolutionPath);
      if (b3.output.results.typeNum !== '7') problems.push('بطارية/تعرّف: خرج ' + b3.output.results.typeNum);
      var steps3 = b3.output.trace.dispute.steps.map(function (x) { return x.step; }).join(',');
      if (steps3 !== 'duels,roots,recognition') problems.push('بطارية/تعرّف: خطوات ' + steps3);
    } catch (e) { problems.push('سلّم البطارية: ' + e.message); }

    /* التصعيد بلا بطارية (منافس قرب الأدلة خارج السبعة) → تعرّف مركّب */
    try {
      var s1 = RAPID_ENGINE.simulateProfile('8', { forceDispute: true });
      if (s1.output.results.typeNum !== '8') problems.push('تصعيد بلا بطارية: خرج ' + s1.output.results.typeNum);
      if (s1.output.results.resolutionPath !== 'recognition') problems.push('تصعيد بلا بطارية: مسار ' + s1.output.results.resolutionPath);
      if (s1.output.trace.dispute.hasBattery) problems.push('تصعيد بلا بطارية: وُجدت بطارية غير متوقعة');
    } catch (e) { problems.push('تصعيد بلا بطارية: ' + e.message); }

    /* تقارب المسارات → بندا الترتيب الإجباري ثم حسم */
    try {
      var s3 = RAPID_ENGINE.simulateProfile('3', { closePaths: true });
      if (!s3.output.results.lean.rankApplied) problems.push('closeTop: لم يُقدَّم الترتيب الإجباري');
      if (!s3.output.results.axesRanking.primaryAxis) problems.push('closeTop: بلا رئيسي');
    } catch (e) { problems.push('closeTop: ' + e.message); }

    /* التباس طيف → عبارتا الحسم → قرار محسوم */
    try {
      var Q = _q();
      var firstStrength = Q.spectrum.type5.tamasuk.strengths[0].id;
      var s4 = RAPID_ENGINE.simulateProfile('5', { ambiguousFirstStrength: firstStrength });
      var target = s4.output.results.strengths.filter(function (s) { return s.id === firstStrength; })[0];
      if (!target) problems.push('التباس طيف: القوة مفقودة');
      else if (target.position === 'ambiguous') problems.push('التباس طيف: بقي التباسًا بعد الحسم');
      var fCount = Object.keys(s4.answers.stageF).filter(function (k) { return k.indexOf(firstStrength) === 0; }).length;
      if (fCount !== 5) problems.push('التباس طيف: قُدِّمت ' + fCount + ' عبارات لا ٥');
    } catch (e) { problems.push('التباس طيف: ' + e.message); }

    return problems;
  };

  /* تصدير مزدوج: وحدات Node والمتصفّح — نمط ملفات المنظومة. */
  if (typeof module !== 'undefined' && module.exports) { module.exports = RAPID_ENGINE; }
  global.RAPID_ENGINE = RAPID_ENGINE;

})(typeof window !== 'undefined' ? window : globalThis);
