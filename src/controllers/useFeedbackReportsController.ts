/**
 * useFeedbackReportsController.ts
 *
 * Controller for the Admin Feedback & Reports screen.
 * Manages feedback list, filtering, status updates, responses, and detail view.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackCategory,
  FeedbackStats,
  FeedbackTab,
} from '../models';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from '../models';
import {
  fetchFeedbackItems,
  updateFeedbackStatus,
  updateFeedbackPriority,
  assignFeedback,
  updateAdminNotes,
  respondToFeedback,
  archiveFeedback,
  deleteFeedback,
  computeFeedbackStats,
  fetchFeedbackActivity,
} from '../services/feedbackService';

export const useFeedbackReportsController = () => {
  const { currentUser, userProfile } = useAuth();

  // ── State ──
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tabs & filters
  const [activeTab, setActiveTab] = useState<FeedbackTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<FeedbackPriority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Detail / Respond modal
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [adminNotesText, setAdminNotesText] = useState('');
  const [activityLog, setActivityLog] = useState<any[]>([]);

  // Current admin info
  const currentAdminUid = currentUser?.uid ?? '';
  const currentAdminName =
    userProfile?.profile?.fullName ??
    userProfile?.fullName ??
    currentUser?.displayName ??
    'Admin';

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFeedbackItems();
      setItems(data);
    } catch (e: unknown) {
      console.error('[FeedbackReports] fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load feedback');
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
  const stats: FeedbackStats = useMemo(() => computeFeedbackStats(items), [items]);

  // ── Filtered & Sorted Items ──
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((i) => i.priority === priorityFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.subject.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.userFullName.toLowerCase().includes(q) ||
          i.userEmail.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'priority') {
      const pOrder: Record<FeedbackPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      result.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);
    }

    return result;
  }, [items, activeTab, categoryFilter, priorityFilter, searchQuery, sortBy]);

  // ── Open Detail ──
  const openDetail = useCallback(async (item: FeedbackItem) => {
    setSelectedItem(item);
    setResponseText(item.responseMessage ?? '');
    setAdminNotesText(item.adminNotes ?? '');
    setDetailVisible(true);
    // Fetch activity log
    try {
      const logs = await fetchFeedbackActivity(item.id);
      setActivityLog(logs);
    } catch {
      setActivityLog([]);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedItem(null);
    setDetailVisible(false);
    setResponseText('');
    setAdminNotesText('');
    setActivityLog([]);
  }, []);

  // ── Status Change ──
  const handleStatusChange = useCallback(
    async (feedbackId: string, newStatus: FeedbackStatus) => {
      try {
        setSubmitting(true);
        await updateFeedbackStatus(feedbackId, newStatus, currentAdminUid, currentAdminName);
        setItems((prev) =>
          prev.map((i) => (i.id === feedbackId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i)),
        );
        if (selectedItem?.id === feedbackId) {
          setSelectedItem((prev) => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : prev);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update status');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName, selectedItem],
  );

  // ── Priority Change ──
  const handlePriorityChange = useCallback(
    async (feedbackId: string, newPriority: FeedbackPriority) => {
      try {
        setSubmitting(true);
        await updateFeedbackPriority(feedbackId, newPriority, currentAdminUid, currentAdminName);
        setItems((prev) =>
          prev.map((i) => (i.id === feedbackId ? { ...i, priority: newPriority, updatedAt: new Date().toISOString() } : i)),
        );
        if (selectedItem?.id === feedbackId) {
          setSelectedItem((prev) => prev ? { ...prev, priority: newPriority } : prev);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update priority');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName, selectedItem],
  );

  // ── Respond ──
  const handleRespond = useCallback(
    async (feedbackId: string) => {
      if (!responseText.trim()) return;
      try {
        setSubmitting(true);
        await respondToFeedback(feedbackId, responseText.trim(), currentAdminUid, currentAdminName);
        setItems((prev) =>
          prev.map((i) =>
            i.id === feedbackId
              ? {
                  ...i,
                  responseMessage: responseText.trim(),
                  respondedAt: new Date().toISOString(),
                  respondedBy: currentAdminUid,
                  respondedByName: currentAdminName,
                  status: 'in_progress' as FeedbackStatus,
                  updatedAt: new Date().toISOString(),
                }
              : i,
          ),
        );
        if (selectedItem?.id === feedbackId) {
          setSelectedItem((prev) =>
            prev
              ? {
                  ...prev,
                  responseMessage: responseText.trim(),
                  respondedAt: new Date().toISOString(),
                  respondedBy: currentAdminUid,
                  respondedByName: currentAdminName,
                  status: 'in_progress' as FeedbackStatus,
                }
              : prev,
          );
        }
        // Refresh activity
        const logs = await fetchFeedbackActivity(feedbackId);
        setActivityLog(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to send response');
      } finally {
        setSubmitting(false);
      }
    },
    [responseText, currentAdminUid, currentAdminName, selectedItem],
  );

  // ── Save Admin Notes ──
  const handleSaveNotes = useCallback(
    async (feedbackId: string) => {
      try {
        setSubmitting(true);
        await updateAdminNotes(feedbackId, adminNotesText.trim(), currentAdminUid, currentAdminName);
        setItems((prev) =>
          prev.map((i) => (i.id === feedbackId ? { ...i, adminNotes: adminNotesText.trim() } : i)),
        );
        if (selectedItem?.id === feedbackId) {
          setSelectedItem((prev) => prev ? { ...prev, adminNotes: adminNotesText.trim() } : prev);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to save notes');
      } finally {
        setSubmitting(false);
      }
    },
    [adminNotesText, currentAdminUid, currentAdminName, selectedItem],
  );

  // ── Archive ──
  const handleArchive = useCallback(
    async (feedbackId: string) => {
      try {
        setSubmitting(true);
        await archiveFeedback(feedbackId, currentAdminUid, currentAdminName);
        setItems((prev) =>
          prev.map((i) => (i.id === feedbackId ? { ...i, status: 'archived' as FeedbackStatus } : i)),
        );
        closeDetail();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to archive');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName, closeDetail],
  );

  // ── Delete ──
  const handleDelete = useCallback(
    async (feedbackId: string) => {
      try {
        setSubmitting(true);
        await deleteFeedback(feedbackId, currentAdminUid, currentAdminName);
        setItems((prev) => prev.filter((i) => i.id !== feedbackId));
        closeDetail();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName, closeDetail],
  );

  return {
    // Data
    items: filteredItems,
    allItems: items,
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
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,

    // Detail
    selectedItem,
    detailVisible,
    openDetail,
    closeDetail,
    responseText,
    setResponseText,
    adminNotesText,
    setAdminNotesText,
    activityLog,

    // Actions
    handleStatusChange,
    handlePriorityChange,
    handleRespond,
    handleSaveNotes,
    handleArchive,
    handleDelete,
    refresh: fetchAll,
  };
};
