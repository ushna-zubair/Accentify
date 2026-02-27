import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type {
  ChatMessage,
  PronunciationScore,
  PronunciationExerciseData,
} from '../models';

// ═══════════════════════════════════════════════
//  PRONUNCIATION PROMPTS
// ═══════════════════════════════════════════════

const PRONUNCIATION_PROMPTS = [
  {
    text: 'The weather is beautiful today, isn\'t it?',
    difficulty: 'easy',
    focusAreas: ['intonation', 'contractions'],
  },
  {
    text: 'She sells seashells by the seashore.',
    difficulty: 'medium',
    focusAreas: ['sibilants', 'tongue twisters'],
  },
  {
    text: 'I would have gone to the party if I had known about it.',
    difficulty: 'medium',
    focusAreas: ['conditional', 'reduced forms'],
  },
  {
    text: 'The technology revolutionized communication worldwide.',
    difficulty: 'hard',
    focusAreas: ['multisyllabic', 'word stress'],
  },
  {
    text: 'Peter Piper picked a peck of pickled peppers.',
    difficulty: 'hard',
    focusAreas: ['plosives', 'tongue twister'],
  },
];

const AI_GREETINGS = [
  "Hi! I'm your AI pronunciation coach. Let's practice together! 🎤",
  "Welcome! Ready to improve your pronunciation? Let's start! 🎯",
  "Hello! Let's work on your English pronunciation today! 🗣️",
];

const AI_TRANSITION_MESSAGES = [
  "Great effort! Let's try the next one.",
  "Good work! Here's your next sentence to practice.",
  "Nice! Ready for another one?",
  "Well done! Let's keep going.",
];

// ═══════════════════════════════════════════════
//  SCORE GENERATION (placeholder for real API)
// ═══════════════════════════════════════════════

const generateMockScore = (): PronunciationScore => {
  const clarity = Math.floor(Math.random() * 30) + 65; // 65-95
  const accuracy = Math.floor(Math.random() * 30) + 60; // 60-90
  const fluency = Math.floor(Math.random() * 30) + 55; // 55-85
  const overall = Math.round((clarity + accuracy + fluency) / 3);
  return { clarity, accuracy, fluency, overall };
};

const generateFeedback = (score: PronunciationScore, prompt: string): string => {
  if (score.overall >= 85) {
    return 'Excellent pronunciation! Your clarity and rhythm are spot on. Keep up the great work!';
  }
  if (score.overall >= 70) {
    if (score.clarity < score.accuracy) {
      return 'Good job! Try to enunciate each word more clearly, especially the consonant sounds.';
    }
    if (score.fluency < score.accuracy) {
      return 'Nice accuracy! Work on speaking more smoothly — try not to pause between words.';
    }
    return 'Good work! Focus on maintaining a natural rhythm and stress pattern.';
  }
  if (score.accuracy < 65) {
    return 'Keep practicing! Try saying each word slowly first, then gradually speed up. Focus on the vowel sounds.';
  }
  return 'Almost there! Listen to the native pronunciation and try to match the rhythm and intonation.';
};

const createMessageId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ═══════════════════════════════════════════════
//  WHISPER API PLACEHOLDER
// ═══════════════════════════════════════════════

const HF_API_TOKEN = '';

/**
 * Transcribe audio and evaluate pronunciation against a target sentence.
 * Placeholder that returns mock results.
 */
