import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { VocabWordPair, VocabExerciseData, SpeechRecognitionResult } from '../models';
import { onExerciseComplete } from '../services/progressService';

// ═══════════════════════════════════════════════
//  SAMPLE WORD PAIRS (fallback)
// ═══════════════════════════════════════════════

const SAMPLE_WORD_PAIRS: VocabWordPair[] = [
  {
    id: 'wp_1',
    basicWord: 'Understand',
    vocabWord: 'Comprehend',
    basicPhonetic: 'Uhn-dun-stand',
    vocabPhonetic: 'Kom-pruh-hend',
    basicDefinition:
      'To "understand" is to know the meaning or significance of something',
    vocabDefinition:
      'To comprehend means to mentally grasp the complete nature or meaning of something',
    exampleSentence: 'She comprehends the complexity of the situation.',
  },
  {
    id: 'wp_2',
    basicWord: 'Help',
    vocabWord: 'Assist',
    basicPhonetic: 'H-alp',
    vocabPhonetic: 'Uh-sist',
    basicDefinition:
      'To "help" is to assist or make it easier for someone to do something',
    vocabDefinition:
      'To assist means to give support or aid to someone in an action or effort',
    exampleSentence: 'The nurse will assist the doctor during surgery.',
  },
  {
    id: 'wp_3',
    basicWord: 'Look Closely',
    vocabWord: 'Scrutinize',
    basicPhonetic: 'Luk-Klow-slee',
    vocabPhonetic: 'Skroo-tuh-nize',
    basicDefinition:
      'To "look closely" means to examine something carefully and in detail',
    vocabDefinition:
      'To scrutinize means to examine or inspect closely and thoroughly with critical attention',
    exampleSentence: 'The auditor will scrutinize every transaction.',
  },
];

const DEFAULT_EXERCISE: VocabExerciseData = {
  lessonId: '',
  title: 'Vocab Growth',
  wordPairs: [],
  currentIndex: 0,
  totalPairs: 0,
};

// ═══════════════════════════════════════════════
//  PRONUNCIATION FEEDBACK HELPERS
// ═══════════════════════════════════════════════

/** Simple phonetic approximation of a word (placeholder for real IPA engine) */
const toPhonetic = (word: string): string => {
  const PHONETIC_MAP: Record<string, string> = {
    understand: 'Uhn-dun-stand',
    comprehend: 'Kom-pruh-hend',
    help: 'H-alp',
    assist: 'Uh-sist',
    'look closely': 'Luk-Klow-slee',
    scrutinize: 'Skroo-tuh-nize',
  };
  return PHONETIC_MAP[word.toLowerCase()] ?? word;
};

/** Pick a random success message for correct attempts */
const SUCCESS_MESSAGES = [
  'Well Done!!!',
  'Keep it up!!!',
  'Excellent!!!',
  'Great Job!!!',
  'Awesome!!!',
];
const pickSuccessMessage = (): string =>
  SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];

/**
 * Compute a simple Levenshtein distance between two strings.
 * Used for fuzzy pronunciation matching.
 */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
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

/** Generate human-readable pronunciation feedback */
const generateFeedback = (
  targetWord: string,
  transcript: string,
  isCorrect: boolean,
): string => {
  if (isCorrect) {
    const praises = [
      'Well done, keep up the good work!',
      'Perfect pronunciation!',
      'Excellent! You nailed it!',
      'Great job, spot on!',
    ];
    return praises[Math.floor(Math.random() * praises.length)];
  }

  // Generate specific feedback based on common mispronunciation patterns
  const target = targetWord.toLowerCase();
  const spoken = transcript.toLowerCase();

  if (!spoken || spoken === 'unclear') {
    return `Try saying "${targetWord}" more clearly. Speak slowly and emphasize each syllable.`;
  }

  // Check first letter
  if (spoken[0] !== target[0]) {
    return `Almost! Try a deeper pronunciation of the letter ${target[0].toUpperCase()} in the beginning and don't emphasize the ${spoken[0].toUpperCase()} as much`;
  }

  // Check ending
  if (spoken.slice(-2) !== target.slice(-2)) {
    return `Good start! Focus on the ending — try to finish with "${target.slice(-3)}" more clearly.`;
  }

  // Middle section
  return `Close! Pay attention to the middle syllables. Try breaking it down: "${toPhonetic(targetWord)}"`;
};

// ═══════════════════════════════════════════════
//  WHISPER API PLACEHOLDER
// ═══════════════════════════════════════════════

