import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'LearningGoals'>;

type Goal = {
  id: string;
  label: string;
  icon: string;
};

const goals: Goal[] = [
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'social_media', label: 'Social Media', icon: '📱' },
  { id: 'academics', label: 'Academics', icon: '🎓' },
  { id: 'immigration', label: 'Immigration', icon: '🌍' },
  { id: 'career', label: 'Career', icon: '📝' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'daily_life', label: 'DailyLife', icon: '🏠' },
  { id: 'conversation', label: 'Conversation', icon: '💬' },
  { id: 'exams', label: 'Exams', icon: '🎯' },
];

const MAX_GOALS = 3;

const LearningGoalsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile } = route.params;
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId);
      }
      if (prev.length >= MAX_GOALS) {
        Alert.alert('Limit Reached', 'You can select up to 3 goals.');
        return prev;
      }
      return [...prev, goalId];
    });
  };

  const handleNext = () => {
    if (selectedGoals.length === 0) {
      Alert.alert('Select Goals', 'Please select at least one learning goal.');
      return;
    }
    navigation.navigate('NativeLanguage', {
      profile,
      learningGoals: selectedGoals,
    });
  };

  const handleSkip = () => {
    navigation.navigate('NativeLanguage', {
      profile,
      learningGoals: [],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with Skip */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Why are you learning English?</Text>
        <Text style={styles.subtitle}>
          Select up to 3 goals so we can personalize your learning journey
        </Text>

        {/* Goals Grid */}
        <View style={styles.goalsContainer}>
          {goals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                onPress={() => toggleGoal(goal.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.goalIcon}>{goal.icon}</Text>
                <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.nextButton, selectedGoals.length === 0 && styles.nextButtonDisabled]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <View style={styles.arrowCircle}>
              <FontAwesome5 name="arrow-right" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'left',
    lineHeight: 18,
    marginBottom: 28,
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    gap: 8,
  },
  goalChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: colors.primary,
  },
  goalIcon: {
    fontSize: 16,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  goalLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 160,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LearningGoalsScreen;
