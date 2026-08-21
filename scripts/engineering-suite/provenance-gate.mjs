import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const registryPath = path.resolve('config/source-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const failures = [];
const report = [];

if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
  failures.push('source registry must contain at least one governed source');
}

for (const source of registry.sources || []) {
  const missing = ['id', 'title', 'kind', 'authorityClass', 'professionalUse', 'path'].filter(k => !String(source?.[k] ?? '').trim());
  if (missing.length) failures.push(`${source?.id || '<unknown>'}: missing fields ${missing.join(', ')}`);

  const target = path.resolve(String(source.path || ''));
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    failures.push(`${source?.id || '<unknown>'}: source path missing: ${source.path}`);
    continue;
  }

  const bytes = fs.readFileSync(target);
  const text = bytes.toString('utf8');
  const markerFailures = [];
  for (const marker of source.requiredMarkers || []) {
    if (!text.includes(marker)) {
      markerFailures.push(marker);
      failures.push(`${source.id}: required provenance marker missing: ${marker}`);
    }
  }

  report.push({
    id: source.id,
    path: source.path,
    kind: source.kind,
    authorityClass: source.authorityClass,
    professionalUse: source.professionalUse,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    requiredMarkers: (source.requiredMarkers || []).length,
    markerFailures,
    ok: markerFailures.length === 0,
  });
}

const standardsAdapter = report.find(x => x.id === 'standards-runtime-adapter');
if (!standardsAdapter) failures.push('standards-runtime-adapter entry is mandatory');

const core = report.find(x => x.id === 'deterministic-accounting-core');
if (!core) failures.push('deterministic-accounting-core entry is mandatory');

const out = {
  suite: 'KOSIF source provenance gate',
  generatedAt: new Date().toISOString(),
  registryVersion: registry.version,
  ok: failures.length === 0,
  failures,
  sources: report,
};
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/source-provenance.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (failures.length) process.exit(1);
