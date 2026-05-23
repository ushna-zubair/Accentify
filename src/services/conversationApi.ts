/**
 * Conversation service for the Wavy text chat and the Tutor voice chat.
 *
 * Previously this hit a single HF Space that bundled Whisper + Qwen + TTS.
 * That Space was slow and cold-started often. We now fan out to two
 * always-on cloud APIs:
 *
 *   - Groq Cloud   → chat completions (Llama 3.1 8B Instant) + Whisper STT
 *   - Google Cloud → Text-to-Speech (Neural2 MP3)
 *
 * The exported API surface (`conversationText`, `conversationAudio`, the
 * error class, and the response shapes) is intentionally preserved so the
 * controllers don't need to change beyond honoring the new `audio_format`
 * field on the audio response (now 'mp3' instead of 'wav').
 */
import {
  GroqApiError,
  groqChat,
  groqTranscribe,
  type GroqChatMessage,
} from './groqApi';
import { GoogleTtsError, googleTtsSynthesize } from './googleTtsApi';

// ─── Errors ───────────────────────────────────────────────────────────────────

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

/** Map upstream Groq/Google errors onto our existing ConversationApiError codes. */
function wrapError(e: unknown): ConversationApiError {
  if (e instanceof GroqApiError) {
    const code =
      e.code === 'rate_limited' ? 'server_error'
      : e.code === 'unauthorized' ? 'unauthorized'
      : e.code === 'bad_request' ? 'bad_request'
      : e.code === 'network' ? 'network'
      : e.code === 'server_error' ? 'server_error'
      : 'unknown';
    return new ConversationApiError(code, e.userMessage, e.status, e);
  }
  if (e instanceof GoogleTtsError) {
    const code =
      e.code === 'quota' ? 'server_error'
      : e.code === 'unauthorized' ? 'unauthorized'
      : e.code === 'bad_request' ? 'bad_request'
      : e.code === 'network' ? 'network'
      : e.code === 'server_error' ? 'server_error'
      : 'unknown';
    return new ConversationApiError(code, e.userMessage, e.status, e);
  }
  if (e instanceof ConversationApiError) return e;
  return new ConversationApiError(
    'unknown',
    'Something went wrong with the conversation service.',
    undefined,
    e,
  );
}

// ─── Response types (preserved for controller compatibility) ──────────────────

/**
 * Prior turn passed into a conversation call so the model has context.
 * Map your UI message types to this shape ('wavy'/'tutor' → 'assistant').
 */
export interface ConversationHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Cap on how many prior messages we send. ~10 turns is plenty for coherence
 *  and keeps token usage well under the Groq free-tier per-minute limit. */
export const CONVERSATION_HISTORY_LIMIT = 20;

export interface ConversationTextResponse {
  input_text: string;
  response_text: string;
}

export interface ConversationAudioResponse {
  transcription: string;
  response_text: string;
  /** Base64-encoded audio payload. Format is indicated by `audio_format`. */
  audio_base64: string;
  /** New: the file extension callers should use when writing to cache. */
  audio_format: 'mp3' | 'wav';
  /** Kept for backward compatibility — Google TTS MP3 has no fixed sample rate at this layer. */
  sample_rate: number;
}

// ─── Wavy persona ─────────────────────────────────────────────────────────────
//
// Wavy is the chat assistant inside Accentify. The persona is deliberately
// minimal: just identity, two on-demand skills (pronunciation breakdown +
// app info), and format rules for TTS playback. We do NOT push every reply
// toward language learning — Wavy chats naturally and only switches into
// "tutor mode" when the user explicitly asks.

const WAVY_PERSONA = [
  "You are Wavy, the chat assistant inside Accentify — a mobile app that helps people practice their English through pronunciation, vocabulary, and conversation exercises with progress and streak tracking.",
  "Be a friendly, relaxed conversation partner. Answer whatever the user asks naturally. Do not steer every reply toward language learning — just have a normal conversation.",
  "If the user asks how to pronounce a word, give an inline phonetic breakdown using simple syllable-with-stress format: capitalize the stressed syllable, hyphenate the rest. Example: 'entrepreneur = AHN-truh-pruh-NUR'. Don't use IPA or ARPAbet symbols.",
  "If the user asks about the app, briefly explain Accentify's features: pronunciation, vocabulary, and conversation exercises; daily streaks; weekly progress charts; a personalized study path based on their CEFR level.",
  "Format: keep replies short (1-3 sentences is the norm). Plain prose only — no markdown, bullet points, asterisks, code blocks, or emojis. Your reply may be read aloud by a TTS engine.",
].join(' ');

