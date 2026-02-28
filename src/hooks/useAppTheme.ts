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
}

const LIGHT_BASE: Omit<ThemeColors, 'accent' | 'accentLight' | 'accentMuted' | 'accentDark'> = {
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
};

const DARK_BASE: Omit<ThemeColors, 'accent' | 'accentLight' | 'accentMuted' | 'accentDark'> = {
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
}

const ACCENT_MAP: Record<AccentColor, AccentScale> = {
  Lavender: {
    accent: '#3F66FB',   // primary700
    accentLight: '#9FB2FD', // primary600
    accentMuted: '#CFD8FE', // primary500
    accentDark: '#2F4CBC',  // primary800
  },
  Orange: {
    accent: '#FD8E39',   // accentOrange700
    accentLight: '#FEC79C', // accentOrange600
    accentMuted: '#FFE3CD', // accentOrange500
    accentDark: '#BE6A2B',  // accentOrange800
  },
  Blue: {
    accent: '#4285F4',   // Google-blue / a distinct blue
    accentLight: '#7AADFF',
    accentMuted: '#C5DCFF',
    accentDark: '#2B6AD0',
  },
};

function resolveColors(
  theme: ThemeOption,
  accentColor: AccentColor,
  highContrast: boolean,
): ThemeColors {
  const base = theme === 'Dark' ? { ...DARK_BASE } : { ...LIGHT_BASE };
  const hcOverrides = highContrast
    ? theme === 'Dark'
      ? HIGH_CONTRAST_DARK
      : HIGH_CONTRAST_LIGHT
    : {};
  const accent = ACCENT_MAP[accentColor];

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
