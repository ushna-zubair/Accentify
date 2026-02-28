/**
 * Accentify – Responsive Scaling Utilities
 *
 * Provides scale functions based on a 375×812 design baseline (iPhone X).
 * Use `useResponsive()` inside components for reactive values that update
 * on orientation changes and window resizing.
 *
 * Usage:
 *   import { useResponsive } from '../utils/responsive';
 *   const { s, vs, ms, width, height } = useResponsive();
 *   const styles = { padding: s(16), fontSize: ms(14, 0.4) };
 */

import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

// ─── Design baseline (iPhone X) ───
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Horizontal scale — linearly maps a design-pixel value to the
 * current screen width.
 */
export const scale = (size: number, screenWidth: number): number =>
  (screenWidth / BASE_WIDTH) * size;

/**
 * Vertical scale — linearly maps a design-pixel value to the
 * current screen height.
 */
export const verticalScale = (size: number, screenHeight: number): number =>
  (screenHeight / BASE_HEIGHT) * size;

/**
 * Moderate scale — a dampened version of `scale()`.
 * `factor` controls how aggressively the value scales (0 = no scaling, 1 = linear).
 * Default factor 0.5 gives a nice middle-ground.
 */
export const moderateScale = (
  size: number,
  screenWidth: number,
  factor = 0.5,
): number => size + (scale(size, screenWidth) - size) * factor;

// ─── Reactive Hook ───

export interface ResponsiveValues {
  /** Current screen width */
  width: number;
  /** Current screen height */
  height: number;
  /** Horizontal scale */
  s: (size: number) => number;
  /** Vertical scale */
  vs: (size: number) => number;
  /** Moderate scale (dampened horizontal) */
  ms: (size: number, factor?: number) => number;
  /** Whether the device is a small screen (width < 360) */
  isSmall: boolean;
  /** Whether the device is a large screen (width >= 428) */
  isLarge: boolean;
  /** Card width for 2-column grid with gap */
  cardWidth: number;
}

/**
 * Reactive hook that returns scaling functions and screen dimensions.
 * Values update automatically on orientation / window changes.
 */
export const useResponsive = (): ResponsiveValues => {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const s = (size: number) => (width / BASE_WIDTH) * size;
    const vs = (size: number) => (height / BASE_HEIGHT) * size;
    const ms = (size: number, factor = 0.5) =>
      size + (s(size) - size) * factor;

    const horizontalPadding = s(16) * 2;
    const gap = s(12);
    const cardWidth = (width - horizontalPadding - gap) / 2;

    return {
      width,
      height,
      s,
      vs,
      ms,
      isSmall: width < 360,
      isLarge: width >= 428,
      cardWidth,
    };
  }, [width, height]);
};
