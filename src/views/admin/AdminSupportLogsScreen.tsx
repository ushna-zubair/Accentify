/**
 * AdminSupportLogsScreen.tsx
 *
 * Professional admin panel for:
 *  - Support Tickets (CRUD, filtering, detail view, status/priority/assignment)
 *  - System & Activity Logs (unified view, filtering by level/source)
 *
 * Two top-level tabs: Tickets | Logs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useSupportLogsController } from '../../controllers/useSupportLogsController';
import type {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportTicketFormData,
  SupportStats,
  TicketFilterTab,
  SystemLogLevel,
  SystemLogSource,
} from '../../models';
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_CATEGORY_LABELS,
  LOG_LEVEL_LABELS,
  LOG_SOURCE_LABELS,
} from '../../models';
import type { UnifiedLogEntry } from '../../services/supportService';

// ─── Constants ───
const ALL_STATUSES: SupportTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const ALL_PRIORITIES: SupportTicketPriority[] = ['critical', 'high', 'medium', 'low'];
const ALL_CATEGORIES: SupportTicketCategory[] = ['account', 'billing', 'technical', 'content', 'feature_request', 'other'];
const ALL_LOG_LEVELS: SystemLogLevel[] = ['info', 'warning', 'error', 'debug'];
const ALL_LOG_SOURCES: SystemLogSource[] = ['auth', 'firestore', 'functions', 'storage', 'admin', 'system'];

const TICKET_TABS: { key: TicketFilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

// ─── Helpers ───
const webConfirm = (title: string, msg: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (confirm(`${title}\n\n${msg}`)) onOk();
  } else {
    onOk();
  }
};

const timeAgo = (iso: string): string => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Color maps ───
const statusColor = (s: SupportTicketStatus, tc: ThemeColors) => {
  const map: Record<SupportTicketStatus, { bg: string; text: string; icon: string }> = {
    open: { bg: tc.accent + '15', text: tc.accent, icon: 'radio-button-on' },
    in_progress: { bg: (tc.warningDeep ?? tc.warning) + '15', text: tc.warningDeep ?? tc.warning, icon: 'time' },
    resolved: { bg: tc.success + '15', text: tc.success, icon: 'checkmark-circle' },
    closed: { bg: tc.disabled + '25', text: tc.textLight, icon: 'close-circle' },
  };
  return map[s] ?? map.open;
};

const priorityColor = (p: SupportTicketPriority, tc: ThemeColors) => {
  const map: Record<SupportTicketPriority, { bg: string; text: string; icon: string }> = {
    critical: { bg: tc.error + '15', text: tc.error, icon: 'flame' },
    high: { bg: '#F97316' + '15', text: '#F97316', icon: 'arrow-up' },
    medium: { bg: (tc.warningDeep ?? tc.warning) + '15', text: tc.warningDeep ?? tc.warning, icon: 'remove' },
    low: { bg: tc.success + '15', text: tc.success, icon: 'arrow-down' },
  };
  return map[p] ?? map.medium;
};

const categoryIcon = (c: SupportTicketCategory): string => {
  const map: Record<SupportTicketCategory, string> = {
    account: 'person-circle',
    billing: 'card',
    technical: 'construct',
    content: 'document-text',
    feature_request: 'bulb',
    other: 'ellipsis-horizontal-circle',
  };
  return map[c] ?? 'help-circle';
};

const logLevelColor = (level: SystemLogLevel, tc: ThemeColors) => {
  const map: Record<SystemLogLevel, { bg: string; text: string; icon: string }> = {
    info: { bg: tc.accent + '12', text: tc.accent, icon: 'information-circle' },
    warning: { bg: (tc.warningDeep ?? tc.warning) + '12', text: tc.warningDeep ?? tc.warning, icon: 'warning' },
    error: { bg: tc.error + '12', text: tc.error, icon: 'alert-circle' },
    debug: { bg: '#8B5CF6' + '12', text: '#8B5CF6', icon: 'bug' },
  };
  return map[level] ?? map.info;
};

// ═══════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════

const StatusBadge: React.FC<{ status: SupportTicketStatus; tc: ThemeColors }> = ({ status, tc }) => {
  const c = statusColor(status, tc);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 }}>
      <Ionicons name={c.icon as any} size={12} color={c.text} />
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 11, color: c.text }}>{SUPPORT_STATUS_LABELS[status]}</Text>
    </View>
  );
};

const PriorityBadge: React.FC<{ priority: SupportTicketPriority; tc: ThemeColors }> = ({ priority, tc }) => {
  const c = priorityColor(priority, tc);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 }}>
      <Ionicons name={c.icon as any} size={12} color={c.text} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: c.text }}>{SUPPORT_PRIORITY_LABELS[priority]}</Text>
    </View>
  );
};

const FilterChip: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
  tc: ThemeColors;
}> = ({ label, isSelected, onPress, tc }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: isSelected ? tc.accent : tc.cardBorder,
      backgroundColor: isSelected ? tc.accent + '12' : 'transparent',
    }}
  >
    <Text style={{ fontFamily: isSelected ? fonts.semiBold : fonts.medium, fontSize: 12, color: isSelected ? tc.accent : tc.textLight }}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════
//  STATS BAR
// ═══════════════════════════════════════════════
const StatsBar: React.FC<{ stats: SupportStats; tc: ThemeColors; isWide: boolean }> = ({ stats, tc, isWide }) => {
  const cards = [
    { label: 'Total Tickets', value: stats.total, icon: 'ticket', color: tc.accent },
    { label: 'Open', value: stats.open, icon: 'radio-button-on', color: '#3B82F6' },
    { label: 'In Progress', value: stats.inProgress, icon: 'time', color: tc.warningDeep ?? tc.warning },
    { label: 'Resolved', value: stats.resolved, icon: 'checkmark-circle', color: tc.success },
    { label: 'Critical', value: stats.critical, icon: 'flame', color: tc.error },
    { label: 'Avg Response', value: stats.avgResponseHours > 0 ? `${stats.avgResponseHours}h` : '—', icon: 'speedometer', color: '#8B5CF6' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {cards.map((c) => (
        <View
          key={c.label}
          style={{
            flex: isWide ? 1 : undefined,
            width: isWide ? undefined : '31%' as any,
            minWidth: 120,
            backgroundColor: tc.white,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: tc.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.color + '15', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={c.icon as any} size={18} color={c.color} />
          </View>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: tc.text }}>{c.value}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{c.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  TICKET ROW
// ═══════════════════════════════════════════════
const TicketRow: React.FC<{
  ticket: SupportTicket;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, s: SupportTicketStatus) => void;
  submitting: boolean;
  tc: ThemeColors;
}> = ({ ticket, onOpen, onEdit, onDelete, onStatusChange, submitting, tc }) => {
  const [showActions, setShowActions] = useState(false);
  const pc = priorityColor(ticket.priority, tc);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onOpen}
      style={{
        backgroundColor: tc.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: tc.cardBorder,
        padding: 16,
        marginBottom: 10,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={ticket.status} tc={tc} />
            <PriorityBadge priority={ticket.priority} tc={tc} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tc.surfaceAlt, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 }}>
              <Ionicons name={categoryIcon(ticket.category) as any} size={12} color={tc.textMuted} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: tc.textMuted }}>{SUPPORT_CATEGORY_LABELS[ticket.category]}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 15, color: tc.text, marginBottom: 3 }} numberOfLines={1}>
            {ticket.subject}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textLight, lineHeight: 19 }} numberOfLines={2}>
            {ticket.description}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ position: 'relative' as any }}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); setShowActions(!showActions); }}
            style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tc.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={tc.textLight} />
          </TouchableOpacity>
          {showActions && (
            <View
              style={{
                position: 'absolute' as any,
                top: 36,
                right: 0,
                backgroundColor: tc.white,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: tc.cardBorder,
                zIndex: 100,
                minWidth: 170,
                ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}),
              }}
            >
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                onPress={() => { setShowActions(false); onOpen(); }}
              >
                <Ionicons name="eye-outline" size={16} color={tc.accent} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                onPress={() => { setShowActions(false); onEdit(); }}
              >
                <Ionicons name="create-outline" size={16} color={tc.accent} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Edit</Text>
              </TouchableOpacity>
              {ticket.status === 'open' && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => { setShowActions(false); onStatusChange(ticket.id, 'in_progress'); }}
                  disabled={submitting}
                >
                  <Ionicons name="time-outline" size={16} color={tc.warningDeep ?? tc.warning} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Mark In Progress</Text>
                </TouchableOpacity>
              )}
              {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => { setShowActions(false); onStatusChange(ticket.id, 'resolved'); }}
                  disabled={submitting}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={tc.success} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Resolve</Text>
                </TouchableOpacity>
              )}
              {ticket.status !== 'closed' && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => { setShowActions(false); onStatusChange(ticket.id, 'closed'); }}
                  disabled={submitting}
                >
                  <Ionicons name="close-circle-outline" size={16} color={tc.textMuted} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Close</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 1, backgroundColor: tc.divider }} />
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                onPress={() => {
                  setShowActions(false);
                  webConfirm('Delete Ticket', `Delete "${ticket.subject}"? This cannot be undone.`, onDelete);
                }}
                disabled={submitting}
              >
                <Ionicons name="trash-outline" size={16} color={tc.error} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.error }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Bottom row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: tc.divider }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="person-outline" size={13} color={tc.textMuted} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>{ticket.userName || ticket.userEmail || '—'}</Text>
          </View>
          {ticket.assignedToName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="arrow-forward" size={11} color={tc.textMuted} />
              <Ionicons name="shield-checkmark-outline" size={13} color={tc.accent} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.accent }}>{ticket.assignedToName}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {ticket.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={{ backgroundColor: tc.accent + '10', paddingVertical: 1, paddingHorizontal: 7, borderRadius: 8 }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: tc.accent }}>{tag}</Text>
            </View>
          ))}
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>{timeAgo(ticket.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════
//  TICKET DETAIL MODAL
// ═══════════════════════════════════════════════
const TicketDetailModal: React.FC<{
  ticket: SupportTicket | null;
  onClose: () => void;
  onStatusChange: (id: string, s: SupportTicketStatus) => void;
  onAssignToMe: (id: string) => void;
  responseInput: string;
  setResponseInput: (v: string) => void;
  onSendResponse: (id: string) => void;
  submitting: boolean;
  tc: ThemeColors;
}> = ({ ticket, onClose, onStatusChange, onAssignToMe, responseInput, setResponseInput, onSendResponse, submitting, tc }) => {
  if (!ticket) return null;
  const sc = statusColor(ticket.status, tc);
  const pc = priorityColor(ticket.priority, tc);

  return (
    <Modal visible={!!ticket} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: tc.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: tc.white,
            borderRadius: 18,
            width: '100%',
            maxWidth: 680,
            maxHeight: '92%' as any,
            ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 } : {}),
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tc.divider }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={ticket.status} tc={tc} />
                <PriorityBadge priority={ticket.priority} tc={tc} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tc.surfaceAlt, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 }}>
                  <Ionicons name={categoryIcon(ticket.category) as any} size={13} color={tc.textMuted} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.textMuted }}>{SUPPORT_CATEGORY_LABELS[ticket.category]}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>{ticket.subject}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24, maxHeight: 500 }} showsVerticalScrollIndicator={false}>
            {/* Info grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <InfoCell label="From" value={ticket.userName || '—'} sub={ticket.userEmail} tc={tc} icon="person" />
              <InfoCell label="Assigned To" value={ticket.assignedToName || 'Unassigned'} tc={tc} icon="shield-checkmark" />
              <InfoCell label="Created" value={formatDate(ticket.createdAt)} tc={tc} icon="calendar" />
              <InfoCell label="Updated" value={formatDate(ticket.updatedAt)} tc={tc} icon="time" />
              {ticket.resolvedAt ? <InfoCell label="Resolved" value={formatDate(ticket.resolvedAt)} tc={tc} icon="checkmark-done" /> : null}
            </View>

            {/* Description */}
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 6 }}>Description</Text>
            <View style={{ backgroundColor: tc.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>{ticket.description || 'No description provided.'}</Text>
            </View>

            {/* Tags */}
            {ticket.tags.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 6 }}>Tags</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ticket.tags.map((tag) => (
                    <View key={tag} style={{ backgroundColor: tc.accent + '12', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 }}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.accent }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Admin notes */}
            {ticket.adminNotes ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 6 }}>Admin Notes</Text>
                <View style={{ backgroundColor: tc.warningBg, borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: tc.warningDeep ?? tc.warning }}>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>{ticket.adminNotes}</Text>
                </View>
              </View>
            ) : null}

            {/* Response */}
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 6 }}>Response</Text>
            {ticket.response ? (
              <View style={{ backgroundColor: tc.successBg, borderRadius: 10, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: tc.success }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>{ticket.response}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  color: tc.text,
                  borderWidth: 1,
                  borderColor: tc.inputBorder,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: tc.inputBg,
                  minHeight: 44,
                  ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
                }}
                placeholder="Write a response…"
                placeholderTextColor={tc.textMuted}
                value={responseInput}
                onChangeText={setResponseInput}
                multiline
              />
              <TouchableOpacity
                onPress={() => onSendResponse(ticket.id)}
                disabled={!responseInput.trim() || submitting}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: tc.accent,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: !responseInput.trim() || submitting ? 0.4 : 1,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={18} color={tc.white} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer actions */}
          <View style={{ flexDirection: 'row', gap: 8, padding: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: tc.divider, flexWrap: 'wrap' }}>
            {!ticket.assignedToName && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: tc.accent + '12', borderWidth: 1, borderColor: tc.accent + '30' }}
                onPress={() => onAssignToMe(ticket.id)}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add" size={14} color={tc.accent} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: tc.accent }}>Assign to Me</Text>
              </TouchableOpacity>
            )}
            {ticket.status !== 'resolved' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: tc.success + '12', borderWidth: 1, borderColor: tc.success + '30' }}
                onPress={() => onStatusChange(ticket.id, 'resolved')}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={14} color={tc.success} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: tc.success }}>Resolve</Text>
              </TouchableOpacity>
            )}
            {ticket.status !== 'closed' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: tc.disabled + '20', borderWidth: 1, borderColor: tc.cardBorder }}
                onPress={() => onStatusChange(ticket.id, 'closed')}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={14} color={tc.textLight} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: tc.textLight }}>Close</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={{ paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5, borderColor: tc.cardBorder }}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.textLight }}>Close Panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const InfoCell: React.FC<{ label: string; value: string; sub?: string; tc: ThemeColors; icon: string }> = ({ label, value, sub, tc, icon }) => (
  <View style={{ minWidth: 140, flex: 1 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
      <Ionicons name={icon as any} size={13} color={tc.textMuted} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.textMuted }}>{label}</Text>
    </View>
    <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.text }}>{value}</Text>
    {sub ? <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>{sub}</Text> : null}
  </View>
);

