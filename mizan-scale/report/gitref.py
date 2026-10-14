# -*- coding: utf-8 -*-
"""اسم الملف + رقم آخر commit غيّره، علشان أي حاجة الوثيقة بتقول إنها في الريبو يبقى جنبها دليلها (قرار المراجعة).
لو الملف مش في الريبو، أو فيه تعديل لسه ما اترفعش ← «لسه»، والسكريبت اللي بيبني الدوك بيقف (strict)."""
import os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def _git(*a):
    return subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True).stdout.strip()


def ref(path, strict=True):
    """path نسبي من أول الريبو (زي mizan-scale/report/render.js)."""
    h = _git('log', '-1', '--format=%h', '--', path)
    dirty = _git('status', '--porcelain', '--', path)
    if not h or dirty:
        if strict:
            sys.exit(f'[gitref] {path}: ' + ('مش في الريبو' if not h else 'فيه تعديل لسه ما اترفعش') + ' — اعمل commit الأول، وبعدين ابني الدوك.')
        return f'{path} (لسه)'
    return f'{path} (commit {h})'
