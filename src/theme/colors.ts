/**
 * Accentify Design System – Color Tokens
 *
 * Official 60-30-10 color system:
 *  • 60 % Background  → white
 *  • 30 % Typography   → black / dark neutrals
 *  • 10 % Brand accent → primary palette
 *
 * All colour values used across the app are declared here.
 * Never use raw hex strings in component files — import from this module.
 */

const colors = {
  // ═══════════════════════════════════════════════
  //  PALETTE SCALES
  // ═══════════════════════════════════════════════

  // ─── Primary (Brand / Accent 1) ───
  primary900: '#1F327E',
  primary800: '#2F4CBC',
  primary700: '#3F66FB',
  primary600: '#9FB2FD',
  primary500: '#CFD8FE',

  // ─── Base ───
  white: '#FFFFFF',
  black: '#000000',

  // ─── Dark Neutral ───
  darkNeutral900: '#333333',
  darkNeutral800: '#808080',
  darkNeutral700: '#BFBFBF',
  darkNeutral600: '#E5E5E5',
  darkNeutral500: '#F2F2F2',

  // ─── Light Neutral ───
  lightNeutral900: '#F5F5F5',
  lightNeutral800: '#B3B3B3',
  lightNeutral700: '#8C8C8C',
  lightNeutral600: '#595959',
  lightNeutral500: '#404040',

  // ─── Success ───
  success900: '#1E611E',
  success800: '#2D912D',
  success700: '#3DC13C',
  success600: '#9DE09D',
  success500: '#CEEFCE',

  // ─── Warning ───
  warning900: '#7A5D0D',
  warning800: '#B68C14',
  warning700: '#F3BB1B',
  warning600: '#F9DD8D',
  warning500: '#FCEEC6',

  // ─── Error ───
  error900: '#430D0F',
  error800: '#B5282D',
  error700: '#E94F54',
  error600: '#F89A9D',
  error500: '#FBCDCF',

  // ─── Accent Orange ───
  accentOrange900: '#7F471C',
  accentOrange800: '#BE6A2B',
  accentOrange700: '#FD8E39',
  accentOrange600: '#FEC79C',
  accentOrange500: '#FFE3CD',

  // ─── Accent Pink ───
  accentPink900: '#7F3F4E',
  accentPink800: '#BF5F75',
  accentPink700: '#FE7F9C',
  accentPink600: '#FFBFCE',
  accentPink500: '#F8DFE5',

  // ─── Accent Brown ───
  accentBrown900: '#3F231B',
  accentBrown800: '#5F3529',
  accentBrown700: '#7F4737',
  accentBrown600: '#BFA39B',
  accentBrown500: '#DFD1CD',

  // ═══════════════════════════════════════════════
  //  SEMANTIC ALIASES
  // ═══════════════════════════════════════════════

  // ─── Brand ───
  /** Main brand / action color (primary700) */
  primary: '#3F66FB',
  /** Lighter brand (primary600) */
  primaryLight: '#9FB2FD',
  /** Muted / pastel brand (primary500) */
  primaryMuted: '#CFD8FE',
  /** Darker brand (primary800) */
  primaryDark: '#2F4CBC',
  /** Very light tint for brand-tinted backgrounds (primary500) */
  primaryBg: '#CFD8FE',

  // ─── Surfaces (60 % rule) ───
  /** Main screen background */
  background: '#FFFFFF',
  /** Card / elevated surface */
  surface: '#FFFFFF',
  /** Subtle alternative surface (lightNeutral900) */
  surfaceAlt: '#F5F5F5',
  /** Form input fill (darkNeutral500) */
  inputBg: '#F2F2F2',
  /** Form input stroke (darkNeutral600) */
  inputBorder: '#E5E5E5',
  /** Card border (darkNeutral600) */
  cardBorder: '#E5E5E5',

  // ─── Text (30 % rule) ───
  /** Primary text (darkNeutral900) */
  text: '#333333',
  /** Secondary / label text (darkNeutral800) */
  textLight: '#808080',
  /** Placeholder / hint text (lightNeutral800) */
  textMuted: '#B3B3B3',
  /** Text on primary-colored surfaces */
  textOnPrimary: '#FFFFFF',
  /** Interactive link text (primary700) */
  textLink: '#3F66FB',

  // ─── Feedback (semantic) ───
  error: '#E94F54',
  errorBg: '#FBCDCF',
  success: '#3DC13C',
  successBg: '#CEEFCE',
  warning: '#F3BB1B',
  warningBg: '#FCEEC6',
  info: '#3F66FB',
  infoBg: '#CFD8FE',

  // ─── Misc UI ───
  /** Disabled controls (darkNeutral700) */
  disabled: '#BFBFBF',
  /** Divider / separator lines (darkNeutral600) */
  divider: '#E5E5E5',
  /** Modal / sheet overlay */
  overlay: 'rgba(0,0,0,0.4)',
  /** Switch track – off state (darkNeutral700) */
  switchTrack: '#BFBFBF',
  /** Light overlay (white 25% opacity) – icon backgrounds on colored surfaces */
  overlayLight: 'rgba(255,255,255,0.25)',
  /** Shadow / elevation color */
  shadow: '#000000',
  /** Avatar placeholder fill (primary600) */
  avatarBg: '#9FB2FD',

  // ─── Tab Bar ───
  tabBarBg: '#5B4FC7',
  tabBarActive: '#7B6FE0',
  tabBarInactive: 'rgba(255,255,255,0.50)',
  tabBarLabel: '#FFFFFF',

  // ─── Admin Dashboard ───
  adminBg: '#F5F5F5',
  adminSidebar: '#FFFFFF',
  adminSidebarBorder: '#E5E5E5',
  adminCardBg: '#FFFFFF',
  adminMuted: '#808080',

  // ─── Third-party Brand ───
  googleBlue: '#4285F4',
  appleBlack: '#000000',
} as const;

export type ColorToken = keyof typeof colors;

export default colors;
