/*
 * KOSIF Theme v46 cascade guard.
 * Presentation only: keeps the approved v46 stylesheet last after legacy runtime injections.
 */
(() => {
  const ROOT_ATTR = 'data-kosif-theme';
  const VERSION = 'v46';
  const STYLE_ID = 'kosif-theme-v46';
  const STYLE_MATCH = /\/kosif-sharp-command-center-v46\.css(?:\?|$)/;

  function getThemeStylesheet() {
    return document.getElementById(STYLE_ID) ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
        .find((node) => STYLE_MATCH.test(node.getAttribute('href') || ''));
  }

  function enforceTheme() {
    document.documentElement.setAttribute(ROOT_ATTR, VERSION);
    const link = getThemeStylesheet();
    if (!link || !document.head) return;
    const styles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'));
    if (styles[styles.length - 1] !== link) document.head.append(link);
  }

  let queued = false;
  function scheduleEnforce() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      enforceTheme();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceTheme, { once: true });
  } else {
    enforceTheme();
  }

  new MutationObserver(scheduleEnforce).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
