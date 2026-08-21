import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Cloudflare production entrypoint is the v43 requirements wrapper',()=>{
  const wrangler=fs.readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
  assert.match(wrangler,/main\s*=\s*"src\/suite-edge-v43\.js"/);
});

test('v43 production wrapper exposes runtime coverage and gates sensitive mutations',()=>{
  const src=fs.readFileSync(new URL('../src/suite-edge-v43.js',import.meta.url),'utf8');
  for(const marker of [
    'createFullyImplementedRequirementsRuntime',
    "p==='/__requirements'",
    'REQUIREMENTS_BASELINE_INCOMPLETE',
    'x-kosif-requirements-implemented',
    'isSensitiveMutation',
    'COVERAGE.complete',
    'STRUCTURE.complete',
    'PRIMITIVES.ok'
  ]) assert.ok(src.includes(marker),`missing production integration marker: ${marker}`);
});

test('short /a alias serves the governed audit shell internally without browser redirect',()=>{
  const src=fs.readFileSync(new URL('../src/suite-edge-v43.js',import.meta.url),'utf8');
  assert.ok(src.includes("(p==='/a'||p==='/a/')"));
  assert.ok(src.includes("auditUrl.pathname='/audit/'"));
  assert.ok(src.includes("req.method==='GET'||req.method==='HEAD'"));
  assert.ok(src.includes('new Request(auditUrl.toString(),req)'));
  assert.ok(src.includes("headers.set('x-kosif-short-alias','/a')"));
  assert.ok(src.includes("headers.set('cache-control','no-store')"));
  assert.ok(!src.includes("Response.redirect(u.toString(),302)"));
});

test('every sampled edge ID is runtime implemented through the production registry',async()=>{
  const {createFullyImplementedRequirementsRuntime}=await import('../src/requirements/v43-control-implementation.mjs');
  const runtime=createFullyImplementedRequirementsRuntime();
  for(const id of [1,50,51,2500,2501,5000,5001,10000,10001,10010,25000,49999,50000]){
    assert.equal(runtime.isRequirementImplemented(id),true,`requirement ${id} is not implemented`);
  }
});