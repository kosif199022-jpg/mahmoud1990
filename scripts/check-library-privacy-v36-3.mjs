import fs from 'node:fs';
import edgeWorker from '../src/security-edge.js';

class MemoryKV{
  constructor(){this.m=new Map()}
  async get(key,type){if(!this.m.has(key))return null;const v=this.m.get(key);if(type==='json'){if(typeof v==='string')try{return JSON.parse(v)}catch{return null};return v}if(type&&typeof type==='object'&&type.type==='arrayBuffer')return v;return v}
  async put(key,value){this.m.set(key,value)}
  async delete(key){this.m.delete(key)}
  async list({prefix='',limit=1000}={}){const names=[...this.m.keys()].filter(k=>String(k).startsWith(prefix)).slice(0,limit);return{keys:names.map(name=>({name})),list_complete:true}}
}
const failures=[];const ok=(name,v)=>{console.log((v?'✅':'❌')+' '+name);if(!v)failures.push(name)};
const edge=fs.readFileSync('src/security-edge.js','utf8');
const kv=new MemoryKV(),env={DATA:kv};
const ready=(id,name)=>({id,name,type:'application/pdf',size:100,chunkSize:100,chunkCount:1,state:'ready',createdAt:new Date().toISOString(),intelReady:false});
await kv.put('library:meta:foreign',JSON.stringify(ready('foreign','foreign.pdf')));

let r=await edgeWorker.fetch(new Request('https://kosif.test/api/library'),env,{}),d=await r.json();
ok('Anonymous device cannot enumerate pre-existing global books',r.status===200&&Array.isArray(d.books)&&d.books.length===0&&d.scope==='device');

r=await edgeWorker.fetch(new Request('https://kosif.test/api/library/start',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'203.0.113.8'},body:JSON.stringify({name:'mine.pdf',size:100,chunkSize:100})}),env,{});d=await r.clone().json();
const mine=String(d.id||''),setCookie=r.headers.get('set-cookie')||'',cookiePair=setCookie.split(';')[0];
ok('Library start issues private HttpOnly device capability',r.status===201&&!!mine&&/kosif_library_device=/.test(setCookie)&&/HttpOnly/i.test(setCookie)&&/SameSite=Strict/i.test(setCookie));
ok('Library start grants only that device an access mapping',[...kv.m.keys()].some(k=>k.startsWith('kosif:library:access:')&&k.endsWith(':'+mine)));
ok('New uploads are not automatically trusted as audit authority',!(await kv.get('kosif:library:audit-trusted:'+mine)));
const mineMeta=await kv.get('library:meta:'+mine,'json');mineMeta.state='ready';await kv.put('library:meta:'+mine,JSON.stringify(mineMeta));

r=await edgeWorker.fetch(new Request('https://kosif.test/api/library',{headers:{cookie:cookiePair}}),env,{});d=await r.json();
ok('Owning device lists its own book only',d.books?.length===1&&d.books[0].id===mine&&!d.books.some(x=>x.id==='foreign'));
const other='kosif_library_device='+'A'.repeat(43);
r=await edgeWorker.fetch(new Request('https://kosif.test/api/library',{headers:{cookie:other}}),env,{});d=await r.json();
ok('Different device cannot enumerate another device book',d.books?.length===0);
r=await edgeWorker.fetch(new Request('https://kosif.test/api/library/intel/status?id='+encodeURIComponent(mine),{headers:{cookie:other}}),env,{});
ok('Different device receives non-disclosing 404 for stored-book APIs',r.status===404);

r=await edgeWorker.fetch(new Request('https://kosif.test/api/kosif/library/trust',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:mine,trusted:true})}),env,{});
ok('Professional trust changes require owner session',r.status===401);
const ownerToken='owner-test-token-012345678901234567890123456789';
const digest=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
await kv.put('kosif:ai:session:'+await digest(ownerToken),JSON.stringify({expiresAt:Date.now()+600000,verified:{}}));
r=await edgeWorker.fetch(new Request('https://kosif.test/api/kosif/library/trust',{method:'POST',headers:{'content-type':'application/json',cookie:'kosif_ai_session='+ownerToken},body:JSON.stringify({id:mine,trusted:true})}),env,{});d=await r.json();
ok('Owner can explicitly promote a book to audit-trusted context',r.status===200&&d.trusted===true&&(await kv.get('kosif:library:audit-trusted:'+mine))==='1');
r=await edgeWorker.fetch(new Request('https://kosif.test/api/library',{headers:{cookie:'kosif_ai_session='+ownerToken}}),env,{});d=await r.json();
ok('Owner can administer all smart-library books',d.scope==='owner'&&d.books?.some(x=>x.id==='foreign')&&d.books?.some(x=>x.id===mine&&x.auditTrusted===true));

ok('AI edge filters library metadata through explicit audit-trust markers',/function trustedLibraryData\(data\)/.test(edge)&&/opts\?\.prefix\|\|''\)!=='library:meta:'/.test(edge)&&/kosif:library:audit-trusted:/.test(edge)&&/isAIPath\(u\.pathname\)\?aiEnv\(env\):env/.test(edge));
ok('Stored PDF, OCR, search and chunk routes are device-gated',edge.includes('function isStoredLibraryRoute')&&edge.includes('library/files')&&edge.includes('api/library/chunk')&&edge.includes("'/api/library/intel'")&&edge.includes("'/api/library/search'"));
ok('Upload-start abuse gets an hourly server-side rate limit',/LIBRARY_UPLOAD_RATE_LIMIT/.test(edge)&&/count>=10/.test(edge));

console.log(`KOSIF_LIBRARY_PRIVACY ${failures.length?'FAILED':'OK'} failures=${failures.length}`);
if(failures.length){for(const x of failures)console.error(' - '+x);process.exit(2)}
