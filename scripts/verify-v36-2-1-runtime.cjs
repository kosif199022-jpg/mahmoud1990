const {chromium}=require('playwright');
const fs=require('fs');
const BASE=process.env.KOSIF_TEST_URL||'http://127.0.0.1:8788';
const ok=(v,m)=>{if(!v)throw Error(m)};
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const expectedLegacyVersion='v'+String(pkg.version||'').split('.').slice(0,2).join('.');
const manifestPath=fs.existsSync('RELEASE_MANIFEST_V36_4.json')?'RELEASE_MANIFEST_V36_4.json':'RELEASE_MANIFEST_V36.json';
const releaseManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const expectedLegacyBuild=String(releaseManifest.buildId||'');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],bad=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{const u=new URL(r.url());if(r.status()>=400&&!u.pathname.startsWith('/api/'))bad.push(r.status()+' '+u.pathname)});
  let r=await page.request.get(BASE+'/__health');const h=await r.json();console.log('HEALTH',h);
  const suiteMode=/^v\d+\.\d+\.\d+-root$/.test(String(h.version||''));
  const auditPath=suiteMode?'/audit/':'/';
  if(suiteMode){
    ok(h.modules?.audit==='/audit/'&&h.modules?.wealth==='/wealth/reader.html'&&h.modules?.sales==='/sales/','suite routes missing');
    ok(/v(37-root-rebuild|38-trusted-audit-os)/.test(String(h.buildId||'')),'wrong suite build id');
  }else{
    ok(h.version===expectedLegacyVersion,'wrong health version: expected '+expectedLegacyVersion);
    ok(h.buildId===expectedLegacyBuild,'wrong build id: expected '+expectedLegacyBuild);
  }
  ok(h.aiGate==='owner-password+verified-key','health AI gate marker missing');
  ok(Array.isArray(h.aiProviders)&&h.aiProviders.includes('zai'),'Z.ai provider missing from health');
  ok(Array.isArray(h.aiProviders)&&['gemini','openai','anthropic'].every(x=>h.aiProviders.includes(x)),'Council provider inventory incomplete');
  r=await page.request.post(BASE+'/api/kosif/ai',{data:{provider:'gemini',model:'gemini-3.6-flash',key:'dummy',prompt:'x'}});ok(r.status()===401,'AI must fail closed before owner auth');
  r=await page.request.post(BASE+'/api/kosif/ai/test',{data:{provider:'gemini',model:'gemini-3.6-flash',key:'dummy'}});ok(r.status()===401,'AI test must fail closed before owner auth');
  r=await page.request.post(BASE+'/api/kosif/zai',{data:{provider:'zai',model:'glm-5.1',key:'dummy',prompt:'x'}});ok(r.status()===401,'Z.ai must fail closed before owner auth');
  r=await page.request.post(BASE+'/api/kosif/ai',{data:{provider:'unknown-provider',model:'x',key:'dummy',prompt:'x'}});ok(r.status()===401,'unknown provider must remain behind owner auth');

  await page.goto(BASE+auditPath+'?v='+encodeURIComponent(expectedLegacyVersion),{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);
  ok(await page.locator('body').evaluate(e=>e.classList.contains('kosif-ready')),'app not ready');
  ok(await page.evaluate(()=>window.KosifZAI?.provider==='zai'&&window.KosifZAI?.defaultModel==='glm-5.1'),'Z.ai UI bridge missing');
  ok(await page.locator('link[href*="v36-motion.css"]').count()===1,'motion stylesheet missing');
  const motion=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return{grad:s.getPropertyValue('--m-grad-btn').trim(),ease:s.getPropertyValue('--m-ease').trim(),surface:s.getPropertyValue('--m-surface').trim()}});console.log('MOTION_LIGHT',motion);ok(motion.grad&&motion.ease,'motion vars unresolved');
  const dark=await page.evaluate(()=>{document.documentElement.dataset.theme='dark';return getComputedStyle(document.documentElement).getPropertyValue('--m-surface').trim()});console.log('MOTION_DARK',dark);ok(dark.toLowerCase()==='#151b2e','dark motion surface incorrect');
  const pill=(await page.locator('#kosif-ai-status .kosif-ai-text').textContent())||'';ok(!/متصل|Active/i.test(pill),'AI falsely shown connected');
  await page.locator('#kosif-ai-status').click();await page.waitForTimeout(180);
  const key=page.locator('#kai-key');ok(await key.getAttribute('readonly')!==null,'AI key must be locked');ok((await key.inputValue())==='','locked AI key must be empty');ok(await page.locator('#kai-test').isDisabled(),'AI test enabled while locked');
  ok(await page.locator('#kai-provider option[value="zai"]').count()===1,'Z.ai provider option missing');
  await page.waitForFunction(()=>window.KosifCouncilV2?.version==='2.0.0');
  await page.evaluate(()=>window.KosifZAI.openCouncilV2());await page.waitForTimeout(120);
  ok(await page.locator('#view-council.show').count()===1,'Council V2 navigation failed');
  for(const id of ['gemini','openai','anthropic','zai']){
    const ck=page.locator('#cv2-key-'+id);ok(await ck.count()===1,'Council V2 provider missing '+id);ok(await ck.getAttribute('readonly')!==null,'Council V2 key must be locked '+id);ok((await ck.inputValue())==='','Council V2 locked key must be empty '+id);
  }
  ok(await page.locator('#cv2-run').isDisabled(),'Council V2 run must be disabled while owner gate is locked');
  await page.evaluate(()=>{document.querySelector('#kosif-ai-sheet')?.classList.remove('show');document.querySelector('#kosif-ai-gate')?.classList.remove('show');go('analytics')});
  await page.waitForTimeout(220);
  ok(await page.locator('#ops-lab').count()===1,'Operational lab missing');
  await page.locator('#ops-sample').click({force:true});
  await page.waitForFunction(()=>document.querySelectorAll('#ops-out .kpi').length>=4,{timeout:5000});
  ok(await page.locator('#ops-out .kpi').count()>=4,'Operational KPIs missing');

  await page.goto(BASE+'/standards/?v='+encodeURIComponent(expectedLegacyVersion),{waitUntil:'domcontentloaded'});await page.waitForTimeout(900);
  ok(await page.evaluate(()=>typeof window.KosifStandardsReaderPro==='object'),'Reader Pro missing');
  ok(await page.locator('.card[data-b]').count()===4,'library must list four books');
  ok(await page.locator('.card[data-b="b4"].development').count()===1,'b4 development card missing');
  ok(/تطوير — ليس سندًا مهنيًا/.test(await page.locator('.card[data-b="b4"]').innerText()),'b4 disclaimer missing');
  await page.evaluate(async()=>{await openBook('b4',1)});await page.waitForTimeout(700);ok(await page.locator('#prose').count()===1,'b4 chapter did not open');ok(await page.locator('#prose').locator('p,h2').count()>=14,'b4 body too short');ok(await page.locator('.study-wrap').count()===1,'b4 study layer missing');ok(/ليست من متن الكتاب/.test(await page.locator('.study-wrap').innerText()),'study provenance missing');
  const b4pg=(await page.locator('.pg').innerText())||'';console.log('B4_PAGE_LABEL',b4pg);ok(/الباب الأول/.test(b4pg)&&!/undefined|NaN/.test(b4pg),'b4 page fallback broken');
  await page.evaluate(async()=>{await openBook('b1',1)});await page.waitForTimeout(650);ok(await page.locator('.study-wrap').count()===0,'professional standard got development study layer');const b1pg=(await page.locator('.pg').innerText())||'';console.log('B1_PAGE_LABEL',b1pg);ok(/صفحات المصدر/.test(b1pg)&&!/undefined|NaN/.test(b1pg),'b1 source page label regressed');
  for(const id of ['#rpSpeak','#rpAuto','#rpPrefs'])ok(await page.locator(id).count()===1,'missing reader control '+id);
  console.log('STATIC_BAD',bad);console.log('ERRORS',errors);ok(bad.length===0,'static HTTP errors: '+bad.join(','));const fatal=errors.filter(x=>/ReferenceError|TypeError|SyntaxError|Kosif boot error|Cannot set properties of null/i.test(x));ok(fatal.length===0,'fatal runtime errors: '+fatal.join('\n'));
  await page.screenshot({path:'kosif-v36-3-mobile.png',fullPage:true});await browser.close();console.log('KOSIF_DEEP_VERIFY_OK',suiteMode?h.version:expectedLegacyVersion,suiteMode?h.buildId:expectedLegacyBuild);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});