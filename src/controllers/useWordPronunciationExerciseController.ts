/**
 * Controller for the word-level pronunciation exercise.
 *
 * Mirrors usePronunciationExerciseController but works against the HF
 * /prompt_word + /evaluate_word + /feedback_word endpoints so we can score
 * single-word recordings with a phoneme-level breakdown.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useAudioRecorder,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { WAV2VEC2_RECORDING_OPTIONS } from '../utils/audioRecording';
import {
  doc,
  setDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { detectAudioEncoding } from '../services/pronunciationService';
import {
  health as warmupAccentify,
  feedbackHealth as warmupAccentifyFeedback,
  promptWord,
  evaluateWord,
  feedbackWord,
  AccentifyApiError,
  type PromptWordResponse,
  type EvaluateWordResponse,
  type PhonemeComparison,
  type PhonemeDetail,
} from '../services/accentifyApi';
import { ensureWavUri } from '../services/audioConvert';
import type {
  PronunciationScore,
  PronunciationAttemptResult,
  WordResult,
} from '../models';
import { onExerciseComplete, recordPronunciationAttempt } from '../services/progressService';
import { COMPLETE_THRESHOLD_PCT, PRACTICE_THRESHOLD_PCT } from '../config/scoring';

export type WordPronunciationPhase = 'idle' | 'recording' | 'processing' | 'result';

export interface WordAttemptResult extends PronunciationAttemptResult {
  /** Per-phoneme alignment from /evaluate_word.comparison */
  phonemeComparison: PhonemeComparison[];
  /** Reference phonemes the model did not detect in the recording. */
  missingPhones: string[];
  /** ARPAbet reference shown under the word card. */
  referenceArpabet: string;
  /** Reference ARPAbet phoneme array from API (e.g. ["B","R","IH","NG"]). */
  referenceArpabetTokens: string[];
  /** Native IPA phonemes detected by the model (e.g. ["b","ɹ","ɪ","ŋ"]). */
  detectedNative: string[];
  /** ARPAbet phonemes detected by the model (e.g. ["B","R","IH","NG"]). */
  detectedArpabet: string[];
  /** Per-phoneme confidence details from the model. */
  phonemeDetails: PhonemeDetail[];
  /** Raw phoneme-match score (0–1) from the API. */
  rawScore: number;
}

const DEFAULT_WORDS: PromptWordResponse[] = [
  { word: 'BRING', reference: 'B R IH NG', level: 1 },
  { word: 'GARDEN', reference: 'G AA R D AH N', level: 2 },
  { word: 'HAPPY', reference: 'HH AE P IY', level: 2 },
  { word: 'PROBABLY', reference: 'P R AA B AH B L IY', level: 3 },
  { word: 'TOGETHER', reference: 'T UH G EH DH ER', level: 3 },
];

