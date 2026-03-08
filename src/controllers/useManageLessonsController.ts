/**
 * useManageLessonsController.ts
 *
 * Controller for the Admin Manage Lessons screen.
 * Handles lesson CRUD, filtering, sorting, and form state.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  AdminLesson,
  AdminLessonFormData,
  AdminLessonStats,
  AdminLessonStatus,
  AdminVocabPairForm,
  LessonCategory,
  ManageLessonsTab,
} from '../models';
import {
  DEFAULT_LESSON_FORM,
  DEFAULT_VOCAB_PAIR,
  LESSON_CATEGORY_LABELS,
  ADMIN_LESSON_STATUS_LABELS,
} from '../models';
import {
  fetchAllLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  updateLessonStatus,
  duplicateLesson,
  computeLessonStats,
  fetchVocabPairs,
  saveVocabPairs,
} from '../services/lessonService';

/**
 * Send a notification to all non-admin users about a new lesson
 * via the server-side sendNotificationFanout Cloud Function.
 */
async function notifyUsersAboutLesson(title: string, _lessonId: string): Promise<void> {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions(undefined, 'us-central1');
    const fanout = httpsCallable(functions, 'sendNotificationFanout');
    await fanout({
      title: `📚 New lesson available: ${title}`,
      body: `A new lesson "${title}" has been published.`,
      type: 'new_lesson',
    });
  } catch (err) {
    console.warn('[ManageLessons] Failed to send lesson notifications:', err);
  }
}

