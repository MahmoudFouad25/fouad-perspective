/* =========================================================
   REIGNITE — bilingual content layer (single source of truth)
   عدّل النص العربي تحت T.ar — والإنجليزي تحت T.en — بنفس المفتاح.
   المحطات في STATIONS (لكل لغة نسخة). أي كلام تاني في T.
   ========================================================= */

const T = { ar: {}, en: {} };

/* ---------- العربية ---------- */
Object.assign(T.ar, {
  "meta.title":"Reignite — من الاحتراق إلى التألق | Burnout to Brilliance Program",
  "meta.desc":"مش رحلة عن الاحتراق. دي رحلة بتنزل بيك للطريقة الواحدة اللي بنيت بيها نجاحك — وهي نفسها اللي واقفة ورا تعبك دلوقتي — وتخرج منها وإنت عارف نفسك بشكل معرفتوش قبل كده. بقيادة كوتش محمود فؤاد، وتُقدَّم حصريًا من خلال Proactive Development Solutions.",

  "hero.pre":'<span class="dot"></span> برنامج <b>Reignite — Burnout to Brilliance</b> · من الاحتراق إلى التألق <span style="opacity:.4">·</span> يُقدَّم حصريًا من خلال Proactive Development Solutions',
  "hero.h1":'الاستراتيجية اللي بنيت بيها نجاحك…<br/><span class="grad">هي نفسها اللي واقفة ورا تعبك دلوقتي.</span>',
  "hero.lead":"إنت مش بس تعبان. الحقيقة أعمق من كده بكتيير .. إنت بقيت بعيد عن نفسك.. إنت وصلت إلي إنك بتحترق بشكل شبه يومي.. والسبب إنك ماشي من زمان باستراتيجية داخلية رئيسية وصّلتك لكل النجاح اللي إنت فيه، بس هي نفسها بالظبط دلوقتي اللي بقت تستهلكك. الرحلة دي بتخليك تتعمق في الاستراتيجية دي، تفهمها وتعرفها بدقة، وتخرج منها بخريطة متكاملة للتحول من الاحتراق إلي التألق .. متفصلة بشكل كامل عليك مش وصفة من الوصفات الجاهزة. خلال 12 محطة ستكتشف بصمتك الشخصية من 27 بصمة محتملة، تحديد نوع احتراقك الحقيقي، ووضع المسار المناسب لك أنت للعودة إلى التألق.",
  "hero.cta1":"سجّل اهتمامك دلوقتي",
  "hero.cta2":"جرّب التجربة المصغّرة مجاناً",
  "hero.note1":"مجموعة صغيرة ومقاعد محدودة",
  "hero.note2":"رحلة أونلاين بالكامل",
  "hero.note3":"أحصل علي خصم خاص جداً لهذه الدفعة",

  "pain.eyebrow":"ليه الدورة دي في التوقيت ده بالذات تخصك جداً؟",
  "pain.title":"في الأول كان فيه شغف بيصحيك كل يوم. دلوقتي فيه أسئلة عمالة بيتكرر.",
  "pain.p1":'زمان كنت بتصحى الصبح وجوّاك حاجة حيّة بتدفعك لليوم. دلوقتي بتصحى ومش قادر تكمل كده وكل اللي بتسمعه صوت واحد جوّاك بيقول: <strong>«لحد إمتى؟» أو «هو ده كل يوم؟» أو «ليه تاني؟» أو «هو أنا هفضل كده؟» أو «وبعدين وأخرتها؟»</strong>',
  "pain.p2":"إنت بقيت بتأدّي شغلك، وبتقفل مهامك، وبتردّ على كل الرسائل والتليفونات اللي بتيجي. لكن في العمق فيه خزّان بيفضى شوية ورا شوية، ومحدش بيرجع يملاه. النجاح اللي كان بيفرّحك بقى يعدّي عليك من غير ما يسيب أثر. والناس اللي كانوا مصدر طاقتك ودعمك بقوا حِمل تقيل على ضهرك. والمعنى اللي كان بيدّي لحياتك قيمة بقى بعيد لدرجة إنك بالكاد فاكر شكله.",
  "pain.p3":"وإنت عارف كويس إن المشكلة مش إنك مش بتشتغل كفاية.. بالعكس، إنت بتبذل مجهود مضاعف عن أي وقت فات. لكن كل ما تبذل أكتر، الخزّان يفضى أسرع.",
  "pain.s1":"أخدت إجازة، ورجعت لقيت نفسك زي ما إنت بالظبط أو أسوأ.",
  "pain.s2":"قريت كتب وحضرت كورسات، فعرفت «المفروض تعمل إيه» بس مفيش حاجة اتغيّرت فعلاً.",
  "pain.s3":"قلت «هنظّم وقتي» و«هرتّب أولوياتي».. وفي كل مرة بترجع لنفس النقطة.",
  "pain.punch":"والسبب واضح جدًا: إنت بتعالج العَرَض، مش الجذر الحقيقي للمشكلة.",

  "idea.big":'الاحتراق مش هو المشكلة.<br/>الاحتراق <em>عَرَض</em> للمشكلة.',
  "idea.p1":"فكّر فيه زي الحُمّى. الحُمّى نفسها مش المرض.. هي بس علامة إن فيه حاجة تحتها محتاجة علاج. ولو اكتفيت إنك تنزّل الحرارة، المرض هيفضل في مكانه، والحُمّى هترجع تاني.",
  "idea.p2":"والاحتراق زيّها بالظبط: علامة إن فيه استراتيجية شغّالة جوّاك من زمان، بقت تاخد منك أكتر بكتير من اللي بتدهولك.. وإنت مش واخد بالك. ومن غير ما تعرف الاستراتيجية دي بالاسم وبالتفصيل، أي حل هيفضل مجرد مسكّن: يهدّي التعب أسبوع، وبعدها يرجع أقوى.",
  "idea.last":"Reignite مش بتديك مسكّن. بتديك خريطة داخلية دقيقة محكمة عن نفسك .. وبعد كده القرار يبقى في إيدك إنت."
});

Object.assign(T.ar, {
  "cycle.eyebrow":"إيه موضوع الاستراتيجية ده؟",
  "cycle.title":"كل واحد فينا بنى لنفسه استراتيجية. والاستراتيجية دي قصة.",
  "cycle.sub":"من غير ما تقرّر، إنت بنيت لنفسك استراتيجية رئيسية بتكون بيها موجود وتنجح وتسعد بيها في الدنيا، وبتحمي بيها نفسك أول ما الضغط ييجي. الاستراتيجية دي عدّت بأربع لحظات. نفس المراحل كلنا بنمر بيها بس طبعاً بتكون لكل واحد مننا استرتيجيته الخاصة.. تعالي نشوف اللحظات دي إيه:",
  "curve.born":"اتولدت","curve.thrived":"ازدهرت","curve.strain":"بدأت تشدّ","curve.stopped":"وقفت","curve.brilliance":"التألق","curve.journeystart":"ومن هنا تبدأ الرحلة…",

  "mom.tag1":"اللحظة الأولى","mom.h1":"اتولدت",
  "mom.p1":"الطريقة دي ما جاتش من فراغ. اتولدت بدري، في موقف صعب كانت فيه أذكى حل متاح. الطفل اللي اتعلّم إن مفيش حد هيمسك له حاجة، اتعلّم يمسك كل حاجة بإيده. واللي اتعلّم إن قيمته في إنجازه، بقى ينجز عشان يستاهل. دي مش عيب فيك — دي حماية بنيتها لنفسك يوم ما كنت محتاجها فعلاً.",
  "mom.tag2":"اللحظة الثانية","mom.h2":"ازدهرت",
  "mom.p2":"كبرت، والطريقة نجحت معاك. هي اللي وصّلتك. اللي بقى يمسك كل حاجة بإيده، بقى الشخص اللي الكل بيعتمد عليه في أي أزمة. واللي بينجز بقى النجم اللي ليه حساب في كل مكان. وكل نجاح أكّدلك إن الطريقة دي صح، فاتمسّكت بيها أكتر. وعن جدارة، في وقتها كانت تستاهل.",
  "mom.tag3":"اللحظة الثالثة","mom.h3":"بدأت تشدّ",
  "mom.p3":"بعدين اتغيّرت الدنيا من حواليك، وفضلت الطريقة زي ما هي. اللي اعتاد يمسك كل حاجة بإيده، بقى عنده فريق مستنّي منه إنه يفوّضه — وإيده مش عارفة تسيب. واللي قيمته في الإنجاز، بقى محتاج يقف يلتقط أنفاسه — ومش قادر. الطريقة اللي كانت بتدّيك، بقت تطلب منك أكتر مما بتعطيك. وأول رد فعل ليك إنك تشتغل بيها أكتر — فتشدّها أكتر، وتتعب أكتر.",
  "mom.tag4":"اللحظة الرابعة","mom.h4":"وقفت",
  "mom.p4":"ولمّا الطريقة تتشدّ لآخر مداها من غير ما تتغيّر، بتوصل لنقطة بتقف عندها. ده الاحتراق. مش فشل فيك، ولا ضعف منك — دي الطريقة نفسها وهي وصلت لآخرها. اللي شايل كل حاجة وقف من تقل الحمل، واللي بيجري ورا الإنجاز وقف من اللهاث.",

  "reveal.big":'وأعمق حاجة في القصة دي: إن الاستراتيجية دي مش مجرد طريقة بتتصرف بيها وقت الأزمات .. <em>دي طريقة عشت بيها لدرجة إنك افتكرتها أنت .. طريقة كاملة في رؤية نفسك والعالم، اتبنت في يوم علشان تحميك.</em>',
  "reveal.p1":"ليها اسم، وليها مواصفات دقيقة. دي بصمتك الشخصية، لكنها بتشتغل من الخوف بدل الحب. ومعرفتها بدقة.. هي إيه بالظبط، وبتشتغل إزاي، وإزاي ترجع تخدمك من الحب بدل الخوف من تاني.. دي الرحلة كلها.",
  "reveal.last":"Reignite مش بتطفّي النار. بتوريك إزاي تشتعل من غير ما تحترق.. هي مش رحلة عن إصلاح شخص محطم، بل تذكيره بمن هو قبل أن تصبح الاستراتيجية هي اللي تقوده بدلاً من أن يستخدمها بكفاءة وفعالية."
});

