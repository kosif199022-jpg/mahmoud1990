/*
 * KOSIF v49 — Deterministic Reconciliation Engine
 * Bank ↔ supplier-ledger matching without floating-point arithmetic.
 * AI may explain exceptions later; it never decides monetary equality here.
 */
import { parseMoney, normalizeDigits, formatMoney } from './v38-core.mjs';

export const RECONCILIATION_VERSION = '49.0.0';
export const RECONCILIATION_SCHEMA = 'kosif.reconciliation.v49';

const DAY_MS = 86400000;
const COMPANY_NOISE = new Set(['شركة','الشركة','للتجارة','والتجارة','مؤسسة','المحدودة','محدودة','ذمم','ذ','م','مساهمة','السعودية','السعودي']);

function str(v){ return String(v ?? '').trim(); }
function absBig(v){ return v < 0n ? -v : v; }
function sumBig(xs){ return xs.reduce((a,b)=>a+b,0n); }
function idOf(prefix, i){ return `${prefix}-${String(i+1).padStart(4,'0')}`; }
function safeMinor(v){ return typeof v === 'bigint' ? v.toString() : String(v ?? '0'); }
function cap(n,a,b){ return Math.max(a,Math.min(b,n)); }

export function normalizeDate(input){
  const s = normalizeDigits(input).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return '';
}

function dateEpoch(date){
  const m = str(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  const y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]);
  const t=Date.UTC(y,mo-1,d);
  const z=new Date(t);
  if(z.getUTCFullYear()!==y||z.getUTCMonth()!==mo-1||z.getUTCDate()!==d) return null;
  return t;
}

export function dateDiffDays(a,b){
  const x=dateEpoch(a), y=dateEpoch(b);
  return x==null||y==null ? 999999 : Math.abs(Math.round((x-y)/DAY_MS));
}

export function normalizeArabicText(input){
  return normalizeDigits(input)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ').trim();
}

export function normalizeParty(input){
  const raw=normalizeArabicText(input);
  const tokens=raw.split(' ').filter(Boolean).filter(t=>!COMPANY_NOISE.has(t));
  return tokens.join(' ');
}

function tokens(input){ return new Set(normalizeArabicText(input).split(' ').filter(x=>x.length>1)); }
function overlapScore(a,b){
  const A=tokens(a), B=tokens(b); if(!A.size||!B.size) return 0;
  let both=0; for(const x of A) if(B.has(x)) both++;
  return both / Math.max(A.size,B.size);
}

function extractCompany(text){
  const s=str(text);
  const m=s.match(/(شركة\s+[\u0600-\u06FF\w\s]+?(?:المحدودة|المحدوده|المساهمة|المساهمه|ذ\.?\s*م\.?\s*م\.?))(?=\s*$|\s+\d|\s+(?:Charges|REMBK|BENBK)|$)/i);
  if(m) return m[1].replace(/\s+/g,' ').trim();
  const m2=s.match(/شركة\s+[\u0600-\u06FF\w\s]{2,80}/i);
  return m2 ? m2[0].replace(/\s+/g,' ').trim() : '';
}

function moneyMinor(value, currency='SAR'){
  const p=parseMoney(value,{currency});
  return p.ok ? absBig(p.minor) : null;
}

function splitMarkdown(line){
  if(!line.includes('|')) return null;
  const parts=line.split('|').map(x=>x.trim());
  if(parts[0]==='') parts.shift();
  if(parts[parts.length-1]==='') parts.pop();
  return parts;
}

function delimitedRows(text){
  const lines=str(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const rows=[];
  for(const line of lines){
    if(/^\|?\s*:?-{3,}/.test(line) && /-{3,}/.test(line)) continue;
    const md=splitMarkdown(line);
    if(md){ rows.push(md); continue; }
    if(line.includes('\t')) { rows.push(line.split('\t').map(x=>x.trim())); continue; }
    if(line.includes(';')) { rows.push(line.split(';').map(x=>x.trim())); continue; }
    if(line.includes(',')) {
      // CSV conservative parser: preserve commas inside quoted fields.
      const out=[]; let cur='', q=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){ if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q; continue; }
        if(ch===','&&!q){out.push(cur.trim());cur='';continue;} cur+=ch;
      }
      out.push(cur.trim()); rows.push(out); continue;
    }
    rows.push([line]);
  }
  return rows;
}

