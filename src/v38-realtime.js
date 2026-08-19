/*
 * KOSIF v38 — OpenAI Realtime Relay
 * يفتح جلسة WebRTC صوتية عبر نقطة OpenAI Realtime. المفتاح يمر عبر
 * الخادم لهذه الجلسة فقط ولا يُكتب في أي تخزين؛ يعاد للعميل سرٌّ مؤقت
 * (Ephemeral) تُبنى عليه الاتصال مباشرة بين المتصفح وOpenAI.
 */
const ALLOWED_MODELS = /^(gpt-4o-realtime-preview|gpt-4o-mini-realtime-preview|gpt-realtime)$/;

export async function openRealtimeSession(key, model) {
  const cleanKey = String(key || '').trim();
  const cleanModel = String(model || 'gpt-4o-realtime-preview').trim();
  if (!cleanKey.startsWith('sk-')) return { ok: false, error: 'OPENAI_KEY_INVALID', message: 'مفتاح OpenAI مطلوب وقد يجب أن يجتاز اختبار الاتصال أولًا.' };
  if (!ALLOWED_MODELS.test(cleanModel)) return { ok: false, error: 'REALTIME_MODEL_NOT_ALLOWED', message: 'نموذج غير مسموح للصوت المباشر.' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://api.openai.com/v1/realtime/sessions?model=${encodeURIComponent(cleanModel)}`, {
      method: 'POST', signal: ctrl.signal,
      headers: { authorization: `Bearer ${cleanKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: cleanModel, voice: 'alloy', input_audio_format: 'pcm16', output_audio_format: 'pcm16' })
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `REALTIME_HTTP_${res.status}`, message: 'رفض OpenAI فتح جلسة الصوت المباشر.' };
    const session = await res.json();
    if (!session?.client_secret?.value) return { ok: false, error: 'REALTIME_NO_EPHEMERAL_SECRET', message: 'لم يصل سرٌّ مؤقت من OpenAI.' };
    return { ok: true, session: { model: cleanModel, ephemeral: session.client_secret.value, expiresAt: session.client_secret.expires_at || null } };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e?.name === 'AbortError' ? 'REALTIME_TIMEOUT' : 'REALTIME_UNREACHABLE', message: 'تعذر الوصول إلى خدمة OpenAI Realtime.' };
  }
}
