import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// Re-export pronunciation functions
export {
  getPronunciationSentences,
  // transcribeAndEvaluate, // Disabling temporarily to unblock deployment without GOOGLE_STT_API_KEY
  seedPronunciationSentences,
} from './pronunciation';

// Re-export admin analytics functions
export {
  scheduledAdminAggregation,
  runAdminAggregation,
} from './adminAnalytics';

// Re-export notification fan-out function
export { sendNotificationFanout } from './notifications';

// Re-export TOTP 2FA functions
export {
  enrollTotp,
  confirmTotpEnrollment,
  verifyTotpCode,
  disableTotp,
} from './twoFactor';

// Re-export audio conversion proxy (m4a/webm/3gp/mp3 → 16 kHz mono WAV).
// Needed because the HF backend's libsndfile decoder only handles WAV/FLAC/OGG.
export { convertAudioToWav } from './audioConvert';

// NOTE: initializeApp() is called in the root index.js — do NOT call it here.
const db = admin.firestore();

const REGION = 'us-central1';

// ─── Admin Delete User (soft-delete + disable Auth) ───

export const adminDeleteUser = onCall(
  { region: REGION, secrets: [] },
  async (request) => {
    // 1. Must be authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    // 2. Must be admin
    const callerSnap = await db.collection('users').doc(request.auth.uid).get();
    if (callerSnap.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required.');
    }

    // 3. Validate the input shape (audit #3 — defend against caller passing
    // non-string ids, an empty array, an oversized batch, or — crucially —
    // their own uid which would lock them out of the admin tools).
    const raw = (request.data as { uids?: unknown } | undefined)?.uids;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new HttpsError('invalid-argument', 'Provide a non-empty array of uids.');
    }
    if (!raw.every((u): u is string => typeof u === 'string' && u.length > 0)) {
      throw new HttpsError('invalid-argument', 'All uids must be non-empty strings.');
    }
    if (raw.length > 50) {
      throw new HttpsError('invalid-argument', 'Cannot delete more than 50 users at once.');
    }
    const callerUid = request.auth.uid;
    if (raw.includes(callerUid)) {
      throw new HttpsError(
        'invalid-argument',
        'You cannot delete your own admin account.',
      );
    }
    // De-duplicate so a repeated uid doesn't double-write or muddle the result.
    const uids: string[] = Array.from(new Set(raw));

    // Run the per-user work in parallel — 50 serial Auth/Firestore calls were
    // close to the function's 60s timeout on cold starts.
    const results = await Promise.all(
      uids.map(async (uid) => {
        try {
          // Disable the Firebase Auth account (keeps it for audit, prevents login)
          await admin.auth().updateUser(uid, { disabled: true });

          // Soft-delete: mark the Firestore document instead of permanently deleting
          await db.collection('users').doc(uid).update({
            status: 'deleted',
            deletedAt: new Date().toISOString(),
            deletedBy: callerUid,
          });

          return { uid, success: true as const };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return { uid, success: false as const, error: message };
        }
      }),
    );

    return { results };
  },
);
