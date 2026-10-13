# -*- coding: utf-8 -*-
"""صيغة المؤنث لـ«ميزان المتطوع» (نسخة من three-axes/v2/fem/fem.py، متعدّلة للمتطوعين، ومن غير ما تلمس الأصل).

الفكرة:
  • نص المذكر هو اللي في الدوكس، وهو المرجع زي ما هو.
  • النسخة المؤنثة لكل جملة بتختلف مكتوبة هنا جملة جملة، ومراجَعة بإيد:
        fem/items.fem.json  ← الأسئلة ونصوص المقياس (من engine/items.json)
        fem/texts.fem.json  ← نصوص التقرير (من report/texts.json)
  • والجمل اللي اتراجعت وما بتتغيرش (زي «بلاقي نفسي بقارن مكاني…») مكتوبة في:
        fem/items.neutral.json و fem/texts.neutral.json
  • build_items.py و extract_texts.py بيحطوا الخريطة جوه الملف المقفول (مفتاح fem) وبيدخلوها في الهاش،
    وبيرفضوا لو فيه جملة جديدة أو متعدّلة في الدوك لسه ما اتراجعتش (لا ليها مؤنث، ولا متعلّمة إنها مش بتتغير).

الاستعمال:
  python3 fem.py review    ← بيكتب fem/REVIEW.md: كل جملة اتغيرت، والكلمات اللي اتغيرت فيها، وعدد كل تغيير
  python3 fem.py pending   ← الجمل اللي لسه ما اتراجعتش، ومعاها اقتراح آلي (لازم يتراجع بإيد قبل ما يتحط)
"""
import json, os, re, sys, difflib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.dirname(HERE)  # = mizan-scale/

# كلمات لازم تفضل زي ما هي في النسختين (أسامي المسارات والمساحات، و«الناس»)
PROTECTED = ['الحفظ', 'الحيوية', 'الانتماء', 'البدن', 'الموارد والبيئة', 'التنظيم الذاتي', 'الاشتعال', 'الجذب',
             'الاتحاد', 'قراءة الحقل', 'المكانة والدور', 'النفع والمسؤولية', 'الناس', '[', ']', '«', '»', '—']


def _p(name):
    return os.path.join(HERE, name)


def load(kind):
    fem = json.load(open(_p(kind + '.fem.json'), encoding='utf-8'))
    neutral = json.load(open(_p(kind + '.neutral.json'), encoding='utf-8')) if os.path.exists(_p(kind + '.neutral.json')) else []
    return fem, neutral


# ───────── الجمل اللي العميل بيشوفها ─────────
def collect_items(body):
    """كل جملة المتطوع بيشوفها في «ميزان المتطوع»."""
    out = []
    for key in ('station1', 'station2', 'station7'):
        for it in body[key]:
            out.append(it['text'])
            out += [o['text'] for o in it['options']]
            if it.get('skip'):
                out.append(it['skip'])
    out += [i['text'] for i in body['freq'] if i.get('text')]
    out += [i['text'] for i in body['vcycle']]
    out += [body['vnow']['text']] + [o['text'] for o in body['vnow']['options']]
    for b in body['bipolar']:
        out += [b['text'], b['a'], b['b']]
    for r in body['adaptive']['rows']:
        out += r['slots']
    out += body['adaptive']['general']['slots']
    c = body['client']
    out += [c['welcome']['title']] + c['welcome']['paragraphs']
    for q in c['start'].values():
        out += [q['question']] + [o['text'] for o in q['options']]
    p = c['start']['period']
    out += [p['followup']['question']] + p['followup']['options'] + [p['thanks']]
    out += c['closing']
    for st in c['stations']:
        out += [st['title']] + list(st.get('intro') or []) + ([st['transition']] if st.get('transition') else [])
        if st.get('bipolar'):
            out += [st['bipolar']['title'], st['bipolar']['intro']] + st['bipolar']['scale']
    return list(dict.fromkeys(x for x in out if x))


def collect_texts(texts):
    out = []
    for sec, v in texts.items():
        if sec.startswith('عدد الكلمات'):
            continue
        for h, s in v.items():
            out += s['paras'] + s['bullets'] + ([s['insight']] if s.get('insight') else [])
            for t in s.get('tables', []):
                for r in t:
                    out += r
    return list(dict.fromkeys(x for x in out if x))


# ───────── الربط والفحص ─────────
def check_pair(m, f):
    probs = []
    for w in PROTECTED:
        if m.count(w) != f.count(w):
            probs.append(f'«{w}» عدده اتغير')
    if re.findall(r'\[[^\]]+\]', m) != re.findall(r'\[[^\]]+\]', f):
        probs.append('الأقواس [..] اتغيرت')
    if (' — ' in m) and m.split(' — ')[0] != f.split(' — ')[0] and not re.match(r'^(مش مرتاح|lean_both|البدن|الموارد|التنظيم|الاشتعال|الجذب|الاتحاد|قراءة|المكانة|النفع)', m):
        probs.append('أول جزء قبل « — » اتغير')
    return probs


