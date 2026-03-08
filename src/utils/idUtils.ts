/**
 * idUtils.ts
 *
 * Shared ID-generation helpers using CSPRNG instead of Math.random().
 */
import * as Crypto from 'expo-crypto';

/**
 * Generate a 5-digit numeric short ID (10 000 – 99 999) using
 * a cryptographically-secure random source.
 *
 * This replaces the previous `Math.floor(10000 + Math.random() * 90000)`
 * which had collision risk in high-concurrency scenarios.
 */
export function generateShortId(): string {
  // getRandomValues fills a Uint32Array from a CSPRNG
  const arr = new Uint32Array(1);
  Crypto.getRandomValues(arr);
  // Map the 32-bit value into the 10000–99999 range
  const id = 10000 + (arr[0] % 90000);
  return String(id);
}
