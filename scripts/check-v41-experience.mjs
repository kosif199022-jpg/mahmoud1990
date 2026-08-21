import fs from 'node:fs';
import { withWorkflowCompatibility } from './workflow-compat-v46.mjs';

const ci = fs.readFileSync('.github/workflows/ci-quality-gate.yml', 'utf8');
for (const marker of ['verify-scroll-runtime.cjs', 'verify-visual-runtime.cjs', 'webkit', 'kosif-v41-mobile-default.png']) {
  if (!ci.includes(marker)) throw new Error(`Unified CI is missing legacy visual assurance marker: ${marker}`);
}

await withWorkflowCompatibility(
  [
    ['.github/workflows/deploy-cloudflare.yml', '.github/workflows/deploy-production.yml'],
    ['.github/workflows/verify-v36.yml', '.github/workflows/ci-quality-gate.yml'],
    ['.github/workflows/verify-v36-3-runtime.yml', '.github/workflows/ci-quality-gate.yml'],
  ],
  async () => import('./check-v41-experience-legacy.mjs'),
);
