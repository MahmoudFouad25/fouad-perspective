# -*- coding: utf-8 -*-
"""بيبني report/texts.json لـ«ميزان المتطوع».

  نصوص v2 (three-axes/v2/report/texts.json، نسخة 1.3، بتتقري بس)
  + اللي اتغير واتضاف في دوك «ميزان المتطوع — نصوص التقرير» (volunteer_texts.py)
  − كل سطور «جوه البصيرة الحكيمة» (مالهاش وجود عند المتطوعين)
  + صيغة المؤنث (fem/texts.fem.json)
  ← texts.json مقفول بنسخة وهاش (texts.lock.json)، بنفس طريقة القفل بتاعة v2.

  python3 build_texts.py                ← بيرفض لو النصوص اتغيرت ورقم النسخة زي ما هو
  python3 build_texts.py --version 1.1  ← بعد أي تعديل في الدوك
  python3 build_texts.py --dump all.json ← كل الجمل في ملف واحد (لـcheck_doc.py)
"""
import json, os, sys, copy, hashlib, datetime, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
V2_TEXTS = os.path.join(ROOT, '..', 'three-axes', 'v2', 'report', 'texts.json')
LOCK = os.path.join(HERE, 'texts.lock.json')
sys.path.insert(0, HERE)
import volunteer_texts as VT  # noqa: E402

ORDER = ['١. الافتتاح', '٢. خريطتك في سطر', '٣. مسارك الأقوى', '٤. مسارك المساند', '٥. مسارك الهادي',
         '٦. إنت والتطوع', '٧. أبعادك']


def build():
    v2 = json.load(open(V2_TEXTS, encoding='utf-8'))
    if v2['version'] != '1.3':
        sys.exit(f'نصوص v2 نسختها {v2["version"]} مش 1.3. راجع الفرق قبل ما تبني.')
    t = copy.deepcopy(v2['texts'])
    for old, new in VT.RENAME.items():
        t[new] = t.pop(old)
    for sec, part in VT.DROP_PARTS:
        del t[sec][part]
    for sec, old, new in VT.RENAME_PARTS:
        t[sec][new] = t[sec].pop(old)
    for sec in t.values():                       # مفيش بصيرة حكيمة عند المتطوعين
        for p in sec.values():
            p['insight'] = None
    for (sec, part, i), txt in VT.REPLACE_PARAS.items():
        t[sec][part]['paras'][i] = txt
    for (sec, part), paras in VT.SET_PARAS.items():
        t[sec][part]['paras'] = list(paras)
    t.update(copy.deepcopy(VT.NEW_SECTIONS))
    # ترتيب الأقسام زي الدوك
    out = {}
    for k in ORDER:
        out[k] = t.pop(k)
    # المساحات التسعة والقوالب بعد «٧. أبعادك» بنفس ترتيب v2
    for k in [k for k in v2['texts'] if k not in VT.RENAME and k not in ORDER and not k.startswith('جدول') and not k.startswith('عدد')]:
        out[k] = t.pop(k)
    for k in ['٨. موجاتك وميلك', '٩. دايرتك في التطوع', '١٠. لما الضغط يزيد', '١١. خطوة واحدة للأسبوع ده', '١٢. الختام',
              'جدول الاقتباسات: أسامي المواقف القصيرة (المحطة ١)', 'جدول الاقتباسات: أسامي المواقف القصيرة (المحطة ٧)']:
        out[k] = t.pop(k)
    t.pop('عدد الكلمات التقريبي لتقرير نموذجي', None)   # جدول تقديري في الدوك، مش نص للمتطوع
    if t:
        sys.exit('أقسام فاضلة ما اترتبتش: ' + ', '.join(t))
    return out, v2


def strings(texts):
    s = []
    for sec, v in texts.items():
        for h, p in v.items():
            s += p['paras'] + p['bullets']
            for tb in p.get('tables', []):
                for r in tb:
                    s += r
    return list(dict.fromkeys(x for x in s if x))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--version', default=None)
    ap.add_argument('--dump', default=None)
    ap.add_argument('--no-fem', action='store_true', help='من غير فحص المؤنث (للمراجعة بس، ما بيكتبش texts.json)')
    a = ap.parse_args()
    texts, v2 = build()
    if a.dump:
        json.dump(strings(texts), open(a.dump, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        print(f'{len(strings(texts))} جملة ← {a.dump}')
    if a.no_fem:
        return
    sys.path.insert(0, os.path.join(ROOT, 'fem'))
    import fem as FEM
    fem = FEM.attach(FEM.collect_texts(texts), 'texts')
    payload = {'texts': texts, 'fem': fem}
    h = hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:12]
    lock = json.load(open(LOCK, encoding='utf-8')) if os.path.exists(LOCK) else None
    version = a.version or (lock and lock['version'])
    if not version:
        sys.exit('مفيش قفل لسه. أول مرة: --version 1.0')
    if lock and version == lock['version'] and h != lock['hash']:
        sys.exit(f'النصوص اتغيرت ({lock["hash"]} ← {h}) ورقم النسخة لسه {version}. ارفع الرقم.')
    if lock and version != lock['version'] and h == lock['hash']:
        sys.exit('رقم النسخة اتغير والنصوص زي ما هي. سيب الرقم.')
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    json.dump({'name': 'ميزان المتطوع — نصوص التقرير', 'version': version, 'hash': h,
               'derivedFrom': 'مقياس المحاور v2 — نصوص التقرير ' + v2['version'], 'texts': texts, 'fem': fem},
              open(os.path.join(HERE, 'texts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not lock or lock['version'] != version:
        hist = (lock or {}).get('history', [])
        if lock:
            hist.append({k: lock[k] for k in ('version', 'hash', 'lockedAt')})
        json.dump({'version': version, 'hash': h, 'lockedAt': now, 'history': hist}, open(LOCK, 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    print(f'texts.json · النسخة {version} ({h}) · {len(texts)} قسم · {len(fem)} جملة ليها مؤنث')


if __name__ == '__main__':
    main()
