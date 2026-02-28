/**
 * progressService.ts
 *
 * Central service for all progress-related Firestore writes.
 * Exercise controllers call these functions when a user completes
 * activities so that the Progress screen receives real aggregated data.
 *
 * ── Firestore Layout ──
 *
 * users/{uid}/progress/streak
 *   { dayStreak, lastActiveDate, longestStreak }
 *
 * users/{uid}/progress/lessons
 *   { days: LessonDay[] }              ← current-week calendar
 *
 * users/{uid}/progress/summary
 *   { completedLessons, totalHours, totalSessions, lastActiveAt,
 *     totalVocabWords, totalPronunciationAttempts }
 *
 * users/{uid}/progress/daily/{YYYY-MM-DD}
 *   { date, lessonsCompleted, pronunciationAttempts, vocabWordsLearned,
 *     conversationTurns, practiceMinutes,
 *     pronunciationScores: PronunciationScore[],
 *     conversationMetrics: ConversationMetricsResult[] }
 *
 * users/{uid}/progress/weekly/entries/week-{YYYY}-{WW}
 *   { weekNumber, year, weekStartDate,
 *     pronunciation, conversation, vocabularyGrowth, overallPerformance,
 *     totalLessonsCompleted, totalVocabWords }
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  PronunciationMetrics,
  ConversationMetrics,
  VocabularyGrowthPoint,
  OverallPerformance,
  WeeklyProgress,
  LessonDay,
} from '../models';
import type { PronunciationScore, ConversationMetricsResult } from '../models';

// ═══════════════════════════════════════════════
//  DATE HELPERS
// ═══════════════════════════════════════════════

/** ISO-8601 week number (Monday-based). */
export const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/** ISO week-year (the year the Thursday of the ISO week falls in). */
export const getWeekYear = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
};

/** Monday of the week containing `d`. */
export const getWeekStart = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Format a Date as YYYY-MM-DD. */
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Format a Date as "MMM-DD-YYYY". */
export const formatDate = (d: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
};

/** Weekly document ID: "week-2026-09". */
const weekDocId = (d: Date) => {
  const wn = getWeekNumber(d);
  const yr = getWeekYear(d);
  return `week-${yr}-${String(wn).padStart(2, '0')}`;
};

/** Parse YYYY-MM-DD → Date (local midnight). */
const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Check if two dates are the same calendar day. */
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Check if `a` is exactly one calendar day before `b`. */
const isYesterday = (a: Date, b: Date) => {
  const prev = new Date(b);
  prev.setDate(prev.getDate() - 1);
  return isSameDay(a, prev);
};

// ═══════════════════════════════════════════════
//  STREAK MANAGEMENT
// ═══════════════════════════════════════════════

/**
 * Update the user's day-streak.
 * - If already active today → no-op.
 * - If last active yesterday → increment.
 * - Otherwise → reset to 1.
 */
export const updateStreak = async (uid: string): Promise<number> => {
  const ref = doc(db, 'users', uid, 'progress', 'streak');
  const snap = await getDoc(ref);
  const today = new Date();
  const todayKey = toDateKey(today);

  let dayStreak = 1;
  let longestStreak = 1;

  if (snap.exists()) {
    const data = snap.data();
    const lastDate = data.lastActiveDate as string | undefined;
    const prevStreak = (data.dayStreak as number) ?? 0;
    longestStreak = (data.longestStreak as number) ?? prevStreak;

    if (lastDate === todayKey) {
      // Already recorded today
      return prevStreak;
    }

    if (lastDate) {
      const lastD = parseDate(lastDate);
      if (isYesterday(lastD, today)) {
        dayStreak = prevStreak + 1;
      }
      // else: gap ≥ 2 days → reset to 1
    }

    if (dayStreak > longestStreak) longestStreak = dayStreak;
  }

  await setDoc(ref, {
    dayStreak,
    longestStreak,
    lastActiveDate: todayKey,
    updatedAt: Timestamp.now(),
  });

  return dayStreak;
};

