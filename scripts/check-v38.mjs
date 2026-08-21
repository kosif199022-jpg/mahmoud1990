import { withWorkflowCompatibility } from './workflow-compat-v46.mjs';

await withWorkflowCompatibility(
  [['.github/workflows/deploy-cloudflare.yml', '.github/workflows/deploy-production.yml']],
  async () => import('./check-v38-legacy.mjs'),
);
