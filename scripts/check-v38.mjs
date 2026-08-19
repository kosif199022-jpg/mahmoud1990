/*
 * KOSIF v38 — فحص عقد الإصدار 38
 * يتحقق من حضور ملفات v38 وربطها في الطبقات الصحيحة وصحة الحزمات الثابتة.
 */
import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const ok = (c, m) => { if (!c) throw new Error('V38_CONTRACT_FAIL: ' + m); console.log('  ✅ ' + m); };

const edge = read('src/suite-edge.js');
const proxy = read('src/suite-proxy.js');
const api = read('src/v38-api.js');
const wrangler = read('wrangler.toml');
const pkg = JSON.parse(read('package.json'));

ok(fs.existsSync('src/engine/v38-core.mjs'), 'deterministic v38 core engine is present');
ok(fs.existsSync('tests/v38-core.test.mjs'), 'v38 core tests are present');
ok(fs.existsSync('src/engine/v38-evidence-graph.mjs'), 'evidence graph engine is present');
ok(fs.existsSync('tests/v38-evidence-graph.test.mjs'), 'evidence graph tests are present');
ok(fs.existsSync('tests/v38-api.test.mjs'), 'v38 API integration tests are present');
ok(fs.existsSync('src/public-ai-provider.js'), 'public/local AI provider module is present');
ok(fs.existsSync('src/v38-realtime.js'), 'OpenAI realtime relay is present');
ok(fs.existsSync('src/v38-source-intelligence.js'), 'source intelligence fabric is present');
ok(fs.existsSync('src/v38-books.js'), 'books bridge (Open Library gateway) is present');
ok(fs.existsSync('scripts/generate-v38-demo.mjs'), 'synthetic audit lab generator is present');
ok(fs.existsSync('public/demo/v38/manifest.json'), 'synthetic lab dataset manifest is generated');

for (const f of ['v38-ultimate.css', 'v38-ultimate.js', 'v38-io.js', 'v38-reports.js', 'v38-accounting.js', 'v38-evidence-graph.js', 'v38-council-v3.js', 'v38-source-fabric.js', 'v38-books.js', 'v38-live.js', 'v38-lab.js', 'v38-user-polish.css', 'v38-user-polish.js']) {
  ok(fs.existsSync('public/' + f) && read('public/' + f).length > 500, 'client module ' + f + ' exists and is substantial');
}

ok(edge.includes("version:'v38.1.0-root'"), 'suite version is v38.1.0-root');
ok(edge.includes('2026.08.19-v38.1-user-polish'), 'v38.1 build id is set');
ok(edge.includes('handleV38') && edge.includes('/api/kosif/v38/'), 'v38 API router is wired into the suite edge');
ok(edge.includes('/v38-ultimate.js?v=38') && edge.includes('/v38-ultimate.css?v=38'), 'audit shell injects the v38 visual layer');
ok(edge.includes('/v38-user-polish.js?v=38.1.0') && edge.includes('/v38-user-polish.css?v=38.1.0'), 'audit shell injects final user polish after v38 core');
ok(edge.includes('v38-io.js') && edge.includes('v38-reports.js') && edge.includes('v38-books.js'), 'audit shell injects v38 workspaces (io/reports/books)');
ok(edge.includes("'cache-control','no-cache, no-store, must-revalidate'"), 'audit HTML is not allowed to reuse a stale release shell');

const polish = read('public/v38-user-polish.js');
ok(polish.includes('KosifSecureAIKeys') && polish.includes("zai:'"), 'council provider keys are session-memory only and include Z.ai');
ok(polish.includes("path === '/api/kosif/v38/public-ai'") && polish.includes("provider:'zai'"), 'legacy fourth council seat routes to Z.ai when configured');
ok(polish.includes('DIGIT_MAP') && polish.includes('westernize'), 'Western digit presentation layer is present');
ok(polish.includes('showStandardFallback') && polish.includes('مثال بسيط بالمصري'), 'standards fallback includes practical Egyptian-Arabic explanation');
ok(polish.includes('reconcileReleaseWarning') && polish.includes('/__version'), 'stale release warning is removed only after live-version verification');

ok(proxy.includes('#mixLaunch') && proxy.includes('#smartPebble'), 'Mafateeh reader hides Mix and Smart AI launchers by default');
ok(proxy.includes('kosif-reader-home') && proxy.includes('kosif-reader-library-home'), 'Mafateeh reader has explicit home/library navigation');
ok(proxy.includes('std2018') && proxy.includes('std2025') && proxy.includes('dipifr'), 'all prepared books continue to use the Mafateeh reader proxy');

ok(api.includes('OWNER_AUTH_REQUIRED'), 'v38 operational routes are owner-gated');
ok(api.includes('forbiddenAIFields') && api.includes('canApprove: false'), 'council governance strips authority and never auto-approves');
ok(api.includes('stripAuthority'), 'AI outputs are stripped of authority fields server-side');
ok(api.includes('openlibrary') || read('src/v38-books.js').includes('openlibrary.org'), 'millions-of-books gateway targets Open Library');
ok(read('src/v38-source-intelligence.js').includes('UNSAFE_OR_INVALID_URL') && read('src/v38-source-intelligence.js').includes('256'), 'source fabric enforces safe URLs and bounded samples');

ok(/main\s*=\s*"src\/suite-edge\.js"/.test(wrangler), 'suite edge remains the deploy entrypoint');
ok(pkg.scripts['v38-core'] && pkg.scripts['v38-graph'] && pkg.scripts['v38-api'], 'v38 test scripts are registered in package.json');
ok(String(pkg.scripts.check).includes('v38-suite'), 'v38 suite is part of the master check chain');

const manifest = JSON.parse(read('public/demo/v38/manifest.json'));
ok(manifest.seed === 380019 && manifest.totals.balanced === true && manifest.counts?.accounts === 1000 && manifest.synthetic_only === true, 'synthetic lab matches the deploy-gate contract (seed/counts/synthetic_only)');
ok(Object.keys(manifest.datasets).length >= 20, 'synthetic lab has 20+ datasets');

console.log('V38_CONTRACT_OK');
