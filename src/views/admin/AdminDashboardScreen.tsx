import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import BarChart from './components/BarChart';
import DonutChart from './components/DonutChart';
import LineChart from './components/LineChart';
import PerformanceBubbles from './components/PerformanceBubbles';
import {
  useAdminDashboardController,
  useAdminMobileDashboardController,
  MENU_ITEMS,
  OTHERS_ITEMS,
} from '../../controllers';
import type { DashboardData, AdminOnline, AdminMenuItem, AdminStackParamList } from '../../models';
import AdminUserManagementScreen from './AdminUserManagementScreen';
import AdminAccessControlScreen from './AdminAccessControlScreen';
import AdminFeedbackReportsScreen from './AdminFeedbackReportsScreen';
import { SettingsStackNavigator } from '../../navigation/AppNavigator';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';

// ═══════════════════════════════════════════════
//  MOBILE ADMIN DASHBOARD
// ═══════════════════════════════════════════════

// ─── Admin Avatar ───
const AdminAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 48 }) => {
  const { colors: tc } = useAppTheme();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        mStyles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[mStyles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
      <Text style={[mStyles.avatarEmoji, { fontSize: size * 0.22, bottom: -2 }]}>🏆</Text>
    </View>
  );
};

// ─── Announcement Card ───
const AnnouncementCard: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const { colors: tc } = useAppTheme();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  return (
  <View style={mStyles.announcementCard}>
    <Text style={mStyles.announcementTitle}>{title}</Text>
    <Text style={mStyles.announcementBody}>{body}</Text>
  </View>
  );
};

// ─── Admins Online ───
const AdminsOnlineSection: React.FC<{ admins: AdminOnline[] }> = ({ admins }) => {
  const { colors: tc } = useAppTheme();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  return (
  <View style={mStyles.adminsOnlineSection}>
    <Text style={mStyles.adminsOnlineTitle}>Admins Online</Text>
    <View style={mStyles.adminsOnlineRow}>
      {admins.map((admin) => (
        <View key={admin.uid} style={mStyles.adminOnlineItem}>
          <AdminAvatar name={admin.name} size={40} />
          <Text style={mStyles.adminOnlineName} numberOfLines={1}>
            {admin.name}
          </Text>
        </View>
      ))}
    </View>
  </View>
  );
};

// ─── Menu Icons Mapping ───
const MENU_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  insights: 'analytics-outline',
  user_management: 'people-outline',
  content_management: 'document-text-outline',
  create_announcement: 'megaphone-outline',
};

// ─── Menu Button ───
const MenuButton: React.FC<{
  item: AdminMenuItem;
  onPress: () => void;
}> = ({ item, onPress }) => {
  const { colors: tc } = useAppTheme();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  const iconName = MENU_ICON_MAP[item.key] ?? 'ellipse-outline';
  return (
  <TouchableOpacity
    style={[mStyles.menuButton, item.filled && mStyles.menuButtonFilled]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[mStyles.menuIconWrap, item.filled && mStyles.menuIconWrapFilled]}>
      <Ionicons name={iconName} size={20} color={item.filled ? tc.white : tc.accent} />
    </View>
    <Text
      style={[mStyles.menuButtonText, item.filled && mStyles.menuButtonTextFilled]}
    >
      {item.label}
    </Text>
    <Ionicons name="chevron-forward" size={18} color={item.filled ? tc.white : tc.accent} />
  </TouchableOpacity>
  );
};

