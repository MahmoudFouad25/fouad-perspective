# -*- coding: utf-8 -*-
"""تاب «المؤنث» في دوك «ميزان المتطوع — الأسئلة»: الجمل الجديدة أو المتعدّلة اللي ليها نسخة مؤنثة (٦٨ جملة)،
المذكر وجنبه المؤنث، بترتيب ظهورها في المقياس.

«جديدة أو متعدّلة» = موجودة في fem/items.fem.json ومش موجودة بنفس المؤنث في three-axes/v2/fem/items.fem.json
(v2 بيتقري بس، ما بيتلمسش).

  python3 fem_tab.py pairs                 ← بيطبع الأزواج
  python3 fem_tab.py text                  ← النص اللي قبل الجدول (JSON)
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
VOL = json.load(open(os.path.join(HERE, 'items.fem.json'), encoding='utf-8'))
V2 = json.load(open(os.path.join(ROOT, 'three-axes', 'v2', 'fem', 'items.fem.json'), encoding='utf-8'))
ITEMS = json.load(open(os.path.join(HERE, '..', 'engine', 'items.json'), encoding='utf-8'))

NEW = {m: f for m, f in VOL.items() if V2.get(m) != f}
AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')


def places():
    """(المكان، الجملة) بترتيب المقياس."""
    out = []
    c = ITEMS['client']
    def add(where, s):
        if isinstance(s, str) and s.strip():
            out.append((where, s.strip()))
    def deep(where, v):
        if isinstance(v, str): add(where, v)
        elif isinstance(v, list): [deep(where, x) for x in v]
        elif isinstance(v, dict): [deep(where, x) for k, x in v.items() if k not in ('id', 'none', 'axis', 'kind', 'coachFlag', 'selfReport')]
    deep('الترحيب', c.get('welcome'))
    deep('قبل البداية', c.get('start'))
    for st, key in ((1, 'station1'), (2, 'station2'), (7, 'station7')):
        for it in ITEMS[key]:
            w = f'المحطة {st} · موقف {it["n"]}'.translate(AR)
            add(w, it['text'])
            for o in it['options']:
                add(w + ' · اختيار', o['text'])
            if it.get('skip'):
                add('المحطتين ١ و٧ · زرار المواقف الخفيفة (٦ مواقف)', it['skip'])
    for it in ITEMS['freq']:
        add(f'المحطة {it["station"]} · عبارة {it["n"]}'.translate(AR), it['text'])
    for it in ITEMS['bipolar']:
        w = f'المحطة ٦ · اختيار {it["n"]}'.translate(AR)
        for k in ('text', 'a', 'b'):
            add(w, it[k])
    for it in ITEMS['vcycle']:
        add(f'المحطة ٨ · عبارة {it["n"]}'.translate(AR), it['text'])
    vn = ITEMS['vnow']
    add('المحطة ٨ · إنت فين دلوقتي', vn['text'])
    for o in vn['options']:
        add('المحطة ٨ · إنت فين دلوقتي · اختيار', o['text'])
    deep('بين المحطات', c.get('stations'))
    deep('الختام', c.get('closing'))
    deep('أسئلة متكيفة', ITEMS.get('adaptive'))
    return out


def pairs():
    seen, res = set(), []
    for w, s in places():
        if s in NEW and s not in seen:
            seen.add(s); res.append((w, s, NEW[s]))
    missing = [m for m in NEW if m not in seen]
    for m in missing:  # جمل مؤنثة ملهاش مكان معروف (المفروض مفيش)
        res.append(('—', m, NEW[m]))
    return res, missing


def fill_requests(doc_path, tab_id):
    """بعد ما الجدول الفاضي (٦٩ صف × ٣) يتحط في التاب: طلبات ملء الخانات من الآخر للأول، وتنسيقها."""
    d = json.load(open(doc_path, encoding='utf-8'))
    d = d.get('content', d)
    def find(ts):
        for t in ts:
            if t['tabProperties']['tabId'] == tab_id: return t
            r = find(t.get('childTabs', []))
            if r: return r
    body = find(d['tabs'])['documentTab']['body']['content']
    table = [e for e in body if 'table' in e][-1]
    P, _ = pairs()
    rows = [('المكان', 'المذكر', 'المؤنث')] + [(f'{i}. {w}'.translate(AR), m, f) for i, (w, m, f) in enumerate(P, 1)]
    assert len(rows) == len(table['table']['tableRows']), 'عدد الصفوف مش مظبوط'
    cells = []
    for r, row in enumerate(table['table']['tableRows']):
        for c, cell in enumerate(row['tableCells']):
            p = cell['content'][0]
            cells.append((p['startIndex'], rows[r][c], r == 0, c))
    reqs = []
    for idx, txt, head, c in sorted(cells, key=lambda x: -x[0]):
        reqs.append({'insertText': {'location': {'index': idx, 'tabId': tab_id}, 'text': txt}})
    # تنسيق بعد الملء: الإندكسات اتغيرت، فبنحسبها من الأول للآخر
    shift, style = 0, []
    for idx, txt, head, c in sorted(cells, key=lambda x: x[0]):
        a = idx + shift
        # اتجاه الخانات RTL جاي من الجدول نفسه (اتحط في فقرة RTL)
        if head or c == 0:
            style.append({'updateTextStyle': {'range': {'startIndex': a, 'endIndex': a + len(txt), 'tabId': tab_id},
                                              'textStyle': {'bold': True} if head else {'fontSize': {'magnitude': 9, 'unit': 'PT'}},
                                              'fields': 'bold' if head else 'fontSize'}})
        shift += len(txt)
    return reqs + style


if __name__ == '__main__':
    P, miss = pairs()
    if len(sys.argv) == 4 and sys.argv[1] == 'fill':
        R = fill_requests(sys.argv[2], sys.argv[3])
        json.dump(R, open(os.path.join(HERE, '..', 'checks', 'doc_fem_tab_requests.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(len(R), 'طلب')
    if sys.argv[1:] == ['pairs']:
        for i, (w, m, f) in enumerate(P, 1):
            print(i, w, '|', m, '|', f)
        print(len(P), 'جملة · من غير مكان:', len(miss), file=sys.stderr)