// ═══════════════════════════════════════════════
//  DAILY ACTIVITY LOG
// ═══════════════════════════════════════════════

/**
 * Record that a pronunciation exercise was completed today.
 * Appends the score to the daily activity doc and increments counters.
 */
export const recordPronunciationActivity = async (
  uid: string,
  score: PronunciationScore,
): Promise<void> => {
  const todayKey = toDateKey(new Date());
  const ref = doc(db, 'users', uid, 'progress', 'daily', todayKey);

  await setDoc(
    ref,
    {
      date: todayKey,
      pronunciationAttempts: increment(1),
      pronunciationScores: arrayUnion(score),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
};

/**
 * Record that a conversation exercise was completed today.
 */
export const recordConversationActivity = async (
  uid: string,
  metrics: ConversationMetricsResult,
): Promise<void> => {
  const todayKey = toDateKey(new Date());
  const ref = doc(db, 'users', uid, 'progress', 'daily', todayKey);

  await setDoc(
    ref,
    {
      date: todayKey,
      conversationTurns: increment(1),
      conversationMetrics: arrayUnion(metrics),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
};

/**
 * Record that vocabulary words were practiced today.
 */
export const recordVocabActivity = async (
  uid: string,
  wordsLearned: number,
): Promise<void> => {
  const todayKey = toDateKey(new Date());
  const ref = doc(db, 'users', uid, 'progress', 'daily', todayKey);

  await setDoc(
    ref,
    {
      date: todayKey,
      vocabWordsLearned: increment(wordsLearned),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
};

/**
 * Record that a lesson was completed today.
 */
export const recordLessonCompletion = async (uid: string): Promise<void> => {
  const todayKey = toDateKey(new Date());
  const ref = doc(db, 'users', uid, 'progress', 'daily', todayKey);

  await setDoc(
    ref,
    {
      date: todayKey,
      lessonsCompleted: increment(1),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
};

// ═══════════════════════════════════════════════
//  WEEKLY AGGREGATION
// ═══════════════════════════════════════════════

/**
 * Rebuild the weekly progress document for a given week
 * by reading all daily activity docs within that week.
 */
export const aggregateWeek = async (
  uid: string,
  weekStart: Date,
): Promise<WeeklyProgress> => {
  const wn = getWeekNumber(weekStart);
  const yr = getWeekYear(weekStart);
  const wId = weekDocId(weekStart);

  // Collect daily docs for this week (Mon–Sun)
  const allPronScores: PronunciationScore[] = [];
  const allConvMetrics: ConversationMetricsResult[] = [];
  let totalVocab = 0;
  let totalLessons = 0;

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const key = toDateKey(day);
    const ref = doc(db, 'users', uid, 'progress', 'daily', key);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.pronunciationScores)) {
        allPronScores.push(...(data.pronunciationScores as PronunciationScore[]));
      }
      if (Array.isArray(data.conversationMetrics)) {
        allConvMetrics.push(...(data.conversationMetrics as ConversationMetricsResult[]));
      }
      totalVocab += (data.vocabWordsLearned as number) ?? 0;
      totalLessons += (data.lessonsCompleted as number) ?? 0;
    }
  }

  // ── Average pronunciation scores → PronunciationMetrics ──
  const pronunciation: PronunciationMetrics =
    allPronScores.length > 0
      ? {
          clarity: avg(allPronScores.map((s) => s.clarity)),
          soundAccuracy: avg(allPronScores.map((s) => s.accuracy)),
          smoothness: avg(allPronScores.map((s) => s.fluency)),
          rhythmAndTone: avg(allPronScores.map((s) => s.overall)),
        }
      : { clarity: 0, soundAccuracy: 0, smoothness: 0, rhythmAndTone: 0 };

  // ── Average conversation metrics → ConversationMetrics ──
  const conversation: ConversationMetrics =
    allConvMetrics.length > 0
      ? {
          fluency: avg(allConvMetrics.map((m) => m.fluency)),
          vocabulary: avg(allConvMetrics.map((m) => m.vocabulary)),
          grammarUsage: avg(allConvMetrics.map((m) => m.grammarUsage)),
          turnTaking: avg(allConvMetrics.map((m) => m.turnTaking)),
        }
      : { fluency: 0, vocabulary: 0, grammarUsage: 0, turnTaking: 0 };

  // ── Overall performance from pronunciation averages ──
  const overallPerformance: OverallPerformance =
    allPronScores.length > 0
      ? {
          speechAccuracy: avg(allPronScores.map((s) => s.accuracy)),
          speechFluency: avg(allPronScores.map((s) => s.fluency)),
          speechConsistency: computeConsistency(allPronScores.map((s) => s.overall)),
        }
      : { speechAccuracy: 0, speechFluency: 0, speechConsistency: 0 };

  // ── Vocabulary growth: fetch last 8 weeks for trend line ──
  const vocabGrowth = await getVocabGrowthTrend(uid, weekStart, 8);

  const weeklyEntry: WeeklyProgress = {
    weekNumber: wn,
    weekStartDate: formatDate(weekStart),
    pronunciation,
    conversation,
    vocabularyGrowth: vocabGrowth,
    overallPerformance,
  };

  // ── Persist ──
  const weekRef = doc(db, 'users', uid, 'progress', 'weekly', 'entries', wId);
  await setDoc(weekRef, {
    ...weeklyEntry,
    year: yr,
    totalLessonsCompleted: totalLessons,
    totalVocabWords: totalVocab,
    updatedAt: Timestamp.now(),
  });

  return weeklyEntry;
};

// ═══════════════════════════════════════════════
//  LESSON DAYS (this-week calendar)
// ═══════════════════════════════════════════════

/**
 * Build the 7-day lesson calendar for the current week
 * by checking which days have daily-activity docs with completions.
 */
export const buildLessonDays = async (uid: string): Promise<LessonDay[]> => {
  const today = new Date();
  const weekStart = getWeekStart(today);
  const days: LessonDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayOfWeek = date.getDay();
    const dateKey = toDateKey(date);
    const isToday = isSameDay(date, today);
    const isFuture = date > today && !isToday;

    let status: LessonDay['status'] = 'upcoming';

    if (!isFuture) {
      // Check if the user had any activity on this day
      const ref = doc(db, 'users', uid, 'progress', 'daily', dateKey);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const completed =
          ((data.lessonsCompleted as number) ?? 0) > 0 ||
          ((data.pronunciationAttempts as number) ?? 0) > 0 ||
          ((data.conversationTurns as number) ?? 0) > 0 ||
          ((data.vocabWordsLearned as number) ?? 0) > 0;
        status = completed ? 'completed' : isToday ? 'in_progress' : 'upcoming';
      } else {
        status = isToday ? 'in_progress' : 'upcoming';
      }
    }

    days.push({
      id: `day-${i}`,
      day: dayOfWeek,
      status,
      date: formatDate(date),
    });
  }

  return days;
};

// ═══════════════════════════════════════════════
//  FULL PROGRESS FETCH
// ═══════════════════════════════════════════════

/**
 * Read all progress data for the Progress screen.
 * Returns streak, lesson days, and all weekly entries.
 */
export const fetchFullProgress = async (uid: string) => {
  // ── 1. Streak ──
  const streakRef = doc(db, 'users', uid, 'progress', 'streak');
  const streakSnap = await getDoc(streakRef);
  let dayStreak = 0;
  if (streakSnap.exists()) {
    dayStreak = (streakSnap.data().dayStreak as number) ?? 0;
  }

  // ── 2. Lesson days for current week ──
  const lessonDays = await buildLessonDays(uid);

  // ── 3. Weekly entries ──
  const weeksRef = collection(db, 'users', uid, 'progress', 'weekly', 'entries');
  const weeksQ = query(weeksRef, orderBy('year', 'asc'), orderBy('weekNumber', 'asc'));
  const weeksSnap = await getDocs(weeksQ);

  let weeks: WeeklyProgress[] = [];
  if (!weeksSnap.empty) {
    weeks = weeksSnap.docs.map((d) => d.data() as WeeklyProgress);
  }

  // If no weekly entry exists for the current week, create one
  const today = new Date();
  const curWeekStart = getWeekStart(today);
  const curWn = getWeekNumber(today);
  const curYr = getWeekYear(today);
  const hasCurrentWeek = weeks.some(
    (w) => w.weekNumber === curWn && (w as any).year === curYr,
  );

  if (!hasCurrentWeek) {
    const currentWeek = await aggregateWeek(uid, curWeekStart);
    weeks.push(currentWeek);
  }

  return {
    dayStreak,
    lessonDays,
    weeks,
    currentWeekIndex: weeks.length - 1,
  };
};

// ═══════════════════════════════════════════════
//  CONVENIENCE: one-call after exercise completion
// ═══════════════════════════════════════════════

/**
 * Call after ANY exercise finishes.
 * Updates streak + daily activity + re-aggregates current week.
 * Also bumps the admin analytics session counter.
 */
export const onExerciseComplete = async (
  uid: string,
  type: 'pronunciation' | 'conversation' | 'vocab',
  payload: {
    score?: PronunciationScore;
    metrics?: ConversationMetricsResult;
    wordsLearned?: number;
  },
): Promise<void> => {
  try {
    // 1. Update streak
    await updateStreak(uid);

    // 2. Record daily activity
    switch (type) {
      case 'pronunciation':
        if (payload.score) await recordPronunciationActivity(uid, payload.score);
        break;
      case 'conversation':
        if (payload.metrics) await recordConversationActivity(uid, payload.metrics);
        break;
      case 'vocab':
        await recordVocabActivity(uid, payload.wordsLearned ?? 1);
        break;
    }

    // 3. Record lesson completion
    await recordLessonCompletion(uid);

    // 4. Re-aggregate current week
    const weekStart = getWeekStart(new Date());
    await aggregateWeek(uid, weekStart);

    // 5. Increment admin analytics session counter
    try {
      const { incrementSessionCounter, recordPracticeTime } = await import('./adminService');
      await incrementSessionCounter();
      await recordPracticeTime(new Date().getHours());
    } catch {
      // Non-critical – admin analytics may not be set up yet
    }
  } catch (e) {
    console.warn('[ProgressService] onExerciseComplete error:', e);
  }
};

// ═══════════════════════════════════════════════
//  PRIVATE HELPERS
// ═══════════════════════════════════════════════

/** Arithmetic mean, rounded to nearest integer. */
const avg = (nums: number[]): number => {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
};

/**
 * Consistency = 100 − coefficient_of_variation (capped at 0–100).
 * A higher score means scores are more consistent.
 */
const computeConsistency = (values: number[]): number => {
  if (values.length < 2) return values[0] ?? 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  return Math.round(Math.max(0, Math.min(100, 100 - cv)));
};

/**
 * Fetch vocab words learned per week for the last `count` weeks,
 * returning data suitable for the vocabulary growth line chart.
 */
const getVocabGrowthTrend = async (
  uid: string,
  currentWeekStart: Date,
  count: number,
): Promise<VocabularyGrowthPoint[]> => {
  const points: VocabularyGrowthPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const ws = new Date(currentWeekStart);
    ws.setDate(ws.getDate() - i * 7);
    const wId = weekDocId(ws);

    const ref = doc(db, 'users', uid, 'progress', 'weekly', 'entries', wId);
    const snap = await getDoc(ref);

    let vocabCount = 0;
    if (snap.exists()) {
      vocabCount = (snap.data().totalVocabWords as number) ?? 0;
    }

    const weekNum = getWeekNumber(ws);
    points.push({ label: `W${weekNum}`, value: vocabCount });
  }

  return points;
};
