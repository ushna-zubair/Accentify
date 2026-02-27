import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { VocabWordPair, VocabExerciseData, SpeechRecognitionResult } from '../models';

// ═══════════════════════════════════════════════
//  SAMPLE WORD PAIRS (fallback)
// ═══════════════════════════════════════════════

const SAMPLE_WORD_PAIRS: VocabWordPair[] = [
  {
    id: 'wp_1',
    basicWord: 'Understands',
    vocabWord: 'Comprehend',
    basicPhonetic: 'Uhn-dun-stand',
    vocabPhonetic: 'Kom-pruh-hend',
    definition:
      'To grasp the meaning, nature, or importance of something. Both words mean to understand, but "comprehend" implies a deeper, fuller understanding.',
    exampleSentence: 'She comprehends the complexity of the situation.',
  },
  {
    id: 'wp_2',
    basicWord: 'Help',
    vocabWord: 'Facilitate',
    basicPhonetic: 'Help',
    vocabPhonetic: 'Fuh-sil-ih-tayt',
    definition:
      'To make something easier or help bring about a result. "Facilitate" is more formal and implies enabling a process.',
    exampleSentence: 'The moderator will facilitate the discussion.',
  },
  {
    id: 'wp_3',
    basicWord: 'Show',
    vocabWord: 'Demonstrate',
    basicPhonetic: 'Shoh',
    vocabPhonetic: 'Dem-uhn-strayt',
    definition:
      'To clearly display, prove, or illustrate something. "Demonstrate" carries a stronger sense of evidence or explanation.',
    exampleSentence: 'The teacher will demonstrate the experiment.',
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
 * │  4. Compare with target word                        │
 * │  5. Return SpeechRecognitionResult                  │
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
 *
 * @param audioUri - Local file URI of the recorded audio
 * @param targetWord - The word the user should have said
 * @returns SpeechRecognitionResult with transcript and correctness
 */
export const transcribeAudio = async (
  audioUri: string,
  targetWord: string,
): Promise<SpeechRecognitionResult> => {
  // ─── PLACEHOLDER IMPLEMENTATION ───
  // This returns a mock result. Replace with actual API call below.

  if (!HF_API_TOKEN) {
    console.warn(
      '[Whisper] No HF_API_TOKEN set. Using mock transcription. ' +
        'Set your token in useVocabExerciseController.ts to enable real STT.',
    );

    // Simulate a small delay as if calling the API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: randomly succeed ~70% of the time
    const mockCorrect = Math.random() > 0.3;
    return {
      transcript: mockCorrect ? targetWord.toLowerCase() : 'unclear',
      confidence: mockCorrect ? 0.92 : 0.35,
      isCorrect: mockCorrect,
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
    const target = targetWord.toLowerCase().trim();

    // Simple word-matching (can be enhanced with fuzzy matching)
    const isCorrect =
      transcript.includes(target) ||
      target.includes(transcript) ||
      levenshteinDistance(transcript, target) <= 2;

    return {
      transcript,
      confidence: result.confidence ?? 0.8,
      isCorrect,
    };
  } catch (error: any) {
    console.error('[Whisper] API call failed:', error);
    return {
      transcript: '',
      confidence: 0,
      isCorrect: false,
    };
  }
  */

  // Fallback (should not reach here if real API is uncommented)
  return { transcript: '', confidence: 0, isCorrect: false };
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

  // Audio refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
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
              definition: data.definition ?? '',
              exampleSentence: data.exampleSentence,
            };
          });
        }
      } catch (e: any) {
        console.warn('[VocabExercise] Firestore fetch warning:', e.message);
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
      stopRecording();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
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
      // Uses expo-av Speech or TTS — placeholder
      // For now, we just log. In production, call a TTS API or use expo-speech.
      console.log('[VocabExercise] Play pronunciation for:', word);

      // TODO: Integrate with a TTS service (e.g., Google TTS, expo-speech)
      // import * as Speech from 'expo-speech';
      // Speech.speak(word, { language: 'en-US', rate: 0.8 });
    },
    [],
  );

  // ── Audio: Start recording ──
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setLastResult(null);

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
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
  }, []);

  // ── Audio: Stop recording & process ──
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      // Stop duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }

      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) {
        setError('Recording failed — no audio captured');
        setIsProcessing(false);
        return;
      }

      // Send to Whisper API for transcription
      const targetWord = currentPair?.vocabWord ?? '';
      const result = await transcribeAudio(uri, targetWord);

      setLastResult(result);

      // Save result to Firestore
      const uid = auth.currentUser?.uid;
      if (uid && currentPair) {
        try {
          await setDoc(
            doc(db, 'users', uid, 'lessons', lessonId, 'attempts', `${currentPair.id}_${Date.now()}`),
            {
              wordPairId: currentPair.id,
              targetWord: currentPair.vocabWord,
              transcript: result.transcript,
              confidence: result.confidence,
              isCorrect: result.isCorrect,
              attemptedAt: new Date().toISOString(),
            },
          );
        } catch {
          // Non-critical
        }
      }
    } catch (e: any) {
      console.error('[VocabExercise] stopRecording error:', e);
      setError('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  }, [currentPair, lessonId]);

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
        } catch {
          // ignore
        }
      }

      // Return flag indicating completion
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

    return false;
  }, [exercise.currentIndex, exercise.totalPairs, lessonId]);

  // ── Navigate to previous word pair ──
  const prevPair = useCallback(() => {
    if (exercise.currentIndex <= 0) return;
    setExercise((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    setShowDefinition(false);
    setLastResult(null);
    setRecordingDuration(0);
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
    toggleDefinition,
    playPronunciation,
    startRecording,
    stopRecording,
    nextPair,
    prevPair,
  };
};
