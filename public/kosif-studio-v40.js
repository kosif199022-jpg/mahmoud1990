/*
 * KOSIF Studio v40 — experience orchestration and installability.
 * Presentation and navigation only. No accounting, audit, persistence,
 * standards authority, AI approval, or security decision is made here.
 */
(() => {
  'use strict';
  if (window.__KOSIF_STUDIO_V40__) return;
  window.__KOSIF_STUDIO_V40__ = true;

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const cssEscape = value => window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&');
  const state = { installPrompt: null, installed: false, launcherOpen: false };
  let launcherPageLock = null;

  root.dataset.kosifVisual = 'kosif-studio-v40';
  root.dataset.kosifExperience = 'v40';

  const GROUPS = [
    {
      id: 'work', title: 'العمل اليومي',
      items: [
        ['overview', '⌂', 'الرئيسية', 'حالة ملف الارتباط والخطوات التالية'],
        ['tb', '▦', 'ميزان المراجعة', 'استيراد الحسابات والتحقق من التوازن'],
        ['rounds', '↻', 'جولات المراجعة', 'إجراءات ونتائج ومتابعة قابلة للتتبع'],
        ['pbc', '⇩', 'طلبات المستندات', 'PBC وحالة الأدلة المطلوبة']
      ]
    },
    {
      id: 'assurance', title: 'الفحص والحكم المهني',
      items: [
        ['v38', '◆', 'مركز القدرات', 'النواة الحتمية وكل وحدات KOSIF'],
        ['v38-core', '⚙', 'النواة الحتمية', 'قيود وميزان وأهمية نسبية وعينات'],
        ['analytics', '📈', 'التحليلات', 'نسب واختبارات استثنائية وجنائية'],
        ['map', '🧭', 'الخريطة المعيارية', 'ربط الحسابات والمخاطر والمعايير'],
        ['v38-accounting', '∛', 'الحاسبات المحاسبية', 'حسابات مساعدة محكومة ومدخلات صريحة'],
        ['v38-lab', '🧪', 'مختبر التدقيق', 'بيانات اصطناعية واختبارات أداء آمنة']
      ]
    },
    {
      id: 'evidence', title: 'الأدلة والمعايير والمصادر',
      items: [
        ['v38-graph', '🕸', 'رسم الأدلة', 'العلاقة بين الدليل والنتيجة والقرار'],
        ['library', '▥', 'مكتبة المعايير', 'SOCPA وIFRS وISA حسب سلطة المصدر'],
        ['sources', '🌐', 'المصادر الرسمية', 'الجهات والنسخ والتواريخ المهنية'],
        ['v38-sources', '◉', 'ذكاء المصادر', 'طبقات ثقة وكشف التغيّر المقنّن'],
        ['reviewer', '🎙', 'ملاحظات المراجع', 'نص وصوت ووسائط مرتبطة بالملف']
      ]
    },
    {
      id: 'deliver', title: 'التقارير والتعاون والاعتماد',
      items: [
        ['outputs', '▤', 'المخرجات', 'التسويات والمسودات وسجل الإكمال'],
        ['v38-reports', '📄', 'التقارير المحكومة', 'جاهزية ورسوم حتمية ونسخ قابلة للتتبع'],
        ['v38-io', '⇅', 'الاستيراد والتصدير', 'حزم ارتباط وCSV وXLSX ونسخ احتياطية'],
        ['council', '⚖', 'مجلس المراجعين', 'مراجعات مستقلة واختلافات محفوظة'],
        ['v38-council', '👥', 'مجلس المراجعين v3', 'أربعة مقاعد AI واعتماد بشري موثق'],
        ['v38-live', '◉', 'المحادثة المباشرة', 'محادثة نصية وصوتية استشارية']
      ]
    },
    {
      id: 'system', title: 'المعرفة والنظام',
      items: [
        ['v38-books', '📚', 'الكتب والمراجع', 'بحث وقراءة مع الحفاظ على تصنيف المصدر'],
        ['settings', '⚙', 'الإعدادات', 'المنشأة والمظهر وحجم الخط والضوابط'],
        ['about', 'ⓘ', 'عن KOSIF', 'الإصدار والحوكمة وحدود مسؤولية النظام'],
        [{ href: '/libraries/' }, '⌘', 'مكتبات KOSIF', 'مفاتيح الثروة وكتب المعايير'],
        [{ href: '/sales/' }, '↗', 'تحليل المبيعات', 'التحليلات والربحية والعملاء والجودة'],
        [{ action: 'theme' }, '◐', 'تبديل المظهر', 'فاتح أو داكن مع حفظ الاختيار']
      ]
    }
  ];

  const VIEW_GROUP = new Map();
  GROUPS.forEach(group => group.items.forEach(item => {
    if (typeof item[0] === 'string') VIEW_GROUP.set(item[0], group.id);
  }));

  function isStandalone() {
    return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function toast(message, kind = 'info') {
    if (window.KosifV38?.toast) return window.KosifV38.toast(message, kind);
    let host = $('#ks40-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'ks40-toast-host';
      host.setAttribute('aria-live', 'polite');
      host.style.cssText = 'position:fixed;z-index:2147483600;inset-inline-start:14px;bottom:76px;display:grid;gap:8px;max-width:min(360px,calc(100vw - 28px))';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.style.cssText = 'padding:11px 13px;border-radius:13px;background:#211710;color:#fff1d2;box-shadow:0 16px 44px -20px rgba(0,0,0,.65);font:700 12px/1.65 Alexandria,Tahoma,system-ui';
    item.textContent = message;
    host.appendChild(item);
    setTimeout(() => item.remove(), 4300);
  }

  function ensurePwaHead() {
    const head = document.head;
    if (!head) return;
    if (!$('link[rel="manifest"]', head)) {
      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/manifest.webmanifest?v=41';
      head.appendChild(manifest);
    }
    if (!$('link[rel="apple-touch-icon"]', head)) {
      const icon = document.createElement('link');
      icon.rel = 'apple-touch-icon';
      icon.href = '/icons/apple-touch-icon.png?v=41';
      head.appendChild(icon);
    }
    if (!$('meta[name="apple-mobile-web-app-capable"]', head)) {
      const capable = document.createElement('meta');
      capable.name = 'apple-mobile-web-app-capable';
      capable.content = 'yes';
      head.appendChild(capable);
    }
    if (!$('meta[name="apple-mobile-web-app-status-bar-style"]', head)) {
      const status = document.createElement('meta');
      status.name = 'apple-mobile-web-app-status-bar-style';
      status.content = 'default';
      head.appendChild(status);
    }
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      registration.update().catch(() => {});
      root.dataset.kosifSw = 'ready';
    } catch (error) {
      root.dataset.kosifSw = 'failed';
      console.warn('[KOSIF v40] Service Worker registration failed', error);
    }
  }

  function availableItem(spec) {
    const target = spec[0];
    if (typeof target !== 'string') return true;
    return Boolean($('section[data-view="' + cssEscape(target) + '"]') || $('.tab[data-go="' + cssEscape(target) + '"]'));
  }

  function launcherMarkup() {
    const groups = GROUPS.map(group => {
      const items = group.items.filter(availableItem).map(spec => {
        const target = spec[0];
        const attrs = typeof target === 'string'
          ? 'data-view-target="' + target + '"'
          : target.href
            ? 'data-href="' + target.href + '"'
            : 'data-action="' + target.action + '"';
        return '<button type="button" class="ks40-launch-item" data-group="' + group.id + '" ' + attrs + ' data-search="' + spec[2] + ' ' + spec[3] + '">' +
          '<span class="ic" aria-hidden="true">' + spec[1] + '</span><b>' + spec[2] + '</b><small>' + spec[3] + '</small></button>';
      }).join('');
      if (!items) return '';
      return '<section class="ks40-launch-group" data-group-section="' + group.id + '"><h3>' + group.title + '</h3><div class="ks40-launch-grid">' + items + '</div></section>';
    }).join('');

    return '<div class="ks40-overlay" id="ks40-launch-overlay" hidden>' +
      '<div class="ks40-launcher" role="dialog" aria-modal="true" aria-labelledby="ks40-launch-title">' +
      '<header class="ks40-launch-head"><div><h2 id="ks40-launch-title">مركز قدرات KOSIF</h2><p>كل الشاشات مرتبة حسب مسار العمل. ابحث أو انتقل مباشرة دون فقد أي قدرة.</p></div>' +
      '<button type="button" class="ks40-launch-close" aria-label="إغلاق">×</button></header>' +
      '<label class="ks40-launch-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="ks40-launch-query" type="search" autocomplete="off" placeholder="ابحث عن شاشة أو قدرة…" aria-label="بحث القدرات"></label>' +
      '<div class="ks40-launch-body">' + groups + '<div class="ks40-launch-empty" hidden>لا توجد قدرة مطابقة. جرّب كلمة أقصر.</div></div>' +
      '<div class="ks40-install-card"><span class="ic" aria-hidden="true">⌄</span><div><b data-install-title>ثبّت KOSIF كتطبيق</b><small data-install-copy>وصول سريع وشاشة مستقلة على الجوال أو سطح المكتب.</small></div><button type="button" data-install-action>تثبيت التطبيق</button></div>' +
      '<div class="ks40-install-help" id="ks40-install-help" hidden></div>' +
      '</div></div>';
  }

  function currentFocusables() {
    const overlay = $('#ks40-launch-overlay');
    if (!overlay || overlay.hidden) return [];
    return $$('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])', overlay).filter(el => !el.hidden && el.offsetParent !== null);
  }

  function lockLauncherPage(preferredY) {
    const continuity = window.KosifContinuity;
    if (continuity?.syncDialogLock) {
      continuity.syncDialogLock(preferredY);
      return;
    }
    if (launcherPageLock) return;
    const body = document.body, html = document.documentElement;
    const y = Math.max(0, Number.isFinite(preferredY) ? preferredY : (window.scrollY || html.scrollTop || 0));
    launcherPageLock = {
      y,
      rootScrollBehavior: html.style.scrollBehavior,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow
    };
    html.style.scrollBehavior = 'auto';
    body.dataset.kosifDialogOpen = '1';
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  function unlockLauncherPage() {
    const continuity = window.KosifContinuity;
    if (continuity?.syncDialogLock) {
      continuity.syncDialogLock();
      return;
    }
    if (!launcherPageLock) {
      delete document.body.dataset.kosifDialogOpen;
      return;
    }
    const body = document.body, html = document.documentElement, saved = launcherPageLock;
    launcherPageLock = null;
    body.style.position = saved.position;
    body.style.top = saved.top;
    body.style.left = saved.left;
    body.style.right = saved.right;
    body.style.width = saved.width;
    body.style.overflow = saved.overflow;
    delete body.dataset.kosifDialogOpen;
    window.scrollTo(0, saved.y);
    requestAnimationFrame(() => { html.style.scrollBehavior = saved.rootScrollBehavior; });
  }

  let previouslyFocused = null;
  function openLauncher({ installHelp = false } = {}) {
    const overlay = $('#ks40-launch-overlay');
    if (!overlay) return;
    previouslyFocused = document.activeElement;
    const pageY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    window.KosifContinuity?.registerDialogs?.();
    overlay.hidden = false;
    state.launcherOpen = true;
    lockLauncherPage(pageY);
    updateInstallUI();
    if (installHelp) showInstallHelp();
    requestAnimationFrame(() => $('#ks40-launch-query')?.focus());
  }

  function closeLauncher() {
    const overlay = $('#ks40-launch-overlay');
    if (!overlay) return;
    overlay.hidden = true;
    state.launcherOpen = false;
    unlockLauncherPage();
    previouslyFocused?.focus?.();
  }

  function goView(id) {
    const tab = $('.tab[data-go="' + cssEscape(id) + '"]');
    if (tab) tab.click();
    else if (typeof window.go === 'function') window.go(id);
    else {
      $$('section[data-view]').forEach(section => section.classList.toggle('show', section.dataset.view === id));
    }
    closeLauncher();
    setTimeout(syncCurrentView, 60);
  }

  function toggleTheme() {
    const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('kosif_theme', next); } catch {}
    toast(next === 'dark' ? 'تم تشغيل الوضع الداكن' : 'تم تشغيل الوضع الفاتح', 'ok');
    closeLauncher();
  }

  function showInstallHelp() {
    const help = $('#ks40-install-help');
    if (!help) return;
    const steps = isIOS()
      ? [
          ['1', 'افتح قائمة المشاركة', 'اضغط زر المشاركة في Safari أسفل الشاشة أو أعلاها.'],
          ['2', 'اختر إضافة إلى الشاشة الرئيسية', 'مرّر قائمة الإجراءات ثم اضغط «إضافة إلى الشاشة الرئيسية».'],
          ['3', 'أكّد الإضافة', 'اضغط «إضافة» ليظهر KOSIF كتطبيق مستقل.']
        ]
      : [
          ['1', 'استخدم Chrome أو Edge', 'افتح KOSIF من اتصال HTTPS في متصفح يدعم تطبيقات الويب.'],
          ['2', 'اختر تثبيت التطبيق', 'اضغط أيقونة التثبيت في شريط العنوان أو من قائمة المتصفح.'],
          ['3', 'افتحه من جهازك', 'سيظهر KOSIF في قائمة التطبيقات وسطح المكتب أو الشاشة الرئيسية.']
        ];
    help.innerHTML = steps.map(step => '<div class="ks40-install-step"><i>' + step[0] + '</i><div><b>' + step[1] + '</b><span>' + step[2] + '</span></div></div>').join('');
    help.hidden = false;
    help.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function requestInstall() {
    if (isStandalone() || state.installed) {
      toast('KOSIF مثبت بالفعل على هذا الجهاز', 'ok');
      return;
    }
    if (state.installPrompt) {
      const prompt = state.installPrompt;
      state.installPrompt = null;
      await prompt.prompt();
      const result = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
      if (result.outcome === 'accepted') toast('بدأ تثبيت KOSIF على جهازك', 'ok');
      else toast('لم يتم التثبيت. يمكنك المحاولة لاحقًا من زر التثبيت.', 'info');
      updateInstallUI();
      return;
    }
    openLauncher({ installHelp: true });
  }

  function updateInstallUI() {
    const installed = isStandalone() || state.installed;
    $$('[data-install-action]').forEach(button => {
      button.dataset.installed = String(installed);
      button.textContent = installed ? 'مثبّت ✓' : state.installPrompt ? 'تثبيت الآن' : 'طريقة التثبيت';
      button.disabled = installed;
    });
    $$('[data-install-title]').forEach(el => { el.textContent = installed ? 'KOSIF يعمل كتطبيق مستقل' : 'ثبّت KOSIF كتطبيق'; });
    $$('[data-install-copy]').forEach(el => {
      el.textContent = installed
        ? 'تم التثبيت بنجاح ويمكن فتحه من جهازك.'
        : isIOS()
          ? 'على iPhone وiPad: أضفه إلى الشاشة الرئيسية من Safari.'
          : state.installPrompt
            ? 'جاهز للتثبيت على هذا الجهاز.'
            : 'وصول سريع وشاشة مستقلة على الجوال أو سطح المكتب.';
    });
  }

  function bindLauncher() {
    const overlay = $('#ks40-launch-overlay');
    if (!overlay) return;
    $('.ks40-launch-close', overlay).addEventListener('click', closeLauncher);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeLauncher(); });
    overlay.addEventListener('click', event => {
      const item = event.target.closest('.ks40-launch-item');
      if (item?.dataset.viewTarget) goView(item.dataset.viewTarget);
      else if (item?.dataset.href) location.href = item.dataset.href;
      else if (item?.dataset.action === 'theme') toggleTheme();
      if (event.target.closest('[data-install-action]')) requestInstall();
    });
    const query = $('#ks40-launch-query', overlay);
    query.addEventListener('input', () => {
      const value = query.value.trim().toLocaleLowerCase('ar');
      let visible = 0;
      $$('.ks40-launch-item', overlay).forEach(item => {
        const match = !value || (item.dataset.search || item.textContent).toLocaleLowerCase('ar').includes(value);
        item.hidden = !match;
        if (match) visible += 1;
      });
      $$('.ks40-launch-group', overlay).forEach(group => {
        group.hidden = !$$('.ks40-launch-item:not([hidden])', group).length;
      });
      $('.ks40-launch-empty', overlay).hidden = visible !== 0;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.launcherOpen) closeLauncher();
      if (event.key === 'Tab' && state.launcherOpen) {
        const list = currentFocusables();
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      if ((event.altKey && event.key.toLowerCase() === 'k') || (event.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || ''))) {
        event.preventDefault();
        state.launcherOpen ? closeLauncher() : openLauncher();
      }
    });
  }

  function classifyNavigation() {
    $$('.tab[data-go]').forEach(tab => {
      tab.dataset.ksGroup = VIEW_GROUP.get(tab.dataset.go) || 'system';
    });
    $$('#kosif-more [data-go2]').forEach(button => {
      button.dataset.ksGroup = VIEW_GROUP.get(button.dataset.go2) || 'system';
    });
  }

  function utilityMarkup() {
    return '<div class="ks40-utilities" aria-label="أدوات سريعة">' +
      '<button type="button" class="ks40-utility primary" id="ks40-open-launcher"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg><span>كل القدرات</span></button>' +
      '<button type="button" class="ks40-utility" id="ks40-install-button" data-install-action><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 18v2h14v-2"/></svg><span>تثبيت</span></button></div>';
  }

  function mountUtilities() {
    const status = $('.top-status');
    if (!status || $('#ks40-open-launcher')) return;
    status.insertAdjacentHTML('beforeend', utilityMarkup());
    $('#ks40-open-launcher').addEventListener('click', () => openLauncher());
    $('#ks40-install-button').addEventListener('click', requestInstall);
  }

  function mountPublicInstallFab() {
    if ($('#tabbar') || $('.ks40-install-fab')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ks40-install-fab';
    button.dataset.installAction = '';
    button.textContent = '⌄ تثبيت KOSIF';
    button.addEventListener('click', requestInstall);
    document.body.appendChild(button);
  }

  function mountStandardsOverview() {
    const section = $('#view-library');
    if (!section || $('.ks40-standards-overview', section)) return;
    const block = document.createElement('aside');
    block.className = 'ks40-standards-overview';
    block.setAttribute('aria-label', 'سياسة المعايير والمراجع');
    block.innerHTML = '<header><div><h3>مركز المعايير والمراجع المهنية</h3><p>تعرض KOSIF سلطة المصدر والنسخة والتاريخ والولاية القضائية قبل الاستشهاد. الإرشادات التطبيقية مساندة ولا تستبدل النص الرسمي النافذ.</p></div><span class="v38-chip source">SOCPA أولًا</span></header>' +
      '<div class="ks40-standard-grid"><div class="ks40-standard-item"><b>المصدر الحاكم</b><span>أحدث إصدار رسمي نافذ ومعتمد في المملكة.</span></div><div class="ks40-standard-item"><b>الإرشادات التطبيقية</b><span>شرح وتطبيق للمنشآت الصغيرة والمتوسطة، لا سلطة اعتماد مستقلة.</span></div><div class="ks40-standard-item"><b>سجل التحقق</b><span>النسخة والتاريخ والجهة وحالة التحقق تبقى ظاهرة وقابلة للتتبع.</span></div></div>';
    section.prepend(block);
  }

  function syncCurrentView() {
    const shown = $('section[data-view].show');
    if (!shown) return;
    document.body.dataset.kosifCurrentView = shown.dataset.view || '';
    $$('section[data-view]').forEach(section => {
      section.setAttribute('role', 'region');
      section.setAttribute('aria-hidden', String(!section.classList.contains('show')));
      section.dataset.ksScreen = VIEW_GROUP.get(section.dataset.view) || 'system';
    });
    $$('.tab[data-go]').forEach(tab => {
      if (tab.dataset.go === shown.dataset.view) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  function mountLauncher() {
    if ($('#ks40-launch-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', launcherMarkup());
    window.KosifContinuity?.registerDialogs?.();
    bindLauncher();
  }

  function handleInitialView() {
    const requested = new URLSearchParams(location.search).get('view');
    if (!requested) return;
    setTimeout(() => {
      if ($('.tab[data-go="' + cssEscape(requested) + '"]')) goView(requested);
    }, 500);
  }

  function boot() {
    state.installed = isStandalone();
    ensurePwaHead();
    registerServiceWorker();
    classifyNavigation();
    mountLauncher();
    mountUtilities();
    mountPublicInstallFab();
    mountStandardsOverview();
    syncCurrentView();
    updateInstallUI();
    handleInitialView();

    const observer = new MutationObserver(() => {
      classifyNavigation();
      mountStandardsOverview();
      syncCurrentView();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', event => {
      if (event.target.closest?.('.tab[data-go],#kosif-bottom-nav button,[data-go],[data-go2]')) setTimeout(syncCurrentView, 40);
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
    updateInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    state.installed = true;
    state.installPrompt = null;
    updateInstallUI();
    toast('تم تثبيت KOSIF بنجاح', 'ok');
  });

  window.KosifStudioV40 = {
    version: '40.0.0',
    openLauncher,
    closeLauncher,
    requestInstall,
    isStandalone,
    groups: GROUPS.map(group => ({ id: group.id, title: group.title }))
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
