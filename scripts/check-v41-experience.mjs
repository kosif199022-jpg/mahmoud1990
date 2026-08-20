import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const failures = [];
const need = (condition, message) => { if (!condition) failures.push(message); };

const css = read('public/kosif-editorial-v41.css');
const runtime = read('public/kosif-editorial-v41.js');
const edge = read('src/suite-edge.js');
const sw = read('public/sw.js');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
const productionWorkflow = read('.github/workflows/verify-v36.yml');
const runtimeWorkflow = read('.github/workflows/verify-v36-3-runtime.yml');
const continuity = read('public/v36-continuity.js');
const mobile = read('public/v36-mobile-phase-b.css');
const studioRuntime = read('public/kosif-studio-v40.js');
const manifest = JSON.parse(read('public/manifest.webmanifest'));

need(css.length > 25000, 'editorial stylesheet is unexpectedly small');
for (const token of [
  '--k41-ink:#102825', '--k41-paper:#FFFCF5', '--k41-gold:#D7AE58',
  '--k41-cobalt:#315BE8', '--k41-teal:#0B8B7C', '--k41-coral:#D8654D',
  '--k41-shadow:', '--k41-shadow-lift:', '--k41-ease-cinema:'
]) need(css.includes(token), `missing v41 design token: ${token}`);

for (const marker of [
  'KOSIF Editorial Cinematic v41', '@font-face', 'alexandria-arabic-500-normal.woff2',
  'html[data-kosif-edition="v41"] #kosif-premium-welcome', '.k41-folio',
  '#kosif-premium-actions .kpa-grid', '.v38-report-cover', '.v38-council-step',
  '.ks40-launcher', '.hero:has(.hero-metrics)', '.library-hero', '.sales-side',
  '#prose', '[data-theme="dark"]', '@media (min-width:1024px) and (max-width:1440px)',
  '@media (max-width:720px)', '@media (max-width:480px)', '@media (max-width:390px)', '@media (prefers-reduced-motion:reduce)',
  '@media print', '@keyframes k41-page-in', '@keyframes k41-sheet-in'
]) need(css.includes(marker), `missing v41 surface/accessibility marker: ${marker}`);

