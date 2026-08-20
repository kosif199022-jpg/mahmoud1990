/* KOSIF Book Import v44 — deterministic text/Book Engine adapter for CI and server-side ingestion. */
import { buildBookDocument, validateBookDocument } from './book-engine-v1.mjs';

const wc=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
export function textToPages(text=''){
  const src=String(text).replace(/\r\n?/g,'\n');
  const chunks=src.split(/\f|\n\s*---\s*PAGE\s*---\s*\n/gi);
  return chunks.map((t,i)=>({page:i+1,text:t}));
}
export function bookDocumentToReaderPackage(book){
  const check=validateBookDocument(book);if(!check.ok)throw new Error(`BOOK_DOCUMENT_INVALID:${check.errors.join(',')}`);
  const chapters=[];let current=null;
  const ensure=title=>{if(!current){current={no:chapters.length+1,title:title||book.title,name:'',pages:[],body:[],study:null};chapters.push(current)}return current};
  for(const n of book.nodes){
    if(n.type==='part'||n.type==='chapter'){
      current={no:chapters.length+1,title:n.text,name:'',pages:[],body:[],study:null};chapters.push(current);continue;
    }
    const c=ensure(book.title);
    if(n.source?.page&&!c.pages.includes(n.source.page))c.pages.push(n.source.page);
    c.body.push([n.type==='section'||n.type==='heading'?'h':'p',n.text]);
  }
  for(const c of chapters){c.words=c.body.reduce((a,b)=>a+wc(b[1]),0)}
  const summary=chapters.map(c=>({no:c.no,title:c.title,name:c.name,pages:c.pages,words:c.words,blocks:c.body.length}));
  return {schema:'kosif.reader-package.v44',id:book.id,title:book.title,reader:{id:book.id,title:book.title,sub:book.source?.issuer||book.source?.title||'',year:String(book.source?.edition||''),dir:book.direction||'rtl',kind:'imported',professionalAuthority:book.authority==='official',chapters:summary},chapters:Object.fromEntries(chapters.map(c=>[String(c.no),c])),provenance:{source:book.source,stats:book.stats,flags:book.flags,removedArtifacts:book.removedArtifacts}};
}
export function buildReaderPackageFromText({id,title,text,authority='reference',source={}}={}){
  const book=buildBookDocument({id,title,pages:textToPages(text),authority,source});
  return {book,readerPackage:bookDocumentToReaderPackage(book)};
}
export function directBookUrl(id,chapter){
  const q=new URLSearchParams({book:String(id)});if(chapter)q.set('chapter',String(chapter));return `/standards/?${q}`;
}
