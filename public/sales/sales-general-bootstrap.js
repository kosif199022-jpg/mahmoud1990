(()=>{'use strict';
const STORE='kosif:aghnam:v7:native';
const MIGRATION='kosif:sales:general:migrated:v1';
const generic={sales:[
{id:'G-1',date:'2026-08-01',product:'المنتج A',category:'منتجات',channel:'المتجر الإلكتروني',qty:18,revenue:12600,cost:8460,customer:'عميل 001',phone:'0500000001',city:'الرياض',payment:'مدى'},
{id:'G-2',date:'2026-08-02',product:'الخدمة الأساسية',category:'خدمات',channel:'واتساب',qty:14,revenue:9100,cost:5160,customer:'عميل 002',phone:'0500000002',city:'جدة',payment:'تحويل'},
{id:'G-3',date:'2026-08-03',product:'المنتج B',category:'منتجات',channel:'الفرع',qty:22,revenue:12100,cost:7920,customer:'شركة تجريبية',phone:'0500000003',city:'مكة',payment:'شبكة'},
{id:'G-4',date:'2026-08-04',product:'الباقة المتقدمة',category:'باقات',channel:'المتجر الإلكتروني',qty:26,revenue:14820,cost:8620,customer:'عميل 004',phone:'0500000004',city:'الدمام',payment:'مدى'},
{id:'G-5',date:'2026-08-05',product:'الخدمة الاحترافية',category:'خدمات',channel:'المبيعات المباشرة',qty:17,revenue:8670,cost:5120,customer:'مؤسسة تجريبية',phone:'0500000005',city:'الرياض',payment:'تحويل'},
{id:'G-6',date:'2026-08-06',product:'المنتج C',category:'منتجات',channel:'المتجر الإلكتروني',qty:11,revenue:6600,cost:4290,customer:'عميل 006',phone:'0500000006',city:'الرياض',payment:'مدى'},
{id:'G-7',date:'2026-08-07',product:'الباقة الاقتصادية',category:'باقات',channel:'الفرع',qty:31,revenue:13020,cost:7990,customer:'عميل 007',phone:'0500000007',city:'جدة',payment:'نقدي'},
{id:'G-8',date:'2026-08-08',product:'خدمة الدعم',category:'خدمات',channel:'المبيعات المباشرة',qty:13,revenue:7150,cost:3550,customer:'عميل 008',phone:'0500000008',city:'مكة',payment:'مدى'}],clients:[],tasks:[],costs:{},meta:{source:'Kosif general sales demo',designAuthority:'Aghnam Al-Wadi Sales Dashboard 7',updatedAt:new Date().toISOString()}};
function shouldReplaceDemo(v){try{const d=JSON.parse(v||'null');return d?.meta?.source==='Aghnam v7 native integration'&&Array.isArray(d.sales)&&d.sales.length===8&&d.sales.every((x,i)=>x?.id===`S-${i+1}`)}catch{return false}}
try{
  const current=localStorage.getItem(STORE);
  const migrated=localStorage.getItem(MIGRATION)==='1';
  if(!current||(!migrated&&shouldReplaceDemo(current))){localStorage.setItem(STORE,JSON.stringify(generic));localStorage.setItem(MIGRATION,'1')}
}catch(_){ }
})();
