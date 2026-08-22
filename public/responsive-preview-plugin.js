/* KOSIF hidden UX session recorder v49.
 * Owner-session only. No visible UI. Never captures input values, typed text,
 * clipboard contents, file contents, auth tokens, cookies, or request bodies.
 */
(() => {
  'use strict';
  if (window.__KOSIF_UX_RECORDER_V49__) return;
  window.__KOSIF_UX_RECORDER_V49__ = true;

  const START_ENDPOINT = '/api/kosif/recorder/start';
  const BATCH_ENDPOINT = '/api/kosif/recorder/batch';
  const sessionId = (crypto.randomUUID?.() || `ux-${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const startedAt = Date.now();
  const MAX_BUFFER = 320;
  const FLUSH_SIZE = 90;
  const FLUSH_MS = 5000;
  const SPECIAL_KEYS = new Set(['Tab','Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Backspace','Delete',' ']);

  let active = false;
  let sequence = 0;
  let buffer = [];
  let flushing = false;
  let lastPointerAt = 0;
  let lastScrollAt = 0;
  let flushTimer = 0;

  const now = () => Date.now() - startedAt;
  const cleanToken = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);

  function safeSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el.id && !/password|secret|token|key|auth|cookie/i.test(el.id)) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth += 1, node = node.parentElement) {
      let part = node.tagName.toLowerCase();
      const dataView = node.getAttribute('data-view');
      const dataGo = node.getAttribute('data-go') || node.getAttribute('data-kgo') || node.getAttribute('data-go2');
      if (dataView) part += `[data-view="${cleanToken(dataView)}"]`;
      else if (dataGo) part += `[data-go="${cleanToken(dataGo)}"]`;
      else {
        const cls = [...node.classList].filter(x => !/active|show|focus|hover|selected|open|error|danger|warn/i.test(x)).slice(0, 2);
        if (cls.length) part += cls.map(x => `.${CSS.escape(x)}`).join('');
      }
      parts.unshift(part);
      if (dataView || node.matches('main,body')) break;
    }
    return parts.join(' > ').slice(0, 260);
  }

  function currentView() {
    return document.body?.dataset.kosifCurrentView || document.querySelector('section[data-view].show')?.dataset.view || '';
  }

  function targetMeta(target) {
    const el = target instanceof Element ? target : target?.parentElement;
    if (!el) return {};
    const rect = el.getBoundingClientRect();
    const type = el.getAttribute('type') || '';
    const role = el.getAttribute('role') || '';
    return {
      selector: safeSelector(el),
      tag: el.tagName.toLowerCase(),
      role: String(role).slice(0, 40),
      inputType: /^(button|checkbox|radio|range|file|submit|reset)$/i.test(type) ? type.toLowerCase() : '',
      rect: {
        x: Math.round(rect.x), y: Math.round(rect.y),
        width: Math.round(rect.width), height: Math.round(rect.height)
      },
      view: currentView()
    };
  }

  function add(type, detail = {}) {
    if (!active) return;
    buffer.push({ t: now(), type, ...detail });
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    if (buffer.length >= FLUSH_SIZE) void flush('size');
  }

  function sessionMeta() {
    return {
      path: location.pathname,
      viewport: { width: innerWidth, height: innerHeight, dpr: Number(devicePixelRatio || 1) },
      screen: { width: screen.width, height: screen.height },
      orientation: screen.orientation?.type || '',
      language: navigator.language || '',
      touchPoints: Number(navigator.maxTouchPoints || 0)
    };
  }

  function payload(events, reason) {
    return {
      schema: 'kosif.uxrec.v1',
      sessionId,
      sequence: sequence++,
      generatedAt: new Date().toISOString(),
      reason,
      page: sessionMeta(),
      events
    };
  }

  async function flush(reason = 'interval', useBeacon = false) {
    if (!active || flushing || !buffer.length) return;
    const events = buffer.splice(0, FLUSH_SIZE);
    const body = JSON.stringify(payload(events, reason));
    if (useBeacon && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(BATCH_ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (!ok) buffer = events.concat(buffer).slice(0, MAX_BUFFER);
      return;
    }
    flushing = true;
    try {
      const response = await fetch(BATCH_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body
      });
      if (!response.ok) {
        buffer = events.concat(buffer).slice(0, MAX_BUFFER);
        if (response.status === 401 || response.status === 403) stop();
      }
    } catch (_) {
      buffer = events.concat(buffer).slice(0, MAX_BUFFER);
    } finally {
      flushing = false;
    }
  }

  function recordClick(event) {
    add('click', {
      x: Math.round(event.clientX), y: Math.round(event.clientY),
      pointer: event.pointerType || 'mouse',
      button: Number(event.button || 0),
      target: targetMeta(event.target)
    });
  }

  function recordPointer(event) {
    const ts = performance.now();
    if (ts - lastPointerAt < 180) return;
    lastPointerAt = ts;
    add('pointer', {
      x: Math.round(event.clientX), y: Math.round(event.clientY),
      pointer: event.pointerType || 'mouse',
      target: targetMeta(event.target)
    });
  }

  function recordScroll() {
    const ts = performance.now();
    if (ts - lastScrollAt < 250) return;
    lastScrollAt = ts;
    add('scroll', {
      x: Math.round(scrollX), y: Math.round(scrollY),
      maxY: Math.max(0, Math.round(document.documentElement.scrollHeight - innerHeight)),
      view: currentView()
    });
  }

  function recordFocus(event, entering) {
    add(entering ? 'focus' : 'blur', { target: targetMeta(event.target) });
  }

  function recordChange(event) {
    const el = event.target;
    if (!(el instanceof Element)) return;
    add('change', { target: targetMeta(el) });
  }

  function recordKey(event) {
    if (!SPECIAL_KEYS.has(event.key)) return;
    add('control-key', { control: event.key === ' ' ? 'Space' : event.key, target: targetMeta(event.target) });
  }

  function safeError(value) {
    const name = value?.name || value?.constructor?.name || 'Error';
    const raw = String(value?.message || value || '').slice(0, 180);
    const message = raw
      .replace(/(bearer\s+)[^\s]+/ig, '$1[redacted]')
      .replace(/(token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+/ig, '$1=[redacted]')
      .replace(/\b\d{8,}\b/g, '[number]');
    return { name: String(name).slice(0, 60), message };
  }

  function patchHistory() {
    for (const method of ['pushState','replaceState']) {
      const original = history[method];
      if (typeof original !== 'function' || original.__kosifRecorded) continue;
      const wrapped = function(...args) {
        const result = original.apply(this, args);
        queueMicrotask(() => add('navigation', { method, path: location.pathname, view: currentView() }));
        return result;
      };
      wrapped.__kosifRecorded = true;
      history[method] = wrapped;
    }
  }

  function bind() {
    document.addEventListener('click', recordClick, true);
    document.addEventListener('pointermove', recordPointer, { passive: true, capture: true });
    document.addEventListener('scroll', recordScroll, { passive: true, capture: true });
    document.addEventListener('focusin', event => recordFocus(event, true), true);
    document.addEventListener('focusout', event => recordFocus(event, false), true);
    document.addEventListener('change', recordChange, true);
    document.addEventListener('keydown', recordKey, true);
    window.addEventListener('resize', () => add('resize', { viewport: { width: innerWidth, height: innerHeight, dpr: Number(devicePixelRatio || 1) } }), { passive: true });
    window.addEventListener('orientationchange', () => add('orientation', { orientation: screen.orientation?.type || '', viewport: { width: innerWidth, height: innerHeight } }), { passive: true });
    window.addEventListener('popstate', () => add('navigation', { method: 'popstate', path: location.pathname, view: currentView() }));
    window.addEventListener('hashchange', () => add('navigation', { method: 'hashchange', path: location.pathname, view: currentView() }));
    window.addEventListener('kosif-view-change', event => add('view-change', { view: String(event.detail?.view || currentView()).slice(0, 80) }));
    window.addEventListener('error', event => add('error', { error: safeError(event.error || event.message) }));
    window.addEventListener('unhandledrejection', event => add('unhandled-rejection', { error: safeError(event.reason) }));
    document.addEventListener('visibilitychange', () => add('visibility', { state: document.visibilityState }));
    window.addEventListener('pagehide', () => { add('session-end', { reason: 'pagehide' }); void flush('pagehide', true); }, { capture: true });
    patchHistory();
    flushTimer = window.setInterval(() => void flush('interval'), FLUSH_MS);
  }

  function stop() {
    active = false;
    if (flushTimer) clearInterval(flushTimer);
    buffer = [];
  }

  async function boot() {
    try {
      const response = await fetch(START_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!response.ok) return;
      active = true;
      bind();
      add('session-start', { ...sessionMeta(), view: currentView() });
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else void boot();
})();
