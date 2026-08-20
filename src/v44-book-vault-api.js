/* KOSIF v44 shared book vault.
 * Custom books are owner-governed and stored in the existing DATA KV.
 * Uploaded material never acquires professional authority merely because a client labels it official.
 */
const OWNER_COOKIE='kosif_ai_session';
const INDEX_KEY='kosif:v44:books:index';
const PREFIX='kosif:v44:book:';
const MAX_JSON_BYTES=12*1024*1024;
const enc=new TextEncoder();

async function sha256(s){
  const d=await crypto.subtle.digest('SHA-256',enc.encode(String(s||'')));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function cookies(req){
  const out={};
  for(const p of String(req.headers.get('cookie')||'').split(';')){
    const i=p.indexOf('=');
    if(i>0){try{out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}catch{}}
  }
  return out;
}
async function ownerSession(req,env){
  if(!env?.DATA)return null;
  const t=cookies(req)[OWNER_COOKIE];
  if(!t)return null;
  const rec=await env.DATA.get('kosif:ai:session:'+await sha256(t),'json');
  return rec?.expiresAt&&Number(rec.expiresAt)>Date.now()?rec:null;
}
function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'x-kosif-book-vault':'v44'
  }});
}
function safeId(v){
  const id=String(v||'').trim();
  return /^local-[\p{L}\p{N}._-]{3,120}$/u.test(id)?id:'';
}
function compact(book){
  return {
    id:book.id,
    title:String(book.title||'كتاب مضاف').slice(0,240),
    authority:String(book.authority||'reference').slice(0,40),
    professionalAuthority:false,
    source:{
      name:String(book.source?.name||book.source?.title||'').slice(0,300),
      url:String(book.source?.url||'').slice(0,1200),
      kind:String(book.source?.kind||'text').slice(0,80),
      importedAt:String(book.source?.importedAt||new Date().toISOString())
    },
    reader:{
      id:book.id,
      title:String(book.reader?.title||book.title||'كتاب مضاف').slice(0,240),
      sub:String(book.reader?.sub||'كتاب مضاف إلى عقل النظام').slice(0,500),
      year:String(book.reader?.year||''),
      dir:book.reader?.dir==='ltr'?'ltr':'rtl',
      kind:'custom',
      professionalAuthority:false,
      chapters:Array.isArray(book.reader?.chapters)?book.reader.chapters.slice(0,2000):[]
    },
    cleaning:book.cleaning||{},
    createdAt:String(book.createdAt||new Date().toISOString()),
    updatedAt:new Date().toISOString()
  };
}
async function index(env){
  const x=await env.DATA.get(INDEX_KEY,'json');
  return Array.isArray(x)?x:[];
}
async function saveIndex(env,rows){
  await env.DATA.put(INDEX_KEY,JSON.stringify(rows.slice(0,500)));
}

export async function handleV44BookVault(req,env){
  const u=new URL(req.url);
  if(!u.pathname.startsWith('/api/kosif/v44/books'))return null;
  if(!env?.DATA)return json({ok:false,error:'BOOK_VAULT_STORAGE_UNAVAILABLE'},503);
  const owner=await ownerSession(req,env);
  if(!owner)return json({ok:false,error:'OWNER_AUTH_REQUIRED',locked:true},401);

  const tail=u.pathname.slice('/api/kosif/v44/books'.length).replace(/^\//,'');
  if(!tail){
    if(req.method==='GET')return json({ok:true,books:await index(env)});
    if(req.method==='POST'){
      const len=Number(req.headers.get('content-length')||0);
      if(len>MAX_JSON_BYTES)return json({ok:false,error:'BOOK_TOO_LARGE'},413);
      let body;try{body=await req.json()}catch{return json({ok:false,error:'INVALID_JSON'},400)}
      const id=safeId(body?.id);
      if(!id||!body?.reader||!body?.chapters||typeof body.chapters!=='object')return json({ok:false,error:'INVALID_BOOK_PACKAGE'},400);
      const normalized={...body,...compact({...body,id}),id,professionalAuthority:false};
      if(normalized.reader)normalized.reader={...normalized.reader,professionalAuthority:false};
      const payload=JSON.stringify(normalized);
      if(enc.encode(payload).byteLength>MAX_JSON_BYTES)return json({ok:false,error:'BOOK_TOO_LARGE'},413);
      await env.DATA.put(PREFIX+id,payload);
      const rows=(await index(env)).filter(x=>x.id!==id);
      rows.unshift({...compact(normalized),chapters:undefined,reader:{...compact(normalized).reader,chapters:normalized.reader.chapters},updatedAt:normalized.updatedAt});
      await saveIndex(env,rows);
      return json({ok:true,book:rows[0],professionalAuthority:false},201);
    }
    return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  }

  const id=safeId(decodeURIComponent(tail));
  if(!id)return json({ok:false,error:'INVALID_BOOK_ID'},400);
  if(req.method==='GET'){
    const b=await env.DATA.get(PREFIX+id,'json');
    return b?json({ok:true,book:b}):json({ok:false,error:'BOOK_NOT_FOUND'},404);
  }
  if(req.method==='DELETE'){
    await env.DATA.delete(PREFIX+id);
    await saveIndex(env,(await index(env)).filter(x=>x.id!==id));
    return json({ok:true,id});
  }
  return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
}
