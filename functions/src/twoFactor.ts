/**
 * TOTP-based Two-Factor Authentication.
 *
 * Flow:
 *   1. enrollTotp           → generates secret, stores it encrypted as "pending",
 *                             returns the secret + otpauth URL for QR rendering.
 *   2. confirmTotpEnrollment(code) → verifies the first code; on success marks the
 *                             secret "confirmed" and flips `security.twoFactor.enabled`.
 *   3. verifyTotpCode(code)  → used during login challenges.
 *   4. disableTotp(code)     → requires a current code to disable + erase the secret.
 *
 * Secrets are encrypted at rest with AES-256-GCM using a key from Cloud Functions
 * Secret Manager (TOTP_ENCRYPTION_KEY). The Firestore document NEVER contains the
 * plaintext secret. Only Cloud Functions can decrypt — security rules deny clients
 * from reading the encrypted blob.
 */
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';

const TOTP_ENCRYPTION_KEY = defineSecret('TOTP_ENCRYPTION_KEY');

const db = admin.firestore();
const REGION = 'us-central1';

// otplib defaults: 6-digit codes, 30-second window, ±1 step tolerance
authenticator.options = { window: 1, digits: 6, step: 30 };

// ─── Encryption helpers (AES-256-GCM) ───────────────────────────────────────

interface EncryptedBlob {
  iv: string;    // hex
  tag: string;   // hex
  data: string;  // hex (ciphertext)
}

function loadKey(): Buffer {
  const hex = TOTP_ENCRYPTION_KEY.value();
  if (!hex || hex.length !== 64) {
    throw new HttpsError(
      'failed-precondition',
      'TOTP_ENCRYPTION_KEY is missing or not a 32-byte hex string. ' +
      'Set it with: firebase functions:secrets:set TOTP_ENCRYPTION_KEY',
    );
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext: string): EncryptedBlob {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: ct.toString('hex'),
  };
}

function decrypt(blob: EncryptedBlob): string {
  const key = loadKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(blob.iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(blob.tag, 'hex'));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'hex')),
    decipher.final(),
  ]);
  return pt.toString('utf8');
}

// ─── Firestore paths ────────────────────────────────────────────────────────

const totpDocRef = (uid: string) =>
  db.collection('users').doc(uid).collection('security').doc('totp');

interface TotpDoc {
  status: 'pending' | 'confirmed';
  secret: EncryptedBlob;
  createdAt: FirebaseFirestore.Timestamp;
  confirmedAt?: FirebaseFirestore.Timestamp;
}

// ─── Rate-limiting helper ──────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Atomically check the per-user rate limit and reserve one attempt slot.
 *
 * Previously this was a two-step (`checkRateLimit` then `recordFailedAttempt`)
 * sequence that was vulnerable to a TOCTOU race: 100 concurrent requests could
 * all pass the read-only check before any of them incremented the counter,
 * effectively bypassing the limit and exposing TOTP to brute-force attacks.
 *
 * Now we increment INSIDE a Firestore transaction before the caller runs the
 * crypto check. Concurrent requests serialize through the transaction, and the
 * counter is incremented for every attempt (successful attempts are zeroed by
 * `clearAttempts` after the crypto check passes, so legitimate users aren't
 * penalised).
 */
async function checkRateLimit(uid: string, action: string): Promise<void> {
  const ref = db.collection('users').doc(uid).collection('security').doc(`rl_${action}`);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { attempts?: number; firstAt?: number } | undefined;

    // Window expired (or no record yet) — start a fresh attempt window.
    if (!data?.firstAt || now - data.firstAt > ATTEMPT_WINDOW_MS) {
      tx.set(ref, { attempts: 1, firstAt: now });
      return;
    }

    const current = data.attempts ?? 0;
    if (current >= MAX_FAILED_ATTEMPTS) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many failed attempts. Please wait 15 minutes and try again.',
      );
    }
    tx.set(ref, { attempts: current + 1, firstAt: data.firstAt });
  });
}

async function clearAttempts(uid: string, action: string): Promise<void> {
  const ref = db.collection('users').doc(uid).collection('security').doc(`rl_${action}`);
  await ref.delete().catch(() => {});
}

// ─── 1. enrollTotp ─────────────────────────────────────────────────────────
// Generates a fresh secret and returns it + the otpauth URL. The secret is
// stored encrypted as "pending" — it doesn't take effect until confirmTotpEnrollment.

