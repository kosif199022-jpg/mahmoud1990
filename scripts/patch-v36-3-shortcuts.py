from pathlib import Path
p=Path('public/v36-history-continuity.js');s=p.read_text(encoding='utf-8')
old="<div class=\"kosif-palette-hint\">Ctrl / ⌘ + K للفتح · Esc للإغلاق</div>"
new="<div class=\"kosif-palette-hint\">Alt + K أو Ctrl / ⌘ + / للفتح · Ctrl / ⌘ + K يعمل عندما يسمح المتصفح · Esc للإغلاق</div>"
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('palette hint anchor missing')
old_listener="document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette()}if(e.key==='Escape'){closePalette();closeMore();closeAppearance();tourStop=true;try{speechSynthesis.cancel()}catch(_){}}});"
new_listener="document.addEventListener('keydown',e=>{const k=String(e.key||'').toLowerCase(),open=(e.altKey&&k==='k')||((e.ctrlKey||e.metaKey)&&(k==='k'||k==='/'||e.code==='Slash'));if(open){e.preventDefault();e.stopPropagation();openPalette()}if(e.key==='Escape'){closePalette();closeMore();closeAppearance();tourStop=true;try{speechSynthesis.cancel()}catch(_){}}});"
if old_listener in s:s=s.replace(old_listener,new_listener,1)
elif new_listener not in s:raise SystemExit('keyboard listener anchor missing')
if "e.altKey&&k==='k'" not in s or "k==='/'" not in s:raise SystemExit('shortcut patch failed')
p.write_text(s,encoding='utf-8')
