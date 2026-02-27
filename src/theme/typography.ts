/**
 * Accentify Design System – Typography Tokens
 *
 * Font: Poppins (Google Fonts)
 * Scale derived from the official design system style guide.
 *
 * Usage:
 *   import { typography, fonts } from '../theme/typography';
 *   const styles = StyleSheet.create({
 *     screenTitle: { ...typography.h3, color: colors.text },
 *   });
 */

import { TextStyle } from 'react-native';

// ─── Font Family Constants ───
// These map to the exact names loaded via @expo-google-fonts/poppins.
// Using weight-specific family names is the cross-platform safe pattern.
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

// ─── Typography Scale ───

/**
 * Header – Mobile
 * | Scale    | Weight | Letter-space | Line-height | Size |
 * |----------|--------|-------------|-------------|------|
 * | Header 1 | Bold   | -2%         | 64          | 52   |
 * | Header 2 | Bold   | -2%         | 44          | 36   |
 * | Header 3 | Bold   | -2%         | 32          | 28   |
 * | Header 4 | Medium | -1.5%       | 28          | 24   |
 */
const h1: TextStyle = {
  fontFamily: fonts.bold,
  fontSize: 52,
  lineHeight: 64,
  letterSpacing: -1.04, // -2% of 52
};

const h2: TextStyle = {
  fontFamily: fonts.bold,
  fontSize: 36,
  lineHeight: 44,
  letterSpacing: -0.72, // -2% of 36
};

const h3: TextStyle = {
  fontFamily: fonts.bold,
  fontSize: 28,
  lineHeight: 32,
  letterSpacing: -0.56, // -2% of 28
};

const h4: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 24,
  lineHeight: 28,
  letterSpacing: -0.36, // -1.5% of 24
};

/**
 * Paragraph
 * | Scale          | Weight  | Letter-space | Line-height | Size |
 * |----------------|---------|-------------|-------------|------|
 * | Paragraph – XL | Regular | 0%          | 48          | 32   |
 * | Paragraph – LG | Regular | 0%          | 36          | 24   |
 * | Paragraph – MD | Regular | 0%          | 32          | 20   |
 * | Paragraph – SM | Regular | 2%          | 28          | 18   |
 * | Paragraph – XS | Regular | 2%          | 24          | 16   |
 * | Paragraph – XXS| Regular | 2%          | 24          | 14   |
 */
const paragraphXL: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 32,
  lineHeight: 48,
  letterSpacing: 0,
};

const paragraphLG: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 24,
  lineHeight: 36,
  letterSpacing: 0,
};

const paragraphMD: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 20,
  lineHeight: 32,
  letterSpacing: 0,
};

const paragraphSM: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 18,
  lineHeight: 28,
  letterSpacing: 0.36, // 2% of 18
};

const paragraphXS: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 16,
  lineHeight: 24,
  letterSpacing: 0.32, // 2% of 16
};

const paragraphXXS: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 14,
  lineHeight: 24,
  letterSpacing: 0.28, // 2% of 14
};

/**
 * Button
 * | Scale       | Weight  | Letter-space | Line-height | Size |
 * |-------------|---------|-------------|-------------|------|
 * | Button – LG | Regular | 4%          | 24          | 20   |
 * | Button – MD | Regular | 4%          | 20          | 18   |
 */
const buttonLG: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 20,
  lineHeight: 24,
  letterSpacing: 0.8, // 4% of 20
};

const buttonMD: TextStyle = {
  fontFamily: fonts.regular,
  fontSize: 18,
  lineHeight: 20,
  letterSpacing: 0.72, // 4% of 18
};

/**
 * Label
 * | Scale       | Weight | Letter-space | Line-height | Size |
 * |-------------|--------|-------------|-------------|------|
 * | Label – XL  | Medium | 0%          | 48          | 32   |
 * | Label – LG  | Medium | 0%          | 36          | 28   |
 * | Label – MD  | Medium | 0%          | 32          | 20   |
 * | Label – SM  | Medium | 0%          | 24          | 16   |
 * | Label – XS  | Medium | 0%          | 24          | 14   |
 * | Label – XXS | Medium | 0%          | 20          | 12   |
 */
const labelXL: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 32,
  lineHeight: 48,
  letterSpacing: 0,
};

const labelLG: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 28,
  lineHeight: 36,
  letterSpacing: 0,
};

const labelMD: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 20,
  lineHeight: 32,
  letterSpacing: 0,
};

const labelSM: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 16,
  lineHeight: 24,
  letterSpacing: 0,
};

const labelXS: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 14,
  lineHeight: 24,
  letterSpacing: 0,
};

const labelXXS: TextStyle = {
  fontFamily: fonts.medium,
  fontSize: 12,
  lineHeight: 20,
  letterSpacing: 0,
};

// ─── Exports ───

export const typography = {
  // Headers
  h1,
  h2,
  h3,
  h4,

  // Paragraph
  paragraphXL,
  paragraphLG,
  paragraphMD,
  paragraphSM,
  paragraphXS,
  paragraphXXS,

  // Button
  buttonLG,
  buttonMD,

  // Label
  labelXL,
  labelLG,
  labelMD,
  labelSM,
  labelXS,
  labelXXS,
} as const;

export type TypographyToken = keyof typeof typography;

export default typography;
