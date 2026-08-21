const C='kosif-native-v41-2-unified-editorial-app';
const CORE=['/','/hub.html','/suite.css','/suite.js','/kosif-fonts-v45.css?v=45','/kosif-visual-system-v45.css?v=2026.08.21-2','/kosif-visual-system-v45.js?v=2026.08.21-1','/kosif-ink-gold-v46.css?v=46','/kosif-workspace-stability-loader-v42.js?v=2026.08.22-1','/kosif-audit-workspace-v47.css?v=2026.08.22-1','/kosif-audit-workspace-v47.js?v=2026.08.22-1','/suite-shell.css','/suite-shell.js','/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab','/kosif-studio-v40.css?v=2026.08.20-v40','/kosif-studio-v40.js?v=40','/kosif-suite-v40.css?v=40','/kosif-editorial-v41.css?v=2026.08.20-v41-2','/kosif-editorial-v41.js?v=2026.08.20-v41-2','/assets/kosif-studio-hero-v40.webp','/assets/kosif-reports-hero-v39.webp','/assets/kosif-live-hero-v39.webp','/fonts/alexandria-arabic-500-normal.woff2','/fonts/alexandria-arabic-700-normal.woff2','/wealth-library-v37.js','/libraries/index.html','/libraries/libraries.css','/sales/index.html','/sales/sales.css','/sales/sales.js','/sales/sales-general-bootstrap.js','/sales/sales-motion-v1.css','/sales/sales-motion-v1.js','/v37-privacy-guard.js','/v37-audit-safety.js','/index.html','/manifest.webmanifest','/icon.svg','/icon-maskable.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png','/migrate-v35.js','/v36.css','/v36-motion.css','/v36-continuity.js','/v36-engagement.js','/v36-continuity.css','/kosif-touch-reveal-safety-v44.css','/kosif-canva-premium-v2.css','/kosif-vibrant-audit-hero.svg','/v36-mobile-phase-b.css','/v36-polish-phase-d.css','/v36-analytics-3d.js','/v36-analytics-3d.css','/legacy/core-v36.js','/v36-features.js','/v36-operations.js','/v36-outputs.js','/v36-governance.js','/v36-standards-readiness.js','/v36-ai-gate.js','/v36-zai.js','/v36-council-v2.js','/v36-executor.js','/v36-reviewer-media.js','/v36-voice-guide.js','/v36-history-restore.js','/standards/bridge.js'];
const REQUIRED_CORE=new Set(['/','/hub.html','/suite.css','/suite.js','/index.html','/manifest.webmanifest','/kosif-kitab-theme.css?v=1.0.0-kitab','/kosif-kitab-theme.js?v=1.0.0-kitab','/kosif-studio-v40.css?v=2026.08.20-v40','/kosif-studio-v40.js?v=40','/kosif-suite-v40.css?v=40','/kosif-editorial-v41.css?v=2026.08.20-v41-2','/kosif-editorial-v41.js?v=2026.08.20-v41-2','/kosif-visual-system-v45.css?v=2026.08.21-2','/kosif-visual-system-v45.js?v=2026.08.21-1','/assets/kosif-studio-hero-v40.webp','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png']);
const INTEGRITY=new Set(['/migrate-v35.js','/v36-continuity.js','/v36-continuity.css','/kosif-fonts-v45.css','/kosif-visual-system-v45.css','/kosif-visual-system-v45.js','/kosif-ink-gold-v46.css','/kosif-workspace-stability-loader-v42.js','/kosif-audit-workspace-v47.css','/kosif-audit-workspace-v47.js','/kosif-touch-reveal-safety-v44.css','/kosif-studio-v40.css','/kosif-studio-v40.js','/kosif-suite-v40.css','/kosif-editorial-v41.css','/kosif-editorial-v41.js','/assets/kosif-studio-hero-v40.webp','/assets/kosif-reports-hero-v39.webp','/assets/kosif-live-hero-v39.webp','/manifest.webmanifest','/icon.svg','/icon-maskable.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png','/kosif-canva-premium-v2.css','/kosif-vibrant-audit-hero.svg','/v36-mobile-phase-b.css','/kosif-kitab-theme.css','/kosif-kitab-theme.js']);function integrity(u){return u.origin===location.origin&&INTEGRITY.has(u.pathname)}
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
    if(/^kosif-native-v/i.test(k)||/^tamhees/i.test(k)||/^kosif-app-/i.test(k))await caches.delete(k)
  }
  const c=await caches.open(C);
  for(const req of await c.keys()){
    const u=new URL(req.url);
    if(['/libraries/reader.html','/libraries/reader.css','/libraries/reader.js'].includes(u.pathname))await c.delete(req);
  }
  await self.clients.claim();
})()));
function bypass(u){return u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/library/')||u.pathname.startsWith('/wealth/')||u.pathname.startsWith('/standards/audio/')||u.pathname==='/__version'||u.pathname==='/__health'||u.pathname==='/__suite'}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(integrity(u)){
    e.respondWith((async()=>{
      const c=await caches.open(C);
      try{
        const r=await fetch(e.request,{cache:'reload'});
        if(r.ok)await c.put(e.request,r.clone());
        return r;
      }catch(_){return await c.match(e.request)||Response.error()}
    })());
    return;
  }
  if(bypass(u))return;
  e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok){const c=await caches.open(C);c.put(e.request,r.clone()).catch(()=>{});return r}}catch(_){}const hit=await caches.match(e.request);return hit||Response.error()})())
});