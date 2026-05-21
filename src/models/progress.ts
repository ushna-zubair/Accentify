// ─── Progress Models ───
export type LessonStatus = 'completed' | 'in_progress' | 'upcoming';

export interface LessonDay {
  id: string;
  day: number;
  status: LessonStatus;
  date: string;
}

export interface PronunciationMetrics {
  clarity: number;
  soundAccuracy: number;
  smoothness: number;
  rhythmAndTone: number;
}

export interface ConversationMetrics {
  fluency: number;
  vocabulary: number;
  grammarUsage: number;
  turnTaking: number;
}

export interface VocabularyGrowthPoint {
  label: string;
  value: number;
}

export interface OverallPerformance {
  speechAccuracy: number;
  speechFluency: number;
  speechConsistency: number;
}

export interface WeeklyProgress {
  weekNumber: number;
  year: number;
  weekStartDate: string;
  pronunciation: PronunciationMetrics;
  conversation: ConversationMetrics;
  vocabularyGrowth: VocabularyGrowthPoint[];
  overallPerformance: OverallPerformance;
}

export interface ProgressData {
  dayStreak: number;
  lessonDays: LessonDay[];
  currentWeekIndex: number;
  weeks: WeeklyProgress[];
}

// ─── Per-attempt history ───
export type PronunciationItemType = 'word' | 'sentence';

export interface PronunciationAttempt {
  itemType: PronunciationItemType;
  reference: string;
  overallPct: number;
  clarityPct: number;
  accuracyPct: number;
  fluencyPct: number;
  completed: boolean;
  durationSec: number;
  createdAt: string;
}

export interface DailyEntry {
  date: string;
  practiceItems: number;
  completedItems: number;
  practiceSeconds: number;
  pronunciationAttempts: number;
  vocabWordsLearned: number;
  conversationTurns: number;
  lessonsCompleted: number;
  attempts: PronunciationAttempt[];
}

// ─── Insights Models ───
export type EnglishLevel = 'A1 Beginner' | 'A2 Elementary' | 'B1 Intermediate' | 'B2 Upper Intermediate' | 'C1 Fluent' | 'C2 Proficient';

export interface InsightsUserData {
  userId: string;
  currentLevel: EnglishLevel;
  weeklyProgress: WeeklyProgress;
  lessonDays: LessonDay[];
  weekLabel: string;
  hasData: boolean;
}
