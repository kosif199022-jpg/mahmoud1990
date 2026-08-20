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
  need(/@media\(min-width:1024px\)[^{]*\{[^}]*html body #kosif-bottom-nav\{display:none!important/.test(css),'specificity-safe desktop mobile-nav override missing from final authority layer');
  need(css.includes('.v38-chat-message')&&css.includes('.v38-report-gate'),'chat/report Kitab components missing');
}
if(exists('public/kosif-kitab-theme.js')){
  const js=read('public/kosif-kitab-theme.js');
  need(js.includes('kitab-caffe'),'runtime theme authority marker missing');
  need(js.includes('MutationObserver'),'runtime theme pinning missing');
  need(js.includes("localStorage.setItem('kosif_theme', 'light')"),'warm-paper default is not persisted against the legacy dark fallback');
}
for(const f of ['public/suite.js','public/suite-shell.js','public/standards/bridge.js']){
  if(!exists(f))continue;
  const s=read(f);need(s.includes('kosif-kitab-theme'),`${f} does not wire the theme authority`);
}
if(exists('src/suite-edge.js')){
  const s=read('src/suite-edge.js');
  need(s.includes('Kitab Caffe cream/coffee/gold visual system'),'suite designAuthority is not Kitab Caffe');
  need(s.includes('/kosif-kitab-theme.js'),'audit shell does not load theme runtime');
  need(s.includes('/kosif-kitab-theme.css?v=1.0.0-kitab'),'audit shell does not load final theme stylesheet');
  for(const capability of ['/v38-accounting.js','/v38-evidence-graph.js','/v38-council-v3.js','/v38-source-fabric.js','/v38-books.js','/v38-live.js','/v38-lab.js'])need(s.includes(capability),`audit capability wiring missing after theme adoption: ${capability}`);
  need(s.includes("deterministicEngine:'kosif-blueprint-v3 + ISA opinion tree + v38 minor-unit core'"),'deterministic engine declaration changed or missing');
}
if(exists('public/sw.js')){
  const sw=read('public/sw.js');
  for(const asset of ['/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab','/fonts/alexandria-arabic-500-normal.woff2','/fonts/alexandria-arabic-700-normal.woff2'])need(sw.includes(asset),`service worker missing theme asset: ${asset}`);
  need(sw.includes('KOSIF_SW_REQUIRED_CORE_FAILED'),'service-worker required-core fail-safe missing');
}
if(exists('GEMINI.md'))need(read('GEMINI.md').includes('KOSIF_UNIFIED_REQUIREMENTS_2026-08-20.md'),'agent instructions do not reference unified requirements');

if(failures.length){
  console.error('Kitab Caffe authority check failed:');
  for(const f of failures)console.error(` - ${f}`);
  process.exit(1);
}
console.log('Kitab Caffe authority check passed.');
