/*
 * KOSIF Theme v46 cascade guard.
 * Presentation only: keeps the approved v46 stylesheet last after legacy runtime injections.
 */
(() => {
  'use strict';
  if (window.__KOSIF_THEME_V46_GUARD__) return;
  window.__KOSIF_THEME_V46_GUARD__ = true;

  const ROOT_ATTR = 'data-kosif-theme';
  const VERSION = 'v46';
  const STYLE_ID = 'kosif-theme-v46';
  const FLOOR_ID = 'kosif-theme-v46-floor';
  const STYLE_MATCH = /\/kosif-sharp-command-center-v46\.css(?:\?|$)/;
  let queued = false;

  function getThemeStylesheet() {
    return document.getElementById(STYLE_ID) ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
        .find((node) => STYLE_MATCH.test(node.getAttribute('href') || ''));
  }

  function getThemeFloor() {
    let floor = document.getElementById(FLOOR_ID);
    if (floor) return floor;
    floor = document.createElement('style');
    floor.id = FLOOR_ID;
    // Preserve the production desktop-width contract while retaining the v46
    // visual rhythm. The proposal's 1240px reading width is used inside cards;
    // the application shell itself must remain fluid on 1366/1920px workspaces.
    floor.textContent = `
      html[data-kosif-theme="v46"] :is(main,.tabs-inner,.topbar-inner){
        width:100%!important;
        max-width:1800px!important;
      }
    `;
    document.head.append(floor);
    return floor;
  }

  function isPresentationStyle(node) {
    return node?.nodeType === 1 && (
      node.tagName === 'STYLE' ||
      (node.tagName === 'LINK' && String(node.rel || '').toLowerCase() === 'stylesheet')
    );
  }

  function enforceTheme() {
    queued = false;
    document.documentElement.setAttribute(ROOT_ATTR, VERSION);
    const link = getThemeStylesheet();
    if (!link || !document.head) return;
    const floor = getThemeFloor();
    const styles = Array.from(document.head.children).filter(isPresentationStyle);
    if (styles[styles.length - 1] !== floor) {
      document.head.append(link);
      document.head.append(floor);
    }
  }

  function scheduleEnforce() {
    if (queued) return;
    queued = true;
    queueMicrotask(enforceTheme);
  }

  const observer = new MutationObserver((records) => {
    const lateStyleAdded = records.some((record) =>
      Array.from(record.addedNodes).some((node) =>
        isPresentationStyle(node) && node.id !== STYLE_ID && node.id !== FLOOR_ID
      )
    );
    if (lateStyleAdded) scheduleEnforce();
  });
  observer.observe(document.head, { childList: true });

  enforceTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEnforce, { once: true });
  } else {
    scheduleEnforce();
  }
  window.addEventListener('load', scheduleEnforce, { once: true });
})();
