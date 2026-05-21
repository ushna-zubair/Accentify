/**
 * Client for the Accentify pronunciation evaluation service hosted on
 * Hugging Face Spaces.
 *
 * Real API contract (see Accentify_Endpoints_info.txt + accentify_audio_evaluate_openapi.json):
 *   GET  /health
 *   GET  /prompt_word?level=N            → { word, reference, level }
 *   GET  /prompt_sentence?level=A1       → { id, level, sentences: [{ sentence, sapi }] }
 *   POST /evaluate_word     (multipart)  → word evaluation with phoneme details + score
 *   POST /evaluate_sentence (multipart)  → sentence eval with per-word alignment + scores
 *
 * The base URL and bearer token come from Expo config (`extra.ACCENTIFY_API_URL` /
 * `extra.ACCENTIFY_API_TOKEN`), which app.config.js wires from EXPO_PUBLIC_* env.
 */
import Constants from 'expo-constants';

function getConfig() {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    (Constants.manifest as any)?.extra ??
    {};
  const baseUrl = extra.ACCENTIFY_API_URL?.replace(/\/+$/, '');
  const token = extra.ACCENTIFY_API_TOKEN;
  if (!baseUrl) {
    throw new Error(
      'ACCENTIFY_API_URL is not configured. Set EXPO_PUBLIC_ACCENTIFY_API_URL in your environment.',
    );
  }
  return { baseUrl, token };
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Error thrown by every Accentify API call. `code` lets callers branch on
 * the failure mode (audio too short, alignment failure, network, etc.) and
 * `userMessage` is safe to surface in the UI verbatim.
 */
export class AccentifyApiError extends Error {
  readonly code:
    | 'audio_too_short'
    | 'unknown_word'
    | 'poor_alignment'
    | 'unauthorized'
    | 'server_error'
    | 'network'
    | 'unknown';
  readonly userMessage: string;
  readonly status?: number;

  constructor(
    code: AccentifyApiError['code'],
    userMessage: string,
    status?: number,
    cause?: unknown,
  ) {
    super(userMessage);
    this.name = 'AccentifyApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
    if (cause) (this as any).cause = cause;
  }
}

function classify(status: number, body: any): AccentifyApiError {
  const detail = typeof body?.detail === 'string' ? body.detail : undefined;
  const message = typeof body?.message === 'string' ? body.message : undefined;

  if (status === 401 || status === 403) {
    return new AccentifyApiError('unauthorized', 'Access to the pronunciation service is denied. Please contact support.', status);
  }
  if (status === 400) {
    if (detail?.toLowerCase().includes('too short')) {
      return new AccentifyApiError('audio_too_short', 'That recording was too short — try speaking for at least a second.', status);
    }
    if (detail?.toLowerCase().includes('unknown word')) {
      return new AccentifyApiError('unknown_word', 'The model doesn\'t recognize that word yet. Pick a different one.', status);
    }
    return new AccentifyApiError('server_error', detail ?? message ?? 'The recording could not be evaluated.', status);
  }
  if (status >= 500) {
    return new AccentifyApiError('server_error', 'The pronunciation service is having trouble. Please try again in a moment.', status);
  }
  return new AccentifyApiError('unknown', detail ?? message ?? `Request failed (${status}).`, status);
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

async function getJson<T>(path: string): Promise<T> {
  const { baseUrl, token } = getConfig();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...authHeaders(token) },
    });
  } catch (err) {
    throw new AccentifyApiError(
      'network',
      'Could not reach the pronunciation service. Check your internet connection and try again.',
      undefined,
      err,
    );
  }
  if (!res.ok) {
    throw classify(res.status, await readBody(res));
  }
  return (await res.json()) as T;
}

/**
 * HF Spaces on the free tier go to sleep after inactivity. The first request
 * after a cold start often returns 500/502/503 while the container spins up.
 * We swallow that one failure: ping /health (which forces the Space to wake
 * even if the model isn't loaded yet), wait briefly, then retry once.
 */
