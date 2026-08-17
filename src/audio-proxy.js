/* Streams the مفاتيح الثروة narration from the mafateeh-al-tharwa project.
 *
 * The 34 MP3s are ~66 MB. They are not copied into this repository: Kosif already has a
 * MAFATEEH service binding to that project, so the worker proxies the bytes and the
 * audio stays in one place with one source of truth.
 *
 * Range support is load-bearing, not a nicety. iOS Safari issues a `Range: bytes=0-1`
 * probe before it will play any audio element and refuses the media outright if the
 * response is a plain 200, so a proxy that swallows Range silently breaks playback on
 * exactly the devices this app targets. Range headers are forwarded upstream and the
 * upstream 206 — status, Content-Range, Content-Length — is passed back untouched.
 */

const TRACKS = 34;
const UPSTREAM_PATH = (track) => `/audio/chapter-${String(track).padStart(2, '0')}.mp3`;

/* Ordered by preference: the service binding costs no public egress, the workers.dev
 * origin is the deployed app, and the raw GitHub path is the last resort that still
 * works when neither worker is reachable. */
const ORIGINS = [
  'https://mafateeh-al-tharwa3.kosif199022.workers.dev',
  'https://mafateeh-al-tharwa.kosif199022.workers.dev',
  'https://raw.githubusercontent.com/kosif199022-jpg/mafateeh-al-tharwa/main/public',
];

export function audioTrackFromPath(pathname) {
  const m = /^\/standards\/audio\/(\d{1,2})\.mp3$/.exec(pathname || '');
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= TRACKS ? n : null;
}

function passthrough(upstream) {
  const h = new Headers();
  const copy = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
  for (const k of copy) { const v = upstream.headers.get(k); if (v) h.set(k, v); }
  if (!h.has('content-type')) h.set('content-type', 'audio/mpeg');
  if (!h.has('accept-ranges')) h.set('accept-ranges', 'bytes');
  /* The narration is immutable per release; let the browser and edge hold it so seeking
   * does not re-pull megabytes. */
  h.set('cache-control', 'public, max-age=604800, immutable');
  h.set('x-content-type-options', 'nosniff');
  h.set('x-kosif-audio', 'mafateeh-al-tharwa');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: h });
}

async function tryFetch(url, req, signal) {
  const headers = {};
  /* Forward only what a media fetch legitimately needs; the upstream is a different
   * origin and must not receive this app's cookies or auth. */
  for (const k of ['range', 'if-range', 'if-none-match', 'if-modified-since']) {
    const v = req.headers.get(k); if (v) headers[k] = v;
  }
  headers['user-agent'] = 'Kosif-Audio-Proxy/1.0';
  headers.accept = 'audio/mpeg,audio/*;q=0.9,*/*;q=0.5';
  return fetch(url, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect: 'follow', signal });
}

export async function handleAudio(req, env) {
  const url = new URL(req.url);
  const track = audioTrackFromPath(url.pathname);
  if (track == null) return null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const upstreamPath = UPSTREAM_PATH(track);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  const attempts = [];

  try {
    if (env?.MAFATEEH) {
      try {
        const r = await tryFetch('https://mafateeh.internal' + upstreamPath, req, controller.signal);
        if (r.ok || r.status === 206) return passthrough(r);
        attempts.push(`binding:${r.status}`);
      } catch (e) { attempts.push('binding:' + String(e?.message || e).slice(0, 60)); }
    }
    for (const origin of ORIGINS) {
      try {
        const r = await tryFetch(origin + upstreamPath, req, controller.signal);
        if (r.ok || r.status === 206) return passthrough(r);
        attempts.push(`${new URL(origin).hostname}:${r.status}`);
      } catch (e) { attempts.push(`${new URL(origin).hostname}:${String(e?.message || e).slice(0, 60)}`); }
    }
  } finally { clearTimeout(timer); }

  /* Fail loudly rather than returning an empty 200 that a media element would report as
   * a decode error with no way to tell why. */
  return new Response(JSON.stringify({ error: 'AUDIO_UNAVAILABLE', track, attempts }), {
    status: 502,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
