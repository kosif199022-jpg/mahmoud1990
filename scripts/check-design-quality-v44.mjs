import fs from 'node:fs';
import { withWorkflowCompatibility } from './workflow-compat-v46.mjs';

const ci = fs.readFileSync('.github/workflows/ci-quality-gate.yml', 'utf8');
for (const marker of ['Build Storybook design system', 'browser-smoke.mjs', 'axe-smoke.mjs']) {
  if (!ci.includes(marker)) throw new Error(`Unified CI is missing design-quality marker: ${marker}`);
}

await withWorkflowCompatibility(
  [['.github/workflows/design-quality-v44.yml', '.github/workflows/ci-quality-gate.yml']],
  async () => import('./check-design-quality-v44-legacy.mjs'),
);
