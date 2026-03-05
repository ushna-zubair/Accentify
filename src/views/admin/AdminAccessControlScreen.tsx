/**
 * AdminAccessControlScreen.tsx
 *
 * Professional admin access control panel with:
 * - Member list with role badges, status, actions
 * - Invite new admin modal
 * - Edit member role/permissions modal
 * - Pending invitations management
 * - Activity log timeline
 * - Responsive layout (tablet + desktop)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAccessControlController } from '../../controllers/useAccessControlController';
import type {
  AdminMember,
  AdminRole,
  AdminPermissions,
  AdminActivityLog,
} from '../../models';
import {
  ADMIN_ROLE_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_LABELS,
} from '../../models';
import type { AccessControlTab, PendingInvite } from '../../controllers/useAccessControlController';

// ─── Constants ───
const ALL_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'viewer'];
const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof AdminPermissions)[];

// ─── Helper ───
const webConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    onConfirm();
  }
};

const formatTimeAgo = (isoDate: string | null): string => {
  if (!isoDate) return 'Never';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
};

const formatDate = (isoDate: string): string => {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Role Badge ───
const RoleBadge: React.FC<{ role: AdminRole; tc: ThemeColors }> = ({ role, tc }) => {
  const colorMap: Record<AdminRole, { bg: string; text: string }> = {
    super_admin: { bg: tc.error + '18', text: tc.error },
    admin: { bg: tc.accent + '18', text: tc.accent },
    moderator: { bg: tc.warning + '18', text: tc.warningDeep ?? tc.warning },
    viewer: { bg: tc.disabled + '30', text: tc.textLight },
  };
  const c = colorMap[role] ?? colorMap.viewer;
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 }}>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 11, color: c.text }}>
        {ADMIN_ROLE_LABELS[role]}
      </Text>
    </View>
  );
};

// ─── Status Dot ───
const StatusIndicator: React.FC<{ status: string; tc: ThemeColors }> = ({ status, tc }) => {
  const color = status === 'active' ? tc.success : status === 'suspended' ? tc.warning : tc.error;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textLight, textTransform: 'capitalize' as any }}>
        {status}
      </Text>
    </View>
  );
};

// ─── Avatar ───
const AdminAvatar: React.FC<{ name: string; size?: number; tc: ThemeColors }> = ({ name, size = 36, tc }) => {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tc.accent + '20',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.36, color: tc.accent }}>
        {initials}
      </Text>
    </View>
  );
};

// ─── Tab Button ───
const TabButton: React.FC<{
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  tc: ThemeColors;
}> = ({ label, icon, isActive, onPress, count, tc }) => (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: isActive ? tc.accent : 'transparent',
    }}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons name={icon as any} size={18} color={isActive ? tc.white : tc.textLight} />
    <Text
      style={{
        fontFamily: isActive ? fonts.semiBold : fonts.medium,
        fontSize: 14,
        color: isActive ? tc.white : tc.textLight,
      }}
    >
      {label}
    </Text>
    {count !== undefined && count > 0 && (
      <View
        style={{
          backgroundColor: isActive ? tc.white + '30' : tc.accent + '18',
          borderRadius: 10,
          paddingHorizontal: 7,
          paddingVertical: 1,
          marginLeft: 2,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 11,
            color: isActive ? tc.white : tc.accent,
          }}
        >
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// ─── Action Icon Button ───
const ActionButton: React.FC<{
  icon: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  tooltip?: string;
  disabled?: boolean;
}> = ({ icon, color, bgColor, onPress, disabled }) => (
  <TouchableOpacity
    style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: bgColor,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: disabled ? 0.4 : 1,
    }}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={disabled}
  >
    <Ionicons name={icon as any} size={16} color={color} />
  </TouchableOpacity>
);

// ─── Activity Log Icon ───
const getActionIcon = (action: string): { icon: string; color: string } => {
  const map: Record<string, { icon: string; color: string }> = {
    role_change: { icon: 'swap-horizontal', color: '#6366F1' },
    permissions_update: { icon: 'key', color: '#F59E0B' },
    suspend: { icon: 'pause-circle', color: '#EF4444' },
    reactivate: { icon: 'play-circle', color: '#22C55E' },
    deactivate: { icon: 'close-circle', color: '#DC2626' },
    promote_to_admin: { icon: 'arrow-up-circle', color: '#8B5CF6' },
    invite_admin: { icon: 'person-add', color: '#3B82F6' },
    remove_admin: { icon: 'person-remove', color: '#EF4444' },
    revoke_invitation: { icon: 'close', color: '#F97316' },
  };
  return map[action] ?? { icon: 'ellipse', color: '#6B7280' };
};

// ═══════════════════════════════════════════════
//  MEMBERS TAB
// ═══════════════════════════════════════════════
const MembersTab: React.FC<{
  members: AdminMember[];
  pendingInvites: PendingInvite[];
  currentAdminUid: string;
  onEdit: (m: AdminMember) => void;
  onToggleStatus: (uid: string, status: string) => void;
  onRevokeInvite: (id: string) => void;
  onInvite: () => void;
  submitting: boolean;
  tc: ThemeColors;
  isDark: boolean;
  width: number;
}> = ({
  members,
  pendingInvites,
  currentAdminUid,
  onEdit,
  onToggleStatus,
  onRevokeInvite,
  onInvite,
  submitting,
  tc,
  isDark,
  width,
}) => {
  const isWide = width >= 900;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Stats Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Admins', value: members.length, icon: 'people', color: tc.accent },
          { label: 'Active', value: members.filter((m) => m.status === 'active').length, icon: 'checkmark-circle', color: tc.success },
          { label: 'Suspended', value: members.filter((m) => m.status === 'suspended').length, icon: 'pause-circle', color: tc.warning },
          { label: 'Pending Invites', value: pendingInvites.length, icon: 'mail', color: '#8B5CF6' },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: isWide ? 1 : undefined,
              width: isWide ? undefined : '47%' as any,
              backgroundColor: tc.white,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: stat.color + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: tc.text }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
                {stat.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Members Table */}
      <View
        style={{
          backgroundColor: tc.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: tc.divider,
            backgroundColor: tc.surfaceAlt,
          }}
        >
          <Text style={{ flex: 2.5, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
            MEMBER
          </Text>
          {isWide && (
            <Text style={{ flex: 1.5, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
              ROLE
            </Text>
          )}
          <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
            STATUS
          </Text>
          {isWide && (
            <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
              LAST SEEN
            </Text>
          )}
          {isWide && (
            <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
              2FA
            </Text>
          )}
          <Text style={{ width: 120, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted, textAlign: 'right' }}>
            ACTIONS
          </Text>
        </View>

        {/* Table Rows */}
        {members.map((member) => {
          const isSelf = member.uid === currentAdminUid;
          return (
            <View
              key={member.uid}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: tc.divider,
              }}
            >
              {/* Name + Email */}
              <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AdminAvatar name={member.fullName} tc={tc} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}
                      numberOfLines={1}
                    >
                      {member.fullName}
                    </Text>
                    {isSelf && (
                      <View style={{ backgroundColor: tc.accent + '18', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: tc.accent }}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }} numberOfLines={1}>
                    {member.email}
                  </Text>
                  {!isWide && (
                    <View style={{ marginTop: 4 }}>
                      <RoleBadge role={member.adminRole} tc={tc} />
                    </View>
                  )}
                </View>
              </View>

              {/* Role */}
              {isWide && (
                <View style={{ flex: 1.5 }}>
                  <RoleBadge role={member.adminRole} tc={tc} />
                </View>
              )}

              {/* Status */}
              <View style={{ flex: 1 }}>
                <StatusIndicator status={member.status} tc={tc} />
              </View>

              {/* Last Seen */}
              {isWide && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                    {formatTimeAgo(member.lastSeen)}
                  </Text>
                </View>
              )}

              {/* 2FA */}
              {isWide && (
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name={member.twoFactorEnabled ? 'shield-checkmark' : 'shield-outline'}
                      size={16}
                      color={member.twoFactorEnabled ? tc.success : tc.disabled}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 12,
                        color: member.twoFactorEnabled ? tc.success : tc.textMuted,
                      }}
                    >
                      {member.twoFactorEnabled ? 'Enabled' : 'Off'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={{ width: 120, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <ActionButton
                  icon="create-outline"
                  color={tc.accent}
                  bgColor={tc.accent + '12'}
                  onPress={() => onEdit(member)}
                />
                <ActionButton
                  icon={member.status === 'active' ? 'pause' : 'play'}
                  color={member.status === 'active' ? tc.warning : tc.success}
                  bgColor={(member.status === 'active' ? tc.warning : tc.success) + '12'}
                  onPress={() =>
                    webConfirm(
                      member.status === 'active' ? 'Suspend Admin' : 'Reactivate Admin',
                      `Are you sure you want to ${member.status === 'active' ? 'suspend' : 'reactivate'} ${member.fullName}?`,
                      () => onToggleStatus(member.uid, member.status),
                    )
                  }
                  disabled={isSelf || submitting}
                />
              </View>
            </View>
          );
        })}

        {members.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={48} color={tc.disabled} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: tc.textMuted, marginTop: 12 }}>
              No admin members found
            </Text>
          </View>
        )}
      </View>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: tc.text, marginBottom: 12 }}>
            Pending Invitations
          </Text>
          <View
            style={{
              backgroundColor: tc.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              overflow: 'hidden',
            }}
          >
            {pendingInvites.map((invite) => (
              <View
                key={invite.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: tc.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>
                    {invite.fullName}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                    {invite.email}
                  </Text>
                </View>
                <RoleBadge role={invite.adminRole} tc={tc} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
                    {formatDate(invite.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ marginLeft: 12 }}
                  onPress={() =>
                    webConfirm('Revoke Invitation', `Revoke invitation for ${invite.email}?`, () =>
                      onRevokeInvite(invite.id),
                    )
                  }
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={tc.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════
//  ROLES & PERMISSIONS TAB
// ═══════════════════════════════════════════════
const RolesTab: React.FC<{ tc: ThemeColors; isDark: boolean; width: number }> = ({ tc, isDark, width }) => {
  const isWide = width >= 900;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: tc.textMuted, marginBottom: 20 }}>
        View the default permissions for each administrator role. Custom permissions can be set per member in the Members tab.
      </Text>

      {/* Roles Permission Matrix */}
      <View
        style={{
          backgroundColor: tc.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: tc.divider,
            backgroundColor: tc.surfaceAlt,
          }}
        >
          <Text style={{ flex: 2, fontFamily: fonts.semiBold, fontSize: 12, color: tc.textMuted }}>
            PERMISSION
          </Text>
          {ALL_ROLES.map((role) => (
            <Text
              key={role}
              style={{
                flex: 1,
                fontFamily: fonts.semiBold,
                fontSize: isWide ? 12 : 10,
                color: tc.textMuted,
                textAlign: 'center',
              }}
            >
              {ADMIN_ROLE_LABELS[role]}
            </Text>
          ))}
        </View>

        {/* Permission Rows */}
        {PERMISSION_KEYS.map((permKey, idx) => (
          <View
            key={permKey}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: idx < PERMISSION_KEYS.length - 1 ? 1 : 0,
              borderBottomColor: tc.divider,
              backgroundColor: idx % 2 === 0 ? 'transparent' : tc.surfaceAlt + '50',
            }}
          >
            <Text style={{ flex: 2, fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>
              {PERMISSION_LABELS[permKey]}
            </Text>
            {ALL_ROLES.map((role) => {
              const hasPermission = DEFAULT_ROLE_PERMISSIONS[role][permKey];
              return (
                <View key={role} style={{ flex: 1, alignItems: 'center' }}>
                  <Ionicons
                    name={hasPermission ? 'checkmark-circle' : 'close-circle-outline'}
                    size={20}
                    color={hasPermission ? tc.success : tc.disabled}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Role Descriptions */}
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: tc.text, marginTop: 28, marginBottom: 14 }}>
        Role Descriptions
      </Text>
      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 12 }}>
        {[
          {
            role: 'super_admin' as AdminRole,
            desc: 'Full unrestricted access to all features. Can manage other admins, billing, and system settings. Only assign to trusted personnel.',
            icon: 'shield',
            color: tc.error,
          },
          {
            role: 'admin' as AdminRole,
            desc: 'Can manage users, content, and view analytics. Cannot manage other admins or billing settings.',
            icon: 'key',
            color: tc.accent,
          },
          {
            role: 'moderator' as AdminRole,
            desc: 'Can manage users and announcements. Limited analytics access. Cannot modify content or settings.',
            icon: 'hand-left',
            color: tc.warning,
          },
          {
            role: 'viewer' as AdminRole,
            desc: 'Read-only access to analytics and dashboards. Cannot modify any content or user data.',
            icon: 'eye',
            color: tc.textLight,
          },
        ].map((item) => (
          <View
            key={item.role}
            style={{
              flex: isWide ? 1 : undefined,
              backgroundColor: tc.white,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              padding: 18,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: item.color + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: tc.text }}>
                {ADMIN_ROLE_LABELS[item.role]}
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textLight, lineHeight: 20 }}>
              {item.desc}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════
//  ACTIVITY LOG TAB
// ═══════════════════════════════════════════════
const ActivityTab: React.FC<{
  logs: AdminActivityLog[];
  tc: ThemeColors;
  width: number;
}> = ({ logs, tc, width }) => {
  if (logs.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <Ionicons name="document-text-outline" size={56} color={tc.disabled} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: tc.textMuted, marginTop: 14 }}>
          No activity logs yet
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4 }}>
          Actions performed by admins will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View
        style={{
          backgroundColor: tc.white,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tc.cardBorder,
          overflow: 'hidden',
        }}
      >
        {logs.map((log, idx) => {
          const actionInfo = getActionIcon(log.action);
          return (
            <View
              key={log.id}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: 16,
                borderBottomWidth: idx < logs.length - 1 ? 1 : 0,
                borderBottomColor: tc.divider,
                gap: 14,
              }}
            >
              {/* Timeline dot */}
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: actionInfo.color + '15',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 2,
                }}
              >
                <Ionicons name={actionInfo.icon as any} size={16} color={actionInfo.color} />
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.text }}>
                    {log.adminName}
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textLight }}>
                    {log.details}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
                    {formatDate(log.timestamp)}
                  </Text>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: tc.disabled }} />
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
                    Target: {log.target.length > 20 ? log.target.slice(0, 20) + '…' : log.target}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════
