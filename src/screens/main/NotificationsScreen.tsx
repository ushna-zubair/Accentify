import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

// ------- Types -------
type NotificationTab = 'Direct' | 'Overall';

interface NotificationItem {
  id: string;
  text: string;
  time: string;
  avatar: any; // image source
  unread: boolean;
  tab: NotificationTab;
}

interface NotificationSection {
  title: string;
  data: NotificationItem[];
}

// ------- Sample avatar placeholders (emoji-based) -------
const AVATARS = {
  resume: require('../../../assets/icon.png'),
  score: require('../../../assets/icon.png'),
  fluency: require('../../../assets/icon.png'),
  vocab: require('../../../assets/icon.png'),
  exercise: require('../../../assets/icon.png'),
};

// ------- Mock Data -------
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    text: 'Time to get back where we left.',
    time: '1h ago',
    avatar: AVATARS.resume,
    unread: true,
    tab: 'Direct',
  },
  {
    id: '2',
    text: 'Your pronunciation score for Conversation Practice is now available.',
    time: '4h ago',
    avatar: AVATARS.score,
    unread: true,
    tab: 'Direct',
  },
  {
    id: '3',
    text: 'Fluency 101 is unlocked — start practicing today!',
    time: '18:21',
    avatar: AVATARS.fluency,
    unread: false,
    tab: 'Direct',
  },
  {
    id: '4',
    text: 'You finished the Vocabulary Growth lesson. Great job!',
    time: '12:56',
    avatar: AVATARS.vocab,
    unread: false,
    tab: 'Direct',
  },
  {
    id: '5',
    text: 'New exercise uploaded: Interview for a Career.',
    time: '11:41',
    avatar: AVATARS.exercise,
    unread: false,
    tab: 'Direct',
  },
  {
    id: '6',
    text: 'System maintenance scheduled for tonight at 11 PM.',
    time: '2h ago',
    avatar: AVATARS.resume,
    unread: true,
    tab: 'Overall',
  },
  {
    id: '7',
    text: 'New feature: Conversation mode is now live!',
    time: '5h ago',
    avatar: AVATARS.fluency,
    unread: true,
    tab: 'Overall',
  },
  {
    id: '8',
    text: 'Weekly leaderboard has been updated.',
    time: '09:30',
    avatar: AVATARS.score,
    unread: false,
    tab: 'Overall',
  },
];

// ------- Helpers -------
const groupByDate = (items: NotificationItem[]): NotificationSection[] => {
  // For the mock data, assign items to date groups based on their time format
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

// ------- Component -------
const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={styles.notificationRow}
      activeOpacity={0.7}
      onPress={() => markAsRead(item.id)}
    >
      {item.unread && <View style={styles.unreadDot} />}
      {!item.unread && <View style={styles.unreadDotPlaceholder} />}
      <Image source={item.avatar} style={styles.avatar} />
      <Text style={styles.notificationText}>{item.text}</Text>
      <Text style={styles.notificationTime}>{item.time}</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>Notifications</Text>

        {/* Tabs row */}
        <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => setActiveTab('Direct')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'Direct' && styles.tabTextActive]}>
              Direct
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Overall')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'Overall' && styles.tabTextActive]}>
              Overall
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {/* Notification list */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

// ------- Styles -------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 20,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
  },
  tabTextActive: {
    color: '#1A6FEE',
    textDecorationLine: 'underline',
  },
  markAllBtn: {
    marginLeft: 'auto',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A6FEE',
  },
  // Section headers
  sectionHeaderContainer: {
    backgroundColor: colors.inputBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  // Notification row
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  unreadDotPlaceholder: {
    width: 8,
    height: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBorder,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 4,
    alignSelf: 'flex-end',
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
  },
});

export default NotificationsScreen;
