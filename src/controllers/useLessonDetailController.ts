import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { LessonDetailData, LessonDifficulty, LessonStatus } from '../models';

// ═══════════════════════════════════════════════
//  SAMPLE LESSON DETAIL DATA
// ═══════════════════════════════════════════════

const SAMPLE_DETAILS: Record<string, LessonDetailData> = {
  lesson_1: {
    id: 'lesson_1',
    title: 'Drinking Conversation',
    fullDescription:
      'Practice casual conversation with the AI tutor. You meet your friend Sarah for a drink after work. Learn to make small talk, share updates about your day, and respond naturally to questions.',
    category: 'conversation',
    difficulty: 'Easy',
    focusTips: [
      'Use casual and friendly language',
      'Practice active listening responses',
    ],
    status: 'in_progress',
  },
  lesson_2: {
    id: 'lesson_2',
    title: 'Conversation',
    fullDescription:
      "You're in an interview with David for a cybersecurity position. Practice introducing yourself, discussing your background, and answering common interview questions.",
    category: 'conversation',
    difficulty: 'Challenging',
    focusTips: [
      'Use formal and professional language',
      'Structure your answers clearly',
      'Practice the STAR method for responses',
    ],
    status: 'in_progress',
  },
  lesson_3: {
    id: 'lesson_3',
    title: 'Conversation',
    fullDescription:
      'Improve your casual English by hanging out with friends. Engage in everyday conversations with Alex and Joe. Learn slang, idioms, and how to express opinions naturally.',
    category: 'conversation',
    difficulty: 'Medium',
    focusTips: [
      'Use natural expressions and idioms',
      'Practice expressing opinions',
    ],
    status: 'upcoming',
  },
  lesson_4: {
    id: 'lesson_4',
    title: 'English Pronunciation',
    fullDescription:
      'Enhance your pronunciation with the AI speech tutor. Practice speaking, get instant feedback, and improve how you sound in real conversations.',
    category: 'pronunciation',
    difficulty: 'Medium',
    focusTips: [
      'Clear and Natural Speaking',
      'Accent and Word Stress',
      'Real-Time AI Feedback',
    ],
    status: 'upcoming',
  },
  lesson_5: {
    id: 'lesson_5',
    title: 'Vocabulary Growth',
    fullDescription:
      'Expand your vocabulary with the AI tutor. Learn new words, understand their meanings, and practice using them in real-life sentences.',
    category: 'vocabulary',
    difficulty: 'Easy',
    focusTips: [
      'Focus on Context',
      'Understand and Learn Word Differences',
    ],
    status: 'upcoming',
  },
};

const DEFAULT_DETAIL: LessonDetailData = {
  id: '',
  title: '',
  fullDescription: '',
  category: 'conversation',
  difficulty: 'Easy',
  focusTips: [],
  status: 'upcoming',
};

// ═══════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════

export const useLessonDetailController = (lessonId: string) => {
  const [detail, setDetail] = useState<LessonDetailData>(DEFAULT_DETAIL);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!lessonId) return;

    try {
      setLoading(true);
      setError(null);

      const uid = auth.currentUser?.uid;

      // 1. Try Firestore lesson doc
      let lessonData: LessonDetailData | null = null;

      try {
        const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
        if (lessonSnap.exists()) {
          const data = lessonSnap.data();

          // Get user-specific status
          let status: LessonStatus = 'upcoming';
          if (uid) {
            try {
              const userLessonSnap = await getDoc(
                doc(db, 'users', uid, 'lessons', lessonId),
              );
              if (userLessonSnap.exists()) {
                status = (userLessonSnap.data().status as LessonStatus) ?? 'upcoming';
              }
            } catch {
              // ignore
            }
          }

          lessonData = {
            id: lessonSnap.id,
            title: data.title ?? '',
            fullDescription: data.fullDescription ?? data.description ?? '',
            category: data.category ?? 'conversation',
            difficulty: (data.difficulty as LessonDifficulty) ?? 'Easy',
            focusTips: data.focusTips ?? [],
            imageUrl: data.imageUrl,
            status,
          };
        }
      } catch (e: any) {
        console.warn('[LessonDetail] Firestore fetch warning:', e.message);
      }

      // 2. Fallback to sample data
      if (!lessonData) {
        lessonData = SAMPLE_DETAILS[lessonId] ?? {
          ...DEFAULT_DETAIL,
          id: lessonId,
          title: 'Lesson',
          fullDescription: 'Start this lesson to practice your English skills with the AI tutor.',
          focusTips: ['Stay focused and practice consistently'],
        };
      }

      setDetail(lessonData);
    } catch (e: any) {
      console.error('[LessonDetail] fetchDetail error:', e);
      setError(e.message ?? 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Start / Continue the lesson ──
  const startLesson = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      setStarting(true);
      setError(null);

      // Mark lesson as in_progress for this user
      const userLessonRef = doc(db, 'users', uid, 'lessons', lessonId);
      await setDoc(
        userLessonRef,
        {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          lessonId,
        },
        { merge: true },
      );

      // Update the local detail
      setDetail((prev) => ({ ...prev, status: 'in_progress' }));

      // Also update the user progress summary
      try {
        const summaryRef = doc(db, 'users', uid, 'progress', 'summary');
        const summarySnap = await getDoc(summaryRef);
        if (summarySnap.exists()) {
          const data = summarySnap.data();
          await updateDoc(summaryRef, {
            lastActiveAt: new Date().toISOString(),
            totalSessions: (data.totalSessions ?? 0) + 1,
          });
        } else {
          await setDoc(summaryRef, {
            completedLessons: 0,
            totalHours: 0,
            totalSessions: 1,
            lastActiveAt: new Date().toISOString(),
          });
        }
      } catch {
        // Non-critical, ignore
      }
    } catch (e: any) {
      console.error('[LessonDetail] startLesson error:', e);
      setError(e.message ?? 'Failed to start lesson');
    } finally {
      setStarting(false);
    }
  }, [lessonId]);

  return {
    detail,
    loading,
    starting,
    error,
    startLesson,
  };
};
