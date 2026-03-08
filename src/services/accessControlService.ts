/**
 * accessControlService.ts
 *
 * Firestore CRUD for admin access control.
 *
 * ── Firestore Layout ──
 * users/{uid}          → role, adminRole, adminPermissions, status, profile…
 * admin_activity_logs  → { adminUid, adminName, action, target, timestamp, details }
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type {
  AdminMember,
  AdminRole,
  AdminPermissions,
  AdminActivityLog,
  InviteAdminPayload,
} from '../models';
import { DEFAULT_ROLE_PERMISSIONS } from '../models';

// ─── Fetch All Admins ───

export async function fetchAdminMembers(): Promise<AdminMember[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'admin'));
  const snap = await getDocs(q);

  const admins: AdminMember[] = [];

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const profile = d.profile ?? {};
    const security = d.security ?? {};

    admins.push({
      uid: docSnap.id,
      email: d.email ?? '',
      fullName: profile.fullName ?? d.fullName ?? 'Admin',
      avatarUrl: profile.profilePictureUrl ?? '',
      adminRole: d.adminRole ?? 'admin',
      permissions: d.adminPermissions ?? DEFAULT_ROLE_PERMISSIONS[d.adminRole as AdminRole ?? 'admin'],
      status: d.status ?? 'active',
      lastSeen: d.lastSeen?.toDate?.()?.toISOString() ?? d.lastLoginAt ?? null,
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      twoFactorEnabled: security.twoFactorEnabled ?? false,
      invitedBy: d.invitedBy ?? null,
    });
  }

  // Sort: super_admin first, then by name
  const rolePriority: Record<string, number> = { super_admin: 0, admin: 1, moderator: 2, viewer: 3 };
  admins.sort((a, b) => (rolePriority[a.adminRole] ?? 9) - (rolePriority[b.adminRole] ?? 9));

  return admins;
}

// ─── Update Admin Role ───

export async function updateAdminRole(
  targetUid: string,
  newRole: AdminRole,
  performerUid: string,
  performerName: string,
): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', targetUid);
  const newPermissions = DEFAULT_ROLE_PERMISSIONS[newRole];

  batch.update(userRef, {
    adminRole: newRole,
    adminPermissions: newPermissions,
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'admin_activity_logs'));
  batch.set(logRef, {
    adminUid: performerUid,
    adminName: performerName,
    action: 'role_change',
    target: targetUid,
    details: `Changed role to ${newRole}`,
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── Update Admin Permissions ───

export async function updateAdminPermissions(
  targetUid: string,
  permissions: AdminPermissions,
  performerUid: string,
  performerName: string,
): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', targetUid);

  batch.update(userRef, {
    adminPermissions: permissions,
    updatedAt: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'admin_activity_logs'));
  batch.set(logRef, {
    adminUid: performerUid,
    adminName: performerName,
    action: 'permissions_update',
    target: targetUid,
    details: 'Updated custom permissions',
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── Suspend / Reactivate Admin ───

export async function updateAdminStatus(
  targetUid: string,
  newStatus: 'active' | 'suspended' | 'deactivated',
  performerUid: string,
  performerName: string,
): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', targetUid);

  batch.update(userRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  const action = newStatus === 'active' ? 'reactivate' : newStatus === 'suspended' ? 'suspend' : 'deactivate';
  const logRef = doc(collection(db, 'admin_activity_logs'));
  batch.set(logRef, {
    adminUid: performerUid,
    adminName: performerName,
    action,
    target: targetUid,
    details: `Account status changed to ${newStatus}`,
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// ─── Invite New Admin ───

export async function inviteAdmin(
  payload: InviteAdminPayload,
  performerUid: string,
  performerName: string,
): Promise<string> {
  // Check if user with this email already exists
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', payload.email.toLowerCase()));
  const existing = await getDocs(q);

  if (!existing.empty) {
    // User exists — promote them to admin
    const existingDoc = existing.docs[0];
    await updateDoc(doc(db, 'users', existingDoc.id), {
      role: 'admin',
      adminRole: payload.adminRole,
      adminPermissions: payload.permissions,
      invitedBy: performerUid,
      updatedAt: serverTimestamp(),
    });

    await logActivity(
      performerUid,
      performerName,
      'promote_to_admin',
      existingDoc.id,
      `Promoted existing user ${payload.email} to ${payload.adminRole}`,
    );

    return existingDoc.id;
  }

  // Create a pending admin invitation doc
  const inviteRef = await addDoc(collection(db, 'admin_invitations'), {
    email: payload.email.toLowerCase(),
    fullName: payload.fullName,
    adminRole: payload.adminRole,
    permissions: payload.permissions,
    invitedBy: performerUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  await logActivity(
    performerUid,
    performerName,
    'invite_admin',
    payload.email,
    `Invited ${payload.email} as ${payload.adminRole}`,
  );

  return inviteRef.id;
}

// ─── Remove Admin (demote to learner) ───

export async function removeAdmin(
  targetUid: string,
  performerUid: string,
  performerName: string,
): Promise<void> {
  const userRef = doc(db, 'users', targetUid);

  await updateDoc(userRef, {
    role: 'learner',
    adminRole: null,
    adminPermissions: null,
    updatedAt: serverTimestamp(),
  });

  await logActivity(
    performerUid,
    performerName,
    'remove_admin',
    targetUid,
    'Demoted to learner role',
  );
}

// ─── Fetch Activity Logs ───

export async function fetchActivityLogs(
  limitCount: number = 50,
): Promise<AdminActivityLog[]> {
  const logsRef = collection(db, 'admin_activity_logs');
  const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      adminUid: data.adminUid ?? '',
      adminName: data.adminName ?? 'Unknown',
      action: data.action ?? '',
      target: data.target ?? '',
      timestamp: data.timestamp?.toDate?.()?.toISOString() ?? '',
      details: data.details ?? '',
    };
  });
}

// ─── Log Activity ───

async function logActivity(
  adminUid: string,
  adminName: string,
  action: string,
  target: string,
  details: string,
): Promise<void> {
  try {
    await addDoc(collection(db, 'admin_activity_logs'), {
      adminUid,
      adminName,
      action,
      target,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[AccessControl] Failed to log activity:', e);
  }
}

// ─── Fetch Pending Invitations ───

export async function fetchPendingInvitations(): Promise<
  Array<{ id: string; email: string; fullName: string; adminRole: AdminRole; createdAt: string }>
> {
  const invRef = collection(db, 'admin_invitations');
  const q = query(invRef, where('status', '==', 'pending'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: data.email ?? '',
      fullName: data.fullName ?? '',
      adminRole: data.adminRole ?? 'admin',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Revoke Invitation ───

export async function revokeInvitation(
  invitationId: string,
  performerUid: string,
  performerName: string,
): Promise<void> {
  await deleteDoc(doc(db, 'admin_invitations', invitationId));

  await logActivity(
    performerUid,
    performerName,
    'revoke_invitation',
    invitationId,
    'Revoked pending admin invitation',
  );
}
