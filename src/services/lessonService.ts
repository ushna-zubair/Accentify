/**
 * lessonService.ts
 *
 * Firestore CRUD for the admin Manage Lessons feature.
 * Operates on the top-level `lessons` collection.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  getCountFromServer,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  AdminLesson,
  AdminLessonFormData,
  AdminLessonStats,
  LessonCategory,
  AdminLessonStatus,
} from '../models';

const LESSONS_COL = 'lessons';

// ─── Helpers ───
const tsToISO = (ts: any): string => {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date(ts).toISOString();
};

const mapLessonDoc = (docSnap: any): AdminLesson => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    title: d.title ?? '',
    description: d.description ?? '',
    fullDescription: d.fullDescription ?? d.description ?? '',
    category: d.category ?? 'conversation',
    difficulty: d.difficulty ?? 'Easy',
    order: d.order ?? 0,
    status: d.status ?? 'published',
    focusTips: d.focusTips ?? [],
    imageUrl: d.imageUrl ?? '',
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
    createdBy: d.createdBy ?? '',
    enrolledCount: d.enrolledCount ?? 0,
    completedCount: d.completedCount ?? 0,
    vocabPairCount: d.vocabPairCount ?? 0,
  };
};

// ─── Fetch all lessons ───
export const fetchAllLessons = async (): Promise<AdminLesson[]> => {
  const q = query(collection(db, LESSONS_COL), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  const lessons = snap.docs.map(mapLessonDoc);

  // Enrich with vocab pair counts
  const enriched = await Promise.all(
    lessons.map(async (lesson) => {
      try {
        const vocabRef = collection(db, LESSONS_COL, lesson.id, 'vocabPairs');
        const vocabSnap = await getCountFromServer(vocabRef);
        return { ...lesson, vocabPairCount: vocabSnap.data().count };
      } catch {
        return lesson;
      }
    }),
  );

  return enriched;
};

// ─── Create lesson ───
export const createLesson = async (
  formData: AdminLessonFormData,
  adminUid: string,
): Promise<string> => {
  const docRef = await addDoc(collection(db, LESSONS_COL), {
    ...formData,
    createdBy: adminUid,
    enrolledCount: 0,
    completedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── Update lesson ───
export const updateLesson = async (
  lessonId: string,
  formData: Partial<AdminLessonFormData>,
): Promise<void> => {
  await updateDoc(doc(db, LESSONS_COL, lessonId), {
    ...formData,
    updatedAt: serverTimestamp(),
  });
};

// ─── Delete lesson ───
export const deleteLesson = async (lessonId: string): Promise<void> => {
  await deleteDoc(doc(db, LESSONS_COL, lessonId));
};

// ─── Update lesson status ───
export const updateLessonStatus = async (
  lessonId: string,
  newStatus: AdminLessonStatus,
): Promise<void> => {
  await updateDoc(doc(db, LESSONS_COL, lessonId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
};

// ─── Reorder lesson ───
export const updateLessonOrder = async (
  lessonId: string,
  newOrder: number,
): Promise<void> => {
  await updateDoc(doc(db, LESSONS_COL, lessonId), {
    order: newOrder,
    updatedAt: serverTimestamp(),
  });
};

// ─── Duplicate lesson ───
export const duplicateLesson = async (
  lessonId: string,
  adminUid: string,
): Promise<string> => {
  const snap = await getDoc(doc(db, LESSONS_COL, lessonId));
  if (!snap.exists()) throw new Error('Lesson not found');
  const data = snap.data();

  const docRef = await addDoc(collection(db, LESSONS_COL), {
    title: (data.title ?? '') + ' (Copy)',
    description: data.description ?? '',
    fullDescription: data.fullDescription ?? '',
    category: data.category ?? 'conversation',
    difficulty: data.difficulty ?? 'Easy',
    order: (data.order ?? 0) + 1,
    status: 'draft',
    focusTips: data.focusTips ?? [],
    imageUrl: data.imageUrl ?? '',
    createdBy: adminUid,
    enrolledCount: 0,
    completedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── Compute stats from items ───
export const computeLessonStats = (items: AdminLesson[]): AdminLessonStats => {
  const total = items.length;
  const published = items.filter((i) => i.status === 'published').length;
  const draft = items.filter((i) => i.status === 'draft').length;
  const archived = items.filter((i) => i.status === 'archived').length;
  const totalEnrolled = items.reduce((sum, i) => sum + i.enrolledCount, 0);
  const totalCompleted = items.reduce((sum, i) => sum + i.completedCount, 0);
  const byCategory: Record<LessonCategory, number> = {
    conversation: items.filter((i) => i.category === 'conversation').length,
    pronunciation: items.filter((i) => i.category === 'pronunciation').length,
    vocabulary: items.filter((i) => i.category === 'vocabulary').length,
  };
  return { total, published, draft, archived, totalEnrolled, totalCompleted, byCategory };
};
