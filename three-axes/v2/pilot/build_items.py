# -*- coding: utf-8 -*-
"""يولّد ملفات الأسئلة من دوك «مقياس المحاور ٢ — الأسئلة».

الاستعمال:
    python3 build_items.py doc.json                  ← بنفس رقم النسخة المقفولة (بيرفض لو حاجة اتغيّرت)
    python3 build_items.py doc.json --version 2.1    ← لما نص أو تصنيف يتغيّر

doc.json = ناتج documents.get للدوك (Google Docs API، أو أداة read_doc) زي ما هو،
أو المفتاح "content" بتاعه.

بيكتب ٣ ملفات:
  engine/items.json  ← مصدر المحرك: كل عبارة وموقف بتصنيفه الداخلي كامل، ورقم نسخة الأسئلة.
                       والنسخة متقفلة في engine/questions.lock.json.
  pilot/items.json   ← للعرض بس. فيه نصوص العميل، ومفيش أي سطر داخلي،
                       ولا اسم محور ولا بُعد. المحاور مرموزة بحروف: H / V / A.
  checks/items.json  ← اللي سكريبت الفحص (checks/check_items.py) بيقراه.

النصوص الثابتة (الترحيب، وسؤال الفترة، وتعليمات كل محطة، ونصوص الانتقال) جاية من تاب «نسخة العميل».
العبارات والمواقف وتصنيفها جاية من التاب الأساسي، والسكريبت بيتأكد إن الاتنين متطابقين.
"""
import json, re, sys, os, hashlib
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
AXIS = {'الحفظ': 'H', 'الحيوية': 'V', 'الانتماء': 'A'}
AXIS_NAME = {v: k for k, v in AXIS.items()}
# الأبعاد التسعة بالترتيب، وكل بُعد تبع أنهي محور. الـ id بيتكتب في ملف المحرك.
DIMS = [('H1', 'البدن', 'H'), ('H2', 'الموارد والبيئة', 'H'), ('H3', 'التنظيم الذاتي', 'H'),
        ('V1', 'الاشتعال', 'V'), ('V2', 'الجذب', 'V'), ('V3', 'الاتحاد', 'V'),
        ('A1', 'قراءة الحقل والتراحم', 'A'), ('A2', 'المكانة والدور', 'A'), ('A3', 'النفع والمسؤولية', 'A')]
DIM_BY_NAME = {n: (i, a) for i, n, a in DIMS}
ENGINE_DIR = os.path.join(HERE, '..', 'engine')
LOCK = os.path.join(ENGINE_DIR, 'questions.lock.json')
FREQ = ['عمري', 'نادرًا', 'أحيانًا', 'كتير', 'دايمًا']


def load(path):
    d = json.load(open(path, encoding='utf-8'))
    return d.get('content', d)


def pt(p):
    return ''.join(r.get('textRun', {}).get('content', '') for r in p['elements']).rstrip('\n')


def size(p):
    for r in p['elements']:
        if 'textRun' in r:
            return r['textRun'].get('textStyle', {}).get('fontSize', {}).get('magnitude')
    return None


def seq_of(tab):
    out = []
    for e in tab['documentTab']['body']['content']:
        if 'paragraph' in e:
            p = e['paragraph']
            out.append((p['paragraphStyle'].get('namedStyleType'), pt(p), size(p)))
        elif 'table' in e:
            rows = [[' / '.join(pt(x['paragraph']).strip() for x in c['content'] if 'paragraph' in x)
                     for c in r['tableCells']] for r in e['table']['tableRows']]
            out.append(('TABLE', rows, None))
    return out


def sections(seq):
    secs, cur = {}, None
    for st, t, sz in seq:
        if st == 'HEADING_2':
            cur = t
            secs[cur] = []
        elif cur is not None:
            secs[cur].append((st, t, sz))
    return secs


def h3_items(lst, prefix):
    items, i = [], 0
    while i < len(lst):
        st, t, _ = lst[i]
        if st == 'HEADING_3' and t.startswith(prefix):
            body = []
            i += 1
            while i < len(lst) and lst[i][0] not in ('HEADING_3', 'HEADING_2'):
                if lst[i][0] != 'TABLE' and lst[i][1].strip():
                    body.append(lst[i][1])
                i += 1
            items.append({'h': t, 'body': body})
        else:
            i += 1
    return items


