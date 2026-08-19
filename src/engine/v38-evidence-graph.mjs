/*
 * KOSIF v38 — Evidence Graph Engine
 * محرك رسم الأدلة: يربط الحسابات والقيود والمستندات والأدلة والمخاطر
 * والإجراءات والنتائج والتسويات والضوابط ومراجع المعايير وآراء الذكاء
 * الاصطناعي والقرارات البشرية وطلبات المستندات في رسم واحد قابل للتنقل.
 *
 * الحواف تُصفّ حتى تسجيل كل طرفيها، فلا تُفقد روابط دليل→نتيجة أو
 * نتيجة→معيار إذا وصلت السجلات بترتيب مختلف.
 */
export const EVIDENCE_NODE_TYPES = [
  'account', 'journal_entry', 'journal_line', 'document', 'evidence', 'risk',
  'procedure', 'finding', 'adjustment', 'control', 'standard_ref',
  'ai_opinion', 'human_decision', 'pbc_request'
];
export const EDGE_KINDS = [
  'supports', 'contradicts', 'derives_from', 'adjusts', 'mitigates', 'tests',
  'references', 'responds_to', 'approves', 'rejects', 'requested_by', 'assigned_to'
];
const MAX_NODES = 50000;
const MAX_EDGES = 250000;

export function createGraph(meta = {}) {
  return {
    version: 1,
    meta: { id: String(meta.id || 'engagement'), createdAt: meta.createdAt || null, ...meta },
    nodes: new Map(),
    edges: [],
    pendingEdges: []
  };
}

export function addNode(graph, node) {
  const id = String(node?.id || '').trim();
  const type = String(node?.type || '').trim();
  if (!id) return { ok: false, error: 'NODE_ID_REQUIRED' };
  if (!EVIDENCE_NODE_TYPES.includes(type)) return { ok: false, error: `NODE_TYPE_INVALID:${type}` };
  if (graph.nodes.size >= MAX_NODES && !graph.nodes.has(id)) return { ok: false, error: 'GRAPH_NODE_CAPACITY' };
  const existing = graph.nodes.get(id);
  const record = {
    id, type,
    label: String(node.label || id).slice(0, 300),
    detail: String(node.detail || '').slice(0, 4000),
    refs: Array.isArray(node.refs) ? node.refs.map(String).slice(0, 20) : [],
    attrs: node.attrs && typeof node.attrs === 'object' && !Array.isArray(node.attrs) ? node.attrs : {},
    createdAt: node.createdAt || null,
    source: String(node.source || 'human').slice(0, 40) // human | deterministic | ai
  };
  if (existing) {
    // دمج آمن: لا يستبدل النوع، ولا يمحو سجلات سابقة
    if (existing.type !== type) return { ok: false, error: `NODE_TYPE_CONFLICT:${existing.type}!=${type}` };
    graph.nodes.set(id, { ...existing, label: record.label || existing.label, detail: record.detail || existing.detail, refs: [...new Set([...existing.refs, ...record.refs])], attrs: { ...existing.attrs, ...record.attrs }, source: record.source !== 'human' ? record.source : existing.source });
  } else {
    graph.nodes.set(id, record);
  }
  replayPending(graph);
  return { ok: true, id, created: !existing };
}

export function addEdge(graph, edge) {
  const from = String(edge?.from || '').trim();
  const to = String(edge?.to || '').trim();
  const kind = String(edge?.kind || 'supports').trim();
  if (!from || !to) return { ok: false, error: 'EDGE_ENDPOINTS_REQUIRED' };
  if (from === to) return { ok: false, error: 'EDGE_SELF_LOOP_BLOCKED' };
  if (!EDGE_KINDS.includes(kind)) return { ok: false, error: `EDGE_KIND_INVALID:${kind}` };
  const dupe = graph.edges.some(e => e.from === from && e.to === to && e.kind === kind);
  if (dupe) return { ok: true, duplicate: true };
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) {
    if (graph.pendingEdges.length >= MAX_EDGES) return { ok: false, error: 'GRAPH_EDGE_CAPACITY' };
    graph.pendingEdges.push({ from, to, kind, note: String(edge.note || '').slice(0, 500) });
    return { ok: true, queued: true };
  }
  if (graph.edges.length >= MAX_EDGES) return { ok: false, error: 'GRAPH_EDGE_CAPACITY' };
  graph.edges.push({ from, to, kind, note: String(edge.note || '').slice(0, 500) });
  return { ok: true };
}

function replayPending(graph) {
  const still = [];
  for (const e of graph.pendingEdges) {
    if (graph.nodes.has(e.from) && graph.nodes.has(e.to)) graph.edges.push(e);
    else still.push(e);
  }
  graph.pendingEdges = still;
}

