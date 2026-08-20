/* KOSIF v38 — final user-requested behavior layer (2026-08-19)
 * Additive, mobile-safe and mutation-loop-safe. No accounting totals are recalculated here.
 */
(() => {
  'use strict';
  if (window.__KOSIF_USER_POLISH_V1__) return;
  window.__KOSIF_USER_POLISH_V1__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DIGIT_MAP = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
  const western = s => String(s ?? '').replace(/[٠-٩۰-۹]/g, c => DIGIT_MAP[c] || c);
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION','CODE','PRE','NOSCRIPT']);

  function westernize(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const p = root.parentElement;
      if (!p || SKIP_TAGS.has(p.tagName) || p.closest('[data-keep-native-digits]')) return;
      const n = western(root.nodeValue);
      if (n !== root.nodeValue) root.nodeValue = n;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        return !p || SKIP_TAGS.has(p.tagName) || p.closest('[data-keep-native-digits]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(westernize);
  }

  function installDigitObserver() {
    westernize(document.body);
    const root = $('main') || $('#app') || document.body;
    if (!root || root.dataset.kosifWesternObserved === '1') return;
    root.dataset.kosifWesternObserved = '1';
    new MutationObserver(records => {
      const added = [];
      for (const rec of records) {
        for (const n of rec.addedNodes) added.push(n);
        if (rec.type === 'characterData') added.push(rec.target);
      }
      if (added.length) requestAnimationFrame(() => added.forEach(westernize));
    }).observe(root, {childList:true, subtree:true, characterData:true});
  }

  function installHomeChip() {
    if ($('#kosif-user-home-chip')) return;
    const a = document.createElement('a');
    a.id = 'kosif-user-home-chip';
    a.href = '/';
    a.setAttribute('aria-label', 'العودة إلى الرئيسية');
    a.innerHTML = '<span aria-hidden="true">⌂</span><span>الرئيسية</span>';
    document.body.appendChild(a);
  }

  function centerOpenDialog() {
    const bg = $('#modal-bg.show');
    const modal = bg?.querySelector('.modal');
    if (modal) modal.classList.add('kosif-centered-dialog');
    if (bg) {
      bg.scrollTop = 0;
      requestAnimationFrame(() => modal?.focus?.({preventScroll:true}));
    }
  }

  /* Remove the legacy warning only after the live endpoint proves a compatible
     v38 root or the exact v40 Studio shell with its embedded v38 core. */
  async function reconcileReleaseWarning() {
    let ok = false;
    try {
      const r = await fetch('/__version', {cache:'no-store', credentials:'same-origin'});
      const d = await r.json();
      const v38 = /^v38\./i.test(String(d.version || '')) && /v38/i.test(String(d.buildId || d.build || ''));
      const studio = d.productName === 'Kosif' && d.version === 'v40.0.0-root' && d.buildId === '2026.08.20-v40-vibrant-professional-pwa' && d.experienceVersion === 'v40.0.0' && d.installable === true;
      ok = r.ok && (v38 || studio);
    } catch (_) {}
    if (!ok) return;
    const old = 'يوجد اختلاف في مكونات الإصدار. اضغط لتحميل Kosif الحالي بالكامل.';
    const scan = () => {
      $$('body *').forEach(el => {
        if (el.children.length > 5) return;
        if (String(el.textContent || '').trim() !== old) return;
        const host = el.closest('.toast,.note,.banner,.alert,[role="alert"]') || el;
        host.remove();
      });
    };
    scan();
    setTimeout(scan, 1200);
  }

  const secureKeys = window.KosifSecureAIKeys = window.KosifSecureAIKeys || {openai:'',anthropic:'',gemini:'',zai:''};
  const secureModels = window.KosifSecureAIModels = window.KosifSecureAIModels || {openai:'gpt-5.6',anthropic:'claude-sonnet-4',gemini:'gemini-3.6-flash',zai:'glm-5.1'};

  function patchV38Api() {
    const V = window.KosifV38;
    if (!V || V.api?.__kosifSecureWrapped) return false;
    const base = V.api.bind(V);
    const wrapped = async (path, opts = {}) => {
      const next = {...opts, body: opts.body && typeof opts.body === 'object' ? {...opts.body} : opts.body};
      if (path === '/api/kosif/ai' && next.body?.provider) {
        const p = String(next.body.provider).toLowerCase();
        if (!next.body.key && secureKeys[p]) next.body.key = secureKeys[p];
        if ((!next.body.model || next.body.model === '—') && secureModels[p]) next.body.model = secureModels[p];
      }
      /* Council v3's fourth legacy seat becomes Z.ai when a Z.ai key is configured. */
      if (path === '/api/kosif/v38/public-ai' && secureKeys.zai && next.body?.prompt) {
        return base('/api/kosif/ai', {method:'POST', body:{provider:'zai', key:secureKeys.zai, model:secureModels.zai || 'glm-5.1', prompt:next.body.prompt, json:true, maxTokens:1400, agent:{jurisdiction:'saudi',industry:'عام'}}});
      }
      return base(path, next);
    };
    wrapped.__kosifSecureWrapped = true;
    wrapped.__base = base;
    V.api = wrapped;
    return true;
  }

  async function testProvider(p, stateEl, btn) {
    const key = String(secureKeys[p] || '').trim();
    const model = String(secureModels[p] || '').trim();
    if (!key) {
      stateEl.textContent = 'أدخل المفتاح أولًا';
      stateEl.className = 'kosif-provider-state bad';
      return;
    }
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = 'جاري الاختبار…';
    try {
      const r = await fetch('/api/kosif/ai/test', {
        method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'},
        body:JSON.stringify({provider:p, model, key, agent:{jurisdiction:'saudi',industry:'عام'}})
      });
      let d = {}; try { d = await r.json(); } catch (_) {}
      if (!r.ok) throw new Error(d.message || d.error || ('HTTP '+r.status));
      stateEl.textContent = 'متصل ✓ — المفتاح في ذاكرة هذه الصفحة فقط';
      stateEl.className = 'kosif-provider-state ok';
    } catch (e) {
      stateEl.textContent = 'فشل الاختبار: ' + String(e.message || e).slice(0,120);
      stateEl.className = 'kosif-provider-state bad';
    } finally { btn.disabled = false; btn.textContent = old; }
  }

  function providerField(p, label, model) {
    return '<div class="kosif-provider-field" data-provider="'+p+'">' +
      '<label><span>'+label+'</span><span class="kosif-provider-state">غير مختبر</span></label>' +
      '<input class="kosif-secure-key" type="password" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="API key — لا يتم حفظه" aria-label="'+label+' API key">' +
      '<input class="kosif-secure-model" type="text" value="'+esc(model)+'" aria-label="'+label+' model" style="margin-top:7px">' +
      '<button class="v38-btn ghost kosif-provider-test" type="button" style="margin-top:7px">اختبار الاتصال</button>' +
    '</div>';
  }

  function buildCouncilSettingsCard() {
    const card = document.createElement('div');
    card.id = 'kosif-council-settings-card';
    card.className = 'v38-card';
    card.innerHTML = '<div class="v38-cardh"><h3>إعدادات مجلس المراجعين</h3><span class="hint">OpenAI + Claude + Gemini + Z.ai في مكان واحد</span></div>' +
      '<div class="kosif-provider-grid">' +
      providerField('openai','OpenAI',secureModels.openai) +
      providerField('anthropic','Claude',secureModels.anthropic) +
      providerField('gemini','Gemini',secureModels.gemini) +
      providerField('zai','Z.ai / GLM',secureModels.zai) +
      '</div>' +
      '<div class="kosif-secure-actions"><button class="v38-btn primary" id="kosif-secure-apply" type="button">تفعيل للمجلس في هذه الجلسة</button><button class="v38-btn ghost" id="kosif-secure-clear" type="button">مسح المفاتيح من الذاكرة</button></div>' +
      '<div class="kosif-secure-note">🔐 المفاتيح لا تُحفظ في LocalStorage أو IndexedDB. تظل في ذاكرة الصفحة الحالية فقط، وتُرسل للخادم عند اختبار/تشغيل المزود بعد فتح قفل المالك. الاعتماد المهني يظل بشريًا.</div>';
    return card;
  }

  function wireCouncilSettings(card) {
    $$('.kosif-provider-field', card).forEach(box => {
      const p = box.dataset.provider;
      const key = $('.kosif-secure-key', box), model = $('.kosif-secure-model', box), st = $('.kosif-provider-state', box), test = $('.kosif-provider-test', box);
      key.addEventListener('input', () => { secureKeys[p] = key.value.trim(); st.textContent = secureKeys[p] ? 'جاهز للاختبار' : 'غير مختبر'; st.className='kosif-provider-state'; });
      model.addEventListener('input', () => { secureModels[p] = model.value.trim(); });
      test.addEventListener('click', () => testProvider(p, st, test));
    });
    $('#kosif-secure-apply', card)?.addEventListener('click', () => {
      patchV38Api();
      const count = Object.values(secureKeys).filter(Boolean).length;
      window.KosifV38?.toast?.('تم تفعيل '+count+' مزود/مزودين في ذاكرة الجلسة', count ? 'ok' : 'info');
    });
    $('#kosif-secure-clear', card)?.addEventListener('click', () => {
      for (const k of Object.keys(secureKeys)) secureKeys[k] = '';
      $$('.kosif-secure-key', card).forEach(i => i.value = '');
      $$('.kosif-provider-state', card).forEach(s => {s.textContent='غير مختبر';s.className='kosif-provider-state'});
      window.KosifV38?.toast?.('مُسحت مفاتيح المجلس من ذاكرة الصفحة', 'ok');
    });
  }

  function injectCouncilUI() {
    patchV38Api();
    const sec = $('#view-v38-council');
    if (sec && !$('#kosif-council-settings-card', sec) && !sec.querySelector('.v38-loading')) {
      const card = buildCouncilSettingsCard();
      const cards = $$('.v38-card', sec);
      if (cards[0]) cards[0].after(card); else sec.prepend(card);
      wireCouncilSettings(card);
      /* User explicitly requested Z.ai as the fourth council provider. */
      $$('.v38-member', sec).forEach(m => {
        if (/مزود عام|public|محلي/i.test(m.textContent || '')) {
          const b = $('b',m), av = $('.avatar',m), sm = $('small',m);
          if (b) b.textContent = 'Z.ai'; if (av) av.textContent = 'ZA'; if (sm) sm.textContent = 'تحليل استشاري فقط';
        }
      });
    }
  }

  function injectSettingsCouncilTile() {
    const sec = $('#view-settings');
    if (!sec || $('#kosif-settings-council-open', sec)) return;
    const host = $('.grid', sec) || $('.card', sec) || sec;
    const btn = document.createElement('button');
    btn.id = 'kosif-settings-council-open';
    btn.className = host.matches('.grid') ? 'kosif-action' : 'btn primary';
    btn.type = 'button';
    btn.innerHTML = 'مجلس المراجعين<small style="display:block">OpenAI + Claude + Gemini + Z.ai · إعداد واحد آمن</small>';
    btn.addEventListener('click', () => {
      try { if (typeof window.go === 'function') window.go('v38-council'); else document.querySelector('[data-go="v38-council"]')?.click(); } catch (_) { document.querySelector('[data-go="v38-council"]')?.click(); }
      setTimeout(injectCouncilUI,80);
    });
    host.prepend(btn);
  }

  /* Owner gate currently has no server-side mail transport. Replace the misleading resend copy
     with a truthful action instead of pretending a password email was sent. */
  function patchOwnerGate() {
    const title = [...document.querySelectorAll('h1,h2,h3,strong')].find(x => /فتح إعدادات الذكاء الاصطناعي/.test(x.textContent || ''));
    const root = title?.closest('.modal,.kp-card,.card,[role="dialog"]');
    if (!root) return;
    $$('*', root).forEach(el => {
      if (/تم إعادة إرسال الباسورد|تم إعادة إرسال.*بريد/i.test(el.textContent || '') && el.children.length < 3) {
        el.textContent = 'لأمان الحساب: الخادم يحتفظ ببصمة كلمة المرور فقط، ولا توجد خدمة بريد مهيأة حاليًا لإعادة إرسال كلمة المرور الحالية.';
      }
    });
    if (!$('#kosif-send-email-now', root)) {
      const b = document.createElement('button');
      b.id = 'kosif-send-email-now'; b.type = 'button'; b.className = 'btn ghost';
      b.textContent = '✉ أرسل إيميل الآن';
      b.addEventListener('click', () => {
        const msg = 'إرسال البريد غير مهيأ على خادم Kosif بعد. يلزم ربط مزود بريد آمن ومسار استعادة/تعيين كلمة مرور جديدة؛ لا يمكن استرجاع كلمة المرور الأصلية من الـ hash.';
        if (window.toast) window.toast(msg,'warn'); else alert(msg);
      });
      const actions = root.querySelector('.actions,.cta,[style*="display:flex"]') || root;
      actions.appendChild(b);
    }
  }

  const STANDARD_HELP = {
    'IFRS 15':['الإيرادات من العقود مع العملاء','بيحدد إمتى وبكام نعترف بالإيراد، وهل التزام الأداء اتنفذ فعلًا قبل تسجيل المبيعات.','لو الشركة سجلت فاتورة 100,000 ريال في ديسمبر قبل تسليم البضاعة في يناير، لازم نفحص هل شرط الاعتراف بالإيراد اتحقق فعلًا.'],
    'IAS 2':['المخزون','بيربط رصيد المخزون بالتكلفة وصافي القيمة القابلة للتحقق، وبيساعدنا نراجع الهبوط والبضاعة الراكدة.','لو تكلفة صنف 80 ريال لكن المتوقع بيعه بصافي 65 ريال، بنراجع هل محتاج تخفيض للقيمة بدل ما يفضل ظاهر بـ80.'],
    'IAS 16':['العقارات والآلات والمعدات','بيحكم الاعتراف بالأصل الثابت والتكلفة والإهلاك والعمر الإنتاجي والمكونات الجوهرية.','آلة بـ600,000 ريال عمرها 5 سنين: بنراجع تاريخ الجاهزية للاستخدام وطريقة الإهلاك وهل في مكونات كبيرة ليها أعمار مختلفة.'],
    'IFRS 9':['الأدوات المالية','بيربط الذمم والقروض والاستثمارات بالتصنيف والقياس وخسائر الائتمان المتوقعة.','عميل متأخر ومخاطر تحصيله زادت؛ مش كفاية الرصيد يفضل كما هو، بنراجع مخصص الخسائر الائتمانية المتوقعة.'],
    'IFRS 16':['عقود الإيجار','بيحدد معالجة عقود الإيجار وأصل حق الاستخدام والتزام الإيجار والاستثناءات.','عقد محل 5 سنين بدفعات شهرية: بنراجع هل لازم إثبات أصل حق استخدام والتزام إيجار بدل تسجيل الإيجار كله مصروف شهري فقط.'],
    'IFRS 13':['قياس القيمة العادلة','بيوضح إطار قياس القيمة العادلة ومدخلات القياس ومستوياتها والإفصاحات.','لو أصل حيوي أو استثمار مفيش له سعر مباشر، بنراجع أسلوب التقييم والمدخلات وهل هي قابلة للملاحظة ولا لأ.'],
    'IAS 24':['الأطراف ذات العلاقة','بيحدد الأطراف ذات العلاقة ومتطلبات الإفصاح عن المعاملات والأرصدة معها.','لو الشركة اشترت من منشأة يملكها أحد أعضاء الإدارة، بنراجع طبيعة العلاقة والمبالغ والشروط والإفصاح المناسب.'],
    'ISA 550':['الأطراف ذات العلاقة — مراجعة','بيوجه المراجع لتقييم مخاطر العلاقات والمعاملات مع الأطراف ذات العلاقة وإجراءات اكتشافها وفحصها.','لو في تحويلات كبيرة لشركة مرتبطة بالإدارة، بنطلب العقود والموافقات ونقارن الشروط ونفحص الإفصاح بدل الاعتماد على وصف الإدارة فقط.'],
    'IAS 41':['الأصول الحيوية','بيغطي الأصول الحيوية والمنتج الزراعي والقياس والإفصاح المرتبطين بها.','قطيع الأغنام بيتغير عدده ووزنه وقيمته؛ بنراجع أساس القياس وحركة القطيع ومدخلات القيمة العادلة والإفصاحات.'],
    'ISA 500':['أدلة المراجعة','بيوضح كفاية وملاءمة أدلة المراجعة ومصادرها وموثوقيتها.','رصيد بنك كبير مش كفاية له كشف داخلي؛ تأكيد خارجي ومطابقة وتسويات بيدوا دليل أقوى.'],
    'ISA 505':['المصادقات الخارجية','بيحكم استخدام المصادقات الخارجية كدليل مراجعة وضوابط إرسالها واستلامها.','بدل ما العميل يبعت لك رصيد المورد بنفسه، المراجع يسيطر على طلب المصادقة ويراجع الرد مباشرة.'],
    'ISA 540':['التقديرات المحاسبية','بيغطي مراجعة التقديرات وعدم التأكد والتحيز المحتمل في تقديرات الإدارة.','مخصص هبوط مخزون أو ECL مبني على افتراضات؛ بنختبر البيانات والافتراضات والحساسية مش الرقم النهائي بس.']
  };

  function standardRefFrom(el) {
    const raw = [el?.dataset?.ref,el?.dataset?.standardRef,el?.dataset?.standard,el?.textContent].filter(Boolean).join(' ');
    const m = raw.match(/(?:IFRS|IAS|ISA|IFRIC|SIC)\s*\d+/i);
    return m ? m[0].toUpperCase().replace(/\s+/g,' ') : String(el?.dataset?.ref || '').trim();
  }

  function ensureStandardFallback() {
    let d = $('#kosif-standard-fallback'); if (d) return d;
    d = document.createElement('div'); d.id = 'kosif-standard-fallback';
    d.innerHTML = '<div class="ksf-card" role="dialog" aria-modal="true"><button class="v38-btn ghost" id="ksf-close" type="button" style="float:left">إغلاق</button><h3 id="ksf-title">شرح المعيار</h3><span class="ksf-ref" id="ksf-ref"></span><div class="ksf-box"><strong>علاقته بالبند</strong><span id="ksf-relation"></span></div><div class="ksf-box"><strong>مثال بسيط بالمصري</strong><span id="ksf-example"></span></div><div class="ksf-box"><strong>لو المعالجة غلط يحصل إيه؟</strong><span id="ksf-risk"></span></div><div class="ksf-actions"><a class="v38-btn primary" id="ksf-library" href="/libraries/">فتح مكتبة المعايير</a><button class="v38-btn ghost" id="ksf-back" type="button">رجوع</button></div><p class="kosif-secure-note">الشرح مساعد للتطبيق العملي ولا يستبدل النص الرسمي الأحدث المعتمد من SOCPA/الجهة المختصة.</p></div>';
    document.body.appendChild(d);
    const close = () => d.classList.remove('show');
    $('#ksf-close',d).onclick=close; $('#ksf-back',d).onclick=close; d.addEventListener('click',e=>{if(e.target===d)close()});
    return d;
  }

  function showStandardFallback(el) {
    const ref = standardRefFrom(el) || 'المعيار المرتبط';
    const key = Object.keys(STANDARD_HELP).find(k => ref.startsWith(k));
    const h = key ? STANDARD_HELP[key] : ['المعيار المرتبط بهذا البند','بنربط رصيد/عملية الحساب بمتطلبات الاعتراف والقياس والعرض والإفصاح الخاصة بالمعيار، وبنراجع الدليل المؤيد للمعالجة.','مثال: لو الحساب متسجل بمبلغ أو تصنيف معين، بنرجع لشروط المعيار ونطابقها بالمستندات الفعلية قبل اعتماد المعالجة.'];
    const d = ensureStandardFallback();
    $('#ksf-title',d).textContent = h[0]; $('#ksf-ref',d).textContent = ref;
    const account = el.closest('tr')?.querySelector('td:nth-child(2),td:nth-child(1)')?.textContent?.trim() || el.closest('.finding,.std-card,.card')?.querySelector('h4,.ttl,strong')?.textContent?.trim() || '';
    $('#ksf-relation',d).textContent = h[1] + (account ? ' البند الحالي: '+account+'.' : '');
    $('#ksf-example',d).textContent = h[2];
    $('#ksf-risk',d).textContent = 'ممكن ينتج تحريف في الرصيد أو التوقيت أو التصنيف أو الإفصاح، وبالتالي تتأثر إجراءات المراجعة والنتيجة. لازم يتوثق الحكم والدليل قبل الاعتماد.';
    const a = $('#ksf-library',d); if (a) a.href = '/libraries/?q='+encodeURIComponent(ref);
    d.classList.add('show'); westernize(d);
  }

  function installStandardsFallback() {
    document.addEventListener('click', e => {
      const el = e.target.closest?.('.std[data-ref],.std-card[data-ref],[data-standard],[data-standard-ref]');
      if (!el) return;
      const before = $('.drawer.open,#drawer.open,#drawer.show,#modal-bg.show,.std-detail.show');
      setTimeout(() => {
        const after = $('.drawer.open,#drawer.open,#drawer.show,#modal-bg.show,.std-detail.show');
        const blank = after && String(after.textContent || '').trim().length < 20;
        if ((!after && !before) || blank) showStandardFallback(el);
      }, 220);
    }, true);
  }

  function syncCompanyPill() {
    const name = String($('#s-name')?.value || $('#pill-entity')?.textContent || window.state?.entity?.name || '').trim();
    if (!name || /لم تُحد|^شركة$/.test(name)) return;
    let p = $('#kosif-active-company-pill');
    const host = $('.top-status') || $('.topbar') || $('header');
    if (!host) return;
    if (!p) { p=document.createElement('span'); p.id='kosif-active-company-pill'; p.className='pill'; host.appendChild(p); }
    p.textContent = 'الشركة: '+name;
  }

  function installPatches() {
    installDigitObserver(); installHomeChip(); patchV38Api(); injectSettingsCouncilTile(); injectCouncilUI(); patchOwnerGate(); centerOpenDialog(); syncCompanyPill();
  }

  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-go],#kosif-ai-open,#kosif-ai-status,[data-cid],#btn-save-entity,#btn-demo-full,#demo-grid button')) {
      setTimeout(installPatches, 40); setTimeout(centerOpenDialog, 120); setTimeout(syncCompanyPill, 240);
    }
  }, true);

  installStandardsFallback();
  const observer = new MutationObserver(records => {
    let relevant = false;
    for (const r of records) {
      if ([...r.addedNodes].some(n => n.nodeType === 1 && (n.matches?.('.modal,.v38-card,.kp-card,section') || n.querySelector?.('.modal,.v38-card,.kp-card')))) { relevant = true; break; }
    }
    if (relevant) requestAnimationFrame(installPatches);
  });

  function init() {
    installPatches(); reconcileReleaseWarning();
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(installPatches,350); setTimeout(installPatches,1200); setTimeout(reconcileReleaseWarning,1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
