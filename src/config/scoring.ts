/**
 * Single source of truth for pronunciation scoring thresholds and result tiers.
 *
 * Score scale convention: the Accentify API returns 0–1 floats; the app
 * (controllers, Firestore, UI) works in 0–100 percentages. Conversions happen
 * at the API boundary in pronunciationService.ts / the word controller's
 * adapter — every other layer reads these constants in percent.
 */

export const COMPLETE_THRESHOLD_PCT = 75;
export const PRACTICE_THRESHOLD_PCT = 1;
export const STREAK_THRESHOLD_PCT = 75;

export const DEFAULT_DAILY_GOAL = 5;

export type ScoreTier = 'excellent' | 'great' | 'almost' | 'needs-work';

export const tierForScore = (overallPct: number): ScoreTier => {
  if (overallPct >= 90) return 'excellent';
  if (overallPct >= 75) return 'great';
  if (overallPct >= 60) return 'almost';
  return 'needs-work';
};

const TIER_LABELS: Record<ScoreTier, string> = {
  excellent: 'Excellent!',
  great: 'Nicely done',
  almost: 'Almost there',
  'needs-work': 'Keep practicing',
};

export const tierLabel = (tier: ScoreTier): string => TIER_LABELS[tier];

export const isCompleted = (overallPct: number): boolean =>
  overallPct >= COMPLETE_THRESHOLD_PCT;

export const isPracticeItem = (overallPct: number): boolean =>
  overallPct >= PRACTICE_THRESHOLD_PCT;