export function neighbors(graph, id, direction = 'both') {
  const key = String(id || '');
  const out = [];
  for (const e of graph.edges) {
    if ((direction === 'out' || direction === 'both') && e.from === key) out.push({ ...e, side: 'out', other: e.to });
    if ((direction === 'in' || direction === 'both') && e.to === key) out.push({ ...e, side: 'in', other: e.from });
  }
  return out;
}

/** نسب العقدة عبر الحواف حتى عمق محدد (بدون حلقات). */
export function lineage(graph, id, { depth = 3, direction = 'in' } = {}) {
  const start = String(id || '');
  if (!graph.nodes.has(start)) return { ok: false, error: 'NODE_NOT_FOUND', path: null };
  const visited = new Set([start]);
  let frontier = [start];
  const levels = [{ depth: 0, ids: [start] }];
  for (let d = 1; d <= Math.min(Math.max(1, depth), 8); d++) {
    const next = [];
    for (const cur of frontier) {
      for (const e of graph.edges) {
        const other = direction === 'in' ? (e.to === cur ? e.from : null) : (e.from === cur ? e.to : null);
        if (other && !visited.has(other)) { visited.add(other); next.push(other); }
      }
    }
    if (!next.length) break;
    levels.push({ depth: d, ids: next });
    frontier = next;
  }
  return { ok: true, levels, total: visited.size };
}

/** مسارات بسيطة بين عقدتين (بحد أقصى للعبء الحسابي). */
export function findPaths(graph, from, to, { maxPaths = 5, maxDepth = 5 } = {}) {
  const f = String(from || ''), t = String(to || '');
  const paths = [];
  const dfs = (cur, target, path, seen) => {
    if (paths.length >= maxPaths || path.length > maxDepth) return;
    if (cur === target) { paths.push([...path]); return; }
    for (const e of graph.edges) {
      if (e.from !== cur || seen.has(e.to)) continue;
      seen.add(e.to); path.push(e);
      dfs(e.to, target, path, seen);
      path.pop(); seen.delete(e.to);
    }
  };
  if (graph.nodes.has(f) && graph.nodes.has(t)) dfs(f, t, [], new Set([f]));
  return { ok: true, from: f, to: t, paths };
}

/** إحصاءات التغطية: النتائج بلا أدلة، الأدلة بلا مصدر، القيود بلا ضابط. */
export function coverageStats(graph) {
  const byType = {};
  for (const n of graph.nodes.values()) byType[n.type] = (byType[n.type] || 0) + 1;
  const findingsNoEvidence = [...graph.nodes.values()].filter(n => n.type === 'finding' && !neighbors(graph, n.id, 'in').some(e => graph.nodes.get(e.other)?.type === 'evidence')).map(n => n.id);
  const risksNoProcedure = [...graph.nodes.values()].filter(n => n.type === 'risk' && !neighbors(graph, n.id, 'out').some(e => graph.nodes.get(e.other)?.type === 'procedure')).map(n => n.id);
  const aiOpinionsNoHuman = [...graph.nodes.values()].filter(n => n.type === 'ai_opinion' && !neighbors(graph, n.id, 'out').some(e => ['approves', 'rejects'].includes(e.kind))).map(n => n.id);
  const evidenceUnsupported = [...graph.nodes.values()].filter(n => n.type === 'evidence' && neighbors(graph, n.id, 'in').length === 0).map(n => n.id);
  return {
    totals: { nodes: graph.nodes.size, edges: graph.edges.length, pendingEdges: graph.pendingEdges.length, byType },
    findingsNoEvidence, risksNoProcedure, aiOpinionsNoHuman, evidenceUnsupported,
    health: {
      findingsEvidenceCoverage: ratio(1 - safeDiv(findingsNoEvidence.length, byType.finding || 0)),
      risksProcedureCoverage: ratio(1 - safeDiv(risksNoProcedure.length, byType.risk || 0)),
      aiOpinionsGoverned: ratio(1 - safeDiv(aiOpinionsNoHuman.length, byType.ai_opinion || 0))
    }
  };
}
function safeDiv(a, b) { return b > 0 ? a / b : 0; }
function ratio(x) { return Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000; }

export function serializeGraph(graph) {
  return { version: graph.version, meta: graph.meta, nodes: [...graph.nodes.values()], edges: graph.edges, pendingEdges: graph.pendingEdges };
}

export function deserializeGraph(payload) {
  const g = createGraph(payload?.meta || {});
  for (const n of payload?.nodes || []) addNode(g, n);
  for (const e of payload?.edges || []) if (g.nodes.has(String(e.from)) && g.nodes.has(String(e.to))) g.edges.push({ from: String(e.from), to: String(e.to), kind: EDGE_KINDS.includes(e.kind) ? e.kind : 'supports', note: String(e.note || '').slice(0, 500) });
  for (const e of payload?.pendingEdges || []) g.pendingEdges.push({ from: String(e.from), to: String(e.to), kind: EDGE_KINDS.includes(e.kind) ? e.kind : 'supports', note: String(e.note || '').slice(0, 500) });
  replayPending(g);
  return g;
}
