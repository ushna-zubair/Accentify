/**
 * Tests for src/utils/synonymMatch.ts
 *
 * Verifies the synonym-typing match logic used by the vocab exercise.
 */

import { checkSynonym } from '../src/utils/synonymMatch';

describe('checkSynonym()', () => {
  const happySynonyms = ['joyful', 'cheerful', 'glad', 'content'];

  it('accepts an exact match', () => {
    const r = checkSynonym('joyful', happySynonyms);
    expect(r.correct).toBe(true);
    expect(r.matched).toBe('joyful');
    expect(r.fuzzy).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(checkSynonym('JOYFUL', happySynonyms).correct).toBe(true);
    expect(checkSynonym('Glad', happySynonyms).correct).toBe(true);
  });

  it('trims whitespace and ignores punctuation', () => {
    expect(checkSynonym('  joyful! ', happySynonyms).correct).toBe(true);
  });

  it('accepts a single-edit typo on long enough words', () => {
    const r = checkSynonym('joyfull', happySynonyms);
    expect(r.correct).toBe(true);
    expect(r.matched).toBe('joyful');
    expect(r.fuzzy).toBe(true);
  });

  it('accepts substitution typos within distance 1', () => {
    const r = checkSynonym('cheerfol', happySynonyms);
    expect(r.correct).toBe(true);
    expect(r.fuzzy).toBe(true);
  });

  it('rejects 1-edit collisions on short words', () => {
    // "cot" vs "cat" — both 3 chars, Levenshtein 1 — must NOT match.
    expect(checkSynonym('cot', ['cat']).correct).toBe(false);
    // Even shorter user input below threshold:
    expect(checkSynonym('co', ['cat']).correct).toBe(false);
  });

  it('still accepts exact matches on short words', () => {
    expect(checkSynonym('cat', ['cat']).correct).toBe(true);
  });

  it('rejects unrelated words', () => {
    expect(checkSynonym('sad', happySynonyms).correct).toBe(false);
    expect(checkSynonym('angry', happySynonyms).correct).toBe(false);
  });

  it('rejects empty input', () => {
    expect(checkSynonym('', happySynonyms).correct).toBe(false);
    expect(checkSynonym('   ', happySynonyms).correct).toBe(false);
  });

  it('matches against multiple acceptable answers, returning the first hit', () => {
    const r = checkSynonym('content', happySynonyms);
    expect(r.correct).toBe(true);
    expect(r.matched).toBe('content');
  });

  it('returns the original casing of the matched answer, not the user input', () => {
    const r = checkSynonym('CHEERFUL', happySynonyms);
    expect(r.matched).toBe('cheerful');
  });

  it('handles empty acceptable list', () => {
    expect(checkSynonym('anything', []).correct).toBe(false);
  });
});
