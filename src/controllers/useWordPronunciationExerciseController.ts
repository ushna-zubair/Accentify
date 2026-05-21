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

const dedupeWords = (words: PromptWordResponse[]): PromptWordResponse[] => {
  const seen = new Set<string>();
  const out: PromptWordResponse[] = [];
  for (const w of words) {
    const key = w.word?.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
};

/**
 * Per-phoneme confidence below this is treated as "not actually heard,"
 * regardless of what the aligner returns. Silence still aligns "perfectly"
 * (the model places each reference phoneme into the audio), so trusting
 * `comparison[i].match` alone reports 100% for silence or wrong-word audio.
 * Cross-checking against `phoneme_details[i].confidence` fixes that.
 */
const PHONEME_CONF_FLOOR = 0.3;

/**
 * Minimum mean phoneme confidence required for a recording to be scored at
 * all. Below this we treat the input as silence / mic-failure and ask the
 * learner to record again instead of returning a misleading score.
 */
const MIN_MEAN_CONFIDENCE = 0.05;

/** Build local rule-based feedback when the model didn't return any. */
const buildLocalWordFeedback = (
  evalRes: EvaluateWordResponse,
  effectiveCmp: PhonemeComparison[],
): string => {
  const missedFromCmp = effectiveCmp
    .filter((c) => !c.match)
    .map((c) => c.ref_arp);
  const missing = [
    ...(evalRes.missing_phones ?? []),
    ...missedFromCmp,
  ].filter(Boolean);
  if (missing.length > 0) {
    const uniq = Array.from(new Set(missing));
    return `Focus on the ${uniq.slice(0, 3).join(', ')} sound${uniq.length > 1 ? 's' : ''} in "${evalRes.word}".`;
  }
  return `Try saying "${evalRes.word}" a little more slowly and clearly.`;
};

const adaptWordResponse = (
  evalRes: EvaluateWordResponse,
  remoteFeedback: string,
): WordAttemptResult => {
  const phDetails = evalRes.phoneme_details ?? [];
  const rawCmp = evalRes.comparison ?? [];
  const total = Math.max(phDetails.length, rawCmp.length);

  // Cross-check the aligner's match flag against the actual per-phoneme
  // confidence. The aligner returns match=true even for silence; requiring
  // confidence >= floor turns the chips red when nothing was really spoken.
  const effectiveCmp: PhonemeComparison[] = rawCmp.map((c, i) => {
    const phConf = phDetails[i]?.confidence ?? c.conf ?? 0;
    return { ...c, match: c.match && phConf >= PHONEME_CONF_FLOOR };
  });

  // Overall = confidence-weighted match ratio. A phoneme contributes its own
  // detection confidence only if it effectively matched; otherwise zero.
  // Silence → all confs ~0 → overall ~0. Wrong word → most don't match → low.
  // Correct word with high confidence → near 100.
  const weightedSum = effectiveCmp.reduce((s, c, i) => {
    const phConf = phDetails[i]?.confidence ?? c.conf ?? 0;
    return s + (c.match ? phConf : 0);
  }, 0);
  const overall = total > 0 ? Math.round((weightedSum / total) * 100) : 0;

  const matchedCount = effectiveCmp.filter((c) => c.match).length;
  const accuracy = total > 0 ? Math.round((matchedCount / total) * 100) : 0;

  const confidences = phDetails.map((p) => p.confidence ?? 0);
  const meanConf = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;
  const clarity = Math.max(0, Math.min(100, Math.round(meanConf * 100)));

  // Fluency for a single word is essentially "did the model recognize this
  // smoothly" — average the alignment score and mean confidence.
  const fluency = Math.max(
    0,
    Math.min(100, Math.round(((evalRes.score ?? 0) + meanConf) * 50)),
  );

  const score: PronunciationScore = { clarity, accuracy, fluency, overall };

  const isCorrect = overall >= COMPLETE_THRESHOLD_PCT;
  const wordResults: WordResult[] = [{ word: evalRes.word, isCorrect }];

  // Merge API-reported missing phones with the ones we downgraded.
  const missingPhones = Array.from(
    new Set([
      ...(evalRes.missing_phones ?? []),
      ...effectiveCmp.filter((c) => !c.match).map((c) => c.ref_arp),
    ]),
  ).filter(Boolean);

  const feedback = isCorrect
    ? ''
    : remoteFeedback || buildLocalWordFeedback(evalRes, effectiveCmp);

  return {
    isCorrect,
    wordResults,
    feedback,
    successMessage: isCorrect ? pickRandom(SUCCESS_MESSAGES) : '',
    score,
    phonemeComparison: effectiveCmp,
    missingPhones,
    referenceArpabet: evalRes.reference ?? '',
    referenceArpabetTokens: evalRes.reference_arpabet ?? [],
    detectedNative: evalRes.detected_native ?? [],
    detectedArpabet: evalRes.detected_arpabet ?? [],
    phonemeDetails: phDetails,
    rawScore: evalRes.score ?? 0,
  };
};

/**
 * Returns a user-facing error if the recording looks like silence/mic-failure,
 * else null. Used to short-circuit scoring before we render a false 100%.
 */
const detectSilentRecording = (
  evalRes: EvaluateWordResponse,
  recordedMs: number,
): string | null => {
  if (recordedMs < 600) {
    return 'That recording was too short — hold the button a bit longer and speak the whole word.';
  }
  const confidences = (evalRes.phoneme_details ?? []).map((p) => p.confidence ?? 0);
  if (confidences.length === 0) return null;
  const meanConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  if (meanConf < MIN_MEAN_CONFIDENCE) {
    return "We couldn't hear your voice clearly — try again somewhere quieter or speak a little louder.";
  }
  return null;
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
    (async () => {
      const level = cefrToWordLevel(englishLevel);
      try {
        const results = await Promise.allSettled(
          Array.from({ length: WORDS_PER_SESSION }, () => promptWord(level)),
        );
        const fulfilled: PromptWordResponse[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value?.word) {
            fulfilled.push(r.value);
          }
        }
        const unique = dedupeWords(fulfilled);
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

        // Reject silent / mic-failure recordings before they become a fake
        // "100% Excellent!" — the aligner reports a perfect score even when
        // the model heard nothing.
        const silenceMsg = detectSilentRecording(
          evaluation,
          recordingDurationRef.current,
        );
        if (silenceMsg) {
          setError(silenceMsg);
          setPhase('idle');
          return;
        }

        // Compute the real overall first (cheap) — only ask for AI coaching
        // feedback when the learner actually needs it.
        const preliminary = adaptWordResponse(evaluation, '');
        let remoteFeedback = '';
        if (preliminary.score.overall < COMPLETE_THRESHOLD_PCT) {
          remoteFeedback = await feedbackWord({
            word: currentWord.word,
            reference: currentWord.reference,
            audioUri: wavUri,
            encoding,
          }).catch(() => '');
        }

        const attemptResult =
          remoteFeedback === ''
            ? preliminary
            : adaptWordResponse(evaluation, remoteFeedback);
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
  }, [audioRecorder, currentWord, lessonId]);

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
