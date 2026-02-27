import React, { useRef, useEffect, useState } from 'react';
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
import Svg, { Rect, Circle, Path, Line } from 'react-native-svg';
import colors from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { usePronunciationExerciseController } from '../../controllers/usePronunciationExerciseController';
import type { TutorStackParamList, ChatMessage, PronunciationScore } from '../../models';

type ExerciseRoute = RouteProp<TutorStackParamList, 'PronunciationExercise'>;
type ExerciseNav = NativeStackNavigationProp<TutorStackParamList, 'PronunciationExercise'>;

const { width: SCREEN_W } = Dimensions.get('window');
const BUBBLE_MAX_W = SCREEN_W * 0.72;

// ═══════════════════════════════════════════════
//  AI AVATAR
// ═══════════════════════════════════════════════

const AiAvatar: React.FC = () => (
  <View style={styles.avatar}>
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={13} fill={colors.primary} />
      <Path
        d="M13 6 C10 6 8 8.5 8 11 L8 14 C8 16.5 10 19 13 19 C16 19 18 16.5 18 14 L18 11 C18 8.5 16 6 13 6Z"
        fill={colors.white}
        opacity={0.9}
      />
      <Rect x={11.5} y={19} width={3} height={3} rx={1} fill={colors.white} opacity={0.9} />
      <Line x1={8} y1={22} x2={18} y2={22} stroke={colors.white} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
    </Svg>
  </View>
);

// ═══════════════════════════════════════════════
//  SCORE CARD (inside feedback bubble)
// ═══════════════════════════════════════════════

const ScoreCard: React.FC<{ score: PronunciationScore }> = ({ score }) => {
  const getBarColor = (val: number) => {
    if (val >= 80) return colors.success;
    if (val >= 60) return colors.accentOrange700;
    return colors.error;
  };

  const ScoreRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <View style={scoreStyles.row}>
      <Text style={scoreStyles.label}>{label}</Text>
      <View style={scoreStyles.barTrack}>
        <View
          style={[
            scoreStyles.barFill,
            { width: `${Math.min(value, 100)}%`, backgroundColor: getBarColor(value) },
          ]}
        />
      </View>
      <Text style={[scoreStyles.value, { color: getBarColor(value) }]}>{value}%</Text>
    </View>
  );

  return (
    <View style={scoreStyles.card}>
      <ScoreRow label="Clarity" value={score.clarity} />
      <ScoreRow label="Accuracy" value={score.accuracy} />
      <ScoreRow label="Fluency" value={score.fluency} />
      <View style={scoreStyles.divider} />
      <View style={scoreStyles.overallRow}>
        <Text style={scoreStyles.overallLabel}>Overall</Text>
        <Text style={[scoreStyles.overallValue, { color: getBarColor(score.overall) }]}>
          {score.overall}%
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  RECORDING PULSE ANIMATION
// ═══════════════════════════════════════════════

const RecordingPulse: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale: pulse }] },
      ]}
    />
  );
};

// ═══════════════════════════════════════════════
//  WAVEFORM BARS
// ═══════════════════════════════════════════════

