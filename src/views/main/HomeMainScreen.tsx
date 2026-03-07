import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  where,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import type { HomeStackParamList, Announcement } from '../../models';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const { width: SCREEN_W } = Dimensions.get('window');

const HomeMainScreen: React.FC<Props> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { handleScroll } = useTabBarScroll();
  const { colors: tc } = useAppTheme();
  const firstName = userProfile?.fullName?.split(' ')[0] ?? 'Learner';
  const styles = useMemo(() => createStyles(tc), [tc]);

  // ── Announcements state ──
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // ── Recent lessons state ──
  interface RecentLesson {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    order: number;
  }
  const [recentLessons, setRecentLessons] = useState<RecentLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  // ── Unread notification count ──
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Dynamic stats ──
  const [dayStreak, setDayStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [practiceMinutes, setPracticeMinutes] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = useCallback(async () => {
    const uid = auth.currentUser?.uid;

    // Fetch latest announcements (top 3)
    try {
      const annRef = collection(db, 'announcements');
      const annQ = query(annRef, orderBy('createdAt', 'desc'), limit(3));
      const annSnap = await getDocs(annQ);
      const items: Announcement[] = annSnap.docs.map((d) => {
        const data = d.data();
        let createdAt = '';
        try {
          const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          createdAt = ts.toISOString();
        } catch { createdAt = ''; }
        return { id: d.id, title: data.title ?? 'Announcement', body: data.body ?? '', createdAt, createdBy: data.createdBy ?? '' };
      });
      setAnnouncements(items);
    } catch (e: any) {
      console.warn('[Home] announcements fetch:', e.message);
    } finally {
      setLoadingAnnouncements(false);
    }

    // Fetch latest published lessons (top 5) — sort client-side to avoid composite index
    try {
      const lessonsRef = collection(db, 'lessons');
      const lessonsQ = query(lessonsRef, where('status', '==', 'published'));
      const lessonsSnap = await getDocs(lessonsQ);
      const items: RecentLesson[] = lessonsSnap.docs
        .map((d) => {
          const data = d.data();
          return { id: d.id, title: data.title ?? '', description: data.description ?? '', category: data.category ?? 'conversation', difficulty: data.difficulty ?? 'Easy', order: data.order ?? 0 };
        })
        .sort((a, b) => a.order - b.order)
        .slice(0, 5);
      setRecentLessons(items);
    } catch (e: any) {
      console.warn('[Home] lessons fetch:', e.message);
    } finally {
      setLoadingLessons(false);
    }

    // Fetch unread notification count
    if (uid) {
      try {
        const notifRef = collection(db, 'users', uid, 'notifications');
        const notifQ = query(notifRef, where('unread', '==', true));
        const notifSnap = await getDocs(notifQ);
        setUnreadCount(notifSnap.size);
      } catch { /* ignore */ }

      // Fetch day streak
      try {
        const streakSnap = await getDoc(doc(db, 'users', uid, 'progress', 'streak'));
        if (streakSnap.exists()) {
          setDayStreak(streakSnap.data().dayStreak ?? 0);
        }
      } catch { /* ignore */ }

      // Fetch today's activity
      try {
        const todayKey = new Date().toISOString().split('T')[0];
        const dailySnap = await getDoc(doc(db, 'users', uid, 'progress', 'daily', 'entries', todayKey));
        if (dailySnap.exists()) {
          const d = dailySnap.data();
          const lessons = (d.lessonsCompleted ?? 0);
          const pron = (d.pronunciationAttempts ?? 0);
          const conv = (d.conversationTurns ?? 0);
          const vocab = (d.vocabWordsLearned ?? 0);
          setCompletedToday(lessons + pron + conv + vocab);
          setPracticeMinutes(d.practiceMinutes ?? Math.round((pron + conv + vocab) * 2));
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, [fetchHomeData]);

  /** Format announcement date */
  const formatDate = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      if (diffH < 1) return 'Just now';
      if (diffH < 24) return `${diffH}h ago`;
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'Yesterday';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const CATEGORY_COLORS: Record<string, string> = { conversation: '#9FB2FD', pronunciation: '#FEC79C', vocabulary: '#9DE09D' };
  const CATEGORY_ICONS: Record<string, string> = { conversation: 'chatbubbles', pronunciation: 'mic', vocabulary: 'book' };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.accent} />}
      >
        {/* ── Header / Greeting ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
            <Text style={styles.subGreeting}>Ready to practice today?</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={22} color={tc.accent} />
          </View>
        </View>

        {/* ── Announcements Banner ── */}
        {!loadingAnnouncements && announcements.length > 0 && (
          <View style={styles.announcementsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="megaphone" size={18} color={tc.accent} />
                <Text style={styles.sectionTitle}>Announcements</Text>
              </View>
            </View>
            {announcements.map((ann) => (
              <View key={ann.id} style={styles.announcementCard}>
                <View style={styles.announcementIconWrap}>
                  <Ionicons name="megaphone-outline" size={18} color={tc.accent} />
                </View>
                <View style={styles.announcementContent}>
                  <View style={styles.announcementTopRow}>
                    <Text style={styles.announcementTitle} numberOfLines={1}>{ann.title}</Text>
                    <Text style={styles.announcementTime}>{formatDate(ann.createdAt)}</Text>
                  </View>
                  <Text style={styles.announcementBody} numberOfLines={2}>{ann.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Daily Practice Card ── */}
        <TouchableOpacity
          style={styles.practiceCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('HomePronunciation', {})}
        >
          <View style={styles.practiceCardInner}>
            <View style={styles.practiceCardLeft}>
              <View style={styles.practiceIconWrap}>
                <Ionicons name="mic" size={26} color={tc.white} />
              </View>
              <View style={styles.practiceInfo}>
                <Text style={styles.practiceTitle}>English Pronunciation</Text>
                <Text style={styles.practiceSubtitle}>
                  Practice speaking with real-time feedback
                </Text>
              </View>
            </View>
            <View style={styles.practiceArrow}>
              <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '33%' }]} />
          </View>
          <Text style={styles.progressLabel}>3 sentences • ~5 min</Text>
        </TouchableOpacity>

        {/* ── Chat with Wavy Card ── */}
        <TouchableOpacity
          style={styles.wavyCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WavyChat')}
        >
          <View style={styles.wavyCardInner}>
            <View style={styles.wavyAvatarWrap}>
              <Svg width={44} height={44} viewBox="0 0 44 44">
                <Circle cx={22} cy={26} r={16} fill="#8B6FAE" />
                <Circle cx={22} cy={22} r={14} fill="#A78BC4" />
                <Circle cx={16} cy={19} r={2.5} fill="#FFFFFF" />
                <Circle cx={28} cy={19} r={2.5} fill="#FFFFFF" />
                <Path
                  d="M18 26 Q22 30 26 26"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <View style={styles.wavyInfo}>
              <Text style={styles.wavyTitle}>Chat with Wavy</Text>
              <Text style={styles.wavySubtitle}>
                Ask questions, practice English, or get help
              </Text>
            </View>
            <View style={styles.wavyArrow}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Quick Stats ── */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.accentMuted }]}>
              <Ionicons name="flame" size={20} color={tc.accent} />
            </View>
            <Text style={styles.statValue}>{dayStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.successBg }]}>
              <Ionicons name="checkmark-circle" size={20} color={tc.success} />
            </View>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.warningBg }]}>
              <Ionicons name="time" size={20} color={tc.warning} />
            </View>
            <Text style={styles.statValue}>{practiceMinutes}m</Text>
            <Text style={styles.statLabel}>Practice</Text>
          </View>
        </View>

        {/* ── Exercises Section ── */}
        <Text style={styles.sectionTitle}>Exercises</Text>

        <TouchableOpacity
          style={styles.exerciseCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('HomePronunciation', {})}
        >
          <View style={[styles.exerciseIcon, { backgroundColor: tc.accentMuted }]}>
            <Ionicons name="mic-outline" size={24} color={tc.accent} />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>Pronunciation Practice</Text>
            <Text style={styles.exerciseDesc}>Read aloud and get AI feedback</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tc.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exerciseCard, { opacity: 0.5 }]} activeOpacity={1}>
          <View style={[styles.exerciseIcon, { backgroundColor: tc.successBg }]}>
            <Ionicons name="book-outline" size={24} color={tc.success} />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>Vocabulary Builder</Text>
            <Text style={styles.exerciseDesc}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tc.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.exerciseCard, { opacity: 0.5 }]} activeOpacity={1}>
          <View style={[styles.exerciseIcon, { backgroundColor: tc.warningBg }]}>
            <Ionicons name="chatbubbles-outline" size={24} color={tc.warning} />
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>Conversation Practice</Text>
            <Text style={styles.exerciseDesc}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={tc.textMuted} />
        </TouchableOpacity>

        {/* ── Available Lessons from Firestore ── */}
        {!loadingLessons && recentLessons.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="library" size={18} color={tc.accent} />
                <Text style={styles.sectionTitle}>Available Lessons</Text>
              </View>
            </View>
            {recentLessons.map((lesson) => {
              const catColor = CATEGORY_COLORS[lesson.category] ?? tc.accentLight;
              const catIcon = CATEGORY_ICONS[lesson.category] ?? 'book';
              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.exerciseCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Navigate to Tutor tab → LessonDetail
                    (navigation as any).navigate('Tutor', {
                      screen: 'LessonDetail',
                      params: { lessonId: lesson.id },
                    });
                  }}
                >
                  <View style={[styles.exerciseIcon, { backgroundColor: `${catColor}30` }]}>
                    <Ionicons name={catIcon as any} size={24} color={catColor} />
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseTitle}>{lesson.title}</Text>
                    <Text style={styles.exerciseDesc} numberOfLines={1}>{lesson.description}</Text>
                  </View>
                  <View style={[styles.difficultyPill, { backgroundColor: `${catColor}18` }]}>
                    <Text style={[styles.difficultyText, { color: catColor }]}>{lesson.difficulty}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: tc.text,
  },
  subGreeting: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.textLight,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tc.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Practice Card ──
  practiceCard: {
    backgroundColor: tc.accentMuted,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    overflow: 'hidden',
  },
  practiceCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  practiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  practiceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: tc.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: tc.text,
    marginBottom: 2,
  },
  practiceSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
  },
  practiceArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: tc.accent,
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: tc.textLight,
  },

  // ── Wavy Chat Card ──
  wavyCard: {
    backgroundColor: '#6B4EAB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    overflow: 'hidden',
  },
  wavyCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wavyAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  wavyInfo: {
    flex: 1,
  },
  wavyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  wavySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  wavyArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ── Section Title ──
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Announcements ──
  announcementsSection: {
    marginBottom: 24,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: tc.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: tc.accent,
  },
  announcementIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: tc.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  announcementContent: {
    flex: 1,
  },
  announcementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: tc.text,
    flex: 1,
    marginRight: 8,
  },
  announcementTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textMuted,
  },
  announcementBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: tc.textLight,
    lineHeight: 18,
  },

  // ── Difficulty pill ──
  difficultyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: tc.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tc.cardBorder,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textLight,
    marginTop: 2,
  },

  // ── Exercise Cards ──
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tc.cardBorder,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: tc.text,
    marginBottom: 2,
  },
  exerciseDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
  },
});

export default HomeMainScreen;