const SUCCESS_MESSAGES = [
  'Excellent!',
  'Nailed it!',
  'Perfect!',
  'Great job!',
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Map a CEFR level string (or undefined) to the HF /prompt_word level (1–9). */
const cefrToWordLevel = (level?: string): number => {
  switch ((level ?? '').toUpperCase()) {
    case 'A1':
      return 1;
    case 'A2':
      return 2;
    case 'B1':
      return 3;
    case 'B2':
      return 5;
    case 'C1':
      return 7;
    case 'C2':
      return 9;
    default:
      return 2;
  }
};

const WORDS_PER_SESSION = 5;

/**
 * Pick per-card word levels for the session. Composition matches the vocab
 * weighted band: 20% review (level - 1), 60% target, 20% stretch (level + 1).
 * Levels are clamped to the API's 1-9 integer range — never wider than the
 * user's own band.
 */
const sessionWordLevels = (cefr?: string): number[] => {
  const target = cefrToWordLevel(cefr);
  const review = Math.max(1, target - 1);
  const stretch = Math.min(9, target + 1);
  const slots: number[] = [];
  for (let i = 0; i < WORDS_PER_SESSION; i++) {
    const ratio = i / WORDS_PER_SESSION;
    if (ratio < 0.2) slots.push(review);
    else if (ratio >= 0.8) slots.push(stretch);
    else slots.push(target);
  }
  // Shuffle so the order isn't always review→target→stretch.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
};

/**
 * Words with fewer than this many *letters* aren't useful pronunciation
 * drills — /prompt_word at low CEFR levels returns lots of 2-letter
 * fillers ("OF", "IS", "TO") and punctuation-heavy tokens like "E.'S"
 * (4 chars, 2 letters) that don't exercise any real phonemes. Anything
 * below the floor is dropped client-side and topped up with more API calls.
 */
const MIN_WORD_LENGTH = 4;

/** Letters only — punctuation and apostrophes don't count toward length. */
const letterCount = (word: string): number => word.replace(/[^A-Za-z]/g, '').length;

const dedupeWords = (words: PromptWordResponse[]): PromptWordResponse[] => {
  const seen = new Set<string>();
  const out: PromptWordResponse[] = [];
  for (const w of words) {
    const key = w.word?.toUpperCase();
    if (!key || seen.has(key)) continue;
    if (letterCount(key) < MIN_WORD_LENGTH) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
};

/**
 * Forced-aligner sanity check. The /evaluate_word model occasionally returns
 * score=1.0 even when the speaker said nothing or a completely different word
 * — it aligns the reference phonemes into whatever audio it gets. The reliable
 * cross-signal is `phoneme_details[].confidence`: when the model genuinely
 * heard the word, mean confidence is well above this floor. When the mean is
 * below it, the model wasn't really listening, so we reject the recording
 * instead of trusting the score.
 *
 * 0.25 catches SIVY-style "100% on silence" (mean ~0.17) while still letting
 * legitimate partial attempts through (mean 0.29–0.33 maps to model scores of
 * 62–70%, which we want to surface honestly).
 */
const MIN_MEAN_CONFIDENCE = 0.25;

const detectUnreliableScore = (evalRes: EvaluateWordResponse): string | null => {
  const confidences = (evalRes.phoneme_details ?? []).map((p) => p.confidence ?? 0);
  if (confidences.length === 0) return null;
  const meanConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  if (meanConf < MIN_MEAN_CONFIDENCE) {
    return "We couldn't hear all the sounds clearly — try again somewhere quieter or speak the whole word.";
  }
  return null;
};

/** Build local rule-based feedback when the model didn't return any. */
const buildLocalWordFeedback = (evalRes: EvaluateWordResponse): string => {
  const missing = evalRes.missing_phones ?? [];
  if (missing.length > 0) {
    const uniq = Array.from(new Set(missing));
    return `Focus on the ${uniq.slice(0, 3).join(', ')} sound${uniq.length > 1 ? 's' : ''} in "${evalRes.word}".`;
  }
  return `Try saying "${evalRes.word}" a little more slowly and clearly.`;
};

/**
 * The API's `score` is alignment-based — it can return 1.0 even when a
 * phoneme bar on the result screen reads 10% acoustic confidence (the
 * model "matched" the reference to a span it didn't actually hear).
 * We dock the score so the headline number agrees with the bars: every
 * phoneme below this confidence floor counts as a missed phoneme. 0.15
 * catches the cases users complain about (HUNK with AH at 10.3%, SMOG
 * with AA at 1.6%) while leaving solidly-heard phonemes alone.
 */
const PHONEME_CONFIDENCE_FLOOR = 0.15;

/**
 * Hard ceiling on the docking penalty so a recording where every phoneme
 * reads low-confidence doesn't crater to 0%. The API's alignment still
 * carries some signal even when the absolute confidences are low.
 */
const MAX_CONFIDENCE_PENALTY = 0.5;

const adaptWordResponse = (
  evalRes: EvaluateWordResponse,
  remoteFeedback: string,
): WordAttemptResult => {
  const phDetails = evalRes.phoneme_details ?? [];
  const comparison = evalRes.comparison ?? [];

  // Confidence-adjusted score: the API's `score` is alignment-based and
  // ignores acoustic confidence, so we apply a penalty proportional to the
  // fraction of phonemes that fell below the floor (capped so "every
  // phoneme low" recordings don't crater to zero).
  const rawScore = evalRes.score ?? 0;
  const totalPhonemes = phDetails.length || 1;
  const lowConfCount = phDetails.filter(
    (p) => (p.confidence ?? 0) < PHONEME_CONFIDENCE_FLOOR,
  ).length;
  const confidencePenalty = Math.min(
    MAX_CONFIDENCE_PENALTY,
    lowConfCount / totalPhonemes,
  );
  const adjustedScore = rawScore * (1 - confidencePenalty);
  const overall = Math.round(adjustedScore * 100);
  const score: PronunciationScore = {
    clarity: overall,
    accuracy: overall,
    fluency: overall,
    overall,
  };

  // Success/failure comes from the confidence-adjusted score so the verdict
  // matches the per-phoneme bars the user actually sees.
  const isCorrect = adjustedScore >= 1.0;
  const wordResults: WordResult[] = [{ word: evalRes.word, isCorrect }];

  const missingPhones = (evalRes.missing_phones ?? []).filter(Boolean);

  // Always surface coaching feedback when the API returns it. Fall back to the
  // local rule-based tip only when the model didn't say anything AND the
  // attempt wasn't already correct.
  const feedback =
    remoteFeedback || (isCorrect ? '' : buildLocalWordFeedback(evalRes));

  return {
    isCorrect,
    wordResults,
    feedback,
    successMessage: isCorrect ? pickRandom(SUCCESS_MESSAGES) : '',
    score,
    phonemeComparison: comparison,
    missingPhones,
    referenceArpabet: evalRes.reference ?? '',
    referenceArpabetTokens: evalRes.reference_arpabet ?? [],
    detectedNative: evalRes.detected_native ?? [],
    detectedArpabet: evalRes.detected_arpabet ?? [],
    phonemeDetails: phDetails,
    rawScore,
  };
};

export const useWordPronunciationExerciseController = (
  lessonId: string,
  englishLevel?: string,
) => {
  const [words, setWords] = useState<PromptWordResponse[]>(DEFAULT_WORDS);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<WordPronunciationPhase>('idle');
  const [result, setResult] = useState<WordAttemptResult | null>(null);
  const [timer, setTimer] = useState(300);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [allScores, setAllScores] = useState<PronunciationScore[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const audioRecorder = useAudioRecorder(WAV2VEC2_RECORDING_OPTIONS);
  // See usePronunciationExerciseController for why we mirror the recorder.
  const recorderRef = useRef(audioRecorder);
  recorderRef.current = audioRecorder;
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);

  const currentWord = words[currentIndex];
  const totalWords = words.length;
  const isLastWord = currentIndex >= totalWords - 1;

  // ── Load words from /prompt_word (one per call) in parallel ──
  useEffect(() => {
    let cancelled = false;
    warmupAccentify().catch(() => undefined);
    warmupAccentifyFeedback();
    (async () => {
      const slots = sessionWordLevels(englishLevel);
      try {
        // Mix review/target/stretch by issuing one /prompt_word call per slot
        // at the slot's specific level (instead of all 5 at one level).
        const results = await Promise.allSettled(
          slots.map((lvl) => promptWord(lvl)),
        );
        const fulfilled: PromptWordResponse[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.word) {
            fulfilled.push(r.value);
          }
        }
        let unique = dedupeWords(fulfilled);

        // Top-up loop: dedupeWords drops words shorter than MIN_WORD_LENGTH
        // (and duplicates), so a low-level prompt session can come back with
        // too few drills. Refill with parallel /prompt_word calls and
        // escalate the level when a round adds nothing — /prompt_word at
        // level 1 hands back mostly 2-letter fillers ("OF", "IS"), and
        // retrying at the same level just churns through the same bucket.
        const TOP_UP_BUDGET = WORDS_PER_SESSION * 3;
        let escalatedLevel = cefrToWordLevel(englishLevel);
        let attempts = 0;
        while (unique.length < WORDS_PER_SESSION && attempts < TOP_UP_BUDGET) {
          const needed = WORDS_PER_SESSION - unique.length;
          attempts += needed;
          const beforeRound = unique.length;
          const extra = await Promise.allSettled(
            Array.from({ length: needed }, () => promptWord(escalatedLevel)),
          );
          for (const r of extra) {
            if (r.status === 'fulfilled' && r.value?.word) {
              fulfilled.push(r.value);
            }
          }
          unique = dedupeWords(fulfilled);
          if (unique.length === beforeRound) {
            escalatedLevel = Math.min(9, escalatedLevel + 1);
          }
        }

        if (!cancelled && unique.length > 0) {
          setWords(unique);
        }
      } catch {
        // Keep DEFAULT_WORDS
      } finally {
        if (!cancelled) setWordsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [englishLevel]);

  // ── Countdown timer ──
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        const r = recorderRef.current;
        if (r?.isRecording) {
          r.stop().catch(() => undefined);
        }
      } catch {
        // Recorder may already be released
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  /**
   * Replace the current word with a fresh /prompt_word at the user's target
   * level. Used when /evaluate_word rejects the prompt the API itself gave us
   * (e.g. "no valid model tokens for this word") so the user isn't stuck
   * re-recording an unevaluable word. Returns true when the swap succeeded.
   */
  const replaceCurrentWord = useCallback(async (): Promise<boolean> => {
    let level = cefrToWordLevel(englishLevel);
    const existing = new Set(words.map((w) => w.word?.toUpperCase()));
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const fresh = await promptWord(level);
        const key = fresh?.word?.toUpperCase();
        if (!key || letterCount(key) < MIN_WORD_LENGTH || existing.has(key)) {
          // Same level keeps coming back too short — escalate so we don't
          // chase another 2-letter filler in the next try.
          level = Math.min(9, level + 1);
          continue;
        }
        setWords((prev) => {
          const next = [...prev];
          next[currentIndex] = fresh;
          return next;
        });
        return true;
      } catch {
        // Try again until we exhaust the budget.
      }
    }
    return false;
  }, [englishLevel, words, currentIndex]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      try {
        await audioRecorder.prepareToRecordAsync();
      } catch {
        // Already prepared
      }
      audioRecorder.record();
      setPhase('recording');
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      durationTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 100;
        setRecordingDuration(recordingDurationRef.current);
      }, 100);
    } catch (e: unknown) {
      console.error('[WordPronunciation] startRecording:', e);
      setError('Failed to start recording');
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;
    if (!currentWord) return;
    try {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      setPhase('processing');
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false });

      if (!uri) {
        setError('Recording failed — no audio captured');
        setPhase('idle');
        return;
      }

      try {
        // Convert to a 16 kHz mono WAV via the convertAudioToWav Cloud Function
        // so the HF libsndfile decoder accepts it (m4a/webm fail otherwise).
        // iOS LinearPCM input is passed through unchanged.
        const sourceEncoding = detectAudioEncoding(uri);
        const wavUri = await ensureWavUri(uri, sourceEncoding);
        const encoding = 'wav' as const;
        const evaluation = await evaluateWord({
          word: currentWord.word,
          reference: currentWord.reference,
          audioUri: wavUri,
          encoding,
        });

        // Reject recordings where mean phoneme confidence is below the floor
        // — the aligner sometimes returns score=1.0 for silence/wrong words.
        const unreliable = detectUnreliableScore(evaluation);
        if (unreliable) {
          setError(unreliable);
          setPhase('idle');
          return;
        }

        // Wait for the coaching feedback before rendering the result so the
        // score and the Coach tip arrive together. Feedback runs on a
        // separate HF Space — the warmup ping above is what keeps that
        // cold-start cost off the critical path.
        const remoteFeedback = await feedbackWord({
          word: currentWord.word,
          reference_arpabet: evaluation.reference_arpabet ?? [],
          detected_arpabet: evaluation.detected_arpabet ?? [],
        }).catch(() => '');

        const attemptResult = adaptWordResponse(evaluation, remoteFeedback);
        setResult(attemptResult);
        setAttemptCount((c) => c + 1);
        setAllScores((prev) => [...prev, attemptResult.score]);
        setPhase('result');

        const uid = auth.currentUser?.uid;
        if (uid && lessonId) {
          try {
            await setDoc(
              doc(db, 'users', uid, 'lessons', lessonId),
              {
                totalAttempts: increment(1),
                lastAttemptAt: Timestamp.now(),
                status: 'in_progress',
              },
              { merge: true },
            );
          } catch {
            // Non-critical
          }
        }

        if (uid && attemptResult.score.overall >= PRACTICE_THRESHOLD_PCT) {
          try {
            await recordPronunciationAttempt(uid, {
              itemType: 'word',
              reference: currentWord.word,
              score: attemptResult.score,
              durationSec: Math.round(recordingDurationRef.current / 1000),
            });
          } catch (e) {
            console.warn('[WordPronunciation] attempt record failed:', e);
          }
        }
      } catch (apiErr: unknown) {
        console.error('[WordPronunciation] evaluation failed:', apiErr);
        // The API sometimes hands us a /prompt_word that /evaluate_word can't
        // tokenize ("no valid model tokens"/"unknown word"). Re-recording
        // won't help — swap the current word for a fresh one and let the
        // user retry with a word the model can actually score.
        if (
          apiErr instanceof AccentifyApiError &&
          apiErr.code === 'unknown_word'
        ) {
          const replaced = await replaceCurrentWord();
          setError(
            replaced
              ? "We swapped in a different word — the model couldn't score the previous one."
              : "The model couldn't score that word. Try the next one.",
          );
          setPhase('idle');
          return;
        }
        const friendly =
          apiErr instanceof AccentifyApiError
            ? apiErr.userMessage
            : apiErr instanceof Error
              ? apiErr.message
              : 'Could not evaluate your recording. Please try again.';
        setError(friendly);
        setPhase('idle');
      }
    } catch (e: unknown) {
      console.error('[WordPronunciation] stopRecording:', e);
      setError(e instanceof Error ? e.message : 'Failed to process recording');
      setPhase('idle');
    }
  }, [audioRecorder, currentWord, lessonId, replaceCurrentWord]);

  const tryAgain = useCallback(() => {
    setResult(null);
    setPhase('idle');
    setRecordingDuration(0);
  }, []);

  const next = useCallback(() => {
    if (currentIndex < totalWords - 1) {
      setCurrentIndex((i) => i + 1);
      setResult(null);
      setPhase('idle');
      setRecordingDuration(0);
      setAttemptCount(0);
    }
  }, [currentIndex, totalWords]);

  const completeExercise = useCallback(async (): Promise<{
    avgScore: PronunciationScore;
    completedCount: number;
    totalAttempts: number;
  } | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    setCompleting(true);
    try {
      const avgScore = computeAverage(allScores);
      const completedCount = allScores.filter(
        (s) => s.overall >= COMPLETE_THRESHOLD_PCT,
      ).length;
      await setDoc(
        doc(db, 'users', uid, 'lessons', lessonId),
        {
          status: 'completed',
          completedAt: Timestamp.now(),
          lastScore: avgScore,
        },
        { merge: true },
      );
      await onExerciseComplete(uid, 'pronunciation', { score: avgScore });
      return { avgScore, completedCount, totalAttempts: allScores.length };
    } catch (e: unknown) {
      console.error('[WordPronunciation] completeExercise failed:', e);
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save your results. Your progress may be missing — please try again.',
      );
      return null;
    } finally {
      setCompleting(false);
    }
  }, [allScores, lessonId]);

  return {
    word: currentWord,
    currentIndex,
    totalWords,
    isLastWord,
    phase,
    result,
    timer,
    recordingDuration,
    attemptCount,
    allScores,
    error,
    wordsLoading,
    completing,
    startRecording,
    stopRecording,
    tryAgain,
    next,
    completeExercise,
  };
};

const computeAverage = (scores: PronunciationScore[]): PronunciationScore => {
  if (!scores.length) {
    return { clarity: 0, accuracy: 0, fluency: 0, overall: 0 };
  }
  const sum = scores.reduce(
    (a, s) => ({
      clarity: a.clarity + s.clarity,
      accuracy: a.accuracy + s.accuracy,
      fluency: a.fluency + s.fluency,
      overall: a.overall + s.overall,
    }),
    { clarity: 0, accuracy: 0, fluency: 0, overall: 0 },
  );
  return {
    clarity: Math.round(sum.clarity / scores.length),
    accuracy: Math.round(sum.accuracy / scores.length),
    fluency: Math.round(sum.fluency / scores.length),
    overall: Math.round(sum.overall / scores.length),
  };
};
