from pathlib import Path
import json,re

# App shell: one canonical copy, then mirror it to frontend.
p=Path('public/index.html'); s=p.read_text(encoding='utf-8')
css='<link rel="stylesheet" href="/v36-history-continuity.css?v=36.3">'
js='<script src="/v36-history-continuity.js?v=36.3"></script>'
if css not in s:
    if '</head>' not in s: raise SystemExit('missing </head>')
    s=s.replace('</head>',css+'\n</head>',1)
if js not in s:
    if '</body>' not in s: raise SystemExit('missing </body>')
    s=s.replace('</body>',js+'\n</body>',1)
p.write_text(s,encoding='utf-8'); Path('frontend/index.html').write_text(s,encoding='utf-8')

# Worker build identity.
p=Path('src/worker.js'); s=p.read_text(encoding='utf-8')
s=s.replace("native-v36-2-1-library-hardening","native-v36-3-history-continuity")
s=s.replace("version:'v36.2.1',release:'Library Integrity & Motion Hardening'","version:'v36.3',release:'Historical Requirements & Evidence Continuity'")
if "version:'v36.3'" not in s or 'native-v36-3-history-continuity' not in s: raise SystemExit('worker version patch failed')
p.write_text(s,encoding='utf-8')

# Service worker identity / precache.
p=Path('public/sw.js'); s=p.read_text(encoding='utf-8')
s=s.replace("const C='kosif-native-v36-2-1-app'","const C='kosif-native-v36-3-app'")
for asset in ['/v36-history-continuity.css','/v36-history-continuity.js']:
    if asset not in s:
        s=s.replace("'/v36-motion.css'", "'/v36-motion.css','/v36-history-continuity.css'" if asset.endswith('.css') else "'/v36-motion.css'") if asset.endswith('.css') else s
        if asset.endswith('.js'):
            s=s.replace("'/v36-ai-gate.js'", "'/v36-ai-gate.js','/v36-history-continuity.js'")
if 'kosif-native-v36-3-app' not in s or '/v36-history-continuity.js' not in s or '/v36-history-continuity.css' not in s: raise SystemExit('SW patch failed')
p.write_text(s,encoding='utf-8')

# Package / permanent CI gate.
p=Path('package.json'); pkg=json.loads(p.read_text(encoding='utf-8'))
pkg['name']='kosif-native-v36-3'; pkg['version']='36.3.0'
scripts=pkg.setdefault('scripts',{})
scripts['historical']='node scripts/check-historical-requirements.mjs'
check=scripts.get('check','')
if 'npm run historical' not in check: scripts['check']=check+' && npm run historical'
p.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Deep audit gains explicit historical-continuity checks.
p=Path('scripts/deep-audit-v36.mjs'); s=p.read_text(encoding='utf-8')
if "history:read('public/v36-history-continuity.js')" not in s:
    s=s.replace("motion:read('public/v36-motion.css'),pkg:", "motion:read('public/v36-motion.css'),history:read('public/v36-history-continuity.js'),historyCss:read('public/v36-history-continuity.css'),pkg:")
anchor=" 'Motion layer wired and accessible':"
pos=s.find(anchor)
if pos<0: raise SystemExit('deep audit motion anchor missing')
end=s.find('\n};',pos)
extra="""
 'Historical More sheet restored':/الشركات/.test(src.history)&&/البحث والأوامر/.test(src.history)&&/AI Agent/.test(src.history)&&/المظهر وحجم الخط/.test(src.history),
 'Command palette and guided voice tour restored':/metaKey/.test(src.history)&&/SpeechSynthesisUtterance/.test(src.history),
 'Font scaling reaches 200 percent safely':/max=\\\"200\\\"/.test(src.history)&&/data-kosif-font=\\\"xl\\\"/.test(src.historyCss),
 'Evidence continuity survives reload honestly':/docsUnavailable/.test(src.history)&&/ملفات الجلسة السابقة ليست موجودة/.test(src.history),
 'Structured AI history compaction exists':/rows\\.length>28/.test(src.history)&&/ملف مراجعة مهيكل/.test(src.history),
 'Build version handshake and stale-cache recovery exist':/\\/__health\\?cb=/.test(src.history)&&/getRegistrations/.test(src.history),
 'Historical requirements gate wired':/check-historical-requirements\\.mjs/.test(src.pkg)&&/npm run historical/.test(src.pkg),
"""
if 'Historical More sheet restored' not in s: s=s[:end]+extra+s[end:]
s=s.replace('# Kosif v36.2.1 Deep Audit','# Kosif v36.3 Deep Audit')
p.write_text(s,encoding='utf-8')
