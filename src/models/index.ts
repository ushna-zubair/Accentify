// ─── Auth / User Models ───
import type { ImageSourcePropType } from 'react-native';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'learner' | 'content_author' | 'admin';

export interface UserProfile {
  email: string;
  role: UserRole;
  fullName: string;
  profileComplete: boolean;
  createdAt?: Timestamp;
}

export interface OnboardingPayload {
  profile: {
    fullName: string;
    nickName: string;
    dateOfBirth: string;
    phoneNumber: string;
    gender: string;
    profilePictureUrl: string;
  };
  security: {
    appPin: string | null;
    biometricsEnabled: boolean;
    twoFactorEnabled: boolean;
  };
  studyPlan: {
    learningGoals: string[];
    nativeLanguage: string;
    englishLevel: string;
  };
}

// ─── Navigation Models ───
export type ProfileData = {
  fullName: string;
  nickName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: string;
  profilePictureUrl: string;
};

export type StudyPlanData = {
  learningGoals: string[];
  nativeLanguage: string;
  englishLevel: string;
};

// ─── Accessibility Models ───
export type ColorBlindMode = 'None' | 'Deuteranope' | 'Protanope' | 'Tritanope';
export type FontStyleOption = 'Standard' | 'Bold' | 'Extra Bold (Dyslexia Friendly)' | 'Italic';

export interface AccessibilityState {
  textToSpeech: boolean;
  colorBlindMode: ColorBlindMode;
  fontStyle: FontStyleOption;
  transcript: boolean;
  reduceAnimation: boolean;
  highContrastMode: boolean;
}

// ─── App Preference Models ───
export type ThemeOption = 'Light' | 'Dark';
export type AccentColor = 'Lavender' | 'Orange' | 'Blue';
export type FontSizeOption = 'Small' | 'Medium' | 'Large';

export interface AppPreferenceState {
  theme: ThemeOption;
  accentColor: AccentColor;
  fontSize: FontSizeOption;
  highContrastMode: boolean;
}

// ─── Notification Models ───
export type NotificationTab = 'Direct' | 'Overall';

export interface NotificationItem {
  id: string;
  text: string;
  time: string;
  avatar: ImageSourcePropType;
  unread: boolean;
  tab: NotificationTab;
}

export interface NotificationSection {
  title: string;
  data: NotificationItem[];
}

// ─── Profile Settings Models ───
export type LearningGoal = 'Pronunciation' | 'Vocabulary' | 'Fluency';

export interface ProfileState {
  username: string;
  email: string;
  country: string;
  timeZone: string;
  learningGoals: LearningGoal[];
  profilePictureUrl: string;
}

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

// ─── Tutor / Lesson Models ───
export type LessonDifficulty = 'Easy' | 'Medium' | 'Challenging';

export interface TutorLesson {
  id: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  /** Local require() or remote URI */
  thumbnail?: ImageSourcePropType;
  /** Firestore progress status for this user */
  status: LessonStatus;
  /** Category: pronunciation, conversation, vocabulary */
  category: string;
  /** Order within study path */
  order: number;
}

export interface TutorStats {
  completedLessons: number;
  totalHours: number;
}

export interface TutorScreenData {
  userName: string;
  avatarUrl?: string;
  stats: TutorStats;
  /** Lessons the user started but hasn't finished */
  recentLessons: TutorLesson[];
  /** Full ordered study path */
  studyPath: TutorLesson[];
}

export interface LessonDetailData {
  id: string;
  title: string;
  /** Full description shown on detail screen */
  fullDescription: string;
  /** Category: pronunciation, conversation, vocabulary */
  category: string;
  difficulty: LessonDifficulty;
  /** Ordered tips for "Remember to focus:" section */
  focusTips: string[];
  /** Remote image URL for the lesson illustration */
  imageUrl?: string;
  status: LessonStatus;
}

// ─── Progress Models ───
export type LessonStatus = 'completed' | 'in_progress' | 'upcoming';

export interface LessonDay {
  id: string;
  day: number;
  status: LessonStatus;
  date: string;
}

export interface PronunciationMetrics {
  clarity: number;
  soundAccuracy: number;
  smoothness: number;
  rhythmAndTone: number;
}

export interface ConversationMetrics {
  fluency: number;
  vocabulary: number;
  grammarUsage: number;
  turnTaking: number;
}

export interface VocabularyGrowthPoint {
  label: string;
  value: number;
}

export interface OverallPerformance {
  speechAccuracy: number;
  speechFluency: number;
  speechConsistency: number;
}

export interface WeeklyProgress {
  weekNumber: number;
  weekStartDate: string;
  pronunciation: PronunciationMetrics;
  conversation: ConversationMetrics;
  vocabularyGrowth: VocabularyGrowthPoint[];
  overallPerformance: OverallPerformance;
}

export interface ProgressData {
  dayStreak: number;
  lessonDays: LessonDay[];
  currentWeekIndex: number;
  weeks: WeeklyProgress[];
}

// ─── Insights Models ───
export type EnglishLevel = 'A1 Beginner' | 'A2 Elementary' | 'B1 Intermediate' | 'B2 Upper Intermediate' | 'C1 Fluent' | 'C2 Proficient';

export interface InsightsUserData {
  userId: string;
  currentLevel: EnglishLevel;
  weeklyProgress: WeeklyProgress;
  lessonDays: LessonDay[];
  weekLabel: string;
}

// ─── User Management Models ───
export interface ManagedUser {
  uid: string;
  userId: string;     // short numeric ID shown in the table
  fullName: string;
  email: string;
}

export type AccountStatus = 'active' | 'deactivated';

export interface UserDetailData {
  uid: string;
  username: string;
  fullName: string;
  email: string;
  userId: string;
  password: string;
  status: AccountStatus;
  activeSince: string;
  role: 'admin' | 'learner' | 'content_author';
}

// ─── Navigation Param Lists ───
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  CreateProfile: undefined;
  ForgotPassword: undefined;
  OTPVerification: undefined;
  CreateNewPassword: undefined;
  LearningGoals: { profile: ProfileData };
  NativeLanguage: { profile: ProfileData; learningGoals: string[] };
  EnglishLevel: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string };
  SetupPin: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string };
  SetupFaceID: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null };
  TwoFactorAuth: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  ChooseVerificationMethod: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  SetupAuthenticator: { profile: ProfileData; learningGoals: string[]; nativeLanguage: string; englishLevel: string; appPin: string | null; biometricsEnabled: boolean };
  SetYourFingerprint: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Accessibility: undefined;
  Notifications: undefined;
  AppPreferences: undefined;
  ProfileSettings: undefined;
};

export type LearnerTabParamList = {
  Home: undefined;
  Tutor: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type TutorStackParamList = {
  TutorMain: undefined;
  LessonDetail: { lessonId: string };
};

export type CMSStackParamList = {
  CMSDashboard: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminInsights: undefined;
  AdminManageLessons: undefined;
  AdminManageUsers: undefined;
  AdminUserDetail: { uid: string };
  AdminAnnouncements: undefined;
  AdminFeedback: undefined;
  AdminSettings: undefined;
  AdminBilling: undefined;
  AdminAccessControl: undefined;
  AdminSupport: undefined;
};
