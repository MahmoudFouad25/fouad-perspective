# -*- coding: utf-8 -*-
"""بيحوّل samples.json لطلبات Google Docs (batchUpdate) لتاب «تقارير نموذجية»، ولصفحة samples.html للريبو.
  python3 to_doc.py <tabId> <tabEndIndex>   ← بيكتب doc_requests.json و samples.html
التقريرين «أ» و«ج» كاملين، و«ب» و«د» و«هـ» الأقسام الخاصة بالتطوع بس (والتقارير كاملة في samples.html)."""
import json, sys, os, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gitref import ref
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, 'samples.json'), encoding='utf-8'))
T = json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf-8'))
FULL = {'أ', 'ج'}
KEEP = ('إنت والتطوع', 'دايرتك في التطوع', 'لما الضغط يزيد')

def arn(n): return str(n).translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))

paras = []   # (text, kind) kind: h1 h2 h3 h4 h5 p li note bold
def add(t, k='p'): paras.append((t, k))

add('تقارير نموذجية', 'h1')
ST = len(sys.argv) > 2   # من غير tab: بيبني samples.html بس، فما يقفش على الملفات اللي لسه ما اترفعتش
R_RENDER, R_SAMPLES = ref('mizan-scale/report/render.js', ST), ref('mizan-scale/report/samples.js', ST)
R_HTML, R_FEM = ref('mizan-scale/report/samples.html', ST), ref('mizan-scale/fem/texts.fem.json', ST)
add(f'داخلي — التقارير دي متولّدة آليًا ({S["generated"]}) من محرك «ميزان المتطوع» (نسخة {S["engine"]}، والإعدادات {S["config"]})، '
    f'والأسئلة {S["questions"]}، ونصوص التاب الأولاني {S["texts"]}، بنفس الكود اللي بيبني تقرير المتطوع ({R_RENDER}). '
    f'ما تتعدّلش بإيد: أي تعديل في اللغة بيتعمل في التاب الأولاني، وبعدين التقارير دي بتتولّد من جديد ({R_SAMPLES}).', 'note')
add('داخلي — التقريرين «أ» و«ج» هنا كاملين، زي ما المتطوع هيقراهم بالظبط. وفي «ب» و«د» و«هـ» الأقسام اللي بتختلف بين الحالات بس: «إنت والتطوع» و«دايرتك في التطوع»، و«لما الضغط يزيد» لو ظهر. '
    f'والتقارير الخمسة كاملة، ومعاها ورقة الكوتش لكل واحد، في الريبو: {R_HTML}. والتقريرين «أ» و«د» بصيغة المؤنث: كل جملة فيهم جاية من نسختها المؤنثة في {R_FEM}.', 'note')
for x in S['samples']:
    r = x['report']; m = r['meta']; sm = x['summary']
    add(f'{x["key"]}. {x["title"]}', 'h1')
    add(f'داخلي — الصيغة: {"مؤنث" if x["address"] == "f" else "مذكر"}. عدد الكلمات (التقرير كامل): {m["words"]}.', 'note')
    add('داخلي — الأقسام اللي ظهرت: ' + ' · '.join(m['shown']), 'note')
    add('داخلي — الأقسام اللي ما ظهرتش: ' + (' · '.join(m['hidden']) or 'مفيش، كل الأقسام ظهرت.'), 'note')
    v = sm['volunteer']
    NM = {'H': 'الحفظ', 'V': 'الحيوية', 'A': 'الانتماء'}
    def sg(n): return ('+' if n > 0 else '−' if n < 0 else '') + arn(abs(n))
    add('داخلي — التطوع: الفرق (تطوع − حياة) ' + '، '.join(f'{NM[a]} {sg(v["diff"][a])}' for a in 'HVA') + f' · {v["reason"]}'
        + (f' · عبارة المواسم ({v["season"]["item"]}) = {arn(v["season"]["value"])}، وتنبيه المزاج: {"شغال" if v["moodAlert"] else "مش شغال"} (العبارة دي بتظهر في ورقة الكوتش بس)' if v.get('season') and isinstance(v['season'].get('value'), int) and v['season']['value'] >= 2 else '') + '.', 'note')
    add('داخلي — مشاكل لقاها التوليد: ' + (' | '.join(m['problems']) or 'مفيش.'), 'note')
    full = x['key'] in FULL
    on = full
    for b in r['blocks']:
        t = b['t']
        if t == 'title': add(b['text'], 'h2'); continue
        if t == 'h2': on = full or b['text'] in KEEP
        if not on: continue
        if t == 'h2': add(b['text'], 'h3')
        elif t == 'h3': add(b['text'], 'h4')
        elif t == 'h4': add(b['text'], 'h5')
        elif t == 'li': add(b['text'], 'li')
        elif t == 'card':
            add(b['name'], 'bold'); add(b['line']); add(b['label']); add(b['state'], 'bold'); add(b['text'])
        elif t == 'rate':
            add(b['text']); add(' · '.join(f'{arn(i+1)} {s}' for i, s in enumerate(b['scale']))); add(b['note'])
        else: add(b['text'])
    if not full:
        add(f'داخلي — باقي التقرير (المسارات، والمساحات، والميل، والخطوة، والختام) في {R_HTML}.', 'note')

