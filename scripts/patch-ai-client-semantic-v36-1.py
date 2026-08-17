from pathlib import Path
for fn in ['public/index.html','frontend/index.html']:
    p=Path(fn);s=p.read_text(encoding='utf-8')
    old="window.KosifAIClient={version:'36.0.0',settings:()=>settings(),hasKey:()=>!!apiKey()};"
    new="window.KosifAIClient={version:'36.1.0',settings:()=>settings(),hasKey:()=>{const x=settings(),k=apiKey();return aiOwnerUnlocked()&&!!k&&aiVerified(x.provider,x.model,k)},isConnected:()=>{const x=settings(),k=apiKey();return aiOwnerUnlocked()&&!!k&&aiVerified(x.provider,x.model,k)}};"
    if old in s:s=s.replace(old,new)
    elif new not in s:raise SystemExit('KosifAIClient anchor missing '+fn)
    p.write_text(s,encoding='utf-8')
