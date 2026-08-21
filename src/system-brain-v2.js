/*
 * KOSIF System Brain v2 — fast semantic memory for books and professional sources.
 *
 * Server-side only secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   LLAMA_CLOUD_API_KEY
 *   SYSTEM_BRAIN_EMBEDDING_API_KEY (or OPENAI_API_KEY)
 * Optional:
 *   SYSTEM_BRAIN_EMBEDDING_URL
 *   SYSTEM_BRAIN_EMBEDDING_MODEL
 *
 * The browser never receives service-role, LlamaCloud or embedding keys.
 */
const LLAMA_BASE = 'https://api.cloud.llamaindex.ai/api/v1';
const DEFAULT_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
const MAX_TEXT_BYTES = 8 * 1024 * 1024;
const MAX_SEARCH = 20;
const CHUNK_CHARS = 1800;
const CHUNK_OVERLAP = 220;
const EMBED_BATCH = 48;
const INSERT_BATCH = 100;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-kosif-brain': 'v2'
    }
  });
}
const error = (code, message, status = 400, extra = {}) => json({ ok: false, error: code, message: message || code, ...extra }, status);

function envText(env, name) { return String(env?.[name] || '').trim(); }
function hasSupabase(env) { return /^https:\/\//i.test(envText(env, 'SUPABASE_URL')) && !!envText(env, 'SUPABASE_SERVICE_ROLE_KEY'); }
function hasParser(env) { return !!envText(env, 'LLAMA_CLOUD_API_KEY'); }
function hasEmbedding(env) { return !!(envText(env, 'SYSTEM_BRAIN_EMBEDDING_API_KEY') || envText(env, 'OPENAI_API_KEY')); }
function embeddingModel(env) { return envText(env, 'SYSTEM_BRAIN_EMBEDDING_MODEL') || DEFAULT_EMBED_MODEL; }
function embeddingUrl(env) { return envText(env, 'SYSTEM_BRAIN_EMBEDDING_URL') || DEFAULT_EMBED_URL; }

export function brainConfigStatus(env) {
  const postgres = hasSupabase(env);
  const parser = hasParser(env);
  const embeddings = hasEmbedding(env);
  return {
    ok: true,
    version: 'kosif.system-brain.v2',
    architecture: 'LlamaParse → chunking → embeddings → PostgreSQL/pgvector → semantic retrieval',
    postgres: { configured: postgres, engine: 'Supabase PostgreSQL + pgvector', serverSideSecret: true },
    parser: { configured: parser, engine: 'LlamaParse', serverSideSecret: true },
    embeddings: { configured: embeddings, model: embeddingModel(env), dimensions: DEFAULT_DIMENSIONS, serverSideSecret: true },
    ready: postgres && parser && embeddings,
    textIngestReady: postgres && embeddings,
    privacy: 'service keys are server-side only; ingest/search mutations require an owner session'
  };
}

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function safeDocumentKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const clean = raw.replace(/[^A-Za-z0-9._:\-\u0600-\u06FF]/g, '-').replace(/-+/g, '-').slice(0, 180);
  return clean || '';
}
function safeJobId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{6,160}$/.test(id) ? id : '';
}
function utf8Bytes(text) { return new TextEncoder().encode(String(text || '')).byteLength; }

export function chunkPages(pages, options = {}) {
  const maxChars = Math.min(Math.max(Number(options.maxChars) || CHUNK_CHARS, 600), 4000);
  const overlap = Math.min(Math.max(Number(options.overlap) || CHUNK_OVERLAP, 0), Math.floor(maxChars / 3));
  const out = [];
  let index = 0;
  for (const src of Array.isArray(pages) ? pages : []) {
    const page = Number(src?.page || src?.page_number || src?.pageNumber || 0) || null;
    const text = normalizeText(src?.text || src?.markdown || src?.md || '');
    if (!text) continue;
    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + maxChars);
      if (end < text.length) {
        const floor = Math.max(start + Math.floor(maxChars * 0.58), start + 1);
        const slice = text.slice(floor, end);
        const boundary = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('。'), slice.lastIndexOf('. '), slice.lastIndexOf('؟'), slice.lastIndexOf('! '));
        if (boundary >= 0) end = floor + boundary + 1;
      }
      const content = normalizeText(text.slice(start, end));
      if (content.length >= 30) out.push({ chunk_index: index++, page_start: page, page_end: page, content });
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return out;
}

