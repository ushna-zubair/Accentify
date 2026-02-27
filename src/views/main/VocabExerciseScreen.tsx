import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Rect, Path, Circle, Line } from 'react-native-svg';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useVocabExerciseController } from '../../controllers';
import type { TutorStackParamList } from '../../models';

type ExerciseRoute = RouteProp<TutorStackParamList, 'VocabExercise'>;
const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Result overlay icon (X / Check) ───
const ResultOverlayIcon: React.FC<{ isCorrect: boolean }> = ({ isCorrect }) => {
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
      style={[
        styles.resultOverlay,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View
        style={[
          styles.resultOverlayCircle,
          { backgroundColor: isCorrect ? colors.success : colors.error },
        ]}
      >
        {isCorrect ? (
          <Ionicons name="checkmark" size={40} color={colors.white} />
        ) : (
          <Ionicons name="close" size={40} color={colors.white} />
        )}
      </View>
    </Animated.View>
  );
};

// ─── Animated waveform ───
const WaveformBar: React.FC<{ isRecording: boolean; duration: number }> = ({
  isRecording,
  duration,
}) => {
  const progress = Math.min(duration / 10000, 1);

  return (
    <View style={styles.waveformContainer}>
      <View style={styles.waveformTrack}>
        <Svg width="100%" height={36} viewBox="0 0 300 36">
          {/* Background bar */}
          <Rect x={0} y={14} width={300} height={8} rx={4} fill={colors.primaryLight} opacity={0.4} />
          {/* Progress fill */}
          <Rect x={0} y={14} width={300 * progress} height={8} rx={4} fill={colors.primary} opacity={0.6} />
          {/* Decorative wave */}
          <Path
            d="M10 18 Q25 6 40 18 Q55 30 70 18 Q85 6 100 18 Q115 30 130 18 Q145 6 160 18 Q175 30 190 18 Q205 6 220 18 Q235 30 250 18 Q265 6 280 18"
            stroke="#5EDBA8"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={isRecording ? 1 : 0.7}
          />
          {/* Indicator dot */}
          <Circle cx={10 + 270 * progress} cy={18} r={5} fill={colors.primary} />
        </Svg>
      </View>
    </View>
  );
};

// ─── Mic button with pulse ───
const MicButton: React.FC<{
  isRecording: boolean;
  isProcessing: boolean;
  onPress: () => void;
}> = ({ isRecording, isProcessing, onPress }) => {
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
    <Animated.View style={[styles.micBtnOuter, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[styles.micBtn, isRecording && styles.micBtnActive]}
        onPress={onPress}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={28}
            color={colors.white}
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
  const navigation = useNavigation();
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
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{exercise.title}</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
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
          <View style={styles.card}>
            {/* Left column: Basic word */}
            <View style={styles.cardHalf}>
              <View style={styles.labelRow}>
                <Text style={styles.wordTypeLabel}>Basic</Text>
              </View>

              <View style={styles.wordRow}>
                <Text style={styles.wordText}>{currentPair.basicWord}</Text>
                <TouchableOpacity
                  onPress={() => playPronunciation(currentPair.basicWord)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="volume-high-outline" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.phoneticText}>{currentPair.basicPhonetic}</Text>

              {/* Attempt phonetic (after recording) */}
              {hasResult && (
                <View style={styles.attemptSection}>
                  <Text style={styles.attemptLabel}>Your Attempt</Text>
                  <Text
                    style={[
                      styles.attemptPhonetic,
                      {
                        color: lastResult.basicCorrect
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {lastResult.basicAttemptPhonetic}
                  </Text>
                </View>
              )}

              {/* Feedback */}
              {hasResult && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Feedback:</Text>
                  <Text
                    style={[
                      styles.feedbackText,
                      {
                        color: lastResult.basicCorrect
                          ? colors.success
                          : colors.textLight,
                      },
                    ]}
                  >
                    {lastResult.basicFeedback}
                  </Text>
                </View>
              )}

              {/* Definition (toggled) */}
              {showDefinition && (
                <View style={styles.inCardDefinition}>
                  <Text style={styles.definitionLabel}>Definition:</Text>
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
              </View>

              <View style={styles.wordRow}>
                <Text style={styles.wordText}>{currentPair.vocabWord}</Text>
                <TouchableOpacity
                  onPress={() => playPronunciation(currentPair.vocabWord)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="volume-high-outline" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.phoneticText}>{currentPair.vocabPhonetic}</Text>

              {/* Attempt phonetic (after recording) */}
              {hasResult && (
                <View style={styles.attemptSection}>
                  <Text style={styles.attemptLabel}>Current Attempt</Text>
                  <Text
                    style={[
                      styles.attemptPhonetic,
                      {
                        color: lastResult.vocabCorrect
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {lastResult.vocabAttemptPhonetic}
                  </Text>
                </View>
              )}

              {/* Feedback */}
              {hasResult && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Feedback:</Text>
                  <Text
                    style={[
                      styles.feedbackText,
                      {
                        color: lastResult.vocabCorrect
                          ? colors.success
                          : colors.textLight,
                      },
                    ]}
                  >
                    {lastResult.vocabFeedback}
                  </Text>
                </View>
              )}

              {/* Definition (toggled) */}
              {showDefinition && (
                <View style={styles.inCardDefinition}>
                  <Text style={styles.definitionLabel}>Definition:</Text>
                  <Text style={styles.definitionText}>
                    {currentPair.vocabDefinition}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Result overlay icon (X or Check) */}
          {hasResult && <ResultOverlayIcon isCorrect={lastResult.isCorrect} />}
        </View>

        {/* Definition toggle */}
        <TouchableOpacity
          style={styles.definitionToggle}
          onPress={toggleDefinition}
          activeOpacity={0.6}
        >
          <Text style={styles.definitionToggleText}>
            {showDefinition ? 'Hide definition' : 'Show definition'}
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

        {/* Next button (when correct) */}
        {hasResult && lastResult.isCorrect && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.nextBtnText}>
              {exercise.currentIndex + 1 >= exercise.totalPairs ? 'Finish' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* ── Waveform ── */}
      <WaveformBar isRecording={isRecording} duration={recordingDuration} />

      {/* ── Mic Button ── */}
      <View style={styles.micArea}>
        <MicButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          onPress={handleMicPress}
        />
        <Text style={styles.speakNowText}>
          {isProcessing
            ? 'Processing...'
            : isRecording
              ? 'Listening...'
              : 'Speak now'}
        </Text>
      </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
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
    color: colors.text,
  },
  progressBadge: {
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderStyle: 'dashed',
  },
  progressText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.success,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  // ── Card wrapper (for overlay positioning) ──
  cardWrapper: {
    position: 'relative',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardHalf: {
    flex: 1,
    paddingHorizontal: 6,
  },
  cardDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
    marginHorizontal: 2,
  },

  // ── Labels & words ──
  labelRow: {
    marginBottom: 4,
  },
  wordTypeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textLight,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    flexShrink: 1,
  },
  phoneticText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.success,
    fontStyle: 'italic',
    marginBottom: 6,
  },

  // ── Attempt section ──
  attemptSection: {
    marginTop: 4,
    marginBottom: 4,
  },
  attemptLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.text,
    marginBottom: 2,
  },
  attemptPhonetic: {
    fontFamily: fonts.medium,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // ── Feedback section ──
  feedbackSection: {
    marginTop: 6,
  },
  feedbackLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.text,
    marginBottom: 2,
  },
  feedbackText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
  },

  // ── In-card definition ──
  inCardDefinition: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: colors.divider,
  },
  definitionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.text,
    marginBottom: 2,
  },
  definitionText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 15,
  },

  // ── Result overlay ──
  resultOverlay: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    zIndex: 10,
  },
  resultOverlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── Toggle ──
  definitionToggle: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  definitionToggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },

  // ── Try Again ──
  tryAgainBtn: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 6,
    marginBottom: 4,
  },
  tryAgainText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.success,
  },

  // ── Next button ──
  nextBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  nextBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.white,
  },

  // ── Error ──
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },

  // ── Waveform ──
  waveformContainer: {
    paddingHorizontal: 28,
    marginBottom: 6,
  },
  waveformTrack: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  micBtnActive: {
    backgroundColor: colors.error,
  },
  speakNowText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
});

export default VocabExerciseScreen;
