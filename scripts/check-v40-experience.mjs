import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const exists = path => fs.existsSync(path);
const failures = [];
const need = (condition, message) => { if (!condition) failures.push(message); };

const manifest = JSON.parse(read('public/manifest.webmanifest'));
need(manifest.id === '/audit/', 'PWA identity must be the canonical audit workspace');
need(String(manifest.start_url).startsWith('/audit/'), 'PWA start_url must open the audit workspace');
need(manifest.scope === '/' && manifest.display === 'standalone', 'PWA scope/display contract is incomplete');
need(manifest.lang === 'ar' && manifest.dir === 'rtl', 'PWA Arabic RTL metadata is missing');
need(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.sizes === '192x192' && icon.type === 'image/png'), '192px PNG icon is missing');
need(manifest.icons.some(icon => icon.sizes === '512x512' && icon.type === 'image/png'), '512px PNG icon is missing');
need(manifest.icons.some(icon => String(icon.purpose).includes('maskable')), 'maskable PWA icon is missing');
need(Array.isArray(manifest.shortcuts) && ['tb', 'v38-reports', 'v38-council'].every(view => manifest.shortcuts.some(item => String(item.url).includes('view=' + view))), 'PWA workflow shortcuts are incomplete');

function pngDimensions(path) {
  const buffer = fs.readFileSync(path);
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

for (const [path, width, height] of [
  ['public/icons/icon-192.png', 192, 192],
  ['public/icons/icon-512.png', 512, 512],
  ['public/icons/maskable-512.png', 512, 512],
  ['public/icons/apple-touch-icon.png', 180, 180]
]) {
  need(exists(path), `missing install icon: ${path}`);
  if (exists(path)) {
    const dimensions = pngDimensions(path);
    need(dimensions?.[0] === width && dimensions?.[1] === height, `wrong icon dimensions: ${path}`);
    need(fs.statSync(path).size > 5000, `install icon is unexpectedly empty: ${path}`);
  }
}

need(exists('public/assets/kosif-studio-hero-v40.webp') && fs.statSync('public/assets/kosif-studio-hero-v40.webp').size > 30000, 'original v40 hero artwork is missing or empty');

const studio = read('public/kosif-studio-v40.js');
for (const marker of ['beforeinstallprompt', 'appinstalled', "serviceWorker.register('/sw.js'", '(display-mode: standalone)', 'navigator.standalone', 'isIOS()', 'ks40-launch-overlay', 'aria-modal="true"', 'event.altKey', 'URLSearchParams']) {
  need(studio.includes(marker), `studio orchestration marker missing: ${marker}`);
}
for (const group of ["id: 'work'", "id: 'assurance'", "id: 'evidence'", "id: 'deliver'", "id: 'system'"]) need(studio.includes(group), `capability group missing: ${group}`);
need(studio.includes("['v38-reports'") && studio.includes("['v38-live'") && studio.includes("['v38-council'"), 'key report/chat/council screens are missing from the launcher');
need(studio.includes('SOCPA أولًا') && studio.includes('أحدث إصدار رسمي نافذ'), 'standards authority summary is missing');

const css = read('public/kosif-studio-v40.css');
for (const token of ['--ks-cobalt:', '--ks-teal:', '--ks-coral:', '--ks-violet:', '--ks-focus:']) need(css.includes(token), `vibrant design token missing: ${token}`);
for (const marker of ['kosif-studio-v40', '.ks40-launcher', '.ks40-install-card', '.v38-report-charts', '.v38-report-readiness', '.v38-council-steps', '[data-theme="dark"]', '@media (min-width:1024px) and (max-width:1440px)', '@media (max-width:720px)', '@media (max-width:390px)', '@media print']) need(css.includes(marker), `responsive experience marker missing: ${marker}`);
need(css.includes("/assets/kosif-studio-hero-v40.webp"), 'v40 hero artwork is not consumed by the audit visual authority');
need(css.includes('#kosif-premium-actions .kpa-grid') && css.includes('grid-template-columns:repeat(4,minmax(0,1fr))!important'), 'desktop quick actions are not an explicit professional grid');
need(css.includes('#app>.drawer') && css.includes('position:fixed!important') && css.includes('#app>.drawer:not(.show)'), 'closed detail drawer can leak into page flow');

const suiteCss = read('public/kosif-suite-v40.css');
for (const surface of ['.suite-head', '.library-head', '.sales-side', '#library .card', '#reader', '.ks40-overlay']) need(suiteCss.includes(surface), `shared suite surface is not themed: ${surface}`);
need(suiteCss.includes('@media (max-width:720px)') && suiteCss.includes('prefers-reduced-motion'), 'shared suite mobile/accessibility floor is incomplete');

const auditPublic = read('public/index.html');
const auditFrontend = read('frontend/index.html');
need(auditPublic === auditFrontend, 'public/frontend audit shells diverged');
for (const html of ['public/index.html', 'frontend/index.html', 'public/hub.html', 'public/libraries/index.html', 'public/sales/index.html', 'public/standards/index.html']) {
  const source = read(html);
  need(source.includes('manifest.webmanifest'), `manifest is not linked in ${html}`);
  need(source.includes('kosif-studio-v40.js'), `v40 install/navigation runtime is not linked in ${html}`);
}
for (const html of ['public/hub.html', 'public/libraries/index.html', 'public/sales/index.html', 'public/standards/index.html']) need(read(html).includes('kosif-suite-v40.css'), `shared v40 theme is not linked in ${html}`);

const reports = read('public/v38-reports.js');
for (const marker of ['function chartBars', 'function chartSeverity', 'function visualsSection', 'v38-report-readiness', 'minor-unit-bigint', "gate('اعتماد المراجع والشريك', 'human'"]) need(reports.includes(marker), `governed report upgrade missing: ${marker}`);
need(reports.includes('BigInt(String(value') && !reports.includes('parseFloat('), 'report visuals must stay derived from exact minor-unit values');

const council = read('public/v38-council-v3.js');
for (const marker of ['v38-council-steps', 'v38-council-presets', 'data-state="idle"', 'role="status"', 'disabled aria-disabled="true"', 'resetDecisionGate()', 'جولة طعن عمياء']) need(council.includes(marker), `Council workflow upgrade missing: ${marker}`);
need(council.includes('recordButton.disabled = false') && council.includes('قرار بشري'), 'human Council gate cannot be verified');

const edge = read('src/suite-edge.js');
need(edge.includes("version:'v41.0.0-root'") && edge.includes('2026.08.21-v41-system-brain-nav-fix'), 'suite release identity does not preserve the v40 base under the current v41 build');
need(edge.includes("installable:true") && edge.includes('/kosif-studio-v40.css?v=2026.08.20-v40'), 'suite shell does not declare/wire installable v40');

const continuity = read('public/v36-continuity.js');
const safety = read('public/v37-audit-safety.js');
const polish = read('public/v38-user-polish.js');
need(continuity.includes("STUDIO_VERSION='v41.0.0-root'") && continuity.includes('releaseMatches(versionInfo)'), 'legacy continuity does not recognize the v41 shell over the v40 base');
for (const [name, source] of [['audit safety', safety], ['user polish', polish]]) need(source.includes('v41.0.0-root') && source.includes('2026.08.20-v41-editorial-cinematic-canva') && source.includes('experienceVersion'), `${name} can leave the legacy release warning over v41`);

const sw = read('public/sw.js');
for (const asset of ['/kosif-studio-v40.css?v=2026.08.20-v40', '/kosif-studio-v40.js?v=40', '/kosif-suite-v40.css?v=40', '/assets/kosif-studio-hero-v40.webp', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png']) need(sw.includes(asset), `service worker missing v40 asset: ${asset}`);
need(sw.includes("const C='kosif-native-v41-2-unified-editorial-app'") && sw.includes("u.pathname.startsWith('/library/')") && sw.includes("u.pathname.startsWith('/api/')"), 'service worker cache/privacy contract is incomplete');
need(sw.includes("await c.match(e.request)||Response.error()") && sw.includes("await c.put(e.request,r.clone())"), 'integrity assets do not retain an offline fallback');

if (failures.length) {
  console.error('KOSIF_V40_EXPERIENCE_FAILED');
  failures.forEach(failure => console.error(' - ' + failure));
  process.exit(1);
}
console.log('KOSIF_V40_EXPERIENCE_OK');
