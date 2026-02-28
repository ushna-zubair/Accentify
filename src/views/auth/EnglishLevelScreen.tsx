import React, { useState , useMemo} from 'react';
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
import { AuthStackParamList } from '../../models';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'EnglishLevel'>;

type Level = {
  id: string;
  label: string;
};

const levels: Level[] = [
  { id: 'A1', label: 'A1 - Beginner' },
  { id: 'A2', label: 'A2 - Elementary' },
  { id: 'B1', label: 'B1 - Intermediate' },
  { id: 'B2', label: 'B2 - Upper Intermediate' },
  { id: 'C1', label: 'C1 - Advanced' },
  { id: 'C2', label: 'C2 - Proficient' },
  { id: 'unsure', label: 'Not too sure' },
];

const EnglishLevelScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { profile, learningGoals, nativeLanguage } = route.params;
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedLevel) {
      Alert.alert('Select Level', 'Please select your English level.');
      return;
    }
    // Navigate to SetupPin, passing all collected onboarding data
    navigation.navigate('SetupPin', {
      profile,
      learningGoals,
      nativeLanguage,
      englishLevel: selectedLevel,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header spacing */}
        <View style={styles.header} />

        {/* Title */}
        <Text style={styles.title}>What's your English level?</Text>
        <Text style={styles.subtitle}>
          We'll adjust lessons based on your skills. Choose the level that fits you best.
        </Text>

        {/* Level Options */}
        <View style={styles.levelsContainer}>
          {levels.map((level) => {
            const isSelected = selectedLevel === level.id;
            return (
              <TouchableOpacity
                key={level.id}
                style={[styles.levelCard, isSelected && styles.levelCardSelected]}
                onPress={() => setSelectedLevel(level.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.levelLabel, isSelected && styles.levelLabelSelected]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedLevel && styles.continueButtonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <View style={styles.arrowCircle}>
              <FontAwesome5 name="arrow-right" size={14} color={tc.accent} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 56,
  },
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
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  levelsContainer: {
    gap: 12,
  },
  levelCard: {
    backgroundColor: tc.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  levelCardSelected: {
    backgroundColor: tc.accentMuted,
    borderColor: tc.accent,
  },
  levelLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: tc.text,
  },
  levelLabelSelected: {
    fontFamily: fonts.semiBold,
    color: tc.accent,
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.accent,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    minWidth: 180,
    shadowColor: tc.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: tc.white,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tc.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EnglishLevelScreen;
