/* KOSIF recorder v51 visual snapshots + verified persistence state. */
(() => {
  'use strict';
  if(window.__KOSIF_REC_V51_VISUAL__)return;
  window.__KOSIF_REC_V51_VISUAL__=true;

  const C=()=>window.__KOSIF_REC_V51_CTX__;
  let stream=null,video=null,busy=false,last=0;

  async function screen(){
    const c=C();
    if(!navigator.mediaDevices?.getDisplayMedia)return false;
    try{
      stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
      video=document.createElement('video');
      video.muted=true;video.playsInline=true;video.srcObject=stream;
      await video.play();
      c?.add('screen-capture-enabled');
      return true;
    }catch(e){
      c?.add('screen-capture-unavailable',{error:{name:c?.txt(e?.name||'Error',50),message:c?.txt(e?.message||e,120)}});
      return false;
    }
  }
  function stopScreen(){try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;video=null}
  function fallback(){
    const c=C(),w=Math.min(680,innerWidth),h=Math.min(1100,innerHeight),cv=document.createElement('canvas');
    cv.width=w;cv.height=h;
    const x=cv.getContext('2d'),sx=w/innerWidth,sy=h/innerHeight;
    x.fillStyle='#f8fafc';x.fillRect(0,0,w,h);
    [...document.querySelectorAll('button,a,[role="button"],[role="link"],h1,h2,h3,.card,[role="dialog"],dialog')]
      .filter(e=>!e.closest?.('#kosif-rec-ctl,#kosif-rec-report')).slice(0,180).forEach(e=>{
        const r=e.getBoundingClientRect();
        if(r.width<=0||r.height<=0||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight)return;
        x.strokeStyle=e.matches('button,a,[role="button"],[role="link"]')?'#2563eb':'#94a3b8';
        x.strokeRect(r.x*sx,r.y*sy,r.width*sx,r.height*sy);
        const n=c?.label(e);if(n){x.fillStyle='#0f172a';x.font='11px sans-serif';x.fillText(n,r.x*sx+3,r.y*sy+13)}
      });
    return{dataUrl:cv.toDataURL('image/jpeg',.5),width:w,height:h,kind:'dom-visual-map'};
  }
  async function frame(){
    if(video&&video.readyState>=2){
      const w=Math.min(800,video.videoWidth||innerWidth),ratio=(video.videoHeight||innerHeight)/(video.videoWidth||innerWidth),h=Math.max(1,Math.round(w*ratio)),cv=document.createElement('canvas');
      cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(video,0,0,w,h);
      document.querySelectorAll('input,textarea,select,[contenteditable="true"],[data-sensitive]').forEach(e=>{
        const r=e.getBoundingClientRect();x.fillStyle='#111827';x.fillRect(r.x*w/innerWidth,r.y*h/innerHeight,r.width*w/innerWidth,r.height*h/innerHeight);
      });
      return{dataUrl:cv.toDataURL('image/jpeg',.55),width:w,height:h,kind:'screen-capture'};
    }
    return fallback();
  }
  async function snap(reason){
    const c=C(),s=c?.state;
    if(!s?.active||busy||s.shots.length>=36||Date.now()-last<650)return;
    busy=true;last=Date.now();
    try{
      const f=await frame(),shotId=`shot-${String(s.shots.length+1).padStart(3,'0')}-${Date.now()}`;
      const m={shotId,reason,kind:f.kind,width:f.width,height:f.height,path:location.pathname,view:c.view(),generatedAt:new Date().toISOString()};
      let upload={ok:false};
      if(s.cloud){
        try{
          const r=await fetch(`${c.API}/screenshot`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:s.id,...m,dataUrl:f.dataUrl})});
          upload=await r.json().catch(()=>({}));upload.ok=r.ok;
          s.github=Boolean(upload.github?.ok||s.github);
        }catch(e){upload={ok:false,error:c?.txt(e?.message||e,120)}}
      }
      s.shots.push({...m,upload});
      c.add('screenshot',{...m,upload:{ok:upload.ok,github:upload.github||null,githubCode:upload.githubCode||null}});
      c.save();
    }finally{busy=false}
  }
  function summary(){
    const c=C(),s=c.state,counts={},dead=[],rage=[],errors=[],network=[];
    for(const e of s.events){
      counts[e.type]=(counts[e.type]||0)+1;
      if(e.type==='click-result'&&e.deadClickCandidate)dead.push(e);
      if(e.type==='rage-click')rage.push(e);
      if(['error','unhandled-rejection','console','resource-error','long-task'].includes(e.type))errors.push(e);
      if(e.type==='network'||e.type==='network-error')network.push(e);
    }
    return{eventCount:s.events.length,durationMs:Date.now()-s.startedAt,counts,deadClicks:dead.slice(-80),rageClicks:rage.slice(-50),errors:errors.slice(-80),network:network.slice(-80),screenshots:s.shots};
  }
  function statusNode(){
    let st=document.getElementById('kosif-rec-save-state');if(st)return st;
    const card=document.getElementById('kosif-rec-card');if(!card)return null;
    st=document.createElement('div');st.id='kosif-rec-save-state';
    st.style.cssText='margin:8px 0 12px;padding:9px 11px;border:1px solid #d1d5db;border-radius:10px;background:#f8fafc;color:#111827;font:700 12px/1.5 inherit';
    st.textContent='جارٍ حفظ التسجيل…';
    const box=document.getElementById('kosif-rec-code');card.insertBefore(st,box||null);return st;
  }
  function reasonText(code,error){
    const map={
      GITHUB_TOKEN_NOT_CONFIGURED:'GitHub المباشر غير مفعّل: Secret ‏GITHUB_RECORDING_TOKEN غير موجود في Cloudflare.',
      GITHUB_TOKEN_INVALID:'تعذر GitHub: التوكن غير صالح أو منتهي.',
      GITHUB_PERMISSION_DENIED:'تعذر GitHub: التوكن لا يملك صلاحية الكتابة على المستودع.',
      GITHUB_REPO_OR_BRANCH_NOT_FOUND:'تعذر GitHub: المستودع أو الفرع غير متاح للتوكن.',
      GITHUB_CONFLICT:'تعذر GitHub بسبب تعارض أثناء إنشاء الملف.',
      GITHUB_WRITE_REJECTED:'رفض GitHub عملية كتابة الملف.',
      GITHUB_NETWORK_ERROR:'تعذر الاتصال بـ GitHub من الخادم.',
      GITHUB_WRITE_FAILED:'فشلت الكتابة المباشرة إلى GitHub.'
    };
    return map[code]||error||'لم يتم تأكيد الكتابة المباشرة إلى GitHub.';
  }
  function renderPersistence(st,saved,status){
    if(!st)return;
    st.replaceChildren();
    const gh=saved?.github||status?.status?.githubLast||null;
    const code=saved?.githubCode||status?.status?.githubCode||gh?.code||null;
    const cloud=Boolean(saved?.cloudflareSaved||saved?.ok||status?.cloudflare||status?.status?.finalCloudflareSaved);
    if(gh?.ok){
      st.append(document.createTextNode('✅ تم الحفظ فورًا في GitHub'));
      const href=gh.htmlUrl||status?.status?.githubHtmlUrl;
      if(href){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener';a.textContent=' · فتح التسجيل';st.appendChild(a)}
      return;
    }
    if(cloud){
      st.textContent=`✅ تم حفظ التسجيل في Cloudflare. ⚠️ ${reasonText(code,gh?.error)}`;
      return;
    }
    st.textContent=`⚠️ لم يتم تأكيد الحفظ السحابي. ${reasonText(code,gh?.error)}`;
  }
  async function ensureCloud(c,s){
    if(s.cloud)return true;
    try{
      const r=await fetch(`${c.API}/start`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:s.id})});
      const d=await r.json().catch(()=>({}));
      s.cloud=r.ok;s.github=Boolean(d.githubImmediate);c.save();
      return r.ok;
    }catch{return false}
  }
  async function persistenceStatus(c,s){
    try{
      const r=await fetch(`${c.API}/status`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:s.id})});
      const d=await r.json().catch(()=>({}));return r.ok?d:null;
    }catch{return null}
  }
  async function finish(){
    const c=C(),s=c?.state;if(!s?.active)return;
    const st=statusNode();if(st)st.textContent='جارٍ حفظ اللقطات والتقرير…';
    await ensureCloud(c,s);
    await snap('session-end');
    await c.checkpoint('manual-stop');
    for(let i=0;i<35;i++){
      await new Promise(r=>setTimeout(r,150));
      const box=document.getElementById('kosif-rec-code');if(!box?.value?.trim())continue;
      try{
        const base=JSON.parse(box.value);
        const report={...base,schema:'kosif.chatgpt.ux-replay.v3',enhancer:{version:'v51',sessionId:s.id,githubImmediate:s.github,qaStart:s.startQa,qaEnd:c.qa(),summary:summary(),screenshots:s.shots,events:s.events}};
        let saved={ok:false,cloudflareSaved:false};
        if(s.cloud){
          try{
            const r=await fetch(`${c.API}/final`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:s.id,replay:report})});
            saved=await r.json().catch(()=>({}));saved.ok=r.ok;
            s.github=Boolean(saved.github?.ok||s.github);
          }catch(e){saved={ok:false,cloudflareSaved:false,error:c?.txt(e?.message||e,120)}}
        }
        const verified=await persistenceStatus(c,s);
        report.enhancer.finalSave=saved;
        report.enhancer.persistenceStatus=verified;
        box.value=JSON.stringify(report,null,2);
        renderPersistence(st,saved,verified);
        window.__KOSIF_LAST_UX_REPLAY__=report;
        s.active=false;c.save();stopScreen();return;
      }catch{}
    }
    if(st)st.textContent='⚠️ تعذر إكمال تقرير الحفظ؛ الكود المحلي ما زال متاحًا.';
  }

  window.addEventListener('kosif-rec-v51-start',async()=>{await screen();await snap('session-start')});
  window.addEventListener('kosif-rec-v51-shot',e=>void snap(e.detail?.reason||'transition'));
  window.addEventListener('kosif-rec-v51-stop',()=>void finish());
  window.addEventListener('pagehide',()=>stopScreen());
})();
