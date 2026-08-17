/* Kosif v36 output actions: adjusted TB, Word and audio summary */
(()=>{'use strict';
const q=s=>document.querySelector(s),n=v=>Number(v)||0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n(v));
const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0600-\u06ffa-z0-9]+/g,' ').trim();
const label=a=>a?.name||a?.accountName||a?.title||a?.account||a?.code||'';
const bal=a=>Number.isFinite(+a?.balance)?+a.balance:n(a?.debit)-n(a?.credit);
function adjusted(){
 const base=(state?.tb?.accounts||[]).map(a=>({...a,__name:label(a),__before:bal(a),__after:bal(a)}));
 const map=new Map(base.map((a,i)=>[key(a.__name),i]));
 for(const e of (state?.report?.adjusting_entries||[]))for(const l of (e.lines||[])){const k=key(l.account),delta=n(l.debit)-n(l.credit);let i=map.get(k);if(i==null){i=base.length;map.set(k,i);base.push({name:l.account||'حساب تسوية',__name:l.account||'حساب تسوية',__before:0,__after:0,__new:true})}base[i].__after+=delta}
 return base;
}
function ensureCard(){const out=q('#view-outputs');if(!out)return null;let c=q('#adj-card');if(!c){c=document.createElement('div');c.id='adj-card';c.className='card no-print';c.innerHTML='<div class="card-h"><h3>الميزان المعدّل</h3><span class="hint">بعد قيود التسوية المقترحة — لا تُعد Posted إلا بعد اعتماد بشري</span><span class="spacer"></span><button class="btn ghost sm" id="btn-export-adj">تصدير CSV</button></div><div id="adj-body"></div>';out.insertBefore(c,q('#report-holder')||out.firstChild)}return c}
function renderAdjusted(){if(!ensureCard())return;const w=q('#adj-body'),rows=adjusted();if(!rows.length){w.innerHTML='<div class="empty">لا يوجد ميزان معتمد.</div>';return}w.innerHTML=`<div class="twrap"><table class="data"><thead><tr><th>الحساب</th><th>قبل</th><th>بعد</th><th>الفرق</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.__name)}</td><td>${fmt(x.__before)}</td><td>${fmt(x.__after)}</td><td>${fmt(x.__after-x.__before)}</td></tr>`).join('')}</tbody></table></div>`}
function exportAdjusted(){const rows=adjusted();if(!rows.length)return;const csv='\ufeffالحساب,قبل التسوية,بعد التسوية,الفرق\n'+rows.map(x=>[x.__name,x.__before,x.__after,x.__after-x.__before].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');if(typeof download==='function')download('kosif-adjusted-tb.csv',csv,'text/csv;charset=utf-8')}
function exportWord(){if(!state?.report)return;const r=q('#report');const html='<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>kosif</title><style>body{font-family:Arial,sans-serif;direction:rtl;line-height:1.8;margin:36px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:7px}h1,h2,h3{color:#312e81}</style></head><body><h1>kosif</h1>'+(r?.innerHTML||esc(state.report.executive_summary||''))+'<hr><p>مسودة تحليلية من kosif — يلزم الاعتماد المهني البشري قبل الاستخدام الخارجي.</p></body></html>';if(typeof download==='function')download('kosif-report.doc','\ufeff'+html,'application/msword;charset=utf-8')}
function speak(){if(!window.speechSynthesis)return alert('القراءة الصوتية غير مدعومة في هذا المتصفح.');const r=state?.report||{},op=r.opinion_indication||{},t=['ملخص مراجعة kosif',r.executive_summary,op.type?'مؤشر الرأي: '+op.type+'. '+(op.basis||''):''].filter(Boolean).join('\n').slice(0,7000);if(!t)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ar-SA';u.rate=.95;window.speechSynthesis.speak(u)}
function patchBrand(){const r=q('#report');if(!r)return;r.querySelectorAll('.rb').forEach(x=>x.textContent='kosif');r.innerHTML=r.innerHTML.replace(/منصة «تمحيص»/g,'منصة «kosif»')}
function bind(){
 const old=typeof renderOutputs==='function'?renderOutputs:null;if(old&&!old.__v36){renderOutputs=function(...a){const z=old.apply(this,a);renderAdjusted();patchBrand();return z};renderOutputs.__v36=true}
 const word=q('#btn-export-word');if(word)word.onclick=exportWord;
 const audio=q('#btn-audio-summary');if(audio)audio.onclick=speak;
 renderAdjusted();patchBrand();const adj=q('#btn-export-adj');if(adj)adj.onclick=exportAdjusted;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
