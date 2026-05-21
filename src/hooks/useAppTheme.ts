/**
 * useAppTheme – Resolves the current AppPreferenceState into concrete style values.
 *
 * Usage:
 *   const theme = useAppTheme();
 *   <View style={{ backgroundColor: theme.colors.background }}>
 *     <Text style={{ fontSize: theme.fontSizes.body, color: theme.colors.text }}>Hello</Text>
 *     <TouchableOpacity style={{ backgroundColor: theme.colors.accent }}>…</TouchableOpacity>
 *   </View>
 */

import { useMemo } from 'react';
import { useAppPreference } from '../context/AppPreferenceContext';
import type { ThemeOption, AccentColor, FontSizeOption } from '../models';

// ═══════════════════════════════════════════════
//  COLOR MAPS
// ═══════════════════════════════════════════════

/** Semantic color palette returned by the hook. */
export interface ThemeColors {
  /** Main screen background */
  background: string;
  /** Card / elevated surface */
  surface: string;
  /** Subtle alternative surface */
  surfaceAlt: string;
  /** Primary text */
  text: string;
  /** Secondary / label text */
  textLight: string;
  /** Placeholder / hint text */
  textMuted: string;
  /** Text rendered on top of the accent color */
  textOnAccent: string;
  /** User-chosen accent (mapped from AccentColor) */
  accent: string;
  /** Lighter tint of the accent */
  accentLight: string;
  /** Muted / pastel tint of the accent */
  accentMuted: string;
  /** Darker shade of the accent */
  accentDark: string;
  /** Form input fill */
  inputBg: string;
  /** Form input stroke */
  inputBorder: string;
  /** Divider / separator lines */
  divider: string;
  /** Disabled controls */
  disabled: string;
  /** Card border */
  cardBorder: string;
  /** Error */
  error: string;
  /** Success */
  success: string;
  /** Warning */
  warning: string;
  /** Pure white – icons on colored surfaces */
  white: string;
  /** Pure black */
  black: string;
  /** Light success background tint */
  successBg: string;
  /** Light error background tint */
  errorBg: string;
  /** Light warning background tint */
  warningBg: string;
  /** Deep warning for text on warningBg */
  warningDeep: string;
  /** Modal / sheet overlay */
  overlay: string;
  /** Very light accent background (for icon pills) */
  accentBg: string;
  /** Tab bar background */
  tabBarBg: string;
  /** Tab bar active tint */
  tabBarActive: string;
  /** Tab bar inactive tint */
  tabBarInactive: string;
  /** Tab bar label text */
  tabBarLabel: string;
}

const LIGHT_BASE: Omit<ThemeColors, 'accent' | 'accentLight' | 'accentMuted' | 'accentDark' | 'accentBg'> = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  text: '#333333',
  textLight: '#808080',
  textMuted: '#B3B3B3',
  textOnAccent: '#FFFFFF',
  inputBg: '#F2F2F2',
  inputBorder: '#E5E5E5',
  divider: '#E5E5E5',
  disabled: '#BFBFBF',
  cardBorder: '#E5E5E5',
  error: '#E94F54',
  success: '#3DC13C',
  warning: '#F3BB1B',
  white: '#FFFFFF',
  black: '#000000',
  successBg: '#CEEFCE',
  errorBg: '#FBCDCF',
  warningBg: '#FCEEC6',
  warningDeep: '#7A5D0D',
  overlay: 'rgba(0,0,0,0.4)',
  tabBarBg: '#5B4FC7',
  tabBarActive: '#7B6FE0',
  tabBarInactive: 'rgba(255,255,255,0.50)',
  tabBarLabel: '#FFFFFF',
};

const DARK_BASE: Omit<ThemeColors, 'accent' | 'accentLight' | 'accentMuted' | 'accentDark' | 'accentBg'> = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2A2A2A',
  text: '#E5E5E5',
  textLight: '#A0A0A0',
  textMuted: '#6B6B6B',
  textOnAccent: '#FFFFFF',
  inputBg: '#2A2A2A',
  inputBorder: '#3D3D3D',
  divider: '#3D3D3D',
  disabled: '#4A4A4A',
  cardBorder: '#3D3D3D',
  error: '#FF6B6B',
  success: '#4ADE4A',
  warning: '#FFD54F',
  white: '#FFFFFF',
  black: '#000000',
  successBg: '#1A3A1A',
  errorBg: '#3A1A1A',
  warningBg: '#3A351A',
  warningDeep: '#FFD54F',
  overlay: 'rgba(0,0,0,0.6)',
  tabBarBg: '#1A1A2E',
  tabBarActive: '#7B6FE0',
  tabBarInactive: 'rgba(255,255,255,0.35)',
  tabBarLabel: '#FFFFFF',
};

