/**
 * Pronunciation exercise screen accessible from the Home tab.
 *
 * Wraps the same controller as the Tutor-stack version but uses
 * HomeStackParamList for navigation and defaults `lessonId` to
 * 'daily_practice' for standalone practice sessions.
 */
import React, { useRef, useEffect, useState , useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useHideTabBar } from '../../context/TabBarVisibilityContext';
import { RecordingControl } from '../../components/RecordingControl';
import { SpeakerButton } from '../../components/SpeakerButton';
import {
  usePronunciationExerciseController,
} from '../../controllers/usePronunciationExerciseController';
import {
  useWavyChatController,
  type WavyChatMessage,
} from '../../controllers/useWavyChatController';
import type { HomeStackParamList } from '../../models';
import { useAuth } from '../../context/AuthContext';
import {
  COMPLETE_THRESHOLD_PCT,
  tierForScore,
  tierLabel,
} from '../../config/scoring';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomePronunciation'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

const getProgressColor = (idx: number, total: number, tc: ThemeColors): string => {
  if (total <= 1) return tc.success;
  const ratio = idx / (total - 1);
  if (ratio <= 0.34) return tc.success;
  if (ratio <= 0.67) return '#FD8E39';
  return tc.error;
};

const formatTimer = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ═══════════════════════════════════════════════
//  AI MASCOT
// ═══════════════════════════════════════════════

