import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('company sheet treats owner auth as locked, never as an empty Cloudflare list', async () => {
  const js = await read('public/kosif-company-sheet-fix-v43.js');
  assert.match(js, /response\.status === 401/);
  assert.match(js, /OWNER_AUTH_REQUIRED/);
  assert.match(js, /credentials:\s*'same-origin'/);
  assert.match(js, /cache:\s*'no-store'/);
  assert.match(js, /بيانات الشركات محمية بجلسة المالك/);
  assert.match(js, /Cloudflare رفض القراءة/);
  assert.doesNotMatch(js, /ensureCurrentPublic\s*\(/, 'opening the drawer must not silently publish the current local company');
});

test('company create remains behind owner session and explicit user-action guard', async () => {
  const js = await read('public/kosif-company-sheet-fix-v43.js');
  const privacy = await read('public/v37-privacy-guard.js');
  const edge = await read('src/suite-edge.js');

  assert.match(js, /KosifAIGate\?\.open/);
  assert.match(js, /if \(!ownerUnlocked\(\)\)/);
  assert.match(privacy, /navigator\.userActivation\?\.isActive/);
  assert.match(privacy, /x-kosif-intent/);
  assert.match(edge, /OWNER_AUTH_REQUIRED/);
  assert.match(edge, /EXPLICIT_USER_ACTION_REQUIRED/);
  assert.match(edge, /x-kosif-intent/);
});

test('iPhone sheet owns the top layer and locks background scroll/navigation', async () => {
  const css = await read('public/kosif-company-sheet-fix-v43.css');
  assert.match(css, /body\.kosif-sheet-open/);
  assert.match(css, /body\.kosif-sheet-open #kosif-bottom-nav/);
  assert.match(css, /visibility:hidden!important/);
  assert.match(css, /#kosif-company-sheet[\s\S]*z-index:2147483100!important/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /-webkit-overflow-scrolling:touch!important/);
  assert.match(css, /overscroll-behavior:contain!important/);
});

test('audit stability loader ships the company patch with a fresh cache generation', async () => {
  const loader = await read('public/kosif-workspace-stability-loader-v42.js');
  const edge = await read('src/suite-edge-v43.js');
  assert.match(loader, /kosif-company-sheet-fix-v43\.css\?v=2026\.08\.21-1/);
  assert.match(loader, /kosif-company-sheet-fix-v43\.js\?v=2026\.08\.21-1/);
  assert.match(edge, /kosif-workspace-stability-loader-v42\.js\?v=2026\.08\.21-5/);
});
