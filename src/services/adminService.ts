

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  increment,
  serverTimestamp,
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

/**
 * Create an announcement document in Firestore.
 * The home screen fetches the latest 3 announcements on mount/refresh,
 * so after calling this the user will see it on the next pull-to-refresh.
 */
export async function createAnnouncementDoc(
  title: string,
  body: string,
  createdBy: string,
): Promise<string> {
  const ref = collection(db, 'announcements');
  const docRef = await addDoc(ref, {
    title,
    body,
    createdBy,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
