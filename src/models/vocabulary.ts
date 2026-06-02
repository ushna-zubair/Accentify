/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

//
// These types back the new vocabulary module where the user is shown a word
// and types a synonym. They are independent of the legacy `VocabWordPair`
// types in lessons.ts (used by the older pronunciation-pair screen and the
// admin lesson editor — kept for backward compatibility, not used here).

import type { Timestamp } from 'firebase/firestore';

/** CEFR level as stored on `users/{uid}.studyPlan.englishLevel`. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_ORDER: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/**
 * A single vocabulary word entry in the `vocabularyWords/{wordId}` collection.
 * Curated by admins; consumed by the VocabExerciseScreen.
 */
export interface VocabularyWord {
  id: string;
  /** The prompt word shown to the learner, e.g. "happy". */
  word: string;
  cefrLevel: CefrLevel;
  /** e.g. "adjective", "verb", "noun". Free-form for now. */
  partOfSpeech: string;
  /** Plain-English definition; revealed on a wrong answer or hint tap. */
  definition: string;
  /** Optional example sentence using `word`. */
  example?: string;
  /**
   * Canonical list of accepted synonyms. Case-insensitive matching is applied
   * by `checkSynonym`; the user only has to type ONE of these correctly.
   */
  acceptableSynonyms: string[];
  /**
   * The synonym shown to the learner when they get it wrong. Pick a clean,
   * representative one for didactic value (not just `acceptableSynonyms[0]`).
   */
  primarySynonym: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  createdBy?: string;
}

/**
 * Outcome of evaluating a single typed answer. Returned by the controller
 * to the screen so it can render the green-check / red-X overlay.
 */
export interface VocabAttemptResult {
  isCorrect: boolean;
  /** The raw text the user typed (after trim). */
  userAnswer: string;
  /** Which acceptable synonym matched (original casing), or null on wrong. */
  matchedSynonym: string | null;
  /** True iff the match needed typo-tolerance. */
  fuzzy: boolean;
  /** The primary synonym to reveal — useful both on correct and wrong. */
  correctAnswer: string;
}

/**
 * Per-attempt record persisted to `users/{uid}/progress/attempts/entries/{id}`.
 * Mirrors the shape of the existing pronunciation attempts (see progress.ts).
 */
export interface VocabularyAttempt {
  itemType: 'vocab';
  wordId: string;
  prompt: string;
  userAnswer: string;
  matchedSynonym: string | null;
  isCorrect: boolean;
  cefrLevel: CefrLevel;
  durationMs: number;
  createdAt: string;
}
