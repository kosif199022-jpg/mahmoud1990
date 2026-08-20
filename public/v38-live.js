/*
 * KOSIF v38 — المحادثة المباشرة النصية والصوتية عبر KOSIF server relays
 * الوضع المفضل: مفتاح OpenAI محفوظ كـ Secret على الخادم.
 * البديل: مفتاح OpenAI الموجود في ذاكرة جلسة مجلس المراجعين يُرسل إلى خادم KOSIF
 * للطلب الحالي فقط بعد فتح قفل المالك، ولا يُحفظ في LocalStorage/IndexedDB/KV/D1.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  const waitForIce = (pc, timeout = 2800) => new Promise(resolve => {
    if (!pc || pc.iceGatheringState === 'complete') return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { pc.removeEventListener('icegatheringstatechange', onState); } catch {}
      clearTimeout(timer);
      resolve();
    };
    const onState = () => { if (pc.iceGatheringState === 'complete') finish(); };
    const timer = setTimeout(finish, timeout);
    pc.addEventListener('icegatheringstatechange', onState);
  });

  V.registerView({
    id: 'v38-live', title: 'محادثة مباشرة', icon: '💬', order: 980,
    render(sec) {
      sec.innerHTML =
        V.hero('المحادثة المباشرة — نص وصوت', 'مساحة محادثة استشارية عبر خادم KOSIF: النص لا يُحفظ تلقائيًا، والسياق لا يُرسل إلا باختيارك، والصوت يعمل عبر WebRTC. لا تتحول المحادثة إلى دليل أو اعتماد.', [['ai', 'نص + صوت'], ['human', 'استشاري فقط'], ['safe', 'Server Relay']]) +
        '<div class="v38-card v38-chat-card">' +
        '<div class="v38-cardh"><h3>محادثة نصية محكومة</h3><span class="hint" id="v38-chat-provider">جاري التحقق من المزود…</span></div>' +
        '<div class="v38-note info"><span>🫧</span><span>الرسائل تبقى في ذاكرة هذه الشاشة فقط ولا تُحفظ في LocalStorage أو IndexedDB أو ملف الارتباط. يمكنك تنزيل نسخة JSON يدويًا.</span></div>' +
        '<div class="v38-chat-quick" aria-label="أسئلة سريعة"><button data-chat-prompt="لخّص مخاطر الارتباط والأسئلة التي ينبغي طرحها على الإدارة، وافصل الحقائق عن الافتراضات.">مخاطر الارتباط</button><button data-chat-prompt="اقترح إجراءات مراجعة قابلة للتتبع لهذه المسألة، وحدد الدليل المطلوب والمرجع الذي يحتاج تحققًا.">إجراءات مراجعة</button><button data-chat-prompt="راجع صياغة هذه الملاحظة لتكون محايدة ومهنية دون إصدار رأي أو اعتماد.">تحسين ملاحظة</button></div>' +
        '<div id="v38-chat-log" class="v38-chat-log" role="log" aria-live="polite" aria-label="سجل المحادثة"><div class="v38-chat-empty">ابدأ بسؤال مهني. سيظهر الرد مع وسم «استشاري» وتبقى بوابة القرار البشري مفتوحة.</div></div>' +
        '<div class="v38-chat-compose"><label for="v38-chat-input">سؤالك</label><textarea id="v38-chat-input" maxlength="4000" placeholder="مثال: ما الأدلة المناسبة لاختبار قطع الإيراد؟ (Ctrl/⌘ + Enter للإرسال)"></textarea>' +
        '<label class="v38-chat-check"><input type="checkbox" id="v38-chat-context"> إرفاق سياق محدود: اسم المنشأة، الفترة، الإطار، وعدد الجولات فقط</label>' +
        '<label class="v38-chat-check consent"><input type="checkbox" id="v38-chat-consent"> أوافق على إرسال نص السؤال والسياق الاختياري إلى المزود الذي أعدّه المالك</label>' +
        '<div class="v38-chat-actions"><button class="v38-btn gold" id="v38-chat-send">إرسال السؤال</button><button class="v38-btn ghost" id="v38-chat-retry" disabled>إعادة آخر سؤال</button><button class="v38-btn ghost" id="v38-chat-export" disabled>تنزيل السجل</button><button class="v38-btn danger ghost" id="v38-chat-clear" disabled>مسح الجلسة</button><span id="v38-chat-state" class="hint" aria-live="polite"></span></div></div>' +
        '</div>' +
        '<div class="v38-card v38-no-print">' +
        '<div class="v38-cardh"><h3>المحادثة الصوتية الآمنة</h3><span class="hint" id="v38-lv-sec">جاري التحقق من إعداد الخدمة…</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>النموذج الصوتي</label><select id="v38-lv-model"><option value="gpt-realtime-2.1">gpt-realtime-2.1 — الأقوى</option><option value="gpt-realtime-2.1-mini">gpt-realtime-2.1-mini — أسرع وأوفر</option><option value="gpt-realtime-2">gpt-realtime-2</option><option value="gpt-realtime-1.5">gpt-realtime-1.5</option></select></div>' +
        '<div class="v38-field"><label>الصوت</label><select id="v38-lv-voice"><option value="marin">marin — موصى به</option><option value="cedar">cedar — موصى به</option><option value="alloy">alloy</option><option value="coral">coral</option><option value="sage">sage</option><option value="verse">verse</option></select></div>' +
        '<div class="v38-field"><label>لغة المحادثة</label><select id="v38-lv-lang"><option value="ar">العربية</option><option value="en">English</option></select></div>' +
        '</div>' +
        '<div class="v38-note info" style="margin-top:12px"><span>🔐</span><span><b>حماية المفتاح:</b> لو مفيش Secret على Cloudflare، المراجع الصوتي يستخدم مفتاح OpenAI الذي أدخلته في «إعدادات مجلس المراجعين» خلال نفس جلسة الصفحة فقط. لا يتم تخزينه في LocalStorage أو IndexedDB أو قواعد KOSIF.</span></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
        '<button class="v38-btn gold" id="v38-lv-start">🎙 بدء المحادثة الصوتية</button>' +
        '<button class="v38-btn ghost" id="v38-lv-council">⚙ إعدادات مجلس المراجعين</button>' +
        '<button class="v38-btn danger ghost" id="v38-lv-stop" disabled>⏹ إنهاء</button>' +
        '</div>' +
        '<div class="v38-live-orb" id="v38-lv-orb">🎙</div>' +
        '<div class="v38-wave" id="v38-lv-wave" style="display:none">' + Array.from({ length: 24 }, (_, i) => '<i style="animation-delay:' + (i * 60) + 'ms"></i>').join('') + '</div>' +
        '<div id="v38-lv-status" style="text-align:center;font-size:12.5px;color:var(--v38-muted);margin-top:8px">جلسة غير نشطة</div>' +
        '</div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>نص المحادثة</h3><span class="hint">النص للتيسير والمراجعة، وليس ورقة عمل أو دليلًا بحد ذاته</span></div><div id="v38-lv-log" style="max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:8px"></div></div>';

      /* المحادثة النصية: ذاكرة الشاشة فقط، بلا تخزين تلقائي. */
      const chatMessages = [];
      let chatBusy = false;
      let chatReady = false;
      let lastQuestion = '';

      const localEngagementContext = () => {
        let st = null;
        try { if (typeof state !== 'undefined') st = state; } catch {}
        if (!st) { try { st = JSON.parse(localStorage.getItem('tamhees_v1') || 'null'); } catch {} }
        return {
          entity: {
            name: String(st?.entity?.name || '').slice(0, 160),
            period: String(st?.entity?.period || '').slice(0, 80),
            framework: String(st?.entity?.framework || '').slice(0, 40),
            listed: String(st?.entity?.listed || '').slice(0, 80)
          },
          rounds: Array.isArray(st?.rounds) ? st.rounds.length : 0,
          authority: 'untrusted-context-advisory-only'
        };
      };

      const syncChatButtons = () => {
        V.$('#v38-chat-send').disabled = chatBusy || !chatReady;
        V.$('#v38-chat-retry').disabled = chatBusy || !chatReady || !lastQuestion;
        V.$('#v38-chat-export').disabled = chatMessages.length === 0;
        V.$('#v38-chat-clear').disabled = chatBusy || chatMessages.length === 0;
      };

      const appendChat = (role, text, meta = {}) => {
        const clean = String(text || '').slice(0, 20000);
        const item = { id: crypto.randomUUID?.() || String(Date.now()) + '-' + chatMessages.length, role, text: clean, at: new Date().toISOString(), ...meta };
        chatMessages.push(item);
        if (chatMessages.length > 60) chatMessages.shift();
        const logEl = V.$('#v38-chat-log');
        logEl.querySelector('.v38-chat-empty')?.remove();
        const article = document.createElement('article');
        article.className = 'v38-chat-message ' + role;
        const head = document.createElement('header');
        const who = document.createElement('b');
        who.textContent = role === 'user' ? 'أنت' : role === 'assistant' ? 'المراجع الاستشاري' : 'النظام';
        const badge = document.createElement('span');
        badge.textContent = role === 'assistant' ? 'استشاري · يحتاج تحققًا' : new Date(item.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        head.append(who, badge);
        const body = document.createElement('div');
        body.className = 'v38-chat-text';
        body.textContent = clean;
        article.append(head, body);
        logEl.appendChild(article);
        logEl.scrollTop = logEl.scrollHeight;
        syncChatButtons();
        return item;
      };

      const buildChatPrompt = includeContext => {
        const history = chatMessages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-12).map(m =>
          (m.role === 'user' ? 'USER' : 'ASSISTANT') + ':\n' + m.text.slice(0, 3500)
        ).join('\n\n');
        const context = includeContext ? '\n\nUNTRUSTED_ENGAGEMENT_CONTEXT_JSON:\n' + JSON.stringify(localEngagementContext()) : '';
        return ('هذه محادثة مهنية استشارية داخل KOSIF. افصل الحقائق عن الافتراضات، واذكر الدليل والقرار البشري المطلوبين. لا تصدر رأيًا ولا تعتمد قيدًا.\n\nCONVERSATION:\n' + history + context).slice(0, 22000);
      };

      const sendChat = async override => {
        if (chatBusy) return;
        const input = V.$('#v38-chat-input');
        const question = String(override ?? input.value).trim();
        if (!question) return V.toast('اكتب سؤالًا أولًا', 'error');
        if (!V.$('#v38-chat-consent').checked) return V.toast('يلزم تأكيد الموافقة على إرسال نص السؤال إلى المزود', 'error');
        if (!chatReady) return V.toast('المزود النصي غير مُعد على الخادم', 'error');
        chatBusy = true;
        lastQuestion = question;
        input.value = '';
        const includeContext = V.$('#v38-chat-context').checked;
        appendChat('user', question, { contextIncluded: includeContext });
        V.$('#v38-chat-state').textContent = 'يكتب المراجع الاستشاري…';
        syncChatButtons();
        try {
          const r = await V.api('/api/kosif/v38/public-ai', { method: 'POST', body: { prompt: buildChatPrompt(includeContext) } });
          appendChat('assistant', r.text || 'لم يصل نص من المزود.', { provider: r.provider || 'public-local', model: r.model || '', authority: 'advisory-only' });
          V.$('#v38-chat-state').textContent = 'وصل الرد · لا يُعد اعتمادًا أو دليلًا تلقائيًا';
        } catch (e) {
          const message = e?.status === 401 ? 'افتح جلسة المالك ثم أعد المحاولة.' : e?.status === 503 ? 'المزود العام/المحلي غير مُعد على الخادم.' : (e?.message || 'تعذر إرسال السؤال.');
          appendChat('system', message, { error: e?.code || 'CHAT_FAILED' });
          V.$('#v38-chat-state').textContent = 'تعذر الحصول على رد';
          V.toast(message, 'error');
        } finally {
          chatBusy = false;
          syncChatButtons();
        }
      };

      V.$$('.v38-chat-quick button', sec).forEach(button => button.onclick = () => {
        const input = V.$('#v38-chat-input');
        input.value = button.dataset.chatPrompt || '';
        input.focus();
      });
      V.$('#v38-chat-send').onclick = () => sendChat();
      V.$('#v38-chat-retry').onclick = () => sendChat(lastQuestion);
      V.$('#v38-chat-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChat(); }
      });
      V.$('#v38-chat-export').onclick = () => {
        const payload = { product: 'KOSIF', exportedAt: new Date().toISOString(), persistence: 'manual-export-only', authority: 'advisory-only', messages: chatMessages };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'kosif-advisory-chat-' + Date.now() + '.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      };
      V.$('#v38-chat-clear').onclick = () => {
        chatMessages.length = 0; lastQuestion = '';
        V.$('#v38-chat-log').innerHTML = '<div class="v38-chat-empty">مُسحت جلسة المحادثة من ذاكرة الشاشة.</div>';
        V.$('#v38-chat-state').textContent = '';
        syncChatButtons();
      };
      V.api('/api/kosif/v38/public-ai/status').then(r => {
        const el = V.$('#v38-chat-provider');
        chatReady = !!r.configured;
        el.textContent = chatReady ? 'جاهز · ' + (r.model || 'مزود محلي') + ' · بلا تخزين' : 'غير مُعد · اضبط KOSIF_PUBLIC_AI_* على الخادم';
        syncChatButtons();
      }).catch(e => {
        V.$('#v38-chat-provider').textContent = e?.status === 401 ? 'افتح جلسة المالك للتحقق من المزود' : 'تعذر التحقق من المزود';
        syncChatButtons();
      });

      let pc = null;
      let media = null;
      let audioEl = null;
      let callId = '';
      let stopping = false;
      let serverConfigured = false;

      const sessionOpenAIKey = () => String(window.KosifSecureAIKeys?.openai || '').trim();
      const realtimeCredential = () => serverConfigured ? '' : sessionOpenAIKey();

      const log = (who, text) => {
        if (!text) return;
        const el = V.$('#v38-lv-log');
        const cls = who === 'أنت' ? 'v38-note info' : who === 'النظام' ? 'v38-note warn' : 'v38-note ai';
        el.innerHTML += '<div class="' + cls + '" style="margin:0"><span>' + (who === 'أنت' ? '👤' : who === 'النظام' ? '⚙️' : '🤖') + '</span><span><b>' + V.esc(who) + ':</b> ' + V.esc(String(text).slice(0, 5000)) + '</span></div>';
        el.scrollTop = el.scrollHeight;
      };

      const setStatus = (text, on) => {
        const s = V.$('#v38-lv-status');
        s.textContent = text;
        V.$('#v38-lv-orb').classList.toggle('on', !!on);
        V.$('#v38-lv-wave').style.display = on ? 'flex' : 'none';
      };

      const setButtons = active => {
        V.$('#v38-lv-start').disabled = !!active;
        V.$('#v38-lv-stop').disabled = !active;
      };

      const companyId = () => String(V.state?.company?.id || V.state?.companyId || V.companyId || 'default').replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 80) || 'default';
      const uiContext = () => JSON.stringify({
        company: companyId(),
        view: 'v38-live',
        product: 'KOSIF v38',
        authority: 'advisory-only'
      });

      const stopLocal = async (notifyServer = true) => {
        if (stopping) return;
        stopping = true;
        const id = callId;
        callId = '';
        try {
          if (notifyServer && id) await V.api('/api/kosif/v38/realtime/hangup', { method: 'POST', body: { callId: id, key: realtimeCredential() } });
        } catch {}
        try { media?.getTracks?.().forEach(t => t.stop()); } catch {}
        try { pc?.close(); } catch {}
        try { if (audioEl) { audioEl.pause(); audioEl.srcObject = null; } } catch {}
        media = null; pc = null; audioEl = null;
        setButtons(false);
        setStatus('جلسة غير نشطة', false);
        stopping = false;
      };

      V.$('#v38-lv-council').onclick = () => {
        try {
          if (typeof window.go === 'function') window.go('v38-council');
          else document.querySelector('[data-go="v38-council"]')?.click();
        } catch { document.querySelector('[data-go="v38-council"]')?.click(); }
      };

      V.api('/api/kosif/v38/realtime/status').then(r => {
        const el = V.$('#v38-lv-sec');
        if (!el) return;
        serverConfigured = !!r.serverConfigured || !!r.configured;
        if (serverConfigured) el.textContent = 'الخادم جاهز بـ Secret — المفتاح لا يخرج للمتصفح — ' + (r.model || 'Realtime');
        else if (r.sessionKeySupported) el.textContent = sessionOpenAIKey() ? 'جاهز بمفتاح OpenAI المؤقت من مجلس المراجعين' : 'جاهز لاستخدام مفتاح OpenAI المؤقت — أدخله أولًا في مجلس المراجعين';
        else el.textContent = 'OpenAI Realtime غير مُعد';
      }).catch(e => {
        const el = V.$('#v38-lv-sec');
        if (el) el.textContent = e?.status === 401 ? 'افتح جلسة المالك للتحقق من الخدمة' : 'تعذر فحص حالة الخدمة';
      });

      V.$('#v38-lv-start').onclick = async () => {
        if (pc) return;
        try {
          const key = realtimeCredential();
          if (!serverConfigured && !key) throw Object.assign(new Error('أدخل مفتاح OpenAI في «إعدادات مجلس المراجعين» أولًا ثم ارجع للمراجع الصوتي.'), { code: 'SESSION_OPENAI_KEY_REQUIRED' });
          if (!navigator.mediaDevices?.getUserMedia) throw new Error('المتصفح لا يدعم الوصول إلى الميكروفون عبر اتصال آمن.');
          setButtons(true);
          setStatus('تجهيز الميكروفون واتصال WebRTC…', false);

          pc = new RTCPeerConnection();
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', '');
          pc.ontrack = e => { audioEl.srcObject = e.streams?.[0] || new MediaStream([e.track]); };

          media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
          media.getAudioTracks().forEach(track => pc.addTrack(track, media));

          const dc = pc.createDataChannel('oai-events');
          dc.addEventListener('message', ev => {
            try {
              const d = JSON.parse(ev.data);
              if (d.type === 'conversation.item.input_audio_transcription.completed' && d.transcript) log('أنت', d.transcript);
              if (d.type === 'response.output_audio_transcript.done' && d.transcript) log('المراجع الصوتي', d.transcript);
              if (d.type === 'error') log('النظام', d.error?.message || 'حدث خطأ في جلسة Realtime.');
            } catch {}
          });

          pc.addEventListener('connectionstatechange', async () => {
            const state = pc?.connectionState;
            if (state === 'connected') {
              setStatus('جلسة صوتية نشطة — تحدث الآن', true);
              log('النظام', 'بدأت الجلسة الاستشارية الآمنة. أي استنتاج مهني يحتاج دليلًا واعتمادًا بشريًا منفصلًا.');
            }
            if (state === 'failed') {
              setStatus('فشل اتصال WebRTC', false);
              log('النظام', 'فشل الاتصال الصوتي. تحقق من الشبكة ومفتاح OpenAI أو إعداد Secret الخادم.');
              await stopLocal(true);
            }
            if (state === 'closed') setStatus('انتهت الجلسة', false);
          });

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIce(pc);
          const sdp = pc.localDescription?.sdp || offer.sdp;

          setStatus('تبادل SDP عبر خادم KOSIF…', false);
          const r = await V.api('/api/kosif/v38/realtime/call', {
            method: 'POST',
            body: {
              key,
              sdp,
              model: V.$('#v38-lv-model').value,
              voice: V.$('#v38-lv-voice').value,
              language: V.$('#v38-lv-lang').value,
              company: companyId(),
              context: uiContext()
            }
          });
          callId = String(r.callId || '');
          if (!r.answerSdp) throw new Error('لم يصل SDP answer صالح من الخادم.');
          await pc.setRemoteDescription({ type: 'answer', sdp: r.answerSdp });
        } catch (e) {
          await stopLocal(true);
          setStatus('تعذر بدء الجلسة', false);
          const msg = e?.status === 401
            ? 'افتح قفل المالك أولًا'
            : e?.code === 'SESSION_OPENAI_KEY_REQUIRED'
              ? e.message
              : e?.status === 503
                ? 'لا يوجد Secret على الخادم ولا مفتاح OpenAI مؤقت في جلسة مجلس المراجعين.'
                : (e?.message || 'تعذر بدء الاتصال الصوتي.');
          V.toast(msg, 'error');
          log('النظام', msg);
        }
      };

      V.$('#v38-lv-stop').onclick = async () => {
        await stopLocal(true);
        log('النظام', 'أُنهيت الجلسة؛ لا يُعتبر ما دار فيها دليل مراجعة أو اعتمادًا إلا بعد التوثيق والتحقق البشري.');
      };
    }
  });
})();
