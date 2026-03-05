import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useAnnouncementsController } from '../../controllers';

// ═══════════════════════════════════════════════
//  ADMIN ANNOUNCEMENTS SCREEN
// ═══════════════════════════════════════════════

const AdminAnnouncementsScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(tc, width), [tc, width]);
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
        <ActivityIndicator size="large" color={tc.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={tc.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={tc.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Current Announcements ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="megaphone-outline" size={18} color={tc.accent} />
          <Text style={styles.sectionTitle}>Current Announcements</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{announcements.length}</Text>
          </View>
        </View>

        {announcements.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color={tc.textMuted} />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySubText}>Create your first announcement below</Text>
          </View>
        )}

        {announcements.map((item, index) => {
          const isSelected = selectedIds.has(item.id);

          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.announcementCard,
                isSelected && styles.announcementCardSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => toggleSelect(item.id)}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="megaphone" size={16} color={tc.accent} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Announcement #{index + 1}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    isSelected && styles.checkCircleActive,
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color={tc.white} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Delete Button ── */}
        {selectedIds.size > 0 && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={deleteSelected}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={tc.white} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={tc.white} />
                <Text style={styles.deleteBtnText}>
                  Delete Selected ({selectedIds.size})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Create New Announcement ── */}
        <View style={styles.sectionHeader2}>
          <Ionicons name="create-outline" size={18} color={tc.accent} />
          <Text style={styles.sectionTitle}>Create New</Text>
        </View>

        <View style={styles.createCard}>
          <TextInput
            style={styles.createInput}
            placeholder="Type your announcement here..."
            placeholderTextColor={tc.textMuted}
            multiline
            value={draftBody}
            onChangeText={setDraftBody}
            textAlignVertical="top"
          />
          <View style={styles.createCardFooter}>
            <Text style={styles.charCount}>{draftBody.length} characters</Text>
          </View>
        </View>

        {/* ── Post Button ── */}
        <TouchableOpacity
          style={[styles.postBtn, !draftBody.trim() && styles.postBtnDisabled]}
          onPress={() => postAnnouncement(draftBody)}
          disabled={submitting || !draftBody.trim()}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={tc.white} />
          ) : (
            <>
              <Ionicons name="send" size={16} color={tc.white} />
              <Text style={styles.postBtnText}>Post Announcement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors, screenWidth: number) => {
  const isWide = Platform.OS === 'web' && screenWidth >= 600;
  const maxContentWidth = isWide ? 640 : screenWidth;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tc.surfaceAlt,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: tc.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: tc.white,
      borderBottomWidth: 1,
      borderBottomColor: tc.divider,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tc.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: tc.text,
    },
    headerSpacer: { width: 36 },

    scrollContent: {
      paddingHorizontal: isWide ? 32 : 20,
      paddingTop: 20,
      paddingBottom: 48,
      maxWidth: maxContentWidth,
      alignSelf: isWide ? 'center' : undefined,
      width: isWide ? '100%' : undefined,
    },

    // Error
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: tc.errorBg,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: tc.error,
      flex: 1,
    },

    // Section Headers
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    sectionHeader2: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 28,
      marginBottom: 14,
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.text,
      flex: 1,
    },
    sectionBadge: {
      backgroundColor: tc.accentMuted,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    sectionBadgeText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: tc.accent,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    emptyTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: tc.textMuted,
    },
    emptySubText: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textMuted,
    },

    // Announcement Cards
    announcementCard: {
      backgroundColor: tc.white,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    announcementCardSelected: {
      borderColor: tc.accent,
      backgroundColor: tc.accentMuted,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: tc.accentMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    cardContent: {
      flex: 1,
    },
    cardBody: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.text,
      lineHeight: 20,
    },
    cardMeta: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textMuted,
      marginTop: 6,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: tc.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    checkCircleActive: {
      backgroundColor: tc.accent,
      borderColor: tc.accent,
    },

    // Delete Button
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tc.error,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 8,
    },
    deleteBtnText: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: tc.white,
    },

    // Create Card
    createCard: {
      backgroundColor: tc.white,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    createInput: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: tc.text,
      minHeight: 100,
      lineHeight: 22,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    createCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: tc.divider,
    },
    charCount: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: tc.textMuted,
    },

    // Post Button
    postBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: tc.accent,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 16,
      marginBottom: 20,
    },
    postBtnDisabled: {
      opacity: 0.5,
    },
    postBtnText: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.white,
    },
  });
};

export default AdminAnnouncementsScreen;
