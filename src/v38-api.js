/*
 * KOSIF v38 — Trusted Audit Intelligence OS
 * موجّه واجهات الخادم: /api/kosif/v38/*
 *
 * قاعدة الحوكمة: الحسابات والقيود والأهمية النسبية والعينات حتمية عبر النواة؛
 * آراء الذكاء الاصطناعي تُجرّد من حقول السلطة ولا تتحول إلى اعتماد أو ترحيل.
 */
import * as core from './engine/v38-core.mjs';
import { serializeGraph, deserializeGraph, addNode, addEdge, neighbors, lineage, coverageStats, EVIDENCE_NODE_TYPES, EDGE_KINDS } from './engine/v38-evidence-graph.mjs';
import { listCoreSources, loadRegistry, refreshSources, sourceStatus, bulkOnboard } from './v38-source-intelligence.js';
import { searchOpenLibrary, curatedCatalog } from './v38-books.js';
import { callPublicAI, publicAIConfigured } from './public-ai-provider.js';
import { createRealtimeCall, hangupRealtimeCall, realtimeConfigured, DEFAULT_REALTIME_MODEL } from './v38-realtime.js';

export const V38_CAPABILITIES = {
  product: 'KOSIF',
  version: 'v38.0.0-root',
  buildId: '2026.08.19-v38-trusted-audit-os',
  title: 'Trusted Audit Intelligence OS',
  deterministic: ['parse-money', 'journal-validation', 'posting-hash-chain', 'reversals', 'trial-balance', 'adjusted-tb', 'materiality-isa320', 'misstatements-isa450', 'journal-risk-flags', 'sampling', 'invariants', 'vat-zatca', 'zakat'],
  governed: ['evidence-graph', 'council-v3', 'reviewer-notes', 'source-intelligence', 'openai-live', 'public-ai-provider'],
  aiAuthority: 'advisory-only',
  forbiddenAIFields: ['calculated_materiality', 'final_opinion', 'approved_adjustment', 'posted_entry'],
  humanApproval: 'required-for-posting-and-opinion'
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body, (_k, v) => typeof v === 'bigint' ? v.toString() : v), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-kosif-v38': 'true', 'x-content-type-options': 'nosniff', ...headers } });
}
const err = (code, message, status = 400) => json({ error: code, message: message || code }, status);

async function body(req) { try { return await req.clone().json(); } catch { return null; } }
function companyIdOf(u, b) {
  const id = String(u.searchParams.get('company') || b?.company || '').trim();
  return /^[A-Za-z0-9._:-]{1,80}$/.test(id) ? id : '';
}

/* ---------- مخزن رسم الأدلة (KV لكل شركة) ---------- */
const GRAPH_KEY = id => `kosif:v38:co:${id}:graph`;
async function loadGraph(env, id) {
  const raw = await env.DATA.get(GRAPH_KEY(id), 'json');
  return raw ? deserializeGraph(raw) : deserializeGraph({ meta: { id } });
}
async function saveGraph(env, id, graph) {
  await env.DATA.put(GRAPH_KEY(id), JSON.stringify(serializeGraph(graph)));
}

/* ---------- ملاحظات المراجع ---------- */
const NOTE_PREFIX = id => `kosif:v38:co:${id}:notes:`;
async function listNotes(env, id) {
  const r = await env.DATA.list({ prefix: NOTE_PREFIX(id), limit: 500 });
  const out = [];
  for (const k of r.keys || []) {
    const note = await env.DATA.get(k.name, 'json');
    if (note) out.push(note);
  }
  return out.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
}

/* ---------- تجريد حقول السلطة من مخرجات النماذج ---------- */
function stripAuthority(value) {
  if (Array.isArray(value)) return value.map(stripAuthority);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (V38_CAPABILITIES.forbiddenAIFields.includes(k)) continue;
      out[k] = stripAuthority(v);
    }
    return out;
  }
  return value;
}

