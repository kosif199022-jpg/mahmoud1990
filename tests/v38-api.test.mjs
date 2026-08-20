/*
 * KOSIF v38 — API integration test (mocked KV + owner session)
 */
import suite from '../src/suite-edge.js';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.error('  ❌ ' + n); } };

function mockKV() {
  const store = new Map();
  return {
    store,
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, String(v)); },
    async delete(k) { store.delete(k); },
    async list({ prefix = '', limit = 100 } = {}) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).slice(0, limit).map(name => ({ name })) }; }
  };
}
function mkEnv() {
  const DATA = mockKV();
  return { DATA, ASSETS: null, KOSIF_PUBLIC_AI_BASE_URL: '', KOSIF_PUBLIC_AI_MODEL: '' };
}
async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }

const env = mkEnv();
const base = 'https://kosif.test';

async function loginOwner() {
  const gateHash = await sha256('test-gate-123');
  env.KOSIF_AI_GATE_HASH = gateHash;
  // محاكاة تسجيل دخول عبر منطق العامل الأصلي معقول هنا؛ نزرع الجلسة مباشرة في KV
  const token = 'owner-token-test';
  const key = 'kosif:ai:session:' + await sha256(token);
  await env.DATA.put(key, JSON.stringify({ createdAt: Date.now(), expiresAt: Date.now() + 3600_000, verified: {} }));
  return token;
}
const call = async (path, opts = {}, token) => {
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.cookie = `kosif_ai_session=${token}`;
  const r = await suite.fetch(new Request(base + path, { headers, ...opts }), env, {});
  let body = null; try { body = await r.clone().json(); } catch {}
  return { status: r.status, body, res: r };
};

console.log('KOSIF v38 API integration tests');

/* قدرات عامة */
let r = await call('/api/kosif/v38/capabilities');
ok(r.status === 200 && r.body.ok && r.body.version === 'v38.0.0-root', 'capabilities public');
ok(Array.isArray(r.body.forbiddenAIFields) && r.body.forbiddenAIFields.includes('final_opinion'), 'forbidden fields exposed for client stripping');

