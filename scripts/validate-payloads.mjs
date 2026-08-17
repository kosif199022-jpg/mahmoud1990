/* Kosif browser-payload validator.
 * Parses the JavaScript/CSS that actually reaches the browser, including
 * worker-injected HTML payloads and inline static-page payloads.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const ROOT=process.cwd();
const SKELETON='<!doctype html><html><head><title>t</title></head><body><div class="top-status"></div><nav class="tabs"><div class="tabs-inner"></div></nav><main></main></body></html>';
const failures=[];
const checked={scripts:0,styles:0,sources:0,htmlFiles:0,injectors:0};
const fail=(source,detail)=>failures.push({source,detail});

function scriptBlocks(html){
  const out=[],re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi;let m;
  while((m=re.exec(String(html||'')))){
    const attrs=m[1]||''; if(/\bsrc\s*=/i.test(attrs))continue;
    const type=((/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)||[, ''])[1]||'').toLowerCase();
    if(type&&!/^(text\/javascript|application\/javascript|module)$/.test(type))continue;
    out.push({code:m[2],module:type==='module',id:(/\bid\s*=\s*["']([^"']+)/i.exec(attrs)||[, '(anonymous)'])[1]});
  }
  return out;
}
function styleBlocks(html){const out=[],re=/<style\b[^>]*>([\s\S]*?)<\/style>/gi;let m;while((m=re.exec(String(html||''))))out.push(m[1]);return out}
function parseModule(code){
  if(typeof vm.SourceTextModule==='function'){new vm.SourceTextModule(code);return}
  const tmp=path.join(os.tmpdir(),`kosif-payload-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmp,code);const r=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});try{fs.unlinkSync(tmp)}catch{}
  if(r.status!==0)throw new Error((r.stderr||r.stdout||'module parse failed').trim().split('\n').slice(-3).join(' | '));
}
function checkScript(where,b){checked.scripts++;try{b.module?parseModule(b.code):new vm.Script(b.code,{filename:where})}catch(e){fail(where,`<script id="${b.id}"> → ${e.message}`)}}
function checkStyle(where,css,index){
  checked.styles++;let depth=0,inStr=false,quote='',inComment=false;
  for(let i=0;i<css.length;i++){
    const c=css[i],n=css[i+1];
    if(inComment){if(c==='*'&&n==='/'){inComment=false;i++}continue}
    if(inStr){if(c==='\\')i++;else if(c===quote)inStr=false;continue}
    if(c==='/'&&n==='*'){inComment=true;i++;continue}
    if(c==='"'||c==="'"){inStr=true;quote=c;continue}
    if(c==='{')depth++;else if(c==='}'){depth--;if(depth<0){fail(where,`<style> #${index}: unbalanced '}' at offset ${i}`);return}}
  }
  if(inComment)fail(where,`<style> #${index}: unclosed comment`);
  if(inStr)fail(where,`<style> #${index}: unclosed string`);
  if(depth!==0)fail(where,`<style> #${index}: ${depth} unclosed '{'`);
}
function checkHtml(where,html){checked.sources++;for(const b of scriptBlocks(html))checkScript(where,b);styleBlocks(html).forEach((css,i)=>checkStyle(where,css,i+1))}

const injectors=[
  ['src/kosif-workspace.js','injectKosifWorkspace'],
  ['src/professional-upgrade.js','injectProfessionalUpgrade'],
  ['src/library-module.js','injectKosifLibrary'],
];
for(const [file,name] of injectors){
  const abs=path.resolve(ROOT,file);if(!fs.existsSync(abs)){fail(file,'missing source file');continue}
  try{
    const mod=await import(pathToFileURL(abs).href+'?validate='+Date.now()+Math.random());
    if(typeof mod[name]!=='function')throw new Error(`missing export ${name}`);
    const html=await mod[name](SKELETON);checked.injectors++;checkHtml(`${file}::${name}`,html);
  }catch(e){fail(`${file}::${name}`,`injector execution/import failed → ${e.stack||e.message||e}`)}
}

function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p)}return out}
for(const base of ['public','frontend'])for(const abs of walk(path.join(ROOT,base)).filter(p=>/\.html?$/i.test(p))){const rel=path.relative(ROOT,abs);checked.htmlFiles++;try{checkHtml(rel,fs.readFileSync(abs,'utf8'))}catch(e){fail(rel,e.message)}}

if(failures.length){
  console.error(`KOSIF_PAYLOAD_VALIDATION_FAILED (${failures.length})`);
  for(const x of failures)console.error(`- ${x.source}: ${x.detail}`);
  process.exit(2);
}
console.log('KOSIF_PAYLOAD_VALIDATION_OK',JSON.stringify(checked));
