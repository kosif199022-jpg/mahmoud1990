const C='kosif-native-v38-root-app-20260819';
const CORE=[
  '/manifest.webmanifest','/icon.svg','/migrate-v35.js',
  '/suite-shell.css','/suite-shell.js',
  '/v37-privacy-guard.js','/v37-audit-safety.js',
  '/v38-ultimate.css?v=38','/v38-ultimate.js?v=38',
  '/v38-io.js?v=38','/v38-reports.js?v=38','/v38-accounting.js?v=38',
  '/v38-evidence-graph.js?v=38','/v38-council-v3.js?v=38',
  '/v38-source-fabric.js?v=38','/v38-books.js?v=38','/v38-live.js?v=38','/v38-lab.js?v=38'
];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(C);
  await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()){
    if(key===C)continue;
    if(/^kosif(?:-native|-app|-)/i.test(key)||/^tamhees/i.test(key))await caches.delete(key);
  }
  await self.clients.claim();
})()));
function bypass(url){return url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/library/')||url.pathname.startsWith('/wealth/')||url.pathname.startsWith('/standards/audio/')||url.pathname==='/__version'||url.pathname==='/__health'||url.pathname==='/__suite'}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(bypass(url))return;
  if(event.request.mode==='navigate'||event.request.destination==='document'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kosif</title><body dir="rtl" style="font-family:system-ui;padding:32px">تعذر تحميل Kosif بدون اتصال. أعد المحاولة عند عودة الشبكة.</body>',{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})));
    return;
  }
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok){const cache=await caches.open(C);cache.put(event.request,response.clone()).catch(()=>{})}
      return response;
    }catch(_){return (await caches.match(event.request,{cacheName:C}))||Response.error()}
  })());
});
