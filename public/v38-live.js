/*
 * KOSIF v38 — المراجع الصوتي المباشر (OpenAI Realtime عبر WebRTC)
 * المفتاح يفتح جلسة مؤقتة عبر الخادم (لا يُخزَّن)، والمحادثة استشارية:
 * لا اعتماد قيود ولا آراء من القناة الصوتية.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  V.registerView({
    id: 'v38-live', title: 'مراجع صوتي', icon: '🎙', order: 980,
    render(sec) {
      sec.innerHTML =
        V.hero('المراجع الصوتي المباشر — OpenAI Realtime', 'محادثة صوتية استشارية مع سياق ملخص الارتباط؛ يُفتح سر مؤقت عبر خادم Kosif ولا يُكتب المفتاح في أي تخزين محلي، والقناة لا تعتمد قيدًا ولا تصدر رأيًا.', [['ai', 'صوت مباشر'], ['human', 'استشاري فقط']]) +
        '<div class="v38-card v38-no-print">' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>مفتاح OpenAI (يجتاز اختبار الاتصال في جلسة المالك)</label><input id="v38-lv-key" type="password" placeholder="sk-…" autocomplete="off"></div>' +
        '<div class="v38-field"><label>النموذج الصوتي</label><select id="v38-lv-model"><option value="gpt-4o-realtime-preview">gpt-4o-realtime-preview</option><option value="gpt-4o-mini-realtime-preview">gpt-4o-mini-realtime-preview</option></select></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
        '<button class="v38-btn gold" id="v38-lv-start">🎙 بدء المحادثة الصوتية</button>' +
        '<button class="v38-btn danger ghost" id="v38-lv-stop" disabled>⏹ إنهاء</button>' +
        '</div>' +
        '<div class="v38-live-orb" id="v38-lv-orb">🎙</div>' +
        '<div class="v38-wave" id="v38-lv-wave" style="display:none">' + Array.from({ length: 24 }, (_, i) => '<i style="animation-delay:' + (i * 60) + 'ms"></i>').join('') + '</div>' +
        '<div id="v38-lv-status" style="text-align:center;font-size:12.5px;color:var(--v38-muted);margin-top:8px">جلسة غير نشطة</div>' +
        '</div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>نص المحادثة</h3><span class="hint">يُعرض للتيسير فقط ولا يُعتمد منه محتوى دون تحقق</span></div><div id="v38-lv-log" style="max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:8px"></div></div>';

      let pc = null, session = null;
      const log = (who, text) => {
        const el = V.$('#v38-lv-log');
        const cls = who === 'أنت' ? 'v38-note info' : who === 'النظام' ? 'v38-note warn' : 'v38-note ai';
        el.innerHTML += '<div class="' + cls + '" style="margin:0"><span>' + (who === 'أنت' ? '👤' : who === 'النظام' ? '⚙️' : '🤖') + '</span><span><b>' + V.esc(who) + ':</b> ' + V.esc(text) + '</span></div>';
        el.scrollTop = el.scrollHeight;
      };
      const setStatus = (t, on) => { const s = V.$('#v38-lv-status'); s.textContent = t; V.$('#v38-lv-orb').classList.toggle('on', !!on); V.$('#v38-lv-wave').style.display = on ? 'flex' : 'none'; };

      V.$('#v38-lv-start').onclick = async () => {
        const key = V.$('#v38-lv-key').value.trim();
        if (!key) return V.toast('أدخل مفتاح OpenAI (يبقى في ذاكرة الصفحة فقط)', 'error');
        try {
          setStatus('فتح جلسة مؤقتة عبر الخادم…', false);
          const r = await V.api('/api/kosif/v38/realtime/session', { method: 'POST', body: { key, model: V.$('#v38-lv-model').value } });
          session = r.session;
          pc = new RTCPeerConnection();
          const audioEl = new Audio(); audioEl.autoplay = true;
          pc.ontrack = e => audioEl.srcObject = e.streams[0];
          const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
          pc.addTrack(ms.getTracks()[0], ms);
          const dc = pc.createDataChannel('response');
          dc.addEventListener('message', ev => {
            try { const d = JSON.parse(ev.data); if (d.type === 'response.done') { const t = d.response?.output?.filter(b => b.type === 'message').map(b => (b.content || []).map(c => c.transcript || '').join('')).join(''); if (t) log('المراجع الصوتي', t); } } catch {}
          });
          pc.addEventListener('connectionstatechange', () => {
            if (['connected'].includes(pc.connectionState)) { setStatus('جلسة صوتية نشطة — تحدث بحرية', true); log('النظام', 'بدأت الجلسة الاستشارية. لا يُعتمد من هذه القناة أي قيد أو رأي.'); }
            if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) setStatus('انتهت الجلسة', false);
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=' + encodeURIComponent(session.model), {
            method: 'POST',
            headers: { authorization: 'Bearer ' + session.ephemeral, 'content-type': 'application/sdp' },
            body: offer.sdp
          });
          if (!sdpRes.ok) throw new Error('رفض OpenAI تبادل SDP (' + sdpRes.status + ')');
          await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
          V.$('#v38-lv-stop').disabled = false;
          V.$('#v38-lv-key').value = '';
        } catch (e) {
          setStatus('تعذر بدء الجلسة', false);
          V.toast(e.status === 401 ? 'افتح قفل المالك أولًا' : e.message, 'error');
        }
      };
      V.$('#v38-lv-stop').onclick = () => {
        try { pc?.close(); } catch {}
        pc = null; session = null;
        V.$('#v38-lv-stop').disabled = true;
        setStatus('جلسة غير نشطة', false);
        log('النظام', 'أُنهيت الجلسة؛ ما دار فيها استشاري ويحتاج توثيقًا وتحققًا بشريًا.');
      };
    }
  });
})();
