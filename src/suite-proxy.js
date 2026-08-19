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

function isReaderHtmlRequest(contentType = '', requestUrl = null) {
  const p = String(requestUrl?.pathname || '');
  return /html/i.test(contentType) || p === '/wealth/reader.html' || p === '/wealth/reader' || p === '/wealth/';
}

function requestedLibraryBook(url) {
  const book = String(url?.searchParams?.get('book') || '').trim().toLowerCase();
  return LIBRARY_BOOKS.has(book) ? book : '';
}

function readerBookBootstrap(url) {
  // Opening the reader without an explicit book must always start at Mafateeh,
  // regardless of any old localStorage selection left by a previous session.
  const book = requestedLibraryBook(url) || 'mafateeh';
  return `<script data-kosif-book-bootstrap="${book}">(function(){try{localStorage.setItem('mk_lib_book',JSON.stringify(${JSON.stringify(book)}));window.__KOSIF_REQUESTED_BOOK__=${JSON.stringify(book)};}catch(e){}})();</script>`;
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

function exposeReaderRuntimeBindings(text) {
  // Keep the original Mafateeh reader implementation, but make only its two
  // top-level book-model bindings mutable in the proxied Kosif copy. All native
  // render/TOC/search/audio/studio logic then follows whichever prepared book
  // the compatibility layer selects, without rebuilding the reader.
  const dConst = /\bconst\s+D\s*=\s*(?=\{)/;
  const chConst = /\bconst\s+CH\s*=\s*(?=D\.parts\.flatMap)/;
  if (dConst.test(text) && chConst.test(text)) {
    return text.replace(dConst, 'var D = ').replace(chConst, 'var CH = ');
  }
  return text;
}

const READER_DEFAULT_UI = `<style id="kosif-reader-default-ui">
#mixerDock,#smartHubDock,#libBtn,#mixLaunch,.mixer-launch,button[onclick*="openMix"],button[aria-label*="Mix"],#smartPebble,.smart-pebble,button[onclick*="openSmart"],button[aria-label*="المكتبة الذكية"]{display:none!important;visibility:hidden!important;pointer-events:none!important}
#kosif-reader-home,#kosif-reader-library-home{position:fixed;z-index:2147483000;top:calc(env(safe-area-inset-top,0px) + 10px);min-height:38px;display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:1px solid rgba(99,91,255,.18);border-radius:999px;background:rgba(255,255,255,.93);color:#4f46e5;text-decoration:none;font:700 12px/1.2 -apple-system,BlinkMacSystemFont,'SF Arabic',system-ui,sans-serif;box-shadow:0 9px 24px -18px rgba(67,56,202,.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
#kosif-reader-home{left:8px}#kosif-reader-library-home{right:8px}
body{padding-bottom:calc(86px + env(safe-area-inset-bottom,0px))!important}html,body{min-height:100dvh}
</style><a id="kosif-reader-home" href="/" aria-label="الرئيسية">⌂ الرئيسية</a><a id="kosif-reader-library-home" href="/libraries/" aria-label="المكتبات">‹ المكتبات</a><script id="kosif-reader-default-ui-script">(function(){if(window.__KOSIF_READER_DEFAULT_UI_V2__)return;window.__KOSIF_READER_DEFAULT_UI_V2__=1;var sel='#mixerDock,#smartHubDock,#libBtn,#mixLaunch,.mixer-launch,button[onclick*="openMix"],button[aria-label*="Mix"],#smartPebble,.smart-pebble,button[onclick*="openSmart"],button[aria-label*="المكتبة الذكية"]';function hide(r){try{(r||document).querySelectorAll(sel).forEach(function(x){x.style.setProperty('display','none','important');x.style.setProperty('visibility','hidden','important');x.style.setProperty('pointer-events','none','important')})}catch(e){}}var dm={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};function digits(r){try{var w=document.createTreeWalker(r||document.body,NodeFilter.SHOW_TEXT);var a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(function(n){var p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE)$/.test(p.tagName))return;var s=n.nodeValue.replace(/[٠-٩۰-۹]/g,function(c){return dm[c]||c});if(s!==n.nodeValue)n.nodeValue=s})}catch(e){}}function run(){hide(document);digits(document.body)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();new MutationObserver(function(rs){rs.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1){hide(n);digits(n)}else if(n.nodeType===3&&n.parentElement&&!/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE)$/.test(n.parentElement.tagName)){var s=n.nodeValue.replace(/[٠-٩۰-۹]/g,function(c){return dm[c]||c});if(s!==n.nodeValue)n.nodeValue=s}})})}).observe(document.documentElement,{childList:true,subtree:true})})();</script>`;

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
    text = exposeReaderRuntimeBindings(text);
    text = text.replace(
      /navigator\.serviceWorker\.register\("\/wealth\/sw\.js"\)/g,
      'navigator.serviceWorker.register("/wealth/sw.js",{scope:"/wealth/"})'
    );
    // Prefer the Kosif compatibility layer over an upstream reader-library file
    // so all four book identities use one deterministic source of truth.
    text = replaceLegacyReaderLibrary(text);
    const injections = [];
    const bookBoot = readerBookBootstrap(requestUrl);
    const requested = requestedLibraryBook(requestUrl) || 'mafateeh';
    const bookMarker = `data-kosif-book-bootstrap="${requested}"`;
    if (!text.includes(bookMarker)) injections.push(bookBoot);
    // Preserve the original Mafateeh design and full reader runtime. Mixer and
    // Smart Library stay capable, but are intentionally hidden by default.
    if (!text.includes('id="kosif-reader-default-ui"')) injections.push(READER_DEFAULT_UI);
    if (!text.includes('/wealth-library-v37.js')) injections.push('<script src="/wealth-library-v37.js" defer></script>');
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
        const requestedBook = requestedLibraryBook(requestUrl) || 'mafateeh';
        if (!u.searchParams.has('book')) u.searchParams.set('book', requestedBook);
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
  h.set('cache-control', htmlLike ? 'no-cache, no-store, must-revalidate' : (h.get('cache-control') || 'public, max-age=3600'));
  return new Response(text, { status: upstream.status, statusText: upstream.statusText, headers: h });
}

export function wealthRootAlias(pathname) {
  return isPrefixPath(pathname);
}
