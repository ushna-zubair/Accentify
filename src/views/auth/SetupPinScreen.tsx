/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Manan Anghan
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  const goNext = (appPin: string | null) =>
    navigation.navigate('SetupFaceID', {
      profile,
      learningGoals,
      nativeLanguage,
      englishLevel,
      appPin,
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set an App PIN (Optional)</Text>
        <Text style={styles.subtitle}>
          Use a 4-digit PIN to unlock the app quickly when biometrics aren&apos;t available. Your
          PIN stays on this device — it is never sent to our servers.
        </Text>

        <View style={styles.pinRow}>
          {pin.map((digit, index) => (
            <View key={index} style={[styles.pinDot, digit && styles.pinDotFilled]} />
          ))}
        </View>

        <View style={styles.keypad}>
          <NumberKeypad onKeyPress={handleKeyPress} size="compact" />
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={() => goNext(pinValue)} disabled={!isComplete} />
          <TouchableOpacity onPress={() => goNext(null)} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (tc: ThemeColors) =>
  StyleSheet.create({
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
    skipButton: {
      marginTop: 12,
      alignSelf: 'center',
      paddingVertical: 8,
    },
    skipText: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: tc.textMuted,
    },
  });

export default SetupPinScreen;
