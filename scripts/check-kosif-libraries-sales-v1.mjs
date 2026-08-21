import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const ok=(c,m)=>{if(!c)throw new Error('KOSIF_LIBRARIES_SALES_FAIL: '+m);console.log('  ✅ '+m)};
const libraries=read('public/libraries/index.html');
const proxy=read('src/suite-proxy.js');
const edge=read('src/suite-edge.js');
const wealthLibrary=read('public/wealth-library-v37.js');
const sales=read('public/sales/index.html');
const salesRuntime=read('public/sales/sales.js');
const motion=read('public/sales/sales-motion-v1.js');
const motionCss=read('public/sales/sales-motion-v1.css');
const sw=read('public/sw.js');
const stdLibrary=JSON.parse(read('public/standards/data/library.json'));

ok(edge.includes("libraries:'/libraries/'")&&edge.includes("p==='/libraries'"),'Libraries is a first-class Kosif route');
for(const id of ['mafateeh','std2025','std2018','dipifr'])ok(libraries.includes(`/wealth/reader.html?book=${id}`),`book ${id} opens in the original Mafateeh reader route`);
ok(!/<iframe[^>]+\.pdf/i.test(libraries)&&!libraries.includes('application/pdf'),'standards are not presented as ordinary embedded PDFs');
ok(libraries.includes('قارئ مفاتيح الثروة للجميع')&&libraries.includes('لا يتم إنشاء قارئ منفصل'),'library UI documents the single-reader template contract');

ok(proxy.includes("LIBRARY_BOOKS = new Set(['mafateeh', 'std2018', 'std2025', 'dipifr'])"),'reader identities remain allowlisted');
ok(!proxy.includes('PREPARED_BOOKS')&&!proxy.includes('preparedReaderRedirect'),'prepared books are no longer routed to a separate reader');
ok(proxy.includes("const book = requestedLibraryBook(url) || 'mafateeh'")&&proxy.includes("localStorage.setItem('mk_lib_book'"),'missing book identity deterministically resets to Mafateeh');
ok(proxy.includes('function exposeReaderRuntimeBindings(text)')&&proxy.includes("replace(dConst, 'var D = ')")&&proxy.includes("replace(chConst, 'var CH = ')")&&proxy.includes('text = exposeReaderRuntimeBindings(text)'),'proxied reader exposes the original D/CH bindings for prepared-book replacement');
ok(proxy.includes('function replaceLegacyReaderLibrary(text)')&&proxy.includes('/wealth-library-v37.js'),'any upstream four-book layer is normalized to the Kosif compatibility layer');
ok(proxy.includes('#mixerDock,#smartHubDock,#libBtn,#mixLaunch')&&proxy.includes('#smartPebble,.smart-pebble') ,'Mixer, Smart Library and internal library dock stay hidden on the default reader screen');
ok(!proxy.includes('/wealth-theme-v37.css')&&!proxy.includes("injections.push('<script src=\"/suite-shell.js\""),'reader keeps the original Mafateeh navy/gold screen without suite/theme overrides');
ok(proxy.includes('function injectHtmlFragments(text, fragments)')&&proxy.includes('return text.replace(/<\\/body>/i')&&proxy.includes('return text.replace(/<\\/html>/i')&&proxy.includes('return text + payload'),'reader integration survives unusual upstream HTML shape');
ok(proxy.includes('function isReaderHtmlRequest(contentType = \'\', requestUrl = null)')&&proxy.includes("p === '/wealth/reader.html'")&&proxy.includes("p === '/wealth/reader'")&&proxy.includes("p === '/wealth/'"),'canonical Wealth routes are recognized as HTML without trusting upstream MIME');
ok(proxy.includes('function isRedirect(r)')&&proxy.includes('let redirectFallback = null'),'reader aliases still resolve real HTML before fallback redirects');

