import fs from 'node:fs';

const backendStart='function extractOpenAI';
const backendEnd='const KOSIF_CRITICAL=String.raw`';
const clientStart='async function callAI(prompt,isJson)';
const clientEnd='async function sha(s)';
const backend=fs.readFileSync('scripts/v36-ai-backend.js.txt','utf8');
const client=fs.readFileSync('scripts/v36-ai-client.js.txt','utf8');

function replaceBlock(s,start,end,repl,label){
  const a=s.indexOf(start);if(a<0)throw new Error('missing '+label+' start');
  const b=s.indexOf(end,a);if(b<0)throw new Error('missing '+label+' end');
  return s.slice(0,a)+repl+s.slice(b);
}

// Validate standalone blocks before modifying production sources.
fs.writeFileSync('/tmp/v36-ai-backend.js',backend);
fs.writeFileSync('/tmp/v36-ai-client.js',client);

let ws=fs.readFileSync('src/kosif-workspace.js','utf8');
ws=replaceBlock(ws,backendStart,backendEnd,backend,'backend');
ws=replaceBlock(ws,clientStart,clientEnd,client,'client');
ws=ws.replaceAll('KOSIF_WORKSPACE_V8_2026_08_16','KOSIF_WORKSPACE_V36_2026_08_17');
fs.writeFileSync('src/kosif-workspace.js',ws);

for(const fn of ['frontend/index.html','public/index.html']){
  let s=fs.readFileSync(fn,'utf8');
  s=replaceBlock(s,clientStart,clientEnd,client,'rendered client '+fn);
  s=s.replaceAll('KOSIF_WORKSPACE_V8_2026_08_16','KOSIF_WORKSPACE_V36_2026_08_17');
  fs.writeFileSync(fn,s);
}
console.log('Patched structured multimodal AI bridge for v36');
