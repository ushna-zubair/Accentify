/**
 * stringUtils.ts
 *
 * Shared string-comparison helpers used across exercise controllers.
 * Centralises levenshtein distance and text normalisation so each
 * controller doesn't carry its own duplicate copy.
 */

// ═══════════════════════════════════════════════
//  NORMALISATION
// ═══════════════════════════════════════════════

/**
 * Strip a word down to lowercase alphanumerics + apostrophes.
 * Used before fuzzy comparison so punctuation doesn't skew distance.
 */
export const normalize = (w: string): string =>
  w.toLowerCase().replace(/[^a-z0-9']/g, '');

// ═══════════════════════════════════════════════
//  LEVENSHTEIN DISTANCE
// ═══════════════════════════════════════════════

/**
 * Classic dynamic-programming Levenshtein edit distance.
 * O(m·n) time / space — fine for short words & sentences.
 */
export const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};
