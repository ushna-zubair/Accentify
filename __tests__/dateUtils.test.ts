/**
 * Tests for dateUtils — shared date utility functions.
 *
 * Pure functions with no external dependencies.
 */
import {
  getWeekNumber,
  getWeekYear,
  getWeekStart,
  toDateKey,
  formatDate,
  formatDateRange,
  weekDocId,
  parseDate,
  isSameDay,
  isYesterday,
} from '../src/utils/dateUtils';

describe('dateUtils', () => {
  // ─── getWeekNumber ───
  describe('getWeekNumber', () => {
    it('returns week 1 for Jan 1 2026 (Thursday)', () => {
      expect(getWeekNumber(new Date(2026, 0, 1))).toBe(1);
    });

    it('returns week 53 for Dec 31 2020', () => {
      expect(getWeekNumber(new Date(2020, 11, 31))).toBe(53);
    });
  });

  // ─── getWeekYear ───
  describe('getWeekYear', () => {
    it('returns the ISO week-year', () => {
      // Jan 1 2026 is Thursday in week 1 of 2026
      expect(getWeekYear(new Date(2026, 0, 1))).toBe(2026);
    });

    it('handles year boundary (Dec 31 2020 → ISO week-year 2020)', () => {
      expect(getWeekYear(new Date(2020, 11, 31))).toBe(2020);
    });
  });

  // ─── getWeekStart ───
  describe('getWeekStart', () => {
    it('returns Monday for a Wednesday', () => {
      // March 4 2026 is Wednesday → Monday is March 2
      const result = getWeekStart(new Date(2026, 2, 4));
      expect(result.getDate()).toBe(2);
      expect(result.getMonth()).toBe(2);
    });

    it('returns same day for a Monday', () => {
      // March 2 2026 is Monday
      const result = getWeekStart(new Date(2026, 2, 2));
      expect(result.getDate()).toBe(2);
    });

    it('returns previous Monday for a Sunday', () => {
      // March 8 2026 is Sunday → Monday is March 2
      const result = getWeekStart(new Date(2026, 2, 8));
      expect(result.getDate()).toBe(2);
    });
  });

  // ─── toDateKey ───
  describe('toDateKey', () => {
    it('formats date as YYYY-MM-DD with zero padding', () => {
      expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toDateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
    });
  });

  // ─── formatDate ───
  describe('formatDate', () => {
    it('formats date as MMM-DD-YYYY', () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe('Jan-05-2026');
      expect(formatDate(new Date(2026, 11, 25))).toBe('Dec-25-2026');
    });
  });

  // ─── formatDateRange ───
  describe('formatDateRange', () => {
    it('formats a date range', () => {
      const result = formatDateRange(new Date(2026, 2, 2), new Date(2026, 2, 8));
      expect(result).toContain('Mar');
      expect(result).toContain(' - ');
    });
  });

  // ─── weekDocId ───
  describe('weekDocId', () => {
    it('returns "week-YYYY-WW" format', () => {
      const result = weekDocId(new Date(2026, 0, 1)); // Week 1 of 2026
      expect(result).toBe('week-2026-01');
    });
  });

  // ─── parseDate ───
  describe('parseDate', () => {
    it('parses YYYY-MM-DD string', () => {
      const d = parseDate('2026-03-15');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(15);
    });

    it('returns epoch for null/undefined', () => {
      expect(parseDate(null).getTime()).toBe(0);
      expect(parseDate(undefined).getTime()).toBe(0);
    });

    it('returns epoch for invalid string', () => {
      expect(parseDate('not-a-date').getTime()).toBe(0);
    });

    it('handles Firestore Timestamp-like objects', () => {
      const fakeTimestamp = { toDate: () => new Date(2026, 5, 15) };
      const d = parseDate(fakeTimestamp);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5);
    });
  });

  // ─── isSameDay ───
  describe('isSameDay', () => {
    it('returns true for same day', () => {
      expect(isSameDay(new Date(2026, 2, 4, 10), new Date(2026, 2, 4, 22))).toBe(true);
    });

    it('returns false for different days', () => {
      expect(isSameDay(new Date(2026, 2, 4), new Date(2026, 2, 5))).toBe(false);
    });
  });

  // ─── isYesterday ───
  describe('isYesterday', () => {
    it('returns true when a is exactly one day before b', () => {
      expect(isYesterday(new Date(2026, 2, 3), new Date(2026, 2, 4))).toBe(true);
    });

    it('returns false for same day', () => {
      expect(isYesterday(new Date(2026, 2, 4), new Date(2026, 2, 4))).toBe(false);
    });

    it('returns false for two days apart', () => {
      expect(isYesterday(new Date(2026, 2, 2), new Date(2026, 2, 4))).toBe(false);
    });
  });
});
