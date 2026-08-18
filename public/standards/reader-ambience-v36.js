/* Kosif Standards — طبقة الأجواء والحركة v36.4
   منقول ومكيَّف من قارئ «مفاتيح الثروة» v13 إلى قارئ المعايير:
   مشاهد مصورة وحيّة خلف الكلمات، أصوات مولّدة داخل الجهاز (Web Audio)،
   ثلاثة أسطح للقراءة، وحركات دخول هادئة للفصول والقوائم.
   كل شيء اختياري: «الخلفية الأصلية» تعيد الواجهة إلى شكلها المعتاد تمامًا. */
(()=>{'use strict';
if(window.__KOSIF_STD_AMBIENCE__)return;window.__KOSIF_STD_AMBIENCE__=true;

const one=(s,r=document)=>r.querySelector(s),many=(s,r=document)=>[...r.querySelectorAll(s)];
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const LS_KEY='mk_std_ambience';
const DEFAULTS={mode:'original',surface:'paper',dim:30,blur:0,paper:88,veil:40,motion:true,volume:35,sound:'auto',surfaceTouched:false,coverLib:false,mediaName:'',mediaType:'',audioName:''};
let prefs={...DEFAULTS,...loadPrefs()};
let backdropUrl='',soundUrl='',runtimeSound=false;

function loadPrefs(){try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')}catch{return{}}}
function setPref(k,v){prefs[k]=v;try{localStorage.setItem(LS_KEY,JSON.stringify(prefs))}catch(_){}}
function say(m){try{if(typeof toast==='function')toast(m)}catch(_){}}
function pausePro(){try{window.KosifStandardsReaderPro?.autoOff?.()}catch(_){}}

/* ══════════ المشاهد ══════════ */
const SCENES={
  original:{title:'الخلفية الأصلية',hint:'شكل القارئ المعتاد بلا صورة أو حركة',kind:'none',sound:''},
  ocean:{title:'بحر عند الشروق',hint:'ماء هادئ وإضاءة ذهبية خفيفة',kind:'photo',file:'backgrounds/ocean-dawn.webp',sound:'waves'},
  forest:{title:'غابة بعد المطر',hint:'ضباب أخضر ومشهد مريح للعين',kind:'photo',file:'backgrounds/forest-mist.webp',sound:'rain'},
  desert:{title:'ليل الصحراء',hint:'كثبان هادئة وقمر في ساعة الزرقة',kind:'photo',file:'backgrounds/desert-night.webp',sound:'wind'},
  waves:{title:'موج يتحرك',hint:'بحر مرسوم يتحرك بهدوء، خفيف على البطارية',kind:'live',sound:'waves'},
  rain:{title:'مطر على الزجاج',hint:'خيوط مطر بطيئة وضوء أزرق',kind:'live',sound:'rain'},
  night:{title:'ليل ونجوم',hint:'سماء صافية ونجوم تتلألأ',kind:'live',sound:'wind'},
  aurora:{title:'شفق قطبي',hint:'ألوان تتنفس ببطء خلف النص',kind:'live',sound:'wind'},
  hearth:{title:'دفء المساء',hint:'وهج دافئ يشبه ضوء المدفأة',kind:'live',sound:'fire'},
  custom:{title:'خلفيتي الخاصة',hint:'صورة أو فيديو محفوظ على هذا الجهاز',kind:'custom',sound:''}
};
const SURFACES={paper:['ورقة','صفحة واضحة فوق المشهد'],glass:['زجاج','سطح شفاف يُظهر المشهد خلف الكلمات'],open:['بلا سطح','النص مباشرة على الخلفية']};
const SOUNDS={none:'بلا صوت',waves:'أمواج البحر',rain:'مطر هادئ',wind:'رياح خفيفة',river:'جدول ماء',fire:'مدفأة',hush:'همس ساكن للتركيز',file:'ملفي الصوتي'};

const wavesScene=`<div class="scene-waves"><span class="sky"></span><span class="sun"></span>
<svg class="waves-svg" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
<g class="wave wave-a" fill="#1b4670" opacity=".9"><path d="M0,54 C150,26 300,82 600,54 C900,26 1050,82 1200,54 C1500,26 1650,82 1800,54 C2100,26 2250,82 2400,54 L2400,300 L0,300 Z"/></g>
<g class="wave wave-b" fill="#0d2a48" opacity=".92"><path d="M0,124 C200,98 340,152 600,124 C860,96 1000,152 1200,124 C1460,98 1600,152 1800,124 C2060,96 2200,152 2400,124 L2400,300 L0,300 Z"/></g>
<g class="wave wave-c" fill="#07182d"><path d="M0,196 C180,172 320,224 600,196 C880,168 1020,224 1200,196 C1480,172 1620,224 1800,196 C2080,168 2220,224 2400,196 L2400,300 L0,300 Z"/></g></svg></div>`;
const liveScene=m=>m==='waves'?wavesScene:m==='rain'?'<div class="scene-rain"><i></i><i></i><i></i></div>'
  :m==='night'?'<div class="scene-night"><i></i><i></i><b></b></div>'
  :m==='aurora'?'<div class="scene-aurora"><i></i><i></i><i></i></div>'
  :m==='hearth'?'<div class="scene-hearth"><i></i><i></i></div>':'';

/* ══════════ الأنماط ══════════ */
function css(){if(one('#stdAmbStyle'))return;const s=document.createElement('style');s.id='stdAmbStyle';s.textContent=`
:root{--ambient-dim:.3;--ambient-blur:0px;--ambient-paper:.88;--ambient-veil:.4;--ambient-paper-rgb:252,251,248}
[data-theme=sepia]{--ambient-paper-rgb:244,237,224}
[data-theme=night]{--ambient-paper-rgb:15,23,28}
#stdBackdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .55s ease,visibility 0s linear .55s}
#stdBackdrop.on{opacity:1;visibility:visible;transition:opacity .55s ease,visibility 0s linear}
#stdBackdrop img,#stdBackdrop video{position:absolute;inset:-3%;width:106%;height:106%;object-fit:cover;object-position:center;filter:blur(var(--ambient-blur)) saturate(1.06);transform:scale(1.03);opacity:0;transition:opacity .5s ease,filter .35s ease}
#stdBackdrop img.on,#stdBackdrop video.on{opacity:1}
#stdBackdrop video{inset:0;width:100%;height:100%;transform:none}
#ambientScene{position:absolute;inset:0;filter:blur(var(--ambient-blur));overflow:hidden}
#stdBackdrop .ambient-wash{position:absolute;inset:0;transition:background .3s;background:linear-gradient(180deg,rgba(7,14,28,calc(var(--ambient-dim)*.72)),rgba(7,14,28,var(--ambient-dim)))}
#stdBackdrop .ambient-grain{position:absolute;inset:0;opacity:.08;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E")}
#stdBackdrop.motion img.on{animation:ambientDrift 26s ease-in-out infinite alternate}
@keyframes ambientDrift{0%{transform:scale(1.05) translate3d(-.7%,0,0)}100%{transform:scale(1.12) translate3d(.7%,-.6%,0)}}
.scene-waves{position:absolute;inset:0;overflow:hidden;background:#07182d}
.scene-waves .sky{position:absolute;inset-inline:0;top:0;height:58%;background:linear-gradient(180deg,#0b2140 0,#2f4870 46%,#6a6a86 74%,#d99a63 100%)}
.scene-waves .sun{position:absolute;top:30%;left:68%;width:min(40vw,200px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff0d2 0 15%,#ffd39a 22%,rgba(255,201,140,.45) 38%,rgba(255,179,107,0) 74%)}
.scene-waves .waves-svg{position:absolute;inset-inline:0;bottom:0;width:100%;height:clamp(190px,48%,460px);display:block}
#stdBackdrop.motion .wave-a{animation:waveDrift 26s linear infinite}
#stdBackdrop.motion .wave-b{animation:waveDrift 18s linear infinite reverse}
#stdBackdrop.motion .wave-c{animation:waveDrift 12s linear infinite}
@keyframes waveDrift{from{transform:translateX(0)}to{transform:translateX(-1200px)}}
.scene-rain{position:absolute;inset:0;background:linear-gradient(180deg,#0a1a2e,#16324f 46%,#1d2f45)}
.scene-rain i{position:absolute;inset:-20% -10%;background-image:repeating-linear-gradient(104deg,rgba(198,222,247,.42) 0 1px,transparent 1px 9px);opacity:.34;animation:rainFall 1.05s linear infinite}
.scene-rain i:nth-child(2){background-image:repeating-linear-gradient(100deg,rgba(226,240,255,.3) 0 2px,transparent 2px 17px);opacity:.24;animation-duration:1.7s;filter:blur(1.4px)}
.scene-rain i:nth-child(3){background-image:radial-gradient(circle at 30% 20%,rgba(255,255,255,.16),transparent 42%),radial-gradient(circle at 76% 66%,rgba(150,200,255,.16),transparent 46%);animation:none;opacity:1}
@keyframes rainFall{to{transform:translate3d(-60px,220px,0)}}
.scene-night{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 108%,#1d2f4d 0,#0a1327 46%,#050a17 100%)}
.scene-night i{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1.2px 1.2px at 62% 12%,#fff,transparent),radial-gradient(1.6px 1.6px at 34% 46%,#e8f1ff,transparent),radial-gradient(1px 1px at 84% 38%,#fff,transparent),radial-gradient(1.4px 1.4px at 22% 72%,#fff,transparent),radial-gradient(1.1px 1.1px at 70% 66%,#dfeaff,transparent),radial-gradient(1.7px 1.7px at 48% 88%,#fff,transparent),radial-gradient(1px 1px at 92% 82%,#fff,transparent);background-size:340px 340px;opacity:.85}
#stdBackdrop.motion .scene-night i{animation:starTwinkle 5.5s ease-in-out infinite alternate}
.scene-night i:nth-child(2){background-size:520px 520px;opacity:.5;animation-duration:8s;animation-delay:-2s}
.scene-night b{position:absolute;top:14%;right:16%;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 36% 34%,#fdf6e4,#e4d5ae 62%,#cbb98f);box-shadow:0 0 90px 30px rgba(253,246,228,.22)}
@keyframes starTwinkle{from{opacity:.42}to{opacity:.95}}
.scene-aurora{position:absolute;inset:0;background:linear-gradient(180deg,#04101f,#0a1c30 60%,#07131f)}
.scene-aurora i{position:absolute;top:-24%;left:-18%;width:88%;height:92%;border-radius:50%;filter:blur(64px);opacity:.55;background:radial-gradient(circle,#3ad0a8,transparent 62%)}
.scene-aurora i:nth-child(2){left:auto;right:-22%;top:2%;background:radial-gradient(circle,#7c6bd6,transparent 62%);opacity:.5}
.scene-aurora i:nth-child(3){top:36%;left:10%;width:76%;height:70%;background:radial-gradient(circle,#e2a86a,transparent 64%);opacity:.34}
#stdBackdrop.motion .scene-aurora i{animation:auroraFloat 22s ease-in-out infinite alternate}
#stdBackdrop.motion .scene-aurora i:nth-child(2){animation-duration:28s;animation-delay:-6s}
#stdBackdrop.motion .scene-aurora i:nth-child(3){animation-duration:34s;animation-delay:-12s}
@keyframes auroraFloat{from{transform:translate3d(-4%,-3%,0) scale(1)}to{transform:translate3d(6%,5%,0) scale(1.16)}}
.scene-hearth{position:absolute;inset:0;background:radial-gradient(110% 90% at 50% 116%,#c2622a 0,#7a2f1c 34%,#2a1208 70%,#160903 100%)}
.scene-hearth i{position:absolute;bottom:-16%;left:50%;width:120%;height:76%;translate:-50% 0;border-radius:50%;filter:blur(52px);background:radial-gradient(circle,rgba(255,178,84,.66),transparent 66%)}
.scene-hearth i:nth-child(2){width:76%;height:52%;background:radial-gradient(circle,rgba(255,226,150,.6),transparent 62%)}
#stdBackdrop.motion .scene-hearth i{animation:hearthFlicker 4.6s ease-in-out infinite alternate}
#stdBackdrop.motion .scene-hearth i:nth-child(2){animation-duration:2.9s;animation-delay:-1.2s}
@keyframes hearthFlicker{from{opacity:.72;transform:translate(-50%,2%) scale(.97)}to{opacity:1;transform:translate(-50%,-2%) scale(1.05)}}

/* ══════════ الأجواء على واجهة Kosif ══════════ */
html.std-amb body{background:transparent}
html.std-amb main{position:relative;z-index:1}
html.std-amb #reader{border:1px solid rgba(127,127,127,.22);border-radius:22px;
  background:rgba(var(--ambient-paper-rgb),var(--ambient-paper));backdrop-filter:blur(16px) saturate(1.05);-webkit-backdrop-filter:blur(16px) saturate(1.05);
  box-shadow:0 34px 90px -45px rgba(4,10,22,.6);transition:background .35s,border-color .35s;padding-inline:22px}
html.std-amb[data-surface=glass] #reader{background:rgba(var(--ambient-paper-rgb),calc(var(--ambient-paper) - .27));
  backdrop-filter:blur(30px) saturate(1.18) brightness(1.06);-webkit-backdrop-filter:blur(30px) saturate(1.18) brightness(1.06);border-color:rgba(255,255,255,.42)}
html.std-amb[data-surface=open] #reader{background:transparent;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
html.std-amb[data-surface=open] #library,html.std-amb[data-surface=open] #toc,html.std-amb[data-surface=open] #reader{
  --paper:transparent;--ink:#fff;--ink2:#c9d4e0;--rule:rgba(255,255,255,.22);--seal:#7fd6c2;--seal-soft:rgba(255,255,255,.12);--mark:rgba(246,210,122,.4);color:var(--ink)}
html.std-amb[data-surface=open] main::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,10,22,calc(var(--ambient-veil)*.8)),rgba(4,10,22,var(--ambient-veil)) 42%,rgba(4,10,22,calc(var(--ambient-veil)*.92)))}
html.std-amb[data-surface=open] #prose,html.std-amb[data-surface=open] #chead h2,html.std-amb[data-surface=open] .card p{ text-shadow:0 1px 16px rgba(3,9,20,.78),0 0 3px rgba(3,9,20,.55)}
html.std-amb[data-surface=open] #bar,html.std-amb[data-surface=open] #dock{background:rgba(8,15,29,.72);border-color:rgba(255,255,255,.16);color:#e8eef7}
html.std-amb[data-surface=open] #crumb{color:#bccbe2}
html.std-amb[data-surface=open] .card{background:rgba(9,17,32,.4);border-color:rgba(255,255,255,.22)}
html.std-amb[data-surface=open] .ci{border-bottom-color:rgba(255,255,255,.18)}
@media(max-width:560px){html.std-amb #reader{padding-inline:14px;border-radius:18px}}

/* ══════════ نافذة الأجواء ══════════ */
#shAmbience{z-index:64}
.amb-current{position:relative;overflow:hidden;min-height:104px;border-radius:18px;padding:16px;color:#fff;background:linear-gradient(135deg,#0b1c35,#28647a);box-shadow:0 20px 48px -32px rgba(3,12,28,.9)}
.amb-current::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 85% 22%,rgba(255,214,145,.28),transparent 32%)}
.amb-current>*{position:relative}
.amb-current small{display:block;color:#e3c48d;font-weight:750}
.amb-current h3{font-family:var(--font);font-size:20px;margin:3px 0}
.amb-current p{font-size:12px;color:#d9e4ef;margin:0}
.amb-title{font-size:13px;color:var(--ink2);margin:16px 2px 8px;font-weight:800}
.amb-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.amb-presets.live{grid-template-columns:repeat(5,minmax(0,1fr))}
.amb-preset{position:relative;overflow:hidden;min-height:88px;border-radius:14px;border:2px solid transparent;background:rgba(var(--ambient-paper-rgb),.55);color:#fff;isolation:isolate;box-shadow:0 12px 28px -24px rgba(9,20,38,.75);transition:.2s}
.amb-preset::before{content:"";position:absolute;inset:0;background:var(--preset);background-size:cover;background-position:center;z-index:-2;transition:transform .35s}
.amb-preset::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,12,25,.75),rgba(5,12,25,.03) 74%);z-index:-1}
.amb-preset:hover::before{transform:scale(1.05)}
.amb-preset.on{border-color:var(--seal);box-shadow:0 0 0 3px color-mix(in srgb,var(--seal) 22%,transparent)}
.amb-preset span{position:absolute;inset-inline:8px;bottom:7px;font-size:11.5px;font-weight:850;text-align:start;line-height:1.35}
.amb-preset[data-mode=original]{--preset:linear-gradient(135deg,#faf8f3,#e9e2d5);color:var(--ink)}
.amb-preset[data-mode=original]::after{background:linear-gradient(0deg,rgba(255,255,255,.88),transparent)}
.amb-preset[data-mode=ocean]{--preset:url('backgrounds/ocean-dawn.webp')}
.amb-preset[data-mode=forest]{--preset:url('backgrounds/forest-mist.webp')}
.amb-preset[data-mode=desert]{--preset:url('backgrounds/desert-night.webp')}
.amb-preset[data-mode=waves]{--preset:linear-gradient(180deg,#12395e 0,#0d2a48 52%,#07182d 100%)}
.amb-preset[data-mode=rain]{--preset:repeating-linear-gradient(104deg,rgba(198,222,247,.5) 0 1px,transparent 1px 8px),linear-gradient(180deg,#0a1a2e,#1d2f45)}
.amb-preset[data-mode=night]{--preset:radial-gradient(1.4px 1.4px at 30% 30%,#fff,transparent),radial-gradient(1.4px 1.4px at 70% 60%,#fff,transparent),radial-gradient(120% 80% at 50% 108%,#1d2f4d,#050a17)}
.amb-preset[data-mode=aurora]{--preset:linear-gradient(150deg,#3ad0a8,#7c6bd6 52%,#e2a86a)}
.amb-preset[data-mode=hearth]{--preset:radial-gradient(110% 90% at 50% 116%,#ffb254,#7a2f1c 44%,#160903)}
.amb-surfaces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.amb-surface{min-height:60px;border:1px solid var(--rule);border-radius:13px;background:color-mix(in srgb,var(--paper) 92%,var(--ink) 8%);padding:10px;text-align:start;transition:.2s;color:var(--ink)}
.amb-surface b,.amb-surface small{display:block}
.amb-surface b{font-size:13.5px}
.amb-surface small{font-size:11px;color:var(--ink2);line-height:1.4;margin-top:2px}
.amb-surface.on{border-color:transparent;background:var(--seal);color:#fff}
.amb-surface.on small{color:color-mix(in srgb,#fff 78%,var(--seal))}
.amb-sounds{display:flex;flex-wrap:wrap;gap:7px}
.amb-sound{padding:8px 12px;border-radius:99px;border:1px solid var(--rule);background:color-mix(in srgb,var(--paper) 92%,var(--ink) 8%);color:var(--ink2);font-size:12.5px;font-weight:700;transition:.2s}
.amb-sound.on{background:var(--seal);color:#fff;border-color:transparent}
.amb-sound.ready::after{content:" ✓";color:var(--seal);font-weight:900}
.amb-sound.on.ready::after{color:inherit}
.amb-play{width:100%;margin-top:10px;min-height:52px;border-radius:14px;display:flex;align-items:center;gap:11px;padding:9px 13px;text-align:start;border:1px solid color-mix(in srgb,var(--seal) 34%,var(--rule));background:color-mix(in srgb,var(--seal) 9%,var(--paper));transition:.2s;color:var(--ink)}
.amb-play i{font-style:normal;font-size:1.2rem;width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--ink) 7%,transparent)}
.amb-play span{font-size:14px;font-weight:800}
.amb-play small{display:block;width:100%;font-size:11px;color:var(--ink2);margin-top:1px}
.amb-play>span{display:flex;flex-direction:column}
.amb-play.on{border-color:transparent;background:linear-gradient(135deg,#1c5b4f,#2e8a72);color:#fff}
.amb-play.on small{color:#cbe9df}
.amb-play.on i{background:rgba(255,255,255,.16)}
.amb-custom{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.amb-file{min-height:52px;border:1px dashed color-mix(in srgb,var(--seal) 50%,var(--rule));border-radius:13px;background:color-mix(in srgb,var(--ink) 3%,transparent);padding:8px 11px;text-align:start;display:flex;align-items:center;gap:9px;color:var(--ink)}
.amb-file span{font-size:1.1rem}
.amb-file b,.amb-file small{display:block}
.amb-file b{font-size:12.5px}
.amb-file small{font-size:10.5px;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:24ch}
.amb-controls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:11px}
.amb-control{border:1px solid var(--rule);border-radius:13px;background:color-mix(in srgb,var(--ink) 3%,transparent);padding:10px 11px}
.amb-control label{display:flex;justify-content:space-between;gap:9px;font-size:12px;font-weight:800;margin-bottom:5px;color:var(--ink)}
.amb-control label b{color:var(--seal)}
.amb-control input[type=range]{width:100%;accent-color:var(--seal)}
.amb-switches{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
.amb-switch{min-height:50px;border:1px solid var(--rule);border-radius:13px;background:color-mix(in srgb,var(--ink) 3%,transparent);padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:start;color:var(--ink)}
.amb-switch span b,.amb-switch span small{display:block}
.amb-switch span b{font-size:12.5px}
.amb-switch span small{font-size:10.5px;color:var(--ink2)}
.amb-switch i{width:42px;height:24px;border-radius:99px;background:var(--rule);position:relative;flex:none}
.amb-switch i::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;top:3px;right:3px;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:.2s}
.amb-switch.on i{background:var(--seal)}
.amb-switch.on i::after{translate:18px 0}
.amb-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}
.amb-actions button{padding:12px;border:1px solid var(--rule);border-radius:12px;background:var(--paper);color:var(--ink);font-weight:800}
.amb-actions .primary{background:var(--seal);color:#fff;border-color:transparent}
.amb-note{font-size:11px;color:var(--ink2);line-height:1.65;margin-top:9px;text-align:center}
#stdSoundDock{position:fixed;z-index:75;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 132px);display:none;align-items:center;gap:8px;max-width:200px;padding:8px 12px;border-radius:99px;background:rgba(12,27,48,.9);color:#fff;box-shadow:0 16px 38px -22px rgba(0,0,0,.78);backdrop-filter:blur(12px);font-size:12px;font-weight:800}
#stdSoundDock.on{display:flex}
#stdSoundDock.playing{background:rgba(28,91,79,.92)}
#stdSoundDock i{font-style:normal;font-size:1rem}
@media(max-width:720px){.amb-presets,.amb-presets.live{grid-template-columns:repeat(2,minmax(0,1fr))}.amb-preset{min-height:84px}.amb-controls,.amb-switches{grid-template-columns:1fr}.amb-surfaces{grid-template-columns:1fr}.amb-surface{min-height:48px;display:flex;align-items:center;gap:8px}.amb-surface small{margin-top:0}.amb-custom{grid-template-columns:1fr}}

/* ══════════ طبقة الحركة واللمسات ══════════ */
#prog{background-image:linear-gradient(90deg,var(--seal),color-mix(in srgb,var(--seal) 55%,#7fd6c2));background-repeat:no-repeat}
.std-fx-card{animation:stdFxUp .5s cubic-bezier(.22,.9,.26,1) both}
.std-fx-chapter{animation:stdFxChapter .45s cubic-bezier(.22,.9,.26,1) both}
@keyframes stdFxUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes stdFxChapter{from{opacity:0;transform:translateY(10px) scale(.995)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#stdBackdrop.motion img.on,#stdBackdrop.motion .wave,#stdBackdrop.motion .scene-night i,#stdBackdrop.motion .scene-aurora i,#stdBackdrop.motion .scene-hearth i,.scene-rain i,.std-fx-card,.std-fx-chapter{animation:none}}
@media print{#stdBackdrop,#stdSoundDock{display:none!important}html.std-amb body{background:var(--paper)}html.std-amb #reader{background:var(--paper);border:0;box-shadow:none}}
`;document.head.appendChild(s)}

/* ══════════ الهيكل ══════════ */
function skeleton(){
  document.body.insertAdjacentHTML('afterbegin','<div id="stdBackdrop" aria-hidden="true"><div id="ambientScene"></div><img id="ambientImage" alt=""><video id="ambientVideo" loop playsinline preload="metadata" muted></video><div class="ambient-wash"></div><div class="ambient-grain"></div></div>');
  document.body.insertAdjacentHTML('beforeend','<button id="stdSoundDock" type="button" aria-label="تشغيل أو إيقاف صوت الخلفية"><i>🔇</i><span>صوت الخلفية</span></button><audio id="ambientAudio" loop playsinline preload="metadata"></audio>');
  document.body.insertAdjacentHTML('beforeend',`<section class="sheet" id="shAmbience">
  <header><b>خلفية القراءة والأجواء</b><button data-amb-close aria-label="إغلاق">✕</button></header>
  <div class="body">
    <div class="amb-current"><small>المشهد النشط</small><h3 id="ambNow">الخلفية الأصلية</h3><p id="ambNowSub">شكل القارئ المعتاد بلا صورة أو حركة</p></div>
    <div class="amb-title">مشاهد مصورة</div>
    <div class="amb-presets">
      <button class="amb-preset" data-mode="original"><span>الكتاب الأصلي</span></button>
      <button class="amb-preset" data-mode="ocean"><span>بحر عند الشروق</span></button>
      <button class="amb-preset" data-mode="forest"><span>غابة بعد المطر</span></button>
      <button class="amb-preset" data-mode="desert"><span>ليل الصحراء</span></button>
    </div>
    <div class="amb-title">مشاهد حيّة تُرسم داخل التطبيق</div>
    <div class="amb-presets live">
      <button class="amb-preset" data-mode="waves"><span>موج يتحرك</span></button>
      <button class="amb-preset" data-mode="rain"><span>مطر على الزجاج</span></button>
      <button class="amb-preset" data-mode="night"><span>ليل ونجوم</span></button>
      <button class="amb-preset" data-mode="aurora"><span>شفق قطبي</span></button>
      <button class="amb-preset" data-mode="hearth"><span>دفء المساء</span></button>
    </div>
    <div class="amb-title">شكل سطح القراءة</div>
    <div class="amb-surfaces">${Object.entries(SURFACES).map(([k,[t,h]])=>`<button class="amb-surface" data-surface="${k}"><b>${t}</b><small>${h}</small></button>`).join('')}</div>
    <div class="amb-title">الصوت المصاحب</div>
    <div class="amb-sounds">${Object.entries(SOUNDS).map(([k,l])=>`<button class="amb-sound" data-sound="${k}"${k==='file'?' id="ambSoundFile"':''}>${l}</button>`).join('')}</div>
    <button class="amb-play" id="ambSound" type="button"><i>🔈</i><span><span id="ambSoundLabel">تشغيل الصوت</span><small id="ambSoundHint">صوت مولّد داخل جهازك بلا تنزيل</small></span></button>
    <div class="amb-custom">
      <button class="amb-file" id="ambPickMedia"><span>🖼</span><div><b>صورة أو فيديو من جهازي</b><small id="ambMediaName">PNG · JPG · MP4 · MOV</small></div></button>
      <button class="amb-file" id="ambPickAudio"><span>🎧</span><div><b>ملف صوت من جهازي</b><small id="ambAudioName">صوت البحر أو المطر مثلًا</small></div></button>
      <input id="ambMediaInput" type="file" accept="image/*,video/*" hidden>
      <input id="ambAudioInput" type="file" accept="audio/*" hidden>
    </div>
    <div class="amb-controls">
      <div class="amb-control"><label for="ambDim"><span>تعتيم الخلفية</span><b id="ambDimValue">٣٠٪</b></label><input id="ambDim" type="range" min="0" max="80" step="2"></div>
      <div class="amb-control" data-only="paper glass"><label for="ambPaper"><span>وضوح ورقة القراءة</span><b id="ambPaperValue">٨٨٪</b></label><input id="ambPaper" type="range" min="30" max="98" step="2"></div>
      <div class="amb-control" data-only="open"><label for="ambVeil"><span>ظل خلف النص</span><b id="ambVeilValue">٤٠٪</b></label><input id="ambVeil" type="range" min="0" max="85" step="5"></div>
      <div class="amb-control"><label for="ambBlur"><span>ضبابية الخلفية</span><b id="ambBlurValue">٠px</b></label><input id="ambBlur" type="range" min="0" max="16" step="1"></div>
      <div class="amb-control"><label for="ambVolume"><span>مستوى الصوت</span><b id="ambVolumeValue">٣٥٪</b></label><input id="ambVolume" type="range" min="0" max="100" step="5"></div>
    </div>
    <div class="amb-switches">
      <button class="amb-switch" id="ambMotion" type="button"><span><b>حركة سينمائية هادئة</b><small>تنفّس بطيء للمشهد</small></span><i></i></button>
      <button class="amb-switch" id="ambCoverLib" type="button"><span><b>المشهد خلف المكتبة أيضًا</b><small>يظهر خلف الفهرس والبطاقات</small></span><i></i></button>
    </div>
    <div class="amb-actions"><button id="ambOriginal" type="button">العودة إلى الشكل الأصلي</button><button class="primary" data-amb-close type="button">تم</button></div>
    <p class="amb-note">المشاهد الحيّة والأصوات تُولَّد داخل جهازك، فلا تستهلك بيانات ولا تحتاج إنترنت. الفيديو المرفوع يبدأ صامتًا حتى تشغّل صوته بنفسك.</p>
  </div></section>`);

  /* زر الشريط العلوي + مدخل في إعدادات العرض */
  const bar=one('#bar');
  if(bar&&!one('#bAmb')){const b=document.createElement('button');b.id='bAmb';b.title='الأجواء';b.setAttribute('aria-label','خلفية القراءة والأجواء');b.textContent='🌊';
    const anchor=one('#bPrefs');anchor?anchor.before(b):bar.appendChild(b);b.onclick=openAmbience}
  const prefsSheet=one('#shPrefs .body');
  if(prefsSheet&&!one('#prefsAmbRow')){const d=document.createElement('div');d.id='prefsAmbRow';d.className='row';d.style.marginBottom='0';
    d.innerHTML='<button id="prefsAmb" type="button" style="width:100%;display:flex;align-items:center;gap:11px;text-align:start;padding:11px 13px;border:1px solid var(--rule);border-radius:12px;background:color-mix(in srgb,var(--seal) 7%,transparent);font-weight:800;color:var(--ink)"><span style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#27677b,#2e8a72);font-size:17px">🌊</span><span style="flex:1;min-width:0"><b style="display:block;font-size:13.5px">خلفية القراءة والأجواء</b><small id="prefsAmbStatus" style="display:block;font-size:11px;color:var(--ink2);font-weight:600">الخلفية الأصلية</small></span><span style="color:var(--seal)">‹</span></button>';
    prefsSheet.appendChild(d);one('#prefsAmb').onclick=openAmbience}
}

/* ══════════ ملفات المستخدم (IndexedDB) ══════════ */
let dbPromise;
function ambDb(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('kosif-std-ambience-v1',1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media',{keyPath:'id'})};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
async function mediaStore(mode,action){const db=await ambDb();return new Promise((resolve,reject)=>{const t=db.transaction('media',mode),req=action(t.objectStore('media'));
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
const getMedia=id=>mediaStore('readonly',s=>s.get(id));
const putMedia=rec=>mediaStore('readwrite',s=>s.put(rec));

/* ══════════ مولّد الصوت داخل الجهاز ══════════ */
const engine={context:null,nodes:[],master:null,timer:0};
function noiseBuffer(context,kind){const length=context.sampleRate*8,buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
  if(kind==='brown'){let last=0;for(let i=0;i<length;i+=1){const white=Math.random()*2-1;last=(last+0.02*white)/1.02;data[i]=last*3.4}}
  else if(kind==='pink'){let b0=0,b1=0,b2=0;for(let i=0;i<length;i+=1){const white=Math.random()*2-1;b0=0.99765*b0+white*0.0990460;b1=0.96300*b1+white*0.2965164;b2=0.57000*b2+white*1.0526913;data[i]=(b0+b1+b2+white*0.1848)*0.22}}
  else{for(let i=0;i<length;i+=1)data[i]=(Math.random()*2-1)*0.5}
  return buffer}
const noiseSource=(context,kind)=>{const source=context.createBufferSource();source.buffer=noiseBuffer(context,kind);source.loop=true;return source};
function lfo(context,target,{rate,depth,base}){const osc=context.createOscillator(),gain=context.createGain();
  osc.frequency.value=rate;gain.gain.value=depth;osc.connect(gain).connect(target);target.value=base;osc.start();return osc}
function buildSound(kind){const context=engine.context,master=engine.master,extra=[];
  const attach=(source,chain)=>{let node=source;chain.forEach(next=>{node.connect(next);node=next});node.connect(master);engine.nodes.push(source,...chain);source.start()};
  if(kind==='waves'){const source=noiseSource(context,'brown'),filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=0.6;const swell=context.createGain();
    extra.push(lfo(context,filter.frequency,{rate:0.06,depth:240,base:520}),lfo(context,swell.gain,{rate:0.075,depth:0.4,base:0.58}));attach(source,[filter,swell])}
  else if(kind==='rain'){const hiss=noiseSource(context,'white'),high=context.createBiquadFilter();high.type='highpass';high.frequency.value=900;
    const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=7200;const level=context.createGain();level.gain.value=0.3;attach(hiss,[high,low,level]);
    const rumble=noiseSource(context,'brown'),deep=context.createBiquadFilter();deep.type='lowpass';deep.frequency.value=320;const deepLevel=context.createGain();deepLevel.gain.value=0.45;attach(rumble,[deep,deepLevel])}
  else if(kind==='wind'){const source=noiseSource(context,'brown'),band=context.createBiquadFilter();band.type='bandpass';band.Q.value=0.9;const level=context.createGain();
    extra.push(lfo(context,band.frequency,{rate:0.045,depth:260,base:480}),lfo(context,level.gain,{rate:0.09,depth:0.28,base:0.6}));attach(source,[band,level])}
  else if(kind==='river'){const source=noiseSource(context,'pink'),band=context.createBiquadFilter();band.type='bandpass';band.Q.value=0.5;const level=context.createGain();level.gain.value=0.5;
    extra.push(lfo(context,band.frequency,{rate:0.12,depth:180,base:1250}));attach(source,[band,level])}
  else if(kind==='hush'){const source=noiseSource(context,'brown'),low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=900;const level=context.createGain();level.gain.value=0.55;attach(source,[low,level])}
  else if(kind==='fire'){const bed=noiseSource(context,'brown'),low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=420;const level=context.createGain();level.gain.value=0.5;attach(bed,[low,level]);
    const crackle=()=>{if(!engine.context||!runtimeSound)return;const pop=context.createBufferSource();pop.buffer=noiseBuffer(context,'white');
      const band=context.createBiquadFilter();band.type='bandpass';band.frequency.value=1400+Math.random()*2200;band.Q.value=6;const shape=context.createGain();const now=context.currentTime;
      shape.gain.setValueAtTime(0.0001,now);shape.gain.linearRampToValueAtTime(0.26+Math.random()*0.3,now+0.006);shape.gain.exponentialRampToValueAtTime(0.0001,now+0.06+Math.random()*0.12);
      pop.connect(band).connect(shape).connect(master);pop.start(now);pop.stop(now+0.4);engine.timer=setTimeout(crackle,130+Math.random()*900)};
    engine.timer=setTimeout(crackle,250)}
  engine.nodes.push(...extra)}
function engineStop(fade=0.45){clearTimeout(engine.timer);const context=engine.context;if(!context)return;
  try{engine.master.gain.cancelScheduledValues(context.currentTime);engine.master.gain.setTargetAtTime(0.0001,context.currentTime,fade/3)}catch(_){/*—*/}
  const nodes=engine.nodes;engine.nodes=[];
  setTimeout(()=>nodes.forEach(node=>{try{node.stop?.()}catch(_){/*—*/}try{node.disconnect?.()}catch(_){/*—*/}}),fade*1000+80)}
async function engineStart(kind){if(!engine.context){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return false;
    engine.context=new Context();engine.master=engine.context.createGain();engine.master.gain.value=0.0001;engine.master.connect(engine.context.destination)}
  if(engine.context.state==='suspended')await engine.context.resume().catch(()=>{});
  engineStop(0.12);await new Promise(r=>setTimeout(r,140));runtimeSound=true;buildSound(kind);
  const target=Math.max(0.0001,(prefs.volume/100)*0.9);
  engine.master.gain.cancelScheduledValues(engine.context.currentTime);
  engine.master.gain.setValueAtTime(0.0001,engine.context.currentTime);
  engine.master.gain.setTargetAtTime(target,engine.context.currentTime,0.6);return true}
function engineVolume(){if(!engine.context||!runtimeSound)return;
  try{engine.master.gain.setTargetAtTime(Math.max(0.0001,(prefs.volume/100)*0.9),engine.context.currentTime,0.2)}catch(_){/*—*/}}

/* ══════════ الحالة والعرض ══════════ */
const backdrop=()=>one('#stdBackdrop'),videoEl=()=>one('#ambientVideo'),imageEl=()=>one('#ambientImage'),audioEl=()=>one('#ambientAudio');
const activeSound=()=>prefs.sound==='auto'?(SCENES[prefs.mode]?.sound||''):(prefs.sound==='none'?'':prefs.sound);
const hasFileSound=()=>Boolean(prefs.audioName)||(prefs.mode==='custom'&&prefs.mediaType.startsWith('video/'));

function applyControls(){const root=document.documentElement;
  root.style.setProperty('--ambient-dim',String(prefs.dim/100));
  root.style.setProperty('--ambient-blur',prefs.blur+'px');
  root.style.setProperty('--ambient-paper',String(prefs.paper/100));
  root.style.setProperty('--ambient-veil',String(prefs.veil/100));
  root.dataset.surface=prefs.surface;
  const set=(id,v)=>{const el=one(id);if(el)el.value=v};
  set('#ambDim',prefs.dim);set('#ambPaper',prefs.paper);set('#ambBlur',prefs.blur);set('#ambVolume',prefs.volume);set('#ambVeil',prefs.veil);
  const txt=(id,v)=>{const el=one(id);if(el)el.textContent=v};
  txt('#ambDimValue',AR(prefs.dim)+'٪');txt('#ambPaperValue',AR(prefs.paper)+'٪');txt('#ambBlurValue',AR(prefs.blur)+'px');txt('#ambVolumeValue',AR(prefs.volume)+'٪');txt('#ambVeilValue',AR(prefs.veil)+'٪');
  one('#ambMotion')?.classList.toggle('on',prefs.motion);
  one('#ambCoverLib')?.classList.toggle('on',!!prefs.coverLib);
  backdrop()?.classList.toggle('motion',prefs.motion);
  many('[data-only]').forEach(n=>{n.hidden=!n.dataset.only.split(' ').includes(prefs.surface)});
  const v=videoEl(),a=audioEl();if(v)v.volume=prefs.volume/100;if(a)a.volume=prefs.volume/100;
  engineVolume()}

function renderLabels(){const info=SCENES[prefs.mode]||SCENES.original;
  const now=one('#ambNow'),sub=one('#ambNowSub'),st=one('#prefsAmbStatus');
  if(now)now.textContent=info.title;if(sub)sub.textContent=info.hint;
  if(st)st.textContent=prefs.mode==='original'?'الخلفية الأصلية':info.title+' · '+(SURFACES[prefs.surface]?.[0]||'');
  const mn=one('#ambMediaName'),an=one('#ambAudioName');
  if(mn)mn.textContent=prefs.mediaName||'PNG · JPG · MP4 · MOV';
  if(an)an.textContent=prefs.audioName||'صوت البحر أو المطر مثلًا';
  many('.amb-preset').forEach(b=>b.classList.toggle('on',b.dataset.mode===prefs.mode));
  many('.amb-surface').forEach(b=>b.classList.toggle('on',b.dataset.surface===prefs.surface));
  const sound=activeSound();
  many('.amb-sound').forEach(b=>{const value=b.dataset.sound;b.classList.toggle('on',prefs.sound==='auto'?value===(sound||'none'):prefs.sound===value)});
  one('#ambSoundFile')?.classList.toggle('ready',hasFileSound());
  const play=one('#ambSound');play?.classList.toggle('on',runtimeSound);
  const lbl=one('#ambSoundLabel'),hint=one('#ambSoundHint');
  if(lbl)lbl.textContent=runtimeSound?'إيقاف الصوت':'تشغيل الصوت';
  if(hint)hint.textContent=sound==='file'?(prefs.audioName?'ملفك: '+prefs.audioName:'صوت الفيديو المرفوع'):sound?SOUNDS[sound]+' — يُولَّد داخل جهازك بلا تنزيل':'اختر صوتًا من القائمة أعلاه';
  const dock=one('#stdSoundDock');
  if(dock){dock.classList.toggle('on',Boolean(sound)&&prefs.mode!=='original');dock.classList.toggle('playing',runtimeSound);
    const i=one('i',dock),s=one('span',dock);if(i)i.textContent=runtimeSound?'🔊':'🔇';if(s)s.textContent=runtimeSound?'إيقاف الصوت':'تشغيل الصوت'}}

function stopSound(){runtimeSound=false;engineStop(0.45);const v=videoEl(),a=audioEl();if(v)v.muted=true;if(a)a.pause();renderLabels()}
async function loadUploadedAudio(){const record=await getMedia('ambience:audio').catch(()=>null);
  if(!record?.blob)return false;if(soundUrl)URL.revokeObjectURL(soundUrl);soundUrl=URL.createObjectURL(record.blob);
  const a=audioEl();a.src=soundUrl;a.volume=prefs.volume/100;return true}
async function toggleSound(){if(runtimeSound){stopSound();return}
  const sound=activeSound();if(!sound)return say('اختر صوتًا من قائمة «الصوت المصاحب»');
  try{if(sound==='file'){const a=audioEl(),v=videoEl();
      if(prefs.audioName&&await loadUploadedAudio()){v.muted=true;await a.play()}
      else if(prefs.mode==='custom'&&prefs.mediaType.startsWith('video/')){v.muted=false;v.volume=prefs.volume/100;await v.play()}
      else return say('ارفع ملف صوت أو فيديو يحتوي على صوت أولًا');
      runtimeSound=true}
    else if(!await engineStart(sound))return say('تشغيل الصوت غير مدعوم في هذا المتصفح');
    renderLabels()}
  catch(_){stopSound();say('اضغط مرة أخرى للسماح بتشغيل الصوت')}}

async function applyAmbience(){const wasPlaying=runtimeSound,previousSound=activeSound();
  const bd=backdrop(),v=videoEl(),img=imageEl(),scene=one('#ambientScene');
  if(!bd)return;
  v.pause();v.removeAttribute('src');img.removeAttribute('src');img.classList.remove('on');v.classList.remove('on');scene.innerHTML='';
  if(backdropUrl)URL.revokeObjectURL(backdropUrl);backdropUrl='';
  const info=SCENES[prefs.mode]||SCENES.original,active=prefs.mode!=='original';
  if(active&&!prefs.surfaceTouched&&prefs.surface==='paper')prefs.surface='glass';
  document.documentElement.classList.toggle('std-amb',active);
  bd.dataset.scene=active?prefs.mode:'';
  if(active){bd.style.visibility='visible';void bd.offsetHeight}
  bd.classList.toggle('on',active);
  if(!active)bd.style.visibility='';
  applyControls();renderLabels();
  if(!active){if(wasPlaying)stopSound();syncBackdrop();return}
  syncBackdrop();
  if(info.kind==='photo'){img.src=info.file;img.classList.add('on')}
  else if(info.kind==='live'){scene.innerHTML=liveScene(prefs.mode)}
  else if(info.kind==='custom'){const record=await getMedia('ambience:background').catch(()=>null);
    if(!record?.blob){setPref('mode','original');await applyAmbience();say('اختر صورة أو فيديو من جهازك أولًا');return}
    backdropUrl=URL.createObjectURL(record.blob);
    if(record.type.startsWith('video/')){v.src=backdropUrl;v.muted=true;v.classList.add('on');v.play().catch(()=>{})}
    else{img.src=backdropUrl;img.classList.add('on')}}
  const nextSound=activeSound();
  if(wasPlaying&&nextSound&&nextSound!==previousSound){stopSound();await toggleSound()}
  else if(wasPlaying&&!nextSound)stopSound();
  else renderLabels()}

/* ══════════ الفتح والإغلاق ══════════ */
/* «المشهد خلف المكتبة أيضًا»: بدونها يظهر المشهد داخل القراءة فقط */
function syncBackdrop(){const bd=backdrop();if(!bd)return;
  const active=prefs.mode!=='original';if(!active)return;
  const inReader=!one('#reader')?.classList.contains('hidden');
  const show=inReader||!!prefs.coverLib;
  bd.classList.toggle('on',show);
  bd.style.visibility=show?'visible':'';
  const v=videoEl();if(v){if(show&&v.src&&v.paused)v.play().catch(()=>{});if(!show&&!v.paused)v.pause()}}

function openAmbience(){pausePro();applyControls();renderLabels();
  const sheet=one('#shAmbience');if(!sheet)return;
  if(typeof openSheet==='function')openSheet(sheet);
  else{one('#shade')?.classList.add('on');sheet.classList.add('on')}}
function closeAmbience(){const sheet=one('#shAmbience');
  if(typeof closeSheets==='function')closeSheets();
  else{one('#shade')?.classList.remove('on');sheet?.classList.remove('on')}}

function bind(){
  css();skeleton();
  many('[data-amb-close]').forEach(b=>b.onclick=closeAmbience);
  one('#shade')?.addEventListener('click',()=>{/* closeSheets في الصفحة يتكفل بالإغلاق */});
  many('.amb-preset').forEach(b=>{b.onclick=async()=>{setPref('mode',b.dataset.mode);await applyAmbience()}});
  many('.amb-surface').forEach(b=>{b.onclick=()=>{setPref('surfaceTouched',true);setPref('surface',b.dataset.surface);applyControls();renderLabels()}});
  many('.amb-sound').forEach(b=>{b.onclick=async()=>{const value=b.dataset.sound;
    if(value==='file'&&!hasFileSound()){one('#ambPickAudio')?.click();return}
    setPref('sound',value);renderLabels();
    if(value==='none'){stopSound();return}
    if(runtimeSound){stopSound();await toggleSound()}}});
  one('#ambOriginal').onclick=async()=>{setPref('mode','original');setPref('coverLib',false);setPref('surfaceTouched',false);setPref('surface','paper');await applyAmbience();say('عادت خلفية القارئ الأصلية ✓')};
  one('#ambPickMedia').onclick=()=>one('#ambMediaInput')?.click();
  one('#ambPickAudio').onclick=()=>one('#ambAudioInput')?.click();
  one('#ambMediaInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;
    if(!/^(image|video)\//.test(file.type))return say('اختر صورة أو فيديو صالحًا');
    if(file.size>150*1024*1024)return say('حجم الخلفية يجب ألا يتجاوز ١٥٠ م.ب');
    say('يتم حفظ الخلفية على جهازك…');
    await putMedia({id:'ambience:background',name:file.name,type:file.type,size:file.size,createdAt:Date.now(),blob:file}).catch(()=>null);
    prefs={...prefs,mode:'custom',mediaName:file.name,mediaType:file.type};setPref('mode','custom');setPref('mediaName',file.name);setPref('mediaType',file.type);
    await applyAmbience();say('تم تطبيق خلفيتك الخاصة ✓')};
  one('#ambAudioInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;
    if(!file.type.startsWith('audio/'))return say('اختر ملفًا صوتيًا صالحًا');
    if(file.size>60*1024*1024)return say('حجم الصوت يجب ألا يتجاوز ٦٠ م.ب');
    say('يتم حفظ الصوت على جهازك…');
    await putMedia({id:'ambience:audio',name:file.name,type:file.type,size:file.size,createdAt:Date.now(),blob:file}).catch(()=>null);
    setPref('audioName',file.name);setPref('sound','file');renderLabels();
    if(runtimeSound)stopSound();await toggleSound()};
  const slider=(id,key,out,suffix='')=>{const el=one(id);if(!el)return;el.oninput=e=>{setPref(key,+e.target.value);const o=one(out);if(o)o.textContent=AR(e.target.value)+suffix;applyControls()}};
  slider('#ambDim','dim','#ambDimValue','٪');slider('#ambPaper','paper','#ambPaperValue','٪');
  slider('#ambVeil','veil','#ambVeilValue','٪');slider('#ambBlur','blur','#ambBlurValue','px');slider('#ambVolume','volume','#ambVolumeValue','٪');
  one('#ambMotion').onclick=()=>{setPref('motion',!prefs.motion);applyControls()};
  one('#ambCoverLib').onclick=()=>{setPref('coverLib',!prefs.coverLib);applyControls();applyAmbience()};
  one('#ambSound').onclick=toggleSound;
  one('#stdSoundDock').onclick=toggleSound;
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&runtimeSound)stopSound()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&one('#shAmbience')?.classList.contains('on'))closeAmbience()});
}

/* ══════════ حركات الدخول ══════════ */
function motionFx(){
  /* بطاقات المكتبة وفهرس الفصول: دخول متدرج هادئ */
  const stagger=(wrap,sel)=>{const items=many(sel,wrap);items.forEach((el,i)=>{if(i>18)return;
    el.classList.remove('std-fx-card');void el.offsetWidth;el.style.animationDelay=(i*28)+'ms';el.classList.add('std-fx-card')})};
  const views=['library','toc','reader'];
  const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(()=>{
    const lib=one('#library');if(lib&&!lib.classList.contains('hidden'))stagger(lib,'.card');
    const toc=one('#toc');if(toc&&!toc.classList.contains('hidden'))stagger(toc,'.ci');
    const rd=one('#reader');if(rd&&!rd.classList.contains('hidden')){rd.classList.remove('std-fx-chapter');void rd.offsetWidth;rd.classList.add('std-fx-chapter')}
  },60)});
  views.forEach(v=>{const el=one('#'+v);if(el)mo.observe(el,{childList:true,subtree:false})});
  /* مزامنة ظهور المشهد مع تنقّل المستخدم بين المكتبة والفهرس والقراءة */
  const vo=new MutationObserver(()=>{clearTimeout(vo._t);vo._t=setTimeout(syncBackdrop,50)});
  views.forEach(v=>{const el=one('#'+v);if(el)vo.observe(el,{attributes:true,attributeFilter:['class']})});
}

function init(){bind();motionFx();applyAmbience();
  window.KosifStandardsAmbience={version:'36.4',apply:applyAmbience,open:openAmbience,toggleSound,scenes:SCENES}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
