# -*- coding: utf-8 -*-
"""يصحّح أخطاء التعرّف الضوئي في كتاب ACCA بأدلة، ويسجّل كل تبديل.

القاعدة: لا يُصحَّح إلا ما اجتمع فيه:
  ١) الكلمة ليست في قاموس Hunspell ولا في مفردات الكتاب المتكررة
  ٢) لها مرشّح واحد فقط على مسافة تحرير ١، ناتج عن خلط حروف معروف في OCR
  ٣) المرشّح متكرر في الكتاب نفسه (≥ ١٥ مرة) وفي القاموس
"""
import json, re, collections, itertools

# ── قاموس ──
DICT = set()
for line in open("/usr/share/hunspell/en_US.dic", encoding="utf-8", errors="ignore"):
    w = line.split('/')[0].strip()
    if w and w.isalpha():
        DICT.add(w.lower())

# خلط الحروف الشائع في التعرّف الضوئي (اتجاهان)
CONFUSE = [('e','a'),('l','t'),('l','f'),('l','i'),('r','n'),('r','a'),('m','n'),
           ('c','e'),('o','a'),('o','e'),('u','n'),('s','g'),('t','f'),('i','j'),
           ('h','b'),('d','a'),('v','y'),('g','q'),('b','h'),('y','v'),('n','h'),
           ('c','o'),('i','l'),('f','t'),('a','e'),('t','l'),('rn','m')]
CONF = set()
for a, b in CONFUSE:
    CONF.add((a, b)); CONF.add((b, a))


def one_sub_variants(w):
    """كل الكلمات الناتجة عن تبديل حرف واحد بخلط معروف."""
    out = set()
    lo = w.lower()
    for i, c in enumerate(lo):
        for a, b in CONF:
            if len(a) == 1 and len(b) == 1 and c == a:
                out.add(lo[:i] + b + lo[i+1:])
    return out


# ── معجم المجال: تصحيحات مؤكدة لا تحتاج استدلالًا ──
DOMAIN = {
    'IFAS': 'IFRS', 'IFAs': 'IFRS', 'lFRS': 'IFRS', 'IFRs': 'IFRS',
    'lAS': 'IAS', 'JAS': 'IAS', 'DiplFR': 'DipIFR', 'DipIFA': 'DipIFR',
}

def load():
    return json.load(open("work/b2_ch.json", encoding="utf-8"))


def build_corrections(chapters):
    txt = "\n".join(t for c in chapters for _, t in c["body"])
    toks = re.findall(r"[A-Za-z][A-Za-z']{1,}", txt)
    F = collections.Counter(t.lower() for t in toks)
    # مفردات موثوقة: في القاموس أو متكررة بقوة في الكتاب
    trusted = {w for w, n in F.items() if w in DICT or n >= 25}

    rules, ambiguous = {}, []
    for w, n in F.items():
        if n > 3 or w in DICT or len(w) < 4:
            continue
        cands = [v for v in one_sub_variants(w)
                 if v in trusted and v in DICT and F.get(v, 0) >= 15]
        if len(cands) == 1:
            rules[w] = cands[0]
        elif len(cands) > 1:
            ambiguous.append((w, n, cands))
    return rules, ambiguous, F


def apply_all(chapters, rules):
    log = collections.Counter()

    def fix_word(m):
        w = m.group(0)
        if w in DOMAIN:
            log[(w, DOMAIN[w])] += 1
            return DOMAIN[w]
        r = rules.get(w.lower())
        if not r:
            return w
        # الحفاظ على حالة الأحرف الأصلية
        out = r.capitalize() if w[0].isupper() else r
        if w.isupper():
            out = r.upper()
        log[(w, out)] += 1
        return out

    for c in chapters:
        for b in c["body"]:
            b[1] = re.sub(r"[A-Za-z][A-Za-z']+", fix_word, b[1])
    return log


# ── تمريرة ثانية: كلمات قاموسية صحيحة لكنها مغلوطة في هذا السياق.
# كل واحدة رُوجعت بفحص جميع مواضعها يدويًا قبل الإدراج.
CONTEXT = {
    'deterred':'deferred', 'currant':'current', 'toss':'loss', 'lite':'life',
    'bean':'been', 'tease':'lease', 'expanse':'expense', 'tess':'less',
    'wall':'well', 'ware':'were', 'tosses':'losses',
}
# التصاقات ناتجة عن ضياع المسافة في المسح
GLUED = {'Daterredtax':'Deferred tax', 'deterredtax':'deferred tax'}
# رُفضت بعد المراجعة لأنها صحيحة في سياقها:
#   data (Present data and information)، self (self-contained)، hold (will hold
#   these assets)، changed (rate has changed)، mode (revenue recognition model)

def apply_context(chapters, log):
    for c in chapters:
        for b in c["body"]:
            for a, r in GLUED.items():
                if a in b[1]:
                    log[(a, r)] += b[1].count(a); b[1] = b[1].replace(a, r)
    def f(m):
        w = m.group(0); r = CONTEXT.get(w.lower())
        if not r: return w
        out = r.upper() if w.isupper() else (r.capitalize() if w[0].isupper() else r)
        log[(w, out)] += 1
        return out
    for c in chapters:
        for b in c["body"]:
            b[1] = re.sub(r"[A-Za-z][A-Za-z']+", f, b[1])


if __name__ == "__main__":
    ch = load()
    rules, amb, F = build_corrections(ch)
    print(f"قاموس Hunspell: {len(DICT):,} كلمة")
    print(f"قواعد مؤكدة (مرشّح واحد): {len(rules)}")
    print(f"حالات ملتبسة (تُترك دون مساس): {len(amb)}")
    log = apply_all(ch, rules)
    apply_context(ch, log)
    json.dump(ch, open("work/b2_ch.json", "w", encoding="utf-8"), ensure_ascii=False)

    lines = ["# سجل تصحيح كتاب ACCA DipIFR", "",
             f"إجمالي التبديلات: {sum(log.values()):,} في {len(log)} صيغة مختلفة.", "",
             "| الخطأ | التصحيح | مرات |", "|---|---|---|"]
    for (a, b), n in log.most_common():
        lines.append(f"| {a} | {b} | {n} |")
    if amb:
        lines += ["", "## حالات تُركت لالتباسها", "",
                  "| الكلمة | مرات | المرشّحون |", "|---|---|---|"]
        for w, n, c in sorted(amb, key=lambda x: -x[1])[:40]:
            lines.append(f"| {w} | {n} | {', '.join(c)} |")
    open("work/b2_fixlog.md", "w", encoding="utf-8").write("\n".join(lines))

    print(f"\nتبديلات مطبَّقة: {sum(log.values()):,}")
    print("\nأكثر ٢٠ تصحيحًا:")
    for (a, b), n in log.most_common(20):
        print(f"   {a:<16} → {b:<16} ×{n}")
    print("\nعيّنة ملتبسة (لم تُمس):")
    for w, n, c in sorted(amb, key=lambda x: -x[1])[:6]:
        print(f"   {w:<16} ×{n}  ⇒ {c}")
