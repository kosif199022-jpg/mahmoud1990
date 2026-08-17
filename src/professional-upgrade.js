const PRO_VERSION="2.1.0";
let PRO_INDEX_PROMISE=null,PRO_LIBRARY_PROMISE=null,PRO_FALLBACK_INDEX_PROMISE=null;
const PRO_UPDATES=[
  {id:"ifrs18-sa",code:"IFRS 18",title:"العرض والإفصاح في القوائم المالية",decisionDate:"2024-12-26",effective:"2027-01-01",earlyApplication:true,status:"معتمد في السعودية",note:"اعتمدته الهيئة السعودية للمراجعين والمحاسبين مع السماح بالتطبيق المبكر. يبدأ التطبيق الإلزامي للفترات السنوية التي تبدأ في أو بعد 1 يناير 2027.",source:"SOCPA / IFRS Foundation"},
  {id:"ifrs19-sa",code:"IFRS 19",title:"المنشآت التابعة غير الخاضعة للمساءلة العامة: الإفصاحات",decisionDate:"2024-12-26",effective:"2027-01-01",earlyApplication:true,status:"معتمد في السعودية",note:"يوفر إفصاحات مخفّضة للمنشآت التابعة المؤهلة مع بقاء متطلبات الاعتراف والقياس في معايير IFRS الأخرى.",source:"SOCPA / IFRS Foundation"},
  {id:"valuer-2025",code:"IAS 16 / IAS 40",title:"إلغاء المتطلب السعودي الإضافي للمقيّم المستقل",decisionDate:"2025-09-21",effective:"2025-09-21",earlyApplication:false,status:"قرار نافذ",note:"ألغت الهيئة متطلبها الإضافي السابق الذي كان يُلزم باستخدام مقيّم مستقل عند تطبيق إعادة التقييم أو القيمة العادلة. لا يعني ذلك إلغاء متطلبات القياس أو الحاجة إلى خبرة تقييم مناسبة بحسب الوقائع.",source:"SOCPA"},
  {id:"sme3-2025",code:"IFRS for SMEs",title:"النسخة الثالثة من معيار المنشآت الصغيرة والمتوسطة",decisionDate:"2025-12-24",effective:"حسب متطلبات الهيئة والإصدار",earlyApplication:false,status:"معتمد",note:"اعتمدت الهيئة النسخة الثالثة من معيار IFRS للمنشآت الصغيرة والمتوسطة في ديسمبر 2025.",source:"SOCPA"}
];
const PRO_GLOSSARY={
  "القيمة العادلة":"مفهوم قياس يعتمد على سعر معاملة سوقية منظمة بين مشاركين في السوق في تاريخ القياس. هذا شرح إرشادي مختصر؛ يُرجع للنص الرسمي للتعريف الدقيق.",
  "التكلفة المفترضة":"مبلغ يُستخدم كبديل للتكلفة أو التكلفة المستهلكة في تاريخ محدد وفق الحالات التي تسمح بها المعايير. شرح إرشادي مختصر.",
  "حق الاستخدام":"أصل يمثل حق المنشأة في استخدام أصل محل عقد إيجار خلال مدة الاستخدام، وفق متطلبات IFRS 16.",
  "التزام الأداء":"وعد في عقد مع عميل بنقل سلعة أو خدمة متميزة، أو مجموعة مؤهلة، وفق IFRS 15. شرح إرشادي مختصر.",
  "الخسائر الائتمانية المتوقعة":"قياس لخسائر الائتمان المتوقعة وفق IFRS 9 على أساس احتمالات وأوزان ومعلومات متاحة، وليس مجرد خسائر حدثت بالفعل. شرح إرشادي مختصر.",
  "الهبوط في القيمة":"انخفاض القيمة الدفترية للأصل عندما تتجاوز المبلغ القابل للاسترداد وفق المعيار المنطبق. شرح إرشادي مختصر.",
  "السيطرة":"مفهوم حاكم في التوحيد وتوقيت بعض المعالجات، ويختلف تطبيقه بحسب المعيار والسياق. يُرجع لتعريف المعيار ذي الصلة."
};
const PRO_DECISIONS={
  "IFRS 15":{
    title:"مسار إرشادي — الإيراد من العقود مع العملاء",
    disclaimer:"شجرة مساعدة وليست بديلاً عن قراءة العقد والنص الرسمي.",
    nodes:[
      {q:"هل يوجد عقد قابل للإنفاذ مع عميل وتتوفر معايير الاعتراف بالعقد؟",yes:1,no:"راجع شروط وجود العقد قبل الاعتراف بالإيراد."},
      {q:"هل حُددت السلع أو الخدمات الموعود بها والتزامات الأداء المتميزة؟",yes:2,no:"حدد التزامات الأداء قبل تخصيص سعر المعاملة."},
      {q:"هل حُدد سعر المعاملة، بما في ذلك العوض المتغير والقيود ذات الصلة؟",yes:3,no:"أعد تقييم سعر المعاملة والعوض المتغير."},
      {q:"هل تم تخصيص السعر على التزامات الأداء على أساس أسعار البيع المنفصلة المناسبة؟",yes:4,no:"نفّذ تخصيص سعر المعاملة وفق متطلبات IFRS 15."},
      {q:"هل انتقلت السيطرة أو استُوفي التزام الأداء على مدى الزمن/في نقطة زمنية بحسب الشروط؟",yes:"وثّق أساس توقيت الاعتراف بالإيراد وأدلة القطع الزمني.",no:"لا تُسجل الإيراد قبل استيفاء التزام الأداء وفق التحليل."}
    ]
  },
  "IFRS 16":{
    title:"مسار إرشادي — عقود الإيجار للمستأجر",
    disclaimer:"يلزم فحص العقد والوقائع والاستثناءات المحددة في المعيار.",
    nodes:[
      {q:"هل العقد يحتوي على أصل محدد وحق في التحكم في استخدامه خلال فترة؟",yes:1,no:"قد لا يكون العقد عقد إيجار ضمن IFRS 16؛ افحص عقد الخدمة/الترتيب."},
      {q:"هل ينطبق إعفاء عقد قصير الأجل أو أصل منخفض القيمة وتم اختيار السياسة المناسبة؟",yes:"وثّق الإعفاء والمصروف والسياسة المطبقة.",no:2},
      {q:"هل تم إثبات أصل حق الاستخدام والتزام الإيجار عند تاريخ البدء وقياسهما وفق المعيار؟",yes:3,no:"أعد احتساب القياس الأولي وتاريخ البدء."},
      {q:"هل عولجت الدفعات، سعر الخصم، إعادة القياس والتعديلات والإهلاك والفائدة بصورة متسقة؟",yes:"وثّق الاختبار وربط الأرصدة بالعقود والإفصاحات.",no:"حدد سبب الفرق واقترح قيد/إفصاح تصحيحي بعد التحقق."}
    ]
  },
  "IFRS 9":{
    title:"مسار إرشادي — الخسائر الائتمانية المتوقعة للذمم",
    disclaimer:"المسار لا يحل محل نموذج ECL الموثق أو تقدير الإدارة.",
    nodes:[
      {q:"هل الرصيد أصل مالي يقع ضمن نطاق نموذج الخسائر الائتمانية المتوقعة؟",yes:1,no:"حدد المعيار/النموذج المناسب للأصل أولاً."},
      {q:"هل تنطبق على الذمم التجارية/أصول العقود منهجية مبسطة أو تم اختيار منهج آخر صحيح؟",yes:2,no:2},
      {q:"هل يستخدم القياس معلومات تاريخية معدلة بالظروف الحالية والتوقعات المستقبلية المعقولة والقابلة للدعم؟",yes:3,no:"حدّث الافتراضات والمصفوفة ولا تعتمد على التاريخ فقط."},
      {q:"هل تمت مطابقة المخصص مع أعمار الذمم والتحصيلات اللاحقة والبيانات الائتمانية والإفصاحات؟",yes:"وثّق إعادة الاحتساب والحساسية والاستنتاج.",no:"اطلب بيانات داعمة وأعد احتساب المخصص قبل الاستنتاج."}
    ]
  },
  "IFRS 19":{
    title:"مسار إرشادي — أهلية الإفصاحات المخفّضة",
    disclaimer:"الأهلية تُحسم وفق النص الرسمي والهيكل الفعلي للمجموعة.",
    nodes:[
      {q:"هل المنشأة شركة تابعة في نهاية فترة التقرير؟",yes:1,no:"لا تستخدم IFRS 19 على أساس هذا المسار."},
      {q:"هل المنشأة لا تخضع للمساءلة العامة وفق تعريف المعيار؟",yes:2,no:"لا تكون مؤهلة للإفصاحات المخفّضة وفق IFRS 19."},
      {q:"هل لدى المنشأة أم نهائية أو وسيطة تُعد قوائم مالية موحدة متاحة للاستخدام العام ومتوافقة مع IFRS؟",yes:"قد تكون المنشأة مؤهلة؛ وثّق الأهلية وطبّق متطلبات الإفصاح المخفّضة مع بقاء الاعتراف والقياس وفق IFRS الأخرى.",no:"راجع شروط الأهلية في النص الرسمي قبل استخدام IFRS 19."}
    ]
  }
};
const PRO_SYNONYMS=[
  ["الهبوط في القيمة","الهبوط","اضمحلال","انخفاض القيمة","impairment"],
  ["استهلاك","اهلاك","إهلاك","depreciation"],
  ["إطفاء","اطفاء","amortization"],
  ["الخسائر الائتمانية المتوقعة","خسائر ائتمانية","مخصص ائتماني","ecl"],
  ["القيمة العادلة","fair value"],
  ["التكلفة المفترضة","deemed cost"],
  ["عقد إيجار","عقود الإيجار","ايجار","إيجار","حق الاستخدام","التزام إيجار"],
  ["الإيراد","الايراد","إيرادات","ايرادات","revenue"],
  ["الذمم المدينة","العملاء","مدينون","receivables"],
  ["المخزون","البضاعة","inventory"],
  ["منافع الموظفين","نهاية الخدمة","مكافأة نهاية الخدمة","employee benefits"]
];
const BOILER_MARKERS=[
  /30\s+Cannon\s+Street/i,/IFRS Foundation Publications Department/i,/Tel:\s*\+44/i,/Fax:\s*\+44/i,
  /Email:\s*[^\s]+@ifrs\.org/i,/Web:\s*www\.ifrs\.org/i,/رقم\s+ردمك/i,/جميع الحقوق محفوظة/i,
  /حق(?:وق)?\s+التأليف\s+والنشر/i,/العلامات\s+التجارية/i,/إخلاء\s+المسؤولية/i
];

