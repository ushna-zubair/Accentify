import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import colors from '../../theme/colors';
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

// ═══════════════════════════════════════════════
//  MOBILE ADMIN DASHBOARD
// ═══════════════════════════════════════════════

// ─── Admin Avatar ───
const AdminAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 48 }) => {
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
const AnnouncementCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <View style={mStyles.announcementCard}>
    <Text style={mStyles.announcementTitle}>{title}</Text>
    <Text style={mStyles.announcementBody}>{body}</Text>
  </View>
);

// ─── Admins Online ───
const AdminsOnlineSection: React.FC<{ admins: AdminOnline[] }> = ({ admins }) => (
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

// ─── Menu Button ───
const MenuButton: React.FC<{
  item: AdminMenuItem;
  onPress: () => void;
}> = ({ item, onPress }) => (
  <TouchableOpacity
    style={[mStyles.menuButton, item.filled && mStyles.menuButtonFilled]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text
      style={[mStyles.menuButtonText, item.filled && mStyles.menuButtonTextFilled]}
    >
      {item.label}
    </Text>
  </TouchableOpacity>
);

// ─── Create Announcement Modal ───
const CreateAnnouncementModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
  submitting: boolean;
}> = ({ visible, onClose, onSubmit, submitting }) => {
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
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={mStyles.modalLabel}>Title</Text>
          <TextInput
            style={mStyles.modalInput}
            placeholder="Announcement title"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={mStyles.modalLabel}>Message</Text>
          <TextInput
            style={[mStyles.modalInput, mStyles.modalTextArea]}
            placeholder="Write your announcement..."
            placeholderTextColor={colors.textMuted}
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
              <ActivityIndicator color={colors.white} size="small" />
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
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { mobileData, loading, handleLogout, createAnnouncement } =
    useAdminMobileDashboardController();
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        <ActivityIndicator size="large" color={colors.primary} />
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
        <View style={mStyles.header}>
          <View style={mStyles.headerLeft}>
            <AdminAvatar name={mobileData.adminName} size={52} />
            <Text style={mStyles.headerName}>{mobileData.adminName}</Text>
          </View>
          <View style={mStyles.headerCenter}>
            <Text style={mStyles.headerTitle}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={mStyles.logoutBtn}>
            <Ionicons name="log-out-outline" size={26} color={colors.text} />
          </TouchableOpacity>
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
        <TouchableOpacity style={mStyles.continueBtn} activeOpacity={0.7}>
          <Text style={mStyles.continueBtnText}>Continue</Text>
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
const mStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    alignItems: 'center',
    gap: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  headerName: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textLight,
  },
  logoutBtn: {
    padding: 8,
  },

  // Avatar
  avatar: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontFamily: fonts.bold,
    color: colors.white,
  },
  avatarEmoji: {
    position: 'absolute',
  },

  // Announcement
  announcementCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 18,
    marginTop: 8,
  },
  announcementTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 6,
  },
  announcementBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },

  // Admins Online
  adminsOnlineSection: {
    marginTop: 20,
  },
  adminsOnlineTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  adminsOnlineRow: {
    flexDirection: 'row',
    gap: 16,
  },
  adminOnlineItem: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 70,
  },
  adminOnlineName: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
  },

  // Menu List
  menuList: {
    marginTop: 24,
    gap: 14,
    alignItems: 'center',
  },
  menuButton: {
    width: '80%',
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  menuButtonFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  menuButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.primary,
  },
  menuButtonTextFilled: {
    color: colors.white,
  },

  // Continue
  continueBtn: {
    marginTop: 30,
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  continueBtnText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
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
    color: colors.text,
  },
  modalLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.inputBg,
  },
  modalTextArea: {
    minHeight: 100,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
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
    color: colors.white,
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

const Sidebar: React.FC<SidebarProps> = ({ activeKey, onSelect, onLogout }) => (
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
            color={active ? colors.white : colors.textLight}
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
            color={active ? colors.white : colors.textLight}
          />
          <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ------- Top Bar -------
interface TopBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ searchQuery, onSearchChange }) => (
  <View style={styles.topBar}>
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search"
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
    </View>
    <View style={styles.topBarRight}>
      <View style={styles.adminBadge}>
        <Image source={require('../../../assets/logo.png')} style={styles.adminAvatar} />
        <Text style={styles.adminLabel}>Admin Dashboard</Text>
        <Ionicons name="chevron-down" size={16} color={colors.text} />
      </View>
      <View style={styles.notifBadge}>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        <View style={styles.notifDot} />
      </View>
    </View>
  </View>
);

// ------- Dashboard Cards -------

const RevenueCard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>Revenue</Text>
      <TouchableOpacity style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>View User Analytics</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.bigNumber}>{data.activeUsers.toLocaleString()} Active Users</Text>
    <View style={styles.growthRow}>
      <Ionicons name="arrow-up" size={14} color={colors.success} />
      <Text style={styles.growthText}>{data.growthPct}%</Text>
      <Text style={styles.growthSub}>vs last week</Text>
    </View>
    <Text style={styles.dateRange}>Usage from {data.usageDateRange}</Text>
    <View style={styles.chartContainer}>
      <BarChart data={data.weeklyBarData} height={160} />
    </View>
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.primaryMuted }]} />
        <Text style={styles.legendText}>Last Week</Text>
      </View>
    </View>
  </View>
);