// ─── Create Announcement Modal ───
const CreateAnnouncementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
  submitting: boolean;
}> = ({ visible, onClose, onSubmit, submitting }) => {
  const { colors: tc } = useAppTheme();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    onSubmit(title.trim(), body.trim());
    setTitle('');
    setBody('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={mStyles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={mStyles.modalContent}>
          <View style={mStyles.modalHeader}>
            <Text style={mStyles.modalTitle}>Create Announcement</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.text} />
            </TouchableOpacity>
          </View>

          <Text style={mStyles.modalLabel}>Title</Text>
          <TextInput
            style={mStyles.modalInput}
            placeholder="Announcement title"
            placeholderTextColor={tc.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={mStyles.modalLabel}>Message</Text>
          <TextInput
            style={[mStyles.modalInput, mStyles.modalTextArea]}
            placeholder="Write your announcement..."
            placeholderTextColor={tc.textMuted}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              mStyles.modalSubmitBtn,
              (!title.trim() || !body.trim()) && mStyles.modalSubmitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!title.trim() || !body.trim() || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color={tc.white} size="small" />
            ) : (
              <Text style={mStyles.modalSubmitText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Mobile Dashboard Screen ───
const MobileAdminDashboard: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const insets = useSafeAreaInsets();
  const mStyles = useMemo(() => createMStyles(tc), [tc]);
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { mobileData, loading, handleLogout, createAnnouncement } =
    useAdminMobileDashboardController();
  const { data: analyticsData, isLoading: analyticsLoading } = useDashboardAnalytics();
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to logout?')) {
        handleLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout },
      ]);
    }
  };

  const handleMenuPress = (key: string) => {
    if (key === 'insights') {
      navigation.navigate('AdminInsights');
    } else if (key === 'user_management') {
      navigation.navigate('AdminManageUsers');
    } else if (key === 'create_announcement') {
      navigation.navigate('AdminAnnouncements');
    }
  };

  const handleCreateAnnouncement = async (title: string, body: string) => {
    try {
      setSubmitting(true);
      await createAnnouncement(title, body);
      setAnnouncementModalVisible(false);
    } catch {
      // Error handled in controller
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={mStyles.loadingContainer}>
        <ActivityIndicator size="large" color={tc.accent} />
      </View>
    );
  }

  return (
    <View style={mStyles.container}>
      <ScrollView
        contentContainerStyle={mStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[mStyles.header, { paddingTop: insets.top + 14 }]}>
          <View style={mStyles.headerLeft}>
            <AdminAvatar name={mobileData.adminName} size={46} />
            <View style={mStyles.headerInfo}>
              <Text style={mStyles.headerGreeting}>Welcome back,</Text>
              <Text style={mStyles.headerName}>{mobileData.adminName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={mStyles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={tc.error} />
          </TouchableOpacity>
        </View>

        {/* ── Dashboard Title Card ── */}
        <View style={mStyles.titleCard}>
          <Image source={require('../../../assets/logo.png')} style={mStyles.titleLogo} resizeMode="contain" />
          <View style={mStyles.titleCardContent}>
            <Text style={mStyles.titleCardHeading}>Admin Dashboard</Text>
            <Text style={mStyles.titleCardSub}>Manage users, announcements & insights</Text>
          </View>
        </View>

        {/* ── Announcement ── */}
        {mobileData.announcement && (
          <AnnouncementCard
            title={mobileData.announcement.title}
            body={mobileData.announcement.body}
          />
        )}

        {/* ── Admins Online ── */}
        <AdminsOnlineSection admins={mobileData.adminsOnline} />

        {/* ── Analytics Summary ── */}
        {analyticsData && !analyticsLoading && (
          <>
            <Text style={mStyles.sectionLabel}>Overview</Text>
            <View style={mStyles.statsGrid}>
              <View style={[mStyles.statCard, { backgroundColor: tc.accent + '12' }]}>
                <Ionicons name="people" size={22} color={tc.accent} />
                <Text style={[mStyles.statValue, { color: tc.accent }]}>{analyticsData.activeUsers.toLocaleString()}</Text>
                <Text style={mStyles.statLabel}>Active Users</Text>
              </View>
              <View style={[mStyles.statCard, { backgroundColor: tc.success + '12' }]}>
                <Ionicons name="trending-up" size={22} color={tc.success} />
                <Text style={[mStyles.statValue, { color: tc.success }]}>{analyticsData.totalSessions.toLocaleString()}</Text>
                <Text style={mStyles.statLabel}>Total Sessions</Text>
              </View>
              <View style={[mStyles.statCard, { backgroundColor: tc.warning + '12' }]}>
                <Ionicons name="mic" size={22} color={tc.warning} />
                <Text style={[mStyles.statValue, { color: tc.warning }]}>{analyticsData.pronunciationAccuracy}%</Text>
                <Text style={mStyles.statLabel}>Pronunciation</Text>
              </View>
              <View style={[mStyles.statCard, { backgroundColor: tc.accentLight + '30' }]}>
                <Ionicons name="book" size={22} color={tc.accentLight} />
                <Text style={[mStyles.statValue, { color: tc.accentDark ?? tc.accent }]}>{analyticsData.vocabularyRetention}%</Text>
                <Text style={mStyles.statLabel}>Vocab Retention</Text>
              </View>
            </View>

            {/* Growth indicator */}
            <View style={mStyles.growthCard}>
              <View style={mStyles.growthCardRow}>
                <Text style={mStyles.growthCardLabel}>Weekly Growth</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name={analyticsData.growthPct >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={analyticsData.growthPct >= 0 ? tc.success : tc.error}
                  />
                  <Text style={[mStyles.growthCardValue, { color: analyticsData.growthPct >= 0 ? tc.success : tc.error }]}>
                    {Math.abs(analyticsData.growthPct)}%
                  </Text>
                </View>
              </View>
              <View style={mStyles.growthCardRow}>
                <Text style={mStyles.growthCardLabel}>Sessions Growth</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name={analyticsData.sessionsGrowth >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={analyticsData.sessionsGrowth >= 0 ? tc.success : tc.error}
                  />
                  <Text style={[mStyles.growthCardValue, { color: analyticsData.sessionsGrowth >= 0 ? tc.success : tc.error }]}>
                    {analyticsData.sessionsGrowth >= 0 ? '+' : ''}{analyticsData.sessionsGrowth}%
                  </Text>
                </View>
              </View>
              {analyticsData.lastAggregatedAt && (
                <Text style={mStyles.growthCardTimestamp}>
                  Updated: {new Date(analyticsData.lastAggregatedAt).toLocaleString()}
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── Quick Actions Label ── */}
        <Text style={mStyles.sectionLabel}>Quick Actions</Text>

        {/* ── Menu Buttons ── */}
        <View style={mStyles.menuList}>
          {mobileData.menuItems.map((item) => (
            <MenuButton
              key={item.key}
              item={item}
              onPress={() => handleMenuPress(item.key)}
            />
          ))}
        </View>

        {/* ── Continue Button ── */}
        <TouchableOpacity
          style={mStyles.continueBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AdminInsights')}
        >
          <Text style={mStyles.continueBtnText}>View Insights</Text>
          <Ionicons name="arrow-forward" size={18} color={tc.white} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Create Announcement Modal ── */}
      <CreateAnnouncementModal
        visible={announcementModalVisible}
        onClose={() => setAnnouncementModalVisible(false)}
        onSubmit={handleCreateAnnouncement}
        submitting={submitting}
      />
    </View>
  );
};

// ─── Mobile Styles ───
const createMStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.surfaceAlt,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: tc.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerGreeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
  },
  headerName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: tc.text,
    marginTop: 1,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tc.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Title Card
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.accent,
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    gap: 14,
  },
  titleLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  titleCardContent: {
    flex: 1,
  },
  titleCardHeading: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.white,
  },
  titleCardSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.white,
    opacity: 0.8,
    marginTop: 2,
  },

  // Avatar
  avatar: {
    backgroundColor: tc.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontFamily: fonts.bold,
    color: tc.white,
  },
  avatarEmoji: {
    position: 'absolute',
  },

  // Announcement
  announcementCard: {
    backgroundColor: tc.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    padding: 16,
    marginTop: 16,
  },
  announcementTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.text,
    marginBottom: 6,
  },
  announcementBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
    lineHeight: 20,
  },

  // Admins Online
  adminsOnlineSection: {
    marginTop: 20,
  },
  adminsOnlineTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.text,
    marginBottom: 10,
  },
  adminsOnlineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  adminOnlineItem: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 70,
  },
  adminOnlineName: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: tc.textLight,
    textAlign: 'center',
  },

  // Section Label
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.text,
    marginTop: 24,
    marginBottom: 12,
  },

  // Menu List
  menuList: {
    gap: 10,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuButtonFilled: {
    backgroundColor: tc.accent,
    borderColor: tc.accent,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: tc.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconWrapFilled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuButtonText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: tc.text,
  },
  menuButtonTextFilled: {
    color: tc.white,
  },

  // Continue
  continueBtn: {
    marginTop: 24,
    backgroundColor: tc.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  continueBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.white,
  },

  // Analytics summary
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '47%' as any,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center' as const,
    gap: 6,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textMuted,
  },
  growthCard: {
    backgroundColor: tc.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    padding: 16,
    marginBottom: 4,
    gap: 10,
  },
  growthCardRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  growthCardLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.text,
  },
  growthCardValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  growthCardTimestamp: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textMuted,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: tc.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tc.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
  },
  modalLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tc.inputBg,
  },
  modalTextArea: {
    minHeight: 100,
  },
  modalSubmitBtn: {
    backgroundColor: tc.accent,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.white,
  },
});

