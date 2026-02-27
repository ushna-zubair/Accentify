import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type {
  TutorLesson,
  TutorStats,
  TutorScreenData,
  LessonDifficulty,
  LessonStatus,
} from '../models';

// ═══════════════════════════════════════════════
//  SAMPLE LESSON DATA (fallback when Firestore is empty)
// ═══════════════════════════════════════════════

const SAMPLE_LESSONS: TutorLesson[] = [
  {
    id: 'lesson_1',
    title: 'Drinking Conversation',
    description:
      'You meet your friend Sarah for a drink after work. Practice friendly small talk, sharing updates.',
    difficulty: 'Easy',
    category: 'conversation',
    status: 'in_progress',
    order: 1,
  },
  {
    id: 'lesson_2',
    title: 'Interview for a career',
    description:
      "You're in an interview with David for a cybersecurity position. Share your background, skills.",
    difficulty: 'Challenging',
    category: 'conversation',
    status: 'in_progress',
    order: 2,
  },
  {
    id: 'lesson_3',
    title: 'Hanging out friends',
    description:
      'Hang out with your friend Alex and Joe while chatting about your day.',
    difficulty: 'Medium',
    category: 'conversation',
    status: 'upcoming',
    order: 3,
  },
  {
    id: 'lesson_4',
    title: 'English Pronunciation',
    description:
      'Read and get instant feedback from AI on your pronunciation.',
    difficulty: 'Medium',
    category: 'pronunciation',
    status: 'upcoming',
    order: 4,
  },
  {
    id: 'lesson_5',
    title: 'Vocabulary Growth LVL 1',
    description:
      'Learn new words and meanings with help from the AI tutor.',
    difficulty: 'Easy',
    category: 'vocabulary',
    status: 'upcoming',
    order: 5,
  },
];

const DEFAULT_DATA: TutorScreenData = {
  userName: 'Learner',
  stats: { completedLessons: 0, totalHours: 0 },
  recentLessons: [],
  studyPath: [],
};

// ─── Thumbnail category colors (used when no image) ───
export const CATEGORY_COLORS: Record<string, string> = {
  conversation: '#9FB2FD',
  pronunciation: '#FEC79C',
  vocabulary: '#9DE09D',
};

/** Thumbnail getter — returns undefined (no local assets available yet) */
const getThumbnail = (_category: string): any => {
  return undefined;
};

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const useTutorController = () => {
  const [data, setData] = useState<TutorScreenData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutorData = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      // Use sample data for unauthenticated state
      applyFallback();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. User profile
      const userSnap = await getDoc(doc(db, 'users', uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      const fullName = userData?.fullName ?? userData?.profile?.fullName ?? 'Learner';
      const avatarUrl = userData?.profilePictureUrl ?? userData?.profile?.profilePictureUrl;

      // 2. Tutor stats from progress
      const progressSnap = await getDoc(doc(db, 'users', uid, 'progress', 'summary'));
      const progressData = progressSnap.exists() ? progressSnap.data() : {};
      const stats: TutorStats = {
        completedLessons: progressData?.completedLessons ?? 0,
        totalHours: progressData?.totalHours ?? 0,
      };

      // 3. Lessons from Firestore
      let lessons: TutorLesson[] = [];
      try {
        const lessonsRef = collection(db, 'lessons');
        const lessonsQ = query(lessonsRef, orderBy('order', 'asc'));
        const lessonsSnap = await getDocs(lessonsQ);

        if (!lessonsSnap.empty) {
          // Fetch user's lesson progress
          const userLessonsRef = collection(db, 'users', uid, 'lessons');
          const userLessonsSnap = await getDocs(userLessonsRef);
          const userLessonStatus: Record<string, LessonStatus> = {};
          userLessonsSnap.docs.forEach((d) => {
            userLessonStatus[d.id] = (d.data().status as LessonStatus) ?? 'upcoming';
          });

          lessons = lessonsSnap.docs.map((d) => {
            const lData = d.data();
            return {
              id: d.id,
              title: lData.title ?? '',
              description: lData.description ?? '',
              difficulty: (lData.difficulty as LessonDifficulty) ?? 'Easy',
              category: lData.category ?? 'conversation',
              status: userLessonStatus[d.id] ?? 'upcoming',
              order: lData.order ?? 0,
              thumbnail: getThumbnail(lData.category ?? 'conversation'),
            };
          });
        }
      } catch (e: any) {
        console.warn('[Tutor] Lessons fetch warning:', e.message);
      }

      // If no Firestore lessons, use sample data
      if (lessons.length === 0) {
        lessons = SAMPLE_LESSONS.map((l) => ({
          ...l,
          thumbnail: getThumbnail(l.category),
        }));
      }

      // Split into recent (in_progress) and study path (all)
      const recentLessons = lessons.filter((l) => l.status === 'in_progress');
      const studyPath = lessons.filter((l) => l.status !== 'in_progress');

      setData({
        userName: fullName,
        avatarUrl,
        stats: stats.completedLessons > 0 ? stats : { completedLessons: 4, totalHours: 2.3 },
        recentLessons,
        studyPath,
      });
    } catch (e: any) {
      console.error('[Tutor] fetchTutorData error:', e);
      setError(e.message ?? 'Failed to load tutor data');
      applyFallback();
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFallback = () => {
    const lessons = SAMPLE_LESSONS.map((l) => ({
      ...l,
      thumbnail: getThumbnail(l.category),
    }));

    setData({
      userName: 'John Smith',
      stats: { completedLessons: 4, totalHours: 2.3 },
      recentLessons: lessons.filter((l) => l.status === 'in_progress'),
      studyPath: lessons.filter((l) => l.status !== 'in_progress'),
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchTutorData();
  }, [fetchTutorData]);

  return {
    data,
    loading,
    error,
    refresh: fetchTutorData,
  };
};
