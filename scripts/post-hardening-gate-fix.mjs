import fs from 'node:fs';
const p='scripts/deep-audit-v36.mjs';
let s=fs.readFileSync(p,'utf8');
const old="'Browser payload validator wired':/validate-payloads\\.mjs/.test(src.checker)&&/check-all\\.mjs/.test(src.pkg)&&fs.existsSync('scripts/validate-payloads.mjs'),";
const next="'Browser payload validator wired':/validate-payloads\\.mjs/.test(src.pkg)&&/check-all\\.mjs/.test(src.pkg)&&fs.existsSync('scripts/validate-payloads.mjs'),";
if(!s.includes(old)) throw new Error('Browser payload gate anchor missing');
s=s.replace(old,next);
fs.writeFileSync(p,s);
console.log('KOSIF_POST_HARDENING_GATE_FIX_OK');