function headerMap(row){
  const m={};
  row.forEach((x,i)=>{ const k=normalizeArabicText(x); if(k) m[k]=i; });
  return m;
}
function findHeaderIndex(map,names){
  for(const [k,i] of Object.entries(map)) if(names.some(n=>k.includes(normalizeArabicText(n)))) return i;
  return -1;
}
function rowCell(row,i){ return i>=0&&i<row.length ? row[i] : ''; }

function looksHeader(row){
  const s=normalizeArabicText(row.join(' '));
  return /التاريخ|date/.test(s) && /مدين|دائن|المبلغ|amount|الرصيد/.test(s);
}

function lastMoneyCell(row){
  for(let i=row.length-1;i>=0;i--){
    const s=str(row[i]);
    if(/^-?\(?\s*[\d٠-٩۰-۹][\d٠-٩۰-۹,٬.٫]*\s*\)?$/.test(s)){
      const p=parseMoney(s,{currency:'SAR'}); if(p.ok) return {index:i, value:s, minor:absBig(p.minor)};
    }
  }
  return null;
}

export function parseBankText(text, opts={}){
  const rows=delimitedRows(text); if(!rows.length) return [];
  let start=0, map=null;
  if(looksHeader(rows[0])){ map=headerMap(rows[0]); start=1; }
  const out=[];
  for(let r=start;r<rows.length;r++){
    const row=rows[r]; if(!row.length) continue;
    const joined=row.join(' ');
    let date='';
    const dateIdx=map?findHeaderIndex(map,['التاريخ','date']):-1;
    if(dateIdx>=0) date=normalizeDate(rowCell(row,dateIdx));
    if(!date){ for(const cell of row){ date=normalizeDate(cell); if(date) break; } }
    if(!date) continue;
    const amountIdx=map?findHeaderIndex(map,['المبلغ','amount','القيمة','value']):-1;
    let amountRaw=amountIdx>=0?rowCell(row,amountIdx):'';
    let amount=amountRaw?moneyMinor(amountRaw):null;
    if(amount==null){ const lm=lastMoneyCell(row); if(lm){amount=lm.minor;amountRaw=lm.value;} }
    if(amount==null||amount===0n) continue;
    const descIdx=map?findHeaderIndex(map,['الوصف','البيان','description','details','ملاحظة']):-1;
    const refIdx=map?findHeaderIndex(map,['المرجع','reference','ref']):-1;
    const desc=descIdx>=0?rowCell(row,descIdx):joined;
    let reference=refIdx>=0?rowCell(row,refIdx):'';
    if(!reference){
      const standalone=row.find(c=>/^\d{8,14}$/.test(normalizeDigits(c).replace(/\s/g,'')));
      const long=joined.match(/\b\d{20,}\b/);
      reference=str(standalone||long?.[0]||'');
    }
    const partyIdx=map?findHeaderIndex(map,['المستفيد','المورد','counterparty','beneficiary']):-1;
    const party=partyIdx>=0?rowCell(row,partyIdx):(extractCompany(joined)||opts.defaultParty||'');
    const feeMatch=joined.match(/Charges\s*:\s*([\d٠-٩۰-۹.,٬٫]+)/i);
    const feeMinor=feeMatch?moneyMinor(feeMatch[1]):0n;
    out.push({
      id:idOf('BANK',out.length), source:'bank', date, amountMinor:safeMinor(amount), currency:opts.currency||'SAR',
      counterparty:str(party), reference, description:str(desc), feeMinor:safeMinor(feeMinor||0n), raw:row
    });
  }
  return out;
}

