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
  AdminVocabPairForm,
  LessonCategory,
  ManageLessonsTab,
} from '../../models';
import {
  LESSON_CATEGORY_LABELS,
  ADMIN_LESSON_STATUS_LABELS,
  DEFAULT_VOCAB_PAIR,
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
            minWidth: 140,
            backgroundColor: tc.white,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: tc.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            ...(Platform.OS === 'web'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 }
              : {}),
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
        ...(showActions ? { zIndex: 999 } : {}),
        ...(Platform.OS === 'web'
          ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 }
          : {}),
      }}
    >
      {/* Category color bar */}
      <View style={{ height: 4, backgroundColor: catColor.text, borderTopLeftRadius: 13, borderTopRightRadius: 13 }} />

      <View style={{ padding: 16 }}>
        {/* Top: badges */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <CategoryBadge category={lesson.category} />
            <DifficultyBadge difficulty={lesson.difficulty} tc={tc} />
            <StatusBadge status={lesson.status} tc={tc} />
          </View>
          {/* Actions dropdown */}
          <View style={{ position: 'relative' as any, zIndex: showActions ? 50 : undefined }}>
            <TouchableOpacity
              onPress={() => setShowActions(!showActions)}
              style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: showActions ? tc.accent + '12' : tc.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={showActions ? tc.accent : tc.textLight} />
            </TouchableOpacity>
            {showActions && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowActions(false)}
                style={{ position: 'absolute' as any, top: -200, left: -500, width: 5000, height: 5000, zIndex: 99 }}
              />
            )}
            {showActions && (
              <View
                style={{
                  position: 'absolute' as any,
                  top: 36,
                  right: 0,
                  backgroundColor: tc.white,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: tc.cardBorder,
                  zIndex: 100,
                  minWidth: 170,
                  ...(Platform.OS === 'web'
                    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 }
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

        {/* Order + Level + Duration row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="reorder-three" size={14} color={tc.textMuted} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.textMuted }}>Order: {lesson.order}</Text>
          </View>
          {(lesson.level ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="flag" size={12} color={tc.accent} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.accent }}>Level {lesson.level}</Text>
            </View>
          )}
          {(lesson.estimatedMinutes ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color={tc.textMuted} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: tc.textMuted }}>{lesson.estimatedMinutes}m</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {(lesson.tags ?? []).length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {lesson.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={{ backgroundColor: tc.accent + '10', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: tc.accent }}>{tag}</Text>
              </View>
            ))}
            {lesson.tags.length > 3 && (
              <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: tc.textMuted }}>+{lesson.tags.length - 3}</Text>
            )}
          </View>
        )}

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
//  VOCAB PAIR ROW (used inside form)
// ═══════════════════════════════════════════════
const VocabPairRow: React.FC<{
  pair: AdminVocabPairForm;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  tc: ThemeColors;
}> = ({ pair, index, onEdit, onRemove, tc }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: tc.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    }}
  >
    {/* Number */}
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tc.accent + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: tc.accent }}>{index + 1}</Text>
    </View>
    {/* Words */}
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>{pair.basicWord}</Text>
        <Ionicons name="arrow-forward" size={14} color={tc.accent} />
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.accent }}>{pair.vocabWord}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {pair.basicPhonetic ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>/{pair.basicPhonetic}/</Text>
        ) : null}
        {pair.vocabPhonetic ? (
          <>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>→</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>/{pair.vocabPhonetic}/</Text>
          </>
        ) : null}
      </View>
      {pair.exampleSentence ? (
        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textLight, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
          "{pair.exampleSentence}"
        </Text>
      ) : null}
    </View>
    {/* Actions */}
    <TouchableOpacity onPress={onEdit} style={{ padding: 6 }}>
      <Ionicons name="create-outline" size={18} color={tc.accent} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onRemove} style={{ padding: 6 }}>
      <Ionicons name="trash-outline" size={18} color={tc.error} />
    </TouchableOpacity>
  </View>
);

