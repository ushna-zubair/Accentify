import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect, Ellipse } from 'react-native-svg';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import {
  useConversationExerciseController,
  ConversationPhase,
} from '../../controllers/useConversationExerciseController';
import type { TutorStackParamList, ConversationTurn } from '../../models';

const { width: SCREEN_W } = Dimensions.get('window');

type ConversationRoute = RouteProp<TutorStackParamList, 'ConversationExercise'>;

// ═══════════════════════════════════════════════
//  BACKGROUND ILLUSTRATION (faded conversation scene)
// ═══════════════════════════════════════════════

const BackgroundIllustration: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <View style={bgStyles.container}>
    <Svg width={200} height={160} viewBox="0 0 220 160" style={{ opacity: 0.15 }}>
      <Rect x={10} y={40} width={60} height={100} rx={8} fill={tc.accentLight} opacity={0.6} />
      <Rect x={150} y={50} width={55} height={90} rx={8} fill={tc.accentMuted} opacity={0.6} />
      <Circle cx={80} cy={55} r={18} fill="#E8BD8A" />
      <Path d="M68 52 C68 42 92 42 92 52" fill="#7B4DB8" />
      <Ellipse cx={80} cy={100} rx={22} ry={30} fill="#F5C84C" />
      <Circle cx={155} cy={65} r={14} fill="#D4A574" />
      <Ellipse cx={155} cy={105} rx={18} ry={25} fill="#5B7FC7" />
      <Rect x={55} y={120} width={110} height={6} rx={3} fill={tc.accentLight} />
    </Svg>
  </View>
  );
};

const bgStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    zIndex: 0,
  },
});

// ═══════════════════════════════════════════════
//  AUDIO PROGRESS BAR
// ═══════════════════════════════════════════════

interface AudioBarProps {
  progress: number;
  color: string;
  isActive: boolean;
}

