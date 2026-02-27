import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useAnnouncementsController } from '../../controllers';

// ═══════════════════════════════════════════════
//  ADMIN ANNOUNCEMENTS SCREEN
// ═══════════════════════════════════════════════

const AdminAnnouncementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    announcements,
    loading,
    submitting,
    error,
    selectedIds,
    draftBody,
    setDraftBody,
    toggleSelect,
    deleteSelected,
    postAnnouncement,
  } = useAnnouncementsController();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Current Announcements ── */}
        <Text style={styles.sectionTitle}>Current</Text>

        {announcements.length === 0 && (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        )}

        {announcements.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          // Alternate between lighter and darker pill colors
          const isAlternate = index % 2 === 1;

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.announcementPill,
                isAlternate && styles.announcementPillAlt,
                isSelected && styles.announcementPillSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => toggleSelect(item.id)}
            >
              <View style={styles.pillContent}>
                {index === 0 && (
                  <Text style={styles.pillLabel}>Announcements</Text>
                )}
                <Text
                  style={[
                    styles.pillBody,
                    isAlternate && styles.pillBodyAlt,
                  ]}
                  numberOfLines={1}
                >
                  {item.body}
                </Text>
              </View>
              <View
                style={[
                  styles.checkCircle,
                  isSelected && styles.checkCircleActive,
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Delete Button ── */}
        {selectedIds.size > 0 && (
          <View style={styles.deleteBtnWrapper}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={deleteSelected}
              disabled={submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.deleteBtnText}>
                  Delete{'\n'}Announcement
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Create New Announcement ── */}
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>Create New Announcement</Text>
          <TextInput
            style={styles.createInput}
            placeholder="Type your announcement here..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={draftBody}
            onChangeText={setDraftBody}
            textAlignVertical="top"
          />
        </View>

        {/* ── Post Button ── */}
        <View style={styles.postBtnWrapper}>
          <TouchableOpacity
            style={[styles.postBtn, !draftBody.trim() && styles.postBtnDisabled]}
            onPress={() => postAnnouncement(draftBody)}
            disabled={submitting || !draftBody.trim()}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.postBtnText}>Post Announcement</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
  },
  headerSpacer: { width: 32 },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },

  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    marginBottom: 10,
  },

  // Section
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },

  // Announcement Pills
  announcementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  announcementPillAlt: {
    backgroundColor: colors.primary,
  },
  announcementPillSelected: {
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  pillContent: {
    flex: 1,
    marginRight: 10,
  },
  pillLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  pillBody: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  pillBodyAlt: {
    color: colors.white,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },

  // Delete Button
  deleteBtnWrapper: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  deleteBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Create Card
  createCard: {
    backgroundColor: colors.infoBg,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    minHeight: 160,
  },
  createTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 10,
  },
  createInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    lineHeight: 22,
  },

  // Post Button
  postBtnWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  postBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 36,
    minWidth: 220,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
});

export default AdminAnnouncementsScreen;
