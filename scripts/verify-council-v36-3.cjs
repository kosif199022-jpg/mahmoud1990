const {chromium}=require('playwright');
const base=process.env.KOSIF_TEST_URL||'http://127.0.0.1:8787';
const fail=(m,x)=>{throw new Error(m+(x!==undefined?' '+JSON.stringify(x):''))};

async function loadReady(page,url){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      await page.goto(url+(url.includes('?')?'&':'?')+'readyAttempt='+attempt,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForSelector('body.kosif-ready',{state:'attached',timeout:20000});
      return;
    }catch(error){
      lastError=error;
      const probe=await page.evaluate(()=>({ready:document.body?.classList.contains('kosif-ready')||false,state:document.readyState,href:location.href,title:document.title})).catch(()=>({probeFailed:true}));
      console.warn('COUNCIL_READY_RETRY',attempt,probe,String(error?.message||error));
      if(attempt<2) await page.waitForTimeout(750);
    }
  }
  throw lastError||new Error('Council page did not reach kosif-ready');
}

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const healthResponse=await page.request.get(base+'/__health?cb='+Date.now());
  if(!healthResponse.ok()) fail('Council preflight health failed',healthResponse.status());
  const health=await healthResponse.json();
  const auditPath=/^v3[7-9]\./.test(String(health.version||''))||/^v38\./.test(String(health.version||''))?'/audit/':'/';
  await loadReady(page,base+auditPath+'?council-v2='+Date.now());
  await page.waitForFunction(()=>window.KosifCouncilV2?.version==='2.0.0',{timeout:20000});
  const apiProviders=await page.evaluate(()=>window.KosifCouncilV2.providers);
  if(JSON.stringify(apiProviders)!==JSON.stringify(['gemini','openai','anthropic','zai']))fail('Council V2 provider registry mismatch',apiProviders);
  await page.click('#kosif-more-btn');await page.waitForSelector('#kosif-more.show');
  const more=await page.locator('#kosif-council-open').innerText();if(!/Z\.ai/.test(more))fail('More sheet council label does not expose Z.ai',more);
  await page.click('#kosif-council-open');await page.waitForSelector('#view-council.show');
  const metrics=await page.evaluate(()=>({cards:document.querySelectorAll('[data-cv2-provider]').length,ids:[...document.querySelectorAll('[data-cv2-provider]')].map(x=>x.dataset.cv2Provider),readonly:[...document.querySelectorAll('[id^="cv2-key-"]')].every(x=>x.readOnly),testsDisabled:[...document.querySelectorAll('.cv2-test')].every(x=>x.disabled),runDisabled:document.querySelector('#cv2-run')?.disabled,ctx:document.querySelector('#cv2-context')?.innerText||'',rawKeyInputs:[...document.querySelectorAll('[id^="cv2-key-"]')].map(x=>x.value)}));
  console.log('COUNCIL_LOCKED',metrics);
  if(metrics.cards!==4||JSON.stringify(metrics.ids)!==JSON.stringify(['gemini','openai','anthropic','zai']))fail('Council V2 cards mismatch',metrics);
  if(!metrics.readonly||!metrics.testsDisabled||!metrics.runDisabled)fail('Council controls are not fail-closed before owner authentication',metrics);
  if(metrics.rawKeyInputs.some(Boolean))fail('Council key input prefilled while locked',metrics.rawKeyInputs);
  if(!/السعودية/.test(metrics.ctx))fail('Default Saudi engagement jurisdiction not shown',metrics.ctx);
  const locked=await page.request.post(base+'/api/kosif/ai/test',{data:{provider:'zai',model:'glm-5.1',key:'not-a-real-key'}});if(locked.status()!==401)fail('Council AI verification endpoint not owner-locked',locked.status());
  const evidenceCtx=await page.evaluate(()=>{
    state.rounds=[{no:7,parsed:{document_requests:[{id:'bank-rec',title:'Bank reconciliation',reason:'Cash existence',standard_refs:['ISA 500']}]}}];
    state.v36=state.v36||{};state.v36.pbc={'bank-rec':{status:'Received',at:'2026-08-17T20:00:00Z'}};state.v36.notes=[{at:'2026-08-17T20:01:00Z',text:'راجع فرق التسوية البنكية قبل إقفال الجولة.'}];
    return window.KosifZAI.councilStructuredContext();
  });
  console.log('COUNCIL_EVIDENCE_CONTEXT',evidenceCtx);
  if(evidenceCtx.pbc?.[0]?.status!=='Received')fail('Council context lost PBC workflow status',evidenceCtx);
  if(!/فرق التسوية البنكية/.test(evidenceCtx.reviewerNotes?.[0]?.text||''))fail('Council context lost reviewer note',evidenceCtx);
  if(evidenceCtx.pbcSummary?.Received!==1)fail('Council context PBC summary incorrect',evidenceCtx.pbcSummary);
  await page.evaluate(()=>{localStorage.setItem('kosif_engagement_governance_v36_3',JSON.stringify({jurisdiction:'international',framework:'full-ifrs'}));window.dispatchEvent(new CustomEvent('kosif-engagement-change',{detail:{jurisdiction:'international',framework:'full-ifrs'}}))});
  await page.waitForTimeout(100);const intl=await page.locator('#cv2-context').innerText();console.log('COUNCIL_INTL',intl);if(!/دولي/.test(intl)||/السعودية/.test(intl))fail('Council did not follow international jurisdiction',intl);
  if(errors.length)fail('Council page errors',errors);
  await page.screenshot({path:'kosif-v36-3-council-v2.png',fullPage:true});
  await browser.close();console.log('KOSIF_V36_3_COUNCIL_V2_OK');
})().catch(e=>{console.error(e.stack||e);process.exit(2)});
