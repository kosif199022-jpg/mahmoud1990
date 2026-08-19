(()=>{'use strict';
const p=location.pathname;

/* Audit owns its own five-item mobile navigation. Keep the suite switcher out of
   the audit workspace and pin the approved Canva navy/gold stylesheet after any
   legacy/dynamically-loaded polish layer. This fixes the mixed purple/navy states
   seen on iOS when Phase-D CSS arrived after the v38 theme. */
if(p.startsWith('/audit')){
  document.getElementById('kosif-suite-switcher')?.remove();
  const head=document.head;
  if(head){
    let link=document.getElementById('kosif-unified-theme-runtime');
    if(!link){
      link=document.createElement('link');
      link.id='kosif-unified-theme-runtime';
      link.rel='stylesheet';
      link.href='/v38-user-polish.css?v=38.1.2-unified';
      link.dataset.kosifThemeAuthority='canva-navy-gold';
      head.appendChild(link);
    }
    const pin=()=>{
      if(link.isConnected&&head.lastElementChild!==link)head.appendChild(link);
      document.documentElement.dataset.kosifUnifiedTheme='canva-navy-gold';
    };
    pin();
    const observer=new MutationObserver(records=>{
      let cssAdded=false;
      for(const r of records){
        for(const n of r.addedNodes){
          if(n===link)continue;
          if(n?.nodeType===1&&(n.tagName==='STYLE'||(n.tagName==='LINK'&&String(n.rel||'').toLowerCase()==='stylesheet'))){cssAdded=true;break;}
        }
        if(cssAdded)break;
      }
      if(cssAdded)queueMicrotask(pin);
    });
    observer.observe(head,{childList:true});
    setTimeout(pin,250);setTimeout(pin,900);setTimeout(pin,1800);setTimeout(pin,3200);
  }
  return;
}

if(document.getElementById('kosif-suite-switcher'))return;
const items=[['الرئيسية','/'],['Kosif','/audit/'],['المكتبات','/libraries/'],['المبيعات','/sales/']];
const n=document.createElement('nav');
n.id='kosif-suite-switcher';n.setAttribute('aria-label','التنقل بين أقسام Kosif');
for(const [label,href]of items){
  const a=document.createElement('a');a.href=href;a.textContent=label;
  const on=href==='/'?p==='/':p.startsWith(href.split('/').slice(0,2).join('/')+'/');
  if(on)a.setAttribute('aria-current','true');n.appendChild(a);
}
document.body.appendChild(n);
})();
