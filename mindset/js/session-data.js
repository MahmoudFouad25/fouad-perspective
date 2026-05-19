// ========================================
// منظور الفؤاد - بيانات الجلسة الكاملة
// كل المراحل والأسئلة والمحتوى
// ========================================

const SessionData = {
    // ========== جميع مراحل التدريب ==========
    phases: {
        // -------- قبل البداية --------
        waiting: {
            id: 'waiting',
            title: 'في انتظار البداية',
            session: 0,
            block: 'استعداد'
        },

        // ====== الجلسة الأولى: الافتتاح ======
        intro_welcome: {
            id: 'intro_welcome',
            title: 'تحت السطح',
            subtitle: 'هندسة العقلية ورحلة التحوّل من الاحتياج إلى القدرة',
            session: 1,
            block: 'الترحيب'
        },
        intro_question: {
            id: 'intro_question',
            title: 'سؤال معلّق',
            question: 'آخر مرة اتغيّرت فيها فعلاً... إيه اللي خلّاك تتغيّر؟',
            session: 1,
            block: 'السؤال المعلّق'
        },
        intro_introductions: {
            id: 'intro_introductions',
            title: 'خلينا نتعرف — بس بطريقتنا',
            session: 1,
            block: 'التعارف الذكي',
            questions: [
                { id: 1, text: 'إيه اللي جابك تشتغل في غيث بالظبط؟ (مش "وجدت إعلان" — اللي جواك)' },
                { id: 2, text: 'آخر مرة اتغيرت فيها في نفسك، إيه اللي حصل؟' },
                { id: 3, text: 'حاجة عنك زمايلك مش عارفينها، وممكن تشاركها النهارده؟' },
                { id: 4, text: 'لو ينفع تعيش في زمن من الأزمنة، هيكون زمن إيه؟ وليه؟' }
            ]
        },
        intro_code: {
            id: 'intro_code',
            title: 'تجربة قبل أي كلام',
            session: 1,
            block: 'الشفرة',
            code: [
                { word: 'الإيمان', value: 6 },
                { word: 'العقلية', value: 7 },
                { word: 'التفسير', value: 6 },
                { word: 'الإدراك', value: 6 },
                { word: 'الرؤية', value: 5 },
                { word: 'العقل', value: 4 },
                { word: 'الوعي', value: 4 },
                { word: 'الواقع', value: '؟' }
            ],
            hint: 'نفس القاعدة بتشتغل في كل سطر',
            answer: 5,
            rule: 'عدد حروف الكلمة'
        },
        intro_code_reveal: {
            id: 'intro_code_reveal',
            title: 'إنتم مش بتحلوا الشفرة',
            subtitle: 'إنتم بتفسروها',
            session: 1,
            block: 'الكشف'
        },
        intro_perception: {
            id: 'intro_perception',
            title: 'كل يوم في حياتك...',
            lines: [
                'إنت مش بتشوف الواقع',
                'إنت بتشوف تفسيرك للواقع',
                'والكلمة اللي بتفسر بيها اسمها: العقلية'
            ],
            session: 1,
            block: 'الكشف'
        },
        intro_framing: {
            id: 'intro_framing',
            title: 'ليه أنتم بالذات؟',
            subtitle: 'ننقل الإنسان من الاحتياج إلى القدرة',
            session: 1,
            block: 'التأطير'
        },
        intro_day_outline: {
            id: 'intro_day_outline',
            title: 'اليوم اللي قدامنا',
            session: 1,
            block: 'الإطار',
            points: [
                'هنفك بنية العقلية — معمولة إزاي',
                'هنشوف نفسنا بصدق — كل واحد يكتشف عقليته الشخصية',
                'هنفهم ليه التغيير بيفشل حتى لما نكون عاوزينه',
                'هنشتغل على مستفيد فعلي — نطبق اللي عرفناه بطريقة مهنية',
                'هنطلع بميثاق شخصي — لـ٩٠ يوم قدامنا'
            ]
        },
        break_1: {
            id: 'break_1',
            title: 'استراحة ١٥ دقيقة',
            subtitle: 'ارجع ١١:٣٠',
            session: 1,
            block: 'استراحة',
            isBreak: true
        },

        // ====== الجلسة الثانية: دويك ======
        dweck_intro: {
            id: 'dweck_intro',
            title: 'خمسة أبواب',
            subtitle: 'بتكشف عقليتك للناس — وأحياناً لنفسك',
            session: 2,
            block: 'افتتاح دويك'
        },

        // -- الفرق الأول: التحديات --
        dweck_challenges_situation: {
            id: 'dweck_challenges_situation',
            title: 'الفرق الأول: التحديات',
            session: 2,
            block: 'موقف',
            differenceIndex: 0,
            situation: 'مدير قطاع التكافل في غيث بيتصل بيكم ويقول: "عندنا قرية جديدة في الفيوم، ما اشتغلناش فيها قبل كده. ظروفها صعبة. مفيش عندنا أي علاقات هناك. القيادة عاوزة حد يفتح القرية دي. أنا مرشحك. توافق ولا لأ؟"',
            questions: [
                'إيه هو رد فعلك الأول الحقيقي؟ (مش "اللي المفروض"، اللي بيحصل فعلاً)',
                'إيه اللي بيخلي ناس تاخد فرص زي دي، وناس تتفاداها — رغم إنهم نفس المستوى من الذكاء والكفاءة؟'
            ]
        },
        dweck_challenges_deep: {
            id: 'dweck_challenges_deep',
            title: 'وراء التحديات: محور الوكالة',
            subtitle: 'الضحية ← → الفاعل',
            session: 2,
            block: 'الطبقة العميقة',
            differenceIndex: 0
        },
        dweck_challenges_questions: {
            id: 'dweck_challenges_questions',
            title: 'بصمتك في فرق التحديات',
            session: 2,
            block: 'تشخيص',
            differenceIndex: 0
        },

        // -- الفرق الثاني: العقبات --
        dweck_obstacles_situation: {
            id: 'dweck_obstacles_situation',
            title: 'الفرق الثاني: العقبات',
            session: 2,
            block: 'موقف',
            differenceIndex: 1,
            situation: 'إنت في مشروع "شفاء". قافلة طبية في قرية. حضرتم لها ٣ أسابيع. كل التفاصيل ماشية. اليوم اللي قبل القافلة، الطبيب الأساسي بيتصل ويعتذر — حادث في عيلته. مفيش بديل. الأهالي حضّروا نفسهم. مش هتقدر تلغي يومهم.',
            questions: [
                'إيه هي الأفكار اللي بتيجي في دماغك الـ٣٠ ثانية الأولى؟',
                'اللي بيشوف العقبة دي "كارثة" واللي بيشوفها "مشكلة قابلة للحل" — إيه اللي بيفرق بينهم في عقولهم؟'
            ]
        },
        dweck_obstacles_deep: {
            id: 'dweck_obstacles_deep',
            title: 'وراء العقبات: الوكالة + الوفرة',
            subtitle: 'حين تضيق العين عن البدائل',
            session: 2,
            block: 'الطبقة العميقة',
            differenceIndex: 1
        },
        dweck_obstacles_questions: {
            id: 'dweck_obstacles_questions',
            title: 'بصمتك في فرق العقبات',
            session: 2,
            block: 'تشخيص',
            differenceIndex: 1
        },

        // -- الفرق الثالث: الجهد --
        dweck_effort_situation: {
            id: 'dweck_effort_situation',
            title: 'الفرق الثالث: الجهد',
            session: 2,
            block: 'موقف',
            differenceIndex: 2,
            situation: 'إنت في فريق "فرحة بشنطة". زمايلك شغّالين لحد الفجر قبل ابتداء الدراسة. إنت بتشوفهم.',
            questions: [
                'أول حاجة بتلاحظها لما تشوف زميلك بيشتغل لحد الفجر — إيه هي؟ (بصدق)',
                'إيه الفرق بين شخص بيشوف الجهد كـ"إثبات إنه مش موهوب"، وشخص بيشوفه كـ"طريق طبيعي للإجادة"؟'
            ]
        },
        dweck_effort_deep: {
            id: 'dweck_effort_deep',
            title: 'وراء الجهد: محور النمو',
            subtitle: 'الثبات ← → النمو',
            session: 2,
            block: 'الطبقة العميقة',
            differenceIndex: 2
        },
        dweck_effort_questions: {
            id: 'dweck_effort_questions',
            title: 'بصمتك في فرق الجهد',
            session: 2,
            block: 'تشخيص',
            differenceIndex: 2
        },

        // -- الفرق الرابع: النقد --
        dweck_criticism_situation: {
            id: 'dweck_criticism_situation',
            title: 'الفرق الرابع: النقد',
            session: 2,
            block: 'موقف',
            differenceIndex: 3,
            situation: 'مديرك بيستدعيك ويقول: "التقرير اللي رفعته الأسبوع اللي فات ناقص في ٣ نقاط. محتاج نراجع".',
            questions: [
                'إيه أول حاجة بتحصل في جسمك في الثانية الأولى — قبل ما تتكلم؟',
                'ليه نفس النقد لما يتقال لشخصين، الأول بيشد عضله ويدافع، والثاني بيقول "أيوة فهمت"؟'
            ]
        },
        dweck_criticism_deep: {
            id: 'dweck_criticism_deep',
            title: 'وراء النقد: الهوية في خطر',
            subtitle: 'بين السلوك والذات',
            session: 2,
            block: 'الطبقة العميقة',
            differenceIndex: 3
        },
        dweck_criticism_questions: {
            id: 'dweck_criticism_questions',
            title: 'بصمتك في فرق النقد',
            session: 2,
            block: 'تشخيص',
            differenceIndex: 3
        },

        // -- الفرق الخامس: نجاح الآخرين --
        dweck_success_situation: {
            id: 'dweck_success_situation',
            title: 'الفرق الخامس: نجاح الآخرين',
            session: 2,
            block: 'موقف',
            differenceIndex: 4,
            situation: 'قطاع التمكين في غيث أنجز مشروع "ارتقاء" واتم تكريمهم في اجتماع المؤسسة. إنت في قطاع تاني. بتشوفهم بياخدوا التكريم.',
            questions: [
                'إيه أول إحساس بيمر عليك — مش الإحساس اللي "المفروض"، الإحساس اللي بيحصل فعلاً؟',
                'ليه نفس الموقف بيلهم شخص ويغيظ شخص تاني؟'
            ]
        },
        dweck_success_deep: {
            id: 'dweck_success_deep',
            title: 'وراء نجاح الآخرين: محور الوفرة',
            subtitle: 'الكعكة المحدودة ← → الكعكة التي تتسع',
            session: 2,
            block: 'الطبقة العميقة',
            differenceIndex: 4
        },
        dweck_success_questions: {
            id: 'dweck_success_questions',
            title: 'بصمتك في فرق نجاح الآخرين',
            session: 2,
            block: 'تشخيص',
            differenceIndex: 4
        },

        // -- النتيجة: الخريطة العنكبوتية --
        dweck_radar: {
            id: 'dweck_radar',
            title: 'بصمتك الخماسية',
            subtitle: 'الخريطة الكاملة',
            session: 2,
            block: 'النتيجة'
        },
        dweck_choose_focus: {
            id: 'dweck_choose_focus',
            title: 'اختار فرق واحد',
            subtitle: 'هتشتغل عليه باقي اليوم',
            session: 2,
            block: 'الاختيار'
        },
        break_2: {
            id: 'break_2',
            title: 'غداء وصلاة',
            subtitle: 'ارجع ٢:١٥',
            session: 2,
            block: 'استراحة',
            isBreak: true
        },

        // ====== الجلسة الثالثة: المناعة + الأبواب ======
        immunity_question: {
            id: 'immunity_question',
            title: 'ليه أعرف اللي محتاج أتغير فيه، ومش بأتغير؟',
            session: 3,
            block: 'السؤال المعلّق'
        },
        immunity_concept: {
            id: 'immunity_concept',
            title: 'الجهاز المناعي العقلي',
            subtitle: 'روبرت كيجان وليزا لاهي — هارفارد — ٤٠ سنة بحث',
            session: 3,
            block: 'التقديم'
        },
        immunity_karim: {
            id: 'immunity_karim',
            title: 'كريم — مدير في شركة',
            session: 3,
            block: 'مثال',
            data: {
                stated_goal: 'أن أفوّض المهام لفريقي',
                counter_behaviors: 'أراقب، أتدخل، آخذ المهمة، أعمل بنفسي',
                hidden_commitment: 'ألا يخطئ أحد تحت إدارتي',
                big_assumption: 'إن غلط أحد تحت إدارتي = أنا فاشل كقائد'
            }
        },
        immunity_revelation: {
            id: 'immunity_revelation',
            title: 'لست ضعيفاً. لست كسولاً. لست رافضاً للتغيير',
            subtitle: 'داخلك التزام مخفي يحمي الوضع الحالي',
            session: 3,
            block: 'اللحظة الانكشافية'
        },
        immunity_doors_intro: {
            id: 'immunity_doors_intro',
            title: 'كريم نوع واحد من ٩ أنواع',
            subtitle: 'الأبواب الثلاثة',
            session: 3,
            block: 'الأبواب'
        },

        // -- الأبواب والطبائع --
        door_1_intro: {
            id: 'door_1_intro',
            title: 'الباب الأول — الهمة والعزيمة',
            subtitle: 'علاقة خاصة مع طاقة الفعل في العالم',
            session: 3,
            block: 'الباب الأول'
        },
        nature_1: {
            id: 'nature_1',
            title: 'الطابع الأول — الإتقان',
            subtitle: 'قلق النقص يلبس ثوب الإتقان',
            session: 3,
            block: 'طبيعة',
            natureIndex: 1,
            data: {
                hidden_commitment: 'ألا أبدو ناقصاً',
                big_assumption: 'نقص أي شيء = نقصي أنا'
            }
        },
        nature_8: {
            id: 'nature_8',
            title: 'الطابع الثامن — القوة',
            subtitle: 'الخوف من الموقع الأضعف يلبس ثوب القوة',
            session: 3,
            block: 'طبيعة',
            natureIndex: 8,
            data: {
                hidden_commitment: 'ألا أكون في موقع الضعيف',
                big_assumption: 'الضعف = الفناء'
            }
        },
        nature_9: {
            id: 'nature_9',
            title: 'الطابع التاسع — السلام',
            subtitle: 'غياب الدافع يلبس ثوب السلام',
            session: 3,
            block: 'طبيعة',
            natureIndex: 9,
            data: {
                hidden_commitment: 'ألا أحدث صداماً',
                big_assumption: 'إرادتي = الصدام = الفقد'
            }
        },
        door_2_intro: {
            id: 'door_2_intro',
            title: 'الباب الثاني — الأنس والقرب',
            subtitle: 'الفعل يكتمل بصلة بآخر',
            session: 3,
            block: 'الباب الثاني'
        },
        nature_2: {
            id: 'nature_2',
            title: 'الطابع الثاني — العطاء',
            subtitle: 'العين شرط اكتمال العطاء',
            session: 3,
            block: 'طبيعة',
            natureIndex: 2,
            data: {
                hidden_commitment: 'ألا أُترك',
                big_assumption: 'بدون عطاء = بدون قيمة = بلا أحد'
            }
        },
        nature_3: {
            id: 'nature_3',
            title: 'الطابع الثالث — الإنجاز',
            subtitle: 'العين مقياس قيمة الإنجاز',
            session: 3,
            block: 'طبيعة',
            natureIndex: 3,
            data: {
                hidden_commitment: 'ألا أبدو فاشلاً',
                big_assumption: 'قيمتي = ما يراه الآخرون فيّ'
            }
        },
        nature_4: {
            id: 'nature_4',
            title: 'الطابع الرابع — العمق',
            subtitle: 'العين تخنق الفعل بدل أن تكتمل به',
            session: 3,
            block: 'طبيعة',
            natureIndex: 4,
            data: {
                hidden_commitment: 'ألا أكون عادياً',
                big_assumption: 'العادية = الذوبان = العدم'
            }
        },
        door_3_intro: {
            id: 'door_3_intro',
            title: 'الباب الثالث — اليقين والبيان',
            subtitle: 'العقل يجلّي ما هو غامض',
            session: 3,
            block: 'الباب الثالث'
        },
        nature_5: {
            id: 'nature_5',
            title: 'الطابع الخامس — الفهم',
            subtitle: 'القلق ينحدر إلى الداخل كنشاط ذهني صامت',
            session: 3,
            block: 'طبيعة',
            natureIndex: 5,
            data: {
                hidden_commitment: 'ألا أُستنزَف',
                big_assumption: 'الانفتاح على العالم = استنزاف بلا تعويض'
            }
        },
        nature_6: {
            id: 'nature_6',
            title: 'الطابع السادس — الحذر',
            subtitle: 'القلق يُعاش حياً موسَّعاً',
            session: 3,
            block: 'طبيعة',
            natureIndex: 6,
            data: {
                hidden_commitment: 'ألا أُخدَع',
                big_assumption: 'الثقة الكاملة = خيانة محققة'
            }
        },
        nature_7: {
            id: 'nature_7',
            title: 'الطابع السابع — التجدد',
            subtitle: 'القلق يُحوَّل إلى حماس واندفاع نحو الجديد',
            session: 3,
            block: 'طبيعة',
            natureIndex: 7,
            data: {
                hidden_commitment: 'ألا أعلق في الألم',
                big_assumption: 'التوقف في الألم = الغرق فيه'
            }
        },

        natures_table: {
            id: 'natures_table',
            title: '٩ طبائع. ٩ التزامات مخفية. ٩ ميكانيكيات مناعة',
            session: 3,
            block: 'الجدول الشامل'
        },

        // -- التطبيق الذاتي --
        immunity_personal_work: {
            id: 'immunity_personal_work',
            title: 'خريطة المناعة — أنا',
            subtitle: '٥ مربعات. هتشتغل عليها مع شريك',
            session: 3,
            block: 'التطبيق الذاتي'
        },
        immunity_closing: {
            id: 'immunity_closing',
            title: '٣ حاجات لازم تعرفها',
            session: 3,
            block: 'الختام',
            points: [
                'اللي اكتشفته مش عيب فيك. ده آلية حماية صنعها عقلك علشان يحميك',
                'الافتراض الكبير اللي كتبته — اختبره',
                'التحول مش معركة مع نفسك. التحول حوار مع نفسك'
            ]
        },
        break_3: {
            id: 'break_3',
            title: 'استراحة قصيرة',
            subtitle: 'ارجع ٤:٢٥',
            session: 3,
            block: 'استراحة',
            isBreak: true
        },

        // ====== الجلسة الرابعة: أسامة ======
        osama_intro: {
            id: 'osama_intro',
            title: 'من الاحتياج إلى القدرة',
            subtitle: 'حالة عملية — تطبيق غيث',
            session: 4,
            block: 'افتتاح'
        },
        osama_story: {
            id: 'osama_story',
            title: 'أسامة — ٤٢ سنة | متزوج | ثلاثة أطفال',
            session: 4,
            block: 'القصة',
            story: [
                'أسامة، ٤٢ سنة. ولد في قرية صغيرة بمحافظة المنوفية. والده كان فلاحاً يملك قطعة أرض صغيرة، توفّي وأسامة في الـ١٥ من عمره. لم يكمل تعليمه بعد الإعدادية — اضطر للعمل ليعيل أمه وأخواته الأصغر منه.',
                'انتقل إلى مدينة شبين الكوم، عمل في ورشة لإصلاح الموتوسيكلات لمدة سبع سنوات. تعلّم المهنة، وفي عام ٢٠١٠ اشترى توك توك من مدّخراته، وبدأ يعمل لحسابه. تزوّج بعد سنتين من سيدة من قريته، ورزقه الله بثلاثة أطفال: ولدين وبنت، أكبرهم اليوم في الصف الثاني الإعدادي، وأصغرهم في الحضانة.',
                'كانت حياته صعبة لكن مستقرة. يعمل من السادسة صباحاً حتى التاسعة مساءً. الدخل محدود، لكنه كان يكفي تكاليف العيش الأساسية، وكان يدّخر القليل لمستقبل أطفاله.',
                'قبل سنتين، في طريق العودة من العمل في يوم ممطر، صدمته سيارة ملاكي. السائق هرب. أسامة استيقظ في المستشفى وقد كُسرت ساقه اليمنى في ثلاثة مواضع، وعانى من إصابة في الظهر تمنعه من حمل الأوزان لفترات طويلة.',
                'لم يحصل على أي تعويض. عملية إصلاح ساقه استنفدت كل مدّخراته، وباع توك توكه لتمويل العلاج. خرج من المستشفى وهو بلا عمل، ومعه فاتورة علاج طبيعي مستمر.',
                'بدأ يبحث عن عمل. حاول كحارس عقار — لم يستطع البقاء واقفاً لساعات. حاول كبائع في محل — لم يقبله أحد لأن المحلات تبحث عن شباب أصغر. حاول السواقة في تطبيقات الأوبر بسيارة صديقه — تعبت ظهره بعد أسبوع وأصرّ الطبيب أن يتوقف.',
                'بعد سنة كاملة من المحاولات، استسلم. زوجته خرجت تعمل في تنظيف بيوت في المدينة. ابنه الأكبر بدأ يبيع المناديل في الإشارات بعد المدرسة. ابنته الصغرى خرجت من الحضانة لأنهم لم يقدروا على المصاريف.',
                'أسامة الآن في البيت معظم اليوم. يساعد في بعض الأعمال المنزلية، يأخذ أطفاله إلى المدرسة، لكنه يقضي ساعات طويلة جالساً يفكّر. أصبح أقل كلاماً مع زوجته. أصبح أقصر صبراً مع أطفاله.',
                'قبل ثلاثة أشهر، قريب له أخبره عن مؤسسة غيث. أتى لكم. قدّم طلب مساعدة لشراء توك توك جديد. يقول إنه بمجرد ما يحصل على التوك توك، حياته ستعود كما كانت.'
            ],
            sentences: [
                'الدنيا ما هاش معايا أبداً',
                'كل مرة بأحاول أعمل حاجة، يحصل لي حاجة',
                'لو الحادثة دي ما كانتش حصلت، كنت لسه عايش زي زمان',
                'جيراني كلهم بيحققوا، أنا بس اللي مش بأحقق',
                'مفيش حد بيساعد محدش. كل واحد ماشي في حاله',
                'أنا مش زي زماني. كنت قوي. دلوقتي مش عارف نفسي',
                'لو ربنا حقاً معايا، ما كانش هيحصلي ده'
            ]
        },
        osama_groups_work: {
            id: 'osama_groups_work',
            title: 'المهمة',
            subtitle: '٥ مجموعات. ٥ مداخل. ١٥ دقيقة',
            session: 4,
            block: 'العمل الجماعي'
        },
        osama_protocol: {
            id: 'osama_protocol',
            title: 'البروتوكول الذي بنيتموه',
            session: 4,
            block: 'النتيجة'
        },
        break_4: {
            id: 'break_4',
            title: 'استراحة ٥ دقايق',
            subtitle: 'ارجع ٥:٠٠',
            session: 4,
            block: 'استراحة',
            isBreak: true
        },

        // ====== الجلسة الخامسة: الختام ======
        closing_iceberg_intro: {
            id: 'closing_iceberg_intro',
            title: 'الجبل الجليدي',
            subtitle: 'اللي اشتغلنا عليه طوال اليوم — له بنية',
            session: 5,
            block: 'افتتاح الختام'
        },
        closing_iceberg_full: {
            id: 'closing_iceberg_full',
            title: 'الجبل بطبقاته الكاملة',
            session: 5,
            block: 'البنية'
        },
        closing_perspective: {
            id: 'closing_perspective',
            title: 'منظور الفؤاد',
            subtitle: 'اللي عشتموه النهارده — له اسم',
            session: 5,
            block: 'الكشف'
        },
        closing_charter: {
            id: 'closing_charter',
            title: 'ميثاقك الشخصي',
            subtitle: '٩٠ يوم — بينك وبين نفسك',
            session: 5,
            block: 'الميثاق'
        },
        closing_verse: {
            id: 'closing_verse',
            title: 'إن الله لا يغيّر ما بقوم حتى يغيّروا ما بأنفسهم',
            subtitle: 'سورة الرعد — آية ١١',
            session: 5,
            block: 'الآية'
        },
        closing_final: {
            id: 'closing_final',
            title: 'رحلة الـ٩٠ يوم بدأت',
            session: 5,
            block: 'الختام'
        }
    },

    // ========== الفروقات الخمسة لدويك ==========
    dweck_differences: [
        {
            key: 'challenges',
            name: 'التحديات',
            color: '#fbbf24',
            axis: 'الوكالة',
            questions: [
                'لما يطلب مني حد مهمة ما عملتهاش قبل كده، أول إحساس بيمر عليّ هو الفضول مش القلق',
                'لو قدامي اختياران — مشروع مضمون النجاح، أو مشروع صعب أتعلم منه — أختار الثاني',
                'ما بأتجنبش المهام اللي ممكن أبان فيها "مش عارف" قدام زمايلي',
                'لما فرصة بتظهر علشان أتعلم مهارة جديدة، آخدها حتى لو خارج تخصصي',
                'بأشوف الصعوبة كدعوة، مش كتحذير'
            ]
        },
        {
            key: 'obstacles',
            name: 'العقبات',
            color: '#dc2626',
            axis: 'الوكالة + الوفرة',
            questions: [
                'لما خطتي بتتعطل، أول حركة عندي هي إعادة التخطيط، مش لوم الظروف ولا الناس',
                'ما بأنسحبش من المهمة لمجرد إنها ما مشيتش زي ما خططت',
                'الفشل عندي معلومة عن الطريق، مش حكم على ذاتي',
                'بأدور على ٣ بدائل على الأقل قبل ما أعلن إن حاجة "مستحيلة"',
                'بأصمد في المشاريع اللي نتايجها مش بتظهر بسرعة'
            ]
        },
        {
            key: 'effort',
            name: 'الجهد',
            color: '#f97316',
            axis: 'النمو',
            questions: [
                'بأشوف الجهد الكبير دليل جدية، مش دليل قلة موهبة',
                'بأحترم اللي بيشتغلوا بجد حتى لو نتايجهم لسه ما ظهرتش',
                'بأؤمن إن الإتقان محتاج وقت — حتى للي بيبان "متفوق"',
                'ما بأأجلش المهمة لأني عاوزها تطلع مثالية من المرة الأولى',
                'بأبذل جهد في مهام نتايجها مش هتظهر دلوقتي'
            ]
        },
        {
            key: 'criticism',
            name: 'النقد',
            color: '#a855f7',
            axis: 'الهوية vs السلوك',
            questions: [
                'لما حد بينتقدني، أول حاجة بأفكر فيها هي "إيه اللي أتعلمه؟" — مش "ليه بيهاجمني؟"',
                'بأقدر أبادر بنفسي وأطلب تقييم لشغلي بصراحة',
                'ما بأبعدش عن الناس اللي بينتقدوني بصدق',
                'بأشوف الناقد كمرآة، مش كمنافس',
                'بأغيّر سلوكي بناءً على نقد جيد، حتى لو كان موجع'
            ]
        },
        {
            key: 'others_success',
            name: 'نجاح الآخرين',
            color: '#10b981',
            axis: 'الوفرة',
            questions: [
                'نجاح زميلي بيلهمني، مش بيهددني',
                'بأسأل الناجحين عن طريقتهم، ما بأنتقدهاش',
                'بأقدر أحتفي بإنجاز شخص تاني بصدق تام',
                'ما بأدورش على عيوب في اللي تفوق عليّ',
                'بأؤمن إن نجاح غيري بيوسّع الكعكة، مش بياكل حصتي'
            ]
        }
    ],

    // ========== الطبائع التسعة ==========
    natures: [
        { num: 1, name: 'الإتقان', door: 'الهمة والعزيمة', hidden: 'ألا أبدو ناقصاً', big: 'نقص أي شيء = نقصي أنا', color: '#fbbf24' },
        { num: 2, name: 'العطاء', door: 'الأنس والقرب', hidden: 'ألا أُترك', big: 'بدون عطاء = بدون قيمة = بلا أحد', color: '#ec4899' },
        { num: 3, name: 'الإنجاز', door: 'الأنس والقرب', hidden: 'ألا أبدو فاشلاً', big: 'قيمتي = ما يراه الآخرون فيّ', color: '#f59e0b' },
        { num: 4, name: 'العمق', door: 'الأنس والقرب', hidden: 'ألا أكون عادياً', big: 'العادية = الذوبان = العدم', color: '#8b5cf6' },
        { num: 5, name: 'الفهم', door: 'اليقين والبيان', hidden: 'ألا أُستنزَف', big: 'الانفتاح على العالم = استنزاف بلا تعويض', color: '#3b82f6' },
        { num: 6, name: 'الحذر', door: 'اليقين والبيان', hidden: 'ألا أُخدَع', big: 'الثقة الكاملة = خيانة محققة', color: '#6366f1' },
        { num: 7, name: 'التجدد', door: 'اليقين والبيان', hidden: 'ألا أعلق في الألم', big: 'التوقف في الألم = الغرق فيه', color: '#eab308' },
        { num: 8, name: 'القوة', door: 'الهمة والعزيمة', hidden: 'ألا أكون في موقع الضعيف', big: 'الضعف = الفناء', color: '#dc2626' },
        { num: 9, name: 'السلام', door: 'الهمة والعزيمة', hidden: 'ألا أحدث صداماً', big: 'إرادتي = الصدام = الفقد', color: '#10b981' }
    ],

    // ========== مداخل أسامة الخمسة ==========
    osama_dimensions: [
        {
            key: 'agency',
            name: 'الوكالة',
            description: 'من ضحية إلى فاعل',
            color: '#fbbf24'
        },
        {
            key: 'abundance',
            name: 'الوفرة',
            description: 'من ندرة إلى وفرة',
            color: '#10b981'
        },
        {
            key: 'growth',
            name: 'النمو',
            description: 'من ثبات إلى نمو',
            color: '#f97316'
        },
        {
            key: 'meaning',
            name: 'المعنى',
            description: 'من تكرار إلى رسالة',
            color: '#8b5cf6'
        },
        {
            key: 'wound',
            name: 'الجرح',
            description: 'كيف يستقبل أسامة ما نقدّمه؟',
            color: '#dc2626'
        }
    ],

    // ========== الجبل الجليدي - المرايا السبع ==========
    iceberg_layers: [
        { name: 'النتائج / السلوك المرئي', position: 'above', description: 'دويك الـ٥' },
        { name: 'مرآة السلوك', position: 'below', layer: 1 },
        { name: 'مرآة المشاعر', position: 'below', layer: 2 },
        { name: 'مرآة الانتباه', position: 'below', layer: 3 },
        { name: 'مرآة النموذج الإدراكي', position: 'below', layer: 4 },
        { name: 'مرآة المعتقدات', position: 'below', layer: 5 },
        { name: 'مرآة الدوافع (الأبواب الثلاثة)', position: 'below', layer: 6 },
        { name: 'مرآة الجروح', position: 'below', layer: 7 },
        { name: 'طبقة الهوية (الجوهر والأشواق)', position: 'core' }
    ],

    // ========== ترتيب المراحل (للتنقل بالأمام/الخلف) ==========
    phaseOrder: [
        'waiting',
        'intro_welcome',
        'intro_question',
        'intro_introductions',
        'intro_code',
        'intro_code_reveal',
        'intro_perception',
        'intro_framing',
        'intro_day_outline',
        'break_1',
        'dweck_intro',
        'dweck_challenges_situation',
        'dweck_challenges_deep',
        'dweck_challenges_questions',
        'dweck_obstacles_situation',
        'dweck_obstacles_deep',
        'dweck_obstacles_questions',
        'dweck_effort_situation',
        'dweck_effort_deep',
        'dweck_effort_questions',
        'dweck_criticism_situation',
        'dweck_criticism_deep',
        'dweck_criticism_questions',
        'dweck_success_situation',
        'dweck_success_deep',
        'dweck_success_questions',
        'dweck_radar',
        'dweck_choose_focus',
        'break_2',
        'immunity_question',
        'immunity_concept',
        'immunity_karim',
        'immunity_revelation',
        'immunity_doors_intro',
        'door_1_intro',
        'nature_1',
        'nature_8',
        'nature_9',
        'door_2_intro',
        'nature_2',
        'nature_3',
        'nature_4',
        'door_3_intro',
        'nature_5',
        'nature_6',
        'nature_7',
        'natures_table',
        'immunity_personal_work',
        'immunity_closing',
        'break_3',
        'osama_intro',
        'osama_story',
        'osama_groups_work',
        'osama_protocol',
        'break_4',
        'closing_iceberg_intro',
        'closing_iceberg_full',
        'closing_perspective',
        'closing_charter',
        'closing_verse',
        'closing_final'
    ]
};

// تصدير عالمي
window.SessionData = SessionData;
