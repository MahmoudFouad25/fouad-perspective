# -*- coding: utf-8 -*-
"""بيطلّع نصوص التقرير من دوك «مقياس المحاور ٢ — نصوص التقرير» لملف texts.json.
الدوك هو المرجع: أي تعديل في اللغة بيتعمل فيه، وبعدين السكريبت ده بيتشغل تاني.

الاستعمال:
  python3 extract_texts.py doc.json                 ← النصوص زي ما هي (لازم تطلع نفس الهاش المقفول)
  python3 extract_texts.py doc.json --version 1.1   ← لما أي نص يتغيّر في الدوك
  (doc.json = ناتج documents.get زي ما هو، أو مفتاح content بتاعه)
القفل زي الأسئلة بالظبط (texts.lock.json): لو النصوص اتغيّرت ورقم النسخة زي ما هو، السكريبت بيرفض،
ولو الرقم اتغيّر والنصوص زي ما هي، بيرفض برضه. وكل تقرير بيتسجل معاه textsVersion اللي اتبنى بيها.
الشكل: texts[«القسم»][«الحالة»] = {paras: [...], bullets: [...], insight: «...»}
  • السطور اللي بتبدأ بـ«داخلي —» ما بتدخلش.
  • السطر الأخضر «جوه البصيرة الحكيمة: …» بيتحط في insight.
"""
import json, sys, os, hashlib, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
LOCK = os.path.join(HERE, 'texts.lock.json')


def bump(v):
    a = v.split('.'); a[-1] = str(int(a[-1]) + 1); return '.'.join(a)


def lock_and_write(texts, revision, version=None):
    h = hashlib.sha1(json.dumps(texts, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:12]
    lock = json.load(open(LOCK, encoding='utf-8')) if os.path.exists(LOCK) else None
    if version is None:
        if not lock:
            sys.exit('مفيش قفل لسه. أول مرة لازم تحدد النسخة: --version 1.0')
        version = lock['version']
    if lock and version == lock['version'] and h != lock['hash']:
        sys.exit(f'النصوص اتغيّرت ({lock["hash"]} ← {h}) ورقم النسخة لسه {version}. ارفع الرقم (--version {bump(version)}).')
    if lock and version != lock['version'] and h == lock['hash']:
        sys.exit(f'رقم النسخة اتغيّر ({lock["version"]} ← {version}) والنصوص زي ما هي. سيب الرقم زي ما هو.')
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    out = {'version': version, 'hash': h, 'docRevision': revision, 'texts': texts}
    json.dump(out, open(os.path.join(HERE, 'texts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not lock or lock['version'] != version:
        hist = (lock or {}).get('history', [])
        if lock:
            hist.append({'version': lock['version'], 'hash': lock['hash'], 'lockedAt': lock['lockedAt']})
        json.dump({'version': version, 'hash': h, 'lockedAt': now, 'history': hist},
                  open(LOCK, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'texts.json · النسخة {version} ({h}) · {len(texts)} أقسام')


def main(path, version=None):
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
    lock_and_write(texts, d.get('revisionId', '')[:16], version)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('doc')
    ap.add_argument('--version', default=None, help='رقم نسخة النصوص. لازم يترفع لو أي نص اتغيّر.')
    a = ap.parse_args()
    main(a.doc, a.version)