need(css.includes("url('/assets/kosif-studio-hero-v40.webp')") && css.includes("url('/assets/kosif-reports-hero-v39.webp')") && css.includes("url('/assets/kosif-live-hero-v39.webp')"), 'existing original KOSIF artwork is not reused across the editorial covers');
need(css.includes('(hover:hover) and (pointer:fine)') && css.includes('prefers-reduced-motion:reduce'), 'motion is not bounded by pointer and reduced-motion preferences');
need(!/animation-duration:[^;]*(?:10ms|20ms|50ms)!important/.test(css), 'reduced-motion fallback should use a near-zero duration only');
need(css.includes('margin-block-end:4px!important') && css.includes('margin-block-start:0!important'), 'mobile cover-to-actions rhythm is not explicitly bounded');
need(css.includes('padding:34px 24px 240px!important') && css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'), 'mobile cover actions do not reserve compact space above the fixed navigation');

for (const marker of [
  '__KOSIF_EDITORIAL_V41__', "root.dataset.kosifEdition = 'v41'", "root.dataset.kosifExperience = 'v41'",
  'prefers-reduced-motion: reduce', '(hover: hover) and (pointer: fine)', 'IntersectionObserver',
  'MutationObserver', 'revealVisibleTargets', 'getBoundingClientRect', 'data-kosif-editorial', 'KOSIF REVIEW', 'ISSUE 41',
  '--k41-tilt-x', '--k41-x', 'kosif-view-change', 'touchFirst', 'revealAllTargets', 'setTimeout(revealAllTargets, 1600)'
]) need(runtime.includes(marker), `missing v41 runtime marker: ${marker}`);

for (const forbidden of ['localStorage.setItem(', 'sessionStorage.setItem(', '/api/kosif/', 'fetch(', 'indexedDB', 'WebSocket']) {
  need(!runtime.includes(forbidden), `presentation runtime must not access data or transport: ${forbidden}`);
}

const auditPublic = read('public/index.html');
const auditFrontend = read('frontend/index.html');
need(auditPublic === auditFrontend, 'public/frontend audit shells diverged');

for (const html of [
  'public/index.html', 'frontend/index.html', 'public/hub.html',
  'public/libraries/index.html', 'public/sales/index.html', 'public/standards/index.html'
]) {
  const source = read(html);
  need(source.includes('/kosif-editorial-v41.js?v=2026.08.20-v41'), `v41 runtime is not linked in ${html}`);
}

for (const html of ['public/hub.html', 'public/libraries/index.html', 'public/sales/index.html', 'public/standards/index.html']) {
  const source = read(html);
  need(source.includes('/kosif-editorial-v41.css?v=2026.08.20-v41'), `v41 stylesheet is not linked in ${html}`);
  need(source.indexOf('kosif-suite-v40.css') < source.indexOf('kosif-editorial-v41.css'), `v41 must load after the stable v40 base in ${html}`);
}

need(edge.includes("version:'v41.0.0-root'") && edge.includes("buildId:'2026.08.20-v41-editorial-cinematic-canva'"), 'v41 product identity is missing');
need(edge.includes("experienceVersion:'v41.0.0'") && edge.includes("baseVisualVersion:'v40.0.0'"), 'v41/base visual relationship is not explicit');
need(edge.includes("designAuthority:'KOSIF Editorial v41 cinematic Arabic magazine system informed by Canva with governed motion and color'"), 'Canva-informed design authority is missing');
need(edge.includes('/kosif-editorial-v41.css?v=2026.08.20-v41') && /kosif-studio-v40\.css\?v=2026\.08\.20-v40">'\+editorial/.test(edge), 'audit shell does not load v41 after v40');
need(edge.includes("else if(!text.includes('/kosif-editorial-v41.css'))"), 'audit shell incorrectly couples v41 injection to an older privacy marker');
need(continuity.includes("EDITORIAL_CSS='/kosif-editorial-v41.css?v=2026.08.20-v41'") && continuity.indexOf('CANVA_PREMIUM_CSS') < continuity.indexOf('EDITORIAL_CSS'), 'legacy continuity does not restore v41 after the stable v40 base');

for (const asset of ['/kosif-editorial-v41.css?v=2026.08.20-v41', '/kosif-editorial-v41.js?v=2026.08.20-v41']) need(sw.includes(asset), `service worker missing v41 asset: ${asset}`);
need(sw.includes("const C='kosif-native-v41-1-scroll-runtime-app'"), 'service worker cache generation was not bumped for the scroll repair');
need(sw.includes("'/kosif-editorial-v41.css'") && sw.includes("'/kosif-editorial-v41.js'"), 'v41 assets are not protected by integrity refresh');
need(css.includes('scroll-behavior:auto') && css.includes('background-attachment:scroll!important'), 'page scrolling is not configured for immediate Safari-safe movement');
need(css.includes('@media (hover:none),(pointer:coarse)') && css.includes('@keyframes k41-page-in-touch'), 'touch-first motion fallback is missing');
need(mobile.includes('body[data-kosif-dialog-open="1"]{touch-action:auto!important') && mobile.includes('#ks40-launch-overlay .ks40-launch-body'), 'Safari dialog gestures are still blocked by the page lock');
need(!continuity.includes("b.style.touchAction='none'") && continuity.includes("'#ks40-launch-overlay','#modal-bg','#drawer'") && continuity.includes("attributeFilter:['class','hidden']"), 'dialog continuity does not cover every active window safely');
need(studioRuntime.includes('lockLauncherPage') && studioRuntime.includes('unlockLauncherPage') && studioRuntime.includes('window.KosifContinuity?.registerDialogs?.()') && studioRuntime.includes('continuity.syncDialogLock(preferredY)'), 'capability launcher does not use a reversible page lock');
need(continuity.includes('retargeted:true') && continuity.includes('p.style.top=`-${lockY}px`'), 'nested dialog lock cannot retarget the preserved Safari scroll position');

need(manifest.theme_color === '#102825' && manifest.background_color === '#F7F0E2', 'PWA colors do not match the v41 magazine masthead');
need(deploy.includes('/kosif-editorial-v41.css') && deploy.includes('/kosif-editorial-v41.js'), 'production route verification does not include v41 assets');
need(deploy.includes('v41-editorial-cinematic-canva') && deploy.includes('experienceVersion') && deploy.includes('baseVisualVersion'), 'production health gate does not verify the v41 contract');
need(deploy.includes('audit_shell_ok=0') && deploy.includes('attempt=$attempt') && deploy.includes('did not converge after propagation retries'), 'production audit-shell verification does not tolerate bounded propagation delay');
need(productionWorkflow.includes('41-editorial-cinematic-canva'), 'browser production workflow does not accept the v41 build identity');
need(runtimeWorkflow.includes('kosif-v41-mobile-default.png') && !runtimeWorkflow.includes('kosif-v40-mobile-default.png'), 'runtime workflow does not preserve the current v41 mobile screenshot');

if (failures.length) {
  console.error('KOSIF_V41_EXPERIENCE_FAILED');
  failures.forEach(failure => console.error(' - ' + failure));
  process.exit(1);
}

console.log('KOSIF_V41_EXPERIENCE_OK');
