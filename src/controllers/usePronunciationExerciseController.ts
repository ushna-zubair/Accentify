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
import {
  fetchSentences,
  transcribeAndEvaluate,
  detectAudioEncoding,
  type TranscribeResult,
} from '../services/pronunciationService';
import {
  health as warmupAccentify,
  AccentifyApiError,
  feedbackSentence,
} from '../services/accentifyApi';
import { ensureWavUri } from '../services/audioConvert';
import type {
  PronunciationScore,
  WordResult,
  PronunciationAttemptResult,
  PronunciationSentence,
} from '../models';
import { onExerciseComplete, recordPronunciationAttempt } from '../services/progressService';
import { COMPLETE_THRESHOLD_PCT, PRACTICE_THRESHOLD_PCT } from '../config/scoring';
import { levenshtein, normalize } from '../utils/stringUtils';

// ═══════════════════════════════════════════════
//  DEFAULT SENTENCES (used while loading from backend)
// ═══════════════════════════════════════════════

const DEFAULT_SENTENCES: PronunciationSentence[] = [
  {
    text: 'Joe went to play soccer with his friends but he ended up staying at home and play video games',
    difficulty: 'easy',
  },
  {
    text: 'Sophie wanted to study for her exam, but she ended up watching her favorite TV series all evening.',
    difficulty: 'medium',
  },
  {
    text: 'Hannah planned to finish her science project on Saturday, so she spent the afternoon working at the library.',
    difficulty: 'hard',
  },
];

const SUCCESS_MESSAGES = [
  'Well-Done!!!',
  'Almost there\nKeep it up!',
  'Good Job!!!',
  'Great Job!!!',
  'Excellent!!!',
];

const FEEDBACK_TEMPLATES = [
  {
    threshold: 0,
    templates: [
      'Not quite! Emphasize the "{word}" part make the E sound clearer and stronger. Try saying it slowly: {phonetic}.',
      'Close! Focus on the word "{word}" — the vowel sounds need more clarity. Repeat it slowly.',
      'Almost there! The word "{word}" needs a crisper pronunciation. Break it into syllables.',
    ],
  },
];

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Strip punctuation, normalize for comparison */
/** Simple phonetic approximation for feedback */
const toPhonetic = (word: string): string => {
  const map: Record<string, string> = {
    play: 'pley',
    soccer: 'sah-ker',
    friends: 'frendz',
    but: 'buht',
    games: 'gaymz',
    staying: 'stay-ing',
    ended: 'en-ded',
    video: 'vih-dee-oh',
    study: 'stuh-dee',
    exam: 'ig-zam',
    watching: 'wah-ching',
    favorite: 'fay-vuh-rit',
    evening: 'eev-ning',
    planned: 'pland',
    morning: 'mor-ning',
    sleeping: 'slee-ping',
    science: 'sy-uhns',
    project: 'prah-jekt',
    saturday: 'sa-ter-day',
    afternoon: 'af-ter-noon',
    library: 'ly-breh-ree',
    hannah: 'ha-nuh',
    finish: 'fi-nish',
    working: 'wer-king',
  };
  return map[word.toLowerCase()] ?? word.toLowerCase();
};

/**
 * Compare transcript words against target sentence.
 * Returns per-word results along with a score and feedback.
 */
const evaluatePronunciation = (
  target: string,
  transcript: string,
): { wordResults: WordResult[]; score: PronunciationScore; feedback: string } => {
  const targetWords = target.split(/\s+/).filter(Boolean);
  const transcriptWords = transcript.split(/\s+/).filter(Boolean);

  let matched = 0;
  const wordResults: WordResult[] = targetWords.map((tw, i) => {
    const nTarget = normalize(tw);
    const nTranscript = normalize(transcriptWords[i] ?? '');
    if (!nTarget) return { word: tw, isCorrect: true };

    const dist = levenshtein(nTarget, nTranscript);
    const threshold = nTarget.length <= 3 ? 0 : Math.ceil(nTarget.length * 0.3);
    const correct = dist <= threshold;
    if (correct) matched++;
    return { word: tw, isCorrect: correct };
  });

  const ratio = targetWords.length > 0 ? matched / targetWords.length : 0;

  // Generate scores based on match ratio
  const accuracy = Math.round(ratio * 100);
  const clarity = Math.round(Math.min(100, accuracy + (Math.random() * 10 - 5)));
  const fluency = Math.round(Math.min(100, accuracy + (Math.random() * 15 - 7)));
  const overall = Math.round((clarity + accuracy + fluency) / 3);
  const score: PronunciationScore = { clarity, accuracy, fluency, overall };

  // Generate feedback referring to the first mispronounced word
  const firstWrong = wordResults.find((wr) => !wr.isCorrect);
  let feedback = '';
  if (firstWrong) {
    const w = normalize(firstWrong.word);
    const ph = toPhonetic(w);
    feedback = `Not quite! Emphasize the "${w}" part make the E sound clearer and stronger. Try saying it slowly: ${ph}.`;
  }

  return { wordResults, score, feedback };
};