def num(h):
    return int(re.search(r'([٠-٩]+)$', h).group(1).translate(AR))


def note_of(body):
    return next((x for x in body if x.startswith('داخلي')), '')


def meta(note):
    m = dict(re.findall(r'(البُعد|المحور|النوع|الإجابة المرغوبة): ([^·]+)', note))
    return {'dim': (m.get('البُعد') or m.get('المحور', '')).strip(),
            'type': m.get('النوع', '').strip(),
            'desirable': m.get('الإجابة المرغوبة', '').strip()}


def triad_axes(note):
    """«داخلي — 1 = الحفظ / البدن، 2 = …، 3 = …» → [(axis, dim) ×3]"""
    out = []
    for k in '123':
        m = re.search(k + r' = (الحفظ|الحيوية|الانتماء) / ([^،·]+)', note)
        assert m, (k, note[:80])
        out.append((m.group(1), m.group(2).strip()))
    return out


def classify(station, n, text, mm):
    """تصنيف عبارة تكرارية (المحطات ٣ لـ٧) لملف المحرك."""
    ty = mm['type']
    out = {'id': f's{station}n{n}', 'station': station, 'n': n, 'text': text, 'typeLabel': ty, 'desirable': mm['desirable']}
    dim = mm['dim']
    if dim in DIM_BY_NAME:
        out['dim'], out['axis'] = DIM_BY_NAME[dim]
    elif dim in AXIS:
        out['axis'] = AXIS[dim]
    if ty == 'إفراط':
        out['kind'] = 'excess'
    elif ty.startswith('تفريط'):
        out['kind'] = 'deficit'
        out['face'] = re.match(r'تفريط \((.+)\)', ty).group(1)
    elif ty == 'الفطرة: ترك بعد الفعل':
        out['kind'] = 'leave'
    elif ty == 'الفطرة: أخذ من غير ذنب':
        out['kind'] = 'take'
    elif ty == 'صدق':
        out['kind'] = 'validity'
    elif ty.startswith('دائرة'):
        out['kind'] = 'cycle'
        out['cycle'] = re.match(r'دائرة: ([^(]+)', ty).group(1).strip()
    elif ty.startswith('خوف وقودًا'):
        out['kind'] = 'fear'
    elif ty.startswith('تجمّد'):
        out['kind'] = 'freeze'
    elif ty.startswith('استبدال متكيّف'):
        out['kind'] = 'adaptive'
        out['slot'] = int(re.search(r'مكان ([٠-٩])', ty).group(1).translate(AR))
    elif ty.startswith('انطفاء'):
        out['kind'] = 'depletion'
    else:
        raise SystemExit(f'نوع مش معروف: s{station}n{n} «{ty}»')
    return out


def strip_num(t):
    return re.sub(r'^[٠-٩]+\.\s*', '', t)


def strip_opt(t):
    return re.sub(r'^[أبج]\.\s*', '', t)