Object.assign(T.ar, {
  "who.eyebrow":"لمين الرحلة دي",
  "who.title":"مينفعش نحصر الرحلة دي في منصب أو مجال معين. لأن الاحتراق النفسي مش بيسأل إنت شغّال إيه… بيسأل إنت عايش شغلك إزاي.",
  "who.sub":'يمكن عناوين الشغل مختلفة.. الوجوه مختلفة، والمكاتب مختلفة، والقصص مختلفة.. لكن الإحساس في آخر اليوم واحد.. وفيه سؤال واحد بيتكرر في الخلفية: <b style="color:var(--gold-2)">هل شغلك بقى يسحب منك أكتر من اللي بيدهولك؟؟</b> اسمع الأصوات دي بهدوء .. وشوف صوتك فين منها.',
  "who.t1":"اللي بيقود فريق","who.v1":"«بوازن طول الوقت بين توقّعات اللي فوق ومصالح اللي تحت، بدّي وبشيل مسؤولية بعض الناس، وبحاول أرضي ناس تانية… وكل يوم بيتردد سؤال جوايا: مين شايلني أنا؟»",
  "who.t2":"اللي عالق في النص","who.v2":"«مسؤول عن التنفيذ من غير ما أملك القرار. اللوم والضغط نازل من فوق، والتوقعات طالعة من تحت… وأنا المساحة اللي الاتنين بيتقابلوا فيها.»",
  "who.t3":"اللي بيبني مشروعه","who.v3":"«بلبس كل القبعات في يوم واحد — قائد، ومسوّق، ومحاسب، وموارد بشرية. وبقيت أفتكر الأيام اللي بدأت فيها وأسأل نفسي: هو فين الشخص اللي كان متحمس لكل ده؟»",
  "who.t4":"اللي شغله أرقام وعملاء","who.v4":"«كل يوم رفض ومقاومة وتارجت. بجري ورا رقم بعد رقم. أقفل صفقة وأدخل على اللي بعدها… لحد ما نسيت آخر مرة حسيت فيها بإنجاز.»",
  "who.t5":"اللي شغّال لوحده","who.v5":"«أنا وحدي قدّام العملاء والتفاوض والمواعيد والرفض. وكل قرار، وكل غلطة، وكل يوم صعب… مفيش حد يشاركني حمله.»",
  "who.t6":"اللي شايل هموم غيره","who.v6":"«الناس بتيجيلي بأوجاعها ومشاكلها، وأنا حاضر ليهم كلهم. أما همّي أنا… فدايمًا دوري ييجي في الآخر.»",
  "who.foot":'يمكن ما تكونش كل الجُمل شبهك. لكن لو جملة واحدة منهم وقفتك للحظة… <b>فغالبًا فيه جزء منك بيقولك إنك محتاج تخوض معانا الرحلة دي.</b> لأن الرحلة دي مش هتكلّمك عن الاحتراق النفسي كمفهوم. هتخليك تشوفه وهو بيحصل في واقع يومك، في قراراتك، وفي الطريقة اللي بقيت بتعيش بيها شغلك.'
});

Object.assign(T.ar, {
  "diff.eyebrow":"إيه اللي بيخلي Reignite رحلة مختلفة",
  "diff.title":"الفرق مش في إنك تعرف أكتر… الفرق إنك ترجع تعيش بجوهرك.",
  "diff.sub":"يمكن تكون جرّبت قبل كده. قريت كتب، حضرت ورش، أخدت إجازة، وفهمت كتير عن الاحتراق… لكن رجعت لنفس الدائرة. فليه بعض المحاولات بتريحك… لكن ما بتغيّركش؟.. ليه ممكن تكون جرّبت كتير… ولسه واقف في نفس المكان؟ .. مش لأنك ما عرفتش كفاية. لكن لأن المعرفة لوحدها مش كفاية. في Reignite، إحنا مش بنضيف معلومات جديدة على عقلك. إحنا بنرجعك للمكان اللي فقدت فيه الاتصال بنفسك. وبنفّذ مع بعض منهجية دقيقة لاستعادة الاتصال.",
  "diff.h1":"مش بس هتشخص وتفهم وتفسر وجعك… هنحط سوا مسار الخروج منه",
  "diff.p1":'كتير من الكلام عن الاحتراق بيقف عند التشخيص وبيدّيك اسم لوجعك، فتقول: "آه، ده اللي عندي. بس فين المخرج والحل؟" أو يشرحلك ويفسرلك ليه حصلت، من غير ما يقولك: "وأعمل إيه بالضبط دلوقتي؟" في Reignite، التشخيص والتفسير والمسار بيحصلوا مع بعض: تفهم وتشخص بصمتك الشخصية. تكتشف وتفسر الاستراتيجية اللي كانت بتحميك، وبقت بتستنزفك. وتبدأ مسار لخطوات عملية ترجع بيها للحب بدل الخوف.',
  "diff.h2":"عمق أصيل، مش محتوى مترجم",
  "diff.p2":"الرحلة لا تنطلق من نموذج غربي مستورد اتلبس ثوبًا محليًا. هي لقاء بين علم النفس الحديث، وبين تراث عميق اشتغل على فهم النفس والقلب الإنساني عبر قرون. العلم بيعطينا الدقة. والحكمة في التراث بتعطينا المعنى الدقيق العميق. وفي Reignite، الاتنين بيتقابلوا. هتلاقي كل مفهوم له جذر علمي وجذر أصيل متضفّرين في نسيج واحد.",
  "diff.h3":"ده عنك إنت مش «نوع عام» ولأنك مش رقم في نموذج",
  "diff.p3":'مش هدفنا نحطك في خانة جاهزة ونقول: "إنت كده." الهدف إنك خلال الرحلة تشوف بصمتك الفريدة بوضوح: اتجاه طاقتك. الاستراتيجية اللي بتواجه بيها الحياة. الشرط الخفي اللي ربطت بيه وعلّقت عليه قيمتك. والجرح القديم اللي ما زال بيكتب بعض قراراتك. مش علشان تقتنع إنك كده… لكن علشان يكون عندك حرية تختار من جديد.',
  "diff.h4":"مجتمع بيتعلّم سوا",
  "diff.p4":"أغلبنا اتعلم يعيش معركته في صمت. لكن في Reignite، مش هتمشي وحدك. هتكون وسط مجموعة صغيرة ماشية نفس الرحلة من أولها لآخرها. ناس بتكشف، وتجرّب، وتشارك، وتقع وتقوم، وتتعلم مع بعضها، وتعدّل المسار. لأن أعمق التحولات لا تحدث في العزلة… بل في حضور رفقة إنسان آخر يشهد رحلتك."
});

Object.assign(T.ar, {
  "journey.eyebrow":"شكل الرحلة",
  "journey.title":"رحلة على شكل حرف U: تنزل واحد… وتطلع واحد تاني",
  "journey.sub":"بننزل سوا في النص الأول عشان نشوف ونفهم ونلامس، نوصل لأعمق نقطة، وبعدين نطلع سوا في النص التاني عشان نبلور ونثبّت. كل محطة بتكمّل اللي قبلها وبتسلّمك للي بعدها. دوس على أي محطة تكتشف اللي بيحصل جوّاها.",
  "journey.foot":'المحطات دي بتتعاش عبر سلسلة من <b>اللقاءات الحيّة أونلاين</b> مع المدرّب مباشرة — وبين كل لقاء واللي بعده، معايشة حقيقية في شغلك إنت، مش في الفراغ.',

  "rhythm.eyebrow":"إزاي بتتعاش كل محطة",
  "rhythm.title":"المحطة بتتعاش… مش بتتسمع",
  "rhythm.sub":"المعلومة لوحدها بتتنسي. اللي بيغيّر فعلاً إنك تعيش تجربة كاملة مع كل محطة — وده بيحصل على دايرة من خمس خطوات، بتلفّ معاك في كل محطة من غير ما تتكسر حلقة.",
  "rhythm.s1h":"تستقبل","rhythm.s1p":"لقاء حيّ مع المدرّب، شكله بيتفصّل على موضوعه: تشريح، أو معمل، أو دائرة، أو كوتشينج جماعي. مفيش قالب واحد ثابت.",
  "rhythm.s2h":"تكتشف","rhythm.s2p":"مقياس المحطة بيطلّع لك ترتيب أساليبك وموقعك على الطيف. مرآة بتكشفك لنفسك، مش حكم بيتحط عليك.",
  "rhythm.s3h":"تطبّق","rhythm.s3p":"معمل حيّ جوّه شغلك الحقيقي — ملاحظة وتطبيق وإنت في يومك العادي، مش واجبات مكدّسة فوق شغلك.",
  "rhythm.s4h":"تشارك","rhythm.s4p":"مجموعتك الصغيرة بترد عليك بسؤال، مش بنصيحة — فتشوف نفسك في مرايا غيرك كمان.",
  "rhythm.s5h":"تثبّت","rhythm.s5p":"ممارسة اتزان متفصّلة على نتيجتك إنت، ونبضة قياس قصيرة بترسم خط عافيتك وهو بيتحرّك محطة ورا محطة.",
  "rhythm.note":"لو حلقة واحدة من الخمسة اتشالت، المحطة بتقع. وعشان كده ولا حلقة بتتشال.",
  "rhythm.x1b":"لقاءات حيّة أونلاين","rhythm.x1p":"مع المدرّب مباشرة، وشكل كل لقاء متصمّم لموضوعه.",
  "rhythm.x2b":"محتوى مسجّل بيعمّق","rhythm.x2p":"تشوفه على راحتك بين اللقاءات — مش بديل عنها.",
  "rhythm.x3b":"ساعة مفتوحة أسبوعية","rhythm.x3p":"اختيارية، للأسئلة والتعميق المباشر.",
  "rhythm.x4b":"رفيق الجيب","rhythm.x4p":"مساعد ذكي يرافقك طوال الرحلة ويعرف بصمتك الشخصية، ومعاك كمان بعدها."
});

Object.assign(T.ar, {
  "out.eyebrow":"اللي هتطلع بيه",
  "out.title":"مش هنوعدك تطلع «واثق» و«متوازن» و«ملهم»",
  "out.sub":'الكلام ده بيتقال في كل دورة، وبيبهت بعد أسبوعين. إحنا هنقولك بالظبط المعرفة اللي هتبقى في إيدك في آخر الرحلة — <b style="color:var(--gold-2)">بالعدد والاسم.</b> كل رقم من دول مش معلومة بتتحفظ، ده اكتشاف بتعيشه بنفسك.',
  "out.n1":"٢٧","out.h1":"بصمتك واحدة منها","out.p1":"تقاطع اتجاه طاقتك مع طريقة قلبك في معالجة الحياة. مش «نوع» بتتحط فيه من أول استبيان — دي نسخة بتتجمّع قدّامك مرآة ورا مرآة، وبتتقال لك بالاسم في آخر الرحلة، كتتويج لمعرفة عشتها بنفسك.",
  "out.n2":"٣","out.h2":"اتجاهات لطاقتك… بترتيبها عندك","out.p2":"الرئيسي اللي بياخد أغلب طاقتك، والفرعي اللي بيدعمه من ورا الستار, والمدفون اللي بيدفع التمن في صمت — وهو غالبًا مفتاح نموّك الحقيقي اللي مكنتش واخد بالك منه.",
  "out.n3":"١","out.h3":"التزام خفي… والافتراض اللي شايله","out.p3":"السبب الحقيقي اللي خلّى كل محاولات التغيير ترجّعك لنفس النقطة. بتستخرجه بإيدك من سلوكك — وبتختبره في الواقع، وتشوف بعينك إنه افتراض قديم، مش حقيقة.",
  "out.n4":"٥","out.h4":"فلاتر بتحكم رؤيتك تحت الضغط","out.p4":"العدسات اللي بتحوّل العقبة لنهاية، والنقد لهجوم على شخصك، ونجاح غيرك لتهديد ليك. بتعرف امتى بيشتغل كل واحد فيهم عندك — وإزاي ترجّع الصورة لوضعها الحقيقي.",
  "out.n5":"٧","out.h5":"مرايا عرفت نفسك فيها بُعدًا بُعدًا","out.p5":"حركة جسمك قبل وعيك، ووجهة نظرك، ورحلة مشاعرك، وطريقة عقلك في المعالجة، ووقودك، وشرط قيمتك، وجرحك الفاعل — كل بُعد بمقياسه الدقيق، وكل واحد بممارسته الخاصة.",
  "out.n6":"٣","out.h6":"أنواع للاحتراق… ونوعك منهم بالاسم","out.p6":"محترق، أو مجوّع، أو مكبوت. والتفرقة دي مش رفاهية نظرية — كل نوع طريق علاجه مختلف جذريًا عن التاني، فلازم تعرف نوعك إنت بالظبط.",
  "out.n7":"٨١","out.h7":"نقطة قوة… كل واحدة على طيف","out.p7":"كل نقطة قوة ليها حالة إفراط، واتزان، وتفريط. والممارسات اللي بتاخدها طول الرحلة مش عامة — متفصّلة على نقاطك إنت، في المكان اللي انزلقت فيه بالظبط.",
  "out.n8":"٩","out.h8":"مسارات للترقية… واحد منهم بقى باسمك","out.p8":"بأسماء أصيلة من تراث عميق، وكل مسار منهجية كاملة مش شعار. وبتدخل مسارك من النقطة اللي إنت واقف فيها فعلاً — مش من أول السطر.",
  "out.final":"كل واحدة من دي معرفة بتتعاش، وبتتقاس، وبتتسلّمها مكتوبة بين إيديك — مش جملة تحفيزية بتتنسي."
});

