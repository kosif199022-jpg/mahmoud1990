import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (message) => {
  console.error(`DEPLOYMENT_TARGET_CONSISTENCY_FAIL: ${message}`);
  process.exitCode = 1;
};

const wrangler = read('wrangler.toml');
const deploy = read('.github/workflows/deploy-cloudflare.yml');
const workerName = wrangler.match(/^name\s*=\s*"([^"]+)"/m)?.[1];

if (!workerName) fail('wrangler.toml has no Worker name');

const expectedUrl = workerName ? `https://${workerName}.kosif199022.workers.dev` : '';
if (expectedUrl && !deploy.includes(expectedUrl)) {
  fail(`canonical deploy workflow does not verify ${expectedUrl}`);
}
if (deploy.includes('mahmoud-eldesouky.kosif199022.workers.dev')) {
  fail('legacy Worker URL is still present in canonical deployment workflow');
}

const workflowsDir = path.join(root, '.github/workflows');
const autoDeployers = fs.readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .map((name) => ({name, body: fs.readFileSync(path.join(workflowsDir, name), 'utf8')}))
  .filter(({body}) => /wrangler@4\s+deploy/.test(body) && /\bpush\s*:/.test(body) && /branches\s*:\s*\[?\s*main\b/.test(body));

if (autoDeployers.length !== 1) {
  fail(`expected exactly one automatic Wrangler production deployer, found ${autoDeployers.length}: ${autoDeployers.map(x => x.name).join(', ')}`);
}
if (autoDeployers[0]?.name !== 'deploy-cloudflare.yml') {
  fail(`unexpected canonical automatic deployer: ${autoDeployers[0]?.name || 'none'}`);
}

for (const asset of [
  '/kosif-workspace-stability-v42.js',
  '/kosif-workspace-stability-v42.css',
  '/kosif-workspace-stability-loader-v42.js'
]) {
  if (!deploy.includes(asset)) fail(`live deployment verification is missing ${asset}`);
}

if (!deploy.includes("grep -q 'kosif-workspace-stability-loader-v42.js'")) {
  fail('audit shell does not verify stability loader injection');
}

if (fs.existsSync(path.join(root, 'public/kosif-workspace-stability-v42b.js'))) {
  fail('unused duplicate v42b workspace runtime still exists');
}

if (!process.exitCode) {
  console.log('DEPLOYMENT_TARGET_CONSISTENCY_OK', JSON.stringify({workerName, expectedUrl, autoDeployer: autoDeployers[0].name}));
}
