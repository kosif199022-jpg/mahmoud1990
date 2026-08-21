import fs from 'node:fs';
import crypto from 'node:crypto';

const forbiddenArtifacts = [
  'Kosif-Full-Application-Source.json',
  '.v38-import',
];

const requiredFiles = [
  'src/legacy-worker.js',
  'src/library-module.js',
  'src/kosif-workspace.js',
  'src/suite-edge.js',
  'src/v38-api.js',
  'public/index.html',
  'public/v36.css',
  'public/v36-ai-gate.js',
  'public/standards/index.html',
  'wrangler.toml',
  'src/services/gemini.service.ts',
  'src/services/mcp-client.service.ts',
  'src/styles/tokens.css',
];

function fail(message) {
  console.error(`SOURCE_TREE_INTEGRITY_FAIL: ${message}`);
  process.exit(1);
}

for (const artifact of forbiddenArtifacts) {
  if (fs.existsSync(artifact)) fail(`legacy transport artifact must not exist: ${artifact}`);
}

let totalBytes = 0;
const digests = {};
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`required source file missing: ${file}`);
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size === 0) fail(`required source file is empty or invalid: ${file}`);
  const bytes = fs.readFileSync(file);
  totalBytes += bytes.length;
  digests[file] = crypto.createHash('sha256').update(bytes).digest('hex');
}

console.log(JSON.stringify({
  status: 'SOURCE_TREE_INTEGRITY_OK',
  source_of_truth: 'repository-tree',
  files: requiredFiles.length,
  bytes: totalBytes,
  sha256: digests,
}));
