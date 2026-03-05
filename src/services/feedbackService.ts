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
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
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
export const fetchFeedbackItems = async (): Promise<FeedbackItem[]> => {
  const q = query(collection(db, FEEDBACK_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
};

// ─── Fetch feedback by status ───
export const fetchFeedbackByStatus = async (status: FeedbackStatus): Promise<FeedbackItem[]> => {
  const q = query(
    collection(db, FEEDBACK_COL),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
};

// ─── Fetch single feedback ───
export const fetchFeedbackById = async (id: string): Promise<FeedbackItem | null> => {
  const snap = await getDoc(doc(db, FEEDBACK_COL, id));
  if (!snap.exists()) return null;
  return mapDoc(snap);
};

// ─── Update feedback status ───
export const updateFeedbackStatus = async (
  feedbackId: string,
  newStatus: FeedbackStatus,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'status_change', `Changed status to ${newStatus}`);
};

// ─── Update feedback priority ───
export const updateFeedbackPriority = async (
  feedbackId: string,
  newPriority: FeedbackPriority,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    priority: newPriority,
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'priority_change', `Changed priority to ${newPriority}`);
};

// ─── Assign feedback to admin ───
export const assignFeedback = async (
  feedbackId: string,
  assigneeUid: string,
  assigneeName: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    assignedTo: assigneeUid,
    assignedToName: assigneeName,
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'assigned', `Assigned to ${assigneeName}`);
};

// ─── Add admin notes ───
export const updateAdminNotes = async (
  feedbackId: string,
  notes: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    adminNotes: notes,
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'notes_update', 'Updated admin notes');
};

// ─── Send response to user ───
export const respondToFeedback = async (
  feedbackId: string,
  message: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    responseMessage: message,
    respondedAt: serverTimestamp(),
    respondedBy: adminUid,
    respondedByName: adminName,
    status: 'in_progress',
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'responded', 'Sent response to user');
};

// ─── Delete / Archive feedback ───
export const archiveFeedback = async (
  feedbackId: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await updateDoc(doc(db, FEEDBACK_COL, feedbackId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'archived', 'Archived feedback');
};

export const deleteFeedback = async (
  feedbackId: string,
  adminUid: string,
  adminName: string,
): Promise<void> => {
  await deleteDoc(doc(db, FEEDBACK_COL, feedbackId));
  await logFeedbackActivity(feedbackId, adminUid, adminName, 'deleted', 'Deleted feedback item');
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
