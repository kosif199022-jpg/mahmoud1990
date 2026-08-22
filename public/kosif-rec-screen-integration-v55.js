/* KOSIF recorder screen integration v55 — makes the UX recorder usable on iPhone/Safari when direct display capture is unavailable. */
(()=>{
'use strict';
if(window.__KOSIF_REC_SCREEN_INTEGRATION_V55__)return;
window.__KOSIF_REC_SCREEN_INTEGRATION_V55__=true;
if(location.pathname==='/wealth'||location.pathname.startsWith('/wealth/'))return;

const directSupported=()=>Boolean(window.isSecureContext&&navigator.mediaDevices?.getDisplayMedia&&window.MediaRecorder);
let opening=false;

function openFallback(delay=0){
  if(directSupported()||opening)return;
  setTimeout(()=>{
    if(directSupported()||opening)return;
    const api=window.KosifScreenRecorder;
    if(!api?.open){
      openFallback(80);
      return;
    }
    opening=true;
    try{api.open()}finally{setTimeout(()=>{opening=false},250)}
  },Math.max(0,Number(delay)||0));
}

/*
 * The v51 UX recorder starts from the same visible button. On iOS Safari there is
 * no getDisplayMedia API, so the screen-recorder layer must immediately expose
 * the native-recording/import instructions instead of silently recording only
 * interaction metadata.
 */
window.addEventListener('kosif-rec-v51-start',()=>{
  if(!directSupported())openFallback();
},true);

/* The screen recorder itself emits this state from its v51 integration path. */
window.addEventListener('kosif-screen-capture',e=>{
  if(e?.detail?.state==='unsupported')openFallback();
},true);

/*
 * When the metadata session finishes on iPhone/Safari, bring the import panel
 * back above the JSON report so the user can attach the native screen recording
 * without hunting for a second control.
 */
window.addEventListener('kosif-ux-replay-ready',()=>{
  if(!directSupported())openFallback(120);
},true);
})();