const AiMascot: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  return (
  <TouchableOpacity style={mascotStyles.wrap} onPress={onPress} activeOpacity={0.7}>
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx={22} cy={26} r={16} fill="#8B6FAE" />
      <Circle cx={22} cy={22} r={14} fill="#A78BC4" />
      <Circle cx={16} cy={19} r={2.5} fill={tc.white} />
      <Circle cx={28} cy={19} r={2.5} fill={tc.white} />
      <Path d="M18 26 Q22 30 26 26" stroke={tc.white} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Circle cx={8} cy={14} r={5} fill="#8B6FAE" />
      <Circle cx={36} cy={14} r={5} fill="#8B6FAE" />
    </Svg>
    <View style={mascotStyles.bubble}>
      <Ionicons name="chatbubble-ellipses" size={14} color={tc.accent} />
    </View>
  </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════
//  WAVEFORM BAR
// ═══════════════════════════════════════════════

const WaveformBar: React.FC<{ active: boolean }> = ({ active }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const waveAnims = useRef(Array.from({ length: 24 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) {
      waveAnims.forEach((a) => a.setValue(0));
      return;
    }
    const anims = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(anim, { toValue: 1, duration: 400 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
                    backgroundColor: tc.successBg,
                    transform: [{ scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
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
//  RESULT ICON
// ═══════════════════════════════════════════════

const ResultIcon: React.FC<{ isCorrect: boolean }> = ({ isCorrect }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={[styles.resultIconWrap, { backgroundColor: isCorrect ? tc.success : tc.error, transform: [{ scale: scaleAnim }] }]}
    >
      <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={48} color={tc.white} />
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
//  WAVY CHAT OVERLAY
// ═══════════════════════════════════════════════

const WavyChatOverlay: React.FC<{
  visible: boolean;
  lessonId: string;
  currentSentence: string;
  onClose: () => void;
  onExpand: () => void;
  expanded: boolean;
}> = ({ visible, lessonId, currentSentence, onClose, onExpand, expanded }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const chatScrollRef = useRef<ScrollView>(null);

  const { messages, inputText, setInputText, isTyping, sendMessage } =
    useWavyChatController(lessonId, currentSentence);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 1 : 0, friction: 8, tension: 65, useNativeDriver: true }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages.length, isTyping]);

  const overlayHeight = expanded ? SCREEN_H * 0.75 : SCREEN_H * 0.48;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage();
    Keyboard.dismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        chatStyles.overlay,
        {
          height: overlayHeight,
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [overlayHeight, 0] }) }],
        },
      ]}
    >
      {/* Header */}
      <View style={chatStyles.header}>
        <View style={chatStyles.headerLeft}>
          <Svg width={32} height={32} viewBox="0 0 44 44">
            <Circle cx={22} cy={26} r={16} fill="#8B6FAE" />
            <Circle cx={22} cy={22} r={14} fill="#A78BC4" />
            <Circle cx={16} cy={19} r={2.5} fill={tc.white} />
            <Circle cx={28} cy={19} r={2.5} fill={tc.white} />
            <Path d="M18 26 Q22 30 26 26" stroke={tc.white} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          </Svg>
          <View style={chatStyles.headerInfo}>
            <Text style={chatStyles.headerTitle}>Wavy</Text>
            <Text style={chatStyles.headerSub}>Powered by AI</Text>
          </View>
        </View>
        <View style={chatStyles.headerActions}>
          <TouchableOpacity onPress={onExpand} activeOpacity={0.6}>
            <Ionicons name={expanded ? 'contract' : 'expand'} size={20} color={tc.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
            <Ionicons name="close" size={22} color={tc.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={chatScrollRef}
        style={chatStyles.messagesArea}
        contentContainerStyle={chatStyles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <View style={chatStyles.typingRow}>
            <Text style={chatStyles.typingLabel}>Wavy</Text>
            <View style={chatStyles.typingBubble}>
              <Text style={chatStyles.typingDots}>...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <View style={chatStyles.inputRow}>
          <TextInput
            style={chatStyles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSend} activeOpacity={0.6} style={chatStyles.sendBtn}>
            <Ionicons name="send" size={20} color={tc.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const ChatBubble: React.FC<{ message: WavyChatMessage }> = ({ message }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const isWavy = message.role === 'wavy';
  return (
    <View>
      <Text style={[chatStyles.roleLabel, isWavy ? chatStyles.roleLabelLeft : chatStyles.roleLabelRight]}>
        {isWavy ? 'Wavy' : 'You'}
      </Text>
      <View style={[chatStyles.bubbleRow, isWavy ? chatStyles.bubbleRowLeft : chatStyles.bubbleRowRight]}>
        {isWavy && (
          <Svg width={24} height={24} viewBox="0 0 44 44" style={{ marginRight: 6 }}>
            <Circle cx={22} cy={26} r={16} fill="#8B6FAE" />
            <Circle cx={22} cy={22} r={14} fill="#A78BC4" />
            <Circle cx={16} cy={19} r={2} fill={tc.white} />
            <Circle cx={28} cy={19} r={2} fill={tc.white} />
          </Svg>
        )}
        <View style={[chatStyles.bubble, isWavy ? chatStyles.bubbleWavy : chatStyles.bubbleUser]}>
          <Text style={chatStyles.bubbleText}>{message.text}</Text>
        </View>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const HomePronunciationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const lessonId = route.params?.lessonId ?? 'daily_practice';
  const { userProfile } = useAuth();
  const englishLevel = (userProfile as any)?.studyPlan?.englishLevel as
    | string
    | undefined;
  useHideTabBar();

  const {
    sentence,
    currentIndex,
    totalSentences,
    isLastSentence,
    phase,
    result,
    timer,
    error,
    sentencesLoading,
    completing,
    allScores,
    startRecording,
    stopRecording,
    tryAgain,
    next,
    completeExercise,
  } = usePronunciationExerciseController(lessonId, englishLevel);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const renderSentenceText = () => {
    if (phase === 'result' && result) {
      return (
        <Text style={styles.cardSentence}>
          {result.wordResults.map((wr, i) => (
            <Text
              key={i}
              style={{ color: wr.isCorrect ? tc.success : tc.error, fontFamily: fonts.semiBold }}
            >
              {wr.word}{i < result.wordResults.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      );
    }
    return <Text style={styles.cardSentence}>{sentence?.text ?? ''}</Text>;
  };

  const handleComplete = async () => {
    const summary = await completeExercise();
    if (!summary) return;
    navigation.navigate('CourseCompletion', {
      lessonId,
      courseTitle: 'English Pronunciation',
      completedCount: summary.completedCount,
      totalWeekly: summary.totalAttempts,
    });
  };

  if (sentencesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading exercises…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressColor = getProgressColor(currentIndex, totalSentences, tc);
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
            <Text style={styles.badgeText}>{currentIndex + 1}/{totalSentences}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#FD8E39' }]}>
            <Text style={styles.badgeText}>{formatTimer(timer)}</Text>
          </View>
        </View>
      </View>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Pronunciation Card */}
        <View style={[styles.card, isResult && styles.cardResult]}>
          <View style={styles.cardTopRow}>
            <SpeakerButton text={sentence?.text ?? ''} />
          </View>

          <View style={styles.cardTextWrap}>{renderSentenceText()}</View>

          {isProcessing && (
            <View style={styles.processingWrap}>
              <ActivityIndicator size="large" color={tc.accent} />
              <Text style={styles.processingText}>Analyzing pronunciation…</Text>
            </View>
          )}
        </View>

        {/* Result sub-cards */}
        {isResult && result && (
          <>
            {(() => {
              const passed = result.score.overall >= COMPLETE_THRESHOLD_PCT;
              const tier = tierForScore(result.score.overall);
              const wc = result.rawWordCorrectness;
              const refLen = wc?.ref_words?.length ?? result.wordResults.length;
              const matched = wc?.matched ?? result.wordResults.filter((w) => w.isCorrect).length;
              const summary = passed
                ? `${matched} of ${refLen} words sounded clear.`
                : wc && wc.missing > 0
                  ? `${matched}/${refLen} matched, ${wc.missing} missed.`
                  : wc && wc.substituted > 0
                    ? `${matched}/${refLen} matched, ${wc.substituted} swapped.`
                    : 'Slow down and try the words you stumbled on.';
              return (
                <View style={styles.scoreCard}>
                  <ResultIcon isCorrect={passed} />
                  <Text style={styles.scoreBig}>{result.score.overall}%</Text>
                  <Text style={styles.scoreCaption}>{tierLabel(tier)}</Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 14,
                      color: tc.text,
                      textAlign: 'center',
                      marginTop: 6,
                      marginBottom: 4,
                      paddingHorizontal: 8,
                      lineHeight: 20,
                    }}
                  >
                    {summary}
                  </Text>
                  <View style={styles.scoreRow}>
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillLabel}>Clarity</Text>
                      <Text style={styles.scorePillValue}>{result.score.clarity}%</Text>
                    </View>
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillLabel}>Words</Text>
                      <Text style={styles.scorePillValue}>{result.score.accuracy}%</Text>
                    </View>
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillLabel}>Flow</Text>
                      <Text style={styles.scorePillValue}>{result.score.fluency}%</Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Show details toggle gates raw API + word-correctness + per-word for power users */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 14,
                paddingVertical: 8,
              }}
              onPress={() => setShowDetails((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: tc.accent }}>
                {showDetails ? 'Hide phoneme details' : 'Show phoneme details'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={tc.accent}
              />
            </TouchableOpacity>

            {/* Raw API scores */}
            {showDetails && result.rawOverall && (
              <View style={styles.rawScoresCard}>
                <View style={styles.feedbackLabelRow}>
                  <Ionicons name="analytics-outline" size={18} color={tc.accent} />
                  <Text style={styles.feedbackLabel}>API Scores</Text>
                </View>
                <View style={styles.rawScoresRow}>
                  <View style={styles.rawScorePill}>
                    <Text style={styles.rawScoreValue}>
                      {(result.rawOverall.pronunciation_score * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.rawScoreLabel}>Pronunciation</Text>
                  </View>
                  <View style={styles.rawScorePill}>
                    <Text style={styles.rawScoreValue}>
                      {(result.rawOverall.weighted_overall_score * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.rawScoreLabel}>Weighted Overall</Text>
                  </View>
                </View>
                <View style={styles.rawScoresRow}>
                  <View style={styles.rawScorePill}>
                    <Text style={styles.rawScoreValue}>{result.rawOverall.scored_words}</Text>
                    <Text style={styles.rawScoreLabel}>Scored Words</Text>
                  </View>
                  <View style={styles.rawScorePill}>
                    <Text style={styles.rawScoreValue}>{result.rawOverall.skipped_words}</Text>
                    <Text style={styles.rawScoreLabel}>Skipped Words</Text>
                  </View>
                </View>
              </View>
            )}

            {/* What you said (transcript) */}
            {result.transcript ? (
              <View style={styles.transcriptCard}>
                <View style={styles.feedbackLabelRow}>
                  <Ionicons name="ear-outline" size={18} color={tc.accent} />
                  <Text style={styles.feedbackLabel}>What we heard</Text>
                </View>
                <Text style={styles.transcriptText}>"{result.transcript}"</Text>
              </View>
            ) : null}

            {/* Word correctness stats */}
            {showDetails && result.rawWordCorrectness && (
              <View style={styles.wordCorrectnessCard}>
                <View style={styles.feedbackLabelRow}>
                  <Ionicons name="checkmark-done-outline" size={18} color={tc.accent} />
                  <Text style={styles.feedbackLabel}>Word Alignment</Text>
                </View>
                <View style={styles.wordCorrectnessRow}>
                  <View style={[styles.wordCorrectnessChip, { backgroundColor: tc.successBg }]}>
                    <Text style={[styles.wordCorrectnessValue, { color: tc.success }]}>
                      {result.rawWordCorrectness.matched}
                    </Text>
                    <Text style={[styles.wordCorrectnessLabel, { color: tc.success }]}>Matched</Text>
                  </View>
                  <View style={[styles.wordCorrectnessChip, { backgroundColor: tc.errorBg }]}>
                    <Text style={[styles.wordCorrectnessValue, { color: tc.error }]}>
                      {result.rawWordCorrectness.substituted}
                    </Text>
                    <Text style={[styles.wordCorrectnessLabel, { color: tc.error }]}>Substituted</Text>
                  </View>
                  <View style={[styles.wordCorrectnessChip, { backgroundColor: tc.errorBg }]}>
                    <Text style={[styles.wordCorrectnessValue, { color: tc.error }]}>
                      {result.rawWordCorrectness.missing}
                    </Text>
                    <Text style={[styles.wordCorrectnessLabel, { color: tc.error }]}>Missing</Text>
                  </View>
                </View>
                <Text style={styles.wordCorrectnessScoreText}>
                  Word Score: {result.rawWordCorrectness.word_score_pct.toFixed(1)}%
                </Text>
              </View>
            )}

            {/* Per-word breakdown */}
            {showDetails && result.wordResults.some((wr) => wr.op !== undefined) && (
              <View style={styles.wordBreakdownCard}>
                <View style={styles.feedbackLabelRow}>
                  <Ionicons name="list-outline" size={18} color={tc.accent} />
                  <Text style={styles.feedbackLabel}>Per-word Breakdown</Text>
                </View>
                {result.wordResults.map((wr, i) => (
                  <View key={i} style={styles.wordBreakdownRow}>
                    <View style={styles.wordBreakdownLeft}>
                      <Text style={[
                        styles.wordBreakdownRef,
                        { color: wr.isCorrect ? tc.success : tc.error },
                      ]}>
                        {wr.word}
                      </Text>
                      {wr.asr && wr.asr !== wr.word.toLowerCase() ? (
                        <Text style={styles.wordBreakdownAsr}>→ "{wr.asr}"</Text>
                      ) : null}
                    </View>
                    <View style={styles.wordBreakdownRight}>
                      {wr.op && (
                        <View style={[
                          styles.opBadge,
                          {
                            backgroundColor: wr.op === 'M' ? tc.successBg
                              : wr.op === 'S' ? '#FFF3E0'
                              : tc.errorBg,
                          },
                        ]}>
                          <Text style={[
                            styles.opBadgeText,
                            {
                              color: wr.op === 'M' ? tc.success
                                : wr.op === 'S' ? '#E65100'
                                : tc.error,
                            },
                          ]}>
                            {wr.op === 'M' ? 'Match' : wr.op === 'S' ? 'Sub' : 'Del'}
                          </Text>
                        </View>
                      )}
                      {wr.pronunciationScore !== undefined && (
                        <Text style={[
                          styles.wordScoreText,
                          {
                            color: wr.pronunciationScore >= 0.8 ? tc.success
                              : wr.pronunciationScore >= 0.6 ? '#FD8E39'
                              : tc.error,
                          },
                        ]}>
                          {(wr.pronunciationScore * 100).toFixed(0)}%
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {result.feedback ? (
              <View style={styles.feedbackCard}>
                <View style={styles.feedbackLabelRow}>
                  <Ionicons name="bulb-outline" size={18} color={tc.accent} />
                  <Text style={styles.feedbackLabel}>Feedback</Text>
                </View>
                <Text style={styles.feedbackText}>{result.feedback}</Text>
              </View>
            ) : null}

            {(() => {
              const passed = result.score.overall >= COMPLETE_THRESHOLD_PCT;
              const primaryLabel = isLastSentence
                ? 'Finish'
                : passed
                  ? 'Continue'
                  : 'Skip & continue';
              return (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, completing && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    disabled={completing}
                    onPress={() => {
                      if (isLastSentence) handleComplete();
                      else next();
                    }}
                  >
                    {completing ? (
                      <ActivityIndicator color={tc.white} />
                    ) : (
                      <Text style={styles.actionBtnText}>{primaryLabel}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      alignSelf: 'center',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                    }}
                    activeOpacity={0.7}
                    disabled={completing}
                    onPress={tryAgain}
                  >
                    <Ionicons name="refresh-outline" size={16} color={tc.accent} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: tc.accent }}>
                      Try this sentence again
                    </Text>
                  </TouchableOpacity>

                  {currentIndex >= 1 && !isLastSentence && (
                    <TouchableOpacity
                      style={{
                        alignSelf: 'center',
                        marginTop: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      }}
                      activeOpacity={0.7}
                      disabled={completing}
                      onPress={handleComplete}
                    >
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted }}>
                        Finish session now
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </>
        )}
      </ScrollView>

      {/* ═══════ BOTTOM AREA ═══════ */}
      <View style={styles.bottomArea}>
        <RecordingControl
          phase={phase}
          disabled={micDisabled}
          onStart={startRecording}
          onStop={stopRecording}
        />
      </View>

      {/* ═══════ AI MASCOT ═══════ */}
      <AiMascot onPress={() => setChatVisible(true)} />

      {/* ═══════ WAVY CHAT ═══════ */}
      <WavyChatOverlay
        visible={chatVisible}
        lessonId={lessonId}
        currentSentence={sentence?.text ?? ''}
        onClose={() => { setChatVisible(false); setChatExpanded(false); }}
        onExpand={() => setChatExpanded((e) => !e)}
        expanded={chatExpanded}
      />

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color={tc.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const CARD_H = 24;

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.accentMuted },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: fonts.medium, fontSize: 14, color: tc.accent },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: CARD_H, paddingTop: Platform.OS === 'android' ? 40 : 12, paddingBottom: 4,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 22, color: tc.text, maxWidth: SCREEN_W * 0.6 },
  badgesCol: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: tc.white },

  // Scroll
  scrollContent: { paddingHorizontal: CARD_H, paddingTop: 10, paddingBottom: 16, flexGrow: 1 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.50)', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 24,
    minHeight: 300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  cardResult: { minHeight: 340 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  speakerBtn: { marginRight: 6 },
  cardTextWrap: { paddingHorizontal: 2 },
  cardSentence: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 33, color: tc.text, textAlign: 'center' },

  // Result
  resultSection: { alignItems: 'center', marginTop: 16 },
  resultIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  successMsg: { fontFamily: fonts.bold, fontSize: 22, color: tc.text, textAlign: 'center', lineHeight: 30 },

  // Score sub-card
  scoreCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18,
    marginTop: 14, alignItems: 'center', borderWidth: 1, borderColor: tc.divider,
  },
  scoreBig: { fontFamily: fonts.bold, fontSize: 32, color: tc.text, marginTop: 8 },
  scoreCaption: { fontFamily: fonts.medium, fontSize: 14, color: tc.textLight, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 },
  scorePill: {
    flex: 1, backgroundColor: tc.accentMuted, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  scorePillLabel: { fontFamily: fonts.medium, fontSize: 11, color: tc.textLight },
  scorePillValue: { fontFamily: fonts.bold, fontSize: 16, color: tc.accent, marginTop: 2 },

  // Feedback sub-card
  feedbackCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: tc.divider,
  },
  feedbackLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  feedbackLabel: { fontFamily: fonts.bold, fontSize: 15, color: tc.text },
  feedbackText: { fontFamily: fonts.regular, fontSize: 14, color: tc.text, lineHeight: 22 },

  // Processing
  processingWrap: { alignItems: 'center', marginTop: 30, gap: 10 },
  processingText: { fontFamily: fonts.medium, fontSize: 14, color: tc.accent },

  // Action button
  actionBtn: { alignSelf: 'center', backgroundColor: tc.accent, borderRadius: 24, paddingHorizontal: 36, paddingVertical: 12, marginTop: 18 },
  actionBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },

  // Bottom
  bottomArea: { alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 8 : 12, paddingHorizontal: CARD_H },

  // Waveform
  waveBarOuter: { width: '80%', marginBottom: 14 },
  waveBarTrack: { height: 22, borderRadius: 11, backgroundColor: tc.accent, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 6 },
  waveBarWaveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: '100%' },
  waveBarSegment: { width: 4, height: 14, borderRadius: 2 },
  waveBarSolid: { height: 4, borderRadius: 2, backgroundColor: tc.success, marginHorizontal: 4 },

  // Mic
  micBtn: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: tc.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  micBtnRecording: { backgroundColor: tc.error },
  micBtnDimmed: { backgroundColor: tc.accentDark, opacity: 0.6 },

  // Labels
  speakNowText: { fontFamily: fonts.medium, fontSize: 14, color: tc.textLight, marginTop: 6 },

  // Error
  errorBar: {
    position: 'absolute', top: Platform.OS === 'android' ? 36 : 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: tc.errorBg,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 13, color: tc.error },

  // Raw API scores
  rawScoresCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: tc.divider,
  },
  rawScoresRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  rawScorePill: {
    flex: 1, backgroundColor: tc.accentMuted, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  rawScoreValue: { fontFamily: fonts.bold, fontSize: 16, color: tc.accent },
  rawScoreLabel: { fontFamily: fonts.medium, fontSize: 10, color: tc.textLight, marginTop: 2 },

  // Transcript
  transcriptCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: tc.divider,
  },
  transcriptText: {
    fontFamily: fonts.medium, fontSize: 15, color: tc.text, fontStyle: 'italic', lineHeight: 24,
  },

  // Word correctness
  wordCorrectnessCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: tc.divider,
  },
  wordCorrectnessRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  wordCorrectnessChip: {
    flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  wordCorrectnessValue: { fontFamily: fonts.bold, fontSize: 18 },
  wordCorrectnessLabel: { fontFamily: fonts.medium, fontSize: 10, marginTop: 2 },
  wordCorrectnessScoreText: {
    fontFamily: fonts.semiBold, fontSize: 13, color: tc.textLight, textAlign: 'center', marginTop: 10,
  },

  // Per-word breakdown
  wordBreakdownCard: {
    backgroundColor: tc.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18,
    marginTop: 12, borderWidth: 1, borderColor: tc.divider,
  },
  wordBreakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: tc.divider,
  },
  wordBreakdownLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  wordBreakdownRef: { fontFamily: fonts.semiBold, fontSize: 14 },
  wordBreakdownAsr: { fontFamily: fonts.regular, fontSize: 12, color: tc.textLight },
  wordBreakdownRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  opBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  opBadgeText: { fontFamily: fonts.bold, fontSize: 10 },
  wordScoreText: { fontFamily: fonts.bold, fontSize: 13 },
});

const mascotStyles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: Platform.OS === 'ios' ? 14 : 18, left: 16, flexDirection: 'row', alignItems: 'flex-end' },
  bubble: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 4, marginLeft: -8, marginBottom: 28,
    elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
  },
});

const chatStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#6B4EAB',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
    elevation: 20, shadowColor: '#000000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: {},
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
  headerSub: { fontFamily: fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  headerActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  messagesArea: { flex: 1 },
  messagesContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  roleLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3, marginTop: 8 },
  roleLabelLeft: { textAlign: 'left', marginLeft: 32 },
  roleLabelRight: { textAlign: 'right', marginRight: 4 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: SCREEN_W * 0.65, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  bubbleWavy: { backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#3F66FB', borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  typingRow: { marginTop: 6 },
  typingLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 3, marginLeft: 32 },
  typingBubble: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 8, alignSelf: 'flex-start', marginLeft: 30 },
  typingDots: { fontFamily: fonts.bold, fontSize: 18, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontFamily: fonts.regular, fontSize: 14, color: '#FFFFFF' },
  sendBtn: { marginLeft: 10, padding: 6 },
});

export default HomePronunciationScreen;
