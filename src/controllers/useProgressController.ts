import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  fetchFullProgress,
  updateStreak,
  aggregateWeek,
  getWeekStart,
  formatDate,
} from '../services/progressService';
import {
  fetchLevelSnapshot,
  evaluateLevelUp,
  type LevelUpProgress,
} from '../services/levelService';
import type { ProgressData, WeeklyProgress, LessonDay } from '../models';

// ─── Fallback Data (shown while loading / no user) ───

const generateFallbackLessonDays = (): LessonDay[] => {
  const today = new Date();
  const weekStart = getWeekStart(today);
  const days: LessonDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dayOfWeek = date.getDay();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    let status: LessonDay['status'] = 'upcoming';
    if (isToday) status = 'in_progress';

    days.push({
      id: `day-${i}`,
      day: dayOfWeek,
      status,
      date: formatDate(date),
    });
  }
  return days;
};

const EMPTY_PROGRESS: ProgressData = {
  dayStreak: 0,
  lessonDays: generateFallbackLessonDays(),
  currentWeekIndex: 0,
  weeks: [],
};

// ─── Controller Hook ───

export const useProgressController = () => {
  const { currentUser, refreshProfile } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData>(EMPTY_PROGRESS);
  const [levelProgress, setLevelProgress] = useState<LevelUpProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  // ── Fetch all progress data from Firestore ──
  const fetchProgress = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Update streak (increments if needed, no-op if already active today)
      await updateStreak(currentUser.uid);

      // Fetch everything via the progress service
      const data = await fetchFullProgress(currentUser.uid);

      const result: ProgressData = {
        dayStreak: data.dayStreak,
        lessonDays: data.lessonDays,
        currentWeekIndex: data.currentWeekIndex,
        weeks: data.weeks,
      };

      setProgressData(result);
      setSelectedWeekIndex(data.currentWeekIndex);

      // Read (or compute) the CEFR level-up snapshot — drives the new
      // "Your level" + "Next level progress" cards on the Progress screen.
      try {
        const cached = await fetchLevelSnapshot(currentUser.uid);
        let snap = cached;
        if (!snap) {
          snap = await evaluateLevelUp(currentUser.uid);
        }
        setLevelProgress(snap);

        // If the snapshot says we just promoted, the in-memory userProfile
        // still holds the old englishLevel until we refetch. Triggering
        // refreshProfile here means the next exercise picks the band based
        // on the NEW level without forcing a sign-out / sign-in.
        if (snap?.promoted) {
          await refreshProfile().catch((e) =>
            console.warn('[Progress] refreshProfile after promotion failed:', e),
          );
        }
      } catch (levelErr) {
        console.warn('[Progress] level snapshot load failed:', levelErr);
        setLevelProgress(null);
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permissions')) {
        console.warn('[Progress] Firestore permission denied, using fallback');
      } else {
        console.error('Error fetching progress:', e);
      }
      setError(e instanceof Error ? e.message : 'Failed to load progress data');
      setProgressData(EMPTY_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshProfile]);

  // ── Refresh current week (call after an exercise finishes) ──
  const refreshCurrentWeek = useCallback(async () => {
    if (!currentUser) return;
    try {
      const weekStart = getWeekStart(new Date());
      const updated = await aggregateWeek(currentUser.uid, weekStart);

      setProgressData((prev) => {
        const weeks = [...prev.weeks];
        const lastIdx = weeks.length - 1;
        if (lastIdx >= 0) {
          weeks[lastIdx] = updated;
        } else {
          weeks.push(updated);
        }
        return { ...prev, weeks, currentWeekIndex: weeks.length - 1 };
      });
    } catch (e: unknown) {
      console.warn('[Progress] refreshCurrentWeek error:', e);
    }
  }, [currentUser]);

  // ── Week navigation ──
  const selectWeek = useCallback(
    (index: number) => {
      if (index >= 0 && index < progressData.weeks.length) {
        setSelectedWeekIndex(index);
      }
    },
    [progressData.weeks.length],
  );

  // ── Derived getters ──
  const currentWeek: WeeklyProgress | null =
    progressData.weeks[selectedWeekIndex] ?? null;

  const weekLabel =
    currentWeek != null ? `Week ${currentWeek.weekNumber}` : '';

  const weekDateLabel = currentWeek?.weekStartDate ?? '';

  // Refetch on focus so progress reflects the most recent attempts.
  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [fetchProgress]),
  );

  return {
    progressData,
    levelProgress,
    loading,
    error,
    selectedWeekIndex,
    currentWeek,
    weekLabel,
    weekDateLabel,
    fetchProgress,
    refreshCurrentWeek,
    selectWeek,
  };
};
