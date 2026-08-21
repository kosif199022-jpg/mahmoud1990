/*
 * KOSIF Editorial Cinematic v41
 * Progressive visual orchestration only. It never reads or writes audit values.
 * Compatibility markers retained for the v41.2 regression contract: KOSIF REVIEW · ISSUE 41.2
 */
(() => {
  'use strict';
  if (window.__KOSIF_EDITORIAL_V41__) return;
  window.__KOSIF_EDITORIAL_V41__ = true;

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
  const touchFirst = window.matchMedia?.('(hover: none), (pointer: coarse), (max-width: 840px)').matches === true ||
    Number(navigator.maxTouchPoints || 0) > 0 || (window.innerWidth > 0 && window.innerWidth <= 840);
  let revealObserver = null;
  let decorateQueued = false;
  let revealQueued = false;
  let scrollQueued = false;
  let spotlightQueued = false;
  let spotlightEvent = null;
  let coverQueued = false;
  let coverEvent = null;

  const VIEW_DOMAINS = new Map([
    ['overview', 'work'], ['tb', 'work'], ['rounds', 'work'], ['pbc', 'work'],
    ['v38', 'assurance'], ['v38-core', 'assurance'], ['analytics', 'assurance'], ['map', 'evidence'],
    ['v38-accounting', 'assurance'], ['v38-lab', 'assurance'], ['v38-graph', 'evidence'],
    ['library', 'standards'], ['sources', 'evidence'], ['v38-sources', 'evidence'], ['reviewer', 'evidence'],
    ['outputs', 'reports'], ['v38-reports', 'reports'], ['v38-io', 'reports'],
    ['council', 'council'], ['v38-council', 'council'], ['v38-live', 'reports'],
    ['v38-books', 'library'], ['settings', 'system'], ['about', 'system']
  ]);

  function ensureStyles() {
    if ($('link[data-kosif-editorial="v41"]') || $('#kosif-editorial-v41')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/kosif-editorial-v41.css?v=2026.08.20-v41-2';
    link.id = 'kosif-editorial-v41';
    link.dataset.kosifEditorial = 'v41';
    document.head.appendChild(link);
  }

  function ensureSharpLayer() {
    root.dataset.kosifSharp = 'v46';
    if ($('link[data-kosif-sharp="v46"]') || $('#kosif-sharp-command-center-v46')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/kosif-sharp-command-center-v46.css?v=2026.08.21-v46-1';
    link.id = 'kosif-sharp-command-center-v46';
    link.dataset.kosifSharp = 'v46';
    document.head.appendChild(link);
  }

  function updateChrome() {
    const theme = $('meta[name="theme-color"]');
    if (theme) theme.content = '#f4f6f8';
    const release = $('.kcw-release');
    if (release) release.textContent = 'KOSIF · v46 · SHARP COMMAND CENTER';
    const suiteVersion = $('#suite-version');
    if (suiteVersion) suiteVersion.textContent = 'KOSIF Sharp Command Center v46';
  }

  function mountFolio() {
    const hero = $('#kosif-premium-welcome');
    if (!hero || $('.k41-folio', hero)) return;
    const folio = document.createElement('div');
    folio.className = 'k41-folio';
    folio.setAttribute('aria-hidden', 'true');
    folio.innerHTML = '<b>KOSIF COMMAND</b><span>SHARP v46</span>';
    hero.appendChild(folio);
  }

  function currentDomain() {
    const path = location.pathname;
    if (path.startsWith('/sales')) return 'sales';
    if (path.startsWith('/libraries')) return 'library';
    if (path.startsWith('/standards')) return 'standards';
    const view = document.body?.dataset.kosifCurrentView || $('section[data-view].show')?.dataset.view || '';
    return VIEW_DOMAINS.get(view) || 'work';
  }

  function syncDomain() {
    root.dataset.kosifDomain = currentDomain();
    root.dataset.kosifSharp = 'v46';
  }

  function mountScrollProgress() {
    if ($('#k41-scroll-progress')) return;
    const progress = document.createElement('div');
    progress.id = 'k41-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<i></i>';
    document.body.appendChild(progress);
  }

  function updateScrollProgress() {
    scrollQueued = false;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const ratio = Math.max(0, Math.min(1, (scrollY || document.documentElement.scrollTop || 0) / max));
    root.style.setProperty('--k41-scroll-progress', ratio.toFixed(4));
    queueVisibleReveal();
  }

  function queueScrollProgress() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScrollProgress);
  }

  function revealTargets(scope = document) {
    const selector = [
      '#kosif-premium-welcome',
      '#kosif-premium-actions',
      'section[data-view].show > .card',
      'section[data-view].show > .v38-hero',
      'section[data-view].show > .v38-card',
      'section[data-view].show .v38-report-section',
      'section[data-view].show .v38-tile',
      '.hero:has(.hero-metrics)',
      '.module',
      '.library-hero',
      '.book',
      '.source-policy',
      '.sales-hero',
      '.chapter-head',
      '.health-ribbon',
      '#view > .grid',
      '#library > .card',
      '#toc > .ci'
    ].join(',');
    $$(selector, scope).forEach((element, index) => {
      if (element.dataset.k41Reveal) {
        if (reduced || touchFirst) exposeTarget(element, true);
        return;
      }
      element.dataset.k41Reveal = '1';
      element.style.setProperty('--k41-delay', Math.min(index, 9) * 48 + 'ms');
      if (reduced || touchFirst || !revealObserver) exposeTarget(element, reduced || touchFirst);
      else revealObserver.observe(element);
    });
  }

  function exposeTarget(element, force = false) {
    element.classList.add('k41-in');
    if (force) {
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('filter', 'none', 'important');
      element.style.setProperty('transform', 'none', 'important');
    }
    revealObserver?.unobserve(element);
  }

  function revealVisibleTargets() {
    $$('section[data-view].show [data-k41-reveal], #view.show [data-k41-reveal]').forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top < innerHeight * .98 && rect.bottom > 0) {
        exposeTarget(element, reduced || touchFirst);
      }
    });
  }

  function revealAllTargets() {
    $$('[data-k41-reveal]').forEach(element => exposeTarget(element, reduced || touchFirst));
  }

  function queueVisibleReveal() {
    if (revealQueued) return;
    revealQueued = true;
    requestAnimationFrame(() => {
      revealQueued = false;
      revealVisibleTargets();
    });
  }

  function setupReveal() {
    if (!reduced && !touchFirst && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          exposeTarget(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }
    revealTargets();
    requestAnimationFrame(() => root.classList.add('k41-ready'));
    setTimeout(revealAllTargets, 1000);
  }

  function setupSpotlight() {
    if (!finePointer || reduced) return;
    const selector = '.card,.v38-card,.v38-tile,.panel,.mini-card,.issue,.module,.book,.principle,.source-policy,.ks40-standard-item';
    document.addEventListener('pointermove', event => {
      spotlightEvent = event;
      if (spotlightQueued) return;
      spotlightQueued = true;
      requestAnimationFrame(() => {
        spotlightQueued = false;
        const current = spotlightEvent;
        const card = current?.target.closest?.(selector);
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--k41-x', current.clientX - rect.left + 'px');
        card.style.setProperty('--k41-y', current.clientY - rect.top + 'px');
      });
    }, { passive: true });
  }

  function setupCoverParallax() {
    if (!finePointer || reduced) return;
    document.addEventListener('pointermove', event => {
      coverEvent = event;
      if (coverQueued) return;
      coverQueued = true;
      requestAnimationFrame(() => {
        coverQueued = false;
        const current = coverEvent;
        const hero = current?.target.closest?.('#kosif-premium-welcome');
        if (!hero) return;
        const rect = hero.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, ((current.clientX - rect.left) / rect.width - .5) * 2));
        const y = Math.max(-1, Math.min(1, ((current.clientY - rect.top) / rect.height - .5) * 2));
        hero.style.setProperty('--k41-tilt-x', (x * .8).toFixed(2) + 'deg');
        hero.style.setProperty('--k41-tilt-y', (y * -.6).toFixed(2) + 'deg');
      });
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      const hero = event.target.closest?.('#kosif-premium-welcome');
      if (!hero || hero.contains(event.relatedTarget)) return;
      hero.style.setProperty('--k41-tilt-x', '0deg');
      hero.style.setProperty('--k41-tilt-y', '0deg');
    }, { passive: true });
  }

  function decorate() {
    decorateQueued = false;
    root.dataset.kosifEdition = 'v41';
    root.dataset.kosifExperience = 'v41';
    root.dataset.kosifRevision = 'v41.2';
    root.dataset.kosifSharp = 'v46';
    root.dataset.kosifMotion = reduced ? 'reduced' : 'cinematic';
    syncDomain();
    updateChrome();
    mountFolio();
    revealTargets();
    if (reduced || touchFirst) revealAllTargets();
    requestAnimationFrame(() => requestAnimationFrame(revealVisibleTargets));
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(decorate);
  }

  function boot() {
    ensureStyles();
    ensureSharpLayer();
    root.dataset.kosifEdition = 'v41';
    root.dataset.kosifExperience = 'v41';
    root.dataset.kosifRevision = 'v41.2';
    root.dataset.kosifSharp = 'v46';
    root.dataset.kosifMotion = reduced ? 'reduced' : 'cinematic';
    syncDomain();
    updateChrome();
    mountFolio();
    mountScrollProgress();
    updateScrollProgress();
    setupReveal();
    setupSpotlight();
    setupCoverParallax();
    window.addEventListener('kosif-view-change', queueDecorate);
    window.addEventListener('scroll', queueScrollProgress, { passive: true });
    window.addEventListener('resize', queueScrollProgress, { passive: true });
    window.addEventListener('pageshow', () => setTimeout(revealAllTargets, 80), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(revealAllTargets, 180), { passive: true });
    document.addEventListener('touchstart', revealAllTargets, { passive: true, once: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revealAllTargets(); }, { passive: true });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-go],[data-kgo],[data-view-target],.sales-tabs button')) setTimeout(queueDecorate, 80);
    });
    new MutationObserver(queueDecorate).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
