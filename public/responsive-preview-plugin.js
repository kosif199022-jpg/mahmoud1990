/* KOSIF Manual UX Replay Recorder v50.
 * Owner-session only. Recording starts only after the owner presses "بدء تسجيل".
 * Captures interaction metadata, navigation, layout/viewport context and runtime errors.
 * Never captures passwords, typed field values, clipboard/file contents, cookies, auth tokens or request bodies.
 */
(() => {
  'use strict';
  if (window.__KOSIF_UX_RECORDER_V50__) return;
  window.__KOSIF_UX_RECORDER_V50__ = true;

  const AUTH_ENDPOINT = '/api/kosif/recorder/start';
  const BATCH_ENDPOINT = '/api/kosif/recorder/batch';
  const MAX_EVENTS = 2200;
  const MAX_BUFFER = 320;
  const FLUSH_SIZE = 90;
  const FLUSH_MS = 5000;
  const SPECIAL_KEYS = new Set(['Tab','Enter','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End','Backspace','Delete',' ']);

  let sessionId = '';
  let startedAt = 0;
  let active = false;
  let sequence = 0;
  let buffer = [];
  let fullEvents = [];
  let flushing = false;
  let lastPointerAt = 0;
  let lastScrollAt = 0;
  let flushTimer = 0;
  let elapsedTimer = 0;
  let authorized = false;
  let listenersBound = false;

  const now = () => startedAt ? Date.now() - startedAt : 0;
  const cleanToken = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const safeText = value => String(value || '')
    .replace(/(bearer\s+)[^\s]+/ig, '$1[redacted]')
    .replace(/(token|secret|password|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/ig, '$1=[redacted]')
    .replace(/\b\d{8,}\b/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

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

  function accessibleName(el) {
    if (!(el instanceof Element)) return '';
    if (el.matches('input,textarea,select,[contenteditable="true"]')) return '';
    const named = el.closest('button,a,[role="button"],[role="link"],summary,label') || el;
    const candidate = named.getAttribute('aria-label') || named.getAttribute('title') || named.textContent || '';
    return safeText(candidate);
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
      name: accessibleName(el),
      role: String(role).slice(0, 40),
      inputType: /^(button|checkbox|radio|range|file|submit|reset)$/i.test(type) ? type.toLowerCase() : '',
      rect: {
        x: Math.round(rect.x), y: Math.round(rect.y),
        width: Math.round(rect.width), height: Math.round(rect.height)
      },
      view: currentView()
    };
  }

  function sessionMeta() {
    return {
      path: location.pathname,
      hrefPath: location.pathname + location.search + location.hash,
      title: safeText(document.title),
      viewport: { width: innerWidth, height: innerHeight, dpr: Number(devicePixelRatio || 1) },
      screen: { width: screen.width, height: screen.height },
      orientation: screen.orientation?.type || '',
      language: navigator.language || '',
      touchPoints: Number(navigator.maxTouchPoints || 0),
      view: currentView()
    };
  }

  function add(type, detail = {}) {
    if (!active) return;
    const event = { t: now(), type, ...detail };
    buffer.push(event);
    fullEvents.push(event);
    if (fullEvents.length > MAX_EVENTS) fullEvents.splice(0, fullEvents.length - MAX_EVENTS);
    if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
    updateHud();
    if (buffer.length >= FLUSH_SIZE) void flush('size');
  }

  function payload(events, reason) {
    return {
      schema: 'kosif.uxrec.v2',
      sessionId,
      sequence: sequence++,
      generatedAt: new Date().toISOString(),
      reason,
      page: sessionMeta(),
      events
    };
  }

  async function flush(reason = 'interval', useBeacon = false, force = false) {
    if ((!active && !force) || flushing || !buffer.length) return;
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
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'content-type': 'application/json' }, body
      });
      if (!response.ok) buffer = events.concat(buffer).slice(0, MAX_BUFFER);
    } catch (_) {
      buffer = events.concat(buffer).slice(0, MAX_BUFFER);
    } finally {
      flushing = false;
    }
  }

  function recordClick(event) {
    add('click', {
      x: Math.round(event.clientX), y: Math.round(event.clientY),
      pointer: event.pointerType || 'mouse', button: Number(event.button || 0),
      target: targetMeta(event.target)
    });
  }
  function recordPointer(event) {
    const ts = performance.now();
    if (ts - lastPointerAt < 220) return;
    lastPointerAt = ts;
    add('pointer', { x: Math.round(event.clientX), y: Math.round(event.clientY), pointer: event.pointerType || 'mouse', target: targetMeta(event.target) });
  }
  function recordScroll() {
    const ts = performance.now();
    if (ts - lastScrollAt < 250) return;
    lastScrollAt = ts;
    add('scroll', { x: Math.round(scrollX), y: Math.round(scrollY), maxY: Math.max(0, Math.round(document.documentElement.scrollHeight - innerHeight)), view: currentView() });
  }
  function recordFocus(event, entering) { add(entering ? 'focus' : 'blur', { target: targetMeta(event.target) }); }
  function recordChange(event) { if (event.target instanceof Element) add('change', { target: targetMeta(event.target) }); }
  function recordKey(event) { if (SPECIAL_KEYS.has(event.key)) add('control-key', { control: event.key === ' ' ? 'Space' : event.key, target: targetMeta(event.target) }); }
  function safeError(value) {
    const name = value?.name || value?.constructor?.name || 'Error';
    return { name: String(name).slice(0, 60), message: safeText(value?.message || value || '') };
  }

  function patchHistory() {
    for (const method of ['pushState','replaceState']) {
      const original = history[method];
      if (typeof original !== 'function' || original.__kosifRecordedV50) continue;
      const wrapped = function(...args) {
        const result = original.apply(this, args);
        queueMicrotask(() => add('navigation', { method, path: location.pathname + location.search + location.hash, view: currentView() }));
        return result;
      };
      wrapped.__kosifRecordedV50 = true;
      history[method] = wrapped;
    }
  }

  function bindOnce() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener('click', recordClick, true);
    document.addEventListener('pointermove', recordPointer, { passive: true, capture: true });
    document.addEventListener('scroll', recordScroll, { passive: true, capture: true });
    document.addEventListener('focusin', event => recordFocus(event, true), true);
    document.addEventListener('focusout', event => recordFocus(event, false), true);
    document.addEventListener('change', recordChange, true);
    document.addEventListener('keydown', recordKey, true);
    window.addEventListener('resize', () => add('resize', { viewport: { width: innerWidth, height: innerHeight, dpr: Number(devicePixelRatio || 1) } }), { passive: true });
    window.addEventListener('orientationchange', () => add('orientation', { orientation: screen.orientation?.type || '', viewport: { width: innerWidth, height: innerHeight } }), { passive: true });
    window.addEventListener('popstate', () => add('navigation', { method: 'popstate', path: location.pathname + location.search + location.hash, view: currentView() }));
    window.addEventListener('hashchange', () => add('navigation', { method: 'hashchange', path: location.pathname + location.search + location.hash, view: currentView() }));
    window.addEventListener('kosif-view-change', event => add('view-change', { view: String(event.detail?.view || currentView()).slice(0, 80) }));
    window.addEventListener('error', event => add('error', { error: safeError(event.error || event.message) }));
    window.addEventListener('unhandledrejection', event => add('unhandled-rejection', { error: safeError(event.reason) }));
    document.addEventListener('visibilitychange', () => add('visibility', { state: document.visibilityState }));
    window.addEventListener('pagehide', () => { if (active) { add('session-end', { reason: 'pagehide' }); void flush('pagehide', true); } }, { capture: true });
    patchHistory();
  }

  function summarize() {
    const counts = {};
    const views = [];
    const clicked = [];
    const errors = [];
    let maxScroll = 0;
    for (const ev of fullEvents) {
      counts[ev.type] = (counts[ev.type] || 0) + 1;
      const view = ev.view || ev.target?.view;
      if (view && views[views.length - 1] !== view) views.push(view);
      if (ev.type === 'click') clicked.push({ t: ev.t, name: ev.target?.name || '', selector: ev.target?.selector || '', view: ev.target?.view || '', rect: ev.target?.rect || null });
      if (ev.type === 'scroll') maxScroll = Math.max(maxScroll, Number(ev.y || 0));
      if (ev.type === 'error' || ev.type === 'unhandled-rejection') errors.push({ t: ev.t, type: ev.type, error: ev.error });
    }
    return { durationMs: now(), eventCount: fullEvents.length, counts, views, clicks: clicked.slice(-180), maxScrollY: maxScroll, errors: errors.slice(-50) };
  }

  function buildReplayCode() {
    return JSON.stringify({
      schema: 'kosif.chatgpt.ux-replay.v1',
      instruction: 'حلل هذا التسجيل كرحلة استخدام KOSIF: رتب ما فعله المستخدم زمنيا، حدد النقرات التي لم ينتج عنها انتقال متوقع، مشاكل اللمس والتمرير والتنقل، أخطاء JavaScript، والعناصر التي تحتاج إصلاح. لا تستنتج نصوص حقول أو بيانات حساسة غير موجودة في التسجيل.',
      session: {
        id: sessionId,
        startedAt: new Date(startedAt).toISOString(),
        stoppedAt: new Date().toISOString(),
        page: sessionMeta()
      },
      summary: summarize(),
      events: fullEvents
    }, null, 2);
  }

  function ensureStyle() {
    if (document.getElementById('kosif-recorder-v50-style')) return;
    const style = document.createElement('style');
    style.id = 'kosif-recorder-v50-style';
    style.textContent = `
      #kosif-recorder-control{position:fixed;left:14px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:8px;font-family:inherit;direction:rtl}
      #kosif-recorder-btn{min-height:48px;padding:0 16px;border:0;border-radius:999px;background:#111827;color:#fff;font:700 14px/1 inherit;box-shadow:0 8px 28px rgba(0,0,0,.24);cursor:pointer}
      #kosif-recorder-btn[data-active="1"]{background:#991b1b}
      #kosif-recorder-status{display:none;padding:8px 11px;border-radius:999px;background:rgba(17,24,39,.92);color:#fff;font:600 12px/1 inherit;white-space:nowrap}
      #kosif-recorder-status.show{display:inline-flex;align-items:center;gap:6px}
      #kosif-recorder-status .dot{width:8px;height:8px;border-radius:50%;background:#ef4444}
      #kosif-recorder-report{position:fixed;inset:0;z-index:2147483100;background:rgba(3,7,18,.72);display:none;align-items:flex-start;justify-content:center;padding:22px;overflow:auto;direction:rtl;font-family:inherit}
      #kosif-recorder-report.show{display:flex}
      #kosif-recorder-report-card{width:min(920px,100%);margin:auto;background:#fff;color:#111827;border-radius:18px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
      #kosif-recorder-report h2{margin:0 0 8px;font-size:20px}
      #kosif-recorder-report p{margin:0 0 12px;color:#4b5563;line-height:1.6}
      #kosif-recorder-report textarea{box-sizing:border-box;width:100%;min-height:360px;border:1px solid #d1d5db;border-radius:12px;padding:12px;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;text-align:left;resize:vertical;background:#f9fafb;color:#111827}
      #kosif-recorder-report-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      #kosif-recorder-report-actions button{min-height:44px;border:1px solid #d1d5db;border-radius:10px;padding:0 14px;background:#fff;color:#111827;font:700 14px/1 inherit;cursor:pointer}
      #kosif-recorder-report-actions button.primary{background:#111827;color:#fff;border-color:#111827}
      @media(max-width:520px){#kosif-recorder-control{left:10px;bottom:12px}#kosif-recorder-btn{min-height:46px;padding:0 13px}#kosif-recorder-report{padding:10px}#kosif-recorder-report-card{padding:14px;border-radius:14px}#kosif-recorder-report textarea{min-height:300px}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    ensureStyle();
    if (!document.getElementById('kosif-recorder-control')) {
      const control = document.createElement('div');
      control.id = 'kosif-recorder-control';
      control.innerHTML = '<span id="kosif-recorder-status"><span class="dot"></span><span id="kosif-recorder-time">00:00</span><span id="kosif-recorder-count">0</span></span><button id="kosif-recorder-btn" type="button">بدء تسجيل</button>';
      document.body.appendChild(control);
      document.getElementById('kosif-recorder-btn').addEventListener('click', () => active ? stopRecording() : startRecording());
    }
    if (!document.getElementById('kosif-recorder-report')) {
      const report = document.createElement('div');
      report.id = 'kosif-recorder-report';
      report.setAttribute('role', 'dialog');
      report.setAttribute('aria-modal', 'true');
      report.setAttribute('aria-labelledby', 'kosif-recorder-report-title');
      report.innerHTML = `
        <div id="kosif-recorder-report-card">
          <h2 id="kosif-recorder-report-title">كود تسجيل جلسة KOSIF</h2>
          <p>انسخ الكود كاملًا وأرسله لي في المحادثة. الكود يحتوي تسلسل الحركة، الشاشات، النقرات، التمرير والأخطاء، بدون كلمات المرور أو النصوص المكتوبة داخل الحقول.</p>
          <textarea id="kosif-recorder-code" readonly spellcheck="false"></textarea>
          <div id="kosif-recorder-report-actions">
            <button class="primary" id="kosif-recorder-copy" type="button">نسخ الكود</button>
            <button id="kosif-recorder-download" type="button">حفظ JSON</button>
            <button id="kosif-recorder-close" type="button">إغلاق</button>
          </div>
        </div>`;
      document.body.appendChild(report);
      document.getElementById('kosif-recorder-copy').addEventListener('click', async () => {
        const text = document.getElementById('kosif-recorder-code').value;
        try { await navigator.clipboard.writeText(text); document.getElementById('kosif-recorder-copy').textContent = 'تم النسخ'; }
        catch { document.getElementById('kosif-recorder-code').select(); }
      });
      document.getElementById('kosif-recorder-download').addEventListener('click', () => {
        const text = document.getElementById('kosif-recorder-code').value;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        a.download = `kosif-ux-replay-${sessionId || Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      document.getElementById('kosif-recorder-close').addEventListener('click', () => report.classList.remove('show'));
    }
  }

  function updateHud() {
    const btn = document.getElementById('kosif-recorder-btn');
    const status = document.getElementById('kosif-recorder-status');
    const time = document.getElementById('kosif-recorder-time');
    const count = document.getElementById('kosif-recorder-count');
    if (!btn || !status) return;
    btn.dataset.active = active ? '1' : '0';
    btn.textContent = active ? 'إيقاف التسجيل' : 'بدء تسجيل';
    status.classList.toggle('show', active);
    if (time) {
      const total = Math.floor(now() / 1000);
      time.textContent = `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
    }
    if (count) count.textContent = `${fullEvents.length} حدث`;
  }

  async function startRecording() {
    if (!authorized || active) return;
    sessionId = (crypto.randomUUID?.() || `ux-${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    startedAt = Date.now();
    sequence = 0;
    buffer = [];
    fullEvents = [];
    active = true;
    add('session-start', { ...sessionMeta() });
    flushTimer = window.setInterval(() => void flush('interval'), FLUSH_MS);
    elapsedTimer = window.setInterval(updateHud, 1000);
    updateHud();
  }

  async function stopRecording() {
    if (!active) return;
    add('session-end', { reason: 'manual-stop', page: sessionMeta() });
    active = false;
    if (flushTimer) clearInterval(flushTimer);
    if (elapsedTimer) clearInterval(elapsedTimer);
    flushTimer = 0;
    elapsedTimer = 0;
    await flush('manual-stop', false, true);
    const code = buildReplayCode();
    const box = document.getElementById('kosif-recorder-code');
    if (box) box.value = code;
    document.getElementById('kosif-recorder-report')?.classList.add('show');
    updateHud();
    window.__KOSIF_LAST_UX_REPLAY__ = JSON.parse(code);
    window.dispatchEvent(new CustomEvent('kosif-ux-replay-ready', { detail: { sessionId, eventCount: fullEvents.length } }));
  }

  async function authorizeAndMount() {
    try {
      const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'manual-recording-ui' })
      });
      if (!response.ok) return;
      authorized = true;
      bindOnce();
      ensureUi();
      updateHud();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', authorizeAndMount, { once: true });
  else void authorizeAndMount();
})();
