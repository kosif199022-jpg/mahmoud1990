import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const targetName = 'Kosif-Full-Application-Source.json';
const targetPath = path.join(root, targetName);
const ignoredRoots = new Set([
  '.git', 'node_modules', '.wrangler', 'storybook-static', '.lighthouseci',
  'playwright-report', 'test-results', 'artifacts', '.gemini'
]);

const mimeByExt = new Map([
  ['.html','text/html'],['.htm','text/html'],['.css','text/css'],
  ['.js','text/javascript'],['.mjs','text/javascript'],['.cjs','text/javascript'],['.ts','text/typescript'],
  ['.json','application/json'],['.md','text/markdown'],['.txt','text/plain'],
  ['.xml','application/xml'],['.svg','image/svg+xml'],['.webmanifest','application/manifest+json'],
  ['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.webp','image/webp'],
  ['.gif','image/gif'],['.ico','image/x-icon'],['.woff','font/woff'],['.woff2','font/woff2'],
  ['.pdf','application/pdf'],['.zip','application/zip'],['.yml','text/yaml'],['.yaml','text/yaml'],
  ['.toml','application/toml'],['.sql','application/sql'],['.csv','text/csv'],['.tsv','text/tab-separated-values']
]);

const mimeFor = file => mimeByExt.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
function isUtf8(buffer){const decoded=buffer.toString('utf8');return !decoded.includes('\uFFFD')&&Buffer.from(decoded,'utf8').equals(buffer)}
function git(args, fallback=''){try{return execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{return fallback}}

function recursiveFiles(dir=root,prefix=''){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const rel=prefix?`${prefix}/${entry.name}`:entry.name;
    if(rel===targetName) continue;
    const first=rel.split('/')[0];
    if(ignoredRoots.has(first)) continue;
    const abs=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...recursiveFiles(abs,rel));
    else if(entry.isFile()) out.push(rel);
  }
  return out;
}

function sourceFiles(){
  const raw=git(['ls-files','-z'],null);
  if(raw!==null){
    return raw.split('\0').filter(Boolean).filter(rel=>rel!==targetName && fs.existsSync(path.join(root,rel))).sort();
  }
  return recursiveFiles();
}

const files={};let totalBytes=0;
for(const rel of sourceFiles()){
  const data=fs.readFileSync(path.join(root,rel)); totalBytes+=data.length;
  const encoding=isUtf8(data)?'utf-8':'base64';
  files[rel.replaceAll(path.sep,'/')]={encoding,mime:mimeFor(rel),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),content:encoding==='utf-8'?data.toString('utf8'):data.toString('base64')};
}
const commit=git(['rev-parse','HEAD'],'0000000000000000000000000000000000000000');
const branch=git(['rev-parse','--abbrev-ref','HEAD'],'unknown');
const out={format:'kosif-complete-source-json-v2',application:'KOSIF',repository:'kosif199022-jpg/mahmoud1990',branch,commit,generated_at_utc:new Date().toISOString(),file_count:Object.keys(files).length,source_bytes:totalBytes,notes:['Snapshot is generated from Git-tracked source files when repository metadata is available.','Dependency caches, runner artifacts and build/test outputs are excluded.','UTF-8 files are stored verbatim; binary files are Base64 encoded.','Every exported file carries a SHA-256 digest.','GitHub Actions secrets are not included.'],files};
fs.writeFileSync(targetPath,JSON.stringify(out));
console.log(JSON.stringify({status:'KOSIF_SOURCE_EXPORT_OK',commit:out.commit,branch:out.branch,files:out.file_count,source_bytes:out.source_bytes,json_bytes:fs.statSync(targetPath).size}));