const COLD_START_BACKOFF_MS = 1500;

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const { baseUrl, token } = getConfig();

  const attempt = async (): Promise<Response> => {
    // NOTE: do NOT set Content-Type — React Native must set it with the
    // multipart boundary itself.
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...authHeaders(token) },
      body: form,
    });
  };

  const isColdStart = (status: number) =>
    status === 500 || status === 502 || status === 503 || status === 504;

  for (let tries = 0; tries < 2; tries++) {
    let res: Response;
    try {
      res = await attempt();
    } catch (err) {
      if (tries === 0) {
        // Network failure on a sleeping Space looks identical to no internet.
        // Try a wake-up ping and retry once before bubbling up.
        await fetch(`${baseUrl}/health`, {
          headers: authHeaders(token),
        }).catch(() => undefined);
        await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS));
        continue;
      }
      throw new AccentifyApiError(
        'network',
        'Could not reach the pronunciation service. Check your internet connection and try again.',
        undefined,
        err,
      );
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (tries === 0 && isColdStart(res.status)) {
      // Drain the body so the connection can be reused, then warm + retry.
      await readBody(res).catch(() => undefined);
      await fetch(`${baseUrl}/health`, {
        headers: authHeaders(token),
      }).catch(() => undefined);
      await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS));
      continue;
    }

    throw classify(res.status, await readBody(res));
  }

  // Unreachable — loop either returns or throws.
  throw new AccentifyApiError('unknown', 'Request failed after retry.');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptWordResponse {
  word: string;
  reference: string;
  level: number;
}

export interface SentencePrompt {
  sentence: string;
  sapi: string[];
}

export interface PromptSentenceResponse {
  id: number;
  level: string;
  sentences: SentencePrompt[];
}

export interface PhonemeDetail {
  phoneme_native: string;
  phoneme_arpabet: string;
  confidence: number;
}

export interface PhonemeComparison {
  ref_arp: string;
  detected_arp: string;
  match: boolean;
  conf: number;
}

export interface EvaluateWordResponse {
  reference_arpabet: string[];
  detected_native: string[];
  detected_arpabet: string[];
  phoneme_details: PhonemeDetail[];
  ref_phones: string[];
  comparison: PhonemeComparison[];
  score: number;
  missing_phones: string[];
  word: string;
  reference: string;
}

export interface SentenceWordResult {
  index: number;
  ref: string;
  /** "M" match, "S" substitution, "D" deletion */
  op: 'M' | 'S' | 'D';
  asr: string;
  start: number;
  end: number;
  pronunciation_score: number;
  evaluation: EvaluateWordResponse;
}

/** Returned with HTTP 200 when the recording was too unclear to align. */
export interface EvaluateSentenceErrorResponse {
  error: 'poor_alignment' | string;
  message: string;
  word_score: number;
  word_score_pct: number;
}

export interface EvaluateSentenceResponse {
  reference_text: string;
  word_correctness: {
    ref_words: string[];
    matched: number;
    substituted: number;
    missing: number;
    extra_spoken: number;
    extra_tokens: string[];
    word_score: number;
    word_score_pct: number;
  };
  words: SentenceWordResult[];
  overall: {
    pronunciation_score: number;
    weighted_overall_score: number;
    scored_words: number;
    skipped_words: number;
  };
}

// ─── Endpoint wrappers ────────────────────────────────────────────────────────

export function health(): Promise<unknown> {
  return getJson('/health');
}

/** GET /prompt_word?level=N (defaults to 1 if omitted). */
export function promptWord(level: number = 1): Promise<PromptWordResponse> {
  return getJson<PromptWordResponse>(`/prompt_word?level=${encodeURIComponent(level)}`);
}

/** GET /prompt_sentence?level=A1 (defaults to A1 if omitted). */
export function promptSentence(level: string = 'A1'): Promise<PromptSentenceResponse> {
  return getJson<PromptSentenceResponse>(
    `/prompt_sentence?level=${encodeURIComponent(level)}`,
  );
}

/**
 * Build the file part FormData expects for a local audio URI captured by
 * expo-audio. React Native maps `{ uri, name, type }` to a multipart file part.
 */
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
 * POST /evaluate_word — multipart with the word text, reference ARPAbet, and
 * the recorded audio file. Returns phoneme-level breakdown + a 0–1 score.
 */