const PracticeActivityCard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <View style={styles.card}>
    <View style={styles.cardHeaderRow}>
      <Text style={styles.cardTitle}>User Practice Activity</Text>
      <TouchableOpacity style={styles.outlineBtn}>
        <Text style={styles.outlineBtnText}>View Report</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.dateRange}>From Oct 10 - 21 Oct, 2025</Text>
    <DonutChart
      segments={[
        { label: 'Morning Sessions', value: data.practiceActivity.morning, color: colors.primaryLight },
        { label: 'Afternoon Sessions', value: data.practiceActivity.afternoon, color: colors.primary },
        { label: 'Night Sessions', value: data.practiceActivity.night, color: colors.primaryMuted },
      ]}
      size={180}
      tooltipLabel="Afternoon"
      tooltipSub="12pm - 6pm"
      tooltipValue="540 Active Users"
    />
  </View>
);

const PerformanceInsightsCard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>User Performance Insights</Text>
    <Text style={styles.cardSubtitle}>Pronunciation, fluency &amp; vocabulary metrics</Text>
    <PerformanceBubbles
      data={[
        { label: 'Pronunciation', subLabel: 'Accuracy', value: data.pronunciationAccuracy, color: colors.primary, size: 110 },
        { label: 'Fluency', subLabel: 'Accuracy', value: data.fluencyAccuracy, color: colors.warning, size: 120 },
        { label: 'Vocabulary', subLabel: 'Retention', value: data.vocabularyRetention, color: colors.primaryLight, size: 100 },
      ]}
    />
  </View>
);

const TopLearnersCard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Top Performing Learners</Text>
    <Text style={styles.cardSubtitle}>Ranked by sessions completed this month</Text>
    <View style={{ marginTop: 16, gap: 16 }}>
      {data.topLearners.map((learner, i) => (
        <View key={learner.name} style={styles.learnerRow}>
          <View style={styles.learnerLeft}>
            <Text style={styles.learnerEmoji}>
              {i === 0 ? '👩' : i === 1 ? '👨' : i === 2 ? '👩‍🦱' : '👨‍🦰'}
            </Text>
            <Text style={styles.learnerName}>{learner.name}</Text>
          </View>
          <Text style={styles.learnerSessions}>{learner.sessions} Sessions</Text>
        </View>
      ))}
    </View>
  </View>
);

const PracticeSessionsCard: React.FC<{ data: DashboardData }> = ({ data }) => (
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
      <Ionicons name="arrow-up" size={14} color={colors.success} />
      <Text style={styles.growthText}>+{data.sessionsGrowth}%</Text>
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
        <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.disabled }]} />
        <Text style={styles.legendText}>Last Week</Text>
      </View>
    </View>
  </View>
);

// ------- Desktop Main Screen -------
const DesktopAdminDashboard: React.FC = () => {
  const {
    activeMenu,
    setActiveMenu,
    searchQuery,
    setSearchQuery,
    dashboardData,
    handleLogout,
  } = useAdminDashboardController();

  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isTablet = width >= 600 && width < 900;

  return (
    <View style={styles.root}>
      {isWide && (
        <Sidebar
          activeKey={activeMenu}
          onSelect={setActiveMenu}
          onLogout={handleLogout}
        />
      )}

      <View style={styles.mainArea}>
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Dashboard</Text>

          <View style={[styles.row, !isWide && styles.rowColumn]}>
            <View style={[styles.rowItem, isWide && { flex: 1.6 }]}>
              <RevenueCard data={dashboardData} />
            </View>
            <View style={[styles.rowItem, isWide && { flex: 1 }]}>
              <PracticeActivityCard data={dashboardData} />
            </View>
          </View>

          <View style={[styles.row, !isTablet && !isWide && styles.rowColumn]}>
            <View style={styles.rowItem}>
              <PerformanceInsightsCard data={dashboardData} />
            </View>
            <View style={styles.rowItem}>
              <TopLearnersCard data={dashboardData} />
            </View>
            <View style={styles.rowItem}>
              <PracticeSessionsCard data={dashboardData} />
            </View>
          </View>
        </ScrollView>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.adminBg,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.adminSidebarBorder,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingLeft: 4,
  },
  logo: {
    width: 140,
    height: 36,
  },
  sidebarSection: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.textMuted,
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
    backgroundColor: colors.primary,
  },
  sidebarLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
  },
  sidebarLabelActive: {
    color: colors.white,
    fontFamily: fonts.semiBold,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  searchIcon: {
    marginLeft: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
  },
  adminLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
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
    backgroundColor: colors.error,
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
    color: colors.text,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  rowColumn: {
    flexDirection: 'column',
  },
  rowItem: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 0,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  outlineBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  bigNumber: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
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
    color: colors.success,
  },
  growthSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  dateRange: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
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
    color: colors.textLight,
  },
  learnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  learnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  learnerEmoji: {
    fontSize: 18,
  },
  learnerName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  learnerSessions: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
  },
});

export default AdminDashboardScreen;
