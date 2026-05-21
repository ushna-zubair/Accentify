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

// ─── Navigation Param Lists ───
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  EmailVerification: { maskedEmail: string };
  CreateProfile: undefined;
  ForgotPassword: { email: string };
  OTPVerification: { uid: string; method: 'email' | 'sms'; maskedContact: string };
  CreateNewPassword: { uid: string; sessionToken: string };
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
  LoginDevices: undefined;
  TwoFactorSettings: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  HomePronunciation: { lessonId?: string };
  WavyChat: undefined;
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
  VocabExercise: { lessonId: string };
  PronunciationExercise: { lessonId: string };
  ConversationExercise: { lessonId: string };
  CourseCompletion: { lessonId: string; courseTitle: string; completedCount: number; totalWeekly: number };
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