ok(wealthLibrary.includes('__KOSIF_WEALTH_LIBRARY__')&&!wealthLibrary.includes('__KOSIF_WEALTH_LIBRARY_ROUTER__'),'shared four-book runtime layer is active instead of the isolation router');
ok(wealthLibrary.includes('window.D=D;window.CH=CH;curId=id'),'book switch writes the selected model into the same D/CH bindings read by Mafateeh');
ok(wealthLibrary.includes("const initialId=ALLOWED.includes(requested)?requested:'mafateeh'")&&wealthLibrary.includes("LS.set('book',initialId)"),'Mafateeh is the deterministic default even after an earlier book selection');
ok(wealthLibrary.includes('function normalizeIndex(raw,info,id)')&&wealthLibrary.includes('function nativeParts(raw,id)'),'reader normalizes native Kosif book indexes and derives reader parts');
ok(wealthLibrary.includes('async function hydrate(i)')&&wealthLibrary.includes('__lazy:id'),'prepared chapters hydrate lazily inside the original reader');
ok(wealthLibrary.includes('#libBtn{display:none!important'),'internal library button is present only as latent capability and is not visible by default');
ok(wealthLibrary.includes("cache:'no-store'")&&wealthLibrary.includes("const BOOK_BASE='/wealth/books'"),'book identity/content fetches bypass stale browser cache');
ok(wealthLibrary.includes("info.embedded")&&wealthLibrary.includes('D0=window.D,CH0=window.CH'),'returning to Mafateeh restores the embedded original book model');
ok(wealthLibrary.includes('prefers-reduced-motion:reduce')&&wealthLibrary.includes('min-width:44px'),'latent library sheet keeps reduced-motion and touch safeguards');
ok(!/Math\.random|crypto\.getRandomValues|\/api\/ai|openai|anthropic|gemini/i.test(wealthLibrary),'four-book compatibility layer has no random or AI inference path');

const runtime=vm.createContext({});
vm.runInContext("var D={meta:{title:'Mafateeh'}};var CH=[{title:'M'}];function readerTitle(){return D.meta.title};function readerChapter(){return CH[0].title}",runtime);
runtime.D={meta:{title:'Standards 2025'}};runtime.CH=[{title:'IFRS 1'}];
ok(vm.runInContext('readerTitle()',runtime)==='Standards 2025'&&vm.runInContext('readerChapter()',runtime)==='IFRS 1','classic-script var bindings make untouched reader functions follow the selected book');

ok(edge.includes("std2018:{source:'b1'")&&edge.includes("std2025:{source:'b3'")&&edge.includes("dipifr:{source:'b2'"),'reader aliases map to the current Kosif standards datasets');
ok(edge.includes("p==='/wealth/books/library.json'")&&edge.includes("/^\\/wealth\\/books\\/(std2018|std2025|dipifr)\\.json$/")&&edge.includes("/^\\/wealth\\/books\\/(std2018|std2025|dipifr)\\/(\\d+)\\.json$/"),'library, index and chapter compatibility routes exist before the Wealth proxy');
ok(edge.includes("return redirect(req,`/standards/data/${cfg.source}.json`,307)")&&edge.includes("return redirect(req,`/standards/data/${cfg.source}/${n}.json`,307)"),'reader indexes and chapters redirect to native Kosif assets instead of being rebuilt at the edge');
ok(edge.indexOf("p.startsWith('/wealth/books/')")<edge.indexOf("p.startsWith('/wealth/')"),'local book compatibility routes win before the Mafateeh upstream proxy');
for(const id of ['b1','b2','b3','b4'])ok(stdLibrary.some(x=>x.id===id),`current standards data contains ${id}`);

ok(sales.includes('<title>تحليل المبيعات | Kosif</title>')&&!sales.includes('أغنام الوادي'),'Sales workspace is general in its visible shell');
ok(sales.includes('dir="rtl"')&&sales.includes('sales-side'),'general Sales preserves RTL right-side navigation structure');
ok(salesRuntime.includes("d?.meta?.source==='Aghnam v7 native integration'")&&salesRuntime.includes("d.sales.every((x,i)=>x?.id===`S-${i+1}`)")&&salesRuntime.includes('localStorage.getItem(LEGACY_STORE)'),'only the exact historical demo sample is migrated; imported user data is preserved');
ok(!/Math\.random|crypto\.getRandomValues/.test(motion),'3D visualization never synthesizes random business data');
ok(motion.includes("Number(r.revenue)||0")&&motion.includes('groupChannels()'),'3D channel heights come only from recorded deterministic revenue');
ok(motion.includes("prefers-reduced-motion")&&motion.includes("pointer: coarse")&&motionCss.includes('@media(prefers-reduced-motion:reduce)'),'motion has reduced-motion and touch-device fallbacks');
ok(motion.includes("data-mode=\"2d\"")||motion.includes("data-mode=\"3d\"")||motion.includes("panel.dataset.mode"),'3D view includes a table fallback mode');
ok(!/fetch\(|XMLHttpRequest|\/api\//.test(motion),'motion layer has no AI or network request path');
ok(sw.includes('/libraries/index.html')&&sw.includes('/sales/sales-motion-v1.js')&&sw.includes('/wealth-library-v37.js'),'Libraries, Sales and Wealth compatibility assets are PWA cached');
console.log('KOSIF_LIBRARIES_SALES_OK');