export function parseLedgerText(text, opts={}){
  const rows=delimitedRows(text); if(!rows.length) return [];
  let start=0, map=null;
  if(looksHeader(rows[0]) || normalizeArabicText(rows[0].join(' ')).includes('رقم السند')){map=headerMap(rows[0]);start=1;}
  const out=[];
  for(let r=start;r<rows.length;r++){
    const row=rows[r]; if(!row.length) continue;
    let date='';
    const dateIdx=map?findHeaderIndex(map,['التاريخ','date']):-1;
    if(dateIdx>=0) date=normalizeDate(rowCell(row,dateIdx));
    if(!date){ for(const cell of row){ date=normalizeDate(cell); if(date) break; } }
    if(!date) continue;
    const typeIdx=map?findHeaderIndex(map,['النوع','type']):-1;
    const type=rowCell(row,typeIdx);
    const debitIdx=map?findHeaderIndex(map,['مدين','debit','dr']):-1;
    const creditIdx=map?findHeaderIndex(map,['دائن','credit','cr']):-1;
    const amountIdx=map?findHeaderIndex(map,['المبلغ','amount','القيمة']):-1;
    const debit=debitIdx>=0?moneyMinor(rowCell(row,debitIdx)):null;
    const credit=creditIdx>=0?moneyMinor(rowCell(row,creditIdx)):null;
    let amount=amountIdx>=0?moneyMinor(rowCell(row,amountIdx)):null;
    let side='';
    if(debit!=null&&debit>0n){amount=debit;side='debit';}
    else if(credit!=null&&credit>0n){amount=credit;side='credit';}
    if(amount==null){const lm=lastMoneyCell(row); if(lm)amount=lm.minor;}
    if(amount==null||amount===0n) continue;
    // Supplier reconciliation compares payments/settlements, not purchase invoices or purchase returns.
    if(type && !/سند\s*يومية|payment|journal/i.test(type)) continue;
    const accountIdx=map?findHeaderIndex(map,['الحساب','account','المورد','supplier']):-1;
    const noteIdx=map?findHeaderIndex(map,['ملاحظة','الوصف','البيان','note','description']):-1;
    const contraIdx=map?findHeaderIndex(map,['الحساب المقابل','counter account','contra']):-1;
    const voucherIdx=map?findHeaderIndex(map,['رقم السند','voucher','document no','رقم القيد']):-1;
    const account=rowCell(row,accountIdx)||opts.defaultParty||'';
    const contra=rowCell(row,contraIdx);
    const channel=/بنك|bank/i.test(contra)?'bank':/صندوق|كاش|cash/i.test(contra)?'cash':'unknown';
    out.push({
      id:idOf('LEDGER',out.length), source:'ledger', date, amountMinor:safeMinor(amount), currency:opts.currency||'SAR',
      counterparty:str(account), reference:str(rowCell(row,voucherIdx)), description:str(rowCell(row,noteIdx)),
      channel, side:side||'debit', contraAccount:str(contra), raw:row
    });
  }
  return out;
}

function normalizedTx(tx, i, source, opts={}){
  const id=str(tx?.id)||idOf(source==='bank'?'BANK':'LEDGER',i);
  const date=normalizeDate(tx?.date);
  const amt=tx?.amountMinor!=null ? BigInt(str(tx.amountMinor)||'0') : (moneyMinor(tx?.amount,tx?.currency||opts.currency)||0n);
  const party=str(tx?.counterparty||tx?.party||tx?.supplier||'');
  return {
    ...tx,id,source,date,amountMinor:absBig(amt),partyNorm:normalizeParty(party),
    counterparty:party,reference:str(tx?.reference||tx?.ref||''),description:str(tx?.description||tx?.memo||''),
    channel:str(tx?.channel|| (source==='bank'?'bank':'unknown'))
  };
}

function partySimilarity(a,b,aliases={}){
  if(!a.partyNorm||!b.partyNorm) return 0;
  if(a.partyNorm===b.partyNorm) return 1;
  const aa=aliases[a.partyNorm], bb=aliases[b.partyNorm];
  if(aa&&aa===b.partyNorm) return 1;
  if(bb&&bb===a.partyNorm) return 1;
  return overlapScore(a.partyNorm,b.partyNorm);
}

