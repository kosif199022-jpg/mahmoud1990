import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const screen = read('public/kosif-rec-screen-v54.js');
const bridge = read('public/kosif-rec-screen-integration-v55.js');
const edge = read('src/suite-edge-v51.js');

test('v54 exposes direct capture plus native-file fallback', () => {
  assert.match(screen, /navigator\.mediaDevices\?\.getDisplayMedia/);
  assert.match(screen, /window\.KosifScreenRecorder/);
  assert.match(screen, /type="file" accept="video\/\*"/);
  assert.match(screen, /kosif-rec-v51-start/);
  assert.match(screen, /kosif-rec-v51-stop/);
  assert.match(screen, /kosif-ux-replay-ready/);
});

test('v55 opens the fallback panel when v51 starts without direct display capture', () => {
  assert.match(bridge, /kosif-rec-v51-start/);
  assert.match(bridge, /directSupported\(\)/);
  assert.match(bridge, /KosifScreenRecorder/);
  assert.match(bridge, /api\?\.open/);
  assert.match(bridge, /detail\?\.state==='unsupported'/);
});

test('v55 reopens native-video import after the UX metadata session finishes', () => {
  assert.match(bridge, /kosif-ux-replay-ready/);
  assert.match(bridge, /openFallback\(120\)/);
});

test('production edge wrapper injects v54.2 and v55 outside Wealth reader', () => {
  assert.match(edge, /kosif-rec-screen-v54\.js\?v=2026\.08\.22-v54\.2/);
  assert.match(edge, /kosif-rec-screen-integration-v55\.js\?v=2026\.08\.22-2/);
  assert.match(edge, /head\.append\(SCREEN_CAPTURE/);
  assert.match(edge, /head\.append\(SCREEN_CAPTURE_INTEGRATION/);
  assert.match(edge, /path === '\/wealth'/);
  assert.match(edge, /path\.startsWith\('\/wealth\/'\)/);
});
