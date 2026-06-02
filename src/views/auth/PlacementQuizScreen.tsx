/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Adam Sabih
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * PlacementQuizScreen.tsx
 *
 * Triggered when a learner picks "Not too sure" on EnglishLevelScreen. Runs
 * a short 8-question synonym quiz with 2 cards each at A1, A2, B1, B2, then
 * infers the level from where accuracy first drops below 60%.
 *
 * Inference rule (matches the way teachers actually place students):
 *   - First band where the learner gets <60% wrong → previous band as level.
 *   - All correct → B2 (proxy for "needs more data, start mid").
 *   - Bottom-out at A1 (couldn't pass even A1 questions).
 *
 * The inferred level is passed forward exactly like a manually picked one —
 * downstream screens (SetupPin, etc.) don't need to know the placement quiz
 * ran.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';
import { SEED_VOCABULARY_WORDS } from '../../../data/vocabularySeed';
import { checkSynonym } from '../../utils/synonymMatch';
import type { CefrLevel, VocabularyWord } from '../../models/vocabulary';

type Props = NativeStackScreenProps<AuthStackParamList, 'PlacementQuiz'>;

const QUIZ_BANDS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
const QUESTIONS_PER_BAND = 2;
const PASS_RATIO = 0.6; // 60% to "pass" a band.

/** Pick `count` random entries from `pool`, without replacement. */
const sampleN = <T,>(pool: T[], count: number): T[] => {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};

/** Build the question list, grouped by band. */
const buildQuestions = (): VocabularyWord[] => {
  const byLevel = new Map<CefrLevel, VocabularyWord[]>();
  for (const w of SEED_VOCABULARY_WORDS) {
    if (!byLevel.has(w.cefrLevel)) byLevel.set(w.cefrLevel, []);
    byLevel.get(w.cefrLevel)!.push(w);
  }
  const questions: VocabularyWord[] = [];
  for (const band of QUIZ_BANDS) {
    const pool = byLevel.get(band) ?? [];
    questions.push(...sampleN(pool, QUESTIONS_PER_BAND));
  }
  return questions;
};

/** Infer the CEFR level from per-band correctness. */
const inferLevel = (
  bandResults: Record<CefrLevel, { correct: number; total: number }>,
): CefrLevel => {
  let lastPassed: CefrLevel | null = null;
  for (const band of QUIZ_BANDS) {
    const r = bandResults[band];
    if (!r || r.total === 0) continue;
    if (r.correct / r.total >= PASS_RATIO) {
      lastPassed = band;
    } else {
      // First band the learner failed: their level is the previous one.
      break;
    }
  }
  if (!lastPassed) return 'A1';
  // Passed everything we tested → assume one step up, capped at B2 (we
  // didn't test C-band).
  if (lastPassed === 'B2') return 'B2';
  return lastPassed;
};

const PlacementQuizScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { profile, learningGoals, nativeLanguage } = route.params;

  const questions = useRef<VocabularyWord[]>(buildQuestions()).current;
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [bandResults, setBandResults] = useState<
    Record<CefrLevel, { correct: number; total: number }>
  >({
    A1: { correct: 0, total: 0 },
    A2: { correct: 0, total: 0 },
    B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 },
    C1: { correct: 0, total: 0 },
    C2: { correct: 0, total: 0 },
  });
  const [showResult, setShowResult] = useState<null | { isCorrect: boolean; answer: string }>(null);
  const [finishing, setFinishing] = useState(false);

  const current = questions[index];
  const total = questions.length;

  // Auto-advance after showing the per-question result.
  useEffect(() => {
    if (!showResult) return;
    const t = setTimeout(() => {
      setShowResult(null);
      setInput('');
      if (index + 1 < total) {
        setIndex((i) => i + 1);
      } else {
        finalize();
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  const submit = () => {
    if (!current) return;
    const trimmed = input.trim();
    if (!trimmed) {
      Alert.alert('Type an answer', 'Type a synonym (or skip by tapping Submit).');
      return;
    }
    const match = checkSynonym(trimmed, current.acceptableSynonyms);
    setBandResults((prev) => {
      const band = current.cefrLevel;
      const next = { ...prev };
      next[band] = {
        correct: prev[band].correct + (match.correct ? 1 : 0),
        total: prev[band].total + 1,
      };
      return next;
    });
    setShowResult({
      isCorrect: match.correct,
      answer: current.primarySynonym || current.acceptableSynonyms[0] || '',
    });
  };

  const skip = () => {
    if (!current) return;
    setBandResults((prev) => {
      const band = current.cefrLevel;
      const next = { ...prev };
      next[band] = { correct: prev[band].correct, total: prev[band].total + 1 };
      return next;
    });
    setShowResult({
      isCorrect: false,
      answer: current.primarySynonym || current.acceptableSynonyms[0] || '',
    });
  };

  const finalize = () => {
    setFinishing(true);
    const inferred = inferLevel(bandResults);
    navigation.replace('SetupPin', {
      profile,
      learningGoals,
      nativeLanguage,
      englishLevel: inferred,
    });
  };

  if (!current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header} />
        <Text style={styles.title}>Quick placement quiz</Text>
        <Text style={styles.subtitle}>
          Type a synonym for the word below. We'll set your level based on your answers.
        </Text>

        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: tc.inputBorder }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: tc.accent,
                  width: `${Math.round(((index + 1) / total) * 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {index + 1} / {total}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.pos}>{current.partOfSpeech.toUpperCase()}</Text>
          <Text style={styles.word}>{current.word}</Text>
          <Text style={styles.definition}>{current.definition}</Text>
        </View>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a synonym"
          placeholderTextColor={tc.textMuted}
          editable={!showResult}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          onSubmitEditing={submit}
        />

        {showResult && (
          <View
            style={[
              styles.resultBanner,
              { backgroundColor: showResult.isCorrect ? tc.successBg : tc.warningBg },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                { color: showResult.isCorrect ? tc.success : tc.warningDeep },
              ]}
            >
              {showResult.isCorrect ? 'Correct!' : `Answer: ${showResult.answer}`}
            </Text>
          </View>
        )}

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            onPress={skip}
            disabled={!!showResult || finishing}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!!showResult || finishing) && styles.continueButtonDisabled,
            ]}
            onPress={submit}
            disabled={!!showResult || finishing}
          >
            <Text style={styles.continueButtonText}>
              {index + 1 === total ? 'Finish' : 'Submit'}
            </Text>
            <View style={styles.arrowCircle}>
              <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: tc.background },
    content: { flex: 1, paddingHorizontal: 24 },
    header: { height: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: tc.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 18,
      paddingHorizontal: 8,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 18,
    },
    progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    progressText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: tc.textLight,
      width: 44,
      textAlign: 'right',
    },
    card: {
      backgroundColor: tc.white,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: tc.inputBorder,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 18,
    },
    pos: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      letterSpacing: 1,
      color: tc.textMuted,
      marginBottom: 4,
    },
    word: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: tc.text,
      marginBottom: 8,
    },
    definition: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: tc.textLight,
      textAlign: 'center',
      lineHeight: 18,
    },
    input: {
      backgroundColor: tc.white,
      borderWidth: 1.5,
      borderColor: tc.inputBorder,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontFamily: fonts.medium,
      fontSize: 15,
      color: tc.text,
    },
    resultBanner: {
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    resultText: { fontFamily: fonts.semiBold, fontSize: 14 },
    bottomContainer: {
      marginTop: 'auto',
      paddingBottom: 24,
      paddingTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    skipBtn: { paddingVertical: 12, paddingHorizontal: 18 },
    skipText: { fontFamily: fonts.medium, fontSize: 14, color: tc.textLight },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.accent,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 24,
      gap: 12,
      minWidth: 160,
    },
    continueButtonDisabled: { opacity: 0.5 },
    continueButtonText: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: tc.white,
    },
    arrowCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: tc.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default PlacementQuizScreen;
