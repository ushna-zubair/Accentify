/**
 * Tests for src/utils/stringUtils.ts
 *
 * Verifies the shared `levenshtein` and `normalize` helpers behave correctly.
 */

import { levenshtein, normalize } from '../src/utils/stringUtils';

describe('normalize()', () => {
  it('lowercases input', () => {
    expect(normalize('HELLO')).toBe('hello');
  });

  it('strips punctuation but keeps apostrophes', () => {
    expect(normalize("don't!")).toBe("don't");
  });

  it('removes spaces and hyphens', () => {
    expect(normalize('well-done friends')).toBe('welldonefriends');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });
});

describe('levenshtein()', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('kitten', 'kitten')).toBe(0);
  });

  it('returns length for empty vs non-empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('computes correct edit distance (kitten → sitting = 3)', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('computes correct edit distance (flaw → lawn = 2)', () => {
    expect(levenshtein('flaw', 'lawn')).toBe(2);
  });

  it('is symmetric', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'));
  });

  it('single substitution = 1', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });

  it('single insertion = 1', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('single deletion = 1', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });
});
