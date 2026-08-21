(()=>{'use strict';
if(window.__KOSIF_A11Y_V46__)return;
window.__KOSIF_A11Y_V46__=true;
function bindHiddenContainer(element){
  if(!element||element.dataset.kosifA11yInert==='1')return;
  const sync=()=>{element.inert=element.getAttribute('aria-hidden')!=='false'};
  element.dataset.kosifA11yInert='1';
  sync();
  new MutationObserver(sync).observe(element,{attributes:true,attributeFilter:['aria-hidden']});
}
function scan(){
  bindHiddenContainer(document.getElementById('drawer'));
  document.querySelectorAll('[aria-hidden="true"].drawer').forEach(bindHiddenContainer);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
