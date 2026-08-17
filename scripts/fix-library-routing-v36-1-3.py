from pathlib import Path

OLD='https://kosif-standards-library.kosif199022.workers.dev/'
for fn in ['public/index.html','frontend/index.html']:
    p=Path(fn)
    s=p.read_text(encoding='utf-8')
    if OLD in s:
        s=s.replace(OLD,'/standards/')
    s=s.replace('فتح القارئ ←','فتح القارئ داخل Kosif ←')
    if OLD in s:
        raise SystemExit(f'old standards host remains in {fn}')
    if 'id="kosif-full-standards"' not in s or 'href="/standards/"' not in s:
        raise SystemExit(f'native standards link missing in {fn}')
    p.write_text(s,encoding='utf-8')
