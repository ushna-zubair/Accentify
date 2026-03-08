/**
 * adminService.ts
 *
 * Service for admin-related Firestore operations.
 * Aggregates per-user progress data into the pre-computed
 * `admin_analytics/global_stats` document that the admin
 * dashboard reads via `useDashboardAnalytics`.
 *
 * ── Firestore Layout ──
 *
 * admin_analytics/global_stats
 *   { activeUsers, growthPct, usageDateRange,
 *     weeklyBarData[], practiceActivity, pronunciationAccuracy,
 *     fluencyAccuracy, vocabularyRetention, topLearners[],
 *     totalSessions, sessionsGrowth, sessionsThisWeek[], sessionsLastWeek[],
 *     lastAggregatedAt }
 *
 * admin_analytics/global_stats/daily_snapshots/{YYYY-MM-DD}
 *   { activeUsers, totalSessions, date }   ← lightweight daily snapshot
 *     for computing growth percentages
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DashboardData, TopLearner } from '../models';

// ─── Helpers ───

/** Return ISO date string for today: "2025-01-15" */
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Return the start-of-week (Monday) for a given date. */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Format a date range label: "Mar 2 - Mar 8, 2026" */
function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} - ${e}`;
}

/** Day-of-week labels */
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

/** Convert Date to DOW index (0=Mon … 6=Sun) */
function dowIndex(d: Date): number {
  const js = d.getDay(); // 0=Sun
  return js === 0 ? 6 : js - 1;
}

/** Classify an hour into a time-of-day bucket. */
function timeOfDay(hour: number): 'morning' | 'afternoon' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

// ─── Core Aggregation ───

/**
 * Aggregate analytics from all user progress data and write the
 * result to `admin_analytics/global_stats`.
 *
 * This is designed to be called from a Cloud Function on a schedule,
 * or manually from an admin action (pull-to-refresh).
 */
export async function aggregateGlobalStats(): Promise<DashboardData> {
  const now = new Date();
  const today = todayISO();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  // ── 1. Fetch all users ──
  const usersSnap = await getDocs(collection(db, 'users'));

  let activeUsers = 0;
  let totalSessions = 0;

  // Accuracy accumulators
  let totalPronunciation = 0;
  let totalFluency = 0;
  let totalVocab = 0;
  let usersWithMetrics = 0;

  // Practice-activity accumulators (percentage buckets – will normalise later)
  let morningCount = 0;
  let afternoonCount = 0;
  let nightCount = 0;

  // Per-day session counts for this week & last week (index 0=Mon)
  const sessionsPerDayThisWeek = [0, 0, 0, 0, 0, 0, 0];
  const sessionsPerDayLastWeek = [0, 0, 0, 0, 0, 0, 0];

  // For line chart (cumulative daily sessions this/last week)
  const dailySessionsThisWeek: number[] = [];
  const dailySessionsLastWeek: number[] = [];

  // Top learners tracker
  const learnerMap = new Map<string, { name: string; sessions: number }>();

  // ── Pre-compute the 14 date keys once (shared across all users) ──
  const dateKeys: { key: string; date: Date }[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const d = new Date(lastWeekStart);
    d.setDate(d.getDate() + offset);
    dateKeys.push({ key: d.toISOString().split('T')[0], date: new Date(d) });
  }

  // ── 2. Process all users in parallel ──
  const learnerDocs = usersSnap.docs.filter((d) => d.data().role !== 'admin');

  const userResults = await Promise.allSettled(
    learnerDocs.map(async (userDoc) => {
      const userData = userDoc.data();
      let userActive = false;
      let userSessions = 0;
      let userName = userData.fullName ?? userData.profile?.fullName ?? 'User';

      // Per-day accumulators local to this user
      const localThisWeek = [0, 0, 0, 0, 0, 0, 0];
      const localLastWeek = [0, 0, 0, 0, 0, 0, 0];
      let localMorning = 0;
      let localAfternoon = 0;
      let localNight = 0;
      let localPron = 0;
      let localFluency = 0;
      let localVocab = 0;
      let hasMetrics = false;

      // Check if the user was active in the last 30 days
      const lastActive = userData.lastSeen?.toDate?.()
        ?? userData.lastActiveAt?.toDate?.()
        ?? null;
      if (lastActive && now.getTime() - lastActive.getTime() < 30 * 24 * 60 * 60 * 1000) {
        userActive = true;
      }

      // ── 2a. Read progress summary ──
      try {
        const summarySnap = await getDoc(
          doc(db, 'users', userDoc.id, 'progress', 'summary'),
        );
        if (summarySnap.exists()) {
          userSessions = summarySnap.data().totalSessions ?? 0;
        }
      } catch { /* skip */ }

      // ── 2b. Read daily logs for this week + last week (batched) ──
      try {
        const daySnaps = await Promise.all(
          dateKeys.map(({ key }) =>
            getDoc(doc(db, 'users', userDoc.id, 'progress', 'daily', 'entries', key)),
          ),
        );

        daySnaps.forEach((daySnap, i) => {
          if (!daySnap.exists()) return;
          const dayData = daySnap.data();
          const sessions =
            (dayData.lessonsCompleted ?? 0) +
            (dayData.pronunciationAttempts ?? 0) +
            (dayData.conversationTurns ?? 0);
          const idx = dowIndex(dateKeys[i].date);
          if (dateKeys[i].date >= thisWeekStart) {
            localThisWeek[idx] += sessions;
          } else {
            localLastWeek[idx] += sessions;
          }
          const hour = dayData.primaryHour ?? 12;
          const tod = timeOfDay(hour);
          if (tod === 'morning') localMorning++;
          else if (tod === 'afternoon') localAfternoon++;
          else localNight++;
        });
      } catch { /* skip */ }

      // ── 2c. Read latest weekly entry for accuracy metrics ──
      try {
        const weeklyRef = collection(
          db, 'users', userDoc.id, 'progress', 'weekly', 'entries',
        );
        const weeklySnap = await getDocs(weeklyRef);
        if (!weeklySnap.empty) {
          const sortedDocs = weeklySnap.docs.sort((a, b) => {
            return (b.data().weekNumber ?? 0) - (a.data().weekNumber ?? 0);
          });
          const wd = sortedDocs[0].data();
          const pron = wd.pronunciation ?? {};
          const conv = wd.conversation ?? {};
          localPron =
            ((pron.clarity ?? 0) + (pron.soundAccuracy ?? 0) +
             (pron.smoothness ?? 0) + (pron.rhythmAndTone ?? 0)) / 4;
          localFluency =
            ((conv.fluency ?? 0) + (conv.vocabulary ?? 0) +
             (conv.grammarUsage ?? 0) + (conv.turnTaking ?? 0)) / 4;
          const vocabGrowth: { value: number }[] = wd.vocabularyGrowth ?? [];
          const vocabLast = vocabGrowth[vocabGrowth.length - 1]?.value ?? 0;
          const vocabFirst = vocabGrowth[0]?.value ?? 0;
          localVocab = vocabFirst > 0
            ? Math.min(100, Math.round((vocabLast / vocabFirst) * 100))
            : 0;
          hasMetrics = true;
        }
      } catch { /* skip */ }

      return {
        userActive,
        userSessions,
        userName,
        userId: userDoc.id,
        localThisWeek,
        localLastWeek,
        localMorning,
        localAfternoon,
        localNight,
        localPron,
        localFluency,
        localVocab,
        hasMetrics,
      };
    }),
  );

  // ── Merge parallel results ──
  for (const result of userResults) {
    if (result.status !== 'fulfilled') continue;
    const r = result.value;
    if (r.userActive) activeUsers++;
    totalSessions += r.userSessions;
    if (r.userSessions > 0) {
      learnerMap.set(r.userId, { name: r.userName, sessions: r.userSessions });
    }
    for (let i = 0; i < 7; i++) {
      sessionsPerDayThisWeek[i] += r.localThisWeek[i];
      sessionsPerDayLastWeek[i] += r.localLastWeek[i];
    }
    morningCount += r.localMorning;
    afternoonCount += r.localAfternoon;
    nightCount += r.localNight;
    if (r.hasMetrics) {
      totalPronunciation += r.localPron;
      totalFluency += r.localFluency;
      totalVocab += r.localVocab;
      usersWithMetrics++;
    }
  }

  // ── 3. Compute derived values ──

  // Growth percentage: compare active users to previous daily snapshot
  let growthPct = 0;
  try {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    const prevSnap = await getDoc(
      doc(db, 'admin_analytics', 'global_stats', 'daily_snapshots', yesterdayKey),
    );
    if (prevSnap.exists()) {
      const prevActive = prevSnap.data().activeUsers ?? 0;
      if (prevActive > 0) {
        growthPct = parseFloat(
          (((activeUsers - prevActive) / prevActive) * 100).toFixed(1),
        );
      }
    }
  } catch {
    // First run – no previous snapshot
  }

  // Normalise practice activity to percentages
  const actTotal = morningCount + afternoonCount + nightCount || 1;
  const practiceActivity = {
    morning: Math.round((morningCount / actTotal) * 100),
    afternoon: Math.round((afternoonCount / actTotal) * 100),
    night: Math.round((nightCount / actTotal) * 100),
  };

  // Average accuracy metrics across users
  const n = usersWithMetrics || 1;
  const pronunciationAccuracy = Math.round(totalPronunciation / n);
  const fluencyAccuracy = Math.round(totalFluency / n);
  const vocabularyRetention = Math.round(totalVocab / n);

  // Top 4 learners by session count
  const topLearners: TopLearner[] = Array.from(learnerMap.values())
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 4);

  // Bar chart data (this week vs last week per day)
  const weeklyBarData = DOW_LABELS.map((label, i) => ({
    label,
    thisWeek: sessionsPerDayThisWeek[i],
    lastWeek: sessionsPerDayLastWeek[i],
  }));

  // Line chart cumulative sessions (up to 6 data points for sparkline)
  let cumThis = 0;
  let cumLast = 0;
  const sessionsThisWeek: number[] = [];
  const sessionsLastWeek: number[] = [];
  for (let i = 0; i < 7; i++) {
    cumThis += sessionsPerDayThisWeek[i];
    cumLast += sessionsPerDayLastWeek[i];
    sessionsThisWeek.push(cumThis);
    sessionsLastWeek.push(cumLast);
  }

  // Sessions growth
  const lastWeekTotal = sessionsPerDayLastWeek.reduce((a, b) => a + b, 0);
  const thisWeekTotal = sessionsPerDayThisWeek.reduce((a, b) => a + b, 0);
  const sessionsGrowth =
    lastWeekTotal > 0
      ? parseFloat(
          (((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100).toFixed(1),
        )
      : 0;

  // Date range label — ends at today, not always Sunday
  const usageDateRange = formatDateRange(thisWeekStart, now);

  // ── 4. Build final object ──
  const dashboardData: DashboardData = {
    activeUsers,
    growthPct,
    usageDateRange,
    weeklyBarData,
    practiceActivity,
    pronunciationAccuracy,
    fluencyAccuracy,
    vocabularyRetention,
    topLearners,
    totalSessions,
    sessionsGrowth,
    sessionsThisWeek,
    sessionsLastWeek,
    lastAggregatedAt: new Date().toISOString(),
  };

  // ── 5. Write to Firestore ──
  await setDoc(doc(db, 'admin_analytics', 'global_stats'), {
    ...dashboardData,
    lastAggregatedAt: Timestamp.now(),
  });

  // Write daily snapshot for tomorrow's growth calc
  await setDoc(doc(db, 'admin_analytics', 'global_stats', 'daily_snapshots', today), {
    activeUsers,
    totalSessions,
    date: today,
    createdAt: Timestamp.now(),
  });

  return dashboardData;
}

// ─── Incremental Counters ───

/**
 * Increment session-level counters on the global stats doc.
 * Called from exercise controllers after each completed activity
 * so the dashboard numbers stay roughly up-to-date between
 * full aggregation runs.
 */
export async function incrementSessionCounter(): Promise<void> {
  const ref = doc(db, 'admin_analytics', 'global_stats');
  try {
    await setDoc(
      ref,
      { totalSessions: increment(1) },
      { merge: true },
    );
  } catch {
    // Non-critical – next full aggregation will fix the count
  }
}

/** Record a practice-time bucket hit (morning / afternoon / night). */
export async function recordPracticeTime(
  hour: number,
): Promise<void> {
  const tod = timeOfDay(hour);
  const ref = doc(db, 'admin_analytics', 'global_stats');
  try {
    await setDoc(
      ref,
      { [`practiceActivity.${tod}`]: increment(1) },
      { merge: true },
    );
  } catch {
    // Non-critical
  }
}

/**
 * Seed the global_stats document with sensible default data.
 * Useful when the collection doesn't exist yet so the dashboard
 * isn't blank on first load.
 */
export async function seedGlobalStats(
  defaults: DashboardData,
): Promise<void> {
  const ref = doc(db, 'admin_analytics', 'global_stats');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      ...defaults,
      lastAggregatedAt: Timestamp.now(),
    });
  }
}
