import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle as SvgCircle,
  Path,
  G,
  Rect,
  Ellipse,
  Text as SvgText,
  Polygon,
  Line,
} from 'react-native-svg';
import {
  doc,
  getDoc,
  setDoc,
  increment,
  Timestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { TutorStackParamList } from '../../models';

type CompletionRoute = RouteProp<TutorStackParamList, 'CourseCompletion'>;
type CompletionNav = NativeStackNavigationProp<TutorStackParamList, 'CourseCompletion'>;

const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  CELEBRATION ILLUSTRATION (SVG)
// ═══════════════════════════════════════════════

const CelebrationIllustration: React.FC = () => (
  <View style={illustrationStyles.container}>
    <View style={illustrationStyles.frame}>
      {/* Confetti dots */}
      <View style={[illustrationStyles.confetti, { top: 8, left: 20 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#FD8E39' }]} />
      </View>
      <View style={[illustrationStyles.confetti, { top: 16, right: 25 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#3DC13C' }]} />
      </View>
      <View style={[illustrationStyles.confetti, { top: 35, left: 45 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#E94F54' }]} />
      </View>
      <View style={[illustrationStyles.confetti, { top: 30, right: 40 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#3F66FB' }]} />
      </View>
      <View style={[illustrationStyles.confetti, { bottom: 60, left: 15 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#F3BB1B' }]} />
      </View>
      <View style={[illustrationStyles.confetti, { bottom: 55, right: 20 }]}>
        <View style={[illustrationStyles.confettiDot, { backgroundColor: '#FE7F9C' }]} />
      </View>

      {/* Celebration person emoji */}
      <Text style={illustrationStyles.emoji}>🎉</Text>
      <Text style={illustrationStyles.personEmoji}>👩‍💻</Text>

      {/* Balloons */}
      <View style={illustrationStyles.balloonsRow}>
        <Text style={illustrationStyles.balloon}>🎈</Text>
        <Text style={illustrationStyles.balloon}>🟡</Text>
        <Text style={illustrationStyles.balloon}>🔴</Text>
      </View>
    </View>
  </View>
);

const illustrationStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  frame: {
    width: 200,
    height: 180,
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#E5DCC8',
  },
  confetti: {
    position: 'absolute',
    zIndex: 5,
  },
  confettiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emoji: {
    fontSize: 50,
    zIndex: 2,
  },
  personEmoji: {
    fontSize: 44,
    marginTop: -8,
    zIndex: 1,
  },
  balloonsRow: {
    position: 'absolute',
    top: -15,
    flexDirection: 'row',
    gap: 6,
  },
  balloon: {
    fontSize: 24,
  },
});

// ═══════════════════════════════════════════════
//  CONFETTI MODAL ILLUSTRATION
// ═══════════════════════════════════════════════

const ConfettiPartyPopper: React.FC = () => (
  <View style={modalIllustrationStyles.container}>
    {/* Confetti pieces around */}
    <View style={[modalIllustrationStyles.confettiPiece, { top: 0, left: 10, backgroundColor: '#FE7F9C', transform: [{ rotate: '45deg' }] }]} />
    <View style={[modalIllustrationStyles.confettiPiece, { top: 5, right: 15, backgroundColor: '#3F66FB', transform: [{ rotate: '-30deg' }] }]} />
    <View style={[modalIllustrationStyles.confettiPiece, { top: 20, left: 30, backgroundColor: '#FD8E39', transform: [{ rotate: '60deg' }] }]} />
    <View style={[modalIllustrationStyles.confettiPiece, { top: 18, right: 35, backgroundColor: '#3DC13C', transform: [{ rotate: '-45deg' }] }]} />
    <View style={[modalIllustrationStyles.confettiDot, { top: 12, left: 55, backgroundColor: '#3F66FB' }]} />
    <View style={[modalIllustrationStyles.confettiDot, { top: 25, right: 50, backgroundColor: '#E94F54' }]} />
    <View style={[modalIllustrationStyles.confettiCurl, { top: 5, left: 50, borderColor: '#FE7F9C' }]} />
    <View style={[modalIllustrationStyles.confettiCurl, { top: 15, right: 25, borderColor: '#9FB2FD' }]} />

    {/* Party Popper */}
    <Text style={modalIllustrationStyles.partyEmoji}>🎉</Text>
  </View>
);

const modalIllustrationStyles = StyleSheet.create({
  container: {
    width: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  confettiPiece: {
    position: 'absolute',
    width: 14,
    height: 5,
    borderRadius: 3,
  },
  confettiDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confettiCurl: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  partyEmoji: {
    fontSize: 54,
    zIndex: 2,
  },
});

// ═══════════════════════════════════════════════
//  CONGRATULATIONS MODAL
// ═══════════════════════════════════════════════

interface CongratulationsModalProps {
  visible: boolean;
  completedCount: number;
  totalWeekly: number;
  onDismiss: () => void;
}

const CongratulationsModal: React.FC<CongratulationsModalProps> = ({
  visible,
  completedCount,
  totalWeekly,
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const remaining = totalWeekly - completedCount;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[modalStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            modalStyles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Decorative confetti strip at top */}
          <View style={modalStyles.confettiStrip}>
            {/* Decorative dots */}
            <View style={[modalStyles.stripDot, { backgroundColor: '#FE7F9C', left: 10, top: 8 }]} />
            <View style={[modalStyles.stripDot, { backgroundColor: '#3F66FB', right: 20, top: 5 }]} />
            <View style={[modalStyles.stripDot, { backgroundColor: '#FD8E39', left: 40, top: 15 }]} />
            <View style={[modalStyles.stripDot, { backgroundColor: '#3DC13C', right: 45, top: 12 }]} />
            <View style={[modalStyles.stripDot, { backgroundColor: '#9FB2FD', left: 80, top: 4 }]} />
          </View>

          <Text style={modalStyles.title}>Congratulations!</Text>

          <ConfettiPartyPopper />

          <Text style={modalStyles.message}>
            {completedCount} down, {remaining} to go, complete your weekly streak!
          </Text>

          <TouchableOpacity
            style={modalStyles.okayButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={modalStyles.okayText}>OKAY!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 20, 60, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  confettiStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  stripDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  okayButton: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 16,
    alignItems: 'center',
  },
  okayText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
});

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const CourseCompletionScreen: React.FC = () => {
  const navigation = useNavigation<CompletionNav>();
  const route = useRoute<CompletionRoute>();
  const { lessonId, courseTitle, completedCount, totalWeekly } = route.params;
  const { currentUser } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Show congratulations modal after a short delay
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // ── Backend: Update completion data ──
  useEffect(() => {
    const recordCompletion = async () => {
      if (!currentUser) return;
      try {
        const uid = currentUser.uid;

        // Mark course as completed
        await setDoc(
          doc(db, 'users', uid, 'lessons', lessonId),
          {
            status: 'completed',
            completedAt: Timestamp.now(),
            vocabIndex: 0,
          },
          { merge: true },
        );

        // Update streak
        const streakRef = doc(db, 'users', uid, 'progress', 'streak');
        const streakSnap = await getDoc(streakRef);
        let currentStreak = 1;

        if (streakSnap.exists()) {
          const data = streakSnap.data();
          const lastActive = data.lastActiveDate?.toDate?.() ?? new Date(0);
          const now = new Date();
          const diffDays = Math.floor(
            (now.getTime() - lastActive.getTime()) / 86400000,
          );

          if (diffDays <= 1) {
            currentStreak = (data.dayStreak ?? 0) + (diffDays === 1 ? 1 : 0);
          }
        }

        await setDoc(
          streakRef,
          {
            dayStreak: currentStreak,
            lastActiveDate: Timestamp.now(),
          },
          { merge: true },
        );

        // Update progress summary
        const summaryRef = doc(db, 'users', uid, 'progress', 'summary');
        await setDoc(
          summaryRef,
          {
            completedLessons: increment(1),
            lastCompletedAt: Timestamp.now(),
            lastCompletedLessonId: lessonId,
          },
          { merge: true },
        );
      } catch (e: any) {
        console.error('[CourseCompletion] Error recording completion:', e);
      }
    };

    recordCompletion();
  }, [currentUser, lessonId]);

  const handleProceed = useCallback(() => {
    // Navigate back to the Tutor screen to pick the next lesson
    navigation.popToTop();
  }, [navigation]);

  const handleAttemptAgain = useCallback(() => {
    // Go back to the same VocabExercise
    navigation.replace('VocabExercise', { lessonId });
  }, [navigation, lessonId]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.dashboardLabel}>Dashboard</Text>
          <Text style={styles.courseTitle}>{courseTitle}</Text>

          {/* Celebration Illustration */}
          <CelebrationIllustration />

          {/* Congratulatory Message */}
          <Text style={styles.congratsMessage}>
            Congratulations, you have successfully completed the first course!
            You may attempt again for more practice or proceed to the next
            level.
          </Text>

          {/* Proceed to Level 2 Button */}
          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={handleProceed}
            activeOpacity={0.7}
          >
            <Text style={styles.proceedBtnText}>Proceed to Level 2</Text>
          </TouchableOpacity>

          {/* Attempt Again */}
          <TouchableOpacity
            style={styles.attemptAgainBtn}
            onPress={handleAttemptAgain}
            activeOpacity={0.6}
          >
            <Text style={styles.attemptAgainText}>Attempt Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Congratulations Modal */}
      <CongratulationsModal
        visible={showModal}
        completedCount={completedCount}
        totalWeekly={totalWeekly}
        onDismiss={() => setShowModal(false)}
      />
    </SafeAreaView>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },

  // ── Header ──
  dashboardLabel: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
  },
  courseTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  // ── Message ──
  congratsMessage: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 16,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // ── Buttons ──
  proceedBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  proceedBtnText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
  attemptAgainBtn: {
    paddingVertical: 8,
  },
  attemptAgainText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textLight,
    textDecorationLine: 'underline',
    fontStyle: 'italic',
  },
});

export default CourseCompletionScreen;
