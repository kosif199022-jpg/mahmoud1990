import fs from 'node:fs';
import {
  KOSIF_MASTER_SOURCE_SHA256,
  TOTAL_REQUIREMENTS,
  requirementCoverageSummary
} from '../src/requirements/v43-full-registry.mjs';
import { verifyComplete50000 } from '../src/requirements/v43-control-implementation.mjs';

const fail=(message,meta={})=>{console.error('KOSIF_V43_50000_FAIL',message,meta);process.exit(1)};

const summary=requirementCoverageSummary();
if(summary.total!==50000||summary.implemented!==50000||summary.ignored!==0||summary.deferred!==0||!summary.complete){
  fail('registry coverage mismatch',summary);
}

const full=verifyComplete50000({gitSha:process.env.GITHUB_SHA||'local'});
if(!full.complete) fail('runtime implementation is incomplete',full);
if(full.structure.actualUniqueControlApplications!==10010) fail('not all unique controls were applied',full.structure);
if(full.requirements.implemented!==50000||full.requirements.missing!==0) fail('not all requirement IDs resolve to implemented controls',full.requirements);
if(!full.primitives.ok) fail('high-risk primitives missing',full.primitives);

const requiredFiles=[
  'src/requirements/v43-full-registry.mjs',
  'src/requirements/v43-control-implementation.mjs',
  'tests/v43-full-coverage.test.mjs',
  'public/data/kosif-requirements-summary-v43.json',
  'public/requirements/index.html'
];
for(const file of requiredFiles) if(!fs.existsSync(new URL(`../${file}`,import.meta.url))) fail('required evidence file missing',{file});

console.log('KOSIF_V43_50000_OK',JSON.stringify({
  version:summary.version,
  total:summary.total,
  implemented:summary.implemented,
  ignored:summary.ignored,
  deferred:summary.deferred,
  subjects:full.structure.actualSubjects,
  uniqueControlApplications:full.structure.actualUniqueControlApplications,
  mechanisms:full.structure.mechanismCount,
  sourceSha256:KOSIF_MASTER_SOURCE_SHA256
}));