// transcribeAudio has been replaced by the Cloud Function `transcribeAndEvaluate`
// via pronunciationService.ts — see stopRecording below.

// ═══════════════════════════════════════════════
//  CONTROLLER HOOK
// ═══════════════════════════════════════════════

export type PronunciationPhase = 'idle' | 'recording' | 'processing' | 'result';

export const usePronunciationExerciseController = (
  lessonId: string,
  englishLevel?: string,
) => {
  // ── State ──
  const [sentences, setSentences] = useState<PronunciationSentence[]>(DEFAULT_SENTENCES);
  const [sentenceIds, setSentenceIds] = useState<(string | undefined)[]>([]);
  const [sentenceSapi, setSentenceSapi] = useState<(string[] | undefined)[]>([]);
  const [sentencesLoading, setSentencesLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PronunciationPhase>('idle');
  const [result, setResult] = useState<PronunciationAttemptResult | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [allScores, setAllScores] = useState<PronunciationScore[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // ── Audio recorder (expo-audio) ──
  const audioRecorder = useAudioRecorder(WAV2VEC2_RECORDING_OPTIONS);
  // Mirror the recorder in a ref so the unmount cleanup below stops the
  // CURRENT recorder instance — `useAudioRecorder` may return a new instance
  // on re-renders, and the cleanup closure would otherwise hold the original
  // (now-released) recorder, leaving the microphone locked on iOS.
  const recorderRef = useRef(audioRecorder);
  recorderRef.current = audioRecorder;

  // ── Refs ──
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);

  // ── Derived ──
  const sentence = sentences[currentIndex];
  const totalSentences = sentences.length;
  const isLastSentence = currentIndex >= totalSentences - 1;

  // ── Load sentences from the Accentify service (warm up the Space in parallel) ──
  useEffect(() => {
    let cancelled = false;
    // Fire-and-forget warm-up so the first evaluation isn't slowed by a
    // Hugging Face Space cold start. Failure is non-fatal.
    warmupAccentify().catch(() => {});
    (async () => {
      try {
        const data = await fetchSentences(undefined, 3, englishLevel);
        if (!cancelled && data.length > 0) {
          setSentences(
            data.map((s) => ({ text: s.text, difficulty: s.difficulty })),
          );
          setSentenceIds(data.map((s) => s.id));
          setSentenceSapi(data.map((s) => s.sapi));
        }
      } catch {
        // Fall back to DEFAULT_SENTENCES already in state
      } finally {
        if (!cancelled) setSentencesLoading(false);
      }
    })();
    return () => { cancelled = true; };
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

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      try {
        const r = recorderRef.current;
        if (r?.isRecording) {
          r.stop().catch(() => {});
        }
      } catch {
        // AudioRecorder native object may already be released
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  // ── Start recording ──
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
        // Recorder may already be prepared or was released — ignore
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
      console.error('[Pronunciation] startRecording:', e);
      setError('Failed to start recording');
    }
  }, [audioRecorder]);

  // ── Stop recording & process via Cloud Function ──
  const stopRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;
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

      // Reject obvious silence/mic-failure before we hit the API at all.
      if (recordingDurationRef.current < 800) {
        setError('That recording was too short — hold the button and read the whole sentence.');
        setPhase('idle');
        return;
      }

      let wordResults: WordResult[];
      let score: PronunciationScore;
      let feedback: string;
      let isCorrect: boolean;
      let evaluation: TranscribeResult;

      try {
        // The HF backend's libsndfile decoder only handles WAV/FLAC/OGG, so
        // anything other than iOS LinearPCM (m4a from Android, webm from web)
        // is converted to WAV via the convertAudioToWav Cloud Function first.
        // After conversion we treat the upload as 'wav' for the rest of the
        // pipeline.
        const sourceEncoding = detectAudioEncoding(uri);
        const wavUri = await ensureWavUri(uri, sourceEncoding);
        const encoding = 'wav' as const;
        evaluation = await transcribeAndEvaluate(
          wavUri,
          sentence.text,
          sentenceIds[currentIndex],
          encoding,
          sentenceSapi[currentIndex],
        );

        // If every reference word was deleted (op='D'), the model heard
        // nothing recognizable — don't render that as a score.
        const heardCount = evaluation.rawWords?.filter((w) => w.op !== 'D').length ?? 0;
        if (heardCount === 0 && (evaluation.rawWords?.length ?? 0) > 0) {
          setError(
            "We couldn't hear your voice clearly — try again somewhere quieter or speak a little louder.",
          );
          setPhase('idle');
          return;
        }

        wordResults = evaluation.wordResults;
        score = evaluation.score;
        feedback = evaluation.feedback;
        isCorrect = evaluation.isCorrect;

        // Enrich wordResults with raw API per-word data
        wordResults = evaluation.rawWords
          ? evaluation.rawWords.map((rw) => ({
              word: rw.ref,
              isCorrect: rw.op === 'M' && rw.pronunciation_score >= 0.6,
              asr: rw.asr,
              op: rw.op,
              pronunciationScore: rw.pronunciation_score,
            }))
          : evaluation.wordResults;

        // Ask the model for natural-language coaching feedback. Empty string
        // from the helper means the endpoint isn't deployed — keep the local
        // rule-based feedback we already have.
        if (!isCorrect) {
          const remote = await feedbackSentence({
            reference_text: sentence.text,
            audioUri: wavUri,
            encoding,
            sapi: sentenceSapi[currentIndex],
          }).catch(() => '');
          if (remote) feedback = remote;
        }
      } catch (apiErr: unknown) {
        console.error('[Pronunciation] evaluation failed:', apiErr);
        const friendly =
          apiErr instanceof AccentifyApiError
            ? apiErr.userMessage
            : apiErr instanceof Error
              ? apiErr.message
              : 'Could not evaluate your recording. Please try again.';
        setError(friendly);
        setPhase('idle');
        return;
      }

      const attemptResult: PronunciationAttemptResult = {
        isCorrect,
        wordResults,
        feedback: isCorrect ? '' : feedback,
        successMessage: isCorrect ? pickRandom(SUCCESS_MESSAGES) : '',
        score,
        transcript: evaluation.transcript,
        rawWordCorrectness: evaluation.rawWordCorrectness,
        rawOverall: evaluation.rawOverall,
      };

      // Show the result immediately — user doesn't need to wait for Firestore.
      setResult(attemptResult);
      setAttemptCount((c) => c + 1);
      setAllScores((prev) => [...prev, score]);
      setPhase('result');

      // ── Firestore progress writes — fire-and-forget, never block the result UI ──
      const uid = auth.currentUser?.uid;
      if (uid) {
        const writes: Promise<unknown>[] = [];

        if (lessonId) {
          writes.push(
            setDoc(
              doc(db, 'users', uid, 'lessons', lessonId),
              { totalAttempts: increment(1), lastAttemptAt: Timestamp.now(), status: 'in_progress' },
              { merge: true },
            ),
          );
        }

        if (attemptResult.score.overall >= PRACTICE_THRESHOLD_PCT) {
          writes.push(
            recordPronunciationAttempt(uid, {
              itemType: 'sentence',
              reference: sentence.text,
              score: attemptResult.score,
              durationSec: Math.round(recordingDurationRef.current / 1000),
            }),
          );
        }

        Promise.all(writes).catch((e) =>
          console.warn('[Pronunciation] background progress write failed:', e),
        );
      }
    } catch (e: unknown) {
      console.error('[Pronunciation] stopRecording:', e);
      setError(e instanceof Error ? e.message : 'Failed to process recording');
      setPhase('idle');
    }
  }, [
    audioRecorder,
    sentence,
    currentIndex,
    attemptCount,
    lessonId,
    sentenceIds,
    sentenceSapi,
  ]);

  // ── Try Again ──
  const tryAgain = useCallback(() => {
    setResult(null);
    setPhase('idle');
    setRecordingDuration(0);
  }, []);

  // ── Next sentence ──
  const next = useCallback(() => {
    if (currentIndex < totalSentences - 1) {
      setCurrentIndex((i) => i + 1);
      setResult(null);
      setPhase('idle');
      setRecordingDuration(0);
      setAttemptCount(0);
    }
  }, [currentIndex, totalSentences]);

  // ── Complete exercise (mark finished in Firestore + update progress) ──
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
      console.error('[Pronunciation] completeExercise failed:', e);
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
    // Data
    sentence,
    currentIndex,
    totalSentences,
    isLastSentence,
    phase,
    result,
    timer,
    recordingDuration,
    allScores,
    error,
    sentencesLoading,
    completing,
    // Actions
    startRecording,
    stopRecording,
    tryAgain,
    next,
    completeExercise,
  };
};

// ── Average score helper ──
const computeAverage = (scores: PronunciationScore[]): PronunciationScore => {
  if (!scores.length) return { clarity: 0, accuracy: 0, fluency: 0, overall: 0 };
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