// ═══════════════════════════════════════════════
//  DESKTOP ADMIN DASHBOARD (existing)
// ═══════════════════════════════════════════════

// ------- Sidebar -------
interface SidebarProps {
  activeKey: string;
  onSelect: (key: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeKey, onSelect, onLogout }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={styles.sidebar}>
    {/* Logo */}
    <View style={styles.logoContainer}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>

    {/* Menu */}
    <Text style={styles.sidebarSection}>MENU</Text>
    {MENU_ITEMS.map((item) => {
      const active = activeKey === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.sidebarItem, active && styles.sidebarItemActive]}
          onPress={() => onSelect(item.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.icon as any}
            size={20}
            color={active ? tc.white : tc.textLight}
          />
          <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}

    {/* Others */}
    <Text style={[styles.sidebarSection, { marginTop: 28 }]}>OTHERS</Text>
    {OTHERS_ITEMS.map((item) => {
      const active = activeKey === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.sidebarItem, active && styles.sidebarItemActive]}
          onPress={() => onSelect(item.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.icon as any}
            size={20}
            color={active ? tc.white : tc.textLight}
          />
          <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}

    {/* Spacer pushes logout to bottom */}
    <View style={{ flex: 1 }} />

    {/* Logout */}
    <TouchableOpacity
      style={styles.sidebarLogoutBtn}
      onPress={onLogout}
      activeOpacity={0.7}
    >
      <Ionicons name="log-out-outline" size={20} color={tc.error} />
      <Text style={styles.sidebarLogoutText}>Logout</Text>
    </TouchableOpacity>
  </View>
  );
};

// ------- Top Bar -------
interface TopBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onLogout: () => void;
  showMenuToggle?: boolean;
  onMenuToggle?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onLogout,
  showMenuToggle,
  onMenuToggle,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { width } = useWindowDimensions();
  const isNarrowTopBar = width < 1000;
  return (
  <View style={styles.topBar}>
    <View style={styles.topBarLeftGroup}>
      {showMenuToggle && (
        <TouchableOpacity onPress={onMenuToggle} style={{ marginRight: 12 }} activeOpacity={0.7}>
          <Ionicons name="menu" size={24} color={tc.text} />
        </TouchableOpacity>
      )}
      <View style={[styles.searchContainer, isNarrowTopBar && { maxWidth: 260 }]}>
        <Ionicons name="search" size={18} color={tc.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={tc.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>
    </View>
    <View style={styles.topBarRight}>
      <View style={styles.adminBadge}>
        <Image source={require('../../../assets/logo.png')} style={styles.adminAvatar} />
        {!isNarrowTopBar && (
          <Text style={styles.adminLabel}>Admin Dashboard</Text>
        )}
      </View>
      <View style={styles.notifBadge}>
        <Ionicons name="notifications-outline" size={22} color={tc.accent} />
        <View style={styles.notifDot} />
      </View>
      <TouchableOpacity
        style={styles.topBarLogoutBtn}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={tc.error} />
        {!isNarrowTopBar && <Text style={styles.topBarLogoutText}>Logout</Text>}
      </TouchableOpacity>
    </View>
  </View>
  );
};

// ------- Dashboard Cards -------

const RevenueCard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const isPositiveGrowth = data.growthPct >= 0;
  return (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>User Activity Overview</Text>
      <TouchableOpacity style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>View User Analytics</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.bigNumber}>{data.activeUsers.toLocaleString()} Active Users</Text>
    <View style={styles.growthRow}>
      <Ionicons name={isPositiveGrowth ? 'arrow-up' : 'arrow-down'} size={14} color={isPositiveGrowth ? tc.success : tc.error} />
      <Text style={[styles.growthText, !isPositiveGrowth && { color: tc.error }]}>{Math.abs(data.growthPct)}%</Text>
      <Text style={styles.growthSub}>vs last week</Text>
    </View>
    <Text style={styles.dateRange}>{data.usageDateRange ? `Usage from ${data.usageDateRange}` : 'Loading date range…'}</Text>
    <View style={styles.chartContainer}>
      <BarChart data={data.weeklyBarData} height={160} />
    </View>
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: tc.accent }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: tc.accentMuted }]} />
        <Text style={styles.legendText}>Last Week</Text>
      </View>
    </View>
  </View>
  );
};

