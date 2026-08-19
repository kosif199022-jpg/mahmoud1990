const KEY = 'kosif:monitor:3m';
const EVENT = 'kosif:monitor:event:';
const GH = 'https://api.github.com/repos/kosif199022-jpg/mahmoud1990/commits/main';

async function readJsonFetch(fetcher, pathOrUrl, headers = {}) {
  try {
    const response = fetcher
      ? await fetcher.fetch(pathOrUrl, { headers: { accept: 'application/json', ...headers } })
      : await fetch(pathOrUrl, {
          headers: { accept: 'application/json', ...headers },
          cf: { cacheTtl: 0, cacheEverything: false },
        });

    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function check(env, controller) {
  const ts = new Date().toISOString();
  const [github, health, capabilities] = await Promise.all([
    readJsonFetch(null, GH, {
      'user-agent': 'KOSIF-v38-monitor',
      accept: 'application/vnd.github+json',
    }),
    readJsonFetch(env.PROD, 'https://prod/__health'),
    readJsonFetch(env.PROD, 'https://prod/api/kosif/v38/capabilities'),
  ]);

  const mainCommit = github.ok ? String(github.data?.sha || '') : '';
  const runtimeVersion = health.ok ? String(health.data?.version || '') : '';
  const buildId = health.ok ? String(health.data?.buildId || '') : '';
  const d1 = !!(
    capabilities.ok &&
    Array.isArray(capabilities.data?.governed) &&
    capabilities.data.governed.includes('d1-authoritative-ledger')
  );
  const healthy = !!(
    health.ok &&
    capabilities.ok &&
    runtimeVersion === 'v38.1.0-root' &&
    buildId === '2026.08.19-v38.1-attachments-hardening' &&
    d1
  );

  let previous = null;
  try {
    previous = await env.DATA.get(KEY, 'json');
  } catch {}

  const changed =
    !previous ||
    previous.mainCommit !== mainCommit ||
    previous.runtimeVersion !== runtimeVersion ||
    previous.buildId !== buildId ||
    previous.healthy !== healthy;

  const record = {
    ts,
    cron: controller?.cron || 'manual',
    mainCommit,
    githubOk: github.ok,
    runtimeVersion,
    buildId,
    d1,
    healthy,
    changed,
    checks: {
      healthStatus: health.status || 0,
      capabilitiesStatus: capabilities.status || 0,
    },
  };

  await env.DATA.put(KEY, JSON.stringify(record));
  if (changed || !healthy) {
    await env.DATA.put(EVENT + Date.now(), JSON.stringify(record), {
      expirationTtl: 604800,
    });
  }

  return record;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/status' || url.pathname === '/check') {
      const record = await check(env, null);
      return Response.json(record, { headers: { 'cache-control': 'no-store' } });
    }
    return new Response('KOSIF 3-minute monitor', {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(check(env, controller));
  },
};

// Required Worker bindings:
// DATA: KV namespace ea12d307eba1439c960c8832337a40f4
// PROD: service binding -> mahmoud-eldesouky (environment: production)
