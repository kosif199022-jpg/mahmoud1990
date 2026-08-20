import fs from 'node:fs';

fs.copyFileSync('frontend/index.html','public/index.html');

// The shared Mafateeh reader remains the visual/runtime shell, but a requested
// prepared standards book must be selected immediately. The old 700ms delay
// visibly rendered Mafateeh first and then jumped to the requested book.
const wealthPath='public/wealth-library-v37.js';
if(fs.existsSync(wealthPath)){
  const src=fs.readFileSync(wealthPath,'utf8');
  const delayed="if(initialId!=='mafateeh')setTimeout(()=>switchBook(initialId),700);";
  const direct="if(initialId!=='mafateeh')queueMicrotask(()=>switchBook(initialId));";
  if(src.includes(delayed)) fs.writeFileSync(wealthPath,src.replace(delayed,direct));
}

console.log('Kosif production assets ready — direct requested-book bootstrap enabled');
