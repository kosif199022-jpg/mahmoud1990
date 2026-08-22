/* KOSIF v51 recorder-aware production wrapper.
 * Keeps the governed v43 suite intact while adding recorder v51 routes,
 * cache-busting the enhanced client loader, and enforcing the compact mobile recorder control.
 */
import suiteV43 from './suite-edge-v43.js';
import { handleUxRecorderV51 } from './ux-recorder-v51.mjs';

const COMPACT_GUARD = '<script id="kosif-recorder-compact-guard-v52" src="/kosif-recorder-compact-guard-v52.js?v=2026.08.22-2" defer></script>';

function upgradeRecorderClient(response) {
  const headers = new Headers(response.headers);
  const contentType = headers.get('content-type') || '';
  if (!/text\/html/i.test(contentType)) return response;

  const rewriter = new HTMLRewriter();
  rewriter.on('#kosif-ux-session-recorder', {
    element(el) {
      el.setAttribute('src', '/responsive-preview-plugin.js?v=2026.08.22-v52-mobile-compact');
    }
  });
  rewriter.on('head', {
    element(head) {
      head.append(COMPACT_GUARD, { html: true });
    }
  });
  return rewriter.transform(response);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const recorder = await handleUxRecorderV51(req, env, ctx, url);
    if (recorder) return recorder;
    const response = await suiteV43.fetch(req, env, ctx);
    return upgradeRecorderClient(response);
  }
};
