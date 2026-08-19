/*
 * KOSIF v38 — OpenAI Realtime server relay
 *
 * Security invariant: the browser never receives or submits a standard OpenAI
 * API key. Cloudflare stores the key as OPENAI_API_KEY (or
 * KOSIF_OPENAI_API_KEY) and this module exchanges the browser's SDP offer with
 * OpenAI's server-side WebRTC call endpoint.
 */

export const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2.1';

const REALTIME_MODELS = new Set([
  'gpt-realtime-2.1',
  'gpt-realtime-2.1-mini',
  'gpt-realtime-2',
  'gpt-realtime-1.5',
  // Backward-compatible aliases retained for existing saved UI state.
  'gpt-realtime',
  'gpt-realtime-mini'
]);

const REALTIME_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse',
  'marin', 'cedar'
]);

const OPENAI_REALTIME_CALLS = 'https://api.openai.com/v1/realtime/calls';
const MAX_SDP_BYTES = 96 * 1024;
const MAX_CONTEXT_CHARS = 2400;
const REQUEST_TIMEOUT_MS = 20000;

function text(value, max = 1000) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function apiKey(env) {
  return text(env?.KOSIF_OPENAI_API_KEY || env?.OPENAI_API_KEY || '', 512);
}

export function realtimeConfigured(env) {
  return apiKey(env).length >= 20;
}

function normalizeModel(value) {
  const model = text(value || DEFAULT_REALTIME_MODEL, 80);
  return REALTIME_MODELS.has(model) ? model : DEFAULT_REALTIME_MODEL;
}

function normalizeVoice(value) {
  const voice = text(value || 'marin', 40);
  return REALTIME_VOICES.has(voice) ? voice : 'marin';
}

function normalizeLanguage(value) {
  const language = text(value || 'ar', 12).toLowerCase();
  return /^[a-z]{2}(?:-[a-z]{2})?$/.test(language) ? language.slice(0, 2) : 'ar';
}

function normalizeCompany(value) {
  const company = text(value, 80);
  return /^[A-Za-z0-9._:-]{1,80}$/.test(company) ? company : 'default';
}

function validateSdp(value) {
  const sdp = String(value || '');
  if (!sdp || sdp.length > MAX_SDP_BYTES || !/^v=0(?:\r?\n)/.test(sdp)) {
    return { ok: false, error: 'REALTIME_SDP_INVALID', message: 'WebRTC SDP offer is missing or invalid.' };
  }
  return { ok: true, sdp };
}

function advisorInstructions({ language, company, context }) {
  const lang = language === 'ar'
    ? 'Respond primarily in clear professional Arabic. Use English accounting or audit terms in parentheses when useful.'
    : 'Respond primarily in clear professional English.';
  const safeContext = text(context, MAX_CONTEXT_CHARS);
  return [
    'You are KOSIF Live Audit Advisor inside KOSIF v38 Trusted Audit Intelligence OS.',
    lang,
    'You are advisory-only. Never post, approve, reverse, alter, or authorize an accounting entry, adjustment, audit opinion, materiality threshold, or human sign-off.',
    'Separate observed facts, source-backed facts, professional inference, and recommended next actions. Ask for evidence when evidence is missing.',
    'Never claim that AI consensus is audit approval. Final professional judgments, posting, and audit opinions require explicit human approval through KOSIF deterministic controls.',
    'Treat client and engagement information as confidential. Do not request secrets, API keys, passwords, or authentication tokens.',
    'When a user requests a numerical amount that KOSIF can compute deterministically, explain the method and direct the user to the deterministic KOSIF calculation instead of inventing a final accountable amount.',
    'Keep spoken answers concise and interruption-friendly. If uncertain, say what evidence or authoritative source is needed next.',
    `Engagement company id: ${company}.`,
    safeContext ? `Current non-authoritative UI context: ${safeContext}` : ''
  ].filter(Boolean).join('\n');
}

function providerMessage(raw, fallback) {
  try {
    const data = JSON.parse(raw);
    return text(data?.error?.message || data?.message || fallback, 500) || fallback;
  } catch {
    return fallback;
  }
}

