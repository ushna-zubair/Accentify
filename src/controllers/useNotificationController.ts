import { useState, useCallback, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { NotificationTab, NotificationItem, NotificationSection } from '../models';

// ------- Default avatar -------
const DEFAULT_AVATAR = require('../../assets/icon.png');

// ------- Helpers -------

/** Format a Firestore timestamp or ISO string into a human-readable relative time */
function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Determine which date group a notification belongs to */
function getDateGroup(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch {
    return 'Older';
  }
}

/** Group notifications by date */
const groupByDate = (items: NotificationItem[]): NotificationSection[] => {
  const groups = new Map<string, NotificationItem[]>();

  items.forEach((item) => {
    const group = getDateGroup(item.createdAt ?? '');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  });

  const sections: NotificationSection[] = [];
  // Ensure Today comes first, then Yesterday, then others
  const order = ['Today', 'Yesterday'];
  for (const key of order) {
    if (groups.has(key)) {
      sections.push({ title: key, data: groups.get(key)! });
      groups.delete(key);
    }
  }
  // Remaining date groups (chronologically desc)
  for (const [key, data] of groups) {
    sections.push({ title: key, data });
  }

  return sections;
};

export const useNotificationController = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('Direct');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch notifications from Firestore ──
  const fetchNotifications = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const notifRef = collection(db, 'users', uid, 'notifications');
      const q = query(notifRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const items: NotificationItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        let createdAt = '';
        try {
          const ts = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt);
          createdAt = ts.toISOString();
        } catch {
          createdAt = new Date().toISOString();
        }

        return {
          id: d.id,
          text: data.text ?? data.body ?? '',
          time: formatRelativeTime(createdAt),
          avatar: DEFAULT_AVATAR,
          unread: data.unread ?? true,
          tab: (data.tab as NotificationTab) ?? 'Overall',
          createdAt,
        };
      });

      setNotifications(items);
    } catch (e: any) {
      console.error('[Notifications] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => n.tab === activeTab);
  const sections = groupByDate(filtered);

  // ── Mark all notifications in the active tab as read ──
  const markAllAsRead = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unreadIds = notifications
      .filter((n) => n.tab === activeTab && n.unread)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadIds.forEach((id) => {
        batch.update(doc(db, 'users', uid, 'notifications', id), { unread: false });
      });
      await batch.commit();

      setNotifications((prev) =>
        prev.map((n) => (n.tab === activeTab ? { ...n, unread: false } : n)),
      );
    } catch (e: any) {
      console.error('[Notifications] markAllAsRead error:', e);
    }
  }, [activeTab, notifications]);

  // ── Mark a single notification as read ──
  const markAsRead = useCallback(async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, 'users', uid, 'notifications', id), { unread: false });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
    } catch (e: any) {
      console.error('[Notifications] markAsRead error:', e);
    }
  }, []);

  return {
    activeTab,
    setActiveTab,
    sections,
    loading,
    markAllAsRead,
    markAsRead,
    refresh: fetchNotifications,
  };
};
