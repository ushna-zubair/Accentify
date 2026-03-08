import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const db = admin.firestore();

/**
 * Server-side notification fan-out.
 *
 * Accepts a notification payload and writes it to the `notifications`
 * subcollection of every non-admin user in parallel batches (500 per
 * Firestore batch). This replaces client-side loops that would be both
 * slow and unreliable for large user sets.
 *
 * Only callable by admins.
 */
export const sendNotificationFanout = onCall(
  { region: REGION, timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    // Verify caller is admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can send notifications.');
    }

    const { title, body, type } = request.data as {
      title?: string;
      body?: string;
      type?: string;
    };

    if (!title || !body) {
      throw new HttpsError('invalid-argument', 'title and body are required.');
    }

    // Fetch all non-admin users
    const usersSnap = await db
      .collection('users')
      .where('role', '!=', 'admin')
      .select() // only need doc IDs, not full data
      .get();

    if (usersSnap.empty) {
      return { success: true, sent: 0 };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const notificationPayload = {
      title,
      body,
      type: type ?? 'announcement',
      read: false,
      createdAt: now,
    };

    // Firestore batches support up to 500 writes each
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let opCount = 0;
    let totalSent = 0;

    for (const userDoc of usersSnap.docs) {
      const notifRef = db
        .collection('users')
        .doc(userDoc.id)
        .collection('notifications')
        .doc(); // auto-generated ID

      batch.set(notifRef, notificationPayload);
      opCount++;
      totalSent++;

      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    // Commit remaining writes
    if (opCount > 0) {
      await batch.commit();
    }

    return { success: true, sent: totalSent };
  },
);