async function timedFetch(url, init, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function callIdFromLocation(location) {
  const value = text(location, 500);
  const match = value.match(/\/realtime\/calls\/([^/?#]+)/i) || value.match(/\/calls\/([^/?#]+)/i);
  return match ? text(match[1], 160) : '';
}

export async function createRealtimeCall(env, input = {}) {
  const key = apiKey(env);
  if (!key) {
    return {
      ok: false,
      error: 'REALTIME_NOT_CONFIGURED',
      message: 'OpenAI Realtime is not configured on the server.'
    };
  }

  const checked = validateSdp(input.sdp);
  if (!checked.ok) return checked;

  const model = normalizeModel(input.model);
  const voice = normalizeVoice(input.voice);
  const language = normalizeLanguage(input.language);
  const company = normalizeCompany(input.company);
  const instructions = advisorInstructions({ language, company, context: input.context });

  const session = {
    type: 'realtime',
    model,
    instructions,
    output_modalities: ['audio'],
    max_output_tokens: 1200,
    audio: {
      input: {
        noise_reduction: { type: 'near_field' },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
          language,
          prompt: language === 'ar'
            ? 'تدقيق، مراجعة، محاسبة، معيار، دليل، قيد، ميزان المراجعة، IFRS, ISA, SOCPA, ZATCA'
            : 'audit, accounting, evidence, journal, trial balance, IFRS, ISA, SOCPA, ZATCA'
        },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'auto',
          create_response: true,
          interrupt_response: true
        }
      },
      output: {
        voice,
        speed: 1.0
      }
    }
  };

  const form = new FormData();
  form.append('sdp', new Blob([checked.sdp], { type: 'application/sdp' }), 'offer.sdp');
  form.append('session', new Blob([JSON.stringify(session)], { type: 'application/json' }), 'session.json');

  let response;
  try {
    response = await timedFetch(OPENAI_REALTIME_CALLS, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },
      body: form
    });
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError' ? 'REALTIME_UPSTREAM_TIMEOUT' : 'REALTIME_UPSTREAM_UNAVAILABLE',
      message: error?.name === 'AbortError' ? 'OpenAI Realtime connection timed out.' : 'OpenAI Realtime could not be reached.'
    };
  }

  const answerSdp = await response.text();
  if (!response.ok) {
    return {
      ok: false,
      error: 'REALTIME_UPSTREAM_REJECTED',
      upstreamStatus: response.status,
      message: providerMessage(answerSdp, `OpenAI Realtime rejected the call (${response.status}).`)
    };
  }

  if (!/^v=0(?:\r?\n)/.test(answerSdp)) {
    return {
      ok: false,
      error: 'REALTIME_ANSWER_INVALID',
      message: 'OpenAI Realtime returned an invalid SDP answer.'
    };
  }

  return {
    ok: true,
    answerSdp,
    callId: callIdFromLocation(response.headers.get('location') || ''),
    model,
    voice,
    transport: 'webrtc-server-relay',
    keyExposure: 'none'
  };
}

export async function hangupRealtimeCall(env, callId) {
  const key = apiKey(env);
  if (!key) return { ok: false, error: 'REALTIME_NOT_CONFIGURED', message: 'OpenAI Realtime is not configured on the server.' };
  const id = text(callId, 160);
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(id)) return { ok: false, error: 'REALTIME_CALL_ID_INVALID', message: 'Realtime call id is invalid.' };

  let response;
  try {
    response = await timedFetch(`${OPENAI_REALTIME_CALLS}/${encodeURIComponent(id)}/hangup`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` }
    }, 12000);
  } catch (error) {
    return { ok: false, error: 'REALTIME_HANGUP_UNAVAILABLE', message: 'Realtime hangup request could not be completed.' };
  }

  if (response.ok || response.status === 404) return { ok: true, alreadyEnded: response.status === 404 };
  const raw = await response.text();
  return {
    ok: false,
    error: 'REALTIME_HANGUP_REJECTED',
    upstreamStatus: response.status,
    message: providerMessage(raw, `OpenAI Realtime hangup failed (${response.status}).`)
  };
}
