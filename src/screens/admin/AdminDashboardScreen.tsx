import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import BarChart from './components/BarChart';
import DonutChart from './components/DonutChart';
import LineChart from './components/LineChart';
import PerformanceBubbles from './components/PerformanceBubbles';

// ------- Types -------
type SidebarItem = {
  label: string;
  icon: string;
  iconSet: 'ionicons' | 'mci' | 'feather';
  key: string;
};

interface TopLearner {
  name: string;
  sessions: number;
  avatar?: string;
}

interface DashboardData {
  activeUsers: number;
  growthPct: number;
  usageDateRange: string;
  weeklyBarData: { label: string; thisWeek: number; lastWeek: number }[];
  practiceActivity: { morning: number; afternoon: number; night: number };
  pronunciationAccuracy: number;
  fluencyAccuracy: number;
  vocabularyRetention: number;
  topLearners: TopLearner[];
  totalSessions: number;
  sessionsGrowth: number;
  sessionsThisWeek: number[];
  sessionsLastWeek: number[];
}

// ------- Constants -------
const MENU_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', iconSet: 'ionicons', key: 'dashboard' },
  { label: 'Manage Lessons', icon: 'book-outline', iconSet: 'ionicons', key: 'lessons' },
  { label: 'Manage Users', icon: 'people-outline', iconSet: 'ionicons', key: 'users' },
  { label: 'Feedback & Reports', icon: 'chatbox-ellipses-outline', iconSet: 'ionicons', key: 'feedback' },
];

const OTHERS_ITEMS: SidebarItem[] = [
  { label: 'Settings', icon: 'settings-outline', iconSet: 'ionicons', key: 'settings' },
  { label: 'Subscription & billing', icon: 'card-outline', iconSet: 'ionicons', key: 'billing' },
  { label: 'Admin access control', icon: 'shield-checkmark-outline', iconSet: 'ionicons', key: 'access' },
  { label: 'Support & logs', icon: 'help-circle-outline', iconSet: 'ionicons', key: 'support' },
];

const DEFAULT_DATA: DashboardData = {
  activeUsers: 1245,
  growthPct: 8.4,
  usageDateRange: 'Oct 10 - 21 Oct, 25',
  weeklyBarData: [
    { label: 'Mon', thisWeek: 80, lastWeek: 60 },
    { label: 'Tue', thisWeek: 65, lastWeek: 50 },
    { label: 'Wed', thisWeek: 90, lastWeek: 70 },
    { label: 'Thur', thisWeek: 75, lastWeek: 55 },
    { label: 'Fri', thisWeek: 85, lastWeek: 68 },
    { label: 'Sat', thisWeek: 50, lastWeek: 45 },
    { label: 'Sun', thisWeek: 40, lastWeek: 35 },
  ],
  practiceActivity: { morning: 35, afternoon: 45, night: 20 },
  pronunciationAccuracy: 85,
  fluencyAccuracy: 86,
  vocabularyRetention: 92,
  topLearners: [
    { name: 'Sarah Lee', sessions: 48 },
    { name: 'Alex Chen', sessions: 43 },
    { name: 'Maria Lopez', sessions: 39 },
    { name: 'Omer Noor', sessions: 36 },
  ],
  totalSessions: 2568,
  sessionsGrowth: 8.4,
  sessionsThisWeek: [20, 35, 28, 42, 55, 50],
  sessionsLastWeek: [15, 22, 30, 25, 35, 40],
};

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
            color={active ? colors.white : '#6B7280'}
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
            color={active ? colors.white : '#6B7280'}
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
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={onSearchChange}
      />
      <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
    </View>
    <View style={styles.topBarRight}>
      <View style={styles.adminBadge}>
        <Image source={require('../../../assets/logo.png')} style={styles.adminAvatar} />
        <Text style={styles.adminLabel}>Admin Dashboard</Text>
        <Ionicons name="chevron-down" size={16} color="#1A1A2E" />
      </View>
      <View style={styles.notifBadge}>
        <Ionicons name="notifications-outline" size={22} color="#6B2FD9" />
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
      <Ionicons name="arrow-up" size={14} color="#22C55E" />
      <Text style={styles.growthText}>{data.growthPct}%</Text>
      <Text style={styles.growthSub}>vs last week</Text>
    </View>
    <Text style={styles.dateRange}>Usage from {data.usageDateRange}</Text>
    <View style={styles.chartContainer}>
      <BarChart data={data.weeklyBarData} height={160} />
    </View>
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#6B2FD9' }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#C4B5FD' }]} />
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
        { label: 'Morning Sessions', value: data.practiceActivity.morning, color: '#8B5CF6' },
        { label: 'Afternoon Sessions', value: data.practiceActivity.afternoon, color: '#6B2FD9' },
        { label: 'Night Sessions', value: data.practiceActivity.night, color: '#C4B5FD' },
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
    <Text style={styles.cardSubtitle}>Lorem ipsum dolor sit amet, consectetur</Text>
    <PerformanceBubbles
      data={[
        { label: 'Pronunciation', subLabel: 'Accuracy', value: data.pronunciationAccuracy, color: '#6B2FD9', size: 110 },
        { label: 'Fluency', subLabel: 'Accuracy', value: data.fluencyAccuracy, color: '#F59E0B', size: 120 },
        { label: 'Vocabulary', subLabel: 'Retention', value: data.vocabularyRetention, color: '#3B82F6', size: 100 },
      ]}
    />
  </View>
);

