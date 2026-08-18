import fs from 'node:fs';

const css=fs.readFileSync('public/v36-polish-phase-d.css','utf8');
const mobile=fs.readFileSync('public/v36-mobile-phase-b.css','utf8');
const stdCss=fs.readFileSync('public/standards/polish-phase-d.css','utf8');
const bridge=fs.readFileSync('public/standards/bridge.js','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const stdSw=fs.readFileSync('public/standards/sw.js','utf8');
const failures=[];
const ok=(name,value)=>{console.log(`${value?'✓':'✗'} ${name}`);if(!value)failures.push(name)};

ok('Aghnam palette is explicit',/#6366f1/i.test(css)&&/#a855f7/i.test(css)&&/#06b6d4/i.test(css)&&/#10b981/i.test(css)&&/#f43f5e/i.test(css));
ok('Phase D loads after mobile hardening',/@import url\('\/v36-polish-phase-d\.css\?v=36\.4-phase-d-1'\)/.test(mobile));
ok('core cards and controls share the polish system',/\.card,\.kpi,\.step/.test(css)&&/\.btn\.primary/.test(css)&&/\.field input/.test(css)&&/table\.data th/.test(css));
ok('PBC, rounds, council, reviewer, outputs and settings are covered',/#view-pbc/.test(css)&&/#view-rounds/.test(css)&&/#view-council/.test(css)&&/#view-reviewer/.test(css)&&/#view-outputs/.test(css)&&/#view-settings/.test(css));
ok('AI Council provider cards are visually scoped only',/\[data-cv2-provider\]/.test(css)&&!/fetch\(|\/api\//.test(css));
ok('loading, empty and semantic states are polished',/aria-busy/.test(css)&&/k4Shimmer/.test(css)&&/\.empty/.test(css)&&/\.badge\.ok/.test(css)&&/\.badge\.warn/.test(css)&&/\.badge\.danger/.test(css));
ok('micro interactions respect reduced motion',/k4Enter/.test(css)&&/@media\(prefers-reduced-motion:reduce\)/.test(css));
ok('touch devices do not receive hover lifts',/@media\(hover:hover\) and \(pointer:fine\)/.test(css));
ok('dark mode remains supported',/html\[data-theme="dark"\]/.test(css));
ok('standards reader loads its dedicated polish layer',/polish-phase-d\.css\?v=36\.4-phase-d-1/.test(bridge)&&/kosif-standards-phase-d/.test(bridge));
ok('standards typography and reading controls stay readable',/#prose h3/.test(stdCss)&&/#chead/.test(stdCss)&&/#dock/.test(stdCss)&&/\.sheet/.test(stdCss)&&/#q:focus/.test(stdCss));
ok('standards polish respects reduced motion',/@media\(prefers-reduced-motion:reduce\)/.test(stdCss));
ok('main polish works offline',/v36-polish-phase-d\.css/.test(sw));
ok('standards polish works offline',/standards\/polish-phase-d\.css/.test(stdSw));
ok('Phase D contains no business calculation or AI request code',!/Math\.random|\/api\/kosif|adjusting_entries|materiality\s*=|debit\s*[-+*/]?=|credit\s*[-+*/]?=/i.test(css+stdCss));

if(failures.length){console.error(`PRODUCT_POLISH_PHASE_D_FAILED ${failures.length}`);for(const f of failures)console.error(` - ${f}`);process.exit(2)}
console.log('PRODUCT_POLISH_PHASE_D_OK');
