/*
 * KOSIF v38 — Source Intelligence Fabric
 * سجل مصادر رسمي-أولًا بطبقات ثقة، مع كشف تغيّر محدود ومضبوط.
 * HTTPS فقط؛ يمنع بيانات الاعتماد في الروابط وعناوين IP/localhost
 * والمنافذ غير القياسية وإعادة التوجيه غير الآمنة؛ عينة 256KB كحد أقصى؛
 * لا نسخ كامل للنصوص؛ تحديث مقنّن (≤20 هدفًا للطلب، تزامن 4).
 */
const MAX_SAMPLE = 256 * 1024;
const MAX_REFRESH = 20;
const MAX_CONCURRENCY = 4;
const HISTORY_LIMIT = 50;
const REGISTRY_CAPACITY = 5000;
const BULK_BATCH = 500;

const CORE_SOURCES = [
  { id: 'ifrs-foundation', title: 'مؤسسة المعايير الدولية للتقارير المالية IFRS', url: 'https://www.ifrs.org/', tier: 'A', kind: 'accounting-standards' },
  { id: 'iaasb', title: 'مجلس معايير المراجعة الدولية IAASB', url: 'https://www.iaasb.org/', tier: 'A', kind: 'audit-standards' },
  { id: 'socpa', title: 'الهيئة السعودية للمراجعين والمحاسبين SOCPA', url: 'https://socpa.org.sa/', tier: 'A', kind: 'local-authority' },
  { id: 'zatca', title: 'هيئة الزكاة والضريبة والجمارك ZATCA', url: 'https://zatca.gov.sa/', tier: 'A', kind: 'local-tax' },
  { id: 'nca-saudi', title: 'الهيئة الوطنية للأمن السيبراني NCA', url: 'https://nca.gov.sa/', tier: 'B', kind: 'local-regulator' },
  { id: 'sdaia', title: 'الهيئة السعودية للبيانات والذكاء الاصطناعي SDAIA', url: 'https://sdaia.gov.sa/', tier: 'B', kind: 'local-regulator' },
  { id: 'nist', title: 'المعهد الوطني للمعايير والتقنية NIST', url: 'https://www.nist.gov/', tier: 'B', kind: 'security' },
  { id: 'w3c', title: 'تحالف الويب العالمي W3C', url: 'https://www.w3.org/', tier: 'B', kind: 'web' },
  { id: 'openai-docs', title: 'توثيق OpenAI', url: 'https://platform.openai.com/docs', tier: 'C', kind: 'ai-provider' },
  { id: 'anthropic-docs', title: 'توثيق Anthropic Claude', url: 'https://docs.anthropic.com/', tier: 'C', kind: 'ai-provider' },
  { id: 'gemini-docs', title: 'توثيق Google Gemini', url: 'https://ai.google.dev/docs', tier: 'C', kind: 'ai-provider' },
  { id: 'crossref', title: 'Crossref — فهرس DOI الأكاديمي', url: 'https://www.crossref.org/', tier: 'C', kind: 'research' },
  { id: 'arxiv', title: 'arXiv — مسودات بحثية مفتوحة', url: 'https://arxiv.org/', tier: 'C', kind: 'research' },
  { id: 'openlibrary', title: 'Open Library — عشرات ملايين الكتب', url: 'https://openlibrary.org/', tier: 'C', kind: 'books' }
];
const RESERVED_IDS = new Set(CORE_SOURCES.map(s => s.id));
const REGISTRY_KEY = 'kosif:v38:sources:registry';
const HISTORY_KEY = id => `kosif:v38:sources:history:${id}`;

export function listCoreSources() { return CORE_SOURCES; }

export async function loadRegistry(env) {
  const custom = env?.DATA ? ((await env.DATA.get(REGISTRY_KEY, 'json')) || { sources: [] }) : { sources: [] };
  return { core: CORE_SOURCES, custom: (custom.sources || []).slice(0, REGISTRY_CAPACITY), capacity: REGISTRY_CAPACITY, used: (custom.sources || []).length };
}

function safeUrl(raw) {
  let url;
  try { url = new URL(String(raw || '')); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (/@/.test(url.href) || /:\d+/.test(url.host) && !url.port) return null;
  const host = url.hostname.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (url.port && !['443', ''].includes(url.port)) return null;
  if (url.username || url.password) return null;
  return url;
}

async function fetchSample(target) {
  const url = safeUrl(target.url);
  if (!url) return { ok: false, error: 'UNSAFE_OR_INVALID_URL' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url.href, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': 'KOSIF-v38-SourceFabric/1.0 (change-detection; metadata-only)' } });
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      const safe = safeUrl(loc);
      if (!safe || safe.origin !== url.origin) return { ok: false, error: 'BLOCKED_REDIRECT' };
      return fetchSample({ ...target, url: safe.href });
    }
    if (!res.ok) return { ok: false, error: `HTTP_${res.status}` };
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, error: 'NO_BODY' };
    const chunks = []; let total = 0;
    while (total < MAX_SAMPLE) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); total += value.length;
      if (total >= MAX_SAMPLE) await reader.cancel().catch(() => {});
    }
    const buf = new Uint8Array(Math.min(total, MAX_SAMPLE));
    let off = 0;
    for (const c of chunks) { if (off >= buf.length) break; buf.set(c.subarray(0, buf.length - off), off); off += c.length; }
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const hash = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buf.subarray(0, 2048));
    const injectionSuspected = /(ignore (all|previous)|تجاهل التعليمات|system prompt|<\|im_start\|>)/i.test(text);
    return {
      ok: true, contentHash: hash, sampledBytes: buf.length,
      etag: res.headers.get('etag') || null, lastModified: res.headers.get('last-modified') || null,
      finalUrl: res.url || url.href, contentType: res.headers.get('content-type') || '',
      checkedAt: new Date().toISOString(), injectionSuspected
    };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e?.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_FAILED' };
  }
}