function llamaPageText(page) {
  if (!page || typeof page !== 'object') return '';
  const direct = page.md || page.markdown || page.text || page.raw_text || page.content;
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (Array.isArray(page.items)) return page.items.map(item => {
    if (typeof item === 'string') return item;
    return item?.md || item?.text || item?.value || item?.content || '';
  }).filter(Boolean).join('\n');
  return '';
}

export function pagesFromLlamaResult(result) {
  const source = Array.isArray(result?.pages) ? result.pages
    : Array.isArray(result?.data?.pages) ? result.data.pages
      : Array.isArray(result) ? result : [];
  if (source.length) return source.map((p, i) => ({ page: Number(p?.page || p?.page_number || p?.pageNumber || i + 1) || i + 1, text: normalizeText(llamaPageText(p)) })).filter(p => p.text);
  const text = normalizeText(result?.markdown || result?.text || result?.content || result?.data?.markdown || result?.data?.text || '');
  return text ? [{ page: 1, text }] : [];
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function supabase(env, path, init = {}) {
  if (!hasSupabase(env)) throw new Error('SUPABASE_NOT_CONFIGURED');
  const base = envText(env, 'SUPABASE_URL').replace(/\/$/, '');
  const key = envText(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const headers = new Headers(init.headers || {});
  headers.set('apikey', key);
  headers.set('authorization', `Bearer ${key}`);
  if (init.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const r = await fetch(base + path, { ...init, headers });
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.text()).slice(0, 900); } catch (_) {}
    const e = new Error(`SUPABASE_${r.status}${detail ? ':' + detail : ''}`);
    e.status = r.status;
    throw e;
  }
  if (r.status === 204) return null;
  const type = r.headers.get('content-type') || '';
  return /json/i.test(type) ? r.json() : r.text();
}

async function embedTexts(env, texts) {
  if (!hasEmbedding(env)) throw new Error('EMBEDDINGS_NOT_CONFIGURED');
  const key = envText(env, 'SYSTEM_BRAIN_EMBEDDING_API_KEY') || envText(env, 'OPENAI_API_KEY');
  const url = embeddingUrl(env);
  const model = embeddingModel(env);
  const vectors = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const input = texts.slice(i, i + EMBED_BATCH);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, input, dimensions: DEFAULT_DIMENSIONS })
    });
    let data = null;
    try { data = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(`EMBEDDINGS_${r.status}:${String(data?.error?.message || data?.message || '').slice(0, 500)}`);
    const items = Array.isArray(data?.data) ? [...data.data].sort((a, b) => Number(a.index) - Number(b.index)) : [];
    if (items.length !== input.length) throw new Error('EMBEDDINGS_COUNT_MISMATCH');
    for (const item of items) {
      if (!Array.isArray(item.embedding) || item.embedding.length !== DEFAULT_DIMENSIONS) throw new Error('EMBEDDINGS_DIMENSION_MISMATCH');
      vectors.push(item.embedding);
    }
  }
  return vectors;
}

function vectorLiteral(v) { return `[${v.map(n => Number(n).toFixed(8)).join(',')}]`; }

async function upsertDocument(env, doc, contentHash) {
  const payload = [{
    document_key: doc.documentKey,
    title: doc.title || doc.documentKey,
    source_type: doc.sourceType || 'uploaded-pdf',
    source_ref: doc.sourceRef || null,
    authority: doc.authority || 'reference',
    jurisdiction: doc.jurisdiction || 'saudi',
    period_label: doc.period || null,
    content_sha256: contentHash,
    metadata: doc.metadata || {},
    updated_at: new Date().toISOString()
  }];
  const rows = await supabase(env, '/rest/v1/kosif_brain_documents?on_conflict=document_key', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.id) throw new Error('DOCUMENT_UPSERT_FAILED');
  return row;
}