//  INVITE MODAL
// ═══════════════════════════════════════════════
const InviteModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  email: string;
  setEmail: (v: string) => void;
  fullName: string;
  setFullName: (v: string) => void;
  role: AdminRole;
  setRole: (v: AdminRole) => void;
  tc: ThemeColors;
  isDark: boolean;
}> = ({ visible, onClose, onSubmit, submitting, email, setEmail, fullName, setFullName, role, setRole, tc, isDark }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View
      style={{
        flex: 1,
        backgroundColor: tc.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      <View
        style={{
          backgroundColor: tc.white,
          borderRadius: 18,
          padding: 28,
          width: '100%',
          maxWidth: 480,
          ...(Platform.OS === 'web'
            ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 }
            : {}),
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: tc.accent + '15',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="person-add" size={20} color={tc.accent} />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>Invite Admin</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                Add a new team member
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={tc.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text, marginBottom: 6 }}>Full Name</Text>
        <TextInput
          style={{
            fontFamily: fonts.regular,
            fontSize: 14,
            color: tc.text,
            borderWidth: 1,
            borderColor: tc.inputBorder,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: tc.inputBg,
            marginBottom: 16,
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
          }}
          placeholder="e.g. John Smith"
          placeholderTextColor={tc.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Email */}
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text, marginBottom: 6 }}>Email Address</Text>
        <TextInput
          style={{
            fontFamily: fonts.regular,
            fontSize: 14,
            color: tc.text,
            borderWidth: 1,
            borderColor: tc.inputBorder,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: tc.inputBg,
            marginBottom: 16,
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
          }}
          placeholder="admin@example.com"
          placeholderTextColor={tc.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Role Select */}
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text, marginBottom: 8 }}>Role</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {ALL_ROLES.map((r) => {
            const isSelected = r === role;
            return (
              <TouchableOpacity
                key={r}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: isSelected ? tc.accent : tc.cardBorder,
                  backgroundColor: isSelected ? tc.accent + '12' : 'transparent',
                }}
                onPress={() => setRole(r)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontFamily: isSelected ? fonts.semiBold : fonts.medium,
                    fontSize: 13,
                    color: isSelected ? tc.accent : tc.textLight,
                  }}
                >
                  {ADMIN_ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: tc.cardBorder,
              alignItems: 'center',
            }}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.textLight }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: tc.accent,
              alignItems: 'center',
              opacity: !email.trim() || !fullName.trim() || submitting ? 0.5 : 1,
            }}
            onPress={onSubmit}
            activeOpacity={0.7}
            disabled={!email.trim() || !fullName.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={tc.white} size="small" />
            ) : (
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>Send Invite</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ═══════════════════════════════════════════════
//  EDIT MEMBER MODAL
// ═══════════════════════════════════════════════
const EditMemberModal: React.FC<{
  visible: boolean;
  member: AdminMember | null;
  currentAdminUid: string;
  onClose: () => void;
  onChangeRole: (uid: string, role: AdminRole) => void;
  onUpdatePermissions: (uid: string, perms: AdminPermissions) => void;
  onRemove: (uid: string) => void;
  submitting: boolean;
  tc: ThemeColors;
  isDark: boolean;
}> = ({ visible, member, currentAdminUid, onClose, onChangeRole, onUpdatePermissions, onRemove, submitting, tc, isDark }) => {
  const [editedRole, setEditedRole] = useState<AdminRole>(member?.adminRole ?? 'admin');
  const [editedPerms, setEditedPerms] = useState<AdminPermissions>(
    member?.permissions ?? DEFAULT_ROLE_PERMISSIONS.admin,
  );
  const [customPerms, setCustomPerms] = useState(false);

  // Reset when member changes
  React.useEffect(() => {
    if (member) {
      setEditedRole(member.adminRole);
      setEditedPerms(member.permissions);
      setCustomPerms(false);
    }
  }, [member]);

  const handleRoleChange = (newRole: AdminRole) => {
    setEditedRole(newRole);
    if (!customPerms) {
      setEditedPerms(DEFAULT_ROLE_PERMISSIONS[newRole]);
    }
  };

  const togglePerm = (key: keyof AdminPermissions) => {
    setCustomPerms(true);
    setEditedPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!member) return;
    if (editedRole !== member.adminRole) {
      onChangeRole(member.uid, editedRole);
    }
    if (customPerms) {
      onUpdatePermissions(member.uid, editedPerms);
    }
    onClose();
  };

  if (!member) return null;

  const isSelf = member.uid === currentAdminUid;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: tc.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: tc.white,
            borderRadius: 18,
            padding: 28,
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%' as any,
            ...(Platform.OS === 'web'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 }
              : {}),
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AdminAvatar name={member.fullName} size={44} tc={tc} />
              <View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: tc.text }}>{member.fullName}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted }}>{member.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {/* Role Selection */}
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 10 }}>
              Assign Role
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ALL_ROLES.map((r) => {
                const isSelected = r === editedRole;
                return (
                  <TouchableOpacity
                    key={r}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: isSelected ? tc.accent : tc.cardBorder,
                      backgroundColor: isSelected ? tc.accent + '12' : 'transparent',
                    }}
                    onPress={() => handleRoleChange(r)}
                    activeOpacity={0.7}
                    disabled={isSelf}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? fonts.semiBold : fonts.medium,
                        fontSize: 13,
                        color: isSelected ? tc.accent : tc.textLight,
                      }}
                    >
                      {ADMIN_ROLE_LABELS[r]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Permissions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>
                Permissions
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>Custom</Text>
                <Switch
                  value={customPerms}
                  onValueChange={setCustomPerms}
                  trackColor={{ false: tc.disabled, true: tc.accent + '50' }}
                  thumbColor={customPerms ? tc.accent : tc.white}
                />
              </View>
            </View>

            {PERMISSION_KEYS.map((pk) => (
              <TouchableOpacity
                key={pk}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: tc.divider,
                }}
                onPress={() => customPerms && !isSelf && togglePerm(pk)}
                activeOpacity={customPerms && !isSelf ? 0.7 : 1}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>
                  {PERMISSION_LABELS[pk]}
                </Text>
                <Ionicons
                  name={editedPerms[pk] ? 'checkmark-circle' : 'close-circle-outline'}
                  size={22}
                  color={editedPerms[pk] ? tc.success : tc.disabled}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {!isSelf && (
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: tc.error + '40',
                  backgroundColor: tc.error + '08',
                }}
                onPress={() =>
                  webConfirm(
                    'Remove Admin',
                    `This will demote ${member.fullName} to a regular learner. Continue?`,
                    () => onRemove(member.uid),
                  )
                }
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Ionicons name="trash-outline" size={18} color={tc.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: tc.cardBorder,
                alignItems: 'center',
              }}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.textLight }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: tc.accent,
                alignItems: 'center',
                opacity: submitting ? 0.5 : 1,
              }}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={submitting || isSelf}
            >
              {submitting ? (
                <ActivityIndicator color={tc.white} size="small" />
              ) : (
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════
const AdminAccessControlScreen: React.FC = () => {
  const { colors: tc, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const ctrl = useAccessControlController();

  if (ctrl.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.background }}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: tc.textLight, marginTop: 12 }}>
          Loading access control…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tc.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 48,
          maxWidth: 1200,
          alignSelf: 'center' as const,
          width: '100%' as unknown as number,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: tc.text }}>
              Admin Access Control
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: tc.textMuted, marginTop: 4 }}>
              Manage admin roles, permissions, and team access
            </Text>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: tc.accent,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 12,
            }}
            onPress={() => ctrl.setInviteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={18} color={tc.white} />
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.white }}>
              Invite Admin
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {ctrl.error && (
          <View
            style={{
              backgroundColor: tc.errorBg,
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle" size={20} color={tc.error} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.error, flex: 1 }}>
              {ctrl.error}
            </Text>
            <TouchableOpacity onPress={ctrl.refresh}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.accent }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Bar */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: tc.white,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: tc.cardBorder,
            marginBottom: 20,
            alignSelf: 'flex-start' as const,
          }}
        >
          <TabButton
            label="Members"
            icon="people"
            isActive={ctrl.activeTab === 'members'}
            onPress={() => ctrl.setActiveTab('members')}
            count={ctrl.allMembers.length}
            tc={tc}
          />
          <TabButton
            label="Roles & Permissions"
            icon="key"
            isActive={ctrl.activeTab === 'roles'}
            onPress={() => ctrl.setActiveTab('roles')}
            tc={tc}
          />
          <TabButton
            label="Activity Log"
            icon="time"
            isActive={ctrl.activeTab === 'activity'}
            onPress={() => ctrl.setActiveTab('activity')}
            count={ctrl.activityLogs.length}
            tc={tc}
          />
        </View>

        {/* Search (Members tab only) */}
        {ctrl.activeTab === 'members' && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tc.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              paddingHorizontal: 14,
              height: 42,
              marginBottom: 16,
              maxWidth: 380,
            }}
          >
            <Ionicons name="search" size={18} color={tc.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                fontFamily: fonts.regular,
                fontSize: 14,
                color: tc.text,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
              }}
              placeholder="Search by name, email, or role…"
              placeholderTextColor={tc.textMuted}
              value={ctrl.searchQuery}
              onChangeText={ctrl.setSearchQuery}
            />
          </View>
        )}

        {/* Tab Content */}
        {ctrl.activeTab === 'members' && (
          <MembersTab
            members={ctrl.members}
            pendingInvites={ctrl.pendingInvites}
            currentAdminUid={ctrl.currentAdminUid}
            onEdit={ctrl.openEditMember}
            onToggleStatus={ctrl.handleToggleStatus}
            onRevokeInvite={ctrl.handleRevokeInvite}
            onInvite={() => ctrl.setInviteModalVisible(true)}
            submitting={ctrl.submitting}
            tc={tc}
            isDark={isDark}
            width={width}
          />
        )}
        {ctrl.activeTab === 'roles' && <RolesTab tc={tc} isDark={isDark} width={width} />}
        {ctrl.activeTab === 'activity' && <ActivityTab logs={ctrl.activityLogs} tc={tc} width={width} />}
      </ScrollView>

      {/* Invite Modal */}
      <InviteModal
        visible={ctrl.inviteModalVisible}
        onClose={() => ctrl.setInviteModalVisible(false)}
        onSubmit={ctrl.handleInviteAdmin}
        submitting={ctrl.submitting}
        email={ctrl.inviteEmail}
        setEmail={ctrl.setInviteEmail}
        fullName={ctrl.inviteFullName}
        setFullName={ctrl.setInviteFullName}
        role={ctrl.inviteRole}
        setRole={ctrl.setInviteRole}
        tc={tc}
        isDark={isDark}
      />

      {/* Edit Member Modal */}
      <EditMemberModal
        visible={ctrl.editMemberModalVisible}
        member={ctrl.selectedMember}
        currentAdminUid={ctrl.currentAdminUid}
        onClose={ctrl.closeEditMember}
        onChangeRole={ctrl.handleChangeRole}
        onUpdatePermissions={ctrl.handleUpdatePermissions}
        onRemove={ctrl.handleRemoveAdmin}
        submitting={ctrl.submitting}
        tc={tc}
        isDark={isDark}
      />
    </View>
  );
};

export default AdminAccessControlScreen;
