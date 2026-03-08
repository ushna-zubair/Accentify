/**
 * Shared async error handling utilities.
 *
 * Services that do single Firestore reads/writes can let errors propagate
 * to the calling controller (standard React pattern). These helpers are for
 * multi-step or user-facing operations where partial failure needs a clean
 * recovery path.
 */

import { FirebaseError } from 'firebase/app';

/**
 * Standardised application error with a user-friendly message.
 */
export class AppError extends Error {
  /** Machine-readable code for programmatic handling. */
  readonly code: string;
  /** Original error for logging. */
  readonly cause?: unknown;

  constructor(message: string, code = 'unknown', cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Map common Firebase/Cloud Function errors to user-friendly messages.
 */
export function friendlyError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'permission-denied':
      case 'functions/permission-denied':
        return new AppError('You don\'t have permission to do this.', err.code, err);
      case 'not-found':
      case 'functions/not-found':
        return new AppError('The requested resource was not found.', err.code, err);
      case 'unauthenticated':
      case 'functions/unauthenticated':
        return new AppError('Please sign in to continue.', err.code, err);
      case 'unavailable':
      case 'functions/unavailable':
        return new AppError('Service temporarily unavailable. Please try again.', err.code, err);
      case 'resource-exhausted':
      case 'functions/resource-exhausted':
        return new AppError('Too many requests. Please wait a moment.', err.code, err);
      case 'deadline-exceeded':
      case 'functions/deadline-exceeded':
        return new AppError('Request timed out. Please try again.', err.code, err);
      case 'auth/network-request-failed':
        return new AppError('Network error. Please check your connection.', err.code, err);
      case 'auth/too-many-requests':
        return new AppError('Too many attempts. Please wait before trying again.', err.code, err);
      case 'auth/email-already-in-use':
        return new AppError('This email is already registered.', err.code, err);
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return new AppError('Invalid email or password.', err.code, err);
      case 'auth/user-not-found':
        return new AppError('No account found with this email.', err.code, err);
      default:
        return new AppError(
          err.message || 'Something went wrong. Please try again.',
          err.code,
          err,
        );
    }
  }

  // Generic error
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
  return new AppError(msg, 'unknown', err);
}

/**
 * Wraps an async operation with consistent error handling.
 *
 * Usage:
 * ```ts
 * const data = await safeCall(() => fetchSomething(), 'Failed to load data');
 * ```
 */
export async function safeCall<T>(
  fn: () => Promise<T>,
  fallbackMessage = 'Operation failed',
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[safeCall] ${fallbackMessage}:`, err);
    throw friendlyError(err);
  }
}

/**
 * Same as `safeCall` but returns `{ data, error }` instead of throwing.
 * Useful when the caller wants to handle the error inline.
 */
export async function trySafe<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}
