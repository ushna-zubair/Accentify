/**
 * Tests for error handling utilities.
 */
import { AppError, friendlyError, safeCall, trySafe } from '../src/utils/errors';

// Mock FirebaseError (minimal shape)
class MockFirebaseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'FirebaseError';
    // FirebaseError from firebase/app has this shape
    Object.setPrototypeOf(this, MockFirebaseError.prototype);
  }
}

describe('AppError', () => {
  it('creates an error with message and code', () => {
    const err = new AppError('Something broke', 'test/error');
    expect(err.message).toBe('Something broke');
    expect(err.code).toBe('test/error');
    expect(err.name).toBe('AppError');
  });

  it('defaults code to "unknown"', () => {
    const err = new AppError('Oops');
    expect(err.code).toBe('unknown');
  });

  it('preserves the cause', () => {
    const cause = new Error('original');
    const err = new AppError('Wrapper', 'wrap', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('friendlyError', () => {
  it('returns AppError as-is', () => {
    const original = new AppError('Already friendly', 'test');
    expect(friendlyError(original)).toBe(original);
  });

  it('maps generic Error to AppError', () => {
    const err = friendlyError(new Error('something'));
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('something');
    expect(err.code).toBe('unknown');
  });

  it('handles non-Error values', () => {
    const err = friendlyError('string error');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('unknown');
  });

  it('handles null/undefined', () => {
    const err = friendlyError(null);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('An unexpected error occurred.');
  });
});

describe('safeCall', () => {
  it('returns the result on success', async () => {
    const result = await safeCall(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('throws AppError on failure', async () => {
    await expect(
      safeCall(() => Promise.reject(new Error('boom')), 'test op'),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('trySafe', () => {
  it('returns data on success', async () => {
    const { data, error } = await trySafe(() => Promise.resolve('hello'));
    expect(data).toBe('hello');
    expect(error).toBeNull();
  });

  it('returns error on failure', async () => {
    const { data, error } = await trySafe(() => Promise.reject(new Error('fail')));
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(AppError);
    expect(error!.message).toBe('fail');
  });
});
