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
  AdminVocabPairForm,
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
    level: d.level ?? 1,
    estimatedMinutes: d.estimatedMinutes ?? 15,
    completionMessage: d.completionMessage ?? '',
    completionImageUrl: d.completionImageUrl ?? '',
    tags: d.tags ?? [],
    prerequisites: d.prerequisites ?? [],
    passingScore: d.passingScore ?? 70,
    maxAttempts: d.maxAttempts ?? 0,
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

/** Lesson fields that go to the main document (excludes vocabPairs sub-collection) */
type LessonDocFields = Omit<AdminLessonFormData, 'vocabPairs'>;

// ─── Create lesson ───
export const createLesson = async (
  formData: LessonDocFields,
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
  formData: Partial<LessonDocFields>,
): Promise<void> => {
  await updateDoc(doc(db, LESSONS_COL, lessonId), {
    ...formData,
    updatedAt: serverTimestamp(),
  });
};

// ─── Delete lesson (cascade vocabPairs) ───
export const deleteLesson = async (lessonId: string): Promise<void> => {
  // First delete all vocabPairs in the sub-collection
  const pairsSnap = await getDocs(collection(db, LESSONS_COL, lessonId, 'vocabPairs'));
  const deletions = pairsSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletions);
  // Then delete the lesson document
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

// ─── Duplicate lesson (including vocabPairs) ───
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
    level: data.level ?? 1,
    estimatedMinutes: data.estimatedMinutes ?? 15,
    completionMessage: data.completionMessage ?? '',
    completionImageUrl: data.completionImageUrl ?? '',
    tags: data.tags ?? [],
    prerequisites: data.prerequisites ?? [],
    passingScore: data.passingScore ?? 70,
    maxAttempts: data.maxAttempts ?? 0,
    createdBy: adminUid,
    enrolledCount: 0,
    completedCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Copy vocab pairs to the new lesson
  const pairsSnap = await getDocs(collection(db, LESSONS_COL, lessonId, 'vocabPairs'));
  const copies = pairsSnap.docs.map((d) => {
    const pd = d.data();
    return addDoc(collection(db, LESSONS_COL, docRef.id, 'vocabPairs'), {
      basicWord: pd.basicWord ?? '',
      vocabWord: pd.vocabWord ?? '',
      basicPhonetic: pd.basicPhonetic ?? '',
      vocabPhonetic: pd.vocabPhonetic ?? '',
      basicDefinition: pd.basicDefinition ?? '',
      vocabDefinition: pd.vocabDefinition ?? '',
      exampleSentence: pd.exampleSentence ?? '',
    });
  });
  await Promise.all(copies);

  return docRef.id;
};

// ═══════════════════════════════════════════════
//  VOCAB PAIR CRUD
// ═══════════════════════════════════════════════

/** Fetch all vocab pairs for a lesson */
export const fetchVocabPairs = async (lessonId: string): Promise<AdminVocabPairForm[]> => {
  const snap = await getDocs(collection(db, LESSONS_COL, lessonId, 'vocabPairs'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      basicWord: data.basicWord ?? '',
      vocabWord: data.vocabWord ?? '',
      basicPhonetic: data.basicPhonetic ?? '',
      vocabPhonetic: data.vocabPhonetic ?? '',
      basicDefinition: data.basicDefinition ?? '',
      vocabDefinition: data.vocabDefinition ?? '',
      exampleSentence: data.exampleSentence ?? '',
    };
  });
};

/** Save all vocab pairs for a lesson (replaces existing set) */
export const saveVocabPairs = async (
  lessonId: string,
  pairs: AdminVocabPairForm[],
): Promise<void> => {
  const colRef = collection(db, LESSONS_COL, lessonId, 'vocabPairs');

  // Delete existing pairs
  const existing = await getDocs(colRef);
  const deletions = existing.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletions);

  // Write new pairs
  const additions = pairs.map((p) =>
    addDoc(colRef, {
      basicWord: p.basicWord,
      vocabWord: p.vocabWord,
      basicPhonetic: p.basicPhonetic,
      vocabPhonetic: p.vocabPhonetic,
      basicDefinition: p.basicDefinition,
      vocabDefinition: p.vocabDefinition,
      exampleSentence: p.exampleSentence,
    }),
  );
  await Promise.all(additions);
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
