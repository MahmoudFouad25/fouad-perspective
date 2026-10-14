# -*- coding: utf-8 -*-
"""بيبني الجزء «ب» في تاب «ورقة الكوتش» (قسم «التطوع» من ورق الكوتش المتولّد للتقارير النموذجية) من samples.json.

  python3 coach_to_doc.py <tabId> <startIndex> <endIndex>
     startIndex = أول عنوان «ب. ورقة الكوتش…» في التاب، endIndex = آخر حرف قبل السطر الفاضي الأخير في التاب.
     بيكتب ../checks/doc_coach_requests.json (مسح الجزء القديم، وإدخال الجديد، وتنسيقه).

الحالات اللي بتتعرض هنا: ب (بيصحّي الهادي)، ج (جديد أقل من شهر: سطر «صورة متوقعة»)، د (تعادل + عبارة المواسم ٣ من غير تنبيه مزاج).
الورق كامل لكل المتطوعين الخمسة في samples.html.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gitref import ref

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, 'samples.json'), encoding='utf-8'))
KEYS = ['ب', 'ج', 'د']

paras = []  # (text, kind)


def add(t, k='p'):
    paras.append((t, k))


add('ب. ورقة الكوتش: قسم «التطوع» من التقارير النموذجية', 'h1')
add('داخلي — متولّد آليًا بـ ' + ref('mizan-scale/report/coach.js') + ' من نفس المتطوعين اللي في تاب «تقارير نموذجية» (' + S['generated'] +
    '). هنا القسم الجديد بس (رقم ٥) لتلات حالات: ب و ج و د. والورقة كاملة للخمسة (الملخص والأرقام والتنبيهات وأسئلة الجلسة) في الريبو: ' + ref('mizan-scale/report/samples.html') + '.', 'note')
MAP = {'h2': 'h3', 'h3': 'h4', 'h4': 'h5', 'li': 'li', 'p': 'p'}
for x in S['samples']:
    if x['key'] not in KEYS:
        continue
    add(f'{x["key"]}. {x["title"]}', 'h2')
    on = False
    for b in x['coach']:
        if b['t'] == 'p' and b['text'].startswith('الدور:') and not on:
            add(b['text'], 'p')
            continue
        if b['t'] == 'h2':
            on = b['text'].startswith('٥.')
        if on:
            add(b['text'], MAP[b['t']])

text = ''.join(t + '\n' for t, _ in paras)

if __name__ == '__main__':
    tab, start, end = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])

    def R(a, b): return {'startIndex': a, 'endIndex': b, 'tabId': tab}
    reqs = [{'deleteContentRange': {'range': R(start, end)}},
            {'insertText': {'text': text, 'location': {'index': start, 'tabId': tab}}}]
    stop = start + len(text)
    reqs.append({'deleteParagraphBullets': {'range': R(start, stop)}})
    reqs.append({'updateParagraphStyle': {'range': R(start, stop), 'paragraphStyle': {'namedStyleType': 'NORMAL_TEXT', 'direction': 'RIGHT_TO_LEFT', 'alignment': 'START'},
                                          'fields': 'namedStyleType,direction,alignment'}})
    reqs.append({'updateTextStyle': {'range': R(start, stop - 1), 'textStyle': {}, 'fields': 'bold,fontSize,foregroundColor'}})
    H = {'h1': 'HEADING_1', 'h2': 'HEADING_2', 'h3': 'HEADING_3', 'h4': 'HEADING_4', 'h5': 'HEADING_5'}
    i, run = start, None
    bullets = []
    for t, k in paras:
        a, b = i, i + len(t)
        if k in H:
            reqs.append({'updateParagraphStyle': {'range': R(a, b + 1), 'paragraphStyle': {'namedStyleType': H[k]}, 'fields': 'namedStyleType'}})
        if k == 'note':
            reqs.append({'updateTextStyle': {'range': R(a, b), 'textStyle': {'fontSize': {'magnitude': 9, 'unit': 'PT'},
                         'foregroundColor': {'color': {'rgbColor': {'red': 0.54, 'green': 0.35, 'blue': 0}}}}, 'fields': 'fontSize,foregroundColor'}})
        if k == 'li':
            run = [a, b + 1] if run is None else [run[0], b + 1]
        elif run:
            bullets.append(run); run = None
        i = b + 1
    if run:
        bullets.append(run)
    # البوليتس من الآخر للأول: createParagraphBullets ما بيغيرش الإندكسات، بس كده أأمن
    for a, b in reversed(bullets):
        reqs.append({'createParagraphBullets': {'range': R(a, b), 'bulletPreset': 'BULLET_DISC_CIRCLE_SQUARE'}})
    json.dump(reqs, open(os.path.join(HERE, '..', 'checks', 'doc_coach_requests.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(len(reqs), 'طلب ·', len(text), 'حرف')