const WaveformBars: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const barAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!isActive) {
      barAnims.forEach((a) => a.setValue(0.3));
      return;
    }
    const anims = barAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + Math.random() * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: 200 + Math.random() * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [isActive, barAnims]);

  return (
    <View style={styles.waveformRow}>
      {barAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              backgroundColor: isActive ? colors.primary : colors.primaryLight,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════
//  MESSAGE BUBBLE
// ═══════════════════════════════════════════════

const MessageBubble: React.FC<{
  message: ChatMessage;
  onPlaySample?: (text: string) => void;
}> = ({ message, onPlaySample }) => {
  const isAi = message.role === 'ai';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isAi ? -20 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isAi ? styles.bubbleRowAi : styles.bubbleRowUser,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {isAi && <AiAvatar />}
      <View
        style={[
          styles.bubble,
          isAi ? styles.bubbleAi : styles.bubbleUser,
        ]}
      >
        <Text style={[styles.bubbleText, isAi ? styles.bubbleTextAi : styles.bubbleTextUser]}>
          {message.text}
        </Text>

        {/* If message contains a prompt, show Listen button */}
        {isAi && message.prompt && (
          <TouchableOpacity
            style={styles.listenBtn}
            activeOpacity={0.7}
            onPress={() => onPlaySample?.(message.prompt!)}
          >
            <Ionicons name="volume-high" size={16} color={colors.primary} />
            <Text style={styles.listenBtnText}>Listen</Text>
          </TouchableOpacity>
        )}

        {/* Score card for feedback messages */}
        {message.score && <ScoreCard score={message.score} />}
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
//  TYPING INDICATOR
// ═══════════════════════════════════════════════

const TypingIndicator: React.FC = () => {
  const dots = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
      <AiAvatar />
      <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { transform: [{ translateY: dot }] },
            ]}
          />
        ))}
      </View>
    </View>
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
    messages,
    loading,
    error,
    isRecording,
    isProcessing,
    recordingDuration,
    currentPrompt,
    currentPromptIndex,
    totalPrompts,
    isComplete,
    startRecording,
    stopRecording,
    retryPrompt,
    playSample,
  } = usePronunciationExerciseController(lessonId);

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [messages.length, isProcessing]);

  // Format duration
  const formatDuration = (ms: number): string => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Setting up your session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pronunciation</Text>
          <Text style={styles.headerSub}>
            {currentPromptIndex + 1} of {totalPrompts}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {Array.from({ length: totalPrompts }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentPromptIndex
                  ? styles.dotDone
                  : i === currentPromptIndex
                    ? styles.dotActive
                    : styles.dotPending,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Chat Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onPlaySample={playSample} />
        ))}

        {isProcessing && <TypingIndicator />}
      </ScrollView>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Bottom Controls ── */}
      <View style={styles.bottomBar}>
        {isRecording && <WaveformBars isActive={isRecording} />}

        <View style={styles.controlsRow}>
          {/* Retry */}
          {!isRecording && !isProcessing && !isComplete && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={retryPrompt}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Mic button */}
          {!isComplete ? (
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording && styles.micBtnRecording,
                isProcessing && styles.micBtnDisabled,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isRecording && <RecordingPulse />}
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
          ) : (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() =>
                navigation.replace('CourseCompletion', {
                  lessonId,
                  courseTitle: 'English Pronunciation',
                  completedCount: totalPrompts,
                  totalWeekly: 14,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.finishBtnText}>Complete</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Duration / status label */}
          {!isRecording && !isProcessing && !isComplete && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => playSample(currentPrompt)}
              activeOpacity={0.7}
            >
              <Ionicons name="volume-high" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {isRecording && (
          <Text style={styles.recordingLabel}>
            Recording {formatDuration(recordingDuration)}
          </Text>
        )}
        {!isRecording && !isProcessing && !isComplete && (
          <Text style={styles.tapToSpeak}>Tap to speak</Text>
        )}
        {isProcessing && (
          <Text style={styles.processingLabel}>Analyzing pronunciation…</Text>
        )}
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
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textLight,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 38 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotPending: {
    backgroundColor: colors.divider,
  },

  // ── Chat area ──
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  // ── Bubble row ──
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },

  // ── Avatar ──
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  // ── Bubble ──
  bubble: {
    maxWidth: BUBBLE_MAX_W,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleAi: {
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  bubbleTextAi: {
    color: colors.text,
  },
  bubbleTextUser: {
    color: colors.white,
  },

  // ── Listen button ──
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    gap: 5,
  },
  listenBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },

  // ── Typing indicator ──
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textLight,
  },

  // ── Error ──
  errorBar: {
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

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  // ── Secondary buttons ──
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Mic button ──
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  micBtnRecording: {
    backgroundColor: colors.error,
  },
  micBtnDisabled: {
    backgroundColor: colors.disabled,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.error,
    opacity: 0.4,
  },

  // ── Waveform ──
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 3,
    marginBottom: 10,
  },
  waveBar: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
  },

  // ── Finish button ──
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  finishBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },

  // ── Labels ──
  recordingLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.error,
    marginTop: 8,
  },
  tapToSpeak: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
  },
  processingLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
  },
});

// ── Score card styles ──
const scoreStyles = StyleSheet.create({
  card: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textLight,
    width: 64,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.divider,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 6,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  overallValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});

export default PronunciationExerciseScreen;