const PracticeActivityCard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);

  // Compute dominant practice period dynamically
  const { morning, afternoon, night } = data.practiceActivity;
  const total = morning + afternoon + night;
  const dominantLabel = morning >= afternoon && morning >= night
    ? 'Morning' : afternoon >= night ? 'Afternoon' : 'Night';
  const dominantSub = dominantLabel === 'Morning'
    ? '5am - 12pm' : dominantLabel === 'Afternoon' ? '12pm - 6pm' : '6pm - 5am';
  const dominantValue = dominantLabel === 'Morning'
    ? morning : dominantLabel === 'Afternoon' ? afternoon : night;
  const dominantPct = total > 0 ? Math.round((dominantValue / total) * 100) : 0;

  return (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>User Practice Activity</Text>
      <TouchableOpacity style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>View Report</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.dateRange}>{data.usageDateRange ? `From ${data.usageDateRange}` : 'Current period'}</Text>
    <DonutChart
      segments={[
        { label: 'Morning Sessions', value: data.practiceActivity.morning, color: tc.accentLight },
        { label: 'Afternoon Sessions', value: data.practiceActivity.afternoon, color: tc.accent },
        { label: 'Night Sessions', value: data.practiceActivity.night, color: tc.accentMuted },
      ]}
      size={180}
      tooltipLabel={dominantLabel}
      tooltipSub={dominantSub}
      tooltipValue={total > 0 ? `${dominantPct}% of users` : 'No data yet'}
    />
  </View>
  );
};

