/**
 * useDashboardAnalytics – Fetches the pre-aggregated admin analytics document.
 *
 * Reads from: `admin_analytics/global_stats`
 *
 * If the document doesn't exist yet it seeds it with sensible defaults
 * and triggers a client-side aggregation so the dashboard is never blank.
 *
 * Returns:
 *   • data      – The `DashboardData` object, or `null` while loading / on error.
 *   • isLoading – `true` while the initial fetch is in flight.
 *   • error     – A human-readable error string, or `null`.
 *   • refetch   – Call to re-fetch manually (e.g. pull-to-refresh).
 *   • runAggregation – Trigger a full re-aggregation from user data.
 */

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DashboardData } from '../models';
import {
  seedGlobalStats,
  aggregateGlobalStats,
} from '../services/adminService';

// Sensible defaults so the dashboard is never totally empty
const SEED_DATA: DashboardData = {
  activeUsers: 0,
  growthPct: 0,
  usageDateRange: '',
  weeklyBarData: [
    { label: 'Mon', thisWeek: 0, lastWeek: 0 },
    { label: 'Tue', thisWeek: 0, lastWeek: 0 },
    { label: 'Wed', thisWeek: 0, lastWeek: 0 },
    { label: 'Thur', thisWeek: 0, lastWeek: 0 },
    { label: 'Fri', thisWeek: 0, lastWeek: 0 },
    { label: 'Sat', thisWeek: 0, lastWeek: 0 },
    { label: 'Sun', thisWeek: 0, lastWeek: 0 },
  ],
  practiceActivity: { morning: 0, afternoon: 0, night: 0 },
  pronunciationAccuracy: 0,
  fluencyAccuracy: 0,
  vocabularyRetention: 0,
  topLearners: [],
  totalSessions: 0,
  sessionsGrowth: 0,
  sessionsThisWeek: [],
  sessionsLastWeek: [],
};

export interface UseDashboardAnalyticsResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  runAggregation: () => Promise<void>;
}

export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snap = await getDoc(doc(db, 'admin_analytics', 'global_stats'));

      if (snap.exists()) {
        const raw = snap.data();

        const parsed: DashboardData = {
          activeUsers: raw.activeUsers ?? 0,
          growthPct: raw.growthPct ?? 0,
          usageDateRange: raw.usageDateRange ?? '',
          weeklyBarData: raw.weeklyBarData ?? [],
          practiceActivity: raw.practiceActivity ?? { morning: 0, afternoon: 0, night: 0 },
          pronunciationAccuracy: raw.pronunciationAccuracy ?? 0,
          fluencyAccuracy: raw.fluencyAccuracy ?? 0,
          vocabularyRetention: raw.vocabularyRetention ?? 0,
          topLearners: raw.topLearners ?? [],
          totalSessions: raw.totalSessions ?? 0,
          sessionsGrowth: raw.sessionsGrowth ?? 0,
          sessionsThisWeek: raw.sessionsThisWeek ?? [],
          sessionsLastWeek: raw.sessionsLastWeek ?? [],
        };

        setData(parsed);
      } else {
        // Document doesn't exist yet – seed it and try to aggregate
        await seedGlobalStats(SEED_DATA);
        try {
          const aggregated = await aggregateGlobalStats();
          setData(aggregated);
        } catch {
          // Aggregation may fail if no user data exists yet – use seed
          setData(SEED_DATA);
        }
      }
    } catch (e: any) {
      console.error('useDashboardAnalytics fetch error:', e);
      setError(e.message || 'Failed to load dashboard analytics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Trigger a full re-aggregation and refresh the data. */
  const runAggregation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const aggregated = await aggregateGlobalStats();
      setData(aggregated);
    } catch (e: any) {
      console.error('useDashboardAnalytics aggregation error:', e);
      setError(e.message || 'Failed to aggregate analytics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, isLoading, error, refetch: fetchAnalytics, runAggregation };
}