def attach(strings, kind, strict=True):
    """بيرجّع {جملة المذكر: جملة المؤنث} للجمل الموجودة بس. ولو فيه جملة ما اتراجعتش وstrict، بيوقف."""
    fem, neutral = load(kind)
    ns = set(neutral)
    cur = set(strings)
    out, unreviewed, bad = {}, [], []
    for s in strings:
        if s in fem:
            out[s] = fem[s]
            for pr in check_pair(s, fem[s]):
                bad.append(f'{pr}: {s[:60]}')
        elif s not in ns:
            unreviewed.append(s)
    stale = [k for k in fem if k not in cur]
    if stale:
        print(f'[fem/{kind}] {len(stale)} جملة مؤنث ملهاش أصل في الملف دلوقتي (اتعدّلت أو اتشالت من الدوك):', file=sys.stderr)
        for k in stale[:10]:
            print('   - ' + k[:80], file=sys.stderr)
    if bad:
        sys.exit(f'[fem/{kind}] مشاكل في النسخة المؤنثة:\n   ' + '\n   '.join(bad))
    if unreviewed:
        msg = f'[fem/{kind}] {len(unreviewed)} جملة ما اتراجعتش لصيغة المؤنث. شغّل: python3 fem/fem.py pending\n' + \
              '\n'.join('   - ' + s[:90] for s in unreviewed[:15])
        if strict:
            sys.exit(msg)
        print(msg, file=sys.stderr)
    return out


# ───────── اقتراح آلي (للمسودة بس، ولازم مراجعة) ─────────
SUFFIX_KI = re.compile(r'(?<=[اوي])ك(?=$|[\s،.؟:!»)])')
WORDS = {'إنت': 'إنتي', 'وإنت': 'وإنتي', 'كنت': 'كنتي', 'قلت': 'قلتي', 'اخترت': 'اخترتي', 'حسيت': 'حسيتي',
         'اختار': 'اختاري', 'خد': 'خدي', 'جاوب': 'جاوبي', 'فكّر': 'فكّري', 'شوف': 'شوفي', 'ابدأ': 'ابدأي', 'اسأل': 'اسألي',
         'كمّل': 'كمّلي', 'اكتب': 'اكتبي', 'قول': 'قولي', 'اعمل': 'اعملي', 'لاحظ': 'لاحظي', 'جرّب': 'جرّبي', 'استنى': 'استني',
         'عايز': 'عايزة', 'محتاج': 'محتاجة', 'تعبان': 'تعبانة', 'مرتاح': 'مرتاحة', 'قادر': 'قادرة', 'عارف': 'عارفة',
         'شايف': 'شايفة', 'شايل': 'شايلة', 'حاسس': 'حاسة', 'مشغول': 'مشغولة', 'قلقان': 'قلقانة', 'متضايق': 'متضايقة'}


def suggest(s):
    t = SUFFIX_KI.sub('كي', s)
    toks = re.split(r'(\s+|[،.؟:!«»()])', t)
    return ''.join(WORDS.get(x, x) for x in toks)


# ───────── المراجعة ─────────
def word_changes(m, f):
    a, b = m.split(), f.split()
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op != 'equal':
            out.append((' '.join(a[i1:i2]), ' '.join(b[j1:j2])))
    return out


def _strip(w):
    return re.sub(r'[،.؟:!«»()]', '', w)


def review():
    items = json.load(open(os.path.join(V2, 'engine', 'items.json'), encoding='utf-8'))
    texts = json.load(open(os.path.join(V2, 'report', 'texts.json'), encoding='utf-8'))['texts']
    L = ['# مراجعة صيغة المؤنث', '',
         'الملف ده بيتولّد من `fem/fem.py review`. فيه كل جملة اتغيرت، والكلمات اللي اتغيرت فيها، وفي الآخر عدد كل تغيير.', '']
    counter = collections.Counter()
    for kind, strings in (('items', collect_items(items)), ('texts', collect_texts(texts))):
        fem, neutral = load(kind)
        title = 'الأسئلة ونصوص المقياس' if kind == 'items' else 'نصوص التقرير'
        changed = [s for s in strings if s in fem]
        L += [f'## {title}', '', f'{len(strings)} جملة: {len(changed)} اتغيرت، و{len([s for s in strings if s in set(neutral)])} زي ما هي.', '']
        for s in changed:
            ch = word_changes(s, fem[s])
            for x, y in ch:
                counter[(_strip(x), _strip(y))] += 1
            L.append('- ' + ' · '.join(f'{x} ← {y}' for x, y in ch) + f'  \n  «{fem[s]}»')
        L.append('')
    L += ['## كل الكلمات اللي اتغيرت (وعدد مرات كل تغيير)', '']
    for (x, y), n in sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])):
        L.append(f'- {x} ← {y} ({n})')
    open(_p('REVIEW.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'fem/REVIEW.md · {len(counter)} تغيير مختلف')


def pending():
    items = json.load(open(os.path.join(V2, 'engine', 'items.json'), encoding='utf-8'))
    texts = json.load(open(os.path.join(V2, 'report', 'texts.json'), encoding='utf-8'))['texts']
    for kind, strings in (('items', collect_items(items)), ('texts', collect_texts(texts))):
        fem, neutral = load(kind)
        ns = set(neutral)
        for s in strings:
            if s not in fem and s not in ns:
                print(f'[{kind}] {s}\n   اقتراح: {suggest(s)}')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'review'
    {'review': review, 'pending': pending}[cmd]()