/** High-contrast overrides applied on top of either base. */
const HIGH_CONTRAST_LIGHT: Partial<ThemeColors> = {
  background: '#FFFFFF',
  text: '#000000',
  textLight: '#333333',
  textMuted: '#595959',
  divider: '#000000',
  cardBorder: '#000000',
  inputBorder: '#000000',
};

const HIGH_CONTRAST_DARK: Partial<ThemeColors> = {
  background: '#000000',
  surface: '#0A0A0A',
  text: '#FFFFFF',
  textLight: '#E0E0E0',
  textMuted: '#B0B0B0',
  divider: '#FFFFFF',
  cardBorder: '#FFFFFF',
  inputBorder: '#FFFFFF',
};

/** Accent color scales keyed by AccentColor. */
interface AccentScale {
  accent: string;
  accentLight: string;
  accentMuted: string;
  accentDark: string;
  accentBg: string;
}

const ACCENT_MAP: Record<AccentColor, { light: AccentScale; dark: AccentScale }> = {
  Lavender: {
    light: {
      accent: '#3F66FB',
      accentLight: '#9FB2FD',
      accentMuted: '#CFD8FE',
      accentDark: '#2F4CBC',
      accentBg: '#EEF1FF',
    },
    dark: {
      accent: '#6B8AFF',
      accentLight: '#4A6AE0',
      accentMuted: '#1E2A5E',
      accentDark: '#8FA8FF',
      accentBg: '#1A1F3A',
    },
  },
  Orange: {
    light: {
      accent: '#FD8E39',
      accentLight: '#FEC79C',
      accentMuted: '#FFE3CD',
      accentDark: '#BE6A2B',
      accentBg: '#FFF5EB',
    },
    dark: {
      accent: '#FFA05C',
      accentLight: '#C87A3A',
      accentMuted: '#3A2A1A',
      accentDark: '#FFB87A',
      accentBg: '#2A1F15',
    },
  },
  Blue: {
    light: {
      accent: '#4285F4',
      accentLight: '#7AADFF',
      accentMuted: '#C5DCFF',
      accentDark: '#2B6AD0',
      accentBg: '#EBF5FF',
    },
    dark: {
      accent: '#5A9AFF',
      accentLight: '#3D7DE0',
      accentMuted: '#1A2A4E',
      accentDark: '#7AB4FF',
      accentBg: '#151F35',
    },
  },
};

function resolveColors(
  theme: ThemeOption,
  accentColor: AccentColor,
  highContrast: boolean,
): ThemeColors {
  const isDark = theme === 'Dark';
  const base = isDark ? { ...DARK_BASE } : { ...LIGHT_BASE };
  const hcOverrides = highContrast
    ? isDark
      ? HIGH_CONTRAST_DARK
      : HIGH_CONTRAST_LIGHT
    : {};
  const accent = isDark
    ? ACCENT_MAP[accentColor].dark
    : ACCENT_MAP[accentColor].light;

  return { ...base, ...hcOverrides, ...accent };
}

// ═══════════════════════════════════════════════
//  FONT SIZE MAP
// ═══════════════════════════════════════════════

export interface ThemeFontSizes {
  /** Screen / section title */
  title: number;
  /** Subtitle / card header */
  subtitle: number;
  /** Body / paragraph text */
  body: number;
  /** Secondary labels */
  label: number;
  /** Small captions / hints */
  caption: number;
}

const FONT_SIZE_MAP: Record<FontSizeOption, ThemeFontSizes> = {
  Small: {
    title: 22,
    subtitle: 18,
    body: 14,
    label: 12,
    caption: 10,
  },
  Medium: {
    title: 26,
    subtitle: 20,
    body: 16,
    label: 14,
    caption: 12,
  },
  Large: {
    title: 32,
    subtitle: 24,
    body: 20,
    label: 16,
    caption: 14,
  },
};

// ═══════════════════════════════════════════════
//  HOOK
// ═══════════════════════════════════════════════

export interface AppTheme {
  /** Resolved semantic color palette */
  colors: ThemeColors;
  /** Resolved numeric font sizes */
  fontSizes: ThemeFontSizes;
  /** Whether the active theme is dark */
  isDark: boolean;
}

/**
 * Reads the current `AppPreferenceState` from context and returns
 * resolved color tokens and font-size values ready to use in styles.
 */
export function useAppTheme(): AppTheme {
  const { theme, accentColor, fontSize, highContrastMode } = useAppPreference();

  return useMemo<AppTheme>(
    () => ({
      colors: resolveColors(theme, accentColor, highContrastMode),
      fontSizes: FONT_SIZE_MAP[fontSize],
      isDark: theme === 'Dark',
    }),
    [theme, accentColor, fontSize, highContrastMode],
  );
}
