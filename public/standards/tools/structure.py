# -*- coding: utf-8 -*-
"""يبني بنية الفصول من صفحات المعايير: ترويسة جارية ⇐ حدّ الفصل، ثم إعادة بناء الفقرات."""
import json, re, collections

HEAD = re.compile(r'(المعيار الدولي للتقرير المالي|معيار المحاسبة الدولي|'
                  r'معيار محاسبة|إطار مفاهيم|تفسير|لجنة تفسيرات)')
TRANS = re.compile(r'ترجمة الهيئة السعودية|مؤسسة المعايير الدولية للتقرير المالي©|'
                   r'^\d{1,4}$|^©')
# الرقم يُستخرج قبل الاسم بسبب اتجاه النص ⇒ يُعاد إلى موضعه
NUMFIRST = re.compile(r'^(\d{1,2})\s*(المعيار الدولي للتقرير المالي|معيار المحاسبة الدولي)$')
NUMLAST  = re.compile(r'^(المعيار الدولي للتقرير المالي|معيار المحاسبة الدولي)\s*(\d{1,2})$')
QUOTED   = re.compile(r'[”“"]([^”“"]{6,90})[”“"]')
# أقسام المعايير المعروفة فقط — لا نستنبط عناوين من طول السطر
SECTION = re.compile(
    r'\s*(الهدف|النطاق|نطاق التطبيق|التعريفات|الإثبات|الاعتراف|القياس|'
    r'القياس اللاحق|الإثبات والقياس|العرض|الإفصاح|الإفصاحات|تاريخ السريان|'
    r'تاريخ النفاذ|الأحكام الانتقالية|أحكام انتقالية|سحب المعايير[^\n]{0,24}|'
    r'الملحق [أ-ي]|ملحق [أ-ي]|إرشادات التطبيق|أساس الاستنتاجات|'
    r'التعديلات المدخلة على الفقرات|مقدمة)\s*[:：]?\s*')
PARA_NO  = re.compile(r'^(\d{1,3}(?:/\d{1,3})?|[أ-يA-Z]\s*[/.)]|\(\s*[أ-ي\d]+\s*\))\s')


def norm_head(h):
    h = re.sub(r'\s+', ' ', h).strip()
    m = NUMFIRST.match(h)
    if m: return f"{m.group(2)} {m.group(1)}"
    m = NUMLAST.match(h)
    if m: return f"{m.group(1)} {m.group(2)}"
    return h


def page_head(page):
    for l in [x for x in page.splitlines() if x.strip()][:2]:
        if HEAD.search(l):
            return norm_head(l)
    return None


def is_furniture(line, head):
    """ترويسة جارية أو تذييل ترجمة أو رقم صفحة ⇒ ليست من المتن."""
    s = line.strip()
    if not s: return True
    if TRANS.search(s): return True
    if head and norm_head(s) == head: return True
    if HEAD.search(s) and len(s) < 55 and norm_head(s) == head: return True
    return False


def paragraphs(lines):
    """يجمع الأسطر في فقرات: سطر يبدأ برقم فقرة أو عنوان قصير يفتح فقرة جديدة."""
    out, buf = [], []
    flush = lambda: (out.append(("p", re.sub(r'\s{2,}', ' ', " ".join(buf)).strip()))
                     if buf else None)
    for l in lines:
        s = l.strip()
        if not s: continue
        short_head = bool(SECTION.fullmatch(s)) and len(s) < 60
        if PARA_NO.match(s):
            flush(); buf = [s]
        elif short_head and buf and len(" ".join(buf)) > 40:
            flush(); out.append(("h", s)); buf = []
        else:
            buf.append(s)
    flush()
    return [b for b in out if b[1]]


def build(pages, book_id):
    # ١) إسناد كل صفحة إلى معيار، مع ملء الفجوات من السابق
    heads, cur = [], None
    for p in pages:
        h = page_head(p)
        if h: cur = h
        heads.append(cur)

    # ٢) تجميع الصفحات المتتالية لكل معيار
    groups, start = [], 0
    for i in range(1, len(pages) + 1):
        if i == len(pages) or heads[i] != heads[start]:
            if heads[start]:
                groups.append((heads[start], start, i - 1))
            start = i

    # ٣) بناء الفصول
    chapters = []
    for no, (title, a, b) in enumerate(groups, 1):
        body_lines = []
        for pi in range(a, b + 1):
            for l in pages[pi].splitlines():
                if not is_furniture(l, title):
                    body_lines.append(l)
        blocks = paragraphs(body_lines)
        if len(blocks) < 2:
            continue
        # الاسم الكامل من أول اقتباس في أول صفحتين
        # الاسم الكامل: أول اقتباس عربي في الأسطر الأولى من أول صفحة فقط
        name = ""
        first = [l for l in pages[a].splitlines() if l.strip()][:8]
        for l in first:
            m = QUOTED.search(l)
            if m:
                cand = re.sub(r'\s+', ' ', m.group(1)).strip(' .،:')
                if re.search(r'[\u0621-\u064A]', cand) and len(cand) >= 8 \
                   and not HEAD.search(cand):
                    name = cand
                break
        short = title if len(title) <= 70 else title[:67].rsplit(' ', 1)[0] + '…'
        chapters.append({
            "no": len(chapters) + 1,
            "title": short,
            "name": name,
            "pages": [a + 1, b + 1],
            "body": [list(x) for x in blocks],
            "words": sum(len(t.split()) for _, t in blocks),
        })
    return chapters


if __name__ == "__main__":
    for k, despace in (("b1", False), ("b3", True)):
        pages = json.load(open(f"work/{k}.json", encoding="utf-8"))
        ch = build(pages, k)
        json.dump(ch, open(f"work/{k}_ch.json", "w", encoding="utf-8"), ensure_ascii=False)
        print(f"═══ {k}: {len(ch)} فصلًا | {sum(c['words'] for c in ch):,} كلمة ═══")
        for c in ch[:8]:
            nm = f" — {c['name'][:34]}" if c["name"] else ""
            print(f"  {c['no']:>2}. {c['title'][:34]:<34}{nm:<38} ص{c['pages'][0]}–{c['pages'][1]} · {c['words']:,} ك")
        print(f"  … و{len(ch)-8} فصلًا\n")
