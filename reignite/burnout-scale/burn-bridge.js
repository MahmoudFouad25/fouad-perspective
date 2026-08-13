/* ════════════════════════════════════════════════════════════════════════
   burn-bridge.js — جسر مقياس الاحتراق المحوري
   ────────────────────────────────────────────────────────────────────────
   المسار: reignite/burnout-scale/burn-bridge.js

   منطقٌ نقيّ: لا حساب، لا UI، لا HTML مباشر، لا Firestore.
   يقف بين المحرّك (burn-engine) والمحتوى (burn-content, burn-content-target,
   burn-practices-*) ويؤدّي وظيفةً واحدة: الترجمة والفرز.

     أيّ كتلةٍ لأيّ محورٍ وبُعدٍ وحالة؟
     أيّ ممارسةٍ لأيّ تركيبة، وبأيّ نسخةٍ سياقيّة؟
     أيّ وسمٍ يُحقَن بأيّ قيمة؟
     أيّ فقرةٍ مشروطةٍ تُعرَض وأيّها تُحذَف؟

   ──────────────────────────────────────────────────────────────────────
   ★ ثلاث قواعد يحرسها هذا الملفّ:

     ١) الفقرة المشروطة تُحذَف بالكامل عند عدم تحقّق شرطها، ولا تُستبدَل
        بشيء. فالباب المشروط تنبيهٌ يُعطى لمن يستحقّه، ولو أُعطي للجميع
        لم يُقرَأ من أحد.

     ٢) كتلة البيئة واحدةٌ فقط، بترتيب الشدّة:
        ENV_BOTH ← ENV_STARVE ← ENV_BLOCK ← ENV_FEED.

     ٣) حدٌّ أقصى ثلاث علاماتٍ في الشاشة، والباقي يُخزَّن للأطلس أو القاع.
        فأكثر من ثلاث ملاحظاتٍ تتحوّل إلى قائمة عيوبٍ فيقفل المشارك.

   ──────────────────────────────────────────────────────────────────────
   الوسوم التي يملؤها:
     {axisName} {secName} {dimName} {stateName} {levelName}
     {severity} {envName} {roleLabel}
   ════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BURN_BRIDGE = api;
  if (typeof globalThis !== "undefined") globalThis.BURN_BRIDGE = api;
})(this, function () {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════════
     ٠ — الوصول إلى الوحدات
     ═══════════════════════════════════════════════════════════════════ */
  function G(name) {
    if (typeof window !== "undefined" && window[name]) return window[name];
    if (typeof globalThis !== "undefined" && globalThis[name]) return globalThis[name];
    return null;
  }
  function CFG()    { return G("BURN_CONFIG"); }
  function S()      { return G("BURN_STRINGS"); }
  function CONTENT(){ return G("BURN_CONTENT"); }
  function TARGET() { return G("BURN_CONTENT_TARGET"); }
  function FLAGS()  { return G("BURN_FLAGS"); }
  function R()      { return G("BURN_RENDER"); }
  function PRAC(axis) {
    var map = { coh: "BURN_PRACTICES_COH", vit: "BURN_PRACTICES_VIT", bel: "BURN_PRACTICES_BEL" };
    return G(map[axis] || "");
  }

  function has(x) { return !!x; }

  /* ═══════════════════════════════════════════════════════════════════
     ١ — قاموس الوسوم

     يُبنى مرّةً من نتيجة المحرّك، ويُحقَن في كل كتلةٍ نصّيّة.
     ═══════════════════════════════════════════════════════════════════ */
  function buildVars(result) {
    var cfg = CFG(), s = S();
    if (!cfg || !result) return {};

    var ax  = cfg.getAxis(result.primary) || {};
    var sec = cfg.getAxis(result.secondary) || {};
    var dim = cfg.getDim(result.primary, result.targetDim) || {};
    var lvl = cfg.getLevel(result.wellbeing && result.wellbeing.lowest) || {};
    var role = cfg.getRole(result.role) || {};

    var stateNames = (s && s.labels && s.labels.stateNames) || {};
    var envNames   = (s && s.labels && s.labels.envNames) || {};

    /* وصف الشدّة بلغةٍ واصفةٍ لا رقميّة — فالرقم يستدعي المقارنة والحكم */
    var sev = result.targetSeverity;
    var severityLabel = "";
    if (typeof sev === "number") {
      if (sev >= 3.0)      severityLabel = (s && s.labels.severityHigh) || "شديدة";
      else if (sev >= 1.5) severityLabel = (s && s.labels.severityMid)  || "متوسّطة";
      else                 severityLabel = (s && s.labels.severityLow)  || "خفيفة";
    }

    return {
      axisName:  ax.name || "",
      axisShort: ax.shortName || ax.name || "",
      secName:   sec.name || "",
      dimName:   dim.name || "",
      stateName: stateNames[result.targetCls] || "",
      levelName: lvl.name || "",
      severity:  severityLabel,
      envName:   envNames[(result.environment && result.environment.flag) || "feed"] || "",
      roleLabel: role.name || ""
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ — سياق الشروط

     يُبنى من نتيجة المحرّك والإجابات الخام، ويُمرَّر إلى مقيّم الشروط
     المحدود في burn-content-target. ولا نطاق مفتوحًا ولا eval.
     ═══════════════════════════════════════════════════════════════════ */
  function buildConditionContext(result, raw) {
    raw = raw || {};
    function v(id) {
      var c = raw[id];
      if (c === undefined || c === null) return null;
      var val = (typeof c === "object") ? c.v : c;
      return (typeof val === "number") ? val : null;
    }

    var wb = result.wellbeing || {};
    var lows = ["vig", "prs", "ful"]
      .map(function (k) { return wb[k]; })
      .filter(function (x) { return typeof x === "number"; });

    var ctx = {
      minWellbeing: lows.length ? Math.min.apply(null, lows) : 9,
      vigor:    (typeof wb.vig === "number") ? wb.vig : 9,
      presence: (typeof wb.prs === "number") ? wb.prs : 9,
      fullness: (typeof wb.ful === "number") ? wb.ful : 9,
      axisSeverity:   result.axisSeverity,
      targetSeverity: result.targetSeverity
    };

    /* البنود المستعملة صراحةً في شروط الكتل */
    ["L3_ENV_VIT_R2", "L3_ENV_BEL_G2", "L3_ENV_COH_R2"].forEach(function (id) {
      var x = v(id);
      if (x !== null) ctx[id] = x;
    });

    return ctx;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ — حقن الوسوم في كتلةٍ عامّة
     ═══════════════════════════════════════════════════════════════════ */
  function fillBlock(block, vars) {
    if (!block) return null;
    function sub(s) {
      return String(s == null ? "" : s).replace(/\{(\w+)\}/g, function (m, k) {
        return (vars && vars[k] !== undefined && vars[k] !== null && vars[k] !== "")
          ? String(vars[k]) : m;
      });
    }
    var out = {
      id: block.id,
      section: block.section,
      screen: block.screen,
      style: block.style || null,
      title: block.title ? sub(block.title) : null,
      body: (block.body || []).map(sub)
    };
    if (block.intro) out.intro = sub(block.intro);
    if (block.outro) out.outro = sub(block.outro);
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ — اختيار الكتل
     ═══════════════════════════════════════════════════════════════════ */

  function up(x) { return String(x || "").toUpperCase(); }

  /* كتلةٌ عامّةٌ بمعرّفها، مع الحقن */
  function blockById(id, result, raw) {
    var C = CONTENT();
    if (!C) return null;
    var b = C.byId ? C.byId(id) : C[id];
    if (!b) return null;
    return fillBlock(b, buildVars(result));
  }

  /* كتلة اتجاه الطاقة */
  function axisBlock(result) {
    return blockById("AXS_" + up(result.primary), result);
  }

  /* كتلة المحور الفرعيّ */
  function secondaryBlock(result) {
    return blockById("SEC_" + up(result.secondary), result);
  }

  /* بذرة المكبوت — بحسب تصنيف الكبت لا بحسب المحور */
  function repressedBlock(result) {
    var map = { loud: "REP_LOUD", quiet: "REP_QUIET", sec2: "REP_SEC2" };
    return blockById(map[result.repressionClass] || "REP_SEC2", result);
  }

  /* ★ كتلة بُعدك الهدف — قلب الشاشة.
     تُبنى عبر resolve في burn-content-target ليُقيَّم شرط الفقرة المشروطة. */
  function targetBlock(result, raw) {
    var T = TARGET();
    if (!T) return null;
    var ctx = buildConditionContext(result, raw);
    var vars = buildVars(result);
    return T.resolve(result.primary, result.targetDim, result.targetCls, ctx, vars);
  }

  /* ★ كتلة البيئة — واحدةٌ فقط بترتيب الشدّة */
  function environmentBlock(result) {
    var F = FLAGS();
    var id = F ? F.environmentBlock(result) : "ENV_FEED";
    return blockById(id, result);
  }

  /* ★ الجسر — أهمّ قسمٍ في الشاشة كلها */
  function bridgeBlock(result) {
    var suffix = result.matchesAxis ? "MATCH" : "NOMATCH";
    return blockById("BRG_" + up(result.primary) + "_" + suffix, result);
  }

  /* كتلة الحركة */
  function movementBlock(result) {
    var move = (result.functionality && result.functionality.move) || "SOUND";
    return blockById("MOV_" + up(move), result);
  }

  /* المرآة اليوميّة — شرطيّة (AUT ≥ العتبة) */
  function mirrorBlock(result) {
    if (!result.functionality || result.functionality.autShow !== "show") return null;
    return blockById("MIR_" + up(result.primary), result);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ — اختيار الممارسة

     ★ قاعدة الأسبقيّة: التنظيم الذاتيّ المتذبذب بشدّةٍ عالية يُقدَّم على
       البُعد الهدف، لأنّه البُعد الذي تقوم عليه القدرة على الممارسة نفسها:
       من لا ينظّم داخله لا يثبت على ممارسةٍ أصلًا.

     ★ وحالة الميل تأخذ ممارسة الحالة التي تميل إليها، بنصف الجرعة،
       وبنصٍّ افتتاحيٍّ مختلف — فصاحبها ليس في نزيف، وممارسته صيانةٌ لا علاج.
     ═══════════════════════════════════════════════════════════════════ */
  function selectPractice(result) {
    var cfg = CFG();
    var axis = result.primary;
    var dim  = result.targetDim;
    var cls  = result.targetCls;
    var dose = "full";
    var prefixBlockId = null;

    /* (أ) الأسبقيّة */
    if (result.precedenceApplied && result.practiceOverride) {
      axis = result.practiceOverride.axis;
      dim  = result.practiceOverride.dim;
      cls  = result.practiceOverride.state;
      prefixBlockId = "PRC_PRECEDENCE";
    }
    /* (ب) الميل */
    else if (cls === "tlt") {
      cls = result.targetTiltToward || "exc";
      dose = "half";
      prefixBlockId = "PRC_TILT";
    }
    /* (ج) الاتزان — لا نزيف، فتُعطى ممارسة صيانةٍ لأقرب ميل */
    else if (cls === "bal") {
      var d = (result.dimensions || []).filter(function (x) { return x.dim === dim; })[0];
      cls = (d && d.tiltToward) || "exc";
      dose = "half";
      prefixBlockId = "PRC_TILT";
    }

    var bank = PRAC(axis);
    if (!bank) return null;

    var practice = bank.get ? bank.get(dim, cls) : null;
    if (!practice) return null;

    var role = result.role || "lead";
    var variant = bank.roleVariant ? bank.roleVariant(practice.id, role) : null;

    return {
      practice: practice,
      roleVariant: variant,
      dose: dose,
      prefixBlockId: prefixBlockId,
      overridden: !!result.precedenceApplied
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ — بناء أقسام الشاشة الواحدة
     ═══════════════════════════════════════════════════════════════════ */

  function screenBlocks(screenNo, result, flags, raw) {
    var out = [];
    var s = S();

    if (screenNo === 1) {
      out.push({ block: blockById("GRD_00", result), opts: {} });
      out.push({ block: axisBlock(result),           opts: { label: s.labels.axisLabel } });
      out.push({ block: secondaryBlock(result),      opts: {} });
      out.push({ block: repressedBlock(result),      opts: {} });
    }

    else if (screenNo === 2) {
      out.push({ block: targetBlock(result, raw), opts: {} });
      out.push({ block: environmentBlock(result), opts: { leadIn: CONTENT().ENV_LEAD_IN } });
      out.push({ block: bridgeBlock(result),      opts: {} });
    }

    else if (screenNo === 3) {
      out.push({ block: movementBlock(result), opts: {} });
      var mir = mirrorBlock(result);
      if (mir) out.push({ block: mir, opts: { label: s.labels.mirrorLabel } });
      out.push({ block: blockById("WBL_00", result), opts: {} });
    }

    return out.filter(function (x) { return has(x.block); });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ — توليد HTML للشاشة

     ★ هذا هو الموضع الوحيد الذي يستدعي فيه الجسر العرض — لأنّ التطبيق
       يطلب سلسلةً جاهزة. والجسر لا يكتب HTML بنفسه، بل يفوّض burn-render.
     ═══════════════════════════════════════════════════════════════════ */
  function screenHtml(screenNo, result, flags, raw) {
    var render = R();
    if (!render) return "";
    var html = "";

    var parts = screenBlocks(screenNo, result, flags, raw);

    parts.forEach(function (p) {
      if (p.opts && p.opts.leadIn) {
        html += '<p class="bn-lead-in">' + render.esc(p.opts.leadIn) + '</p>';
      }
      html += render.contentBlock(p.block, p.opts || {});
    });

    /* الشاشة الثانية: رقاقة البُعد وأشرطة الطيف قبل كتلة البيئة */
    if (screenNo === 2) {
      var cfg = CFG();
      var dim = cfg.getDim(result.primary, result.targetDim) || {};
      var vars = buildVars(result);
      var chip = render.targetChip(dim.name || result.targetDim, result.targetCls, vars.severity);
      var bars = render.spectrumSet(result.dimensions, result.targetDim);
      /* تُحقَن بعد كتلة الهدف مباشرةً */
      html = html.replace("</div>", "</div>" + chip + bars);
    }

    /* الشاشة الثالثة: خطّ العافية ثم الممارسة */
    if (screenNo === 3) {
      html += render.wellbeingBars(result.wellbeing || {});
      html += practiceHtml(result);
    }

    return html;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٨ — توليد HTML للممارسة
     ═══════════════════════════════════════════════════════════════════ */
  function practiceHtml(result) {
    var render = R(), C = CONTENT(), s = S();
    if (!render) return "";

    var sel = selectPractice(result);
    if (!sel || !sel.practice) return "";

    var html = "";

    /* المقدّمة الثابتة: «ولن نتركك بخريطة.» */
    var frame = C ? C.PRC_00 : null;
    if (frame && frame.intro) {
      html += '<p class="bn-practice-intro">' + render.esc(frame.intro) + '</p>';
    }

    /* نصّ الأسبقيّة أو الميل — وبدونه يشعر المشارك بتناقضٍ بين
       ما قالته الشاشة عن بُعده وبين ما تعطيه الممارسة */
    if (sel.prefixBlockId && C) {
      var pref = fillBlock(C[sel.prefixBlockId], buildVars(result));
      if (pref) html += render.contentBlock(pref, {});
    }

    html += render.practiceCard(sel.practice, sel.roleVariant);

    /* ملاحظة الإحالة — تُعرَض إن كانت الممارسة تحملها */
    if (sel.practice.referralNote) {
      html += '<div class="bn-block-aside"><p class="bn-p">' +
              render.esc(sel.practice.referralNote) + '</p></div>';
    }

    /* الخاتمة الثابتة: «صغيرة، وهذا مقصود.» */
    if (frame && frame.outro) {
      html += '<p class="bn-practice-outro">' + render.esc(frame.outro) + '</p>';
    }

    return html;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٩ — الشاشة الخاصّة

     ★ تحلّ محلّ الشاشات الثلاث عند علامةٍ مغلِقة.
       وتنتهي بممارسةٍ عامّةٍ بسيطة، لأنّ القاعدة الثانية من قواعد البرنامج
       تقول: محدّش بيتساب في الجرح — حتى من تجاوزت حالته نطاق الأداة.
     ═══════════════════════════════════════════════════════════════════ */
  function specialScreenHtml(blockId, result) {
    var render = R(), C = CONTENT();
    if (!render || !C) return "";
    var b = fillBlock(C[blockId], buildVars(result));
    var html = render.contentBlock(b, {});

    /* في حالة تجاوز النطاق: ممارسةٌ عامّةٌ بسيطةٌ لا مرتبطةٌ بالتشخيص */
    if (blockId === "SPC_BEYOND") {
      html += '<div class="bn-practice">' +
                '<div class="bn-practice-name">شيءٌ واحد</div>' +
                '<p class="bn-p">مرّةً في اليوم، توقّف عشر ثوانٍ واسأل نفسك: «أنا محتاج إيه دلوقتي؟» ' +
                'ولا تفعل شيئًا حياله. السؤال وحده يكفي اليوم.</p>' +
              '</div>';
    }
    return html;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١٠ — ملخّصٌ للتخزين والمدرّب
     ═══════════════════════════════════════════════════════════════════ */
  function summarize(result, flags) {
    var cfg = CFG();
    var sel = selectPractice(result);
    var ax  = cfg.getAxis(result.primary) || {};
    var dim = cfg.getDim(result.primary, result.targetDim) || {};
    var path = cfg.pathOf(result.primary, result.targetDim) || {};

    return {
      axis: { id: result.primary, name: ax.name },
      dimension: { id: result.targetDim, name: dim.name, cls: result.targetCls },
      path: path,
      practice: sel ? { id: sel.practice.id, name: sel.practice.name, dose: sel.dose } : null,
      precedenceApplied: !!result.precedenceApplied,
      blocks: {
        axis: "AXS_" + up(result.primary),
        secondary: "SEC_" + up(result.secondary),
        repressed: (result.repressionClass === "loud") ? "REP_LOUD"
                 : (result.repressionClass === "quiet") ? "REP_QUIET" : "REP_SEC2",
        target: TARGET() ? TARGET().keyOf(result.primary, result.targetDim, result.targetCls) : null,
        environment: FLAGS() ? FLAGS().environmentBlock(result) : null,
        bridge: "BRG_" + up(result.primary) + "_" + (result.matchesAxis ? "MATCH" : "NOMATCH"),
        movement: "MOV_" + up((result.functionality || {}).move || "SOUND"),
        mirror: mirrorBlock(result) ? ("MIR_" + up(result.primary)) : null
      },
      flagsShown: flags ? flags.clientShown : [],
      textKey: result.textKey
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١١ — تحقّق التغطية

     ★ يفحص أنّ كل تركيبةٍ ممكنةٍ تجد كتلتها وممارستها.
       ٣ محاور × ٣ أبعاد × ٤ حالات = ٣٦ تركيبة، وكلٌّ منها لستّة أدوار.
     ═══════════════════════════════════════════════════════════════════ */
  function verifyCoverage() {
    var issues = [];
    var cfg = CFG(), C = CONTENT(), T = TARGET();
    if (!cfg) issues.push("BURN_CONFIG غير محمَّل");
    if (!C)   issues.push("BURN_CONTENT غير محمَّل");
    if (!T)   issues.push("BURN_CONTENT_TARGET غير محمَّل");
    if (issues.length) return { ok: false, issues: issues };

    var axes = ["coh", "vit", "bel"];
    var dims = ["d1", "d2", "d3"];
    var classes = ["exc", "def", "osc", "tlt"];
    var roles = ["lead", "mgr", "found", "free", "sale", "hr"];
    var combos = 0, practicePaths = 0;

    axes.forEach(function (ax) {
      /* الكتل الثابتة لكل محور */
      ["AXS_", "SEC_", "MIR_"].forEach(function (p) {
        if (!C[p + up(ax)]) issues.push("كتلة مفقودة: " + p + up(ax));
      });
      ["MATCH", "NOMATCH"].forEach(function (m) {
        if (!C["BRG_" + up(ax) + "_" + m]) issues.push("كتلة جسرٍ مفقودة: BRG_" + up(ax) + "_" + m);
      });

      var bank = PRAC(ax);
      if (!bank) { issues.push("بنك ممارساتٍ غير محمَّل: " + ax); return; }

      dims.forEach(function (d) {
        classes.forEach(function (c) {
          combos++;
          /* الكتلة النصّيّة */
          if (!T.get(ax, d, c)) issues.push("كتلة هدفٍ مفقودة: " + T.keyOf(ax, d, c));

          /* الممارسة — والميل يأخذ ممارسة ما يميل إليه */
          var pc = (c === "tlt" || c === "bal") ? "exc" : c;
          var p = bank.get(d, pc);
          if (!p) { issues.push("ممارسة مفقودة: PRC_" + up(ax) + "_" + up(d) + "_" + up(pc)); return; }
          roles.forEach(function (r) {
            if (!bank.roleVariant(p.id, r)) issues.push("نسخة " + r + " مفقودة في " + p.id);
            else practicePaths++;
          });
        });
      });
    });

    /* الكتل الثابتة العامّة */
    ["GRD_00", "WBL_00", "PRC_00", "PRC_PRECEDENCE", "PRC_TILT",
     "REP_LOUD", "REP_QUIET", "REP_SEC2",
     "ENV_FEED", "ENV_STARVE", "ENV_BLOCK", "ENV_BOTH",
     "MOV_FUEL", "MOV_STALL", "MOV_TOXIC", "MOV_HORIZ", "MOV_SOUND",
     "SPC_BEYOND", "SPC_NOTBURN", "SPC_GAP"].forEach(function (id) {
      if (!C[id]) issues.push("كتلة ثابتةٌ مفقودة: " + id);
    });

    /* كل قيم خانة الحركة في المفتاح لها كتلة */
    var moveSeg = (cfg.textKey.segments || []).filter(function (s) { return s.key === "move"; })[0];
    if (moveSeg) {
      moveSeg.values.forEach(function (v) {
        if (!C["MOV_" + v]) issues.push("قيمة حركةٍ بلا كتلة: MOV_" + v);
      });
    }

    return {
      ok: issues.length === 0,
      issues: issues,
      combos: combos,
      practicePaths: practicePaths
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     التصدير
     ═══════════════════════════════════════════════════════════════════ */
  return {
    /* الوسوم والسياق */
    buildVars: buildVars,
    buildConditionContext: buildConditionContext,
    fillBlock: fillBlock,

    /* اختيار الكتل */
    blockById: blockById,
    axisBlock: axisBlock,
    secondaryBlock: secondaryBlock,
    repressedBlock: repressedBlock,
    targetBlock: targetBlock,
    environmentBlock: environmentBlock,
    bridgeBlock: bridgeBlock,
    movementBlock: movementBlock,
    mirrorBlock: mirrorBlock,
    screenBlocks: screenBlocks,

    /* الممارسة */
    selectPractice: selectPractice,
    practiceHtml: practiceHtml,

    /* التوليد */
    screenHtml: screenHtml,
    specialScreenHtml: specialScreenHtml,

    /* الملخّص والتحقّق */
    summarize: summarize,
    verifyCoverage: verifyCoverage
  };
});

if (typeof window !== "undefined") {
  console.log("✅ BURN_BRIDGE جاهز");
}
