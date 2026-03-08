/**
 * Shared date utilities used across services and controllers.
 *
 * Consolidates date helpers that were previously duplicated in
 * progressService.ts, adminService.ts, etc.
 */

/** ISO-8601 week number (Monday-based). */
export const getWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/** ISO week-year (the year the Thursday of the ISO week falls in). */
export const getWeekYear = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
};

/** Monday of the week containing `d`. */
export const getWeekStart = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Format a Date as YYYY-MM-DD. */
export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Format a Date as "MMM-DD-YYYY". */
export const formatDate = (d: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
};

/** Format a date range as "MMM DD - MMM DD, YY". */
export const formatDateRange = (start: Date, end: Date): string => {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: '2-digit' });
  return `${s} - ${e}`;
};

/** Weekly document ID: "week-2026-09". */
export const weekDocId = (d: Date): string => {
  const wn = getWeekNumber(d);
  const yr = getWeekYear(d);
  return `week-${yr}-${String(wn).padStart(2, '0')}`;
};

/**
 * Parse YYYY-MM-DD → Date (local midnight).
 * Handles Firestore Timestamps and edge cases.
 */
export const parseDate = (s: unknown): Date => {
  if (!s) return new Date(0);
  if (typeof s === 'object' && s !== null && 'toDate' in s && typeof (s as any).toDate === 'function') {
    return (s as any).toDate();
  }
  if (typeof s !== 'string') return new Date(0);
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return new Date(0);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
};

/** Check if two dates are the same calendar day. */
export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Check if `a` is exactly one calendar day before `b`. */
export const isYesterday = (a: Date, b: Date): boolean => {
  const prev = new Date(b);
  prev.setDate(prev.getDate() - 1);
  return isSameDay(a, prev);
};
