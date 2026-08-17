from pathlib import Path
p=Path('src/professional-upgrade.js')
s=p.read_text(encoding='utf-8')
old='}}}catch(_){}}function patchChecks'
new='}}catch(_){}}function patchChecks'
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('professional payload brace anchor missing')
p.write_text(s,encoding='utf-8')
print('PROFESSIONAL_PAYLOAD_BRACE_FIXED')