function referenceEqual(a,b){
  const x=normalizeArabicText(a.reference).replace(/\s/g,''), y=normalizeArabicText(b.reference).replace(/\s/g,'');
  return !!x&&!!y&&(x===y||x.endsWith(y)||y.endsWith(x));
}

function candidate(a,b,opts){
  if(a.amountMinor!==b.amountMinor) return null;
  const dd=dateDiffDays(a.date,b.date); if(dd>opts.dateToleranceDays) return null;
  const ps=partySimilarity(a,b,opts.aliases);
  let score=55;
  if(dd===0) score+=25; else if(dd===1) score+=18; else if(dd<=3) score+=12; else score+=6;
  if(ps>=0.999) score+=12; else if(ps>=0.5) score+=7; else if(ps>0) score+=3;
  if(referenceEqual(a,b)) score+=8;
  const os=overlapScore(a.description,b.description); if(os>=0.5) score+=5; else if(os>0) score+=2;
  score=cap(score,0,100);
  return {bankId:a.source==='bank'?a.id:b.id, ledgerId:a.source==='ledger'?a.id:b.id, score, dateDifferenceDays:dd, partySimilarity:ps, referenceMatched:referenceEqual(a,b)};
}

function combinations(arr, min, max){
  const out=[];
  const walk=(start,cur)=>{
    if(cur.length>=min) out.push([...cur]);
    if(cur.length===max) return;
    for(let i=start;i<arr.length;i++){cur.push(arr[i]);walk(i+1,cur);cur.pop();}
  };
  walk(0,[]); return out;
}

function bestComposite(target, candidates, opts){
  const close=candidates.filter(x=>dateDiffDays(target.date,x.date)<=opts.dateToleranceDays).slice(0,opts.maxCompositeCandidates);
  let best=null;
  for(const combo of combinations(close,2,opts.maxCompositeParts)){
    if(sumBig(combo.map(x=>x.amountMinor))!==target.amountMinor) continue;
    const maxDiff=Math.max(...combo.map(x=>dateDiffDays(target.date,x.date)));
    const party=Math.max(...combo.map(x=>partySimilarity(target,x,opts)));
    const score=cap(68+(maxDiff===0?12:maxDiff===1?9:maxDiff<=3?6:3)+(party>=.999?10:party>=.5?5:0),0,100);
    const key=combo.map(x=>x.id).join('|');
    if(!best||score>best.score||(score===best.score&&key<best.key)) best={combo,score,maxDiff,key};
  }
  return best;
}

function duplicateGroups(rows){
  const by=new Map();
  for(const x of rows){
    const ref=normalizeArabicText(x.reference).replace(/\s/g,'');
    const fp=ref?`ref:${ref}`:`fp:${x.date}|${x.amountMinor}|${x.partyNorm}`;
    const a=by.get(fp)||[]; a.push(x); by.set(fp,a);
  }
  return [...by.entries()].filter(([,a])=>a.length>1).map(([fingerprint,a])=>({fingerprint,ids:a.map(x=>x.id),count:a.length}));
}

function serializeTx(x){
  return {...x,amountMinor:safeMinor(x.amountMinor),raw:undefined,partyNorm:undefined};
}

function suggestAmountDifferences(bankOnly,ledgerOnly,opts){
  const out=[]; const used=new Set();
  for(const b of bankOnly){
    let best=null;
    for(const l of ledgerOnly){
      if(used.has(l.id)) continue;
      const dd=dateDiffDays(b.date,l.date); if(dd>Math.min(3,opts.dateToleranceDays)) continue;
      const ps=partySimilarity(b,l,opts); if(b.partyNorm&&l.partyNorm&&ps<.35) continue;
      const diff=absBig(b.amountMinor-l.amountMinor);
      const max=b.amountMinor>l.amountMinor?b.amountMinor:l.amountMinor;
      const ratio=max===0n?1:Number(diff*10000n/max)/10000;
      if(ratio>.25) continue;
      if(!best||diff<best.diff||(diff===best.diff&&dd<best.dd)) best={b,l,diff,dd,ps};
    }
    if(best){used.add(best.l.id);out.push({bankId:b.id,ledgerId:best.l.id,dateDifferenceDays:best.dd,differenceMinor:safeMinor(best.b.amountMinor-best.l.amountMinor),partySimilarity:best.ps});}
  }
  return out;
}

