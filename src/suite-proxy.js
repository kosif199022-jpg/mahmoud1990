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
const PREPARED_BOOKS = new Set(['std2018', 'std2025', 'dipifr']);

function isPrefixPath(path) {
  const p = String(path || '').replace(/^\//, '');
  return PATH_PREFIXES.some((x) => p === x || p.startsWith(x));
}

function candidatePaths(path) {
  const p = path || '/';
  if (!READER_ROOT_ALIASES.includes(p)) return [p];
  return [p, ...READER_ROOT_ALIASES.filter((x) => x !== p)];
}

function isReaderHtmlRequest(contentType = '', requestUrl = null) {
  const p = String(requestUrl?.pathname || '');
  return /html/i.test(contentType) || p === '/wealth/reader.html' || p === '/wealth/reader' || p === '/wealth/';
}

function requestedLibraryBook(url) {
  const book = String(url?.searchParams?.get('book') || '').trim().toLowerCase();
  return LIBRARY_BOOKS.has(book) ? book : '';
}

function preparedReaderRedirect(url, path) {
  if (!READER_ROOT_ALIASES.includes(path)) return null;
  const book = requestedLibraryBook(url);
  if (!PREPARED_BOOKS.has(book)) return null;
  const target = new URL('/libraries/reader.html', url.origin);
  target.searchParams.set('book', book);
  const chapter = Number(url.searchParams.get('ch'));
  if (Number.isInteger(chapter) && chapter > 0 && chapter < 10000) target.searchParams.set('ch', String(chapter));
  return target.pathname + target.search;
}

function injectHtmlFragments(text, fragments) {
  if (!fragments.length) return text;
  const payload = fragments.join('');
  if (/<\/head>/i.test(text)) return text.replace(/<\/head>/i, `${payload}</head>`);
  if (/<\/body>/i.test(text)) return text.replace(/<\/body>/i, `${payload}</body>`);
  if (/<\/html>/i.test(text)) return text.replace(/<\/html>/i, `${payload}</html>`);
  return text + payload;
}

function replaceLegacyReaderLibrary(text) {
  return text.replace(
    /<script\b[^>]*src=["']\/wealth\/reader-library\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,
    '<script src="/wealth-library-v37.js" defer></script>'
  );
}

function rewriteWealthText(input, contentType = '', requestUrl = null) {
  let text = String(input || '');
  const htmlLike = isReaderHtmlRequest(contentType, requestUrl);
  // Prefix only Mafateeh-owned root assets. API calls intentionally remain at /api/*
  // so the same Kosif owner gate and provider verification protect AI capabilities.
  for (const p of PATH_PREFIXES) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp("([\"'`])\\/" + escaped, 'g'), '$1/wealth/' + p);
  }
  if (/manifest/i.test(contentType)) {
    text = text.replace(/"scope"\s*:\s*"\/"/g, '"scope":"/wealth/"');
  }
  if (htmlLike) {
    text = text.replace(
      /navigator\.serviceWorker\.register\("\/wealth\/sw\.js"\)/g,
      'navigator.serviceWorker.register("/wealth/sw.js",{scope:"/wealth/"})'
    );

    // Mafateeh remains the original runtime. Prepared books never mutate its D/CH
    // model anymore; they are routed to the Kosif-owned /libraries/reader.html.
    // If an upstream compatibility layer is present, replace it with the Kosif
    // library router so the in-reader library button follows the same boundary.
    text = replaceLegacyReaderLibrary(text);
    const injections = [];
    if (!text.includes('/wealth-theme-v37.css')) injections.push('<link rel="stylesheet" href="/wealth-theme-v37.css">');
    if (!text.includes('/suite-shell.css')) injections.push('<link rel="stylesheet" href="/suite-shell.css">');
    if (!text.includes('/wealth-library-v37.js')) injections.push('<script src="/wealth-library-v37.js" defer></script>');
    if (!text.includes('/suite-shell.js')) injections.push('<script src="/suite-shell.js" defer></script>');
    text = injectHtmlFragments(text, injections);
  }
  if (/javascript/i.test(contentType) || htmlLike) {
    text = text.replace(/(["'`])\/wealth\/wealth\//g, '$1/wealth/');
  }
  return text;
}

function copyResponseHeaders(upstream, requestUrl = null) {
  const h = new Headers(upstream.headers);
  h.delete('content-length');
  h.delete('content-security-policy');
  const loc = h.get('location');
  if (loc) {
    try {
      const u = new URL(loc, 'https://mafateeh.internal');
      if (u.origin === 'https://mafateeh.internal' || WEALTH_ORIGINS.includes(u.origin)) {
        const requestedBook = requestedLibraryBook(requestUrl);
        if (requestedBook && !u.searchParams.has('book')) u.searchParams.set('book', requestedBook);
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
function isRedirect(r) {
  return !!r && r.status >= 300 && r.status < 400;
}

async function fetchUpstream(req, env, path) {
  const url = new URL(req.url);
  const headers = new Headers(req.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  const init = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = req.body;

  const readerAlias = READER_ROOT_ALIASES.includes(path);
  let redirectFallback = null;
  for (const targetPath of candidatePaths(path)) {
    const bound = await fetchBinding(req, env, targetPath, url, init);
    if (usable(bound)) {
      if (readerAlias && isRedirect(bound)) redirectFallback ||= bound;
      else return bound;
    }
    for (const origin of WEALTH_ORIGINS) {
      const r = await fetchOrigin(origin, targetPath, url, init);
      if (usable(r)) {
        if (readerAlias && isRedirect(r)) redirectFallback ||= r;
        else return r;
      }
    }
  }
  return redirectFallback;
}

export async function proxyWealth(req, env) {
  const u = new URL(req.url);
  if (!u.pathname.startsWith('/wealth/')) return null;
  if (!['GET', 'HEAD'].includes(req.method)) return null;
  let path = u.pathname.slice('/wealth'.length) || '/';
  if (path === '/' || path === '') path = '/reader.html';

  // Architectural boundary: prepared standards/training books are first-party
  // Kosif reader clients under /libraries/. They never execute inside the
  // Mafateeh document, never share its global model bindings, and are outside
  // the /wealth/ service-worker scope. This also makes old deep links migrate
  // automatically without trusting localStorage or reader bootstrap timing.
  const redirect = preparedReaderRedirect(u, path);
  if (redirect) {
    const h = new Headers({
      location: redirect,
      'cache-control': 'no-store, max-age=0',
      'x-kosif-suite-module': 'prepared-reader',
      'x-content-type-options': 'nosniff',
    });
    return new Response(null, { status: 302, headers: h });
  }

  const upstream = await fetchUpstream(req, env, path);
  if (!upstream) return new Response('Wealth Keys source unavailable', { status: 502 });
  const type = upstream.headers.get('content-type') || '';
  const htmlLike = isReaderHtmlRequest(type, u);
  if (req.method === 'HEAD' || (!htmlLike && !TEXT_TYPES.test(type))) {
    const h = copyResponseHeaders(upstream, u);
    if (htmlLike) {
      h.set('content-type', 'text/html; charset=utf-8');
      h.set('cache-control', 'no-cache');
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: h });
  }
  const text = rewriteWealthText(await upstream.text(), type, u);
  const h = copyResponseHeaders(upstream, u);
  h.set('content-type', htmlLike ? 'text/html; charset=utf-8' : (type || 'text/plain; charset=utf-8'));
  h.set('cache-control', htmlLike ? 'no-cache' : (h.get('cache-control') || 'public, max-age=3600'));
  return new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: h });
}

export function wealthRootAlias(pathname) {
  return isPrefixPath(pathname);
}
