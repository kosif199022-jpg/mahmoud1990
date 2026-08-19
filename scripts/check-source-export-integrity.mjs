import fs from 'node:fs';
import crypto from 'node:crypto';

const sourcePath = 'Kosif-Full-Application-Source.json';
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
];

function fail(message) {
  console.error(`SOURCE_EXPORT_INTEGRITY_FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) fail(`${sourcePath} is missing`);

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
}

if (snapshot?.format !== 'kosif-complete-source-json-v1') fail(`unexpected format: ${snapshot?.format}`);
if (snapshot?.application !== 'Kosif') fail(`unexpected application: ${snapshot?.application}`);
if (snapshot?.repository !== 'kosif199022-jpg/mahmoud1990') fail(`unexpected repository: ${snapshot?.repository}`);
if (snapshot?.branch !== 'main') fail(`unexpected branch: ${snapshot?.branch}`);
if (!/^[0-9a-f]{40}$/i.test(String(snapshot?.commit || ''))) fail('snapshot commit is not a 40-character Git SHA');
if (!snapshot?.files || typeof snapshot.files !== 'object' || Array.isArray(snapshot.files)) fail('files map is missing');

const entries = Object.entries(snapshot.files);
if (snapshot.file_count !== entries.length) fail(`file_count=${snapshot.file_count} but files=${entries.length}`);

for (const file of requiredFiles) {
  if (!snapshot.files[file]) fail(`required file missing from snapshot: ${file}`);
}

let sourceBytes = 0;
let utf8Count = 0;
let base64Count = 0;

for (const [path, entry] of entries) {
  if (!path || path.startsWith('.git/') || path === sourcePath) fail(`invalid exported path: ${path}`);
  if (!entry || typeof entry !== 'object') fail(`invalid entry for ${path}`);
  if (!Number.isInteger(entry.bytes) || entry.bytes < 0) fail(`invalid byte count for ${path}`);
  if (!/^[0-9a-f]{64}$/i.test(String(entry.sha256 || ''))) fail(`invalid SHA-256 for ${path}`);
  if (typeof entry.content !== 'string') fail(`content is not a string for ${path}`);

  let bytes;
  if (entry.encoding === 'utf-8') {
    utf8Count += 1;
    bytes = Buffer.from(entry.content, 'utf8');
  } else if (entry.encoding === 'base64') {
    base64Count += 1;
    bytes = Buffer.from(entry.content, 'base64');
    const canonical = bytes.toString('base64');
    if (canonical !== entry.content) fail(`non-canonical or malformed Base64 for ${path}`);
  } else {
    fail(`unsupported encoding ${entry.encoding} for ${path}`);
  }

  if (bytes.length !== entry.bytes) fail(`byte mismatch for ${path}: metadata=${entry.bytes} actual=${bytes.length}`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== String(entry.sha256).toLowerCase()) fail(`SHA-256 mismatch for ${path}`);
  sourceBytes += bytes.length;
}

if (snapshot.source_bytes !== sourceBytes) fail(`source_bytes=${snapshot.source_bytes} but verified=${sourceBytes}`);

console.log(JSON.stringify({
  status: 'SOURCE_EXPORT_INTEGRITY_OK',
  commit: snapshot.commit,
  files: entries.length,
  source_bytes: sourceBytes,
  utf8_files: utf8Count,
  base64_files: base64Count,
  integrity: 'sha256-per-file',
}));
