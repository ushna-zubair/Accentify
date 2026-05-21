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
 * users/{uid}/progress/daily/entries/{YYYY-MM-DD}
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
  Timestamp,
  increment,
  arrayUnion,
  runTransaction,
  addDoc,
} from 'firebase/firestore';
import { STREAK_THRESHOLD_PCT, COMPLETE_THRESHOLD_PCT } from '../config/scoring';
import type { PronunciationAttempt, PronunciationItemType } from '../models/progress';
import { db } from '../config/firebase';
import {
  getWeekNumber,
  getWeekYear,
  getWeekStart,
  toDateKey,
  formatDate,
  weekDocId,
  parseDate,
  isSameDay,
  isYesterday,
} from '../utils/dateUtils';
import type {
  PronunciationMetrics,
  ConversationMetrics,
  VocabularyGrowthPoint,
  OverallPerformance,
  WeeklyProgress,
  LessonDay,
} from '../models';
import type { PronunciationScore, ConversationMetricsResult } from '../models';

// Re-export date helpers for backward compatibility with consumers
// that were importing them from progressService
export {
  getWeekNumber,
  getWeekYear,
  getWeekStart,
  toDateKey,
  formatDate,
} from '../utils/dateUtils';

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

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const today = new Date();
    const todayKey = toDateKey(today);

    let dayStreak = 1;
    let longestStreak = 1;

    if (snap.exists()) {
      const data = snap.data();
      const rawDate = data.lastActiveDate;
      // Normalize: if it's a Timestamp, convert to YYYY-MM-DD string
      const lastDate = rawDate && typeof rawDate === 'object' && typeof rawDate.toDate === 'function'
        ? toDateKey(rawDate.toDate())
        : (rawDate as string | undefined);
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

    transaction.set(ref, {
      dayStreak,
      longestStreak,
      lastActiveDate: todayKey,
      updatedAt: Timestamp.now(),
    });

    return dayStreak;
  });
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
  const ref = doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey);

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
 * Per-attempt record for a single word or sentence evaluation. Counts as one
 * "practice item" for any score above zero, as "completed" when overall ≥
 * COMPLETE_THRESHOLD_PCT, and fires the streak when overall ≥
 * STREAK_THRESHOLD_PCT.
 */
