import fs from 'node:fs';

const css=fs.readFileSync('public/kosif-visual-system-v45.css','utf8');
const guard=fs.readFileSync('public/kosif-visual-system-v45.js','utf8');
const fonts=fs.readFileSync('public/kosif-fonts-v45.css','utf8');
const edge=fs.readFileSync('src/suite-edge-v43.js','utf8');
const loader=fs.readFileSync('public/kosif-workspace-stability-loader-v42.js','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const build=fs.readFileSync('scripts/build-assets.mjs','utf8');

const checks=[
  ['scoped visual authority',css.includes('html[data-kosif-visual-system="v45"]')],
  ['approved navy token',css.includes('--k45-navy:#0D2B45')],
  ['approved teal token',css.includes('--k45-teal:#19AFA5')],
  ['approved gold token',css.includes('--k45-gold:#D4AF37')],
  ['uses unified font authority',css.includes('--k45-font:var(--kosif-font') && fonts.includes('--kosif-font:')],
  ['spacing 4',css.includes('--k45-s1:4px')],
  ['spacing 8',css.includes('--k45-s2:8px')],
  ['spacing 12',css.includes('--k45-s3:12px')],
  ['spacing 16',css.includes('--k45-s4:16px')],
  ['spacing 24',css.includes('--k45-s6:24px')],
  ['spacing 32',css.includes('--k45-s8:32px')],
  ['spacing 48',css.includes('--k45-s12:48px')],
  ['governed touch target',css.includes('--k45-touch:46px') && css.includes('min-height:var(--k45-touch)!important')],
  ['small modal contract',css.includes('.modal[data-size="s"]')],
  ['medium modal contract',css.includes('.modal[data-size="m"]')],
  ['large modal contract',css.includes('.modal[data-size="l"]')],
  ['dynamic viewport modal cap',css.includes('90dvh')],
  ['iPhone safe area',css.includes('env(safe-area-inset-bottom)')],
  ['iPhone momentum scrolling',css.includes('-webkit-overflow-scrolling:touch')],
  ['touch pan contract',css.includes('touch-action:pan-y')],
  ['iOS input zoom prevention',css.includes('font-size:16px!important')],
  ['reduced motion support',css.includes('@media (prefers-reduced-motion:reduce)')],
  ['dark theme compatibility',css.includes('[data-theme="dark"]')],
  ['cascade guard is presentation-only head observer',guard.includes('observer.observe(document.head, { childList: true })') && !guard.includes('subtree: true') && !guard.includes('attributes: true')],
  ['cascade guard reuses one stylesheet node',guard.includes("document.getElementById(ID)") && guard.includes('document.head.appendChild(link)')],
  ['cascade guard reacts only to late presentation styles',guard.includes('isPresentationStyle(node)') && guard.includes('node.id !== ID')],
  ['edge stylesheet injection',edge.includes('kosif-visual-system-v45.css?v=2026.08.21-2')],
  ['edge cascade guard injection',edge.includes('kosif-visual-system-v45.js?v=2026.08.21-1')],
  ['edge visual system response marker',edge.includes("h.set('x-kosif-visual-system','v45')")],
  ['edge html visual attribute',edge.includes("setAttribute('data-kosif-visual-system','v45')")],
  ['original wealth reader preserved',edge.includes("const preserveWealthReader=url.pathname==='/wealth'||url.pathname.startsWith('/wealth/')")],
  ['visual system excluded from wealth reader',edge.includes('if(!preserveWealthReader){') && edge.includes('head.append(VISUAL_SYSTEM_V45_GUARD')],
  ['static/PWA shell gets visual css',/const\s+visualCssHref\s*=\s*['"]\/kosif-visual-system-v45\.css\?v=2026\.08\.21-2['"]/.test(build)],
  ['static/PWA shell gets cascade guard',/const\s+visualJsSrc\s*=\s*['"]\/kosif-visual-system-v45\.js\?v=2026\.08\.21-1['"]/.test(build)],
  ['static/PWA shell gets scoped attribute',build.includes('data-kosif-visual-system="v45"')],
  ['first-class static shells use same authority',build.includes("'public/hub.html'") && build.includes("'public/libraries/index.html'") && build.includes("'public/sales/index.html'") && build.includes("'public/standards/index.html'")],
  ['wealth static reader remains excluded',!build.includes("'public/wealth/reader.html'")],
  ['late audit css cannot outrank v45',loader.includes('document.head.appendChild(visual)')],
  ['single v45 stylesheet node reused',loader.includes("document.querySelector('#kosif-visual-system-v45')")],
  ['visual css precached offline',sw.includes("'/kosif-visual-system-v45.css?v=2026.08.21-2'")],
  ['visual guard precached offline',sw.includes("'/kosif-visual-system-v45.js?v=2026.08.21-1'")],
  ['visual assets integrity refreshed',sw.includes("'/kosif-visual-system-v45.css'") && sw.includes("'/kosif-visual-system-v45.js'")]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)failed+=1;
}
if(failed){
  console.error(`KOSIF visual system v45 gate failed: ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`KOSIF visual system v45 gate passed: ${checks.length}/${checks.length}`);
