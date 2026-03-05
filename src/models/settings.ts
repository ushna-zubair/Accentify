// ─── Accessibility Models ───
import type { ImageSourcePropType } from 'react-native';

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
  /** Firestore timestamp (ISO string) for sorting; falls back to `time` for display */
  createdAt?: string;
}

export interface NotificationSection {
  title: string;
  data: NotificationItem[];
}

// ─── Login Devices Models ───
export type DevicePlatform = 'ios' | 'android' | 'web';

export interface LoginDevice {
  /** Unique id for this session/device entry */
  id: string;
  /** Display name (e.g. "iPhone 14 Pro", "Chrome on macOS") */
  deviceName: string;
  /** Platform icon key */
  platform: DevicePlatform;
  /** ISO-8601 timestamp of last activity */
  lastActiveAt: string;
  /** IP address (optional, recorded at login) */
  ipAddress?: string;
  /** City/country (optional, derived from IP) */
  location?: string;
  /** Whether this entry represents the current session */
  isCurrent: boolean;
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
