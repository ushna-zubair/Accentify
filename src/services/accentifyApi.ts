/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Muhammad Ali
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

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

function getFeedbackConfig() {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    (Constants.manifest as any)?.extra ??
    {};
  const baseUrl = extra.ACCENTIFY_FEEDBACK_API_URL?.replace(/\/+$/, '');
  // Falls back to the evaluation token — the feedback Space uses the same HF
  // bearer in practice.
  const token = extra.ACCENTIFY_FEEDBACK_API_TOKEN ?? extra.ACCENTIFY_API_TOKEN;
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
    return new AccentifyApiError(
      'unauthorized',
      'Access to the pronunciation service is denied. Please contact support.',
      status,
    );
  }
  if (status === 400) {
    const detailLower = detail?.toLowerCase() ?? '';
    if (detailLower.includes('too short')) {
      return new AccentifyApiError(
        'audio_too_short',
        'That recording was too short — try speaking for at least a second.',
        status,
      );
    }
    // "unknown word" and "no valid model tokens" both mean the model's
    // tokenizer can't represent the reference — re-recording won't help; the
    // controller needs to swap the word out.
    if (detailLower.includes('unknown word') || detailLower.includes('no valid model tokens')) {
      return new AccentifyApiError(
        'unknown_word',
        "The model doesn't recognize that word yet. Pick a different one.",
        status,
      );
    }
    return new AccentifyApiError(
      'server_error',
      detail ?? message ?? 'The recording could not be evaluated.',
      status,
    );
  }
  if (status >= 500) {
    return new AccentifyApiError(
      'server_error',
      'The pronunciation service is having trouble. Please try again in a moment.',
      status,
    );
  }
  return new AccentifyApiError(
    'unknown',
    detail ?? message ?? `Request failed (${status}).`,
    status,
  );
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
 * One retry isn't enough for /evaluate_sentence — the model loads lazily
 * and the second request can still hit the boot window. Use progressive
 * backoff over multiple attempts and a wake-up /health ping between tries.
 */
const COLD_START_BACKOFF_MS = [1500, 4000, 8000];

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

  const maxAttempts = COLD_START_BACKOFF_MS.length + 1;
  for (let tries = 0; tries < maxAttempts; tries++) {
    let res: Response;
    try {
      res = await attempt();
    } catch (err) {
      if (tries < COLD_START_BACKOFF_MS.length) {
        // Network failure on a sleeping Space looks identical to no internet.
        // Wake it up and try again before bubbling up.
        await fetch(`${baseUrl}/health`, {
          headers: authHeaders(token),
        }).catch(() => undefined);
        await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS[tries]));
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

    if (tries < COLD_START_BACKOFF_MS.length && isColdStart(res.status)) {
      if (__DEV__) {
        console.log(
          `[Accentify] ${path} ${res.status}; retrying in ${COLD_START_BACKOFF_MS[tries]}ms (attempt ${tries + 1}/${maxAttempts})`,
        );
      }
      // Drain the body so the connection can be reused, then warm + retry.
      await readBody(res).catch(() => undefined);
      await fetch(`${baseUrl}/health`, {
        headers: authHeaders(token),
      }).catch(() => undefined);
      await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS[tries]));
      continue;
    }

    throw classify(res.status, await readBody(res));
  }

  // Unreachable — loop either returns or throws.
  throw new AccentifyApiError('unknown', 'Request failed after retry.');
}

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

export function health(): Promise<unknown> {
  return getJson('/health');
}

/**
 * Fire-and-forget warmup ping for the feedback Space (separate host from
 * the evaluation Space — wakes independently from a cold start). Failure is
 * swallowed; this only exists to shave cold-start latency off the first
 * coaching feedback request.
 */
export async function feedbackHealth(): Promise<void> {
  const { baseUrl, token } = getFeedbackConfig();
  if (!baseUrl) return;
  try {
    await fetch(`${baseUrl}/health`, {
      headers: { Accept: 'application/json', ...authHeaders(token) },
    });
  } catch {
    // Swallow — warmup is best-effort.
  }
}

/** GET /prompt_word?level=N (defaults to 1 if omitted). */
export function promptWord(level: number = 1): Promise<PromptWordResponse> {
  return getJson<PromptWordResponse>(`/prompt_word?level=${encodeURIComponent(level)}`);
}

