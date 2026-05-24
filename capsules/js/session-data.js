/* ============================================================
   session-data.js — Reignite Training Session Data
   كل المحتوى التدريبي. مصدر الحقيقة الوحيد للنصوص والمراحل.
   ============================================================ */

const SessionData = {

    // ===================================================
    // مصفوفات بيانات مساعدة
    // ===================================================

    // الفلاتر الخمسة (المحاور العقلية)
    mindsetAxes: [
        {
            key: 'agency',
            name: 'الوكالة',
            poles: { positive: 'الوكالة الداخلية', negative: 'الوكالة الخارجية' },
            polesEn: { positive: 'Internal Locus', negative: 'External Locus' },
            color: '#fbbf24',
            question: 'مين بيمسك دفة حياتك؟'
        },
        {
            key: 'abundance',
            name: 'الوفرة والندرة',
            poles: { positive: 'الوفرة', negative: 'الندرة' },
            polesEn: { positive: 'Abundance', negative: 'Scarcity' },
            color: '#10b981',
            question: 'الكون كريم ولا بخيل؟'
        },
        {
            key: 'becoming',
            name: 'الصيرورة والإنجاز',
            poles: { positive: 'الصيرورة', negative: 'الإنجاز' },
            polesEn: { positive: 'Becoming', negative: 'Performing' },
            color: '#3b82f6',
            question: 'هل أنا في طريق ولا في امتحان؟'
        },
        {
            key: 'mirror',
            name: 'المرآة والسهم',
            poles: { positive: 'المرآة', negative: 'السهم' },
            polesEn: { positive: 'Reflection', negative: 'Attack' },
            color: '#ec4899',
            question: 'النقد بيكشفني ولا بيهاجمني؟'
        },
        {
            key: 'grace',
            name: 'الفضل والمُحاصصة',
            poles: { positive: 'الفضل', negative: 'المُحاصصة' },
            polesEn: { positive: 'Abundant Grace', negative: 'Zero-Sum' },
            color: '#a78bfa',
            question: 'الخير كاسة واحدة ولا نهر؟'
        }
    ],

    // أسئلة الليكرت لكل محور (3 أسئلة لكل واحد)
    axisQuestions: {
        agency: [
            {
                text: 'لما الشركة بتمر بفترة صعبة، أول فكرة بتيجيلي:',
                poles: ['إيه اللي ممكن أنا أعمله مختلف؟', 'السوق بقى صعب، والظروف بتلعب ضدنا']
            },
            {
                text: 'لما بيحصل غلط من فريقي، بحس إن:',
                poles: ['ده مرتبط بطريقتي في القيادة، لازم أراجع', 'الناس بقت قلة جودة، صعب تلاقي حد محترم']
            },
            {
                text: 'لو سألت نفسي بصدق، "أنا فين من حياتي دلوقتي؟"، الإجابة بتيجي:',
                poles: ['أنا اللي رسمت طريقي، حتى الأخطاء قراراتي', 'الظروف رتبتها، أنا حاولت أتكيف']
            }
        ],
        abundance: [
            {
                text: 'لما عميل كبير قال "لأ"، أول إحساس بييجي:',
                poles: ['تمام، السوق فيه عملاء تانيين، ده يعلّمنا حاجة', 'كنا محتاجين الصفقة دي، الفرصة دي ضاعت']
            },
            {
                text: 'لما بفكر في وقتي، الإحساس الأقرب:',
                poles: ['الوقت أداة، بختار إزاي أستخدمه', 'الوقت بيهرب مني، مش لاحق على حاجة']
            },
            {
                text: 'لما واحد من فريقي بينجح، أول حركة في عقلي:',
                poles: ['نجاحه نجاح للفريق كله، بفرحلّه', 'أنا مش بظهر بنفس القدر، فين دوري؟']
            }
        ],
        becoming: [
            {
                text: 'لما بخلّص مشروع كبير، أول إحساس:',
                poles: ['أتأمل: إيه اللي اتعلمته؟', 'أحتفل بالنتيجة وأنتقل للي بعده']
            },
            {
                text: 'لما فريقي بيخطئ، أول رد فعل:',
                poles: ['ده فرصة تعليمية — نراجع ونتعلم', 'ده تأخير في الجدول — نصلّحه ونكمل']
            },
            {
                text: 'لو سألتك "إنت قدامك إيه؟"، الإجابة بتيجي:',
                poles: ['رحلة من تطور مستمر', 'قائمة من أهداف بحققهم واحد ورا التاني']
            }
        ],
        mirror: [
            {
                text: 'لما حد بينتقد قراري، أول إحساس جوّاني:',
                poles: ['في حاجة لازم أسمعها', 'بيهاجمني — لازم أدافع']
            },
            {
                text: 'لما حد بيقدّمي feedback سلبي، بعد الموقف بساعة:',
                poles: ['بفكّر في كلامه بهدوء، وبشوف هل في صح', 'بفكّر إزاي أرد، أو ليه قال كده']
            },
            {
                text: 'لو شخص في فريقي قالّي "إنت قسيت عليّ"، أول حركة:',
                poles: ['أوقف وأسأل: "إزاي؟ احكي"', 'أوضّح إن ما كانش قصدي، وأبرر السبب']
            }
        ],
        grace: [
            {
                text: 'لما واحد من المنافسين بيكبر، أول إحساس:',
                poles: ['السوق فيه مكان للكل، حلو ليه', 'ده على حسابنا، لازم نتحرك']
            },
            {
                text: 'لما واحد من فريقي بياخد ترقية أو ينجح في حاجة كبيرة:',
                poles: ['بفرحلّه بصدق، نجاحه دافع ليّ', 'بفرحلّه بس فيه حاجة جوّاياّ بتسأل "وأنا فين؟"']
            },
            {
                text: 'لما صاحب قديم بيوصل لمكان أعلى مني:',
                poles: ['بشاركه فرحته، ده طبيعي', 'بحسّ بمسافة، بحاول أفهم ليه هو وصل وأنا لأ']
            }
        ]
    },

    // المحاور الثلاثة من النفس
    nafsAxes: [
        {
            key: 'cohesion',
            name: 'التماسك',
            color: '#fbbf24',
            question: 'هل أنا بخير وآمن؟',
            keywords: ['الأمان', 'الاستقرار', 'الموارد', 'الصحة', 'الفلوس', 'النظام', 'المدّخرات'],
            description: 'طاقته رايحة ناحية حماية نفسه وموارده واستقراره'
        },
        {
            key: 'vitality',
            name: 'الحيوية',
            color: '#dc2626',
            question: 'هل أنا حيّ فعلاً؟',
            keywords: ['المعنى', 'الشغف', 'الاشتعال', 'التجربة', 'الإحساس بالحياة', 'الإبداع'],
            description: 'طاقته رايحة ناحية المعنى والتجربة العميقة والاشتعال'
        },
        {
            key: 'belonging',
            name: 'الانتماء',
            color: '#3b82f6',
            question: 'هل ليّ مكان بين الناس؟',
            keywords: ['الناس', 'الصلات', 'الانتماء', 'المكانة', 'العائلة', 'الدور بين الناس'],
            description: 'طاقته رايحة ناحية المكانة والدور والصلة بالمجموعة'
        }
    ],

    // الأنماط السلوكية الثلاثة
    behaviorPatterns: [
        {
            key: 'compliance',
            name: 'الامتثال',
            symbol: '↻',
            color: '#10b981',
            tagline: 'بيستنى إذن',
            description: 'جسدك بيستنى إذن قبل ما يتحرك',
            sources: ['معيار جوّاك (الصواب/الخطأ)', 'وش حد قدامك (الموافقة/الرفض)', 'صوت من سلطة (مرجعية)']
        },
        {
            key: 'assertive',
            name: 'الحزم',
            symbol: '→',
            color: '#fbbf24',
            tagline: 'بيبادر بسرعة',
            description: 'جسدك بيبادر قبل ما يستشار العقل',
            sources: ['ناتج يُرى (إنجاز)', 'خيار جديد (احتمال)', 'موقع لا يخضع (قوة)']
        },
        {
            key: 'withdrawal',
            name: 'الانسحاب',
            symbol: '←',
            color: '#a78bfa',
            tagline: 'بيخلّي الفضاء',
            description: 'جسدك بيخلّي الفضاء قبل ما يُسأل',
            sources: ['فضاء سطحي (مش متوافق مع العمق)', 'فضاء مُطالب (بياخد طاقة كتير)', 'فضاء يطلب أولوية ذاتية (يفرض رأي)']
        }
    ],

    // أسئلة مقياس السلوك (12 سؤال)
    behaviorQuestions: [
        // أسئلة تحديد النمط (6)
        { text: 'لما الضغط بييجي، أول حركة في جسدي: بستنى ثانية أراجع قبل ما أتحرك', dim: 'pattern', maps: 'compliance' },
        { text: 'لما الضغط بييجي، أول حركة: بستقيم وآخد المساحة، الكلام بيخرج بسرعة', dim: 'pattern', maps: 'assertive' },
        { text: 'لما الضغط بييجي، أول حركة: بسحب نفسي لورا، أو بآخد سيب من القهوة، أو بمشي خطوة بعيد', dim: 'pattern', maps: 'withdrawal' },
        { text: 'في اجتماع متوتر، أول واحد بيقرا الموقف بدقة قبل ما يتكلم — أنا', dim: 'pattern', maps: 'compliance' },
        { text: 'في اجتماع متوتر، أول واحد بيحسم القرار — أنا', dim: 'pattern', maps: 'assertive' },
        { text: 'في اجتماع متوتر، آخر واحد بيتكلم — أنا', dim: 'pattern', maps: 'withdrawal' },
        // أسئلة تحديد الطيف (6)
        { text: 'بختار سلوكي تحت الضغط بحرية، بيتغير حسب الموقف', dim: 'spectrum', maps: 'balance' },
        { text: 'نمطي تحت الضغط بيُمدح من الناس حواليّ، والمدح بقى جزء مني', dim: 'spectrum', maps: 'excess-mild' },
        { text: 'في لحظات الفشل، بيخرج مني فعل ما بيشبهنيش — بيفاجئني قبل ما يفاجئ غيري', dim: 'spectrum', maps: 'excess-break' },
        { text: 'في فترات أخيرة، حسّيت إن النمط اللي كان معايا توقف — مش بقدر أتحرك زي الأول', dim: 'spectrum', maps: 'deficit-freeze' },
        { text: 'بفعل اللي مفروض أعمله، بس فيه إحساس إن مش أنا اللي بيعمله — كأنه آلي', dim: 'spectrum', maps: 'deficit-detach' },
        { text: 'بحس إن جسدي بيرد بنفس الطريقة في كل المواقف، حتى لما الموقف يطلب رد مختلف', dim: 'spectrum', maps: 'excess' }
    ],

    // المسارات التسعة للتعافي
    recoveryPaths: [
        { axis: 'cohesion', name: 'السُّكنى', color: '#fbbf24' },
        { axis: 'cohesion', name: 'الكَفَاف', color: '#fbbf24' },
        { axis: 'cohesion', name: 'الحِلم', color: '#fbbf24' },
        { axis: 'vitality', name: 'اليقظة', color: '#dc2626' },
        { axis: 'vitality', name: 'البيان', color: '#dc2626' },
        { axis: 'vitality', name: 'التجدّد', color: '#dc2626' },
        { axis: 'belonging', name: 'الميزان', color: '#3b82f6' },
        { axis: 'belonging', name: 'التأصّل', color: '#3b82f6' },
        { axis: 'belonging', name: 'الفيض', color: '#3b82f6' }
    ],

    // ===================================================
    // المراحل (Phases) — قلب النظام
    // ===================================================
    phases: {

        // ============ قبل البداية ============
        waiting: {
            id: 'waiting',
            title: 'في انتظار بدء اللقاء',
            subtitle: 'Reignite — Burnout to Brilliance',
            session: 0,
            block: 'انتظار',
            template: 'waiting'
        },

        // ============ الجلسة الأولى: الافتتاح والميثاق (9:30-9:45) ============
        intro_welcome: {
            id: 'intro_welcome',
            title: 'Reignite',
            subtitle: 'Burnout to Brilliance Program',
            session: 1,
            block: 'افتتاح',
            template: 'welcome-logo',
            footer: 'Proactive Development Solutions'
        },

        intro_charter: {
            id: 'intro_charter',
            title: 'اتفاقنا في الـ 5 ساعات',
            session: 1,
            block: 'الميثاق',
            template: 'charter-three-points',
            points: [
                {
                    num: '١',
                    title: 'حضوركم الكامل',
                    body: 'الموبايل هيكون أداة تفاعل، مش وسيلة هروب'
                },
                {
                    num: '٢',
                    title: 'الصدق مع نفسك',
                    body: 'اللي بتكتبه على موبايلك بينك وبين نفسك'
                },
                {
                    num: '٣',
                    title: 'الثقة في العملية',
                    body: 'لو حاجة استفزتك، قول قبل ما تستبعدها'
                }
            ]
        },

        intro_phone_setup: {
            id: 'intro_phone_setup',
            title: 'افتح موبايلك',
            subtitle: 'اختار اسم وهمي يخصك إنت بس — حد غيرك مش هيعرفه',
            session: 1,
            block: 'تسجيل',
            template: 'phone-register',
            instructions: 'وجّه كاميرا الموبايل على الكارت قدامك، أو اعمل Scan للكود ده'
        },

        // ============ الجزء الأول: الاعتراف (9:45-10:50) ============
        recognition_question: {
            id: 'recognition_question',
            title: 'إمتى آخر مرة حسّيت إنك بخير من جوّه؟',
            session: 2,
            block: 'الاعتراف',
            template: 'big-question-dark'
        },

        recognition_first_poll: {
            id: 'recognition_first_poll',
            title: 'اللحظة دي... فاكرها إمتى؟',
            subtitle: 'افتح موبايلك واختار — النتيجة هتظهر على الشاشة الكبيرة، من غير أسماء',
            session: 2,
            block: 'تفاعل',
            template: 'single-choice-poll',
            saveKey: 'q1_lastWell',
            options: [
                { id: 'yesterday', label: 'إمبارح أو الأسبوع ده', color: '#10b981' },
                { id: 'month', label: 'في الشهر اللي فات', color: '#84cc16' },
                { id: 'three_months', label: 'في الأشهر التلاتة اللي فاتوا', color: '#fbbf24' },
                { id: 'year', label: 'في السنة اللي فاتت', color: '#f97316' },
                { id: 'not_remember', label: 'مش متذكر بدقة', color: '#dc2626' },
                { id: 'not_sure', label: 'مش متأكد من إجابتي', color: '#a78bfa' }
            ]
        },

        recognition_first_result: {
            id: 'recognition_first_result',
            title: 'الصورة في القاعة دي',
            subtitle: 'في غرفة فيها 12 قائد...',
            session: 2,
            block: 'نتيجة',
            template: 'bar-chart-result',
            sourceKey: 'q1_lastWell',
            sourcePhase: 'recognition_first_poll'
        },

        recognition_compare: {
            id: 'recognition_compare',
            title: 'الفرق بين الإرهاق والاحتراق',
            session: 2,
            block: 'تمييز',
            template: 'two-column-compare',
            columns: [
                {
                    side: 'right',
                    title: 'الإرهاق',
                    color: '#3b82f6',
                    icon: '✓',
                    items: [
                        'بيخفّ مع الراحة',
                        'مربوط بمجهود محدد',
                        'النوم والإجازة بيعالجوه',
                        'مرحلة بتعدّي'
                    ]
                },
                {
                    side: 'left',
                    title: 'الاحتراق',
                    color: '#dc2626',
                    icon: '✗',
                    items: [
                        'ما بيخفّش حتى لو ارتحت',
                        'مش مربوط بحاجة محددة',
                        'الإجازة بترجّعك لنفس النقطة',
                        'حالة بتطوّل وبتتعمّق'
                    ]
                }
            ]
        },

        recognition_three_levels: {
            id: 'recognition_three_levels',
            title: 'الاحتراق بيشتغل على 3 مستويات في نفس الوقت',
            session: 2,
            block: 'إطار',
            template: 'three-levels-circles',
            levels: [
                { name: 'الطاقة بتنضب', color: '#fbbf24', desc: 'الجسم بيتعب، النوم بيقل، المناعة بتضعف' },
                { name: 'العلاقة بتبرد', color: '#3b82f6', desc: 'الشغل، الناس، النفس — كلها بتبعد' },
                { name: 'المعنى بيضيع', color: '#dc2626', desc: 'بتنجح وحاسس إن كل ده مش بيدّيك إحساس بحاجة' }
            ]
        },

        recognition_degrees: {
            id: 'recognition_degrees',
            title: 'درجات الاحتراق',
            session: 2,
            block: 'إطار',
            template: 'degrees-summary',
            degrees: [
                { count: 'مستوى واحد', label: 'بداية إنذار', color: '#fbbf24' },
                { count: 'مستويين', label: 'احتراق بيتكوّن', color: '#f97316' },
                { count: 'التلاتة مع بعض', label: 'احتراق متعمّق', color: '#dc2626' }
            ]
        },

        recognition_big_poll: {
            id: 'recognition_big_poll',
            title: 'اختار العبارة الأقرب للي بتعيشه دلوقتي',
            subtitle: 'اصدق مع نفسك — محدش هيشوف اختيارك باسمك',
            session: 2,
            block: 'تفاعل',
            template: 'single-choice-poll',
            saveKey: 'q2_burnoutLevel',
            options: [
                { id: 'level1', label: 'أنا تعبان جسدياً، بس قلبي وعقلي لسه معايا', color: '#fbbf24' },
                { id: 'level2', label: 'أنا حاضر بجسمي، بس بقيت بعيد عن شغلي والناس', color: '#f97316' },
                { id: 'level3', label: 'أنا بنجز ومنتج، بس فاضي من جوّه — مش لاقي طعم في اللي بعمله', color: '#dc2626' },
                { id: 'level4', label: 'أنا حاسس بكل اللي فات في نفس الوقت', color: '#991b1b' },
                { id: 'level5', label: 'أنا بخير فعلاً — جايّ أتعلم بس', color: '#10b981' }
            ]
        },

        recognition_big_result: {
            id: 'recognition_big_result',
            title: 'اللي بتعيشه القاعة دلوقتي',
            session: 2,
            block: 'نتيجة',
            template: 'pie-chart-result',
            sourceKey: 'q2_burnoutLevel',
            sourcePhase: 'recognition_big_poll'
        },

        recognition_khaled_intro: {
            id: 'recognition_khaled_intro',
            title: 'خالد',
            session: 2,
            block: 'قصة',
            template: 'name-only-big'
        },

        recognition_khaled_outside: {
            id: 'recognition_khaled_outside',
            title: 'حياة خالد... من بره',
            session: 2,
            block: 'قصة',
            template: 'profile-card',
            profileBullets: [
                'خالد، 40 سنة',
                'مؤسس سلسلة من 4 فروع في قطاع الخدمات',
                'متجوز، عنده ولدين',
                'بيت ملكه في كومباوند محترم',
                'دخله ضمن أعلى شريحة في السوق',
                'الشركة بتنمو سنة ورا سنة بنسبة 25%'
            ]
        },

        recognition_khaled_hidden: {
            id: 'recognition_khaled_hidden',
            title: 'بس خالد...',
            session: 2,
            block: 'قصة',
            template: 'dark-narrative',
            isDark: true,
            paragraphs: [
                'كل يوم بيصحى الساعة 3 الفجر.',
                'مش كابوس. مش قلق من حاجة معينة.',
                'بيصحى وحاسس إن في تقل على صدره — ومش عارف يفسره.',
                'يقعد في السرير في الضلمة، مراته نايمة جنبه، باصص في السقف.',
                'وبيحاول يفهم: ليه؟ كل حاجة في حياتي كويسة. طب إيه اللي ناقصني؟'
            ]
        },

        recognition_khaled_naming: {
            id: 'recognition_khaled_naming',
            title: 'اللي بيحصل لخالد له اسم',
            subtitle: 'هنرجع لقصته بعد شوية بأدوات نفهمه بيها بدقة',
            session: 2,
            block: 'قصة',
            template: 'reveal-text',
            revealName: 'احتراق صامت',
            revealDesc: 'حياة شكلها ناجح من بره، بينما في حاجة بتنطفي في الداخل بهدوء'
        },

        recognition_generic_advice: {
            id: 'recognition_generic_advice',
            title: 'النصايح العامة بتفشل',
            subtitle: 'مش لأنها غلط. لأنك مالكش خريطة شخصية.',
            session: 2,
            block: 'تشخيص',
            template: 'dark-list-fade',
            isDark: true,
            items: [
                '"نام كويس"',
                '"خد إجازة"',
                '"حُط حدود"',
                '"اعمل رياضة"',
                '"جرّب التأمل"',
                '"اقرا كتاب تطوير ذات"'
            ],
            footer: 'إنت محتاج خريطة شخصية. خريطة بتقولك إنت بتحترق فين بالظبط، وليه، وإزاي تطلع من ده.'
        },

        recognition_bridge: {
            id: 'recognition_bridge',
            title: 'محتاج خريطة؟',
            subtitle: 'الخريطة بتبدأ من سؤال واحد',
            session: 2,
            block: 'جسر',
            template: 'simple-bridge',
            isDark: true
        },

        // ============ استراحة ============
        break_1: {
            id: 'break_1',
            title: 'استراحة',
            subtitle: 'قهوة، شاي، تنفس، تواصل — 15 دقيقة',
            session: 0,
            block: 'استراحة',
            template: 'break',
            isBreak: true,
            duration: 15
        },

        // ============ الجزء الثاني: العقلية (11:05-12:35) ============
        mindset_title: {
            id: 'mindset_title',
            title: 'اللي بييجي الأول',
            subtitle: 'الجزء التاني',
            session: 3,
            block: 'افتتاح الجزء',
            template: 'section-title'
        },

        mindset_situation: {
            id: 'mindset_situation',
            title: 'موقف واحد',
            session: 3,
            block: 'العقلية',
            template: 'situation-text',
            situation: 'شريك نجاح كبير عندكم — خليه على مستوى بنك مصر — بيتواصل ويقول:\n\n"عاوزين برنامج لـ 500 موظف، لمدة سنة كاملة، ميزانية كبيرة جداً. بس عندنا شرطين: نظام تقييم صارم بضمان نتائج موثقة، ومدة التحضير 3 أسابيع بس."',
            finalQuestion: 'قبل ما تقرر — في الـ 3 ثواني الأولى — إيه أول فكرة بتيجي في دماغك؟'
        },

        mindset_six_thoughts: {
            id: 'mindset_six_thoughts',
            title: 'اختار الأقرب لأول فكرة بتيجي عندك',
            subtitle: 'لو محتارين بين اتنين، اختاروا اللي بييجي أسرع',
            session: 3,
            block: 'تفاعل',
            template: 'six-cards-choice',
            saveKey: 'mindset_first_thought',
            options: [
                { id: 't1', label: 'هل عندنا الكفاءة الفعلية لده؟ هل هنقدر نوصّله؟', tag: 'التشكيك في الكفاءة' },
                { id: 't2', label: 'طب لو ما طلعش زي المتوقع، إيه الـ exposure بتاعنا؟', tag: 'حماية النفس من الفشل' },
                { id: 't3', label: 'الفرصة دي لو نجحت، إزاي هتغيّر شكلنا في السوق؟', tag: 'عين الناس والمكانة' },
                { id: 't4', label: 'الميزانية مغرية، بس هل القيمة الحقيقية تستاهل؟', tag: 'حساب الجدوى' },
                { id: 't5', label: 'إيه المدة بالظبط؟ إزاي هنوزّع الموارد؟ مين هيقود؟', tag: 'ترتيب المجهول' },
                { id: 't6', label: 'حلو، فرصة كبيرة — نبدأ إمتى؟', tag: 'الاندفاع ناحية الجديد' }
            ]
        },

        mindset_six_distribution: {
            id: 'mindset_six_distribution',
            title: 'اللي بييجي الأول... مختلف لكل واحد',
            subtitle: 'ما اختلفش الموقف. اللي اختلف هو اللي بييجي الأول في عقل كل واحد فيكم.',
            session: 3,
            block: 'نتيجة',
            template: 'bar-chart-result',
            sourceKey: 'mindset_first_thought',
            sourcePhase: 'mindset_six_thoughts'
        },

        mindset_six_analysis: {
            id: 'mindset_six_analysis',
            title: 'الستة كلهم منطقيين — لكنهم مش زي بعض',
            subtitle: 'كل واحد منهم بيرسم حياة مختلفة',
            session: 3,
            block: 'تحليل',
            template: 'six-cards-analysis',
            cards: [
                { num: '١', label: '"هل أنا قدها"', tag: 'التشكيك في الكفاءة' },
                { num: '٢', label: '"لو فشلت"', tag: 'حماية النفس من الفشل' },
                { num: '٣', label: '"الناس هتشوفنا إزاي"', tag: 'عين الناس والمكانة' },
                { num: '٤', label: '"هل يستاهل"', tag: 'حساب الجدوى' },
                { num: '٥', label: '"إيه المدة"', tag: 'ترتيب المجهول' },
                { num: '٦', label: '"نبدأ إمتى"', tag: 'الاندفاع ناحية الجديد' }
            ]
        },

        mindset_definition: {
            id: 'mindset_definition',
            title: 'اللي بييجي الأول... له اسم',
            session: 3,
            block: 'مفهوم',
            template: 'reveal-name',
            revealWord: 'العقلية',
            revealSubtitle: 'الفلتر اللي بيفسّر الواقع — قبل ما يوصل لوعيك'
        },

        // ============ المحور 1: الوكالة ============
        mindset_axis1_intro: {
            id: 'mindset_axis1_intro',
            title: 'المقارنة الأولى — التحديات',
            subtitle: 'مين بيمسك دفة حياتك؟',
            session: 3,
            block: 'الوكالة',
            template: 'axis-intro',
            axisKey: 'agency',
            axisIndex: 0
        },

        mindset_axis1_scenario: {
            id: 'mindset_axis1_scenario',
            title: 'سيناريو من عالمكم',
            session: 3,
            block: 'الوكالة',
            template: 'axis-scenario',
            axisKey: 'agency',
            axisIndex: 0,
            situation: 'منافس جديد فتح فرع في الدقي، 100 متر بس من فرعكم الرئيسي. أسعاره أقل بـ 30%. وبيستقطب طلابكم بحملة عدوانية على السوشيال ميديا.',
            poles: [
                {
                    side: 'negative',
                    title: 'الوكالة الخارجية',
                    text: 'السوق بقى صعب. الناس بقت بتشتري بالسعر. إحنا اللي مش لاحقين على التغيرات. المنافسة بقت غير عادلة.'
                },
                {
                    side: 'positive',
                    title: 'الوكالة الداخلية',
                    text: 'كويس، ده هيخلينا نراجع قيمتنا الحقيقية. إيه اللي يخلي الطالب يدفع أكتر؟ ممكن المنافس بيكشف لنا فجوة كنا غاضين بصرنا عنها.'
                }
            ]
        },

        mindset_axis1_questions: {
            id: 'mindset_axis1_questions',
            title: 'الوكالة — 3 أسئلة',
            subtitle: 'اقرا بهدوء، واختار بصدق',
            session: 3,
            block: 'الوكالة',
            template: 'axis-questions',
            axisKey: 'agency',
            axisIndex: 0,
            saveKey: 'axis_agency'
        },

        mindset_axis1_result: {
            id: 'mindset_axis1_result',
            title: 'الوكالة في القاعة دي',
            subtitle: 'مين بيمسك دفة حياتك؟',
            session: 3,
            block: 'نتيجة',
            template: 'axis-result',
            axisKey: 'agency',
            axisIndex: 0,
            sourceKey: 'axis_agency'
        },

        // ============ المحور 2: الوفرة والندرة ============
        mindset_axis2_intro: {
            id: 'mindset_axis2_intro',
            title: 'المقارنة الثانية — العقبات',
            subtitle: 'الكون كريم ولا بخيل؟',
            session: 3,
            block: 'الوفرة',
            template: 'axis-intro',
            axisKey: 'abundance',
            axisIndex: 1
        },

        mindset_axis2_scenario: {
            id: 'mindset_axis2_scenario',
            title: 'سيناريو',
            session: 3,
            block: 'الوفرة',
            template: 'axis-scenario',
            axisKey: 'abundance',
            axisIndex: 1,
            situation: 'معلمة من أفضل معلميكم، 4 سنين معاكم، طلابها بيحبوها — قدمت استقالة قبل بداية الترم الجديد بأسبوعين.',
            poles: [
                {
                    side: 'negative',
                    title: 'الندرة',
                    text: 'كارثة. السوق فاضي. مش هنلاقي بنفس مستواها. الموسم هيتأثر. ممكن نخسر طلاب. ليه دلوقتي بالظبط؟'
                },
                {
                    side: 'positive',
                    title: 'الوفرة',
                    text: 'تمام، خسارة حقيقية. بس ده وقت أراجع: ليه استقالت؟ هل في فجوة في الـ retention عندنا؟ السوق فيه ناس كويسين، بس محتاجين نطورهم.'
                }
            ]
        },

        mindset_axis2_questions: {
            id: 'mindset_axis2_questions',
            title: 'الوفرة والندرة — 3 أسئلة',
            session: 3,
            block: 'الوفرة',
            template: 'axis-questions',
            axisKey: 'abundance',
            axisIndex: 1,
            saveKey: 'axis_abundance'
        },

        mindset_axis2_result: {
            id: 'mindset_axis2_result',
            title: 'الوفرة والندرة في القاعة',
            session: 3,
            block: 'نتيجة',
            template: 'axis-result',
            axisKey: 'abundance',
            axisIndex: 1,
            sourceKey: 'axis_abundance'
        },

        // ============ المحور 3: الصيرورة والإنجاز ============
        mindset_axis3_intro: {
            id: 'mindset_axis3_intro',
            title: 'المقارنة الثالثة — المجهود',
            subtitle: 'هل أنا في طريق ولا في امتحان؟',
            session: 3,
            block: 'الصيرورة',
            template: 'axis-intro',
            axisKey: 'becoming',
            axisIndex: 2
        },

        mindset_axis3_scenario: {
            id: 'mindset_axis3_scenario',
            title: 'سيناريو',
            session: 3,
            block: 'الصيرورة',
            template: 'axis-scenario',
            axisKey: 'becoming',
            axisIndex: 2,
            situation: 'فرع أكتوبر حقق هدف الإيرادات للربع الأول قبل الميعاد بشهر.',
            poles: [
                {
                    side: 'negative',
                    title: 'الإنجاز',
                    text: 'ممتاز! نعمل احتفال. نعلن للسوق. نوثّق الإنجاز. الطاقم ياخد بونص. ندفع الهدف الجاي أعلى.'
                },
                {
                    side: 'positive',
                    title: 'الصيرورة',
                    text: 'ممتاز. بس إيه اللي نجح هنا فعلاً؟ هل ده Sustainable؟ هل ده ناتج عن طاقة استثنائية في الفريق هتنزف لو كررناها؟ إيه اللي اتعلمناه؟'
                }
            ]
        },

        mindset_axis3_questions: {
            id: 'mindset_axis3_questions',
            title: 'الصيرورة والإنجاز — 3 أسئلة',
            session: 3,
            block: 'الصيرورة',
            template: 'axis-questions',
            axisKey: 'becoming',
            axisIndex: 2,
            saveKey: 'axis_becoming'
        },

        mindset_axis3_result: {
            id: 'mindset_axis3_result',
            title: 'الصيرورة والإنجاز في القاعة',
            session: 3,
            block: 'نتيجة',
            template: 'axis-result',
            axisKey: 'becoming',
            axisIndex: 2,
            sourceKey: 'axis_becoming'
        },

        // ============ المحور 4: المرآة والسهم ============
        mindset_axis4_intro: {
            id: 'mindset_axis4_intro',
            title: 'المقارنة الرابعة — النقد',
            subtitle: 'النقد بيكشفني ولا بيهاجمني؟',
            session: 3,
            block: 'المرآة',
            template: 'axis-intro',
            axisKey: 'mirror',
            axisIndex: 3
        },

        mindset_axis4_scenario: {
            id: 'mindset_axis4_scenario',
            title: 'سيناريو',
            session: 3,
            block: 'المرآة',
            template: 'axis-scenario',
            axisKey: 'mirror',
            axisIndex: 3,
            situation: 'في اجتماع مجلس الإدارة، عضو في المجلس قال:\n"نسب رضا العملاء انخفضت في الربع الأخير. ده قلقني."',
            poles: [
                {
                    side: 'negative',
                    title: 'السهم — الهجوم',
                    text: 'الإحساس الجوّاني: "هو بيهاجمني". فبتدافع — تبرر، توضّح، تقول إن ده ربع استثنائي، تحفظ في الكلام معاه تاني.'
                },
                {
                    side: 'positive',
                    title: 'المرآة — الكشف',
                    text: 'الإحساس الجوّاني: "في معلومة بتيجي". تركّز: "إيه بالظبط اللي شافه؟ هل في نمط في الـ feedback؟ هل ده بيكشف حاجة لازم أشتغل عليها؟"'
                }
            ]
        },

        mindset_axis4_questions: {
            id: 'mindset_axis4_questions',
            title: 'المرآة والسهم — 3 أسئلة',
            session: 3,
            block: 'المرآة',
            template: 'axis-questions',
            axisKey: 'mirror',
            axisIndex: 3,
            saveKey: 'axis_mirror'
        },

        mindset_axis4_result: {
            id: 'mindset_axis4_result',
            title: 'المرآة والسهم في القاعة',
            session: 3,
            block: 'نتيجة',
            template: 'axis-result',
            axisKey: 'mirror',
            axisIndex: 3,
            sourceKey: 'axis_mirror'
        },

        // ============ المحور 5: الفضل والمُحاصصة ============
        mindset_axis5_intro: {
            id: 'mindset_axis5_intro',
            title: 'المقارنة الخامسة — نجاح الآخرين',
            subtitle: 'الخير كاسة واحدة ولا نهر؟',
            session: 3,
            block: 'الفضل',
            template: 'axis-intro',
            axisKey: 'grace',
            axisIndex: 4
        },

        mindset_axis5_scenario: {
            id: 'mindset_axis5_scenario',
            title: 'سيناريو',
            session: 3,
            block: 'الفضل',
            template: 'axis-scenario',
            axisKey: 'grace',
            axisIndex: 4,
            situation: 'أكاديمية منافسة أعلنت عن شراكة استراتيجية مع بنك كبير، بصفقة قيمتها 30 مليون جنيه على سنتين.',
            poles: [
                {
                    side: 'negative',
                    title: 'المُحاصصة',
                    text: 'إزاي هم؟ كان لازم نوصل لهم الأول. ده بيعني السوق هيتقلص لينا. لازم نراجع ليه ما اختارناش.'
                },
                {
                    side: 'positive',
                    title: 'الفضل',
                    text: 'حلو ليهم. السوق فيه فرص أكتر من اللي إحنا شايفين. اللي حصل ده بيكشف شغل سيلز نوعي عندهم. إيه اللي ممكن نتعلمه؟'
                }
            ]
        },

        mindset_axis5_questions: {
            id: 'mindset_axis5_questions',
            title: 'الفضل والمُحاصصة — 3 أسئلة',
            session: 3,
            block: 'الفضل',
            template: 'axis-questions',
            axisKey: 'grace',
            axisIndex: 4,
            saveKey: 'axis_grace'
        },

        mindset_axis5_result: {
            id: 'mindset_axis5_result',
            title: 'الفضل والمُحاصصة في القاعة',
            session: 3,
            block: 'نتيجة',
            template: 'axis-result',
            axisKey: 'grace',
            axisIndex: 4,
            sourceKey: 'axis_grace'
        },

        // ============ البصمة العقلية الخماسية ============
        mindset_radar: {
            id: 'mindset_radar',
            title: 'بصمتك العقلية الخماسية',
            subtitle: 'ده عقلك بيشتغل إزاي تحت الضغط',
            session: 3,
            block: 'البصمة',
            template: 'radar-fingerprint'
        },

        mindset_covenant: {
            id: 'mindset_covenant',
            title: 'ميثاقك مع نفسك',
            subtitle: 'سؤالين قبل الغداء — اكتب لنفسك',
            session: 3,
            block: 'ميثاق',
            template: 'text-inputs',
            saveKey: 'mindset_covenant',
            inputs: [
                {
                    key: 'touched_filter',
                    label: 'أكتر فلتر منهم لمسني...',
                    placeholder: 'الفلتر اللي هزّك. لمسك. حسّيت إنه كاشف.',
                    minLength: 5
                },
                {
                    key: 'watch_filter',
                    label: 'الفلتر اللي عاوز ألاحظه في الأسبوع الجاي...',
                    placeholder: 'واحد بس. مش الخمسة. واحد هتشتغل عليه.',
                    minLength: 5
                }
            ]
        },

        // ============ استراحة الغداء ============
        break_lunch: {
            id: 'break_lunch',
            title: 'استراحة الغداء',
            subtitle: 'غداء + صلاة الظهر — 35 دقيقة',
            session: 0,
            block: 'استراحة',
            template: 'break',
            isBreak: true,
            duration: 35
        },

        // ============ الجزء الثالث: البنية + السلوك (1:10-2:10) ============
        structure_title: {
            id: 'structure_title',
            title: 'البنية التحت',
            subtitle: 'اللي بيشكّل عقليتك — الجزء التالت',
            session: 4,
            block: 'افتتاح الجزء',
            template: 'section-title'
        },

        structure_four_layers: {
            id: 'structure_four_layers',
            title: 'البنية الرباعية للإنسان',
            subtitle: 'الإنسان مش طبقة واحدة. هو 4 طبقات.',
            session: 4,
            block: 'البنية',
            template: 'four-layers-nested',
            layers: [
                { name: 'النفس', desc: 'الطاقة الخام، الدوافع الأولية، الاتجاهات', color: '#1e40af' },
                { name: 'الصدر', desc: 'الطبقة اللي بتستقبل الواردات', color: '#3b82f6' },
                { name: 'القلب', desc: 'الطبقة اللي بتقرّر. فيها بنية شخصيتك', color: '#fbbf24' },
                { name: 'الفؤاد', desc: 'الجوهر اللي ربنا خلقك بيه', color: '#fcd34d' }
            ]
        },

        structure_three_axes: {
            id: 'structure_three_axes',
            title: 'المحاور التلاتة من النفس',
            subtitle: 'كل إنسان فيه التلاتة — لكن محور واحد رئيسي',
            session: 4,
            block: 'المحاور',
            template: 'three-axes-pie'
        },

        structure_loss_1: {
            id: 'structure_loss_1',
            title: 'تجربة الفقدان',
            subtitle: 'اكتب 5 حاجات بتقدّرها في حياتك دلوقتي',
            session: 4,
            block: 'تجربة',
            template: 'loss-write-five',
            saveKey: 'loss_five_values',
            placeholder: 'ممكن تكون: عيلتك، شغلك، صحتك، حريتك، إيمانك...'
        },

        structure_loss_2: {
            id: 'structure_loss_2',
            title: 'تجربة الفقدان',
            subtitle: 'تخيل إنك خسرت واحدة منهم. أي واحدة؟',
            session: 4,
            block: 'تجربة',
            template: 'loss-drop-four',
            saveKey: 'loss_remaining'
        },

        structure_axes_distribution: {
            id: 'structure_axes_distribution',
            title: 'توزيع المحاور في القاعة',
            subtitle: 'القاعة دي موزّعة على المحاور التلاتة',
            session: 4,
            block: 'نتيجة',
            template: 'axes-distribution',
            sourceKey: 'loss_remaining'
        },

        // ============ مرآة السلوك ============
        behavior_intro: {
            id: 'behavior_intro',
            title: 'جسدك تحت الضغط — بيعمل إيه؟',
            subtitle: 'الباب الأخير اليوم: مرآة السلوك',
            session: 4,
            block: 'السلوك',
            template: 'section-title'
        },

        behavior_three_patterns: {
            id: 'behavior_three_patterns',
            title: 'تحت الضغط، الناس بتتحرك في 3 اتجاهات',
            subtitle: 'لا اتجاه أحسن من التاني — كل واحد له منطقه',
            session: 4,
            block: 'الأنماط',
            template: 'three-patterns-overview'
        },

        behavior_pattern_compliance: {
            id: 'behavior_pattern_compliance',
            title: 'النمط الأول — الامتثال',
            subtitle: 'جسدك بيستنى إذن قبل ما يتحرك',
            session: 4,
            block: 'الامتثال',
            template: 'pattern-detail',
            patternKey: 'compliance',
            strength: 'بيحفظ التوازن في الفريق. الناس بتحبه. بتعتمد عليه. بيشتغل بانضباط ودقة.',
            risk: 'لو الإفراط حصل، بيشتغل من غير وعي. بيلتزم بحاجة عمره ما اختارها.',
            danger: 'لو حصل انكسار للمرجع — بيخرج منه فعل غريب. هلع، انفجار، انسحاب مفاجئ.'
        },

        behavior_pattern_assertive: {
            id: 'behavior_pattern_assertive',
            title: 'النمط الثاني — الحزم',
            subtitle: 'جسدك بيبادر قبل ما يستشار العقل',
            session: 4,
            block: 'الحزم',
            template: 'pattern-detail',
            patternKey: 'assertive',
            strength: 'بيقود. الناس اللي بتنجح في الـ Business عادة عندها نسبة من النمط ده.',
            risk: 'الجسد ما بيقدرش يجلس مع اللحظة الحاضرة. كل ناتج بيحقق فراغ، وكل فراغ بيستدعي ناتج جديد.',
            danger: 'لو الاستراتيجية فشلت — بيخرج فعل صادم. قرار متهور، انفجار، أو إدمان لحاجة بتمنحه إحساس.'
        },

        behavior_pattern_withdrawal: {
            id: 'behavior_pattern_withdrawal',
            title: 'النمط الثالث — الانسحاب',
            subtitle: 'جسدك بيخلّي الفضاء قبل ما يُسأل',
            session: 4,
            block: 'الانسحاب',
            template: 'pattern-detail',
            patternKey: 'withdrawal',
            strength: 'بيحمي السلام. بيتجنب الصراعات. الناس بتحس معاه بالأمان.',
            risk: 'بيخلّي فضاءات كان لازم يحضر فيها. بيصمت في موقف يستحق كلامه.',
            danger: 'لو أُجبر يفضل في فضاء ما يقدرش يخليه — بتخرج منه دراما لا تشبه إيقاعه.'
        },

        behavior_assessment_intro: {
            id: 'behavior_assessment_intro',
            title: 'بقياس قصير، إنت أي نمط؟',
            subtitle: '12 سؤال — 7 دقايق',
            session: 4,
            block: 'مقياس',
            template: 'simple-intro'
        },

        behavior_assessment: {
            id: 'behavior_assessment',
            title: 'مقياس السلوك',
            subtitle: 'اقرأ بهدوء، وجاوب بصدق',
            session: 4,
            block: 'مقياس',
            template: 'behavior-assessment',
            saveKey: 'behavior_assessment'
        },

        behavior_result: {
            id: 'behavior_result',
            title: 'نتيجة مرآة السلوك',
            subtitle: 'نمطك الرئيسي + موقعك على الطيف',
            session: 4,
            block: 'نتيجة',
            template: 'behavior-result',
            sourceKey: 'behavior_assessment'
        },

        // ============ الإغلاق ============
        closing_khaled_return: {
            id: 'closing_khaled_return',
            title: 'رجوع لخالد',
            subtitle: 'محوره الرئيسي شغّال تمام. نمطه السلوكي شغّال تمام. طب ليه بيصحى التلاتة الفجر؟',
            session: 5,
            block: 'الإغلاق',
            template: 'khaled-return'
        },

        closing_repressed_axis: {
            id: 'closing_repressed_axis',
            title: 'المحور المكبوت',
            subtitle: 'مدفون من الطفولة بيصرخ في الصمت',
            session: 5,
            block: 'الإغلاق',
            template: 'repressed-axis',
            description: 'كل إنسان عنده محور رئيسي. وعنده محور فرعي. وعنده محور تالت — المكبوت. مش غايب. مدفون من الطفولة.',
            khaledStory: 'خالد كان أكبر إخواته. أبوه كان راجل صعب، كان يقول له "إنت أكبر، شد حيلك". خالد اتعلّم إن النجاح بييجي من إنه يكون مستقل، قوي، ما يدخلش علاقات عميقة. والمحور المكبوت عنده — الانتماء — فضل بيصرخ من 30 سنة.'
        },

        closing_triple_distinction: {
            id: 'closing_triple_distinction',
            title: 'الاحتراق مش نوع واحد',
            subtitle: 'هو 3 أنواع، مختلفة جذرياً، وكل واحد له علاج مختلف',
            session: 5,
            block: 'الإغلاق',
            template: 'triple-distinction-table',
            rows: [
                {
                    type: 'محترق',
                    desc: 'الرئيسي شغّال بالخوف',
                    feeling: 'إرهاق واستنزاف',
                    question: '"ليه أنا تعبان كده؟"',
                    color: '#dc2626'
                },
                {
                    type: 'مجوّع',
                    desc: 'الرئيسي البيئة مش بتلبّيه',
                    feeling: 'فقدان شغف، روتين قاتل',
                    question: '"فين النار اللي كانت معايا؟"',
                    color: '#f97316'
                },
                {
                    type: 'مكبوت بيصرخ',
                    desc: 'الرئيسي شغّال، لكن المكبوت بيصرخ',
                    feeling: 'فراغ، غربة عن النفس',
                    question: '"هل ده هو؟"',
                    color: '#a78bfa'
                }
            ]
        },

        closing_paths: {
            id: 'closing_paths',
            title: 'الطريق مش وصفة واحدة',
            subtitle: '9 مسارات للتعافي — واحد لكل بُعد',
            session: 5,
            block: 'الإغلاق',
            template: 'paths-grid'
        },

        closing_covenant: {
            id: 'closing_covenant',
            title: 'ميثاقك مع نفسك',
            subtitle: '3 سطور قبل ما نسيب بعض',
            session: 5,
            block: 'ميثاق ختامي',
            template: 'text-inputs',
            saveKey: 'closing_covenant',
            inputs: [
                {
                    key: 'burnout_level',
                    label: 'مستوى احتراقي اللي حسيته النهارده هو...',
                    placeholder: 'مش لازم تكون متأكد. اكتب ملاحظتك.',
                    minLength: 5
                },
                {
                    key: 'first_thought',
                    label: 'اللي بييجي الأول في عقلي اللي اكتشفته هو...',
                    placeholder: 'الفلتر اللي لمسك أكتر من الخمسة',
                    minLength: 5
                },
                {
                    key: 'week_question',
                    label: 'السؤال اللي عاوز أمشي بيه الأسبوع ده هو...',
                    placeholder: 'سؤال واحد. مش بطولي. صغير. هتلاحظه في يومياتك.',
                    minLength: 5
                }
            ]
        },

        closing_verse: {
            id: 'closing_verse',
            title: 'الإنسان مش مخلوق عشان يحترق',
            subtitle: 'هو مخلوق عشان يتّزن. والاتزان — رحلة بدأت النهارده.',
            session: 5,
            block: 'الإغلاق',
            template: 'verse-final',
            verse: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ',
            verseRef: 'الرعد، آية ١١'
        }
    },

    // ===================================================
    // ترتيب المراحل
    // ===================================================
    phaseOrder: [
        'waiting',

        // الافتتاح
        'intro_welcome',
        'intro_charter',
        'intro_phone_setup',

        // الاعتراف
        'recognition_question',
        'recognition_first_poll',
        'recognition_first_result',
        'recognition_compare',
        'recognition_three_levels',
        'recognition_degrees',
        'recognition_big_poll',
        'recognition_big_result',
        'recognition_khaled_intro',
        'recognition_khaled_outside',
        'recognition_khaled_hidden',
        'recognition_khaled_naming',
        'recognition_generic_advice',
        'recognition_bridge',

        // استراحة
        'break_1',

        // العقلية
        'mindset_title',
        'mindset_situation',
        'mindset_six_thoughts',
        'mindset_six_distribution',
        'mindset_six_analysis',
        'mindset_definition',

        // المحاور الخمسة
        'mindset_axis1_intro', 'mindset_axis1_scenario', 'mindset_axis1_questions', 'mindset_axis1_result',
        'mindset_axis2_intro', 'mindset_axis2_scenario', 'mindset_axis2_questions', 'mindset_axis2_result',
        'mindset_axis3_intro', 'mindset_axis3_scenario', 'mindset_axis3_questions', 'mindset_axis3_result',
        'mindset_axis4_intro', 'mindset_axis4_scenario', 'mindset_axis4_questions', 'mindset_axis4_result',
        'mindset_axis5_intro', 'mindset_axis5_scenario', 'mindset_axis5_questions', 'mindset_axis5_result',

        // البصمة والميثاق
        'mindset_radar',
        'mindset_covenant',

        // غداء
        'break_lunch',

        // البنية
        'structure_title',
        'structure_four_layers',
        'structure_three_axes',
        'structure_loss_1',
        'structure_loss_2',
        'structure_axes_distribution',

        // السلوك
        'behavior_intro',
        'behavior_three_patterns',
        'behavior_pattern_compliance',
        'behavior_pattern_assertive',
        'behavior_pattern_withdrawal',
        'behavior_assessment_intro',
        'behavior_assessment',
        'behavior_result',

        // الإغلاق
        'closing_khaled_return',
        'closing_repressed_axis',
        'closing_triple_distinction',
        'closing_paths',
        'closing_covenant',
        'closing_verse'
    ]
};

window.SessionData = SessionData;
console.log('✅ SessionData loaded:', Object.keys(SessionData.phases).length, 'phases');


window.SessionData = SessionData;
