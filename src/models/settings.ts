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
