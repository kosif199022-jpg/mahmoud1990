import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
function replaceEncodedClient(source){
  const marker='const CLIENT_JS=';
  const a=source.indexOf(marker);if(a<0)throw new Error('CLIENT_JS assignment not found');
  const q=a+marker.length;if(source[q]!==String.fromCharCode(34))throw new Error('CLIENT_JS is not a JSON string');
  let i=q+1,escaped=false;
  for(;i<source.length;i++){
    const ch=source[i];
    if(escaped){escaped=false;continue}
    if(ch==='\\'){escaped=true;continue}
    if(ch===String.fromCharCode(34))break;
  }
  if(i>=source.length)throw new Error('unterminated CLIENT_JS assignment');
  let decoded=JSON.parse(source.slice(q,i+1));
  decoded=replaceBlock(decoded,clientStart,clientEnd,client,'encoded browser client');
  decoded=decoded.replaceAll('KOSIF_CLIENT_V8_2026_08_16','KOSIF_CLIENT_V36_2026_08_17');
  return source.slice(0,a)+marker+JSON.stringify(decoded)+source.slice(i+1);
}

// Validate the two source blocks independently.
fs.writeFileSync('/tmp/v36-ai-backend.js',backend);
fs.writeFileSync('/tmp/v36-ai-client.js',client);
execFileSync('node',['--check','/tmp/v36-ai-backend.js'],{stdio:'inherit'});
execFileSync('node',['--check','/tmp/v36-ai-client.js'],{stdio:'inherit'});

let ws=fs.readFileSync('src/kosif-workspace.js','utf8');
ws=replaceBlock(ws,backendStart,backendEnd,backend,'backend');
ws=replaceEncodedClient(ws);
ws=ws.replaceAll('KOSIF_WORKSPACE_V8_2026_08_16','KOSIF_WORKSPACE_V36_2026_08_17');
fs.writeFileSync('src/kosif-workspace.js',ws);

for(const fn of ['frontend/index.html','public/index.html']){
  let s=fs.readFileSync(fn,'utf8');
  s=replaceBlock(s,clientStart,clientEnd,client,'rendered client '+fn);
  s=s.replaceAll('KOSIF_WORKSPACE_V8_2026_08_16','KOSIF_WORKSPACE_V36_2026_08_17');
  s=s.replaceAll('KOSIF_CLIENT_V8_2026_08_16','KOSIF_CLIENT_V36_2026_08_17');
  fs.writeFileSync(fn,s);
}
console.log('Patched structured multimodal AI bridge for v36');
