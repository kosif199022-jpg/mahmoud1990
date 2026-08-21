import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const baselineDir = path.resolve(process.env.KOSIF_VISUAL_BASELINE_DIR || 'tests/visual-baselines');
const currentDir = path.resolve(process.env.KOSIF_VISUAL_CURRENT_DIR || 'artifacts');
const diffDir = path.resolve('artifacts/visual-diff');
const maxRatio = Number(process.env.KOSIF_MAX_VISUAL_DIFF_RATIO || 0.02);
fs.mkdirSync(diffDir, { recursive: true });

const currentFiles = fs.existsSync(currentDir)
  ? fs.readdirSync(currentDir).filter(x => x.endsWith('.png') && /iphone|tablet|desktop/i.test(x))
  : [];
const rows = [];
let failures = 0;
let missingBaselines = 0;

for (const file of currentFiles) {
  const currentPath = path.join(currentDir, file);
  const baselinePath = path.join(baselineDir, file);
  if (!fs.existsSync(baselinePath)) {
    missingBaselines++;
    const candidate = path.join(diffDir, `candidate-${file}`);
    fs.copyFileSync(currentPath, candidate);
    rows.push({ file, status: 'baseline-missing', candidate: path.relative(process.cwd(), candidate) });
    continue;
  }

  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  if (current.width !== baseline.width || current.height !== baseline.height) {
    failures++;
    rows.push({ file, status: 'dimension-mismatch', current: [current.width, current.height], baseline: [baseline.width, baseline.height] });
    continue;
  }

  const diff = new PNG({ width: current.width, height: current.height });
  const changed = pixelmatch(baseline.data, current.data, diff.data, current.width, current.height, { threshold: 0.1 });
  const ratio = changed / (current.width * current.height);
  const diffPath = path.join(diffDir, `diff-${file}`);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const ok = ratio <= maxRatio;
  if (!ok) failures++;
  rows.push({ file, status: ok ? 'pass' : 'fail', changedPixels: changed, ratio, maxRatio, diff: path.relative(process.cwd(), diffPath) });
}

const output = {
  suite: 'KOSIF visual regression',
  generatedAt: new Date().toISOString(),
  bootstrapMode: missingBaselines > 0,
  currentScreenshots: currentFiles.length,
  missingBaselines,
  failures,
  maxRatio,
  results: rows,
};
fs.writeFileSync('artifacts/visual-regression.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
if (!currentFiles.length) process.exit(2);
if (failures) process.exit(1);