async function replaceChunks(env, documentId, chunks, vectors) {
  await supabase(env, `/rest/v1/kosif_brain_chunks?document_id=eq.${encodeURIComponent(documentId)}`, { method: 'DELETE' });
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const batch = chunks.slice(i, i + INSERT_BATCH).map((c, j) => ({
      document_id: documentId,
      chunk_index: c.chunk_index,
      page_start: c.page_start,
      page_end: c.page_end,
      content: c.content,
      embedding: vectorLiteral(vectors[i + j]),
      metadata: c.metadata || {}
    }));
    await supabase(env, '/rest/v1/kosif_brain_chunks', {
      method: 'POST',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify(batch)
    });
  }
}

async function ingestPages(env, input) {
  const documentKey = safeDocumentKey(input?.documentKey || input?.document_key);
  if (!documentKey) throw new Error('DOCUMENT_KEY_REQUIRED');
  const pages = Array.isArray(input?.pages) ? input.pages : (normalizeText(input?.text) ? [{ page: 1, text: input.text }] : []);
  const normalizedPages = pages.map((p, i) => ({ page: Number(p?.page || p?.page_number || i + 1) || i + 1, text: normalizeText(p?.text || p?.markdown || p?.md || '') })).filter(p => p.text);
  if (!normalizedPages.length) throw new Error('DOCUMENT_TEXT_REQUIRED');
  const totalText = normalizedPages.map(p => p.text).join('\n\n');
  if (utf8Bytes(totalText) > MAX_TEXT_BYTES) throw new Error('DOCUMENT_TEXT_TOO_LARGE');
  const chunks = chunkPages(normalizedPages);
  if (!chunks.length) throw new Error('NO_INDEXABLE_CHUNKS');
  const vectors = await embedTexts(env, chunks.map(c => c.content));
  const contentHash = await sha256(totalText);
  const doc = await upsertDocument(env, {
    ...input,
    documentKey,
    title: String(input?.title || documentKey).slice(0, 300),
    sourceType: String(input?.sourceType || 'uploaded-pdf').slice(0, 80),
    sourceRef: input?.sourceRef ? String(input.sourceRef).slice(0, 1000) : null,
    authority: String(input?.authority || 'reference').slice(0, 80),
    jurisdiction: String(input?.jurisdiction || 'saudi').slice(0, 80),
    period: input?.period ? String(input.period).slice(0, 120) : null,
    metadata: input?.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  }, contentHash);
  await replaceChunks(env, doc.id, chunks, vectors);
  return { document: doc, chunks: chunks.length, pages: normalizedPages.length, contentSha256: contentHash, embeddingModel: embeddingModel(env) };
}

async function searchBrain(env, payload) {
  const q = normalizeText(payload?.query || payload?.q || '');
  if (!q) throw new Error('QUERY_REQUIRED');
  if (q.length > 4000) throw new Error('QUERY_TOO_LARGE');
  const limit = Math.min(Math.max(Number(payload?.limit) || 8, 1), MAX_SEARCH);
  const [vector] = await embedTexts(env, [q]);
  const body = {
    query_embedding: vectorLiteral(vector),
    match_count: limit,
    filter_document_key: safeDocumentKey(payload?.documentKey || payload?.document_key) || null
  };
  const rows = await supabase(env, '/rest/v1/rpc/kosif_match_brain_chunks', { method: 'POST', body: JSON.stringify(body) });
  return { query: q, results: Array.isArray(rows) ? rows : [], model: embeddingModel(env) };
}

async function llamaFetch(env, path, init = {}) {
  if (!hasParser(env)) throw new Error('LLAMAPARSE_NOT_CONFIGURED');
  const headers = new Headers(init.headers || {});
  headers.set('authorization', `Bearer ${envText(env, 'LLAMA_CLOUD_API_KEY')}`);
  headers.set('accept', 'application/json');
  const r = await fetch(LLAMA_BASE + path, { ...init, headers });
  let data = null;
  try { data = await r.json(); } catch (_) {
    try { data = { text: (await r.text()).slice(0, 900) }; } catch (_) { data = {}; }
  }
  if (!r.ok) {
    const e = new Error(`LLAMAPARSE_${r.status}:${String(data?.detail || data?.message || data?.error || data?.text || '').slice(0, 700)}`);
    e.status = r.status;
    throw e;
  }
  return data;
}