export const recordPronunciationAttempt = async (
  uid: string,
  input: {
    itemType: PronunciationItemType;
    reference: string;
    score: PronunciationScore;
    durationSec: number;
  },
): Promise<{ completed: boolean; streakUpdated: boolean }> => {
  const overall = input.score.overall;
  const completed = overall >= COMPLETE_THRESHOLD_PCT;
  const streakWorthy = overall >= STREAK_THRESHOLD_PCT;
  const todayKey = toDateKey(new Date());

  const attempt: PronunciationAttempt = {
    itemType: input.itemType,
    reference: input.reference,
    overallPct: overall,
    clarityPct: input.score.clarity,
    accuracyPct: input.score.accuracy,
    fluencyPct: input.score.fluency,
    completed,
    durationSec: Math.max(0, Math.round(input.durationSec)),
    createdAt: new Date().toISOString(),
  };

  const dailyRef = doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey);
  await setDoc(
    dailyRef,
    {
      date: todayKey,
      practiceItems: increment(1),
      completedItems: increment(completed ? 1 : 0),
      practiceSeconds: increment(attempt.durationSec),
      pronunciationAttempts: increment(1),
      pronunciationScores: arrayUnion(input.score),
      attempts: arrayUnion(attempt),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  try {
    const summaryRef = doc(db, 'users', uid, 'progress', 'summary');
    await setDoc(
      summaryRef,
      {
        totalPronunciationAttempts: increment(1),
        totalCompletedItems: increment(completed ? 1 : 0),
        totalPracticeSeconds: increment(attempt.durationSec),
        lastActiveAt: Timestamp.now(),
      },
      { merge: true },
    );
  } catch (e) {
    console.warn('[progressService] summary update failed:', e);
  }

  try {
    const attemptsCol = collection(db, 'users', uid, 'progress', 'attempts', 'entries');
    await addDoc(attemptsCol, { ...attempt, dateKey: todayKey });
  } catch (e) {
    console.warn('[progressService] attempts history write failed:', e);
  }

  try {
    const itemKey = `${input.itemType}:${input.reference.trim().toLowerCase()}`
      .replace(/[/.#$\[\]]/g, '_')
      .slice(0, 1000);
    const itemRef = doc(db, 'users', uid, 'progress', 'items', 'entries', itemKey);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(itemRef);
      const prevBest = snap.exists() ? ((snap.data().bestScore as number) ?? 0) : 0;
      tx.set(
        itemRef,
        {
          itemType: input.itemType,
          reference: input.reference,
          bestScore: Math.max(prevBest, overall),
          attempts: increment(1),
          lastAttempt: attempt.createdAt,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    });
  } catch (e) {
    console.warn('[progressService] item best-score write failed:', e);
  }

  let streakUpdated = false;
  if (streakWorthy) {
    try {
      await updateStreak(uid);
      streakUpdated = true;
    } catch (e) {
      console.warn('[progressService] streak update failed:', e);
    }
  }

  return { completed, streakUpdated };
};

/**
 * Record that a conversation exercise was completed today.
 */
export const recordConversationActivity = async (
  uid: string,
  metrics: ConversationMetricsResult,
): Promise<void> => {
  const todayKey = toDateKey(new Date());
  const ref = doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey);

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
  const ref = doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey);

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
  const ref = doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey);

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

  // Collect daily docs for this week (Mon–Sun) — read all 7 in parallel
  const allPronScores: PronunciationScore[] = [];
  const allConvMetrics: ConversationMetricsResult[] = [];
  let totalVocab = 0;
  let totalLessons = 0;

  const dayRefs = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return doc(db, 'users', uid, 'progress', 'daily', 'entries', toDateKey(day));
  });
  const daySnaps = await Promise.all(dayRefs.map(getDoc));

  for (const snap of daySnaps) {
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

  // Build refs for all 7 days and read in parallel
  const dayInfos = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return {
      date,
      dayOfWeek: date.getDay(),
      dateKey: toDateKey(date),
      isToday: isSameDay(date, today),
      isFuture: date > today && !isSameDay(date, today),
    };
  });

  // Only read past/current days (future days have no data)
  const readableIndexes = dayInfos
    .map((d, i) => (d.isFuture ? -1 : i))
    .filter((i) => i >= 0);

  const snapResults = await Promise.all(
    readableIndexes.map((i) =>
      getDoc(doc(db, 'users', uid, 'progress', 'daily', 'entries', dayInfos[i].dateKey)),
    ),
  );

  // Map snap results back by index
  const snapByIndex = new Map<number, typeof snapResults[number]>();
  readableIndexes.forEach((idx, j) => snapByIndex.set(idx, snapResults[j]));

  const days: LessonDay[] = dayInfos.map((info, i) => {
    let status: LessonDay['status'] = 'upcoming';

    if (!info.isFuture) {
      const snap = snapByIndex.get(i);
      if (snap?.exists()) {
        const data = snap.data();
        const completed =
          ((data.lessonsCompleted as number) ?? 0) > 0 ||
          ((data.pronunciationAttempts as number) ?? 0) > 0 ||
          ((data.conversationTurns as number) ?? 0) > 0 ||
          ((data.vocabWordsLearned as number) ?? 0) > 0;
        status = completed ? 'completed' : info.isToday ? 'in_progress' : 'upcoming';
      } else {
        status = info.isToday ? 'in_progress' : 'upcoming';
      }
    }

    return {
      id: `day-${i}`,
      day: info.dayOfWeek,
      status,
      date: formatDate(info.date),
    };
  });

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
  // Read streak, lesson days, and weekly entries in parallel
  const streakRef = doc(db, 'users', uid, 'progress', 'streak');
  const weeksRef = collection(db, 'users', uid, 'progress', 'weekly', 'entries');

  const [streakSnap, lessonDays, weeksSnap] = await Promise.all([
    getDoc(streakRef),
    buildLessonDays(uid),
    getDocs(weeksRef),
  ]);

  const dayStreak = streakSnap.exists()
    ? (streakSnap.data().dayStreak as number) ?? 0
    : 0;

  let weeks: WeeklyProgress[] = [];
  if (!weeksSnap.empty) {
    weeks = weeksSnap.docs
      .map((d) => d.data() as WeeklyProgress)
      .sort((a, b) => {
        if ((a.year ?? 0) !== (b.year ?? 0)) return (a.year ?? 0) - (b.year ?? 0);
        return (a.weekNumber ?? 0) - (b.weekNumber ?? 0);
      });
  }

  // If no weekly entry exists for the current week, create one
  const today = new Date();
  const curWeekStart = getWeekStart(today);
  const curWn = getWeekNumber(today);
  const curYr = getWeekYear(today);
  const hasCurrentWeek = weeks.some(
    (w) => w.weekNumber === curWn && w.year === curYr,
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
    // Pronunciation streak is fired per-attempt via recordPronunciationAttempt
    // when overall ≥ STREAK_THRESHOLD_PCT. For conversation/vocab we fall back
    // to the legacy per-completion streak bump, gated on a passable metric.
    if (type === 'conversation' && payload.metrics) {
      await recordConversationActivity(uid, payload.metrics);
      if ((payload.metrics.overall ?? 0) >= STREAK_THRESHOLD_PCT) {
        await updateStreak(uid);
      }
    } else if (type === 'vocab') {
      await recordVocabActivity(uid, payload.wordsLearned ?? 1);
      if ((payload.wordsLearned ?? 0) > 0) {
        await updateStreak(uid);
      }
    }
    // Pronunciation: attempts already wrote daily counters + streak.

    await recordLessonCompletion(uid);

    const weekStart = getWeekStart(new Date());
    await aggregateWeek(uid, weekStart);

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
  // Build all weekly refs and read in parallel
  const weekInfos = Array.from({ length: count }, (_, idx) => {
    const i = count - 1 - idx;
    const ws = new Date(currentWeekStart);
    ws.setDate(ws.getDate() - i * 7);
    return { ws, ref: doc(db, 'users', uid, 'progress', 'weekly', 'entries', weekDocId(ws)) };
  });
  const weekSnaps = await Promise.all(weekInfos.map((w) => getDoc(w.ref)));

  const points: VocabularyGrowthPoint[] = weekInfos.map((info, idx) => {
    const snap = weekSnaps[idx];
    const vocabCount = snap.exists() ? ((snap.data().totalVocabWords as number) ?? 0) : 0;
    return { label: `W${getWeekNumber(info.ws)}`, value: vocabCount };
  });

  return points;
};
