import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const failures=[];
const need=(cond,msg)=>{if(!cond)failures.push(msg)};

const required=[
  'public/kosif-kitab-theme.css',
  'public/kosif-kitab-theme.js',
  'public/kosif-editorial-v39.css',
  'public/assets/kosif-audit-hero-v39.webp',
  'public/assets/kosif-reports-hero-v39.webp',
  'public/assets/kosif-live-hero-v39.webp',
  'public/fonts/alexandria-arabic-500-normal.woff2',
  'public/fonts/alexandria-arabic-700-normal.woff2',
  'docs/KOSIF_UNIFIED_REQUIREMENTS_2026-08-20.md'
];
for(const f of required)need(exists(f),`missing ${f}`);

if(exists('public/kosif-kitab-theme.css')){
  const css=read('public/kosif-kitab-theme.css');
  for(const token of ['#FBF4E1','#2B1D0E','#F5A623'])need(css.includes(token),`theme palette token missing: ${token}`);
  for(const ns of ['--v36-primary','--v38-gold','--kup-gold','--k8-gold','--kstd-primary','--r-accent','--lib-gold'])need(css.includes(ns),`legacy namespace bridge missing: ${ns}`);
  need(css.includes('prefers-reduced-motion'),'reduced-motion quality floor missing');
  need(css.includes('html body main{width:100%!important;max-width:none!important'),'specificity-safe full-width desktop main rule missing');
  need(/@media\(min-width:1024px\)[^{]*\{[^}]*html body #kosif-bottom-nav\{display:none!important/.test(css),'specificity-safe desktop mobile-nav override missing from final authority layer');
  need(css.includes('.v38-chat-message')&&css.includes('.v38-report-gate'),'chat/report Kitab components missing');
}
if(exists('public/kosif-kitab-theme.js')){
  const js=read('public/kosif-kitab-theme.js');
  need(js.includes('kitab-caffe'),'runtime theme authority marker missing');
  need(js.includes('MutationObserver'),'runtime theme pinning missing');
  need(js.includes("localStorage.setItem('kosif_theme', 'light')"),'warm-paper default is not persisted against the legacy dark fallback');
}
if(exists('public/kosif-editorial-v39.css')){
  const css=read('public/kosif-editorial-v39.css');
  for(const token of ['#FBF4E1','#2B1D0E','#F5A623'])need(css.includes(token),`editorial palette token missing: ${token}`);
  for(const asset of ['/assets/kosif-audit-hero-v39.webp','/assets/kosif-reports-hero-v39.webp','/assets/kosif-live-hero-v39.webp'])need(css.includes(asset),`generated image is not consumed: ${asset}`);
  need(css.includes('kitab-editorial-v39'),'editorial runtime authority selector missing');
  need(css.includes('section[data-view="v38-reports"]')&&css.includes('section[data-view="v38-live"]'),'report/live generated-image selectors missing');
  need(css.includes('display:flex!important')&&css.includes('overflow-x:auto!important'),'single-rail desktop navigation contract missing');
  need((css.match(/max-width:1840px!important;/g)||[]).length>=3,'editorial desktop shell is still constrained instead of using the wide workspace');
  need(css.includes('grid-template-columns:1fr!important')&&css.includes('grid-template-columns:48px minmax(0,1fr)!important'),'mobile quick actions do not preserve a readable single-column layout');
  need(css.includes('[data-kosif-company-state="none"] #view-overview>.card.hero'),'empty mobile engagement card still leaves a dead zone');
  need(css.includes('[data-theme="dark"] #kosif-premium-actions'),'dark-mode quick actions are not integrated with the editorial palette');
  need(!/#c87f8d|#b487a4|#dca8b1|#c98794|#b77483/i.test(css),'legacy Canva Rose colors leaked into the final editorial layer');
  need(css.includes('@media (max-width:720px)'),'mobile editorial layout missing');
}
for(const asset of ['public/assets/kosif-audit-hero-v39.webp','public/assets/kosif-reports-hero-v39.webp','public/assets/kosif-live-hero-v39.webp']){
  if(exists(asset))need(fs.statSync(path.join(root,asset)).size>20000,`generated image is unexpectedly small or empty: ${asset}`);
}
if(exists('public/v36-continuity.js')){
  const cont=read('public/v36-continuity.js');
  need(cont.includes('/kosif-editorial-v39.css?v=2026.08.20-editorial-v39-2'),'continuity runtime does not load the editorial authority');
  need(cont.includes("dataset.kosifVisual='kitab-editorial-v39'"),'continuity runtime visual marker is stale');
  need(cont.includes('مراجعة أوضح.')&&cont.includes('قرار مهني أقوى.'),'editorial Arabic headline is missing');
  need(!cont.includes("CANVA_PREMIUM_CSS='/kosif-canva-premium-v2.css"),'legacy Canva Rose stylesheet still owns runtime priority');
}
for(const f of ['public/suite.js','public/suite-shell.js','public/standards/bridge.js']){
  if(!exists(f))continue;
  const s=read(f);need(s.includes('kosif-kitab-theme'),`${f} does not wire the theme authority`);
}
if(exists('src/suite-edge.js')){
  const s=read('src/suite-edge.js');
  need(s.includes('KOSIF cream/espresso/gold editorial system with original generated imagery'),'suite editorial designAuthority is missing');
  need(s.includes('/kosif-kitab-theme.js'),'audit shell does not load theme runtime');
  need(s.includes('/kosif-kitab-theme.css?v=1.0.0-kitab'),'audit shell does not load final theme stylesheet');
  need(s.includes('/kosif-editorial-v39.css?v=2026.08.20-editorial-v39-2'),'audit shell does not load final editorial stylesheet');
  need(s.includes('rel="preload" as="image" href="/assets/kosif-audit-hero-v39.webp"'),'audit shell does not preload the generated hero');
  for(const capability of ['/v38-accounting.js','/v38-evidence-graph.js','/v38-council-v3.js','/v38-source-fabric.js','/v38-books.js','/v38-live.js','/v38-lab.js'])need(s.includes(capability),`audit capability wiring missing after theme adoption: ${capability}`);
  need(s.includes("deterministicEngine:'kosif-blueprint-v3 + ISA opinion tree + v38 minor-unit core'"),'deterministic engine declaration changed or missing');
}
if(exists('public/sw.js')){
  const sw=read('public/sw.js');
  for(const asset of ['/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab','/kosif-editorial-v39.css?v=2026.08.20-editorial-v39-2','/assets/kosif-audit-hero-v39.webp','/assets/kosif-reports-hero-v39.webp','/assets/kosif-live-hero-v39.webp','/fonts/alexandria-arabic-500-normal.woff2','/fonts/alexandria-arabic-700-normal.woff2'])need(sw.includes(asset),`service worker missing theme asset: ${asset}`);
  need(sw.includes("const C='kosif-native-v39-editorial-app-2'"),'service-worker cache was not bumped for the mobile visual follow-up');
  need(sw.includes('KOSIF_SW_REQUIRED_CORE_FAILED'),'service-worker required-core fail-safe missing');
}
if(exists('GEMINI.md'))need(read('GEMINI.md').includes('KOSIF_UNIFIED_REQUIREMENTS_2026-08-20.md'),'agent instructions do not reference unified requirements');

if(failures.length){
  console.error('Kitab Caffe authority check failed:');
  for(const f of failures)console.error(` - ${f}`);
  process.exit(1);
}
console.log('Kitab Caffe authority check passed.');
