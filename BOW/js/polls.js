/* ====================================================================
   منظور الفؤاد — Poll Engine
   ────────────────────────────────────────────────────────────────────
   هذا الـ Engine يخدم أربع مراحل بـ Poll-style interactions:
     • welcome_question (المرحلة ١) — السؤال الافتتاحيّ التأمّليّ
     • opening_poll    (المرحلة ٢) — إرهاق ولّا احتراق
     • khalid_moment   (المرحلة ٣) — سؤال حميم بعد قصّة خالد
     • closing_decision(المرحلة ٧) — قرار بداية الرحلة
   كلّها تتبع نفس النمط: سؤال → اختيار → Feedback شخصيّ
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// تكوينات الـ Polls الأربعة
// ────────────────────────────────────────────────────────────────────
const POLL_CONFIGS = {

  // ── المرحلة ١: الترحيب — السؤال الافتتاحيّ ───────────────────
  welcome_question: {
    headline: 'سؤال واحد قبل ما نبدأ',
    question: 'إمتى آخر مرّة حسّيت إنّك كويّس فعلًا؟',
    note: 'مش بس ماشي حالك... كويّس فعلًا.',
    accent: 'sky',
    options: [
      {
        id: 'recent',
        text: 'إمبارح أو الأسبوع اللي فات',
        feedback: {
          tone: 'good',
          headline: 'إنت بخير في الغالب',
          body: 'تمام. لكن استنّى معايا — الويبينار ده هيعمّق فهمك لنفسك أكتر مما تتخيّل، حتى وإنت في حالة كويّسة.'
        }
      },
      {
        id: 'month',
        text: 'شهر مضى تقريبًا',
        feedback: {
          tone: 'caution',
          headline: 'مش طبيعيّ — لكن قابل للحلّ',
          body: 'شهر بدون لحظة "كويّس فعلًا" بيقول إن في حاجة بدأت تتراكم. هنفتحها سوا، خطوة خطوة.'
        }
      },
      {
        id: 'far',
        text: 'أكتر من شهر، مش متذكّر بالظبط',
        feedback: {
          tone: 'attention',
          headline: 'إنت في المكان الصحّ',
          body: 'الاعتراف ده بداية حقيقيّة. خد نفس عميق — هنبدأ نفهم سوا.'
        }
      },
      {
        id: 'never',
        text: 'بصدق، مش فاكر آخر مرّة',
        feedback: {
          tone: 'attention',
          headline: 'الصدق ده شجاعة',
          body: 'ده الجواب الأصدق اللي ممكن تقوله. هاكون معاك خطوة خطوة في الساعتين الجايّين.'
        }
      }
    ]
  },

  // ── المرحلة ٢: Poll الافتتاح ──────────────────────────────────
  opening_poll: {
    headline: 'اختار العبارة الأقرب للي بتعيشه',
    question: 'دلوقتي، لو وصفت حالتك الحقيقيّة...',
    note: 'بصدق مع نفسك — ما حدّش هيشوف اختيارك',
    accent: 'sky',
    options: [
      {
        id: 'physical',
        text: 'تعبان جسديًّا، بس قلبي وعقلي لسه معايا',
        feedback: {
          tone: 'good',
          headline: 'إرهاق — مش احتراق',
          body: 'ده الأخفّ في الطيف. الراحة والنوم هيخفّفوه. لكن خد بالك من إشارات صدرك قبل ما تتطور.'
        }
      },
      {
        id: 'distant',
        text: 'حاضر بجسمي، بس بعيد بقلبي عن شغلي والناس',
        feedback: {
          tone: 'attention',
          headline: 'العلاقة بقت باردة',
          body: 'ده مستوى أعمق من الإرهاق. النوم لوحده ما هيعالجوش. لكن في طريق — هنفتحه سوا.'
        }
      },
      {
        id: 'empty',
        text: 'بنجز ومنتج، بس فاضي من جوّا — مش لاقي طعم',
        feedback: {
          tone: 'attention',
          headline: 'دي حالة خالد',
          body: 'النجاح الظاهريّ مع الفراغ الداخليّ — ده الأخطر فيهم. هنفهم ليه ده بيحصل.'
        }
      },
      {
        id: 'all',
        text: 'حاسس بكل اللي فات في نفس الوقت',
        feedback: {
          tone: 'serious',
          headline: 'إنت في احتراق متقدّم',
          body: 'الاعتراف خطوة. والتشخيص الدقيق خطوة. والعلاج موجود — منظّم ومدروس.'
        }
      },
      {
        id: 'fine',
        text: 'بخير فعلًا — جاي أتعلّم وخلاص',
        feedback: {
          tone: 'neutral',
          headline: 'تمام — استمتع بالرحلة',
          body: 'هتفهم ناس حواليك بشكل أعمق. وممكن تكتشف حاجات عن نفسك ما كنتش متوقّعها.'
        }
      }
    ]
  },

  // ── المرحلة ٣: لحظة خالد ─────────────────────────────────────
  khalid_moment: {
    headline: 'لحظة بينك وبين نفسك',
    question: 'حصلّك إنّك بتصحى في النصّ بحجر على صدرك ومش عارف ليه؟',
    note: 'إجابتك تظهر على شاشتك إنت بسّ',
    accent: 'tamasok', // ذهبيّ — لأن خالد محوره التماسك
    options: [
      {
        id: 'often',
        text: 'أيوه، كتير',
        feedback: {
          tone: 'attention',
          headline: 'إنت مش لوحدك',
          body: 'ده بيحصل لـ ٧٠٪ من الناجحين زيّ خالد. اللحظة دي ليها اسم — هنفتحه دلوقتي.'
        }
      },
      {
        id: 'sometimes',
        text: 'حصل مرّات قليلة',
        feedback: {
          tone: 'caution',
          headline: 'لحظة عابرة',
          body: 'اللحظة دي بتحصل لكلّ واحد من وقت لتاني. لكن لو بقت متكرّرة — معناها في حاجة محتاجة انتباه.'
        }
      },
      {
        id: 'never',
        text: 'لأ، ما حصلش',
        feedback: {
          tone: 'good',
          headline: 'تمام',
          body: 'لكن إنت في الويبينار ده عشان حاجة فيك حاسس بشيء. الحاجة دي ليها اسم — هنفتحه سوا.'
        }
      }
    ]
  },

  // ── المرحلة ٧: قرار الإغلاق ──────────────────────────────────
  closing_decision: {
    headline: 'سؤال أخير',
    question: 'هل ده اللحظة اللي قرّرت تبدأ فيها رحلة استعادة اتّزانك؟',
    note: 'مفيش إجابة غلط — كل إجابة بتقول حاجة محترمة عنك',
    accent: 'sky',
    options: [
      {
        id: 'yes',
        text: 'أيوه — بدأت دلوقتي',
        feedback: {
          tone: 'good',
          headline: 'مبروك القرار',
          body: 'القرار ده مش بسيط، وأنا فاهم وزنه. لو حابب نكمّل سوا في الدورة، الباب مفتوح وأنا هنا.'
        }
      },
      {
        id: 'thinking',
        text: 'محتاج أفكّر شويّة',
        feedback: {
          tone: 'neutral',
          headline: 'تمام — خد وقتك',
          body: 'القرارات الكبيرة محتاجة وقت. لمّا تجهز — إحنا هنا، ومستنّيك.'
        }
      },
      {
        id: 'later',
        text: 'لسه ما جاش الوقت',
        feedback: {
          tone: 'caution',
          headline: 'وده محترم',
          body: 'بس خد بالك — اللحظة اللي بنتأجّل فيها أحيانًا بتطول أكتر مما نتخيّل. خلّي السؤال شغّال جوّاك.'
        }
      }
    ]
  }
};

// ────────────────────────────────────────────────────────────────────
// الـ Engine
// ────────────────────────────────────────────────────────────────────
const PollEngine = {
  state: {
    pollKey: null,
    screen: 'question',
    selectedOption: null
  },
  container: null,

  // ── Init ──
  init(host, pollKey) {
    this.container = host;
    this.state = {
      pollKey,
      screen: 'question',
      selectedOption: null
    };
    this.loadFromLocalStorage();
    this.render();
  },

  // ── Persistence ──
  saveToLocalStorage() {
    const payload = {
      ...this.state,
      participant_id: getParticipantId(),
      saved_at: Date.now()
    };
    localStorage.setItem(`mfp_poll_${this.state.pollKey}`, JSON.stringify(payload));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem(`mfp_poll_${this.state.pollKey}`);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      const currentPid = getParticipantId();
      if (data.participant_id !== currentPid) {
        localStorage.removeItem(`mfp_poll_${this.state.pollKey}`);
        return;
      }
      // تجاهل state أقدم من ٦ ساعات
      if (Date.now() - data.saved_at > 6 * 60 * 60 * 1000) {
        localStorage.removeItem(`mfp_poll_${this.state.pollKey}`);
        return;
      }
      delete data.participant_id;
      delete data.saved_at;
      this.state = { ...this.state, ...data };
    } catch (e) {
      console.error('Failed to parse poll state:', e);
    }
  },

  // ── Logic ──
  async selectAnswer(optionId) {
    const config = POLL_CONFIGS[this.state.pollKey];
    const option = config.options.find(o => o.id === optionId);
    if (!option) return;

    this.state.selectedOption = optionId;
    this.saveToLocalStorage();

    // إرسال للـ Firebase
    try {
      await submitQuizResult(
        this.state.pollKey,
        { answer: optionId },
        { answer_id: optionId, answer_text: option.text }
      );
    } catch (err) {
      console.error('Failed to submit poll answer:', err);
    }

    // الانتقال للـ Feedback
    this.state.screen = 'feedback';
    this.saveToLocalStorage();
    this.render();
  },

  // ── Rendering ──
  render() {
    if (!this.container) return;
    if (this.state.screen === 'question') this.renderQuestion();
    else if (this.state.screen === 'feedback') this.renderFeedback();
  },

  renderQuestion() {
    const config = POLL_CONFIGS[this.state.pollKey];
    const accentClass = `accent-${config.accent}`;

    this.container.innerHTML = `
      <div class="poll-question ${accentClass} animate-scale">
        ${config.headline ? `<p class="poll-headline">${config.headline}</p>` : ''}
        <h2 class="poll-q-text">${config.question}</h2>
        ${config.note ? `<p class="poll-note">${config.note}</p>` : ''}

        <div class="poll-options">
          ${config.options.map(opt => `
            <button class="poll-option" data-id="${opt.id}">
              <span class="poll-option-text">${opt.text}</span>
              <span class="poll-option-arrow">←</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.poll-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        this.container.querySelectorAll('.poll-option').forEach(b => {
          b.disabled = true;
          if (b !== btn) b.classList.add('dimmed');
        });
        btn.classList.add('selected');
        setTimeout(() => this.selectAnswer(btn.dataset.id), 320);
      });
    });
  },

  renderFeedback() {
    const config = POLL_CONFIGS[this.state.pollKey];
    const option = config.options.find(o => o.id === this.state.selectedOption);
    const fb = option.feedback;
    const toneClass = `tone-${fb.tone}`;

    this.container.innerHTML = `
      <div class="poll-feedback ${toneClass} animate-scale">
        <div class="feedback-mark"></div>
        <h2 class="feedback-headline">${fb.headline}</h2>
        <p class="feedback-body">${fb.body}</p>
        <div class="feedback-divider"></div>
        <p class="feedback-cont">ارجع للزووم — كمّل معايا</p>
        <div class="pulse" style="margin-top: 1.5rem;"></div>
      </div>
    `;
  }
};
