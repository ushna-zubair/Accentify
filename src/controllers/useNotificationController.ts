import { useState, useCallback } from 'react';
import type { NotificationTab, NotificationItem, NotificationSection } from '../models';

// ------- Sample avatar placeholders -------
const AVATARS = {
  resume: require('../../assets/icon.png'),
  score: require('../../assets/icon.png'),
  fluency: require('../../assets/icon.png'),
  vocab: require('../../assets/icon.png'),
  exercise: require('../../assets/icon.png'),
};

// ------- Mock Data -------
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', text: 'Time to get back where we left.', time: '1h ago', avatar: AVATARS.resume, unread: true, tab: 'Direct' },
  { id: '2', text: 'Your pronunciation score for Conversation Practice is now available.', time: '4h ago', avatar: AVATARS.score, unread: true, tab: 'Direct' },
  { id: '3', text: 'Fluency 101 is unlocked — start practicing today!', time: '18:21', avatar: AVATARS.fluency, unread: false, tab: 'Direct' },
  { id: '4', text: 'You finished the Vocabulary Growth lesson. Great job!', time: '12:56', avatar: AVATARS.vocab, unread: false, tab: 'Direct' },
  { id: '5', text: 'New exercise uploaded: Interview for a Career.', time: '11:41', avatar: AVATARS.exercise, unread: false, tab: 'Direct' },
  { id: '6', text: 'System maintenance scheduled for tonight at 11 PM.', time: '2h ago', avatar: AVATARS.resume, unread: true, tab: 'Overall' },
  { id: '7', text: 'New feature: Conversation mode is now live!', time: '5h ago', avatar: AVATARS.fluency, unread: true, tab: 'Overall' },
  { id: '8', text: 'Weekly leaderboard has been updated.', time: '09:30', avatar: AVATARS.score, unread: false, tab: 'Overall' },
];

// ------- Helpers -------
const groupByDate = (items: NotificationItem[]): NotificationSection[] => {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  items.forEach((item) => {
    if (item.time.includes('ago')) {
      today.push(item);
    } else if (['18:21', '12:56', '09:30', '5h ago'].includes(item.time)) {
      yesterday.push(item);
    } else {
      older.push(item);
    }
  });

  const sections: NotificationSection[] = [];
  if (today.length > 0) sections.push({ title: 'Today', data: today });
  if (yesterday.length > 0) sections.push({ title: 'Yesterday', data: yesterday });
  if (older.length > 0) sections.push({ title: '02/10/2025', data: older });
  return sections;
};

export const useNotificationController = () => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('Direct');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const filtered = notifications.filter((n) => n.tab === activeTab);
  const sections = groupByDate(filtered);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.tab === activeTab ? { ...n, unread: false } : n)),
    );
  }, [activeTab]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
  }, []);

  return {
    activeTab,
    setActiveTab,
    sections,
    markAllAsRead,
    markAsRead,
  };
};
