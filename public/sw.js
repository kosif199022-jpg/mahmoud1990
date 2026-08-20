const C='kosif-native-v38-root-app';
const CORE=['/','/hub.html','/suite.css','/suite.js','/suite-shell.css','/suite-shell.js','/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab','/fonts/alexandria-arabic-500-normal.woff2','/fonts/alexandria-arabic-700-normal.woff2','/wealth-library-v37.js','/libraries/index.html','/libraries/libraries.css','/sales/index.html','/sales/sales.css','/sales/sales.js','/sales/sales-general-bootstrap.js','/sales/sales-motion-v1.css','/sales/sales-motion-v1.js','/v37-privacy-guard.js','/v37-audit-safety.js','/index.html','/manifest.webmanifest','/icon.svg','/migrate-v35.js','/v36.css','/v36-motion.css','/v36-continuity.js','/v36-engagement.js','/v36-continuity.css','/kosif-canva-premium-v2.css','/kosif-vibrant-audit-hero.svg','/v36-mobile-phase-b.css','/v36-polish-phase-d.css','/v36-analytics-3d.js','/v36-analytics-3d.css','/legacy/core-v36.js','/v36-features.js','/v36-operations.js','/v36-outputs.js','/v36-governance.js','/v36-standards-readiness.js','/v36-ai-gate.js','/v36-zai.js','/v36-council-v2.js','/v36-executor.js','/v36-reviewer-media.js','/v36-voice-guide.js','/v36-history-restore.js','/standards/bridge.js'];
const REQUIRED_CORE=new Set(['/','/hub.html','/suite.css','/suite.js','/index.html','/manifest.webmanifest','/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab']);
const INTEGRITY=new Set(['/migrate-v35.js','/v36-continuity.js','/v36-continuity.css','/kosif-canva-premium-v2.css','/kosif-vibrant-audit-hero.svg','/v36-mobile-phase-b.css','/kosif-kitab-theme.css','/kosif-kitab-theme.js']);
function integrity(u){return u.origin===location.origin&&INTEGRITY.has(u.pathname)}
async function primeCore(c){
  const failed=[];
  await Promise.all(CORE.map(async path=>{
    try{
      const req=new Request(path,{cache:'reload'});
      const res=await fetch(req);
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      await c.put(req,res);
    }catch(_){failed.push(path)}
  }));
  const critical=failed.filter(path=>REQUIRED_CORE.has(path));
  if(critical.length)throw new Error(`KOSIF_SW_REQUIRED_CORE_FAILED:${critical.join(',')}`);
  if(failed.length)console.warn('KOSIF_SW_OPTIONAL_CORE_SKIPPED',failed);
}
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(C);await primeCore(c);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()){
    if(k===C)continue;
    if(/^kosif-native-v[\d-]+(?:-[a-z-]+)?-app$/i.test(k)||/^tamhees/i.test(k)||/^kosif-app-/i.test(k))await caches.delete(k)
  }
  const c=await caches.open(C);
  for(const req of await c.keys()){
    const u=new URL(req.url);
    if(integrity(u)||['/libraries/reader.html','/libraries/reader.css','/libraries/reader.js'].includes(u.pathname))await c.delete(req);
  }
  await self.clients.claim();
})()));
function bypass(u){return u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/library/')||u.pathname.startsWith('/wealth/')||u.pathname.startsWith('/standards/audio/')||u.pathname==='/__version'||u.pathname==='/__health'||u.pathname==='/__suite'}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(integrity(u)){
    e.respondWith(fetch(e.request,{cache:'reload'}).then(r=>r).catch(()=>Response.error()));
    return;
  }
  if(bypass(u))return;
  e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok){const c=await caches.open(C);c.put(e.request,r.clone()).catch(()=>{});return r}}catch(_){}const hit=await caches.match(e.request);return hit||Response.error()})())
});