async function startParse(req, env) {
  const ct = req.headers.get('content-type') || '';
  if (!/multipart\/form-data/i.test(ct)) throw new Error('PDF_MULTIPART_REQUIRED');
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new Error('PDF_FILE_REQUIRED');
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error('PDF_SIZE_INVALID');
  const type = String(file.type || '').toLowerCase();
  if (type && type !== 'application/pdf') throw new Error('PDF_ONLY');
  if (!/\.pdf$/i.test(file.name || '') && type !== 'application/pdf') throw new Error('PDF_ONLY');
  const outbound = new FormData();
  outbound.set('file', file, file.name || 'document.pdf');
  outbound.set('result_type', 'json');
  outbound.set('language', String(form.get('language') || 'ar').slice(0, 10));
  const instruction = String(form.get('parsing_instruction') || 'Preserve page boundaries, headings, tables, footnotes, Arabic text order, and numeric values. Do not invent missing OCR text.').slice(0, 2000);
  outbound.set('parsing_instruction', instruction);
  const data = await llamaFetch(env, '/parsing/upload', { method: 'POST', body: outbound });
  const jobId = safeJobId(data?.id || data?.job_id || data?.jobId);
  if (!jobId) throw new Error('LLAMAPARSE_JOB_ID_MISSING');
  if (env?.DATA) {
    const meta = {
      jobId,
      fileName: String(file.name || '').slice(0, 240),
      title: String(form.get('title') || file.name || 'PDF').slice(0, 300),
      documentKey: safeDocumentKey(form.get('documentKey') || form.get('document_key') || file.name.replace(/\.pdf$/i, '')) || `pdf-${jobId.slice(0, 24)}`,
      authority: String(form.get('authority') || 'reference').slice(0, 80),
      jurisdiction: String(form.get('jurisdiction') || 'saudi').slice(0, 80),
      createdAt: new Date().toISOString()
    };
    await env.DATA.put(`kosif:brain:v2:parse:${jobId}`, JSON.stringify(meta), { expirationTtl: 24 * 60 * 60 }).catch(() => {});
  }
  return { jobId, status: data?.status || 'PENDING', provider: 'LlamaParse' };
}

async function parseJob(env, jobId) {
  const id = safeJobId(jobId);
  if (!id) throw new Error('JOB_ID_INVALID');
  const data = await llamaFetch(env, `/parsing/job/${encodeURIComponent(id)}`);
  return { jobId: id, ...data };
}

async function parseResult(env, jobId) {
  const id = safeJobId(jobId);
  if (!id) throw new Error('JOB_ID_INVALID');
  return llamaFetch(env, `/parsing/job/${encodeURIComponent(id)}/result/json`);
}

async function ingestParseJob(env, jobId, payload = {}) {
  const id = safeJobId(jobId);
  if (!id) throw new Error('JOB_ID_INVALID');
  const status = await parseJob(env, id);
  const state = String(status?.status || status?.job?.status || '').toUpperCase();
  if (!['SUCCESS', 'COMPLETED', 'COMPLETE'].includes(state)) throw new Error(`PARSE_NOT_READY:${state || 'UNKNOWN'}`);
  const result = await parseResult(env, id);
  const pages = pagesFromLlamaResult(result);
  if (!pages.length) throw new Error('PARSE_RESULT_EMPTY');
  let saved = null;
  if (env?.DATA) saved = await env.DATA.get(`kosif:brain:v2:parse:${id}`, 'json').catch(() => null);
  const input = {
    documentKey: payload?.documentKey || payload?.document_key || saved?.documentKey || `pdf-${id.slice(0, 24)}`,
    title: payload?.title || saved?.title || saved?.fileName || 'PDF',
    sourceType: 'llamaparse-pdf',
    sourceRef: `llamaparse-job:${id}`,
    authority: payload?.authority || saved?.authority || 'reference',
    jurisdiction: payload?.jurisdiction || saved?.jurisdiction || 'saudi',
    period: payload?.period || null,
    metadata: { parser: 'LlamaParse', parserJobId: id, originalFileName: saved?.fileName || null },
    pages
  };
  const indexed = await ingestPages(env, input);
  if (env?.DATA) await env.DATA.delete(`kosif:brain:v2:parse:${id}`).catch(() => {});
  return { ...indexed, parser: 'LlamaParse', parserJobId: id };
}

