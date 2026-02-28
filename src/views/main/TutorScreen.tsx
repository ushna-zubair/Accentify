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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { fonts } from '../../theme/typography';
import { useTutorController, CATEGORY_COLORS } from '../../controllers';
import type { TutorLesson, LessonDifficulty, TutorStackParamList } from '../../models';

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Difficulty Badge ───
const getDifficultyColor = (d: LessonDifficulty, tc: ThemeColors) =>
  d === 'Easy' ? tc.success : d === 'Challenging' ? tc.error : '#FD8E39';

const DifficultyBadge: React.FC<{ difficulty: LessonDifficulty; tc: ThemeColors }> = ({ difficulty, tc }) => {
  const dColor = getDifficultyColor(difficulty, tc);
  return (
    <View style={[styles.badge, { backgroundColor: `${dColor}18` }]}>
      <Text style={[styles.badgeText, { color: dColor }]}>
        ({difficulty})
      </Text>
    </View>
  );
};

// ─── Category icon for placeholder thumbnails ───
const CATEGORY_ICONS: Record<string, string> = {
  conversation: 'chatbubbles',
  pronunciation: 'mic',
  vocabulary: 'book',
};

const LessonThumbnail: React.FC<{ lesson: TutorLesson; tc: ThemeColors }> = ({ lesson, tc }) => {
  if (lesson.thumbnail) {
    return <Image source={lesson.thumbnail} style={styles.thumbnailImg} />;
  }

  const bg = CATEGORY_COLORS[lesson.category] ?? tc.accentLight;
  const iconName = CATEGORY_ICONS[lesson.category] ?? 'book';

  return (
    <View style={[styles.thumbnailPlaceholder, { backgroundColor: bg }]}>
      <Ionicons name={iconName as any} size={28} color={tc.white} />
    </View>
  );
};

// ─── Lesson Card ───
const LessonCard: React.FC<{ lesson: TutorLesson; onPress: () => void; dashed?: boolean; tc: ThemeColors }> = ({ lesson, onPress, dashed, tc }) => (
  <TouchableOpacity
    style={[
      styles.lessonCard,
      { backgroundColor: tc.surface },
      dashed && [styles.lessonCardDashed, { borderColor: tc.accent, backgroundColor: tc.surface }],
    ]}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <LessonThumbnail lesson={lesson} tc={tc} />
    <View style={styles.lessonInfo}>
      <View style={styles.lessonTitleRow}>
        <Text style={[styles.lessonTitle, { color: tc.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {lesson.title}
        </Text>
        <DifficultyBadge difficulty={lesson.difficulty} tc={tc} />
      </View>
      <Text style={[styles.lessonDesc, { color: tc.textLight }]} numberOfLines={3}>
        {lesson.description}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Stats Badge ───
const StatBadge: React.FC<{ value: number | string; label: string; tc: ThemeColors }> = ({ value, label, tc }) => (
  <View style={styles.statBlock}>
    <Text style={[styles.statLabel, { color: tc.textLight }]}>{label}</Text>
    <View style={[styles.statBadge, { backgroundColor: tc.success }]}>
      <Text style={[styles.statValue, { color: tc.white }]}>{value}</Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const TutorScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<TutorStackParamList>>();
  const { data, loading, error, refresh } = useTutorController();
  const { handleScroll } = useTabBarScroll();
  const { colors: tc } = useAppTheme();

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: tc.background }]} edges={['top']}>
        <ActivityIndicator size="large" color={tc.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={tc.accent} />
        }
      >
        {/* ── Page Title ── */}
        <Text style={[styles.pageTitle, { color: tc.text }]}>Tutoring</Text>

        {/* ── User Greeting Card ── */}
        <View style={[styles.greetingCard, { backgroundColor: tc.surface }]}>
          <View style={styles.greetingTop}>
            <View style={styles.greetingLeft}>
              {data.avatarUrl ? (
                <Image source={{ uri: data.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: tc.accentLight }]}>
                  <Ionicons name="person" size={avatarSize * 0.5} color={tc.white} />
                </View>
              )}
              <View style={styles.greetingTextBlock}>
                <Text style={[styles.greetingName, { color: tc.text }]} numberOfLines={1}>Hello {data.userName}</Text>
                <Text style={[styles.greetingSubtext, { color: tc.textLight }]}>
                  Let's begin your speaking session and make progress one step at a time!
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statsRow, { borderTopColor: tc.inputBorder }]}>
            <StatBadge label="Completed" value={data.stats.completedLessons} tc={tc} />
            <StatBadge label="Total Hours" value={data.stats.totalHours} tc={tc} />
          </View>
        </View>

        {error && <Text style={[styles.errorText, { color: tc.error }]}>{error}</Text>}

        {/* ── Recent / Continue Lessons ── */}
        {data.recentLessons.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Select where you left off</Text>
            {data.recentLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                dashed
                onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
                tc={tc}
              />
            ))}
          </>
        )}

        {/* ── Study Path ── */}
        {data.studyPath.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>Study Path</Text>
            {data.studyPath.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
                tc={tc}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES (responsive)
// ═══════════════════════════════════════════════

const { width: SCREEN_W } = Dimensions.get('window');
const isSmall = SCREEN_W < 380;
const avatarSize = isSmall ? 46 : 54;
const thumbSize = isSmall ? 64 : 74;
const hPad = isSmall ? 14 : 18;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: hPad,
    paddingTop: 12,
    paddingBottom: 100,
  },

  // Page Title
  pageTitle: {
    fontFamily: fonts.bold,
    fontSize: isSmall ? 26 : 30,
    marginBottom: 14,
  },

  // Greeting Card
  greetingCard: {
    borderRadius: 16,
    padding: isSmall ? 12 : 14,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  greetingTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    marginRight: 10,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  greetingName: {
    fontFamily: fonts.bold,
    fontSize: isSmall ? 14 : 16,
    marginBottom: 3,
  },
  greetingSubtext: {
    fontFamily: fonts.regular,
    fontSize: isSmall ? 11 : 12,
    lineHeight: isSmall ? 15 : 17,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 10,
  },

  // Stats
  statBlock: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: isSmall ? 11 : 12,
    marginBottom: 4,
  },
  statBadge: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 46,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: isSmall ? 15 : 17,
  },

  // Error
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 10,
  },

  // Section
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: isSmall ? 16 : 18,
    marginBottom: 10,
    marginTop: 6,
  },

  // Lesson Card
  lessonCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: isSmall ? 10 : 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lessonCardDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  thumbnailImg: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: 10,
    marginRight: 10,
  },
  thumbnailPlaceholder: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: 10,
    marginRight: 10,
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
    fontSize: isSmall ? 13 : 15,
    flexShrink: 1,
  },
  lessonDesc: {
    fontFamily: fonts.regular,
    fontSize: isSmall ? 11 : 12,
    lineHeight: isSmall ? 15 : 17,
  },

  // Badge
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: isSmall ? 10 : 11,
  },
});

export default TutorScreen;
