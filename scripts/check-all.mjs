import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd(),skip=new Set(['node_modules','.git','.wrangler','dist']);
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.(?:js|mjs)$/i.test(e.name))out.push(p)}return out}
const files=walk(root),bad=[];
for(const f of files){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)bad.push({f:path.relative(root,f),err:(r.stderr||r.stdout||'').trim()})}
if(bad.length){console.error(`KOSIF_JS_CHECK_FAILED (${bad.length}/${files.length})`);for(const x of bad)console.error(`\n--- ${x.f} ---\n${x.err}`);process.exit(2)}
console.log(`KOSIF_JS_CHECK_OK ${files.length} files`);
