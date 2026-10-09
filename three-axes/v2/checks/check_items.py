# -*- coding: utf-8 -*-
"""فحص آلي لعبارات «مقياس المحاور ٢» (المحطات ٣ لـ٧) على قواعد الخريطة.

الاستعمال:  python3 check_items.py  (بيقرا items.json اللي جنبه، ويكتب results.md)
items.json متصدّر من دوك «مقياس المحاور ٢ — الأسئلة» (التاب الأساسي).
"""
import json, re, os, itertools
from collections import Counter
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'items.json'), encoding='utf-8'))
AN = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
def an(x): return str(x).translate(AN)

# ---------- العبارات اللي بتتفحص ----------
S = []  # (label, text, meta)
for it in D['items']:
    if it['text']:
        S.append((f"م{an(it['station'])}/{an(it['n'])}", it['text'], it))
seen = set()
for row in D['adaptive']:
    for k, t in enumerate(row['slots'], 1):
        if t not in seen:
            seen.add(t)
            S.append((f"استبدال ({row['case']}، مكان {an(k)})", t, {'type': 'استبدال متكيّف', 'station': 7}))

def norm(t):
    t = re.sub('[ً-ْـ]', '', t)
    t = re.sub(r'[^\w\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()
def toks(t): return norm(t).split()

# ---------- ١. النفي ----------
NEG = {'ما', 'مش', 'مفيش', 'مافيش', 'لا', 'محدش', 'ماحدش', 'ولا', 'مابقدرش'}
NOT_NEG_BEFORE = {'بعد', 'لحد', 'زي', 'قبل', 'أول', 'اول', 'على', 'كل'}
neg = []; fitra_ok = []
for lab, t, m in S:
    w = toks(t)
    isf = m.get('type', '').startswith('الفطرة')
    if isf and 'من غير ما' in norm(t):
        fitra_ok.append(lab)  # قاعدة ل: «من غير ما…» في الفطرة بتسمّي الغايب، مش نفي
    for i, x in enumerate(w):
        if x in NEG:
            if x == 'ما' and i > 0 and w[i-1] in NOT_NEG_BEFORE:
                continue
            if x == 'ما' and isf and i > 1 and w[i-2:i] == ['من', 'غير']:
                continue
            ctx = ' '.join(w[max(0, i-2):i+3])
            neg.append((lab, x, ctx, m.get('type', '')))
    if 'من غير' in norm(t) and not (isf and 'من غير ما' in norm(t)):
        neg.append((lab, 'من غير', norm(t)[max(0, norm(t).find('من غير')-12):norm(t).find('من غير')+20], m.get('type', '')))

# ---------- ٢. كلمات التكرار والتعميم ----------
FREQ_W = {'دايما', 'دايمًا', 'أي', 'كل', 'كله', 'كلها', 'كلهم', 'مهما', 'طول'}
FREQ_P = ['على طول', 'كل مرة']
freq = []
for lab, t, m in S:
    n = norm(t); w = n.split()
    for p in FREQ_P:
        if p in n: freq.append((lab, p, m.get('type', '')))
    for i, x in enumerate(w):
        if x in FREQ_W or x == 'دايمًا':
            freq.append((lab, ' '.join(w[max(0, i-1):i+2]), m.get('type', '')))

# ---------- ٣. «و» و«أو» ----------
HAAL = ('وأنا', 'وهي', 'وهو', 'وبعدها', 'وبعد', 'وكأني', 'وكأن', 'وكأنه')
conj = []
for lab, t, m in S:
    n = norm(t); w = n.split()
    cyc = m.get('type', '').startswith('دائرة')
    for i, x in enumerate(w):
        if x == 'أو':
            conj.append((lab, ' '.join(w[max(0, i-2):i+3]), 'أو', cyc, m.get('type', '')))
        elif x.startswith('و') and len(x) > 2 and x not in HAAL and not x.startswith(('وسط', 'وقت', 'وقفة', 'واقف', 'واحد', 'واضح', 'وجوه', 'وداني', 'وحده', 'ورا')):
            conj.append((lab, ' '.join(w[max(0, i-2):i+2]), 'و', cyc, m.get('type', '')))

# ---------- ٤. الكلمات الممنوعة في نص العميل ----------
CLIENT = [(lab, t) for lab, t, m in S]
for k, q in enumerate(D['station1'], 1): CLIENT += [(f'م١/{an(k)}', x) for x in q]
for k, q in enumerate(D['station2'], 1): CLIENT += [(f'م٢/{an(k)}', x) for x in q]
CLIENT += [('نصوص العميل', x) for x in D['client_texts']]
BANNED = {
    'الجماعة': ['جماعة'],
    'لغة دينية': ['الله', 'ربنا', 'ربي', 'صلاة', 'بصلي', 'دين', 'عبادة', 'إيمان', 'حلال', 'حرام', 'رمضان', 'قرآن', 'دعاء', 'زهد', 'جامع', 'كنيسة', 'ثواب', 'ذنب', 'رضا'],
    'أسماء المحاور والأبعاد': ['حفظ', 'حيوية', 'انتماء', 'محور', 'محاور', 'بدن', 'موارد', 'بيئة', 'تنظيم', 'اشتعال', 'جذب', 'اتحاد', 'حقل', 'تراحم', 'مكانة', 'نفع', 'مسؤولية'],
    'نقاط القوة': ['نقاط القوة', 'نقطة قوة', 'نقطة القوة'],
}
def stem(w):
    w = re.sub(r'^(و|ف)?(ب|ل|ك)?(ال|لل)?', '', w)
    return w
banned = []
for lab, t in CLIENT:
    n = norm(t); ws = {stem(w) for w in n.split()} | set(n.split())
    for cat, words in BANNED.items():
        for wd in words:
            if (' ' in wd and wd in n) or wd in ws:
                banned.append((cat, wd, lab, t))
# ---------- ٥. التكرار وشبه التكرار ----------
dup = []
for (l1, t1, m1), (l2, t2, m2) in itertools.combinations(S, 2):
    if m1.get('type') == 'استبدال متكيّف' and m2.get('type') == 'استبدال متكيّف':
        continue
    r = SequenceMatcher(None, norm(t1), norm(t2)).ratio()
    w1, w2 = toks(t1), toks(t2)
    g1 = {' '.join(w1[i:i+4]) for i in range(len(w1)-3)}
    g2 = {' '.join(w2[i:i+4]) for i in range(len(w2)-3)}
    common = g1 & g2
    if r >= 0.6 or common:
        dup.append((round(r, 2), l1, t1, l2, t2, sorted(common)[:1]))
dup.sort(reverse=True)

# ---------- ٦. الطول ----------
lens = sorted(((len(toks(t)), lab, t) for lab, t, m in S), reverse=True)
avg = sum(x[0] for x in lens) / len(lens)

# ---------- ٧. العدد لكل نوع ووش ----------
types = Counter(); faces = Counter()
for it in D['items']:
    ty = it['type']
    mm = re.match(r'تفريط \((.+)\)', ty)
    if mm: types['تفريط'] += 1; faces[mm.group(1)] += 1
    elif ty.startswith('الفطرة'): types[ty] += 1
    elif ty.startswith('دائرة'): types['دائرة'] += 1
    elif ty.startswith('توتر'): types['توتر (طرف في سؤال بين طرفين)'] += 1
    elif ty.startswith('خوف وقودًا'): types['خوف وقودًا'] += 1
    elif ty.startswith('تجمّد'): types['تجمّد'] += 1
    elif ty.startswith('استبدال'): types['استبدال متكيّف (مكان)'] += 1
    elif ty.startswith('انطفاء'): types['انطفاء'] += 1
    else: types[ty] += 1

# ---------- الكتابة ----------
L = ['# نتيجة الفحص الآلي — المحطات ٣ لـ٧', '',
     f'اتفحص {an(len(S))} نص: {an(sum(1 for i in D["items"] if i["text"]))} عبارة من المحطات، و{an(len(seen))} نص مختلف من جدول الاستبدال (الـ٢٨ خانة). وأسماء المحاور والكلمات الممنوعة اتفحصت كمان في المحطتين ١ و٢ ونصوص العميل.', '']
def table(h, rows):
    L.append('| ' + ' | '.join(h) + ' |'); L.append('|' + '---|' * len(h))
    for r in rows: L.append('| ' + ' | '.join(str(x) for x in r) + ' |')
    L.append('')
L.append('## ١. النفي'); L.append(f'عبارات الفطرة اللي فيها «من غير ما…» (استثناء قاعدة ل، مش بتتعد هنا): {an(len(fitra_ok))} من ١٨: ' + '، '.join(fitra_ok)); L.append(''); table(['العبارة', 'الكلمة', 'السياق', 'النوع'], neg or [['—', 'مفيش', '', '']])
L.append('## ٢. كلمات التكرار والتعميم'); table(['العبارة', 'الكلمة', 'النوع'], freq or [['—', 'مفيش', '']])
L.append('## ٣. «و» و«أو» (من غير «وأنا» و«وبعدها» وأخواتهم)'); table(['العبارة', 'السياق', 'الأداة', 'عبارة دايرة؟', 'النوع'], [(a, b, c, 'أيوه' if d else '—', e) for a, b, c, d, e in conj])
L.append('## ٤. الكلمات الممنوعة في نص العميل'); table(['الفئة', 'الكلمة', 'المكان', 'النص'], banned or [['—', 'مفيش', '', '']])
L.append('## ٥. تكرار أو شبه تكرار (تشابه ٠٫٦ أو أكتر، أو ٤ كلمات ورا بعض مشتركة)'); table(['التشابه', 'العبارة ١', 'النص ١', 'العبارة ٢', 'النص ٢', 'المشترك'], [(an(a), b, c, d, e, ' / '.join(f)) for a, b, c, d, e, f in dup] or [['—'] * 6])
L.append('## ٦. الطول بالكلمات'); L.append(f'المتوسط {an(round(avg, 1))} كلمة. أقصر عبارة {an(lens[-1][0])} كلمات. أطول ٥:'); L.append('')
table(['الكلمات', 'العبارة', 'النص'], [(an(a), b, c) for a, b, c in lens[:5]])
L.append('## ٧. العدد لكل نوع ووش (في المقياس كله، المحطات ٣ لـ٧)'); table(['النوع', 'العدد'], [(k, an(v)) for k, v in types.most_common()])
table(['وش التفريط', 'العدد'], [(k, an(v)) for k, v in faces.most_common()])
open(os.path.join(HERE, 'results.md'), 'w', encoding='utf-8').write('\n'.join(L))
print('\n'.join(L))