export function reconcileTransactions(bankInput, ledgerInput, options={}){
  const opts={
    currency:options.currency||'SAR',
    dateToleranceDays:cap(Number(options.dateToleranceDays??3)||0,0,31),
    aliases:options.aliases||{},
    minimumAutoScore:cap(Number(options.minimumAutoScore??70)||70,55,100),
    bankOnlyLedger:options.bankOnlyLedger!==false,
    maxCompositeParts:cap(Number(options.maxCompositeParts??4)||4,2,5),
    maxCompositeCandidates:cap(Number(options.maxCompositeCandidates??16)||16,4,24)
  };
  const bank=(bankInput||[]).map((x,i)=>normalizedTx(x,i,'bank',opts)).filter(x=>x.date&&x.amountMinor>0n);
  const ledgerAll=(ledgerInput||[]).map((x,i)=>normalizedTx(x,i,'ledger',opts)).filter(x=>x.date&&x.amountMinor>0n);
  const excludedLedger=opts.bankOnlyLedger?ledgerAll.filter(x=>x.channel==='cash'):[];
  const ledger=opts.bankOnlyLedger?ledgerAll.filter(x=>x.channel!=='cash'):ledgerAll;

  const candidates=[];
  for(const b of bank) for(const l of ledger){ const c=candidate(b,l,opts); if(c) candidates.push({...c,b,l}); }
  candidates.sort((x,y)=>y.score-x.score||x.dateDifferenceDays-y.dateDifferenceDays||x.b.id.localeCompare(y.b.id)||x.l.id.localeCompare(y.l.id));
  const usedB=new Set(), usedL=new Set(), matches=[];
  for(const c of candidates){
    if(c.score<opts.minimumAutoScore||usedB.has(c.b.id)||usedL.has(c.l.id)) continue;
    usedB.add(c.b.id);usedL.add(c.l.id);
    matches.push({
      type:c.dateDifferenceDays===0&&c.score>=80?'exact':'probable',score:c.score,dateDifferenceDays:c.dateDifferenceDays,
      bankIds:[c.b.id],ledgerIds:[c.l.id],amountMinor:safeMinor(c.b.amountMinor),partySimilarity:c.partySimilarity,referenceMatched:c.referenceMatched
    });
  }

  // One bank payment ↔ multiple ledger lines.
  for(const b of bank.filter(x=>!usedB.has(x.id))){
    const pool=ledger.filter(x=>!usedL.has(x.id));
    const hit=bestComposite(b,pool,opts); if(!hit||hit.score<opts.minimumAutoScore) continue;
    usedB.add(b.id);hit.combo.forEach(x=>usedL.add(x.id));
    matches.push({type:'composite-bank-to-ledger',score:hit.score,dateDifferenceDays:hit.maxDiff,bankIds:[b.id],ledgerIds:hit.combo.map(x=>x.id),amountMinor:safeMinor(b.amountMinor)});
  }
  // Multiple bank payments ↔ one ledger line.
  for(const l of ledger.filter(x=>!usedL.has(x.id))){
    const pool=bank.filter(x=>!usedB.has(x.id));
    const hit=bestComposite(l,pool,opts); if(!hit||hit.score<opts.minimumAutoScore) continue;
    usedL.add(l.id);hit.combo.forEach(x=>usedB.add(x.id));
    matches.push({type:'composite-ledger-to-bank',score:hit.score,dateDifferenceDays:hit.maxDiff,bankIds:hit.combo.map(x=>x.id),ledgerIds:[l.id],amountMinor:safeMinor(l.amountMinor)});
  }

  const bankOnly=bank.filter(x=>!usedB.has(x.id));
  const ledgerOnly=ledger.filter(x=>!usedL.has(x.id));
  const amountDifferences=suggestAmountDifferences(bankOnly,ledgerOnly,opts);
  const bankOnlyTotal=sumBig(bankOnly.map(x=>x.amountMinor));
  const ledgerOnlyTotal=sumBig(ledgerOnly.map(x=>x.amountMinor));
  const bankTotal=sumBig(bank.map(x=>x.amountMinor));
  const ledgerTotal=sumBig(ledger.map(x=>x.amountMinor));
  const exactCount=matches.filter(x=>x.type==='exact').length;
  const probableCount=matches.filter(x=>x.type==='probable').length;
  const compositeCount=matches.length-exactCount-probableCount;
  const dateDifferenceCount=matches.filter(x=>x.dateDifferenceDays>0).length;

  const report={
    schema:RECONCILIATION_SCHEMA,version:RECONCILIATION_VERSION,currency:opts.currency,options:{...opts,aliases:undefined},
    summary:{
      bankCount:bank.length,ledgerCount:ledger.length,excludedLedgerNonBankCount:excludedLedger.length,
      matchGroups:matches.length,exactCount,probableCount,compositeCount,dateDifferenceCount,
      bankOnlyCount:bankOnly.length,ledgerOnlyCount:ledgerOnly.length,
      bankTotalMinor:safeMinor(bankTotal),ledgerTotalMinor:safeMinor(ledgerTotal),
      bankOnlyTotalMinor:safeMinor(bankOnlyTotal),ledgerOnlyTotalMinor:safeMinor(ledgerOnlyTotal),
      netUnreconciledMinor:safeMinor(bankOnlyTotal-ledgerOnlyTotal)
    },
    matches,
    exceptions:{
      bankOnly:bankOnly.map(serializeTx),ledgerOnly:ledgerOnly.map(serializeTx),
      amountDifferences,
      bankDuplicates:duplicateGroups(bank),ledgerDuplicates:duplicateGroups(ledger),
      excludedLedgerNonBank:excludedLedger.map(serializeTx)
    },
    transactions:{bank:bank.map(serializeTx),ledger:ledger.map(serializeTx)},
    governance:{deterministic:true,usesFloatingPointForMoney:false,humanApprovalRequired:true,autoPosting:false,aiRole:'explain-only'}
  };

  if(options.recordedSupplierBalance!=null&&str(options.recordedSupplierBalance)!==''){
    const bal=moneyMinor(options.recordedSupplierBalance,opts.currency);
    if(bal!=null){
      const adjusted=bal-bankOnlyTotal+ledgerOnlyTotal;
      report.adjustedBalance={
        recordedMinor:safeMinor(bal),suggestedMinor:safeMinor(adjusted),
        formula:'recorded - bankOnly + ledgerOnly',status:'proposed',humanApprovalRequired:true
      };
    }
  }
  return report;
}

