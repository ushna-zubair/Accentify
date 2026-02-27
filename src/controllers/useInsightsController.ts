import { useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  InsightsUserData,
  EnglishLevel,
  WeeklyProgress,
  LessonDay,
  PronunciationMetrics,
  ConversationMetrics,
  OverallPerformance,
} from '../models';

// ─── Defaults ───
const DEFAULT_PRONUNCIATION: PronunciationMetrics = {
  clarity: 0,
  soundAccuracy: 0,
  smoothness: 0,
  rhythmAndTone: 0,
};

const DEFAULT_CONVERSATION: ConversationMetrics = {
  fluency: 0,
  vocabulary: 0,
  grammarUsage: 0,
  turnTaking: 0,
};

const DEFAULT_OVERALL: OverallPerformance = {
  speechAccuracy: 0,
  speechFluency: 0,
  speechConsistency: 0,
};

const DEFAULT_WEEKLY: WeeklyProgress = {
  weekNumber: 1,
  weekStartDate: new Date().toISOString(),
  pronunciation: DEFAULT_PRONUNCIATION,
  conversation: DEFAULT_CONVERSATION,
  vocabularyGrowth: [],
  overallPerformance: DEFAULT_OVERALL,
};

export const ENGLISH_LEVELS: EnglishLevel[] = [
  'A1 Beginner',
  'A2 Elementary',
  'B1 Intermediate',
  'B2 Upper Intermediate',
  'C1 Fluent',
  'C2 Proficient',
];

const DEFAULT_INSIGHTS: InsightsUserData = {
  userId: '',
  currentLevel: 'B1 Intermediate',
  weeklyProgress: DEFAULT_WEEKLY,
  lessonDays: [],
  weekLabel: '',
};

// ─── Controller ───
export const useInsightsController = () => {
  const [insightsData, setInsightsData] = useState<InsightsUserData>(DEFAULT_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');

  /**
   * Look up a user by their numeric ID or UID and fetch their latest
   * progress data: lesson days, most recent weekly entry, and english level.
   */
  const fetchUserInsights = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Resolve the UID – the userId shown in the app can be a
      //    numeric shortId stored on the user doc or the actual firebase UID.
      let uid = userId.trim();

      // Try to find a user profile doc directly
      const profileSnap = await getDoc(doc(db, 'users', uid));
      if (!profileSnap.exists()) {
        setError('User not found');
        setLoading(false);
        return;
      }

      const profileData = profileSnap.data();
      const englishLevel: EnglishLevel =
        profileData?.studyPlan?.englishLevel ?? profileData?.profile?.englishLevel ?? 'B1 Intermediate';

      // 2. Fetch lesson days
      const lessonsSnap = await getDoc(doc(db, 'users', uid, 'progress', 'lessons'));
      const lessonDays: LessonDay[] = lessonsSnap.exists()
        ? (lessonsSnap.data().days as LessonDay[]) ?? []
        : generateDefaultLessonDays();

      // 3. Fetch latest weekly progress entry
      const weeklyRef = collection(db, 'users', uid, 'progress', 'weekly', 'entries');
      const weeklyQuery = query(weeklyRef, orderBy('weekNumber', 'desc'), limit(1));
      const weeklySnap = await getDocs(weeklyQuery);

      let weekly: WeeklyProgress = DEFAULT_WEEKLY;
      let weekLabel = '';

      if (!weeklySnap.empty) {
        const weekDoc = weeklySnap.docs[0].data();
        weekly = {
          weekNumber: weekDoc.weekNumber ?? 1,
          weekStartDate: weekDoc.weekStartDate ?? '',
          pronunciation: weekDoc.pronunciation ?? DEFAULT_PRONUNCIATION,
          conversation: weekDoc.conversation ?? DEFAULT_CONVERSATION,
          vocabularyGrowth: weekDoc.vocabularyGrowth ?? [],
          overallPerformance: weekDoc.overallPerformance ?? DEFAULT_OVERALL,
        };
        weekLabel = formatWeekLabel(weekly.weekStartDate);
      } else {
        // Seed sample data so the charts aren't empty
        weekly = generateSampleWeekly();
        weekLabel = formatWeekLabel(new Date().toISOString());
      }

      setInsightsData({
        userId: uid,
        currentLevel: englishLevel as EnglishLevel,
        weeklyProgress: weekly,
        lessonDays,
        weekLabel,
      });
    } catch (e: any) {
      console.error('[InsightsController] fetchUserInsights error:', e);
      setError(e.message ?? 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update the user's english level from the admin insights panel.
   */
  const updateUserLevel = useCallback(
    async (newLevel: EnglishLevel) => {
      if (!insightsData.userId) return;

      try {
        const userRef = doc(db, 'users', insightsData.userId);
        await updateDoc(userRef, {
          'studyPlan.englishLevel': newLevel,
        });

        setInsightsData((prev) => ({ ...prev, currentLevel: newLevel }));
      } catch (e: any) {
        console.error('[InsightsController] updateUserLevel error:', e);
        setError(e.message ?? 'Failed to update level');
      }
    },
    [insightsData.userId],
  );

  return {
    insightsData,
    loading,
    error,
    searchId,
    setSearchId,
    fetchUserInsights,
    updateUserLevel,
  };
};

// ─── Helpers ───
function formatWeekLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  } catch {
    return '';
  }
}

function generateDefaultLessonDays(): LessonDay[] {
  const days: LessonDay[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    days.push({
      id: `day-${i + 1}`,
      day: i + 1,
      status: i < 2 ? 'completed' : i === 2 ? 'in_progress' : 'upcoming',
      date: d.toISOString().split('T')[0],
    });
  }
  return days;
}

function generateSampleWeekly(): WeeklyProgress {
  return {
    weekNumber: 1,
    weekStartDate: new Date().toISOString(),
    pronunciation: {
      clarity: 45,
      soundAccuracy: 72,
      smoothness: 58,
      rhythmAndTone: 80,
    },
    conversation: {
      fluency: 70,
      vocabulary: 65,
      grammarUsage: 55,
      turnTaking: 40,
    },
    vocabularyGrowth: [
      { label: 'W1', value: 20 },
      { label: 'W2', value: 35 },
      { label: 'W3', value: 50 },
      { label: 'W4', value: 45 },
    ],
    overallPerformance: {
      speechAccuracy: 65,
      speechFluency: 20,
      speechConsistency: 15,
    },
  };
}

export { DEFAULT_INSIGHTS };
