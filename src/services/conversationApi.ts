/**
 * Client for the Accentify conversation service (separate HF Space from the
 * pronunciation/feedback service in `accentifyApi.ts`).
 *
 * Real API contract (verified against /openapi.json on 2026-05-22):
 *   GET  /health
 *   POST /conversation/text   (JSON  { text })           → { input_text, response_text }
 *   POST /conversation/audio  (multipart file)           → { transcription, response_text,
 *                                                            audio_base64 (full RIFF/WAVE),
 *                                                            sample_rate }
 *
 * Base URL + bearer token come from Expo config under DIFFERENT keys from the
 * pronunciation service:
 *   extra.ACCENTIFY_CONVO_API_URL    ← EXPO_PUBLIC_ACCENTIFY_CONVO_API_URL
 *   extra.ACCENTIFY_CONVO_API_TOKEN  ← EXPO_PUBLIC_ACCENTIFY_CONVO_API_TOKEN
 *
 * Keeping these vars deliberately distinct from `ACCENTIFY_API_TOKEN` so the
 * two services can be rotated / pointed independently.
 */
import Constants from 'expo-constants';

function getConvoConfig() {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    (Constants.manifest as any)?.extra ??
    {};
  const baseUrl = extra.ACCENTIFY_CONVO_API_URL?.replace(/\/+$/, '');
  const token = extra.ACCENTIFY_CONVO_API_TOKEN;
  if (!baseUrl) {
    throw new ConversationApiError(
      'unknown',
      'Conversation service URL is not configured. Set EXPO_PUBLIC_ACCENTIFY_CONVO_API_URL.',
    );
  }
  return { baseUrl, token };
}

function convoAuthHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ConversationApiError extends Error {
  readonly code:
    | 'unauthorized'
    | 'bad_request'
    | 'server_error'
    | 'network'
    | 'unknown';
  readonly userMessage: string;
  readonly status?: number;

  constructor(
    code: ConversationApiError['code'],
    userMessage: string,
    status?: number,
    cause?: unknown,
  ) {
    super(userMessage);
    this.name = 'ConversationApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
    if (cause) (this as any).cause = cause;
  }
}

function classifyConvo(status: number, body: any): ConversationApiError {
  const detail = typeof body?.detail === 'string' ? body.detail : undefined;
  const message = typeof body?.message === 'string' ? body.message : undefined;

  if (status === 401 || status === 403) {
    return new ConversationApiError(
      'unauthorized',
      'Access to the conversation service is denied. Please contact support.',
      status,
    );
  }
  if (status === 422 || status === 400) {
    return new ConversationApiError(
      'bad_request',
      detail ?? message ?? 'The conversation request was rejected.',
      status,
    );
  }
  if (status >= 500) {
    return new ConversationApiError(
      'server_error',
      'The conversation service is having trouble. Please try again in a moment.',
      status,
    );
  }
  return new ConversationApiError('unknown', detail ?? message ?? `Request failed (${status}).`, status);
}

async function readConvoBody(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// HF Spaces on the free tier go to sleep after ~5 min idle. Identical retry
// pattern to accentifyApi.ts — ping /health then retry once.
const COLD_START_BACKOFF_MS = 1500;
const COLD_START_STATUSES = new Set([500, 502, 503, 504]);

async function warmUp(baseUrl: string, token: string | undefined): Promise<void> {
  try {
    await fetch(`${baseUrl}/health`, { headers: convoAuthHeaders(token) });
  } catch {
    // Ignored — warmup is best-effort.
  }
}

interface RequestOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: BodyInit;
  extraHeaders?: Record<string, string>;
}

