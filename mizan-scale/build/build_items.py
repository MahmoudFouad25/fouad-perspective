# -*- coding: utf-8 -*-
"""يولّد ملف أسئلة «ميزان المتطوع» من دوك «ميزان المتطوع — الأسئلة».

مسار لوحده تمامًا: ما بيقراش ولا بيكتب أي ملف في three-axes/.
الطريقة نفسها بتاعة three-axes/v2/pilot/build_items.py (منسوخة هنا ومتعدّلة للمتطوعين):
  • العبارات والمواقف وتصنيفها من التاب الأساسي.
  • النصوص الثابتة من تاب «نسخة المتطوع»، والسكريبت بيتأكد إن التابين متطابقين.
  • نسخة المؤنث لكل جملة لازم تكون اتراجعت (fem/)، وإلا بيوقف.

الاستعمال:
    python3 build/build_items.py doc.json --version 1.0   ← أول مرة
    python3 build/build_items.py doc.json                  ← بعد كده (بيرفض لو حاجة اتغيرت ورقم النسخة ما اتغيرش)

بيكتب:
  engine/items.json            ← مصدر المحرك (كل عبارة بتصنيفها، ورقم النسخة)
  engine/questions.lock.json   ← قفل النسخة
  checks/build_report.md       ← تقرير البناء: العدد في كل محطة، وربط كل اختيار بمحوره وبُعده
"""
import json, re, sys, os, hashlib
from collections import Counter
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
AN = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
AXIS = {'الحفظ': 'H', 'الحيوية': 'V', 'الانتماء': 'A'}
AXIS_NAME = {v: k for k, v in AXIS.items()}
DIMS = [('H1', 'البدن', 'H'), ('H2', 'الموارد والبيئة', 'H'), ('H3', 'التنظيم الذاتي', 'H'),
        ('V1', 'الاشتعال', 'V'), ('V2', 'الجذب', 'V'), ('V3', 'الاتحاد', 'V'),
        ('A1', 'قراءة الحقل والتراحم', 'A'), ('A2', 'المكانة والدور', 'A'), ('A3', 'النفع والمسؤولية', 'A')]
DIM_BY_NAME = {n: (i, a) for i, n, a in DIMS}
ENGINE_DIR = os.path.join(ROOT, 'engine')
LOCK = os.path.join(ENGINE_DIR, 'questions.lock.json')
FREQ = ['عمري', 'نادرًا', 'أحيانًا', 'كتير', 'دايمًا']
EARLY = 'لسه بدري عليّا أعرف'
NOT_YET = 'ما مريتش بده قريب'
CLIENT_TAB = 'نسخة المتطوع'

# أسماء الأقسام في التاب الأساسي
SEC = {1: '٣. المحطة الأولى: أيامك وهي ماشية عادي', 2: '٥. المحطة التانية: الناس وطرقهم',
       3: '٦. المحطة التالتة: تفاصيل أيامك (١)', 4: '٧. المحطة الرابعة: تفاصيل أيامك (٢)',
       5: '٨. المحطة الخامسة: تفاصيل أيامك (٣)', 6: '٩. المحطة السادسة: الموجات',
       7: '١٠. المحطة السابعة: إنت والتطوع', 8: '١٢. المحطة الثامنة: دايرتك في التطوع',
       9: '١٣. المحطة التاسعة: لما الضغط يزيد'}
EXPECTED = {1: 18, 2: 6, 3: 19, 4: 19, 5: 19, 6: 12, 7: 18, 8: 10, 9: 18}


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
    out = []
    for k in '123':
        m = re.search(k + r' = (الحفظ|الحيوية|الانتماء) / ([^،·]+)', note)
        assert m, (k, note[:80])
        dim = m.group(2).strip()
        assert dim in DIM_BY_NAME, f'بُعد مش معروف «{dim}»'
        assert DIM_BY_NAME[dim][1] == AXIS[m.group(1)], f'البُعد «{dim}» مش تبع «{m.group(1)}»'
        out.append((m.group(1), dim))
    return out


