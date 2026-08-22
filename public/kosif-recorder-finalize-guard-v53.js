/* KOSIF recorder finalization guard v53.
 * Prevents the legacy v2 draft from being copied before v51 finishes the linked v3 replay.
 */
(() => {
  'use strict';
  if (window.__KOSIF_RECORDER_FINALIZE_GUARD_V53__) return;
  window.__KOSIF_RECORDER_FINALIZE_GUARD_V53__ = true;

  let pollTimer = 0;

  function reportParts() {
    return {
      report: document.getElementById('kosif-rec-report'),
      card: document.getElementById('kosif-rec-card'),
      box: document.getElementById('kosif-rec-code'),
      copy: document.getElementById('kosif-rec-copy'),
      download: document.getElementById('kosif-rec-download')
    };
  }

  function stateNode(card) {
    let node = document.getElementById('kosif-rec-v53-state');
    if (node || !card) return node;
    node = document.createElement('div');
    node.id = 'kosif-rec-v53-state';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    const box = document.getElementById('kosif-rec-code');
    card.insertBefore(node, box || null);
    return node;
  }

  function setFinalizing(on, message) {
    const { report, card, copy, download } = reportParts();
    report?.classList.toggle('kosif-v53-finalizing', Boolean(on));
    if (copy) copy.disabled = Boolean(on);
    if (download) download.disabled = Boolean(on);
    const node = stateNode(card);
    if (node) {
      node.className = on ? 'kosif-rec-v53-state busy' : 'kosif-rec-v53-state ready';
      node.textContent = message || (on ? 'جارٍ إنهاء تقرير UX وربط كل نقرة بنتيجتها…' : '✓ تقرير UX v3 جاهز للنسخ');
    }
  }

  function enhanceInstruction(replay) {
    const extra = 'اعتمد enhancer.events كالمصدر الأحدث لربط clickId مع click-result، واستخدم deadClickCandidate وrage-click ولقطات enhancer عند التعارض مع أحداث v2 القديمة. تجاهل أحداث النقر التي تقع إحداثياتها خارج viewport باعتبارها artifacts من التسجيل.';
    const current = String(replay.instruction || '').trim();
    if (!current.includes('enhancer.events')) replay.instruction = current ? `${current} ${extra}` : extra;
    return replay;
  }

  function finalizeIfReady() {
    const { box } = reportParts();
    if (!box?.value?.trim()) return false;
    try {
      const replay = JSON.parse(box.value);
      if (replay.schema !== 'kosif.chatgpt.ux-replay.v3' || !replay.enhancer?.events) return false;
      enhanceInstruction(replay);
      box.value = JSON.stringify(replay, null, 2);
      window.__KOSIF_LAST_UX_REPLAY__ = replay;
      setFinalizing(false, '✓ تقرير UX v3 جاهز — تم ربط النقرات بنتائجها وإضافة تشخيصات v51.');
      return true;
    } catch (_) {
      return false;
    }
  }

  function waitForV3() {
    clearInterval(pollTimer);
    setFinalizing(true);
    let tries = 0;
    pollTimer = setInterval(() => {
      tries += 1;
      if (finalizeIfReady()) {
        clearInterval(pollTimer);
        pollTimer = 0;
        return;
      }
      if (tries >= 100) {
        clearInterval(pollTimer);
        pollTimer = 0;
        setFinalizing(false, '⚠️ تعذر إكمال طبقة v3 خلال المهلة؛ راجع حالة الحفظ قبل نسخ التقرير.');
      }
    }, 100);
  }

  window.addEventListener('kosif-ux-replay-ready', waitForV3, true);
})();
