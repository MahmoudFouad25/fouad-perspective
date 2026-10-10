# -*- coding: utf-8 -*-
"""بيطلّع نصوص التقرير من دوك «مقياس المحاور ٢ — نصوص التقرير» لملف texts.json.
الدوك هو المرجع: أي تعديل في اللغة بيتعمل فيه، وبعدين السكريبت ده بيتشغل تاني.

الاستعمال:  python3 extract_texts.py doc.json   (ناتج documents.get زي ما هو، أو مفتاح content بتاعه)
الشكل: texts[«القسم»][«الحالة»] = {paras: [...], bullets: [...], insight: «...»}
  • السطور اللي بتبدأ بـ«داخلي —» ما بتدخلش.
  • السطر الأخضر «جوه البصيرة الحكيمة: …» بيتحط في insight.
"""
import json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))


def main(path):
    d = json.load(open(path, encoding='utf-8'))
    d = d.get('content', d)
    tab = d['tabs'][0]['documentTab']['body']['content']
    def pt(p): return ''.join(r.get('textRun', {}).get('content', '') for r in p['elements']).rstrip('\n')
    texts, h1, h2, h3 = {}, None, None, '_'
    def slot():
        sec = texts.setdefault(h2, {})
        return sec.setdefault(h3, {'paras': [], 'bullets': [], 'insight': None, 'tables': []})
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
        if st == 'HEADING_1': h1, h2, h3 = t, None, '_'; continue
        if st == 'HEADING_2': h2, h3 = t, '_'; continue
        if st == 'HEADING_3': h3 = t; continue
        if h2 is None or t.startswith('داخلي —'):
            continue
        s = slot()
        if t.startswith('جوه البصيرة الحكيمة:'):
            s['insight'] = t[len('جوه البصيرة الحكيمة:'):].strip()
        elif p.get('bullet'):
            s['bullets'].append(t)
        else:
            s['paras'].append(t)
    out = {'docRevision': d.get('revisionId', '')[:16], 'texts': texts}
    json.dump(out, open(os.path.join(HERE, 'texts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('texts.json', len(texts), 'أقسام')


if __name__ == '__main__':
    main(sys.argv[1])
