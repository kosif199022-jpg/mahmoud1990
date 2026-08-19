/** KOSIF v38 deterministic accounting core. No LLM-generated number is authoritative here. */
const AR='٠١٢٣٤٥٦٧٨٩', FA='۰۱۲۳۴۵۶۷۸۹';
export function normalizeDigits(v=''){
  return String(v).replace(/[٠-٩]/g,d=>String(AR.indexOf(d))).replace(/[۰-۹]/g,d=>String(FA.indexOf(d)));
}
export function parseMinor(raw, scale=2){
  if(typeof raw==='bigint') return raw;
  if(raw===null||raw===undefined||raw==='') throw new TypeError('amount_required');
  let s=normalizeDigits(raw).trim();
  let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1).trim();}
  if(/^[-−]/.test(s)){neg=true;s=s.slice(1).trim();}
  s=s.replace(/[\s,_،٬']/g,'').replace(/٫/g,'.').replace(/,/g,'');
  s=s.replace(/[^0-9.]/g,'');
  if(!s|| (s.match(/\./g)||[]).length>1) throw new TypeError('invalid_amount');
  let [whole='0',frac='']=s.split('.');
  whole=whole||'0';
  frac=(frac+'0'.repeat(scale)).slice(0,scale);
  if(!/^\d+$/.test(whole)||!/^\d*$/.test(frac)) throw new TypeError('invalid_amount');
  let n=BigInt(whole)*10n**BigInt(scale)+BigInt(frac||'0');
  return neg?-n:n;
}
export function formatMinor(minor, scale=2){
  let n=BigInt(minor), sign=n<0n?'-':''; if(n<0n)n=-n;
  const base=10n**BigInt(scale), whole=n/base, frac=String(n%base).padStart(scale,'0');
  return scale?`${sign}${whole}.${frac}`:`${sign}${whole}`;
}
export function stableJson(value){
  return JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
}
function lineMinor(v){try{return parseMinor(v??0)}catch{return null}}
export function validateJournal(entry={}){
  const lines=Array.isArray(entry.lines)?entry.lines:[];
  const errors=[]; if(lines.length<2) errors.push('journal_requires_two_lines');
  let debit=0n,credit=0n;
  const normalized=lines.map((l,i)=>{
    const d=lineMinor(l.debit),c=lineMinor(l.credit);
    if(d===null||c===null){errors.push(`line_${i+1}_invalid_amount`);return {...l,debitMinor:'0',creditMinor:'0'};}
    if(d<0n||c<0n) errors.push(`line_${i+1}_negative_side`);
    if(d>0n&&c>0n) errors.push(`line_${i+1}_both_sides`);
    if(d===0n&&c===0n) errors.push(`line_${i+1}_zero_line`);
    if(!String(l.account||l.accountNo||'').trim()) errors.push(`line_${i+1}_account_required`);
    debit+=d;credit+=c;
    return {...l,debitMinor:d.toString(),creditMinor:c.toString()};
  });
  if(debit!==credit) errors.push('journal_unbalanced');
  return {ok:errors.length===0,errors,lines:normalized,debitMinor:debit.toString(),creditMinor:credit.toString(),differenceMinor:(debit-credit).toString()};
}
export function trialBalance(entries=[]){
  const map=new Map();
  for(const e of entries){
    if(e?.status&&e.status!=='posted'&&e.status!=='reversal') continue;
    for(const l of e?.lines||[]){
      const account=String(l.account||l.accountNo||'').trim(); if(!account) continue;
      const d=BigInt(l.debitMinor??lineMinor(l.debit??0)??0n),c=BigInt(l.creditMinor??lineMinor(l.credit??0)??0n);
      const x=map.get(account)||{account,name:l.accountName||'',debitMinor:0n,creditMinor:0n}; x.debitMinor+=d;x.creditMinor+=c;map.set(account,x);
    }
  }
  const rows=[...map.values()].sort((a,b)=>a.account.localeCompare(b.account)).map(x=>({...x,debitMinor:x.debitMinor.toString(),creditMinor:x.creditMinor.toString(),balanceMinor:(x.debitMinor-x.creditMinor).toString()}));
  const td=rows.reduce((s,r)=>s+BigInt(r.debitMinor),0n),tc=rows.reduce((s,r)=>s+BigInt(r.creditMinor),0n);
  return {rows,totalDebitMinor:td.toString(),totalCreditMinor:tc.toString(),balanced:td===tc};
}
function mulBps(n,bps){return (BigInt(n)*BigInt(bps))/10000n;}
export function computeMateriality({benchmarkMinor,pctBps=500,performanceBps=7500,trivialBps=500}={}){
  const b=BigInt(benchmarkMinor??0); const overall=mulBps(b<0n?-b:b,pctBps); const performance=mulBps(overall,performanceBps); const trivial=mulBps(overall,trivialBps);
  return {benchmarkMinor:b.toString(),pctBps:Number(pctBps),overallMinor:overall.toString(),performanceMinor:performance.toString(),trivialMinor:trivial.toString(),requiresHumanApproval:true};
}
export function aggregateMisstatements(items=[],materiality={}){
  const overall=BigInt(materiality.overallMinor??0), trivial=BigInt(materiality.trivialMinor??0); let total=0n; const included=[];
  for(const i of items){const amt=BigInt(i.amountMinor??0);if((amt<0n?-amt:amt)>trivial){total+=amt;included.push({...i,amountMinor:amt.toString()});}}
  const abs=total<0n?-total:total;return{included,totalMinor:total.toString(),exceedsOverall:overall>0n&&abs>=overall,requiresHumanConclusion:true,standard:'ISA 450'};
}
export function riskFlags({amountMinor=0,performanceMinor=0,roundThresholdMinor=100000,manual=false,afterClose=false,relatedParty=false,estimate=false,revenueCutoff=false}={}){
  const amount=BigInt(amountMinor),pm=BigInt(performanceMinor),abs=amount<0n?-amount:amount; const flags=[];
  if(pm>0n&&abs>=pm)flags.push('material_or_above_performance_materiality');
  if(BigInt(roundThresholdMinor)>0n&&abs>0n&&abs%BigInt(roundThresholdMinor)===0n)flags.push('round_number');
  if(manual)flags.push('manual_entry');if(afterClose)flags.push('after_close');if(relatedParty)flags.push('related_party');if(estimate)flags.push('estimate');if(revenueCutoff)flags.push('revenue_cutoff');
  const score=Math.min(100,flags.length*14+(pm>0n&&abs>=pm?30:0)+(relatedParty?20:0));return{score,band:score>=80?'critical':score>=60?'high':score>=35?'medium':'low',flags};
}
function fnv1a(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function xorshift32(seed){let x=seed||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
export function reproducibleSample(population=[],size=1,seed='kosif-v38'){
  const arr=[...population];const rnd=xorshift32(fnv1a(seed));for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return{seed:String(seed),population:population.length,size:Math.max(0,Math.min(Number(size)||0,arr.length)),items:arr.slice(0,Math.max(0,Math.min(Number(size)||0,arr.length)))};
}
export function frameworkReadiness({reportingDate='2026-12-31',jurisdiction='saudi'}={}){
  const d=new Date(`${reportingDate}T00:00:00Z`); const ifrs18=d>=new Date('2027-01-01T00:00:00Z');
  return{jurisdiction,reportingDate,ifrs18:{effectiveForPeriod:ifrs18,status:ifrs18?'effective':'transition-readiness',effectiveDate:'2027-01-01'},isa240:{status:'fraud-risk-readiness',humanJudgmentRequired:true},authorityRule:'latest_verified_official_source_wins'};
}
export function checkInvariants({entries=[]}={}){
  const broken=[];for(const e of entries){const v=validateJournal(e);if(!v.ok)broken.push({id:e.id||null,errors:v.errors});if(e.status==='posted'&&!e.postedAt)broken.push({id:e.id||null,errors:['posted_entry_missing_timestamp']});}
  return{ok:broken.length===0,broken,rule:'debit_equals_credit_and_posted_records_are_immutable'};
}