const transcribeAndScore = async (
  audioUri: string,
  targetSentence: string,
): Promise<{ transcript: string; score: PronunciationScore; feedback: string }> => {
  if (!HF_API_TOKEN) {
    // Mock implementation
    await new Promise((r) => setTimeout(r, 1500));

    const score = generateMockScore();
    const feedback = generateFeedback(score, targetSentence);

    // Simulate a transcript (slightly imperfect for realism)
    const words = targetSentence.split(' ');
    const transcript = words
      .map((w) => (Math.random() > 0.85 ? w.toLowerCase() + '...' : w.toLowerCase()))
      .join(' ');

    return { transcript, score, feedback };
  }

  // Real API call (uncomment when HF_API_TOKEN is set)
  /*
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HF_API_TOKEN}` },
        body: formData,
      },
    );

    if (!response.ok) throw new Error(`Whisper API error: ${response.status}`);

    const result = await response.json();
    const transcript = (result.text ?? '').trim();

    // Compare transcript with target
    const score = scoreTranscript(transcript, targetSentence);
    const feedback = generateFeedback(score, targetSentence);

    return { transcript, score, feedback };
  } catch (error: any) {
    console.error('[Pronunciation] API error:', error);
    return {
      transcript: '',
      score: { clarity: 0, accuracy: 0, fluency: 0, overall: 0 },
      feedback: 'Could not process audio. Please try again.',
    };
  }
  */

  return {
    transcript: '',
    score: { clarity: 0, accuracy: 0, fluency: 0, overall: 0 },
    feedback: 'API not configured.',
  };
};

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const usePronunciationExerciseController = (lessonId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [sessionScores, setSessionScores] = useState<PronunciationScore[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Audio refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initialize chat with AI greeting + first prompt ──
  const initializeChat = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const greeting = AI_GREETINGS[Math.floor(Math.random() * AI_GREETINGS.length)];
      const firstPrompt = PRONUNCIATION_PROMPTS[0];

      const initialMessages: ChatMessage[] = [
        {
          id: createMessageId(),
          role: 'ai',
          text: greeting,
          timestamp: new Date().toISOString(),
        },
        {
          id: createMessageId(),
          role: 'ai',
          text: `Try saying this sentence:\n\n"${firstPrompt.text}"`,
          timestamp: new Date().toISOString(),
          prompt: firstPrompt.text,
        },
      ];

      setMessages(initialMessages);
      setCurrentPrompt(firstPrompt.text);
      setCurrentPromptIndex(0);
    } catch (e: any) {
      console.error('[Pronunciation] Init error:', e);
      setError(e.message ?? 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeChat();
    return () => {
      // Cleanup recording on unmount
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [initializeChat]);

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
      setIsRecording(true);
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 100);
      }, 100);
    } catch (e: any) {
      console.error('[Pronunciation] startRecording error:', e);
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

      setIsRecording(false);
      setIsProcessing(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setError('Recording failed — no audio captured');
        setIsProcessing(false);
        return;
      }

      // Add user message (recording)
      const userMsg: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        text: '🎙️ Audio recorded',
        timestamp: new Date().toISOString(),
        audioUri: uri,
        prompt: currentPrompt,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Process the audio
      const { transcript, score, feedback } = await transcribeAndScore(
        uri,
        currentPrompt,
      );

      // Add AI feedback message
      const feedbackMsg: ChatMessage = {
        id: createMessageId(),
        role: 'ai',
        text: feedback,
        timestamp: new Date().toISOString(),
        score,
        feedback,
      };

      // Update user message with score
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, text: transcript || '🎙️ Audio recorded', score, feedback }
            : m,
        ),
      );

      setMessages((prev) => [...prev, feedbackMsg]);
      setSessionScores((prev) => [...prev, score]);

      // Save to Firestore
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
              prompt: currentPrompt,
              transcript,
              score,
              feedback,
              attemptedAt: Timestamp.now(),
              promptIndex: currentPromptIndex,
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

      // Move to next prompt after a brief delay
      const nextIndex = currentPromptIndex + 1;
      if (nextIndex < PRONUNCIATION_PROMPTS.length) {
        setTimeout(() => {
          const transition =
            AI_TRANSITION_MESSAGES[
              Math.floor(Math.random() * AI_TRANSITION_MESSAGES.length)
            ];
          const nextPrompt = PRONUNCIATION_PROMPTS[nextIndex];

          const transitionMsg: ChatMessage = {
            id: createMessageId(),
            role: 'ai',
            text: `${transition}\n\n"${nextPrompt.text}"`,
            timestamp: new Date().toISOString(),
            prompt: nextPrompt.text,
          };

          setMessages((prev) => [...prev, transitionMsg]);
          setCurrentPrompt(nextPrompt.text);
          setCurrentPromptIndex(nextIndex);
        }, 1000);
      } else {
        // All prompts completed
        setTimeout(() => {
          const avgScore = computeAverageScore([...sessionScores, score]);
          const completionMsg: ChatMessage = {
            id: createMessageId(),
            role: 'ai',
            text: `🎉 Great session! Here's your summary:\n\n` +
              `Clarity: ${avgScore.clarity}%\n` +
              `Accuracy: ${avgScore.accuracy}%\n` +
              `Fluency: ${avgScore.fluency}%\n` +
              `Overall: ${avgScore.overall}%\n\n` +
              (avgScore.overall >= 80
                ? 'Excellent work! Your pronunciation is really improving!'
                : avgScore.overall >= 60
                  ? 'Good progress! Keep practicing to improve further.'
                  : 'Keep at it! Regular practice will make a big difference.'),
            timestamp: new Date().toISOString(),
            score: avgScore,
          };

          setMessages((prev) => [...prev, completionMsg]);
          setIsComplete(true);

          // Save session summary to Firestore
          const uid = auth.currentUser?.uid;
          if (uid) {
            setDoc(
              doc(db, 'users', uid, 'lessons', lessonId),
              {
                status: 'completed',
                completedAt: Timestamp.now(),
                lastScore: avgScore,
              },
              { merge: true },
            ).catch(() => {});
          }
        }, 1200);
      }
    } catch (e: any) {
      console.error('[Pronunciation] stopRecording error:', e);
      setError('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  }, [currentPrompt, currentPromptIndex, lessonId, sessionScores]);

  // ── Retry current prompt ──
  const retryPrompt = useCallback(() => {
    const retryMsg: ChatMessage = {
      id: createMessageId(),
      role: 'ai',
      text: `Let's try again!\n\n"${currentPrompt}"`,
      timestamp: new Date().toISOString(),
      prompt: currentPrompt,
    };
    setMessages((prev) => [...prev, retryMsg]);
    setRecordingDuration(0);
  }, [currentPrompt]);

  // ── Play sample pronunciation (TTS placeholder) ──
  const playSample = useCallback(async (text: string) => {
    console.log('[Pronunciation] Play TTS for:', text);
    // Placeholder — integrate with expo-speech
    // import * as Speech from 'expo-speech';
    // Speech.speak(text, { language: 'en-US', rate: 0.85 });
  }, []);

  return {
    messages,
    loading,
    error,
    isRecording,
    isProcessing,
    recordingDuration,
    currentPrompt,
    currentPromptIndex,
    totalPrompts: PRONUNCIATION_PROMPTS.length,
    isComplete,
    sessionScores,
    startRecording,
    stopRecording,
    retryPrompt,
    playSample,
  };
};

// ── Helpers ──

const computeAverageScore = (scores: PronunciationScore[]): PronunciationScore => {
  if (scores.length === 0) {
    return { clarity: 0, accuracy: 0, fluency: 0, overall: 0 };
  }
  const sum = scores.reduce(
    (acc, s) => ({
      clarity: acc.clarity + s.clarity,
      accuracy: acc.accuracy + s.accuracy,
      fluency: acc.fluency + s.fluency,
      overall: acc.overall + s.overall,
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
