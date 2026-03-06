/**
 * supportService.ts
 *
 * Firestore CRUD & queries for support tickets and system logs.
 *
 * Collections:
 *   support_tickets  → SupportTicket documents
 *   system_logs      → SystemLog documents (also reads admin_activity_logs)
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
  SupportTicket,
  SupportTicketFormData,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportStats,
  SystemLog,
  SystemLogLevel,
  SystemLogSource,
  AdminActivityLog,
} from '../models';

const TICKETS_COL = 'support_tickets';
const SYSTEM_LOGS_COL = 'system_logs';
const ACTIVITY_LOGS_COL = 'admin_activity_logs';

// ─── Helpers ───

const tsToISO = (ts: any): string => {
  if (!ts) return '';
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return String(ts);
};

const mapTicketDoc = (d: any): SupportTicket => {
  const data = d.data();
  return {
    id: d.id,
    subject: data.subject ?? '',
    description: data.description ?? '',
    userId: data.userId ?? '',
    userEmail: data.userEmail ?? '',
    userName: data.userName ?? '',
    category: data.category ?? 'other',
    priority: data.priority ?? 'medium',
    status: data.status ?? 'open',
    assignedTo: data.assignedTo ?? '',
    assignedToName: data.assignedToName ?? '',
    adminNotes: data.adminNotes ?? '',
    response: data.response ?? '',
    tags: data.tags ?? [],
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
    resolvedAt: tsToISO(data.resolvedAt),
  };
};

const mapLogDoc = (d: any): SystemLog => {
  const data = d.data();
  return {
    id: d.id,
    level: data.level ?? 'info',
    source: data.source ?? 'system',
    message: data.message ?? '',
    details: data.details ?? '',
    userId: data.userId ?? '',
    adminUid: data.adminUid ?? '',
    adminName: data.adminName ?? '',
    timestamp: tsToISO(data.timestamp),
    metadata: data.metadata ?? {},
  };
};

// ═══════════════════════════════════════════════
//  SUPPORT TICKETS
// ═══════════════════════════════════════════════

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const ref = collection(db, TICKETS_COL);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapTicketDoc);
}

export async function fetchTicketsByStatus(
  status: SupportTicketStatus,
): Promise<SupportTicket[]> {
  const ref = collection(db, TICKETS_COL);
  const q = query(ref, where('status', '==', status), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapTicketDoc);
}

export async function fetchTicketById(id: string): Promise<SupportTicket | null> {
  const ref = doc(db, TICKETS_COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapTicketDoc(snap);
}

export async function createSupportTicket(
  form: SupportTicketFormData,
  userId: string,
  userEmail: string,
  userName: string,
): Promise<string> {
  const ref = collection(db, TICKETS_COL);
  const now = serverTimestamp();
  const docRef = await addDoc(ref, {
    ...form,
    userId,
    userEmail,
    userName,
    assignedTo: '',
    assignedToName: '',
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  });
  return docRef.id;
}

export async function updateSupportTicket(
  ticketId: string,
  updates: Partial<SupportTicketFormData>,
): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: SupportTicketStatus,
): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  const updates: Record<string, any> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (newStatus === 'resolved' || newStatus === 'closed') {
    updates.resolvedAt = serverTimestamp();
  }
  await updateDoc(ref, updates);
}

export async function updateTicketPriority(
  ticketId: string,
  newPriority: SupportTicketPriority,
): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  await updateDoc(ref, {
    priority: newPriority,
    updatedAt: serverTimestamp(),
  });
}

export async function assignTicket(
  ticketId: string,
  adminUid: string,
  adminName: string,
): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  await updateDoc(ref, {
    assignedTo: adminUid,
    assignedToName: adminName,
    status: 'in_progress',
    updatedAt: serverTimestamp(),
  });
}

export async function respondToTicket(
  ticketId: string,
  response: string,
): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  await updateDoc(ref, {
    response,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const ref = doc(db, TICKETS_COL, ticketId);
  await deleteDoc(ref);
}

// ─── Stats ───

export function computeSupportStats(tickets: SupportTicket[]): SupportStats {
  const open = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;
  const closed = tickets.filter((t) => t.status === 'closed').length;
  const critical = tickets.filter((t) => t.priority === 'critical').length;

  // Avg response time for resolved / closed tickets
  let totalHours = 0;
  let counted = 0;
  tickets.forEach((t) => {
    if (t.resolvedAt && t.createdAt) {
      const ms = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
      if (ms > 0) {
        totalHours += ms / 3_600_000;
        counted++;
      }
    }
  });

  return {
    total: tickets.length,
    open,
    inProgress,
    resolved,
    closed,
    critical,
    avgResponseHours: counted > 0 ? Math.round((totalHours / counted) * 10) / 10 : 0,
  };
}

// ═══════════════════════════════════════════════
//  SYSTEM LOGS
// ═══════════════════════════════════════════════

export async function fetchSystemLogs(
  limitCount: number = 100,
): Promise<SystemLog[]> {
  const ref = collection(db, SYSTEM_LOGS_COL);
  const q = query(ref, orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(mapLogDoc);
}

export async function fetchSystemLogsByLevel(
  level: SystemLogLevel,
  limitCount: number = 100,
): Promise<SystemLog[]> {
  const ref = collection(db, SYSTEM_LOGS_COL);
  const q = query(ref, where('level', '==', level), orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(mapLogDoc);
}

export async function fetchSystemLogsBySource(
  source: SystemLogSource,
  limitCount: number = 100,
): Promise<SystemLog[]> {
  const ref = collection(db, SYSTEM_LOGS_COL);
  const q = query(ref, where('source', '==', source), orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(mapLogDoc);
}

export async function createSystemLog(
  level: SystemLogLevel,
  source: SystemLogSource,
  message: string,
  details: string = '',
  adminUid: string = '',
  adminName: string = '',
  metadata: Record<string, any> = {},
): Promise<void> {
  const ref = collection(db, SYSTEM_LOGS_COL);
  await addDoc(ref, {
    level,
    source,
    message,
    details,
    userId: '',
    adminUid,
    adminName,
    metadata,
    timestamp: serverTimestamp(),
  });
}

export async function deleteSystemLog(logId: string): Promise<void> {
  const ref = doc(db, SYSTEM_LOGS_COL, logId);
  await deleteDoc(ref);
}

// ─── Fetch admin activity logs (from access-control collection) ───

export async function fetchAdminActivityLogs(
  limitCount: number = 100,
): Promise<AdminActivityLog[]> {
  const ref = collection(db, ACTIVITY_LOGS_COL);
  const q = query(ref, orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      adminUid: data.adminUid ?? '',
      adminName: data.adminName ?? 'Unknown',
      action: data.action ?? '',
      target: data.target ?? '',
      timestamp: tsToISO(data.timestamp),
      details: data.details ?? '',
    };
  });
}

// ─── Combined logs (system + activity) for unified view ───

export interface UnifiedLogEntry {
  id: string;
  type: 'system' | 'activity';
  level: SystemLogLevel;
  source: string;
  message: string;
  details: string;
  actor: string;
  timestamp: string;
}

export async function fetchUnifiedLogs(limitCount: number = 200): Promise<UnifiedLogEntry[]> {
  const [sysLogs, actLogs] = await Promise.all([
    fetchSystemLogs(limitCount),
    fetchAdminActivityLogs(limitCount),
  ]);

  const sysEntries: UnifiedLogEntry[] = sysLogs.map((l) => ({
    id: l.id,
    type: 'system' as const,
    level: l.level,
    source: l.source,
    message: l.message,
    details: l.details,
    actor: l.adminName || l.adminUid || '—',
    timestamp: l.timestamp,
  }));

  const actEntries: UnifiedLogEntry[] = actLogs.map((l) => ({
    id: l.id,
    type: 'activity' as const,
    level: 'info' as const,
    source: 'admin',
    message: `${l.action} → ${l.target}`,
    details: l.details,
    actor: l.adminName || l.adminUid || '—',
    timestamp: l.timestamp,
  }));

  return [...sysEntries, ...actEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
