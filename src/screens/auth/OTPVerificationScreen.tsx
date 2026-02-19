import React, { useEffect, useState } from 'react';
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
import OTPInput from '../../components/OTPInput';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

const keypad = ['1','2','3','4','5','6','7','8','9','*','0','backspace'];

const OTPVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(58);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleKeypadPress = (digit: string) => {
    if (digit === 'backspace') {
      let lastFilledIndex = -1;
      for (let i = otp.length - 1; i >= 0; i--) {
        if (otp[i] !== '') {
          lastFilledIndex = i;
          break;
        }
      }
      if (lastFilledIndex >= 0) {
        const newOtp = [...otp];
        newOtp[lastFilledIndex] = '';
        setOtp(newOtp);
      }
    } else if (digit !== '*') {
      const firstEmptyIndex = otp.indexOf('');
      if (firstEmptyIndex < 6) {
        const newOtp = [...otp];
        newOtp[firstEmptyIndex] = digit;
        setOtp(newOtp);
      }
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your phone</Text>
        <Text style={styles.phoneText}>(+1) *** *** 4232</Text>

        <OTPInput value={otp} />

        <Text style={styles.resendText}>
          {canResend ? 'Resend Code' : `Resend Code in ${resendTimer}s`}
        </Text>

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
            title="Verify"
            onPress={() => navigation.navigate('CreateNewPassword')}
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
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 24,
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

export default OTPVerificationScreen;