// ═══════════════════════════════════════════════
//  VOCAB PAIR FORM (inline form for add/edit pair)
// ═══════════════════════════════════════════════
const VocabPairFormInline: React.FC<{
  data: AdminVocabPairForm;
  updateField: <K extends keyof AdminVocabPairForm>(key: K, val: AdminVocabPairForm[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  tc: ThemeColors;
}> = ({ data, updateField, onSave, onCancel, isEditing, tc }) => {
  const inputStyle = {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.text,
    borderWidth: 1,
    borderColor: tc.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tc.inputBg,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  };
  const labelStyle = { fontFamily: fonts.medium, fontSize: 12, color: tc.text, marginBottom: 4 };
  const canSave = data.basicWord.trim() && data.vocabWord.trim();

  return (
    <View style={{ backgroundColor: tc.white, borderRadius: 14, borderWidth: 1.5, borderColor: tc.accent + '40', padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Ionicons name={isEditing ? 'create' : 'add-circle'} size={18} color={tc.accent} />
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>
          {isEditing ? 'Edit Word Pair' : 'Add Word Pair'}
        </Text>
      </View>

      {/* Basic Word + Vocab Word row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Basic Word *</Text>
          <TextInput style={inputStyle} placeholder="e.g. Help" placeholderTextColor={tc.textMuted} value={data.basicWord} onChangeText={(v) => updateField('basicWord', v)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Vocab Word *</Text>
          <TextInput style={inputStyle} placeholder="e.g. Assist" placeholderTextColor={tc.textMuted} value={data.vocabWord} onChangeText={(v) => updateField('vocabWord', v)} />
        </View>
      </View>

      {/* Phonetics row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Basic Phonetic</Text>
          <TextInput style={inputStyle} placeholder="e.g. help" placeholderTextColor={tc.textMuted} value={data.basicPhonetic} onChangeText={(v) => updateField('basicPhonetic', v)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Vocab Phonetic</Text>
          <TextInput style={inputStyle} placeholder="e.g. uh-sist" placeholderTextColor={tc.textMuted} value={data.vocabPhonetic} onChangeText={(v) => updateField('vocabPhonetic', v)} />
        </View>
      </View>

      {/* Definitions row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Basic Definition</Text>
          <TextInput style={{ ...inputStyle, minHeight: 56, textAlignVertical: 'top' }} placeholder="Definition of the basic word…" placeholderTextColor={tc.textMuted} value={data.basicDefinition} onChangeText={(v) => updateField('basicDefinition', v)} multiline />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Vocab Definition</Text>
          <TextInput style={{ ...inputStyle, minHeight: 56, textAlignVertical: 'top' }} placeholder="Definition of the vocab word…" placeholderTextColor={tc.textMuted} value={data.vocabDefinition} onChangeText={(v) => updateField('vocabDefinition', v)} multiline />
        </View>
      </View>

      {/* Example Sentence */}
      <Text style={labelStyle}>Example Sentence (optional)</Text>
      <TextInput style={{ ...inputStyle, marginBottom: 14 }} placeholder="Use both words in a sentence…" placeholderTextColor={tc.textMuted} value={data.exampleSentence} onChangeText={(v) => updateField('exampleSentence', v)} />

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: tc.cardBorder }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.textLight }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: tc.accent, opacity: canSave ? 1 : 0.4 }}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: tc.white }}>
            {isEditing ? 'Update Pair' : 'Add Pair'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  LESSON FORM MODAL (multi-step: Details + Vocab Pairs)
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
  tagInput: string;
  setTagInput: (v: string) => void;
  addTag: () => void;
  removeTag: (i: number) => void;
  addPrerequisite: (id: string) => void;
  removePrerequisite: (i: number) => void;
  allLessons: { id: string; title: string }[];
  onSave: () => void;
  onClose: () => void;
  submitting: boolean;
  tc: ThemeColors;
  // Form step
  formStep: 'details' | 'vocabPairs';
  setFormStep: (s: 'details' | 'vocabPairs') => void;
  // Vocab pair management
  loadingPairs: boolean;
  pairFormVisible: boolean;
  pairFormData: AdminVocabPairForm;
  editingPairIndex: number | null;
  openAddPairForm: () => void;
  openEditPairForm: (i: number) => void;
  closePairForm: () => void;
  updatePairField: <K extends keyof AdminVocabPairForm>(key: K, val: AdminVocabPairForm[K]) => void;
  savePair: () => void;
  removePair: (i: number) => void;
}> = ({
  visible, isEditing, formData, updateField, focusTipInput, setFocusTipInput,
  addFocusTip, removeFocusTip, tagInput, setTagInput, addTag, removeTag,
  addPrerequisite, removePrerequisite, allLessons,
  onSave, onClose, submitting, tc,
  formStep, setFormStep,
  loadingPairs, pairFormVisible, pairFormData, editingPairIndex,
  openAddPairForm, openEditPairForm, closePairForm, updatePairField, savePair, removePair,
}) => {
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

  const isVocabCategory = formData.category === 'vocabulary';

  const [prerequisiteInput, setPrerequisiteInput] = useState('');
  const [showPrereqDropdown, setShowPrereqDropdown] = useState(false);
  const availablePrereqs = allLessons.filter(
    (l) => !formData.prerequisites.includes(l.id) && l.id !== (isEditing ? allLessons.find((x) => x.title === formData.title)?.id : ''),
  );

  const SectionHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: tc.divider }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tc.accent + '12', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={14} color={tc.accent} />
      </View>
      <View>
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>{title}</Text>
        {subtitle && <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}>{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: tc.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View
          style={{
            backgroundColor: tc.white,
            borderRadius: 18,
            width: '100%',
            maxWidth: 700,
            maxHeight: '94%' as any,
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
                  {formStep === 'details'
                    ? (isEditing ? 'Update lesson details' : 'Add a new lesson to the curriculum')
                    : `Manage vocabulary word pairs (${formData.vocabPairs.length} pairs)`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={tc.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Step indicator (only show for vocab category) */}
          {isVocabCategory && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, gap: 8 }}>
              {(['details', 'vocabPairs'] as const).map((step, idx) => {
                const isActive = formStep === step;
                const stepLabel = idx === 0 ? 'Lesson Details' : 'Word Pairs';
                const stepIcon = idx === 0 ? 'document-text' : 'layers';
                return (
                  <TouchableOpacity
                    key={step}
                    onPress={() => setFormStep(step)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isActive ? tc.accent + '12' : tc.surfaceAlt,
                      borderWidth: 1.5,
                      borderColor: isActive ? tc.accent : tc.cardBorder,
                    }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isActive ? tc.accent : tc.disabled, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: tc.white }}>{idx + 1}</Text>
                    </View>
                    <Ionicons name={stepIcon as any} size={16} color={isActive ? tc.accent : tc.textMuted} />
                    <Text style={{ fontFamily: isActive ? fonts.semiBold : fonts.medium, fontSize: 13, color: isActive ? tc.accent : tc.textLight }}>
                      {stepLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <ScrollView style={{ padding: 24, maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            {/* ═══ STEP 1: DETAILS ═══ */}
            {formStep === 'details' && (
              <>
                {/* ── SECTION: Basic Information ── */}
                <SectionHeader icon="document-text" title="Basic Information" subtitle="Core lesson details" />

                {/* Title */}
                <Text style={labelStyle}>Title <Text style={{ color: tc.error }}>*</Text></Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Vocabulary Growth"
                  placeholderTextColor={tc.textMuted}
                  value={formData.title}
                  onChangeText={(v) => updateField('title', v)}
                />

                {/* Short Description */}
                <Text style={labelStyle}>Short Description <Text style={{ color: tc.error }}>*</Text></Text>
                <TextInput
                  style={{ ...inputStyle, minHeight: 60, textAlignVertical: 'top' }}
                  placeholder="Brief summary shown on lesson cards…"
                  placeholderTextColor={tc.textMuted}
                  value={formData.description}
                  onChangeText={(v) => updateField('description', v)}
                  multiline
                />

                {/* Full Description (shown on intro screen) */}
                <Text style={labelStyle}>
                  Full Description
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (shown on intro screen)</Text>
                </Text>
                <TextInput
                  style={{ ...inputStyle, minHeight: 100, textAlignVertical: 'top' }}
                  placeholder="Expand your vocabulary with the AI tutor. Learn new words, understand their meanings, and practice using them in real-life sentences."
                  placeholderTextColor={tc.textMuted}
                  value={formData.fullDescription}
                  onChangeText={(v) => updateField('fullDescription', v)}
                  multiline
                />

                {/* ── SECTION: Classification ── */}
                <SectionHeader icon="grid" title="Classification" subtitle="Category, difficulty, and level" />

                {/* Category */}
                <Text style={labelStyle}>Category <Text style={{ color: tc.error }}>*</Text></Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
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

                {/* Level + Order row */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 0 }}>
                  <View style={{ width: 100 }}>
                    <Text style={labelStyle}>Level</Text>
                    <TextInput
                      style={inputStyle}
                      value={String(formData.level)}
                      onChangeText={(v) => updateField('level', parseInt(v, 10) || 1)}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={tc.textMuted}
                    />
                  </View>
                  <View style={{ width: 100 }}>
                    <Text style={labelStyle}>Order</Text>
                    <TextInput
                      style={inputStyle}
                      value={String(formData.order)}
                      onChangeText={(v) => updateField('order', parseInt(v, 10) || 0)}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>Est. Duration (min)</Text>
                    <TextInput
                      style={inputStyle}
                      value={String(formData.estimatedMinutes)}
                      onChangeText={(v) => updateField('estimatedMinutes', parseInt(v, 10) || 0)}
                      keyboardType="number-pad"
                      placeholder="15"
                      placeholderTextColor={tc.textMuted}
                    />
                  </View>
                </View>

                {/* ── SECTION: Status & Scoring ── */}
                <SectionHeader icon="settings" title="Status & Scoring" subtitle="Publishing state and passing criteria" />

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

                {/* Passing Score + Max Attempts row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>
                      Passing Score
                      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (0–100)</Text>
                    </Text>
                    <TextInput
                      style={inputStyle}
                      value={String(formData.passingScore)}
                      onChangeText={(v) => {
                        const n = parseInt(v, 10);
                        updateField('passingScore', isNaN(n) ? 0 : Math.min(100, Math.max(0, n)));
                      }}
                      keyboardType="number-pad"
                      placeholder="70"
                      placeholderTextColor={tc.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={labelStyle}>
                      Max Attempts
                      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (0 = unlimited)</Text>
                    </Text>
                    <TextInput
                      style={inputStyle}
                      value={String(formData.maxAttempts)}
                      onChangeText={(v) => updateField('maxAttempts', parseInt(v, 10) || 0)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={tc.textMuted}
                    />
                  </View>
                </View>

                {/* ── SECTION: Media & Images ── */}
                <SectionHeader icon="image" title="Media" subtitle="Lesson images and illustrations" />

                {/* Intro Image URL */}
                <Text style={labelStyle}>
                  Intro Image URL
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (shown on lesson detail/intro page)</Text>
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="https://example.com/lesson-illustration.png"
                  placeholderTextColor={tc.textMuted}
                  value={formData.imageUrl}
                  onChangeText={(v) => updateField('imageUrl', v)}
                  autoCapitalize="none"
                />

                {/* Completion Image URL */}
                <Text style={labelStyle}>
                  Completion Image URL
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (celebration screen after finishing)</Text>
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="https://example.com/celebration.png"
                  placeholderTextColor={tc.textMuted}
                  value={formData.completionImageUrl}
                  onChangeText={(v) => updateField('completionImageUrl', v)}
                  autoCapitalize="none"
                />

                {/* ── SECTION: Focus Tips ── */}
                <SectionHeader icon="bulb" title="Focus Tips" subtitle="Study tips shown on the intro screen" />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                    placeholder="e.g. Focus on Context"
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
                  <View style={{ gap: 6, marginBottom: 8 }}>
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

                {/* ── SECTION: Tags ── */}
                <SectionHeader icon="pricetags" title="Tags" subtitle="Keywords for organization and search" />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                    placeholder="e.g. beginner, pronunciation, daily"
                    placeholderTextColor={tc.textMuted}
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                  />
                  <TouchableOpacity
                    onPress={addTag}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: tc.accent,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: !tagInput.trim() ? 0.4 : 1,
                    }}
                    disabled={!tagInput.trim()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={22} color={tc.white} />
                  </TouchableOpacity>
                </View>
                {formData.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {formData.tags.map((tag, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: tc.accent + '12',
                          borderRadius: 16,
                          paddingVertical: 5,
                          paddingLeft: 10,
                          paddingRight: 6,
                        }}
                      >
                        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.accent }}>{tag}</Text>
                        <TouchableOpacity onPress={() => removeTag(idx)} style={{ padding: 2 }}>
                          <Ionicons name="close-circle" size={16} color={tc.accent} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── SECTION: Completion Screen ── */}
                <SectionHeader icon="trophy" title="Completion Screen" subtitle="What users see after finishing the lesson" />

                <Text style={labelStyle}>
                  Completion Message
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: tc.textMuted }}> (congratulations text)</Text>
                </Text>
                <TextInput
                  style={{ ...inputStyle, minHeight: 70, textAlignVertical: 'top' }}
                  placeholder="Congratulations! You have successfully completed this course. You may attempt again for more practice or proceed to the next level."
                  placeholderTextColor={tc.textMuted}
                  value={formData.completionMessage}
                  onChangeText={(v) => updateField('completionMessage', v)}
                  multiline
                />

                {/* ── SECTION: Prerequisites ── */}
                <SectionHeader icon="git-branch" title="Prerequisites" subtitle="Lessons that must be completed first" />
                <View style={{ position: 'relative' as any, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setShowPrereqDropdown(!showPrereqDropdown)}
                      activeOpacity={0.7}
                      style={{
                        ...inputStyle,
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 0,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted }}>
                        {availablePrereqs.length > 0 ? 'Select a prerequisite lesson…' : 'No other lessons available'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={tc.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {showPrereqDropdown && availablePrereqs.length > 0 && (
                    <View
                      style={{
                        position: 'absolute' as any,
                        top: 48,
                        left: 0,
                        right: 0,
                        backgroundColor: tc.white,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: tc.cardBorder,
                        zIndex: 200,
                        maxHeight: 180,
                        ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}),
                      }}
                    >
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                        {availablePrereqs.map((lesson) => (
                          <TouchableOpacity
                            key={lesson.id}
                            style={{ paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: tc.divider }}
                            onPress={() => {
                              addPrerequisite(lesson.id);
                              setShowPrereqDropdown(false);
                            }}
                          >
                            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>{lesson.title}</Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: tc.textMuted }}>{lesson.id}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                {formData.prerequisites.length > 0 && (
                  <View style={{ gap: 6, marginBottom: 8 }}>
                    {formData.prerequisites.map((prereqId, idx) => {
                      const prereqLesson = allLessons.find((l) => l.id === prereqId);
                      return (
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
                          <Ionicons name="git-branch-outline" size={14} color={tc.accent} style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.text }}>
                              {prereqLesson ? prereqLesson.title : prereqId}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => removePrerequisite(idx)}>
                            <Ionicons name="close-circle" size={18} color={tc.error} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Vocab pairs summary nudge (for vocabulary category) */}
                {isVocabCategory && (
                  <TouchableOpacity
                    onPress={() => setFormStep('vocabPairs')}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: '#9DE09D12',
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#22C55E40',
                      marginTop: 16,
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#22C55E18', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="layers" size={18} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, color: tc.text }}>
                        Vocabulary Word Pairs
                      </Text>
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textMuted }}>
                        {formData.vocabPairs.length > 0
                          ? `${formData.vocabPairs.length} pair${formData.vocabPairs.length !== 1 ? 's' : ''} configured — tap to manage`
                          : 'No pairs yet — tap to add word pairs'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={tc.accent} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ═══ STEP 2: VOCAB PAIRS ═══ */}
            {formStep === 'vocabPairs' && (
              <>
                {/* Loading state */}
                {loadingPairs && (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <ActivityIndicator size="small" color={tc.accent} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.textMuted, marginTop: 8 }}>
                      Loading word pairs…
                    </Text>
                  </View>
                )}

                {/* Info banner */}
                {!loadingPairs && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: tc.accent + '08',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: tc.accent + '20',
                    }}
                  >
                    <Ionicons name="information-circle" size={20} color={tc.accent} />
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: tc.textLight, flex: 1 }}>
                      Each word pair consists of a basic word and its advanced vocabulary equivalent.
                      Users will practice pronouncing both and learn definitions.
                    </Text>
                  </View>
                )}

                {/* Add pair button */}
                {!loadingPairs && !pairFormVisible && (
                  <TouchableOpacity
                    onPress={openAddPairForm}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderStyle: 'dashed' as any,
                      borderColor: tc.accent + '60',
                      backgroundColor: tc.accent + '06',
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="add-circle" size={20} color={tc.accent} />
                    <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.accent }}>
                      Add Word Pair
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Inline pair form */}
                {pairFormVisible && (
                  <VocabPairFormInline
                    data={pairFormData}
                    updateField={updatePairField}
                    onSave={savePair}
                    onCancel={closePairForm}
                    isEditing={editingPairIndex !== null}
                    tc={tc}
                  />
                )}

                {/* Existing pairs list */}
                {!loadingPairs && formData.vocabPairs.length > 0 && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.text }}>
                        Word Pairs ({formData.vocabPairs.length})
                      </Text>
                    </View>
                    {formData.vocabPairs.map((pair, idx) => (
                      <VocabPairRow
                        key={pair.id || idx}
                        pair={pair}
                        index={idx}
                        onEdit={() => openEditPairForm(idx)}
                        onRemove={() => removePair(idx)}
                        tc={tc}
                      />
                    ))}
                  </View>
                )}

                {/* Empty state */}
                {!loadingPairs && formData.vocabPairs.length === 0 && !pairFormVisible && (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Ionicons name="layers-outline" size={48} color={tc.disabled} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: tc.textMuted, marginTop: 12 }}>
                      No word pairs yet
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 4, textAlign: 'center' }}>
                      Add vocabulary word pairs for students to practice pronunciation and learn definitions
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 12, padding: 24, borderTopWidth: 1, borderTopColor: tc.divider }}>
            {/* Back button (on vocab step) */}
            {formStep === 'vocabPairs' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: tc.cardBorder }}
                onPress={() => setFormStep('details')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color={tc.textLight} />
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.textLight }}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: tc.cardBorder, alignItems: 'center' }}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.textLight }}>Cancel</Text>
            </TouchableOpacity>

            {/* Next step button (on details step for vocab category) */}
            {formStep === 'details' && isVocabCategory && (
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: tc.accent + '15',
                  borderWidth: 1.5,
                  borderColor: tc.accent,
                }}
                onPress={() => setFormStep('vocabPairs')}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, color: tc.accent }}>Word Pairs</Text>
                <Ionicons name="arrow-forward" size={16} color={tc.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: tc.accent,
                alignItems: 'center',
                opacity: !formData.title.trim() || !formData.description.trim() || submitting ? 0.5 : 1,
              }}
              onPress={onSave}
              disabled={!formData.title.trim() || !formData.description.trim() || submitting}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: tc.accent + '12', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="library" size={22} color={tc.accent} />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: tc.text }}>
                Manage Lessons
              </Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 2 }}>
                Create, edit, and organize your curriculum
              </Text>
            </View>
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
            borderWidth: 1, borderColor: tc.cardBorder, marginBottom: 18, alignSelf: 'flex-start' as const,
            ...(Platform.OS === 'web'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 }
              : {}),
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap', zIndex: 10, position: 'relative' as any }}>
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
          <View style={{ position: 'relative' as any, zIndex: showCategoryFilter ? 20 : undefined }}>
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
              <Ionicons name={showCategoryFilter ? 'chevron-up' : 'chevron-down'} size={14} color={tc.textMuted} />
            </TouchableOpacity>
            {showCategoryFilter && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowCategoryFilter(false)}
                style={{ position: 'absolute' as any, top: -200, left: -500, width: 5000, height: 5000, zIndex: 99 }}
              />
            )}
            {showCategoryFilter && (
              <View
                style={{
                  position: 'absolute' as any, top: 44, left: 0, backgroundColor: tc.white,
                  borderRadius: 12, borderWidth: 1, borderColor: tc.cardBorder, zIndex: 100, minWidth: 200,
                  ...(Platform.OS === 'web' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 } : {}),
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
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 16, marginBottom: 16, zIndex: rows.length - rowIdx }}>
            {row.map((lesson) => (
              <View key={lesson.id} style={{ flex: 1, zIndex: 1 }}>
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
          <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: tc.white, borderRadius: 16, borderWidth: 1, borderColor: tc.cardBorder, marginTop: 4 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: tc.accent + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <Ionicons name="book-outline" size={34} color={tc.accent} />
            </View>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 17, color: tc.text }}>
              No lessons found
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted, marginTop: 6, textAlign: 'center', maxWidth: 280, lineHeight: 19 }}>
              {ctrl.searchQuery || ctrl.categoryFilter !== 'all'
                ? 'Try adjusting your filters or search query'
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: tc.divider }}>
            <Ionicons name="information-circle-outline" size={14} color={tc.textMuted} style={{ marginRight: 6 }} />
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: tc.textMuted }}>
              Showing {ctrl.lessons.length} of {ctrl.allLessons.length} lessons
            </Text>
          </View>
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
        tagInput={ctrl.tagInput}
        setTagInput={ctrl.setTagInput}
        addTag={ctrl.addTag}
        removeTag={ctrl.removeTag}
        addPrerequisite={ctrl.addPrerequisite}
        removePrerequisite={ctrl.removePrerequisite}
        allLessons={ctrl.allLessons.map((l) => ({ id: l.id, title: l.title }))}
        onSave={ctrl.handleSave}
        onClose={ctrl.closeForm}
        submitting={ctrl.submitting}
        tc={tc}
        formStep={ctrl.formStep}
        setFormStep={ctrl.setFormStep}
        loadingPairs={ctrl.loadingPairs}
        pairFormVisible={ctrl.pairFormVisible}
        pairFormData={ctrl.pairFormData}
        editingPairIndex={ctrl.editingPairIndex}
        openAddPairForm={ctrl.openAddPairForm}
        openEditPairForm={ctrl.openEditPairForm}
        closePairForm={ctrl.closePairForm}
        updatePairField={ctrl.updatePairField}
        savePair={ctrl.savePair}
        removePair={ctrl.removePair}
      />
    </View>
  );
};

export default AdminManageLessonsScreen;
