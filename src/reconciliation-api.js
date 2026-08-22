import { reconcileTextSources, reconcileTransactions, suggestedJournalDrafts } from './engine/v49-reconciliation.mjs';

const MAX_TEXT = 1_500_000;
function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-kosif-reconciliation':'v49'
  }});
}
function bad(code,message,status=400){ return json({error:code,message},status); }

export async function handleReconciliation(req,u){
  if(u.pathname==='/api/kosif/v49/reconciliation/capabilities'&&req.method==='GET'){
    return json({
      ok:true,version:'49.0.0',deterministic:true,persistence:false,
      inputs:['bankText','ledgerText','bankTransactions','ledgerTransactions'],
      matching:['exact','date-tolerance','one-to-many','many-to-one','duplicate-detection','amount-difference-suggestion'],
      governance:{humanApprovalRequired:true,autoPosting:false,aiRole:'explain-only'}
    });
  }
  if(u.pathname!=='/api/kosif/v49/reconcile') return null;
  if(req.method!=='POST') return bad('METHOD_NOT_ALLOWED','استخدم POST لتنفيذ المطابقة.',405);
  const len=Number(req.headers.get('content-length')||0);
  if(len>MAX_TEXT*2+200000) return bad('PAYLOAD_TOO_LARGE','حجم ملف المطابقة أكبر من الحد المسموح.',413);
  let body;
  try{ body=await req.json(); }catch{ return bad('INVALID_JSON','تعذر قراءة طلب المطابقة.'); }
  const options=body?.options&&typeof body.options==='object'?body.options:{};
  try{
    let report;
    if(Array.isArray(body?.bankTransactions)&&Array.isArray(body?.ledgerTransactions)){
      report=reconcileTransactions(body.bankTransactions,body.ledgerTransactions,options);
    }else{
      const bankText=String(body?.bankText??''), ledgerText=String(body?.ledgerText??'');
      if(!bankText.trim()||!ledgerText.trim()) return bad('INPUT_REQUIRED','أدخل كشف البنك وكشف حساب المورد.');
      if(bankText.length>MAX_TEXT||ledgerText.length>MAX_TEXT) return bad('INPUT_TOO_LARGE','كل مصدر يجب ألا يتجاوز 1.5MB من النص.',413);
      report=reconcileTextSources(bankText,ledgerText,options);
    }
    if(body?.includeJournalDrafts===true) report.journalDrafts=suggestedJournalDrafts(report,body?.journalOptions||{});
    return json(report);
  }catch(e){
    return bad('RECONCILIATION_FAILED',String(e?.message||e||'تعذر تنفيذ المطابقة.'),422);
  }
}