const AudioProgressBar: React.FC<AudioBarProps> = ({ progress, color }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: progress,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.container}>
      <View style={[barStyles.track, { borderColor: color + '40' }]}>
        <Animated.View
          style={[
            barStyles.fill,
            { width, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: { flex: 1, marginHorizontal: 6 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  fill: { height: '100%', borderRadius: 3 },
});

// ═══════════════════════════════════════════════
//  WAVEFORM BAR (animated when recording)
// ═══════════════════════════════════════════════

const WaveformBar: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const waveAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (isActive) {
      const animations = waveAnims.map((anim) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.4 + Math.random() * 0.6,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.2,
              duration: 200 + Math.random() * 300,
              useNativeDriver: false,
            }),
          ]),
        ),
      );
      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    } else {
      waveAnims.forEach((a) => a.setValue(0.3));
    }
  }, [isActive]);

  return (
    <View style={wfStyles.container}>
      <View style={wfStyles.barBg}>
        {waveAnims.map((anim, i) => {
          const height = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [4, 20],
          });
          return (
            <Animated.View
              key={i}
              style={[
                wfStyles.wave,
                {
                  height,
                  backgroundColor: isActive ? tc.success : tc.accent,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const wfStyles = StyleSheet.create({
  container: { marginHorizontal: 20, marginBottom: 8 },
  barBg: {
    height: 36,
    backgroundColor: '#3F66FB',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 3,
  },
  wave: { width: 4, borderRadius: 2 },
});

// ═══════════════════════════════════════════════
//  AI MASCOT (purple bear with "..." speech bubble)
// ═══════════════════════════════════════════════

const AiMascot: React.FC<{ visible: boolean }> = ({ visible }) => {
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 80,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[mascotStyles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      {/* Speech bubble */}
      <View style={mascotStyles.speechBubble}>
        <Text style={mascotStyles.speechDots}>...</Text>
      </View>

      {/* Mascot body */}
      <View style={mascotStyles.body}>
        {/* Ears */}
        <View style={[mascotStyles.ear, mascotStyles.earLeft]} />
        <View style={[mascotStyles.ear, mascotStyles.earRight]} />
        {/* Head */}
        <View style={mascotStyles.head}>
          <View style={mascotStyles.eyeRow}>
            <View style={mascotStyles.eye} />
            <View style={mascotStyles.eye} />
          </View>
          <View style={mascotStyles.mouth} />
        </View>
      </View>
    </Animated.View>
  );
};

const mascotStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  speechDots: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#333333',
    letterSpacing: 2,
  },
  body: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ear: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7B4DB8',
  },
  earLeft: { left: 0 },
  earRight: { right: 0 },
  head: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#8B6FAE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  eyeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 3,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  mouth: {
    width: 12,
    height: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});

// ═══════════════════════════════════════════════
//  CHAT BUBBLE
// ═══════════════════════════════════════════════

interface ChatBubbleProps {
  turn: ConversationTurn;
  isPartner: boolean;
  partnerName: string;
  learnerName: string;
  progress: number;
  isCurrent: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  turn,
  isPartner,
  partnerName,
  learnerName,
  progress,
  isCurrent,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const barColor = isPartner ? '#E94F54' : tc.success;
  const iconName = isPartner ? 'volume-high' : 'play';
  const name = isPartner ? partnerName : learnerName;
  const displayProgress = turn.completed ? 1 : isCurrent ? progress : 0;

  return (
    <View
      style={[
        bubbleStyles.container,
        isPartner ? bubbleStyles.partnerAlign : bubbleStyles.learnerAlign,
      ]}
    >
      <Text
        style={[
          bubbleStyles.name,
          isPartner ? bubbleStyles.nameLeft : bubbleStyles.nameRight,
        ]}
      >
        {name}
      </Text>
      <View
        style={[
          bubbleStyles.bubble,
          isPartner ? bubbleStyles.partnerBubble : bubbleStyles.learnerBubble,
          !turn.completed && !isCurrent && bubbleStyles.dimmed,
        ]}
      >
        <Ionicons
          name={iconName as any}
          size={18}
          color={turn.completed || isCurrent ? barColor : tc.textMuted}
        />
        <AudioProgressBar
          progress={displayProgress}
          color={barColor}
          isActive={isCurrent}
        />
      </View>
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  container: { marginBottom: 6, maxWidth: '60%' },
  partnerAlign: { alignSelf: 'flex-start' },
  learnerAlign: { alignSelf: 'flex-end' },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: '#333333',
    marginBottom: 3,
  },
  nameLeft: { textAlign: 'left' },
  nameRight: { textAlign: 'right' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 150,
  },
  partnerBubble: { borderTopLeftRadius: 4 },
  learnerBubble: { borderTopRightRadius: 4 },
  dimmed: { opacity: 0.45 },
});

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const ConversationExerciseScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const route = useRoute<ConversationRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<TutorStackParamList>>();
  const { lessonId } = route.params;

  const {
    partnerName,
    learnerName,
    turns,
    currentTurnIndex,
    currentTurn,
    totalTurns,
    completedTurns,
    phase,
    formattedTimer,
    backgroundNoise,
    crowdChatter,
    error,
    isComplete,
    conversationFeedback,
    partnerPlayProgress,
    learnerRecordProgress,
    toggleBackgroundNoise,
    toggleCrowdChatter,
    startRecording,
    stopRecording,
  } = useConversationExerciseController(lessonId);

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll on new turn or completion
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [currentTurnIndex, completedTurns, isComplete]);

  // Mic animation
  const micScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (phase === 'recording') {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(micScale, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(micScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      micScale.setValue(1);
    }
  }, [phase]);

  // Mic press handler
  const handleMicPress = () => {
    if (phase === 'waiting_for_learner') startRecording();
    else if (phase === 'recording') stopRecording();
  };

  const micDisabled =
    phase === 'partner_speaking' ||
    phase === 'processing' ||
    phase === 'completed';

  const micColor =
    phase === 'recording'
      ? tc.error
      : micDisabled
        ? tc.disabled
        : tc.accent;

  // Navigate to completion
  const handleDone = () => {
    navigation.navigate('CourseCompletion', {
      lessonId,
      courseTitle: 'Conversation',
      completedCount: Math.ceil(completedTurns / 2),
      totalWeekly: Math.ceil(totalTurns / 2),
    });
  };

  // Visible turns: show all completed + current
  const visibleTurns = useMemo(() => {
    return turns.filter((t, i) => t.completed || i === currentTurnIndex);
  }, [turns, currentTurnIndex]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={tc.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Conversation</Text>
            <View style={styles.togglesRow}>
              <Text style={styles.toggleLabel}>
                Background noise (
                <Text
                  style={{
                    color: backgroundNoise ? tc.success : tc.error,
                    fontFamily: fonts.bold,
                  }}
                >
                  {backgroundNoise ? 'ON' : 'OFF'}
                </Text>
                )
              </Text>
              <Text style={styles.toggleLabel}>
                Crowd chatter (
                <Text
                  style={{
                    color: crowdChatter ? tc.success : tc.error,
                    fontFamily: fonts.bold,
                  }}
                >
                  {crowdChatter ? 'ON' : 'OFF'}
                </Text>
                )
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formattedTimer}</Text>
        </View>
      </View>

      {/* ── Main Scrollable Content ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Chat Area ── */}
        <View style={styles.chatArea}>
          <BackgroundIllustration />

          {visibleTurns.map((turn) => {
            const isPartner = turn.speaker === 'partner';
            const idx = turns.findIndex((t) => t.id === turn.id);
            const isCurrent = idx === currentTurnIndex;
            const progress = isPartner
              ? partnerPlayProgress
              : learnerRecordProgress;

            return (
              <ChatBubble
                key={turn.id}
                turn={turn}
                isPartner={isPartner}
                partnerName={partnerName}
                learnerName={learnerName}
                progress={progress}
                isCurrent={isCurrent}
              />
            );
          })}

          {/* Processing indicator */}
          {phase === 'processing' && (
            <View style={styles.processingBubble}>
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}

          {/* End conversation label */}
          {isComplete && (
            <Text style={styles.endConversationLabel}>End conversation</Text>
          )}
        </View>

        {/* ── Feedback Section (shown after completion) ── */}
        {isComplete && conversationFeedback && (
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackDivider} />

            <Text style={styles.feedbackTitle}>Feedback:</Text>
            <Text style={styles.feedbackBody}>
              {conversationFeedback.feedback}
            </Text>

            <View style={styles.tipRow}>
              <Text style={styles.tipLabel}>Tip:</Text>
              <Text style={styles.tipBody}>{conversationFeedback.tip}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Controls ── */}
      <View style={styles.bottomArea}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Mic (always visible, dimmed when complete) */}
        <Animated.View style={{ transform: [{ scale: micScale }] }}>
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: micColor }]}
            onPress={handleMicPress}
            disabled={micDisabled}
            activeOpacity={0.7}
          >
            <Ionicons
              name={phase === 'recording' ? 'stop' : 'mic'}
              size={32}
              color={tc.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* DONE! button (only when complete) */}
        {isComplete && (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>DONE!</Text>
          </TouchableOpacity>
        )}

        {/* Speak Now / status label (only when not complete) */}
        {!isComplete && (
          <>
            <WaveformBar isActive={phase === 'recording'} />
            <Text style={styles.speakNowLabel}>
              {phase === 'recording'
                ? 'Recording...'
                : phase === 'partner_speaking'
                  ? `${partnerName} is speaking...`
                  : phase === 'processing'
                    ? 'Processing...'
                    : 'Speak Now'}
            </Text>
          </>
        )}
      </View>

      {/* ── AI Mascot ── */}
      <AiMascot visible={isComplete} />
    </View>
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  backBtn: { marginRight: 6, marginTop: 2 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: tc.text,
  },
  togglesRow: { marginTop: 2 },
  toggleLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: tc.text,
    lineHeight: 17,
  },
  timerBadge: {
    backgroundColor: tc.success,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  timerText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.white,
  },

  // ── Main scroll ──
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 20,
  },

  // ── Chat Area ──
  chatArea: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.cardBorder,
    overflow: 'hidden',
    padding: 14,
    minHeight: 200,
    position: 'relative',
  },

  // ── Processing ──
  processingBubble: {
    alignSelf: 'center',
    backgroundColor: tc.accentLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  processingText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: tc.accent,
  },

  // ── End conversation label ──
  endConversationLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: tc.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // ── Feedback Section ──
  feedbackSection: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingBottom: 8,
  },
  feedbackDivider: {
    height: 1,
    backgroundColor: tc.divider,
    marginBottom: 14,
  },
  feedbackTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.text,
    marginBottom: 4,
  },
  feedbackBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    lineHeight: 22,
    marginBottom: 12,
    paddingLeft: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: tc.text,
    marginRight: 4,
  },
  tipBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.text,
    lineHeight: 21,
    flex: 1,
  },

  // ── Bottom Area ──
  bottomArea: {
    paddingBottom: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: tc.error,
    marginBottom: 6,
    textAlign: 'center',
  },
  speakNowLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: tc.textLight,
    marginTop: 6,
    marginBottom: 4,
  },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── DONE button ──
  doneBtn: {
    backgroundColor: tc.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 44,
    marginTop: 10,
  },
  doneBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: tc.white,
    letterSpacing: 1,
  },
});

export default ConversationExerciseScreen;
