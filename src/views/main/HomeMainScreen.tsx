import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTabBarScroll } from '../../context/TabBarVisibilityContext';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import type { HomeStackParamList } from '../../models';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const { width: SCREEN_W } = Dimensions.get('window');

const HomeMainScreen: React.FC<Props> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { handleScroll } = useTabBarScroll();
  const { colors: tc } = useAppTheme();
  const firstName = userProfile?.fullName?.split(' ')[0] ?? 'Learner';
  const styles = useMemo(() => createStyles(tc), [tc]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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

        {/* ── Quick Stats ── */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.accentMuted }]}>
              <Ionicons name="flame" size={20} color={tc.accent} />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.successBg }]}>
              <Ionicons name="checkmark-circle" size={20} color={tc.success} />
            </View>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: tc.warningBg }]}>
              <Ionicons name="time" size={20} color={tc.warning} />
            </View>
            <Text style={styles.statValue}>0m</Text>
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

  // ── Section Title ──
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: tc.text,
    marginBottom: 14,
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
