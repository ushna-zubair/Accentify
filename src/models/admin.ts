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
  lastAggregatedAt: string | null;
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

// ─── Admin Access Control Models ───

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer';

export interface AdminPermissions {
  manageUsers: boolean;
  manageLessons: boolean;
  manageAnnouncements: boolean;
  viewAnalytics: boolean;
  manageAdmins: boolean;
  manageSettings: boolean;
  manageBilling: boolean;
  viewLogs: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    manageUsers: true,
    manageLessons: true,
    manageAnnouncements: true,
    viewAnalytics: true,
    manageAdmins: true,
    manageSettings: true,
    manageBilling: true,
    viewLogs: true,
  },
  admin: {
    manageUsers: true,
    manageLessons: true,
    manageAnnouncements: true,
    viewAnalytics: true,
    manageAdmins: false,
    manageSettings: true,
    manageBilling: false,
    viewLogs: true,
  },
  moderator: {
    manageUsers: true,
    manageLessons: false,
    manageAnnouncements: true,
    viewAnalytics: true,
    manageAdmins: false,
    manageSettings: false,
    manageBilling: false,
    viewLogs: false,
  },
  viewer: {
    manageUsers: false,
    manageLessons: false,
    manageAnnouncements: false,
    viewAnalytics: true,
    manageAdmins: false,
    manageSettings: false,
    manageBilling: false,
    viewLogs: false,
  },
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

export const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  manageUsers: 'Manage Users',
  manageLessons: 'Manage Lessons',
  manageAnnouncements: 'Manage Announcements',
  viewAnalytics: 'View Analytics',
  manageAdmins: 'Manage Admins',
  manageSettings: 'Manage Settings',
  manageBilling: 'Manage Billing',
  viewLogs: 'View Activity Logs',
};

export interface AdminMember {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  adminRole: AdminRole;
  permissions: AdminPermissions;
  status: 'active' | 'suspended' | 'deactivated';
  lastSeen: string | null;
  createdAt: string;
  twoFactorEnabled: boolean;
  invitedBy: string | null;
}

export interface AdminActivityLog {
  id: string;
  adminUid: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export interface InviteAdminPayload {
  email: string;
  fullName: string;
  adminRole: AdminRole;
  permissions: AdminPermissions;
}

// ═══════════════════════════════════════════════
//  FEEDBACK & REPORTS
// ═══════════════════════════════════════════════

export type FeedbackCategory = 'bug' | 'feature' | 'content' | 'ui' | 'performance' | 'other';
export type FeedbackPriority = 'critical' | 'high' | 'medium' | 'low';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'archived';

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  content: 'Content Issue',
  ui: 'UI / UX',
  performance: 'Performance',
  other: 'Other',
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  archived: 'Archived',
};

export interface FeedbackItem {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  subject: string;
  description: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  assignedToName: string | null;
  adminNotes: string;
  responseMessage: string;
  respondedAt: string | null;
  respondedBy: string | null;
  respondedByName: string | null;
  tags: string[];
  deviceInfo: string;
  appVersion: string;
}

export interface FeedbackStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  critical: number;
  avgResolutionHours: number;
  satisfactionRate: number;
}

export type FeedbackTab = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