Object.assign(T.ar, {
  "report.title":"خريطة التحول الشخصية: الصورة الكاملة التي كانت تتشكل طوال الرحلة",
  "report.intro":"في الختام، بتتسلّم وثيقة مفيش منها نسخة تانية في الدنيا — لأنها عنك إنت وحدك. كل اللي اكتشفته عبر الرحلة، ملموم في صورة واحدة متماسكة:",
  "report.i1":"مستوى احتراقك على الطبقات الثلاث — وخط عافيتك من أول الرحلة لآخرها",
  "report.i2":"التزامك الخفي، وافتراضك الكبير، والمواقف اللي بتشعّل دفاعاتك",
  "report.i3":"فلاترك الخمسة — وامتى بيشتغل كل واحد فيهم عندك",
  "report.i4":"اتجاهات طاقتك الثلاثة بترتيبها — والمدفون منها",
  "report.i5":"قوّتك القلبية… ووقودك الحقيقي اللي بيحرّكك",
  "report.i6":"خريطتك في المرايا السبع — ترتيب أساليبك وموقعك على الطيف في كل مرآة",
  "report.i7":"بصمتك من الـ ٢٧ — بملامحها وعلامات التعرف عليها",
  "report.i8":"نوع احتراقك بالاسم",
  "report.i9":"مسارك للترقية — منهجيته، وممارساته، وخطة أول ٣٠ يوم",
  "report.quote":"ناس كتير بتعدّي حياتها كلها من غير ما تشوف نفسها مكتوبة في صفحة واحدة. إنت هتمسك نفسك بإيدك — وتقرّر بنفسك الخطوة الجاية.",

  "after.title":"ومش بتمشي لوحدك بعد ما تخلص",
  "after.h1":"رفيق الجيب يكمّل معاك","after.p1":"عارف بصمتك بالظبط: بيقرأ موقفك على ضوءها، ويرشّح لك ممارسة من مسارك إنت — مش نصيحة عامة. ويفضل معاك مدة كاملة بعد الختام.",
  "after.h2":"لقاء متابعة بعد فترة","after.p2":"بترجع للدفعة بخبرات الميدان: إيه اللي اشتغل، وإيه اللي اتعثّر، وإزاي تكمّل من النقطة اللي وصلت لها فعلاً.",
  "after.h3":"شبكة مقفولة من ناس فاهماك","after.p3":"مجموعة صغيرة فاهمة رحلتك بالظبط — لأنهم عاشوها معاك. الرفقة دي بتفضل موجودة بعد ما اللقاءات تخلص."
});

Object.assign(T.ar, {
  "inst.eyebrow":"المدرّب — يقود الرحلة كاملة بنفسه",
  "inst.name":"كوتش محمود فؤاد",
  "inst.role":"صاحب منظور الفؤاد · مصمم إطار الـ Compassionate Enneagram™",
  "inst.c1":"سفير التراحم التطبيقي من مركز CCARE — جامعة ستانفورد (الولايات المتحدة).",
  "inst.c2":"مصمم الـ Compassionate Enneagram™ Framework — إطار أصيل لفهم الطبائع البشرية في بيئات القيادة والعمل.",
  "inst.c3":"ممارس معتمد دوليًا في تطوير القيادات وفِرق العمل.",
  "inst.c4":"كوتش معتمد في الانياجرام للأعمال — The Enneagram in Business (سان فرانسيسكو، الولايات المتحدة).",
  "inst.c5":"ممارس تكاملي معتمد في الانياجرام — Integrative Enneagram Solutions (جنوب أفريقيا).",
  "inst.bio":"خبرة بتمتد لأكتر من ١٥ سنة في تقديم مناهج وحلول للمؤسسات المحلية والدولية. بيقود رحلة Reignite كاملة بنفسه، وتُقدَّم حصريًا من خلال شركة Proactive Development Solutions.",

  "spark.eyebrow":"تجربة مجانية · من غير تسجيل",
  "spark.title":"الشرارة الأولى",
  "spark.lead":"مش عايزك تصدّقني.. عايزك تجرّب. قبل ما تقرّر أي حاجة، عِش الرحلة مصغّرة بنفسك: محطات قصيرة تمشي فيها خطوة بخطوة، فيديوهات وتمارين تطبّقها إنت، وتطلع بأول لمحة حقيقية عن بصمتك. أصدق دليل على عمق الرحلة إنك تدوقها.",
  "spark.pt1":"محطات مصغّرة تعيشها بنفسك، مش تتفرّج عليها",
  "spark.pt2":"فيديوهات قصيرة + تمارين تطبيقية على طول",
  "spark.pt3":"تطلع بأول لمحة عن طريقة قلبك واتجاه طاقتك",
  "spark.cta":"ابدأ الشرارة الأولى من هنا مجاناً",
  "spark.note":"من غير التزام · من غير دفع · تجربة كاملة على راحتك",
  "spark.st1":"اختار مدخلك للرحلة","spark.st2":"اتفرّج على فيديو قصير","spark.st3":"عِش التمرين بنفسك","spark.st4":"اكتشف أول لمحة من بصمتك"
});

Object.assign(T.ar, {
  "faq.eyebrow":"الأسئلة الشائعة",
  "faq.title":"كل اللي في دماغك… هنجاوب عليه",
  "faq.q1":"هل ده اختبار شخصية زي اللي جرّبته قبل كده؟",
  "faq.a1":"لأ — والفرق جوهري. الاختبارات بتحطّك في خانة من أول استبيان. هنا بصمتك بتتجمّع قدّامك عبر سبع مرايا، وإنت اللي بتأكّد كل خطوة من تجربتك الحقيقية — وبتتقال لك في آخر الرحلة كتتويج لمعرفة عشتها، مش كنتيجة فورم مليته في عشر دقايق.",
  "faq.q2":"أنا مش في مجال نفسي ولا تطوير — أنا صاحب شغل / مدير / شغّال مع عملاء. هتفيدني؟",
  "faq.a2":"الرحلة متصمّمة لك تحديدًا. كل مفهوم بيوصلك بمشهد من بيئة شغلك إنت، وكل التطبيقات بتحصل جوّه يومك المهني الحقيقي — مش في الفراغ، ولا بأمثلة عامة.",
  "faq.q3":"وقتي ضيق جدًا — هلحق؟",
  "faq.a3":"أغلب الرحلة بتتعاش جوّه شغلك اللي إنت فيه أصلًا: ملاحظة ووعي وتطبيق وإنت في يومك، مش مهام مكدّسة فوقه. اللقاء الحيّ ساعتين ونص تقريبًا، والباقي مرن على راحتك.",
  "faq.q4":"هل ده علاج نفسي؟",
  "faq.a4":"لأ. دي رحلة معرفة ووعي وتطوير. بنتعامل مع البنية النفسية للإنسان الناجح السليم اللي عايز يفهم نفسه ويتخطّى احتراقه — مش مع تشخيص أو علاج إكلينيكي. ولو ظهرت حاجة محتاجة دعم متخصص، بنوجّهك لها بوضوح.",
  "faq.q5":"ليه رحلة ممتدة… مش كورس مكثّف في يوم أو اتنين؟",
  "faq.a5":"لأن الكورس المكثّف بيديك معلومة والمعلومة لوحدها بتتنسي. التحوّل محتاج إنك تعيش، وتكتشف، وتطبّق في شغلك، وترجع تحكي، وتعدّل. عشان كده الرحلة سلسلة لقاءات حيّة، وبينها معايشة حقيقية — فالمعرفة بتستقر، مش بتعدّي.",
  "faq.q6":"إمتى بتبدأ الدفعة، وإيه مواعيدها؟",
  "faq.a6":"الرحلة بتفتح أبوابها قريبًا بدفعة مؤسِّسة محدودة المقاعد. أول ما تسجّل اهتمامك، بنتواصل معك بكل التفاصيل سواء المواعيد، وشكل اللقاءات، وكل اللي تحتاج تعرفه وقبل أي إعلان عام.",
  "faq.q7":"هل المجموعة الصغيرة إجبارية؟",
  "faq.a7":"هي قلب التجربة، والتعلّم بين الأقران جزء أساسي منها، لكن مساحة المشاركة بإذنك دايمًا: بتشارك بقدر ما تختار، وتفاصيلك الفردية محفوظة بسرّية كاملة.",
  "faq.q8":"دي دفعة جديدة وأنا مسمعتش قبل كده إن في البيزنس النوعية دي من الدورات مهمة — إزاي أطمّن وأنا من أوائل الناس؟",
  "faq.a8":"لو تابعت التوجهات العالمية هتلاقي النوعية دي من الدورات بقي ليها أولولية قصوى بس يمكن في إطارك الحالي لسه الموضوع مخدش نفس درجة الأهمية، وهل لما قرأت المحتوي بتاع الدورة محستهوش لمسك؟، وكمان خليني أطمنك إن الإطار نفسه مش جديد: هو ثمرة أكثر من 15 سنة من الجلسات الفردية والجماعية والدورات والممارسات الموثقة عليماً وتراثياً وله بنية صارمة واضحة دقيقة (كما أوضحنا). الجديد هو طرحه بهذا النموذج التحويلي المتكامل. وكونك من الأوائل يعني مجموعة أصغر وأقرب وبيحصلوا علي محتوي متنوع وتفصيلي عن المجموعات اللاحقة، ووصول مباشر للمدرّب والنقاش معه في تفاصيل متعددة. وممكن جداً تجرب بنفسك محتوي الشرارة الأولى بالأعلي اللي مفتوحة لك مجاناً قبل أي قرار."
});

