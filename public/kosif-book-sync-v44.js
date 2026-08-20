/* KOSIF v44 book sync — shared owner vault with IndexedDB fallback. */
(()=>{'use strict';
const v=window.KosifBookVault;if(!v||v.__sharedSync)return;v.__sharedSync=true;
const local={listBooks:v.listBooks,getBook:v.getBook,putBook:v.putBook,removeBook:v.removeBook};
const API='/api/kosif/v44/books';
async function remote(path='',init={}){try{const r=await fetch(API+path,{credentials:'same-origin',cache:'no-store',...init,headers:{'content-type':'application/json',...(init.headers||{})}});if(r.status===401||r.status===403)return null;if(!r.ok)throw new Error('BOOK_SYNC_'+r.status);return await r.json()}catch(e){console.warn('[Kosif Book Sync]',e);return null}}
function merge(localRows,remoteRows){const m=new Map();for(const b of [...(remoteRows||[]),...(localRows||[])])if(b?.id)m.set(b.id,b);return [...m.values()].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))}
v.listBooks=async()=>{const [l,r]=await Promise.all([local.listBooks(),remote()]);return merge(l,r?.books)};
v.getBook=async id=>{const l=await local.getBook(id);if(l)return l;const r=await remote('/'+encodeURIComponent(id));if(r?.book){await local.putBook(r.book).catch(()=>{});return r.book}return null};
v.putBook=async book=>{const b=await local.putBook(book);const r=await remote('',{method:'POST',body:JSON.stringify(b)});if(r?.book){b.shared=true;b.professionalAuthority=false;if(b.reader)b.reader.professionalAuthority=false;await local.putBook(b).catch(()=>{})}return b};
v.removeBook=async id=>{await local.removeBook(id);await remote('/'+encodeURIComponent(id),{method:'DELETE'});return true};
v.syncStatus=async()=>{const r=await remote();return r?{shared:true,count:r.books?.length||0}:{shared:false,count:0}};
window.dispatchEvent(new CustomEvent('kosif-book-sync-ready',{detail:{version:'44.0.0'}}));
})();