import fs from 'node:fs';
import path from 'node:path';

fs.copyFileSync('frontend/index.html','public/index.html');

const DATA='public/standards/data';
const OUT='public/wealth/books';
const BOOKS={
  std2018:{source:'b1',author:'الهيئة السعودية للمحاسبين القانونيين',role:'نسخة عربية معتمدة',note:'مرجع تاريخي. الأولوية المهنية لأحدث إصدار رسمي نافذ.',authority:'official'},
  std2025:{source:'b3',author:'الهيئة السعودية للمراجعين والمحاسبين',role:'مرجع رسمي محدث',note:'المتن من المصدر الرسمي المجهز داخل Kosif. الأولوية دائمًا لأحدث إصدار رسمي نافذ.',authority:'official'},
  dipifr:{source:'b2',author:'BPP Learning Media',role:'مادة تدريبية',note:'مادة تدريبية وتمارين؛ لا تحل محل SOCPA أو IFRS كمصدر اعتماد مهني.',authority:'training'}
};

const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value));

function partLabel(c,id){
  const t=`${c?.title||''} ${c?.name||''}`;
  if(id==='dipifr'){
    if(/ANSWER/i.test(t))return'الإجابات';
    if(/MOCK/i.test(t))return'الاختبارات التجريبية';
    if(/QUESTION/i.test(t))return'الأسئلة';
    return'المقدمة';
  }
  if((Number(c?.no)||0)<=2||/إطار مفاهيم|التحول للمعايير|حقوق التأليف/.test(t))return'التمهيد وإطار المفاهيم';
  if(/معيار المحاسبة الدولي/.test(t))return'معايير المحاسبة الدولية IAS';
  if(/تفسير|IFRIC|SIC/.test(t))return'التفسيرات';
  if(/المعيار الدولي للتقرير المالي/.test(t))return'المعايير الدولية للتقرير المالي IFRS';
  return'إصدارات سعودية مكملة';
}
function readerParts(data,id){
  const ch=Array.isArray(data?.chapters)?data.chapters:[],out=[];
  for(const c of ch){
    const label=partLabel(c,id),no=Number(c.no)||1,last=out[out.length-1];
    if(!last||last.title!==label)out.push({name:`الباب ${out.length+1}`,title:label,intro:'',from:no,to:no});
    else last.to=no;
  }
  return out.length?out:[{name:'الكتاب',title:data?.title||'الكتاب',intro:'',from:1,to:Math.max(1,ch.length)}];
}

fs.mkdirSync(OUT,{recursive:true});
const registry=load(path.join(DATA,'library.json'));
const byId=new Map(registry.map(x=>[x.id,x]));
const manifest=[];
const wealth=byId.get('b4');
manifest.push({
  id:'mafateeh',title:wealth?.title||'مفاتيح الثروة',subtitle:wealth?.sub||'من الفكرة إلى النتيجة',author:wealth?.author||'حامد بن علي',year:wealth?.year||'2026',dir:'rtl',parts:Number(wealth?.parts)||6,chapters:Number(wealth?.chapters)||46,words:Number(wealth?.words)||34700,audio:true,embedded:true,authority:'development',professionalAuthority:false
});

for(const [id,cfg] of Object.entries(BOOKS)){
  const data=load(path.join(DATA,`${cfg.source}.json`));
  const reg=byId.get(cfg.source)||{};
  const parts=readerParts(data,id);
  const chapters=(data.chapters||[]).map(c=>({no:Number(c.no),title:c.title||'',name:c.name||'',key:c.name||'',words:Number(c.words)||0,pages:c.pages||null,part:parts.find(p=>Number(c.no)>=p.from&&Number(c.no)<=p.to)?.title||''}));
  write(`${id}.json`,{meta:{title:data.title||reg.title||'',subtitle:data.sub||reg.sub||'',author:cfg.author,role:cfg.role,year:data.year||reg.year||'',note:cfg.note,preface:id==='dipifr'?['مادة تدريبية لتمارين DipIFR وليست مصدر اعتماد محاسبي.']:['نسخة مجهزة للقراءة داخل Kosif من المصدر المحفوظ في مكتبة المعايير.']},parts,chapters});
  manifest.push({id,title:data.title||reg.title||'',subtitle:data.sub||reg.sub||'',author:cfg.author,year:data.year||reg.year||'',dir:reg.dir||(id==='dipifr'?'ltr':'rtl'),parts:parts.length,chapters:chapters.length,words:chapters.reduce((s,c)=>s+c.words,0),audio:false,embedded:false,authority:cfg.authority,professionalAuthority:cfg.authority==='official'});
}
write('library.json',manifest);
console.log('Kosif Native assets ready; four-book reader indexes generated',manifest.map(x=>`${x.id}:${x.chapters}`).join(','));
