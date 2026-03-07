/**
 * Tests for progressService date utility functions.
 *
 * These are pure functions with no Firestore dependency,
 * making them ideal for unit testing.
 */
import {
  getWeekNumber,
  getWeekYear,
  getWeekStart,
  toDateKey,
  formatDate,
} from '../src/services/progressService';

describe('progressService — Date Helpers', () => {
  // ─── getWeekNumber ───
  describe('getWeekNumber', () => {
    it('returns week 1 for Jan 1 2026 (Thursday)', () => {
      // Jan 1 2026 is a Thursday → ISO week 1
      expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
    });

    it('returns week 10 for March 7 2026 (Saturday)', () => {
      // March 7 2026 is a Saturday → ISO week 10
      expect(getWeekNumber(new Date(2026, 2, 7))).toBe(10);
    });

    it('returns week 53 for Dec 31 2020 (Thursday)', () => {
      // 2020 had 53 ISO weeks
      expect(getWeekNumber(new Date(2020, 11, 31))).toBe(53);
    });

    it('returns a number between 1 and 53', () => {
      const wn = getWeekNumber(new Date());
      expect(wn).toBeGreaterThanOrEqual(1);
      expect(wn).toBeLessThanOrEqual(53);
    });
  });

  // ─── getWeekYear ───
  describe('getWeekYear', () => {
    it('returns 2026 for a date in mid-2026', () => {
      expect(getWeekYear(new Date(2026, 5, 15))).toBe(2026);
    });

    it('may return prior year for dates in early January', () => {
      // Jan 1 2027 is a Friday → ISO week 53 of 2026
      const wy = getWeekYear(new Date(2027, 0, 1));
      expect(wy).toBe(2026);
    });
  });

  // ─── getWeekStart ───
  describe('getWeekStart', () => {
    it('returns Monday for a Wednesday input', () => {
      // March 4, 2026 is a Wednesday; Monday is March 2
      const result = getWeekStart(new Date(2026, 2, 4));
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(2);
    });

    it('returns the same day when input is Monday', () => {
      // March 2, 2026 is already Monday
      const result = getWeekStart(new Date(2026, 2, 2));
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(2);
    });

    it('returns previous Monday for a Sunday input', () => {
      // March 8, 2026 is a Sunday → Monday is March 2
      const result = getWeekStart(new Date(2026, 2, 8));
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(2);
    });
  });

  // ─── toDateKey ───
  describe('toDateKey', () => {
    it('formats a date as YYYY-MM-DD with zero-padded month and day', () => {
      expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('handles December correctly', () => {
      expect(toDateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
    });

    it('handles double-digit months and days', () => {
      expect(toDateKey(new Date(2026, 9, 15))).toBe('2026-10-15');
    });
  });

  // ─── formatDate ───
  describe('formatDate', () => {
    it('formats as MMM-DD-YYYY', () => {
      expect(formatDate(new Date(2026, 2, 7))).toBe('Mar-07-2026');
    });

    it('uses correct month abbreviations', () => {
      expect(formatDate(new Date(2026, 0, 1))).toBe('Jan-01-2026');
      expect(formatDate(new Date(2026, 11, 31))).toBe('Dec-31-2026');
    });

    it('zero-pads single-digit days', () => {
      expect(formatDate(new Date(2026, 5, 3))).toBe('Jun-03-2026');
    });
  });
});
