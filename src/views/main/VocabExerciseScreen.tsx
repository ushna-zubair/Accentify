import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Rect, Path } from 'react-native-svg';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { useVocabExerciseController } from '../../controllers';
import type { TutorStackParamList } from '../../models';

type ExerciseRoute = RouteProp<TutorStackParamList, 'VocabExercise'>;

// ═══════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════

// ─── Waveform visualiser (decorative) ───
const WaveformBar: React.FC<{ isRecording: boolean; duration: number }> = ({
  isRecording,
  duration,
}) => {
  // Progress: 0 → 1 based on max 10 seconds of recording
  const progress = Math.min(duration / 10000, 1);

  return (
    <View style={styles.waveformContainer}>
      <View style={styles.waveformTrack}>
        {/* Animated wave SVG */}
        <Svg width="100%" height={30} viewBox="0 0 300 30">
          {/* Background track */}
          <Rect x={0} y={12} width={300} height={6} rx={3} fill={colors.primaryLight} />
          {/* Filled progress */}
          <Rect
            x={0}
            y={12}
            width={300 * progress}
            height={6}
            rx={3}
            fill={colors.primary}
          />
          {/* Decorative wave pattern */}
          {isRecording && (
            <Path
              d={`M${10 + 280 * progress} 15 
                  Q${20 + 280 * progress} 5 ${30 + 280 * progress} 15 
                  Q${40 + 280 * progress} 25 ${50 + 280 * progress} 15`}
              stroke={colors.success}
              strokeWidth={2.5}
              fill="none"
            />
          )}
        </Svg>
        {/* Wave squiggles when recording */}
        {isRecording && (
          <View style={styles.waveOverlay}>
            <Svg width={120} height={30} viewBox="0 0 120 30">
              <Path
                d="M0 15 Q10 5 20 15 Q30 25 40 15 Q50 5 60 15 Q70 25 80 15 Q90 5 100 15 Q110 25 120 15"
                stroke={colors.success}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Mic button with pulse animation ───
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
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
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

// ─── Purple Ghost Mascot ───
const GhostMascot: React.FC = () => (
  <Svg width={36} height={36} viewBox="0 0 60 60">
    <Path
      d="M15 50 C15 50 15 25 30 15 C45 25 45 50 45 50
         C42 47 40 50 37 47 C35 50 32 47 30 50
         C27 47 25 50 22 47 C20 50 17 47 15 50Z"
      fill="#7B4DB8"
    />
    {/* Head */}
    <Path
      d="M22 30 C22 18 38 18 38 30 C38 38 22 38 22 30Z"
      fill="#7B4DB8"
    />
    {/* Eyes */}
    <Rect x={26} y={27} width={3} height={3} rx={1.5} fill={colors.white} />
    <Rect x={33} y={27} width={3} height={3} rx={1.5} fill={colors.white} />
    {/* Smile */}
    <Path
      d="M27 33 Q30 37 33 33"
      stroke={colors.white}
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!currentPair) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No word pairs available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{exercise.title}</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {exercise.currentIndex + 1}/{exercise.totalPairs}
          </Text>
        </View>
      </View>

      {/* ── Word Pair Card ── */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          {/* Left: Basic word */}
          <View style={styles.cardHalf}>
            <TouchableOpacity
              style={styles.speakerRow}
              onPress={() => playPronunciation(currentPair.basicWord)}
              activeOpacity={0.6}
            >
              <Text style={styles.wordTypeLabel}>Basic</Text>
              <Ionicons name="volume-high" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.wordText}>{currentPair.basicWord}</Text>
            <Text style={styles.phoneticText}>{currentPair.basicPhonetic}</Text>
          </View>

          {/* Vertical Divider */}
          <View style={styles.cardDivider} />

          {/* Right: Vocab word */}
          <View style={styles.cardHalf}>
            <TouchableOpacity
              style={styles.speakerRow}
              onPress={() => playPronunciation(currentPair.vocabWord)}
              activeOpacity={0.6}
            >
              <Text style={styles.wordTypeLabel}>Vocab</Text>
              <Ionicons name="volume-high" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.wordText}>{currentPair.vocabWord}</Text>
            <Text style={styles.phoneticText}>{currentPair.vocabPhonetic}</Text>
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

        {/* Definition text (expandable) */}
        {showDefinition && (
          <View style={styles.definitionBox}>
            <Text style={styles.definitionText}>{currentPair.definition}</Text>
            {currentPair.exampleSentence && (
              <Text style={styles.exampleText}>
                Example: "{currentPair.exampleSentence}"
              </Text>
            )}
          </View>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* ── Result feedback ── */}
      {lastResult && (
        <View
          style={[
            styles.resultBadge,
            lastResult.isCorrect ? styles.resultCorrect : styles.resultIncorrect,
          ]}
        >
          <Ionicons
            name={lastResult.isCorrect ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={lastResult.isCorrect ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.resultText,
              { color: lastResult.isCorrect ? colors.success : colors.error },
            ]}
          >
            {lastResult.isCorrect
              ? 'Great pronunciation!'
              : `Heard: "${lastResult.transcript}" — Try again!`}
          </Text>
        </View>
      )}

      {/* ── Waveform ── */}
      <WaveformBar isRecording={isRecording} duration={recordingDuration} />

      {/* ── Mic Button ── */}
      <View style={styles.micArea}>
        <MicButton
          isRecording={isRecording}
          isProcessing={isProcessing}
          onPress={handleMicPress}
        />
      </View>

      {/* ── Next / Bottom Bar ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <GhostMascot />
        </View>
        {lastResult?.isCorrect && (
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
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
  },
  progressBadge: {
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderStyle: 'dashed',
  },
  progressText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.success,
  },

  // Card
  cardContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    minHeight: 220,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  cardDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  wordTypeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneticText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.success,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Definition
  definitionToggle: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  definitionToggleText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textLight,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
  },
  definitionBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  definitionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  exampleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Error
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 8,
  },

  // Result
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  resultCorrect: {
    backgroundColor: colors.successBg,
  },
  resultIncorrect: {
    backgroundColor: colors.errorBg,
  },
  resultText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },

  // Waveform
  waveformContainer: {
    paddingHorizontal: 32,
    marginTop: 16,
  },
  waveformTrack: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  waveOverlay: {
    position: 'absolute',
    left: 20,
    top: 5,
  },

  // Mic
  micArea: {
    alignItems: 'center',
    marginTop: 16,
  },
  micBtnOuter: {
    borderRadius: 35,
  },
  micBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  micBtnActive: {
    backgroundColor: colors.error,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 'auto',
    paddingBottom: 8,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
  },
  nextBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
});

export default VocabExerciseScreen;