function buildSystemMessages(_opts: {
  cefrLevel?: string;
  learnerName?: string;
}): GroqChatMessage[] {
  // We accept cefrLevel/learnerName so callers don't need to change, but the
  // current persona intentionally ignores them — Wavy chats freely and only
  // helps with English when asked.
  return [{ role: 'system', content: WAVY_PERSONA }];
}

// ─── Endpoint wrappers ────────────────────────────────────────────────────────

/**
 * Lightweight health check used by controllers on mount to prewarm the
 * previous HF Space. Groq/Google have no cold-start, so this is a no-op,
 * but we keep the export to avoid breaking callers.
 */
export async function convoHealth(): Promise<unknown> {
  return { ok: true };
}

/**
 * Trim a history array to the most recent N messages. Used by both
 * conversationText and conversationAudio to keep payloads bounded.
 */
function trimHistory(
  history?: ConversationHistoryMessage[],
): ConversationHistoryMessage[] {
  if (!history?.length) return [];
  return history.slice(-CONVERSATION_HISTORY_LIMIT);
}

/**
 * Send a typed message and get back a tutor reply. Used by Wavy Chat.
 *
 * `learnerName` is the learner's full name (we extract first name internally)
 * so Wavy can address them naturally.
 *
 * `history` is the prior conversation (user + assistant turns, oldest first).
 * Pass everything except the current user message — that goes in `text`.
 */
export async function conversationText(
  text: string,
  cefrLevel?: string,
  learnerName?: string,
  history?: ConversationHistoryMessage[],
): Promise<ConversationTextResponse> {
  try {
    const reply = await groqChat({
      messages: [
        ...buildSystemMessages({ cefrLevel, learnerName }),
        ...trimHistory(history),
        { role: 'user', content: text },
      ],
      maxTokens: 256,
    });
    return { input_text: text, response_text: reply };
  } catch (e) {
    throw wrapError(e);
  }
}

/**
 * Tutor voice-chat flow: STT → LLM → TTS.
 *
 *   1. Groq Whisper transcribes the learner's recording.
 *   2. Groq Llama generates a tutor reply, shaped by the CEFR system prompt.
 *   3. Google TTS turns the reply into MP3 audio (base64).
 *
 * Steps 2 + 3 run in parallel with the rest only after step 1 finishes — we
 * need the transcription before asking the LLM. We DO NOT speak the audio
 * if the transcription is empty (silence).
 */
export async function conversationAudio(input: {
  audioUri: string;
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm';
  cefrLevel?: string;
  learnerName?: string;
  /** Prior conversation turns (excluding the current spoken one). */
  history?: ConversationHistoryMessage[];
}): Promise<ConversationAudioResponse> {
  try {
    const transcription = await groqTranscribe({
      audioUri: input.audioUri,
      encoding: input.encoding,
      language: 'en',
    });

    if (!transcription) {
      // No speech detected — short-circuit before billing an LLM + TTS call.
      return {
        transcription: '',
        response_text: "I didn't catch that. Try speaking a bit louder and closer to the mic.",
        audio_base64: '',
        audio_format: 'mp3',
        sample_rate: 0,
      };
    }

    const replyText = await groqChat({
      messages: [
        ...buildSystemMessages({ cefrLevel: input.cefrLevel, learnerName: input.learnerName }),
        ...trimHistory(input.history),
        { role: 'user', content: transcription },
      ],
      maxTokens: 256,
    });

    const tts = await googleTtsSynthesize({ text: replyText });

    return {
      transcription,
      response_text: replyText,
      audio_base64: tts.audioBase64,
      audio_format: tts.audioFormat,
      sample_rate: 0,
    };
  } catch (e) {
    throw wrapError(e);
  }
}