Object.assign(T.ar, {
  "call.eyebrow":"الدعوة",
  "call.title":"يمكن تكون جرّبت تغيّر كتير قبل كده. ويمكن تكون تعبت من الوعود الكبيرة.",
  "call.p":'عشان كده Reignite ما بتوعدكش إنها هتغيّر حياتك في يوم وليلة. لكنها بتوعدك بحاجة أهم وأصدق: إنك تشوف بوضوح الاستراتيجية اللي كانت بتخدمك يومًا ما، وبقت تستنزفك اليوم. وإنك تمسك الخيط اللي يرجّعك لجوهرك من جديد. وإن المعرفة دي، لأول مرة، هيكون قرارها في إيدك إنت. لأنك طول الرحلة وإنت بتنزل طبقة وراء طبقة: لحد ما تشوف بوضوح الشيء الذي كان يحرّكك من البداية. فالسؤال ساعتها مش هيكون: "ليه أنا وصلت للاحتراق؟" السؤال هيبقى: "دلوقتي بعد ما شفت نفسي بوضوح... هختار أعيش إزاي؟" ومن هنا تبدأ الرحلة فعلًا.',
  "call.cta":"سجّل اهتمامك دلوقتي",
  "call.seats":"رحلة الأونلاين بتبدأ بدفعة مؤسِّسة محدودة المقاعد عمداً.. لأن عمق الرحلة يعتمد على أن تظل المجموعة صغيرة بما يكفي ليُرى كل شخص فيها، لا أن يضيع وسط الزحام.. فالرحلة مبنية على الحضور والمشاركة، لا على المشاهدة من بعيد. وكلما كبرت المجموعة، فقدت الرحلة جزءًا من روحها.",

  "reg.eyebrow":"سجّل اهتمامك",
  "reg.title":"كن أول من يعرف معاد الدفعة المؤسِّسة",
  "reg.sub":"سجّل بياناتك في الاستمارة، ونتواصل معك أول ما التسجيل يفتح — وقبل أي إعلان عام.",
  "reg.fallback":"الاستمارة مش ظاهرة عندك؟",
  "reg.fallinklink":"افتحها في نافذة جديدة",

  "foot.brand":"Reignite — Burnout to Brilliance Program · من الاحتراق إلى التألق",
  "foot.by":"برنامج من تصميم وتقديم كوتش محمود فؤاد",
  "foot.pds":"يُقدَّم حصريًا من خلال شركة Proactive Development Solutions",
  "foot.rights":"جميع الحقوق محفوظة — Proactive Development Solutions",

  "sticky.title":"Reignite — من الاحتراق إلى التألق",
  "sticky.sub":"دفعة مؤسِّسة · مقاعد محدودة · مجموعات صغيرة",
  "sticky.cta":"سجّل اهتمامك دلوقتي",

  "ui.explore":"دوس للاستكشاف ←",
  "ui.close":"دوس للإغلاق ✕",
  "ui.whatHappens":"اللي بيحصل هنا",
  "ui.youLeave":"بتخرج منها وإنت بتقول"
});

/* ---------- English (professional, editorial — not literal) ---------- */
Object.assign(T.en, {
  "meta.title":"Reignite — Burnout to Brilliance Program",
  "meta.desc":"This isn't a program about burnout. It's a journey down into the single strategy that built your success — the very one now standing behind your exhaustion — and back up again, knowing yourself in a way you never did before. Led by Coach Mahmoud Fouad, delivered exclusively through Proactive Development Solutions.",

  "hero.pre":'<span class="dot"></span> <b>Reignite — Burnout to Brilliance</b> <span style="opacity:.4">·</span> Delivered exclusively through Proactive Development Solutions',
  "hero.h1":'The strategy that built your success…<br/><span class="grad">is the very one wearing you down today.</span>',
  "hero.lead":"You're not just tired. The truth runs far deeper than that — you've drifted away from yourself, to the point of burning out almost daily. The reason: for years you've been running on one core inner strategy that carried you to every success you've had — yet it is that exact same strategy that now depletes you. This journey takes you deep into that strategy, helps you understand it and name it with precision, and brings you out with a complete map for the shift from burnout to brilliance — tailored entirely to you, not one more off-the-shelf prescription. Across 12 stations you'll uncover your personal Signature, one of 27, identify the true nature of your burnout, and chart the path back to brilliance that fits you specifically.",
  "hero.cta1":"Register your interest",
  "hero.cta2":"Try the free mini-experience",
  "hero.note1":"Small group, limited seats",
  "hero.note2":"A fully online journey",
  "hero.note3":"A special founding-cohort discount",

  "pain.eyebrow":"Why this journey is for you — and why now",
  "pain.title":"There used to be a fire that woke you each morning. Now there's a question that keeps repeating.",
  "pain.p1":'You used to wake with something alive inside you, pushing you into the day. Now you wake up and can barely carry on, and all you hear is one voice: <strong>"How long can this go on?" "Is this every day?" "Again?" "Will I always be like this?" "And where does it even end?"</strong>',
  "pain.p2":"You still get the work done. You still close your tasks. You still answer every message and every call. But underneath, a reservoir is draining a little more each time, and no one refills it. The success that once thrilled you now passes through and leaves no trace. The people who were once your source of energy and support have become a weight on your back. And the meaning that once gave your life value has drifted so far away you can barely remember its shape.",
  "pain.p3":"And you know perfectly well the problem isn't that you aren't working hard enough. Quite the opposite — you're putting in twice the effort you ever did. Yet the more you pour in, the faster the reservoir empties.",
  "pain.s1":"You took a break, came back, and found yourself exactly where you were — or worse.",
  "pain.s2":"You read the books and took the courses, so you know what you're \"supposed to do\" — yet nothing actually changed.",
  "pain.s3":"You told yourself \"I'll manage my time\" and \"I'll sort my priorities\"… and every time, you land back at the same point.",
  "pain.punch":"And the reason is plain: you've been treating the symptom, not the true root of the problem.",

  "idea.big":'Burnout isn\'t the problem.<br/>Burnout is a <em>symptom</em> of the problem.',
  "idea.p1":"Think of it like a fever. The fever itself isn't the illness — it's only a sign that something beneath it needs treating. And if all you do is bring the temperature down, the illness stays right where it is, and the fever returns.",
  "idea.p2":"Burnout is exactly the same: a sign that a strategy has been running inside you for years and has begun taking far more from you than it gives back — without you noticing. And until you know that strategy by name and in detail, any solution stays a painkiller: it eases the exhaustion for a week, then comes back stronger.",
  "idea.last":"Reignite doesn't hand you a painkiller. It hands you a precise, rigorous inner map of yourself — and from there, the decision rests in your hands."
});

Object.assign(T.en, {
  "cycle.eyebrow":"So what is this \"strategy\"?",
  "cycle.title":"Each of us built ourselves a strategy. And that strategy is a story.",
  "cycle.sub":"Without ever deciding to, you built yourself a core strategy — a way to exist, to succeed, to find your footing in the world, and to shield yourself the moment pressure arrives. That strategy moved through four moments. We all pass through the same stages, though each of us, of course, has our own particular version of it. Let's look at what those moments are:",
  "curve.born":"It was born","curve.thrived":"It thrived","curve.strain":"It began to strain","curve.stopped":"It stalled","curve.brilliance":"Brilliance","curve.journeystart":"and here the journey begins…",

  "mom.tag1":"The first moment","mom.h1":"It was born",
  "mom.p1":"This way of being didn't come from nowhere. It was born early, in a hard moment where it was the smartest option available. The child who learned no one would hold things for them learned to hold everything in their own hands. The one who learned their worth lived in their achievement started achieving in order to deserve. This is no flaw in you — it's a protection you built for yourself on the day you genuinely needed it.",
  "mom.tag2":"The second moment","mom.h2":"It thrived",
  "mom.p2":"You grew, and the way worked. It's what carried you. The one who held everything became the person everyone leans on in a crisis. The one who delivers became the star whose name comes up everywhere. Every success confirmed the way was right, so you held to it tighter. And deservedly so — at the time, it earned its place.",
  "mom.tag3":"The third moment","mom.h3":"It began to strain",
  "mom.p3":"Then the world around you changed, and the way stayed the same. The one used to holding everything now has a team waiting to be trusted with the load — and the hands won't let go. The one whose worth lives in achievement now needs to stop and catch their breath — and can't. The way that once gave to you began asking more of you than it returned. And your first reaction is to work it harder — so you pull at it harder, and tire faster.",
  "mom.tag4":"The fourth moment","mom.h4":"It stalled",
  "mom.p4":"And when the way is stretched to its very limit without changing, it reaches a point where it stops. That is burnout. Not a failure in you, not a weakness of yours — it's the way itself, having reached its end. The one carrying everything stopped under the weight; the one chasing achievement stopped from the endless sprint.",

  "reveal.big":'And the deepest thing in this story: this strategy isn\'t merely how you behave in a crisis. <em>It\'s a way of living so complete that you mistook it for yourself — an entire way of seeing yourself and the world, built one day to protect you.</em>',
  "reveal.p1":"It has a name, and it has precise features. It's your personal Signature — but one running on fear instead of love. And knowing it with precision — what it is exactly, how it works, and how to make it serve you from love again instead of fear — that is the entire journey.",
  "reveal.last":"Reignite doesn't put the fire out. It shows you how to burn bright without burning out. This is not a journey about repairing someone broken — it's about reminding them who they were, before the strategy began leading them, rather than them using it with skill and intent."
});

Object.assign(T.en, {
  "who.eyebrow":"Who this journey is for",
  "who.title":"This journey can't be confined to a single title or field. Because burnout doesn't ask what you do for a living — it asks how you're living it.",
  "who.sub":'The job titles may differ — the faces, the offices, the stories all differ — but the feeling at the end of the day is one and the same. And one question keeps running in the background: <b style="color:var(--gold-2)">has your work started taking more out of you than it gives back?</b> Listen to these voices quietly, and notice where yours sits among them.',
  "who.t1":"The one leading a team","who.v1":"\"I'm forever balancing the expectations of those above against the interests of those below — giving and carrying responsibility for some people, trying to satisfy others… and every day a question echoes inside me: who's carrying me?\"",
  "who.t2":"The one caught in the middle","who.v2":"\"Responsible for delivery without owning the decision. The blame and the pressure come down from above, the expectations rise up from below… and I'm the space where the two meet.\"",
  "who.t3":"The one building their own venture","who.v3":"\"I wear every hat in a single day — leader, marketer, accountant, HR. And I catch myself remembering the days I started, asking: where did the person who was so excited about all this go?\"",
  "who.t4":"The one whose work is numbers and clients","who.v4":"\"Every day: rejection, resistance, a target. Chasing one number after another. Close a deal, move to the next… until I forgot the last time I actually felt a sense of accomplishment.\"",
  "who.t5":"The one working solo","who.v5":"\"It's just me against the clients, the negotiations, the deadlines, the rejection. And every decision, every mistake, every hard day… there's no one to share the weight with.\"",
  "who.t6":"The one carrying everyone else's burdens","who.v6":"\"People come to me with their pain and their problems, and I'm present for all of them. As for my own concerns… my turn always comes last.\"",
  "who.foot":'Perhaps not every line sounds like you. But if a single one of them made you pause for a moment… <b>then part of you is probably telling you it\'s time to take this journey with us.</b> Because this journey won\'t talk to you about burnout as a concept. It will let you watch it happen — in the reality of your day, in your decisions, and in the way you\'ve come to live your work.'
});

