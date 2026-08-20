import fs from 'node:fs';
import edgeWorker from '../src/security-edge.js';

const edge=fs.readFileSync('src/security-edge.js','utf8');
const suite=fs.readFileSync('src/suite-edge.js','utf8');
const wrapper=fs.existsSync('src/suite-edge-v43.js')?fs.readFileSync('src/suite-edge-v43.js','utf8'):'';
const wrangler=fs.readFileSync('wrangler.toml','utf8');
const legacy=fs.readFileSync('src/legacy-worker.js','utf8');
const failures=[];
const ok=(name,v)=>{console.log((v?'✅':'❌')+' '+name);if(!v)failures.push(name)};

const direct=/main\s*=\s*"src\/suite-edge\.js"/.test(wrangler);
const governed=/main\s*=\s*"src\/suite-edge-v43\.js"/.test(wrangler)&&wrapper.includes("import suite from './suite-edge.js'")&&wrapper.includes('await suite.fetch(req,env,ctx)');
ok('Wrangler production enters governed suite edge then canonical security edge',(direct||governed)&&suite.includes("import securityEdge from './security-edge.js'")&&suite.includes('securityEdge.fetch'));
ok('Security edge delegates allowed traffic to canonical worker',edge.includes("import appWorker from './worker.js'")&&edge.includes('return appWorker.fetch(req,env,ctx)'));
ok('Legacy shared state is owner-gated',edge.includes("'/api/state'")&&/LEGACY_SHARED_PATHS/.test(edge));
ok('Legacy notes/files/office storage is owner-gated',edge.includes("'/api/notes'")&&edge.includes("'/api/files'")&&edge.includes("'/api/office/upload'")&&edge.includes("'/api/office/files'"));
ok('Legacy company store is owner-gated without blocking modern company API',edge.includes("'/api/companies'")&&!edge.includes("'/api/kosif/companies'"));
ok('Raw legacy file download routes are owner-gated',edge.includes("path.startsWith('/files/')")&&edge.includes("path.startsWith('/office/files/')"));
ok('Source export prefix is owner-gated',edge.includes("const EXPORT_PREFIX='/6ff6b51050ba881059c63e74/'")&&edge.includes('u.pathname.startsWith(EXPORT_PREFIX)'));
ok('Owner session validates hashed HttpOnly-session token from KV',edge.includes("const OWNER_COOKIE='kosif_ai_session'")&&edge.includes("'kosif:ai:session:'")&&/sha256\((?:token|t)\)/.test(edge)&&/expiresAt/.test(edge));
ok('Legacy worker still contains routes being protected',legacy.includes("'/api/state'")&&legacy.includes("'/api/notes'")&&legacy.includes("'/api/office/upload'"));

const env={};
const stateBlocked=await edgeWorker.fetch(new Request('https://kosif.test/api/state'),env,{});
ok('Unauthenticated legacy shared-state request is blocked at runtime',stateBlocked.status===401&&(await stateBlocked.json()).error==='OWNER_AUTH_REQUIRED');
const exportBlocked=await edgeWorker.fetch(new Request('https://kosif.test/6ff6b51050ba881059c63e74/kosif-full-source.zip'),env,{});
ok('Unauthenticated source export is blocked at runtime',exportBlocked.status===401&&(await exportBlocked.json()).error==='OWNER_AUTH_REQUIRED');
const health=await edgeWorker.fetch(new Request('https://kosif.test/__health'),env,{});
ok('Public health/native application path remains reachable',health.status===200&&(await health.json()).ok===true);

console.log(`KOSIF_SECURITY_EDGE ${failures.length?'FAILED':'OK'} failures=${failures.length}`);
if(failures.length){for(const x of failures)console.error(' - '+x);process.exit(2)}