export function evaluateWord(input: {
  word: string;
  reference: string;
  audioUri: string;
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm';
}): Promise<EvaluateWordResponse> {
  const form = new FormData();
  form.append('word', input.word);
  form.append('reference', input.reference);
  form.append('audio', audioFilePart(input.audioUri, input.encoding));
  return postForm<EvaluateWordResponse>('/evaluate_word', form);
}

/**
 * POST /evaluate_sentence — multipart with the reference text and audio file.
 * Optional `sapi` is a JSON array of per-word ARPAbet strings (improves alignment).
 */
export async function evaluateSentence(input: {
  reference_text: string;
  audioUri: string;
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm';
  sapi?: string[];
}): Promise<EvaluateSentenceResponse> {
  const form = new FormData();
  form.append('reference_text', input.reference_text);
  form.append('audio', audioFilePart(input.audioUri, input.encoding));
  if (input.sapi && input.sapi.length > 0) {
    form.append('sapi', JSON.stringify(input.sapi));
  }
  // The endpoint returns HTTP 200 even when alignment fails, signalling it
  // via { error: 'poor_alignment', message } — convert that to the typed
  // error so callers have a uniform error-handling path.
  const raw = await postForm<EvaluateSentenceResponse | EvaluateSentenceErrorResponse>(
    '/evaluate_sentence',
    form,
  );
  if ('error' in raw && raw.error) {
    throw new AccentifyApiError(
      raw.error === 'poor_alignment' ? 'poor_alignment' : 'server_error',
      raw.message || 'Your recording could not be evaluated. Please try again.',
      200,
    );
  }
  return raw as EvaluateSentenceResponse;
}

// ─── AI feedback wrappers ─────────────────────────────────────────────────────
// The HF Space exposes /feedback_word and /feedback_sentence which return a
// natural-language coaching tip. Paths are not documented in the OpenAPI spec,
// so we treat 404/405/422 as "endpoint unavailable" and let callers fall back
// to local rule-based feedback.

export interface FeedbackWordResponse {
  word: string;
  feedback: string;
}

export interface FeedbackSentenceResponse {
  reference_text: string;
  feedback: string;
}

const FEEDBACK_UNAVAILABLE_STATUSES = new Set([404, 405, 422]);

/**
 * POST /feedback_word — returns AI-generated coaching feedback for the word.
 * Returns an empty string if the endpoint isn't deployed (404/405) or rejects
 * the payload shape (422); callers should fall back to local feedback.
 */
export async function feedbackWord(input: {
  word: string;
  reference: string;
  audioUri?: string;
  encoding?: 'wav' | 'm4a' | 'mp3' | 'webm';
}): Promise<string> {
  const form = new FormData();
  form.append('word', input.word);
  form.append('reference', input.reference);
  if (input.audioUri && input.encoding) {
    form.append('audio', audioFilePart(input.audioUri, input.encoding));
  }
  try {
    const res = await postForm<FeedbackWordResponse>('/feedback_word', form);
    return res?.feedback ?? '';
  } catch (e) {
    if (
      e instanceof AccentifyApiError &&
      e.status !== undefined &&
      FEEDBACK_UNAVAILABLE_STATUSES.has(e.status)
    ) {
      return '';
    }
    throw e;
  }
}

/**
 * POST /feedback_sentence — returns AI-generated coaching feedback for the
 * sentence. Same fallback semantics as `feedbackWord`.
 */
export async function feedbackSentence(input: {
  reference_text: string;
  audioUri?: string;
  encoding?: 'wav' | 'm4a' | 'mp3' | 'webm';
  sapi?: string[];
}): Promise<string> {
  const form = new FormData();
  form.append('reference_text', input.reference_text);
  if (input.audioUri && input.encoding) {
    form.append('audio', audioFilePart(input.audioUri, input.encoding));
  }
  if (input.sapi && input.sapi.length > 0) {
    form.append('sapi', JSON.stringify(input.sapi));
  }
  try {
    const res = await postForm<FeedbackSentenceResponse>('/feedback_sentence', form);
    return res?.feedback ?? '';
  } catch (e) {
    if (
      e instanceof AccentifyApiError &&
      e.status !== undefined &&
      FEEDBACK_UNAVAILABLE_STATUSES.has(e.status)
    ) {
      return '';
    }
    throw e;
  }
}
