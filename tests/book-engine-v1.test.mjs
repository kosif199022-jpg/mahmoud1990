import assert from 'node:assert/strict';
import { buildBookDocument, bookToSearchRecords, validateBookDocument, normalizeText } from '../src/engine/book-engine-v1.mjs';

const book = buildBookDocument({
  id: 'demo-standard',
  title: 'دليل تجريبي',
  authority: 'official-guidance',
  source: { issuer: 'SOCPA', edition: '2025' },
  pages: [
    { page: 1, text: 'الهيئة السعودية للمراجعين والمحاسبين\nالباب الأول\nمقدمة\nهذا نص تمهيدي.\n1' },
    { page: 2, text: 'الهيئة السعودية للمراجعين والمحاسبين\nالفصل الأول\nالقسم (1) - العرض\n• بند أول\nهذا نص أساسي.\n2' },
    { page: 3, text: 'الهيئة السعودية للمراجعين والمحاسبين\nالفصل الثاني\nهذا نص أساسي.\n3' }
  ]
});

assert.equal(book.schema, 'kosif.book.v1');
assert.equal(book.stats.pages, 3);
assert.ok(book.outline.some(x => x.level === 'part'));
assert.ok(book.outline.some(x => x.level === 'chapter'));
assert.ok(book.outline.some(x => x.level === 'section'));
assert.ok(book.removedArtifacts.some(x => x.reason === 'repeating-header-footer'));
assert.ok(book.removedArtifacts.some(x => x.reason === 'page-number'));
assert.ok(book.removedArtifacts.some(x => x.reason === 'exact-duplicate'));
assert.ok(book.nodes.every(n => n.raw !== undefined && n.source));
assert.equal(validateBookDocument(book).ok, true);
assert.equal(bookToSearchRecords(book).length, book.nodes.length);
assert.equal(normalizeText('نص   ،تجريبي'), 'نص، تجريبي');

const repeatedList = buildBookDocument({
  title: 'قائمة',
  pages: [{ page: 1, text: '• بند\n• بند' }]
});
assert.equal(repeatedList.nodes.filter(n => n.type === 'list_item').length, 2, 'list items are not silently deduplicated');

const distantRepeat = buildBookDocument({
  title: 'معيار طويل',
  pages: [
    { page: 1, text: 'الفصل الأول\nيجب عرض المعلومة الجوهرية.' },
    { page: 2, text: 'الفصل الثاني\nنص مختلف أول.\nنص مختلف ثان.\nنص مختلف ثالث.' },
    { page: 3, text: 'الفصل الثالث\nنص مختلف رابع.\nنص مختلف خامس.\nنص مختلف سادس.' },
    { page: 4, text: 'الفصل الرابع\nيجب عرض المعلومة الجوهرية.' }
  ]
});
assert.equal(distantRepeat.nodes.filter(n => n.text === 'يجب عرض المعلومة الجوهرية.').length, 2, 'distant professional repeats must be preserved');
assert.ok(distantRepeat.flags.includes('contains-distant-repeated-text'));

const flat = buildBookDocument({ title: 'Flat', language: 'en', pages: [{ page: 1, text: 'A long paragraph that ends with a period.' }] });
assert.ok(flat.flags.includes('flat-structure-needs-review'));

console.log('book-engine-v1: ok');
