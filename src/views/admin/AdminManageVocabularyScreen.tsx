/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * AdminManageVocabularyScreen.tsx
 *
 * Admin CRUD over the `vocabularyWords/{wordId}` collection that backs the
 * synonym-typing exercise. Lists words with a CEFR filter + search, lets the
 * admin add / edit / delete entries, and provides a one-click seed action
 * for the curated 300-word default set.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useManageVocabularyController } from '../../controllers';
import type { CefrLevel, VocabularyWord } from '../../models/vocabulary';
import { CEFR_ORDER } from '../../models/vocabulary';

const webConfirm = (title: string, msg: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onOk();
  } else {
    onOk();
  }
};

const StatCards: React.FC<{
  total: number;
  counts: Record<CefrLevel, number>;
  styles: ReturnType<typeof createStyles>;
  tc: ThemeColors;
}> = ({ total, counts, styles, tc }) => (
  <View style={styles.statsRow}>
    <View style={[styles.statCard, { backgroundColor: tc.accentBg }]}>
      <Text style={[styles.statValue, { color: tc.accentDark }]}>{total}</Text>
      <Text style={[styles.statLabel, { color: tc.textLight }]}>Total words</Text>
    </View>
    {CEFR_ORDER.map((l) => (
      <View key={l} style={[styles.statCard, { backgroundColor: tc.surfaceAlt }]}>
        <Text style={[styles.statValue, { color: tc.text }]}>{counts[l]}</Text>
        <Text style={[styles.statLabel, { color: tc.textLight }]}>{l}</Text>
      </View>
    ))}
  </View>
);

const WordRow: React.FC<{
  word: VocabularyWord;
  onEdit: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof createStyles>;
  tc: ThemeColors;
}> = ({ word, onEdit, onDelete, styles, tc }) => (
  <View style={styles.wordRow}>
    <View style={{ flex: 1 }}>
      <View style={styles.wordRowHeader}>
        <Text style={[styles.wordRowWord, { color: tc.text }]}>{word.word}</Text>
        <View style={[styles.cefrBadge, { backgroundColor: tc.accentBg }]}>
          <Text style={[styles.cefrBadgeText, { color: tc.accentDark }]}>{word.cefrLevel}</Text>
        </View>
        <Text style={[styles.posText, { color: tc.textMuted }]}>{word.partOfSpeech}</Text>
      </View>
      <Text style={[styles.synonymsText, { color: tc.textLight }]} numberOfLines={2}>
        Synonyms: {word.acceptableSynonyms.join(', ')}
      </Text>
      <Text style={[styles.definitionText, { color: tc.textMuted }]} numberOfLines={2}>
        {word.definition}
      </Text>
    </View>
    <View style={styles.rowActions}>
      <TouchableOpacity onPress={onEdit} style={styles.iconBtn} accessibilityLabel="Edit word">
        <Ionicons name="pencil" size={18} color={tc.accent} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.iconBtn} accessibilityLabel="Delete word">
        <Ionicons name="trash" size={18} color={tc.error} />
      </TouchableOpacity>
    </View>
  </View>
);

const AdminManageVocabularyScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const navigation = useNavigation<any>();
  const ctrl = useManageVocabularyController();

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tc.text }]}>Vocabulary</Text>
        <TouchableOpacity
          onPress={ctrl.openCreate}
          style={[styles.addBtn, { backgroundColor: tc.accent }]}
          accessibilityLabel="Add new word"
        >
          <Ionicons name="add" size={20} color={tc.textOnAccent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StatCards total={ctrl.totalCount} counts={ctrl.counts} styles={styles} tc={tc} />

        {/* ── Seed action ── */}
        <View
          style={[styles.seedCard, { backgroundColor: tc.surface, borderColor: tc.cardBorder }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.seedTitle, { color: tc.text }]}>Seed default vocabulary</Text>
            <Text style={[styles.seedSub, { color: tc.textLight }]}>
              Uploads 300 curated words (50 × A1–C2). Re-running is safe — same IDs are upserted in
              place.
            </Text>
            {ctrl.seedMessage && (
              <Text
                style={[
                  styles.seedMessage,
                  {
                    color: ctrl.seedMessage.startsWith('Seed failed') ? tc.error : tc.success,
                  },
                ]}
              >
                {ctrl.seedMessage}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={ctrl.seedDefaults}
            disabled={ctrl.seeding}
            style={[styles.seedBtn, { backgroundColor: ctrl.seeding ? tc.disabled : tc.accent }]}
          >
            {ctrl.seeding ? (
              <ActivityIndicator color={tc.textOnAccent} />
            ) : (
              <Text style={[styles.seedBtnText, { color: tc.textOnAccent }]}>Run seed</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Filters ── */}
        <View style={styles.filterRow}>
          <View
            style={[styles.searchBox, { backgroundColor: tc.inputBg, borderColor: tc.inputBorder }]}
          >
            <Ionicons name="search" size={16} color={tc.textMuted} />
            <TextInput
              value={ctrl.search}
              onChangeText={ctrl.setSearch}
              placeholder="Search word or synonym…"
              placeholderTextColor={tc.textMuted}
              style={[styles.searchInput, { color: tc.text }]}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {(['all', ...CEFR_ORDER] as const).map((f) => {
            const active = ctrl.cefrFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => ctrl.setCefrFilter(f)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active ? tc.accent : tc.surface,
                    borderColor: active ? tc.accent : tc.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.tabChipText, { color: active ? tc.textOnAccent : tc.text }]}>
                  {f === 'all' ? 'All' : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Error ── */}
        {ctrl.error && (
          <View
            style={[styles.errorBanner, { backgroundColor: tc.errorBg, borderColor: tc.error }]}
          >
            <Text style={[styles.errorText, { color: tc.error }]}>{ctrl.error}</Text>
            <TouchableOpacity onPress={() => ctrl.setError(null)}>
              <Ionicons name="close" size={18} color={tc.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── List ── */}
        {ctrl.loading ? (
          <ActivityIndicator size="large" color={tc.accent} style={{ marginTop: 32 }} />
        ) : ctrl.filteredWords.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={tc.textMuted} />
            <Text style={[styles.emptyText, { color: tc.textLight }]}>
              {ctrl.totalCount === 0
                ? 'No vocabulary words yet. Tap "Run seed" to load the default set.'
                : 'No words match your filters.'}
            </Text>
          </View>
        ) : (
          ctrl.filteredWords.map((w) => (
            <WordRow
              key={w.id}
              word={w}
              onEdit={() => ctrl.openEdit(w)}
              onDelete={() =>
                webConfirm('Delete word', `Remove "${w.word}"? This cannot be undone.`, () =>
                  ctrl.remove(w.id),
                )
              }
              styles={styles}
              tc={tc}
            />
          ))
        )}
      </ScrollView>

      {/* ── Create / Edit modal ── */}
      <Modal
        visible={ctrl.modalOpen}
        transparent
        animationType="slide"
        onRequestClose={ctrl.closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: tc.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>
                {ctrl.editingWord ? 'Edit word' : 'New word'}
              </Text>
              <TouchableOpacity onPress={ctrl.closeModal}>
                <Ionicons name="close" size={22} color={tc.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <FormField
                label="Word"
                value={ctrl.form.word}
                onChange={(v) => ctrl.updateForm('word', v)}
                placeholder="e.g., happy"
                tc={tc}
                styles={styles}
              />

              <Text style={[styles.fieldLabel, { color: tc.textLight }]}>CEFR level</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
              >
                {CEFR_ORDER.map((l) => {
                  const active = ctrl.form.cefrLevel === l;
                  return (
                    <TouchableOpacity
                      key={l}
                      onPress={() => ctrl.updateForm('cefrLevel', l)}
                      style={[
                        styles.tabChip,
                        {
                          backgroundColor: active ? tc.accent : tc.surfaceAlt,
                          borderColor: active ? tc.accent : tc.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.tabChipText, { color: active ? tc.textOnAccent : tc.text }]}
                      >
                        {l}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FormField
                label="Part of speech"
                value={ctrl.form.partOfSpeech}
                onChange={(v) => ctrl.updateForm('partOfSpeech', v)}
                placeholder="adjective"
                tc={tc}
                styles={styles}
              />
              <FormField
                label="Definition"
                value={ctrl.form.definition}
                onChange={(v) => ctrl.updateForm('definition', v)}
                placeholder="feeling pleasure or contentment"
                multiline
                tc={tc}
                styles={styles}
              />
              <FormField
                label="Acceptable synonyms (comma or new-line separated)"
                value={ctrl.form.acceptableSynonymsText}
                onChange={(v) => ctrl.updateForm('acceptableSynonymsText', v)}
                placeholder="glad, joyful, cheerful, pleased"
                multiline
                tc={tc}
                styles={styles}
              />
              <FormField
                label="Primary synonym (shown on wrong answer)"
                value={ctrl.form.primarySynonym}
                onChange={(v) => ctrl.updateForm('primarySynonym', v)}
                placeholder="glad"
                tc={tc}
                styles={styles}
              />
              <FormField
                label="Example sentence (optional)"
                value={ctrl.form.example}
                onChange={(v) => ctrl.updateForm('example', v)}
                placeholder="She felt happy at her birthday party."
                multiline
                tc={tc}
                styles={styles}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={ctrl.closeModal}
                style={[styles.cancelBtn, { borderColor: tc.cardBorder }]}
              >
                <Text style={{ color: tc.text, fontFamily: fonts.semiBold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={ctrl.save}
                disabled={ctrl.saving}
                style={[styles.saveBtn, { backgroundColor: ctrl.saving ? tc.disabled : tc.accent }]}
              >
                {ctrl.saving ? (
                  <ActivityIndicator color={tc.textOnAccent} />
                ) : (
                  <Text style={{ color: tc.textOnAccent, fontFamily: fonts.semiBold }}>
                    {ctrl.editingWord ? 'Save changes' : 'Create word'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  tc: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, onChange, placeholder, multiline, tc, styles }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={[styles.fieldLabel, { color: tc.textLight }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={tc.textMuted}
      multiline={multiline}
      style={[
        styles.fieldInput,
        {
          backgroundColor: tc.inputBg,
          borderColor: tc.inputBorder,
          color: tc.text,
          minHeight: multiline ? 70 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        },
      ]}
    />
  </View>
);

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: tc.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 20 },
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flexBasis: '14%',
      flexGrow: 1,
      minWidth: 60,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    statValue: { fontFamily: fonts.bold, fontSize: 18 },
    statLabel: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
    seedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
    },
    seedTitle: { fontFamily: fonts.bold, fontSize: 15 },
    seedSub: { fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
    seedMessage: { fontFamily: fonts.medium, fontSize: 12, marginTop: 6 },
    seedBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      minWidth: 90,
      alignItems: 'center',
    },
    seedBtnText: { fontFamily: fonts.semiBold, fontSize: 14 },
    filterRow: { marginBottom: 8 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontFamily: fonts.regular,
      fontSize: 14,
    },
    tabsRow: { flexDirection: 'row', gap: 8, paddingVertical: 8, paddingHorizontal: 2 },
    tabChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    tabChipText: { fontFamily: fonts.semiBold, fontSize: 13 },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    errorText: { fontFamily: fonts.medium, fontSize: 13 },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      marginTop: 12,
      fontFamily: fonts.medium,
      fontSize: 14,
      textAlign: 'center',
      maxWidth: 280,
    },
    wordRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tc.divider,
    },
    wordRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    wordRowWord: { fontFamily: fonts.bold, fontSize: 16 },
    cefrBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    cefrBadgeText: { fontFamily: fonts.semiBold, fontSize: 11 },
    posText: { fontFamily: fonts.regular, fontSize: 11, fontStyle: 'italic' },
    synonymsText: { fontFamily: fonts.regular, fontSize: 13, marginTop: 4 },
    definitionText: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
    rowActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { padding: 8 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: tc.overlay,
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: { fontFamily: fonts.bold, fontSize: 18 },
    fieldLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      marginBottom: 6,
    },
    fieldInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.regular,
      fontSize: 14,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
      borderWidth: 1,
    },
    saveBtn: {
      flex: 2,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
    },
  });

export default AdminManageVocabularyScreen;
