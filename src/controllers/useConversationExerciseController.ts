import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
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
  ConversationTurn,
  ConversationScenario,
  ConversationMetricsResult,
} from '../models';
import { onExerciseComplete } from '../services/progressService';
import { levenshtein, normalize } from '../utils/stringUtils';

// ═══════════════════════════════════════════════
//  SAMPLE CONVERSATION SCENARIOS
// ═══════════════════════════════════════════════

const SCENARIOS: Record<string, ConversationScenario> = {
  lesson_1: {
    id: 'scenario_1',
    lessonId: 'lesson_1',
    partnerName: 'Sarah',
    learnerName: 'John',
    turns: [
      {
        id: 't1',
        speaker: 'partner',
        text: "Hey John! It's been a while. How have you been?",
        audioDuration: 3200,
        completed: false,
      },
      {
        id: 't2',
        speaker: 'learner',
        text: "I've been great! Work has been busy but I finally got some time off.",
        audioDuration: 4000,
        completed: false,
      },
      {
        id: 't3',
        speaker: 'partner',
        text: "That's awesome! So what have you been up to lately? Any fun plans?",
        audioDuration: 3800,
        completed: false,
      },
      {
        id: 't4',
        speaker: 'learner',
        text: "Actually, I started learning a new language. It's been really fun so far.",
        audioDuration: 4200,
        completed: false,
      },
      {
        id: 't5',
        speaker: 'partner',
        text: "Oh wow, that's really cool! Which language are you learning?",
        audioDuration: 3000,
        completed: false,
      },
      {
        id: 't6',
        speaker: 'learner',
        text: "I'm focusing on improving my English pronunciation and conversational skills.",
        audioDuration: 4500,
        completed: false,
      },
    ],
    backgroundNoiseEnabled: true,
    crowdChatterEnabled: false,
    timeLimitSeconds: 300,
  },
  lesson_2: {
    id: 'scenario_2',
    lessonId: 'lesson_2',
    partnerName: 'David',
    learnerName: 'John',
    turns: [
      {
        id: 't1',
        speaker: 'partner',
        text: "Welcome, John. Please have a seat. Tell me a bit about yourself.",
        audioDuration: 3500,
        completed: false,
      },
      {
        id: 't2',
        speaker: 'learner',
        text: "Thank you, David. I graduated with a degree in Computer Science and I have three years of experience in cybersecurity.",
        audioDuration: 5000,
        completed: false,
      },
      {
        id: 't3',
        speaker: 'partner',
        text: "That's impressive. Can you tell me about a challenging project you've worked on?",
        audioDuration: 3600,
        completed: false,
      },
      {
        id: 't4',
        speaker: 'learner',
        text: "Sure. I led a team to implement a zero-trust security architecture for our company's cloud infrastructure.",
        audioDuration: 5200,
        completed: false,
      },
      {
        id: 't5',
        speaker: 'partner',
        text: "Very interesting. Where do you see yourself in five years?",
        audioDuration: 2800,
        completed: false,
      },
      {
        id: 't6',
        speaker: 'learner',
        text: "I see myself leading a security team and contributing to industry best practices in cybersecurity.",
        audioDuration: 4800,
        completed: false,
      },
    ],
    backgroundNoiseEnabled: false,
    crowdChatterEnabled: false,
    timeLimitSeconds: 300,
  },
  lesson_3: {
    id: 'scenario_3',
    lessonId: 'lesson_3',
    partnerName: 'Alex',
    learnerName: 'John',
    turns: [
      {
        id: 't1',
        speaker: 'partner',
        text: "Hey guys! Great to see you both. What's new?",
        audioDuration: 2800,
        completed: false,
      },
      {
        id: 't2',
        speaker: 'learner',
        text: "Not much! Just finished a really tough week at work. Glad it's the weekend!",
        audioDuration: 4000,
        completed: false,
      },
      {
        id: 't3',
        speaker: 'partner',
        text: "I hear you! Want to grab some food? There's a new pizza place nearby.",
        audioDuration: 3400,
        completed: false,
      },
      {
        id: 't4',
        speaker: 'learner',
        text: "Sounds perfect, I've been meaning to try it. Joe, are you in?",
        audioDuration: 3200,
        completed: false,
      },
      {
        id: 't5',
        speaker: 'partner',
        text: "Definitely! By the way, have you watched that new show everyone's talking about?",
        audioDuration: 3600,
        completed: false,
      },
      {
        id: 't6',
        speaker: 'learner',
        text: "Not yet, but it's on my list. I've heard it's really good!",
        audioDuration: 3500,
        completed: false,
      },
    ],
    backgroundNoiseEnabled: true,
    crowdChatterEnabled: true,
    timeLimitSeconds: 300,
  },
};

