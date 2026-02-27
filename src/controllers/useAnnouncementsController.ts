import { useState, useCallback, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { Announcement } from '../models';

// ═══════════════════════════════════════════════
//  ANNOUNCEMENTS CONTROLLER
// ═══════════════════════════════════════════════

export const useAnnouncementsController = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track selected announcement IDs for deletion
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // New announcement draft
  const [draftBody, setDraftBody] = useState('');

  // ── Fetch all announcements (newest first) ──
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ref = collection(db, 'announcements');
      const q = query(ref, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);

      const items: Announcement[] = snap.docs.map((d) => {
        const data = d.data();
        let createdAt = '';
        try {
          const ts = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt);
          createdAt = ts.toISOString();
        } catch {
          createdAt = '';
        }

        return {
          id: d.id,
          title: data.title ?? 'Announcement',
          body: data.body ?? '',
          createdAt,
          createdBy: data.createdBy ?? '',
        };
      });

      setAnnouncements(items);
    } catch (e: any) {
      console.error('[Announcements] fetch error:', e);
      setError(e.message ?? 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Toggle selection ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Delete selected announcements ──
  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const promises = Array.from(selectedIds).map((id) =>
        deleteDoc(doc(db, 'announcements', id)),
      );
      await Promise.all(promises);

      setAnnouncements((prev) =>
        prev.filter((a) => !selectedIds.has(a.id)),
      );
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error('[Announcements] delete error:', e);
      setError(e.message ?? 'Failed to delete announcements');
    } finally {
      setSubmitting(false);
    }
  }, [selectedIds]);

  // ── Post a new announcement ──
  const postAnnouncement = useCallback(
    async (body: string) => {
      if (!body.trim()) return;

      try {
        setSubmitting(true);
        setError(null);

        const uid = auth.currentUser?.uid ?? 'admin';

        const docRef = await addDoc(collection(db, 'announcements'), {
          title: 'Announcement',
          body: body.trim(),
          createdBy: uid,
          createdAt: serverTimestamp(),
        });

        // Optimistically prepend to list
        const newAnnouncement: Announcement = {
          id: docRef.id,
          title: 'Announcement',
          body: body.trim(),
          createdAt: new Date().toISOString(),
          createdBy: uid,
        };

        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        setDraftBody('');
      } catch (e: any) {
        console.error('[Announcements] post error:', e);
        setError(e.message ?? 'Failed to post announcement');
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    announcements,
    loading,
    submitting,
    error,
    selectedIds,
    draftBody,
    setDraftBody,
    toggleSelect,
    deleteSelected,
    postAnnouncement,
    refresh: fetchAnnouncements,
  };
};
