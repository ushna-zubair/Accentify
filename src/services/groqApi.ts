/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * Client for Groq Cloud — used as a fast replacement for the HF conversation
 * Space.
 *
 *   - Chat completions:   POST /openai/v1/chat/completions
 *   - Whisper STT:        POST /openai/v1/audio/transcriptions
 *
 * Groq's API is OpenAI-compatible. Both endpoints share the same bearer token
 * read from EXPO_PUBLIC_GROQ_API_KEY (exposed via app.config.js → extra).
 *
 * Defaults:
 *   - Chat model: llama-3.1-8b-instant (fastest, ~750 tok/s)
 *   - STT model:  whisper-large-v3-turbo (fastest)
 */
import Constants from 'expo-constants';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_CHAT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_STT_MODEL = 'whisper-large-v3-turbo';

function getGroqKey(): string {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    (Constants.manifest as any)?.extra ??
    {};
  const key = extra.GROQ_API_KEY;
  if (!key) {
    throw new GroqApiError(
      'unknown',
      'Groq API key is not configured. Set EXPO_PUBLIC_GROQ_API_KEY in .env.',
    );
  }
  return key;
}

export class GroqApiError extends Error {
  readonly code:
    | 'unauthorized'
    | 'bad_request'
    | 'rate_limited'
    | 'server_error'
    | 'network'
    | 'unknown';
  readonly userMessage: string;
  readonly status?: number;

  constructor(code: GroqApiError['code'], userMessage: string, status?: number, cause?: unknown) {
    super(userMessage);
    this.name = 'GroqApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
    if (cause) (this as any).cause = cause;
  }
}

function classifyGroq(status: number, body: any): GroqApiError {
  const detail = typeof body?.error?.message === 'string' ? body.error.message : undefined;
  if (status === 401 || status === 403) {
    return new GroqApiError(
      'unauthorized',
      'Groq rejected the API key. Check EXPO_PUBLIC_GROQ_API_KEY.',
      status,
    );
  }
  if (status === 429) {
    return new GroqApiError('rate_limited', 'Groq rate limit hit — try again in a moment.', status);
  }
  if (status === 400 || status === 422) {
    return new GroqApiError('bad_request', detail ?? 'Bad request to Groq.', status);
  }
  if (status >= 500) {
    return new GroqApiError(
      'server_error',
      'Groq is having trouble. Please try again shortly.',
      status,
    );
  }
  return new GroqApiError('unknown', detail ?? `Groq request failed (${status}).`, status);
}

async function readBody(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatOptions {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  /** Max tokens to generate. Default is left to the server. */
  maxTokens?: number;
}

/**
 * POST /chat/completions — returns the assistant's reply text.
 * OpenAI-compatible request/response shape.
 */
export async function groqChat(opts: GroqChatOptions): Promise<string> {
  const key = getGroqKey();
  const url = `${GROQ_BASE}/chat/completions`;
  const payload: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_CHAT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens != null) payload.max_tokens = opts.maxTokens;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new GroqApiError(
      'network',
      'Could not reach Groq. Check your internet connection.',
      undefined,
      err,
    );
  }

  if (!res.ok) {
    throw classifyGroq(res.status, await readBody(res));
  }
  const body = (await res.json()) as any;
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new GroqApiError('server_error', 'Groq returned an empty reply.');
  }
  return text.trim();
}

export interface GroqTranscribeInput {
  audioUri: string;
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm';
  /** ISO-639-1 hint, e.g. 'en'. Improves accuracy + latency. */
  language?: string;
  model?: string;
}

function audioFilePart(uri: string, encoding: 'wav' | 'm4a' | 'mp3' | 'webm') {
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
 * POST /audio/transcriptions — returns plain transcript text.
 * Whisper-large-v3-turbo decodes wav/m4a/mp3/webm natively via ffmpeg-server-side.
 */
export async function groqTranscribe(input: GroqTranscribeInput): Promise<string> {
  const key = getGroqKey();
  const url = `${GROQ_BASE}/audio/transcriptions`;

  const form = new FormData();
  form.append('file', audioFilePart(input.audioUri, input.encoding));
  form.append('model', input.model ?? DEFAULT_STT_MODEL);
  if (input.language) form.append('language', input.language);
  // 'json' is the smallest useful response — we only need `text`.
  form.append('response_format', 'json');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
        // IMPORTANT: do NOT set Content-Type — fetch sets the multipart boundary.
      },
      body: form,
    });
  } catch (err) {
    throw new GroqApiError('network', 'Could not reach Groq for transcription.', undefined, err);
  }

  if (!res.ok) {
    throw classifyGroq(res.status, await readBody(res));
  }
  const body = (await res.json()) as { text?: string };
  return (body.text ?? '').trim();
}
