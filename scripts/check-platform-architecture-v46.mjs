import fs from 'node:fs';

const required = [
  '.github/workflows/archive-kosif-ux-recordings.yml',
  '.github/workflows/ci-quality-gate.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/gemini-mcp-agent.yml',
  '.agents/configs/gemini-orchestrator.json',
  'src/services/gemini.service.ts',
  'src/services/mcp-client.service.ts',
  'src/styles/tokens.css',
  'src/types/agent.types.ts',
  'supabase/migrations/20260821_system_brain_pgvector.sql',
  'config/kosif-platform-blueprint-v1.json',
  'stories/design-system.stories.js',
];

for (const file of required) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`Missing architecture file: ${file}`);
  }
}

for (const removed of ['.v38-import', 'Kosif-Full-Application-Source.json']) {
  if (fs.existsSync(removed)) throw new Error(`Legacy payload must be removed: ${removed}`);
}

const workflows = fs.readdirSync('.github/workflows').filter((name) => /\.ya?ml$/i.test(name)).sort();
const expectedWorkflows = ['archive-kosif-ux-recordings.yml', 'ci-quality-gate.yml', 'deploy-production.yml', 'gemini-mcp-agent.yml'];
if (JSON.stringify(workflows) !== JSON.stringify(expectedWorkflows)) {
  throw new Error(`Expected exactly the unified workflows ${expectedWorkflows.join(', ')}, found ${workflows.join(', ')}`);
}

const gemini = fs.readFileSync('src/services/gemini.service.ts', 'utf8');
if (/NEXT_PUBLIC_GEMINI_API_KEY/.test(gemini)) {
  throw new Error('Browser-exposed Gemini key marker is forbidden.');
}
if (!/gemini-2\.5-pro/.test(gemini)) throw new Error('Gemini default model contract is missing.');

const mcp = fs.readFileSync('src/services/mcp-client.service.ts', 'utf8');
for (const marker of ['MCP_TOOL_NOT_ALLOWED', 'https:', 'tools/call']) {
  if (!mcp.includes(marker)) throw new Error(`MCP fail-closed marker missing: ${marker}`);
}

const migration = fs.readFileSync('supabase/migrations/20260821_system_brain_pgvector.sql', 'utf8');
if (/Allow public read access|USING\s*\(true\)/i.test(migration)) {
  throw new Error('Public vector-memory RLS policy is forbidden.');
}
for (const marker of ['ENABLE ROW LEVEL SECURITY', 'REVOKE ALL', 'VECTOR(768)']) {
  if (!migration.toUpperCase().includes(marker)) throw new Error(`Vector security marker missing: ${marker}`);
}

const tokens = fs.readFileSync('src/styles/tokens.css', 'utf8').toLowerCase();
for (const marker of ['#0b0f17', '#10b981', '#3b82f6', 'prefers-reduced-motion']) {
  if (!tokens.includes(marker)) throw new Error(`Missing design token marker: ${marker}`);
}

const registry = JSON.parse(fs.readFileSync('.agents/plugins/marketplace.json', 'utf8'));
if (registry?.orchestratorConfig !== '../configs/gemini-orchestrator.json') {
  throw new Error('Plugin registry is not linked to the governed orchestrator config.');
}

console.log('KOSIF_PLATFORM_ARCHITECTURE_V46_OK', workflows.join(','));
