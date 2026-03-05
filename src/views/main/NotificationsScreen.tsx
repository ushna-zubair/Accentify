import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useNotificationController } from '../../controllers';
import type { NotificationItem, NotificationSection, SettingsStackParamList } from '../../models';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SettingsStackParamList, 'Notifications'>;

// ------- Component -------
const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { activeTab, setActiveTab, sections, loading, markAllAsRead, markAsRead } =
    useNotificationController();
  const { colors: tc } = useAppTheme();
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
    backgroundColor: tc.inputBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.text,
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
    backgroundColor: tc.text,
  },
  unreadDotPlaceholder: {
    width: 8,
    height: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tc.inputBorder,
  },
  notificationText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    lineHeight: 20,
  },
  notificationTime: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
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
    fontFamily: fonts.regular,
    fontSize: 16,
    color: tc.textLight,
  },
});

export default NotificationsScreen;
