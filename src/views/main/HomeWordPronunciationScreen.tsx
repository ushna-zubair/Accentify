/**
 * Home-tab entry point for the word-pronunciation exercise. Mirrors the
 * sentence-level HomePronunciationScreen wrapper: passes a default lesson id
 * and lets users drop back to the home screen on exit/completion.
 */
import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordPronunciationExerciseScreen } from './WordPronunciationExerciseScreen';
import type { HomeStackParamList } from '../../models';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeWordPronunciation'>;

const HomeWordPronunciationScreen: React.FC<Props> = ({ navigation, route }) => {
  const lessonId = route.params?.lessonId ?? 'word_practice';
  const { userProfile } = useAuth();
  const englishLevel = (userProfile as any)?.studyPlan?.englishLevel;

  return (
    <WordPronunciationExerciseScreen
      lessonId={lessonId}
      englishLevel={englishLevel}
      onExit={() => navigation.goBack()}
      onComplete={(summary) => {
        if (!summary) {
          navigation.goBack();
          return;
        }
        navigation.navigate('CourseCompletion', {
          lessonId,
          courseTitle: 'Word Pronunciation',
          completedCount: summary.completedCount,
          totalWeekly: summary.totalAttempts,
          retryRoute: 'HomeWordPronunciation',
        });
      }}
    />
  );
};

export default HomeWordPronunciationScreen;
