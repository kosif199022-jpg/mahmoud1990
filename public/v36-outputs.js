/* Kosif v37 compatibility outputs: safe adjusted TB, export and audio summary.
 * Transitional bridge for the v36 audit UI. Unknown accounts and unbalanced proposed
 * entries are never silently injected into the adjusted trial balance.
 */
(()=>{'use strict';
const q=s=>document.querySelector(s),n=v=>Number(v)||0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('ar-SA',{maximumFractionDigits:2}).format(n(v));
const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0600-\u06ffa-z0-9]+/g,' ').trim();
const label=a=>a?.name||a?.accountName||a?.title||a?.account||a?.code||'';
const code=a=>String(a?.code||a?.accountCode||a?.account_no||'').trim();
const bal=a=>Number.isFinite(+a?.balance)?+a.balance:n(a?.debit)-n(a?.credit);
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};

function adjusted(){
 const base=(state?.tb?.accounts||[]).map(a=>({...a,__code:code(a),__name:label(a),__before:bal(a),__after:bal(a)}));
 const byCode=new Map(),byName=new Map();
 base.forEach((a,i)=>{if(a.__code&&!byCode.has(a.__code))byCode.set(a.__code,i);const k=key(a.__name);if(k){const old=byName.get(k);byName.set(k,old===undefined?i:null)}});
 const errors=[];
 for(const e of (state?.report?.adjusting_entries||[])){
   const lines=e.lines||[],dr=lines.reduce((s,l)=>s+n(l.debit),0),cr=lines.reduce((s,l)=>s+n(l.credit),0);
   if(Math.abs(dr-cr)>.005){errors.push({entry:e.no||e.id||'—',reason:`قيد غير متوازن: مدين ${fmt(dr)} / دائن ${fmt(cr)}`});continue}
   const resolved=[];let bad=false;
   for(const l of lines){
     const c=String(l.account_code||l.code||'').trim(),k=key(l.account||l.account_name||'');
     let i=c?byCode.get(c):undefined;if(i===undefined&&k)i=byName.get(k);
     if(i===undefined||i===null){errors.push({entry:e.no||e.id||'—',reason:`حساب غير معروف أو اسم غير فريد: ${l.account||l.account_name||c||'—'}`});bad=true;break}
     resolved.push([i,n(l.debit)-n(l.credit)]);
   }
   if(bad)continue;for(const [i,delta] of resolved)base[i].__after+=delta;
 }
 const totalBefore=base.reduce((s,a)=>s+a.__before,0),totalAfter=base.reduce((s,a)=>s+a.__after,0);
 return {rows:base,errors,totalBefore,totalAfter,balancedAfter:Math.abs(totalAfter)<.5};
}
function ensureCard(){const out=q('#view-outputs');if(!out)return null;let c=q('#adj-card');if(!c){c=document.createElement('div');c.id='adj-card';c.className='card no-print';c.innerHTML='<div class="card-h"><h3>الميزان المعدّل</h3><span class="hint">بعد قيود التسوية المقبولة حسابيًا — لا تُعد Posted إلا بعد اعتماد بشري</span><span class="spacer"></span><button class="btn ghost sm" id="btn-export-adj">تصدير CSV</button></div><div id="adj-body"></div>';out.insertBefore(c,q('#report-holder')||out.firstChild)}return c}
function renderAdjusted(){if(!ensureCard())return;const w=q('#adj-body'),z=adjusted(),rows=z.rows;if(!rows.length){w.innerHTML='<div class="empty">لا يوجد ميزان معتمد.</div>';return}const issues=z.errors.length?`<div class="note danger"><span>!</span><span><b>تم رفض ${z.errors.length} قيد/سطر تسوية من الميزان المعدل:</b><br>${z.errors.map(x=>`${esc(x.entry)} — ${esc(x.reason)}`).join('<br>')}</span></div>`:'';w.innerHTML=`${issues}<div class="note ${z.balancedAfter?'ok':'danger'}"><span>${z.balancedAfter?'✓':'!'}</span><span>فحص التوازن بعد التسويات: ${z.balancedAfter?'متوازن ضمن التفاوت':'غير متوازن — لا يجوز الاعتماد'} · الأثر الصافي ${fmt(z.totalAfter)}</span></div><div class="twrap"><table class="data"><thead><tr><th>الكود</th><th>الحساب</th><th>قبل</th><th>بعد</th><th>الفرق</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.__code||'—')}</td><td>${esc(x.__name)}</td><td>${fmt(x.__before)}</td><td>${fmt(x.__after)}</td><td>${fmt(x.__after-x.__before)}</td></tr>`).join('')}</tbody></table></div>`}
function exportAdjusted(){const z=adjusted();if(!z.rows.length)return;if(z.errors.length||!z.balancedAfter){alert('تم منع التصدير: توجد قيود غير متوازنة/حسابات غير معروفة أو الميزان المعدل غير متوازن.');return}const csv='\ufeffكود الحساب,الحساب,قبل التسوية,بعد التسوية,الفرق\n'+z.rows.map(x=>[x.__code,x.__name,x.__before,x.__after,x.__after-x.__before].map(csvCell).join(',')).join('\n');if(typeof download==='function')download('kosif-adjusted-tb.csv',csv,'text/csv;charset=utf-8')}
function exportWord(){if(!state?.report)return;const r=q('#report');const html='<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>Kosif Audit Draft</title><style>body{font-family:Arial,sans-serif;direction:rtl;line-height:1.8;margin:36px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:7px}h1,h2,h3{color:#312e81}</style></head><body><h1>Kosif</h1>'+(r?.innerHTML||esc(state.report.executive_summary||''))+'<hr><p>مسودة تحليلية من Kosif — يلزم الاعتماد المهني البشري قبل الاستخدام الخارجي.</p></body></html>';if(typeof download==='function')download('kosif-report.html','\ufeff'+html,'text/html;charset=utf-8')}
function speak(){if(!window.speechSynthesis)return alert('القراءة الصوتية غير مدعومة في هذا المتصفح.');const r=state?.report||{},op=r.opinion_indication||{},t=['ملخص مراجعة Kosif',r.executive_summary,op.type?'مؤشر سردي للرأي يحتاج تحقق المحرك واعتماد الشريك: '+op.type+'. '+(op.basis||''):''].filter(Boolean).join('\n').slice(0,7000);if(!t)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ar-SA';u.rate=.95;window.speechSynthesis.speak(u)}
function patchBrand(){const r=q('#report');if(!r)return;r.querySelectorAll('.rb').forEach(x=>x.textContent='Kosif');r.innerHTML=r.innerHTML.replace(/منصة «تمحيص»/g,'منصة «Kosif»')}
function bind(){const old=typeof renderOutputs==='function'?renderOutputs:null;if(old&&!old.__v37){renderOutputs=function(...a){const z=old.apply(this,a);renderAdjusted();patchBrand();return z};renderOutputs.__v37=true}const word=q('#btn-export-word');if(word){word.textContent='تصدير HTML متوافق';word.onclick=exportWord}const audio=q('#btn-audio-summary');if(audio)audio.onclick=speak;renderAdjusted();patchBrand();const adj=q('#btn-export-adj');if(adj)adj.onclick=exportAdjusted}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
