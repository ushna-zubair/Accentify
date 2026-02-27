import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import type {
  ProgressData,
  WeeklyProgress,
  LessonDay,
  PronunciationMetrics,
  ConversationMetrics,
  VocabularyGrowthPoint,
  OverallPerformance,
} from '../models';

// ─── Helpers ───

/** Get the Monday-based ISO week number for a date. */
const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/** Format a Date to "MMM-DD-YYYY". */
const formatDate = (d: Date): string => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = String(d.getDate()).padStart(2, '0');
  return `${months[d.getMonth()]}-${day}-${d.getFullYear()}`;
};

/** Get the Monday of the week for a given date. */
const getWeekStart = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Seed / Default Data ───

const generateDefaultLessonDays = (): LessonDay[] => {
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
    if (date < today && !isToday) status = 'completed';
    else if (isToday) status = 'in_progress';
    days.push({
      id: `day-${i}`,
      day: dayOfWeek,
      status,
      date: formatDate(date),
    });
  }
  return days;
};

const DEFAULT_PRONUNCIATION: PronunciationMetrics = {
  clarity: 45,
  soundAccuracy: 62,
  smoothness: 38,
  rhythmAndTone: 80,
};

const DEFAULT_CONVERSATION: ConversationMetrics = {
  fluency: 72,
  vocabulary: 55,
  grammarUsage: 40,
  turnTaking: 30,
};

const DEFAULT_VOCABULARY_GROWTH: VocabularyGrowthPoint[] = [
  { label: 'W1', value: 20 },
  { label: 'W2', value: 35 },
  { label: 'W3', value: 28 },
  { label: 'W4', value: 50 },
  { label: 'W5', value: 42 },
  { label: 'W6', value: 65 },
  { label: 'W7', value: 58 },
  { label: 'W8', value: 78 },
];

const DEFAULT_OVERALL: OverallPerformance = {
  speechAccuracy: 55,
  speechFluency: 34,
  speechConsistency: 11,
};

const buildDefaultWeek = (): WeeklyProgress => ({
  weekNumber: getWeekNumber(new Date()),
  weekStartDate: formatDate(getWeekStart(new Date())),
  pronunciation: DEFAULT_PRONUNCIATION,
  conversation: DEFAULT_CONVERSATION,
  vocabularyGrowth: DEFAULT_VOCABULARY_GROWTH,
  overallPerformance: DEFAULT_OVERALL,
});

export const DEFAULT_PROGRESS: ProgressData = {
  dayStreak: 2,
  lessonDays: generateDefaultLessonDays(),
  currentWeekIndex: 0,
  weeks: [buildDefaultWeek()],
};

// ─── Controller Hook ───

export const useProgressController = () => {
  const { currentUser } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  // ── Fetch progress from Firestore ──
  const fetchProgress = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Read streak document
      const streakRef = doc(db, 'users', currentUser.uid, 'progress', 'streak');
      const streakSnap = await getDoc(streakRef);

      // 2. Read lesson-days document
      const lessonsRef = doc(db, 'users', currentUser.uid, 'progress', 'lessons');
      const lessonsSnap = await getDoc(lessonsRef);

      // 3. Read weekly progress sub-collection (ordered by weekNumber)
      const weeksRef = collection(
        db,
        'users',
        currentUser.uid,
        'progress',
        'weekly',
        'entries',
      );
      const weeksQuery = query(weeksRef, orderBy('weekNumber', 'asc'));
      const weeksSnap = await getDocs(weeksQuery);

      let dayStreak = DEFAULT_PROGRESS.dayStreak;
      let lessonDays = DEFAULT_PROGRESS.lessonDays;
      let weeks = DEFAULT_PROGRESS.weeks;

      if (streakSnap.exists()) {
        dayStreak = streakSnap.data().dayStreak ?? dayStreak;
      }

      if (lessonsSnap.exists()) {
        const data = lessonsSnap.data();
        if (data.days && Array.isArray(data.days)) {
          lessonDays = data.days as LessonDay[];
        }
      }

      if (!weeksSnap.empty) {
        weeks = weeksSnap.docs.map((d) => d.data() as WeeklyProgress);
      }

      const result: ProgressData = {
        dayStreak,
        lessonDays,
        currentWeekIndex: weeks.length - 1,
        weeks,
      };

      setProgressData(result);
      setSelectedWeekIndex(weeks.length - 1);
    } catch (e: any) {
      console.error('Error fetching progress:', e);
      setError(e.message ?? 'Failed to load progress data');
      // Fall back to defaults so screen still renders
      setProgressData(DEFAULT_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ── Seed initial progress data to Firestore ──
  const seedProgressData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const streakRef = doc(db, 'users', currentUser.uid, 'progress', 'streak');
      await setDoc(streakRef, {
        dayStreak: DEFAULT_PROGRESS.dayStreak,
        lastActiveDate: Timestamp.now(),
      });

      const lessonsRef = doc(db, 'users', currentUser.uid, 'progress', 'lessons');
      await setDoc(lessonsRef, {
        days: DEFAULT_PROGRESS.lessonDays,
        updatedAt: Timestamp.now(),
      });

      const defaultWeek = buildDefaultWeek();
      const weekRef = doc(
        db,
        'users',
        currentUser.uid,
        'progress',
        'weekly',
        'entries',
        `week-${defaultWeek.weekNumber}`,
      );
      await setDoc(weekRef, {
        ...defaultWeek,
        createdAt: Timestamp.now(),
      });

      await fetchProgress();
    } catch (e: any) {
      console.error('Error seeding progress:', e);
      setError(e.message ?? 'Failed to seed progress data');
    }
  }, [currentUser, fetchProgress]);

  // ── Update day streak ──
  const updateDayStreak = useCallback(
    async (newStreak: number) => {
      if (!currentUser) return;
      try {
        const streakRef = doc(db, 'users', currentUser.uid, 'progress', 'streak');
        await setDoc(
          streakRef,
          { dayStreak: newStreak, lastActiveDate: Timestamp.now() },
          { merge: true },
        );
        setProgressData((prev) => ({ ...prev, dayStreak: newStreak }));
      } catch (e: any) {
        console.error('Error updating streak:', e);
      }
    },
    [currentUser],
  );

  // ── Update lesson status ──
  const updateLessonStatus = useCallback(
    async (lessonId: string, status: LessonDay['status']) => {
      if (!currentUser) return;
      try {
        const updatedDays = progressData.lessonDays.map((d) =>
          d.id === lessonId ? { ...d, status } : d,
        );
        const lessonsRef = doc(db, 'users', currentUser.uid, 'progress', 'lessons');
        await setDoc(lessonsRef, { days: updatedDays, updatedAt: Timestamp.now() });
        setProgressData((prev) => ({ ...prev, lessonDays: updatedDays }));
      } catch (e: any) {
        console.error('Error updating lesson:', e);
      }
    },
    [currentUser, progressData.lessonDays],
  );

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

  // ── Auto-fetch on mount ──
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progressData,
    loading,
    error,
    selectedWeekIndex,
    currentWeek,
    weekLabel,
    weekDateLabel,
    fetchProgress,
    seedProgressData,
    updateDayStreak,
    updateLessonStatus,
    selectWeek,
  };
};
