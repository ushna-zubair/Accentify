import React, { useEffect, useRef , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useVocabExerciseController } from '../../controllers';
import type { TutorStackParamList } from '../../models';

type ExerciseRoute = RouteProp<TutorStackParamList, 'VocabExercise'>;
type ExerciseNav = NativeStackNavigationProp<TutorStackParamList, 'VocabExercise'>;
const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

/** Return a color for the progress badge based on current index */
const getProgressColor = (index: number, total: number, tc: ThemeColors): string => {
  if (total <= 1) return tc.success;
  const ratio = index / (total - 1);
  if (ratio <= 0.34) return tc.success;
  if (ratio <= 0.67) return '#FD8E39';
  return tc.error;
};

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Result overlay (Check / X + success message) ───
const ResultOverlay: React.FC<{ isCorrect: boolean; message: string }> = ({
  isCorrect,
  message,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[styles.resultOverlay, { transform: [{ scale: scaleAnim }] }]}
    >
      <View
        style={[
          styles.resultOverlayCircle,
          { backgroundColor: isCorrect ? tc.success : tc.error },
        ]}
      >
        {isCorrect ? (
          <Ionicons name="checkmark" size={44} color={tc.white} />
        ) : (
          <Ionicons name="close" size={44} color={tc.white} />
        )}
      </View>
      {message !== '' && (
        <Text
          style={[
            styles.resultMessage,
            { color: isCorrect ? tc.success : tc.error },
          ]}
        >
          {message}
        </Text>
      )}
    </Animated.View>
  );
};

// ─── Animated waveform ───
const WaveformBar: React.FC<{
  isRecording: boolean;
  duration: number;
  hasResult: boolean;
}> = ({ isRecording, duration, hasResult }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const progress = Math.min(duration / 10000, 1);

  return (
    <View style={styles.waveformContainer}>
      <View style={styles.waveformTrack}>
        <Svg width="100%" height={36} viewBox="0 0 300 36">
          {/* Background bar */}
          <Rect
            x={0}
            y={14}
            width={300}
            height={8}
            rx={4}
            fill={tc.accentLight}
            opacity={0.4}
          />
          {/* Progress fill */}
          <Rect
            x={0}
            y={14}
            width={hasResult ? 300 : 300 * progress}
            height={8}
            rx={4}
            fill={tc.accent}
            opacity={0.6}
          />
          {/* Decorative wave — only visible when NOT showing a result */}
          {!hasResult && (
            <>
              <Path
                d="M10 18 Q25 6 40 18 Q55 30 70 18 Q85 6 100 18 Q115 30 130 18 Q145 6 160 18 Q175 30 190 18 Q205 6 220 18 Q235 30 250 18 Q265 6 280 18"
                stroke="#5EDBA8"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                opacity={isRecording ? 1 : 0.7}
              />
              {/* Indicator dot */}
              <Circle
                cx={10 + 270 * progress}
                cy={18}
                r={5}
                fill={tc.accent}
              />
            </>
          )}
        </Svg>
      </View>
    </View>
  );
};

