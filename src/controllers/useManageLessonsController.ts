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
  LessonCategory,
  ManageLessonsTab,
} from '../models';
import {
  DEFAULT_LESSON_FORM,
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
} from '../services/lessonService';

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

  const adminUid = currentUser?.uid ?? '';

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllLessons();
      setLessons(data);
    } catch (e: any) {
      console.error('[ManageLessons] fetch error:', e);
      setError(e.message ?? 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
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
    setFormData({ ...DEFAULT_LESSON_FORM, order: nextOrder });
    setFocusTipInput('');
    setFormVisible(true);
  }, [lessons]);

  // ── Open edit form ──
  const openEditForm = useCallback((lesson: AdminLesson) => {
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
    });
    setFocusTipInput('');
    setFormVisible(true);
  }, []);

  // ── Close form ──
  const closeForm = useCallback(() => {
    setFormVisible(false);
    setEditingLesson(null);
    setFormData({ ...DEFAULT_LESSON_FORM });
    setFocusTipInput('');
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

  // ── Save (create or update) ──
  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      if (editingLesson) {
        await updateLesson(editingLesson.id, formData);
        setLessons((prev) =>
          prev.map((l) =>
            l.id === editingLesson.id
              ? { ...l, ...formData, updatedAt: new Date().toISOString() }
              : l,
          ),
        );
      } else {
        const newId = await createLesson(formData, adminUid);
        const newLesson: AdminLesson = {
          ...formData,
          id: newId,
          fullDescription: formData.fullDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: adminUid,
          enrolledCount: 0,
          completedCount: 0,
          vocabPairCount: 0,
        };
        setLessons((prev) => [...prev, newLesson]);
      }
      closeForm();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save lesson');
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
      } catch (e: any) {
        setError(e.message ?? 'Failed to delete lesson');
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
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l,
          ),
        );
      } catch (e: any) {
        setError(e.message ?? 'Failed to update status');
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  // ── Duplicate ──
  const handleDuplicate = useCallback(
    async (lessonId: string) => {
      try {
        setSubmitting(true);
        await duplicateLesson(lessonId, adminUid);
        await fetchAll();
      } catch (e: any) {
        setError(e.message ?? 'Failed to duplicate lesson');
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
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormField,
    addFocusTip,
    removeFocusTip,
    handleSave,

    // Actions
    handleDelete,
    handleStatusChange,
    handleDuplicate,
    refresh: fetchAll,
  };
};
