/**
 * useAccessControlController.ts
 *
 * Controller for the Admin Access Control screen.
 * Manages admin members, roles, permissions, invitations, and activity logs.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  AdminMember,
  AdminRole,
  AdminPermissions,
  AdminActivityLog,
  InviteAdminPayload,
} from '../models';
import { DEFAULT_ROLE_PERMISSIONS, ADMIN_ROLE_LABELS } from '../models';
import {
  fetchAdminMembers,
  updateAdminRole,
  updateAdminPermissions,
  updateAdminStatus,
  inviteAdmin,
  removeAdmin,
  fetchActivityLogs,
  fetchPendingInvitations,
  revokeInvitation,
} from '../services/accessControlService';

export type AccessControlTab = 'members' | 'roles' | 'activity';

export interface PendingInvite {
  id: string;
  email: string;
  fullName: string;
  adminRole: AdminRole;
  createdAt: string;
}

export const useAccessControlController = () => {
  const { currentUser, userProfile } = useAuth();

  // ── State ──
  const [activeTab, setActiveTab] = useState<AccessControlTab>('members');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editMemberModalVisible, setEditMemberModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('admin');

  // Get current admin info
  const currentAdminUid = currentUser?.uid ?? '';
  const currentAdminName =
    userProfile?.profile?.fullName ??
    userProfile?.fullName ??
    currentUser?.displayName ??
    'Admin';

  // ── Fetch All Data ──
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [membersData, logsData, invitesData] = await Promise.all([
        fetchAdminMembers(),
        fetchActivityLogs(50),
        fetchPendingInvitations(),
      ]);

      setMembers(membersData);
      setActivityLogs(logsData);
      setPendingInvites(invitesData);
    } catch (e: unknown) {
      console.error('[AccessControl] fetchAll error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load access control data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchAll();
    return () => { ignore = true; };
  }, [fetchAll]);

  // ── Filtered members ──
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      ADMIN_ROLE_LABELS[m.adminRole]?.toLowerCase().includes(q)
    );
  });

  // ── Change Role ──
  const handleChangeRole = useCallback(
    async (targetUid: string, newRole: AdminRole) => {
      try {
        setSubmitting(true);
        await updateAdminRole(targetUid, newRole, currentAdminUid, currentAdminName);
        setMembers((prev) =>
          prev.map((m) =>
            m.uid === targetUid
              ? { ...m, adminRole: newRole, permissions: DEFAULT_ROLE_PERMISSIONS[newRole] }
              : m,
          ),
        );
        // Refresh logs
        const logs = await fetchActivityLogs(50);
        setActivityLogs(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update role');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName],
  );

  // ── Update Permissions ──
  const handleUpdatePermissions = useCallback(
    async (targetUid: string, permissions: AdminPermissions) => {
      try {
        setSubmitting(true);
        await updateAdminPermissions(targetUid, permissions, currentAdminUid, currentAdminName);
        setMembers((prev) =>
          prev.map((m) => (m.uid === targetUid ? { ...m, permissions } : m)),
        );
        const logs = await fetchActivityLogs(50);
        setActivityLogs(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update permissions');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName],
  );

  // ── Suspend / Reactivate ──
  const handleToggleStatus = useCallback(
    async (targetUid: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      try {
        setSubmitting(true);
        await updateAdminStatus(targetUid, newStatus as any, currentAdminUid, currentAdminName);
        setMembers((prev) =>
          prev.map((m) => (m.uid === targetUid ? { ...m, status: newStatus as any } : m)),
        );
        const logs = await fetchActivityLogs(50);
        setActivityLogs(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update status');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName],
  );

  // ── Remove Admin ──
  const handleRemoveAdmin = useCallback(
    async (targetUid: string) => {
      try {
        setSubmitting(true);
        await removeAdmin(targetUid, currentAdminUid, currentAdminName);
        setMembers((prev) => prev.filter((m) => m.uid !== targetUid));
        const logs = await fetchActivityLogs(50);
        setActivityLogs(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to remove admin');
      } finally {
        setSubmitting(false);
        setEditMemberModalVisible(false);
        setSelectedMember(null);
      }
    },
    [currentAdminUid, currentAdminName],
  );

  // ── Invite Admin ──
  const handleInviteAdmin = useCallback(async () => {
    if (!inviteEmail.trim() || !inviteFullName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: InviteAdminPayload = {
        email: inviteEmail.trim(),
        fullName: inviteFullName.trim(),
        adminRole: inviteRole,
        permissions: DEFAULT_ROLE_PERMISSIONS[inviteRole],
      };

      await inviteAdmin(payload, currentAdminUid, currentAdminName);

      // Refresh data
      await fetchAll();

      // Reset form
      setInviteEmail('');
      setInviteFullName('');
      setInviteRole('admin');
      setInviteModalVisible(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invite admin');
    } finally {
      setSubmitting(false);
    }
  }, [inviteEmail, inviteFullName, inviteRole, currentAdminUid, currentAdminName, fetchAll]);

  // ── Revoke Invitation ──
  const handleRevokeInvite = useCallback(
    async (invitationId: string) => {
      try {
        setSubmitting(true);
        await revokeInvitation(invitationId, currentAdminUid, currentAdminName);
        setPendingInvites((prev) => prev.filter((i) => i.id !== invitationId));
        const logs = await fetchActivityLogs(50);
        setActivityLogs(logs);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to revoke invitation');
      } finally {
        setSubmitting(false);
      }
    },
    [currentAdminUid, currentAdminName],
  );

  // ── Open Edit Modal ──
  const openEditMember = useCallback((member: AdminMember) => {
    setSelectedMember(member);
    setEditMemberModalVisible(true);
  }, []);

  const closeEditMember = useCallback(() => {
    setSelectedMember(null);
    setEditMemberModalVisible(false);
  }, []);

  return {
    // State
    activeTab,
    setActiveTab,
    members: filteredMembers,
    allMembers: members,
    activityLogs,
    pendingInvites,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    submitting,

    // Modals
    inviteModalVisible,
    setInviteModalVisible,
    editMemberModalVisible,
    selectedMember,
    openEditMember,
    closeEditMember,

    // Invite form
    inviteEmail,
    setInviteEmail,
    inviteFullName,
    setInviteFullName,
    inviteRole,
    setInviteRole,

    // Actions
    handleChangeRole,
    handleUpdatePermissions,
    handleToggleStatus,
    handleRemoveAdmin,
    handleInviteAdmin,
    handleRevokeInvite,
    refresh: fetchAll,

    // Current admin
    currentAdminUid,
  };
};