/* ---------- مصفوفة توافق مجلس المراجعين v3 (حتمية) ---------- */
function viewBucket(v) {
  const s = String(v || '').toLowerCase();
  if (/agree|concur|مسا|مواف|يدعم|سليم/.test(s)) return 'agree';
  if (/challenge|dispute|تحف|اعتر|خلاف|مخال/.test(s)) return 'challenge';
  if (/insufficient|gap|غير كاف|ناقص|تعذر/.test(s)) return 'insufficient';
  return s || 'unknown';
}
function councilMatrix(task) {
  const members = (task.members || []).map(m => ({
    provider: String(m.provider || 'unknown'),
    model: String(m.model || ''),
    opinion: stripAuthority(m.opinion || {}),
    blindRound: true
  }));
  const findingMap = new Map();
  members.forEach((m, mi) => {
    for (const f of m.opinion?.findings || []) {
      const key = String(f.ref || f.id || '').trim();
      if (!key) continue;
      const rec = findingMap.get(key) || { ref: key, views: [], evidence: [] };
      rec.views.push({ member: mi, bucket: viewBucket(f.view || f.stance), severity: String(f.severity || ''), note: String(f.note || '').slice(0, 500) });
      if (f.evidence && !Array.isArray(f.evidence)) rec.evidence.push(String(f.evidence));
      else if (Array.isArray(f.evidence)) rec.evidence.push(...f.evidence.map(String));
      findingMap.set(key, rec);
    }
  });
  const findings = [...findingMap.values()].map(rec => {
    const buckets = [...new Set(rec.views.map(v => v.bucket))];
    const evidenceMissing = rec.views.some(v => v.bucket === 'agree') && rec.evidence.filter(Boolean).length === 0;
    return {
      ...rec,
      state: buckets.length <= 1 ? 'agreement' : 'conflict',
      agreementRate: rec.views.length ? Math.round((rec.views.filter(v => v.bucket === buckets[0]).length / rec.views.length) * 100) / 100 : 0,
      evidenceGap: evidenceMissing
    };
  });
  const conclusions = members.map(m => String(m.opinion?.conclusion || '').slice(0, 800));
  return {
    taskId: String(task.taskId || ''),
    members: members.map(m => ({ provider: m.provider, model: m.model })),
    blindRound: true,
    findings,
    conflicts: findings.filter(f => f.state === 'conflict'),
    evidenceGaps: findings.filter(f => f.evidenceGap),
    conclusions,
    governance: {
      canApprove: false,
      reason: 'توافق النماذج لا يُعد اعتمادًا؛ القرار النهائي بشري موثق مع أساسه.',
      forbiddenFieldsStripped: V38_CAPABILITIES.forbiddenAIFields
    }
  };
}

