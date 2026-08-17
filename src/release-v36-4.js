import app from './security-edge.js';

const BUILD_INFO={
  version:'v36.4',
  buildId:'2026.08.18-v36.4-mobile-release-integrity',
  release:'Mobile Modal Integrity, Reader Auto-scroll Guard & Cache Generation',
  schemaVersion:14,
  appCache:'kosif-native-v36-4-app',
  standardsCache:'kosif-native-v36-4-standards',
  sourceRepo:'kosif199022-jpg/mahmoud1990',
  sourceRef:'main',
  mobileNav:['الرئيسية','الميزان','الجولات','المطالبات','المزيد'],
  fontScale:{min:90,max:200},
  aiGate:'owner-password+verified-key',
  aiProviders:['gemini','openai','anthropic','zai'],
  integrity:{modalScrollLock:'ios-safe',readerAutoScrollGuard:true,cacheGeneration:'v36.4'}
};

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-kosif-release':'native-v36-4-mobile-release-integrity'}})}
function tag(r){const h=new Headers(r.headers);h.set('x-kosif-release','native-v36-4-mobile-release-integrity');h.set('x-kosif-build-id',BUILD_INFO.buildId);h.set('x-content-type-options','nosniff');return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}

export default{
  async fetch(req,env,ctx){
    const u=new URL(req.url);
    if(u.pathname==='/__version')return json(BUILD_INFO);
    if(u.pathname==='/__health')return json({ok:true,name:'Kosif Native',version:BUILD_INFO.version,release:BUILD_INFO.release,buildId:BUILD_INFO.buildId,architecture:'release-integrity → security-edge → native-worker',aiGate:BUILD_INFO.aiGate,aiProviders:BUILD_INFO.aiProviders,integrity:BUILD_INFO.integrity});
    return tag(await app.fetch(req,env,ctx));
  }
};
