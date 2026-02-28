import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useTutorController, CATEGORY_COLORS } from '../../controllers';
import type { TutorLesson, LessonDifficulty, TutorStackParamList } from '../../models';

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Difficulty Badge ───
const DIFFICULTY_COLORS: Record<LessonDifficulty, string> = {
  Easy: colors.success,
  Medium: colors.accentOrange700,
  Challenging: colors.error,
};

const DifficultyBadge: React.FC<{ difficulty: LessonDifficulty }> = ({ difficulty }) => (
  <View style={[styles.badge, { backgroundColor: `${DIFFICULTY_COLORS[difficulty]}18` }]}>
    <Text style={[styles.badgeText, { color: DIFFICULTY_COLORS[difficulty] }]}>
      ({difficulty})
    </Text>
  </View>
);

// ─── Category icon for placeholder thumbnails ───
const CATEGORY_ICONS: Record<string, string> = {
  conversation: 'chatbubbles',
  pronunciation: 'mic',
  vocabulary: 'book',
};

const LessonThumbnail: React.FC<{ lesson: TutorLesson }> = ({ lesson }) => {
  if (lesson.thumbnail) {
    return <Image source={lesson.thumbnail} style={styles.thumbnailImg} />;
  }

  const bg = CATEGORY_COLORS[lesson.category] ?? colors.primaryLight;
  const iconName = CATEGORY_ICONS[lesson.category] ?? 'book';

  return (
    <View style={[styles.thumbnailPlaceholder, { backgroundColor: bg }]}>
      <Ionicons name={iconName as any} size={28} color={colors.white} />
    </View>
  );
};

// ─── Lesson Card ───
const LessonCard: React.FC<{ lesson: TutorLesson; onPress: () => void; dashed?: boolean }> = ({ lesson, onPress, dashed }) => (
  <TouchableOpacity
    style={[
      styles.lessonCard,
      dashed && styles.lessonCardDashed,
    ]}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <LessonThumbnail lesson={lesson} />
    <View style={styles.lessonInfo}>
      <View style={styles.lessonTitleRow}>
        <Text style={styles.lessonTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
        <DifficultyBadge difficulty={lesson.difficulty} />
      </View>
      <Text style={styles.lessonDesc} numberOfLines={3}>
        {lesson.description}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Stats Badge ───
const StatBadge: React.FC<{ value: number | string; label: string }> = ({ value, label }) => (
  <View style={styles.statBlock}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={styles.statBadge}>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const TutorScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<TutorStackParamList>>();
  const { data, loading, error, refresh } = useTutorController();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* ── Page Title ── */}
        <Text style={styles.pageTitle}>Tutoring</Text>

        {/* ── User Greeting Card ── */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            {data.avatarUrl ? (
              <Image source={{ uri: data.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={30} color={colors.white} />
              </View>
            )}
            <View style={styles.greetingTextBlock}>
              <Text style={styles.greetingName}>Hello {data.userName}</Text>
              <Text style={styles.greetingSubtext}>
                Let's begin your speaking{'\n'}session and make progress{'\n'}one step at a time!
              </Text>
            </View>
          </View>
          <View style={styles.greetingRight}>
            <StatBadge label="Completed" value={data.stats.completedLessons} />
            <Text style={styles.totalHoursLabel}>Total Hours</Text>
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{data.stats.totalHours}</Text>
            </View>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Recent / Continue Lessons ── */}
        {data.recentLessons.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Select where you left off</Text>
            {data.recentLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                dashed
                onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
              />
            ))}
          </>
        )}

        {/* ── Study Path ── */}
        {data.studyPath.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Study Path</Text>
            {data.studyPath.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
              />
            ))}
          </>
        )}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Page Title
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: colors.text,
    marginBottom: 16,
  },

  // Greeting Card
  greetingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  greetingName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  greetingSubtext: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textLight,
    lineHeight: 16,
  },
  greetingRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },

  // Stats
  statBlock: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
  totalHoursLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  statBadge: {
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },

  // Error
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
    marginTop: 8,
  },

  // Lesson Card
  lessonCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lessonCardDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  thumbnailImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 6,
  },
  lessonTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  lessonDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 17,
  },

  // Badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
  },
});

export default TutorScreen;
