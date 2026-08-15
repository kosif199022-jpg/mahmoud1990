const VERSION='tamhees-v2.1.0-kosif';
const SHELL=`${VERSION}-shell`;
const SHELL_FILES=[
  './','./index.html','./manifest.webmanifest','./theme-restore.css','./theme-restore.js',
  './parts/p01.txt','./parts/p02.txt','./parts/p03.txt','./parts/p04.txt','./parts/p05a.txt','./parts/p05b.txt','./parts/p05c.txt','./parts/p05d.txt','./parts/p06.txt',
  './standards/','./standards/index.html','./standards/styles.css','./standards/kosif-theme.css','./standards/app.js','./standards/bridge.js','./standards/nav-fix.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('tamhees-v')&&k!==SHELL)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;if(req.mode==='navigate'){e.respondWith((async()=>{try{const r=await fetch(req);const c=await caches.open(SHELL);c.put(req,r.clone());return r}catch{return (await caches.match(req))||(await caches.match('./index.html'))}})());return}e.respondWith((async()=>{const cached=await caches.match(req);if(cached){e.waitUntil(fetch(req).then(async r=>{if(r.ok){const c=await caches.open(SHELL);await c.put(req,r.clone())}}).catch(()=>{}));return cached}try{const r=await fetch(req);if(r.ok){const c=await caches.open(SHELL);c.put(req,r.clone())}return r}catch{return new Response('Offline',{status:503,statusText:'Offline'})}})())});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