function pjson(v,status=200,extra={}){return new Response(JSON.stringify(v),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}})}
function western(s){return String(s||"").replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660)).replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0))}
function displayClean(s){
  let t=String(s||"").normalize("NFKC").replace(/[\u202A-\u202E\u2066-\u2069]/g,"").replace(/\u0640/g,"");
  t=t.replace(/[\t\r]+/g," ").replace(/[ ]{2,}/g," ").replace(/\s+([،؛:؟!])/g,"$1").replace(/([،؛:؟!])(?=[^\s])/g,"$1 ");
  t=t.replace(/\(\s+/g,"(").replace(/\s+\)/g,")").replace(/\[\s+/g,"[").replace(/\s+\]/g,"]").trim();
  return t;
}
function norm(s){
  return western(displayClean(s)).toLowerCase().replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
}
function isBoiler(s){const t=String(s||"");return BOILER_MARKERS.some(r=>r.test(t))}
function extractPara(text){
  const t=displayClean(text);
  const m=t.match(/^(?:الفقرة\s*)?[\(\[]?([0-9٠-٩]+(?:[.\-–][0-9٠-٩]+)*(?:\s*[أ-ي])?)[\)\].:\-–]?\s+(?=\S)/);
  if(!m)return {paragraphNo:null,content:t};
  const w=western(m[1]).trim(),n=Number(w);
  if(/^\d{4}$/.test(w)&&n>=1900&&n<=2100)return {paragraphNo:null,content:t};
  return {paragraphNo:w,content:t.slice(m[0].length).trim()};
}
function refsFrom(s){
  const text=western(displayClean(s)),out=new Set();let m;
  const en=/\b(IFRS|IAS|ISA)\s*([0-9]{1,3})\b/gi;
  while((m=en.exec(text)))out.add(m[1].toUpperCase()+" "+m[2]);
  const ar1=/(?:المعيار\s+الدولي\s+للتقرير\s+المالي|معيار\s+التقرير\s+المالي\s+الدولي)\s*(?:رقم)?\s*([0-9]{1,3})/g;
  while((m=ar1.exec(text)))out.add("IFRS "+m[1]);
  const ar2=/(?:معيار\s+المحاسبة\s+الدولي|معيار\s+المحاسبه\s+الدولي)\s*(?:رقم)?\s*([0-9]{1,3})/g;
  while((m=ar2.exec(text)))out.add("IAS "+m[1]);
  const ar3=/(?:معيار\s+المراجعة\s+الدولي|معيار\s+المراجعه\s+الدولي)\s*(?:رقم)?\s*([0-9]{1,3})/g;
  while((m=ar3.exec(text)))out.add("ISA "+m[1]);
  return [...out];
}
function standardCodeFrom(title,name){
  const t=western(String(title||"")+" "+String(name||""));
  const m=t.match(/\b(IFRS|IAS|ISA)\s*([0-9]{1,3})\b/i);
  if(m)return m[1].toUpperCase()+" "+m[2];
  let a=t.match(/(?:المعيار\s+الدولي\s+للتقرير\s+المالي|معيار\s+التقرير\s+المالي\s+الدولي)\s*(?:رقم)?\s*([0-9]{1,3})/);if(a)return "IFRS "+a[1];
  a=t.match(/معيار\s+المحاسبة\s+الدولي\s*(?:رقم)?\s*([0-9]{1,3})/);if(a)return "IAS "+a[1];
  return "";
}
function qualityFlags(s){
  const t=String(s||""),flags=[];
  if(/[\u202A-\u202E\u2066-\u2069]/.test(t))flags.push("bidi-control-removed");
  if((t.match(/[()]/g)||[]).length>8 && (t.match(/\)/g)||[]).length!==(t.match(/\(/g)||[]).length)flags.push("unbalanced-parentheses");
  if(/[A-Za-z]\s+[أ-ي]{2,}\s+[A-Za-z]/.test(t))flags.push("mixed-direction-review");
  return flags;
}
function typeBlock(rawType,content,inAmendment){
  const t=displayClean(content),n=norm(t);
  if(rawType==="h")return "heading";
  if(inAmendment||markerSocpa(t))return "amendment";
  if(/^(مثال|مثال توضيحي|تطبيق عملي)\b/.test(n))return "example";
  if(/^(?:[•\-–]\s+|[أ-ي]\s*[\)\-–.:]\s+|\d{1,2}\s*[\)\-–]\s+)/.test(t))return "list_item";
  if((t.includes("\t")||t.includes("|"))&&t.length>25)return "table";
  const rr=refsFrom(t); if(rr.length&&t.length<180&&/(راجع|انظر|وفقا|وفقاً|طبقا|طبقاً|كما ورد)/.test(n))return "cross_ref";
  return "paragraph";
}
async function sf(env,path){
  if(!env?.STANDARDS)throw new Error("STANDARDS binding unavailable");
  const u=new URL("https://standards.internal"+path);
  const r=await env.STANDARDS.fetch(new Request(u.toString(),{headers:{"accept":"*/*"}}));
  if(!r.ok)throw new Error("standards source HTTP "+r.status+" "+path);
  return r;
}
async function sj(env,path){const r=await sf(env,path);const ct=r.headers.get("content-type")||"";const text=await r.text();if(!/json/i.test(ct)&&!/^\s*[\[{]/.test(text))throw new Error("invalid JSON source "+path);return JSON.parse(text)}
async function library(env){if(!PRO_LIBRARY_PROMISE)PRO_LIBRARY_PROMISE=sj(env,"/data/library.json").catch(e=>{PRO_LIBRARY_PROMISE=null;throw e});return PRO_LIBRARY_PROMISE}
async function indexData(env){
  if(!PRO_INDEX_PROMISE)PRO_INDEX_PROMISE=(async()=>{const r=await sf(env,"/data/search-index.json.gz");let text;try{text=await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text()}catch(e){const r2=await sf(env,"/data/search-index.json.gz");text=await r2.text()}return JSON.parse(text)})().catch(e=>{PRO_INDEX_PROMISE=null;throw e});
  return PRO_INDEX_PROMISE;
}
async function bookSummary(env,id){return sj(env,"/data/"+encodeURIComponent(id)+".json")}
async function rawChapter(env,id,no){return sj(env,"/data/"+encodeURIComponent(id)+"/"+encodeURIComponent(no)+".json")}
function metaBook(list,id){return (Array.isArray(list)?list:[]).find(x=>String(x.id)===String(id))||null}
function roleFor(m){if(m?.id==="b3")return "مرجع رسمي أحدث";if(m?.id==="b1")return "مرجع رسمي سابق";if(m?.id==="b4"||m?.kind==="development")return "تطوير — ليس سندًا مهنيًا";return "مرجع تدريبي/مساند"}
function objectiveFrom(blocks){
  let afterObjective=false;
  for(const b of blocks){if(b.type==="heading"&&/الهدف/.test(norm(b.content))){afterObjective=true;continue}if(afterObjective&&b.type!=="heading"&&b.content.length>30)return b.content.slice(0,320)}
  const x=blocks.find(b=>b.type!=="heading"&&b.content.length>30);return x?x.content.slice(0,320):"";
}
function transformChapter(raw,bookMeta,bookId){
  const body=Array.isArray(raw?.body)?raw.body:[],blocks=[];let inAmendment=false,order=0;
  for(const pair of body){
    const rt=Array.isArray(pair)?String(pair[0]||"p"):"p",orig=Array.isArray(pair)?String(pair[1]||""):String(pair||"");
    if(!orig.trim()||isBoiler(orig))continue;
    const cleaned=displayClean(orig);if(!cleaned)continue;
    if(rt==="h"){
      const hn=norm(cleaned);
      if(["تعديل","إضافة","اعتماد الهيئة","التعديلات السعودية","التعديلات المدخلة"].some(x=>hn.includes(norm(x))))inAmendment=true;
      else if(/^(الهدف|النطاق|الاعتراف|القياس|العرض|الافصاح|التعاريف)/.test(hn))inAmendment=false;
    }
    const ex=extractPara(cleaned),type=typeBlock(rt,ex.content,inAmendment),refs=refsFrom(ex.content);
    blocks.push({id:(bookId||"book")+"-c"+String(raw?.no||0)+"-b"+(++order),type,order,paragraphNo:ex.paragraphNo,content:ex.content,isSocpaCustom:type==="amendment"||markerSocpa(cleaned),tags:tagText(ex.content),references:refs,qualityFlags:qualityFlags(orig)});
  }
  const pages=Array.isArray(raw?.pages)?raw.pages.filter(x=>Number.isFinite(+x)).map(Number):[];
  const text=blocks.map(x=>x.content).join(" ");
  return {schemaVersion:2,id:(bookId||"book")+"-c"+String(raw?.no||0),bookId,no:+raw?.no||0,standardCode:standardCodeFrom(raw?.title,raw?.name),title:displayClean(raw?.title||raw?.name||("الفصل "+String(raw?.no||""))),subtitle:displayClean(raw?.name||""),objectiveKey:displayClean(raw?.key||"")||objectiveFrom(blocks),pageRange:pages.length?[pages[0],pages[pages.length-1]]:null,wordCount:+raw?.words||text.split(/\s+/).filter(Boolean).length,edition:String(bookMeta?.year||bookMeta?.edition||""),role:roleFor(bookMeta),blocks};
}
function tagText(s){
  const n=norm(s),tags=[];
  const map=[["قياس",["قياس","القيمه العادله","تكلفه"]],["إفصاح",["افصاح","عرض القوائم"]],["اعتراف",["اعتراف","اثبات"]],["إيراد",["ايراد","عميل","التزام الاداء"]],["ائتمان",["ائتمان","ecl","تعثر"]],["إيجار",["ايجار","حق الاستخدام"]],["مخزون",["مخزون","صافي القيمه القابله للتحقق"]],["SOCPA",["الهيئه السعوديه","تعديل الهيئه"]]];
  for(const [tag,terms] of map)if(terms.some(x=>n.includes(norm(x))))tags.push(tag);return tags;
}
function expansionTerms(q){
  const nq=norm(q),out=new Set(nq.split(" ").filter(x=>x.length>1));
  for(const group of PRO_SYNONYMS){if(group.some(x=>nq.includes(norm(x))))for(const x of group)out.add(norm(x))}
  return [...out].filter(Boolean).slice(0,30);
}
function markerSocpa(s){const n=norm(s);return ["الهيئة السعودية","SOCPA","اعتمدت الهيئة","تعديل الهيئة","إضافة الهيئة","التعديلات المدخلة"].some(x=>n.includes(norm(x)))}
function scoreRecord(x,q,terms){
  const title=displayClean(x?.title||x?.name||""),text=displayClean(x?.text||""),all=norm(title+" "+text),nq=norm(q);let score=0;
  if(nq&&all.includes(nq))score+=40;
  for(const t of terms){if(!t)continue;if(norm(title).includes(t))score+=8;if(all.includes(t))score+=t.length>5?4:2}
  const code=nq.match(/\b(ifrs|ias|isa)\s*(\d+)/i);if(code&&all.includes(code[1]+" "+code[2]))score+=25;
  if(x?.kind==="official-latest"||x?.book==="b3")score+=5;else if(x?.kind==="official-legacy"||x?.book==="b1")score+=1;
  return score;
}
function snippetFor(text,q,terms,max=520){
  const t=displayClean(text).replace(/\s+/g," ");if(t.length<=max)return t;const nt=norm(t),nq=norm(q);let pos=nq?nt.indexOf(nq):-1;
  if(pos<0){for(const term of terms){const p=nt.indexOf(term);if(p>=0){pos=p;break}}}if(pos<0)pos=0;
  const st=Math.max(0,Math.min(t.length-max,pos-120));return (st?"…":"")+t.slice(st,st+max)+(st+max<t.length?"…":"");
}
async function fallbackProfessionalIndex(env){
  if(!PRO_FALLBACK_INDEX_PROMISE)PRO_FALLBACK_INDEX_PROMISE=(async()=>{const list=await library(env),bm=list.find(x=>String(x.id)==='b3')||list[0];if(!bm)return[];const sum=await bookSummary(env,bm.id),chs=Array.isArray(sum?.chapters)?sum.chapters:[],raws=await Promise.all(chs.slice(0,80).map(c=>rawChapter(env,bm.id,c.no).catch(()=>null))),out=[];for(const raw of raws){if(!raw)continue;const c=transformChapter(raw,bm,bm.id);for(const bl of c.blocks){if(!bl.content||bl.content.length<24)continue;out.push({book:bm.id,bookTitle:bm.title||sum.title||'مرجع المعايير',kind:'official-latest',no:c.no,title:c.title,name:c.subtitle,pages:c.pageRange?c.pageRange.filter(Number.isFinite):[],text:bl.content,paragraphNo:bl.paragraphNo||null})}}return out})().catch(e=>{PRO_FALLBACK_INDEX_PROMISE=null;throw e});return PRO_FALLBACK_INDEX_PROMISE
}
async function serviceProfessionalSearch(env,q,opt={}){
  if(!env?.STANDARDS||opt.socpa)return[];
  const u=new URL('https://standards.internal/api/search');u.searchParams.set('q',String(q||''));u.searchParams.set('book',String(opt.book||'b3'));u.searchParams.set('limit',String(Math.min(100,+opt.limit||50)));
  try{const r=await env.STANDARDS.fetch(new Request(u.toString(),{headers:{accept:'application/json'}}));if(!r.ok)return[];const d=await r.json();return Array.isArray(d?.hits)?d.hits:[]}catch(_){return[]}
}
async function professionalSearch(env,q,opt={}){
  q=displayClean(q);if(q.length<2)return[];let idx;try{idx=await indexData(env)}catch(_){const svc=await serviceProfessionalSearch(env,q,opt);if(Array.isArray(svc)&&svc.length)return svc;try{idx=await fallbackProfessionalIndex(env)}catch(__){idx=[]}}const terms=expansionTerms(q),list=await library(env),out=[];
  for(const x of Array.isArray(idx)?idx:[]){
    if(opt.book&&String(x.book||x.bookId||"")!==String(opt.book))continue;
    const raw=(x.title||"")+" "+(x.name||"")+" "+(x.text||"");if(isBoiler(raw))continue;
    const socpa=markerSocpa(raw);if(opt.socpa&& !socpa)continue;
    const score=scoreRecord(x,q,terms);if(score<=0)continue;
    const bm=metaBook(list,x.book||x.bookId);
    out.push({score,book:x.book||x.bookId||"",bookTitle:x.bookTitle||bm?.title||"",edition:String(bm?.year||bm?.edition||""),role:roleFor(bm),no:+x.no||0,title:displayClean(x.title||x.name||""),name:displayClean(x.name||""),pages:Array.isArray(x.pages)?x.pages:[],snippet:snippetFor(x.text||"",q,terms),references:refsFrom(raw),isSocpaCustom:socpa,tags:tagText(raw)});
  }
  out.sort((a,b)=>b.score-a.score||(a.role==="مرجع رسمي أحدث"?-1:1));
  const seen=new Set(),res=[];for(const h of out){const key=[h.book,h.no,h.snippet.slice(0,100)].join("|");if(seen.has(key))continue;seen.add(key);res.push(h);if(res.length>Math.min(100,+opt.limit||50))break}return res;
}
function tokenSimilarity(a,b){const A=new Set(norm(a).split(" ").filter(x=>x.length>2)),B=new Set(norm(b).split(" ").filter(x=>x.length>2));if(!A.size||!B.size)return 0;let i=0;for(const x of A)if(B.has(x))i++;return i/Math.max(A.size,B.size)}
function short(s,n=420){s=displayClean(s);return s.length>n?s.slice(0,n)+"…":s}
function diffBlocks(oldC,newC){
  const old=oldC.blocks.filter(x=>x.type!=="heading"),neu=newC.blocks.filter(x=>x.type!=="heading"),usedN=new Set(),changes=[];
  const paraMap=new Map();neu.forEach((b,i)=>{if(b.paragraphNo&&!paraMap.has(b.paragraphNo))paraMap.set(b.paragraphNo,i)});
  const unmatchedOld=[];
  for(const ob of old){
    let ni=ob.paragraphNo?paraMap.get(ob.paragraphNo):undefined;
    if(ni!==undefined&&!usedN.has(ni)){usedN.add(ni);const nb=neu[ni];if(norm(ob.content)!==norm(nb.content))changes.push({type:"changed",paragraphNo:ob.paragraphNo||nb.paragraphNo,old:short(ob.content),new:short(nb.content),oldType:ob.type,newType:nb.type,similarity:+tokenSimilarity(ob.content,nb.content).toFixed(2)});}
    else unmatchedOld.push(ob);
  }
  const unmatchedNew=neu.map((b,i)=>({b,i})).filter(x=>!usedN.has(x.i));
  const remainingNew=new Set(unmatchedNew.map(x=>x.i));
  for(const ob of unmatchedOld){
    let best=null;for(const {b,i} of unmatchedNew){if(!remainingNew.has(i))continue;const sim=tokenSimilarity(ob.content,b.content);if(sim>=0.45&&(!best||sim>best.sim))best={b,i,sim}}
    if(best){remainingNew.delete(best.i);changes.push({type:"changed",paragraphNo:ob.paragraphNo||best.b.paragraphNo||null,old:short(ob.content),new:short(best.b.content),oldType:ob.type,newType:best.b.type,similarity:+best.sim.toFixed(2)})}
    else changes.push({type:"removed",paragraphNo:ob.paragraphNo||null,old:short(ob.content),new:null,oldType:ob.type});
  }
  for(const {b,i} of unmatchedNew)if(remainingNew.has(i))changes.push({type:"added",paragraphNo:b.paragraphNo||null,old:null,new:short(b.content),newType:b.type});
  const counts={added:changes.filter(x=>x.type==="added").length,removed:changes.filter(x=>x.type==="removed").length,changed:changes.filter(x=>x.type==="changed").length};
  return {counts,changes:changes.slice(0,100),truncated:changes.length>100};
}
async function matchChapter(env,oldBook,newBook,no){
  const [os,ns]=await Promise.all([bookSummary(env,oldBook),bookSummary(env,newBook)]),oa=(os?.chapters||[]),na=(ns?.chapters||[]);
  const om=oa.find(x=>+x.no===+no)||oa[0];if(!om)throw new Error("old chapter not found");
  let nm=na.find(x=>+x.no===+no);
  const target=(om.title||om.name||"");if(!nm||tokenSimilarity(target,nm.title||nm.name||"")<0.25){let best=null;for(const x of na){const sim=tokenSimilarity(target,x.title||x.name||"");if(!best||sim>best.sim)best={x,sim}}if(best&&best.sim>=0.2)nm=best.x}
  if(!nm)throw new Error("matching chapter not found");
  return {oldMeta:om,newMeta:nm};
}
async function makeCitation(env,book,no,paragraph){
  const list=await library(env),bm=metaBook(list,book),raw=await rawChapter(env,book,no),c=transformChapter(raw,bm,book);
  let block=null;if(paragraph)block=c.blocks.find(x=>String(x.paragraphNo||"")===String(paragraph));
  const pg=c.pageRange?(c.pageRange[0]===c.pageRange[1]?"ص "+c.pageRange[0]:"ص "+c.pageRange[0]+"–"+c.pageRange[1]):"الصفحات غير محددة";
  const parts=[bm?.title||"مرجع المعايير",c.standardCode||c.title,block?.paragraphNo?"الفقرة "+block.paragraphNo:null,String(bm?.year||bm?.edition||"")?("طبعة "+String(bm?.year||bm?.edition)) : null,pg].filter(Boolean);
  return {citation:parts.join("، ")+".",book:book,chapterNo:c.no,paragraphNo:block?.paragraphNo||null,pageRange:c.pageRange,edition:String(bm?.year||bm?.edition||""),role:roleFor(bm),note:block?"تم تحديد الفقرة من بنية النص المحولة.":"استشهاد على مستوى الفصل/المعيار؛ لم يُحدد رقم فقرة."};
}
async function radar(env,q=""){
  let detected=[];try{detected=await professionalSearch(env,q||"الهيئة السعودية تعديل إضافة",{socpa:true,limit:25})}catch(_){}
  return {verifiedAt:"2026-08-16",updates:PRO_UPDATES,detectedLocalAmendments:detected.slice(0,25),warning:"التعديلات المكتشفة نصياً تحتاج ربطاً بالفقرة الرسمية قبل استخدامها كاستنتاج نهائي."};
}
export async function professionalContext(query,env){
  const hits=await professionalSearch(env,String(query||""),{limit:7}).catch(()=>[]);if(!hits.length)return "";
  const lines=hits.slice(0,7).map((h,i)=>{const pg=h.pages?.length?("ص "+h.pages[0]+(h.pages.length>1?"–"+h.pages[h.pages.length-1]:"")):"";return "["+(i+1)+"] "+(h.bookTitle||h.book)+" | "+h.role+(h.edition?" "+h.edition:"")+" | "+(h.title||("فصل "+h.no))+(pg?" | "+pg:"")+"\n"+h.snippet});
  return "سياق مهني مسترجع من مكتبة المعايير الداخلية. استخدم المرجع الرسمي الأحدث عند التعارض، ولا تخترع رقم فقرة أو صفحة غير موجود في السياق:\n\n"+lines.join("\n\n");
}
function metaResponse(list){
  return {schemaVersion:2,engine:"Tamhees Professional Standards Layer",version:PRO_VERSION,architecture:{storage:"library.zip + chapter lazy loading + compressed search index",databaseMigration:"not-required-now",fullTextIndex:"existing compressed index",notes:"لم يتم عكس الجمل العربية آلياً؛ تُزال محارف BiDi وتُعلّم الحالات المشكوك فيها للمراجعة البشرية."},books:(Array.isArray(list)?list:[]).map(m=>({id:m.id,title:m.title||"",edition:String(m.year||m.edition||""),chapters:+m.chapters||0,words:+m.words||0,role:roleFor(m)})),blockTypes:["heading","paragraph","amendment","list_item","example","table","cross_ref"]};
}
export async function handleProfessionalUpgrade(req,env){
  const u=new URL(req.url),p=u.pathname;if(!p.startsWith("/api/standards/v2/"))return null;
  try{
    if(p==="/api/standards/v2/meta"&&req.method==="GET")return pjson(metaResponse(await library(env)));
    if(p==="/api/standards/v2/search"&&req.method==="GET"){const q=u.searchParams.get("q")||"",book=u.searchParams.get("book")||"",socpa=u.searchParams.get("socpa")==="1";return pjson({query:q,hits:await professionalSearch(env,q,{book,socpa,limit:+u.searchParams.get("limit")||50})})}
    if(p==="/api/standards/v2/cite"&&req.method==="GET"){const book=u.searchParams.get("book")||"b3",no=+u.searchParams.get("no")||1,paragraph=u.searchParams.get("paragraph")||"";return pjson(await makeCitation(env,book,no,paragraph))}
    if(p==="/api/standards/v2/diff"&&req.method==="GET"){const oldBook=u.searchParams.get("old")||"b1",newBook=u.searchParams.get("new")||"b3",no=+u.searchParams.get("no")||1,list=await library(env),match=await matchChapter(env,oldBook,newBook,no),[oraw,nraw]=await Promise.all([rawChapter(env,oldBook,match.oldMeta.no),rawChapter(env,newBook,match.newMeta.no)]),oc=transformChapter(oraw,metaBook(list,oldBook),oldBook),nc=transformChapter(nraw,metaBook(list,newBook),newBook);return pjson({old:{book:oldBook,edition:oc.edition,no:oc.no,title:oc.title},new:{book:newBook,edition:nc.edition,no:nc.no,title:nc.title},...diffBlocks(oc,nc)})}
    if(p==="/api/standards/v2/radar"&&req.method==="GET")return pjson(await radar(env,u.searchParams.get("q")||""));
    if(p==="/api/standards/v2/decision"&&req.method==="GET"){const s=(u.searchParams.get("standard")||"IFRS 15").toUpperCase();return pjson({standard:s,tree:PRO_DECISIONS[s]||null,available:Object.keys(PRO_DECISIONS)})}
    if(p==="/api/standards/v2/glossary"&&req.method==="GET"){const q=norm(u.searchParams.get("q")||"");const entries=Object.entries(PRO_GLOSSARY).filter(([k])=>!q||norm(k).includes(q)||q.includes(norm(k))).map(([term,definition])=>({term,definition,paraphrase:true}));return pjson({entries:entries.length?entries:Object.entries(PRO_GLOSSARY).map(([term,definition])=>({term,definition,paraphrase:true}))})}
    if(p==="/api/standards/v2/context"&&req.method==="POST"){const b=await req.json().catch(()=>({}));return pjson({context:await professionalContext(b.query||b.text||"",env)})}
    return pjson({error:"not_found"},404);
  }catch(e){return pjson({error:String(e?.message||e),version:PRO_VERSION},500)}
}
const PRO_STYLE='<style id="tamhees-professional-v2-css">#pro-v2{margin-top:18px}.pro-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px}.pro-tabs button{border:1px solid var(--line2,#ccd5cf);background:#fff;color:var(--pine,#0e3b30);border-radius:999px;padding:7px 12px;font-weight:700}.pro-tabs button.on{background:var(--pine,#0e3b30);color:#fff}.pro-pane{display:none}.pro-pane.on{display:block}.pro-searchbar{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:8px}.pro-searchbar input,.pro-searchbar select,.pro-mini-input{border:1px solid var(--line2,#ccd5cf);border-radius:9px;padding:9px 11px;background:#fff}.pro-results{display:grid;gap:9px;margin-top:12px}.pro-hit,.pro-update,.pro-change,.pro-saved{border:1px solid var(--line,#dce3db);border-radius:12px;padding:12px 13px;background:#fff}.pro-hit h4,.pro-update h4{margin:0 0 5px;color:var(--pine,#0e3b30)}.pro-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:11px;color:#66736b;margin-bottom:6px}.pro-tag{display:inline-flex;border:1px solid #d8bf89;background:#f6eedc;color:#76571e;border-radius:999px;padding:2px 7px}.pro-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.pro-actions button,.pro-actions a{border:1px solid var(--line2,#ccd5cf);background:#fff;color:var(--pine,#0e3b30);border-radius:8px;padding:6px 9px;font-size:12px;font-weight:700;text-decoration:none}.pro-diff{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pro-old{background:#fff5f2}.pro-new{background:#f0faf5}.pro-radar-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:9px}.pro-term{border-bottom:1px dotted #8b6523;cursor:help}.pro-note{font-size:12px;color:#5c6b62}.pro-tree-q{font-weight:800;margin-bottom:10px}.pro-tree-actions{display:flex;gap:8px}.pro-tree-actions button{border:0;border-radius:9px;padding:8px 15px;font-weight:800}.pro-yes{background:#0d785d;color:#fff}.pro-no{background:#f6eedc;color:#6f531f}.pro-badge{font-size:10px;border-radius:999px;padding:2px 7px;background:#e6efe9;color:#154d3e}.pro-status{padding:10px;border-radius:9px;background:#f8faf8;margin:8px 0}.pro-memo textarea{width:100%;min-height:90px;border:1px solid var(--line2,#ccd5cf);border-radius:9px;padding:9px}@media(max-width:700px){.pro-searchbar{grid-template-columns:1fr}.pro-diff{grid-template-columns:1fr}}</style>';
const PRO_SCRIPT='<script id="tamhees-professional-v2-js">/* TAMHEES_PROFESSIONAL_V2 */(function(){var P="/api/standards/v2/";function e(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function api(path,opt){var r=await fetch(P+path,opt),j=await r.json().catch(function(){return{}});if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j}function el(id){return document.getElementById(id)}function setupDb(){return new Promise(function(res,rej){var q=indexedDB.open("tamhees-professional-v2",1);q.onupgradeneeded=function(){var d=q.result;if(!d.objectStoreNames.contains("saved"))d.createObjectStore("saved",{keyPath:"id"})};q.onsuccess=function(){res(q.result)};q.onerror=function(){rej(q.error)}})}async function save(x){var d=await setupDb(),t=d.transaction("saved","readwrite");t.objectStore("saved").put(x);return new Promise(function(r){t.oncomplete=r})}async function allSaved(){var d=await setupDb(),t=d.transaction("saved","readonly"),q=t.objectStore("saved").getAll();return new Promise(function(r){q.onsuccess=function(){r(q.result||[])}})}function patchDb(){try{if(typeof STD_DB==="object"){if(STD_DB["IFRS 18"])STD_DB["IFRS 18"].b="يستبدل IAS 1 ويضيف فئات محددة في قائمة الربح أو الخسارة: التشغيل والاستثمار والتمويل وضرائب الدخل والعمليات غير المستمرة، مع متطلبات لمقاييس أداء الإدارة والإفصاحات ذات الصلة. يسري إلزامياً للفترات التي تبدأ في أو بعد 1 يناير 2027 مع السماح بالتطبيق المبكر.";if(STD_DB["IFRS 19"])STD_DB["IFRS 19"].b="إفصاحات مخفّضة للمنشآت التابعة المؤهلة، مع بقاء متطلبات الاعتراف والقياس في معايير IFRS الأخرى. يسري للفترات التي تبدأ في أو بعد 1 يناير 2027 مع السماح بالتطبيق المبكر.";STD_DB["IFRS for SMEs 2025"]={cat:"LOCAL",t:"المعيار الدولي للتقرير المالي للمنشآت الصغيرة والمتوسطة — النسخة الثالثة المعتمدة",b:"نسخة ثالثة اعتمدتها SOCPA في ديسمبر 2025؛ يجب تحديد تاريخ التطبيق والسياسات الانتقالية وفق الإصدار والقرارات المعتمدة."};if(STD_DB["IAS 16"])STD_DB["IAS 16"].b=String(STD_DB["IAS 16"].b||"")+" ملاحظة سعودية: أُلغي في 21 سبتمبر 2025 المتطلب الإضافي السابق الذي كان يلزم بمقيّم مستقل؛ لا يلغي ذلك متطلبات القياس والخبرة المهنية المناسبة.";if(STD_DB["IAS 40"])STD_DB["IAS 40"].b=String(STD_DB["IAS 40"].b||"")+" ملاحظة سعودية: أُلغي في 21 سبتمبر 2025 المتطلب الإضافي السابق الخاص بإلزام المقيّم المستقل."}}catch(_){}}function patchChecks(){try{if(typeof runPrechecks!=="function"||runPrechecks.__pro2)return;var old=runPrechecks;runPrechecks=function(accs){var r=old(accs)||[],has=function(id){return(accs||[]).some(function(a){return a.ruleId===id})};if(has("contractasset")||has("rev"))r.push({sev:"info",t:"اختبار IFRS 15 — توقيت الإيراد",d:"مؤشر فحص وليس تحريفاً تلقائياً: اربط الإيراد وأصول/التزامات العقود بالتزامات الأداء وانتقال السيطرة واختبارات القطع الزمني."});if(has("inv"))r.push({sev:"info",t:"اختبار IAS 2 — صافي القيمة القابلة للتحقق",d:"اختبر NRV باستخدام أسعار البيع اللاحقة والتكاليف اللازمة للإتمام والبيع، ولا تفترض وجود هبوط لمجرد وجود مخزون."});try{var y=Number((String(state&&state.entity&&state.entity.period||"").match(/20\\d{2}/)||[])[0]);if(y>=2027)r.push({sev:"info",t:"جاهزية IFRS 18",d:"الفترة تقع في نطاق التطبيق الإلزامي المتوقع لـ IFRS 18؛ اختبر هيكل قائمة الربح أو الخسارة والفئات المحددة ومقاييس أداء الإدارة والإفصاحات."})}catch(_){}return r};runPrechecks.__pro2=true}catch(_){}}function shell(){var v=el("view-library");if(!v||el("pro-v2"))return;var d=document.createElement("div");d.id="pro-v2";d.className="card";d.innerHTML="<div class=\\"card-h\\"><h2>المركز المهني للمعايير</h2><span class=\\"badge gold\\">Schema v2</span><span class=\\"hint\\">بحث محاسبي · استشهاد · مقارنة طبعات · رادار SOCPA · شجرة قرار</span></div><div class=\\"pro-tabs\\"><button class=\\"on\\" data-pro-tab=\\"search\\">بحث مهني</button><button data-pro-tab=\\"radar\\">رادار SOCPA</button><button data-pro-tab=\\"diff\\">مقارنة 2018 / 2025</button><button data-pro-tab=\\"decision\\">شجرة القرار</button><button data-pro-tab=\\"memo\\">مذكرة فنية</button></div><div id=\\"pro-search\\" class=\\"pro-pane on\\"><div class=\\"pro-searchbar\\"><input id=\\"pro-q\\" placeholder=\\"مثال: الهبوط في القيمة، ECL، IFRS 15…\\"><select id=\\"pro-book\\"><option value=\\"\\">كل المراجع</option></select><label style=\\"display:flex;align-items:center;gap:5px\\"><input id=\\"pro-socpa\\" type=\\"checkbox\\"> تعديلات سعودية فقط</label></div><div id=\\"pro-search-state\\" class=\\"pro-note\\"></div><div id=\\"pro-results\\" class=\\"pro-results\\"></div></div><div id=\\"pro-radar\\" class=\\"pro-pane\\"><div id=\\"pro-radar-body\\" class=\\"pro-radar-grid\\"></div></div><div id=\\"pro-diff\\" class=\\"pro-pane\\"><div class=\\"pro-searchbar\\"><input id=\\"pro-diff-no\\" type=\\"number\\" min=\\"1\\" value=\\"1\\" placeholder=\\"رقم الفصل\\"><button class=\\"btn primary sm\\" id=\\"pro-run-diff\\">قارن الطبعتين</button><span class=\\"pro-note\\">تطابق الفقرات برقم الفقرة ثم تشابه النص، ولا يعتبر الاختلاف حكماً معيارياً بذاته.</span></div><div id=\\"pro-diff-body\\" class=\\"pro-results\\"></div></div><div id=\\"pro-decision\\" class=\\"pro-pane\\"><div class=\\"pro-searchbar\\"><select id=\\"pro-decision-standard\\"><option>IFRS 15</option><option>IFRS 16</option><option>IFRS 9</option><option>IFRS 19</option></select><button class=\\"btn primary sm\\" id=\\"pro-start-tree\\">ابدأ المسار</button><span></span></div><div id=\\"pro-tree-body\\" class=\\"pro-status\\"></div></div><div id=\\"pro-memo\\" class=\\"pro-pane pro-memo\\"><textarea id=\\"pro-memo-subject\\" placeholder=\\"موضوع المذكرة/المعاملة المحاسبية…\\"></textarea><div class=\\"pro-actions\\"><button id=\\"pro-refresh-saved\\">تحديث المراجع المحفوظة</button><button id=\\"pro-export-word\\">تصدير Word (.doc)</button><button id=\\"pro-print-memo\\">طباعة / PDF</button></div><div id=\\"pro-saved\\" class=\\"pro-results\\"></div></div>";v.prepend(d);d.querySelectorAll("[data-pro-tab]").forEach(function(b){b.onclick=function(){d.querySelectorAll("[data-pro-tab]").forEach(function(x){x.classList.toggle("on",x===b)});d.querySelectorAll(".pro-pane").forEach(function(x){x.classList.toggle("on",x.id==="pro-"+b.dataset.proTab)});if(b.dataset.proTab==="radar")loadRadar();if(b.dataset.proTab==="memo")renderSaved()}});loadMeta();bindSearch();el("pro-run-diff").onclick=runDiff;el("pro-start-tree").onclick=startTree;el("pro-refresh-saved").onclick=renderSaved;el("pro-export-word").onclick=exportWord;el("pro-print-memo").onclick=printMemo}async function loadMeta(){try{var m=await api("meta"),s=el("pro-book");(m.books||[]).forEach(function(b){var o=document.createElement("option");o.value=b.id;o.textContent=(b.edition?b.edition+" · ":"")+b.title+" — "+b.role;s.appendChild(o)})}catch(_){}}function bindSearch(){var q=el("pro-q"),timer;function go(){clearTimeout(timer);timer=setTimeout(search,250)}q.addEventListener("input",go);el("pro-book").onchange=search;el("pro-socpa").onchange=search}async function search(){var q=el("pro-q").value.trim();if(q.length<2){el("pro-results").innerHTML="";el("pro-search-state").textContent="";return}el("pro-search-state").textContent="جارٍ البحث في الفهرس المهني…";try{var u="search?q="+encodeURIComponent(q)+"&book="+encodeURIComponent(el("pro-book").value)+"&socpa="+(el("pro-socpa").checked?"1":"0")+"&limit=40",j=await api(u);el("pro-search-state").textContent=(j.hits||[]).length+" نتيجة";el("pro-results").innerHTML=(j.hits||[]).map(function(h,i){var pg=h.pages&&h.pages.length?("ص "+h.pages[0]+(h.pages.length>1?"–"+h.pages[h.pages.length-1]:"")):"";return"<div class=\\"pro-hit\\" data-i=\\""+i+"\\"><div class=\\"pro-meta\\"><span class=\\"pro-tag\\">"+e(h.role)+"</span><span>"+e(h.edition)+"</span><span>"+e(pg)+"</span>"+(h.isSocpaCustom?"<span class=\\"pro-tag\\">SOCPA</span>":"")+"</div><h4>"+e(h.title||("فصل "+h.no))+"</h4><div>"+e(h.snippet)+"</div><div class=\\"pro-meta\\">"+(h.references||[]).map(function(r){return"<button class=\\"pro-ref\\" data-r=\\""+e(r)+"\\">"+e(r)+"</button>"}).join(" ")+"</div><div class=\\"pro-actions\\"><button data-cite=\\""+i+"\\">نسخ الاستشهاد</button><button data-save=\\""+i+"\\">حفظ للمذكرة</button><a href=\\"/library?open=1\\" target=\\"_blank\\">فتح الكتب</a></div></div>"}).join("");el("pro-results").querySelectorAll("[data-cite]").forEach(function(b){b.onclick=function(){cite(j.hits[+b.dataset.cite])}});el("pro-results").querySelectorAll("[data-save]").forEach(function(b){b.onclick=function(){saveHit(j.hits[+b.dataset.save])}});el("pro-results").querySelectorAll(".pro-ref").forEach(function(b){b.onclick=function(){q.value=b.dataset.r;search()}})}catch(x){el("pro-search-state").textContent="تعذر البحث: "+x.message}}async function cite(h){try{var j=await api("cite?book="+encodeURIComponent(h.book)+"&no="+encodeURIComponent(h.no));await navigator.clipboard.writeText(j.citation);if(typeof toast==="function")toast("تم نسخ الاستشهاد","ok")}catch(x){if(typeof toast==="function")toast("تعذر إنشاء الاستشهاد: "+x.message,"danger")}}async function saveHit(h){var id=[h.book,h.no,Date.now()].join("-");await save({id:id,createdAt:new Date().toISOString(),hit:h});if(typeof toast==="function")toast("تم حفظ المرجع للمذكرة","ok")}async function loadRadar(){var b=el("pro-radar-body");b.innerHTML="جارٍ تحميل التحديثات…";try{var j=await api("radar");b.innerHTML=(j.updates||[]).map(function(x){return"<div class=\\"pro-update\\"><div class=\\"pro-meta\\"><span class=\\"pro-tag\\">"+e(x.status)+"</span><span>قرار "+e(x.decisionDate)+"</span><span>سريان "+e(x.effective)+"</span></div><h4>"+e(x.code)+" — "+e(x.title)+"</h4><p>"+e(x.note)+"</p><small>"+e(x.source)+"</small></div>"}).join("")}catch(x){b.textContent="تعذر تحميل الرادار: "+x.message}}async function runDiff(){var b=el("pro-diff-body"),n=el("pro-diff-no").value||1;b.innerHTML="جارٍ المقارنة…";try{var j=await api("diff?old=b1&new=b3&no="+encodeURIComponent(n));b.innerHTML="<div class=\\"pro-status\\"><b>"+e(j.old.edition||"قديم")+" ← "+e(j.new.edition||"أحدث")+"</b> · مضاف "+j.counts.added+" · محذوف "+j.counts.removed+" · متغير "+j.counts.changed+"</div>"+(j.changes||[]).map(function(c){return"<div class=\\"pro-change\\"><div class=\\"pro-meta\\"><span class=\\"pro-tag\\">"+e(c.type)+"</span>"+(c.paragraphNo?"<span>فقرة "+e(c.paragraphNo)+"</span>":"")+"</div><div class=\\"pro-diff\\"><div class=\\"pro-old\\">"+e(c.old||"—")+"</div><div class=\\"pro-new\\">"+e(c.new||"—")+"</div></div></div>"}).join("")}catch(x){b.textContent="تعذرت المقارنة: "+x.message}}var tree=null,treeAt=0;async function startTree(){var s=el("pro-decision-standard").value,j=await api("decision?standard="+encodeURIComponent(s));tree=j.tree;treeAt=0;showTree()}function showTree(){var b=el("pro-tree-body");if(!tree){b.textContent="المسار غير متاح";return}if(typeof treeAt==="string"){b.innerHTML="<b>النتيجة الإرشادية:</b> "+e(treeAt)+"<div class=\\"pro-note\\">"+e(tree.disclaimer||"")+"</div>";return}var n=tree.nodes[treeAt];if(!n){b.textContent="انتهى المسار";return}b.innerHTML="<div class=\\"pro-tree-q\\">"+e(n.q)+"</div><div class=\\"pro-tree-actions\\"><button class=\\"pro-yes\\">نعم</button><button class=\\"pro-no\\">لا</button></div><div class=\\"pro-note\\">"+e(tree.disclaimer||"")+"</div>";b.querySelector(".pro-yes").onclick=function(){treeAt=n.yes;showTree()};b.querySelector(".pro-no").onclick=function(){treeAt=n.no;showTree()}}async function renderSaved(){var a=await allSaved(),b=el("pro-saved");b.innerHTML=a.length?a.map(function(x){var h=x.hit||{};return"<div class=\\"pro-saved\\"><b>"+e(h.title||"مرجع")+"</b><div class=\\"pro-meta\\">"+e(h.bookTitle||h.book)+" · "+e(h.edition||"")+" · فصل "+e(h.no||"")+"</div><p>"+e(h.snippet||"")+"</p></div>"}).join(""):"<div class=\\"pro-note\\">لم تحفظ مراجع بعد. احفظ النتائج من البحث المهني.</div>"}async function memoHtml(){var a=await allSaved(),subject=el("pro-memo-subject").value.trim()||"مذكرة محاسبية فنية";return"<!doctype html><html lang=\\"ar\\" dir=\\"rtl\\"><meta charset=\\"utf-8\\"><title>"+e(subject)+"</title><style>body{font-family:Arial;line-height:1.8;margin:40px;color:#17211d}h1{color:#0e3b30;border-bottom:2px solid #a87d2e;padding-bottom:10px}.ref{border:1px solid #ddd;padding:12px;margin:10px 0;border-radius:8px}.meta{color:#666;font-size:12px}@media print{body{margin:12mm}}</style><h1>"+e(subject)+"</h1><p><b>الغرض:</b> تجميع المراجع والتحليل الفني. يجب استكمال الحكم المهني والوقائع والموافقات قبل الاعتماد النهائي.</p><h2>المراجع المحفوظة</h2>"+a.map(function(x){var h=x.hit||{};return"<div class=\\"ref\\"><b>"+e(h.title||"")+"</b><div class=\\"meta\\">"+e(h.bookTitle||h.book)+" · "+e(h.edition||"")+" · فصل "+e(h.no||"")+"</div><p>"+e(h.snippet||"")+"</p></div>"}).join("")+"</html>"}async function exportWord(){var h=await memoHtml(),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h],{type:"application/msword;charset=utf-8"}));a.download="مذكرة_فنية.doc";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}async function printMemo(){var w=window.open("","_blank");if(!w){if(typeof toast==="function")toast("اسمح بالنوافذ المنبثقة للطباعة","warn");return}w.document.open();w.document.write(await memoHtml());w.document.close();setTimeout(function(){w.print()},300)}function wrapDirectGemini(){try{if(typeof callGemini==="function"&&!callGemini.__pro2&&String(callGemini).indexOf("generativelanguage.googleapis.com")>=0){var old=callGemini;callGemini=async function(prompt,isJson){try{var j=await api("context",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:String(prompt||"").slice(0,8000)})});if(j.context)prompt=j.context+"\\n\\nمهمة المراجع:\\n"+prompt}catch(_){}return old(prompt,isJson)};callGemini.__pro2=true}}catch(_){}}function boot(){patchDb();patchChecks();shell();wrapDirectGemini();try{if(typeof renderLib==="function")renderLib();if(typeof refreshAll==="function")refreshAll()}catch(_){}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(boot,0)});else setTimeout(boot,0);new MutationObserver(function(){shell()}).observe(document.documentElement,{childList:true,subtree:true})})();<\/script>';
export function injectProfessionalUpgrade(h){
  if(String(h||"").includes("TAMHEES_PROFESSIONAL_V2"))return h;
  let out=String(h||"");let p=out.toLowerCase().indexOf("</head>");out=p>=0?out.slice(0,p)+PRO_STYLE+out.slice(p):PRO_STYLE+out;p=out.toLowerCase().lastIndexOf("</body>");return p>=0?out.slice(0,p)+PRO_SCRIPT+out.slice(p):out+PRO_SCRIPT;
}
