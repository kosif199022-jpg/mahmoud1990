import fs from 'node:fs';
import path from 'node:path';

const source=process.argv[2];
const root=process.argv[3]||'public/standards/data';
if(!source) throw new Error('Usage: node scripts/import-mafateeh-book.mjs <reader.html> [data-root]');
const html=fs.readFileSync(source,'utf8');

function extractEmbeddedJson(src){
  const m=/\b(?:const|var|let)\s+D\s*=\s*/.exec(src);
  if(!m) throw new Error('Embedded D payload was not found');
  const start=src.indexOf('{',m.index+m[0].length);
  if(start<0) throw new Error('Embedded D object start was not found');
  let depth=0,inStr=false,esc=false;
  for(let i=start;i<src.length;i++){
    const c=src[i];
    if(inStr){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c==='"')inStr=false;continue}
    if(c==='"'){inStr=true;continue}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return JSON.parse(src.slice(start,i+1));
  }
  throw new Error('Embedded D object did not close');
}

const D=extractEmbeddedJson(html);
if(!Array.isArray(D.parts)) throw new Error('D.parts is missing');
const chapters=[];
for(const part of D.parts){
  for(const ch of part.chapters||[]){
    const body=Array.isArray(ch.body)?ch.body.filter(b=>Array.isArray(b)&&['h','p'].includes(b[0])&&typeof b[1]==='string'):[];
    const words=body.reduce((n,b)=>n+(b[1].trim()?b[1].trim().split(/\s+/).length:0),0);
    chapters.push({
      no:Number(ch.no)||chapters.length+1,
      title:String(ch.title||`الفصل ${chapters.length+1}`),
      name:String(ch.name||''),
      part:String(part.name||''),
      partTitle:String(part.title||''),
      pages:[],
      words,
      body,
      study:{
        key:String(ch.key||''),
        idea:String(ch.idea||''),
        questions:Array.isArray(ch.qs)?ch.qs.map(String):[],
        application:String(ch.apply||''),
        weeklyTask:String(ch.week||''),
        track:ch.audio==null?null:ch.audio
      }
    });
  }
}
chapters.sort((a,b)=>a.no-b.no);
const totalWords=chapters.reduce((s,c)=>s+c.words,0);
if(D.parts.length!==6) throw new Error(`Expected 6 parts, found ${D.parts.length}`);
if(chapters.length!==46) throw new Error(`Expected 46 chapters, found ${chapters.length}`);
if(totalWords!==34700) throw new Error(`Expected 34,700 words, found ${totalWords}`);
for(let i=0;i<chapters.length;i++)if(chapters[i].no!==i+1)throw new Error(`Non-contiguous chapter numbering at ${i+1}: ${chapters[i].no}`);

const meta={
  id:'b4',title:String(D.meta?.title||'مفاتيح الثروة'),
  sub:String(D.meta?.subtitle||'من الفكرة إلى النتيجة: منهج عملي في بناء الوعي والعادة والهدف'),
  author:String(D.meta?.author||''),year:'2026',dir:'rtl',parts:D.parts.length,
  chapters:chapters.length,words:totalWords,kind:'development',professionalAuthority:false,
  badge:'تطوير — ليس سندًا مهنيًا',
  provenance:'Imported from mafateeh-al-tharwa reader embedded D payload; study fields are not part of the book body.'
};
const summary={...meta,chapters:chapters.map(c=>({no:c.no,title:c.title,name:c.name,part:c.part,partTitle:c.partTitle,words:c.words}))};
fs.mkdirSync(path.join(root,'b4'),{recursive:true});
fs.writeFileSync(path.join(root,'b4.json'),JSON.stringify(summary,null,2)+'\n');
for(const c of chapters)fs.writeFileSync(path.join(root,'b4',`${c.no}.json`),JSON.stringify(c,null,2)+'\n');

const libPath=path.join(root,'library.json');
const lib=JSON.parse(fs.readFileSync(libPath,'utf8'));
if(!Array.isArray(lib))throw new Error('library.json must be an array');
const next=lib.filter(x=>x?.id!=='b4');next.push(meta);
fs.writeFileSync(libPath,JSON.stringify(next,null,2)+'\n');
console.log('KOSIF_B4_IMPORT_OK',JSON.stringify({parts:D.parts.length,chapters:chapters.length,words:totalWords,studyFields:Object.keys(chapters[0].study)}));
