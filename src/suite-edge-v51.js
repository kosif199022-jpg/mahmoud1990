/* KOSIF v51 recorder-aware production wrapper.
 * Keeps the governed v43 suite intact while adding recorder v51 routes,
 * cache-busting the enhanced client loader, enforcing the compact mobile recorder control,
 * adding opt-in screen capture with Safari/iOS fallback,
 * and applying replay-proven UX fixes without weakening governed business logic.
 */
import suiteV43 from './suite-edge-v43.js';
import { handleUxRecorderV51 } from './ux-recorder-v51.mjs';

const COMPACT_GUARD = '<script id="kosif-recorder-compact-guard-v52" src="/kosif-recorder-compact-guard-v52.js?v=2026.08.22-2" defer></script>';
const RECORDER_FINALIZE_GUARD = '<script id="kosif-recorder-finalize-guard-v53" src="/kosif-recorder-finalize-guard-v53.js?v=2026.08.22-1" defer></script>';
const SCREEN_CAPTURE = '<script id="kosif-rec-screen-v54" src="/kosif-rec-screen-v54.js?v=2026.08.22-1" defer></script>';
const AUDIT_UX_FIXES = '<link rel="stylesheet" id="kosif-ux-replay-fixes-v53-css" href="/kosif-ux-replay-fixes-v53.css?v=2026.08.22-1"><script id="kosif-ux-replay-fixes-v53" src="/kosif-ux-replay-fixes-v53.js?v=2026.08.22-1" defer></script>';

function auditPath(url) {
  const path = url?.pathname || '';
  return path === '/a' || path === '/a/' || path === '/audit' || path === '/audit/' || path.startsWith('/audit/');
}

function recorderEligible(url) {
  const path = url?.pathname || '';
  return !(path === '/wealth' || path.startsWith('/wealth/'));
}

function upgradeRecorderClient(response, url) {
  const headers = new Headers(response.headers);
  const contentType = headers.get('content-type') || '';
  if (!/text\/html/i.test(contentType)) return response;

  const rewriter = new HTMLRewriter();
  rewriter.on('#kosif-ux-session-recorder', {
    element(el) {
      el.setAttribute('src', '/responsive-preview-plugin.js?v=2026.08.22-v53-replay-fixes');
    }
  });
  rewriter.on('head', {
    element(head) {
      if (recorderEligible(url)) {
        head.append(COMPACT_GUARD, { html: true });
        head.append(RECORDER_FINALIZE_GUARD, { html: true });
        head.append(SCREEN_CAPTURE, { html: true });
      }
      if (auditPath(url)) head.append(AUDIT_UX_FIXES, { html: true });
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
    return upgradeRecorderClient(response, url);
  }
};
