/**
 * synonymMatch.ts
 *
 * Matching logic for the vocabulary synonym-typing exercise. Decides whether
 * a user's typed answer counts as one of the acceptable synonyms for a word.
 *
 * Strategy:
 *   1. Exact match (after normalisation) — always accepted.
 *   2. Single-edit typo match (Levenshtein ≤ 1) — accepted only when both
 *      strings are at least 3 characters long, so short words like "cat" /
 *      "cot" don't collapse into each other.
 *
 * Pure functions — easy to unit test, no Firestore or React dependencies.
 */

import { levenshtein, normalize } from './stringUtils';

/**
 * Both the user input and the candidate must be at least this long for
 * a 1-edit fuzzy match to be accepted. Set to 4 so short 3-letter words
 * ("cat", "dog", "run") demand exact spelling — at length 3, a single
 * substitution would collapse unrelated words into each other.
 */
const MIN_FUZZY_LENGTH = 4;

export interface SynonymMatchResult {
  correct: boolean;
  /** Which entry from `acceptable` matched, in its original casing. */
  matched?: string;
  /** True when the match required typo tolerance (Levenshtein 1, not exact). */
  fuzzy?: boolean;
}

/**
 * Decide whether `userInput` matches any synonym in `acceptable`.
 * Comparison is normalised (lowercase, punctuation-stripped) and tolerates
 * single-character typos on inputs of length ≥ 3.
 */
export const checkSynonym = (
  userInput: string,
  acceptable: readonly string[],
): SynonymMatchResult => {
  const u = normalize(userInput);
  if (!u) return { correct: false };

  for (const cand of acceptable) {
    if (normalize(cand) === u) {
      return { correct: true, matched: cand, fuzzy: false };
    }
  }

  if (u.length < MIN_FUZZY_LENGTH) return { correct: false };

  for (const cand of acceptable) {
    const c = normalize(cand);
    if (c.length < MIN_FUZZY_LENGTH) continue;
    if (levenshtein(u, c) <= 1) {
      return { correct: true, matched: cand, fuzzy: true };
    }
  }

  return { correct: false };
};
