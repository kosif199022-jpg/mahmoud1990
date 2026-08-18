import { readFileSync } from 'fs';
import { buildEngine } from '../src/engine/kosif.engine.mjs';
const bp = JSON.parse(readFileSync(new URL('../config/kosif.blueprint.json', import.meta.url),'utf8'));
const E = buildEngine(bp);
let pass=0, fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  ✅ '+m)):(fail++,console.log('  ❌ '+m));};

console.log('\n[1] تحليل الأرقام');
for (const f of bp.self_tests.parser_fixtures.filter(x=>'expect_minor_units' in x)) {
  const got = E.parseAmount(f.input, {signedColumn: f.context==='signed_balance_column'});
  ok(got===f.expect_minor_units, `${f.input} → ${got} (متوقع ${f.expect_minor_units})`);
}

console.log('\n[2] حدود الكلمة العربية');
ok(E.classify({account_name:'مدينة الرياض للتطوير'}).rule_id!=='R-AR-01','«مدينة» لا تطابق قاعدة «مدين»');
ok(E.classify({account_name:'الدين العام'}).rule_id!=='R-AP-01','«الدين» لا تطابق «دائنون»');
ok(E.classify({account_name:'ذمم مدينة تجارية'}).rule_id==='R-AR-01','«ذمم مدينة تجارية» → R-AR-01');
ok(E.classify({account_name:'مخصص خسائر ائتمانية متوقعة'}).rule_id==='R-ECL-01','المخصص يفوز على الذمم بالأولوية');
ok(E.classify({account_name:'مجمع الإهلاك - سيارات'}).class==='contra_asset','مجمع الإهلاك = حساب مقابل');
ok(E.classify({account_name:'حساب معلق'}).flags.expected_zero,'الحساب المعلق متوقع صفر');
ok(E.classify({account_name:'إيرادات مؤجلة'}).rule_id==='R-DEFREV-01','الإيراد المؤجل التزام لا إيراد');
ok(E.classify({account_name:'حساب غامض ٩٩'}).class==='unclassified','غير المصنّف يذهب لقائمة المراجعة');

console.log('\n[3] الأهمية النسبية والمخاطر');
const mat = E.computeMateriality({benchmarkId:'revenue', benchmarkValue: 8000000000, riskBand:'high'});
ok(mat.performance_materiality < mat.overall_materiality,`OM=${mat.overall_materiality/100} ريال، PM=${mat.performance_materiality/100} ريال`);
const cls = E.classify({account_name:'جاري الشركاء - طرف ذو علاقة'});
const r = E.scoreRisk({closing_balance: 400000000, py_closing_balance: 50000000}, cls, {materiality:mat, anomalyScore:40, evidenceGap:60});
ok(r.score>=85, `الطرف ذو العلاقة → ${r.score} (${r.band_label_ar})`);
ok(r.escalations.length>0 && r.factors, 'التفكيك والتصعيدات موجودة إلزاميًا');

console.log('\n[4] فحوص الميزان');
const tb=[
 {account_no:'1010',account_name:'النقدية بالصندوق',debit:120000000,credit:0,closing_balance:120000000,py_closing_balance:118000000},
 {account_no:'1210',account_name:'ذمم مدينة تجارية',debit:480000000,credit:0,closing_balance:480000000,py_closing_balance:150000000},
 {account_no:'1990',account_name:'حساب معلق',debit:9000000,credit:0,closing_balance:9000000},
 {account_no:'1990',account_name:'حساب معلق مكرر',debit:0,credit:0,closing_balance:0},
 {account_no:'4010',account_name:'إيرادات المبيعات',debit:0,credit:600000000,closing_balance:-600000000},
].map(a=>({...a, classification:E.classify(a)}));
const hits=E.runTbChecks(tb,{materiality:mat});
ok(hits.some(h=>h.id==='TB-01'),'كشف عدم التوازن');
ok(hits.some(h=>h.id==='TB-02'),'كشف تكرار رقم الحساب');
ok(hits.some(h=>h.id==='TB-09'),'كشف الحساب المعلق برصيد');
ok(hits.some(h=>h.id==='TB-07'),'كشف التقلب الجوهري في الذمم');

console.log('\n[5] شجرة الرأي — ISA 705');
ok(E.determineOpinion({}).status==='needs_input','يطلب المدخل الناقص بدل التخمين');
const q=E.determineOpinion({q_source:'material_misstatement', q_ms_pervasive:false});
ok(q.opinion==='qualified' && q.result_id==='res_qualified_ms', `جوهري غير منتشر → ${q.label_ar}`);
ok(E.determineOpinion({q_source:'material_misstatement',q_ms_pervasive:true}).opinion==='adverse','جوهري ومنتشر → رأي معاكس');
ok(E.determineOpinion({q_source:'inability_to_obtain_evidence',q_ev_pervasive:true}).opinion==='disclaimer','قصور منتشر → امتناع');
ok(E.determineOpinion({q_source:'inability_to_obtain_evidence',q_ev_pervasive:false}).opinion==='qualified','قصور غير منتشر → متحفظ');
const gc=E.determineOpinion({q_source:'none', q_going_concern:'uncertainty_exists_and_adequately_disclosed'});
ok(gc.isa_ref==='ISA_570.22','استمرارية مفصح عنها → فقرة عدم تأكد جوهري');
ok(E.determineOpinion({q_source:'none',q_going_concern:'no_uncertainty',q_other_matters:false}).opinion==='unmodified','المسار النظيف');
ok(q.signed===false,'الرأي يخرج غير موقّع دائمًا');

console.log('\n[6] عقد استدعاء النموذج');
try { E.buildModelRequest({task_id:'T.FINDING_NARRATIVE',system_ar:'س',userText:'اشرح',context:{a:1}}); ok(true,'الطلب السليم يمر'); } catch(e){ ok(false,'الطلب السليم يمر'); }
try { E.assertModelRequest({task_id:'T.ADVISOR',messages:[{role:'user',content:{a:1}}]}); ok(false,'يُرفض الكائن كمحتوى'); } catch(e){ ok(true,'يُرفض الكائن كمحتوى قبل الشبكة'); }
try { E.assertModelRequest({task_id:'T.ADVISOR',messages:[{role:'user',content:'حلل '+{}}]}); ok(false,'يُرفض [object Object]'); } catch(e){ ok(true,'يُرفض [object Object] قبل الشبكة'); }
try { E.assertModelRequest({task_id:'T.UNKNOWN',messages:[{role:'user',content:'x'}]}); ok(false,'يُرفض task_id مجهول'); } catch(e){ ok(true,'يُرفض task_id غير مسجّل'); }
ok(E.stripModelNumbers('الرصيد 4,800,000 والفرق 12345',[4800000]).includes('محذوف'),'حارس الأرقام يحذف رقمًا لم يصدر من المحرك');

console.log(`\n════ النتيجة: ${pass} ناجح / ${fail} فاشل ════`);
process.exit(fail?1:0);
