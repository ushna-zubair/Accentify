/**
 * Tests for responsive scaling utility functions.
 *
 * Only the pure functions (scale, verticalScale, moderateScale) are tested.
 * The useResponsive hook requires a React context and is tested implicitly
 * through component tests.
 */
import { scale, verticalScale, moderateScale } from '../src/utils/responsive';

// Design baseline: 375 × 812

describe('responsive — scale()', () => {
  it('returns the same value when screen width equals baseline (375)', () => {
    expect(scale(16, 375)).toBeCloseTo(16);
    expect(scale(100, 375)).toBeCloseTo(100);
  });

  it('scales up proportionally for wider screens', () => {
    // 750 is 2× the baseline
    expect(scale(16, 750)).toBeCloseTo(32);
  });

  it('scales down proportionally for narrower screens', () => {
    // 187.5 is 0.5× the baseline
    expect(scale(16, 187.5)).toBeCloseTo(8);
  });

  it('returns 0 for size 0', () => {
    expect(scale(0, 375)).toBe(0);
    expect(scale(0, 1000)).toBe(0);
  });
});

describe('responsive — verticalScale()', () => {
  it('returns the same value when screen height equals baseline (812)', () => {
    expect(verticalScale(16, 812)).toBeCloseTo(16);
  });

  it('scales up for taller screens', () => {
    expect(verticalScale(16, 1624)).toBeCloseTo(32);
  });

  it('scales down for shorter screens', () => {
    expect(verticalScale(16, 406)).toBeCloseTo(8);
  });
});

describe('responsive — moderateScale()', () => {
  it('returns the original size when screen equals baseline', () => {
    expect(moderateScale(16, 375, 0.5)).toBeCloseTo(16);
  });

  it('with factor=0 returns the original size regardless of screen width', () => {
    expect(moderateScale(16, 750, 0)).toBeCloseTo(16);
    expect(moderateScale(16, 200, 0)).toBeCloseTo(16);
  });

  it('with factor=1 behaves like linear scale', () => {
    expect(moderateScale(16, 750, 1)).toBeCloseTo(scale(16, 750));
  });

  it('with factor=0.5 gives a dampened scale (halfway between original and linear)', () => {
    const linear = scale(16, 750);   // 32
    const original = 16;
    const expected = original + (linear - original) * 0.5; // 24
    expect(moderateScale(16, 750, 0.5)).toBeCloseTo(expected);
  });

  it('default factor is 0.5', () => {
    const withDefault = moderateScale(16, 750);
    const withExplicit = moderateScale(16, 750, 0.5);
    expect(withDefault).toBeCloseTo(withExplicit);
  });
});
