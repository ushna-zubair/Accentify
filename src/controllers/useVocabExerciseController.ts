/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * useVocabExerciseController.ts
 *
 * Drives the synonym-typing vocabulary exercise:
 *   - Loads a batch of words for the user — either from the lesson's
 *     `vocabularyWordIds` field, or via CEFR-band selection keyed off
 *     `userProfile.studyPlan.englishLevel`.
 *   - Manages the current card + text input + submission state.
 *   - Validates the typed synonym via `checkSynonym` (case-insensitive,
 *     1-edit typo tolerance, min 4-char fuzzy guard).
 *   - Persists every attempt through `recordVocabAttempt` so the daily
 *     activity log, summary, attempts history, per-item rolling stats,
 *     and streak all stay in sync.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import { fetchVocabularyWordIdsForLesson } from '../services/lessonService';
import {
  fetchWordsByIds,
  fetchWeightedBandSession,
  fetchSpacedRepetitionWords,
  normaliseCefr,
} from '../services/vocabularyService';
import { recordVocabAttempt } from '../services/progressService';
import { onExerciseComplete } from '../services/progressService';
import { checkSynonym } from '../utils/synonymMatch';
import type { VocabularyWord, VocabAttemptResult, CefrLevel } from '../models/vocabulary';

const SESSION_SIZE = 10;
/** How many of those 10 cards are reserved for spaced-repetition review. */
const SPACED_REPETITION_CAP = 3;

export interface VocabSessionStats {
  total: number;
  correct: number;
  wrong: number;
}

export interface UseVocabExerciseController {
  loading: boolean;
  error: string | null;
  /** Whole batch for this session (after load completes). */
  words: VocabularyWord[];
  /** Word the user is currently looking at (or null when session done). */
  currentWord: VocabularyWord | null;
  currentIndex: number;
  totalWords: number;
  /** Controlled value of the synonym text input. */
  inputValue: string;
  /** Set after `submit()` until `next()` clears it. */
  lastResult: VocabAttemptResult | null;
  /** True between submit() and next() — UI shows the result overlay. */
  hasSubmitted: boolean;
  /** True while persisting an attempt. */
  isSubmitting: boolean;
  sessionStats: VocabSessionStats;
  /** True when the user has worked through every card in the batch. */
  isSessionComplete: boolean;
  /** The CEFR level used to pick this batch — handy for the UI header. */
  cefrLevel: CefrLevel;

  setInput: (v: string) => void;
  submit: () => Promise<void>;
  next: () => void;
}

export const useVocabExerciseController = (lessonId: string): UseVocabExerciseController => {
  const { userProfile } = useAuth();
  // `UserProfile` is a lightweight projection — `studyPlan` lives on the
  // full Firestore user doc but isn't surfaced on the public type. Other
  // screens (PronunciationExerciseScreen, HomeWordPronunciationScreen) use
  // the same `as any` cast, so we follow that convention here.
  const rawEnglishLevel = (userProfile as any)?.studyPlan?.englishLevel as string | undefined;
  const cefrLevel = useMemo<CefrLevel>(() => normaliseCefr(rawEnglishLevel), [rawEnglishLevel]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [lastResult, setLastResult] = useState<VocabAttemptResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionStats, setSessionStats] = useState<VocabSessionStats>({
    total: 0,
    correct: 0,
    wrong: 0,
  });

  // Track when the current card was first shown — used for durationMs.
  const cardStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Lesson-linked words take precedence.
        let batch: VocabularyWord[] = [];
        if (lessonId) {
          try {
            const ids = await fetchVocabularyWordIdsForLesson(lessonId);
            if (ids.length > 0) {
              batch = await fetchWordsByIds(ids);
            }
          } catch (e) {
            console.warn('[VocabExercise] lesson word lookup failed:', e);
          }
        }

        // 2. CEFR-band fallback — weighted band sampling + spaced-repetition
        //    review tail prepended.
        if (batch.length === 0) {
          const uid = auth.currentUser?.uid;
          const reviewWords = uid
            ? await fetchSpacedRepetitionWords(uid, SPACED_REPETITION_CAP)
            : [];

          const excludeIds = new Set(reviewWords.map((w) => w.id));
          const fresh = await fetchWeightedBandSession(
            cefrLevel,
            SESSION_SIZE - reviewWords.length,
            excludeIds,
          );

          batch = [...reviewWords, ...fresh];
        }

        if (cancelled) return;
        setWords(batch);
        setCurrentIndex(0);
        setInputValue('');
        setLastResult(null);
        setHasSubmitted(false);
        setSessionStats({ total: 0, correct: 0, wrong: 0 });
        cardStartedAtRef.current = Date.now();
      } catch (e) {
        if (cancelled) return;
        console.error('[VocabExercise] load error:', e);
        setError(e instanceof Error ? e.message : 'Failed to load words');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [lessonId, cefrLevel]);

  const currentWord = words[currentIndex] ?? null;
  const isSessionComplete = !loading && words.length > 0 && currentIndex >= words.length;

  const submit = useCallback(async () => {
    if (!currentWord || hasSubmitted || isSubmitting) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const match = checkSynonym(trimmed, currentWord.acceptableSynonyms);
    const result: VocabAttemptResult = {
      isCorrect: match.correct,
      userAnswer: trimmed,
      matchedSynonym: match.matched ?? null,
      fuzzy: !!match.fuzzy,
      correctAnswer: currentWord.primarySynonym || currentWord.acceptableSynonyms[0] || '',
    };
    setLastResult(result);
    setHasSubmitted(true);
    setSessionStats((s) => ({
      total: s.total + 1,
      correct: s.correct + (result.isCorrect ? 1 : 0),
      wrong: s.wrong + (result.isCorrect ? 0 : 1),
    }));

    // ── Persist ──
    const uid = auth.currentUser?.uid;
    if (uid) {
      setIsSubmitting(true);
      try {
        await recordVocabAttempt(uid, {
          wordId: currentWord.id,
          prompt: currentWord.word,
          userAnswer: trimmed,
          matchedSynonym: result.matchedSynonym,
          isCorrect: result.isCorrect,
          cefrLevel: currentWord.cefrLevel,
          durationMs: Date.now() - cardStartedAtRef.current,
        });
      } catch (e) {
        console.warn('[VocabExercise] recordVocabAttempt failed:', e);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [currentWord, hasSubmitted, isSubmitting, inputValue]);

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      const nextIdx = i + 1;
      if (nextIdx >= words.length) {
        // Session done — fire the standard "exercise complete" pipeline.
        // IMPORTANT: pass wordsLearned: 0 to avoid double-counting. The daily
        // `vocabWordsLearned`, `vocabAttempts`, `vocabCorrect`, summary
        // counters, and streak are all already updated per-attempt by
        // `recordVocabAttempt`. We still call onExerciseComplete to fire the
        // weekly re-aggregation, lesson completion, and admin analytics.
        const uid = auth.currentUser?.uid;
        if (uid) {
          onExerciseComplete(uid, 'vocab', { wordsLearned: 0 }).catch((e) =>
            console.warn('[VocabExercise] onExerciseComplete failed:', e),
          );
        }
      }
      return nextIdx;
    });
    setInputValue('');
    setLastResult(null);
    setHasSubmitted(false);
    cardStartedAtRef.current = Date.now();
  }, [words.length]);

  return {
    loading,
    error,
    words,
    currentWord,
    currentIndex,
    totalWords: words.length,
    inputValue,
    lastResult,
    hasSubmitted,
    isSubmitting,
    sessionStats,
    isSessionComplete,
    cefrLevel,
    setInput: setInputValue,
    submit,
    next,
  };
};
