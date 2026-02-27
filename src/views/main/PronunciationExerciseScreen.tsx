import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Rect, Circle, Path, Ellipse, Line, G } from 'react-native-svg';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import {
  usePronunciationExerciseController,
} from '../../controllers/usePronunciationExerciseController';
import type { TutorStackParamList, WordResult } from '../../models';

type ExerciseRoute = RouteProp<TutorStackParamList, 'PronunciationExercise'>;
type ExerciseNav = NativeStackNavigationProp<
  TutorStackParamList,
  'PronunciationExercise'
>;

const { width: SCREEN_W } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

/** Progress badge color: green → orange → red */
const getProgressColor = (idx: number, total: number): string => {
  if (total <= 1) return colors.success;
  const ratio = idx / (total - 1);
  if (ratio <= 0.34) return colors.success;
  if (ratio <= 0.67) return colors.accentOrange700;
  return colors.error;
};

/** Format seconds → m:ss */
const formatTimer = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ═══════════════════════════════════════════════
//  AI MASCOT (bottom-left)
// ═══════════════════════════════════════════════

const AiMascot: React.FC = () => (
  <View style={styles.mascotWrap}>
    <Svg width={44} height={44} viewBox="0 0 44 44">
      {/* Body */}
      <Circle cx={22} cy={26} r={16} fill="#C4A882" />
      {/* Face */}
      <Circle cx={22} cy={22} r={14} fill="#D4B896" />
      {/* Eyes */}
      <Circle cx={16} cy={20} r={2.5} fill={colors.text} />
      <Circle cx={28} cy={20} r={2.5} fill={colors.text} />
      {/* Mouth */}
      <Path d="M18 27 Q22 31 26 27" stroke={colors.text} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* Ears */}
      <Circle cx={8} cy={14} r={5} fill="#C4A882" />
      <Circle cx={36} cy={14} r={5} fill="#C4A882" />
    </Svg>
    {/* Speech bubble */}
    <View style={styles.mascotBubble}>
      <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
    </View>
  </View>
);

// ═══════════════════════════════════════════════
//  WAVEFORM BAR
// ═══════════════════════════════════════════════

