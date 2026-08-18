(()=>{'use strict';
const raw=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  let p='';try{p=new URL(url,location.href).pathname}catch(_){return raw(input,init)}
  const method=String(init?.method||input?.method||'GET').toUpperCase();
  if(p==='/api/kosif/companies'&&method==='POST'){
    // Legacy v36 silently POSTed the active engagement while merely opening the company
    // drawer. Background publication is now impossible: only a live user gesture can
    // mark a create as explicit, and the Worker enforces the same intent header.
    if(!navigator.userActivation?.isActive){return new Response(JSON.stringify({error:'EXPLICIT_USER_ACTION_REQUIRED',message:'لن ينشر Kosif بيانات شركة تلقائيًا.'}),{status:409,headers:{'content-type':'application/json'}})}
    const h=new Headers(init.headers||input?.headers||{});h.set('x-kosif-intent','user-create');init={...init,headers:h};
  }
  return raw(input,init);
};
})();
