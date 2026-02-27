import React from 'react';
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
import colors from '../../theme/colors';
import BarChart from './components/BarChart';
import DonutChart from './components/DonutChart';
import LineChart from './components/LineChart';
import PerformanceBubbles from './components/PerformanceBubbles';
import { useAdminDashboardController, MENU_ITEMS, OTHERS_ITEMS } from '../../controllers';
import type { DashboardData } from '../../models';

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
  const { width } = useWindowDimensions();
  const {
    activeMenu,
    setActiveMenu,
    searchQuery,
    setSearchQuery,
    dashboardData,
    handleLogout,
  } = useAdminDashboardController();

  const isWide = width >= 900;
  const isTablet = width >= 600 && width < 900;

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
