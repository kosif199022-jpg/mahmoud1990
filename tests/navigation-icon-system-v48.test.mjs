import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('public/kosif-navigation-v48.css','utf8');
const js = fs.readFileSync('public/kosif-navigation-v48.js','utf8');
const loader = fs.readFileSync('public/kosif-workspace-stability-loader-v42.js','utf8');

test('v48 navigation runtime remains syntactically valid', () => {
  assert.doesNotThrow(() => new Function(js));
});

test('v48 exposes the five mobile navigation destinations', () => {
  for (const marker of ["'overview', 'الرئيسية'", "'rounds', 'المراجعة'", "'analytics', 'التحليلات'", "'المجلس'", "<span>المزيد</span>"]) {
    assert.ok(js.includes(marker), `missing mobile navigation marker: ${marker}`);
  }
});

test('v48 keeps desktop rail and semantic more actions', () => {
  assert.ok(js.includes('k48-desktop-rail'));
  assert.ok(js.includes('decorateMore'));
  assert.ok(js.includes('k48-action-icon'));
  assert.ok(css.includes('@media (min-width:1180px)'));
  assert.ok(css.includes('#k48-desktop-rail'));
  assert.ok(css.includes('#kosif-more .kosif-action.k48-action'));
});

test('v48 preserves mobile ergonomics and dialog scrolling', () => {
  assert.ok(css.includes('repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('env(safe-area-inset-bottom)'));
  assert.ok(css.includes('-webkit-overflow-scrolling:touch'));
  assert.ok(css.includes('min-height:52px'));
});

test('workspace loader mounts v48 after v47', () => {
  const v47 = loader.indexOf('kosif-audit-workspace-v47-runtime');
  const v48 = loader.indexOf('kosif-navigation-v48-runtime');
  assert.ok(v47 >= 0 && v48 > v47, 'v48 runtime must load after v47');
  assert.ok(loader.includes('/kosif-navigation-v48.css?v=2026.08.22-1'));
  assert.ok(loader.includes('/kosif-navigation-v48.js?v=2026.08.22-1'));
});
