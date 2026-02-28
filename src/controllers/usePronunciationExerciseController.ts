import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import {
  doc,
  setDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  fetchSentences,
  readAudioAsBase64,
  transcribeAndEvaluate,
  type PronunciationSentenceDTO,
} from '../services/pronunciationService';
import type {
  PronunciationScore,
  WordResult,
  PronunciationAttemptResult,
  PronunciationSentence,
} from '../models';
import { onExerciseComplete } from '../services/progressService';

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
const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-zA-Z0-9']/g, '');

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

/** Levenshtein distance */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
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

export const usePronunciationExerciseController = (lessonId: string) => {
  // ── State ──
  const [sentences, setSentences] = useState<PronunciationSentence[]>(DEFAULT_SENTENCES);
  const [sentenceIds, setSentenceIds] = useState<(string | undefined)[]>([]);
  const [sentencesLoading, setSentencesLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PronunciationPhase>('idle');
  const [result, setResult] = useState<PronunciationAttemptResult | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [allScores, setAllScores] = useState<PronunciationScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Audio recorder (expo-audio) ──
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Refs ──
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──
  const sentence = sentences[currentIndex];
  const totalSentences = sentences.length;
  const isLastSentence = currentIndex >= totalSentences - 1;

  // ── Load sentences from Firestore via Cloud Function ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSentences(undefined, 3);
        if (!cancelled && data.length > 0) {
          setSentences(
            data.map((s) => ({ text: s.text, difficulty: s.difficulty })),
          );
          setSentenceIds(data.map((s) => s.id));
        }
      } catch {
        // Fall back to DEFAULT_SENTENCES already in state
      } finally {
        if (!cancelled) setSentencesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
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
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setPhase('recording');
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((p) => p + 100);
      }, 100);
    } catch (e: any) {
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

      // Read audio file as base64
      const audioBase64 = await readAudioAsBase64(uri);

      // Send to Cloud Function for transcription + evaluation
      const evaluation = await transcribeAndEvaluate(
        audioBase64,
        sentence.text,
        sentenceIds[currentIndex],
      );

      const { wordResults, score, feedback, isCorrect } = evaluation;

      const attemptResult: PronunciationAttemptResult = {
        isCorrect,
        wordResults,
        feedback: isCorrect ? '' : feedback,
        successMessage: isCorrect ? pickRandom(SUCCESS_MESSAGES) : '',
        score,
      };

      setResult(attemptResult);
      setAttemptCount((c) => c + 1);
      setAllScores((prev) => [...prev, score]);
      setPhase('result');

      // ── Update lesson-level progress in Firestore ──
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
          // Non-critical — attempt already stored by Cloud Function
        }
      }
    } catch (e: any) {
      console.error('[Pronunciation] stopRecording:', e);
      setError(e.message ?? 'Failed to process recording');
      setPhase('idle');
    }
  }, [sentence, currentIndex, attemptCount, lessonId, sentenceIds]);

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
  const completeExercise = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const avgScore = computeAverage(allScores);
        await setDoc(
          doc(db, 'users', uid, 'lessons', lessonId),
          {
            status: 'completed',
            completedAt: Timestamp.now(),
            lastScore: avgScore,
          },
          { merge: true },
        );

        // Update progress: streak, daily activity, weekly aggregation
        await onExerciseComplete(uid, 'pronunciation', { score: avgScore });
      } catch {
        // Non-critical
      }
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
    error,
    sentencesLoading,
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
