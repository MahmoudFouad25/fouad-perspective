/* ═══════════════════════════════════════════════════════════════════════
   fouad-written.js — الرسالة المكتوبة (تقرير المدرّب) في شاشة العميل
   -----------------------------------------------------------------------
   المكان: mirrors-assesment/fouad-written.js
   يُحمَّل قبل fouad-app.js مباشرةً.

   ما يفعله:
     • قراءة واحدة من مجموعة fouad_v2_reports عند بدء الجلسة
     • زرٌّ في البيت يظهر فقط حين يوجد تقريرٌ مُفعَّل
     • شاشة مستقلّة تعرض الرسالة كاملةً مرتّبةً بالمواضع
     • بطاقة ملحقة أسفل قراءة كلّ مرآة، بما كُتب لتلك المرآة وحدها

   مبدأ حاكم: ما يكتبه المدرّب لا يختلط بما يقيسه المقياس. لكلٍّ إطارُه
   وعنوانُه ولونُه، فيعرف القارئ من أين يأتيه الكلام.
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var COLLECTION = 'fouad_v2_reports';
  var SEEN_KEY   = 'fouad_written_seen';

  var DOC = null;        // الوثيقة المقروءة، أو null
  var LOADED = false;

  /* أنواع الأقسام — الأيقونة والاسم كما يراهما العميل (بلا مصطلحات داخليّة) */
  var TYPES = {
    portrait:    { icon: '🪞', label: '' },
    session:     { icon: '📋', label: '' },
    homework:    { icon: '📝', label: 'تمرين' },
    action_plan: { icon: '🎯', label: 'خطوة عمليّة' },
    insight:     { icon: '💡', label: '' },
    text:        { icon: '',   label: '' }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function cfg() { return global.FOUAD_CONFIG || null; }

  function mirrorsOrdered() {
    var c = cfg();
    if (!c || !Array.isArray(c.mirrors)) return [];
    return c.mirrors.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  /* ترتيب المواضع: التهيئة أوّلًا (لأنّها موقوتة)، ثمّ العامّ، ثمّ المرايا، ثمّ الختام */
  function placementRank() {
    var o = { prep: -1, general: 0 };
    mirrorsOrdered().forEach(function (m, i) { o[m.id] = i + 1; });
    o.final = 99;
    return o;
  }

  function mirrorName(id) {
    var ms = mirrorsOrdered();
    for (var i = 0; i < ms.length; i++) if (ms[i].id === id) return ms[i].name || id;
    return null;
  }

  function groupTitle(p) {
    if (p === 'prep')    return 'تهيئتك للجلسة';
    if (p === 'general') return null;
    if (p === 'final')   return 'في الختام';
    var n = mirrorName(p);
    return n ? ('عند مرآة ' + n) : null;
  }

  /* الأقسام الظاهرة فقط، مرتّبةً */
  function sections() {
    if (!DOC || !DOC.published || !Array.isArray(DOC.sections)) return [];
    var rank = placementRank();
    return DOC.sections
      .filter(function (s) { return s && s.visible !== false && String(s.content || '').trim(); })
      .sort(function (a, b) {
        var ra = (rank[a.placement] != null) ? rank[a.placement] : 50;
        var rb = (rank[b.placement] != null) ? rank[b.placement] : 50;
        return (ra - rb) || ((a.order || 0) - (b.order || 0));
      });
  }

  function sectionsFor(placement) {
    return sections().filter(function (s) { return s.placement === placement; });
  }

  function paragraphs(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map(function (b) { return b.trim(); })
      .filter(Boolean)
      .map(function (b) { return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>'; })
      .join('');
  }

  function sectionHTML(s) {
    var t = TYPES[s.type] || TYPES.text;
    var head = '';
    if (s.title) {
      head = '<div class="wr-title">' + (t.icon ? ('<span class="wr-ic">' + t.icon + '</span>') : '') +
             esc(s.title) + (t.label ? ('<span class="wr-kind">' + esc(t.label) + '</span>') : '') + '</div>';
    }
    return '<div class="wr-sec wr-' + esc(s.type || 'text') + '">' + head + paragraphs(s.content) + '</div>';
  }

  /* ── واجهة عامّة ─────────────────────────────────────────────── */

  function load(userId) {
    LOADED = true;
    if (!userId || !global.db) { DOC = null; return Promise.resolve(null); }
    return global.db.collection(COLLECTION).doc(userId).get()
      .then(function (d) { DOC = d.exists ? (d.data() || null) : null; return DOC; })
      .catch(function (e) {
        // فشل القراءة لا يعطّل المقياس بحال — الرسالة تختفي فحسب
        console.warn('[FOUAD_WRITTEN] تعذّرت قراءة الرسالة المكتوبة:', e);
        DOC = null; return null;
      });
  }

  function ready() { return sections().length > 0; }
  function count()  { return sections().length; }

  /* هل تجدّدت الرسالة منذ آخر مرّة فتحها؟ (نقطةٌ صغيرة على الزرّ) */
  function isFresh() {
    if (!ready()) return false;
    try {
      var seen = localStorage.getItem(SEEN_KEY);
      var upd = DOC.lastUpdated || DOC.publishedAt || '';
      if (!upd) return !seen;
      return !seen || String(seen) < String(upd);
    } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, DOC && (DOC.lastUpdated || DOC.publishedAt) || new Date().toISOString()); }
    catch (e) {}
  }

  /* زرّ البيت — يُحقن داخل .home-actions إن وُجد، وإلّا يُنشئ صفَّه بنفسه */
  function injectHome(onClick) {
    if (!ready()) return;
    var host = document.querySelector('.home-actions');
    if (!host) {
      var card = document.querySelector('.card.home');
      if (!card) return;
      host = document.createElement('div');
      host.className = 'home-actions';
      card.appendChild(host);
    }
    if (document.getElementById('homeWritten')) return;
    var b = document.createElement('button');
    b.className = 'btn ghost wr-home-btn';
    b.id = 'homeWritten';
    b.innerHTML = '✉ رسالتك المكتوبة' + (isFresh() ? '<span class="wr-dot"></span>' : '');
    b.addEventListener('click', function () { markSeen(); if (onClick) onClick(); });
    host.appendChild(b);
  }

  /* بطاقة ملحقة أسفل قراءة مرآةٍ بعينها — فارغة إن لم يُكتب لها شيء */
  function mirrorCardHTML(mirrorId) {
    var list = sectionsFor(mirrorId);
    if (!list.length) return '';
    return '<div class="card wr-card">'
         +   '<div class="wr-band">✉ كُتب لك عند هذه المرآة</div>'
         +   list.map(sectionHTML).join('')
         + '</div>';
  }

  /* الشاشة الكاملة */
  function screenHTML(clientName) {
    var list = sections();
    if (!list.length) {
      return '<div class="card centered">'
           +   '<div class="wr-empty">🕊<br>لا توجد رسالة بعد.</div>'
           +   '<button class="btn ghost" id="wrBack">رجوع</button>'
           + '</div>';
    }
    var h = '<div class="card wr-screen">';
    h += '<div class="wr-head">'
      +    '<div class="wr-kicker">رسالة مكتوبة إليك</div>'
      +    '<div class="wr-lead">هذا ليس قراءةً آليّة. هذا كلامٌ كُتب إليك أنت، بعد النظر في مراياك. اقرأه على مهلك.</div>'
      +  '</div>';

    var last = '__none__';
    list.forEach(function (s) {
      if (s.placement !== last) {
        last = s.placement;
        var t = groupTitle(s.placement);
        if (t) h += '<div class="wr-group"><span class="wr-ln"></span><span class="wr-gt">' + esc(t) + '</span><span class="wr-ln"></span></div>';
      }
      h += sectionHTML(s);
    });

    h += '<div class="wr-foot no-print">'
      +    '<button class="btn ghost" id="wrPrint">🖨 طباعة</button>'
      +    '<button class="btn ghost" id="wrBack">رجوع للبيت</button>'
      +  '</div>';
    h += '</div>';
    return h;
  }

  /* أنماط الطبقة — تُحقن مرّةً واحدة، ولا تمسّ أنماط المقياس */
  (function styles() {
    if (document.getElementById('wr-styles')) return;
    var css = ''
      + '.wr-home-btn{position:relative}'
      + '.wr-dot{position:absolute;top:8px;inset-inline-start:8px;width:8px;height:8px;border-radius:50%;'
      +   'background:#fbbf24;box-shadow:0 0 0 3px rgba(251,191,36,.22)}'
      + '.wr-card{margin-top:18px;border-inline-start:3px solid #a78bfa}'
      + '.wr-band{color:#a78bfa;font-size:13px;font-weight:700;letter-spacing:.3px;margin-bottom:16px;opacity:.95}'
      + '.wr-screen .wr-head{text-align:center;margin-bottom:26px}'
      + '.wr-kicker{color:#fbbf24;font-size:13px;letter-spacing:.6px;margin-bottom:10px}'
      + '.wr-lead{color:#94a3b8;font-size:15px;line-height:2;max-width:520px;margin:0 auto}'
      + '.wr-group{display:flex;align-items:center;gap:12px;margin:32px 0 16px}'
      + '.wr-ln{flex:1;height:1px;background:linear-gradient(90deg,transparent,#2a3850,transparent)}'
      + '.wr-gt{color:#fbbf24;font-size:14px;font-weight:700;white-space:nowrap}'
      + '.wr-sec{margin-bottom:22px}'
      + '.wr-sec:last-of-type{margin-bottom:0}'
      + '.wr-title{font-size:19px;font-weight:700;line-height:1.7;margin-bottom:12px;display:flex;'
      +   'align-items:baseline;gap:8px;flex-wrap:wrap}'
      + '.wr-ic{font-size:17px}'
      + '.wr-kind{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:7px;'
      +   'background:rgba(148,163,184,.14);color:#94a3b8}'
      + '.wr-sec p{margin:0 0 15px;font-size:17px;line-height:2.15}'
      + '.wr-sec p:last-child{margin-bottom:0}'
      + '.wr-homework,.wr-action_plan{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);'
      +   'border-radius:14px;padding:20px 20px 18px}'
      + '.wr-action_plan{background:rgba(251,191,36,.06);border-color:rgba(251,191,36,.20)}'
      + '.wr-foot{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:34px}'
      + '.wr-empty{color:#94a3b8;font-size:16px;line-height:2.4;margin-bottom:22px}'
      + '@media print{.no-print{display:none}}';
    var st = document.createElement('style');
    st.id = 'wr-styles';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  global.FOUAD_WRITTEN = {
    load: load,
    ready: ready,
    count: count,
    isFresh: isFresh,
    markSeen: markSeen,
    injectHome: injectHome,
    mirrorCardHTML: mirrorCardHTML,
    screenHTML: screenHTML,
    sectionsFor: sectionsFor,
    _doc: function () { return DOC; },
    _loaded: function () { return LOADED; }
  };

})(window);