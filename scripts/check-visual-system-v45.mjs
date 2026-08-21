import fs from 'node:fs';

const css=fs.readFileSync('public/kosif-visual-system-v45.css','utf8');
const edge=fs.readFileSync('src/suite-edge-v43.js','utf8');

const checks=[
  ['scoped visual authority',css.includes('html[data-kosif-visual-system="v45"]')],
  ['approved navy token',css.includes('--k45-navy:#0D2B45')],
  ['approved teal token',css.includes('--k45-teal:#19AFA5')],
  ['approved gold token',css.includes('--k45-gold:#D4AF37')],
  ['Arabic typography authority',css.includes('--k45-font:"KOSIF Alexandria"')],
  ['spacing 4',css.includes('--k45-sp-1:4px')],
  ['spacing 8',css.includes('--k45-sp-2:8px')],
  ['spacing 12',css.includes('--k45-sp-3:12px')],
  ['spacing 16',css.includes('--k45-sp-4:16px')],
  ['spacing 24',css.includes('--k45-sp-6:24px')],
  ['spacing 32',css.includes('--k45-sp-8:32px')],
  ['spacing 48',css.includes('--k45-sp-12:48px')],
  ['small modal contract',css.includes('.modal[data-size="s"]')],
  ['medium modal contract',css.includes('.modal[data-size="m"]')],
  ['large modal contract',css.includes('.modal[data-size="l"]')],
  ['dynamic viewport modal cap',css.includes('90dvh')],
  ['iPhone safe area',css.includes('env(safe-area-inset-bottom)')],
  ['iPhone internal sheet scrolling',css.includes('-webkit-overflow-scrolling:touch')],
  ['touch pan contract',css.includes('touch-action:pan-y')],
  ['iOS form zoom prevention',css.includes('font-size:16px!important')],
  ['reduced motion support',css.includes('@media (prefers-reduced-motion:reduce)')],
  ['dark theme compatibility',css.includes('[data-theme="dark"]')],
  ['edge stylesheet injection',edge.includes('kosif-visual-system-v45.css?v=2026.08.21-1')],
  ['edge visual attribute',edge.includes("setAttribute('data-kosif-visual-system','v45')")],
  ['original wealth reader preserved',edge.includes("const preserveWealthReader=url.pathname==='/wealth'||url.pathname.startsWith('/wealth/')")],
  ['visual system excluded from wealth reader',edge.includes('if(!preserveWealthReader)head.append(VISUAL_SYSTEM_V45')]
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
