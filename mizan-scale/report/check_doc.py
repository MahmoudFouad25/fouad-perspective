# -*- coding: utf-8 -*-
"""بيتأكد إن report/texts.json هو نفس اللي في التاب الأساسي في دوك «ميزان المتطوع — نصوص التقرير»، كلمة بكلمة.

  python3 check_doc.py doc.json      (doc.json = ناتج documents.get زي ما هو، أو مفتاح content بتاعه)

بيقرا التاب الأساسي بنفس طريقة extract_texts.py بتاعة v2 (العناوين، والفقرات، والنقط، والجداول، ومن غير سطور «داخلي —»)،
وبيقارنه قسم قسم وجزء جزء بـ texts.json. أي اختلاف بيتطبع، والسكريبت بيخرج بكود ١.
الأقسام اللي في الدوك ومش في texts.json (الجداول التقديرية زي «عدد الكلمات») بتتطبع كملاحظة بس.
"""
import json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))


def extract(path):
    d = json.load(open(path, encoding='utf-8'))
    d = d.get('content', d)
    tab = [t for t in d['tabs'] if t['tabProperties']['tabId'] == 't.0'][0]['documentTab']['body']['content']

    def pt(p): return ''.join(r.get('textRun', {}).get('content', '') for r in p['elements']).rstrip('\n')
    texts, h2, h3 = {}, None, '_'

    def slot():
        return texts.setdefault(h2, {}).setdefault(h3, {'paras': [], 'bullets': [], 'tables': []})
    for e in tab:
        if 'table' in e and h2 is not None:
            rows = [[' '.join(pt(x['paragraph']).strip() for x in c['content'] if 'paragraph' in x).strip()
                     for c in r['tableCells']] for r in e['table']['tableRows']]
            slot()['tables'].append(rows)
            continue
        if 'paragraph' not in e:
            continue
        p = e['paragraph']; st = p['paragraphStyle'].get('namedStyleType'); t = pt(p).strip()
        if not t:
            continue
        if st == 'HEADING_1': h2, h3 = None, '_'; continue
        if st == 'HEADING_2': h2, h3 = t, '_'; continue
        if st == 'HEADING_3': h3 = t; continue
        if h2 is None or t.startswith('داخلي —'):
            continue
        (slot()['bullets'] if p.get('bullet') else slot()['paras']).append(t)
    return texts, d.get('revisionId', '')


def main(path):
    doc, rev = extract(path)
    mine = json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf-8'))['texts']
    bad = 0
    for sec in doc:
        if sec not in mine:
            print(f'ملاحظة: قسم في الدوك مش في texts.json: {sec}')
            continue
        for part, v in doc[sec].items():
            m = mine[sec].get(part)
            if m is None:
                print(f'✗ جزء في الدوك مش في texts.json: {sec} / {part}'); bad += 1; continue
            for k in ('paras', 'bullets', 'tables'):
                if v[k] != m.get(k, []):
                    bad += 1
                    print(f'✗ {sec} / {part} / {k}')
                    a, b = v[k], m.get(k, [])
                    for i in range(max(len(a), len(b))):
                        x = a[i] if i < len(a) else None
                        y = b[i] if i < len(b) else None
                        if x != y:
                            print(f'    الدوك:   {str(x)[:150]}\n    الملف:  {str(y)[:150]}')
    for sec in mine:
        if sec not in doc:
            print(f'✗ قسم في texts.json مش في الدوك: {sec}'); bad += 1
        else:
            for part in mine[sec]:
                if part not in doc[sec]:
                    print(f'✗ جزء في texts.json مش في الدوك: {sec} / {part}'); bad += 1
    print(('✓ texts.json مطابق للدوك' if not bad else f'✗ {bad} اختلاف') + f' (مراجعة الدوك {rev[:16]})')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1])
