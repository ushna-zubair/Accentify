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
  where,
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
    async (body: string, title?: string) => {
      if (!body.trim()) return;

      try {
        setSubmitting(true);
        setError(null);

        const uid = auth.currentUser?.uid;
        if (!uid) {
          setError('You must be signed in to post announcements');
          return;
        }

        const announcementTitle = title?.trim() || 'Announcement';

        const docRef = await addDoc(collection(db, 'announcements'), {
          title: announcementTitle,
          body: body.trim(),
          createdBy: uid,
          createdAt: serverTimestamp(),
        });

        // Optimistically prepend to list
        const newAnnouncement: Announcement = {
          id: docRef.id,
          title: announcementTitle,
          body: body.trim(),
          createdAt: new Date().toISOString(),
          createdBy: uid,
        };

        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        setDraftBody('');

        // ── Deliver notification to all non-admin users ──
        try {
          const usersRef = collection(db, 'users');
          const usersQ = query(usersRef, where('role', '!=', 'admin'));
          const usersSnap = await getDocs(usersQ);

          const promises = usersSnap.docs.map((userDoc) =>
            addDoc(collection(db, 'users', userDoc.id, 'notifications'), {
              text: `📢 ${announcementTitle}: ${body.trim()}`,
              tab: 'Direct',
              unread: true,
              type: 'announcement',
              announcementId: docRef.id,
              createdAt: serverTimestamp(),
            }),
          );
          await Promise.all(promises);
        } catch (notifErr) {
          // Non-critical: announcement was saved, notification delivery failed
          console.warn('[Announcements] failed to deliver notifications:', notifErr);
        }
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
