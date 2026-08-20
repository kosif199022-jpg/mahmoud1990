import fs from 'node:fs';

const css=fs.readFileSync('public/v36-mobile-phase-b.css','utf8');
const js=fs.readFileSync('public/v36-continuity.js','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const failures=[];
const ok=(name,value)=>{console.log(`${value?'✓':'✗'} ${name}`);if(!value)failures.push(name)};

ok('Phase B stylesheet is dynamically loaded',/v36-mobile-phase-b\.css\?v=36\.4-phase-b-2-scroll/.test(js)&&/loadPhaseBStyles/.test(js));
ok('VisualViewport drives usable mobile height',/window\.visualViewport/.test(js)&&/--k-vv-height/.test(js)&&/--k-vv-top/.test(js));
ok('keyboard state is explicit',/dataset\.kosifKeyboard=keyboard\?'open':'closed'/.test(js)&&/data-kosif-keyboard="open"/.test(css));
ok('iOS body lock remains exact',/lockY=Math\.max\(0,window\.scrollY\|\|document\.documentElement\.scrollTop\|\|0\)/.test(js)&&/b\.style\.top=`-\$\{lockY\}px`/.test(js)&&/window\.scrollTo\(0,y\)/.test(js));
ok('focus stays trapped inside the active dialog',/function trapTab\(e,el\)/.test(js)&&/focusable\(el\)/.test(js));
ok('background touch movement is blocked',/touchmove/.test(js)&&/passive:false/.test(js)&&/e\.stopPropagation\(\)/.test(js));
ok('sheet owns vertical momentum scrolling',/-webkit-overflow-scrolling:touch/.test(css)&&/touch-action:pan-y/.test(css)&&/overscroll-behavior:contain/.test(css));
ok('body lock does not cancel Safari sheet gestures',/body\[data-kosif-dialog-open="1"\]\{touch-action:auto!important/.test(css)&&!/b\.style\.touchAction='none'/.test(js));
ok('all dialog families share the continuity lock',/ks40-launch-overlay/.test(js)&&/#modal-bg/.test(js)&&/#drawer/.test(js)&&/attributeFilter:\['class','hidden'\]/.test(js));
ok('capability launcher owns touch scrolling',/#ks40-launch-overlay[\s\S]*\.ks40-launch-body[\s\S]*touch-action:pan-y/.test(css));
ok('safe area insets cover every edge',/safe-area-inset-top/.test(css)&&/safe-area-inset-right/.test(css)&&/safe-area-inset-bottom/.test(css)&&/safe-area-inset-left/.test(css));
ok('iPhone inputs avoid Safari focus zoom',/@media\(max-width:720px\)[\s\S]*font-size:16px!important/.test(css));
ok('bottom nav yields to software keyboard',/data-kosif-keyboard="open"\] #kosif-bottom-nav/.test(css)&&/pointer-events:none!important/.test(css));
ok('wide tables retain sticky account context',/table\.data th:first-child,table\.data td:first-child/.test(css)&&/position:sticky/.test(css));
ok('touch devices do not retain hover lifts',/@media\(hover:none\) and \(pointer:coarse\)/.test(css)&&/transform:none!important/.test(css));
ok('Phase B works offline',/v36-mobile-phase-b\.css/.test(sw));

if(failures.length){console.error(`MOBILE_PHASE_B_FAILED ${failures.length}`);for(const f of failures)console.error(` - ${f}`);process.exit(2)}
console.log('MOBILE_PHASE_B_OK');
