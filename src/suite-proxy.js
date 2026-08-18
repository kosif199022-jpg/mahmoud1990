const WEALTH_ORIGINS = [
  'https://mafateeh-al-tharwa3.kosif199022.workers.dev',
  'https://mafateeh-al-tharwa.kosif199022.workers.dev',
];

const TEXT_TYPES = /(?:text\/|javascript|json|manifest)/i;
const PATH_PREFIXES = [
  'reader-', 'books/', 'audio/', 'backgrounds/', 'icons/',
  'piper-worker.js', 'manifest.webmanifest', 'sw.js', 'reader.html',
  'downloads/'
];

function isPrefixPath(path) {
  const p = String(path || '').replace(/^\//, '');
  return PATH_PREFIXES.some((x) => p === x || p.startsWith(x));
}

function rewriteWealthText(input, contentType = '') {
  let text = String(input || '');
  // Prefix only Mafateeh-owned root assets. API calls intentionally remain at /api/*
  // so the same Kosif owner gate and provider verification protect AI capabilities.
  for (const p of PATH_PREFIXES) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp("([\"'`])\\/" + escaped, 'g'), '$1/wealth/' + p);
  }
  if (/manifest/i.test(contentType)) {
    text = text.replace(/"scope"\s*:\s*"\/"/g, '"scope":"/wealth/"');
  }
  if (/html/i.test(contentType)) {
    text = text.replace(
      /navigator\.serviceWorker\.register\("\/wealth\/sw\.js"\)/g,
      'navigator.serviceWorker.register("/wealth/sw.js",{scope:"/wealth/"})'
    );
    const suite = '<link rel="stylesheet" href="/wealth-theme-v37.css"><link rel="stylesheet" href="/suite-shell.css"><script src="/suite-shell.js" defer></script>';
    if (!text.includes('/suite-shell.css')) text = text.replace(/<\/head>/i, `${suite}</head>`);
  }
  if (/javascript/i.test(contentType) || /html/i.test(contentType)) {
    text = text.replace(/(["'`])\/wealth\/wealth\//g, '$1/wealth/');
  }
  return text;
}

function copyResponseHeaders(upstream) {
  const h = new Headers(upstream.headers);
  h.delete('content-length');
  h.delete('content-security-policy');
  h.set('x-kosif-suite-module', 'wealth-keys');
  h.set('x-content-type-options', 'nosniff');
  return h;
}

async function fetchUpstream(req, env, path) {
  const url = new URL(req.url);
  const targetPath = path || '/';
  const headers = new Headers(req.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  const init = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = req.body;

  if (env?.MAFATEEH) {
    try {
      const u = new URL('https://mafateeh.internal' + targetPath + url.search);
      const r = await env.MAFATEEH.fetch(new Request(u, init));
      if (r.status !== 404 && r.status !== 502 && r.status !== 503) return r;
    } catch (_) {}
  }
  for (const origin of WEALTH_ORIGINS) {
    try {
      const r = await fetch(origin + targetPath + url.search, init);
      if (r.status !== 404 && r.status !== 502 && r.status !== 503) return r;
    } catch (_) {}
  }
  return null;
}

export async function proxyWealth(req, env) {
  const u = new URL(req.url);
  if (!u.pathname.startsWith('/wealth/')) return null;
  if (!['GET', 'HEAD'].includes(req.method)) return null;
  let path = u.pathname.slice('/wealth'.length) || '/';
  if (path === '/' || path === '') path = '/reader.html';
  const upstream = await fetchUpstream(req, env, path);
  if (!upstream) return new Response('Wealth Keys source unavailable', { status: 502 });
  const type = upstream.headers.get('content-type') || '';
  if (req.method === 'HEAD' || !TEXT_TYPES.test(type)) {
    const h = copyResponseHeaders(upstream);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: h });
  }
  const text = rewriteWealthText(await upstream.text(), type);
  const h = copyResponseHeaders(upstream);
  h.set('content-type', type || 'text/plain; charset=utf-8');
  h.set('cache-control', /html/i.test(type) ? 'no-cache' : (h.get('cache-control') || 'public, max-age=3600'));
  return new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: h });
}

export function wealthRootAlias(pathname) {
  return isPrefixPath(pathname);
}
