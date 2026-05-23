/**
 * VocabExerciseScreen
 *
 * Synonym-typing vocabulary exercise. Shows a word, the user types a synonym,
 * and the screen confirms or reveals the correct answer. All wiring (load,
 * validate, persist) lives in `useVocabExerciseController`.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { useVocabExerciseController } from '../../controllers';
import { useHideTabBar } from '../../context/TabBarVisibilityContext';

// The screen is registered in BOTH TutorStack (as `VocabExercise`, lesson-bound)
// and HomeStack (as `HomeVocabExercise`, free practice from the home tab).
// Both routes carry an optional `lessonId`; the controller falls back to
// CEFR-band selection when it's missing.

const AUTO_ADVANCE_MS = 900;

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

const progressColor = (index: number, total: number, tc: ThemeColors): string => {
  if (total <= 1) return tc.success;
  const ratio = index / Math.max(1, total - 1);
  if (ratio <= 0.34) return tc.success;
  if (ratio <= 0.67) return '#FD8E39';
  return tc.error;
};

// ═══════════════════════════════════════════════
//  RESULT OVERLAY
// ═══════════════════════════════════════════════

interface ResultPanelProps {
  isCorrect: boolean;
  correctAnswer: string;
  matchedSynonym: string | null;
  fuzzy: boolean;
  definition: string;
  example?: string;
  onNext: () => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
  isCorrect,
  correctAnswer,
  matchedSynonym,
  fuzzy,
  definition,
  example,
  onNext,
}) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.resultPanel,
        {
          backgroundColor: isCorrect ? tc.successBg : tc.errorBg,
          borderColor: isCorrect ? tc.success : tc.error,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.resultRow}>
        <Ionicons
          name={isCorrect ? 'checkmark-circle' : 'close-circle'}
          size={28}
          color={isCorrect ? tc.success : tc.error}
        />
        <Text
          style={[
            styles.resultHeadline,
            { color: isCorrect ? tc.success : tc.error },
          ]}
        >
          {isCorrect ? 'Correct!' : 'Not quite'}
        </Text>
      </View>

      {isCorrect ? (
        <Text style={[styles.resultBody, { color: tc.text }]}>
          {fuzzy && matchedSynonym
            ? `Matched "${matchedSynonym}" — watch the spelling.`
            : `"${matchedSynonym}" is a great synonym.`}
        </Text>
      ) : (
        <>
          <Text style={[styles.resultBody, { color: tc.text }]}>
            Correct answer: <Text style={styles.resultEmphasis}>{correctAnswer}</Text>
          </Text>
          {!!definition && (
            <Text style={[styles.resultBody, { color: tc.textLight, marginTop: 6 }]}>
              {definition}
            </Text>
          )}
          {!!example && (
            <Text style={[styles.resultExample, { color: tc.textMuted }]}>
              e.g. {example}
            </Text>
          )}
        </>
      )}

      {!isCorrect && (
        <TouchableOpacity
          onPress={onNext}
          style={[styles.nextButton, { backgroundColor: tc.accent }]}
          accessibilityLabel="Next word"
        >
          <Text style={[styles.nextButtonText, { color: tc.textOnAccent }]}>
            Next word
          </Text>
          <Ionicons name="arrow-forward" size={18} color={tc.textOnAccent} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════
//  SESSION COMPLETE
// ═══════════════════════════════════════════════

const SessionCompleteCard: React.FC<{
  correct: number;
  total: number;
  onDone: () => void;
}> = ({ correct, total, onDone }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <View style={styles.doneCard}>
      <View style={[styles.doneIcon, { backgroundColor: tc.successBg }]}>
        <Ionicons name="trophy" size={36} color={tc.success} />
      </View>
      <Text style={styles.doneTitle}>Session complete</Text>
      <Text style={styles.doneSub}>
        You got <Text style={styles.resultEmphasis}>{correct}</Text> of{' '}
        <Text style={styles.resultEmphasis}>{total}</Text> right ({pct}%).
      </Text>
      <TouchableOpacity
        onPress={onDone}
        style={[styles.nextButton, { backgroundColor: tc.accent, marginTop: 24 }]}
      >
        <Text style={[styles.nextButtonText, { color: tc.textOnAccent }]}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════

const VocabExerciseScreen: React.FC = () => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const lessonId = (route.params?.lessonId as string | undefined) ?? '';
  useHideTabBar();

  const ctrl = useVocabExerciseController(lessonId);
  const inputRef = useRef<TextInput>(null);

  // Re-focus the text input each time we land on a new card.
  useEffect(() => {
    if (!ctrl.hasSubmitted && !ctrl.loading && ctrl.currentWord) {
      // Defer to let the layout settle.
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [ctrl.currentWord?.id, ctrl.hasSubmitted, ctrl.loading]);

  // Auto-advance on a correct answer.
  useEffect(() => {
    if (ctrl.hasSubmitted && ctrl.lastResult?.isCorrect) {
      const t = setTimeout(() => ctrl.next(), AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }
  }, [ctrl.hasSubmitted, ctrl.lastResult?.isCorrect, ctrl.next]);

  // ── Loading ──
  if (ctrl.loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tc.accent} />
        <Text style={[styles.loadingText, { color: tc.textLight }]}>
          Loading your words…
        </Text>
      </SafeAreaView>
    );
  }

  // ── Empty / error ──
  if (ctrl.error || ctrl.words.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="book-outline" size={48} color={tc.textMuted} />
        <Text style={styles.errorText}>
          {ctrl.error ?? 'No vocabulary words available for your level yet.'}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.nextButton, { backgroundColor: tc.accent, marginTop: 24 }]}
        >
          <Text style={[styles.nextButtonText, { color: tc.textOnAccent }]}>
            Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Session complete ──
  if (ctrl.isSessionComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          onBack={() => navigation.goBack()}
          currentIndex={ctrl.totalWords}
          total={ctrl.totalWords}
          cefrLevel={ctrl.cefrLevel}
          styles={styles}
          tc={tc}
        />
        <SessionCompleteCard
          correct={ctrl.sessionStats.correct}
          total={ctrl.sessionStats.total}
          onDone={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const word = ctrl.currentWord!;
  const showResult = ctrl.hasSubmitted && ctrl.lastResult;
  const canSubmit = !ctrl.hasSubmitted && ctrl.inputValue.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBack={() => navigation.goBack()}
        currentIndex={ctrl.currentIndex}
        total={ctrl.totalWords}
        cefrLevel={ctrl.cefrLevel}
        styles={styles}
        tc={tc}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Word card ── */}
          <View style={styles.wordCard}>
            <Text style={[styles.partOfSpeech, { color: tc.textLight }]}>
              {word.partOfSpeech || 'word'} · {word.cefrLevel}
            </Text>
            <Text style={[styles.wordTitle, { color: tc.text }]}>{word.word}</Text>
            <Text style={[styles.prompt, { color: tc.textLight }]}>
              Type a synonym
            </Text>
          </View>

          {/* ── Input ── */}
          <TextInput
            ref={inputRef}
            value={ctrl.inputValue}
            onChangeText={ctrl.setInput}
            editable={!ctrl.hasSubmitted}
            placeholder="your answer…"
            placeholderTextColor={tc.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSubmit) ctrl.submit();
            }}
            style={[
              styles.input,
              {
                backgroundColor: tc.inputBg,
                borderColor: showResult
                  ? ctrl.lastResult!.isCorrect
                    ? tc.success
                    : tc.error
                  : tc.inputBorder,
                color: tc.text,
              },
            ]}
            accessibilityLabel="Synonym input"
          />

          {/* ── Submit button (hidden once submitted) ── */}
          {!ctrl.hasSubmitted && (
            <TouchableOpacity
              onPress={ctrl.submit}
              disabled={!canSubmit || ctrl.isSubmitting}
              style={[
                styles.checkButton,
                {
                  backgroundColor: canSubmit ? tc.accent : tc.disabled,
                },
              ]}
              accessibilityLabel="Check answer"
            >
              {ctrl.isSubmitting ? (
                <ActivityIndicator size="small" color={tc.textOnAccent} />
              ) : (
                <Text style={[styles.checkButtonText, { color: tc.textOnAccent }]}>
                  Check
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* ── Result overlay ── */}
          {showResult && (
            <ResultPanel
              isCorrect={ctrl.lastResult!.isCorrect}
              correctAnswer={ctrl.lastResult!.correctAnswer}
              matchedSynonym={ctrl.lastResult!.matchedSynonym}
              fuzzy={ctrl.lastResult!.fuzzy}
              definition={word.definition}
              example={word.example}
              onNext={ctrl.next}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════
//  HEADER (extracted to avoid prop drilling)
// ═══════════════════════════════════════════════

const Header: React.FC<{
  onBack: () => void;
  currentIndex: number;
  total: number;
  cefrLevel: string;
  styles: ReturnType<typeof createStyles>;
  tc: ThemeColors;
}> = ({ onBack, currentIndex, total, cefrLevel, styles, tc }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.backButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={24} color={tc.text} />
    </TouchableOpacity>
    <View
      style={[
        styles.progressBadge,
        { backgroundColor: progressColor(currentIndex, total, tc) },
      ]}
    >
      <Text style={styles.progressBadgeText}>
        {Math.min(currentIndex + 1, total)} / {total}
      </Text>
    </View>
    <View style={[styles.cefrChip, { backgroundColor: tc.accentBg }]}>
      <Text style={[styles.cefrChipText, { color: tc.accentDark }]}>
        {cefrLevel}
      </Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tc.background,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: tc.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontFamily: fonts.regular,
      fontSize: 14,
    },
    errorText: {
      marginTop: 16,
      fontFamily: fonts.medium,
      fontSize: 15,
      color: tc.textLight,
      textAlign: 'center',
      maxWidth: 320,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
    },
    progressBadgeText: {
      color: tc.white,
      fontFamily: fonts.semiBold,
      fontSize: 13,
    },
    cefrChip: {
      marginLeft: 'auto',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    cefrChipText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 40,
    },
    wordCard: {
      backgroundColor: tc.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    partOfSpeech: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    wordTitle: {
      fontFamily: fonts.bold,
      fontSize: 36,
      textAlign: 'center',
      marginBottom: 12,
    },
    prompt: {
      fontFamily: fonts.regular,
      fontSize: 14,
    },
    input: {
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: fonts.medium,
      fontSize: 18,
      marginBottom: 16,
    },
    checkButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkButtonText: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
    },
    resultPanel: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    resultHeadline: {
      fontFamily: fonts.bold,
      fontSize: 18,
    },
    resultBody: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    resultEmphasis: {
      fontFamily: fonts.semiBold,
    },
    resultExample: {
      fontFamily: fonts.regular,
      fontSize: 13,
      fontStyle: 'italic',
      marginTop: 8,
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 16,
    },
    nextButtonText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
    },
    doneCard: {
      alignItems: 'center',
      padding: 32,
      marginHorizontal: 20,
      marginTop: 40,
      backgroundColor: tc.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: tc.cardBorder,
    },
    doneIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    doneTitle: {
      fontFamily: fonts.bold,
      fontSize: 22,
      color: tc.text,
      marginBottom: 8,
    },
    doneSub: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: tc.textLight,
      textAlign: 'center',
    },
  });

export default VocabExerciseScreen;
