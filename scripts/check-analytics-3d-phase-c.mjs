import fs from 'node:fs';

const js=fs.readFileSync('public/v36-analytics-3d.js','utf8');
const css=fs.readFileSync('public/v36-analytics-3d.css','utf8');
const cont=fs.readFileSync('public/v36-continuity.js','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const failures=[];
const ok=(name,value)=>{console.log(`${value?'✓':'✗'} ${name}`);if(!value)failures.push(name)};

ok('3D reads deterministic Kosif analytics',/KosifOperations\?\.getAnalysis/.test(js)&&/KosifOperations\?\.riskItems|findings/.test(js));
ok('3D module does not synthesize random business data',!/Math\.random|faker|mockData|generatedSample/i.test(js));
ok('no AI inference is used for chart coordinates',!/fetch\(|\/api\/ai|Gemini|OpenAI|Claude|anthropic/i.test(js));
ok('3D is a real projected coordinate view',/function project\(p,w,h\)/.test(js)&&/Math\.cos\(yaw\)/.test(js)&&/Math\.sin\(yaw\)/.test(js));
ok('interactive canvas supports pointer rotation',/getContext\('2d'/.test(js)&&/pointerdown/.test(js)&&/pointermove/.test(js)&&/setPointerCapture/.test(js));
ok('keyboard can rotate the 3D view',/ArrowLeft/.test(js)&&/ArrowRight/.test(js)&&/ArrowUp/.test(js)&&/ArrowDown/.test(js));
ok('2D and table fallbacks are always present',/data-k3-view="2d"/.test(js)&&/data-k3-view="table"/.test(js)&&/function bars\(\)/.test(js)&&/function table\(\)/.test(js));
ok('empty state does not auto-create demo data',/لا توجد بيانات تحليلية بعد/.test(js)&&/لن ينشئ Kosif بيانات تجريبية تلقائيًا/.test(js));
ok('reduced motion stops automatic rotation',/prefers-reduced-motion: reduce/.test(js)&&/if\(reduced\(\)\|\|view!=='3d'/.test(js));
ok('3D module is lazy loaded only for analytics',/ANALYTICS_3D_SRC/.test(cont)&&/e\.detail\?\.view==='analytics'/.test(cont)&&/requestIdleCallback/.test(cont));
ok('Phase C has no external CDN dependency',!/(?:https?:)?\/\//.test(js)&&!/(?:https?:)?\/\//.test(css));
ok('canvas has accessible role and text fallback path',/role="img"/.test(js)&&/tabindex="0"/.test(js)&&/عرض الجدول/.test(js));
ok('touch and mobile rendering are explicit',/touch-action:none/.test(css)&&/@media\(max-width:720px\)/.test(css));
ok('Phase C assets work offline',/v36-analytics-3d\.js/.test(sw)&&/v36-analytics-3d\.css/.test(sw));

if(failures.length){console.error(`ANALYTICS_3D_PHASE_C_FAILED ${failures.length}`);for(const f of failures)console.error(` - ${f}`);process.exit(2)}
console.log('ANALYTICS_3D_PHASE_C_OK');
