/* KOSIF UX Replay Fixes v53
 * Repairs issues proven by the 2026-08-22 mobile UX replay without weakening owner-only data boundaries.
 */
(() => {
  'use strict';
  if (window.__KOSIF_UX_REPLAY_FIXES_V53__) return;
  window.__KOSIF_UX_REPLAY_FIXES_V53__ = true;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const currentView = () => document.body?.dataset.kosifCurrentView || $('section[data-view].show')?.dataset.view || '';
  let pendingCompanyOpen = false;
  let lastView = currentView();
  let enhanceQueued = false;

  function resetToTopForNewView(nextView) {
    const next = String(nextView || currentView() || '');
    if (!next || next === lastView) return;
    lastView = next;
    const reset = () => {
      if (currentView() === next) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    requestAnimationFrame(() => requestAnimationFrame(reset));
    setTimeout(reset, 90);
    setTimeout(reset, 220);
  }

  function syncViewFromDom() {
    const next = currentView();
    if (next && next !== lastView) resetToTopForNewView(next);
  }

  function patchStaticYear() {
    const year = $('#kosif-premium-year');
    if (!year || year.dataset.kosifStatic === '1') return;
    year.dataset.kosifStatic = '1';
    year.setAttribute('role', 'status');
    year.setAttribute('aria-disabled', 'true');
    year.setAttribute('title', 'السنة المالية الحالية');
  }

  function ensureOwnerMailFeedback() {
    const gate = $('#kosif-ai-gate');
    const box = $('.box', gate || document);
    if (!gate || !box) return;

    const oldMailNote = $('.mail-note', gate);
    if (oldMailNote && oldMailNote.dataset.kosifTruthfulMail !== '1') {
      oldMailNote.dataset.kosifTruthfulMail = '1';
      oldMailNote.textContent = '✉️ استعادة كلمة المرور بالبريد غير مهيأة حاليًا. الخادم يحتفظ ببصمة آمنة ولا يمكنه استرجاع كلمة المرور الأصلية.';
    }

    const button = $('#kosif-send-email-now', gate);
    if (!button) return;
    if (button.textContent.trim() !== '✉ حالة البريد') button.textContent = '✉ حالة البريد';
    button.setAttribute('aria-describedby', 'kosif-owner-mail-feedback');

    let feedback = $('#kosif-owner-mail-feedback', gate);
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'kosif-owner-mail-feedback';
      feedback.className = 'kosif-owner-mail-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      button.insertAdjacentElement('afterend', feedback);
    }

    const err = $('#kosif-ai-gate-error', gate);
    if (err) {
      err.setAttribute('role', 'alert');
      err.setAttribute('aria-live', 'assertive');
    }
    const unlock = $('#kosif-ai-unlock', gate);
    if (unlock) {
      if (unlock.disabled) unlock.setAttribute('aria-busy', 'true');
      else unlock.removeAttribute('aria-busy');
    }
  }

  function showMailStatus(button) {
    const gate = button.closest('#kosif-ai-gate') || $('#kosif-ai-gate');
    if (!gate) return;
    ensureOwnerMailFeedback();
    const feedback = $('#kosif-owner-mail-feedback', gate);
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = 'البريد غير مهيأ للإرسال من Kosif حاليًا. لن يدّعي النظام أنه أرسل رسالة، ولن يحاول استرجاع كلمة المرور من البصمة الآمنة.';
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }, 1000);
  }

  async function openCompanyPickerSafely() {
    const gate = window.KosifAIGate;
    if (!gate?.status) {
      window.openCompanies?.();
      return;
    }
    let unlocked = false;
    try { unlocked = await gate.status(true); } catch (_) { unlocked = false; }
    if (unlocked) {
      window.openCompanies?.();
      return;
    }
    pendingCompanyOpen = true;
    gate.open?.();
  }

  function scheduleEnhance() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(() => {
      enhanceQueued = false;
      patchStaticYear();
      ensureOwnerMailFeedback();
      syncViewFromDom();
    });
  }

  document.addEventListener('click', event => {
    const company = event.target.closest?.('#pill-entity');
    if (company) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void openCompanyPickerSafely();
      return;
    }

    const mail = event.target.closest?.('#kosif-send-email-now');
    if (mail) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMailStatus(mail);
    }
  }, true);

  window.addEventListener('kosif-ai-gate-change', event => {
    scheduleEnhance();
    if (!event.detail?.unlocked || !pendingCompanyOpen) return;
    pendingCompanyOpen = false;
    setTimeout(() => window.openCompanies?.(), 0);
  });

  window.addEventListener('kosif-view-change', event => {
    resetToTopForNewView(event.detail?.view || currentView());
    scheduleEnhance();
  }, true);

  if ('MutationObserver' in window) {
    new MutationObserver(records => {
      if (records.some(record => record.type === 'childList' || record.attributeName === 'class' || record.attributeName === 'disabled')) scheduleEnhance();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
  }

  scheduleEnhance();
})();
