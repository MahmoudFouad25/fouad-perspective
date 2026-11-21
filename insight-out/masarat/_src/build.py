#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
بنّاء لقاءات «الحكاية».
ملف مصدر واحد (السكربت + اللي بيظهر على الشاشة جنب بعض) ← تلات ملفات:
  liqaa-N.html  (المحطات)    liqaa-N.js  (الخطوات)    liqaa-N-script.js  (السكربت لشاشة الكوتش)

الاستعمال:  python3 _src/build.py _src/liqaa-5.txt
"""
import sys, re, json, html, shlex, os

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
lines = open(SRC, encoding='utf-8').read().split('\n')

meta = {}
stations = []          # {id, ch, cls, no, t, pages:[{cls,start,items:[...]}]}
steps = []             # {mv, st, on, t, sil, rec, timer, tip, script:[]}
extras = []
cur_st = None; cur_pg = None; cur_mv = ''; cur_step = None
group_stack = []
in_extra = None

def ar(n):
    return str(n).translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))

def kin(text):
    out = []; i = 0
    for tok in re.split(r'(\s+)', text.strip()):
        if not tok: continue
        if tok.isspace(): out.append(' '); continue
        out.append('<span class="w" style="--i:%d">%s</span>' % (i, tok)); i += 1
    return ''.join(out)

ICONS = {
  'hifz': '<svg viewBox="-34 -34 68 68"><use href="#i-hifz"/></svg>',
  'hay':  '<svg viewBox="-34 -34 68 68"><use href="#i-hay"/></svg>',
  'int':  '<svg viewBox="-34 -34 68 68"><use href="#i-int"/></svg>',
  'user': '<svg viewBox="0 0 64 64"><circle cx="32" cy="22" r="11" fill="none" stroke="currentColor" stroke-width="4"/><path d="M12,56 C14,42 22,36 32,36 C42,36 50,42 52,56" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
  'heart': '<svg viewBox="0 0 64 64"><path d="M32,54 C14,42 6,32 6,22 C6,13 13,7 21,7 C26,7 30,10 32,14 C34,10 38,7 43,7 C51,7 58,13 58,22 C58,32 50,42 32,54 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>',
  'eye': '<svg viewBox="0 0 64 64"><path d="M4,32 C14,16 50,16 60,32 C50,48 14,48 4,32 Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="currentColor"/></svg>',
  'book': '<svg viewBox="0 0 64 64"><path d="M32,14 C24,9 14,9 6,12 V52 C14,49 24,49 32,54 C40,49 50,49 58,52 V12 C50,9 40,9 32,14 Z M32,14 V54" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>',
  'tree': '<svg viewBox="0 0 64 64"><path d="M32,60 V34 M32,40 L22,30 M32,36 L42,26" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="4"/></svg>',
  'shield': '<svg viewBox="0 0 64 64"><path d="M32,6 L54,14 V30 C54,44 44,54 32,58 C20,54 10,44 10,30 V14 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>',
  'return': '<svg viewBox="0 0 64 64"><path d="M50,22 A20,20 0 1,0 52,40 M50,8 V22 H36" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'angel': '<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="9" fill="none" stroke="currentColor" stroke-width="4"/><path d="M23,30 C14,24 8,26 4,32 C10,34 16,36 23,36 M41,30 C50,24 56,26 60,32 C54,34 48,36 41,36" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="32" cy="17" rx="10" ry="3.5" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  'whisper': '<svg viewBox="0 0 64 64"><path d="M10,40 C10,24 22,14 36,14 C48,14 56,22 56,32 C56,42 48,48 38,48 H26 L14,56 L17,46 C13,44 10,42 10,40 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M26,30 H42 M26,37 H36" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
  'pen': '<svg viewBox="0 0 64 64"><path d="M12,52 L16,40 L44,12 L52,20 L24,48 Z M40,16 L48,24" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M10,58 H54" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>',
  'scale': '<svg viewBox="0 0 64 64"><path d="M32,8 V56 M18,56 H46 M10,18 H54 M10,18 L4,34 H16 Z M54,18 L48,34 H60 Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  'drop': '<svg viewBox="0 0 64 64"><path d="M32,6 C40,20 50,30 50,40 C50,50 42,58 32,58 C22,58 14,50 14,40 C14,30 24,20 32,6 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>',
  'chain': '<svg viewBox="0 0 48 48"><path d="M20,28 L28,20 M17,23 L12,28 C9,31 9,36 12,39 C15,42 20,42 23,39 L28,34 M31,25 L36,20 C39,17 39,12 36,9 C33,6 28,6 25,9 L20,14" fill="none" stroke="#B5842E" stroke-width="4" stroke-linecap="round"/></svg>',
}

def hand(state, label=''):
    rays = '<line class="ray" x1="150" y1="8" x2="150" y2="44"/><line class="ray" x1="96" y1="22" x2="114" y2="54"/><line class="ray" x1="204" y1="22" x2="186" y2="54"/>'
    if state == 'open':
        body = rays + '<circle class="glow" cx="150" cy="118" r="54"/><circle class="orb" cx="150" cy="118" r="34"/><path class="pal" d="M34,148 C70,196 230,196 266,148"/><path class="pal" d="M34,148 C30,140 30,134 36,130 M266,148 C270,140 270,134 264,130"/>'
    elif state == 'hold':
        body = '<line class="ray" x1="150" y1="30" x2="150" y2="62"/><circle class="glow" cx="150" cy="140" r="52"/><circle class="orb" cx="150" cy="140" r="34"/><path class="pal" d="M64,96 C56,160 90,210 150,210 C210,210 244,160 236,96"/><path class="pal" d="M64,96 C70,88 80,88 86,96 M236,96 C230,88 220,88 214,96"/>'
    elif state == 'lean':
        body = '<circle class="glow" cx="150" cy="190" r="48"/><circle class="orb" cx="150" cy="190" r="34"/><path class="pal" d="M30,118 C90,140 200,140 270,150"/><path class="pal" d="M30,118 C24,112 26,104 34,102"/><path d="M110,150 L120,158 M190,150 L180,158" stroke="#B5842E" stroke-width="5" stroke-linecap="round"/>'
    else:  # fist
        body = '<circle class="orb" cx="150" cy="150" r="30" style="opacity:.35"/><path class="pal" d="M150,84 C214,84 244,118 244,150 C244,192 206,218 150,218 C94,218 56,192 56,150 C56,118 86,84 150,84 Z"/><path class="pal" d="M92,96 C100,74 124,74 128,90 M128,90 C134,70 160,70 164,88 M164,88 C170,70 196,72 200,94" style="stroke-width:7"/>'
    lab = '<div class="cs" style="text-align:center;margin-top:6px">%s</div>' % label if label else ''
    return '<svg class="hand" viewBox="0 0 300 230">%s</svg>%s' % (body, lab)

SVGS = {
  'rock': '<svg class="draw" viewBox="0 0 520 330" width="440" height="280"><path d="M120,150 C118,112 160,92 205,96 C228,74 300,74 322,96 C370,94 404,118 400,150 C398,176 360,186 260,186 C160,186 122,176 120,150 Z" fill="rgba(140,120,100,.14)" stroke="#8A7A66" stroke-width="5" style="--len:900"/><path d="M200,120 L232,142 M300,112 L284,140" stroke="#8A7A66" stroke-width="3" stroke-linecap="round" style="--len:60"/><path d="M38,174 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M58,205 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M90,232 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M131,254 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M180,269 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M233,277 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M287,277 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M340,269 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M389,254 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M430,232 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M462,205 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/><path d="M482,174 c6,10 11,16 11,22 a11,11 0 0 1 -22,0 c0,-6 5,-12 11,-22 z" fill="#8CC0CC" stroke="#5E9AA8" stroke-width="3" style="--len:120"/></svg>',
  'chest': '<svg class="chest" viewBox="0 0 420 420"><circle class="ring" cx="210" cy="210" r="150"/></svg>',
  'chest-tight': '<svg class="chest tight" viewBox="0 0 420 420"><circle class="ring" cx="210" cy="210" r="150"/></svg>',
  'earth': '<svg class="draw" viewBox="0 0 400 400" width="360" height="360"><circle cx="200" cy="200" r="150" fill="none" stroke="#B5842E" stroke-width="5" style="--len:960"/><path d="M70,170 C130,150 160,190 220,170 C270,152 300,180 335,165" fill="none" stroke="#B5842E" stroke-width="4" style="--len:320"/><path d="M80,250 C140,236 190,262 250,246 C290,236 310,250 325,246" fill="none" stroke="#B5842E" stroke-width="4" style="--len:300"/></svg>',
  'scroll': '<svg class="draw" viewBox="0 0 520 200" width="520" height="200"><path d="M40,60 H440 C470,60 480,80 480,100 C480,120 470,140 440,140 H80 C50,140 40,120 40,100 Z" fill="none" stroke="#D9AE5C" stroke-width="4" style="--len:1100"/><path d="M110,90 H400 M110,112 H330" fill="none" stroke="#D9AE5C" stroke-width="4" stroke-linecap="round" style="--len:300"/></svg>',
}

def esc_attr(s): return html.escape(s, quote=True)

def add_item(markup, cls='', extra_attr=''):
    lvl = cur_step_level()
    target = group_stack[-1] if group_stack else cur_pg['items']
    target.append('<div class="it %s" data-on="%d"%s>%s</div>' % (cls, lvl, extra_attr, markup))

pending_reveal = [False]
def cur_step_level():
    # أول عنصر في الخطوة بيزوّد مستوى المحطة
    if not pending_reveal[0]:
        cur_st['lv'] += 1
        cur_step['on'] = cur_st['lv']
        pending_reveal[0] = True
        if cur_pg['start'] is None:
            cur_pg['start'] = cur_st['lv']
    return cur_st['lv']

def element(line):
    typ, _, rest = line[1:].strip().partition(' ')
    rest = rest.strip()
    parts = [p.strip() for p in re.split(r'\s*\|\s*', rest)]
    if typ in ('kick','h','hs','q','qs','p','ps','big','huge','note','src'):
        add_item(rest, typ)
    elif typ == 'keep':  # عنوان ما بيهداش
        sub, _, txt = rest.partition(' ')
        add_item(txt, sub+' keep')
    elif typ.startswith('ayah'):
        size = typ[4:].strip('.')
        add_item(kin(parts[0]), 'ayah k '+size)
        if len(parts)>1: group_last_append('<div class="src">%s</div>' % parts[1])
    elif typ.startswith('hadith'):
        size = typ[6:].strip('.')
        add_item(kin(parts[0]), 'hadith k '+size)
        if len(parts)>1: group_last_append('<div class="src">%s</div>' % parts[1])
    elif typ == 'quote':
        add_item(kin(parts[0]), 'quote k')
        if len(parts)>1: group_last_append('<div class="src">%s</div>' % parts[1])
    elif typ == 'badge':
        kind, _, lab = rest.partition(' ')
        add_item('<span class="badge %s">%s</span>' % (kind, lab))
    elif typ == 'li':
        add_item(rest, 'li')
    elif typ == 'lin':
        n, _, txt = rest.partition(' ')
        add_item('<span class="nn">%s</span><span>%s</span>' % (n, txt), 'li n')
    elif typ == 'card':
        cls = parts[0]; ic = ''
        m = re.search(r'ic=(\w[\w-]*)', cls)
        if m:
            ic = '<div class="ic %s">%s</div>' % ('', ICONS.get(m.group(1), '')); cls = cls.replace(m.group(0), '')
        body = ic + '<div class="ct">%s</div>' % parts[1]
        if len(parts) > 2 and parts[2]: body += '<div class="cs">%s</div>' % parts[2]
        if len(parts) > 3 and parts[3]: body += '<div class="cp">%s</div>' % parts[3]
        add_item(body, 'card '+cls.strip())
    elif typ == 'fig':
        cls, icon, cap = (parts + ['', '', ''])[:3]
        add_item('<div class="who">%s</div><div class="cap">%s</div>' % (ICONS.get(icon, ''), cap), 'fig '+cls)
    elif typ in ('tr','th'):
        cells = ''.join('<div class="td">%s</div>' % c for c in parts)
        if typ == 'th':
            target = group_stack[-1] if group_stack else cur_pg['items']
            target.append('<div class="tr th">%s</div>' % cells)
        else:
            add_item(cells, 'tr')
    elif typ == 'chain':
        add_item('<div class="lnk">%s</div><div class="tx">%s</div>' % (ICONS['chain'], rest), 'chain keep')
    elif typ == 'axis':
        n = parts[0]; lab = parts[1] if len(parts) > 1 else ''
        add_item('<span class="dots"><i></i><i></i><i></i></span><span>محطة محور %s</span>%s' % (ar(n), (' · '+lab) if lab else ''), 'axis keep', ' data-ax="%s"' % n)
    elif typ == 'hand':
        st = parts[0]; lab = parts[1] if len(parts) > 1 else ''
        add_item(hand(st, lab), 'handbox')
    elif typ == 'svg':
        add_item(SVGS[rest], 'keep')
    elif typ == 'mirrors':
        n = int(parts[0]); lab = parts[1] if len(parts) > 1 else ''
        h = ''.join('<i class="%s"></i>' % ('now on' if k == n else ('on' if k < n else ('later' if k > 5 else ''))) for k in range(1, 8))
        add_item('<div class="mirs">%s%s</div>' % (h, ('<b>%s</b>' % lab) if lab else ''), 'keep')
    elif typ == 'mirror':
        add_item('<div class="mirror">%s</div>' % rest, 'keep')
    elif typ == 'light':
        add_item('', 'light keep')
    elif typ == 'cdn':
        add_item('', 'cdn keep', ' data-countdown')
    elif typ == 'raw':
        for k, st_ in (('HAND_OPEN','open'),('HAND_HOLD','hold'),('HAND_LEAN','lean'),('HAND_FIST','fist')):
            rest = rest.replace(k, hand(st_))
        add_item(rest, '')
    else:
        raise SystemExit('نوع مش معروف: %r' % typ)

def group_last_append(markup):
    target = group_stack[-1] if group_stack else cur_pg['items']
    last = target[-1]
    target[-1] = last[:-len('</div>')] + markup + '</div>'

def close_step():
    pass

for raw_line in lines + ['@eof']:
    line = raw_line.rstrip()
    if in_extra is not None:
        if line.startswith('@endextra'):
            extras.append(in_extra); in_extra = None
        else:
            in_extra['md'].append(line)
        continue
    if line.startswith('//'): continue
    if line.startswith('@meta '):
        k, _, v = line[6:].partition(' '); meta[k] = v.strip(); continue
    if line.startswith('@extra '):
        in_extra = {'t': line[7:].strip(), 'md': []}; continue
    if line.startswith('@mv '):
        cur_mv = line[4:].strip(); continue
    if line.startswith('@st '):
        args = dict(a.split('=', 1) if '=' in a else (a, '1') for a in shlex.split(line[4:])[1:])
        sid = shlex.split(line[4:])[0]
        cur_st = {'id': sid, 'ch': args.get('ch', ''), 'cls': args.get('cls', ''), 'no': args.get('no', ''), 't': args.get('t', ''), 'lv': 0, 'pages': []}
        stations.append(cur_st)
        cur_pg = {'cls': args.get('pg', ''), 'start': None, 'items': []}
        cur_st['pages'].append(cur_pg)
        continue
    if line.startswith('@pg'):
        cur_pg = {'cls': line[3:].strip(), 'start': None, 'items': []}
        cur_st['pages'].append(cur_pg); continue
    if line.startswith('@group'):
        g = line[6:].strip()
        cls, _, style = g.partition(' ~ ')
        group_stack.append([])
        group_stack[-1].insert(0, ('OPEN', cls, style))
        continue
    if line.startswith('@end'):
        g = group_stack.pop()
        _, cls, style = g[0]
        markup = '<div class="%s"%s>%s</div>' % (cls, (' style="%s"' % style) if style else '', ''.join(g[1:]))
        (group_stack[-1] if group_stack else cur_pg['items']).append(markup)
        continue
    if line.startswith('==='):
        parts = [p.strip() for p in line[3:].split(' | ')]
        cur_step = {'mv': cur_mv, 'st': cur_st['id'], 'on': cur_st['lv'], 't': parts[0], 'script': []}
        for p in parts[1:]:
            k, _, v = p.partition('=')
            cur_step[k.strip()] = v.strip()
        steps.append(cur_step)
        pending_reveal[0] = False
        continue
    if line == '@eof': break
    if line.startswith('+ '):
        element(line); continue
    if cur_step is not None:
        cur_step['script'].append(line)

# ───────── الإخراج ─────────
COLS = 4; GX = 1950; GY = 1300
def pos(n):
    r, c = divmod(n, COLS)
    if r % 2: c = COLS - 1 - c
    return (COLS - 1 - c) * GX, r * GY

out_st = []
for n, s in enumerate(stations):
    x, y = pos(n)
    pages = s['pages']
    ph = []
    for k, p in enumerate(pages):
        start = p['start'] if p['start'] is not None else 0
        nxt = None
        for q in pages[k+1:]:
            if q['start'] is not None: nxt = q['start']; break
        attrs = ' data-on="%d"' % start if start else ''
        if nxt: attrs += ' data-off="%d"' % nxt
        ph.append('<div class="pg %s"%s><div class="pgi">%s</div></div>' % (p['cls'], attrs, ''.join(p['items'])))
    head = ''
    if s['no']:
        head = '<div class="stepno"><b>%s</b>%s</div>' % (s['no'], s['t'])
    sky = '<div class="sky"></div>' if 'night' in s['cls'] else ''
    out_st.append('<section class="st %s" id="%s" data-x="%d" data-y="%d" data-ch="%s">%s%s%s</section>' % (s['cls'], s['id'], x, y, s['ch'], sky, head, ''.join(ph)))

N = meta.get('n', '5')
title = meta.get('title', '')
page = '''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="engine.css">
<link rel="stylesheet" href="hikaya.css">
</head>
<body>
<!-- ملف متولّد من _src/liqaa-%(n)s.txt بـ _src/build.py · التعديل يتعمل في المصدر -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="orbG"><stop offset="0" stop-color="#FFF6DC"/><stop offset=".6" stop-color="#F0C878"/><stop offset="1" stop-color="#C99A42"/></radialGradient>
<symbol id="i-hifz" viewBox="-34 -34 68 68"><path d="M-12,-24 H12 M-9,-24 V-16 C-21,-12 -26,-2 -26,8 C-26,21 -14,28 0,28 C14,28 26,21 26,8 C26,-2 21,-12 9,-16 V-24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M-16,6 C-8,10 8,10 16,6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".6"/></symbol>
<symbol id="i-hay" viewBox="-34 -34 68 68"><path d="M0,-28 C10,-14 22,-6 22,8 C22,20 12,28 0,28 C-12,28 -22,20 -22,8 C-22,-2 -15,-9 -10,-16 C-8,-8 -4,-4 0,-4 C3,-12 1,-20 0,-28 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M0,26 C-6,26 -9,21 -9,16 C-9,10 -4,6 0,2 C4,6 9,10 9,16 C9,21 6,26 0,26 Z" fill="currentColor" opacity=".35"/></symbol>
<symbol id="i-int" viewBox="-34 -34 68 68"><path d="M0,-13 L-14,11 M0,-13 L14,11 M-14,11 L14,11" stroke="currentColor" stroke-width="3" opacity=".55"/><circle cx="0" cy="-13" r="9" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="-14" cy="11" r="9" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="14" cy="11" r="9" fill="none" stroke="currentColor" stroke-width="4"/></symbol>
</defs></svg>
<div id="stage">
<div id="tint"></div>
<div id="world">
%(stations)s
</div><!-- /world -->
</div><!-- /stage -->

<div id="rec"><i></i>التسجيل متوقف · الجزء ده لينا إحنا بس</div>
<svg id="sil" viewBox="0 0 46 46" aria-hidden="true"><circle class="bg" cx="23" cy="23" r="20"/><circle class="fg" cx="23" cy="23" r="20" stroke-dasharray="126" stroke-dashoffset="126"/></svg>
<div id="thread" data-n="%(axn)s"></div>
<div id="hud"></div>
<div id="help"><div class="box">
  <h4>التحكم</h4>
  <p><kbd>←</kbd>أو <kbd>Space</kbd>أو الكليكر: الخطوة الجاية</p>
  <p><kbd>→</kbd>الخطوة اللي فاتت</p>
  <p><kbd>N</kbd>تفتح شاشة الكوتش في شباك لوحده</p>
  <p><kbd>R</kbd>شريط «التسجيل متوقف» يظهر أو يختفي</p>
  <p><kbd>O</kbd>الخريطة كلها (واضغط على أي محطة تروحلها)</p>
  <p><kbd>T</kbd>إيقاف أو تشغيل مؤقّت الكتابة</p>
  <p><kbd>F</kbd>ملء الشاشة · <kbd>H</kbd>شريط صغير برقم الخطوة</p>
</div></div>
<div id="coach"></div>

<script src="engine.js"></script>
<script src="liqaa-%(n)s-script.js"></script>
<script src="liqaa-%(n)s.js"></script>
<script src="hikaya.js"></script>
</body>
</html>
''' % {'title': title, 'n': N, 'stations': '\n'.join(out_st), 'axn': meta.get('axes', '11')}

js_steps = []
tips = {}
for k, s in enumerate(steps):
    o = {'mv': s['mv'], 'st': s['st'], 'on': s['on'], 't': s['t']}
    for key in ('sil', 'timer'):
        if key in s: o[key] = int(s[key])
    if 'rec' in s: o['rec'] = s['rec']
    if 'tip' in s: tips[k] = s['tip']
    js_steps.append(o)

js = '''/* ملف متولّد من _src/liqaa-%(n)s.txt · التعديل يتعمل في المصدر */
(function(){
var steps = %(steps)s;
var tips = %(tips)s;
MapShow.init({ id: 'liqaa-%(n)s', script: window.LIQAA_SCRIPT || null, tips: tips, orbit: {rx:0, ry:0, start:0, s:1}, steps: steps });
})();
''' % {'n': N, 'steps': json.dumps(js_steps, ensure_ascii=False, indent=0), 'tips': json.dumps({str(k): v for k, v in tips.items()}, ensure_ascii=False, indent=0)}

def clean(md):
    t = '\n'.join(md).strip('\n')
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t

script = {'steps': [clean(s['script']) for s in steps], 'extras': [{'t': e['t'], 'md': clean(e['md'])} for e in extras]}
sjs = '/* سكربت اللقاء كامل، متقسّم على خطوات العرض. بيظهر في شاشة الكوتش. ملف متولّد من _src/liqaa-%s.txt */\nwindow.LIQAA_SCRIPT = %s;\n' % (N, json.dumps(script, ensure_ascii=False, indent=0))

open(os.path.join(OUT, 'liqaa-%s.html' % N), 'w', encoding='utf-8').write(page)
open(os.path.join(OUT, 'liqaa-%s.js' % N), 'w', encoding='utf-8').write(js)
open(os.path.join(OUT, 'liqaa-%s-script.js' % N), 'w', encoding='utf-8').write(sjs)
words = sum(len(re.findall(r'\S+', x)) for x in script['steps'])
print('محطات:', len(stations), '· خطوات:', len(steps), '· كلمات السكربت:', words)
