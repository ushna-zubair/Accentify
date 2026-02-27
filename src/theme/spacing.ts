/**
 * Accentify Design System – Spacing & Layout Tokens
 *
 * Consistent spacing scale used across the app.
 */

/** 4-point spacing scale */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

/** Border radius tokens */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

/** @deprecated Use typography tokens from './typography' instead */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  title: 28,
} as const;

/** Commonly reused constants */
export const SPLASH_DELAY_MS = 2000;
export const OTP_RESEND_SECONDS = 58;
export const MIN_PASSWORD_LENGTH = 8;