def main(path, version=None):
    doc = load(path)
    tabs = {t['tabProperties']['title']: t for t in doc['tabs']}
    main_tab = doc['tabs'][0]
    client_tab = tabs['نسخة العميل']
    M = sections(seq_of(main_tab))
    C_seq = seq_of(client_tab)
    C = sections(C_seq)

    # ───────── التاب الأساسي: العبارات والمواقف وتصنيفها ─────────
    s1 = h3_items(M['٣. المحطة الأولى: أيامك وهي ماشية عادي'], 'الموقف')
    s2 = h3_items(M['٥. المحطة التانية: الناس وطرقهم'], 'المحطة ٢')
    names = {3: '٦. المحطة التالتة: تفاصيل أيامك (١)', 4: '٧. المحطة الرابعة: تفاصيل أيامك (٢)',
             5: '٨. المحطة الخامسة: تفاصيل أيامك (٣)', 6: '٩. المحطة السادسة: الموجات',
             7: '١٠. المحطة السابعة: لما الضغط يزيد'}
    freq = {k: h3_items(M[v], 'المحطة') for k, v in names.items()}
    s7_table = next(t for st, t, _ in M[names[7]] if st == 'TABLE')

    # ───────── تاب العميل: النصوص الثابتة ─────────
    welcome = []
    for st, t, sz in C_seq:
        if st == 'HEADING_2':
            break
        if st == 'NORMAL_TEXT' and t.strip():
            welcome.append(t)
    title = welcome.pop(0)  # «أهلًا بيك»
    # التجربة: المشارك ما بيشوفش تقرير، فالسطر اللي بيوعد بتقرير بيتشال.
    welcome_pilot = [w for w in welcome if 'تقرير' not in w]

    pre = [t for st, t, sz in C['قبل ما نبدأ'] if t.strip()]
    period = {
        'question': pre[0],
        'options': [{'id': f'p{i+1}', 'text': x.lstrip('☐ ').strip()} for i, x in enumerate(t for t in pre if t.startswith('☐'))],
    }
    period['options'][-1]['none'] = True
    fu = next(t for t in pre if '(شوية، متوسط، كتير)' in t)
    period['followup'] = {'question': fu.replace(' (شوية، متوسط، كتير)', ''), 'options': ['شوية', 'متوسط', 'كتير']}
    period['thanks'] = pre[-1]

    def client_station(title_prefix):
        key = next(k for k in C if k.startswith(title_prefix))
        lst = C[key]
        intro, outro, items_seen, bip = [], None, False, {'title': None, 'intro': None}
        in_bip = False
        for st, t, sz in lst:
            if st == 'HEADING_3':
                in_bip = True
                bip['title'] = t
                continue
            if not t.strip() or sz == 9:
                continue
            if re.match(r'^[٠-٩]+\.\s', t) or re.match(r'^[أبج]\.\s', t):
                items_seen = True
                continue
            if in_bip and bip['intro'] is None:
                bip['intro'] = t
                continue
            if not items_seen:
                intro.append(t)
            else:
                outro = t
        return key, intro, outro, bip

    # نص الانتقال اللي بعد كل محطة = آخر فقرة عادية في قسمها في تاب العميل
    stations = []

    full = {'station1': [], 'station2': [], 'freq': [], 'bipolar': []}

    # المحطة ١
    key, intro, outro, _ = client_station('المحطة ١')
    items = []
    for it in s1:
        b = it['body']
        note = note_of(b)
        ax = triad_axes(note)
        light = 'الحالة: خفيف' in note
        opts = [{'id': f'o{k+1}', 'text': strip_opt(b[k+1]), 'axis': AXIS[ax[k][0]]} for k in range(3)]
        items.append({'id': f's1n{num(it["h"])}', 'n': num(it['h']), 'text': strip_num(b[0]), 'options': opts, 'light': light})
        dom = re.search(r'الميدان: ([^·]+)', note)
        full['station1'].append({'id': items[-1]['id'], 'n': items[-1]['n'], 'text': items[-1]['text'], 'light': light,
                                 'domain': dom.group(1).strip() if dom else '',
                                 'options': [dict(o, dim=DIM_BY_NAME[ax[k][1]][0]) for k, o in enumerate(opts)]})
    stations.append({'id': 1, 'kind': 'triad', 'title': key.split(': ', 1)[1], 'intro': intro, 'items': items, 'transition': outro})

    # المحطة ٢
    key, intro, outro, _ = client_station('المحطة ٢')
    items = []
    for it in s2:
        b = it['body']
        ax = triad_axes(note_of(b))
        opts = [{'id': f'o{k+1}', 'text': strip_opt(b[k+1]), 'axis': AXIS[ax[k][0]]} for k in range(3)]
        items.append({'id': f's2n{num(it["h"])}', 'n': num(it['h']), 'text': strip_num(b[0]), 'options': opts, 'light': False})
        sign = re.search(r'العلامة: ([^·]+)', note_of(b))
        full['station2'].append({'id': items[-1]['id'], 'n': items[-1]['n'], 'text': items[-1]['text'],
                                 'sign': sign.group(1).strip() if sign else '',
                                 'options': [dict(o, dim=DIM_BY_NAME[ax[k][1]][0]) for k, o in enumerate(opts)]})
    stations.append({'id': 2, 'kind': 'triad', 'reversed': True, 'title': key.split(': ', 1)[1], 'intro': intro, 'items': items, 'transition': outro})

    # المحطات ٣ لـ ٧
    check_items = []
    for k in (3, 4, 5, 6, 7):
        key, intro, outro, bip = client_station(f'المحطة {str(k).translate(str.maketrans("34567", "٣٤٥٦٧"))}')
        items, bipolar = [], []
        for it in freq[k]:
            h, b = it['h'], it['body']
            if 'الجزء الأخير' in h:
                continue
            note = note_of(b)
            mm = meta(note)
            n = num(h)
            if 'سؤال الطرفين' in h:
                a = strip_opt(next(x for x in b if x.startswith('أ. ')))
                bb = strip_opt(next(x for x in b if x.startswith('ب. ')))
                bipolar.append({'id': f's6t{n}', 'n': n, 'text': b[0], 'a': a, 'b': bb})
                poles = re.search(r'الطرف «أ» = قطب ([^،·]+)، والطرف «ب» = قطب ([^·]+)', note)
                full['bipolar'].append({'id': f's6t{n}', 'n': n, 'axis': AXIS[mm['dim']], 'tension': mm['type'].split(': ', 1)[1],
                                        'poleA': poles.group(1).strip(), 'poleB': poles.group(2).strip(),
                                        'text': b[0], 'a': a, 'b': bb})
                for pole, txt in (('أ', a), ('ب', bb)):
                    check_items.append({'station': 6, 'n': f'ط{n}{pole}', 'text': b[0] + ' ' + txt, **mm})
                continue
            if b[0].startswith('['):
                slot = int(re.search(r'مكان ([٠-٩])', b[0]).group(1).translate(AR))
                items.append({'id': f's{k}n{n}', 'n': n, 'adaptive': slot})
                full['freq'].append(classify(k, n, None, mm))
                check_items.append({'station': k, 'n': n, 'text': None, **mm})
                continue
            items.append({'id': f's{k}n{n}', 'n': n, 'text': b[0]})
            full['freq'].append(classify(k, n, b[0], mm))
            check_items.append({'station': k, 'n': n, 'text': b[0], **mm})
        st = {'id': k, 'kind': 'freq', 'title': key.split(': ', 1)[1], 'intro': intro, 'scale': FREQ, 'items': items, 'transition': outro}
        if bipolar:
            st['bipolar'] = {'title': bip['title'], 'intro': bip['intro'],
                             'scale': ['أقرب لـ«أ»', 'أقرب شوية لـ«أ»', 'في النص', 'أقرب شوية لـ«ب»', 'أقرب لـ«ب»'],
                             'items': bipolar}
        stations.append(st)

    # ───────── جدول الاستبدال ─────────
    adaptive = {'rows': [], 'general': None}
    for r in s7_table[1:]:
        m = re.match(r'(الحفظ|الحيوية|الانتماء) ← (الحفظ|الحيوية|الانتماء)', r[0])
        if m:
            adaptive['rows'].append({'main': AXIS[m.group(1)], 'suppressed': AXIS[m.group(2)], 'slots': r[1:5]})
        else:
            adaptive['general'] = {'slots': r[1:5]}
    assert len(adaptive['rows']) == 6 and adaptive['general'], 'جدول الاستبدال ناقص'

    # ───────── تطابق التابين ─────────
    client_text = '\n'.join(t for st, t, sz in C_seq if st != 'TABLE')
    missing = []
    for st in stations:
        for it in st['items']:
            if it.get('text') and it['text'] not in client_text:
                missing.append(it['id'])
            for o in it.get('options', []):
                if o['text'] not in client_text:
                    missing.append(it['id'] + '/' + o['id'])
        for it in st.get('bipolar', {}).get('items', []):
            for x in (it['text'], it['a'], it['b']):
                if x not in client_text:
                    missing.append(it['id'])
    if missing:
        sys.exit('النصوص دي في التاب الأساسي ومش في تاب العميل (اتعدّلت في تاب بس؟): ' + ', '.join(missing))

    counts = {st['id']: len(st['items']) + len(st.get('bipolar', {}).get('items', [])) for st in stations}
    assert counts == {1: 18, 2: 6, 3: 19, 4: 19, 5: 19, 6: 12, 7: 18}, counts

    # ───────── ملف المحرك الكامل + قفل النسخة ─────────
    closing_key = next(k for k in C if k.startswith('الختام'))
    closing = [t for st, t, sz in C[closing_key] if t.strip() and st == 'NORMAL_TEXT']
    full_body = {
        'axes': {a: {'name': AXIS_NAME[a], 'dims': [d for d, n_, ax in DIMS if ax == a]} for a in ('H', 'V', 'A')},
        'dims': [{'id': d, 'name': n_, 'axis': ax} for d, n_, ax in DIMS],
        **full,
        'adaptive': adaptive,
        'client': {'welcome': {'title': title, 'paragraphs': welcome}, 'period': period, 'closing': closing,
                   'stations': [{'id': st['id'], 'title': st['title'], 'intro': st['intro'], 'transition': st['transition'],
                                 **({'bipolar': {k_: st['bipolar'][k_] for k_ in ('title', 'intro', 'scale')}} if st.get('bipolar') else {})}
                                for st in stations]},
    }
    qhash = hashlib.sha1(json.dumps(full_body, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:12]
    lock = json.load(open(LOCK, encoding='utf-8')) if os.path.exists(LOCK) else None
    if version is None:
        if not lock:
            sys.exit('مفيش قفل لسه. أول مرة لازم تحدد النسخة: --version 2.0')
        version = lock['version']
    if lock and version == lock['version'] and qhash != lock['hash']:
        sys.exit(f'الأسئلة أو تصنيفها اتغيّروا ({lock["hash"]} ← {qhash}) ورقم النسخة لسه {version}. '
                 'ارفع الرقم (مثلًا --version ' + bump(version) + ')، علشان الإجابات القديمة تفضل مربوطة بنسختها.')
    if lock and version != lock['version'] and qhash == lock['hash']:
        sys.exit(f'رقم النسخة اتغيّر ({lock["version"]} ← {version}) والأسئلة زي ما هي. سيب الرقم زي ما هو.')
    gen = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    os.makedirs(ENGINE_DIR, exist_ok=True)
    json.dump({'version': version, 'hash': qhash, 'generated': gen, 'docRevision': doc.get('revisionId', '')[:16], **full_body},
              open(os.path.join(ENGINE_DIR, 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not lock or lock['version'] != version:
        history = (lock or {}).get('history', [])
        if lock:
            history.append({'version': lock['version'], 'hash': lock['hash'], 'lockedAt': lock['lockedAt']})
        json.dump({'version': version, 'hash': qhash, 'lockedAt': gen, 'history': history},
                  open(LOCK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    body = {'title': 'مقياس المحاور', 'welcome': {'title': title, 'paragraphs': welcome_pilot},
            'period': period, 'stations': stations, 'adaptive': adaptive}
    h = hashlib.sha1(json.dumps(body, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:10]
    out = {'version': {'questions': version, 'hash': h, 'generated': gen,
                       'docRevision': doc.get('revisionId', '')[:16]}, **body}
    leak = re.findall(r'داخلي|الحفظ|الحيوية|الانتماء|محور|نقاط القوة|استبدال|إشارة سكوت', json.dumps(out, ensure_ascii=False))
    assert not leak, ('كلام داخلي اتسرّب لملف المشاركين', set(leak))
    json.dump(out, open(os.path.join(HERE, 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # ───────── ملف الفحص ─────────
    ct = [title] + welcome + [period['question']] + [o['text'] for o in period['options']] + \
         [period['followup']['question'], period['thanks']]
    for st in stations:
        ct += st['intro'] + ([st['transition']] if st['transition'] else [])
        if st.get('bipolar'):
            ct += [st['bipolar']['title'], st['bipolar']['intro']]
    chk = {
        'items': check_items,
        'adaptive': [{'case': f"{r['main']} ← {r['suppressed']}", 'slots': r['slots']} for r in adaptive['rows']] +
                    [{'case': 'عامة', 'slots': adaptive['general']['slots']}],
        'client_texts': ct,
        'station1': [[it['text']] + [o['text'] for o in it['options']] for it in stations[0]['items']],
        'station2': [[it['text']] + [o['text'] for o in it['options']] for it in stations[1]['items']],
    }
    json.dump(chk, open(os.path.join(HERE, '..', 'checks', 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'الأسئلة {version} ({qhash}) · engine/items.json · pilot/items.json ({h}) · checks/items.json', counts)


def bump(v):
    p = v.split('.')
    p[-1] = str(int(p[-1]) + 1)
    return '.'.join(p)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('doc')
    ap.add_argument('--version', default=None, help='رقم نسخة الأسئلة. لازم يترفع لو أي نص أو تصنيف اتغيّر.')
    args = ap.parse_args()
    main(args.doc, args.version)