async function callConvo<T>(opts: RequestOptions): Promise<T> {
  const { baseUrl, token } = getConvoConfig();
  const url = `${baseUrl}${opts.path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...convoAuthHeaders(token),
    ...(opts.extraHeaders ?? {}),
  };

  for (let tries = 0; tries < 2; tries++) {
    let res: Response;
    try {
      res = await fetch(url, { method: opts.method, headers, body: opts.body });
    } catch (err) {
      if (tries === 0) {
        await warmUp(baseUrl, token);
        await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS));
        continue;
      }
      throw new ConversationApiError(
        'network',
        'Could not reach the conversation service. Check your internet connection and try again.',
        undefined,
        err,
      );
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (tries === 0 && COLD_START_STATUSES.has(res.status)) {
      await readConvoBody(res).catch(() => undefined);
      await warmUp(baseUrl, token);
      await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS));
      continue;
    }

    throw classifyConvo(res.status, await readConvoBody(res));
  }

  throw new ConversationApiError('unknown', 'Conversation request failed after retry.');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationTextResponse {
  input_text: string;
  response_text: string;
}

export interface ConversationAudioResponse {
  /** ASR transcript of the learner's recording. */
  transcription: string;
  /** Tutor's textual reply. */
  response_text: string;
  /** Full RIFF/WAVE file as base64 — playable as a .wav directly. */
  audio_base64: string;
  /** Sample rate of the returned WAV (the API consistently returns 16000). */
  sample_rate: number;
}

// ─── Endpoint wrappers ────────────────────────────────────────────────────────

/** GET /health — used to wake the Space on cold start. */
export function convoHealth(): Promise<unknown> {
  return callConvo({ method: 'GET', path: '/health' });
}

/**
 * Build a one-line system hint that nudges the conversation model toward the
 * learner's CEFR band. Prepended to the user message because the API has no
 * dedicated system-prompt slot. Also surfaced as an `X-User-CEFR` header so
 * a future backend update can read it without parsing the user's text.
 */
function cefrHint(level?: string): string {
  const upper = (level ?? '').toUpperCase();
  switch (upper) {
    case 'A1':
    case 'A2':
      return '[System: learner is CEFR ' + upper + '. Reply in 6-12 word sentences, simple present tense, common 2000-word vocabulary, gently recast errors.]';
    case 'B1':
    case 'B2':
      return '[System: learner is CEFR ' + upper + '. Reply in 10-20 word sentences, mix tenses, mild idioms okay, correct only major errors.]';
    case 'C1':
    case 'C2':
      return '[System: learner is CEFR ' + upper + '. Use natural idiomatic register, debate-style follow-ups, do not simplify.]';
    default:
      return '';
  }
}

/**
 * POST /conversation/text — send a typed message, get back a tutor reply.
 * Wired into the standalone Wavy Chat screen.
 *
 * `cefrLevel` is the learner's CEFR (A1..C2). Used to shape reply complexity.
 */
export function conversationText(
  text: string,
  cefrLevel?: string,
): Promise<ConversationTextResponse> {
  const hint = cefrHint(cefrLevel);
  const wrapped = hint ? `${hint}\n${text}` : text;
  const extraHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cefrLevel) extraHeaders['X-User-CEFR'] = String(cefrLevel).toUpperCase();
  return callConvo<ConversationTextResponse>({
    method: 'POST',
    path: '/conversation/text',
    extraHeaders,
    body: JSON.stringify({ text: wrapped }),
  });
}

function convoAudioFilePart(uri: string, encoding: 'wav' | 'm4a' | 'mp3' | 'webm') {
  const mime =
    encoding === 'wav'
      ? 'audio/wav'
      : encoding === 'mp3'
        ? 'audio/mpeg'
        : encoding === 'webm'
          ? 'audio/webm'
          : 'audio/m4a';
  const name = `recording.${encoding}`;
  return { uri, name, type: mime } as unknown as Blob;
}

/**
 * POST /conversation/audio — multipart upload of the learner's recording.
 * Returns transcription + AI reply text + AI reply audio (WAV base64).
 *
 * IMPORTANT: do NOT set Content-Type — fetch sets the multipart boundary itself.
 *
 * `cefrLevel` is surfaced both as a multipart field and an `X-User-CEFR`
 * header so the backend can shape reply complexity without parsing audio.
 */
export function conversationAudio(input: {
  audioUri: string;
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm';
  cefrLevel?: string;
}): Promise<ConversationAudioResponse> {
  const form = new FormData();
  form.append('file', convoAudioFilePart(input.audioUri, input.encoding));
  if (input.cefrLevel) {
    form.append('cefr_level', String(input.cefrLevel).toUpperCase());
  }
  const extraHeaders: Record<string, string> = {};
  if (input.cefrLevel) extraHeaders['X-User-CEFR'] = String(input.cefrLevel).toUpperCase();
  return callConvo<ConversationAudioResponse>({
    method: 'POST',
    path: '/conversation/audio',
    body: form,
    extraHeaders,
  });
}
