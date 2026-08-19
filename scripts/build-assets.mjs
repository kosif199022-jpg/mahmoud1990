import fs from'node:fs';
const src=fs.readFileSync('frontend/index.html','utf8');
const v8='<script src="/kosif-canva-rose-v8.js?v=2026.08.20-rose-v8"></script>';
fs.writeFileSync('public/index.html',src.includes('kosif-canva-rose-v8.js')?src:src.replace('</body>',v8+'</body>'));
console.log('Kosif Native v35 assets ready');