def classify(station, n, text, mm):
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
    elif ty.startswith('دائرة في التطوع'):                       # جديد: المحطة ٨
        out['kind'] = 'vcycle'
        out['cycle'] = re.match(r'دائرة في التطوع: ([^(]+)', ty).group(1).strip()
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
    return re.sub(r'^[أبجد]\.\s*', '', t)


def triad_station(k, items_raw):
    full = []
    for it in items_raw:
        b = it['body']
        note = note_of(b)
        ax = triad_axes(note)
        light = 'الحالة: خفيف' in note
        opts = [b[1], b[2], b[3]]
        extra = next((x.split(': ', 1)[1] for x in b if x.startswith('زرار إضافي')), None)
        if light:
            assert extra == NOT_YET, f's{k}n{num(it["h"])}: الموقف الخفيف لازم يكون معاه زرار «{NOT_YET}»'
        dom = re.search(r'الميدان: ([^·]+)', note)
        sign = re.search(r'العلامة: ([^·]+)', note)
        full.append({'id': f's{k}n{num(it["h"])}', 'n': num(it['h']), 'text': b[0], 'light': light,
                     **({'skip': extra} if extra else {}),
                     'domain': dom.group(1).strip() if dom else '', **({'sign': sign.group(1).strip()} if sign else {}),
                     'desirable': meta(note)['desirable'],
                     'options': [{'id': f'o{j+1}', 'text': opts[j], 'axis': AXIS[ax[j][0]], 'dim': DIM_BY_NAME[ax[j][1]][0]}
                                 for j in range(3)]})
    return full