export function reconcileTextSources(bankText,ledgerText,options={}){
  const bank=parseBankText(bankText,options);
  const ledger=parseLedgerText(ledgerText,options);
  return reconcileTransactions(bank,ledger,options);
}

export function suggestedJournalDrafts(report, options={}){
  const supplierAccount=str(options.supplierAccount||'SUPPLIER');
  const bankAccount=str(options.bankAccount||'BANK');
  return (report?.exceptions?.bankOnly||[]).map((x,i)=>({
    id:`RECON-DRAFT-${String(i+1).padStart(4,'0')}`,
    date:x.date,
    memo:`قيد مقترح من المطابقة البنكية — ${x.counterparty||'المورد'} — ${x.reference||x.id}`,
    amountMinor:x.amountMinor,
    lines:[{account:supplierAccount,drMinor:x.amountMinor,crMinor:'0'},{account:bankAccount,drMinor:'0',crMinor:x.amountMinor}],
    status:'draft',source:'reconciliation',autoPost:false,humanApprovalRequired:true
  }));
}

export function formatMinor(minor,currency='SAR'){
  const exp=currency==='KWD'||currency==='BHD'||currency==='OMR'||currency==='JOD'?3:currency==='JPY'?0:2;
  return formatMoney({minor:BigInt(str(minor)||'0'),exp});
}
