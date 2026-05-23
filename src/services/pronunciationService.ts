/**
 * Frontend service for the pronunciation exercise flow.
 *
 * All evaluation goes through the Accentify model service on Hugging Face
 * (see accentifyApi.ts). Sentence prompts come from the HF /prompt_sentence
 * endpoint by default; if EXPO_PUBLIC_USE_FIRESTORE_SENTENCES is set, they are
 * pulled from the `pronunciation_sentences` Firestore collection instead.
 */
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from '../config/firebase';
import {
  evaluateSentence as evaluateSentenceApi,
  promptSentence as promptSentenceApi,
  type EvaluateSentenceResponse,
  type SentenceWordResult,
} from './accentifyApi';
import { COMPLETE_THRESHOLD_PCT } from '../config/scoring';

/**
 * Best-effort detection of the audio encoding from a recording URI.
 * Expo Audio's HIGH_QUALITY preset produces:
 *   iOS     → .m4a (AAC)
 *   Android → .m4a (AAC) on newer SDKs, .3gp on older ones
 *   Web     → .webm (Opus)
 */
export function detectAudioEncoding(uri: string): 'wav' | 'm4a' | 'mp3' | 'webm' {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.wav')) return 'wav';
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.webm') || lower.includes('webm')) return 'webm';
  return 'm4a';
}

// ─── Types ───

export interface PronunciationSentenceDTO {
  id: string;
  text: string;
  /** CEFR level if known ('A1'..'C2'), otherwise an existing easy/medium/hard tag. */
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
  topic?: string;
  /** Per-word ARPAbet (e.g. ["dh ah", "f aa k s"]); improves /evaluate_sentence alignment. */
  sapi?: string[];
}

export interface TranscribeResult {
  attemptId: string;
  transcript: string;
  wordResults: { word: string; isCorrect: boolean }[];
  score: { clarity: number; accuracy: number; fluency: number; overall: number };
  feedback: string;
  isCorrect: boolean;
  /** Raw per-word results from /evaluate_sentence (op, asr, pronunciation_score, phoneme evaluation). */
  rawWords: SentenceWordResult[];
  /** Raw word_correctness block from /evaluate_sentence. */
  rawWordCorrectness: {
    ref_words: string[];
    matched: number;
    substituted: number;
    missing: number;
    extra_spoken: number;
    extra_tokens: string[];
    word_score: number;
    word_score_pct: number;
  };
  /** Raw overall block from /evaluate_sentence. */
  rawOverall: {
    pronunciation_score: number;
    weighted_overall_score: number;
    scored_words: number;
    skipped_words: number;
  };
}

// ─── Sentence fetching ───

export function difficultyForCefr(level: string | undefined): 'easy' | 'medium' | 'hard' {
  switch ((level ?? '').toUpperCase()) {
    case 'A1':
    case 'A2':
      return 'easy';
    case 'B1':
    case 'B2':
      return 'medium';
    case 'C1':
    case 'C2':
      return 'hard';
    default:
      return 'easy';
  }
}

function useFirestoreSource(): boolean {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string | undefined> | undefined) ??
    {};
  return extra.USE_FIRESTORE_SENTENCES === 'true';
}

async function fetchSentencesFromFirestore(
  difficulty: string | undefined,
  count: number,
): Promise<PronunciationSentenceDTO[]> {
  const col = collection(db, 'pronunciation_sentences');
  const q = difficulty
    ? query(col, where('difficulty', '==', difficulty), orderBy('order'), fsLimit(count))
    : query(col, orderBy('order'), fsLimit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      text: cleanText(data.text ?? data.sentence ?? ''),
      difficulty: (data.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard',
      order: data.order ?? 0,
      topic: data.topic,
      sapi: data.sapi,
    };
  });
}

/** Remove zero-width BOM that appears on some HF Space responses. */
function cleanText(s: string): string {
  return s.replace(/^﻿/, '').trim();
}

/**
 * Pick which CEFR levels to ask the HF Space for, anchored on the learner's
 * own level. Clamped to the user's band (level ± 1) so an A1 learner can't
 * accidentally be served a C2 sentence when the target level has no result.
 */
function levelsForCefr(cefr: string | undefined): string[] {
  const target = (cefr ?? '').toUpperCase();
  const ordered = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const idx = ordered.indexOf(target);
  if (idx === -1) return ['A1', 'A2'];
  // Target first, then exactly ± 1 — no further. Stretch (+1) before review (-1)
  // so the session ends harder than it starts when the target bucket is empty.
  const out: string[] = [target];
  if (idx + 1 < ordered.length) out.push(ordered[idx + 1]);
  if (idx - 1 >= 0) out.push(ordered[idx - 1]);
  return out;
}