/** GET /prompt_sentence?level=A1 (defaults to A1 if omitted). */
export function promptSentence(level: string = 'A1'): Promise<PromptSentenceResponse> {
  return getJson<PromptSentenceResponse>(`/prompt_sentence?level=${encodeURIComponent(level)}`);
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

// /feedback_word and /feedback_sentence live on a SEPARATE HF Space
// (ushna22-accentify-feedback) and take JSON, not multipart audio. They
// receive the ARPAbet arrays / per-word alignment from the evaluate_* call
// and turn it into natural-language coaching. We treat 404/405/422 as
// "endpoint unavailable" and let callers fall back to local rule-based tips.

export interface FeedbackWordResponse {
  word: string;
  feedback: string;
}

export interface FeedbackSentenceResponse {
  reference_text: string;
  feedback: string;
}

const FEEDBACK_UNAVAILABLE_STATUSES = new Set([404, 405, 422]);

async function postJsonFeedback<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, token } = getFeedbackConfig();
  if (!baseUrl) {
    // No feedback host configured — surface as 404 so callers fall back.
    throw new AccentifyApiError('unknown', 'Feedback service is not configured.', 404);
  }

  const attempt = async (): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    });

  const isColdStart = (status: number) =>
    status === 500 || status === 502 || status === 503 || status === 504;

  const maxAttempts = COLD_START_BACKOFF_MS.length + 1;
  for (let tries = 0; tries < maxAttempts; tries++) {
    let res: Response;
    try {
      res = await attempt();
    } catch (err) {
      if (tries < COLD_START_BACKOFF_MS.length) {
        await fetch(`${baseUrl}/health`, {
          headers: authHeaders(token),
        }).catch(() => undefined);
        await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS[tries]));
        continue;
      }
      throw new AccentifyApiError(
        'network',
        'Could not reach the feedback service. Check your internet connection and try again.',
        undefined,
        err,
      );
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (tries < COLD_START_BACKOFF_MS.length && isColdStart(res.status)) {
      if (__DEV__) {
        console.log(
          `[Accentify] ${path} ${res.status}; retrying in ${COLD_START_BACKOFF_MS[tries]}ms (attempt ${tries + 1}/${maxAttempts})`,
        );
      }
      await readBody(res).catch(() => undefined);
      await fetch(`${baseUrl}/health`, {
        headers: authHeaders(token),
      }).catch(() => undefined);
      await new Promise((r) => setTimeout(r, COLD_START_BACKOFF_MS[tries]));
      continue;
    }

    throw classify(res.status, await readBody(res));
  }

  throw new AccentifyApiError('unknown', 'Feedback request failed after retry.');
}

/**
 * POST /feedback_word — coaching tip derived from the evaluate_word ARPAbet
 * alignment. Returns '' when the feedback Space is unavailable so callers
 * can fall back to local rule-based feedback.
 */
export async function feedbackWord(input: {
  word: string;
  reference_arpabet: string[];
  detected_arpabet: string[];
}): Promise<string> {
  try {
    const res = await postJsonFeedback<FeedbackWordResponse>('/feedback_word', {
      word: input.word,
      reference_arpabet: input.reference_arpabet,
      detected_arpabet: input.detected_arpabet,
    });
    if (__DEV__) {
      console.log('[Accentify] /feedback_word response:', JSON.stringify(res));
    }
    return res?.feedback ?? '';
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[Accentify] /feedback_word error:',
        e instanceof AccentifyApiError ? `code=${e.code} status=${e.status} msg=${e.message}` : e,
      );
    }
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

export interface FeedbackSentenceWord {
  ref: string;
  asr: string;
  op: 'M' | 'S' | 'D';
  pronunciation_score: number;
}

export interface FeedbackSentenceWordCorrectness {
  matched: number;
  substituted: number;
  missing: number;
  extra_spoken: number;
  word_score_pct: number;
}

export interface FeedbackSentenceOverall {
  pronunciation_score: number;
  weighted_overall_score: number;
}

/**
 * POST /feedback_sentence — coaching tip derived from the full evaluate_sentence
 * output. Same unavailable-fallback semantics as feedbackWord.
 */
export async function feedbackSentence(input: {
  reference_text: string;
  word_correctness: FeedbackSentenceWordCorrectness;
  words: FeedbackSentenceWord[];
  overall: FeedbackSentenceOverall;
}): Promise<string> {
  try {
    const res = await postJsonFeedback<FeedbackSentenceResponse>('/feedback_sentence', input);
    if (__DEV__) {
      console.log('[Accentify] /feedback_sentence response:', JSON.stringify(res));
    }
    return res?.feedback ?? '';
  } catch (e) {
    if (__DEV__) {
      console.log(
        '[Accentify] /feedback_sentence error:',
        e instanceof AccentifyApiError ? `code=${e.code} status=${e.status} msg=${e.message}` : e,
      );
    }
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