export async function refreshSources(env, ids = []) {
  const registry = await loadRegistry(env);
  const all = [...registry.core, ...registry.custom];
  const targets = (ids.length ? all.filter(s => ids.includes(s.id)) : all).slice(0, MAX_REFRESH);
  const results = [];
  const queue = [...targets];
  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const t = queue.shift();
      const sample = await fetchSample(t);
      const prev = env?.DATA ? await env.DATA.get(HISTORY_KEY(t.id), 'json') : null;
      const prevVersions = Array.isArray(prev?.versions) ? prev.versions : [];
      const changed = sample.ok && (!prevVersions.length || prevVersions[prevVersions.length - 1].contentHash !== sample.contentHash);
      const versions = sample.ok ? [...prevVersions, { checkedAt: sample.checkedAt, contentHash: sample.contentHash, etag: sample.etag, lastModified: sample.lastModified, finalUrl: sample.finalUrl, injectionSuspected: sample.injectionSuspected }].slice(-HISTORY_LIMIT) : prevVersions;
      if (sample.ok && env?.DATA) await env.DATA.put(HISTORY_KEY(t.id), JSON.stringify({ id: t.id, versions }));
      results.push({ id: t.id, title: t.title, tier: t.tier, ok: sample.ok, error: sample.ok ? null : sample.error, changed, versionsStored: versions.length, injectionSuspected: sample.ok ? sample.injectionSuspected : null });
    }
  });
  await Promise.all(workers);
  return { refreshed: results.length, skipped: Math.max(0, (ids.length || all.length) - targets.length), results };
}

export async function sourceStatus(env, id) {
  if (!id) {
    if (!env?.DATA) return { entries: [] };
    const list = await env.DATA.list({ prefix: 'kosif:v38:sources:history:', limit: 200 });
    const entries = [];
    for (const k of list.keys || []) {
      const v = await env.DATA.get(k.name, 'json');
      if (v) entries.push({ id: v.id, versions: (v.versions || []).length, last: (v.versions || []).slice(-1)[0] || null });
    }
    return { entries };
  }
  const v = env?.DATA ? await env.DATA.get(HISTORY_KEY(String(id)), 'json') : null;
  return { id, versions: (v?.versions || []).slice(-HISTORY_LIMIT) };
}

export async function bulkOnboard(env, sources) {
  const list = Array.isArray(sources) ? sources : [];
  if (!list.length) return { ok: false, error: 'NO_SOURCES' };
  if (list.length > BULK_BATCH) return { ok: false, error: `BATCH_TOO_LARGE:${list.length}>${BULK_BATCH}` };
  const registry = await loadRegistry(env);
  const existing = new Set([...registry.core.map(s => s.id), ...registry.custom.map(s => s.id)]);
  const accepted = [], rejected = [];
  for (const s of list) {
    const id = String(s?.id || '').trim();
    const url = safeUrl(s?.url);
    if (!id || RESERVED_IDS.has(id)) { rejected.push({ id: id || '(empty)', reason: 'RESERVED_OR_EMPTY_ID' }); continue; }
    if (!url) { rejected.push({ id, reason: 'UNSAFE_OR_INVALID_URL' }); continue; }
    if (existing.has(id)) { rejected.push({ id, reason: 'DUPLICATE_ID' }); continue; }
    if (registry.custom.length + accepted.length >= REGISTRY_CAPACITY) { rejected.push({ id, reason: 'REGISTRY_CAPACITY' }); continue; }
    accepted.push({ id, title: String(s.title || id).slice(0, 200), url: url.href, tier: 'D', kind: String(s.kind || 'custom').slice(0, 40), metadataOnly: true, onboardedAt: new Date().toISOString() });
  }
  if (accepted.length && env?.DATA) await env.DATA.put(REGISTRY_KEY, JSON.stringify({ sources: [...registry.custom, ...accepted].slice(0, REGISTRY_CAPACITY) }));
  return { ok: rejected.length === 0, accepted: accepted.length, rejected, note: 'المصادر المخصصة تُخزن طبقة D ولقراءة البيانات الوصفية فقط ولا تستبدل المصادر الرسمية.' };
}
