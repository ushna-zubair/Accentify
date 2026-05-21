import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../models';
import CustomButton from '../../components/CustomButton';
import NumberKeypad from '../../components/NumberKeypad';
import { useCodeInput } from '../../hooks/useCodeInput';
import { useAppTheme, type ThemeColors } from '../../hooks/useAppTheme';
import { fonts } from '../../theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupPin'>;

const SetupPinScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors: tc } = useAppTheme();
  const styles = useMemo(() => createStyles(tc), [tc]);
  const { profile, learningGoals, nativeLanguage, englishLevel } = route.params;
  const { code: pin, handleKeyPress, isComplete, value: pinValue } = useCodeInput(4);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Your PIN</Text>
        <Text style={styles.subtitle}>Enter a 4-digit pin for extra security.</Text>

        <View style={styles.pinRow}>
          {pin.map((digit, index) => (
            <View key={index} style={[styles.pinDot, digit && styles.pinDotFilled]} />
          ))}
        </View>

        <View style={styles.keypad}>
          <NumberKeypad onKeyPress={handleKeyPress} size="compact" />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Continue"
            onPress={() => navigation.navigate('SetupFaceID', {
              profile,
              learningGoals,
              nativeLanguage,
              englishLevel,
              appPin: pinValue,
            })}
            disabled={!isComplete}
          />
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
    paddingVertical: 30,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: tc.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: tc.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: tc.inputBorder,
  },
  pinDotFilled: {
    backgroundColor: tc.accent,
    borderColor: tc.accent,
  },
  keypad: {
    width: '100%',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default SetupPinScreen;
