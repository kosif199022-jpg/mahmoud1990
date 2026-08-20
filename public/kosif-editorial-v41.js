/*
 * KOSIF Editorial Cinematic v41
 * Progressive visual orchestration only. It never reads or writes audit values.
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
  const touchFirst = window.matchMedia?.('(hover: none), (pointer: coarse), (max-width: 840px)').matches === true;
  let revealObserver = null;
  let decorateQueued = false;
  let revealQueued = false;

  function ensureStyles() {
    if ($('link[data-kosif-editorial="v41"]') || $('#kosif-editorial-v41')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/kosif-editorial-v41.css?v=2026.08.20-v41';
    link.id = 'kosif-editorial-v41';
    link.dataset.kosifEditorial = 'v41';
    document.head.appendChild(link);
  }

  function updateChrome() {
    const theme = $('meta[name="theme-color"]');
    if (theme) theme.content = '#102825';
    const release = $('.kcw-release');
    if (release) release.textContent = 'KOSIF Editorial · v41 · CANVA DIRECTION';
    const suiteVersion = $('#suite-version');
    if (suiteVersion && !/v41/.test(suiteVersion.textContent || '')) suiteVersion.textContent = 'KOSIF Editorial v41';
  }

  function mountFolio() {
    const hero = $('#kosif-premium-welcome');
    if (!hero || $('.k41-folio', hero)) return;
    const folio = document.createElement('div');
    folio.className = 'k41-folio';
    folio.setAttribute('aria-hidden', 'true');
    folio.innerHTML = '<b>KOSIF REVIEW</b><span>ISSUE 41</span>';
    hero.appendChild(folio);
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
      if (element.dataset.k41Reveal) return;
      element.dataset.k41Reveal = '1';
      element.style.setProperty('--k41-delay', Math.min(index, 9) * 48 + 'ms');
      if (reduced || touchFirst || !revealObserver) element.classList.add('k41-in');
      else revealObserver.observe(element);
    });
  }

  function revealVisibleTargets() {
    $$('section[data-view].show [data-k41-reveal], #view.show [data-k41-reveal]').forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top < innerHeight * .98 && rect.bottom > 0) {
        element.classList.add('k41-in');
        revealObserver?.unobserve(element);
      }
    });
  }

  function revealAllTargets() {
    $$('[data-k41-reveal]').forEach(element => {
      element.classList.add('k41-in');
      revealObserver?.unobserve(element);
    });
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
          entry.target.classList.add('k41-in');
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }
    revealTargets();
    requestAnimationFrame(() => root.classList.add('k41-ready'));
    setTimeout(revealAllTargets, 1600);
  }

  function setupSpotlight() {
    if (!finePointer || reduced) return;
    const selector = '.card,.v38-card,.v38-tile,.panel,.mini-card,.issue,.module,.book,.principle,.source-policy,.ks40-standard-item';
    document.addEventListener('pointermove', event => {
      const card = event.target.closest?.(selector);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--k41-x', event.clientX - rect.left + 'px');
      card.style.setProperty('--k41-y', event.clientY - rect.top + 'px');
    }, { passive: true });
  }

  function setupCoverParallax() {
    if (!finePointer || reduced) return;
    document.addEventListener('pointermove', event => {
      const hero = event.target.closest?.('#kosif-premium-welcome');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      hero.style.setProperty('--k41-tilt-x', (x * 1.15).toFixed(2) + 'deg');
      hero.style.setProperty('--k41-tilt-y', (y * -0.85).toFixed(2) + 'deg');
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
    root.dataset.kosifMotion = reduced ? 'reduced' : 'cinematic';
    updateChrome();
    mountFolio();
    revealTargets();
    requestAnimationFrame(() => requestAnimationFrame(revealVisibleTargets));
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(decorate);
  }

  function boot() {
    ensureStyles();
    root.dataset.kosifEdition = 'v41';
    root.dataset.kosifExperience = 'v41';
    root.dataset.kosifMotion = reduced ? 'reduced' : 'cinematic';
    updateChrome();
    mountFolio();
    setupReveal();
    setupSpotlight();
    setupCoverParallax();
    window.addEventListener('kosif-view-change', queueDecorate);
    window.addEventListener('scroll', queueVisibleReveal, { passive: true });
    window.addEventListener('pageshow', () => setTimeout(revealAllTargets, 80), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(revealAllTargets, 180), { passive: true });
    document.addEventListener('touchstart', revealAllTargets, { passive: true, once: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revealAllTargets(); }, { passive: true });
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-go],[data-kgo],[data-view-target],.sales-tabs button')) setTimeout(queueDecorate, 80);
    });
    new MutationObserver(queueDecorate).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
