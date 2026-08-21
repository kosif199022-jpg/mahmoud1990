/*
 * KOSIF Visual System v45 — cascade authority guard.
 * Presentation only. Keeps the single v45 stylesheet last among presentation
 * styles when historical runtimes inject v40/v41 CSS after initial parsing.
 */
(() => {
  'use strict';
  if (window.__KOSIF_VISUAL_SYSTEM_V45_GUARD__) return;
  window.__KOSIF_VISUAL_SYSTEM_V45_GUARD__ = true;

  const ID = 'kosif-visual-system-v45';
  const FLOOR_ID = 'kosif-visual-system-v45-floor';
  const HREF = '/kosif-visual-system-v45.css?v=2026.08.21-2';
  let queued = false;

  function visualLink() {
    let link = document.getElementById(ID);
    if (link) return link;
    link = document.createElement('link');
    link.id = ID;
    link.rel = 'stylesheet';
    link.href = HREF;
    document.head.appendChild(link);
    return link;
  }

  function visualFloor() {
    let floor = document.getElementById(FLOOR_ID);
    if (floor) return floor;
    floor = document.createElement('style');
    floor.id = FLOOR_ID;
    floor.textContent = `
      html[data-kosif-visual-system="v45"][data-kosif-visual="kosif-studio-v40"] .tab,
      html[data-kosif-visual-system="v45"] button.tab{
        min-height:var(--k45-touch,46px)!important;
      }
    `;
    document.head.appendChild(floor);
    return floor;
  }

  function isPresentationStyle(node) {
    return node?.nodeType === 1 && (
      node.tagName === 'STYLE' ||
      (node.tagName === 'LINK' && String(node.rel || '').toLowerCase() === 'stylesheet')
    );
  }

  function ensureLast() {
    queued = false;
    const link = visualLink();
    const floor = visualFloor();
    const styles = [...document.head.children].filter(isPresentationStyle);
    if (styles.at(-1) !== floor) {
      document.head.appendChild(link);
      document.head.appendChild(floor);
    }
  }

  function queueEnsureLast() {
    if (queued) return;
    queued = true;
    queueMicrotask(ensureLast);
  }

  // Observe only presentation-node insertions in <head>; never observe the page
  // subtree or attributes. Own v45 nodes are excluded to prevent self-trigger loops.
  const observer = new MutationObserver(records => {
    const lateStyleAdded = records.some(record =>
      [...record.addedNodes].some(node =>
        isPresentationStyle(node) && node.id !== ID && node.id !== FLOOR_ID
      )
    );
    if (lateStyleAdded) queueEnsureLast();
  });
  observer.observe(document.head, { childList: true });

  // Establish authority immediately. Mutation-driven repairs use a microtask so
  // a legacy stylesheet cannot be measured by the next browser task before v45.
  ensureLast();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueEnsureLast, { once: true });
  } else {
    queueEnsureLast();
  }
  window.addEventListener('load', queueEnsureLast, { once: true });
})();