const WaveformBar: React.FC<{ active: boolean }> = ({ active }) => {
  const waveAnims = useRef(
    Array.from({ length: 24 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!active) {
      waveAnims.forEach((a) => a.setValue(0));
      return;
    }
    const anims = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400 + Math.random() * 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400 + Math.random() * 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active, waveAnims]);

  return (
    <View style={styles.waveBarOuter}>
      <View style={styles.waveBarTrack}>
        {active ? (
          <View style={styles.waveBarWaveRow}>
            {waveAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBarSegment,
                  {
                    backgroundColor: colors.success600,
                    transform: [
                      {
                        scaleY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.waveBarSolid} />
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  RESULT ICON (✓ or ✗)
// ═══════════════════════════════════════════════

const ResultIcon: React.FC<{ isCorrect: boolean }> = ({ isCorrect }) => {
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
        styles.resultIconWrap,
        {
          backgroundColor: isCorrect ? colors.success : colors.error,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Ionicons
        name={isCorrect ? 'checkmark' : 'close'}
        size={48}
        color={colors.white}
      />
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const PronunciationExerciseScreen: React.FC = () => {
  const route = useRoute<ExerciseRoute>();
  const navigation = useNavigation<ExerciseNav>();
  const { lessonId } = route.params;

  const {
    sentence,
    currentIndex,
    totalSentences,
    isLastSentence,
    phase,
    result,
    timer,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    tryAgain,
    next,
    completeExercise,
  } = usePronunciationExerciseController(lessonId);

  // ── Render sentence text (plain or colored) ──
  const renderSentenceText = () => {
    if (phase === 'result' && result) {
      return (
        <Text style={styles.cardSentence}>
          {result.wordResults.map((wr, i) => (
            <Text
              key={i}
              style={{
                color: wr.isCorrect ? colors.success : colors.error,
                fontFamily: fonts.semiBold,
              }}
            >
              {wr.word}
              {i < result.wordResults.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      );
    }
    return <Text style={styles.cardSentence}>{sentence.text}</Text>;
  };

  // ── Handle complete ──
  const handleComplete = async () => {
    await completeExercise();
    navigation.replace('CourseCompletion', {
      lessonId,
      courseTitle: 'English Pronunciation',
      completedCount: totalSentences,
      totalWeekly: 14,
    });
  };

  const progressColor = getProgressColor(currentIndex, totalSentences);
  const isIdle = phase === 'idle';
  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isResult = phase === 'result';
  const micDisabled = isProcessing || isResult;

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══════ HEADER ═══════ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>English Pronunciation</Text>
        <View style={styles.badgesCol}>
          <View style={[styles.badge, { backgroundColor: progressColor }]}>
            <Text style={styles.badgeText}>
              {currentIndex + 1}/{totalSentences}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.accentOrange700 }]}>
            <Text style={styles.badgeText}>{formatTimer(timer)}</Text>
          </View>
        </View>
      </View>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Pronunciation Card ── */}
        <View style={[styles.card, isResult && styles.cardResult]}>
          {/* Speaker icon + sentence */}
          <View style={styles.cardTextRow}>
            <TouchableOpacity
              style={styles.speakerBtn}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="volume-high"
                size={20}
                color={colors.textLight}
              />
            </TouchableOpacity>
            <View style={styles.cardTextWrap}>
              {renderSentenceText()}
            </View>
          </View>

          {/* Result overlay */}
          {isResult && result && (
            <View style={styles.resultSection}>
              <ResultIcon isCorrect={result.isCorrect} />

              {result.isCorrect ? (
                <Text style={styles.successMsg}>{result.successMessage}</Text>
              ) : (
                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackLabelRow}>
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Ionicons
                      name="volume-high-outline"
                      size={16}
                      color={colors.textLight}
                    />
                  </View>
                  <Text style={styles.feedbackText}>{result.feedback}</Text>
                </View>
              )}
            </View>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <View style={styles.processingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>
                Analyzing pronunciation…
              </Text>
            </View>
          )}
        </View>

        {/* ── Action button (Try Again / Next / Complete) ── */}
        {isResult && result && (
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (result.isCorrect) {
                if (isLastSentence) {
                  handleComplete();
                } else {
                  next();
                }
              } else {
                tryAgain();
              }
            }}
          >
            <Text style={styles.actionBtnText}>
              {result.isCorrect
                ? isLastSentence
                  ? 'Complete'
                  : 'Next'
                : 'Try Again'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ═══════ BOTTOM AREA ═══════ */}
      <View style={styles.bottomArea}>
        {/* Waveform */}
        <WaveformBar active={isIdle || isRecording} />

        {/* Mic button */}
        <TouchableOpacity
          style={[
            styles.micBtn,
            isRecording && styles.micBtnRecording,
            micDisabled && styles.micBtnDimmed,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={micDisabled}
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

        {/* Label below mic */}
        {(isIdle || isRecording) && (
          <Text style={styles.speakNowText}>
            {isRecording ? `Recording…` : 'Speak Now'}
          </Text>
        )}
      </View>

      {/* ═══════ AI MASCOT ═══════ */}
      <AiMascot />

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const CARD_HORIZONTAL = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: CARD_HORIZONTAL,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    maxWidth: SCREEN_W * 0.6,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: CARD_HORIZONTAL,
    paddingTop: 10,
    paddingBottom: 16,
    flexGrow: 1,
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.50)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cardResult: {
    minHeight: 340,
  },
  cardTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  speakerBtn: {
    marginTop: 4,
    marginRight: 8,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardSentence: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'left',
  },

  // ── Result section ──
  resultSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  resultIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successMsg: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },

  // ── Feedback ──
  feedbackSection: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  feedbackLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  feedbackText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },

  // ── Processing ──
  processingWrap: {
    alignItems: 'center',
    marginTop: 30,
    gap: 10,
  },
  processingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },

  // ── Action button ──
  actionBtn: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 12,
    marginTop: 18,
  },
  actionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },

  // ── Bottom area ──
  bottomArea: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingHorizontal: CARD_HORIZONTAL,
  },

  // ── Waveform bar ──
  waveBarOuter: {
    width: '80%',
    marginBottom: 14,
  },
  waveBarTrack: {
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  waveBarWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
  },
  waveBarSegment: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  waveBarSolid: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
    marginHorizontal: 4,
  },

  // ── Mic button ──
  micBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  micBtnRecording: {
    backgroundColor: colors.error,
  },
  micBtnDimmed: {
    backgroundColor: colors.primary800,
    opacity: 0.6,
  },

  // ── Speak now label ──
  speakNowText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textLight,
    marginTop: 6,
  },

  // ── AI Mascot ──
  mascotWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 14 : 18,
    left: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mascotBubble: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 4,
    marginLeft: -8,
    marginBottom: 28,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  // ── Error bar ──
  errorBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.errorBg,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
});

export default PronunciationExerciseScreen;
