/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * Client for Google Cloud Text-to-Speech.
 *
 *   POST https://texttospeech.googleapis.com/v1/text:synthesize?key=...
 *
 * The API key is read from EXPO_PUBLIC_GOOGLE_TTS_API_KEY (exposed via
 * app.config.js → extra.GOOGLE_TTS_API_KEY). Restrict this key to the
 * Text-to-Speech API in the GCP console.
 *
 * We return MP3 (not LINEAR16) because:
 *   - It's compact (smaller payloads = faster transport),
 *   - It needs no WAV-header construction client-side,
 *   - expo-audio plays it natively.
 *
 * Free-tier quota:
 *   - Standard voices: 4M chars/month
 *   - WaveNet/Neural2: 1M chars/month
 * We default to a Neural2 voice — comfortably inside the 1M limit for an
 * indie app, and significantly more natural than Standard.
 */
import Constants from 'expo-constants';

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const DEFAULT_VOICE = 'en-US-Neural2-F';
const DEFAULT_LANGUAGE_CODE = 'en-US';

function getTtsKey(): string {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    (Constants.manifest as any)?.extra ??
    {};
  const key = extra.GOOGLE_TTS_API_KEY;
  if (!key) {
    throw new GoogleTtsError(
      'unknown',
      'Google TTS API key is not configured. Set EXPO_PUBLIC_GOOGLE_TTS_API_KEY in .env.',
    );
  }
  return key;
}

export class GoogleTtsError extends Error {
  readonly code: 'unauthorized' | 'bad_request' | 'quota' | 'server_error' | 'network' | 'unknown';
  readonly userMessage: string;
  readonly status?: number;

  constructor(code: GoogleTtsError['code'], userMessage: string, status?: number, cause?: unknown) {
    super(userMessage);
    this.name = 'GoogleTtsError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
    if (cause) (this as any).cause = cause;
  }
}

function classifyTts(status: number, body: any): GoogleTtsError {
  const detail = typeof body?.error?.message === 'string' ? body.error.message : undefined;
  if (status === 401 || status === 403) {
    return new GoogleTtsError(
      'unauthorized',
      'Google TTS rejected the API key. Check EXPO_PUBLIC_GOOGLE_TTS_API_KEY and the API restrictions in GCP.',
      status,
    );
  }
  if (status === 429) {
    return new GoogleTtsError(
      'quota',
      'Google TTS quota exhausted — wait or check your billing tier.',
      status,
    );
  }
  if (status === 400) {
    return new GoogleTtsError('bad_request', detail ?? 'Bad TTS request.', status);
  }
  if (status >= 500) {
    return new GoogleTtsError(
      'server_error',
      'Google TTS is having trouble. Please try again shortly.',
      status,
    );
  }
  return new GoogleTtsError('unknown', detail ?? `TTS request failed (${status}).`, status);
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

export interface GoogleTtsInput {
  text: string;
  /** e.g. 'en-US-Neural2-F'. Defaults to a female US English Neural2 voice. */
  voiceName?: string;
  /** e.g. 'en-US'. Must match the voice's locale. */
  languageCode?: string;
  /** 0.25–4.0. 1.0 is normal. */
  speakingRate?: number;
}

export interface GoogleTtsResult {
  /** Base64-encoded MP3 audio. Write to a .mp3 file for playback. */
  audioBase64: string;
  /** Always 'mp3' for this client — included so callers don't have to assume. */
  audioFormat: 'mp3';
}

export async function googleTtsSynthesize(input: GoogleTtsInput): Promise<GoogleTtsResult> {
  const key = getTtsKey();
  const url = `${GOOGLE_TTS_URL}?key=${encodeURIComponent(key)}`;

  const payload = {
    input: { text: input.text },
    voice: {
      languageCode: input.languageCode ?? DEFAULT_LANGUAGE_CODE,
      name: input.voiceName ?? DEFAULT_VOICE,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: input.speakingRate ?? 1.0,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new GoogleTtsError(
      'network',
      'Could not reach Google TTS. Check your internet connection.',
      undefined,
      err,
    );
  }

  if (!res.ok) {
    throw classifyTts(res.status, await readBody(res));
  }
  const body = (await res.json()) as { audioContent?: string };
  if (!body.audioContent) {
    throw new GoogleTtsError('server_error', 'Google TTS returned no audio.');
  }
  return { audioBase64: body.audioContent, audioFormat: 'mp3' };
}
