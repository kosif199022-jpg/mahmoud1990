(()=>{'use strict';
const p=location.pathname;
const head=document.head;
if(head){
  let link=document.getElementById('kosif-kitab-theme');
  if(!link){link=document.createElement('link');link.id='kosif-kitab-theme';link.rel='stylesheet';link.href='/kosif-kitab-theme.css?v=1.0.0-kitab';link.dataset.kosifThemeAuthority='kitab-caffe';head.appendChild(link)}
  let runtime=document.getElementById('kosif-kitab-theme-runtime');
  if(!runtime){runtime=document.createElement('script');runtime.id='kosif-kitab-theme-runtime';runtime.src='/kosif-kitab-theme.js?v=1.0.0-kitab';runtime.defer=true;head.appendChild(runtime)}
  document.documentElement.dataset.kosifUnifiedTheme='kitab-caffe';
}
/* Audit owns its own five-item mobile navigation. */
if(p.startsWith('/audit')){document.getElementById('kosif-suite-switcher')?.remove();return}
if(document.getElementById('kosif-suite-switcher'))return;
const items=[['الرئيسية','/'],['Kosif','/audit/'],['المكتبات','/libraries/'],['المبيعات','/sales/']];
const n=document.createElement('nav');n.id='kosif-suite-switcher';n.setAttribute('aria-label','التنقل بين أقسام Kosif');
for(const [label,href]of items){const a=document.createElement('a');a.href=href;a.textContent=label;const on=href==='/'?p==='/':p.startsWith(href.split('/').slice(0,2).join('/')+'/');if(on)a.setAttribute('aria-current','true');n.appendChild(a)}
document.body.appendChild(n);
})();