const PerformanceInsightsCard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>User Performance Insights</Text>
    <Text style={styles.cardSubtitle}>Pronunciation, fluency &amp; vocabulary metrics</Text>
    <PerformanceBubbles
      data={[
        { label: 'Pronunciation', subLabel: 'Accuracy', value: data.pronunciationAccuracy, color: tc.accent, size: 110 },
        { label: 'Fluency', subLabel: 'Accuracy', value: data.fluencyAccuracy, color: tc.warning, size: 120 },
        { label: 'Vocabulary', subLabel: 'Retention', value: data.vocabularyRetention, color: tc.accentLight, size: 100 },
      ]}
    />
  </View>
  );
};

const TopLearnersCard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Top Performing Learners</Text>
    <Text style={styles.cardSubtitle}>Ranked by sessions completed this month</Text>
    <View style={{ marginTop: 16, gap: 16 }}>
      {data.topLearners.length === 0 ? (
        <Text style={styles.cardSubtitle}>No learner data available yet</Text>
      ) : (
        data.topLearners.map((learner, i) => {
          const initials = learner.name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const rankColors = [tc.accent, tc.warning, tc.accentLight, tc.disabled];
          return (
            <View key={`${learner.name}-${i}`} style={styles.learnerRow}>
              <View style={styles.learnerLeft}>
                <View style={[styles.learnerAvatar, { backgroundColor: rankColors[i] ?? tc.disabled }]}>
                  <Text style={styles.learnerInitials}>{initials}</Text>
                </View>
                <View>
                  <Text style={styles.learnerName}>{learner.name}</Text>
                  <Text style={[styles.cardSubtitle, { marginTop: 0, fontSize: 11 }]}>#{i + 1} Ranked</Text>
                </View>
              </View>
              <Text style={styles.learnerSessions}>{learner.sessions.toLocaleString()} Sessions</Text>
            </View>
          );
        })
      )}
    </View>
  </View>
  );
};

