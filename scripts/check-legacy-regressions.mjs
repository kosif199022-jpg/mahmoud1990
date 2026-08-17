import fs from 'node:fs';
const src=fs.readFileSync('src/legacy-worker.js','utf8');
const removed=[
'injectAccessibility','injectPWA','injectV10','injectKosifV11','injectKosifV12','injectKosifCleanV15','injectStandardsIntegration','injectKosifCacheRecovery','PWA_FIRST_RUN_HTML_V3',
'KOSIF_CACHE_RECOVERY','PWA_CLIENT','PWA_HEAD','PWA_FIRST_RUN_CLIENT','KOSIF_V11_CSS','KOSIF_V11_JS'
];
const leaked=removed.filter(n=>new RegExp('\\b'+n.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\b').test(src));
if(leaked.length){console.error('KOSIF_LEGACY_REGRESSION_FAIL',leaked);process.exit(1)}
for(const keep of ['PWA_MANIFEST','PWA_SW'])if(!new RegExp('\\b'+keep+'\\b').test(src)){console.error('KOSIF_REQUIRED_LEGACY_ROUTE_CONSTANT_MISSING',keep);process.exit(1)}
console.log('KOSIF_LEGACY_REGRESSION_OK',removed.length,'removed declarations blocked; routed PWA constants retained');
