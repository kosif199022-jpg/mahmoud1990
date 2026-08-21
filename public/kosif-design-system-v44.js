/* KOSIF Design Quality Stack v44 runtime
 * Native, framework-agnostic interaction layer. No accounting/audit logic is touched.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  root.dataset.kosifDesignSystem = 'v44';

  const reduceQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const coarseQuery = window.matchMedia?.('(pointer: coarse)');

  function syncEnvironment() {
    root.dataset.kosifReducedMotion = reduceQuery?.matches ? 'true' : 'false';
    root.dataset.kosifPointer = coarseQuery?.matches ? 'coarse' : 'fine';
    root.dataset.kosifViewport = window.innerWidth < 480 ? 'xs' : window.innerWidth < 768 ? 'sm' : window.innerWidth < 1024 ? 'md' : 'lg';
  }

  syncEnvironment();
  reduceQuery?.addEventListener?.('change', syncEnvironment);
  coarseQuery?.addEventListener?.('change', syncEnvironment);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(syncEnvironment, 120);
  }, { passive: true });

  const observability = {
    captureException(error, context = {}) {
      try {
        if (window.Sentry?.captureException) {
          window.Sentry.captureException(error, { extra: context });
          return;
        }
      } catch {}
      console.error('[KOSIF:v44]', error, context);
    },
    captureMessage(message, context = {}) {
      try {
        if (window.Sentry?.captureMessage) {
          window.Sentry.captureMessage(message, { extra: context });
          return;
        }
      } catch {}
      console.info('[KOSIF:v44]', message, context);
    }
  };

  window.KOSIFObservability = Object.assign(window.KOSIFObservability || {}, observability);

  window.addEventListener('error', (event) => {
    observability.captureException(event.error || new Error(event.message || 'Window error'), {
      source: event.filename || 'window',
      line: event.lineno,
      column: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled rejection'));
    observability.captureException(reason, { source: 'unhandledrejection' });
  });

  function setupRevealMotion() {
    if (reduceQuery?.matches || !('IntersectionObserver' in window)) return;
    const targets = [...document.querySelectorAll('main .card, main .panel, main section[data-view]')]
      .filter((node) => !node.closest('[aria-hidden="true"]'))
      .slice(0, 80);

    if (!targets.length) return;

    for (const node of targets) node.dataset.kosifReveal = 'ready';

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.dataset.kosifReveal = 'visible';
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '80px 0px 80px' });

    for (const node of targets) observer.observe(node);
  }

  function annotateSemantics() {
    for (const element of document.querySelectorAll('.kpi .v,.metric-value,.amt,.num')) {
      element.dataset.kosifNumber = '';
    }

    for (const tableWrap of document.querySelectorAll('.twrap,.table-wrap')) {
      if (!tableWrap.hasAttribute('tabindex')) tableWrap.tabIndex = 0;
      if (!tableWrap.hasAttribute('role')) tableWrap.setAttribute('role', 'region');
      if (!tableWrap.hasAttribute('aria-label')) tableWrap.setAttribute('aria-label', 'جدول بيانات قابل للتمرير');
    }
  }

  function setupKeyboardQuality() {
    let usingKeyboard = false;
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        usingKeyboard = true;
        root.dataset.kosifInputMode = 'keyboard';
      }
    }, true);
    window.addEventListener('pointerdown', () => {
      if (!usingKeyboard) return;
      usingKeyboard = false;
      root.dataset.kosifInputMode = 'pointer';
    }, true);
  }

  function boot() {
    try {
      annotateSemantics();
      setupKeyboardQuality();
      requestAnimationFrame(setupRevealMotion);
      root.dataset.kosifDesignReady = 'true';
      window.dispatchEvent(new CustomEvent('kosif:design-ready', { detail: { version: 'v44' } }));
    } catch (error) {
      observability.captureException(error, { source: 'design-runtime-boot' });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