const PracticeSessionsCard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>User Practice Sessions</Text>
      <TouchableOpacity style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>View Stats</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.bigNumber}>
      {data.totalSessions.toLocaleString()} total sessions completed
    </Text>
    <View style={styles.growthRow}>
      <Ionicons name={data.sessionsGrowth >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={data.sessionsGrowth >= 0 ? tc.success : tc.error} />
      <Text style={[styles.growthText, data.sessionsGrowth < 0 && { color: tc.error }]}>{data.sessionsGrowth >= 0 ? '+' : ''}{data.sessionsGrowth}%</Text>
      <Text style={styles.growthSub}>vs last week</Text>
    </View>
    <Text style={[styles.cardSubtitle, { marginTop: 12, marginBottom: 4 }]}>Session Completed</Text>
    <LineChart
      thisWeek={data.sessionsThisWeek}
      lastWeek={data.sessionsLastWeek}
      labels={['01', '02', '03', '04', '05', '06']}
      height={120}
      width={240}
    />
    <View style={[styles.legendRow, { marginTop: 8 }]}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: tc.accent }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: tc.disabled }]} />
        <Text style={styles.legendText}>Last Week</Text>
      </View>
    </View>
  </View>
  );
};

// ------- Desktop Main Screen -------
const DesktopAdminDashboard: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const {
    activeMenu,
    setActiveMenu,
    searchQuery,
    setSearchQuery,
    dashboardData,
    isLoading,
    error,
    refetch,
    runAggregation,
    handleLogout,
  } = useAdminDashboardController();

  const { width } = useWindowDimensions();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Breakpoints: >= 1024 full sidebar, 600-1023 collapsible sidebar, < 600 mobile (handled by router)
  const isDesktop = width >= 1024;
  const isTablet = width >= 600 && width < 1024;
  const showSidebar = isDesktop || (isTablet && sidebarOpen);
  const canLayoutTwoCol = width >= 860;
  const canLayoutThreeCol = width >= 1200;

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to logout?')) {
        handleLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout },
      ]);
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <View style={styles.root}>
        {showSidebar && (
          <Sidebar activeKey={activeMenu} onSelect={setActiveMenu} onLogout={confirmLogout} />
        )}
        <View style={[styles.mainArea, styles.centeredContainer]}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading dashboard analytics…</Text>
        </View>
      </View>
    );
  }

  // ── Error state ──
  if (error || !dashboardData) {
    return (
      <View style={styles.root}>
        {showSidebar && (
          <Sidebar activeKey={activeMenu} onSelect={setActiveMenu} onLogout={confirmLogout} />
        )}
        <View style={[styles.mainArea, styles.centeredContainer]}>
          <Ionicons name="alert-circle-outline" size={48} color={tc.error} />
          <Text style={styles.errorText}>
            {error || 'Failed to load dashboard data.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} activeOpacity={0.7} onPress={refetch}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {showSidebar && (
        <Sidebar
          activeKey={activeMenu}
          onSelect={setActiveMenu}
          onLogout={confirmLogout}
        />
      )}

      <View style={styles.mainArea}>
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogout={confirmLogout}
          showMenuToggle={isTablet}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* ── Conditionally render content based on active sidebar menu ── */}
        {activeMenu === 'users' ? (
          <AdminUserManagementScreen />
        ) : activeMenu === 'settings' ? (
          <View style={{ flex: 1 }}>
            <SettingsStackNavigator />
          </View>
        ) : activeMenu === 'access' ? (
          <AdminAccessControlScreen />
        ) : activeMenu === 'feedback' ? (
          <AdminFeedbackReportsScreen />
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { maxWidth: 1400, alignSelf: 'center' as const, width: '100%' as unknown as number },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Dashboard header with refresh */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.pageTitle}>Dashboard</Text>
                {dashboardData.lastAggregatedAt && (
                  <Text style={styles.lastUpdatedText}>
                    Last updated: {new Date(dashboardData.lastAggregatedAt).toLocaleString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={runAggregation}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={tc.white} />
                <Text style={styles.refreshBtnText}>Refresh Data</Text>
              </TouchableOpacity>
            </View>

            {/* Row 1: Revenue + Practice Activity */}
            <View style={[styles.row, !canLayoutTwoCol && styles.rowColumn]}>
              <View style={[styles.rowItem, canLayoutTwoCol && { flex: 1.6 }]}>
                <RevenueCard data={dashboardData} />
              </View>
              <View style={[styles.rowItem, canLayoutTwoCol && { flex: 1 }]}>
                <PracticeActivityCard data={dashboardData} />
              </View>
            </View>

            {/* Row 2: Insights + Learners + Sessions */}
            <View style={[styles.row, !canLayoutThreeCol && styles.rowColumn]}>
              <View style={[styles.rowItem, canLayoutThreeCol && { flex: 1 }]}>
                <PerformanceInsightsCard data={dashboardData} />
              </View>
              <View style={[styles.rowItem, canLayoutThreeCol && { flex: 1 }]}>
                <TopLearnersCard data={dashboardData} />
              </View>
              <View style={[styles.rowItem, canLayoutThreeCol && { flex: 1 }]}>
                <PracticeSessionsCard data={dashboardData} />
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  RESPONSIVE ROUTER
// ═══════════════════════════════════════════════

const AdminDashboardScreen: React.FC = () => {
  const { width } = useWindowDimensions();

  // Mobile / phone: < 600px  →  Mobile layout matching the design
  // Tablet / desktop: >= 600px  →  Existing desktop layout
  if (width < 600) {
    return <MobileAdminDashboard />;
  }

  return <DesktopAdminDashboard />;
};

// ------- Desktop Styles -------
const SIDEBAR_WIDTH = 220;

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: tc.background,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: tc.white,
    borderRightWidth: 1,
    borderRightColor: tc.cardBorder,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'flex-start' as const,
  },
  sidebarLogoutBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc.error + '30',
    backgroundColor: tc.error + '08',
    marginTop: 16,
    marginBottom: 8,
  },
  sidebarLogoutText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.error,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingLeft: 4,
  },
  logo: {
    width: 48,
    height: 48,
  },
  sidebarSection: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: tc.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  sidebarItemActive: {
    backgroundColor: tc.accent,
  },
  sidebarLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.textLight,
  },
  sidebarLabelActive: {
    color: tc.white,
    fontFamily: fonts.semiBold,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: tc.white,
    borderBottomWidth: 1,
    borderBottomColor: tc.divider,
    minHeight: 56,
    flexWrap: 'nowrap' as const,
  },
  topBarLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    minWidth: 0,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: tc.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  searchIcon: {
    marginLeft: 8,
  },
  topBarRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginLeft: 16,
    flexShrink: 0,
  },
  topBarLogoutBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tc.error + '30',
    backgroundColor: tc.error + '08',
  },
  topBarLogoutText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.error,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tc.accentMuted,
  },
  adminLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.text,
  },
  notifBadge: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tc.error,
  },
  mainArea: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: tc.text,
    marginBottom: 0,
  },
  dashboardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 20,
  },
  lastUpdatedText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textMuted,
    marginTop: 4,
  },
  refreshBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: tc.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.white,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 16,
  },
  rowColumn: {
    flexDirection: 'column' as const,
  },
  rowItem: {
    flex: 1,
    minWidth: 0,
    marginBottom: 8,
  },
  card: {
    backgroundColor: tc.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    padding: 20,
    marginBottom: 0,
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          // @ts-ignore web-only for hover transition feel
          transition: 'box-shadow 0.2s ease',
        }
      : {}),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textMuted,
    marginTop: 2,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: tc.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  outlineBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: tc.accent,
  },
  bigNumber: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: tc.text,
    marginTop: 4,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  growthText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.success,
  },
  growthSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textMuted,
  },
  dateRange: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textMuted,
    marginTop: 6,
    marginBottom: 12,
  },
  chartContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
  },
  learnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  learnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  learnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  learnerInitials: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: tc.white,
  },
  learnerName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.text,
  },
  learnerSessions: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
  },
  // Loading & error states (desktop)
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: tc.textLight,
    marginTop: 12,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: tc.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: tc.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.white,
  },
});

export default AdminDashboardScreen;
