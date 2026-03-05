/**
 * AdminManageLessonsScreen.tsx
 *
 * Professional admin lesson management panel with:
 *  - Stats overview cards
 *  - Tabbed lesson list (All / Published / Draft / Archived)
 *  - Category filter, search, sort
 *  - Lesson card grid with actions
 *  - Create / Edit lesson modal with full form
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
import { useManageLessonsController } from '../../controllers/useManageLessonsController';
import type {
  AdminLesson,
  AdminLessonFormData,
  AdminLessonStatus,
  LessonCategory,
  ManageLessonsTab,
} from '../../models';
import {
  LESSON_CATEGORY_LABELS,
  ADMIN_LESSON_STATUS_LABELS,
} from '../../models';

// ─── Constants ───
const ALL_CATEGORIES: LessonCategory[] = ['conversation', 'pronunciation', 'vocabulary'];
const ALL_DIFFICULTIES: AdminLessonFormData['difficulty'][] = ['Easy', 'Medium', 'Challenging'];
const ALL_STATUSES: AdminLessonStatus[] = ['published', 'draft', 'archived'];
const TABS: { key: ManageLessonsTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'archived', label: 'Archived' },
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

// ─── Color maps ───
const categoryColor = (c: LessonCategory): { bg: string; text: string } => {
  const map: Record<LessonCategory, { bg: string; text: string }> = {
    conversation: { bg: '#9FB2FD22', text: '#6366F1' },
    pronunciation: { bg: '#FEC79C22', text: '#F97316' },
    vocabulary: { bg: '#9DE09D22', text: '#22C55E' },
  };
  return map[c] ?? map.conversation;
};

const categoryIcon = (c: LessonCategory): string => {
  const map: Record<LessonCategory, string> = {
    conversation: 'chatbubbles',
    pronunciation: 'mic',
    vocabulary: 'book',
  };
  return map[c] ?? 'book';
};

const statusColor = (s: AdminLessonStatus, tc: ThemeColors) => {
  const map: Record<AdminLessonStatus, { bg: string; text: string }> = {
    published: { bg: tc.success + '18', text: tc.success },
    draft: { bg: tc.warning + '18', text: tc.warningDeep ?? tc.warning },
    archived: { bg: tc.disabled + '30', text: tc.textLight },
  };
  return map[s] ?? map.draft;
};

const difficultyColor = (d: string, tc: ThemeColors) => {
  if (d === 'Easy') return { bg: tc.success + '15', text: tc.success };
  if (d === 'Challenging') return { bg: tc.error + '15', text: tc.error };
  return { bg: tc.warning + '15', text: tc.warningDeep ?? tc.warning };
};

// ═══════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════

const StatusBadge: React.FC<{ status: AdminLessonStatus; tc: ThemeColors }> = ({ status, tc }) => {
  const c = statusColor(status, tc);
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 }}>
      <Text style={{ fontFamily: fonts.semiBold, fontSize: 11, color: c.text }}>
        {ADMIN_LESSON_STATUS_LABELS[status]}
      </Text>
    </View>
  );
};

const DifficultyBadge: React.FC<{ difficulty: string; tc: ThemeColors }> = ({ difficulty, tc }) => {
  const c = difficultyColor(difficulty, tc);
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: c.text }}>{difficulty}</Text>
    </View>
  );
};

const CategoryBadge: React.FC<{ category: LessonCategory }> = ({ category }) => {
  const c = categoryColor(category);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 }}>
      <Ionicons name={categoryIcon(category) as any} size={12} color={c.text} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: c.text }}>
        {LESSON_CATEGORY_LABELS[category]}
      </Text>
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
    <Text style={{ fontFamily: isSelected ? fonts.semiBold : fonts.medium, fontSize: 12, color: isSelected ? tc.accent : tc.textLight }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════
//  STATS BAR
// ═══════════════════════════════════════════════
const StatsBar: React.FC<{ stats: any; tc: ThemeColors; isWide: boolean }> = ({ stats, tc, isWide }) => {
  const cards = [
    { label: 'Total Lessons', value: stats.total, icon: 'book', color: tc.accent },
    { label: 'Published', value: stats.published, icon: 'checkmark-circle', color: tc.success },
    { label: 'Drafts', value: stats.draft, icon: 'create', color: tc.warningDeep ?? tc.warning },
    { label: 'Enrolled Users', value: stats.totalEnrolled, icon: 'people', color: '#8B5CF6' },
    { label: 'Completed', value: stats.totalCompleted, icon: 'trophy', color: '#F97316' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
      {cards.map((c) => (
        <View
          key={c.label}
          style={{
            flex: isWide ? 1 : undefined,
            width: isWide ? undefined : '31%' as any,
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
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>{c.value}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{c.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  LESSON CARD
// ═══════════════════════════════════════════════
const LessonCard: React.FC<{
  lesson: AdminLesson;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, s: AdminLessonStatus) => void;
  onDuplicate: () => void;
  submitting: boolean;
  tc: ThemeColors;
  isWide: boolean;
}> = ({ lesson, onEdit, onDelete, onStatusChange, onDuplicate, submitting, tc, isWide }) => {
  const [showActions, setShowActions] = useState(false);
  const catColor = categoryColor(lesson.category);

  return (
    <View
      style={{
        backgroundColor: tc.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: tc.cardBorder,
        overflow: 'hidden',
      }}
    >
      {/* Category color bar */}
      <View style={{ height: 4, backgroundColor: catColor.text }} />

      <View style={{ padding: 16 }}>
        {/* Top: badges */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <CategoryBadge category={lesson.category} />
            <DifficultyBadge difficulty={lesson.difficulty} tc={tc} />
            <StatusBadge status={lesson.status} tc={tc} />
          </View>
          {/* Actions dropdown */}
          <View style={{ position: 'relative' as any }}>
            <TouchableOpacity
              onPress={() => setShowActions(!showActions)}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: tc.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={tc.textLight} />
            </TouchableOpacity>
            {showActions && (
              <View
                style={{
                  position: 'absolute' as any,
                  top: 34,
                  right: 0,
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
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => { setShowActions(false); onEdit(); }}
                >
                  <Ionicons name="create-outline" size={16} color={tc.accent} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => { setShowActions(false); onDuplicate(); }}
                  disabled={submitting}
                >
                  <Ionicons name="copy-outline" size={16} color={tc.textLight} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Duplicate</Text>
                </TouchableOpacity>
                {lesson.status !== 'published' && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                    onPress={() => { setShowActions(false); onStatusChange(lesson.id, 'published'); }}
                    disabled={submitting}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={tc.success} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Publish</Text>
                  </TouchableOpacity>
                )}
                {lesson.status === 'published' && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                    onPress={() => { setShowActions(false); onStatusChange(lesson.id, 'draft'); }}
                    disabled={submitting}
                  >
                    <Ionicons name="create-outline" size={16} color={tc.warningDeep ?? tc.warning} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Unpublish</Text>
                  </TouchableOpacity>
                )}
                {lesson.status !== 'archived' && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                    onPress={() => { setShowActions(false); onStatusChange(lesson.id, 'archived'); }}
                    disabled={submitting}
                  >
                    <Ionicons name="archive-outline" size={16} color={tc.textMuted} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>Archive</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 1, backgroundColor: tc.divider }} />
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                  onPress={() => {
                    setShowActions(false);
                    webConfirm('Delete Lesson', `Permanently delete "${lesson.title}"? This cannot be undone.`, onDelete);
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

        {/* Title */}
        <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: tc.text, marginBottom: 4 }} numberOfLines={2}>
          {lesson.title}
        </Text>

        {/* Description */}
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textLight, lineHeight: 19, marginBottom: 12 }} numberOfLines={2}>
          {lesson.description}
        </Text>

        {/* Order badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <Ionicons name="reorder-three" size={14} color={tc.textMuted} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.textMuted }}>Order: {lesson.order}</Text>
        </View>

        {/* Metrics row */}
        <View style={{ flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tc.divider }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people-outline" size={14} color={tc.textMuted} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>
              {lesson.enrolledCount} enrolled
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-done-outline" size={14} color={tc.textMuted} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>
              {lesson.completedCount} completed
            </Text>
          </View>
          {lesson.category === 'vocabulary' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="layers-outline" size={14} color={tc.textMuted} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>
                {lesson.vocabPairCount} pairs
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>
            Updated {timeAgo(lesson.updatedAt)}
          </Text>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: tc.accent + '10',
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color={tc.accent} />
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: tc.accent }}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  LESSON FORM MODAL
// ═══════════════════════════════════════════════
const LessonFormModal: React.FC<{
  visible: boolean;
  isEditing: boolean;
  formData: AdminLessonFormData;
  updateField: <K extends keyof AdminLessonFormData>(key: K, val: AdminLessonFormData[K]) => void;
  focusTipInput: string;
  setFocusTipInput: (v: string) => void;
  addFocusTip: () => void;
  removeFocusTip: (i: number) => void;
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
  tc: ThemeColors;
}> = ({ visible, isEditing, formData, updateField, focusTipInput, setFocusTipInput, addFocusTip, removeFocusTip, onSave, onClose, submitting, tc }) => {
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
            maxWidth: 620,
            maxHeight: '92%' as any,
            ...(Platform.OS === 'web'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 30 }
              : {}),
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tc.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tc.accent + '15', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={isEditing ? 'create' : 'add-circle'} size={20} color={tc.accent} />
              </View>
              <View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: tc.text }}>
                  {isEditing ? 'Edit Lesson' : 'Create Lesson'}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                  {isEditing ? 'Update lesson details' : 'Add a new lesson to the curriculum'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 24, maxHeight: 500 }} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={labelStyle}>Title *</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. Café Conversation"
              placeholderTextColor={tc.textMuted}
              value={formData.title}
              onChangeText={(v) => updateField('title', v)}
            />

            {/* Short Description */}
            <Text style={labelStyle}>Short Description</Text>
            <TextInput
              style={{ ...inputStyle, minHeight: 60, textAlignVertical: 'top' }}
              placeholder="Brief summary shown in lesson cards…"
              placeholderTextColor={tc.textMuted}
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              multiline
            />

            {/* Full Description */}
            <Text style={labelStyle}>Full Description</Text>
            <TextInput
              style={{ ...inputStyle, minHeight: 100, textAlignVertical: 'top' }}
              placeholder="Detailed description shown on the lesson detail page…"
              placeholderTextColor={tc.textMuted}
              value={formData.fullDescription}
              onChangeText={(v) => updateField('fullDescription', v)}
              multiline
            />

            {/* Category + Difficulty row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_CATEGORIES.map((cat) => {
                    const selected = formData.category === cat;
                    const cc = categoryColor(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => updateField('category', cat)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingVertical: 7,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: selected ? cc.text : tc.cardBorder,
                          backgroundColor: selected ? cc.bg : 'transparent',
                        }}
                      >
                        <Ionicons name={categoryIcon(cat) as any} size={14} color={selected ? cc.text : tc.textLight} />
                        <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? cc.text : tc.textLight }}>
                          {LESSON_CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Difficulty */}
            <Text style={labelStyle}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {ALL_DIFFICULTIES.map((diff) => {
                const selected = formData.difficulty === diff;
                const dc = difficultyColor(diff, tc);
                return (
                  <TouchableOpacity
                    key={diff}
                    onPress={() => updateField('difficulty', diff)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: selected ? dc.text : tc.cardBorder,
                      backgroundColor: selected ? dc.bg : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? dc.text : tc.textLight }}>
                      {diff}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status */}
            <Text style={labelStyle}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {ALL_STATUSES.map((s) => {
                const selected = formData.status === s;
                const sc = statusColor(s, tc);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => updateField('status', s)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: selected ? sc.text : tc.cardBorder,
                      backgroundColor: selected ? sc.bg : 'transparent',
                    }}
                  >
                    <Text style={{ fontFamily: selected ? fonts.semiBold : fonts.medium, fontSize: 12, color: selected ? sc.text : tc.textLight }}>
                      {ADMIN_LESSON_STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Order + Image URL row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 90 }}>
                <Text style={labelStyle}>Order</Text>
                <TextInput
                  style={inputStyle}
                  value={String(formData.order)}
                  onChangeText={(v) => updateField('order', parseInt(v, 10) || 0)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Image URL (optional)</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="https://…"
                  placeholderTextColor={tc.textMuted}
                  value={formData.imageUrl}
                  onChangeText={(v) => updateField('imageUrl', v)}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Focus Tips */}
            <Text style={labelStyle}>Focus Tips</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                placeholder="Add a focus tip…"
                placeholderTextColor={tc.textMuted}
                value={focusTipInput}
                onChangeText={setFocusTipInput}
                onSubmitEditing={addFocusTip}
              />
              <TouchableOpacity
                onPress={addFocusTip}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: tc.accent,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: !focusTipInput.trim() ? 0.4 : 1,
                }}
                disabled={!focusTipInput.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={tc.white} />
              </TouchableOpacity>
            </View>
            {formData.focusTips.length > 0 && (
              <View style={{ gap: 6, marginBottom: 16 }}>
                {formData.focusTips.map((tip, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: tc.surfaceAlt,
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Ionicons name="bulb-outline" size={14} color={tc.accent} style={{ marginRight: 8 }} />
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.text, flex: 1 }}>{tip}</Text>
                    <TouchableOpacity onPress={() => removeFocusTip(idx)}>
                      <Ionicons name="close-circle" size={18} color={tc.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: tc.divider }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: tc.cardBorder, alignItems: 'center' }}
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
                opacity: !formData.title.trim() || submitting ? 0.5 : 1,
              }}
              onPress={onSave}
              disabled={!formData.title.trim() || submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color={tc.white} size="small" />
              ) : (
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>
                  {isEditing ? 'Save Changes' : 'Create Lesson'}
                </Text>
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
const AdminManageLessonsScreen: React.FC = () => {
  const { colors: tc, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const ctrl = useManageLessonsController();
  const isWide = width >= 900;
  const isDesktop = width >= 1100;

  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Grid columns based on width
  const columns = isDesktop ? 3 : isWide ? 2 : 1;

  if (ctrl.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tc.background }}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: tc.textLight, marginTop: 12 }}>
          Loading lessons…
        </Text>
      </View>
    );
  }

  // Split lessons into rows for grid
  const rows: AdminLesson[][] = [];
  for (let i = 0; i < ctrl.lessons.length; i += columns) {
    rows.push(ctrl.lessons.slice(i, i + columns));
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
              Manage Lessons
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: tc.textMuted, marginTop: 4 }}>
              Create, edit, and organize your curriculum
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: tc.surfaceAlt, paddingVertical: 9, paddingHorizontal: 16,
                borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder,
              }}
              onPress={ctrl.refresh}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={18} color={tc.accent} />
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.accent }}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: tc.accent, paddingVertical: 10, paddingHorizontal: 18,
                borderRadius: 12,
              }}
              onPress={ctrl.openCreateForm}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={18} color={tc.white} />
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.white }}>New Lesson</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Error ── */}
        {ctrl.error && (
          <View style={{ backgroundColor: tc.errorBg, borderRadius: 10, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="alert-circle" size={20} color={tc.error} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.error, flex: 1 }}>{ctrl.error}</Text>
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
            flexDirection: 'row', backgroundColor: tc.white, borderRadius: 12, padding: 4,
            borderWidth: 1, borderColor: tc.cardBorder, marginBottom: 16, alignSelf: 'flex-start' as const,
          }}
        >
          {TABS.map((tab) => {
            const isActive = ctrl.activeTab === tab.key;
            const count = tab.key === 'all'
              ? ctrl.allLessons.length
              : ctrl.allLessons.filter((l) => l.status === tab.key).length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => ctrl.setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
                  backgroundColor: isActive ? tc.accent : 'transparent',
                }}
              >
                <Text style={{ fontFamily: isActive ? fonts.semiBold : fonts.medium, fontSize: 13, color: isActive ? tc.white : tc.textLight }}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={{ backgroundColor: isActive ? tc.white + '30' : tc.accent + '18', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: isActive ? tc.white : tc.accent }}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Filters ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {/* Search */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: tc.white,
              borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder,
              paddingHorizontal: 12, height: 40, flex: isWide ? undefined : 1, width: isWide ? 280 : undefined,
            }}
          >
            <Ionicons name="search" size={16} color={tc.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={{
                flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tc.text,
                ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
              }}
              placeholder="Search lessons…"
              placeholderTextColor={tc.textMuted}
              value={ctrl.searchQuery}
              onChangeText={ctrl.setSearchQuery}
            />
          </View>

          {/* Category dropdown */}
          <View style={{ position: 'relative' as any }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
                borderWidth: 1,
                borderColor: ctrl.categoryFilter !== 'all' ? tc.accent : tc.cardBorder,
                backgroundColor: ctrl.categoryFilter !== 'all' ? tc.accent + '08' : tc.white,
              }}
              onPress={() => setShowCategoryFilter(!showCategoryFilter)}
              activeOpacity={0.7}
            >
              <Ionicons name="funnel-outline" size={14} color={ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: ctrl.categoryFilter !== 'all' ? tc.accent : tc.textLight }}>
                {ctrl.categoryFilter === 'all' ? 'Category' : LESSON_CATEGORY_LABELS[ctrl.categoryFilter]}
              </Text>
              <Ionicons name="chevron-down" size={14} color={tc.textMuted} />
            </TouchableOpacity>
            {showCategoryFilter && (
              <View
                style={{
                  position: 'absolute' as any, top: 44, left: 0, backgroundColor: tc.white,
                  borderRadius: 10, borderWidth: 1, borderColor: tc.cardBorder, zIndex: 100, minWidth: 180,
                  ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}),
                }}
              >
                <TouchableOpacity
                  style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }}
                  onPress={() => { ctrl.setCategoryFilter('all'); setShowCategoryFilter(false); }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === 'all' ? tc.accent : tc.text }}>All Categories</Text>
                </TouchableOpacity>
                {ALL_CATEGORIES.map((cat) => {
                  const cc = categoryColor(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14 }}
                      onPress={() => { ctrl.setCategoryFilter(cat); setShowCategoryFilter(false); }}
                    >
                      <Ionicons name={categoryIcon(cat) as any} size={16} color={ctrl.categoryFilter === cat ? tc.accent : cc.text} />
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: ctrl.categoryFilter === cat ? tc.accent : tc.text }}>
                        {LESSON_CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Sort chips */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([
              { key: 'order', label: 'Order' },
              { key: 'newest', label: 'Newest' },
              { key: 'title', label: 'A–Z' },
              { key: 'enrolled', label: 'Popular' },
            ] as const).map((s) => (
              <FilterChip
                key={s.key}
                label={s.label}
                isSelected={ctrl.sortBy === s.key}
                onPress={() => ctrl.setSortBy(s.key)}
                tc={tc}
              />
            ))}
          </View>
        </View>

        {/* ── Lesson Grid ── */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
            {row.map((lesson) => (
              <View key={lesson.id} style={{ flex: 1 }}>
                <LessonCard
                  lesson={lesson}
                  onEdit={() => ctrl.openEditForm(lesson)}
                  onDelete={() => ctrl.handleDelete(lesson.id)}
                  onStatusChange={ctrl.handleStatusChange}
                  onDuplicate={() => ctrl.handleDuplicate(lesson.id)}
                  submitting={ctrl.submitting}
                  tc={tc}
                  isWide={isWide}
                />
              </View>
            ))}
            {/* Fill empty cells for even grid */}
            {row.length < columns && Array.from({ length: columns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}

        {ctrl.lessons.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Ionicons name="book-outline" size={56} color={tc.disabled} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: tc.textMuted, marginTop: 14 }}>
              No lessons found
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4 }}>
              {ctrl.searchQuery || ctrl.categoryFilter !== 'all'
                ? 'Try adjusting your filters or search'
                : 'Create your first lesson to get started'}
            </Text>
            {!ctrl.searchQuery && ctrl.categoryFilter === 'all' && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: tc.accent, paddingVertical: 10, paddingHorizontal: 20,
                  borderRadius: 12, marginTop: 20,
                }}
                onPress={ctrl.openCreateForm}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={18} color={tc.white} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: tc.white }}>Create Lesson</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Result count */}
        {ctrl.lessons.length > 0 && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted, marginTop: 4 }}>
            Showing {ctrl.lessons.length} of {ctrl.allLessons.length} lessons
          </Text>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <LessonFormModal
        visible={ctrl.formVisible}
        isEditing={!!ctrl.editingLesson}
        formData={ctrl.formData}
        updateField={ctrl.updateFormField}
        focusTipInput={ctrl.focusTipInput}
        setFocusTipInput={ctrl.setFocusTipInput}
        addFocusTip={ctrl.addFocusTip}
        removeFocusTip={ctrl.removeFocusTip}
        onSave={ctrl.handleSave}
        onClose={ctrl.closeForm}
        submitting={ctrl.submitting}
        tc={tc}
      />
    </View>
  );
};

export default AdminManageLessonsScreen;