/* نواة محاسبية عبر API */
r = await call('/api/kosif/v38/accounting/parse-money', { method: 'POST', body: JSON.stringify({ value: '١٢٣٤٫٥٠' }) });
ok(r.status === 200 && r.body.minor === '123450', 'arabic money via API');
r = await call('/api/kosif/v38/accounting/trial-balance-summary', { method: 'POST', body: JSON.stringify({ accounts: [
  { code: '1100', name: 'نقدية', debit: '9007199254740991.99', credit: '0' },
  { code: '4100', name: 'إيراد', dr: '0', cr: '9007199254740991.99' }
] }) });
ok(r.status === 200 && r.body.balanced === true && r.body.dr === '900719925474099199' && r.body.cr === '900719925474099199', 'trial balance summary preserves values beyond JS safe integer');
ok(r.body.precision === 'minor-unit-bigint' && r.body.method === 'exact-sum' && r.body.topDr[0].code === '1100', 'trial balance summary declares exact method and ranks with BigInt');
r = await call('/api/kosif/v38/accounting/trial-balance-summary', { method: 'POST', body: JSON.stringify({ accounts: [{ code: '1', debit: '1.001', credit: '0' }] }) });
ok(r.status === 400 && r.body.error === 'TRIAL_BALANCE_AMOUNT_INVALID', 'trial balance summary rejects precision overflow');
r = await call('/api/kosif/v38/accounting/trial-balance-summary', { method: 'POST', body: JSON.stringify({ exp: 99, accounts: [] }) });
ok(r.status === 400 && r.body.error === 'TRIAL_BALANCE_EXP_INVALID', 'trial balance summary rejects an unsupported exponent instead of changing scale silently');
r = await call('/api/kosif/v38/accounting/materiality', { method: 'POST', body: JSON.stringify({ basis: 'profit', amount: '4000000', riskProfile: 'medium' }) });
ok(r.body.ok && r.body.overall === '20000000' && r.body.performance === '13000000', 'materiality via API');
r = await call('/api/kosif/v38/accounting/validate-journal', { method: 'POST', body: JSON.stringify({ entry: { id: 'X', date: '2026-01-01', lines: [{ account: '1', dr: '10' }, { account: '2', cr: '9' }] } }) });
ok(r.status === 200 && r.body.ok === false, 'unbalanced journal rejected via API');
r = await call('/api/kosif/v38/accounting/vat', { method: 'POST', body: JSON.stringify({ taxableSupplies: 1150000, inputVat: 69000 }) });
ok(r.body.outputVat === '17250000' && r.body.netPayable === '10350000', 'ZATCA VAT via API (minor units)');
ok(r.body.inputPrecision === 'minor-unit-bigint', 'VAT endpoint reports deterministic minor-unit precision');
r = await call('/api/kosif/v38/accounting/vat', { method: 'POST', body: JSON.stringify({ taxableSupplies: '9007199254740991.99', inputVat: '0.01' }) });
ok(r.status === 200 && r.body.taxableBase === '900719925474099199' && r.body.outputVat === '135107988821114879' && r.body.netPayable === '135107988821114878', 'VAT preserves amounts beyond JS safe integer');
r = await call('/api/kosif/v38/accounting/vat', { method: 'POST', body: JSON.stringify({ taxableSupplies: '١٠٠٠٫٠١', inputVat: '٠٫٠١' }) });
ok(r.status === 200 && r.body.taxableBase === '100001' && r.body.outputVat === '15000' && r.body.netPayable === '14999', 'VAT accepts Arabic digits without float conversion');
r = await call('/api/kosif/v38/accounting/vat', { method: 'POST', body: JSON.stringify({ taxableSupplies: '1.234' }) });
ok(r.status === 400 && r.body.error === 'VAT_AMOUNT_INVALID', 'VAT rejects precision overflow instead of rounding silently');
r = await call('/api/kosif/v38/accounting/zakat', { method: 'POST', body: JSON.stringify({ basis: '9007199254740991.99' }) });
ok(r.status === 200 && r.body.basis === '900719925474099199' && r.body.estimatedZakat === '22517998136852479' && r.body.inputPrecision === 'minor-unit-bigint', 'Zakat preserves exact large basis');
r = await call('/api/kosif/v38/accounting/zakat', { method: 'POST', body: JSON.stringify({ basis: 'bad-number' }) });
ok(r.status === 400 && r.body.error === 'ZAKAT_BASIS_INVALID', 'Zakat rejects invalid monetary input');

/* إطار المعايير */
r = await call('/api/kosif/v38/framework?start=2027-01-01&end=2027-12-31');
ok(r.body.frameworks.find(f => f.id === 'IFRS_18')?.state === 'in-effect', 'framework IFRS 18 for 2027');

/* حماية المالك */
r = await call('/api/kosif/v38/evidence-graph', { method: 'POST', body: JSON.stringify({ company: 'co1', op: 'node', node: { id: 'n1', type: 'risk', label: 'خطر' } }) });
ok(r.status === 401, 'graph mutation requires owner');
r = await call('/api/kosif/v38/public-ai/status');
ok(r.status === 401, 'public/local AI status is owner-gated');

const token = await loginOwner();
r = await call('/api/kosif/v38/public-ai/status', {}, token);
ok(r.status === 200 && r.body.configured === false && r.body.keyExposure === 'none' && r.body.authority === 'advisory-only', 'public/local AI status exposes no key and no authority');
r = await call('/api/kosif/v38/public-ai', { method: 'POST', body: JSON.stringify({ prompt: 'اختبار' }) }, token);
ok(r.status === 503 && r.body.error === 'PUBLIC_AI_NOT_CONFIGURED', 'public/local AI fails closed without server configuration');
r = await call('/api/kosif/v38/evidence-graph', { method: 'POST', body: JSON.stringify({ company: 'co1', op: 'node', node: { id: 'n1', type: 'risk', label: 'خطر تسعير' } }) }, token);
ok(r.status === 200 && r.body.ok, 'owner can add graph node');
r = await call('/api/kosif/v38/evidence-graph', { method: 'POST', body: JSON.stringify({ company: 'co1', op: 'edge', edge: { from: 'ev9', to: 'n1', kind: 'supports' } }) }, token);
ok(r.body.queued === true, 'edge queued until node exists');
r = await call('/api/kosif/v38/evidence-graph', { method: 'POST', body: JSON.stringify({ company: 'co1', op: 'node', node: { id: 'ev9', type: 'evidence', label: 'كشف حساب' } }) }, token);
ok(r.body.stats.totals.edges === 1, 'queued edge bound after node arrival');
r = await call('/api/kosif/v38/evidence-graph?company=co1', {}, token);
ok(r.status === 200 && r.body.stats.totals.nodes === 2, 'graph GET returns stats');

