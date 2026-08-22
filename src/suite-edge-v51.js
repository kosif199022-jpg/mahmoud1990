/* KOSIF v51 recorder-aware production wrapper.
 * Keeps the governed v43 suite intact while adding recorder v51 routes,
 * cache-busting the enhanced client loader, enforcing the compact mobile recorder control,
 * adding opt-in screen capture with Safari/iOS fallback,
 * and applying replay-proven UX fixes without weakening governed business logic.
 */
import suiteV43 from './suite-edge-v43.js';
import { handleUxRecorderV51 } from './ux-recorder-v51.mjs';
import { reconcileBankLedgerGoverned, governedReconciliationCapabilities } from './engine/bank-reconciliation-governed-v1.mjs';

const COMPACT_GUARD = '<script id="kosif-recorder-compact-guard-v52" src="/kosif-recorder-compact-guard-v52.js?v=2026.08.22-2" defer></script>';
const RECORDER_FINALIZE_GUARD = '<script id="kosif-recorder-finalize-guard-v53" src="/kosif-recorder-finalize-guard-v53.js?v=2026.08.22-1" defer></script>';
const SCREEN_CAPTURE = '<script id="kosif-rec-screen-v54" src="/kosif-rec-screen-v54.js?v=2026.08.22-v54.2" defer></script>';
const SCREEN_CAPTURE_INTEGRATION = '<script id="kosif-rec-screen-integration-v55" src="/kosif-rec-screen-integration-v55.js?v=2026.08.22-2" defer></script>';
const AUDIT_UX_FIXES = '<link rel="stylesheet" id="kosif-ux-replay-fixes-v53-css" href="/kosif-ux-replay-fixes-v53.css?v=2026.08.22-1"><script id="kosif-ux-replay-fixes-v53" src="/kosif-ux-replay-fixes-v53.js?v=2026.08.22-1" defer></script>';
const BANK_RECONCILIATION = '<script id="kosif-bank-reconciliation-v1" src="/bank-reconciliation-v1.js?v=2026.08.22-1" defer></script>';

function auditPath(url) {
  const path = url?.pathname || '';
  return path === '/a' || path === '/a/' || path === '/audit' || path === '/audit/' || path.startsWith('/audit/');
}

function recorderEligible(url) {
  const path = url?.pathname || '';
  return !(path === '/wealth' || path.startsWith('/wealth/'));
}

function reconciliationJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-kosif-reconciliation': governedReconciliationCapabilities.version
    }
  });
}

async function handleBankReconciliation(req, url) {
  if (url.pathname === '/api/kosif/reconciliation/capabilities') {
    if (req.method !== 'GET') return reconciliationJson({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    return reconciliationJson({ ok: true, ...governedReconciliationCapabilities });
  }
  if (url.pathname !== '/api/kosif/reconciliation/run') return null;
  if (req.method !== 'POST') return reconciliationJson({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > 2_000_000) return reconciliationJson({ ok: false, error: 'PAYLOAD_TOO_LARGE' }, 413);
  const raw = await req.text();
  if (raw.length > 2_000_000) return reconciliationJson({ ok: false, error: 'PAYLOAD_TOO_LARGE' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return reconciliationJson({ ok: false, error: 'INVALID_JSON' }, 400); }
  if (!Array.isArray(body?.bankTransactions) || !Array.isArray(body?.ledgerTransactions)) {
    return reconciliationJson({ ok: false, error: 'TRANSACTION_ARRAYS_REQUIRED' }, 400);
  }
  if (body.bankTransactions.length > 10000 || body.ledgerTransactions.length > 10000) {
    return reconciliationJson({ ok: false, error: 'TOO_MANY_TRANSACTIONS', limitPerSide: 10000 }, 413);
  }
  try {
    return reconciliationJson(reconcileBankLedgerGoverned(body));
  } catch (error) {
    return reconciliationJson({ ok: false, error: 'RECONCILIATION_INPUT_INVALID', message: String(error?.message || error).slice(0, 240) }, 400);
  }
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
        head.append(SCREEN_CAPTURE_INTEGRATION, { html: true });
      }
      if (auditPath(url)) {
        head.append(AUDIT_UX_FIXES, { html: true });
        head.append(BANK_RECONCILIATION, { html: true });
      }
    }
  });
  return rewriter.transform(response);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const reconciliation = await handleBankReconciliation(req, url);
    if (reconciliation) return reconciliation;
    const recorder = await handleUxRecorderV51(req, env, ctx, url);
    if (recorder) return recorder;
    const response = await suiteV43.fetch(req, env, ctx);
    return upgradeRecorderClient(response, url);
  }
};