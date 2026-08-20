import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReaderPackageFromText, directBookUrl, textToPages } from '../src/engine/book-import-v44.mjs';

test('v44 preserves provenance while removing page boilerplate',()=>{
  const text=[
    'الهيئة السعودية للمراجعين والمحاسبين\n1\nالفصل الأول\nمقدمة\nهذا نص مهني صحيح في الصفحة الأولى.',
    'الهيئة السعودية للمراجعين والمحاسبين\n2\nالقسم الأول\nهذا نص مهني صحيح في الصفحة الثانية.',
    'الهيئة السعودية للمراجعين والمحاسبين\n3\nالخلاصة\nهذا نص مهني صحيح في الصفحة الثالثة.'
  ].join('\n--- PAGE ---\n');
  const {book,readerPackage}=buildReaderPackageFromText({id:'demo-standards',title:'دليل مهني',text,authority:'official',source:{issuer:'SOCPA',edition:'2025'}});
  assert.equal(textToPages(text).length,3);
  assert.equal(book.stats.pages,3);
  assert.ok(book.removedArtifacts.some(x=>x.reason==='repeating-header-footer'));
  assert.ok(book.removedArtifacts.some(x=>x.reason==='page-number'));
  assert.ok(book.nodes.every(n=>n.raw!==undefined&&n.source));
  assert.ok(readerPackage.reader.chapters.length>=1);
  assert.equal(readerPackage.reader.professionalAuthority,true);
});

test('v44 reader package keeps list context and produces direct URL',()=>{
  const text='الفصل الأول\n• الإفصاح مطلوب.\n• الإفصاح مطلوب.\n\nالفصل الثاني\nنص مستقل.';
  const {book,readerPackage}=buildReaderPackageFromText({id:'x',title:'كتاب',text});
  const list=book.nodes.filter(n=>n.type==='list_item');
  assert.equal(list.length,2,'repeated list items must not be silently deleted');
  assert.equal(readerPackage.reader.id,'x');
  assert.equal(directBookUrl('b3',17),'/standards/?book=b3&chapter=17');
});
