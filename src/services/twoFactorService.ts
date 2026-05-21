/**
 * Frontend wrappers for the TOTP 2FA Cloud Functions.
 *
 * Flow:
 *   enrollTotp           → returns secret + otpauthUrl, store in component state
 *   confirmTotpEnrollment(code) → user enters first code from their authenticator app
 *   verifyTotpCode(code) → used during login challenge
 *   disableTotp(code)    → requires current code to disable
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import app, { auth, db } from '../config/firebase';

const functions = getFunctions(app);

export interface TwoFAStatus {
  enabled: boolean;
  method: 'totp' | 'none';
}

export interface EnrollResult {
  secret: string;       // base32 secret — show as text for manual entry
  otpauthUrl: string;   // otpauth://totp/... — render as QR code
}

/** Read whether 2FA is currently enabled for the signed-in user. */
export async function get2FAStatus(uid: string): Promise<TwoFAStatus> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const data = userDoc.data();
    const enabled = data?.twoFactor?.enabled === true || data?.security?.twoFactorEnabled === true;
    const method = (data?.twoFactor?.method ?? data?.security?.twoFactorMethod ?? 'none') as
      | 'totp'
      | 'none';
    return { enabled, method: enabled ? method : 'none' };
  } catch {
    return { enabled: false, method: 'none' };
  }
}

/** Step 1 of enrollment: get a secret + otpauth URL. */
export async function enrollTotp(): Promise<EnrollResult> {
  const fn = httpsCallable<void, EnrollResult>(functions, 'enrollTotp');
  const result = await fn();
  return result.data;
}

/** Step 2 of enrollment: confirm the first code. */
export async function confirmTotpEnrollment(code: string): Promise<{ enabled: boolean }> {
  const fn = httpsCallable<{ code: string }, { enabled: boolean }>(
    functions,
    'confirmTotpEnrollment',
  );
  const result = await fn({ code });
  return result.data;
}

/** Login challenge: verify a 6-digit code. */
export async function verifyTotpCode(code: string): Promise<{ verified: boolean }> {
  const fn = httpsCallable<{ code: string }, { verified: boolean }>(
    functions,
    'verifyTotpCode',
  );
  const result = await fn({ code });
  return result.data;
}

/** Disable 2FA — requires a current code to prove possession. */
export async function disableTotp(code: string): Promise<{ enabled: boolean }> {
  const fn = httpsCallable<{ code: string }, { enabled: boolean }>(
    functions,
    'disableTotp',
  );
  const result = await fn({ code });
  return result.data;
}

/**
 * Convenience helper used by AppNavigator to decide whether to route to the
 * TOTP challenge screen immediately after a password sign-in.
 */
export async function requiresTotpChallenge(uid: string): Promise<boolean> {
  const status = await get2FAStatus(uid);
  return status.enabled && status.method === 'totp';
}

// Keep auth import to avoid breaking modules that re-export from here
export { auth };
