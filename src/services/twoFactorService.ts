/**
 * twoFactorService.ts
 *
 * Frontend service for the 2FA settings flow (email-based OTP).
 *
 * Calls two Cloud Functions:
 *   1. send2FACode   – sends a 4-digit code to the user's email
 *   2. verify2FACode – validates the code and toggles 2FA on/off
 *
 * Also provides local helpers to read 2FA status from Firestore.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import app, { db } from '../config/firebase';

const functions = getFunctions(app);

// ─── Types ───

export type TwoFactorMethod = 'email' | 'authenticator' | 'none';

export interface TwoFactorStatus {
  enabled: boolean;
  method: TwoFactorMethod;
}

export interface Send2FACodeResult {
  success: boolean;
  maskedEmail: string;
}

export interface Verify2FACodeResult {
  success: boolean;
  enabled: boolean;
}

// ─── Read current 2FA status ───

export async function get2FAStatus(uid: string): Promise<TwoFactorStatus> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { enabled: false, method: 'none' };

  const data = snap.data();
  return {
    enabled: data.security?.twoFactorEnabled ?? false,
    method: data.security?.twoFactorMethod ?? 'none',
  };
}

// ─── Send verification code ───

export async function send2FACode(
  action: 'enable' | 'disable',
): Promise<Send2FACodeResult> {
  const fn = httpsCallable<{ action: string }, Send2FACodeResult>(
    functions,
    'send2FACode',
  );
  const result = await fn({ action });
  return result.data;
}

// ─── Verify code & toggle 2FA ───

export async function verify2FACode(
  code: string,
  action: 'enable' | 'disable',
): Promise<Verify2FACodeResult> {
  const fn = httpsCallable<
    { code: string; action: string },
    Verify2FACodeResult
  >(functions, 'verify2FACode');
  const result = await fn({ code, action });
  return result.data;
}

// ─── Local toggle (optimistic) ───

export async function setLocal2FAStatus(
  uid: string,
  enabled: boolean,
  method: TwoFactorMethod = 'email',
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    'security.twoFactorEnabled': enabled,
    'security.twoFactorMethod': enabled ? method : 'none',
  });
}