export const useManageLessonsController = () => {
  const { currentUser } = useAuth();

  // ── Data state ──
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Tabs & filters ──
  const [activeTab, setActiveTab] = useState<ManageLessonsTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LessonCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'newest' | 'title' | 'enrolled'>('order');

  // ── Modal state ──
  const [formVisible, setFormVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [formData, setFormData] = useState<AdminLessonFormData>({ ...DEFAULT_LESSON_FORM });
  const [focusTipInput, setFocusTipInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // ── Vocab pair editing state ──
  const [editingPairIndex, setEditingPairIndex] = useState<number | null>(null);
  const [pairFormData, setPairFormData] = useState<AdminVocabPairForm>({ ...DEFAULT_VOCAB_PAIR });
  const [pairFormVisible, setPairFormVisible] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState(false);
  /** Current step in the lesson form: 'details' or 'vocabPairs' */
  const [formStep, setFormStep] = useState<'details' | 'vocabPairs'>('details');

  const adminUid = currentUser?.uid ?? '';

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllLessons();
      setLessons(data);
    } catch (e: unknown) {
      console.error('[ManageLessons] fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchAll();
    return () => { ignore = true; };
  }, [fetchAll]);

  // ── Stats ──
  const stats: AdminLessonStats = useMemo(() => computeLessonStats(lessons), [lessons]);

  // ── Filtered & sorted ──
  const filteredLessons = useMemo(() => {
    let result = [...lessons];

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter((l) => l.status === activeTab);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((l) => l.category === categoryFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortBy) {
      case 'order':
        result.sort((a, b) => a.order - b.order);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'enrolled':
        result.sort((a, b) => b.enrolledCount - a.enrolledCount);
        break;
    }

    return result;
  }, [lessons, activeTab, categoryFilter, searchQuery, sortBy]);

  // ── Open create form ──
  const openCreateForm = useCallback(() => {
    setEditingLesson(null);
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
    const nextLevel = lessons.length > 0 ? Math.max(...lessons.map((l) => l.level ?? 1)) : 1;
    setFormData({ ...DEFAULT_LESSON_FORM, order: nextOrder, level: nextLevel });
    setFocusTipInput('');
    setTagInput('');
    setEditingPairIndex(null);
    setPairFormData({ ...DEFAULT_VOCAB_PAIR });
    setPairFormVisible(false);
    setFormStep('details');
    setFormVisible(true);
  }, [lessons]);

  // ── Open edit form (fetches vocab pairs from Firestore) ──
  const openEditForm = useCallback(async (lesson: AdminLesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      fullDescription: lesson.fullDescription,
      category: lesson.category,
      difficulty: lesson.difficulty,
      order: lesson.order,
      status: lesson.status,
      focusTips: [...lesson.focusTips],
      imageUrl: lesson.imageUrl,
      level: lesson.level ?? 1,
      estimatedMinutes: lesson.estimatedMinutes ?? 15,
      completionMessage: lesson.completionMessage ?? '',
      completionImageUrl: lesson.completionImageUrl ?? '',
      tags: [...(lesson.tags ?? [])],
      prerequisites: [...(lesson.prerequisites ?? [])],
      passingScore: lesson.passingScore ?? 70,
      maxAttempts: lesson.maxAttempts ?? 0,
      vocabPairs: [],
    });
    setFocusTipInput('');
    setTagInput('');
    setEditingPairIndex(null);
    setPairFormData({ ...DEFAULT_VOCAB_PAIR });
    setPairFormVisible(false);
    setFormStep('details');
    setFormVisible(true);

    // Fetch vocab pairs asynchronously
    try {
      setLoadingPairs(true);
      const pairs = await fetchVocabPairs(lesson.id);
      setFormData((prev) => ({ ...prev, vocabPairs: pairs }));
    } catch (e: unknown) {
      console.warn('[ManageLessons] Failed to fetch vocab pairs:', e);
    } finally {
      setLoadingPairs(false);
    }
  }, []);

  // ── Close form ──
  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingLesson(null);
    setFormData({ ...DEFAULT_LESSON_FORM });
    setFocusTipInput('');
    setTagInput('');
    setEditingPairIndex(null);
    setPairFormData({ ...DEFAULT_VOCAB_PAIR });
    setPairFormVisible(false);
    setFormStep('details');
  }, []);

  // ── Update form field ──
  const updateFormField = useCallback(<K extends keyof AdminLessonFormData>(
    key: K,
    value: AdminLessonFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Focus tips management ──
  const addFocusTip = useCallback(() => {
    if (!focusTipInput.trim()) return;
    setFormData((prev) => ({ ...prev, focusTips: [...prev.focusTips, focusTipInput.trim()] }));
    setFocusTipInput('');
  }, [focusTipInput]);

  const removeFocusTip = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      focusTips: prev.focusTips.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Tags management ──
  const addTag = useCallback(() => {
    if (!tagInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagInput.trim()) ? prev.tags : [...prev.tags, tagInput.trim()],
    }));
    setTagInput('');
  }, [tagInput]);

  const removeTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Prerequisites management ──
  const addPrerequisite = useCallback((lessonId: string) => {
    if (!lessonId.trim()) return;
    setFormData((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.includes(lessonId) ? prev.prerequisites : [...prev.prerequisites, lessonId],
    }));
  }, []);

  const removePrerequisite = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Vocab pair form management ──
  const openAddPairForm = useCallback(() => {
    setEditingPairIndex(null);
    setPairFormData({ ...DEFAULT_VOCAB_PAIR, id: `new_${Date.now()}` });
    setPairFormVisible(true);
  }, []);

  const openEditPairForm = useCallback((index: number) => {
    const pair = formData.vocabPairs[index];
    if (pair) {
      setEditingPairIndex(index);
      setPairFormData({ ...pair });
      setPairFormVisible(true);
    }
  }, [formData.vocabPairs]);

  const closePairForm = useCallback(() => {
    setPairFormVisible(false);
    setEditingPairIndex(null);
    setPairFormData({ ...DEFAULT_VOCAB_PAIR });
  }, []);

  const updatePairField = useCallback(<K extends keyof AdminVocabPairForm>(
    key: K,
    value: AdminVocabPairForm[K],
  ) => {
    setPairFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const savePair = useCallback(() => {
    if (!pairFormData.basicWord.trim() || !pairFormData.vocabWord.trim()) return;
    setFormData((prev) => {
      const pairs = [...prev.vocabPairs];
      if (editingPairIndex !== null) {
        pairs[editingPairIndex] = { ...pairFormData };
      } else {
        pairs.push({ ...pairFormData });
      }
      return { ...prev, vocabPairs: pairs };
    });
    closePairForm();
  }, [pairFormData, editingPairIndex, closePairForm]);

  const removePair = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      vocabPairs: prev.vocabPairs.filter((_, i) => i !== index),
    }));
  }, []);

  // ── Save (create or update) ──
  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Short description is required');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      // Separate vocab pairs from the rest for Firestore (pairs go to sub-collection)
      const { vocabPairs, ...lessonFields } = formData;

      if (editingLesson) {
        await updateLesson(editingLesson.id, lessonFields);
        // Save vocab pairs to sub-collection
        if (vocabPairs.length > 0 || editingLesson.vocabPairCount > 0) {
          await saveVocabPairs(editingLesson.id, vocabPairs);
        }
        setLessons((prev) =>
          prev.map((l) =>
            l.id === editingLesson.id
              ? { ...l, ...lessonFields, vocabPairCount: vocabPairs.length, updatedAt: new Date().toISOString() }
              : l,
          ),
        );
      } else {
        const newId = await createLesson(lessonFields, adminUid);
        // Save vocab pairs to the new lesson
        if (vocabPairs.length > 0) {
          await saveVocabPairs(newId, vocabPairs);
        }
        const newLesson: AdminLesson = {
          ...lessonFields,
          id: newId,
          fullDescription: lessonFields.fullDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: adminUid,
          enrolledCount: 0,
          completedCount: 0,
          vocabPairCount: vocabPairs.length,
        };
        setLessons((prev) => [...prev, newLesson]);

        // Notify all non-admin users about the new lesson
        if (lessonFields.status === 'published') {
          notifyUsersAboutLesson(lessonFields.title, newId).catch(() => {});
        }
      }
      closeForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save lesson');
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingLesson, adminUid, closeForm]);

  // ── Delete ──
  const handleDelete = useCallback(
    async (lessonId: string) => {
      try {
        setSubmitting(true);
        await deleteLesson(lessonId);
        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete lesson');
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // ── Status change ──
  const handleStatusChange = useCallback(
    async (lessonId: string, newStatus: AdminLessonStatus) => {
      try {
        setSubmitting(true);
        await updateLessonStatus(lessonId, newStatus);

        // Find the lesson to check if this is becoming published
        const lesson = lessons.find((l) => l.id === lessonId);
        const wasDraft = lesson && lesson.status !== 'published';

        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l,
          ),
        );

        // Notify users when a lesson is newly published
        if (newStatus === 'published' && wasDraft && lesson) {
          notifyUsersAboutLesson(lesson.title, lessonId).catch(() => {});
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update status');
      } finally {
        setSubmitting(false);
      }
    },
    [lessons],
  );

  // ── Duplicate ──
  const handleDuplicate = useCallback(
    async (lessonId: string) => {
      try {
        setSubmitting(true);
        await duplicateLesson(lessonId, adminUid);
        await fetchAll();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to duplicate lesson');
      } finally {
        setSubmitting(false);
      }
    },
    [adminUid, fetchAll],
  );

  return {
    // Data
    lessons: filteredLessons,
    allLessons: lessons,
    stats,
    loading,
    error,
    submitting,

    // Tabs & filters
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,

    // Form
    formVisible,
    editingLesson,
    formData,
    focusTipInput,
    setFocusTipInput,
    tagInput,
    setTagInput,
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormField,
    addFocusTip,
    removeFocusTip,
    addTag,
    removeTag,
    addPrerequisite,
    removePrerequisite,
    handleSave,

    // Form step
    formStep,
    setFormStep,

    // Vocab pair management
    loadingPairs,
    pairFormVisible,
    pairFormData,
    editingPairIndex,
    openAddPairForm,
    openEditPairForm,
    closePairForm,
    updatePairField,
    savePair,
    removePair,

    // Actions
    handleDelete,
    handleStatusChange,
    handleDuplicate,
    refresh: fetchAll,
  };
};