if len(sys.argv) > 2:
    tab, end = sys.argv[1], int(sys.argv[2])
    text = ''.join(p + '\n' for p, _ in paras)
    reqs = []
    if end > 2: reqs.append({'deleteContentRange': {'range': {'startIndex': 1, 'endIndex': end - 1, 'tabId': tab}}})
    reqs.append({'insertText': {'text': text, 'location': {'index': 1, 'tabId': tab}}})
    N = 1 + len(text)
    def R(a, b): return {'startIndex': a, 'endIndex': b, 'tabId': tab}
    reqs.append({'updateParagraphStyle': {'range': R(1, N), 'paragraphStyle': {'namedStyleType': 'NORMAL_TEXT', 'direction': 'RIGHT_TO_LEFT', 'alignment': 'START'}, 'fields': 'namedStyleType,direction,alignment'}})
    reqs.append({'updateTextStyle': {'range': R(1, N - 1), 'textStyle': {}, 'fields': 'bold,fontSize,foregroundColor'}})
    pos = 1; bullets = []; HS = {'h1': 'HEADING_1', 'h2': 'HEADING_2', 'h3': 'HEADING_3', 'h4': 'HEADING_4', 'h5': 'HEADING_5'}
    for p, k in paras:
        L = len(p)   # UTF-16: النص عربي ومفيهوش إيموجي، فالطول هو هو
        if k in HS: reqs.append({'updateParagraphStyle': {'range': R(pos, pos + L + 1), 'paragraphStyle': {'namedStyleType': HS[k]}, 'fields': 'namedStyleType'}})
        if k == 'note': reqs.append({'updateTextStyle': {'range': R(pos, pos + L), 'textStyle': {'fontSize': {'magnitude': 9, 'unit': 'PT'}, 'foregroundColor': {'color': {'rgbColor': {'red': 0.54, 'green': 0.35, 'blue': 0}}}}, 'fields': 'fontSize,foregroundColor'}})
        if k == 'bold': reqs.append({'updateTextStyle': {'range': R(pos, pos + L), 'textStyle': {'bold': True}, 'fields': 'bold'}})
        if k == 'li':
            if bullets and bullets[-1][1] == pos: bullets[-1][1] = pos + L + 1
            else: bullets.append([pos, pos + L + 1])
        pos += L + 1
    for a, b in reversed(bullets):
        reqs.append({'createParagraphBullets': {'range': R(a, b), 'bulletPreset': 'BULLET_DISC_CIRCLE_SQUARE'}})
    assert all(ord(c) < 0x10000 for c in text)
    json.dump(reqs, open(os.path.join(HERE, '..', 'checks', 'doc_samples_requests.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print(len(reqs), 'طلب ·', len(text), 'حرف')

# ───── samples.html: التقارير كاملة + ورقة الكوتش ─────
H = ['<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
     '<title>ميزان المتطوع — تقارير نموذجية</title><style>body{font-family:system-ui,"Noto Naskh Arabic",sans-serif;max-width:820px;margin:0 auto;padding:16px;line-height:1.9;color:#1d1d1f;background:#fafaf7}',
     'h1{font-size:1.5rem;border-top:3px solid #2f5d62;padding-top:12px;margin-top:48px}h2{font-size:1.25rem;color:#2f5d62}h3{font-size:1.1rem}',
     '.note{font-size:.82rem;color:#8a5a00}.card{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin:8px 0;background:#fff}.coach{background:#f1f5f4;border-radius:8px;padding:4px 16px;margin-top:24px}</style></head><body>',
     f'<h1>ميزان المتطوع — تقارير نموذجية</h1><p class="note">متولّدة آليًا {html.escape(S["generated"])} · المحرك {S["engine"]} · الأسئلة {html.escape(S["questions"])} · النصوص {html.escape(S["texts"])}</p>']
def e(s): return html.escape(s or '')
for x in S['samples']:
    H.append(f'<h1>{e(x["key"] + ". " + x["title"])}</h1>')
    H.append('<p class="note">' + e(' · '.join(x['report']['meta']['shown'])) + '</p>')
    for b in x['report']['blocks']:
        t = b['t']
        if t == 'title': H.append(f'<h2>{e(b["text"])}</h2>')
        elif t == 'h2': H.append(f'<h2>{e(b["text"])}</h2>')
        elif t in ('h3', 'h4'): H.append(f'<h3>{e(b["text"])}</h3>')
        elif t == 'li': H.append(f'<ul><li>{e(b["text"])}</li></ul>')
        elif t == 'card': H.append(f'<div class="card"><b>{e(b["name"])}</b><br>{e(b["line"])}<br>{e(b["label"])}: <b>{e(b["state"])}</b><br>{e(b["text"])}</div>')
        elif t == 'rate': H.append(f'<p><b>{e(b["text"])}</b><br>' + ' · '.join(e(s) for s in b['scale']) + f'<br>{e(b["note"])}</p>')
        else: H.append(f'<p>{e(b["text"])}</p>')
    H.append('<div class="coach">')
    for b in x['coach']:
        t = b['t']
        tag = {'title': 'h2', 'h2': 'h2', 'h3': 'h3', 'h4': 'h3'}.get(t)
        H.append(f'<{tag}>{e(b["text"])}</{tag}>' if tag else (f'<ul><li>{e(b["text"])}</li></ul>' if t == 'li' else f'<p>{e(b["text"])}</p>'))
    H.append('</div>')
H.append('</body></html>')
open(os.path.join(HERE, 'samples.html'), 'w', encoding='utf-8').write('\n'.join(H))
print('samples.html')
