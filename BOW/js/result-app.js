/* ====================================================================
   منظور الفؤاد — Personal Result Report Controller
   يقرأ الكود من الـ URL، يجيب البيانات، ويبني الصفحة السينمائيّة.
   ──────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── إعدادات ──
  const CONFIG = {
    groupUrl:       'https://chat.whatsapp.com/H0RyRnCJP1bJVC6YDF0yju',
    nextSessionUrl: 'https://youtu.be/AlfsYx-2z3M?si=oMflxvCh3wQ8TJzP',
    courseUrl:      '#'   // ضع لينك الكورس لمّا يبقى جاهز
  };

  const app = document.getElementById('app');

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', boot);

  async function boot() {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview');
    const code = params.get('c') || params.get('code');

    try {
      if (preview) {
        const data = buildPreview(params);
        renderReport(data);
        return;
      }

      if (!code) {
        renderCodeEntry();
        return;
      }

      if (!ResultCodes.isValid(code)) {
        renderError('الكود مش صحيح', 'الرابط فيه كود غير مكتمل. تأكّد إنّك نسخته بالظبط من رسالة الواتس — أو ادخل الكود يدويًّا تحت.', true);
        return;
      }

      renderLoading();
      const data = await MFPData.fetchByCode(code);
      renderReport(data);

    } catch (err) {
      if (err.message === 'INVALID_CODE') {
        renderError('الكود مش صحيح', 'الكود اللي بعتناهولك مكوّن من ٨ خانات. تأكّد إنّك نسخته بالظبط.', true);
      } else if (err.message === 'NOT_FOUND') {
        renderError('الكود ده مش موجود عندنا', 'يا إمّا الكود مكتوب غلط، يا إمّا لسه التشخيص ما اتسجّلش. تأكّد من الرسالة اللي وصلتك، ولو الموضوع مستمرّ كلّمنا في جروب الواتس.', true);
      } else if (err.message.includes('not loaded')) {
        renderError('في خطأ تقنيّ', 'فيه ملف ناقص في الصفحة. لو إنت المسؤول — راجع تحميل result-codes.js.', false);
      } else {
        console.error(err);
        renderError('في عطل في الاتّصال', 'حاول تحدّث الصفحة بعد ثانية. لو الموضوع استمرّ، كلّمنا في جروب الواتس.', false);
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Preview builder
  // ──────────────────────────────────────────────────────────
  function buildPreview(params) {
    const axis = params.get('preview');
    if (!AXIS_CONTENT[axis]) throw new Error('UNKNOWN_AXIS');
    const a = +(params.get('a') || 6);
    const b = +(params.get('b') || 2);
    const c = +(params.get('c') || 1);
    return {
      name: params.get('name') || 'صاحبي',
      result: {
        main_axis: axis,
        secondary_axis: params.get('sec') || 'haywiyya',
        repressed_axis: params.get('rep') || 'intima',
        counts: {
          tamasok:  +(params.get('ct') || a),
          haywiyya: +(params.get('ch') || b),
          intima:   +(params.get('ci') || c)
        },
        letters: { a, b, c }
      }
    };
  }

  // ──────────────────────────────────────────────────────────
  // Static states
  // ──────────────────────────────────────────────────────────
  function renderLoading() {
    app.innerHTML = `
      <div class="state-page">
        <div class="brand">
          <div class="brand-mark">م.ف</div>
          <div>
            <div class="brand-name">منظور الفؤاد</div>
            <span class="brand-tagline">تقريرك الشخصيّ</span>
          </div>
        </div>
        <div class="state-page-inner">
          <div class="pulse" style="margin: 0 auto 24px;"></div>
          <p style="font-size: 14px; color: var(--text-muted);">بنحضّر تقريرك...</p>
        </div>
      </div>
    `;
  }

  function renderCodeEntry() {
    app.innerHTML = `
      <div class="state-page">
        <div class="brand">
          <div class="brand-mark">م.ف</div>
          <div>
            <div class="brand-name">منظور الفؤاد</div>
            <span class="brand-tagline">تقريرك الشخصيّ</span>
          </div>
        </div>
        <div class="state-page-inner">
          <h1>تقريرك في انتظارك</h1>
          <p>ادخل الكود اللي بعتناهولك على الواتس — ٨ خانات (مثال: <code style="color: var(--tamasok); font-weight: 700;">K7M2-P9X4</code>).</p>
          <form class="code-form" id="codeForm">
            <input
              type="text"
              id="codeInput"
              placeholder="X X X X — X X X X"
              maxlength="9"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false">
            <button type="submit" class="btn btn-primary">افتح</button>
          </form>
          <p style="margin-top: 28px; font-size: 12px;">
            مش لاقي الكود؟ شوف رسالة الواتس من محمود فؤاد بعد اللقاء الأوّل.
          </p>
        </div>
      </div>
    `;

    const input = document.getElementById('codeInput');
    input.addEventListener('input', (e) => {
      let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8);
      e.target.value = v;
    });
    document.getElementById('codeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) return;
      location.search = '?c=' + encodeURIComponent(code);
    });
    input.focus();
  }

  function renderError(title, message, showCodeEntry) {
    app.innerHTML = `
      <div class="state-page">
        <div class="brand">
          <div class="brand-mark">م.ف</div>
          <div>
            <div class="brand-name">منظور الفؤاد</div>
            <span class="brand-tagline">تقريرك الشخصيّ</span>
          </div>
        </div>
        <div class="state-page-inner">
          <h1>${escape(title)}</h1>
          <p>${escape(message)}</p>
          ${showCodeEntry ? `
            <form class="code-form" id="codeForm">
              <input type="text" id="codeInput" placeholder="X X X X — X X X X" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false">
              <button type="submit" class="btn btn-primary">جرّب تاني</button>
            </form>
          ` : `
            <a href="${CONFIG.groupUrl}" target="_blank" class="btn btn-ghost">جروب الواتس</a>
          `}
        </div>
      </div>
    `;

    if (showCodeEntry) {
      const input = document.getElementById('codeInput');
      input.addEventListener('input', (e) => {
        let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
        if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8);
        e.target.value = v;
      });
      document.getElementById('codeForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const code = input.value.trim();
        if (!code) return;
        location.search = '?c=' + encodeURIComponent(code);
      });
      input.focus();
    }
  }

  // ──────────────────────────────────────────────────────────
  // Main report
  // ──────────────────────────────────────────────────────────
  function renderReport(data) {
    const axis = AXIS_CONTENT[data.result.main_axis];
    if (!axis) { renderError('في خطأ في البيانات', 'نتيجة المحور غير معروفة.', false); return; }

    document.title = `${data.name || 'تقريرك'} — ${axis.name} — منظور الفؤاد`;
    document.body.style.setProperty('--axis-color',       axis.color);
    document.body.style.setProperty('--axis-color-deep',  axis.color_deep);
    document.body.style.setProperty('--axis-glow-soft',   axis.glow_soft);
    document.body.style.setProperty('--axis-glow-strong', axis.glow_strong);

    app.innerHTML = buildReportHtml(data, axis);

    // Animate bars
    requestAnimationFrame(() => {
      app.querySelectorAll('.bar-fill').forEach(b => {
        b.style.width = b.dataset.target + '%';
      });
    });

    setupRevealObserver();
    setupProgress();
  }

  // ──────────────────────────────────────────────────────────
  // HTML builder
  // ──────────────────────────────────────────────────────────
  function buildReportHtml(data, axis) {
    const name = data.name || 'صاحبي';
    const r = data.result;
    const total = r.letters.a + r.letters.b + r.letters.c || 9;

    const counts = [
      { key: 'tamasok',  label: 'التماسك',  v: r.counts.tamasok  },
      { key: 'haywiyya', label: 'الحيوية',  v: r.counts.haywiyya },
      { key: 'intima',   label: 'الانتماء', v: r.counts.intima   }
    ];

    const second = AXIS_CONTENT[r.secondary_axis];
    const repress = AXIS_CONTENT[r.repressed_axis];

    return `
      <!-- Progress -->
      <div class="progress-rail"><div class="progress-fill" id="progressFill"></div></div>

      <!-- Brand strip -->
      <div class="top-strip">
        <div class="brand">
          <div class="brand-mark">م.ف</div>
          <div>
            <div class="brand-name">منظور الفؤاد</div>
            <span class="brand-tagline">تقريرك الشخصيّ</span>
          </div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); letter-spacing: 1.6px;">
          ${escape(name)}
        </div>
      </div>

      <!-- ── HERO ── -->
      <section class="scene hero">
        <div class="scene-bg"></div>
        <div class="hero-ring"></div>
        <div class="scene-inner hero-content">
          <p class="greeting reveal">أهلاً يا <strong>${escape(name)}</strong></p>
          <p class="hero-label reveal d2">محورك الرئيسيّ</p>
          <h1 class="hero-axis-name reveal d3">${axis.name}</h1>
          <p class="hero-question reveal d4">${escape(axis.question)}</p>
          <p class="hero-tagline reveal d5">${escape(axis.tagline)}</p>
        </div>
        <div class="scroll-cue">انزل</div>
      </section>

      <!-- ── ESSENCE ── -->
      <section class="scene">
        <div class="scene-inner">
          <p class="scene-eyebrow reveal">الماهية</p>
          <h2 class="scene-title reveal d2">في قلبك، الطاقة بتتّجه نحو <em>${escape(axis.tagline.replace('طاقتك بتتّجه نحو ', '').replace('.', ''))}</em></h2>
          <div class="scene-prose">
            ${axis.essence.map((p, i) => `<p class="reveal d${i + 3}">${escape(p)}</p>`).join('')}
          </div>
        </div>
      </section>

      <!-- ── NUMBERS ── -->
      <section class="scene numbers-scene">
        <div class="scene-bg"></div>
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">إجاباتك في الـ ٩ مواقف</p>
          <h2 class="scene-title reveal d2">دي توزيع طاقتك على المحاور التلاتة</h2>
          <div class="numbers-grid">
            <div class="numbers-chart reveal d3">
              ${counts.map(c => barRow(c, r.main_axis, total)).join('')}
            </div>
            <div class="numbers-prose reveal d4">
              <p>من إجاباتك التسعة، <strong>${toArNum(r.counts[r.main_axis])} منهم</strong> أشاروا لمحور <strong style="color: var(--axis-color);">${escape(axis.name)}</strong> — وده اللي بيخلّيه محورك الرئيسيّ.</p>
              <p>الترتيب اللي طلع: <strong>${escape(axis.name)}</strong> ← ${escape(AXIS_AR[r.secondary_axis] || '—')} ← ${escape(AXIS_AR[r.repressed_axis] || '—')}.</p>
              <p style="margin-top: 28px; font-size: 14px; color: var(--text-faint);">الأرقام دي مش حُكم. هي بداية محادثة.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── DIMENSIONS ── -->
      <section class="scene dimensions-scene">
        <div class="scene-bg"></div>
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">أبعاد محورك التلاتة</p>
          <h2 class="scene-title reveal d2">محور <em>${escape(axis.name)}</em> مش طبقة واحدة — هو تلاتة طبقات متداخلة</h2>
          <div class="dimensions-grid">
            ${axis.dimensions.map((d, i) => `
              <div class="dim-card reveal d${i + 3}">
                <div class="dim-num">${toArNum(i + 1)}</div>
                <div class="dim-name">${escape(d.name)}</div>
                <div class="dim-body">${escape(d.body)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- ── FITRA ── -->
      <section class="scene fitra-scene">
        <div class="scene-bg"></div>
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">وجه الفطرة</p>
          <h2 class="scene-title reveal d2">${escape(axis.fitra.title)}</h2>
          <div class="split">
            <div class="split-prose reveal d3">
              <p>${escape(axis.fitra.body)}</p>
            </div>
            <ul class="bullet-list reveal d4">
              ${axis.fitra.bullets.map(b => `<li>${escape(b)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <!-- ── QINA — IFRAT ── -->
      <section class="scene qina-scene">
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">وجه القناع — الإفراط</p>
          <h2 class="scene-title reveal d2">${escape(axis.qina_ifrat.title)}</h2>
          <div class="qina-card reveal d3">
            <p style="font-size: var(--type-body-lg); line-height: 1.85; color: var(--text-base); position: relative; z-index: 2;">
              ${escape(axis.qina_ifrat.body)}
            </p>
            <ul class="qina-signs">
              ${axis.qina_ifrat.signs.map(s => `<li>${escape(s)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <!-- ── QINA — TAFRIT ── -->
      <section class="scene qina-scene">
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">وجه القناع — التفريط</p>
          <h2 class="scene-title reveal d2">${escape(axis.qina_tafrit.title)}</h2>
          <div class="qina-card reveal d3">
            <p style="font-size: var(--type-body-lg); line-height: 1.85; color: var(--text-base); position: relative; z-index: 2;">
              ${escape(axis.qina_tafrit.body)}
            </p>
            <ul class="qina-signs">
              ${axis.qina_tafrit.signs.map(s => `<li>${escape(s)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <!-- ── TENSION ── -->
      <section class="scene tension-scene">
        <div class="scene-inner">
          <p class="scene-eyebrow reveal">${escape(axis.tension.title)}</p>
          <h2 class="scene-title reveal d2">قطبان لا يستقرّ بينهما الشخص</h2>
          <div class="tension-axis reveal d3">
            <div class="tension-pole">${escape(axis.tension.between[0])}</div>
            <div class="tension-vs">↔</div>
            <div class="tension-pole">${escape(axis.tension.between[1])}</div>
          </div>
          <p class="reveal d4" style="font-size: var(--type-body-lg); color: var(--text-base); line-height: 1.85; max-width: 720px; margin: 0 auto;">
            ${escape(axis.tension.body)}
          </p>
          <div class="tension-examples reveal d5">
            ${axis.tension.examples.map(ex => `
              <div class="tension-row">
                <div>${escape(ex.left)}</div>
                <div class="sep"></div>
                <div>${escape(ex.right)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- ── SUB AXES ── -->
      ${second && repress ? `
      <section class="scene">
        <div class="scene-inner wide">
          <p class="scene-eyebrow reveal">تحت السطح</p>
          <h2 class="scene-title reveal d2">المحور الفرعيّ والمكبوت — اللي بيلوّن محورك الرئيسيّ</h2>
          <div class="sub-grid">
            <div class="sub-card reveal d3" style="--sub-color: ${second.color};">
              <div class="sub-eyebrow">المحور الفرعيّ</div>
              <div class="sub-name">${escape(second.name)}</div>
              <div class="sub-body">${escape(axis.secondary_hint[second.key] || second.tagline)}</div>
            </div>
            <div class="sub-card reveal d4" style="--sub-color: ${repress.color};">
              <div class="sub-eyebrow">المحور المكبوت</div>
              <div class="sub-name">${escape(repress.name)}</div>
              <div class="sub-body">${escape(axis.repressed_hint[repress.key] || repress.tagline)}</div>
            </div>
          </div>
          <p class="reveal d5" style="margin-top: 36px; font-size: 14px; color: var(--text-faint); text-align: center;">
            المحور المكبوت — مش "اللي ما عندكش". هو اللي مُطفّى. واستعادته بتفتح بُعد كان غايب.
          </p>
        </div>
      </section>
      ` : ''}

      <!-- ── STEP ── -->
      <section class="scene step-scene">
        <div class="scene-bg"></div>
        <div class="scene-inner">
          <div class="step-card reveal">
            <p class="step-eyebrow">${escape(axis.step.eyebrow)}</p>
            <h2 class="step-title">${escape(axis.step.title)}</h2>
            <p class="step-body">${escape(axis.step.body)}</p>
          </div>
        </div>
      </section>

      <!-- ── CLOSING ── -->
      <section class="scene closing-scene">
        <div class="scene-inner">
          <p class="scene-eyebrow reveal">قبل ما نسيب بعض</p>
          <h2 class="scene-title reveal d2" style="text-align: center;">الكلام ده <em>ربع التشخيص</em>.</h2>
          <p class="closing-quote reveal d3">${escape(axis.closing)}</p>

          <div class="cta-stack reveal d4">
            <a href="${CONFIG.groupUrl}" target="_blank" class="btn btn-axis">
              انضم لجروب الواتس — تفاصيل اللقاء الجاي
            </a>
            <button class="btn btn-ghost" id="shareBtn">
              شارك تقريرك مع صاحب يستفيد
            </button>
            <a href="${CONFIG.nextSessionUrl}" target="_blank" class="cta-link">
              راجع تسجيل اللقاء الأوّل
            </a>
          </div>

          <div class="signature">
            <strong>محمود فؤاد</strong> — مُصمِّم إطار "منظور الفؤاد"<br>
            من الاحتراق إلى استعادة الاتّزان
          </div>
        </div>
      </section>
    `;
  }

  function barRow(c, mainAxis, total) {
    const isMain = c.key === mainAxis;
    const pct = Math.round((c.v / total) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label ${isMain ? 'is-main' : ''}">${escape(c.label)}</div>
        <div class="bar-track">
          <div class="bar-fill"
               style="background: var(--${c.key}); --bar-glow: var(--${c.key}-glow);"
               data-target="${pct}"></div>
        </div>
        <div class="bar-value">${toArNum(c.v)}</div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────────────
  // Scroll behaviors
  // ──────────────────────────────────────────────────────────
  function setupRevealObserver() {
    // Content is ALWAYS visible by default — animations only run when page is
    // actually being viewed. This protects against hidden iframes / reduced-motion
    // / JS failures from trapping content at opacity:0.
    const trigger = () => {
      if (document.body.classList.contains('animate-on')) return;
      document.body.classList.add('animate-on');
    };

    if (document.visibilityState === 'visible') {
      // Defer one frame so the browser registers the initial 'reveal' rules,
      // then add 'animate-on' which switches to the hidden-then-animate variant.
      requestAnimationFrame(() => requestAnimationFrame(trigger));
    } else {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') trigger();
      }, { once: true });
    }
  }

  function setupProgress() {
    const bar = document.getElementById('progressFill');
    if (!bar) return;
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      bar.style.width = pct + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // Share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareUrl = location.origin + location.pathname; // الرابط بدون كود — للمشاركة العامّة
        const text = 'لو حضرت ويبينار "من الاحتراق إلى استعادة الاتّزان" مع محمود فؤاد — اعمل التشخيص واشوف محورك:';
        if (navigator.share) {
          try {
            await navigator.share({ title: 'منظور الفؤاد', text, url: shareUrl });
          } catch (e) { /* cancelled */ }
        } else {
          try {
            await navigator.clipboard.writeText(text + ' ' + shareUrl);
            toast('اللينك اتنسخ — ابعته لصاحبك');
          } catch (e) {
            prompt('انسخ اللينك:', shareUrl);
          }
        }
      });
    }
  }

  function toast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; bottom: 28px; inset-inline-start: 50%; transform: translateX(50%);
      background: var(--bg-elevated); color: var(--text-bright); padding: 12px 22px;
      border-radius: 10px; font-size: 14px; z-index: 100;
      border: 1px solid var(--border-mid); box-shadow: var(--shadow-deep);
      animation: fade-in 200ms;
    `;
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }
})();