/**
 * ┌─────────────────────────────────────────────────────┐
 * │  PLACEHOLDER: Whisper / HuggingFace STT Integration │
 * ├─────────────────────────────────────────────────────┤
 * │  Replace this function with your actual API call     │
 * │  to the HuggingFace Inference API (Whisper model).   │
 * │                                                     │
 * │  Expected flow:                                     │
 * │  1. Record audio via expo-av (done in controller)   │
 * │  2. Send audio file/blob to HuggingFace endpoint    │
 * │  3. Receive transcription text                      │
 * │  4. Compare with both basic + vocab target words    │
 * │  5. Return enriched SpeechRecognitionResult          │
 * │                                                     │
 * │  API endpoint (example):                            │
 * │  POST https://api-inference.huggingface.co/models/  │
 * │       openai/whisper-large-v3                       │
 * │  Headers: Authorization: Bearer <HF_TOKEN>          │
 * │  Body: audio file (binary)                          │
 * └─────────────────────────────────────────────────────┘
 */

// TODO: Replace with your HuggingFace API key
const HF_API_TOKEN = '';

// TODO: Replace with your preferred Whisper model endpoint
const WHISPER_API_URL =
  'https://api-inference.huggingface.co/models/openai/whisper-large-v3';

/**
 * Send recorded audio to Whisper API for speech-to-text.
 * Evaluates pronunciation of BOTH the basic and vocab words.
 *
 * @param audioUri - Local file URI of the recorded audio
 * @param pair     - The VocabWordPair being practised
 * @returns SpeechRecognitionResult with per-word feedback
 */
