/* KOSIF v38 — secure OpenAI Realtime server-relay tests */
import { createRealtimeCall, hangupRealtimeCall, realtimeConfigured } from '../src/v38-realtime.js';
import { handleV38 } from '../src/v38-api.js';

let pass = 0, fail = 0;
const ok = (condition, name) => {
  if (condition) pass++;
  else { fail++; console.error('  ❌ ' + name); }
};

const VALID_OFFER = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
const VALID_ANSWER = 'v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n';
const base = 'https://kosif.test';

console.log('KOSIF v38 Realtime security tests');

ok(realtimeConfigured({}) === false, 'server relay reports unconfigured without secret');
ok(realtimeConfigured({ OPENAI_API_KEY: 'sk-server-secret-1234567890' }) === true, 'server relay detects server secret');

let r = await createRealtimeCall({}, { sdp: VALID_OFFER });
ok(r.ok === false && r.error === 'REALTIME_NOT_CONFIGURED', 'call fails closed when server secret is absent');

r = await createRealtimeCall({ OPENAI_API_KEY: 'sk-server-secret-1234567890' }, { sdp: 'not-sdp' });
ok(r.ok === false && r.error === 'REALTIME_SDP_INVALID', 'invalid SDP rejected before upstream call');

const nativeFetch = globalThis.fetch;
let captured = [];
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  let session = null;
  if (init.body instanceof FormData) {
    const raw = init.body.get('session');
    if (raw && typeof raw.text === 'function') {
      try { session = JSON.parse(await raw.text()); } catch {}
    } else if (typeof raw === 'string') {
      try { session = JSON.parse(raw); } catch {}
    }
  }
  captured.push({ target, method: init.method, authorization: init.headers?.authorization, session });
  if (/\/hangup$/.test(target)) return new Response('', { status: 200 });
  return new Response(VALID_ANSWER, {
    status: 201,
    headers: { location: 'https://api.openai.com/v1/realtime/calls/call_kosif_123' }
  });
};

try {
  const env = { OPENAI_API_KEY: 'sk-server-secret-1234567890' };
  r = await createRealtimeCall(env, {
    sdp: VALID_OFFER,
    model: 'not-allowed-model',
    voice: 'not-allowed-voice',
    language: 'ar-SA',
    company: 'demo-co',
    context: 'trial balance risk review'
  });
  ok(r.ok && r.model === 'gpt-realtime' && r.voice === 'marin', 'model and voice are allowlisted with safe fallback');
  ok(r.callId === 'call_kosif_123' && r.keyExposure === 'none', 'call id captured and key exposure contract is none');
  ok(!JSON.stringify(r).includes('sk-server-secret'), 'server secret never appears in returned call payload');
  ok(captured[0]?.authorization === 'Bearer sk-server-secret-1234567890', 'server secret is used only in upstream authorization');
  ok(captured[0]?.session?.instructions?.includes('advisory-only'), 'advisor session enforces advisory-only authority boundary');
  ok(captured[0]?.session?.audio?.input?.turn_detection?.type === 'semantic_vad', 'semantic VAD configured for interruption-friendly audit conversation');

  r = await hangupRealtimeCall(env, 'call_kosif_123');
  ok(r.ok === true && /call_kosif_123\/hangup$/.test(captured.at(-1)?.target || ''), 'hangup is relayed server-side');

  const route = async (path, options = {}, owner = true, routeEnv = env) => {
    const req = new Request(base + path, {
      method: options.method || 'GET',
      headers: { 'content-type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const res = await handleV38(req, routeEnv, new URL(req.url), owner);
    let body = null;
    try { body = await res.clone().json(); } catch {}
    return { res, body };
  };

  let api = await route('/api/kosif/v38/realtime/status');
  ok(api.res.status === 200 && api.body.configured === true && api.body.keyExposure === 'none', 'owner can inspect safe realtime status');

  api = await route('/api/kosif/v38/realtime/status', {}, false);
  ok(api.res.status === 401, 'realtime status remains owner-gated');

  api = await route('/api/kosif/v38/realtime/call', {
    method: 'POST',
    body: { sdp: VALID_OFFER, model: 'gpt-realtime', voice: 'cedar', language: 'ar', company: 'demo-co' }
  });
  ok(api.res.status === 201 && api.body.answerSdp === VALID_ANSWER && api.body.keyExposure === 'none', 'API exchanges SDP through KOSIF server relay');
  ok(!JSON.stringify(api.body).includes('sk-server-secret'), 'API response cannot leak server secret');

  api = await route('/api/kosif/v38/realtime/session', { method: 'POST', body: { key: 'sk-browser-key-must-never-be-used' } });
  ok(api.res.status === 410 && api.body.error === 'REALTIME_LEGACY_ROUTE_RETIRED', 'legacy browser-key session route is retired');

  api = await route('/api/kosif/v38/realtime/call', { method: 'POST', body: { sdp: VALID_OFFER } }, true, {});
  ok(api.res.status === 503 && api.body.error === 'REALTIME_NOT_CONFIGURED', 'API fails closed when Cloudflare secret is missing');
} finally {
  globalThis.fetch = nativeFetch;
}

console.log(`V38_REALTIME_RESULT pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
console.log('V38_REALTIME_OK');