// ═══════════════════════════════════════════════
//  PHASE TYPE
// ═══════════════════════════════════════════════

export type ConversationPhase =
  | 'partner_speaking'
  | 'waiting_for_learner'
  | 'recording'
  | 'processing'
  | 'completed';

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

/**
 * Evaluate learner's speech against the expected turn text.
 * Returns metrics (0-100 scale).
 */
const evaluateResponse = (
  expected: string,
  transcript: string,
): ConversationMetricsResult => {
  const expectedWords = expected.split(/\s+/).filter(Boolean);
  const transcriptWords = transcript.split(/\s+/).filter(Boolean);

  let matched = 0;
  expectedWords.forEach((ew, i) => {
    const ne = normalize(ew);
    const nt = normalize(transcriptWords[i] ?? '');
    if (!ne) return;
    const dist = levenshtein(ne, nt);
    const threshold = ne.length <= 3 ? 0 : Math.ceil(ne.length * 0.35);
    if (dist <= threshold) matched++;
  });

  const ratio = expectedWords.length > 0 ? matched / expectedWords.length : 0;
  const fluency = Math.round(Math.min(100, ratio * 100 + Math.random() * 8));
  const vocabulary = Math.round(Math.min(100, ratio * 95 + Math.random() * 10));
  const grammarUsage = Math.round(Math.min(100, ratio * 90 + Math.random() * 12));
  const turnTaking = Math.round(Math.min(100, 70 + ratio * 30));
  const overall = Math.round((fluency + vocabulary + grammarUsage + turnTaking) / 4);

  return { fluency, vocabulary, grammarUsage, turnTaking, overall };
};

/**
 * Mock STT — returns the target text with some words randomly altered.
 * In production, replace with Whisper / Google STT API call.
 */
const transcribeAudio = async (
  _uri: string,
  targetText: string,
): Promise<string> => {
  await new Promise((r) => setTimeout(r, 1200));
  const words = targetText.split(/\s+/);
  return words
    .map((w) => {
      if (Math.random() < 0.15) {
        const n = normalize(w);
        if (n.length > 3) return n.slice(0, -1);
        return n + 'x';
      }
      return w;
    })
    .join(' ');
};

// ═══════════════════════════════════════════════
//  FEEDBACK & TIP GENERATION
// ═══════════════════════════════════════════════

interface ConversationFeedback {
  feedback: string;
  tip: string;
}

const FEEDBACK_TEMPLATES: { minOverall: number; feedback: string }[] = [
  {
    minOverall: 85,
    feedback:
      'Excellent work! Your vocabulary and grammar were strong. You maintained a natural conversational flow throughout.',
  },
  {
    minOverall: 70,
    feedback:
      'You used good basic vocabulary. Next time, try adding advanced connectors like \u201Chowever,\u201D \u201Con the other hand,\u201D or \u201Cactually.\u201D',
  },
  {
    minOverall: 50,
    feedback:
      'You got the main ideas across but could improve fluency. Focus on using complete sentences and linking words between your ideas.',
  },
  {
    minOverall: 0,
    feedback:
      'Keep practicing! Focus on forming complete, clear sentences. Try rehearsing common phrases before the conversation.',
  },
];

const TIP_TEMPLATES: { minOverall: number; tip: string }[] = [
  {
    minOverall: 85,
    tip: 'Try using more idiomatic expressions to sound even more natural in conversation.',
  },
  {
    minOverall: 70,
    tip: 'The sentence \u201CHe go to work\u201D should be \u201CHe goes to work.\u201D',
  },
  {
    minOverall: 50,
    tip: 'Practice using the present continuous tense for actions happening now: \u201CI am working\u201D instead of \u201CI work now.\u201D',
  },
  {
    minOverall: 0,
    tip: 'Start with simple subject-verb-object sentences: \u201CI like coffee.\u201D \u201CShe reads books.\u201D',
  },
];

