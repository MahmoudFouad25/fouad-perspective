/* ====================================================================
   منظور الفؤاد — Poll Engine (v2 — Mirror Polls)
   ────────────────────────────────────────────────────────────────────
   محرّك Poll عامّ لكل التفاعلات السريعة:
   • welcome_question
   • opening_poll
   • khalid_moment
   • mirror_containment          (جديد)
   • mirror_full_expression      (جديد)
   • mirror_transformation       (جديد)
   • closing_decision
   ──────────────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────────────
// تكوين كل Poll
// ────────────────────────────────────────────────────────────────────
const POLL_CONFIGS = {

  // ─── السؤال الافتتاحيّ ──────────────────────────────────────────
  welcome_question: {
    headline: 'سؤال واحد',
    title: 'إمتى آخر مرّة حسّيت إنّك كويّس فعلًا؟',
    note: 'مش بس ماشي حالك... كويّس فعلًا.',
    layout: 'vertical',
    options: [
      {
        id: 'recent',
        text: 'إمبارح أو الأسبوع اللي فات',
        color: '#7DD3F0',
        feedback: {
          headline: 'إنت في موضع جميل',
          body: 'الإحساس ده مش بديهيّ — معظم الناجحين نسيوا طعمه. احتفظ به.'
        }
      },
      {
        id: 'month',
        text: 'شهر مضى تقريبًا',
        color: '#D4A24E',
        feedback: {
          headline: 'الوقت بدأ يبعد',
          body: 'شهر مش طويل، لكنّه مؤشّر. شيء بدأ يأخذ منك دون أن تنتبه.'
        }
      },
      {
        id: 'far',
        text: 'أكتر من شهر، مش متذكّر',
        color: '#E89954',
        feedback: {
          headline: 'دي إشارة مهمّة',
          body: 'لمّا ما تفتكرش آخر مرّة كنت فيها بخير فعلًا، يبقى الإحساس ما عادش بيوصل. ده الفصل اللي هندخل فيه.'
        }
      },
      {
        id: 'never',
        text: 'بصدق، مش فاكر آخر مرّة',
        color: '#E8543F',
        feedback: {
          headline: 'الصدق ده بداية',
          body: 'مش لأنّك أسوأ من غيرك — لأنّك بتقول الحقيقة اللي ناس كتير بتخبّيها. الويبينار ده مكتوب لك تحديدًا.'
        }
      }
    ]
  },

  // ─── Poll الافتتاح ──────────────────────────────────────────────
  opening_poll: {
    headline: 'Poll الافتتاح',
    title: 'إرهاق ولّا احتراق؟',
    note: 'اختار العبارة الأقرب لحالتك دلوقتي',
    layout: 'vertical',
    options: [
      {
        id: 'physical',
        text: 'تعبان جسديًّا، بس قلبي وعقلي معايا',
        color: '#7DD3F0',
        feedback: {
          headline: 'ده إرهاق — مش احتراق',
          body: 'الفرق جوهريّ. الإرهاق بيتعالج بالراحة. الاحتراق محتاج حاجة تانية تمامًا.'
        }
      },
      {
        id: 'distant',
        text: 'حاضر بجسمي، بعيد بقلبي',
        color: '#D4A24E',
        feedback: {
          headline: 'دي بداية الاحتراق',
          body: 'البُعد الداخليّ مع الحضور الخارجيّ — ده عَرَض المحور المُفرَط أو المُكبَت. هنفصلهم في الفصل التالت.'
        }
      },
      {
        id: 'empty',
        text: 'بنجز ومنتج، بس فاضي من جوّا',
        color: '#E89954',
        feedback: {
          headline: 'ده الفراغ — مرحلة ٦',
          body: 'الفراغ مع الإنجاز هو خصوصيّة المحور المكبوت. ده الفصل اللي هنفتحه بالكامل.'
        }
      },
      {
        id: 'all',
        text: 'حاسس بكل اللي فات في نفس الوقت',
        color: '#E8543F',
        feedback: {
          headline: 'الصدق ده شجاعة',
          body: 'لمّا الإنسان بيحسّ بكل ده، يبقى محتاج تشخيص دقيق — مش نصايح عامّة. ده اللي بنبنيه النّهاردة.'
        }
      },
      {
        id: 'fine',
        text: 'بخير فعلًا — جاي أتعلّم',
        color: '#A8B8CD',
        feedback: {
          headline: 'تمام، أهلًا بيك',
          body: 'الوقاية أحسن من العلاج. الإطار ده بيدّيك خريطة قبل ما تحتاجها.'
        }
      }
    ]
  },

  // ─── لحظة خالد ──────────────────────────────────────────────────
  khalid_moment: {
    headline: 'لحظة خالد',
    title: 'حصلّك تصحى الـ٣ الفجر بحجر على صدرك؟',
    note: '',
    layout: 'compact',
    options: [
      {
        id: 'often',
        text: 'أيوه، كتير',
        color: '#E8543F',
        feedback: {
          headline: 'إنت في قلب القصّة',
          body: 'الحجر ده مش عشوائيّ. ليه اسم، وله مصدر، وله طريق. هنوصله سوا.'
        }
      },
      {
        id: 'sometimes',
        text: 'حصل مرّات قليلة',
        color: '#D4A24E',
        feedback: {
          headline: 'إشارة مبكّرة',
          body: 'لو الحجر ده بدأ يطرق، يبقى محتاج تفتح الباب قبل ما يبقى ضيف دائم.'
        }
      },
      {
        id: 'never',
        text: 'لأ، ما حصلش',
        color: '#7DD3F0',
        feedback: {
          headline: 'تمام — والوقاية شُغل ذكيّ',
          body: 'مش لازم تنتظر الحجر تيجي عشان تفهم. الفهم قبل الأزمة هو الفرق بين الناضج والمنهك.'
        }
      }
    ]
  },

  // ════════════════════════════════════════════════════════════════
  // ⭐ مرايا المشاعر — التلات مراحل الجديدة
  // ════════════════════════════════════════════════════════════════

  // ─── المحور الأوّل: الاحتواء (ليلى/كريم/عمر) ────────────────────
  mirror_containment: {
    headline: 'المحور الأوّل في مرآة المشاعر',
    title: 'في معالجة مشاعرك القويّة — إنت أقرب لمين من التلاتة؟',
    note: 'مش قرار نهائيّ — لمحة لإحساس بيدور جوّاك',
    layout: 'persona-comparison',
    options: [
      {
        id: 'leila',
        text: 'ليلى — الدقيق المصلح',
        subtitle: 'بتحبس الشعور قبل ما يكتمل',
        body: 'الإحساس بيُمسَك قبل ما يخرج، فيتحوّل لتوتّر مزمن في الفكّ والكتفين، وحرص يقظ على تصحيح كل اللي حواليها',
        color: '#D4A24E',
        feedback: {
          headline: 'الجسد بيدفع الفاتورة',
          body: 'لمّا الشعور بيُحبَس قبل ما يكتمل، الطاقة بتروح للجسد. التوتّر اللي مش لاقي تفسير طبّيّ — هو غالبًا الفاتورة دي.'
        }
      },
      {
        id: 'kareem',
        text: 'كريم — المُنجِز المؤثّر',
        subtitle: 'بيؤجّل الشعور للمهمّة الجاية',
        body: 'الإحساس بيوصل لحظة، يتأجّل للمهمّة التالية، وبعدها للّي بعدها. والمهمّة ما بتنتهيش، فالشعور ما بيلاقيش موعده',
        color: '#F0B859',
        feedback: {
          headline: 'الإنجاز بيغطّي على الفراغ',
          body: 'كل مهمّة بتأجّل شعورًا. سنوات من التأجيل بتتحوّل لإرهاق لا تفسير له — ينطفئ فقط لمّا الحركة تتوقّف فجأة.'
        }
      },
      {
        id: 'omar',
        text: 'عمر — العقل الفيّاض',
        subtitle: 'بينقل الشعور لمساحة معرفيّة',
        body: 'الإحساس بيوصل من بعيد، عبر فهم ليه. بدل ما يحسّ الغضب، بيبقى عنده معرفة عن غضبه. الشعور بيصير معلومة',
        color: '#5BA8B8',
        feedback: {
          headline: 'المعرفة بتاكل التجربة',
          body: 'لمّا تعرف الشعور بدل ما تعيشه، الذهن بيتثقّل والقلب بيخفّ. الجسد بيبتعد عن الوعي تدريجيًّا.'
        }
      }
    ]
  },

  // ─── المحور الثاني: التعبير الكامل (سلمى/طارق/سامي) ─────────────
  mirror_full_expression: {
    headline: 'المحور الثاني في مرآة المشاعر',
    title: 'في خروج مشاعرك القويّة — إنت أقرب لمين؟',
    note: 'الشعور خرج — بس مشي ولّا فضل؟',
    layout: 'persona-comparison',
    options: [
      {
        id: 'salma',
        text: 'سلمى — العميق الأصيل',
        subtitle: 'بتغوص في الإحساس وتمتدّ معه',
        body: 'الشعور بيخرج بطيء، يتشكّل ويعيش. ثمّ تعود لتذوّقه — تفتح المحادثة القديمة، تسمع الأغنية، تكتب عنه بعد شهر',
        color: '#9B7EBD',
        feedback: {
          headline: 'العمق بيتحوّل لاستيطان',
          body: 'الشعور لا يمضي، تعود إليه. والعودة تُحيي الواردة من جديد. الحزن بيصير سمة، مش حال يمرّ.'
        }
      },
      {
        id: 'tariq',
        text: 'طارق — الإرادة المتجسّدة',
        subtitle: 'بيخرج كسؤال يبحث عن طمأنينة',
        body: 'الشعور بيخرج كسؤال — "ماذا لو؟". يجد طمأنينة جزئيّة، يسكت لحظات، ثمّ يولد شكّ جديد. الدورة تطعم نفسها',
        color: '#7B92C7',
        feedback: {
          headline: 'الدورة لا تنتهي',
          body: 'حتى الطمأنينة الكاملة لا تغلق الدورة. لأنّ الواردة محتاجة تخرج من جديد، مش ترحل. اليقظة بتصير إرهاق.'
        }
      },
      {
        id: 'samy',
        text: 'سامي — القوّة الحقيقيّة',
        subtitle: 'بيخرج فوريّ، ثمّ يفتّش عن وقود جديد',
        body: 'الشعور بيخرج في ثوانٍ — صوت يملأ المكان. ثم يخفت، ثم يبحث عن ما يستفزّه. اليوم الهادئ يُربكه',
        color: '#C84028',
        feedback: {
          headline: 'البحث عن الوقود',
          body: 'لمّا الشعور بيخرج بكامله بس ما بيمشيش، الكيان بيدوّر على وقود جديد. السكون بيبقى غير محتمل.'
        }
      }
    ]
  },

  // ─── المحور الثالث: التحويل (ندى/أحمد/هانم) ─────────────────────
  mirror_transformation: {
    headline: 'المحور الثالث في مرآة المشاعر',
    title: 'في تحويل مشاعرك قبل ما توصل لوعيك — إنت أقرب لمين؟',
    note: 'الشعور بيتحوّل قبل ما تعرفه — ده الأصعب في الكشف',
    layout: 'persona-comparison',
    options: [
      {
        id: 'nada',
        text: 'ندى — الكريم الحنون',
        subtitle: 'احتياجها بيتحوّل لـ "من يحتاجني؟"',
        body: 'حين يقترب احتياج للقرب أو الدفء، ينقلب فورًا لسؤال عن الآخر. تجد نفسها تطمئنّ على غيرها قبل ما تعرف إنّها هي اللي محتاجة',
        color: '#E58FA2',
        feedback: {
          headline: 'الاحتياج بيُترجَم لعطاء',
          body: 'العطاء جميل، لكن لمّا بيكون انقلابًا عن احتياج لم يصل لوعيك — بيتحوّل لحساب صامت، وقلب بيتعب من غير سبب ظاهر.'
        }
      },
      {
        id: 'ahmed',
        text: 'أحمد — الحرّ المتدفّق',
        subtitle: 'ألمه بيتحوّل لـ "ما الخطّة الجاية؟"',
        body: 'حين يقترب ألم أو خيبة، يحدث قفز في العقل لاحتمالات جديدة. الحزن يصير "ربّما هذه فرصة". الألم لا يصل بمذاقه',
        color: '#E8543F',
        feedback: {
          headline: 'التشعّب بيدفن الألم',
          body: 'كل قفزة لاحتمال جديد بتترك ألمًا غير معالَج تحت. السنوات بتتراكم، والثقل بيظهر لمّا الحركة تتوقّف فجأة.'
        }
      },
      {
        id: 'hanem',
        text: 'هانم — السلام الداخليّ',
        subtitle: 'غضبها بيتحوّل لـ "مش مهمّ"',
        body: 'حين يقترب موقف يستحقّ موقفًا، تختفي اللحظة بكلمة هادئة: "مش مهمّ". وما يصل ليس الغضب، بل غيابه',
        color: '#4ABEDF',
        feedback: {
          headline: 'الهدوء فوق طبقات مدفونة',
          body: 'الهدوء حقيقيّ — لكنّ تحته طبقات تنزل أعمق من أن يصلها وعيك. تنفجر فجأة في غير وقتها، وتفاجئ نفسك قبل من حولك.'
        }
      }
    ]
  },

  // ─── قرار الإغلاق ───────────────────────────────────────────────
  closing_decision: {
    headline: 'قبل ما نسيب بعض',
    title: 'هل ده اللحظة اللي قرّرت؟',
    note: 'القرار قرارك — وكل إجابة محترمة',
    layout: 'compact',
    options: [
      {
        id: 'yes',
        text: 'أيوه — بدأت دلوقتي',
        color: '#7DD3F0',
        feedback: {
          headline: 'بداية الطريق',
          body: 'القرار ده مش صغير. هتلاقي رسالة منّي في الإيميل خلال ساعات.'
        }
      },
      {
        id: 'thinking',
        text: 'محتاج أفكّر شويّة',
        color: '#D4A24E',
        feedback: {
          headline: 'الوقت معاك',
          body: 'القرار الجوهريّ بياخد وقته. العرض الخاصّ ساري ٤٨ ساعة — مفيش ضغط.'
        }
      },
      {
        id: 'later',
        text: 'لسه ما جاش الوقت',
        color: '#A8B8CD',
        feedback: {
          headline: 'كل واحد له وقته',
          body: 'احترم الإحساس ده. اللي خدته النّهاردة هيفضل معاك لمّا الوقت يجي.'
        }
      }
    ]
  }

};

// ────────────────────────────────────────────────────────────────────
// Poll Engine — محرّك عرض موحّد
// ────────────────────────────────────────────────────────────────────
const PollEngine = {
  state: {
    screen: 'question',   // question | feedback
    selected: null,
    stageKey: null
  },
  container: null,
  config: null,

  init(host, stageKey) {
    this.container = host;
    this.state = {
      screen: 'question',
      selected: null,
      stageKey: stageKey
    };
    this.config = POLL_CONFIGS[stageKey];
    if (!this.config) {
      console.error('Poll config not found:', stageKey);
      return;
    }
    this.loadFromLocalStorage();
    this.render();
  },

  saveToLocalStorage() {
    const payload = {
      ...this.state,
      participant_id: getParticipantId(),
      saved_at: Date.now()
    };
    localStorage.setItem(`mfp_poll_${this.state.stageKey}`, JSON.stringify(payload));
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem(`mfp_poll_${this.state.stageKey}`);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.participant_id !== getParticipantId()) {
        localStorage.removeItem(`mfp_poll_${this.state.stageKey}`);
        return;
      }
      if (Date.now() - data.saved_at > 6 * 60 * 60 * 1000) {
        localStorage.removeItem(`mfp_poll_${this.state.stageKey}`);
        return;
      }
      delete data.participant_id;
      delete data.saved_at;
      this.state = { ...this.state, ...data };
    } catch (e) {
      console.error('Failed to parse poll state:', e);
    }
  },

  async selectOption(optionId) {
    this.state.selected = optionId;
    const option = this.config.options.find(o => o.id === optionId);

    try {
      await submitQuizResult(
        this.state.stageKey,
        { answer_id: optionId },
        { answer_id: optionId, answer_text: option.text }
      );
    } catch (err) {
      console.error('Failed to submit poll:', err);
    }

    this.state.screen = 'feedback';
    this.saveToLocalStorage();
    this.render();
  },

  render() {
    if (!this.container) return;
    if (this.state.screen === 'feedback') {
      this.renderFeedback();
    } else {
      this.renderQuestion();
    }
  },

  renderQuestion() {
    const c = this.config;
    const layoutClass = c.layout === 'persona-comparison'
      ? 'poll-personas'
      : c.layout === 'compact'
        ? 'poll-options compact'
        : 'poll-options';

    this.container.innerHTML = `
      <div class="poll-screen animate-fade">
        <p class="poll-headline">${c.headline}</p>
        <h2 class="poll-title">${c.title}</h2>
        ${c.note ? `<p class="poll-note">${c.note}</p>` : ''}

        <div class="${layoutClass}">
          ${c.options.map(o => {
            if (c.layout === 'persona-comparison') {
              return `
                <button class="poll-persona-card" data-id="${o.id}" style="--c: ${o.color};">
                  <div class="poll-persona-name">${o.text}</div>
                  <div class="poll-persona-subtitle">${o.subtitle}</div>
                  <div class="poll-persona-body">${o.body}</div>
                  <div class="poll-persona-choose">ده أنا</div>
                </button>
              `;
            } else {
              return `
                <button class="poll-option" data-id="${o.id}" style="--c: ${o.color};">
                  <span class="poll-option-text">${o.text}</span>
                  <span class="poll-option-arrow">←</span>
                </button>
              `;
            }
          }).join('')}
        </div>
      </div>
    `;

    const selector = c.layout === 'persona-comparison' ? '.poll-persona-card' : '.poll-option';
    this.container.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectOption(btn.dataset.id);
      });
    });
  },

  renderFeedback() {
    const option = this.config.options.find(o => o.id === this.state.selected);
    const fb = option.feedback;

    this.container.innerHTML = `
      <div class="poll-feedback animate-scale" style="--c: ${option.color};">
        <div class="poll-feedback-mark"></div>
        <p class="poll-feedback-choice">${option.text}</p>
        <h2 class="feedback-headline">${fb.headline}</h2>
        <p class="feedback-body">${fb.body}</p>
        <div class="feedback-divider"></div>
        <p class="feedback-cont">ارجع للزووم — هنكمّل سوا</p>
        <div class="pulse" style="margin-top: 1.5rem;"></div>
      </div>
    `;
  }
};

console.log('✅ Poll Engine ready (v2 — mirror polls)');
