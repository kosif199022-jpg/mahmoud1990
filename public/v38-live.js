/*
 * KOSIF v38 — المراجع الصوتي المباشر (OpenAI Realtime عبر WebRTC server relay)
 * مفتاح OpenAI يبقى في أسرار الخادم فقط ولا يظهر أو يُرسل من المتصفح.
 * القناة استشارية: لا اعتماد قيود ولا آراء ولا أحكام مهنية تلقائيًا.
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
    id: 'v38-live', title: 'مراجع صوتي', icon: '🎙', order: 980,
    render(sec) {
      sec.innerHTML =
        V.hero('المراجع الصوتي المباشر — OpenAI Realtime', 'اتصال WebRTC آمن عبر خادم KOSIF: المتصفح لا يستقبل ولا يرسل مفتاح OpenAI. المراجع الصوتي استشاري فقط، ويُفصل دائمًا بين الوقائع والأدلة والاستنتاجات المهنية.', [['ai', 'صوت مباشر'], ['human', 'استشاري فقط'], ['safe', 'Server Relay']]) +
        '<div class="v38-card v38-no-print">' +
        '<div class="v38-cardh"><h3>الاتصال الآمن</h3><span class="hint" id="v38-lv-sec">جاري التحقق من إعداد الخادم…</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>النموذج الصوتي</label><select id="v38-lv-model"><option value="gpt-realtime">gpt-realtime</option><option value="gpt-realtime-mini">gpt-realtime-mini</option></select></div>' +
        '<div class="v38-field"><label>الصوت</label><select id="v38-lv-voice"><option value="marin">marin — موصى به</option><option value="cedar">cedar — موصى به</option><option value="alloy">alloy</option><option value="coral">coral</option><option value="sage">sage</option><option value="verse">verse</option></select></div>' +
        '<div class="v38-field"><label>لغة المحادثة</label><select id="v38-lv-lang"><option value="ar">العربية</option><option value="en">English</option></select></div>' +
        '</div>' +
        '<div class="v38-note info" style="margin-top:12px"><span>🔐</span><span><b>حماية المفتاح:</b> مفتاح OpenAI يجب أن يكون متغير بيئة/Secret على الخادم فقط. لا توجد خانة مفتاح في هذه الصفحة ولا يتم تخزين أي Secret في LocalStorage أو IndexedDB.</span></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
        '<button class="v38-btn gold" id="v38-lv-start">🎙 بدء المحادثة الصوتية</button>' +
        '<button class="v38-btn danger ghost" id="v38-lv-stop" disabled>⏹ إنهاء</button>' +
        '</div>' +
        '<div class="v38-live-orb" id="v38-lv-orb">🎙</div>' +
        '<div class="v38-wave" id="v38-lv-wave" style="display:none">' + Array.from({ length: 24 }, (_, i) => '<i style="animation-delay:' + (i * 60) + 'ms"></i>').join('') + '</div>' +
        '<div id="v38-lv-status" style="text-align:center;font-size:12.5px;color:var(--v38-muted);margin-top:8px">جلسة غير نشطة</div>' +
        '</div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>نص المحادثة</h3><span class="hint">النص للتيسير والمراجعة، وليس ورقة عمل أو دليلًا بحد ذاته</span></div><div id="v38-lv-log" style="max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:8px"></div></div>';

      let pc = null;
      let media = null;
      let audioEl = null;
      let callId = '';
      let stopping = false;

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
          if (notifyServer && id) await V.api('/api/kosif/v38/realtime/hangup', { method: 'POST', body: { callId: id } });
        } catch {}
        try { media?.getTracks?.().forEach(t => t.stop()); } catch {}
        try { pc?.close(); } catch {}
        try { if (audioEl) { audioEl.pause(); audioEl.srcObject = null; } } catch {}
        media = null; pc = null; audioEl = null;
        setButtons(false);
        setStatus('جلسة غير نشطة', false);
        stopping = false;
      };

      V.api('/api/kosif/v38/realtime/status').then(r => {
        const el = V.$('#v38-lv-sec');
        if (!el) return;
        el.textContent = r.configured
          ? 'الخادم جاهز — المفتاح مخفي عن المتصفح'
          : 'OpenAI Realtime غير مُعد على الخادم بعد';
      }).catch(e => {
        const el = V.$('#v38-lv-sec');
        if (el) el.textContent = e?.status === 401 ? 'افتح جلسة المالك للتحقق من الخدمة' : 'تعذر فحص حالة الخدمة';
      });

      V.$('#v38-lv-start').onclick = async () => {
        if (pc) return;
        try {
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
              log('النظام', 'فشل الاتصال الصوتي. تحقق من الشبكة وإعداد OpenAI Realtime على الخادم.');
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
            : e?.status === 503
              ? 'OpenAI Realtime غير مُعد على الخادم. أضف OPENAI_API_KEY كـ Secret في Cloudflare.'
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