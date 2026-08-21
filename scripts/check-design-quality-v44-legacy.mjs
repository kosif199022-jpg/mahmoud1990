import fs from 'node:fs';

const requiredFiles = [
  'config/design-tokens-v44.json',
  'public/kosif-design-system-v44.css',
  'public/kosif-design-system-v44.js',
  '.storybook/main.mjs',
  '.storybook/preview-head.html',
  'stories/KosifDesignSystem.stories.js',
  'tests/browser/design-quality.spec.mjs',
  'lighthouserc.json',
  '.github/workflows/design-quality-v44.yml'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Design quality v44 missing required file: ${file}`);
}

const tokens = JSON.parse(fs.readFileSync('config/design-tokens-v44.json', 'utf8'));
for (const key of ['color', 'font', 'space', 'radius', 'shadow', 'motion', 'layout']) {
  if (!tokens[key]) throw new Error(`Design tokens missing group: ${key}`);
}
if (tokens?.layout?.touchTarget?.value !== '44px') throw new Error('Touch target token must remain 44px');

const css = fs.readFileSync('public/kosif-design-system-v44.css', 'utf8');
for (const marker of ['--k44-fs-display', '--k44-touch:44px', 'prefers-reduced-motion:reduce', '@media (max-width:768px)', ':focus-visible']) {
  if (!css.includes(marker)) throw new Error(`Design CSS missing marker: ${marker}`);
}

const runtime = fs.readFileSync('public/kosif-design-system-v44.js', 'utf8');
for (const marker of ['kosifDesignSystem = \'v44\'', 'KOSIFObservability', 'IntersectionObserver', 'kosif:design-ready']) {
  if (!runtime.includes(marker)) throw new Error(`Design runtime missing marker: ${marker}`);
}

const build = fs.readFileSync('scripts/build-assets.mjs', 'utf8');
for (const marker of ['/kosif-design-system-v44.css', '/kosif-design-system-v44.js', 'kosif-design-system']) {
  if (!build.includes(marker)) throw new Error(`Build injection missing marker: ${marker}`);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['design-quality-v44', 'storybook', 'storybook:build', 'lighthouse', 'visual:chromatic']) {
  if (!packageJson.scripts?.[script]) throw new Error(`package.json missing script: ${script}`);
}

console.log('KOSIF Design Quality Stack v44 contract OK');