export const transcribeAudio = async (
  audioUri: string,
  pair: VocabWordPair,
): Promise<SpeechRecognitionResult> => {
  // ─── PLACEHOLDER IMPLEMENTATION ───
  if (!HF_API_TOKEN) {
    console.warn(
      '[Whisper] No HF_API_TOKEN set. Using mock transcription. ' +
        'Set your token in useVocabExerciseController.ts to enable real STT.',
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: basic word almost always correct, vocab word ~50%
    const basicCorrect = Math.random() > 0.15;
    const vocabCorrect = Math.random() > 0.5;
    const isCorrect = basicCorrect && vocabCorrect;

    const basicTranscript = basicCorrect
      ? pair.basicWord.toLowerCase()
      : pair.basicWord.toLowerCase().slice(0, -1) + 'x';
    const vocabTranscript = vocabCorrect
      ? pair.vocabWord.toLowerCase()
      : pair.vocabWord.toLowerCase().replace(pair.vocabWord[0], 'X');

    return {
      transcript: `${basicTranscript} ${vocabTranscript}`,
      confidence: isCorrect ? 0.92 : 0.45,
      isCorrect,
      basicAttemptPhonetic: basicCorrect
        ? pair.basicPhonetic
        : pair.basicPhonetic.replace(/-/g, '-') + 'x',
      basicCorrect,
      basicFeedback: generateFeedback(pair.basicWord, basicTranscript, basicCorrect),
      vocabAttemptPhonetic: vocabCorrect
        ? pair.vocabPhonetic
        : pair.vocabPhonetic.replace(/^./, 'X'),
      vocabCorrect,
      vocabFeedback: generateFeedback(pair.vocabWord, vocabTranscript, vocabCorrect),
    };
  }

  // ─── REAL API CALL (uncomment when HF_API_TOKEN is set) ───
  /*
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const result = await response.json();
    const transcript = (result.text ?? '').trim().toLowerCase();

    // Split transcript — user is expected to say both words
    const words = transcript.split(/\s+/);
    const basicSpoken = words[0] ?? '';
    const vocabSpoken = words.slice(1).join(' ') || words[0] || '';

    const basicTarget = pair.basicWord.toLowerCase();
    const vocabTarget = pair.vocabWord.toLowerCase();

    const basicCorrect =
      basicSpoken === basicTarget ||
      levenshtein(basicSpoken, basicTarget) <= 2;
    const vocabCorrect =
      vocabSpoken === vocabTarget ||
      levenshtein(vocabSpoken, vocabTarget) <= 2;

    return {
      transcript,
      confidence: result.confidence ?? 0.8,
      isCorrect: basicCorrect && vocabCorrect,
      basicAttemptPhonetic: toPhonetic(basicSpoken),
      basicCorrect,
      basicFeedback: generateFeedback(pair.basicWord, basicSpoken, basicCorrect),
      vocabAttemptPhonetic: toPhonetic(vocabSpoken),
      vocabCorrect,
      vocabFeedback: generateFeedback(pair.vocabWord, vocabSpoken, vocabCorrect),
    };
  } catch (error: any) {
    console.error('[Whisper] API call failed:', error);
    return {
      transcript: '',
      confidence: 0,
      isCorrect: false,
      basicAttemptPhonetic: '',
      basicCorrect: false,
      basicFeedback: 'Could not process audio. Please try again.',
      vocabAttemptPhonetic: '',
      vocabCorrect: false,
      vocabFeedback: 'Could not process audio. Please try again.',
    };
  }
  */

  // Fallback (should not reach here if real API is uncommented)
  return {
    transcript: '',
    confidence: 0,
    isCorrect: false,
    basicAttemptPhonetic: '',
    basicCorrect: false,
    basicFeedback: 'API not configured.',
    vocabAttemptPhonetic: '',
    vocabCorrect: false,
    vocabFeedback: 'API not configured.',
  };
};

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const useVocabExerciseController = (lessonId: string) => {
  const [exercise, setExercise] = useState<VocabExerciseData>(DEFAULT_EXERCISE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showDefinition, setShowDefinition] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<SpeechRecognitionResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // ── Audio recorder (expo-audio) ──
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Audio refs
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Current word pair
  const currentPair: VocabWordPair | null =
    exercise.wordPairs[exercise.currentIndex] ?? null;

  // ── Fetch exercise data ──
  const fetchExercise = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let wordPairs: VocabWordPair[] = [];

      // Try Firestore
      try {
        const pairsRef = collection(db, 'lessons', lessonId, 'vocabPairs');
        const pairsSnap = await getDocs(pairsRef);

        if (!pairsSnap.empty) {
          wordPairs = pairsSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              basicWord: data.basicWord ?? '',
              vocabWord: data.vocabWord ?? '',
              basicPhonetic: data.basicPhonetic ?? '',
              vocabPhonetic: data.vocabPhonetic ?? '',
              basicDefinition: data.basicDefinition ?? data.definition ?? '',
              vocabDefinition: data.vocabDefinition ?? data.definition ?? '',
              exampleSentence: data.exampleSentence,
            };
          });
        }
      } catch (e: any) {
        // Permission errors are expected if rules aren't deployed yet
        if (e?.code !== 'permission-denied' && !e?.message?.includes('permissions')) {
          console.warn('[VocabExercise] Firestore fetch warning:', e.message);
        }
      }

      // Fallback to sample data
      if (wordPairs.length === 0) {
        wordPairs = SAMPLE_WORD_PAIRS;
      }

      // Get user progress for this lesson
      let currentIndex = 0;
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const progressSnap = await getDoc(
            doc(db, 'users', uid, 'lessons', lessonId),
          );
          if (progressSnap.exists()) {
            currentIndex = progressSnap.data().vocabIndex ?? 0;
          }
        } catch {
          // ignore
        }
      }

      // Clamp index
      if (currentIndex >= wordPairs.length) currentIndex = 0;

      setExercise({
        lessonId,
        title: 'Vocab Growth',
        wordPairs,
        currentIndex,
        totalPairs: wordPairs.length,
      });
    } catch (e: any) {
      console.error('[VocabExercise] fetchExercise error:', e);
      setError(e.message ?? 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchExercise();
    return () => {
      // Cleanup
      try {
        if (audioRecorder.isRecording) {
          audioRecorder.stop().catch(() => {});
        }
      } catch {
        // AudioRecorder native object may already be released
      }
    };
  }, [fetchExercise]);

  // ── Toggle definition visibility ──
  const toggleDefinition = useCallback(() => {
    setShowDefinition((prev) => !prev);
  }, []);

  // ── Audio: Play pronunciation ──
  const playPronunciation = useCallback(
    async (word: string) => {
      // Placeholder — integrate with TTS (e.g., expo-speech or Google TTS)
      console.log('[VocabExercise] Play pronunciation for:', word);
      // import * as Speech from 'expo-speech';
      // Speech.speak(word, { language: 'en-US', rate: 0.8 });
    },
    [],
  );

  // ── Audio: Start recording ──
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request permissions
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required');
        return;
      }

      // Configure audio mode
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Start recording
      try {
        await audioRecorder.prepareToRecordAsync();
      } catch {
        // Recorder may already be prepared or was released — ignore
      }
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 100);
      }, 100);
    } catch (e: any) {
      console.error('[VocabExercise] startRecording error:', e);
      setError('Failed to start recording');
    }
  }, [audioRecorder]);

  // ── Audio: Stop recording & process ──
  const stopRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;

    try {
      // Stop duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      setIsRecording(false);
      setIsProcessing(true);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
      });

      if (!uri) {
        setError('Recording failed — no audio captured');
        setIsProcessing(false);
        return;
      }

      if (!currentPair) {
        setIsProcessing(false);
        return;
      }

      // Send to Whisper API for transcription with full pair context
      const result = await transcribeAudio(uri, currentPair);

      setLastResult(result);
      setAttemptCount((prev) => prev + 1);
      setSuccessMessage(result.isCorrect ? pickSuccessMessage() : '');

      // Save attempt to Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const attemptId = `${currentPair.id}_${Date.now()}`;
          await setDoc(
            doc(db, 'users', uid, 'lessons', lessonId, 'attempts', attemptId),
            {
              wordPairId: currentPair.id,
              basicWord: currentPair.basicWord,
              vocabWord: currentPair.vocabWord,
              transcript: result.transcript,
              confidence: result.confidence,
              isCorrect: result.isCorrect,
              basicCorrect: result.basicCorrect,
              basicAttemptPhonetic: result.basicAttemptPhonetic,
              basicFeedback: result.basicFeedback,
              vocabCorrect: result.vocabCorrect,
              vocabAttemptPhonetic: result.vocabAttemptPhonetic,
              vocabFeedback: result.vocabFeedback,
              attemptNumber: attemptCount + 1,
              attemptedAt: new Date().toISOString(),
            },
          );

          // Update attempt count on the user's lesson doc
          await setDoc(
            doc(db, 'users', uid, 'lessons', lessonId),
            {
              totalAttempts: increment(1),
              lastAttemptAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch {
          // Non-critical — don't block UX
        }
      }
    } catch (e: any) {
      console.error('[VocabExercise] stopRecording error:', e);
      setError('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  }, [currentPair, lessonId, attemptCount]);

  // ── Try again (clear result, ready for re-recording) ──
  const tryAgain = useCallback(() => {
    setLastResult(null);
    setRecordingDuration(0);
    setSuccessMessage('');
  }, []);

  // ── Navigate to next word pair ──
  const nextPair = useCallback(async () => {
    const nextIndex = exercise.currentIndex + 1;

    if (nextIndex >= exercise.totalPairs) {
      // Exercise complete — mark lesson as completed
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await setDoc(
            doc(db, 'users', uid, 'lessons', lessonId),
            {
              status: 'completed',
              completedAt: new Date().toISOString(),
              vocabIndex: 0,
            },
            { merge: true },
          );

          // Update progress summary
          try {
            const summaryRef = doc(db, 'users', uid, 'progress', 'summary');
            const summarySnap = await getDoc(summaryRef);
            if (summarySnap.exists()) {
              const data = summarySnap.data();
              await updateDoc(summaryRef, {
                completedLessons: (data.completedLessons ?? 0) + 1,
              });
            }
          } catch {
            // Non-critical
          }

          // Update progress: streak, daily activity, weekly aggregation
          await onExerciseComplete(uid, 'vocab', {
            wordsLearned: exercise.totalPairs,
          });
        } catch {
          // ignore
        }
      }

      return true;
    }

    // Save current index to Firestore
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(
          doc(db, 'users', uid, 'lessons', lessonId),
          { vocabIndex: nextIndex, status: 'in_progress' },
          { merge: true },
        );
      } catch {
        // ignore
      }
    }

    setExercise((prev) => ({ ...prev, currentIndex: nextIndex }));
    setShowDefinition(false);
    setLastResult(null);
    setRecordingDuration(0);
    setAttemptCount(0);
    setSuccessMessage('');

    return false;
  }, [exercise.currentIndex, exercise.totalPairs, lessonId]);

  // ── Navigate to previous word pair ──
  const prevPair = useCallback(() => {
    if (exercise.currentIndex <= 0) return;
    setExercise((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    setShowDefinition(false);
    setLastResult(null);
    setRecordingDuration(0);
    setAttemptCount(0);
    setSuccessMessage('');
  }, [exercise.currentIndex]);

  return {
    exercise,
    currentPair,
    loading,
    error,
    showDefinition,
    isRecording,
    isProcessing,
    lastResult,
    recordingDuration,
    attemptCount,
    successMessage,
    toggleDefinition,
    playPronunciation,
    startRecording,
    stopRecording,
    tryAgain,
    nextPair,
    prevPair,
  };
};
