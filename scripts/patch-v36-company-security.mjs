import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const backend=fs.readFileSync('scripts/v36-company-backend.js.txt','utf8');
const client=fs.readFileSync('scripts/v36-company-client.js.txt','utf8');
const BSTART='async function listPublicCompanies';const BEND='function sourceDigest';
const CSTART='let ACTIVE_PUBLIC=';const CEND='function privateOpenForm()';
function replaceBlock(s,aMark,bMark,repl,label){const a=s.indexOf(aMark);if(a<0)throw Error('missing '+label+' start');const b=s.indexOf(bMark,a);if(b<0)throw Error('missing '+label+' end');return s.slice(0,a)+repl+s.slice(b)}
function mutateEncoded(source){const m='const CLIENT_JS=',a=source.indexOf(m);if(a<0)throw Error('CLIENT_JS missing');const q=a+m.length;if(source[q]!==String.fromCharCode(34))throw Error('CLIENT_JS not JSON string');let i=q+1,e=false;for(;i<source.length;i++){const c=source[i];if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c===String.fromCharCode(34))break}let decoded=JSON.parse(source.slice(q,i+1));decoded=replaceBlock(decoded,CSTART,CEND,client,'encoded company client');return source.slice(0,a)+m+JSON.stringify(decoded)+source.slice(i+1)}
fs.writeFileSync('/tmp/company-backend.js',backend);fs.writeFileSync('/tmp/company-client.js',client);execFileSync('node',['--check','/tmp/company-backend.js'],{stdio:'inherit'});execFileSync('node',['--check','/tmp/company-client.js'],{stdio:'inherit'});
let ws=fs.readFileSync('src/kosif-workspace.js','utf8');ws=replaceBlock(ws,BSTART,BEND,backend,'company backend');ws=mutateEncoded(ws);fs.writeFileSync('src/kosif-workspace.js',ws);
for(const fn of ['frontend/index.html','public/index.html']){let s=fs.readFileSync(fn,'utf8');s=replaceBlock(s,CSTART,CEND,client,'rendered company client '+fn);fs.writeFileSync(fn,s)}
console.log('Applied v36 write-token security for public companies');
