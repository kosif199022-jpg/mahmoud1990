# -*- coding: utf-8 -*-
"""يصحّح أخطاء الاستخراج المتبقية في الكتابين العربيين، ويسجّل كل تعديل.

لا يُحذف حرف ولا تُعاد صياغة جملة. التعديلات ثلاثة أنواع فقط:
  ١) كلمات بقيت معكوسة الترتيب («يف» ← «في»)
  ٢) رقم فقرة أُقحم داخل الجملة ⇒ يُنقل إلى صدر الفقرة حيث موضعه في المطبوع
  ٣) رقم ملتصق بحرف عربي ⇒ تُدرج مسافة (بلا أي تغيير في المحارف)
"""
import json, re, collections

AR = r'\u0621-\u064A'

# ١) كلمات بقيت معكوسة — كلها غير موجودة في العربية بهذه الصورة
REV = {
    'يف': 'في', 'اهلل': 'الله', 'السالم': 'السلام',
    'اإلطار': 'الإطار', 'اإلثبات': 'الإثبات', 'اإلفصاح': 'الإفصاح',
}
REV_RE = re.compile(r'(?<![' + AR + r'])(' + '|'.join(REV) + r')(?![' + AR + r'])')

# ٢) رقم فقرة مُقحَم: أرقام ١–٣ خانات ملتصقة بحرف عربي من الجانبين أو في آخر كلمة
#    ولا تسبقها كلمة تدل على مرجع صريح (فقرة/معيار/ملحق…)
REFWORD = re.compile(r'(الفقرة|الفقرات|فقرة|فقرات|معيار|المعيار|ملحق|الملحق|رقم|'
                     r'التفسير|تفسير|بند|البند|جدول|صفحة)\s*$')
GLUED = re.compile(r'(?<=[' + AR + r'])(\d{1,3})(?=[' + AR + r'،؛:.\)])')
TAIL = re.compile(r'(?<=[' + AR + r'])(\d{1,3})(?=\s|$)')
# مرجع فرعي مثل ٢٣أ يبقى ملتصقًا



def fix_block(text, log, moved):
    # (١) الكلمات المعكوسة
    def rv(m):
        log[(m.group(1), REV[m.group(1)])] += 1
        return REV[m.group(1)]
    text = REV_RE.sub(rv, text)

    # (٢) رقم مقحَم داخل الجملة ⇒ يُرفع إلى صدر الفقرة
    lead = None
    def pull(m):
        nonlocal lead
        before = text[:m.start()]
        if REFWORD.search(before):          # مرجع صريح: يُترك ويُفصل بمسافة
            return ' ' + m.group(1) + ' '
        if lead is None and int(m.group(1)) <= 400 and not re.match(r'^\s*\d', text):
            lead = m.group(1)
            moved[0] += 1
            return ''
        return ' ' + m.group(1) + ' '
    text = GLUED.sub(pull, text)

    # (٣) فصل ما تبقّى من أرقام ملتصقة
    text = re.sub(r'(?<=[' + AR + r'])(\d)', r' \1', text)
    # مرجع فرعي مثل «23أ» يبقى ملتصقًا؛ ما عداه يُفصل بمسافة
    text = re.sub(r'(\d{1,3})([' + AR + r'])(?=[' + AR + r'])',
                  r'\1 \2', text)
    text = re.sub(r'[ \t]{2,}', ' ', text).strip()
    text = re.sub(r'\s+([،؛:.\)])', r'\1', text)

    if lead and not re.match(r'^\d', text):
        text = f"{lead} {text}"
    return text


# أدوات وحروف لا تقبل التنوين
NO_TANWEEN = {'أما','إما','لما','كما','ثم','بما','عما','مما','إنما','ربما','حيثما'}
ORPH = re.compile(r'(?<=\s)([\u064B-\u0652])\s+([' + AR + r']{2,})(?=\s|$)')

def fix_orphans(chapters, vocab, log):
    """علامة تشكيل انفصلت عن كلمتها ⇒ تُعاد إليها، بشرط أن تكون الصيغة
    المدمجة موثّقة في الكتاب نفسه (٥ مرات فأكثر) — وإلا تُترك."""
    def f(m):
        mark, word = m.group(1), m.group(2)
        if word not in NO_TANWEEN and vocab.get(word + mark, 0) >= 5:
            log[('  ' + mark + ' ' + word, word + mark)] += 1
            return word + mark
        return m.group(0)
    for c in chapters:
        for b in c["body"]:
            if b[0] == 'p':
                b[1] = ORPH.sub(f, b[1])


def run(key):
    ch = json.load(open(f"work/{key}_ch.json", encoding="utf-8"))
    log, moved = collections.Counter(), [0]
    vocab = collections.Counter(
        w for c in ch for _, t in c["body"] for w in re.findall(r'[\u0621-\u0652]{2,}', t))
    fix_orphans(ch, vocab, log)
    for c in ch:
        for b in c["body"]:
            if b[0] == 'p':
                b[1] = fix_block(b[1], log, moved)
    json.dump(ch, open(f"work/{key}_ch.json", "w", encoding="utf-8"), ensure_ascii=False)
    return log, moved[0], ch


if __name__ == "__main__":
    report = ["# سجل تصحيح الكتب العربية", ""]
    for k, nm in (("b1", "المعايير الدولية ٢٠١٨"), ("b3", "المعايير الكاملة ٢٠٢٥")):
        log, moved, ch = run(k)
        tot = sum(log.values())
        print(f"═══ {k} ═══  كلمات معكوسة مُصلحة: {tot} | أرقام فقرات أُعيدت لموضعها: {moved:,}")
        for (a, b), n in log.most_common():
            print(f"   {a} → {b}  ×{n}")
        report += [f"## {nm}", "",
                   f"- كلمات بقيت معكوسة وأُصلحت: **{tot}**",
                   f"- أرقام فقرات أُقحمت داخل الجمل وأُعيدت إلى صدر الفقرة: **{moved:,}**", ""]
        if log:
            report += ["| الصورة المعكوسة | الصواب | مرات |", "|---|---|---|"]
            report += [f"| {a} | {b} | {n} |" for (a, b), n in log.most_common()]
            report += [""]
    open("work/ar_fixlog.md", "w", encoding="utf-8").write("\n".join(report))
