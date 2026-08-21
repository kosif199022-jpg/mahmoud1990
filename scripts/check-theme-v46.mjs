import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`KOSIF_THEME_V46_CHECK_FAILED: ${message}`);
};

const css = read('public/kosif-sharp-command-center-v46.css');
const guard = read('public/kosif-theme-v46.js');
const build = read('scripts/build-assets.mjs');
const edge = read('src/suite-edge-v43.js');

for (const token of [
  '--k46-ink:#102825',
  '--k46-deep:#081B19',
  '--k46-paper:#FFFCF5',
  '--k46-paper-2:#F7F0E2',
  '--k46-gold:#D7AE58',
  '--k46-cobalt:#315BE8',
  '--k46-teal:#0B8B7C',
  '--k46-coral:#D8654D',
  '--k46-mint:#BDE6D9'
]) assert(css.includes(token), `missing approved design token ${token}`);

assert(css.includes('html[data-kosif-theme="v46"]'), 'v46 root scope missing');
assert(css.includes('linear-gradient(135deg,var(--k46-deep),var(--k46-ink) 55%,var(--k46-ink-2))'), 'emerald masthead contract missing');
assert(css.includes('border-radius:999px'), 'pill navigation contract missing');
assert(css.includes('#kosif-premium-welcome'), 'hero presentation contract missing');
assert(css.includes('body:has(:is(dialog[open],.modal.open,.sheet.open,.drawer.open,[aria-modal="true"]))'), 'modal background scroll lock missing');
assert(css.includes('overflow-y:auto!important'), 'modal internal scrolling contract missing');
assert(css.includes('@media (max-width:620px)'), 'mobile breakpoint contract missing');
assert(css.includes('@media (prefers-reduced-motion:reduce)'), 'reduced-motion contract missing');

assert(guard.includes("const ROOT_ATTR = 'data-kosif-theme'"), 'cascade guard root attribute missing');
assert(guard.includes("const VERSION = 'v46'"), 'cascade guard version missing');
assert(guard.includes('MutationObserver'), 'cascade guard observer missing');
assert(guard.includes('document.head.append(link)'), 'cascade guard cannot keep v46 last');
assert(guard.includes("event.target.closest?.('#kosif-font-open')"), 'font sheet transition trigger missing');
assert(guard.includes("document.getElementById('kosif-more')?.classList.remove('show')"), 'font sheet does not replace the More sheet');

for (const needle of [
  "themeV46CssHref='/kosif-sharp-command-center-v46.css?v=2026.08.22-1'",
  "themeV46GuardSrc='/kosif-theme-v46.js?v=2026.08.22-1'",
  'data-kosif-theme="v46"',
  'function applyThemeV46(',
  'html=applyThemeV46(applyA11yLayerV46(',
  's=applyThemeV46(applyA11yLayerV46(',
  "s.includes(themeV46CssHref)",
  "'${themeV46CssHref}','${themeV46GuardSrc}'"
]) assert(build.includes(needle), `unified static build wiring missing: ${needle}`);

for (const needle of [
  'const THEME_V46 =',
  'const THEME_V46_GUARD =',
  "h.set('x-kosif-theme','v46')",
  "html.setAttribute('data-kosif-theme','v46')",
  'head.append(THEME_V46,{html:true})',
  'head.append(THEME_V46_GUARD,{html:true})'
]) assert(edge.includes(needle), `production edge wiring missing: ${needle}`);

console.log('KOSIF theme v46 contract: PASS');
