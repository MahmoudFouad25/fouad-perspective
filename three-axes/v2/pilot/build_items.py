# -*- coding: utf-8 -*-
"""يولّد ملفات الأسئلة من دوك «مقياس المحاور ٢ — الأسئلة».

الاستعمال:
    python3 build_items.py doc.json

doc.json = ناتج documents.get للدوك (Google Docs API، أو أداة read_doc) زي ما هو،
أو المفتاح "content" بتاعه.

بيكتب ملفين:
  pilot/items.json   ← اللي صفحة المشاركين بتقراه. فيه نصوص العميل بس، ومفيش أي سطر داخلي،
                       ولا اسم محور ولا بُعد. المحاور مرموزة بحروف: H / V / A.
  checks/items.json  ← اللي سكريبت الفحص (checks/check_items.py) بيقراه، بالتصنيف الداخلي كامل.

النصوص الثابتة (الترحيب، وسؤال الفترة، وتعليمات كل محطة، ونصوص الانتقال) جاية من تاب «نسخة العميل».
العبارات والمواقف وتصنيفها جاية من التاب الأساسي، والسكريبت بيتأكد إن الاتنين متطابقين.
"""
import json, re, sys, os, hashlib
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
AXIS = {'الحفظ': 'H', 'الحيوية': 'V', 'الانتماء': 'A'}
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


def strip_num(t):
    return re.sub(r'^[٠-٩]+\.\s*', '', t)


def strip_opt(t):
    return re.sub(r'^[أبج]\.\s*', '', t)


def main(path):
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
    stations.append({'id': 1, 'kind': 'triad', 'title': key.split(': ', 1)[1], 'intro': intro, 'items': items, 'transition': outro})

    # المحطة ٢
    key, intro, outro, _ = client_station('المحطة ٢')
    items = []
    for it in s2:
        b = it['body']
        ax = triad_axes(note_of(b))
        opts = [{'id': f'o{k+1}', 'text': strip_opt(b[k+1]), 'axis': AXIS[ax[k][0]]} for k in range(3)]
        items.append({'id': f's2n{num(it["h"])}', 'n': num(it['h']), 'text': strip_num(b[0]), 'options': opts, 'light': False})
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
                for pole, txt in (('أ', a), ('ب', bb)):
                    check_items.append({'station': 6, 'n': f'ط{n}{pole}', 'text': b[0] + ' ' + txt, **mm})
                continue
            if b[0].startswith('['):
                slot = int(re.search(r'مكان ([٠-٩])', b[0]).group(1).translate(AR))
                items.append({'id': f's{k}n{n}', 'n': n, 'adaptive': slot})
                check_items.append({'station': k, 'n': n, 'text': None, **mm})
                continue
            items.append({'id': f's{k}n{n}', 'n': n, 'text': b[0]})
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

    body = {'title': 'مقياس المحاور', 'welcome': {'title': title, 'paragraphs': welcome_pilot},
            'period': period, 'stations': stations, 'adaptive': adaptive}
    h = hashlib.sha1(json.dumps(body, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:10]
    out = {'version': {'hash': h, 'generated': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
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
    print('pilot/items.json', h, counts)


if __name__ == '__main__':
    main(sys.argv[1])
