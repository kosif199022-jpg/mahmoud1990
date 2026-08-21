import fs from 'node:fs';

const build = fs.readFileSync('scripts/build-assets.mjs','utf8');
const reader = fs.readFileSync('public/wealth-library-v37.js','utf8');
const delayed = "if(initialId!=='mafateeh')setTimeout(()=>switchBook(initialId),700);";
const direct = "if(initialId!=='mafateeh')queueMicrotask(()=>switchBook(initialId));";

if (!build.includes(delayed) || !build.includes(direct)) {
  throw new Error('Direct-book build transform is missing');
}
if (!reader.includes(delayed) && !reader.includes(direct)) {
  throw new Error('Wealth reader requested-book bootstrap contract is missing');
}
const simulatedBuild = reader.includes(delayed) ? reader.replace(delayed, direct) : reader;
if (simulatedBuild.includes(delayed) || !simulatedBuild.includes(direct)) {
  throw new Error('Build transform does not remove the 700ms requested-book delay');
}

console.log('KOSIF direct requested-book bootstrap v45 OK');
