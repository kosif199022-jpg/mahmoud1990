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

const env = { DATA: mockKV() };
let result = await bulkOnboard(env, [
  { id: 'custom-ifrs-notes', title: 'Custom metadata A', url: 'https://example.com/a' },
  { id: 'custom-ifrs-notes', title: 'Duplicate in same batch', url: 'https://example.com/b' },
  { id: 'unsafe-local', title: 'Unsafe', url: 'https://127.0.0.1/private' }
]);
ok(result.accepted === 1, 'only one duplicate id accepted in a batch');
ok(result.rejected.some(item => item.id === 'custom-ifrs-notes' && item.reason === 'DUPLICATE_ID'), 'same-batch duplicate explicitly rejected');
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