/* ---------- المعالج الرئيسي ---------- */
export async function handleV38(req, env, u, owner) {
  const p = u.pathname;
  if (!p.startsWith('/api/kosif/v38/')) return null;

  /* قدرات — عام للقراءة */
  if (p === '/api/kosif/v38/capabilities' && req.method === 'GET') return json({ ok: true, ...V38_CAPABILITIES, nodeTypes: EVIDENCE_NODE_TYPES, edgeKinds: EDGE_KINDS, coreSources: listCoreSources().map(s => ({ id: s.id, title: s.title, tier: s.tier })) });

  /* — النواة المحاسبية الحتمية — */
  if (p.startsWith('/api/kosif/v38/accounting/')) {
    const b = await body(req);
    switch (p.slice('/api/kosif/v38/accounting/'.length)) {
      case 'parse-money': {
        const r = core.parseMoney(b?.value, { exp: b?.exp, currency: b?.currency });
        return r.ok ? json({ ok: true, minor: r.minor.toString(), exp: r.exp }) : err(r.error);
      }
      case 'validate-journal': {
        const accounts = new Map((b?.accounts || []).map(a => [String(a.code), a]));
        const r = core.validateJournalEntry(b?.entry || {}, { accounts, exp: b?.exp ?? 2, periodStart: b?.periodStart, periodEnd: b?.periodEnd });
        return json({ ...r, ok: r.ok, totals: { dr: r.totals.dr.minor.toString(), cr: r.totals.cr.minor.toString(), exp: r.totals.dr.exp } });
      }
      case 'materiality': {
        const r = core.computeMateriality({ basis: b?.basis, amount: b?.amount, riskProfile: b?.riskProfile, exp: b?.exp ?? 2 });
        return r.ok ? json({ ok: true, overall: r.overall.minor.toString(), performance: r.performance.minor.toString(), clearlyTrivial: r.clearlyTrivial.minor.toString(), exp: r.overall.exp, basisLabel: r.basisLabel, performanceFactor: r.performanceFactor, method: r.method }) : err(r.error, null, 400);
      }
      case 'misstatements': {
        const mat = core.computeMateriality({ basis: b?.basis || 'profit', amount: b?.basisAmount || '0', riskProfile: b?.riskProfile || 'medium', exp: b?.exp ?? 2 });
        const r = core.aggregateMisstatements(b?.items || [], mat.ok ? mat : null);
        return json({ ok: true, factual: r.factual.minor.toString(), judgmental: r.judgmental.minor.toString(), projected: r.projected.minor.toString(), corrected: r.corrected.minor.toString(), uncorrectedTotal: r.uncorrectedTotal.minor.toString(), exp: r.factual.exp, exceedsPerformanceMateriality: r.exceedsPerformanceMateriality, itemsAboveTrivial: r.itemsAboveTrivial.map(i => ({ id: i.id, type: i.type, minor: i.minor.toString() })), methodology: r.methodology });
      }
      case 'sample': {
        const r = core.deterministicSample(b?.items || [], { size: b?.size, seed: b?.seed || 'kosif', method: b?.method || 'random', amountKey: b?.amountKey });
        return json({ ok: true, ...r, count: r.picked.length });
      }
      case 'risk-flags': {
        const r = core.journalRiskFlags(b?.entry || {}, b?.ctx || {});
        return json({ ok: true, flags: r.flags, maxLine: r.maxLine.minor.toString(), total: r.total.minor.toString(), exp: r.maxLine.exp });
      }
      case 'vat': {
        const r = core.computeVat({ taxableSuppliesMinor: BigInt(Math.round(Number(b?.taxableSupplies || 0) * 100)), zeroRatedMinor: BigInt(Math.round(Number(b?.zeroRated || 0) * 100)), exemptMinor: BigInt(Math.round(Number(b?.exempt || 0) * 100)), inputVatMinor: BigInt(Math.round(Number(b?.inputVat || 0) * 100)), exp: 2, ratePct: Number(b?.ratePct) || 15 });
        return json({ ok: true, ratePct: r.ratePct, outputVat: r.standardRated.vat.minor.toString(), inputVat: r.inputVat.minor.toString(), netPayable: r.netPayable.minor.toString(), direction: r.direction, taxableBase: r.standardRated.base.minor.toString(), zeroRated: r.zeroRated.minor.toString(), exempt: r.exempt.minor.toString(), method: r.method });
      }
      case 'zakat': {
        const r = core.estimateZakat({ basisMinor: BigInt(Math.round(Number(b?.basis || 0) * 100)), exp: 2, ratePct: Number(b?.ratePct) || 2.5 });
        return json({ ok: true, basis: r.basis.minor.toString(), estimatedZakat: r.estimatedZakat.minor.toString(), ratePct: r.ratePct, calendar: r.calendar, disclaimer: r.disclaimer });
      }
      default: return err('V38_ACCOUNTING_ROUTE_NOT_FOUND', null, 404);
    }
  }

  /* — انساق الإطار حسب الفترة — */
  if (p === '/api/kosif/v38/framework' && req.method === 'GET') {
    return json({ ok: true, ...core.frameworkApplicability({ periodStart: u.searchParams.get('start') || undefined, periodEnd: u.searchParams.get('end') || undefined, earlyAdoption: { IFRS_18: u.searchParams.get('early18') === '1', IFRS_19: u.searchParams.get('early19') === '1' }, jurisdiction: u.searchParams.get('jurisdiction') || 'saudi' }) });
  }

  /* فهرس ملايين الكتب (Open Library) + الفهرس المنسق — قراءة علنية */
  if (p === '/api/kosif/v38/books/search' && req.method === 'GET') {
    const q = String(u.searchParams.get('q') || '').trim();
    if (!q) return err('QUERY_REQUIRED');
    const subject = ['accounting', 'business', 'audit', 'finance'].includes(u.searchParams.get('subject')) ? u.searchParams.get('subject') : 'accounting';
    const limit = Math.min(Math.max(Number(u.searchParams.get('limit')) || 24, 1), 50);
    const offset = Math.min(Math.max(Number(u.searchParams.get('offset')) || 0, 0), 5000);
    const r = await searchOpenLibrary(env, { q, subject, limit, offset });
    return r.ok ? json({ ok: true, ...r }) : err(r.error, r.message, 502);
  }
  if (p === '/api/kosif/v38/books/catalog' && req.method === 'GET') return json({ ok: true, catalog: curatedCatalog() });

  /* — ما يلي يتطلب جلسة مالك — */
  if (!owner) return err('OWNER_AUTH_REQUIRED', 'قدرات v38 التشغيلية تتطلب جلسة المالك.', 401);

  /* رسم الأدلة */
  if (p === '/api/kosif/v38/evidence-graph') {
    const b = await body(req);
    const co = companyIdOf(u, b);
    if (!co) return err('COMPANY_ID_REQUIRED');
    const graph = await loadGraph(env, co);
    const op = String(b?.op || u.searchParams.get('op') || '');
    if (req.method === 'GET') {
      const stats = coverageStats(graph);
      return json({ ok: true, stats, sample: [...graph.nodes.values()].slice(0, 200) });
    }
    if (op === 'node') {
      const r = addNode(graph, b.node || {});
      if (!r.ok) return err(r.error);
      await saveGraph(env, co, graph);
      return json({ ok: true, ...r, stats: coverageStats(graph) });
    }
    if (op === 'edge') {
      const r = addEdge(graph, b.edge || {});
      if (!r.ok) return err(r.error);
      await saveGraph(env, co, graph);
      return json({ ok: true, ...r, stats: coverageStats(graph) });
    }
    if (op === 'neighbors') return json({ ok: true, neighbors: neighbors(graph, String(b.id || ''), b.direction || 'both').map(e => ({ ...e, node: graph.nodes.get(e.other) || null })) });
    if (op === 'lineage') return json({ ok: true, ...lineage(graph, String(b.id || ''), { depth: Number(b.depth) || 3, direction: b.direction || 'in' }) });
    if (op === 'reset') { await env.DATA.delete(GRAPH_KEY(co)); return json({ ok: true }); }
    return err('V38_GRAPH_OP_UNKNOWN');
  }

  /* ملاحظات المراجع المنظمة */
  if (p === '/api/kosif/v38/reviewer-notes') {
    const b = await body(req);
    const co = companyIdOf(u, b);
    if (!co) return err('COMPANY_ID_REQUIRED');
    if (req.method === 'GET') return json({ ok: true, notes: await listNotes(env, co) });
    if (req.method === 'POST') {
      const id = String(b?.id || '').trim();
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return err('NOTE_ID_INVALID');
      const existing = await env.DATA.get(NOTE_PREFIX(co) + id, 'json');
      if (existing) return err('NOTE_ID_EXISTS', 'لا تُستبدل معرّفات الملاحظات القائمة صامتةً؛ استخدم تحريرًا صريحًا.', 409);
      const note = {
        id, type: String(b.type || 'observation').slice(0, 40),
        ref: String(b.ref || '').slice(0, 160),
        text: String(b.text || '').slice(0, 8000),
        status: String(b.status || 'open').slice(0, 20),
        tags: (Array.isArray(b.tags) ? b.tags : []).map(String).slice(0, 12),
        ts: new Date().toISOString(), actor: 'human-reviewer'
      };
      await env.DATA.put(NOTE_PREFIX(co) + id, JSON.stringify(note));
      return json({ ok: true, note });
    }
    if (req.method === 'PUT') {
      const id = String(b?.id || '').trim();
      const existing = await env.DATA.get(NOTE_PREFIX(co) + id, 'json');
      if (!existing) return err('NOTE_NOT_FOUND', null, 404);
      const updated = { ...existing, text: String(b.text ?? existing.text).slice(0, 8000), status: String(b.status || existing.status).slice(0, 20), tags: (Array.isArray(b.tags) ? b.tags : existing.tags).map(String).slice(0, 12), editedTs: new Date().toISOString() };
      await env.DATA.put(NOTE_PREFIX(co) + id, JSON.stringify(updated));
      return json({ ok: true, note: updated });
    }
    if (req.method === 'DELETE') {
      const id = String(b?.id || '').trim() || String(u.searchParams.get('id') || '');
      await env.DATA.delete(NOTE_PREFIX(co) + id);
      return json({ ok: true });
    }
    return err('METHOD_NOT_ALLOWED', null, 405);
  }

  /* مجلس v3: مصفوفة التوافق الحتمية فوق مخرجات الأعضاء */
  if (p === '/api/kosif/v38/council/matrix' && req.method === 'POST') {
    const b = await body(req);
    if (!Array.isArray(b?.members) || b.members.length < 1) return err('COUNCIL_MEMBERS_REQUIRED');
    return json({ ok: true, matrix: councilMatrix(b) });
  }

  /* OpenAI Realtime — مفتاح الخادم لا يدخل المتصفح مطلقًا */
  if (p === '/api/kosif/v38/realtime/status' && req.method === 'GET') {
    return json({
      ok: true,
      configured: realtimeConfigured(env),
      model: DEFAULT_REALTIME_MODEL,
      transport: 'webrtc-server-relay',
      keyExposure: 'none',
      advisory: 'الصوت المباشر استشاري ولا يعتمد قيودًا ولا آراءً.'
    });
  }
  if (p === '/api/kosif/v38/realtime/call' && req.method === 'POST') {
    const b = await body(req);
    const r = await createRealtimeCall(env, {
      sdp: b?.sdp,
      model: b?.model,
      voice: b?.voice,
      language: b?.language,
      company: b?.company,
      context: b?.context
    });
    if (!r.ok) {
      const status = r.error === 'REALTIME_NOT_CONFIGURED' ? 503 : r.error === 'REALTIME_UPSTREAM_REJECTED' || r.error === 'REALTIME_UPSTREAM_TIMEOUT' || r.error === 'REALTIME_UPSTREAM_UNAVAILABLE' ? 502 : 400;
      return err(r.error, r.message, status);
    }
    return json({
      ok: true,
      answerSdp: r.answerSdp,
      callId: r.callId,
      model: r.model,
      voice: r.voice,
      transport: r.transport,
      keyExposure: r.keyExposure,
      advisory: 'الصوت المباشر استشاري فقط؛ أي استنتاج يحتاج دليلًا ومراجعة بشرية قبل الاستخدام.'
    }, 201);
  }
  if (p === '/api/kosif/v38/realtime/hangup' && req.method === 'POST') {
    const b = await body(req);
    const r = await hangupRealtimeCall(env, b?.callId);
    return r.ok ? json({ ok: true, alreadyEnded: !!r.alreadyEnded }) : err(r.error, r.message, r.error === 'REALTIME_NOT_CONFIGURED' ? 503 : 502);
  }
  if (p === '/api/kosif/v38/realtime/session') {
    return err('REALTIME_LEGACY_ROUTE_RETIRED', 'تم إيقاف مسار السر المؤقت القديم. استخدم /realtime/call؛ مفتاح OpenAI يبقى في أسرار الخادم فقط.', 410);
  }

  /* مزود AI عام/محلي */
  if (p === '/api/kosif/v38/public-ai' && req.method === 'POST') {
    if (!publicAIConfigured(env)) return err('PUBLIC_AI_NOT_CONFIGURED', 'المزود العام/المحلي يُضبط بمتغيرات بيئة الخادم فقط.', 503);
    const b = await body(req);
    const r = await callPublicAI(env, String(b?.prompt || '').slice(0, 24000));
    return r.ok ? json({ ok: true, text: r.text, provider: 'public-local' }) : err(r.error, r.message, 502);
  }

  /* نسيج ذكاء المصادر */
  if (p.startsWith('/api/kosif/v38/sources/')) {
    const sub = p.slice('/api/kosif/v38/sources/'.length);
    if (sub === 'registry' && req.method === 'GET') return json({ ok: true, registry: await loadRegistry(env) });
    if (sub === 'status' && req.method === 'GET') return json({ ok: true, status: await sourceStatus(env, u.searchParams.get('id') || '') });
    if (sub === 'refresh' && req.method === 'POST') { const b = await body(req); return json({ ok: true, ...(await refreshSources(env, Array.isArray(b?.ids) ? b.ids.map(String) : [])) }); }
    if (sub === 'bulk' && req.method === 'POST') { const b = await body(req); return json(await bulkOnboard(env, b?.sources || [])); }
    return err('V38_SOURCES_ROUTE_NOT_FOUND', null, 404);
  }

  return err('V38_ROUTE_NOT_FOUND', null, 404);
}