Object.assign(T.en, {
  "diff.eyebrow":"What makes Reignite a different kind of journey",
  "diff.title":"The difference isn't knowing more… it's returning to live from your essence.",
  "diff.sub":"You may have tried before. Read the books, attended the workshops, taken the break, understood a great deal about burnout… and still circled back to the same place. So why do some attempts soothe you, yet never change you? Why might you have tried so much, and still be standing in the same spot? Not because you didn't learn enough — but because knowledge alone isn't enough. At Reignite, we're not adding new information to your mind. We return you to the place where you lost contact with yourself, and together we follow a precise method to restore that connection.",
  "diff.h1":"We won't just diagnose, understand, and explain your pain — together, we'll map the way out of it",
  "diff.p1":'A lot of the talk about burnout stops at diagnosis: it gives your pain a name, so you say "Yes — that\'s what I have. But where\'s the way out?" Or it explains why it happened, without ever telling you "and what exactly do I do now?" At Reignite, diagnosis, explanation, and path happen together: you understand and identify your personal Signature; you uncover and make sense of the strategy that once protected you and now drains you; and you begin a path of practical steps that carry you back to love instead of fear.',
  "diff.h2":"Authentic depth, not translated content",
  "diff.p2":"This journey doesn't set out from an imported Western model dressed in local clothing. It's a meeting between modern psychology and a deep heritage that has worked for centuries on understanding the human soul and heart. Science gives us precision; the wisdom of that heritage gives us deep, exact meaning. At Reignite, the two meet. You'll find every concept rooted in both a scientific source and an authentic one, woven into a single fabric.",
  "diff.h3":"This is about you — not a \"generic type,\" and not a number in a model",
  "diff.p3":'Our aim isn\'t to drop you into a ready-made box and say "this is you." The aim is for you, across the journey, to see your own unique Signature clearly: the direction of your energy, the strategy you meet life with, the hidden condition you tied your worth to, and the old wound still writing some of your decisions. Not so you\'ll be convinced "this is who you are" — but so you\'ll have the freedom to choose anew.',
  "diff.h4":"A community that learns together",
  "diff.p4":"Most of us learned to fight our battle in silence. But at Reignite, you won't walk alone. You'll be among a small group moving through the same journey from beginning to end — people who reveal, experiment, share, fall and rise, learn together, and adjust course. Because the deepest transformations don't happen in isolation… but in the presence of another human being who witnesses your journey."
});

Object.assign(T.en, {
  "journey.eyebrow":"The shape of the journey",
  "journey.title":"A U-shaped journey: you descend as one person… and rise as another",
  "journey.sub":"Together we descend through the first half — to see, to understand, to feel — reach the deepest point, then ascend together through the second half to crystallize and to anchor. Each station completes the one before it and hands you to the next. Tap any station to discover what happens inside it.",
  "journey.foot":'These stations are lived through a series of <b>live online sessions</b> with the coach directly — and between each session and the next, real lived practice inside your own work, not in a vacuum.',

  "rhythm.eyebrow":"How each station is lived",
  "rhythm.title":"A station is lived… not merely heard",
  "rhythm.sub":"Information on its own fades. What truly changes you is living a complete experience with each station — and that happens through a loop of five steps that turns with you at every station, without a single link breaking.",
  "rhythm.s1h":"Receive","rhythm.s1p":"A live session with the coach, shaped to its subject: a dissection, a lab, a circle, or group coaching. There's no single fixed template.",
  "rhythm.s2h":"Discover","rhythm.s2p":"The station's instrument reveals the order of your patterns and your place on the spectrum. A mirror that shows you to yourself — not a verdict laid upon you.",
  "rhythm.s3h":"Apply","rhythm.s3p":"A live lab inside your real work — noticing and applying as you move through your ordinary day, not assignments piled on top of your job.",
  "rhythm.s4h":"Share","rhythm.s4p":"Your small group responds with a question, not advice — so you see yourself in others' mirrors too.",
  "rhythm.s5h":"Anchor","rhythm.s5p":"A balancing practice tailored to your own result, and a short check-in pulse that traces your wellbeing line as it moves station after station.",
  "rhythm.note":"Remove a single one of the five links, and the station collapses. Which is exactly why no link is ever removed.",
  "rhythm.x1b":"Live online sessions","rhythm.x1p":" — with the coach directly, each session designed for its subject.",
  "rhythm.x2b":"Recorded content that deepens","rhythm.x2p":" — watched at your own pace between sessions, never a substitute for them.",
  "rhythm.x3b":"A weekly open hour","rhythm.x3p":" — optional, for questions and direct deepening.",
  "rhythm.x4b":"A pocket companion","rhythm.x4p":" — an intelligent assistant that accompanies you throughout the journey, knows your personal Signature, and stays with you afterward too."
});

Object.assign(T.en, {
  "out.eyebrow":"What you'll leave with",
  "out.title":"We won't promise you'll come out \"confident,\" \"balanced,\" and \"inspired\"",
  "out.sub":"That line gets said in every course, and it fades within two weeks. We'll tell you exactly what knowledge will be in your hands by the journey's end — <b style=\"color:var(--gold-2)\">by number and by name.</b> And none of these is a fact to memorize; each is a discovery you live for yourself.",
  "out.n1":"27","out.h1":"Your Signature is one of them","out.p1":"The intersection of your energy's direction with your heart's way of processing life. Not a \"type\" you're dropped into from the first questionnaire — it's a version that assembles before you, mirror after mirror, and is named for you at the journey's end, as the crowning of knowledge you lived yourself.",
  "out.n2":"3","out.h2":"Directions of your energy… in your own order","out.p2":"The primary one that takes most of your energy, the secondary that supports it from behind the curtain, and the buried one that quietly pays the price — often the real key to your growth that you never noticed.",
  "out.n3":"1","out.h3":"A hidden commitment… and the assumption holding it up","out.p3":"The real reason every attempt at change kept returning you to the same point. You draw it out with your own hands from your behavior — then test it in reality, and see for yourself that it's an old assumption, not a fact.",
  "out.n4":"5","out.h4":"Filters that govern how you see under pressure","out.p4":"The lenses that turn an obstacle into an ending, criticism into an attack on who you are, and another's success into a threat to you. You learn when each one switches on for you — and how to return the picture to what's actually there.",
  "out.n5":"7","out.h5":"Mirrors in which you came to know yourself, dimension by dimension","out.p5":"Your body's motion before your awareness, your point of view, the journey of your emotions, your mind's way of processing, your fuel, the condition on your worth, and your active wound — each dimension with its own precise instrument, and each with its own practice.",
  "out.n6":"3","out.h6":"Types of burnout… and yours, by name","out.p6":"Burned-out, starved, or suppressed. This distinction is no theoretical luxury — each type's path of recovery differs radically from the others, so you have to know precisely which one is yours.",
  "out.n7":"81","out.h7":"Points of strength… each on a spectrum","out.p7":"Every point of strength has a state of excess, of balance, and of deficiency. And the practices you take throughout the journey aren't generic — they're tailored to your points, at the exact place where you slipped.",
  "out.n8":"9","out.h8":"Paths of elevation… one now bears your name","out.p8":"With authentic names drawn from a deep heritage, each path a complete methodology, not a slogan. And you enter your path from where you actually stand — not from the first line.",
  "out.final":"Each of these is knowledge that is lived, measured, and placed in your hands in writing — not a motivational line that fades."
});

Object.assign(T.en, {
  "report.title":"Your personal Transformation Map: the full picture that was forming all along the journey",
  "report.intro":"At the close, you receive a document with no second copy anywhere in the world — because it's about you, and you alone. Everything you discovered across the journey, gathered into a single coherent picture:",
  "report.i1":"Your burnout level across the three layers — and your wellbeing line from the journey's start to its end",
  "report.i2":"Your hidden commitment, your big assumption, and the situations that ignite your defenses",
  "report.i3":"Your five filters — and when each switches on for you",
  "report.i4":"Your three energy directions in order — and the buried one among them",
  "report.i5":"Your heart-strength… and the true fuel that moves you",
  "report.i6":"Your map across the Seven Mirrors — the order of your patterns and your place on the spectrum in each",
  "report.i7":"Your Signature out of the 27 — with its features and its marks of recognition",
  "report.i8":"The type of your burnout, by name",
  "report.i9":"Your path of elevation — its methodology, its practices, and a first-30-days plan",
  "report.quote":"Many people pass through their entire lives without once seeing themselves written on a single page. You will hold yourself in your own hands — and decide your next step for yourself.",

  "after.title":"And you don't walk alone after it ends",
  "after.h1":"The pocket companion continues with you","after.p1":"It knows your Signature exactly: it reads your situation in its light and suggests a practice from your own path — not generic advice. And it stays with you for a full period after the close.",
  "after.h2":"A follow-up session, after a while","after.p2":"You return to the cohort with field experience: what worked, what stumbled, and how to carry on from the point you've actually reached.",
  "after.h3":"A closed network of people who understand you","after.p3":"A small group that understands your journey exactly — because they lived it with you. That companionship remains in place after the sessions end."
});

Object.assign(T.en, {
  "inst.eyebrow":"Your coach — leading the entire journey himself",
  "inst.name":"Coach Mahmoud Fouad",
  "inst.role":"Founder of The Fouad Perspective · Designer of the Compassionate Enneagram™ framework",
  "inst.c1":"Applied Compassion Ambassador, CCARE — Stanford University (USA).",
  "inst.c2":"Designer of the Compassionate Enneagram™ Framework — an authentic framework for understanding human nature in leadership and workplace settings.",
  "inst.c3":"Internationally certified practitioner in leadership and team development.",
  "inst.c4":"Certified coach in The Enneagram in Business (San Francisco, USA).",
  "inst.c5":"Certified integrative practitioner — Integrative Enneagram Solutions (South Africa).",
  "inst.bio":"More than 15 years of experience delivering programs and solutions to local and international organizations. He leads the entire Reignite journey himself, delivered exclusively through Proactive Development Solutions.",

  "spark.eyebrow":"Free experience · no sign-up",
  "spark.title":"The First Spark",
  "spark.lead":"I don't want you to take my word for it — I want you to try it. Before you decide anything, live the journey in miniature for yourself: short stations you walk through step by step, videos and exercises you apply yourself, and you come away with a first real glimpse of your Signature. The truest proof of the journey's depth is to taste it.",
  "spark.pt1":"Mini-stations you live yourself — not watch",
  "spark.pt2":"Short videos + applied exercises throughout",
  "spark.pt3":"You leave with a first glimpse of your heart's way and your energy's direction",
  "spark.cta":"Start the First Spark here, free",
  "spark.note":"No commitment · no payment · a full experience at your own pace",
  "spark.st1":"Choose your way into the journey","spark.st2":"Watch a short video","spark.st3":"Live the exercise yourself","spark.st4":"Uncover a first glimpse of your Signature"
});

