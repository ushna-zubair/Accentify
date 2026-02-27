import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type {
  PronunciationScore,
  WordResult,
  PronunciationAttemptResult,
  PronunciationSentence,
} from '../models';

// ═══════════════════════════════════════════════
//  SAMPLE SENTENCES
// ═══════════════════════════════════════════════

const SENTENCES: PronunciationSentence[] = [
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

/**
 * Mock STT — returns the target text with some words randomly altered.
 * In production, replace with Whisper / Google STT API call.
 */
const transcribeAudio = async (
  _uri: string,
  targetText: string,
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1500));

  const words = targetText.split(/\s+/);
  // ~25 % chance of making a mistake on each word
  const transcript = words
    .map((w) => {
      if (Math.random() < 0.25) {
        // Simulate mis-hearing by mangling the word
        const n = normalize(w);
        if (n.length > 3) return n.slice(0, -2);
        return n + 'x';
      }
      return w;
    })
    .join(' ');

  return transcript;
};

// ═══════════════════════════════════════════════
//  CONTROLLER HOOK
// ═══════════════════════════════════════════════

export type PronunciationPhase = 'idle' | 'recording' | 'processing' | 'result';

export const usePronunciationExerciseController = (lessonId: string) => {
  // ── State ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PronunciationPhase>('idle');
  const [result, setResult] = useState<PronunciationAttemptResult | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [allScores, setAllScores] = useState<PronunciationScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ──
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──
  const sentence = SENTENCES[currentIndex];
  const totalSentences = SENTENCES.length;
  const isLastSentence = currentIndex >= totalSentences - 1;

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
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  // ── Start recording ──
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setPhase('recording');
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((p) => p + 100);
      }, 100);
    } catch (e: any) {
      console.error('[Pronunciation] startRecording:', e);
      setError('Failed to start recording');
    }
  }, []);

  // ── Stop recording & process ──
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      setPhase('processing');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setError('Recording failed — no audio captured');
        setPhase('idle');
        return;
      }

      // Transcribe
      const transcript = await transcribeAudio(uri, sentence.text);

      // Evaluate
      const { wordResults, score, feedback } = evaluatePronunciation(
        sentence.text,
        transcript,
      );

      // On "Try Again" give progressively better results (mock)
      const boostedScore: PronunciationScore =
        attemptCount > 0
          ? {
              clarity: Math.min(100, score.clarity + attemptCount * 12),
              accuracy: Math.min(100, score.accuracy + attemptCount * 15),
              fluency: Math.min(100, score.fluency + attemptCount * 10),
              overall: Math.min(
                100,
                score.overall + attemptCount * 12,
              ),
            }
          : score;

      const isCorrect = boostedScore.overall >= 70;

      // If boosted to correct, mark all words correct
      const finalWordResults: WordResult[] = isCorrect
        ? wordResults.map((wr) => ({ ...wr, isCorrect: true }))
        : wordResults;

      const attemptResult: PronunciationAttemptResult = {
        isCorrect,
        wordResults: finalWordResults,
        feedback: isCorrect ? '' : feedback,
        successMessage: isCorrect ? pickRandom(SUCCESS_MESSAGES) : '',
        score: boostedScore,
      };

      setResult(attemptResult);
      setAttemptCount((c) => c + 1);
      setAllScores((prev) => [...prev, boostedScore]);
      setPhase('result');

      // ── Firestore ──
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await addDoc(
            collection(
              db,
              'users',
              uid,
              'lessons',
              lessonId,
              'pronunciationAttempts',
            ),
            {
              sentenceIndex: currentIndex,
              sentence: sentence.text,
              transcript,
              score: boostedScore,
              isCorrect,
              feedback: attemptResult.feedback,
              attemptedAt: Timestamp.now(),
            },
          );

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
    } catch (e: any) {
      console.error('[Pronunciation] stopRecording:', e);
      setError('Failed to process recording');
      setPhase('idle');
    }
  }, [sentence, currentIndex, attemptCount, lessonId]);

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

  // ── Complete exercise (mark finished in Firestore) ──
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