def main(path, version=None):
    doc = load(path)
    tabs = {t['tabProperties']['title']: t for t in doc['tabs']}
    M = sections(seq_of(doc['tabs'][0]))
    C_seq = seq_of(tabs[CLIENT_TAB])
    C = sections(C_seq)

    # ───────── التاب الأساسي ─────────
    full = {'station1': triad_station(1, h3_items(M[SEC[1]], 'الموقف')),
            'station2': triad_station(2, h3_items(M[SEC[2]], 'المحطة ٢')),
            'station7': triad_station(7, h3_items(M[SEC[7]], 'المحطة ٧')),
            'freq': [], 'bipolar': [], 'vcycle': [], 'vnow': None}

    for k in (3, 4, 5, 6, 9):
        for it in h3_items(M[SEC[k]], 'المحطة'):
            h, b = it['h'], it['body']
            if 'الجزء الأخير' in h:
                continue
            note, n = note_of(b), num(h)
            mm = meta(note)
            if 'سؤال الطرفين' in h:
                a = strip_opt(next(x for x in b if x.startswith('أ. ')))
                bb = strip_opt(next(x for x in b if x.startswith('ب. ')))
                poles = re.search(r'الطرف «أ» = قطب ([^،·]+)، والطرف «ب» = قطب ([^·]+)', note)
                full['bipolar'].append({'id': f's6t{n}', 'n': n, 'axis': AXIS[mm['dim']], 'tension': mm['type'].split(': ', 1)[1],
                                        'poleA': poles.group(1).strip(), 'poleB': poles.group(2).strip(),
                                        'text': b[0], 'a': a, 'b': bb})
                continue
            text = None if b[0].startswith('[') else b[0]
            full['freq'].append(classify(k, n, text, mm))

    for it in h3_items(M[SEC[8]], 'المحطة ٨'):
        h, b = it['h'], it['body']
        if 'إنت فين' in h:
            note = note_of(b)
            opts = [x for x in b[1:] if not x.startswith('داخلي')]
            coach = re.search(r'الاختيارات ([٠-٩ و]+) بتظهر في ورقة الكوتش', note)
            flag = [int(x.translate(AR)) for x in re.findall(r'[٠-٩]', coach.group(1))] if coach else []
            full['vnow'] = {'id': 's8now', 'text': b[0], 'selfReport': True,
                            'options': [{'id': f'w{j+1}', 'text': o, 'coachFlag': (j + 1) in flag} for j, o in enumerate(opts)]}
            continue
        n = num(h)
        mm = meta(note_of(b))
        c = classify(8, n, b[0], mm)
        c['early'] = EARLY
        c['moodAlert'] = False      # قرار المراجعة: عبارات دايرة التطوع ما بتشغّلش تنبيه تقلّب المزاج
        full['vcycle'].append(c)

    # جدول الاستبدال (المحطة ٩ = المحطة ٧ في v2)
    s9_table = next(t for st, t, _ in M[SEC[9]] if st == 'TABLE')
    adaptive = {'rows': [], 'general': None}
    for r in s9_table[1:]:
        m = re.match(r'(الحفظ|الحيوية|الانتماء) ← (الحفظ|الحيوية|الانتماء)', r[0])
        if m:
            adaptive['rows'].append({'main': AXIS[m.group(1)], 'suppressed': AXIS[m.group(2)], 'slots': r[1:5]})
        else:
            adaptive['general'] = {'slots': r[1:5]}
    assert len(adaptive['rows']) == 6 and adaptive['general'], 'جدول الاستبدال ناقص'

    # ───────── تاب المتطوع: النصوص الثابتة ─────────
    welcome = []
    for st, t, sz in C_seq:
        if st == 'HEADING_2':
            break
        if st == 'NORMAL_TEXT' and t.strip():
            welcome.append(t)
    title = welcome.pop(0)

    pre = [(t, sz) for st, t, sz in C['قبل ما نبدأ'] if st != 'TABLE' and t.strip()]
    start_qs, cur, followup, thanks = [], None, None, None
    for t, sz in pre:
        if t.startswith('☐'):
            cur['options'].append(t.lstrip('☐ ').strip())
        elif sz == 9:
            continue
        elif '(شوية، متوسط، كتير)' in t:
            followup = {'question': t.replace(' (شوية، متوسط، كتير)', ''), 'options': ['شوية', 'متوسط', 'كتير']}
        elif followup:
            thanks = t
        else:
            cur = {'question': t, 'options': []}
            start_qs.append(cur)
    keys = ['form', 'age', 'role', 'tenure', 'period']
    assert len(start_qs) == 5, [q['question'] for q in start_qs]
    start = {}
    for key, q in zip(keys, start_qs):
        start[key] = {'question': q['question'],
                      'options': [{'id': f'{key[0]}{j+1}', 'text': o} for j, o in enumerate(q['options'])]}
    start['period']['options'][-1]['none'] = True
    start['period']['multi'] = True
    start['period']['followup'] = followup
    start['period']['thanks'] = thanks

    def client_station(n):
        key = next(k for k in C if k.startswith(f'المحطة {str(n).translate(AN)}:'))
        intro, outro, seen, bip, in_bip = [], None, False, {'title': None, 'intro': None}, False
        for st, t, sz in C[key]:
            if st == 'HEADING_3':
                in_bip, bip['title'] = True, t
                continue
            if st == 'TABLE' or not t.strip() or sz == 9:
                continue
            if re.match(r'^[٠-٩]+\.\s', t) or re.match(r'^[أبجد]\.\s', t) or t.startswith('☐') or t.startswith('وفي الآخر:'):
                seen = True
                continue
            if in_bip and bip['intro'] is None:
                bip['intro'] = t
                continue
            if not seen:
                intro.append(t)
            else:
                outro = t
        return key, intro, outro, (bip if bip['title'] else None)

    stations = []
    for n in range(1, 10):
        key, intro, outro, bip = client_station(n)
        s = {'id': n, 'title': key.split(': ', 1)[1], 'intro': intro, 'transition': outro}
        if bip:
            s['bipolar'] = {**bip, 'scale': ['أقرب لـ«أ»', 'أقرب شوية لـ«أ»', 'في النص', 'أقرب شوية لـ«ب»', 'أقرب لـ«ب»']}
        stations.append(s)
    closing_key = next(k for k in C if k.startswith('الختام'))
    closing = [t for st, t, sz in C[closing_key] if t.strip() and st == 'NORMAL_TEXT']

    # ───────── تطابق التابين ─────────
    client_text = '\n'.join(t for st, t, sz in C_seq if st != 'TABLE')
    missing = []
    def need(label, x):
        if x and x not in client_text:
            missing.append(f'{label}: {x[:50]}')
    for key in ('station1', 'station2', 'station7'):
        for it in full[key]:
            need(it['id'], it['text'])
            for o in it['options']:
                need(it['id'] + '/' + o['id'], o['text'])
            if it.get('skip'):
                need(it['id'] + '/زرار', it['skip'])
    for it in full['freq'] + full['vcycle']:
        need(it['id'], it['text'])
    for it in full['bipolar']:
        for x in (it['text'], it['a'], it['b']):
            need(it['id'], x)
    need('s8now', full['vnow']['text'])
    for o in full['vnow']['options']:
        need('s8now/' + o['id'], o['text'])
    if missing:
        sys.exit('نصوص في التاب الأساسي ومش في تاب المتطوع:\n  ' + '\n  '.join(missing))

    # ───────── العدد ─────────
    counts = {1: len(full['station1']), 2: len(full['station2']),
              **{k: len([x for x in full['freq'] if x['station'] == k]) for k in (3, 4, 5, 9)},
              6: len([x for x in full['freq'] if x['station'] == 6]) + len(full['bipolar']),
              7: len(full['station7']), 8: len(full['vcycle']) + (1 if full['vnow'] else 0)}
    counts = dict(sorted(counts.items()))
    if counts != EXPECTED:
        sys.exit(f'العدد مش مظبوط: {counts}، والمتوقع {EXPECTED}')
    total = sum(counts.values()) + len(start)

    # ───────── فحص توزيع المحطة ٧ ─────────
    core = [it for it in full['station7'] if not it['light']]
    pos = Counter((o['axis'], j) for it in core for j, o in enumerate(it['options']))
    dims = Counter(o['dim'] for it in core for o in it['options'])
    doms = Counter(it['domain'] for it in full['station7'])
    probs = []
    if len(core) != 15:
        probs.append(f'المواقف الأساسية {len(core)} مش ١٥')
    for a in 'HVA':
        for j in range(3):
            if pos[(a, j)] != 5:
                probs.append(f'{AXIS_NAME[a]} في المكان {j+1}: {pos[(a, j)]}')
    for d_, _, _ in DIMS:
        if dims[d_] != 5:
            probs.append(f'{d_}: {dims[d_]}')
    for it in full['station7']:
        if sorted(o['axis'] for o in it['options']) != ['A', 'H', 'V']:
            probs.append(f'{it["id"]}: مش فيه اختيار لكل محور')
    if probs:
        sys.exit('توزيع المحطة ٧ فيه مشكلة:\n  ' + '\n  '.join(probs))

    full_body = {
        'axes': {a: {'name': AXIS_NAME[a], 'dims': [d_ for d_, n_, ax in DIMS if ax == a]} for a in 'HVA'},
        'dims': [{'id': d_, 'name': n_, 'axis': ax} for d_, n_, ax in DIMS],
        **full, 'adaptive': adaptive,
        'client': {'welcome': {'title': title, 'paragraphs': welcome}, 'start': start, 'closing': closing, 'stations': stations},
    }

    # ───────── صيغة المؤنث ─────────
    sys.path.insert(0, os.path.join(ROOT, 'fem'))
    import fem as FEM
    full_body['fem'] = FEM.attach(FEM.collect_items(full_body), 'items')

    qhash = hashlib.sha1(json.dumps(full_body, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:12]
    lock = json.load(open(LOCK, encoding='utf-8')) if os.path.exists(LOCK) else None
    if version is None:
        if not lock:
            sys.exit('مفيش قفل لسه. أول مرة لازم تحدد النسخة: --version 1.0')
        version = lock['version']
    if lock and version == lock['version'] and qhash != lock['hash']:
        sys.exit(f'الأسئلة اتغيرت ({lock["hash"]} ← {qhash}) ورقم النسخة لسه {version}. ارفع الرقم.')
    gen = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    os.makedirs(ENGINE_DIR, exist_ok=True)
    json.dump({'name': 'ميزان المتطوع — الأسئلة', 'version': version, 'derivedFrom': 'مقياس المحاور v2 — الأسئلة 2.1',
               'hash': qhash, 'generated': gen, 'docRevision': doc.get('revisionId', '')[:16], **full_body},
              open(os.path.join(ENGINE_DIR, 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not lock or lock['version'] != version:
        history = (lock or {}).get('history', [])
        if lock:
            history.append({'version': lock['version'], 'hash': lock['hash'], 'lockedAt': lock['lockedAt']})
        json.dump({'version': version, 'hash': qhash, 'lockedAt': gen, 'history': history},
                  open(LOCK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # ───────── تقرير البناء ─────────
    dim_name = {d_: n_ for d_, n_, _ in DIMS}
    L = ['# تقرير بناء «ميزان المتطوع — الأسئلة»', '',
         f'- النسخة: **{version}** · الهاش: `{qhash}` · اتولّد: {gen} · مراجعة الدوك: `{doc.get("revisionId", "")[:16]}`',
         f'- المجموع: **{total}** بند ({sum(counts.values())} في المحطات + {len(start)} أسئلة بداية)',
         f'- تطابق التاب الأساسي وتاب المتطوع: ✓', f'- صيغة المؤنث: {len(full_body["fem"])} جملة ليها نسخة مؤنثة، وكل الجمل اتراجعت', '',
         '## العدد في كل محطة', '', '| المحطة | العدد |', '|---|---|']
    L += [f'| {str(k).translate(AN)}. {stations[k-1]["title"]} | {str(v).translate(AN)} |' for k, v in counts.items()]
    L += ['', '## المحطة ٧: ربط كل اختيار بمحوره وبُعده', '', '| الموقف | الميدان | الحالة | ١ | ٢ | ٣ |', '|---|---|---|---|---|---|']
    for it in full['station7']:
        L.append(f'| {str(it["n"]).translate(AN)} | {it["domain"]} | {"خفيف" if it["light"] else "أساسي"} | ' +
                 ' | '.join(f'{AXIS_NAME[o["axis"]]} / {dim_name[o["dim"]]}' for o in it['options']) + ' |')
    L += ['', '### توزيع المحطة ٧ (الأساسي)', '',
          'كل محور في كل مكان: ' + ' · '.join(f'{AXIS_NAME[a]} {pos[(a,0)]}/{pos[(a,1)]}/{pos[(a,2)]}' for a in 'HVA'),
          '', 'كل بُعد: ' + ' · '.join(f'{dim_name[d_]} {dims[d_]}' for d_, _, _ in DIMS),
          '', 'الميادين: ' + ' · '.join(f'{k} {v}' for k, v in doms.items()),
          '', '## المحطة ٨', '', '| العبارة | المحور | الدايرة | تنبيه المزاج |', '|---|---|---|---|']
    for it in full['vcycle']:
        L.append(f'| {str(it["n"]).translate(AN)} | {AXIS_NAME[it["axis"]]} | {it["cycle"]} | لا |')
    L += ['', f'سؤال «إنت فين دلوقتي؟»: {len(full["vnow"]["options"])} اختيارات، كلام المتطوع عن نفسه. ' +
          'اللي بيظهر في ورقة الكوتش: ' + '، '.join(o['id'] for o in full['vnow']['options'] if o['coachFlag'])]
    os.makedirs(os.path.join(ROOT, 'checks'), exist_ok=True)
    open(os.path.join(ROOT, 'checks', 'build_report.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'ميزان المتطوع — الأسئلة {version} ({qhash}) · المجموع {total}', counts)


if __name__ == '__main__':
    args = sys.argv[1:]
    v = None
    if '--version' in args:
        i = args.index('--version')
        v = args[i + 1]
        del args[i:i + 2]
    main(args[0], v)
