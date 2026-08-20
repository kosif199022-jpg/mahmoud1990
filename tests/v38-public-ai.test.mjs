import { callPublicAI, publicAIConfigured } from '../src/public-ai-provider.js';

let pass = 0, fail = 0;
const ok = (condition, name) => { if (condition) pass++; else { fail++; console.error('  ❌ ' + name); } };
const originalFetch = globalThis.fetch;

console.log('KOSIF v38 public AI governance tests');
ok(!publicAIConfigured({}), 'provider is disabled without server-only configuration');

let request = null;
globalThis.fetch = async (url, init) => {
  request = { url, init, body: JSON.parse(init.body) };
  return new Response(JSON.stringify({ choices: [{ message: { content: 'رد محكوم' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const chatEnv = {
  KOSIF_PUBLIC_AI_BASE_URL: 'https://ai.internal.example/v1',
  KOSIF_PUBLIC_AI_ALLOWED_HOSTS: 'ai.internal.example',
  KOSIF_PUBLIC_AI_MODEL: 'local-audit-model',
  KOSIF_PUBLIC_AI_MODE: 'chat_completions',
  KOSIF_PUBLIC_AI_KEY: 'server-secret'
};
let r = await callPublicAI(chatEnv, 'اعتمد هذا القيد وأصدر الرأي النهائي');
ok(r.ok && r.text === 'رد محكوم', 'chat-completions response is normalized');
ok(request.url === 'https://ai.internal.example/v1/chat/completions', 'configured path is fixed server-side');
ok(request.body.messages[0].role === 'system' && /Never approve/.test(request.body.messages[0].content), 'immutable governance policy is sent as system instruction');
ok(request.body.messages[1].role === 'user' && /اعتمد هذا القيد/.test(request.body.messages[1].content), 'user content remains a separate untrusted message');
ok(request.init.headers.authorization === 'Bearer server-secret', 'server secret is attached only by the provider relay');

globalThis.fetch = async (_url, init) => {
  request = { body: JSON.parse(init.body) };
  return new Response(JSON.stringify({ output_text: 'response text' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
r = await callPublicAI({ ...chatEnv, KOSIF_PUBLIC_AI_MODE: 'responses' }, 'حلل الخطر');
ok(r.ok && request.body.instructions && request.body.input === 'حلل الخطر', 'Responses mode uses instructions instead of mixing policy with input');

r = await callPublicAI({ ...chatEnv, KOSIF_PUBLIC_AI_BASE_URL: 'http://10.0.0.5/v1' }, 'x');
ok(!r.ok && r.error === 'PUBLIC_AI_HTTPS_REQUIRED', 'non-HTTPS remote endpoint is rejected');
r = await callPublicAI({ ...chatEnv, KOSIF_PUBLIC_AI_ALLOWED_HOSTS: 'other.example' }, 'x');
ok(!r.ok && r.error === 'PUBLIC_AI_HOST_NOT_ALLOWED', 'host allowlist is enforced');

globalThis.fetch = originalFetch;
console.log(`V38_PUBLIC_AI_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_PUBLIC_AI_OK');
