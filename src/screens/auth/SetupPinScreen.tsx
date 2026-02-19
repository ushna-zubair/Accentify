import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import colors from '../../theme/colors';
import CustomButton from '../../components/CustomButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupPin'>;

const SetupPinScreen: React.FC<Props> = ({ navigation }) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);

  const handleKeypadPress = (digit: string) => {
    if (digit === 'backspace') {
      const lastFilledIndex = pin.lastIndexOf((val) => val !== '');
      if (lastFilledIndex >= 0) {
        const newPin = [...pin];
        newPin[lastFilledIndex] = '';
        setPin(newPin);
      }
    } else {
      const firstEmptyIndex = pin.indexOf('');
      if (firstEmptyIndex < 4) {
        const newPin = [...pin];
        newPin[firstEmptyIndex] = digit;
        setPin(newPin);
      }
    }
  };

  const handleContinue = () => {
    const pinString = pin.join('');
    if (pinString.length === 4) {
      navigation.navigate('SetupFaceID');
    }
  };

  const keypadLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', 'backspace'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Set Up Your Pin</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>Secure your account with a quick PIN</Text>
      </View>

      {/* PIN Input Display */}
      <View style={styles.pinDisplayContainer}>
        {pin.map((digit, index) => (
          <View key={index} style={styles.pinDot}>
            {digit !== '' && <View style={styles.pinDotFilled} />}
          </View>
        ))}
      </View>

      {/* Continue Button */}
      <View style={styles.continueButtonContainer}>
        <CustomButton
          title="Continue →"
          onPress={handleContinue}
          variant="primary"
          disabled={pin.join('').length !== 4}
        />
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypadContainer}>
        {keypadLayout.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keypadButton}
                onPress={() => handleKeypadPress(key)}
              >
                {key === 'backspace' ? (
                  <Text style={styles.backspaceIcon}>⌫</Text>
                ) : (
                  <Text style={styles.keypadNumber}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  pinDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  pinDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFilled: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  continueButtonContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  keypadContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'flex-end',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  keypadButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  backspaceIcon: {
    fontSize: 20,
  },
});

export default SetupPinScreen;
