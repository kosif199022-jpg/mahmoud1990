import fs from 'node:fs';

const must=(cond,msg)=>{if(!cond)throw new Error(`V44_BOOK_GATE:${msg}`)};
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const reader=read('public/standards/reader-pro-v36.js');
const addon=read('public/standards/custom-books-v44.js');
const brain=read('public/system-brain-v1.js');
const importer=read('public/system-brain-import-v44.js');
const vault=read('public/kosif-book-vault-v44.js');
const sw=read('public/standards/sw.js');

must(reader.includes('reader-pro-v36-base.js'),'reader base preservation missing');
must(reader.includes('kosif-book-vault-v44.js'),'reader vault loader missing');
must(reader.includes('custom-books-v44.js'),'reader direct routing addon missing');
must(addon.includes("searchParams.set('book'"),'book URL state missing');
must(addon.includes('readerJsonForPath'),'local book jget bridge missing');
must(addon.includes("/^b[1-4]$/"),'static book route allowlist missing');
must(brain.includes('system-brain-v1-base.js'),'System Brain base preservation missing');
must(brain.includes('system-brain-import-v44.js'),'System Brain importer loader missing');
must(importer.includes('استيراد وتقسيم الكتاب'),'System Brain import UI missing');
must(importer.includes('/standards/?book='),'System Brain direct reader link missing');
must(vault.includes("BOOK_EXTRACTION_REQUIRED"),'unsupported binary extraction guard missing');
must(vault.includes('consecutive-exact-duplicate'),'conservative duplicate cleanup missing');
must(sw.includes('kosif-native-v44-standards'),'standards service-worker cache was not bumped');
must(sw.includes('/standards/custom-books-v44.js'),'custom reader addon not precached');
console.log('v44 direct books + System Brain ingestion gate passed');
