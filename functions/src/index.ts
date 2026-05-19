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

    const { uids } = request.data as { uids: string[] };
    if (!Array.isArray(uids) || uids.length === 0) {
      throw new HttpsError('invalid-argument', 'Provide a non-empty array of uids.');
    }
    if (uids.length > 50) {
      throw new HttpsError('invalid-argument', 'Cannot delete more than 50 users at once.');
    }

    const results: { uid: string; success: boolean; error?: string }[] = [];

    for (const uid of uids) {
      try {
        // Disable the Firebase Auth account (keeps it for audit, prevents login)
        await admin.auth().updateUser(uid, { disabled: true });

        // Soft-delete: mark the Firestore document instead of permanently deleting
        await db.collection('users').doc(uid).update({
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          deletedBy: request.auth.uid,
        });

        results.push({ uid, success: true });
      } catch (err: any) {
        results.push({ uid, success: false, error: err.message ?? 'Unknown error' });
      }
    }

    return { results };
  },
);