Object.assign(T.en, {
  "faq.eyebrow":"Frequently asked questions",
  "faq.title":"Everything on your mind… we'll answer it",
  "faq.q1":"Is this a personality test like the ones I've tried before?",
  "faq.a1":"No — and the difference is fundamental. Tests drop you into a box from the first questionnaire. Here, your Signature assembles before you across seven mirrors, with you confirming every step from your own real experience — and it's named for you at the journey's end, as the crowning of knowledge you lived, not the result of a form you filled in ten minutes.",
  "faq.q2":"I'm not in psychology or development — I'm a business owner / manager / someone working with clients. Will it help me?",
  "faq.a2":"The journey is designed specifically for you. Every concept reaches you through a scene from your own work environment, and every application happens inside your real professional day — not in a vacuum, and not through generic examples.",
  "faq.q3":"My time is very tight — will I keep up?",
  "faq.a3":"Most of the journey is lived inside the work you're already doing: noticing, awareness, and application as you go through your day — not tasks piled on top. The live session runs about two and a half hours, and the rest is flexible, at your own pace.",
  "faq.q4":"Is this psychotherapy?",
  "faq.a4":"No. This is a journey of knowledge, awareness, and development. We work with the psychological structure of the healthy, successful person who wants to understand themselves and move beyond their burnout — not with clinical diagnosis or treatment. And if something arises that needs specialized support, we point you toward it clearly.",
  "faq.q5":"Why an extended journey… rather than an intensive course over a day or two?",
  "faq.a5":"Because an intensive course gives you information, and information on its own fades. Transformation requires you to live it, discover it, apply it in your work, come back and share, and adjust. That's why the journey is a series of live sessions, with real lived practice in between — so the knowledge settles, rather than passing through.",
  "faq.q6":"When does the cohort begin, and what are the dates?",
  "faq.a6":"The journey opens its doors soon, with a limited-seat founding cohort. The moment you register your interest, we'll reach out with every detail — the dates, the shape of the sessions, and everything you need to know — ahead of any public announcement.",
  "faq.q7":"Is the small group mandatory?",
  "faq.a7":"It's the heart of the experience, and peer learning is an essential part of it — but the space to share is always yours to grant: you share as much as you choose, and your individual details are kept in complete confidentiality.",
  "faq.q8":"This is a new cohort, and I hadn't heard before that this kind of course matters in business — how can I feel reassured being among the first?",
  "faq.a8":"If you follow the global trends, you'll find this kind of work has become a top priority — though within your current setting the matter may not yet carry the same weight. And when you read the program's content, didn't it touch something in you? Let me also reassure you that the framework itself is not new: it's the fruit of more than 15 years of individual and group sessions, courses, and practices documented both scientifically and through heritage, with a rigorous, clear, precise structure (as we've laid out). What's new is presenting it through this integrated transformational model. And being among the first means a smaller, closer group that receives richer, more detailed content than later cohorts, along with direct access to the coach and discussion with him across many details. And you can absolutely try the First Spark content above — open to you for free — before making any decision."
});

Object.assign(T.en, {
  "call.eyebrow":"The invitation",
  "call.title":"Maybe you've tried to change a great deal before. And maybe you've grown tired of the big promises.",
  "call.p":"That's why Reignite doesn't promise to change your life overnight. It promises something more important and more honest: that you'll see clearly the strategy that once served you and now drains you, that you'll grasp the thread that returns you to your essence, and that this knowledge — for the first time — will be a decision in your own hands. Because all along the journey you descend, layer after layer, until you see clearly the thing that was moving you from the very beginning. So the question then won't be \"why did I reach burnout?\" The question will be: \"now that I've seen myself clearly… how will I choose to live?\" And that is where the journey truly begins.",
  "call.cta":"Register your interest",
  "call.seats":"The online journey begins with a deliberately limited-seat founding cohort — because the depth of the journey depends on the group staying small enough for every person in it to be seen, rather than lost in the crowd. The journey is built on presence and participation, not on watching from afar. And the larger the group grows, the more the journey loses part of its soul.",

  "reg.eyebrow":"Register your interest",
  "reg.title":"Be the first to know the founding cohort's start date",
  "reg.sub":"Enter your details in the form, and we'll reach out the moment registration opens — ahead of any public announcement.",
  "reg.fallback":"Form not showing for you?",
  "reg.fallinklink":"Open it in a new window",

  "foot.brand":"Reignite — Burnout to Brilliance Program",
  "foot.by":"A program designed and delivered by Coach Mahmoud Fouad",
  "foot.pds":"Delivered exclusively through Proactive Development Solutions",
  "foot.rights":"All rights reserved — Proactive Development Solutions",

  "sticky.title":"Reignite — Burnout to Brilliance",
  "sticky.sub":"Founding cohort · limited seats · small groups",
  "sticky.cta":"Register your interest",

  "ui.explore":"Tap to explore →",
  "ui.close":"Tap to close ✕",
  "ui.whatHappens":"What happens here",
  "ui.youLeave":"You leave it saying"
});

/* ===== Phases (per language) ===== */
const PHASES = {
  ar:[
    { key:"pre",    tone:"t-pre",    label:"قبل النزول",                 note:"الأمان الأول" },
    { key:"down",   tone:"t-down",   label:"النزول — من السطح للجذر",    note:"كل محطة أعمق من اللي قبلها" },
    { key:"bottom", tone:"t-bottom", label:"القاع — أعمق نقطة",          note:"أهدى محطة وأكترهم أمانًا" },
    { key:"up",     tone:"t-up",     label:"الصعود — الرجوع واحد تاني",  note:"من المعرفة للطريق" }
  ],
  en:[
    { key:"pre",    tone:"t-pre",    label:"Before the descent",              note:"Safety first" },
    { key:"down",   tone:"t-down",   label:"The descent — surface to root",   note:"Each station deeper than the last" },
    { key:"bottom", tone:"t-bottom", label:"The bottom — the deepest point",  note:"The quietest, safest station" },
    { key:"up",     tone:"t-up",     label:"The ascent — rising anew",        note:"From knowing to the path" }
  ]
};

/* ===== Stations (Arabic) ===== */
const STATIONS = { ar:[], en:[] };