/* ملاحظات المراجع */
r = await call('/api/kosif/v38/reviewer-notes', { method: 'POST', body: JSON.stringify({ company: 'co1', id: 'note1', type: 'observation', ref: 'n1', text: 'ملاحظة أولى' }) }, token);
ok(r.status === 200 && r.body.note.actor === 'human-reviewer', 'reviewer note created');
r = await call('/api/kosif/v38/reviewer-notes', { method: 'POST', body: JSON.stringify({ company: 'co1', id: 'note1', text: 'x' }) }, token);
ok(r.status === 409, 'note id not silently overwritten');
r = await call('/api/kosif/v38/reviewer-notes?company=co1', {}, token);
ok(r.body.notes.length === 1 && r.body.notes[0].text === 'ملاحظة أولى', 'notes list');

/* مجلس v3: تجريد حقول السلطة + مصفوفة حتمية */
r = await call('/api/kosif/v38/council/matrix', { method: 'POST', body: JSON.stringify({ taskId: 'T1', members: [
  { provider: 'openai', model: 'gpt-test', opinion: { findings: [{ ref: 'REC-1', view: 'agree', severity: 'high', evidence: 'ev9' }, { ref: 'INV-3', view: 'challenge' }], conclusion: 'سليم مع تحفظ', final_opinion: 'unmodified' } },
  { provider: 'gemini', model: 'gemini-test', opinion: { findings: [{ ref: 'REC-1', view: 'agree', severity: 'high' }, { ref: 'INV-3', view: 'agree' }], conclusion: 'سليم' } }
] }) }, token);
ok(r.status === 200, 'council matrix computed');
ok(r.body.matrix.members.every(m => !('opinion' in m) && !('final_opinion' in m)), 'authority field stripped');
ok(!r.body.matrix.conclusions.some(c => /final_opinion/i.test(c)), 'no authority leakage in conclusions');
const rec1 = r.body.matrix.findings.find(f => f.ref === 'REC-1');
const inv3 = r.body.matrix.findings.find(f => f.ref === 'INV-3');
ok(rec1?.state === 'agreement' && rec1.agreementRate === 1, 'REC-1 agreement');
ok(inv3?.state === 'conflict', 'INV-3 conflict detected');
ok(r.body.matrix.governance.canApprove === false, 'AI consensus never converts to approval');

/* الكتب: الفهرس المنسق عام */
r = await call('/api/kosif/v38/books/catalog');
ok(r.status === 200 && r.body.catalog.total > 100, 'curated catalog >100 entries');
ok(r.body.catalog.sections.some(s => s.section.includes('IFRS')), 'IFRS section present');
r = await call('/api/kosif/v38/books/search');
ok(r.status === 400, 'books search requires query');

/* المصادر: السجل الأساسي */
r = await call('/api/kosif/v38/sources/registry');
ok(r.status === 401 || (r.status === 200 && r.body.registry?.core?.length >= 10), 'sources registry gated/available');
r = await call('/api/kosif/v38/sources/registry', {}, token);
ok(r.body.registry.core.some(s => s.id === 'socpa' && s.tier === 'A'), 'SOCPA tier A core source');

/* مسارات خاطئة */
r = await call('/api/kosif/v38/nonexistent', {}, token);
ok(r.status === 404, 'unknown v38 route 404');

console.log(`V38_API_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_API_OK');