const TopLearnersCard: React.FC<{ data: DashboardData }> = ({ data }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Top Performing Learners</Text>
    <Text style={styles.cardSubtitle}>Adipiscing elit, sed do eiusmod tempor</Text>
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
      <Ionicons name="arrow-up" size={14} color="#22C55E" />
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
        <View style={[styles.legendDot, { backgroundColor: '#6B2FD9' }]} />
        <Text style={styles.legendText}>This Week</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
        <Text style={styles.legendText}>Last Week</Text>
      </View>
    </View>
  </View>
);

// ------- Main Screen -------
const AdminDashboardScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData>(DEFAULT_DATA);

  // Load real data from Firestore if available
  useEffect(() => {
    (async () => {
      try {
        // Attempt to load top learners from Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('studyPlan.totalSessions', 'desc'), limit(4));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const learners: TopLearner[] = [];
          snap.forEach((doc) => {
            const d = doc.data();
            learners.push({
              name: d.profile?.fullName || d.profile?.nickName || 'Unknown',
              sessions: d.studyPlan?.totalSessions || 0,
            });
          });
          if (learners.length > 0 && learners[0].sessions > 0) {
            setDashboardData((prev) => ({ ...prev, topLearners: learners }));
          }
        }

        // Attempt to load aggregate stats
        const statsDoc = await getDocs(collection(db, 'admin_stats'));
        if (!statsDoc.empty) {
          const stats = statsDoc.docs[0].data();
          setDashboardData((prev) => ({
            ...prev,
            activeUsers: stats.activeUsers ?? prev.activeUsers,
            totalSessions: stats.totalSessions ?? prev.totalSessions,
            growthPct: stats.growthPct ?? prev.growthPct,
          }));
        }
      } catch (e) {
        // Firestore data may not exist yet — use defaults
        console.log('Using default dashboard data');
      }
    })();
  }, []);

  const isWide = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <View style={styles.root}>
      {/* Sidebar (wide screens only) */}
      {isWide && (
        <Sidebar
          activeKey={activeMenu}
          onSelect={setActiveMenu}
          onLogout={handleLogout}
        />
      )}

      {/* Main area */}
      <View style={styles.mainArea}>
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Dashboard</Text>

          {/* Row 1: Revenue + Practice Activity */}
          <View style={[styles.row, !isWide && styles.rowColumn]}>
            <View style={[styles.rowItem, isWide && { flex: 1.6 }]}>
              <RevenueCard data={dashboardData} />
            </View>
            <View style={[styles.rowItem, isWide && { flex: 1 }]}>
              <PracticeActivityCard data={dashboardData} />
            </View>
          </View>

          {/* Row 2: 3 cards */}
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

// ------- Styles -------
const SIDEBAR_WIDTH = 220;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  // Sidebar
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
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
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  sidebarLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
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
    backgroundColor: '#E0D9FF',
  },
  adminLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
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
    backgroundColor: '#EF4444',
  },
  // Main area
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
  },
  // Layout
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
  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  bigNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 4,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  growthText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  growthSub: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateRange: {
    fontSize: 12,
    color: '#9CA3AF',
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
    fontSize: 12,
    color: '#6B7280',
  },
  // Top learners
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  learnerSessions: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default AdminDashboardScreen;