// ─── Mic button with pulse ───
const MicButton: React.FC<{
  isRecording: boolean;
  isProcessing: boolean;
  hasResult: boolean;
  onPress: () => void;
}> = ({ isRecording, isProcessing, hasResult, onPress }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  return (
    <Animated.View
      style={[styles.micBtnOuter, { transform: [{ scale: pulseAnim }] }]}
    >
      <TouchableOpacity
        style={[
          styles.micBtn,
          isRecording && styles.micBtnActive,
          hasResult && styles.micBtnDone,
        ]}
        onPress={onPress}
        disabled={isProcessing || (hasResult && !isRecording)}
        activeOpacity={0.7}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={tc.white} />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={28}
            color={tc.white}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const VocabExerciseScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const navigation = useNavigation<ExerciseNav>();
  const route = useRoute<ExerciseRoute>();
  const { lessonId } = route.params;

  const {
    exercise,
    currentPair,
    loading,
    error,
    showDefinition,
    isRecording,
    isProcessing,
    lastResult,
    recordingDuration,
    successMessage,
    toggleDefinition,
    playPronunciation,
    startRecording,
    stopRecording,
    tryAgain,
    nextPair,
  } = useVocabExerciseController(lessonId);

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleNext = async () => {
    const isComplete = await nextPair();
    if (isComplete) {
      navigation.replace('CourseCompletion', {
        lessonId,
        courseTitle: exercise.title,
        completedCount: 3, // placeholder — real value from Firestore
        totalWeekly: 7,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tc.accent} />
      </SafeAreaView>
    );
  }

  if (!currentPair) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>No word pairs available</Text>
      </SafeAreaView>
    );
  }

  const hasResult = lastResult !== null;
  const isLastPair = exercise.currentIndex + 1 >= exercise.totalPairs;
  const progressColor = getProgressColor(
    exercise.currentIndex,
    exercise.totalPairs,
    tc,
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{exercise.title}</Text>
        <View style={[styles.progressBadge, { borderColor: progressColor }]}>
          <Text style={[styles.progressText, { color: progressColor }]}>
            {exercise.currentIndex + 1}/{exercise.totalPairs}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Word Pair Card ── */}
        <View style={styles.cardWrapper}>
          <View style={[styles.card, hasResult && styles.cardWithResult]}>
            {/* ── Two-column content ── */}
            <View style={styles.columnsRow}>
              {/* Left column: Basic word */}
              <View style={styles.cardHalf}>
                <View style={styles.labelRow}>
                  <Text style={styles.wordTypeLabel}>Basic</Text>
                  <TouchableOpacity
                    onPress={() => playPronunciation(currentPair.basicWord)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="volume-high-outline"
                      size={16}
                      color={tc.text}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.wordText}>{currentPair.basicWord}</Text>
                <Text style={styles.phoneticText}>
                  {currentPair.basicPhonetic}
                </Text>

                {/* Attempt phonetic (after recording) */}
                {hasResult && (
                  <View style={styles.attemptSection}>
                    <Text style={styles.attemptLabel}>Your Attempt</Text>
                    <Text
                      style={[
                        styles.attemptPhonetic,
                        {
                          color: lastResult.basicCorrect
                            ? tc.success
                            : tc.error,
                        },
                      ]}
                    >
                      {lastResult.basicAttemptPhonetic}
                    </Text>
                  </View>
                )}

                {/* Definition (toggled) */}
                {showDefinition && (
                  <View style={styles.inCardDefinition}>
                    <Text style={styles.definitionText}>
                      {currentPair.basicDefinition}
                    </Text>
                  </View>
                )}
              </View>

              {/* Vertical Divider */}
              <View style={styles.cardDivider} />

              {/* Right column: Vocab word */}
              <View style={styles.cardHalf}>
                <View style={styles.labelRow}>
                  <Text style={styles.wordTypeLabel}>Vocab</Text>
                  <TouchableOpacity
                    onPress={() => playPronunciation(currentPair.vocabWord)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="volume-high-outline"
                      size={16}
                      color={tc.text}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.wordText}>{currentPair.vocabWord}</Text>
                <Text style={styles.phoneticText}>
                  {currentPair.vocabPhonetic}
                </Text>

                {/* Attempt phonetic (after recording) */}
                {hasResult && (
                  <View style={styles.attemptSection}>
                    <Text style={styles.attemptLabel}>Current Attempt</Text>
                    <Text
                      style={[
                        styles.attemptPhonetic,
                        {
                          color: lastResult.vocabCorrect
                            ? tc.success
                            : tc.error,
                        },
                      ]}
                    >
                      {lastResult.vocabAttemptPhonetic}
                    </Text>
                  </View>
                )}

                {/* Definition (toggled) */}
                {showDefinition && (
                  <View style={styles.inCardDefinition}>
                    <Text style={styles.definitionText}>
                      {currentPair.vocabDefinition}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Result overlay (centered below columns) ── */}
            {hasResult && (
              <ResultOverlay
                isCorrect={lastResult.isCorrect}
                message={
                  lastResult.isCorrect
                    ? successMessage
                    : 'Try Again'
                }
              />
            )}
          </View>
        </View>

        {/* Definition toggle */}
        <TouchableOpacity
          style={styles.definitionToggle}
          onPress={toggleDefinition}
          activeOpacity={0.6}
        >
          <Text style={styles.definitionToggleText}>
            {showDefinition ? 'Hide Definition' : 'Show Definition'}
          </Text>
        </TouchableOpacity>

        {/* Try Again button (when incorrect) */}
        {hasResult && !lastResult.isCorrect && (
          <TouchableOpacity
            style={styles.tryAgainBtn}
            onPress={tryAgain}
            activeOpacity={0.7}
          >
            <Text style={styles.tryAgainText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Next / Complete button (when correct) */}
        {hasResult && lastResult.isCorrect && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.nextBtnText}>
              {isLastPair ? 'Complete' : 'Next'}
            </Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* ── Waveform ── */}
      <WaveformBar
        isRecording={isRecording}
        duration={recordingDuration}
        hasResult={hasResult}
      />

      {/* ── Mic Button ── */}
      <View style={styles.micArea}>
        <MicButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          hasResult={hasResult}
          onPress={handleMicPress}
        />
        {/* Only show prompt text BEFORE a result */}
        {!hasResult && (
          <Text style={styles.speakNowText}>
            {isProcessing
              ? 'Processing...'
              : isRecording
                ? 'Listening...'
                : 'Speak now'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.accentMuted,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: tc.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: tc.text,
  },
  progressBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderStyle: 'dashed',
  },
  progressText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // ── Card wrapper ──
  cardWrapper: {
    position: 'relative',
  },
  card: {
    backgroundColor: tc.white,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: tc.accentLight,
    minHeight: 280,
  },
  cardWithResult: {
    minHeight: 320,
  },
  columnsRow: {
    flexDirection: 'row',
  },
  cardHalf: {
    flex: 1,
    paddingHorizontal: 6,
  },
  cardDivider: {
    width: 1,
    backgroundColor: tc.divider,
    marginVertical: 4,
    marginHorizontal: 2,
  },

  // ── Labels & words ──
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  wordTypeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: tc.textLight,
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: tc.text,
    marginBottom: 2,
  },
  phoneticText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: tc.textLight,
    marginBottom: 6,
  },

  // ── Attempt section ──
  attemptSection: {
    marginTop: 6,
    marginBottom: 4,
  },
  attemptLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: tc.text,
    marginBottom: 2,
  },
  attemptPhonetic: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },

  // ── In-card definition ──
  inCardDefinition: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: tc.divider,
  },
  definitionText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: tc.textLight,
    lineHeight: 16,
  },

  // ── Result overlay ──
  resultOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultOverlayCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  resultMessage: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },

  // ── Toggle ──
  definitionToggle: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  definitionToggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.textLight,
    textDecorationLine: 'underline',
  },

  // ── Try Again ──
  tryAgainBtn: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: tc.success,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 36,
    marginTop: 4,
    marginBottom: 4,
  },
  tryAgainText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.success,
  },

  // ── Next / Complete button ──
  nextBtn: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: tc.accent,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 36,
    marginTop: 4,
    marginBottom: 4,
  },
  nextBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: tc.white,
  },

  // ── Error ──
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: tc.error,
    textAlign: 'center',
    marginTop: 8,
  },

  // ── Waveform ──
  waveformContainer: {
    paddingHorizontal: 28,
    marginBottom: 6,
  },
  waveformTrack: {
    backgroundColor: tc.accent,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },

  // ── Mic ──
  micArea: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 10,
  },
  micBtnOuter: {
    borderRadius: 20,
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: tc.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  micBtnActive: {
    backgroundColor: tc.error,
  },
  micBtnDone: {
    backgroundColor: tc.accentDark,
    opacity: 0.7,
  },
  speakNowText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.text,
    marginTop: 6,
  },
});

export default VocabExerciseScreen;
