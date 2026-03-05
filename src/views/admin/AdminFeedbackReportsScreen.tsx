/**
 * AdminFeedbackReportsScreen.tsx
 *
 * Professional admin feedback & reports panel with:
 *  - Stats overview cards
 *  - Tabbed feedback list (All / Open / In Progress / Resolved / Closed)
 *  - Category & priority filters, search, sort
 *  - Feedback detail slide-over with response, notes, status/priority controls
 *  - Activity timeline per feedback item
 *  - Responsive layout
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
import { useFeedbackReportsController } from '../../controllers/useFeedbackReportsController';
import type {
  FeedbackItem,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackCategory,
  FeedbackTab,
} from '../../models';
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from '../../models';

// ─── Constants ───
const ALL_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const ALL_PRIORITIES: FeedbackPriority[] = ['critical', 'high', 'medium', 'low'];
const ALL_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'content', 'ui', 'performance', 'other'];
const TABS: { key: FeedbackTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

// ─── Helpers ───
const webConfirm = (title: string, msg: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
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

const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Color Maps ───
const statusColor = (s: FeedbackStatus, tc: ThemeColors) => {
  const map: Record<FeedbackStatus, { bg: string; text: string }> = {
    open: { bg: tc.accent + '18', text: tc.accent },
    in_progress: { bg: tc.warning + '18', text: tc.warningDeep ?? tc.warning },
    resolved: { bg: tc.success + '18', text: tc.success },
    closed: { bg: tc.disabled + '30', text: tc.textLight },
    archived: { bg: tc.disabled + '20', text: tc.textMuted },
  };
  return map[s] ?? map.open;
};

const priorityColor = (p: FeedbackPriority, tc: ThemeColors) => {
  const map: Record<FeedbackPriority, { bg: string; text: string; icon: string }> = {
    critical: { bg: tc.error + '15', text: tc.error, icon: 'flame' },
    high: { bg: '#F97316' + '15', text: '#F97316', icon: 'arrow-up' },
    medium: { bg: tc.warning + '15', text: tc.warningDeep ?? tc.warning, icon: 'remove' },
    low: { bg: tc.success + '15', text: tc.success, icon: 'arrow-down' },
  };
  return map[p] ?? map.medium;
};

const categoryIcon = (c: FeedbackCategory): string => {
  const map: Record<FeedbackCategory, string> = {
    bug: 'bug',
    feature: 'bulb',
    content: 'document-text',
    ui: 'color-palette',
    performance: 'speedometer',
    other: 'ellipsis-horizontal-circle',
  };
  return map[c] ?? 'ellipsis-horizontal-circle';
};

// ═══════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════

const StatusBadge: React.FC<{ status: FeedbackStatus; tc: ThemeColors }> = ({ status, tc }) => {
  const c = statusColor(status, tc);
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 }}>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 11, color: c.text }}>
        {FEEDBACK_STATUS_LABELS[status]}
      </Text>
    </View>
  );
};

const PriorityBadge: React.FC<{ priority: FeedbackPriority; tc: ThemeColors }> = ({ priority, tc }) => {
  const c = priorityColor(priority, tc);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 }}>
      <Ionicons name={c.icon as any} size={12} color={c.text} />
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 11, color: c.text }}>
        {FEEDBACK_PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
};

const CategoryBadge: React.FC<{ category: FeedbackCategory; tc: ThemeColors }> = ({ category, tc }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Ionicons name={categoryIcon(category) as any} size={14} color={tc.textLight} />
    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textLight }}>
      {FEEDBACK_CATEGORY_LABELS[category]}
    </Text>
  </View>
);

// Chip-style filter button
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
    <Text
      style={{
        fontFamily: isSelected ? fonts.semiBold : fonts.medium,
        fontSize: 12,
        color: isSelected ? tc.accent : tc.textLight,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════
//  STATS BAR
// ═══════════════════════════════════════════════
const StatsBar: React.FC<{ stats: any; tc: ThemeColors; isWide: boolean }> = ({ stats, tc, isWide }) => {
  const cards = [
    { label: 'Total', value: stats.total, icon: 'chatbox-ellipses', color: tc.accent },
    { label: 'Open', value: stats.open, icon: 'alert-circle', color: '#3B82F6' },
    { label: 'In Progress', value: stats.inProgress, icon: 'time', color: tc.warningDeep ?? tc.warning },
    { label: 'Resolved', value: stats.resolved, icon: 'checkmark-circle', color: tc.success },
    { label: 'Critical', value: stats.critical, icon: 'flame', color: tc.error },
    { label: 'Avg Resolution', value: `${stats.avgResolutionHours}h`, icon: 'hourglass', color: '#8B5CF6' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {cards.map((c) => (
        <View
          key={c.label}
          style={{
            flex: isWide ? 1 : undefined,
            width: isWide ? undefined : '31%' as any,
            minWidth: 140,
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
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: c.color + '15',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name={c.icon as any} size={18} color={c.color} />
          </View>
          <View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>
              {c.value}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>
              {c.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  FEEDBACK LIST ITEM
// ═══════════════════════════════════════════════
const FeedbackRow: React.FC<{
  item: FeedbackItem;
  onPress: () => void;
  tc: ThemeColors;
  isWide: boolean;
}> = ({ item, onPress, tc, isWide }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    }}
  >
    {/* Category icon */}
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: tc.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}
    >
      <Ionicons name={categoryIcon(item.category) as any} size={18} color={tc.textLight} />
    </View>

    {/* Subject + user */}
    <View style={{ flex: 2.5 }}>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }} numberOfLines={1}>
        {item.subject}
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }} numberOfLines={1}>
        {item.userFullName} · {item.userEmail}
      </Text>
    </View>

    {/* Category */}
    {isWide && (
      <View style={{ flex: 1 }}>
        <CategoryBadge category={item.category} tc={tc} />
      </View>
    )}

    {/* Priority */}
    <View style={{ flex: 0.8 }}>
      <PriorityBadge priority={item.priority} tc={tc} />
    </View>

    {/* Status */}
    <View style={{ flex: 0.8 }}>
      <StatusBadge status={item.status} tc={tc} />
    </View>

    {/* Time */}
    {isWide && (
      <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    )}

    {/* Chevron */}
    <Ionicons name="chevron-forward" size={18} color={tc.disabled} style={{ marginLeft: 8 }} />
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════════════════
const DetailModal: React.FC<{
  visible: boolean;
  item: FeedbackItem | null;
  onClose: () => void;
  responseText: string;
  setResponseText: (v: string) => void;
  adminNotesText: string;
  setAdminNotesText: (v: string) => void;
  activityLog: any[];
  submitting: boolean;
  onStatusChange: (id: string, s: FeedbackStatus) => void;
  onPriorityChange: (id: string, p: FeedbackPriority) => void;
  onRespond: (id: string) => void;
  onSaveNotes: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  tc: ThemeColors;
  width: number;
}> = ({
  visible,
  item,
  onClose,
  responseText,
  setResponseText,
  adminNotesText,
  setAdminNotesText,
  activityLog,
  submitting,
  onStatusChange,
  onPriorityChange,
  onRespond,
  onSaveNotes,
  onArchive,
  onDelete,
  tc,
  width,
}) => {
  const [activeSection, setActiveSection] = useState<'details' | 'respond' | 'notes' | 'activity'>('details');
  const isWide = width >= 900;

  if (!item) return null;

  const sectionBtn = (key: typeof activeSection, label: string, icon: string) => (
    <TouchableOpacity
      key={key}
      onPress={() => setActiveSection(key)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: activeSection === key ? tc.accent : 'transparent',
      }}
    >
      <Ionicons name={icon as any} size={16} color={activeSection === key ? tc.white : tc.textLight} />
      <Text
        style={{
          fontFamily: activeSection === key ? fonts.semiBold : fonts.medium,
          fontSize: 13,
          color: activeSection === key ? tc.white : tc.textLight,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: tc.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: tc.white,
            borderRadius: 18,
            width: '100%',
            maxWidth: 720,
            maxHeight: '92%' as any,
            ...(Platform.OS === 'web'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 }
              : {}),
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: tc.divider,
            }}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CategoryBadge category={item.category} tc={tc} />
                <PriorityBadge priority={item.priority} tc={tc} />
                <StatusBadge status={item.status} tc={tc} />
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text, marginBottom: 2 }}>
                {item.subject}
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                by {item.userFullName} ({item.userEmail}) · {fmtDate(item.createdAt)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Section Tabs */}
          <View
            style={{
              flexDirection: 'row',
              padding: 12,
              paddingHorizontal: 24,
              gap: 4,
              borderBottomWidth: 1,
              borderBottomColor: tc.divider,
            }}
          >
            {sectionBtn('details', 'Details', 'information-circle')}
            {sectionBtn('respond', 'Respond', 'chatbubble')}
            {sectionBtn('notes', 'Notes', 'document-text')}
            {sectionBtn('activity', 'Activity', 'time')}
          </View>

          {/* Body */}
          <ScrollView style={{ maxHeight: 450, padding: 24 }} showsVerticalScrollIndicator={false}>
            {/* ── Details Section ── */}
            {activeSection === 'details' && (
              <View>
                {/* Description */}
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 8 }}>
                  Description
                </Text>
                <View
                  style={{
                    backgroundColor: tc.surfaceAlt,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>
                    {item.description || 'No description provided.'}
                  </Text>
                </View>

                {/* Meta Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'ID', value: item.id.slice(0, 12) + '…', icon: 'finger-print' },
                    { label: 'App Version', value: item.appVersion || '—', icon: 'phone-portrait' },
                    { label: 'Device', value: item.deviceInfo || '—', icon: 'hardware-chip' },
                    { label: 'Assigned To', value: item.assignedToName || 'Unassigned', icon: 'person' },
                    { label: 'Last Updated', value: fmtDate(item.updatedAt), icon: 'calendar' },
                    { label: 'Tags', value: item.tags.length > 0 ? item.tags.join(', ') : '—', icon: 'pricetags' },
                  ].map((m) => (
                    <View
                      key={m.label}
                      style={{
                        width: isWide ? '48%' as any : '100%' as any,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 8,
                      }}
                    >
                      <Ionicons name={m.icon as any} size={16} color={tc.textMuted} />
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>
                        {m.label}:
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.text, flex: 1 }} numberOfLines={1}>
                        {m.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Previous response */}
                {item.responseMessage ? (
                  <View>
                    <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 8 }}>
                      Admin Response
                    </Text>
                    <View
                      style={{
                        backgroundColor: tc.accent + '08',
                        borderRadius: 10,
                        borderLeftWidth: 3,
                        borderLeftColor: tc.accent,
                        padding: 14,
                        marginBottom: 16,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>
                        {item.responseMessage}
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted, marginTop: 6 }}>
                        — {item.respondedByName}, {fmtDate(item.respondedAt ?? '')}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Quick Actions */}
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 10 }}>
                  Change Status
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {ALL_STATUSES.map((s) => {
                    const c = statusColor(s, tc);
                    const isCurrent = item.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => !isCurrent && onStatusChange(item.id, s)}
                        activeOpacity={isCurrent ? 1 : 0.7}
                        disabled={submitting}
                        style={{
                          paddingVertical: 7,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isCurrent ? c.text : tc.cardBorder,
                          backgroundColor: isCurrent ? c.bg : 'transparent',
                          opacity: submitting ? 0.5 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isCurrent ? fonts.semiBold : fonts.medium,
                            fontSize: 12,
                            color: isCurrent ? c.text : tc.textLight,
                          }}
                        >
                          {FEEDBACK_STATUS_LABELS[s]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 10 }}>
                  Change Priority
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {ALL_PRIORITIES.map((p) => {
                    const c = priorityColor(p, tc);
                    const isCurrent = item.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => !isCurrent && onPriorityChange(item.id, p)}
                        activeOpacity={isCurrent ? 1 : 0.7}
                        disabled={submitting}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingVertical: 7,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isCurrent ? c.text : tc.cardBorder,
                          backgroundColor: isCurrent ? c.bg : 'transparent',
                          opacity: submitting ? 0.5 : 1,
                        }}
                      >
                        <Ionicons name={c.icon as any} size={14} color={isCurrent ? c.text : tc.textLight} />
                        <Text
                          style={{
                            fontFamily: isCurrent ? fonts.semiBold : fonts.medium,
                            fontSize: 12,
                            color: isCurrent ? c.text : tc.textLight,
                          }}
                        >
                          {FEEDBACK_PRIORITY_LABELS[p]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Respond Section ── */}
            {activeSection === 'respond' && (
              <View>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 4 }}>
                  Reply to User
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginBottom: 12 }}>
                  This message will be sent to {item.userFullName} and the status will be set to "In Progress".
                </Text>
                <TextInput
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 14,
                    color: tc.text,
                    borderWidth: 1,
                    borderColor: tc.inputBorder,
                    borderRadius: 12,
                    padding: 14,
                    backgroundColor: tc.inputBg,
                    minHeight: 140,
                    textAlignVertical: 'top',
                    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
                  }}
                  placeholder="Write your response…"
                  placeholderTextColor={tc.textMuted}
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                />
                <TouchableOpacity
                  style={{
                    marginTop: 14,
                    backgroundColor: tc.accent,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    opacity: !responseText.trim() || submitting ? 0.5 : 1,
                  }}
                  onPress={() => onRespond(item.id)}
                  disabled={!responseText.trim() || submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color={tc.white} size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="send" size={18} color={tc.white} />
                      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>Send Response</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {item.responseMessage ? (
                  <View style={{ marginTop: 24 }}>
                    <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.textLight, marginBottom: 8 }}>
                      Previous Response
                    </Text>
                    <View
                      style={{
                        backgroundColor: tc.surfaceAlt,
                        borderRadius: 10,
                        padding: 14,
                        borderLeftWidth: 3,
                        borderLeftColor: tc.accent,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, lineHeight: 20 }}>
                        {item.responseMessage}
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted, marginTop: 6 }}>
                        — {item.respondedByName}, {fmtDate(item.respondedAt ?? '')}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* ── Notes Section ── */}
            {activeSection === 'notes' && (
              <View>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text, marginBottom: 4 }}>
                  Internal Admin Notes
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginBottom: 12 }}>
                  These notes are only visible to the admin team.
                </Text>
                <TextInput
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 14,
                    color: tc.text,
                    borderWidth: 1,
                    borderColor: tc.inputBorder,
                    borderRadius: 12,
                    padding: 14,
                    backgroundColor: tc.inputBg,
                    minHeight: 160,
                    textAlignVertical: 'top',
                    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
                  }}
                  placeholder="Add internal notes…"
                  placeholderTextColor={tc.textMuted}
                  value={adminNotesText}
                  onChangeText={setAdminNotesText}
                  multiline
                />
                <TouchableOpacity
                  style={{
                    marginTop: 14,
                    backgroundColor: tc.accent,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    opacity: submitting ? 0.5 : 1,
                  }}
                  onPress={() => onSaveNotes(item.id)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color={tc.white} size="small" />
                  ) : (
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>Save Notes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── Activity Section ── */}
            {activeSection === 'activity' && (
              <View>
                {activityLog.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="time-outline" size={40} color={tc.disabled} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: tc.textMuted, marginTop: 10 }}>
                      No activity recorded yet
                    </Text>
                  </View>
                ) : (
                  activityLog.map((log: any, idx: number) => (
                    <View
                      key={log.id}
                      style={{
                        flexDirection: 'row',
                        gap: 12,
                        paddingVertical: 10,
                        borderBottomWidth: idx < activityLog.length - 1 ? 1 : 0,
                        borderBottomColor: tc.divider,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: tc.accent + '15',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="time" size={14} color={tc.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>
                          <Text style={{ fontFamily: fonts.semiBold }}>{log.adminName}</Text> {log.details}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted, marginTop: 2 }}>
                          {fmtDate(log.timestamp)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: tc.divider,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: tc.warning + '10',
                  borderWidth: 1,
                  borderColor: tc.warning + '30',
                }}
                onPress={() =>
                  webConfirm('Archive', `Archive this feedback from ${item.userFullName}?`, () =>
                    onArchive(item.id),
                  )
                }
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="archive" size={16} color={tc.warningDeep ?? tc.warning} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.warningDeep ?? tc.warning }}>
                  Archive
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: tc.error + '08',
                  borderWidth: 1,
                  borderColor: tc.error + '30',
                }}
                onPress={() =>
                  webConfirm('Delete', `Permanently delete this feedback? This cannot be undone.`, () =>
                    onDelete(item.id),
                  )
                }
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={16} color={tc.error} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.error }}>Delete</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: tc.cardBorder,
              }}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.textLight }}>Close</Text>
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
const AdminFeedbackReportsScreen: React.FC = () => {
  const { colors: tc, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const ctrl = useFeedbackReportsController();
  const isWide = width >= 900;

  // Category / Priority filter dropdowns
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);

  if (ctrl.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.background }}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: tc.textLight, marginTop: 12 }}>
          Loading feedback…
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
            <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: tc.text }}>
              Feedback & Reports
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: tc.textMuted, marginTop: 4 }}>
              Review and manage user feedback, bug reports, and feature requests
            </Text>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: tc.surfaceAlt,
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tc.cardBorder,
            }}
            onPress={ctrl.refresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={tc.accent} />
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.accent }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* ── Error ── */}
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

        {/* ── Stats ── */}
        <StatsBar stats={ctrl.stats} tc={tc} isWide={isWide} />

        {/* ── Tabs ── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: tc.white,
            borderRadius: 12,
            padding: 4,
            borderWidth: 1,
            borderColor: tc.cardBorder,
            marginBottom: 16,
            alignSelf: 'flex-start' as const,
            flexWrap: 'wrap',
          }}
        >
          {TABS.map((tab) => {
            const isActive = ctrl.activeTab === tab.key;
            const count = tab.key === 'all'
              ? ctrl.allItems.length
              : ctrl.allItems.filter((i) => i.status === tab.key).length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => ctrl.setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: isActive ? tc.accent : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: isActive ? fonts.semiBold : fonts.medium,
                    fontSize: 13,
                    color: isActive ? tc.white : tc.textLight,
                  }}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      backgroundColor: isActive ? tc.white + '30' : tc.accent + '18',
                      borderRadius: 9,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{ fontFamily: fonts.bold, fontSize: 10, color: isActive ? tc.white : tc.accent }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Filters Row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: tc.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tc.cardBorder,
              paddingHorizontal: 12,
              height: 40,
              flex: isWide ? undefined : 1,
              width: isWide ? 300 : undefined,
            }}
          >
            <Ionicons name="search" size={16} color={tc.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1,
                fontFamily: fonts.regular,
                fontSize: 13,
                color: tc.text,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
              }}
              placeholder="Search feedback…"
              placeholderTextColor={tc.textMuted}
              value={ctrl.searchQuery}
              onChangeText={ctrl.setSearchQuery}
            />
          </View>

          {/* Category Filter */}
          <View style={{ position: 'relative' as any }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: ctrl.categoryFilter !== 'all' ? tc.accent : tc.cardBorder,
                backgroundColor: ctrl.categoryFilter !== 'all' ? tc.accent + '08' : tc.white,
              }}
              onPress={() => {
                setShowCategoryFilter(!showCategoryFilter);
                setShowPriorityFilter(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="funnel-outline" size={14} color={ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight} />
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 12,
                  color: ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight,
                }}
              >
                {ctrl.categoryFilter === 'all' ? 'Category' : FEEDBACK_CATEGORY_LABELS[ctrl.categoryFilter]}
              </Text>
              <Ionicons name="chevron-down" size={14} color={tc.textMuted} />
            </TouchableOpacity>
            {showCategoryFilter && (
              <View
                style={{
                  position: 'absolute' as any,
                  top: 44,
                  left: 0,
                  backgroundColor: tc.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: tc.cardBorder,
                  zIndex: 100,
                  minWidth: 180,
                  ...(Platform.OS === 'web'
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }
                    : {}),
                }}
              >
                <TouchableOpacity
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }}
                  onPress={() => { ctrl.setCategoryFilter('all'); setShowCategoryFilter(false); }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === 'all' ? tc.accent : tc.text }}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {ALL_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                    onPress={() => { ctrl.setCategoryFilter(cat); setShowCategoryFilter(false); }}
                  >
                    <Ionicons name={categoryIcon(cat) as any} size={16} color={ctrl.categoryFilter === cat ? tc.accent : tc.textLight} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === cat ? tc.accent : tc.text }}>
                      {FEEDBACK_CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Priority Filter */}
          <View style={{ position: 'relative' as any }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: ctrl.priorityFilter !== 'all' ? tc.accent : tc.cardBorder,
                backgroundColor: ctrl.priorityFilter !== 'all' ? tc.accent + '08' : tc.white,
              }}
              onPress={() => {
                setShowPriorityFilter(!showPriorityFilter);
                setShowCategoryFilter(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={14} color={ctrl.priorityFilter !== 'all' ? tc.accent : tc.textLight} />
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 12,
                  color: ctrl.priorityFilter !== 'all' ? tc.accent : tc.textLight,
                }}
              >
                {ctrl.priorityFilter === 'all' ? 'Priority' : FEEDBACK_PRIORITY_LABELS[ctrl.priorityFilter]}
              </Text>
              <Ionicons name="chevron-down" size={14} color={tc.textMuted} />
            </TouchableOpacity>
            {showPriorityFilter && (
              <View
                style={{
                  position: 'absolute' as any,
                  top: 44,
                  left: 0,
                  backgroundColor: tc.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: tc.cardBorder,
                  zIndex: 100,
                  minWidth: 160,
                  ...(Platform.OS === 'web'
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }
                    : {}),
                }}
              >
                <TouchableOpacity
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }}
                  onPress={() => { ctrl.setPriorityFilter('all'); setShowPriorityFilter(false); }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.priorityFilter === 'all' ? tc.accent : tc.text }}>
                    All Priorities
                  </Text>
                </TouchableOpacity>
                {ALL_PRIORITIES.map((p) => {
                  const c = priorityColor(p, tc);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                      onPress={() => { ctrl.setPriorityFilter(p); setShowPriorityFilter(false); }}
                    >
                      <Ionicons name={c.icon as any} size={14} color={ctrl.priorityFilter === p ? tc.accent : c.text} />
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.priorityFilter === p ? tc.accent : tc.text }}>
                        {FEEDBACK_PRIORITY_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Sort */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['newest', 'oldest', 'priority'] as const).map((s) => (
              <FilterChip
                key={s}
                label={s === 'newest' ? 'Newest' : s === 'oldest' ? 'Oldest' : 'Priority'}
                isSelected={ctrl.sortBy === s}
                onPress={() => ctrl.setSortBy(s)}
                tc={tc}
              />
            ))}
          </View>
        </View>

        {/* ── Feedback List ── */}
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
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: tc.divider,
              backgroundColor: tc.surfaceAlt,
            }}
          >
            <View style={{ width: 48 }} />
            <Text style={{ flex: 2.5, fontFamily: fonts.semiBold, fontSize: 11, color: tc.textMuted }}>FEEDBACK</Text>
            {isWide && <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 11, color: tc.textMuted }}>CATEGORY</Text>}
            <Text style={{ flex: 0.8, fontFamily: fonts.semiBold, fontSize: 11, color: tc.textMuted }}>PRIORITY</Text>
            <Text style={{ flex: 0.8, fontFamily: fonts.semiBold, fontSize: 11, color: tc.textMuted }}>STATUS</Text>
            {isWide && <Text style={{ flex: 0.8, fontFamily: fonts.semiBold, fontSize: 11, color: tc.textMuted, textAlign: 'right' }}>TIME</Text>}
            <View style={{ width: 26 }} />
          </View>

          {ctrl.items.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              onPress={() => ctrl.openDetail(item)}
              tc={tc}
              isWide={isWide}
            />
          ))}

          {ctrl.items.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="chatbox-ellipses-outline" size={52} color={tc.disabled} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: tc.textMuted, marginTop: 14 }}>
                No feedback found
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4 }}>
                {ctrl.searchQuery || ctrl.categoryFilter !== 'all' || ctrl.priorityFilter !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'User feedback and reports will appear here'}
              </Text>
            </View>
          )}
        </View>

        {/* Result count */}
        {ctrl.items.length > 0 && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginTop: 10 }}>
            Showing {ctrl.items.length} of {ctrl.allItems.length} items
          </Text>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <DetailModal
        visible={ctrl.detailVisible}
        item={ctrl.selectedItem}
        onClose={ctrl.closeDetail}
        responseText={ctrl.responseText}
        setResponseText={ctrl.setResponseText}
        adminNotesText={ctrl.adminNotesText}
        setAdminNotesText={ctrl.setAdminNotesText}
        activityLog={ctrl.activityLog}
        submitting={ctrl.submitting}
        onStatusChange={ctrl.handleStatusChange}
        onPriorityChange={ctrl.handlePriorityChange}
        onRespond={ctrl.handleRespond}
        onSaveNotes={ctrl.handleSaveNotes}
        onArchive={ctrl.handleArchive}
        onDelete={ctrl.handleDelete}
        tc={tc}
        width={width}
      />
    </View>
  );
};

export default AdminFeedbackReportsScreen;
