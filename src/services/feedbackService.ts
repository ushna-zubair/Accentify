/**
 * feedbackService.ts
 *
 * Firestore CRUD operations for the Feedback & Reports system.
 * Collections:
 *   - feedback/{id}           — individual feedback items
 *   - feedback_activity/{id}  — admin action log for feedback
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackCategory,
  FeedbackStats,
} from '../models';

const FEEDBACK_COL = 'feedback';
const ACTIVITY_COL = 'feedback_activity';

// ─── Helpers ───
const tsToISO = (ts: any): string => {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date(ts).toISOString();
};

const mapDoc = (docSnap: any): FeedbackItem => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    userId: d.userId ?? '',
    userFullName: d.userFullName ?? 'Unknown User',
    userEmail: d.userEmail ?? '',
    category: d.category ?? 'other',
    priority: d.priority ?? 'medium',
    status: d.status ?? 'open',
    subject: d.subject ?? '',
    description: d.description ?? '',
    attachmentUrls: d.attachmentUrls ?? [],
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
    assignedTo: d.assignedTo ?? null,
    assignedToName: d.assignedToName ?? null,
    adminNotes: d.adminNotes ?? '',
    responseMessage: d.responseMessage ?? '',
    respondedAt: tsToISO(d.respondedAt),
    respondedBy: d.respondedBy ?? null,
    respondedByName: d.respondedByName ?? null,
    tags: d.tags ?? [],
    deviceInfo: d.deviceInfo ?? '',
    appVersion: d.appVersion ?? '',
  };
};

// ─── Fetch all feedback items ───
export const fetchFeedbackItems = async (maxItems = 200): Promise<FeedbackItem[]> => {
  const q = query(collection(db, FEEDBACK_COL), orderBy('createdAt', 'desc'), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
};

// ─── Update feedback status ───
export const updateFeedbackStatus = async (
  feedbackId: string,
  newStatus: FeedbackStatus,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'status_change',
    details: `Changed status to ${newStatus}`,
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Update feedback priority ───
export const updateFeedbackPriority = async (
  feedbackId: string,
  newPriority: FeedbackPriority,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    priority: newPriority,
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'priority_change',
    details: `Changed priority to ${newPriority}`,
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Assign feedback to admin ───
export const assignFeedback = async (
  feedbackId: string,
  assigneeUid: string,
  assigneeName: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    assignedTo: assigneeUid,
    assignedToName: assigneeName,
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'assigned',
    details: `Assigned to ${assigneeName}`,
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Add admin notes ───
export const updateAdminNotes = async (
  feedbackId: string,
  notes: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    adminNotes: notes,
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'notes_update',
    details: 'Updated admin notes',
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Send response to user ───
export const respondToFeedback = async (
  feedbackId: string,
  message: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    responseMessage: message,
    respondedAt: serverTimestamp(),
    respondedBy: adminUid,
    respondedByName: adminName,
    status: 'in_progress',
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'responded',
    details: 'Sent response to user',
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Delete / Archive feedback ───
export const archiveFeedback = async (
  feedbackId: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.update(doc(db, FEEDBACK_COL, feedbackId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'archived',
    details: 'Archived feedback',
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

export const deleteFeedback = async (
  feedbackId: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  const batch = writeBatch(db);
  batch.delete(doc(db, FEEDBACK_COL, feedbackId));
  const logRef = doc(collection(db, ACTIVITY_COL));
  batch.set(logRef, {
    feedbackId, adminUid, adminName,
    action: 'deleted',
    details: 'Deleted feedback item',
    timestamp: serverTimestamp(),
  });
  await batch.commit();
};

// ─── Compute stats from items ───
export const computeFeedbackStats = (items: FeedbackItem[]): FeedbackStats => {
  const total = items.length;
  const open = items.filter((i) => i.status === 'open').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const resolved = items.filter((i) => i.status === 'resolved').length;
  const closed = items.filter((i) => i.status === 'closed').length;
  const critical = items.filter((i) => i.priority === 'critical').length;

  // Avg resolution time for resolved/closed items
  const resolvedItems = items.filter((i) => i.status === 'resolved' || i.status === 'closed');
  let avgResolutionHours = 0;
  if (resolvedItems.length > 0) {
    const totalHours = resolvedItems.reduce((sum, item) => {
      const created = new Date(item.createdAt).getTime();
      const updated = new Date(item.updatedAt).getTime();
      return sum + (updated - created) / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round(totalHours / resolvedItems.length);
  }

  // Satisfaction = resolved / (total - open)
  const acted = total - open;
  const satisfactionRate = acted > 0 ? Math.round((resolved / acted) * 100) : 0;

  return { total, open, inProgress, resolved, closed, critical, avgResolutionHours, satisfactionRate };
};

// ─── Activity log ───
const logFeedbackActivity = async (
  feedbackId: string,
  adminUid: string,
  adminName: string,
  action: string,
  details: string,
): Promise<void> => {
  await addDoc(collection(db, ACTIVITY_COL), {
    feedbackId,
    adminUid,
    adminName,
    action,
    details,
    timestamp: serverTimestamp(),
  });
};

export const fetchFeedbackActivity = async (feedbackId: string) => {
  const q = query(
    collection(db, ACTIVITY_COL),
    where('feedbackId', '==', feedbackId),
    orderBy('timestamp', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      feedbackId: data.feedbackId,
      adminUid: data.adminUid,
      adminName: data.adminName,
      action: data.action,
      details: data.details,
      timestamp: tsToISO(data.timestamp),
    };
  });
};
