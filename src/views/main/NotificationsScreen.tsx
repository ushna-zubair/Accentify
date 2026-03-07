import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useNotificationController } from '../../controllers';
import type { NotificationItem, NotificationSection, SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const isWeb = Platform.OS === 'web';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Notifications'>;

/** Icon + color mapping per notification type */
const NOTIF_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  announcement: { icon: 'megaphone', bg: '#EDE7F6', fg: '#7B4DB8' },
  lesson:       { icon: 'book',      bg: '#E8F5E9', fg: '#388E3C' },
  achievement:  { icon: 'trophy',    bg: '#FFF8E1', fg: '#F9A825' },
  system:       { icon: 'notifications', bg: '#E3F2FD', fg: '#1976D2' },
};

// ------- Component -------
const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { activeTab, setActiveTab, sections, loading, markAllAsRead, markAsRead } =
    useNotificationController();
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = isWeb && width >= 700;
  const styles = useMemo(() => createStyles(tc), [tc]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={tc.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const config = NOTIF_TYPE_CONFIG[item.type ?? 'system'] ?? NOTIF_TYPE_CONFIG.system;
    return (
      <TouchableOpacity
        style={[styles.notificationCard, item.unread && styles.notificationCardUnread]}
        activeOpacity={0.7}
        onPress={() => markAsRead(item.id)}
      >
        <View style={[styles.notifIconWrap, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.fg} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {item.type === 'announcement' ? '📢 Announcement' : item.type === 'lesson' ? '📖 Lesson' : item.type === 'achievement' ? '🏆 Achievement' : '🔔 Notification'}
            </Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifText} numberOfLines={2}>{item.text}</Text>
        </View>
        {item.unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const Container = isWide ? View : SafeAreaView;

  return (
    <Container style={styles.safeArea}>
      <View style={[styles.container, isWide && { maxWidth: 780, alignSelf: 'center' as any, width: '100%' as any, paddingHorizontal: 32 }]}>
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
    </Container>
  );
};

// ------- Styles -------
const createStyles = (tc: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tc.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: tc.text,
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
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.textLight,
  },
  tabTextActive: {
    color: tc.accent,
    textDecorationLine: 'underline',
  },
  markAllBtn: {
    marginLeft: 'auto',
  },
  markAllText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.accent,
  },
  // Section headers
  sectionHeaderContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Notification card
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: tc.inputBorder,
  },
  notificationCardUnread: {
    backgroundColor: tc.accentMuted,
    borderColor: tc.accent,
    borderWidth: 1,
  },
  notifIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.text,
    flex: 1,
  },
  notifTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textLight,
    marginLeft: 8,
  },
  notifText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
    lineHeight: 19,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tc.accent,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: tc.textLight,
  },
});

export default NotificationsScreen;