STATIONS.ar = [
  { phase:"pre", tone:"pre", num:"المحطة ١", title:"الاستقبال",
    q:"هل أنا في إيد أمينة؟",
    desc:"قبل أي خطوة، بنأسّس الأمان اللي من غيره مفيش صدق — ومن غير صدق مفيش تعافي: سرّية كاملة، اسم مستعار، ورفيق جيب معاك من أول يوم.",
    objective:"أكبر خوف عند أي حد داخل رحلة زي دي: «لو فتحت نفسي، هتداووني ولا هتسيبوني؟» المحطة دي بتقفل السؤال ده قبل ما الرحلة تبدأ أصلًا.",
    points:["ترحيب شخصي بنبرة المدرّب نفسه — مش رسالة آلية","عهد السرّية: بتسجّل باسم مستعار، وتفاصيلك الفردية مايشوفهاش حد","رفيق الجيب بيتفعّل من اليوم الأول — مش أداة بتيجي في الآخر","أداة إصغاء عميق على جرعات هادية — بتجهّز خريطتك الأولى وإنت مرتاح"],
    result:"«أنا في مكان آمن — ومستنّيني حد فاهمني.»" },
  { phase:"down", tone:"down", num:"المحطة ٢", title:"الاعتراف",
    q:"إيه اللي شغّال جوّايا؟",
    desc:"الفرق بين تعب بيروح بإجازة واحتراق بيرجع بعدها، والطبقات الثلاث اللي بتخسر منها، واتجاه طاقتك بترتيبه الكامل.",
    objective:"بنبدأ من الوجع — بس بنسأله السؤال الصح: مش «ليه أنا تعبان؟»… «إيه اللي شغّال فيّ؟»",
    points:["الفرق الحاسم بين الإرهاق والاحتراق — وليه كل المعالجات السابقة مانفعتش","طبقات الاستنزاف الثلاث: الطاقة، والحضور، والمعنى — وإنت بتخسر من أنهي واحدة","اتجاهات طاقتك الثلاثة: الرئيسي اللي بياخد طاقتك، والفرعي اللي بيدعمه، والمدفون","أول نقطة على خط عافيتك — اللي هتشوفه بيتحرّك محطة ورا محطة","أول ممارسة باسمك — مربوطة باتجاهك إنت، مش نصيحة عامة"],
    result:"«بطّلت أسأل ليه أنا تعبان — وبدأت أعرف إيه اللي شغّال فيّ.»" },
  { phase:"down", tone:"down", num:"المحطة ٣", title:"الميكانيكية الخفية",
    q:"ليه كل محاولة تغيير بترجّعني لنفس المكان؟",
    desc:"مقاومتك للتغيير مش ضعف إرادة — وراها نظام حماية ذكي. هنا بتفكّكه: التزام خفي، وافتراض كبير، وشرارة بتشعّله، وخمس فلاتر.",
    objective:"اللحظة اللي بتتحرّر فيها من جلد الذات: إنت مش فاشل في التغيير — إنت ناجح جدًا في حماية نفسك من خطر خلص زمانه من سنين.",
    points:["بتملا أربع خانات بإيدك: هدفك المعلن، والسلوك اللي بيناقضه، والالتزام الخفي تحته, والافتراض الكبير في الجذر","بتمسك شرارتك: المواقف اللي بتلمس الافتراض فتشعّل دفاعاتك فجأة","بتتعرّف على فلاترك الخمسة: العدسات اللي بتغيّر قراءتك للواقع تحت الضغط","وبتختبر الافتراض في موقف صغير آمن — وتشوف بعينك إن الخطر مش بيحصل"],
    result:"«بطّلت ألوم نفسي — وعرفت الماكينة: جذرها، وشرارتها، وأوجهها.»" },
  { phase:"down", tone:"down", num:"المحطة ٤", title:"مرآة السلوك",
    q:"جسمك بيعمل إيه في الثواني الأولى تحت الضغط؟",
    desc:"قبل ما تفكر، جسمك بيكون اتحرّك: اندفع، أو استنّى إشارة، أو سحب نفسه. الحركة دي ليها اسم — وليها معنى.",
    objective:"أول مرايا معرفة النفس — وبنبدأ من الأظهر: الفعل اللي بتشوفه بعينك كل يوم في شغلك.",
    points:["بتعيش موقف ضغط من واقعك وتراقب حركتك الأولى — قبل أي تسمية","بتطلع بترتيب أساليبك الثلاثة: المبادرة، وانتظار الإشارة، وإخلاء المساحة","بتشوف موقعك على الطيف: حركتك زايدة عن الموقف، أو متزنة، أو مُطفأة","وبتاخد ممارسة اتزان متفصّلة على موقعك إنت — مش وصفة عامة"],
    result:"«بقيت أشوف نفسي بتحرّك قبل ما أتحرّك — فبقى عندي اختيار.»" },
  { phase:"down", tone:"down", num:"المحطة ٥", title:"مرآة الانتباه",
    q:"نظرك بيروح فين أول ما تدخل أي موقف؟",
    desc:"جوّه كل واحد كشّاف بيوجّه نظره قبل وعيه: لجوّه، أو لبرّه, أو متأرجح بين قطبين. والكشّاف ده بيحكم قراراتك من غير ما تحس.",
    objective:"السلوك هو الفعل الظاهر — والانتباه هو الكشّاف اللي بيوجّهه. هنا بتعرف إنت بتشوف العالم منين.",
    points:["بتكتشف وجهة كشّافك: داخلي مثبّت على محور واحد، أو خارجي مش بيرجع, أو متأرجح مش بيستقر","بتشوف الخاصية اللي بتخصّ وجهتك — زي الإحساس الزائف بمعرفة نفسك، أو إنك مش عارف إنت واقف فين دلوقتي","بتربط: كشّافك بيخدم التزامك الخفي — بيمسح الدنيا على اللي يهمّه هو","وبتاخد ممارسة بتدرّبك تنقل الكشّاف بإرادتك"],
    result:"«عرفت عدستي — وبقيت أقدر أنقلها… بدل ما تنقلني هي.»" },
  { phase:"down", tone:"down", num:"المحطة ٦", title:"مرآة المشاعر",
    q:"الانفعال بيكمّل رحلته على قلبك… ولا بيتعطّل في السكة؟",
    desc:"الرحلة السليمة: الانفعال يوصل بحجمه، يتعاش، ويمضي. وعند كل واحد بتتعطّل في مكان مختلف — وهنا جزء كبير من الاحتراق.",
    objective:"بنفهم مشاعرك تحت ضغط الشغل: بتتمسك قبل ما توصل؟ بتخرج ومش بتمشي؟ ولا بتنقلب لحاجة تانية قبل ما تدركها؟",
    points:["بتتتبّع آخر انفعال عشته في شغلك: وصل بحجمه؟ خرج بحجم الموقف؟ قلبك رجع مفتوح بعده؟","بتكتشف مكان التعطّل عندك: الإمساك قبل الوصول، أو الاستيطان بعد الخروج, أو الانقلاب قبل الإدراك","بتقرأ بصمته في جسمك: الفك المشدود، والكتف، والمعدة, والأطراف الباردة","وبتاخد ممارسة بترجّع للانفعال مجراه الطبيعي"],
    result:"«فهمت مشاعري بتتعطّل فين — وبدأت أرجّع لها مجراها.»" },
  { phase:"down", tone:"down", num:"المحطة ٧", title:"مرآة النموذج الإدراكي",
    q:"المعلومة الجديدة بتروح فين جوّه دماغك؟",
    desc:"فيه عقل بيصبّها في إطار جاهز، وعقل بيولّد منها إطارًا جديدًا، وعقل بيعلّقها في ميزان لحد ما يفهمها. كل طريقة ليها قوتها — وفخّها.",
    objective:"الانتباه بينوّر والنموذج الإداراكي بيعالج. هنا بتعرف عقلك بينظّم العالم إزاي، وليه ساعات «بتسمع ومش بتعالج».",
    points:["بتجرّب بمعلومة غير متوقعة من واقع شغلك: عقلك عمل بيها إيه في أول ثانية؟","بتكتشف نموذجك: التنفيذ، أو الابتكار, أو التقييم — وترتيبهم عندك","بتشوف إزاي نموذجك بيحرس افتراضك الكبير — بيعدّل أو يستبعد أي حاجة بتناقضه","وبتتمرّن تطلّع المعلومة من إطارك وتعالجها بإطار تاني — وترجع لإطارك بثقة"],
    result:"«شفت إطاري — وبقيت أعرف أرخّيه وأرجع له… بإرادتي.»" },
  { phase:"down", tone:"down", num:"المحطة ٨", title:"مرآة الدوافع",
    q:"اللي بيحرّكك… حب ولا خوف لابس ثوب الإنجاز؟",
    desc:"قوى القلب الثلاث: الهمّة والعزيمة، والأنس والقرب، واليقين والبيان. ووقودك ممكن يكون شوق صافي بيمشّيك — أو خوف بيجرّيك.",
    objective:"نفس الشغل بالظبط ممكن يتعمل بوقودين مختلفين — والوقود هو الفرق بين إنك تشتعل… وإنك تحترق.",
    points:["بتكتشف قوّتك القلبية: إنت من أهل الفعل، ولا الاتصال, ولا الفهم؟","بتشخّص وقودك في لحظة فعل حقيقية: سير بالحب… ولا فرار من الخوف؟","بتمسك الملمح الخادع: الانطفاء اللي بيلبس ثوب الاتزان — والسؤال الفارز: هل تعرف إنت عايز إيه؟","وبتاخد ممارسة بتنقّي مصدر الدافع — من غير ما تقمعه"],
    result:"«عرفت وقودي — والفرق بين إني أمشي… وإني أجري هربًا.»" },
  { phase:"down", tone:"down", num:"المحطة ٩", title:"مرآة المعتقدات",
    q:"قيمتك معلّقة على إيه؟",
    desc:"فيه شرط خفي كل واحد علّق عليه قيمته: إنجاز لسه جاي، أو صلة قائمة بحد، أو جوهر جوّاه. والشرط ده هو نفسه الافتراض الكبير — بيتكشف هنا بالكامل.",
    objective:"قبل أي كشف، بنقف على أرض ثابتة: كرامتك سابقة على أي إنجاز وأي صلة وأي شرط. وعلى الأرض دي بنبصّ للشرط.",
    points:["بتكتشف شرطك: قيمة معلّقة على مثال في المستقبل، أو على صلة قائمة دلوقتي, أو على جوهر شايل جرحه","بتفرّق بين الشوق والشرط: الشوق بيهديك بفرح — الشرط بيحاسبك بثقل","بتلمّ الخيط: الافتراض الكبير اللي طلع في الميكانيكية… هو هو شرط قيمتك","وبتتمرّن تستقبل قيمتك في الحاضر — من غير ما تأجّلها لشرط"],
    result:"«عرفت شرطي — ولقيت تحتي أرض أقدم منه.»" },
  { phase:"bottom", tone:"bottom", num:"المحطة ١٠", title:"القاع — مرآة الجرح",
    q:"إيه اللي حصل زمان… ولسه شغّال فيك دلوقتي؟",
    desc:"أهدى محطة وأبطأها وأكترهم أمانًا. الجرح الفاعل النهارده — مش حكاية الماضي — والاتجاه المدفون اللي بيدفع التمن في صمت، ونوع احتراقك بالاسم.",
    objective:"أعمق نقطة في الرحلة. والمفاجأة إنها مش تقيلة — لأن الجرح بيتشاف على أرض الكرامة، مش على أرض النقص.",
    points:["بتمسك الجرح من أثره الفاعل: رد الفعل الزايد عن حجم الموقف — جاي منين؟","بتقابل اتجاهك المدفون: اللي اتدفن من بدري، ولسه بيضغط على اتجاهك الرئيسي من ورا الستار","بتعرف نوع احتراقك من ثلاثة: محترق (اتجاهك شغّال بالخوف)، أو مجوّع (بيئتك مش بتلبّيه), أو مكبوت (اتجاه مدفون بيصرخ في صمت)","وبتبدأ تستعيد المدفون بجرعات صغيرة آمنة — فالقاع يبقى أول الصعود، مش آخر النزول"],
    result:"«قابلت الجزء اللي كنت دافنه — وللمرة الأولى سمعت صوته من غير خوف.»" },
  { phase:"up", tone:"up", num:"المحطة ١١", title:"التجلّي — البصمة والمسار",
    q:"مين إنت… بالظبط؟",
    desc:"الخيوط اللي اتجمعت محطة ورا محطة بتتلمّ في لحظة واحدة: بصمتك من الـ ٢٧ بتتقال لك بالاسم — ومعاها طريقك من التسعة.",
    objective:"الإعلان بييجي هنا عمدًا: بعد ما عرفت نفسك بُعدًا بُعدًا — فييجي تتويجًا لرحلة معرفة، مش نتيجة استبيان بتتحط بيها في خانة.",
    points:["بصمتك: تقاطع اتجاه طاقتك مع طريقة قلبك — نسختك من الـ ٢٧، بملامح عشتها بنفسك","الكشف الكبير: البصمة دي هي نفسها الطريقة اللي وصّلتك ووقفت بيك — وكل اللي فات كان أوجه ليها","مسارك من التسعة — بأسماء أصيلة من تراث عميق، وكل مسار منهجية كاملة مش شعار","بتدخل المسار من مكانك الحالي بالظبط — والممارسات اللي اتجمعت معاك بتترتب في خطة"],
    result:"«عرفت بصمتي بدقة — ومسكت طريقي باسمه.»" },
  { phase:"up", tone:"up", num:"المحطة ١٢", title:"الصعود — الاتزان والإغلاق",
    q:"إزاي تشتعل… من غير ما تحترق؟",
    desc:"مش بنطفي النار — بننقّي وقودها. نفس الطاقة بترجع تشتغل بالحب بدل الخوف، ومعاها خطة وبوصلة يومية وتقريرك الكامل.",
    objective:"آخر الرحلة مش نهايتها: بناء حياة مابتحترقش بسهولة — وباب تاني بيفتح: كيانك اللي بيتنفّس من نَفَسك.",
    points:["الترقية مش القمع: الدافع بيفضل موجود — اللي بيتغيّر هو المصدر اللي بيحرّكه","خطة أول ٣٠ يوم تبدأ من اليوم اللي بعد الرحلة، وبوصلة الطيف اليومية: زيادة؟ انطفاء؟ ارجع للاتزان","الباب التاني: كيانك — فريقك أو شركتك أو شغلك — بياخد من حالتك أكتر مما بياخد من خططك","الميثاق الذاتي وتقريرك الكامل — وشبكة ورفيق جيب مكمّلين معاك بعد الإغلاق"],
    result:"«طلعت واحد تاني — ومش لوحدي.»" }
];

