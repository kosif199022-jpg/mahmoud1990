import fs from'node:fs';
const src='frontend/index.html',out='public/index.html';
fs.copyFileSync(src,out);
let html=fs.readFileSync(out,'utf8');
const tag='<script src="/v38-release-integrity-fix.js?v=20260819-3"></script>';
if(!html.includes('/v38-release-integrity-fix.js'))html=html.replace(/<\/body>/i,tag+'</body>');
fs.writeFileSync(out,html);
console.log('Kosif v38 production assets ready');
