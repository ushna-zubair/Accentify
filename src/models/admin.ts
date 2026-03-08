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

// ═══════════════════════════════════════════════
//  MANAGE LESSONS (Admin)
// ═══════════════════════════════════════════════

export type LessonCategory = 'conversation' | 'pronunciation' | 'vocabulary';
export type AdminLessonStatus = 'published' | 'draft' | 'archived';

export const LESSON_CATEGORY_LABELS: Record<LessonCategory, string> = {
  conversation: 'Conversation',
  pronunciation: 'Pronunciation',
  vocabulary: 'Vocabulary',
};

export const ADMIN_LESSON_STATUS_LABELS: Record<AdminLessonStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export interface AdminLesson {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  category: LessonCategory;
  difficulty: 'Easy' | 'Medium' | 'Challenging';
  order: number;
  status: AdminLessonStatus;
  focusTips: string[];
  imageUrl: string;
  /** Lesson level for progression (Level 1, Level 2, …) */
  level: number;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Custom congratulations message shown on the completion screen */
  completionMessage: string;
  /** URL for the celebration illustration on the completion screen */
  completionImageUrl: string;
  /** Tags for categorization and search */
  tags: string[];
  /** IDs of prerequisite lessons that must be completed first */
  prerequisites: string[];
  /** Minimum passing score (0–100). 0 = no minimum */
  passingScore: number;
  /** Max attempts allowed. 0 = unlimited */
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  enrolledCount: number;
  completedCount: number;
  vocabPairCount: number;
}

/** Form data for a single vocab word pair in the lesson form */
export interface AdminVocabPairForm {
  /** Temp client-side id (UUID) for list key; empty string for new pairs */
  id: string;
  basicWord: string;
  vocabWord: string;
  basicPhonetic: string;
  vocabPhonetic: string;
  basicDefinition: string;
  vocabDefinition: string;
  exampleSentence: string;
}

export const DEFAULT_VOCAB_PAIR: AdminVocabPairForm = {
  id: '',
  basicWord: '',
  vocabWord: '',
  basicPhonetic: '',
  vocabPhonetic: '',
  basicDefinition: '',
  vocabDefinition: '',
  exampleSentence: '',
};

export interface AdminLessonFormData {
  title: string;
  description: string;
  fullDescription: string;
  category: LessonCategory;
  difficulty: 'Easy' | 'Medium' | 'Challenging';
  order: number;
  status: AdminLessonStatus;
  focusTips: string[];
  imageUrl: string;
  /** Lesson level for progression (Level 1, Level 2, …) */
  level: number;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  /** Custom congratulations message shown on the completion screen */
  completionMessage: string;
  /** URL for the celebration illustration on the completion screen */
  completionImageUrl: string;
  /** Tags for categorization and search */
  tags: string[];
  /** IDs of prerequisite lessons that must be completed first */
  prerequisites: string[];
  /** Minimum passing score (0–100). 0 = no minimum */
  passingScore: number;
  /** Max attempts allowed. 0 = unlimited */
  maxAttempts: number;
  /** Vocab word pairs — only relevant for vocabulary-category lessons */
  vocabPairs: AdminVocabPairForm[];
}

export const DEFAULT_LESSON_FORM: AdminLessonFormData = {
  title: '',
  description: '',
  fullDescription: '',
  category: 'conversation',
  difficulty: 'Easy',
  order: 0,
  status: 'draft',
  focusTips: [],
  imageUrl: '',
  level: 1,
  estimatedMinutes: 15,
  completionMessage: '',
  completionImageUrl: '',
  tags: [],
  prerequisites: [],
  passingScore: 70,
  maxAttempts: 0,
  vocabPairs: [],
};

export interface AdminLessonStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalEnrolled: number;
  totalCompleted: number;
  byCategory: Record<LessonCategory, number>;
}

export type ManageLessonsTab = 'all' | 'published' | 'draft' | 'archived';

// ═══════════════════════════════════════════════
//  SUPPORT & LOGS
// ═══════════════════════════════════════════════

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type SupportTicketCategory = 'account' | 'billing' | 'technical' | 'content' | 'feature_request' | 'other';

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  account: 'Account',
  billing: 'Billing',
  technical: 'Technical',
  content: 'Content',
  feature_request: 'Feature Request',
  other: 'Other',
};

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo: string;
  assignedToName: string;
  adminNotes: string;
  response: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
}

export interface SupportTicketFormData {
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  adminNotes: string;
  response: string;
  tags: string[];
}

export const DEFAULT_TICKET_FORM: SupportTicketFormData = {
  subject: '',
  description: '',
  category: 'technical',
  priority: 'medium',
  status: 'open',
  adminNotes: '',
  response: '',
  tags: [],
};

export interface SupportStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  critical: number;
  avgResponseHours: number;
}

export type SupportTab = 'tickets' | 'logs';
export type TicketFilterTab = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

export type SystemLogLevel = 'info' | 'warning' | 'error' | 'debug';
export type SystemLogSource = 'auth' | 'firestore' | 'functions' | 'storage' | 'admin' | 'system';

export const LOG_LEVEL_LABELS: Record<SystemLogLevel, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  debug: 'Debug',
};

export const LOG_SOURCE_LABELS: Record<SystemLogSource, string> = {
  auth: 'Authentication',
  firestore: 'Firestore',
  functions: 'Cloud Functions',
  storage: 'Storage',
  admin: 'Admin Panel',
  system: 'System',
};

export interface SystemLog {
  id: string;
  level: SystemLogLevel;
  source: SystemLogSource;
  message: string;
  details: string;
  userId: string;
  adminUid: string;
  adminName: string;
  timestamp: string;
  metadata: Record<string, any>;
}

