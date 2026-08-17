import fs from 'node:fs';
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const bridge=read('public/v36-zai.js'),sw=read('public/sw.js');
const failures=[];const ok=(name,v)=>{console.log((v?'✅':'❌')+' '+name);if(!v)failures.push(name)};
const modules=[
  {file:'v36-council-v2.js',global:'KosifCouncilV2',loader:'loadCouncilV2'},
  {file:'v36-executor.js',global:'KosifExecutor',loader:'loadExecutor'},
  {file:'v36-reviewer-media.js',global:'KosifReviewerMedia',loader:'loadReviewerMedia'},
  {file:'v36-voice-guide.js',global:'KosifVoiceGuide',loader:'loadVoiceGuide'},
  {file:'v36-history-restore.js',global:'KosifHistoryRestore',loader:'loadHistoryRestore'}
];
for(const m of modules){
  const src=read('public/'+m.file);
  ok(m.file+' exists with exported global',!!src&&src.includes('window.'+m.global));
  ok(m.file+' has a live bridge loader',bridge.includes('function '+m.loader+'(')&&bridge.includes('/'+m.file+'?'));
  ok(m.file+' loader is invoked from live patch path',new RegExp(m.loader.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\(\\)').test(bridge));
  ok(m.file+' is available offline through Service Worker',sw.includes("'/"+m.file+"'"));
}
ok('bridge uses one guarded module loader to avoid duplicate script injection',/function loadModule\(globalName,selector,src,datasetKey\)/.test(bridge)&&/if\(window\[globalName\]\|\|document\.querySelector\(selector\)\)return/.test(bridge));
console.log(`KOSIF_FEATURE_REACHABILITY ${failures.length?'FAILED':'OK'} failures=${failures.length}`);if(failures.length){for(const x of failures)console.error(' - '+x);process.exit(2)}
