import { createGraph, addNode, addEdge, neighbors, lineage, findPaths, coverageStats, serializeGraph, deserializeGraph } from '../src/engine/v38-evidence-graph.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.error('  ❌ ' + n); } };

console.log('KOSIF v38 evidence graph tests');

// تسجيل النتيجة قبل الدليل (ترتيب معكوس) يجب ألا يفقد الرابط
let g = createGraph({ id: 'E-2026' });
let r = addEdge(g, { from: 'ev-1', to: 'fd-1', kind: 'supports' });
ok(r.ok && r.queued === true, 'edge queued when endpoints missing');
r = addNode(g, { id: 'fd-1', type: 'finding', label: 'تحريف في الإيرادات' });
ok(r.ok, 'finding node created');
r = addNode(g, { id: 'ev-1', type: 'evidence', label: 'مصادقة بنكية', source: 'deterministic' });
ok(r.ok, 'evidence node created');
ok(g.edges.length === 1 && g.pendingEdges.length === 0, 'queued edge replayed after both nodes registered');

addNode(g, { id: 'std-1', type: 'standard_ref', label: 'IFRS 15' });
addEdge(g, { from: 'std-1', to: 'fd-1', kind: 'references' });
addNode(g, { id: 'acc-1', type: 'account', label: '4101 الإيرادات' });
addEdge(g, { from: 'acc-1', to: 'fd-1', kind: 'derives_from' });

const nb = neighbors(g, 'fd-1', 'in');
ok(nb.length === 3, 'finding has 3 inbound links');
const lg = lineage(g, 'fd-1', { depth: 2, direction: 'in' });
ok(lg.ok && lg.total === 4, 'lineage covers supporting chain');
const paths = findPaths(g, 'std-1', 'fd-1');
ok(paths.paths.length === 1 && paths.paths[0].length === 1, 'path finding works');

// تعارض الأنواع مرفوض
r = addNode(g, { id: 'fd-1', type: 'risk' });
ok(!r.ok && String(r.error).startsWith('NODE_TYPE_CONFLICT'), 'node type conflict rejected');
// نوع غير معروف مرفوض
r = addNode(g, { id: 'x', type: 'alien' });
ok(!r.ok, 'unknown node type rejected');
// حافة ذاتية ممنوعة
r = addEdge(g, { from: 'fd-1', to: 'fd-1' });
ok(!r.ok && r.error === 'EDGE_SELF_LOOP_BLOCKED', 'self-loop blocked');
// تكرار الحواف لا يضاعف
addEdge(g, { from: 'ev-1', to: 'fd-1', kind: 'supports' });
ok(g.edges.filter(e => e.from === 'ev-1' && e.to === 'fd-1').length === 1, 'duplicate edge ignored');

// قرار بشري يحكم رأي AI
addNode(g, { id: 'ai-1', type: 'ai_opinion', label: 'رأي Gemini' });
addEdge(g, { from: 'ai-1', to: 'fd-1', kind: 'supports' });
const st = coverageStats(g);
ok(st.aiOpinionsNoHuman.length === 1, 'ungoverned AI opinion detected');
addNode(g, { id: 'hd-1', type: 'human_decision', label: 'اعتماد المراجع' });
addEdge(g, { from: 'ai-1', to: 'hd-1', kind: 'approves' });
const st2 = coverageStats(g);
ok(st2.aiOpinionsNoHuman.length === 0, 'governed AI opinion cleared');
ok(st2.totals.nodes === 6, 'node count correct');

// serialize → deserialize roundtrip
const snap = serializeGraph(g);
const g2 = deserializeGraph(JSON.parse(JSON.stringify(snap)));
ok(g2.nodes.size === g.nodes.size && g2.edges.length === g.edges.length, 'roundtrip preserves graph');
ok(coverageStats(g2).totals.edges === st2.totals.edges, 'roundtrip stats match');

console.log(`V38_GRAPH_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_GRAPH_OK');
