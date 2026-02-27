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

export type CMSStackParamList = {
  CMSDashboard: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminManageLessons: undefined;
  AdminManageUsers: undefined;
  AdminFeedback: undefined;
  AdminSettings: undefined;
  AdminBilling: undefined;
  AdminAccessControl: undefined;
  AdminSupport: undefined;
};