async function fetchSentencesFromHF(
  count: number,
  cefrLevel?: string,
): Promise<PronunciationSentenceDTO[]> {
  // /prompt_sentence returns ONE record per call but each record contains
  // multiple sentences. Walk levels (anchored on the learner's CEFR) until we
  // have `count` distinct sentences.
  const levels = levelsForCefr(cefrLevel);
  const out: PronunciationSentenceDTO[] = [];
  for (let li = 0; li < levels.length && out.length < count; li++) {
    try {
      const resp = await promptSentenceApi(levels[li]);
      for (const s of resp.sentences ?? []) {
        if (out.length >= count) break;
        const text = cleanText(s.sentence ?? '');
        if (!text) continue;
        out.push({
          id: `${resp.id}-${out.length}`,
          text,
          difficulty: difficultyForCefr(resp.level),
          order: out.length,
          sapi: s.sapi,
        });
      }
    } catch {
      // Continue to the next level; controller falls back to defaults if all fail.
    }
  }
  return out;
}

/**
 * Fetch pronunciation sentences. Uses the HF /prompt_sentence endpoint by
 * default. Set `extra.USE_FIRESTORE_SENTENCES=true` to read from Firestore
 * instead (requires the `pronunciation_sentences` collection to be populated).
 */
export async function fetchSentences(
  difficulty?: string,
  limit: number = 3,
  cefrLevel?: string,
): Promise<PronunciationSentenceDTO[]> {
  if (useFirestoreSource()) {
    return fetchSentencesFromFirestore(difficulty, limit);
  }
  return fetchSentencesFromHF(limit, cefrLevel);
}

// ─── Result adaptation ───

/** Minimum per-word pronunciation_score that counts the word as "heard well." */
const WORD_PRONUNCIATION_FLOOR = 0.6;

function adaptAccentifyResponse(
  evaluation: EvaluateSentenceResponse,
  attemptId: string,
): TranscribeResult {
  const wordResults = evaluation.words.map((w) => ({
    word: w.ref,
    isCorrect: w.op === 'M' && w.pronunciation_score >= WORD_PRONUNCIATION_FLOOR,
  }));

  // Confidence-aware overall: average of word-match% and the mean
  // pronunciation_score of words the model actually heard ('M' op). Silence
  // gives every word op='D' → meanHeard=0 and wordPct=0 → overall=0, which
  // avoids the "silence scored 100%" alignment artefact we hit on the word
  // endpoint.
  const heardScores = evaluation.words
    .filter((w) => w.op === 'M')
    .map((w) => w.pronunciation_score);
  const meanHeard = heardScores.length
    ? heardScores.reduce((a, b) => a + b, 0) / heardScores.length
    : 0;
  const wordPct = evaluation.word_correctness?.word_score_pct ?? 0;
  const overallPct = Math.round((wordPct + meanHeard * 100) / 2);

  // Clarity = average pronunciation confidence of heard words (0 for silence).
  const clarityPct = Math.round(meanHeard * 100);
  // Fluency = honesty-weighted average of API's pronunciation_score and our
  // overall — keeps the original API signal visible without being its dupe.
  const apiPronPct = Math.round((evaluation.overall?.pronunciation_score ?? 0) * 100);
  const fluencyPct = Math.round((apiPronPct + overallPct) / 2);

  const worst = [...evaluation.words]
    .filter((w) => w.op !== 'D')
    .sort((a, b) => a.pronunciation_score - b.pronunciation_score)[0];
  const feedback =
    overallPct >= COMPLETE_THRESHOLD_PCT
      ? ''
      : worst && worst.pronunciation_score < 0.7
        ? `Focus on "${worst.ref}" — try saying it more slowly and emphasize each syllable.`
        : 'Slow down and enunciate each word clearly.';

  return {
    attemptId,
    transcript: evaluation.words.map((w) => w.asr).join(' '),
    wordResults,
    score: {
      clarity: clarityPct,
      accuracy: Math.round(wordPct),
      fluency: fluencyPct,
      overall: overallPct,
    },
    feedback,
    isCorrect: overallPct >= COMPLETE_THRESHOLD_PCT,
    rawWords: evaluation.words,
    rawWordCorrectness: evaluation.word_correctness,
    rawOverall: evaluation.overall,
  };
}

/**
 * Send the recorded audio file to the HF /evaluate_sentence endpoint and
 * return a controller-friendly result. The audio is uploaded as multipart
 * form-data (no base64 round-trip).
 *
 * @param audioUri      Local file URI returned by expo-audio's `audioRecorder.uri`.
 * @param targetText    Reference sentence to score against.
 * @param attemptId     Optional attempt identifier (passed through to the result).
 * @param encoding      Audio container (auto-detected via detectAudioEncoding).
 * @param sapi          Optional per-word ARPAbet — improves alignment when known.
 */
export async function transcribeAndEvaluate(
  audioUri: string,
  targetText: string,
  attemptId?: string,
  encoding: 'wav' | 'm4a' | 'mp3' | 'webm' = 'm4a',
  sapi?: string[],
): Promise<TranscribeResult> {
  const evaluation = await evaluateSentenceApi({
    reference_text: targetText,
    audioUri,
    encoding,
    sapi,
  });
  return adaptAccentifyResponse(evaluation, attemptId ?? 'local');
}