STATIONS.en = [
  { phase:"pre", tone:"pre", num:"Station 1", title:"The Welcome",
    q:"Am I in safe hands?",
    desc:"Before any step, we establish the safety without which there's no honesty — and without honesty, no recovery: full confidentiality, a pseudonym, and a pocket companion with you from day one.",
    objective:"The biggest fear for anyone entering a journey like this: \"if I open myself up, will you heal me or leave me?\" This station settles that question before the journey even begins.",
    points:["A personal welcome in the coach's own voice — not an automated message","A pact of confidentiality: you register under a pseudonym, and your individual details are seen by no one","The pocket companion activates from day one — not a tool that arrives at the end","A gentle deep-listening instrument in small doses — it prepares your first map while you're at ease"],
    result:"\"I'm in a safe place — and someone who understands me is waiting for me.\"" },
  { phase:"down", tone:"down", num:"Station 2", title:"The Acknowledgment",
    q:"What's running inside me?",
    desc:"The difference between fatigue a break can cure and burnout that returns after it, the three layers you're losing from, and your energy's direction in its full order.",
    objective:"We begin from the pain — but we ask it the right question: not \"why am I tired?\" but \"what is running inside me?\"",
    points:["The decisive difference between exhaustion and burnout — and why every previous remedy didn't work","The three layers of depletion: energy, presence, and meaning — and which one you're losing from","Your three energy directions: the primary that takes your energy, the secondary that supports it, and the buried one","The first point on your wellbeing line — which you'll watch move station after station","Your first practice, in your name — tied to your own direction, not generic advice"],
    result:"\"I stopped asking why I'm tired — and began to know what's running inside me.\"" },
  { phase:"down", tone:"down", num:"Station 3", title:"The Hidden Mechanism",
    q:"Why does every attempt at change return me to the same place?",
    desc:"Your resistance to change isn't weak will — behind it is an intelligent protection system. Here you take it apart: a hidden commitment, a big assumption, a spark that ignites it, and five filters.",
    objective:"The moment you free yourself from self-blame: you're not failing at change — you're remarkably successful at protecting yourself from a danger that ended years ago.",
    points:["You fill four boxes with your own hands: your stated goal, the behavior that contradicts it, the hidden commitment beneath it, and the big assumption at the root","You grasp your spark: the situations that touch the assumption and suddenly ignite your defenses","You meet your five filters: the lenses that change how you read reality under pressure","And you test the assumption in a small, safe situation — and see with your own eyes that the danger doesn't come"],
    result:"\"I stopped blaming myself — and I understood the machine: its root, its spark, and its faces.\"" },
  { phase:"down", tone:"down", num:"Station 4", title:"The Mirror of Behavior",
    q:"What does your body do in the first seconds under pressure?",
    desc:"Before you think, your body has already moved: it surged forward, waited for a signal, or pulled itself back. That movement has a name — and a meaning.",
    objective:"The first of the self-knowledge mirrors — and we begin from the most visible: the action you watch yourself take every day in your work.",
    points:["You live a pressure situation from your own reality and observe your first movement — before any label","You come away with the order of your three patterns: initiating, awaiting the signal, and clearing the space","You see your place on the spectrum: your movement excessive for the situation, balanced, or switched off","And you take a balancing practice tailored to your own place — not a generic prescription"],
    result:"\"I began to see myself move before I move — so now I have a choice.\"" },
  { phase:"down", tone:"down", num:"Station 5", title:"The Mirror of Attention",
    q:"Where does your gaze go the moment you enter any situation?",
    desc:"Inside each of us is a searchlight that directs our gaze before our awareness: inward, outward, or oscillating between two poles. And that searchlight governs your decisions without you feeling it.",
    objective:"Behavior is the visible act — attention is the searchlight that directs it. Here you learn where you see the world from.",
    points:["You discover your searchlight's direction: inward, fixed on a single axis; outward, never returning; or oscillating, never settling","You see the trait that belongs to your direction — like a false sense of knowing yourself, or not knowing where you actually stand right now","You connect the thread: your searchlight serves your hidden commitment — it scans the world for what matters to it","And you take a practice that trains you to move the searchlight at will"],
    result:"\"I knew my lens — and became able to move it… instead of it moving me.\"" },
  { phase:"down", tone:"down", num:"Station 6", title:"The Mirror of Emotion",
    q:"Does the feeling complete its journey through your heart… or stall along the way?",
    desc:"The healthy journey: a feeling arrives at its true size, is lived, and moves on. In each of us it stalls in a different place — and here lies a large part of burnout.",
    objective:"We understand your emotions under the pressure of work: do they get caught before arriving? Come out and not leave? Or flip into something else before you grasp them?",
    points:["You trace the last feeling you lived at work: did it arrive at its true size? Leave at the size of the situation? Did your heart return open afterward?","You discover where it stalls for you: holding before arrival, settling in after departure, or flipping before recognition","You read its signature in your body: the clenched jaw, the shoulder, the stomach, the cold extremities","And you take a practice that returns the feeling to its natural course"],
    result:"\"I understood where my feelings stall — and began to return them to their course.\"" },
  { phase:"down", tone:"down", num:"Station 7", title:"The Mirror of the Cognitive Model",
    q:"Where does new information go inside your mind?",
    desc:"There's a mind that pours it into a ready-made frame, a mind that generates a new frame from it, and a mind that hangs it in the balance until it understands it. Each way has its strength — and its trap.",
    objective:"Attention illuminates; the cognitive model processes. Here you learn how your mind organizes the world, and why you sometimes \"hear without processing.\"",
    points:["You experiment with an unexpected piece of information from your real work: what did your mind do with it in the first second?","You discover your model: execution, innovation, or evaluation — and their order in you","You see how your model guards your big assumption — adjusting or discarding anything that contradicts it","And you train to lift information out of your frame and process it with another — then return to your frame with confidence"],
    result:"\"I saw my frame — and became able to loosen it and return to it… at will.\"" },
  { phase:"down", tone:"down", num:"Station 8", title:"The Mirror of Motivation",
    q:"What moves you… love, or fear dressed in the clothing of achievement?",
    desc:"The three forces of the heart: drive and resolve, warmth and closeness, and certainty and clarity. And your fuel may be a pure longing that carries you — or a fear that drives you.",
    objective:"The exact same work can be done on two different fuels — and the fuel is the difference between burning bright… and burning out.",
    points:["You discover your heart-force: are you of action, of connection, or of understanding?","You diagnose your fuel in a real moment of action: moving from love… or fleeing from fear?","You grasp the deceptive trait: the switching-off that wears the clothing of balance — and the decisive question: do you know what you want?","And you take a practice that purifies the source of the drive — without suppressing it"],
    result:"\"I knew my fuel — and the difference between moving… and running away.\"" },
  { phase:"down", tone:"down", num:"Station 9", title:"The Mirror of Beliefs",
    q:"What is your worth hanging on?",
    desc:"There's a hidden condition each of us hung our worth upon: an achievement still to come, a bond with someone, or an essence within. And that condition is the very same big assumption — fully revealed here.",
    objective:"Before any revelation, we stand on solid ground: your dignity precedes any achievement, any bond, any condition. And from that ground, we look at the condition.",
    points:["You discover your condition: worth hung on an ideal in the future, on a bond present now, or on an essence carrying its wound","You distinguish longing from condition: longing guides you with joy — the condition holds you to account with weight","You gather the thread: the big assumption that emerged in the Mechanism… is the very condition on your worth","And you train to receive your worth in the present — without postponing it to a condition"],
    result:"\"I knew my condition — and found beneath me a ground older than it.\"" },
  { phase:"bottom", tone:"bottom", num:"Station 10", title:"The Bottom — The Mirror of the Wound",
    q:"What happened long ago… and is still working in you now?",
    desc:"The quietest, slowest, safest station. The wound active today — not the story of the past — the buried direction quietly paying the price, and the type of your burnout, by name.",
    objective:"The deepest point in the journey. And the surprise is that it isn't heavy — because the wound is seen on the ground of dignity, not on the ground of lack.",
    points:["You grasp the wound through its active trace: the reaction larger than the situation — where does it come from?","You meet your buried direction: the one buried early, still pressing on your primary direction from behind the curtain","You learn your type of burnout from three: burned-out (your direction running on fear), starved (your environment not meeting it), or suppressed (a buried direction crying out in silence)","And you begin to reclaim the buried part in small, safe doses — so the bottom becomes the start of the ascent, not the end of the descent"],
    result:"\"I met the part I'd been burying — and for the first time heard its voice without fear.\"" },
  { phase:"up", tone:"up", num:"Station 11", title:"The Emergence — Signature and Path",
    q:"Who are you… exactly?",
    desc:"The threads gathered station after station come together in a single moment: your Signature out of the 27 is named for you — and with it, your path out of the nine.",
    objective:"The announcement comes here deliberately: after you've come to know yourself dimension by dimension — so it arrives as the crowning of a journey of knowledge, not the result of a questionnaire that drops you into a box.",
    points:["Your Signature: the intersection of your energy's direction with your heart's way — your version of the 27, with features you lived yourself","The great revelation: this Signature is the very way that carried you and then stalled you — and everything before was a facet of it","Your path out of the nine — with authentic names from a deep heritage, each path a complete methodology, not a slogan","You enter the path from exactly where you stand now — and the practices gathered along the way arrange into a plan"],
    result:"\"I knew my Signature precisely — and grasped my path by its name.\"" },
  { phase:"up", tone:"up", num:"Station 12", title:"The Ascent — Balance and Closing",
    q:"How do you burn bright… without burning out?",
    desc:"We don't put the fire out — we purify its fuel. The same energy returns to work from love instead of fear, and with it a plan, a daily compass, and your full report.",
    objective:"The end of the journey isn't its ending: building a life that doesn't burn out easily — and another door opens: the entity that breathes from your breath.",
    points:["Elevation, not suppression: the drive remains — what changes is the source that moves it","A first-30-days plan starting the day after the journey, and the daily spectrum compass: too much? switched off? return to balance","The second door: your entity — your team, your company, your work — takes more from your state than from your plans","Your self-charter and your full report — with a network and pocket companion continuing with you after the close"],
    result:"\"I came out a different person — and not alone.\"" }
];

/* =========================================================
   ENGINE — applies content, swaps direction + fonts, rebuilds journey
   ========================================================= */
let CURRENT_LANG = "ar";

function applyText(lang){
  const dict = T[lang];
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const val = dict[key];
    if(val === undefined) return;
    const attr = el.getAttribute('data-i18n-attr');
    if(attr){ el.setAttribute(attr, val); }
    else { el.innerHTML = val; }
  });
  // <title> + meta description
  if(dict["meta.title"]) document.title = dict["meta.title"];
}

function buildJourney(lang){
  const grid = document.getElementById('flipGrid');
  if(!grid) return;
  grid.innerHTML = "";
  let cardIdx = 0;
  PHASES[lang].forEach(ph=>{
    const head = document.createElement('div');
    head.className = `phase-head ${ph.tone}`;
    head.innerHTML = `<span class="ph-label">${ph.label}</span><span class="ph-line"></span><span class="ph-note">${ph.note}</span>`;
    grid.appendChild(head);
    const phaseShort = ph.label.split(' — ')[0];

    STATIONS[lang].filter(s=>s.phase===ph.key).forEach(st=>{
      const idx = cardIdx++;
      const card = document.createElement('div');
      card.className = 'flip';
      card.dataset.id = idx;
      card.dataset.tone = st.tone;
      card.innerHTML = `
        <div class="flip-inner">
          <div class="face front">
            <div class="top-row"><span class="st-num">${st.num}</span><span class="st-phase">${phaseShort}</span></div>
            <h3>${st.title}</h3>
            <div class="st-q">${st.q}</div>
            <div class="fdesc">${st.desc}</div>
            <div class="explore">${T[lang]["ui.explore"]}</div>
          </div>
          <div class="face back">
            <div class="back-head"><span class="st-num">${st.num}</span><h3>${st.title}</h3></div>
            <div class="objective">${st.objective}</div>
            <div class="b-label">${T[lang]["ui.whatHappens"]}</div>
            <ul>${st.points.map(p=>`<li>${p}</li>`).join('')}</ul>
            <div class="result">
              <div class="rlabel">${T[lang]["ui.youLeave"]}</div>
              <p>${st.result}</p>
            </div>
            <div class="close">${T[lang]["ui.close"]}</div>
          </div>
        </div>`;
      card.addEventListener('click',()=>toggleCard(idx,card));
      grid.appendChild(card);
    });
  });
  openId = null;
}

let openId = null;
function toggleCard(id,card){
  const grid = document.getElementById('flipGrid');
  const cards=[...grid.querySelectorAll('.flip')];
  const heads=[...grid.querySelectorAll('.phase-head')];
  if(openId===id){
    openId=null;
    cards.forEach(c=>c.classList.remove('open','dim'));
    heads.forEach(h=>h.classList.remove('dim'));
    return;
  }
  openId=id;
  cards.forEach(c=>{
    const isThis = +c.dataset.id===id;
    c.classList.toggle('open',isThis);
    c.classList.toggle('dim',!isThis);
  });
  heads.forEach(h=>h.classList.add('dim'));
  setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'center'}),120);
}

function setLang(lang){
  if(!T[lang]) return;
  CURRENT_LANG = lang;
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  applyText(lang);
  buildJourney(lang);
  // toggle active button
  const ar = document.getElementById('lang-ar');
  const en = document.getElementById('lang-en');
  if(ar && en){ ar.classList.toggle('active', lang==='ar'); en.classList.toggle('active', lang==='en'); }
  // remember choice (safe — ignored where storage is blocked)
  try{ localStorage.setItem('reignite_lang', lang); }catch(e){}
}

/* boot */
function initReignite(){
  let saved = 'ar';
  try{ saved = localStorage.getItem('reignite_lang') || 'ar'; }catch(e){}
  setLang(saved);

  // scroll progress + sticky CTA
  const prog=document.getElementById('progress');
  const sticky=document.getElementById('sticky');
  window.addEventListener('scroll',()=>{
    const h=document.documentElement.scrollHeight-window.innerHeight;
    if(prog) prog.style.width=(window.scrollY/h*100)+'%';
    if(sticky) sticky.classList.toggle('show', window.scrollY>760 && (window.innerHeight+window.scrollY < document.documentElement.scrollHeight-700));
  });

  // reveal on scroll
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);} });
  },{threshold:.12});
  document.querySelectorAll('.rv').forEach(el=>io.observe(el));
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initReignite);
  } else {
    initReignite();
  }
}

/* expose for inline onclick + node export */
if(typeof window !== 'undefined'){ window.setLang = setLang; }
if(typeof module !== 'undefined'){ module.exports = { T, PHASES, STATIONS }; }
