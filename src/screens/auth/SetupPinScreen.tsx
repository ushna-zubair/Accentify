import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import CustomButton from '../../components/CustomButton';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupPin'>;

const keypad = ['1','2','3','4','5','6','7','8','9','*','0','backspace'];

const SetupPinScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile, learningGoals, nativeLanguage, englishLevel } = route.params;
  const [pin, setPin] = useState<string[]>(['', '', '', '']);

  const handleKeypadPress = (digit: string) => {
    if (digit === 'backspace') {
      let lastFilledIndex = -1;
      for (let i = pin.length - 1; i >= 0; i--) {
        if (pin[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }
      if (lastFilledIndex >= 0) {
        const newPin = [...pin];
        newPin[lastFilledIndex] = '';
        setPin(newPin);
      }
    } else if (digit !== '*') {
      const firstEmptyIndex = pin.indexOf('');
      if (firstEmptyIndex < 4) {
        const newPin = [...pin];
        newPin[firstEmptyIndex] = digit;
        setPin(newPin);
      }
    }
  };

  const isComplete = pin.every((d) => d !== '');

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
          {keypad.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.keypadButton}
              onPress={() => handleKeypadPress(key)}
            >
              {key === 'backspace' ? (
                <FontAwesome5 name="backspace" size={18} color={colors.text} />
              ) : (
                <Text style={styles.keypadText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton
            title="Continue"
            onPress={() => navigation.navigate('SetupFaceID', {
              profile,
              learningGoals,
              nativeLanguage,
              englishLevel,
              appPin: pin.join(''),
            })}
            disabled={!isComplete}
          />
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
    paddingVertical: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
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
    borderColor: colors.inputBorder,
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  keypad: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  keypadButton: {
    width: '30%',
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  keypadText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
  },
});

export default SetupPinScreen;