export const enrollTotp = onCall(
  { region: REGION, secrets: [TOTP_ENCRYPTION_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const uid = request.auth.uid;

    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User document missing.');
    }
    const email = userSnap.data()?.email ?? request.auth.token.email ?? 'user';

    // If a secret is already confirmed, do not silently overwrite — caller must
    // disable first.
    const existing = (await totpDocRef(uid).get()).data() as TotpDoc | undefined;
    if (existing?.status === 'confirmed') {
      throw new HttpsError(
        'failed-precondition',
        '2FA is already enabled. Disable it before re-enrolling.',
      );
    }

    const secret = authenticator.generateSecret(); // base32, 32 chars
    const otpauthUrl = authenticator.keyuri(email, 'Accentify', secret);

    await totpDocRef(uid).set({
      status: 'pending',
      secret: encrypt(secret),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { secret, otpauthUrl };
  },
);

// ─── 2. confirmTotpEnrollment ──────────────────────────────────────────────

export const confirmTotpEnrollment = onCall(
  { region: REGION, secrets: [TOTP_ENCRYPTION_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const uid = request.auth.uid;

    const { code } = request.data as { code?: string };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Code must be 6 digits.');
    }

    await checkRateLimit(uid, 'totp_confirm');

    const snap = await totpDocRef(uid).get();
    const doc = snap.data() as TotpDoc | undefined;
    if (!doc || doc.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        'No pending TOTP enrollment. Call enrollTotp first.',
      );
    }

    const secret = decrypt(doc.secret);
    const valid = authenticator.check(code, secret);
    if (!valid) {
      // checkRateLimit already incremented the attempt counter atomically.
      throw new HttpsError('invalid-argument', 'Invalid code. Please try again.');
    }

    await clearAttempts(uid, 'totp_confirm');

    // Mark confirmed + flip the user-level flag (read by login flow)
    await totpDocRef(uid).update({
      status: 'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('users').doc(uid).set(
      {
        security: {
          twoFactorEnabled: true,
          twoFactorMethod: 'totp',
        },
        twoFactor: { enabled: true, method: 'totp', updatedAt: new Date().toISOString() },
      },
      { merge: true },
    );

    return { enabled: true };
  },
);

// ─── 3. verifyTotpCode (login challenge) ───────────────────────────────────

export const verifyTotpCode = onCall(
  { region: REGION, secrets: [TOTP_ENCRYPTION_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const uid = request.auth.uid;

    const { code } = request.data as { code?: string };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Code must be 6 digits.');
    }

    await checkRateLimit(uid, 'totp_verify');

    const snap = await totpDocRef(uid).get();
    const doc = snap.data() as TotpDoc | undefined;
    if (!doc || doc.status !== 'confirmed') {
      throw new HttpsError('failed-precondition', '2FA is not enabled for this account.');
    }

    const secret = decrypt(doc.secret);
    const valid = authenticator.check(code, secret);
    if (!valid) {
      // checkRateLimit already incremented the attempt counter atomically.
      throw new HttpsError('invalid-argument', 'Invalid code.');
    }

    await clearAttempts(uid, 'totp_verify');
    return { verified: true };
  },
);

// ─── 4. disableTotp (requires a current code) ──────────────────────────────

export const disableTotp = onCall(
  { region: REGION, secrets: [TOTP_ENCRYPTION_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const uid = request.auth.uid;

    const { code } = request.data as { code?: string };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Code must be 6 digits.');
    }

    await checkRateLimit(uid, 'totp_disable');

    const snap = await totpDocRef(uid).get();
    const doc = snap.data() as TotpDoc | undefined;
    if (!doc || doc.status !== 'confirmed') {
      throw new HttpsError('failed-precondition', '2FA is not enabled.');
    }

    const secret = decrypt(doc.secret);
    const valid = authenticator.check(code, secret);
    if (!valid) {
      // checkRateLimit already incremented the attempt counter atomically.
      throw new HttpsError('invalid-argument', 'Invalid code.');
    }

    await clearAttempts(uid, 'totp_disable');

    await totpDocRef(uid).delete();
    await db.collection('users').doc(uid).set(
      {
        security: { twoFactorEnabled: false, twoFactorMethod: 'none' },
        twoFactor: { enabled: false, method: 'none', updatedAt: new Date().toISOString() },
      },
      { merge: true },
    );

    return { enabled: false };
  },
);
