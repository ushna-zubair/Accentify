/**
 * Word-level pronunciation exercise. Pulls one word at a time from the HF
 * /prompt_word endpoint, scores recordings with /evaluate_word, and renders a
 * phoneme-level breakdown so learners can see exactly which sounds tripped
 * them up.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useHideTabBar } from '../../context/TabBarVisibilityContext';
import { RecordingControl } from '../../components/RecordingControl';
import { SpeakerButton } from '../../components/SpeakerButton';
import { useWordPronunciationExerciseController } from '../../controllers/useWordPronunciationExerciseController';
import {
  AiMascot,
  ResultIcon,
  WavyChatOverlay,
} from './PronunciationExerciseScreen';
import {
  COMPLETE_THRESHOLD_PCT,
  tierForScore,
  tierLabel,
} from '../../config/scoring';
import { friendlySounds } from '../../services/arpabetFriendly';
import type { PronunciationScore } from '../../models';

interface CompletionResult {
  avgScore: PronunciationScore;
  completedCount: number;
  totalAttempts: number;
}

interface WordPronunciationExerciseScreenProps {
  lessonId: string;
  englishLevel?: string;
  onExit?: () => void;
  onComplete?: (result: CompletionResult | null) => void;
}

const getProgressColor = (idx: number, total: number, tc: ThemeColors): string => {
  if (total <= 1) return tc.success;
  const ratio = idx / (total - 1);
  if (ratio <= 0.34) return tc.success;
  if (ratio <= 0.67) return '#FD8E39';
  return tc.error;
};

export const WordPronunciationExerciseScreen: React.FC<
  WordPronunciationExerciseScreenProps
> = ({ lessonId, englishLevel, onExit, onComplete }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  useHideTabBar();

  const {
    word,
    currentIndex,
    totalWords,
    isLastWord,
    phase,
    result,
    error,
    wordsLoading,
    completing,
    startRecording,
    stopRecording,
    tryAgain,
    next,
    completeExercise,
  } = useWordPronunciationExerciseController(lessonId, englishLevel);

  const [chatVisible, setChatVisible] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const wavyLastResult = useMemo(() => {
    if (!result || !word) return null;
    return {
      reference: word.word,
      overallPct: result.score.overall,
      missedPhones: result.missingPhones?.slice(0, 3),
      itemType: 'word' as const,
    };
  }, [result, word]);

  const handleComplete = async () => {
    const summary = await completeExercise();
    onComplete?.(summary);
  };

  if (wordsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={tc.accent} />
          <Text style={styles.loadingText}>Loading words…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressColor = getProgressColor(currentIndex, totalWords, tc);
  const isProcessing = phase === 'processing';
  const isResult = phase === 'result';
  const micDisabled = isProcessing || wordsLoading;

  const handleRetryRecording = async () => {
    tryAgain();
    await startRecording();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onExit && (
          <TouchableOpacity
            onPress={onExit}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={tc.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Word Pronunciation</Text>
        <View style={[styles.badge, { backgroundColor: progressColor }]}>
          <Text style={styles.badgeText}>
            {currentIndex + 1}/{totalWords}
          </Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={tc.error} />
          <Text style={styles.errorBannerText} numberOfLines={3}>
            {error}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Word card */}
        <View style={[styles.card, isResult && styles.cardResult]}>
          <View style={styles.cardTopRow}>
            <SpeakerButton text={word?.word ?? ''} />
            <View style={styles.levelChip}>
              <Text style={styles.levelChipText}>Level {word?.level ?? 1}</Text>
            </View>
          </View>

          <View style={styles.cardTextWrap}>
            <Text style={styles.wordText} accessibilityRole="header">
              {word?.word ?? ''}
            </Text>
            {word?.reference ? (
              <Text style={styles.referenceArpabet}>
                /{word.reference.trim()}/
              </Text>
            ) : null}
          </View>

          {isProcessing && (
            <View style={styles.processingWrap}>
              <ActivityIndicator size="large" color={tc.accent} />
              <Text style={styles.processingText}>
                Analyzing pronunciation…
              </Text>
            </View>
          )}
        </View>

        {/* Result sub-cards */}
        {isResult && result && (
          <>
            {(() => {
              const tier = tierForScore(result.score.overall);
              const passed = result.score.overall >= COMPLETE_THRESHOLD_PCT;
              const missedFriendly = friendlySounds(result.missingPhones);
              const mismatched = result.phonemeComparison.filter((c) => !c.match);
              const summary = passed
                ? mismatched.length === 0
                  ? 'You hit every sound clearly.'
                  : `Almost perfect — just brush up on ${friendlySounds(
                      mismatched.slice(0, 2).map((m) => m.ref_arp),
                    ).join(' and ')}.`
                : missedFriendly.length > 0
                  ? `Focus on the ${missedFriendly.slice(0, 3).join(', ')} sound${
                      missedFriendly.length === 1 ? '' : 's'
                    }.`
                  : mismatched.length > 0
                    ? `Work on the ${friendlySounds(
                        mismatched.slice(0, 2).map((m) => m.ref_arp),
                      ).join(' and ')} sound.`
                    : 'Slow it down and try again.';

              const primaryLabel = isLastWord
                ? 'Finish'
                : passed
                  ? 'Next word'
                  : 'Skip & continue';

              return (
                <>
                  <View style={styles.scoreCard}>
                    <ResultIcon isCorrect={passed} />
                    <Text style={styles.scoreBig}>{result.score.overall}%</Text>
                    <Text style={styles.scoreCaption}>{tierLabel(tier)}</Text>
                    <Text style={styles.summaryText}>{summary}</Text>
                  </View>

                  {/* Friendly sound chips — one per reference phoneme, no ARPAbet on the face */}
                  {result.phonemeComparison.length > 0 && (
                    <View style={styles.breakdownCard}>
                      <View style={styles.feedbackLabelRow}>
                        <Ionicons name="musical-notes-outline" size={18} color={tc.accent} />
                        <Text style={styles.feedbackLabel}>How each sound went</Text>
                      </View>
                      <View style={styles.chipRow}>
                        {result.phonemeComparison.map((c, i) => {
                          const friendly = friendlySounds([c.ref_arp])[0];
                          const match = c.match;
                          return (
                            <View
                              key={`fc-${i}`}
                              style={[
                                styles.soundChip,
                                {
                                  backgroundColor: match ? tc.successBg : tc.errorBg,
                                  borderColor: match ? tc.success : tc.error,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.soundChipText,
                                  { color: match ? tc.success : tc.error },
                                ]}
                              >
                                {friendly}
                              </Text>
                              <Text
                                style={[
                                  styles.soundChipSub,
                                  { color: match ? tc.success : tc.error },
                                ]}
                              >
                                {match ? '✓ clear' : 'try again'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      {missedFriendly.length > 0 && (
                        <Text style={styles.missingPhonesText}>
                          Sounds to practice: {missedFriendly.join(', ')}
                        </Text>
                      )}
                    </View>
                  )}

                  {result.feedback ? (
                    <View style={styles.feedbackCard}>
                      <View style={styles.feedbackLabelRow}>
                        <Ionicons name="bulb-outline" size={18} color={tc.accent} />
                        <Text style={styles.feedbackLabel}>Coach tip</Text>
                      </View>
                      <Text style={styles.feedbackText}>{result.feedback}</Text>
                    </View>
                  ) : null}

                  {/* Collapsible: detailed phoneme breakdown for power users */}
                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={() => setShowDetails((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailsToggleText}>
                      {showDetails ? 'Hide phoneme details' : 'Show phoneme details'}
                    </Text>
                    <Ionicons
                      name={showDetails ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={tc.accent}
                    />
                  </TouchableOpacity>

                  {showDetails && (
                    <>
                      <View style={styles.breakdownCard}>
                        <View style={styles.feedbackLabelRow}>
                          <Ionicons name="analytics-outline" size={18} color={tc.accent} />
                          <Text style={styles.feedbackLabel}>Phoneme match score</Text>
                        </View>
                        <View style={styles.rawScoreRow}>
                          <View style={styles.rawScorePill}>
                            <Text style={styles.rawScoreValue}>
                              {(result.rawScore * 100).toFixed(1)}%
                            </Text>
                            <Text style={styles.rawScoreLabel}>0–100 from model</Text>
                          </View>
                        </View>
                      </View>

                      {(result.referenceArpabetTokens.length > 0 ||
                        result.detectedArpabet.length > 0) && (
                        <View style={styles.breakdownCard}>
                          <View style={styles.feedbackLabelRow}>
                            <Ionicons name="swap-horizontal-outline" size={18} color={tc.accent} />
                            <Text style={styles.feedbackLabel}>ARPAbet comparison</Text>
                          </View>
                          <View style={styles.phonemeCompareSection}>
                            <Text style={styles.phonemeCompareLabel}>Reference:</Text>
                            <View style={styles.chipRow}>
                              {result.referenceArpabetTokens.map((p, i) => (
                                <View
                                  key={`ref-${i}`}
                                  style={[
                                    styles.phonemeChip,
                                    { backgroundColor: tc.accentMuted, borderColor: tc.accent },
                                  ]}
                                >
                                  <Text style={[styles.phonemeChipText, { color: tc.accent }]}>{p}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                          <View style={styles.phonemeCompareSection}>
                            <Text style={styles.phonemeCompareLabel}>You said:</Text>
                            <View style={styles.chipRow}>
                              {result.detectedArpabet.map((p, i) => {
                                const refToken = result.referenceArpabetTokens[i];
                                const isMatch = refToken === p;
                                return (
                                  <View
                                    key={`det-${i}`}
                                    style={[
                                      styles.phonemeChip,
                                      {
                                        backgroundColor: isMatch ? tc.successBg : tc.errorBg,
                                        borderColor: isMatch ? tc.success : tc.error,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.phonemeChipText,
                                        { color: isMatch ? tc.success : tc.error },
                                      ]}
                                    >
                                      {p}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                          {result.detectedNative.length > 0 && (
                            <View style={styles.phonemeCompareSection}>
                              <Text style={styles.phonemeCompareLabel}>IPA:</Text>
                              <View style={styles.chipRow}>
                                {result.detectedNative.map((p, i) => (
                                  <View
                                    key={`ipa-${i}`}
                                    style={[
                                      styles.phonemeChip,
                                      { backgroundColor: tc.accentMuted, borderColor: tc.divider },
                                    ]}
                                  >
                                    <Text style={[styles.phonemeChipText, { color: tc.text }]}>{p}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {result.phonemeDetails.length > 0 && (
                        <View style={styles.breakdownCard}>
                          <View style={styles.feedbackLabelRow}>
                            <Ionicons name="bar-chart-outline" size={18} color={tc.accent} />
                            <Text style={styles.feedbackLabel}>Per-phoneme confidence</Text>
                          </View>
                          {result.phonemeDetails.map((pd, i) => (
                            <View key={i} style={styles.confidenceRow}>
                              <View style={styles.confidenceLeft}>
                                <Text style={styles.confidenceArpabet}>{pd.phoneme_arpabet}</Text>
                                <Text style={styles.confidenceNative}>/{pd.phoneme_native}/</Text>
                              </View>
                              <View style={styles.confidenceBarOuter}>
                                <View
                                  style={[
                                    styles.confidenceBarFill,
                                    {
                                      width: `${Math.min(100, pd.confidence * 100)}%`,
                                      backgroundColor:
                                        pd.confidence >= 0.5
                                          ? tc.success
                                          : pd.confidence >= 0.2
                                            ? '#FD8E39'
                                            : tc.error,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.confidenceValue}>
                                {(pd.confidence * 100).toFixed(1)}%
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* Action buttons */}
                  <TouchableOpacity
                    style={[styles.actionBtn, completing && styles.actionBtnDisabled]}
                    activeOpacity={0.8}
                    disabled={completing}
                    onPress={() => {
                      if (isLastWord) {
                        handleComplete();
                      } else {
                        next();
                      }
                    }}
                  >
                    {completing ? (
                      <ActivityIndicator color={tc.white} />
                    ) : (
                      <Text style={styles.actionBtnText}>{primaryLabel}</Text>
                    )}
                  </TouchableOpacity>

                  {currentIndex >= 1 && !isLastWord && (
                    <TouchableOpacity
                      style={styles.ghostBtn}
                      activeOpacity={0.7}
                      disabled={completing}
                      onPress={handleComplete}
                    >
                      <Text style={styles.ghostBtnText}>Finish session now</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomArea}>
        <RecordingControl
          phase={phase}
          disabled={micDisabled}
          onStart={startRecording}
          onStop={stopRecording}
          onRetry={handleRetryRecording}
        />
      </View>

      <AiMascot onPress={() => setChatVisible(true)} />

      <WavyChatOverlay
        visible={chatVisible}
        lessonId={lessonId}
        currentSentence={word?.word ?? ''}
        lastResult={wavyLastResult}
        onClose={() => {
          setChatVisible(false);
          setChatExpanded(false);
        }}
        onExpand={() => setChatExpanded((e) => !e)}
        expanded={chatExpanded}
      />

      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color={tc.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const CARD_H = 24;

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: tc.accentMuted },

    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: { fontFamily: fonts.medium, fontSize: 14, color: tc.accent },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: CARD_H,
      paddingTop: Platform.OS === 'android' ? 40 : 12,
      paddingBottom: 4,
      gap: 12,
    },
    backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: tc.text },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontFamily: fonts.bold, fontSize: 12, color: tc.white },

    scrollContent: {
      paddingHorizontal: CARD_H,
      paddingTop: 10,
      paddingBottom: 16,
      flexGrow: 1,
    },

    card: {
      backgroundColor: 'rgba(255,255,255,0.55)',
      borderRadius: 20,
      paddingHorizontal: 22,
      paddingVertical: 28,
      minHeight: 240,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
    },
    cardResult: { minHeight: 260 },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    levelChip: {
      backgroundColor: tc.accentMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    levelChipText: { fontFamily: fonts.semiBold, fontSize: 11, color: tc.accent },

    cardTextWrap: { alignItems: 'center', paddingHorizontal: 2 },
    wordText: {
      fontFamily: fonts.bold,
      fontSize: 46,
      letterSpacing: 1,
      color: tc.text,
      textAlign: 'center',
    },
    referenceArpabet: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: tc.textLight,
      marginTop: 10,
      letterSpacing: 1,
    },

    processingWrap: { alignItems: 'center', marginTop: 24, gap: 10 },
    processingText: { fontFamily: fonts.medium, fontSize: 14, color: tc.accent },

    scoreCard: {
      backgroundColor: tc.surface,
      borderRadius: 18,
      paddingVertical: 18,
      paddingHorizontal: 18,
      marginTop: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tc.divider,
    },
    scoreBig: { fontFamily: fonts.bold, fontSize: 32, color: tc.text, marginTop: 8 },
    scoreCaption: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.textLight,
      marginBottom: 12,
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      gap: 8,
    },
    scorePill: {
      flex: 1,
      backgroundColor: tc.accentMuted,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    scorePillLabel: { fontFamily: fonts.medium, fontSize: 11, color: tc.textLight },
    scorePillValue: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: tc.accent,
      marginTop: 2,
    },

    breakdownCard: {
      backgroundColor: tc.surface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginTop: 12,
      borderWidth: 1,
      borderColor: tc.divider,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    phonemeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
    phonemeChipText: {
      fontFamily: fonts.bold,
      fontSize: 13,
      letterSpacing: 0.5,
    },
    missingPhonesText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.error,
      marginTop: 10,
    },

    feedbackCard: {
      backgroundColor: tc.surface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginTop: 12,
      borderWidth: 1,
      borderColor: tc.divider,
    },
    feedbackLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    feedbackLabel: { fontFamily: fonts.bold, fontSize: 15, color: tc.text },
    feedbackText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.text,
      lineHeight: 22,
    },

    actionBtn: {
      alignSelf: 'stretch',
      backgroundColor: tc.accent,
      borderRadius: 24,
      paddingHorizontal: 36,
      paddingVertical: 14,
      marginTop: 18,
      alignItems: 'center',
    },
    actionBtnDisabled: { opacity: 0.6 },
    actionBtnText: { fontFamily: fonts.bold, fontSize: 16, color: tc.white },

    ghostBtn: {
      alignSelf: 'center',
      marginTop: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    ghostBtnText: { fontFamily: fonts.regular, fontSize: 13, color: tc.textMuted },

    summaryText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: tc.text,
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 4,
      paddingHorizontal: 8,
      lineHeight: 20,
    },

    detailsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 14,
      paddingVertical: 8,
    },
    detailsToggleText: { fontFamily: fonts.medium, fontSize: 13, color: tc.accent },

    soundChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      minWidth: 70,
      marginRight: 6,
      marginBottom: 6,
    },
    soundChipText: { fontFamily: fonts.medium, fontSize: 13 },
    soundChipSub: { fontFamily: fonts.regular, fontSize: 10, marginTop: 1 },

    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: tc.errorBg,
      marginHorizontal: 12,
      borderRadius: 8,
    },
    errorBannerText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: tc.error },

    bottomArea: {
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 8 : 12,
      paddingHorizontal: CARD_H,
    },

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
      backgroundColor: tc.errorBg,
    },
    errorText: { fontFamily: fonts.regular, fontSize: 13, color: tc.error },

    // Raw model score
    rawScoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
    rawScorePill: {
      flex: 1,
      backgroundColor: tc.accentMuted,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    rawScoreValue: { fontFamily: fonts.bold, fontSize: 16, color: tc.accent },
    rawScoreLabel: { fontFamily: fonts.medium, fontSize: 10, color: tc.textLight, marginTop: 2 },

    // Phoneme comparison sections
    phonemeCompareSection: { marginTop: 10 },
    phonemeCompareLabel: {
      fontFamily: fonts.semiBold, fontSize: 12, color: tc.textLight, marginBottom: 4,
    },

    // Phoneme chip sub-text (shows detected_arp or checkmark)
    phonemeChipSubText: {
      fontFamily: fonts.medium,
      fontSize: 9,
      marginTop: 2,
      textAlign: 'center',
    },

    // Per-phoneme confidence bar
    confidenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: tc.divider,
    },
    confidenceLeft: {
      width: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    confidenceArpabet: { fontFamily: fonts.bold, fontSize: 13, color: tc.text },
    confidenceNative: { fontFamily: fonts.regular, fontSize: 11, color: tc.textLight },
    confidenceBarOuter: {
      flex: 1,
      height: 8,
      backgroundColor: tc.divider,
      borderRadius: 4,
      marginHorizontal: 8,
      overflow: 'hidden',
    },
    confidenceBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    confidenceValue: {
      width: 48,
      fontFamily: fonts.bold,
      fontSize: 11,
      color: tc.text,
      textAlign: 'right',
    },
  });

export default WordPronunciationExerciseScreen;