async function listDocuments(env, limit = 50) {
  const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const rows = await supabase(env, `/rest/v1/kosif_brain_documents?select=id,document_key,title,source_type,authority,jurisdiction,period_label,content_sha256,updated_at&order=updated_at.desc&limit=${n}`);
  return Array.isArray(rows) ? rows : [];
}

function mapError(e) {
  const message = String(e?.message || e || 'SYSTEM_BRAIN_ERROR');
  if (/NOT_CONFIGURED/.test(message)) return [503, message.split(':')[0], 'خدمة عقل النظام السريعة غير مكتملة الإعداد على الخادم.'];
  if (/OWNER_AUTH/.test(message)) return [401, 'OWNER_AUTH_REQUIRED', 'افتح جلسة المالك أولاً.'];
  if (/TOO_LARGE|SIZE_INVALID/.test(message)) return [413, message.split(':')[0], 'حجم الملف أو النص أكبر من الحد المسموح.'];
  if (/PARSE_NOT_READY/.test(message)) return [409, 'PARSE_NOT_READY', 'المعالجة لم تنتهِ بعد.'];
  if (/REQUIRED|INVALID|PDF_ONLY|MULTIPART|QUERY_TOO_LARGE/.test(message)) return [400, message.split(':')[0], message];
  if (/LLAMAPARSE_4\d\d/.test(message)) return [502, 'LLAMAPARSE_REQUEST_FAILED', message];
  if (/EMBEDDINGS_/.test(message)) return [502, 'EMBEDDINGS_FAILED', message];
  if (/SUPABASE_/.test(message)) return [502, 'VECTOR_DATABASE_FAILED', message];
  return [500, 'SYSTEM_BRAIN_ERROR', message];
}

export async function handleSystemBrainV2(req, env, u, owner) {
  const p = u.pathname;
  const base = '/api/kosif/v38/brain/';
  if (!p.startsWith(base)) return null;

  if (p === base + 'status' && req.method === 'GET') return json(brainConfigStatus(env));

  if (!owner) return error('OWNER_AUTH_REQUIRED', 'افتح جلسة المالك لاستخدام ذاكرة الكتب الخاصة.', 401);

  try {
    if (p === base + 'documents' && req.method === 'GET') return json({ ok: true, documents: await listDocuments(env, u.searchParams.get('limit')) });

    if (p === base + 'search' && req.method === 'POST') {
      let b = null; try { b = await req.json(); } catch (_) {}
      if (!b) return error('INVALID_JSON', 'طلب البحث غير صالح.');
      const result = await searchBrain(env, b);
      return json({ ok: true, ...result });
    }

    if (p === base + 'ingest/text' && req.method === 'POST') {
      let b = null; try { b = await req.json(); } catch (_) {}
      if (!b) return error('INVALID_JSON', 'طلب الفهرسة غير صالح.');
      const result = await ingestPages(env, b);
      return json({ ok: true, ...result }, 201);
    }

    if (p === base + 'parse/upload' && req.method === 'POST') {
      if (!hasParser(env)) return error('LLAMAPARSE_NOT_CONFIGURED', 'أضف LLAMA_CLOUD_API_KEY كسر خادم لتفعيل استيراد PDF.', 503);
      if (!hasSupabase(env) || !hasEmbedding(env)) return error('VECTOR_MEMORY_NOT_CONFIGURED', 'أكمل إعداد PostgreSQL/pgvector وEmbeddings قبل استيراد PDF.', 503);
      const result = await startParse(req, env);
      return json({ ok: true, ...result }, 202);
    }

    let m = p.match(/^\/api\/kosif\/v38\/brain\/parse\/job\/([A-Za-z0-9_-]{6,160})$/);
    if (m && req.method === 'GET') return json({ ok: true, ...(await parseJob(env, m[1])) });

    m = p.match(/^\/api\/kosif\/v38\/brain\/parse\/job\/([A-Za-z0-9_-]{6,160})\/ingest$/);
    if (m && req.method === 'POST') {
      let b = {}; try { b = await req.json(); } catch (_) {}
      const result = await ingestParseJob(env, m[1], b || {});
      return json({ ok: true, ...result }, 201);
    }

    return error('BRAIN_ROUTE_NOT_FOUND', 'مسار عقل النظام غير موجود.', 404);
  } catch (e) {
    const [status, code, message] = mapError(e);
    return error(code, message, status);
  }
}
