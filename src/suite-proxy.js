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
const READER_ROOT_ALIASES = ['/reader.html', '/reader', '/'];
const LIBRARY_BOOKS = new Set(['mafateeh', 'std2018', 'std2025', 'dipifr']);

function isPrefixPath(path) {
  const p = String(path || '').replace(/^\//, '');
  return PATH_PREFIXES.some((x) => p === x || p.startsWith(x));
}

function candidatePaths(path) {
  const p = path || '/';
  if (!READER_ROOT_ALIASES.includes(p)) return [p];
  return [p, ...READER_ROOT_ALIASES.filter((x) => x !== p)];
}

function readerBookBootstrap(url) {
  const book = String(url?.searchParams?.get('book') || '').trim().toLowerCase();
  if (!LIBRARY_BOOKS.has(book)) return '';
  // This runs only for an explicit allow-listed ?book= deep link. A normal
  // /wealth/reader.html request therefore leaves Mafateeh state untouched.
  return `<script>(function(){try{localStorage.setItem('mk_lib_book',JSON.stringify(${JSON.stringify(book)}));}catch(e){}})();</script>`;
}

function injectReaderLayers(text, requestUrl) {
  const additions = [];
  const bookBoot = readerBookBootstrap(requestUrl);
  if (bookBoot && !text.includes('mk_lib_book')) additions.push(bookBoot);
  if (!text.includes('/wealth-theme-v37.css')) additions.push('<link rel="stylesheet" href="/wealth-theme-v37.css">');
  if (!text.includes('/suite-shell.css')) additions.push('<link rel="stylesheet" href="/suite-shell.css">');
  if (!/reader-library\.js/i.test(text) && !/wealth-library-v37\.js/i.test(text)) additions.push('<script src="/wealth-library-v37.js" defer></script>');
  if (!text.includes('/suite-shell.js')) additions.push('<script src="/suite-shell.js" defer></script>');
  if (!additions.length) return text;
  return text.replace(/<\/head>/i, additions.join('') + '</head>');
}

function rewriteWealthText(input, contentType = '', requestUrl = null) {
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
    // Do not use one previously-injected stylesheet as a sentinel for all other
    // layers. The upstream Worker can already contain suite-shell.css while the
    // book bootstrap/library script is still missing.
    text = injectReaderLayers(text, requestUrl);
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
  const loc = h.get('location');
  if (loc) {
    try {
      const u = new URL(loc, 'https://mafateeh.internal');
      if (u.origin === 'https://mafateeh.internal' || WEALTH_ORIGINS.includes(u.origin)) {
        h.set('location', '/wealth' + (u.pathname === '/' ? '/' : u.pathname) + u.search + u.hash);
      }
    } catch (_) {}
  }
  h.set('x-kosif-suite-module', 'wealth-keys');
  h.set('x-content-type-options', 'nosniff');
  return h;
}

async function fetchBinding(req, env, targetPath, url, init) {
  if (!env?.MAFATEEH) return null;
  try {
    const u = new URL('https://mafateeh.internal' + targetPath + url.search);
    return await env.MAFATEEH.fetch(new Request(u, init));
  } catch (_) {
    return null;
  }
}

async function fetchOrigin(origin, targetPath, url, init) {
  try {
    return await fetch(origin + targetPath + url.search, init);
  } catch (_) {
    return null;
  }
}

function usable(r) {
  return !!r && r.status !== 404 && r.status !== 502 && r.status !== 503;
}

async function fetchUpstream(req, env, path) {
  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  const init = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = req.body;

  for (const targetPath of candidatePaths(path)) {
    const bound = await fetchBinding(req, env, targetPath, url, init);
    if (usable(bound)) return bound;
    for (const origin of WEALTH_ORIGINS) {
      const r = await fetchOrigin(origin, targetPath, url, init);
      if (usable(r)) return r;
    }
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
  const text = rewriteWealthText(await upstream.text(), type, u);
  const h = copyResponseHeaders(upstream);
  h.set('content-type', type || 'text/plain; charset=utf-8');
  h.set('cache-control', /html/i.test(type) ? 'no-cache' : (h.get('cache-control') || 'public, max-age=3600'));
  return new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: h });
}

export function wealthRootAlias(pathname) {
  return isPrefixPath(pathname);
}
