from pathlib import Path
p=Path('public/standards/index.html')
s=p.read_text(encoding='utf-8')
asset='<script src="reader-pro-v36.js?v=36.1"></script>'
if asset not in s:
    if '</body>' not in s: raise SystemExit('standards body anchor missing')
    s=s.replace('</body>',asset+'\n</body>')
p.write_text(s,encoding='utf-8')
