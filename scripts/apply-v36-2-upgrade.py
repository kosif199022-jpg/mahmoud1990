from pathlib import Path
import json

def rw(path, fn):
    p=Path(path); s=p.read_text(encoding='utf-8'); n=fn(s)
    if n==s: print('UNCHANGED',path)
    else: p.write_text(n,encoding='utf-8'); print('UPDATED',path)

def once(s,old,new,label):
    if new in s: return s
    if old not in s: raise SystemExit(f'anchor missing: {label}')
    return s.replace(old,new,1)

# 1) Fix the real browser-payload syntax error found by validate-payloads.
def professional(s):
    return once(s,'}}}catch(_){}}function patchChecks','}}catch(_){}}function patchChecks','professional patchDb extra brace')
rw('src/professional-upgrade.js',professional)

# 2) Version/package and permanent comprehensive checker.
p=Path('package.json'); d=json.loads(p.read_text())
d['name']='kosif-native-v36-2'; d['version']='36.2.0'; d.setdefault('scripts',{})['check']='node scripts/check-all.mjs'
p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')

# 3) Worker release markers.
def worker(s):
    s=s.replace("native-v36-1-deep-audit","native-v36-2-attachments-upgrade")
    s=s.replace("version:'v36.1',release:'Deep Audit & Verified AI'","version:'v36.2',release:'Attachment Review & Operational Intelligence'")
    return s
rw('src/worker.js',worker)

# 4) Load the new deterministic operational analytics runtime.
for f in ['public/index.html','frontend/index.html']:
    def html(s):
        tag='<script src="/v36-operations.js?v=36.2"></script>'
        if tag in s:return s
        return once(s,'<script src="/v36-features.js?v=36"></script>','<script src="/v36-features.js?v=36"></script>\n'+tag,f+' operations runtime')
    rw(f,html)

# 5) PWA cache and offline runtime inventory.
def sw(s):
    s=s.replace("const C='kosif-native-v36-1-3-app';","const C='kosif-native-v36-2-app';")
    if "'/v36-operations.js'" not in s:
        s=once(s,"'/v36-features.js'","'/v36-features.js','/v36-operations.js'",'SW operations asset')
    return s
rw('public/sw.js',sw)

# 6) Bridge operational exceptions into the normal risk register.
def features(s):
    old="  return out.sort((x,y)=>y.score-x.score).slice(0,120);"
    new="  try{const extra=window.KosifOperations?.riskItems?.()||[];for(const x of extra)out.push(x)}catch(_){}\n  return out.sort((x,y)=>y.score-x.score).slice(0,140);"
    return once(s,old,new,'operational risk bridge')
rw('public/v36-features.js',features)

# 7) Strengthen the deep audit with the new permanent gates.
def audit(s):
    old="readiness:read('public/v36-standards-readiness.js')"
    new="readiness:read('public/v36-standards-readiness.js'),ops:read('public/v36-operations.js'),pkg:read('package.json'),checker:read('scripts/check-all.mjs')"
    s=once(s,old,new,'deep audit source inventory')
    s=s.replace("const metadataConsistent=lib.every(x=>!bookCounts[x.id]||Number(x.chapters)===bookCounts[x.id]);","const metadataConsistent=lib.every(x=>Number(x.chapters||0)===(bookCounts[x.id]||0));")
    marker=" 'Current Gemini default':/gemini-3\\.6-flash/.test(src.workspace),"
    additions=""" 'Current Gemini default':/gemini-3\\.6-flash/.test(src.workspace),
 'Browser payload validator wired':/validate-payloads\\.mjs/.test(src.checker)&&/check-all\\.mjs/.test(src.pkg)&&fs.existsSync('scripts/validate-payloads.mjs'),
 'Operational sales/cost analytics':/KosifOperations/.test(src.ops)&&/هوامش سالبة|negative margin/.test(src.ops)&&/قطع زمني/.test(src.ops),
 'Operational data-quality bridge':/تكرار محتمل/.test(src.ops)&&/تنسيق جوال العميل/.test(src.ops)&&/riskItems/.test(src.ops),"""
    if 'Operational sales/cost analytics' not in s:s=once(s,marker,additions,'deep audit operational checks')
    s=s.replace("# Kosif v36.1 Deep Audit","# Kosif v36.2 Deep Audit")
    return s
rw('scripts/deep-audit-v36.mjs',audit)

# 8) CI must validate what reaches the browser, not only source files.
def deepwf(s):
    s=s.replace("      - 'scripts/deep-audit-v36.mjs'","      - 'scripts/**'\n      - 'package.json'")
    old='''      - name: Validate executable JavaScript and Worker\n        shell: bash\n        run: |\n          set -euo pipefail\n          for f in public/sw.js public/v36-ai-gate.js public/v36-governance.js public/standards/sw.js public/standards/reader-pro-v36.js; do node --check "$f"; done\n          npx --yes esbuild src/worker.js --bundle --format=esm --platform=browser --outfile=/tmp/worker.mjs >/dev/null'''
    new='''      - name: Validate all JavaScript and browser payloads\n        run: npm run check\n      - name: Bundle Worker\n        run: npx --yes esbuild src/worker.js --bundle --format=esm --platform=browser --outfile=/tmp/worker.mjs >/dev/null'''
    if old in s:s=s.replace(old,new)
    elif 'Validate all JavaScript and browser payloads' not in s:raise SystemExit('deep workflow validation anchor missing')
    return s
rw('.github/workflows/deep-audit-v36.yml',deepwf)

def runtimewf(s):
    if "      - 'scripts/**'" not in s:s=s.replace("      - 'public/**'","      - 'public/**'\n      - 'scripts/**'\n      - 'package.json'",1)
    if '          npm run check\n          npx playwright install chromium' not in s:
        s=s.replace('          npm install --no-save playwright@1.54.2 >/dev/null\n          npx playwright install chromium >/dev/null','          npm install --no-save playwright@1.54.2 >/dev/null\n          npm run check\n          npx playwright install chromium >/dev/null')
    council="            await page.evaluate(()=>go('council'));await page.waitForTimeout(150);ok(await page.locator('#c-key-gemini').getAttribute('readonly')!==null,'Council Gemini key must be locked');ok(await page.locator('.c-test').first().isDisabled(),'Council tests must be disabled while locked');"
    ops="""            await page.evaluate(()=>go('council'));await page.waitForTimeout(150);ok(await page.locator('#c-key-gemini').getAttribute('readonly')!==null,'Council Gemini key must be locked');ok(await page.locator('.c-test').first().isDisabled(),'Council tests must be disabled while locked');
            await page.evaluate(()=>go('analytics'));await page.waitForTimeout(180);ok(await page.locator('#ops-lab').count()===1,'Operational analytics lab missing');await page.locator('#ops-sample').click();await page.waitForTimeout(120);ok(await page.locator('#ops-out .kpi').count()>=4,'Operational KPIs missing');ok(await page.evaluate(()=>window.KosifOperations?.riskItems?.().length>0),'Operational risk bridge empty');"""
    if 'Operational analytics lab missing' not in s:s=once(s,council,ops,'runtime operational test')
    s=s.replace('/standards/?v=36.1','/standards/?v=36.2')
    return s
rw('.github/workflows/verify-v36-1-deep.yml',runtimewf)

print('KOSIF_V36_2_PATCH_APPLIED')
