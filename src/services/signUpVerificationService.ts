/**
 * signUpVerificationService.ts
 *
 * Frontend service for the email verification step during sign-up.
 *
 * Calls two Cloud Functions:
 *   1. sendSignUpOTP   – emails a 4-digit verification code to the new user
 *   2. verifySignUpOTP – validates the code entered by the user
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

// ─── Types ───

export interface SendSignUpOTPResult {
  success: boolean;
  maskedEmail: string;
}

export interface VerifySignUpOTPResult {
  success: boolean;
}

// ─── Callable wrappers ───

/**
 * Send a 4-digit verification code to the authenticated user's email.
 * Called immediately after `createUserWithEmailAndPassword`.
 */
export async function sendSignUpOTP(): Promise<SendSignUpOTPResult> {
  const fn = httpsCallable<Record<string, never>, SendSignUpOTPResult>(
    functions,
    'sendSignUpOTP',
  );
  const result = await fn({});
  return result.data;
}

/**
 * Verify the code the user entered.
 * On success the cloud function also marks `emailVerified = true` on the
 * Firebase Auth user record.
 */
export async function verifySignUpOTP(code: string): Promise<VerifySignUpOTPResult> {
  const fn = httpsCallable<{ code: string }, VerifySignUpOTPResult>(
    functions,
    'verifySignUpOTP',
  );
  const result = await fn({ code });
  return result.data;
}
