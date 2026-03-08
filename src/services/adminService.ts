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
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DashboardData } from '../models';

// ─── Helpers ───

/** Classify an hour into a time-of-day bucket. */
function timeOfDay(hour: number): 'morning' | 'afternoon' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
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
