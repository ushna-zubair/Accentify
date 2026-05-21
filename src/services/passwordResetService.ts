/**
 * Frontend service for the OTP-based password-reset flow.
 *
 * Calls four Cloud Functions:
 *   1. lookupUser  – returns masked email / phone for display
 *   2. sendOTP     – delivers 4-digit code via email or SMS
 *   3. verifyOTP   – validates the code, returns a sessionToken
 *   4. resetPassword – sets the new password using the sessionToken
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

// ─── Types ───

export interface LookupUserResult {
  uid: string;
  maskedEmail: string;
  maskedPhone: string | null;
  hasPhone: boolean;
}

export interface SendOTPResult {
  success: boolean;
}

export interface VerifyOTPResult {
  success: boolean;
  sessionToken: string;
}

export interface ResetPasswordResult {
  success: boolean;
}

// ─── Callable wrappers ───

/**
 * Given an email address, look up the account and return masked contact info.
 */
export async function lookupUser(email: string): Promise<LookupUserResult> {
  const fn = httpsCallable<{ email: string }, LookupUserResult>(functions, 'lookupUser');
  const result = await fn({ email });
  return result.data;
}

/**
 * Send a 4-digit OTP to the user via the chosen method.
 */
export async function sendOTP(uid: string, method: 'email' | 'sms'): Promise<SendOTPResult> {
  const fn = httpsCallable<{ uid: string; method: string }, SendOTPResult>(functions, 'sendOTP');
  const result = await fn({ uid, method });
  return result.data;
}

/**
 * Verify the user-entered OTP code.
 * Returns a short-lived sessionToken on success.
 */
export async function verifyOTP(uid: string, code: string): Promise<VerifyOTPResult> {
  const fn = httpsCallable<{ uid: string; code: string }, VerifyOTPResult>(functions, 'verifyOTP');
  const result = await fn({ uid, code });
  return result.data;
}

/**
 * Reset the user's password using the verified sessionToken.
 */
export async function resetPassword(
  uid: string,
  sessionToken: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const fn = httpsCallable<
    { uid: string; sessionToken: string; newPassword: string },
    ResetPasswordResult
  >(functions, 'resetPassword');
  const result = await fn({ uid, sessionToken, newPassword });
  return result.data;
}