const generateFeedback = (
  avgMetrics: ConversationMetricsResult,
): ConversationFeedback => {
  const overall = avgMetrics.overall;
  const feedbackEntry =
    FEEDBACK_TEMPLATES.find((f) => overall >= f.minOverall) ??
    FEEDBACK_TEMPLATES[FEEDBACK_TEMPLATES.length - 1];
  const tipEntry =
    TIP_TEMPLATES.find((t) => overall >= t.minOverall) ??
    TIP_TEMPLATES[TIP_TEMPLATES.length - 1];

  return {
    feedback: feedbackEntry.feedback,
    tip: tipEntry.tip,
  };
};

// ═══════════════════════════════════════════════
//  CONTROLLER HOOK
// ═══════════════════════════════════════════════

export const useConversationExerciseController = (lessonId: string) => {
  // ── Scenario ──
  const scenario = SCENARIOS[lessonId] ?? SCENARIOS['lesson_1'];

  // ── State ──
  const [turns, setTurns] = useState<ConversationTurn[]>(
    scenario.turns.map((t) => ({ ...t })),
  );
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [phase, setPhase] = useState<ConversationPhase>('partner_speaking');
  const [timer, setTimer] = useState(scenario.timeLimitSeconds);
  const [backgroundNoise, setBackgroundNoise] = useState(scenario.backgroundNoiseEnabled);
  const [crowdChatter, setCrowdChatter] = useState(scenario.crowdChatterEnabled);
  const [metrics, setMetrics] = useState<ConversationMetricsResult[]>([]);
  const [completedTurns, setCompletedTurns] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [partnerPlayProgress, setPartnerPlayProgress] = useState(0);
  const [learnerRecordProgress, setLearnerRecordProgress] = useState(0);
  const [conversationFeedback, setConversationFeedback] = useState<ConversationFeedback | null>(null);

  // ── Audio recorder (expo-audio) ──
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Refs ──
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ──
  const currentTurn = turns[currentTurnIndex];
  const totalTurns = turns.length;
  const isComplete = phase === 'completed';
  const partnerName = scenario.partnerName;
  const learnerName = scenario.learnerName;

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

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
      if (playProgressRef.current) clearInterval(playProgressRef.current);
      if (recordProgressRef.current) clearInterval(recordProgressRef.current);
    };
  }, []);

  // ── Auto-play partner turn ──
  useEffect(() => {
    if (phase !== 'partner_speaking') return;
    if (!currentTurn || currentTurn.speaker !== 'partner') return;

    // Simulate partner audio playing
    setPartnerPlayProgress(0);
    const duration = currentTurn.audioDuration;
    const interval = 50;
    let elapsed = 0;

    playProgressRef.current = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(1, elapsed / duration);
      setPartnerPlayProgress(progress);

      if (elapsed >= duration) {
        if (playProgressRef.current) clearInterval(playProgressRef.current);
        // Mark partner turn complete
        setTurns((prev) =>
          prev.map((t, i) =>
            i === currentTurnIndex ? { ...t, completed: true } : t,
          ),
        );
        setCompletedTurns((c) => c + 1);

        // Check if next turn is learner
        const nextIdx = currentTurnIndex + 1;
        if (nextIdx < totalTurns) {
          setCurrentTurnIndex(nextIdx);
          if (turns[nextIdx]?.speaker === 'learner') {
            setPhase('waiting_for_learner');
          } else {
            setPhase('partner_speaking');
          }
        } else {
          finishConversation();
        }
      }
    }, interval);

    return () => {
      if (playProgressRef.current) clearInterval(playProgressRef.current);
    };
  }, [phase, currentTurnIndex]);

  // ── Toggle settings ──
  const toggleBackgroundNoise = useCallback(() => {
    setBackgroundNoise((prev) => !prev);
  }, []);

  const toggleCrowdChatter = useCallback(() => {
    setCrowdChatter((prev) => !prev);
  }, []);

  // ── Start recording (learner's turn) ──
  const startRecording = useCallback(async () => {
    if (phase !== 'waiting_for_learner') return;
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
      setLearnerRecordProgress(0);

      // Track recording progress
      let elapsed = 0;
      const maxDuration = currentTurn?.audioDuration ?? 5000;
      recordProgressRef.current = setInterval(() => {
        elapsed += 100;
        setLearnerRecordProgress(Math.min(1, elapsed / maxDuration));
      }, 100);
    } catch (e: unknown) {
      console.error('[Conversation] startRecording:', e);
      setError('Failed to start recording');
    }
  }, [phase, currentTurn, audioRecorder]);

  // ── Stop recording & process ──
  const stopRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;
    try {
      if (recordProgressRef.current) {
        clearInterval(recordProgressRef.current);
        recordProgressRef.current = null;
      }

      setPhase('processing');

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ allowsRecording: false });

      if (!uri || !currentTurn) {
        setPhase('waiting_for_learner');
        return;
      }

      // Transcribe & evaluate
      const transcript = await transcribeAudio(uri, currentTurn.text);
      const turnMetrics = evaluateResponse(currentTurn.text, transcript);
      setMetrics((prev) => [...prev, turnMetrics]);

      // Mark learner turn complete
      setTurns((prev) =>
        prev.map((t, i) =>
          i === currentTurnIndex
            ? { ...t, completed: true, audioUri: uri }
            : t,
        ),
      );
      setCompletedTurns((c) => c + 1);

      // Save turn to Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await addDoc(
            collection(db, 'users', uid, 'lessons', lessonId, 'conversationTurns'),
            {
              turnIndex: currentTurnIndex,
              expectedText: currentTurn.text,
              transcript,
              metrics: turnMetrics,
              recordedAt: Timestamp.now(),
            },
          );
        } catch {
          // Non-critical
        }
      }

      // Advance to next turn
      const nextIdx = currentTurnIndex + 1;
      if (nextIdx < totalTurns) {
        setCurrentTurnIndex(nextIdx);
        if (turns[nextIdx]?.speaker === 'partner') {
          setPhase('partner_speaking');
        } else {
          setPhase('waiting_for_learner');
        }
      } else {
        finishConversation();
      }
    } catch (e: unknown) {
      console.error('[Conversation] stopRecording:', e);
      setError('Failed to process recording');
      setPhase('waiting_for_learner');
    }
  }, [currentTurn, currentTurnIndex, totalTurns, turns, lessonId]);

  // ── Finish conversation ──
  const finishConversation = useCallback(async () => {
    setPhase('completed');
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Generate feedback from metrics
    const avg = computeAverageMetrics(metrics);
    const fb = generateFeedback(avg);
    setConversationFeedback(fb);

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await setDoc(
        doc(db, 'users', uid, 'lessons', lessonId),
        {
          status: 'completed',
          completedAt: Timestamp.now(),
          conversationMetrics: avg,
          feedback: fb.feedback,
          tip: fb.tip,
          totalTurns: completedTurns,
        },
        { merge: true },
      );

      // Update overall progress
      await setDoc(
        doc(db, 'users', uid, 'progress', 'summary'),
        {
          completedLessons: increment(1),
          lastActiveAt: Timestamp.now().toDate().toISOString(),
        },
        { merge: true },
      );

      // Update progress: streak, daily activity, weekly aggregation
      await onExerciseComplete(uid, 'conversation', { metrics: avg });
    } catch {
      // Non-critical
    }
  }, [metrics, completedTurns, lessonId]);

  // ── Format timer ──
  const formatTimer = useCallback((secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    // Scenario info
    partnerName,
    learnerName,
    // Turn data
    turns,
    currentTurnIndex,
    currentTurn,
    totalTurns,
    completedTurns,
    // State
    phase,
    timer,
    formattedTimer: formatTimer(timer),
    backgroundNoise,
    crowdChatter,
    metrics,
    error,
    isComplete,
    conversationFeedback,
    // Progress
    partnerPlayProgress,
    learnerRecordProgress,
    // Actions
    toggleBackgroundNoise,
    toggleCrowdChatter,
    startRecording,
    stopRecording,
    finishConversation,
  };
};

// ── Helper ──
const computeAverageMetrics = (
  all: ConversationMetricsResult[],
): ConversationMetricsResult => {
  if (!all.length)
    return { fluency: 0, vocabulary: 0, grammarUsage: 0, turnTaking: 0, overall: 0 };
  const sum = all.reduce(
    (a, m) => ({
      fluency: a.fluency + m.fluency,
      vocabulary: a.vocabulary + m.vocabulary,
      grammarUsage: a.grammarUsage + m.grammarUsage,
      turnTaking: a.turnTaking + m.turnTaking,
      overall: a.overall + m.overall,
    }),
    { fluency: 0, vocabulary: 0, grammarUsage: 0, turnTaking: 0, overall: 0 },
  );
  const n = all.length;
  return {
    fluency: Math.round(sum.fluency / n),
    vocabulary: Math.round(sum.vocabulary / n),
    grammarUsage: Math.round(sum.grammarUsage / n),
    turnTaking: Math.round(sum.turnTaking / n),
    overall: Math.round(sum.overall / n),
  };
};
