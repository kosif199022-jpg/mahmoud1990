# -*- coding: utf-8 -*-
"""يبني فصول عدّة ACCA DipIFR: أقسام كبرى تُقسَّم عند حدود الأسئلة المرقّمة تصاعديًا."""
import json, re

pgs = json.load(open("work/b2.json", encoding="utf-8"))

SEC = re.compile(r'^(INTRODUCTION|QUESTIONS?|ANSWERS?|MOCK\s*EXAM\s*(\d))\b', re.I)
QHEAD = re.compile(
    r'^(\d{1,3})\s+([A-Z][A-Za-z][A-Za-z \-\'&/\.]{1,44}?)'
    r'\s*(\([A-Za-z]{3,9}\s*\d{4}\)|\(\d{4}\))?\s*(?:\(amended\))?\s*(\d{2,3}\s*mins?)?\s*$')
NOISE = re.compile(r'^(Current|Cost|Gain|Total|Net|Profit|Loss|Cash|Trade|Other|Deferred|Retained)\b', re.I)


def section_of(page):
    for l in page.splitlines()[:3]:
        m = SEC.match(l.strip())
        if m:
            s = re.sub(r'\s+', ' ', l.strip().rstrip(':;| ')).upper()
            s = re.sub(r'[;|]', ':', s)
            if m.group(2):                       # اختبار تجريبي
                kind = 'ANSWERS' if 'ANSWER' in s else 'QUESTIONS'
                return f"MOCK EXAM {m.group(2)}: {kind}"
            return 'QUESTIONS' if s.startswith('QUESTION') else \
                   'ANSWERS' if s.startswith('ANSWER') else 'INTRODUCTION'
    return None


# ١) قسم كل صفحة
secs, cur = [], None
for p in pgs:
    s = section_of(p)
    if s: cur = s
    secs.append(cur or 'INTRODUCTION')

# ٢) حدود الأسئلة: في صدر الصفحة + رقم تصاعدي داخل القسم
bounds = {}
lastno = {}
for i, p in enumerate(pgs):
    for l in p.splitlines():
        m = QHEAD.match(l.strip())
        if not m:
            continue
        no, name = int(m.group(1)), m.group(2).strip()
        if NOISE.match(name) or len(name) < 3:
            continue
        prev = lastno.get(secs[i], 0)
        if no <= prev or no > prev + 3:          # يجب أن يتقدّم بخطوة معقولة
            continue
        lastno[secs[i]] = no
        date = (m.group(3) or '').strip()
        bounds[i] = f"{no}. {name}{' ' + date if date else ''}"
        break

# ٣) بناء الفصول
cuts = sorted(set([0] + list(bounds.keys()) +
                  [i for i in range(1, len(pgs)) if secs[i] != secs[i-1]]))
chapters = []
for k, a in enumerate(cuts):
    b = (cuts[k+1] - 1) if k + 1 < len(cuts) else len(pgs) - 1
    body = []
    for pi in range(a, b + 1):
        for l in pgs[pi].splitlines():
            s = l.strip()
            if not s or SEC.match(s) or re.fullmatch(r'[\d\s|™©\-—_.]{0,8}', s):
                continue
            body.append(["p", s])
    if len(body) < 3:
        continue
    chapters.append({
        "no": len(chapters) + 1,
        "title": bounds.get(a, secs[a]),
        "name": secs[a] if a in bounds else "",
        "pages": [a + 1, b + 1],
        "body": body,
        "words": sum(len(t.split()) for _, t in body),
    })

json.dump(chapters, open("work/b2_ch.json", "w", encoding="utf-8"), ensure_ascii=False)
print(f"═══ b2: {len(chapters)} فصلًا | {sum(c['words'] for c in chapters):,} كلمة ═══")
for c in chapters[:10]:
    print(f"  {c['no']:>2}. {c['title'][:44]:<44} {c['name'][:22]:<22} ص{c['pages'][0]}–{c['pages'][1]} · {c['words']:,} ك")
print(f"  … و{len(chapters)-10} فصلًا")
