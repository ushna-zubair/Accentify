// ─── Admin Dashboard Models ───
export interface TopLearner {
  name: string;
  sessions: number;
  avatar?: string;
}

export interface DashboardData {
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

export interface SidebarItem {
  label: string;
  icon: string;
  iconSet: 'ionicons' | 'mci' | 'feather';
  key: string;
}

// ─── Admin Mobile Dashboard Models ───
export interface AdminOnline {
  uid: string;
  name: string;
  avatarUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
}

export type AdminMenuKey =
  | 'insights'
  | 'user_management'
  | 'content_management'
  | 'create_announcement';

export interface AdminMenuItem {
  key: AdminMenuKey;
  label: string;
  filled: boolean;
}

export interface AdminMobileDashboardData {
  adminName: string;
  adminAvatarUrl?: string;
  announcement: Announcement | null;
  adminsOnline: AdminOnline[];
  menuItems: AdminMenuItem[];
}

// ─── Chart Models ───
export interface BarChartDataPoint {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface PerformanceBubbleData {
  label: string;
  subLabel: string;
  value: number;
  color: string;
  size: number;
}
