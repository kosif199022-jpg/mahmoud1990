/* KOSIF v38 — Source Intelligence Fabric deterministic safety tests */
import { validateSourceUrl, resolveSafeRedirect, bulkOnboard, loadRegistry } from '../src/v38-source-intelligence.js';

let pass = 0, fail = 0;
const ok = (condition, name) => {
  if (condition) pass++;
  else { fail++; console.error('  ❌ ' + name); }
};

function mockKV() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const value = store.get(key);
      if (value == null) return null;
      return type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) { store.set(key, String(value)); },
    async list({ prefix = '', limit = 100 } = {}) {
      return { keys: [...store.keys()].filter(key => key.startsWith(prefix)).slice(0, limit).map(name => ({ name })) };
    }
  };
}

function mockAssets() {
  const catalog = {
    schema: 'kosif-official-source-catalog-v1',
    sources: [
      {
        id: 'socpa-2026-audit-adoptions-circulars', issuer: 'SOCPA', kind: 'saudi-audit-adoption-circulars', tier: 'A',
        title_ar: 'تعاميم SOCPA لمكاتب المحاسبة — تحديثات معايير المراجعة 2026',
        url: 'https://socpa.org.sa/Socpa/Licensed-Accountants/Circulars-to-accounting-firms.aspx',
        status: 'effective', last_verified: '2026-08-19', requires_verification: false
      },
      {
        id: 'iaasb-isa-330-500-520-ed-2026', issuer: 'IAASB', kind: 'audit-exposure-draft', tier: 'A',
        title_ar: 'مشروعات تعديلات أدلة المراجعة والاستجابة للمخاطر 2026',
        url: 'https://www.iaasb.org/publications/proposed-revisions-audit-evidence-risk-response-isa-330-isa-500-isa-520',
        status: 'exposure-draft', comments_due: '2026-12-15', last_verified: '2026-08-19', requires_verification: false
      }
    ]
  };
  return {
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname !== '/data/kosif-official-sources-2026.json') return new Response('Not found', { status: 404 });
      return Response.json(catalog);
    }
  };
}

console.log('KOSIF v38 Source Intelligence tests');

const good = validateSourceUrl('https://www.ifrs.org/issued-standards/list-of-standards/');
ok(good?.protocol === 'https:' && good.hostname === 'www.ifrs.org', 'official HTTPS source accepted');
ok(validateSourceUrl('http://www.ifrs.org/') === null, 'plain HTTP rejected');
ok(validateSourceUrl('https://127.0.0.1/a') === null, 'IPv4 literal rejected');
ok(validateSourceUrl('https://[::1]/a') === null, 'IPv6 literal rejected');
ok(validateSourceUrl('https://localhost/a') === null, 'localhost rejected');
ok(validateSourceUrl('https://user:pass@example.com/a') === null, 'credential URL rejected');
ok(validateSourceUrl('https://example.com:8443/a') === null, 'non-standard HTTPS port rejected');

const relative = resolveSafeRedirect('https://www.ifrs.org/standards', '/issued-standards/');
ok(relative?.href === 'https://www.ifrs.org/issued-standards/', 'same-origin relative redirect resolved safely');
const sameOriginAbsolute = resolveSafeRedirect('https://socpa.org.sa/a', 'https://socpa.org.sa/b');
ok(sameOriginAbsolute?.href === 'https://socpa.org.sa/b', 'same-origin absolute redirect allowed');
ok(resolveSafeRedirect('https://socpa.org.sa/a', 'https://evil.example/b') === null, 'cross-origin redirect blocked');
ok(resolveSafeRedirect('https://socpa.org.sa/a', 'http://socpa.org.sa/b') === null, 'HTTPS downgrade redirect blocked');

const env = { DATA: mockKV(), ASSETS: mockAssets() };
const before = await loadRegistry(env);
ok(before.officialCatalog.loaded === 2, 'official source catalog is loaded through the first-party asset binding');
const ed = before.core.find(source => source.id === 'iaasb-isa-330-500-520-ed-2026');
ok(ed?.tier === 'A' && ed.catalog === true, 'catalog source is promoted into runtime Tier A registry');
ok(ed?.status === 'exposure-draft' && ed?.commentsDue === '2026-12-15', 'exposure-draft status and due date remain explicit runtime metadata');
ok(before.core.findIndex(source => source.id === 'iaasb-isa-330-500-520-ed-2026') < before.core.findIndex(source => source.id === 'openai-docs'), 'official Tier A catalog records are prioritized before Tier C providers');

let result = await bulkOnboard(env, [
  { id: 'custom-ifrs-notes', title: 'Custom metadata A', url: 'https://example.com/a' },
  { id: 'custom-ifrs-notes', title: 'Duplicate in same batch', url: 'https://example.com/b' },
  { id: 'iaasb-isa-330-500-520-ed-2026', title: 'Cannot shadow official', url: 'https://example.com/c' },
  { id: 'unsafe-local', title: 'Unsafe', url: 'https://127.0.0.1/private' }
]);
ok(result.accepted === 1, 'only one safe unique custom source accepted in a batch');
ok(result.rejected.some(item => item.id === 'custom-ifrs-notes' && item.reason === 'DUPLICATE_ID'), 'same-batch duplicate explicitly rejected');
ok(result.rejected.some(item => item.id === 'iaasb-isa-330-500-520-ed-2026' && item.reason === 'DUPLICATE_ID'), 'custom source cannot shadow an official catalog id');
ok(result.rejected.some(item => item.id === 'unsafe-local' && item.reason === 'UNSAFE_OR_INVALID_URL'), 'unsafe custom source rejected');

const registry = await loadRegistry(env);
ok(registry.custom.length === 1 && registry.custom[0].id === 'custom-ifrs-notes', 'registry persists one canonical custom source');
ok(registry.custom[0].tier === 'D' && registry.custom[0].metadataOnly === true, 'custom sources remain metadata-only tier D');
ok(registry.core.some(source => source.id === 'ifrs-foundation' && source.tier === 'A'), 'IFRS Foundation remains tier A');
ok(registry.core.some(source => source.id === 'socpa' && source.tier === 'A'), 'SOCPA remains tier A');
ok(registry.core.some(source => source.id === 'zatca' && source.tier === 'A'), 'ZATCA remains tier A');

console.log(`V38_SOURCE_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_SOURCE_OK');
