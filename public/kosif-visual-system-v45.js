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

  function isPresentationStyle(node) {
    return node?.nodeType === 1 && (
      node.tagName === 'STYLE' ||
      (node.tagName === 'LINK' && String(node.rel || '').toLowerCase() === 'stylesheet')
    );
  }

  function ensureLast() {
    queued = false;
    const link = visualLink();
    const styles = [...document.head.children].filter(isPresentationStyle);
    if (styles.at(-1) !== link) document.head.appendChild(link);
  }

  function queueEnsureLast() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(ensureLast);
  }

  // Observe only presentation-node insertions in <head>; never observe the page
  // subtree or attributes. Moving our own link creates one final mutation, then
  // stops because it is already the last presentation style.
  const observer = new MutationObserver(records => {
    const lateStyleAdded = records.some(record =>
      [...record.addedNodes].some(node => isPresentationStyle(node) && node.id !== ID)
    );
    if (lateStyleAdded) queueEnsureLast();
  });
  observer.observe(document.head, { childList: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueEnsureLast, { once: true });
  } else {
    queueEnsureLast();
  }
  window.addEventListener('load', queueEnsureLast, { once: true });
})();