// ═══════════════════════════════════════════════
//  TICKET FORM MODAL
// ═══════════════════════════════════════════════
const TicketFormModal: React.FC<{
  visible: boolean;
  isEditing: boolean;
  formData: SupportTicketFormData;
  updateField: <K extends keyof SupportTicketFormData>(key: K, val: SupportTicketFormData[K]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  addTag: () => void;
  removeTag: (i: number) => void;
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
  tc: ThemeColors;
}> = ({ visible, isEditing, formData, updateField, tagInput, setTagInput, addTag, removeTag, onSave, onClose, submitting, tc }) => {
  const inputStyle = {
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
  };
  const labelStyle = { fontFamily: fonts.medium, fontSize: 13, color: tc.text, marginBottom: 6 };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: tc.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: tc.white,
            borderRadius: 18,
            width: '100%',
            maxWidth: 600,
            maxHeight: '92%' as any,
            ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 } : {}),
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tc.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tc.accent + '15', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={isEditing ? 'create' : 'add-circle'} size={20} color={tc.accent} />
              </View>
              <View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>{isEditing ? 'Edit Ticket' : 'Create Ticket'}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>{isEditing ? 'Update ticket details' : 'Log a new support ticket'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={tc.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24, maxHeight: 480 }} showsVerticalScrollIndicator={false}>
            {/* Subject */}
            <Text style={labelStyle}>Subject *</Text>
            <TextInput style={inputStyle} placeholder="Brief summary…" placeholderTextColor={tc.textMuted} value={formData.subject} onChangeText={(v) => updateField('subject', v)} />

            {/* Description */}
            <Text style={labelStyle}>Description</Text>
            <TextInput style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }} placeholder="Detailed description…" placeholderTextColor={tc.textMuted} value={formData.description} onChangeText={(v) => updateField('description', v)} multiline />

            {/* Category */}
            <Text style={labelStyle}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {ALL_CATEGORIES.map((cat) => {
                const selected = formData.category === cat;
                return (
                  <TouchableOpacity
                    key={cat} onPress={() => updateField('category', cat)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? tc.accent : tc.cardBorder, backgroundColor: selected ? tc.accent + '10' : 'transparent' }}
                  >
                    <Ionicons name={categoryIcon(cat) as any} size={14} color={selected ? tc.accent : tc.textLight} />
                    <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? tc.accent : tc.textLight }}>{SUPPORT_CATEGORY_LABELS[cat]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority */}
            <Text style={labelStyle}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {ALL_PRIORITIES.map((p) => {
                const selected = formData.priority === p;
                const c = priorityColor(p, tc);
                return (
                  <TouchableOpacity
                    key={p} onPress={() => updateField('priority', p)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? c.text : tc.cardBorder, backgroundColor: selected ? c.bg : 'transparent' }}
                  >
                    <Ionicons name={c.icon as any} size={14} color={selected ? c.text : tc.textLight} />
                    <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? c.text : tc.textLight }}>{SUPPORT_PRIORITY_LABELS[p]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status */}
            <Text style={labelStyle}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {ALL_STATUSES.map((s) => {
                const selected = formData.status === s;
                const c = statusColor(s, tc);
                return (
                  <TouchableOpacity
                    key={s} onPress={() => updateField('status', s)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? c.text : tc.cardBorder, backgroundColor: selected ? c.bg : 'transparent' }}
                  >
                    <Ionicons name={c.icon as any} size={14} color={selected ? c.text : tc.textLight} />
                    <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? c.text : tc.textLight }}>{SUPPORT_STATUS_LABELS[s]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Admin notes */}
            <Text style={labelStyle}>Admin Notes</Text>
            <TextInput style={{ ...inputStyle, minHeight: 60, textAlignVertical: 'top' }} placeholder="Internal notes…" placeholderTextColor={tc.textMuted} value={formData.adminNotes} onChangeText={(v) => updateField('adminNotes', v)} multiline />

            {/* Tags */}
            <Text style={labelStyle}>Tags</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                placeholder="Add a tag…"
                placeholderTextColor={tc.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity onPress={addTag} style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: tc.accent, justifyContent: 'center', alignItems: 'center', opacity: !tagInput.trim() ? 0.4 : 1 }} disabled={!tagInput.trim()} activeOpacity={0.7}>
                <Ionicons name="add" size={22} color={tc.white} />
              </TouchableOpacity>
            </View>
            {formData.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {formData.tags.map((tag, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tc.accent + '12', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.accent }}>{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(idx)}>
                      <Ionicons name="close-circle" size={16} color={tc.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: tc.divider }}>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: tc.cardBorder, alignItems: 'center' }} onPress={onClose} activeOpacity={0.7}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.textLight }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: tc.accent, alignItems: 'center', opacity: !formData.subject.trim() || submitting ? 0.5 : 1 }}
              onPress={onSave}
              disabled={!formData.subject.trim() || submitting}
              activeOpacity={0.7}
            >
              {submitting ? <ActivityIndicator color={tc.white} size="small" /> : <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>{isEditing ? 'Save Changes' : 'Create Ticket'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════
//  LOG ROW
// ═══════════════════════════════════════════════
const LogRow: React.FC<{ log: UnifiedLogEntry; tc: ThemeColors }> = ({ log, tc }) => {
  const lc = logLevelColor(log.level, tc);
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setExpanded(!expanded)}
      style={{
        backgroundColor: tc.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: tc.cardBorder,
        padding: 12,
        marginBottom: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* Level icon */}
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: lc.bg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name={lc.icon as any} size={14} color={lc.text} />
        </View>

        {/* Message */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }} numberOfLines={expanded ? 0 : 1}>
            {log.message}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: lc.bg, paddingVertical: 1, paddingHorizontal: 6, borderRadius: 6 }}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 9, color: lc.text, textTransform: 'uppercase' }}>{log.level}</Text>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{LOG_SOURCE_LABELS[log.source as SystemLogSource] ?? log.source}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>•</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{log.actor}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>•</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{formatDate(log.timestamp)}</Text>
            {log.type === 'activity' && (
              <View style={{ backgroundColor: '#8B5CF6' + '15', paddingVertical: 1, paddingHorizontal: 6, borderRadius: 6 }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: '#8B5CF6' }}>ACTIVITY</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={tc.textMuted} />
      </View>

      {expanded && log.details ? (
        <View style={{ backgroundColor: tc.surfaceAlt, borderRadius: 8, padding: 10, marginTop: 10 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textLight, lineHeight: 18 }}>{log.details}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════
const AdminSupportLogsScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const { width } = useWindowDimensions();
  const ctrl = useSupportLogsController();
  const isWide = width >= 900;

  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const [showPriorityDrop, setShowPriorityDrop] = useState(false);

  // Loading state for active tab
  const isLoading = ctrl.mainTab === 'tickets' ? ctrl.ticketsLoading : ctrl.logsLoading;
  const error = ctrl.mainTab === 'tickets' ? ctrl.ticketsError : ctrl.logsError;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.background }}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: tc.textLight, marginTop: 12 }}>
          Loading {ctrl.mainTab === 'tickets' ? 'tickets' : 'logs'}…
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
          maxWidth: 1280,
          alignSelf: 'center' as const,
          width: '100%' as unknown as number,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: tc.text }}>Support & Logs</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: tc.textMuted, marginTop: 4 }}>
              Manage support tickets and monitor system activity
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tc.surfaceAlt, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder }}
              onPress={ctrl.mainTab === 'tickets' ? ctrl.refreshTickets : ctrl.refreshLogs}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={tc.accent} />
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.accent }}>Refresh</Text>
            </TouchableOpacity>
            {ctrl.mainTab === 'tickets' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tc.accent, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 }}
                onPress={ctrl.openCreateForm}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={18} color={tc.white} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.white }}>New Ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Error ── */}
        {error && (
          <View style={{ backgroundColor: tc.errorBg, borderRadius: 10, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color={tc.error} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.error, flex: 1 }}>{error}</Text>
            <TouchableOpacity onPress={ctrl.mainTab === 'tickets' ? ctrl.refreshTickets : ctrl.refreshLogs}>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.accent }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Main tabs (Tickets / Logs) ── */}
        <View style={{ flexDirection: 'row', backgroundColor: tc.white, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: tc.cardBorder, marginBottom: 20, alignSelf: 'flex-start' as const }}>
          {([{ key: 'tickets' as const, label: 'Support Tickets', icon: 'ticket-outline' }, { key: 'logs' as const, label: 'System Logs', icon: 'list-outline' }]).map((tab) => {
            const active = ctrl.mainTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => ctrl.setMainTab(tab.key)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: active ? tc.accent : 'transparent' }}
              >
                <Ionicons name={tab.icon as any} size={16} color={active ? tc.white : tc.textLight} />
                <Text style={{ fontFamily: active ? fonts.semiBold : fonts.medium, fontSize: 13, color: active ? tc.white : tc.textLight }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═════════════════ TICKETS TAB ═════════════════ */}
        {ctrl.mainTab === 'tickets' && (
          <>
            {/* Stats */}
            <StatsBar stats={ctrl.stats} tc={tc} isWide={isWide} />

            {/* Status tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: tc.white, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: tc.cardBorder, marginBottom: 16, alignSelf: 'flex-start' as const, flexWrap: 'wrap' }}>
              {TICKET_TABS.map((tab) => {
                const isActive = ctrl.ticketTab === tab.key;
                const count = tab.key === 'all'
                  ? ctrl.allTickets.length
                  : ctrl.allTickets.filter((t) => t.status === tab.key).length;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => ctrl.setTicketTab(tab.key)}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: isActive ? tc.accent : 'transparent' }}
                  >
                    <Text style={{ fontFamily: isActive ? fonts.semiBold : fonts.medium, fontSize: 12, color: isActive ? tc.white : tc.textLight }}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={{ backgroundColor: isActive ? tc.white + '30' : tc.accent + '18', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: isActive ? tc.white : tc.accent }}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Filters */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
              {/* Search */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tc.white, borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder, paddingHorizontal: 12, height: 40, flex: isWide ? undefined : 1, width: isWide ? 280 : undefined }}>
                <Ionicons name="search" size={16} color={tc.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tc.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                  placeholder="Search tickets…"
                  placeholderTextColor={tc.textMuted}
                  value={ctrl.searchQuery}
                  onChangeText={ctrl.setSearchQuery}
                />
              </View>

              {/* Category dropdown */}
              <View style={{ position: 'relative' as any, zIndex: 11 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: ctrl.categoryFilter !== 'all' ? tc.accent : tc.cardBorder, backgroundColor: ctrl.categoryFilter !== 'all' ? tc.accent + '08' : tc.white }}
                  onPress={() => { setShowCategoryDrop(!showCategoryDrop); setShowPriorityDrop(false); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="folder-outline" size={14} color={ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight }}>
                    {ctrl.categoryFilter === 'all' ? 'Category' : SUPPORT_CATEGORY_LABELS[ctrl.categoryFilter]}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={tc.textMuted} />
                </TouchableOpacity>
                {showCategoryDrop && (
                  <View style={{ position: 'absolute' as any, top: 44, left: 0, backgroundColor: tc.white, borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder, zIndex: 100, minWidth: 180, ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}) }}>
                    <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }} onPress={() => { ctrl.setCategoryFilter('all'); setShowCategoryDrop(false); }}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === 'all' ? tc.accent : tc.text }}>All Categories</Text>
                    </TouchableOpacity>
                    {ALL_CATEGORIES.map((cat) => (
                      <TouchableOpacity key={cat} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }} onPress={() => { ctrl.setCategoryFilter(cat); setShowCategoryDrop(false); }}>
                        <Ionicons name={categoryIcon(cat) as any} size={16} color={ctrl.categoryFilter === cat ? tc.accent : tc.textLight} />
                        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === cat ? tc.accent : tc.text }}>{SUPPORT_CATEGORY_LABELS[cat]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Priority dropdown */}
              <View style={{ position: 'relative' as any, zIndex: 10 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: ctrl.priorityFilter !== 'all' ? tc.accent : tc.cardBorder, backgroundColor: ctrl.priorityFilter !== 'all' ? tc.accent + '08' : tc.white }}
                  onPress={() => { setShowPriorityDrop(!showPriorityDrop); setShowCategoryDrop(false); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={14} color={ctrl.priorityFilter !== 'all' ? tc.accent : tc.textLight} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: ctrl.priorityFilter !== 'all' ? tc.accent : tc.textLight }}>
                    {ctrl.priorityFilter === 'all' ? 'Priority' : SUPPORT_PRIORITY_LABELS[ctrl.priorityFilter]}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={tc.textMuted} />
                </TouchableOpacity>
                {showPriorityDrop && (
                  <View style={{ position: 'absolute' as any, top: 44, left: 0, backgroundColor: tc.white, borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder, zIndex: 100, minWidth: 160, ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}) }}>
                    <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }} onPress={() => { ctrl.setPriorityFilter('all'); setShowPriorityDrop(false); }}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.priorityFilter === 'all' ? tc.accent : tc.text }}>All Priorities</Text>
                    </TouchableOpacity>
                    {ALL_PRIORITIES.map((p) => {
                      const c = priorityColor(p, tc);
                      return (
                        <TouchableOpacity key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }} onPress={() => { ctrl.setPriorityFilter(p); setShowPriorityDrop(false); }}>
                          <Ionicons name={c.icon as any} size={16} color={ctrl.priorityFilter === p ? tc.accent : c.text} />
                          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.priorityFilter === p ? tc.accent : tc.text }}>{SUPPORT_PRIORITY_LABELS[p]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Sort chips */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {([
                  { key: 'newest' as const, label: 'Newest' },
                  { key: 'oldest' as const, label: 'Oldest' },
                  { key: 'priority' as const, label: 'Priority' },
                  { key: 'updated' as const, label: 'Updated' },
                ]).map((s) => (
                  <FilterChip key={s.key} label={s.label} isSelected={ctrl.sortBy === s.key} onPress={() => ctrl.setSortBy(s.key)} tc={tc} />
                ))}
              </View>
            </View>

            {/* Ticket list */}
            {ctrl.tickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onOpen={() => ctrl.openDetail(ticket)}
                onEdit={() => ctrl.openEditForm(ticket)}
                onDelete={() => ctrl.handleDelete(ticket.id)}
                onStatusChange={ctrl.handleStatusChange}
                submitting={ctrl.submitting}
                tc={tc}
              />
            ))}

            {ctrl.tickets.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="ticket-outline" size={56} color={tc.disabled} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: tc.textMuted, marginTop: 14 }}>No tickets found</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4 }}>
                  {ctrl.searchQuery || ctrl.categoryFilter !== 'all' || ctrl.priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'All clear! No support tickets at the moment'}
                </Text>
              </View>
            )}

            {ctrl.tickets.length > 0 && (
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginTop: 8 }}>
                Showing {ctrl.tickets.length} of {ctrl.allTickets.length} tickets
              </Text>
            )}
          </>
        )}

        {/* ═════════════════ LOGS TAB ═════════════════ */}
        {ctrl.mainTab === 'logs' && (
          <>
            {/* Logs summary cards */}
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { label: 'Total Entries', value: ctrl.allLogs.length, icon: 'list', color: tc.accent },
                { label: 'Errors', value: ctrl.allLogs.filter((l) => l.level === 'error').length, icon: 'alert-circle', color: tc.error },
                { label: 'Warnings', value: ctrl.allLogs.filter((l) => l.level === 'warning').length, icon: 'warning', color: tc.warningDeep ?? tc.warning },
                { label: 'Activity Logs', value: ctrl.allLogs.filter((l) => l.type === 'activity').length, icon: 'shield-checkmark', color: '#8B5CF6' },
              ].map((c) => (
                <View
                  key={c.label}
                  style={{
                    flex: isWide ? 1 : undefined,
                    width: isWide ? undefined : '48%' as any,
                    minWidth: 130,
                    backgroundColor: tc.white,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: tc.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name={c.icon as any} size={18} color={c.color} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: tc.text }}>{c.value}</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{c.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Log filters */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {/* Search */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tc.white, borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder, paddingHorizontal: 12, height: 40, flex: isWide ? undefined : 1, width: isWide ? 280 : undefined }}>
                <Ionicons name="search" size={16} color={tc.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tc.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                  placeholder="Search logs…"
                  placeholderTextColor={tc.textMuted}
                  value={ctrl.logSearch}
                  onChangeText={ctrl.setLogSearch}
                />
              </View>

              {/* Level chips */}
              <FilterChip label="All" isSelected={ctrl.logLevelFilter === 'all'} onPress={() => ctrl.setLogLevelFilter('all')} tc={tc} />
              {ALL_LOG_LEVELS.map((lvl) => {
                const lc = logLevelColor(lvl, tc);
                return (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => ctrl.setLogLevelFilter(lvl)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: ctrl.logLevelFilter === lvl ? lc.text : tc.cardBorder,
                      backgroundColor: ctrl.logLevelFilter === lvl ? lc.bg : 'transparent',
                    }}
                  >
                    <Ionicons name={lc.icon as any} size={13} color={ctrl.logLevelFilter === lvl ? lc.text : tc.textLight} />
                    <Text style={{ fontFamily: ctrl.logLevelFilter === lvl ? fonts.semiBold : fonts.medium, fontSize: 12, color: ctrl.logLevelFilter === lvl ? lc.text : tc.textLight }}>{LOG_LEVEL_LABELS[lvl]}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Source chips */}
              <View style={{ width: '100%' as any, flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <FilterChip label="All Sources" isSelected={ctrl.logSourceFilter === 'all'} onPress={() => ctrl.setLogSourceFilter('all')} tc={tc} />
                {ALL_LOG_SOURCES.map((src) => (
                  <FilterChip key={src} label={LOG_SOURCE_LABELS[src]} isSelected={ctrl.logSourceFilter === src} onPress={() => ctrl.setLogSourceFilter(src)} tc={tc} />
                ))}
              </View>
            </View>

            {/* Log list */}
            {ctrl.logs.map((log) => (
              <LogRow key={`${log.type}-${log.id}`} log={log} tc={tc} />
            ))}

            {ctrl.logs.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="document-text-outline" size={56} color={tc.disabled} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: tc.textMuted, marginTop: 14 }}>No logs found</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4 }}>
                  {ctrl.logSearch || ctrl.logLevelFilter !== 'all' || ctrl.logSourceFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No system logs recorded yet'}
                </Text>
              </View>
            )}

            {ctrl.logs.length > 0 && (
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginTop: 8 }}>
                Showing {ctrl.logs.length} of {ctrl.allLogs.length} log entries
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <TicketFormModal
        visible={ctrl.formVisible}
        isEditing={!!ctrl.editingTicket}
        formData={ctrl.formData}
        updateField={ctrl.updateFormField}
        tagInput={ctrl.tagInput}
        setTagInput={ctrl.setTagInput}
        addTag={ctrl.addTag}
        removeTag={ctrl.removeTag}
        onSave={ctrl.handleSave}
        onClose={ctrl.closeForm}
        submitting={ctrl.submitting}
        tc={tc}
      />

      <TicketDetailModal
        ticket={ctrl.detailTicket}
        onClose={ctrl.closeDetail}
        onStatusChange={ctrl.handleStatusChange}
        onAssignToMe={ctrl.handleAssignToMe}
        responseInput={ctrl.responseInput}
        setResponseInput={ctrl.setResponseInput}
        onSendResponse={ctrl.handleSendResponse}
        submitting={ctrl.submitting}
        tc={tc}
      />
    </View>
  );
};

export default AdminSupportLogsScreen;
