// ─── Tutor / Lesson Models ───
import type { ImageSourcePropType } from 'react-native';
import type { LessonStatus } from './progress';

export type LessonDifficulty = 'Easy' | 'Medium' | 'Challenging';

export interface TutorLesson {
  id: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  /** Local require() or remote URI */
  thumbnail?: ImageSourcePropType;
  /** Firestore progress status for this user */
  status: LessonStatus;
  /** Category: pronunciation, conversation, vocabulary */
  category: string;
  /** Order within study path */
  order: number;
}

export interface TutorStats {
  completedLessons: number;
  totalHours: number;
}

export interface TutorScreenData {
  userName: string;
  avatarUrl?: string;
  stats: TutorStats;
  /** Lessons the user started but hasn't finished */
  recentLessons: TutorLesson[];
  /** Full ordered study path */
  studyPath: TutorLesson[];
}

export interface LessonDetailData {
  id: string;
  title: string;
  /** Full description shown on detail screen */
  fullDescription: string;
  /** Category: pronunciation, conversation, vocabulary */
  category: string;
  difficulty: LessonDifficulty;
  /** Ordered tips for "Remember to focus:" section */
  focusTips: string[];
  /** Remote image URL for the lesson illustration */
  imageUrl?: string;
  status: LessonStatus;
}

// ─── Vocab Exercise Models ───

export interface VocabWordPair {
  id: string;
  /** Common / basic English word */
  basicWord: string;
  /** The more advanced vocabulary equivalent */
  vocabWord: string;
  /** Phonetic spelling for the basic word */
  basicPhonetic: string;
  /** Phonetic spelling for the vocab word */
  vocabPhonetic: string;
  /** Definition of the basic word */
  basicDefinition: string;
  /** Definition of the vocab word */
  vocabDefinition: string;
  /** Optional example sentence */
  exampleSentence?: string;
}

export interface VocabExerciseData {
  lessonId: string;
  title: string;
  /** Array of word pairs for this exercise */
  wordPairs: VocabWordPair[];
  /** Index of the current word pair the user is on */
  currentIndex: number;
  /** Total number of word pairs */
  totalPairs: number;
}

/** Result from the Whisper STT API — per-word feedback */
export interface SpeechRecognitionResult {
  /** Raw transcript from the STT engine */
  transcript: string;
  confidence: number;
  /** Overall correctness (both words) */
  isCorrect: boolean;
  /** Phonetic transcription of user's attempt at the basic word */
  basicAttemptPhonetic: string;
  /** Whether the basic word pronunciation was correct */
  basicCorrect: boolean;
  /** Feedback message for the basic word attempt */
  basicFeedback: string;
  /** Phonetic transcription of user's attempt at the vocab word */
  vocabAttemptPhonetic: string;
  /** Whether the vocab word pronunciation was correct */
  vocabCorrect: boolean;
  /** Feedback message for the vocab word attempt */
  vocabFeedback: string;
}

// ─── Pronunciation Exercise Models ───

export interface PronunciationScore {
  clarity: number;
  accuracy: number;
  fluency: number;
  overall: number;
}

export interface WordResult {
  word: string;
  isCorrect: boolean;
}

export interface PronunciationAttemptResult {
  isCorrect: boolean;
  wordResults: WordResult[];
  feedback: string;
  successMessage: string;
  score: PronunciationScore;
}

export interface PronunciationSentence {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─── Conversation Exercise Models ───

export interface ConversationTurn {
  id: string;
  /** Who speaks this turn: the AI partner or the learner */
  speaker: 'partner' | 'learner';
  /** The text for this dialogue turn */
  text: string;
  /** Duration of the audio in milliseconds (for playback bar) */
  audioDuration: number;
  /** Whether this turn has been completed */
  completed: boolean;
  /** URI to recorded audio (learner) or generated audio (partner) */
  audioUri?: string;
}

export interface ConversationScenario {
  id: string;
  lessonId: string;
  /** Name of the AI conversation partner */
  partnerName: string;
  /** Learner's display name in the chat */
  learnerName: string;
  /** All turns in the conversation */
  turns: ConversationTurn[];
  /** Background noise can be toggled */
  backgroundNoiseEnabled: boolean;
  /** Crowd chatter can be toggled */
  crowdChatterEnabled: boolean;
  /** Total time limit in seconds */
  timeLimitSeconds: number;
}

export interface ConversationMetricsResult {
  fluency: number;
  vocabulary: number;
  grammarUsage: number;
  turnTaking: number;
  overall: number;
}
