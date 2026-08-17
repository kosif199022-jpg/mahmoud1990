# -*- coding: utf-8 -*-
"""مستخرِج نصّ عربي أمين للـPDF — يصلح ترتيب الرموز المركّبة والمسافات دون تغيير أي حرف."""
import re, unicodedata as ud

# علامات التشكيل صفريّة العرض أيضًا، لكنها تتبع حرفها ولا تُبدَّل معه
COMBINING = lambda c: ud.combining(c) != 0

ARABIC = lambda c: '\u0600' <= c <= '\u06FF' or '\uFB50' <= c <= '\uFEFF'
# محارف زخرفية/تحكّم تُحذف: التطويل غير المعرَّف، ZWNJ/ZWJ، الواصلة اللينة
DROP = {'\ufffd', '\u200c', '\u200d', '\u00ad', '\u0640', '\u200e', '\u200f',
        '\u202a', '\u202b', '\u202c', '\u202d', '\u202e'}
# الحروف العربية التي لا تتصل بما بعدها (تنهي المقطع)
NONCONNECT = set('ادذرزوؤإأآةىءۇۆ')


def _order(chars):
    """يعيد ترتيب مكوّنات الرموز المركّبة: المكوّن صفري العرض يُستخرج قبل رمزه
    الحقيقي، والصواب أن يليه — فتُعكس المجموعة."""
    out, i = list(chars), 0
    while i < len(out):
        if out[i]["w"] <= 0.01 and ARABIC(out[i]["c"]) and not COMBINING(out[i]["c"]):
            j = i
            while (j < len(out) and out[j]["w"] <= 0.01
                   and ARABIC(out[j]["c"]) and not COMBINING(out[j]["c"])):
                j += 1
            if j < len(out) and ARABIC(out[j]["c"]) and not COMBINING(out[j]["c"]):
                g = out[i:j + 1]
                out[i:j + 1] = [g[-1]] + g[:-1][::-1]
                i = j + 1
                continue
        i += 1
    return out


LEAD_PUNCT = re.compile(r'^([\.\!\?:;،؛؟»\)\]]+)\s*(?=[\u0600-\u06FF])')


def _bidi_punct(line):
    """الترقيم الواقع في يسار السطر العربي يُستخرج في أوله؛ يُعاد إلى آخره."""
    m = LEAD_PUNCT.match(line)
    return (line[m.end():] + m.group(1)) if m else line


# حرف عربي مفرد محاط بمسافتين لا يقوم كلمةً في العربية (عدا «و») ⇒ شظية
_FRAG = re.compile(r'(?<=[\u0621-\u064A]) ([\u0621-\u064A]) (?=[\u0621-\u064A])')
_FRAG_END = re.compile(r'(?<=[\u0621-\u064A]) ([\u0621-\u064A])(?![\u0621-\u064A])')

_FRAG_START = re.compile(r'^([\u0621-\u064A]) (?=[\u0621-\u064A])')

def _despace(s):
    """يعيد وصل الشظايا المفردة الناتجة عن مسافات التّسطير في الملف الأصلي."""
    s = _FRAG_START.sub(lambda m: m.group(1) if m.group(1) != 'و' else m.group(1) + ' ', s)
    s = _FRAG.sub(lambda m: m.group(1) + ' ' if m.group(1) == 'و' else m.group(1) + ' ', s)
    s = _FRAG_END.sub(lambda m: m.group(1) if m.group(1) != 'و' else ' ' + m.group(1), s)
    return s


def page_text(page, despace=False):
    """نصّ الصفحة مرتّبًا سطرًا سطرًا، بحروفه الأصلية كما طُبعت."""
    lines = []
    for blk in page.get_text("rawdict")["blocks"]:
        for ln in blk.get("lines", []):
            buf = []
            for sp in ln["spans"]:
                chs = [dict(c=c["c"], w=c["bbox"][2] - c["bbox"][0]) for c in sp["chars"]]
                buf += [ch["c"] for ch in _order(chs) if ch["c"] not in DROP]
            s = re.sub(r'[ \t]{2,}', ' ', "".join(buf)).strip()
            s = s.replace('\u00a0', ' ')
            if despace:
                s = _despace(s)
            if s:
                lines.append(_bidi_punct(s))
    return "\n".join(lines)
